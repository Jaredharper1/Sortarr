from __future__ import annotations

import os
import copy
import sys
import re
import time
import datetime
import csv
import io
import json
import logging
import secrets
import threading
from urllib.parse import urlsplit, urlunsplit
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import wraps

import requests
# Session hinzugefügt für die dauerhafte Sprachwahl
from flask import Flask, jsonify, render_template, request, Response, redirect, url_for, g, session
from flask_babel import Babel, _, get_locale
from flask_compress import Compress
from werkzeug.middleware.proxy_fix import ProxyFix







APP_NAME = "Sortarr"
APP_VERSION = "0.7.11"
CSRF_COOKIE_NAME = "sortarr_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_FORM_FIELD = "csrf_token"
REQUIRED_TAUTULLI_LOOKUP_LIMIT = -1
REQUIRED_TAUTULLI_LOOKUP_SECONDS = 0
SAFE_TAUTULLI_REFRESH_BUCKETS = {
    "TVDB ID",
    "TMDB ID",
    "IMDB ID",
    "Title + year",
}

app = Flask(__name__)
# Secret Key ermöglicht das Speichern der Sprachwahl im Browser-Cookie
app.secret_key = secrets.token_hex(16)
app.config["BABEL_TRANSLATION_DIRECTORIES"] = os.path.join(app.root_path, "translations")
# Make get_locale() available in Jinja templates
app.jinja_env.globals["get_locale"] = get_locale

from babel import Locale
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from flask_babel import gettext as _

@app.route("/set-lang/<lang>")
def set_lang(lang):
    if lang in ("en", "de"):
        session["language"] = lang

    ref = request.referrer
    if not ref:
        return redirect(url_for("setup"))  # or whatever your setup endpoint is

    parts = urlsplit(ref)
    qs = [(k, v) for (k, v) in parse_qsl(parts.query, keep_blank_values=True) if k.lower() != "lang"]
    clean = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(qs), parts.fragment))
    return redirect(clean)

# --- SPRACHSTEUERUNG (i18n) START ---
def get_locale():
    # 1. Priorität: Sprache über URL-Parameter setzen (?lang=de)
    lang = request.args.get('lang')
    if lang in ['en', 'de']:
        session['language'] = lang
        return lang
    
    # 2. Priorität: Bereits gewählte Sprache aus der Session laden
    if 'language' in session:
        return session['language']
    
    # 3. Priorität: Automatische Erkennung durch den Browser
    return request.accept_languages.best_match(['en', 'de']) or 'en'

# In Babel 3.x wird die Funktion über init_app oder direkt im Konstruktor übergeben
babel = Babel(app, locale_selector=get_locale, default_locale="en")
# --- SPRACHSTEUERUNG (i18n) ENDE ---

app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

def _int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)).strip())
    except Exception:
        return default

# ProxyFix (reverse proxy support)
proxy_hops = _int_env("SORTARR_PROXY_HOPS", 0)
if proxy_hops > 0:
    app.wsgi_app = ProxyFix(
        app.wsgi_app,
        x_for=proxy_hops,
        x_proto=proxy_hops,
        x_host=proxy_hops,
        x_port=proxy_hops,
        x_prefix=proxy_hops,
    )


# Then extensions
app.config.update(
    COMPRESS_MIMETYPES=["application/json", "text/csv"],
    COMPRESS_MIN_SIZE=500,
    COMPRESS_STREAMS=False,
)
Compress(app)

LOG_LEVEL = os.environ.get("SORTARR_LOG_LEVEL", "INFO").upper()
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=LOG_LEVEL,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
logger = logging.getLogger("sortarr")
logger.setLevel(LOG_LEVEL)

_http = requests.Session()

class CacheManager:
    def __init__(self):
        self._lock = threading.RLock()
        self._store = {
            "sonarr": {},
            "radarr": {},
            "tautulli": {"ts": 0, "data": {}},
            "jellystat": {"ts": 0, "data": {}},
        }

    @staticmethod
    def _safe_int(value) -> int:
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _safe_ts(value) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _clone_rows(rows) -> list[dict]:
        if not isinstance(rows, list):
            return []
        return [dict(row) for row in rows]

    def _clone_entry(self, entry: dict) -> dict:
        return {
            "ts": self._safe_ts(entry.get("ts")),
            "tautulli_index_ts": self._safe_int(entry.get("tautulli_index_ts")),
            "data": self._clone_rows(entry.get("data") or []),
        }

    def clear_app(self, app_name: str) -> None:
        with self._lock:
            store = self._store.get(app_name)
            if store is not None:
                store.clear()

    def clear_all(self) -> None:
        with self._lock:
            self._store["sonarr"].clear()
            self._store["radarr"].clear()
            self._store["tautulli"] = {"ts": 0, "data": {}}
            self._store["jellystat"] = {"ts": 0, "data": {}}

    def get_app_snapshot(self, app_name: str) -> dict[str, dict]:
        with self._lock:
            store = self._store.get(app_name, {})
            return {
                str(instance_id): self._clone_entry(entry)
                for instance_id, entry in store.items()
            }

    def get_app_entry_snapshot(self, app_name: str, instance_id: str) -> dict | None:
        key = str(instance_id)
        with self._lock:
            entry = self._store.get(app_name, {}).get(key)
            return self._clone_entry(entry) if entry else None

    def set_app_entry(
        self,
        app_name: str,
        instance_id: str,
        data: list[dict],
        ts: float | int = 0,
        tautulli_index_ts: int = 0,
    ) -> None:
        key = str(instance_id)
        with self._lock:
            store = self._store.setdefault(app_name, {})
            store[key] = {
                "ts": self._safe_ts(ts),
                "tautulli_index_ts": self._safe_int(tautulli_index_ts),
                "data": self._clone_rows(data),
            }

    def update_app_entry(
        self,
        app_name: str,
        instance_id: str,
        data: list[dict] | None = None,
        ts: float | int | None = None,
        tautulli_index_ts: int | None = None,
    ) -> None:
        key = str(instance_id)
        with self._lock:
            store = self._store.setdefault(app_name, {})
            entry = store.get(key)
            if not entry:
                entry = {"ts": 0, "tautulli_index_ts": 0, "data": []}
            if data is not None:
                entry["data"] = self._clone_rows(data)
            if ts is not None:
                entry["ts"] = self._safe_ts(ts)
            if tautulli_index_ts is not None:
                entry["tautulli_index_ts"] = self._safe_int(tautulli_index_ts)
            store[key] = entry

    def get_tautulli_state(self) -> tuple[dict | None, int]:
        with self._lock:
            entry = self._store["tautulli"]
            data = entry.get("data") or None
            ts = self._safe_int(entry.get("ts")) if data else 0
            return data, ts

    def set_tautulli(self, data: dict | None, ts: float | int) -> None:
        with self._lock:
            # Tautulli index is treated as immutable after storage.
            self._store["tautulli"] = {
                "ts": self._safe_int(ts),
                "data": data or {},
            }

    def get_jellystat_state(self) -> tuple[dict | None, int]:
        with self._lock:
            entry = self._store["jellystat"]
            data = entry.get("data") or None
            ts = self._safe_int(entry.get("ts")) if data else 0
            return data, ts

    def set_jellystat(self, data: dict | None, ts: float | int) -> None:
        with self._lock:
            self._store["jellystat"] = {
                "ts": self._safe_int(ts),
                "data": data or {},
            }

    def snapshot_app_for_save(self, app_name: str) -> dict[str, dict]:
        with self._lock:
            store = self._store.get(app_name, {})
            return {
                str(instance_id): self._clone_entry(entry)
                for instance_id, entry in store.items()
            }


_cache = CacheManager()
_tautulli_match_progress = {"shows": None, "movies": None}
_tautulli_match_progress_lock = threading.Lock()
_sonarr_episodefile_cache: dict[str, dict[int, dict]] = {}
_sonarr_episodefile_cache_lock = threading.Lock()
_sonarr_season_cache: dict[str, dict[int, dict]] = {}
_sonarr_season_cache_lock = threading.Lock()
_sonarr_episode_cache: dict[str, dict[int, dict]] = {}
_sonarr_episode_cache_lock = threading.Lock()
_sonarr_wanted_cache: dict[str, dict] = {}
_sonarr_wanted_cache_lock = threading.Lock()
_radarr_wanted_cache: dict[str, dict] = {}
_radarr_wanted_cache_lock = threading.Lock()
_wanted_refresh_lock = threading.Lock()
_wanted_refresh_in_progress: set[str] = set()
_arr_circuit_state: dict[str, dict] = {}
_arr_circuit_lock = threading.Lock()

TAUTULLI_CSV_FIELDS = {
    "PlayCount",
    "LastWatched",
    "DaysSinceWatched",
    "TotalWatchTimeHours",
    "WatchContentRatio",
    "UsersWatched",
    "TautulliMatchStatus",
    "TautulliMatchReason",
}
RADARR_LITE_FIELDS = {
    "MovieId",
    "TmdbId",
    "ImdbId",
    "Title",
    "DateAdded",
    "Year",
    "Status",
    "Monitored",
    "QualityProfile",
    "MissingCount",
    "CutoffUnmetCount",
    "RecentlyGrabbed",
    "HasFile",
    "IsAvailable",
    "InCinemas",
    "LastSearchTime",
    "RuntimeMins",
    "FileSizeGB",
    "GBPerHour",
    "BitrateMbps",
    "BitrateEstimated",
    "Airing",
    "Scene",
    "RootFolder",
    "Path",
    "InstanceId",
    "InstanceName",
    "TautulliMatchStatus",
    "TautulliMatchReason",
    "TautulliMatched",
}

ENV_FILE_PATH = os.environ.get("SORTARR_CONFIG_PATH") or os.environ.get(
    "ENV_FILE_PATH",
    os.path.join(os.path.dirname(__file__), ".env"),
)
_env_loaded = False
_env_mtime = None
_env_lock = threading.Lock()
_startup_migrated = False
_tautulli_refresh_seen = None
_jellystat_refresh_seen = None
_jellystat_refresh_state = {
    "lock": threading.Lock(),
    "in_progress": False,
    "history_in_progress": False,
    "started_ts": 0,
}
_arr_refresh_state = {
    "sonarr": {"lock": threading.Lock(), "in_progress": False, "started_ts": 0},
    "radarr": {"lock": threading.Lock(), "in_progress": False, "started_ts": 0},
}
_arr_cache_save_state = {
    "sonarr": {"lock": threading.Lock(), "in_progress": False, "pending": None},
    "radarr": {"lock": threading.Lock(), "in_progress": False, "pending": None},
}
_perf_sink_module = None
_perf_sink_checked = False


def _get_perf_sink():
    global _perf_sink_module, _perf_sink_checked
    if _perf_sink_checked:
        return _perf_sink_module
    _perf_sink_checked = True
    tests_dir = os.path.join(os.path.dirname(__file__), "tests")
    if os.path.isdir(tests_dir) and tests_dir not in sys.path:
        sys.path.insert(0, tests_dir)
    try:
        import perf_sink

        _perf_sink_module = perf_sink
    except Exception as exc:
        logger.info("Perf sink unavailable: %s", exc)
        _perf_sink_module = None
    return _perf_sink_module


def _record_perf_entry(entry: dict) -> str | None:
    if not entry:
        return None
    perf_sink = _get_perf_sink()
    if not perf_sink:
        return None
    try:
        return perf_sink.record_perf(entry)
    except Exception as exc:
        logger.warning("Perf sink write failed: %s", exc)
        return None


def _record_timing(timing: dict | None, key: str, start: float) -> None:
    if timing is None:
        return
    timing[key] = round((time.perf_counter() - start) * 1000)


def _add_timing_ms(timing: dict | None, key: str, elapsed_seconds: float) -> None:
    if timing is None:
        return
    timing[key] = timing.get(key, 0) + round(elapsed_seconds * 1000)


def _format_timing_header(timing: dict | None) -> str:
    if not timing:
        return ""
    parts = []
    for key, value in timing.items():
        if value is None:
            continue
        parts.append(f"{key}={value}ms")
    return ", ".join(parts)


def _attach_timing_headers(resp, timing: dict | None) -> None:
    header = _format_timing_header(timing)
    if not header:
        return
    resp.headers["X-Sortarr-Timing"] = header


def _append_warning(existing: str, warning: str) -> str:
    warning = (warning or "").strip()
    if not warning:
        return existing or ""
    if not existing:
        return warning
    return f"{existing} | {warning}"


def _ensure_env_loaded():
    global _env_loaded, _env_mtime
    with _env_lock:
        try:
            mtime = os.path.getmtime(ENV_FILE_PATH)
        except OSError:
            mtime = None
        if _env_loaded and mtime is None:
            return
        if _env_loaded and _env_mtime is not None and mtime == _env_mtime:
            return
        _load_env_file(ENV_FILE_PATH, override=True)
        _env_loaded = True
        _env_mtime = mtime


@app.before_request
def _csrf_protect():
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None
    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")
    if origin and not _origin_matches_request(origin):
        return jsonify({"error": "CSRF origin mismatch."}), 403
    if referer and not _origin_matches_request(referer):
        return jsonify({"error": "CSRF referer mismatch."}), 403
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME) or ""
    request_token = _read_csrf_token_from_request()
    if not cookie_token or not request_token or request_token != cookie_token:
        return jsonify({"error": "CSRF validation failed."}), 403
    return None


@app.after_request
def _attach_csrf_cookie(resp: Response):
    token = getattr(g, "csrf_token", None)
    if token and getattr(g, "csrf_set_cookie", False):
        resp.set_cookie(
            CSRF_COOKIE_NAME,
            token,
            httponly=False,
            samesite="Lax",
            secure=request.is_secure,
        )
    return resp


def _parse_env_value(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] == '"':
        value = value[1:-1]
        value = value.replace("\\\\", "\\").replace('\\"', '"')
        return value
    if len(value) >= 2 and value[0] == value[-1] == "'":
        return value[1:-1]
    return value


def _quote_env_value(value: str) -> str:
    value = str(value or "")
    if value == "":
        return value
    if value.strip() != value or any(ch in value for ch in [" ", "#", "\t", '"', "'"]):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    return value


def _csv_safe_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return value
    text = str(value)
    if not text:
        return ""
    if text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{text}"
    return text


def _read_int_env(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, str(default)))
    except (TypeError, ValueError):
        return default


def _read_float_env(key: str, default: float) -> float:
    try:
        return float(os.environ.get(key, str(default)))
    except (TypeError, ValueError):
        return default


def _read_bool_env(key: str, default: bool = False) -> bool:
    raw = str(os.environ.get(key, "")).strip().lower()
    if not raw:
        return default
    if raw in {"1", "true", "yes", "on"}:
        return True
    if raw in {"0", "false", "no", "off"}:
        return False
    return default


_HISTORY_CACHE_TTL_SECONDS = max(_read_int_env("ARR_HISTORY_CACHE_TTL_SECONDS", 180), 30)


def _read_query_bool(*keys: str, default: bool = False) -> bool:
    for key in keys:
        raw = str(request.args.get(key) or "").strip().lower()
        if not raw:
            continue
        if raw in {"1", "true", "yes", "on"}:
            return True
        if raw in {"0", "false", "no", "off"}:
            return False
    return default


def _read_sonarr_episodefile_mode() -> str:
    raw = str(os.environ.get("SONARR_EPISODEFILE_MODE", "")).strip().lower()
    if raw in {"bulk", "all"}:
        return "bulk"
    if raw in {"fast", "stats", "skip", "off", "none"}:
        return "fast"
    return "series"


def _sonarr_series_stats_key(series: dict) -> tuple[int, int] | None:
    stats = series.get("statistics") or {}
    if not isinstance(stats, dict):
        return None
    file_count = _safe_int(stats.get("episodeFileCount"))
    size_on_disk = _safe_int(stats.get("sizeOnDisk"))
    return file_count, size_on_disk


def _sonarr_series_episode_stats_key(series: dict) -> tuple[int, int, int] | None:
    stats = series.get("statistics") or {}
    if not isinstance(stats, dict):
        return None
    file_count = _safe_int(stats.get("episodeFileCount"))
    size_on_disk = _safe_int(stats.get("sizeOnDisk"))
    total_count = _safe_int(stats.get("totalEpisodeCount"))
    return file_count, size_on_disk, total_count


def _sonarr_episodefile_cache_key(instance_id, base_url: str) -> str:
    ident = str(instance_id or "").strip() or _sanitize_url_for_log(base_url)
    return f"{ident}:{base_url}"


def _get_cached_episodefiles(
    cache_key: str,
    series_id: int,
    stats_key: tuple[int, int] | None,
    ttl_seconds: int,
) -> list[dict] | None:
    if ttl_seconds <= 0:
        return None
    now = time.time()
    with _sonarr_episodefile_cache_lock:
        instance_cache = _sonarr_episodefile_cache.get(cache_key)
        if not instance_cache:
            return None
        entry = instance_cache.get(series_id)
        if not entry:
            return None
        entry_ts = float(entry.get("ts") or 0)
        if entry_ts and now - entry_ts > ttl_seconds:
            instance_cache.pop(series_id, None)
            return None
        entry_stats = entry.get("stats_key")
        if stats_key and entry_stats and stats_key != entry_stats:
            instance_cache.pop(series_id, None)
            return None
        return entry.get("files") or []


def _set_cached_episodefiles(
    cache_key: str,
    series_id: int,
    files: list[dict],
    stats_key: tuple[int, int] | None,
) -> None:
    with _sonarr_episodefile_cache_lock:
        instance_cache = _sonarr_episodefile_cache.setdefault(cache_key, {})
        instance_cache[series_id] = {
            "files": files,
            "stats_key": stats_key,
            "ts": time.time(),
        }


def _get_cached_sonarr_seasons(
    cache_key: str,
    series_id: int,
    stats_key: tuple[int, int, int] | None,
    ttl_seconds: int,
) -> list[dict] | None:
    if ttl_seconds <= 0:
        return None
    now = time.time()
    with _sonarr_season_cache_lock:
        instance_cache = _sonarr_season_cache.get(cache_key)
        if not instance_cache:
            return None
        entry = instance_cache.get(series_id)
        if not entry:
            return None
        entry_ts = float(entry.get("ts") or 0)
        if entry_ts and now - entry_ts > ttl_seconds:
            instance_cache.pop(series_id, None)
            return None
        entry_stats = entry.get("stats_key")
        if stats_key and entry_stats and stats_key != entry_stats:
            instance_cache.pop(series_id, None)
            return None
        seasons = entry.get("seasons")
        return seasons if isinstance(seasons, list) else []


def _set_cached_sonarr_seasons(
    cache_key: str,
    series_id: int,
    seasons: list[dict],
    stats_key: tuple[int, int, int] | None,
) -> None:
    with _sonarr_season_cache_lock:
        instance_cache = _sonarr_season_cache.setdefault(cache_key, {})
        instance_cache[series_id] = {
            "seasons": seasons,
            "stats_key": stats_key,
            "ts": time.time(),
        }


def _get_cached_sonarr_episodes(
    cache_key: str,
    series_id: int,
    stats_key: tuple[int, int, int] | None,
    ttl_seconds: int,
) -> list[dict] | None:
    if ttl_seconds <= 0:
        return None
    now = time.time()
    with _sonarr_episode_cache_lock:
        instance_cache = _sonarr_episode_cache.get(cache_key)
        if not instance_cache:
            return None
        entry = instance_cache.get(series_id)
        if not entry:
            return None
        entry_ts = float(entry.get("ts") or 0)
        if entry_ts and now - entry_ts > ttl_seconds:
            instance_cache.pop(series_id, None)
            return None
        entry_stats = entry.get("stats_key")
        if stats_key and entry_stats and stats_key != entry_stats:
            instance_cache.pop(series_id, None)
            return None
        episodes = entry.get("episodes")
        return episodes if isinstance(episodes, list) else []


def _set_cached_sonarr_episodes(
    cache_key: str,
    series_id: int,
    episodes: list[dict],
    stats_key: tuple[int, int, int] | None,
) -> None:
    with _sonarr_episode_cache_lock:
        instance_cache = _sonarr_episode_cache.setdefault(cache_key, {})
        instance_cache[series_id] = {
            "episodes": episodes,
            "stats_key": stats_key,
            "ts": time.time(),
        }


def _get_cached_sonarr_wanted(
    cache_key: str,
    ttl_seconds: int,
) -> tuple[dict[int, int], dict[int, int], set[int]] | None:
    if ttl_seconds <= 0:
        return None
    now = time.time()
    with _sonarr_wanted_cache_lock:
        entry = _sonarr_wanted_cache.get(cache_key)
        if not entry:
            return None
        entry_ts = float(entry.get("ts") or 0)
        if entry_ts and now - entry_ts > ttl_seconds:
            _sonarr_wanted_cache.pop(cache_key, None)
            return None
        missing_counts = entry.get("missing_counts") or {}
        cutoff_counts = entry.get("cutoff_counts") or {}
        recent = set(entry.get("recently_grabbed") or [])
        return missing_counts, cutoff_counts, recent


def _set_cached_sonarr_wanted(
    cache_key: str,
    missing_counts: dict[int, int],
    cutoff_counts: dict[int, int],
    recently_grabbed: set[int],
) -> None:
    with _sonarr_wanted_cache_lock:
        _sonarr_wanted_cache[cache_key] = {
            "missing_counts": missing_counts,
            "cutoff_counts": cutoff_counts,
            "recently_grabbed": sorted(recently_grabbed),
            "ts": time.time(),
        }


def _radarr_wanted_cache_key(instance_id, base_url: str) -> str:
    ident = str(instance_id or "").strip() or _sanitize_url_for_log(base_url)
    return f"{ident}:{base_url}"


def _get_cached_radarr_wanted(
    cache_key: str,
    ttl_seconds: int,
) -> tuple[set[int], set[int], set[int]] | None:
    if ttl_seconds <= 0:
        return None
    now = time.time()
    with _radarr_wanted_cache_lock:
        entry = _radarr_wanted_cache.get(cache_key)
        if not entry:
            return None
        entry_ts = float(entry.get("ts") or 0)
        if entry_ts and now - entry_ts > ttl_seconds:
            _radarr_wanted_cache.pop(cache_key, None)
            return None
        missing_ids = set(entry.get("missing_ids") or [])
        cutoff_ids = set(entry.get("cutoff_ids") or [])
        recent = set(entry.get("recently_grabbed") or [])
        return missing_ids, cutoff_ids, recent


def _set_cached_radarr_wanted(
    cache_key: str,
    missing_ids: set[int],
    cutoff_ids: set[int],
    recently_grabbed: set[int],
) -> None:
    with _radarr_wanted_cache_lock:
        _radarr_wanted_cache[cache_key] = {
            "missing_ids": sorted(missing_ids),
            "cutoff_ids": sorted(cutoff_ids),
            "recently_grabbed": sorted(recently_grabbed),
            "ts": time.time(),
        }


def _read_worker_cap(key: str, default: int, max_value: int) -> int:
    workers = _read_int_env(key, default)
    if workers <= 0:
        return 1
    if max_value and workers > max_value:
        return max_value
    return workers


def _fetch_radarr_wanted_bundle(
    base_url: str,
    api_key: str,
    workers: int,
) -> tuple[set[int], set[int], set[int]]:
    missing_ids: set[int] = set()
    cutoff_ids: set[int] = set()
    recently_grabbed: set[int] = set()
    workers = max(1, int(workers or 1))
    if workers == 1:
        try:
            missing_ids = _fetch_radarr_wanted_ids(
                base_url,
                api_key,
                "/api/v3/wanted/missing",
                monitored_only=True,
            )
        except Exception as exc:
            logger.warning("Radarr wanted/missing fetch failed: %s", exc)
            missing_ids = set()
        try:
            cutoff_ids = _fetch_radarr_wanted_ids(
                base_url,
                api_key,
                "/api/v3/wanted/cutoff",
                monitored_only=True,
            )
        except Exception as exc:
            logger.warning("Radarr wanted/cutoff fetch failed: %s", exc)
            cutoff_ids = set()
        try:
            recently_grabbed = _fetch_recently_grabbed_movie_ids(base_url, api_key, days=30)
        except Exception as exc:
            logger.warning("Radarr recent grabbed fetch failed: %s", exc)
            recently_grabbed = set()
        return missing_ids, cutoff_ids, recently_grabbed

    tasks = {
        "missing": lambda: _fetch_radarr_wanted_ids(
            base_url,
            api_key,
            "/api/v3/wanted/missing",
            monitored_only=True,
        ),
        "cutoff": lambda: _fetch_radarr_wanted_ids(
            base_url,
            api_key,
            "/api/v3/wanted/cutoff",
            monitored_only=True,
        ),
        "recent": lambda: _fetch_recently_grabbed_movie_ids(base_url, api_key, days=30),
    }
    max_workers = min(workers, len(tasks))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(func): name for name, func in tasks.items()}
        for future in as_completed(futures):
            name = futures[future]
            try:
                result = future.result()
            except Exception as exc:
                if name == "missing":
                    logger.warning("Radarr wanted/missing fetch failed: %s", exc)
                elif name == "cutoff":
                    logger.warning("Radarr wanted/cutoff fetch failed: %s", exc)
                else:
                    logger.warning("Radarr recent grabbed fetch failed: %s", exc)
                result = set()
            if name == "missing":
                missing_ids = set(result or [])
            elif name == "cutoff":
                cutoff_ids = set(result or [])
            else:
                recently_grabbed = set(result or [])
    return missing_ids, cutoff_ids, recently_grabbed

def _apply_sonarr_wanted_flags(
    rows: list[dict],
    missing_counts: dict[int, int],
    cutoff_counts: dict[int, int],
    recently_grabbed: set[int],
) -> None:
    if not rows:
        return
    for row in rows:
        series_id = row.get("SeriesId")
        if series_id is None:
            continue
        row["MissingCount"] = (missing_counts or {}).get(series_id, 0)
        row["CutoffUnmetCount"] = (cutoff_counts or {}).get(series_id, 0)
        row["RecentlyGrabbed"] = series_id in (recently_grabbed or set())


def _apply_radarr_wanted_flags(
    rows: list[dict],
    missing_ids: set[int],
    cutoff_ids: set[int],
    recently_grabbed: set[int],
) -> None:
    if not rows:
        return
    for row in rows:
        movie_id = row.get("MovieId")
        if movie_id is None:
            continue
        row["MissingCount"] = movie_id in (missing_ids or set())
        row["CutoffUnmetCount"] = movie_id in (cutoff_ids or set())
        row["RecentlyGrabbed"] = movie_id in (recently_grabbed or set())


def _wanted_refresh_key(app_name: str, cache_key: str) -> str:
    return f"{app_name}:{cache_key}"


def _start_wanted_background_refresh(
    app_name: str,
    instance: dict,
    cache_path: str | None,
    log_cold_start: bool = False,
) -> bool:
    base_url = instance.get("url") or ""
    api_key = instance.get("api_key") or ""
    if not base_url or not api_key:
        return False
    instance_id = instance.get("id")
    if app_name == "sonarr":
        cache_seconds = _read_int_env("SONARR_EPISODEFILE_CACHE_SECONDS", 600)
        cache_key = _sonarr_episodefile_cache_key(instance_id, base_url)
    else:
        cache_seconds = _read_int_env("CACHE_SECONDS", 300)
        cache_key = _radarr_wanted_cache_key(instance_id, base_url)
    if cache_seconds <= 0:
        return False
    refresh_key = _wanted_refresh_key(app_name, cache_key)
    with _wanted_refresh_lock:
        if refresh_key in _wanted_refresh_in_progress:
            if log_cold_start:
                logger.info(
                    "%s wanted refresh already in progress; skipping.",
                    app_name.title(),
                )
            return False
        _wanted_refresh_in_progress.add(refresh_key)

    if log_cold_start:
        logger.info(
            "Cold start %s wanted refresh queued (background).",
            app_name,
        )

    def worker():
        success = False
        try:
            if app_name == "sonarr":
                try:
                    missing_counts = _fetch_sonarr_wanted_counts(
                        base_url,
                        api_key,
                        "/api/v3/wanted/missing",
                        monitored_only=True,
                    )
                except Exception as exc:
                    logger.warning("Sonarr wanted/missing fetch failed: %s", exc)
                    missing_counts = {}
                try:
                    cutoff_counts = _fetch_sonarr_wanted_counts(
                        base_url,
                        api_key,
                        "/api/v3/wanted/cutoff",
                        monitored_only=True,
                    )
                except Exception as exc:
                    logger.warning("Sonarr wanted/cutoff fetch failed: %s", exc)
                    cutoff_counts = {}
                try:
                    recently_grabbed = _fetch_recently_grabbed_series_ids(base_url, api_key, days=30)
                except Exception as exc:
                    logger.warning("Sonarr recent grabbed fetch failed: %s", exc)
                    recently_grabbed = set()
                _set_cached_sonarr_wanted(
                    cache_key,
                    missing_counts,
                    cutoff_counts,
                    recently_grabbed,
                )
                apply_flags = lambda rows: _apply_sonarr_wanted_flags(
                    rows,
                    missing_counts,
                    cutoff_counts,
                    recently_grabbed,
                )
            else:
                wanted_workers = _read_worker_cap("RADARR_WANTED_WORKERS", 2, 4)
                missing_ids, cutoff_ids, recently_grabbed = _fetch_radarr_wanted_bundle(
                    base_url,
                    api_key,
                    wanted_workers,
                )
                _set_cached_radarr_wanted(cache_key, missing_ids, cutoff_ids, recently_grabbed)
                apply_flags = lambda rows: _apply_radarr_wanted_flags(
                    rows,
                    missing_ids,
                    cutoff_ids,
                    recently_grabbed,
                )

            instance_key = str(instance_id or "")
            entry_snapshot = _cache.get_app_entry_snapshot(app_name, instance_key)
            if entry_snapshot and entry_snapshot.get("data"):
                rows = _clone_rows(entry_snapshot.get("data") or [])
                apply_flags(rows)
                _cache.update_app_entry(
                    app_name,
                    instance_key,
                    data=rows,
                    ts=entry_snapshot.get("ts") or 0,
                    tautulli_index_ts=entry_snapshot.get("tautulli_index_ts") or 0,
                )
            if cache_path:
                disk_cache = _load_arr_cache(cache_path)
                disk_entry = disk_cache.get(instance_key)
                if disk_entry and isinstance(disk_entry.get("data"), list):
                    disk_rows = _clone_rows(disk_entry.get("data") or [])
                    apply_flags(disk_rows)
                    disk_entry["data"] = disk_rows
                    disk_cache[instance_key] = disk_entry
                    _queue_arr_cache_save(app_name, cache_path, disk_cache, "wanted_refresh")
            success = True
        except Exception as exc:
            logger.warning("%s wanted refresh failed: %s", app_name.title(), exc)
        finally:
            with _wanted_refresh_lock:
                _wanted_refresh_in_progress.discard(refresh_key)
            if success and log_cold_start:
                logger.info("%s wanted refresh completed.", app_name.title())

    thread = threading.Thread(target=worker, name=f"sortarr-{app_name}-wanted", daemon=True)
    thread.start()
    return True


def _fetch_radarr_wanted_ids(
    base_url: str,
    api_key: str,
    path: str,
    monitored_only: bool = True,
) -> set[int]:
    ids: set[int] = set()
    page = 1
    page_size = 1000
    while True:
        params = {
            "page": page,
            "pageSize": page_size,
        }
        if monitored_only:
            params["monitored"] = "true"
        payload = _arr_get(base_url, api_key, path, params=params, app_name="radarr")
        if isinstance(payload, dict):
            records = payload.get("records") or []
            total_records = _safe_int(payload.get("totalRecords") or 0)
        else:
            records = payload or []
            total_records = len(records)
        for record in records:
            movie_id = record.get("id") if isinstance(record, dict) else None
            if movie_id is None and isinstance(record, dict):
                movie_id = record.get("movieId")
                if movie_id is None:
                    movie = record.get("movie") or {}
                    movie_id = movie.get("id")
            if movie_id is None:
                continue
            try:
                ids.add(int(movie_id))
            except (TypeError, ValueError):
                continue
        if not isinstance(payload, dict) or total_records <= page * page_size or not records:
            break
        page += 1
    return ids


def _fetch_recently_grabbed_movie_ids(
    base_url: str,
    api_key: str,
    days: int = 30,
) -> set[int]:
    since_date = (
        datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    ).isoformat()
    params = {
        "date": since_date,
        "eventType": "grabbed",
        "includeMovie": "false",
    }
    payload = _arr_get(
        base_url,
        api_key,
        "/api/v3/history/since",
        params=params,
        app_name="radarr",
        circuit_group="history",
    )
    records = payload if isinstance(payload, list) else (payload or [])
    ids: set[int] = set()
    for record in records:
        movie_id = record.get("movieId")
        if movie_id is None:
            movie = record.get("movie") or {}
            movie_id = movie.get("id")
        if movie_id is None:
            continue
        try:
            ids.add(int(movie_id))
        except (TypeError, ValueError):
            continue
    return ids


def _fetch_sonarr_wanted_counts(
    base_url: str,
    api_key: str,
    path: str,
    monitored_only: bool = True,
) -> dict[int, int]:
    counts: dict[int, int] = {}
    page = 1
    page_size = 1000
    while True:
        params = {
            "page": page,
            "pageSize": page_size,
            "includeSeries": "false",
            "includeImages": "false",
        }
        if monitored_only:
            params["monitored"] = "true"
        payload = _arr_get(base_url, api_key, path, params=params, app_name="sonarr")
        if isinstance(payload, dict):
            records = payload.get("records") or []
            total_records = _safe_int(payload.get("totalRecords") or 0)
        else:
            records = payload or []
            total_records = len(records)
        for record in records:
            series_id = record.get("seriesId")
            if series_id is None:
                series = record.get("series") or {}
                series_id = series.get("id")
            if series_id is None:
                continue
            try:
                series_key = int(series_id)
            except (TypeError, ValueError):
                continue
            counts[series_key] = counts.get(series_key, 0) + 1
        if not isinstance(payload, dict) or total_records <= page * page_size or not records:
            break
        page += 1
    return counts


def _fetch_recently_grabbed_series_ids(
    base_url: str,
    api_key: str,
    days: int = 30,
) -> set[int]:
    since_date = (
        datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    ).date().isoformat()
    params = {
        "date": since_date,
        "eventType": "grabbed",
        "includeSeries": "false",
        "includeEpisode": "false",
    }
    payload = _arr_get(
        base_url,
        api_key,
        "/api/v3/history/since",
        params=params,
        app_name="sonarr",
        circuit_group="history",
    )
    records = payload if isinstance(payload, list) else (payload or [])
    ids: set[int] = set()
    for record in records:
        series_id = record.get("seriesId")
        if series_id is None:
            series = record.get("series") or {}
            series_id = series.get("id")
        if series_id is None:
            continue
        try:
            ids.add(int(series_id))
        except (TypeError, ValueError):
            continue
    return ids


def _clear_sonarr_series_cache(cache_key: str, series_id: int) -> None:
    with _sonarr_episodefile_cache_lock:
        instance_cache = _sonarr_episodefile_cache.get(cache_key)
        if instance_cache:
            instance_cache.pop(series_id, None)
    with _sonarr_season_cache_lock:
        instance_cache = _sonarr_season_cache.get(cache_key)
        if instance_cache:
            instance_cache.pop(series_id, None)
    with _sonarr_episode_cache_lock:
        instance_cache = _sonarr_episode_cache.get(cache_key)
        if instance_cache:
            instance_cache.pop(series_id, None)

def _arr_circuit_key(app_name: str | None, base_url: str, group: str | None = None) -> str:
    label = (app_name or "arr").strip().lower()
    group_label = (group or "core").strip().lower()
    return f"{label}:{group_label}:{base_url}"


def _arr_circuit_is_open(key: str) -> bool:
    now = time.time()
    with _arr_circuit_lock:
        state = _arr_circuit_state.get(key)
        if not state:
            return False
        open_until = float(state.get("open_until") or 0)
        if open_until and open_until > now:
            return True
        if open_until:
            state["open_until"] = 0
            state["fail_count"] = 0
        return False


def _arr_circuit_on_success(key: str) -> None:
    with _arr_circuit_lock:
        state = _arr_circuit_state.setdefault(key, {})
        state["fail_count"] = 0
        state["open_until"] = 0


def _arr_circuit_on_failure(key: str) -> None:
    threshold = max(_read_int_env("ARR_CIRCUIT_FAIL_THRESHOLD", 3), 1)
    open_seconds = max(_read_int_env("ARR_CIRCUIT_OPEN_SECONDS", 30), 0)
    now = time.time()
    with _arr_circuit_lock:
        state = _arr_circuit_state.setdefault(key, {"fail_count": 0, "open_until": 0})
        state["fail_count"] = int(state.get("fail_count") or 0) + 1
        if open_seconds > 0 and state["fail_count"] >= threshold:
            state["open_until"] = max(float(state.get("open_until") or 0), now + open_seconds)


def _read_arr_timeout_seconds(app_name: str) -> int:
    if app_name == "sonarr":
        value = _read_int_env("SONARR_TIMEOUT_SECONDS", 90)
    elif app_name == "radarr":
        value = _read_int_env("RADARR_TIMEOUT_SECONDS", 90)
    else:
        value = 90
    return value if value >= 0 else 45


def _safe_log_path(path: str) -> str:
    if not path:
        return ""
    return os.path.basename(path)


def _derive_root_folder(path: str) -> str:
    if not path:
        return ""
    raw = str(path).strip()
    if not raw:
        return ""
    stripped = raw.rstrip("/\\")
    if not stripped:
        return raw
    root = os.path.dirname(stripped)
    return root or raw


def _age_seconds(ts: float | int | None) -> int | None:
    if not ts:
        return None
    try:
        return int(time.time() - float(ts))
    except (TypeError, ValueError):
        return None


