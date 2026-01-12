# Project Map

## Entry Points
- app.py: Flask app, API routes, data fetching, caching.
- templates/index.html: main UI layout.
- templates/setup.html: setup form.
- static/app.js: UI logic (filters, rendering, state).
- static/styles.css: main UI styles.
- static/setup.css / static/setup.js: setup page styles/logic.

## Data and Cache
- data/Sortarr.env: default env file (docker-compose).
- data/Sortarr.sonarr_cache.json: Sonarr cache (disk).
- data/Sortarr.radarr_cache.json: Radarr cache (disk).
- data/Sortarr.tautulli_cache.json: Tautulli metadata cache (disk).
- data/Sortarr.startup.json: startup state (version + migration markers).
- data/Sortarr.tautulli_refresh.done: marker for completed background matching.
- ENV_FILE_PATH: env file override.

## Tests
- smoke_test.py: main smoke test.
- selenium_stress_test.py: UI stress test.
- tautulli_id_match_test.py: Tautulli match coverage report.

## Deployment
- Dockerfile
- docker-compose.yaml
- docker-entrypoint.sh
- docs/unraid-template.xml

## Assets
- static/logo.svg
- static/favicon.svg
