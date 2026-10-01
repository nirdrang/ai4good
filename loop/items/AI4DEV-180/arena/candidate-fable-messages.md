# Candidate design: the Discovery screen, revision 12, on fixtures

Direction: messages are the source of truth. The transcript that `useChat` holds is the only
state. The brief, the Questions card, the usage card, the file rows, and the review page are
folds over message parts. Every non-chat action (save an edit, accept a suggestion, finish, add
a file, answer a file question) is itself a message sent through the one `ChatTransport`, and
the transport answers with parts. Phase 3 swaps the transport and nothing else.

Working directory for every path below: the AI4DEV-180 worktree. Nothing here was written into
the repository.

---

## Problem

Revision 12 adds a live brief that every reply updates in the same model call, a Questions card,
one usage bar, a file chooser with a per-file chat and a background read, and a Finish review page
with edits and acknowledgments. The current route (`src/routes/discovery/$organizationId.$projectId.tsx`)
is a plain chat on `DefaultChatTransport`. The current mock (`design/astra/src/`) keeps a zod
`MockState` in localStorage and derives the transcript from it; that is the reverse of what phase 3
needs, because the real backend has a transcript and no such state. The stream types in
`src/lib/discovery-stream.ts` are shared by mock and backend and must grow, not fork. The harness
(`tests/at/harness/registry.ts`) gives a body `open()` and nothing else; `--wired` says the screen
driver does not exist; `tests/at/tsconfig.json` has no DOM lib. The founder fixed Playwright on
Chromium, loop-tier screen tests in CI, and one small driver as the only harness addition.

## Usage (caller's view)

### The real route, phase 3 (what the screen code is written for)

```tsx
// src/routes/discovery/$organizationId.$projectId.tsx  (phase 3 shape; phase 2 leaves it alone)
import { DiscoveryScreen } from "@/components/discovery/DiscoveryScreen";
import { EdgeDiscoveryTransport } from "@/lib/discovery-edge-transport"; // phase 3

const transport = useMemo(() => new EdgeDiscoveryTransport({ organizationId, projectId, session }), [...]);
return <DiscoveryScreen transport={transport} initialMessages={history} project={{ title, needText }} />;
```

### The fixture shell, phase 2 (this item)

```tsx
// design/astra/src/App.tsx  (route "discovery" and route "finish")
import { DiscoveryScreen, DiscoveryFinishPage } from "../../../src/components/discovery";
import { FixtureDiscoveryTransport } from "./fixture-transport";
import { fixtureStore } from "./fixture-store";

const transport = useMemo(() => new FixtureDiscoveryTransport(fixtureStore), []);
{route === "discovery" && <DiscoveryScreen transport={transport} initialMessages={fixtureStore.read().messages} project={sampleProject} onFinish={() => navigate("finish")} />}
{route === "finish" && <DiscoveryFinishPage transport={transport} initialMessages={fixtureStore.read().messages} project={sampleProject} onBackToChat={() => navigate("discovery")} />}
```

### A screen test body (same file at every phase)

```ts
// tests/at/suites/req-004/j-need-brief.test.ts
import { atTest } from './_bind.ts';
import { awaiting, AWAITED } from './_pending.ts';
import { withScreen } from '../../harness/screen.ts';

atTest('AT-004.73', 'the brief opens as a side panel on desktop and a full-screen panel on phone', { surface: 'ui' }, {
  loop: async (ctx) => {
    await ctx.open();                                   // the harness handshake; the world is not used
    await withScreen(ctx, { device: 'desktop', scenario: 'three-agreed' }, async (page) => {
      await page.getByRole('button', { name: 'Open your live brief' }).click();
      const panel = page.getByRole('region', { name: 'Your live brief' });
      await expect(panel).toBeVisible();
      await expect(page.getByRole('region', { name: 'NGO and AI conversation' })).toBeVisible(); // beside, not over
      await expect(panel.getByRole('button', { name: 'Edit Main priority' })).toBeVisible();
    });
    await withScreen(ctx, { device: 'phone', scenario: 'three-agreed' }, async (page) => {
      await page.getByRole('button', { name: 'Open your live brief' }).click();
      const dialog = page.getByRole('dialog', { name: 'Your live brief' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Back to chat' })).toBeVisible();
    });
  },
  integration: awaiting(AWAITED.discoverySurface),      // phase 3 replaces this with the same loop body
});
```

### The fold, used by the screen, the fixture, and a selftest alike

```ts
import { foldDiscovery } from "@/lib/discovery-brief";
const view = foldDiscovery(messages);                  // pure, total, idempotent over the transcript
view.brief.sections;  view.questions;  view.files;  view.usage;  view.review;  view.revision;
```

The three call sites agree on one thing: the component takes a transport and an initial
transcript, and never a store. The tests never name a URL, a port, or a browser.

## Shape

### 1. The data model: one transcript, five folds

Everything the screen shows is `foldDiscovery(messages)`. The message list is `useChat`'s
`messages`. Nothing else is kept, except two kinds of ephemeral view state that are not facts
about the project: the draft answers being typed (per question, until sent) and which panel is
open. Both are `useState` in the owning component and die on reload; the contract allows the
draft to survive as far as the composer text, which `useChat` already keeps.

