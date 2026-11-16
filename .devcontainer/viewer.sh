#!/usr/bin/env bash
{
set -uo pipefail
cd "$(dirname "$0")/.."
source .devcontainer/stack-env.sh

app_port=8080
if [ -n "${CODESPACE_NAME:-}" ]; then
  app_url="https://${CODESPACE_NAME}-${app_port}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
else
  app_url="http://127.0.0.1:${app_port}"
fi
seed_password="${VIEWER_NGO_PASSWORD:-viewer-kitchen-2026}"

branch="$(git rev-parse --abbrev-ref HEAD)"
echo "viewer: start on $branch at $(date -u +%T)"
git fetch --quiet origin "$branch" && git merge --quiet --ff-only FETCH_HEAD
bun install --frozen-lockfile

echo "viewer: waiting for docker"
for _ in $(seq 1 90); do docker info >/dev/null 2>&1 && break; sleep 2; done

if [ -n "${DISCOVERY_API_KEY:-}" ] || [ ! -f supabase/functions/.env ]; then
case "${DISCOVERY_BASE_URL:-}" in https://api.openai.com/*) provider=openai-responses ;; *) provider=openai-compatible ;; esac
{
  printf 'DISCOVERY_PROVIDER=%s\n' "${DISCOVERY_PROVIDER:-$provider}"
  printf 'DISCOVERY_MODEL=%s\n' "${DISCOVERY_MODEL:-deepseek-v4.1-flash}"
  printf 'DISCOVERY_BASE_URL=%s\n' "${DISCOVERY_BASE_URL:-https://opencode.ai/zen/go/v1}"
  printf 'DISCOVERY_REASONING_EFFORT=%s\n' "${DISCOVERY_REASONING_EFFORT:-low}"
  for name in DISCOVERY_API_KEY ANTHROPIC_API_KEY; do
    if [ -n "${!name:-}" ]; then printf '%s=%s\n' "$name" "${!name}"; fi
  done
} > supabase/functions/.env
fi

echo "viewer: restarting the stack"
bunx supabase stop
bunx supabase start $VIEWER_EXCLUDE --ignore-health-check
eval "$(bunx supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"

echo "viewer: seeding"
for _ in $(seq 1 30); do
  SUPABASE_URL="$API_URL" SUPABASE_ANON_KEY="$ANON_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
    PREVIEW_NGO_EMAIL=preview-ngo@ai4good.example PREVIEW_NGO_PASSWORD="$seed_password" \
    bun scripts/preview-seed.ts > /tmp/viewer-seed.txt && break
  echo "seed failed; retrying"
  sleep 4
done

run_app() {
  while true; do
    VITE_SUPABASE_URL="$app_url" VITE_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY" VIEWER_SUPABASE_PROXY="$API_URL" \
      __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=".${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}" \
      bunx vite dev --host 127.0.0.1 --port "$app_port" --strictPort
    sleep 2
  done
}
echo "viewer: starting the app"
run_app > /tmp/viewer-app.log 2>&1 &

while true; do
  sleep 10
  git fetch --quiet origin "$branch" || continue
  before="$(git rev-parse HEAD)"
  [ "$before" = "$(git rev-parse FETCH_HEAD)" ] && continue
  if ! git merge --quiet --ff-only FETCH_HEAD; then
    echo "branch $branch moved by a non-fast-forward push; not following it"
    continue
  fi
  changed="$(git diff --name-only "$before" HEAD)"
  if grep -q '^bun.lock$\|^package.json$' <<<"$changed"; then
    bun install --frozen-lockfile && pkill -f "vite dev" || true
  fi
  if grep -q '^supabase/migrations/' <<<"$changed"; then
    bunx supabase migration up --local || echo "migration up failed"
  fi
  if grep -q '^supabase/config.toml$' <<<"$changed"; then
    bunx supabase stop && bunx supabase start $VIEWER_EXCLUDE --ignore-health-check
  fi
done
exit
}
