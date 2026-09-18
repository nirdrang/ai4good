`ai` and `@ai-sdk/react` are not installed in this worktree (or in the other worktrees checked). Option names below come from the decision paper, not from type declarations.

There is no Discovery chat route yet. The mapping below is the paper plus the shipped stream encoder, not a live `useChat` page.

### Components Found

- **`DefaultChatTransport`** — named only in `loop/items/AI4DEV-132/research/chat-ui.md` lines 57–64 and in `loop/items/AI4DEV-159/brief.md` line 40. Browser fetch client the page is supposed to point at `discovery-message`. Not present in `package.json` or `src/`.
- **`useChat`** — same paper, lines 46–49. Hook that is supposed to own `messages`, `status`, `stop()`, `error`, `setMessages`, and an initial `messages` array plus a `transport`. Not imported anywhere in `src/`.
- **UI message stream encoder** (`start`, `textStart`, `textDelta`, `textEnd`, `dataTurn`, `error`, `finish`, `done`, `wantsEventStream`, `DISCOVERY_STREAM_HEADERS`) — `supabase/functions/_shared/discovery-stream.ts`. Turns protocol objects into SSE `data: …\n\n` lines and the response header set.
- **`writeRoute` stream branch** — `supabase/functions/_shared/edge.ts` lines 382–422. After a successful reserve, if `spec.settle.stream` exists and `Accept` lists `text/event-stream`, opens HTTP 200 with a `ReadableStream` instead of waiting for settle.
- **`MessagesPort.stream`** — `supabase/functions/_shared/discovery-turn.ts` lines 22–27 and 153–160 (`discoveryStream`). Adapter from reservation + counted request to a `DiscoveryModelAnswer`, forwarding text through `onDelta`.
- **`anthropicMessagesPort().stream`** — `supabase/functions/_shared/anthropic-messages.ts` lines 54–96. Live provider: `client.beta.messages.stream(paramsFor(request), { signal })`, observes `message_start` and `content_block_delta`/`text_delta`, aborts to `user_stopped`.
- **Anthropic stand-in `stream`** — `tests/at/harness/vendors.ts` lines 71–87 (there is no `tests/at/harness/anthropic-messages-standin.ts`). Replays `create()` text in ≤20-character chunks, honours `AbortSignal`, records the request once.
- **`renderDiscoveryMessage` / `turnViewFromSql` / `conversationAnswer`** — `supabase/functions/_shared/discovery-turn.ts` lines 28–40, 162–191. JSON/SSE settle payload and the conversation-read projection.
- **`discovery-message` / `discovery-conversation` entry points** — `supabase/functions/discovery-message/index.ts`, `supabase/functions/discovery-conversation/index.ts`.
- **Recorded wire transcript** — `loop/items/AI4DEV-132/artifacts/verify-discovery/transcript.json`. Real Haiku SSE parts, abort, conversation read, JSON refusals.

### Flow

1. **Intended page trigger (not in the tree).** The brief (`loop/items/AI4DEV-159/brief.md` lines 40–42) says one TanStack Start route constructs `useChat` with `DefaultChatTransport` aimed at `discovery-message`. `src/routes/` today only has `index.tsx` and `__root.tsx`. `package.json` has neither `ai` nor `@ai-sdk/react`.

2. **Transport options the paper names (names come from the paper, not from `node_modules`).** Paper lines 57–64, citing https://ai-sdk.dev/docs/ai-sdk-ui/transport:
   - **`api`**: function URL.
   - **`headers`**: static object or a function, “so the Supabase JWT can be refreshed per request”; “adds `Authorization` and `apikey`”.
   - **`body`**: listed as an option. The paper does **not** say `body` is what reshapes the payload.
   - **`prepareSendMessagesRequest`**: “rewrites the outgoing body” and “turns the message array into `{ organizationId, projectId, message }`”, matching `SYNTHESIS.md` lines 147–149 and `decideDiscoveryMessage` in `discovery-turn.ts` lines 57–70.
   - The brief (line 40) also requires **`Accept: text/event-stream`** in the headers. The paper’s header sentence does not name `Accept`; it only says Accept is CORS-safelisted (paper line 163).
   - A custom `ChatTransport` “needs only `sendMessages` and `reconnectToStream`” (paper lines 63–64). Discovery has no reconnect route.

3. **Server opt-in.** `wantsEventStream` (`discovery-stream.ts` lines 15–17) is true only when some Accept entry, ignoring parameters, is exactly `text/event-stream`. `functionPostRaw` (`tests/at/harness/live-stack.ts` lines 145–149) sends no Accept, so acceptance tests stay on JSON. Without `Accept: text/event-stream`, `writeRoute` never enters the stream branch (`edge.ts` line 382) and answers one JSON body after settle (`edge.ts` lines 424–435).

