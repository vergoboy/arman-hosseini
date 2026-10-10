#!/usr/bin/env bash
# Update the server's source checkout from the project zip WITHOUT touching your data.
#   bash deploy/update.sh ~/arman-hosseini-v2.zip
# Keeps: content-meta/overrides.json (your SEO settings), every existing file in src/content
# (pages you published / approved), the admin data dir. Overwrites: code, components, styles, config.
set -euo pipefail
ZIP="${1:?usage: update.sh <zip>}"
SRC="${SRC_DIR:-/opt/arman-hosseini-src}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

python3 -m zipfile -e "$ZIP" "$TMP" >/dev/null
NEW="$TMP/arman-hosseini"; [ -f "$NEW/package.json" ] || { echo "zip does not contain arman-hosseini/package.json"; exit 1; }

echo "→ updating code in $SRC"
( cd "$NEW" && tar --exclude=./src/content --exclude=./content-meta --exclude=./node_modules -cf - . ) | tar -xf - -C "$SRC"

mkdir -p "$SRC/content-meta"
[ -f "$SRC/content-meta/overrides.json" ] || cp "$NEW/content-meta/overrides.json" "$SRC/content-meta/overrides.json"

# New starter content (migrated projects, draft posts) is added only where no file exists yet.
( cd "$NEW" && tar -cf - ./src/content ) | tar -xkf - -C "$SRC" 2>/dev/null || true

if [ -z "${SKIP_NPM:-}" ]; then ( cd "$SRC" && npm ci --no-audit --no-fund ); fi
if [ -z "${SKIP_RESTART:-}" ]; then sudo systemctl restart arman-admin && echo "→ admin restarted"; fi
echo "✔ updated. Now open the dashboard and press «Publish changes» (انتشار تغییرات) to rebuild."
