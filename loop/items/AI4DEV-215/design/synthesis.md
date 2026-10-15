# PRD workspace screen build: the synthesized design

This is the contract for the screen build of the PRD workspace (requirement req-036). Writers build against it. Where it is silent, follow candidate A (`candidate-a-snapshot.md`). Where this file and a candidate disagree, this file wins.

## Synthesis decision

Five runners designed the screen, each on a different structure. The lead scored candidate A (one authoritative snapshot) highest at 28, and candidate D (one state machine) next at 25. The cross-judge on Grok scored D at 26 and A at 24. See `cross-judge.md`.

The base is A. The backend stand-in owns every domain rule, and the snapshot it sends says for each action whether it is available. The screen keeps no copy of the rules, so wiring changes the port and nothing else in `src/components/`.

The judge's three objections to A are fixed here:
- A's sample test omitted `default`, which `tierBodyProblem` in `tests/at/harness/registry.ts` rejects. Every registration below uses `loop` plus `default`.
- A sent Use answer as a non-streaming command. Here Use answer is a message on the main chat, through the queue, as the contract says.
- A put all rules in the fixture world, so wiring would rewrite them. Here the rules live in one pure module, `src/lib/prd-rules.ts`, with no IO and no React. The fixture world calls it now. Screen wiring ports it to the edge function the way Discovery keeps `supabase/functions/_shared/discovery-stream.ts`. The screen never imports it.

Grafts:
- From D: the pure outbox for the main-chat queue with one `settle` point that starts sends; the `testId` locator step with an optional `text` filter for repeated rows; the shell-chrome viewer switch so both viewers share one fixture world in a loop test; one test-id list shared by the screen and the page object; `default: wiringPending(id)` for the integration and drill tiers.
- From C: one `Chat` per conversation, created once through `port.chat(scope)`, kept for the screen's life; one conversation pane per visible chat calls `useChat({ chat })`; a snapshot never calls `setMessages` on a chat that is streaming.
- From B: a scenario names its starting view, so a test opens a view directly. The view is not put in the URL, and the driver gets no new operations.

Rejected: E's replica ids, feed cursors and operation store (backend design beyond this stage); B's URL navigation and new driver operations; C's persisted outbox and per-viewer storage keys.

## Readings that need the founder (flag them in the pull request)

1. `prd-readonly-banner` on the canvas is the NGO notice "Priya works on the PRD with the AI here." AT-036.06 also names it for the closed workspace. The screen shows it for the NGO always, and for the developer after close with the closed text.
2. The funds band uses settled spend over allocation, unrounded. Pending shows as text and as a hatched part of the bar, and does not move the band.

## Types (the contract)

### `src/lib/prd-stream.ts`

Shared by the screen, the fixture, and later the edge port. Plain types and boundary parsers; it imports only `type { UIMessage } from "ai"`.

