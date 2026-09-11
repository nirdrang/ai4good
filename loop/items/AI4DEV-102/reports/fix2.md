# Fix 2: the vetting function

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

A four-model review found eight defects in and around `public.set_organization_vetting`.
This fix closes those eight. It does not change any acceptance id, any manifest
entry, or the notification taxonomy event list.

## 1. One function body

The later migration no longer defines `public.set_organization_vetting`.
The earlier migration `20260914120000_org_vetting.sql` carries the only body.

I chose that shape because a reader who opens the file that creates `org_vetting`
must see the writer of that table. The later file keeps the spend ledger, the
grant function, and `public.discovery_allowance`. It does not replace the vetting
definer.

The body calls `public.apply_discovery_grant_mark`, which the later migration
creates. PL/pgSQL resolves that name at run time, after every migration has
run. I did not add a trigger. I did not leave a second copy.

These migrations live on this item branch. Integration resets the database and
replays them. I did not treat them as frozen after a production apply.

## 2. Channels: which half of G3

Graft G3 said two things that disagree. TypeScript computes the notice and
passes it. The definer derives the channels from the class default and refuses
an empty delivery set.

The real instruction that had not shipped is the second half. The first half is
sound for copy, and I kept it. TypeScript still calls `vettingOutcomeNotice`,
which reads the taxonomy row and `renderCopy`.

SQL now derives `["email", "inapp"]`, the decision class default named by
`DEFAULT_BY_CLASS.decision`. It refuses a supplied list that is not exactly
that set, **before any write**. It then delivers on the derived set.

I did not only intersect and allow a subset. A list of `['inapp']` is inside
the authorised set and would still omit email. Exact match closes that hole
and the `['not-a-channel']` hole.

## 3. Seat holder

The definer counts membership rows under a share lock. Zero seats still raises
"no seat holder". Two seats now raises "more than one seat holder". Both use
detail `refused`. It does not pick a row by luck.

AT-002.13 proves the two-seat case with `addOrganizationSeatAsOperator`. The
live adapter drops `org_memberships_one_seat_per_org_idx`, inserts the second
row, and restores the index when the test removes those seats. The vet itself
calls the definer as the operator. `write_standing` still assumes one seat and
answers 500 on a two-row subquery, so the edge route never reaches the definer.

## 4. One clock

After the organisation row lock, the function stores `clock_timestamp()` once.
`vetted_at`, the audit row's `occurred_at`, and the grant-mark UTC day all use
that instant. A comment on the capture says why: `now()` is transaction start
and can be a previous UTC day when the lock is acquired after midnight.

`public.audit_events` is append-only, so the definer cannot update the row.
`public.append_audit_event` now takes an optional instant and writes it on
insert. Other callers still omit it and keep `now()`.

## 5. Existence check

`decideOrganizationVetting` now refuses `no-such-organisation` once, after the
note check and before the vet/unvet split. A vet of a missing organisation
with a malformed URL is the same kind as an unvet of a missing organisation.
The shipped-module selftest proves that.

## 6. Organisation identity in the payload

The event and each delivery carry `organizationId` and `organizationName`.
The name comes from `public.organizations.name` after the row lock, never from
the request. The taxonomy row is unchanged. Copy does not gain the name.

AT-002.13 asserts `payload.organizationId`.

## 7. Copy says what is true today

Vetted body: the organisation is founder-vetted and the daily Discovery
allowance is the vetted grant.

Unvetted body: a platform administrator revoked the organisation's vetting.

Neither sentence mentions publishing. That sentence belongs to the unit that
lands the publish flow.

## 8. Share lock, and a narrower scan

`public.discovery_allowance` takes `FOR SHARE` on the organisation row. It does
not write that row. The debit path still serialises on the spend row.

`scanScheduledVetting` no longer flags every trigger on `org_vetting`. It flags
a cron job that names vetting, and a writer of the `vetted` column outside the
definer. A trigger that maintains a derived row is silent. The oracle still
fails a cron that vets and a trigger function that assigns `new.vetted`.

## What was proved

- Unauthorised channels (`['not-a-channel']`) are refused for "not the class
  default", before any write. Aggregate, audit, event, delivery, and spend row
  are absent.
- A second seat refuses the vet. Nothing is written.
- The late-failure absence helper now also asserts the spend row is absent.

## Checks

Exact exit status of each:

1. `bun run typecheck` — exit 0. `typecheck OK: all three projects clean`.
2. `bun run at:check req-002` — exit 0. `27 P0 ids in bijection`.
3. `bun run at:selftest` — exit 0. `Test Files 22 passed (22)`, `Tests 372 passed (372)`.
4. `bun run at:verify req-002 --tier loop --expect` — exit 0. `27 P0: 20 green, 7 red, 0 missing`.
5. `bun run at:verify req-001 --tier loop --expect` — exit 0. `38 P0: 33 green, 5 red, 0 missing`.
6. `bun run at:verify req-016 --tier loop --expect` — exit 0. `12 P0: 12 green, 0 red, 0 missing`.
7. `bun run at:verify req-002 --tier integration --expect` — exit 0. `27 P0: 19 green, 8 red, 0 missing`.
8. `bun run at:verify req-001 --tier integration --expect` — exit 0. `38 P0: 27 green, 11 red, 0 missing`.
9. `bun run at:verify req-016 --tier integration --expect` — exit 0. `12 P0: 12 green, 0 red, 0 missing`.

## Could not follow

I did not drive the two-seat vet through the edge route. `write_standing` uses a
scalar subquery for the seat and fails with "more than one row" before the
definer runs. The instruction forbids widening `write_standing` with the seat
holder's email. I left that function alone and called the definer as the
operator, the same path as the channel-hole body.

## Least sure

Whether `apply_discovery_grant_mark` being named in an earlier migration than
the one that creates it will bother a reviewer more than a second copy would.
PL/pgSQL resolves the name at run time. Integration replays every file before
any call.

## What the lead changed in review, 2026-09-11

Two things.

The lane put the `append_audit_event` signature change into
`supabase/migrations/20260912120000_audit_actor_on_product_paths.sql`. That migration is on the main
branch and belongs to an earlier item. A merged migration may already have run somewhere, so editing
it in place rewrites history instead of moving forward. The lead reverted that file and put the same
change at the top of this branch's own `20260914120000_org_vetting.sql`, as a drop and create with a
comment saying why it is there. The new argument defaults to null, so every six-argument caller in
the tree keeps its behaviour.

The definer now names the authorised channel set in SQL, and the shipped taxonomy names the same set
in TypeScript. That is a two-place rule with nothing holding the two together, which is the drift
this run pins everywhere else. The lead added `noticeChannelPinProblems` to the source arms, with its
oracle in the harness selftest: it reads the set out of the definer, compares it against
`channelsFor(taxonomyRow("vetting.outcome"))`, and throws rather than reporting agreement when it
cannot read either side.
