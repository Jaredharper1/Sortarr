# Security Policy

## Supported Versions

Always use the latest version available for your platform.

For Linux, macOS, and ARM users, please use the Docker image. To force an architecture, set `platform` in `docker-compose.yaml` (for example `linux/arm64/v8` or `linux/amd64`).

For Windows users, a convenient portable `.exe` package is distributed with each release. Find it under Releases as `x64-windows-exe-portable-Sortarr-XXX.zip`.

| Version | Supported |
| ------- | --------- |
| 0.9.0 | ✔️ |
| < 0.9.0 | :x: |

## Auth and Deployment Boundary

Supported for `0.9.0`:

- `basic` with direct/local access
- `basic` behind supported reverse-proxy paths
- `basic_local_bypass` only with direct access
- `external` only behind a trusted reverse proxy with an explicit non-wildcard trusted proxy setting

Not supported for `0.9.0`:

- `basic_local_bypass` behind reverse proxies
- `external` in direct mode
- `external` with wildcard-only trusted proxy configuration

Additional notes:

- `basic_local_bypass` uses the direct socket peer only. Forwarded headers are never used to decide whether a client is local.
- `external` assumes the reverse proxy already enforces login and injects the configured upstream auth header.
- Waitress trusted-proxy changes are startup settings and require a restart before the stricter runtime trust state takes effect.
- Windows portable builds use Windows Credential Manager for persisted secrets by default; other supported installs use secret-file references under the config directory.

## Reporting a Vulnerability

If you find any issue, be it security or performance based, please raise an issue [here](https://github.com/Jaredharper1/Sortarr/issues).
