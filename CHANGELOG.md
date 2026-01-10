# Changelog

## 0.5.11

- Docs: add Unraid template and deployment notes

## 0.5.10

- Docker: change default compose port to 9595 to avoid 8787 conflicts
- Docs: update default access URL

## 0.5.9

- Docker: publish multi-arch images (linux/amd64, linux/arm64/v8) to GHCR and Docker Hub
- Docs: note Apple Silicon support and optional platform override

## 0.5.8

- Resolution chips now filter by video quality tags instead of file resolution
- Resolution filter note clarified in README

## 0.5.7

- Docker compose uses the published `ghcr.io/jaredharper1/sortarr:latest` image by default again

## 0.5.6

- Return generic API errors and log detailed failures server-side
- Make resolution filters tolerant of near-matches, common aliases (e.g., 4k/uhd/hd), and wide 1920x8xx sources (treat as 1080p)
- Add multi-instance Sonarr/Radarr support with optional friendly names
- Show Instance column/chips (and include Instance in CSV exports) when multiple instances are configured
- Add instance filter support (`instance:`) in advanced filtering
- Add Advanced setup sections for additional Sonarr/Radarr instances with name validation rules

## 0.5.5

- Normalize duplicate URL schemes in setup (e.g., http://http://host -> http://host)
- Bump requests to 2.32.4
- Always fetch Sonarr episode files per series to avoid unsupported bulk calls
- Prefer Radarr /movie movieFile payload and fall back to per-movie fetches

## 0.5.4

- Reduce Arr API calls by bulk-fetching files with safe fallback
- Reuse HTTP session and log Tautulli/Arr fetch failures
- Batch table rendering for large libraries
- Improve table sorting performance and reduce layout jitter during large renders
- Show playback "Times Watched" for Sonarr too
- Fix Tautulli ID matching for Radarr playback stats
- Keep basic auth password hidden and allow clearing it
- Cache-bust CSS/JS assets using the app version
- Replace Refresh button with Shift+Click on Load (fixes stale UI error)
- Add Reset UI button to clear local UI settings
- Fix audio channel filters for 5.1/7.1 values

## 0.5.3

- Optional Tautulli playback stats (play count, last watched, watch time, users watched)
- Playback columns/filters/chips only show when Tautulli is configured
- Audio/subtitle language columns with friendly names, plus language chips
- Expandable language lists for long subtitle/audio sets (better mixed detection)
- New filters: audiolang, sublang, nosubs, playcount, lastwatched, dayssincewatched, watchtime, users, neverwatched
- Prefetch the other tab in the background after load for faster switching
- Setup page includes optional Tautulli fields
- Reload config when the env file changes

## 0.5.2

- Docker: publish release images to GHCR and Docker Hub
- Docker: compose now pulls published image and uses 'sortarr' service/container name
- Docs: update deployment instructions for image-based usage

## 0.5.1 (removed due to system breaking issues)

- switch Docker runtime to gunicorn for more robust serving
- add VideoCodec and VideoHDR columns plus CSV exports
- improve advanced filtering (numeric >=, gbperhour/totalsize buckets, Radarr totalsize)
- add AudioProfile placeholder and hide column by default
- update help text and README
- remove unused dependency (flask-httpauth)
