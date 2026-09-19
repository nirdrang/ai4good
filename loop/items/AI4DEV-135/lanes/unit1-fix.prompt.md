You are the writer for the review fixes of unit 1 of the scope run. Working directory: your own
git worktree on branch `lane/ai4dev-135/unit1`, whose head `51e16e0` is unit 1 as first written.
Commit on top of it. Never touch any other folder. Never push.

Read first: `loop/items/AI4DEV-135/design/SYNTHESIS.md` (the contract), then
`loop/items/AI4DEV-135/lanes/unit1-writer.report.md` (what landed), then the files you change.
The lead reviewed the diff. Apply exactly these six fixes and nothing else.

1. **A stale `generating` row must never block generation.** In
   `supabase/migrations/20260924120000_discovery_scopes.sql` (edit the file in place; it is
   unmerged), replace `p_bound integer` in `discovery_scope_begin` with `p_settings jsonb`,
   validated the way `discovery_turn_reserve` validates its numeric settings: for now the one key
   `turn_deadline_seconds` (a positive integer); a missing or malformed setting raises
   `invalid-request`. On `generate`: if a `generating` row exists and its `opened_at` is younger
   than the deadline, raise `generation-in-flight` (add it to `WRITE_REFUSAL_KINDS` if unit 1 did
   not); if older, mark it `failed` with `settled_at = clock_timestamp()` first. Then
   `scope-already-generated` applies only to `current` or `superseded` rows, and the reopen path
   applies to the latest `failed` row as now. In `scope.ts`, `DiscoveryScopeArgs` gains
   `p_settings: { turn_deadline_seconds: number }` built in `decideDiscoveryScope` from
   `DISCOVERY_TURN_DEADLINE_SECONDS` (import from `discovery-metering.ts`); drop `p_bound`. Mirror
   the deadline rule in `_fixture.ts`'s `beginScope` using the harness clock the way the
   fixture's reserve mirrors `turn-in-flight`, and update `_live.ts`, the req-001 write-subject
   for this route, and any selftest that builds these args.
2. **Honour the per-NGO Discovery switch.** `discovery_scope_begin` refuses with
   `discovery-disabled` when `organizations.discovery_disabled_at` is not null, with the same
   sentence shape `discovery_turn_reserve` uses. Mirror it in `_fixture.ts` (the fixture already
   holds `switches`).
3. **The commit takes the project, and the pass-through is keyed on a null scope id.** Change
   `discovery_scope_commit` to `(p_account_id uuid, p_project_id uuid, p_scope_id uuid, p_outcome
   text, p_contract jsonb, p_markdown text, p_labels text[], p_served_model text, p_input_tokens
   integer, p_output_tokens integer)`. When `p_scope_id is null`, it is the pass-through for a
   `done` begin: lock the project, check membership as now, and return the project's snapshot
   (`scope` = the `current` row or null, `scopes`, `need`). When `p_scope_id` is not null, the row
   must belong to `p_project_id` and be `generating`, else `scope-not-open`. Remove the
   "completed with a null contract" pass-through. In `scope.ts`, `scopeAct`'s `done` branch sends
   `p_project_id: args.p_project_id, p_scope_id: null`; the other branches send both ids. Mirror
   in `_fixture.ts` and `_live.ts`.
4. **A stored contract that fails the parser is a defect, not a fallback.** In
   `scopeViewFromSql`, when `row.contract` is not null and `parseScope` returns null, throw
   `new Error('discovery_scopes row ' + row.id + ' holds a contract parseScope refuses')`. No
   `?? row.contract`.
5. **`renderScopeBegin`'s mission line** becomes
   `mission: typeof value.mission === 'string' ? value.mission : null`.
6. **`renderDiscoveryScope.changed`** becomes
   `value.changed === true || scope?.status === 'current'`. A failed generation is not a change
   (the route already answers the refusal).

Rules: match the surrounding code; no new comments except a non-obvious why; no feature beyond the
six fixes; the suite rules stay (pins from `h.config.get`, tests through the SUT).

Verify before you commit, in this order, and record each exit code:
1. `bun run typecheck`
2. `bun run at:check req-004`
3. `bun run at:selftest`
4. `bun run at:verify req-004 --tier loop --expect`
5. `bun run at:verify req-001 --tier loop --expect`
6. `bun run at:verify req-003 --tier loop --expect`
7. `bun run at:verify req-016 --tier loop --expect`
8. `bun run build`
Then `git checkout -- src/routeTree.gen.ts` if the build dirtied it; never commit that file.

Commit with a message that starts `AI4DEV-135: unit 1 review fixes,` and names the six fixes in
plain sentences. Append a section "## Review fixes" to
`loop/items/AI4DEV-135/lanes/unit1-writer.report.md` with the six fixes, the eight exit codes and
counts, and any deviation; include it in the commit. Reply with five lines at most: the commit
sha, the eight exit codes, and the report path.
