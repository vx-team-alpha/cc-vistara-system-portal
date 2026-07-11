#!/usr/bin/env bash
# Shared helpers for the per-worktree Supabase OrbStack VM scripts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

# Resolve the repo root from the *caller's* working directory, not this
# script's own location — worktree-add.sh invokes the main checkout's copy
# of start.sh (worktrees don't have their own copy until scripts/ is
# committed), so `cd "$(dirname ...)")` would always land back in the main
# checkout regardless of which worktree the caller cd'd into first.
REPO_ROOT="$(git rev-parse --show-toplevel)"

# Stable, sanitized slug for this worktree (main checkout included) so every
# worktree gets its own deterministic VM name without extra config.
worktree_slug() {
  basename "$REPO_ROOT" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed -E 's/-+/-/g; s/^-|-$//g'
}

VM_NAME="sb-$(worktree_slug)"
VM_USER="supabase"

# Shared, pre-provisioned VM that every per-worktree VM is cloned from. It
# holds Docker, the Supabase CLI, and — the expensive part — the ~9GB of
# pulled Supabase container images. OrbStack machines are btrfs subvolumes, so
# `orb clone` is a sub-second copy-on-write snapshot rather than a re-download.
# Image stores are per-machine (a fresh VM sees zero images), which is exactly
# why cloning wins: the clone inherits the warm image cache.
TEMPLATE_VM_NAME="${SUPABASE_VM_TEMPLATE:-sb-template}"
# Always read from the checkout that actually has these scripts (SCRIPT_DIR),
# not $REPO_ROOT/scripts/... — a worktree created before this scripts/
# directory was committed won't have its own copy on disk.
CLOUD_INIT_FILE="$SCRIPT_DIR/cloud-init.yaml"
PROVISION_FILE="$SCRIPT_DIR/provision.sh"
ENV_FILE="$REPO_ROOT/.env.local"

# Host-side, per-worktree state for the idle-shutdown watcher (PID + last
# activity timestamp). Not committed — see .gitignore.
STATE_DIR="$REPO_ROOT/.supabase-vm"
ACTIVITY_FILE="$STATE_DIR/last-active"
WATCHER_PID_FILE="$STATE_DIR/watcher.pid"
WATCHER_LOG_FILE="$STATE_DIR/watcher.log"

log() { echo "[supabase-vm] $*" >&2; }
die() { echo "[supabase-vm] error: $*" >&2; exit 1; }

# Minutes of inactivity before the watcher stops this worktree's VM.
# 0 disables the watcher entirely. Override per-worktree via .env.local or
# the shell environment.
IDLE_MINUTES="${SUPABASE_VM_IDLE_MINUTES:-15}"
case "$IDLE_MINUTES" in
  ''|*[!0-9]*) die "SUPABASE_VM_IDLE_MINUTES must be a non-negative integer, got '$IDLE_MINUTES'." ;;
esac

require_orb() {
  command -v orb >/dev/null 2>&1 || die "OrbStack CLI ('orb') not found. Install OrbStack: https://orbstack.dev"
}

vm_exists() {
  orb list 2>/dev/null | awk '{print $1}' | grep -qx "$VM_NAME"
}

vm_state() {
  orb list 2>/dev/null | awk -v n="$VM_NAME" '$1 == n {print $2}'
}

# Generic name-based lookups, used for the template VM and (in
# worktree-remove.sh) for another worktree's VM.
any_vm_exists() {
  orb list 2>/dev/null | awk '{print $1}' | grep -qx "$1"
}

any_vm_state() {
  orb list 2>/dev/null | awk -v n="$1" '$1 == n {print $2}'
}

template_exists() {
  any_vm_exists "$TEMPLATE_VM_NAME"
}

vm_running() {
  [ "$(vm_state)" = "running" ]
}

# Run a command inside the VM as the provisioned user, from the worktree
# directory (OrbStack shares the macOS filesystem into every Linux VM at the
# same absolute path via virtiofs, so REPO_ROOT resolves identically on both sides).
vm_run() {
  orb -m "$VM_NAME" -u "$VM_USER" -w "$REPO_ROOT" bash -lc "$1"
}

vm_run_root() {
  orb -m "$VM_NAME" -u root bash -lc "$1"
}

# OrbStack creates the VM's --user account asynchronously after `orb create`
# returns, on a pass that isn't synchronized with cloud-init. Poll for it
# with a real timeout instead of assuming it exists.
wait_for_vm_user() {
  local attempts=60
  for ((i = 1; i <= attempts; i++)); do
    vm_run_root "id '$VM_USER'" >/dev/null 2>&1 && return 0
    sleep 2
  done
  die "VM '$VM_NAME' never provisioned its '$VM_USER' user after $((attempts * 2))s. Run 'orb info $VM_NAME' to inspect it, or 'pnpm supabase:destroy' and retry."
}

# Records "something used this VM just now". Called from every script that
# touches the VM (start.sh, exec.sh) so the idle watcher's clock keeps
# resetting as long as the VM is actually being used.
touch_activity() {
  mkdir -p "$STATE_DIR"
  touch "$ACTIVITY_FILE"
}

watcher_running() {
  [ -f "$WATCHER_PID_FILE" ] && kill -0 "$(cat "$WATCHER_PID_FILE")" 2>/dev/null
}

# Starts a detached background loop that stops this worktree's VM after
# IDLE_MINUTES of no touch_activity() calls. One watcher per worktree VM;
# safe to call every time start.sh runs since it no-ops if already running.
start_idle_watcher() {
  if [ "$IDLE_MINUTES" -le 0 ]; then
    log "Idle auto-shutdown disabled (SUPABASE_VM_IDLE_MINUTES=0)."
    return 0
  fi

  mkdir -p "$STATE_DIR"
  touch_activity

  if watcher_running; then
    return 0
  fi

  log "Starting idle watcher (shuts down '$VM_NAME' after ${IDLE_MINUTES}m of inactivity)..."
  nohup "$SCRIPT_DIR/idle-watcher.sh" "$REPO_ROOT" "$IDLE_MINUTES" \
    >> "$WATCHER_LOG_FILE" 2>&1 &
  disown
  echo "$!" > "$WATCHER_PID_FILE"
}

# Kills this worktree's idle watcher, if running. Called from stop.sh and
# destroy.sh — no point polling for idleness on a VM that's already stopped
# or gone.
stop_idle_watcher() {
  if watcher_running; then
    log "Stopping idle watcher..."
    kill "$(cat "$WATCHER_PID_FILE")" 2>/dev/null || true
  fi
  rm -f "$WATCHER_PID_FILE" "$ACTIVITY_FILE"
}
