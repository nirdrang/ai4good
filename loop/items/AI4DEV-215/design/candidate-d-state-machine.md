# Candidate design (opus runner): one domain state machine for the PRD workspace screen build

Direction: ONE DOMAIN STATE MACHINE. One pure `step(state, input) -> { state, effects }` over a normalized
`PrdWorkspaceState`. The server sends facts (full entities, with a sequence number). The UI sends typed commands.
The reducer returns effects as data, and a small runtime runs them. The lifecycle rules (topic, NGO question,
close, funds band, who may do what) live once, as pure tables in `src/lib/prd-machine.ts`. The fixture world uses
them to apply changes. The client uses them only as guards. The send queue and the close flow are client machines
inside the reducer. Components are thin views over selectors that return data only. Each action in a view model
is a `PrdCommand` value or `null`, so "the control is absent" and "the action is not allowed" are the same fact.

---

## 0. Grounding facts this design depends on (read in the tree)

- The canvas (`Main.dc.html`, `Phone.dc.html`) has 88 and 91 `data-testid` handles. Item rows carry
  `data-testkey`, but the brief allows copying only `data-testid`. Tests therefore pick one item of a list by its
  text. The `testId` locator step takes an optional `text` filter (Playwright `getByTestId(id).filter({ hasText })`).
  This is still one locator step kind. It is the only thing this design adds beyond the lead's settled harness
  change.
- `prd-readonly-banner` on the canvas is the NGO notice ("Priya works on the PRD with the AI here."). AT-036.06
  also names it for the closed workspace. This design shows it whenever the viewer cannot write in the main chat:
  for the NGO always, and for the developer after close, with the closed text. This is my reading of the spec, not
  a ruling. Flag it to the founder if the build follows it.
- The canvas prototype switch (`prototype-viewer-switch`) is not part of the screen (review record, version 20).
  This design puts it in the shell chrome in `design/astra/src/App.tsx`. Loop tests use it to change viewer on the
  same page, so both viewers see one fixture world. The integration tier will open a second signed-in page instead.
- In the canvas, section send and side-chat send are off while the AI answers (`secBusy`, `threadBusy`). Only the
  main composer queues. This design keeps that per-chat policy, but every chat uses the same outbox machine.
- An `atTest` body must call `ctx.open()` or consume a capture, unless it throws first. The loop bodies call
  `ctx.open()` on the existing `scope` binding and do not use the world.
- `screen-host.mjs` `locate` has only role and text branches today. `shellUrl` hard-codes the Discovery hashes.
- `useChat` (`@ai-sdk/react` 4) runs one request per `Chat` at a time and does not queue. Discovery drops a second
  send. The PRD queue therefore must live above `Chat`.

---

## 1. Caller usage first

### 1.1 README (what a developer reads in `src/components/prd-workspace/index.ts`)

```
PrdWorkspaceScreen renders the shared PRD workspace for one viewer (developer or NGO) on any PrdPort.

  <PrdWorkspaceScreen port={port} onOpenUiDesign={() => navigate(...)} />

The port is the only way the screen reads or writes. It has five members:
  load()            the viewer's snapshot: entities, chats the viewer can read, the viewer's drafts, and seq
  chat              one ChatTransport for every chat; the request body names the chat (main, topic:<id>, side:<id>)
  command(c)        every non-chat write (post, confirm, reopen, complete, close); returns the events it caused
  subscribe(seq,f)  events after seq: the other human's work and AI turns the viewer did not start
  saveDraft(k,t)    this viewer's draft for one box; best effort

Inside, one store holds one reducer. Commands from the UI and events from the port are its only inputs.
Navigation is a separate slice whose reducer cannot return effects, so navigation can never call the model.
The sample-data shell gives a fixture port. Screen wiring gives the edge-function port. Nothing else changes.
```

### 1.2 Call site: the shell mount (`design/astra/src/App.tsx`)

```tsx
if (route === "prd-workspace") {
  const { scenario, pace, viewer } = prdFixtureSelection();
  return (
    <PrdShell scenario={scenario} viewer={viewer} onViewer={switchPrdViewer}>
      <PrdWorkspaceScreen
        key={`${scenario}:${pace}:${viewer}`}
        port={prdFixturePort(scenario, pace, viewer)}
        onOpenUiDesign={showPrdUiDesignNote}
      />
    </PrdShell>
  );
}
```

`PrdShell` is shell chrome only: the `prototype-viewer-switch` buttons and the `prd-ui-design-note` line. It has no
screen logic. Changing the viewer calls `history.replaceState` with `viewer=ngo|dev` and remounts the screen on a
new port over the same cached fixture world.

Screen wiring later adds `src/routes/prd/$organizationId.$projectId.tsx`, which does the same with
`prdPort({ organizationId, projectId })`.

### 1.3 Call site: one interaction, Use answer from the review (`AnswerReview.tsx`)

```tsx
export function AnswerReview() {
  const review = usePrd(selectAnswerReview);
  const dispatch = useDispatch();
  if (!review) return null;
  return (
    <section data-testid={TID.answerReview} aria-label={NAME.answerReview}>
      <Button variant="link" onClick={() => dispatch(review.back)}>{TEXT.allQuestions}</Button>
      <QuestionHeading q={review.heading} />
      <label>
        {TEXT.answerEditable}
        <Textarea data-testid={TID.answerReviewAnswer} value={review.answer}
          onChange={(e) => dispatch({ type: "draft", key: review.answerKey, text: e.target.value })} />
      </label>
      <BriefRows rows={review.rows} />
      <label>
        {TEXT.noteForAi}
        <Textarea data-testid={TID.answerReviewNote} value={review.note}
          onChange={(e) => dispatch({ type: "draft", key: review.noteKey, text: e.target.value })} />
      </label>
      <Button data-testid={TID.answerReviewClaim} disabled={!review.use}
        onClick={() => review.use && dispatch(review.use)}>{TEXT.useAnswer}</Button>
      <p>{TEXT.useAnswerHelp}</p>
    </section>
  );
}
```

The component does not know the rules. `review.use` is `{ type: "answer.use", questionId, from: "review" }` or
`null` (main chat busy, funds out, closed, or viewer is not the developer). The reducer reads the edited answer and
the note from the draft slice, so the text on screen and the text sent cannot differ.

### 1.4 Call site: one test body (`tests/at/suites/req-036/workspace.test.ts`)

```ts
atTest('AT-036.17', 'Messages sent while the AI answers wait in a queue and stay editable', {
  loop: (ctx) => withPrd(ctx, { scenario: 'queue', viewer: 'dev', viewport: 'desktop' }, async (prd) => {
    const before = await prd.modelCalls();
    await prd.composer.write('What does each reply cost?');
    await prd.composer.send();
    await prd.chat.waitAnswering();
    expect(await prd.composer.sendLabel()).toBe('Add to queue');
    for (const text of ['First queued', 'Second queued', 'Third queued']) {
      await prd.composer.write(text);
      await prd.composer.send();
    }
    expect(await prd.queue.texts()).toEqual(['First queued', 'Second queued', 'Third queued']);
    await prd.queue.edit('Second queued');
    expect(await prd.composer.value()).toBe('Second queued');
    await prd.queue.remove('Third queued');
    expect(await prd.queue.texts()).toEqual(['First queued']);
    await prd.chat.waitIdle(10_000);
    expect((await prd.chat.devTexts()).slice(-2)).toEqual(['What does each reply cost?', 'First queued']);
    expect((await prd.modelCalls()).length - before.length).toBe(2);
  }),
  default: wiringPending('AT-036.17'),
});
```

`wiringPending(id)` returns a body that throws `AtPending(id, 'sut-missing', 'The PRD workspace backend is wired
in screen wiring.')`. The integration and drill tiers keep the red shape the manifest already declares.

---

## 2. Type sketch

Doc comments state intent and invariants for this review. At fill-in, keep only the kinds the project keeps
(doc comments on the public port and on `prd-stream.ts` exports). Remove the `// TODO` pseudocode as each body is
written.

### 2.1 `src/lib/prd-stream.ts` (the contract shared by the screen, the fixture, and the edge functions)

