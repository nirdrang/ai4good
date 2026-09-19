I have the call chain from prompt construction through the Anthropic port and the loop-tier stand-in. Findings below.

### Components Found

- **`DISCOVERY_SYSTEM_PROMPT_TEMPLATE`** — `supabase/functions/_shared/discovery-prompt.ts` lines 5–9. Fixed role text: one question at a time, no invented facts, call `record_elicitation` plus a two-sentence close when done.
- **`DiscoveryNeed`** — same file, line 10. `{ title, description, urgency, reference_files }`. Cause labels and mission text are not in this type.
- **`SystemBlock`** — same file, line 11. `{ text, cached }`. Cached maps to Anthropic `cache_control: ephemeral`.
- **`discoverySystemPrompt(need, skills)`** — same file, lines 12–17. Two blocks: cached template+skills, uncached need JSON.
- **`RECORD_ELICITATION_TOOL`** — same file, lines 20–37. The only tool sent today. `strict: true`, `additionalProperties: false`.
- **`parseElicitation(input)`** — same file, lines 40–47. Runtime gate stricter than the schema: exactly five top-level keys, `complete === true`, string arrays, user-story objects with exactly two keys.
- **`DiscoverySkill` / `discoverySkillsText`** — `supabase/functions/_shared/discovery-skills.ts`. `{ name, body }`; folds markdown into `# name\nbody` sections.
- **`DISCOVERY_SKILLS`** — `supabase/functions/_shared/discovery-skills/index.ts`. Generated array from five `.md` files. Deno cannot read the folder at runtime.
- **Skill markdown** — `supabase/functions/_shared/discovery-skills/01-elicit.md` … `05-plain-language.md`. `04-complete-the-record.md` is the instruction that tells the model to call `record_elicitation`.
- **`readDiscoverySkillsSync` / `generate-discovery-skills.ts`** — `tests/at/harness/discovery-skills.ts`, `tests/at/harness/generate-discovery-skills.ts`. Node reader (CRLF→LF) and `bun run discovery:skills` writer.
- **`DiscoveryModelRequest` / `DiscoveryModelAnswer` / `MessagesPort`** — `supabase/functions/_shared/discovery-turn.ts` lines 14–27. Request type pins `tools: typeof RECORD_ELICITATION_TOOL[]` and `effort: 'low'`. Port: `model`, `create`, `countTokens`, `stream`.
- **`buildModelRequest`** — same file, lines 80–88. Assembles system, messages, and `tools: [RECORD_ELICITATION_TOOL]`.
- **`discoveryPrepare` / `discoveryAct` / `discoveryStream` / `settleArgsFrom`** — same file. Prepare counts tokens and stashes the request on a symbol; act/stream call the port; settle maps `toolUse.name === 'record_elicitation'` through `parseElicitation`.
- **`anthropicMessagesPort`** — `supabase/functions/_shared/anthropic-messages.ts`. The one real Anthropic client. SDK `npm:@anthropic-ai/sdk@0.115.0`, `maxRetries: 0`, timeout 120s.
- **`DISCOVERY_CLIENT_MODEL`** — same file, line 5. `'claude-opus-5'`. Must match `DISCOVERY_REQUEST_SETTINGS.model` (`discovery-metering.ts` line 4); `_source-pins.ts` `meteringPinProblems` enforces that.
- **`servedModel()`** — `anthropic-messages.ts` line 11. `Deno.env.get('DISCOVERY_MODEL') ?? DISCOVERY_CLIENT_MODEL`.
- **`createAnthropicMessagesSim`** — `tests/at/harness/vendors.ts` lines 42–90. Loop-tier stand-in. FIFO scripted replies; does not read prompt text.
- **`ScriptedReply` / `AnthropicMessagesSim` / `AnthropicMessagesPort`** — `tests/at/harness/contracts.ts` lines 164–180. Test face: `script` + `requests`. SUT face: same three methods as `MessagesPort`.
- **`GRANT_TRACKER` / `GRANT_TRACKER_ELICITATION`** — `tests/at/suites/req-004/fixtures/grant-tracker.ts`. Six NGO lines, six scripted replies, last is the tool call. `source: 'handwritten'`.
- **`grantTrackerOracleProblems`** — `tests/at/suites/req-004/fixtures/grant-tracker.oracle.ts`. Semantic check of elicitation vs intake, not the stand-in.
- **`record-grant-tracker.ts`** — same fixtures folder. Live recorder: drives `discovery-message`, writes `grant-tracker.ts` as `source: 'recorded'`.
- **`createFixtureAdapter`** — `tests/at/suites/req-004/_fixture.ts`. Loop SUT. `sendMessage` calls `discoveryPrepare` + `discoveryAct` with `opts.vendors.anthropic`.
- **`createLiveAdapter`** — `tests/at/suites/req-004/_live.ts`. Integration SUT. `sendMessage` POSTs `discovery-message`. No stand-in; no model pick in the test.
- **`AWAITED.anthropicLive`** — `tests/at/suites/req-004/_pending.ts` line 4. Value `'vendors.anthropic'`. AT-004.10 integration throws this.
- **`AT_CONFIG` discovery pins** — `tests/at/harness/atconfig.ts` lines 36–41. Token prices, max/min output, deadline. No model-id pin.

