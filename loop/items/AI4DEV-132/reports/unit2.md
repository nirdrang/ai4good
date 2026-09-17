# Unit 2 report

Commit: `500040588c7a8ff7f2a0bfab22f6db68749d1551`

Branch: `lane/ai4dev-132`. One implementation commit was created. This report was written
after the commit so it can record the final hash; the report itself is uncommitted.

## Files built or changed

- `supabase/migrations/20260921120000_discovery_funded_routing.sql`: `projects.funded_at`
  (null means unfunded). Stub `project_fuel_available_micros` returns zero, `stable`, execute
  revoked from every client role and from `service_role`. `create or replace` of
  `discovery_turn_reserve` with the unit 1 body plus routing: after the stale-context check,
  billing is `fuel` when `funded_at` is set (the project row is already locked). Free keeps
  the unit 1 allowance arithmetic. Fuel uses the stub in place of remaining credits and does
  not call `discovery_allowance`. Below the output floor, fuel raises `P0001 fuel-exhausted`
  with the shared sentence. A fuel reservation stores zero credits and today's UTC date.
  A one-line comment marks where Stripe later adds `project_fuel_reserve`. Execute is
  revoked and re-granted on the replaced reserve so the tenant catalog scan still sees the
  public revoke. Schema reload at the end.
- `supabase/functions/_shared/discovery-metering.ts`: `BillingTarget`, `FuelState`,
  `billingTargetFor`, `fuelRouteAllowed`, `fuelExhaustedReason`. `settlementFor` still
  charges zero credits on fuel.
- `supabase/functions/_shared/write-routes.ts`: `WRITE_REFUSAL_KINDS` gains `fuel-exhausted`.
  The existing 409 mapping from SQL `detail` carries it to HTTP. No change to `admits`,
  `decideDiscoveryMessage`, or prepare.
- `tests/at/suites/req-004/_contract.ts`: `projectFundingAsOperator`.
- `tests/at/suites/req-004/_fixture.ts`: a `funding` map. Null `fundedAt` deletes the entry.
  Reserve routes with the twin, refuses `fuel-exhausted` 409, reserves zero credits and
  skips the allowance debit on fuel. Settle subtracts `actualMicros` from the map on a
  completed fuel turn and does not touch spend. Every turn row carries `billing`.
- `tests/at/suites/req-004/_live.ts`: `setProjectFundingAsOperator` writes `funded_at` when
  `fuelMicros` is zero and throws `CapabilityPending(['checkout.project-fuel'])` when it is
  greater. `projectFundingAsOperator` reads the column and the stub as the operator.
- `tests/at/suites/req-004/_source-pins.ts`: the last `discovery_turn_reserve` definition
  supplies both the email sentence and the `fuel-exhausted` sentence.
- `tests/at/suites/req-004/b-funded-routing.test.ts`: real bodies for 04, 05, 06, 48, 09.
  Loop drives the send route. Integration drives the operator reserve, then 04, 05 and 06
  throw pending on checkout and funded billing, 09 on checkout, and 48 ends.
- `tests/at/expected/req-004.json`: loop greens 04, 05, 06, 48, 09. Integration greens 48;
  04, 05, 06 red on `checkout.project-fuel, billing.funded-turn`; 09 red on
  `checkout.project-fuel`. Nothing else moved.
- `.claude/skills/verify-ai4good/features/discovery-message.md`: one refusal line for
  `fuel-exhausted`.

## Settle definer

`discovery_turn_settle` was not replaced. Its release call is already
`if v_turn.reserved_credits > v_charged`. A fuel turn stores reserved 0 and writes
`charged_credits = least(0, ceil(actual / ratio))`, which is 0, so the release is skipped
and the fuel-touches-no-credits check holds. A failed fuel turn also writes charged 0.

## Deviations

1. The design of record's unit 2 plan said the column, the stub and the SQL branch landed
   in unit 1, so unit 2 would have no migration. Unit 1 left them out. This unit adds the
   migration the brief named.
2. `fuelExhaustedReason()` takes no project id. The base had a `%` placeholder and a long
   dash. The brief forbids both. The sentence is the same in SQL and TypeScript.
3. After `create or replace`, execute is revoked from public and granted to `service_role`
   again. The tenant catalog scan treats a replace as a new definer with no revoke. Without
   those two statements the policy selftest fails `definer-no-revoke`.
4. Integration bodies prove the refusal through `reserveTurnAsOperator`, not the deployed
   send route. The send route's prepare step counts tokens first and answers 502 when the
   provider key is absent, so the SQL refusal would never be seen. This matches the unit 1
   metering bodies. The lead still sees the refusal on the real definer.

## Checks

`bun run typecheck`: exit 0.

```text
=== typecheck: app (tsconfig.json) ===
=== typecheck: acceptance tests (tests/at/tsconfig.json) ===
=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===
typecheck OK: all three projects clean
```

`bun run at:check req-004`: exit 0.

```text
at:check req-004 — 58 P0 in the acceptance file, 58 registered in the suite
RESULT: 58 P0 ids in bijection
```

`bun run at:selftest`: exit 0. 28 files, 417 tests passed.

`bun run at:verify req-004 --tier loop --expect`: exit 0. 58 P0: 10 green, 48 red, matches
the expected file.

`bun run at:verify req-002 --tier loop --expect`: exit 0. 27 P0: 20 green, 7 red, matches
the expected file.

`bun run at:verify req-003 --tier loop --expect`: exit 0. 13 P0: 13 green, 0 red, matches
the expected file.

No integration-tier verify, no live stack, no provider call. The lead runs those.

## Blockers and open questions

None. Integration evidence for the funded refusal on the deployed route still belongs to
the lead when a provider key is present; the operator reserve proves the definer without
one.

The stub always returns zero, so a funded project on the live stack cannot complete a
turn until the Stripe fuel ledger lands. That is the declared pending for 04, 05, 06 and
09.
