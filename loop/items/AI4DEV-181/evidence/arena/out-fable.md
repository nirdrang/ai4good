# Candidate design: the Discovery screen on a normalized, SQL-ruled brief (fable)

Direction taken: a normalized relational brief, one row per topic, question, option and section, with every rule inside security-definer plpgsql, so that each port write is exactly one database call and the edge functions are shells.

## Problem

The phase 2 screen talks to `DiscoveryPort` (nine members) and nothing on the server speaks it. The server has a turn ledger (`discovery_turns`), a daily credit ledger (`discovery_spend`), a one-shot `record_elicitation` blob, file names, and a scope generator that is leaving Discovery. The screen needs a revisioned `BriefSnapshot`, a `Confirmation` keyed by revision, `DiscoveryFile` rows with a live read, a `DiscoveryUsage` with a next-reply mode, and a transcript of `UIMessage`s with typed parts that survives reload. Constraints that shape the design: `use-discovery.ts` applies only `data-brief` and `data-usage` from the stream and keeps the higher revision (`newerBrief`); refusals must arrive as `{kind, reason}` JSON (thrown by `DefaultChatTransport` on a non-2xx body, so today's `{ok:false,kind,reason}` already parses); `answerMessageId` must name a message id that exists both live and after reload; a real edit must clear the confirmation; finish is idempotent per revision; the file read is not a turn; the founder's calls: one credit per turn, no beta counter, free first, poll an edge function, the first reply automatic and free, a forced `reply` tool carrying text plus the brief update, text as the schema's first property so it streams.

## Usage (caller's view)

**The route** (`src/routes/discovery/$organizationId.$projectId.tsx`) is the only caller of the port constructor:

```ts
const port = useMemo(() => createDiscoveryPort({ organizationId, projectId, session: getSupabase() }), [organizationId, projectId]);
return view === "review"
  ? <DiscoveryReview port={port} onBack={() => setView("chat")} />
  : <DiscoveryScreen port={port} onOpenReview={() => setView("review")} onBuyFuel={() => setNotice(TEXT.buyFuelNote)} />;
```

**The port** (`src/lib/discovery-port.ts`) talks to four edge functions and nothing else:

```ts
const state = await port.load();          // POST discovery-state; on first open it first POSTs discovery-message {mode:"open"} and reads again
const brief = await port.saveBriefEdit({ sectionId: "booking", text: "Volunteers book themselves", baseRevision: 4 });
// POST discovery-brief {action:"edit", sectionId, text, baseRevision} -> { ok, brief, lines, confirmation }  (one RPC, one transaction)
const file = await port.addFile(file);    // POST discovery-file (multipart) -> { ok, file }; the read runs on the server; the port polls discovery-state until no file is reading
const stop = port.subscribe(listener);    // the poller: every 1500 ms while a file reads, and once after every write; pushes only what changed
```

**The screen** sends exactly what it sends today; the port's transport merges the ids and the client message id:

```ts
// use-discovery.ts, unchanged:  chat.sendMessage({ text }, { body: { message: note, mode: "answer", expectedCharge, answers } })
// discovery-port.ts, prepareSendMessagesRequest:
return { body: { organizationId, projectId, userMessageId: lastUser.id, ...body } };
```

**The server, one turn** (`discovery-message`), as the writer of unit 2 reads it:

```ts
Deno.serve(writeRoute({
  name: 'discovery-message', target: organizationIdField,
  decide: decideDiscoveryMessage,           // parses DiscoveryTurnBody (answers, note, expectedCharge, mode open|answer, userMessageId)
  prepare: discoveryPrepare(port, DISCOVERY_SKILLS),   // loads the brief snapshot + digests; builds the model request with the forced reply tool
  settle: { rpc: 'discovery_turn_settle', act: discoveryAct(port), stream: discoveryStream(port) },
  render: renderDiscoveryTurn,              // -> { reply, filed, charge, questions, brief, usage } : the parts the stream emits
}));
```

**The tests** seed a world from the same `seedState(scenario)` the fixture uses, then open the real route:

```ts
await withDiscovery(ctx, { scenario: 'mid-interview', viewport: 'desktop' }, async (screen) => { /* unchanged body */ });
// integration: provision an NGO admin, submit a need, seedWorldAsOperator(projectId, seedState(scenario)), open /discovery/<org>/<project>, sign in, run the body.
// screen.modelCalls() reads the stack: settled turns after the seed, plus file read calls.
```

## Shape

**Data structures.** The brief is six tables keyed by `project_id`, and the snapshot is one SQL function that reads all six in one statement. The header row owns the revision; every change that the screen must see as "newer" goes through one plpgsql function that bumps it, so there is one writer of `revision` (per single-source-of-truth). Topics, questions and options are rows with stable text ids (`priority`, `priority-q1`, `self`), because the screen addresses them by id and the model addresses topics by id through an enum in the tool schema; a uuid would force a translation layer in both directions. Dependencies between topics are a `depends_on text[]` on the topic row, written once at seeding from a code constant, so `mark dependents` is a two-line update. The transcript is not a table: it is derived from `discovery_turns` (user line, assistant line with parts rebuilt from the stored `brief_update`) and `discovery_brief_lines` (the person lines an edit or accepted suggestion writes), ordered by time. Message ids are stable strings: the user line keeps the client's id (`user_message_id` on the turn), the assistant line is `turn-<seq>`, a person line is `you-<revision>`. That is what makes `answerMessageId` and View-after-reload agree without a sync.

**Rules in SQL.** Every port write is one RPC, `discovery_brief_write(p_account_id, p_organization_id, p_project_id, p_action, p_payload)`, which dispatches to one internal function per verb (`discovery_brief_edit`, `_accept_suggestion`, `_ask_topic`, `_remove_label`, `_finish`). Each takes the base revision where the port sends one, locks the header row `for update`, refuses `stale-revision` on mismatch, applies the change, bumps the revision only when something changed, marks dependents, clears the confirmation on a real edit, writes the person line, and returns `{brief, lines, confirmation}` from the shared snapshot function. The turn settle and the file digest apply call the same internal functions (`discovery_brief_apply_turn`, `discovery_file_digest_apply`), so the chat path and the review path cannot drift on what a revision bump means (per encode-lessons-in-structure). TypeScript never computes a revision.

**The turn.** `decide` parses the screen body into `DiscoveryTurnBody` (validate at the boundary, per boundary-discipline). `prepare` reads the snapshot and digests with the caller's JWT through `viewer_discovery_state`, builds the forced `reply` tool whose `topicId` enum is this project's topic ids, and counts tokens. Reserve inserts the turn with `billing` decided by the new order: free while the day's credits remain, else fuel when funded and the fuel covers the hold, else refuse; it checks `expectedCharge` against that decision and refuses `mode-changed`; it refuses `finished` when a current confirmation exists and `discovery-ready` when every required topic is settled and no answer came; it debits exactly one credit. The stream observer reads `input_json_delta` and emits the `text` field as it arrives (a small scanner, `replyTextScanner`, that finds `"text":"` and decodes the JSON string until its closing quote). Settle is one transaction: apply the structured answers (authoritative), then the model's update (its `agreed` entries only for topics the answers did not cover, its new questions, its sections, tier, fit, labels), bump once, charge the credit, store `brief_update` on the turn. The handler then emits `data-filed`, `data-charge`, one `data-question` per open question (persistent), then `data-brief` and `data-usage` (transient), then `finish`. The server appends the deterministic sentences the screen asserts on (`TEXT.readyReply` when ready, the file report line when a digest has not been reported) around the model text, exactly as the fixture does, so the model never has to reproduce copy.

**The opening turn.** `load` on a project with no brief header POSTs `discovery-message {mode:"open"}` and reads again. Reserve for `open` inserts a turn with billing `opening` (zero credits, guardrails on), refuses `already-opened` if an opening turn is settled, and the `reply` tool on that call additionally accepts `topics` (the checklist wording for the six fixed topic ids). The intake text is the user line (`id: "intake"`).

**Usage.** `DiscoveryUsage` loses `betaLeft` and `betaGrant`. `viewer_discovery_usage` returns remaining and grant for today, `nextResetAt` as the next UTC midnight, fuel from the stub, the constant hold, and `nextReply` by the free-first rule. One credit per turn is enforced by the check constraint `reserved_credits = 1` for free rows.

**Files.** One bucket, one table. `discovery-file` is its own handler (multipart, not `writeRoute`): it calls `discovery_file_add` first (finished, limit, duplicate, inserts the row at `reading 5%`), then puts the bytes, then `EdgeRuntime.waitUntil(readDiscoveryFile(...))`. The read extracts text, splits into parts, runs one forced `digest_part` call per part with the running digest, updates `percent` per part, and ends with `discovery_file_digest_apply` (status `ready`, facts count, the took sentence, the digest jsonb). No turn row, no credit. Later turns get digests, never bytes, in the uncached system block.

**What the public surface hides.** The port is nine members; behind them sit four edge functions, the poller, the opening turn, the id discipline, and the stream parsing. The screen never sees organization ids, revisions being computed, multipart, or polling. The edge functions hide SQL dispatch and the model request. SQL hides every brief rule. Each layer is deep: a caller learns the port and nothing under it.

**Deliberately not done.** No realtime channel (founder: poll). No fuel ledger (stub stays, `allocationMicros` and `settledMicros` are 0). No fit-decline ops item. No admin surface. No scope generation inside Discovery.

## Tradeoffs accepted

- We accept the turn storing `brief_update` jsonb beside the normalized rows in exchange for a reload-stable transcript with `data-filed` and `data-question` parts; it is an event record of that reply, never read back as brief state.
- We accept `load` waiting on the opening model call on first open (a plain "Loading Discovery." for a few seconds) in exchange for no screen change and an opening that is free and happens once.
- We accept extracting the reply text from a streaming tool input with a hand-written scanner in exchange for the one-call-updates-the-brief guarantee the founder chose.
- We accept polling every 1.5 seconds only while a file reads, plus one read after each write, in exchange for no realtime infrastructure; a stale write still pushes the current brief because the RPC returns it.
- We accept a fixed set of six topic ids with model-written wording in exchange for a stable checklist, a static dependency graph, and an enum in the tool schema.
- We accept dropping `beta*` from a shipped screen type in exchange for one usage model on both sides; that is the one forced screen change.

## Alternatives considered

- **A jsonb brief column with the rules in TypeScript.** Smaller schema, but every edge function would reimplement the revision rule, and two writers (settle and the review writes) could race on one document; it hides nothing from the edge layer and leaks the snapshot shape into SQL and TypeScript both. Lost on information leakage.
- **Append-only brief events with the snapshot folded on read.** Perfect history, but the fold must exist in SQL for the stale check and in TypeScript for nothing; every read pays the fold; and the screen needs a current revision, not a log. Lost on reader load for no caller benefit.
- **Supabase realtime for `subscribe`.** Fewer requests, but a second transport, a second auth path, and the UI reading tables directly, which the project forbids. Lost on the founder's ruling and the access rule.
- **A text reply plus an optional `update_brief` tool.** Measured: Haiku returned no text on five of fifteen turns. Lost on evidence.

## Open questions and risks

- Is it acceptable that the first open of Discovery shows "Loading Discovery." for the length of one Haiku call, or should the opening reply stream into the chat (which needs a screen change)?
- Six fixed topic ids (`priority`, `users`, `change`, `measure`, `owner`, `data`) with model-written wording: do the seeded fixture ids (`priority`, `booking`, `measure`, `owner`, `info`, `rules`) stay as the integration seed, or should the fixture seed move to the real ids now?
- The reply text scanner trusts the schema's property order; if the served model emits another property first, the text arrives at the end. Do we accept a non-streamed reply in that case?
- Which file types does unit 4 extract in Deno (text, csv, md, json for sure; docx and xlsx need a library; pdf may not)?
- Integration screen tests call the real model on Haiku: nondeterministic prose around deterministic sentences. Is the model-call budget per `at:verify` run acceptable (about twelve calls)?

## Next implementation step

Write migration `20261002120000_discovery_brief.sql` with the six tables, `discovery_brief_snapshot`, `discovery_brief_write` and its five verbs, and a vitest-free SQL proof through `seedWorldAsOperator` that `edit`, `accept`, `finish`, `edit` again yields revisions 4, 5, 6 and a cleared confirmation.

---

# Type sketch

## SQL

```sql
-- Unit 1: the brief store ------------------------------------------------------------

create type public.discovery_topic_state as enum ('open', 'not_sure', 'agreed');
create type public.discovery_importance as enum ('needed', 'suggested', 'later');

-- One header per project. The only row that carries revision.
create table public.discovery_briefs (
  project_id    uuid primary key,
  org_id        uuid not null,
  revision      integer not null default 1 check (revision >= 1),
  data_tier     smallint check (data_tier in (0, 1, 2)),
  data_tier_reason text,
  fit_verdict   text check (fit_verdict in ('fits', 'declined')),
  fit_reason    text,
  cause_labels  text[] not null default '{}' check (cardinality(cause_labels) <= 3),
  created_at    timestamptz not null default clock_timestamp(),
  updated_at    timestamptz not null default clock_timestamp(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade
);

-- The three prose sections. `source` is the BriefSource json the screen renders.
create table public.discovery_brief_sections (
  project_id  uuid not null references public.discovery_briefs (project_id) on delete cascade,
  section_id  text not null check (section_id in ('need', 'usersToday', 'successMeasure')),
  text        text not null,
  source      jsonb not null,
  primary key (project_id, section_id)
);

create table public.discovery_brief_topics (
  project_id        uuid not null references public.discovery_briefs (project_id) on delete cascade,
  topic_id          text not null,
  position          smallint not null,
  title             text not null,
  required          boolean not null default true,
  importance        public.discovery_importance not null,
  why               text not null,
  suggestion        text,
  planned_question  text not null,
  depends_on        text[] not null default '{}',
  state             public.discovery_topic_state not null default 'open',
  answer            text,
  answer_source     jsonb,
  answer_message_id text,
  not_sure_question_id text,
  not_sure_help     text,
  needs_review      boolean not null default false,
  primary key (project_id, topic_id),
  unique (project_id, position),
  constraint discovery_topic_state_shape check (
    (state = 'agreed')   = (answer is not null and answer_source is not null) and
    (state = 'not_sure') = (not_sure_question_id is not null))
);

create table public.discovery_brief_questions (
  project_id        uuid not null,
  question_id       text not null,
  topic_id          text not null,
  text              text not null,
  reason            text not null,
  importance        public.discovery_importance not null,
  suggested_option  text not null,
  recommendation    text not null,
  uncertainty_help  text not null,
  asked_in_round    integer not null check (asked_in_round >= 1),
  asked_turn_seq    integer,                       -- null for a question askTopic inserted
  primary key (project_id, question_id),
  foreign key (project_id, topic_id) references public.discovery_brief_topics (project_id, topic_id) on delete cascade
);

create table public.discovery_brief_options (
  project_id   uuid not null,
  question_id  text not null,
  option_id    text not null,
  position     smallint not null,
  label        text not null,
  answer       text not null,
  primary key (project_id, question_id, option_id),
  foreign key (project_id, question_id) references public.discovery_brief_questions (project_id, question_id) on delete cascade
);
-- exactly one suggested option per question: enforced in discovery_brief_question_insert (plpgsql), not a deferred constraint.

-- Person lines the review writes: "You changed X: ..." and "You used the suggestion for X: ...".
create table public.discovery_brief_lines (
  project_id  uuid not null references public.discovery_briefs (project_id) on delete cascade,
  line_id     text not null,                      -- 'you-<revision>'
  revision    integer not null,
  text        text not null,
  created_at  timestamptz not null default clock_timestamp(),
  primary key (project_id, line_id)
);

-- One confirmation per revision; the current one has superseded_at null. A real edit supersedes it.
create table public.discovery_confirmations (
  project_id          uuid not null references public.discovery_briefs (project_id) on delete cascade,
  revision            integer not null,
  approver_account_id uuid not null,
  approver_name       text not null,
  confirmed_at        timestamptz not null default clock_timestamp(),
  accepted_gaps       jsonb not null,             -- [{topicId,title,importance,reason}]
  superseded_at       timestamptz,
  primary key (project_id, revision)
);
create unique index discovery_confirmations_one_current on public.discovery_confirmations (project_id) where superseded_at is null;

-- RLS: authenticated may select every brief table under viewer_is_org_member(org_id) via the header join,
-- platform admins via viewer_is_platform_admin(); no insert/update/delete grants to anyone but service_role through the functions below.
-- (Reads go through viewer_discovery_state anyway; the select grant exists for operator checks in tests.)

-- The snapshot: one SQL function, one statement, the BriefSnapshot JSON the screen types.
create function public.discovery_brief_snapshot(p_project_id uuid) returns jsonb
language sql stable set search_path = '' as $$ /* not implemented: header + sections + topics(with state object) + questions(with options) */ $$;

-- Marks every dependent of p_topic_id that already holds an answer. Two lines.
create function public.discovery_brief_mark_dependents(p_project_id uuid, p_topic_id text) returns void
language sql set search_path = '' as $$
  update public.discovery_brief_topics set needs_review = true
   where project_id = p_project_id and p_topic_id = any(depends_on) and state in ('agreed', 'not_sure');
$$;

-- Bumps revision, supersedes the current confirmation when p_clears_confirmation, returns the new revision.
create function public.discovery_brief_bump(p_project_id uuid, p_clears_confirmation boolean) returns integer
language plpgsql set search_path = '' as $$ begin /* not implemented */ end $$;

-- The five review verbs. Each: lock header for update; stale check; refuse 'finished' where the fixture does; change; bump only on change;
-- person line; return jsonb { brief, lines, confirmation }.
create function public.discovery_brief_edit(p_account_id uuid, p_project_id uuid, p_section_id text, p_text text, p_base_revision integer) returns jsonb
language plpgsql set search_path = '' as $$ begin /* not implemented: unknown-section; 'I''m not sure' text -> not_sure; a real change clears confirmation; never refuses finished (it is the reopen path) */ end $$;
create function public.discovery_brief_accept_suggestion(p_account_id uuid, p_project_id uuid, p_topic_id text, p_base_revision integer) returns jsonb
language plpgsql set search_path = '' as $$ begin /* not implemented: finished; no-suggestion; inserts a question for the topic when none exists */ end $$;
create function public.discovery_brief_ask_topic(p_account_id uuid, p_project_id uuid, p_topic_id text) returns jsonb
language plpgsql set search_path = '' as $$ begin /* not implemented: finished; unknown-topic; no-op when a question exists; round = settled turn count floored at 1 */ end $$;
create function public.discovery_brief_remove_label(p_account_id uuid, p_project_id uuid, p_label text, p_base_revision integer) returns jsonb
language plpgsql set search_path = '' as $$ begin /* not implemented: finished; absent label is a no-op */ end $$;
create function public.discovery_brief_finish(p_account_id uuid, p_project_id uuid, p_revision integer, p_ack_open_gaps boolean, p_ack_data boolean) returns jsonb
language plpgsql set search_path = '' as $$ begin /* not implemented: existing confirmation at p_revision -> return it; file-reading; stale-revision; open-gaps; data-ack; approver_name from accounts; revision unchanged */ end $$;

-- The one RPC the discovery-brief edge function calls. Security definer. Membership + admin + kill switch + stage once, then dispatch.
create function public.discovery_brief_write(p_account_id uuid, p_organization_id uuid, p_project_id uuid, p_action text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$ begin /* not implemented: action in ('edit','accept','ask','remove-label','finish') */ end $$;
grant execute on function public.discovery_brief_write(uuid, uuid, uuid, text, jsonb) to service_role;

-- Member-scoped read of the whole DiscoveryState, with the caller's JWT. One call, one consistent snapshot.
create function public.viewer_discovery_state(p_project_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$ begin /* not implemented: viewer_is_org_member or platform admin; returns { project, transcript, brief, files, usage, confirmation, opened } */ end $$;
grant execute on function public.viewer_discovery_state(uuid) to authenticated;

-- Unit 2: the turn ---------------------------------------------------------------------

alter type public.discovery_billing add value 'opening';     -- its own migration, as 'retry' was
alter table public.discovery_turns
  add column mode text not null default 'answer' check (mode in ('open', 'answer')),
  add column answers jsonb not null default '[]',           -- DiscoveryAnswer[] as sent
  add column expected_charge text check (expected_charge in ('free', 'paid')),
  add column user_message_id text,                          -- the client's message id; the transcript reuses it
  add column brief_update jsonb,                            -- the reply tool input minus text, stored at settle
  add constraint discovery_turns_free_is_one_credit check (billing <> 'free' or reserved_credits = 1),
  add constraint discovery_turns_opening_is_free check (billing <> 'opening' or (reserved_credits = 0 and coalesce(charged_credits, 0) = 0));
-- `elicitation` stays as a column until unit 6 retires the scope path; nothing new writes it.

-- Reserve, replaced: p_body carries mode, answers, expected_charge, user_message_id. Billing order:
--   open  -> 'opening' (refuse 'already-opened' when a settled opening turn exists)
--   free while discovery_allowance remaining > 0 (regardless of funded_at)
--   fuel  when funded and project_fuel_available_micros >= hold
--   else  refuse 'daily-limit' (vetted/unvetted sentences kept from discovery_allowance)
-- then: 'finished' if a current confirmation exists; 'discovery-ready' if every required topic settled and answers = [];
--       'mode-changed' if expected_charge <> decided (never for 'open'); unknown questionId -> 'invalid-request';
--       debit exactly 1 credit for 'free'; retry rule unchanged (zero credits).
create or replace function public.discovery_turn_reserve(p_account_id uuid, p_organization_id uuid, p_project_id uuid, p_body jsonb, p_settings jsonb, p_counted_through_seq integer) returns jsonb
language plpgsql security definer set search_path = '' as $$ begin /* not implemented */ end $$;

-- Settle, replaced: on 'completed' it calls discovery_brief_apply_turn in the same transaction, charges 1 credit (free) or 0, stores brief_update,
-- and returns { turn, brief, lines, usage, filed, questions, charge } so the handler emits parts without a second read.
create or replace function public.discovery_turn_settle(p_account_id uuid, p_turn_id uuid, p_outcome text, p_assistant_message text,
  p_input_tokens integer, p_output_tokens integer, p_stop_reason text, p_served_model text, p_brief_update jsonb, p_off_topic boolean, p_notice jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$ begin /* not implemented */ end $$;

-- Applies one reply to the brief. Called only by settle. Returns the filed topics and the questions added.
create function public.discovery_brief_apply_turn(p_project_id uuid, p_turn public.discovery_turns, p_update jsonb) returns jsonb
language plpgsql set search_path = '' as $$ begin
  /* not implemented:
     1. if no header: insert header rev 1, sections.need from the intake, topics from p_update.topics (ids must equal DISCOVERY_TOPIC_IDS) — opening only
     2. for each answer in p_turn.answers: topic := question.topic_id; certain -> agreed {chat, round}, answer_message_id = p_turn.user_message_id;
        uncertain -> not_sure; needs_review := false; mark dependents; changed := true
     3. for each p_update.agreed not covered by 2 and whose topic is open or not_sure: same as certain/uncertain
     4. for each p_update.questions on a topic without a question: insert question + options (one suggested), asked_in_round = round, asked_turn_seq = seq
     5. p_update.usersToday / successMeasure when present and different: upsert section with source {chat, round}
     6. p_update.dataTier / fit / causeLabels when present: normalize labels against public.cause_labels (reuse, never mint a near-duplicate), cap 3
     7. if changed: discovery_brief_bump(p_project_id, false)   -- a chat turn after confirmation is refused at reserve, so nothing to clear
  */ end $$;

-- Unit 3: usage -------------------------------------------------------------------------

-- The DiscoveryUsage JSON for the screen, from discovery_allowance 'read' + the fuel stub. Service role and viewer_discovery_state call it.
create function public.discovery_usage(p_account_id uuid, p_organization_id uuid, p_project_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$ begin
  /* not implemented: dailyLeft = remaining, dailyGrant = granted, availableMicros = project_fuel_available_micros, reservedMicros = 0,
     allocationMicros = 0, settledMicros = 0, holdMicros = 250000, nextResetAt = next UTC midnight (ISO), nextReply = free | paid | unavailable */
end $$;

-- Unit 4: files -------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit) values ('discovery-files', 'discovery-files', false, 52428800);
-- storage policies: service_role only. Nothing reads the bytes but the read job.

create type public.discovery_file_status as enum ('reading', 'ready', 'failed');
create table public.discovery_files (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.discovery_briefs (project_id) on delete cascade,
  org_id          uuid not null,
  file_name       text not null,
  media_type      text not null,
  byte_size       bigint not null check (byte_size > 0),
  storage_path    text not null,                            -- '<org>/<project>/<id>/<file_name>'
  status          public.discovery_file_status not null default 'reading',
  percent         smallint not null default 5 check (percent between 0 and 100),
  part_count      integer, parts_done integer not null default 0,
  digest          jsonb,                                    -- { facts: string[], questions: string[] } accumulated per part
  facts_count     integer, took_from_it text, failure text,
  reported_turn_seq integer,                                -- the turn whose reply reported this file; null until reported
  read_input_tokens integer not null default 0, read_output_tokens integer not null default 0, read_calls integer not null default 0,
  added_by_account_id uuid not null, added_at timestamptz not null default clock_timestamp(), ready_at timestamptz,
  unique (project_id, file_name)
);
-- RLS select for org members and platform admins; writes only through the functions below.

create function public.discovery_file_add(p_account_id uuid, p_organization_id uuid, p_project_id uuid, p_file jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$ begin
  /* not implemented: admin + kill switch + stage; 'finished' when a current confirmation exists;
     'file-limit' when funded_at is null and count(discovery files) >= 3; 'duplicate-file' on the unique name; insert reading 5%; return the DiscoveryFile JSON + storage_path */
end $$;
create function public.discovery_file_progress(p_file_id uuid, p_percent smallint, p_parts_done integer, p_digest jsonb, p_usage jsonb) returns void
language plpgsql security definer set search_path = '' as $$ begin /* not implemented: only while status = 'reading' */ end $$;
create function public.discovery_file_digest_apply(p_file_id uuid, p_digest jsonb, p_took_from_it text) returns jsonb
language plpgsql security definer set search_path = '' as $$ begin
  /* not implemented: status ready, facts_count = cardinality(facts), took_from_it only when no current confirmation (as the fixture); no revision bump */
end $$;
create function public.discovery_file_fail(p_file_id uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$ begin /* not implemented */ end $$;
grant execute on function public.discovery_file_add(uuid, uuid, uuid, jsonb), public.discovery_file_progress(uuid, smallint, integer, jsonb, jsonb),
  public.discovery_file_digest_apply(uuid, jsonb, text), public.discovery_file_fail(uuid, text) to service_role;

-- Intake files appear in DiscoveryState.files as origin 'intake' straight from need_intakes.reference_files; they are never counted.
```

## TypeScript, server (`supabase/functions/_shared/`)

```ts
// discovery-brief-types.ts — the domain types the server speaks; the screen's types are imported from src/lib/discovery-stream.ts
// through the existing `@/` path at build time? No: Deno cannot import the Vite tree. These are the same shapes, declared once here and
// asserted structurally equal by tests/at/harness/discovery-shapes.test.ts (a thin vitest that type-checks `satisfies`).
export type Importance = 'needed' | 'suggested' | 'later';
export type BriefSource = { kind: 'intake' } | { kind: 'chat'; round: number } | { kind: 'accepted-suggestion' } | { kind: 'edit'; revision: number } | { kind: 'file'; fileId: string; fileName: string };
export type BriefSnapshot = { revision: number; need: Section; usersToday: Section | null; successMeasure: Section | null; topics: BriefTopic[]; questions: BriefQuestion[]; dataTier: { tier: 0 | 1 | 2; reason: string } | null; fit: { verdict: 'fits' | 'declined'; reason: string } | null; causeLabels: string[] };
export type DiscoveryUsage = { dailyLeft: number; dailyGrant: number; availableMicros: number; reservedMicros: number; allocationMicros: number; settledMicros: number; holdMicros: number; nextResetAt: string | null; nextReply: 'free' | 'paid' | 'unavailable' };
/** The six topic ids every project's checklist uses; the model writes the wording, the platform owns the ids and the graph. */
export const DISCOVERY_TOPIC_IDS = ['priority', 'users', 'change', 'measure', 'owner', 'data'] as const;
export const DISCOVERY_TOPIC_DEPENDENCIES: Record<TopicId, readonly TopicId[]> = { priority: [], users: [], change: ['priority'], measure: ['priority'], owner: [], data: ['users'] };
export const DISCOVERY_HOLD_MICROS = 250_000;

// discovery-turn.ts — replaced parts
export type DiscoveryTurnBody =
  | { mode: 'open' }
  | { mode: 'answer'; note: string; expectedCharge: 'free' | 'paid'; answers: DiscoveryAnswer[]; userMessageId: string };
/** Boundary parse of the screen's DiscoveryRequestBody plus the port's additions. Empty note with answers is valid; both empty is not. */
export function parseTurnBody(body: Record<string, unknown>): DiscoveryTurnBody | null { throw new Error('not implemented'); }
export function decideDiscoveryMessage(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryReserveArgs> { throw new Error('not implemented'); }
export type DiscoveryReserveArgs = { p_account_id: string; p_organization_id: string; p_project_id: string; p_body: DiscoveryTurnBody; p_settings: DiscoveryReserveSettings; p_counted_through_seq: number; [PREPARED_REQUEST]?: DiscoveryModelRequest };
/** Reads viewer_discovery_state with the caller's JWT, builds the reply-tool request (topic enum = this project's ids), counts tokens. */
export function discoveryPrepare(port: MessagesPort, skills: readonly DiscoverySkill[]): (caller: Caller, args: DiscoveryReserveArgs, reads: CallerReads) => Promise<WriteRouteDecision<DiscoveryReserveArgs>> { throw new Error('not implemented'); }
/** The settle payload rendered for the stream: parts in the order the fixture persists them. */
export type DiscoveryTurnRender = { reply: string; filed: { topics: { id: string; title: string }[] } | null; charge: ChargePart; questions: QuestionPart[]; brief: BriefSnapshot; usage: DiscoveryUsage };
export function renderDiscoveryTurn(value: unknown): DiscoveryTurnRender { throw new Error('not implemented'); }

// discovery-reply-tool.ts — the forced tool and its parse
export function replyTool(topicIds: readonly string[], opening: boolean): ToolDefinition { throw new Error('not implemented'); }
/** Strict parse. A reply whose text is empty is a failed turn (the model refused to speak), not a settled one. */
export function parseReply(input: unknown, topicIds: readonly string[]): { text: string; update: BriefUpdate } | null { throw new Error('not implemented'); }
export type BriefUpdate = {
  agreed: { topicId: string; answer: string; certain: boolean }[];
  questions: { topicId: string; text: string; reason: string; importance: Importance; options: { label: string }[]; suggested: number; recommendation: string; uncertaintyHelp: string }[];
  topics?: { topicId: string; title: string; why: string; plannedQuestion: string; suggestion: string | null; importance: Importance }[];   // opening only
  usersToday?: string; successMeasure?: string; dataTier?: { tier: 0 | 1 | 2; reason: string }; fit?: { verdict: 'fits' | 'declined'; reason: string }; causeLabels?: string[];
  ready: boolean;
};
/** Incremental reader of the `text` property from streamed input_json_delta chunks. Emits decoded characters as they arrive; silent once the string closes. */
export function replyTextScanner(onText: (delta: string) => void): { push(jsonDelta: string): void } { throw new Error('not implemented'); }
/** The sentences the server adds around the model text so the screen's deterministic copy holds: pending file reports first, TEXT.readyReply when ready. */
export function composeReply(modelText: string, input: { reports: string[]; ready: boolean }): string { throw new Error('not implemented'); }

// anthropic-messages.ts — MessagesPort gains the forced tool and the scanner
export type MessagesPort = {
  model: string;
  create(request: DiscoveryModelRequest): Promise<DiscoveryModelAnswer>;
  countTokens(request: DiscoveryModelRequest): Promise<number>;
  /** onDelta now receives reply text from the tool input, not text blocks. */
  stream(request: DiscoveryModelRequest, onDelta: (text: string) => void, signal: AbortSignal): Promise<DiscoveryModelAnswer>;
};

// discovery-stream.ts — new parts
export const dataPart = (type: 'data-filed' | 'data-charge' | 'data-question' | 'data-brief' | 'data-usage', data: unknown, transient = false): string => part({ type, data, ...(transient ? { transient: true } : {}) });
// edge.ts: the stream branch emits start(messageId = `turn-<seq>`), textStart, deltas, textEnd, then spec.parts(settled) in order, then finish.

// discovery-brief.ts — the review edge function's shell
export type DiscoveryBriefBody = { action: 'edit'; sectionId: string; text: string; baseRevision: number } | { action: 'accept'; topicId: string; baseRevision: number } | { action: 'ask'; topicId: string } | { action: 'remove-label'; label: string; baseRevision: number } | { action: 'finish'; revision: number; acks: { reviewed: true; openGaps: boolean; data: boolean } };
export function decideDiscoveryBrief(input: AccountWriteRouteInput): WriteRouteDecision<{ p_account_id: string; p_organization_id: string; p_project_id: string; p_action: string; p_payload: DiscoveryBriefBody }> { throw new Error('not implemented'); }
export function renderDiscoveryBrief(value: unknown): { brief: BriefSnapshot; lines: DiscoveryUIMessageJson[]; confirmation: Confirmation | null } { throw new Error('not implemented'); }
// WRITE_ROUTES gains 'discovery-brief' -> rpc 'discovery_brief_write' (ngo). WRITE_REFUSAL_KINDS gains:
// 'stale-revision','finished','discovery-ready','mode-changed','daily-limit','already-opened','unknown-section','unknown-topic','no-suggestion','file-reading','open-gaps','data-ack','file-limit','duplicate-file'.

// discovery-file.ts — upload and read job (its own handler: multipart in, JSON out; same caller resolution as writeRoute)
export function parseUpload(form: FormData): { organizationId: string; projectId: string; file: File } | null { throw new Error('not implemented'); }
export async function readDiscoveryFile(port: MessagesPort, file: { id: string; path: string; mediaType: string; name: string }, need: NeedContext): Promise<void> { throw new Error('not implemented: extractText -> splitParts(12_000 chars) -> per part forced digest_part(running digest) + discovery_file_progress -> discovery_file_digest_apply; any throw -> discovery_file_fail'); }
export function extractText(bytes: Uint8Array, mediaType: string): string { throw new Error('not implemented: text/*, csv, md, json; docx and xlsx via a Deno-compatible unzip + XML walk; pdf refused with a plain reason'); }
export const DIGEST_PART_TOOL: ToolDefinition; // { facts: string[], questions: string[], tookFromIt: string } with the running digest as input context

// discovery-state.ts — the read edge function
export async function discoveryStateAnswer(reads: CallerReads, projectId: string): Promise<{ status: 200; body: { ok: true; state: DiscoveryStateJson } } | typeof TENANT_NOT_FOUND | typeof TENANT_READ_FAILED> { throw new Error('not implemented: one rpc viewer_discovery_state'); }
```

## TypeScript, app (`src/lib/discovery-port.ts`, new)

```ts
import { DefaultChatTransport } from "ai";
import type { DiscoveryPort, Result, ServerChange } from "@/components/discovery/port";
import type { BriefSnapshot, Confirmation, DiscoveryFile, DiscoveryState, DiscoveryUIMessage, DiscoveryUsage } from "@/lib/discovery-stream";

export type DiscoveryPortDeps = { organizationId: string; projectId: string; session: { getAccessToken(): Promise<string | null> }; functionsUrl(name: string): string; publishableKey: string; pollMs?: number };

/** The real port. Edge functions only: discovery-state, discovery-message, discovery-brief, discovery-file. */
export function createDiscoveryPort(deps: DiscoveryPortDeps): DiscoveryPort {
  // listeners: Set<(c: ServerChange) => void>; last: { revision, filesJson, usageJson, confirmationJson } for change detection
  // poll(): fetch state; push { files } when changed, { brief } when revision rose, { usage } when changed, { confirmation } always present
  // schedulePolling(): while any file.status.kind === 'reading', setTimeout(poll, pollMs ?? 1500); also one poll after every write
  return {
    async load(): Promise<Result<DiscoveryState>> { throw new Error('not implemented: state := POST discovery-state; if state.opened === false -> POST discovery-message {mode:"open"} (non-stream), then state again; start polling if a file reads'); },
    chat: new DefaultChatTransport<DiscoveryUIMessage>({ api: deps.functionsUrl('discovery-message'), headers: async () => ({ /* bearer, apikey, Accept: text/event-stream */ }), prepareSendMessagesRequest: ({ messages, body }) => ({ body: { organizationId: deps.organizationId, projectId: deps.projectId, userMessageId: messages.at(-1)!.id, ...body } }) }),
    async addFile(file: File): Promise<Result<DiscoveryFile>> { throw new Error('not implemented: multipart POST discovery-file; on ok push { files } from a poll and start polling'); },
    subscribe(listener) { throw new Error('not implemented'); },
    async saveBriefEdit(input) { throw new Error('not implemented: write("edit", input)'); },
    async acceptSuggestion(input) { throw new Error('not implemented: write("accept", input)'); },
    async askTopic(input) { throw new Error('not implemented: write("ask", input)'); },
    async removeCauseLabel(input) { throw new Error('not implemented: write("remove-label", input)'); },
    async finish(input) { throw new Error('not implemented: write("finish", input) -> Result<Confirmation>; push { confirmation }'); },
  };
  // write(action, payload): POST discovery-brief; on { ok:false, kind, reason } -> Result refusal (on 'stale-revision' the body carries the current brief: push { brief }, as the fixture's stale() does);
  // on ok -> push { brief, confirmation, transcript: lines } and return brief.
}
/** Refusal JSON -> the screen's Result. A non-JSON failure becomes { kind: 'send-failed', reason }. */
export function refusalFromResponse(status: number, text: string): { kind: string; reason: string } { throw new Error('not implemented'); }
```

## Screen changes, named (the only ones)

1. `src/lib/discovery-stream.ts` `DiscoveryUsage`: remove `betaLeft`, `betaGrant` (founder: no beta counter).
2. `src/components/discovery/model.ts` `usageView` and `freeFill`: one free gauge on daily consumed; the "Beta replies do not reset" branches become "Free replies return at <time>" always, since `nextResetAt` is never null now; `values.beta` goes.
3. `src/components/discovery/UsageCard.tsx`: drop the beta value line (wherever `values.beta` renders).
4. `design/astra/src/fixture-data.ts` and `fixture-world.ts`: usage seeds lose beta; `replyKind` reads `dailyLeft` only; the `beta-limit` refusal kind goes (`daily-limit` stays).
5. `tests/at/suites/req-004/_flows.ts` `expectUsage` and `j-need-brief.test.ts` AT-004.72 and .73: the `18 of 50` / `17 of 50` assertions go.
6. `design/discovery-ui-contract.md` funding table and the REQ-004 acceptance text: the beta row and the beta remedies go (unit 3 edits the text in the same change).

Everything else under `src/components/discovery/` stays byte-identical: the port interface, the hooks, the parts the renderer reads, the refusal parsing.

## Module map

| Path | Unit | Role |
|---|---|---|
| `supabase/migrations/20261002120000_discovery_brief.sql` | 1 | six brief tables, RLS, snapshot, bump, mark dependents, five verbs, `discovery_brief_write`, `viewer_discovery_state` |
| `supabase/migrations/20261002120100_discovery_billing_opening.sql` | 2 | `alter type ... add value 'opening'` alone |
| `supabase/migrations/20261002120200_discovery_turn_brief.sql` | 2 | turn columns, reserve and settle replaced, `discovery_brief_apply_turn` |
| `supabase/migrations/20261002120300_discovery_usage.sql` | 3 | `discovery_usage`, the one-credit constraint |
| `supabase/migrations/20261002120400_discovery_files.sql` | 4 | bucket, `discovery_files`, the four file functions |
| `supabase/functions/_shared/discovery-brief-types.ts` | 1 | domain types and the topic constants |
| `supabase/functions/_shared/discovery-brief.ts` | 1 | decide and render for the review route |
| `supabase/functions/discovery-brief/index.ts` | 1 | `writeRoute({ name: 'discovery-brief', ... })` |
| `supabase/functions/_shared/discovery-state.ts`, `supabase/functions/discovery-state/index.ts` | 1 | the state read |
| `supabase/functions/_shared/discovery-reply-tool.ts` | 2 | tool schema, parse, scanner, `composeReply` |
| `supabase/functions/_shared/discovery-turn.ts`, `discovery-prompt.ts`, `anthropic-messages.ts`, `discovery-stream.ts`, `edge.ts` (stream branch) | 2 | the turn contract; `record_elicitation` and skill 06 leave the chat prompt |
| `supabase/functions/_shared/discovery-metering.ts`, `write-routes.ts` | 2, 3 | refusal kinds, hold constant, free-first billing target |
| `supabase/functions/_shared/discovery-file.ts`, `supabase/functions/discovery-file/index.ts` | 4 | upload, read job, digest |
| `supabase/config.toml` | 1, 4 | `[functions.discovery-brief]`, `[functions.discovery-state]`, `[functions.discovery-file]` with `verify_jwt = true`; the bucket |
| `src/lib/discovery-port.ts` | 5 | the real port and poller |
| `src/routes/discovery/$organizationId.$projectId.tsx` | 5 | sign-in kept; mounts `DiscoveryScreen` and `DiscoveryReview` on the port; `?view=review` |
| `tests/at/harness/screen.ts`, `screen-host.mjs` | 5 | `useScreenDriver({ app: true })`: root Vite build with the stack's `VITE_` values, SPA fallback, sign-in step |
| `tests/at/suites/req-004/_screen.ts`, `_live.ts` | 5 | `withDiscovery` at integration: provision, submit need, `seedWorldAsOperator(projectId, seedState(scenario))`, open the route; `modelCalls()` from the stack |
| `tests/at/suites/req-032/`, `tests/at/suites/req-036/` | 4, 6 | AT-032.13 (the limit through `discovery_file_add`), AT-036.11/.12 |