4. **Reserve happens before any SSE byte.** `writeRoute` still runs caller, body parse, `decide`, `prepare`, and `discovery_turn_reserve`. Any failure there is JSON with a status, including 502 from token counting (`discovery-message.md` lines 17–18). Stream headers are not sent.

5. **Stream opens after reserve.** `edge.ts` lines 390–422: one UUID `id = crypto.randomUUID()`, then:
   - `start({ type: 'start', messageId: id })`
   - `text-start({ type: 'text-start', id })` — **same UUID** for message id and text-part id
   - each `onDelta` → `text-delta({ type: 'text-delta', id, delta })`
   - then `text-end`, optional `error`, optional `data-turn`, always `finish`, always `data: [DONE]\n\n`
   Response headers (`discovery-stream.ts` lines 1–5, merged at `edge.ts` line 422): `content-type: text/event-stream`, `cache-control: no-cache`, `connection: keep-alive`, `x-vercel-ai-ui-message-stream: v1`, plus CORS, plus `access-control-expose-headers: x-vercel-ai-ui-message-stream`. Status is implicit 200.

6. **Provider deltas.** `discoveryStream` (`discovery-turn.ts` 153–160) calls `port.stream(..., onDelta, signal)`. Live port (`anthropic-messages.ts` 76–91): on `message_start` records model and folded input tokens; on `content_block_delta` + `text_delta` appends and calls `onDelta(event.delta.text)`. Stand-in (`vendors.ts` 71–87): `create()` then slices `answer.text` in 20-character pieces with `await Promise.resolve()` between them.

7. **Recorded happy path (transcript `discovery-message-sse-2`, lines 673–1006).** Parts in order: `start` → `text-start` → 29× `text-delta` → `text-end` → `data-turn` → `finish` → `DONE`. `start.messageId` and every text part `id` were `de69b196-a790-45c0-a243-8b4051e4e999`. Concatenated deltas equal `data-turn.data.reply` and `turn.assistantMessage`. Check note (lines 78–80) records that sequence.

8. **How the paper says the SDK consumes those parts — and what it does not say.** Paper lines 50–54 (https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol): the protocol is SSE; the response must carry `x-vercel-ai-ui-message-stream: v1`; parts are `start`, `text-start`, `text-delta`, `text-end`, `data-*` for custom structured data, `tool-input-available` / `tool-output-available`, `error`, `finish`; the stream ends with `data: [DONE]`. Paper lines 46–49: `useChat` returns `messages`, `status` (`submitted`, `streaming`, `ready`, `error`), `stop()`, `regenerate()`, `error`, `setMessages`. **The paper never maps each part onto `UIMessage.parts`, and never says which part flips `status`.** That mapping is not in this repository. `node_modules/ai` and `node_modules/@ai-sdk/react` do not exist here (checked this worktree, the parent repo, `AI4DEV-132`, `AI4DEV-102`).

9. **`data-turn` payload (shipped, recorded).** Encoder: `part({ type: 'data-turn', data: payload })` (`discovery-stream.ts` line 11). Frame (`edge.ts` line 405): `dataTurn({ ok: true, ...(spec.render ? spec.render(settled.value) : {}) })` only when settle RPC succeeded **and** `acted.failure === null`. `renderDiscoveryMessage` (`discovery-turn.ts` 184–191) returns `{ turn, reply, elicitation, allowance }`. Recorded payload (transcript lines 951–996):
   - `ok: true`
   - `turn`: `DiscoveryTurnView` (`id`, `projectId`, `seq`, `status: "settled"`, `billing`, `userMessage`, `assistantMessage`, `elicitation`, token/credit fields, `stopReason: "end_turn"`, `servedModel`, timestamps)
   - `reply`: same string as `turn.assistantMessage`
   - `elicitation`: `null` in this drive
   - `allowance`: `{ organizationId, utcDay, vetted, dailyGrant, spentToday, remaining }`
   That is the same object as JSON 200 (`transcript.json` lines 594–635 for the earlier JSON send). **There is no page that reads `data-turn` back.** The brief (line 41) says the allowance is shown “from the send answer and the read”. The send answer on the stream path **is** this part. After reload the read is `discovery-conversation`’s `allowance` field, not `data-turn`.

