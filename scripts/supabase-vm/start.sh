#!/usr/bin/env bash
# Ensures this worktree's dedicated OrbStack VM exists and is running, starts
# Supabase inside it, and writes the resulting credentials to .env.local.
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

log "Reading credentials..."
RAW_ENV_OUTPUT="$(vm_run "supabase status --workdir '$REPO_ROOT' -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --override-name auth.secret_key=SUPABASE_SERVICE_ROLE_KEY \
  --override-name db.url=SUPABASE_DB_URL \
  --override-name studio.url=SUPABASE_STUDIO_URL")" \
  || die "'supabase status' failed inside '$VM_NAME' (see error above)."

# `-o env` always emits every field under its default name too (JWT_SECRET,
# ANON_KEY, FUNCTIONS_URL, ...) — --override-name only adds renamed
# duplicates, it doesn't suppress the rest. Filter down to just the keys
# we actually want in .env.local.
ENV_OUTPUT="$(echo "$RAW_ENV_OUTPUT" | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL|SUPABASE_STUDIO_URL)=')"

# `supabase status` reports 127.0.0.1/localhost because that's correct from
# inside the VM — but every worktree VM binds the same config.toml ports, and
# OrbStack does not forward them to the host's loopback (unlike Docker
# Desktop). The only host-routable address for a given VM's ports is its
# OrbStack domain, so rewrite the host in every emitted URL before this
# reaches .env.local — otherwise pnpm dev (which runs on the host) and
# tooling like `supabase:diff` silently point at whichever VM happens to
# own that port on 127.0.0.1, if any.
ENV_OUTPUT="$(echo "$ENV_OUTPUT" | sed -E "s#(127\.0\.0\.1|localhost)#${VM_NAME}.orb.local#g")"

touch "$ENV_FILE"
while IFS= read -r line; do
  [ -z "$line" ] && continue
  key="${line%%=*}"
  # Drop any existing line for this key, then append the fresh value.
  grep -v -E "^${key}=" "$ENV_FILE" > "$ENV_FILE.tmp" || true
  mv "$ENV_FILE.tmp" "$ENV_FILE"
  echo "$line" >> "$ENV_FILE"
done <<< "$ENV_OUTPUT"

log "Credentials written to $ENV_FILE"
log "VM: $VM_NAME"

start_idle_watcher
