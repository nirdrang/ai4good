# Candidate: committed turns own the Discovery record

## Problem

AI4DEV-181 (Discovery backend wiring) must connect an existing screen to a backend that currently stores text conversations, closing elicitation records, and token-priced credits. The screen expects a revisioned brief, structured questions, free review operations, automatic file reads, and confirmation of the exact revision.

Make a **committed turn the unit of truth**. Model replies and manual review changes enter one ordered ledger. Each entry records its brief update and resulting revision. Immutable brief revisions provide fast reads without creating an independently editable current brief.

This beats a mutable brief store for tracing a changed answer back to its reply, source, and charge. It costs an additional commit ledger and historical snapshots. A separate mutable store would be simpler if that history were unnecessary; the atomic reply–brief–charge requirement makes the ledger useful here.

## Usage first

The app opens a scoped port once. Opening creates the automatic first reply if needed; subsequent loads, review navigation, and polling make no model call.

```tsx
// src/routes/discovery/$organizationId.$projectId.tsx
const opened = await openDiscovery({ organizationId, projectId });
if (!opened.ok) return showFailure(opened.refusal);

const port = opened.value;
// Keep this port and the chat mounted while the review is visible.
return (
  <DiscoveryScreen
    port={port}
    active={panel === "chat"}
    onOpenReview={() => setPanel("review")}
    onBuyFuel={() => setPanel("fuel")}
  />
);
```

The existing review controller keeps its calls:

```ts
const loaded = await port.load();
if (!loaded.ok) return loaded;

const edited = await port.saveBriefEdit({
  sectionId: "booking",
  text: "Kitchen coordinators book the shifts.",
  baseRevision: loaded.value.brief.revision,
});

if (!edited.ok) return edited;

return port.finish({
  revision: edited.value.revision,
  acks: { reviewed: true, openGaps: true, data: true },
});
```

The file worker owns file processing. It publishes a digest; it never writes an answer or spends a turn:

```ts
const work = await files.claimNextRead();
if (work === null) return;

await readDiscoveryFile(work);
// Stores completed parts independently, then commits one file-read ledger entry.
// Closing the browser or file panel does not cancel this work.
```

## Shape

The existing `DiscoveryPort` remains the public screen interface. It hides authentication, HTTP, polling, upload orchestration, and stream reconciliation. The backend exposes domain commands internally; Anthropic payloads, database rows, and SSE encoding stay behind adapters, per **boundary-discipline**.

The committed ledger owns ordering and revision transitions. An immutable document stores sections, topics, questions, suggestions, and file references together because every dominant read needs the whole brief. JSON objects keyed by stable ids support the dominant writes without introducing separately synchronized tables.

File readers own separate rows and completed parts. Their final commits merge file facts into the latest document. Human edits and model replies share a genuinely canonical record, so their commits require transactional concurrency control, per **separate-before-serializing-shared-state**.

Only actual document changes create a revision. Repeated model entries preserve existing answers and provenance. Confirmation is current only when its revision equals the ledger’s current revision; invalidation is derived rather than maintained as another flag.

## Synthesis decision

Candidate only. Base selection and grafts belong to the orchestrator.

## Tradeoffs accepted

- We accept immutable document snapshots in exchange for cheap polling and exact historical review.
- We accept separate model-attempt and committed-entry tables in exchange for keeping failed reservations out of the Discovery record.
- We accept JSON document storage in exchange for reading and validating one coherent aggregate.
- We accept rejecting an obsolete model response after a human edit in exchange for protecting the NGO’s newer answer.

## Alternatives considered

**Mutable brief plus separate conversation tables.** Equally small screen interface and less historical storage, but settlement must coordinate two authoritative histories. It hides persistence complexity well; its weakness is reconstructing exactly which reply changed which approved fact.

**Replay every delta on every load.** One authoritative history, but polling repeatedly executes the entire reducer and depends on historical reducer compatibility. Immutable results retain the history without that read cost.

**Put non-model writes into today’s `discovery_turns`.** Rejected because its constraints require model settings, token measurements, and reservation amounts. Making those fields nullable would weaken the existing attempt model substantially.

## Open questions and risks

- Can the broader production `reply` schema retain the prototype’s reliability, including truncated JSON and streamed string escapes?
- Can integration test support supply real document bytes? `_flows.ts` currently uploads the filename as `text/plain`; those bytes cannot establish spreadsheet facts.
- How should paid screen scenarios run against the real stack while fuel remains a zero-balance stub? Positive-balance assertions cannot pass unchanged without additional funding work.
- Which supported deployment mechanism will schedule recovery of expired file-read leases? `waitUntil` alone cannot guarantee recovery after an edge process dies.

## Next implementation step

