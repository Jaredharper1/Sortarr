# Sortarr
![Version](https://img.shields.io/badge/version-0.5.10-blue)

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
- Optional Tautulli playback stats (play count, last watched, watch time, users)
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
Load uses cached data by default; Shift+Click Load forces a refresh from the Arr APIs. The Reset UI button clears local UI settings if the page looks stale.

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
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASS`
- `CACHE_SECONDS`

Requirements and notes:

- Sonarr/Radarr API keys are required (read-only keys recommended)
- Tautulli is optional and only used for playback stats (playback columns/filters/chips stay hidden until configured)
- Basic auth is optional but recommended if exposed beyond your LAN
- Designed for on-demand queries with caching (no background polling)
- No database or media filesystem access required

## Advanced filtering

Use `field:value` for wildcards and comparisons. Numeric fields treat `field:value` as `>=` (use `=` for exact). `gbperhour` and `totalsize` with integer values use whole-number buckets (e.g., `gbperhour:1` matches 1.0-1.99).

Examples: `audio:Atmos` `audiocodec:eac3` `audiolang:eng` `sublang:eng` `nosubs:true` `playcount>=5` `neverwatched:true` `dayssincewatched>=365` `watchtime>=10` `gbperhour:1` `totalsize:10` `videocodec:x265` `videohdr:hdr`

Fields: `title`, `path`, `instance`, `videoquality`, `videocodec`, `videohdr`, `resolution`, `audio`, `audiocodec`, `audioprofile`, `audiochannels`, `audiolang`, `sublang`, `nosubs`, `playcount`, `lastwatched`, `dayssincewatched`, `watchtime`, `users`, `episodes`, `totalsize`, `avgepisode`, `runtime`, `filesize`, `gbperhour`.

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
