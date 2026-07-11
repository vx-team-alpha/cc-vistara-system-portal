#!/usr/bin/env bash
# Background loop started by lib.sh's start_idle_watcher(). Polls how long
# it's been since the last touch_activity() call and runs stop.sh once that
# exceeds the configured threshold. Not meant to be run directly.
#
# Usage: idle-watcher.sh <repo-root> <idle-minutes>
set -euo pipefail

REPO_ROOT="${1:?usage: idle-watcher.sh <repo-root> <idle-minutes>}"
IDLE_MINUTES="${2:?usage: idle-watcher.sh <repo-root> <idle-minutes>}"
IDLE_SECONDS=$((IDLE_MINUTES * 60))
POLL_SECONDS=60

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
STATE_DIR="$REPO_ROOT/.supabase-vm"
ACTIVITY_FILE="$STATE_DIR/last-active"
WATCHER_PID_FILE="$STATE_DIR/watcher.pid"

echo "[idle-watcher] watching $REPO_ROOT (idle limit: ${IDLE_MINUTES}m, poll: ${POLL_SECONDS}s)"

while true; do
  sleep "$POLL_SECONDS"

  # Stop watching if we were killed-and-replaced or explicitly stopped —
  # a stale watcher.pid pointing at us but a missing activity file means
  # stop_idle_watcher() already cleaned up.
  [ -f "$ACTIVITY_FILE" ] || { echo "[idle-watcher] activity file gone, exiting"; exit 0; }
  if [ -f "$WATCHER_PID_FILE" ] && [ "$(cat "$WATCHER_PID_FILE" 2>/dev/null)" != "$$" ]; then
    echo "[idle-watcher] superseded by another watcher, exiting"
    exit 0
  fi

  now=$(date +%s)
  last=$(stat -f %m "$ACTIVITY_FILE" 2>/dev/null || stat -c %Y "$ACTIVITY_FILE" 2>/dev/null || echo "$now")
  idle_for=$((now - last))

  if [ "$idle_for" -ge "$IDLE_SECONDS" ]; then
    echo "[idle-watcher] idle for ${idle_for}s (limit ${IDLE_SECONDS}s), stopping VM..."
    "$SCRIPT_DIR/stop.sh" || echo "[idle-watcher] stop.sh failed, will retry next poll"
    exit 0
  fi
done
