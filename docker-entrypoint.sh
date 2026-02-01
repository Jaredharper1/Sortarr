#!/bin/sh
set -e

PUID="${PUID:-}"
PGID="${PGID:-}"

is_number() {
    case "$1" in
        ''|*[!0-9]*) return 1 ;;
        *) return 0 ;;
    esac
}

if [ -n "$PUID" ] && [ -n "$PGID" ]; then
    if ! is_number "$PUID" || ! is_number "$PGID"; then
        echo "PUID/PGID must be numeric; running as root." >&2
        exec "$@"
    fi

    group_name="sortarr"
    if getent group "$PGID" >/dev/null 2>&1; then
        group_name="$(getent group "$PGID" | cut -d: -f1)"
    else
        if command -v groupadd >/dev/null 2>&1; then
            groupadd -g "$PGID" "$group_name"
        elif command -v addgroup >/dev/null 2>&1; then
            addgroup --gid "$PGID" "$group_name"
        fi
    fi

    user_name="sortarr"
    if getent passwd "$PUID" >/dev/null 2>&1; then
        user_name="$(getent passwd "$PUID" | cut -d: -f1)"
    else
        if command -v useradd >/dev/null 2>&1; then
            useradd -u "$PUID" -g "$PGID" -s /bin/sh -M "$user_name"
        elif command -v adduser >/dev/null 2>&1; then
            adduser --uid "$PUID" --gid "$PGID" --disabled-password --gecos "" "$user_name"
        fi
    fi

    safe_chown() {
        dir_path="$1"
        if [ -n "$dir_path" ]; then
            mkdir -p "$dir_path"
            chown -R "$PUID:$PGID" "$dir_path" 2>/dev/null || true
        fi
    }

    if [ -d "/config" ]; then
        safe_chown "/config"
    fi
    for path in "$ENV_FILE_PATH" "$TAUTULLI_METADATA_CACHE" "$SONARR_CACHE_PATH" "$RADARR_CACHE_PATH"; do
        if [ -n "$path" ]; then
            safe_chown "$(dirname "$path")"
        fi
    done

    if [ "$PUID" != "0" ] || [ "$PGID" != "0" ]; then
        if command -v gosu >/dev/null 2>&1; then
            exec gosu "$user_name" "$@"
        fi
        if command -v su-exec >/dev/null 2>&1; then
            exec su-exec "$user_name" "$@"
        fi
        echo "gosu/su-exec not available; running as root." >&2
        exec "$@"
    fi
fi

exec "$@"
