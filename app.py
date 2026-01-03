import os
import re
import time
import datetime
import csv
import io
import logging
from functools import wraps

import requests
from flask import Flask, jsonify, render_template, request, Response, redirect, url_for

APP_NAME = "Sortarr"
APP_VERSION = "0.5.5"

app = Flask(__name__)

LOG_LEVEL = os.environ.get("SORTARR_LOG_LEVEL", "INFO").upper()
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=LOG_LEVEL,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
logger = logging.getLogger("sortarr")
logger.setLevel(LOG_LEVEL)

_http = requests.Session()

_cache = {
    "sonarr": {"ts": 0, "data": []},
    "radarr": {"ts": 0, "data": []},
    "tautulli": {"ts": 0, "data": {}},
}

ENV_FILE_PATH = os.environ.get(
    "ENV_FILE_PATH",
    os.path.join(os.path.dirname(__file__), ".env"),
)
_env_loaded = False
_env_mtime = None


def _ensure_env_loaded():
    global _env_loaded, _env_mtime
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


def _read_int_env(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, str(default)))
    except (TypeError, ValueError):
        return default


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
    lines = []
    for key in [
        "SONARR_URL",
        "SONARR_API_KEY",
        "RADARR_URL",
        "RADARR_API_KEY",
        "TAUTULLI_URL",
        "TAUTULLI_API_KEY",
        "BASIC_AUTH_USER",
        "BASIC_AUTH_PASS",
        "CACHE_SECONDS",
    ]:
        if key in values:
            lines.append(f"{key}={_quote_env_value(values[key])}")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def _get_config():
    _ensure_env_loaded()
    return {
        "sonarr_url": _normalize_url(os.environ.get("SONARR_URL", "")),
        "sonarr_api_key": os.environ.get("SONARR_API_KEY", ""),
        "radarr_url": _normalize_url(os.environ.get("RADARR_URL", "")),
        "radarr_api_key": os.environ.get("RADARR_API_KEY", ""),
        "tautulli_url": _normalize_url(os.environ.get("TAUTULLI_URL", "")),
        "tautulli_api_key": os.environ.get("TAUTULLI_API_KEY", ""),
        "cache_seconds": _read_int_env("CACHE_SECONDS", 300),
        "basic_auth_user": os.environ.get("BASIC_AUTH_USER", ""),
        "basic_auth_pass": os.environ.get("BASIC_AUTH_PASS", ""),
    }


def _config_complete(cfg: dict) -> bool:
    has_sonarr = cfg["sonarr_url"] and cfg["sonarr_api_key"]
    has_radarr = cfg["radarr_url"] and cfg["radarr_api_key"]
    return bool(has_sonarr or has_radarr)


def _invalidate_cache():
    for entry in _cache.values():
        entry["ts"] = 0
        entry["data"] = []


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


def _arr_get(base_url: str, api_key: str, path: str, params: dict | None = None):
    if not base_url:
        raise RuntimeError("Base URL is not set")
    if not api_key:
        raise RuntimeError("API key is not set")

    url = f"{base_url}{path}"
    headers = {"X-Api-Key": api_key}
    r = _http.get(url, headers=headers, params=params, timeout=45)
    r.raise_for_status()
    return r.json()


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


def _normalize_epoch(value) -> int:
    ts = _safe_int(value)
    if ts <= 0:
        return 0
    if ts > 10_000_000_000:
        ts = int(ts / 1000)
    return ts


def _iso_from_epoch(ts: int) -> str:
    if not ts:
        return ""
    dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _normalize_title_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def _tautulli_get(base_url: str, api_key: str, cmd: str, params: dict | None = None):
    if not base_url:
        raise RuntimeError("Tautulli base URL is not set")
    if not api_key:
        raise RuntimeError("Tautulli API key is not set")

    url = f"{base_url}/api/v2"
    query = {"apikey": api_key, "cmd": cmd}
    if params:
        query.update(params)

    r = _http.get(url, params=query, timeout=45)
    r.raise_for_status()
    payload = r.json()
    response = payload.get("response", {})
    if response.get("result") != "success":
        message = response.get("message") or "Tautulli request failed"
        raise RuntimeError(message)
    return response.get("data")


