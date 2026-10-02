# Design for AI4DEV-181 (Discovery wired to backend)

Synthesized by the lead on 2026-10-02 from an architect arena: five runners on distinct structural
directions (astra JSONB revisions, fable normalized SQL, grok event sourcing, opus one mutable row,
sol turn ledger), judged by gpt-6.1-sol at max. The candidates, receipts and the judge's report
are under `evidence/arena/`.

## Synthesis decision

**Base: C1, immutable brief revisions with one rules module (astra).** The judge scored it 24 of
30 (sol 23, opus 17, fable 15, grok 11); the lead agrees. It has one place that decides what a
revision means, derives the confirmation instead of clearing it, gives structured answers
precedence over the model's re-listed topics, and has no overwrite or finish race.

**Grafts.**
- From C4 (opus): one SQL usage function used by both reserve and every read, so `mode-changed`
  compares against exactly what the screen showed; the route composition that keeps the chat
  mounted under the review and restores question focus.
- From C2 (fable): one consistent read of the whole screen state per `load`; the forced tool's
  `topicId` enum derived from the project's stored topic ids; deterministic sentences composed by
  the server around the model text (the ready sentence, the file report line).
- From C3 (grok): stored question definitions per topic, so the server, not the model, owns the
  question wording and options of seeded worlds; the model supplies suggestions and prose.
- From C5 (sol): explicit refund accounting for one logical turn (a failed or abandoned turn
  releases its credit).

**Trimmed from C1 (Laziness Protocol).** No `discovery_operations` receipt table: a turn is
already one row with a unique client message id, review writes are guarded by the base revision,
and finish is idempotent by primary key. No scheduled file dispatcher or lease columns: the read
runs in `EdgeRuntime.waitUntil`, completed parts are stored, and `load` re-dispatches a read whose
heartbeat is older than five minutes. The read fence is the project lock plus three checks inside
the commit (current confirmation, open turn, files reading), not an opaque blob.

**Rejected.** C2's per-row tables (spread one invariant over many writes; its migration also keeps
the token-ratio constraint). C3's event fold (finish outside the protected append; last-event-wins
turns). C4's in-place row (two revision incrementers; finish during an open turn). C5's second
ledger beside the turn rows (more machinery for history the screen does not need).

## Shape

**Data.**
- `brief_revisions(project_id, revision, document jsonb, created_by, created_at)`, append-only,
  primary key `(project_id, revision)`. The current brief is the highest revision.
- `discovery_confirmations(project_id, revision, actor_id, actor_name, confirmed_at,
  accepted_gaps)`, primary key `(project_id, revision)`, foreign key to the revision. The current
  confirmation is the one at the current revision; a new revision makes it history.
- `discovery_brief_messages(project_id, revision, message_id, message jsonb)`: the person lines
  ("You changed ...", "You used the suggestion for ...").
- `discovery_turns` gains `user_message_id`, `answers jsonb`, `assistant_message jsonb` (the
  persisted UI message with its parts), `base_revision`, and billing `opening`; the token-ratio
  constraints are replaced by one credit per free turn for new rows (`not valid` for history).
- `discovery_files` and `discovery_file_parts` plus a private `discovery-files` bucket.

**Rules.** `supabase/functions/_shared/discovery-brief.ts` holds every brief transition as a pure
function: `evolveBrief(current, command)` for edit, accept, ask, remove label, apply reply, apply
file facts; `decideFinish`; `snapshotOf` (document to the screen's `BriefSnapshot`). It bumps the
revision only on a semantic change. SQL commit functions lock the project, check the base revision
and the three fence facts, insert the next revision only when TypeScript supplied a changed
document, and write the companion rows in the same transaction.

**Turn.** `discovery-message` accepts the screen's `DiscoveryRequestBody` plus the port's
`organizationId`, `projectId` and `userMessageId`. Reserve checks the usage function, refuses
`mode-changed`, `finished`, `discovery-ready`, `daily-limit`, and debits one credit. One model
call with the forced `reply` tool streams the `text` field (an incremental JSON string decoder,
not a regex) and returns the update; settle applies the answers first, then the model's update,
through `evolveBrief`, and commits the turn, the revision and the charge together. The stream
ends with `data-filed`, `data-charge`, `data-question`s, `data-ready`, then transient
`data-brief` and `data-usage`, then `finish`. The assistant message id is persisted, so reload
and the live stream agree.

**Opening.** The port's first `load` on a project without a brief calls `discovery-message` in
opening mode (unique per project, billing `opening`, zero credits). The opening creates revision 1
with the stored topic definitions.

**Usage.** One credit per completed turn; the grant tiers stay (10, or 30 when vetted); no beta
counter; free first even when funded; fuel stays the stub, so an empty day is `unavailable` and
`daily-limit`. `DiscoveryUsage` loses `betaLeft` and `betaGrant`.

**Files.** Upload through `discovery-file` (multipart). Under the project lock: `finished`,
`file-limit` (three while not funded, intake excluded), `duplicate-file`. Bytes go to the bucket;
the read splits into parts, stores each part's digest, and publishes the facts through
`evolveBrief` with source `file` (never agreeing a required topic). Later turns read digests.

**Real port.** `src/lib/discovery-port.ts`: nine members over five edge functions
(`discovery-conversation` for load, `discovery-message`, `discovery-brief` for the review writes and
finish, `discovery-file`, and the existing auth). `subscribe` polls `load` while a file reads and
once after each write. The route mounts `DiscoveryScreen` and `DiscoveryReview` behind the existing
sign-in.

**Model adapter (founder 2026-10-02).** `anthropic-messages.ts` becomes one of two adapters behind
the existing `MessagesPort`: Anthropic Messages, and an OpenAI-compatible chat-completions adapter.
Env picks one: `DISCOVERY_PROVIDER` (`anthropic` or `openai-compatible`), `DISCOVERY_MODEL`,
`DISCOVERY_BASE_URL`, `DISCOVERY_API_KEY`, `DISCOVERY_REASONING_EFFORT`. Debug and integration use
`space-bunny-free` at `low` on `https://opencode.ai/zen/v1` (probe: forced tool, text first,
streams tool arguments, free). Each adapter streams the forced `reply` tool's `text` field and
returns the parsed tool input. With one credit per turn, `countTokens` before reserve is removed;
the reserve sizes nothing but the output cap.

## How the tests prove it (founder 2026-10-02: two levels)

- **Loop tier, fixture shell:** the section J bodies keep every exact-copy assertion.
- **Integration tier, real route:** the same bodies run with seeded worlds and the real model; a
  tier flag switches copy that only a script can produce to state checks (answer saved, revision
  raised, one credit used, file read and its facts in the brief, confirmation recorded, refusals by
  kind). Steps that need a fuel balance stay loop-only until a fuel feature exists, declared so in
  `tests/at/expected/req-004.json`.
