# Unit 6: the transparency read contract, and one fixture cleanup from unit 5

You are the writer for unit 6 of the credits engine run, the last unit. You work in this
worktree on branch `lane/ai4dev-132`, whose head is the unit 5 closure commit `bd51916`. You
may edit, create and run anything under it. Use PowerShell syntax if you shell out; you are
on Windows. Never use Bash syntax. The local stack is up and serves this worktree's functions.
This unit adds no route folder. Do not stop or start the stack.

## Read first, in this order

1. `loop/items/AI4DEV-132/design/SYNTHESIS.md`: correction 2 (the overrun rule), correction 10,
   the "Turn record" bullet, the "Per-unit plan and lanes" row for unit 6.
2. `loop/items/AI4DEV-132/design/candidate-4-reserve-settle.md`: "Unit 6, transparency" (the
   AT-004.46 body), the paragraph "The transparency read" with its SQL, and the "Unit 6"
   paragraph near the end. The read route and `readConversation` already landed in unit 4;
   this unit lands the invariant query, the zero-cost attach proof, and the body.
3. `.taskmaster/docs/acceptance/at-req-004.md`, criterion 46.
4. `loop/items/AI4DEV-132/reports/unit4.md`, `unit5.md` (deviation 2 is the cleanup below).
5. `tests/at/suites/req-004/_fixture.ts`, `_live.ts`, `_contract.ts`, `a-metering.test.ts`
   (AT-004.49's abandoned reservation through `backdateOpenTurnAsOperator`),
   `d-conversation.test.ts` (`readConversation`), `f-transparency.test.ts` (the `notYet`
   registration you replace); `tests/at/suites/req-003/_contract.ts`
   (`attachReferenceFile`); `tests/at/suites/req-001/_contract.ts` and `_fixture.ts`
   (`emailedVerificationLink`, `useVerificationLink`, `emailVerified`).
6. `tests/at/expected/req-004.json`.

## What you build

1. **`spendLedgerInvariantProblems(organizationId)`**. At integration, `_live.ts` runs the
   base's SQL as the operator and returns one string per row, naming `utc_day`, `spent` and
   `accounted`. At loop, `_fixture.ts` computes the same over the spend rows and the turn map:
   for every spend row of the organisation, `spent` must equal the sum over that day's free
   turns of `reserved_credits` for open rows and `charged_credits` for the rest. Also report
   any settled row whose `overrun_micros` is positive (SYNTHESIS correction 2: an overrun is a
   visible defect), at both tiers.
2. **`f-transparency.test.ts`**: AT-004.46 per the base's body. At loop: a vetted NGO, a
   need, then a sequence of observed steps, reading the allowance before and after each and
   recording the delta: three scripted turns (through `sendMessage`), one file attach through
   the req-003 `attachReferenceFile` between the first and second turn, and one abandoned
   reservation (a `reserveTurnAsOperator`, `backdateOpenTurnAsOperator` past the deadline,
   then the next send settles it as abandoned). Assert: the attach's delta is zero; every
   negative delta, made positive and sorted, equals the turn rows' `reservedCredits` sorted
   (the abandoned row counts at its reservation, a settled row at its reservation with the
   release showing as a positive delta after the settle, or assert per step as the base's
   comment says; choose one reading, state it in the report, and make the assertion exact);
   `spendLedgerInvariantProblems` is empty; the conversation read's `chargedCredits` per turn
   equal the rows'. At integration: the same steps through `reserveTurnAsOperator` and
   `settleTurnAsOperator` with synthetic usage, the attach through the deployed
   `project-need` route, the deployed `discovery-conversation` read, the SQL invariant, then
   `throw new CapabilityPending([AWAITED.discoverySurface])`. No `10` or `30` in the body.
3. **`tests/at/expected/req-004.json`**: loop `46` green; integration `46` red
   `capability-pending` on `["ui.discovery-surface"]`. Nothing else moves. After this unit no
   id of this run is `sut-missing` at either tier.
4. **The unit 5 fixture cleanup.** In `_fixture.ts`, `setEmailVerifiedAsOperator(accountId,
   true)` verifies the inner fixture's user through its own path (`emailedVerificationLink`
   for the actor's email, then `useVerificationLink`), so `debitAllowance` sees a confirmed
   user, and the reserve twin calls `debitAllowance` on every free turn with no operator
   spend write. `false` uses `clearEmailConfirmationAsOperator`. Delete the operator-write
   branch unit 5 added. AT-004.41 stays green at loop.

## Must-nots

- No product change. No SQL change. No new route.
- No `10` or `30` in a test body. No key in any file. No narrating comments. Exactly
  fifty-eight `atTest(` call sites stay.
- Do not touch `loop/items/` except to write your report.

## Checks you run

From this worktree: `bun run typecheck`, `bun run at:check req-004`, `bun run at:selftest`,
`bun run at:verify req-004 --tier loop --expect`, `bun run at:verify req-004 --tier integration --expect`,
`bun run at:verify req-002 --tier loop --expect`. Run them until green. An integration run
resets the stack; if a run reports every id red with a 502, run it again.

## Commit

One commit on `lane/ai4dev-132` when the six checks are green. Message:

```
AI4DEV-132: unit 6, the spend ledger invariant and the zero-cost attach proof

<three to six lines in plain sentences.>
```

No other item id anywhere in the message.

## Report

Write `loop/items/AI4DEV-132/reports/unit6.md`: what changed by file, the delta reading you
chose, the output of the six checks (exit code and last lines), the commit hash, and any
deviation with its reason. Reply with five lines: the commit hash, the check results,
deviations, blockers, the report path.
