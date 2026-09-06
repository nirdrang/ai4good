# Unit 2 report: assigned-volunteer scope, platform-admin reach, the logged-out visitor

Head: `a246cad`. Branch: `ai4dev-55-unit-2`. Worktree: `/home/user/ai4good/.claude/worktrees/unit-2`.

The seat trigger refuses a non-volunteer assignee. Viewer predicates and policies admit the assigned volunteer and the platform admin. AT-001.23 and AT-001.40 are green at loop and at integration. AT-001.24 is capability-pending at both tiers after the API half.

## What I built

`supabase/migrations/20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql` adds the volunteer-seat trigger with two error codes and a validation block, `viewer_is_platform_admin`, `viewer_is_volunteer`, the assigned-volunteer policy with the type conjunct, four platform-admin policies, and `notify pgrst`.

`tests/at/suites/req-001/_contract.ts` adds `not-a-volunteer-account` to `AssignVolunteerOutcome`.

`tests/at/suites/req-001/_fixture.ts` mirrors the seat trigger in `assignVolunteerAsOperator`, in database trigger-name order: type check, then occupancy.

`tests/at/suites/req-001/_live.ts` classifies the trigger refusal by message first and SQLSTATE second, matching the volunteer-seat sentence before the occupancy pattern.

`tests/at/suites/req-001/_integration.ts` holds the integration bodies for AT-001.23, AT-001.40, and AT-001.24.

`tests/at/suites/req-001/d-tenant-isolation.test.ts` registers those three ids with per-tier bodies.

`tests/at/expected/req-001.json` moves AT-001.23 and AT-001.40 to green at both tiers, and AT-001.24 to capability-pending `ui.authenticated-surface-rendering` at both.

`tests/at/suites/req-001/_pending.ts` drops `D5_L2` and corrects the header counts to 26 written and 11 declared.

## Gates

All commands ran from the worktree root on commit `a246cad`.

1. `bun run typecheck` — exit 0. Summary: `typecheck OK: all three projects clean`.

2. `bun run at:check req-001` — exit 0. Summary: `RESULT: 37 P0 ids in bijection`.

3. `bun run at:selftest` — exit 0. Summary: `Test Files  15 passed (15)` / `Tests  199 passed (199)`.

4. `bun run at:verify req-001 --tier loop --expect` — exit 0. Summary: `37 P0: 25 green, 12 red, 0 missing` and `EXPECTED: the run matches /home/user/ai4good/.claude/worktrees/unit-2/tests/at/expected/req-001.json exactly (25 declared green, 12 declared red)`. AT-001.23 and AT-001.40 are green. AT-001.24 is capability-pending.

5. `bun run at:verify req-016 --tier loop --expect` — exit 0. Summary: `12 P0: 11 green, 1 red, 0 missing` and `EXPECTED: the run matches /home/user/ai4good/.claude/worktrees/unit-2/tests/at/expected/req-016.json exactly (11 declared green, 1 declared red)`.

6. Integration. `bun run db:stop` then `bun run db:start` from this worktree. `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format '{{json .Mounts}}'` showed Source `/home/user/ai4good/.claude/worktrees/unit-2/supabase/functions`. Then `bun run at:verify req-001 --tier integration --expect` — exit 0. Summary: `at:verify — 7 migrations expected, 7 applied — the rebuilt schema matches supabase/migrations exactly` and `37 P0: 20 green, 17 red, 0 missing` and `EXPECTED: the run matches /home/user/ai4good/.claude/worktrees/unit-2/tests/at/expected/req-001.json exactly (20 declared green, 17 declared red)`. AT-001.21, AT-001.22, AT-001.23 and AT-001.40 are green. AT-001.24 is capability-pending. Head on that run: `a246cad`.

## Migration as the live catalog saw it

Six tables in `public`. Row-level security is on for all six. Force row-level security is off for all six. `anon` has SELECT on none.

`authenticated` has SELECT on `organizations`, `org_memberships`, `projects`, and `acknowledgments`. It has SELECT on neither `accounts` nor `volunteer_profiles`.

`service_role` keeps SELECT on `accounts` and `org_memberships` only.

Nine policies exist, all `SELECT` to `authenticated`:

- `organizations_select_org_member` uses `viewer_is_org_member(id)`.
- `organizations_select_platform_admin` uses `viewer_is_platform_admin()`.
- `org_memberships_select_org_member` uses `viewer_is_org_member(org_id)`.
- `org_memberships_select_platform_admin` uses `viewer_is_platform_admin()`.
- `projects_select_org_member` uses `viewer_is_org_member(org_id)`.
- `projects_select_assigned_volunteer` uses `assigned_volunteer_id = (SELECT auth.uid()) AND viewer_is_volunteer()`.
- `projects_select_platform_admin` uses `viewer_is_platform_admin()`.
- `acknowledgments_select_own_account` uses `account_id = (SELECT auth.uid())`.
- `acknowledgments_select_platform_admin` uses `viewer_is_platform_admin()`.

No policy uses `true`. `accounts` and `volunteer_profiles` have no policy.

## Deviations

The live adapter matches the volunteer-seat sentence before the occupancy pattern. The occupancy pattern is `/single developer seat/i`. The volunteer-seat sentence also names a developer seat. Matching occupancy first would label a type refusal as `seat-occupied`.

The five new policies carry one-sentence comments, matching unit 1. The unit 2 sketch omitted those comments.

## Discovered work that belongs later

The logged-out visitor's authenticated-surface redirect stays with the leaf that wires the auth screens. AT-001.24 keeps the named capability until that leaf lands.

Account type as a JWT claim is cheaper at listing scale. It is auth configuration and is not in this item.

An isolation matrix for later resources (storage objects, external task reads, drafts, ledger, files, thread) is a documentation change, not this unit.
