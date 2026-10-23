#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../.." && pwd)"
db="${SPIKE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:44322/postgres}"
stage="$(mktemp -d)"
mkdir -p "$stage/loop/items/ai-path" "$stage/supabase/functions/_shared"
cp -r "$here" "$stage/loop/items/ai-path/"
cp "$root/supabase/functions/_shared/discovery-stream.ts" "$stage/supabase/functions/_shared/"

docker rm -f spike-ai >/dev/null 2>&1 || true
docker run -d --name spike-ai --network host -v "$stage:/w" -v /root/.ccr/ca-bundle.crt:/ca.crt:ro \
  -e DENO_CERT=/ca.crt -e HTTPS_PROXY -e HTTP_PROXY -e NO_PROXY=127.0.0.1,localhost -e SPIKE_DB_URL="$db" \
  -e SPIKE_ANTHROPIC_PROJECT_KEY=sk-ant-api03-PLACEHOLDER0000000000000000000000000000000000000 \
  -e SPIKE_OPENROUTER_PROJECT_KEY=sk-or-v1-PLACEHOLDER000000000000000000000000000000000000000000000000000 \
  -e SPIKE_MANAGED_AGENT_ID=agent_placeholder -e SPIKE_MANAGED_ENVIRONMENT_ID=env_placeholder \
  -e SPIKE_GITHUB_REPO=placeholder/none -e SPIKE_GITHUB_TOKEN=ghp_PLACEHOLDER0000 \
  public.ecr.aws/supabase/edge-runtime:v1.74.2 start --main-service /w/loop/items/ai-path/spike/spike-ai -p 9000 >/dev/null
until [ "$(curl -s -o /dev/null -w '%{http_code}' -X POST 127.0.0.1:9000 -d '{"path":"none"}')" = 400 ]; do sleep 2; done

psql "$db" -XAtq -c "insert into spike.allocations values ('spike-anthropic', 5000000), ('spike-openrouter', 5000000), ('spike-managed', 5000000) on conflict do nothing"
echo "# Each path called once in the edge runtime with placeholder keys."
for path in anthropic openrouter managed; do
  out="$(curl -s -N -X POST 127.0.0.1:9000 -H 'accept: text/event-stream' -d "{\"path\":\"$path\",\"prompt\":\"hi\",\"project\":\"spike-$path\"}")"
  echo "== $path"
  printf '%s\n' "$out" | grep -v '^$'
  echo "placeholder occurrences in browser bytes: $(printf '%s' "$out" | grep -c PLACEHOLDER || true)"
  echo "hold after the request: $(psql "$db" -XAtq -c "select status from spike.holds where project_id = 'spike-$path' order by opened_at desc limit 1")"
done
echo "== provider errors in the server log, not sent to the browser"
docker logs spike-ai 2>&1 | grep -o -E '(invalid x-api-key|User not found|Missing Authentication header|No auth credentials found)' || true
docker rm -f spike-ai >/dev/null