def _normalize_url(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    scheme_match = re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", value)
    if scheme_match:
        scheme = scheme_match.group(0)
        rest = value[len(scheme) :]
        rest = re.sub(r"^(?:[a-zA-Z][a-zA-Z0-9+.-]*://)+", "", rest)
        value = f"{scheme}{rest}"
    else:
        value = f"http://{value}"
    return value.rstrip("/")


def _sanitize_url_for_log(url: str) -> str:
    if not url:
        return ""
    try:
        parts = urlsplit(url)
    except Exception:
        return "<redacted>"
    if not parts.scheme and not parts.netloc:
        return "<redacted>"
    netloc = parts.netloc
    if "@" in netloc:
        host = netloc.split("@", 1)[1]
        netloc = f"<redacted>@{host}"
    return urlunsplit((parts.scheme, netloc, parts.path, "", ""))


_URL_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9+.-]*://[^\s\]\"'<>]+")
_SECRET_PAIR_RE = re.compile(r"(?i)(api[_-]?key|token|password)=([^&\s]+)")


def _sanitize_error_text(text: str) -> str:
    if not text:
        return ""
    redacted = _SECRET_PAIR_RE.sub(r"\1=<redacted>", text)

    def _replace_url(match: re.Match) -> str:
        return _sanitize_url_for_log(match.group(0)) or "<redacted>"

    return _URL_RE.sub(_replace_url, redacted)


def _safe_exception_message(exc: Exception | None) -> str:
    if not exc:
        return ""
    safe_text = _sanitize_error_text(str(exc))
    return safe_text or type(exc).__name__


def _origin_matches_request(origin: str) -> bool:
    if not origin:
        return True
    try:
        origin_parts = urlsplit(origin)
        host_parts = urlsplit(request.host_url)
    except Exception:
        return False
    return (
        origin_parts.scheme == host_parts.scheme
        and origin_parts.netloc == host_parts.netloc
    )


def _get_csrf_token() -> str:
    token = request.cookies.get(CSRF_COOKIE_NAME)
    if token:
        g.csrf_token = token
        return token
    token = secrets.token_urlsafe(32)
    g.csrf_token = token
    g.csrf_set_cookie = True
    return token


def _read_csrf_token_from_request() -> str:
    token = request.headers.get(CSRF_HEADER_NAME) or request.form.get(CSRF_FORM_FIELD)
    if token:
        return token
    payload = request.get_json(silent=True)
    if isinstance(payload, dict):
        return str(payload.get(CSRF_FORM_FIELD) or "")
    return ""


def _load_env_file(path: str, override: bool = False):
    if not os.path.exists(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = _parse_env_value(value)
                if key and (override or key not in os.environ):
                    os.environ[key] = value
    except OSError:
        return


def _write_env_file(path: str, values: dict):
    dir_path = os.path.dirname(path)
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)

    standard_keys = [
        "SONARR_URL",
        "SONARR_API_KEY",
        "SONARR_NAME",
        "SONARR_URL_2",
        "SONARR_API_KEY_2",
        "SONARR_NAME_2",
        "SONARR_URL_3",
        "SONARR_API_KEY_3",
        "SONARR_NAME_3",
        "RADARR_URL",
        "RADARR_API_KEY",
        "RADARR_NAME",
        "RADARR_URL_2",
        "RADARR_API_KEY_2",
        "RADARR_NAME_2",
        "RADARR_URL_3",
        "RADARR_API_KEY_3",
        "RADARR_NAME_3",
        "SONARR_PATH_MAP",
        "SONARR_PATH_MAP_2",
        "SONARR_PATH_MAP_3",
        "RADARR_PATH_MAP",
        "RADARR_PATH_MAP_2",
        "RADARR_PATH_MAP_3",
        "TAUTULLI_URL",
        "TAUTULLI_API_KEY",
        "JELLYSTAT_URL",
        "JELLYSTAT_API_KEY",
        "JELLYSTAT_LIBRARY_IDS_SONARR",
        "JELLYSTAT_LIBRARY_IDS_RADARR",
        "JELLYSTAT_TIMEOUT_SECONDS",
        "JELLYSTAT_STATS_PAGE_SIZE",
        "JELLYSTAT_HISTORY_PAGE_SIZE",
        "JELLYSTAT_REFRESH_STALE_SECONDS",
        "TAUTULLI_METADATA_LOOKUP_LIMIT",
        "TAUTULLI_METADATA_LOOKUP_SECONDS",
        "TAUTULLI_TIMEOUT_SECONDS",
        "TAUTULLI_FETCH_SECONDS",
        "TAUTULLI_METADATA_WORKERS",
        "TAUTULLI_METADATA_SAVE_EVERY",
        "TAUTULLI_REFRESH_STALE_SECONDS",
        "SONARR_TIMEOUT_SECONDS",
        "RADARR_TIMEOUT_SECONDS",
        "SONARR_EPISODEFILE_WORKERS",
        "SONARR_EPISODEFILE_DELAY_SECONDS",
        "SONARR_EPISODEFILE_CACHE_SECONDS",
        "RADARR_WANTED_WORKERS",
        "RADARR_INSTANCE_WORKERS",
        "ARR_BACKOFF_BASE_SECONDS",
        "ARR_BACKOFF_MAX_RETRIES",
        "ARR_CIRCUIT_FAIL_THRESHOLD",
        "ARR_CIRCUIT_OPEN_SECONDS",
        "BASIC_AUTH_USER",
        "BASIC_AUTH_PASS",
        "CACHE_SECONDS",
    ]

    existing_standard = {}
    extra_lines = []
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped == "":
                        extra_lines.append("")
                        continue
                    if stripped.startswith("#") or "=" not in line:
                        extra_lines.append(line.rstrip("\n"))
                        continue
                    key, _ = line.split("=", 1)
                    key = key.strip()
                    if key in standard_keys:
                        existing_standard[key] = line.rstrip("\n")
                    else:
                        extra_lines.append(line.rstrip("\n"))
        except OSError:
            extra_lines = []

    lines = []
    for key in standard_keys:
        if key in values:
            lines.append(f"{key}={_quote_env_value(values[key])}")
        elif key in existing_standard:
            lines.append(existing_standard[key])

    lines.extend(extra_lines)

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def _startup_state_path() -> str:
    base_dir = os.path.dirname(ENV_FILE_PATH) or os.getcwd()
    return os.path.join(base_dir, "Sortarr.startup.json")


def _load_startup_state(path: str) -> dict:
    if not path or not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _save_startup_state(path: str, state: dict) -> None:
    if not path:
        return
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as handle:
            json.dump(state, handle, indent=2, sort_keys=True)
        os.replace(tmp_path, path)
    except OSError:
        logger.warning("Failed to write startup state (path redacted).")


def _maybe_migrate_env_defaults(path: str) -> set[str]:
    if not path or not os.path.exists(path):
        return set()
    removed = set()
    legacy_timeout_default = 60
    timeout_value = _read_int_env("TAUTULLI_TIMEOUT_SECONDS", legacy_timeout_default)
    legacy_fetch_default = max(timeout_value * 2, 300)

    def should_remove(key: str, value: str) -> bool:
        if key == "TAUTULLI_METADATA_LOOKUP_LIMIT":
            return value == "200"
        if key == "TAUTULLI_METADATA_LOOKUP_SECONDS":
            return value == "5"
        if key == "TAUTULLI_TIMEOUT_SECONDS":
            return value == str(legacy_timeout_default)
        if key == "TAUTULLI_FETCH_SECONDS":
            return value == str(legacy_fetch_default)
        return False

    lines = []
    changed = False
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                raw = line.rstrip("\n")
                stripped = raw.strip()
                if not stripped or stripped.startswith("#") or "=" not in raw:
                    lines.append(raw)
                    continue
                key, value = raw.split("=", 1)
                key = key.strip()
                parsed = _parse_env_value(value)
                if should_remove(key, parsed):
                    removed.add(key)
                    changed = True
                    continue
                lines.append(raw)
    except OSError:
        return set()

    if changed:
        try:
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("\n".join(lines) + "\n")
        except OSError:
            return set()

    return removed


def _enforce_tautulli_lookup_defaults(path: str) -> bool:
    desired = {
        "TAUTULLI_METADATA_LOOKUP_LIMIT": str(REQUIRED_TAUTULLI_LOOKUP_LIMIT),
        "TAUTULLI_METADATA_LOOKUP_SECONDS": str(REQUIRED_TAUTULLI_LOOKUP_SECONDS),
    }
    changed = False
    for key, value in desired.items():
        if os.environ.get(key) != value:
            os.environ[key] = value
            changed = True
    if changed and path and os.path.exists(path):
        try:
            _write_env_file(path, desired)
        except OSError:
            pass
    return changed


def _wipe_cache_files() -> None:
    cache_paths = [
        os.environ.get("SONARR_CACHE_PATH", _default_arr_cache_path("sonarr")),
        os.environ.get("RADARR_CACHE_PATH", _default_arr_cache_path("radarr")),
        os.environ.get("TAUTULLI_METADATA_CACHE", _default_tautulli_metadata_cache_path()),
        os.environ.get("JELLYSTAT_CACHE_PATH", _default_jellystat_cache_path()),
        _tautulli_refresh_lock_path(),
        _tautulli_refresh_marker_path(),
        _jellystat_refresh_lock_path(),
        _jellystat_refresh_marker_path(),
    ]
    for path in cache_paths:
        if not path:
            continue
        try:
            os.remove(path)
        except OSError:
            continue


def _apply_startup_migrations() -> None:
    global _startup_migrated, _env_mtime
    if _startup_migrated:
        return
    _startup_migrated = True

    state_path = _startup_state_path()
    state = _load_startup_state(state_path)
    version_changed = state.get("app_version") != APP_VERSION
    enforced = _enforce_tautulli_lookup_defaults(ENV_FILE_PATH)
    if enforced:
        try:
            _env_mtime = os.path.getmtime(ENV_FILE_PATH)
        except OSError:
            _env_mtime = None
    if not version_changed and not enforced:
        return

    if version_changed:
        removed = _maybe_migrate_env_defaults(ENV_FILE_PATH)
        for key in removed:
            os.environ.pop(key, None)
        if removed:
            try:
                _env_mtime = os.path.getmtime(ENV_FILE_PATH)
            except OSError:
                _env_mtime = None

    _cache.clear_all()
    _wipe_cache_files()
    if version_changed:
        _save_startup_state(state_path, {"app_version": APP_VERSION})


def _collect_instance_indexes(prefix: str) -> list[int]:
    indexes = set()
    for key in os.environ.keys():
        if key.startswith(f"{prefix}_URL_") or key.startswith(f"{prefix}_API_KEY_") or key.startswith(f"{prefix}_NAME_"):
            suffix = key.split("_")[-1]
            if suffix.isdigit():
                indexes.add(int(suffix))
    if os.environ.get(f"{prefix}_URL") or os.environ.get(f"{prefix}_API_KEY") or os.environ.get(f"{prefix}_NAME"):
        indexes.add(1)
    return sorted(indexes)


def _instance_error_key(prefix: str, idx: int) -> str:
    return f"{prefix.lower()}_{idx}"


_PATH_MAP_SPLIT_RE = re.compile(r"\s*[|,;]\s*")
_CSV_SPLIT_RE = re.compile(r"\s*[,;]\s*")


def _split_path_map_entries(raw: str) -> list[str]:
    raw = str(raw or "").strip()
    if not raw:
        return []
    if _PATH_MAP_SPLIT_RE.search(raw):
        parts = [part.strip() for part in _PATH_MAP_SPLIT_RE.split(raw)]
    else:
        parts = [raw]
    return [part for part in parts if part]


def _split_csv_values(raw: str) -> list[str]:
    raw = str(raw or "").strip()
    if not raw:
        return []
    parts = [part.strip() for part in _CSV_SPLIT_RE.split(raw)]
    return [part for part in parts if part]


def _parse_path_map_entries(raw: str) -> list[tuple[str, str]]:
    entries = _split_path_map_entries(raw)
    pairs = []
    for entry in entries:
        if ":" not in entry:
            continue
        src, dst = entry.split(":", 1)
        src = src.strip()
        dst = dst.strip()
        if src and dst:
            pairs.append((src, dst))
    return pairs


def _build_instances(prefix: str, label: str) -> list[dict]:
    instances = []
    for idx in _collect_instance_indexes(prefix):
        suffix = "" if idx == 1 else f"_{idx}"
        url = _normalize_url(os.environ.get(f"{prefix}_URL{suffix}", ""))
        api_key = os.environ.get(f"{prefix}_API_KEY{suffix}", "")
        name = os.environ.get(f"{prefix}_NAME{suffix}", "").strip()
        path_map_raw = str(os.environ.get(f"{prefix}_PATH_MAP{suffix}") or "").strip()
        path_maps = _parse_path_map_entries(path_map_raw)
        path_map = path_maps[0] if path_maps else None

        if not (url and api_key):
            continue
        instances.append(
            {
                "id": f"{label.lower()}-{idx}",
                "index": idx,
                "name": name,
                "url": url,
                "api_key": api_key,
                "path_map": path_map,
                "path_maps": path_maps,
            }
        )

    if len(instances) == 1:
        if not instances[0]["name"]:
            instances[0]["name"] = label
    elif len(instances) > 1:
        for inst in instances:
            if not inst["name"]:
                inst["name"] = f"{label} {inst['index']}"
    return instances


def _public_instances(instances: list[dict]) -> list[dict]:
    return [
        {
            "id": inst.get("id", ""),
            "name": inst.get("name", ""),
            "url": inst.get("url", ""),
        }
        for inst in instances
    ]


def _get_config():
    _ensure_env_loaded()
    _apply_startup_migrations()
    sonarr_instances = _build_instances("SONARR", "Sonarr")
    radarr_instances = _build_instances("RADARR", "Radarr")
    sonarr_primary = sonarr_instances[0] if sonarr_instances else None
    radarr_primary = radarr_instances[0] if radarr_instances else None
    sonarr_path_map = os.environ.get("SONARR_PATH_MAP", "")
    sonarr_path_map_2 = os.environ.get("SONARR_PATH_MAP_2", "")
    sonarr_path_map_3 = os.environ.get("SONARR_PATH_MAP_3", "")
    radarr_path_map = os.environ.get("RADARR_PATH_MAP", "")
    radarr_path_map_2 = os.environ.get("RADARR_PATH_MAP_2", "")
    radarr_path_map_3 = os.environ.get("RADARR_PATH_MAP_3", "")
    tautulli_timeout_seconds = _read_int_env("TAUTULLI_TIMEOUT_SECONDS", 60)
    default_fetch_seconds = 0
    raw_fetch_seconds = os.environ.get("TAUTULLI_FETCH_SECONDS")
    if raw_fetch_seconds is None or raw_fetch_seconds.strip() == "":
        tautulli_fetch_seconds = default_fetch_seconds
    else:
        tautulli_fetch_seconds = _read_int_env("TAUTULLI_FETCH_SECONDS", default_fetch_seconds)
    jellystat_timeout_seconds = _read_int_env("JELLYSTAT_TIMEOUT_SECONDS", 60)
    jellystat_stats_page_size = _read_int_env("JELLYSTAT_STATS_PAGE_SIZE", 500)
    jellystat_history_page_size = _read_int_env("JELLYSTAT_HISTORY_PAGE_SIZE", 250)
    return {
        "sonarr_url": sonarr_primary["url"] if sonarr_primary else _normalize_url(os.environ.get("SONARR_URL", "")),
        "sonarr_api_key": sonarr_primary["api_key"] if sonarr_primary else os.environ.get("SONARR_API_KEY", ""),
        "sonarr_name": os.environ.get("SONARR_NAME", ""),
        "sonarr_url_2": _normalize_url(os.environ.get("SONARR_URL_2", "")),
        "sonarr_api_key_2": os.environ.get("SONARR_API_KEY_2", ""),
        "sonarr_name_2": os.environ.get("SONARR_NAME_2", ""),
        "sonarr_url_3": _normalize_url(os.environ.get("SONARR_URL_3", "")),
        "sonarr_api_key_3": os.environ.get("SONARR_API_KEY_3", ""),
        "sonarr_name_3": os.environ.get("SONARR_NAME_3", ""),
        "sonarr_path_map": sonarr_path_map,
        "sonarr_path_maps": _split_path_map_entries(sonarr_path_map),
        "sonarr_path_map_2": sonarr_path_map_2,
        "sonarr_path_maps_2": _split_path_map_entries(sonarr_path_map_2),
        "sonarr_path_map_3": sonarr_path_map_3,
        "sonarr_path_maps_3": _split_path_map_entries(sonarr_path_map_3),
        "radarr_url": radarr_primary["url"] if radarr_primary else _normalize_url(os.environ.get("RADARR_URL", "")),
        "radarr_api_key": radarr_primary["api_key"] if radarr_primary else os.environ.get("RADARR_API_KEY", ""),
        "radarr_name": os.environ.get("RADARR_NAME", ""),
        "radarr_url_2": _normalize_url(os.environ.get("RADARR_URL_2", "")),
        "radarr_api_key_2": os.environ.get("RADARR_API_KEY_2", ""),
        "radarr_name_2": os.environ.get("RADARR_NAME_2", ""),
        "radarr_url_3": _normalize_url(os.environ.get("RADARR_URL_3", "")),
        "radarr_api_key_3": os.environ.get("RADARR_API_KEY_3", ""),
        "radarr_name_3": os.environ.get("RADARR_NAME_3", ""),
        "radarr_path_map": radarr_path_map,
        "radarr_path_maps": _split_path_map_entries(radarr_path_map),
        "radarr_path_map_2": radarr_path_map_2,
        "radarr_path_maps_2": _split_path_map_entries(radarr_path_map_2),
        "radarr_path_map_3": radarr_path_map_3,
        "radarr_path_maps_3": _split_path_map_entries(radarr_path_map_3),
        "sonarr_instances": sonarr_instances,
        "radarr_instances": radarr_instances,
        "tautulli_url": _normalize_url(os.environ.get("TAUTULLI_URL", "")),
        "tautulli_api_key": os.environ.get("TAUTULLI_API_KEY", ""),
        "jellystat_url": _normalize_url(os.environ.get("JELLYSTAT_URL", "")),
        "jellystat_api_key": os.environ.get("JELLYSTAT_API_KEY", ""),
        "jellystat_cache_path": os.environ.get(
            "JELLYSTAT_CACHE_PATH",
            _default_jellystat_cache_path(),
        ),
        "jellystat_library_ids_sonarr": os.environ.get("JELLYSTAT_LIBRARY_IDS_SONARR", "").strip(),
        "jellystat_library_ids_radarr": os.environ.get("JELLYSTAT_LIBRARY_IDS_RADARR", "").strip(),
        "tautulli_metadata_cache": os.environ.get(
            "TAUTULLI_METADATA_CACHE",
            _default_tautulli_metadata_cache_path(),
        ),
        "sonarr_cache_path": os.environ.get(
            "SONARR_CACHE_PATH",
            _default_arr_cache_path("sonarr"),
        ),
        "radarr_cache_path": os.environ.get(
            "RADARR_CACHE_PATH",
            _default_arr_cache_path("radarr"),
        ),
        "tautulli_metadata_lookup_limit": REQUIRED_TAUTULLI_LOOKUP_LIMIT,
        "tautulli_metadata_lookup_seconds": REQUIRED_TAUTULLI_LOOKUP_SECONDS,
        "tautulli_metadata_workers": _read_int_env("TAUTULLI_METADATA_WORKERS", 4),
        "tautulli_metadata_save_every": _read_int_env("TAUTULLI_METADATA_SAVE_EVERY", 250),
        "tautulli_refresh_stale_seconds": _read_int_env("TAUTULLI_REFRESH_STALE_SECONDS", 3600),
        "tautulli_timeout_seconds": tautulli_timeout_seconds,
        "tautulli_fetch_seconds": tautulli_fetch_seconds,
        "jellystat_timeout_seconds": jellystat_timeout_seconds,
        "jellystat_stats_page_size": jellystat_stats_page_size,
        "jellystat_history_page_size": jellystat_history_page_size,
        "jellystat_refresh_stale_seconds": _read_int_env("JELLYSTAT_REFRESH_STALE_SECONDS", 3600),
        "sonarr_timeout_seconds": _read_int_env("SONARR_TIMEOUT_SECONDS", 90),
        "radarr_timeout_seconds": _read_int_env("RADARR_TIMEOUT_SECONDS", 90),
        "sonarr_episodefile_workers": max(_read_int_env("SONARR_EPISODEFILE_WORKERS", 8), 1),
        "sonarr_episodefile_delay_seconds": _read_float_env("SONARR_EPISODEFILE_DELAY_SECONDS", 0.0),
        "sonarr_episodefile_cache_seconds": _read_int_env("SONARR_EPISODEFILE_CACHE_SECONDS", 600),
        "radarr_wanted_workers": _read_worker_cap("RADARR_WANTED_WORKERS", 2, 4),
        "radarr_instance_workers": max(_read_int_env("RADARR_INSTANCE_WORKERS", 1), 1),
        "arr_backoff_base_seconds": _read_float_env("ARR_BACKOFF_BASE_SECONDS", 0.5),
        "arr_backoff_max_retries": _read_int_env("ARR_BACKOFF_MAX_RETRIES", 2),
        "arr_circuit_fail_threshold": _read_int_env("ARR_CIRCUIT_FAIL_THRESHOLD", 3),
        "arr_circuit_open_seconds": _read_int_env("ARR_CIRCUIT_OPEN_SECONDS", 30),
        "cache_seconds": _read_int_env("CACHE_SECONDS", 300),
        "basic_auth_user": os.environ.get("BASIC_AUTH_USER", ""),
        "basic_auth_pass": os.environ.get("BASIC_AUTH_PASS", ""),
    }



def _config_complete(cfg: dict) -> bool:
    return bool(cfg.get("sonarr_instances") or cfg.get("radarr_instances"))


def _playback_provider(cfg: dict) -> str:
    if cfg.get("jellystat_url") and cfg.get("jellystat_api_key"):
        return "jellystat"
    if cfg.get("tautulli_url") and cfg.get("tautulli_api_key"):
        return "tautulli"
    return ""


def _playback_label(provider: str) -> str:
    if provider == "jellystat":
        return "Jellystat"
    if provider == "tautulli":
        return "Tautulli"
    return "Playback"


def _playback_enabled(cfg: dict) -> bool:
    return bool(_playback_provider(cfg))


def _get_playback_index_state(cfg: dict) -> tuple[str, dict | None, int]:
    provider = _playback_provider(cfg)
    if provider == "jellystat":
        data, ts = _cache.get_jellystat_state()
    elif provider == "tautulli":
        data, ts = _cache.get_tautulli_state()
    else:
        data, ts = None, 0
    return provider, data, ts


def _playback_refresh_in_progress(cfg: dict, provider: str | None = None) -> bool:
    provider = provider or _playback_provider(cfg)
    if provider == "tautulli":
        return _tautulli_refresh_in_progress(cfg)
    if provider == "jellystat":
        return _jellystat_refresh_in_progress(cfg)
    return False


def _invalidate_cache():
    _cache.clear_all()
    with _sonarr_episodefile_cache_lock:
        _sonarr_episodefile_cache.clear()
    with _sonarr_season_cache_lock:
        _sonarr_season_cache.clear()
    with _sonarr_episode_cache_lock:
        _sonarr_episode_cache.clear()
    with _sonarr_wanted_cache_lock:
        _sonarr_wanted_cache.clear()
    with _radarr_wanted_cache_lock:
        _radarr_wanted_cache.clear()
    cfg = _get_config()
    for path in (
        cfg.get("sonarr_cache_path"),
        cfg.get("radarr_cache_path"),
        cfg.get("jellystat_cache_path"),
    ):
        if not path:
            continue
        try:
            os.remove(path)
        except OSError:
            pass
    _history_cache_clear()


# History cache (per app/instance/item)
_history_cache: dict[tuple, tuple[float, dict]] = {}
_history_cache_lock = threading.Lock()


def _history_cache_key(app: str, instance_id: str, series_id: int, episode_id: int, movie_id: int, include_raw: bool) -> tuple:
    return (
        app.lower().strip(),
        str(instance_id or ""),
        int(series_id or 0),
        int(episode_id or 0),
        int(movie_id or 0),
        bool(include_raw),
    )


def _history_cache_get(key: tuple) -> dict | None:
    now = time.time()
    with _history_cache_lock:
        entry = _history_cache.get(key)
        if not entry:
            return None
        expires_at, payload = entry
        if expires_at <= now:
            _history_cache.pop(key, None)
            return None
        return copy.deepcopy(payload)


def _history_cache_set(key: tuple, payload: dict) -> None:
    ttl = _HISTORY_CACHE_TTL_SECONDS
    expires_at = time.time() + ttl
    with _history_cache_lock:
        _history_cache[key] = (expires_at, copy.deepcopy(payload))


def _history_cache_clear(key_prefix: tuple | None = None) -> None:
    with _history_cache_lock:
        if key_prefix is None:
            _history_cache.clear()
            return
        keys = list(_history_cache.keys())
        for k in keys:
            if k[: len(key_prefix)] == key_prefix:
                _history_cache.pop(k, None)


def _collect_cached_rows(app_name: str) -> tuple[list[dict], int]:
    rows: list[dict] = []
    latest_ts = 0
    store = _cache.get_app_snapshot(app_name)
    for entry in store.values():
        data = entry.get("data")
        if isinstance(data, list):
            rows.extend(data)
        latest_ts = max(latest_ts, _safe_int(entry.get("ts")))
    return rows, latest_ts


def _collect_cache_latest_ts(app_name: str) -> int:
    latest_ts = 0
    store = _cache.get_app_snapshot(app_name)
    for entry in store.values():
        latest_ts = max(latest_ts, _safe_int(entry.get("ts")))
    return latest_ts


def _reset_tautulli_match_progress() -> None:
    with _tautulli_match_progress_lock:
        _tautulli_match_progress["shows"] = None
        _tautulli_match_progress["movies"] = None


def _init_tautulli_match_progress(totals: dict[str, int]) -> None:
    now_ts = time.time()
    with _tautulli_match_progress_lock:
        for media_type in ("shows", "movies"):
            total = int(totals.get(media_type) or 0)
            if total <= 0:
                _tautulli_match_progress[media_type] = None
                continue
            _tautulli_match_progress[media_type] = {
                "total": total,
                "matched": 0,
                "unmatched": 0,
                "skipped": 0,
                "unavailable": 0,
                "pending": total,
                "processed": 0,
                "started_ts": now_ts,
                "updated_ts": now_ts,
            }


def _advance_tautulli_match_progress(media_type: str | None, status: str) -> None:
    if not media_type:
        return
    key = str(status or "").strip().lower()
    with _tautulli_match_progress_lock:
        progress = _tautulli_match_progress.get(media_type)
        if not progress:
            return
        if key not in {"matched", "unmatched", "skipped", "unavailable"}:
            key = "unavailable"
        progress[key] += 1
        progress["processed"] = progress.get("processed", 0) + 1
        progress["pending"] = max(progress["total"] - progress["processed"], 0)
        progress["updated_ts"] = time.time()


def _get_tautulli_match_progress(media_type: str) -> dict | None:
    with _tautulli_match_progress_lock:
        progress = _tautulli_match_progress.get(media_type)
        return dict(progress) if progress else None


def _summarize_match_counts(rows: list[dict]) -> dict:
    counts = {
        "total": len(rows),
        "matched": 0,
        "unmatched": 0,
        "skipped": 0,
        "unavailable": 0,
    }
    for row in rows:
        status = str(row.get("TautulliMatchStatus") or "").strip().lower()
        if status in counts:
            counts[status] += 1
    counted = counts["matched"] + counts["unmatched"] + counts["skipped"] + counts["unavailable"]
    counts["pending"] = max(counts["total"] - counted, 0)
    return counts


def _cache_file_info(path: str | None) -> dict:
    if not path:
        return {"ts": 0, "age_seconds": None}
    try:
        ts = os.path.getmtime(path)
    except OSError:
        ts = 0
    return {"ts": int(ts or 0), "age_seconds": _age_seconds(ts)}



def _get_basic_auth():
    cfg = _get_config()
    return cfg["basic_auth_user"], cfg["basic_auth_pass"]


def _auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user, passwd = _get_basic_auth()
        if not user and not passwd:
            return fn(*args, **kwargs)

        auth = request.authorization
        if auth and auth.username == user and auth.password == passwd:
            return fn(*args, **kwargs)

        return Response(
            "Unauthorized Access",
            401,
            {"WWW-Authenticate": 'Basic realm="Authentication Required"'},
        )

    return wrapper


def _arr_get(
    base_url: str,
    api_key: str,
    path: str,
    params: dict | None = None,
    timeout: int | float | None = None,
    session: requests.Session | None = None,
    app_name: str | None = None,
    circuit_breaker: bool = True,
    circuit_group: str | None = None,
):
    if not base_url:
        raise RuntimeError("Base URL is not set")
    if not api_key:
        raise RuntimeError("API key is not set")

    url = f"{base_url}{path}"
    headers = {"X-Api-Key": api_key}
    if isinstance(timeout, (int, float)):
        if timeout == 0:
            request_timeout = None
        elif timeout > 0:
            request_timeout = timeout
        else:
            request_timeout = 45
    else:
        request_timeout = _read_arr_timeout_seconds(app_name or "")
        if request_timeout == 0:
            request_timeout = None
        elif request_timeout < 0:
            request_timeout = 45
    http = session or _http
    circuit_key = _arr_circuit_key(app_name, base_url, circuit_group) if circuit_breaker else ""
    if circuit_breaker and _arr_circuit_is_open(circuit_key):
        raise RuntimeError(f"{(app_name or 'Arr').title()} temporarily unavailable (circuit open).")
    backoff_base = _read_float_env("ARR_BACKOFF_BASE_SECONDS", 0.5)
    max_retries = max(_read_int_env("ARR_BACKOFF_MAX_RETRIES", 2), 0)
    for attempt in range(max_retries + 1):
        try:
            r = http.get(url, headers=headers, params=params, timeout=request_timeout)
            status = r.status_code
            if status == 429 or status >= 500:
                raise requests.HTTPError(f"Arr request failed ({status})", response=r)
            r.raise_for_status()
            try:
                payload = r.json()
            except ValueError:
                body_len = len(r.text or "")
                logger.warning(
                    "Arr response JSON decode failed (app=%s status=%s url=%s body_len=%s).",
                    app_name or "unknown",
                    r.status_code,
                    _sanitize_url_for_log(url),
                    body_len,
                )
                raise
            if circuit_breaker:
                _arr_circuit_on_success(circuit_key)
            return payload
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            retriable = status == 429 or (status is not None and status >= 500)
            if retriable:
                if circuit_breaker:
                    _arr_circuit_on_failure(circuit_key)
                if attempt < max_retries and backoff_base > 0:
                    time.sleep(backoff_base * (2 ** attempt))
                    continue
            raise
        except requests.RequestException:
            if circuit_breaker:
                _arr_circuit_on_failure(circuit_key)
            if attempt < max_retries and backoff_base > 0:
                time.sleep(backoff_base * (2 ** attempt))
                continue
            raise


def _fetch_arr_tag_map(base_url: str, api_key: str, app_name: str) -> dict[int, str]:
    try:
        tags = _arr_get(base_url, api_key, "/api/v3/tag", app_name=app_name)
    except Exception as exc:
        logger.warning("%s tag fetch failed: %s", app_name.title(), exc)
        return {}
    tag_map = {}
    for tag in tags or []:
        tag_id = tag.get("id")
        label = (tag.get("label") or "").strip()
        if tag_id is None or not label:
            continue
        tag_map[int(tag_id)] = label
    return tag_map


def _fetch_arr_quality_profile_map(
    base_url: str,
    api_key: str,
    app_name: str,
) -> dict[int, str]:
    try:
        profiles = _arr_get(base_url, api_key, "/api/v3/qualityprofile", app_name=app_name)
    except Exception as exc:
        logger.warning("%s quality profile fetch failed: %s", app_name.title(), exc)
        return {}
    profile_map = {}
    for profile in profiles or []:
        profile_id = profile.get("id")
        name = (profile.get("name") or "").strip()
        if profile_id is None or not name:
            continue
        profile_map[int(profile_id)] = name
    return profile_map


def _format_tag_labels(tag_ids, tag_map: dict[int, str]) -> str:
    if not tag_ids:
        return ""
    labels = []
    for tag_id in tag_ids:
        if tag_id is None:
            continue
        try:
            key = int(tag_id)
        except (TypeError, ValueError):
            labels.append(str(tag_id))
            continue
        label = tag_map.get(key) or str(tag_id)
        labels.append(label)
    return ", ".join(labels)


def _format_genres(genres) -> str:
    if not genres:
        return ""
    values = []
    for item in genres:
        if item is None:
            continue
        text = str(item).strip()
        if text:
            values.append(text)
    if not values:
        return ""
    seen = set()
    ordered = []
    for val in values:
        if val in seen:
            continue
        seen.add(val)
        ordered.append(val)
    return ", ".join(ordered)


def _format_original_language(value) -> str:
    if not value:
        return ""
    if isinstance(value, dict):
        raw = value.get("name") or value.get("value") or value.get("id") or ""
    else:
        raw = value
    return str(raw).strip()


def _format_series_studio(series: dict) -> str:
    if not isinstance(series, dict):
        return ""
    raw = series.get("network") or series.get("studio") or series.get("networkName")
    if not raw:
        networks = series.get("networks")
        if isinstance(networks, (list, tuple)):
            names = []
            for item in networks:
                if not item:
                    continue
                if isinstance(item, dict):
                    val = item.get("name") or item.get("value") or item.get("id")
                else:
                    val = item
                text = str(val).strip()
                if text:
                    names.append(text)
            return ", ".join(names)
    if isinstance(raw, dict):
        raw = raw.get("name") or raw.get("value") or raw.get("id") or ""
    return str(raw).strip()


def _resolve_quality_profile_name(
    profile_name: str | None,
    profile_id,
    profile_map: dict[int, str],
) -> str:
    name = (profile_name or "").strip()
    if name:
        return name
    if profile_id is None:
        return ""
    try:
        profile_key = int(profile_id)
    except (TypeError, ValueError):
        return ""
    return profile_map.get(profile_key, "")


def _arr_post(
    base_url: str,
    api_key: str,
    path: str,
    payload: dict,
    timeout: int | float | None = None,
    session: requests.Session | None = None,
    app_name: str | None = None,
):
    if not base_url:
        raise RuntimeError("Base URL is not set")
    if not api_key:
        raise RuntimeError("API key is not set")

    url = f"{base_url}{path}"
    headers = {"X-Api-Key": api_key}
    if isinstance(timeout, (int, float)):
        if timeout == 0:
            request_timeout = None
        elif timeout > 0:
            request_timeout = timeout
        else:
            request_timeout = 45
    else:
        request_timeout = _read_arr_timeout_seconds(app_name or "")
        if request_timeout == 0:
            request_timeout = None
        elif request_timeout < 0:
            request_timeout = 45
    http = session or _http
    r = http.post(url, headers=headers, json=payload, timeout=request_timeout)
    r.raise_for_status()
    try:
        return r.json()
    except ValueError:
        body_len = len(r.text or "")
        logger.warning(
            "Arr response JSON decode failed (app=%s status=%s url=%s body_len=%s).",
            app_name or "unknown",
            r.status_code,
            _sanitize_url_for_log(url),
            body_len,
        )
        raise


def _arr_command_name(app_name: str) -> str:
    return "RefreshSeries" if app_name == "sonarr" else "RefreshMovie"


def _resolve_arr_instance(instances: list[dict], instance_id: str | None) -> dict | None:
    if not instances:
        return None
    if instance_id:
        for inst in instances:
            if str(inst.get("id") or "") == instance_id:
                return inst
        return None
    if len(instances) == 1:
        return instances[0]
    return None


def _parse_arr_item_id(value) -> int | None:
    if value is None:
        return None
    num = _safe_int(value)
    return num if num > 0 else None


def _arr_command_refresh_all(app_name: str, instances: list[dict]) -> dict:
    command = _arr_command_name(app_name)
    started = 0
    errors = []
    for inst in instances:
        try:
            _arr_post(
                inst.get("url") or "",
                inst.get("api_key") or "",
                "/api/v3/command",
                {"name": command},
                app_name=app_name,
            )
            started += 1
        except Exception as exc:
            errors.append(
                {
                    "instance_id": inst.get("id") or "",
                    "error": _arr_error_hint(app_name, exc),
                }
            )
    return {"started": started, "errors": errors}


def _arr_command_refresh_item(app_name: str, instance: dict, item_id: int) -> None:
    command = _arr_command_name(app_name)
    payload = {"name": command}
    if app_name == "sonarr":
        payload["seriesId"] = item_id
    else:
        payload["movieId"] = item_id
        payload["movieIds"] = [item_id]
    _arr_post(
        instance.get("url") or "",
        instance.get("api_key") or "",
        "/api/v3/command",
        payload,
        app_name=app_name,
    )


def _arr_error_hint(app_name: str, exc: Exception) -> str:
    label = "Sonarr" if app_name == "sonarr" else "Radarr" if app_name == "radarr" else "Arr"
    if isinstance(exc, RuntimeError):
        message = str(exc).strip()
        if message == "Base URL is not set":
            return f"{label} base URL is not set."
        if message == "API key is not set":
            return f"{label} API key is not set."
    if isinstance(exc, requests.HTTPError):
        status = exc.response.status_code if exc.response is not None else "error"
        return f"{label} request failed (HTTP {status})."
    if isinstance(exc, requests.Timeout):
        return f"{label} request timed out."
    if isinstance(exc, requests.ConnectionError):
        return f"{label} connection failed."
    if isinstance(exc, ValueError):
        return f"{label} returned invalid JSON."
    if isinstance(exc, requests.RequestException):
        return f"{label} request failed."
    return f"{label} request failed."


def _unwrap_history_records(payload) -> list:
    if isinstance(payload, dict):
        records = payload.get("records")
        if isinstance(records, list):
            return records
    if isinstance(payload, list):
        return payload
    return []


def _extract_history_size(data: dict) -> int:
    if not isinstance(data, dict):
        return 0
    for key in ("size", "sizebytes", "sizeBytes", "downloadSize"):
        if key in data:
            size_val = _safe_int(data.get(key))
            if size_val:
                return size_val
    return 0


def _extract_release_group(data: dict) -> str:
    if not isinstance(data, dict):
        return ""
    for key in ("releaseGroup", "releasegroup", "release_group"):
        val = str(data.get(key) or "").strip()
        if val:
            return val
    return ""


