# Filters

## Simple Filters
- Title input: wildcard match against Title.
- Path input: wildcard match against Path.

## Advanced Filters
Syntax:
- field:value (wildcards * and ?)
- field>=value, field<=value, field=value, field>value, field<value

Special fields:
- audio:value matches AudioCodec or AudioProfile.
- instance:value matches InstanceName or InstanceId.
- nosubs:true/false checks subtitle presence.
- neverwatched:true/false uses TautulliMatched and LastWatched.
- mismatch:true/false checks TautulliMatchStatus == unmatched.

Tautulli-dependent fields:
- matchstatus, mismatch, playcount, lastwatched, dayssincewatched,
  watchtime, watchtimehours, totalwatchtime, contenthours, watchratio,
  users, userswatched, neverwatched.
- These are disabled until Tautulli is configured.

Numeric fields:
- episodes, totalsize, avgepisode, runtime, filesize, gbperhour,
  audiochannels, playcount, dayssincewatched, watchtime, contenthours,
  watchratio, users.

Bucket fields:
- gbperhour, totalsize use whole-number buckets when integer values are supplied.

Resolution matching:
- resolution:2160p, 1080p, 720p, 480p (aliases like 4k, uhd, fhd, hd, sd).
- For dimension strings (e.g., 1920x1080), matching uses height with tolerance.

Chips:
- Chips use the same advanced filter parser.
- Playback chips are hidden until Tautulli is configured.
