# A full chat interface for Discovery. A decision paper for the founder.

Written 2026-09-17 by a read-only research lane. Every outside fact carries its URL in the
same sentence. Every repository fact carries its file path and line. Where a lookup failed,
the text says "not verified". The founder asked for "a chat interface that is a full
fledged one like users are expecting from a chat with an AI system".

## 1. What "full fledged" means

The third column says which side must change. "Front end" means the later item
`ui.discovery-surface` builds it with no backend change.

| Behaviour | What the user sees | Side |
|---|---|---|
| Streaming tokens | Words appear as the model writes them | Backend and front end |
| Message list with history | The whole conversation, oldest first | Front end, over the `discovery-conversation` read route planned for unit 4 (`loop/items/AI4DEV-132/design/SYNTHESIS.md` lines 79 to 87) |
| History survives a reload | The list comes back after F5 | Front end, over the same read route |
| Typing indicator | A pulse while the reply has not started | Front end |
| Markdown rendering | Lists, bold, code, links | Front end |
| Stop button | The reply halts where it is | Backend and front end |
| Regenerate | A new reply for the same message | Backend and front end |
| Error and retry states | A red line and a retry button | Front end for the display; backend for the credit rule of the retry |
| Elicitation record shown inline | The structured record the tool call produced, as a card | Front end; the data comes from `elicitation` on the turn row (`supabase/functions/_shared/discovery-turn.ts` line 12 and line 28) |
| Remaining credits and per-turn cost | A small meter next to the input | Front end, over `allowance` in the send reply (`discovery-turn.ts` lines 123 to 130) |

Four of ten need a backend change. The rest are front-end work on data the backend already
returns, or will return after unit 4. One house rule binds every row. The UI never touches
the database; every call goes through an edge function (`CLAUDE.md`, section
"Project-Specific Guidelines"). So a chat framework that expects its own `/api/chat` server
must be pointed at an edge function that speaks the format the framework expects.

## 2. Candidate front-end approaches

The front end is TanStack Start with React 19 (`package.json` lines 52 and 61), built through
Lovable. None of the three candidates needs a Next.js server, so all three fit the build
path. The repository already has `@supabase/supabase-js` 2.112.2 (`package.json` line 79).

### 2a. The Vercel AI SDK, `ai` plus `@ai-sdk/react`

- Version. `ai` is at 7.0.105, license Apache-2.0, per
  https://registry.npmjs.org/ai/latest. The release `ai@7.0.105` is dated 16 September per
  https://github.com/vercel/ai/releases. `@ai-sdk/react` is at 4.0.108, Apache-2.0, with a
  peer range that admits React 19.2, per https://registry.npmjs.org/@ai-sdk%2Freact/latest.
- Maintenance signal. 26.9k stars per https://github.com/vercel/ai. The license file is
  Apache 2.0 per https://raw.githubusercontent.com/vercel/ai/main/LICENSE.
- What the hook gives. `useChat` returns `messages`, `status` (`submitted`, `streaming`,
  `ready`, `error`), `stop()`, `regenerate()`, `error` and `setMessages`, and accepts an
  initial `messages` array and a `transport`, per
  https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat. That covers four checklist rows.
- Wire format the backend must produce. The "UI message stream protocol" is SSE. The
  response must carry the header `x-vercel-ai-ui-message-stream: v1`. The parts are
  `start`, `text-start`, `text-delta`, `text-end`, `data-*` for custom structured data,
  `tool-input-available` and `tool-output-available` for tools, `error`, `finish`, and the
  stream ends with `data: [DONE]`, per https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol.
  The edge function writes these lines itself. It does not need the `ai` package on the
  Deno side.
