The Discovery turn is a reserve-then-act-then-settle loop. The structured elicitation record lives on the settled turn row; the chat page never reads it. A second structured output (the scope) cannot ride inside that elicitation object without changing the parser.

### Components Found

- **`discovery-message` edge function** (`supabase/functions/discovery-message/index.ts`) — POST write route. `decide` → `prepare` (token count) → RPC `discovery_turn_reserve` → model `act`/`stream` → RPC `discovery_turn_settle` → `render`.
- **`discovery-conversation` edge function** (`supabase/functions/discovery-conversation/index.ts`) — POST read. Not in `WRITE_ROUTES`. Calls `conversationAnswer`.
- **`discovery-allowance` edge function** (`supabase/functions/discovery-allowance/index.ts`) — read/debit of the daily free-credit pool. No conversation.
- **`decideDiscoveryMessage` / `discoveryPrepare` / `discoveryAct` / `discoveryStream` / `settleArgsFrom` / `conversationAnswer` / `renderDiscoveryMessage` / `turnViewFromSql`** (`supabase/functions/_shared/discovery-turn.ts`) — TypeScript turn lifecycle.
- **`DiscoveryTurnSqlRow` / `DiscoveryReads` / `CallerReads`** (`supabase/functions/_shared/discovery-reads.ts`) — row shape and read ports (`discoveryTurnsOf`, `discoveryAllowance`, plus tenant + need reads).
- **`MessagesPort` / `DiscoveryModelRequest` / `DiscoveryModelAnswer`** (`discovery-turn.ts`) — Anthropic seam. Tools: only `record_elicitation`.
- **`anthropicMessagesPort`** (`supabase/functions/_shared/anthropic-messages.ts`) — live `create` / `countTokens` / `stream`. Folds cache tokens into input. Stop-after-start settles as completed with `user_stopped`.
- **`reservationFor` / `settlementFor` / `billingTargetFor` / `fuelRouteAllowed` / `reserveSettings`** (`supabase/functions/_shared/discovery-metering.ts`) — prices, caps, free vs fuel.
- **`Allowance` / `decideDiscoveryAllowance` / `DISCOVERY_DAILY_GRANT`** (`supabase/functions/_shared/discovery-allowance.ts`) — 10 unverified / 30 vetted credits per UTC day.
- **`decideOrganizationDiscovery`** (`supabase/functions/_shared/discovery-switch.ts`) — platform-admin on/off switch. Reserve refuses `discovery-disabled`.
- **Stream codecs** (`supabase/functions/_shared/discovery-stream.ts`) — SSE parts: `start`, `text-start`, `text-delta`, `text-end`, `data-turn`, `error`, `finish`, `[DONE]`.
- **`writeRoute`** (`supabase/functions/_shared/edge.ts` lines 337–437) — shared pipeline; stream vs JSON settle.
- **`WRITE_ROUTES['discovery-message']`** (`supabase/functions/_shared/write-routes.ts` lines 68–71) — RPC is `discovery_turn_reserve` only. Settle is a second RPC on the spec, not a write-route row.
- **`RECORD_ELICITATION_TOOL` / `parseElicitation` / `discoverySystemPrompt`** (`supabase/functions/_shared/discovery-prompt.ts`) — one structured tool; parser requires exactly five keys.
- **`DISCOVERY_SKILLS`** (`supabase/functions/_shared/discovery-skills/index.ts`) — five skill bodies inlined into the cached system block.
- **`needIntakeAnswer` / `NeedIntakeView.causeLabels`** (`supabase/functions/_shared/need-intake.ts`) — need read; `cause_labels` is copied onto the view and never written by Discovery.
- **`discoveryMessageAllowed`** (`supabase/functions/_shared/verification.ts` line 141) — email-verified floor. Loop fixture calls it; live SQL repeats the same sentence.
- **`TAXONOMY` / `createNotifications().emit`** (`notification-taxonomy.ts`, `notifications.ts`) — closed event list. Discovery turns do not emit. `scope.service` is declared as a non-sender.
- **Chat page** (`src/routes/discovery/$organizationId.$projectId.tsx`) + **`src/lib/discovery-chat.ts`** — `useChat` + `DefaultChatTransport` to `discovery-message` with `Accept: text/event-stream`. Conversation reload via `discovery-conversation`.
- **Table `public.discovery_turns`** (`supabase/migrations/20260920120000_discovery_turns.sql`) — durable turn store.
- **AT suite req-004** (`tests/at/suites/req-004/`) — metering, funded routing, conversation, guardrails, later-run stubs including `AWAITED.scopeOutput`.
- **At-config** (`tests/at/harness/atconfig.ts` + `tests/at/harness/config.ts`) — pinned Discovery numbers under `req-004.discovery.*` and daily grants under `req-002.discovery.daily_credits.*`.

