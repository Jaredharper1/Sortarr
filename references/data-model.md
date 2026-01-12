# Data Model

## Common Row Fields
- Title
- Year
- Path
- InstanceId
- InstanceName
- VideoQuality
- Resolution
- VideoCodec
- VideoHDR
- AudioCodec
- AudioProfile
- AudioChannels
- AudioLanguages
- SubtitleLanguages
- AudioCodecMixed
- AudioProfileMixed
- AudioLanguagesMixed
- SubtitleLanguagesMixed

## Sonarr Rows
- SeriesId
- TitleSlug
- TvdbId
- ImdbId
- TmdbId
- EpisodesCounted
- TotalSizeGB
- AvgEpisodeSizeGB
- ContentHours

## Radarr Rows
- MovieId
- TmdbId
- ImdbId
- RuntimeMins
- ContentHours
- FileSizeGB
- GBPerHour

## Tautulli Overlay
- PlayCount
- LastWatched (ISO 8601 string)
- DaysSinceWatched
- TotalWatchTimeHours
- UsersWatched
- WatchContentRatio
- TautulliMatched (boolean)
- TautulliMatchStatus: matched | unmatched | skipped | unavailable
- TautulliMatchReason: short human-readable reason

Notes:
- Rows with no on-disk files or future release years are marked skipped.
- When Tautulli is not configured or data is unavailable, status is unavailable.

## CSV Output
- /api/shows.csv and /api/movies.csv export most fields above.
- Instance column is included when multiple instances exist.
- TautulliMatchStatus and TautulliMatchReason are included in both CSVs.