```ts
type Id<K extends string> = string & { readonly __id: K };
export type TopicId = Id<"topic">;
export type QuestionId = Id<"question">;
export type TurnId = Id<"turn">;
export type RequestId = Id<"request">;
export type ActionToken = Id<"action">;

export type Role = "dev" | "ngo";
export type Person = Readonly<{ role: Role | "ai"; name: string; label: string }>;
export type Viewer = Readonly<{ role: Role; name: string }>;

export type ChatScope =
  | { readonly kind: "main" }
  | { readonly kind: "topic"; readonly topicId: TopicId }
  | { readonly kind: "side"; readonly questionId: QuestionId };
export function scopeKey(scope: ChatScope): string; // "main" | "topic:<id>" | "side:<id>"

export type ActionKind =
  | "post-question" | "complete-answer" | "confirm-topic" | "reopen-topic"
  | "close" | "close-anyway" | "keep-working";
export type Action<K extends ActionKind> = Readonly<{ kind: K; token: ActionToken }>;
export type Availability<T> =
  | { readonly kind: "available"; readonly action: T }
  | { readonly kind: "unavailable"; readonly reason: string };

export type TopicState = "open" | "draft" | "ready" | "confirmed" | "needs-review";
export type Topic = Readonly<{
  id: TopicId; title: string; required: boolean; state: TopicState;
  statusText: string;                       // the line under the document
  blocker: string | null;                   // shown apart from the state
  statements: readonly string[];            // the document at its current revision, never history
  sources: readonly string[];
  stories: readonly string[] | null;        // technical scope only, numbered on screen
  confirm: Availability<Action<"confirm-topic">>;
  reopen: Availability<Action<"reopen-topic">>;
}>;

export type QuestionCommon = Readonly<{
  id: QuestionId; topicId: TopicId; text: string; why: string; blocking: boolean;
  introTurn: TurnId;                        // the main-chat AI turn that raised it
  options: readonly string[];               // suggested answers in the side chat
  impact: string; openPoint: string | null;
}>;
export type NgoQuestion = QuestionCommon & (
  | { readonly kind: "suggested"; readonly post: Availability<Action<"post-question">> }
  | { readonly kind: "posted" }
  | { readonly kind: "answering"; readonly followUp: "pending" | "none";
      readonly complete: Availability<Action<"complete-answer">> }
  | { readonly kind: "complete"; readonly answer: string; readonly canUse: boolean }
  | { readonly kind: "used"; readonly answer: string; readonly briefTurn: TurnId; readonly changed: boolean }
);

export type DevQuestion = Readonly<{ id: string; topicId: TopicId; text: string; why: string;
  options: readonly string[]; suggested: string; answered: string | null }>;

export type CheckGap = Readonly<{ topicId: TopicId; title: string; text: string; fixed: boolean }>;
export type CompletionCheck = Readonly<{ id: string; revision: number; passed: boolean;
  coverageText: string; thresholdText: string; gaps: readonly CheckGap[] }>;

export type Funds = Readonly<{ allocationMicros: number; settledMicros: number;
  pendingMicros: number; replyHoldMicros: number }>;

export type CloseState =
  | { readonly kind: "open"; readonly remaining: readonly string[];
      readonly close: Availability<Action<"close">> }
  | { readonly kind: "closed"; readonly revision: number; readonly openPoints: number };

export type PrdDataTypes = {
  "ngo-question": { questionId: QuestionId };
  "dev-questions": { ids: readonly string[] };
  "section-link": { topicId: TopicId };
  check: { checkId: string };
  "close-ask": { checkId: string; revision: number;
    closeAnyway: Action<"close-anyway">; keepWorking: Action<"keep-working"> };
  recommendation: { revision: number; close: Action<"close"> };
  brief: { questionId: QuestionId; rows: readonly { label: string; text: string }[] };
  line: { text: string; topicId: TopicId | null };
  snapshot: PrdSnapshot;                    // transient: the workspace after this reply
};
export type PrdMessageMeta = { actor: "ai" | Role | "system"; name: string; at: string };
export type PrdUIMessage = UIMessage<PrdMessageMeta, PrdDataTypes>;

export type PrdSnapshot = Readonly<{
  sequence: number;                         // orders every snapshot
  revision: number;                         // the PRD revision
  viewer: Viewer;
  people: readonly Person[];
  project: Readonly<{ title: string; organizationName: string }>;
  discoveryRevision: number;
  topics: readonly Topic[];
  devQuestions: readonly DevQuestion[];
  questions: readonly NgoQuestion[];
  chats: Readonly<Record<string, readonly PrdUIMessage[]>>; // keyed by scopeKey; only chats the viewer may read
  canWrite: Readonly<Record<string, boolean>>;              // keyed by scopeKey
  funds: Funds;
  check: CompletionCheck | null;
  close: CloseState;
  drafts: Readonly<Record<string, string>>;                 // this viewer's, keyed by scopeKey or "review:<questionId>"
}>;

export type PrdIntent =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "answers"; readonly picks: Readonly<Record<string, string>>; readonly text: string }
  | { readonly kind: "use-answer"; readonly questionId: QuestionId; readonly answer: string | null; readonly note: string }
  | { readonly kind: "close-check" };
export type PrdSendBody = Readonly<{ scope: ChatScope; requestId: RequestId; baseRevision: number; intent: PrdIntent }>;

export type PrdRefusal = Readonly<{ kind: "forbidden" | "stale" | "funds" | "closed" | "busy" | "follow-up-open" | "invalid"; reason: string }>;
export type Result<T> = { ok: true; value: T } | { ok: false; refusal: PrdRefusal };

export function parsePrdSnapshot(input: unknown): PrdSnapshot;   // boundary
export function parseSendBody(input: unknown): PrdSendBody;      // boundary
```