### Flow

**1. User sends a message (chat page)**  
`DiscoveryChat.onSend` → `sendMessage({ text })` (`src/routes/discovery/$organizationId.$projectId.tsx` ~292–306).  
Transport POSTs `{ organizationId, projectId, message }` to `/functions/v1/discovery-message` with `Accept: text/event-stream` (lines 212–232).

**2. Gate + decide**  
`writeRoute` (`edge.ts` 347–373): POST, auth, JSON body, `write_standing`, `writePipeline`.  
`decideDiscoveryMessage` (`discovery-turn.ts` 57–71): org exists, caller is org admin, `projectId` is a uuid, `message` is non-empty and ≤ `DISCOVERY_MESSAGE_MAX_CHARS` (4000). Args: `p_account_id`, `p_organization_id`, `p_project_id`, `p_message`, `p_settings: reserveSettings()`, `p_counted_through_seq: 0`.

**3. Prepare (count, do not reserve)**  
`discoveryPrepare` (`discovery-turn.ts` 90–115):
- `needIntakeAnswer` — 404 → `no-such-project`; stage must be `discovery_in_progress`.
- `reads.discoveryTurnsOf(projectId)` (REST `GET discovery_turns?project_id=eq.…&order=seq`, caller JWT, RLS).
- Settled turns, seq order → `contextMessagesFrom` + current user message.
- `buildModelRequest`: cached system (prompt + skills) + uncached need JSON `{ title, description, urgency, reference_files: file names only }`. **No `causeLabels`.** Tools: `[RECORD_ELICITATION_TOOL]`.
- If `caller.emailVerified`, `port.countTokens`; else count stays 0 (SQL will refuse).
- Returns args with `counted_input_tokens`, `model`, `p_counted_through_seq` = last settled seq, and a non-enumerable `PREPARED_REQUEST` symbol holding the counted request. `JSON.stringify` for the RPC drops the symbol.

**4. Reserve (SQL, one transaction)**  
`callDatabaseFunction('discovery_turn_reserve', args)` (`edge.ts` 375). Latest body: `supabase/migrations/20260923120100_organization_discovery_switch.sql` 102–244.

Order:
1. Active account; org `FOR SHARE`; membership admin.
2. If `organizations.discovery_disabled_at` is set → `discovery-disabled`.
3. Email confirmed, else the pinned sentence (`email-unverified`).
4. Validate `p_settings` (model/effort strings; numeric keys including `counted_input_tokens`; only `counted_input_tokens` may be 0; cap `2147483583`).
5. `projects` `FOR UPDATE`; need stage `discovery_in_progress`.
6. One open turn: if `opened_at` is within `turn_deadline_seconds` (150) → `turn-in-flight`. Else abandon it: `status='abandoned'`, `charged_credits = reserved_credits` (free keeps the debit; fuel reserved is 0).
7. `p_counted_through_seq` must equal `max(seq) of settled` else `stale-context`.
8. Billing: `projects.funded_at is null` → `'free'`, else `'fuel'`.
9. Estimated input = `counted_input_tokens + 64` (SQL hardcodes the margin; TS `DISCOVERY_INPUT_MARGIN_TOKENS` is 64).
10. **Free:** read allowance; shrink `max_output` to what remaining credits can buy, but never below `min_output_tokens` (512); `reserved_micros` from the bound; `reserved_credits = ceil(reserved_micros / 100000)`; **debit that many credits** via `discovery_allowance(..., 'debit', ...)`.
11. **Fuel:** `project_fuel_available_micros` (currently `select 0`); shrink max; if max < min → `fuel-exhausted`; `reserved_credits = 0`. Comment: Stripe later adds `project_fuel_reserve`. No fuel debit yet.
12. Insert open row, `seq = max(seq)+1`. Return `{ turn, need, context, allowance }`.

