### Components Found

- **`discovery-message` entry** — `supabase/functions/discovery-message/index.ts`  
  One `Deno.serve(writeRoute({...}))` that names the write-route row `discovery-message`, reads `organizationId` from the body, and wires prepare/act/stream/render onto the shared write frame.

- **`discovery-conversation` entry** — `supabase/functions/discovery-conversation/index.ts`  
  A read-only `edgeHandler` (not a write route). POST only. Resolves the caller, requires `projectId` as a UUID, then returns `conversationAnswer`.

- **`writeRoute` / `edgeHandler` / `json` / `refusal` / `readJsonBody` / `resolveCaller` / `callerReads`** — `supabase/functions/_shared/edge.ts`  
  Shared HTTP frame: OPTIONS preflight, POST-only, Auth round-trip, JSON body parse, standing load, decide/prepare, reserve RPC, then either JSON settle or the SSE stream. CORS lives here.

- **`WRITE_ROUTES` / `writePipeline` / `refuseWrite` / `rpcRefusalStatus` / `parseWriteRefusalKind` / `organizationIdField` / `uuidField`** — `supabase/functions/_shared/write-routes.ts`  
  Route inventory (`discovery-message` → RPC `discovery_turn_reserve`), standing gate, refusal `kind` vocabulary, and field parsers.

- **`decideDiscoveryMessage` / `discoveryPrepare` / `discoveryAct` / `discoveryStream` / `renderDiscoveryMessage` / `conversationAnswer` / `turnViewFromSql`** — `supabase/functions/_shared/discovery-turn.ts`  
  Request-shape checks, token-count prepare, Anthropic act/stream, JSON/SSE success render, and conversation projection.

- **SSE codec** — `supabase/functions/_shared/discovery-stream.ts`  
  Vercel UI message-stream parts, `[DONE]`, `Accept` sniff, and stream response headers.

- **`renderDiscoveryAllowance` / `Allowance` / `dailyAllowanceExhaustedReason` / `DISCOVERY_DAILY_GRANT`** — `supabase/functions/_shared/discovery-allowance.ts`  
  Camel-case allowance view and the zero-credit reason sentences (remedies live in `reason`, not a separate field).

- **`fuelExhaustedReason` / `DISCOVERY_MESSAGE_MAX_CHARS` / `reserveSettings`** — `supabase/functions/_shared/discovery-metering.ts`  
  Fuel-exhausted sentence, 4000-char message cap, prices (5/25 micros per token, 100_000 micros per credit).

- **`Caller` / `callerFromAuthAnswer`** — `supabase/functions/_shared/caller.ts`  
  Auth `/user` body → `{ id, githubHandle, emailVerified }`. Null caller is a 401 at both functions.

- **`orgAdminActionAllowed`** — `supabase/functions/_shared/memberships.ts`  
  Send is admin-of-this-org only (`not-a-member` / `not-an-admin`).

- **`TENANT_NOT_FOUND` / `TENANT_READ_FAILED` / `CallerReads`** — `supabase/functions/_shared/tenant-reads.ts` and `discovery-reads.ts`  
  Conversation 404/502 bodies (no `kind`). Turn SQL row type and the caller-bound REST reads.

- **`needIntakeAnswer`** — `supabase/functions/_shared/need-intake.ts`  
  Prepare uses this to decide `no-such-project` vs `need-not-in-discovery`.

- **`discoveryMessageAllowed` / `emailVerifiedFromUser`** — `supabase/functions/_shared/verification.ts`  
  Email-unverified sentence. The live send path does **not** call this; SQL `discovery_turn_reserve` does. Prepare only skips `countTokens` when `emailVerified` is false.

- **`anthropicMessagesPort`** — `supabase/functions/_shared/anthropic-messages.ts`  
  Provider stream with `AbortSignal`. Client abort after `message_start` settles as `user_stopped`; abort before that is a failed turn with reason `the client cancelled before the provider answered`.

- **SQL definers** — `public.discovery_turn_reserve` (latest: `supabase/migrations/20260923120100_organization_discovery_switch.sql`), `public.discovery_turn_settle` (`20260920120000_discovery_turns.sql`), `public.discovery_allowance` (`20260916120000_discovery_allowance.sql`), `public.viewer_discovery_allowance` (`20260922120000_discovery_conversation.sql`).  
  These raise the `DETAIL` strings that become HTTP `kind`.

