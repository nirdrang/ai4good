# Unit 1 fix lane: the email floor before the count, and four reds from the lead's checks

You are the writer for a fix pass on unit 1 of the credits engine run. You work in this
worktree on branch `lane/ai4dev-132`, whose head is the unit 1 commit `d925dad`. You may edit,
create and run anything under it. Use PowerShell syntax if you shell out; you are on Windows.
Never use Bash syntax.

## Read first

1. `loop/items/AI4DEV-132/design/SYNTHESIS.md`, corrections 1, 3, 7 and 13, and the founder
   rulings at the end.
2. `loop/items/AI4DEV-132/reports/unit1.md`, the unit 1 writer's report.
3. `supabase/functions/_shared/discovery-turn.ts`, `caller.ts`, `verification.ts`
   (`discoveryMessageAllowed`, `emailVerifiedFromUser`), `edge.ts` (`resolveCaller`,
   `writeRoute`), `write-routes.ts`, `tenant-reads.ts`.
4. `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts` (AT-001.31),
   `tests/at/suites/req-001/_fixture.ts` (the Discovery send and every place a `Caller` is
   built), `_live.ts`, `_integration.ts`, `tests/at/expected/req-001.json`.
5. `tests/at/harness/write-route-scan.selftest.ts` and `tests/at/suites/req-001/_write-route-scan.ts`.
6. `tests/at/suites/req-004/_source-pins.ts`, `_fixture.ts`, `a-metering.test.ts`.

## The five changes

1. **The email floor runs before the token count.** With the count first, a keyless deployed
   route answers 502 before the SQL email refusal, which made AT-001.10 pending again at
   integration and would make AT-004.41 pending. Fix: `Caller` gains `emailVerified: boolean`,
   derived in `callerFromAuthAnswer` from the `/auth/v1/user` body through the shipped
   `emailVerifiedFromUser`. Every place that builds a `Caller` (the req-001 fixture and any
   other fixture; typecheck names them) sets it from the account's verification state.
   `discoveryPrepare` then, before any read or count, calls
   `discoveryMessageAllowed({ emailVerified: caller.emailVerified })` and on refusal returns
   `refuseWrite('email-unverified', 409, <that reason>)`. The SQL floor in `discovery_turn_reserve`
   stays as the backstop with the same sentence; the sentence pin in `req-004/_source-pins.ts`
   keeps comparing the SQL raise to `discoveryMessageAllowed`'s reason. One HTTP shape: 409,
   `email-unverified`, from `prepare`.
2. **AT-001.31's volunteer half.** No write route admits a volunteer any more, so the test's
   Discovery send as a re-enabled volunteer cannot succeed and must not pretend to. Replace the
   two lines (the `sent` expectation and the `discoveryMessagesBy` readback) with the structural
   proof that re-enabling lifted the lifecycle gate: the same send as the deactivated volunteer
   was refused `account-deactivated` (403) earlier in the id or its neighbours; after re-enable
   the send is refused `not-an-ngo-account` (403), which the pipeline reaches only after the
   lifecycle gate admits. Assert `toMatchObject({ ok: false, kind: 'not-an-ngo-account', status: 403 })`.
   Do the same in `_integration.ts` wherever a re-enabled volunteer's Discovery send is expected
   to succeed. Read AT-001.31's text in `.taskmaster/docs/acceptance/at-req-001.md` first and
   keep every other assertion.
3. **`tests/at/expected/req-001.json`**: AT-001.10 moves to green at integration (the deployed
   route refuses an unverified caller before the count, with no key). Re-read every req-001
   integration declaration the unit 1 writer changed (AT-001.10, .29, .30) against the new
   order and correct any that no longer holds. AT-001.31 stays green at both tiers.
4. **`write-route-scan.selftest.ts`, "fails a stand-in row the fixture never drives through the
   gate"**: the real inventory has no stand-in row now, so the case must pass a synthetic
   inventory with one stand-in row to `scanWriteRoutes` (its first parameter). Keep the case;
   do not delete it.
5. **The frame must not import a route module.** `write-routes.ts` and `edge.ts` import
   `CallerReads` from `discovery-turn.ts`. Move `DiscoveryTurnSqlRow`, `DiscoveryReads` and
   `CallerReads` into `tenant-reads.ts` (or a new `_shared/discovery-reads.ts` that
   `tenant-reads.ts` re-exports), so `discovery-turn.ts` imports from the reads module and not
   the other way round. Type-only moves; no behaviour change.

## Must-nots

- Do not change the SQL definers except where a sentence must match `discoveryMessageAllowed`.
- Do not widen `admits` on any route. Discovery is NGO-only.
- No `10` or `30` in a test body. No key in any file. No narrating comments.
- Do not touch `loop/items/` except to write your report.

## Checks you run

From this worktree: `bun run typecheck`, `bun run at:check req-004`, `bun run at:check req-001`.
Then try `bun run at:selftest` and `bun run at:verify req-001 --tier loop --expect` and
`bun run at:verify req-004 --tier loop --expect`; if your sandbox cannot run vitest, say so and
stop at the three static checks. The lead runs the rest.

## Commit

One commit on `lane/ai4dev-132`. Message:

```
AI4DEV-132: unit 1 fixes, the email floor before the count

<four to eight lines in plain sentences.>
```

No other item id anywhere in the message.

## Report

Write `loop/items/AI4DEV-132/reports/unit1-fix.md`: what changed by file, which checks ran
with exit code and last lines, which vitest checks you could or could not run, the commit hash,
and any deviation from this brief with its reason. Reply with five lines: the commit hash, the
check results, deviations, blockers, the report path.
