**Caller usage**

Mount one shipping screen with a viewer-bound port. The screen owns presentation, navigation, drafts, and the message queue. The port owns the workspace and every domain transition.

At screen wiring, replace the fixture port and supply the real navigation callback. Components and browser flow assertions stay the same.

```tsx
// design/astra/src/App.tsx — inside the #prd-workspace branch
import { PrdWorkspaceScreen } from "@/components/prd-workspace";
import { prdFixturePort } from "./prd-fixture-port";

const port = useMemo(
  () => prdFixturePort(prdFixtureSelection()),
  [],
);

return (
  <PrdWorkspaceScreen
    port={port}
    onOpenUiDesign={({ revision }) => {
      setPreviewNotice(`UI Design starts from PRD revision ${revision}.`);
    }}
  />
);
```

The shell selects Priya or Maya through the scenario. A viewer switch is not part of the shipping screen.

An interaction submits one intent. The component does not assemble the brief, change the topic, notify Maya, or remove the question from the open list.

```tsx
// src/components/prd-workspace/AnswerReview.tsx
const review = controller.view.answerReview;

if (!review) return null;

return (
  <Button
    data-testid="prd-answer-review-claim"
    disabled={!review.canUse}
    onClick={() => controller.useAnswer(review.questionId)}
  >
    Use answer
  </Button>
);
```

`useAnswer` captures the locally edited answer and note, submits them with the server-issued action binding, and replaces the workspace with the returned snapshot. The server produces the canonical Dev brief and AI reply.

Each acceptance identifier keeps one registration. This example uses the proposed page-object API; its methods locate the copied canvas handles.

```ts
// tests/at/suites/req-036/workspace.test.ts
const screens = prdScreens();

atTest("AT-036.14", "Use an NGO answer in the PRD", {
  loop: async (ctx) => {
    await ctx.open();

    await screens.withWorkspace(
      { scenario: "completed-retention-answer-dev", viewport: "desktop" },
      async (screen) => {
        await screen.questions.viewAnswer("Data retention");
        await screen.answerReview.editAnswer(
          "Keep contact details for one year, then delete them.",
        );
        await screen.answerReview.writeNote(
          "Apply the same rule to coordinator exports.",
        );
        await screen.answerReview.useAnswer();

        const brief = await screen.chat.claimBrief();
        expect(brief.actor).toBe("dev");
        expect(brief.text).toContain("coordinator exports");

        await screen.topics.open("Data handling");
        expect(await screen.topic.documentText()).toContain(
          "coordinator exports",
        );

        await screen.questions.openAnswered("Data retention");
        expect(await screen.chat.claimBriefIsFocused()).toBe(true);

        await screen.reload();
        expect(await screen.questions.answeredCount()).toBe(1);
      },
    );
  },

  integration: async () => {
    throw new AtPending(
      "AT-036.14",
      "sut-missing",
      "The PRD workspace edge functions and real route are not wired.",
    );
  },
});
```

Cases also exercise unchanged wording, omitted notes, duplicates, and refusals. Wiring replaces the pending integration body with the same browser flow against the real route, plus backend evidence.

**Shape**

The central decision is **one authoritative immutable snapshot, replaced atomically**.

There is no client reducer for topic transitions, answer completion, dependencies, scoring, or closure. There is no optimistic workspace mutation. Navigation and typing do not call the model.

Three revision numbers serve different purposes:

| Revision | Purpose |
|---|---|
| Snapshot sequence | Orders every authoritative update, including funds and another participant’s activity. |
| PRD revision | Identifies the authored document and completion-check coverage. |
| Conversation revision | Binds a send or recommendation to the conversation it concerns. |

An unrelated funds update must not invalidate a topic confirmation merely because the snapshot sequence changed. Conversely, a higher snapshot sequence does not make an old recommendation valid.

The port receives **commands**, never edited workspace snapshots. Snapshot replacement is a read strategy, not last-writer-wins persistence.

The following is a structural sketch, not a compile-checked scaffold. Comments describe the sketch’s invariants and would pass through the project’s comment audit before implementation.

