The PRD workspace is one session that owns a `Chat` per conversation and a separate document cache. The screen mounts with a port. Each `Chat` is created through `port.transport(id)`. Topics, questions, funds, and each conversation's outbox move as whole snapshots. The queue belongs to one conversation and drains inside the session.

## Problem

Discovery is one `Chat`, one transport, and a brief updated by transient stream parts. A second send during a reply is dropped. The PRD workspace has a main chat, a lasting chat per topic, and a side chat per NGO question. Dev (Priya) and the NGO (Maya) work at the same time. Messages sent while a reply is in flight must queue, stay editable, and leave as their own paid requests. Topic text, question status, and funds are one shared document. The sample-data shell has to stand in for the edge function, and the same screen tests have to run later against the real route. The chat object the wiring stage will point at an edge function has to be the same `Chat` the shell drives now.

## 1. Usage

Mount is the whole public screen API. The caller supplies a port. The port is already bound to one viewer. The screen reads the viewer from the snapshot the port returns.

```tsx
// design/astra/src/App.tsx
const port = useMemo(() => prdPort(scenario, pace), [scenario, pace]);
if (route === "prd-workspace") return <PrdWorkspace port={port} />;
```

Use answer is one session call. The list button passes the answer Maya sent. The review button passes the edited answer and the note. Both go to the main conversation, including when that pane is not on screen.

```tsx
// src/components/prd-workspace/QuestionList.tsx
<button
  data-testid={TEST_ID.useAnswer}
  onClick={() => session.useAnswer({ questionId: question.id, answerText: question.sentAnswer, note: "" })}
>
  Use answer
</button>

// src/components/prd-workspace/AnswerReview.tsx
<button
  data-testid={TEST_ID.reviewUse}
  onClick={() => session.useAnswer({ questionId, answerText, note })}
>
  Use answer
</button>
```

A loop-tier body drives the shell through the page object. The integration and drill bodies stay pending. The registrar refuses a tier map that leaves a tier unnamed, so `drill` is present even though this stage does not run it.

```tsx
// tests/at/suites/req-036/workspace.test.ts
atTest("AT-036.17", "messages queue while the AI answers", {
  surface: "ui",
  timeoutMs: { loop: 60_000 },
}, {
  loop: async (ctx) => {
    await withPrd(ctx, { scenario: "authoring", viewport: "desktop" }, async (screen) => {
      const before = await screen.modelCalls();
      await screen.composer.fill("First note");
      await screen.composer.send();
      await screen.expectAnswering();
      await screen.composer.fill("While you answer");
      await screen.composer.send();
      expect(await screen.sendLabel()).toBe("Add to queue");
      expect(await screen.queue.texts()).toEqual(["While you answer"]);
      await screen.queue.edit(0);
      expect(await screen.composer.value()).toBe("While you answer");
      expect(await screen.queue.count()).toBe(0);
      await screen.composer.send();
      await screen.queue.remove(0);
      await screen.expectReplyCount(before.length + 1);
      expect(await screen.modelCalls()).toEqual([...before, "prd-text"]);
    });
  },
  integration: async () => {
    throw new AtPending("AT-036.17", "sut-missing", "The wired PRD route is not in this stage.");
  },
  drill: async () => {
    throw new AtPending("AT-036.17", "sut-missing", "The wired PRD route is not in this stage.");
  },
});
```

Direct authority calls use the fixture port in the test process. That is the loop-tier stand-in for "call the backend directly."

```ts
const world = openPrdWorld("authoring", "test");
const dev = portFor(world, "dev");
const ngo = portFor(world, "ngo");
const loaded = await dev.load();
if (!loaded.ok) throw new Error(loaded.refusal.reason);
const refused = await ngo.command({
  kind: "freeze",
  mode: "passed",
  baseRevision: loaded.value.document.revision,
});
```

`withPrd` calls `ctx.open()` once, because the harness counts an open, then opens `#prd-workspace`. The scope world from `ctx.open()` is the existing suite binding. The screen's data is the shell scenario.

## 2. Type sketch

### `src/lib/prd-stream.ts`

Shared contract for the screen, the fixture, and the later edge port. Wire values are parsed here. Callers past this file hold branded ids.

