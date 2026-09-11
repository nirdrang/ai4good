# Fix 1: the refusal at the credit ceiling

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

The debit arm of `public.discovery_allowance` used one sentence and one kind for two
conditions, and adding `spent + credits` overflowed a 32-bit integer. This fix tells the
two conditions apart, drops the get-vetted remedy for a vetted caller, and compares the
debit against what remains.

No acceptance id changed colour. No grant, high-water mark, reset, ledger table, or
vetting action changed. `tests/at/expected/req-002.json` was not edited.

## The kind for an oversize debit

I added `debit-exceeds-remaining` to `WRITE_REFUSAL_KINDS`.

I did not reuse `daily-allowance-exhausted`. A Discovery client that branches on that
kind tells the caller to come back tomorrow. That is the first part of this defect: a
fresh organisation still holds its whole grant.

I did not reuse `invalid-credit-amount`. That kind already means the debit is not a
positive whole number. The write pipeline returns it as 400 before the ledger is
consulted. An oversize debit is a valid amount that is larger than what remains. The
database returns it as 409 after it reads remaining.

I did not reuse `refused`. That is the fail-closed default when a detail is unknown. Using
it would hide a mapping failure as the oversize case.

Nothing else in the tree pins the length or the contents of `WRITE_REFUSAL_KINDS`. The
write-gate selftest walks the list. It does not count it.

## What changed

**SQL**, `supabase/migrations/20260916120000_discovery_allowance.sql`, debit arm only.

- Remaining is `granted - spent`. The arm compares `p_credits > v_remaining`. It does not
  add `v_spent + p_credits`.
- Remaining at or below zero raises `daily-allowance-exhausted`. An unverified caller
  reads three remedies. A vetted caller reads two. The get-vetted remedy is dropped for a
  vetted caller: that caller has already taken it. The vetted grant in the get-vetted
  remedy still comes from `public.discovery_daily_grant(true)`. No numeral sits in either
  sentence.
- A debit larger than remaining, while remaining is above zero, raises
  `debit-exceeds-remaining`. The sentence names how many remain. Remaining is a format
  slot, not a numeral.

**TypeScript**, `supabase/functions/_shared/discovery-allowance.ts`.

- `dailyAllowanceExhaustedReason` takes the caller's tier. One place. The SQL debit arm
  is the other.
- `debitExceedsRemainingReason` is the matching renderer for the oversize arm.

**In-memory adapter**, `tests/at/suites/req-002/_fixture.ts`. It uses the same remaining
comparison and the same two renderers. The two tiers no longer disagree on an oversize
debit.

## What was proved

- **AT-002.04.** A debit of grant plus one against an untouched allowance is still
  refused. It still writes no ledger row. The kind and the sentence are now the oversize
  arm. Consumption can still reach the grant and never pass it. The extra debit at zero
  is still `daily-allowance-exhausted`. At integration only, a debit of 2147483647 must
  come back as `debit-exceeds-remaining`, not as a Postgres range error. JavaScript
  numbers do not overflow there, so the loop tier cannot prove this. That reason sits in
  a comment on the integration path.
- **AT-002.05.** Unchanged in what it asserts. An unverified organisation at zero still
  reads three remedies. Nothing about the vetted tier was added to that body. The
  sentence pin it already calls now compares every arm.
- **Vetted-at-zero, no acceptance id.** `tests/at/harness/shipped-discovery-allowance.selftest.ts`
  drives the shipped renderer. Three remedies for unverified. Two for vetted. Get-vetted
  is absent for a vetted caller.
- **The sentence pin.** `scanExhaustedSentence` compares the unverified exhausted raise,
  the vetted exhausted raise, and the exceeds-remaining raise, each against its
  TypeScript renderer. A missing arm throws. It does not report agreement from one arm.

## Checks

The first three ran before this report. The verify runs were filled in after they finished.

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`,
   `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 22 passed (22)`, `Tests 369 passed (369)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 20 green, 7 red, 0 missing`,
   matches the declaration, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`,
   matches the declaration, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`,
   matches the declaration, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 19 green, 8 red, 0 missing`,
   matches the declaration, exit 0. AT-002.04 stayed green, including the integer-max debit.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`,
   matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`,
   matches the declaration, exit 0.

No stack restart. The reset replayed the edited migration. The edge runtime served the new kind
without a start.

## Least sure

Whether a later Discovery client will treat `debit-exceeds-remaining` as a retry-with-a-smaller-debit
kind, or will need copy this tree does not write yet. The kind is in the closed list. The sentence
already says how many remain.
