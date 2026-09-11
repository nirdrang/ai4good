# Fix 6: the remaining findings

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

Nine findings from the four-model review. Each one still applied except the
email-verified map named in finding 9, which an earlier fix unit already deleted.
No acceptance id changed colour. `tests/at/expected/req-002.json` was not edited.
No grant, high-water mark, reset, vetting authorisation, or notification taxonomy
changed. No migration that exists on `main` was edited.

## 1. Corrupt data is rendered as plausible data (muse, finding 8)

`vettingRecordFromSql` now throws when emailed registration evidence is missing a
registration column, or when any other evidence type carries registration
metadata. `vettingAuditCurrentFromDetail` still returns null when `current` is
absent. A truncated `current` object throws instead of filling empty strings.

**Proved by** `tests/at/harness/shipped-org-vetting.selftest.ts`: the emailed
missing-metadata throw, the non-emailed extra-metadata throw, the truncated
audit throw, and the two well-formed projections.

## 2. The profile write is check-then-act (muse, finding 14)

I chose the lock, matching the sibling writers. `public.set_organization_profile`
now takes `FOR UPDATE` on the organisation row before it reads membership and
before it updates. I did not add a row-count check after the update: once the
row is locked, a concurrent delete waits, and a missing row is already refused
by `IF NOT FOUND`.

This is this branch's own migration `20260915120000_organization_profile.sql`,
not a file on `main`.

**Proved by** `tests/at/harness/shipped-memberships.selftest.ts`, which reads that
migration and requires `from public.organizations where id = p_organization_id
for update` inside the function body.

## 3. The two layers disagree about what whitespace is (muse, finding 15)

The definer trim set is now ASCII white space plus NBSP (U+00A0), the character
JavaScript `trim` strips and the previous `btrim(..., E' \t\r\n\f')` set left
intact. The same set is on the four new profile column checks. The vetting
definer uses the same set on the note and the mandated fields.

I closed the named hole rather than documenting a weaker backstop.

**Proved by** AT-002.02: the NGO admin writes a complete profile, then the
definer is called with a name of only U+00A0. Both tiers refuse `invalid-name`
and the stored row stays the edited set. The loop arm trims with JavaScript
`trim`. The integration arm trims in SQL.

## 4. The notice builder throws where the module returns decisions (muse, finding 13)

`vettingOutcomeNotice` now returns `Decision<VettingOutcomeNotice>`. A missing
taxonomy row is `{ ok: false, reason }`. `decideOrganizationVetting` maps that
to `refused` 502. It does not throw.

The second argument is `null` when a test wants the missing-row arm. A product
caller omits it. Passing `undefined` would have used the default and looked the
row up, which is why the test sends `null`.

**Proved by** `shipped-org-vetting.selftest.ts`: the missing-row refusal, the
copy still does not say "publish", and an unvet of a present organisation
returns `p_notice` as a decision field. AT-002.13 still builds a notice for the
two-seat and unauthorised-channel arms.

## 5. A broken render becomes a plausible zero (opus, finding 18)

`renderDiscoveryAllowance` throws when a numeric field is missing or null. It
does not put `null` on the wire. The live adapter's `allowanceFromJson` uses
`integerField` and throws the same way. `Number(...)` is gone from that path.

**Proved by** `shipped-discovery-allowance.selftest.ts`: null `remaining`,
`daily_grant`, and `spent_today` throw; a remaining of zero still reads as
zero.

## 6. The result renderer is a cast in the one file no type-checker covers (opus 15, grok 8)

`renderOrganizationProfile` lives in `memberships.ts` next to
`decideOrganizationProfile`. It narrows with `isRecord`. The edge entry point
imports it. There is no `as` cast in that file.

**Proved by** `shipped-memberships.selftest.ts`: a well-formed RPC result
projects the six fields; `null` and an array project nulls.

## 7. The allowance renderer rebuilds a shape by hand (opus, finding 20)

`renderDiscoveryAllowance` parses the SQL keys, calls `allowanceOf`, and
refuses when the supplied `remaining` does not match `granted - spent`.

**Proved by** the same renderer selftest: the well-formed row equals
`allowanceOf({ granted: 10, spent: 3 })`.

## 8. The field parsers are copied per module (muse 12, opus 19)

`isRecord`, `integerField`, `booleanField`, `timestampField`, and `isoDay` now
live next to `stringField` in `write-routes.ts`. The copies in `org-vetting.ts`
and `discovery-allowance.ts` are deleted. The live adapter's `isoDay` for a
SQL `date` or `Date` is a different function and stays.

**Proved by** `shipped-write-gate.selftest.ts` (the parsers themselves) and by
req-001 and req-016 still importing `write-routes.ts`. Those two suites are
checks 5 and 8 below.

## 9. The loop adapter keeps shadow state (opus 7, grok 7)

The email-verified map was already gone. I deleted `deactivated` and
`roleOverrides`. Deactivation now writes the inner account row.
`setMembershipRoleAsOperator` now writes the inner membership row. Standing
reads `account.lifecycle` and `membership.role` from that store. The profile
write no longer runs a second pipeline over an override.

Maps that remain, and why:

- `heldSessions` — the req-002 session handle. The inner fixture uses a
  different session type.
- `vetting`, `audits`, `events`, `deliveries`, `spend` — facts the inner
  account store does not hold.
- `seats` — the vetting seat-holder list, including the no-seat and two-seat
  Givens the unique membership index forbids, plus the email the notice uses.
  Inner membership cannot represent those Givens.

**Proved by** AT-002.02 (the member arm now changes the inner membership row
and both the route and the definer refuse `not-an-admin`) and AT-002.29 (the
deactivated administrator now has `lifecycle: 'deactivated'` on the inner
account row).

## What I could not follow

Nothing. The nine were local. The email-verified map in finding 9 was already
gone; I still did the other two maps.

## Least sure

Whether adding `deactivateAccountAsOperator` and `setMembershipRoleAsOperator`
only on the req-001 fixture object, rather than on `AccountsSut`, is the
honest inner source. The live req-002 adapter still writes those two facts
with operator SQL of its own. A later body that called the inner live adapter
for them would not find the methods. No req-001 test calls them.

## Checks

The findings above were written before these checks ran.

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`,
   `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 27 passed (27)`, `Tests 411 passed (411)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 20 green, 7 red, 0 missing`,
   matches the declaration, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`,
   matches the declaration, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`,
   matches the declaration, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 19 green, 8 red, 0 missing`,
   matches the declaration, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`,
   matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`,
   matches the declaration, exit 0.

The selftest count rose because this unit added `shipped-memberships.selftest.ts` and
extended three existing selftests. No acceptance id changed colour. The local stack
was not stopped.
