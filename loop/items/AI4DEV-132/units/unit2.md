# Unit 2: funded projects route to fuel and never the free pool

You are the writer for unit 2 of the credits engine run. You work in this worktree on branch
`lane/ai4dev-132`, whose head is the unit 1 gate commit `592261d`. You may edit, create and run
anything under it. Use PowerShell syntax if you shell out; you are on Windows. Never use Bash
syntax.

## Read first, in this order

1. `loop/items/AI4DEV-132/design/SYNTHESIS.md`. The design of record. It wins over everything.
   Read the "Funding seam" bullet, the "Per-unit plan and lanes" row for unit 2, and the
   "The funding seam" paragraph near the end.
2. `loop/items/AI4DEV-132/design/candidate-4-reserve-settle.md`. The base. Read "Unit 2, funded
   routing" (the AT-004.48 body and the four sentences after it), the `discovery_turns` SQL
   (`funded_at`, `project_fuel_available_micros`), the reserve order steps 7, 9, 10 and 11, the
   settle paragraph, the `discovery-metering.ts` signatures (`BillingTarget`, `FuelState`,
   `billingTargetFor`, `fuelRouteAllowed`, `fuelExhaustedReason`), and the `_fixture.ts` and
   `_pending.ts` paragraphs.
3. `.taskmaster/docs/acceptance/at-req-004.md`, criteria 04, 05, 06, 09 and 48. The test bodies
   assert what the criteria say, and nothing they do not say.
4. `loop/items/AI4DEV-132/reports/unit1.md` and `reports/unit1-fix.md`. What unit 1 built and
   where it deviated.
5. `supabase/migrations/20260920120000_discovery_turns.sql` in full. You replace
   `discovery_turn_reserve` with `create or replace` in a new migration; the table, its checks
   and the other definers stay.
6. `supabase/functions/_shared/discovery-metering.ts`, `discovery-turn.ts`, `discovery-reads.ts`,
   `write-routes.ts` (`WRITE_REFUSAL_KINDS` and how a SQL `detail` becomes an HTTP kind and
   status), `edge.ts` (`writeRoute`, the prepare and settle steps).
7. `tests/at/suites/req-004/` in full: `_contract.ts`, `_fixture.ts` (the reserve twin, the
   settle twin, the `later` placeholders), `_live.ts`, `_pending.ts`, `_source-pins.ts`,
   `a-metering.test.ts` (the shape your bodies copy), `b-funded-routing.test.ts` (the five
   `notYet` registrations you replace).
8. `tests/at/expected/req-004.json` and `tests/at/harness/expected.ts`.
9. `tests/at/suites/req-002/_source-absences.ts` (the wallet scan: a project-named table with a
   `state` or `status` column fails it; a timestamp column does not) and
   `tests/at/suites/req-001/_policy-scan.ts` (`TENANT_CATALOG`; `projects` is already listed).

## What you build

1. **Migration** `supabase/migrations/20260921120000_discovery_funded_routing.sql`:
   - `alter table public.projects add column funded_at timestamptz;` Null means unfunded. No
     default, no index, no other column.
   - `create function public.project_fuel_available_micros(p_project_id uuid) returns bigint`
     that returns `0`. Plain SQL or plpgsql, `stable`, and a one-line comment saying it is the
     fuel seam the Stripe top-up requirement replaces. Revoke execute from `public`, `anon`,
     `authenticated` and `service_role`; the reserve definer is its only caller.
   - `create or replace function public.discovery_turn_reserve(...)` with the same signature
     and the same body as unit 1 plus routing, in the base's order:
     - after the stale-context check, `v_billing := case when (select funded_at from
       public.projects where id = p_project_id) is null then 'free' else 'fuel' end`. The
       project row is already read earlier in the body for the need check; reuse that read if
       one exists, and add `funded_at` to it.
     - the bound: free keeps the unit 1 arithmetic over `v_read->>'remaining'`. Fuel uses
       `v_fuel := public.project_fuel_available_micros(p_project_id)` in place of
       `remaining * micros_per_credit`, and does not call `discovery_allowance` at all, not
       for the read and not for the debit.
     - below the floor on fuel: `raise exception '<sentence>' using errcode = 'P0001',
       detail = 'fuel-exhausted'`. The sentence is exactly the string
       `fuelExhaustedReason()` returns (item 2). No `%` placeholder, no project id in it. It
       must contain the words `top up project fuel` and say that free credits are never spent
       on a funded project. No long dash character in it.
     - the reservation on fuel: `v_reserved_micros` as for free, `v_reserved_credits := 0`,
       `utc_day` from `(clock_timestamp() at time zone 'utc')::date`, and the row inserts
       `billing = v_billing`. Leave a one-line comment at the point where the Stripe run adds
       `project_fuel_reserve`, as the base marks it.
   - `discovery_turn_settle` needs no new body if its release call is already guarded by
     `reserved_credits - charged > 0`. Read it. If a fuel turn (reserved 0, charged 0) would
     reach `discovery_spend_release` with zero or would write a nonzero `charged_credits`,
     replace the settle in the same migration with the smallest guard. Say in the report which
     of the two you found.
   - `notify pgrst, 'reload schema'` at the end.
2. **`_shared/discovery-metering.ts`** gains the base's pure twin: `BillingTarget`, `FuelState`,
   `billingTargetFor(project: { id; fundedAt })`, `fuelRouteAllowed(target, fuel, reservedMicros)`
   returning `{ ok: true }` or `{ ok: false, kind: 'fuel-exhausted', reason }`, and
   `fuelExhaustedReason()` returning the one sentence. `settlementFor` already charges zero
   credits on fuel; keep it.
