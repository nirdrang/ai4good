# Unit 10 report: the pilot default, and the founder-vetted wording

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

This file was written before the last checks, so a cancelled run still leaves a record.

## What landed

No migration. No new edge function. No change to notification copy, the taxonomy, or any shipped module.

AT-002.28 (pilot default) is green at both tiers. AT-002.23 (public verified claim) stays red, `capability-pending` on `ui.public-listing-screens`. No other id moved.

The body lives in `tests/at/suites/req-002/e-gates.test.ts`. The wording arm lives in `tests/at/suites/req-002/_source-scan.ts` as `scanTrustWording` / `trustWordingProblems`. It has no acceptance id. The expected file `tests/at/expected/req-002.json` moves AT-002.28 from red to green at loop and at integration.

## How AT-002.28 is proved

Concierge onboarding is not a route. The comment on the body says so: the pilot operator runs the ordinary audited vet action by hand. That is the whole content of "vetted is the pilot default". The default is a value the operator sets through the audited path. It is not a bypass that sets it for them.

The body consults three source arms that already prove there is no second path, and names the claim each one carries:

- `vettingRouteProblems` (scanVettingRoutes): exactly one write route reaches the definer, and it admits only the platform administrator. There is no concierge-onboarding route beside it.
- `orgVettingWriterProblems` (scanOrgVettingWriters): no statement outside the definer writes `org_vetting`. There is no auto-vet path.
- `scheduledVettingProblems` (scanScheduledVetting): no cron job or trigger vets. The default is not a scheduled job.

It then calls `open()`. Signup of an admitted, email-verified NGO leaves no vetting record. The platform administrator runs `setVetting` with the ordinary evidence. After that:

- The vetting record says `vetted: true` and carries the evidence the operator gave.
- The audit trail has one row. The actor is that administrator. The action is `vet`.
- The organisation's allowance reads the vetted grant from the pinned registry (`req-002.discovery.daily_credits.vetted`). Remaining equals that grant. Spent today is 0. The body never writes 10 or 30.

The body does not restate AT-002.11's audit-field assertions or AT-002.13's notification assertions.

## The founder-vetted wording arm

`scanTrustWording` is a pure scan over supplied files. `trustWordingProblems` reads the real tree through `productFiles`. Empty files throw, so a broken instrument cannot report an absence.

What it asserts: no shipped product surface makes a "verified" trust claim about an organisation, and where the trust flag is named for a person to read, the label is exactly "founder-vetted".

How it tells a trust claim apart from email verification: it classifies each quoted string (and JSX text under `src/`) by subject, not by a proximity count of the word "email".

- A string is email or auth verification when it names email, a jwt, a token, or a source address. Those stay silent. That is why `Decision<'verified'>`, `email-unverified`, and "the caller's email address is not verified" do not fail the arm.
- A string is an organisation trust claim when it names an organisation or NGO and uses "verified" as that organisation's trust word, or when it says "organisation is vetted/verified" without "founder-vetted".
- A standalone "verified" / "Verified" label is a claim only on a person-facing surface (`src/`, `notification-copy.ts`, `public-project.ts`, `tenant-reads.ts`). The same token in `verification.ts` is the email-decision value and is left alone.
- Internal identifiers (`DiscoveryTier = 'unverified' | 'vetted'`, `vetted: boolean`) are not a person-facing flag.
- A `verified:` field on a product TypeScript surface is a claim.

The arm is a naming oracle. A badge whose text is assembled at runtime, or a listing screen that does not exist yet, escapes it. That is why AT-002.23 stays red.

The selftest drives constructed refusals (verified org copy, a Verified badge, a `verified` field on the public projection, "organisation is vetted") and constructed silence (email-verification copy, the email-decision token, internal tier names, founder-vetted wording). The real tree is clean.

`tests/at/suites/req-002/f-public-claims.test.ts` names this arm in its comment as what covers the reachable part of the sweep. The AT-002.23 body and its manifest entry are untouched.

The notification copy already says "founder-vetted" and never "verified". The arm asserts that. It does not rewrite the copy.

## What this unit must not do, and did not do

- No migration. No new edge function. No new table, enum value, or `TENANT_CATALOG` row.
- No new `WRITE_ROUTES` row and no fourth `viewer_` helper.
- No change to the notification copy, the taxonomy, or any shipped module.
- No concierge-onboarding route, pilot flag, seed script, or auto-vet path.
- Nothing about the zero-credit block, the publish gates, or the Discovery wallet.
- No new harness machinery.
- The local stack was not stopped.

## The checks

Run in the worktree. Exact exit status of each:

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 20 passed (20)`, `Tests 328 passed (328)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 18 green, 9 red, 0 missing`, matches the declaration, AT-002.28 green, AT-002.23 red, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 18 green, 9 red, 0 missing`, matches the declaration, AT-002.28 green, AT-002.23 red, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.

A targeted oracle selftest of `tests/at/harness/req002-oracles.selftest.ts` passed before these nine: 35 tests, exit 0, including the real-tree `trustWordingProblems()` silence.

## Where the design of record was not followed, and why

The design of record keeps AT-002.23 red on the public listing screens. This unit follows that, against candidate designs that wanted the id green on the public project page alone.

Candidate designs add `publicTrustLabel` and grow the dashboard. The unit forbids a product change unless a genuine defect blocks the unit. The copy already says "founder-vetted". No defect blocked the unit.

## Least sure

Whether a reviewer would rather see the wording arm also called from the AT-002.28 body. The arm has no id. The unit says to assert it in the harness selftest. AT-002.28 already consults the three "no second path" arms. Adding a fourth would mix the wording sweep into the pilot-default id.

## What the lead changed in review, 2026-09-10

One legibility fix in the wording arm. The bare-label rule read
`BARE_VERIFIED_LABEL.test(value) && (isPersonFacingSurface(path) || value !== 'verified')`, which
states its one exemption backwards and twice. The exemption now has a name and a comment: lower-case
`verified` away from a person-facing surface is the email decision's value. The behaviour is
unchanged and the oracle still passes both ways.
