# Unit 1: blocked during design validation

No product files were changed. The branch is `lane/ai4dev-132`, and the initial working tree was clean. This report is the only file added.

## Blocking conflict

SYNTHESIS correction 2 requires the edge to count tokens through the provider before reserving credits. The dispatch requires `countTokens` to construct the SDK client with `requireEnv('ANTHROPIC_API_KEY')` inside the call. With no key, that call cannot complete, so no reserve RPC can have run.

The dispatch also requires AT-004.49 at integration to prove that a keyless deployed send returns 502 and leaves an open reservation that can be backdated and abandoned. That outcome cannot coexist with the required count-before-reserve order. Returning a fabricated count or reserving before counting would violate the design of record.

The proposed resolution, submitted as a question to the lead, is to preserve count-before-reserve, assert that a keyless send returns 502 without creating a turn, and prove abandonment using a reservation created through `reserveTurnAsOperator`. No answer has been received at the time of this report.

The existing `WriteRouteSpec` also has no asynchronous preparation step before its first RPC. Its pure `decide` returns RPC arguments directly. The base's new `settle.act` runs after that RPC, too late to supply `counted_input_tokens`. Implementing correction 2 will require a preparation step that loads caller-authorized need and conversation context and counts it before reserve. The implementation must ensure the counted context matches the context used for generation and preserve the email refusal before provider access. This extension has not been implemented.

## Changes and deviations

- Added this report only.
- No design deviations implemented.
- No req-001 ids moved.
- Implementation and the remaining prescribed source reads are unfinished pending resolution of the ordering conflict.

## Checks

| Command | Exit code | Last lines |
| --- | --- | --- |
| `bun run typecheck` | Not run | No output; implementation has not begun. |
| `bun run at:check req-004` | Not run | No output; suite has not been created. |
| `bun run at:check req-001` | Not run | No output; existing suite has not been changed. |

No vitest, selftest, or acceptance verification commands were attempted.

## Commit

No commit created. The required implementation and three green checks have not been completed.

## Open question

Should the keyless integration assertion be changed to no reservation, with abandonment proved through the operator seam, while preserving count-before-reserve?
