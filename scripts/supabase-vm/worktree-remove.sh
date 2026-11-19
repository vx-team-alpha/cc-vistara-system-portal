#!/usr/bin/env bash
# Destroys a worktree's Supabase VM and removes the git worktree itself.
#
# Usage:
#   scripts/supabase-vm/worktree-remove.sh <name> [options]
#   pnpm worktree:delete <name> [options]
#   pnpm worktree:remove <name> [options]
#
# Options:
#   -f, --force          Force removal of worktree even if dirty or containing untracked files
#   -b, --delete-branch  Delete the associated local git branch (git branch -d)
#   -D                   Force delete the associated local git branch (git branch -D)
#   --all                Remove all worktrees in .worktrees/
#   -h, --help           Show this help message
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

MAIN_ROOT="$(git -C "$REPO_ROOT" rev-parse --show-toplevel)"
WORKTREES_DIR="$MAIN_ROOT/.worktrees"

NAME=""
FORCE=false
DELETE_BRANCH=false
FORCE_BRANCH=false
REMOVE_ALL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      echo "Usage: pnpm worktree:delete <name> [options]"
      echo ""
      echo "Options:"
      echo "  -f, --force          Force removal even if worktree has uncommitted changes"
      echo "  -b, --delete-branch  Delete associated local branch (safe: git branch -d)"
      echo "  -D                   Force delete associated local branch (git branch -D)"
      echo "  --all                Delete all worktrees in .worktrees/"
      echo "  -h, --help           Show this help message"
      exit 0
      ;;
    -f|--force)
      FORCE=true
      shift
      ;;
    -b|--delete-branch)
      DELETE_BRANCH=true
      shift
      ;;
    -D)
      DELETE_BRANCH=true
      FORCE_BRANCH=true
      shift
      ;;
    --all)
      REMOVE_ALL=true
      shift
      ;;
    -*)
      die "Unknown option '$1'. Use --help for usage."
      ;;
    *)
      if [ -z "$NAME" ]; then
        NAME="$1"
      else
        die "Unexpected argument '$1'. Use --help for usage."
      fi
      shift
      ;;
  esac
done

if [ -z "$NAME" ] && [ "$REMOVE_ALL" = false ]; then
  echo "Usage: pnpm worktree:delete <name> [options]" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  -f, --force          Force removal even if worktree has uncommitted changes" >&2
  echo "  -b, --delete-branch  Delete associated local git branch (safe: git branch -d)" >&2
  echo "  -D                   Force delete associated local git branch (force: git branch -D)" >&2
  echo "  --all                Delete all worktrees in .worktrees/" >&2
  echo "" >&2
  echo "Current worktrees:" >&2
  "$MAIN_ROOT/scripts/supabase-vm/worktree-list.sh" >&2 || true
  exit 1
fi

