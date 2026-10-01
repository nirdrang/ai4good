# Candidate design: the Discovery screen, revision 12, test-first from the accessible contract

Runner: Opus. Direction: the thirteen acceptance tests and one shared accessible contract are the
spine. The component tree and the state follow from them. State management is the smallest thing
that makes the tests pass and phase 3 a data-source swap.

Two facts in this package were measured in the scratchpad, not assumed:

- **Playwright's type declarations do not compile under `tests/at/tsconfig.json` as it stands.**
  `playwright-core@1.58.2` with `lib: ["ES2022"]`, `types: ["node"]`, `skipLibCheck: false` fails
  with TS2304 on exactly four names: `Node`, `HTMLElement`, `SVGElement`, `HTMLElementTagNameMap`.
  A 7-line ambient file that declares those four as opaque interfaces makes it compile clean, and
  `document.title` in a test file still fails with TS2584. So the "no DOM lib" rule survives, but
  only with that file. (Probe: `scratchpad/pwprobe/`.)
- **The founder's machine already has Chromium revision 1208**, which is the revision
  `playwright-core@1.58.2` pins (`browsers.json`). Pinning that exact version means no browser
  download locally.

---

## Problem

The Discovery screen must ship as real components in `src/components/discovery/`. In phase 2 they
run on fixture data in `design/astra`. In phase 3 they run on edge functions, and only the data
source changes. The thirteen acceptance tests AT-004.61 to .73 must check what a person sees, so
the same bodies run against the fixture shell now and the real route later. Four constraints make
the shape non-obvious:

1. **The harness refuses a body that never opens a world** (`testUseProblem` in `registry.ts`). A
   screen body must call `ctx.open()` even when the loop-tier screen does not read the world.
2. **The test project has no DOM library, and Playwright's types need four DOM names** (measured,
   above).
3. **A red in the `--expect` gate must match its declaration exactly.** AT-004.67 and .68 assert a
   screen part and must then stay red in a declarable shape, which means a `CapabilityPending`, not
   an assertion error.
4. **AT-004.61 asks the screen test to prove that no other model call runs.** A screen cannot see a
   model call. Something below the screen must report it, at both tiers, without the test reaching
   into product code.

Constraints inherited from the tree: `useChat` from `@ai-sdk/react` with a `ChatTransport` slot
(the mock already does this); the stream types in `src/lib/discovery-stream.ts` are shared by the
mock and the backend; UI code never touches the database; `design/astra/tsconfig.json` adds
`noUnusedLocals` and `noUnusedParameters`, so the production components must satisfy the stricter
flags too; `src/styles.css` already scans `../src` with `@source`, so Tailwind classes in
`src/components/discovery/` are picked up when the shell imports that stylesheet.

---

## Usage (caller's view)

There are three callers. The test bodies are the first and they are the spec.

### Caller 1: an acceptance body (tests/at/suites/req-004/j-need-brief.test.ts)

```ts
import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { awaiting, AWAITED } from './_pending.ts';
import { discoveryScreens, VIEWPORTS } from './_screen.ts';
import { IMPORTANCE, QUESTION_STATUS as S } from '../../../../src/components/discovery/a11y.ts';
import { GIVEN } from '../../../../design/astra/src/givens.ts';

// One line: this file owns a built fixture shell and one Chromium for its lifetime (loop tier only).
const withDiscovery = discoveryScreens();

atTest('AT-004.71', 'the Questions card shows states and jumps to the chat', { surface: 'ui' }, async (ctx) => {
  const q = GIVEN['mid-interview'].questions;
  for (const viewport of VIEWPORTS) {
    await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (d) => {
      await d.chat.question(q.info).pick('Name and phone only');     // a draft, so one row is Ready to send
      const card = await d.questionsCard();                           // phone: opens the Questions panel
      expect(await card.statuses()).toEqual([
        [q.priority, S.answered], [q.booking, S.answered], [q.measure, S.notSure],
        [q.owner, S.open], [q.info, S.ready], [q.rules, S.next],
      ]);
      await card.answer(q.owner);
      expect(await d.chat.question(q.owner).hasFocus()).toBe(true);
      await (await d.questionsCard()).view(q.booking);
      expect(await d.chat.highlightedMessage()).toContain('Volunteers book themselves');
      expect(await d.chat.question(q.owner).openWriteOwn()).toBe(true); // a free-text box appears
      await d.chat.question(q.owner).cancelWriteOwn();
      await d.composer.send();                                          // sends info only
      expect(await d.chat.question(q.owner).tag()).toBe('Still open from last round');
      expect(await d.chat.question(q.info).isAsked()).toBe(false);      // answered, no longer current
    });
  }
});

atTest('AT-004.67', 'file-chat answers are turns and the read is free', { surface: 'ui' }, async (ctx) => {
  await withDiscovery(ctx, { scenario: 'mid-interview', viewport: 'desktop' }, async (d) => {
    const before = await d.usage.dailyLeft();
    const chat = await d.files.add({ name: 'volunteer-rota.xlsx', bytes: 'name,shift\n' });
    await chat.answerWith('It shows where Sundays stay empty');     // answer 1: starts the read
    await d.files.waitFor('volunteer-rota.xlsx', 'waiting');
    await chat.answerWith('Yes, usually the same person');          // answer 2: resumes the read
    await d.files.waitFor('volunteer-rota.xlsx', 'ready');
    expect(await d.usage.dailyLeft()).toBe(before - 2);             // two answers, the read added none
  });
  // The screen part is proved above. The counters and ledger part needs the real file-chat turn.
  await awaiting(AWAITED.fileRead)();
});
```

### Caller 2: the fixture shell (design/astra/src/App.tsx)

```tsx
import { DiscoveryScreen } from "../../../src/components/discovery/DiscoveryScreen";
import { DiscoveryReview } from "../../../src/components/discovery/DiscoveryReview";
import { fixturePort } from "./fixture-port";
import { givenFromUrl } from "./givens";

const port = fixturePort(givenFromUrl(location.search));   // ?scenario=mid-interview&pace=test

{route === "discovery" && <DiscoveryScreen port={port} onOpenReview={() => navigate("discovery-review")} />}
{route === "discovery-review" && (
  <DiscoveryReview port={port} onBackToChat={(focus) => navigate("discovery", { focus })} />
)}
```

### Caller 3: the real route in phase 3 (src/routes/discovery/$organizationId.$projectId.tsx)

```tsx
const port = useMemo(() => edgeFunctionPort({ organizationId, projectId, token }), [organizationId, projectId, token]);
return <DiscoveryScreen port={port} initialFocus={search.focus} onOpenReview={() => navigate({ to: "./review" })} />;
```

`edgeFunctionPort` is the only new product module phase 3 writes. Nothing under
`src/components/discovery/` changes.

---

## Shape

### 1. The spine: the accessible contract

One module, `src/components/discovery/a11y.ts`, with **no imports**. The components render these
names and this copy; the page objects locate by them. It has no imports because `tests/at`
compiles it under the Node-only config. It holds three kinds of thing: landmark names, name
builders for repeated controls, and the approved copy the acceptance text names.

