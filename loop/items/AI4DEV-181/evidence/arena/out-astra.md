# Candidate: immutable brief documents with one rules module

## Problem

AI4DEV-181 (Discovery backend wiring) must connect the existing screen to persistent brief, turn, and file state without changing its controllers. The central constraint is transactional: a completed reply, its brief update, its transcript, and its one-credit settlement must become durable together. Concurrent edits and file reads must never overwrite each other.

Use **one JSONB document per revision**, stored append-only. All brief decisions live in `supabase/functions/_shared/discovery-brief.ts`. SQL provides authorization, atomic persistence, revision comparison, and ledger settlement; it does not implement topic or confirmation rules.

## Usage first

The application constructs one port per authenticated project. Components retain their existing interface.

```tsx
const port = createDiscoveryPort({
  organizationId,
  projectId,
  accessToken: currentAccessToken,
});

<DiscoveryScreen
  port={port}
  active={view === "chat"}
  onOpenReview={() => setView("review")}
  onBuyFuel={openFunding}
/>;

// Keep chat mounted while review is displayed, preserving drafts and focus.
```

The existing review controller remains a caller:

```ts
const result = await port.saveBriefEdit({
  sectionId: "priority",
  text: "Fewer unfilled shifts",
  baseRevision: brief.revision,
});
// Success includes the new brief.
// Subscribers receive the saved person line and confirmation: null.
// A stale write publishes the current brief before returning its refusal.
```

The turn handler hides persistence and provider details behind domain operations:

```ts
const turn = await discovery.beginTurn(actor, submission);

const reply = await model.reply(turn.context, {
  onText: stream.text,
});

const committed = await discovery.completeTurn(turn, reply);
stream.committed(committed);
```

`completeTurn` either commits the complete outcome or releases the reservation and returns a refusal. Neither the screen nor the model chooses a revision, source attribution, charge, or confirmation.

## Shape

The current brief is the highest stored revision. Its JSONB document contains sections, ordered topics, questions, suggestions, dependency edges, data tier, fit, and cause labels. Historical confirmation records refer to exact revisions; the current confirmation is derived by joining against the latest revision.

Model output and file digests remain separate proposals until the pure module applies them. File workers own distinct file and part rows. Only publication into the canonical brief requires compare-and-swap, following **separate-before-serializing-shared-state**.

The existing nine-member port is sufficiently deep: callers know user actions, while it hides HTTP envelopes, authentication, polling, stream identity, and stale-write reconciliation. Request and provider parsers establish trusted domain types, following **boundary-discipline**. Discriminated commands and commit outcomes prevent partial turn success, following **encode-lessons-in-structure**.

## Tradeoffs accepted

- We accept a complete document copy per real change in exchange for simple reads, immutable history, and an unambiguous confirmation target.
- We accept a failed turn when a concurrent edit invalidates its context in exchange for never applying an answer generated against obsolete facts.
- We accept service-only commit functions trusting validated TypeScript decisions in exchange for keeping brief rules in one language and module.
- We accept polling latency in exchange for the explicitly chosen edge-only update channel.
- We accept that streamed text is provisional until settlement; durable brief and charge parts appear only after commit.

## Alternatives considered

- **Normalized topic, question, and section tables:** permit narrower updates, but spread revision and confirmation invariants across multiple writes. The public interface stays the same while internal coordination grows.
- **An event log reconstructed on every read:** gives fine-grained history but requires replay rules, projection versioning, and ordering policy. Immutable snapshots already provide the history this screen needs.
- **Automatic rebasing of model replies:** hides conflicts from callers but cannot reliably reconcile already-streamed prose with a changed answer. Retry the user interaction after refreshing; do not make a second model call automatically.

## Open questions and risks

- How should integration prove fixture assertions requiring a `$1.60` paid balance while the real fuel function remains a zero-balance stub? Those requirements cannot all pass unchanged; this candidate does not introduce a test-only balance.
- Can the exact fixture wording and four-fact file assertions hold against real Haiku output? Stable question definitions and deterministic source rendering reduce variability, but live semantic extraction still needs evidence.
- Which file formats and maximum parsing workload must the first reader support? The existing `.xlsx` acceptance upload is a required case, not an optional extension.
- Does the deployment provide a durable scheduled worker invocation? `waitUntil` alone cannot guarantee continuation after an edge process dies.

