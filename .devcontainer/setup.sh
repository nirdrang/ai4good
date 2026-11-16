#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v bun >/dev/null; then
  curl -fsSL https://bun.sh/install | bash -s bun-v1.3.14
  sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
  sudo ln -sf "$HOME/.bun/bin/bunx" /usr/local/bin/bunx
fi
bun install --frozen-lockfile

for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 2; done
source .devcontainer/stack-env.sh
bunx supabase start $VIEWER_EXCLUDE --ignore-health-check
bunx supabase stop