```ts
// src/lib/prd-stream.ts
import type { UIMessage } from "ai";

type Id<K extends string> = string & { readonly __id: K };

export type WorkspaceId = Id<"workspace">;
export type ActorId = Id<"actor">;
export type TopicId = Id<"topic">;
export type QuestionId = Id<"question">;
export type ChatId = Id<"chat">;
export type TurnId = Id<"turn">;
export type RequestId = Id<"request">;
export type ActionToken = Id<"action">;

export type Actor = Readonly<{
  id: ActorId;
  name: string;
  role: "dev" | "ngo" | "ai";
}>;

export type Anchor =
  | { readonly kind: "project"; readonly id: string }
  | { readonly kind: "requirement"; readonly id: string };

export type Source =
  | {
      readonly kind: "discovery";
      readonly revision: number;
      readonly anchor: string;
    }
  | {
      readonly kind: "turn";
      readonly chatId: ChatId;
      readonly turnId: TurnId;
    }
  | {
      readonly kind: "answer";
      readonly questionId: QuestionId;
      readonly answerRevision: number;
    };

export type ActionKind =
  | "post-question"
  | "complete-answer"
  | "use-answer"
  | "confirm-topic"
  | "reopen-topic"
  | "request-close"
  | "close-anyway"
  | "keep-working";

/** Issued by the authority; never synthesized from visible state. */
export type Action<K extends ActionKind> = Readonly<{
  kind: K;
  token: ActionToken;
}>;

export type Availability<T> =
  | { readonly kind: "available"; readonly action: T }
  | { readonly kind: "unavailable"; readonly reason: string };

export type TopicState =
  | "open"
  | "draft"
  | "ready-to-confirm"
  | "confirmed"
  | "needs-review";

export type Statement = Readonly<{
  id: string;
  text: string;
  sources: readonly Source[];
}>;

export type Topic = Readonly<{
  id: TopicId;
  title: string;
  required: boolean;
  revision: number;
  state: TopicState;
  statusText: string;
  blockers: readonly {
    text: string;
    neededActor: ActorId | null;
  }[];
  document: readonly Statement[];
  stories: readonly {
    id: string;
    text: string;
    acceptanceCriteria: readonly Statement[];
    sources: readonly Source[];
  }[];
  chatId: ChatId;
  confirm: Availability<Action<"confirm-topic">>;
  reopen: Availability<Action<"reopen-topic">>;
}>;

export type Answer = Readonly<{
  revision: number;
  text: string;
  sources: readonly Source[];
  impact: readonly Statement[];
  openPoints: readonly Statement[];
}>;

type QuestionBase = Readonly<{
  id: QuestionId;
  text: string;
  reason: string;
  anchor: Anchor;
  topicIds: readonly TopicId[];
  blocking: boolean;
  prerequisiteIds: readonly QuestionId[];
}>;

export type NgoQuestion = QuestionBase & (
  | {
      readonly kind: "suggested";
      readonly suggestedIn: TurnId;
      readonly post: Availability<Action<"post-question">>;
    }
  | {
      readonly kind: "answering";
      readonly chatId: ChatId;
      readonly followUp:
        | { readonly kind: "none" }
        | { readonly kind: "unanswered"; readonly turnId: TurnId };
      readonly complete: Availability<Action<"complete-answer">>;
    }
  | {
      readonly kind: "complete";
      readonly chatId: ChatId;
      readonly answer: Answer;
      readonly use: Availability<Action<"use-answer">>;
    }
  | {
      readonly kind: "used";
      readonly chatId: ChatId;
      readonly answer: Answer;
      readonly usedText: string;
      readonly note: string;
      readonly briefTurnId: TurnId;
      readonly wordingNotice: string | null;
    }
);

export type ChatScope =
  | { readonly kind: "main" }
  | { readonly kind: "topic"; readonly topicId: TopicId }
  | { readonly kind: "ngo-question"; readonly questionId: QuestionId };

export type ChatSnapshot = Readonly<{
  id: ChatId;
  scope: ChatScope;
  revision: number;
  turnIds: readonly TurnId[];
  send:
    | { readonly kind: "allowed" }
    | { readonly kind: "blocked"; readonly reason: string };
}>;

export type ClaimBrief = Readonly<{
  questionId: QuestionId;
  question: string;
  originalAnswer: string;
  usedAnswer: string;
  note: string;
  impact: readonly Statement[];
  openPoints: readonly Statement[];
}>;

export type TurnBlock =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "claim-brief"; readonly brief: ClaimBrief }
  | { readonly kind: "ngo-question"; readonly questionId: QuestionId }
  | {
      readonly kind: "dev-question";
      readonly id: string;
      readonly text: string;
      readonly reason: string;
      readonly options: readonly { id: string; text: string }[];
      readonly sources: readonly Source[];
    }
  | { readonly kind: "check"; readonly checkId: string }
  | {
      readonly kind: "recommendation";
      readonly text: string;
      readonly action: Availability<Action<"request-close">>;
    };

export type Turn = Readonly<{
  id: TurnId;
  chatId: ChatId;
  actor: ActorId;
  at: string;
  topicIds: readonly TopicId[];
  blocks: readonly TurnBlock[];
}>;

export type TimelineEntry =
  | { readonly kind: "turn"; readonly turnId: TurnId }
  | {
      readonly kind: "topic-event";
      readonly id: string;
      readonly at: string;
      readonly text: string;
      readonly topicId: TopicId;
      readonly sourceTurnId: TurnId | null;
    };

export type Check = Readonly<{
  id: string;
  prdRevision: number;
  score: number;
  threshold:
    | { readonly kind: "configured"; readonly value: number }
    | { readonly kind: "unconfigured" };
  outcome: "passed" | "gaps" | "configuration-needed";
  gaps: readonly {
    id: string;
    topicId: TopicId;
    text: string;
    resolved: boolean;
  }[];
}>;

export type OpenPoint = Readonly<{
  id: string;
  kind: "topic" | "question" | "unused-answer" | "coverage";
  text: string;
  topicId: TopicId | null;
  questionId: QuestionId | null;
}>;

/** Exact decimal strings; display rounding never controls admission or color. */
export type Funds = Readonly<{
  allocatedUsd: string;
  spentUsd: string;
  pendingUsd: string;
  availableUsd: string;
}>;

export type CloseState =
  | {
      readonly kind: "open";
      readonly remaining: readonly OpenPoint[];
      readonly request: Availability<Action<"request-close">>;
      readonly warning: null | {
        readonly checkId: string;
        readonly points: readonly OpenPoint[];
        readonly closeAnyway: Action<"close-anyway">;
        readonly keepWorking: Action<"keep-working">;
      };
    }
  | {
      readonly kind: "closed";
      readonly revision: number;
      readonly openPoints: readonly OpenPoint[];
      readonly uiDesign: { readonly revision: number };
    };

export type DraftSnapshot = Readonly<{
  revision: number;
  text: string;
}>;

export type Operation =
  | { readonly kind: "running"; readonly chatId: ChatId | null }
  | {
      readonly kind: "committed";
      readonly turnIds: readonly TurnId[];
    }
  | { readonly kind: "refused"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

/** All collections are immutable, and all references resolve within this snapshot. */
export type PrdWorkspace = Readonly<{
  id: WorkspaceId;
  sequence: number;
  prdRevision: number;
  viewer: Actor & { readonly role: "dev" | "ngo" };
  actors: readonly Actor[];
  discovery: { readonly revision: number; readonly title: string };
  topics: readonly Topic[];
  questions: readonly NgoQuestion[];
  chats: Readonly<Record<ChatId, ChatSnapshot>>;
  turns: Readonly<Record<TurnId, Turn>>;
  mainChatId: ChatId;
  mainTimeline: readonly TimelineEntry[];
  checks: readonly Check[];
  requiredTopicChanges: readonly {
    revision: number;
    reason: string;
    topicIds: readonly TopicId[];
  }[];
  funds: Funds;
  close: CloseState;
  viewerDrafts: Readonly<Partial<Record<ChatId, DraftSnapshot>>>;
  operations: Readonly<Partial<Record<RequestId, Operation>>>;
}>;

/** Infrastructure types: consumed by the port and controller, not view components. */
export type PrdDataParts = {
  snapshot: {
    requestId: RequestId;
    workspace: PrdWorkspace;
  };
};

export type PrdUIMessage = UIMessage<never, PrdDataParts>;

export type PrdSend = Readonly<{
  requestId: RequestId;
  chatId: ChatId;
  conversationRevision: number;
  prdRevision: number;
  text: string;
}>;

export function parsePrdWorkspace(input: unknown): PrdWorkspace {
  // TODO: Validate shape, references, exact amounts and discriminated states.
  throw new Error("not implemented");
}
```

