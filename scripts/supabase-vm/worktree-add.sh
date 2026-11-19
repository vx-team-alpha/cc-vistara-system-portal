#!/usr/bin/env bash
# Creates a new git worktree and spins up its own dedicated Supabase VM
# without modifying that worktree's project environment files.
#
# Usage:
#   scripts/supabase-vm/worktree-add.sh <name> [base-branch] [options]
#   pnpm worktree:add <name> [base-branch] [options]
#
# Options:
#   --no-vm              Create git worktree only, skip starting Supabase VM
#   --base <branch>      Specify base branch (default: current branch or main)
#   -h, --help           Show this help message
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

MAIN_ROOT="$(git -C "$REPO_ROOT" rev-parse --show-toplevel)"
WORKTREES_DIR="$MAIN_ROOT/.worktrees"

NAME=""
BASE_BRANCH=""
START_VM=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      echo "Usage: pnpm worktree:add <name> [base-branch] [options]"
      echo ""
      echo "Options:"
      echo "  --no-vm          Create git worktree only; skip starting Supabase VM"
      echo "  --base <branch>  Specify base branch (defaults to main)"
      echo "  -h, --help       Show this help message"
      exit 0
      ;;
    --no-vm)
      START_VM=false
      shift
      ;;
    --base)
      BASE_BRANCH="$2"
      shift 2
      ;;
    -*)
      die "Unknown option '$1'. Use --help for usage."
      ;;
    *)
      if [ -z "$NAME" ]; then
        NAME="$1"
      elif [ -z "$BASE_BRANCH" ]; then
        BASE_BRANCH="$1"
      else
        die "Unexpected argument '$1'. Use --help for usage."
      fi
      shift
      ;;
  esac
done

if [ -z "$NAME" ]; then
  echo "Usage: pnpm worktree:add <name> [base-branch] [options]" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  --no-vm          Create git worktree only; skip starting Supabase VM" >&2
  echo "  --base <branch>  Specify base branch (defaults to current branch or main)" >&2
  echo "  -h, --help       Show this help message" >&2
  exit 1
fi

# Fallback default base branch
if [ -z "$BASE_BRANCH" ]; then
  BASE_BRANCH="$(git -C "$MAIN_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")"
  if [ "$BASE_BRANCH" = "HEAD" ]; then
    BASE_BRANCH="main"
  fi
fi

TARGET_DIR="$WORKTREES_DIR/$NAME"

common_dir_of() { (cd "$1" 2>/dev/null && cd "$(git rev-parse --git-common-dir 2>/dev/null)" 2>/dev/null && pwd -P); }

if [ -e "$TARGET_DIR" ]; then
  actual_common_dir="$(common_dir_of "$TARGET_DIR")"
  expected_common_dir="$(common_dir_of "$MAIN_ROOT")"
  [ -n "$actual_common_dir" ] && [ "$actual_common_dir" = "$expected_common_dir" ] \
    || die "'$TARGET_DIR' already exists and is not a registered git worktree of this repo. Remove it manually and retry."
  log "Git worktree '$NAME' already exists at $TARGET_DIR, reusing it..."
else
  mkdir -p "$WORKTREES_DIR"
  log "Creating git worktree '$NAME' at $TARGET_DIR (branch: $NAME, from: $BASE_BRANCH)..."
  if git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$NAME"; then
    git -C "$MAIN_ROOT" worktree add "$TARGET_DIR" "$NAME"
  else
    git -C "$MAIN_ROOT" worktree add -b "$NAME" "$TARGET_DIR" "$BASE_BRANCH"
  fi
fi

# Copy .env.local if present in main checkout and not present in worktree
if [ -f "$MAIN_ROOT/.env.local" ] && [ ! -f "$TARGET_DIR/.env.local" ]; then
  log "Copying .env.local to $TARGET_DIR/.env.local..."
  cp "$MAIN_ROOT/.env.local" "$TARGET_DIR/.env.local"
fi

if [ "$START_VM" = true ]; then
  if command -v orb >/dev/null 2>&1; then
    log "Starting Supabase VM for worktree '$NAME'..."
    (cd "$TARGET_DIR" && "$MAIN_ROOT/scripts/supabase-vm/start.sh") \
      || log "Warning: Supabase VM setup failed. You can retry with 'pnpm supabase:start' inside $TARGET_DIR."
  else
    log "OrbStack CLI not found. Worktree created without local Supabase VM."
    log "To use isolated Supabase VMs, install OrbStack: https://orbstack.dev"
  fi
else
  log "Skipping Supabase VM startup (--no-vm)."
fi

echo ""
log "Worktree ready: $TARGET_DIR"
echo ""
echo "To switch to this worktree:"
echo "  cd .worktrees/$NAME"
echo ""
echo "To delete this worktree when done:"
echo "  pnpm worktree:delete $NAME"
echo "  # or delete along with its local branch:"
echo "  pnpm worktree:delete $NAME --delete-branch"