```ts
// src/components/discovery/a11y.ts
/** The accessible contract of the Discovery screen: every name a person (or a screen reader, or a
 * screen test) finds the screen by. Components render these; tests/at locates by these. Changing a
 * value here changes the screen and its tests in one edit. No imports: tests/at compiles this file
 * without the DOM library. */

export type Role =
  | "log" | "region" | "complementary" | "dialog" | "form" | "group" | "button" | "textbox"
  | "checkbox" | "progressbar" | "img" | "listitem" | "article" | "main";
export type Landmark = { readonly role: Role; readonly name: string };

export const SCREEN = {
  progress:      { role: "region", name: "Discovery progress" },
  finish:        { role: "button", name: "Finish Discovery" },
  conversation:  { role: "log", name: "NGO and AI conversation" },
  composer:      { role: "form", name: "Your reply" },
  messageBox:    { role: "textbox", name: "Your message" },
  questions:     { role: "region", name: "Questions" },           // desktop card
  questionsFull: { role: "dialog", name: "Questions" },           // phone panel
  openQuestions: { role: "button", name: "Open the questions" },  // phone only
  usage:         { role: "region", name: "Discovery usage" },
  openBrief:     { role: "button", name: "Open your live brief" },
  briefSide:     { role: "complementary", name: "Your live brief" }, // desktop
  briefFull:     { role: "dialog", name: "Your live brief" },        // phone
  backToChat:    { role: "button", name: "Back to chat" },
  files:         { role: "region", name: "Your files" },
  addFile:       { role: "button", name: "Add a file" },
  chooser:       { role: "dialog", name: "Add a file" },
  chooseFile:    { role: "button", name: "Choose a file" },
  cancelAdding:  { role: "button", name: "Cancel adding this file" },
  fileAnswer:    { role: "textbox", name: "Your answer about this file" },
  review:        { role: "main", name: "Review before you finish" },
  reviewOpen:    { role: "region", name: "Open questions" },
  confirmation:  { role: "region", name: "Confirm Discovery" },
  reviewBack:    { role: "button", name: "Back to the chat" },
  document:      { role: "region", name: "Your Discovery document" },
  findVolunteer: { role: "button", name: "Find a volunteer" },
} as const satisfies Record<string, Landmark>;

/** Names of repeated controls. The argument is the visible text the name is built from. */
export const NAME = {
  option: (label: string, suggested: boolean) => (suggested ? `${label} Suggested` : label),
  writeOwn: "Write my own",
  ownAnswer: (question: string) => `Your own answer to: ${question}`,
  answerRow: (question: string) => `Answer: ${question}`,
  viewRow: (question: string) => `View your answer in the chat: ${question}`,
  editSection: (title: string) => `Edit ${title}`,
  fileChat: (fileName: string) => `File chat: ${fileName}`,
  reading: (fileName: string) => `Reading ${fileName}`,
  openFileChat: (fileName: string) => `Open the file chat for ${fileName}`,
  useSuggestion: "Use the suggestion",
  answerInChat: "Answer in the chat",
} as const;

export const IMPORTANCE = { needed: "Needed before build", suggested: "A suggestion exists", later: "Can wait" } as const;
export type Importance = keyof typeof IMPORTANCE;

export const QUESTION_STATUS = {
  answered: "Answered", notSure: "Not sure", open: "Open", ready: "Ready to send", next: "Coming next",
} as const;
export type QuestionStatus = keyof typeof QUESTION_STATUS;

export const BRIEF_STATUS = {
  agreed: "Agreed", notSure: "Not sure yet", open: "To be discussed", suggestion: "Suggestion · waiting for you",
} as const;

export const TEXT = {
  suggested: "Suggested",
  carried: "Still open from last round",
  changing: "Changing your earlier answer",
  freeReceipt: "Free reply · no charge",
  fileQuestion: "What should we know about this file?",
  acceptedTypes: "PDF, images, CSV, TSV, TXT, Word, or Excel.",
  sampleData: "Use sample or redacted data, not real records. ai4good and your volunteer will see it.",
  fileLimit: "Free projects can add 3 files in Discovery.",
  fileStatus: {
    asking: "Setting up",
    readingPrefix: "Reading…",
    reading: (percent: number) => `Reading… ${percent}%`,
    waiting: "A question for you",
    ready: (facts: number) => `Ready · ${facts} facts`,
  },
  source: {
    intake: "From your intake",
    chat: (round: number) => `From the chat, round ${round}`,
    accepted: "Suggestion you accepted",
    edit: "Your edit",
    file: (fileName: string) => `From ${fileName}`,
  },
  revision: (n: number) => `Revision ${n}`,
  usageValues: { daily: "Free today", beta: "Beta", fuel: "Fuel" },
  ack: {
    reviewed: (revision: number) => `I have reviewed revision ${revision}. It describes the first version we need.`,
    gaps: (open: number) =>
      `I understand that ${open === 1 ? "1 question" : `${open} questions`} remain open. I choose to finish Discovery anyway and keep them in the brief.`,
    data: "Our NGO takes responsibility for data access and keeps only the personal information this tool needs.",
  },
  finished: "Discovery finished",
  finishedOpen: "Discovery finished with open questions",
  dataTier: {
    0: "Data: Tier 0. The tool keeps no personal information.",
    1: "Data: Tier 1. The tool keeps ordinary personal information. Keep only what it needs.",
    2: "Data: Tier 2. The tool handles sensitive personal information. During the build, the volunteer uses sample data only. Your NGO connects real data after handoff.",
  },
  fit: {
    fits: "Fit: a staff member can look after this tool by chat after the volunteer leaves.",
    declined: "Fit: this need needs ongoing developer work, so ai4good cannot take it on.",
  },
} as const;
```

The rules the contract encodes, which the components must follow:

- **A name never changes with state.** The canvas names the files section by "Your files · 1 of 3
  added" and the usage card by its changing headline. The contract fixes the region names ("Your
  files", "Discovery usage") with `aria-label`; the changing text stays a visible heading inside.
  A test finds a region the same way in every state.
- **A name contains its visible label** (WCAG 2.5.3). The canvas labels the "Add a file" button
  "Attach a file"; the contract uses "Add a file", which is also the acceptance text.
- **Every question row, brief section and file row is labelled by its own text**
  (`aria-labelledby`), so `getByRole('listitem', { name })` finds it.
- **The highlighted answer carries `aria-current="true"`** while it is highlighted. That is the
  one piece of state a "View" jump exposes, and a screen reader hears it too.
- **An unavailable action that explains itself uses `aria-disabled="true"`**, not `disabled`, so it
  stays focusable (Finish Discovery on the review page, Add a file at the limit). Playwright's
  `getByRole(..., { disabled: true })` honours `aria-disabled`.
- **The conversation is a `log`**, so new replies are announced politely without extra live
  regions. The file-chat status line is the one added `aria-live="polite"` region, because reading
  progress changes while the NGO is elsewhere.

What the contract deliberately does not hold: fixture copy (question texts, file names, scripted
replies). Those are Givens and live in `design/astra/src/givens.ts`.

### 2. The data model, and who writes each piece

| Piece | Where it lives | Who writes it | How the screen gets it |
|---|---|---|---|
| Transcript (messages, data parts) | server; `useChat` in the client | server, one turn at a time | `load()` seeds `useChat`; the stream appends |
| Brief snapshot (topics, questions, suggestions, tier, fit, labels, revision) | server | the chat turn (AI answers) and the NGO's edits and accepted suggestions | `data-brief` part per reply; the result of each brief action; `subscribe()` after a read |
| Files (status, progress, facts, file-chat transcript) | server | the NGO adds; the read process updates | `subscribe()` |
| Usage | server | each turn and each file-chat answer | `data-usage` parts; `subscribe()` |
| Confirmation | server | the NGO's finish action only | `load()`; the result of `finish()` |
| Answer drafts, composer draft, reopened questions | client, `useDiscovery` state | the NGO | local |
| Open panel, highlight target, one-at-a-time mode | client | the NGO | local |
| Review ticks and the open edit | client, `DiscoveryReview` state | the NGO | local |

The load-bearing decisions:

- **The client never writes server state locally.** No optimistic update. Every write goes through
  the port and returns the new server value. So each piece of server state has exactly one writer
  in the client: the port's answer.
- **The brief has two writers on the server**, the AI (by turn) and the NGO (by edit or accepted
  suggestion). Per separate-before-serializing-shared-state, the server owns one monotonic
  `revision`, every write carries the `baseRevision` it read, and a stale write is refused with
  `stale-revision`. The client merges at the read boundary with one rule: keep the snapshot with
  the higher revision. Brief updates arrive from three paths (stream, action result, subscription);
  the rule makes their order irrelevant.