- How it reaches a Supabase edge function. `DefaultChatTransport` takes `api`, `headers`
  (static or a function, so the Supabase JWT can be refreshed per request), `body` and
  `prepareSendMessagesRequest`, which rewrites the outgoing body, per
  https://ai-sdk.dev/docs/ai-sdk-ui/transport. So `api` is the function URL, `headers`
  adds `Authorization` and `apikey`, and `prepareSendMessagesRequest` turns the message
  array into `{ organizationId, projectId, message }`, the route's shape (`SYNTHESIS.md`
  lines 147 to 149). A custom `ChatTransport` needs only `sendMessages` and
  `reconnectToStream`, per the same page.
- Fit. Good. Framework-neutral React. Markdown is not included; add `react-markdown`
  10.1.0, MIT, per https://registry.npmjs.org/react-markdown/latest.

### 2b. assistant-ui, `@assistant-ui/react`

- Version. 0.15.20, MIT, peer React 18 or 19, per
  https://registry.npmjs.org/@assistant-ui%2Freact/latest. The markdown add-on
  `@assistant-ui/react-markdown` is at 0.14.15, MIT, per
  https://registry.npmjs.org/@assistant-ui%2Freact-markdown/latest.
- Maintenance signal. 12.2k stars, MIT, described as "The UX of ChatGPT in your React app",
  per https://github.com/assistant-ui/assistant-ui. The newest release on the releases
  page is dated 15 September per https://github.com/assistant-ui/assistant-ui/releases.
  The package is still on a 0.x version line, so its API may move between minors.
- Wire format, two options. With `useLocalRuntime` you write one `ChatModelAdapter` whose
  `run` is an `async *` generator; it gets `messages` and an `abortSignal`, and it yields the
  full cumulative content on each iteration, while the runtime handles editing, regeneration
  and cancel, per https://www.assistant-ui.com/docs/runtimes/custom/local-runtime. With
  `useDataStreamRuntime` the backend emits the same Vercel UI message stream as 2a, with
  `api`, `headers` (static or per-request async) and `credentials`, per
  https://www.assistant-ui.com/docs/runtimes/custom/data-stream. The picker page says a
  "Simple `fetch` call to your API, runtime owns state" is the LocalRuntime path, and the
  library does not require the Vercel SDK, per
  https://www.assistant-ui.com/docs/runtimes/pick-a-runtime.
- Fit. Good on features, heavier on surface. Lovable has to style a third-party component
  tree instead of its own markup. The 0.x line is the risk.

### 2c. A hand-rolled SSE client with a small message list

- Packages. None beyond `react-markdown` 10.1.0, MIT, per
  https://registry.npmjs.org/react-markdown/latest. The browser `fetch` with a
  `ReadableStream` reader and an `AbortController` is the whole client.
- Wire format. Whatever the edge function chooses. The smallest is one SSE event per text
  delta plus one final event carrying the settled turn, which is the JSON body the route
  returns today (`supabase/functions/_shared/edge.ts` line 392).
- How it reaches the edge function. `supabase-js` hands a `text/event-stream` response back
  untouched as `data` (`node_modules/@supabase/functions-js/src/FunctionsClient.ts` lines
  320 to 321, version 2.112.2 at its `package.json` line 3). The public reference for
  `functions.invoke` does not mention streaming, per
  https://supabase.com/docs/reference/javascript/functions-invoke, so this is a fact about
  the shipped source, not a documented promise.
- Fit. Best for Lovable, because every element is the project's own markup. Worst for
  effort, because stop, regenerate, error states and list state are written by hand.

### What the three have in common

All three want an SSE stream with text deltas and one final structured event. If the
backend emits the Vercel UI message stream, all three clients can consume it, since
assistant-ui reads that format directly and a hand-rolled reader can parse it. That is the
one backend decision that keeps the front-end choice open for the later UI item.

## 3. The backend side

### What the route does today

`discovery-message` is `writeRoute` with `prepare`, the reserve RPC, then `settle`
(`supabase/functions/discovery-message/index.ts` lines 7 to 11). The frame awaits
`spec.settle.act` in full, calls the settle RPC, then answers one JSON body (`edge.ts`
lines 381 to 392). The act step awaits `client.beta.messages.create` with no streaming and
a 120 second timeout (`supabase/functions/_shared/anthropic-messages.ts` lines 10 to 17).
The port has `create` and `countTokens` only (`discovery-turn.ts` lines 20 to 23). The turn
deadline is 150 seconds and the output cap is 4096 tokens
(`supabase/functions/_shared/discovery-metering.ts` lines 7 and 4).

