# Writer brief: unit 2, the turn contract

You are the writer for unit 2 of AI4DEV-181 (Discovery wired to backend). Work only in your working
directory, a git worktree on branch `lane/ai4dev-181/unit2`. Commit with messages that end with
`(AI4DEV-181)`. Do not push. Do not launch other agents. Do not touch any other folder. Do not stop
or start any process you did not start yourself, except the local Supabase stack as the Tests
section says. Use PowerShell syntax for shell commands.

**Commit early.** Commit each build step as soon as typecheck and the selftests pass. A time limit
stopped an earlier writer; only committed work survives. **Stop rule:** if an environment problem
blocks you for 15 minutes, commit what works and report the command, its output and what you
tried.

**Comments.** New code carries almost no comments: only a constraint forced by something we cannot
change (a vendor or protocol), or a doc comment on an exported API. No step narration.

## Read first

- `loop/items/AI4DEV-181/design.md`: sections "Turn", "Opening", "Usage" and "Model adapter" are
  this unit. "Data" says what `discovery_turns` gains.
- `loop/items/AI4DEV-181/decisions.tsv`: the founder's calls (one credit per turn, no beta counter;
  the first reply automatic and free; the opencode model for debug and integration).
- `loop/items/AI4DEV-181/evidence/proto-brief/bunny.ts` and `bunny-result.json`: a working probe of
  the forced `reply` tool on the OpenAI-compatible endpoint, streaming the tool arguments.
- Unit 1's work, already on your branch: `supabase/functions/_shared/discovery-brief.ts` (the pure
  rules: `evolveBrief`, `openingDocument`, `snapshotOf`), `discovery-brief-write.ts`, the migration
  `supabase/migrations/20261002120000_discovery_brief_store.sql` (`discovery_brief_commit`,
  `viewer_discovery_brief`), and `supabase/functions/discovery-brief/index.ts`.
- The turn as it is today: `supabase/functions/discovery-message/index.ts`,
  `supabase/functions/_shared/discovery-turn.ts`, `discovery-prompt.ts` (`RECORD_ELICITATION_TOOL`,
  which this unit replaces), `discovery-metering.ts`, `anthropic-messages.ts`, `discovery-stream.ts`,
  `discovery-allowance.ts`, and the latest migrations that define the reserve and settle functions
  for `discovery_turns`.
- The screen's side of the contract: `src/lib/discovery-stream.ts` (`DiscoveryRequestBody`,
  `DiscoveryAnswer`, `DiscoveryDataTypes`, `DiscoveryUsage`, `DiscoveryRefusal`),
  `src/components/discovery/port.ts`, and the fixture shell's chat in `design/astra/src/`
  (`fixture-world.ts`, the fixture transport) for the order of parts and the refusal kinds.
- `design/discovery-ui-contract.md` and `design/discovery-model-calls.md`: what a turn shows.

## Build

1. **The model adapter.** Behind the existing `MessagesPort`, two adapters: the current Anthropic
   Messages one and a new OpenAI-compatible chat-completions one. Env chooses:
   `DISCOVERY_PROVIDER` (`anthropic` or `openai-compatible`), `DISCOVERY_MODEL`,
   `DISCOVERY_BASE_URL`, `DISCOVERY_API_KEY`, `DISCOVERY_REASONING_EFFORT`. With
   `DISCOVERY_PROVIDER` unset, keep today's Anthropic behaviour. Each adapter takes the system
   blocks, the context messages and the forced `reply` tool; it streams the tool's `text` field as
   it arrives and returns the parsed tool input and the usage. Read the `text` field with an
   incremental JSON string decoder over the streamed arguments (escapes and unicode handled), not a
   regex. Put the decoder in a pure module with a vitest selftest under `tests/at/harness/`
   (chunk boundaries inside escapes, a `text` that is not the first property, an empty text).
2. **The `reply` tool.** Replace `record_elicitation` with one forced tool whose schema has `text`
   first, then the brief update: questions (topic id from an enum built from the project's stored
   topic ids, suggestion wording, the suggested option, importance, reason), topics agreed with
   their answer, and open questions with importance. The server owns question wording and options
   where the topic has a stored definition; the model supplies suggestions and prose. Parse and
   validate the tool input at the boundary; an invalid input is a system error that releases the
   credit.
