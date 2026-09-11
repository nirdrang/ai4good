# Unit 11 report: the zero-credit block, and the remedies that restore

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

This file was written before the last checks, so a cancelled run still leaves a record.

## What landed

The debit arm of `public.discovery_allowance` now raises one sentence that names three remedies.
The TypeScript twin is `dailyAllowanceExhaustedReason` in
`supabase/functions/_shared/discovery-allowance.ts`. The loop fixture calls that renderer. No new
refusal kind. The kind stays `daily-allowance-exhausted`.

AT-002.05 (zero-credit remedies) is green at the loop tier only. At integration it stays red,
`capability-pending` on `ui.discovery-surface`. AT-002.27 (day rollover restores) is green at both
tiers. AT-002.26 (fund restores turn) stays red, `capability-pending` on the checkout and funded-turn
billing. No other id moved.

The bodies live in `tests/at/suites/req-002/b-allowance.test.ts`. The pin arm lives in
`tests/at/suites/req-002/_source-scan.ts` as `scanExhaustedSentence` / `exhaustedSentenceProblems`.
The expected file `tests/at/expected/req-002.json` moves AT-002.05 to green at loop only, and
AT-002.27 to green at both tiers.

## Where the sentence lives, and what stops it drifting

I chose the first shape the unit offered: one exported renderer, the SQL raising the same words, and
a source arm in the shape of `scanGrantPins`.

SQL cannot import TypeScript. One generated file would be new machinery. A table for the sentence
is forbidden. So two copies exist on purpose, and the arm is what keeps them the same.

- TypeScript: `dailyAllowanceExhaustedReason` reads `dailyGrantFor('vetted')`. It never writes a
  numeral in the sentence.
- SQL: the debit arm interpolates `p_organization_id` and `public.discovery_daily_grant(true)`.
  The format string has no numeral.
- The loop fixture calls the renderer. It does not copy the words.
- The live path still raises from SQL. `writeRoute` already passes that message through as `reason`.

`scanExhaustedSentence` fills the SQL format with the organisation id and the vetted grant, and
compares the result to the renderer. It also refuses a SQL grant argument that is not
`public.discovery_daily_grant(true)`, a numeral in the SQL format, a TypeScript renderer that does
not read `dailyGrantFor('vetted')`, and a numeral in that renderer. A missing function or a missing
raise throws. AT-002.05 first feeds it a raise that dropped the remedies and asserts a non-empty
problem list, then asserts `exhaustedSentenceProblems()` empty.

## How AT-002.05 is proved, at the loop tier only

The per-tier map stays. The loop arm is filled. The integration arm stays `awaiting` on
`ui.discovery-surface`.

The loop body spends the whole unverified grant from the at-config registry, then attempts one more
credit. The refusal kind is `daily-allowance-exhausted`. Each remedy is asserted on its own:

- get vetted
- the first remedy names the pinned vetted grant
- fund project fuel
- wait for the next UTC day

The body never writes 10 or 30.

On an unfunded project is the criterion's own scope, and every project in this tree is unfunded
because no checkout exists. A comment on the body says that. The body does not build a funded
project, a fuel balance, or a flag.

The integration tier stays red because the block is real and the sentence exists, but no deployed
surface shows those remedies to anybody. That is the design of record.

## How AT-002.27 is proved, at both tiers

The body reaches the block first. A rollover without that block would not prove the remedy restores
anything.

It then travels to the next UTC day the way AT-002.06 (UTC reset) does:
`writeSpendRowAsOperator` puts today's spend on the previous UTC day and deletes today's row. That
is the bytes the database holds one second after midnight. A new day is a new key with no row. The
product has no midnight event to observe. A comment on the travel says this. The body does not
prove the crossing itself. Correction C3.

The next debit succeeds. Remaining is the unverified pin minus that debit. Spent today is 1. The
daily grant is the unverified pin. A rollover that granted the wrong number fails this body.

The integration arm also compares the product UTC day to the test process clock.

## AT-002.26 stays red

Its body and its manifest entry are unchanged. This unit does not write a partial proof of funding
under another id.

## Adjacent body that had to move

AT-002.21 (Discovery never blocked by vetting) used to require that no Discovery-path refusal reason
matched `/vet/i`, including the exhausted debit. The exhausted sentence now names get-vetted as a
remedy. That is not a vetting gate. The body now asserts that debits inside the grant are not
refused at all, and that the extra debit's kind is `daily-allowance-exhausted`.

## `_pending.ts`

`LEAF.D2_L2` and `notLanded` lost their last callers. Both are removed. `awaiting` and `AWAITED`
stay. AT-002.26 still uses them.

## What this unit must not do, and did not do

- No new table, enum value, `TENANT_CATALOG` row, `WRITE_ROUTES` row, refusal kind, or `viewer_`
  helper.
- No checkout, no wallet, no fuel balance, no funded turn, and no flag standing in for one.
- Nothing about the publish gates or the Discovery wallet.
- No new harness machinery. The new source arm sits beside the existing arms.
- The local stack was not stopped.

## The checks

Run in the worktree. Exact exit status of each: not yet run when this file was first written.

1. `bun run typecheck`
2. `bun run at:check req-002`
3. `bun run at:selftest`
4. `bun run at:verify req-002 --tier loop --expect`
5. `bun run at:verify req-001 --tier loop --expect`
6. `bun run at:verify req-016 --tier loop --expect`
7. `bun run at:verify req-002 --tier integration --expect`
8. `bun run at:verify req-001 --tier integration --expect`
9. `bun run at:verify req-016 --tier integration --expect`

## Where the design of record was not followed, and why

The design of record keeps AT-002.05 red at the integration tier only, and AT-002.26 red at both.
This unit follows that.

## Least sure

Whether a reviewer would rather see the live SQL message compared to the renderer at the
integration tier of AT-002.27. That id is about the rollover restoring a debit, not about the
words. The pin arm reads the migration text. It does not observe the deployed raise. AT-002.05
cannot make that observation at integration because that tier stays red on the missing Discovery
surface.

## What the lead changed in review, 2026-09-10

The lane was cancelled while it ran the integration checks. The work was already written, so the
lead read the diff and finished the checks rather than running the unit again.

Two changes.

The AT-002.05 body carried an inline negative control: a constructed SQL raise with the remedies
dropped, asserted to make the arm report a problem. That is an oracle test, and the same case is
already in `tests/at/harness/req002-oracles.selftest.ts`. The body now consults
`exhaustedSentenceProblems` only, and a comment says where the arm is proved able to fail.

`src/routeTree.gen.ts` had a generated block added to it. Nothing in this unit touches the router,
and a rerun of the typecheck does not reproduce it, so it was tooling drift. The lead reverted it.