```ts
// src/lib/discovery-stream.ts  (grown; additions marked NEW)
export type Importance = "needed" | "suggested" | "later";
export const IMPORTANCE_LABEL: Record<Importance, string> = {
  needed: "Needed before build", suggested: "A suggestion exists", later: "Can wait",
};

export type SuggestedAnswer = { id: string; label: string; answer: string };

export type DiscoveryDataTypes = {
  /** A question the AI asks next. One part per question. NEW: topicId, importance, suggestedId. */
  question: {
    id: string; topicId: string; title: string; text: string; reason: string;
    suggestions: SuggestedAnswer[]; suggestedId: string | null;      // the one marked Suggested
    recommendation: string; uncertaintyHelp: string; importance: Importance;
  };
  /** NEW. The brief update this reply made, from the same model call as its text. */
  brief: {
    /** answers agreed in this turn; `source` is the turn the answer came from (this message id) */
    agreed: { topicId: string; title: string; answer: string; source: string }[];
    /** answers left uncertain in this turn; they stay open with a hint */
    uncertain: { topicId: string; title: string; hint: string }[];
    /** facts the AI proposes from a file digest; suggestions until the NGO agrees */
    suggestions: { id: string; fileId: string; fact: string }[];
    /** every open topic after this reply, with its importance */
    open: { topicId: string; title: string; importance: Importance; suggestion: string | null; reason: string }[];
    /** topics this reply reopened because an earlier answer changed */
    reopened: { topicId: string }[];
  };
  /** kept: the topics this reply saved, for the "Added to brief" line */
  filed: { topics: { id: string; title: string }[] };
  charge: { kind: "free" } | { kind: "paid"; usageMicros: number; feeMicros: number } | { kind: "none" }; // NEW: none
  ready: { agreed: number; total: number };
  usage: DiscoveryUsage;                                              // transient, as today
  /** NEW. A file the project holds. On the message that added it. */
  file: { id: string; name: string; byteSize: number; source: "intake" | "discovery" };
  /** NEW. The state of one file's read. Part id = `read:${fileId}`; the transport REPLACES it in place. */
  read: {
    fileId: string;
    state: "asking" | "reading" | "waiting" | "ready";
    percent: number;                                                  // 0..100
    facts: number | null;                                             // set when ready
    digest: { facts: string[]; questions: string[] } | null;
  };
  /** NEW. A revision the NGO made without a model call, echoed by the server. */
  revision: {
    revision: number;                                                 // the new revision number
    change:
      | { kind: "edit"; sectionId: string; text: string }
      | { kind: "accept"; topicId: string; answer: string }
      | { kind: "finish"; actor: string; at: string; acceptedGaps: { topicId: string; reason: string }[] }
      | { kind: "remove-label"; label: string };
  };
  /** NEW. The request the NGO sent, on the USER message, so a reload rebuilds intent from the transcript. */
  request: DiscoveryRequest;
};

export type DiscoveryUIMessage = UIMessage<{ fileId?: string }, DiscoveryDataTypes>;
//                                         ^ metadata: a message that belongs to a file chat says which file
```

The request union is the whole non-chat surface. It is what phase 3 dispatches on:

```ts
export type DiscoveryRequest =
  | { kind: "reply"; message: string; mode: "answer" | "ask"; answers: DiscoveryAnswer[] }
  | { kind: "file-answer"; fileId: string; message: string }        // one turn, free or paid
  | { kind: "add-file"; name: string; byteSize: number; mediaType: string; uploadRef: string }
  | { kind: "edit"; sectionId: string; text: string }                // free
  | { kind: "accept"; topicId: string }                              // free
  | { kind: "remove-label"; label: string }                          // free
  | { kind: "finish"; acknowledgments: { reviewed: true; gaps: boolean; data: true } }; // free

/** The wire body. Phase 3's transport builds it from the last user message's `data-request` part. */
export type DiscoveryRequestBody = { organizationId: string; projectId: string } & DiscoveryRequest;
```

The fold, in `src/lib/discovery-brief.ts`, is one pure function and its section helpers:

```ts
export type TopicStatus = "agreed" | "not-sure" | "open" | "ready-to-send" | "coming-next";

export type BriefSection = {
  id: string;                        // topicId, or "need" | "users" | "measure" | `file:${id}` | `acc:${topicId}`
  title: string;
  text: string | null;               // null = "To be discussed"
  status: "agreed" | "not-sure" | "pending";
  source: string;                    // "from your intake", "chat, round 2", "suggestion you accepted", "edited by you"
  importance: Importance | null;     // for open sections
  suggestion: string | null;
  hint: string | null;               // uncertaintyHelp for not-sure
  editable: boolean;
  /** the message id that holds the answer, for View */
  answerAt: string | null;
};

export type QuestionRow = {
  topicId: string; title: string; text: string; status: TopicStatus;
  answer: string | null; questionMessageId: string; answerAt: string | null; importance: Importance;
};

export type FileRow = {
  id: string; name: string; byteSize: number; source: "intake" | "discovery";
  read: DiscoveryDataTypes["read"] | null;           // null for intake files: nothing to read here
  messages: DiscoveryUIMessage[];                    // the file chat, by metadata.fileId
};

export type DiscoveryView = {
  brief: { revision: number; sections: BriefSection[]; open: BriefSection[]; agreed: number; total: number; percent: number };
  questions: QuestionRow[];                          // every asked topic, in first-asked order
  askedNow: DiscoveryDataTypes["question"][];        // the questions on the last assistant message, still open
  files: { rows: FileRow[]; discoveryCount: number; limit: number | null; atLimit: boolean };
  pendingSuggestions: { id: string; fileId: string; fact: string }[];   // file facts not yet agreed
  usage: DiscoveryUsage | null;                      // the last transient usage part the screen saw
  review: { finished: DiscoveryDataTypes["revision"]["change"] & { kind: "finish" } | null; revisionAtFinish: number | null };
  ready: boolean;                                    // the last reply carried data-ready
  labels: string[];
};

/** Total and idempotent: a transcript in, a view out. Order of messages is the order of truth. */
export function foldDiscovery(messages: readonly DiscoveryUIMessage[], opts?: { funded?: boolean }): DiscoveryView {
  // TODO walk messages once, in order:
  //   data-question    -> questions[topicId] = { status: 'open' | 'coming-next' , questionMessageId }
  //   data-brief       -> agreed: sections[topicId] = { text, source: `chat, round ${n}`, status: 'agreed', answerAt: source }
  //                       uncertain: status 'not-sure' with hint; open: importance + suggestion; reopened: status 'open'
  //   data-file        -> files[id]
  //   data-read        -> files[fileId].read = part (last wins; the transport replaces by part id anyway)
  //   data-revision    -> revision = part.revision; edit: sections[sectionId].text/source; accept: agreed with
  //                       source 'suggestion you accepted'; finish: review.finished; remove-label: labels
  //   data-usage       -> usage (last wins)
  //   data-ready       -> ready = true
  //   user text with data-request kind 'reply' -> answerAt for the answered topics = this message id
  // revision = number of data-brief parts that changed something + number of data-revision parts (server-numbered
  //   parts win; the count is only a fallback for a transcript with no revision parts)
  // percent = agreed / total over the stable topic checklist (topics that ever appeared in data-question/data-brief)
  throw new Error("not implemented");
}

/** Which of the asked questions are still open after `draft` is applied. Pure; the composer's Send rule. */
export function readyToSend(view: DiscoveryView, draft: Record<string, DiscoveryAnswer>): { canSend: boolean; carriedOver: string[] } {
  throw new Error("not implemented");
}

/** The Finish review page's own fold: open questions first, by importance order needed > suggested > later. */
export function reviewOf(view: DiscoveryView): {
  open: BriefSection[]; sections: BriefSection[]; acknowledgmentsNeeded: { gaps: boolean };
  documentSections: BriefSection[];        // AT-004.63 order: need, users, agreed, measure, open, files, tier, fit, labels
} { throw new Error("not implemented"); }

/** The usage card's numbers and bar, per contract "Gauge behavior". Pure over DiscoveryUsage. */
export function gaugeOf(usage: DiscoveryUsage): {
  headline: string; mode: "free" | "paid" | "unavailable"; freeFill: number; fuelFill: number;
  band: "green" | "yellow" | "red"; barLabel: string; foot: string; buyFuel: boolean;
} { throw new Error("not implemented"); }
```

Where each piece of state lives and who writes it:

| Piece | Lives in | Written by |
| --- | --- | --- |
| Questions asked, options, suggested, importance | `data-question` parts on assistant messages | the transport (server) |
| Answers agreed, source turn, uncertain answers | `data-brief.agreed` / `.uncertain` on the reply that filed them | the transport |
| Open questions with importance | `data-brief.open` on the latest reply | the transport |
| File facts as suggestions | `data-brief.suggestions`, agreed later through a normal reply | the transport |
| Files and read state | `data-file` on the add-file message; `data-read` part id `read:${fileId}` | the transport, replaced in place |
| Usage | the last transient `data-usage` | the transport; the screen keeps only the last one in `useState` via `onData` |
| Edits, accepted suggestions, removed labels, finish | `data-revision` on the assistant echo of the action message | the transport |
| Draft answers, open panels, edit textarea text | `useState` in the component that owns the control | the NGO |
| Draft message text | `useChat` composer state | the NGO |

There is no store. Reload = re-seed `useChat` with the transcript and fold again. This is what
gives the PRD its "persists and resumes with its question, answer, brief, and funding state intact"
for free: the transcript is that state.

Shared-state check: two writers to the transcript are the stream reducer inside `useChat` and the
push channel (read progress, below). Both append or replace parts through `setMessages`, and
`data-read` parts are replaced by part id, so a late progress part never fights a reply. An edit and
a reply cannot race: both are sent through `sendMessage`, and `useChat` serialises sends.

