from __future__ import annotations

import os
import re
import time
import datetime
import csv
import io
import json
import logging
from functools import wraps

import requests
from flask import Flask, jsonify, render_template, request, Response, redirect, url_for

APP_NAME = "Sortarr"
APP_VERSION = "0.5.15"

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
    "sonarr": {},
    "radarr": {},
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


def _safe_log_path(path: str) -> str:
    if not path:
        return ""
    return os.path.basename(path)


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
        "TAUTULLI_URL",
        "TAUTULLI_API_KEY",
        "TAUTULLI_METADATA_LOOKUP_LIMIT",
        "TAUTULLI_METADATA_LOOKUP_SECONDS",
        "TAUTULLI_TIMEOUT_SECONDS",
        "TAUTULLI_FETCH_SECONDS",
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


def _build_instances(prefix: str, label: str) -> list[dict]:
    instances = []
    for idx in _collect_instance_indexes(prefix):
        suffix = "" if idx == 1 else f"_{idx}"
        url = _normalize_url(os.environ.get(f"{prefix}_URL{suffix}", ""))
        api_key = os.environ.get(f"{prefix}_API_KEY{suffix}", "")
        name = os.environ.get(f"{prefix}_NAME{suffix}", "").strip()
        if not (url and api_key):
            continue
        instances.append(
            {
                "id": f"{label.lower()}-{idx}",
                "index": idx,
                "name": name,
                "url": url,
                "api_key": api_key,
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
    sonarr_instances = _build_instances("SONARR", "Sonarr")
    radarr_instances = _build_instances("RADARR", "Radarr")
    sonarr_primary = sonarr_instances[0] if sonarr_instances else None
    radarr_primary = radarr_instances[0] if radarr_instances else None
    tautulli_timeout_seconds = _read_int_env("TAUTULLI_TIMEOUT_SECONDS", 30)
    default_fetch_seconds = max(tautulli_timeout_seconds * 2, 120)
    raw_fetch_seconds = os.environ.get("TAUTULLI_FETCH_SECONDS")
    if raw_fetch_seconds is None or raw_fetch_seconds.strip() == "":
        tautulli_fetch_seconds = default_fetch_seconds
    else:
        tautulli_fetch_seconds = _read_int_env("TAUTULLI_FETCH_SECONDS", default_fetch_seconds)
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
        "radarr_url": radarr_primary["url"] if radarr_primary else _normalize_url(os.environ.get("RADARR_URL", "")),
        "radarr_api_key": radarr_primary["api_key"] if radarr_primary else os.environ.get("RADARR_API_KEY", ""),
        "radarr_name": os.environ.get("RADARR_NAME", ""),
        "radarr_url_2": _normalize_url(os.environ.get("RADARR_URL_2", "")),
        "radarr_api_key_2": os.environ.get("RADARR_API_KEY_2", ""),
        "radarr_name_2": os.environ.get("RADARR_NAME_2", ""),
        "radarr_url_3": _normalize_url(os.environ.get("RADARR_URL_3", "")),
        "radarr_api_key_3": os.environ.get("RADARR_API_KEY_3", ""),
        "radarr_name_3": os.environ.get("RADARR_NAME_3", ""),
        "sonarr_instances": sonarr_instances,
        "radarr_instances": radarr_instances,
        "tautulli_url": _normalize_url(os.environ.get("TAUTULLI_URL", "")),
        "tautulli_api_key": os.environ.get("TAUTULLI_API_KEY", ""),
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
        "tautulli_metadata_lookup_limit": _read_int_env("TAUTULLI_METADATA_LOOKUP_LIMIT", 200),
        "tautulli_metadata_lookup_seconds": _read_int_env("TAUTULLI_METADATA_LOOKUP_SECONDS", 5),
        "tautulli_timeout_seconds": tautulli_timeout_seconds,
        "tautulli_fetch_seconds": tautulli_fetch_seconds,
        "cache_seconds": _read_int_env("CACHE_SECONDS", 300),
        "basic_auth_user": os.environ.get("BASIC_AUTH_USER", ""),
        "basic_auth_pass": os.environ.get("BASIC_AUTH_PASS", ""),
    }



def _config_complete(cfg: dict) -> bool:
    return bool(cfg.get("sonarr_instances") or cfg.get("radarr_instances"))



def _invalidate_cache():
    _cache["sonarr"].clear()
    _cache["radarr"].clear()
    _cache["tautulli"]["ts"] = 0
    _cache["tautulli"]["data"] = {}
    cfg = _get_config()
    for path in (cfg.get("sonarr_cache_path"), cfg.get("radarr_cache_path")):
        if not path:
            continue
        try:
            os.remove(path)
        except OSError:
            pass



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
):
    if not base_url:
        raise RuntimeError("Base URL is not set")
    if not api_key:
        raise RuntimeError("API key is not set")

    url = f"{base_url}{path}"
    headers = {"X-Api-Key": api_key}
    request_timeout = timeout if isinstance(timeout, (int, float)) and timeout > 0 else 45
    r = _http.get(url, headers=headers, params=params, timeout=request_timeout)
    r.raise_for_status()
    return r.json()


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


