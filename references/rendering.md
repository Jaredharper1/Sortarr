# Rendering

## Row Keys
- Sonarr key priority: SeriesId, TvdbId, TitleSlug, Title, Path.
- Radarr key priority: MovieId, TmdbId, ImdbId, Title, Path.
- InstanceId is prefixed when present; duplicates get a # suffix.

## Sorting
- Default sorts:
  - Sonarr: AvgEpisodeSizeGB desc
  - Radarr: GBPerHour desc
- Numeric values sort numerically when possible; otherwise string sort.

## Links
- Sonarr title links: /series/<TitleSlug> using instance base URL.
- Radarr title links: /movie/<TmdbId> using instance base URL.

## Cell Formatting
- Mixed flags display a "Mixed" badge.
- Language cells use truncated lists with a Show all toggle.
- Match status displays a pill and highlights rows with mismatches.
