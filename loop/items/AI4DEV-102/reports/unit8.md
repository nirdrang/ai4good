# Unit 8 report: the UTC reset, and the unvet with no ledger row

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

This file was written before the last checks, so a cancelled run still leaves a record.

## What landed

No product change. The ledger table, the grant function, the mark, and the decision module stay as the previous unit left them.

AT-002.06 (UTC reset) is green at both tiers. No other id moved.

The body lives in `tests/at/suites/req-002/b-allowance.test.ts`. The expected file
`tests/at/expected/req-002.json` moves AT-002.06 from red to green at loop and at integration.

## How the reset is proved

Correction C3 (what the reset test may claim) governs the body.

The harness gives the live adapter a real clock and no commanded clock. No test here observes a
real midnight. The operator write `writeSpendRowAsOperator` puts the current day's spend onto the
previous UTC day and deletes today's row. That is exactly the bytes the database holds one second
after midnight: a new day is a new key with no row. The product has no midnight event to observe.
A comment on `persistSpendOnPreviousUtcDay` says this. The body does not claim the crossing itself.

The starting remaining is parameterised. Zero remaining, a partial remaining, and an untouched
remaining each reach the same answer on the next day: remaining equals the tier grant, spent is
zero. The matrix runs for the unverified pin and for the vetted pin. The body never writes the
pin figures; it reads them from the at-config registry.

Two things keep the body off the weak form the judge named:

- After the first read of the new day, the body debits one credit and reads again. Remaining is
  the grant minus one. An implementation that resets on every read fails this.
- The integration body compares the UTC day the product reports against `utcDayOf(Date.now())`
  from the test process. That catches a day key computed in a session time zone on a machine that
  is not set to UTC. The loop body does not make that comparison: its clock is frozen.

A second reset does not happen inside the same UTC day: after the debit, remaining stays at the
grant minus one.

Both tiers use the same backdate. A 24-hour clock advance at loop would expire the 120-second
access token, so the next product call would be an unauthenticated refusal, not a new day. The
previous unit already chose this Given for that reason.

## The carry: an unvet on a day with no ledger row

An organisation is vetted. The body then backdates that day's row, so today has no ledger row.
The organisation is still vetted. An unvet then lands before any spend today.

The organisation keeps the vetted grant for the rest of today. The product read after the unvet
reports `vetted: false`, `dailyGrant` equal to the vetted pin, and remaining equal to the vetted
pin. The today's spend row, which the unvet mark inserts, stores the vetted pin as `granted`.
A debit of the unverified pin plus one succeeds.

That is the founder ruling of 2026-09-09: an unvetted organisation keeps the credits it already
holds until the next UTC day. A vet always writes that day's mark, so this case is reachable only
across a UTC day boundary. This unit is the first that can travel between days.

## How the inverted assertion fails

The mark takes the higher of the tier before the vetting action and the tier after it. In the
loop fixture that is `(existing?.vetted ?? false) || record.vetted`. In SQL it is
`v_previous_vetted or v_current.vetted`.

I removed the previous-tier arm in the loop fixture only, so the mark used `record.vetted` after
the unvet. I ran AT-002.06 at the loop tier. The body failed:

```
AssertionError: unvet on a day with no ledger row wrote the unverified grant and took the credits already held today: expected 10 to be 30
```

The post-unvet `dailyGrant` was the unverified pin. The fix was restored. The same expression
without `or v_previous_vetted` in SQL would insert today's row with `granted = discovery_daily_grant(false)`.
I did not change the migration.

## What this unit must not do, and did not do

- No change to the ledger table, the grant function, the mark, or the decision module.
- Nothing about the zero-credit block, the pilot wording, the publish gates, or a Discovery wallet.
- No new harness machinery. No commanded clock in the live adapter.
- No new acceptance id. No change to any criterion text.
- The local stack was not stopped.

## The checks

Run in the worktree. Exact exit status of each:

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 20 passed (20)`, `Tests 321 passed (321)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 15 green, 12 red, 0 missing`, matches the declaration, AT-002.06 green, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 15 green, 12 red, 0 missing`, matches the declaration, AT-002.06 green, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.

A targeted loop run of AT-002.06 passed before the inverted fixture run. The inverted run failed
as quoted above. The official loop and integration verifies are the record after restore.

## Where the design of record was not followed, and why

- The unit brief asked for a controllable clock at the integration tier. Correction C3 wins: no
  commanded clock is built. Both tiers backdate the day row.
- Candidate designs freeze the loop clock across midnight. This body does not. A 24-hour advance
  expires the access token. The previous unit already documented that.

## Least sure

Whether an integration run that crosses UTC midnight while the body is in flight would flake on
the process-clock comparison. The window is one second around midnight. The body cannot wait it
out, and correction C3 says no test in this tree can prove the crossing.

## The lead's review

The lead re-read the diff and re-ran all nine checks. Every check exits 0.

The body is accepted as written. It debits between the two reads, it keeps the previous day spend on
its own key, it asserts a read of the new day creates no row, and at the integration tier it compares
the day the product reports against the test process own clock.

The carry from the previous unit is closed. An organisation vetted on an earlier day, with no ledger
row today, is unvetted before it spends anything and keeps the vetted grant for the rest of the day.
The lane showed the assertion fails without the fix.

One change by the lead, a comment only. The operator that writes a spend row on another day also
deletes today row, which is what makes the operation a move rather than two days held at once. That
side effect was undocumented, so it is now written in the contract.

Known limit, stated by the lane and accepted: an integration run that crosses real midnight in the
middle of the body can fail the process-clock comparison. Correction C3 says no test in this tree
proves the crossing, and this is the same limit seen from the other side.
