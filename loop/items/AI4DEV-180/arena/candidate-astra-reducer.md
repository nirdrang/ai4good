# Candidate: one Discovery model and one reducer

Design for **AI4DEV-180 (Discovery screen on fixtures)**. This package proposes the build. It makes no repository changes.

## Problem

Revision 12 replaces scope generation with a live need brief, file conversations, and free review. The production components must work first with fixtures, then with edge functions. One pure `DiscoveryModel` owns the screen state. One reducer changes that model. Components render selectors and submit typed intentions.

The existing system imposes four constraints:

- `useChat` handles streaming through an SDK `ChatTransport`.
- The existing stream lacks brief revisions, file conversations, and read progress. The backend currently emits text and `data-turn`.
- The acceptance registry tracks resources and rejects bodies that observe none. Browser tests must join that accounting.
- Integration results must describe the real route. Fixture results cannot become integration evidence.

The brief and contract take precedence over incomplete canvas behavior. For example, accepted suggestions remain editable, and an empty summary does not prevent acknowledged completion.

## Usage (caller’s view)

The screen caller supplies one source and two navigation callbacks. It does not coordinate uploads, revisions, read timers, funding, or confirmation.

### Fixture shell

```tsx
// design/astra/src/App.tsx
import { DiscoveryScreen } from "../../../src/components/discovery/DiscoveryScreen";
import { createFixtureDiscoverySource } from "./fixture-transport";

function DiscoveryExample() {
  const [source] = useState(() => createFixtureDiscoverySource());

  return (
    <DiscoveryScreen
      source={source}
      onBuyFuel={() => navigate("funding")}
      onFindVolunteer={() => navigate("publish")}
    />
  );
}
```

The source uses the existing scripted transport. Its other methods supply fixture snapshots and action results. Screen components contain no fixture branches.

### A component inside Discovery

```tsx
// src/components/discovery/QuestionsCard.tsx
function QuestionsCard() {
  const { questions, act } = useDiscovery();

  return (
    <Card aria-label="Questions">
      {questions.rows.map((row) => (
        <QuestionRow
          key={row.id}
          question={row}
          onAnswer={() => act({ type: "question.focus", id: row.id })}
          onView={() => act({ type: "answer.show", id: row.id })}
        />
      ))}
    </Card>
  );
}
```

`question.focus` restores the correct round, opens its answer control, and requests focus. The component does not find transcript entries itself.

### The later real route

```tsx
// Phase 3: src/routes/discovery/$organizationId.$projectId.tsx
function DiscoveryRoute() {
  const source = useEdgeDiscoverySource({ organizationId, projectId });

  return (
    <DiscoveryScreen
      source={source}
      onBuyFuel={openProjectCheckout}
      onFindVolunteer={openPublicationReview}
    />
  );
}
```

Phase 3 supplies authenticated edge-function operations and the real chat transport. The component tree, reducer, selectors, and screen assertions stay the same.

## Shape

### The central decision

**The reducer owns every visible decision.** It owns drafts, question selections, panels, review acknowledgments, command status, and the domain projection of chat messages.

`useChat` retains its required streaming machinery. Its messages and status enter the reducer as events. Components never combine SDK state with domain state during rendering.

This distinction avoids two screen owners:

- The SDK owns its internal stream buffer.
- `DiscoveryModel` owns the projection that the screen displays.
- Hydration seeds the SDK once per conversation identity.
- Ordinary reducer updates never write messages back into the SDK.

This follows `boundary-discipline` and `encode-lessons-in-structure`.

### State ownership

| State | Location | Writer |
|---|---|---|
| Brief sections, sources, importance, questions, revisions | `model.brief` | Reducer, from accepted source results |
| Main and file transcripts | `model.conversations` | Reducer, from parsed SDK observations and source snapshots |
| Answer selections and unsent text | `model.workspace.drafts` | Reducer, from user intentions |
| Open brief edit | `model.workspace.edit` | Reducer; AI updates never replace its text |
| File metadata, digest, read state | `model.files` | Reducer, from source events |
| Selected file before its first answer | `model.workspace.attachment` | Reducer; binary bytes remain in the upload adapter |
| Usage and settlement receipts | `model.usage`, conversation receipts | Reducer, from authoritative source results |
| Review acknowledgments | `model.workspace.review` | Reducer, scoped to a brief revision |
| Confirmed revision and accepted gaps | `model.confirmation` | Reducer, from successful confirmation |
| Navigation and focus request | `model.workspace` | Reducer |
| Pending commands and recoverable failures | `model.operations` | Reducer |
| Element references, sockets, timers, abort handles | Runtime adapter | Runtime; these are resources, not screen state |

The fixture source persists its authoritative sample records. The runtime persists recoverable workspace drafts through the source’s checkpoint operation.

An acknowledgment does not survive a new revision. A completed confirmation survives reload.

### Core type sketch

The sketches show boundaries and invariants. They are not a complete implementation.