## Next implementation step

Build the pure brief transitions and append-only commit boundary first, proving no-op edits, stale writes, dependency marking, confirmation invalidation, and concurrent file publication.

*Synthesis decision: reserved for the orchestrator; this is one candidate.*

# Type sketch

## 1. Brief document and rules

Use screen types as type-only imports in the sketch; the server module must have no React or browser runtime dependency.

```ts
// supabase/functions/_shared/discovery-brief.ts

type Revision = number & { readonly __revision: unique symbol };
type TopicId = string & { readonly __topicId: unique symbol };
type QuestionId = string & { readonly __questionId: unique symbol };
type OperationId = string & { readonly __operationId: unique symbol };

type Topic = Omit<BriefTopic, "id">;
type Question = Omit<BriefQuestion, "id" | "topicId"> & {
  topicId: TopicId;
};

type BriefDocument = Readonly<{
  schemaVersion: 1;
  need: BriefSnapshot["need"];
  usersToday: BriefSnapshot["usersToday"];
  successMeasure: BriefSnapshot["successMeasure"];

  topicOrder: readonly TopicId[];
  topics: Readonly<Record<TopicId, Topic>>;
  questions: Readonly<Record<QuestionId, Question>>;

  // Dependent -> prerequisites. Validate references and acyclicity at ingress.
  dependsOn: Readonly<Record<TopicId, readonly TopicId[]>>;

  dataTier: BriefSnapshot["dataTier"];
  fit: BriefSnapshot["fit"];
  causeLabels: readonly string[];

  // Keeps a later repeated model proposal from restoring a removed label.
  removedCauseLabels: readonly string[];
}>;

type BriefVersion = Readonly<{
  revision: Revision;
  document: BriefDocument;
}>;

type BriefCommand =
  | { kind: "edit"; sectionId: string; text: string }
  | { kind: "accept-suggestion"; topicId: TopicId }
  | { kind: "ask-topic"; topicId: TopicId; round: number }
  | { kind: "remove-label"; label: string }
  | { kind: "apply-reply"; reply: ValidatedReply; turn: TurnAttribution }
  | { kind: "apply-file"; file: FileFacts };

type BriefTransition =
  | { kind: "unchanged"; brief: BriefVersion }
  | {
      kind: "changed";
      brief: BriefVersion;
      personLine: DiscoveryUIMessage | null;
      filed: readonly { id: string; title: string }[];
    };

export function evolveBrief(
  current: BriefVersion,
  command: BriefCommand,
  operation: OperationId,
): BriefTransition {
  // TODO: apply by stable identity; compare semantic values before attribution.
  // TODO: mark affected answered dependents without deleting their answers.
  // TODO: allocate current.revision + 1 only if the document really changes.
  throw new Error("not implemented");
}

export function snapshotOf(brief: BriefVersion): BriefSnapshot {
  // TODO: project ordered records into the existing screen arrays.
  throw new Error("not implemented");
}

export function decideFinish(
  brief: BriefVersion,
  input: {
    acks: { reviewed: true; openGaps: boolean; data: boolean };
    filesReading: boolean;
    turnOpen: boolean;
    actor: { id: string; displayName: string };
    at: string;
  },
): Result<Confirmation> {
  throw new Error("not implemented");
}
```

All brief behavior belongs here, including:

| Operation | Rule |
|---|---|
| Edit | Check the supplied base before deciding no-op. Equal content retains source, revision, transcript, and confirmation. A real edit appends a person line and changes attribution. |
| Accept suggestion | Agree the stored suggestion, ensure its question exists, append one person line, mark dependents. Reaccepting the same settled suggestion is a no-op. |
| Ask topic | Reuse an existing question. Otherwise create one from stored topic/question definitions, without a model call. |
| Remove label | Remove only an existing label. Record its removal so later repeated proposals cannot restore it. |
| Apply reply | Upsert by stable IDs. Explicit structured answers take precedence over model paraphrases. Repeated agreed topics do not receive a new source or revision. |
| Dependencies | Preserve the old answer and set `needsReview`. Apply prerequisite changes before deciding whether same-submission dependent answers remain valid. |
| Confirmation | Every real document change makes the prior confirmation historical. No-op changes do not. |
| Finish | Derive accepted gaps from current topics. Require reviewed, gap acknowledgment when applicable, and data acknowledgment for tiers 1 and 2. No model call. |