### Flow

1. **Entry (product).** NGO chat page `src/routes/discovery/$organizationId.$projectId.tsx` POSTs `{ organizationId, projectId, message }` to `discovery-message` with `Accept: text/event-stream` (lines 209–232). Loop tests call `sut.sendMessage` without that header, so they take the JSON `create` path.

2. **Route.** `supabase/functions/discovery-message/index.ts` serves `writeRoute` with `prepare: discoveryPrepare(port, DISCOVERY_SKILLS)`, `settle.act: discoveryAct(port)`, `settle.stream: discoveryStream(port)`. One `anthropicMessagesPort()` is built at module load (line 7).

3. **Decide.** `decideDiscoveryMessage` (`discovery-turn.ts` 57–71) requires org admin, a project uuid, and message ≤ `DISCOVERY_MESSAGE_MAX_CHARS` (4000).

4. **Prepare — prompt + count.** `discoveryPrepare` (`discovery-turn.ts` 90–114):
   - `needIntakeAnswer` loads the need. Stage must be `discovery_in_progress`.
   - Need passed to the model is only `{ title, description, urgency, reference_files: file names }`. `causeLabels` is on the need view (`need-intake.ts` 68) and is dropped here (lines 103–104).
   - Settled turns become chat via `contextMessagesFrom` (72–78). A turn whose `assistant_message === ''` is omitted entirely (tool-only close).
   - `buildModelRequest` sets `system: discoverySystemPrompt(...)`, `tools: [RECORD_ELICITATION_TOOL]`, `model: port.model`, `effort: 'low'`.
   - If email is verified, `port.countTokens(request)`; result stored as `p_settings.counted_input_tokens`. Unverified callers get `0`.
   - The full request is hung on `args[PREPARED_REQUEST]` (a `Symbol`, line 42). `JSON.stringify` in `callDatabaseFunction` (`edge.ts` 294) drops it, so SQL never sees the prompt.

5. **Reserve.** `writeRoute` RPCs `discovery_turn_reserve`. SQL also builds a `context` array (`20260920120000_discovery_turns.sql` 207–211) that does **not** skip empty assistant text. The model call uses the TypeScript prepared request, not that SQL context.

6. **Model call.**
   - JSON: `discoveryAct` → `port.create({ ...prepared, maxTokens: reservation.turn.max_output_tokens })`.
   - SSE: `discoveryStream` → `port.stream(..., onDelta, signal)` when `Accept` has `text/event-stream` (`discovery-stream.ts` `wantsEventStream`, `edge.ts` 382).