Build the ledger, immutable brief revisions, and free review commands, then prove revision changes, dependent-topic reopening, stale writes, and repeated confirmation on the real stack.

# Type sketch

The following is a design sketch, not a runnable migration.

## 1. Stored document and committed ledger

A revision stores the complete domain aggregate. Its internal shape differs from the screen shape deliberately: the edge mapper derives ordered arrays and hides dependency rules and removal history.

```ts
// supabase/functions/_shared/discovery-brief.ts
type TopicId = string & { readonly topicId: unique symbol };
type QuestionId = string & { readonly questionId: unique symbol };
type FileId = string & { readonly fileId: unique symbol };
type Revision = number & { readonly revision: unique symbol };

type SectionId = "need" | "usersToday" | "successMeasure";
type Importance = "needed" | "suggested" | "later";

type Source =
  | { kind: "intake" }
  | { kind: "chat"; round: number }
  | { kind: "accepted-suggestion" }
  | { kind: "edit"; revision: Revision }
  | { kind: "file"; fileId: FileId; fileName: string };

type TopicAnswer =
  | { kind: "open" }
  | { kind: "not-sure"; questionId: QuestionId; help: string }
  | {
      kind: "agreed";
      answer: string;
      source: Source;
      answerMessageId: string | null;
    };

type StoredTopic = {
  id: TopicId;
  order: number;
  title: string;
  required: boolean;
  importance: Importance;
  why: string;
  plannedQuestion: string;
  dependsOn: readonly TopicId[];
  state: TopicAnswer;
  needsReview: boolean;
};

type StoredQuestion = {
  id: QuestionId;
  topicId: TopicId;
  text: string;
  reason: string;
  options: readonly {
    id: string;
    label: string;
    answer: string;
  }[];
  suggestedId: string;
  importance: Importance;
  recommendation: string;
  uncertaintyHelp: string;
  askedInRound: number;
};

type Suggestion = {
  id: string;
  topicId: TopicId;
  text: string;
  source: Source;
};

type BriefDocument = {
  sections: Readonly<
    Partial<Record<SectionId, { text: string; source: Source }>>
  > & { need: { text: string; source: Source } };

  topics: Readonly<Record<TopicId, StoredTopic>>;
  questions: Readonly<Record<QuestionId, StoredQuestion>>;
  suggestions: Readonly<Record<string, Suggestion>>;

  dataTier: { tier: 0 | 1 | 2; reason: string } | null;
  fit: { verdict: "fits" | "declined"; reason: string } | null;
  causeLabels: readonly string[];
  removedCauseLabels: readonly string[];

  /** References immutable completed digests; their facts do not agree topics. */
  fileIds: readonly FileId[];
};
```

The initial checklist is seeded from intake. The volunteer scheduling world keeps its six topics and dependencies:

| Changed answer | Existing dependent answer marked for review |
|---|---|
| Priority | Success measure |
| Booking | Booking rules |
| Maintenance owner | Information handled |

Dependencies belong to the initial checklist. Model updates cannot change checklist ids, its denominator, or dependencies. Conditional questions remain within their topic.

```sql
create table public.discovery_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  org_id uuid not null,
  position bigint not null,
  command_id uuid not null,
  kind text not null check (kind in (
    'seed', 'opening', 'reply',
    'edit', 'accept-suggestion', 'ask-topic', 'remove-label',
    'file-read', 'confirm'
  )),
  actor_id uuid references public.accounts(id),
  model_turn_id uuid unique references public.discovery_turns(id),

  before_revision integer not null check (before_revision >= 0),
  after_revision integer not null check (after_revision >= 1),
  brief_update jsonb not null,

  user_message_id text,
  user_text text,
  assistant_message_id text,
  assistant_text text,
  filed_topic_ids text[] not null default '{}',
  asked_question_ids text[] not null default '{}',
  reported_file_ids uuid[] not null default '{}',

  committed_at timestamptz not null default clock_timestamp(),

  foreign key (project_id, org_id)
    references public.projects(id, org_id),

  unique (project_id, position),
  unique (project_id, command_id),
  unique (project_id, id),

  check (
    (kind = 'seed' and before_revision = 0 and after_revision = 1)
    or
    (kind <> 'seed' and
      after_revision in (before_revision, before_revision + 1))
  ),
  check (
    (kind in ('opening', 'reply')) = (model_turn_id is not null)
  ),
  check (
    kind not in ('opening', 'reply')
    or (assistant_message_id is not null and assistant_text is not null)
  )
);

create unique index discovery_entries_one_seed
  on public.discovery_entries(project_id) where kind = 'seed';

create unique index discovery_entries_one_opening
  on public.discovery_entries(project_id) where kind = 'opening';

create index discovery_entries_latest
  on public.discovery_entries(project_id, position desc);

create table public.discovery_brief_revisions (
  project_id uuid not null,
  org_id uuid not null,
  revision integer not null check (revision >= 1),
  produced_by_entry uuid not null unique,
  document jsonb not null,

  primary key (project_id, revision),
  foreign key (project_id, org_id)
    references public.projects(id, org_id),
  foreign key (project_id, produced_by_entry)
    references public.discovery_entries(project_id, id)
    deferrable initially deferred,

  check (public.discovery_document_valid(document))
);

alter table public.discovery_entries
  add foreign key (project_id, after_revision)
    references public.discovery_brief_revisions(project_id, revision)
    deferrable initially deferred;

create table public.discovery_confirmations (
  project_id uuid not null,
  org_id uuid not null,
  revision integer not null,
  entry_id uuid not null unique,
  approver_id uuid not null references public.accounts(id),
  approver_name text not null,
  confirmed_at timestamptz not null,
  accepted_gaps jsonb not null,
  reviewed_ack boolean not null check (reviewed_ack),
  open_gaps_ack boolean not null,
  data_ack boolean not null,

  primary key (project_id, revision),
  foreign key (project_id, org_id)
    references public.projects(id, org_id),
  foreign key (project_id, revision)
    references public.discovery_brief_revisions(project_id, revision),
  foreign key (project_id, entry_id)
    references public.discovery_entries(project_id, id),

  check (jsonb_typeof(accepted_gaps) = 'array')
);
```

