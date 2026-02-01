# Sortarr
![Version](https://img.shields.io/badge/version-0.8.0-blue)

Sortarr is a lightweight web dashboard for Sonarr and Radarr that helps
you understand how your media library uses storage. Sortarr provides storage efficiency analytics for Sonarr and Radarr libraries. It is not a Plex tool, but it is useful in Plex setups for spotting oversized series or movies and comparing quality vs. size trade-offs.

Core functionality is complete. Current work focuses on performance improvements and expanded analysis views.


## Who it's for

This is useful for users who:

-   Runs Sonarr and/or Radarr and wants deeper storage insight
-   Cares about balancing quality and disk usage
-   Manages large or growing libraries and wants to spot inefficiencies early
-   Prefers analysis and visibility over pure automation

## How it works

Sortarr connects to the Sonarr and Radarr APIs, computes size and
efficiency metrics, caches results for performance, and serves a small read-only UI and HTTP API. It does not modify files or take any actions against your media.

## Features

-   Sonarr series size stats (total includes specials; averages exclude specials)
-   Expand Sonarr series rows to view season rollups and episode lists
-   Radarr movie size stats (file size and GiB per hour)
-   Bitrate metric with estimated fallback indicator
-   Filter builder dropdowns with active filter bubbles (quick chips optional)
-   Filter builder Category dropdown is alphabetized and searchable (desktop custom dropdown)
-   Optional Arr metadata columns (status, monitored, quality profile, tags, custom formats, release group, many more)
-   Sonarr/Radarr health badges to surface instance warnings
-   Sonarr series metadata and wanted columns (series type, original language, genres, last aired, missing/cutoff counts)
-   Sonarr chips for missing, cutoff unmet, recently grabbed, scene numbering, and airing
-   Fixed-width Title column with CSS ellipsis to keep large tables stable
-   Fullscreen Data Table button to focus the table on small screens
-   CSV export for Sonarr and Radarr (playback columns appear only when a playback provider is configured)
-   Date added column for Sonarr and Radarr views
-   Compressed CSV API responses for large payloads
-   Multiple Sonarr/Radarr instances with optional friendly names
-   Path mapping support for Docker volume paths (map container paths to host paths)
-   Optional basic auth and configurable cache
-   Optional Jellystat or Tautulli playback stats (play count, last watched, watch time, watch vs content hours, users)
-   Playback match status orbs beside titles to flag potential mismatches (only with Tautulli configured)
-   Audio/subtitle language columns with filters and quick chips

## Screenshots


Sonarr View:

![Sonarr view](docs/sonarr.png)

Radarr View:

![Radarr view](docs/radarr.png)


## Deployment (Docker)

### Quick start

Clone the repository or download `docker-compose.yaml`, then run:

```bash
docker compose up -d
```

The default `docker-compose.yaml` pulls
`ghcr.io/jaredharper1/sortarr:latest` (release builds).\
To use Docker Hub instead, set:

```yaml
image: docker.io/jaredharper1/sortarr:latest
```

Images are published for `linux/amd64` and `linux/arm64/v8` on both
registries, so Apple Silicon pulls work without changes. To force an
architecture, set `platform` in `docker-compose.yaml` (e.g.,
`linux/arm64/v8` or `linux/amd64`).

Open `http://<host>:9595`. The first visit redirects to `/setup`, where
you can enter Sonarr/Radarr URLs and API keys. The setup page writes a
`.env` file at `ENV_FILE_PATH` (defaults to `./data/Sortarr.env` in
`docker-compose.yaml`). URLs can be entered with or without a scheme;
duplicate schemes are normalized. Additional instances are under the
Advanced sections, and instance names surface in the Instance
column/chips when configured.

Ensure `./data` is mounted as a persistent volume; otherwise configuration and cache will be lost on container recreation.

The first load after startup can take a while for large libraries (especially with Tautulli); later loads are cached and faster.


## Deployment (Unraid)

An Unraid template is provided at `docs/unraid-template.xml`.

Support: until a forum thread exists, use GitHub Issues for Unraid support.


### Install via template

1. Copy the template into Unraid’s user templates directory (rename if you want):
   - Source: `docs/unraid-template.xml`
   - Destination: `/boot/config/plugins/dockerMan/templates-user/`
   - Example name: `sortarr.xml`

2. In the Unraid web UI:
   - Go to Docker → Add Container
   - Select your new template from the template dropdown

3. Set the required fields:
   - WebUI port (default `9595`)
   - Appdata path (recommended: `/mnt/user/appdata/sortarr`)

4. Apply / Start the container, then open the WebUI from the Docker page.

The first load after startup can take a while for large libraries (especially with Tautulli); later loads are cached and faster.

## Deployment (Windows EXE)

If you run Sortarr as a single-file EXE (PyInstaller `--onefile`), Sortarr stores config in a `.env` file next to the EXE (and creates it on first launch).

Override the config path with either:

- `SORTARR_CONFIG_PATH` (preferred), or
- `ENV_FILE_PATH`



## Configuration

### Minimal configuration

At minimum, set:

- SONARR_URL and SONARR_API_KEY
- RADARR_URL and RADARR_API_KEY

All other variables are optional.

Sortarr writes and reads:

### Sonarr

**Required:**
- `SONARR_URL`
- `SONARR_API_KEY`

**Optional:**
- `SONARR_NAME` (optional unless multiple Sonarr instances are configured)
- `SONARR_URL_2`
- `SONARR_API_KEY_2`
- `SONARR_NAME_2`
- `SONARR_URL_3`
- `SONARR_API_KEY_3`
- `SONARR_NAME_3`

- `SONARR_URL_API` (optional; internal URL for Sonarr API calls, defaults to SONARR_URL)
- `SONARR_URL_EXTERNAL` (optional; external/base URL used for UI links, defaults to SONARR_URL_API/SONARR_URL)
- `SONARR_URL_API_2`
- `SONARR_URL_EXTERNAL_2`
- `SONARR_URL_API_3`
- `SONARR_URL_EXTERNAL_3`

- `SONARR_EPISODEFILE_WORKERS` (optional, defaults to `8`)
- `SONARR_EPISODEFILE_MODE` (`series` default; `bulk` or `fast`)
- `SONARR_EPISODEFILE_DELAY_SECONDS` (default `0`)
- `SONARR_EPISODEFILE_CACHE_SECONDS` (default `600`)
- `SONARR_TIMEOUT_SECONDS` (default `90`, `0` disables)
- `SONARR_CACHE_PATH` (default `./data/Sortarr.sonarr_cache.json`)
- `SONARR_PATH_MAP` (optional; map container paths to host paths for UI display, `src:dst`; multiple entries separated by `|`, `,`, or `;`)
- `SONARR_PATH_MAP_2`
- `SONARR_PATH_MAP_3`

### Radarr

**Required:**
- `RADARR_URL`
- `RADARR_API_KEY`

**Optional:**
- `RADARR_NAME`
- `RADARR_URL_2`
- `RADARR_API_KEY_2`
- `RADARR_NAME_2`
- `RADARR_URL_3`
- `RADARR_API_KEY_3`
- `RADARR_NAME_3`

- `RADARR_URL_API`
- `RADARR_URL_EXTERNAL`
- `RADARR_URL_API_2`
- `RADARR_URL_EXTERNAL_2`
- `RADARR_URL_API_3`
- `RADARR_URL_EXTERNAL_3`

- `RADARR_WANTED_WORKERS` (default `2`)
- `RADARR_INSTANCE_WORKERS` (default `1`)
- `RADARR_TIMEOUT_SECONDS` (default `90`)
- `RADARR_CACHE_PATH` (default `./data/Sortarr.radarr_cache.json`)
- `RADARR_PATH_MAP` (optional; map container paths to host paths for UI display, `src:dst`; multiple entries separated by `|`, `,`, or `;`)
- `RADARR_PATH_MAP_2`
- `RADARR_PATH_MAP_3`

### Tautulli (optional)

- `TAUTULLI_URL`
- `TAUTULLI_API_KEY`
- `TAUTULLI_METADATA_CACHE`
- `TAUTULLI_METADATA_LOOKUP_LIMIT`
- `TAUTULLI_METADATA_LOOKUP_SECONDS`
- `TAUTULLI_METADATA_WORKERS`
- `TAUTULLI_METADATA_SAVE_EVERY`
- `TAUTULLI_REFRESH_STALE_SECONDS`
- `TAUTULLI_TIMEOUT_SECONDS`
- `TAUTULLI_FETCH_SECONDS`

### Runtime overrides

- `PUID`, `PGID`
- `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`
- `ENV_FILE_PATH` (docker-compose sets `/data/Sortarr.env`)
- `SORTARR_CONFIG_PATH` (preferred config path override; used before `ENV_FILE_PATH`)
- `PORT` (default `8787`; Docker maps `9595` → `8787`)
- `HOST` (default `0.0.0.0`)
- `WAITRESS_THREADS` (default `4`)
- `SORTARR_LOG_LEVEL`
- `SORTARR_STRICT_INSTANCE_ERRORS`
- `SORTARR_DEFER_WANTED`
- `SORTARR_RADARR_LITE_FIRST`
- `ARR_BACKOFF_BASE_SECONDS`
- `ARR_BACKOFF_MAX_RETRIES`
- `ARR_CIRCUIT_FAIL_THRESHOLD`
- `ARR_CIRCUIT_OPEN_SECONDS`


**NOTE**

**Reverse proxy / HTTPS (Traefik, Nginx, Cloudflare, etc.)**

Sortarr can be run behind a reverse proxy. In that case it may need to trust `X-Forwarded-*` headers so Flask correctly detects the external scheme/host (for example `https://sortarr.mydomain.com`). If this is not set correctly, you may see errors like **"CSRF origin mismatch"** during setup when accessing Sortarr via HTTPS through a proxy.

- `SORTARR_PROXY_HOPS` (optional)

Typical values:
- `0` Disabled
- `1` Single proxy (default)
- `2` Double proxy (e.g., Cloudflare Tunnel → Traefik → Sortarr)

Security note: If `SORTARR_PROXY_HOPS` is enabled, make sure Sortarr is only reachable through your reverse proxy. (Do not publish the Sortarr container port directly to the internet).


## Internal vs External Arr URLs (Kubernetes / Split-Network Setups)

Sortarr can now separate internal API endpoints from external UI links. This is useful when Sonarr/Radarr run on cluster-only DNS names but are exposed via ingress for users.

Example:

```
SONARR_URL_API=http://sonarr.sonarr.svc.cluster.local:8989
SONARR_URL_EXTERNAL=https://sonarr.domain.tld

RADARR_URL_API=http://radarr.radarr.svc.cluster.local:7878
RADARR_URL_EXTERNAL=https://radarr.domain.tld
```

Behavior:
- *_URL_API is used for Sortarr HTTP requests to Arr.
- *_URL_EXTERNAL is used when generating clickable links in the Sortarr UI.
- If *_URL_EXTERNAL is not set, Sortarr falls back to the legacy *_URL variables (and then to *_URL_API if *_URL is not set).
- If *_URL_API is not set, Sortarr falls back to the legacy *_URL variables.


This is fully backward compatible; existing SONARR_URL / RADARR_URL setups require no changes.

Common configurations:

1) Same URL works for Sortarr and your browser (most setups):

