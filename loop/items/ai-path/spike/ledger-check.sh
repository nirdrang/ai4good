#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
db="${SPIKE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:44322/postgres}"
q() { psql "$db" -XAtq -v ON_ERROR_STOP=1 -c "$1"; }

psql "$db" -Xq -v ON_ERROR_STOP=1 -f "$here/ledger.sql"
q "insert into spike.allocations values ('p1', 1000000), ('p2', 300000)"

hold=$(q "select spike.hold('p1', 'openrouter', 250000)")
echo "hold before call: available=$(q "select cap_micros - settled_micros - held_micros from spike.balance where project_id = 'p1'")"

echo "first settle: $(q "select spike.settle('$hold', 'openrouter', 'gen-1', 1234.567, 'provider-reported')")"
echo "replayed settle: $(q "select spike.settle('$hold', 'openrouter', 'gen-1', 1234.567, 'provider-reported')")"
echo "after settle: $(q "select settled_micros || ' settled, ' || held_micros || ' held' from spike.balance where project_id = 'p1'")"

hold2=$(q "select spike.hold('p1', 'anthropic', 250000)")
echo "missing cost settle: $(q "select spike.settle('$hold2', 'anthropic', 'msg-2', null, 'tokens-x-rate')")"
echo "pending hold still counted: $(q "select status from spike.holds where id = '$hold2'") / held=$(q "select held_micros from spike.balance where project_id = 'p1'")"
echo "reconcile: $(q "select spike.reconcile('anthropic', 'msg-2', 9000.5)")"
echo "reconcile replay: $(q "select spike.reconcile('anthropic', 'msg-2', 9000.5)")"
echo "after reconcile: $(q "select settled_micros || ' settled, ' || held_micros || ' held' from spike.balance where project_id = 'p1'")"

echo "short funds: $({ q "select spike.hold('p1', 'managed', 995000)" 2>&1 || true; } | grep -o 'insufficient funds.*' || echo 'NOT REFUSED')"

for i in 1 2; do (q "select pg_sleep(0.2); select spike.hold('p2', 'race', 200000)" >/dev/null 2>&1 && echo ok || echo refused) & done | sort | uniq -c | sed 's/^/parallel holds on 300000: /'
wait
echo "p2 held after race: $(q "select held_micros from spike.balance where project_id = 'p2'")"