### What streaming changes

The order stays reserve, then model, then settle. What moves is where the HTTP response
opens. Today it opens after settle. With streaming it opens after reserve, and settle runs
inside the stream before the stream closes. Concretely:

1. `MessagesPort` gains a third method, `stream(request, signal)`, that yields text deltas
   and resolves the final answer with usage. The SDK's stream helper emits `text`,
   `streamEvent`, `message`, `finalMessage`, `error` and `abort` events, has `.abort()`,
   and `await .finalMessage()` returns the accumulated message with its usage, per
   https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md. Input
   tokens arrive in `message_start`, output tokens in `message_delta`, and the
   `message_delta` counts are cumulative, per
   https://platform.claude.com/docs/en/build-with-claude/streaming. Whether
   `client.beta.messages` exposes the same `.stream()` helper with `betas` and `fallbacks`
   is not verified today.
2. `WriteRouteSpec.settle` gains a streaming variant of `act`. When the request opts in, the
   frame returns a `Response` whose body is a `ReadableStream` with
   `content-type: text/event-stream`, the shape of the Supabase example at
   https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/streams/index.ts,
   plus `Connection: keep-alive` as the AI models guide adds, per
   https://supabase.com/docs/guides/functions/ai-models. Inside the stream the frame
   forwards each delta as a `text-delta` line, awaits the final message, calls the settle
   RPC exactly as `edge.ts` lines 382 to 390 do today, emits one final `data-turn` part
   with the rendered settle result, then `finish` and `data: [DONE]`. A definite model
   failure emits `error` and settles `failed`, as correction 3 says (`SYNTHESIS.md` lines
   68 to 75).
3. Disconnect. When the browser aborts, the stream's `cancel` callback fires. The frame
   aborts the SDK stream, reads the last cumulative usage it saw, and settles the turn with
   that measurement, inside `EdgeRuntime.waitUntil(promise)`, which keeps the instance
   alive until the promise resolves, per
   https://supabase.com/docs/guides/functions/background-tasks. The same page names
   `policy = "per_worker"` for local testing, which `supabase/config.toml` line 477 already
   sets.
4. The `json()` helper and the CORS header list (`edge.ts` lines 82 to 93) are unchanged.
   `Accept` is a CORS-safelisted request header, so the opt-in needs no preflight change.

### Runtime limits

The wall clock is 150 seconds on the free plan and 400 seconds on paid plans, CPU time is 2
seconds, memory is 256 MB, and the request idle timeout is 150 seconds, per
https://supabase.com/docs/guides/functions/limits. A streamed reply of 4096 tokens fits
inside 150 seconds, and the platform's own turn deadline is the same 150 seconds
(`discovery-metering.ts` line 7). A settle that runs after 140 seconds of streaming must
still finish inside the wall clock. The old edge-runtime defect where a `ReadableStream`
body stalled the function is closed, per https://github.com/supabase/edge-runtime/issues/91.

### The acceptance tests

`tests/at/suites/req-004/_live.ts` lines 52 to 58 post to `discovery-message` through
`functionPost` and read `answer.json.ok`. `functionPostRaw` sends `apikey`, `Authorization`
and `Content-Type` only, and no `Accept` header (`tests/at/harness/live-stack.ts` lines
145 to 149). So the smallest way to keep every test green is this. The route stays JSON by
default, and a request that sends `Accept: text/event-stream` gets the stream. The tests
send no such header, so they change by zero lines. The loop-tier stand-in gains a `stream`
method that replays the scripted answer as deltas. A separate `discovery-message-stream`
route is the alternative. It costs a second `WRITE_ROUTES` row (`edge.ts` line 339), a
second `config.toml` block and a second inventory entry, for one behaviour.

