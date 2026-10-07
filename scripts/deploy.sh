#!/usr/bin/env bash
#
# Build the site and publish `dist/` to the server over SSH with rsync.
#
#   npm run deploy              # build + sync
#   npm run deploy:dry          # build + show what would change (no writes)
#   scripts/deploy.sh --help
#
# Transport is rsync over SSH rather than SFTP: it is incremental, resumable, and can prune
# files that no longer exist locally (`--delete`), which a full SFTP upload cannot do.
# Requires `rsync` and `ssh`. `sshpass` is needed only for password auth.
#
# Non-secret settings live in deploy.config.json (committed).
# Secrets live in .env (git-ignored) — see .env.example. This script refuses to run if
# deploy.config.json contains anything that looks like a credential.
#
# Layout mirrors the pipeline the FIT plugin triggers:
#   npm run sync:content  →  npm run build  →  rsync dist/ → server
#
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="${DEPLOY_CONFIG:-$PROJECT_ROOT/deploy.config.json}"
ENV_FILE="${DEPLOY_ENV_FILE:-$PROJECT_ROOT/.env}"

DRY_RUN=0
SKIP_BUILD=0
LOCAL_MODE=0

log() { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
warn() { printf '[%s] warn:  %s\n' "$(date '+%H:%M:%S')" "$*" >&2; }
die() { printf '[%s] error: %s\n' "$(date '+%H:%M:%S')" "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Build the site and publish dist/ to the server over SSH with rsync.

Usage:
  scripts/deploy.sh [options]

Options:
  --dry-run, -n     Show what rsync would transfer; write nothing
  --skip-build      Skip `buildCommand` and sync the existing dist/
  --local           Deploy to `remotePath` as a local directory (staging / pipeline test)
  --config <path>   Use a different config file (default: deploy.config.json)
  --help, -h        Show this help

Secrets come from .env, never from the config file:
  DEPLOY_SSH_PASSWORD   Only if the server refuses key auth (requires sshpass)
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run|-n) DRY_RUN=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --local) LOCAL_MODE=1 ;;
    --config)
      [ $# -ge 2 ] || die "--config requires a path"
      CONFIG_FILE="$2"
      shift
      ;;
    --help|-h) usage; exit 0 ;;
    *) die "unknown option: $1 (try --help)" ;;
  esac
  shift
done

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Minimal .env reader. Deliberately not `source`: a .env is data, and sourcing it would
# execute whatever it contains. Only KEY=VALUE lines with optional surrounding quotes.
load_env_file() {
  [ -f "$ENV_FILE" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
    esac
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac
    local key="${line%%=*}"
    local value="${line#*=}"
    # Trim surrounding whitespace and one layer of matching quotes.
    key="$(printf '%s' "$key" | tr -d '[:space:]')"
    case "$key" in
      [A-Za-z_][A-Za-z0-9_]*) ;;
      *) continue ;;
    esac
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    case "$value" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac
    export "$key=$value"
  done < "$ENV_FILE"
}

load_env_file

command -v node >/dev/null 2>&1 || die "node is required to read $CONFIG_FILE"
[ -f "$CONFIG_FILE" ] || die "config file not found: $CONFIG_FILE"

node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$CONFIG_FILE" \
  || die "$CONFIG_FILE is not valid JSON"

cfg() { # cfg <key> [default]
  node -e '
    const fs = require("fs");
    const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))[process.argv[2]];
    process.stdout.write(value === undefined || value === null ? (process.argv[3] ?? "") : String(value));
  ' "$CONFIG_FILE" "$1" "${2-}"
}

cfg_list() { # cfg_list <key> — one array element per line
  node -e '
    const fs = require("fs");
    const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))[process.argv[2]];
    if (Array.isArray(value)) for (const item of value) process.stdout.write(String(item) + "\n");
  ' "$CONFIG_FILE" "$1"
}

# The config is committed, so a credential in it would be published. Fail loudly rather
# than quietly honouring it.
if node -e '
  const config = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const secretish = ["password", "passphrase", "privateKey", "token", "secret"];
  process.exit(secretish.some((key) => key in config) ? 1 : 0);
' "$CONFIG_FILE"; then
  :
else
  die "$CONFIG_FILE looks like it contains a credential (password/passphrase/privateKey/token/secret).
       That file is committed to git. Move the secret into .env instead — see .env.example."
fi

HOST="$(cfg host)"
PORT="$(cfg port 22)"
USER_NAME="$(cfg user)"
REMOTE_PATH="$(cfg remotePath)"
IDENTITY_FILE="$(cfg identityFile)"
LOCAL_DIR="$(cfg localDir dist)"
BUILD_COMMAND="$(cfg buildCommand 'npm run build')"
DELETE_FLAG="$(cfg delete true)"

[ -n "$REMOTE_PATH" ] || die "$CONFIG_FILE: \"remotePath\" is required"
[ -n "$LOCAL_DIR" ] || die "$CONFIG_FILE: \"localDir\" is required"

if [ "$LOCAL_MODE" -eq 0 ] && [ -z "$HOST" ]; then
  die "$CONFIG_FILE: \"host\" is empty. Set it, or pass --local to deploy to \"remotePath\" as a
       local directory (useful for staging or for testing the pipeline without a server)."
fi

if [ "$LOCAL_MODE" -eq 0 ] && [ -z "$USER_NAME" ]; then
  die "$CONFIG_FILE: \"user\" is required when \"host\" is set"