Topic definitions retain the fixture dependency pairs where applicable: priority → measure, booking → rules, owner → info. The opening reply may establish a project-specific checklist; later replies cannot arbitrarily change its required denominator.

Access patterns are direct: latest revision uses the primary key; answer lookup uses question ID; edits use topic ID; rendering follows `topicOrder`. Dependency traversal operates over the small validated graph. There is no additional mutable index to synchronize.

## 2. SQL storage and commit boundary

Illustrative migration definitions; existing project/account foreign keys should follow the repository’s established naming.

```sql
create table public.brief_revisions (
  project_id uuid not null references public.projects(id),
  revision bigint not null check (revision >= 1),
  document jsonb not null
    check (jsonb_typeof(document) = 'object'),
  operation_id uuid not null,
  created_by uuid references public.accounts(id),
  created_at timestamptz not null default clock_timestamp(),
  primary key (project_id, revision),
  unique (project_id, operation_id)
);

-- Latest:
-- select ... where project_id = $1 order by revision desc limit 1;
-- The primary key supports this backward scan. No current-revision pointer.

create table public.discovery_confirmations (
  project_id uuid not null,
  revision bigint not null,
  actor_id uuid not null references public.accounts(id),
  actor_name text not null,
  confirmed_at timestamptz not null,
  accepted_gaps jsonb not null
    check (jsonb_typeof(accepted_gaps) = 'array'),
  primary key (project_id, revision),
  foreign key (project_id, revision)
    references public.brief_revisions(project_id, revision)
);

-- Also records successful no-ops and finish results.
create table public.discovery_operations (
  project_id uuid not null references public.projects(id),
  operation_id uuid not null,
  actor_id uuid not null references public.accounts(id),
  request_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (project_id, operation_id)
);

-- Free edits and suggestion acceptance are transcript entries, not AI turns.
create table public.discovery_brief_messages (
  project_id uuid not null,
  revision bigint not null,
  message_id text not null,
  message jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (project_id, message_id),
  foreign key (project_id, revision)
    references public.brief_revisions(project_id, revision)
);
```

Add immutability triggers prohibiting update/delete on revisions, confirmations, operations, and brief messages. Confirmation clearing means that the newest revision has no confirmation; no historical row is erased.

For each new table:

- Enable RLS.
- Revoke direct writes from `anon`, `authenticated`, and `service_role`.
- Grant authenticated `SELECT` under the same organization-member/platform-admin visibility used by Discovery turns.
- Resolve organization membership through the project FK; do not store a second mutable organization attribution.
- Give only service-role callers execution rights on write definers. Revoke default `PUBLIC` execution.
- Use `SECURITY DEFINER SET search_path = ''`, qualified names, and the existing account-active, organization-role, and project-ownership checks.
- Keep worker-only claim functions distinct from user commands.

```sql
-- Signature sketch; bodies intentionally omitted.

discovery_brief_read(
  p_account_id uuid, p_project_id uuid
) returns jsonb;

discovery_brief_commit(
  p_account_id uuid,
  p_project_id uuid,
  p_operation_id uuid,
  p_request_hash text,
  p_base_revision bigint,
  p_read_fence jsonb,
  p_document jsonb,       -- null means unchanged
  p_person_line jsonb,    -- null unless a real edit/acceptance
  p_confirmation jsonb   -- null unless confirming
) returns jsonb;

discovery_turn_commit(
  p_account_id uuid,
  p_turn_id uuid,
  p_base_revision bigint,
  p_read_fence jsonb,
  p_document jsonb,
  p_assistant_message jsonb,
  p_provider_usage jsonb,
  p_off_topic boolean
) returns jsonb;

discovery_file_commit(
  p_file_id uuid,
  p_claim_token uuid,
  p_base_revision bigint,
  p_read_fence jsonb,
  p_document jsonb,
  p_digest jsonb
) returns jsonb;
```

