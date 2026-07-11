#!/usr/bin/env bash
# Runs as root inside the VM (via `orb -u root`) once it's reachable. Installs
# the Supabase CLI and grants the VM's default user docker access. Idempotent
# — safe to re-run on every `supabase:start`.
set -euo pipefail

VM_USER="${1:?usage: provision.sh <vm-user>}"

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

usermod -aG docker "$VM_USER"

if ! command -v supabase >/dev/null 2>&1; then
  latest_url="$(curl -fsSL https://api.github.com/repos/supabase/cli/releases/latest \
    | grep -o 'https://[^"]*_linux_amd64\.deb' | head -1)"
  [ -n "$latest_url" ] || { echo "provision.sh: could not resolve Supabase CLI download URL" >&2; exit 1; }
  curl -fsSL -o /tmp/supabase.deb "$latest_url"
  dpkg -i /tmp/supabase.deb || apt-get install -f -y
  rm -f /tmp/supabase.deb
fi