```ts
import type { UIMessage } from "ai";

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type TopicId = Brand<string, "TopicId">;
export type DevQuestionId = Brand<string, "DevQuestionId">;
export type NgoQuestionId = Brand<string, "NgoQuestionId">;
export type MessageId = Brand<string, "MessageId">;
export type RequestId = Brand<string, "RequestId">;
export type TurnId = Brand<string, "TurnId">;
export type CheckId = Brand<string, "CheckId">;
export type Revision = Brand<number, "Revision">;
export type Micros = Brand<number, "Micros">;

export type Role = "dev" | "ngo";
export type Actor = "ai" | Role;
export type Person = { role: Role; name: string; label: string };
export type Viewer = { role: Role; name: string };

/** Every chat the workspace has. Main and topic chats: the developer writes. Side chats: the NGO writes. */
export type ChatKey = "main" | `topic:${TopicId}` | `side:${NgoQuestionId}`;

export type ReviewCause =
  | { kind: "reopened" }
  | { kind: "changed" }
  | { kind: "dependency"; on: TopicId }
  | { kind: "check-gap"; gap: string };

/** Only the AI sets `ready`. Only the developer sets `confirmed`, or `needs-review` with cause `reopened`. */
export type TopicState =
  | { kind: "open" }
  | { kind: "draft" }
  | { kind: "ready" }
  | { kind: "confirmed"; at: Revision }
  | { kind: "needs-review"; because: ReviewCause };

/** The topic as a document at the current revision. It never holds chat history. */
export type TopicDocument = { statements: string[]; sources: string[]; stories: string[] | null };

export type Topic = {
  id: TopicId;
  title: string;
  required: boolean;
  dependsOn: TopicId[];
  state: TopicState;
  document: TopicDocument;
};

export type DevQuestion = {
  id: DevQuestionId;
  topicId: TopicId;
  text: string;
  why: string;
  options: { id: string; label: string }[];
  suggestedId: string;
  state: { kind: "asked" } | { kind: "answered"; optionId: string };
};

/**
 * suggested -> posted -> answering(followUp) -> complete -> used.
 * Mark answer complete is legal only in answering with followUp "none".
 * The server decides followUp; the client never reads a question mark.
 */
export type NgoQuestionState =
  | { kind: "suggested"; inMessage: MessageId }
  | { kind: "posted" }
  | { kind: "answering"; followUp: "pending" | "none" }
  | { kind: "complete"; answer: string }
  | { kind: "used"; answer: string; changed: boolean; briefMessage: MessageId };

export type NgoQuestion = {
  id: NgoQuestionId;
  topicId: TopicId;
  blocking: boolean;
  text: string;
  why: string;
  options: string[];
  impact: string;
  openPoint: string | null;
  state: NgoQuestionState;
};

export type Funds = { allocation: Micros; spent: Micros; pending: Micros; replyHold: Micros };

export type CompletionCheck = {
  id: CheckId;
  revision: Revision;
  outcome: "pass" | "gaps";
  coverageText: string;
  thresholdText: string;
  gaps: { topicId: TopicId; text: string }[];
  unconfirmed: TopicId[];
  openBlocking: NgoQuestionId[];
};

export type Closure = { revision: Revision; openPoints: number };

export type BriefRow = { label: string; text: string };

/** Parts on persisted messages refer to entities by id. The view reads their current state, so old cards go stale. */
export type PrdDataTypes = {
  event: PrdEvent;
  brief: BriefRow[];
  "ngo-question": { questionId: NgoQuestionId };
  "dev-questions": { questionIds: DevQuestionId[] };
  check: { checkId: CheckId };
  "close-ask": { checkId: CheckId };
  recommendation: { kind: "close"; revision: Revision };
  "section-link": { topicId: TopicId };
  updated: { topicIds: TopicId[] };
  line: { text: string; topicId: TopicId | null };
};

export type PrdMessageMeta = { actor: Actor | "system"; at: string; clientRequestId: RequestId | null };
export type PrdUIMessage = UIMessage<PrdMessageMeta, PrdDataTypes>;

/** Facts. Each carries the whole entity, so applying one twice changes nothing. `seq` orders and deduplicates. */
export type PrdEvent = { seq: number } & (
  | { kind: "revision"; revision: Revision }
  | { kind: "topic"; topic: Topic }
  | { kind: "topic-set"; order: TopicId[]; reason: string; revision: Revision }
  | { kind: "dev-question"; question: DevQuestion }
  | { kind: "ngo-question"; question: NgoQuestion }
  | { kind: "message"; chat: ChatKey; message: PrdUIMessage }
  | { kind: "turn"; chat: ChatKey; turn: TurnId; phase: "started" | "finished" }
  | { kind: "funds"; funds: Funds }
  | { kind: "check"; check: CompletionCheck }
  | { kind: "closure"; closure: Closure }
);

export type DraftKey =
  | "main"
  | `topic:${TopicId}`
  | `side:${NgoQuestionId}`
  | `review-answer:${NgoQuestionId}`
  | `review-note:${NgoQuestionId}`;

export type PrdSnapshot = {
  seq: number;
  viewer: Viewer;
  project: { title: string; organizationName: string };
  people: Person[];
  revision: Revision;
  topics: Topic[];
  devQuestions: DevQuestion[];
  ngoQuestions: NgoQuestion[];
  chats: { key: ChatKey; messages: PrdUIMessage[]; turn: TurnId | null }[];
  funds: Funds;
  check: CompletionCheck | null;
  closure: Closure | null;
  drafts: Partial<Record<DraftKey, string>>;
  picks: Partial<Record<DevQuestionId, string>>;
};

export type PrdChatIntent =
  | { kind: "text"; text: string }
  | { kind: "answers"; answers: { questionId: DevQuestionId; optionId: string }[]; note: string }
  | { kind: "use-answer"; questionId: NgoQuestionId; answer: string | null; note: string };

export type PrdChatRequestBody = {
  chat: ChatKey;
  clientRequestId: RequestId;
  baseRevision: Revision;
  intent: PrdChatIntent;
};

export type PrdPortCommand = { requestId: RequestId } & (
  | { op: "post-question"; questionId: NgoQuestionId; baseRevision: Revision }
  | { op: "confirm-topic"; topicId: TopicId; baseRevision: Revision }
  | { op: "reopen-topic"; topicId: TopicId; baseRevision: Revision }
  | { op: "complete-answer"; questionId: NgoQuestionId }
  | { op: "request-close"; baseRevision: Revision }
  | { op: "close"; checkId: CheckId | null; baseRevision: Revision; anyway: boolean }
);

export type PrdRefusal = {
  kind: "forbidden" | "stale-revision" | "funds" | "closed" | "not-allowed-now" | "invalid";
  reason: string;
};
```

### 2.2 `src/lib/prd-machine.ts` (lifecycle rules, written once)

The fixture world applies changes with these functions. The client reducer and selectors use the same
functions as guards. Screen wiring can port them to the edge function, or import them if the Deno bundle can
reach `src/lib`.

```ts
export type Authority = { [K in PrdPortCommand["op"] | "send:main" | "send:topic" | "send:side"]: readonly Role[] };

export const AUTHORITY: Authority = {
  "send:main": ["dev"], "send:topic": ["dev"], "send:side": ["ngo"],
  "post-question": ["dev"], "confirm-topic": ["dev"], "reopen-topic": ["dev"],
  "complete-answer": ["ngo"], "request-close": ["dev"], close: ["dev"],
};

export function sendAction(chat: ChatKey): "send:main" | "send:topic" | "send:side" {
  throw new Error("not implemented");
}

export function canConfirm(topic: Topic, gapOpen: boolean): boolean {
  // TODO: state is ready, or needs-review with a cause other than check-gap while gapOpen
  throw new Error("not implemented");
}

export function canReopen(topic: Topic): boolean {
  throw new Error("not implemented");
}

/** A developer message in a topic chat on a confirmed topic: the topic and each topic that depends on it go to needs-review. */
export function afterTopicChange(topics: readonly Topic[], changed: TopicId): Topic[] {
  // TODO: changed: confirmed -> needs-review{changed}; draft stays draft
  //       each t with changed in t.dependsOn (transitively) and confirmed or ready -> needs-review{dependency, on: changed}
  //       every other topic is returned unchanged (unaffected confirmations stay)
  throw new Error("not implemented");
}

export function canMarkComplete(q: NgoQuestion): boolean {
  // TODO: q.state.kind === "answering" && q.state.followUp === "none"
  throw new Error("not implemented");
}

export function composeBrief(q: NgoQuestion, edits: { answer: string | null; note: string }): BriefRow[] {
  // TODO: Question, Maya's answer, "I changed it to" when edits.answer differs, What it changes (impact),
  //       To discuss (openPoint) when present, My note when non-empty
  throw new Error("not implemented");
}

export type Band = "green" | "yellow" | "red";

/** Unrounded consumed share: green below 80%, yellow from 80% through 95%, red above 95%. */
export function fundsBand(f: Funds): Band {
  // TODO: consumed = (spent + pending) * 100_000 compared with allocation * 80_000 and * 95_000 in integers
  throw new Error("not implemented");
}

export function available(f: Funds): Micros {
  throw new Error("not implemented");
}

export function canAffordReply(f: Funds): boolean {
  throw new Error("not implemented");
}

export function checkPassedFor(check: CompletionCheck | null, revision: Revision): boolean {
  throw new Error("not implemented");
}
```