```ts
// src/lib/discovery-screen/model.ts
type Id<K extends string> = string & { readonly __kind: K };
type Revision = number & { readonly __kind: "Revision" };
type Micros = number & { readonly __kind: "Micros" };
type Sequence = number & { readonly __kind: "Sequence" };

type TopicId = Id<"Topic">;
type QuestionId = Id<"Question">;
type SectionId = Id<"Section">;
type MessageId = Id<"Message">;
type TurnId = Id<"Turn">;
type FileId = Id<"File">;
type ReadId = Id<"Read">;
type SuggestionId = Id<"Suggestion">;
type OperationId = Id<"Operation">;
type ActorId = Id<"Actor">;
type UploadId = Id<"Upload">;
type OptionId = Id<"Option">;

type Importance = "needed" | "suggested" | "later";
type ConversationId = "main" | `file:${string}`;

type Source =
  | { kind: "intake"; label: string }
  | { kind: "turn"; turnId: TurnId; messageId: MessageId }
  | { kind: "manual"; actorId: ActorId; revision: Revision }
  | {
      kind: "accepted-suggestion";
      suggestionId: SuggestionId;
      fileId: FileId | null;
      actorId: ActorId;
      revision: Revision;
    };

type Answer =
  | { kind: "agreed"; text: string; sources: readonly Source[] }
  | { kind: "uncertain"; text: string; source: Source }
  | {
      kind: "needs-review";
      previous: { text: string; sources: readonly Source[] };
      causedBy: QuestionId;
    }
  | { kind: "unanswered" };

type Option = {
  id: OptionId;
  label: string;
  answer: string;
};

type Question = {
  id: QuestionId;
  topicId: TopicId;
  sectionId: SectionId;
  text: string;
  reason: string;
  importance: Importance;
  options: {
    suggested: Option;             // Exactly one suggested option.
    others: readonly Option[];
  };
  recommendation: string;
  uncertaintyHelp: string;
  prerequisites: readonly QuestionId[];
  introducedAt: MessageId | null; // Null means planned, not yet asked.
  answer: Answer;
};

type Topic = {
  id: TopicId;
  title: string;
  required: boolean;
  questionIds: readonly QuestionId[];
};

type BriefSection = {
  id: SectionId;
  title: string;
  questionIds: readonly QuestionId[];
  content: string;
  sources: readonly Source[];
};

type FileSuggestion = {
  id: SuggestionId;
  fileId: FileId;
  factId: string;
  sectionId: SectionId;
  text: string;
  importance: Importance;
  reason: string;
};

type NeedAssessment = {
  sensitivity:
    | { kind: "unassigned" }
    | { kind: "assigned"; tier: 0 | 1 | 2; explanation: string };
  fit:
    | { kind: "unassessed" }
    | { kind: "fits"; explanation: string }
    | { kind: "declined"; explanation: string; oversightText: string };
  causes: readonly string[];      // Boundary validates zero to three.
};

type BriefRevision = {
  revision: Revision;
  sections: readonly BriefSection[];
  topics: readonly Topic[];
  questions: Readonly<Record<QuestionId, Question>>;
  questionOrder: readonly QuestionId[];
  suggestions: Readonly<Record<SuggestionId, FileSuggestion>>;
  assessment: NeedAssessment;
};

type Digest = {
  summary: string;
  facts: readonly { id: string; text: string }[];
  questions: readonly string[];
};

type FileQuestion = {
  id: QuestionId;
  text: string;
  options: readonly Option[];
};

type ReadState =
  | { kind: "reading"; readId: ReadId; sequence: Sequence; percent: number }
  | {
      kind: "waiting";
      readId: ReadId;
      sequence: Sequence;
      percent: number;
      question: FileQuestion;
    }
  | { kind: "ready"; readId: ReadId; sequence: Sequence; digest: Digest }
  | {
      kind: "failed";
      readId: ReadId;
      sequence: Sequence;
      message: string;
      retryable: boolean;
    };

type DiscoveryFile =
  | {
      origin: "intake";
      id: FileId;
      name: string;
      size: number;
      digest: Digest | null;
    }
  | {
      origin: "discovery";
      id: FileId;
      name: string;
      size: number;
      conversationId: ConversationId;
      read: ReadState;
    };

type Usage = {
  sequence: Sequence;
  daily: { remaining: number; grant: number };
  beta: { remaining: number; grant: number };
  fuel: {
    allocation: Micros;
    available: Micros;
    reserved: Micros;
    settled: Micros;
  };
  next:
    | { kind: "free"; quoteId: string }
    | { kind: "paid"; quoteId: string; hold: Micros }
    | { kind: "unavailable"; reason: string };
  nextResetAt: string | null;
};

type Receipt =
  | { kind: "free" }
  | { kind: "paid"; usage: Micros; fee: Micros }
  | { kind: "pending"; reserved: Micros };

type Message = {
  id: MessageId;
  role: "ngo" | "ai";
  text: string;
  questionIds: readonly QuestionId[];
  filedSectionIds: readonly SectionId[];
  receipt: Receipt | null;
};

type Conversation = {
  order: readonly MessageId[];
  messages: Readonly<Record<MessageId, Message>>;
  stream:
    | { kind: "idle" }
    | { kind: "receiving"; operationId: OperationId }
    | { kind: "failed"; operationId: OperationId; message: string };
};

type AnswerDraft =
  | { kind: "option"; optionId: OptionId }
  | { kind: "custom"; text: string }
  | { kind: "uncertain" };

type ConversationDraft = {
  note: string;
  answers: Readonly<Partial<Record<QuestionId, AnswerDraft>>>;
};

type BriefEdit =
  | { kind: "closed" }
  | {
      kind: "open";
      sectionId: SectionId;
      baseRevision: Revision;
      text: string;
      conflict: string | null;
    };

type ReviewState = {
  revision: Revision;
  reviewed: boolean;
  acceptsGaps: boolean;
  acceptsDataResponsibility: boolean;
};

type AcceptedGap = {
  questionId: QuestionId;
  text: string;
  importance: Importance;
  reason: string;
};

type Confirmation = {
  operationId: OperationId;
  revision: Revision;
  actorId: ActorId;
  at: string;
  acceptedGaps: readonly AcceptedGap[];
};

type Attachment =
  | { kind: "none" }
  | { kind: "choosing" }
  | { kind: "preparing"; operationId: OperationId; name: string }
  | {
      kind: "staged";
      uploadId: UploadId;
      name: string;
      size: number;
      question: FileQuestion;
      draft: string;
    };

type DiscoveryModel = {
  project: {
    id: string;
    organizationId: string;
    title: string;
    funded: boolean;
  };
  brief: BriefRevision;
  confirmedBrief: BriefRevision | null;
  confirmation: Confirmation | null;
  conversations: Readonly<Record<ConversationId, Conversation>>;
  files: Readonly<Record<FileId, DiscoveryFile>>;
  fileOrder: readonly FileId[];
  usage: Usage;
  workspace: {
    page: "chat" | "review" | "finished";
    panel: "none" | "brief" | "chooser" | ConversationId;
    drafts: Readonly<Record<ConversationId, ConversationDraft>>;
    edit: BriefEdit;
    attachment: Attachment;
    review: ReviewState;
    questionMode: "together" | "one-at-a-time";
    focusedQuestion: QuestionId | null;
    highlightedAnswer: MessageId | null;
    focusRequest: { id: string; target: string } | null;
    notice: string | null;
  };
  operations: Readonly<Record<OperationId, Operation>>;
};
```

