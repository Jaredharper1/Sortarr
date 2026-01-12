# Sortarr
![Version](https://img.shields.io/badge/version-0.6.0-blue)

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

- Sonarr series size stats (total and average per episode)
- Radarr movie size stats (file size and GiB per hour)
- Sorting, filtering, and column toggles
- CSV export for Sonarr and Radarr
- Multiple Sonarr/Radarr instances with optional friendly names
- Optional basic auth and configurable cache
- Optional Tautulli playback stats (play count, last watched, watch time, watch vs content hours, users)
- Tautulli match status indicator to flag potential mismatches
- Background Tautulli matching on cold starts with an in-app progress notice
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
Fetch New Data pulls fresh Sonarr/Radarr/Tautulli data and updates the persistent cache. Reset UI clears local UI settings and reloads using the cached data.
The first load after startup can take a while for large libraries (especially with Tautulli); later loads are cached and faster.

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
- `RADARR_URL`
- `RADARR_API_KEY`
- `RADARR_NAME` (optional unless additional Radarr instances are configured)
- `RADARR_URL_2`
- `RADARR_API_KEY_2`
- `RADARR_NAME_2`
- `RADARR_URL_3`
- `RADARR_API_KEY_3`
- `RADARR_NAME_3`
- `TAUTULLI_URL` (optional)
- `TAUTULLI_API_KEY` (optional)
- `TAUTULLI_METADATA_CACHE` (optional, defaults to `./data/Sortarr.tautulli_cache.json`)
- `TAUTULLI_METADATA_LOOKUP_LIMIT` (optional, defaults to `-1` for no limit; set to `0` to disable metadata matching)
- `TAUTULLI_METADATA_LOOKUP_SECONDS` (optional, defaults to `0` for no lookup time limit)
- `TAUTULLI_TIMEOUT_SECONDS` (optional, defaults to `60`; per-request timeout for each Tautulli API call, `0` falls back to 45 seconds)
- `TAUTULLI_FETCH_SECONDS` (optional; total fetch budget per load, defaults to `0` for no limit)
- `SONARR_CACHE_PATH` (optional, defaults to `./data/Sortarr.sonarr_cache.json`)
- `RADARR_CACHE_PATH` (optional, defaults to `./data/Sortarr.radarr_cache.json`)
- `PUID` (optional, container user ID; used when set alongside `PGID`)
- `PGID` (optional, container group ID; used when set alongside `PUID`)
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASS`
- `CACHE_SECONDS`

Requirements and notes:

- Sonarr/Radarr API keys are required (read-only keys recommended)
- Tautulli is optional and only used for playback stats (playback columns/filters/chips stay hidden until configured)
- Tautulli metadata lookups are cached to disk for faster matching; lower the lookup limits if you need to cap lookup time
- Setting `TAUTULLI_METADATA_LOOKUP_LIMIT=0` disables metadata matching
- On first run after an upgrade, Sortarr clears caches and drops legacy Tautulli default env values so new defaults apply
- When Tautulli matching runs in the background, the UI auto-refreshes to apply playback stats
- Cache seconds only evicts in-memory data; persistent caches remain until Fetch New Data is clicked
- When `PUID`/`PGID` are set, the container runs as that user and will chown the config/cache paths on startup.
- Basic auth is optional but recommended if exposed beyond your LAN
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
8) Back in Sortarr, click Fetch New Data and wait for the load to complete.

If the title still does not match, the issue is likely missing IDs in Plex/Tautulli or a mismatch between libraries. Share the title and the Tautulli history count for that item so we can investigate further.

## Advanced filtering

Use `field:value` for wildcards and comparisons. Numeric fields treat `field:value` as `>=` (use `=` for exact). `gbperhour` and `totalsize` with integer values use whole-number buckets (e.g., `gbperhour:1` matches 1.0-1.99).

Examples: `audio:Atmos` `audiocodec:eac3` `audiolang:eng` `sublang:eng` `nosubs:true` `playcount>=5` `neverwatched:true` `mismatch:true` `dayssincewatched>=365` `watchtime>=10 contenthours>=10` `gbperhour:1` `totalsize:10` `videocodec:x265` `videohdr:hdr`

Fields: `title`, `titleslug`, `tmdbid`, `path`, `instance`, `videoquality`, `videocodec`, `videohdr`, `resolution`, `audio`, `audiocodec`, `audioprofile`, `audiocodecmixed`, `audioprofilemixed`, `audiochannels`, `audiolang`, `audiolanguagesmixed`, `sublang`, `subtitlelanguagesmixed`, `nosubs`, `matchstatus`, `mismatch`, `playcount`, `lastwatched`, `dayssincewatched`, `watchtime`, `contenthours`, `watchratio`, `users`, `episodes`, `totalsize`, `avgepisode`, `runtime`, `filesize`, `gbperhour`.

Note: Resolution filters match by height with tolerance (e.g., 1920x1036p matches 1080p), treat 1920x* as 1080p and 1280x* as 720p when dimensions are present, and accept aliases like 4k/uhd/fhd/hd/sd. The UI chips now use `videoquality:` for more reliable matches.

Note: Language lists are shortened in the table; use "Show all" to expand them.

### Audio profile note

`AudioProfile` only appears when Arr reports `audioProfile` or `audioAdditionalFeatures`. If the metadata is missing, Sortarr displays "Not reported" (no inference).

## HTTP API

- `/api/shows`
- `/api/movies`
- `/api/shows.csv`
- `/api/movies.csv`

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
