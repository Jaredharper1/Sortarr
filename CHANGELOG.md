# Changelog

## 0.5.12

- Display watch time columns as hh:mm instead of decimal hours
- Add watch vs content hours playback column with ratio sorting and filters
- Improve Tautulli matching with relaxed title variants (parentheses, &, colon/dash, possessive prefixes, 3D tokens)
- Request Tautulli library GUIDs/external IDs when available to improve ID matching
- Use Tautulli metadata lookups to resolve external IDs when GUIDs are Plex-only
- Cache Tautulli metadata IDs to disk with configurable lookup limits for faster loads
- Persist Sonarr/Radarr caches to disk and refresh them only via Fetch New Data
- Fail open when Tautulli data is unavailable, warn in the UI, and cap Tautulli fetch time
- Increase initial load headroom (Gunicorn timeout + higher default Tautulli budgets) and surface a first-load notice
- Support PUID/PGID in Docker entrypoint and add defaults to the Unraid template
- Validate Sonarr/Radarr connections during setup before saving
- Validate Tautulli connection during setup when configured
- Add per-instance test buttons with inline setup errors
- Add advanced UI columns for CSV-only fields, include TMDB ID in Sonarr CSV exports, and surface Content Hours in the Sonarr columns