Topics and questions are ordered arrays because both dominant reads are ordered lists. Their small size makes direct lookup appropriate. Chats and turns are indexed because source navigation, conversation switching, and transcript assembly repeatedly address them by identifier. No second client index needs synchronizing.

`mainTimeline` preserves chronological cross-topic history through references and topic events. It does not duplicate the topic document or maintain another copy of its messages.

```ts
// src/components/prd-workspace/port.ts
import type { ChatTransport } from "ai";

export type PrdRefusal = Readonly<{
  kind:
    | "forbidden"
    | "stale-action"
    | "follow-up-unanswered"
    | "insufficient-funds"
    | "closed"
    | "conversation-busy"
    | "draft-conflict"
    | "configuration-needed";
  reason: string;
}>;

export type PrdResult =
  | { readonly ok: true; readonly workspace: PrdWorkspace }
  | {
      readonly ok: false;
      readonly refusal: PrdRefusal;
      readonly workspace: PrdWorkspace | null;
    };

export type PrdCommand =
  | { readonly action: Action<"post-question"> }
  | { readonly action: Action<"complete-answer"> }
  | {
      readonly action: Action<"use-answer">;
      readonly answer: string;
      readonly note: string;
    }
  | { readonly action: Action<"confirm-topic"> }
  | { readonly action: Action<"reopen-topic"> }
  | { readonly action: Action<"request-close"> }
  | { readonly action: Action<"close-anyway"> }
  | { readonly action: Action<"keep-working"> }
  | {
      readonly kind: "save-draft";
      readonly chatId: ChatId;
      readonly baseDraftRevision: number;
      readonly text: string;
    };

export interface PrdPort {
  load(): Promise<PrdResult>;

  execute(input: {
    requestId: RequestId;
    command: PrdCommand;
  }): Promise<PrdResult>;

  subscribe(listener: (workspace: PrdWorkspace) => void): () => void;

  readonly chat: ChatTransport<PrdUIMessage>;
}
```