**Commit protocol:**

1. Lock in the established organization → project → child-row order.
2. Check an existing operation receipt first. Same key and request returns its result; key reuse with another request is refused.
3. Recheck authorization and compare the supplied revision.
4. Compare the read fence for other state used by the decision: current confirmation, open turn identity, and relevant file generations. Every mutation of those rows uses the same project lock.
5. Insert the next revision only when TypeScript supplied a changed document.
6. Persist companion transcript, confirmation, file outcome, or turn settlement in the same transaction.
7. Record the operation result.

The fence is an opaque representation of persisted facts, not a second brief version. SQL compares it; TypeScript interprets those facts. Thus a simultaneous upload cannot slip between a finish check and confirmation, and confirmation cannot slip between a turn’s validation and commit.

A caller-supplied base mismatch returns `stale-revision`. `askTopic`, which has no public base, reloads and reapplies its idempotent command after a conflict. A file worker similarly reapplies stored facts without rereading the file.

## 3. Turn contract and streaming

```ts
// Existing screen body, unchanged.
type DiscoveryRequestBody = {
  organizationId: string;
  projectId: string;
  message: string; // Composer note; may be empty when answers exist.
  mode: "answer";
  expectedCharge: "free" | "paid";
  answers: DiscoveryAnswer[];
};

type Submission = Readonly<{
  operationId: OperationId;
  userMessageId: string;
  note: string;
  answers: readonly ValidatedAnswer[];
  expectedCharge: "free" | "paid";
}>;

type ReplyProposal = {
  text: string; // First property of forced reply tool.
  agreed: readonly {
    topicId: string;
    answer: string;
    certain: boolean;
  }[];
  questions: readonly QuestionProposal[];
  sections: readonly SectionProposal[];
  dataTier: BriefSnapshot["dataTier"];
  fit: BriefSnapshot["fit"];
  causeLabels: readonly string[];
  offTopic: boolean;
};

type QuestionProposal = {
  topicId: string;
  text: string;
  reason: string;
  options: readonly SuggestedAnswer[];
  suggestedId: string;
  importance: Importance;
  recommendation: string;
  uncertaintyHelp: string;
};

type SectionProposal = {
  sectionId: "need" | "usersToday" | "successMeasure";
  text: string;
};

type ValidatedReply = ReplyProposal & {
  readonly __validatedReply: unique symbol;
};

type CommittedTurn = {
  assistant: DiscoveryUIMessage;
  brief: BriefSnapshot;
  usage: DiscoveryUsage;
  ready: { agreed: number; total: number } | null;
};
```

Validate at the HTTP boundary:

- Empty note is allowed with at least one answer.
- Questions and options must exist in the current brief.
- Reject duplicate answers, invalid option IDs, and inconsistent uncertainty.
- Resolve option text from the stored option rather than trusting the submitted label.
- Ignore client-supplied conversation history as model context. Preserve its last user message ID for transcript identity.
- Attach an operation ID in the port’s transport preparation; no hook change is needed.

The model gets intake, current brief, persisted conversation, current answers, and stored file digests. Replace the closing `record_elicitation` instructions and remove Discovery’s technical-scope prompt instructions. Offer one forced `reply` tool; represent an off-topic redirect within that tool so guardrail accounting remains possible.

```ts
// anthropic-messages.ts: provider representation stays here.
export interface DiscoveryReplyModel {
  reply(
    context: ReplyContext,
    observer: { onText(delta: string): void },
  ): Promise<ProviderReply>;
}

// discovery-turn.ts: domain operation surface.
export interface DiscoverySession {
  beginTurn(actor: Actor, input: Submission): Promise<ReservedTurn>;
  completeTurn(
    turn: ReservedTurn,
    reply: ProviderReply,
  ): Promise<Result<CommittedTurn>>;
  ensureOpening(actor: Actor, project: ProjectId): Promise<void>;
}
```