`discovery_document_valid(jsonb)` validates the stored domain schema: required need section, unique ids, references, topic-state variants, exactly one suggested option, valid provenance, normalized zero-to-three cause labels, and valid dependencies. It is a pure SQL function used at the database boundary.

All three tables are immutable after insertion. Triggers reject update and delete. The only mutable Discovery records are attempts, allowance reservations, and unfinished file jobs.

The current brief is selected from the ordered ledger:

```sql
create view public.discovery_current_brief
with (security_invoker = true) as
select latest.project_id, latest.org_id, r.revision, r.document
from (
  select distinct on (project_id)
    project_id, org_id, after_revision
  from public.discovery_entries
  order by project_id, position desc
) latest
join public.discovery_brief_revisions r
  on r.project_id = latest.project_id
 and r.revision = latest.after_revision;
```

The state read uses one database snapshot to obtain the brief, current confirmation, transcript, files, and allowance. Confirmation joins on **current revision**, so a real edit returns `confirmation: null` without deleting historical approval.

### Revision rules

The database reducer is the sole authority for applying document changes:

```sql
-- Pure reducer; no I/O or authorization.
public.discovery_apply_update(
  p_document jsonb,
  p_update jsonb
) returns jsonb

-- Pure semantic comparison; ignores a newly proposed provenance when
-- the underlying answer/question/section has not changed.
public.discovery_documents_equal(
  p_before jsonb,
  p_after jsonb
) returns boolean
```

| Operation | Revision and record behavior |
|---|---|
| Model reply | Always commits a reply entry; creates a revision only if its normalized update changes the document. |
| Save edit | Base mismatch refuses `stale-revision`. Identical content is a no-op. A real edit changes source, appends a human line, and invalidates confirmation through the new revision. |
| Accept suggestion | Reads the stored suggestion, creates the question if absent, agrees the topic, and appends a human line. Already-equivalent agreement is a no-op. |
| Ask topic | Creates a question from its stored template without a model call. Existing question returns unchanged. |
| Remove label | Base mismatch refuses. Absent label is a no-op. Removal enters `removedCauseLabels`, preventing later model echoes from restoring it. |
| File read | Adds immutable digest references and file facts to the latest document. Never agrees a topic. |
| Finish | Does not change the brief revision. Same current revision returns the same confirmation. |

An answer change preserves dependent answers and sets their `needsReview` flag. Re-answering clears that topic’s flag. Repeated model descriptions of an unchanged answer preserve its original source and message id.

### Definer functions and access

```sql
-- All write functions:
-- LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
-- Bodies omitted: RAISE EXCEPTION 'not implemented';

public.discovery_open(
  p_account_id uuid,
  p_organization_id uuid,
  p_project_id uuid
) returns jsonb

public.discovery_review_write(
  p_account_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_command_id uuid,
  p_command jsonb
) returns jsonb

public.discovery_reply_reserve(
  p_account_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_command_id uuid,
  p_user_message_id text,
  p_request jsonb,
  p_base_revision integer,
  p_context_position bigint,
  p_settings jsonb
) returns jsonb

public.discovery_reply_settle(
  p_turn_id uuid,
  p_outcome jsonb
) returns jsonb

-- Caller-JWT read: derives identity from auth.uid().
public.discovery_state_read(
  p_organization_id uuid,
  p_project_id uuid
) returns jsonb
```

