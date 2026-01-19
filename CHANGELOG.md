# Changelog

## 0.6.11

### Security

- Resolve CodeQL findings for clear-text logging and exception exposure in Arr diagnostics and instance warnings.

## 0.6.10

### UI and columns

- Add Sonarr series expanders with richer episode grids and per-season extras.
- Add new Sonarr/Radarr metadata and playback columns/chips with improved mixed-value handling and match-status display.
- Improve table layout and readability (Title/Path caps, numeric alignment, width stabilization, scroll behavior).
- Lock Radarr column widths during batched renders to prevent resize flashes.
- Keep Genres and Last Search cells on a single line in the table.
- Add keyboard navigation for table rows and Sonarr season lists (arrow keys + enter/expand).
- Refine keyboard navigation so Enter refreshes rows and left/right control Sonarr expansions.
- Sync keyboard selection with hover and auto-focus the table on load.
- Add episode-level keyboard navigation, season-level extras toggle on Enter, and animated Sonarr season/episode expanders.
- Clamp Radarr text columns and preserve scroll anchors on chip toggles to prevent row shifts.
- Fix Radarr columns widening after rapid chip/sort interactions.
- Keep Radarr column widths consistent when filters drop below batched-render thresholds.
- Expose Arr/Tautulli timeouts and worker settings in setup advanced options.
- Refine Sonarr keyboard navigation within expanded seasons and speed up expansion animations.
- Enable season extras when pressing Enter on a selected episode.
- Allow Radarr lite hydration to complete even while Tautulli background matching is active.
- Fix Sonarr column toggles not enabling shared columns unless Show all is used.
- Widen the Genres column cap so labels are less truncated.
- Add Show all toggles for long single-line Genres/Custom Formats values.
- Brighten the Tautulli match completion flash in the status panel.
- Increase chip group divider contrast per theme (lighter in dark mode, darker in light mode).
- Refine refresh/status UX (per-row refresh controls, status pills/notices, tooltips).
- Updated UI and styling (more see-through glass panels, Columns panel transparency, filter collapse control, background glow tweaks).
- Animate filter/chip panel collapse to mirror the restore animation.
- Disable table scroll snapping at the bottom so the last row stays visible.
- Hide chips immediately during filter panel collapse to avoid odd text fade.
- Darken the filter/chip panel glass in dark mode for better readability.
- Refresh text input focus styling with a glass-like inner glow and unclipped ring.

### Performance and reliability

- Add Sonarr episode-file modes, caching, and Arr backoff to reduce load.
- Improve rendering performance (batched renders, deferred heavy columns for Sonarr, lighter column visibility work, debounced filter renders, throttled series expansion scroll, deferred header cap work, lite status polling).
- Defer Sonarr/Radarr wanted/recent grabbed stats on cold start and backfill them in the background.
- Add Radarr wanted fetch parallelism (`RADARR_WANTED_WORKERS`) and optional multi-instance fetch workers (`RADARR_INSTANCE_WORKERS`).
- Reduce Radarr moviefile fetch overhead by batching movie file lookups.
- Speed up Radarr table renders by batching earlier and accelerating deferred hydration.
- Begin Radarr large-table render refactor with a lighter first pass and deferred hydration for heavy columns.
- Serve lite Radarr payloads on cold start with background hydration (`SORTARR_RADARR_LITE_FIRST`).
- Scope Arr circuit breakers by endpoint group so history timeouts do not block episode file calls.
- Allow partial results on instance failures with optional strict mode.

### Security

- Add CSRF protection, CSV formula neutralization, and basic auth for /api/version and /health.

### Refresh and cache workflow

- Improve per-row refresh messaging, and remove rows when Arr reports missing items.

### Tests and tooling

- Capture selenium scenario failures in perf.json with attached failure artifacts and scenario scoping.

## 0.6.9

### Security

- Redact credentialed URLs and identifiers from Arr/Tautulli warning logs.

## 0.6.8

### Deployment and configuration

- Default Docker image to a single Gunicorn worker with threads to keep cache/refresh state consistent.
- Guard .env reloads with a lock to prevent concurrent config transitions.
- Allow Arr timeouts to be disabled by setting `SONARR_TIMEOUT_SECONDS`/`RADARR_TIMEOUT_SECONDS` to `0`.
- Increase default Sonarr/Radarr request timeouts to 90 seconds for large or remote instances.