```
SONARR_URL=http://192.168.1.120:8989
RADARR_URL=http://192.168.1.120:7878
```

2) Split network (Sortarr calls internal DNS, browser clicks ingress URL):

```
SONARR_URL=http://sonarr.sonarr.svc.cluster.local:8989
SONARR_URL_EXTERNAL=https://series.sonarr.domain.tld

RADARR_URL=http://radarr.radarr.svc.cluster.local:7878
RADARR_URL_EXTERNAL=https://movies.radarr.domain.tld
```

3) Split network (you want SONARR_URL/RADARR_URL to be the external URL, but Sortarr should call an internal URL):

```
SONARR_URL=https://series.sonarr.domain.tld
SONARR_URL_API=http://sonarr.sonarr.svc.cluster.local:8989

RADARR_URL=https://movies.radarr.domain.tld
RADARR_URL_API=http://radarr.radarr.svc.cluster.local:7878
```


## Requirements and notes:

- Basic auth is optional but recommended if exposed beyond your LAN
- Docker image runs a single Waitress process with multiple threads (default `--threads=4`) to keep cache/refresh state consistent
- Designed for on-demand queries with persistent caching; the UI only polls while Tautulli matching finishes
- No database or media filesystem access required


## Buttons and their actions:

- Refresh Sonarr/Radarr data reloads only the active tab's data and updates the persistent cache.
- Refresh playback data reloads both Sonarr and Radarr (and playback if configured) and updates the persistent cache, then rebuilds playback matching using cached provider data (Tautulli) or starts a playback refresh (Jellystat).
- Clear caches & rebuild clears all cache files and starts a full rebuild, similar to a cold start. Recommended when inaccurate data is spotted.
- Reset UI clears local UI settings and reloads using the cached data.
- Fullscreen Data Table (⛶) hides panels and expands the table to fill the screen (press Escape or ✕ to exit).


