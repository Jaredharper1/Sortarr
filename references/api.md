# API

## Core
- GET /api/config
  - app_name, app_version, sonarr_url, radarr_url
  - sonarr_instances, radarr_instances (id, name, url)
  - tautulli_configured, configured
- GET /api/version
  - app_name, app_version
- POST /api/setup/test
  - {kind, url, api_key}

## Data
- GET /api/shows
- GET /api/movies
- GET /api/shows.csv
- GET /api/movies.csv

Query params:
- refresh=1 forces live fetch and updates caches.

Headers:
- X-Sortarr-Warn: Tautulli fetch warning.
- X-Sortarr-Notice: cold cache notice or Tautulli matching progress message.
- X-Sortarr-Notice-Flags: comma-delimited flags (`cold_cache`, `tautulli_refresh`).

## Health
- GET /health