`discovery_review_write` accepts a discriminated command, rather than a generic document replacement:

```ts
type ReviewCommand =
  | { kind: "edit"; sectionId: SectionId | TopicId;
      text: string; baseRevision: Revision }
  | { kind: "accept-suggestion"; topicId: TopicId;
      baseRevision: Revision }
  | { kind: "ask-topic"; topicId: TopicId }
  | { kind: "remove-label"; label: string;
      baseRevision: Revision }
  | { kind: "confirm"; revision: Revision;
      acks: { reviewed: true; openGaps: boolean; data: boolean } };
```

The definer functions enforce active NGO account, current organization admin, project–organization ownership, and valid Discovery stage. Model operations additionally enforce verified email and the Discovery switch. A disabled model service does not prevent reading, free review, or confirmation.

Finish locks the project, checks the current revision, and checks file/turn activity. It derives accepted gaps from unresolved topics; the client cannot supply or omit them. It validates reviewed acknowledgment, gap acknowledgment when needed, and data acknowledgment for tiers 1 and 2. Empty summaries and unresolved topics are allowed.

For each new table:

- Enable RLS.
- Revoke all direct privileges from `anon`, `authenticated`, and `service_role`.
- Grant authenticated `SELECT` with the existing organization-member and platform-admin policies.
- Grant write-function execution only to `service_role`; revoke default `PUBLIC` execution.
- Grant the caller-scoped state-read function to authenticated users.
- Keep internal append/reducer functions uncallable through client roles.

Each service-role definer repeats authorization; it never treats a supplied account id as sufficient authority.

## 2. Turn contract and atomic settlement

### Accepted request

`discovery-message` accepts the existing `DiscoveryRequestBody` unchanged:

```ts
{
  organizationId,
  projectId,
  message,             // Composer note; may be empty.
  mode: "answer",
  expectedCharge: "free" | "paid",
  answers: [
    { questionId, choice, text, certain }
  ]
}
```

The port privately adds operation metadata: command id, SDK user-message id, last observed revision, and context position. These fields do not enter `use-discovery.ts`.

Validation resolves option ids against stored questions. It rejects contradictory certainty, unknown options/questions, duplicate answers, and empty submissions. An empty note with valid answers is accepted.

```ts
// discovery-turn.ts: domain types, no Anthropic SDK types.
type Answer =
  | { kind: "option"; questionId: QuestionId; optionId: string }
  | { kind: "custom"; questionId: QuestionId; text: string }
  | { kind: "uncertain"; questionId: QuestionId };

type Submission = {
  note: string;
  answers: readonly Answer[];
  expectedCharge: "free" | "paid";
};

type ReplyUpdate = {
  agreed: readonly {
    topicId: TopicId;
    answer: string;
    certain: boolean;
  }[];
  questions: readonly StoredQuestion[];
  sections: Readonly<
    Partial<Record<SectionId, { text: string }>>
  >;
  dataTier: BriefDocument["dataTier"];
  fit: BriefDocument["fit"];
  causeLabels: readonly string[];
};

type Reply = {
  text: string;
  update: ReplyUpdate;
  offTopic: boolean;
};

type CompletedReply = {
  reply: Reply;
  usage: { inputTokens: number; outputTokens: number };
  servedModel: string;
  stopReason: string;
};

export function parseSubmission(raw: unknown): Result<Submission> {
  throw new Error("not implemented");
}

/** Rejects invented agreements and invalid references at the model boundary. */
export function parseReply(
  raw: unknown,
  context: ReplyContext,
): Result<Reply> {
  throw new Error("not implemented");
}

/** Pure prompt construction from intake, brief, transcript, and ready digests. */
export function buildReplyContext(
  state: StoredDiscoveryState,
  submission: Submission | { kind: "opening" },
): ReplyContext {
  throw new Error("not implemented");
}
```

The forced tool is named `reply`. Its first property is `text`; remaining properties carry the structured update and off-topic result. It replaces `record_elicitation` and the separate off-topic tool. Server code assigns provenance, charge, readiness, and confirmation; the model cannot choose them.

The model boundary accepts newly agreed facts only when supported by this submission. Re-listed historical answers are harmless upserts. File evidence cannot produce NGO agreement.

### Streaming

`anthropic-messages.ts` decodes the `text` property from `input_json_delta` events of the selected `reply` tool. It handles JSON escapes and chunk boundaries and validates the complete tool input before settlement.

```ts
// Public domain surface of the provider adapter.
export interface DiscoveryReplyModel {
  reply(
    context: ReplyContext,
    options: {
      signal: AbortSignal;
      onText(text: string): void;
    },
  ): Promise<Result<CompletedReply>>;
}
```

The SSE sequence is:

```text
start                   persisted assistant message id
text-start
text-delta              decoded reply.text fragments
text-end
                        atomic database settlement succeeds here
data-filed              persisted
data-charge             persisted
data-question           persisted; one per unresolved asked question
data-ready              persisted when required topics are resolved
data-brief              transient
data-usage              transient
finish
[DONE]
```

No brief or charge data is emitted before commit. A malformed, truncated, aborted, or refused tool response fails the attempt and releases its credit reservation. Partial text never becomes a completed turn.

The stream’s assistant id and the persisted transcript id must match. Extend the existing write-route stream configuration with a persisted message-id selector and a committed-parts renderer; its default behavior continues serving existing consumers.

### Atomicity and concurrency

`discovery_reply_settle` performs one transaction:

1. Validate that the attempt remains open.
2. Validate its result and revision context.
3. Apply the update and create a revision if changed.
4. Append the reply entry and its transcript references.
5. Settle the attempt and credit.
6. Emit existing consequential notification records where applicable.
7. Return the committed brief and usage.

A newer human edit makes the model response obsolete: fail with `stale-revision`, release the credit, and preserve the newer document. Changes consisting solely of additive completed file reads can merge: the reply updates its captured topics while retaining newer file facts. The model does not report files absent from its captured context.

Successful settlement is idempotent by attempt id. A repeated settlement returns the original result. Expiration closes an unfinished attempt and releases its reservation; late results cannot commit.

### Automatic opening reply

`discovery-open` initializes the seed and reserves an opening attempt when no opening or historical assistant reply exists.

- Opening uses one forced `reply` call.
- Opening reserves and charges **zero credits**.
- A unique opening operation prevents duplicate commits across tabs.
- Concurrent callers observe the existing attempt rather than start another.
- Opening mentions useful file kinds and Add a file only when fewer than three Discovery files exist.
- Review, polling, and reload after a completed opening make no further call.

A failed opening still leaves the seed readable and finishable; it does not consume allowance.

### Refusals

Preserve screen-compatible `{ kind, reason }` errors. Add the required kinds to `WRITE_REFUSAL_KINDS` so database details survive the edge pipeline.

| Condition | Kind |
|---|---|
| Current confirmation | `finished` |
| Required topics resolved, no answer change | `discovery-ready` |
| Displayed mode differs from available mode | `mode-changed` |
| Daily allowance exhausted; fuel stub unavailable | `daily-limit` |
| Brief base differs | `stale-revision` |
| Concurrent unfinished reply | `turn-in-flight` |
| Invalid request/reference | `invalid-request` |
| Missing section/topic/suggestion | `unknown-section`, `unknown-topic`, `no-suggestion` |
| Upload limit/name collision | `file-limit`, `duplicate-file` |
| Finish during file read | `file-reading` |
| Missing finish acknowledgment | `open-gaps`, `data-ack` |
| Provider or stream failure | `send-failed` |

Retain existing access refusal kinds. Remove `beta-limit`; do not introduce another lifetime limit.

## 3. Usage

Daily allowance remains **organization-wide**, with 10 credits or 30 when vetted. Keep the existing daily high-water grant and UTC reset.

| Operation | Reserve | Successful charge |
|---|---:|---:|
| Automatic opening | 0 | 0 |
| User submission with completed reply | 1 | 1 |
| Failed/incomplete attempt | 1 | 0 |
| Review, edit, ask topic, confirmation | 0 | 0 |
| Upload and entire file read | 0 | 0 |

A failed attempt releases its credit. Retrying it reserves one credit again; successful completion costs one credit total. Do not use today’s `retry` billing category to make a successful user reply free after an already-refunded failure.

Token usage remains provider-cost evidence. It does not determine free credits or reduce the reply’s output budget according to remaining credits.

Retain `discovery_turns` for model attempts. Add a pricing-version discriminator, opening/user kind, command id, and captured context. Replace token-ratio constraints for new attempts with one-credit constraints while preserving historical rows and their recorded prices.

```ts
// src/lib/discovery-stream.ts
export type DiscoveryUsage = {
  dailyLeft: number;
  dailyGrant: number;

  availableMicros: number;
  reservedMicros: number;
  allocationMicros: number;
  settledMicros: number;
  holdMicros: number;

  nextResetAt: string; // Next 00:00 UTC, displayed in local time.
  nextReply: "free" | "paid" | "unavailable";
};
```

For the real server in this item:

```ts
{
  dailyLeft: allowance.remaining,
  dailyGrant: allowance.dailyGrant,
  availableMicros: 0,
  reservedMicros: 0,
  allocationMicros: 0,
  settledMicros: 0,
  holdMicros: 0,
  nextResetAt: nextUtcMidnight,
  nextReply: allowance.remaining > 0 ? "free" : "unavailable",
}
```