fi

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

if [ "$SKIP_BUILD" -eq 1 ]; then
  log "Skipping build (--skip-build)"
else
  [ -n "$BUILD_COMMAND" ] || die "$CONFIG_FILE: \"buildCommand\" is empty; pass --skip-build to sync an existing $LOCAL_DIR/"
  log "Building: $BUILD_COMMAND"
  # `buildCommand` comes from your own config file — same trust level as your shell.
  ( cd "$PROJECT_ROOT" && bash -c "$BUILD_COMMAND" ) || die "build failed — nothing was uploaded"
fi

SOURCE_DIR="$PROJECT_ROOT/$LOCAL_DIR"
[ -d "$SOURCE_DIR" ] || die "build output not found: $SOURCE_DIR"
SOURCE_FILE_COUNT="$(find "$SOURCE_DIR" -type f | wc -l | tr -d '[:space:]')"
[ "$SOURCE_FILE_COUNT" -gt 0 ] || die "$SOURCE_DIR is empty — refusing to deploy an empty site"
log "Build output: $LOCAL_DIR/ ($SOURCE_FILE_COUNT file(s))"

# ---------------------------------------------------------------------------
# Transport
# ---------------------------------------------------------------------------

command -v rsync >/dev/null 2>&1 || die "rsync is required but not installed"

RSYNC_ARGS=(-a --human-readable --itemize-changes)
[ "$DELETE_FLAG" = "true" ] && RSYNC_ARGS+=(--delete)

while IFS= read -r pattern; do
  [ -n "$pattern" ] && RSYNC_ARGS+=(--exclude "$pattern")
done < <(cfg_list exclude)

SSH_BASE=()

if [ "$LOCAL_MODE" -eq 1 ]; then
  DESTINATION="$REMOTE_PATH"
  [ -n "$HOST" ] && warn "--local overrides the configured host \"$HOST\"; nothing leaves this machine"
  log "Local mode: $LOCAL_DIR/ → $REMOTE_PATH/"
  command -v mkdir >/dev/null 2>&1 || die "mkdir is required"
  mkdir -p "$REMOTE_PATH"
else
  [ -n "$PORT" ] || PORT=22

  SSH_OPTS=(-p "$PORT" -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)

  if [ -n "$IDENTITY_FILE" ]; then
    case "$IDENTITY_FILE" in
      "~/"*) IDENTITY_FILE="$HOME/${IDENTITY_FILE#\~/}" ;;
    esac
    [ -f "$IDENTITY_FILE" ] || die "identityFile not found: $IDENTITY_FILE (fix deploy.config.json or put the key in ssh-agent)"
    SSH_OPTS+=(-i "$IDENTITY_FILE")
  fi

  if [ -n "${DEPLOY_SSH_PASSWORD:-}" ]; then
    command -v sshpass >/dev/null 2>&1 || die "DEPLOY_SSH_PASSWORD is set but sshpass is not installed.
       Install it (apt install sshpass), or switch to key auth: set identityFile and unset DEPLOY_SSH_PASSWORD."
    warn "Using password auth via sshpass. Key auth (identityFile) is preferred."
    SSH_BASE=(sshpass -e)
    # Password auth cannot work in BatchMode.
  else
    # Fail fast instead of hanging on an interactive prompt. A passphrase-protected key
    # therefore needs to be loaded into ssh-agent first.
    SSH_OPTS+=(-o BatchMode=yes)
  fi

  RSYNC_ARGS+=(-e "ssh ${SSH_OPTS[*]}")

  DESTINATION="$USER_NAME@$HOST:$REMOTE_PATH/"
  log "Remote mode: $LOCAL_DIR/ → $DESTINATION"

  if [ "$DRY_RUN" -eq 0 ]; then
    log "Ensuring $REMOTE_PATH exists on $HOST"
    "${SSH_BASE[@]}" ssh "${SSH_OPTS[@]}" "$USER_NAME@$HOST" "mkdir -p '$REMOTE_PATH'" \
      || die "could not create $REMOTE_PATH on $HOST (check host, user, port and key/password)"
  fi
fi

if [ "$DRY_RUN" -eq 1 ]; then
  RSYNC_ARGS+=(--dry-run)
  log "Dry run — no files will be written"
fi

# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------

# Trailing slash on the source: copy the *contents* of dist/ into remotePath, not dist itself.
log "Syncing $SOURCE_FILE_COUNT file(s)"
START_SECONDS=$SECONDS

set +e
"${SSH_BASE[@]}" rsync "${RSYNC_ARGS[@]}" "$SOURCE_DIR/" "$DESTINATION"
RSYNC_STATUS=$?
set -e

if [ "$RSYNC_STATUS" -ne 0 ]; then
  case "$RSYNC_STATUS" in
    23|24) warn "rsync finished with partial transfers (exit $RSYNC_STATUS)" ;;
    *) die "rsync failed with exit $RSYNC_STATUS — the live site was left in whatever state the transfer reached" ;;
  esac
fi

ELAPSED=$((SECONDS - START_SECONDS))
if [ "$DRY_RUN" -eq 1 ]; then
  log "Dry run complete in ${ELAPSED}s — nothing was uploaded"
else
  log "Deployed to $DESTINATION in ${ELAPSED}s"
  [ "$DELETE_FLAG" = "true" ] || warn "\"delete\" is false — files removed locally still exist on the server"
fi
