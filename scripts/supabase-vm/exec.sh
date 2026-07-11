#!/usr/bin/env bash
# Runs an arbitrary `supabase` subcommand inside this worktree's VM, e.g.:
#   scripts/supabase-vm/exec.sh db reset
#   scripts/supabase-vm/exec.sh gen types typescript --local
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

require_orb

if ! vm_exists || ! vm_running; then
  die "VM '$VM_NAME' is not running. Run 'pnpm supabase:start' first."
fi

touch_activity

args=("$@")
quoted=""
for a in "${args[@]}"; do
  quoted+=" $(printf '%q' "$a")"
done

vm_run "supabase --workdir '$REPO_ROOT'$quoted"