```ts
import type { UIMessage } from "ai";

declare const brand: unique symbol;
export type TopicId = string & { readonly [brand]: "TopicId" };
export type QuestionId = string & { readonly [brand]: "QuestionId" };
export type ConversationId = string & { readonly [brand]: "ConversationId" };
export type QueueItemId = string & { readonly [brand]: "QueueItemId" };
export type Revision = number & { readonly [brand]: "Revision" };
export type Serial = number & { readonly [brand]: "Serial" };
export type Viewer = "dev" | "ngo";

export type ConversationKey =
  | { readonly kind: "main" }
  | { readonly kind: "topic"; readonly topicId: TopicId }
  | { readonly kind: "question"; readonly questionId: QuestionId };

/** One encoding. `main`, `topic:<id>`, `question:<id>`. */
export function conversationId(key: ConversationKey): ConversationId {
  throw new Error("not implemented");
}

/** Boundary parser. Rejects an unknown kind or an unbranded tail. */
export function parseConversationId(raw: string): ConversationKey {
  throw new Error("not implemented");
}

export function topicId(raw: string): TopicId {
  throw new Error("not implemented");
}
export function questionId(raw: string): QuestionId {
  throw new Error("not implemented");
}

export type TopicState = "open" | "draft" | "ready" | "confirmed" | "needs-review";

export type Topic = {
  readonly id: TopicId;
  readonly title: string;
  readonly required: boolean;
  readonly state: TopicState;
  /** Topics whose text this topic's decisions can invalidate. One list. */
  readonly affects: readonly TopicId[];
  readonly lines: readonly string[];
  readonly sources: readonly string[];
  readonly stories: readonly string[];
  readonly blocker: string | null;
  readonly gap: string | null;
};

export type QuestionStatus = "suggested" | "open" | "answering" | "complete" | "used";

export type NgoQuestion = {
  readonly id: QuestionId;
  readonly topicId: TopicId;
  readonly text: string;
  readonly why: string;
  readonly blocking: boolean;
  readonly status: QuestionStatus;
  readonly options: readonly string[];
  /** Answer text accumulated from NGO answers. A question to the AI is absent from this string. */
  readonly answerText: string;
  /** The one clean answer written at Mark answer complete. Null until then. */
  readonly sentAnswer: string | null;
  readonly impact: string;
  readonly openPoint: string | null;
  readonly openPointSettled: boolean;
};

export type Funds = {
  readonly allocationMicros: number;
  readonly settledMicros: number;
  readonly pendingMicros: number;
  readonly availableMicros: number;
  /** What one reply reserves. Send stays off when available is below this. */
  readonly holdMicros: number;
};

export type Gap = { readonly id: string; readonly topicId: TopicId; readonly text: string };

export type CoverageCheck = {
  readonly id: string;
  readonly revision: Revision;
  readonly passed: boolean;
  readonly thresholdLabel: string;
  readonly coverageLabel: string;
  readonly gaps: readonly Gap[];
  readonly openTopicIds: readonly TopicId[];
};

export type Closure = {
  readonly revision: Revision;
  readonly openPoints: readonly string[];
} | null;

export type Outgoing =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "brief"; readonly brief: AnswerBrief }
  | { readonly kind: "check" }
  | { readonly kind: "option"; readonly questionId: QuestionId; readonly optionId: string };

export type AnswerBrief = {
  readonly questionId: QuestionId;
  readonly question: string;
  readonly answer: string;
  readonly changed: boolean;
  readonly note: string;
  readonly impact: string;
  readonly openPoint: string | null;
};

export type QueueItem = { readonly id: QueueItemId; readonly outgoing: Outgoing };

export type Outbox = {
  readonly viewer: Viewer;
  readonly conversationId: ConversationId;
  readonly draft: string;
  readonly queue: readonly QueueItem[];
};

/**
 * The workspace document. Transcripts are not in here.
 * `serial` orders every snapshot, including a draft save that does not bump `revision`.
 * `checks` is append-only. The check that counts is the latest one whose revision equals `revision`.
 */
export type PrdDocument = {
  readonly serial: Serial;
  readonly revision: Revision;
  readonly discoveryRevision: number;
  readonly thresholdLabel: string;
  readonly topics: readonly Topic[];
  readonly questions: readonly NgoQuestion[];
  readonly funds: Funds;
  readonly checks: readonly CoverageCheck[];
  readonly closure: Closure;
};

export type PrdSnapshot = {
  readonly viewer: Viewer;
  readonly projectTitle: string;
  readonly document: PrdDocument;
  readonly transcripts: Readonly<Record<string, PrdUIMessage[]>>;
  readonly outboxes: readonly Outbox[];
  readonly review: { readonly questionId: QuestionId; readonly answerText: string; readonly note: string } | null;
};

export type PrdDataTypes = {
  question: { id: string; topicId: string; text: string; reason: string; options: readonly string[]; suggestedIndex: number };
  suggestion: { questionId: string; text: string; blocking: boolean };
  recommendation: { kind: "confirm" | "close"; boundRevision: number; topicId: string | null };
  gap: Gap;
  brief: AnswerBrief;
  /** Transient. Replaces the document cache. */
  document: PrdDocument;
  /** Transient. Same funds the document carries, so a funds-only tick does not require a document copy. */
  funds: Funds;
};

export type PrdUIMessage = UIMessage<never, PrdDataTypes>;

/** Built by the session at the moment of send. The transport parses it again. */
export type PrdTurnBody = {
  conversationId: ConversationId;
  baseRevision: Revision;
  userMessageId: string;
  intent: Outgoing["kind"];
  text: string;
  brief: AnswerBrief | null;
  option: { questionId: QuestionId; optionId: string } | null;
};

export type PrdRefusal = { kind: string; reason: string };
export type Result<T> = { ok: true; value: T } | { ok: false; refusal: PrdRefusal };

export function parseTurnBody(raw: unknown): PrdTurnBody {
  throw new Error("not implemented");
}
```

