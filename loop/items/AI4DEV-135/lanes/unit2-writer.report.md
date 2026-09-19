# Unit 2 writer report: rendering

## Landed

- `supabase/functions/_shared/scope-copy.ts` — `SCOPE_COPY` with `maintenance`, `lovablePricingUrl`, `dataTier.tier0|tier1|tier2`, `startSmall`, `ownership`.
- `supabase/functions/_shared/scope.ts` — `renderScopeMarkdown` carries the tier word, the start-small lead, the data-tier copy, the maintenance section, and the pricing link when recommended. `scopeMoneyProblems` scans the rendered document. `scopeAct` fails a generation whose document names a money word outside the allow-list.
- `supabase/functions/_shared/discovery-skills/06-write-the-scope.md` and regenerated `discovery-skills/index.ts` — the model is told not to name a project or build figure in money.
- `tests/at/suites/req-004/_source-absences.ts` — `scopeMoneySourceProblems` / `scanScopeMoneySource` over `scope.ts`, `scope-copy.ts`, the skill file, and the `record_scope` tool description.
- `tests/at/suites/req-004/fixtures/scope-tiers.ts` — volunteer-roster (tier0), grant-tracker (tier1), case-notes (tier2), and `scopeDocumentProblems`.
- `tests/at/suites/req-004/g-scope-output.test.ts` — AT-004.21 and AT-004.25. `z-later-runs.test.ts` no longer holds those ids.
- `tests/at/expected/req-004.json` — both ids green at loop and integration.
- `tests/at/harness/req004-absences.selftest.ts` — the source scan refuses an empty tree and flags a sneaked figure.

## Verify

| Command | Exit | Result |
|---|---|---|
| `bun run typecheck` | 0 | three projects clean |
| `bun run at:check req-004` | 0 | 58 P0 ids in bijection |
| `bun run at:selftest` | 0 | 34 files, 464 tests, all green |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 24 green, 34 red |
| `bun run at:verify req-016 --tier loop --expect` | 0 | 12 green, 0 red |
| `bun run build` | 0 | client and server builds completed |

AT-004.21 and AT-004.25 are green at loop and integration. `src/routeTree.gen.ts` was dirty after the build and is not in this commit.

## Deviations

none

## Choices the synthesis left open

1. The source scan in `_source-absences.ts` is named `scopeMoneySourceProblems`, as the unit prompt said. The runtime check on markdown is `scopeMoneyProblems` in `scope.ts`. The synthesis used one name for the scan.
2. The TypeScript scan reads quoted strings, not regex literals, so the detector in `scope.ts` is not treated as product copy. A `$` followed by `{` is interpolation and is skipped.
3. The skill line that used the word "cost" was rewritten, so the allow-list can stay the maintenance sentence and the pricing URL only.
4. AT-004.21 scripts the sneaked figure through the route at loop. Integration uses `default` with the same source scan and fixture render. The live vendor seam cannot script a `record_scope` reply.
5. The case-notes fixture sets `recommended: false` so the checker can assert the pricing link is absent.
6. `SCOPE_COPY.ownership` is rendered in the maintenance section. Copy keys for later units are not added.
7. The pricing link is built with concatenation so the renderer does not quote the URL a second time.
