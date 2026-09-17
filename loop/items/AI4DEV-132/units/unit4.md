# Unit 4: the conversation on Opus, persisted, resumable, streamed

You are the writer for unit 4 of the credits engine run, the one-way door of the run. You
work in this worktree on branch `lane/ai4dev-132`. You may edit, create and run anything under
it. Use PowerShell syntax if you shell out; you are on Windows. Never use Bash syntax.

You design three things here: the system prompt with its skills, the elicitation tool with
its recorded conversation and oracle, and the streaming path through the write frame. The
design of record fixes the contracts; the bodies are yours.

## Read first, in this order

1. `loop/items/AI4DEV-132/design/SYNTHESIS.md`: corrections 3, 5, 7 and 13, the "Per-unit
   plan and lanes" row for unit 4, and the three founder rulings at the design gate.
2. `loop/items/AI4DEV-132/research/chat-ui.md`, sections 3, 4 and 5. The founder ruled on
   2026-09-17 (`decisions.tsv`, the `gate` rows of that day): the send route streams over SSE
   in the Vercel UI message stream format when the client sends `Accept: text/event-stream`,
   JSON stays the default, a stop settles the turn with the measured usage, and a per-turn
   regenerate is a paid new turn in this run.
3. `loop/items/AI4DEV-132/design/candidate-4-reserve-settle.md`: "Unit 4, the conversation"
   (the AT-004.10 body and the AT-004.11 sentence), the `discovery-conversation` paragraph
   under "Routes", the `discovery-prompt.ts` line under "The `_shared` modules", the
   `fixtures/grant-tracker.ts` paragraph under "Suite", and the paragraphs "The conversation
   store" and "The loop-tier stand-in and the oracle". Where SYNTHESIS is silent, the base
   holds. Where the base puts `discovery-conversation` in unit 6, SYNTHESIS puts it here.
4. `.taskmaster/docs/acceptance/at-req-004.md`, criteria 10 and 11.
5. `loop/items/AI4DEV-132/reports/unit1.md`, `unit1-fix.md`, `unit2.md`, `unit3.md`.
6. `supabase/functions/_shared/discovery-turn.ts`, `discovery-prompt.ts`, `discovery-reads.ts`,
   `discovery-metering.ts`, `anthropic-messages.ts`, `edge.ts` (`writeRoute` in full,
   `callerReads`, `json`, the CORS headers, `requireEnv`), `write-routes.ts`, `caller.ts`;
   `supabase/functions/discovery-message/index.ts`, `need-intake/index.ts` (the read function
   shape you copy); `supabase/migrations/20260920120000_discovery_turns.sql` (the settle
   definer and `p_elicitation`), `20260921120000_discovery_funded_routing.sql`; the migration
   that defines `viewer_is_org_member` (grep the migrations) and the `discovery_allowance`
   definer's `read` arm in `20260916120000_discovery_allowance.sql`.
7. `tests/at/harness/contracts.ts` (`AnthropicMessagesSim`, `ScriptedReply`, the `tool` kind),
   `vendors.ts`, `vendors.selftest.ts`, `index.ts` (`createHarness`), `live-stack.ts`
   (`functionPost`, `functionPostRaw`, `sqlClient`), `pending.ts`.
8. `tests/at/suites/req-004/` in full, `tests/at/suites/req-003/_live.ts` (how a read
   function is called at integration), `tests/at/suites/req-001/_integration.ts` line 167
   (`VIEWER_FUNCTIONS`) and `_policy-scan.ts`.
9. `tests/at/expected/req-004.json`, `tests/at/harness/expected.ts`.
10. `.claude/skills/verify-ai4good/README.md` and `features/discovery-message.md`.

## What you build

### A. The prompt and the skills

1. **`_shared/discovery-skills/`**: three to five markdown files, one skill each, named
   `01-<slug>.md` upward so the order is the file order. Each is a short instruction set the
   model follows while it helps an NGO scope a software need: how to elicit one fact at a
   time, how to turn facts into user stories with acceptance criteria, how to keep to what the
   NGO said and never invent scope, when the elicitation is complete and the record tool must
   be called, and how to write for a non-technical reader. Plain sentences. No long dash
   character. Together under 6000 characters, so the turn stays token-bounded.
