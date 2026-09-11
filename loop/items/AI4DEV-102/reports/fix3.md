# Fix 3: the email floor on spending

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

The debit arm of `public.discovery_allowance` refuses a caller whose email address is
not confirmed. That rule was written twice, never called from AT-002.22, and unreachable
at the integration tier. This fix pins one sentence, drives the debit from AT-002.22, and
hands the live adapter an unverified caller that still holds a session.

No acceptance id changed colour. No grant, high-water mark, reset, ledger table, or
vetting action changed. `tests/at/expected/req-002.json` was not edited. The criterion
text of AT-002.22 was not edited. `write_standing` was not widened.

## One sentence, one place per language

**TypeScript**, `supabase/functions/_shared/discovery-allowance.ts`.

`emailUnverifiedReason` is the one renderer. The SQL debit arm is the other. The account
id is a slot. The sentence is the one the migration already raises. The migration was not
edited.

**In-memory adapter**, `tests/at/suites/req-002/_fixture.ts`. The debit path calls
`emailUnverifiedReason`. It no longer holds a second copy of the words. It reads the
verified fact from `accounts.emailVerified`, the same extractor `discoveryMessageAllowed`
already uses. It does not take a verified claim from the request body.

## The pin

`scanEmailUnverifiedSentence` sits beside `scanExhaustedSentence` in
`tests/at/suites/req-002/_source-scan.ts`. It fills the SQL format with the account id and
compares that string to the TypeScript renderer. The account argument must be
`p_account_id`. Neither side may contain a numeric literal.

A missing function, a missing raise, an unreadable raise, or an empty TypeScript renderer
throws. The arm does not report agreement from a side it could not read.

AT-002.22 calls `emailUnverifiedSentenceProblems`. The selftest drives the refusals over
injected text.

## The live adapter can reach the rule

Confirmations-on GoTrue issues no session to an unconfirmed address. The old unverified
path completed signup as the operator and returned an empty session id. Every later call
then threw in the token lookup. The product's refusal never ran.

`provisionNgo({ emailVerified: false })` now takes the ordinary confirmed path, so a
session exists, then clears `auth.users.email_confirmed_at` as the operator. That is the
same operator-write pattern as `clearAccountEmailAsOperator`. The handle still holds the
session. Auth reports the address as unconfirmed. The adapter throws if the clear cannot
find the user or if Auth still reports confirmed afterwards.

`write_standing` is unchanged. Graft G3 refused widening it with an email fact, and that
refusal still stands. The confirmation check stays in `public.discovery_allowance`, where
the database can see `email_confirmed_at` under the same transaction.

## What AT-002.22 now proves

The body still consults `discoveryMessageAllowed` at both vetting tiers, with the same
control. It still says there is no Discovery send route in this tree.

It now also:

- refuses an unverified caller's debit as `email-unverified` at the unvetted tier and
  again after the organisation is founder-vetted
- matches the refusal against `/verif/i` and `/email/i`
- reads `spendRows` after the first refusal and asserts there is no ledger row
- reads spent credits after the post-vet refusal and asserts they are still zero, because
  a vet writes a grant-mark row
- admits the same debit from a verified caller

The comment on the debit arm says it proves the allowance debit is refused. It does not
prove a Discovery message was blocked.

## What this did not do

- No new acceptance id, no new `WRITE_ROUTES` row, no new refusal kind.
- No change to allowance arithmetic, grants, reset, or the vetting action.
- No new harness machinery.
- No verified fact in a request body.

## Checks

The first three ran before this report. The verify runs were filled in after they finished.

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`,
   `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 22 passed (22)`, `Tests 384 passed (384)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 20 green, 7 red, 0 missing`,
   matches the declaration, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`,
   matches the declaration, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`,
   matches the declaration, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 19 green, 8 red, 0 missing`,
   matches the declaration, exit 0. AT-002.22 stayed green, including the debit arm.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`,
   matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`,
   matches the declaration, exit 0.

No stack restart. The reset replayed the existing migration. The SQL sentence was not
changed.

## Least sure

Whether a later GoTrue would revoke the session when `email_confirmed_at` is cleared.
This run's Auth still answered `/auth/v1/user` for the token issued while confirmed, so
the debit reached the product's `email-unverified` raise rather than the token lookup.
