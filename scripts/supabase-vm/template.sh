#!/usr/bin/env bash
# Build (or rebuild) the shared template VM that per-worktree VMs are cloned
# from. Run once per machine; after that every `pnpm worktree:add` clones this
# instead of re-installing Docker, re-downloading the Supabase CLI, and
# re-pulling ~9GB of container images.
#
# The template is left STOPPED with no running containers and no project
# state — only the warm Docker image cache, Docker itself, and the Supabase
# CLI. Cloning a stopped machine is what keeps `orb clone` instant and
# consistent (OrbStack pauses the source while snapshotting).
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

require_orb

FORCE="${1:-}"

if template_exists; then
  if [ "$FORCE" != "--force" ]; then
    log "Template VM '$TEMPLATE_VM_NAME' already exists."
    log "Re-run with '--force' to rebuild it (needed after Supabase image or CLI version bumps)."
    exit 0
  fi
  log "Rebuilding template VM '$TEMPLATE_VM_NAME' (--force)..."
  orb delete --force "$TEMPLATE_VM_NAME" \
    || die "Failed to delete existing template VM '$TEMPLATE_VM_NAME'."
fi

log "Creating template VM '$TEMPLATE_VM_NAME' (one-time, this takes a few minutes)..."
orb create --user "$VM_USER" ubuntu "$TEMPLATE_VM_NAME" --user-data "$CLOUD_INIT_FILE" \
  || die "Failed to create template VM '$TEMPLATE_VM_NAME' (see error above)."

# Reuse the same wait/provision helpers the per-worktree path uses, but
# targeted at the template. VM_NAME is what vm_run*/wait_for_vm_user act on,
# so point it at the template for the rest of this script.
VM_NAME="$TEMPLATE_VM_NAME"

log "Waiting for '$TEMPLATE_VM_NAME' to finish first-boot user setup..."
wait_for_vm_user

log "Provisioning Docker + Supabase CLI inside '$TEMPLATE_VM_NAME'..."
vm_run_root "bash -s -- '$VM_USER'" < "$PROVISION_FILE" \
  || die "Provisioning failed inside '$TEMPLATE_VM_NAME' (see error above). Fix the issue and re-run with '--force'."

# Warm the image cache by actually starting Supabase once against this
# checkout's config.toml (which pins the image versions), then stop it. The
# pull is the slow part we're caching; the containers themselves are
# disposable and must not survive into the clones.
log "Pulling Supabase images (the slow part — cached for every future worktree)..."
vm_run "supabase start --workdir '$REPO_ROOT'" \
  || die "'supabase start' failed inside '$TEMPLATE_VM_NAME' (see error above)."

log "Stopping Supabase to leave a clean template..."
# --no-backup discards the local DB volume so clones start from a fresh
# `supabase start` (migrations + seed) rather than inheriting this checkout's
# data. Older CLIs don't support the flag, so fall back to a plain stop.
vm_run "supabase stop --workdir '$REPO_ROOT' --no-backup" \
  || vm_run "supabase stop --workdir '$REPO_ROOT'" \
  || die "'supabase stop' failed inside '$TEMPLATE_VM_NAME' (see error above)."

CACHED_IMAGES="$(vm_run 'docker images -q | wc -l' 2>/dev/null | tr -d '[:space:]' || echo '?')"
CLI_VERSION="$(vm_run 'supabase --version' 2>/dev/null | tr -d '[:space:]' || echo '?')"

log "Stopping template VM (clones must be made from a stopped machine)..."
orb stop "$TEMPLATE_VM_NAME" || die "Failed to stop template VM '$TEMPLATE_VM_NAME'."

log "Template ready: $TEMPLATE_VM_NAME (Supabase CLI $CLI_VERSION, $CACHED_IMAGES cached images)"
log "New worktrees will now clone this instead of re-downloading images."
log "Rebuild after Supabase image/CLI upgrades with: pnpm supabase:template-refresh"