### 2. The transport contract

```ts
// src/lib/discovery-transport.ts  (NEW)
import type { ChatTransport } from "ai";

/** The one seam phase 3 swaps. A ChatTransport plus a push channel for parts that arrive without a send. */
export interface DiscoveryTransport extends ChatTransport<DiscoveryUIMessage> {
  /**
   * Parts the server produces on its own clock: read progress, a question during a read, the digest.
   * The screen appends or replaces them by part id. Returns unsubscribe. Called once per mount.
   */
  subscribe(onPart: (messageId: string, part: DiscoveryDataPart) => void): () => void;
  /** Builds the request the transport will send for the last user message; exported for the composer's preview. */
  requestOf(message: DiscoveryUIMessage): DiscoveryRequest | null;
}
export type DiscoveryDataPart = Extract<DiscoveryUIMessage["parts"][number], { type: `data-${string}` }>;
```

How the components call each action, so phase 3 swaps only the transport:

```ts
// every action is a message. The screen never fetches.
sendMessage({ text: note, parts: [{ type: "data-request", data: { kind: "reply", message: note, mode, answers } }] });
sendMessage({ metadata: { fileId }, text: answer, parts: [{ type: "data-request", data: { kind: "file-answer", fileId, message: answer } }] });
sendMessage({ parts: [{ type: "data-request", data: { kind: "add-file", name, byteSize, mediaType, uploadRef } }] });
sendMessage({ parts: [{ type: "data-request", data: { kind: "edit", sectionId, text } }] });
sendMessage({ parts: [{ type: "data-request", data: { kind: "accept", topicId } }] });
sendMessage({ parts: [{ type: "data-request", data: { kind: "finish", acknowledgments } }] });
```

The transport reads the last user message's `data-request` part and answers with a stream. For
`reply` and `file-answer` that stream carries text plus the parts above and a `data-charge`. For
the free actions the stream carries `data-revision` (and `data-charge: { kind: "none" }` so the
receipt line can say "Free · no reply used"), no text. Phase 3's `EdgeDiscoveryTransport` posts
`reply` and `file-answer` to `discovery-message`, `add-file` to the upload function, and the rest
to a `discovery-brief` function, and turns each answer into the same parts. The UI never touches
the database; the transport touches only edge functions.

The upload itself (`uploadRef`) is the one thing a message cannot carry. The chooser panel calls
`transport.upload?.(file)` if present; the fixture transport returns a fake ref; phase 3 uploads
to storage through the existing reference-upload function and returns its id. This is the one
optional member on the transport, and it is optional so the fixture never pretends to store bytes.

Refusals stay as today: an error whose message is the `DiscoveryRefusal` JSON; the screen restores
the draft and shows the reason, exactly as the current route does.

### 3. Module map

```
src/lib/
  discovery-stream.ts        grown as in section 1 (shared with supabase/functions; the backend stream helpers gain part() for the new types in phase 3)
  discovery-brief.ts         NEW  foldDiscovery, readyToSend, reviewOf, gaugeOf, IMPORTANCE order, topic checklist  (pure; selftest)
  discovery-transport.ts     NEW  DiscoveryTransport, DiscoveryDataPart, requestOfMessage(message) helper
  discovery-chat.ts          kept for the current route; phase 3 folds messagesFromTurns into the transport

src/components/discovery/
  index.ts                   exports DiscoveryScreen, DiscoveryFinishPage
  DiscoveryScreen.tsx        useChat + subscribe wiring; layout (desktop grid / phone column); owns panel state
  Conversation.tsx           the transcript: AssistantMessage, NgoMessage, QuestionCard (options, Suggested, Write my own, Not sure), Added-to-brief line, receipt
  Composer.tsx               one-line growing textarea (field-sizing: content with a rows fallback), attach button, Send / Send paid reply / Next question
  QuestionsCard.tsx          the six rows with TopicStatus dot + note, Answer / View
  BriefCard.tsx              closed card "Your live brief · Revision n · k of 6 agreed" + Open
  BriefPanel.tsx             the sections list with status dot, Edit, hint; used by both containers below
  BriefSidePanel.tsx         desktop: <section aria-labelledby> beside the chat, widens the grid column
  BriefSheet.tsx             phone: full-screen <dialog aria-modal aria-label="Your live brief"> with Back to chat (shadcn Sheet side="bottom" full height)
  UsageCard.tsx              headline, two-part bar (role=img + aria-label), values line, footer, Buy fuel
  FilesCard.tsx              "Your files · n of 3 added", rows with state note and progressbar, Add a file (aria-disabled at limit + limit text)
  FilePanel.tsx              the floating panel: Chooser view | FileChat view; desktop dialog bottom-right, phone full-screen sheet
  FileChooser.tsx            drop area, Choose a file (input type=file), accepted types, sample-data disclosure, Cancel
  FileChat.tsx               the file's messages (filtered by metadata.fileId), chips, one-line textarea, progress strip, Close and keep reading
  FinishPage.tsx             DiscoveryFinishPage: open questions first (importance tag, why, Suggested, Use the suggestion / Answer in the chat), sections with Edit, files, cause, confirmation card, Finished state
  DiscoveryDocument.tsx      the rendered document sections (AT-004.63), used by FinishPage and by phase 3's read-only view
  copy.ts                    every string the canvas fixed, as named constants, so tests and components share one spelling
```

