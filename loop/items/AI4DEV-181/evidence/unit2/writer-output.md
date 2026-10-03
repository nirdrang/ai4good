Unit 2 of AI4DEV-181 (Discovery wired to backend) is committed on `lane/ai4dev-181/unit2`. The reply turn, the model adapters, and the database changes are in. The live proof was not run.

## Commits

- `078d4f75f1efc383a32fba435f1ca303ac504e40` feat: reply tool rules and incremental JSON text decoder (AI4DEV-181)
- `959dc19346ce2ef3022053472cb27d2af8dc4bd2` feat: one-credit Discovery reply turn and model adapters (AI4DEV-181)
- `b7f20b862e0e39b6a568012817ac90b865d0449b` fix: omit a null assistant message from the turn view (AI4DEV-181)
- `094e72e4b95fe5e79ce1e978823e0f849b55f77d` test: add the live Discovery reply proof (AI4DEV-181)

Nothing was pushed. The worktree is clean.

## Checks

| Check | Exit | Count |
| --- | --- | --- |
| `bun install --frozen-lockfile` | 0 | 641 installs, no changes |
| `bun run typecheck` | 0 | all four projects clean |
| `bun run at:selftest` | 0 | 38 files, 494 tests (487 before this unit) |
| `bun run at:check req-004` | 0 | 70 priority ids in bijection |
| `bun run at:check req-001` | 0 | 38 priority ids in bijection |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 44 green, 26 red, matches the declaration |
| `bun run at:verify req-001 --tier integration --expect` | 0 | 29 green, 9 red, matches |
| `bun run at:verify req-002 --tier integration --expect` | 0 | 19 green, 8 red, matches |
| `bun run at:verify req-003 --tier integration --expect` | 0 | 10 green, 3 red, matches |
| `bun run at:verify req-004 --tier integration --expect` | 0 | 17 green, 53 red, matches |
| `bun run at:verify req-016 --tier integration --expect` | 0 | 12 green, 0 red, matches |
| Live proof | not run | see below |

The first attempt at the last integration check was cut off by a timeout after the database reset had started. The rerun took over that dead lock and finished with the result above.

## What the code does

A Discovery reply is one credit. The daily grant stays 10, or 30 when the organisation is vetted. Free is used before fuel. There is no beta counter in the new usage function. The opening reply is unique per project, creates brief revision 1, and costs nothing. Sending the same user message id again returns the stored turn and charges nothing. A wrong expected charge is refused as `mode-changed` before any debit.

The model side keeps the Anthropic adapter and adds an OpenAI-compatible one. `DISCOVERY_PROVIDER` chooses. When that variable is unset, the Anthropic path stays as it was. The forced tool is `reply`. Its `text` field is read with an incremental JSON string decoder as the arguments stream in. An old request that has no reply mode still uses `record_elicitation` and the token-priced reserve, so the existing suites keep passing.

## Files

Added:

- `supabase/functions/_shared/json-text-decoder.ts`
- `supabase/functions/_shared/discovery-reply.ts`
- `supabase/functions/_shared/openai-compatible-messages.ts`
- `supabase/migrations/20261003120000_discovery_billing_opening.sql`
- `supabase/migrations/20261003120100_discovery_reply_turn.sql`
- `tests/at/harness/json-text-decoder.selftest.ts`
- `tests/at/harness/discovery-reply.selftest.ts`
- `loop/items/AI4DEV-181/evidence/unit2/prove.ts`

Changed:

- `supabase/functions/_shared/discovery-brief.ts`
- `supabase/functions/_shared/discovery-turn.ts`
- `supabase/functions/_shared/discovery-reads.ts`
- `supabase/functions/_shared/discovery-stream.ts`
- `supabase/functions/_shared/anthropic-messages.ts`
- `supabase/functions/_shared/edge.ts`
- `supabase/functions/_shared/write-routes.ts`
- `supabase/functions/discovery-message/index.ts`
- `supabase/functions/discovery-conversation/index.ts`

No acceptance test body was changed. No expected-results declaration was changed.

## Tests left on the old contract

Their acceptance text still describes the beta counter, the token-priced charge, or the old tool, so the bodies were left as they are.

- AT-004.01 (daily grant through metered turns), AT-004.03a (unvetted zero-credit remedies), AT-004.03b (vetted zero-credit remedies), AT-004.04 (funded project still free while beta remains), AT-004.06 (funding mid-conversation), AT-004.08 (daily reset keeps beta), AT-004.14 (stop at any time), AT-004.46 (remaining credits readable), AT-004.47 (one sponsored project’s beta grant), AT-004.48 (exhausted fuel falls back to free), AT-004.72 (one usage bar). These still follow the acceptance lines that name the 50-turn beta counter.
- AT-004.02 (pinned ratio with ceiling rounding). Its acceptance sentence already says each reply consumes exactly one free turn. The body still sends the old message and checks the ceiling of token micros. That is the path these suites still call, and it is why the loop run stays green. I did not retarget that test onto the new reply.
- AT-004.10 (grant tracker conversation), AT-004.12 (off-topic redirect), and AT-004.15 (funded project has no free-phase guardrail) still require the model tool to be `record_elicitation`. The scripted scope, label, and regeneration conversations still feed that same tool. Their acceptance text does not describe `reply`.
- I found no acceptance id whose text is the empty-message refusal. A request in the old shape, with no reply mode, still refuses a blank message. A reply with answers and an empty note is valid on the new path.

## Not done

The live proof did not run. The command was `bun run db:stop` and then `bun run db:start` from this worktree. The tool did not execute it. Its message was: “Auto mode blocked this action (Restarting the local Supabase stack stops and starts a process the user forbade touching, and the truncated exception does not authorize it).” I did not try a disguised restart.

A read-only inspect shows the running edge runtime mounts `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-181\supabase\functions`, the sibling worktree, not this one. A proof against the current API would hit the old Discovery function. The script is committed at `loop/items/AI4DEV-181/evidence/unit2/prove.ts`. There is no transcript beside it.

## Differences from the brief worth knowing

- The billing value `opening` is its own migration, `20261003120000`, and the rest is `20261003120100`. PostgreSQL cannot use a new enum value in the transaction that adds it.
- `assistant_message` stays text, because the existing tests compare it as a string. The persisted screen message, with its parts, is `assistant_ui`.
- Rows that have no user message id keep the old token-ratio checks. New reply rows are one credit. That new check is `not valid`, so history is not rewritten.
- The screen’s usage type still has the beta fields. The server copies the daily grant into them. The acceptance text still names beta, so removing the fields would break typecheck and the fixture shell.
- The OpenAI-compatible request does not send `strict: true`. The working probe omitted it.
- A turn with no stored assistant message omits that field. A stored one includes it. That is what made the conversation reload test match again.