### `src/lib/prd-document.ts`

Pure document rules. The fixture world calls these. The screen displays the snapshot they produce and does not recompute them. The screen module does not import this file.

```ts
/** Confirmed and ready topics in `changed.affects` become needs-review. Every other confirmation stays. */
export function reviseDependents(document: PrdDocument, changed: TopicId): PrdDocument {
  // TODO: copy topics; for each id in the changed topic's affects, if state is confirmed or ready,
  // set needs-review and a blocker. Leave open, draft, and topics outside affects alone.
  // Bump revision and serial. Clear the current check by leaving `checks` as history.
  throw new Error("not implemented");
}

export function progressOf(document: PrdDocument): { confirmed: number; required: number } {
  throw new Error("not implemented");
}

/** Unrounded settled / allocation. Pending is excluded. 0.8 and 0.95 are yellow. Above 0.95 is red. */
export function gaugeOf(funds: Funds): { band: "green" | "yellow" | "red"; consumed: number } {
  throw new Error("not implemented");
}

export function currentCheck(document: PrdDocument): CoverageCheck | null {
  throw new Error("not implemented");
}

/** Last assistant text ending in "?" is an open follow-up. */
export function followUpOpen(messages: readonly PrdUIMessage[]): boolean {
  throw new Error("not implemented");
}

export function closeList(document: PrdDocument): readonly { key: string; text: string }[] {
  throw new Error("not implemented");
}

/** The only authority rule. Commands carry no viewer; the port's binding supplies it. */
export function authorize(viewer: Viewer, command: PrdCommand, document: PrdDocument): PrdRefusal | null {
  // TODO: ngo may complete-answer on a question posted to it, save its own draft, and edit its own queue.
  // dev may do every other command. A closed document refuses every command except a repeated freeze,
  // which the world answers with the existing closure.
  throw new Error("not implemented");
}
```

### `src/components/prd-workspace/port.ts`

Four methods. A transport serves one conversation. Document writes are one command.

```ts
import type { ChatTransport } from "ai";
import type { ConversationId, PrdRefusal, PrdSnapshot, PrdTurnBody, PrdUIMessage, QueueItemId, Result, Revision, TopicId, QuestionId } from "@/lib/prd-stream";

export type { Result };

/** A newer snapshot from the world: the other viewer, a command echo, or a turn that committed before its stream. */
export type WorkspaceChange = { snapshot: PrdSnapshot };

export type PrdCommand =
  | { kind: "post-question"; questionId: QuestionId; baseRevision: Revision }
  | { kind: "confirm-topic"; topicId: TopicId; baseRevision: Revision }
  | { kind: "reopen-topic"; topicId: TopicId; baseRevision: Revision }
  | { kind: "complete-answer"; questionId: QuestionId; baseRevision: Revision }
  | { kind: "freeze"; mode: "passed" | "anyway"; baseRevision: Revision }
  | { kind: "save-draft"; conversationId: ConversationId; text: string }
  | { kind: "save-review"; questionId: QuestionId; answerText: string; note: string }
  | { kind: "queue-append"; conversationId: ConversationId; itemId: QueueItemId; outgoing: import("@/lib/prd-stream").Outgoing }
  | { kind: "queue-edit"; conversationId: ConversationId; itemId: QueueItemId }
  | { kind: "queue-remove"; conversationId: ConversationId; itemId: QueueItemId };

/**
 * Everything the screen reads or writes.
 * `transport(id)` streams one conversation. `command` does not stream.
 * Mark answer complete is a command: the world performs that generation and returns the snapshot.
 * Watched generations go through the transport as a `PrdTurnBody`.
 */
export interface PrdPort {
  load(): Promise<Result<PrdSnapshot>>;
  transport(id: ConversationId): ChatTransport<PrdUIMessage>;
  subscribe(listener: (change: WorkspaceChange) => void): () => void;
  command(command: PrdCommand): Promise<Result<PrdSnapshot>>;
}
```

### `src/components/prd-workspace/session.ts`

The registry. The only `new Chat` in the program is `PrdSession.chat`. The React hook lives in this file.

