# Unit 3 writer report: scope as contract

## Landed

- `supabase/functions/_shared/scope.ts` — `ScopeView.projectId`, `ScopeContractRef`, and the two resolvers `scopeSourceForPrd` and `scopeReferenceForScorer`. They share one body. A missing version or a different project is `no-such-version`. A row that is not `current` or `superseded`, or that holds a null contract or markdown, is `not-settled`.
- `tests/at/suites/req-004/_pending.ts` — `prdAuthoring: 'prd.authoring'` and `backlogDerivation: 'backlog.derivation'`.
- `tests/at/suites/req-004/_source-absences.ts` — `scopeDecompositionProblems` over `scanScopeDecomposition`. A product file that reads `discovery_scopes` and writes a task, backlog, or issue is a problem. An empty input throws.
- `tests/at/suites/req-004/g-scope-output.test.ts` — AT-004.24 and AT-004.52. `z-later-runs.test.ts` no longer holds those ids.
- `tests/at/expected/req-004.json` — AT-004.24 red `backlog.derivation` at both tiers. AT-004.52 red `prd.authoring` at both tiers.
- `tests/at/harness/req004-absences.selftest.ts` — the real tree is clean; a synthetic file that reads the scope and inserts into `tasks` is flagged; an empty input throws.

No fixture or selftest built a `ScopeView` by hand. `scopeViewFromSql` now copies `project_id`.

## Verify

| Command | Exit | Result |
|---|---|---|
| `bun run typecheck` | 0 | three projects clean |
| `bun run at:check req-004` | 0 | 58 P0 ids in bijection |
| `bun run at:selftest` | 0 | 34 files, 466 tests, all green |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 24 green, 34 red |
| `bun run build` | 0 | client and server builds completed |

AT-004.24 is red under `backlog.derivation` at loop. AT-004.52 is red under `prd.authoring` at loop. `src/routeTree.gen.ts` was dirty after the build and is not in this commit.

## Deviations

`scopeRows` already maps SQL rows through `scopeViewFromSql` and returns `ScopeView[]`. The AT-004.52 loop body reads those views. It does not map them a second time.

## Choices the synthesis left open

1. Both named resolvers call one private `resolveScopeContract`. The scorer name is not an alias of the PRD function, so a caller still reads which consumer it serves.
2. The decomposition scan flags a supabase-js `.from('tasks')`, a SQL write to a task, backlog, or issue table, a REST path of that shape, or a function call whose name tokens include `task`, `backlog`, or `issue`.
3. AT-004.52 follows the AT-004.21 split: `loop` walks the generate route; `default` builds three `ScopeView` values by hand. The four pinned-version facts run on the `current` row. The `failed` and `generating` rows prove `not-settled`.
4. Version 1 and version 2 appear as literals because the unit prompt names them as the first generation and a missing later version.
