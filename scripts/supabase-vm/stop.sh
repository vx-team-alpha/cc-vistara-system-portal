#!/usr/bin/env bash
# Stops Supabase and the VM for this worktree, keeping all data intact.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

require_orb

stop_idle_watcher

if ! vm_exists; then
  log "No VM found for this worktree ('$VM_NAME'). Nothing to stop."
  exit 0
fi

if vm_running; then
  log "Stopping Supabase inside '$VM_NAME'..."
  vm_run "supabase stop --workdir '$REPO_ROOT'" || true
  log "Stopping VM '$VM_NAME'..."
  orb stop "$VM_NAME"
else
  log "VM '$VM_NAME' is already stopped."
fi