Open question on the band: "consumed" counts settled spend only, or spend plus pending? The contract says to
show spent as the bar and pending as hatched. The sketch counts both. The lead should confirm.

### 2.3 `src/components/prd-workspace/port.ts`

```ts
import type { ChatTransport } from "ai";

export type Result<T> = { ok: true; value: T } | { ok: false; refusal: PrdRefusal };

/** Everything the PRD workspace reads or writes. Every write is checked again by the backend. */
export interface PrdPort {
  load(): Promise<Result<PrdSnapshot>>;
  /** One transport for all chats. The body is a PrdChatRequestBody. The stream carries `data-event` parts. */
  readonly chat: ChatTransport<PrdUIMessage>;
  /** Returns the events the command caused. A repeated requestId returns the same events and adds none. */
  command(command: PrdPortCommand): Promise<Result<PrdEvent[]>>;
  subscribe(afterSeq: number, listener: (events: PrdEvent[]) => void): () => void;
  saveDraft(key: DraftKey, text: string): Promise<void>;
}
```

### 2.4 `src/components/prd-workspace/state.ts`

```ts
type Table<K extends string, V> = { order: K[]; byId: Record<K, V> };

export type Outgoing = PrdChatIntent;
export type QueueItemId = Brand<string, "QueueItemId">;

/** One slot in flight, by type. The queue drains in order; the reducer starts the next item in the same step. */
export type Outbox = {
  busy: null | { kind: "local"; requestId: RequestId; intent: Outgoing } | { kind: "remote"; turn: TurnId };
  queue: { id: QueueItemId; intent: Outgoing; text: string }[];
  halted: PrdRefusal | null;
};

export type ChatLog = {
  messages: Table<MessageId, PrdUIMessage>;
  optimistic: Partial<Record<RequestId, PrdUIMessage>>;
  outbox: Outbox;
};

export type CloseFlow =
  | { kind: "idle" }
  | { kind: "requested"; requestId: RequestId; revision: Revision }
  | { kind: "warned"; checkId: CheckId }
  | { kind: "dismissed"; checkId: CheckId }
  | { kind: "closing"; requestId: RequestId };

export type PhoneTab = "chat" | "prd" | "questions";

export type Nav = {
  center: { kind: "main" } | { kind: "topic"; topicId: TopicId };
  side: { kind: "list" } | { kind: "side-chat"; questionId: NgoQuestionId } | { kind: "review"; questionId: NgoQuestionId };
  phoneTab: PhoneTab;
  answeredOpen: boolean;
  focus: { message: MessageId; nonce: number } | null;
};

export type PrdWorkspaceState = {
  seq: number;
  viewer: Viewer;
  project: PrdSnapshot["project"];
  people: Person[];
  revision: Revision;
  topics: Table<TopicId, Topic>;
  devQuestions: Table<DevQuestionId, DevQuestion>;
  ngoQuestions: Table<NgoQuestionId, NgoQuestion>;
  chats: Partial<Record<ChatKey, ChatLog>>;
  funds: Funds;
  check: CompletionCheck | null;
  closure: Closure | null;
  closeFlow: CloseFlow;
  drafts: Partial<Record<DraftKey, string>>;
  picks: Partial<Record<DevQuestionId, string>>;
  calls: Partial<Record<RequestId, PrdPortCommand>>;
  refusal: { where: ChatKey | "workspace"; refusal: PrdRefusal } | null;
  nav: Nav;
};

export type NavCommand =
  | { type: "nav.main" }
  | { type: "nav.topic"; topicId: TopicId }
  | { type: "nav.side-chat"; questionId: NgoQuestionId }
  | { type: "nav.review"; questionId: NgoQuestionId }
  | { type: "nav.list" }
  | { type: "nav.phone-tab"; tab: PhoneTab }
  | { type: "nav.answered-toggle" }
  | { type: "nav.answered"; questionId: NgoQuestionId };

export type PrdCommand =
  | NavCommand
  | { type: "draft"; key: DraftKey; text: string }
  | { type: "pick"; questionId: DevQuestionId; optionId: string }
  | { type: "side.option"; questionId: NgoQuestionId; label: string }
  | { type: "send"; chat: ChatKey }
  | { type: "queue.edit"; chat: ChatKey; item: QueueItemId }
  | { type: "queue.remove"; chat: ChatKey; item: QueueItemId }
  | { type: "question.post"; questionId: NgoQuestionId }
  | { type: "answer.complete"; questionId: NgoQuestionId }
  | { type: "answer.use"; questionId: NgoQuestionId; from: "list" | "review" }
  | { type: "topic.confirm"; topicId: TopicId }
  | { type: "topic.reopen"; topicId: TopicId }
  | { type: "close.request" }
  | { type: "close.anyway" }
  | { type: "close.keep" };

export type PrdInput =
  | { kind: "command"; command: PrdCommand }
  | { kind: "events"; events: PrdEvent[] }
  | { kind: "snapshot"; snapshot: PrdSnapshot }
  | { kind: "call.settled"; requestId: RequestId; result: Result<PrdEvent[]> }
  | { kind: "stream.finished"; chat: ChatKey; message: PrdUIMessage }
  | { kind: "stream.failed"; chat: ChatKey; refusal: PrdRefusal };

export type PrdEffect =
  | { kind: "stream"; chat: ChatKey; body: PrdChatRequestBody; message: PrdUIMessage }
  | { kind: "call"; command: PrdPortCommand }
  | { kind: "persist-draft"; key: DraftKey; text: string }
  | { kind: "resync" };

export type Step = { state: PrdWorkspaceState; effects: PrdEffect[] };

export function initialState(snapshot: PrdSnapshot, isPhone: boolean): PrdWorkspaceState {
  // TODO: tables from arrays; empty outbox per chat; nav.phoneTab = viewer ngo ? "questions" : "chat"
  throw new Error("not implemented");
}
```

### 2.5 `src/components/prd-workspace/reducer.ts`

```ts
export function step(state: PrdWorkspaceState, input: PrdInput): Step {
  // TODO:
  //   switch input.kind
  //     command        -> isNav(c) ? { state: { ...state, nav: stepNav(state, c) }, effects: [] } : command(state, c)
  //     events         -> applyEvents(state, events)
  //     snapshot       -> keep nav, drafts typed since load, and outbox queues; replace the rest
  //     call.settled   -> ok: applyEvents; refusal: state.refusal; delete calls[requestId]; closeFlow back to idle on refusal
  //     stream.*       -> outbox.finish / outbox.fail for that chat; finished upserts the message
  //   then return settle(next, effects)
  throw new Error("not implemented");
}

/** Pure navigation. Its type returns no effects, so navigation can never call the model or spend money. */
export function stepNav(state: PrdWorkspaceState, command: NavCommand): Nav {
  // TODO: nav.topic -> center topic, phoneTab "prd"; nav.side-chat -> phoneTab "questions";
  //       nav.answered -> center main, phoneTab "chat", focus { message: q.state.briefMessage, nonce+1 }
  throw new Error("not implemented");
}

function command(state: PrdWorkspaceState, c: Exclude<PrdCommand, NavCommand>): Step {
  // TODO:
  //   draft        -> drafts[key] = text; effect persist-draft (the runtime debounces per key)
  //   side.option  -> drafts[side:q] = label (no send)
  //   send         -> intent from drafts (and picks for a topic with asked dev questions); empty intent: no-op
  //                   guard AUTHORITY[sendAction(chat)] includes viewer.role, and no closure
  //                   outbox.offer(log.outbox, intent, policy(chat)); clear the draft only when accepted
  //   queue.edit   -> outbox.take(item): drafts[chat] = existing ? existing + " " + text : text
  //   queue.remove -> outbox.take(item), drop it
  //   answer.use   -> intent { use-answer, answer: edited answer when it differs, else null, note }
  //                   then the same path as send on chat "main"; nav center main, side list
  //   answer.complete -> call complete-answer; nav.side = list now (the canvas returns Maya to All questions at once)
  //   question.post / topic.confirm / topic.reopen -> call with baseRevision = state.revision
  //   close.request -> checkPassedFor(check, revision) ? call close{anyway:false} : call request-close;
  //                    closeFlow requested
  //   close.anyway  -> only from warned{checkId} with check.revision === revision; call close{anyway:true}
  //   close.keep    -> warned -> dismissed
  //   Every call: new requestId; ignored when an equal command is already in `calls` (double press does nothing)
  throw new Error("not implemented");
}

function applyEvents(state: PrdWorkspaceState, events: PrdEvent[]): PrdWorkspaceState {
  // TODO: for each e in seq order: skip when e.seq <= state.seq; when e.seq > state.seq + 1 mark a resync and stop
  //   topic / question / funds / check / closure: replace the entity by id
  //   message: upsert by id into chats[chat].messages; delete optimistic[meta.clientRequestId]
  //   turn started: outbox.busy = remote (only when idle; a local request in the same chat is the same turn)
  //   turn finished: outbox.busy = null when it is that remote turn
  //   check: closeFlow requested with matching revision -> outcome pass: stays requested (closure follows)
  //                                                     -> gaps: warned{checkId}
  //   closure: closeFlow idle; every outbox queue is kept but can no longer drain
  throw new Error("not implemented");
}

/** After every step: an idle outbox with a queue does not survive. One place starts queued sends. */
function settle(state: PrdWorkspaceState, effects: PrdEffect[]): Step {
  // TODO: for each chat: if outbox.busy null && queue nonempty && !halted && !closure && canAffordReply(funds)
  //         -> outbox.start(head): busy local, add optimistic human message, effect stream
  //       append resync effect when applyEvents saw a gap
  throw new Error("not implemented");
}
```