The adapter reads `input_json_delta` for the selected tool and incrementally decodes its top-level `text` string. It must handle escaped quotes, split Unicode escapes, and arbitrary chunk boundaries. Do not use a regular expression or repeatedly emit partial `JSON.parse` results. Validate the completed tool input separately; property ordering is an optimization, not a correctness assumption.

Emit the existing UI message protocol:

```text
start(messageId = persisted assistant ID)
text-start
text-delta*
text-end

-- Only after the database commit succeeds:
data-filed                  when answers were saved
data-charge                 free, or the eventual real paid receipt
data-question*              questions whose topics remain unresolved
data-ready                  when required topics are settled
data-brief   transient:true
data-usage   transient:true
finish
[DONE]
```

Persist the assistant’s text and nontransient parts. Stable server IDs make reload and polling consistent.

On malformed tool input, provider failure, stale context, or truncated generation: emit a JSON-shaped refusal through the stream error and release the reservation. Do not settle partial text as a completed reply. The existing hook restores its pre-send transcript and retains drafts.

On browser disconnect, the admitted server operation may finish independently. A completed operation remains discoverable through `load`; retrying its operation ID never charges twice. An expired worker that never committed releases its hold, and a late commit is rejected.

**Automatic opening:** first chat entry invokes an idempotent opening operation through the port. A unique project opening key prevents two tabs from generating two greetings. It uses the same forced tool and commit path with zero reserved/charged credits. Subsequent loads and entry to review do not generate another reply. The opening asks for files when fewer than three Discovery files exist.

Refusal kinds include:

```ts
type DiscoveryFailureKind =
  | "invalid-request" | "stale-revision" | "mode-changed"
  | "finished" | "discovery-ready" | "daily-limit"
  | "turn-in-flight" | "send-failed"
  | "unknown-section" | "unknown-topic" | "no-suggestion"
  | "file-limit" | "duplicate-file" | "file-reading"
  | "open-gaps" | "data-ack"
  | "email-unverified" | "discovery-disabled"
  | "not-a-member" | "not-an-admin" | "account-deactivated";
```

Register these in `write-routes.ts`; otherwise its parser collapses new kinds to `refused`. Map quota exhaustion to `daily-limit`, never `beta-limit`. A changed available charge mode returns `mode-changed` before reservation.

## 4. Usage

```ts
// src/lib/discovery-stream.ts
type DiscoveryUsage = {
  dailyLeft: number;
  dailyGrant: number;
  availableMicros: number;
  reservedMicros: number;
  allocationMicros: number;
  settledMicros: number;
  holdMicros: number;
  nextResetAt: string | null;
  nextReply: "free" | "paid" | "unavailable";
};
```

Keep the existing organization-scoped UTC allowance and its 10/30 grant tiers. Do not silently introduce a separate per-project grant.

- Reserve exactly one credit for a normal free turn.
- Settle exactly one credit only for a completed reply.
- Release the credit for failed or abandoned incomplete operations.
- Opening, file ingestion, edits, and finish consume zero credits.
- Check free availability before considering funding.
- Fuel remains the existing stub: money fields are zero and exhausted free allowance yields `unavailable`.
- `nextResetAt` identifies the next UTC midnight; there is no lifetime exhaustion case.
- Token usage remains provider-cost telemetry, not credit arithmetic.

Replace the token-ratio reservation and settlement constraints in `discovery_turns`, along with the abandoned-charge and retry assumptions. Update the immutability trigger for the new persisted UI message and request identity fields. Preserve historical rows under their recorded billing version rather than making old token-priced rows violate new constraints.

## 5. Files and durable reading

```sql
insert into storage.buckets (id, name, public)
values ('discovery-files', 'discovery-files', false);

create table public.discovery_files (
  id uuid primary key,
  project_id uuid not null references public.projects(id),
  operation_id uuid not null,
  name text not null,
  media_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  object_key text not null unique,
  state text not null
    check (state in ('uploading', 'reading', 'ready', 'failed')),
  generation bigint not null default 1,
  total_parts integer check (total_parts > 0),
  digest jsonb,
  failure_reason text,
  claim_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (project_id, operation_id),
  unique (project_id, name),
  check (state <> 'ready' or digest is not null)
);

create table public.discovery_file_parts (
  file_id uuid not null references public.discovery_files(id),
  part_number integer not null check (part_number >= 0),
  content_hash text not null,
  digest jsonb not null,
  completed_at timestamptz not null default clock_timestamp(),
  primary key (file_id, part_number)
);

create index discovery_files_pending
  on public.discovery_files (state, lease_until)
  where state in ('uploading', 'reading');
```