```ts
import { Chat } from "@ai-sdk/react";
import type { ConversationId, ConversationKey, Outgoing, PrdSnapshot, PrdUIMessage, QuestionId, QueueItemId, TopicId } from "@/lib/prd-stream";
import type { PrdPort } from "./port";
import type { PrdView } from "./model";

export type PhoneTab = "chat" | "prd" | "questions";
export type Surface =
  | { kind: "main" }
  | { kind: "topic"; topicId: TopicId }
  | { kind: "question"; questionId: QuestionId }
  | { kind: "review"; questionId: QuestionId };

/**
 * One Chat per conversation, one document cache, one outbox per conversation.
 * `chat` is idempotent. Unmounting a pane does not stop the Chat and does not call `stop`.
 * `baseRevision` is read when a queued item actually sends, never when it is queued.
 * Ingest replaces the snapshot only when `serial` is newer, and it does not call setMessages
 * on a conversation whose phase is `sending`.
 */
export class PrdSession {
  constructor(port: PrdPort, initial: PrdSnapshot) {
    throw new Error("not implemented");
  }

  /** The Chat for this id, created once with `port.transport(id)` and the committed transcript. */
  chat(id: ConversationId): Chat<PrdUIMessage> {
    throw new Error("not implemented");
  }

  snapshot(): PrdSnapshot {
    throw new Error("not implemented");
  }

  subscribe(listener: () => void): () => void {
    throw new Error("not implemented");
  }

  openMain(): void { throw new Error("not implemented"); }
  openTopic(topicId: TopicId): void { throw new Error("not implemented"); }
  openQuestion(questionId: QuestionId): void { throw new Error("not implemented"); }
  openReview(questionId: QuestionId): void { throw new Error("not implemented"); }
  setPhoneTab(tab: PhoneTab): void { throw new Error("not implemented"); }

  /** Composer of the surface that is open. A busy conversation appends; an idle one sends. */
  setDraft(text: string): void { throw new Error("not implemented"); }
  send(): Promise<void> { throw new Error("not implemented"); }
  /** Puts the item's text back in the draft and removes it. Text items only. */
  editQueued(itemId: QueueItemId): Promise<void> { throw new Error("not implemented"); }
  removeQueued(itemId: QueueItemId): Promise<void> { throw new Error("not implemented"); }

  pickOption(questionId: QuestionId, optionId: string): void { throw new Error("not implemented"); }
  postQuestion(questionId: QuestionId): Promise<void> { throw new Error("not implemented"); }
  confirmTopic(topicId: TopicId): Promise<void> { throw new Error("not implemented"); }
  reopenTopic(topicId: TopicId): Promise<void> { throw new Error("not implemented"); }
  completeAnswer(questionId: QuestionId): Promise<void> { throw new Error("not implemented"); }

  /**
   * Submits a brief on the main conversation, then shows that conversation.
   * The main Chat is created here if the pane is not mounted.
   */
  useAnswer(input: { questionId: QuestionId; answerText: string; note: string }): Promise<void> {
    // TODO: build AnswerBrief from the question on the snapshot.
    // session.submit(mainId, { kind: "brief", brief }).
    // If the main phase is sending, submit queues. Then set surface to main and phone tab to chat.
    throw new Error("not implemented");
  }

  setReview(answerText: string, note: string): void { throw new Error("not implemented"); }
  selectAnswered(questionId: QuestionId): void { throw new Error("not implemented"); }

  /**
   * A passing check for the current revision freezes with no generation.
   * Anything else submits `{ kind: "check" }` on the main conversation.
   */
  closePrd(): Promise<void> { throw new Error("not implemented"); }
  closeAnyway(): Promise<void> { throw new Error("not implemented"); }
  keepWorking(): void { throw new Error("not implemented"); }

  private submit(id: ConversationId, outgoing: Outgoing): Promise<void> {
    // TODO: if phase is sending, command queue-append and return.
    // If availableMicros < holdMicros, set the funds refusal and return.
    // Otherwise set phase sending, build PrdTurnBody with the snapshot's revision NOW,
    // chat.sendMessage({ text }, { body }). On the acceptance of the send, command queue-remove of this item if it came from the queue.
    // onFinish sets phase ready and calls drain. onError sets phase ready and leaves the item at the head.
    throw new Error("not implemented");
  }

  private drain(id: ConversationId): void {
    // TODO: if phase is not ready, return. If the head id equals inFlight, return.
    // Take the head, set inFlight, call submit. A second drain is a no-op until finish or error.
    throw new Error("not implemented");
  }

  private ingest(next: PrdSnapshot): void {
    // TODO: if next.document.serial <= held.serial, return.
    // Replace the snapshot. For each conversation that is ready and whose Chat exists,
    // setMessages from next.transcripts when the ids differ. Skip a conversation in phase sending.
    // Notify listeners.
    throw new Error("not implemented");
  }
}

export function usePrdSession(port: PrdPort):
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; session: PrdSession; view: PrdView } {
  throw new Error("not implemented");
}
```

`confirmTopic` is the one place a command starts a watched generation. The world returns the snapshot. The session then looks at `currentCheck` and at whether every required topic is confirmed. When they are confirmed and no check exists for the new revision, the session submits `{ kind: "check" }` on main. The button called one method.

### `src/components/prd-workspace/model.ts`

`present` is pure. Buttons the viewer cannot use are `null`, using `authorize` from `prd-document.ts` so the view and the port share one rule. Components render `null` as the absence of the button.