def _normalize_languages(langs) -> list[str]:
    out: list[str] = []
    if not isinstance(langs, list):
        return out
    for lang in langs:
        if isinstance(lang, dict):
            name = str(lang.get("name") or lang.get("Name") or "").strip()
            if name:
                out.append(name)
                continue
        text = str(lang or "").strip()
        if text:
            out.append(text)
    return out


def _normalize_history_event(item: dict, app_name: str, instance_id: str, include_raw: bool = False) -> dict:
    if not isinstance(item, dict):
        return {}
    quality = item.get("quality") or {}
    quality_meta = quality.get("quality") or {}
    revision = quality.get("revision") or {}
    data = item.get("data") or {}
    languages = _normalize_languages(item.get("languages"))
    date_raw = str(item.get("date") or "").strip()
    date_ts = _parse_iso_epoch(date_raw)
    custom_formats = []
    for cf in item.get("customFormats") or []:
        if isinstance(cf, dict):
            name = str(cf.get("name") or cf.get("label") or "").strip()
            if name:
                custom_formats.append(name)
                continue
        text = str(cf or "").strip()
        if text:
            custom_formats.append(text)
    release_group = _extract_release_group(data)
    size = _extract_history_size(data)
    event_type = str(item.get("eventType") or "").strip()
    normalized = {
        "app": app_name,
        "instanceId": instance_id,
        "date": date_raw,
        "date_ts": date_ts,
        "eventType": event_type,
        "sourceTitle": item.get("sourceTitle") or "",
        "qualityName": quality_meta.get("name") or "",
        "qualityResolution": _safe_int(quality_meta.get("resolution")),
        "qualitySource": quality_meta.get("source") or "",
        "revision": {
            "version": _safe_int(revision.get("version")),
            "real": _safe_int(revision.get("real")),
            "isRepack": bool(revision.get("isRepack")),
        },
        "customFormats": custom_formats,
        "customFormatScore": _safe_int(item.get("customFormatScore")),
        "qualityCutoffNotMet": bool(item.get("qualityCutoffNotMet")),
        "languages": languages,
        "size": size,
        "releaseGroup": release_group,
        "downloadId": item.get("downloadId") or "",
        "data": data if include_raw else None,
        "seriesId": item.get("seriesId") if app_name == "sonarr" else None,
        "episodeId": item.get("episodeId") if app_name == "sonarr" else None,
        "movieId": item.get("movieId") if app_name == "radarr" else None,
    }
    return normalized


def _select_history_latest(events: list[dict], app_name: str) -> tuple[dict | None, dict | None]:
    if not events:
        return None, None
    success_events = {
        "sonarr": {"seriesFolderImported", "downloadFolderImported", "episodeFileRenamed"},
        "radarr": {"downloadFolderImported", "movieFolderImported", "movieFileRenamed"},
    }
    selected = []
    allowed = success_events.get(app_name, set())
    for ev in events:
        if not isinstance(ev, dict):
            continue
        etype = str(ev.get("eventType") or "").strip()
        if etype in allowed:
            selected.append(ev)
    if not selected:
        return None, None
    selected.sort(key=lambda e: _safe_int(e.get("date_ts")), reverse=True)
    latest = selected[0] if selected else None
    previous = selected[1] if len(selected) > 1 else None
    return latest, previous


def _fetch_arr_history(
    app_name: str,
    instance: dict,
    series_id: int | None = None,
    episode_id: int | None = None,
    movie_id: int | None = None,
    include_raw: bool = False,
) -> dict:
    base_url = instance.get("url") or ""
    api_key = instance.get("api_key") or ""
    instance_id = instance.get("id") or ""
    params = {"pageSize": 250, "page": 1}
    if app_name == "sonarr":
        if not series_id:
            raise RuntimeError("seriesId is required.")
        params.update({"seriesId": int(series_id), "includeEpisode": True, "includeSeries": False})
        payload = _arr_get(
            base_url,
            api_key,
            "/api/v3/history/series",
            params=params,
            app_name=app_name,
            circuit_group="history",
        )
    else:
        if not movie_id:
            raise RuntimeError("movieId is required.")
        params.update({"movieId": int(movie_id), "includeMovie": False})
        payload = _arr_get(
            base_url,
            api_key,
            "/api/v3/history/movie",
            params=params,
            app_name=app_name,
            circuit_group="history",
        )

    records = _unwrap_history_records(payload)
    normalized: list[dict] = []
    for item in records:
        norm = _normalize_history_event(item, app_name, instance_id, include_raw)
        if app_name == "sonarr" and episode_id:
            if _safe_int(norm.get("episodeId")) != _safe_int(episode_id):
                continue
        normalized.append(norm)

    normalized.sort(key=lambda e: _safe_int(e.get("date_ts")), reverse=True)
    history_start_ts = min(
        (_safe_int(e.get("date_ts")) for e in normalized if _safe_int(e.get("date_ts")) > 0),
        default=0,
    )
    latest, previous = _select_history_latest(normalized, app_name)
    response = {
        "app": app_name,
        "instance_id": instance_id,
        "latest": latest,
        "previous": previous,
        "all": normalized,
        "historyStart": _iso_from_epoch(history_start_ts) if history_start_ts else "",
    }
    return response


def _arr_test_connection(base_url: str, api_key: str, timeout: int = 10) -> str | None:
    try:
        _arr_get(base_url, api_key, "/api/v3/system/status", timeout=timeout)
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "error"
        return f"Connection failed (HTTP {status})."
    except Exception as exc:
        logger.warning("Arr connection test failed (%s).", type(exc).__name__)
        return "Connection failed. Check URL and API key."
    return None


def _tautulli_test_connection(base_url: str, api_key: str, timeout: int = 10) -> str | None:
    try:
        _tautulli_get(base_url, api_key, "get_server_info", timeout=timeout)
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "error"
        return f"Connection failed (HTTP {status})."
    except Exception as exc:
        logger.warning("Tautulli connection test failed (%s).", type(exc).__name__)
        return "Connection failed. Check URL and API key."
    return None


def _group_by(items: list[dict], key: str) -> dict:
    grouped = {}
    for item in items or []:
        item_key = item.get(key)
        if item_key is None:
            continue
        grouped.setdefault(item_key, []).append(item)
    return grouped


def _safe_int(value) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _safe_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _clone_rows(rows) -> list[dict]:
    if not isinstance(rows, list):
        return []
    return [dict(row) for row in rows]


def _normalize_epoch(value) -> int:
    ts = _safe_int(value)
    if ts <= 0:
        return 0
    if ts > 10_000_000_000:
        ts = int(ts / 1000)
    return ts


def _parse_iso_epoch(value) -> int:
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return _normalize_epoch(value)
    text = str(value).strip()
    if not text:
        return 0
    if text.isdigit():
        return _normalize_epoch(text)
    cleaned = text.replace("Z", "+00:00")
    if " " in cleaned and "T" not in cleaned:
        cleaned = cleaned.replace(" ", "T", 1)
    try:
        dt = datetime.datetime.fromisoformat(cleaned)
    except ValueError:
        return 0
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return int(dt.timestamp())


def _iso_from_epoch(ts: int) -> str:
    if not ts:
        return ""
    dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _normalize_title_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def _collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _strip_parentheticals(value: str) -> str:
    return _collapse_whitespace(re.sub(r"\([^)]*\)", " ", str(value or "")))


def _strip_trailing_parenthetical(value: str) -> str:
    s = str(value or "")
    if not s:
        return ""
    s = s.rstrip()
    if not s or s[-1] != ")":
        return s
    last_open = s.rfind("(")
    if last_open == -1:
        return s
    last_close_before_end = s.rfind(")", 0, len(s) - 1)
    if last_close_before_end > last_open:
        return s
    return s[:last_open].rstrip()


def _relaxed_title(value: str) -> str:
    cleaned = _collapse_whitespace(str(value or ""))
    if not cleaned:
        return ""
    while True:
        relaxed = _strip_trailing_parenthetical(cleaned)
        if relaxed == cleaned:
            return cleaned
        cleaned = relaxed


def _relaxed_title_key(value: str) -> str:
    return _normalize_title_key(_relaxed_title(value))


def _title_variants(value: str) -> list[str]:
    base = _collapse_whitespace(value)
    if not base:
        return []

    variants: list[str] = []
    seen = set()

    def add(item: str) -> None:
        cleaned = _collapse_whitespace(item)
        if not cleaned or cleaned in seen:
            return
        seen.add(cleaned)
        variants.append(cleaned)

    add(base)
    add(_strip_parentheticals(base))

    for item in list(variants):
        add(re.sub(r"\s*&\s*", " and ", item))

    for item in list(variants):
        add(re.sub(r"\b3d\b", "", item, flags=re.IGNORECASE))

    for item in list(variants):
        if ":" in item:
            left, right = item.split(":", 1)
            add(left)
            add(right)
        dash_parts = re.split(r"\s[-\u2013\u2014]\s", item, maxsplit=1)
        if len(dash_parts) == 2:
            add(dash_parts[0])
            add(dash_parts[1])

    for item in list(variants):
        add(re.sub(r"^[^:]+?'s\s+", "", item))

    return variants


def _title_variant_keys(value: str) -> list[str]:
    base_key = _normalize_title_key(value)
    relaxed_key = _relaxed_title_key(value)
    keys: list[str] = []
    seen = set()
    for variant in _title_variants(value):
        key = _normalize_title_key(variant)
        if not key or key in (base_key, relaxed_key) or key in seen:
            continue
        seen.add(key)
        keys.append(key)
    return keys


def _strict_title_year_key(title: str, year: str):
    title_key = _normalize_title_key(title)
    year_value = str(year or "").strip()
    if not title_key or not year_value:
        return None
    return (title_key, year_value)


def _build_strict_title_year_id_map(
    items: list[dict],
    media_type: str,
    metadata_lookup=None,
) -> dict:
    candidates: dict[tuple[str, str], dict[str, set]] = {}
    for item in items or []:
        item_type = str(item.get("media_type") or "").lower()
        if media_type == "show":
            if item_type and item_type not in ("show", "episode"):
                continue
        elif item_type and item_type != "movie":
            continue

        ids = _tautulli_extract_ids(item)
        if not ids and metadata_lookup:
            ids = metadata_lookup(_tautulli_metadata_key(item, item_type, media_type))
        if not ids:
            continue

        if media_type == "show":
            title_candidates = _tautulli_title_candidates(
                item.get("grandparent_title") or item.get("title"),
                item.get("grandparent_original_title"),
                item.get("grandparent_originalTitle"),
                item.get("original_title"),
                item.get("originalTitle"),
            )
            year = str(item.get("grandparent_year") or item.get("year") or "").strip()
        else:
            title_candidates = _tautulli_title_candidates(
                item.get("title"),
                item.get("original_title"),
                item.get("originalTitle"),
            )
            year = str(item.get("year") or "").strip()

        for title in title_candidates:
            key = _strict_title_year_key(title, year)
            if not key:
                continue
            entry = candidates.get(key)
            if entry is None:
                entry = {"tmdb": set(), "tvdb": set(), "imdb": set()}
                candidates[key] = entry
            for id_key in ("tmdb", "tvdb", "imdb"):
                if id_key in ids:
                    entry[id_key].add(str(ids[id_key]))

    strict_map = {}
    for key, entry in candidates.items():
        if any(len(values) > 1 for values in entry.values()):
            continue
        ids = {id_key: next(iter(values)) for id_key, values in entry.items() if len(values) == 1}
        if ids:
            strict_map[key] = ids
    return strict_map


TAUTULLI_METADATA_CACHE_VERSION = 1
JELLYSTAT_CACHE_VERSION = 1
ARR_CACHE_VERSION = 1


def _default_tautulli_metadata_cache_path() -> str:
    base_dir = os.path.dirname(ENV_FILE_PATH)
    return os.path.join(base_dir, "Sortarr.tautulli_cache.json")


def _default_jellystat_cache_path() -> str:
    base_dir = os.path.dirname(ENV_FILE_PATH)
    return os.path.join(base_dir, "Sortarr.jellystat_cache.json")


def _default_arr_cache_path(app_name: str) -> str:
    base_dir = os.path.dirname(ENV_FILE_PATH)
    suffix = "sonarr" if app_name == "sonarr" else "radarr"
    return os.path.join(base_dir, f"Sortarr.{suffix}_cache.json")


def _load_tautulli_metadata_cache(path: str) -> dict[str, dict]:
    if not path or not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}

    if isinstance(payload, dict) and "items" in payload:
        items = payload.get("items")
    else:
        items = payload

    if not isinstance(items, dict):
        return {}

    cache: dict[str, dict] = {}
    for key, value in items.items():
        if not isinstance(value, dict):
            cache[str(key)] = {}
            continue
        ids = {
            k: str(v)
            for k, v in value.items()
            if k in ("tvdb", "tmdb", "imdb") and v not in (None, "")
        }
        cache[str(key)] = ids
    return cache


def _save_tautulli_metadata_cache(path: str, cache: dict[str, dict]) -> None:
    if not path:
        return
    payload = {
        "version": TAUTULLI_METADATA_CACHE_VERSION,
        "items": cache,
    }
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)
        os.replace(tmp_path, path)
    except OSError:
        logger.warning("Failed to write Tautulli metadata cache (path redacted).")


def _load_jellystat_cache(path: str) -> dict | None:
    if not path or not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None

    if isinstance(payload, dict) and isinstance(payload.get("index"), dict):
        index = payload.get("index")
        ts = _safe_int(payload.get("ts"))
        meta = index.get("meta") if isinstance(index, dict) else None
        if not isinstance(meta, dict):
            meta = {}
        history_ts = _safe_int(payload.get("history_ts"))
        if history_ts and "history_ts" not in meta:
            meta["history_ts"] = history_ts
        if meta:
            index = dict(index)
            index["meta"] = meta
        return {"index": index, "ts": ts}

    if isinstance(payload, dict):
        return {"index": payload, "ts": 0}
    return None


def _save_jellystat_cache(path: str, index: dict, ts: float | int) -> None:
    if not path:
        return
    payload = {
        "version": JELLYSTAT_CACHE_VERSION,
        "ts": _safe_int(ts),
        "index": index,
    }
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)
        os.replace(tmp_path, path)
    except OSError:
        logger.warning("Failed to write Jellystat cache (path redacted).")


def _load_arr_cache(path: str) -> dict[str, dict]:
    if not path or not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}

    if isinstance(payload, dict) and "instances" in payload:
        items = payload.get("instances")
    else:
        items = payload

    if not isinstance(items, dict):
        return {}

    cache: dict[str, dict] = {}
    for key, entry in items.items():
        if not isinstance(entry, dict):
            continue
        data = entry.get("data")
        if not isinstance(data, list):
            continue
        cache[str(key)] = {
            "ts": _safe_int(entry.get("ts")),
            "tautulli_index_ts": _safe_int(entry.get("tautulli_index_ts")),
            "data": data,
        }
    return cache


def _clone_arr_cache(cache: dict[str, dict]) -> dict[str, dict]:
    if not isinstance(cache, dict):
        return {}
    snapshot: dict[str, dict] = {}
    for key, entry in cache.items():
        if not isinstance(entry, dict):
            continue
        data = entry.get("data")
        snapshot[str(key)] = {
            "ts": _safe_int(entry.get("ts")),
            "tautulli_index_ts": _safe_int(entry.get("tautulli_index_ts")),
            "data": _clone_rows(data if isinstance(data, list) else []),
        }
    return snapshot


def _save_arr_cache(path: str, cache: dict[str, dict]) -> None:
    if not path:
        return
    payload = {
        "version": ARR_CACHE_VERSION,
        "instances": cache,
    }
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)
        os.replace(tmp_path, path)
    except OSError:
        logger.warning("Failed to write Arr cache (path redacted).")


def _queue_arr_cache_save(
    app_name: str,
    cache_path: str | None,
    disk_cache: dict[str, dict],
    reason: str,
) -> bool:
    if not cache_path:
        return False
    state = _arr_cache_save_state.get(app_name)
    if not state:
        return False
    snapshot = _clone_arr_cache(disk_cache)
    payload = {"path": cache_path, "cache": snapshot, "reason": reason}
    with state["lock"]:
        if state.get("in_progress"):
            state["pending"] = payload
            return False
        state["in_progress"] = True

    def worker(initial):
        payload = initial
        while payload:
            start = time.perf_counter()
            try:
                _save_arr_cache(payload["path"], payload["cache"])
                elapsed = time.perf_counter() - start
                logger.info(
                    "%s cache write completed in %.2fs (context=%s, instances=%s).",
                    app_name.title(),
                    elapsed,
                    payload.get("reason") or "unknown",
                    len(payload.get("cache") or {}),
                )
            except Exception as exc:
                logger.warning(
                    "%s cache write failed (context=%s): %s",
                    app_name.title(),
                    payload.get("reason") or "unknown",
                    exc,
                )
            with state["lock"]:
                pending = state.get("pending")
                if pending:
                    payload = pending
                    state["pending"] = None
                else:
                    state["in_progress"] = False
                    payload = None

    thread = threading.Thread(
        target=worker,
        args=(payload,),
        name=f"sortarr-{app_name}-cache-save",
        daemon=True,
    )
    thread.start()
    return True


def _check_deadline(deadline: float | None, label: str):
    if deadline is not None and time.time() >= deadline:
        raise TimeoutError(f"{label} exceeded time budget")


def _tautulli_get(
    base_url: str,
    api_key: str,
    cmd: str,
    params: dict | None = None,
    timeout: int | float | None = None,
    session: requests.Session | None = None,
):
    if not base_url:
        raise RuntimeError("Tautulli base URL is not set")
    if not api_key:
        raise RuntimeError("Tautulli API key is not set")

    url = f"{base_url}/api/v2"
    query = {"apikey": api_key, "cmd": cmd}
    if params:
        query.update(params)

    request_timeout = timeout if isinstance(timeout, (int, float)) and timeout > 0 else 45
    http = session or _http
    r = http.get(url, params=query, timeout=request_timeout)
    r.raise_for_status()
    payload = r.json()
    response = payload.get("response", {})
    if response.get("result") != "success":
        message = response.get("message") or "Tautulli request failed"
        raise RuntimeError(message)
    return response.get("data")


def _jellystat_request(
    base_url: str,
    api_key: str,
    path: str,
    params: dict | None = None,
    payload: dict | None = None,
    timeout: int | float | None = None,
    session: requests.Session | None = None,
    method: str = "GET",
):
    if not base_url:
        raise RuntimeError("Jellystat base URL is not set")
    if not api_key:
        raise RuntimeError("Jellystat API key is not set")

    route = path if path.startswith("/") else f"/{path}"
    url = f"{base_url.rstrip('/')}{route}"
    request_timeout = timeout if isinstance(timeout, (int, float)) and timeout > 0 else 45
    http = session or _http
    headers = {"x-api-token": api_key}
    if method == "POST":
        r = http.post(url, params=params, json=payload or {}, headers=headers, timeout=request_timeout)
    else:
        r = http.get(url, params=params, headers=headers, timeout=request_timeout)
    r.raise_for_status()
    try:
        data = r.json()
    except ValueError as exc:
        raise RuntimeError("Jellystat response was not JSON") from exc
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(data.get("error") or "Jellystat request failed")
    return data


def _jellystat_get(
    base_url: str,
    api_key: str,
    path: str,
    params: dict | None = None,
    timeout: int | float | None = None,
    session: requests.Session | None = None,
):
    return _jellystat_request(
        base_url,
        api_key,
        path,
        params=params,
        timeout=timeout,
        session=session,
        method="GET",
    )


def _jellystat_post(
    base_url: str,
    api_key: str,
    path: str,
    payload: dict | None = None,
    params: dict | None = None,
    timeout: int | float | None = None,
    session: requests.Session | None = None,
):
    return _jellystat_request(
        base_url,
        api_key,
        path,
        params=params,
        payload=payload,
        timeout=timeout,
        session=session,
        method="POST",
    )


def _jellystat_test_connection(base_url: str, api_key: str, timeout: int = 10) -> str | None:
    try:
        _jellystat_get(base_url, api_key, "/api/getLibraries", timeout=timeout)
        return None
    except (RuntimeError, requests.RequestException, ValueError) as exc:
        return str(exc)


def _tautulli_metadata_ids_uncached(
    base_url: str,
    api_key: str,
    rating_key,
    timeout: int | float | None = None,
    session: requests.Session | None = None,
) -> dict:
    key = str(rating_key or "").strip()
    if not key:
        return {}
    try:
        data = _tautulli_get(
            base_url,
            api_key,
            "get_metadata",
            params={"rating_key": key},
            timeout=timeout,
            session=session,
        )
    except (RuntimeError, requests.RequestException, ValueError) as exc:
        logger.warning("Tautulli get_metadata failed for rating_key=<redacted>: %s", exc)
        return {}

    if isinstance(data, dict) and "metadata" in data:
        metadata = data.get("metadata") or {}
    else:
        metadata = data or {}

    return _tautulli_extract_ids(metadata)


def _tautulli_metadata_ids(
    base_url: str,
    api_key: str,
    rating_key,
    cache: dict[str, dict],
    timeout: int | float | None = None,
    session: requests.Session | None = None,
) -> dict:
    key = str(rating_key or "").strip()
    if not key:
        return {}
    if key in cache:
        return cache[key]
    ids = _tautulli_metadata_ids_uncached(
        base_url,
        api_key,
        key,
        timeout=timeout,
        session=session,
    )
    cache[key] = ids
    return ids


def _tautulli_metadata_key(item: dict, item_type: str, media_type: str):
    if media_type == "show":
        return item.get("grandparent_rating_key") or item.get("rating_key")
    return item.get("rating_key")


def _tautulli_extract_ids(item: dict) -> dict:
    ids = {}

    def handle_guid(value: str):
        if not value:
            return
        text = str(value)
        tmdb_match = re.search(
            r"(?:tmdb|themoviedb)://(\d+)|com\.plexapp\.agents\.themoviedb://(\d+)",
            text,
        )
        tvdb_match = re.search(
            r"(?:tvdb|thetvdb)://(\d+)|com\.plexapp\.agents\.thetvdb://(\d+)",
            text,
        )
        imdb_match = re.search(
            r"imdb://(tt\d+)|com\.plexapp\.agents\.imdb://(tt\d+)",
            text,
        )
        if tmdb_match and "tmdb" not in ids:
            ids["tmdb"] = next(group for group in tmdb_match.groups() if group)
        if tvdb_match and "tvdb" not in ids:
            ids["tvdb"] = next(group for group in tvdb_match.groups() if group)
        if imdb_match and "imdb" not in ids:
            ids["imdb"] = next(group for group in imdb_match.groups() if group)

    for key, kind in [
        ("tmdb_id", "tmdb"),
        ("tvdb_id", "tvdb"),
        ("imdb_id", "imdb"),
    ]:
        raw = item.get(key)
        if raw:
            ids[kind] = str(raw)

    for key in [
        "guid",
        "guids",
        "external_id",
        "external_ids",
        "grandparent_guid",
        "grandparent_guids",
        "grandparent_external_id",
        "grandparent_external_ids",
        "parent_guid",
        "parent_guids",
    ]:
        raw = item.get(key)
        if isinstance(raw, list):
            for entry in raw:
                if isinstance(entry, dict):
                    handle_guid(entry.get("id") or entry.get("guid") or entry.get("external_id"))
                else:
                    handle_guid(entry)
        elif isinstance(raw, dict):
            handle_guid(raw.get("id") or raw.get("guid") or raw.get("external_id"))
        else:
            handle_guid(raw)

    return ids


def _normalize_duration_seconds(value) -> int:
    seconds = _safe_int(value)
    if seconds <= 0:
        return 0
    if seconds > 100_000:
        seconds = int(seconds / 1000)
    return seconds


def _tautulli_pick_rating_key(item: dict) -> str:
    for key in ("grandparent_rating_key", "parent_rating_key", "rating_key"):
        value = item.get(key)
        if value:
            return str(value)
    return ""


def _tautulli_pick_section_id(item: dict) -> str:
    value = item.get("section_id")
    return str(value) if value else ""


def _tautulli_raw_stats_from_item(item: dict) -> dict:
    play_count = _safe_int(
        item.get("play_count")
        or item.get("view_count")
        or item.get("views")
        or item.get("plays")
        or item.get("total_plays")
    )
    users_watched = _safe_int(
        item.get("users_watched")
        or item.get("user_count")
        or item.get("users")
        or item.get("users_count")
        or item.get("unique_users")
    )
    last_played = _normalize_epoch(
        item.get("last_played")
        or item.get("last_played_at")
        or item.get("last_played_date")
        or item.get("last_viewed_at")
        or item.get("last_viewed")
        or item.get("last_watched")
        or item.get("last_watched_at")
    )
    duration = _normalize_duration_seconds(item.get("duration") or item.get("media_duration"))
    total_source = ""
    total_duration = _normalize_duration_seconds(
        item.get("total_duration")
        or item.get("total_time")
        or item.get("watch_time")
        or item.get("total_watch_time")
        or item.get("total_viewed_time")
    )
    if total_duration > 0:
        total_source = "api_total"
    if total_duration <= 0:
        total_duration = _normalize_duration_seconds(
            item.get("total_duration_ms")
            or item.get("total_time_ms")
            or item.get("watch_time_ms")
            or item.get("total_watch_time_ms")
        )
        if total_duration > 0:
            total_source = "api_total_ms"
    if total_duration <= 0 and duration and play_count:
        total_duration = duration * play_count
        total_source = "duration_x_play_count"

    rating_key = _tautulli_pick_rating_key(item)
    section_id = _tautulli_pick_section_id(item)

    return {
        "play_count": play_count,
        "users_watched": users_watched,
        "last_epoch": last_played,
        "total_seconds": total_duration,
        "duration_seconds": duration,
        "total_seconds_source": total_source,
        "rating_key": rating_key,
        "section_id": section_id,
    }


def _tautulli_finalize_stats(raw: dict, now_ts: float) -> dict:
    play_count = _safe_int(raw.get("play_count"))
    user_ids = raw.get("user_ids") or []
    users_watched = len(set(user_ids)) if user_ids else _safe_int(raw.get("users_watched"))
    last_epoch = _safe_int(raw.get("last_epoch"))
    total_seconds = _safe_int(raw.get("total_seconds"))

    total_hours = round(total_seconds / 3600.0, 2) if total_seconds else 0.0
    last_watched = _iso_from_epoch(last_epoch)
    days_since = ""
    if last_epoch:
        days_since = int((now_ts - last_epoch) / 86400)
        if days_since < 0:
            days_since = 0

    return {
        "PlayCount": play_count,
        "LastWatched": last_watched,
        "DaysSinceWatched": days_since,
        "TotalWatchTimeHours": total_hours,
        "UsersWatched": users_watched,
    }


def _tautulli_merge_raw(target: dict, raw: dict):
    target["play_count"] = _safe_int(target.get("play_count")) + _safe_int(raw.get("play_count"))
    target["users_watched"] = max(_safe_int(target.get("users_watched")), _safe_int(raw.get("users_watched")))
    target["total_seconds"] = _safe_int(target.get("total_seconds")) + _safe_int(raw.get("total_seconds"))
    target["last_epoch"] = max(_safe_int(target.get("last_epoch")), _safe_int(raw.get("last_epoch")))

    target_source = target.get("total_seconds_source") or ""
    raw_source = raw.get("total_seconds_source") or ""
    if not target_source:
        target["total_seconds_source"] = raw_source
    elif raw_source and raw_source != target_source and target_source != "mixed":
        target["total_seconds_source"] = "mixed"

    target_ids = set(target.get("user_ids") or [])
    raw_ids = set(raw.get("user_ids") or [])
    if raw_ids:
        target_ids.update(raw_ids)
        target["user_ids"] = target_ids

    if raw.get("rating_key") and not target.get("rating_key"):
        target["rating_key"] = raw.get("rating_key")
    if raw.get("section_id") and not target.get("section_id"):
        target["section_id"] = raw.get("section_id")


def _tautulli_apply_history(target: dict, raw: dict):
    raw_total = _safe_int(raw.get("total_seconds"))
    if raw_total:
        target["total_seconds"] = raw_total
        target["total_seconds_source"] = "history_total"
    raw_ids = set(raw.get("user_ids") or [])
    if raw_ids:
        target_ids = set(target.get("user_ids") or [])
        target_ids.update(raw_ids)
        target["user_ids"] = target_ids
    if _safe_int(raw.get("last_epoch")):
        target["last_epoch"] = max(_safe_int(target.get("last_epoch")), _safe_int(raw.get("last_epoch")))
    if _safe_int(raw.get("play_count")) and not _safe_int(target.get("play_count")):
        target["play_count"] = _safe_int(raw.get("play_count"))


def _tautulli_raw_history_stats_from_item(item: dict) -> dict:
    duration = _normalize_duration_seconds(
        item.get("watched_duration")
        or item.get("duration")
        or item.get("view_offset")
        or item.get("view_offset_ms")
        or item.get("playback_duration")
    )
    played_at = _normalize_epoch(
        item.get("date")
        or item.get("started")
        or item.get("played_at")
        or item.get("time")
        or item.get("last_played")
    )
    user_id = item.get("user_id") or item.get("user") or item.get("user_name")
    return {
        "play_count": 1,
        "users_watched": 0,
        "total_seconds": duration,
        "last_epoch": played_at,
        "user_ids": [str(user_id)] if user_id else [],
        "total_seconds_source": "history_total",
    }


def _jellystat_item_year(item: dict) -> str:
    year = str(item.get("ProductionYear") or "").strip()
    if year and year.isdigit():
        return year
    date_value = item.get("PremiereDate") or item.get("DateCreated") or ""
    date_text = str(date_value or "").strip()
    if len(date_text) >= 4 and date_text[:4].isdigit():
        return date_text[:4]
    return ""


def _jellystat_raw_stats_from_item(item: dict) -> dict:
    play_count = _safe_int(
        item.get("times_played")
        or item.get("TimesPlayed")
        or item.get("play_count")
        or item.get("plays")
    )
    total_seconds = _normalize_duration_seconds(
        item.get("total_play_time")
        or item.get("TotalPlayTime")
        or item.get("total_seconds")
        or item.get("total_duration")
    )
    total_source = "stats_total" if total_seconds > 0 else ""
    return {
        "play_count": play_count,
        "users_watched": 0,
        "last_epoch": 0,
        "total_seconds": total_seconds,
        "duration_seconds": 0,
        "total_seconds_source": total_source,
    }


def _jellystat_raw_history_stats_from_item(item: dict) -> dict:
    play_count = _safe_int(item.get("TotalPlays") or item.get("total_plays") or item.get("plays"))
    if play_count <= 0:
        play_count = 1
    duration = _normalize_duration_seconds(
        item.get("TotalDuration")
        or item.get("PlaybackDuration")
        or item.get("playback_duration")
    )
    played_at = _parse_iso_epoch(item.get("ActivityDateInserted") or item.get("played_at"))
    user_id = item.get("UserId") or item.get("user_id") or item.get("UserName")
    return {
        "play_count": play_count,
        "users_watched": 0,
        "total_seconds": duration,
        "last_epoch": played_at,
        "user_ids": [str(user_id)] if user_id else [],
        "total_seconds_source": "history_total",
    }


def _jellystat_build_id_map(items: list[dict]) -> dict[str, dict]:
    id_map: dict[str, dict] = {}
    for item in items or []:
        item_id = str(item.get("Id") or "").strip()
        if not item_id:
            continue
        item_type = str(item.get("Type") or "").strip().lower()
        if item_type in ("series", "show"):
            media_type = "show"
        elif item_type == "movie":
            media_type = "movie"
        else:
            continue
        title = item.get("Name") or ""
        year = _jellystat_item_year(item)
        id_map[item_id] = {"title": title, "year": year, "media_type": media_type}
    return id_map


def _jellystat_build_index(items: list[dict], media_type: str) -> dict:
    index = {
        "tvdb": {},
        "tmdb": {},
        "imdb": {},
        "title_year": {},
        "title": {},
        "title_year_relaxed": {},
        "title_relaxed": {},
        "title_year_variant": {},
        "title_variant": {},
    }
    title_key_cache: dict[str, tuple[str, str, list[str]]] = {}
    for item in items or []:
        item_type = str(item.get("Type") or "").strip().lower()
        if media_type == "show" and item_type not in ("series", "show"):
            continue
        if media_type == "movie" and item_type != "movie":
            continue
        raw = _jellystat_raw_stats_from_item(item)
        title_candidates = _tautulli_title_candidates(item.get("Name"))
        year = _jellystat_item_year(item)
        seen = set()
        for title in title_candidates:
            _merge_title_keys_cached(index, raw, title, year, title_key_cache, seen)
    return index


def _jellystat_build_history_index(
    items: list[dict],
    media_type: str,
    id_map: dict[str, dict],
) -> dict:
    index = {
        "tvdb": {},
        "tmdb": {},
        "imdb": {},
        "title_year": {},
        "title": {},
        "title_year_relaxed": {},
        "title_relaxed": {},
        "title_year_variant": {},
        "title_variant": {},
    }
    title_key_cache: dict[str, tuple[str, str, list[str]]] = {}
    for item in items or []:
        item_id = str(item.get("NowPlayingItemId") or "").strip()
        if not item_id:
            continue
        meta = id_map.get(item_id)
        if not meta:
            continue
        if meta.get("media_type") != media_type:
            continue
        raw = _jellystat_raw_history_stats_from_item(item)
        title = meta.get("title") or ""
        year = str(meta.get("year") or "").strip()
        seen = set()
        _merge_title_keys_cached(index, raw, title, year, title_key_cache, seen)
    return index


def _tautulli_fetch_library_items(
    base_url: str,
    api_key: str,
    section_id: str | int,
    timeout: int | float | None = None,
    deadline: float | None = None,
    progress=None,
) -> list[dict]:
    items = []
    start = 0
    length = 500
    include_guids = True
    while True:
        _check_deadline(deadline, "Tautulli fetch")
        params = {"section_id": section_id, "start": start, "length": length}
        if include_guids:
            params["include_guids"] = 1
            params["include_external_ids"] = 1
        try:
            data = _tautulli_get(
                base_url,
                api_key,
                "get_library_media_info",
                params=params,
                timeout=timeout,
            )
        except RuntimeError as exc:
            if not include_guids:
                raise
            logger.warning(
                "Tautulli get_library_media_info failed with GUID params; retrying without GUIDs: %s",
                exc,
            )
            include_guids = False
            _check_deadline(deadline, "Tautulli fetch")
            data = _tautulli_get(
                base_url,
                api_key,
                "get_library_media_info",
                params={"section_id": section_id, "start": start, "length": length},
                timeout=timeout,
            )
        if isinstance(data, dict) and "data" in data:
            chunk = data.get("data") or []
            total = _safe_int(data.get("recordsTotal") or data.get("recordsFiltered") or len(chunk))
        elif isinstance(data, list):
            chunk = data
            total = len(chunk)
        else:
            break

        items.extend(chunk)
        if progress and chunk:
            progress()
        if not chunk or len(items) >= total:
            break
        start += length

    return items


def _tautulli_fetch_history(
    base_url: str,
    api_key: str,
    timeout: int | float | None = None,
    deadline: float | None = None,
    progress=None,
) -> list[dict]:
    items = []
    start = 0
    length = 500
    while True:
        _check_deadline(deadline, "Tautulli fetch")
        data = _tautulli_get(
            base_url,
            api_key,
            "get_history",
            params={"start": start, "length": length},
            timeout=timeout,
        )
        if isinstance(data, dict) and "data" in data:
            chunk = data.get("data") or []
            total = _safe_int(data.get("recordsTotal") or data.get("recordsFiltered") or len(chunk))
        elif isinstance(data, list):
            chunk = data
            total = len(chunk)
        else:
            break

        items.extend(chunk)
        if progress and chunk:
            progress()
        if not chunk or len(items) >= total:
            break
        start += length

    return items


def _jellystat_fetch_libraries(
    base_url: str,
    api_key: str,
    timeout: int | float | None = None,
) -> list[dict]:
    data = _jellystat_get(base_url, api_key, "/api/getLibraries", timeout=timeout)
    return data if isinstance(data, list) else []


def _jellystat_library_ids_for_media(cfg: dict, libraries: list[dict], media_type: str) -> list[str]:
    if media_type == "show":
        raw = cfg.get("jellystat_library_ids_sonarr") or ""
        allowed_types = {"tvshows", "tvshow", "series", "show"}
    else:
        raw = cfg.get("jellystat_library_ids_radarr") or ""
        allowed_types = {"movies", "movie"}

    override = _split_csv_values(raw)
    if override:
        return override

    ids: list[str] = []
    for lib in libraries or []:
        if lib.get("archived") is True:
            continue
        lib_id = str(lib.get("Id") or "").strip()
        if not lib_id:
            continue
        collection = str(lib.get("CollectionType") or lib.get("Type") or "").strip().lower()
        if collection in allowed_types:
            ids.append(lib_id)
    return ids


def _jellystat_fetch_library_items(
    base_url: str,
    api_key: str,
    library_id: str,
    page_size: int,
    timeout: int | float | None = None,
) -> list[dict]:
    items: list[dict] = []
    page = 1
    pages = 1
    size = max(_safe_int(page_size), 1)
    while page <= pages:
        data = _jellystat_post(
            base_url,
            api_key,
            "/stats/getLibraryItemsWithStats",
            payload={"libraryid": library_id},
            params={"size": size, "page": page},
            timeout=timeout,
        )
        if not isinstance(data, dict):
            break
        chunk = data.get("results") or []
        if isinstance(chunk, list):
            items.extend(chunk)
        pages = max(_safe_int(data.get("pages")), page)
        if not chunk or page >= pages:
            break
        page += 1
    return items


def _jellystat_fetch_history(
    base_url: str,
    api_key: str,
    page_size: int,
    cutoff_ts: int = 0,
    timeout: int | float | None = None,
) -> tuple[list[dict], int]:
    items: list[dict] = []
    page = 1
    pages = 1
    size = max(_safe_int(page_size), 1)
    max_ts = 0
    while page <= pages:
        data = _jellystat_get(
            base_url,
            api_key,
            "/api/getHistory",
            params={
                "size": size,
                "page": page,
                "sort": "ActivityDateInserted",
                "desc": "true",
            },
            timeout=timeout,
        )
        if not isinstance(data, dict):
            break
        chunk = data.get("results") or []
        if not isinstance(chunk, list):
            break
        stop = False
        for item in chunk:
            ts = _parse_iso_epoch(item.get("ActivityDateInserted"))
            if ts:
                max_ts = max(max_ts, ts)
            if cutoff_ts and ts and ts <= cutoff_ts:
                stop = True
                break
            items.append(item)
        pages = max(_safe_int(data.get("pages")), page)
        if stop or not chunk or page >= pages:
            break
        page += 1
    return items, max_ts


