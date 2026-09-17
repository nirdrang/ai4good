# Unit 3: zero-credit remedies by tier

You are the writer for unit 3 of the credits engine run. You work in this worktree on branch
`lane/ai4dev-132`, whose head is the unit 2 closure commit `4a741b1`. You may edit, create and
run anything under it. Use PowerShell syntax if you shell out; you are on Windows. Never use
Bash syntax.

This unit is small. The refusal sentence already exists in SQL and in TypeScript, and the
reserve definer raises it through `discovery_allowance`. You write two test bodies and move
two lines of the expected file. Expect no product change. If you find that one is needed,
stop, write the report with the reason, and reply; do not make it.

## Read first, in this order

1. `loop/items/AI4DEV-132/design/candidate-4-reserve-settle.md`, section "Unit 3, zero-credit
   remedies" (the AT-004.03a body and the sentence after it) and the paragraph that starts
   "**Unit 3, zero-credit remedies.**" near the end.
2. `.taskmaster/docs/acceptance/at-req-004.md`, criteria 03a and 03b.
3. `supabase/migrations/20260916120000_discovery_allowance.sql` lines 170 to 190 (the two
   tier sentences) and `supabase/functions/_shared/discovery-allowance.ts` lines 45 to 60.
4. `tests/at/suites/req-002/b-allowance.test.ts` and `tests/at/suites/req-002/_source-pins.ts`
   (how the earlier requirement asserts the same sentence; copy its reading of the remedies
   rather than inventing a new one, if it has one).
5. `tests/at/suites/req-004/_fixture.ts` and `_live.ts` (`drainAllowance`,
   `vetOrganizationAsAdmin`, `provisionPlatformAdmin`, `reserveTurnAsOperator`),
   `a-metering.test.ts` (AT-004.49 drains the allowance already; copy its shape),
   `b-funded-routing.test.ts` (the `Open` and `Drive` helpers and the operator drive at
   integration), `c-remedies.test.ts` (the two `notYet` registrations you replace),
   `_pending.ts`.
6. `tests/at/expected/req-004.json`.

## What you build

1. **`c-remedies.test.ts`**: real bodies for AT-004.03a and AT-004.03b in the shape of
   `b-funded-routing.test.ts`. A `remediesOf(reason)` helper local to the file splits the
   sentence after the long dash on `, ` and strips a leading `or `. AT-004.03a provisions an
   NGO with a verified email and no vetting, starts a need, drains the allowance to zero, sends,
   and asserts `{ ok: false, kind: 'daily-allowance-exhausted', status: 409 }`, exactly three
   remedies, the first matching `get vetted \(daily grant becomes <vetted grant>\)` with the
   grant read from `h.config` under the req-002 key, the second matching `/fund project fuel/i`,
   the third `/wait for the next UTC day/i`, and no turn row. AT-004.03b vets the organisation
   through `vetOrganizationAsAdmin` first, then the same drain and send, and asserts exactly
   two remedies, none matching `/get vetted/i`. Both ids assert the allowance is unchanged by
   the refused send. At integration each id proves the same through `reserveTurnAsOperator`
   (the keyless route answers 502 from the count before SQL, as units 1 and 2 record), then
   ends in `throw new CapabilityPending([AWAITED.discoverySurface])`. No `10` or `30` in a
   body.
2. **`tests/at/expected/req-004.json`**: loop `03a` and `03b` green; integration both red
   `capability-pending` on `["ui.discovery-surface"]`. Nothing else moves.

## Must-nots

- No product change (see the second paragraph). Do not touch the SQL sentences, the
  TypeScript sentence, or any route.
- Exactly fifty-eight `atTest(` call sites stay in `tests/at/suites/req-004/`.
- No key in any file. No comment that narrates a step.
- Do not touch `loop/items/` except to write your report.

## Checks you run

From this worktree: `bun run typecheck`, `bun run at:check req-004`,
`bun run at:verify req-004 --tier loop --expect`, `bun run at:verify req-002 --tier loop --expect`.
Run them until green. The lead runs the rest.

## Commit

One commit on `lane/ai4dev-132` when the four checks are green. Message:

```
AI4DEV-132: unit 3, the zero-credit remedies split by tier

<two to four lines in plain sentences.>
```

No other item id anywhere in the message.

## Report

Write `loop/items/AI4DEV-132/reports/unit3.md`: what changed by file, the output of the four
checks (exit code and last lines), the commit hash, and any deviation with its reason. Then
reply with five lines: the commit hash, the check results, deviations, blockers, the report
path.