7. **Real port (`anthropic-messages.ts`).**
   - `paramsFor` (12–17): `model: servedModel()`, `max_tokens`, `system: systemFor(request)`, `messages`, `tools`, `betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'`. `output_config.effort` is sent **only** when `servedModel() === 'claude-opus-5'`.
   - `systemFor` (7–10): cached block gets `cache_control: { type: 'ephemeral' }`. Need block has no cache control.
   - `create` uses `client.beta.messages.create`. `countTokens` uses non-beta `client.messages.countTokens` with system+messages+tools (48–52). `stream` uses `client.beta.messages.stream`.
   - **`request.model` is ignored on the wire.** `paramsFor` always uses `servedModel()`. `port.model` is snapshotted at port construction (line 43).
   - `answerFrom` (34–39): concatenates all `text` blocks; takes the **first** `tool_use` block only; folds `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` into metered `inputTokens`; records `message.model` as served model.
   - Stream `observe` (76–85) only appends `text_delta`. Tool JSON is not streamed. Cancel after `message_start` returns `stopReason: 'user_stopped'`, `toolUse: null` (72–74).

8. **Settle.** `settleArgsFrom` (121–142):
   - Network-uncertain (`ok: false`, `status: null`) → no settle args, 502.
   - `stopReason === 'refusal'` → failed turn, no elicitation.
   - Else completed/failed. `p_elicitation` is set only when `answer.ok && toolUse?.name === 'record_elicitation'` and `parseElicitation` succeeds. Invalid tool input settles the turn with `p_elicitation: null` (selftest lines 24–25).
   - SQL `discovery_turn_settle` writes `elicitation jsonb` (`migration` 257). Conversation read takes the last non-null elicitation (`conversationAnswer`, `discovery-turn.ts` 177).

9. **Loop-tier stand-in — how it decides what to answer.**
   - `createHarness` (`tests/at/harness/index.ts` 227–232) builds `createAnthropicMessagesSim()`, hands `port` to the fixture adapter and `sim` to the test as `h.vendors.anthropic`.
   - The sim does **not** inspect system, tools, or user text. `create` `shift()`s the next `ScriptedReply` (vendors.ts 55–69). Empty queue throws `Anthropic Messages request exceeded its scripted replies`.
   - `countTokens` peeks at `replies[0]` without consuming: top-level `inputTokens`, else `usage.inputTokens` (non-error), else `Math.ceil(JSON.stringify(messages).length / 4)`. System and tools are not counted in the fallback.
   - Text reply → `stopReason: reply.stopReason ?? 'end_turn'` (or `'max_tokens'` if `outputTokens > request.maxTokens`). Tool reply → `stopReason: 'tool_use'` (same cap override), `toolUse: { name, input }`. Error reply → `{ ok: false, status, reason }`.
   - Output tokens are capped at `request.maxTokens`. Cache fields fold like the real port.
   - `stream` calls `create`, then emits 20-character deltas. Abort mid-replay → `user_stopped`, `toolUse: null`.

10. **How a test injects a scripted tool call.** Before `sendMessage`:
    ```ts
    h.vendors.anthropic.script(GRANT_TRACKER.replies);
    // or a one-off:
    h.vendors.anthropic.script([{
      kind: 'tool', name: 'record_elicitation',
      input: GRANT_TRACKER_ELICITATION,
      text: 'I recorded…',
      usage: { inputTokens: 1600, outputTokens: 420 },
    }]);
    ```
    AT-004.10 (`d-conversation.test.ts` 36–62) scripts the full grant-tracker tape, sends each `ngoMessages` line, then `grantTrackerOracleProblems` on the last turn’s elicitation. Metering tests set both `inputTokens` (count) and `usage` (bill) on the same reply (`a-metering.test.ts` 15). After the run, `h.vendors.anthropic.requests()` is the captured `DiscoveryModelRequest` list (cloned).

11. **How the real model is selected at integration.**
    - `TierHarness` **omits `vendors`** above loop (`contracts.ts` 244–251). Runtime `createHarness` sets `vendors.anthropic` to `refusing('vendors.anthropic')` (`index.ts` 249).
    - AT-004.10’s `integration` body is `awaiting(AWAITED.anthropicLive)` → `CapabilityPending(['vendors.anthropic'])`. Expected red in `tests/at/expected/req-004.json` line 57.
    - Live `sendMessage` (`_live.ts` 67–72) POSTs the deployed function. The function, not the test, picks the model: `DISCOVERY_MODEL` if set, else `'claude-opus-5'`. `.env.example` 78–80: unset in production; local override is for testing (historically `supabase/functions/.env`, git-ignored).
    - `served_model` on the turn is `message.model` from the API (may be a fallback). Request-settings model is `port.model` / `p_settings.model`.
    - The recorder `fixtures/record-grant-tracker.ts` is the live path that actually talks to Anthropic: it requires `ANTHROPIC_API_KEY`, loops `GRANT_TRACKER.ngoMessages` through `sut.sendMessage`, and writes replies from settled turns. Current committed fixture is still `source: 'handwritten'`.