def _tautulli_extract_ids(item: dict) -> dict:
    ids = {}

    def handle_guid(value: str):
        if not value:
            return
        text = str(value)
        tmdb_match = re.search(r"(?:tmdb|themoviedb)://(\d+)", text)
        tvdb_match = re.search(r"(?:tvdb|thetvdb)://(\d+)", text)
        imdb_match = re.search(r"imdb://(tt\d+)", text)
        if tmdb_match and "tmdb" not in ids:
            ids["tmdb"] = tmdb_match.group(1)
        if tvdb_match and "tvdb" not in ids:
            ids["tvdb"] = tvdb_match.group(1)
        if imdb_match and "imdb" not in ids:
            ids["imdb"] = imdb_match.group(1)

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
    total_duration = _normalize_duration_seconds(
        item.get("total_duration")
        or item.get("total_time")
        or item.get("watch_time")
        or item.get("total_watch_time")
        or item.get("total_viewed_time")
    )
    if total_duration <= 0:
        total_duration = _normalize_duration_seconds(
            item.get("total_duration_ms")
            or item.get("total_time_ms")
            or item.get("watch_time_ms")
            or item.get("total_watch_time_ms")
        )
    if total_duration <= 0 and duration and play_count:
        total_duration = duration * play_count

    return {
        "play_count": play_count,
        "users_watched": users_watched,
        "last_epoch": last_played,
        "total_seconds": total_duration,
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

    target_ids = set(target.get("user_ids") or [])
    raw_ids = set(raw.get("user_ids") or [])
    if raw_ids:
        target_ids.update(raw_ids)
        target["user_ids"] = target_ids


def _tautulli_apply_history(target: dict, raw: dict):
    if _safe_int(raw.get("total_seconds")):
        target["total_seconds"] = _safe_int(raw.get("total_seconds"))
    raw_ids = set(raw.get("user_ids") or [])
    if raw_ids:
        target["user_ids"] = raw_ids
    if _safe_int(raw.get("last_epoch")):
        target["last_epoch"] = max(_safe_int(target.get("last_epoch")), _safe_int(raw.get("last_epoch")))
    if _safe_int(raw.get("play_count")):
        target["play_count"] = max(_safe_int(target.get("play_count")), _safe_int(raw.get("play_count")))


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
    }


