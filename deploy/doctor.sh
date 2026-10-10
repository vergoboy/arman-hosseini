#!/usr/bin/env bash
# Run on the server:  bash deploy/doctor.sh /en/journal/sara2/
# Shows, step by step, where a published page gets lost between "approved" and "served".
PAGE="${1:-/en/journal/}"; PAGE="/${PAGE#/}"; [[ "$PAGE" == */ ]] || PAGE="$PAGE/"
CUR="${CURRENT_LINK:-/opt/arman-hosseini/current}"
DATA="${DATA_DIR:-/var/lib/arman-admin}"
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1) Live symlink (nginx must serve THIS folder)"
ls -ld "$CUR" 2>&1; echo "-> resolves to: $(readlink -f "$CUR" 2>&1)"

say "2) Is the page inside the live release?"
if [ -f "$CUR${PAGE}index.html" ]; then echo "YES  $CUR${PAGE}index.html"; else echo "NO   $CUR${PAGE}index.html  (not built into the live release -> press 'Publish changes' / check the build log below)"; fi

say "3) Last builds (status + log tail)"
if [ -f "$DATA/builds.json" ]; then head -c 700 "$DATA/builds.json"; echo; fi
LOG="$(ls -1t "$DATA"/builds/*.log 2>/dev/null | head -1)"; [ -n "$LOG" ] && { echo "--- $LOG"; tail -n 15 "$LOG"; } || echo "no build logs in $DATA/builds"

say "4) What nginx actually serves (root lines for this site)"
(sudo -n nginx -T 2>/dev/null || nginx -T 2>/dev/null) | grep -E "server_name|^\s*root " | head -20 || echo "cannot run nginx -T (try with sudo)"

say "4b) Every nginx server block for arman-hosseini.ir (more than one with the same listen port = the first one wins)"
(sudo -n nginx -T 2>/dev/null || nginx -T 2>/dev/null) | awk '
  /^[[:space:]]*server[[:space:]]*\{/ {inb=1; depth=0; buf=""}
  inb { buf = buf $0 "\n"; n=gsub(/\{/,"{"); m=gsub(/\}/,"}"); depth += n-m; if (depth<=0) { if (buf ~ /arman-hosseini\.ir/) print buf "-----"; inb=0 } }' | head -80

say "5) What the web server answers for $PAGE (locally, bypassing DNS/CDN)"
curl -sk -o /dev/null -w "https via nginx: HTTP %{http_code}\n" --resolve arman-hosseini.ir:443:127.0.0.1 "https://arman-hosseini.ir$PAGE" 2>&1
curl -s  -o /dev/null -w "http  via nginx: HTTP %{http_code}\n" -H "Host: arman-hosseini.ir" "http://127.0.0.1$PAGE" 2>&1

say "6) Admin service"
systemctl is-active arman-admin 2>&1; curl -s -m 3 http://127.0.0.1:4322/api/health; echo
say "Done. Compare step 1/4: nginx 'root' must equal the symlink in step 1."