- **Live contract evidence** — `.claude/skills/verify-ai4good/scripts/drive-discovery.ts` and `loop/items/AI4DEV-132/artifacts/verify-discovery/transcript.json`.

---

### Flow

Local URLs the drive used: `POST http://127.0.0.1:44321/functions/v1/discovery-message` and `.../discovery-conversation`. Both have `verify_jwt = true` in `supabase/config.toml` (lines 584–588).

#### 0. CORS / method

1. Browser preflight `OPTIONS` → `edgeHandler` (`edge.ts` 117) returns **204**, headers:
   - `access-control-allow-origin: *`
   - `access-control-allow-headers: authorization, apikey, content-type, x-client-info`
   - `access-control-allow-methods: POST, OPTIONS`
2. `Accept` is **not** in `allow-headers`. The chat-UI research note (`loop/items/AI4DEV-132/research/chat-ui.md` 163) states it is a CORS-safelisted request header, so it does not need a preflight change.
3. Any method other than POST → **405** `{ ok: false, reason: "<name> accepts POST only" }` — **no `kind`**.

#### 1. Headers a client must send

Drive JSON send (`functionPostRaw` in `tests/at/harness/live-stack.ts` 145–149):

| Header | Value |
|---|---|
| `Authorization` | `Bearer <GoTrue access_token>` |
| `apikey` | anon / publishable key |
| `Content-Type` | `application/json` |

Drive SSE send (`drive-discovery.ts` 89–96) adds:

| Header | Value |
|---|---|
| `Accept` | `text/event-stream` |

`x-client-info` is allowed (supabase-js) but the drive did not send it.

Gateway JWT: expired/invalid JWT is refused by Kong **before Deno** as HTTP **401** with body `Invalid JWT` (measured on earlier functions; same `verify_jwt = true`). A request that reaches Deno with no usable caller → function **401** `{ ok: false, reason: "authenticate before calling discovery-message" }` or `"authenticate before reading a Discovery conversation"` — **no `kind`**.

`wantsEventStream` (`discovery-stream.ts` 15–17): true iff some comma-separated `Accept` entry, ignoring parameters after `;`, lowercased, equals `text/event-stream`. Missing `Accept` → JSON path. That is why the AT suite stays JSON.

#### 2. Request bodies

**Send (`discovery-message`)** — camelCase JSON object:

```json
{ "organizationId": "<uuid>", "projectId": "<uuid>", "message": "<text>" }
```

- `organizationId`: `organizationIdField` → trimmed non-empty string, then UUID-shape check in `writeRoute` (360–363).
- `projectId`: `uuidField` in `decideDiscoveryMessage`.
- `message`: `stringField` (trimmed non-empty), max **4000** chars (`DISCOVERY_MESSAGE_MAX_CHARS`).
- Empty body parses as `{}` (`readJsonBody` 527).
- Non-object / bad JSON → **400** `{ ok: false, reason: "the request body must be a JSON object" | "the request body is not valid JSON" }` — **no `kind`**.

**Read (`discovery-conversation`)**:

```json
{ "projectId": "<uuid>" }
```

No `organizationId`. Missing/non-UUID `projectId` → **400** `{ ok: false, reason: "a Discovery conversation must name the project as a uuid" }` — **no `kind`**.

#### 3. Send path (JSON default)

1. `writeRoute` (`edge.ts` 347) → POST, `resolveCaller`, `readJsonBody`.
2. UUID check on organisation id.
3. `loadWriteStanding` → `write_standing` RPC. Unreadable standing → **502** `{ ok: false, kind: "refused", reason: "the caller's standing could not be read..." }`.
4. `writePipeline` → account required, admits `ngo`; deactivated → **403** `account-deactivated`; no account → **409** `no-account`; volunteer/admin account → **403** `not-an-ngo-account`.
5. `decideDiscoveryMessage` (`discovery-turn.ts` 57–70): missing org → **400** `invalid-request` `"a Discovery message must name its organisation"`; org missing → **409** `no-such-organisation`; not admin → **403** `not-a-member` / `not-an-admin`; bad project/message → **400** `invalid-request` `"a Discovery message requires a project id and text within the message limit"`.
6. `discoveryPrepare`: `needIntakeAnswer` (caller JWT, RLS). 502 throw → function **502**. 404 → **409** `no-such-project` with reason **`no such thing is visible to this caller`** (the tenant-read sentence, not the SQL `"no such project in this organisation"`). Stage ≠ `discovery_in_progress` → **409** `need-not-in-discovery` `"the need is not in Discovery"`. Loads settled turns, builds the model request, **`countTokens` only if `caller.emailVerified`**. Sets `p_counted_through_seq` to last settled seq (or 0).
7. `callDatabaseFunction('discovery_turn_reserve', args)` as **service role**. SQL refusals map to **409** when PostgREST `code` is a 5-char SQLSTATE (`rpcRefusalStatus`), with `kind` from `DETAIL` (`parseWriteRefusalKind`).
8. If `Accept` is not event-stream: `discoveryAct` → `messages.create` → `discovery_turn_settle` → **200** JSON.