### 2.6 `src/components/prd-workspace/outbox.ts` (the queue machine, pure)

```ts
export type QueuePolicy = "queue" | "block";

export function policy(chat: ChatKey): QueuePolicy {
  // TODO: "main" -> "queue"; topic and side chats -> "block" (the canvas turns their Send off while the AI answers)
  throw new Error("not implemented");
}

/** accepted false means the box keeps its text: blocked chat while busy. */
export function offer(o: Outbox, intent: Outgoing, text: string, p: QueuePolicy, id: QueueItemId): { outbox: Outbox; accepted: boolean } {
  // TODO: busy null -> queue = [...queue, item] (settle starts it in this step, so order is one rule)
  //       busy and p === "queue" -> append; busy and p === "block" -> not accepted
  throw new Error("not implemented");
}

/** Removing an item already sent finds nothing and changes nothing. */
export function take(o: Outbox, id: QueueItemId): { outbox: Outbox; item: Outbox["queue"][number] | null } {
  throw new Error("not implemented");
}

export function start(o: Outbox, requestId: RequestId): { outbox: Outbox; item: Outbox["queue"][number] } | null {
  throw new Error("not implemented");
}

export function finish(o: Outbox): Outbox {
  // TODO: busy local -> null; halted stays null
  throw new Error("not implemented");
}

export function fail(o: Outbox, refusal: PrdRefusal): { outbox: Outbox; restored: Outgoing | null } {
  // TODO: busy -> null; halted = refusal; the failed intent's text goes back to the draft when the draft is empty;
  //       the next send by the developer clears halted and the queue drains again
  throw new Error("not implemented");
}
```

### 2.7 `src/components/prd-workspace/selectors.ts` (view models are data; actions are commands or null)

```ts
export type Action = PrdCommand | null;

export type TopicRowView = { id: TopicId; title: string; stateLabel: string; tone: Tone; blocker: { text: string; tone: Tone } | null; selected: boolean; open: Action };
export type PanelView = { revisionText: string; progress: { confirmed: number; total: number }; close: ClosePanelView; topics: TopicRowView[]; mainSelected: boolean; openMain: Action; funds: FundsView };
export type ClosePanelView = { title: string; remaining: { key: string; text: string }[]; close: Action; ngoNote: boolean };
export type FundsView = { availableText: string; allocationText: string; pendingText: string | null; band: Band; spentShare: number; pendingShare: number; out: boolean; barLabel: string };

export type TurnView =
  | { kind: "day"; key: string; label: string }
  | { kind: "line"; id: MessageId; text: string; openTopic: Action }
  | { kind: "dev"; id: MessageId; lines: string[]; brief: BriefRow[] | null; pending: boolean }
  | { kind: "ai"; id: MessageId; answering: boolean; updated: string | null; lines: string[];
      sectionLink: { label: string; open: Action } | null;
      gaps: { topicId: TopicId; title: string; text: string; open: Action; fixed: boolean }[] | null;
      after: string[]; closeAsk: { anyway: Action; keep: Action } | null;
      ngoCards: { id: NgoQuestionId; heading: string; text: string; post: Action; answer: Action }[];
      recommendation: { reason: string; close: Action; ngoNote: boolean } | null };

export type ComposerView = { key: DraftKey; chat: ChatKey; draft: string; placeholder: string; hint: string;
  sendLabel: "Send" | "Add to queue"; send: Action; queue: { id: QueueItemId; text: string; edit: Action; remove: Action }[] | null };

export type TopicPageView = { id: TopicId; title: string; stateLabel: string; tone: Tone; statements: string[]; sources: string;
  stories: string[] | null; status: { text: string; tone: Tone }; confirm: Action; reopen: Action; waitNote: boolean; ngoNote: boolean;
  messages: TurnView[]; questions: DevQuestionView[]; answering: boolean; composer: ComposerView | null; readOnlyLine: string | null };

export type QuestionsView = { title: string; note: string; people: Person[]; open: QuestionRowView[]; answered: { id: NgoQuestionId; topic: string; answer: string; open: Action }[] | null; answeredOpen: boolean; toggle: Action };
export type QuestionRowView = { id: NgoQuestionId; topic: string; blockLabel: string; blocking: boolean; text: string; statusText: string; sent: string | null; open: Action; view: Action; use: Action };
export type SideChatView = { id: NgoQuestionId; heading: QuestionHeading; messages: { actor: "ai" | "ngo"; name: string; text: string }[]; answering: boolean;
  options: { label: string; pick: Action }[] | null; composer: ComposerView | null; complete: Action | "off" | null; completeHint: string | null; use: Action; note: string | null; back: Action };
export type AnswerReviewView = { questionId: NgoQuestionId; heading: QuestionHeading; answer: string; answerKey: DraftKey; note: string; noteKey: DraftKey; rows: BriefRow[]; use: Action; back: Action };
export type BannerView = { text: string; note: string | null; openUiDesign: boolean } | null;
export type PhoneTabsView = { current: PhoneTab; prdLabel: string; badge: number | null; go: Record<PhoneTab, Action> };

export function selectPanel(s: PrdWorkspaceState): PanelView { throw new Error("not implemented"); }
export function selectMainChat(s: PrdWorkspaceState, live: PrdUIMessage | null, now: Date): TurnView[] { throw new Error("not implemented"); }
export function selectComposer(s: PrdWorkspaceState, chat: ChatKey): ComposerView | null { throw new Error("not implemented"); }
export function selectReadOnly(s: PrdWorkspaceState): string | null { throw new Error("not implemented"); }
export function selectTopicPage(s: PrdWorkspaceState, live: PrdUIMessage | null): TopicPageView | null { throw new Error("not implemented"); }
export function selectQuestions(s: PrdWorkspaceState): QuestionsView { throw new Error("not implemented"); }
export function selectSideChat(s: PrdWorkspaceState, live: PrdUIMessage | null): SideChatView | null { throw new Error("not implemented"); }
export function selectAnswerReview(s: PrdWorkspaceState): AnswerReviewView | null { throw new Error("not implemented"); }
export function selectBanner(s: PrdWorkspaceState): BannerView { throw new Error("not implemented"); }
export function selectPhoneTabs(s: PrdWorkspaceState): PhoneTabsView { throw new Error("not implemented"); }

function remaining(s: PrdWorkspaceState): { key: string; text: string }[] {
  // TODO: the canvas closeItems, typed: ready to confirm, still being written, blocking not posted,
  //       blocking waiting, answers to use, check gaps, "Completion check runs when you close..." unless passed for revision
  throw new Error("not implemented");
}

function blocker(s: PrdWorkspaceState, t: Topic): { text: string; tone: Tone } | null {
  // TODO: derived, never stored: gap > confirmed none > ready "AI: every decision is in · Priya can confirm"
  //       > needs-review > waits on dependsOn topic not confirmed > asked dev questions count
  //       > blocking NGO question by its state (not posted / waiting / answering / complete / one point to settle)
  throw new Error("not implemented");
}
```