10. **`error` / `finish` / `[DONE]` on the server.** `error` uses `{ type: 'error', errorText }` (`discovery-stream.ts` line 12). Emitted when `acted.failure !== null`, when settle RPC fails, when `args === null` and `failure === null` (“the provider outcome is uncertain”), or on throw (`edge.ts` 401–408). `finish` and `[DONE]` always run in `finally` (409–411), including after `error`. HTTP status stays 200 once the stream has opened. JSON path for the same definite failure is 502 (`edge.ts` 433).

11. **`stop()` on the client vs cancel on the server.** Paper line 20: stop is “Backend and front end”. Paper lines 155–160: browser abort → stream `cancel` → abort the model stream → settle inside `EdgeRuntime.waitUntil`. Shipped: `ReadableStream.cancel` (`edge.ts` 416–420) sets `cancelled = true`, `abort.abort()`, `EdgeRuntime.waitUntil(work)`. After cancel, `emit` no-ops (`edge.ts` 393), so the client does **not** get `text-end`, `data-turn`, `finish`, or `[DONE]`. Paper lines 46–49 name `stop()` but **do not say it aborts fetch, and do not say what of the partial text `useChat` keeps.** Drive abort (`drive-discovery.ts` 129–137): after the first `text-delta`, `controller.abort()` + `reader.cancel()`. Transcript `discovery-message-sse-3-cancelled` (lines 1045–1092): client saw only `start`, `text-start`, `text-delta` with `delta: "Got"`, `aborted: true`. Settled row (lines 1118–1136) is longer: `assistant_message: "Got it—you have the basics recorded, but you need reminders so"`, `stop_reason: "user_stopped"`, `status: "settled"`. Live port keeps accumulating `text` until the provider notices abort (`anthropic-messages.ts` 81–84, 72–75); those extra deltas are not sent to the cancelled browser. **Reload therefore shows more assistant text than `stop()` left in the SDK buffer.**

12. **Non-200 JSON (refusal, no stream).** Reserve/prepare/auth failures return JSON and never set stream headers. Recorded:
    - 409 `discovery-disabled` (transcript 1300–1312)
    - 409 `fuel-exhausted` (1424–1436)
    - 409 `daily-allowance-exhausted` with the unverified-tier remedies (1475–1487)
    Email-unverified is the same JSON shape from SQL (`detail = 'email-unverified'`) / `discoveryMessageAllowed` (`verification.ts` 147–149): `{ ok: false, kind, reason }` at 409 (`edge.ts` 375–379). 401/400 from `refusal()` are `{ ok: false, reason }` with **no** `kind` (`edge.ts` 96–98). **The paper does not describe `onError` or how a non-200 body reaches `error`.** `useChat`’s `onError` is not named in the paper at all. Whether the JSON `reason` is parseable from `error` / `onError`, or only as `error.message` text, is not verified in this tree.

13. **Reload / initial messages.** `discovery-conversation` (`index.ts` 8–17): POST `{ projectId }`, caller JWT. `conversationAnswer` (`discovery-turn.ts` 165–182) returns `{ ok: true, conversation: { projectId, turns, elicitation }, allowance }` with **every** turn row in `seq` order as `DiscoveryTurnView` (open/settled/failed/abandoned; unit 4 text and `discovery-conversation.md` lines 5–6). Recorded read (transcript 1152–1261): three `status: "settled"` turns; turn 3 is the stopped one with partial `assistantMessage` and `stopReason: "user_stopped"`; `allowance.remaining` is 7. **The paper does not define a `UIMessage[]` mapping.** Nothing in `src/` converts turns. A settled row is one user string plus one assistant string (`userMessage` / `assistantMessage`), so one turn is two chat messages if mapped 1:1 onto `role: 'user' | 'assistant'`. Stream `messageId` values are random UUIDs (`edge.ts` 395); conversation ids are `discovery_turns.id`. They do not match across reload. Paper lines 16–17 only say history is front-end work over this read route.

14. **Stand-in vs live abort accounting.** Stand-in abort (`vendors.ts` 84–86, `vendors.selftest.ts` 43–53): partial text = chunks emitted before abort (first 20 chars), `stopReason: 'user_stopped'`, output tokens = `countTokens` of that assistant string. Live abort (transcript + `anthropic-messages.ts` 62–75): output tokens from `messages.countTokens` of accumulated provider text, else `request.maxTokens`. First live cancel charged 1 credit, output 31, not the 4096 cap (`live-verify.md` lines 72–79).

### Files Read

