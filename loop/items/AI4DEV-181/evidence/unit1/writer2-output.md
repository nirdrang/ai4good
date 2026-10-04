Unit 1 of AI4DEV-181 (Discovery wired to backend) is on `lane/ai4dev-181/unit1`. The brief can be stored, edited, accepted, and finished over HTTP, and a conversation read returns that brief beside the existing conversation. Nothing was pushed.

The rules module from step 1, `supabase/functions/_shared/discovery-brief.ts`, is unchanged. The selftest that already covered those rules now also calls the write shaper, so typecheck sees it.

## Commits

| Hash | Subject |
| --- | --- |
| `98dc1e504d3c0f104bd0323d315a16f6225ea815` | loop: the discovery brief rules (AI4DEV-181) |
| `e48bf76aca94c4bd8de4567dc1cd423176ce5818` | loop: the discovery brief store (AI4DEV-181) |
| `a6e674b3ebe601dad654e68ab1b0ce50bb463ae7` | loop: the discovery brief edge route (AI4DEV-181) |
| `5cab9c6b7502b1e1a142c0deaafa41afc57fd09a` | loop: discovery conversation returns the brief (AI4DEV-181) |
| `e7c6cbcbc9670865a371a6cc6bef5206b908309f` | loop: the brief route joins the write gate (AI4DEV-181) |
| `f63c9d6b2c062b905105995ccd358e4811cbb300` | loop: unit 1 live proof of the brief store (AI4DEV-181) |

The fifth commit exists because registering the route made the account-deactivation check incomplete. A deactivated account is refused for deactivation on this route too. On the live stack, an active account is only required not to be refused for deactivation, because that check has no opening brief to edit. The loop fixture still requires the decision to accept a well-shaped edit.

## Checks

| Check | Exit | Result |
| --- | --- | --- |
| `bun install --frozen-lockfile` | 0 | dependencies already matched the lockfile |
| `bun run typecheck` | 0 | all four projects clean |
| `bun run at:selftest` | 0 | 487 tests passed, 36 files |
| `bun run at:check req-004` | 0 | 70 acceptance ids in bijection |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 44 green, 26 red, matching the expected file |
| `bun run at:verify req-004 --tier integration --expect` | 0 | 17 green, 53 red, matching the expected file. 35 migrations applied |
| `bun loop/items/AI4DEV-181/evidence/unit1/prove.ts` | 0 | 8 passes |

The live proof seeded revision 1 as the operator, then over HTTP edited, accepted, finished, and edited again. The reads were revisions 2, 3, 3, and 4. The confirmation remains stored at revision 3 after the later edit. A stale base answered `stale-revision` with revision 4. The transcript is `loop/items/AI4DEV-181/evidence/unit1/transcript.txt`.

## Files

Added: the migration `supabase/migrations/20261002120000_discovery_brief_store.sql`, `supabase/functions/discovery-brief/index.ts`, `supabase/functions/_shared/discovery-brief-write.ts`, and `loop/items/AI4DEV-181/evidence/unit1/prove.ts` with its transcript.

Changed: `supabase/config.toml`, `supabase/functions/_shared/edge.ts`, `write-routes.ts`, `discovery-reads.ts`, `discovery-turn.ts`, the tenant catalog, the req-004 fixture and elicitation stub, the brief selftest, and the account write-gate cases in the req-001 contract, fixture, live adapter, and integration helper.

`discovery-conversation/index.ts` did not need an edit. It already returns `conversationAnswer`, and that answer now adds `brief`, `confirmation`, and `lines` beside `conversation` and `allowance`.

`src/routeTree.gen.ts` is still modified in the worktree from a line-ending change that was already there. It is not part of these commits.