# Unit 5 writer report

AI4DEV-181 (Discovery backend wiring), branch `lane/ai4dev-181/unit5`.

The real port and signed-in route are implemented. The section J bodies run on the fixture shell at loop and the real route at integration. Completion is blocked by unreadable real model replies. All original integration greens were preserved. Nothing was pushed. No other agents were launched. The existing Supabase stack was not stopped, started, or restarted.

## Verification

| Command | Exit | Result |
|---|---:|---|
| `bun run typecheck` | 0 | All four projects clean |
| `bun run build` | 0 | 2,124 client modules and 81 SSR modules; chunk-size warning only |
| `bun run at:selftest` | 0 | 513 tests, 40 files; baseline 504 |
| `bun run at:check req-001` | 0 | 38 IDs in bijection |
| `bun run at:check req-002` | 0 | 27 IDs in bijection |
| `bun run at:check req-004` | 0 | 70 IDs in bijection |
| `bun run at:check req-032` | 0 | 13 IDs in bijection |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 47 green, 23 red, 0 missing; matches |
| `bun run at:verify req-001 --tier integration --expect` | 0 | 29 green, 9 red, 0 missing; matches |
| `bun run at:verify req-002 --tier integration --expect` | 0 | 19 green, 8 red, 0 missing; matches |
| `bun run at:verify req-003 --tier integration --expect` | 0 | 10 green, 3 red, 0 missing; matches |
| `bun run at:verify req-004 --tier integration --expect` | 1 | Final run: 24 green, 46 red, 0 missing; six real-model failures |
| `bun run at:verify req-016 --tier integration --expect` | 0 | 12 green, 0 red, 0 missing; matches |
| `bun run at:verify req-032 --tier integration --expect` | 0 | 1 green, 12 red, 0 missing; matches |

Every integration suite ran on its own reset. Each reset verified all 39 migrations. The final Discovery rerun used the final transport and driver code. Only its declaration was changed afterwards: the unstable usage test was returned to its original pending declaration. No test failures were converted into synthetic pending outcomes.

## Declaration changes

Loop: AT-004.67 (free file reads), AT-004.68 (background digest), and AT-004.69 (large-file parts) moved from `pending/sut-missing` to green. All section J loop bodies pass, preserving their original exact-copy assertions.

Integration: AT-004.62 (finish and open questions), AT-004.63 (Discovery document), AT-004.64 (review edits), AT-004.66 (read-only file controls), and AT-004.73 (desktop and phone panels) moved from `capability-pending/ui.discovery-surface` to green. AT-004.67 (free file reads) and AT-004.69 (large-file parts) moved from `pending/sut-missing` to green. This raises integration greens from 17 to 24.

AT-004.72 (usage and composer) was briefly declared green after a passing full run, then restored to its original pending declaration because the final run failed on its real model reply. No other requirement declarations changed.

The declaration cannot match while the newly executable tests report genuine model errors instead of their former pending shapes. AT-004.61, .65, .68, .70, .71, and .72 remain unproven. AT-004.10 (grant tracker conversation) and AT-004.46 (credit transparency) retain their existing pending bodies; their requested full-item conversion is unfinished. AT-004.11 remains green.

## Loop-only steps

- AT-004.67: the comparison using a $1.60 paid fuel balance. Funded-turn billing is pending.
- AT-004.72: the paid usage-bar scenario. Funded-turn billing is pending.
- AT-004.72: Buy fuel navigation. Project fuel checkout is pending.

These steps remain in their fixture bodies and are listed in `loopOnlySteps` in the expected manifest. Funding the three-file-limit scenario uses `funded_at` with zero fuel, so that file-limit check still runs at integration.

## Blocker and attempts

The failing command is `bun run at:verify req-004 --tier integration --expect`. Its final output includes:

```text
AT-004.61 red Error: The real model turn failed: the reply could not be read
AT-004.65 red Error: The real model turn failed: the reply could not be read
AT-004.68 red Error: The real model turn failed: the reply could not be read
AT-004.70 red Error: The real opening failed: the reply could not be read
AT-004.71 red Error: The real model turn failed: the reply could not be read
AT-004.72 red Error: The real model turn failed: the reply could not be read
70 P0: 24 green, 46 red, 0 missing
```

The running stack is configured for the OpenAI-compatible provider, model `space-bunny-free`, reasoning effort `low`. A direct request using the local provider implementation returned `reply` tool questions without the required `suggested` member; `parseReplyInput` rejected them. The provider serializer also dropped the existing tool's `strict: true`, so that forwarding was fixed and regression-tested. The tool descriptions and prompt now explicitly require both `suggestion` and `suggested`. Replies still fail intermittently; the preceding full run had 25 green tests, including usage.

Independent fixes completed during verification: explicit `Accept: text/event-stream` for the SDK transport; nested refusal mapping; renewal of the short-lived integration evidence token; actual model question order instead of scripted order; stored file facts instead of scripted prose; and waiting for a settled turn plus a new chat article instead of different prose. The parser was not weakened. No provider or model setting was changed. Model diagnosis exceeded 15 minutes, so further diagnosis and retries were stopped; working changes were committed and independent regressions were completed.

Edge files changed, including the conversation state endpoint and shared provider/reply modules. The edge runtime must load these updated files to serve them. The stack was not restarted, and loading every changed module in the existing runtime was not independently confirmed.

The route retains the existing inline sign-in pattern. The downstream volunteer/publishing route does not exist in this worktree; Find a volunteer returns to the existing root route.

## Files

Added:

- `src/lib/discovery-port.ts`
- `supabase/functions/_shared/openai-compatible-request.ts`
- `tests/at/harness/discovery-port.selftest.ts`
- `tests/at/harness/openai-compatible-messages.selftest.ts`
- `tests/at/suites/req-004/_screen-live.ts`
- `loop/items/AI4DEV-181/unit5-report.md`

Changed:

- `src/routes/discovery/$organizationId.$projectId.tsx`
- `supabase/functions/discovery-conversation/index.ts`
- `supabase/functions/_shared/discovery-turn.ts`
- `supabase/functions/_shared/discovery-reply.ts`
- `supabase/functions/_shared/openai-compatible-messages.ts`
- `tests/at/expected/req-004.json`
- `tests/at/harness/screen.ts`
- `tests/at/harness/screen-host.mjs`
- `tests/at/suites/req-004/_screen.ts`
- `tests/at/suites/req-004/_flows.ts`
- `tests/at/suites/req-004/j-need-brief.test.ts`
- `tests/at/suites/req-032/_files.ts`
- `tests/at/tsconfig.json`

Deleted:

- `src/lib/discovery-chat.ts`
- `tests/at/harness/discovery-chat.selftest.ts`

The generated `src/routeTree.gen.ts` had only a build-generated line-ending change; it was restored.
