# Unit 5 report: the organisation profile, created with all five fields

**The lead wrote this report, not the writer lane.** The lane was cancelled at turn 43, after it had
finished the work and while it was restarting the local stack. It never wrote a report of its own.
Everything below is the lead's own reading of the diff and the lead's own check runs.

## What landed

AT-002.01 is green at both tiers. AT-002.02 stays red for the next unit.

Four nullable columns join `public.organizations`: `mission`, `country`, `website` and `logo`. Each
carries the same non-empty check the `name` column already has. They are nullable because signup
creates the organisation with a name alone, and every existing row must stay valid.

`public.set_organization_profile` is a new definer. It writes all five fields in one statement. It
refuses a caller that is not `admin` of that organisation, and it refuses an empty value in any
field. Execute is revoked from public, anon, authenticated and service_role, then granted to
service_role alone, which is the pattern the other write definers follow.

`set-organization-profile` is a new edge route beside the rename route, with a row in the write-route
registry and a block in the stack config. Its standing is `account-required` admitting `ngo`.
`decideOrganizationProfile` sits beside `decideOrganizationRename` in the shared memberships module
and applies the same admin-of-this-organisation rule.

`update-organization` is unchanged and `decideOrganizationRename` keeps its name, as graft G6
requires. The overlap on the `name` field is deliberate: the profile route is one door for the first
completion and for every later edit.

The organisation dashboard projection carries the four new fields, so the profile renders.

## The compatibility fixes graft G7 predicted

Both predicted breakages were real and both are fixed rather than weakened.

- `tests/at/harness/shipped-tenant-reads.selftest.ts`: the tenant-read selftest builds an
  organisation projection by hand. It now carries the four fields as null, and the expected
  dashboard carries them as null too.
- `tests/at/suites/req-001/`: the isolation fixture builds organisation rows in four places, and the
  exhaustive `WriteSubject` union and write-route maps refuse to compile until the new route has a
  row. Each place now carries the new shape. The rename path preserves the four profile values
  rather than dropping them, which the previous one-field write could not get wrong.

## The checks, run by the lead

| check | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run at:check req-002` | 0 |
| `bun run at:selftest` | 0 |
| `bun run at:verify req-002 --tier loop --expect` | 0 |
| `bun run at:verify req-001 --tier loop --expect` | 0 |
| `bun run at:verify req-016 --tier loop --expect` | 0 |
| `bun run at:verify req-002 --tier integration --expect` | 0 |
| `bun run at:verify req-001 --tier integration --expect` | 0 |
| `bun run at:verify req-016 --tier integration --expect` | 0 |

The acceptance body opens a world. It writes all five fields, reads the row back, and then asserts
the dashboard returns each of the five unchanged. The criterion asks for persistence and rendering,
so both halves are asserted.

## Open carry

The profile route demands all five fields on every call. A caller cannot clear one field back to
null through the route. No criterion asks for that, and AT-002.02 edits all five together, so the
shape is correct for what the requirement reads. It is a limit worth naming if a later requirement
asks for an optional field.

## What the lane did to the environment

The lane ran `bun run db:stop` to make the stack pick up the new function, and it was cancelled
before it could start the stack again. The lead started the stack and ran every check afterwards.