The explicit `ChatTransport` member is the settled SDK seam. It stays out of component props and view models. HTTP payloads, authentication, storage rows, stream parsing, and provider settings remain behind the port.

`subscribe` delivers complete snapshots, including changes made by the other participant. Register it before loading, then pass both channels through the same sequence check. A port must recover missed notifications through a fresh load.

Model-backed commands—complete answer, use answer, and completion checking—return their completed snapshot. They may publish intermediate **full** snapshots through subscription. Their initial implementation can show a busy state without streaming their generated text. Ordinary chat sends use `Chat`/`useChat` and stream text.

This avoids forcing button actions through fake chat messages merely to reach the SDK.

```ts
// src/components/prd-workspace/use-prd-workspace.ts
export type Selection =
  | { readonly kind: "main" }
  | { readonly kind: "topic"; readonly topicId: TopicId }
  | { readonly kind: "questions" }
  | { readonly kind: "side-chat"; readonly questionId: QuestionId }
  | { readonly kind: "answer-review"; readonly questionId: QuestionId };

export type QueueItem = Readonly<{
  id: RequestId;
  chatId: ChatId;
  text: string;
  state: "waiting" | "editing" | "sending" | "uncertain";
}>;

export type AnswerEdit = Readonly<{
  questionId: QuestionId;
  answerRevision: number;
  text: string;
  note: string;
}>;

export type LocalState = Readonly<{
  selection: Selection;
  phoneTab: "chat" | "prd" | "questions";
  drafts: Readonly<Partial<Record<ChatId, string>>>;
  answerEdits: Readonly<Partial<Record<QuestionId, AnswerEdit>>>;
  queue: readonly QueueItem[];
}>;

export type ChatView = Readonly<{
  id: ChatId;
  turns: readonly Turn[];
  draft: string;
  liveText: string | null;
  busy: boolean;
  canSend: boolean;
  sendLabel: "Send" | "Add to queue";
  blockedReason: string | null;
}>;

export type PrdView = Readonly<{
  workspace: PrdWorkspace;
  selection: Selection;
  phoneTab: LocalState["phoneTab"];
  progress: { readonly confirmed: number; readonly required: number };
  gauge: {
    readonly availableText: string;
    readonly pendingText: string | null;
    readonly spentPercent: number;
    readonly band: "green" | "yellow" | "red";
  };
  chat: ChatView | null;
  queue: readonly QueueItem[];
  answerReview: null | {
    readonly questionId: QuestionId;
    readonly answer: string;
    readonly note: string;
    readonly impact: Answer["impact"];
    readonly openPoints: Answer["openPoints"];
    readonly canUse: boolean;
    readonly blockedReason: string | null;
  };
}>;

export interface PrdController {
  readonly view: PrdView;

  select(selection: Selection): void;
  selectPhoneTab(tab: LocalState["phoneTab"]): void;
  setDraft(chatId: ChatId, text: string): void;
  send(chatId: ChatId): void;

  beginQueueEdit(id: RequestId): void;
  saveQueueEdit(id: RequestId, text: string): void;
  removeQueued(id: RequestId): void;

  editAnswer(questionId: QuestionId, text: string, note: string): void;
  useAnswer(questionId: QuestionId): Promise<void>;
  act(action: Action<ActionKind>): Promise<void>;
}

export function usePrdWorkspace(
  port: PrdPort,
  initial: PrdWorkspace,
): PrdController {
  // TODO: Own one snapshot cell, local drafts and stable Chat instances by chat id.
  // TODO: Install load, subscription, command and stream snapshots at one boundary.
  // TODO: Never overwrite committed history from an SDK message array.
  throw new Error("not implemented");
}

function installSnapshot(next: PrdWorkspace): void {
  // TODO: Check workspace/viewer identity; replace only for a newer sequence.
  // TODO: Reconcile operation receipts, then retire matching live text.
  // TODO: Preserve dirty local drafts; never merge topic/question/fund fields.
  throw new Error("not implemented");
}

function drainMainQueue(): Promise<void> {
  // TODO: Atomically claim the first waiting item before any await.
  // TODO: Stop at an editing or uncertain item; do not overtake it.
  // TODO: Read current revisions and admission immediately before dispatch.
  // TODO: Reuse the request id on recovery; remove only after authoritative outcome.
  throw new Error("not implemented");
}
```

