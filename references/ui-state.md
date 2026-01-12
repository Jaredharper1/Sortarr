# UI State

## Local Storage
- Sortarr-columns: per-column visibility state.
- Sortarr-csv-columns: per-tab CSV column toggle.

## In-Memory State
- dataByApp / lastUpdatedByApp: per-tab datasets and timestamps.
- rowCacheByApp: cached row DOM for faster re-renders.
- chipQuery and advanced filter text are not persisted.

## Visibility Rules
- Tautulli columns and chips are hidden until Tautulli is configured.
- Instance chips are hidden until multiple instances are configured.
- Columns are filtered by active tab and CSV toggle state.

## Status Messaging
- X-Sortarr-Warn: Tautulli warnings surfaced in the status bar.
- X-Sortarr-Notice: cold-cache notice or Tautulli background matching progress.
- X-Sortarr-Notice-Flags: flags that drive loading indicator and auto-refresh (`cold_cache`, `tautulli_refresh`).
- When Tautulli matching runs, the UI polls until playback stats apply.