Sources carry identifiers, not copied transcript fragments. The brief stores its own agreed wording because manual edits can differ from transcript wording.

File suggestions live outside agreed section content. Accepting one moves its content into a new brief revision with an acceptance source.

The model contains no technical-scope fields. It cannot accidentally render a stack, complexity tier, build split, or cost.

### Derived views and access patterns

Selectors derive display state. They do not create another mutable store.

| Access pattern | Data path |
|---|---|
| Questions card | Walk `questionOrder`; read question, prerequisites, and current draft |
| View an answer | Follow its source directly to `messageId` |
| Topic coverage | Walk required topics; check each topic’s applicable questions |
| Dependent answer invalidation | Walk the small question graph from the changed question |
| Brief status | Read the section’s questions; derive agreed, uncertain, open, or needs review |
| Review gaps | Walk unresolved questions; group by importance |
| File row | Read the file union; derive progress, waiting question, or digest fact count |
| File chat | Use `conversationId`; no search by filename |
| Funding bar | Derive both segments from one `Usage` |
| Finish availability | Read current revision, acknowledgments, edit state, and unsettled mutations |

The six fixture topics remain stable. A training follow-up belongs to booking rules. It does not increase the denominator.

The Questions card derives these states in this order:

1. A valid unsent answer displays **Ready to send**.
2. An agreed answer displays **Answered**.
3. An uncertain answer displays **Not sure**.
4. A planned or blocked question displays **Coming next**.
5. An available unresolved question displays **Open**.

A dependent answer needing review displays **Open**, with an explanation. It never remains counted as agreed.

```ts
// src/lib/discovery-screen/selectors.ts
export function selectQuestions(model: DiscoveryModel): QuestionsView {
  throw new Error("not implemented");
}

export function selectBrief(model: DiscoveryModel): BriefView {
  throw new Error("not implemented");
}

export function selectReview(model: DiscoveryModel): ReviewView {
  throw new Error("not implemented");
}

export function selectUsage(model: DiscoveryModel): UsageView {
  throw new Error("not implemented");
}

export function selectConversation(
  model: DiscoveryModel,
  id: ConversationId,
): ConversationView {
  throw new Error("not implemented");
}

export function selectFiles(model: DiscoveryModel): FilesView {
  throw new Error("not implemented");
}
```

Small ordered collections are deliberate. No speculative index or cache is needed for six topics and a few files.

### Events and operations

User intentions and external observations become typed events. The reducer contains all transition policy.

The runtime generates IDs and timestamps. The reducer never calls a clock, network, storage, or random generator.

