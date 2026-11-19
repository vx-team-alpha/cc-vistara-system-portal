#!/usr/bin/env bash
# Lists all git worktrees in this project along with their branch and Supabase VM status.
#
# Usage:
#   scripts/supabase-vm/worktree-list.sh
#   pnpm worktree:list
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

MAIN_ROOT="$(git -C "$REPO_ROOT" rev-parse --show-toplevel)"
WORKTREES_DIR="$MAIN_ROOT/.worktrees"

log "Git worktrees for cc-frontage-design:"
echo ""

has_orb=false
if command -v orb >/dev/null 2>&1; then
  has_orb=true
fi

# Parse porcelain output from git worktree list
current_worktree=""
current_head=""
current_branch=""
is_bare=false
count=0

print_worktree() {
  [ -n "$current_worktree" ] || return 0
  count=$((count + 1))

  local branch_display="${current_branch:-detached HEAD}"
  local short_head="${current_head:0:7}"
  local type_label="Worktree"
  if [ "$current_worktree" = "$MAIN_ROOT" ]; then
    type_label="Main checkout"
  fi

  local vm_status="n/a"
  if [ "$has_orb" = true ]; then
    local slug="$(basename "$current_worktree" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed -E 's/-+/-/g; s/^-|-$//g')"
    local vm_name="sb-$slug"
    local state="$(orb list 2>/dev/null | awk -v n="$vm_name" '$1 == n {print $2}')"
    if [ -n "$state" ]; then
      vm_status="$vm_name ($state)"
    else
      vm_status="$vm_name (not created)"
    fi
  fi

  printf "  • \033[1m%-20s\033[0m [%s] (%s)\n" "$branch_display" "$short_head" "$type_label"
  printf "    Path: %s\n" "$current_worktree"
  if [ "$has_orb" = true ]; then
    printf "    VM:   %s\n" "$vm_status"
  fi
  echo ""
}

while IFS= read -r line || [ -n "$line" ]; do
  if [ -z "$line" ]; then
    print_worktree
    current_worktree=""
    current_head=""
    current_branch=""
    is_bare=false
    continue
  fi

  key="${line%% *}"
  val="${line#* }"

  case "$key" in
    worktree)
      current_worktree="$val"
      ;;
    HEAD)
      current_head="$val"
      ;;
    branch)
      current_branch="${val#refs/heads/}"
      ;;
    bare)
      is_bare=true
      ;;
  esac
done < <(git -C "$MAIN_ROOT" worktree list --porcelain)

print_worktree

if [ "$count" -le 1 ]; then
  echo "No additional worktrees found."
  echo "To create a worktree: pnpm worktree:add <name> [base-branch]"
else
  echo "Total worktrees: $count"
  echo "To delete a worktree: pnpm worktree:delete <name> [--delete-branch]"
fi