`act` handles simple server-issued actions. `useAnswer` deserves its own method because it captures and protects an edit buffer, handles answer-revision conflicts, and focuses the resulting brief.

```ts
// src/components/prd-workspace/model.ts
export function presentWorkspace(
  workspace: PrdWorkspace,
  local: LocalState,
  chats: ReadonlyMap<ChatId, ChatView>,
): PrdView {
  // TODO: Derive progress, exact gauge boundaries and selected presentation.
  // TODO: Preserve server action availability; only add local busy restrictions.
  throw new Error("not implemented");
}

// src/components/prd-workspace/PrdWorkspaceScreen.tsx
export type PrdWorkspaceScreenProps = {
  port: PrdPort;
  onOpenUiDesign: (source: { revision: number }) => void;
};

export function PrdWorkspaceScreen(
  props: PrdWorkspaceScreenProps,
): React.ReactElement {
  throw new Error("not implemented");
}
```

The gauge uses exact decimal comparison before converting a ratio for display. Its color never determines whether a send is allowed.

Drafts are separate for each viewer and conversation. The controller keeps an immediate local recovery copy and saves through the port without model calls. A returned snapshot cannot overwrite a dirty buffer. Conflicting saves from two tabs preserve the local text and report the conflict; they do not silently choose a winner. The fixture persists acknowledged drafts across reload.

Each active conversation has a stable SDK `Chat`. Switching views does not destroy it or call the model. `useChat` observes the selected instance; completion callbacks still work for an instance whose view is hidden.

Committed messages always come from the snapshot. SDK messages supply only the current in-flight presentation. On stream interruption, reload and inspect the stable request’s authoritative outcome before advancing the queue. Never restore an old transcript wholesale.

**Module map**

| File | Change and purpose |
|---|---|
| `src/lib/prd-stream.ts` | New domain snapshot, action, request, and SDK stream types; boundary validation. |
| `src/components/prd-workspace/index.ts` | New public exports: screen, props, and port contract. |
| `src/components/prd-workspace/port.ts` | New viewer-bound read, command, subscription, and chat interface. |
| `src/components/prd-workspace/use-prd-workspace.ts` | New snapshot installation, SDK instances, local drafts, request recovery, and main-chat queue. |
| `src/components/prd-workspace/model.ts` | New pure presentation functions; no domain transitions. |
| `src/components/prd-workspace/a11y.ts` | New accessible names and shared visible copy. |
| `src/components/prd-workspace/PrdWorkspaceScreen.tsx` | New loading/error boundary and responsive workspace composition. |
| `src/components/prd-workspace/Conversation.tsx` | New actor-labelled messages, structured briefs, questions, gaps, source navigation, and inline actions. |
| `src/components/prd-workspace/Composer.tsx` | New chat input and editable queue, using the appropriate canvas handles. |
| `src/components/prd-workspace/PrdPanel.tsx` | New topic outline, progress, funds gauge, remaining items, and Close PRD controls. |
| `src/components/prd-workspace/TopicPage.tsx` | New current document, stories, sources, topic actions, and lasting topic chat. |
| `src/components/prd-workspace/QuestionsPanel.tsx` | New open/completed questions, Answered list, and brief navigation. |
| `src/components/prd-workspace/SideChat.tsx` | New NGO conversation, suggestions, completion action, and follow-up hint. |
| `src/components/prd-workspace/AnswerReview.tsx` | New answer edit buffer, impact, open points, note, and Use answer action. |
| `design/astra/src/prd-givens.ts` | New import-free scenario names and viewer/starting-state descriptions. |
| `design/astra/src/prd-fixture-data.ts` | New approved sample documents, histories, questions, and scripted responses. |
| `design/astra/src/prd-fixture-world.ts` | New sample authority: command outcomes, snapshot sequencing, persistence, and subscriptions. |
| `design/astra/src/prd-fixture-transport.ts` | New SDK text stream and final snapshot part; existing model-call probe. |
| `design/astra/src/prd-fixture-port.ts` | New fixture selection and viewer-bound `PrdPort` adapter. |
| `design/astra/src/App.tsx` | Mount the shipping screen on `#prd-workspace`. |
| `design/astra/src/components.tsx` | Add the hash route to the existing route schema. |
| `design/astra/screens.json` | Record the implementation directory and shell route. |
| `tests/at/harness/screen.ts` | Add `testId`; generalize `shellUrl` to accept a hash route. |
| `tests/at/harness/screen-host.mjs` | Add the corresponding `getByTestId` locator branch. |
| `tests/at/harness/screen.selftest.ts` | Update URL expectations while preserving Discovery behavior. |
| `tests/at/suites/req-004/_screen.ts` | Translate Discovery’s existing start value into its explicit hash route. |
| `tests/at/suites/req-036/_screen.ts` | New PRD page object, shell scenario setup, and reusable browser flows. |
| `tests/at/suites/req-036/workspace.test.ts` | Sixteen registrations with loop bodies and pending integration bodies. |
| `tests/at/suites/req-036/pending.test.ts` | Remove the sixteen moved registrations; remove the empty file if appropriate. |
| `tests/at/expected/req-036.json` | Hand-edit only the loop expectations supported by passing results. |
| `tests/at/harness/prd-workspace.selftest.ts` | Focused tests for snapshot ordering, queue races, and draft preservation; no acceptance identifiers. |

