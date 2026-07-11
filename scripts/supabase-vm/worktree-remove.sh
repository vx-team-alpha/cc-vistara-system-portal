#!/usr/bin/env bash
# Destroys a worktree's Supabase VM and removes the git worktree itself.
#
# Usage: scripts/supabase-vm/worktree-remove.sh <name> [--force]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

require_orb

NAME="${1:-}"
[ -n "$NAME" ] || die "usage: worktree-remove.sh <name> [--force]"
FORCE="${2:-}"

MAIN_ROOT="$(git -C "$REPO_ROOT" rev-parse --show-toplevel)"
TARGET_DIR="$MAIN_ROOT/.worktrees/$NAME"

[ -d "$TARGET_DIR" ] || die "No worktree found at '$TARGET_DIR'."

# Compute the VM name the same way lib.sh does for that worktree (based on
# its directory basename), without needing to source lib.sh from inside it.
VM_NAME_FOR_WORKTREE="sb-$(basename "$TARGET_DIR" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed -E 's/-+/-/g; s/^-|-$//g')"

# Kill that worktree's idle watcher directly by its PID file, same reasoning
# as above — don't assume the target worktree has its own scripts/lib.sh.
WATCHER_PID_FILE_FOR_WORKTREE="$TARGET_DIR/.supabase-vm/watcher.pid"
if [ -f "$WATCHER_PID_FILE_FOR_WORKTREE" ]; then
  log "Stopping idle watcher for '$NAME'..."
  kill "$(cat "$WATCHER_PID_FILE_FOR_WORKTREE")" 2>/dev/null || true
fi

# A worktree literally named "template" would slug to the shared template VM
# name and blow away the image cache for every other worktree. Refuse instead.
[ "$VM_NAME_FOR_WORKTREE" != "$TEMPLATE_VM_NAME" ] \
  || die "Worktree '$NAME' maps to the shared template VM '$TEMPLATE_VM_NAME'. Refusing to delete it — remove the git worktree manually with 'git worktree remove'."

if orb list 2>/dev/null | awk '{print $1}' | grep -qx "$VM_NAME_FOR_WORKTREE"; then
  log "Deleting VM '$VM_NAME_FOR_WORKTREE'..."
  orb delete "$VM_NAME_FOR_WORKTREE"
else
  log "No VM '$VM_NAME_FOR_WORKTREE' found, skipping."
fi

log "Removing git worktree '$NAME'..."
if [ "$FORCE" = "--force" ]; then
  git -C "$MAIN_ROOT" worktree remove --force "$TARGET_DIR"
else
  git -C "$MAIN_ROOT" worktree remove "$TARGET_DIR"
fi

log "Removed worktree '$NAME'."
