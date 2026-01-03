# Changelog

## 0.5.3

- Optional Tautulli playback stats (play count, last watched, watch time, users watched)
- Playback columns/filters/chips only show when Tautulli is configured
- Audio/subtitle language columns with friendly names, plus language chips
- Expandable language lists for long subtitle/audio sets (better mixed detection)
- New filters: audiolang, sublang, nosubs, playcount, lastwatched, dayssincewatched, watchtime, users, neverwatched
- Prefetch the other tab in the background after load for faster switching
- Setup page includes optional Tautulli fields
- Reload config when the env file changes
- Ignore local data/ config files in Git

## 0.5.2

- Docker: publish release images to GHCR and Docker Hub
- Docker: compose now pulls published image and uses 'sortarr' service/container name
- Docs: update deployment instructions for image-based usage

## 0.5.1

- switch Docker runtime to gunicorn for more robust serving
- add VideoCodec and VideoHDR columns plus CSV exports
- improve advanced filtering (numeric >=, gbperhour/totalsize buckets, Radarr totalsize)
- add AudioProfile placeholder and hide column by default
- update help text and README
- remove unused dependency (flask-httpauth)
