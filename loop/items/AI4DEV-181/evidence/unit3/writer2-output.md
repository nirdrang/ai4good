Unit 3 of AI4DEV-181 (Discovery wired to backend) is committed. The worktree is clean. Nothing was pushed.

The [committed writer report](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-181-unit3/loop/items/AI4DEV-181/evidence/unit3/writer-output.md) contains the full file inventory, every amended acceptance sentence, test changes, and verification evidence.

Commits, with their exact subjects:

- `81271c4` — docs: apply d95 daily Discovery grants and remove lifetime limits (AI4DEV-181)
- `5187211` — feat: show daily Discovery turns without lifetime fields (AI4DEV-181)
- `39b3540` — feat: remove old Discovery requests and token-priced free turns (AI4DEV-181)
- `dc40b4a` — test: prove daily grants after historical replies and update auth requests (AI4DEV-181)
- `02a51e3` — docs: record unit 3 checks and acceptance changes (AI4DEV-181)

All final checks passed:

| Check | Exit | Counts/result |
|---|---:|---|
| Typecheck | 0 | Four projects clean |
| Harness selftests | 0 | 38 files, 495 tests |
| Acceptance bijection: requirement 001 | 0 | 38 IDs |
| Acceptance bijection: requirement 002 | 0 | 27 IDs |
| Acceptance bijection: requirement 004 | 0 | 70 IDs |
| Loop: requirement 002 | 0 | 20 green, 7 declared red; matches |
| Loop: requirement 004 | 0 | 44 green, 26 declared red; matches |
| Additional loop: requirement 001 | 0 | 33 green, 5 declared red; matches |
| Integration: requirement 001 | 0 | 29 green, 9 declared red; matches |
| Integration: requirement 002 | 0 | 19 green, 8 declared red; matches |
| Integration: requirement 003 | 0 | 10 green, 3 declared red; matches |
| Integration: requirement 004 | 0 | 17 green, 53 declared red; matches |
| Integration: requirement 016 | 0 | 12 green, 0 red; matches |
| Assemble pure requirements | 0 | 30 requirements |
| Extract isolates 002 and 004 | 0 | Both generated |
| Assembly check after commits | 0 | Exact reproduction |
| Decomposition check after commits | 0 | 30 bijections and dependency graph pass |
| Equivalent forbidden-name search | 0 | 368 nonbinary files, zero matches |
| Whitespace check | 0 | Clean |

Every integration reset applied all 38 migrations. No green result became red, and **no expected-results declaration changed**.

Acceptance text amended with `[d95]`, retaining every ID:

- AT-002.04, .05, .06, .07, .08, .26, .27, .28 — daily grants, UTC reset, vetting increase, consumed-turn preservation, and sponsorship limits.
- AT-004.01, .03a, .03b, .04, .06, .08, .09, .14, .46, .47, .48, .49, .72 — one-credit replies, daily-only limits, free-first routing, remedies, historical replies, and usage display.

Files: **4 added, 58 changed, 1 deleted**. Added the change order, migration `20261003120200_discovery_daily_reply_only.sql`, request-contract selftest, and writer report. Deleted `discovery-elicitation.selftest.ts`. The report lists all 58 changed paths individually.

The Discovery canvas revision remains for the design stage, as requested. External Claude review-artifact publication could not run because this session has no artifact-publishing tool or destination; the generated repository document is updated. `rg` was unavailable, so the exact requested pattern was checked with an equivalent Python scan.