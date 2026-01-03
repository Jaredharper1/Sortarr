import os
import re
import time
import csv
import io
from functools import wraps

import requests
from flask import Flask, jsonify, render_template, request, Response, redirect, url_for

APP_NAME = "Sortarr"
APP_VERSION = "0.5.2"

app = Flask(__name__)

_cache = {
    "sonarr": {"ts": 0, "data": []},
    "radarr": {"ts": 0, "data": []},
}

ENV_FILE_PATH = os.environ.get(
    "ENV_FILE_PATH",
    os.path.join(os.path.dirname(__file__), ".env"),
)
_env_loaded = False


def _ensure_env_loaded():
    global _env_loaded
    if _env_loaded:
        return
    _load_env_file(ENV_FILE_PATH)
    _env_loaded = True


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
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", value):
        value = f"http://{value}"
    return value.rstrip("/")


def _load_env_file(path: str):
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
                if key and key not in os.environ:
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
    r = requests.get(url, headers=headers, params=params, timeout=45)
    r.raise_for_status()
    return r.json()


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

    results = []
    for s in series:
        series_id = s.get("id")
        title = s.get("title") or ""
        title_slug = s.get("titleSlug") or ""  # IMPORTANT for Sonarr UI links
        path = s.get("path") or ""

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
        video_codecs = [_video_codec_from_file(f) for f in files]
        video_hdrs = [_video_hdr_from_file(f) for f in files]

        video_quality = _most_common(qualities)
        resolution = _most_common(resolutions)
        audio_format = _most_common(audio_formats)
        audio_profile = _most_common(audio_profiles)
        audio_channels = _most_common(audio_channels)
        audio_codec_mixed = _is_mixed(audio_formats)
        audio_profile_mixed = _is_mixed(audio_profiles)
        video_codec = _most_common(video_codecs)
        video_hdr = _most_common(video_hdrs)

        total_gib = _bytes_to_gib(total_bytes)
        avg_gib = round((total_bytes / count) / (1024 ** 3), 2) if count else 0.0

        results.append(
            {
                "SeriesId": series_id,
                "Title": title,
                "TitleSlug": title_slug,
                "EpisodesCounted": count,
                "TotalSizeGB": total_gib,
                "AvgEpisodeSizeGB": avg_gib,
                "VideoQuality": video_quality,
                "Resolution": resolution,
                "AudioCodec": audio_format,
                "AudioProfile": audio_profile,
                "AudioChannels": audio_channels,
                "AudioCodecMixed": audio_codec_mixed,
                "AudioProfileMixed": audio_profile_mixed,
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
        title = m.get("title") or ""
        path = m.get("path") or ""
        runtime = int(m.get("runtime") or 0)

        file_size_bytes = 0
        video_quality = ""
        resolution = ""
        audio_format = ""
        audio_profile = ""
        audio_channels = ""
        video_codec = ""
        video_hdr = ""
        audio_codec_mixed = False
        audio_profile_mixed = False
        if m.get("hasFile"):
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
                "Title": title,
                "RuntimeMins": runtime if runtime else "",
                "FileSizeGB": size_gib if size_gib else "",
                "GBPerHour": gb_per_hour if gb_per_hour else "",
                "VideoQuality": video_quality,
                "Resolution": resolution,
                "AudioCodec": audio_format,
                "AudioProfile": audio_profile,
                "AudioChannels": audio_channels,
                "AudioCodecMixed": audio_codec_mixed,
                "AudioProfileMixed": audio_profile_mixed,
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

        data = {
            "SONARR_URL": _normalize_url(request.form.get("sonarr_url", "")),
            "SONARR_API_KEY": request.form.get("sonarr_api_key", "").strip(),
            "RADARR_URL": _normalize_url(request.form.get("radarr_url", "")),
            "RADARR_API_KEY": request.form.get("radarr_api_key", "").strip(),
            "BASIC_AUTH_USER": request.form.get("basic_auth_user", "").strip(),
            "BASIC_AUTH_PASS": request.form.get("basic_auth_pass", "").strip(),
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
            "AudioCodecMixed",
            "AudioProfileMixed",
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
            "AudioCodecMixed",
            "AudioProfileMixed",
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
