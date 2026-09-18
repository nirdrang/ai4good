# Unit 4 writer report: cause labels

## Landed

- `supabase/migrations/20260924130000_cause_labels.sql` — table `public.cause_labels` with the canonical CHECK, `unreachable-by-client-roles` posture, and `create or replace` of `discovery_scope_begin` and `discovery_scope_commit`. Begin returns the vocabulary on generate and handles `remove-label`. Commit on `completed` inserts new labels `on conflict do nothing` and writes `need_intakes.cause_labels`. A failed commit touches neither.
- `tests/at/suites/req-001/_policy-scan.ts` — `cause_labels: 'unreachable-by-client-roles'`.
- `supabase/functions/_shared/scope.ts` — `normaliseLabels`; `scopeAct` normalises before commit; `decideDiscoveryScope` accepts `remove-label`; `renderDiscoveryScope` prefers an explicit `changed` boolean.
- `supabase/functions/_shared/discovery-skills/06-write-the-scope.md` and regenerated `index.ts` — name the vocabulary block, reuse an exact entry, mint only for a new domain, zero when unsure, at most three.
- `tests/at/suites/req-004/_source-absences.ts` — `labelCurationSurfaceProblems` over `scanLabelCurationSurface`. The `remove-label` action and the two definers are the allow-list. Empty input throws.
- `tests/at/suites/req-004/_contract.ts`, `_fixture.ts`, `_live.ts` — `seedCauseLabelsAsOperator`, `causeLabelRows`, `beginScopeAsOperator`, `commitScopeAsOperator`, and `writeScope` `remove-label`. The fixture keeps an in-memory vocabulary and a need-label overlay with the same rules.
- `tests/at/suites/req-004/fixtures/food-bank.ts` — food-bank intake, elicitation, mixed-case `['Food Security']` reply, and a thin `causeLabels: []` reply.
- `tests/at/suites/req-004/h-cause-labels.test.ts` — AT-004.58, .59, .60 moved out of `z-later-runs.test.ts`.
- `tests/at/expected/req-004.json` — .58 and .59 loop green, integration red `vendors.anthropic`; .60 green at both tiers.
- `tests/at/harness/req004-absences.selftest.ts` — real tree clean, synthetic `create-label` route flagged, synthetic grant flagged, empty input throws.

## Verify

| Command | Exit | Result |
|---|---|---|
| `bun run typecheck` | 0 | three projects clean |
| `bun run at:check req-004` | 0 | 58 P0 ids in bijection |
| `bun run at:selftest` | 0 | 34 files, 469 tests, all green |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 27 green, 31 red |
| `bun run at:verify req-001 --tier loop --expect` | 0 | 33 green, 5 red |
| `bun run at:verify req-003 --tier loop --expect` | 0 | 13 green, 0 red including AT-003.17 |
| `bun run build` | 0 | client and server builds completed |

AT-004.58 and AT-004.59 are green at loop and red under `vendors.anthropic` at integration. AT-004.60 is green at both tiers. `src/routeTree.gen.ts` was dirty after the build and is not in this commit.

## Deviations

none

## Choices the synthesis left open

1. A done begin still calls commit with `p_scope_id: null`. Commit cannot gain a parameter, so `changed` rides in `p_contract` as `{ changed }` and is echoed on the pass-through snapshot. `renderDiscoveryScope` uses an explicit boolean when present, otherwise `scope.status === 'current'`, so a no-op remove after a current scope reports `changed: false`.
2. AT-004.60 at integration uses `beginScopeAsOperator` and `commitScopeAsOperator` so a labelled need exists without the model. `seedTurnsAsOperator` gained an optional `elicitation` so begin can run.
3. AT-004.60 registers `default` (loop generate path) and `integration` (operator seed). A `loop` plus `integration` map with no `default` fails collection on the drill tier.
4. The curation scan treats `labels` as a subject token beside `label` and `taxonomy`. `remove-label`, `discovery_scope_begin` and `discovery_scope_commit` are the allow-list. Client-role grants on `cause_labels` are flagged.
5. The fixture overlays `need_intakes.cause_labels` in memory because the req-003 need store has no setter. The live adapter writes the table.