**5. Stream or JSON act**  
If `Accept` includes `text/event-stream` (`discovery-stream.ts` `wantsEventStream`) (`edge.ts` 382–422):
- SSE headers include `x-vercel-ai-ui-message-stream: v1`.
- Parts in order: `start(id)` → `text-start(id)` → `text-delta`s from `port.stream` → `text-end` → optional `error` → optional settle + `data-turn` → `finish` → `data: [DONE]`.
- Client abort: `AbortController.abort()` and `EdgeRuntime.waitUntil(work)` so settle still runs.

If not streaming (`edge.ts` 424–435): `discoveryAct` → `port.create` → settle RPC → JSON `{ ok: true, turn, reply, elicitation, allowance }`.

AT live `functionPost` has no event-stream Accept, so tests take the JSON path. The chat page streams.

**6. Model answer → settle args**  
`settleArgsFrom` (`discovery-turn.ts` 121–143):
- `!ok && status === null` → **no settle args** (open turn left hanging).
- `stopReason === 'refusal'` → `p_outcome: 'failed'`, all usage/elicitation null, `failure: 'the model refused the request'`.
- Else completed if `ok`, else failed. Elicitation set only when `ok` and `toolUse.name === 'record_elicitation'` and `parseElicitation` succeeds; invalid tool input → `p_elicitation: null` but still **completed**.
- Stream cancel before first `message_start`: failed, status 499. After start: completed, `user_stopped`, `toolUse: null`, output tokens from a recount of partial text (or `maxTokens` if recount fails).

**7. Settle (SQL)**  
`discovery_turn_settle` (`20260920120000_discovery_turns.sql` 221–273), never replaced later.

Completed: require non-null usage and `assistant_message`, `output_tokens ≤ max_output_tokens`; write `status='settled'`, `assistant_message`, **`elicitation = p_elicitation`**, tokens, `stop_reason`, `served_model`, `actual_micros`, `charged_credits`, `overrun_micros`, `settled_at`.  
Free charged = `least(reserved_credits, ceil(actual_micros / micros_per_credit))`. Fuel reserved is 0 so charged is 0 (`discovery_turns_fuel_touches_no_credits`).

Failed: `status='failed'`, `charged_credits=0`, `settled_at`. Elicitation stays null.

If `reserved_credits > charged_credits`, `discovery_spend_release` the difference (failed free turn releases the whole reservation; abandoned does not, because charged already equals reserved).

Return `{ turn, allowance }` (fresh read). `renderDiscoveryMessage` maps to camelCase view + `reply` + this turn's `elicitation`.

Stream emits `data-turn` only when `acted.failure === null` and settle RPC succeeded. JSON path: if failure is set after a successful failed-settle, HTTP 502 with the failure sentence; the row is already `failed`.

**8. Conversation read**  
`conversationAnswer` (`discovery-turn.ts` 165–183): project visible → all turns of the project → `turnViewFromSql` in seq order.  
**Completed elicitation = last turn (by seq) whose `elicitation !== null`, else null.** Returned as `conversation.elicitation`. Allowance via `viewer_discovery_allowance`.

Chat `parseConversationBody` (`src/lib/discovery-chat.ts` 65–96) keeps only `turns` and `allowance`. **It drops `conversation.elicitation`.** `DiscoveryTurn` on the page is only `id, seq, status, userMessage, assistantMessage`.

**9. Chat consume**  
`onData`: only `part.type === 'data-turn'`; updates allowance and `knownMaxSeq` (`$organizationId.$projectId.tsx` 240–248).  
`textOf` joins only `type === 'text'` parts (line 36–38).  
Stop: abort, then `pollUntilTurnSettled` on `discovery-conversation` until a turn newer than `knownMaxSeq` is not `open`.

---

### Table: columns, constraints, indexes (by name)

**Columns** (`discovery_turns`, migration `20260920120000_discovery_turns.sql` 4–31):