**JSON 200 body** (`renderDiscoveryMessage`, live `discovery-message-json-1`):

```json
{
  "ok": true,
  "turn": { /* DiscoveryTurnView, camelCase */ },
  "reply": "<assistant text>",
  "elicitation": null,
  "allowance": {
    "organizationId": "...",
    "utcDay": "YYYY-MM-DD",
    "vetted": false,
    "dailyGrant": 10,
    "spentToday": 1,
    "remaining": 9
  }
}
```

`turn` fields from `turnViewFromSql` (28–39): `id`, `projectId`, `seq`, `status`, `billing` (`free`|`fuel`), `utcDay`, `userMessage`, `assistantMessage`, `elicitation`, `requestSettings: { model, maxTokens, effort }`, `maxOutputTokens`, `estimatedInputTokens`, `reservedCredits`, `chargedCredits`, `reservedMicros`, `actualMicros`, `overrunMicros`, `inputTokens`, `outputTokens`, `stopReason`, `servedModel`, `openedAt`, `settledAt`.

Live first turn: `status: "settled"`, `billing: "free"`, `reservedCredits: 2`, `chargedCredits: 1`, `stopReason: "end_turn"`, `servedModel: "claude-haiku-4-5-20251001"`, `elicitation: null`. `reply` equals `turn.assistantMessage`.

#### 4. Send path (SSE when `Accept: text/event-stream`)

Branch: `edge.ts` 382–422, only after **reserve succeeded**. Credit/auth/stage refusals are still **JSON 4xx**, not SSE.

HTTP **200** (default `Response` status). Headers (live `discovery-message-sse-2`):

- CORS trio above
- `access-control-expose-headers: x-vercel-ai-ui-message-stream`
- `content-type: text/event-stream`
- `cache-control: no-cache`
- `connection: keep-alive`
- `x-vercel-ai-ui-message-stream: v1`
- Kong extras: `via: kong/2.8.1`, `transfer-encoding: chunked`, `vary: Accept-Encoding`

Each part is `data: <json>\n\n` except the terminator (`discovery-stream.ts` 6–14). **No `event:` field.**

Exact success sequence (live parts string):

`start → text-start → text-delta* → text-end → data-turn → finish → DONE`

| Wire line | JSON |
|---|---|
| start | `{ "type": "start", "messageId": "<uuid>" }` |
| text-start | `{ "type": "text-start", "id": "<same uuid>" }` |
| text-delta | `{ "type": "text-delta", "id": "...", "delta": "<chunk>" }` |
| text-end | `{ "type": "text-end", "id": "..." }` |
| data-turn | `{ "type": "data-turn", "data": { "ok": true, "turn", "reply", "elicitation", "allowance" } }` |
| finish | `{ "type": "finish" }` |
| `[DONE]` | literal `data: [DONE]\n\n` (not JSON) |

`data-turn.data` is the same object as the JSON 200 body (`{ ok: true, ...renderDiscoveryMessage(settled.value) }`). Live seq 2: `chargedCredits: 1`, `allowance.remaining: 8`.

On-stream failures (HTTP still 200): `{ "type": "error", "errorText": "<string>" }`, then still `finish` and `[DONE]`. `data-turn` is emitted only when settle succeeded **and** `acted.failure === null`. If settle args are null: `errorText` is `the provider outcome is uncertain`. Model `stopReason === 'refusal'` settles `failed` and emits `errorText: "the model refused the request"`.

#### 5. Stop (client abort mid-stream)