def _tautulli_refresh_library_media_info(
    base_url: str,
    api_key: str,
    section_id: str | int | None = None,
    rating_key: str | int | None = None,
    timeout: int | float | None = None,
) -> bool:
    if not section_id and not rating_key:
        return False
    try:
        params = {
            "start": 0,
            "length": 1,
            "refresh": "true",
        }
        if rating_key:
            params["rating_key"] = rating_key
        else:
            params["section_id"] = section_id
        _tautulli_get(
            base_url,
            api_key,
            "get_library_media_info",
            params=params,
            timeout=timeout,
        )
    except (RuntimeError, requests.RequestException, ValueError) as exc:
        logger.warning(
            "Tautulli media info refresh failed for section_id=<redacted> rating_key=<redacted>: %s",
            exc,
        )
        return False
    return True


def _tautulli_refresh_library_type(
    cfg: dict,
    media_type: str,
    timeout: int | float | None = None,
) -> int:
    if media_type not in ("show", "movie"):
        return 0
    base_url = cfg.get("tautulli_url") or ""
    api_key = cfg.get("tautulli_api_key") or ""
    if not base_url or not api_key:
        return 0
    try:
        _tautulli_get(
            base_url,
            api_key,
            "refresh_libraries_list",
            timeout=timeout,
        )
    except (RuntimeError, requests.RequestException, ValueError) as exc:
        logger.warning("Tautulli libraries list refresh failed: %s", exc)

    libraries = []
    try:
        data = _tautulli_get(
            base_url,
            api_key,
            "get_libraries",
            timeout=timeout,
        )
        if isinstance(data, dict) and "libraries" in data:
            libraries = data.get("libraries") or []
        elif isinstance(data, list):
            libraries = data
    except (RuntimeError, requests.RequestException, ValueError) as exc:
        logger.warning("Tautulli libraries list fetch failed: %s", exc)
        return 0

    refreshed = 0
    for lib in libraries or []:
        section_type = str(lib.get("section_type") or lib.get("type") or "").lower()
        if section_type != media_type:
            continue
        section_id = lib.get("section_id") or lib.get("id")
        if not section_id:
            continue
        if _tautulli_refresh_library_media_info(
            base_url,
            api_key,
            section_id=section_id,
            timeout=timeout,
        ):
            refreshed += 1
    if refreshed:
        logger.info(
            "Tautulli %s library refresh requested for %s sections.",
            media_type,
            refreshed,
        )
    return refreshed


def _tautulli_merge_into(store: dict, key, raw: dict):
    if not key:
        return
    if key not in store:
        store[key] = raw.copy()
    else:
        _tautulli_merge_raw(store[key], raw)


def _tautulli_title_candidates(*values: str) -> list[str]:
    results = []
    seen = set()
    for value in values:
        text = str(value or "").strip()
        if not text:
            continue
        key = _normalize_title_key(text)
        if not key or key in seen:
            continue
        seen.add(key)
        results.append(text)
    return results


def _merge_title_key(store: dict, bucket: str, key, raw: dict, seen: set | None = None) -> None:
    if not key:
        return
    if seen is not None:
        token = (bucket, key)
        if token in seen:
            return
        seen.add(token)
    _tautulli_merge_into(store[bucket], key, raw)


def _merge_title_keys(store: dict, raw: dict, title: str, year: str, seen: set | None = None) -> None:
    if not title:
        return
    title_key = _normalize_title_key(title)
    if not title_key:
        return
    relaxed_key = _relaxed_title_key(title)
    variant_keys = _title_variant_keys(title)
    if year:
        _merge_title_key(store, "title_year", (title_key, year), raw, seen)
    _merge_title_key(store, "title", title_key, raw, seen)
    if year:
        _merge_title_key(store, "title_year_relaxed", (relaxed_key, year), raw, seen)
    _merge_title_key(store, "title_relaxed", relaxed_key, raw, seen)
    if variant_keys and year:
        for key in variant_keys:
            _merge_title_key(store, "title_year_variant", (key, year), raw, seen)
    if variant_keys:
        for key in variant_keys:
            _merge_title_key(store, "title_variant", key, raw, seen)


def _merge_title_keys_cached(
    store: dict,
    raw: dict,
    title: str,
    year: str,
    cache: dict[str, tuple[str, str, list[str]]],
    seen: set | None = None,
) -> None:
    if not title:
        return
    title_value = str(title or "")
    if not title_value:
        return
    cached = cache.get(title_value)
    if cached is None:
        title_key = _normalize_title_key(title_value)
        if not title_key:
            cache[title_value] = ("", "", [])
            return
        relaxed_key = _relaxed_title_key(title_value)
        variant_keys = _title_variant_keys(title_value)
        cache[title_value] = (title_key, relaxed_key, variant_keys)
    else:
        title_key, relaxed_key, variant_keys = cached
        if not title_key:
            return
    if year:
        _merge_title_key(store, "title_year", (title_key, year), raw, seen)
    _merge_title_key(store, "title", title_key, raw, seen)
    if year:
        _merge_title_key(store, "title_year_relaxed", (relaxed_key, year), raw, seen)
    _merge_title_key(store, "title_relaxed", relaxed_key, raw, seen)
    if variant_keys and year:
        for key in variant_keys:
            _merge_title_key(store, "title_year_variant", (key, year), raw, seen)
    if variant_keys:
        for key in variant_keys:
            _merge_title_key(store, "title_variant", key, raw, seen)


def _tautulli_build_index(
    items: list[dict],
    media_type: str,
    metadata_lookup=None,
) -> dict:
    index = {
        "tvdb": {},
        "tmdb": {},
        "imdb": {},
        "title_year": {},
        "title": {},
        "title_year_relaxed": {},
        "title_relaxed": {},
        "title_year_variant": {},
        "title_variant": {},
    }
    episode_agg = {
        "tvdb": {},
        "tmdb": {},
        "imdb": {},
        "title_year": {},
        "title": {},
        "title_year_relaxed": {},
        "title_relaxed": {},
        "title_year_variant": {},
        "title_variant": {},
    }
    title_key_cache: dict[str, tuple[str, str, list[str]]] = {}

    for item in items:
        item_type = str(item.get("media_type") or "").lower()
        if media_type == "show" and item_type == "episode":
            raw = _tautulli_raw_stats_from_item(item)
            ids = _tautulli_extract_ids(item)
            if not ids and metadata_lookup:
                ids = metadata_lookup(_tautulli_metadata_key(item, item_type, media_type))
            title_candidates = _tautulli_title_candidates(
                item.get("grandparent_title") or item.get("title"),
                item.get("grandparent_original_title"),
                item.get("grandparent_originalTitle"),
                item.get("original_title"),
                item.get("originalTitle"),
            )
            year = str(item.get("grandparent_year") or item.get("year") or "").strip()
            if "tvdb" in ids:
                _tautulli_merge_into(episode_agg["tvdb"], str(ids["tvdb"]), raw)
            if "tmdb" in ids:
                _tautulli_merge_into(episode_agg["tmdb"], str(ids["tmdb"]), raw)
            if "imdb" in ids:
                _tautulli_merge_into(episode_agg["imdb"], str(ids["imdb"]), raw)
            seen = set()
            for title in title_candidates:
                _merge_title_keys_cached(episode_agg, raw, title, year, title_key_cache, seen)
            continue

        if item_type and item_type != media_type:
            continue

        raw = _tautulli_raw_stats_from_item(item)
        ids = _tautulli_extract_ids(item)
        if not ids and metadata_lookup:
            ids = metadata_lookup(_tautulli_metadata_key(item, item_type, media_type))
        if "tvdb" in ids:
            _tautulli_merge_into(index["tvdb"], str(ids["tvdb"]), raw)
        if "tmdb" in ids:
            _tautulli_merge_into(index["tmdb"], str(ids["tmdb"]), raw)
        if "imdb" in ids:
            _tautulli_merge_into(index["imdb"], str(ids["imdb"]), raw)

        title_candidates = _tautulli_title_candidates(
            item.get("title") or item.get("grandparent_title"),
            item.get("original_title"),
            item.get("originalTitle"),
        )
        year = str(item.get("year") or "").strip()
        seen = set()
        for title in title_candidates:
            _merge_title_keys_cached(index, raw, title, year, title_key_cache, seen)

    for bucket in [
        "tvdb",
        "tmdb",
        "imdb",
        "title_year",
        "title",
        "title_year_relaxed",
        "title_relaxed",
        "title_year_variant",
        "title_variant",
    ]:
        for key, raw in episode_agg[bucket].items():
            if key not in index[bucket]:
                index[bucket][key] = raw

    return index


def _tautulli_build_history_index(
    items: list[dict],
    media_type: str,
    metadata_lookup=None,
    strict_id_map: dict | None = None,
) -> dict:
    index = {
        "tvdb": {},
        "tmdb": {},
        "imdb": {},
        "title_year": {},
        "title": {},
        "title_year_relaxed": {},
        "title_relaxed": {},
        "title_year_variant": {},
        "title_variant": {},
    }
    title_key_cache: dict[str, tuple[str, str, list[str]]] = {}

    for item in items:
        item_type = str(item.get("media_type") or "").lower()
        if media_type == "show" and item_type != "episode":
            continue
        if media_type == "movie" and item_type != "movie":
            continue

        raw = _tautulli_raw_history_stats_from_item(item)
        ids = _tautulli_extract_ids(item)
        if not ids and metadata_lookup:
            ids = metadata_lookup(_tautulli_metadata_key(item, item_type, media_type))

        if media_type == "show":
            title_candidates = _tautulli_title_candidates(
                item.get("grandparent_title") or item.get("title"),
                item.get("grandparent_original_title"),
                item.get("grandparent_originalTitle"),
                item.get("original_title"),
                item.get("originalTitle"),
            )
            year = str(item.get("grandparent_year") or item.get("year") or "").strip()
        else:
            title_candidates = _tautulli_title_candidates(
                item.get("title"),
                item.get("original_title"),
                item.get("originalTitle"),
            )
            year = str(item.get("year") or "").strip()

        if strict_id_map and title_candidates and year:
            strict_matches = []
            for title in title_candidates:
                strict_key = _strict_title_year_key(title, year)
                if strict_key and strict_key in strict_id_map:
                    strict_matches.append(strict_id_map[strict_key])
            if strict_matches:
                merged_ids: dict[str, str] = {}
                conflict = False
                for match in strict_matches:
                    for id_key, id_val in match.items():
                        if id_key in merged_ids and merged_ids[id_key] != id_val:
                            conflict = True
                            break
                        merged_ids[id_key] = id_val
                    if conflict:
                        break
                if not conflict:
                    for id_key, id_val in merged_ids.items():
                        if id_key in ids and str(ids[id_key]) != str(id_val):
                            conflict = True
                            break
                if not conflict and merged_ids:
                    for id_key, id_val in merged_ids.items():
                        ids.setdefault(id_key, id_val)

        if "tvdb" in ids:
            _tautulli_merge_into(index["tvdb"], str(ids["tvdb"]), raw)
        if "tmdb" in ids:
            _tautulli_merge_into(index["tmdb"], str(ids["tmdb"]), raw)
        if "imdb" in ids:
            _tautulli_merge_into(index["imdb"], str(ids["imdb"]), raw)
        seen = set()
        for title in title_candidates:
            _merge_title_keys_cached(index, raw, title, year, title_key_cache, seen)

    return index


def _get_tautulli_index(
    cfg: dict,
    force: bool = False,
    timing: dict | None = None,
) -> dict | None:
    if not (cfg.get("tautulli_url") and cfg.get("tautulli_api_key")):
        return None

    cached_data, _ = _cache.get_tautulli_state()
    if not force and cached_data:
        return cached_data

    if force or not cached_data:
        now = time.time()
        request_timeout = _safe_int(cfg.get("tautulli_timeout_seconds"))
        if request_timeout <= 0:
            request_timeout = 45
        fetch_seconds = _safe_int(cfg.get("tautulli_fetch_seconds"))
        if fetch_seconds > 0 and fetch_seconds < request_timeout:
            logger.info(
                "Tautulli fetch budget (%s) raised to match per-request timeout (%s)",
                fetch_seconds,
                request_timeout,
            )
            fetch_seconds = request_timeout
        fetch_deadline = time.time() + fetch_seconds if fetch_seconds > 0 else None
        fetch_deadline_lock = threading.Lock()

        def note_fetch_progress():
            nonlocal fetch_deadline
            if fetch_deadline is not None:
                with fetch_deadline_lock:
                    fetch_deadline = time.time() + fetch_seconds

        metadata_cache_path = cfg.get("tautulli_metadata_cache") or ""
        metadata_cache = _load_tautulli_metadata_cache(metadata_cache_path)
        metadata_dirty = False
        metadata_lookups = 0
        metadata_resolved = 0
        lookup_limit = _safe_int(cfg.get("tautulli_metadata_lookup_limit"))
        lookup_seconds = _safe_int(cfg.get("tautulli_metadata_lookup_seconds"))
        lookup_enabled = lookup_limit != 0
        lookup_deadline = time.time() + lookup_seconds if lookup_seconds > 0 else None
        lookup_limit_hit = False
        lookup_deadline_hit = False
        metadata_workers = _safe_int(cfg.get("tautulli_metadata_workers"))
        if metadata_workers <= 0:
            metadata_workers = 1
        metadata_save_every = _safe_int(cfg.get("tautulli_metadata_save_every"))
        if metadata_save_every < 0:
            metadata_save_every = 0
        metadata_lock = threading.Lock()
        metadata_save_lock = threading.Lock()
        metadata_last_save = 0

        def _maybe_save_metadata_cache(force: bool = False) -> None:
            nonlocal metadata_dirty, metadata_last_save
            if not metadata_cache_path:
                return
            with metadata_lock:
                if not metadata_dirty:
                    return
                if not force and metadata_save_every > 0 and (metadata_lookups - metadata_last_save) < metadata_save_every:
                    return
                snapshot = dict(metadata_cache)
                metadata_last_save = metadata_lookups
                metadata_dirty = False
            with metadata_save_lock:
                _save_tautulli_metadata_cache(metadata_cache_path, snapshot)

        def _store_metadata_ids(key: str, ids: dict) -> dict:
            nonlocal metadata_dirty, metadata_resolved
            resolved = any(k in ids for k in ("tvdb", "tmdb", "imdb"))
            with metadata_lock:
                metadata_cache[key] = ids
                metadata_dirty = True
                if resolved:
                    metadata_resolved += 1
            _maybe_save_metadata_cache()
            return ids

        def metadata_lookup(rating_key):
            nonlocal metadata_lookups, lookup_limit_hit, lookup_deadline_hit
            key = str(rating_key or "").strip()
            if not key:
                return {}
            with metadata_lock:
                if key in metadata_cache:
                    return metadata_cache[key]
            if not lookup_enabled:
                return {}
            if lookup_limit > 0 and metadata_lookups >= lookup_limit:
                lookup_limit_hit = True
                return {}
            if lookup_deadline is not None and time.time() >= lookup_deadline:
                lookup_deadline_hit = True
                return {}
            _check_deadline(fetch_deadline, "Tautulli fetch")
            metadata_lookups += 1
            lookup_start = time.perf_counter()
            ids = _tautulli_metadata_ids_uncached(
                cfg["tautulli_url"],
                cfg["tautulli_api_key"],
                key,
                timeout=request_timeout,
            )
            _add_timing_ms(timing, "tautulli_metadata_lookup_ms", time.perf_counter() - lookup_start)
            note_fetch_progress()
            return _store_metadata_ids(key, ids)
        _check_deadline(fetch_deadline, "Tautulli fetch")
        libraries_start = time.perf_counter()
        libraries = _tautulli_get(
            cfg["tautulli_url"],
            cfg["tautulli_api_key"],
            "get_libraries",
            timeout=request_timeout,
        )
        _record_timing(timing, "tautulli_fetch_libraries_ms", libraries_start)
        note_fetch_progress()
        if isinstance(libraries, dict) and "libraries" in libraries:
            libraries = libraries.get("libraries")
        shows_items = []
        movies_items = []
        for lib in libraries or []:
            _check_deadline(fetch_deadline, "Tautulli fetch")
            section_type = str(lib.get("section_type") or lib.get("type") or "").lower()
            if section_type not in ("show", "movie"):
                continue
            section_id = lib.get("section_id") or lib.get("id")
            if not section_id:
                continue
            items_start = time.perf_counter()
            items = _tautulli_fetch_library_items(
                cfg["tautulli_url"],
                cfg["tautulli_api_key"],
                section_id,
                timeout=request_timeout,
                deadline=fetch_deadline,
                progress=note_fetch_progress,
            )
            items_elapsed = time.perf_counter() - items_start
            _add_timing_ms(timing, "tautulli_fetch_items_ms", items_elapsed)
            if section_type == "show":
                _add_timing_ms(timing, "tautulli_fetch_items_show_ms", items_elapsed)
                shows_items.extend(items)
            else:
                _add_timing_ms(timing, "tautulli_fetch_items_movie_ms", items_elapsed)
                movies_items.extend(items)

        history_start = time.perf_counter()
        history_items = _tautulli_fetch_history(
            cfg["tautulli_url"],
            cfg["tautulli_api_key"],
            timeout=request_timeout,
            deadline=fetch_deadline,
            progress=note_fetch_progress,
        )
        _record_timing(timing, "tautulli_fetch_history_ms", history_start)

        def _collect_metadata_keys(items: list[dict], media_type: str, history: bool = False) -> set[str]:
            keys = set()
            for item in items or []:
                item_type = str(item.get("media_type") or "").lower()
                if history:
                    if media_type == "show" and item_type != "episode":
                        continue
                    if media_type == "movie" and item_type != "movie":
                        continue
                else:
                    if media_type == "show":
                        if item_type and item_type not in ("show", "episode"):
                            continue
                    else:
                        if item_type and item_type != "movie":
                            continue
                ids = _tautulli_extract_ids(item)
                if ids:
                    continue
                key = str(_tautulli_metadata_key(item, item_type, media_type) or "").strip()
                if key:
                    keys.add(key)
            return keys

        def _prefetch_metadata(keys: set[str]) -> None:
            nonlocal metadata_lookups, lookup_limit_hit, lookup_deadline_hit
            if not lookup_enabled:
                return
            pending = [key for key in keys if key not in metadata_cache]
            if not pending:
                return
            if lookup_limit > 0:
                remaining = lookup_limit - metadata_lookups
                if remaining <= 0:
                    lookup_limit_hit = True
                    return
                if len(pending) > remaining:
                    pending = pending[:remaining]
                    lookup_limit_hit = True
            if lookup_deadline is not None and time.time() >= lookup_deadline:
                lookup_deadline_hit = True
                return

            metadata_lookups += len(pending)

            thread_local = threading.local()

            def fetch_key(key: str):
                nonlocal lookup_deadline_hit
                if lookup_deadline is not None and time.time() >= lookup_deadline:
                    lookup_deadline_hit = True
                    return key, {}
                try:
                    _check_deadline(fetch_deadline, "Tautulli fetch")
                except TimeoutError:
                    return key, {}
                session = getattr(thread_local, "session", None)
                if session is None:
                    session = requests.Session()
                    thread_local.session = session
                key_start = time.perf_counter()
                ids = _tautulli_metadata_ids_uncached(
                    cfg["tautulli_url"],
                    cfg["tautulli_api_key"],
                    key,
                    timeout=request_timeout,
                    session=session,
                )
                _add_timing_ms(timing, "tautulli_metadata_lookup_ms", time.perf_counter() - key_start)
                note_fetch_progress()
                return key, ids

            if metadata_workers <= 1 or len(pending) <= 1:
                for key in pending:
                    key, ids = fetch_key(key)
                    _store_metadata_ids(key, ids)
                return
            with ThreadPoolExecutor(max_workers=metadata_workers) as executor:
                for key, ids in executor.map(fetch_key, pending):
                    _store_metadata_ids(key, ids)

            if lookup_deadline is not None and time.time() >= lookup_deadline:
                lookup_deadline_hit = True

        if lookup_enabled:
            metadata_keys = set()
            metadata_keys.update(_collect_metadata_keys(shows_items, "show"))
            metadata_keys.update(_collect_metadata_keys(movies_items, "movie"))
            metadata_keys.update(_collect_metadata_keys(history_items, "show", history=True))
            metadata_keys.update(_collect_metadata_keys(history_items, "movie", history=True))
            prefetch_start = time.perf_counter()
            _prefetch_metadata(metadata_keys)
            _record_timing(timing, "tautulli_metadata_prefetch_ms", prefetch_start)
        shows_build_start = time.perf_counter()
        shows_index = _tautulli_build_index(shows_items, "show", metadata_lookup=metadata_lookup)
        logger.info("Tautulli show index built in %.2fs.", time.perf_counter() - shows_build_start)
        _record_timing(timing, "tautulli_build_shows_ms", shows_build_start)
        movies_build_start = time.perf_counter()
        movies_index = _tautulli_build_index(movies_items, "movie", metadata_lookup=metadata_lookup)
        logger.info("Tautulli movie index built in %.2fs.", time.perf_counter() - movies_build_start)
        _record_timing(timing, "tautulli_build_movies_ms", movies_build_start)
        strict_show_ids = _build_strict_title_year_id_map(shows_items, "show", metadata_lookup=metadata_lookup)
        strict_movie_ids = _build_strict_title_year_id_map(movies_items, "movie", metadata_lookup=metadata_lookup)
        history_show_start = time.perf_counter()
        history_shows = _tautulli_build_history_index(
            history_items,
            "show",
            metadata_lookup=metadata_lookup,
            strict_id_map=strict_show_ids,
        )
        logger.info("Tautulli show history index built in %.2fs.", time.perf_counter() - history_show_start)
        _record_timing(timing, "tautulli_build_history_shows_ms", history_show_start)
        history_movie_start = time.perf_counter()
        history_movies = _tautulli_build_history_index(
            history_items,
            "movie",
            metadata_lookup=metadata_lookup,
            strict_id_map=strict_movie_ids,
        )
        logger.info("Tautulli movie history index built in %.2fs.", time.perf_counter() - history_movie_start)
        _record_timing(timing, "tautulli_build_history_movies_ms", history_movie_start)

        for bucket in [
            "tvdb",
            "tmdb",
            "imdb",
            "title_year",
            "title",
            "title_year_relaxed",
            "title_relaxed",
            "title_year_variant",
            "title_variant",
        ]:
            for key, raw in history_shows[bucket].items():
                if key in shows_index[bucket]:
                    _tautulli_apply_history(shows_index[bucket][key], raw)
                else:
                    shows_index[bucket][key] = raw
            for key, raw in history_movies[bucket].items():
                if key in movies_index[bucket]:
                    _tautulli_apply_history(movies_index[bucket][key], raw)
                else:
                    movies_index[bucket][key] = raw

        index = {
            "shows": shows_index,
            "movies": movies_index,
        }
        _cache.set_tautulli(index, now)
        cached_data = index
        _maybe_save_metadata_cache(force=True)
        if metadata_lookups:
            logger.info(
                "Tautulli metadata lookups: %s (ids resolved: %s)",
                metadata_lookups,
                metadata_resolved,
            )
        if lookup_limit_hit or lookup_deadline_hit:
            logger.info(
                "Tautulli metadata lookups capped (limit=%s, seconds=%s)",
                lookup_limit,
                lookup_seconds,
            )

    return cached_data


def _get_tautulli_index_cached() -> dict | None:
    data, _ = _cache.get_tautulli_state()
    return data


def _get_tautulli_index_state() -> tuple[dict | None, int]:
    return _cache.get_tautulli_state()


def _get_jellystat_index_state() -> tuple[dict | None, int]:
    return _cache.get_jellystat_state()


def _get_jellystat_index(
    cfg: dict,
    force: bool = False,
    include_history: bool = True,
) -> dict | None:
    if not (cfg.get("jellystat_url") and cfg.get("jellystat_api_key")):
        return None

    cached_data, _ = _cache.get_jellystat_state()
    if not force and cached_data:
        return cached_data

    cache_path = cfg.get("jellystat_cache_path") or ""
    disk_cache = None if force else _load_jellystat_cache(cache_path)
    if not force and disk_cache and disk_cache.get("index"):
        index = disk_cache.get("index")
        ts = _safe_int(disk_cache.get("ts")) or time.time()
        _cache.set_jellystat(index, ts)
        return index

    base_url = cfg.get("jellystat_url") or ""
    api_key = cfg.get("jellystat_api_key") or ""
    request_timeout = _safe_int(cfg.get("jellystat_timeout_seconds"))
    if request_timeout <= 0:
        request_timeout = 45
    page_size = _safe_int(cfg.get("jellystat_stats_page_size"))
    if page_size <= 0:
        page_size = 500

    libraries = _jellystat_fetch_libraries(base_url, api_key, timeout=request_timeout)
    show_lib_ids = _jellystat_library_ids_for_media(cfg, libraries, "show")
    movie_lib_ids = _jellystat_library_ids_for_media(cfg, libraries, "movie")

    shows_items = []
    for lib_id in show_lib_ids:
        shows_items.extend(
            _jellystat_fetch_library_items(
                base_url,
                api_key,
                lib_id,
                page_size,
                timeout=request_timeout,
            )
        )

    movies_items = []
    for lib_id in movie_lib_ids:
        movies_items.extend(
            _jellystat_fetch_library_items(
                base_url,
                api_key,
                lib_id,
                page_size,
                timeout=request_timeout,
            )
        )

    id_map = _jellystat_build_id_map(shows_items + movies_items)
    shows_index = _jellystat_build_index(shows_items, "show")
    movies_index = _jellystat_build_index(movies_items, "movie")
    meta: dict = {
        "history_ts": 0,
        "id_map": id_map,
        "library_ids": {"shows": show_lib_ids, "movies": movie_lib_ids},
    }
    prior_meta = None
    if cached_data and isinstance(cached_data.get("meta"), dict):
        prior_meta = cached_data.get("meta")
    elif disk_cache and isinstance(disk_cache.get("index"), dict):
        prior_meta = disk_cache.get("index", {}).get("meta")
    if isinstance(prior_meta, dict):
        prior_history_ts = _safe_int(prior_meta.get("history_ts"))
        if prior_history_ts:
            meta["history_ts"] = prior_history_ts

    index = {"shows": shows_index, "movies": movies_index, "meta": meta}
    now = time.time()

    if include_history:
        updated = _jellystat_refresh_history(cfg, index)
        if updated:
            index = updated
        now = time.time()
        _save_jellystat_cache(cache_path, index, now)

    _cache.set_jellystat(index, now)
    return index


def _get_jellystat_index_cached() -> dict | None:
    data, _ = _cache.get_jellystat_state()
    return data


def _jellystat_refresh_history(cfg: dict, index: dict | None) -> dict | None:
    if not index or not isinstance(index, dict):
        return None
    meta = index.get("meta") if isinstance(index.get("meta"), dict) else {}
    id_map = meta.get("id_map") if isinstance(meta.get("id_map"), dict) else {}
    if not id_map:
        return None

    base_url = cfg.get("jellystat_url") or ""
    api_key = cfg.get("jellystat_api_key") or ""
    request_timeout = _safe_int(cfg.get("jellystat_timeout_seconds"))
    if request_timeout <= 0:
        request_timeout = 45
    page_size = _safe_int(cfg.get("jellystat_history_page_size"))
    if page_size <= 0:
        page_size = 250
    cutoff_ts = _safe_int(meta.get("history_ts"))

    history_items, history_ts = _jellystat_fetch_history(
        base_url,
        api_key,
        page_size,
        cutoff_ts=cutoff_ts,
        timeout=request_timeout,
    )
    if not history_items and history_ts <= cutoff_ts:
        return None

    refreshed = copy.deepcopy(index)
    refreshed_meta = refreshed.get("meta") if isinstance(refreshed.get("meta"), dict) else {}
    refreshed_meta["history_ts"] = max(cutoff_ts, history_ts)
    refreshed["meta"] = refreshed_meta

    history_shows = _jellystat_build_history_index(history_items, "show", id_map)
    history_movies = _jellystat_build_history_index(history_items, "movie", id_map)
    for bucket in [
        "tvdb",
        "tmdb",
        "imdb",
        "title_year",
        "title",
        "title_year_relaxed",
        "title_relaxed",
        "title_year_variant",
        "title_variant",
    ]:
        for key, raw in history_shows[bucket].items():
            if key in refreshed["shows"][bucket]:
                _tautulli_apply_history(refreshed["shows"][bucket][key], raw)
            else:
                refreshed["shows"][bucket][key] = raw
        for key, raw in history_movies[bucket].items():
            if key in refreshed["movies"][bucket]:
                _tautulli_apply_history(refreshed["movies"][bucket][key], raw)
            else:
                refreshed["movies"][bucket][key] = raw
    return refreshed


def _tautulli_refresh_lock_path() -> str:
    base_dir = os.path.dirname(ENV_FILE_PATH) or os.getcwd()
    return os.path.join(base_dir, "Sortarr.tautulli_refresh.lock")


def _tautulli_refresh_marker_path() -> str:
    base_dir = os.path.dirname(ENV_FILE_PATH) or os.getcwd()
    return os.path.join(base_dir, "Sortarr.tautulli_refresh.done")


def _touch_tautulli_refresh_marker() -> None:
    path = _tautulli_refresh_marker_path()
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(str(time.time()))
    except OSError:
        logger.warning("Failed to write Tautulli refresh marker (path redacted).")


def _jellystat_refresh_lock_path() -> str:
    base_dir = os.path.dirname(ENV_FILE_PATH) or os.getcwd()
    return os.path.join(base_dir, "Sortarr.jellystat_refresh.lock")


def _jellystat_refresh_marker_path() -> str:
    base_dir = os.path.dirname(ENV_FILE_PATH) or os.getcwd()
    return os.path.join(base_dir, "Sortarr.jellystat_refresh.done")


def _touch_jellystat_refresh_marker() -> None:
    path = _jellystat_refresh_marker_path()
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(str(time.time()))
    except OSError:
        logger.warning("Failed to write Jellystat refresh marker (path redacted).")


def _maybe_bust_arr_cache_on_tautulli_refresh() -> None:
    global _tautulli_refresh_seen
    marker_path = _tautulli_refresh_marker_path()
    try:
        mtime = os.path.getmtime(marker_path)
    except OSError:
        return
    if _tautulli_refresh_seen is None or mtime > _tautulli_refresh_seen:
        _tautulli_refresh_seen = mtime
        _cache.clear_app("sonarr")
        _cache.clear_app("radarr")


def _maybe_bust_arr_cache_on_jellystat_refresh() -> None:
    global _jellystat_refresh_seen
    marker_path = _jellystat_refresh_marker_path()
    try:
        mtime = os.path.getmtime(marker_path)
    except OSError:
        return
    if _jellystat_refresh_seen is None or mtime > _jellystat_refresh_seen:
        _jellystat_refresh_seen = mtime
        _cache.clear_app("sonarr")
        _cache.clear_app("radarr")


def _maybe_bust_arr_cache_on_playback_refresh(cfg: dict) -> None:
    provider = _playback_provider(cfg)
    if provider == "jellystat":
        _maybe_bust_arr_cache_on_jellystat_refresh()
    elif provider == "tautulli":
        _maybe_bust_arr_cache_on_tautulli_refresh()


def _tautulli_refresh_lock_age(lock_path: str) -> float | None:
    try:
        mtime = os.path.getmtime(lock_path)
    except OSError:
        return None
    return max(0.0, time.time() - mtime)


def _jellystat_refresh_lock_age(lock_path: str) -> float | None:
    try:
        mtime = os.path.getmtime(lock_path)
    except OSError:
        return None
    return max(0.0, time.time() - mtime)


def _clear_stale_tautulli_refresh_lock(lock_path: str, stale_seconds: int) -> bool:
    if stale_seconds <= 0:
        return False
    age = _tautulli_refresh_lock_age(lock_path)
    if age is None or age < stale_seconds:
        return False
    logger.warning("Stale Tautulli refresh lock detected (age %.0fs); clearing.", age)
    _release_tautulli_refresh_lock(lock_path, None)
    return True


def _clear_stale_jellystat_refresh_lock(lock_path: str, stale_seconds: int) -> bool:
    if stale_seconds <= 0:
        return False
    age = _jellystat_refresh_lock_age(lock_path)
    if age is None or age < stale_seconds:
        return False
    logger.warning("Stale Jellystat refresh lock detected (age %.0fs); clearing.", age)
    _release_jellystat_refresh_lock(lock_path, None)
    return True


def _tautulli_refresh_in_progress(cfg: dict | None = None) -> bool:
    lock_path = _tautulli_refresh_lock_path()
    if not os.path.exists(lock_path):
        return False
    if cfg is None:
        stale_seconds = _read_int_env("TAUTULLI_REFRESH_STALE_SECONDS", 3600)
    else:
        stale_seconds = _safe_int(cfg.get("tautulli_refresh_stale_seconds"))
    if _clear_stale_tautulli_refresh_lock(lock_path, stale_seconds):
        return False
    return os.path.exists(lock_path)


def _jellystat_refresh_in_progress(cfg: dict | None = None) -> bool:
    lock_path = _jellystat_refresh_lock_path()
    if not os.path.exists(lock_path):
        return False
    if cfg is None:
        stale_seconds = _read_int_env("JELLYSTAT_REFRESH_STALE_SECONDS", 3600)
    else:
        stale_seconds = _safe_int(cfg.get("jellystat_refresh_stale_seconds"))
    if _clear_stale_jellystat_refresh_lock(lock_path, stale_seconds):
        return False
    return os.path.exists(lock_path)


def _acquire_tautulli_refresh_lock(lock_path: str, stale_seconds: int = 0):
    _clear_stale_tautulli_refresh_lock(lock_path, stale_seconds)
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return None
    except OSError:
        return None
    try:
        os.write(fd, str(os.getpid()).encode("utf-8"))
    except OSError:
        pass
    return fd


def _acquire_jellystat_refresh_lock(lock_path: str, stale_seconds: int = 0):
    _clear_stale_jellystat_refresh_lock(lock_path, stale_seconds)
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return None
    except OSError:
        return None
    try:
        os.write(fd, str(os.getpid()).encode("utf-8"))
    except OSError:
        pass
    return fd


def _release_tautulli_refresh_lock(lock_path: str, fd) -> None:
    try:
        if fd is not None:
            os.close(fd)
    except OSError:
        pass
    try:
        os.remove(lock_path)
    except OSError:
        pass


def _release_jellystat_refresh_lock(lock_path: str, fd) -> None:
    try:
        if fd is not None:
            os.close(fd)
    except OSError:
        pass
    try:
        os.remove(lock_path)
    except OSError:
        pass


def _apply_tautulli_to_caches(cfg: dict, index: dict) -> None:
    _, index_ts = _cache.get_tautulli_state()
    totals = {"shows": 0, "movies": 0}
    progress_instances: dict[str, dict[str, set[str]]] = {}
    disk_caches: dict[str, dict[str, dict]] = {}

    for app_name, media_type in (("sonarr", "shows"), ("radarr", "movies")):
        memory_snapshot = _cache.get_app_snapshot(app_name)
        memory_ids: set[str] = set()
        memory_total = 0
        for instance_id, entry in memory_snapshot.items():
            data = entry.get("data")
            if isinstance(data, list) and data:
                memory_ids.add(str(instance_id))
                memory_total += len(data)

        cache_path = cfg.get("sonarr_cache_path") if app_name == "sonarr" else cfg.get("radarr_cache_path")
        disk_cache = _load_arr_cache(cache_path)
        disk_caches[app_name] = {"path": cache_path, "cache": disk_cache}

        disk_only_ids: set[str] = set()
        disk_only_total = 0
        for instance_id, cached_entry in disk_cache.items():
            if str(instance_id) in memory_ids:
                continue
            data = cached_entry.get("data")
            if isinstance(data, list) and data:
                disk_only_ids.add(str(instance_id))
                disk_only_total += len(data)

        totals[media_type] = memory_total + disk_only_total
        progress_instances[app_name] = {
            "disk_only": disk_only_ids,
            "memory_ids": memory_ids,
        }

    _init_tautulli_match_progress(totals)

    for app_name, media_type in (("sonarr", "shows"), ("radarr", "movies")):
        disk_only_ids = progress_instances.get(app_name, {}).get("disk_only", set())
        memory_ids = progress_instances.get(app_name, {}).get("memory_ids", set())

        for instance_id in memory_ids:
            entry = _cache.get_app_entry_snapshot(app_name, instance_id)
            if not entry:
                continue
            if _apply_tautulli_stats_once(
                entry,
                index,
                media_type,
                index_ts,
                progress_media_type=media_type,
            ):
                _cache.update_app_entry(
                    app_name,
                    instance_id,
                    data=entry.get("data") or [],
                    ts=entry.get("ts") or 0,
                    tautulli_index_ts=entry.get("tautulli_index_ts") or 0,
                )

        cache_info = disk_caches.get(app_name, {})
        cache_path = cache_info.get("path")
        disk_cache = cache_info.get("cache", {})
        updated = False
        for instance_id, cached_entry in disk_cache.items():
            progress_media = media_type if str(instance_id) in disk_only_ids else None
            if _apply_tautulli_stats_once(
                cached_entry,
                index,
                media_type,
                index_ts,
                progress_media_type=progress_media,
            ):
                updated = True
        if updated:
            _queue_arr_cache_save(app_name, cache_path, disk_cache, "tautulli_refresh")


def _start_tautulli_background_apply(cfg: dict, index: dict | None) -> bool:
    if not index:
        return False
    lock_path = _tautulli_refresh_lock_path()
    stale_seconds = _safe_int(cfg.get("tautulli_refresh_stale_seconds"))
    fd = _acquire_tautulli_refresh_lock(lock_path, stale_seconds)
    if fd is None:
        return False

    def worker():
        try:
            _apply_tautulli_to_caches(cfg, index)
        except Exception as exc:
            logger.warning("Tautulli background apply failed: %s", exc)
        finally:
            _release_tautulli_refresh_lock(lock_path, fd)
            _reset_tautulli_match_progress()

    thread = threading.Thread(target=worker, name="sortarr-tautulli-apply", daemon=True)
    thread.start()
    return True


