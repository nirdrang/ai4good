#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
db="${SPIKE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:44322/postgres}"
q() { psql "$db" -XAtq -v ON_ERROR_STOP=1 -c "$1"; }
show() { q "select section_id || ' r' || revision || ' ' || state || coalesce(' / ' || changed_since_confirmed, '') from spike.sections where project_id = 'p' order by section_id"; }

q "drop table if exists spike.section_writes, spike.sections cascade; drop function if exists spike.write_section" 2>/dev/null
psql "$db" -Xq -v ON_ERROR_STOP=1 -f "$here/sections.sql"
q "insert into spike.sections (project_id, section_id, depends_on) values ('p', 'data-handling', '{}'), ('p', 'users', '{}'), ('p', 'stories', '{users}')"

echo "## one reply updates two sections in a row"
echo "write users at r0: $(q "select spike.write_section('p', 'users', 0, 'Kitchen volunteers and the coordinator.', '{msg-12}', '', 'main-chat')")"
echo "write stories at r0: $(q "select spike.write_section('p', 'stories', 0, 'As a coordinator I publish the rota.', '{msg-12}', '', 'main-chat')")"
show

echo "## the developer confirms both, then a later answer changes users"
q "update spike.sections set state = 'confirmed', confirmed_body = body where project_id = 'p' and section_id in ('users', 'stories')"
echo "write users at r1: $(q "select spike.write_section('p', 'users', 1, 'Kitchen volunteers, the coordinator and drivers.', '{msg-31}', 'drivers added as users', 'main-chat')")"
show

echo "## a section chat writes with the revision it read before that change"
echo "write users at r1 again: $(q "select spike.write_section('p', 'users', 1, 'Kitchen volunteers only.', '{msg-33}', 'scope cut', 'section-chat')")"

echo "## 5 chats write the same section at once from r0, 20 rounds"
bad=0
for round in $(seq 1 20); do
  q "update spike.sections set revision = 0, body = '', state = 'open' where project_id = 'p' and section_id = 'data-handling'; delete from spike.section_writes where section_id = 'data-handling'"
  for i in 1 2 3 4 5; do q "select spike.write_section('p', 'data-handling', 0, 'version $i', '{msg}', '', 'chat-$i')" >/dev/null & done
  wait
  n=$(q "select count(*) from spike.section_writes where project_id = 'p' and section_id = 'data-handling'")
  [ "$n" = 1 ] || bad=$((bad + 1))
done
echo "rounds where more or fewer than one write landed: $bad"
echo "## history kept for every landed write"
q "select section_id || ' r' || revision || ' by ' || written_by || ' from ' || array_to_string(sources, ',') from spike.section_writes where project_id = 'p' and section_id <> 'data-handling' order by section_id, revision"