Rules every selector keeps:
- An action is non-null only when the reducer would accept it: authority from `AUTHORITY`, lifecycle from
  `prd-machine.ts`, `closure === null`, and funds where the action starts a paid request.
- A card in an old message reads the current entity. A `recommendation` with `revision !== state.revision` renders
  its text with `close: null`. A `close-ask` renders its buttons only when `closeFlow` is `warned` with that
  `checkId` and the check is for the current revision.
- Progress counts `topics` with `required` and `confirmed` state. It never counts messages or funds.

### 2.8 `src/components/prd-workspace/store.ts` (runtime, effects, chats, hooks)

```ts
import { Chat, useChat } from "@ai-sdk/react";

export type PrdStore = {
  getState(): PrdWorkspaceState;
  subscribe(listener: () => void): () => void;
  dispatch(command: PrdCommand): void;
  chatFor(key: ChatKey): Chat<PrdUIMessage>;
  start(): () => void;
};

export function createPrdStore(port: PrdPort, snapshot: PrdSnapshot, isPhone: boolean): PrdStore {
  // TODO:
  //   let state = initialState(snapshot, isPhone)
  //   input(i): ({ state, effects } = step(state, i)); notify; effects.forEach(run)
  //   run(stream):  chat = chatFor(key); chat.messages = []; chat.sendMessage(message, { body })
  //   run(call):    port.command(c).then(result => input({ kind: "call.settled", requestId, result }))
  //   run(persist-draft): debounce 400 ms per key, then port.saveDraft
  //   run(resync):  port.load().then(r => r.ok && input({ kind: "snapshot", snapshot: r.value }))
  //   chatFor(key): lazily new Chat({ id: key, transport: port.chat,
  //       onData: part => part.type === "data-event" && input({ kind: "events", events: [part.data] }),
  //       onFinish: ({ message, isError }) => !isError && input({ kind: "stream.finished", chat: key, message }),
  //       onError: e => input({ kind: "stream.failed", chat: key, refusal: parseRefusal(e) }) })
  //   start(): unsubscribe = port.subscribe(state.seq, events => input({ kind: "events", events })); return cleanup
  throw new Error("not implemented");
}

export const PrdStoreContext: React.Context<PrdStore | null>;

export function usePrd<T>(select: (s: PrdWorkspaceState) => T): T {
  // TODO: const s = useSyncExternalStore(store.subscribe, store.getState); return useMemo(() => select(s), [s, select])
  throw new Error("not implemented");
}

export function useDispatch(): (command: PrdCommand) => void { throw new Error("not implemented"); }

/** The AI reply in flight for a request this viewer started. Committed messages come from the store. */
export function useLiveReply(key: ChatKey): PrdUIMessage | null {
  // TODO: const { messages } = useChat({ chat: store.chatFor(key) });
  //       busy = usePrd(s => s.chats[key]?.outbox.busy); busy?.kind !== "local" -> null
  //       last assistant message in messages, or a placeholder (answering, no text) before the first chunk
  throw new Error("not implemented");
}
```

`Chat` is a decoder for one request. The backend holds the history, so the client never ships it and cannot
forge it. `chat.messages = []` before each send keeps the request to the new message only.

### 2.9 `src/components/prd-workspace/PrdWorkspaceScreen.tsx`

```tsx
export function PrdWorkspaceScreen(props: { port: PrdPort; onOpenUiDesign?: () => void }): JSX.Element {
  // TODO: port.load() once; failure -> <p role="alert">; success -> <Loaded snapshot />
  throw new Error("not implemented");
}

function Loaded(props: { port: PrdPort; snapshot: PrdSnapshot; onOpenUiDesign?: () => void }): JSX.Element {
  // TODO: const isPhone = useIsPhone(); const [store] = useState(() => createPrdStore(port, snapshot, isPhone));
  //       useEffect(() => store.start(), [store]);
  //       <PrdStoreContext.Provider value={store}>{isPhone ? <PhoneLayout/> : <DesktopLayout/>}</...>
  throw new Error("not implemented");
}
```

### 2.10 Fixture side (`design/astra/src/`)

```ts
// prd-givens.ts (imports nothing)
export const PRD_SCENARIOS = ["prd-today", "first-entry", "answer-complete", "all-ready", "check-passed",
  "closed", "queue", "funds-out", "funds-79999", "funds-80", "funds-95", "funds-95001"] as const;
export type PrdScenario = (typeof PRD_SCENARIOS)[number];
export type PrdModelCall = "prd-chat" | "prd-side-chat" | "prd-answer-write" | "prd-check";
export const PRD_GIVEN: Record<PrdScenario, { viewer: "dev" | "ngo"; replyMs: number; summary: string }>;

// prd-fixture-world.ts
export type KeyValue = { get(key: string): string | null; set(key: string, value: string): void };
export type PrdWorld = {
  snapshot(viewer: Viewer): Result<PrdSnapshot>;
  applySend(viewer: Viewer, body: PrdChatRequestBody): Result<PrdTurnScript>;
  command(viewer: Viewer, c: PrdPortCommand): Result<PrdEvent[]>;
  subscribe(afterSeq: number, listener: (events: PrdEvent[]) => void): () => void;
  saveDraft(viewer: Viewer, key: DraftKey, text: string): void;
};
export type PrdTurnScript = { assistantId: MessageId; reply: string; parts: PrdUIMessage["parts"]; events: PrdEvent[]; model: PrdModelCall };
export function createPrdWorld(scenario: PrdScenario, opts: { storage: KeyValue | null; pace: Pace }): PrdWorld;
export function openPrdWorld(scenario: PrdScenario, pace: Pace): PrdWorld;

// prd-fixture-transport.ts
export class PrdFixtureTransport implements ChatTransport<PrdUIMessage> { /* validate body, pause replyMs, applySend, stream */ }

// prd-fixture-port.ts
export function prdFixtureSelection(): { scenario: PrdScenario; pace: Pace; viewer: Role };
export function prdFixturePort(scenario: PrdScenario, pace: Pace, viewer: Role): PrdPort;
```

The world is the backend stand-in. It checks every write with `AUTHORITY` and `baseRevision`, deduplicates
`requestId` and `clientRequestId`, moves funds (hold on start, settle once at finish), keeps one event log with
`seq`, writes the scripted AI replies, persists to `localStorage` key `ai4good.prd.fixture.v1.<scenario>` when a
storage is given, and calls the model-call probe once per paid generation. It imports `src/lib/prd-stream.ts`
and `src/lib/prd-machine.ts`. It never imports a component.

### 2.11 Harness and suite

