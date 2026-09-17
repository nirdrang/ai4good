# Send a Discovery message

An NGO administrator sends a message on a submitted need. The reply includes the turn's
cost and the remaining daily allowance. Unfunded projects use the free allowance; funded
projects require fuel. Per-turn regenerate sends a new paid turn in this run.

## How to reach it

Complete NGO signup and email confirmation, then call `project-need` with `start` and
`submit`. Send `POST /functions/v1/discovery-message` with the NGO token and
`{ organizationId, projectId, message }`. Text must be non-empty and at most 4000 characters.

JSON is the default. Send `Accept: text/event-stream` to opt into the Vercel UI message
stream. Expect `content-type: text/event-stream`, `cache-control: no-cache`,
`connection: keep-alive` and `x-vercel-ai-ui-message-stream: v1`. Read SSE `data:` parts:
`start`, `text-start`, `text-delta`, `text-end`, then `data-turn` containing the same
settled answer as JSON, `finish`, and `[DONE]`. A refusal before reserve remains JSON
with its status, including a 502 from token counting.

## Drive and readback

With the provider credential in the function environment, expect 200 with
`{ ok, turn, reply, elicitation, allowance }`. Read `discovery_turns` and `discovery_spend`
over the operator SQL connection. The turn is settled, its served model is recorded, and
the allowance has fallen by the charged credits. The reservation uses counted input plus
the fixed margin and bounded output. Unused reserved credits return to the same day row.

Complete the grant tracker conversation in the acceptance fixture. The prompt loads the
ordered skill files into a cached system block and the need into a separate uncached block.
The final `record_elicitation` tool input becomes the turn's elicitation, containing facts,
constraints, user stories with acceptance criteria, and open questions. Invalid tool input
still settles text and usage, with null elicitation. A tool-only answer stores an empty
assistant message. Read the latest elicitation through `discovery-conversation`.

Cancel a streamed response after some text arrives. Read the settled turn through the
conversation route: partial text remains, `stopReason` is `user_stopped`, and the last
cumulative usage is charged. If no output usage delta arrived, the output count is the
request's full output cap. Cancellation aborts generation and settlement continues through
the edge runtime's background task. Definite provider failures emit `error`, settle failed
and release credits. Uncertain failures emit `error` and leave the reservation open. Both
finish the connected stream with `finish` and `[DONE]`.

Without the credential, expect 502 from token-count preparation, no turn and no spend
change. A definite provider HTTP error after reservation settles as failed and releases
all reserved credits. A timeout or connection error leaves the turn open. Backdate its
opening as the operator with the immutability trigger disabled inside a transaction; the
next reservation on that project abandons it at its full reserved charge after the deadline.

## Refusals

The common write gate applies. Organisation membership and the admin role are required.
Preparation reads the need and settled history with the caller's token; an invisible project
answers 404. With token counting available, an unverified email answers 409
`email-unverified` with the verification remedy. A draft need answers `need-not-in-discovery`.
A second send while a young turn is open answers `turn-in-flight`. A stale counted sequence
answers `stale-context`. Settling twice answers `turn-not-open`. A funded project with no
fuel left answers `fuel-exhausted`. An unaffordable minimum
turn answers the existing allowance refusal and writes nothing. A last-credit turn may
instead lower its output cap. Settled turns reject updates and every turn rejects deletion.

Read both tables before and after refusals. Two projects under one NGO must share one daily
spend row. Use synthetic usage through the operator reserve and settle functions when the
provider credential is absent; that proves persistence and accounting, not a provider call.
