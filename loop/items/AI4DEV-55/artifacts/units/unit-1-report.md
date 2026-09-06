# Unit 1 report: cross-organisation denial with no existence oracle

Head: `1e6997f`. Branch: `ai4dev-55-unit-1`. Worktree: `/home/user/ai4good/.claude/worktrees/unit-1`.

The SQL policy set is the only tenant read rule. Authenticated edge functions forward the caller's token. The public page reads through a definer RPC. AT-001.21 and AT-001.22 are green at loop and at integration.

## What I built

`supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql` states the client privilege posture, revokes leftover client grants, grants SELECT to authenticated on the four isolated tables, adds `viewer_is_org_member`, four SELECT policies, `read_public_project`, and two indexes.

`supabase/functions/_shared/tenant-reads.ts` holds `TENANT_NOT_FOUND`, `TENANT_READ_FAILED`, the caller-bound `TenantReads` shape, and the pure `organizationDashboard` and `projectWorkspace` cores.

`supabase/functions/_shared/public-project.ts` holds `PROJECT_NOT_PUBLIC`, `PUBLIC_READ_FAILED`, `projectIsPublic` (true for every row today), the field-by-field projection, and `publicProjectAnswer`.

`supabase/functions/_shared/edge.ts` adds `callerReads` (Data API GET as the caller) and `publicProjectReads` (service-role RPC).

`supabase/functions/organization-dashboard/index.ts` is wiring only: POST, session liveness, a trimmed uuid, `callerReads`, the pure core.

`supabase/functions/project-workspace/index.ts` is the same shape for a project id.

`supabase/functions/public-project/index.ts` is the public page: `verify_jwt` is false, no session, `publicProjectReads` and `publicProjectAnswer`.

`supabase/config.toml` states `verify_jwt` for the three new functions and corrects the comment that said every function is authenticated.

`tests/at/harness/live-stack.ts` adds `restGet` and `functionPostRaw`.

`tests/at/harness/live-stack.selftest.ts` pins the request shape of those two helpers.

`tests/at/suites/req-001/_contract.ts` adds the viewer-read types and `AccountsSut` members, and corrects the comment that said `org_memberships` reaches no Data API role.

`tests/at/suites/req-001/_fixture.ts` runs the shipped cores over unfiltered Maps, and throws `CapabilityPending` from the four `…AsViewer` members and `tenantTableFacts`.

`tests/at/suites/req-001/_live.ts` adds `freshAccessToken`, `viewerRead`, the caller-bound members, and corrects the comment that said `projects` reaches no Data API role.

`tests/at/suites/req-001/_policy-scan.ts` is the static catalog guard over `supabase/migrations/*.sql`.

`tests/at/harness/shipped-tenant-reads.selftest.ts` drives the cores over injected reads.

`tests/at/harness/policy-scan.selftest.ts` drives each scan refusal and the throw on an empty directory.

`tests/at/suites/req-001/d-tenant-isolation.test.ts` registers AT-001.21 and AT-001.22 with per-tier bodies.

`tests/at/suites/req-001/_integration.ts` holds the integration bodies for those two ids.

`tests/at/expected/req-001.json` moves AT-001.21 and AT-001.22 to green at both tiers.

`tests/at/suites/req-001/_pending.ts` drops `D5_L1` and corrects the header counts to 23 written and 14 declared.

`tests/at/README.md` names `restGet`, `functionPostRaw`, and the two selftests.

## Gates

All commands ran from the worktree root on commit `1e6997f`.

1. `bun run typecheck` — exit 0. Summary: `typecheck OK: all three projects clean`.

2. `bun run at:check req-001` — exit 0. Summary: `RESULT: 37 P0 ids in bijection`.

3. `bun run at:selftest` — exit 0. Summary: `Test Files  15 passed (15)` / `Tests  199 passed (199)`.

4. `bun run at:verify req-001 --tier loop --expect` — exit 0. Summary: `37 P0: 23 green, 14 red, 0 missing` and `EXPECTED: the run matches /home/user/ai4good/.claude/worktrees/unit-1/tests/at/expected/req-001.json exactly (23 declared green, 14 declared red)`. AT-001.21 and AT-001.22 are green.

5. `bun run at:verify req-016 --tier loop --expect` — exit 0. Summary: `12 P0: 11 green, 1 red, 0 missing` and `EXPECTED: the run matches /home/user/ai4good/.claude/worktrees/unit-1/tests/at/expected/req-016.json exactly (11 declared green, 1 declared red)`.

6. Integration. `bun run db:stop` then `bun run db:start` from this worktree. `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format '{{json .Mounts}}'` showed Source `/home/user/ai4good/.claude/worktrees/unit-1/supabase/functions`. Then `bun run at:verify req-001 --tier integration --expect` — exit 0. Summary: `at:verify — 6 migrations expected, 6 applied — the rebuilt schema matches supabase/migrations exactly` and `37 P0: 18 green, 19 red, 0 missing` and `EXPECTED: the run matches /home/user/ai4good/.claude/worktrees/unit-1/tests/at/expected/req-001.json exactly (18 declared green, 19 declared red)`. AT-001.21 and AT-001.22 are green. Head on that run: `1e6997f`.

## Migration as the live catalog saw it

Six tables in `public`. Row-level security is on for all six. Force row-level security is off for all six. `anon` has SELECT on none.

`authenticated` has SELECT on `organizations`, `org_memberships`, `projects`, and `acknowledgments`. It has SELECT on neither `accounts` nor `volunteer_profiles`.

`service_role` keeps SELECT on `accounts` and `org_memberships` only.

Four policies exist, all `SELECT` to `authenticated`:

- `organizations_select_org_member` uses `viewer_is_org_member(id)`.
- `org_memberships_select_org_member` uses `viewer_is_org_member(org_id)`.
- `projects_select_org_member` uses `viewer_is_org_member(org_id)`.
- `acknowledgments_select_own_account` uses `account_id = (SELECT auth.uid())`.

No policy uses `true`. `accounts` and `volunteer_profiles` have no policy.

## Deviations

The public-project selftest cannot drive a source the predicate refuses. `projectIsPublic` returns true for every row, as the design states. The missing-source path returns `PROJECT_NOT_PUBLIC` by identity. The shipped function still has one `return PROJECT_NOT_PUBLIC` for both conditions. I did not invent a false predicate to exercise the second arm.

## Discovered work that belongs later

The assigned-volunteer success path, the platform-admin reach, and the logged-out visitor's UI redirect stay with unit 2.

Project publication and lifecycle own `projectIsPublic`. That rule is true for every row until that requirement lands.

An isolation matrix for later resources (storage objects, external task reads, drafts, ledger, files, thread) is a documentation change, not this unit.

Account type as a JWT claim is cheaper at listing scale. It is auth configuration and is not in this item.
