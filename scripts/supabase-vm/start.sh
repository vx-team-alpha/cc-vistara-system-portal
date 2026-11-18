#!/usr/bin/env bash
# Ensures this worktree's dedicated OrbStack VM exists and is running, then
# starts Supabase inside it without modifying project environment files.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"

require_orb

# Tracks whether this VM came from the template. A clone is already fully
# provisioned (Docker, Supabase CLI, warm image cache), so the slow
# create + cloud-init + provision path can be skipped entirely.
CLONED_FROM_TEMPLATE=false

if ! vm_exists; then
  if template_exists; then
    # `orb clone` requires a stopped source machine to avoid data corruption;
    # OrbStack pauses it automatically, but a running template would mean
    # cloning live Postgres state, so stop it first and clone deliberately.
    if [ "$(any_vm_state "$TEMPLATE_VM_NAME")" = "running" ]; then
      log "Stopping template VM '$TEMPLATE_VM_NAME' before cloning..."
      orb stop "$TEMPLATE_VM_NAME" || die "Failed to stop template VM '$TEMPLATE_VM_NAME' before cloning."
    fi

    log "Cloning '$TEMPLATE_VM_NAME' -> '$VM_NAME' (copy-on-write, near-instant)..."
    orb clone "$TEMPLATE_VM_NAME" "$VM_NAME" \
      || die "Failed to clone '$TEMPLATE_VM_NAME' into '$VM_NAME' (see error above)."
    CLONED_FROM_TEMPLATE=true

    log "Starting cloned VM '$VM_NAME'..."
    orb start "$VM_NAME" || die "Failed to start cloned VM '$VM_NAME' (see error above)."
  else
    log "No template VM '$TEMPLATE_VM_NAME' found — falling back to a full build."
    log "Tip: run 'pnpm supabase:template' once to make future worktrees near-instant."
    log "Creating VM '$VM_NAME' (first run for this worktree, this can take a few minutes)..."
    orb create --user "$VM_USER" ubuntu "$VM_NAME" --user-data "$CLOUD_INIT_FILE" \
      || die "Failed to create VM '$VM_NAME' (see error above)."
  fi
elif ! vm_running; then
  log "Starting existing VM '$VM_NAME'..."
  orb start "$VM_NAME" || die "Failed to start VM '$VM_NAME' (see error above)."
fi

log "Waiting for '$VM_NAME' to finish first-boot user setup..."
wait_for_vm_user

# A clone inherits the template's provisioning verbatim, so re-running
# provision.sh would only re-check things that are already true. Skip it —
# that (plus the cached images) is where the time saving comes from.
if [ "$CLONED_FROM_TEMPLATE" = true ]; then
  log "Skipping provisioning (inherited from template '$TEMPLATE_VM_NAME')."
else
  log "Provisioning Docker + Supabase CLI inside '$VM_NAME'..."
  vm_run_root "bash -s -- '$VM_USER'" < "$PROVISION_FILE" \
    || die "Provisioning failed inside '$VM_NAME' (see error above). Fix the issue and re-run 'pnpm supabase:start', or 'pnpm supabase:destroy' to start over."
fi

log "Starting Supabase inside '$VM_NAME'..."
vm_run "supabase start --workdir '$REPO_ROOT'" \
  || die "'supabase start' failed inside '$VM_NAME' (see error above)."

log "Project environment files were left unchanged."
log "VM: $VM_NAME"

start_idle_watcher