### Refresh and cache workflow

- Serialize Arr cache writes in background threads to avoid request stalls and racey disk writes.
- Apply cache snapshot/atomic updates for Tautulli overlays and in-memory cache refreshes.
- Snapshot Arr cache payloads before background saves to avoid concurrent mutation issues.
- Add Refresh Current Tab to update only the active app cache.
- Add Sonarr/Radarr refresh-all endpoints and UI buttons plus per-row refresh that also triggers Tautulli when configured.
- Ensure per-row Radarr refresh targets a single movie by sending movieIds to the Radarr command API.
- Reload just the refreshed series/movie after row refreshes with a short delay for Arr/Tautulli updates.
- Only force the Tautulli index on per-row reloads when the item lacks keys.
- Place the per-row refresh control in the Title column as a subtle refresh icon.
- Show longer per-row refresh status messages without delaying the row reload.
- Add Deep Tautulli Refresh to rebuild library media info and rerun matching from the UI.
- Defer Tautulli overlays on cold cache loads and apply matching in the background for faster first paint.

### Playback stats and matching

- Prefer library play counts over history or episode aggregates to avoid double-counted show stats.
- Log Tautulli index build timings for shows, movies, and history buckets.

### Performance and rendering

- Parallelize Sonarr episodefile fetches with the `SONARR_EPISODEFILE_WORKERS` cap.
- Stabilize row keys for duplicate titles and add optional render perf logging/reset hooks for UI baselines.
- Allow batched rendering on large interactive updates (filters, chips, sorting) while keeping small tables synchronous.
- Stabilize Title column width on large tables to prevent widening as rows stream in.
- Apply column visibility during batched renders so hidden columns don't inflate row height mid-load.
- Skip redundant full-table column visibility passes after batched renders unless columns changed mid-render.
- Time-slice batched rendering with a frame budget to reduce main-thread stalls on large tables.
- Gate inactive-tab prefetch on cold-cache loads and defer it until the first render completes.
- Enable gzip compression for JSON/CSV API payloads to reduce cold-start transfer time.
- Cache per-row display values, defer hidden heavy columns, merge deferred hydration passes, and increase batch size to reduce render overhead.
- Lazily compute light column display values when hidden and hydrate them when columns become visible.
- Skip filter passes when no query is active and memoize sorted results to avoid repeat sorts on stable data.

### UI and columns

- Add grouped column toggles for Playback and Language columns.
- Add Date Added column for Sonarr and Radarr views.
- Hide Date Added by default (available via Columns).
- Add Radarr bitrate column with estimated fallback when media info is missing.
- Hold the Tautulli matching notice until the first table render (chips visible).
- Increase row refresh icon size and contrast in light/dark themes.
- Spin the row refresh icon while per-row refresh is pending.
- Mark per-row refreshes as partial when Tautulli is skipped or pending so the notice reflects missing playback data.
- Stabilize Match Status pill width to reduce column jitter during row refreshes.
- Restore filled Match Status pill backgrounds for clearer status emphasis.
- Add purple/cyan pill styling for Future release and Not on disk statuses.
- Lock column widths during batched renders to reduce post-sort jitter.
- Clear stale column width locks between rapid sorts.
- Add subtle per-column dividers (toggle by setting `--col-divider-color`).
- Center table headers and data cells (keep Title, Path, Audio Codec left-aligned).
- Animate and dim rows while per-row refresh is pending.
- Clamp Audio Codec cell content to keep the column from expanding.
- Trigger a one-time post-load re-render to stabilize initial column widths.
- Re-run the column-width stabilization pass after tab or instance chip switches.
- Add optional render debug flags to disable batching, deferred columns, width locks, or stabilization.
- Disable deferred heavy-column hydration by default (toggleable via render flags).

### Diagnostics

- Log Arr JSON decode failures with response snippets for faster diagnosis.
- Add sanitized `X-Sortarr-Error` headers when Arr fetches fail so the UI can surface hints.
- Add optional per-item refresh timing output (timing=1) for row refresh diagnosis.
- Add detailed Tautulli fetch timing breakdowns to the per-item timing output.