- `loop/items/AI4DEV-159/brief.md`
- `loop/items/AI4DEV-159/how/prompt-d-ui-message-stream-mapping.md`
- `loop/items/AI4DEV-132/research/chat-ui.md` (full)
- `loop/items/AI4DEV-132/units/unit4.md` (stream section)
- `loop/items/AI4DEV-132/reports/unit4.md`, `loop/items/AI4DEV-132/reports/live-verify.md`
- `loop/items/AI4DEV-132/design/SYNTHESIS.md` (send-body lines)
- `loop/items/AI4DEV-132/artifacts/verify-discovery/transcript.json` (checks, JSON send, SSE send, abort, conversation, refusals)
- `supabase/functions/_shared/discovery-stream.ts`
- `supabase/functions/_shared/edge.ts`
- `supabase/functions/_shared/anthropic-messages.ts`
- `supabase/functions/_shared/discovery-turn.ts`
- `supabase/functions/_shared/discovery-allowance.ts`
- `supabase/functions/_shared/discovery-metering.ts`
- `supabase/functions/_shared/discovery-reads.ts`
- `supabase/functions/_shared/write-routes.ts`
- `supabase/functions/_shared/verification.ts`
- `supabase/functions/_shared/tenant-reads.ts` (status constants)
- `supabase/functions/discovery-message/index.ts`
- `supabase/functions/discovery-conversation/index.ts`
- `supabase/config.toml` (function JWT blocks, API port)
- `tests/at/harness/discovery-stream.selftest.ts`
- `tests/at/harness/vendors.ts`, `tests/at/harness/contracts.ts`, `tests/at/harness/vendors.selftest.ts`
- `tests/at/harness/live-stack.ts` (JSON POST headers)
- `tests/at/suites/req-004/_live.ts`, `_fixture.ts` (email/reserve path)
- `.claude/skills/verify-ai4good/scripts/drive-discovery.ts`
- `.claude/skills/verify-ai4good/features/discovery-message.md`
- `.claude/skills/verify-ai4good/features/discovery-conversation.md`
- `package.json`, `.env.example`, `vite.config.ts`, `src/router.tsx`, `src/routes/index.tsx`, `src/routes/__root.tsx`, `src/routes/README.md`, `src/lib/api/example.functions.ts`, `src/lib/config.server.ts`
- Attempted `node_modules/ai/package.json` in this worktree, the parent repo, `AI4DEV-132`, and `AI4DEV-102` — missing. Grep of `package.json` files found no `"ai"` / `"@ai-sdk/react"`. This worktree does have `node_modules/react` (19.2.5).

### Boundaries

- **In (send):** POST `http://127.0.0.1:44321/functions/v1/discovery-message` (local API port in `supabase/config.toml` line 19). Headers the drive uses: `apikey`, `Authorization: Bearer <JWT>`, `Content-Type: application/json`, and for SSE `Accept: text/event-stream` (`drive-discovery.ts` 91–96). Body `{ organizationId, projectId, message }` (`decideDiscoveryMessage`, `stringField` rejects empty/whitespace).
- **Out (SSE 200):** UI message stream parts as above; `data-turn` = JSON success body.
- **Out (JSON 200):** `{ ok: true, turn, reply, elicitation, allowance }` (`renderDiscoveryMessage`).
- **Out (JSON 4xx/502, no stream):** `{ ok: false, reason }` and, for write-pipeline/RPC refusals, `kind`. Credit/kill-switch kinds recorded: `discovery-disabled`, `fuel-exhausted`, `daily-allowance-exhausted`; also `email-unverified` on the SQL/fixture path.
- **In (history):** POST `/functions/v1/discovery-conversation` with `{ projectId }` only. Out: `{ ok: true, conversation: { projectId, turns, elicitation }, allowance }` or 401 / 400 / 404 tenant / 502.
- **CORS:** allow-headers are `authorization, apikey, content-type, x-client-info` only (`edge.ts` 83–86). `Accept` is intentionally omitted; paper line 163: “`Accept` is a CORS-safelisted request header, so the opt-in needs no preflight change.” Origin is `*`. Cookie credentials would be illegal with `*`; the JWT must travel in `Authorization`.
- **UI ↔ DB:** UI must not touch the database (`CLAUDE.md`). History and allowance go through the two edge functions. `src/lib/api/example.functions.ts` comments tell you to use `createServerFn` instead of edge functions; that would violate this leaf (host-specific server, possible secrets).
- **SDK packages:** not a boundary yet. They are not installed.

### Non-Obvious Things