Signatures of the load-bearing components:

```tsx
export function DiscoveryScreen(props: {
  transport: DiscoveryTransport;
  initialMessages: DiscoveryUIMessage[];
  project: { title: string; organisation: string; needText: string; funded: boolean };
  onFinish(): void;                       // navigation only; Finish makes no call
}): JSX.Element;
// inside:
//   const { messages, sendMessage, setMessages, status } = useChat<DiscoveryUIMessage>({ transport, messages: initialMessages, onData });
//   useEffect(() => transport.subscribe((id, part) => setMessages(replacePart(id, part))), [transport]);
//   const view = useMemo(() => foldDiscovery(messages, { funded }), [messages, funded]);
//   const [draft, setDraft] = useState<Record<string, DiscoveryAnswer>>({});
//   const [panel, setPanel] = useState<{ brief: boolean; file: { kind: "chooser" } | { kind: "chat"; fileId: string } | null }>(...)

/** Replace a data part by its id inside a message, or append it; pure so the subscribe wiring is testable. */
export function replacePart(messageId: string, part: DiscoveryDataPart): (messages: DiscoveryUIMessage[]) => DiscoveryUIMessage[];

export function DiscoveryFinishPage(props: {
  transport: DiscoveryTransport; initialMessages: DiscoveryUIMessage[];
  project: DiscoveryScreen["props"]["project"]; onBackToChat(): void; onAnswerInChat(topicId: string): void;
}): JSX.Element;
// its own useChat on the same transport and transcript; edits, accepts, finish are sendMessage calls; no text is ever streamed here

export function QuestionsCard(props: { rows: QuestionRow[]; onAnswer(topicId: string): void; onView(messageId: string): void }): JSX.Element;
export function UsageCard(props: { usage: DiscoveryUsage | null; onBuyFuel(): void }): JSX.Element;
export function BriefPanel(props: { view: DiscoveryView; onEdit(topicId: string): void }): JSX.Element;
export function FilesCard(props: { files: DiscoveryView["files"]; onAdd(): void; onOpen(fileId: string): void }): JSX.Element;
export function FileChat(props: { row: FileRow; usage: DiscoveryUsage | null; busy: boolean; onAnswer(text: string): void; onClose(): void }): JSX.Element;
```

Boundaries: the transport parses wire bytes into parts (`per boundary-discipline`); everything
above it trusts the types. The fold encodes the invariants that matter: a topic is `agreed` only
through a `data-brief.agreed` or a `data-revision.accept`; a file fact reaches a section only
through `agreed`; a finish clears when any later `data-revision` or `data-brief` carries a change
(the fold derives "approval invalidated" instead of storing it, `per single-source-of-truth`).
Importance is a closed union whose labels live in one map. The transport is the only thing that
knows a URL.

Interface depth: the public surface is one component with four props, one page with five, and one
transport interface with two members beyond `ChatTransport`. Behind it sit the fold, the panel
routing, the in-place part replacement, the phone/desktop split, and every string. What stays
exposed is what a caller must decide: which transport, which transcript, where Finish navigates.

### 4. The fixture shell

Keep: `vite.config.ts` (port 4310), `tsconfig.json`, `index.html`, `main.tsx` (still imports
`src/styles.css` first), `App.tsx` hash router and chrome, `components.tsx`, `screens.tsx` for the
other pages, `ProjectBuild.tsx`, `questions.ts` (the topic bank, gains `importance` per topic),
`fixtures/blank-shift-template.csv`, the critique folder.

Delete: `Discovery.tsx`, `DiscoveryProgress.tsx`, `DiscoveryReferences.tsx`, `DiscoveryScope.tsx`,
`discovery-chat.css` (the components carry their Tailwind classes), `discovery-examples.ts`.

Add:

```
design/astra/src/
  fixture-store.ts        { messages: DiscoveryUIMessage[]; usage: FixtureUsage; funded: boolean } in localStorage key ai4good.astra.discovery.v2, zod-checked; read()/write()/reset()
  fixture-transport.ts    REWRITTEN: class FixtureDiscoveryTransport implements DiscoveryTransport
  fixture-script.ts       the scripted replies: intro asking for files, per-topic replies, the reply after a digest ("I finished reading X. Is that right?"), the ready reply
  fixture-files.ts        per sample file: chips for the one question, an optional question during the read, progress steps, digest facts count, the three-file limit
  fixture-scenarios.ts    named transcripts: 'fresh', 'three-agreed', 'one-open-each-importance', 'ready', 'paid', 'no-fuel', 'three-files', 'finished'. Each is a function () => DiscoveryUIMessage[] built by running the fixture transport over scripted sends, so a scenario can never disagree with the transport.
```