## 0.6.7

- Align app version metadata with the 0.6.7 release.

## 0.6.6

- Avoid logging instance labels during cold-start fetch/match steps to keep logs free of sensitive data.
- Replace the trailing-parenthetical title cleanup regex with a safe string parser to avoid polynomial ReDoS.

## 0.6.5

- Show live Tautulli refresh progress with processed/total counts and last update time in the status row
- Refresh both tabs after Tautulli matching completes so data appears without manual tab swaps
- Include disk-only caches in Tautulli match progress to avoid 0-to-full jumps
- Replace the Status pill label with live progress and smooth pill transitions; remove redundant Last Updated from the toolbar
- Keep the cold-cache notice visible while background refreshes run and restore Sonarr column ordering
- Yield a frame before rendering large fetches and avoid per-batch column visibility passes for smoother table loads
- Cache per-row sort keys and increase batch sizes for very large tables to reduce refresh overhead
- Defer hidden-column cell rendering on large tables and hydrate them after the initial render
- Skip reapplying Tautulli stats to cached rows when the index timestamp is unchanged and add a lite status poller
- Reapply Tautulli match overlay when cached rows are missing match fields to avoid pending-only counts
- Serve cached rows immediately on refresh requests and update Arr caches in a background thread when possible
- Reduce Tautulli index build and match overhead with cached title keys and lazy key generation
- Slow chip reveal animation for smoother transitions
- Tune light-theme surfaces (background, toolbars, data, progress) to reduce glare
- Add a subtle purple tint to the top toolbar in light mode
- Keep chips visible during refreshes after the first load
- After Fetch New Data, perform a one-shot background refresh to clear stale mismatch badges
- Enforce unlimited Tautulli metadata lookups and clear caches on upgrade to prevent history bucket gaps
- Backfill history items from strict title+year mappings to keep ID buckets current without false matches
- Move performance tuning fields into the Advanced section of setup
- Hide Cache seconds from setup (env-only)
- Document `ENV_FILE_PATH`, `PORT`, and `SORTARR_LOG_LEVEL` env vars in README.

## 0.6.4

- Hide Tautulli playback columns in CSV exports unless Tautulli is configured
- Show cold-start and Tautulli matching notices together during background refresh
- Keep Tautulli history merges from lowering play counts, users, or watch time totals
- Clear Tautulli refresh lock and marker files on version upgrade
- Refresh Sonarr and Radarr screenshots

## 0.6.3

- Parallelize Tautulli metadata lookups and periodically flush the metadata cache to disk
- Clear stale Tautulli refresh locks to prevent matching from getting stuck after a crash
- Avoid title-only Tautulli matches when release year is present to reduce cross-title collisions
- Show Total (GiB) by default and reorder Sonarr columns to Episodes, Avg / Ep, Total
- Shorten Tautulli placeholders so columns stay tighter during background matching
- Switch table layout to auto sizing and reserve scrollbar gutter for consistent column widths during loads
- Left-align all table columns for consistency

## 0.6.2

- Fetch New Data now forces a Tautulli background refresh to pick up new matches
- Include Tautulli original titles when matching by title

## 0.6.1

- Document that Sortarr.env should be treated as a secret

## 0.6.0

- Refresh base image to python:3.14-slim and upgrade pip to address CVE findings
- Surface Tautulli match status with a mismatch badge, filter, and CSV fields
- Default Tautulli lookup and fetch limits to unlimited for full cold-start coverage
- On first run after upgrade, clear caches and drop legacy Tautulli default env values
- Run Tautulli matching in the background and show a progress notice in the UI
- Auto-refresh while Tautulli matching completes and keep the loading indicator active
- Raise default Tautulli timeout and fetch budget to allow longer first loads

## 0.5.15

- Add a per-table CSV columns toggle in the Columns menu, separate from Advanced filters
- Security: redact sensitive paths and avoid leaking connection error details in logs

## 0.5.13

- Expose Tautulli metadata lookup and timeout controls in setup and the Unraid template
- Add a Settings button in the toolbar to reopen setup

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