```ts
// src/lib/discovery-screen/reducer.ts
type Intent =
  | { type: "draft.note"; conversationId: ConversationId; text: string }
  | { type: "draft.answer"; questionId: QuestionId; answer: AnswerDraft }
  | { type: "question.focus"; id: QuestionId }
  | { type: "answer.show"; id: QuestionId }
  | { type: "questions.mode"; mode: "together" | "one-at-a-time" }
  | { type: "panel.open"; panel: DiscoveryModel["workspace"]["panel"] }
  | { type: "panel.close" }
  | { type: "review.open" }
  | { type: "chat.return" }
  | { type: "edit.open"; sectionId: SectionId }
  | { type: "edit.change"; text: string }
  | { type: "edit.cancel" }
  | { type: "review.acknowledge"; field: AckField; checked: boolean }
  | { type: "send"; conversationId: ConversationId }
  | { type: "reply.stop"; conversationId: ConversationId }
  | { type: "edit.save" }
  | { type: "suggestion.accept"; id: SuggestionId }
  | { type: "cause.remove"; label: string }
  | { type: "file.choose"; uploadId: UploadId; name: string; size: number }
  | { type: "file.cancel" }
  | { type: "file.answer"; text: string; fileId: FileId | null }
  | { type: "finish" }
  | { type: "operation.retry"; operationId: OperationId };

type AckField = "reviewed" | "acceptsGaps" | "acceptsDataResponsibility";

type Command =
  | {
      kind: "send";
      conversationId: ConversationId;
      draft: ConversationDraft;
      fundingQuoteId: string;
    }
  | { kind: "save-edit"; sectionId: SectionId; text: string; base: Revision }
  | { kind: "accept-suggestion"; id: SuggestionId; base: Revision }
  | { kind: "remove-cause"; label: string; base: Revision }
  | { kind: "stage-file"; uploadId: UploadId; name: string; size: number }
  | { kind: "discard-file"; uploadId: UploadId }
  | {
      kind: "answer-file";
      target: { fileId: FileId } | { uploadId: UploadId };
      text: string;
      fundingQuoteId: string;
    }
  | { kind: "finish"; revision: Revision; acknowledgments: ReviewState }
  | { kind: "stop"; conversationId: ConversationId };

type Operation = {
  id: OperationId;
  command: Command;
  state: "requested" | "running" | "reconciling" | "failed";
  error: string | null;
};

type SourceEvent =
  | { type: "brief.received"; brief: BriefRevision }
  | {
      type: "file.received";
      file: DiscoveryFile;
      announcement: FileSuggestion[] | null;
    }
  | { type: "usage.received"; usage: Usage }
  | {
      type: "reply.committed";
      operationId: OperationId;
      brief: BriefRevision | null;
      usage: Usage;
      receipt: Receipt;
    }
  | {
      type: "attachment.staged";
      operationId: OperationId;
      attachment: Extract<Attachment, { kind: "staged" }>;
    }
  | {
      type: "confirmation.received";
      confirmation: Confirmation;
      brief: BriefRevision;
    }
  | { type: "operation.completed"; operationId: OperationId }
  | {
      type: "operation.failed";
      operationId: OperationId;
      message: string;
      authoritativeBrief: BriefRevision | null;
    };

type DiscoveryEvent =
  | { type: "user"; intent: Intent; operationId: OperationId }
  | {
      type: "conversation.observed";
      conversationId: ConversationId;
      sequence: Sequence;
      conversation: Conversation;
    }
  | { type: "source"; event: SourceEvent }
  | { type: "operation.started"; operationId: OperationId }
  | { type: "focus.applied"; requestId: string }
  | { type: "highlight.expired"; messageId: MessageId };

export function reduceDiscovery(
  model: DiscoveryModel,
  event: DiscoveryEvent,
): DiscoveryModel {
  // TODO: Exhaustive switch; no default that silently ignores a new event.
  // TODO: Queue commands from valid intentions.
  // TODO: Apply source snapshots only when their owner sequence advances.
  // TODO: Preserve drafts; clear only submitted drafts after accepted completion.
  // TODO: Invalidate review and approval when the brief revision changes.
  throw new Error("not implemented");
}
```

The runtime executes requested operations. It reports results through events. It never edits the model directly.

Finish on the chat page remains enabled. If a reply or edit is active, it explains how to stop, save, or cancel. Final confirmation remains unavailable while an edit is open.

### Concurrent actors and idempotence

One reducer does not make asynchronous results arrive in order. The design treats ordering as part of each domain.

- Each conversation has its own stream sequence.
- Each file read has a `readId` and sequence.
- Usage has one authoritative sequence across main and file replies.
- The brief has one authoritative revision order.
- User drafts remain separate from authoritative answers.

An older file event cannot replace a newer read state. An older usage event cannot restore spent replies. An older brief snapshot cannot overwrite a saved edit.

Brief updates are complete revision snapshots. This avoids applying partial patches against the wrong base. Small briefs justify the extra bytes.

Manual mutations carry `baseRevision`. If an AI reply wins first, the source rejects the stale edit and returns the current revision. The draft survives.

The runtime allows one chargeable reply at a time across main and file conversations. This matches the existing project turn reservation. Background reads continue independently.

Every external mutation carries `operationId`. A retry reuses it:

- Repeated save returns the same revision.
- Repeated suggestion acceptance returns the same accepted fact.
- Repeated first file answer does not add another file.
- Repeated confirmation returns the same confirmation and does not repeat fund transfer.
- Lost responses trigger reconciliation before a retry starts new work.

The backend must enforce these guarantees in phase 3. The reducer only prevents duplicate local application.

This follows `separate-before-serializing-shared-state` and `make-operations-idempotent`.

### Source and runtime boundary

The public screen API exposes domain concepts. SDK and HTTP types remain inside the integration adapter.

```ts
// src/lib/discovery-screen/source.ts
type Snapshot = {
  model: DiscoveryModel;
  pendingOperations: readonly OperationId[];
};

type ActionResult = {
  events: readonly SourceEvent[];
};

export type DiscoverySource = {
  load(signal: AbortSignal): Promise<Snapshot>;
  execute(
    operation: Operation,
    signal: AbortSignal,
  ): Promise<ActionResult>;
  observe(
    receive: (event: SourceEvent) => void,
    signal: AbortSignal,
  ): () => void;
  checkpoint(model: DiscoveryModel): Promise<void>;
  // The SDK connection is private to source construction and the runtime.
};

export function parseSnapshot(value: unknown): Snapshot {
  throw new Error("not implemented");
}

export function parseSourceEvent(value: unknown): SourceEvent {
  throw new Error("not implemented");
}
```

The source factory and runtime share a private SDK attachment. It is not re-exported from the component API.