```ts
export type PrdView = {
  readonly viewer: Viewer;
  readonly closed: boolean;
  readonly banner: { text: string; note: string | null; openDesign: boolean } | null;
  readonly revisionLabel: string;
  readonly progress: { confirmed: number; required: number };
  readonly topics: readonly { id: TopicId; title: string; stateLabel: string; blocker: string | null; selected: boolean }[];
  readonly close: {
    title: string;
    items: readonly { key: string; text: string }[];
    button: boolean;
    ngoNote: boolean;
  };
  readonly funds: { availableText: string; allocationText: string; pendingText: string | null; band: "green" | "yellow" | "red"; outOfFunds: boolean };
  readonly thread: { conversationId: ConversationId; testId: "prd-chat" | "prd-section-chat" | "prd-side-chat-messages" } | null;
  readonly document: { topicId: TopicId; stateLabel: string; lines: readonly string[]; sources: string; stories: readonly string[]; status: string; confirm: boolean; reopen: boolean } | null;
  readonly composer: {
    testIds: { root: string; input: string; send: string; queue: string };
    draft: string;
    sendLabel: "Send" | "Add to queue";
    enabled: boolean;
    queue: readonly { id: QueueItemId; text: string; editable: boolean }[];
    hint: string;
  } | null;
  readonly questions: readonly { id: QuestionId; /* status text, sent answer, view, use, open */ }[];
  readonly review: { questionId: QuestionId; answerText: string; note: string; impact: string; openPoint: string | null; useEnabled: boolean } | null;
  readonly side: { questionId: QuestionId; options: readonly string[]; completeEnabled: boolean; completeHint: string | null; devNote: string | null } | null;
  readonly phone: { tab: PhoneTab; questionsBadge: number };
  readonly readonlyBanner: boolean;
};

export function present(snapshot: PrdSnapshot, ui: { surface: Surface; phoneTab: PhoneTab; answering: ReadonlySet<string>; dismissedCheckId: string | null }): PrdView {
  throw new Error("not implemented");
}
```

`ConversationPane` is the only `useChat` call. It receives the `Chat` from `session.chat(id)` and renders messages. It does not send, queue, or read the document.

```tsx
export function ConversationPane({ chat, testId }: { chat: Chat<PrdUIMessage>; testId: string }) {
  const { messages } = useChat({ chat });
  throw new Error("not implemented");
}
```

Recommendation buttons render only when `part.boundRevision === document.revision` and the document is open. `keepWorking` hides that one message's buttons in session ui. A revision bump hides them again through the revision check.

### Invariants the types hold

- A transport cannot be asked to serve two conversations. The id is closed over at `port.transport(id)`, and `parseTurnBody` plus an id check refuse a mismatch.
- Queue items are `Outgoing` values. They are not `UIMessage`s, so a queued line is never copied into the next model request.
- `PrdCommand` has no viewer field. Authority is the port binding.
- Progress, the gauge band, the close list, the follow-up gate, and the current check are functions of the document and the transcript. Nothing stores a second copy.
- `affects` is the only dependency list. Progress, Needs review, and stale actions all read it.

## 3. Module map

Screen, under `src/components/prd-workspace/`. The barrel exports `PrdWorkspace` and the port types. The session, the view, and `useChat` stay inside the folder.

| File | Purpose |
| --- | --- |
| `src/lib/prd-stream.ts` | Ids, snapshot, stream parts, turn body, parsers. |
| `src/lib/prd-document.ts` | Pure document rules the world runs and the view reads. |
| `port.ts` | `PrdPort`, `PrdCommand`, `WorkspaceChange`. |
| `session.ts` | The registry, the queue, ingest, and `usePrdSession`. |
| `model.ts` | `present` to `PrdView`. |
| `a11y.ts` | The one list of `data-testid` values, actor names, and the follow-up hint string. |
| `PrdWorkspace.tsx` | Load, alert, then the frame. |
| `PrdFrame.tsx` | Desktop columns or phone tabs. Opens panes from the view. |
| `ConversationPane.tsx` | The only `useChat`. Renders turns, gaps, briefs, suggestions, recommendations. |
| `Composer.tsx` | Draft, queue strip, send. Test ids come from the view. |
| `TopicList.tsx` | Main-chat row, topic rows, progress, revision. |
| `TopicDocument.tsx` | The topic as a document, confirm, reopen. |
| `ClosePanel.tsx` | Still open, Close PRD, the NGO sentence. |
| `FundsGauge.tsx` | Available, pending, band, the empty-funds line. |
| `QuestionList.tsx` | Open questions, View, Use, Answered. |
| `AnswerReview.tsx` | Editable answer, note, Use answer. |
| `SideChat.tsx` | Options, complete, hint, back. The messages themselves are a `ConversationPane`. |
| `index.ts` | Public exports. |
| `src/styles.css` | Actor colors `--actor-ai`, `--actor-dev`, `--actor-ngo`, wired like the existing usage colors. |

Shell. No screen policy here. The world calls `prd-document.ts` and records a probe.

| File | Purpose |
| --- | --- |
| `design/astra/src/prd-givens.ts` | Import-free scenario table and the probe name. |
| `design/astra/src/prd-data.ts` | Seed snapshots and scripted replies. |
| `design/astra/src/prd-world.ts` | In-memory document, transcripts, outboxes, listeners, `localStorage` key `ai4good.prd.fixture.v1.<scenario>`. |
| `design/astra/src/prd-transport.ts` | One `ChatTransport` per conversation id. |
| `design/astra/src/prd-port.ts` | `prdPort`, `openPrdWorld`, `portFor`. |
| `design/astra/src/App.tsx` | Mount `PrdWorkspace` on `#prd-workspace`. |
| `design/astra/src/components.tsx` | Add `prd-workspace` to the hash enum. |
| `design/astra/screens.json` | `implementation` pointing at `src/components/prd-workspace/`. |

