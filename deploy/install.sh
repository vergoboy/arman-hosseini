#!/usr/bin/env bash
# One-time server setup (Ubuntu/Debian, Node >= 20 already installed). Run as the deploy user.
set -euo pipefail
SRC=/opt/arman-hosseini-src; WEB=/opt/arman-hosseini
sudo mkdir -p "$SRC" "$WEB/releases" /var/lib/arman-admin && sudo chown -R "$USER" "$SRC" "$WEB" /var/lib/arman-admin
[ -d "$SRC/.git" ] || git clone https://github.com/vergoboy/arman-hosseini.git "$SRC"
cd "$SRC" && npm ci
npm run build:site            # first release so nginx has something to serve
ASTRO_OUT_DIR="$WEB/releases/initial" npm run build:site && ln -sfn "$WEB/releases/initial" "$WEB/current"
sudo cp deploy/arman-admin.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now arman-admin
echo "Now install deploy/nginx.conf, run certbot, then read the one-time admin password:  journalctl -u arman-admin | grep 'initial admin password'"