12. **Where `record_scope` and a labels-vocabulary block attach.**

    **Second tool (`record_scope`) — real path:**
    - Add `RECORD_SCOPE_TOOL` next to `RECORD_ELICITATION_TOOL` in `discovery-prompt.ts` (same `strict` / `additionalProperties: false` pattern) plus `parseScope`.
    - Widen `DiscoveryModelRequest.tools` (`discovery-turn.ts` 16); today it is `typeof RECORD_ELICITATION_TOOL[]`, so a second shape will not type-check.
    - Put both in `buildModelRequest` `tools: [...]` (line 87). The real port already forwards `request.tools` unchanged (`paramsFor` line 14, `countTokens` line 50).
    - `answerFrom` keeps only the **first** `tool_use` (`anthropic-messages.ts` 35). Two tools in one model message need a list, not a single `toolUse`.
    - `settleArgsFrom` only special-cases `record_elicitation` (line 140). A `record_scope` call today settles as a normal completed turn with `p_elicitation: null`. Storage needs a new settle argument/column (or a reused jsonb). SQL settle has only `p_elicitation`.
    - Instruct the model in skill markdown (likely a new file or `04-complete-the-record.md`) and run `bun run discovery:skills`.
    - Stream still would not emit tool JSON; a new `data-*` part would be needed if the page should see scope before reload. Today `data-turn` already carries `renderDiscoveryMessage` (includes `elicitation`). The page’s `onData` only reads `allowance` and `turn.seq`.

    **Second tool — stand-in:**
    - `ScriptedReply` `{ kind: 'tool'; name: string; input: unknown; ... }` already accepts any name. Inject:
      `{ kind: 'tool', name: 'record_scope', input: { ... }, text: '...', usage: { ... } }`.
    - The sim still returns one `toolUse` per reply. A two-tool turn needs two scripted replies or a port change.
    - Tests assert via `h.vendors.anthropic.requests()[i].tools` and `settleArgsFrom` / turn rows. `GRANT_TRACKER.replies` is the tape to extend.

    **Labels-vocabulary block — real path:**
    - Attach in `discoverySystemPrompt` as another `SystemBlock`. Suggested shape: uncached `{ text: 'Existing cause labels:\n' + JSON.stringify(vocab), cached: false }` because the vocabulary grows. Putting it in the first cached block would share the skills cache but bust it on every new label.
    - Thread vocabulary into `buildModelRequest` / `discoveryPrepare`. Prepare today only reads the need + turns; mission text is not loaded (brief unit 4 says it is an input). `cause_labels` exists on `need_intakes` but is empty until Discovery writes it; there is no vocabulary table yet.
    - Loop tests currently assert `request.system[0].cached && !request.system[1].cached` (`d-conversation.test.ts` 58). A third block requires that assertion to change.
    - The real port needs no schema change: extra `SystemBlock`s already map through `systemFor`.

    **Labels-vocabulary block — stand-in:**
    - Same request object is recorded. Assert with `sim.requests()[n].system`. Script the tool output that reuses a seeded label (the brief’s “food security” case). Integration would follow AT-004.10: pending `vendors.anthropic` until a live oracle/recorder exists.

### Files Read