### `src/components/prd-workspace/port.ts`

```ts
export interface PrdPort {
  load(): Promise<Result<PrdSnapshot>>;
  chat(scope: ChatScope): ChatTransport<PrdUIMessage>;  // one per conversation; body is PrdSendBody
  act(action: Action<ActionKind>): Promise<Result<PrdSnapshot>>; // the token carries what and at which revision
  saveDraft(key: string, text: string): Promise<void>;
  subscribe(listener: (snapshot: PrdSnapshot) => void): () => void; // the other viewer's work, AI turns started by the backend
}
```

`act` covers post, complete answer, confirm, reopen, close, close anyway, keep working. `complete-answer` returns only after the AI wrote the answer; the screen moves Maya to the question list only on success. Confirming the last required topic makes the backend run the completion check and publish its AI message through `subscribe`.

### `src/lib/prd-rules.ts` (fixture now, edge function at wiring; the screen never imports it)

Pure functions over the backend's own record: authority by role, which actions are available, follow-up state from the scripted outcome (never from punctuation), dependents to Needs review when a topic's decision changes (`dependsOn` lists, unaffected confirmations kept), progress, the close "Still open" list, the funds band, `canAffordReply`, check-passed-for-revision, the brief rows. Writers decide the internal record shape; it must not leak into `PrdSnapshot`.

### The controller, `src/components/prd-workspace/use-prd-workspace.ts`

```ts
export type Selection =
  | { kind: "main" } | { kind: "topic"; topicId: TopicId } | { kind: "questions" }
  | { kind: "side"; questionId: QuestionId } | { kind: "review"; questionId: QuestionId };
export type PhoneTab = "chat" | "prd" | "questions";

export interface PrdController {
  view: PrdView;                                         // from model.ts present(); actions are callbacks or null
  select(s: Selection): void; setPhoneTab(t: PhoneTab): void; toggleAnswered(): void;
  setDraft(key: string, text: string): void;
  send(scope: ChatScope): void;                          // main: queue while busy; topic and side: refused while busy
  pick(devQuestionId: string, option: string): void;
  editQueued(id: string): void; removeQueued(id: string): void;
  act(action: Action<ActionKind>): Promise<void>;
  useAnswer(questionId: QuestionId): void;               // reads the review drafts; enqueues on main
  closePrd(): void;                                      // passed for this revision ? act(close) : enqueue close-check on main
  openAnswered(questionId: QuestionId): void;            // main chat, focus the brief turn
}
export function usePrdWorkspace(port: PrdPort, initial: PrdSnapshot, start: Selection): PrdController;
```

Inside: one snapshot cell, newer `sequence` wins; a registry of `Chat` objects keyed by `scopeKey`, created on first use with the snapshot's messages; transient `data-snapshot` parts and `subscribe` go through the same install function; a snapshot never replaces the messages of a streaming chat.

### `src/components/prd-workspace/outbox.ts` (pure)

`offer`, `take`, `start`, `finish`, `fail` over `{ busy: RequestId | null; queue: { id; intent; text }[]; halted: PrdRefusal | null }`. Taking an item that already started does nothing. After every change one `settle` step starts the head when the chat is idle, the PRD is open and funds allow. Each queued item is its own request with the revision read at start.