- **The review tick is derived, never synced.** The client stores `reviewedRevision: number | null`.
  The box shows ticked only when `reviewedRevision === brief.revision`. An edit raises the revision,
  so the tick clears itself (AT-004.64) with no code that clears it.
- **Question states are derived.** Answered, Not sure, Open, Ready to send and Coming next come
  from the brief topic, whether a question was asked for it, and the local draft. There is no
  stored status.
- **Open questions are derived.** An open question is an asked question whose topic is not agreed.
  Its importance is on the question. The brief stores no separate open list.
- **Finish is idempotent.** `finish({ revision, acks })` on a revision that is already confirmed
  returns the existing confirmation and carries no funds twice.

```ts
// src/lib/discovery-stream.ts (additions; existing types unchanged unless noted)
export type Importance = "needed" | "suggested" | "later";

export type BriefSource =
  | { kind: "intake" }
  | { kind: "chat"; round: number }
  | { kind: "accepted-suggestion" }
  | { kind: "edit"; revision: number }
  | { kind: "file"; fileId: string; fileName: string };

/** A question as it stands now. The transcript keeps the wording it had when it was asked. */
export type BriefQuestion = {
  id: string;
  topicId: string;
  text: string;
  reason: string;
  options: SuggestedAnswer[];
  /** The one option marked Suggested, or null when the AI suggests none. */
  suggestedId: string | null;
  importance: Importance;
  recommendation: string;
  uncertaintyHelp: string;
  askedInRound: number;
};

/** One entry of the stable topic checklist. Progress = agreed required topics / required topics. */
export type BriefTopic = {
  id: string;
  title: string;
  required: boolean;
  /** The question the AI plans to ask for this topic; shown as Coming next before it is asked. */
  plannedQuestion: string;
  state:
    | { kind: "open" }
    | { kind: "not-sure"; questionId: string }
    | { kind: "agreed"; answer: string; source: BriefSource };
};

export type FileSuggestion = { id: string; topicId: string; fileId: string; fileName: string; fact: string };

export type BriefSnapshot = {
  revision: number;
  need: { text: string; source: BriefSource };
  usersToday: { text: string; source: BriefSource } | null;
  topics: BriefTopic[];
  questions: BriefQuestion[];
  /** Facts from file digests. A suggestion is never an agreed answer until the NGO agrees. */
  suggestions: FileSuggestion[];
  dataTier: { tier: 0 | 1 | 2; reason: string } | null;
  fit: { verdict: "fits" | "declined"; reason: string } | null;
  /** Zero to three, machine-made. The NGO may remove one, never type one. */
  causeLabels: string[];
};

export type FileStatus =
  | { kind: "asking" }                                  // the one opening question is not answered
  | { kind: "reading"; percent: number }
  | { kind: "waiting"; percent: number; questionId: string }  // the read paused on a question
  | { kind: "ready"; facts: number }
  | { kind: "failed"; reason: string };

export type DiscoveryFile =
  | { origin: "intake"; id: string; name: string; sizeBytes: number; tookFromIt: string | null }
  | { origin: "discovery"; id: string; name: string; sizeBytes: number; status: FileStatus; tookFromIt: string | null };

export type Confirmation = {
  revision: number;
  approver: string;
  at: string;
  acceptedGaps: { questionId: string; title: string; importance: Importance; reason: string }[];
};

/** Everything `load()` returns: the whole screen after a reload. */
export type DiscoveryState = {
  project: { title: string; organizationName: string; funded: boolean };
  transcript: DiscoveryUIMessage[];
  brief: BriefSnapshot;
  files: DiscoveryFile[];
  usage: DiscoveryUsage;
  confirmation: Confirmation | null;
};

// Changed: DiscoveryDataTypes gains two parts and the question part gains three fields.
export type DiscoveryDataTypes = {
  question: { /* existing fields */ } & { topicId: string; importance: Importance; suggestedId: string | null };
  filed: { topics: { id: string; title: string }[] };   // kept: the transcript's historical "Added to brief"
  charge: { kind: "free" } | { kind: "paid"; usageMicros: number; feeMicros: number };
  ready: { agreed: number; total: number };
  usage: DiscoveryUsage;                                  // transient
  /** The brief after this reply, from the same model call. Transient: state, not transcript. */
  brief: BriefSnapshot;
};

/** The file chat: one useChat per file, its own transport, the same usage and charge parts. */
export type FileChatDataTypes = {
  /** The question the file chat asks now, with its answer chips. */
  ask: { questionId: string; text: string; chips: string[] };
  /** Read state after this answer. Transient. */
  read: FileStatus;
  charge: DiscoveryDataTypes["charge"];
  usage: DiscoveryUsage;
};
export type FileChatUIMessage = UIMessage<never, FileChatDataTypes>;
export type FileChatRequestBody = { organizationId: string; projectId: string; fileId: string; message: string };
```

Why the brief travels as a whole snapshot and not a patch: six topics and a handful of questions
are small, a snapshot is idempotent (applying it twice changes nothing), and a reload, a missed
part, or two paths arriving out of order all converge on the highest revision. A patch stream
needs ordering and a replay rule, which is the "add a merge later" smell.

Why `data-question` keeps the question beside the brief's copy of it: the transcript is history
(the wording asked in round 2) and the brief is the present (the same question after an edit
reopened it). Two different facts, so two places.

### 3. The port: the one seam phase 3 replaces

```ts
// src/components/discovery/port.ts
import type { ChatTransport } from "ai";
import type {
  BriefSnapshot, Confirmation, DiscoveryFile, DiscoveryRefusal, DiscoveryState,
  DiscoveryUIMessage, DiscoveryUsage, FileChatUIMessage,
} from "@/lib/discovery-stream";

export type Result<T> = { ok: true; value: T } | { ok: false; refusal: DiscoveryRefusal };

/** A server push after something the NGO did not just do: a read moved, a read finished. */
export type ServerChange = { files?: DiscoveryFile[]; brief?: BriefSnapshot; usage?: DiscoveryUsage };

/** Everything the Discovery screen reads or writes. The fixture shell implements it over an
 * in-memory world; phase 3 implements it over edge functions. No method is a model call except
 * the two transports: reading, editing, accepting, uploading and finishing make none. */
export interface DiscoveryPort {
  load(): Promise<Result<DiscoveryState>>;
  /** One main-chat turn per send. Each reply streams text, question, filed, charge, ready, usage, brief. */
  readonly chat: ChatTransport<DiscoveryUIMessage>;
  /** One file-chat turn per answer. The read it starts is not a turn. */
  fileChat(fileId: string): ChatTransport<FileChatUIMessage>;
  /** Uploads and stores the file. No turn, no fuel. Refused at the three-file limit when not funded. */
  addFile(file: File): Promise<Result<DiscoveryFile>>;
  /** Removes a file whose opening question was never answered. Refused once the read has started. */
  cancelFile(fileId: string): Promise<Result<void>>;
  /** Server pushes. Returns the unsubscribe function. */
  subscribe(listener: (change: ServerChange) => void): () => void;
  saveBriefEdit(input: { sectionId: string; text: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  acceptSuggestion(input: { questionId: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  finish(input: { revision: number; acks: { reviewed: true; openGaps: boolean; data: true } }): Promise<Result<Confirmation>>;
}
```

Interface depth: eight members hide the whole backend: storage, turns, metering, the read
pipeline, digests, revisions, and confirmation. No wire type is on it; `edgeFunctionPort` parses
responses into these domain types behind the interface (per boundary-discipline). There is no
rewrite or regenerate member, so AT-004.64's "no AI rewrite action" is true of the type.

The acks object uses literal `true` for the two required boxes, so a caller cannot even ask to
finish without them (per type-system-discipline). `openGaps` is a boolean because it is required
only while questions remain open; the server checks it against its own open count.

### 4. Module map