def _start_tautulli_background_refresh(cfg: dict) -> bool:
    if not (cfg.get("tautulli_url") and cfg.get("tautulli_api_key")):
        return False
    lock_path = _tautulli_refresh_lock_path()
    stale_seconds = _safe_int(cfg.get("tautulli_refresh_stale_seconds"))
    fd = _acquire_tautulli_refresh_lock(lock_path, stale_seconds)
    if fd is None:
        return False

    def worker():
        try:
            index = _get_tautulli_index(cfg, force=True)
            if index:
                _apply_tautulli_to_caches(cfg, index)
                _touch_tautulli_refresh_marker()
        except Exception as exc:
            logger.warning("Tautulli background refresh failed: %s", exc)
        finally:
            _release_tautulli_refresh_lock(lock_path, fd)
            _reset_tautulli_match_progress()

    thread = threading.Thread(target=worker, name="sortarr-tautulli-refresh", daemon=True)
    thread.start()
    return True


def _start_tautulli_deep_refresh(cfg: dict) -> bool:
    if not (cfg.get("tautulli_url") and cfg.get("tautulli_api_key")):
        return False
    lock_path = _tautulli_refresh_lock_path()
    stale_seconds = _safe_int(cfg.get("tautulli_refresh_stale_seconds"))
    fd = _acquire_tautulli_refresh_lock(lock_path, stale_seconds)
    if fd is None:
        return False

    def worker():
        try:
            request_timeout = _safe_int(cfg.get("tautulli_timeout_seconds"))
            if request_timeout <= 0:
                request_timeout = 45

            try:
                _tautulli_get(
                    cfg["tautulli_url"],
                    cfg["tautulli_api_key"],
                    "refresh_libraries_list",
                    timeout=request_timeout,
                )
            except (RuntimeError, requests.RequestException, ValueError) as exc:
                logger.warning("Tautulli libraries list refresh failed: %s", exc)

            libraries = []
            try:
                data = _tautulli_get(
                    cfg["tautulli_url"],
                    cfg["tautulli_api_key"],
                    "get_libraries",
                    timeout=request_timeout,
                )
                if isinstance(data, dict) and "libraries" in data:
                    libraries = data.get("libraries") or []
                elif isinstance(data, list):
                    libraries = data
            except (RuntimeError, requests.RequestException, ValueError) as exc:
                logger.warning("Tautulli libraries list fetch failed: %s", exc)

            refreshed = 0
            for lib in libraries or []:
                section_type = str(lib.get("section_type") or lib.get("type") or "").lower()
                if section_type not in ("show", "movie"):
                    continue
                section_id = lib.get("section_id") or lib.get("id")
                if not section_id:
                    continue
                if _tautulli_refresh_library_media_info(
                    cfg["tautulli_url"],
                    cfg["tautulli_api_key"],
                    section_id,
                    timeout=request_timeout,
                ):
                    refreshed += 1

            if refreshed:
                logger.info(
                    "Tautulli media info refresh requested for %s library sections.",
                    refreshed,
                )

            index = _get_tautulli_index(cfg, force=True)
            if index:
                _apply_tautulli_to_caches(cfg, index)
                _touch_tautulli_refresh_marker()
        except Exception as exc:
            logger.warning("Tautulli deep refresh failed: %s", exc)
        finally:
            _release_tautulli_refresh_lock(lock_path, fd)
            _reset_tautulli_match_progress()

    thread = threading.Thread(target=worker, name="sortarr-tautulli-deep-refresh", daemon=True)
    thread.start()
    return True


def _apply_jellystat_to_caches(cfg: dict, index: dict) -> None:
    _, index_ts = _cache.get_jellystat_state()
    totals = {"shows": 0, "movies": 0}
    progress_instances: dict[str, dict[str, set[str]]] = {}
    disk_caches: dict[str, dict[str, dict]] = {}

    for app_name, media_type in (("sonarr", "shows"), ("radarr", "movies")):
        memory_snapshot = _cache.get_app_snapshot(app_name)
        memory_ids: set[str] = set()
        memory_total = 0
        for instance_id, entry in memory_snapshot.items():
            data = entry.get("data")
            if isinstance(data, list) and data:
                memory_ids.add(str(instance_id))
                memory_total += len(data)

        cache_path = cfg.get("sonarr_cache_path") if app_name == "sonarr" else cfg.get("radarr_cache_path")
        disk_cache = _load_arr_cache(cache_path)
        disk_caches[app_name] = {"path": cache_path, "cache": disk_cache}

        disk_only_ids: set[str] = set()
        disk_only_total = 0
        for instance_id, cached_entry in disk_cache.items():
            if str(instance_id) in memory_ids:
                continue
            data = cached_entry.get("data")
            if isinstance(data, list) and data:
                disk_only_ids.add(str(instance_id))
                disk_only_total += len(data)

        totals[media_type] = memory_total + disk_only_total
        progress_instances[app_name] = {
            "disk_only": disk_only_ids,
            "memory_ids": memory_ids,
        }

    _init_tautulli_match_progress(totals)
    provider_label = _playback_label("jellystat")

    for app_name, media_type in (("sonarr", "shows"), ("radarr", "movies")):
        disk_only_ids = progress_instances.get(app_name, {}).get("disk_only", set())
        memory_ids = progress_instances.get(app_name, {}).get("memory_ids", set())

        for instance_id in memory_ids:
            entry = _cache.get_app_entry_snapshot(app_name, instance_id)
            if not entry:
                continue
            if _apply_tautulli_stats_once(
                entry,
                index,
                media_type,
                index_ts,
                progress_media_type=media_type,
                provider_label=provider_label,
            ):
                _cache.update_app_entry(
                    app_name,
                    instance_id,
                    data=entry.get("data") or [],
                    ts=entry.get("ts") or 0,
                    tautulli_index_ts=entry.get("tautulli_index_ts") or 0,
                )

        cache_info = disk_caches.get(app_name, {})
        cache_path = cache_info.get("path")
        disk_cache = cache_info.get("cache", {})
        updated = False
        for instance_id, cached_entry in disk_cache.items():
            progress_media = media_type if str(instance_id) in disk_only_ids else None
            if _apply_tautulli_stats_once(
                cached_entry,
                index,
                media_type,
                index_ts,
                progress_media_type=progress_media,
                provider_label=provider_label,
            ):
                updated = True
        if updated:
            _queue_arr_cache_save(app_name, cache_path, disk_cache, "jellystat_refresh")


def _start_jellystat_background_apply(cfg: dict, index: dict | None) -> bool:
    if not index:
        return False
    lock_path = _jellystat_refresh_lock_path()
    stale_seconds = _safe_int(cfg.get("jellystat_refresh_stale_seconds"))
    fd = _acquire_jellystat_refresh_lock(lock_path, stale_seconds)
    if fd is None:
        return False

    def worker():
        try:
            _apply_jellystat_to_caches(cfg, index)
        except Exception as exc:
            logger.warning("Jellystat background apply failed: %s", exc)
        finally:
            _release_jellystat_refresh_lock(lock_path, fd)
            _reset_tautulli_match_progress()

    thread = threading.Thread(target=worker, name="sortarr-jellystat-apply", daemon=True)
    thread.start()
    return True


def _start_jellystat_background_refresh(cfg: dict) -> bool:
    if not (cfg.get("jellystat_url") and cfg.get("jellystat_api_key")):
        return False
    lock_path = _jellystat_refresh_lock_path()
    stale_seconds = _safe_int(cfg.get("jellystat_refresh_stale_seconds"))
    fd = _acquire_jellystat_refresh_lock(lock_path, stale_seconds)
    if fd is None:
        return False

    cache_path = cfg.get("jellystat_cache_path") or ""
    existing_cache = _load_jellystat_cache(cache_path)

    def worker():
        try:
            index = _get_jellystat_index(cfg, force=True, include_history=False)
            if index:
                _apply_jellystat_to_caches(cfg, index)
                updated_index = _jellystat_refresh_history(cfg, index)
                if updated_index:
                    index = updated_index
                    _cache.set_jellystat(index, time.time())
                    _apply_jellystat_to_caches(cfg, index)
                    _save_jellystat_cache(cache_path, index, time.time())
                elif not existing_cache:
                    _save_jellystat_cache(cache_path, index, time.time())
                _touch_jellystat_refresh_marker()
        except Exception as exc:
            logger.warning("Jellystat refresh failed: %s", exc)
        finally:
            _release_jellystat_refresh_lock(lock_path, fd)
            _reset_tautulli_match_progress()

    thread = threading.Thread(target=worker, name="sortarr-jellystat-refresh", daemon=True)
    thread.start()
    return True


def _is_future_year(value) -> bool:
    text = str(value or "").strip()
    if not text:
        return False
    try:
        year_int = int(text)
    except ValueError:
        return False
    return year_int > datetime.date.today().year


def _row_is_available(row: dict, media_type: str) -> bool:
    if media_type == "shows":
        try:
            return int(row.get("EpisodesCounted") or 0) > 0
        except (TypeError, ValueError):
            return False
    try:
        return float(row.get("FileSizeGB") or 0) > 0
    except (TypeError, ValueError):
        return False


def _tautulli_row_eligible(row: dict, media_type: str) -> tuple[bool, str]:
    if _is_future_year(row.get("Year")):
        return False, "Release year is in the future"
    if _row_is_available(row, media_type):
        return True, ""
    if media_type == "shows":
        return False, "Skipped: no episodes on disk"
    return False, "Skipped: no file on disk"


def _find_tautulli_stats_with_bucket(
    row: dict,
    index: dict,
    media_type: str,
) -> tuple[dict | None, str]:
    data = index.get(media_type) if index else None
    if not data:
        return None, ""

    tvdb_index = data.get("tvdb", {})
    tmdb_index = data.get("tmdb", {})
    imdb_index = data.get("imdb", {})
    title_year_index = data.get("title_year", {})
    title_index = data.get("title", {})
    title_year_relaxed_index = data.get("title_year_relaxed", {})
    title_relaxed_index = data.get("title_relaxed", {})
    title_year_variant_index = data.get("title_year_variant", {})
    title_variant_index = data.get("title_variant", {})

    if media_type == "shows":
        tvdb_id = str(row.get("TvdbId") or "").strip()
        if tvdb_id and tvdb_id in tvdb_index:
            return tvdb_index[tvdb_id], "TVDB ID"
    tmdb_id = str(row.get("TmdbId") or "").strip()
    if tmdb_id and tmdb_id in tmdb_index:
        return tmdb_index[tmdb_id], "TMDB ID"
    imdb_id = str(row.get("ImdbId") or "").strip()
    if imdb_id and imdb_id in imdb_index:
        return imdb_index[imdb_id], "IMDB ID"

    title_value = row.get("Title") or ""
    year = str(row.get("Year") or "").strip()
    title_key = _normalize_title_key(title_value) if title_value else ""
    if title_key and year and (title_key, year) in title_year_index:
        return title_year_index[(title_key, year)], "Title + year"
    if year:
        if title_value:
            relaxed_key = _relaxed_title_key(title_value)
            if relaxed_key and (relaxed_key, year) in title_year_relaxed_index:
                return title_year_relaxed_index[(relaxed_key, year)], "Title + year (relaxed)"
            variant_keys = _title_variant_keys(title_value)
            if variant_keys:
                for key in variant_keys:
                    if (key, year) in title_year_variant_index:
                        return title_year_variant_index[(key, year)], "Title variant + year"
    else:
        if title_key and title_key in title_index:
            return title_index[title_key], "Title"
        if title_value:
            relaxed_key = _relaxed_title_key(title_value)
            if relaxed_key and relaxed_key in title_relaxed_index:
                return title_relaxed_index[relaxed_key], "Title (relaxed)"
            variant_keys = _title_variant_keys(title_value)
            if variant_keys:
                for key in variant_keys:
                    if key in title_variant_index:
                        return title_variant_index[key], "Title variant"

    return None, ""


def _diagnostic_index_hits(row: dict, index: dict, media_type: str) -> list[str]:
    data = index.get(media_type) if index else None
    if not data:
        return []
    hits = []
    tvdb_index = data.get("tvdb", {})
    tmdb_index = data.get("tmdb", {})
    imdb_index = data.get("imdb", {})
    title_year_index = data.get("title_year", {})
    title_index = data.get("title", {})
    title_year_relaxed_index = data.get("title_year_relaxed", {})
    title_relaxed_index = data.get("title_relaxed", {})
    title_year_variant_index = data.get("title_year_variant", {})
    title_variant_index = data.get("title_variant", {})
    if media_type == "shows":
        tvdb_id = str(row.get("TvdbId") or "").strip()
        if tvdb_id and tvdb_id in tvdb_index:
            hits.append("tvdb")
    tmdb_id = str(row.get("TmdbId") or "").strip()
    if tmdb_id and tmdb_id in tmdb_index:
        hits.append("tmdb")
    imdb_id = str(row.get("ImdbId") or "").strip()
    if imdb_id and imdb_id in imdb_index:
        hits.append("imdb")

    title_value = row.get("Title") or ""
    year = str(row.get("Year") or "").strip()
    title_key = _normalize_title_key(title_value) if title_value else ""
    if title_key:
        if year and (title_key, year) in title_year_index:
            hits.append("title_year")
        if title_key in title_index:
            hits.append("title")
    if title_value:
        relaxed_key = _relaxed_title_key(title_value)
        if relaxed_key:
            if year and (relaxed_key, year) in title_year_relaxed_index:
                hits.append("title_year_relaxed")
            if relaxed_key in title_relaxed_index:
                hits.append("title_relaxed")
        variant_keys = _title_variant_keys(title_value)
        if variant_keys:
            if year:
                for key in variant_keys:
                    if (key, year) in title_year_variant_index:
                        hits.append("title_year_variant")
                        break
            for key in variant_keys:
                if key in title_variant_index:
                    hits.append("title_variant")
                    break
    return hits


def _diagnostic_row_summary(row: dict, media_type: str) -> dict:
    summary = {
        "title": row.get("Title") or "",
        "year": row.get("Year") or "",
        "title_slug": row.get("TitleSlug") or "",
        "tmdb_id": row.get("TmdbId") or "",
        "imdb_id": row.get("ImdbId") or "",
        "instance_id": row.get("InstanceId") or "",
        "instance_name": row.get("InstanceName") or "",
        "path": row.get("Path") or "",
        "content_hours": row.get("ContentHours") or "",
        "tautulli_match_status": row.get("TautulliMatchStatus") or "",
        "tautulli_match_reason": row.get("TautulliMatchReason") or "",
        "play_count": row.get("PlayCount") or 0,
        "users_watched": row.get("UsersWatched") or 0,
        "last_watched": row.get("LastWatched") or "",
        "total_watch_time_hours": row.get("TotalWatchTimeHours") or 0,
        "watch_content_ratio": row.get("WatchContentRatio") or "",
    }
    if media_type == "shows":
        summary["tvdb_id"] = row.get("TvdbId") or ""
        summary["episodes_counted"] = row.get("EpisodesCounted") or 0
    else:
        summary["runtime_mins"] = row.get("RuntimeMins") or ""
        summary["file_size_gb"] = row.get("FileSizeGB") or ""
    return summary


def _diagnostic_match_inputs(row: dict, media_type: str) -> dict:
    title = row.get("Title") or ""
    year = str(row.get("Year") or "").strip()
    inputs = {
        "title": title,
        "year": year,
        "title_key": _normalize_title_key(title),
        "title_key_relaxed": _relaxed_title_key(title),
        "title_key_variants": _title_variant_keys(title),
        "tmdb_id": str(row.get("TmdbId") or "").strip(),
        "imdb_id": str(row.get("ImdbId") or "").strip(),
    }
    if media_type == "shows":
        inputs["tvdb_id"] = str(row.get("TvdbId") or "").strip()
    return inputs


def _diagnostic_match_key(row: dict, index: dict, media_type: str) -> tuple[str, str, str]:
    data = index.get(media_type) if index else None
    if not data:
        return "", "", ""

    tvdb_index = data.get("tvdb", {})
    tmdb_index = data.get("tmdb", {})
    imdb_index = data.get("imdb", {})
    title_year_index = data.get("title_year", {})
    title_index = data.get("title", {})
    title_year_relaxed_index = data.get("title_year_relaxed", {})
    title_relaxed_index = data.get("title_relaxed", {})
    title_year_variant_index = data.get("title_year_variant", {})
    title_variant_index = data.get("title_variant", {})

    if media_type == "shows":
        tvdb_id = str(row.get("TvdbId") or "").strip()
        if tvdb_id and tvdb_id in tvdb_index:
            return "TVDB ID", tvdb_id, ""
    tmdb_id = str(row.get("TmdbId") or "").strip()
    if tmdb_id and tmdb_id in tmdb_index:
        return "TMDB ID", tmdb_id, ""
    imdb_id = str(row.get("ImdbId") or "").strip()
    if imdb_id and imdb_id in imdb_index:
        return "IMDB ID", imdb_id, ""

    title_key = _normalize_title_key(row.get("Title") or "")
    relaxed_key = _relaxed_title_key(row.get("Title") or "")
    variant_keys = _title_variant_keys(row.get("Title") or "")
    year = str(row.get("Year") or "").strip()
    if title_key and year and (title_key, year) in title_year_index:
        return "Title + year", title_key, year
    if relaxed_key and year and (relaxed_key, year) in title_year_relaxed_index:
        return "Title + year (relaxed)", relaxed_key, year
    if variant_keys and year:
        for key in variant_keys:
            if (key, year) in title_year_variant_index:
                return "Title variant + year", key, year
    if not year:
        if title_key and title_key in title_index:
            return "Title", title_key, ""
        if relaxed_key and relaxed_key in title_relaxed_index:
            return "Title (relaxed)", relaxed_key, ""
        if variant_keys:
            for key in variant_keys:
                if key in title_variant_index:
                    return "Title variant", key, ""

    return "", "", ""


def _diagnostic_find_row(rows: list[dict], payload: dict, app_name: str) -> tuple[dict | None, str]:
    instance_id = str(payload.get("instance_id") or "").strip()
    if instance_id:
        rows = [row for row in rows if str(row.get("InstanceId") or "").strip() == instance_id]
    if not rows:
        return None, "instance_id"

    def match_by(field: str, value: str) -> dict | None:
        if not value:
            return None
        for row in rows:
            if str(row.get(field) or "").strip() == value:
                return row
        return None

    if app_name == "sonarr":
        for key in ("tvdb_id", "tmdb_id", "imdb_id", "title_slug"):
            value = str(payload.get(key) or "").strip()
            field = {
                "tvdb_id": "TvdbId",
                "tmdb_id": "TmdbId",
                "imdb_id": "ImdbId",
                "title_slug": "TitleSlug",
            }[key]
            row = match_by(field, value)
            if row:
                return row, key
    else:
        for key in ("tmdb_id", "imdb_id"):
            value = str(payload.get(key) or "").strip()
            field = {"tmdb_id": "TmdbId", "imdb_id": "ImdbId"}[key]
            row = match_by(field, value)
            if row:
                return row, key

    path = str(payload.get("path") or "").strip()
    if path:
        row = match_by("Path", path)
        if row:
            return row, "path"

    title = str(payload.get("title") or "").strip()
    year = str(payload.get("year") or "").strip()
    if title:
        title_key = _normalize_title_key(title)
        relaxed_key = _relaxed_title_key(title)
        for row in rows:
            row_title = row.get("Title") or ""
            if not row_title:
                continue
            row_key = _normalize_title_key(row_title)
            row_relaxed = _relaxed_title_key(row_title)
            row_year = str(row.get("Year") or "").strip()
            if year and row_year and row_year != year:
                continue
            if title_key and row_key and row_key == title_key:
                return row, "title"
            if relaxed_key and row_relaxed and row_relaxed == relaxed_key:
                return row, "title_relaxed"
    return None, "title"


def _find_tautulli_stats(row: dict, index: dict, media_type: str) -> dict | None:
    raw, _ = _find_tautulli_stats_with_bucket(row, index, media_type)
    return raw


def _apply_tautulli_stats_once(
    entry: dict,
    index: dict,
    media_type: str,
    index_ts: int,
    progress_media_type: str | None = None,
    provider_label: str = "Tautulli",
) -> bool:
    if not isinstance(entry, dict):
        return False
    data = entry.get("data")
    if not isinstance(data, list) or not data:
        return False
    if index_ts and _safe_int(entry.get("tautulli_index_ts")) == index_ts:
        sample = data[0]
        if isinstance(sample, dict) and "TautulliMatchStatus" in sample:
            return False
    _apply_tautulli_stats(
        data,
        index,
        media_type,
        progress_media_type=progress_media_type,
        provider_label=provider_label,
    )
    if index_ts:
        entry["tautulli_index_ts"] = index_ts
    return True


def _apply_tautulli_stats(
    rows: list[dict],
    index: dict,
    media_type: str,
    progress_media_type: str | None = None,
    provider_label: str = "Tautulli",
):
    now_ts = time.time()
    data = index.get(media_type) if index else None
    has_index_data = bool(data) and any(bucket for bucket in data.values() if bucket)
    provider_label = provider_label or "Tautulli"
    for row in rows:
        row["TautulliMatched"] = False
        row["TautulliMatchStatus"] = "unavailable"
        row["TautulliMatchReason"] = f"{provider_label} data unavailable"
        row["WatchContentRatio"] = ""
        row["TautulliRatingKey"] = ""
        row["TautulliSectionId"] = ""
        status = "unavailable"
        if not has_index_data:
            _advance_tautulli_match_progress(progress_media_type, status)
            continue
        eligible, skip_reason = _tautulli_row_eligible(row, media_type)
        if not eligible:
            row["TautulliMatchStatus"] = "skipped"
            row["TautulliMatchReason"] = skip_reason
            status = "skipped"
            _advance_tautulli_match_progress(progress_media_type, status)
            continue

        raw, bucket = _find_tautulli_stats_with_bucket(row, index, media_type)
        if raw:
            row.update(_tautulli_finalize_stats(raw, now_ts))
            row["TautulliMatched"] = True
            row["TautulliMatchStatus"] = "matched"
            if bucket:
                row["TautulliMatchReason"] = f"Matched by {bucket}"
            else:
                row["TautulliMatchReason"] = f"Matched by {provider_label}"
            status = "matched"
            if provider_label == "Tautulli":
                rating_key = str(raw.get("rating_key") or "").strip()
                section_id = str(raw.get("section_id") or "").strip()
                if section_id:
                    row["TautulliSectionId"] = section_id
                if rating_key and bucket in SAFE_TAUTULLI_REFRESH_BUCKETS:
                    row["TautulliRatingKey"] = rating_key
            content_hours = row.get("ContentHours")
            try:
                content_hours_val = float(content_hours)
                watch_hours_val = float(row.get("TotalWatchTimeHours") or 0)
            except (TypeError, ValueError):
                content_hours_val = 0
            if content_hours_val > 0:
                row["WatchContentRatio"] = round(watch_hours_val / content_hours_val, 4)
        else:
            row["TautulliMatchStatus"] = "unmatched"
            row["TautulliMatchReason"] = f"No {provider_label} match for IDs or title"
            status = "unmatched"
        _advance_tautulli_match_progress(progress_media_type, status)


def _bytes_to_gib(b: int) -> float:
    return round(b / (1024 ** 3), 2)


def _most_common(values: list[str]) -> str:
    counts = {}
    for v in values:
        if not v:
            continue
        counts[v] = counts.get(v, 0) + 1
    if not counts:
        return ""
    return max(counts.items(), key=lambda x: x[1])[0]


def _format_unique_values(values: list[str]) -> str:
    counts = {}
    for v in values:
        if not v:
            continue
        counts[v] = counts.get(v, 0) + 1
    if not counts:
        return ""
    ordered = sorted(
        counts.keys(),
        key=lambda k: (-counts[k], str(k).lower()),
    )
    return ", ".join(ordered)


def _is_mixed(values: list[str]) -> bool:
    uniq = {v for v in values if v}
    return len(uniq) > 1


def _languages_mixed(values) -> bool:
    if not values:
        return False
    combined = set()
    for value in values:
        parts = _normalize_language_values(value)
        if "mul" in parts:
            return True
        filtered = [p for p in parts if p not in {"und", "unknown"}]
        if len(set(filtered)) > 1:
            return True
        combined.update(filtered)
        if len(combined) > 1:
            return True
    return False


def _quality_from_file(f: dict) -> str:
    return (
        f.get("quality", {})
        .get("quality", {})
        .get("name", "")
    )


def _resolution_from_file(f: dict) -> str:
    media = f.get("mediaInfo") or {}
    res = (media.get("resolution") or "").strip()
    if not res:
        return ""

    scan = (media.get("scanType") or media.get("videoScanType") or "").lower()
    is_interlaced = "interlaced" in scan or scan == "i"
    suffix = "i" if is_interlaced else "p"

    match = re.search(r"(\d{3,4})\s*x\s*(\d{3,4})\s*([pi])?$", res.lower())
    if match:
        width = match.group(1)
        height = match.group(2)
        existing = match.group(3)
        return f"{width}x{height}{existing or suffix}"

    match = re.search(r"(\d{3,4})\s*([pi])$", res.lower())
    if match:
        return f"{match.group(1)}{match.group(2)}"

    match = re.search(r"(\d{3,4})", res)
    if match:
        return f"{match.group(1)}{suffix}"

    return res


def _audio_format_from_file(f: dict) -> str:
    return (f.get("mediaInfo") or {}).get("audioCodec", "") or ""


def _audio_channels_from_file(f: dict):
    return (f.get("mediaInfo") or {}).get("audioChannels", "")


def _normalize_language_values(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, (list, tuple, set)):
        raw = []
        for item in value:
            if isinstance(item, (list, tuple, set)):
                raw.extend(item)
            else:
                raw.append(item)
    elif isinstance(value, str):
        raw = re.split(r"[,/|;]+", value)
    else:
        raw = [value]

    out = []
    for item in raw:
        if item is None:
            continue
        if isinstance(item, dict):
            item = item.get("name") or item.get("value") or item.get("id")
        text = str(item).strip()
        if text:
            out.append(text)
    return out


def _format_language_list(value) -> str:
    values = _normalize_language_values(value)
    if not values:
        return ""
    seen = set()
    ordered = []
    for val in values:
        if val in seen:
            continue
        seen.add(val)
        ordered.append(val)
    return ", ".join(ordered)


def _merge_language_values(values) -> str:
    if not values:
        return ""
    combined = []
    seen = set()
    for value in values:
        parts = _normalize_language_values(value)
        for part in parts:
            if not part or part in seen:
                continue
            seen.add(part)
            combined.append(part)
    return ", ".join(combined)


def _audio_languages_from_file(f: dict) -> str:
    media = f.get("mediaInfo") or {}
    return _format_language_list(
        media.get("audioLanguages") or f.get("audioLanguages") or f.get("languages") or ""
    )


def _subtitle_languages_from_file(f: dict) -> str:
    media = f.get("mediaInfo") or {}
    return _format_language_list(media.get("subtitles") or f.get("subtitles") or "")


def _format_custom_formats(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, (list, tuple, set)):
        raw = value
    else:
        raw = [value]
    out = []
    for item in raw:
        if item is None:
            continue
        if isinstance(item, dict):
            item = item.get("name") or item.get("format") or item.get("id") or ""
        text = str(item).strip()
        if text:
            out.append(text)
    seen = set()
    ordered = []
    for val in out:
        if val in seen:
            continue
        seen.add(val)
        ordered.append(val)
    return ordered


def _video_codec_from_file(f: dict) -> str:
    media = f.get("mediaInfo") or {}
    return media.get("videoCodec") or f.get("videoCodec") or ""


def _video_hdr_from_file(f: dict) -> str:
    media = f.get("mediaInfo") or {}
    for key in [
        "videoHdrFormat",
        "videoHdrFormatCompatibility",
        "videoHdrFormatProfile",
        "videoDynamicRange",
        "videoDynamicRangeType",
    ]:
        value = media.get(key) or f.get(key)
        if not value:
            continue
        if isinstance(value, (list, tuple, set)):
            return ", ".join([v for v in value if v])
        return str(value)
    return ""


def _bitrate_mbps_from_file(f: dict) -> float:
    media = f.get("mediaInfo") or {}
    video = _safe_int(media.get("videoBitrate"))
    audio = _safe_int(media.get("audioBitrate"))
    total = video + audio if video and audio else (video or audio)
    if total <= 0:
        return 0.0
    return round(total / 1_000_000, 2)


def _build_sonarr_row(
    series: dict,
    files: list[dict] | None,
    tag_map: dict[int, str] | None = None,
    profile_map: dict[int, str] | None = None,
    exclude_specials: bool = False,
    missing_counts: dict[int, int] | None = None,
    cutoff_counts: dict[int, int] | None = None,
    recently_grabbed: set[int] | None = None,
) -> dict | None:
    series_id = series.get("id")
    if series_id is None:
        return None
    title = series.get("title") or ""
    date_added = series.get("added") or ""
    title_slug = series.get("titleSlug") or ""  # IMPORTANT for Sonarr UI links
    path = series.get("path") or ""
    root_folder = series.get("rootFolderPath") or _derive_root_folder(path)
    year = series.get("year") or ""
    tvdb_id = series.get("tvdbId") or ""
    imdb_id = series.get("imdbId") or ""
    tmdb_id = series.get("tmdbId") or ""
    runtime_mins = _safe_int(series.get("runtime") or 0)
    status = series.get("status") or ""
    monitored = series.get("monitored")
    profile_name = series.get("profileName") or ""
    profile_id = series.get("qualityProfileId")
    tags = series.get("tags") or []
    tag_labels = _format_tag_labels(tags, tag_map or {})
    series_type = series.get("seriesType") or ""
    original_language = _format_original_language(series.get("originalLanguage"))
    studio = _format_series_studio(series)
    genres = _format_genres(series.get("genres") or [])
    last_aired = series.get("lastAired") or ""
    next_airing = series.get("nextAiring") or ""
    use_scene_numbering = bool(series.get("useSceneNumbering"))

    fast_stats = files is None
    all_files = [] if fast_stats else (files or [])
    non_special_files = [
        f for f in all_files if int(f.get("seasonNumber") or -1) != 0
    ]
    metric_files = non_special_files if not fast_stats else []

    if fast_stats:
        stats = series.get("statistics") or {}
        count = _safe_int(stats.get("episodeFileCount") or 0)
        total_bytes_all = _safe_int(stats.get("sizeOnDisk") or 0)
        total_bytes_regular = total_bytes_all
    else:
        count = len(non_special_files)
        total_bytes_regular = sum(int(f.get("size") or 0) for f in non_special_files)
        total_bytes_all = total_bytes_regular if exclude_specials else sum(
            int(f.get("size") or 0) for f in all_files
        )
    content_hours = ""
    content_count = count if fast_stats else len(non_special_files)
    if runtime_mins > 0 and content_count:
        content_hours = round((runtime_mins * content_count) / 60.0, 2)

    season_count = 0
    seasons = series.get("seasons") or []
    for season in seasons:
        season_number_raw = season.get("seasonNumber")
        try:
            season_number = int(season_number_raw)
        except (TypeError, ValueError):
            continue
        if season_number <= 0:
            continue
        stats = season.get("statistics") or {}
        episode_file_count = _safe_int(stats.get("episodeFileCount"))
        if episode_file_count > 0:
            season_count += 1

    qualities = [_quality_from_file(f) for f in metric_files]
    resolutions = [_resolution_from_file(f) for f in metric_files]
    audio_formats = [_audio_format_from_file(f) for f in metric_files]
    audio_channel_values = [
        str(_audio_channels_from_file(f) or "") for f in metric_files
    ]
    audio_languages = [_audio_languages_from_file(f) for f in metric_files]
    subtitle_languages = [_subtitle_languages_from_file(f) for f in metric_files]
    video_codecs = [_video_codec_from_file(f) for f in metric_files]
    video_hdrs = [_video_hdr_from_file(f) for f in metric_files]
    release_groups = [str(f.get("releaseGroup") or "") for f in metric_files]

    video_quality = _most_common(qualities)
    resolution = _most_common(resolutions)
    audio_format = _most_common(audio_formats)
    audio_channels = _most_common(audio_channel_values)
    audio_codec_mixed = _is_mixed(audio_formats)
    audio_codecs_all = _format_unique_values(audio_formats)
    video_quality_mixed = _is_mixed(qualities)
    video_quality_all = _format_unique_values(qualities)
    resolution_mixed = _is_mixed(resolutions)
    resolution_all = _format_unique_values(resolutions)
    audio_languages_value = _most_common(audio_languages)
    subtitle_languages_value = _most_common(subtitle_languages)
    audio_languages_all = _merge_language_values(audio_languages)
    subtitle_languages_all = _merge_language_values(subtitle_languages)
    audio_languages_mixed = _languages_mixed(audio_languages)
    subtitle_languages_mixed = _languages_mixed(subtitle_languages)
    video_codec = _most_common(video_codecs)
    video_codec_mixed = _is_mixed(video_codecs)
    video_codec_all = _format_unique_values(video_codecs)
    video_hdr = _most_common(video_hdrs)
    release_group = _most_common(release_groups)
    quality_profile = _resolve_quality_profile_name(profile_name, profile_id, profile_map or {})
    audio_channels_mixed = _is_mixed(audio_channel_values)
    audio_channels_all = _format_unique_values(audio_channel_values)

    total_gib = _bytes_to_gib(total_bytes_all)
    total_gib_regular = _bytes_to_gib(total_bytes_regular)
    avg_gib = round((total_bytes_regular / count) / (1024 ** 3), 2) if count else 0.0
    gb_per_hour = 0.0
    bitrate_mbps = 0.0
    bitrate_estimated = False
    runtime_seconds = runtime_mins * count * 60 if runtime_mins > 0 and count else 0
    if runtime_seconds > 0 and total_gib_regular > 0:
        gb_per_hour = round(total_gib_regular / (runtime_seconds / 3600.0), 2)
        bitrate_bps = (total_bytes_regular * 8) / runtime_seconds
        bitrate_mbps = round(bitrate_bps / 1_000_000, 2)
        bitrate_estimated = True
    missing_count = (missing_counts or {}).get(series_id, 0)
    cutoff_count = (cutoff_counts or {}).get(series_id, 0)
    recently_grabbed_flag = series_id in (recently_grabbed or set())

    return {
        "SeriesId": series_id,
        "Title": title,
        "DateAdded": date_added,
        "TitleSlug": title_slug,
        "Year": year,
        "TvdbId": tvdb_id,
        "ImdbId": imdb_id,
        "TmdbId": tmdb_id,
        "Status": status,
        "Monitored": monitored,
        "QualityProfile": quality_profile,
        "Tags": tag_labels,
        "ReleaseGroup": release_group,
        "SeriesType": series_type,
        "Studio": studio,
        "OriginalLanguage": original_language,
        "Genres": genres,
        "LastAired": last_aired,
        "MissingCount": missing_count,
        "CutoffUnmetCount": cutoff_count,
        "RecentlyGrabbed": recently_grabbed_flag,
        "UseSceneNumbering": use_scene_numbering,
        "Airing": bool(next_airing),
        "SeasonCount": season_count,
        "EpisodesCounted": count,
        "TotalSizeGB": total_gib,
        "AvgEpisodeSizeGB": avg_gib,
        "GBPerHour": gb_per_hour if gb_per_hour else "",
        "BitrateMbps": bitrate_mbps if bitrate_mbps else "",
        "BitrateEstimated": bitrate_estimated if bitrate_mbps else False,
        "ContentHours": content_hours,
        "VideoQuality": video_quality,
        "VideoQualityMixed": video_quality_mixed,
        "VideoQualityAll": video_quality_all,
        "Resolution": resolution,
        "ResolutionMixed": resolution_mixed,
        "ResolutionAll": resolution_all,
        "AudioCodec": audio_format,
        "AudioChannels": audio_channels,
        "AudioChannelsMixed": audio_channels_mixed,
        "AudioChannelsAll": audio_channels_all,
        "AudioLanguages": audio_languages_value,
        "SubtitleLanguages": subtitle_languages_value,
        "AudioCodecMixed": audio_codec_mixed,
        "AudioCodecAll": audio_codecs_all,
        "AudioLanguagesAll": audio_languages_all,
        "SubtitleLanguagesAll": subtitle_languages_all,
        "AudioLanguagesMixed": audio_languages_mixed,
        "SubtitleLanguagesMixed": subtitle_languages_mixed,
        "VideoCodec": video_codec,
        "VideoCodecMixed": video_codec_mixed,
        "VideoCodecAll": video_codec_all,
        "VideoHDR": video_hdr,
        "RootFolder": root_folder,
        "Path": path,
    }


def _build_sonarr_season_summaries(series: dict) -> list[dict]:
    seasons = series.get("seasons") or []
    out: list[dict] = []
    for season in seasons:
        season_number_raw = season.get("seasonNumber")
        try:
            season_number = int(season_number_raw)
        except (TypeError, ValueError):
            continue
        stats = season.get("statistics") or {}
        episode_count = _safe_int(stats.get("totalEpisodeCount") or stats.get("episodeCount"))
        episode_file_count = _safe_int(stats.get("episodeFileCount"))
        size_on_disk = _safe_int(stats.get("sizeOnDisk"))
        avg_size = 0.0
        if episode_file_count:
            avg_size = round((size_on_disk / episode_file_count) / (1024 ** 3), 2)
        out.append(
            {
                "seasonNumber": season_number,
                "episodeCount": episode_count,
                "episodeFileCount": episode_file_count,
                "sizeOnDiskGiB": _bytes_to_gib(size_on_disk),
                "avgEpisodeSizeGiB": avg_size,
                "monitored": season.get("monitored"),
                "isSpecials": season_number == 0,
            }
        )
    out.sort(key=lambda item: item.get("seasonNumber", 0))
    return out