```ts
// tests/at/harness/screen.ts
export type LocatorStep = { role?: string; name?: string; text?: string; testId?: string; exact?: boolean; position?: number | "last" };
export function shellUrl(baseUrl: string, scenario: string, route: string, pace: "test" | "demo" = "test", params: Record<string, string> = {}): string;
// screen-host.mjs locate(): testId -> loc.getByTestId(step.testId), then .filter({ hasText: step.text }) when text is set

// tests/at/suites/req-036/_screen.ts
export type PrdGiven = { scenario: PrdScenario; viewer: Role; viewport: Viewport; colorScheme?: "light" | "dark" };
export function prdScreens(): (ctx: AtContext<"req-036", "scope", "loop">, given: PrdGiven, body: (prd: PrdPage) => Promise<void>) => Promise<void>;
export function wiringPending(id: string): () => Promise<never>;
export class PrdPage {
  modelCalls(): Promise<readonly string[]>;
  reload(): Promise<void>;
  viewAs(viewer: Role): Promise<void>;
  readonly panel: { revision(): Promise<string>; progress(): Promise<string>; remaining(): Promise<string[]>; closeVisible(): Promise<boolean>; close(): Promise<void>; text(): Promise<string> };
  readonly topics: { names(): Promise<string[]>; state(title: string): Promise<string>; blocker(title: string): Promise<string>; open(title: string): Promise<void>; openMain(): Promise<void> };
  readonly gauge: { available(): Promise<string>; pending(): Promise<string | null>; out(): Promise<boolean>; barLabel(): Promise<string> };
  readonly chat: { waitAnswering(): Promise<void>; waitIdle(ms?: number): Promise<void>; devTexts(): Promise<string[]>; aiTexts(): Promise<string[]>; lastAi(): Promise<string>; gaps(): Promise<string[]>; openGap(title: string): Promise<void>; closeAnyway(): Promise<void>; keepWorking(): Promise<void>; recommendationCloseCount(): Promise<number>; ngoCard(text: string): Promise<string>; post(text: string): Promise<void>; answerCard(text: string): Promise<void>; brief(): Promise<string> };
  readonly composer: { present(): Promise<boolean>; write(text: string): Promise<void>; value(): Promise<string>; send(): Promise<void>; sendLabel(): Promise<string>; sendEnabled(): Promise<boolean> };
  readonly queue: { texts(): Promise<string[]>; edit(text: string): Promise<void>; remove(text: string): Promise<void> };
  readonly topic: { title(): Promise<string>; state(): Promise<string>; statements(): Promise<string[]>; stories(): Promise<string[]>; status(): Promise<string>; confirm(): Promise<void>; reopen(): Promise<void>; canConfirm(): Promise<boolean>; messages(): Promise<string[]>; write(text: string): Promise<void>; send(): Promise<void>; pick(question: string, option: string): Promise<void>; back(): Promise<void> };
  readonly questions: { texts(): Promise<string[]>; status(text: string): Promise<string>; sent(text: string): Promise<string>; open(text: string): Promise<void>; view(text: string): Promise<void>; use(text: string): Promise<void>; answered(): Promise<string[]>; openAnswered(text: string): Promise<void> };
  readonly side: { messages(): Promise<string[]>; option(label: string): Promise<void>; write(text: string): Promise<void>; send(): Promise<void>; completeEnabled(): Promise<boolean>; hint(): Promise<string | null>; complete(): Promise<void>; back(): Promise<void> };
  readonly review: { answer(): Promise<string>; editAnswer(text: string): Promise<void>; note(text: string): Promise<void>; use(): Promise<void> };
  readonly banner: { text(): Promise<string>; openUiDesign(): Promise<boolean>; readOnly(): Promise<string | null> };
  readonly phone: { tab(t: PhoneTab): Promise<void>; current(): Promise<PhoneTab>; badge(): Promise<string | null>; labelsOneLine(): Promise<boolean>; sectionPageTop(): Promise<number> };
  boxOf(testId: string, text?: string): Promise<Box>;
}
```

`PrdPage` imports `TID` from `src/components/prd-workspace/testids.ts`, so the screen and the test share one list
of handles. Loop tier only for now: `prdScreens` builds `design/astra/vite.config.ts` once per test file and opens
`shellUrl(base, scenario, 'prd-workspace', 'test', { viewer })`. `viewAs` clicks the shell switch. At screen
wiring, `prdScreens` gains the integration branch (seed, signed-in storage, real route), exactly as
`discoveryScreens` does. No test body changes.

---

## 3. Module map

`src/lib/`
- `prd-stream.ts` (new): ids, entities, events, snapshot, chat message and data part types, request body,
  port command, refusal. The one contract for screen, fixture and edge functions.
- `prd-machine.ts` (new): authority table and pure lifecycle rules: topic guards, change propagation to
  dependents, the NGO question complete guard, brief composition, funds band and affordability, check freshness.

`src/components/prd-workspace/`
- `index.ts`: public barrel: `PrdWorkspaceScreen`, types `PrdPort`, `Result`.
- `port.ts`: `PrdPort`, `Result`.
- `state.ts`: `PrdWorkspaceState`, `PrdCommand`, `PrdInput`, `PrdEffect`, `initialState`.
- `reducer.ts`: `step`, `stepNav`, event application, `settle`.
- `outbox.ts`: the send queue machine.
- `selectors.ts`: every view model, the derived blockers, the Still open list, day dividers.
- `store.ts`: `createPrdStore` (effect runner, debounced drafts, `Chat` per chat key, subscription), context,
  `usePrd`, `useDispatch`, `useLiveReply`.
- `copy.ts`: visible text, accessible names, state labels, tones.
- `testids.ts`: the canvas `data-testid` handles as one const object.
- `PrdWorkspaceScreen.tsx`: load, store, phone or desktop.
- `DesktopLayout.tsx`, `PhoneLayout.tsx`: the three-column board and the three-tab phone, from the same parts.
- `ProcessBar.tsx`, `ClosedBanner.tsx`, `ReadOnlyBanner.tsx`.
- `PrdPanel.tsx`: revision, progress, `ClosePanel`, `TopicList`, `FundsGauge` (one file, four small parts).
- `MainChat.tsx`: transcript with scroll-follow and focus requests, composer.
- `Turn.tsx`: one transcript item, and its cards (NGO question card, check gaps, close ask, close
  recommendation, brief).
- `Composer.tsx`: main, topic and side composer variants, with the queue strip.
- `TopicPage.tsx`: topic document, dev question cards, topic chat, composer. On phone it is `prd-section-page`.
- `QuestionsPanel.tsx`: people, question list, Answered list.
- `SideChat.tsx`, `AnswerReview.tsx`.
- `PhoneTabs.tsx`.
- `use-is-phone` is imported from `@/components/discovery/use-is-phone`.

`design/astra/`
- `src/prd-givens.ts` (new): scenario names, default viewer, reply hold, probe kinds. Imports nothing.
- `src/prd-fixture-data.ts` (new): Harbor Community Kitchen seed snapshots per scenario, from the canvas
  sample (six topics, revision 13, $8.80 left of $20.00, three NGO questions, two dev questions, the history days).
- `src/prd-fixture-world.ts` (new): the in-memory backend described in 2.10.
- `src/prd-fixture-transport.ts` (new): `ChatTransport` stand-in. Validates the body, waits `replyMs`, applies
  the send, streams `start`, text, persistent data parts, transient `data-event` parts, `finish`.
- `src/prd-fixture-port.ts` (new): selection from the query and the `PrdPort` over the world.
- `src/PrdShell.tsx` (new): shell chrome: viewer switch and the UI Design note. No screen logic.
- `src/App.tsx` (changed): mount on `#prd-workspace`.
- `src/components.tsx` (changed): add `prd-workspace` to `routeSchema`.
- `screens.json` (changed): PRD workspace `implementation: "src/components/prd-workspace/"` and its hash route.

`tests/at/harness/`
- `screen.ts` (changed): `testId` on `LocatorStep`; `shellUrl` takes the route and extra query params.
- `screen-host.mjs` (changed): `getByTestId` branch with the optional `text` filter.
- `screen.selftest.ts` (changed): `shellUrl` cases for the new signature.

`tests/at/suites/req-004/`
- `_screen.ts` (changed): one line, pass `'discovery'` or `'discovery-review'` to `shellUrl`.

`tests/at/suites/req-036/`
- `_screen.ts` (new): `PrdPage`, `prdScreens`, `wiringPending`.
- `_world.ts` (new): Node-side helper that builds a fixture world with memory storage, for the cases that call
  the backend directly (09, and the duplicate-charge check in 05).
- `workspace.test.ts` (new): the sixteen screen cases, one `atTest` each, one Vite build for the file.
- `pending.test.ts` (deleted): its sixteen ids move to `workspace.test.ts`.

`tests/at/expected/req-036.json` (changed by hand): loop green gains 01 to 10 and 13 to 18. Integration and
drill unchanged.

Unit tests (`src/components/prd-workspace/*.test.ts`, run by the normal vitest): `outbox.test.ts`,
`reducer.test.ts`, `prd-machine.test.ts` (band boundaries, dependents, authority). These are cheap and they cover
the machines without a browser. If the project's vitest config does not pick them up, put the band boundary
check in the AT-036.07 loop body instead.

---

## 4. The five hard flows through this structure

### 4.1 Queue while the AI answers (AT-036.17)

1. Priya types. Each keystroke is `draft{key:"main"}`. The draft slice changes, and a debounced
   `persist-draft` effect runs.
2. Send: `send{chat:"main"}`. The reducer builds `{kind:"text", text}` from the draft and calls `offer`. The
   outbox is idle, so the item goes into the queue and the draft clears. `settle` sees an idle outbox with a
   queue, calls `start`, adds an optimistic human message under its `requestId`, and returns a `stream` effect.
