#!/usr/bin/env bash
# Permanently deletes this worktree's Supabase VM, including its database.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

require_orb

stop_idle_watcher

if ! vm_exists; then
  log "No VM found for this worktree ('$VM_NAME'). Nothing to destroy."
  exit 0
fi

# Guard the shared template: deleting it would force every future worktree
# back onto the slow full-build path. Use 'pnpm supabase:template-destroy'.
[ "$VM_NAME" != "$TEMPLATE_VM_NAME" ] \
  || die "This worktree maps to the shared template VM '$TEMPLATE_VM_NAME'. Use 'pnpm supabase:template-destroy' if you really want to remove the template."

read -r -p "This deletes '$VM_NAME' and all of its data. Continue? [y/N] " confirm
case "$confirm" in
  y|Y|yes|YES) ;;
  *) log "Aborted."; exit 1 ;;
esac

orb delete "$VM_NAME"
log "Deleted VM '$VM_NAME'."
