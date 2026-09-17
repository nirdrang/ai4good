# Review fix lane: the act-on findings of the five-model panel

You are the writer for the fix pass after the review panel on the credits engine run. You
work in this worktree on branch `lane/ai4dev-132`. You may edit, create and run anything
under it. Use PowerShell syntax if you shell out; you are on Windows. Never use Bash syntax.
The local stack is up from this worktree and its functions hold a provider key with a Haiku
override (`supabase/functions/.env`, git-ignored; never read, print or stage it). Do not stop
or start the stack.

## Read first

1. `loop/items/AI4DEV-132/review/astra.md`, `grok.md`, `deepseek.md`, `opus.md` (and
   `muse.md` if present). The findings below cite them by lane and number.
2. `loop/items/AI4DEV-132/reports/live-verify.md` (seven of seven live checks green on the
   Haiku override; the recording refused on its oracle).
3. `supabase/functions/_shared/anthropic-messages.ts`, `discovery-turn.ts`,
   `discovery-metering.ts`, `discovery-stream.ts`, `edge.ts` (the stream branch and
   `callerReads`), `need-intake.ts` (`needIntakeAnswer` and the need's `stage`);
   `tests/at/harness/contracts.ts`, `vendors.ts`, `vendors.selftest.ts`,
   `discovery-elicitation.selftest.ts`; `tests/at/suites/req-004/_fixture.ts` (the reserve
   twin and its context assembly), `a-metering.test.ts` (`proveKeylessAndAbandon`),
   `tests/at/suites/req-001/_integration.ts` lines 2500 to 2528.

## The changes, each traceable to a finding

1. **Cache tokens are metered** (astra 2, grok 2, deepseek 2, opus 3). The port's `usage.inputTokens`
   is `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`, in `answerFrom`
   and in the stream's `observe` (the `message_start` usage carries the cache fields; a
   `message_delta` usage may carry them too, take them when present). The turn is charged
   as if uncached, which matches the reservation that counted the whole prompt; the cache
   saving stays with the platform in this run. The stand-in's scripted usage gains optional
   `cacheCreationInputTokens` and `cacheReadInputTokens` that the port folds the same way;
   one selftest case scripts a cache read and asserts the folded count. `settlementFor` and
   the SQL settle need no change.
2. **An empty assistant reply never poisons the conversation** (deepseek 1, opus 1). In
   `discoveryPrepare` and in the fixture's reserve twin, the context skips a settled pair
   whose `assistant_message` is the empty string (both the user and the assistant message
   of that pair). The stored row is unchanged. A selftest or the elicitation selftest drives
   a tool-only settled turn followed by a prepare and asserts the built messages hold no
   empty content block.
3. **A cancel before the provider answered is a definite failure** (astra 3, deepseek 3,
   opus 4, opus 22). In `stream`, an abort before `message_start` resolves
   `{ ok: false, status: 499, reason: 'the client cancelled before the provider answered' }`,
   so the frame settles `failed` and releases the reservation. An abort after
   `message_start` keeps today's rule: the last cumulative usage, or the full output cap
   when no `message_delta` arrived. Update the elicitation selftest's stopped-turn case
   accordingly and add the before-start case to the stand-in's stream (`sim.stream` honours
   a signal already aborted at entry the same way).
4. **Prepare classifies its reads honestly and refuses a draft before counting** (grok 1,
   deepseek 8, opus 21). `needIntakeAnswer` status 502 throws (the frame answers 502
   `refused` like every read outage); 404 refuses `no-such-project` at 409 (the SQL status);
   a need whose `stage` is not `discovery_in_progress` refuses `need-not-in-discovery` at
   409 before `countTokens`. Read `need-intake.ts` for the stage field's name.
5. **The switch is refused before the email floor on the route too** (grok 4, astra 4,
   opus 8). When `caller.emailVerified` is false, prepare does not call `countTokens`; it
   returns the args with `counted_input_tokens: 0` and the built request, and the reserve
   definer applies its own order (`discovery-disabled`, then `email-unverified`). Delete the
   early `refuseWrite('email-unverified', ...)` from prepare. AT-001.10 and AT-004.41 stay
   409 `email-unverified` keyless because SQL raises it; check both at loop and integration.
6. **No test encodes "no key" as the expected state** (grok 3, opus 9). In
   `req-001/_integration.ts`, the active control for `discovery-message` asserts only that
   the outcome is not `account-deactivated` (an `ok: true` or any other refusal kind passes)
   and drops the 502 and the empty-messages assertions. In `a-metering.test.ts`,
   `proveKeylessAndAbandon` accepts either shape from the deployed send (a 502 with no row,
   or a settled or failed row) and proves the abandonment through the operator seam in both
   cases. Both ids stay green with and without a key in the function environment; you have
   the key case on this stack, the lead has the keyless case on CI.
7. **The stream header is readable across origins** (grok 6). `DISCOVERY_STREAM_HEADERS`
   gains `access-control-expose-headers: x-vercel-ai-ui-message-stream`. Update the stream
   selftest's header assertion.
8. **A reader the policies admit gets the conversation** (opus 14). In `conversationAnswer`,
   a failed allowance read after a successful turns read answers the conversation with
   `allowance: null`; only a failed turns read is the outage. The contract already allows a
   null allowance.
9. **The ledger names the model that was called** (opus 15). `MessagesPort` gains a `model`
   string property (the effective model: the override or the pin in the Deno client, the
   pin in the stand-in). `buildModelRequest` and `decideDiscoveryMessage`'s `p_settings.model`
   take it from the port (`discoveryPrepare(port, skills)` already has the port; set
   `p_settings.model` and `request.model` there). AT-004.09's field-by-field compare and the
   source pins are unchanged.
10. **The dead second streaming transport goes** (opus 7). The beta helper
    `client.beta.messages.stream` ran live on this stack with `betas` and `fallbacks`
    (live-verify.md). Delete the raw `create({ stream: true })` fallback and the
    `incompatible` heuristic; a thrown error from the helper is classified by `failure()`.
11. **`verification.ts`'s stale sentence** (opus 17): correct the comment that says no
    Discovery surface exists; one line, plain words.

## Must-nots

- No change to any SQL definer or migration. No new migration.
- `discovery_allowance` and its sentences are untouched.
- No key in any file. No `10` or `30` in a test body. No narrating comment. Exactly
  fifty-eight `atTest(` call sites stay.
- Do not touch `loop/items/` except to write your report.

## Checks you run

From this worktree: `bun run typecheck`, `bun run at:check req-004`, `bun run at:check req-001`,
`bun run at:selftest`, `bun run at:verify req-004 --tier loop --expect`,
`bun run at:verify req-001 --tier loop --expect`, `bun run at:verify req-004 --tier integration --expect`,
`bun run at:verify req-001 --tier integration --expect`. Run them until green. The integration
tier on this stack runs WITH the key and the Haiku override; declared results must hold. An
integration run resets the stack; if a run reports every id red with a 502, run it again.

## Commit

One commit on `lane/ai4dev-132`. Message:

```
AI4DEV-132: the review fixes, cache tokens metered and the empty reply never replayed

<six to ten lines in plain sentences, one per change group.>
```

No other item id anywhere in the message.

## Report

Write `loop/items/AI4DEV-132/reports/review-fix.md`: each of the eleven changes with what
you did and where, the output of the eight checks (exit code and last lines), the commit
hash, and any deviation with its reason. Reply with five lines: the commit hash, the check
results, deviations, blockers, the report path.