3. **The request.** `discovery-message` accepts the screen's `DiscoveryRequestBody` plus
   `userMessageId`. An empty `message` with answers is a valid turn. Reserve, under the project
   lock, checks in this order and refuses with these kinds: `finished` (a current confirmation),
   `discovery-ready` (every required topic agreed), `mode-changed` (the free/paid mode the usage
   function computes differs from `expectedCharge`), `daily-limit`; then debits exactly one credit.
   Usage is one credit per completed turn, the daily grant keeps its tiers (10, 30 when vetted),
   there is no beta counter, free comes first even when funded, and fuel stays the existing stub.
   One SQL usage function serves both the reserve and every read, so the mode the screen showed
   and the mode the reserve checks are computed the same way. Remove the token count before
   reserve; the reserve sizes only the output cap. Register every new refusal kind in
   `supabase/functions/_shared/write-routes.ts` (an unregistered kind collapses to `refused`).
4. **The settle.** Apply the answers first, then the model's update, through `evolveBrief`. Commit
   the turn row (with `user_message_id`, `answers`, `assistant_message` holding the persisted UI
   message with its parts, `base_revision`), the new brief revision when the document changed, and
   the charge in one transaction. A failed or abandoned turn releases its credit; an automatic
   retry belongs to the same turn. A repeated `userMessageId` returns the stored turn and charges
   nothing. Migration: one new file under `supabase/migrations/` with a timestamp after unit 1's;
   `discovery_turns` gains the columns above and billing `opening`; replace the token-ratio
   constraints with one credit per free turn for new rows (`not valid` for history). Follow the
   house style of the existing discovery migrations (security definer, `set search_path = ''`,
   grants, RLS).
5. **The stream.** The response is the AI SDK UI message stream the screen's `DefaultChatTransport`
   reads: `start` with the persisted assistant message id, the text parts, then `data-filed`,
   `data-charge`, one `data-question` per question, `data-ready` when every required topic is
   agreed, then transient `data-brief` and `data-usage`, then `finish`. Composed sentences the
   server owns (the ready sentence) are added around the model text. Reload must show the same
   message: `discovery-conversation` returns the persisted assistant messages as the transcript.
   Refusals keep today's shape: an error whose text is the `DiscoveryRefusal` JSON.
6. **The opening turn.** A request in opening mode on a project with no brief creates revision 1
   through `openingDocument` from the stored topic definitions, makes the first reply (which asks
   for files that show how the NGO works today while the project has fewer than three Discovery
   files), is unique per project, uses billing `opening` and costs zero credits. A second opening
   request returns the stored opening.

## Tests

- Selftests under `tests/at/harness/` for the decoder, the `reply` tool parser, and the settle's
  pure parts (answers before the model update; a re-listed agreed topic does not bump the
  revision; an invalid tool input releases the credit).
- **Acceptance tests whose contract this unit changes.** Some req-004 suites assert the old
  contract: token-priced credits, `record_elicitation`, the empty-message refusal, the beta counter.
  Update a body only when its acceptance text in `.taskmaster/docs/acceptance/` already states the
  new contract, and keep its id. Do not retire or move any id; that is unit 6. Where a test's
  acceptance text still states the old contract, leave the test alone and list it in your report.
  If an expected-results declaration under `tests/at/expected/` must change, change only the
  entries for the tests you changed, and list each.
- A live proof on the local stack, as a script under `loop/items/AI4DEV-181/evidence/unit2/` (not a
  new acceptance id), on the opencode model: open a seeded project (revision 1, the opening reply,
  zero credits); send a turn with an answer and a note (one credit, the answer agreed, a new
  revision, the stream's parts in order); send the same `userMessageId` again (no second charge);
  send with a wrong `expectedCharge` (`mode-changed`); reload through `discovery-conversation` and
  see the same assistant message id and parts. Save the transcript beside the script.
- The stack runs from your worktree: `bun run db:stop`, then `bun run db:start` from your
  directory. `supabase/functions/.env` is already in your worktree with
  `DISCOVERY_PROVIDER=openai-compatible`, `DISCOVERY_MODEL=space-bunny-free`, the base URL, the key
  and `DISCOVERY_REASONING_EFFORT=low`. It is git-ignored: never print, cat or commit it.

## Checks (all must pass)

1. `bun install --frozen-lockfile` first.
2. `bun run typecheck` exits 0.
3. `bun run at:selftest` exits 0 with the new selftests counted (it was 487 before this unit).
4. `bun run at:check req-004` and `bun run at:check req-001` exit 0.
5. `bun run at:verify req-004 --tier loop --expect` exits 0 and matches.
6. `bun run at:verify <req> --tier integration --expect` exits 0 and matches for req-001, req-002,
   req-003, req-004 and req-016, each run on its own. Before this unit they were 29, 19, 10, 17 and
   12 green. Nothing that was green turns red except a test you changed and listed.
7. The live proof exits 0.

## Your final response

The commits (hash and subject), each check with its exit code and counts, the files you added or
changed, every acceptance test body or declaration you changed with the acceptance text line it
follows, every test you left on the old contract, and anything you could not do and why.
