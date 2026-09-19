# Unit 6 writer report: regeneration

## Landed

- Pin `DISCOVERY_REGENERATION_BOUND = 3` in metering, the at-config registry, the dotted key `req-004.discovery.regeneration_bound`, and the source-pin equality.
- Migration `20260924150000_discovery_billing_retry.sql` adds the `retry` billing value alone.
- Migration `20260924150100_discovery_retry_and_regeneration.sql` adds the retry-touches-no-credits check, re-creates reserve (retry when the latest turn is failed with the same message; sizes like free, reserved credits 0, no debit, guardrails active), settle (retry completed charges 0 and releases nothing), and begin (`regenerate` with the bound, the escalated row, and `discovery.regeneration_exhausted`), plus the event seed. Commit is unchanged.
- `decideDiscoveryScope` accepts `regenerate` with a trimmed reason and builds `p_notice` the way the off-topic settle notice is built. `p_settings` carries the bound on every begin.
- Taxonomy, notification copy, req-016 oracle and fixture-producer samples for `discovery.regeneration_exhausted`. The requirement line already existed.
- SUT `writeScope` regenerate, operator begin `action`/`reason`, fixture retry and bound rules matching SQL.
- Tests AT-004.37, .38 and .39 in `i-regeneration.test.ts`, green at both tiers in `req-004.json`. `req-016.json` is unchanged (already all green).

## Verify

| Command | Exit | Result |
|---|---|---|
| `bun run typecheck` | 0 | three projects clean |
| `bun run at:check req-004` | 0 | 58 P0 ids in bijection |
| `bun run at:selftest` | 0 | 34 files, 469 tests, all green |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 34 green, 24 red |
| `bun run at:verify req-001 --tier loop --expect` | 0 | 33 green, 5 red |
| `bun run at:verify req-016 --tier loop --expect` | 0 | 12 green, 0 red |
| `bun run build` | 0 | client and server builds completed |

`src/routeTree.gen.ts` was dirty after the build and is not in this commit.

## Deviations

none

## Choices the synthesis left open

1. The route answer has no `notice` field. `SCOPE_COPY.regenerationExhausted` is the lead sentence of the admin notification; the last reason is appended so the payload reaches the copy.
2. An escalated begin returns the `current` row as `scope` and the new `escalated` row in `scopes`.
3. AT-004.37 uses the route at loop and the operator path as `default` (integration and drill). A loop-plus-integration map with no default is refused by the harness.
4. Retry is chosen after a stale open turn is abandoned, so an abandoned row is not a retry. Guardrails stay active on retry (`billing <> 'fuel'`).