def _build_sonarr_episode_payload(
    episode: dict,
    file_map: dict[int, dict] | None,
    fast_mode: bool,
) -> dict:
    episode_id = episode.get("id")
    file_id = episode.get("episodeFileId") or 0
    file = file_map.get(file_id) if file_map and file_id else None
    has_file = bool(episode.get("hasFile"))
    custom_format_score = episode.get("customFormatScore")
    if custom_format_score == "" or custom_format_score is None:
        custom_format_score = ""
    else:
        custom_format_score = _safe_float(custom_format_score)
    quality_cutoff = ""
    if isinstance(episode, dict) and "qualityCutoffNotMet" in episode:
        quality_cutoff = bool(episode.get("qualityCutoffNotMet"))
    payload = {
        "episodeId": episode_id or 0,
        "seasonNumber": _safe_int(episode.get("seasonNumber")),
        "episodeNumber": _safe_int(episode.get("episodeNumber")),
        "title": episode.get("title") or "",
        "overview": episode.get("overview") or "",
        "airDate": episode.get("airDate") or "",
        "airDateUtc": episode.get("airDateUtc") or "",
        "runtimeMins": _safe_int(episode.get("runtime") or 0),
        "lastSearchTime": episode.get("lastSearchTime") or "",
        "monitored": episode.get("monitored"),
        "hasFile": has_file,
        "fileSizeGiB": "",
        "quality": "",
        "resolution": "",
        "videoCodec": "",
        "audioCodec": "",
        "audioChannels": "",
        "audioLanguages": "",
        "subtitleLanguages": "",
        "customFormats": _format_custom_formats(episode.get("customFormats") or []),
        "customFormatScore": custom_format_score,
        "qualityCutoffNotMet": quality_cutoff,
        "releaseGroup": "",
        "path": "",
    }
    if not fast_mode and file:
        payload["fileSizeGiB"] = _bytes_to_gib(_safe_int(file.get("size")))
        payload["quality"] = _quality_from_file(file)
        payload["resolution"] = _resolution_from_file(file)
        payload["videoCodec"] = _video_codec_from_file(file)
        payload["audioCodec"] = _audio_format_from_file(file)
        payload["audioChannels"] = str(_audio_channels_from_file(file) or "")
        payload["audioLanguages"] = _audio_languages_from_file(file)
        payload["subtitleLanguages"] = _subtitle_languages_from_file(file)
        payload["customFormats"] = _format_custom_formats(
            file.get("customFormats") or payload["customFormats"]
        )
        file_score = file.get("customFormatScore")
        if file_score != "" and file_score is not None:
            payload["customFormatScore"] = _safe_float(file_score)
        if "qualityCutoffNotMet" in file:
            payload["qualityCutoffNotMet"] = bool(file.get("qualityCutoffNotMet"))
        payload["releaseGroup"] = file.get("releaseGroup") or ""
        payload["path"] = file.get("path") or ""
    return payload


def _compute_sonarr(
    base_url: str,
    api_key: str,
    exclude_specials: bool = False,
    instance_id: str | int | None = None,
    timing: dict | None = None,
    defer_wanted: bool = False,
):
    total_start = time.perf_counter()
    series_start = time.perf_counter()
    series = _arr_get(base_url, api_key, "/api/v3/series", app_name="sonarr")
    _record_timing(timing, "sonarr_series_ms", series_start)
    tag_start = time.perf_counter()
    tag_map = _fetch_arr_tag_map(base_url, api_key, "sonarr")
    _record_timing(timing, "sonarr_tag_map_ms", tag_start)
    profile_start = time.perf_counter()
    profile_map = _fetch_arr_quality_profile_map(base_url, api_key, "sonarr")
    _record_timing(timing, "sonarr_quality_profile_ms", profile_start)
    series_ids = [s.get("id") for s in series if s.get("id") is not None]
    mode = _read_sonarr_episodefile_mode()
    delay_seconds = _read_float_env("SONARR_EPISODEFILE_DELAY_SECONDS", 0.0)
    cache_seconds = _read_int_env("SONARR_EPISODEFILE_CACHE_SECONDS", 600)
    cache_key = _sonarr_episodefile_cache_key(instance_id, base_url)
    files_by_series: dict[int, list[dict] | None] = {}
    missing_series: list[tuple[int, tuple[int, int] | None]] = []
    missing_counts: dict[int, int] = {}
    cutoff_counts: dict[int, int] = {}
    recently_grabbed: set[int] = set()

    if series_ids:
        cached_start = time.perf_counter()
        cached_wanted = _get_cached_sonarr_wanted(cache_key, cache_seconds)
        _record_timing(timing, "sonarr_wanted_cache_ms", cached_start)
        if cached_wanted:
            missing_counts, cutoff_counts, recently_grabbed = cached_wanted
        elif not defer_wanted:
            missing_start = time.perf_counter()
            try:
                missing_counts = _fetch_sonarr_wanted_counts(
                    base_url,
                    api_key,
                    "/api/v3/wanted/missing",
                    monitored_only=True,
                )
            except Exception as exc:
                logger.warning("Sonarr wanted/missing fetch failed: %s", exc)
                missing_counts = {}
            _record_timing(timing, "sonarr_wanted_missing_ms", missing_start)
            cutoff_start = time.perf_counter()
            try:
                cutoff_counts = _fetch_sonarr_wanted_counts(
                    base_url,
                    api_key,
                    "/api/v3/wanted/cutoff",
                    monitored_only=True,
                )
            except Exception as exc:
                logger.warning("Sonarr wanted/cutoff fetch failed: %s", exc)
                cutoff_counts = {}
            _record_timing(timing, "sonarr_wanted_cutoff_ms", cutoff_start)
            history_start = time.perf_counter()
            try:
                recently_grabbed = _fetch_recently_grabbed_series_ids(base_url, api_key, days=30)
            except Exception as exc:
                logger.warning("Sonarr recent grabbed fetch failed: %s", exc)
                recently_grabbed = set()
            _record_timing(timing, "sonarr_wanted_history_ms", history_start)
            if cache_seconds > 0:
                _set_cached_sonarr_wanted(
                    cache_key,
                    missing_counts,
                    cutoff_counts,
                    recently_grabbed,
                )

    episodefile_stage_start = time.perf_counter()
    if mode != "fast":
        for s in series:
            series_id = s.get("id")
            if series_id is None:
                continue
            stats_key = _sonarr_series_stats_key(s)
            cached = _get_cached_episodefiles(cache_key, series_id, stats_key, cache_seconds)
            if cached is not None:
                files_by_series[series_id] = cached
            else:
                missing_series.append((series_id, stats_key))

    if mode == "bulk" and series_ids:
        if missing_series:
            try:
                bulk_files = _arr_get(base_url, api_key, "/api/v3/episodefile", app_name="sonarr")
                bulk_files_by_series = {}
                for file in bulk_files or []:
                    series_id = file.get("seriesId")
                    if series_id is None:
                        continue
                    bulk_files_by_series.setdefault(series_id, []).append(file)
                for s in series:
                    series_id = s.get("id")
                    if series_id is None:
                        continue
                    stats_key = _sonarr_series_stats_key(s)
                    files = bulk_files_by_series.get(series_id, [])
                    bulk_files_by_series[series_id] = files
                    if cache_seconds > 0:
                        _set_cached_episodefiles(cache_key, series_id, files, stats_key)
                files_by_series.update(bulk_files_by_series)
                missing_series = []
            except Exception as exc:
                logger.warning("Bulk episode file fetch failed, falling back to per-series: %s", exc)
                mode = "series"

    workers = _read_int_env("SONARR_EPISODEFILE_WORKERS", 8)
    if workers <= 0:
        workers = 1
    if mode == "series" and missing_series:
        max_workers = min(workers, len(missing_series)) if missing_series else 0
        thread_local = threading.local()

        def fetch_files(series_id, stats_key):
            session = getattr(thread_local, "session", None)
            if session is None:
                session = requests.Session()
                thread_local.session = session
            try:
                if delay_seconds > 0:
                    time.sleep(delay_seconds)
                files = _arr_get(
                    base_url,
                    api_key,
                    "/api/v3/episodefile",
                    params={"seriesId": series_id},
                    session=session,
                    app_name="sonarr",
                )
            except Exception as exc:
                error_kind = type(exc).__name__
                logger.warning("Episode file fetch failed (%s).", error_kind)
                files = []
            if cache_seconds > 0:
                _set_cached_episodefiles(cache_key, series_id, files, stats_key)
            return series_id, files

        if max_workers > 1:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                for series_id, files in executor.map(lambda args: fetch_files(*args), missing_series):
                    files_by_series[series_id] = files
        else:
            for series_id, stats_key in missing_series:
                files_by_series[series_id] = fetch_files(series_id, stats_key)[1]
    _record_timing(timing, "sonarr_episodefiles_stage_ms", episodefile_stage_start)

    build_rows_start = time.perf_counter()
    results = []
    for s in series:
        series_id = s.get("id")
        if mode == "fast":
            files = None
        elif mode == "series" and series_id in files_by_series:
            files = files_by_series.get(series_id, [])
        elif mode == "series":
            if delay_seconds > 0:
                time.sleep(delay_seconds)
            files = _arr_get(
                base_url,
                api_key,
                "/api/v3/episodefile",
                params={"seriesId": series_id},
                app_name="sonarr",
            )
            if cache_seconds > 0:
                _set_cached_episodefiles(cache_key, series_id, files, _sonarr_series_stats_key(s))
        else:
            files = files_by_series.get(series_id, [])

        row = _build_sonarr_row(
            s,
            files,
            tag_map=tag_map,
            profile_map=profile_map,
            exclude_specials=exclude_specials,
            missing_counts=missing_counts,
            cutoff_counts=cutoff_counts,
            recently_grabbed=recently_grabbed,
        )
        if row:
            results.append(row)

    results.sort(key=lambda x: x["AvgEpisodeSizeGB"], reverse=True)
    _record_timing(timing, "sonarr_build_rows_ms", build_rows_start)
    _record_timing(timing, "sonarr_total_ms", total_start)
    return results


def _compute_sonarr_item(
    base_url: str,
    api_key: str,
    series_id: int,
    exclude_specials: bool = False,
    timing: dict | None = None,
    instance_id: str | int | None = None,
):
    start = time.perf_counter()
    series = _arr_get(
        base_url,
        api_key,
        f"/api/v3/series/{series_id}",
        app_name="sonarr",
    )
    _record_timing(timing, "sonarr_series_ms", start)
    mode = _read_sonarr_episodefile_mode()
    delay_seconds = _read_float_env("SONARR_EPISODEFILE_DELAY_SECONDS", 0.0)
    start = time.perf_counter()
    if mode == "fast":
        files = None
    else:
        if delay_seconds > 0:
            time.sleep(delay_seconds)
        files = _arr_get(
            base_url,
            api_key,
            "/api/v3/episodefile",
            params={"seriesId": series_id},
            app_name="sonarr",
        )
    _record_timing(timing, "sonarr_episodefiles_ms", start)
    tag_map = _fetch_arr_tag_map(base_url, api_key, "sonarr")
    profile_map = _fetch_arr_quality_profile_map(base_url, api_key, "sonarr")
    cache_seconds = _read_int_env("SONARR_EPISODEFILE_CACHE_SECONDS", 600)
    cache_key = _sonarr_episodefile_cache_key(instance_id, base_url)
    missing_counts: dict[int, int] = {}
    cutoff_counts: dict[int, int] = {}
    recently_grabbed: set[int] = set()
    cached_wanted = _get_cached_sonarr_wanted(cache_key, cache_seconds)
    if cached_wanted:
        missing_counts, cutoff_counts, recently_grabbed = cached_wanted
    else:
        try:
            missing_counts = _fetch_sonarr_wanted_counts(
                base_url,
                api_key,
                "/api/v3/wanted/missing",
                monitored_only=True,
            )
        except Exception as exc:
            logger.warning("Sonarr wanted/missing fetch failed: %s", exc)
            missing_counts = {}
        try:
            cutoff_counts = _fetch_sonarr_wanted_counts(
                base_url,
                api_key,
                "/api/v3/wanted/cutoff",
                monitored_only=True,
            )
        except Exception as exc:
            logger.warning("Sonarr wanted/cutoff fetch failed: %s", exc)
            cutoff_counts = {}
        try:
            recently_grabbed = _fetch_recently_grabbed_series_ids(base_url, api_key, days=30)
        except Exception as exc:
            logger.warning("Sonarr recent grabbed fetch failed: %s", exc)
            recently_grabbed = set()
        if cache_seconds > 0:
            _set_cached_sonarr_wanted(cache_key, missing_counts, cutoff_counts, recently_grabbed)

    return _build_sonarr_row(
        series,
        files,
        tag_map=tag_map,
        profile_map=profile_map,
        exclude_specials=exclude_specials,
        missing_counts=missing_counts,
        cutoff_counts=cutoff_counts,
        recently_grabbed=recently_grabbed,
    )


def _get_sonarr_season_payload(
    instance: dict,
    series_id: int,
    include_specials: bool,
) -> tuple[list[dict], bool]:
    base_url = instance.get("url") or ""
    api_key = instance.get("api_key") or ""
    cache_seconds = _read_int_env("SONARR_EPISODEFILE_CACHE_SECONDS", 600)
    cache_key = _sonarr_episodefile_cache_key(instance.get("id"), base_url)
    cached = _get_cached_sonarr_seasons(cache_key, series_id, None, cache_seconds)
    if cached is None:
        series = _arr_get(
            base_url,
            api_key,
            f"/api/v3/series/{series_id}",
            app_name="sonarr",
        )
        seasons = _build_sonarr_season_summaries(series)
        stats_key = _sonarr_series_episode_stats_key(series)
        if cache_seconds > 0:
            _set_cached_sonarr_seasons(cache_key, series_id, seasons, stats_key)
    else:
        seasons = cached
    if not include_specials:
        seasons = [season for season in seasons if not season.get("isSpecials")]
    fast_mode = _read_sonarr_episodefile_mode() == "fast"
    return seasons, fast_mode


def _get_sonarr_episode_payload(
    instance: dict,
    series_id: int,
    season_number: int,
) -> tuple[list[dict], bool]:
    base_url = instance.get("url") or ""
    api_key = instance.get("api_key") or ""
    cache_seconds = _read_int_env("SONARR_EPISODEFILE_CACHE_SECONDS", 600)
    cache_key = _sonarr_episodefile_cache_key(instance.get("id"), base_url)
    cached = _get_cached_sonarr_episodes(cache_key, series_id, None, cache_seconds)
    if cached is None:
        episodes = _arr_get(
            base_url,
            api_key,
            "/api/v3/episode",
            params={"seriesId": series_id},
            app_name="sonarr",
        )
        if cache_seconds > 0:
            _set_cached_sonarr_episodes(cache_key, series_id, episodes, None)
    else:
        episodes = cached
    fast_mode = _read_sonarr_episodefile_mode() == "fast"
    file_map = None
    if not fast_mode:
        files = _get_cached_episodefiles(cache_key, series_id, None, cache_seconds)
        if files is None:
            files = _arr_get(
                base_url,
                api_key,
                "/api/v3/episodefile",
                params={"seriesId": series_id},
                app_name="sonarr",
            )
            if cache_seconds > 0:
                _set_cached_episodefiles(cache_key, series_id, files, None)
        file_map = {f.get("id"): f for f in files or [] if f.get("id") is not None}

    season_episodes = []
    for episode in episodes or []:
        episode_season = episode.get("seasonNumber")
        try:
            episode_season = int(episode_season)
        except (TypeError, ValueError):
            continue
        if episode_season != season_number:
            continue
        season_episodes.append(_build_sonarr_episode_payload(episode, file_map, fast_mode))
    season_episodes.sort(key=lambda item: (item.get("episodeNumber", 0), item.get("episodeId", 0)))
    return season_episodes, fast_mode


def _radarr_movie_file_needs_custom_format(file: dict) -> bool:
    if not isinstance(file, dict):
        return False
    if "customFormatScore" in file:
        score = file.get("customFormatScore")
        return score is None or score == ""
    return True


def _merge_radarr_movie_files(existing: list[dict], details: list[dict]) -> list[dict]:
    if not existing:
        return details or []
    if not details:
        return existing
    detail_by_id = {
        f.get("id"): f
        for f in details
        if isinstance(f, dict) and f.get("id") is not None
    }
    merged: list[dict] = []
    existing_ids: set[int] = set()
    for f in existing:
        if not isinstance(f, dict):
            merged.append(f)
            continue
        file_id = f.get("id")
        if file_id is not None:
            existing_ids.add(file_id)
        detail = detail_by_id.get(file_id)
        if detail:
            merged.append({**f, **detail})
        else:
            merged.append(f)
    for detail in details:
        if not isinstance(detail, dict):
            continue
        detail_id = detail.get("id")
        if detail_id is None or detail_id in existing_ids:
            continue
        merged.append(detail)
    return merged


def _fetch_radarr_movie_files_by_id(
    base_url: str,
    api_key: str,
    movie_file_ids: list[int],
) -> list[dict]:
    return _fetch_radarr_movie_files_bulk(base_url, api_key, movie_file_ids)


def _fetch_radarr_movie_file_detail(
    base_url: str,
    api_key: str,
    movie_file_id: int,
    timing: dict | None = None,
) -> dict | None:
    try:
        start = time.perf_counter()
        detail = _arr_get(
            base_url,
            api_key,
            f"/api/v3/moviefile/{movie_file_id}",
            app_name="radarr",
            circuit_group="moviefile",
        )
        _record_timing(timing, "radarr_moviefile_ms", start)

    except Exception:
        logger.warning("Radarr moviefile fetch failed (id=%s).", movie_file_id)
        return None

    if isinstance(detail, dict):
        return detail
    return None




def _radarr_movie_files(
    movie: dict,
    base_url: str,
    api_key: str,
    timing: dict | None = None,
) -> list[dict]:
    movie_file = movie.get("movieFile")
    if movie_file:
        if isinstance(movie_file, list):
            missing_ids = []
            for f in movie_file:
                if _radarr_movie_file_needs_custom_format(f):
                    file_id = f.get("id") if isinstance(f, dict) else None
                    if file_id:
                        missing_ids.append(file_id)
            if missing_ids:
                details = _fetch_radarr_movie_files_by_id(base_url, api_key, missing_ids)
                if details:
                    return _merge_radarr_movie_files(movie_file, details)
            return movie_file
        if _radarr_movie_file_needs_custom_format(movie_file):
            movie_file_id = movie_file.get("id") or movie.get("movieFileId")
            if movie_file_id:
                detail = _fetch_radarr_movie_file_detail(
                    base_url,
                    api_key,
                    movie_file_id,
                    timing=timing,
                )
                if detail:
                    return [detail]
        return [movie_file]
    if movie.get("hasFile"):
        radarr_internal_id = movie.get("id")
        if radarr_internal_id is None:
            return []
        start = time.perf_counter()
        files = _arr_get(
            base_url,
            api_key,
            "/api/v3/moviefile",
            params={"movieId": radarr_internal_id},
            app_name="radarr",
        )
        _record_timing(timing, "radarr_moviefile_ms", start)
        return files
    return []


def _fetch_radarr_movie_files_bulk(
    base_url: str,
    api_key: str,
    movie_file_ids: list[int],
) -> list[dict]:
    if not movie_file_ids:
        return []
    seen: set[int] = set()
    unique_ids: list[int] = []
    for movie_file_id in movie_file_ids:
        try:
            movie_file_id = int(movie_file_id)
        except (TypeError, ValueError):
            continue
        if movie_file_id in seen:
            continue
        seen.add(movie_file_id)
        unique_ids.append(movie_file_id)
    if not unique_ids:
        return []
    chunk_size = 200
    files: list[dict] = []
    for idx in range(0, len(unique_ids), chunk_size):
        chunk = unique_ids[idx:idx + chunk_size]
        try:
            batch = _arr_get(
                base_url,
                api_key,
                "/api/v3/moviefile",
                params={"movieFileIds": chunk},
                app_name="radarr",
                circuit_group="moviefile",
            )
        except Exception as exc:
            logger.warning(
                "Radarr moviefile bulk fetch failed (size=%s): %s",
                len(chunk),
                exc,
            )
            continue
        if batch:
            files.extend(batch)
    return files


def _build_radarr_row(
    movie: dict,
    files: list[dict],
    tag_map: dict[int, str] | None = None,
    profile_map: dict[int, str] | None = None,
    missing_ids: set[int] | None = None,
    cutoff_ids: set[int] | None = None,
    recently_grabbed: set[int] | None = None,
) -> dict | None:
    radarr_internal_id = movie.get("id")
    if radarr_internal_id is None:
        return None
    tmdb_id = movie.get("tmdbId")  # IMPORTANT for Radarr UI links
    imdb_id = movie.get("imdbId") or ""
    title = movie.get("title") or ""
    date_added = movie.get("added") or ""
    path = movie.get("path") or ""
    root_folder = movie.get("rootFolderPath") or _derive_root_folder(path)
    runtime = int(movie.get("runtime") or 0)
    content_hours = round(runtime / 60.0, 2) if runtime > 0 else ""
    year = movie.get("year") or ""
    status = movie.get("status") or ""
    monitored = movie.get("monitored")
    profile_id = movie.get("qualityProfileId")
    tags = movie.get("tags") or []
    tag_labels = _format_tag_labels(tags, tag_map or {})
    studio = movie.get("studio") or ""
    original_language = _format_original_language(movie.get("originalLanguage"))
    genres = _format_genres(movie.get("genres") or [])
    has_file = movie.get("hasFile")
    is_available = movie.get("isAvailable")
    in_cinemas = movie.get("inCinemas") or ""
    last_search_time = movie.get("lastSearchTime") or ""
    airing = bool(is_available) if is_available is not None else bool(in_cinemas)
    missing_count = radarr_internal_id in (missing_ids or set())
    cutoff_count = radarr_internal_id in (cutoff_ids or set())
    recently_grabbed_flag = radarr_internal_id in (recently_grabbed or set())

    file_size_bytes = 0
    video_quality = ""
    resolution = ""
    audio_format = ""
    audio_channels = ""
    audio_languages = ""
    subtitle_languages = ""
    video_codec = ""
    video_hdr = ""
    audio_codec_mixed = False
    audio_languages_mixed = False
    subtitle_languages_mixed = False
    audio_codecs_all = ""
    audio_languages_all = ""
    subtitle_languages_all = ""
    file_languages = ""
    bitrate_mbps = 0.0
    bitrate_estimated = False
    release_group = ""
    edition = ""
    custom_formats = ""
    custom_format_score = ""
    quality_cutoff_not_met = ""
    scene_name = ""

    primary = None
    for f in files or []:
        size = int(f.get("size") or 0)
        file_size_bytes += size
        if not primary or size > int(primary.get("size") or 0):
            primary = f

    if primary:
        video_quality = _quality_from_file(primary)
        resolution = _resolution_from_file(primary)
        audio_format = _audio_format_from_file(primary)
        audio_channels = str(_audio_channels_from_file(primary) or "")
        audio_languages = _audio_languages_from_file(primary)
        subtitle_languages = _subtitle_languages_from_file(primary)
        audio_languages_mixed = _languages_mixed([audio_languages])
        subtitle_languages_mixed = _languages_mixed([subtitle_languages])
        video_codec = _video_codec_from_file(primary)
        video_hdr = _video_hdr_from_file(primary)
        bitrate_mbps = _bitrate_mbps_from_file(primary)
        release_group = str(primary.get("releaseGroup") or "")
        edition = str(primary.get("edition") or "")
        scene_name = str(primary.get("sceneName") or "")
        file_languages = _format_language_list(primary.get("languages") or "")
        custom_formats = ", ".join(_format_custom_formats(primary.get("customFormats") or []))
        if not custom_formats:
            custom_formats = ", ".join(_format_custom_formats(movie.get("customFormats") or []))
        score = primary.get("customFormatScore")
        if score == "" or score is None:
            score = movie.get("customFormatScore")
        if score != "" and score is not None:
            custom_format_score = _safe_int(score)
        if "qualityCutoffNotMet" in primary:
            quality_cutoff_not_met = bool(primary.get("qualityCutoffNotMet"))
        audio_codecs_all = audio_format
        audio_languages_all = audio_languages
        subtitle_languages_all = subtitle_languages

    size_gib = _bytes_to_gib(file_size_bytes)

    if not bitrate_mbps and runtime > 0 and file_size_bytes > 0:
        bitrate_bps = (file_size_bytes * 8) / (runtime * 60)
        bitrate_mbps = round(bitrate_bps / 1_000_000, 2)
        bitrate_estimated = True

    gb_per_hour = 0.0
    if runtime > 0 and size_gib > 0:
        gb_per_hour = round(size_gib / (runtime / 60.0), 2)

    quality_profile = _resolve_quality_profile_name("", profile_id, profile_map or {})

    return {
        # Keep internal id if you want it for debugging or future API calls
        "MovieId": radarr_internal_id,
        # Use this for building the Radarr UI link
        "TmdbId": tmdb_id,
        "ImdbId": imdb_id,
        "Title": title,
        "DateAdded": date_added,
        "Year": year,
        "Status": status,
        "Monitored": monitored,
        "QualityProfile": quality_profile,
        "Tags": tag_labels,
        "ReleaseGroup": release_group,
        "Studio": studio,
        "OriginalLanguage": original_language,
        "Genres": genres,
        "MissingCount": missing_count,
        "CutoffUnmetCount": cutoff_count,
        "RecentlyGrabbed": recently_grabbed_flag,
        "HasFile": has_file,
        "IsAvailable": is_available,
        "InCinemas": in_cinemas,
        "LastSearchTime": last_search_time,
        "Edition": edition,
        "CustomFormats": custom_formats,
        "CustomFormatScore": custom_format_score,
        "QualityCutoffNotMet": quality_cutoff_not_met,
        "Languages": file_languages,
        "Scene": bool(scene_name),
        "Airing": airing,
        "RuntimeMins": runtime if runtime else "",
        "ContentHours": content_hours,
        "FileSizeGB": size_gib if size_gib else "",
        "GBPerHour": gb_per_hour if gb_per_hour else "",
        "BitrateMbps": bitrate_mbps if bitrate_mbps else "",
        "BitrateEstimated": bitrate_estimated if bitrate_mbps else False,
        "VideoQuality": video_quality,
        "Resolution": resolution,
        "AudioCodec": audio_format,
        "AudioChannels": audio_channels,
        "AudioLanguages": audio_languages,
        "SubtitleLanguages": subtitle_languages,
        "AudioCodecMixed": audio_codec_mixed,
        "AudioCodecAll": audio_codecs_all,
        "AudioLanguagesAll": audio_languages_all,
        "SubtitleLanguagesAll": subtitle_languages_all,
        "AudioLanguagesMixed": audio_languages_mixed,
        "SubtitleLanguagesMixed": subtitle_languages_mixed,
        "VideoCodec": video_codec,
        "VideoHDR": video_hdr,
        "RootFolder": root_folder,
        "Path": path,
    }


def _radarr_lite_rows(rows: list[dict]) -> list[dict]:
    if not rows:
        return []
    lite_rows = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        lite_rows.append({key: row.get(key) for key in RADARR_LITE_FIELDS if key in row})
    return lite_rows


def _compute_radarr(
    base_url: str,
    api_key: str,
    instance_id: str | int | None = None,
    defer_wanted: bool = False,
):
    movies = _arr_get(base_url, api_key, "/api/v3/movie", app_name="radarr")
    tag_map = _fetch_arr_tag_map(base_url, api_key, "radarr")
    profile_map = _fetch_arr_quality_profile_map(base_url, api_key, "radarr")
    cache_seconds = _read_int_env("CACHE_SECONDS", 300)
    cache_key = _radarr_wanted_cache_key(instance_id, base_url)
    missing_ids: set[int] = set()
    cutoff_ids: set[int] = set()
    recently_grabbed: set[int] = set()
    files_by_movie_id: dict[int, list[dict]] = {}
    bulk_file_ids: list[int] = []
    fallback_movie_ids: set[int] = set()

    if movies:
        for movie in movies:
            movie_id = movie.get("id")
            if movie_id is None:
                continue
            movie_file = movie.get("movieFile")
            if movie_file:
                file_list = movie_file if isinstance(movie_file, list) else [movie_file]
                files_by_movie_id[movie_id] = file_list
                for f in file_list:
                    if _radarr_movie_file_needs_custom_format(f):
                        file_id = f.get("id") if isinstance(f, dict) else None
                        if file_id:
                            bulk_file_ids.append(file_id)
                continue
            if movie.get("hasFile"):
                movie_file_id = movie.get("movieFileId")
                if movie_file_id:
                    bulk_file_ids.append(movie_file_id)
                else:
                    fallback_movie_ids.add(movie_id)

        if bulk_file_ids:
            bulk_files = _fetch_radarr_movie_files_bulk(base_url, api_key, bulk_file_ids)
            files_by_movie: dict[int, list[dict]] = {}
            for file in bulk_files or []:
                movie_id = file.get("movieId")
                if movie_id is None:
                    continue
                files_by_movie.setdefault(movie_id, []).append(file)
            for movie_id, detail_files in files_by_movie.items():
                if movie_id in files_by_movie_id:
                    files_by_movie_id[movie_id] = _merge_radarr_movie_files(
                        files_by_movie_id[movie_id],
                        detail_files,
                    )
                else:
                    files_by_movie_id[movie_id] = detail_files

        cached_wanted = _get_cached_radarr_wanted(cache_key, cache_seconds)
        if cached_wanted:
            missing_ids, cutoff_ids, recently_grabbed = cached_wanted
        elif not defer_wanted:
            wanted_workers = _read_worker_cap("RADARR_WANTED_WORKERS", 2, 4)
            missing_ids, cutoff_ids, recently_grabbed = _fetch_radarr_wanted_bundle(
                base_url,
                api_key,
                wanted_workers,
            )
            if cache_seconds > 0:
                _set_cached_radarr_wanted(cache_key, missing_ids, cutoff_ids, recently_grabbed)

    results = []
    for m in movies:
        movie_id = m.get("id")
        files = files_by_movie_id.get(movie_id) if movie_id is not None else None
        if files is None:
            if movie_id in fallback_movie_ids:
                files = _radarr_movie_files(m, base_url, api_key)
            else:
                files = []
        row = _build_radarr_row(
            m,
            files,
            tag_map=tag_map,
            profile_map=profile_map,
            missing_ids=missing_ids,
            cutoff_ids=cutoff_ids,
            recently_grabbed=recently_grabbed,
        )
        if row:
            results.append(row)

    results.sort(key=lambda x: (x["GBPerHour"] or 0), reverse=True)
    return results


def _compute_radarr_item(
    base_url: str,
    api_key: str,
    movie_id: int,
    timing: dict | None = None,
    instance_id: str | int | None = None,
):
    start = time.perf_counter()
    movie = _arr_get(
        base_url,
        api_key,
        f"/api/v3/movie/{movie_id}",
        app_name="radarr",
    )
    _record_timing(timing, "radarr_movie_ms", start)
    files = _radarr_movie_files(movie, base_url, api_key, timing=timing)
    tag_map = _fetch_arr_tag_map(base_url, api_key, "radarr")
    profile_map = _fetch_arr_quality_profile_map(base_url, api_key, "radarr")
    cache_seconds = _read_int_env("CACHE_SECONDS", 300)
    cache_key = _radarr_wanted_cache_key(instance_id, base_url)
    missing_ids: set[int] = set()
    cutoff_ids: set[int] = set()
    recently_grabbed: set[int] = set()
    cached_wanted = _get_cached_radarr_wanted(cache_key, cache_seconds)
    if cached_wanted:
        missing_ids, cutoff_ids, recently_grabbed = cached_wanted
    else:
        wanted_workers = _read_worker_cap("RADARR_WANTED_WORKERS", 2, 4)
        missing_ids, cutoff_ids, recently_grabbed = _fetch_radarr_wanted_bundle(
            base_url,
            api_key,
            wanted_workers,
        )
        if cache_seconds > 0:
            _set_cached_radarr_wanted(cache_key, missing_ids, cutoff_ids, recently_grabbed)
    return _build_radarr_row(
        movie,
        files,
        tag_map=tag_map,
        profile_map=profile_map,
        missing_ids=missing_ids,
        cutoff_ids=cutoff_ids,
        recently_grabbed=recently_grabbed,
    )


def _apply_instance_meta(rows: list[dict], instance: dict):
    path_maps = instance.get("path_maps")
    if path_maps is None:
        path_map = instance.get("path_map")
        path_maps = [path_map] if path_map else []
    def apply_path_map(value: str | None) -> str | None:
        if not value:
            return value
        for src, dst in path_maps:
            if value.startswith(src):
                return value.replace(src, dst, 1)
        return value
    for row in rows:
        row["InstanceId"] = instance.get("id", "")
        row["InstanceName"] = instance.get("name", "")
        if path_maps:
            mapped_path = apply_path_map(row.get("Path"))
            if mapped_path:
                row["Path"] = mapped_path
            mapped_root = apply_path_map(row.get("RootFolder"))
            if mapped_root:
                row["RootFolder"] = mapped_root


def _cache_entry_has_data(entry: dict | None) -> bool:
    if not isinstance(entry, dict):
        return False
    data = entry.get("data")
    return isinstance(data, list) and bool(data)


def _has_complete_cached_data(
    app_name: str,
    instances: list[dict],
    disk_cache: dict[str, dict],
) -> bool:
    store = _cache.get_app_snapshot(app_name)
    for instance in instances:
        instance_id = instance.get("id")
        entry = store.get(str(instance_id))
        if _cache_entry_has_data(entry):
            continue
        disk_entry = disk_cache.get(str(instance_id))
        if _cache_entry_has_data(disk_entry):
            continue
        return False
    return True


def _arr_refresh_in_progress(app_name: str) -> bool:
    state = _arr_refresh_state.get(app_name)
    if not state:
        return False
    return bool(state.get("in_progress"))


def _start_arr_background_refresh(
    app_name: str,
    instances: list[dict],
    cfg: dict,
) -> bool:
    if not instances:
        return False
    state = _arr_refresh_state.get(app_name)
    if not state:
        return False
    lock = state.get("lock")
    if lock is None:
        return False
    with lock:
        if state.get("in_progress"):
            logger.info("%s background refresh already in progress; skipping.", app_name.title())
            return False
        state["in_progress"] = True
        state["started_ts"] = time.time()
    logger.info("%s background refresh started.", app_name.title())

    def worker():
        start = time.perf_counter()
        updated = False
        success = False
        try:
            cache_path = cfg.get("sonarr_cache_path") if app_name == "sonarr" else cfg.get("radarr_cache_path")
            disk_cache = _load_arr_cache(cache_path)
            _, cached_playback, cached_playback_ts = _get_playback_index_state(cfg)
            playback_label = _playback_label(_playback_provider(cfg))
            for instance in instances:
                _, refreshed = _get_cached_instance(
                    app_name,
                    instance,
                    disk_cache,
                    cache_path,
                    force=True,
                    tautulli_index=cached_playback,
                    tautulli_index_ts=cached_playback_ts,
                    playback_label=playback_label,
                )
                updated = updated or refreshed
            if updated:
                _queue_arr_cache_save(app_name, cache_path, disk_cache, "arr_refresh")
            success = True
        except Exception as exc:
            logger.warning("%s background refresh failed: %s", app_name.title(), exc)
        finally:
            if success:
                elapsed = time.perf_counter() - start
                logger.info(
                    "%s background refresh completed in %.2fs (updated=%s).",
                    app_name.title(),
                    elapsed,
                    updated,
                )
            with lock:
                state["in_progress"] = False

    thread = threading.Thread(target=worker, name=f"sortarr-{app_name}-refresh", daemon=True)
    thread.start()
    return True


def _is_cold_cache(app_name: str, instances: list[dict]) -> bool:
    for instance in instances:
        entry = _cache.get_app_entry_snapshot(app_name, instance["id"])
        if not entry or entry.get("ts", 0) <= 0:
            return True
    return False


def _get_cached_instance(
    app_name: str,
    instance: dict,
    disk_cache: dict[str, dict],
    cache_path: str | None,
    force: bool,
    tautulli_index: dict | None,
    tautulli_index_ts: int = 0,
    log_cold_start: bool = False,
    defer_tautulli_overlay: bool = False,
    playback_label: str = "Tautulli",
) -> tuple[list[dict], bool]:
    instance_id = instance["id"]
    entry_snapshot = _cache.get_app_entry_snapshot(app_name, instance_id)
    if not force and entry_snapshot and entry_snapshot.get("data"):
        rows = entry_snapshot["data"]
        _apply_instance_meta(rows, instance)
        return rows, False

    cached_entry = None if force else disk_cache.get(instance_id)
    if cached_entry and isinstance(cached_entry.get("data"), list):
        data = _clone_rows(cached_entry.get("data") or [])
        entry_ts = _safe_int(cached_entry.get("ts")) or time.time()
        entry_index_ts = _safe_int(cached_entry.get("tautulli_index_ts"))
        temp_entry = {
            "ts": entry_ts,
            "tautulli_index_ts": entry_index_ts,
            "data": data,
        }
        if tautulli_index:
            if app_name == "sonarr":
                _apply_tautulli_stats_once(
                    temp_entry,
                    tautulli_index,
                    "shows",
                    tautulli_index_ts,
                    provider_label=playback_label,
                )
            else:
                _apply_tautulli_stats_once(
                    temp_entry,
                    tautulli_index,
                    "movies",
                    tautulli_index_ts,
                    provider_label=playback_label,
                )
        _cache.set_app_entry(
            app_name,
            instance_id,
            temp_entry["data"],
            ts=entry_ts,
            tautulli_index_ts=temp_entry.get("tautulli_index_ts") or 0,
        )
        rows = _clone_rows(temp_entry.get("data") or [])
        _apply_instance_meta(rows, instance)
        return rows, False

    defer_wanted = log_cold_start and _read_bool_env("SORTARR_DEFER_WANTED", True)
    wanted_cached = None
    if defer_wanted:
        if app_name == "sonarr":
            cache_seconds = _read_int_env("SONARR_EPISODEFILE_CACHE_SECONDS", 600)
            cache_key = _sonarr_episodefile_cache_key(instance_id, instance.get("url") or "")
            wanted_cached = _get_cached_sonarr_wanted(cache_key, cache_seconds)
        else:
            cache_seconds = _read_int_env("CACHE_SECONDS", 300)
            cache_key = _radarr_wanted_cache_key(instance_id, instance.get("url") or "")
            wanted_cached = _get_cached_radarr_wanted(cache_key, cache_seconds)

    now = time.time()
    fetch_start = time.perf_counter()
    if app_name == "sonarr":
        data = _compute_sonarr(
            instance["url"],
            instance["api_key"],
            exclude_specials=False,
            instance_id=instance_id,
            defer_wanted=defer_wanted,
        )
    else:
        data = _compute_radarr(
            instance["url"],
            instance["api_key"],
            instance_id=instance_id,
            defer_wanted=defer_wanted,
        )
    fetch_elapsed = time.perf_counter() - fetch_start
    if log_cold_start:
        logger.info(
            "Cold start %s fetch completed in %.2fs (rows=%s)",
            app_name,
            fetch_elapsed,
            len(data or []),
        )
    temp_entry = {"ts": now, "tautulli_index_ts": 0, "data": data}
    if tautulli_index:
        if defer_tautulli_overlay:
            if log_cold_start:
                logger.info(
                    "Cold start %s deferring %s overlay (background matching).",
                    app_name,
                    playback_label,
                )
        else:
            overlay_start = time.perf_counter()
            if app_name == "sonarr":
                applied = _apply_tautulli_stats_once(
                    temp_entry,
                    tautulli_index,
                    "shows",
                    tautulli_index_ts,
                    provider_label=playback_label,
                )
            else:
                applied = _apply_tautulli_stats_once(
                    temp_entry,
                    tautulli_index,
                    "movies",
                    tautulli_index_ts,
                    provider_label=playback_label,
                )
            overlay_elapsed = time.perf_counter() - overlay_start
            if log_cold_start:
                logger.info(
                    "Cold start %s %s overlay in %.2fs (applied=%s)",
                    app_name,
                    playback_label,
                    overlay_elapsed,
                    applied,
                )
    _cache.set_app_entry(
        app_name,
        instance_id,
        temp_entry.get("data") or [],
        ts=temp_entry.get("ts") or 0,
        tautulli_index_ts=temp_entry.get("tautulli_index_ts") or 0,
    )
    disk_cache[instance_id] = {
        "ts": temp_entry.get("ts") or 0,
        "tautulli_index_ts": _safe_int(temp_entry.get("tautulli_index_ts")),
        "data": temp_entry.get("data") or [],
    }
    if defer_wanted and not wanted_cached:
        _start_wanted_background_refresh(app_name, instance, cache_path, log_cold_start=log_cold_start)
    rows = _clone_rows(temp_entry.get("data") or [])
    if rows:
        _apply_instance_meta(rows, instance)
    return rows, True


