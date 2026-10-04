The real port and route are committed for AI4DEV-181 (Discovery backend wiring). **Verification is incomplete:** six integration tests fail with “the reply could not be read.” All original green tests remain green. Nothing was pushed; the worktree is clean.

Commits, with subjects exactly as recorded:

| Hash | Subject |
|---|---|
| `0f6affdf` | Wire the Discovery port and real route (AI4DEV-181) |
| `33515572` | Drive the real Discovery route with seeded signed-in users (AI4DEV-181) |
| `e16dcecd` | Preserve the strict Discovery reply tool at the provider boundary (AI4DEV-181) |
| `995d8417` | Run Discovery screen bodies against real backend state (AI4DEV-181) |
| `1293a11f` | Declare the proven Discovery backend screen checks green (AI4DEV-181) |
| `b3713b1f` | Request the Discovery edge event stream explicitly (AI4DEV-181) |
| `76bd2332` | Wait for saved Discovery replies and record new passing screens (AI4DEV-181) |
| `c4de6228` | Record unit 5 checks and the real-model blocker (AI4DEV-181) |

Checks:

| Command | Exit | Result |
|---|---:|---|
| `bun run typecheck` | 0 | Four projects clean |
| `bun run build` | 0 | 2,124 client modules; 81 SSR modules |
| `bun run at:selftest` | 0 | 513 tests; 40 files |
| `bun run at:check req-001` | 0 | 38 IDs |
| `bun run at:check req-002` | 0 | 27 IDs |
| `bun run at:check req-004` | 0 | 70 IDs |
| `bun run at:check req-032` | 0 | 13 IDs |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 47 green, 23 red; matches |

Each integration command ran separately as `bun run at:verify <req> --tier integration --expect`:

| Requirement | Exit | Green | Red | Matches |
|---|---:|---:|---:|---|
| req-001 | 0 | 29 | 9 | Yes |
| req-002 | 0 | 19 | 8 | Yes |
| req-003 | 0 | 10 | 3 | Yes |
| req-004 | **1** | **24** | **46** | **No** |
| req-016 | 0 | 12 | 0 | Yes |
| req-032 | 0 | 1 | 12 | Yes |

Every run had zero missing IDs.

Declaration changes:

- **Loop → green:** AT-004.67 (free file reads), AT-004.68 (background digest), AT-004.69 (large-file parts).
- **Integration → green:** AT-004.62 (finish questions), AT-004.63 (Discovery document), AT-004.64 (review edits), AT-004.66 (file controls), AT-004.67 (free file reads), AT-004.69 (large-file parts), AT-004.73 (desktop and phone panels).
- AT-004.72 (usage and composer) passed once, was promoted, then returned to its original pending declaration after failing the final run. No other requirement declarations changed.

Loop-only steps are the paid-fuel comparison in AT-004.67, and the paid usage scenario and Buy fuel navigation in AT-004.72. They depend on funded-turn billing or fuel checkout.

Files added:

- `src/lib/discovery-port.ts`
- `supabase/functions/_shared/openai-compatible-request.ts`
- `tests/at/harness/discovery-port.selftest.ts`
- `tests/at/harness/openai-compatible-messages.selftest.ts`
- `tests/at/suites/req-004/_screen-live.ts`
- `loop/items/AI4DEV-181/unit5-report.md`

Files changed:

- `src/routes/discovery/$organizationId.$projectId.tsx`
- `supabase/functions/discovery-conversation/index.ts`
- In `supabase/functions/_shared/`: `discovery-turn.ts`, `discovery-reply.ts`, `openai-compatible-messages.ts`
- `tests/at/expected/req-004.json`
- In `tests/at/harness/`: `screen.ts`, `screen-host.mjs`
- In `tests/at/suites/req-004/`: `_screen.ts`, `_flows.ts`, `j-need-brief.test.ts`
- `tests/at/suites/req-032/_files.ts`
- `tests/at/tsconfig.json`

Files deleted: `src/lib/discovery-chat.ts` and `tests/at/harness/discovery-chat.selftest.ts`.

The final failures are AT-004.61, .65, .68, .70, .71 and .72, all reporting unreadable real model replies. I verified missing required tool fields, fixed dropped `strict: true`, clarified the schema/prompt, and fixed stream negotiation. Failures persisted, so I stopped further model diagnosis under your 15-minute rule. AT-004.10 and .46 also retain their existing pending bodies.

Edge files changed and need the runtime to load them. **I did not restart the stack.** The downstream volunteer route is absent; its button returns to the root route.

The commands, failure output, attempts and full inventory are preserved in the [committed report](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-181-unit5/loop/items/AI4DEV-181/unit5-report.md).