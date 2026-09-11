# Unit 6 report: the profile edit, and who may not edit it

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

## What landed

No product change. The profile columns, the definer, the route, the registry row, and
`decideOrganizationProfile` already sit where unit 5 left them. This unit proves the edit path and
the refusal matrix.

AT-002.02 is green at both tiers. No other id moved.

The organisation adapters gained two operator members:

- `attemptProfileDefinerAsOperator` calls `public.set_organization_profile` with no TypeScript on
  the path. That is the database arm.
- `setMembershipRoleAsOperator` changes the role on the organisation's existing membership row. The
  unique seat forbids a second member, so a member of this organisation is that write, not a second
  grant.

## The edit half

The body opens a world. It writes a complete profile first, then edits all five fields to new
values. The stored row and the organisation dashboard both return the five edited values. The first
write is the Given; the second write is the edit.

## The refusal half

Each other caller is refused, and the five stored values stay the edited set.

| caller | TypeScript arm | database arm |
|---|---|---|
| the admin of a different NGO | `not-a-member` 403 | `not-a-member` |
| a volunteer | `not-an-ngo-account` 403 | not driven; the gate refuses before the definer |
| an unauthenticated visitor | `unauthenticated` 401 | not driven; there is no account id |
| a member of this organisation | `not-an-admin` 403 | `not-an-admin` |

The member Given is operator-provisioned. After the admin edit and the three named refusals, the
existing seat's role is changed to `member`. No product path writes that role. The unique index on
`org_id` is why.

## The checks

Run in the worktree. Exact exit status of each:

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 20 passed (20)`, `Tests 321 passed (321)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 11 green, 16 red, 0 missing`, matches the declaration, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 11 green, 16 red, 0 missing`, matches the declaration, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.

## Where the design of record was not followed, and why

- No change to the definer, the route, the registry row, or the decision function.
- The stack was not stopped.
- Two operator members were added because the refusal matrix cannot be driven without them: the
  database arm has no TypeScript path, and a member of this organisation cannot be seated through
  a product path.

## Least sure

Whether a later reviewer would rather seat the member on an unseated organisation instead of
changing the existing seat's role. The unique index forbids a second row in this organisation, so
the role change is the only way to hold a member here. The live SQL `detail` field did parse as
`not-a-member` and `not-an-admin`.
