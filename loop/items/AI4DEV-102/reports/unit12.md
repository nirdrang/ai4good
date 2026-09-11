# Unit 12 report: no Discovery wallet, and funding that vetting never gates

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

This file was written before the last checks, so a cancelled run still leaves a record.

## What landed

Two pure decisions, and one source arm that keeps the first of them honest. No checkout. No
wallet. No new route. AT-002.10 (no Discovery wallet) and AT-002.31 (funding not vetting-gated)
stay red at both tiers. Their manifest entries do not change. This unit turns no acceptance id
green.

`fundingAllowed` sits beside `publishingAllowed` in
`supabase/functions/_shared/org-vetting.ts`. It takes the same vetted flag and ignores it. Both
values return `{ ok: true, value: 'not-vetting-gated' }`. The comment says no checkout consults it
yet, and that AT-002.31 (funding not vetting-gated) stays red for that reason.

The no-wallet arm lives in `tests/at/suites/req-002/_source-scan.ts` as `scanDiscoveryWallet` /
`discoveryWalletProblems`. It has no acceptance id. AT-002.10 (no Discovery wallet) stays red on
the missing checkout.

## The funding permissibility

The function is the other half of the publishing pair. Vetting gates publishing. Vetting never
gates funding. The two sit on one screen so the asymmetry is visible.

The decision is asserted in `tests/at/harness/shipped-org-vetting.selftest.ts`, which is where
this tree asserts a shipped decision with no acceptance id behind it. Both values of the vetted
flag produce the same permit.

`OrganizationsSut.fundingAllowed` stays `notLanded` on both adapters. No assertion consults that
member. The selftest calls the shipped function directly. A member no test calls is dead weight.
Landing the adapters would not make AT-002.31 (funding not vetting-gated) green, because that id
needs a checkout this tree does not have.

## How the arm tells a daily grant apart from a wallet

A wallet is a stored, purchasable, carried-over balance. The tree holds legitimate Discovery
credits that are none of those: a daily grant, a spend row, a debit, a remaining count. Remaining
is `granted - spent` and is never stored.

The split is the subject of each name or string, not a count of the word "credit".

- A name or string is a Discovery wallet when it names Discovery together with wallet, sku,
  buy/purchase/top-up, or a holdable balance.
- A name or string is daily-grant accounting when it names grant, granted, spent, remaining,
  debit, allowance, or "left today", and does not also name a wallet form.
- Ordinary project fuel, the general balance, and Lovable credits are a different subject.

The arm scans surface names (route folders, write routes, shared modules, UI routes, file paths),
declaration names (TypeScript type/function/const, SQL table/function/type), quoted strings, and
JSX text. Empty product source throws.

A disguised `credit-desk.tsx` escapes it. A `balance` column added to `discovery_spend` under that
word escapes it. Copy assembled at runtime escapes it. That is why AT-002.10 (no Discovery wallet)
stays red: this arm covers the names and the copy this tree has, not a paid-continuation path
that is not here.

The selftest drives constructed refusals (a `discovery-wallet` route, a buy-Discovery-credits
write route, a Discovery-sku module, quoted wallet/SKU/buy/balance copy, a `DiscoveryWallet`
type, a `discovery_wallets` table) and constructed silence (the daily grant, remaining, the
exhausted sentence, model-fuel purchases, the general balance, Lovable credits). The real tree
is clean.

## What this unit must not do, and did not do

- `tests/at/expected/req-002.json` is untouched. Both ids stay exactly as they are.
- No checkout, no wallet, no fuel balance, no funded turn, and no flag standing in for one.
- No new `WRITE_ROUTES` row, migration, edge function, table, enum value, `TENANT_CATALOG` row,
  refusal kind, or `viewer_` helper.
- Nothing about the publish gates.
- No new harness machinery. The source arm sits beside the existing arms. The shipped-decision
  selftest sits beside `shipped-verification.selftest.ts`.
- The local stack was not stopped.

## The checks

Run in the worktree. Exact exit status of each:

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 21 passed (21)`, `Tests 348 passed (348)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 20 green, 7 red, 0 missing`, matches the declaration, AT-002.10 red, AT-002.31 red, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 19 green, 8 red, 0 missing`, matches the declaration, AT-002.10 red, AT-002.31 red, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.

The acceptance counts did not move: twenty green at the loop tier and nineteen at integration,
for requirement 002.

## Where the design of record was not followed, and why

The design of record keeps AT-002.10 (no Discovery wallet) and AT-002.31 (funding not
vetting-gated) red at both tiers. This unit follows that. A checkout that does not exist cannot
be proved, and a stand-in for it would be a claim that it does.

## Least sure

Whether a reviewer would rather see `fundingAllowed` take `DiscoveryTier` instead of the same
boolean `publishingAllowed` takes. The boolean keeps the pair aligned. The tier type would import
the allowance module into the vetting module for a flag the function then ignores.

## What the lead changed in review, 2026-09-10

One line. `fundingAllowed` took its argument and then discarded it with a `void vetted;` statement.
The tree already has a convention for a parameter a function deliberately ignores: `projectIsPublic`
in `public-project.ts` names it `_source`. The parameter is now `_vetted` and the discard statement
is gone. The comment that says why the parameter is there at all stays.