### `src/components/prd-workspace/testids.ts`

Every `data-testid` from `design/canvas/prd-workspace/project/Main.dc.html` and `Phone.dc.html`, verbatim, as one `as const` object. The components and the page object import it. Nothing else of the canvas is copied: no class names, inline styles, comments or fixture shortcuts.

## Module map

- `src/lib/prd-stream.ts`, `src/lib/prd-rules.ts` (new).
- `src/components/prd-workspace/` (new): `index.ts` (screen, `PrdPort`, types), `port.ts`, `testids.ts`, `copy.ts` (visible text and accessible names), `model.ts` (pure `present` to `PrdView`), `outbox.ts`, `use-prd-workspace.ts`, `PrdWorkspaceScreen.tsx` (load, alert, layout), `DesktopLayout.tsx`, `PhoneLayout.tsx`, `ProcessBar.tsx`, `PrdPanel.tsx` (progress, close panel, topic list, gauge), `ConversationPane.tsx` (the `useChat` call, turns, cards), `Composer.tsx` (with the queue strip), `TopicPage.tsx`, `QuestionsPanel.tsx`, `SideChat.tsx`, `AnswerReview.tsx`, `Banners.tsx`, `PhoneTabs.tsx`. `useIsPhone` is imported from the Discovery folder.
- `src/styles.css`: actor tokens for AI purple, Dev blue, NGO amber, defined like the existing usage tokens, light and dark.
- `design/astra/src/` (sample data only): `prd-givens.ts` (import-free scenario table: viewer, start selection, reply delay), `prd-fixture-data.ts` (Harbor Community Kitchen seed and scripted replies from the canvas), `prd-fixture-world.ts` (one record per scenario shared by both viewers; calls `prd-rules.ts`; localStorage key `ai4good.prd.fixture.v1.<scenario>`; model-call probe once per paid generation), `prd-fixture-transport.ts`, `prd-fixture-port.ts` (`prdFixtureSelection`, `prdFixturePort`), `PrdShell.tsx` (chrome only: the viewer switch `prototype-viewer-switch` and the UI Design note). Changed: `App.tsx`, `components.tsx` (`routeSchema`), `screens.json`.
- `tests/at/harness/screen.ts`: `LocatorStep.testId?: string`, and `text` applies as a filter on a testId step; `shellUrl(base, scenario, route, pace, params?)`. `screen-host.mjs`: `getByTestId(id)` then `.filter({ hasText: text })` when text is set. `screen.selftest.ts` and `tests/at/suites/req-004/_screen.ts` move to the new `shellUrl`.
- `tests/at/suites/req-036/`: `_screen.ts` (`PrdPage`, `prdScreens`, `wiringPending`), `workspace.test.ts` (the sixteen ids, one `atTest` each, `loop` plus `default`), `_world.ts` (opens the fixture world in the test process for the "call the backend directly" clauses of 05 and 09). `pending.test.ts` is deleted. `tests/at/expected/req-036.json`: loop block moves the sixteen ids to green; integration and drill unchanged.

## Loop-tier assertions

Use candidate A's table (`candidate-a-snapshot.md`, "Acceptance evidence") as the list of what each loop body asserts and what stays for integration, with candidate D's queue test body (section 1.4) for AT-036.17. A loop body asserts only what the shell can show or the fixture port can refuse. It never claims settlement, scoring, authorization, or the planning package.

## Rules for every writer

- Code carries almost no comments: only a constraint forced by something we cannot change, or a doc comment on a public API. No phase comments in tests.
- UI code never touches the database and holds no secret.
- No screen logic in `design/astra/`.
- Match the canvas board by board, at 1280 by 900 and 390 by 844, in the app's own stack: shadcn/ui from `src/components/ui/`, Tailwind with the tokens in `src/styles.css`.