Apply the same tenant read posture and service-only write definers. The private bucket has no browser object-access policies. Uploads and downloads, if later exposed, pass through authenticated edge functions.

```ts
// discovery-files.ts
type FileFacts = Readonly<{
  fileId: string;
  fileName: string;
  summary: string;
  facts: readonly {
    id: string;            // Stable within the stored digest.
    title: string;
    text: string;
    targetTopicId: string | null;
  }[];
}>;

export async function uploadDiscoveryFile(
  actor: Actor,
  project: ProjectId,
  operation: OperationId,
  file: IncomingFile,
): Promise<Result<DiscoveryFile>> {
  throw new Error("not implemented");
}

export async function readNextFilePart(
  claim: FileClaim,
): Promise<void> {
  // TODO: parse bounded part, persist digest, continue automatically.
  throw new Error("not implemented");
}
```

Upload proceeds as follows:

1. Authenticate and validate bytes, size, and supported format.
2. Under the project lock, reserve a file row after checking confirmation, duplicate name, and the three-file limit. Intake references are excluded.
3. Store bytes at a server-generated object key.
4. Mark the row `reading` and immediately dispatch its reader.
5. Return the screen’s `DiscoveryFile`; the port immediately publishes refreshed files.

Incomplete uploads reserve a slot until recovery marks them failed or completes them. A repeated operation adopts its existing row and object; it does not create another file.

Each file is a durable job. A scheduled service-authenticated dispatcher reclaims expired leases, while immediate dispatch handles normal latency. Closing the page never stops reading. Large files become bounded sheet/page/text parts, each with a stored digest; retries reuse completed parts. The final digest is assembled from stored parts.

File facts are automatically applied through `evolveBrief` with `{ kind: "file", fileId, fileName }` attribution. They never require acceptance and never silently overwrite a human answer. Facts that cannot safely populate an existing open topic become stable, nonrequired file-fact topics, so the existing brief renderer displays their sources without changing the required-topic denominator.

The final transaction publishes the brief change and marks the file ready together. A CAS conflict reapplies the stored facts to the latest document, with no new extraction call. Later model context uses digest text, never the original file.

Progress is derived from completed parts, kept below 100 until publication. Polling returns the existing `reading`, `ready`, or `failed` union and `tookFromIt` summary.

## 6. Real port, route, and tests

```ts
// src/lib/discovery-port.ts
export function createDiscoveryPort(input: {
  organizationId: string;
  projectId: string;
  accessToken(): Promise<string>;
}): DiscoveryPort {
  // TODO: construct DefaultChatTransport and edge-only operations.
  // TODO: share one polling loop across both mounted controllers.
  throw new Error("not implemented");
}
```

| Port member | Edge endpoint |
|---|---|
| `load` | `discovery-conversation`, returning `Result<DiscoveryState>` |
| `chat` | `discovery-message` through `DefaultChatTransport` |
| `addFile` | `discovery-file`, multipart upload |
| Review writes | `discovery-brief`, discriminated action |
| `finish` | `discovery-brief`, action `finish` |
| `subscribe` | Poll `discovery-conversation` |

The port runs one nonoverlapping polling loop while subscribers exist: faster during file reads, slower while idle, immediate refresh after writes and on focus. Abort on disposal and discard responses started before a newer write or read.

Publish `confirmation: null` explicitly when reopening. Publish file additions before `addFile` resolves because the hook ignores its returned file. On stale review writes, publish current state before resolving the refusal.

Track active chat message IDs within the port and suppress their transcript entries from polling until the stream completes. Other persisted person lines still reach subscribers. Do not publish an older poll’s usage after a newer stream settlement.

