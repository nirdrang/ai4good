# AI4DEV-132 (Discovery credits engine) — review fix pass 2

Writer pass after judgement kept muse findings 1, 10 and 11. Branch `lane/ai4dev-132`.
No SQL change, no migration, and no `discovery_allowance` change.

## The three changes

### 1. A cancel mid-reply is charged for the text that arrived (muse 1)

`supabase/functions/_shared/anthropic-messages.ts` `stream`: after `message_start`, an
abort counts the received text once through `client.messages.countTokens` as a single
assistant message on the same model, and uses that count as `outputTokens`. If the count
fails or is not a safe non-negative integer, the output is the request cap. The input
count stays the folded `message_start` value. A complete stream still uses `answerFrom`.
The stand-in in `tests/at/harness/vendors.ts` counts the received text with the same
`JSON.stringify(messages).length / 4` rule `countTokens` uses for a request.
`tests/at/harness/vendors.selftest.ts` asserts that counted output on an interrupted
replay. The cancel paragraph in `.claude/skills/verify-ai4good/features/discovery-message.md`
matches the new rule.

### 2. A provider refusal is not a paid turn (muse 11)

`settleArgsFrom` in `supabase/functions/_shared/discovery-turn.ts`: an `ok` answer whose
`stopReason` is `refusal` settles `failed` with the reason `the model refused the request`.
Text, tokens, stop reason, served model and elicitation are null, so the reservation is
released and the reply is not stored.

Tests and fixtures that name a `refusal` reply:

- `tests/at/harness/discovery-elicitation.selftest.ts` now scripts `stopReason: 'refusal'`
  into `settleArgsFrom` and asserts `failed` with a null assistant message. Green.
- `tests/at/harness/contracts.ts` still allows `stopReason: 'refusal'` on a scripted text
  reply. The stand-in still returns that stop reason; settle now maps it to failed. No
  suite body scripts that reply today.
- `tests/at/suites/req-004/fixtures/record-grant-tracker.ts` still lists `refusal` as a
  live stop reason it would record. Unchanged, per the recorder rule. A live refusal now
  fails the send before that branch, because settle is `failed`.
- `tests/at/suites/req-004/fixtures/grant-tracker.ts` has no refusal reply.

### 3. The recorder exports the elicitation it recorded (muse 10)

`tests/at/suites/req-004/fixtures/record-grant-tracker.ts` writes
`GRANT_TRACKER_ELICITATION` from the recorded tool input after the oracle check. It no
longer imports the handwritten constant. No other recorder change.

## Checks

All five from this worktree, after the edits. Integration ran with the provider key and
the Haiku override already in the function environment. The stack was not stopped or
started by this pass; the integration run reset it.

| Check | Exit | Last lines |
| --- | --- | --- |
| `bun run typecheck` | 0 | `typecheck OK: all three projects clean` |
| `bun run at:check req-004` | 0 | `RESULT: 58 P0 ids in bijection` |
| `bun run at:selftest` | 0 | `Test Files  33 passed (33)` / `Tests  445 passed (445)` |
| `bun run at:verify req-004 --tier loop --expect` | 0 | `58 P0: 20 green, 38 red, 0 missing` / expected match |
| `bun run at:verify req-004 --tier integration --expect` | 0 | `58 P0: 10 green, 48 red, 0 missing` / expected match |

## Commit

`f39ab84f8844644bd723276fd8883d7a05d72e42` on `lane/ai4dev-132`.

## Deviations

- Stream `observe` no longer reads `message_delta` usage. That event arrives at the end of
  the stream, so a cancel never had a running output count. A finished stream still folds
  cache tokens in `answerFrom`. Input on a stop is the folded `message_start` count.
- The stand-in abort count cannot fail, so it has no cap fallback. The live port does.
- A refusal settle uses the same null fields as any other failed settle. The SQL failed
  path does not store those fields.

## Blockers

None.