- `supabase/functions/_shared/discovery-prompt.ts`
- `supabase/functions/_shared/anthropic-messages.ts`
- `supabase/functions/_shared/discovery-skills.ts`
- `supabase/functions/_shared/discovery-skills/index.ts`
- `supabase/functions/_shared/discovery-skills/01-elicit.md`
- `supabase/functions/_shared/discovery-skills/02-ground-the-scope.md`
- `supabase/functions/_shared/discovery-skills/03-write-stories.md`
- `supabase/functions/_shared/discovery-skills/04-complete-the-record.md`
- `supabase/functions/_shared/discovery-skills/05-plain-language.md`
- `supabase/functions/_shared/discovery-turn.ts`
- `supabase/functions/_shared/discovery-metering.ts`
- `supabase/functions/_shared/discovery-reads.ts`
- `supabase/functions/_shared/discovery-stream.ts`
- `supabase/functions/_shared/need-intake.ts` (types + `needIntakeAnswer` + `needViewFromSql`)
- `supabase/functions/_shared/edge.ts` (`writeRoute`, `callDatabaseFunction`, `callerReads`)
- `supabase/functions/_shared/write-routes.ts` (`WRITE_ROUTES`, `isRecord`)
- `supabase/functions/discovery-message/index.ts`
- `supabase/migrations/20260920120000_discovery_turns.sql` (reserve context + settle elicitation)
- `supabase/config.toml` (function jwt flags only)
- `.env.example` (`ANTHROPIC_API_KEY`, `DISCOVERY_MODEL`)
- `tests/at/harness/vendors.ts`
- `tests/at/harness/vendors.selftest.ts`
- `tests/at/harness/contracts.ts` (vendor types + `TierHarness`)
- `tests/at/harness/index.ts` (`createHarness`)
- `tests/at/harness/discovery-skills.ts`
- `tests/at/harness/generate-discovery-skills.ts`
- `tests/at/harness/discovery-skills.selftest.ts`
- `tests/at/harness/discovery-elicitation.selftest.ts`
- `tests/at/harness/atconfig.ts`
- `tests/at/harness/registry.ts` (TierHarness note)
- `tests/at/suites/req-004/_fixture.ts`
- `tests/at/suites/req-004/_live.ts`
- `tests/at/suites/req-004/_pending.ts`
- `tests/at/suites/req-004/_source-pins.ts`
- `tests/at/suites/req-004/_contract.ts`
- `tests/at/suites/req-004/d-conversation.test.ts`
- `tests/at/suites/req-004/a-metering.test.ts` (script injection with separate count vs usage)
- `tests/at/suites/req-004/fixtures/grant-tracker.ts`
- `tests/at/suites/req-004/fixtures/grant-tracker.oracle.ts`
- `tests/at/suites/req-004/fixtures/record-grant-tracker.ts`
- `tests/at/expected/req-004.json`
- `tests/at/suites/req-003/c-labels.test.ts`
- `src/routes/discovery/$organizationId.$projectId.tsx` (stream + `onData`)
- `src/lib/discovery-chat.ts` (turn → chat messages; skips empty assistant text)
- `loop/items/AI4DEV-135/brief.md` (scope + cause-label units)
- `package.json` (`discovery:skills` script)

### Boundaries

**In**
- User message + org/project ids from the chat page or `sut.sendMessage`.
- Need intake (title/description/urgency/reference file **names**).
- Settled turn transcript (user + non-empty assistant text only).
- Skill markdown (generated `DISCOVERY_SKILLS`).
- `MessagesPort` (real or stand-in).
- Env: `ANTHROPIC_API_KEY`, optional `DISCOVERY_MODEL`.

**Out**
- `DiscoveryModelAnswer`: text, `stopReason`, usage, served `model`, optional `{ name, input }` tool use.
- Settled `discovery_turns` row: `assistant_message`, `elicitation` jsonb, token/cost fields, `served_model`.
- SSE parts: `start`, `text-start/delta/end`, `data-turn` (rendered turn + elicitation + allowance), `error`, `finish`.
- Loop-only: `h.vendors.anthropic.requests()` for prompt assertions.

**Does not connect today**
- `need_intakes.cause_labels` is not in the prompt.
- Notification taxonomy (`notification-taxonomy.ts`) is event/channel taxonomy, not cause labels.
- No `record_scope` tool, no vocabulary table, no mission-text block.
- Integration tests do not call Anthropic except via the pending AT-004.10 / the recorder script.

### Non-Obvious Things