def _tautulli_fetch_library_items(base_url: str, api_key: str, section_id: str | int) -> list[dict]:
    items = []
    start = 0
    length = 500
    while True:
        data = _tautulli_get(
            base_url,
            api_key,
            "get_library_media_info",
            params={"section_id": section_id, "start": start, "length": length},
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
        if not chunk or len(items) >= total:
            break
        start += length

    return items


def _tautulli_fetch_history(base_url: str, api_key: str) -> list[dict]:
    items = []
    start = 0
    length = 500
    while True:
        data = _tautulli_get(
            base_url,
            api_key,
            "get_history",
            params={"start": start, "length": length},
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
        if not chunk or len(items) >= total:
            break
        start += length

    return items


def _tautulli_merge_into(store: dict, key, raw: dict):
    if not key:
        return
    if key not in store:
        store[key] = raw.copy()
    else:
        _tautulli_merge_raw(store[key], raw)


def _tautulli_build_index(items: list[dict], media_type: str) -> dict:
    index = {
        "tvdb": {},
        "tmdb": {},
        "imdb": {},
        "title_year": {},
        "title": {},
    }
    episode_agg = {
        "tvdb": {},
        "tmdb": {},
        "imdb": {},
        "title_year": {},
        "title": {},
    }

    for item in items:
        item_type = str(item.get("media_type") or "").lower()
        if media_type == "show" and item_type == "episode":
            raw = _tautulli_raw_stats_from_item(item)
            ids = _tautulli_extract_ids(item)
            title = item.get("grandparent_title") or item.get("title") or ""
            title_key = _normalize_title_key(title)
            year = str(item.get("grandparent_year") or item.get("year") or "").strip()
            if "tvdb" in ids:
                _tautulli_merge_into(episode_agg["tvdb"], str(ids["tvdb"]), raw)
            if "tmdb" in ids:
                _tautulli_merge_into(episode_agg["tmdb"], str(ids["tmdb"]), raw)
            if "imdb" in ids:
                _tautulli_merge_into(episode_agg["imdb"], str(ids["imdb"]), raw)
            if title_key and year:
                _tautulli_merge_into(episode_agg["title_year"], (title_key, year), raw)
            if title_key:
                _tautulli_merge_into(episode_agg["title"], title_key, raw)
            continue

        if item_type and item_type != media_type:
            continue

        raw = _tautulli_raw_stats_from_item(item)
        ids = _tautulli_extract_ids(item)
        if "tvdb" in ids:
            _tautulli_merge_into(index["tvdb"], str(ids["tvdb"]), raw)
        if "tmdb" in ids:
            _tautulli_merge_into(index["tmdb"], str(ids["tmdb"]), raw)
        if "imdb" in ids:
            _tautulli_merge_into(index["imdb"], str(ids["imdb"]), raw)

        title = item.get("title") or item.get("grandparent_title") or ""
        title_key = _normalize_title_key(title)
        year = str(item.get("year") or "").strip()
        if title_key and year:
            _tautulli_merge_into(index["title_year"], (title_key, year), raw)
        if title_key:
            _tautulli_merge_into(index["title"], title_key, raw)

    for bucket in ["tvdb", "tmdb", "imdb", "title_year", "title"]:
        for key, raw in episode_agg[bucket].items():
            if key in index[bucket]:
                _tautulli_merge_raw(index[bucket][key], raw)
            else:
                index[bucket][key] = raw

    return index


def _tautulli_build_history_index(items: list[dict], media_type: str) -> dict:
    index = {
        "tvdb": {},
        "tmdb": {},
        "imdb": {},
        "title_year": {},
        "title": {},
    }

    for item in items:
        item_type = str(item.get("media_type") or "").lower()
        if media_type == "show" and item_type != "episode":
            continue
        if media_type == "movie" and item_type != "movie":
            continue

        raw = _tautulli_raw_history_stats_from_item(item)
        ids = _tautulli_extract_ids(item)

        if media_type == "show":
            title = item.get("grandparent_title") or item.get("title") or ""
            year = str(item.get("grandparent_year") or item.get("year") or "").strip()
        else:
            title = item.get("title") or ""
            year = str(item.get("year") or "").strip()

        title_key = _normalize_title_key(title)

        if "tvdb" in ids:
            _tautulli_merge_into(index["tvdb"], str(ids["tvdb"]), raw)
        if "tmdb" in ids:
            _tautulli_merge_into(index["tmdb"], str(ids["tmdb"]), raw)
        if "imdb" in ids:
            _tautulli_merge_into(index["imdb"], str(ids["imdb"]), raw)
        if title_key and year:
            _tautulli_merge_into(index["title_year"], (title_key, year), raw)
        if title_key:
            _tautulli_merge_into(index["title"], title_key, raw)

    return index


def _get_tautulli_index(cfg: dict, force: bool = False) -> dict | None:
    if not (cfg.get("tautulli_url") and cfg.get("tautulli_api_key")):
        return None

    now = time.time()
    entry = _cache["tautulli"]
    if force or (now - entry["ts"] > cfg["cache_seconds"]):
        libraries = _tautulli_get(cfg["tautulli_url"], cfg["tautulli_api_key"], "get_libraries")
        if isinstance(libraries, dict) and "libraries" in libraries:
            libraries = libraries.get("libraries")
        shows_items = []
        movies_items = []
        for lib in libraries or []:
            section_type = str(lib.get("section_type") or lib.get("type") or "").lower()
            if section_type not in ("show", "movie"):
                continue
            section_id = lib.get("section_id") or lib.get("id")
            if not section_id:
                continue
            items = _tautulli_fetch_library_items(cfg["tautulli_url"], cfg["tautulli_api_key"], section_id)
            if section_type == "show":
                shows_items.extend(items)
            else:
                movies_items.extend(items)

        history_items = _tautulli_fetch_history(cfg["tautulli_url"], cfg["tautulli_api_key"])
        shows_index = _tautulli_build_index(shows_items, "show")
        movies_index = _tautulli_build_index(movies_items, "movie")
        history_shows = _tautulli_build_history_index(history_items, "show")
        history_movies = _tautulli_build_history_index(history_items, "movie")

        for bucket in ["tvdb", "tmdb", "imdb", "title_year", "title"]:
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

        entry["data"] = {
            "shows": shows_index,
            "movies": movies_index,
        }
        entry["ts"] = now

    return entry["data"]


def _find_tautulli_stats(row: dict, index: dict, media_type: str) -> dict | None:
    data = index.get(media_type) if index else None
    if not data:
        return None

    if media_type == "shows":
        tvdb_id = str(row.get("TvdbId") or "").strip()
        if tvdb_id and tvdb_id in data["tvdb"]:
            return data["tvdb"][tvdb_id]
    tmdb_id = str(row.get("TmdbId") or "").strip()
    if tmdb_id and tmdb_id in data["tmdb"]:
        return data["tmdb"][tmdb_id]
    imdb_id = str(row.get("ImdbId") or "").strip()
    if imdb_id and imdb_id in data["imdb"]:
        return data["imdb"][imdb_id]

    title_key = _normalize_title_key(row.get("Title") or "")
    year = str(row.get("Year") or "").strip()
    if title_key and year and (title_key, year) in data["title_year"]:
        return data["title_year"][(title_key, year)]
    if title_key and title_key in data["title"]:
        return data["title"][title_key]

    return None


def _apply_tautulli_stats(rows: list[dict], index: dict, media_type: str):
    now_ts = time.time()
    for row in rows:
        row["TautulliMatched"] = False
        raw = _find_tautulli_stats(row, index, media_type)
        if raw:
            row.update(_tautulli_finalize_stats(raw, now_ts))
            row["TautulliMatched"] = True
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

    match = re.search(r"(\d{3,4})\s*([pi])$", res.lower())
    if match:
        return f"{match.group(1)}{match.group(2)}"

    match = re.search(r"(\d{3,4})\s*x\s*(\d{3,4})\s*([pi])?$", res.lower())
    if match:
        width = match.group(1)
        height = match.group(2)
        existing = match.group(3)
        return f"{width}x{height}{existing or suffix}"

    match = re.search(r"(\d{3,4})", res)
    if match:
        return f"{match.group(1)}{suffix}"

    return res


def _audio_format_from_file(f: dict) -> str:
    return (f.get("mediaInfo") or {}).get("audioCodec", "") or ""


def _audio_channels_from_file(f: dict):
    return (f.get("mediaInfo") or {}).get("audioChannels", "")


def _audio_profile_from_file(f: dict) -> str:
    media = f.get("mediaInfo") or {}
    profile = media.get("audioProfile") or f.get("audioProfile") or ""
    if profile:
        return profile

    features = media.get("audioAdditionalFeatures") or f.get("audioAdditionalFeatures") or ""
    if isinstance(features, list):
        return ", ".join([v for v in features if v])
    if isinstance(features, str):
        return features
    if isinstance(features, tuple):
        return ", ".join([v for v in features if v])

    codec = media.get("audioCodec") or f.get("audioCodec") or ""
    if isinstance(codec, str) and "atmos" in codec.lower():
        return "Atmos"
    return ""


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
        text = str(item).strip().lower()
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


def _audio_languages_from_file(f: dict) -> str:
    media = f.get("mediaInfo") or {}
    return _format_language_list(media.get("audioLanguages") or f.get("audioLanguages") or "")


def _subtitle_languages_from_file(f: dict) -> str:
    media = f.get("mediaInfo") or {}
    return _format_language_list(media.get("subtitles") or f.get("subtitles") or "")


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


def _compute_sonarr(base_url: str, api_key: str, exclude_specials: bool = True):
    series = _arr_get(base_url, api_key, "/api/v3/series")
    files_by_series = None

    results = []
    for s in series:
        series_id = s.get("id")
        title = s.get("title") or ""
        title_slug = s.get("titleSlug") or ""  # IMPORTANT for Sonarr UI links
        path = s.get("path") or ""
        year = s.get("year") or ""
        tvdb_id = s.get("tvdbId") or ""
        imdb_id = s.get("imdbId") or ""
        tmdb_id = s.get("tmdbId") or ""

        files = _arr_get(
            base_url,
            api_key,
            "/api/v3/episodefile",
            params={"seriesId": series_id},
        )

        if exclude_specials:
            files = [f for f in files if int(f.get("seasonNumber") or -1) != 0]

        count = len(files)
        total_bytes = sum(int(f.get("size") or 0) for f in files)

        qualities = [_quality_from_file(f) for f in files]
        resolutions = [_resolution_from_file(f) for f in files]
        audio_formats = [_audio_format_from_file(f) for f in files]
        audio_profiles = [_audio_profile_from_file(f) for f in files]
        audio_channels = [
            str(_audio_channels_from_file(f) or "") for f in files
        ]
        audio_languages = [_audio_languages_from_file(f) for f in files]
        subtitle_languages = [_subtitle_languages_from_file(f) for f in files]
        video_codecs = [_video_codec_from_file(f) for f in files]
        video_hdrs = [_video_hdr_from_file(f) for f in files]

        video_quality = _most_common(qualities)
        resolution = _most_common(resolutions)
        audio_format = _most_common(audio_formats)
        audio_profile = _most_common(audio_profiles)
        audio_channels = _most_common(audio_channels)
        audio_codec_mixed = _is_mixed(audio_formats)
        audio_profile_mixed = _is_mixed(audio_profiles)
        audio_languages_value = _most_common(audio_languages)
        subtitle_languages_value = _most_common(subtitle_languages)
        audio_languages_mixed = _languages_mixed(audio_languages)
        subtitle_languages_mixed = _languages_mixed(subtitle_languages)
        video_codec = _most_common(video_codecs)
        video_hdr = _most_common(video_hdrs)

        total_gib = _bytes_to_gib(total_bytes)
        avg_gib = round((total_bytes / count) / (1024 ** 3), 2) if count else 0.0

        results.append(
            {
                "SeriesId": series_id,
                "Title": title,
                "TitleSlug": title_slug,
                "Year": year,
                "TvdbId": tvdb_id,
                "ImdbId": imdb_id,
                "TmdbId": tmdb_id,
                "EpisodesCounted": count,
                "TotalSizeGB": total_gib,
                "AvgEpisodeSizeGB": avg_gib,
                "VideoQuality": video_quality,
                "Resolution": resolution,
                "AudioCodec": audio_format,
                "AudioProfile": audio_profile,
                "AudioChannels": audio_channels,
                "AudioLanguages": audio_languages_value,
                "SubtitleLanguages": subtitle_languages_value,
                "AudioCodecMixed": audio_codec_mixed,
                "AudioProfileMixed": audio_profile_mixed,
                "AudioLanguagesMixed": audio_languages_mixed,
                "SubtitleLanguagesMixed": subtitle_languages_mixed,
                "VideoCodec": video_codec,
                "VideoHDR": video_hdr,
                "Path": path,
            }
        )

    results.sort(key=lambda x: x["AvgEpisodeSizeGB"], reverse=True)
    return results


def _compute_radarr(base_url: str, api_key: str):
    movies = _arr_get(base_url, api_key, "/api/v3/movie")

    results = []
    for m in movies:
        radarr_internal_id = m.get("id")
        tmdb_id = m.get("tmdbId")  # IMPORTANT for Radarr UI links
        imdb_id = m.get("imdbId") or ""
        title = m.get("title") or ""
        path = m.get("path") or ""
        runtime = int(m.get("runtime") or 0)
        year = m.get("year") or ""

        file_size_bytes = 0
        video_quality = ""
        resolution = ""
        audio_format = ""
        audio_profile = ""
        audio_channels = ""
        audio_languages = ""
        subtitle_languages = ""
        video_codec = ""
        video_hdr = ""
        audio_codec_mixed = False
        audio_profile_mixed = False
        audio_languages_mixed = False
        subtitle_languages_mixed = False
        files = []
        movie_file = m.get("movieFile")
        if movie_file:
            if isinstance(movie_file, list):
                files = movie_file
            else:
                files = [movie_file]
        elif m.get("hasFile"):
            files = _arr_get(
                base_url,
                api_key,
                "/api/v3/moviefile",
                params={"movieId": radarr_internal_id},
            )

        primary = None
        for f in files:
            size = int(f.get("size") or 0)
            file_size_bytes += size
            if not primary or size > int(primary.get("size") or 0):
                primary = f

        if primary:
            video_quality = _quality_from_file(primary)
            resolution = _resolution_from_file(primary)
            audio_format = _audio_format_from_file(primary)
            audio_profile = _audio_profile_from_file(primary)
            audio_channels = str(_audio_channels_from_file(primary) or "")
            audio_languages = _audio_languages_from_file(primary)
            subtitle_languages = _subtitle_languages_from_file(primary)
            audio_languages_mixed = _languages_mixed([audio_languages])
            subtitle_languages_mixed = _languages_mixed([subtitle_languages])
            video_codec = _video_codec_from_file(primary)
            video_hdr = _video_hdr_from_file(primary)

        size_gib = _bytes_to_gib(file_size_bytes)

        gb_per_hour = 0.0
        if runtime > 0 and size_gib > 0:
            gb_per_hour = round(size_gib / (runtime / 60.0), 2)

        results.append(
            {
                # Keep internal id if you want it for debugging or future API calls
                "MovieId": radarr_internal_id,
                # Use this for building the Radarr UI link
                "TmdbId": tmdb_id,
                "ImdbId": imdb_id,
                "Title": title,
                "Year": year,
                "RuntimeMins": runtime if runtime else "",
                "FileSizeGB": size_gib if size_gib else "",
                "GBPerHour": gb_per_hour if gb_per_hour else "",
                "VideoQuality": video_quality,
                "Resolution": resolution,
                "AudioCodec": audio_format,
                "AudioProfile": audio_profile,
                "AudioChannels": audio_channels,
                "AudioLanguages": audio_languages,
                "SubtitleLanguages": subtitle_languages,
                "AudioCodecMixed": audio_codec_mixed,
                "AudioProfileMixed": audio_profile_mixed,
                "AudioLanguagesMixed": audio_languages_mixed,
                "SubtitleLanguagesMixed": subtitle_languages_mixed,
                "VideoCodec": video_codec,
                "VideoHDR": video_hdr,
                "Path": path,
            }
        )

    results.sort(key=lambda x: (x["GBPerHour"] or 0), reverse=True)
    return results


def _get_cached(app_name: str, force: bool = False):
    cfg = _get_config()
    now = time.time()
    entry = _cache[app_name]
    if force or (now - entry["ts"] > cfg["cache_seconds"]):
        if app_name == "sonarr":
            entry["data"] = _compute_sonarr(
                cfg["sonarr_url"],
                cfg["sonarr_api_key"],
                exclude_specials=True,
            )
        else:
            entry["data"] = _compute_radarr(
                cfg["radarr_url"],
                cfg["radarr_api_key"],
            )
        entry["ts"] = now
        try:
            tautulli_index = _get_tautulli_index(cfg, force=force)
            if tautulli_index:
                if app_name == "sonarr":
                    _apply_tautulli_stats(entry["data"], tautulli_index, "shows")
                else:
                    _apply_tautulli_stats(entry["data"], tautulli_index, "movies")
        except Exception as exc:
            logger.warning("Tautulli stats fetch failed: %s", exc)
    return entry["data"]


@app.route("/")
@_auth_required
def index():
    cfg = _get_config()
    if not _config_complete(cfg):
        return redirect(url_for("setup"))
    return render_template("index.html", app_name=APP_NAME, app_version=APP_VERSION)


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
    if request.method == "POST":
        cache_raw = request.form.get("cache_seconds", "").strip()
        try:
            cache_seconds = int(cache_raw) if cache_raw else 300
        except ValueError:
            cache_seconds = None

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
            "SONARR_URL": _normalize_url(request.form.get("sonarr_url", "")),
            "SONARR_API_KEY": request.form.get("sonarr_api_key", "").strip(),
            "RADARR_URL": _normalize_url(request.form.get("radarr_url", "")),
            "RADARR_API_KEY": request.form.get("radarr_api_key", "").strip(),
            "TAUTULLI_URL": _normalize_url(request.form.get("tautulli_url", "")),
            "TAUTULLI_API_KEY": request.form.get("tautulli_api_key", "").strip(),
            "BASIC_AUTH_USER": basic_auth_user,
            "BASIC_AUTH_PASS": basic_auth_pass,
            "CACHE_SECONDS": str(cache_seconds if cache_seconds is not None else ""),
        }

        if cache_seconds is None:
            error = "Cache seconds must be a whole number."
        elif cache_seconds < 30:
            error = "Cache seconds must be at least 30."
        elif not (data["SONARR_URL"] and data["SONARR_API_KEY"]) and not (
            data["RADARR_URL"] and data["RADARR_API_KEY"]
        ):
            error = "Provide Sonarr or Radarr URL and API key."
        else:
            try:
                _write_env_file(ENV_FILE_PATH, data)
                for k, v in data.items():
                    os.environ[k] = v
                _invalidate_cache()
                return redirect(url_for("index"))
            except OSError:
                error = "Failed to write config file."

    return render_template(
        "setup.html",
        env_path=ENV_FILE_PATH,
        error=error,
        values=cfg,
        app_name=APP_NAME,
        app_version=APP_VERSION,
    )


@app.route("/api/config")
@_auth_required
def api_config():
    cfg = _get_config()
    return jsonify(
        {
            "app_name": APP_NAME,
            "app_version": APP_VERSION,
            "sonarr_url": cfg["sonarr_url"],
            "radarr_url": cfg["radarr_url"],
            "tautulli_configured": bool(cfg["tautulli_url"] and cfg["tautulli_api_key"]),
            "configured": _config_complete(cfg),
        }
    )


@app.route("/api/version")
def api_version():
    return jsonify({"app_name": APP_NAME, "app_version": APP_VERSION})


@app.route("/api/shows")
@_auth_required
def api_shows():
    cfg = _get_config()
    if not (cfg["sonarr_url"] and cfg["sonarr_api_key"]):
        return jsonify({"error": "Sonarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        data = _get_cached("sonarr", force=force)
        return jsonify(data)
    except Exception as exc:
        return jsonify({"error": "Sonarr request failed", "detail": str(exc)}), 502


@app.route("/api/movies")
@_auth_required
def api_movies():
    cfg = _get_config()
    if not (cfg["radarr_url"] and cfg["radarr_api_key"]):
        return jsonify({"error": "Radarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        data = _get_cached("radarr", force=force)
        return jsonify(data)
    except Exception as exc:
        return jsonify({"error": "Radarr request failed", "detail": str(exc)}), 502


@app.route("/api/shows.csv")
@_auth_required
def shows_csv():
    cfg = _get_config()
    if not (cfg["sonarr_url"] and cfg["sonarr_api_key"]):
        return jsonify({"error": "Sonarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        data = _get_cached("sonarr", force=force)
    except Exception as exc:
        return jsonify({"error": "Sonarr request failed", "detail": str(exc)}), 502

    out = io.StringIO()
    w = csv.DictWriter(
        out,
        fieldnames=[
            "Title",
            "TitleSlug",
            "EpisodesCounted",
            "TotalSizeGB",
            "AvgEpisodeSizeGB",
            "VideoQuality",
            "Resolution",
            "VideoCodec",
            "VideoHDR",
            "AudioCodec",
            "AudioProfile",
            "AudioChannels",
            "AudioLanguages",
            "SubtitleLanguages",
            "AudioCodecMixed",
            "AudioProfileMixed",
            "AudioLanguagesMixed",
            "SubtitleLanguagesMixed",
            "PlayCount",
            "LastWatched",
            "DaysSinceWatched",
            "TotalWatchTimeHours",
            "UsersWatched",
            "Path",
        ],
    )
    w.writeheader()
    for r in data:
        w.writerow({k: r.get(k, "") for k in w.fieldnames})

    return Response(
        out.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=Sortarr-sonarr.csv"},
    )


@app.route("/api/movies.csv")
@_auth_required
def movies_csv():
    cfg = _get_config()
    if not (cfg["radarr_url"] and cfg["radarr_api_key"]):
        return jsonify({"error": "Radarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        data = _get_cached("radarr", force=force)
    except Exception as exc:
        return jsonify({"error": "Radarr request failed", "detail": str(exc)}), 502

    out = io.StringIO()
    w = csv.DictWriter(
        out,
        fieldnames=[
            "Title",
            "TmdbId",
            "RuntimeMins",
            "FileSizeGB",
            "GBPerHour",
            "VideoQuality",
            "Resolution",
            "VideoCodec",
            "VideoHDR",
            "AudioCodec",
            "AudioProfile",
            "AudioChannels",
            "AudioLanguages",
            "SubtitleLanguages",
            "AudioCodecMixed",
            "AudioProfileMixed",
            "AudioLanguagesMixed",
            "SubtitleLanguagesMixed",
            "PlayCount",
            "LastWatched",
            "DaysSinceWatched",
            "TotalWatchTimeHours",
            "UsersWatched",
            "Path",
        ],
    )
    w.writeheader()
    for r in data:
        w.writerow({k: r.get(k, "") for k in w.fieldnames})

    return Response(
        out.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=Sortarr-radarr.csv"},
    )


@app.route("/health")
def health():
    return "ok", 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8787"))
    app.run(host="0.0.0.0", port=port)
