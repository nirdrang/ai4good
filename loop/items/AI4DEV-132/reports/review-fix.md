# AI4DEV-132 (Discovery credits engine) — review fix pass

Writer pass after the five-model panel. Branch `lane/ai4dev-132`. No SQL definer, no
migration, and no `discovery_allowance` change.

## The eleven changes

### 1. Cache tokens are metered (astra 2, grok 2, deepseek 2, opus 3)

`supabase/functions/_shared/anthropic-messages.ts` folds
`input_tokens + cache_creation_input_tokens + cache_read_input_tokens` in `answerFrom`
and in stream `observe`. A `message_delta` usage is folded when any of those fields is
present; otherwise the last input count is kept. The stand-in in
`tests/at/harness/vendors.ts` and `tests/at/harness/contracts.ts` accepts optional
`cacheCreationInputTokens` and `cacheReadInputTokens` and folds them the same way.
`tests/at/harness/vendors.selftest.ts` scripts a cache read and asserts the folded
count. `settlementFor` and SQL settle are unchanged. The turn is charged as if
uncached, which matches the reservation that counted the whole prompt.

### 2. An empty assistant reply never poisons the conversation (deepseek 1, opus 1)

`contextMessagesFrom` in `supabase/functions/_shared/discovery-turn.ts` skips a
settled pair whose `assistant_message` is the empty string. `discoveryPrepare` and
the fixture reserve twin in `tests/at/suites/req-004/_fixture.ts` both use it. The
stored row is unchanged; `p_counted_through_seq` still names the last settled seq.
`tests/at/harness/discovery-elicitation.selftest.ts` drives a tool-only settled turn
then a prepare, and asserts the built messages hold no empty content block.

### 3. A cancel before the provider answered is a definite failure (astra 3, deepseek 3, opus 4, opus 22)

In `anthropic-messages.ts` `stream`, an abort before `message_start` resolves
`{ ok: false, status: 499, reason: 'the client cancelled before the provider answered' }`.
The frame settles `failed` and releases the reservation. An abort after
`message_start` keeps the last cumulative usage, or the full output cap when no
`message_delta` arrived. The stand-in honours a signal already aborted at entry the
same way and does not consume a scripted reply. The elicitation selftest asserts the
499 failure settles as `failed`. The vendors selftest already-aborted case matches.

### 4. Prepare classifies its reads honestly and refuses a draft before counting (grok 1, deepseek 8, opus 21)

In `discoveryPrepare`, `needIntakeAnswer` status 502 throws (the frame answers 502
`refused`). Status 404 refuses `no-such-project` at 409. A need whose `stage` is not
`discovery_in_progress` refuses `need-not-in-discovery` at 409 before `countTokens`.

### 5. The switch is refused before the email floor on the route too (grok 4, astra 4, opus 8)

The early `refuseWrite('email-unverified', ...)` is gone from prepare. When
`caller.emailVerified` is false, prepare does not call `countTokens`. It returns the
args with `counted_input_tokens: 0` and the built request. The reserve definer then
applies `discovery-disabled`, then `email-unverified`. AT-001.10 and AT-004.41 stay
409 `email-unverified` at loop and integration.

### 6. No test encodes "no key" as the expected state (grok 3, opus 9)

In `tests/at/suites/req-001/_integration.ts`, the active control for
`discovery-message` asserts only that the outcome is not `account-deactivated`. The
502 and empty-messages assertions are gone. In `a-metering.test.ts`,
`proveKeylessAndAbandon` accepts a 502 with no row, or a settled or failed row, and
proves abandonment through the operator seam in both cases. AT-001.29 and AT-004.49
are green on this stack with the key.

### 7. The stream header is readable across origins (grok 6)

`DISCOVERY_STREAM_HEADERS` in `discovery-stream.ts` gains
`access-control-expose-headers: x-vercel-ai-ui-message-stream`. The stream selftest
header assertion matches.

### 8. A reader the policies admit gets the conversation (opus 14)

In `conversationAnswer`, a failed allowance read after a successful turns read
answers the conversation with `allowance: null`. Only a failed turns read is the
outage. The conversation type and the live adapter accept a null allowance.

### 9. The ledger names the model that was called (opus 15)

`MessagesPort` and `AnthropicMessagesPort` gain a `model` string (the override or
the pin in the Deno client; the pin in the stand-in). `discoveryPrepare` sets
`p_settings.model` and `request.model` from `port.model`. `buildModelRequest` takes
that model. AT-004.09's field-by-field compare and the source pins are unchanged.
`DiscoveryReserveSettings.model` is typed as `string` so an override type-checks.

### 10. The dead second streaming transport goes (opus 7)

The raw `create({ stream: true })` fallback and the `incompatible` heuristic are
deleted. `stream` uses `client.beta.messages.stream` plus `observe` and
`finalMessage()`. A thrown error is classified by `failure()`.

### 11. `verification.ts`'s stale sentence (opus 17)

The header that said no Discovery surface exists is one line: Discovery's send
route calls this gate before it reserves a turn.

## Checks

All eight from this worktree, after the edits. Integration ran with the provider
key and the Haiku override.

| Check | Exit | Last lines |
| --- | --- | --- |
| `bun run typecheck` | 0 | `typecheck OK: all three projects clean` |
| `bun run at:check req-004` | 0 | `RESULT: 58 P0 ids in bijection` |
| `bun run at:check req-001` | 0 | `RESULT: 38 P0 ids in bijection` |
| `bun run at:selftest` | 0 | `Test Files  33 passed (33)` / `Tests  445 passed (445)` |
| `bun run at:verify req-004 --tier loop --expect` | 0 | `58 P0: 20 green, 38 red, 0 missing` / expected match |
| `bun run at:verify req-001 --tier loop --expect` | 0 | `38 P0: 33 green, 5 red, 0 missing` / expected match |
| `bun run at:verify req-004 --tier integration --expect` | 0 | `58 P0: 10 green, 48 red, 0 missing` / expected match |
| `bun run at:verify req-001 --tier integration --expect` | 0 | `38 P0: 29 green, 9 red, 0 missing` / expected match |

## Commit

`c21d1ad9a707f7178448b9ffe6a45b9537a21b02` on `lane/ai4dev-132`.

## Deviations

- `DiscoveryReserveSettings.model` is `string` rather than the pin literal. Change 9
  writes the port's effective model into `p_settings`. The pin value, AT-004.09, and
  the source pins are unchanged.
- `readConversation` on the req-004 contract, and the live adapter, accept
  `allowance: null`. The previous type required an allowance object. Change 8 needs
  the null shape to type-check and to avoid treating a missing allowance as an outage.
- Context assembly is one helper, `contextMessagesFrom`, used by prepare and the
  fixture reserve twin, so the two builders cannot skip different pairs.

## Blockers

None.