## Notes continued:

- Sonarr/Radarr API keys are required for setup. Read-only keys are recommended.
- Tautulli is optional and only used for playback stats (playback columns/filters/chips stay hidden until configured)
- Tautulli metadata lookups are cached to disk for faster matching; adjust lookup limits/workers and save cadence as needed
- Setting `TAUTULLI_METADATA_LOOKUP_LIMIT=0` disables metadata matching
- Stale Tautulli refresh locks clear after `TAUTULLI_REFRESH_STALE_SECONDS` to avoid stuck matching
- On first run after an upgrade, Sortarr clears caches and drops legacy Tautulli default env values so new defaults apply
- When Tautulli matching runs in the background, the UI auto-refreshes to apply playback stats

- When `PUID`/`PGID` are set, the container runs as that user and will chown the config/cache paths on startup. Useful for Unraid users.
- Treat `Sortarr.env` as a secret; it stores API keys and optional basic auth credentials

- State-changing API requests require a CSRF token header (`X-CSRF-Token`) that matches the `sortarr_csrf` cookie; the UI handles this automatically. If you see "CSRF origin mismatch" errors, you likely need to adjust `SORTARR_PROXY_HOPS` from '0' to '1' or '2' depending on your reverse proxy setup.


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

Use the filter builder row to add Category/Condition/Value filters and build chips; active filters appear as bubbles and can be removed with a click. Use the Chips button to switch back to the classic Title/Path + Advanced filters and quick chips.