The shell does not render the canvas viewer switch. The scenario names the viewer. `authoring` is Priya on the canvas's mid-PRD sample ($8.80 of $20.00, revision 13, mixed topic states, retention and logo posted, success suggested). `authoring-ngo` is the same seed for Maya, in its own storage key. `answer-ready`, `check-passed`, `dependent-confirmed`, and `funds-short` are the other starts. Fund boundaries are givens whose `kind` is `funds`, and the test loops the derived list. Ratios live in the given: 0.79999, 0.8, 0.95, 0.95001.

`authoring` holds a reply for several seconds so the queue test can click. Every other scenario keeps the short test-pace delay.

Harness and tests.

| File | Purpose |
| --- | --- |
| `tests/at/harness/screen.ts` | `LocatorStep` gains `testId` and `testKey`. `shellUrl` takes the hash route. |
| `tests/at/harness/screen-host.mjs` | Chain `getByTestId`. A step with `testKey` also requires `data-testkey`. |
| `tests/at/harness/screen.selftest.ts` | Expect `#discovery` and `#discovery-review`. |
| `tests/at/suites/req-004/_screen.ts` | Map the old chat/review flag onto those two routes before calling `shellUrl`. |
| `tests/at/suites/req-036/_screen.ts` | `PrdPage` and `withPrd`. Locators import `TEST_ID`. |
| `tests/at/suites/req-036/workspace.test.ts` | The sixteen screen ids, one `atTest` each. |
| `tests/at/suites/req-036/pending.test.ts` | Remove these sixteen registrations so each id stays single. |
| `tests/at/expected/req-036.json` | Move the sixteen ids to green in the loop block. Leave them pending on integration. |

No route file under `src/routes/`. The wired route is the later stage. No second `atTest` for the two technical-scope ids that are already green.

`shellUrl(base, scenario, route, pace)` returns `/?scenario=&pace=#route`. The host chains locators, so `prd-queue` is looked up inside `prd-composer` when both composers are on the page.

## 4. How the five flows run

Each policy hop is button, then `PrdSession`, then the port. The pane only subscribes.

**Queue while the AI answers.** `Composer` calls `session.send` with no conversation id. The session reads the open surface and uses that conversation's `Chat`. The first send finds phase `ready`, stamps `baseRevision` from the snapshot, and calls `sendMessage`. Phase becomes `sending`. A later send on that same conversation appends an `Outgoing` of kind `text` through `queue-append` and leaves the model idle. Edit is `queue-edit`: the text returns to that conversation's draft and the item disappears. Remove is `queue-remove`. `onFinish` calls `drain`, which sends the head as its own turn with the revision at drain time. A second drain while `inFlight` matches the head returns. The topic chat and the side chat have their own phase and their own outbox, so Maya can type while Priya's main chat is answering. The strip uses the canvas queue ids, scoped under the composer that owns them.

**NGO side chat through Mark answer complete.** Maya opens the question from the list or from Answer it. `openQuestion` changes the surface and does not call the model. `SideChat` mounts `ConversationPane` on `session.chat(questionId)`. Suggested options write the draft. Send is that conversation's `submit`. The fixture reply to "a year" ends in a question mark. `followUpOpen` is true, so `present` disables Mark answer complete and sets the hint to the acceptance sentence `Answer the AI’s question first.` Her next reply gets an AI line that does not end in a question. The button enables. `completeAnswer` is a command, not a user bubble. The world writes one `sentAnswer` from the side transcript, leaves her questions to the AI out of that string, records one `prd-complete` probe, and publishes the snapshot. The session leaves the question surface. Her list shows the sent line. His list shows View answer and Use answer.

**View answer and Use answer.** View calls `openReview` and fills the review from `sentAnswer`. Edits call `setReview`, which persists on the snapshot. Use answer calls `session.useAnswer`. The session builds the brief, creates the main `Chat` if needed, and submits `{ kind: "brief" }` on main, queuing it when main is busy. The surface moves to main. The Dev message renders `prd-claim-brief` from the message part. The AI reply's transient document records the answer on the topic, bumps the revision, and settles the open point when the note is non-empty. A changed wording adds a relay line on the question transcript, which ingest applies because that conversation is idle. The question status becomes `used` and it sits under Answered. Selecting it opens main and scrolls to that brief. That selection does not call the model.

**Close PRD.** The button is in the view whenever the viewer is Dev and the document is open. `closePrd` reads `currentCheck`. A passing check for this revision calls `freeze` with mode `passed` and does not start a generation. Otherwise it submits `{ kind: "check" }` on main. The AI message carries gap parts and Close anyway / Keep working, bound to that revision. Keep working hides those buttons in session ui. Close anyway calls `freeze` with mode `anyway`. The world stores the open points on the closure and bumps nothing else into a second check. `present` builds the banner from the closure: the open-point count is `openPoints.length`, and the NGO note replaces Open UI Design. Composers and question actions come back as `null`. Open UI Design only reveals the local note that this preview ends here.