`id`, `project_id`, `org_id`, `seq`, `status`, `billing`, `utc_day`, `user_message`, `assistant_message`, **`elicitation` jsonb**, **`request_settings` jsonb not null**, `max_output_tokens`, `estimated_input_tokens`, `micros_per_credit`, `input_micros_per_token`, `output_micros_per_token`, `reserved_micros`, `reserved_credits`, `input_tokens`, `output_tokens`, `stop_reason`, `served_model`, `actual_micros`, `charged_credits`, `overrun_micros`, `opened_at`, `settled_at`.

**Enums:** `discovery_turn_status` (`open`, `settled`, `failed`, `abandoned`); `discovery_billing` (`free`, `fuel`).

**Named CHECKs:**
- `discovery_turns_open_iff_unsettled` — `open` iff `settled_at is null`
- `discovery_turns_reservation_is_the_bound` — `reserved_micros = estimated_input_tokens * input_price + max_output_tokens * output_price`
- `discovery_turns_free_reserved_at_ratio` — free ⇒ `reserved_credits = ceil(reserved_micros / micros_per_credit)`
- `discovery_turns_fuel_touches_no_credits` — fuel ⇒ reserved and charged credits are 0
- `discovery_turns_open_has_no_outcome` — open ⇒ `assistant_message`, `charged_credits`, `actual_micros` all null (**does not mention `elicitation`**)
- `discovery_turns_settled_is_measured` — settled ⇒ tokens ≥ 0, `output_tokens ≤ max_output_tokens`, assistant not null, actual/overrun arithmetic, free charged = `least(reserved, ceil(actual/ratio))`
- `discovery_turns_failed_costs_nothing` — failed ⇒ `charged_credits = 0`
- `discovery_turns_abandoned_keeps_reservation` — abandoned ⇒ `charged_credits = reserved_credits`

**Other constraints (unnamed in SQL, Postgres default names):**
- PK on `id` → `discovery_turns_pkey`
- `unique (project_id, seq)` → `discovery_turns_project_id_seq_key`
- `foreign key (project_id, org_id) references projects(id, org_id) on delete cascade` → `discovery_turns_project_id_org_id_fkey`

**Indexes:** `discovery_turns_one_open_per_project` unique on `project_id` where `status = 'open'`; `discovery_turns_by_org_day` on `(org_id, utc_day)`.

**Trigger `discovery_turns_immutable`:** no DELETE. UPDATE only `open` → `{settled, failed, abandoned}`. Mutable columns only: `status`, `assistant_message`, **`elicitation`**, `input_tokens`, `output_tokens`, `stop_reason`, `served_model`, `actual_micros`, `charged_credits`, `overrun_micros`, `settled_at`. Everything else, including a new column, is frozen unless this allow-list is extended.

**RLS:** revoke all; grant SELECT to `authenticated`; policies `discovery_turns_select_org_member`, `discovery_turns_select_platform_admin`. Writes only through security-definer RPCs as `service_role`.

**`request_settings` stored as** `{ model, max_tokens, effort }` (`max_tokens` is the possibly-shrunk cap). No JSON CHECK.

**`elicitation`:** unconstrained jsonb. SQL settle writes whatever `p_elicitation` is. TypeScript is the schema.

---

### Where a completed elicitation is stored, and how a caller finds it later

Stored on **`public.discovery_turns.elicitation`** of the **settled** turn that ran `record_elicitation` with a payload `parseElicitation` accepted.

Shape (`DiscoveryTurnSqlRow.elicitation` / `GRANT_TRACKER_ELICITATION`):

```ts
{ complete: true, facts: string[], constraints: string[],
  userStories: { story: string, acceptanceCriteria: string[] }[],
  openQuestions: string[] }
```

Exactly five keys. Extra keys → `null` (selftest `discovery-elicitation.selftest.ts` 7–16). Tool is `strict: true`, `additionalProperties: false`.

Find it later:
1. `POST discovery-conversation` `{ projectId }` → `body.conversation.elicitation` (latest non-null by seq) and `body.conversation.turns[].elicitation`.
2. JSON/stream `discovery-message` success → `elicitation` on that turn (`renderDiscoveryMessage`).
3. Authenticated `GET /rest/v1/discovery_turns?project_id=eq.…` (RLS).