The fixture transport folds the same transcript to decide what to say next:

```ts
export class FixtureDiscoveryTransport implements DiscoveryTransport {
  constructor(private readonly store: FixtureStore) {}
  async sendMessages({ messages, abortSignal }): Promise<ReadableStream<UIMessageChunk>> {
    const request = requestOfMessage(messages.at(-1)!);           // from src/lib/discovery-transport
    const view = foldDiscovery(this.store.read().messages);        // the same fold the screen uses
    // TODO switch (request.kind):
    //   reply       -> refuse if usage says unavailable; charge free-first; text from fixture-script for the
    //                  answered topics; data-brief with agreed/uncertain/open + importance; data-question for
    //                  currentQuestions(view); data-filed; data-charge; data-ready when all agreed; data-usage
    //                  the FIRST reply (no assistant message yet) adds the files paragraph iff discoveryCount < 3
    //                  if pendingSuggestions non-empty and the NGO agreed in text -> move them to agreed
    //   file-answer -> charge like reply (same counters, same order); text "Thanks. I am reading it now…";
    //                  start the timed read (below) if state was 'asking' or resume if 'waiting'
    //   add-file    -> refuse when discoveryCount >= 3 and !funded; data-file; data-read {state:'asking', 0}
    //   edit|accept|remove-label|finish -> data-revision numbered store.revision+1; charge none; no text
    // write the assistant message (built from the same chunks) into the store BEFORE streaming, like today
    throw new Error("not implemented");
  }
  subscribe(onPart) { /* TODO the timed read: 5% -> 35% -> (waiting with the during-question, until the next file-answer) -> 70% -> ready with digest; every step writes the store and calls onPart('assistant:<id>', { type:'data-read', id:`read:${fileId}`, data }) */ return () => {}; }
  async reconnectToStream() { return null; }
  requestOf(message) { return requestOfMessage(message); }
  upload = async (file: File) => ({ uploadRef: `fixture:${file.name}`, byteSize: file.size, mediaType: file.type });
}
```

Mounting: `App.tsx` route `discovery` renders `DiscoveryScreen` with the fixture transport and
`fixtureStore.read().messages`; route `scope` becomes `finish` and renders `DiscoveryFinishPage`.
The Review page's scenario select loads `fixture-scenarios` into the store, and the fixture shell
reads `?scenario=<name>&device=<phone|desktop>` on load so the screen driver can open a scenario
by URL with no clicks. `model.ts` stays for the other mock screens; its Discovery functions
(`completeReply`, `confirmBrief`, `regenerateScope`, `saveAnswer`, `discoveryGaps`, the
Discovery scenarios) go, and `stateSchema` drops the fields only they used. The type check
(`bun run design:astra:check`) lists every other reader.

### 5. The screen-test driver

One new harness module, one new dev dependency, one CI step.

```ts
// tests/at/harness/screen.ts  (NEW; the sanctioned addition)
import { chromium, type Browser, type Page } from 'playwright';

export type Device = 'desktop' | 'phone';           // 1280x900 and 390x844
export type ScreenTarget = { origin: string; kind: 'fixture-shell' | 'app' };

/**
 * WHERE THE SCREEN IS, per tier. Loop: the fixture shell, started here if nothing answers on 4310.
 * Integration (phase 3): the app at AT_SCREEN_ORIGIN, signed in with the world's session; until that
 * lands, the integration bodies throw CapabilityPending('ui.discovery-surface') and never reach here.
 */
export function screenTarget(tier: Tier): ScreenTarget { throw new Error('not implemented'); }

/** Start the fixture shell once per process, or adopt one already listening (Codex keeps one running). */
export async function ensureFixtureShell(): Promise<{ origin: string; stop(): Promise<void> }> {
  // TODO probe http://127.0.0.1:4310; if closed spawn `bun run design:astra` detached with stdio to a
  // temp log, poll until 200, register process.once('exit') to kill it; if open, adopt and never kill
  throw new Error('not implemented');
}

export type ScreenOptions = { device: Device; scenario: string; colorScheme?: 'light' | 'dark' };

/**
 * A page on the Discovery screen at the right tier, closed after `fn`. The URL is built here and nowhere
 * else, so a body never spells one. The page records every request to a `functions/v1/` path, so a body
 * can assert how many model-shaped calls a step made (AT-004.61, .62).
 */
export async function withScreen<T>(
  ctx: { atId: string },
  opts: ScreenOptions,
  fn: (page: Page, calls: { modelCalls(): number }) => Promise<T>,
): Promise<T> { throw new Error('not implemented'); }

let browser: Browser | null = null;   // one Chromium per worker; closed on process exit
```

Answers to the questions the task asks:

- How a body gets a page: `withScreen(ctx, opts, fn)` after `ctx.open()`. `open()` stays the
  harness handshake so `executeRegisteredBody` sees an opened world; the world is unused here.
  At the loop tier the driver builds `${origin}/?scenario=${s}&device=${d}#discovery`.
