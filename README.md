# Sortarr
![Version](https://img.shields.io/badge/version-0.7.7-blue)

Sortarr is a lightweight web dashboard for Sonarr and Radarr that helps you understand how your media library uses storage. It is not a Plex tool, but it is useful in Plex setups for spotting oversized series or movies and comparing quality vs. size trade-offs.

Core functionality is complete. Current work focuses on performance improvements and expanding analysis views.

## Who it's for

- Runs Sonarr and/or Radarr and wants deeper storage insight
- Cares about balancing quality and disk space
- Manages large or growing libraries and wants to spot inefficiencies early
- Prefers analysis and visibility over automation

## How it works

Sortarr connects to the Sonarr and Radarr APIs, computes size and efficiency metrics, caches results for performance, and serves a small read-only UI and HTTP API. It does not modify files or take any actions against your media.

## Features

- Sonarr series size stats (total includes specials; averages exclude specials)
- Expand Sonarr series rows to view season rollups and episode lists (virtualized for large seasons)
- Radarr movie size stats (file size and GiB per hour)
- Radarr bitrate metric with estimated fallback indicator
- Sorting, filtering, and column toggles
- Optional Arr metadata columns (status, monitored, quality profile, tags, release group)
- Sonarr series metadata and wanted columns (series type, original language, genres, last aired, missing/cutoff counts)
- Sonarr chips for missing, cutoff unmet, recently grabbed, scene numbering, and airing
- Fixed-width Title column with CSS ellipsis to keep large tables stable
- CSV export for Sonarr and Radarr (Tautulli playback columns appear only when configured)
- Date added column for Sonarr and Radarr views
- Compressed JSON/CSV API responses for large payloads
- Multiple Sonarr/Radarr instances with optional friendly names
- Optional basic auth and configurable cache
- Optional Tautulli playback stats (play count, last watched, watch time, watch vs content hours, users)
- Tautulli match status orbs beside titles to flag potential mismatches
- Status pill distinguishes receiving Tautulli data vs matching during refresh
- Refresh all Sonarr/Radarr items from the status bar and per-row refresh actions that reload the refreshed item after a short delay (Tautulli refreshes when configured)
- Defer Tautulli overlay on cold starts and backfill in the background with an in-app progress notice (live processed counts + last update time)
- Audio/subtitle language columns with filters and quick chips

## Screenshots

Sonarr View:
![Sonarr view](docs/sonarr.png)

Radarr View:
![Radarr view](docs/radarr.png)

## Deployment (Docker)

```bash
docker compose up -d
```

The default `docker-compose.yaml` pulls `ghcr.io/jaredharper1/sortarr:latest` (release builds). To use Docker Hub instead, set `image: docker.io/jaredharper1/sortarr:latest`.
Images are published for `linux/amd64` and `linux/arm64/v8` on both registries, so Apple Silicon pulls work without changes. To force an architecture, set `platform` in `docker-compose.yaml` (e.g., `linux/arm64/v8` or `linux/amd64`).

Open `http://<host>:9595`. The first visit redirects to `/setup`, where you can enter Sonarr/Radarr URLs and API keys. The setup page writes a `.env` file at `ENV_FILE_PATH` (defaults to `./data/Sortarr.env` in `docker-compose.yaml`). URLs can be entered with or without a scheme; duplicate schemes are normalized. Additional instances are under the Advanced sections, and instance names surface in the Instance column/chips when configured.

Static assets are cache-busted using the app version, so UI updates should load immediately after upgrades.
Refresh active tab reloads only the active tab's Sonarr/Radarr data and updates the persistent cache. Refresh all data reloads both Sonarr and Radarr (and Tautulli if configured) and updates the persistent cache. Reset UI clears local UI settings and reloads using the cached data.
Data status panel actions:
- Refresh active tab reloads the active tab's Sonarr/Radarr cache.
- Refresh all data reloads both apps (and Tautulli if configured).
- Clear cached data clears Sortarr caches and reloads Sonarr/Radarr (and Tautulli if configured).
- Refresh Sonarr metadata asks Sonarr to refresh series metadata; Sortarr updates on the next fetch.
- Refresh Radarr metadata asks Radarr to refresh movie metadata; Sortarr updates on the next fetch.
- Rebuild Tautulli matches rebuilds Tautulli matching using the existing library data.
- Refresh Tautulli media + matches refreshes Tautulli library/media info, then rebuilds matches so new titles appear.
The first load after startup can take a while for large libraries (especially with Tautulli); later loads are cached and faster.

The Docker image runs Gunicorn with a single worker and 4 threads to keep refresh state and cache progress consistent. If you need to change worker or thread counts, override the container command (and be aware that multiple workers require shared state).

## Deployment (Unraid)

An Unraid template is provided at `docs/unraid-template.xml`.

Support: until a forum thread exists, use GitHub Issues for Unraid support.

- Copy it to `/boot/config/plugins/dockerMan/templates-user/` (for example, `sortarr.xml`).
- Add the container in Unraid and set the WebUI port (default 9595) and appdata path.
- Start the container and open the WebUI from the Docker page.

## Configuration

Sortarr writes and reads:

- `SONARR_URL`
- `SONARR_API_KEY`
- `SONARR_NAME` (optional unless additional Sonarr instances are configured)
- `SONARR_URL_2`
- `SONARR_API_KEY_2`
- `SONARR_NAME_2`
- `SONARR_URL_3`
- `SONARR_API_KEY_3`
- `SONARR_NAME_3`
- `SONARR_EPISODEFILE_WORKERS` (optional, defaults to `8`; parallel episode file fetch workers for Sonarr)
- `SONARR_EPISODEFILE_MODE` (optional, `series` default; `bulk` fetches all episode files at once, `fast` skips per-episode file lookups and omits codec/language detail)
- `SONARR_EPISODEFILE_DELAY_SECONDS` (optional, per-request delay for Sonarr episode file calls; default `0`)
- `SONARR_EPISODEFILE_CACHE_SECONDS` (optional, per-series episode file cache TTL; default `600`, set `0` to disable)
- `RADARR_URL`
- `RADARR_API_KEY`
- `RADARR_NAME` (optional unless additional Radarr instances are configured)
- `RADARR_URL_2`
- `RADARR_API_KEY_2`
- `RADARR_NAME_2`
- `RADARR_URL_3`
- `RADARR_API_KEY_3`
- `RADARR_NAME_3`
- `RADARR_WANTED_WORKERS` (optional, defaults to `2`; parallel Radarr wanted/missing/cutoff/recent fetch workers, set `1` for low-end boxes)
- `RADARR_INSTANCE_WORKERS` (optional, defaults to `1`; parallel Radarr instance fetch workers, opt-in for multi-instance setups)
- `TAUTULLI_URL` (optional)
- `TAUTULLI_API_KEY` (optional)
- `TAUTULLI_METADATA_CACHE` (optional, defaults to `./data/Sortarr.tautulli_cache.json`)
- `TAUTULLI_METADATA_LOOKUP_LIMIT` (optional, defaults to `-1` for no limit; set to `0` to disable metadata matching)
- `TAUTULLI_METADATA_LOOKUP_SECONDS` (optional, defaults to `0` for no lookup time limit)
- `TAUTULLI_METADATA_WORKERS` (optional, defaults to `4`; parallel metadata lookup workers)
- `TAUTULLI_METADATA_SAVE_EVERY` (optional, defaults to `250`; persist metadata cache every N lookups)
- `TAUTULLI_REFRESH_STALE_SECONDS` (optional, defaults to `3600`; clear stuck Tautulli refresh locks)
- `TAUTULLI_TIMEOUT_SECONDS` (optional, defaults to `60`; per-request timeout for each Tautulli API call, `0` falls back to 45 seconds)
- `TAUTULLI_FETCH_SECONDS` (optional; total fetch budget per load, defaults to `0` for no limit)
- `SONARR_TIMEOUT_SECONDS` (optional, defaults to `90`; per-request timeout for Sonarr API calls, `0` disables the timeout)
- `RADARR_TIMEOUT_SECONDS` (optional, defaults to `90`; per-request timeout for Radarr API calls, `0` disables the timeout)
- `SONARR_CACHE_PATH` (optional, defaults to `./data/Sortarr.sonarr_cache.json`)
- `RADARR_CACHE_PATH` (optional, defaults to `./data/Sortarr.radarr_cache.json`)
- `PUID` (optional, container user ID; used when set alongside `PGID`)
- `PGID` (optional, container group ID; used when set alongside `PUID`)
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASS`

Runtime overrides (optional):

- `ENV_FILE_PATH` (optional, defaults to `.env` next to `app.py`; docker-compose sets `/data/Sortarr.env`)
- `PORT` (optional, defaults to `8787`; Docker maps `9595` to `8787` by default)
- `SORTARR_LOG_LEVEL` (optional, defaults to `INFO`)
- `SORTARR_STRICT_INSTANCE_ERRORS` (optional, default `false`; fail requests if any instance is unavailable)
- `SORTARR_DEFER_WANTED` (optional, default `true`; defer wanted/missing/cutoff/recent counts on cold start and backfill in the background)
- `SORTARR_RADARR_LITE_FIRST` (optional, default `true`; serve a lite Radarr payload on cold start, then hydrate full details in the background)
- `ARR_BACKOFF_BASE_SECONDS` (optional, base delay for retries on 429/5xx; default `0.5`)
- `ARR_BACKOFF_MAX_RETRIES` (optional, retry attempts for 429/5xx or request errors; default `2`)
- `ARR_CIRCUIT_FAIL_THRESHOLD` (optional, failures before opening the circuit; default `3`)
- `ARR_CIRCUIT_OPEN_SECONDS` (optional, cooldown before retrying once the circuit opens; default `30`)

Requirements and notes:

- Sonarr/Radarr API keys are required (read-only keys recommended)
- Tautulli is optional and only used for playback stats (playback columns/filters/chips stay hidden until configured)
- Tautulli metadata lookups are cached to disk for faster matching; adjust lookup limits/workers and save cadence as needed
- Setting `TAUTULLI_METADATA_LOOKUP_LIMIT=0` disables metadata matching
- Stale Tautulli refresh locks clear after `TAUTULLI_REFRESH_STALE_SECONDS` to avoid stuck matching
- On first run after an upgrade, Sortarr clears caches and drops legacy Tautulli default env values so new defaults apply
- When Tautulli matching runs in the background, the UI auto-refreshes to apply playback stats
- Arr caches persist until Refresh all data is clicked
- When `PUID`/`PGID` are set, the container runs as that user and will chown the config/cache paths on startup.
- Treat `Sortarr.env` as a secret; it stores API keys and optional basic auth credentials
- Basic auth is optional but recommended if exposed beyond your LAN
- State-changing API requests require a CSRF token header (`X-CSRF-Token`) that matches the `sortarr_csrf` cookie; the UI handles this automatically
- Designed for on-demand queries with persistent caching; the UI only polls while Tautulli matching finishes
- No database or media filesystem access required


## Troubleshooting Tautulli matches

If a title shows missing or incorrect Tautulli stats, the fastest fix is to refresh the item inside Tautulli after you confirm it is matched correctly in Arr and Plex.

Steps:

1) In Sonarr/Radarr, confirm the title/year and IDs are correct for the item.
2) In Plex, confirm the item metadata (title/year/IDs) matches Sonarr/Radarr.
3) In Plex, play the item for 30-60 seconds (this creates fresh Tautulli history).
4) In Tautulli, open the Now Playing entry and confirm it is the correct title.
5) In Tautulli, go to the matching library and search for the item by name.
6) If it is missing or stale, open the item and choose Media Info -> Refresh Media Info.
7) After the refresh completes, search again to confirm the item appears.
8) Back in Sortarr, click Refresh all data and wait for the load to complete.

If the title still does not match, the issue is likely missing IDs in Plex/Tautulli or a mismatch between libraries. Share the title and the Tautulli history count for that item so we can investigate further.

### Tautulli UI totals vs Sortarr totals

Sortarr reads totals from the Tautulli History API (full play history). The Tautulli UI can show different totals because:

- The show page "Global Stats" totals are built from the Tautulli metadata cache, which can be incomplete for large/old libraries or after lookup limits.
- The History page footer shows the total for the current page of results, not the full filtered set.

If the show page totals look low, rebuild Tautulli's metadata cache:

1) Stop Tautulli.
2) In Tautulli, open Settings and note the "Cache Directory: X" path, then back up that directory before clearing it.
3) Start Tautulli.
4) Refresh the library in Tautulli and wait for metadata to rebuild.

After the rebuild, the show page totals should align with History totals (and with Sortarr).

## Advanced filtering

Use `field:value` for wildcards and comparisons. Numeric fields treat `field:value` as `>=` (use `=` for exact). `gbperhour` and `totalsize` with integer values use whole-number buckets (e.g., `gbperhour:1` matches 1.0-1.99).

Examples: `audio:Atmos` `audiocodec:eac3` `audiolang:eng` `sublang:eng` `nosubs:true` `studio:pixar` `seriestype:anime` `missing:true` `cutoff:true` `airing:true` `isavailable:true` `playcount>=5` `neverwatched:true` `mismatch:true` `dayssincewatched>=365` `watchtime>=10 contenthours>=10` `gbperhour:1` `totalsize:10` `videocodec:x265` `videohdr:hdr`

Fields: `title`, `titleslug`, `tmdbid`, `path`, `instance`, `status`, `monitored`, `qualityprofile`, `tags`, `releasegroup`, `studio`, `seriestype`, `originallanguage`, `genres`, `lastaired`, `hasfile`, `isavailable`, `incinemas`, `lastsearchtime`, `edition`, `customformats`, `customformatscore`, `qualitycutoffnotmet`, `languages`, `videoquality`, `videocodec`, `videohdr`, `resolution`, `audio`, `audiocodec`, `audiocodecmixed`, `audiochannels`, `audiolang`, `audiolanguagesmixed`, `sublang`, `subtitlelanguagesmixed`, `nosubs`, `missing`, `cutoff`, `cutoffunmet`, `recentlygrabbed`, `scene`, `airing`, `matchstatus`, `mismatch`, `playcount`, `lastwatched`, `dayssincewatched`, `watchtime`, `contenthours`, `watchratio`, `users`, `episodes`, `seasons`, `totalsize`, `avgepisode`, `runtime`, `filesize`, `gbperhour`, `bitrate`.

Match status values: `matched`, `unmatched`, `skipped`, `unavailable`, plus `future`, `nodisk`, and `notchecked` for skipped reasons.

Note: Resolution filters match by height with tolerance (e.g., 1920x1036p matches 1080p), treat 1920x* as 1080p and 1280x* as 720p when dimensions are present, and accept aliases like 4k/uhd/fhd/hd/sd. The UI chips now use `videoquality:` for more reliable matches.

Note: Language lists are shortened in the table; use "Show all" to expand them.

## HTTP API

- `/api/shows`
- `/api/movies`
- `/api/shows.csv`
- `/api/movies.csv`
- `POST /api/sonarr/refresh` (optional `seriesId`, `instance_id`)
- `POST /api/radarr/refresh` (optional `movieId`, `instance_id`)
- `POST /api/tautulli/refresh_item` (rating_key or section_id)
- Error responses from Arr fetches may include a sanitized `X-Sortarr-Error` header.

## Non-goals

- Replace Sonarr or Radarr, or duplicate their core functionality
- Modify, manage, or automate media files
- Act as a downloader, indexer, or media manager
- Provide real-time, event-driven monitoring

## Planned features

- Expanded efficiency views and comparisons
- Performance improvements for very large libraries
- More grouping and filtering options

Feedback and ideas are welcome.


## Performance tools

### Perf overlay
Press **Ctrl+Shift+P** to toggle a lightweight perf overlay (FPS estimate, long task count when supported, render time, visible rows, and DOM counts).

### Benchmark mode (synthetic data)
You can render synthetic datasets without connecting Sonarr/Radarr:

- `?bench=1&app=radarr&rows=1000`
- `?bench=1&app=radarr&rows=5000`
- `?bench=1&app=radarr&rows=20000`
- Add `&wide=1` to show more columns.


### Image previews (optional)
Sortarr can display small poster previews streamed directly from Sonarr and Radarr:

- Sonarr: series poster appears only inside the expanded series panel header.
- Radarr: movie poster appears as a hover tooltip (table row heights do not change).

Disable all image loading with `?images=0`.