```ts
// src/lib/discovery-screen/sdk.ts
// Integration-only construction boundary.
type SdkAttachment = {
  main: ChatTransport<DiscoveryUIMessage>;
  forFile(id: ConversationId): ChatTransport<DiscoveryUIMessage>;
};

export function attachDiscoveryChat(
  source: DiscoverySource,
  sdk: SdkAttachment,
): DiscoverySource {
  throw new Error("not implemented");
}

export function parseDiscoveryPart(value: unknown): SourceEvent | null {
  // TODO: Validate wire data and references before producing domain events.
  throw new Error("not implemented");
}
```

`attachDiscoveryChat` establishes the SDK connection once. It does not expose a second event bus to components.

`useDiscoveryRuntime` owns `useChat`, the reducer, source subscriptions, command execution, and checkpoints. It returns selectors plus `act`.

The call paths stay short:

- Render policy: component → selector → model.
- User action: component → runtime → reducer.
- External operation: runtime → source.
- Stream input: runtime’s SDK boundary → reducer.

The main chat hook remains mounted during file work. File chat sessions remain mounted while their replies settle. Closing a panel does not stop a read.

### Stream contract additions

Extend `src/lib/discovery-stream.ts`. Preserve the current part names and the shared `DiscoveryUIMessage`.

| Part | Revision 12 payload |
|---|---|
| `data-question` | Existing fields plus topic, section, importance, prerequisites, suggested option ID, and originating message |
| `data-brief-update` | Turn ID and a complete brief revision, including questions, options, answers, sources, and pending suggestions |
| `data-file-chat` | File or staged-upload identity, conversation identity, and the next file question |
| `data-file-read` | File identity, read identity, sequence, and reading/waiting/ready/failed state |
| `data-file-suggestion` | Digest fact identity, proposed section, text, importance, and reason |
| `data-usage` | Existing counters plus sequence, allocation, settled usage, next reset, and funding quote |
| `data-charge` | Existing free/paid forms plus pending settlement and turn identity |
| `data-filed` | Display receipt identifying sections saved by this reply |
| `data-ready` | Compatibility signal; readiness must agree with topic-derived coverage |

```ts
// Additions within src/lib/discovery-stream.ts.
// Wire objects are parsed into the domain model at the SDK boundary.
type Revision12Data = {
  "brief-update": {
    turnId: string;
    revision: number;
    brief: BriefRevisionWire;
  };
  "file-chat": {
    conversationId: string;
    fileId: string | null;
    uploadId: string | null;
    question: FileQuestionWire;
  };
  "file-read": {
    fileId: string;
    readId: string;
    sequence: number;
    state: FileReadWire;
  };
  "file-suggestion": {
    revision: number;
    suggestion: FileSuggestionWire;
  };
};
```

These are wire schemas, not casts to domain types. Boundary validation checks identifiers, option references, revision numbers, money units, and progress bounds.

`data-brief-update` supplies the canonical question definitions for that revision. `data-question` renders their placement within the conversation. The two cannot create separate question stores.

The runtime applies the brief update as one event when the reply commits. It never briefly displays an answer without its importance or source.

File-read updates also arrive through `source.observe`. A main chat stream does not need to remain open for a read to progress.

The fixture emits the extended parts now. The backend emitter changes in phase 3. This package does not claim the present backend satisfies the new contract.

### Non-chat actions

| User operation | Runtime operation | Source responsibility |
|---|---|---|
| Save a section | `save-edit` | Free revision, sources, dependency invalidation |
| Accept a suggestion | `accept-suggestion` | Free revision and explicit acceptance source |
| Remove a cause | `remove-cause` | Free revision; remove only |
| Finish | `finish` | Validate revision and acknowledgments; return confirmation |
| Choose a file | `stage-file` | Validate upload and return the opening question |
| Cancel before answering | `discard-file` | Remove staged material; add no Discovery file |
| First file answer | `answer-file` through SDK | Admit file, reserve one reply, start the read |
| Later file answer | `answer-file` through SDK | Reserve one reply and resume the paused read |
| Read progress | `observe` | Publish read state; consume no turn |
| Reload | `load` | Restore durable state and reconcile pending operations |

A file answer uses the same SDK submission path as a main answer. It does not call an action endpoint and then send a second chat request.

The first answer promotes the staged upload into a Discovery file. File bytes never enter `DiscoveryModel`, localStorage, or a main chat request.

Phase 3 implements these source operations through edge functions. No component receives a database client.

### Component and module map

New production files:

| File | Responsibility |
|---|---|
| `src/lib/discovery-screen/model.ts` | Domain types and validated initial model |
| `src/lib/discovery-screen/reducer.ts` | Events, intentions, operations, pure transitions |
| `src/lib/discovery-screen/selectors.ts` | Question, brief, review, file, conversation, and usage views |
| `src/lib/discovery-screen/source.ts` | Domain source contract and input schemas |
| `src/lib/discovery-screen/sdk.ts` | SDK attachment and conversion into domain events |
| `src/components/discovery/useDiscovery.tsx` | Provider, runtime, SDK hooks, resource ownership |
| `src/components/discovery/DiscoveryScreen.tsx` | Page composition and host callbacks |
| `src/components/discovery/DiscoveryChat.tsx` | Transcript, question controls, growing composer |
| `src/components/discovery/DiscoveryProgress.tsx` | Topic count, coverage, sticky Finish action |
| `src/components/discovery/QuestionsCard.tsx` | All question states and navigation |
| `src/components/discovery/BriefPanel.tsx` | Brief card, desktop panel, phone panel, section rendering |
| `src/components/discovery/UsageCard.tsx` | Single two-part usage bar and funding copy |
| `src/components/discovery/FilePanel.tsx` | File list, chooser, upload controls, read states |
| `src/components/discovery/FileChat.tsx` | File conversation and answer controls |
| `src/components/discovery/FinishReview.tsx` | Gaps, editable document, acknowledgments, finished state |