remove_single_worktree() {
  local target_name="$1"
  local target_dir="$WORKTREES_DIR/$target_name"

  # Support passing a path instead of just a name
  if [[ "$target_name" == /* ]] || [[ "$target_name" == ./* ]] || [[ "$target_name" == .worktrees/* ]]; then
    target_dir="$(cd "$target_name" 2>/dev/null && pwd -P || echo "$target_name")"
    target_name="$(basename "$target_dir")"
  fi

  # Prevent deleting root repository
  if [ "$target_dir" = "$MAIN_ROOT" ]; then
    die "Cannot delete the main repository checkout ($MAIN_ROOT)!"
  fi

  # Prevent deleting if caller's cwd is inside target_dir
  local current_dir="$(pwd -P)"
  if [[ "$current_dir" == "$target_dir"* ]]; then
    die "Cannot delete worktree while current shell is inside it ($current_dir). Run 'cd $MAIN_ROOT' first."
  fi

  # Determine branch name associated with this worktree
  local branch_name=""
  if [ -e "$target_dir" ] || git -C "$MAIN_ROOT" worktree list | grep -Fq "$target_dir"; then
    branch_name="$(git -C "$MAIN_ROOT" worktree list --porcelain | awk -v dir="$target_dir" '
      $1 == "worktree" && $2 == dir { found=1; next }
      found && $1 == "branch" { sub("refs/heads/", "", $2); print $2; exit }
      found && $1 == "worktree" { exit }
    ')"
  fi
  if [ -z "$branch_name" ] && git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$target_name"; then
    branch_name="$target_name"
  fi

  # Stop idle watcher for this worktree if active
  local watcher_pid_file="$target_dir/.supabase-vm/watcher.pid"
  if [ -f "$watcher_pid_file" ]; then
    log "Stopping idle watcher for '$target_name'..."
    kill "$(cat "$watcher_pid_file")" 2>/dev/null || true
  fi

  # VM cleanup (if OrbStack is installed)
  local vm_slug="$(echo "$target_name" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed -E 's/-+/-/g; s/^-|-$//g')"
  local vm_name="sb-$vm_slug"

  if [ "$vm_name" = "$TEMPLATE_VM_NAME" ]; then
    die "Worktree '$target_name' maps to template VM '$TEMPLATE_VM_NAME'. Refusing to delete it."
  fi

  if command -v orb >/dev/null 2>&1; then
    if orb list 2>/dev/null | awk '{print $1}' | grep -qx "$vm_name"; then
      log "Deleting Supabase VM '$vm_name'..."
      orb delete "$vm_name" 2>/dev/null || log "Warning: failed to delete VM '$vm_name'"
    else
      log "No VM '$vm_name' found, skipping VM removal."
    fi
  else
    log "OrbStack CLI not found, skipping VM removal."
  fi

  # Remove git worktree
  log "Removing git worktree '$target_name'..."
  local remove_cmd=("git" "-C" "$MAIN_ROOT" "worktree" "remove")
  if [ "$FORCE" = true ]; then
    remove_cmd+=("--force")
  fi
  remove_cmd+=("$target_dir")

  if "${remove_cmd[@]}" 2>/dev/null; then
    log "Git worktree registration removed."
  else
    log "Git worktree removal returned non-zero (checking folder state)..."
  fi

  # Clean up directory if force was requested and files still remain
  if [ -d "$target_dir" ]; then
    if [ "$FORCE" = true ]; then
      log "Removing leftover files at $target_dir..."
      rm -rf "$target_dir"
    else
      log "Notice: leftover untracked files remain at $target_dir. Use -f/--force to remove them."
    fi
  fi

  # Prune any stale worktree registrations
  git -C "$MAIN_ROOT" worktree prune 2>/dev/null || true

  # Delete branch if requested
  if [ "$DELETE_BRANCH" = true ]; then
    if [ -n "$branch_name" ] && git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$branch_name"; then
      if [ "$FORCE_BRANCH" = true ] || [ "$FORCE" = true ]; then
        log "Force-deleting git branch '$branch_name' (git branch -D)..."
        git -C "$MAIN_ROOT" branch -D "$branch_name" 2>/dev/null || log "Warning: could not force-delete branch '$branch_name'"
      else
        log "Deleting git branch '$branch_name' (git branch -d)..."
        git -C "$MAIN_ROOT" branch -d "$branch_name" 2>/dev/null || log "Branch '$branch_name' is not fully merged. Use -D or --force to delete it."
      fi
    else
      log "No local branch '$branch_name' found to delete."
    fi
  fi

  log "Successfully deleted worktree '$target_name'."
}

if [ "$REMOVE_ALL" = true ]; then
  if [ ! -d "$WORKTREES_DIR" ]; then
    log "No worktrees directory found at '$WORKTREES_DIR'."
    exit 0
  fi

  found=false
  for dir in "$WORKTREES_DIR"/*; do
    [ -e "$dir" ] || continue
    found=true
    w_name="$(basename "$dir")"
    remove_single_worktree "$w_name"
  done

  if [ "$found" = false ]; then
    log "No worktrees found in '$WORKTREES_DIR'."
  fi
else
  remove_single_worktree "$NAME"
fi
