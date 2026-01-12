# Config

## Env File
- ENV_FILE_PATH: defaults to ./data/Sortarr.env in docker-compose.
- Setup page writes the env file and reloads config on save.

## Arr Instances
- SONARR_URL, SONARR_API_KEY, SONARR_NAME
- SONARR_URL_2, SONARR_API_KEY_2, SONARR_NAME_2
- SONARR_URL_3, SONARR_API_KEY_3, SONARR_NAME_3
- RADARR_URL, RADARR_API_KEY, RADARR_NAME
- RADARR_URL_2, RADARR_API_KEY_2, RADARR_NAME_2
- RADARR_URL_3, RADARR_API_KEY_3, RADARR_NAME_3
- Instance names are required when additional instances are configured.
- URLs are normalized (scheme added if missing, duplicate schemes removed, trailing slash trimmed).

## Tautulli
- TAUTULLI_URL
- TAUTULLI_API_KEY
- TAUTULLI_METADATA_CACHE: defaults to ./data/Sortarr.tautulli_cache.json
- TAUTULLI_METADATA_LOOKUP_LIMIT: defaults to -1 (no limit), 0 disables lookups.
- TAUTULLI_METADATA_LOOKUP_SECONDS: defaults to 0 (no time limit).
- TAUTULLI_TIMEOUT_SECONDS: per-request timeout (seconds), defaults to 60.
- TAUTULLI_FETCH_SECONDS: overall fetch budget, defaults to 0 (no limit).

## Upgrade Behavior
- On first run after an app version change, Sortarr clears caches and removes legacy Tautulli default values from Sortarr.env.

## Cache
- SONARR_CACHE_PATH: defaults to ./data/Sortarr.sonarr_cache.json
- RADARR_CACHE_PATH: defaults to ./data/Sortarr.radarr_cache.json
- CACHE_SECONDS: in-memory eviction (min 30, default 300).

## Security
- BASIC_AUTH_USER
- BASIC_AUTH_PASS
- Sortarr.env contains secrets (API keys and basic auth); keep it private.

## Docker User
- PUID / PGID: used by docker-entrypoint.sh to chown data paths.
