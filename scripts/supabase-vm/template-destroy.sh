#!/usr/bin/env bash
# Deletes the shared template VM. Existing per-worktree VMs are unaffected —
# OrbStack clones are independent machines, not thin references to the source.
# The only cost is that the next new worktree falls back to a full build
# until the template is rebuilt with 'pnpm supabase:template'.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

require_orb

if ! template_exists; then
  log "No template VM '$TEMPLATE_VM_NAME' found. Nothing to destroy."
  exit 0
fi

read -r -p "This deletes the shared template VM '$TEMPLATE_VM_NAME'. Continue? [y/N] " confirm
case "$confirm" in
  y|Y|yes|YES) ;;
  *) log "Aborted."; exit 1 ;;
esac

orb delete --force "$TEMPLATE_VM_NAME"
log "Deleted template VM '$TEMPLATE_VM_NAME'."
log "Rebuild it with 'pnpm supabase:template' to keep new worktrees fast."