The route retains existing authentication, memoizes the port, and composes the real `DiscoveryScreen` and `DiscoveryReview`. Chat remains mounted while review is visible. No screen implementation is copied from Astra.

**Screen changes permitted by the usage decision:**

| File | Required change |
|---|---|
| `src/lib/discovery-stream.ts` | Remove `betaLeft` and `betaGrant`; update reset documentation. |
| `src/components/discovery/model.ts` | Remove beta selection, percentages, labels, values, and exhaustion copy. Use daily allowance alone. |
| `src/components/discovery/a11y.ts` | Remove the Beta usage label and adjust applicable usage copy. |
| `src/components/discovery/UsageCard.tsx` | Remove the Beta value row. |

`port.ts`, `use-discovery.ts`, `DiscoveryScreen.tsx`, and the review, file, question, and composer components remain unchanged.

Update fixture usage data and charging to match the new daily-only contract. Remove beta assertions from section J and its flow helpers; retain unrelated screen assertions.

For integration:

- Replace section J’s pending integration registrations with the same shared scenario bodies used by loop.
- Extend `_screen.ts` to seed real projects, brief revisions, transcript, allowance, confirmations, and file state through the existing operator adapter.
- Start the real application server and open `/discovery/<organizationId>/<projectId>`, with a seeded authenticated session.
- Keep Astra as the loop-tier target.
- Count actual provider dispatches recorded by the backend, not browser fixture callbacks or settlement rows. Count each file-part model invocation honestly.
- Seed an existing opening reply for fixture scenarios that assert no opening model call; separately test an uninitialized project for automatic, free, single-opening behavior.
- Add backend assertions for automatic ingestion, stored digests, restart recovery, and unchanged allowance.
- Preserve the paid-stub conflict as an explicit unresolved acceptance constraint; do not claim section J is fully green through a browser-side replacement.

## Module map

| Path | Responsibility |
|---|---|
| `supabase/functions/_shared/discovery-brief.ts` | Brief document, validation, transitions, finish decision, screen projection. |
| `supabase/functions/_shared/discovery-turn.ts` | Reserve, opening, persisted context, atomic reply completion. |
| `supabase/functions/_shared/discovery-prompt.ts` | Forced reply schema and brief-aware prompt. |
| `supabase/functions/_shared/anthropic-messages.ts` | Provider parsing and incremental tool-text decoding. |
| `supabase/functions/_shared/discovery-stream.ts` | Existing UI stream protocol with committed domain parts. |
| `supabase/functions/_shared/discovery-metering.ts` | One-credit policy and usage projection. |
| `supabase/functions/_shared/discovery-files.ts` | Upload lifecycle, file claims, part digests, automatic publication. |
| `supabase/functions/_shared/edge.ts` | Authenticated I/O and RPC wiring. |
| `supabase/functions/_shared/write-routes.ts` | New routes and refusal registration. |
| `supabase/functions/discovery-brief/index.ts` | Thin review-command endpoint. |
| `supabase/functions/discovery-file/index.ts` | Thin upload endpoint. |
| `supabase/functions/discovery-file-worker/index.ts` | Service-authenticated durable job invocation. |
| `supabase/functions/discovery-conversation/index.ts` | Consistent screen-state read. |
| `supabase/migrations/<timestamp>_discovery_brief.sql` | Revisions, confirmations, receipts, messages, commit functions. |
| `supabase/migrations/<timestamp>_discovery_turn_contract.sql` | Turn identity, atomic settlement, billing constraints. |
| `supabase/migrations/<timestamp>_discovery_files.sql` | Private bucket, files, parts, claims, recovery scheduling. |
| `src/lib/discovery-port.ts` | Edge transport, polling, response validation, stream coordination. |
| `src/routes/discovery/$organizationId.$projectId.tsx` | Authentication and real screen composition. |
| `tests/at/suites/req-004/_screen.ts`, `_live.ts` | Real route launch and operator-seeded worlds. |

The principal traces remain short: **port → edge operation → pure rules/commit**, and **file worker → stored digest → pure rules/commit**. No generic repository layer or separate revision service is needed.