## 4. Stop and regenerate under the credit model

### What the design of record says

- Correction 3 says a definite model failure settles `failed` and releases the reservation,
  and an uncertain one leaves the turn open for the abandon path (`SYNTHESIS.md` lines 68
  to 75). A stop is neither. It is a definite outcome with partial text.
- The acceptance text says regeneration works a bounded number of times, each with a logged
  reason, at zero credits, and a system-error retry costs zero credits
  (`.taskmaster/docs/acceptance/at-req-004.md` lines 78 to 80). The brief carries the same
  sentence (`loop/items/AI4DEV-132/brief.md` line 22).
- The synthesis assigns ids 37 to 39 to the later capability `discovery.regeneration`
  (`SYNTHESIS.md` line 123). So regeneration and retry are declared out of this run.
- The base design says an abandoned reservation is charged in full and "the retry leaf later
  makes a retry of an abandoned turn free by inheriting that reservation"
  (`loop/items/AI4DEV-132/design/candidate-4-reserve-settle.md` line 543).

### Stop mid-stream

The turn settles as completed with the text received so far and the last cumulative usage
seen. The user pays for what the model produced. `stop_reason` is a free text field on the
settle args (`discovery-turn.ts` line 98), so `user_stopped` needs no schema change. If the
abort lands before any `message_delta`, the only output count seen is the one in
`message_start`; the safe rule is then to charge the reservation in full, which never
overspends the pool. Whether Anthropic bills a client-aborted stream at the tokens produced
or in full is not verified today.

### Regenerate

Two readings are possible and the design does not pick one. A regenerate is a new turn that
reserves and settles like any turn and costs credits; the tree can do this today. Or a
regenerate is a zero-cost retry that inherits the previous reservation; this is the
acceptance reading and belongs to `discovery.regeneration`, a later leaf. A stop followed by
a regenerate charges twice under the first reading and once under the second. The acceptance
text speaks of regenerating a "generated scope", the end product of unit 4, not each turn.
No ratified text says the per-turn button of a chat UI is free. That is the open point.

## 5. Recommendation and the gate question

Recommendation. Build the backend now so that the front end stays free to choose later. In
unit 4 the edge function emits the Vercel UI message stream over SSE behind an
`Accept: text/event-stream` opt-in, with the settled turn as one final `data-turn` part,
and settles on cancel inside `EdgeRuntime.waitUntil`. The acceptance tests keep their JSON
path and change by zero lines. The later UI item then picks the Vercel `useChat` hook,
assistant-ui's data-stream runtime, or a hand-rolled reader, since all three read that
format. The reason to decide the wire format now is that unit 4 is the one-way door of the
run (`brief.md` lines 156 to 158); it fixes how the platform talks to Anthropic, and the
streaming port is part of that seam. The reason not to pick the component library now is
that the UI is a separate item and Lovable will drive it. Per-turn regenerate stays a paid
new turn in this run; the free regeneration of a scope stays in `discovery.regeneration`.

The question for the unit 4 gate, one question, three options. "Unit 4 fixes the model seam. Should the send route stream the reply over SSE now, in the
Vercel UI message stream format behind an Accept header, with settle on cancel, so any chat
front end can consume it later? Options. A. Yes, stream in unit 4, tests keep the JSON path.
B. No, keep one JSON reply per turn in this run and file streaming as a later leaf next to
the UI item. C. Stream in unit 4 but as a separate `discovery-message-stream` route, leaving
`discovery-message` untouched."

Option A is the recommendation. Option B is the cheapest and defers the one-way door past
this run. Option C doubles the route inventory for one behaviour. Not verified today. The npm web pages refused the fetch, so versions come from the registry
JSON endpoint and dates from the GitHub releases pages. The beta namespace's `.stream()`
helper with `betas` and `fallbacks`, and Anthropic's billing of a client-aborted stream,
are not verified.
