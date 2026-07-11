#!/usr/bin/env bash
# Creates a new git worktree and spins up its own dedicated Supabase VM,
# writing the resulting credentials into that worktree's .env.local.
#
# Usage: scripts/supabase-vm/worktree-add.sh <name> [base-branch]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

require_orb

NAME="${1:-}"
[ -n "$NAME" ] || die "usage: worktree-add.sh <name> [base-branch]"
BASE_BRANCH="${2:-main}"

MAIN_ROOT="$(git -C "$REPO_ROOT" rev-parse --show-toplevel)"
WORKTREES_DIR="$MAIN_ROOT/.worktrees"
TARGET_DIR="$WORKTREES_DIR/$NAME"

# `git rev-parse --git-common-dir` prints a path relative to the directory
# git was run from, so cd into it first and resolve from there — passing it
# to `-C` from the script's own cwd would resolve any relative result wrong.
common_dir_of() { (cd "$1" 2>/dev/null && cd "$(git rev-parse --git-common-dir 2>/dev/null)" 2>/dev/null && pwd -P); }

if [ -e "$TARGET_DIR" ]; then
  # Confirm it's actually a registered worktree of this repo (not some
  # unrelated directory) by asking git from inside it, rather than parsing
  # `worktree list` output whose path formatting isn't reliable in every
  # environment (e.g. `~`-shortened paths from shell/CLI wrappers).
  actual_common_dir="$(common_dir_of "$TARGET_DIR")"
  expected_common_dir="$(common_dir_of "$MAIN_ROOT")"
  [ -n "$actual_common_dir" ] && [ "$actual_common_dir" = "$expected_common_dir" ] \
    || die "'$TARGET_DIR' already exists and is not a registered git worktree of this repo. Remove it manually and retry."
  log "Git worktree '$NAME' already exists at $TARGET_DIR, reusing it (retrying VM setup)..."
else
  mkdir -p "$WORKTREES_DIR"
  log "Creating git worktree '$NAME' at $TARGET_DIR (branch: $NAME, from: $BASE_BRANCH)..."
  if git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$NAME"; then
    git -C "$MAIN_ROOT" worktree add "$TARGET_DIR" "$NAME"
  else
    git -C "$MAIN_ROOT" worktree add -b "$NAME" "$TARGET_DIR" "$BASE_BRANCH"
  fi
fi

log "Starting Supabase VM for worktree '$NAME'..."
(cd "$TARGET_DIR" && "$MAIN_ROOT/scripts/supabase-vm/start.sh") \
  || die "Git worktree '$NAME' was created at $TARGET_DIR, but Supabase VM setup failed (see error above). Fix the issue and re-run 'pnpm worktree:add $NAME' to retry — it will reuse the existing worktree."

log "Worktree ready: $TARGET_DIR"