3. The runtime clears the main `Chat`, then calls `sendMessage` with body
   `{chat:"main", clientRequestId, baseRevision, intent}`. The fixture transport holds for `replyMs` (3000 in
   the `queue` scenario). The composer view shows `sendLabel: "Add to queue"` because `busy` is set. The live
   placeholder shows `prd-ai-answering`.
4. More sends: `offer` appends (main chat policy is `queue`). The view lists `prd-queue-item`s in order with edit
   and remove commands.
5. Edit: `queue.edit` takes the item out and appends its text to the draft. Remove: `queue.remove` takes it out.
   If the item was already started, `take` finds nothing and changes nothing. The reducer runs one input at a
   time, so this race has one result.
6. `data-event` parts arrive (funds pending, then settled), and the reducer applies them by `seq`. `onFinish`
   gives `stream.finished`: the AI message is stored, `busy` becomes null. `settle`, in the same step, starts
   the queue head. Each queued message is its own request and its own charge, in order.
7. When funds cannot cover a hold, `settle` does not start. The queue waits and the composer shows the funds-out
   line. A refusal halts the queue and puts the failed text back in the draft. The next send clears `halted`.

### 4.2 NGO side chat to Mark answer complete (AT-036.13)

1. Maya (viewer `ngo`, phone tab starts on Questions) opens a question: `nav.side-chat{q}`. Only navigation
   changes. No effect, so no model call.
2. `selectSideChat` shows the side chat messages from `chats["side:q"]`. The first AI message comes from the
   server when the question was posted. Options are `side.option` commands that fill `drafts["side:q"]`.
3. Send on `side:q` goes through the same outbox, with policy `block`. The world checks `send:side` authority and
   that the question is posted to this NGO. It stores her message and writes a follow-up that ends in a
   question. It emits `ngo-question` with `answering{followUp:"pending"}`.
4. `selectSideChat` derives `complete: "off"` and `completeHint: "Answer the AI’s question first."` from
   `canMarkComplete(q)`. Maya replies. The world sets `followUp:"none"`, and the view turns the button on.
5. A question Maya asks the AI ("Can a volunteer ask to be removed earlier?") is classified by the world as a
   question to the AI. The AI answers it, and it is not added to the answer material. The client never parses
   this.
6. Mark answer complete: `answer.complete{q}` returns a `call` effect and sets `nav.side` to the list at once.
   The world writes one clean answer from the side chat (probe `prd-answer-write`, paid) and emits
   `ngo-question{complete{answer}}`. Maya's row shows `prd-ngo-question-sent`.
7. `viewAs('dev')`: Priya's snapshot has the same question as complete. Her row has View answer and Use answer.

### 4.3 View answer and Use answer (AT-036.14)

1. View answer: `nav.review{q}`. When no `review-answer:q` draft exists, `stepNav` seeds it with the sent
   answer. This is a draft write in a navigation step, but it has no effect beyond the draft. The render shows
   `prd-answer-review` with the editable answer, rows from `composeBrief` (impact, open point) and the note box.
2. Edits are drafts. Use answer: `answer.use{q, from:"review"}`. The reducer reads both drafts. It sends
   `answer: edited` only when the text differs, and it sends the note. It goes through the main outbox
   (Use is null while main is busy, as on the canvas). Navigation goes to the main chat.
3. The optimistic human message is built with `composeBrief`. It is a blue Priya message with the `brief` part
   (`prd-claim-brief`). The world builds the same brief and stores it, and the echo replaces the optimistic copy
   by `clientRequestId`.
4. The AI reply stream carries events: the topic with the answer as a statement and the note written in, the
   question `used{briefMessage, changed}`, a side chat message telling Maya the final wording when `changed`,
   and the new revision. The open point is raised in the reply text when there is no note.
5. The question leaves the open list and appears in Answered. `nav.answered{q}` sets a focus request on
   `briefMessage`. `MainChat` scrolls to it and focuses it.

### 4.4 Close PRD, warn but do not block (AT-036.16)

1. The Close PRD action is non-null for the developer while `closure` is null. It is never gated by readiness.
   The panel lists `remaining(s)` above it. The NGO view has `close: null` and `ngoNote: true`.
2. `close.request`: when `checkPassedFor(check, revision)`, the reducer calls `close{anyway:false}` and the world
   closes at once, with no model call. Otherwise it calls `request-close`. `closeFlow` becomes `requested`.
3. The world starts a remote turn in the main chat. The result events are `turn started` and the AI message "I am
   running the completion check on revision N". The main outbox becomes `busy remote`, so a send now queues.
4. After the hold, the world emits the check entity (gaps, unconfirmed, open blocking), the AI message with
   `check` and `close-ask` parts, the gap topics moved to `needs-review{check-gap}`, and `turn finished`.
   `closeFlow` becomes `warned{checkId}`. The view shows `prd-close-anyway` and `prd-close-keep` on that one
   message only.
5. Keep working: `close.keep`, `warned` becomes `dismissed`, the buttons hide, the PRD stays open. Any later
   revision change makes the old check stale, so Close PRD runs the check again.
6. Close anyway: only from `warned` with a current check. It calls `close{anyway:true, checkId, baseRevision}`.
   A stale revision is refused (`stale-revision`) and shown. The world emits `closure{revision, openPoints:K}`.
   `selectBanner` writes "PRD closed at revision N with K open points · UI Design starts from it". Every
   composer selector returns null. `selectReadOnly` returns the closed line. Every question action is null.

### 4.5 A changed answer moves dependents to Needs review (AT-036.08)

1. Scenario `check-passed`: six topics confirmed, check passed at revision R, the AI's close recommendation in
   history carries `revision: R`.
2. Priya opens Shift scheduling rules (`nav.topic`, free) and sends "Swaps: volunteers cancel instead".
3. The world's send handler sees a developer message on a confirmed topic and calls
   `afterTopicChange(topics, shifts)`. Shift scheduling rules becomes `needs-review{changed}`. Technical scope
   (depends on shifts) becomes `needs-review{dependency, on: shifts}`. The other four keep `confirmed`. The
   revision becomes R+1. All of this comes back as `topic` and `revision` events in the stream.
4. Nothing in the client recomputes topics. The selectors read: progress 4 of 6, the two badges and blocker
   lines, the recommendation's revision R is not R+1 so its Close button is gone (text stays), the panel title
   returns to "Still open", and `checkPassedFor` is false so Close PRD will run the check again.
5. Confirm on each Needs review topic is enabled by `canConfirm`. No control sets Ready to confirm, because no
   command for it exists in `PrdCommand`.

---

## 5. Acceptance cases: what the loop body proves, and what waits for integration

Every loop body calls `ctx.open()` (the existing `scope` binding), then drives the shell. Every integration and
drill body throws `AtPending(id, 'sut-missing', ...)`. "Cannot prove" below means the loop tier has no backend
to prove it against. The loop proves the screen and the fixture contract only.