The chat page does **not** display or keep it. `onData` ignores elicitation on `data-turn`. `parseConversationBody` ignores `conversation.elicitation`.

AT-004.10 asserts the grant-tracker last turn has elicitation and that `readConversation.elicitation` equals that last turn's record.

---

### Where a second structured output (the scope) could attach

`tests/at/suites/req-004/_pending.ts` already names `scopeOutput: 'discovery.scope-output'`. `z-later-runs.test.ts` parks AT-004.20–22, .24–25, .52, .58–60 on that capability. Nothing stores a scope today.

**Do not put it inside `elicitation`.** `parseElicitation` rejects extra keys (`Object.keys(input).length !== 5`). The tool schema forbids extra properties. That would change the existing record.

**Sibling jsonb column on `discovery_turns` (e.g. `scope`):** fits the elicitation pattern.
- Add the column.
- Add it to `discovery_turn_immutable`'s allow-list (required; otherwise settle raises “the Discovery reservation is immutable”).
- Write it in `discovery_turn_settle` (new arg or reuse jsonb).
- Parse in `settleArgsFrom` from a second tool (or a second `toolUse` block — today `answerFrom` takes the **first** `tool_use` only, `anthropic-messages.ts` 35).
- Mirror elicitation in `conversationAnswer` (`turns.filter(t => t.scope !== null).at(-1)`).
- Optional CHECK: open/failed have null scope. `open_has_no_outcome` currently does not even cover elicitation.
- After settle, the trigger forbids rewrite. Regeneration would be a **new turn**, same as a second elicitation (latest-non-null wins).

**`need_intakes`:** better for a durable “the project’s scope” that outlives turns. `cause_labels` already lives here. `conversationAnswer` does not read the need row today (only `project` for `org_id`). Would need a new write (not the turn immutable trigger). Stage is already `discovery_in_progress` when turns run.

**New table:** avoids the immutable allow-list. Closest match to `notifications.ts` declaring `'scope.service'` as a producer that cannot send mail itself.

Fuel/free CHECKs do not block extra jsonb. The real gates are the immutable allow-list and “one open turn per project”.

### Cause-label vocabulary

- Column: `need_intakes.cause_labels text[] not null default '{}'` (`20260917120000_project_need_intake.sql` 12).
- CHECK `need_intakes_draft_has_no_labels`: draft ⇒ `'{}'`. Labels are legal only after submit (`discovery_in_progress`).
- No vocabulary table, enum, or membership CHECK. Unconstrained `text[]`.
- `project-need` actions (`start`/`save`/`attach`/`submit`) never write labels. Tests pin `[]` on draft (req-003 `c-labels.test.ts`).
- Discovery prepare does not send `causeLabels` to the model. REST need select includes `cause_labels` (`edge.ts` 473) but `DiscoveryNeed` omits it.
- Taxonomy `discovery.fit_declined.payloadKeys` includes `declineCause` — a **fit-decline reason**, not NGO cause labels. No turn emits notifications.
- Attachment: a closed vocabulary (const or table) plus a producer that writes `need_intakes.cause_labels` after elicitation/scope, while stage is `discovery_in_progress`. If that write should notify, add a `TAXONOMY` row; `emit` refuses unregistered events (`notifications.ts` 374–376). `runtimeRegistrationSurface()` is empty by design.

### What a new stream part must be so the chat page ignores it

Today `discovery-stream.ts` emits only:

| helper | SSE `type` |
|---|---|
| `start` | `start` + `messageId` |
| `textStart` / `textDelta` / `textEnd` | `text-start` / `text-delta` / `text-end` |
| `dataTurn` | **`data-turn`** + `data` |
| `error` | `error` + `errorText` |
| `finish` / `done` | `finish` / `[DONE]` |

The page:
- `onData`: `if (part.type !== "data-turn") return;`
- `textOf`: only `part.type === "text"`
- extra keys on `data-turn` (`elicitation`, a future `scope`) are already ignored

A new part the SDK will accept and the page will ignore:

```ts
part({ type: 'data-scope', data: payload })
```