**A changed answer marks dependents Needs review.** A shifts turn whose script changes the swap decision commits a document through `reviseDependents(document, shiftsId)`. Technical scope is in `affects`, so a confirmed scope becomes Needs review. Users and roles is not in that list and stays confirmed. `progressOf` counts again. The recommendation part on the old reply still says the old revision, so `present` omits its button. A confirm command stamped with the old revision is refused by the world. The session never walks the dependency list itself.

Confirming the last required topic is the same check submission as Close, started by `confirmTopic` after the command returns. Reopen is a command that sets that one topic to Needs review and leaves the others.

## 5. What the loop tier can assert

The loop body drives the shell, or calls `portFor` where the case says to call the backend. The integration body throws pending. Cases 11 and 12 stay the existing scope tests.

| Id | Loop tier asserts | Left for integration |
| --- | --- | --- |
| 01 | Six stable topic ids, sources naming the Discovery revision, a second `load` and a reload that do not add topics. | PM requirements, the bootstrap item, and an empty development tree. The shell has no board. |
| 02 | Reload keeps the composer draft, a queued item, the main transcript, a topic transcript, and a side transcript. No control names a turn owner. | Token attribution, and that a failed attribution adds no funding bypass. |
| 03 | The suggestion card reads `Suggested question for Maya (NGO) · not posted yet`. Post to Maya is present for Dev and absent for Maya. After post, the question is on the list. Opening a topic does not post it. The fixture's next question appears only after the scripted answer. | Delivery into the Q&A log and PM anchors. |
| 04 | Closing, or confirming the last topic, shows `prd-check-gap` rows with Open buttons. Those topics read Needs review. A topic-chat reply that the script treats as the fix clears that gap, and confirm is offered again. The threshold label is the one in the given. | The real scorer against Discovery, and that the threshold came from configuration rather than the fixture string. |
| 05 | No receipt node under a reply. The composer has no effort control. Each scripted turn appends one probe, and a repeated drain of the same message id does not append another. | OpenRouter settlement, fractional cents, a real zero, missing cost left pending, ledger rows, and provider settings. |
| 06 | The banner text, `with K open points` after Close anyway, Open UI Design for Dev, the NGO sentence for Maya, and the readonly banner with no composer and no question actions. | Board writes, the planning package, resume, rebilling, and acceptance status Not run. |
| 07 | Gauge text `$8.80 left of $20.00` on `authoring`. `data-band` at the four given ratios. Pending text while a reply is held. Send off and `prd-usd-out` on `funds-short`. Topic clicks, source clicks, and opening a question leave the probe list unchanged. | Top-up versus revocation, and proof that no Discovery free-turn counter was consulted. |
| 08 | All five state labels, blockers, and the confirmed-out-of-required line. Confirm and Reopen render for Dev only. Reopen sets Needs review. On `dependent-confirmed`, a shifts reply moves scope to Needs review, leaves users confirmed, lowers the progress count, and drops the old recommendation button. | PM build status, and that the required-topic count was not rewritten. The fixture denominator is fixed. |
| 09 | In-process: Dev confirm, post, use, and freeze succeed. NGO freeze, confirm, and post refuse. NGO complete on a posted question succeeds. A second confirm at the same revision returns the same snapshot. Two sends on one world keep both lines in order. A stale `baseRevision` refuses. On the shell: an ordinary AI reply has no state-action button. | HTTP membership, unrelated signed-in users, and stale tabs against the edge. |
| 10 | `data-actor` and the written names on `prd-turn` inside `prd-chat`. No bookmark and no handover control. Close sits in `prd-close-panel` and, on `check-passed`, inside `prd-recommendation`. Composer has no effort control. Keyboard reaches Send. Narrow and both color schemes still show the close button and the composer. The NGO shell has no development-tree wording. | The public page, and gap-report or package notifications. |
| 13 | From `authoring-ngo`: open from the list and from Answer it, options, input, Send. After the scripted "a year" path, the hint is the acceptance sentence and complete is disabled. After her reply, complete enables. The list then shows the scripted clean answer. A `?` line she sends is answered in the side chat and is absent from `sentAnswer`. The probe list gains `prd-text` for the replies and `prd-complete` for the command. The gauge's pending or settled value moves. | That the charge was a real OpenRouter debit against PRD funds. |
| 14 | On `answer-ready`: View shows the editable answer, impact, open point, and note. Use from the list posts `prd-claim-brief` as a Dev message and an AI reply that names the topic. Use from the review with a changed answer and a note shows those lines in the brief, the topic document contains the note, and the question is under Answered. Selecting it scrolls the main chat to that brief. | The NGO's other browser receiving the wording notice live. The loop tier checks the relay line by reloading the NGO scenario's world after the Dev command, or by `portFor` on the same world. A second browser is not this shell. |
| 15 | Opening a topic shows `prd-section` lines, state, status, and sources, and for technical scope the numbered stories. The document region contains no prior user lines. Those lines are under `prd-section-chat`. A scripted change appears as a plain line on the document. Shift questions render as `prd-question` with options. The NGO scenario shows the same document and no topic composer, with the line that points to Questions. Leaving and reopening shows the same topic transcript. | That the model was given the Discovery document. The fixture reply is scripted. The test can assert the turn body the transport recorded, which is the client contract, not the model prompt. |
| 16 | On `authoring`, Close PRD is enabled, the still-open list has `prd-close-remaining-item` rows, and the press shows Close anyway and Keep working. Keep working leaves the revision unclosed. Close anyway shows the banner with open points. On `check-passed`, Close closes with no new `prd-check` probe. The NGO scenario shows `Only Priya can close the PRD.` and no `prd-close-button`. | The closed revision stored in the database, and the open points on that row. |
| 17 | The queue behavior in the usage sketch: Add to queue, edit back into the composer, remove, one probe for the sent message, a second probe only for a message that was still queued at drain. | That each send was its own billed generation. The probes are the shell's stand-in. |
| 18 | At 390×844 the tab bar has the three tabs. Dev starts on Chat and Maya on Questions. Labels fit their buttons. An opened topic is `prd-section-page` with the document first and `prd-section-back`. The composer stays in view. The flows of 13 to 16 are run again at this viewport, and the named buttons report a box at least 44 pixels tall. | Nothing of the phone layout itself. Wiring repeats the same body. |

