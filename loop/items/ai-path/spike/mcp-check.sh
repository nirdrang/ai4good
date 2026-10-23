#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../.." && pwd)"
db="${SPIKE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:44322/postgres}"
deno="${DENO:-deno}"
key="spike-signing-key-$(date +%s)"
q() { psql "$db" -XAtq -v ON_ERROR_STOP=1 -c "$1"; }
mint() { "$deno" run --quiet --no-config "$here/mint.ts" "$key" "$1" "$2" "$3"; }
url=http://127.0.0.1:9001

"$here/ledger-check.sh" >/dev/null
psql "$db" -Xq -v ON_ERROR_STOP=1 -f "$here/sections.sql" 2>/dev/null
q "insert into spike.sections (project_id, section_id, depends_on) values ('a', 'users', '{}'), ('a', 'stories', '{users}'), ('b', 'secret-plan', '{}')"

stage="$(mktemp -d)"; mkdir -p "$stage/loop/items/ai-path"; cp -r "$here" "$stage/loop/items/ai-path/"
docker rm -f prd-mcp >/dev/null 2>&1 || true
docker run -d --name prd-mcp --network host -v "$stage:/w" -v /root/.ccr/ca-bundle.crt:/ca.crt:ro -e DENO_CERT=/ca.crt \
  -e HTTPS_PROXY -e HTTP_PROXY -e NO_PROXY=127.0.0.1,localhost -e SPIKE_DB_URL="$db" -e SPIKE_MCP_SIGNING_KEY="$key" \
  public.ecr.aws/supabase/edge-runtime:v1.74.2 start --main-service /w/loop/items/ai-path/spike/prd-mcp -p 9001 >/dev/null
until [ "$(curl -s -o /dev/null -w '%{http_code}' -X POST $url -d '{}')" = 401 ]; do sleep 2; done

token="$(mint a chat-1 3600)"
rpc() { curl -s -X POST "$url" -H "authorization: Bearer $1" -H 'content-type: application/json' -d "$2"; }
call() { rpc "$token" "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$1\",\"arguments\":$2}}" | python3 -c 'import json,sys; print(json.loads(json.load(sys.stdin)["result"]["content"][0]["text"]))'; }

echo "## access"
echo "no token: $(curl -s -o /dev/null -w '%{http_code}' -X POST $url -d '{}')"
echo "forged token: $(curl -s -o /dev/null -w '%{http_code}' -X POST $url -H 'authorization: Bearer eyJ4Ijox.AAAA' -d '{}')"
echo "expired token: $(curl -s -o /dev/null -w '%{http_code}' -X POST $url -H "authorization: Bearer $(mint a chat-1 -10)" -d '{}')"
echo "## handshake"
echo "initialize: $(rpc "$token" '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}')"
echo "initialized notification: $(curl -s -o /dev/null -w '%{http_code}' -X POST $url -H "authorization: Bearer $token" -d '{"jsonrpc":"2.0","method":"notifications/initialized"}')"
echo "tools: $(rpc "$token" '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | python3 -c 'import json,sys; print([t["name"] for t in json.load(sys.stdin)["result"]["tools"]])')"
echo "## one turn changes two sections"
echo "list_sections: $(call list_sections '{}')"
echo "stage users: $(call stage_section '{"section":"users","base_revision":0,"body":"Kitchen volunteers and the coordinator.","sources":["msg-1"],"change":""}')"
echo "stage stories: $(call stage_section '{"section":"stories","base_revision":0,"body":"As a coordinator I publish the rota.","sources":["msg-1"],"change":""}')"
echo "visible before commit: $(q "select string_agg(section_id || ' r' || revision, ', ' order by section_id) from spike.sections where project_id = 'a'")"
echo "commit_turn: $(call commit_turn '{}')"
echo "visible after commit: $(q "select string_agg(section_id || ' r' || revision || ' ' || state, ', ' order by section_id) from spike.sections where project_id = 'a'")"
echo "## another chat changes users before the next commit"
q "select spike.write_section('a', 'users', 1, 'Kitchen volunteers, the coordinator and drivers.', '{msg-2}', 'drivers added', 'section-chat')" >/dev/null
echo "stage users from r1: $(call stage_section '{"section":"users","base_revision":1,"body":"Kitchen volunteers only.","sources":["msg-3"],"change":"scope cut"}')"
echo "commit_turn: $(call commit_turn '{}')"
echo "read_section users: $(call read_section '{"section":"users"}')"
echo "stage merged at r2: $(call stage_section '{"section":"users","base_revision":2,"body":"Kitchen volunteers and drivers.","sources":["msg-2","msg-3"],"change":"coordinator removed"}')"
echo "commit_turn: $(call commit_turn '{}')"
echo "## a token for project a cannot see project b"
echo "read_section secret-plan: $(call read_section '{"section":"secret-plan"}')"
docker rm -f prd-mcp >/dev/null
