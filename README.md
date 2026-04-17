# Sortarr
![GitHub tag](https://img.shields.io/github/v/tag/Jaredharper1/Sortarr?sort=semver&cacheSeconds=300)
![GitHub commits since latest release](https://img.shields.io/github/commits-since/Jaredharper1/Sortarr/latest)
![GitHub last commit](https://img.shields.io/github/last-commit/Jaredharper1/Sortarr)
![GitHub License](https://img.shields.io/github/license/Jaredharper1/Sortarr)
![GitHub Repo stars](https://img.shields.io/github/stars/Jaredharper1/Sortarr?style=social)
![GHCR](https://img.shields.io/badge/container-ghcr.io-blue)

# What is Sortarr?

Sortarr is a read-only analytics and organisation tool for media libraries. It helps you identify missing media, mismatches, and optimisation opportunities using live data from providers like Sonarr, Radarr, Plex, Jellyfin, Tautulli, Jellystat and Streamystats.

Sortarr provides a data-driven management layer for your media library, using optional playback behaviour data to help you to optimise your library.

Sortarr does not modify, move, or rename your media. It can analyse Sonarr and Radarr libraries, or use Plex, Jellyfin, or Emby directly as a media source, and incorporates playback and history data to present actionable insights.

---

## Key capabilities

* Analyse libraries from Sonarr, Radarr, Plex, Jellyfin, or Emby in one interface
* Overlay playback and history data from Tautulli, Tracearr, Jellystat, Streamystats, or Plex
* Compare providers with Mismatch Center and playback-match diagnostics
* Use provider-aware insights for Plex, Jellyfin, and Emby, including sessions, activities, library views, and match health
* Drill down from series to seasons and episodes across Arr, Plex, and Jellyfin-backed views
* Support multiple Sonarr and Radarr instances with cross-instance visibility
* Protect access with three explicit auth modes: `basic`, `basic_local_bypass`, or `external`
* Filter large libraries quickly with search, column filters, chips, and advanced rules
* Show detailed media attributes such as size, bitrate, codecs, languages, FPS, and BPPF where the source supports them
* Fully read-only operation for safety

---

## Who this is for

Sortarr is designed for users who:

* Use Plex, Jellyfin, Sonarr, Radarr, Tautulli, Jellystat, or Streamystats
* Want data-driven insight into their library
* Manage medium to large collections

---

## Screenshots

### Shows View:
![Shows View Screenshot](docs/sonarr.png)
### Movies View:
![Movies_View Screenshot](docs/radarr.png)

---

## Documentation

Setup, deployment, reverse-proxy, and provider guides live in the Project wiki.

Project wiki:
[https://github.com/Jaredharper1/Sortarr/wiki](https://github.com/Jaredharper1/Sortarr/wiki)

---

## Supported providers

### Media sources

* Sonarr
* Radarr
* Plex
* Jellyfin
* Emby

### History providers

* Tautulli
* Tracearr
* Jellystat
* Streamystats
* Plex

### Playback / Enrichment providers

* Plex
* Jellyfin
* Emby

## Authentication modes

* `basic`: Sortarr challenges every client with its own Basic Auth credentials
* `basic_local_bypass`: Sortarr still requires Basic Auth credentials, but allowed direct local peers can bypass the browser auth prompt
* `external`: a trusted reverse proxy handles login and passes the configured upstream auth header; Sortarr does not require its own Basic Auth prompt in steady-state access


## What Sortarr does NOT do

Sortarr will never:

* Modify or rename media files
* Delete media
* Change Sonarr or Radarr configuration
* Trigger downloads automatically

All operations are read-only and safe.


## Supporting the project

Enjoying the project? Looking for a way to contribute?

The best way to support Sortarr is simply to use it. If you encounter bugs or issues, please report them. Feature requests and suggestions are also very welcome.

Sortarr is a free project and I will never require donations to support or maintain it.

That said, if you would like to support me directly, in the interest of transparency I should mention that any donations will most likely be spent on beer and beer-related activities. If you're still willing to contribute, I appreciate it greatly.

[![Support me](https://i.imgur.com/9LLuB8H.png)](https://buymeacoffee.com/sortarr)
## License

[MIT License](https://github.com/Jaredharper1/Sortarr/blob/main/LICENSE)