2. **`_shared/discovery-skills.ts`** (pure): `type DiscoverySkill = { name: string; body: string }`,
   `discoverySkillsText(skills: readonly DiscoverySkill[]): string` (each skill under a
   `# <name>` heading, in the given order). The two readers live where file access is
   allowed: `readDiscoverySkills()` in `edge.ts` (Deno, `import.meta.url` relative, called
   once per request by the route's index file) and `readDiscoverySkillsSync()` in
   `tests/at/harness/` with `node:fs` for the fixture. Both read the same folder. A selftest
   `tests/at/harness/discovery-skills.selftest.ts` asserts the node reader finds at least
   three files, the text holds every file's heading in file order, and the total is under
   6000 characters.
3. **`_shared/discovery-prompt.ts`**: replace the stub. `DISCOVERY_SYSTEM_PROMPT_TEMPLATE`
   becomes the real instruction body: the role (a scoping partner for an NGO with no developer
   on staff), the goal (a complete elicitation record), the rules (one question at a time,
   never invent, stay within the need, plain language, keep replies short), and the closing
   rule (when complete, call `record_elicitation` and also write a two-sentence closing
   message). `discoverySystemPrompt(need, skills)` returns
   `SystemBlock[] = { text: string; cached: boolean }[]`: block one is the template plus the
   skills text with `cached: true`, block two is the need (title, description, urgency, the
   reference file names) with `cached: false`. `DiscoveryModelRequest.system` becomes
   `SystemBlock[]`; `buildModelRequest` gains `skills` and `tools: [RECORD_ELICITATION_TOOL]`.
   `discoveryPrepare(port, skills)` threads the skills. `RECORD_ELICITATION_TOOL` is
   `{ name: 'record_elicitation', description, strict: true, input_schema }` with the JSON
   schema of `Elicitation` exactly as `discovery-reads.ts` types it, `additionalProperties:
   false` everywhere and every property required. Export `parseElicitation(input: unknown):
   Elicitation | null` that checks the shape at the boundary.

### B. The model answer and the settle

4. **`settleArgsFrom`**: when the answer carries `toolUse` named `record_elicitation`,
   `p_elicitation` is `parseElicitation(input)`; an unparseable input settles `completed` with
   `p_elicitation: null` and the text, and the report says so. When the model calls the tool
   and writes no text, `p_assistant_message` is the empty string, never null; the settle
   definer already refuses null. `p_stop_reason` carries the API stop reason, or
   `user_stopped` when the client cancelled a stream.
5. **`anthropic-messages.ts`**: `create` sends `system` as content blocks with
   `cache_control: { type: 'ephemeral' }` on the cached block, `tools`, and returns `toolUse`
   from the first `tool_use` block. `countTokens` sends the same system blocks and tools. Add
   `stream(request, onDelta, signal)` (item 7). Keep `betas`, `fallbacks`, `maxRetries: 0`,
   the lazy client. Try `client.beta.messages.stream({...})` first; if the beta namespace
   lacks the helper or refuses `betas` and `fallbacks`, use `create({ ..., stream: true })`
   and accumulate the raw events yourself. The report says which one shipped and whether you
   could verify it against the real API (the key, if you have one, is `ANTHROPIC_API_KEY` in
   `.env.local` at the repository root, never in this worktree and never in any file you
   write). If you cannot reach the API, say "not verified at runtime" and the lead verifies.

### C. Streaming through the write frame

6. **`_shared/discovery-stream.ts`** (pure): the Vercel UI message stream encoder. One
   function per part, each returning one SSE line `data: <json>\n\n`: `start(messageId)`,
   `textStart(id)`, `textDelta(id, delta)`, `textEnd(id)`, `dataTurn(payload)` (type
   `data-turn`), `error(errorText)`, `finish()`, and `done()` returning `data: [DONE]\n\n`.
   The response headers the frame sets: `content-type: text/event-stream`, `cache-control:
   no-cache`, `connection: keep-alive`, `x-vercel-ai-ui-message-stream: v1`. Export
   `wantsEventStream(acceptHeader: string | null): boolean` (true when `text/event-stream` is
   listed). A selftest `tests/at/harness/discovery-stream.selftest.ts` asserts each line's
   shape and the header set.
7. **`MessagesPort.stream(request, onDelta: (text: string) => void, signal: AbortSignal):
   Promise<DiscoveryModelAnswer>`**. It resolves with the same answer shape as `create`. On
   abort it resolves `{ ok: true, text: <what arrived>, stopReason: 'user_stopped', usage:
   <the last cumulative usage seen; if no message_delta arrived, output tokens equal the
   request's max tokens so the reservation is charged in full and the pool is never
   overspent>, model, toolUse: null }`. The stand-in's `stream` replays the scripted text in
   pieces of at most twenty characters through `onDelta`, honours the signal, and records the
   request like `create`.
8. **`WriteRouteSpec.settle`** gains an optional `stream` member beside `act`:
   `stream: (value, args, onDelta, signal) => Promise<SettleActResult>` where the result is
   what `act` returns. `writeRoute`: when the request's `Accept` wants an event stream and
   `spec.settle.stream` exists, after the reserve RPC succeeds it answers a `Response` whose
   body is a `ReadableStream` (the shape of `need-intake` is not it; write the stream inline in
   `edge.ts`). Inside: `start`, `text-start`; each delta as `text-delta`; on the final answer
   run the settle RPC exactly as the JSON path does, emit `data-turn` with the rendered
   settle result (the same object the JSON path returns), then `finish` and `[DONE]`, close.
   A definite failure emits `error` with the reason, settles `failed`, then `finish` and
   `[DONE]`. An uncertain failure emits `error`, leaves the turn open, then `finish` and
   `[DONE]`. When the client cancels, the stream's `cancel` aborts the signal, and the settle
   of the partial answer runs inside `EdgeRuntime.waitUntil(...)` so the instance stays alive
   for it. Before the reserve RPC nothing differs: every refusal, including 502 from
   `prepare`, stays a JSON answer with its status. `Accept` is CORS-safelisted; the header
   list in `edge.ts` does not change.
9. **`discovery-message/index.ts`** passes `stream: discoveryStream(port)` beside `act`, and
   the skills from `readDiscoverySkills()`.

### D. The read route and the viewer function

10. **Migration** `supabase/migrations/20260922120000_discovery_conversation.sql`:
    `public.viewer_discovery_allowance(p_organization_id uuid) returns jsonb`, SECURITY
    DEFINER, `set search_path = ''`, refusing unless `public.viewer_is_org_member(...)` (read
    that helper's signature), computing exactly what the `read` arm of `discovery_allowance`
    computes for today and writing nothing, revoked from `public`, granted to
    `authenticated`, then `notify pgrst, 'reload schema'`. Add the name to `VIEWER_FUNCTIONS`
    in `tests/at/suites/req-001/_integration.ts`.
11. **`discovery-conversation/index.ts`**: a read function shaped like `need-intake/index.ts`.
    Request `{ projectId }`. Success `200 { ok: true, conversation: { projectId, turns,
    elicitation }, allowance }` where `turns` are the settled, failed and abandoned rows in
    `seq` order as `DiscoveryTurnView` (open rows included as they are; the screen shows the
    state), `elicitation` is the latest non-null elicitation, and `allowance` is
    `renderDiscoveryAllowance` over `callerReads(...).discoveryAllowance(organizationId)`, a
    new member that calls the viewer function as an RPC with the caller's JWT. The tenant
    `404` and the `502` follow `need-intake`. `conversationAnswer` lives in
    `discovery-turn.ts` (pure). `supabase/config.toml` gains
    `[functions.discovery-conversation] verify_jwt = true`. The tenant catalog gains no row
    (the table is already listed).

### E. The fixture, the recording, the oracle, the bodies

12. **`tests/at/suites/req-004/fixtures/grant-tracker.ts`**: `GRANT_TRACKER = { intake,
    ngoMessages, replies, source: 'recorded' | 'handwritten', recordedWith?: { model, date } }`.
    Five to ten NGO messages about a tool that tracks funder reporting deadlines for a
    two-person NGO with no developer, and one scripted reply per message, the last a `tool`
    reply named `record_elicitation` whose input satisfies the oracle. Write it handwritten
    first. Then add `fixtures/record-grant-tracker.ts`, a bun script that, given
    `ANTHROPIC_API_KEY` in the environment and the local stack up, provisions an NGO through
    the req-004 live adapter, sends the `ngoMessages` through the deployed route, and rewrites
    `grant-tracker.ts` with the real replies and `source: 'recorded'`. If you can run it, do,
    and say so; if not, leave `source: 'handwritten'` and the lead runs it.
13. **`fixtures/grant-tracker.oracle.ts`**: `grantTrackerOracleProblems(elicitation): string[]`
    checking the fixture's own facts: the tool tracks funder reporting deadlines, two staff use
    it, no developer is on staff, reminders go out before a deadline, every fact has a user
    story with at least one acceptance criterion, and no story is about anything the intake
    never mentioned. `tests/at/harness/req004-oracle.selftest.ts` drives it with a passing,
    a missing-fact and an invented-story elicitation.
14. **`_fixture.ts`**: `readConversation` over the turn map with the allowance from the inner
    read; `seedTurnsAsOperator` writing settled rows into the map with the given usage;
    `discoveryPrepare` gets the skills from the node reader. **`_live.ts`**: `readConversation`
    posts to the deployed read function; `seedTurnsAsOperator` inserts settled rows as the
    operator (the immutability trigger allows inserts; if it does not, disable it inside one
    transaction the way `backdateOpenTurnAsOperator` does).
15. **`d-conversation.test.ts`**: AT-004.10 as the base's body (with `request.system` now an
    array: assert the joined text includes the intake description, and the cached block is
    first). At integration `awaiting(AWAITED.anthropicLive)`. AT-004.11 as the base's
    sentence: three scripted turns, `signInAgain`, the ledger moved to the next day through
    `writeSpendRowAsOperator`, the conversation read with the new session equal to the rows,
    a fourth send whose request carries six prior messages. At integration the Given is
    `seedTurnsAsOperator`, the read is the deployed function, and the resume proof is
    `reserveTurnAsOperator` whose returned context carries the six prior messages, settled as
    failed afterwards; green.
16. **`tests/at/expected/req-004.json`**: loop `10` and `11` green; integration `11` green,
    `10` red `capability-pending` on `["vendors.anthropic"]`. Nothing else moves.
17. **`.claude/skills/verify-ai4good/features/discovery-message.md`** gains the streaming
    opt-in and the elicitation; `features/discovery-conversation.md` is new, with a README
    row. No drive script.

## Must-nots

- No `Deno`, `npm:` or `fetch` in any `_shared` file except `anthropic-messages.ts`,
  `edge.ts` and `notification-provider.ts`. `discovery-skills.ts`, `discovery-prompt.ts`,
  `discovery-stream.ts` and `discovery-turn.ts` are pure.
- No key in any file. Never copy `.env.local` anywhere. No `claude-opus-5` string anywhere
  except `discovery-metering.ts` and `anthropic-messages.ts`.
- `discovery_turn_reserve` and `discovery_turn_settle` are not changed. `discovery_allowance`
  is not changed. No new table. No message body in any audit event.
- `requestSettings` on the turn row keeps its three fields; AT-004.09 compares them.
- No `10` or `30` in a test body. Exactly fifty-eight `atTest(` call sites stay.
- No comment that narrates a step. A comment only for a why the code cannot show.
- Do not touch `loop/items/` except to write your report.

## Checks you run

From this worktree: `bun run typecheck`, `bun run at:check req-004`, `bun run at:check req-001`.
Run them until green. Your sandbox cannot run vitest (measured on the unit 1 run); do not try
`at:selftest` or `at:verify`. The lead runs them and feeds any red back in a second dispatch.

## Commit

One commit on `lane/ai4dev-132` when the three checks are green. Message:

```
AI4DEV-132: unit 4, the conversation on Opus, persisted, resumable, streamed

<eight to twelve lines in plain sentences: the prompt and skills, the tool and
the elicitation in settle, the streaming path and its format, the read route
and the viewer function, the fixture with its source, the oracle, the two
bodies and their tier results.>
```

No other item id anywhere in the message.

## Report

Write `loop/items/AI4DEV-132/reports/unit4.md`: what you built by file, every deviation from
SYNTHESIS, the base or the founder rulings with its reason, which streaming call shipped and
whether it was verified against the API, the fixture's `source`, the output of the three
checks (exit code and last lines), the commit hash, and open questions. Then reply with five
lines: the commit hash, the three check results, deviations (count and one line each),
blockers, and the report path.