Funded projects use available free credits first. No paid reservation is implemented while fuel remains a stub. An exhausted daily grant shows the next reset; vetting does not erase spending.

Existing projects require a migration policy for today’s counter: reconcile it to completed free user replies plus live one-credit holds, preserving historical token-cost evidence. Fresh-stack acceptance runs exercise the new policy directly.

## 4. Files and background reads

### Storage and jobs

Create a private `discovery-files` storage bucket with the existing 50 MiB ceiling. The browser uploads through an edge function, never directly through Storage.

```sql
insert into storage.buckets(id, name, public, file_size_limit)
values ('discovery-files', 'discovery-files', false, 52428800);

create table public.discovery_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  org_id uuid not null,
  upload_command_id uuid not null,
  added_by uuid not null references public.accounts(id),
  file_name text not null,
  media_type text not null,
  byte_size bigint not null check (byte_size > 0),
  object_path text not null unique,

  status text not null check (status in (
    'uploading', 'queued', 'reading', 'ready', 'failed'
  )),
  total_parts integer check (total_parts > 0),
  lease_token uuid,
  lease_until timestamptz,

  digest jsonb,
  failure_reason text,
  ready_entry_id uuid unique references public.discovery_entries(id),
  created_at timestamptz not null default clock_timestamp(),

  foreign key (project_id, org_id)
    references public.projects(id, org_id),
  unique (project_id, upload_command_id),
  unique (project_id, file_name),

  check ((status = 'ready') = (digest is not null)),
  check (status <> 'ready' or ready_entry_id is not null),
  check (status <> 'failed' or failure_reason is not null)
);

create table public.discovery_file_parts (
  file_id uuid not null references public.discovery_files(id),
  part_number integer not null check (part_number >= 0),
  content_hash text not null,
  digest jsonb not null,
  completed_at timestamptz not null default clock_timestamp(),
  primary key (file_id, part_number)
);

create index discovery_files_read_queue
  on public.discovery_files(status, lease_until, created_at)
  where status in ('queued', 'reading');
```

File-part results and ready digests are immutable. RLS follows project membership; part visibility derives through its file. Only definer functions can update job state.

```sql
public.discovery_file_begin(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_command_id uuid, p_name text, p_media_type text, p_byte_size bigint
) returns jsonb

public.discovery_file_uploaded(p_file_id uuid) returns jsonb

public.discovery_file_claim(p_worker_id uuid) returns jsonb

public.discovery_file_save_part(
  p_file_id uuid, p_lease_token uuid, p_part_number integer,
  p_content_hash text, p_digest jsonb
) returns jsonb

public.discovery_file_complete(
  p_file_id uuid, p_lease_token uuid
) returns jsonb

public.discovery_file_fail(
  p_file_id uuid, p_lease_token uuid, p_reason text
) returns jsonb
```

The upload edge performs:

1. Authenticate and validate the multipart request.
2. Reserve the filename and quota slot transactionally.
3. Store bytes at a server-generated path.
4. Mark the file queued and wake its reader.
5. Return a screen-shaped reading file.

The quota counts Discovery-origin rows, including concurrent uploads. Intake metadata remains separate and does not count. Funded projects bypass the three-file limit. Same-operation retries reuse the row and object path; a separate upload with the same name refuses `duplicate-file`.

Because Storage and Postgres do not share a transaction, recovery examines unfinished upload rows. It adopts an existing object or marks an expired upload failed. It never invents a ready digest from metadata.

### Read contract

```ts
// supabase/functions/_shared/discovery-files.ts
type FileFact = {
  id: string;
  text: string;
  topicId: TopicId | null;
  location: string;
};

type FileDigest = {
  summary: string;
  facts: readonly FileFact[];
  openQuestions: readonly string[];
};

type ReadWork = {
  fileId: FileId;
  leaseToken: string;
  objectPath: string;
  mediaType: string;
  completedParts: ReadonlyMap<number, FileDigest>;
};

export async function readDiscoveryFile(work: ReadWork): Promise<void> {
  // TODO: Extract actual document content.
  // TODO: Split on pages, rows, sheets, or bounded text segments.
  // TODO: Skip already committed parts; read every remaining part.
  // TODO: Merge parts by stable fact id/location without a closing model call.
  // TODO: Atomically mark ready and append one file-read entry.
  throw new Error("not implemented");
}
```

Extraction must support the chooser’s advertised PDF, image, delimited text, plain text, Word, and Excel formats. Unsupported or unreadable content becomes `failed`; an extension or filename is never evidence.

A small file uses one extraction/model read. Large files store each completed part and merge them into one digest. No file-chat question, pause, turn reservation, or fuel charge exists.

The final transaction:

- Stores the immutable digest.
- Adds its reference and file facts to the latest brief revision.
- Assigns `{ kind: "file", fileId, fileName }` provenance.
- Leaves topic agreement unchanged.
- Marks the file ready.

`DiscoveryFile.tookFromIt` derives from the digest summary. The existing `FilesInBrief` already renders that text with its file source; no screen extension is needed.

Later reply contexts contain ready digests only. The reply records which newly ready digests it reported, so the next main-chat reply reports each file once without asking about it.

### Progress and recovery

Public status derives from durable work:

```ts
uploading / queued  -> { kind: "reading", percent: 0 }
reading             -> percent from completed parts, capped below 100
ready               -> { kind: "ready", facts: digest.facts.length }
failed              -> { kind: "failed", reason }
```

Use a service-authenticated `discovery-file-read` worker with leases and scheduled recovery. Upload immediately wakes it through `waitUntil`; the schedule retries queued work and expired leases after crashes. Repeated part commits and repeated completion are idempotent.

Polling observes persisted progress. It does not drive or keep the job alive.

## 5. Real port, route, and test seam

### Port

```ts
// src/lib/discovery-port.ts
import type {
  DiscoveryPort,
  Result,
  ServerChange,
} from "@/components/discovery/port";

export async function openDiscovery(scope: {
  organizationId: string;
  projectId: string;
}): Promise<Result<DiscoveryPort>> {
  // TODO: Call discovery-open once; share opening work across repeated mounts.
  // TODO: Return the scoped port, including after a failed opening attempt
  //       when the initialized seed remains readable.
  throw new Error("not implemented");
}

class EdgeDiscoveryPort implements DiscoveryPort {
  readonly chat: DiscoveryPort["chat"];

  load(): ReturnType<DiscoveryPort["load"]> {
    throw new Error("not implemented");
  }
  addFile(file: File): ReturnType<DiscoveryPort["addFile"]> {
    throw new Error("not implemented");
  }
  subscribe(listener: (change: ServerChange) => void): () => void {
    throw new Error("not implemented");
  }
  saveBriefEdit(
    input: Parameters<DiscoveryPort["saveBriefEdit"]>[0],
  ): ReturnType<DiscoveryPort["saveBriefEdit"]> {
    throw new Error("not implemented");
  }
  acceptSuggestion(
    input: Parameters<DiscoveryPort["acceptSuggestion"]>[0],
  ): ReturnType<DiscoveryPort["acceptSuggestion"]> {
    throw new Error("not implemented");
  }
  askTopic(
    input: Parameters<DiscoveryPort["askTopic"]>[0],
  ): ReturnType<DiscoveryPort["askTopic"]> {
    throw new Error("not implemented");
  }
  removeCauseLabel(
    input: Parameters<DiscoveryPort["removeCauseLabel"]>[0],
  ): ReturnType<DiscoveryPort["removeCauseLabel"]> {
    throw new Error("not implemented");
  }
  finish(
    input: Parameters<DiscoveryPort["finish"]>[0],
  ): ReturnType<DiscoveryPort["finish"]> {
    throw new Error("not implemented");
  }
}
```

| Port operation | Edge function |
|---|---|
| Initial opening | `discovery-open` |
| `load`, subscription polling | `discovery-conversation` |
| `chat` | `discovery-message` |
| `addFile` | `discovery-file-upload` |
| Review writes and finish | `discovery-brief`, discriminated action |

Use `DefaultChatTransport<DiscoveryUIMessage>` with current bearer credentials, scoped ids, and `Accept: text/event-stream`. Convert non-stream refusals into `Error(JSON.stringify({ kind, reason }))`.

`subscribe` shares one non-overlapping polling loop among listeners:

- Immediate refresh on subscription and after writes.
- Fast polling while a file reads or a reply is unsettled.
- Slower polling while idle, including allowance reset and changes from another tab.
- Discard responses from an older request generation.
- Stop timers when the last listener leaves.
- On `stale-revision`, fetch and notify the current brief before returning the refusal.

During a local stream, suppress its owned transcript ids from polling. After completion or failure, refresh again after the hook’s send handling finishes. This prevents duplicate messages during streaming and restores a committed reply whose response was lost. Manual edit lines arrive through `ServerChange.transcript`.

### Route

Replace the old chat page in `src/routes/discovery/$organizationId.$projectId.tsx` with:

- Existing sign-in behavior.
- One memoized, scoped real port per signed-in project.
- Existing `DiscoveryScreen` and `DiscoveryReview`.
- A route-level chat/review panel state and return-focus state.
- The same mounted-chat layout used by the fixture shell, without copying screen components.
- Review URL state for reloads.

The route supplies fuel and publication callbacks. A fuel stub view must say continuation is unavailable; it must not claim a successful checkout.

