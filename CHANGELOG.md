# Changelog

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
