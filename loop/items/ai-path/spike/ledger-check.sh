#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
db="${SPIKE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:44322/postgres}"
q() { psql "$db" -XAtq -v ON_ERROR_STOP=1 -c "$1"; }
bal() { q "select settled_micros || ' settled, ' || held_micros || ' held, ' || overrun_micros || ' overrun' from spike.balance where project_id = '$1'"; }

psql "$db" -Xq -v ON_ERROR_STOP=1 -f "$here/ledger.sql" 2>/dev/null
q "insert into spike.allocations values ('p1', 2000000), ('p2', 300000), ('p3', 100000)"

echo "## one request, a tool loop of three generations"
hold=$(q "select spike.hold('p1', 'openrouter', 1000000)")
echo "hold before call: available=$(q "select cap_micros - settled_micros - held_micros from spike.balance where project_id = 'p1'")"
echo "generation 1 settle: $(q "select spike.settle('$hold', 'openrouter', 'gen-1', 1234.567, 'provider-reported')")"
echo "after generation 1 (hold still covers the rest): $(bal p1)"
echo "generation 2 settle: $(q "select spike.settle('$hold', 'openrouter', 'gen-2', 2000, 'provider-reported')")"
echo "generation 2 replay: $(q "select spike.settle('$hold', 'openrouter', 'gen-2', 2000, 'provider-reported')")"
echo "generation 3 cost missing: $(q "select spike.settle('$hold', 'openrouter', 'gen-3', null, 'provider-reported')")"
echo "request ends: hold becomes $(q "select spike.close('$hold')")"
echo "after close (remainder stays reserved while a cost is pending): $(bal p1)"
echo "reconcile generation 3: $(q "select spike.reconcile('openrouter', 'gen-3', 900.5)")"
echo "reconcile replay: $(q "select spike.reconcile('openrouter', 'gen-3', 900.5)")"
echo "after reconcile (remainder released): $(bal p1) / hold $(q "select status from spike.holds where id = '$hold'")"

echo "## provider rejects before generating"
hold2=$(q "select spike.hold('p1', 'openrouter', 500000)")
echo "request ends with no receipt: hold becomes $(q "select spike.close('$hold2')") / $(bal p1)"

echo "## empty receipt id"
echo "settle with empty id: $({ q "select spike.settle('$hold2', 'openrouter', '', 5, 'provider-reported')" 2>&1 || true; } | grep -o 'violates check constraint' || echo 'ACCEPTED')"

echo "## overrun"
hold3=$(q "select spike.hold('p3', 'anthropic', 50000)")
q "select spike.settle('$hold3', 'anthropic', 'msg-a', 70000, 'tokens-x-rate')" >/dev/null
q "select spike.close('$hold3')" >/dev/null
echo "settled 70000 against a 50000 hold: $(bal p3)"

echo "## short funds"
echo "hold above available: $({ q "select spike.hold('p1', 'managed', 1999000)" 2>&1 || true; } | grep -o 'insufficient funds.*' || echo 'NOT REFUSED')"

echo "## parallel holds, 20 rounds of 5 concurrent 100000 holds against 300000"
bad=0
for round in $(seq 1 20); do
  q "delete from spike.holds where project_id = 'p2'"
  for i in 1 2 3 4 5; do q "select spike.hold('p2', 'race', 100000)" >/dev/null 2>&1 & done
  wait
  n=$(q "select count(*) from spike.holds where project_id = 'p2'")
  [ "$n" = 3 ] || bad=$((bad + 1))
done
echo "rounds where the winners were not exactly 3: $bad"
