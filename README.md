# Sortarr

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
- Optional basic auth and configurable cache
- Optional Tautulli playback stats (play count, last watched, watch time, users)
- Audio/subtitle language columns with filters and quick chips

## Screenshots

![Sonarr view](docs/sonarr.png)
![Radarr view](docs/radarr.png)

## Deployment (Docker)

```bash
docker compose up -d
```

The default `docker-compose.yaml` pulls `ghcr.io/jaredharper1/sortarr:latest` (release builds). To use Docker Hub instead, set `image: docker.io/jaredharper1/sortarr:latest`.

Open `http://<host>:8787`. The first visit redirects to `/setup`, where you can enter Sonarr/Radarr URLs and API keys. The setup page writes a `.env` file at `ENV_FILE_PATH` (defaults to `./data/Sortarr.env` in `docker-compose.yaml`).

## Configuration

Sortarr writes and reads:

- `SONARR_URL`
- `SONARR_API_KEY`
- `RADARR_URL`
- `RADARR_API_KEY`
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

Fields: `title`, `path`, `videoquality`, `videocodec`, `videohdr`, `resolution`, `audio`, `audiocodec`, `audioprofile`, `audiochannels`, `audiolang`, `sublang`, `nosubs`, `playcount`, `lastwatched`, `dayssincewatched`, `watchtime`, `users`, `episodes`, `totalsize`, `avgepisode`, `runtime`, `filesize`, `gbperhour`.

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

