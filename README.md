# Sortarr

Sortarr is a lightweight dashboard for Sonarr and Radarr that surfaces library size metrics
(average episode size, movie GB/hour, and more) with filtering, sorting, and CSV export.

## Features

- Sonarr series size stats (total and average per episode)
- Radarr movie size stats (file size and GB/hour)
- Advanced filtering (wildcards, comparisons, and numeric bucketing)
- Column toggles with per-user preferences
- CSV export for Sonarr and Radarr
- Optional basic auth and configurable cache duration

## Quick start (Docker)

```bash
docker compose up -d --build
```

Open `http://<host>:8787`. The first visit redirects to `/setup` where you can enter
Sonarr/Radarr URLs and API keys. The setup page writes a `.env` file at `ENV_FILE_PATH`
(defaults to `./data/Sortarr.env` in `docker-compose.yaml`).

## Configuration

The setup page writes these keys:

- `SONARR_URL`
- `SONARR_API_KEY`
- `RADARR_URL`
- `RADARR_API_KEY`
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASS`
- `CACHE_SECONDS`
- `ENV_FILE_PATH` (optional override)

## Advanced filtering

Use `field:value` for wildcards and comparisons. Numeric fields treat `field:value` as
`>=` (use `=` for exact). For `gbperhour` and `totalsize`, integer values use a
whole-number bucket (e.g., `gbperhour:1` matches 1.0–1.99).

Examples:

- `audio:Atmos`
- `audiocodec:eac3`
- `audiochannels>=6`
- `gbperhour:1`
- `totalsize:10`
- `videocodec:x265`
- `videohdr:hdr`

Fields: `title`, `path`, `videoquality`, `videocodec`, `videohdr`, `resolution`,
`audio`, `audiocodec`, `audioprofile`, `audiochannels`, `episodes`, `totalsize`,
`avgepisode`, `runtime`, `filesize`, `gbperhour`.

### Audio profile note

`AudioProfile` is shown only when Arr reports `audioProfile` or
`audioAdditionalFeatures`. If the metadata is missing, Sortarr displays
"Not reported" (no inference).

## CSV export

- Sonarr: `/api/shows.csv`
- Radarr: `/api/movies.csv`

## Health

- `/health`

## Development

The container runs via gunicorn:

```bash
gunicorn --bind 0.0.0.0:8787 --workers 2 --timeout 120 app:app
```

