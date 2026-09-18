# Unit 1 writer report: scope contract

## Landed

- `supabase/migrations/20260924120000_discovery_scopes.sql` — table, enum, tenant-isolated RLS, `discovery_scope_begin`, `discovery_scope_commit`.
- `supabase/functions/_shared/scope.ts` — contract, `RECORD_SCOPE_TOOL`, `parseScope`, `canonicalLabel`, `buildScopeRequest`, `SCOPE_REQUEST_MESSAGE`, structural `renderScopeMarkdown`, row/view types, `decideDiscoveryScope`, `scopeAct`, `renderDiscoveryScope`.
- `supabase/functions/discovery-scope/index.ts` — write route.
- `supabase/functions/_shared/discovery-skills/06-write-the-scope.md` and regenerated `discovery-skills/index.ts`.
- `supabase/functions/_shared/discovery-turn.ts` — tools union, `toolChoice`, conversation `scopes`/`scope`, `scopeReady`.
- `supabase/functions/_shared/discovery-reads.ts` — `discoveryScopesOf`.
- `supabase/functions/_shared/anthropic-messages.ts` — forwards `tool_choice`.
- `supabase/functions/_shared/write-routes.ts` — `discovery-scope` row and the new refusal kinds.
- `supabase/functions/_shared/edge.ts` — REST read of `discovery_scopes`.
- `supabase/config.toml` — `[functions.discovery-scope] verify_jwt = true`.
- Pins: `req-004.discovery.cause_labels_max` = 3 in `atconfig.ts` and `config.ts`, `SCOPE_CAUSE_LABELS_MAX`, equality in `_source-pins.ts`.
- `tests/at/suites/req-001/_policy-scan.ts` — `discovery_scopes` tenant-isolated.
- `tests/at/suites/req-004/` — `_contract.ts`, `_fixture.ts`, `_live.ts`, `g-scope-output.test.ts`, `fixtures/scope-tiers.ts`, `d-conversation.test.ts`, `z-later-runs.test.ts`, `tests/at/expected/req-004.json`.
- `tests/at/suites/req-001/_contract.ts`, `_fixture.ts`, `_live.ts`, `_integration.ts` — write-gate coverage for the new route.
- `tests/at/harness/discovery-elicitation.selftest.ts` — `discoveryScopesOf` on the mock reads.

## Verify

| Command | Exit | Result |
|---|---|---|
| `bun run typecheck` | 0 | three projects clean |
| `bun run at:check req-004` | 0 | 58 P0 ids in bijection |
| `bun run at:selftest` | 0 | 34 files, 458 tests, all green |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 22 green, 36 red |
| `bun run at:verify req-001 --tier loop --expect` | 0 | 33 green, 5 red |
| `bun run at:verify req-003 --tier loop --expect` | 0 | 13 green, 0 red |
| `bun run at:verify req-016 --tier loop --expect` | 0 | 12 green, 0 red |
| `bun run build` | 0 | client and server builds completed |

AT-004.20 and AT-004.22 are green at loop and red under `vendors.anthropic` at integration.

## Deviations

none

## Choices the synthesis left open

1. After a failed first generate, begin reopens the latest failed row as `generating`. Inserting version 1 again would hit `unique (project_id, version)`, and version 2 requires a reason. The unique-index and reason checks force this. AT-004.22 exercises the path.
2. `scopeReady` on a chat answer is this turn's elicitation completeness. Settle returns only this turn, so later chat turns without a new elicitation report false. The completing turn reports true.
3. Begin does not check email verification or the Discovery kill switch. The synthesis listed the begin checks and those two were not among them.
4. Commit treats `p_outcome = 'completed'` with a null contract as a pass-through snapshot. That is the `begun.done` path for later units. Generate never takes it.
5. The auth suite gained a `discovery-scope` write subject so every inventory row still has a deactivation gate. At loop the fixture runs decide only, matching `discovery-message`. At integration a missing model is not treated as deactivation.
6. `discovery-turn.ts` imports `RECORD_SCOPE_TOOL` as a type only. `scope.ts` type-imports the request types. That avoids a runtime cycle while keeping the tools union.
7. Begin returns vocabulary as `[]`. The `cause_labels` table is unit 4.

## Review fixes

1. A stale `generating` row no longer blocks generation. `discovery_scope_begin` takes `p_settings` with `turn_deadline_seconds` (a positive integer; missing or malformed raises `invalid-request`). A `generating` row younger than the deadline raises `generation-in-flight`; an older row is marked `failed` first. `scope-already-generated` applies only to `current` or `superseded`. `DiscoveryScopeArgs` carries `p_settings` from `DISCOVERY_TURN_DEADLINE_SECONDS`. The fixture mirrors the deadline on the harness clock the way reserve mirrors `turn-in-flight`.
2. `discovery_scope_begin` refuses with `discovery-disabled` when `organizations.discovery_disabled_at` is not null, with the same sentence as `discovery_turn_reserve`. The fixture mirrors it from `switches`.
3. `discovery_scope_commit` takes `p_project_id` and `p_scope_id`. A null scope id is the pass-through for a `done` begin: lock the project, check membership, return the snapshot (`scope` is the `current` row or null). A non-null id must belong to the project and be `generating`, else `scope-not-open`. The "completed with a null contract" pass-through is gone. `scopeAct` sends `p_scope_id: null` on `done` and both ids on the other branches. The fixture mirrors this.
4. `scopeViewFromSql` throws when `row.contract` is not null and `parseScope` returns null. There is no `?? row.contract` fallback.
5. `renderScopeBegin` sets `mission: typeof value.mission === 'string' ? value.mission : null`.
6. `renderDiscoveryScope.changed` is `value.changed === true || scope?.status === 'current'`. A failed generation is not a change.

### Verify

| Command | Exit | Result |
|---|---|---|
| `bun run typecheck` | 0 | three projects clean |
| `bun run at:check req-004` | 0 | 58 P0 ids in bijection |
| `bun run at:selftest` | 0 | 34 files, 458 tests, all green |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 22 green, 36 red |
| `bun run at:verify req-001 --tier loop --expect` | 0 | 33 green, 5 red |
| `bun run at:verify req-003 --tier loop --expect` | 0 | 13 green, 0 red |
| `bun run at:verify req-016 --tier loop --expect` | 0 | 12 green, 0 red |
| `bun run build` | 0 | client and server builds completed |

### Deviations

- `_live.ts` and the req-001 write-subject do not construct `DiscoveryScopeArgs` or commit args. They go through decide and the edge function, so they were left unchanged. No selftest builds these args.
- `generation-in-flight` was already in `WRITE_REFUSAL_KINDS`.
- `src/routeTree.gen.ts` was dirty before and after the build. It is not in this commit.
