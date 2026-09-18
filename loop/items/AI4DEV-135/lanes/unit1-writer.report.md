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