- **The stand-in is not in `_fixture.ts`.** `_fixture.ts` is the SUT adapter. The FIFO sim is `createAnthropicMessagesSim` in `tests/at/harness/vendors.ts`. Grant-tracker is the script, not the model.

- **`record_elicitation` schema (verbatim from `discovery-prompt.ts` 19–36), with alias `strings` expanded:**

```ts
const strings = { type: 'array', items: { type: 'string' } };
export const RECORD_ELICITATION_TOOL = {
  name: 'record_elicitation',
  description: 'Record the completed, agreed facts, constraints and user stories of this NGO software need.',
  strict: true,
  input_schema: {
    type: 'object' as const, additionalProperties: false,
    properties: {
      complete: { type: 'boolean', const: true },
      facts: { type: 'array', items: { type: 'string' } },
      constraints: { type: 'array', items: { type: 'string' } },
      userStories: { type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: { story: { type: 'string' }, acceptanceCriteria: { type: 'array', items: { type: 'string' } } },
        required: ['story', 'acceptanceCriteria'],
      } },
      openQuestions: { type: 'array', items: { type: 'string' } },
    },
    required: ['complete', 'facts', 'constraints', 'userStories', 'openQuestions'],
  },
};
```

- **`parseElicitation` is stricter than that schema:** `Object.keys(input).length !== 5` and user-story objects must have exactly two keys. Extra keys, `complete: false`, non-string array items, or a missing `acceptanceCriteria` all return `null`. A completed turn with a bad tool payload stores **no** elicitation (not a failed turn).

- **Tool history is not replayed.** Next-turn messages are only `{role, content: string}`. No `tool_use` / `tool_result` blocks. A tool-only answer (`text === ''`) is dropped from later context (`contextMessagesFrom` and the chat page `messagesFromTurns`).

- **First `tool_use` only.** A second tool in the same Anthropic message is discarded by `answerFrom`.

- **Effort is conditional.** Override `DISCOVERY_MODEL` to anything other than `claude-opus-5` and `output_config` is omitted. That was added after Haiku rejected `effort`.

- **Token count vs create use different SDK surfaces** (non-beta `countTokens` vs beta `create`/`stream`), and the stand-in’s fallback count is `JSON.stringify(messages)/4`, not system+tools.

- **Design leftover:** `DISCOVERY_PROMPT_OVERHEAD_TOKENS` appears in `loop/items/AI4DEV-132/design/candidate-4-reserve-settle.md` and is **not** in `discovery-prompt.ts`. Overhead is the provider `countTokens` result plus `DISCOVERY_INPUT_MARGIN_TOKENS` (64).

- **Skills are a generated Deno module.** Edit `.md`, then `bun run discovery:skills`. Selftest fails with `run bun run discovery:skills` if `index.ts` drifts. Reader normalizes CRLF.

- **SQL context vs TS context disagree** on empty assistant messages. The model sees TS. Integration AT-004.11 inspects SQL `reservation.context` via operator reserve, not the Anthropic request.

- **`PREPARED_REQUEST` is a Symbol** so the counted prompt cannot leak into the reserve RPC JSON.

- **Grant-tracker is handwritten**, not recorded. `source: 'handwritten'`. The recorder exists but has not replaced the tape.

- **Chat `onData` ignores elicitation.** `data-turn` already includes it; the page only updates allowance and seq. A new stream part for scope/labels can be ignored by today’s handler.

### Open Questions

- I did not inspect `@anthropic-ai/sdk@0.115.0` types to confirm `strict: true` on tools is a first-class field versus passed through as extra.
- I did not see how `DISCOVERY_MODEL` is set in this worktree’s live function env (not in `config.toml`; expected in git-ignored `supabase/functions/.env`).
- I could not determine whether a future `record_scope` is meant to be a **second tool on the same turn** as `record_elicitation` or a **follow-up turn** after `complete: true`. Current port and sim both allow only one `toolUse` per answer.
- No cause-vocabulary store exists yet, so the exact read `discoveryPrepare` would use for a labels block is not in the tree (brief unit 4 says this run would create it).
- I did not trace whether server-side fallback can make `message.model` differ from `servedModel()` in production; the code records `message.model` as `served_model` and would show that if it happens.