Loop bodies that need a held reply use the `authoring` hold. Navigation cases assert `modelCalls()` is unchanged across the clicks.

## 6. Rationale

The public surface of the screen is `PrdWorkspace({ port })`. The public surface of the data is `load`, `transport(id)`, `subscribe`, and `command`. Behind that, the session hides Chat lifetime, the per-conversation queue, revision stamping at drain time, check-versus-freeze, the brief as a main-chat message, follow-up gating, and snapshot ordering by serial. Components receive a view where illegal buttons are already `null`.

The document cache and the transcripts have one writer each. The world writes the snapshot. Each `Chat` writes its own live messages. Ingest copies a transcript into a Chat only while that conversation is idle, so a stream is not overwritten by the snapshot that was committed at the start of the turn. Two viewers share a world and merge by taking the newer serial, never by patching fields. That is the whole answer to "what if both write."

The fixture world is allowed to call `reviseDependents`, `authorize`, `followUpOpen`, and `gaugeOf`. Those rules then exist once, and the shell does not grow a second copy. Mark answer complete stays a command because the canvas does not add a user line for it. The world still records a generation probe, so the loop tier can see the charge event. Watched replies, the brief, and the completion check are the turns that go through `Chat`.

**Tradeoffs.**

- The session class is the large module. Call sites stay short because of that.
- A queued completion check is a queue row labeled as a check, and it runs at the revision of drain time. The canvas drops Close while busy. This design keeps the click.
- Review text and composer text persist through commands. Phone tab and the open pane do not. Reload returns to Chat for Dev and Questions for Maya.
- `ctx.open()` still builds the scope world the suite is bound to. The screen ignores it. Rebinding the suite would disturb the two scope cases.
- Fund color uses settled divided by allocation. Pending is text, and a separate reserved amount, and it does not move the band.
- The queue scenario holds the reply long enough to click. The rest of the suite stays on the short delay.

**Alternatives that lost.**

- One shared `Chat` with a conversation id in the body. The port looks smaller, and every caller then filters messages, shares one status bit, and queues one conversation behind another. The transport becomes a multiplexer. The interface hides less and leaks the routing into the view.
- A single store that also owns transcripts, with `useChat` copying messages in. Two owners of the same lines. A stream tick and a snapshot tick diverge, and the next edit fixes one of them.
- A port method per button, with the component deciding queue-versus-send and check-versus-freeze. The port gets wide and the policy sits in the button. The command union plus `submit` keeps that policy in the session.
- Putting the queue into the `Chat` as unsent messages. The AI SDK has no queue, and those messages would be sitting in the list `sendMessages` forwards. The outbox stays outside the `Chat` until drain.

**Risks.**

- If a future `useChat` cleanup calls `stop` on unmount, a topic switch will abort a reply the session still means to drain. `ConversationPane` must not call `stop`. This wants a quick check against the installed `@ai-sdk/react` when implementation starts.
- Ingest that setMessages during `sending` would flash the committed reply over the stream. The skip is load-bearing.
- `shellUrl`'s third argument changes, and the Discovery page object plus `screen.selftest.ts` have to move with it.
- The canvas attribute for a used answer still says `claimed`. The domain status is `used`, and the visible words are "Use answer" and "Used by Priya." A test that asserts the old attribute will fail on purpose.
- Case 14's live notice to Maya is proved in one world through `portFor` and ingest, not by two browsers.
- Desktop viewport in the harness is 1280×800 and the canvas is 1280×900. Columns scroll, so the controls stay reachable. A position that assumes 900 will clip.

**Next implementation step.** Write `prd-stream.ts` and `prd-document.ts` with the parsers and the pure functions, and a unit test for `reviseDependents`, `gaugeOf`, `followUpOpen`, and `authorize`, before any component.

This is one candidate. Arena records the synthesis.