Must be **`data-*`** (AI SDK UI message stream v1). Not `scope`, not `tool-call`. Add a helper next to `dataTurn`. Emit **after** `text-end` (and probably after settle, like `data-turn`), so the text closing message still streams. Do not replace the text parts with only a data part: an assistant message with empty text still renders an empty `<li>` (`$organizationId.$projectId.tsx` 325–335).

Alternatively, put scope on the existing `data-turn` payload. The page already ignores unknown keys there. That is quieter but mixes two records in one part.

### Metering numbers (at-config ↔ code)

Pinned in `AT_CONFIG` and `CONFIG_KEYS`:

| dotted key | value | code |
|---|---|---|
| `req-004.discovery.micros_per_credit` | 100000 | `DISCOVERY_MICROS_PER_CREDIT` |
| `req-004.discovery.input_micros_per_token` | 5 | `DISCOVERY_PRICE_MICROS_PER_TOKEN.input` |
| `req-004.discovery.output_micros_per_token` | 25 | `.output` |
| `req-004.discovery.max_output_tokens` | 4096 | `DISCOVERY_REQUEST_SETTINGS.maxOutputTokens` |
| `req-004.discovery.min_output_tokens` | 512 | `.minOutputTokens` |
| `req-004.discovery.turn_deadline_seconds` | 150 | `DISCOVERY_TURN_DEADLINE_SECONDS` |
| `req-002.discovery.daily_credits.unverified` | 10 | `DISCOVERY_DAILY_GRANT.unverified` |
| `req-002.discovery.daily_credits.vetted` | 30 | `.vetted` |

Model pin: `claude-opus-5`, effort `low`. Live client may override with `DISCOVERY_MODEL`. `AT-004.01`/`_source-pins.ts` assert TS, SQL sentences, and at-config match.

Overrun: charged credits never exceed reserved (free). `overrun_micros = max(0, actual - reserved)` is recorded, not billed. Last-credit path may shrink `max_output` or refuse `debit-exceeds-remaining`.

### Files Read

- `supabase/functions/discovery-message/index.ts`
- `supabase/functions/discovery-conversation/index.ts`
- `supabase/functions/discovery-allowance/index.ts`
- `supabase/functions/_shared/discovery-turn.ts`
- `supabase/functions/_shared/discovery-metering.ts`
- `supabase/functions/_shared/discovery-stream.ts`
- `supabase/functions/_shared/discovery-allowance.ts`
- `supabase/functions/_shared/discovery-switch.ts`
- `supabase/functions/_shared/discovery-reads.ts`
- `supabase/functions/_shared/discovery-prompt.ts`
- `supabase/functions/_shared/discovery-skills.ts`
- `supabase/functions/_shared/discovery-skills/index.ts`
- `supabase/functions/_shared/discovery-skills/02-ground-the-scope.md`
- `supabase/functions/_shared/discovery-skills/04-complete-the-record.md`
- `supabase/functions/_shared/anthropic-messages.ts`
- `supabase/functions/_shared/edge.ts` (writeRoute, callerReads, stream)
- `supabase/functions/_shared/write-routes.ts`
- `supabase/functions/_shared/need-intake.ts`
- `supabase/functions/_shared/tenant-reads.ts`
- `supabase/functions/_shared/verification.ts`
- `supabase/functions/_shared/notifications.ts`
- `supabase/functions/_shared/notification-taxonomy.ts`
- `supabase/migrations/20260920120000_discovery_turns.sql`
- `supabase/migrations/20260921120000_discovery_funded_routing.sql`
- `supabase/migrations/20260922120000_discovery_conversation.sql`
- `supabase/migrations/20260923120100_organization_discovery_switch.sql`
- `supabase/migrations/20260916120000_discovery_allowance.sql`
- `supabase/migrations/20260917120000_project_need_intake.sql`
- `src/routes/discovery/$organizationId.$projectId.tsx`
- `src/lib/discovery-chat.ts`
- `tests/at/suites/req-004/_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_bind.ts`, `_source-pins.ts`
- `tests/at/suites/req-004/a-metering.test.ts`, `b-funded-routing.test.ts`, `d-conversation.test.ts`, `e-guardrails.test.ts`, `f-transparency.test.ts`, `z-later-runs.test.ts`
- `tests/at/suites/req-004/fixtures/grant-tracker.ts`
- `tests/at/harness/discovery-stream.selftest.ts`, `discovery-elicitation.selftest.ts`, `vendors.ts`, `atconfig.ts`, `config.ts`
- `tests/at/harness/live-stack.ts` (functionPost)