```
src/lib/discovery-stream.ts            edited: the types above
src/components/discovery/
  a11y.ts                              the accessible contract (section 1). No imports.
  model.ts                             pure derivations: progress, question rows, usage view,
                                       file rows, review gate, brief sections. No React.
  port.ts                              DiscoveryPort and Result (section 3)
  use-discovery.ts                     the hook: useChat + snapshot merge + drafts + panels
  use-is-phone.ts                      matchMedia("(max-width: 767px)")
  DiscoveryScreen.tsx                  loads, lays out desktop or phone, owns the hook
  ProgressStrip.tsx                    percent, agreed count, Finish Discovery; sticky compact strip
  Conversation.tsx                     the log: messages, receipts, "Added to brief", highlight
  QuestionGroup.tsx                    one current question: options, Suggested, Write my own
  Composer.tsx                         growing message box and Send; no usage text
  QuestionsCard.tsx                    rows with status, Answer and View; card or phone panel
  BriefPanel.tsx                       card, desktop side panel, phone full-screen panel
  UsageCard.tsx                        headline, one two-part bar, one values line, footer
  FilesCard.tsx                        file rows with status and progress, Add a file, limit text
  FilePanel.tsx                        chooser (drop area, Choose a file) and one file chat
  DiscoveryReview.tsx                  Finish review page, confirmation, done state
  DiscoveryDocument.tsx                the confirmed document (AT-004.63), rendered by code
```

Call chain: route or shell → `DiscoveryScreen` → `useDiscovery` → `port`. Three files from a click
to the data source.

```ts
// src/components/discovery/model.ts
import type { BriefQuestion, BriefSnapshot, BriefSource, DiscoveryFile, DiscoveryUsage, Importance } from "@/lib/discovery-stream";
import type { QuestionStatus } from "./a11y";

/** What the NGO has chosen for one current question but not yet sent. */
export type Draft = { kind: "option"; optionId: string } | { kind: "own"; text: string };

export function progressOf(brief: BriefSnapshot): { agreed: number; total: number; percent: number } {
  // agreed = required topics in state "agreed"; total = required topics; percent rounds down.
  throw new Error("not implemented");
}

/** The questions the NGO can answer now: asked, topic not agreed, plus any reopened by Edit. */
export function currentQuestions(brief: BriefSnapshot, reopened: readonly string[]): BriefQuestion[] {
  throw new Error("not implemented");
}

export type QuestionRow = { questionId: string | null; text: string; status: QuestionStatus; note: string; canAnswer: boolean; canView: boolean };

/** One row per topic, in checklist order. Status rules:
 *  agreed topic → answered; not-sure topic → notSure;
 *  asked and open, with a non-empty draft → ready; asked and open, no draft → open;
 *  not asked yet → next (text = topic.plannedQuestion). */
export function questionRows(brief: BriefSnapshot, drafts: Readonly<Record<string, Draft>>): QuestionRow[] {
  throw new Error("not implemented");
}

export type UsageView = {
  headline: string;                     // "Next reply is free · 3 left today" / "Next reply is paid · actual usage in USD"
  values: { daily: string; beta: string; fuel: string };
  bar: { free: number; fuel: number; label: string; tone: "green" | "yellow" | "red" };
  footer: string;
};

/** Gauge tone from the UNROUNDED consumed fraction: < 0.8 green, 0.8..0.95 yellow, > 0.95 red. */
export function gaugeTone(consumed: number): "green" | "yellow" | "red" {
  throw new Error("not implemented");
}

export function usageView(usage: DiscoveryUsage, resetLocalTime: string): UsageView {
  // TODO free mode: tone from max(daily consumed, beta consumed); paid mode: tone from fuel consumed;
  // allocation 0 → empty state, never a division by zero. Reset text only while beta capacity remains.
  throw new Error("not implemented");
}

export type FileRowView = { id: string; name: string; statusText: string; percent: number | null; canOpen: boolean };

export function fileRows(files: readonly DiscoveryFile[], funded: boolean): {
  rows: FileRowView[]; discoveryCount: number; canAdd: boolean; limitText: string | null;
} {
  // intake files are listed, never counted; limit 3 applies only while not funded.
  throw new Error("not implemented");
}

export function sourceText(source: BriefSource): string { throw new Error("not implemented"); }

/** Open questions for Finish, grouped in importance order needed → suggested → later. */
export function openForReview(brief: BriefSnapshot): { importance: Importance; question: BriefQuestion; topicTitle: string }[] {
  throw new Error("not implemented");
}

export type ReviewTicks = { reviewedRevision: number | null; openGaps: boolean; data: boolean };

/** Finish is available when the review box is ticked FOR THIS REVISION, the gaps box is ticked
 * while questions are open, the data box is ticked, and no edit is open. */
export function reviewGate(input: { revision: number; openCount: number; ticks: ReviewTicks; editing: boolean }): {
  canFinish: boolean; hint: string;
} {
  throw new Error("not implemented");
}

/** Newer snapshot wins. The one merge rule for the brief, whichever path delivered it. */
export function newerBrief(current: BriefSnapshot, incoming: BriefSnapshot): BriefSnapshot {
  return incoming.revision > current.revision ? incoming : current;
}
```

```ts
// src/components/discovery/use-discovery.ts
import { useChat } from "@ai-sdk/react";
import type { Draft } from "./model";
import type { DiscoveryPort } from "./port";
import type { DiscoveryState, DiscoveryUIMessage } from "@/lib/discovery-stream";

export type Panel = { kind: "none" } | { kind: "brief" } | { kind: "questions" } | { kind: "chooser" } | { kind: "file"; fileId: string };

export type DiscoveryController = {
  state: Omit<DiscoveryState, "transcript">;
  chat: ReturnType<typeof useChat<DiscoveryUIMessage>>;
  drafts: Readonly<Record<string, Draft>>;
  reopened: readonly string[];
  composerText: string;
  panel: Panel;
  highlight: { messageId: string } | null;
  pick(questionId: string, draft: Draft | null): void;
  reopen(questionId: string): void;          // Edit in the brief: no turn
  setComposerText(text: string): void;
  send(): Promise<void>;                     // answers from drafts + composer text, mode "answer"
  focusQuestion(questionId: string): void;   // Answer on a row
  viewAnswer(topicId: string): void;         // View on a row: scroll + aria-current for 2 s
  open(panel: Panel): void;
  addFile(file: File): Promise<void>;
  cancelFile(fileId: string): Promise<void>;
  refusal: { kind: string; reason: string } | null;
};

export function useDiscovery(port: DiscoveryPort, initial: DiscoveryState): DiscoveryController {
  // useChat({ id: "discovery", messages: initial.transcript, transport: port.chat,
  //   onData: part => brief → setBrief(b => newerBrief(b, part.data)); usage → setUsage(part.data) })
  // useEffect(() => port.subscribe(change => merge files, newerBrief, usage), [port])
  // send(): refuses while status is submitted or streaming (no duplicate submission);
  //   body = { mode: "answer", answers: answersFromDrafts(drafts, currentQuestions) };
  //   on success clears the sent drafts and composer text; on refusal keeps both.
  throw new Error("not implemented");
}
```

The file chat is a second `useChat` inside `FilePanel`, with `id: "file:" + fileId` and
`transport: port.fileChat(fileId)`. `useChat` keeps one store per id, so closing and reopening a
file chat keeps its transcript without new state.