1. Client `AbortController.abort()` / `reader.cancel()` after first `text-delta` (`drive-discovery.ts` 129–137).
2. Stream `cancel()` (`edge.ts` 416–419): `cancelled = true` (further `emit` no-ops), `abort.abort()`, `EdgeRuntime.waitUntil(work)` so settle continues after the client is gone.
3. Wire the **client** sees: `start`, `text-start`, first `text-delta` only. No `text-end`, `data-turn`, `finish`, `[DONE]`. Status still **200**. Live abort parts: `start,text-start,text-delta` with delta `"Got"`.
4. Provider: if `message_start` was seen, `anthropic-messages.ts` `stopped()` returns `ok: true`, `stopReason: "user_stopped"`, output tokens from a recount (or `maxTokens` if recount fails). Settle as **completed**.
5. Live row after wait: `status: "settled"`, `stop_reason: "user_stopped"`, partial `assistant_message` (`"Got it—you have the basics recorded, but you need reminders so"`), `charged_credits: 1`, allowance dropped by exactly that charge (8 → 7).
6. Abort **before** `message_start`: `cancelledBeforeAnswer` (`status: 499`) → settle **failed**, `failure: "the client cancelled before the provider answered"`. Client still sees no trailing SSE because `cancelled` suppresses emit.

#### 6. Reload history (`discovery-conversation`)

1. POST `{ projectId }` with the same auth headers (no `Accept` needed).
2. `conversationAnswer` (`discovery-turn.ts` 165–182): `reads.project` (RLS) → empty → **404** `TENANT_NOT_FOUND`; failed REST → **502** `TENANT_READ_FAILED`. Then `discoveryTurnsOf` (`GET /rest/v1/discovery_turns?project_id=eq.<id>&order=seq`, caller JWT; org-member SELECT policy). Then `viewer_discovery_allowance` as the caller. If allowance RPC fails, `allowance` is **`null`**, not a 502.
3. Turns sorted by `seq`, mapped with `turnViewFromSql`. `conversation.elicitation` is the last non-null turn elicitation.

**200 body** (live `discovery-conversation-read`):

```json
{
  "ok": true,
  "conversation": {
    "projectId": "...",
    "turns": [ /* every row, including the user_stopped turn */ ],
    "elicitation": null
  },
  "allowance": { "organizationId", "utcDay", "vetted": false, "dailyGrant": 10, "spentToday": 3, "remaining": 7 }
}
```

Cancelled turn is in history as `status: "settled"`, `stopReason: "user_stopped"`, partial `assistantMessage`. No admin-role check on the read: any org member who can SELECT the project/turns can load it.

#### 7. Allowance shape (`renderDiscoveryAllowance`)

Input snake_case from SQL/RPC; output:

```ts
{
  organizationId: string;
  utcDay: string;       // YYYY-MM-DD
  vetted: boolean;
  dailyGrant: number;   // high-water mark, not raw current-tier grant
  spentToday: number;
  remaining: number;    // must equal granted - spent or render throws
}
```

Grants: unverified **10**, vetted **30** (`DISCOVERY_DAILY_GRANT`). Transcript: unverified org, `dailyGrant: 10`. Short Haiku turns reserved **2** credits, charged **1**. Remaining is what the page should show.

---

### Boundaries

**In**

- Browser/DefaultChatTransport → Kong `/functions/v1/{discovery-message,discovery-conversation}`.
- Function → GoTrue `GET /auth/v1/user` (caller JWT + env anon key).
- Send prepare/conversation → PostgREST as **caller** (`discovery_turns`, `need_intakes`, `projects`, `viewer_discovery_allowance`).
- Reserve/settle → PostgREST as **service role** (`discovery_turn_reserve`, `discovery_turn_settle`).
- Send → Anthropic Messages (`countTokens` / `create` / `stream`). Model override: env `DISCOVERY_MODEL` (drive used Haiku).

**Out**

- JSON `{ ok: true, turn, reply, elicitation, allowance }` or SSE UI-message-stream ending in `data-turn` with the same payload.
- JSON `{ ok: false, kind?, reason }` on refusals (see table).
- Conversation `{ ok: true, conversation, allowance }` or `{ ok: false, reason }` with **no `kind`**.

**Not this contract**

- `discovery-allowance` write route (direct debit/read).
- `set-organization-discovery` (platform admin; drive used it only to produce `discovery-disabled`).
- Direct table access from the page (forbidden; RLS SELECT exists for turns, but the leaf must go through the edge function).

---

### Client-visible refusals

**Rule:** `kind` is present when `writeRoute` uses `json({ ok: false, kind, reason })` (decide/prepare/RPC). `refusal()` (401/405/400 parse/502 catch/JSON settle failure) has **`reason` only**. Conversation never emits `kind`.