def _replace_arr_row(rows: list[dict], row: dict, app_name: str) -> None:
    id_key = "SeriesId" if app_name == "sonarr" else "MovieId"
    row_id = row.get(id_key)
    if row_id is None:
        return
    for idx, existing in enumerate(rows):
        if existing.get(id_key) == row_id:
            rows[idx] = row
            return
    rows.append(row)


def _sort_arr_rows(app_name: str, rows: list[dict]) -> None:
    if not isinstance(rows, list):
        return
    sort_key = "AvgEpisodeSizeGB" if app_name == "sonarr" else "GBPerHour"
    rows.sort(key=lambda item: _safe_float(item.get(sort_key)), reverse=True)


def _refresh_arr_item_cache(
    app_name: str,
    instance: dict,
    item_id: int,
    cfg: dict,
    force_tautulli: bool = False,
    timing: dict | None = None,
) -> dict | None:
    base_url = instance.get("url") or ""
    api_key = instance.get("api_key") or ""
    if app_name == "sonarr":
        row = _compute_sonarr_item(
            base_url,
            api_key,
            item_id,
            exclude_specials=False,
            timing=timing,
            instance_id=instance.get("id"),
        )
        media_type = "shows"
    else:
        row = _compute_radarr_item(
            base_url,
            api_key,
            item_id,
            timing=timing,
            instance_id=instance.get("id"),
        )
        media_type = "movies"
    if not row:
        return None
    if app_name == "sonarr":
        cache_key = _sonarr_episodefile_cache_key(instance.get("id"), base_url)
        _clear_sonarr_series_cache(cache_key, item_id)

    provider, cached_playback, cached_playback_ts = _get_playback_index_state(cfg)
    playback_label = _playback_label(provider)
    if force_tautulli and provider == "tautulli" and cfg.get("tautulli_url") and cfg.get("tautulli_api_key"):
        start = time.perf_counter()
        try:
            _get_tautulli_index(cfg, force=True, timing=timing)
            _, cached_playback, cached_playback_ts = _get_playback_index_state(cfg)
        except Exception as exc:
            logger.warning("Tautulli item refresh index fetch failed: %s", exc)
        _record_timing(timing, "tautulli_index_ms", start)
    playback_index_ts = 0
    if cached_playback and cached_playback_ts:
        temp_entry = {"data": [row], "tautulli_index_ts": 0}
        start = time.perf_counter()
        _apply_tautulli_stats_once(
            temp_entry,
            cached_playback,
            media_type,
            cached_playback_ts,
            provider_label=playback_label,
        )
        _record_timing(timing, "tautulli_overlay_ms", start)
        if temp_entry.get("data"):
            row = temp_entry["data"][0]
        playback_index_ts = _safe_int(temp_entry.get("tautulli_index_ts"))

    now = time.time()
    instance_id = str(instance.get("id") or "")
    cache_start = time.perf_counter()
    entry_snapshot = _cache.get_app_entry_snapshot(app_name, instance_id) or {}
    entry_rows = _clone_rows(entry_snapshot.get("data") or [])
    _replace_arr_row(entry_rows, row, app_name)
    _sort_arr_rows(app_name, entry_rows)
    _cache.set_app_entry(
        app_name,
        instance_id,
        entry_rows,
        ts=now,
        tautulli_index_ts=playback_index_ts,
    )

    cache_path = cfg.get("sonarr_cache_path") if app_name == "sonarr" else cfg.get("radarr_cache_path")
    disk_cache = _load_arr_cache(cache_path)
    disk_entry = disk_cache.get(instance_id, {})
    disk_rows = _clone_rows(disk_entry.get("data") or [])
    _replace_arr_row(disk_rows, row, app_name)
    _sort_arr_rows(app_name, disk_rows)
    disk_cache[instance_id] = {
        "ts": now,
        "tautulli_index_ts": playback_index_ts,
        "data": disk_rows,
    }
    _queue_arr_cache_save(app_name, cache_path, disk_cache, "item_refresh")
    _record_timing(timing, "cache_update_ms", cache_start)

    row_with_instance = dict(row)
    _apply_instance_meta([row_with_instance], instance)
    return row_with_instance


def _get_cached_all(app_name: str, instances: list[dict], cfg: dict, force: bool = False):
    if not instances:
        return [], "", "", False

    _maybe_bust_arr_cache_on_playback_refresh(cfg)

    tautulli_warning = ""
    tautulli_notice = ""
    cache_path = cfg.get("sonarr_cache_path") if app_name == "sonarr" else cfg.get("radarr_cache_path")
    disk_cache = _load_arr_cache(cache_path)
    disk_dirty = False

    results = []
    cold_cache = False
    cache_seconds = _safe_int(cfg.get("cache_seconds"))
    missing_instances = []
    instance_errors: list[dict] = []
    strict_instance_errors = _read_bool_env("SORTARR_STRICT_INSTANCE_ERRORS", False)
    media_type = "shows" if app_name == "sonarr" else "movies"
    provider, cached_playback, cached_playback_ts = _get_playback_index_state(cfg)
    playback_label = _playback_label(provider)
    defer_playback_overlay = False
    for instance in instances:
        instance_id = instance["id"]
        entry = _cache.get_app_entry_snapshot(app_name, instance_id)
        if entry and cache_seconds > 0 and entry.get("data") and (time.time() - entry.get("ts", 0) > cache_seconds):
            _cache.update_app_entry(app_name, instance_id, data=[], tautulli_index_ts=0)
            entry = None
        if not force and entry and entry.get("data"):
            if cached_playback and cached_playback_ts:
                if _apply_tautulli_stats_once(
                    entry,
                    cached_playback,
                    media_type,
                    cached_playback_ts,
                    provider_label=playback_label,
                ):
                    _cache.update_app_entry(
                        app_name,
                        instance_id,
                        data=entry.get("data") or [],
                        ts=entry.get("ts") or 0,
                        tautulli_index_ts=entry.get("tautulli_index_ts") or 0,
                    )
            rows = _clone_rows(entry.get("data") or [])
            _apply_instance_meta(rows, instance)
            results.extend(rows)
            continue
        cached_entry = None if force else disk_cache.get(instance_id)
        if cached_entry and isinstance(cached_entry.get("data"), list):
            entry_ts = _safe_int(cached_entry.get("ts")) or time.time()
            entry_index_ts = _safe_int(cached_entry.get("tautulli_index_ts"))
            temp_entry = {
                "ts": entry_ts,
                "tautulli_index_ts": entry_index_ts,
                "data": _clone_rows(cached_entry.get("data") or []),
            }
            if cached_playback and cached_playback_ts:
                if _apply_tautulli_stats_once(
                    temp_entry,
                    cached_playback,
                    media_type,
                    cached_playback_ts,
                    provider_label=playback_label,
                ):
                    cached_entry["tautulli_index_ts"] = _safe_int(temp_entry.get("tautulli_index_ts"))
                    cached_entry["data"] = temp_entry.get("data") or []
                    disk_dirty = True
            _cache.set_app_entry(
                app_name,
                instance_id,
                temp_entry.get("data") or [],
                ts=entry_ts,
                tautulli_index_ts=temp_entry.get("tautulli_index_ts") or 0,
            )
            rows = _clone_rows(temp_entry.get("data") or [])
            _apply_instance_meta(rows, instance)
            results.extend(rows)
            continue
        missing_instances.append(instance)

    if not force and missing_instances:
        cold_cache = True
        defer_playback_overlay = bool(cached_playback and cached_playback_ts)
    if missing_instances:
        instance_workers = 1
        if app_name == "radarr":
            instance_workers = _read_int_env("RADARR_INSTANCE_WORKERS", 1)
            if instance_workers <= 0:
                instance_workers = 1
        if instance_workers > 1 and len(missing_instances) > 1:
            max_workers = min(instance_workers, len(missing_instances))

            def fetch_instance(instance: dict):
                local_cache: dict[str, dict] = {}
                data, updated = _get_cached_instance(
                    app_name,
                    instance,
                    local_cache,
                    cache_path,
                    force=True,
                    tautulli_index=cached_playback,
                    tautulli_index_ts=cached_playback_ts,
                    log_cold_start=cold_cache,
                    defer_tautulli_overlay=defer_playback_overlay,
                    playback_label=playback_label,
                )
                instance_key = str(instance.get("id") or "")
                entry = local_cache.get(instance_key) or local_cache.get(instance.get("id"))
                return instance, data, updated, entry

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(fetch_instance, instance): instance
                    for instance in missing_instances
                }
                for future in as_completed(futures):
                    instance = futures[future]
                    try:
                        _, data, updated, entry = future.result()
                        results.extend(data)
                        if entry:
                            disk_cache[str(instance.get("id") or "")] = entry
                            disk_dirty = True
                        disk_dirty = disk_dirty or updated
                    except Exception as exc:
                        instance_id = instance.get("id")
                        instance_name = instance.get("name") or ""
                        error_kind = type(exc).__name__
                        instance_errors.append(
                            {
                                "id": instance_id,
                                "name": instance_name,
                            }
                        )
                        logger.warning("%s instance fetch failed (%s).", app_name, error_kind)
                        if strict_instance_errors:
                            raise
        else:
            for instance in missing_instances:
                try:
                    data, updated = _get_cached_instance(
                        app_name,
                        instance,
                        disk_cache,
                        cache_path,
                    force=True,
                    tautulli_index=cached_playback,
                    tautulli_index_ts=cached_playback_ts,
                    log_cold_start=cold_cache,
                    defer_tautulli_overlay=defer_playback_overlay,
                    playback_label=playback_label,
                )
                    results.extend(data)
                    disk_dirty = disk_dirty or updated
                except Exception as exc:
                    instance_id = instance.get("id")
                    instance_name = instance.get("name") or ""
                    error_kind = type(exc).__name__
                    instance_errors.append(
                        {
                            "id": instance_id,
                            "name": instance_name,
                        }
                    )
                    logger.warning("%s instance fetch failed (%s).", app_name, error_kind)
                    if strict_instance_errors:
                        raise

    if disk_dirty:
        reason = "cold_cache" if cold_cache else "request_refresh"
        _queue_arr_cache_save(app_name, cache_path, disk_cache, reason)

    if instance_errors:
        labels = []
        for err in instance_errors:
            label = err.get("name") or err.get("id") or "unknown"
            labels.append(label)
        if labels:
            instance_warning = (
                f"{app_name} instance fetch failed for {len(instance_errors)} instance(s): "
                + "; ".join(labels)
            )
        else:
            instance_warning = (
                f"{app_name} instance fetch failed for {len(instance_errors)} instance(s)."
            )
        tautulli_warning = _append_warning(tautulli_warning, instance_warning)
        if not results:
            raise RuntimeError(instance_warning)

    if app_name == "sonarr" and _read_sonarr_episodefile_mode() == "fast":
        tautulli_warning = _append_warning(
            tautulli_warning,
            "Sonarr fast mode enabled (episode file detail metrics reduced).",
        )

    if provider:
        apply_started = False
        if defer_playback_overlay:
            if provider == "tautulli":
                apply_started = _start_tautulli_background_apply(cfg, cached_playback)
            elif provider == "jellystat":
                apply_started = _start_jellystat_background_apply(cfg, cached_playback)
        refresh_needed = force or not cached_playback
        started = False
        if refresh_needed:
            if provider == "tautulli":
                started = _start_tautulli_background_refresh(cfg)
            elif provider == "jellystat":
                started = _start_jellystat_background_refresh(cfg)
        if provider == "tautulli":
            in_progress = _tautulli_refresh_in_progress(cfg)
        elif provider == "jellystat":
            in_progress = _jellystat_refresh_in_progress(cfg)
        else:
            in_progress = False
        if apply_started or started or in_progress:
            tautulli_notice = f"{playback_label} matching in progress."

    return results, tautulli_warning, tautulli_notice, cold_cache



@app.route("/")
@_auth_required
def index():
    cfg = _get_config()
    if not _config_complete(cfg):
        return redirect(url_for("setup"))
    csrf_token = _get_csrf_token()
    return render_template(
        "index.html",
        app_name=APP_NAME,
        app_version=APP_VERSION,
        csrf_token=csrf_token,
    )


@app.route("/setup", methods=["GET", "POST"])
def setup():
    cfg = _get_config()
    configured = _config_complete(cfg)
    if configured:
        user, passwd = _get_basic_auth()
        auth = request.authorization
        if (user or passwd) and not (auth and auth.username == user and auth.password == passwd):
            return Response(
                "Unauthorized Access",
                401,
                {"WWW-Authenticate": 'Basic realm="Authentication Required"'},
            )
        if request.method == "GET" and request.args.get("force") != "1":
            return redirect(url_for("index"))

    error = ""
    field_errors: dict[str, str] = {}
    if request.method == "POST":
        cache_raw = request.form.get("cache_seconds", "").strip()
        try:
            cache_seconds = int(cache_raw) if cache_raw else 300
        except ValueError:
            cache_seconds = None
        tautulli_timeout_raw = request.form.get("tautulli_timeout_seconds", "").strip()
        tautulli_fetch_raw = request.form.get("tautulli_fetch_seconds", "").strip()
        sonarr_timeout_raw = request.form.get("sonarr_timeout_seconds", "").strip()
        radarr_timeout_raw = request.form.get("radarr_timeout_seconds", "").strip()
        sonarr_episodefile_workers_raw = request.form.get("sonarr_episodefile_workers", "").strip()
        radarr_wanted_workers_raw = request.form.get("radarr_wanted_workers", "").strip()
        radarr_instance_workers_raw = request.form.get("radarr_instance_workers", "").strip()
        tautulli_metadata_workers_raw = request.form.get("tautulli_metadata_workers", "").strip()

        def parse_optional_int(
            raw: str,
            label: str,
            min_value: int = 0,
            max_value: int | None = None,
        ) -> tuple[str, str | None]:
            if not raw:
                return "", None
            try:
                value = int(raw)
            except ValueError:
                return "", f"{label} must be a whole number."
            if value < min_value:
                return "", f"{label} must be {min_value} or greater."
            if max_value is not None and value > max_value:
                return "", f"{label} must be {max_value} or less."
            return str(value), None

        def join_path_maps(field_name: str) -> str:
            entries = [str(value or "").strip() for value in request.form.getlist(field_name)]
            entries = [entry for entry in entries if entry]
            return " | ".join(entries)

        sonarr_path_map = join_path_maps("sonarr_path_map")
        sonarr_path_map_2 = join_path_maps("sonarr_path_map_2")
        sonarr_path_map_3 = join_path_maps("sonarr_path_map_3")
        radarr_path_map = join_path_maps("radarr_path_map")
        radarr_path_map_2 = join_path_maps("radarr_path_map_2")
        radarr_path_map_3 = join_path_maps("radarr_path_map_3")

        tautulli_timeout_seconds, timeout_error = parse_optional_int(
            tautulli_timeout_raw,
            "Tautulli timeout seconds",
        )
        tautulli_fetch_seconds, fetch_error = parse_optional_int(
            tautulli_fetch_raw,
            "Tautulli fetch idle seconds",
        )
        sonarr_timeout_seconds, sonarr_timeout_error = parse_optional_int(
            sonarr_timeout_raw,
            "Sonarr timeout seconds",
        )
        radarr_timeout_seconds, radarr_timeout_error = parse_optional_int(
            radarr_timeout_raw,
            "Radarr timeout seconds",
        )
        sonarr_episodefile_workers, sonarr_episodefile_workers_error = parse_optional_int(
            sonarr_episodefile_workers_raw,
            "Sonarr episode file workers",
            min_value=1,
        )
        radarr_wanted_workers, radarr_wanted_workers_error = parse_optional_int(
            radarr_wanted_workers_raw,
            "Radarr wanted workers",
            min_value=1,
            max_value=4,
        )
        radarr_instance_workers, radarr_instance_workers_error = parse_optional_int(
            radarr_instance_workers_raw,
            "Radarr instance workers",
            min_value=1,
        )
        tautulli_metadata_workers, tautulli_metadata_workers_error = parse_optional_int(
            tautulli_metadata_workers_raw,
            "Tautulli metadata workers",
            min_value=1,
        )
        tautulli_lookup_limit = str(REQUIRED_TAUTULLI_LOOKUP_LIMIT)
        tautulli_lookup_seconds = str(REQUIRED_TAUTULLI_LOOKUP_SECONDS)

        basic_auth_user = request.form.get("basic_auth_user", "").strip()
        basic_auth_pass_raw = request.form.get("basic_auth_pass", "").strip()
        clear_basic_auth_pass = request.form.get("clear_basic_auth_pass") == "1"
        if not basic_auth_user:
            basic_auth_pass = ""
        elif clear_basic_auth_pass:
            basic_auth_pass = ""
        elif basic_auth_pass_raw:
            basic_auth_pass = basic_auth_pass_raw
        else:
            basic_auth_pass = cfg["basic_auth_pass"]

        data = {
            "SONARR_NAME": request.form.get("sonarr_name", "").strip(),
            "SONARR_URL": _normalize_url(request.form.get("sonarr_url", "")),
            "SONARR_API_KEY": request.form.get("sonarr_api_key", "").strip(),
            "SONARR_NAME_2": request.form.get("sonarr_name_2", "").strip(),
            "SONARR_URL_2": _normalize_url(request.form.get("sonarr_url_2", "")),
            "SONARR_API_KEY_2": request.form.get("sonarr_api_key_2", "").strip(),
            "SONARR_NAME_3": request.form.get("sonarr_name_3", "").strip(),
            "SONARR_URL_3": _normalize_url(request.form.get("sonarr_url_3", "")),
            "SONARR_API_KEY_3": request.form.get("sonarr_api_key_3", "").strip(),
            "SONARR_PATH_MAP": sonarr_path_map,
            "SONARR_PATH_MAP_2": sonarr_path_map_2,
            "SONARR_PATH_MAP_3": sonarr_path_map_3,
            "RADARR_NAME": request.form.get("radarr_name", "").strip(),
            "RADARR_URL": _normalize_url(request.form.get("radarr_url", "")),
            "RADARR_API_KEY": request.form.get("radarr_api_key", "").strip(),
            "RADARR_NAME_2": request.form.get("radarr_name_2", "").strip(),
            "RADARR_URL_2": _normalize_url(request.form.get("radarr_url_2", "")),
            "RADARR_API_KEY_2": request.form.get("radarr_api_key_2", "").strip(),
            "RADARR_NAME_3": request.form.get("radarr_name_3", "").strip(),
            "RADARR_URL_3": _normalize_url(request.form.get("radarr_url_3", "")),
            "RADARR_API_KEY_3": request.form.get("radarr_api_key_3", "").strip(),
            "RADARR_PATH_MAP": radarr_path_map,
            "RADARR_PATH_MAP_2": radarr_path_map_2,
            "RADARR_PATH_MAP_3": radarr_path_map_3,
            "TAUTULLI_URL": _normalize_url(request.form.get("tautulli_url", "")),
            "TAUTULLI_API_KEY": request.form.get("tautulli_api_key", "").strip(),
            "JELLYSTAT_URL": _normalize_url(request.form.get("jellystat_url", "")),
            "JELLYSTAT_API_KEY": request.form.get("jellystat_api_key", "").strip(),
            "JELLYSTAT_LIBRARY_IDS_SONARR": request.form.get("jellystat_library_ids_sonarr", "").strip(),
            "JELLYSTAT_LIBRARY_IDS_RADARR": request.form.get("jellystat_library_ids_radarr", "").strip(),
            "TAUTULLI_METADATA_LOOKUP_LIMIT": tautulli_lookup_limit,
            "TAUTULLI_METADATA_LOOKUP_SECONDS": tautulli_lookup_seconds,
            "TAUTULLI_TIMEOUT_SECONDS": tautulli_timeout_seconds,
            "TAUTULLI_FETCH_SECONDS": tautulli_fetch_seconds,
            "TAUTULLI_METADATA_WORKERS": tautulli_metadata_workers,
            "SONARR_TIMEOUT_SECONDS": sonarr_timeout_seconds,
            "RADARR_TIMEOUT_SECONDS": radarr_timeout_seconds,
            "SONARR_EPISODEFILE_WORKERS": sonarr_episodefile_workers,
            "RADARR_WANTED_WORKERS": radarr_wanted_workers,
            "RADARR_INSTANCE_WORKERS": radarr_instance_workers,
            "BASIC_AUTH_USER": basic_auth_user,
            "BASIC_AUTH_PASS": basic_auth_pass,
            "CACHE_SECONDS": str(cache_seconds if cache_seconds is not None else ""),
        }

        config_error = (
            timeout_error
            or fetch_error
            or sonarr_timeout_error
            or radarr_timeout_error
            or sonarr_episodefile_workers_error
            or radarr_wanted_workers_error
            or radarr_instance_workers_error
            or tautulli_metadata_workers_error
        )

        if cache_seconds is None:
            error = "Cache seconds must be a whole number."
        elif cache_seconds < 30:
            error = "Cache seconds must be at least 30."
        elif config_error:
            error = config_error or ""
        else:
            has_sonarr = any(
                data.get(f"SONARR_URL{suffix}") and data.get(f"SONARR_API_KEY{suffix}")
                for suffix in ("", "_2", "_3")
            )
            has_radarr = any(
                data.get(f"RADARR_URL{suffix}") and data.get(f"RADARR_API_KEY{suffix}")
                for suffix in ("", "_2", "_3")
            )
            if not has_sonarr and not has_radarr:
                error = "Provide Sonarr or Radarr URL and API key."
            else:
                sonarr2 = data.get("SONARR_URL_2") and data.get("SONARR_API_KEY_2")
                sonarr3 = data.get("SONARR_URL_3") and data.get("SONARR_API_KEY_3")
                radarr2 = data.get("RADARR_URL_2") and data.get("RADARR_API_KEY_2")
                radarr3 = data.get("RADARR_URL_3") and data.get("RADARR_API_KEY_3")

                if (sonarr2 or sonarr3) and not data.get("SONARR_NAME"):
                    error = "Sonarr instance 1 name is required when additional instances are configured."
                elif sonarr2 and not data.get("SONARR_NAME_2"):
                    error = "Sonarr instance 2 name is required when it is configured."
                elif sonarr3 and not data.get("SONARR_NAME_3"):
                    error = "Sonarr instance 3 name is required when it is configured."
                elif (radarr2 or radarr3) and not data.get("RADARR_NAME"):
                    error = "Radarr instance 1 name is required when additional instances are configured."
                elif radarr2 and not data.get("RADARR_NAME_2"):
                    error = "Radarr instance 2 name is required when it is configured."
                elif radarr3 and not data.get("RADARR_NAME_3"):
                    error = "Radarr instance 3 name is required when it is configured."
                else:
                    connection_errors: dict[str, str] = {}
                    for label, prefix, idx in [
                        ("Sonarr", "SONARR", 1),
                        ("Sonarr", "SONARR", 2),
                        ("Sonarr", "SONARR", 3),
                        ("Radarr", "RADARR", 1),
                        ("Radarr", "RADARR", 2),
                        ("Radarr", "RADARR", 3),
                    ]:
                        suffix = "" if idx == 1 else f"_{idx}"
                        url = data.get(f"{prefix}_URL{suffix}") or ""
                        api_key = data.get(f"{prefix}_API_KEY{suffix}") or ""
                        name = (data.get(f"{prefix}_NAME{suffix}") or "").strip()
                        if not (url and api_key):
                            continue
                        failure = _arr_test_connection(url, api_key, timeout=10)
                        if failure:
                            key = _instance_error_key(prefix, idx)
                            if name:
                                failure = f"{name}: {failure}"
                            connection_errors[key] = failure
                    tautulli_url = data.get("TAUTULLI_URL") or ""
                    tautulli_api_key = data.get("TAUTULLI_API_KEY") or ""
                    if tautulli_url and tautulli_api_key:
                        failure = _tautulli_test_connection(tautulli_url, tautulli_api_key, timeout=10)
                        if failure:
                            connection_errors["tautulli"] = failure
                    jellystat_url = data.get("JELLYSTAT_URL") or ""
                    jellystat_api_key = data.get("JELLYSTAT_API_KEY") or ""
                    if jellystat_url and jellystat_api_key:
                        failure = _jellystat_test_connection(jellystat_url, jellystat_api_key, timeout=10)
                        if failure:
                            connection_errors["jellystat"] = failure
                    if connection_errors:
                        field_errors.update(connection_errors)
                        error = "Fix the highlighted connection errors."
        if not error:
            try:
                _write_env_file(ENV_FILE_PATH, data)
                for k, v in data.items():
                    os.environ[k] = v
                _invalidate_cache()
                return redirect(url_for("index"))
            except OSError:
                error = "Failed to write config file."

    csrf_token = _get_csrf_token()
    return render_template(
        "setup.html",
        env_path=ENV_FILE_PATH,
        error=error,
        field_errors=field_errors,
        values=cfg,
        app_name=APP_NAME,
        app_version=APP_VERSION,
        csrf_token=csrf_token,
    )


@app.route("/api/config")
@_auth_required
def api_config():
    cfg = _get_config()
    provider = _playback_provider(cfg)
    playback_enabled = bool(provider)
    return jsonify(
        {
            "app_name": APP_NAME,
            "app_version": APP_VERSION,
            "sonarr_url": cfg["sonarr_url"],
            "radarr_url": cfg["radarr_url"],
            "sonarr_instances": _public_instances(cfg.get("sonarr_instances", [])),
            "radarr_instances": _public_instances(cfg.get("radarr_instances", [])),
            "tautulli_configured": playback_enabled,
            "playback_configured": playback_enabled,
            "playback_provider": provider,
            "configured": _config_complete(cfg),
        }
    )


@app.route("/api/status")
@_auth_required
def api_status():
    cfg = _get_config()
    lite_raw = str(request.args.get("lite") or "").strip().lower()
    lite = lite_raw in {"1", "true", "yes"}
    provider = _playback_provider(cfg)
    playback_enabled = bool(provider)
    refresh_in_progress = _playback_refresh_in_progress(cfg, provider) if playback_enabled else False
    apps = {}
    for app_name in ("sonarr", "radarr"):
        instances = cfg.get(f"{app_name}_instances") or []
        if lite:
            latest_ts = _collect_cache_latest_ts(app_name)
            counts = None
        else:
            rows, latest_ts = _collect_cached_rows(app_name)
            counts = _summarize_match_counts(rows) if rows else _summarize_match_counts([])
        cache_path = cfg.get(f"{app_name}_cache_path")
        disk_info = _cache_file_info(cache_path)
        progress_meta = None
        if refresh_in_progress and playback_enabled:
            media_type = "shows" if app_name == "sonarr" else "movies"
            progress = _get_tautulli_match_progress(media_type)
            if progress and progress.get("total") is not None and not lite:
                progress_total = _safe_int(progress.get("total"))
                if progress_total > 0:
                    counts = {
                        "total": progress_total,
                        "matched": _safe_int(progress.get("matched")),
                        "unmatched": _safe_int(progress.get("unmatched")),
                        "skipped": _safe_int(progress.get("skipped")),
                        "unavailable": _safe_int(progress.get("unavailable")),
                    }
                    pending = progress.get("pending")
                    if pending is None:
                        counted = (
                            counts["matched"]
                            + counts["unmatched"]
                            + counts["skipped"]
                            + counts["unavailable"]
                        )
                        counts["pending"] = max(counts["total"] - counted, 0)
                    else:
                        counts["pending"] = _safe_int(pending)
            if progress:
                updated_ts = _safe_int(progress.get("updated_ts"))
                started_ts = _safe_int(progress.get("started_ts"))
                progress_meta = {
                    "total": _safe_int(progress.get("total")),
                    "processed": _safe_int(progress.get("processed")),
                    "started_ts": started_ts,
                    "started_age_seconds": _age_seconds(started_ts),
                    "updated_ts": updated_ts,
                    "updated_age_seconds": _age_seconds(updated_ts),
                }
        app_payload = {
            "configured": bool(instances),
            "progress": progress_meta,
            "cache": {
                "memory_ts": latest_ts,
                "memory_age_seconds": _age_seconds(latest_ts),
                "disk_ts": disk_info["ts"],
                "disk_age_seconds": disk_info["age_seconds"],
            },
        }
        if not lite:
            app_payload["counts"] = counts
        apps[app_name] = app_payload

    _, _, playback_ts = _get_playback_index_state(cfg)
    if not playback_enabled:
        tautulli_status = "disabled"
    elif refresh_in_progress:
        tautulli_status = "refreshing"
    elif playback_ts <= 0:
        tautulli_status = "stale"
    else:
        tautulli_status = "ready"
    tautulli_partial = playback_enabled and (refresh_in_progress or playback_ts <= 0)

    return jsonify(
        {
            "apps": apps,
            "tautulli": {
                "configured": playback_enabled,
                "provider": provider,
                "label": _playback_label(provider),
                "status": tautulli_status,
                "partial": tautulli_partial,
                "refresh_in_progress": refresh_in_progress,
                "index_ts": playback_ts,
                "index_age_seconds": _age_seconds(playback_ts),
            },
        }
    )


@app.route("/api/perf/render", methods=["POST"])
@_auth_required
def api_perf_render():
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid payload."}), 400
    entry = {
        "test": "render_perf",
        "scenario": str(payload.get("scenario") or "").strip(),
        "story": str(payload.get("story") or "").strip(),
        "app": str(payload.get("app") or "").strip(),
        "rows": _safe_int(payload.get("rows")),
        "filtered_rows": _safe_int(payload.get("filtered_rows")),
        "shouldBatch": bool(payload.get("shouldBatch")),
        "useDeferred": bool(payload.get("useDeferred")),
        "renderMs": _safe_float(payload.get("renderMs")),
        "hydrateMs": _safe_float(payload.get("hydrateMs")),
        "totalMs": _safe_float(payload.get("totalMs")),
        "cacheHitRate": _safe_float(payload.get("cacheHitRate")),
        "source": "ui",
    }
    if not _record_perf_entry(entry):
        return jsonify({"ok": False, "skipped": True})
    return jsonify({"ok": True})


@app.route("/api/version")
@_auth_required
def api_version():
    return jsonify({"app_name": APP_NAME, "app_version": APP_VERSION})


@app.route("/api/setup/test", methods=["POST"])
@_auth_required
def api_setup_test():
    payload = request.get_json(silent=True) or {}
    kind = str(payload.get("kind") or "").strip().lower()
    url = _normalize_url(payload.get("url") or "")
    api_key = (payload.get("api_key") or "").strip()
    if not url or not api_key:
        return jsonify({"ok": False, "error": _("URL and API key are required.")}), 400

    if kind in ("sonarr", "radarr"):
        failure = _arr_test_connection(url, api_key, timeout=10)
    elif kind == "tautulli":
        failure = _tautulli_test_connection(url, api_key, timeout=10)
    elif kind == "jellystat":
        failure = _jellystat_test_connection(url, api_key, timeout=10)
    else:
        return jsonify({"ok": False, "error": "Unknown test target."}), 400

    if failure:
        return jsonify({"ok": False, "error": failure}), 502
    return jsonify({"ok": True})


@app.route("/api/tautulli/refresh", methods=["POST"])
@_auth_required
def api_tautulli_refresh():
    cfg = _get_config()
    provider = _playback_provider(cfg)
    if provider == "tautulli":
        started = _start_tautulli_background_refresh(cfg)
        refresh_in_progress = _tautulli_refresh_in_progress(cfg)
    elif provider == "jellystat":
        started = _start_jellystat_background_refresh(cfg)
        refresh_in_progress = _jellystat_refresh_in_progress(cfg)
    else:
        return jsonify({"error": "Playback provider is not configured."}), 503
    return jsonify(
        {
            "started": started,
            "refresh_in_progress": refresh_in_progress,
            "provider": provider,
        }
    )


@app.route("/api/tautulli/deep_refresh", methods=["POST"])
@_auth_required
def api_tautulli_deep_refresh():
    cfg = _get_config()
    provider = _playback_provider(cfg)
    if provider == "tautulli":
        started = _start_tautulli_deep_refresh(cfg)
        refresh_in_progress = _tautulli_refresh_in_progress(cfg)
    elif provider == "jellystat":
        started = _start_jellystat_background_refresh(cfg)
        refresh_in_progress = _jellystat_refresh_in_progress(cfg)
    else:
        return jsonify({"error": "Playback provider is not configured."}), 503
    return jsonify(
        {
            "started": started,
            "refresh_in_progress": refresh_in_progress,
            "provider": provider,
        }
    )


@app.route("/api/sonarr/refresh", methods=["POST"])
@_auth_required
def api_sonarr_refresh():
    cfg = _get_config()
    instances = cfg.get("sonarr_instances", [])
    if not instances:
        return jsonify({"error": "Sonarr is not configured."}), 503
    payload = request.get_json(silent=True) or {}
    series_id = request.args.get("seriesId") or payload.get("seriesId") or payload.get("series_id")
    instance_id = (
        payload.get("instance_id")
        or payload.get("instanceId")
        or request.args.get("instance_id")
        or request.args.get("instanceId")
    )
    if series_id:
        item_id = _parse_arr_item_id(series_id)
        if not item_id:
            return jsonify({"error": "seriesId is required."}), 400
        instance = _resolve_arr_instance(instances, str(instance_id or "").strip())
        if not instance:
            if instance_id:
                return jsonify({"error": "Unknown Sonarr instance."}), 400
            return jsonify({"error": "instance_id is required for multiple Sonarr instances."}), 400
        try:
            _arr_command_refresh_item("sonarr", instance, item_id)
            _history_cache_clear(("sonarr", instance.get("id") or ""))
        except Exception as exc:
            resp = jsonify({"error": "Sonarr refresh failed."})
            resp.headers["X-Sortarr-Error"] = _arr_error_hint("sonarr", exc)
            return resp, 502
        return jsonify(
            {
                "started": True,
                "scope": "series",
                "instance_id": instance.get("id") or "",
                "series_id": item_id,
            }
        )

    results = _arr_command_refresh_all("sonarr", instances)
    if results["started"] == 0:
        resp = jsonify({"error": "Sonarr refresh failed."})
        if results["errors"]:
            resp.headers["X-Sortarr-Error"] = results["errors"][0].get("error", "")
        return resp, 502
    return jsonify(
        {
            "started": results["started"],
            "failed": len(results["errors"]),
            "errors": results["errors"],
        }
    )


@app.route("/api/sonarr/item")
@_auth_required
def api_sonarr_item():
    cfg = _get_config()
    instances = cfg.get("sonarr_instances", [])
    if not instances:
        return jsonify({"error": "Sonarr is not configured."}), 503
    series_id = request.args.get("seriesId") or request.args.get("series_id")
    force_tautulli = request.args.get("tautulli_refresh") == "1"
    timing_enabled = request.args.get("timing") == "1"
    timing = {} if timing_enabled else None
    timing_start = time.perf_counter() if timing_enabled else 0.0
    if not series_id:
        return jsonify({"error": "seriesId is required."}), 400
    item_id = _parse_arr_item_id(series_id)
    if not item_id:
        return jsonify({"error": "seriesId is required."}), 400
    instance_id = request.args.get("instance_id") or request.args.get("instanceId")
    instance = _resolve_arr_instance(instances, str(instance_id or "").strip())
    if not instance:
        if instance_id:
            return jsonify({"error": "Unknown Sonarr instance."}), 400
        return jsonify({"error": "instance_id is required for multiple Sonarr instances."}), 400
    try:
        row = _refresh_arr_item_cache(
            "sonarr",
            instance,
            item_id,
            cfg,
            force_tautulli=force_tautulli,
            timing=timing,
        )
    except Exception as exc:
        resp = jsonify({"error": "Sonarr item refresh failed."})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("sonarr", exc)
        return resp, 502
    if not row:
        return jsonify({"error": "Series not found."}), 404
    if timing is not None:
        timing["total_ms"] = round((time.perf_counter() - timing_start) * 1000)
        resp = jsonify({"row": row, "timing": timing})
        _attach_timing_headers(resp, timing)
        return resp
    return jsonify(row)


