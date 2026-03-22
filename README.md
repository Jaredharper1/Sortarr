# Sortarr
![GitHub release](https://img.shields.io/github/v/release/Jaredharper1/Sortarr)
![GitHub commits since latest release](https://img.shields.io/github/commits-since/Jaredharper1/Sortarr/latest)
![GitHub last commit](https://img.shields.io/github/last-commit/Jaredharper1/Sortarr)
![GitHub License](https://img.shields.io/github/license/Jaredharper1/Sortarr)
![GitHub Repo stars](https://img.shields.io/github/stars/Jaredharper1/Sortarr?style=social)
![GHCR](https://img.shields.io/badge/container-ghcr.io-blue)

---

## 0.8.7 Release Notes

`0.8.7` finishes the remaining open issue work for the current release.

- Adds Sonarr `Lowest Custom Format Score` and `Highest Custom Format Score` columns, sorting, filtering, CSV export, and season summary rollups for score-based analysis.
- Fixes the remaining setup/save CSRF bootstrap failure for same-host reverse-proxy deployments that terminate HTTPS but forward setup POSTs to Sortarr over HTTP without usable forwarded scheme headers.
- Fixes Plex data-route enrichment so existing Plex rows fill stream and metadata details more consistently instead of partially missing fields.
- Includes the current issue fixes in one release so the shipped behavior is aligned for 0.8.7.

# Important 0.8.3 Security Upgrade Notice

Starting in **0.8.3**, Sortarr introduces a security-focused setup gate to ensure upgrades remain safe and predictable.

Existing installations with plaintext secrets will be automatically migrated toward external secret references during startup.

If you are upgrading an installation from a version prior to **0.8.3**, you will be required to complete a one-time migration step. During this process, you will need to re-enter your API keys, choose an **Authentication Method** (`Basic` or `External`), and configure the required auth settings for that method. This action only occurs once and will not be required again in future upgrades.

### Why is this necessary?

Early versions of Sortarr handled the storage and retrieval of API keys and other secrets in a way that does not meet current security expectations. As more users adopt Sortarr, I have observed that many deployments are being exposed to the public internet via reverse proxies.

Because of this, the project’s approach has shifted from treating security as a consideration to treating it as a priority. This required rebuilding the secret management system from the ground up. The result should be a significantly safer and more secure application, particularly for users who expose Sortarr to the wider internet.

---

## Security Migration Guide

1. Update to the latest version  
   ![GitHub release](https://img.shields.io/github/v/release/Jaredharper1/Sortarr)

2. After upgrading, you will be redirected to the **Setup screen**.

3. Enter your previously configured service details (URLs, API keys), choose who handles login (`Basic` or `External`), and generate a **secret key**.

4. If no session secret key is entered, Setup automatically generates one before saving.

5. After saving, the setup gate is cleared and normal application access resumes.

Secret-file / Credential-Manager resolution is now the secure default. Session secret resolution now follows the same file / Credential-Manager rules as other secrets, including:

`*_FILE`, `*_CRED_TARGET`, and `wincred:` references.

If a plaintext session secret cannot be migrated, startup fails with a clear error so you can correct `ENV_FILE_PATH` permissions or preconfigure:

`SORTARR_SECRET_KEY_FILE`  
or  
`SORTARR_SECRET_KEY_CRED_TARGET`

### Migration notes

- If any post-bootstrap security requirement is still pending (`missing_basic_auth`, `missing_upstream_auth_header`, `invalid_upstream_auth_header`, `external_auth_requires_proxy_mode`, `explicit_trusted_proxy_required`, `missing_persistent_secret`, or `upgrade_resave_required`), only **Setup**, static assets, and language switching remain available until Setup is saved again.
- If Basic Auth is partially configured (username without password or password without username), Sortarr allows Setup access so credentials can be repaired instead of returning a hard server error.
- In this remediation state:
  - HTML routes redirect to `/setup?force=1`
  - Non-setup API routes return `409` with  
    `{"error":"setup_required","setup_required":true,"setup_reasons":[...]}`

### Recovery mode

`SORTARR_ALLOW_UNSAFE_EPHEMERAL_RECOVERY=1` allows temporary unsafe startup or recovery paths. **Advanced use only.**

---

# What is Sortarr?

Sortarr is a read-only analytics and organisation tool for Sonarr and Radarr libraries. It helps you identify missing media, mismatches, and optimisation opportunities using real playback data from providers like Tautulli, Jellystat, or Plex.

Sortarr provides a data-driven management layer for your media library, using optional playback behaviour data to help you to optimise your library.

Sortarr does not modify, move, or rename your media. It can analyse Sonarr and Radarr libraries, or use Plex directly as a media source, and incorporates playback and history data to present actionable insights.

---

## Key capabilities

* Analyse Sonarr and Radarr libraries in a unified interface
* Integrate playback history from Tautulli, Jellystat, or Plex
* Identify missing media, mismatches, and optimisation opportunities
* Support multiple Sonarr and Radarr instances
* Highlight duplicate titles across instances and filter them quickly
* Support global quick text filtering across row data (for example `aac`)
* Show exact FPS and BPPF for Radarr movie rows, plus exact FPS/BPPF in Sonarr episode expansions when Arr reports frame-rate metadata
* Fully read-only operation for safety

---

## Who this is for

Sortarr is designed for users who:

* Use Plex, Sonarr, Radarr, Tautulli, or Jellystat
* Want data-driven insight into their library
* Manage medium to large collections

---

## Screenshots

### Shows View:
![Shows View Screenshot](docs/sonarr.png)
### Movies View:
![Movies_View Screenshot](docs/radarr.png)

---

## Quick start

Supports Docker, Unraid, Linux, Windows, and NAS environments.

### Supported Surface (Minimal)

If you want the least confusing setup, use only this supported surface:

- `SORTARR_SECRET_KEY_FILE` or `SORTARR_SECRET_KEY_CRED_TARGET`
- One media path (choose one):
- Arr path: `SONARR_URL` + `SONARR_API_KEY*` and/or `RADARR_URL` + `RADARR_API_KEY*`
- Plex path: `PLEX_URL` + `PLEX_TOKEN*`
- `SORTARR_PROXY_MODE` (`direct|single|double|custom`)
- `SORTARR_WAITRESS_TRUSTED_PROXY` (recommended for proxied Waitress deployments; otherwise Sortarr falls back to wildcard trust with a startup warning)
- Authentication boundary `Basic`: `SORTARR_AUTH_METHOD=basic` plus `BASIC_AUTH_USER` + (`BASIC_AUTH_PASS_FILE` or `BASIC_AUTH_PASS_CRED_TARGET`)
- Authentication boundary `External`: `SORTARR_AUTH_METHOD=external` plus `SORTARR_UPSTREAM_AUTH_HEADER` and an explicit `SORTARR_WAITRESS_TRUSTED_PROXY`
- Optional CSRF escape hatch: `SORTARR_CSRF_TRUSTED_ORIGINS` (exact origins only)

Copy and adapt: `Sortarr.minimal.env.example`

Everything else is advanced/compatibility and should stay at defaults unless you have a specific need.

### Docker


Create a `docker-compose.yml`:

```yaml
services:
  sortarr:
    image: ghcr.io/jaredharper1/sortarr:latest
    container_name: sortarr
    ports:
      - "9595:8787"
    volumes:
      - ./config:/config
    restart: unless-stopped
```

Start Sortarr:

```bash
docker compose up -d
```

Access the web interface:

```
http://localhost:9595
```

---

### Unraid

Sortarr can be installed on Unraid using the included template file.

### Install using the provided template:

1. Open the Unraid web interface

2. Go to the Docker tab

3. Click Add Container

4. Switch to Advanced View

5. Open the template dropdown and select User Templates

6. Import or paste the contents of [docs/unraid-template.xml](https://raw.githubusercontent.com/Jaredharper1/Sortarr/refs/heads/main/docs/unraid-template.xml)

8. Configure the /config path to a persistent appdata location (recommended: /mnt/user/appdata/sortarr)

9. Apply and start the container

Access the web interface:

```
http://<unraid-ip>:9595
```

Your configuration will persist in the configured appdata directory.

Community Applications support is coming soon.

Detailed Unraid configuration coming to the [Wiki](https://github.com/Jaredharper1/Sortarr/wiki) soon.

---
## Initial setup

When you first open Sortarr, for an ideal setup:

1. Add your Sonarr and/or Radarr instances
2. Add at least one history provider (Tautulli, Jellystat, or Plex)
3. Add one playback provider (current only Plex is supported, with Jellyfin and Emby support coming soon!)
4. Test connections, then Save configuration.

Sortarr will begin analysing your libraries immediately, and display a PowerBI like spreadsheet with helpful tools to help you spot outliers and issues.

---

## Documentation

Full documentation is coming soon in the Wiki:

* Installation guides
* Configuration reference
* Provider setup (Sonarr, Radarr, Tautulli, Jellystat, Plex)
* Reverse proxy configuration
* Troubleshooting and diagnostics

Open the Wiki:
[https://github.com/Jaredharper1/Sortarr/wiki](https://github.com/Jaredharper1/Sortarr/wiki)

---

## Supported providers

### Media sources

* Sonarr
* Radarr
* Plex

### History providers

* Tautulli
* Jellystat
* Plex

### Playback providers

* Plex
* Emby and Jellyfin support coming soon!

---

## Reverse Proxy and Security Notes

### Authentication Method

Sortarr now follows one simple rule:

- `Basic`
  Sortarr handles login itself
- `External`
  your trusted reverse proxy handles login

Use `Basic` for:

- direct installs
- reverse proxies that only forward traffic / TLS

Use `External` for:

- reverse proxies that already do login for the Sortarr route
- external auth systems such as proxy-managed Basic Auth or forward-auth

Do not try to run two independent login layers on the same route with different credentials. If your reverse proxy already handles login, switch Sortarr to `External` instead of stacking a second Sortarr Basic Auth prompt behind it.

### Reverse proxy / HTTPS (Traefik, Nginx, Cloudflare, etc.)

When Sortarr runs behind a reverse proxy, it must trust `X-Forwarded-*` headers so Flask can resolve the correct external scheme/host (for example `https://sortarr.mydomain.com`).
If trust is misconfigured, setup actions may fail with `CSRF origin mismatch`.
On Waitress 3.x, Sortarr also configures Waitress proxy-header trust from the same proxy-mode settings so forwarded headers are preserved before Flask sees the request.
Set `SORTARR_WAITRESS_TRUSTED_PROXY` to the immediate proxy IP/host when possible. If you leave it blank, Sortarr falls back to wildcard `*` trust and emits a startup warning.
Changing proxy trust settings in Setup saves them immediately, but Waitress applies them only after a Sortarr restart. CSRF diagnostics now show the live runtime values separately from the saved config so pending restarts are visible.

Supported proxy contract on Waitress:
- `X-Forwarded-For` may contain multiple comma-separated values to reflect hop depth.
- `X-Forwarded-Host`, `X-Forwarded-Proto`, and `X-Forwarded-Port` should be normalized by the immediate proxy so Sortarr receives one value for each.
- If `X-Forwarded-Proto` or `X-Forwarded-Port` arrive with commas, Sortarr diagnostics now warn explicitly because Waitress 3.x rejects those shapes when the headers are trusted.

Setup includes:
- **Authentication Method** (`Basic` or `External`) under **Security**
- **Proxy mode** preset (`Direct`, `Single proxy`, `Two proxies`, `Custom`) under **Advanced settings -> Network & CSRF**
- **Waitress trusted proxy** field under **Advanced settings -> Network & CSRF** for the immediate upstream proxy IP/host
- **Upstream auth header** under **Security** when `Authentication Method = External`
- Proxy trust changes saved through Setup require a restart before Waitress applies them
- **Run proxy/CSRF diagnostics**, which reports current forwarded headers, current vs suggested proxy mode, and latest CSRF mismatch reason from `GET /api/diagnostics/csrf` after the required security setup save completes
- **Run security self-check diagnostics** from `GET /api/diagnostics/security-self-check` after security setup is complete to get pass/fail signals for persistent secret status, unsafe recovery mode, trusted-origin policy validity, and cookie/CSP guardrails
  - Direct HTTP installs in `Proxy mode = direct` are treated as healthy when cookies are intentionally non-`Secure` on plain HTTP.
  - Setup, CSRF diagnostics, and the security self-check now warn explicitly if plain HTTP is detected but Sortarr would still issue `Secure` cookies, because the browser would drop them on the next POST.
  - The default CSP now keeps `connect-src` same-origin only, so browser API calls remain limited to Sortarr itself unless you intentionally broaden policy in code later.

While Setup is security-locked, the remediation path is intentionally narrow: finish the required Setup save first, then run diagnostics if you still need them.

Authentication boundary notes:
- `Basic` remains the secure default for direct installs and transparent reverse proxies.
- `External` is opt-in and only supported when `SORTARR_WAITRESS_TRUSTED_PROXY` is set to the immediate proxy IP/host.
- In `External`, Sortarr trusts only the configured upstream identity header from that trusted proxy and does not emit a browser Basic Auth challenge of its own.

Cookie policy:
- Session/CSRF cookies follow the effective browser-facing request scheme by default.
- Plain HTTP requests, including first-time Setup on LAN HTTP installs, keep cookies non-`Secure` so the next setup/save POST can return the CSRF/session cookies successfully.
- HTTPS requests, and proxied requests that still present `X-Forwarded-Proto: https`, keep `Secure` cookies by default.
- If proxy trust is still incomplete, an explicit `https://...` value in `SORTARR_PUBLIC_HOST`, `SORTARR_PUBLIC_URL`, or `SORTARR_PUBLIC_ORIGIN` is treated as an HTTPS hint for cookie security only so Sortarr does not accidentally downgrade cookies on an HTTPS deployment.
- `SORTARR_SESSION_COOKIE_SECURE=1|0` can still override that behavior explicitly if needed.
- If Setup or diagnostics warn that plain HTTP would still receive `Secure` cookies, switch `Proxy mode` to `Direct` for that deployment or set `SORTARR_SESSION_COOKIE_SECURE=0`.

If diagnostics show `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-For` as blank:
1. Confirm Sortarr traffic actually passes through your proxy/router chain.
2. Verify proxy middleware is forwarding (not stripping) `X-Forwarded-*` headers.
3. Retest diagnostics, then set `SORTARR_PROXY_MODE` (and only if needed, `SORTARR_PROXY_HOPS*`) to match observed header values.
4. If a proxy echo service such as `whoami` shows forwarded headers but Sortarr diagnostics/logs still do not, upgrade to `0.8.4` or later so Waitress trusted-proxy handling preserves those headers before Flask sees them.

If diagnostics warn about comma-separated `X-Forwarded-Proto` or `X-Forwarded-Port`:
1. Normalize those headers at the immediate proxy so only one value reaches Sortarr.
2. Keep hop depth in `X-Forwarded-For`; do not mirror the full chain into `Proto` or `Port`.
3. Retest `/api/diagnostics/csrf` before assuming the problem is a CSRF token or session issue.

Prefix note:
- `Single proxy` and `Two proxies` no longer assume `X-Forwarded-Prefix`.
- If your proxy publishes Sortarr under a path prefix, use `SORTARR_PROXY_MODE=custom` and set `SORTARR_PROXY_HOPS_PREFIX=1`.
- Waitress cannot strictly validate `X-Forwarded-Prefix`, so enabling prefix trust causes Sortarr to preserve untrusted proxy headers for that specific advanced case. Keep prefix trust off unless you actually need it.

```
SORTARR_PROXY_MODE=direct|single|double|custom
```
Typical values:
```
direct No proxy trust
single Single proxy
double Two proxy hops (e.g., Cloudflare Tunnel → Traefik → Sortarr)
custom Advanced per-header override mode
```
For most setups, `SORTARR_PROXY_MODE` is sufficient.
Advanced overrides (`SORTARR_PROXY_HOPS`, `SORTARR_PROXY_HOPS_FOR/HOST/PROTO/PORT/PREFIX`) should be used only with `SORTARR_PROXY_MODE=custom`.
Sortarr now emits startup lint warnings if custom hop overrides are set while mode is not `custom`.

As of `0.8.2.1`, these settings are loaded from the config file before `ProxyFix` initializes, so values defined in `.env` / your mounted config are honored on startup.

If your proxies emit a different number of values per header, override them individually:
```
SORTARR_PROXY_HOPS_FOR=2
SORTARR_PROXY_HOPS_HOST=1
SORTARR_PROXY_HOPS_PROTO=1
SORTARR_PROXY_HOPS_PORT=1
SORTARR_PROXY_HOPS_PREFIX=0
```

For example, for `Cloudflare -> Caddy -> Sortarr`, `SORTARR_PROXY_HOPS=2` is usually correct, and the default per-header behavior already maps to `x_for=2`, `x_host=1`, `x_proto=1`.

If a proxied POST still fails CSRF checks, Sortarr logs a sanitized warning with effective request URL and forwarded-header context so you can confirm what Flask received.

Optional escape hatch (exact-match only, no wildcards):
```
SORTARR_CSRF_TRUSTED_ORIGINS=https://sortarr.example.com,https://sortarr.internal.example.com
```
When configured, exact trusted origins are the only CSRF origin/referer escape hatch and are allowed only if token validation succeeds. By default they must match the configured public host (or current request host when no public host is set); cross-host trusted origins require `ALLOW_CROSS_HOST_TRUSTED_ORIGINS=1`. Accepted trusted-origin fallbacks are logged as warnings (`origin-trusted-fallback-accepted` / `referer-trusted-fallback-accepted`).

Optional token TTL:
```
SORTARR_CSRF_TOKEN_TTL_SECONDS=7200
```
CSRF tokens are session-bound and expire after this TTL (minimum `60` seconds).

To reduce stale-tab setup failures, the setup form now syncs its hidden `csrf_token` from the current CSRF cookie right before submit (and when returning to the tab).

State-changing refresh actions are POST-only (CSRF-protected). `GET ?refresh=1` trigger behavior has been removed.

### Session consistency (single instance and replicas)

Use external secret sources for the session secret:
```
SORTARR_SECRET_KEY_FILE=/run/secrets/sortarr_secret_key
```
or on Windows:
```
SORTARR_SECRET_KEY_CRED_TARGET=Sortarr/SORTARR_SECRET_KEY
```

If this is not set, configured startup aborts. The only supported exceptions are true first-time bootstrap before the first Setup save, or explicit temporary unsafe recovery mode. Persistent session-secret references are required for steady-state operation because ephemeral keys can invalidate sessions/CSRF after restart and break consistency across replicas.

If a plaintext `SORTARR_SECRET_KEY` or legacy `SECRET_KEY` is still present,
Sortarr migrates it to `SORTARR_SECRET_KEY_FILE` or `SORTARR_SECRET_KEY_CRED_TARGET` during startup before the
Flask session key is resolved.

For multi-replica deployments, use the same secret key on every replica. Sticky sessions are not required when the secret is shared.

Security note: If SORTARR_PROXY_HOPS is enabled, make sure Sortarr is only reachable through your reverse proxy. (Do not publish the Sortarr container port directly to the internet).

---

### Secret storage options

Sortarr prefers external secret sources by default and does not support raw `.env` secret usage as a steady-state runtime mode. Plaintext values are treated as migration-only input.

For Docker/Linux/macOS, prefer secret files:
```
SONARR_API_KEY_FILE=/run/secrets/sonarr_api_key
RADARR_API_KEY_FILE=/run/secrets/radarr_api_key
TAUTULLI_API_KEY_FILE=/run/secrets/tautulli_api_key
JELLYSTAT_API_KEY_FILE=/run/secrets/jellystat_api_key
PLEX_TOKEN_FILE=/run/secrets/plex_token
BASIC_AUTH_PASS_FILE=/run/secrets/basic_auth_pass
```

On Windows, Sortarr can resolve Credential Manager references:
```
SONARR_API_KEY=wincred:Sortarr/SONARR_API_KEY
```
Inline `wincred:` remains supported for compatibility, but is deprecated in docs/UI.
Prefer explicit `*_CRED_TARGET` keys (for example `SONARR_API_KEY_CRED_TARGET=Sortarr/SONARR_API_KEY`).
This mode is enabled by default for Windows EXE builds and can be overridden with:
```
SORTARR_WINDOWS_CREDSTORE=0|1
```

Resolution order is: `*_FILE` -> Windows credential reference (`*_CRED_TARGET` / `wincred:`).
Use one secret source per variable to avoid precedence confusion.

Plaintext values are treated as migration inputs only; they are not a supported steady-state runtime secret source.

For the Session secret specifically, if Sortarr cannot persist the migrated
reference, startup aborts with:
`Plaintext SORTARR_SECRET_KEY/SECRET_KEY detected, but Sortarr now requires external session-secret references and could not persist a migrated session-secret reference.`

### Minimal config profile

Use `Sortarr.minimal.env.example` as the base profile for the supported surface above.

---

## What Sortarr does NOT do

Sortarr will never:

* Modify or rename media files
* Delete media
* Change Sonarr or Radarr configuration
* Trigger downloads automatically

All operations are read-only and safe.

---

## Supporting the project

Enjoying the project? Looking for a way to contribute?

The best way to support Sortarr is simply to use it. If you encounter bugs or issues, please report them. Feature requests and suggestions are also very welcome.

Sortarr is a free project and I will never require donations to support or maintain it.

That said, if you would like to support me directly, in the interest of transparency I should mention that any donations will most likely be spent on beer and beer-related activities. If you're still willing to contribute, I appreciate it greatly.

[![Support me](https://i.imgur.com/9LLuB8H.png)](https://buymeacoffee.com/sortarr)
## License

[MIT License](https://github.com/Jaredharper1/Sortarr/blob/main/LICENSE)