### Boundaries

**In:** authenticated org-admin POST `{ organizationId, projectId, message }` (write) or `{ projectId }` (read). Need must be `discovery_in_progress`. Email verified. Org Discovery switch on.

**Out:** JSON turn view or SSE UI-message-stream; conversation `{ turns, elicitation }`; allowance. Spend on `discovery_spend` (free) or (later) project fuel.

**Does not touch:** notifications emitter, cause-label vocabulary, Stripe fuel reserve (`project_fuel_available_micros` is a zero stub), UI DB (page goes through edge functions only).

**Need intake:** supplies title/description/urgency/file names into the uncached system block; `cause_labels` is selected and ignored.

**Anthropic:** `MessagesPort`. Loop tests use `createAnthropicMessagesSim` (`vendors.ts`). Integration AT-004.10 awaits `vendors.anthropic`.

### Non-Obvious Things

1. **Prepare context ≠ SQL reservation context.** `discoveryAct`/`discoveryStream` use `args[PREPARED_REQUEST]`, not `reservation.context`. SQL context is for operator/tests. `contextMessagesFrom` **drops a settled turn whose `assistant_message === ''`** (user line too). SQL context includes those empty assistant lines. A tool-only completed turn with empty text is legal (`settleArgsFrom` selftest) and then disappears from the next model context.

2. **Uncertain provider (`status === null`) does not settle.** The turn stays `open` until the 150s deadline, then the next reserve abandons it and **keeps the free reservation**. Cancel after `message_start` settles **completed** (partial text billed), not failed.

3. **`data-turn` is the only structured stream part.** Elicitation already rides on that payload and on the JSON body; the chat page throws both away.

4. **First `tool_use` block only.** A second tool for scope needs a change in `answerFrom` (`anthropic-messages.ts` 35), not just a new schema.

5. **Fuel is routed but not charged in SQL.** `billing='fuel'` and `reserved_credits=0` are real. `project_fuel_available_micros` returns 0, so a funded project refuses `fuel-exhausted` on the live stack. The loop fixture subtracts `actualMicros` in memory. Integration AT-004.04 throws `CapabilityPending([projectFuelCheckout, fundedTurnBilling])`.

6. **Email gate is SQL, not `decideDiscoveryMessage`.** Prepare skips `countTokens` when unverified. `verification.ts` is used by the loop fixture and pin tests, not by the live decide function.

7. **`discovery-conversation` is not a write route.** No `WRITE_ROUTES` row, no standing gate in that inventory. Auth + RLS only.

8. **`scope` in the skills means “don’t invent scope,” not a stored document.** `02-ground-the-scope.md` is a prompt. The stored structured output today is elicitation. Later ATs wait on `discovery.scope-output`.

9. **Immutable allow-list is the real schema for settle writes.** Adding `scope` without updating `discovery_turn_immutable` fails even if the column exists.

10. **Latest elicitation, not “the” elicitation.** A later settled turn without a tool call leaves the previous elicitation as `conversation.elicitation`. A later valid tool call replaces it. There is no “complete Discovery” stage change when elicitation is recorded.

### Open Questions

- Exact product shape of “the scope” vs elicitation (facts/stories vs a later publishable scope). The suite reserves AT ids on `discovery.scope-output` but does not define the JSON.
- Whether cause labels are produced from elicitation, from the scope, or from a separate classifier. Nothing in Discovery writes `cause_labels`.
- How two `tool_use` blocks in one Anthropic message should be folded; only the first is read.
- When Stripe `project_fuel_reserve` lands, whether settle must release unused fuel the way `discovery_spend_release` does for free credits (the comment in reserve says the reserve call is added there; settle has no fuel release).
- Whether empty-assistant settled turns should stay in SQL context to match prepare; they currently diverge.
- I did not run the database or the suite. Constraint default names (`_pkey`, `_key`, `_fkey`) are Postgres naming, not explicit `constraint` clauses.