@app.route("/api/sonarr/series/<int:series_id>/seasons")
@_auth_required
def api_sonarr_series_seasons(series_id: int):
    cfg = _get_config()
    instances = cfg.get("sonarr_instances", [])
    if not instances:
        return jsonify({"error": "Sonarr is not configured."}), 503
    if series_id <= 0:
        return jsonify({"error": "series_id is required."}), 400
    instance_id = request.args.get("instance_id") or request.args.get("instanceId")
    instance = _resolve_arr_instance(instances, str(instance_id or "").strip())
    if not instance:
        if instance_id:
            return jsonify({"error": "Unknown Sonarr instance."}), 400
        return jsonify({"error": "instance_id is required for multiple Sonarr instances."}), 400
    include_specials = _read_query_bool("include_specials", "includeSpecials", "specials")
    try:
        seasons, fast_mode = _get_sonarr_season_payload(instance, series_id, include_specials)
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else None
        if status == 404:
            return jsonify({"error": "Series not found."}), 404
        logger.exception("Sonarr season request failed")
        resp = jsonify({"error": "Sonarr season request failed."})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("sonarr", exc)
        return resp, 502
    except Exception as exc:
        logger.exception("Sonarr season request failed")
        resp = jsonify({"error": "Sonarr season request failed."})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("sonarr", exc)
        return resp, 502
    return jsonify(
        {
            "series_id": series_id,
            "instance_id": instance.get("id") or "",
            "fast_mode": fast_mode,
            "seasons": seasons,
        }
    )


@app.route("/api/sonarr/series/<int:series_id>/seasons/<int:season_number>/episodes")
@_auth_required
def api_sonarr_series_episodes(series_id: int, season_number: int):
    cfg = _get_config()
    instances = cfg.get("sonarr_instances", [])
    if not instances:
        return jsonify({"error": "Sonarr is not configured."}), 503
    if series_id <= 0:
        return jsonify({"error": "series_id is required."}), 400
    if season_number < 0:
        return jsonify({"error": "season_number is required."}), 400
    instance_id = request.args.get("instance_id") or request.args.get("instanceId")
    instance = _resolve_arr_instance(instances, str(instance_id or "").strip())
    if not instance:
        if instance_id:
            return jsonify({"error": "Unknown Sonarr instance."}), 400
        return jsonify({"error": "instance_id is required for multiple Sonarr instances."}), 400
    try:
        episodes, fast_mode = _get_sonarr_episode_payload(instance, series_id, season_number)
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else None
        if status == 404:
            return jsonify({"error": "Series not found."}), 404
        logger.exception("Sonarr episode request failed")
        resp = jsonify({"error": "Sonarr episode request failed."})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("sonarr", exc)
        return resp, 502
    except Exception as exc:
        logger.exception("Sonarr episode request failed")
        resp = jsonify({"error": "Sonarr episode request failed."})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("sonarr", exc)
        return resp, 502
    return jsonify(
        {
            "series_id": series_id,
            "season_number": season_number,
            "instance_id": instance.get("id") or "",
            "fast_mode": fast_mode,
            "episodes": episodes,
        }
    )


@app.route("/api/radarr/refresh", methods=["POST"])
@_auth_required
def api_radarr_refresh():
    cfg = _get_config()
    instances = cfg.get("radarr_instances", [])
    if not instances:
        return jsonify({"error": "Radarr is not configured."}), 503
    payload = request.get_json(silent=True) or {}
    movie_id = request.args.get("movieId") or payload.get("movieId") or payload.get("movie_id")
    instance_id = (
        payload.get("instance_id")
        or payload.get("instanceId")
        or request.args.get("instance_id")
        or request.args.get("instanceId")
    )
    if movie_id:
        item_id = _parse_arr_item_id(movie_id)
        if not item_id:
            return jsonify({"error": "movieId is required."}), 400
        instance = _resolve_arr_instance(instances, str(instance_id or "").strip())
        if not instance:
            if instance_id:
                return jsonify({"error": "Unknown Radarr instance."}), 400
            return jsonify({"error": "instance_id is required for multiple Radarr instances."}), 400
        try:
            _arr_command_refresh_item("radarr", instance, item_id)
            _history_cache_clear(("radarr", instance.get("id") or ""))
        except Exception as exc:
            resp = jsonify({"error": "Radarr refresh failed."})
            resp.headers["X-Sortarr-Error"] = _arr_error_hint("radarr", exc)
            return resp, 502
        return jsonify(
            {
                "started": True,
                "scope": "movie",
                "instance_id": instance.get("id") or "",
                "movie_id": item_id,
            }
        )

    results = _arr_command_refresh_all("radarr", instances)
    if results["started"] == 0:
        resp = jsonify({"error": "Radarr refresh failed."})
        if results["errors"]:
            resp.headers["X-Sortarr-Error"] = results["errors"][0].get("error", "")
        return resp, 502
    return jsonify(
        {
            "started": results["started"],
            "failed": len(results["errors"]),
            "errors": results["errors"],
        }
    )


@app.route("/api/radarr/item")
@_auth_required
def api_radarr_item():
    cfg = _get_config()
    instances = cfg.get("radarr_instances", [])
    if not instances:
        return jsonify({"error": "Radarr is not configured."}), 503
    movie_id = request.args.get("movieId") or request.args.get("movie_id")
    force_tautulli = request.args.get("tautulli_refresh") == "1"
    timing_enabled = request.args.get("timing") == "1"
    timing = {} if timing_enabled else None
    timing_start = time.perf_counter() if timing_enabled else 0.0
    if not movie_id:
        return jsonify({"error": "movieId is required."}), 400
    item_id = _parse_arr_item_id(movie_id)
    if not item_id:
        return jsonify({"error": "movieId is required."}), 400
    instance_id = request.args.get("instance_id") or request.args.get("instanceId")
    instance = _resolve_arr_instance(instances, str(instance_id or "").strip())
    if not instance:
        if instance_id:
            return jsonify({"error": "Unknown Radarr instance."}), 400
        return jsonify({"error": "instance_id is required for multiple Radarr instances."}), 400
    try:
        row = _refresh_arr_item_cache(
            "radarr",
            instance,
            item_id,
            cfg,
            force_tautulli=force_tautulli,
            timing=timing,
        )
    except Exception as exc:
        resp = jsonify({"error": "Radarr item refresh failed."})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("radarr", exc)
        return resp, 502
    if not row:
        return jsonify({"error": "Movie not found."}), 404
    if timing is not None:
        timing["total_ms"] = round((time.perf_counter() - timing_start) * 1000)
        resp = jsonify({"row": row, "timing": timing})
        _attach_timing_headers(resp, timing)
        return resp
    return jsonify(row)


@app.route("/api/history")
@_auth_required
def api_history():
    cfg = _get_config()
    app_name = (request.args.get("app") or "").strip().lower()
    if app_name not in ("sonarr", "radarr"):
        return jsonify({"error": "app must be sonarr or radarr"}), 400
    instances = cfg.get(f"{app_name}_instances") or []
    if not instances:
        return jsonify({"error": f"{app_name} is not configured."}), 503
    instance_id = request.args.get("instance_id") or request.args.get("instanceId")
    include_raw = _read_query_bool("include_raw", "includeRaw", default=False)
    if app_name == "sonarr":
        series_id = _parse_arr_item_id(request.args.get("seriesId") or request.args.get("series_id"))
        episode_id = _parse_arr_item_id(request.args.get("episodeId") or request.args.get("episode_id"))
        if not series_id:
            return jsonify({"error": "seriesId is required."}), 400
        if not episode_id:
            return jsonify({"error": "episodeId is required."}), 400
        instance = _resolve_arr_instance(instances, str(instance_id or "").strip())
        if not instance:
            if instance_id:
                return jsonify({"error": "Unknown Sonarr instance."}), 400
            return jsonify({"error": "instance_id is required for multiple Sonarr instances."}), 400
        cache_key = _history_cache_key(app_name, instance.get("id") or "", series_id, episode_id, 0, include_raw)
        cached = _history_cache_get(cache_key)
        if cached:
            return jsonify(cached)
        try:
            payload = _fetch_arr_history(
                "sonarr",
                instance,
                series_id=series_id,
                episode_id=episode_id,
                include_raw=include_raw,
            )
        except Exception as exc:
            resp = jsonify({"error": "Sonarr history request failed."})
            resp.headers["X-Sortarr-Error"] = _arr_error_hint("sonarr", exc)
            return resp, 502
        _history_cache_set(cache_key, payload)
        return jsonify(payload)
    else:
        movie_id = _parse_arr_item_id(request.args.get("movieId") or request.args.get("movie_id"))
        if not movie_id:
            return jsonify({"error": "movieId is required."}), 400
        instance = _resolve_arr_instance(instances, str(instance_id or "").strip())
        if not instance:
            if instance_id:
                return jsonify({"error": "Unknown Radarr instance."}), 400
            return jsonify({"error": "instance_id is required for multiple Radarr instances."}), 400
        cache_key = _history_cache_key(app_name, instance.get("id") or "", 0, 0, movie_id, include_raw)
        cached = _history_cache_get(cache_key)
        if cached:
            return jsonify(cached)
        try:
            payload = _fetch_arr_history(
                "radarr",
                instance,
                movie_id=movie_id,
                include_raw=include_raw,
            )
        except Exception as exc:
            resp = jsonify({"error": "Radarr history request failed."})
            resp.headers["X-Sortarr-Error"] = _arr_error_hint("radarr", exc)
            return resp, 502
        _history_cache_set(cache_key, payload)
        return jsonify(payload)


@app.route("/api/tautulli/refresh_item", methods=["POST"])
@_auth_required
def api_tautulli_refresh_item():
    cfg = _get_config()
    provider = _playback_provider(cfg)
    if provider != "tautulli":
        return jsonify(
            {
                "ok": False,
                "skipped": True,
                "reason": "Playback provider does not support item refresh.",
            }
        )
    if not (cfg.get("tautulli_url") and cfg.get("tautulli_api_key")):
        return jsonify({"error": "Tautulli is not configured."}), 503
    payload = request.get_json(silent=True) or {}
    rating_key = str(payload.get("rating_key") or payload.get("ratingKey") or "").strip()
    section_id = str(payload.get("section_id") or payload.get("sectionId") or "").strip()
    request_timeout = _safe_int(cfg.get("tautulli_timeout_seconds"))
    if rating_key or section_id:
        ok = _tautulli_refresh_library_media_info(
            cfg.get("tautulli_url"),
            cfg.get("tautulli_api_key"),
            section_id=section_id or None,
            rating_key=rating_key or None,
            timeout=request_timeout,
        )
        if not ok:
            return jsonify({"error": "Tautulli refresh failed."}), 502
        return jsonify({"ok": True, "scope": "item"})
    app_name = str(payload.get("app") or "").strip().lower()
    media_type = "show" if app_name == "sonarr" else "movie" if app_name == "radarr" else ""
    if not media_type:
        return jsonify({"error": "rating_key or section_id is required."}), 400
    refreshed = _tautulli_refresh_library_type(cfg, media_type, timeout=request_timeout)
    if refreshed <= 0:
        return jsonify({"error": "Tautulli library refresh failed."}), 502
    return jsonify({"ok": True, "scope": "library", "refreshed": refreshed})




@app.route("/api/<app_name>/health")
@_auth_required
def api_arr_health(app_name: str):
    app_name = (app_name or "").strip().lower()
    if app_name not in ("sonarr", "radarr"):
        return jsonify({"error": "unknown app"}), 404

    cfg = _get_config()
    instances = cfg.get(f"{app_name}_instances") or []
    configured = bool(instances)

    def _norm_alert(a: dict) -> dict:
        return {
            "id": a.get("id"),
            "source": a.get("source"),
            "type": a.get("type"),
            "message": a.get("message"),
            "wikiUrl": a.get("wikiUrl"),
        }

    def fetch_one(inst: dict) -> dict:
        inst_id = str(inst.get("id", ""))
        inst_name = str(inst.get("name", "") or "").strip() or inst_id or app_name
        try:
            payload = _arr_get(
                inst.get("url") or "",
                inst.get("api_key") or "",
                "/api/v3/health",
                app_name=app_name,
            )
            if not isinstance(payload, list):
                payload = []
            alerts = [_norm_alert(a) for a in payload if isinstance(a, dict) and (a.get("type") or "").lower() != "ok"]
            return {"id": inst_id, "name": inst_name, "alerts": alerts, "error": None}
        except Exception:
            return {"id": inst_id, "name": inst_name, "alerts": [], "error": "unreachable"}


    results: list[dict] = []
    if instances:
        max_workers = min(8, max(1, len(instances)))
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            futures = [ex.submit(fetch_one, inst) for inst in instances]
            for fut in as_completed(futures):
                try:
                    results.append(fut.result())
                except Exception:
                    results.append({"id": "", "name": "", "alerts": [], "error": "unreachable"})


    # deterministic order for UI
    results.sort(key=lambda r: (r.get("name") or "", r.get("id") or ""))

    counts = {"notice": 0, "warning": 0, "error": 0}
    total = 0
    unreachable = 0
    for r in results:
        if r.get("error"):
            unreachable += 1
        for a in r.get("alerts") or []:
            t = (a.get("type") or "").lower()
            if t in counts:
                counts[t] += 1
                total += 1

    try:
        return jsonify(
            {
                "configured": configured,
                "app": app_name,
                "counts": counts,
                "total": total,
                "unreachable": unreachable,
                "instances": results,
            }
        )
    except Exception:
        # Do NOT leak stack trace or error details
        return jsonify({
            "error": "internal_error",
            "message": "Request failed"
        }), 500

@app.route("/api/caches/clear", methods=["POST"])
@_auth_required
def api_clear_caches():
    cfg = _get_config()
    global _tautulli_refresh_seen
    _tautulli_refresh_seen = None
    global _jellystat_refresh_seen
    _jellystat_refresh_seen = None
    _invalidate_cache()
    _wipe_cache_files()
    started = False
    provider = _playback_provider(cfg)
    if provider == "tautulli":
        started = _start_tautulli_background_refresh(cfg)
    elif provider == "jellystat":
        started = _start_jellystat_background_refresh(cfg)
    return jsonify(
        {
            "ok": True,
            "tautulli_refresh_started": started,
            "playback_refresh_started": started,
            "playback_provider": provider,
        }
    )

class _TTLFilenameCache:
    def __init__(self, ttl_seconds: int = 1800, max_entries: int = 5000):
        self._ttl = max(60, int(ttl_seconds or 1800))
        self._max = max(256, int(max_entries or 5000))
        self._lock = threading.Lock()
        # key -> (filename:str, expires_at:float, last_access:float)
        self._data: dict[tuple[str, str, int, str], tuple[str, float, float]] = {}

    def get(self, key: tuple[str, str, int, str]) -> str | None:
        now = time.time()
        with self._lock:
            entry = self._data.get(key)
            if not entry:
                return None
            filename, expires_at, _last_access = entry
            if expires_at <= now:
                self._data.pop(key, None)
                return None
            self._data[key] = (filename, expires_at, now)
            return filename

    def set(self, key: tuple[str, str, int, str], filename: str):
        if not filename:
            return
        now = time.time()
        expires_at = now + self._ttl
        with self._lock:
            self._data[key] = (str(filename), expires_at, now)
            if len(self._data) <= self._max:
                return
            # Evict least-recently-accessed first
            items = sorted(self._data.items(), key=lambda kv: kv[1][2])
            for evict_key, _ in items[: max(1, len(items) - self._max)]:
                self._data.pop(evict_key, None)


_FILENAME_CACHE = _TTLFilenameCache(
    ttl_seconds=_read_int_env("ARR_FILENAME_CACHE_TTL_SECONDS", 1800),
    max_entries=_read_int_env("ARR_FILENAME_CACHE_MAX_ENTRIES", 5000),
)


def _arr_item_path_for_cover(app_name: str, item_id: int) -> str:
    if app_name == "sonarr":
        return f"/api/v3/series/{item_id}"
    if app_name == "radarr":
        return f"/api/v3/movie/{item_id}"
    raise ValueError("unknown app")


def _pick_cover_filename(item_json: dict, cover_type: str) -> str | None:
    want = (cover_type or "").strip().lower()
    images = item_json.get("images") if isinstance(item_json, dict) else None
    if not isinstance(images, list):
        return None
    best_url = None
    for img in images:
        if not isinstance(img, dict):
            continue
        ctype = str(img.get("coverType") or "").strip().lower()
        url = img.get("url") or img.get("remoteUrl") or img.get("href")
        if not url:
            continue
        if want and ctype != want:
            continue
        best_url = str(url)
        break
    if not best_url:
        return None
    try:
        parts = urlsplit(best_url)
        path = parts.path or ""
        filename = path.rsplit("/", 1)[-1].strip()
        return filename or None
    except Exception:
        return None


def _stream_arr_mediacover(
    base_url: str, api_key: str, item_id: int, filename: str, timeout_seconds: int
):
    url = f"{base_url}/api/v3/mediacover/{item_id}/{filename}"
    headers = {"X-Api-Key": api_key}
    try:
        upstream = requests.get(
            url,
            headers=headers,
            stream=True,
            timeout=timeout_seconds if timeout_seconds > 0 else None,
        )
    except Exception as exc:
        logging.warning("Asset proxy upstream error: %s", exc)
        return jsonify({"error": "upstream fetch failed"}), 502

    if upstream.status_code != 200:
        try:
            upstream.close()
        except Exception:
            pass
        if upstream.status_code == 404:
            return jsonify({"error": "not found"}), 404
        return jsonify({"error": "upstream fetch failed"}), 502

    content_type = upstream.headers.get("Content-Type") or "application/octet-stream"
    content_length = upstream.headers.get("Content-Length")
    headers_out = {"Content-Type": content_type, "Cache-Control": "private, max-age=3600"}
    if content_length:
        headers_out["Content-Length"] = content_length

    def _generate():
        try:
            for chunk in upstream.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk
        finally:
            try:
                upstream.close()
            except Exception:
                pass

    return Response(_generate(), headers=headers_out)


@app.route("/api/<app_name>/asset/<instance_id>/<cover_type>/<int:item_id>")
@_auth_required
def api_arr_asset(app_name: str, instance_id: str, cover_type: str, item_id: int):
    app_name = (app_name or "").strip().lower()
    if app_name not in ("sonarr", "radarr"):
        return jsonify({"error": "unknown app"}), 404
    cover_type = (cover_type or "").strip()
    if not cover_type or not re.match(r"^[A-Za-z0-9_-]{1,24}$", cover_type):
        return jsonify({"error": "invalid cover type"}), 400
    if item_id <= 0:
        return jsonify({"error": "invalid id"}), 400

    cfg = _get_config()
    instances = cfg.get(f"{app_name}_instances") or []
    if not instances:
        return jsonify({"error": f"{app_name} is not configured."}), 503

    instance = _resolve_arr_instance(instances, str(instance_id or "").strip())
    if not instance:
        return jsonify({"error": "unknown instance"}), 404

    base_url = instance.get("url") or ""
    api_key = instance.get("api_key") or ""
    cache_key = (app_name, instance.get("id") or "", int(item_id), cover_type.lower())
    filename = _FILENAME_CACHE.get(cache_key)
    if not filename:
        timeout_seconds = _read_arr_timeout_seconds(app_name)
        try:
            item_json = _arr_get(
                base_url,
                api_key,
                _arr_item_path_for_cover(app_name, int(item_id)),
                timeout=timeout_seconds,
                app_name=app_name,
            )
        except Exception as exc:
            logging.warning("Asset proxy metadata error: %s", exc)
            return jsonify({"error": "upstream fetch failed"}), 502
        filename = _pick_cover_filename(item_json or {}, cover_type)
        if not filename:
            return jsonify({"error": "not found"}), 404
        _FILENAME_CACHE.set(cache_key, filename)

    timeout_seconds = _read_arr_timeout_seconds(app_name)
    return _stream_arr_mediacover(base_url, api_key, int(item_id), filename, timeout_seconds)



@app.route("/api/diagnostics/tautulli-match", methods=["POST"])
@_auth_required
def api_tautulli_match_diagnostics():
    payload = request.get_json(silent=True) or {}
    app_name = str(payload.get("app") or "").strip().lower()
    if app_name not in ("sonarr", "radarr"):
        return jsonify({"error": "Unknown app target."}), 400

    cfg = _get_config()
    provider = _playback_provider(cfg)
    if provider != "tautulli":
        return jsonify({"error": "Diagnostics are only available for Tautulli."}), 503
    if not (cfg.get("tautulli_url") and cfg.get("tautulli_api_key")):
        return jsonify({"error": "Tautulli is not configured."}), 503

    instances = cfg.get("sonarr_instances", []) if app_name == "sonarr" else cfg.get("radarr_instances", [])
    if not instances:
        return jsonify({"error": f"{app_name.capitalize()} is not configured."}), 503

    try:
        rows, _, _, _ = _get_cached_all(app_name, instances, cfg, force=False)
    except Exception:
        logger.exception("Diagnostics request failed")
        return jsonify({"error": "Failed to load cached rows."}), 502

    row, match_strategy = _diagnostic_find_row(rows, payload, app_name)
    if not row:
        return jsonify({"error": "Row not found in current cache."}), 404

    index = _get_tautulli_index(cfg, force=False)
    if not index:
        return jsonify({"error": "Tautulli index not available."}), 503

    now_ts = time.time()
    media_type = "shows" if app_name == "sonarr" else "movies"
    row_diag = dict(row)
    _apply_tautulli_stats([row_diag], index, media_type)

    eligible, skip_reason = _tautulli_row_eligible(row_diag, media_type)
    raw, bucket = _find_tautulli_stats_with_bucket(row_diag, index, media_type)
    raw_summary = {}
    stats = {}
    if raw:
        user_ids = raw.get("user_ids") or []
        play_count = _safe_int(raw.get("play_count"))
        total_seconds = _safe_int(raw.get("total_seconds"))
        raw_summary = {
            "play_count": play_count,
            "users_watched": raw.get("users_watched") or 0,
            "user_ids_count": len(user_ids),
            "last_epoch": raw.get("last_epoch") or 0,
            "total_seconds": total_seconds,
        }
        if total_seconds:
            raw_summary["total_hours"] = round(total_seconds / 3600.0, 2)
        if total_seconds and play_count:
            raw_summary["avg_play_seconds"] = int(total_seconds / play_count)
        raw_summary["duration_seconds"] = _safe_int(raw.get("duration_seconds"))
        raw_summary["total_seconds_source"] = raw.get("total_seconds_source") or ""
        stats = _tautulli_finalize_stats(raw, now_ts)

    def _age_seconds(ts: float | int | None) -> int | None:
        if not ts:
            return None
        try:
            return max(0, int(now_ts - float(ts)))
        except (TypeError, ValueError):
            return None

    def _safe_float(value) -> float | None:
        if value is None or value == "":
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    cache_path = cfg.get("sonarr_cache_path") if app_name == "sonarr" else cfg.get("radarr_cache_path")
    disk_cache = _load_arr_cache(cache_path)
    instance_id = str(row_diag.get("InstanceId") or "").strip()
    memory_entry = _cache.get_app_entry_snapshot(app_name, instance_id) if instance_id else {"ts": 0}
    disk_entry = disk_cache.get(instance_id, {}) if instance_id else {}
    disk_ts = _safe_int(disk_entry.get("ts")) if disk_entry else 0
    disk_age = _age_seconds(disk_ts)

    _, tautulli_ts = _cache.get_tautulli_state()
    tautulli_age = _age_seconds(tautulli_ts)
    bucket_counts = {}
    index_data = index.get(media_type) if isinstance(index, dict) else None
    bucket_names = [
        "tvdb",
        "tmdb",
        "imdb",
        "title_year",
        "title",
        "title_year_relaxed",
        "title_relaxed",
        "title_year_variant",
        "title_variant",
    ]
    if isinstance(index_data, dict):
        for bucket in bucket_names:
            bucket_counts[bucket] = len(index_data.get(bucket, {}))

    refresh_marker_age = None
    try:
        refresh_marker_age = _age_seconds(os.path.getmtime(_tautulli_refresh_marker_path()))
    except OSError:
        refresh_marker_age = None

    refresh_lock_age = None
    try:
        refresh_lock_age = _tautulli_refresh_lock_age(_tautulli_refresh_lock_path())
    except OSError:
        refresh_lock_age = None

    metadata_cache_size = None
    metadata_cache_path = cfg.get("tautulli_metadata_cache") or ""
    if metadata_cache_path:
        try:
            metadata_cache_size = len(_load_tautulli_metadata_cache(metadata_cache_path))
        except OSError:
            metadata_cache_size = None

    match_inputs = _diagnostic_match_inputs(row_diag, media_type)
    match_bucket, match_key, match_key_year = _diagnostic_match_key(row_diag, index, media_type)
    arr_watch_hours = _safe_float(row_diag.get("TotalWatchTimeHours"))
    taut_watch_hours = _safe_float(stats.get("TotalWatchTimeHours")) if stats else None
    watch_delta = None
    watch_ratio = None
    if arr_watch_hours is not None and taut_watch_hours is not None:
        watch_delta = round(taut_watch_hours - arr_watch_hours, 2)
        if arr_watch_hours > 0:
            watch_ratio = round(taut_watch_hours / arr_watch_hours, 3)
    arr_play_count = _safe_int(row_diag.get("PlayCount"))
    taut_play_count = _safe_int(stats.get("PlayCount")) if stats else _safe_int(raw_summary.get("play_count"))
    play_delta = None
    if arr_play_count or taut_play_count:
        play_delta = taut_play_count - arr_play_count
    arr_users = _safe_int(row_diag.get("UsersWatched"))
    taut_users = _safe_int(stats.get("UsersWatched")) if stats else _safe_int(raw_summary.get("users_watched"))
    users_delta = None
    if arr_users or taut_users:
        users_delta = taut_users - arr_users

    diag = {
        "generated_at": (
            datetime.datetime.now(datetime.timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
        ),
        "app_name": APP_NAME,
        "app_version": APP_VERSION,
        "app": app_name,
        "match_strategy": match_strategy,
        "row": _diagnostic_row_summary(row_diag, media_type),
        "tautulli": {
            "eligible": eligible,
            "skip_reason": "" if eligible else skip_reason,
            "index_hits": _diagnostic_index_hits(row_diag, index, media_type),
            "match_bucket": bucket or "",
            "match_key": {
                "bucket": match_bucket or bucket or "",
                "key": match_key,
                "year": match_key_year,
            },
            "raw_summary": raw_summary,
            "stats": stats,
            "refresh_in_progress": _tautulli_refresh_in_progress(cfg),
            "refresh_marker_age_seconds": refresh_marker_age,
            "refresh_lock_age_seconds": refresh_lock_age,
            "index_ts": tautulli_ts or 0,
            "index_age_seconds": tautulli_age,
            "index_bucket_counts": bucket_counts,
        },
        "cache": {
            "instance_id": instance_id,
            "cache_path": _safe_log_path(cache_path) if cache_path else "",
            "memory_ts": _safe_int(memory_entry.get("ts")) if memory_entry else 0,
            "memory_age_seconds": _age_seconds(memory_entry.get("ts")) if memory_entry else None,
            "disk_ts": disk_ts,
            "disk_age_seconds": disk_age,
        },
        "config": {
            "cache_seconds": _safe_int(cfg.get("cache_seconds")),
            "tautulli_timeout_seconds": _safe_int(cfg.get("tautulli_timeout_seconds")),
            "tautulli_fetch_seconds": _safe_int(cfg.get("tautulli_fetch_seconds")),
            "tautulli_lookup_limit": _safe_int(cfg.get("tautulli_metadata_lookup_limit")),
            "tautulli_lookup_seconds": _safe_int(cfg.get("tautulli_metadata_lookup_seconds")),
            "tautulli_metadata_cache_entries": metadata_cache_size,
            "tautulli_metadata_workers": _safe_int(cfg.get("tautulli_metadata_workers")),
            "tautulli_metadata_save_every": _safe_int(cfg.get("tautulli_metadata_save_every")),
            "tautulli_refresh_stale_seconds": _safe_int(cfg.get("tautulli_refresh_stale_seconds")),
        },
        "match_inputs": match_inputs,
        "comparison": {
            "sortarr_play_count": arr_play_count,
            "tautulli_play_count": taut_play_count,
            "play_count_delta": play_delta,
            "sortarr_users_watched": arr_users,
            "tautulli_users_watched": taut_users,
            "users_delta": users_delta,
            "sortarr_total_watch_hours": arr_watch_hours,
            "tautulli_total_watch_hours": taut_watch_hours,
            "watch_hours_delta": watch_delta,
            "watch_hours_ratio": watch_ratio,
            "sortarr_last_watched": row_diag.get("LastWatched") or "",
            "tautulli_last_watched": stats.get("LastWatched") if stats else "",
        },
    }
    return jsonify(diag)


@app.route("/api/shows")
@_auth_required
def api_shows():
    cfg = _get_config()
    instances = cfg.get("sonarr_instances", [])
    if not instances:
        return jsonify({"error": "Sonarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        refresh_notice = ""
        if force:
            cache_path = cfg.get("sonarr_cache_path")
            disk_cache = _load_arr_cache(cache_path)
            if _has_complete_cached_data("sonarr", instances, disk_cache):
                data, tautulli_warning, tautulli_notice, cold_cache = _get_cached_all(
                    "sonarr",
                    instances,
                    cfg,
                    force=False,
                )
                started = _start_arr_background_refresh("sonarr", instances, cfg)
                if started or _arr_refresh_in_progress("sonarr"):
                    refresh_notice = "Refreshing Sonarr data in background."
            else:
                data, tautulli_warning, tautulli_notice, cold_cache = _get_cached_all(
                    "sonarr",
                    instances,
                    cfg,
                    force=True,
                )
        else:
            data, tautulli_warning, tautulli_notice, cold_cache = _get_cached_all(
                "sonarr",
                instances,
                cfg,
                force=False,
            )
        resp = jsonify(data)
        if tautulli_warning:
            resp.headers["X-Sortarr-Warn"] = tautulli_warning
        notices = []
        notice_flags = []
        if cold_cache:
            notices.append(
                "First load can take a while for large libraries; later loads are cached and faster."
            )
            notice_flags.append("cold_cache")
        if tautulli_notice:
            notices.append(tautulli_notice)
            notice_flags.append("tautulli_refresh")
        if _read_sonarr_episodefile_mode() == "fast":
            notice_flags.append("sonarr_fast")
        if refresh_notice and not notices:
            notices.append(refresh_notice)
        if notice_flags:
            resp.headers["X-Sortarr-Notice-Flags"] = ",".join(notice_flags)
        if notices:
            resp.headers["X-Sortarr-Notice"] = " | ".join(notices)
        return resp
    except Exception as exc:
        logger.exception("Sonarr request failed")
        resp = jsonify({"error": "Sonarr request failed"})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("sonarr", exc)
        return resp, 502


@app.route("/api/movies")
@_auth_required
def api_movies():
    cfg = _get_config()
    instances = cfg.get("radarr_instances", [])
    if not instances:
        return jsonify({"error": "Radarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        refresh_notice = ""
        if force:
            cache_path = cfg.get("radarr_cache_path")
            disk_cache = _load_arr_cache(cache_path)
            if _has_complete_cached_data("radarr", instances, disk_cache):
                data, tautulli_warning, tautulli_notice, cold_cache = _get_cached_all(
                    "radarr",
                    instances,
                    cfg,
                    force=False,
                )
                started = _start_arr_background_refresh("radarr", instances, cfg)
                if started or _arr_refresh_in_progress("radarr"):
                    refresh_notice = "Refreshing Radarr data in background."
            else:
                data, tautulli_warning, tautulli_notice, cold_cache = _get_cached_all(
                    "radarr",
                    instances,
                    cfg,
                    force=True,
                )
        else:
            data, tautulli_warning, tautulli_notice, cold_cache = _get_cached_all(
                "radarr",
                instances,
                cfg,
                force=False,
            )
        lite_raw = str(request.args.get("lite") or "").strip().lower()
        lite_requested = lite_raw in {"1", "true", "yes", "on"}
        lite_explicit_off = lite_raw in {"0", "false", "no", "off"}
        lite_enabled = False
        if lite_requested:
            lite_enabled = True
        elif (
            not lite_explicit_off
            and not force
            and cold_cache
            and _read_bool_env("SORTARR_RADARR_LITE_FIRST", True)
        ):
            lite_enabled = True
        if lite_enabled:
            data = _radarr_lite_rows(data)
        resp = jsonify(data)
        if tautulli_warning:
            resp.headers["X-Sortarr-Warn"] = tautulli_warning
        notices = []
        notice_flags = []
        if cold_cache:
            notices.append(
                "First load can take a while for large libraries; later loads are cached and faster."
            )
            notice_flags.append("cold_cache")
        if tautulli_notice:
            notices.append(tautulli_notice)
            notice_flags.append("tautulli_refresh")
        if lite_enabled:
            notice_flags.append("radarr_lite")
        if refresh_notice and not notices:
            notices.append(refresh_notice)
        if notice_flags:
            resp.headers["X-Sortarr-Notice-Flags"] = ",".join(notice_flags)
        if notices:
            resp.headers["X-Sortarr-Notice"] = " | ".join(notices)
        return resp
    except Exception as exc:
        logger.exception("Radarr request failed")
        resp = jsonify({"error": "Radarr request failed"})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("radarr", exc)
        return resp, 502


@app.route("/api/shows.csv")
@_auth_required
def shows_csv():
    cfg = _get_config()
    instances = cfg.get("sonarr_instances", [])
    playback_enabled = _playback_enabled(cfg)
    if not instances:
        return jsonify({"error": "Sonarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        data, _, _, _ = _get_cached_all("sonarr", instances, cfg, force=force)
    except Exception as exc:
        logger.exception("Sonarr request failed")
        resp = jsonify({"error": "Sonarr request failed"})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("sonarr", exc)
        return resp, 502

    include_instance = len(instances) > 1
    fieldnames = []
    if include_instance:
        fieldnames.append("Instance")
    fieldnames.extend(
        [
            "Title",
            "DateAdded",
            "TitleSlug",
            "TmdbId",
            "Status",
            "Monitored",
            "QualityProfile",
            "Tags",
            "ReleaseGroup",
            "SeriesType",
            "Studio",
            "OriginalLanguage",
            "Genres",
            "LastAired",
            "MissingCount",
            "CutoffUnmetCount",
            "RecentlyGrabbed",
            "UseSceneNumbering",
            "Airing",
            "SeasonCount",
            "EpisodesCounted",
            "TotalSizeGB",
            "AvgEpisodeSizeGB",
            "GBPerHour",
            "BitrateMbps",
            "VideoQuality",
            "Resolution",
            "VideoCodec",
            "VideoHDR",
            "AudioCodec",
            "AudioChannels",
            "AudioLanguages",
            "SubtitleLanguages",
            "AudioCodecMixed",
            "AudioLanguagesMixed",
            "SubtitleLanguagesMixed",
            "PlayCount",
            "LastWatched",
            "DaysSinceWatched",
            "TotalWatchTimeHours",
            "ContentHours",
            "WatchContentRatio",
            "UsersWatched",
            "TautulliMatchStatus",
            "TautulliMatchReason",
            "RootFolder",
            "Path",
        ]
    )

    if not playback_enabled:
        fieldnames = [field for field in fieldnames if field not in TAUTULLI_CSV_FIELDS]

    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=fieldnames)
    w.writeheader()
    for r in data:
        row = {k: _csv_safe_value(r.get(k, "")) for k in fieldnames}
        if include_instance:
            row["Instance"] = _csv_safe_value(r.get("InstanceName", ""))
        w.writerow(row)

    return Response(
        out.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=Sortarr-sonarr.csv"},
    )


@app.route("/api/movies.csv")
@_auth_required
def movies_csv():
    cfg = _get_config()
    instances = cfg.get("radarr_instances", [])
    playback_enabled = _playback_enabled(cfg)
    if not instances:
        return jsonify({"error": "Radarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        data, _, _, _ = _get_cached_all("radarr", instances, cfg, force=force)
    except Exception as exc:
        logger.exception("Radarr request failed")
        resp = jsonify({"error": "Radarr request failed"})
        resp.headers["X-Sortarr-Error"] = _arr_error_hint("radarr", exc)
        return resp, 502

    include_instance = len(instances) > 1
    fieldnames = []
    if include_instance:
        fieldnames.append("Instance")
    fieldnames.extend(
        [
            "Title",
            "DateAdded",
            "TmdbId",
            "Status",
            "Monitored",
            "QualityProfile",
            "Tags",
            "ReleaseGroup",
            "Studio",
            "OriginalLanguage",
            "Genres",
            "MissingCount",
            "CutoffUnmetCount",
            "RecentlyGrabbed",
            "HasFile",
            "IsAvailable",
            "InCinemas",
            "LastSearchTime",
            "Edition",
            "CustomFormats",
            "CustomFormatScore",
            "QualityCutoffNotMet",
            "Languages",
            "RuntimeMins",
            "FileSizeGB",
            "GBPerHour",
            "BitrateMbps",
            "VideoQuality",
            "Resolution",
            "VideoCodec",
            "VideoHDR",
            "AudioCodec",
            "AudioChannels",
            "AudioLanguages",
            "SubtitleLanguages",
            "AudioCodecMixed",
            "AudioLanguagesMixed",
            "SubtitleLanguagesMixed",
            "PlayCount",
            "LastWatched",
            "DaysSinceWatched",
            "TotalWatchTimeHours",
            "ContentHours",
            "WatchContentRatio",
            "UsersWatched",
            "TautulliMatchStatus",
            "TautulliMatchReason",
            "RootFolder",
            "Path",
        ]
    )

    if not playback_enabled:
        fieldnames = [field for field in fieldnames if field not in TAUTULLI_CSV_FIELDS]

    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=fieldnames)
    w.writeheader()
    for r in data:
        row = {k: _csv_safe_value(r.get(k, "")) for k in fieldnames}
        if include_instance:
            row["Instance"] = _csv_safe_value(r.get("InstanceName", ""))
        w.writerow(row)

    return Response(
        out.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=Sortarr-radarr.csv"},
    )


@app.route("/health")
@_auth_required
def health():
    return "ok", 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8787"))
    app.run(host="0.0.0.0", port=port)