```tsx
// src/components/discovery/DiscoveryScreen.tsx
export function DiscoveryScreen(props: {
  port: DiscoveryPort;
  initialFocus?: string;              // "Answer in the chat" from the review page
  onOpenReview: () => void;
}): JSX.Element {
  // load → loading | failed (Retry) | loaded → <Loaded state={...} />
  // Desktop grid: [ProgressStrip] / [Conversation + current QuestionGroups + Composer] | [aside:
  //   BriefPanel card or side panel, QuestionsCard, FilesCard, UsageCard] ; FilePanel opens beside chat.
  // Phone: sticky ProgressStrip with "Open your live brief" and "Open the questions";
  //   conversation; bottom dock = UsageCard (compact) directly above Composer.
  throw new Error("not implemented");
}

// src/components/discovery/DiscoveryReview.tsx
export function DiscoveryReview(props: { port: DiscoveryPort; onBackToChat: (focusQuestionId?: string) => void }): JSX.Element {
  // Unconfirmed: header "Revision N"; Open questions (by importance, with why, suggestion,
  //   Use the suggestion, Answer in the chat); brief sections with source + Edit; files; cause
  //   label with remove; Confirm Discovery card (three ticks, gaps tick only while open > 0,
  //   Finish Discovery aria-disabled per reviewGate, hint); What happens next; Back to the chat.
  // Confirmed: DiscoveryDocument + done card (Discovery finished / ... with open questions, Find a volunteer).
  throw new Error("not implemented");
}
```

`DiscoveryDocument` renders, in order: the need (NGO's words), who uses it and how they work today,
agreed answers each with `sourceText`, how the NGO will know it works, open questions kept with
importance, each file with what the AI took from it, the data tier (`TEXT.dataTier`), the fit
verdict (`TEXT.fit`), and zero to three cause labels. It has no field for a stack, complexity tier,
Lovable, build split or cost, because `BriefSnapshot` has none: the negative half of AT-004.63 is a
property of the type, and the test checks the rendered text as well.

### 5. The fixture shell

`design/astra` keeps its router, its other screens, its styles and its review tools. The Discovery
code leaves it.

| Action | File | Why |
|---|---|---|
| Delete | `Discovery.tsx`, `DiscoveryProgress.tsx`, `DiscoveryReferences.tsx`, `DiscoveryScope.tsx`, `discovery-examples.ts`, `discovery-chat.css` | revision 11, replaced by the production components |
| Edit | `screens.tsx` | remove the `Scope` screen; it is the revision-11 scope review that d94 retires. Its route points to `discovery-review` |
| Edit | `components.tsx` | `routeSchema` gains `discovery-review` |
| Edit | `App.tsx` | mounts `DiscoveryScreen` and `DiscoveryReview` with the fixture port; theme toggle stays |
| Edit | `vite.config.ts` | `resolve.alias: { "@": <repo>/src }` so the production components' `@/` imports resolve |
| Rewrite | `fixture-transport.ts` | `FixtureChatTransport` and `FixtureFileChatTransport` over the world; each `sendMessages` reports one model call |
| Add | `fixture-world.ts` | the in-memory world: brief, files, usage, confirmation, revision counter; persisted per scenario in `localStorage` so a reload keeps it |
| Add | `fixture-port.ts` | `fixturePort(given): DiscoveryPort` over the world; read timers per file |
| Add | `fixture-data.ts` | question bank with importance and suggestions, the scripted replies, three file scripts (`volunteer-rota.xlsx` pauses with a question; `sunday-gaps.csv` pauses; `kitchen-rules.docx` does not), a generic script for any other name, digests |
| Add | `givens.ts` | the fixture ↔ test contract: scenario names, their Given data, the pace option, the model-call probe name. No imports. |
| Prune | `model.ts`, `questions.ts` | keep what `screens.tsx` (Funding, Publish, Dashboard) still reads; `noUnusedLocals` names the rest |

```ts
// design/astra/src/givens.ts
/** The Givens a screen test may ask for, and how the fixture reports its model calls. The fixture
 * shell builds each Given in memory; phase 3 builds the same Given on the real stack through the
 * suite's sut. No imports: tests/at compiles this file. */
export const SCENARIOS = [
  "first-reply",               // intake only, 0 Discovery files, the first AI reply in the transcript
  "first-reply-three-files",   // 3 Discovery files added before the first reply
  "mid-interview",             // round 4: 2 agreed, 1 not sure, 2 asked and open, 1 coming next; free
  "mid-interview-paid",        // the same, free replies used up, fuel available
  "three-files-unfunded",      // 3 Discovery files + 1 intake file, not funded
  "three-files-funded",        // the same, funded
  "finish-open",               // open questions of each importance, ready for review
  "confirmed-tier-1",          // confirmed with one open gap, data Tier 1
  "confirmed-tier-2",          // confirmed, data Tier 2
] as const;
export type ScreenScenario = (typeof SCENARIOS)[number];

export type Start = "chat" | "review";
export type Pace = "test" | "demo";   // test: every fixture timer is 20 ms; demo: the canvas timings

/** The visible inputs of each Given that bodies refer to. Expected results stay in the bodies. */
export const GIVEN = {
  "mid-interview": {
    start: "chat" as Start,
    questions: {
      priority: "What should improve first?",
      booking: "Who should book volunteers into shifts?",
      measure: "What weekly scheduling time would count as success?",
      owner: "Who will look after the tool?",
      info: "What volunteer information will the tool keep?",
      rules: "Which booking rules should the tool enforce?",
    },
  },
  // ... one entry per scenario
} as const satisfies Partial<Record<ScreenScenario, { start: Start }>>;

/** The fixture calls this, when it exists, once per model call it stands in for. The screen test
 * installs it with page.exposeFunction; nothing in src/ calls it. */
export const MODEL_CALL_PROBE = "atFixtureModelCall";
export type ModelCall = "chat-turn" | "file-chat-turn" | "file-read";
```

The model-call probe is how AT-004.61 proves "no other model call" at the loop tier. The fixture
transports and the fixture read are the only things in the shell that stand in for a model, so
they are the only callers. This mirrors how backend suites read `h.vendors.anthropic` attempts: the
count comes from the stand-in, not from the screen. Product code never calls the probe.

URL form: `/?scenario=<name>&pace=test#discovery` (or `#discovery-review` when the Given starts
at review). Codex explores with `pace=demo` and the theme toggle.

### 6. The screen-test driver

Three new files in the harness, one in the suite, one dependency.

| File | Role |
|---|---|
| `tests/at/harness/screen.ts` | builds the fixture shell once, serves it, owns one Chromium, opens pages. Generic: knows no requirement. |
| `tests/at/harness/dom-names.d.ts` | the four opaque DOM names Playwright's types need (measured). Declares nothing a body can use. |
| `tests/at/harness/screen.selftest.ts` | pure parts only: `shellUrl()`, `eventually()` timeout and success, the static server's MIME map |
| `tests/at/suites/req-004/_screen.ts` | `discoveryScreens()`, `withDiscovery()`, the tier switch, and the page objects built on `a11y.ts` |
| dependency | `playwright-core` pinned to exactly `1.58.2` (devDependency). No `@playwright/test`: vitest stays the runner. |

```ts
// tests/at/harness/dom-names.d.ts
/** playwright-core's declarations name four DOM types. This project has no DOM library, by design:
 * a body drives the page through locators and never touches `document`. These opaque declarations
 * let the declarations compile and give a body nothing to use. Measured: with them, playwright-core
 * 1.58.2 compiles clean and `document.title` still fails with TS2584. */
declare global {
  interface Node { readonly __opaqueDomNode: never }
  interface HTMLElement extends Node { readonly __opaqueHtmlElement: never }
  interface SVGElement extends Node { readonly __opaqueSvgElement: never }
  interface HTMLElementTagNameMap { [tag: string]: HTMLElement }
}
export {};
```

```ts
// tests/at/harness/screen.ts
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { afterAll, beforeAll } from 'vitest';

export type Viewport = 'desktop' | 'phone';
export const VIEWPORT_SIZE: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
};

/** A built static site served from this process. No child server: a killed run leaves no orphan. */
export type StaticShell = { readonly baseUrl: string; close(): Promise<void> };

/**
 * Builds a vite app into a temporary folder (never into the repository) and serves it on a free
 * port from node:http. Built, not dev-served: a dev server can reload the page mid-test when its
 * dependency optimizer finds a new import, which is a flaky red that names no defect.
 */
export async function buildAndServe(opts: { viteConfig: string }): Promise<StaticShell> {
  // TODO spawn(process.execPath, [<repo>/node_modules/vite/bin/vite.js, 'build', '--config', opts.viteConfig,
  //   '--outDir', tmp, '--emptyOutDir'], { cwd: REPO_ROOT }); non-zero exit → throw with the last 40 lines.
  // TODO http.createServer: path → file under tmp, MIME by extension, 404 otherwise; listen(0, '127.0.0.1').
  throw new Error('not implemented');
}

export type ScreenDriver = {
  /** A fresh browser context per call: its own storage, so no state crosses tests. */
  open(o: {
    url: (baseUrl: string) => string;
    viewport: Viewport;
    expose?: Record<string, (value: string) => void>;
  }): Promise<{ page: Page; close(): Promise<void> }>;
};

/**
 * Registers ONE build, ONE server and ONE Chromium for the calling test file, started in
 * beforeAll and stopped in afterAll. `enabled: false` registers nothing, so a tier that does not
 * drive the shell builds nothing.
 */
export function useScreenDriver(opts: { viteConfig: string; enabled: boolean }): ScreenDriver {
  // beforeAll(async () => { shell = await buildAndServe(opts); browser = await chromium.launch(); }, 180_000);
  // afterAll(async () => { await browser?.close(); await shell?.close(); });
  // open(): context = browser.newContext({ viewport: VIEWPORT_SIZE[v], isMobile: v === 'phone', hasTouch: v === 'phone' });
  //   for each expose entry: await context.exposeFunction(name, fn); page = await context.newPage();
  //   await page.goto(url(shell.baseUrl)); return { page, close: () => context.close() }.
  throw new Error('not implemented');
}

/** Polls `read` until `accept` holds or the time runs out; the error names `what` and the last value.
 * Locator actions already wait; this is for values a body compares. */
export async function eventually<T>(what: string, read: () => Promise<T>, accept: (value: T) => boolean, timeoutMs = 5_000): Promise<T> {
  throw new Error('not implemented');
}
```

```ts
// tests/at/suites/req-004/_screen.ts
import type { Locator, Page } from 'playwright-core';
import type { AtContext } from '../../harness/registry.ts';
import { eventually, useScreenDriver, VIEWPORT_SIZE, type Viewport } from '../../harness/screen.ts';
import { SCREEN, NAME, TEXT, QUESTION_STATUS, type QuestionStatus } from '../../../../src/components/discovery/a11y.ts';
import { GIVEN, MODEL_CALL_PROBE, type ModelCall, type ScreenScenario } from '../../../../design/astra/src/givens.ts';
import { CapabilityPending, TIER } from './_bind.ts';
import { AWAITED } from './_pending.ts';

export const VIEWPORTS: readonly Viewport[] = ['desktop', 'phone'];
export type ScreenGiven = { scenario: ScreenScenario; viewport: Viewport };

/**
 * Call once at the top of a screen test file. Returns `withDiscovery`.
 *
 * Tier map, the one place it is written:
 *   loop        → the fixture shell, built and served by the driver. Green in phase 2.
 *   integration → phase 2: CapabilityPending ui.discovery-surface, before anything is built.
 *                 phase 3: the real route on the one stack, the Given seeded through sut.
 *   drill       → same as integration.
 */
export function discoveryScreens() {
  const driver = useScreenDriver({ viteConfig: 'design/astra/vite.config.ts', enabled: TIER === 'loop' });

  return async function withDiscovery(
    ctx: AtContext<'req-004', 'discovery'>,
    given: ScreenGiven,
    body: (d: DiscoveryPage) => Promise<void>,
  ): Promise<void> {
    if (TIER !== 'loop') throw new CapabilityPending([AWAITED.discoverySurface]);
    // The world is the Given in phase 3. At the loop tier the screen does not read it; opening it
    // keeps the registry's rule that a green must have observed a world.
    await ctx.open();
    const calls: ModelCall[] = [];
    const { page, close } = await driver.open({
      viewport: given.viewport,
      url: (base) => `${base}/?scenario=${given.scenario}&pace=test#${GIVEN[given.scenario].start === 'review' ? 'discovery-review' : 'discovery'}`,
      expose: { [MODEL_CALL_PROBE]: (kind) => calls.push(kind as ModelCall) },
    });
    try {
      await body(new DiscoveryPage(page, given.viewport, () => [...calls]));
    } finally {
      await close();
    }
  };
}

