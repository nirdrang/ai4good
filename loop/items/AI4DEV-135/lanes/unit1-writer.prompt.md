You are the writer for unit 1 of the scope run. You apply a fixed design; you do not redesign it.
Working directory: your own git worktree on branch `lane/ai4dev-135/unit1`. Commit there. Never
touch any other folder. Never push.

## Read first, in this order
1. `loop/items/AI4DEV-135/design/SYNTHESIS.md`. This is the contract. Unit 1 is "Scope contract" in
   its build order. Everything it assigns to units 2 to 6 stays out of this unit.
2. `loop/items/AI4DEV-135/design/how.md`, sections "How it works", "Gotchas", "Verbatim captures"
   and "Attachment points (1)".
3. `loop/items/AI4DEV-135/brief.md`, "Facts from the repository".
4. `loop/bringup/AI4DEV-3-at-harness.md` lines 98 to 158 (the suite rules).
5. The code you will change: `supabase/functions/_shared/discovery-turn.ts`, `discovery-prompt.ts`,
   `discovery-reads.ts`, `anthropic-messages.ts`, `edge.ts` (the write route pipeline and
   `callerReads`), `write-routes.ts`, `need-intake.ts`, the migrations
   `supabase/migrations/20260920120000_discovery_turns.sql` and
   `20260923120100_organization_discovery_switch.sql` (the reserve function is the model for
   `discovery_scope_begin`), `supabase/functions/discovery-message/index.ts`,
   `supabase/functions/discovery-conversation/index.ts`, and under `tests/at/suites/req-004/`
   every `_*.ts` file, `d-conversation.test.ts`, `z-later-runs.test.ts`, `fixtures/grant-tracker.ts`;
   `tests/at/expected/req-004.json`; `tests/at/harness/atconfig.ts`, `config.ts`, `vendors.ts`,
   `contracts.ts`; `tests/at/suites/req-001/_policy-scan.ts` (TENANT_CATALOG);
   `tests/at/suites/req-001/_write-route-scan.ts`.

## What unit 1 lands
- Migration A from the synthesis (`discovery_scopes` table, enum, constraints, indexes, the
  tenant-isolated posture). Pick the timestamp after the latest existing migration.
  `TENANT_CATALOG` gains `discovery_scopes` as tenant-isolated.
- `discovery_scope_begin` and `discovery_scope_commit` as the synthesis specifies, with only the
  `generate` action live. `p_action` other than `generate` raises `invalid-request` for now
  (units 4 and 6 add the others). `p_bound` and `p_notice` exist in the signature and are unused.
  Both functions: security definer, `set search_path = ''`, `assert_account_active`, revoke from
  public, anon, authenticated, service_role, then grant to service_role.
- `supabase/functions/_shared/scope.ts`: the contract type, `RECORD_SCOPE_TOOL`, `parseScope`,
  `canonicalLabel`, `buildScopeRequest`, `SCOPE_REQUEST_MESSAGE`, `renderScopeMarkdown` (the
  structural document: one heading per contract field, lists for the lists; unit 2 adds copy),
  `ScopeSqlRow`, `ScopeView`, `scopeViewFromSql`, `decideDiscoveryScope`, `scopeAct`,
  `renderDiscoveryScope`. Relative imports only. No `deliver(` anywhere. `normaliseLabels` is
  unit 4; in unit 1 `parseScope` keeps the labels as canonicalLabel of each, deduplicated, at most
  three, and `commit` stores them on the scope row only (the need's `cause_labels` is unit 4).
- `supabase/functions/discovery-scope/index.ts`, the `WRITE_ROUTES` row, the `config.toml` block,
  the new refusal kinds in `WRITE_REFUSAL_KINDS`.
- `DiscoveryModelRequest.tools` widened and `toolChoice` added; `paramsFor` and `countTokens` in
  `anthropic-messages.ts` forward `tool_choice`; the sim in `tests/at/harness/vendors.ts` records
  it on the request record (add `toolChoice` to `ModelRequestRecord` in `contracts.ts`).
- `discovery-conversation` answers `scopes` and `scope`; `CallerReads.discoveryScopesOf`;
  `d-conversation.test.ts`'s resume assertion gains `scopes: []` and `scope: null`.
- `DiscoveryMessageOutcome` and `renderDiscoveryMessage` gain `scopeReady: boolean` (the latest
  non-null elicitation, this turn's included, has `complete: true`). The stream's `data-turn`
  carries it through the same render; no new stream part.
- `discovery-skills/06-write-the-scope.md` as the synthesis describes; then `bun run discovery:skills`
  and confirm `tests/at/harness/discovery-skills.selftest.ts` passes.
- The pin `req-004.discovery.cause_labels_max` = 3 in `atconfig.ts` and `config.ts`, the constant
  `SCOPE_CAUSE_LABELS_MAX` in `scope.ts`, and the equality in `_source-pins.ts`.
- Tests: move AT-004.20 and AT-004.22 out of `z-later-runs.test.ts` into a new
  `g-scope-output.test.ts` (loop bodies as the synthesis sketches; integration
  `awaiting(AWAITED.anthropicLive)`), and in `tests/at/expected/req-004.json` move both ids from
  `red` to `green` at loop and to `red` under `vendors.anthropic` at integration. `_contract.ts`:
  `DiscoverySut.writeScope` and `scopeRows`. `_fixture.ts`: the in-memory scope table and the
  route's begin, act and commit through the same pure functions. `_live.ts`: the function call and
  the SQL read of `discovery_scopes`. `fixtures/scope-tiers.ts`: one full `record_scope` reply
  for the grant tracker (a tier1 scope; units 2 and 4 add the other fixtures).

## Rules
- Match the surrounding code: naming, the write-route pipeline, refusal shapes, the sim's script
  shape, how `_fixture.ts` mirrors SQL. Read before you write.
- Comments: only a non-obvious why the code cannot show. No phase narration, no restating the
  synthesis.
- No feature beyond the list above. No abstraction for one caller.
- The suite rules: tests interact through the SUT only; capture once, assert many; pinned numbers
  come from `h.config.get`, never literals in a test body.
- If the synthesis is silent on a detail, follow the nearest existing pattern in the tree and note
  the choice in your report. If the synthesis is wrong about a fact of the tree, do not work around
  it silently: stop that part, keep the rest, and name it in the report under "Deviations".

## Verify before you commit, in this order, and record each exit code in the report
1. `bun run typecheck`
2. `bun run at:check req-004`
3. `bun run at:selftest`
4. `bun run at:verify req-004 --tier loop --expect`
5. `bun run at:verify req-001 --tier loop --expect` (the write-route and tenant catalog scans)
6. `bun run at:verify req-003 --tier loop --expect`
7. `bun run at:verify req-016 --tier loop --expect` (the sole-writer scan sees `scope.ts` now)
8. `bun run build`
Fix what is red. Do not edit an expected manifest of another requirement to make it pass; if one
goes red, that is a deviation to report.

## Commit and report
Commit on your branch with a message that starts `AI4DEV-135: unit 1,` and says what landed, in
plain sentences. One commit is fine; two if the migration and the tests read better apart.
Write your full report to `loop/items/AI4DEV-135/lanes/unit1-writer.report.md` in your worktree
and include it in the commit. The report has: Landed (files), Verify (the eight commands with exit
codes and green/red counts), Deviations (or "none"), Choices the synthesis left open (or "none").
Reply with five lines at most: the commit sha, the eight exit codes, and the report path.
