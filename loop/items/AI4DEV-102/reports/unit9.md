# Unit 9 report: what vetting never gates

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

This file was written before the last checks, so a cancelled run still leaves a record.

## What landed

No migration. No new edge function. No change to `verification.ts` or `discovery-allowance.ts`. Both decisions this unit grades already ship.

AT-002.21 (Discovery never blocked by vetting) and AT-002.22 (email verification precedes Discovery) are green at both tiers. No other id moved.

The bodies live in `tests/at/suites/req-002/e-gates.test.ts`. The expected file
`tests/at/expected/req-002.json` moves those two ids from red to green at loop and at integration.

## The contract member

`OrganizationsSut.discoveryMessageAllowed(session)` sits beside `publishingAllowed` and
`fundingAllowed`. It consults the shipped `discoveryMessageAllowed` in
`supabase/functions/_shared/verification.ts`. There is no Discovery send route behind it.

Both adapters read the caller's verified state the way the product does:

- Loop: `accounts.emailVerified`, which renders the stored auth user as the GoTrue `/auth/v1/user`
  shape and runs `emailVerifiedFromUser`.
- Live: operator SQL on `auth.users.email_confirmed_at`, rendered as that same shape, then the
  same extractor.

Neither adapter takes a verified claim from a request body.

The live adapter also lands `provisionNgo(email, { emailVerified: false })`. Public signup creates
the unconfirmed auth user. Operator SQL calls `public.complete_signup`. The handle names the
account and holds no session, because confirmations-on GoTrue issues none. That is AT-002.22's
Given, and a state the live public path cannot reach.

`publishingAllowed` was `notLanded` on both adapters. AT-002.21 needs it for the contrast the
criterion states, so both adapters now read the aggregate and refuse unless `vetted === true`.
That is not a publish route. The publish-gate ids stay red. `fundingAllowed` stays `notLanded`.

## How AT-002.21 is proved

An email-verified, unvetted NGO reads its allowance. The daily grant is the unverified pin from
the at-config registry. The body never writes 10 or 30.

It then spends the whole unverified grant, one credit at a time. Each debit succeeds and still
reports `vetted: false`. A gate that let the first turn through and closed later fails here.

At the same moment, for the same organisation, `publishingAllowed` refuses. Vetting gates
publishing. It does not gate Discovery.

The next debit is refused as `daily-allowance-exhausted`. Every Discovery-path refusal reason is
asserted not to match `/vet/i`.

## How AT-002.22 is proved

One email-unverified NGO is provisioned. Its Discovery-message decision is refused at the
unvetted tier. The reason matches `/verif/i`, `/email/i`, and `/link/i`, so it names the remedy
and not only the fault.

The same organisation is then vetted through the vetting route. The refusal is unchanged: same
`ok: false`, same reason string. "At every tier" is the vetting tier.

The control is an email-verified NGO. It is permitted at the unvetted tier, then vetted, then
still permitted. Without that control a refusal would prove nothing about the gate.

The honesty limit sits on the first `discoveryMessageAllowed` call, not in the file header. No
Discovery send route exists in this repository. A green says the shipped decision answers
correctly. It does not say any deployed Discovery surface consults it.

This body does not duplicate AT-001.10 (unverified NGO blocked from Discovery). That id grades
signup and the req-001 stand-in. This id grades REQ-002's tiers.

## How the inverted assertion fails

I added a loop-fixture debit refusal when `vetted !== true`, with reason
`discovery_allowance refuses: organisation is not founder-vetted`. I ran AT-002.21 at the loop
tier. The body failed:

```
AssertionError: debit 1 of 10 was refused as refused: discovery_allowance refuses: organisation is not founder-vetted: expected false to be true
```

The first in-grant debit was the refusal. The fix was restored. The "10" in that message is the
unverified pin interpolated from the registry, not a literal in the test source.

## What this unit must not do, and did not do

- No migration. No new edge function. No new table, enum value, or `TENANT_CATALOG` row.
- No new `WRITE_ROUTES` row and no fourth `viewer_` helper.
- No change to `verification.ts` or `discovery-allowance.ts`.
- No Discovery message-sending stand-in in this suite.
- Nothing about the zero-credit block, the pilot wording, the publish gates, or a Discovery wallet.
- No new harness machinery.
- The local stack was not stopped.

## The checks

Run in the worktree. Exact exit status of each:

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 20 passed (20)`, `Tests 321 passed (321)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 17 green, 10 red, 0 missing`, matches the declaration, AT-002.21 and AT-002.22 green, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 17 green, 10 red, 0 missing`, matches the declaration, AT-002.21 and AT-002.22 green, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.

A targeted loop run of AT-002.21 and AT-002.22 passed before the inverted fixture run. The
inverted run failed as quoted above. The official verifies are the record after restore.

## Where the design of record was not followed, and why

- Candidate designs add a Discovery-turn stand-in. The unit brief forbids a second copy of
  REQ-001's send surface. AT-002.22 consults the shipped decision through a POLICY member.
- `publishingAllowed` is implemented in the adapters by reading the aggregate, not as a new
  product module. The design of record ships that decision as a pure module with the publish
  gates. Those ids stay red. This unit only needs the contrast AT-002.21 states.

## Least sure

Whether the lead would rather see `publishingAllowed` consult a tiny shipped module now, instead
of two adapter copies of the same `vetted === true` check. The contrast needs the member. The
publish-gate unit owns the module.

## What the lead changed in review, 2026-09-10

The lane implemented `publishingAllowed` twice, once in each adapter, as `vetted === true` with an
identical refusal sentence. AT-002.21 then asserted that publishing refuses at the same moment
Discovery does not, and that assertion graded the suite against a rule the suite itself had written.

The lead moved the rule into `supabase/functions/_shared/org-vetting.ts` as `publishingAllowed`, a
pure decision over the vetted flag, and both adapters now consult it. The design of record already
says the publish decision ships as a pure module with no route behind it. AT-002.19 and AT-002.20
stay red, and the publish-gates unit still owns them; it inherits this function and must not write a
second one.