### Required screen changes

Only the usage decision requires changes inside the screen:

| File | Change |
|---|---|
| `src/lib/discovery-stream.ts` | Remove `betaLeft`/`betaGrant`; make the next daily reset unconditional. |
| `src/components/discovery/model.ts` | Remove beta comparison, values, and exhaustion copy; derive the free gauge from daily usage only. |
| `src/components/discovery/UsageCard.tsx` | Remove the Beta value. |
| `src/components/discovery/a11y.ts` | Remove the Beta label and obsolete beta copy. |

Keep `port.ts`, `use-discovery.ts`, file panels, question controls, brief rendering, and confirmation controls unchanged.

Update `design/astra/src/fixture-data.ts` and `fixture-world.ts` to remove beta seeds, decrementing, and refusals. Preserve the paid fixture’s role in loop-tier layout checks.

### Integration screen tests

Keep browser assertion bodies and accessibility locators, except beta assertions. Change the tier registration so both loop and integration call those bodies through `withDiscovery`.

The integration driver must:

1. Seed real accounts, intake, committed entries, brief revisions, confirmations, and file metadata from the existing scenario givens.
2. Start the root app with the one stack’s public coordinates and an app server supporting real route paths.
3. Establish a real authenticated browser session.
4. Open `/discovery/<organizationId>/<projectId>` and the requested review state.
5. Read model-call evidence from stack records, rather than `atFixtureModelCall`.

Seeded opening transcripts establish a baseline, preserving existing assertions that opening those scenarios adds no model call. Separately test an unseeded opening to prove the automatic zero-credit reply.

For file tests, test-support payloads must contain real bytes supporting the asserted facts. Filename-only uploads are insufficient. Count real file-read calls from durable part records; use actual Haiku for integration debugging, without scripted vendor responses.

Extend the backend halves of:

- **AT-004.67:** unchanged credits and fuel across upload/read.
- **AT-004.68:** persisted digest, provenance, and digest-only later context.
- **AT-004.69:** every part represented in one final digest, including restart recovery.

The positive paid-balance assertions remain an unresolved constraint of this candidate. They cannot honestly become integration-green against the stipulated zero-balance fuel stub. Do not mark the expected manifest green until that conflict is resolved and the real run passes.

## Module map

| Path | Responsibility |
|---|---|
| `supabase/migrations/<timestamp>_discovery_record.sql` | Ledger, immutable revisions, confirmations, reducer, review definers, RLS. |
| `supabase/migrations/<timestamp>_discovery_reply_policy.sql` | Attempt metadata, one-credit constraints, reserve/settle, opening idempotency. |
| `supabase/migrations/<timestamp>_discovery_files.sql` | Private bucket, file jobs/parts, leases, completion, recovery scheduling. |
| `supabase/functions/_shared/discovery-brief.ts` | Domain document types, command parsing, screen-state mapping. |
| `supabase/functions/_shared/discovery-turn.ts` | Submission parsing, captured context, model outcome, settlement arguments. |
| `supabase/functions/_shared/discovery-prompt.ts` | Forced `reply` schema and need-only prompt; remove closing elicitation instructions. |
| `supabase/functions/_shared/discovery-metering.ts` | One-credit policy and independent provider-cost evidence. |
| `supabase/functions/_shared/anthropic-messages.ts` | Private SDK adaptation and incremental tool-text decoding. |
| `supabase/functions/_shared/discovery-stream.ts` | Typed committed-part encoding. |
| `supabase/functions/_shared/discovery-files.ts` | Actual-content extraction, partitioning, digest validation and merging. |
| `supabase/functions/_shared/edge.ts` | Existing authentication/RPC shell; stream-id and committed-parts hooks. |
| `supabase/functions/_shared/write-routes.ts` | New write routes and refusal kinds. |
| `supabase/functions/{discovery-open,discovery-brief,discovery-file-upload,discovery-file-read}/index.ts` | Thin authenticated endpoint wiring. |
| `supabase/functions/discovery-conversation/index.ts` | Consistent screen-shaped state read. |
| `src/lib/discovery-port.ts` | HTTP, upload, transport, polling, reconciliation. |
| `src/routes/discovery/$organizationId.$projectId.tsx` | Sign-in and persistent chat/review composition. |
| `tests/at/suites/req-004/_screen.ts` | Tier selection, real route, seeded state, stack call evidence. |
| `tests/at/harness/screen.ts`, `screen-host.mjs` | Reuse browser host; add app-server and authenticated-session support. |
| `tests/at/suites/req-004/_flows.ts` | Real upload payloads and removal of beta checks. |

The normal trace stays short: **screen → real port → edge command**; backend behavior is owned by the domain module and its transactional definer. No mutable current-brief cache, closing generation call, or browser database access is required.