Use existing shadcn controls. Keep responsive layout in component classes unless a specific layout requires a small stylesheet.

```ts
export function DiscoveryScreen(props: {
  source: DiscoverySource;
  onBuyFuel(): void;
  onFindVolunteer(): void;
}): React.ReactElement {
  throw new Error("not implemented");
}

export function useDiscoveryRuntime(source: DiscoverySource): DiscoverySession {
  throw new Error("not implemented");
}

export function useDiscovery(): DiscoverySession {
  throw new Error("not implemented");
}

type DiscoverySession = {
  questions: QuestionsView;
  brief: BriefView;
  review: ReviewView;
  usage: UsageView;
  files: FilesView;
  conversation(id: ConversationId): ConversationView;
  act(intent: Intent): void;
};
```

The module interface is deliberately deep. Components ask for a view and submit an intention. The runtime hides retries, SDK conversion, checkpointing, and operation completion.

### Fixture shell changes

**Keep:**

- `App.tsx` navigation and fixture review tools.
- `main.tsx`, including the production stylesheet import.
- `ProjectBuild.tsx`, its support files, and unrelated pages in `screens.tsx`.
- The canvas boards as design evidence.

**Replace:**

- `Discovery.tsx` becomes the small mount shown in Usage, or its mount moves directly into `App.tsx`.
- `fixture-transport.ts` emits revision 12 events and supplies the fixture source operations.
- `questions.ts` retains fixture wording and branching data. It imports production domain types.
- `discovery-examples.ts` supplies revision 12 snapshots and scripted events.

**Delete after removing their Discovery imports:**

- `design/astra/src/DiscoveryProgress.tsx`
- `design/astra/src/DiscoveryReferences.tsx`
- `design/astra/src/DiscoveryScope.tsx`
- `design/astra/src/discovery-chat.css`

Remove the old `Discovery.tsx` implementation. Do not preserve a second screen behind the thin mount.

`model.ts` remains where unrelated mock pages need it. The new Discovery screen must not read its old answers, scope, or confirmation fields.

Use a separate versioned key for revision 12 Discovery. Do not overwrite the old shared mock record. This also prevents the legacy app effect from overwriting new Discovery state.

The fixture source uses the production reducer for domain transitions. It adds scripts, sample balances, persistence, and timed delivery—not a second implementation of screen rules.

Add no new fixture source files unless separating the existing file becomes necessary. The required driver files are listed below.

Update `vite.config.ts` with the production `@` alias needed by shadcn imports. Preserve port 4310 for manual review. The test driver overrides the port.

Check legacy mock CSS carefully. Scope conflicting legacy rules to legacy pages so Discovery inherits `src/styles.css` in both themes.

### Funding and completion details

The usage bar has two segments in one accessible graphic:

- The first segment shows free allowance.
- The second shows Discovery fuel.
- Segment widths follow the canvas proportions. They do not convert turns into dollars.
- Color uses unrounded consumption: below 80%, 80–95%, and above 95%.
- Free consumption uses the more consumed daily or beta allowance.
- Paid consumption uses the current allocation. A zero allocation has an empty state.

The source supplies the funding quote. A stale Free quote cannot silently become Paid. Refresh it and require another explicit paid submission.

The usage card owns reset copy, the hold explanation, pending settlement, and Buy fuel. No usage text appears beside Send.

The review page renders current data without sending a chat message. It preserves the approved checkbox wording, including:

> I have reviewed revision {revision}. It describes the first version we need.

> Our NGO takes responsibility for data access and keeps only the personal information this tool needs.

The conditional gaps acknowledgment uses the canvas wording and current open count. Saving clears the revision review acknowledgment.

Accepted gaps remain in the confirmed document. Confirmation preserves actual coverage. It does not force 100%.

### Phone designs

**File chat, 390 pixels.** Open a full-screen dialog with the file name, read state, and Back to chat. The transcript scrolls independently. Suggested answers wrap into full-width rows when needed. The growing answer box stays above the safe area. The shared usage card sits directly above it.

During a read, replace the answer control with progress unless a question requires an answer. Back to chat closes only the panel. The file row continues to show progress or **A question for you**.

**Questions card, 390 pixels.** Place it in the chat flow above the usage card. Use full-width rows with question text, a written state, and Answer or View. Allow the card to collapse under its labeled heading. A count remains visible.

Answer expands the relevant question and focuses its control. View closes the card if needed, scrolls to the answer, and highlights it. Neither action changes an answer.

**Finish review, 390 pixels.** Use one column: heading, open questions, brief sections, file digests, assessments, causes, then confirmation. Edit controls stay beside section headings. Save and Cancel stay within the section.

A fixed bottom action scrolls to the confirmation card. It does not bypass acknowledgments. Reserve bottom space so it covers no content. Back to the chat remains available during an edit.

**Phone brief and usage.** The contract requires visible usage while the brief is open. The phone canvas omits it. Keep the full-screen brief and place the same usage card in its footer. Render only one visible usage card.

Use a modal dialog on phones and a non-modal side panel on desktop. Preserve the chat draft and restore focus when the panel closes.

## Screen-test driver

### Minimal harness addition

Add these files:

1. `tests/at/harness/screen.ts` — server, Chromium, isolated contexts, and page acquisition.
2. `tests/at/harness/screen.selftest.ts` — resource cleanup, target selection, and failure accounting.
3. `tests/at/harness/discovery-screen-model.selftest.ts` — reducer invariants that screen tests cannot isolate.

Add **`playwright`** as a development dependency. Use Vitest assertions. Do not introduce the Playwright test runner, jsdom, a DOM library, or another acceptance registry.

The existing Vite dependency can start the fixture shell programmatically. This avoids a shell process and process-tree cleanup.

```ts
// tests/at/harness/screen.ts
import type { Page } from "playwright";

type ScreenCase =
  | "first-reply"
  | "review-gaps"
  | "confirmed"
  | "file-read"
  | "three-files"
  | "funded-files"
  | "question-states"
  | "free"
  | "paid"
  | "no-fuel";

type ScreenSize = "desktop" | "phone";

type OpenScreen = {
  page: Page;
  close(): Promise<void>;
};

/** Installs suite hooks. Startup failure is an infrastructure error. */
export function installDiscoveryScreenDriver(): void {
  throw new Error("not implemented");
}

export async function openDiscoveryScreen(
  scenario: ScreenCase,
  size: ScreenSize,
): Promise<OpenScreen> {
  throw new Error("not implemented");
}
```

The driver uses existing fixture examples. It does not add harness fixture worlds.

### Registry integration

Add a tracked `ctx.openScreen()` resource for the Discovery UI binding. Its type comes from a closed screen binding in `suite-adapters.ts`.

- Require `surface: "ui"` before opening it.
- Track successful page opens separately from fixture-world opens.
- Accept an actual page open as observed evidence.
- Close every context through the existing teardown accounting.
- Do not weaken the rule for other test bodies.
- Do not open an unused backend world merely to satisfy the counter.

Update `testUseProblem` and its existing self-tests to include tracked screen opens. No arbitrary body can mark itself as observed.

### Server and browser lifecycle

The suite installs the driver once.

1. Before the suite, load the existing Astra Vite configuration.
2. Listen on `127.0.0.1` with an ephemeral port.
3. Launch headless Chromium.
4. For each page open, create a fresh browser context and navigate to the selected example.
5. After each test, close its contexts through registry teardown.
6. After the suite, close Chromium and Vite.

A context starts with empty storage. Reload within that context tests persistence.

Manual review still uses port 4310. Tests never attach to an unknown existing server. Fixture timers have bounded delays; browser assertions wait for visible states, not arbitrary sleeps.

The Node-side test project retains `lib: ["ES2022"]`. Use Playwright locator methods and `boundingBox()`. Do not add browser globals to test TypeScript.

### Test registration and partial pending cases

Keep every ID registered once in `j-need-brief.test.ts`.

```ts
atTest(
  "AT-004.67",
  "file-chat answers are turns and the read is free",
  { surface: "ui" },
  {
    loop: async (ctx) => {
      const { page } = await ctx.openScreen("file-read", "desktop");

      // TODO: Answer the opening and paused-read questions.
      // TODO: Assert visible free counters and paid receipts.
      // TODO: Assert progress alone leaves displayed usage unchanged.

      throw new AtPending(
        ctx.atId,
        "sut-missing",
        "Screen assertions passed; backend charging proof waits for phase 3.",
      );
    },
    default: awaiting(AWAITED.discoverySurface),
  },
);
```

The real body contains assertions before the pending throw. Never catch assertion errors and replace them with pending.

AT-004.68 follows the same structure: assert the screen, then report the missing digest-context proof. AT-004.69 remains a pending body without pretending to read a large file.

Use Vitest `expect` for the assertions so `expect.hasAssertions()` remains meaningful.

### Phase 2 tier behavior

| Cases | Loop | Integration and drill |
|---|---|---|
| .61–.66, .70–.73 | Run on the real components in Astra; green when complete | `CapabilityPending` for `ui.discovery-surface` |
| .67–.68 | Run screen assertions, then `AtPending` for backend work | `CapabilityPending` for `ui.discovery-surface` |
| .69 | `AtPending` for the large-file backend read | Pending for that backend implementation |

Update the loop manifest with ten new greens. Keep .67–.69 red.

Update integration declarations to match the selected pending classes. Do not add a drill declaration copied from a test run.

The existing integration command still performs its required stack preparation. These screen cases do not fall back to fixtures afterward.

### What each body proves

| ID | Browser assertions |
|---|---|
| .61 | Reply updates questions, options, suggested marker, importance, agreed wording, and source turn |
| .62 | Gaps precede the brief; acceptance creates a revision; chat return preserves gaps; acknowledged completion works |
| .63 | Confirmed document contains required need fields and excludes technical scope |
| .64 | Inline save preserves wording, changes revision, clears review, costs nothing; open edit blocks confirmation |
| .65 | First reply requests relevant files below three; questions remain usable; no request at three |
| .66 | Picker, drop area, disclosure, cancellation, opening question, paused read, resume, close, and reopen |
| .67 | Free and paid file answers update visible usage; read progress alone does not |
| .68 | Main chat works during reading; progress becomes Ready; next reply presents digest facts as suggestions |
| .69 | Backend pending |
| .70 | Three-file limit excludes intake; funded example permits another file |
| .71 | Five question states; focus, answer highlight, custom text, partial submission, carried questions |
| .72 | One two-part bar; values together; phone position; one-line composer grows; no usage beside Send |
| .73 | Desktop panel beside chat; phone dialog fills viewport; Edit returns to its question; draft survives |