Remedies for zero credits are **not a field**. They are the clause after the em dash ` — ` in `reason` (`c-remedies.test.ts` `remediesOf`).

| Situation | HTTP | `kind` | `reason` (exact) |
|---|---|---|---|
| Email unverified | **409** | `email-unverified` | `a Discovery message needs a verified email address — this account is email-unverified. Use the verification link sent to the account address, then send the message again` (SQL reserve; matches `discoveryMessageAllowed`) |
| Zero credits, **unverified** tier | **409** | `daily-allowance-exhausted` | `discovery_allowance refuses: organisation <uuid> has no Discovery credits left today — get vetted (daily grant becomes 30), fund project fuel to continue now, or wait for the next UTC day` (live d7) |
| Zero credits, **vetted** tier | **409** | `daily-allowance-exhausted` | same prefix, remedies: `fund project fuel to continue now, or wait for the next UTC day` (no get-vetted) |
| Debit larger than remaining (>0 remaining) | **409** | `debit-exceeds-remaining` | `discovery_allowance refuses: organisation <uuid> still has <n> Discovery credits remaining today — this debit is larger than what remains` |
| Funded project, no fuel | **409** | `fuel-exhausted` | `this funded project has no fuel left for this Discovery turn; top up project fuel to continue; free credits are never spent on a funded project` (live d6; spend row unchanged) |
| Discovery switched off | **409** | `discovery-disabled` | `a platform admin switched Discovery off for this organisation — <switch reason>` (live: `... — Discovery drive: disable check`) |
| Project not visible at prepare | **409** | `no-such-project` | `no such thing is visible to this caller` |
| Project missing in org at SQL | **409** | `no-such-project` | `no such project in this organisation` |
| Need not in Discovery | **409** | `need-not-in-discovery` | `the need is not in Discovery` |
| Missing/invalid project or message / >4000 chars | **400** | `invalid-request` | `a Discovery message requires a project id and text within the message limit` |
| Missing `organizationId` | **400** | `invalid-request` | `a Discovery message must name its organisation` |
| Malformed org UUID | **400** | `invalid-request` | `the organisation id "<value>" is not a well-formed id` |
| Stale token count | **409** | `stale-context` | `the conversation changed after token counting` |
| Another open turn < 150s | **409** | `turn-in-flight` | `a Discovery turn is in flight` |
| Not NGO / not admin / not member / deactivated | **403** | `not-an-ngo-account` / `not-an-admin` / `not-a-member` / `account-deactivated` | standing/membership sentences |
| Unauthenticated (function) | **401** | *(none)* | `authenticate before calling discovery-message` / `... reading a Discovery conversation` |
| Expired JWT (Kong) | **401** | *(none)* | platform `Invalid JWT` |
| Conversation project not visible | **404** | *(none)* | `no such thing is visible to this caller` |
| Conversation / prepare REST failure | **502** | *(none)* | conversation: `the read could not complete, so no decision was made`. Send throw: `discovery-message could not complete the request: <detail>` |
| JSON settle: provider uncertain / model failure after settle | **502** | *(none)* | `the provider outcome is uncertain` / provider `reason` / `the model refused the request` |
| Stream-time 5xx | **200** + SSE | n/a | `{ type: "error", errorText }` then `finish` + `[DONE]` |

SQL email check in `discovery_allowance` (`discovery_allowance refuses <accountId>: the caller's email address is not verified`) is **not** what send returns: reserve checks email first.

---

### Non-Obvious Things

1. **Refusals never become SSE.** `Accept: text/event-stream` only switches the post-reserve success path. A credit/email/disabled refusal is JSON 409 even if the chat client asked for a stream. `useChat` must treat non-200 JSON as the refusal UI (`reason` text), not as a stream parse error.

2. **`kind` is missing on several 4xx/5xx** that a browser will still see (401, 405, body parse 400, conversation 404/502, Kong `Invalid JWT`, edgeHandler 502). Branch on `kind` when present; always show `reason`.

3. **Remedies are inside `reason`**, after Unicode em dash ` — `, not a `remedies` array. Unverified vs vetted changes that clause only.

4. **Prepare `no-such-project` reason is the tenant 404 sentence**, because `needIntakeAnswer` 404 is remapped (`discovery-turn.ts` 94). SQL’s `"no such project in this organisation"` is the backstop if prepare did not catch it.

5. **Unverified callers still hit SQL.** Prepare skips Anthropic `countTokens` (`counted_input_tokens: 0`) so the provider is not billed; reserve then raises `email-unverified`. `discoveryMessageAllowed` is the fixture/pin oracle, not the live writeRoute gate.