- **Same UUID for `start.messageId` and `text-start.id`.** Protocol treats those as different ids (message vs text part). The frame uses one `crypto.randomUUID()` for both (`edge.ts` 395–397). Transcript confirms they match.
- **`data-turn` is nested on the wire as `{ type, data }`, then wrapped again by the drive parser.** Transcript `part.data` is the full JSON object; the settle payload is `part.data.data`. The SDK would see `{ type: 'data-turn', data: { ok, turn, reply, elicitation, allowance } }`.
- **Stop drops the tail of the protocol.** After `cancel`, `emit` is a no-op, so the client never receives the settle `data-turn`. Allowance after stop is only on reload (or a separate read), not on the aborted stream. The settled assistant text can be longer than the last `text-delta` the browser stored.
- **HTTP 200 with an `error` part vs HTTP 4xx JSON.** Failures after reserve stay on the stream (200 + `error` + `finish` + `[DONE]`). Credit refusals never open the stream. `useChat` would see two different channels if both are wired only through `error`.
- **JSON vs stream disagree on the same settle result** (also in the unit-4 reviews): JSON `args === null` → 502; stream emits `error` and still `finish`/`[DONE]`. JSON definite failure → 502 after settle; stream emits `error` and skips `data-turn` but remains 200.
- **Paper’s planned `stream(request, signal)` vs shipped `stream(request, onDelta, signal)`.** Paper line 134; shipped `MessagesPort` in `discovery-turn.ts` line 26.
- **Default `body` is not enough.** If `DefaultChatTransport` still posts `{ id, messages, trigger, messageId }`, `decideDiscoveryMessage` will 400 (`projectId` / `message` missing). Only `prepareSendMessagesRequest` is described as replacing that shape. Extracting `message` from a v7 `UIMessage` is `parts`, not a v4 `content` string — the paper does not say how to extract it.
- **`regenerate()` is on the hook (paper line 47) and out of this leaf** (brief line 44; paper lines 198–199, 235–236: per-turn regenerate is a paid new turn).
- **Conversation ids ≠ stream message ids.** After F5, initial `UIMessage.id` values cannot be the SSE `messageId`s unless the page invents a scheme. A stopped turn still has `assistantMessage` text on the read.
- **Open turns are in the read.** Mapping `assistantMessage: null` to a `UIMessage` is unspecified. A reload mid-flight can show a user line with no assistant line.
- **No `ai` package on Deno** (paper lines 55–56). The edge function writes SSE lines by hand. The browser SDK is the only consumer of the protocol in the plan.
- **Stand-in is `vendors.ts`, not `anthropic-messages-standin.ts`.**

### Open Questions

These are the facts the paper marks **“not verified” / “not verified today”** (lines 4, 141–143, 212, 246–249):

- npm **web** pages refused the fetch; versions `ai@7.0.105` (16 September) and `@ai-sdk/react@4.0.108` come from the registry JSON and GitHub releases pages.
- Whether `client.beta.messages` exposes `.stream()` with `betas` and `fallbacks` (the port now calls that helper with those params; the paper still marked it unverified at research time).
- Whether Anthropic bills a client-aborted stream at tokens produced or in full.

These are **not** marked unverified in the paper, but **this tree cannot answer them** because the SDK is not installed and no page exists:

- Exact `DefaultChatTransport` / `prepareSendMessagesRequest` callback argument names and return shape (`api` / `headers` / `body` / `credentials`).
- Whether the SDK itself sets `Accept: text/event-stream` or `x-vercel-ai-ui-message-stream` on the **request** (the latter would fail CORS; it is not in `access-control-allow-headers`).
- How each of `start`, `text-start`, `text-delta`, `text-end`, `data-turn`, `error`, `finish`, `[DONE]` is stored on `UIMessage.parts`, and which event moves `status` among `submitted` | `streaming` | `ready` | `error`.
- Whether `stop()` is implemented as `AbortController.abort()` on the fetch, whether abort is treated as `error` or `ready`, and whether partial `text` parts remain in `messages`.
- Whether a non-200 JSON body is available as structured data on `error` / `onError`, or only as a thrown `Error` whose `message` is the raw text. The paper never names `onError`.
- The send function name (`sendMessage` vs `handleSubmit` / `append`). The paper only lists return values, not the submit API.
- Canonical `UIMessage[]` mapping from `conversation.turns` (ids, one turn → two roles, `null` assistant text, attaching allowance as a `data-turn` part vs React state).
- Whether `DefaultChatTransport.reconnectToStream` will POST the same `api` after a refresh and accidentally open a new reserved turn.
- Whether `useChat` requires a typed `UIMessage` generic before `data-turn` parts are visible on `messages`.