The existing technical-scope cases, suite adapter, and live adapter remain intact. No real PRD port or route is created during this stage.

The fixture world simulates server behavior; it contains no selection state, React logic, layout, or client queue. It is sample transport/data infrastructure, not a second screen implementation.

Repeated canvas handles are scoped by their containing region and accessible name. For example, panel Close PRD is located beneath `prd-close-panel`; an inline Close PRD is beneath `prd-recommendation`. Do not invent suffixed test identifiers.

Desktop follows the three-column board. Phone renders one selected surface, with the three bottom tabs. `prd-section-page` owns the single topic scroll: full document, Section chat divider, then messages. Its composer stays outside that scroll, pinned below. Opening a topic scrolls to the document’s top.

**The five hard flows**

**1. Queue while AI answers — AT-036.17**

Priya’s first send starts one main-chat SDK request. Later sends capture their text into local queue entries and clear only the matching composer draft.

The queue belongs to this actor’s session. Maya’s side chat has its own conversation and can continue independently.

Editing claims a waiting entry synchronously. The drain cannot dispatch that entry while the editor is open, and later entries cannot overtake it. Removal also acts synchronously before dispatch. Once an entry becomes `sending`, Edit and Remove disappear.

On completion:

1. Install the final snapshot, or retain a newer snapshot already received.
2. Confirm the request’s committed/refused outcome.
3. Recheck current permission, closure, and funding.
4. Dispatch the next entry with current document and conversation revisions.

Every dispatched entry has its own stable request identifier and model-call probe record. Queue insertion, editing, removal, and navigation have none.

An interrupted request becomes uncertain until reconciled. It must not be blindly resent under a new identifier. Closing the PRD stops draining and retains unsent text for recovery.

The approved review record explicitly narrows this queue to Priya’s main chat. Topic and NGO composers have ordinary in-flight protection.

**2. NGO side chat and Mark answer complete — AT-036.13**

The selected posted question provides its lasting `chatId`. Maya sends through that conversation’s SDK transport.

After “a year”, the final snapshot explicitly reports an unanswered follow-up and an unavailable completion action. The UI shows **Answer the AI’s question first.** It does not inspect whether the last message ends with `?`.

After Maya answers, the next snapshot makes completion available. Clicking it submits one `complete-answer` command. The authority checks the current conversation revision, synthesizes the clean answer, records it, and publishes it to Priya’s projection.

Only a successful snapshot moves Maya back to All questions. A refusal preserves the side chat and draft.

Maya’s own questions to the AI remain conversation messages; answer synthesis selects answer evidence rather than concatenating everything she wrote.

**3. View answer and Use answer — AT-036.14**

View answer copies the completed answer into a local buffer bound to its answer revision. It consumes no fuel.

Use answer submits that buffer and its note with one action token. The authority:

1. Validates the exact answer version and current permission.
2. Posts the structured brief as Priya’s message in the main chat.
3. Runs the AI operation with the PRD and Discovery context.
4. Records the answer, note, remaining open points, and any wording notice.
5. Publishes the complete updated snapshot.

The UI does not mark the question Answered before the authority does. If generation fails after the brief was committed, the snapshot retains that brief and the operation outcome; retry resumes the same operation without posting it again.

The returned question contains its canonical `briefTurnId`. Both successful use and later selection from Answered navigate to that exact turn.

A changed server answer makes the review action stale. The controller retains Priya’s edited text and note, shows the new authoritative answer, and requires a fresh deliberate use.

**4. Close PRD with warning, not a block — AT-036.16**

The open Dev snapshot offers `request-close` regardless of topic completion. The UI never derives availability from `confirmed === required`.

The authority reuses a passing check only when it covers the current PRD revision. Otherwise it runs the configured check. Confirming the last required topic also triggers checking **inside the authority**, not from a React effect.

If nothing remains, the authority closes the revision. Otherwise it returns the check message and a warning bound to the reviewed revision, containing Close anyway and Keep working.

Keep working records dismissal without closing. Close anyway atomically validates that warning and freezes the revision with its exact open-point list. If the document changed meanwhile, it returns a refreshed refusal/snapshot rather than closing an unseen revision.

