The screen step helpers now live in `tests/at/suites/req-004/_flows.ts`. The test file keeps the imports, the screen opener, and the registered tests. No helper was renamed.

Commit `5256adad81bf80d369acdd507241f83afc18f644`: `loop: the screen step helpers move to their own file (AI4DEV-180)`.

Line counts:

| File | Before | After |
|---|---:|---:|
| `j-need-brief.test.ts` | 1128 | 682 |
| `_flows.ts` | did not exist | 465 |

Checks:

- `bun run typecheck` exited 0. All four projects were clean. The acceptance-test project includes every file under `tests/at`, so `_flows.ts` is in that project.
- `bun run at:selftest` exited 0. 35 files passed, 474 tests passed.
- `bun run at:check req-004` exited 0. 70 requirement ids are in bijection. The checker reads only files whose names end in `.test.ts`, so it does not read `_flows.ts`. The same run listed 11 suite files and did not list `_flows.ts`.
- `bun run at:verify req-004 --tier loop --expect` exited 0. 70 ids: 44 green, 26 red, 0 missing. The run matches the declaration exactly.