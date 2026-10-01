# Send a Discovery message

An NGO administrator sends a message on a submitted need. The reply includes the turn's
cost and the remaining daily allowance. Unfunded projects use the free allowance; funded
projects require fuel. There is no per-turn regenerate. Regeneration belongs to the scope
(`discovery-scope.md`). A complete elicitation (`elicitation.complete` true, reported as
`scopeReady`) is what unlocks scope generation.

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
`{ ok, turn, reply, elicitation, allowance, scopeReady, guardrail }`. `guardrail` is
`{ offTopicCount, flagged, notice }`, and null on a fuel turn. The turn carries `billing`
(`free`, `fuel` or `retry`) and `offTopic`. Read `discovery_turns` and `discovery_spend`
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
conversation route: partial text remains, `stopReason` is `user_stopped`, and the output
count is the token count of the received text as one assistant message. If that count
fails, the output count is the request's full output cap. The input count stays the stream
start value. Cancellation aborts generation and settlement continues through the edge
runtime's background task. Definite provider failures emit `error`, settle failed
and release credits. Uncertain failures emit `error` and leave the reservation open. Both
finish the connected stream with `finish` and `[DONE]`.

Retry billing: on an unfunded project, when the latest turn is `failed` or `abandoned` and
the new message is the same trimmed text, the new turn is `billing = 'retry'` with zero
reserved and zero charged credits. The day's spend row does not change.

Off-topic guardrail: free and retry turns offer the model a `decline_off_topic` tool. A
declined turn settles with `off_topic` true. The third off-topic turn on a project flags the
conversation and emits `discovery.off_topic_flagged` once to the active platform admins
(email and in-app). Fuel turns have no guardrail, and a check constraint forbids `off_topic`
on them. A model `stop_reason` of `refusal` settles the turn failed, releases its credits, and
answers 502 (JSON) or an `error` part (SSE).

Without the credential, a verified caller's send answers 502 from token-count preparation,
with no turn and no spend change. Preparation skips counting for an unverified caller, so
that caller reaches the reserve and its `email-unverified` refusal with no credential.
A definite provider HTTP error after reservation settles as failed and releases
all reserved credits. A timeout or connection error leaves the turn open. Backdate its
opening as the operator with the immutability trigger disabled inside a transaction; the
next reservation on that project abandons it at its full reserved charge after the deadline.

## Refusals

The common write gate applies. Then the route answers 400 `invalid-request` for an empty
message or one over 4000 characters, 409 `no-such-organisation`, and 403 `not-a-member` or
`not-an-admin`. Preparation reads the need and settled history with the caller's token. An
invisible or absent project answers 409 `no-such-project`, and a draft need answers 409
`need-not-in-discovery`. Both come before token counting. The reserve then refuses, in order,
`discovery-disabled`, `email-unverified` (with the verification remedy), and the rest below.
A second send while a young turn is open answers `turn-in-flight`. A stale counted sequence
answers `stale-context`. Settling twice answers `turn-not-open`. A funded project with no
fuel left answers `fuel-exhausted`. A platform admin switch off for the organisation
answers `discovery-disabled`; a verified caller reaches it only with the provider credential,
because counting runs first. An unaffordable minimum
turn answers the existing allowance refusal and writes nothing. A last-credit turn may
instead lower its output cap. Settled turns reject updates and every turn rejects deletion.

Read both tables before and after refusals. Two projects under one NGO must share one daily
spend row. Use synthetic usage through the operator reserve and settle functions when the
provider credential is absent; that proves persistence and accounting, not a provider call.
The settle function takes `p_off_topic` and `p_notice` as well.

`scripts/drive-discovery.ts` drives the provider path and spends real credits.
`scripts/drive-discovery-refusals.ts` needs no credential: it proves the over-length,
`need-not-in-discovery` and `no-such-project` refusals with no turn row written.