| Case | Loop body asserts | Left for integration (loop cannot prove) |
| --- | --- | --- |
| 01 bootstrap | `first-entry`: six required topics, their sources name Discovery revision 12, the opening AI message names the revision and the carried answers. Reload: still six topics and one opening message (no duplicate on re-entry). | PM seed and bootstrap item exist, development tree empty, real topic derivation, idempotent bootstrap in the database. |
| 02 shared record | Drafts in the main composer, a topic composer (dev) and a side chat (ngo, via `viewAs`) survive reload. Main history, topic chat and side chat survive reload. No turn owner, handover or bookmark control exists. | Server persistence of each record, attribution separate from cost settlement, attribution failure honesty. |
| 03 questioning | `prd-ngo-question-intro` reads "Suggested question for Maya (NGO) · not posted yet" with `prd-post-question` for dev, absent for ngo. Not in Maya's list before Post, in it after. Shift topic chat shows two `prd-question` cards with "Why now" and one Suggested option each. Technical scope blocker "Waits on Shift scheduling rules" stays after opening it. | The AI really choosing ready questions, reusing facts, ordering dependents, Q&A log anchors. |
| 04 coverage | `all-ready`: confirming the last topic gives a check message with two `prd-check-gap`, each with `prd-check-gap-open`. Both topics go to Needs review, Confirm absent. The gap button opens the topic. A fix in the topic chat closes the gap and Confirm returns. The threshold text is the configured placeholder. Close PRD stays present after the failing check. | Real scorer, gap content against Discovery, revision and threshold recorded as events. |
| 05 cost | No receipt under any AI reply (no fee or per-reply cost element), no effort control in any composer. Pending appears in the gauge during a reply and moves to spent once after it. Node-side world: one send repeated with the same `clientRequestId` charges once and adds one message. | OpenRouter generation cost, streaming usage, zero versus missing cost, Pending until reconciliation, ledger readback, effective provider settings. Most of this case is integration only. |
| 06 close | Close anyway gives the banner with K open points, Open UI Design for dev, "Priya opens UI Design next." for ngo, and no composer, topic composer or question action. `closed` scenario opens read-only. | Freezing in the database, UI Design inventory, nothing written to the board, the planning package job, resume and no rebilling. |
| 07 funds | Gauge text "$8.80 left of $20.00", pending during a reply. The four band scenarios render the band in the bar's accessible label (79.999% green, 80% yellow, 95% yellow, 95.001% red). `funds-out`: Send off and `prd-usd-out` text. Topic clicks, question opens, Answered toggle and source links add no model call (probe count unchanged). | Reservations after pending, revocation and ranked stops, top-up rules, no Discovery free counter. |
| 08 topics | Flow 4.5, plus: Reopen on a confirmed topic gives Needs review; no control sets Ready to confirm; progress counts confirmed required topics only. | Scores as separate revision-linked events, required-set change recording, PM build status unchanged. |
| 09 authority | Screen: ngo has no main composer, topic composer, post, confirm, reopen, close or use control, and can write in a posted side chat. Node-side world: each dev-only command as ngo returns `forbidden`; side chat send as dev returns `forbidden`; a stale `baseRevision` returns `stale-revision` and emits no event; two sends at once give one ordered history. | Backend membership and role enforcement, unrelated users, real stale tabs. The loop proves the fixture honors the same contract the edge functions must. |
| 10 interface | Actor names on every `prd-turn`, and their colors (computed color of the name label per actor). No bookmark, turn or handover control. Close in `prd-close-panel` and inline in `prd-recommendation` (`check-passed`). No effort control. Tab reaches the composer input and Send. 320 px wide: no horizontal page overflow, composer and Send visible. Dark scheme: text and background colors differ. | Development board exclusion in the NGO and public projections, notification emitter and duplicate protection. |
| 13 side chat | Flow 4.2, plus the side chat question to the AI is answered there and absent from the sent answer; probe shows a paid side chat call. | Real AI follow-ups, payment from PRD funds in the ledger. |
| 14 use answer | Flow 4.3: edited answer and note in `prd-claim-brief`, AI reply records it in the topic, note written into the topic statements, Maya's side chat gains the final wording, question in Answered, selecting it focuses the brief. Use from the list (`prd-ngo-question-claim`) without edits also works. | Real AI recording, backend storage of the brief and the NGO notice. |
| 15 topic page | Document with statements, sources, Technical scope numbered stories (7 before the swap answer), no chat history inside `prd-section`. Topic chat below; a dev message is written into the statements as a plain statement; the chat persists after leaving and returning, and after reload. Shift questions in that chat. NGO sees the same read-only with the line pointing to Questions. | The AI using the current PRD and Discovery as context. |
| 16 close | Flow 4.4: available from the start under "Still open"; check runs; Close anyway and Keep working; Keep working leaves it open; `check-passed` closes at once with no model call; ngo sees "Only Priya can close the PRD." and no button. | Recording open points in the closed revision in the database. |
| 17 queue | Flow 4.1, the test body in 1.4. | Each queued message as its own paid request in the ledger. |
| 18 phone | Three tabs with badge; ngo opens on Questions, dev on Chat; each tab label one line (label height under 1.5 line heights); an opened topic is one `prd-section-page` with scrollTop 0 at open, document before the "Section chat" divider, input pinned at the bottom; `prd-section-back` returns; flows 13 to 16 run on the phone and every control used is at least 44 px tall. | Nothing beyond the integration re-run of the same body. |

---

## 6. Rationale

### Usage sketch
Section 1. The screen takes a port and an optional UI Design callback. Components read view models and dispatch
commands. Tests read handles and never know the reducer exists.

### Core decisions

1. Facts as whole entities, ordered by `seq`. The backend is the one source of truth for topics, questions,
   revision, funds, check and closure. The client does not compute a domain change. It applies facts by id.
   Applying an event twice changes nothing, and stream parts and subscription can deliver the same event
   without harm. A gap in `seq` asks for a resync instead of guessing.
2. Rules once, in `prd-machine.ts`. The world applies them; the selectors use them as guards. A button that
   shows is a command the reducer accepts and the fixture backend accepts.
3. Effects as data. `step` is pure, so the queue drain, the close flow and every guard are testable without
   React, a browser or the AI SDK. The runtime that runs effects is small and has no rules.
4. Navigation is typed to have no effects. `stepNav` returns `Nav`, not `Step`. "Navigation never calls the
   model" holds by type, not by care.
5. One outbox type for every chat, one slot in flight by type. `settle` is the one place that starts a send.
   The race between Remove and a finished reply has one answer because inputs run one at a time.
6. `Chat` decodes one request; the store holds the transcripts. This keeps `useChat` for streaming (the
   settled fact) and keeps one source for committed messages. The client never sends history.
7. Actions as `PrdCommand | null` in data-only view models. Capability and presence are one fact, and view models
   compare and test as plain data.

### Shared state (two humans at once)
The authority table splits writes by role. The developer writes main and topic chats and the PRD state. The NGO
writes side chats and marks answers complete. The NGO question is the only entity both touch, and its lifecycle
orders them: only the NGO moves it to `complete`, only the developer moves it to `used`, and `used` needs
`complete`. NGO actions do not change the PRD revision (only Use answer does, by the developer), so Maya never
makes Priya's `baseRevision` stale. Drafts are per viewer and never shared. The answer to "what happens if both
write at once" is "nothing": their writes go to different records.

### Alternatives considered and rejected
- Copy Discovery (`useState` slices, refs that mirror them, one `Chat` holding history). PRD has a main chat, a
  chat per topic, a chat per question, a queue, a close flow and two viewers. The ref mirroring grows with each,
  and Discovery's in-flight booleans drop a second send, which the PRD must queue.
- Each `Chat` owns its transcript (Discovery's model). Then cards in messages (question status, gaps, close
  ask, recommendation) look up reducer state anyway, and transcripts live in two places. Rejected.
- The client computes topic transitions optimistically. It duplicates the backend's authority and creates
  revision conflicts to reconcile. Rejected for facts plus guards.
- A custom `AbstractChat` with a reducer-backed chat state, so the reducer sees every streamed chunk. It is the
  purest form, but it departs from the settled `useChat`/`Chat` choice and depends on internals of `ai` 7.
  Rejected.
- XState or another machine library. A new dependency for four small tables, and the fixture world would need
  it too. Rejected.
- One port method per action (as in Discovery). Seven methods with the same shape. One `command` with a typed
  union is a smaller surface and one idempotency rule.

### Risks
- The reducer and selectors are the two largest files. Mitigation: the outbox is its own file; the close flow
  and navigation are separate functions; split selectors by panel if a file passes about 400 lines.
- `seq` is a commitment for screen wiring: the backend needs one ordered event log per workspace. Without it,
  deduplication must fall back to entity version numbers. The wiring brief must carry this.
- Every component re-renders on every store change (`useSyncExternalStore` plus `useMemo`, no selector
  library). Streaming text does not pass through the store, so this stays cheap at six topics and a few dozen
  messages. It becomes a risk only with very long histories.
- `chat.messages = []` before each send depends on the `Chat` setter and on the backend needing only the new
  message. If the edge function wants history, the transport's `prepareSendMessagesRequest` must still send
  only the new message plus ids.
- The fixture world holds real backend logic (authority, dependents, funds). Screen wiring reimplements it in
  Deno unless the bundle can import `src/lib/prd-machine.ts`. The loop tier proves the contract, not the edge
  function.
- Remote turns (the check after the last confirm, the other human's activity) reach the other viewer only
  through `subscribe`. The fixture does this in memory. Screen wiring must choose realtime or polling.
- Two readings need the founder or the lead: `prd-readonly-banner` shown to the developer after close, and
  pending counted in the funds band.
- Test timing: the `queue` scenario holds each reply 3 seconds, so AT-036.17 takes about 10 seconds. Other
  scenarios use 20 ms.

### Synthesis decision
Not applicable inside one runner. For the orchestrator: the parts most worth grafting into another base are the
facts-by-`seq` event model, `prd-machine.ts` shared by world and selectors, the effect-free navigation type, the
single outbox with `settle`, and the `PrdCommand | null` view model actions.
