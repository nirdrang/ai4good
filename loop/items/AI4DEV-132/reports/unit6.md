# Unit 6 report

Commit: `2dc30ed26fc780b61d2a46e81332c255b12b0681`

Branch: `lane/ai4dev-132`. One implementation commit was created. This report was written
after the commit so it can record the final hash; the report itself is uncommitted.

## Files built or changed

- `tests/at/suites/req-004/_fixture.ts`: `spendLedgerInvariantProblems` over spend rows and
  the turn map. Open free turns count at `reserved_credits`. Other free turns count at
  `charged_credits`. A settled row with positive `overrun_micros` is a problem. The reserve
  twin always calls `debitAllowance`. `setEmailVerifiedAsOperator(true)` uses the inner
  verification link. `false` clears confirmation.
- `tests/at/suites/req-004/_live.ts`: the same problems from the base SQL as the operator,
  plus settled overruns.
- `tests/at/suites/req-004/f-transparency.test.ts`: AT-004.46. Loop sends three scripted
  turns, attaches a file between the first and second, then opens a reservation, backdates
  it, and lets the next send abandon it. Integration drives completed turns through the
  operator reserve and settle, attaches through `project-need`, and reads
  `discovery-conversation`, then waits on the Discovery surface.
- `tests/at/expected/req-004.json`: loop 46 green; integration 46 red on
  `["ui.discovery-surface"]`. Nothing else moved. No id of this run is `sut-missing`.
- `tests/at/suites/req-002/_fixture.ts` and `tests/at/suites/req-003/_fixture.ts`: pass the
  inner accounts adapter through so the verification link is reachable.

No product change. No SQL change. No new route. Fifty-eight `atTest(` call sites remain.

## Delta reading

Reservation and release. A completed turn contributes a negative delta equal to its
`reservedCredits` and, when unused reservation is returned, a positive delta equal to
`reservedCredits - chargedCredits`. The net remaining drop of that turn is the charged
amount, which the body checks against the allowance read. The abandoned reservation
contributes only its reservation as a negative delta. The later send that marks it
abandoned does not move spend again. The file attach contributes a zero delta. Negative
deltas, made positive and sorted, equal the turn rows' `reservedCredits` sorted.

## Deviations

1. The req-002 and req-003 fixture adapters now return the inner accounts adapter. The
   verification link lives there. Unit 1 already exposed the organisation adapter the same
   way. Without this pass-through the cleanup cannot confirm the inner user.
2. The abandoned reservation is backdated to the Unix epoch. The loop clock starts at
   1 January 2026. A wall-clock timestamp would sit in the future of that clock and keep
   the turn in flight.

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

`bun run at:selftest`: exit 0.

```text
 Test Files  33 passed (33)
      Tests  443 passed (443)
```

`bun run at:verify req-004 --tier loop --expect`: exit 0.

```text
  58 P0: 20 green, 38 red, 0 missing
  EXPECTED: the run matches ...\tests\at\expected\req-004.json exactly (20 declared green, 38 declared red)
```

`bun run at:verify req-004 --tier integration --expect`: exit 0.

```text
  58 P0: 10 green, 48 red, 0 missing
  EXPECTED: the run matches ...\tests\at\expected\req-004.json exactly (10 declared green, 48 declared red)
```

`bun run at:verify req-002 --tier loop --expect`: exit 0.

```text
  27 P0: 20 green, 7 red, 0 missing
  EXPECTED: the run matches ...\tests\at\expected\req-002.json exactly (20 declared green, 7 declared red)
```

## Blockers and open questions

None for this unit.

Integration criterion 46 proves the backend half, then waits on the Discovery surface.
That is the declared red. The lead still owns merge.