- Who starts the shell: the driver, lazily, once per vitest worker; `j-need-brief.test.ts` is the
  only file that uses it, so no port race. CI gains `bunx playwright install --with-deps chromium`
  after `bun install`; nothing else in `ci.yml` changes.
- How .61 proves "no other model call": `calls.modelCalls()` counts requests whose path contains
  `functions/v1/`. In the fixture shell that is zero by construction, so the body asserts the
  strong form: after one Send, the assistant message shows "Added to brief" and the brief panel
  shows the new section and importance, and `modelCalls()` is `0`; then Finish, accept, save,
  finish: still `0`. In phase 3 the same body asserts `1` after Send and `1` after Finish.
- .67 and .68: the loop body asserts the screen part (the usage headline drops by one after a
  file-chat answer; the file row shows "Reading… 35%", "A question for you", "Ready · 4 facts"; the
  next reply says what the file showed), then ends with
  `throw new AtPending(ctx.atId, 'sut-missing', 'the backend part lands in phase 3: counters on the real turn table; the digest at the context boundary')`.
  The declaration keeps `{"kind":"pending","phase":"sut-missing"}` for both. A broken screen part
  throws an ordinary assertion error, which matches no declaration and fails the run: honest.
- .69 stays `notYet('AT-004.69')` with the detail "needs the real API; phase 3".
- Tiers in phase 2: loop runs the bodies against the shell and goes green for .61 to .66 and .70
  to .73; integration bodies are `awaiting(AWAITED.discoverySurface)`, declared
  `capability-pending ["ui.discovery-surface"]`, the same shape .02 already declares. Both
  changes land in `tests/at/expected/req-004.json` in the same commit as the bodies.
- Phase 3: `screenTarget('integration')` returns the app origin; `withScreen` signs the page in
  with the opened world's session and opens the real route; the `integration` key of each body
  map becomes the same function as `loop`. No body text changes.
- `--wired` in `runner.ts`: leave it, and change its message to name `surface: 'ui'` ids as
  runnable at the loop tier through `screen.ts`; the flag's own semantics (a re-run selection)
  are a later slice. Not touching the exit code keeps the runner selftests green.
- The DOM-lib risk: Playwright's `.d.ts` may reference DOM types, and `tests/at/tsconfig.json`
  has `skipLibCheck: false` and no DOM lib. Unit 3 measures this first. If it fails, the driver
  adds `/// <reference lib="dom" />` in `screen.ts` only, which scopes the lib to that file; if
  that is not enough, the fallback is `playwright-core` typed through a thin local declaration.

### 6. Phone designs, in words

File chat, 390 px. Add a file and a file row open a full-screen sheet, not a floating box. Header
56 px: Back to chat on the left, the file name centred, the state under it in the same colours as
desktop. A 3 px progress strip under the header while reading or waiting. The messages fill the
middle. The chips wrap above a one-line growing textarea with a 44 px Send; the usage headline sits
as a one-line footer under the composer, as on desktop. While reading, the composer is replaced by
"Close and keep reading" with the hint "Reading goes on. Open the file in Your files to come back."
Closing returns to the chat; the file row keeps its state. The Chooser view is the same sheet with
the drop area filling the middle and Choose a file as a 44 px primary button; on a phone the drop
area's text says "Choose a file" first, "or drop one" second.

Questions card, 390 px. It becomes a collapsible strip between the progress bar and the chat:
"Questions · 3 answered · 2 open" with a chevron. Open, it lists the rows in the desktop order
with the same dots and notes, one per line, Answer and View as 44 px text buttons at the right.
Answer closes the strip and scrolls the question card into view with focus on its first option.
View closes the strip and scrolls to the highlighted answer. The strip starts closed; a new round
(a fresh assistant message with questions) does not reopen it.

Finish review page, 390 px. One column. The header shows "Your Discovery document · Revision n".
The open-questions box comes first, each row stacked: title with the importance tag, why, the
suggestion, then two 44 px buttons in a row, Use the suggestion and Answer in the chat. The
sections follow with Edit at the right; editing opens the textarea in place with Cancel and Save.
A fixed bottom bar shows the three checkboxes collapsed into one line "Confirm and finish" that
scrolls to the confirmation card at the end of the column, as the contract's narrow-screen rule
says; the card holds the checkboxes, Finish Discovery (48 px), and Back to the chat. The finished
state is the same card as desktop, full width.

### 7. Build order

1. Contract and fold. Grow `discovery-stream.ts`; write `discovery-brief.ts` and
   `discovery-transport.ts` with bodies; add `tests/at/harness/discovery-brief.selftest.ts` over
   hand-built transcripts (one per topic status, one with a file suggestion, one with an edit
   after finish). Check: `bun run typecheck`, `bun run at:selftest` green.
2. Fixture backend. `fixture-store.ts`, `fixture-script.ts`, `fixture-files.ts`,
   `fixture-scenarios.ts`, the transport rewrite; a `design/astra/src/fixture.selftest.ts` is not
   allowed (no vitest there), so the check is: scenarios fold to the expected counts in the
   harness selftest, importing the fixture modules by relative path. Check: `bun run design:astra:check`.