/** The Discovery screen as a person meets it. Every locator is built from a11y.ts; no CSS selector,
 * no test id, and no raw Page for bodies. */
export class DiscoveryPage {
  constructor(private readonly page: Page, readonly viewport: Viewport, readonly modelCalls: () => readonly ModelCall[]) {}

  private by(l: { role: string; name: string }): Locator {
    return this.page.getByRole(l.role as Parameters<Page['getByRole']>[0], { name: l.name, exact: true });
  }

  readonly chat = {
    question: (text: string): QuestionGroupObject => questionGroup(this.by(SCREEN.conversation).getByRole('group', { name: text, exact: true })),
    lastAssistantText: async (): Promise<string> => { throw new Error('not implemented'); },
    highlightedMessage: async (): Promise<string> => { throw new Error('not implemented'); }, // [aria-current=true]
  };
  readonly composer = {
    type: async (text: string) => this.by(SCREEN.messageBox).fill(text),
    send: async (): Promise<void> => { throw new Error('not implemented'); }, // click the form's submit, wait for the reply to settle
    text: async (): Promise<string> => this.by(SCREEN.composer).innerText(),
  };
  readonly usage = {
    visible: async (): Promise<boolean> => this.by(SCREEN.usage).isVisible(),
    dailyLeft: async (): Promise<number> => { throw new Error('not implemented'); },   // from the values line
    barLabel: async (): Promise<string> => { throw new Error('not implemented'); },    // the one img in the region
    barCount: async (): Promise<number> => this.by(SCREEN.usage).getByRole('img').count(),
  };
  readonly files = {
    add: async (file: { name: string; bytes: string }): Promise<FileChatObject> => {
      // click Add a file → chooser dialog → waitForEvent('filechooser') + click Choose a file →
      // setFiles({ name, mimeType, buffer: Buffer.from(bytes) }) → dialog NAME.fileChat(name) visible.
      throw new Error('not implemented');
    },
    status: async (name: string): Promise<string> => { throw new Error('not implemented'); },
    waitFor: async (name: string, state: 'reading' | 'waiting' | 'ready'): Promise<void> => { throw new Error('not implemented'); },
    reopen: async (name: string): Promise<FileChatObject> => { throw new Error('not implemented'); },
    addAvailable: async (): Promise<boolean> => (await this.page.getByRole('button', { name: SCREEN.addFile.name, exact: true, disabled: true }).count()) === 0,
  };

  /** Desktop: the card. Phone: opens the Questions panel first. */
  async questionsCard(): Promise<QuestionsCardObject> { throw new Error('not implemented'); }
  /** Desktop: side panel. Phone: full-screen panel. */
  async openBrief(): Promise<BriefObject> { throw new Error('not implemented'); }
  async openFinish(): Promise<ReviewObject> { throw new Error('not implemented'); }

  /** Layout, in CSS pixels, of a landmark. The only geometry a body sees. */
  async box(l: keyof typeof SCREEN): Promise<{ x: number; y: number; width: number; height: number }> {
    const box = await this.by(SCREEN[l]).boundingBox();
    if (!box) throw new Error(`${SCREEN[l].name} is not rendered`);
    return box;
  }
  get size() { return VIEWPORT_SIZE[this.viewport]; }
}