A failed coverage score is not a closure prohibition. An operational failure to run the required check is shown honestly; it is not disguised as a failed score.

The closed snapshot removes mutation affordances, stops queue dispatch, and supplies the frozen revision to Open UI Design. It launches no planning-package or board work.

**5. Changed answer invalidates dependent topics — AT-036.08**

The authoritative answer operation owns dependency evaluation. It produces a snapshot where affected topics are Needs review, unaffected confirmations remain, and stale action tokens are unavailable.

The controller replaces the snapshot once. Progress then derives from the new required-topic states. No client graph traversal or “reset all confirmed topics” fallback exists.

The required-topic denominator changes only through an explicitly recorded required-topic-set change. Previous checks remain historical revision-linked events; they cannot authorize closure of the changed PRD.

**Acceptance evidence**

A green loop result means the real components behave correctly against the fixture contract. It does not prove the backend clauses in the same acceptance identifier. Every integration body remains explicitly pending until wiring.

| Acceptance case | Honest loop-tier assertions | Still required at integration |
|---|---|---|
| **AT-036.01** | Render seeded topics and known answers with approved Discovery revision links; repeated entry/reload preserves stable topic identities without duplicate UI records. | Kickoff seeding, bootstrap pull, real duplicate prevention, and an empty development tree until the later planning package. |
| **AT-036.02** | Author in main/topic chats; render actors, revisions, decisions, sources, and side-chat history; restore separate viewer/conversation drafts on reload. | Durable shared records across real clients, real attribution and its degraded mode, and separation from funding gates. |
| **AT-036.03** | Scripted independent questions appear together with reasons/options; dependent questions stay absent until prerequisites resolve; NGO suggestion remains unposted until Dev acts; selecting a blocked topic does not dispatch. | Real dependency-first reasoning, accessible-fact acquisition, authority decisions, and delivery to the anchored Q&A log. |
| **AT-036.04** | A supplied check identifies the four gap classes and their topics; links open the correct topic; topics become Needs review; correction and confirmation change the display; last confirmation and Close PRD each request checking as appropriate. | Actual scoring against Discovery, configured threshold, scorer evidence, and persisted revision-linked results. Fixture scores do not prove scorer quality. |
| **AT-036.05** | No effort control or per-reply receipt; pending funds remain visible; exact sample amounts survive presentation; duplicate fixture request replay does not add a displayed turn or probe call. | OpenRouter receipts, zero versus missing cost, fractional settlement, fees, reservations, reconciliation, retries, interruption accounting, and effective provider settings. No fixture settlement is production billing evidence. |
| **AT-036.06** | Close freezes the displayed revision; correct banner/open-point count; all composers and question actions disappear; Dev navigation receives that revision; NGO sees the correct next-step text. | Immutable persistence, no board writes at close, UI Design inventory, package generation after final sign-off, partial failures, deduplication, provenance, and bootstrap evidence. The package is outside this screen build. |
| **AT-036.07** | Exact gauge boundaries at 79.999%, 80%, 95%, 95.001%; textual available/pending values; funded red state can send; insufficient funds disables sends; repeated funded scripted attempts have no turn cap; reading/navigation produce no probes. | Atomic reservation, real funding/access stop precedence, top-up behavior, revocation, and absence of free-turn funding. |
| **AT-036.08** | All five states and named blockers; required progress counts; confirm/reopen actions; changed scripted answers invalidate only affected topics and actions; unaffected confirmations and denominator remain. | Correct persisted dependency graph, real AI readiness decisions, server confirmation authority, and stale-tab enforcement. |
| **AT-036.09** | Role-specific controls; direct fixture-port calls reject forbidden actions, stale tokens, and duplicates; two viewer-bound ports sharing one in-memory authority preserve independent conversations. | Authentication, membership, authorization, real simultaneous transactions, durable duplicate handling, unrelated-user denial, and projection security. Hidden controls are not authorization evidence. |
| **AT-036.10** | Long history, actor names/colors, sources, no bookmark/turn/handover/effort controls; panel and inline close controls; keyboard operation, themes, and narrow layout; NGO data projection contains no development-board content. | Real public projection and registered, duplicate-protected notification emission. |
| **AT-036.13** | Both question entry points; suggestions; “a year” follow-up; exact disabled hint; reply enables completion; clean scripted answer; return to All questions; Dev’s completed card; NGO question-to-AI excluded from answer; paid-call probes. | Real conversational behavior, synthesis quality, semantic follow-up tracking, durable delivery, authorization, and charging. |
| **AT-036.14** | Editable review, impact/open points, optional note; blue Dev brief including edits; topic text updates; wording notice in Maya’s projection; Answered navigation; duplicate use does not duplicate brief. | Real synthesis, cross-client notice delivery, source attribution, transactional use/retry, and model cost. |
| **AT-036.15** | Full current document, sources, numbered stories, separate lasting chat; plain statements after scripted edits; Dev questions/options; NGO read-only chat; persistence across visits/reload; navigation is free. | Actual PRD/Discovery context passed to the model and durable topic-chat/decision storage. |
| **AT-036.16** | Close available initially; check requested; warning lists gaps/unconfirmed topics; Keep working preserves open state; Close anyway records open points; current passing check skips another check; NGO has no close control. | Atomic check/close binding, actual scoring, stale revision handling, frozen storage, and server authority. |
| **AT-036.17** | During an observable delayed reply, send several messages; verify Add to queue; edit/remove before dispatch; assert surviving messages and probes appear in order, once each; navigation does not lose the queue. | Separate actual paid generations, durable idempotency, interruption recovery, and concurrent-client consistency. |
| **AT-036.18** | At 390×844, role-correct initial tab, badges, one-line labels, one topic scroll starting at top, pinned composer/back navigation, 44-pixel targets; repeat flows 13–16 on phone. | The same browser flows against authenticated real data and the wired route. |

