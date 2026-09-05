# Fix-1 report: act on the interrogate verdict

Head: `b631e60`. Branch: `ai4dev-55-fix-1`. Worktree: `/home/user/ai4good/.claude/worktrees/fix-1`.

All fourteen Act-on items from `artifacts/interrogate/verdict.md` landed. The Consider, Noted, and Dismissed sections were not built. The expect manifest was not changed. AT-001.24 stays capability-pending as declared.

## Items

1. Static catalog scan. `_policy-scan.ts` overlays drop policy, alter policy, disable and force row level security, drop table, drop function, `if not exists`, and quoted names. It refuses `grant all on all tables`, `grant ... to public`, and `alter default privileges` outright. It pins exact remaining privilege sets, requires `revoke all ... from anon, authenticated` after every catalog `create table`, refuses a policy `to anon`, `for all`, or with a tautological `using`, requires every `using` to name `auth.uid()` or a `public.viewer_` function, and applies the definer revoke rule to every `security definer` function. `policy-scan.selftest.ts` adds one negative selftest per refusal, covering the thirteen probe statements plus the extra forms the verdict named.

2. Live catalog check. `_live-tenant-reads.ts` `tenantTableFacts` reads `relforcerowsecurity`, every table privilege for `anon`, `authenticated` and `service_role`, and `has_function_privilege` execute for `anon` and `authenticated` on every definer function. `_contract.ts` replaces the old select-only facts with `TenantCatalogFacts`. `_integration.ts` `assertTenantCatalog` walks `public` tables both ways and pins the exact sets, including the `viewer_` execute set. The `20260906120000` header now says exactly what the two checks test.

3. Service role default privileges. `20260906120000_...sql` revokes all on the six tables from `service_role`, then re-grants `SELECT` on `accounts` and `org_memberships`. The live check pins `service_role` to exactly those two selects.

4. Public-page leak assertion. `_integration.ts` AT-001.22 and AT-001.24 parse `answer.body` and assert the exact key set `ok`, `organizationName`, `projectId`, `projectName`.

5. Read-time type conjunct. `_contract.ts` adds `retypeAccountAsOperator`. `_live.ts` and `_fixture.ts` implement it. AT-001.23 at integration retypes the seated volunteer to `ngo` without touching the seat, signs in again, and asserts the project read and workspace are denied.

6. Seat-refusal sentences. `20260907120000_...sql` raises `projects refuses assignment: the developer seat admits volunteer accounts only`. `_live.ts` matches `/developer seat admits volunteer accounts only/i`. `_fixture.ts` mirrors that reason. Occupancy stays `/single developer seat/i`. The two patterns are disjoint.

7. Viewer parser silence. `_live-tenant-reads.ts` `viewerRead` answers `{ ok: false, kind: 'refused', reason: 'a row did not match the expected shape' }` when any row of a 200 answer fails `mappedRows`.

8. Zero-argument policy predicates. `20260907120000_...sql` wraps `(select public.viewer_is_platform_admin())` in the four admin policies and `(select public.viewer_is_volunteer())` in the assigned-volunteer policy. `viewer_is_org_member(id)` is unchanged.

9. Duplicated helpers. `edge.ts` `publicProjectReads.source` is one `restJson` POST. `live-stack.ts` `functionPost` wraps `functionPostRaw`, which returns `url` and takes optional `ip`. `_live-tenant-reads.ts` collapses the three parse blocks into `functionOutcome`. `_live.ts` `claimsOf` replaces the four JWT decodes. `tenant-reads.ts` runs `seatsOf` and `projectsOf` under `Promise.all`. The two function shells drop `?? ''` on `Authorization`.

10. Live adapter file size. Viewer-read members and their helpers live in `_live-tenant-reads.ts` and are spread into the adapter. `_live.ts` is 861 lines.

11. Contract instead of raw stack. `_contract.ts` adds `organizationsAsViewer` and accepts `Session | null` on the four viewer reads, the dashboard, the workspace, and `publicProjectPage`. Both adapters implement that. `_integration.ts` no longer imports `live-stack.ts`.

12. Grok wrapper. `loop/work/grok-shim/grok` probes `grep -qs landlock /sys/kernel/security/lsm` on every run with no cache. Sandbox, permission-mode, and bash auto-allow rewrites fire only when the kernel lacks Landlock, each with one stderr line. `loop/work/grok-shim/README.md` is one paragraph. The committed copy is the live path.

13. Stated-posture comments. `_integration.ts` AT-001.16 and AT-001.17 arm 2, and `_source-scan.ts`, now say `anon` holds nothing and `authenticated` holds `SELECT` on the four tenant tables, filtered by policy. The anon 401 is the privilege layer for `anon`. `edge.ts` CORS paragraph covers six functions, one of which authenticates nothing. The `20260906120000` header names the two earlier migrations' superseded claims by file and names the earlier proof script's `authenticated` arm as superseded. Earlier migration files were not edited.

14. Small things. `20260906120000_...sql` drops the `org_memberships (account_id)` index. `edge.ts` `restJson` logs the read-failure `detail` once. `_integration.ts` renames `emptyViewerRows` to `viewerRows`. `_live-tenant-reads.ts` names the mapper `mappedRows`.

## Gates

All commands ran from the worktree root on commit `b631e60`.

1. `bun run typecheck` — exit 0. Summary: `typecheck OK: all three projects clean`.

2. `bun run at:check req-001` — exit 0. Summary: `RESULT: 37 P0 ids in bijection`.

3. `bun run at:selftest` — exit 0. Summary: `Test Files  15 passed (15)` / `Tests  219 passed (219)`.

4. `bun run at:verify req-001 --tier loop --expect` — exit 0. Summary: `37 P0: 25 green, 12 red, 0 missing` and `EXPECTED: the run matches /home/user/ai4good/.claude/worktrees/fix-1/tests/at/expected/req-001.json exactly (25 declared green, 12 declared red)`. AT-001.21, AT-001.22, AT-001.23 and AT-001.40 are green. AT-001.24 is capability-pending.

5. `bun run at:verify req-016 --tier loop --expect` — exit 0. Summary: `12 P0: 11 green, 1 red, 0 missing` and `EXPECTED: the run matches /home/user/ai4good/.claude/worktrees/fix-1/tests/at/expected/req-016.json exactly (11 declared green, 1 declared red)`.

6. Integration. `bun run db:stop` then `bun run db:start` from this worktree. `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format '{{json .Mounts}}'` showed Source `/home/user/ai4good/.claude/worktrees/fix-1/supabase/functions`. Then `bun run at:verify req-001 --tier integration --expect` — exit 0. Summary: `at:verify — 7 migrations expected, 7 applied — the rebuilt schema matches supabase/migrations exactly` and `37 P0: 20 green, 17 red, 0 missing` and `EXPECTED: the run matches /home/user/ai4good/.claude/worktrees/fix-1/tests/at/expected/req-001.json exactly (20 declared green, 17 declared red)`. AT-001.21, AT-001.22, AT-001.23 and AT-001.40 are green. AT-001.24 is capability-pending. Head on that run: `b631e60`.

7. `bash -n loop/work/grok-shim/grok` — exit 0. Summary: no output.

## Could not do as written

Nothing. The PATH prefix that points the runner at `loop/work/grok-shim` is the lead's, not this tree's. The README states that prefix. The committed wrapper is the live path.