// Sub-objects, as types. Each is built by a factory in this file from a scoped Locator, so a body\n// never holds a Locator and cannot write a CSS selector.
export type QuestionGroupObject = {
  pick(label: string): Promise<void>;
  options(): Promise<{ label: string; suggested: boolean; pressed: boolean }[]>;
  writeOwn(text: string): Promise<void>;
  openWriteOwn(): Promise<boolean>;    // true when NAME.ownAnswer(question) becomes visible
  cancelWriteOwn(): Promise<void>;
  tag(): Promise<string | null>;       // TEXT.carried, TEXT.changing, or none
  hasFocus(): Promise<boolean>;        // group.locator("*:focus").count() > 0
  isAsked(): Promise<boolean>;         // the group is among the current questions
};
export type QuestionsCardObject = { statuses(): Promise<[string, string][]>; answer(q: string): Promise<void>; view(q: string): Promise<void> };
export type BriefObject = {
  sections(): Promise<{ title: string; status: string; importance: string | null; source: string | null }[]>;
  edit(title: string): Promise<void>;
  backToChat(): Promise<void>;
};
export type FileChatObject = { question(): Promise<string>; chips(): Promise<string[]>; answerWith(chipOrText: string): Promise<void>; close(): Promise<void> };
export type ReviewObject = {
  openQuestions(): Promise<{ title: string; importance: string; why: string; suggested: string | null }[]>;
  useSuggestion(title: string): Promise<void>;
  answerInChat(title: string): Promise<DiscoveryPage>;
  editSection(title: string, text: string, save: boolean): Promise<void>;
  revision(): Promise<number>;
  tick(which: "reviewed" | "gaps" | "data"): Promise<void>;
  isTicked(which: "reviewed" | "gaps" | "data"): Promise<boolean>;
  finishAvailable(): Promise<boolean>; // reads aria-disabled
  finish(): Promise<string>;           // returns the done heading
  documentText(): Promise<string>;
  hasControl(name: RegExp): Promise<boolean>;
};
```

`_pending.ts` gains one suite-authored name: `fileRead: 'discovery.file-read'` (the real file-chat
turn, the read, and the digest at the context boundary). See the open questions.

Who starts and stops the server: `useScreenDriver` registers `beforeAll` and `afterAll` in the one
test file that calls `discoveryScreens()`. vitest runs each test file in its own module scope, so
the build, the server and Chromium live exactly as long as `j-need-brief.test.ts`. `ci.yml` only
installs Chromium.

How phase 3 points the same bodies at the real route: it replaces the one `if (TIER !== 'loop')`
line with `openWired(ctx, given, body)`. That function opens the live world, seeds the Given
through `sut` from a table typed `satisfies Record<ScreenScenario, Seeder>` (so every Given must
be covered), starts the app with the root vite config, signs the NGO in, and navigates to
`/discovery/$org/$project` or its review route. `modelCalls` there reads the stack's own record of
model calls. The bodies and page objects do not change, because they know only `a11y.ts` names.

### 7. The bodies, id by id

All bodies use `{ surface: 'ui' }` except .69. "Both" means the body loops over both viewports.

| Id | Given | What the body does and checks | Loop, phase 2 |
|---|---|---|---|
| .61 | mid-interview, desktop | answer one question and send; `modelCalls()` grew by exactly one `chat-turn`; open the brief: the new answer shows `TEXT.source.chat(5)`, each asked question shows options with exactly one Suggested and an importance label, every open question shows its importance; open Finish: `modelCalls()` unchanged | green |
| .62 | finish-open, both | open questions come first, in order needed, suggested, later, each with why and suggestion; Use the suggestion → a section with source "Suggestion you accepted", revision +1, open count −1; Answer in the chat → chat shows the question as Open and focused; tick all, Finish → "Discovery finished with open questions"; `modelCalls()` empty; usage unchanged | green |
| .63 | confirmed-tier-2, then confirmed-tier-1, desktop | document region holds need, users and today, agreed answers with sources, success measure, open questions with importance, each file with what the AI took, the tier text (Tier 2 says "sample data only"), fit text, 0 to 3 labels; its text contains none of: stack, complexity, Lovable, build split, `$` | green |
| .64 | finish-open, both | tick reviewed; edit a section; Finish unavailable while the edit is open; save → text kept verbatim, revision +1, reviewed box unticked, Finish unavailable until re-ticked; Back to the chat available throughout; no control named /rewrite\|regenerate/i; usage and `modelCalls()` unchanged | green |
| .65 | first-reply, then first-reply-three-files, desktop | first AI message asks for files, names the kinds, names "Add a file"; its questions are answerable and Send works with no file; with three files the first message has no file request | green |
| .66 | mid-interview, both | Add a file → chooser with drop area, Choose a file, accepted types, sample-data text; Cancel → file count unchanged; choose `volunteer-rota.xlsx` → file chat with the one question and chips and a text box; answer → status Reading with no other action; read pauses → row shows "A question for you"; close the chat; row keeps moving; reopen from the row; answer → Ready · 4 facts; a second file, cancelled before its first answer, is not listed | green |
| .67 | mid-interview (and mid-interview-paid for the paid half), desktop | screen part as in the Usage section; then `awaiting(AWAITED.fileRead)` | red, `discovery.file-read` |
| .68 | mid-interview, desktop | start a read; send a main-chat answer during it → the reply arrives; row goes Reading… N% then Ready · 4 facts; the next reply says what the file showed; the brief lists the fact under "Suggestion · waiting for you", not as agreed; then `awaiting(AWAITED.fileRead)` | red, `discovery.file-read` |
| .69 | none | `awaiting(AWAITED.fileRead, AWAITED.anthropicLive)` at every tier | red, `discovery.file-read, vendors.anthropic` |
| .70 | three-files-unfunded, then three-files-funded, desktop | unfunded: Add a file is `aria-disabled` and the limit text shows; the intake file is listed and the count says 3 of 3; funded: Add a file available | green |
| .71 | mid-interview, both | as in the Usage section | green |
| .72 | mid-interview and mid-interview-paid, desktop then phone | exactly one bar in the usage region; its label names free replies before paid fuel; values line has Free today, Beta, Fuel; open the brief → usage region still visible (desktop); composer text has no `$`, no "left today", no "Free"; phone: bar bottom ≤ message box top and the gap ≤ 16 px; box height with one line ≤ 48 px and grows past twice that with four lines | green |
| .73 | mid-interview, desktop then phone | desktop: Open your live brief → complementary "Your live brief" whose left edge is at or right of the conversation's right edge, conversation still visible, each section with a status and an Edit; Edit → panel closes, that question is focused in the chat with "Changing your earlier answer"; phone: dialog "Your live brief" covering the viewport, Back to chat returns with the message draft intact | green |

Declarations after phase 2, written before the first run (per `expected/README.md` section 3):

- loop: .61 to .66 and .70 to .73 green; .67 and .68 `capability-pending ["discovery.file-read"]`;
  .69 `capability-pending ["discovery.file-read", "vendors.anthropic"]`.
- integration: .61 to .68 and .70 to .73 `capability-pending ["ui.discovery-surface"]`; .69 as at
  loop. Each id moves in the same commit as the unit that turns it green.

### 8. Phone designs (390 px), in words

The phone keeps one rule from the revision 12 phone board: a full-screen panel with Back to chat at
the top left replaces every side panel, and the draft in the chat survives it.

**Questions (phone).** The sticky strip at the top holds the percent, the agreed count and Finish
Discovery, as today. Under it, one row with two buttons of equal width: "Your live brief" and
"Questions · 3 answered · 2 open". The second opens a full-screen dialog named "Questions": Back to
chat, the heading, then one row per topic. Each row has a colored dot, the question text on up to
two lines, the status word in bold (Answered, Not sure, Open, Ready to send, Coming next), the note
under it, and on the right one 44 px button, Answer or View. Answer closes the panel and focuses the
question's first option; View closes it, scrolls to the answer and highlights it for two seconds.

**File chat (phone).** Add a file opens a full-screen dialog "Add a file": Back to chat, one large
Choose a file button (the drop area shows only when a fine pointer exists), the accepted types, the
sample-data sentence, and "Cancel adding this file" at the bottom. After a file is chosen the same
dialog becomes "File chat: rota.xlsx": a status line under the header (aria-live) with a thin
progress bar, the file-chat messages, answer chips that wrap onto as many lines as needed, then the
bottom dock with the compact usage bar directly above the answer box and Send, as in the main chat.
"Close and keep reading" sits in the header while a read runs. The file row in the main screen
opens the same dialog.

**Finish review (phone).** One column. The header says "Review before you finish · Revision 6".
Open questions come first as stacked cards (importance tag, title, why, "Suggested: …", then Use the
suggestion and Answer in the chat as two full-width buttons). The brief sections follow, each with
its source and an Edit button; an open edit becomes a full-width text box with Cancel and Save
side by side. Files and the cause label follow. The Confirm Discovery card is last. A fixed bottom
bar, "Go to Finish Discovery", jumps to that card while it is out of view and hides when the card is
on screen (contract, "Review and confirmation"). Back to the chat is in the header.

### 9. Build order

Each unit is one commit group and ends in a check the lead can run. The type checks are the app, the
acceptance tests, the verify drive, and the fixture shell (unit 1 adds the fourth to
`tests/at/typecheck.ts`).

1. **Contract, driver, bodies.** `playwright-core@1.58.2`; `harness/screen.ts`,
   `dom-names.d.ts`, `screen.selftest.ts`; `a11y.ts`; `givens.ts`; `_screen.ts`; all thirteen
   bodies; `AWAITED.fileRead`. Check: typecheck exit 0; `at:selftest` exit 0; `at:verify req-004
   --tier loop` shows .61 to .68 and .70 to .73 red with a locator error that names a contract
   name (never a harness error), .69 capability-pending.
2. **Stream types, model, port, fixture world, chat.** Types in `discovery-stream.ts`; `model.ts`
   with its pure functions; `port.ts`; the fixture world, port, transports and data; `useDiscovery`,
   `DiscoveryScreen`, `ProgressStrip`, `Conversation`, `QuestionGroup`, `Composer`; the shell mounts
   them and the revision-11 files go. Check: .65 green and declared; four type checks exit 0.
3. **Questions, usage, brief.** `QuestionsCard` (card and phone panel), `UsageCard`, `BriefPanel`
   (card, side panel, phone panel). Check: .61, .71, .72, .73 green at both viewports and declared.
4. **Files.** `FilesCard`, `FilePanel` (chooser, file chat, phone dialog), fixture read timers and
   scripts. Check: .66 and .70 green; .67 and .68 red exactly as declared.
5. **Finish.** `DiscoveryReview` (and its phone layout), `DiscoveryDocument`. Check: .62, .63, .64
   green; `at:verify req-004 --tier loop --expect` exit 0.
6. **CI and declarations.** `ci.yml`: a "Install Chromium for the screen tests" step
   (`bunx playwright-core install --with-deps chromium`) before the self-tests, and `^design/astra/`
   added to the code-territory pattern; integration declarations; the ride-along sync-stamp lines.
   Check: loop `--expect` exit 0; integration `--expect` exit 0 on the one stack; CI green.
7. **Codex loop.** Codex at low drives the shell at 1280 and 390 px, light and dark, `pace=demo`,
   and reports; the lead fixes and re-runs. Check: Codex reports no new issue; loop `--expect`
   exit 0 on the final head.

---

## Synthesis decision

*Filled in by arena.*

## Tradeoffs accepted

- We accept a 7-line ambient declaration of four opaque DOM names in exchange for keeping the test
  project free of the DOM library. A reviewer might read it as a hack. It is measured, it is the
  smallest change that compiles, and it keeps `document` unusable in a body.
- We accept that the loop-tier body opens a req-004 world it does not read, in exchange for leaving
  the registry's no-vacuous-green rule untouched, and because the same call is the Given in phase 3.
- We accept that the components and the tests share copy from `a11y.ts`, so a wrong phrase in the
  contract passes both. In exchange a copy change is one edit and can never desync the screen from
  its tests. The approved copy is reviewed against the canvas once, in the contract.
- We accept a build of the shell per test-file run (about as long as `design:astra:build`) in
  exchange for no dev-server reloads mid-test and no child server process to orphan.
- We accept a full brief snapshot on every reply in exchange for no ordering or replay logic: the
  higher revision wins, whichever path delivered it.
- We accept that the review tick is not stored as a boolean. It is the revision the NGO reviewed,
  so an edit clears it with no code.
- We accept that .67 and .68 are red at every tier in phase 2 even though their screen parts pass.
  A red with a declared cause is the only honest shape for a half-proved criterion.
- We accept page objects that hide the raw `Page` from bodies. A body cannot write a CSS selector,
  so every assertion is about a role, a name or visible text.

## Alternatives considered

- **Test ids (`data-testid`) instead of an accessible contract.** Shallower for the author, but it
  exposes a second naming system that no person sees, and it lets a screen pass while its buttons
  have no names. It also breaks the phase 3 promise less visibly: a test id can survive a copy
  change that makes the screen wrong. Rejected.
- **Dev server per run (`vite` on a free port) instead of build and serve.** Faster to start, and
  Codex uses it anyway. Lost because the dependency optimizer can reload the page during the first
  test, which makes a red that names no defect, and because a killed run leaves a child process.
- **The fixture transport over the network (a vite middleware that stands in for the edge
  functions), so the test counts model calls from `page.on('request')`.** This would make the loop
  tier look like phase 3. It lost because it violates the ruling that the fixture transport sits in
  the `ChatTransport` slot, and it adds a server-side fixture world, which the harness rules forbid.
- **Brief patches instead of snapshots.** Smaller parts, but the client must apply them in order and
  a reload must rebuild them. That is the "add a merge later" shape. Rejected.
- **`@playwright/test` as the runner.** Its `expect` auto-waits and its fixtures start servers. It
  lost because the acceptance ids must run through `atTest` under vitest, and two runners would
  split the `--expect` accounting.

## Open questions and risks

- **Is `discovery.file-read` an acceptable new suite-authored capability name?** The ruling forbids
  new capabilities beyond what the driver needs. The alternative is to reuse
  `ui.discovery-surface` for the backend halves of .67 and .68, which names the wrong missing thing.
- **Should the canvas limit sentence keep "Remove one to add another"?** There is no remove control
  on any board or in any acceptance text. This package keeps only the first sentence until the
  founder answers.
- **Is the first AI reply a turn, and who triggers it?** AT-004.65 needs it to exist. The fixture
  seeds it in the transcript. Phase 3 must decide whether opening Discovery spends a free turn.
- **Should the demo-only "Use a sample file for this demo" button exist?** It is fixture tooling on
  a production panel. This package drops it; the tests and Codex use the real file picker.
- **Do the data-tier and fit sentences in `TEXT.dataTier` and `TEXT.fit` need founder copy?** The
  Finish board has neither section, but AT-004.63 requires both. The words here are provisional.
- **Should `runner.ts --wired` change its message?** It says the screen driver does not exist,
  which becomes false. This package leaves the refusal and lists the wording as not done here,
  because the wired target is phase 3's.
- **Risk: the self-hosted CI container may lack what `--with-deps` installs.** If
  `CI_RUNNER_LABEL` routes to `.github/runner/`, that image needs the Chromium system libraries
  baked in. Check before the pull request.
- **Risk: vite's config loader under `process.execPath`.** The package scripts use
  `--configLoader native`. The driver uses vite's default loader so it works whether vitest runs
  under Node or Bun. Unit 1 must prove the build on Windows and on the CI Linux runner.
- **Risk: a failing `afterAll` hides behind a declared red** in the same file (`expected/README.md`
  section 5). `j-need-brief.test.ts` holds three declared reds, so a teardown failure of the driver
  could go unseen. The driver logs every teardown failure to stderr so CI output shows it.
- **Risk: `design/astra` is prose to CI today.** Without the `^design/astra/` pattern, a pull
  request that changes only the fixture shell skips the screen tests. Unit 6 closes it.

## Next implementation step

Write `src/components/discovery/a11y.ts` and the thirteen bodies with their page objects, then run
the loop tier and confirm every runnable id fails on a missing contract name, not on the harness.