Use the existing fixture pace/probe facilities. The queue scenario needs a long enough scripted response to exercise Edit and Remove reliably; it must not depend on a 20-millisecond race. Do not add a hidden screen-control API.

The existing driver’s desktop preset is 1280×800, whereas the approved board is 1280×900. Keep that distinction explicit: acceptance can retain the existing preset; the required visual review must also exercise 1280×900. Phone already matches 390×844.

**Rationale**

**Problem.** Discovery supplies the useful port/SDK/shell/test pattern, but its separate state updates, dropped second send, and single conversation cannot simply be copied. This screen has concurrent participants, multiple lasting conversations, and server decisions that affect several visible regions together.

**Interface depth.** `load`, `execute`, `subscribe`, and `chat` hide authorization, revision checking, synthesis, scoring, dependencies, persistence, and idempotency. Components ask for one outcome. They never coordinate “post brief, update topic, notify NGO, move question.” This follows boundary discipline and keeps each business invariant under one owner.

**Shared state.** Drafts, live text, and queues are separated by actor and conversation before any shared authoritative update. Priya and Maya do not acquire a workspace-wide conversational lock. The server still arbitrates shared funds and document commits. A short atomic commit is necessary; holding a global lock for an entire model generation is not.

**Synthesis decision.** This is the snapshot-replace candidate only. No comparison with unseen candidates or final synthesis decision is claimed.

**Tradeoffs accepted.**

- We accept larger responses in exchange for atomic, inspectable screen state.
- We accept non-optimistic domain actions in exchange for avoiding rollback and partial-update logic.
- We accept complete model-backed command responses initially in exchange for a smaller interface; ordinary chat still streams.
- We accept linear lookup through small topic/question lists in exchange for avoiding synchronized client indexes.
- We accept explicit fixture limitations in exchange for meaningful screen evidence without pretending to prove backend behavior.

**Alternatives considered.**

| Alternative | Why rejected |
|---|---|
| Client reducer receiving topic/question/fund deltas | Exposes transaction order and dependency rules to the client; several writers must coordinate one invariant. |
| Independent query caches for each panel | Hides fetching but exposes invalidation and cross-panel consistency to callers. Use answer becomes a coordinated refresh exercise. |
| Event-sourced client replica | Could reconcile concurrent updates, but makes the screen responsible for replay, projection evolution, and business transitions. Excessive for this contract. |
| One SDK chat reused for every conversation | Small initial surface, but callers must replace history and guard against late callbacks contaminating another conversation. |
| Optimistically edit the whole snapshot and submit it | Turns snapshot replacement into lost-update risk and makes the browser an unauthorized domain writer. |

**Open questions and risks.**

- Can the wiring backend provide a consistently ordered, viewer-specific snapshot across document state, conversations, and funds? If not, the port implementation must establish that consistency before this interface is considered implemented.
- How large will complete history become? Whole-workspace snapshots are deliberate here; pagination would be a later contract change, not an invisible cache added during implementation.
- Which existing money representation should implement exact decimal comparisons? The screen must preserve ledger precision rather than introduce a new rounding convention.
- How should an interrupted paid command resume after committing its brief but before completing generation? Wiring must preserve the request identifier and expose an honest operation outcome.
- What should Close PRD show if the scorer is unconfigured or cannot be funded? The design keeps the control available and reports the operational refusal; it does not invent a threshold or silently bypass the required check.

**Next implementation step.** Build the snapshot boundary and two scripted end-to-end scenarios—queued main-chat sends and completed NGO answer use—before expanding the remaining components and acceptance bodies.

No repository files were changed. This package does not claim test passes or a browser review. The implementation still must complete the brief’s board exercise, loop verification, prescribed Codex review, usability-hint decisions, and comment audit.