3. Driver. `screen.ts`, the CI step, `playwright` in devDependencies, the `--wired` message. A
   first body, AT-004.72 desktop half, against a placeholder `DiscoveryScreen` that renders the
   usage card only. Check: `bun run at:verify req-004 --tier loop --expect` with .72 still declared
   red, then move it green once it passes; the DOM-lib risk is settled here.
4. Conversation, Composer, QuestionsCard, the desktop layout. Bodies .65, .71, .61. Check: the
   three ids green under `--expect`; `bunx tsc --project design/astra/tsconfig.json`.
5. Brief card, side panel, phone sheet, usage card, phone layout. Bodies .72 (both halves), .73.
6. Files: FilesCard, FilePanel, FileChooser, FileChat, the timed read through `subscribe`.
   Bodies .66, .70, and the screen halves of .67 and .68 with their pending tails.
7. Finish page and document. Bodies .62, .63, .64. Check: every declared id matches.
8. Phone passes at 390 px on the file chat, Questions strip, and Finish page; dark mode on every
   panel; the Codex loop on the shell; the ride-along sync-stamps in `loop/decomp/req-004.md`,
   `req-032.md`, `req-036.md`. Check: Codex reports no open issue; `--expect` green at loop;
   integration `--expect` still matches (the ids stay red there).

Each unit is one commit group and ends at the gate.

## Synthesis decision

*Filled in by arena.*

## Tradeoffs accepted

- We accept that every non-chat action goes through `sendMessage`, so the composer is briefly
  busy during a free save, in exchange for one seam: phase 3 swaps a transport and touches no
  component.
- We accept a push channel on the transport (`subscribe`) as the one place parts arrive without a
  send, in exchange for a main chat that stays usable during a read and a read whose progress is
  still a message part, not a store.
- We accept that the fold runs on every render (memoised on `messages`), in exchange for no
  duplicated state; a transcript of a few hundred parts folds in well under a millisecond.
- We accept that the fixture keeps the transcript in localStorage rather than a state object, in
  exchange for a fixture that can never disagree with what the screen would show after a reload.
- We accept `model.ts` staying for the other mock screens, in exchange for not touching pages
  this item does not own.
- We accept the driver starting the shell lazily instead of through a vitest `globalSetup`, in
  exchange for `req-016` and every other suite paying nothing for a browser they never open.

## Alternatives considered

- **A reducer store beside `useChat`** (the current mock's shape: zod state, transcript derived).
  Exposes two truths to callers and to phase 3, which then has to hydrate a store the backend does
  not have. Hides nothing the fold does not hide. Lost on interface depth: same surface, two
  sources.
- **Per-file `useChat` instances for file chats.** Each file chat gets its own stream, so read
  progress could ride the open stream and no push channel is needed. Exposes hook-per-file
  plumbing and a merge across chats for the brief, and the file chat's stream blocking its own
  composer during the read is wrong on the phone sheet. Lost on caller load and the merge.
- **Direct edge-function calls from the components for edits, accept, finish** (what the item
  text literally says). Exposes URLs, auth headers, and a second error path to every component
  that acts, and a second thing phase 3 must swap. Hides nothing. Lost on interface depth, and it
  breaks "messages are the source of truth" because an edit would then live only in a response.
- **A vitest `globalSetup` that starts the shell for every acceptance run.** Simpler driver, but
  every suite pays for a vite server and a Chromium it does not use, and the runner selftests'
  black-box trees would start a shell too. Lost on blast radius.

## Open questions and risks

- Does `useChat` in the installed `@ai-sdk/react` accept a user message whose only content is a
  `data-request` part (no text)? If not, the action messages carry a one-word text ("Saved",
  "Finish") that the transcript view hides by `data-request.kind`. Which do you prefer?
- Does the installed SDK reconcile a streamed `data-*` part by `id` inside an existing message,
  or only within the message being streamed? If only the latter, `replacePart` does the in-place
  replacement itself and the push channel writes through `setMessages`; the design already routes
  push parts through `replacePart`, so the answer changes one line, but it should be measured in
  unit 1.
- Playwright's type declarations and the harness tsconfig with no DOM lib: settled in unit 3, with
  the two fallbacks named above. Do you accept `/// <reference lib="dom" />` scoped to `screen.ts`
  if it is needed?
- The "Questions card" on a phone is proposed as a collapsible strip. The canvas has no phone
  Questions card; is a strip acceptable, or should it be a third full-screen sheet like the brief?
- The three-file limit on a funded project: the fold takes `funded` from `project`; the fixture
  exposes a `funded` toggle on the Review page. Is that toggle wanted, or is a `funded` scenario enough?
- `--wired` in `runner.ts` keeps exit 3 and only changes its message. Should this item instead make
  `--wired` a real selection of `surface: 'ui'` ids at the loop tier, or leave that to phase 3?

## Next implementation step

Write `src/lib/discovery-brief.ts` with `foldDiscovery` over the grown `DiscoveryDataTypes`, and a
selftest that folds one hand-built transcript per topic status, because everything else in this
design is a view of that one function.