Run layout cases at 1280 × 900 and 390 × 844. Repeat relevant cases in `.dark`. Include a 320-pixel clipping check.

For .72, compare usage-card and composer rectangles. Verify their order and adjacent spacing. For .73, compare the panel with the viewport and chat rectangles.

### “No other model call”

A browser cannot prove how many model calls occur inside an edge function. The design must not claim otherwise.

At loop tier, observe the fixture transport’s actual dispatch boundary. Add a small diagnostic event at `sendMessages` entry. Playwright collects it through the page console.

AT-004.61 verifies:

- One user submission causes one transport dispatch.
- That dispatch delivers text and the structured brief update.
- Opening review, accepting a suggestion, editing, and finishing cause no additional dispatch.
- No external model request occurs in the fixture shell.

This is transport evidence alongside visible assertions. It is not a fabricated model counter or a new vendor capability.

In phase 3, the driver observes actual browser requests. Backend evidence must additionally establish the single model call and its structured result. Until that evidence exists, integration cannot claim the full criterion.

### Phase 3 reuse

The driver changes target resolution:

- Loop resolves to an Astra example.
- Integration resolves to the authenticated real Discovery route.
- Existing stack helpers prepare the corresponding project state.
- The driver never injects fixture responses into that route.

The screen assertion functions remain unchanged. Integration wrappers add the backend checks required by .61, .67, .68, and .69.

`--wired` continues to mean real-screen wiring. In phase 2, update its refusal text to say that the driver exists but the route is not connected. Do not silently redirect it to Astra.

### CI changes

Add one Chromium installation step after dependency installation:

```sh
bunx playwright install --with-deps chromium
```

Use the same code-change condition as the existing acceptance steps. The harness owns server startup and shutdown. CI gains no service process or separate browser-test command.

Update `tests/at/README.md`, expected declarations, and the runner’s obsolete driver message. Keep existing exact-result accounting.

## Build order

Each unit ends with the listed check. The lead can use these boundaries for the required founder gates.

1. **Domain and source contract.** Add types, schemas, reducer, and selectors.  
   Check duplicate events, stale results, dependent answers, revision acknowledgment, and repeated completion.

2. **SDK and fixture source.** Emit atomic brief updates and connect `useChat`.  
   Check one submitted answer, partial answers, failed replies, reload, and no extra dispatch at review.

3. **Browser resource.** Add Chromium page acquisition and tracked cleanup.  
   Check startup failure, assertion failure, pending after assertions, and resource teardown.

4. **Chat, brief, questions, and usage.** Build production components with shared controls and tokens.  
   Check .61, .65, and .71–.73 at desktop and phone widths, in both themes.

5. **Files and file chat.** Add staged upload, first answer, read pause, resume, digest, and suggestions.  
   Check .66 and .70; run the screen portions of .67 and .68 before their pending result.

6. **Review and completion.** Add editable document, acknowledgments, accepted gaps, and finished state.  
   Check .62–.64, reload, zero coverage, empty summary, and no-fuel completion.

7. **Remove obsolete Discovery code and finish evidence.** Update manifests, review record, documentation, and the three requested decomposition sync stamps.  
   Check bijection, harness self-tests, loop declarations, and integration pending declarations.

After each code unit, run the Astra type check and the application/harness type checks. During the build, Codex explores the shell and reports findings. Codex is not part of the test process.

## Synthesis decision

Reserved for arena. This candidate proposes one pure model and reducer as the base. It does not select itself or attribute decisions to other runners.

## Tradeoffs accepted

- We accept a larger reducer in exchange for one place to inspect every visible transition.
- We accept complete brief snapshots in exchange for safe handling of out-of-order revisions.
- We accept an SDK message projection in exchange for retaining `useChat` without giving it control over screen policy.
- We accept one chargeable reply at a time in exchange for compatibility with the existing project turn reservation.
- We accept linear scans of small collections in exchange for fewer stored indexes and synchronization rules.
- We accept a small registry change in exchange for honest browser resource accounting.
- We accept pending integration cases in exchange for clear separation between fixture and backend evidence.

## Alternatives considered

**Independent hooks for chat, brief, files, and review.** Each hook has a small interface, but callers must coordinate revisions and usage. A file reply could update counters while review retains an old acknowledgment. This exposes coordination complexity instead of hiding it.

**A generic event store with middleware and selectors.** It could centralize state, but it introduces subscriptions, effect middleware, and persistence conventions beyond this screen’s needs. The proposed reducer hides the same domain policy behind a smaller surface.

**Render directly from SDK messages.** This hides transcript assembly but exposes message-part parsing to every card. It also lacks a natural owner for manual edits and confirmation. Those operations are not chat messages.

## Open questions and risks

- Can the phase 3 backend provide complete brief revisions and globally ordered usage snapshots across both conversation types?
- Can its mutation endpoints return the original result for a repeated operation ID, including confirmation and file admission?
- Will phone review approve keeping usage visible inside the full-screen brief, as the contract requires?
- Which existing backend observation will prove internal model-call counts without adding another harness capability?
- Can the selected Playwright version pass the current strict Node-only type check without changing its library settings?

These questions affect implementation or later wiring. None requires changing the fixed browser, CI, or fixture decisions.

## Next implementation step

Build the domain types, reducer, and selectors, starting with duplicate events, stale revisions, and an AI reply arriving during a manual edit.