Use `field:value` for wildcards and comparisons. Numeric fields treat `field:value` as `>=` (use `=` for exact). `gbperhour` and `totalsize` with integer values use whole-number buckets (e.g., `gbperhour:1` matches 1.0-1.99).

Examples: `audio:Atmos` `audiocodec:eac3` `audiolang:eng` `sublang:eng` `nosubs:true` `studio:pixar` `seriestype:anime` `missing:true` `cutoff:true` `airing:true` `isavailable:true` `playcount>=5` `neverwatched:true` `mismatch:true` `dayssincewatched>=365` `watchtime>=10 contenthours>=10` `gbperhour:1` `totalsize:10` `videocodec:x265` `videohdr:hdr`

Fields: `title`, `titleslug`, `tmdbid`, `path`, `rootfolder`, `instance`, `status`, `monitored`, `qualityprofile`, `tags`, `releasegroup`, `studio`, `seriestype`, `originallanguage`, `genres`, `lastaired`, `hasfile`, `isavailable`, `incinemas`, `lastsearchtime`, `edition`, `customformats`, `customformatscore`, `qualitycutoffnotmet`, `languages`, `videoquality`, `videocodec`, `videohdr`, `resolution`, `audio`, `audiocodec`, `audiocodecmixed`, `audiochannels`, `audiolang`, `audiolanguagesmixed`, `sublang`, `subtitlelanguagesmixed`, `nosubs`, `missing`, `cutoff`, `cutoffunmet`, `recentlygrabbed`, `scene`, `airing`, `matchstatus`, `mismatch`, `playcount`, `lastwatched`, `dayssincewatched`, `watchtime`, `contenthours`, `watchratio`, `users`, `episodes`, `seasons`, `totalsize`, `avgepisode`, `runtime`, `filesize`, `gbperhour`, `bitrate`.

Match status values: `matched`, `unmatched`, `skipped`, `unavailable`, plus `future`, `nodisk`, and `notchecked` for skipped reasons.

Note: Resolution filters match by height with tolerance (e.g., 1920x1036p matches 1080p), treat 1920x* as 1080p and 1280x* as 720p when dimensions are present, and accept aliases like 4k/uhd/fhd/hd/sd. The UI chips now use `videoquality:` for more reliable matches.

Note: Language lists are shortened in the table; use "Show all" to expand them.


## HTTP API

- `/api/shows`
- `/api/movies`
- `/api/shows.csv`
- `/api/movies.csv`
- `/api/sonarr/health`
- `/api/radarr/health`
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


## Perf overlay

Press **Ctrl+Shift+P** to toggle a lightweight perf overlay (FPS estimate, long task count when supported, render time, visible rows, and DOM counts).

## Benchmark mode (synthetic data)

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