3. **`write-routes.ts`**: `WRITE_REFUSAL_KINDS` gains `fuel-exhausted`. The route answers 409
   `{ kind: 'fuel-exhausted', reason }` with the SQL sentence, the same way `turn-in-flight`
   reaches HTTP. No change to `admits`, to `decideDiscoveryMessage`, or to the prepare step.
4. **`_source-pins.ts`**: `sendSentencePinProblems()` also extracts the `fuel-exhausted` raise
   from the last `discovery_turn_reserve` definition across the migrations (the new file holds
   it now) and compares it with `fuelExhaustedReason()`. The `email-unverified` comparison keeps
   working against the replaced definition.
5. **The suite contract**: `_contract.ts` gains one read,
   `projectFundingAsOperator(projectId): Promise<{ fundedAt: string | null; fuelMicros: number }>`.
   At loop it reads the fixture's `funding` map. At integration it reads `projects.funded_at`
   and `select public.project_fuel_available_micros(...)` as the operator, so `fuelMicros` is
   the stub's answer, zero. AT-004.05 uses it for the fuel ledger delta.
6. **`_fixture.ts`**: `funding: Map<projectId, { fundedAt: string | null; fuelMicros: number }>`.
   `setProjectFundingAsOperator` writes the map (a null `fundedAt` deletes the entry). The
   reserve twin routes with `billingTargetFor` and the map, checks `fuelRouteAllowed` against
   `reservedMicros` and refuses `fuel-exhausted` 409 with the shipped reason, reserves zero
   credits and skips the allowance debit on fuel. The settle twin subtracts `actualMicros`
   from the map's `fuelMicros` on a completed fuel turn and touches no spend row. Every turn
   row the fixture builds carries `billing`.
7. **`_live.ts`**: `setProjectFundingAsOperator` sets `projects.funded_at` through the operator
   seam when `fuelMicros === 0`, and throws `new CapabilityPending([AWAITED.projectFuelCheckout])`
   when `fuelMicros > 0`, because there is nowhere to put fuel yet. `projectFundingAsOperator`
   as item 5.
8. **`b-funded-routing.test.ts`**: real bodies for 04, 05, 06, 48 and 09, in the shape of
   `a-metering.test.ts`. The base's AT-004.48 body is the template. AT-004.05 funds project A
   with `fuelMicros: 5_000_000` at loop, sends on A and on B, asserts A's turn has
   `billing: 'fuel'` and `reservedCredits: 0`, A's `fuelMicros` dropped by `actualMicros`, and
   the allowance dropped only by B's charge. AT-004.06 sends one free turn, funds
   mid-conversation with fuel, and asserts the next two turns are `billing: 'fuel'`. AT-004.09
   compares `requestSettings` on a free turn and a funded turn field by field, and reads the
   allowance before and after funding. AT-004.48 funds with `fuelMicros: 0`, asserts the send is
   refused `fuel-exhausted` 409 with a reason matching `/top up project fuel/i`, no turn row for
   the project, and the allowance unchanged. At integration every id first proves what it can
   with `fuelMicros: 0` (the refusal, the untouched allowance, the absent row), then `04`, `05`
   and `06` end in `throw new CapabilityPending([AWAITED.projectFuelCheckout,
   AWAITED.fundedTurnBilling])`, `09` in `throw new CapabilityPending([AWAITED.projectFuelCheckout])`,
   and `48` ends green. No `10` or `30` in a body; read the grants from `h.config`.
9. **`tests/at/expected/req-004.json`**: loop `04, 05, 06, 48, 09` green; integration `48`
   green, `04, 05, 06` red `capability-pending` on `["checkout.project-fuel",
   "billing.funded-turn"]`, `09` red on `["checkout.project-fuel"]`. Nothing else moves.
10. **`.claude/skills/verify-ai4good/features/discovery-message.md`**: one line under the
    refusals for `fuel-exhausted`, in the file's style.

## Must-nots

- `discovery_allowance` is never called for a fuel turn. No fuel ledger table, no fuel column
  on `discovery_turns` or `discovery_spend`, no foreign key to anything named fuel or stripe.
- Do not change `discovery_allowance`, its sentences, or the `discovery-allowance` route.
- No column named `state` or `status` on `projects`. The seam is the timestamp.
- The stub returns zero. Do not read a balance from anywhere.
- No `Deno`, `npm:` or `fetch` in any `_shared` file except `anthropic-messages.ts`, `edge.ts`
  and `notification-provider.ts`.
- No `10` or `30` in a test body. No key in any file. No comment that narrates a step.
- Exactly fifty-eight `atTest(` call sites stay in `tests/at/suites/req-004/`.
- Do not touch `loop/items/` except to write your report.

## Checks you run

From this worktree: `bun run typecheck`, `bun run at:check req-004`, `bun run at:selftest`,
`bun run at:verify req-004 --tier loop --expect`, `bun run at:verify req-002 --tier loop --expect`,
`bun run at:verify req-003 --tier loop --expect`. Your sandbox can run vitest (measured on the
unit 1 fix). Run them until green. The lead runs the integration tier.

## Commit

One commit on `lane/ai4dev-132` when the six checks are green. Message:

```
AI4DEV-132: unit 2, funded projects route to fuel and never the free pool

<four to eight lines in plain sentences: the column, the stub, the routing in
reserve, the refusal kind, the pure twin, the fixture fuel map, the five bodies
and their tier results.>
```

No other item id anywhere in the message.

## Report

Write `loop/items/AI4DEV-132/reports/unit2.md`: what you built by file, every deviation from
SYNTHESIS or the base with its reason, what you found in the settle definer, the output of the
six checks (exit code and last lines), the commit hash, and open questions. Then reply with
five lines: the commit hash, the check results, deviations (count and one line each),
blockers, and the report path.