def _collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _strip_parentheticals(value: str) -> str:
    return _collapse_whitespace(re.sub(r"\([^)]*\)", " ", str(value or "")))


def _relaxed_title(value: str) -> str:
    cleaned = _collapse_whitespace(str(value or ""))
    if not cleaned:
        return ""
    while True:
        relaxed = _collapse_whitespace(re.sub(r"\s*\([^)]*\)\s*$", "", cleaned))
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


TAUTULLI_METADATA_CACHE_VERSION = 1
ARR_CACHE_VERSION = 1


def _default_tautulli_metadata_cache_path() -> str:
    base_dir = os.path.dirname(ENV_FILE_PATH)
    return os.path.join(base_dir, "Sortarr.tautulli_cache.json")


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
            "data": data,
        }
    return cache


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


def _check_deadline(deadline: float | None, label: str):
    if deadline is not None and time.time() >= deadline:
        raise TimeoutError(f"{label} exceeded time budget")


def _tautulli_get(
    base_url: str,
    api_key: str,
    cmd: str,
    params: dict | None = None,
    timeout: int | float | None = None,
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
    r = _http.get(url, params=query, timeout=request_timeout)
    r.raise_for_status()
    payload = r.json()
    response = payload.get("response", {})
    if response.get("result") != "success":
        message = response.get("message") or "Tautulli request failed"
        raise RuntimeError(message)
    return response.get("data")


def _tautulli_metadata_ids(
    base_url: str,
    api_key: str,
    rating_key,
    cache: dict[str, dict],
    timeout: int | float | None = None,
) -> dict:
    key = str(rating_key or "").strip()
    if not key:
        return {}
    if key in cache:
        return cache[key]
    try:
        data = _tautulli_get(
            base_url,
            api_key,
            "get_metadata",
            params={"rating_key": key},
            timeout=timeout,
        )
    except RuntimeError as exc:
        logger.warning("Tautulli get_metadata failed for rating_key=%s: %s", key, exc)
        cache[key] = {}
        return cache[key]

    if isinstance(data, dict) and "metadata" in data:
        metadata = data.get("metadata") or {}
    else:
        metadata = data or {}

    ids = _tautulli_extract_ids(metadata)
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


def _tautulli_fetch_library_items(
    base_url: str,
    api_key: str,
    section_id: str | int,
    timeout: int | float | None = None,
    deadline: float | None = None,
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
        if not chunk or len(items) >= total:
            break
        start += length

    return items


def _tautulli_fetch_history(
    base_url: str,
    api_key: str,
    timeout: int | float | None = None,
    deadline: float | None = None,
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

    for item in items:
        item_type = str(item.get("media_type") or "").lower()
        if media_type == "show" and item_type == "episode":
            raw = _tautulli_raw_stats_from_item(item)
            ids = _tautulli_extract_ids(item)
            if not ids and metadata_lookup:
                ids = metadata_lookup(_tautulli_metadata_key(item, item_type, media_type))
            title = item.get("grandparent_title") or item.get("title") or ""
            title_key = _normalize_title_key(title)
            relaxed_key = _relaxed_title_key(title)
            variant_keys = _title_variant_keys(title)
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
            if relaxed_key and year:
                _tautulli_merge_into(episode_agg["title_year_relaxed"], (relaxed_key, year), raw)
            if relaxed_key:
                _tautulli_merge_into(episode_agg["title_relaxed"], relaxed_key, raw)
            if variant_keys and year:
                for key in variant_keys:
                    _tautulli_merge_into(episode_agg["title_year_variant"], (key, year), raw)
            if variant_keys:
                for key in variant_keys:
                    _tautulli_merge_into(episode_agg["title_variant"], key, raw)
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

        title = item.get("title") or item.get("grandparent_title") or ""
        title_key = _normalize_title_key(title)
        relaxed_key = _relaxed_title_key(title)
        variant_keys = _title_variant_keys(title)
        year = str(item.get("year") or "").strip()
        if title_key and year:
            _tautulli_merge_into(index["title_year"], (title_key, year), raw)
        if title_key:
            _tautulli_merge_into(index["title"], title_key, raw)
        if relaxed_key and year:
            _tautulli_merge_into(index["title_year_relaxed"], (relaxed_key, year), raw)
        if relaxed_key:
            _tautulli_merge_into(index["title_relaxed"], relaxed_key, raw)
        if variant_keys and year:
            for key in variant_keys:
                _tautulli_merge_into(index["title_year_variant"], (key, year), raw)
        if variant_keys:
            for key in variant_keys:
                _tautulli_merge_into(index["title_variant"], key, raw)

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
            if key in index[bucket]:
                _tautulli_merge_raw(index[bucket][key], raw)
            else:
                index[bucket][key] = raw

    return index


def _tautulli_build_history_index(
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
            title = item.get("grandparent_title") or item.get("title") or ""
            year = str(item.get("grandparent_year") or item.get("year") or "").strip()
        else:
            title = item.get("title") or ""
            year = str(item.get("year") or "").strip()

        title_key = _normalize_title_key(title)
        relaxed_key = _relaxed_title_key(title)
        variant_keys = _title_variant_keys(title)

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
        if relaxed_key and year:
            _tautulli_merge_into(index["title_year_relaxed"], (relaxed_key, year), raw)
        if relaxed_key:
            _tautulli_merge_into(index["title_relaxed"], relaxed_key, raw)
        if variant_keys and year:
            for key in variant_keys:
                _tautulli_merge_into(index["title_year_variant"], (key, year), raw)
        if variant_keys:
            for key in variant_keys:
                _tautulli_merge_into(index["title_variant"], key, raw)

    return index


def _get_tautulli_index(cfg: dict, force: bool = False) -> dict | None:
    if not (cfg.get("tautulli_url") and cfg.get("tautulli_api_key")):
        return None

    entry = _cache["tautulli"]
    if not force and entry.get("data"):
        return entry["data"]

    if force or not entry.get("data"):
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

        def metadata_lookup(rating_key):
            nonlocal metadata_dirty, metadata_lookups, metadata_resolved
            nonlocal lookup_limit_hit, lookup_deadline_hit
            key = str(rating_key or "").strip()
            if not key:
                return {}
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
            ids = _tautulli_metadata_ids(
                cfg["tautulli_url"],
                cfg["tautulli_api_key"],
                key,
                metadata_cache,
                timeout=request_timeout,
            )
            metadata_dirty = True
            if any(k in ids for k in ("tvdb", "tmdb", "imdb")):
                metadata_resolved += 1
            return ids
        _check_deadline(fetch_deadline, "Tautulli fetch")
        libraries = _tautulli_get(
            cfg["tautulli_url"],
            cfg["tautulli_api_key"],
            "get_libraries",
            timeout=request_timeout,
        )
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
            items = _tautulli_fetch_library_items(
                cfg["tautulli_url"],
                cfg["tautulli_api_key"],
                section_id,
                timeout=request_timeout,
                deadline=fetch_deadline,
            )
            if section_type == "show":
                shows_items.extend(items)
            else:
                movies_items.extend(items)

        history_items = _tautulli_fetch_history(
            cfg["tautulli_url"],
            cfg["tautulli_api_key"],
            timeout=request_timeout,
            deadline=fetch_deadline,
        )
        shows_index = _tautulli_build_index(shows_items, "show", metadata_lookup=metadata_lookup)
        movies_index = _tautulli_build_index(movies_items, "movie", metadata_lookup=metadata_lookup)
        history_shows = _tautulli_build_history_index(history_items, "show", metadata_lookup=metadata_lookup)
        history_movies = _tautulli_build_history_index(history_items, "movie", metadata_lookup=metadata_lookup)

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

        entry["data"] = {
            "shows": shows_index,
            "movies": movies_index,
        }
        entry["ts"] = now
        if metadata_dirty:
            _save_tautulli_metadata_cache(metadata_cache_path, metadata_cache)
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
    relaxed_key = _relaxed_title_key(row.get("Title") or "")
    variant_keys = _title_variant_keys(row.get("Title") or "")
    year = str(row.get("Year") or "").strip()
    if title_key and year and (title_key, year) in data["title_year"]:
        return data["title_year"][(title_key, year)]
    if title_key and title_key in data["title"]:
        return data["title"][title_key]
    if relaxed_key and year and (relaxed_key, year) in data["title_year_relaxed"]:
        return data["title_year_relaxed"][(relaxed_key, year)]
    if relaxed_key and relaxed_key in data["title_relaxed"]:
        return data["title_relaxed"][relaxed_key]
    if variant_keys and year:
        for key in variant_keys:
            if (key, year) in data["title_year_variant"]:
                return data["title_year_variant"][(key, year)]
    if variant_keys:
        for key in variant_keys:
            if key in data["title_variant"]:
                return data["title_variant"][key]

    return None


def _apply_tautulli_stats(rows: list[dict], index: dict, media_type: str):
    now_ts = time.time()
    for row in rows:
        row["TautulliMatched"] = False
        row["WatchContentRatio"] = ""
        raw = _find_tautulli_stats(row, index, media_type)
        if raw:
            row.update(_tautulli_finalize_stats(raw, now_ts))
            row["TautulliMatched"] = True
            content_hours = row.get("ContentHours")
            try:
                content_hours_val = float(content_hours)
                watch_hours_val = float(row.get("TotalWatchTimeHours") or 0)
            except (TypeError, ValueError):
                content_hours_val = 0
            if content_hours_val > 0:
                row["WatchContentRatio"] = round(watch_hours_val / content_hours_val, 4)


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
        runtime_mins = _safe_int(s.get("runtime") or 0)

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
        content_hours = ""
        if runtime_mins > 0 and count:
            content_hours = round((runtime_mins * count) / 60.0, 2)

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
                "ContentHours": content_hours,
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
        content_hours = round(runtime / 60.0, 2) if runtime > 0 else ""
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
                "ContentHours": content_hours,
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


def _apply_instance_meta(rows: list[dict], instance: dict):
    for row in rows:
        row["InstanceId"] = instance.get("id", "")
        row["InstanceName"] = instance.get("name", "")


def _get_cache_entry(app_name: str, instance_id: str) -> dict:
    store = _cache[app_name]
    entry = store.get(instance_id)
    if not entry:
        entry = {"ts": 0, "data": []}
        store[instance_id] = entry
    return entry


def _is_cold_cache(app_name: str, instances: list[dict]) -> bool:
    for instance in instances:
        entry = _get_cache_entry(app_name, instance["id"])
        if entry.get("ts", 0) <= 0:
            return True
    return False


def _get_cached_instance(
    app_name: str,
    instance: dict,
    disk_cache: dict[str, dict],
    force: bool,
    tautulli_index: dict | None,
) -> tuple[list[dict], bool]:
    entry = _get_cache_entry(app_name, instance["id"])
    if not force and entry["data"]:
        _apply_instance_meta(entry["data"], instance)
        return entry["data"], False

    cached_entry = None if force else disk_cache.get(instance["id"])
    if cached_entry and isinstance(cached_entry.get("data"), list):
        entry["data"] = cached_entry["data"]
        entry["ts"] = _safe_int(cached_entry.get("ts"))
        _apply_instance_meta(entry["data"], instance)
        return entry["data"], False

    now = time.time()
    if app_name == "sonarr":
        entry["data"] = _compute_sonarr(
            instance["url"],
            instance["api_key"],
            exclude_specials=True,
        )
    else:
        entry["data"] = _compute_radarr(
            instance["url"],
            instance["api_key"],
        )
    entry["ts"] = now
    if tautulli_index:
        if app_name == "sonarr":
            _apply_tautulli_stats(entry["data"], tautulli_index, "shows")
        else:
            _apply_tautulli_stats(entry["data"], tautulli_index, "movies")
    if entry["data"]:
        _apply_instance_meta(entry["data"], instance)
    disk_cache[instance["id"]] = {"ts": entry["ts"], "data": entry["data"]}
    return entry["data"], True


def _get_cached_all(app_name: str, instances: list[dict], cfg: dict, force: bool = False):
    if not instances:
        return [], ""

    tautulli_warning = ""
    cache_path = cfg.get("sonarr_cache_path") if app_name == "sonarr" else cfg.get("radarr_cache_path")
    disk_cache = _load_arr_cache(cache_path)
    disk_dirty = False

    results = []
    cache_seconds = _safe_int(cfg.get("cache_seconds"))
    missing_instances = []
    for instance in instances:
        entry = _get_cache_entry(app_name, instance["id"])
        if cache_seconds > 0 and entry["data"] and (time.time() - entry["ts"] > cache_seconds):
            entry["data"] = []
        if not force and entry["data"]:
            _apply_instance_meta(entry["data"], instance)
            results.extend(entry["data"])
            continue
        cached_entry = None if force else disk_cache.get(instance["id"])
        if cached_entry and isinstance(cached_entry.get("data"), list):
            entry["data"] = cached_entry["data"]
            entry["ts"] = time.time()
            _apply_instance_meta(entry["data"], instance)
            results.extend(entry["data"])
            continue
        missing_instances.append(instance)

    if missing_instances:
        tautulli_index = None
        try:
            tautulli_index = _get_tautulli_index(cfg, force=force)
        except Exception as exc:
            logger.warning("Tautulli stats fetch failed: %s", exc)
            if cfg.get("tautulli_url") and cfg.get("tautulli_api_key"):
                tautulli_warning = "Tautulli data unavailable; showing Arr data only."

        for instance in missing_instances:
            data, updated = _get_cached_instance(
                app_name,
                instance,
                disk_cache,
                force=True,
                tautulli_index=tautulli_index,
            )
            results.extend(data)
            disk_dirty = disk_dirty or updated

    if disk_dirty:
        _save_arr_cache(cache_path, disk_cache)

    return results, tautulli_warning



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
    field_errors: dict[str, str] = {}
    if request.method == "POST":
        cache_raw = request.form.get("cache_seconds", "").strip()
        try:
            cache_seconds = int(cache_raw) if cache_raw else 300
        except ValueError:
            cache_seconds = None
        tautulli_lookup_limit_raw = request.form.get("tautulli_metadata_lookup_limit", "").strip()
        tautulli_lookup_seconds_raw = request.form.get("tautulli_metadata_lookup_seconds", "").strip()
        tautulli_timeout_raw = request.form.get("tautulli_timeout_seconds", "").strip()
        tautulli_fetch_raw = request.form.get("tautulli_fetch_seconds", "").strip()

        def parse_optional_int(raw: str, label: str) -> tuple[str, str | None]:
            if not raw:
                return "", None
            try:
                value = int(raw)
            except ValueError:
                return "", f"{label} must be a whole number."
            if value < 0:
                return "", f"{label} must be 0 or greater."
            return str(value), None

        tautulli_lookup_limit, lookup_limit_error = parse_optional_int(
            tautulli_lookup_limit_raw,
            "Tautulli metadata lookup limit",
        )
        tautulli_lookup_seconds, lookup_seconds_error = parse_optional_int(
            tautulli_lookup_seconds_raw,
            "Tautulli metadata lookup seconds",
        )
        tautulli_timeout_seconds, timeout_error = parse_optional_int(
            tautulli_timeout_raw,
            "Tautulli timeout seconds",
        )
        tautulli_fetch_seconds, fetch_error = parse_optional_int(
            tautulli_fetch_raw,
            "Tautulli fetch seconds",
        )

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
            "RADARR_NAME": request.form.get("radarr_name", "").strip(),
            "RADARR_URL": _normalize_url(request.form.get("radarr_url", "")),
            "RADARR_API_KEY": request.form.get("radarr_api_key", "").strip(),
            "RADARR_NAME_2": request.form.get("radarr_name_2", "").strip(),
            "RADARR_URL_2": _normalize_url(request.form.get("radarr_url_2", "")),
            "RADARR_API_KEY_2": request.form.get("radarr_api_key_2", "").strip(),
            "RADARR_NAME_3": request.form.get("radarr_name_3", "").strip(),
            "RADARR_URL_3": _normalize_url(request.form.get("radarr_url_3", "")),
            "RADARR_API_KEY_3": request.form.get("radarr_api_key_3", "").strip(),
            "TAUTULLI_URL": _normalize_url(request.form.get("tautulli_url", "")),
            "TAUTULLI_API_KEY": request.form.get("tautulli_api_key", "").strip(),
            "TAUTULLI_METADATA_LOOKUP_LIMIT": tautulli_lookup_limit,
            "TAUTULLI_METADATA_LOOKUP_SECONDS": tautulli_lookup_seconds,
            "TAUTULLI_TIMEOUT_SECONDS": tautulli_timeout_seconds,
            "TAUTULLI_FETCH_SECONDS": tautulli_fetch_seconds,
            "BASIC_AUTH_USER": basic_auth_user,
            "BASIC_AUTH_PASS": basic_auth_pass,
            "CACHE_SECONDS": str(cache_seconds if cache_seconds is not None else ""),
        }

        if cache_seconds is None:
            error = "Cache seconds must be a whole number."
        elif cache_seconds < 30:
            error = "Cache seconds must be at least 30."
        elif lookup_limit_error or lookup_seconds_error or timeout_error or fetch_error:
            error = lookup_limit_error or lookup_seconds_error or timeout_error or fetch_error or ""
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

    return render_template(
        "setup.html",
        env_path=ENV_FILE_PATH,
        error=error,
        field_errors=field_errors,
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
            "sonarr_instances": _public_instances(cfg.get("sonarr_instances", [])),
            "radarr_instances": _public_instances(cfg.get("radarr_instances", [])),
            "tautulli_configured": bool(cfg["tautulli_url"] and cfg["tautulli_api_key"]),
            "configured": _config_complete(cfg),
        }
    )


@app.route("/api/version")
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
        return jsonify({"ok": False, "error": "URL and API key are required."}), 400

    if kind in ("sonarr", "radarr"):
        failure = _arr_test_connection(url, api_key, timeout=10)
    elif kind == "tautulli":
        failure = _tautulli_test_connection(url, api_key, timeout=10)
    else:
        return jsonify({"ok": False, "error": "Unknown test target."}), 400

    if failure:
        return jsonify({"ok": False, "error": failure}), 502
    return jsonify({"ok": True})


@app.route("/api/shows")
@_auth_required
def api_shows():
    cfg = _get_config()
    instances = cfg.get("sonarr_instances", [])
    if not instances:
        return jsonify({"error": "Sonarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    cold_cache = _is_cold_cache("sonarr", instances)
    try:
        data, tautulli_warning = _get_cached_all("sonarr", instances, cfg, force=force)
        resp = jsonify(data)
        if tautulli_warning:
            resp.headers["X-Sortarr-Warn"] = tautulli_warning
        if cold_cache:
            resp.headers["X-Sortarr-Notice"] = (
                "First load can take a while for large libraries; later loads are cached and faster."
            )
        return resp
    except Exception:
        logger.exception("Sonarr request failed")
        return jsonify({"error": "Sonarr request failed"}), 502


@app.route("/api/movies")
@_auth_required
def api_movies():
    cfg = _get_config()
    instances = cfg.get("radarr_instances", [])
    if not instances:
        return jsonify({"error": "Radarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    cold_cache = _is_cold_cache("radarr", instances)
    try:
        data, tautulli_warning = _get_cached_all("radarr", instances, cfg, force=force)
        resp = jsonify(data)
        if tautulli_warning:
            resp.headers["X-Sortarr-Warn"] = tautulli_warning
        if cold_cache:
            resp.headers["X-Sortarr-Notice"] = (
                "First load can take a while for large libraries; later loads are cached and faster."
            )
        return resp
    except Exception:
        logger.exception("Radarr request failed")
        return jsonify({"error": "Radarr request failed"}), 502


@app.route("/api/shows.csv")
@_auth_required
def shows_csv():
    cfg = _get_config()
    instances = cfg.get("sonarr_instances", [])
    if not instances:
        return jsonify({"error": "Sonarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        data, _ = _get_cached_all("sonarr", instances, cfg, force=force)
    except Exception:
        logger.exception("Sonarr request failed")
        return jsonify({"error": "Sonarr request failed"}), 502

    include_instance = len(instances) > 1
    fieldnames = []
    if include_instance:
        fieldnames.append("Instance")
    fieldnames.extend(
        [
            "Title",
            "TitleSlug",
            "TmdbId",
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
            "ContentHours",
            "WatchContentRatio",
            "UsersWatched",
            "Path",
        ]
    )

    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=fieldnames)
    w.writeheader()
    for r in data:
        row = {k: r.get(k, "") for k in fieldnames}
        if include_instance:
            row["Instance"] = r.get("InstanceName", "")
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
    if not instances:
        return jsonify({"error": "Radarr is not configured"}), 503
    force = request.args.get("refresh") == "1"
    try:
        data, _ = _get_cached_all("radarr", instances, cfg, force=force)
    except Exception:
        logger.exception("Radarr request failed")
        return jsonify({"error": "Radarr request failed"}), 502

    include_instance = len(instances) > 1
    fieldnames = []
    if include_instance:
        fieldnames.append("Instance")
    fieldnames.extend(
        [
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
            "ContentHours",
            "WatchContentRatio",
            "UsersWatched",
            "Path",
        ]
    )

    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=fieldnames)
    w.writeheader()
    for r in data:
        row = {k: r.get(k, "") for k in fieldnames}
        if include_instance:
            row["Instance"] = r.get("InstanceName", "")
        w.writerow(row)

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