6. **Abort does not roll back the reservation.** The turn settles `user_stopped`, charges actual (or capped) credits, and history on reload includes the truncated assistant text. The aborted HTTP body will not contain `data-turn`; the page must reload conversation to see cost/stop reason.

7. **Stream HTTP status is 200 even when the model fails** after the stream opens. Failure is an `error` part, not a 5xx.

8. **Conversation is not a write route.** No standing gate, no `kind`, no `organizationId`. Visibility is RLS. Allowance RPC failure yields `allowance: null` on an otherwise 200 conversation.

9. **CORS `allow-headers` omits `Accept`.** Intended, because `Accept` is safelisted. `authorization`, `apikey`, and `content-type: application/json` still force a preflight.

10. **DefaultChatTransport body is not the wire body.** The AI SDK’s default POST is messages-shaped. The page must reshape to `{ organizationId, projectId, message }` (brief). The functions do not read `messages`.

11. **`data-turn` is nested.** SSE object is `{ type: "data-turn", data: { ok, turn, reply, elicitation, allowance } }`. The drive reads `part.data.data`.

12. **Funded vs free:** `projects.funded_at` set with no fuel → `fuel-exhausted` and **free credits are not spent** (live d6 spend unchanged). Fuel path sets `reserved_credits = 0`; Stripe reserve is still a comment in SQL.

13. **Open-turn deadline is 150s.** A later send abandons a stale open turn at full reserved charge, then continues. A still-fresh open turn is `turn-in-flight`.

14. **`dailyGrant` is a high-water mark** (`greatest(stored, current tier)`), not necessarily 10 or 30 if the org was later un-vetted.

---

### Open Questions

- Exact Kong **401 body bytes** for a **missing** `Authorization` header on these two functions (expired JWT is documented as `Invalid JWT`; missing header was not in the Discovery transcript).
- Whether a browser `Access-Control-Request-Headers` list that **includes** `accept` would fail preflight. Spec-wise safelisted headers are omitted; not re-measured in this transcript.
- Client abort **before** the first provider event was not in the live drive (only abort after first `text-delta`). Server code path exists (`cancelledBeforeAnswer` / failed settle); wire shape for that case is inferred, not transcribed.
- Whether `useChat` / `DefaultChatTransport` will surface a JSON 409 `reason` cleanly when `Accept: text/event-stream` was sent — that is client SDK behavior, not these functions.
- Conversation `allowance: null` when `viewer_discovery_allowance` fails: not hit in the live transcript (allowance was always present).

---

### Files Read

- `loop/items/AI4DEV-159/brief.md`
- `supabase/functions/discovery-message/index.ts`
- `supabase/functions/discovery-conversation/index.ts`
- `supabase/functions/_shared/edge.ts`
- `supabase/functions/_shared/write-routes.ts`
- `supabase/functions/_shared/discovery-turn.ts`
- `supabase/functions/_shared/discovery-stream.ts`
- `supabase/functions/_shared/discovery-metering.ts`
- `supabase/functions/_shared/discovery-allowance.ts`
- `supabase/functions/_shared/discovery-reads.ts`
- `supabase/functions/_shared/memberships.ts`
- `supabase/functions/_shared/caller.ts`
- `supabase/functions/_shared/tenant-reads.ts`
- `supabase/functions/_shared/need-intake.ts` (needIntakeAnswer)
- `supabase/functions/_shared/verification.ts`
- `supabase/functions/_shared/anthropic-messages.ts`
- `supabase/functions/_shared/accounts.ts` (partial)
- `supabase/migrations/20260923120100_organization_discovery_switch.sql`
- `supabase/migrations/20260920120000_discovery_turns.sql`
- `supabase/migrations/20260916120000_discovery_allowance.sql`
- `supabase/migrations/20260922120000_discovery_conversation.sql`
- `supabase/config.toml` (functions + edge_runtime)
- `.claude/skills/verify-ai4good/scripts/drive-discovery.ts`
- `loop/items/AI4DEV-132/artifacts/verify-discovery/transcript.json`
- `tests/at/harness/live-stack.ts` (`functionPost` / `functionPostRaw`)
- `tests/at/suites/req-004/_fixture.ts`, `_source-pins.ts`, `c-remedies.test.ts`, `e-guardrails.test.ts`
- `loop/items/AI4DEV-132/research/chat-ui.md`