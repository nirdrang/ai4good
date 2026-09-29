# Design: the Discovery screen, revision 12, on fixtures

This is the synthesized design for AI4DEV-180 (Discovery screen on fixtures). Writers build against
it. The four arena candidates, the judge's scores and the lane receipts are in
`loop/items/AI4DEV-180/arena/`. This file records what was taken from each.

## Synthesis decision

- **Base: the Opus candidate** (tests first, from one accessible contract; a data port; brief
  snapshots ordered by revision; a built fixture shell served by the harness). The cross-judge
  (GPT-6 Astra at medium) scored it 19 of 25, Astra 18, Grok 15, Fable 10, and recommended the same
  base. The lead's own reading agreed.
- **Grafted from Grok:** a chosen file stays in the screen's draft until its first file-chat
  answer; that answer commits the file and the answer together, so Cancel before the first answer
  needs no delete call. The usage colours become three theme tokens in `src/styles.css`.
- **Grafted from Astra:** each screen test gets a fresh browser context; a stale-revision refusal
  keeps the NGO's edit text; the phone brief panel keeps the usage card visible in its footer;
  dark-mode and 320-pixel checks on the layout ids.
- **Grafted from Fable:** the conversation renders from the message parts (a pure presentation
  fold), separate from the cards' state.
- **Corrections to the base, from the judge and the lead:**
  - AT-004.67 and .68 run their screen assertions and then throw `AtPending(id, 'sut-missing', …)`.
    No new capability name. .69 stays `notYet`. The loop declaration for the three stays
    `{"kind":"pending","phase":"sut-missing"}`.
  - Every topic in the brief carries its importance and its reason from the start, so the review at
    zero coverage can show them.
  - A question has exactly one suggested option (`suggestedId: string`, not nullable).
  - `DiscoveryUsage` gains the paid allocation and the settled amount, so the paid gauge has a
    denominator.
  - File-chat transcripts and the chat drafts live in the screen hook, not in the SDK's per-id
    store, so closing a panel or visiting the review page never loses them.
  - A driver teardown failure throws in `afterAll`, which the `--expect` gate counts as a file-level
    error. Logging alone is not enough.
  - The build starts with one browser case through the whole path, and each body is written in the
    unit that builds its screen.
  - Test bodies take landmark and control names from the accessible contract, but assert the
    phrases the acceptance text names (for example "Needed before build") as literals, so a wrong
    phrase in the contract cannot pass both sides.

## Fixed decisions (founder, 2026-09-29)

- Screen tests drive headless Chromium through `playwright-core` from the `atTest` bodies. vitest
  stays the runner. No `@playwright/test`, no jsdom.
- CI runs them at the loop tier. `ci.yml` gains a Chromium install step, and `^design/astra/`
  joins the code-territory pattern so a fixture-only change runs the suite.
- Codex (GPT-6 Astra at low) runs the suite and explores the shell during the build. It is not part
  of the test run.

## 1. The accessible contract

`src/components/discovery/a11y.ts`, no imports (the test project compiles it under a Node-only
config). It holds landmark roles and names, name builders for repeated controls, and the approved
copy the screen renders. Components render these; the page objects locate by them. Rules:

- A landmark's name never changes with state. Changing text is a visible heading inside it.
- A name contains its visible label (WCAG 2.5.3).
- Rows (question, brief section, file) are labelled by their own text (`aria-labelledby`).
- The highlighted answer carries `aria-current="true"` while highlighted.
- An unavailable action that explains itself uses `aria-disabled="true"`, not `disabled`.
- The conversation is a `log`. The file-chat status line is the one added `aria-live="polite"`.

Landmarks (role, name): Discovery progress (region); Finish Discovery (button); NGO and AI
conversation (log); Your reply (form); Your message (textbox); Questions (region on desktop,
dialog on phone, opened by the button "Open the questions"); Discovery usage (region); Open your
live brief (button); Your live brief (complementary on desktop, dialog on phone); Back to chat
(button); Your files (region); Add a file (button); Add a file (dialog: the chooser); Choose a
file (button); Cancel adding this file (button); Your answer about this file (textbox); Review
before you finish (main); Open questions (region); Confirm Discovery (region); Back to the chat
(button); Your Discovery document (region); Find a volunteer (button).

The Opus candidate's `a11y.ts` sketch (`SCREEN`, `NAME`, `IMPORTANCE`, `QUESTION_STATUS`,
`BRIEF_STATUS`, `TEXT`) is the starting text. Copy decisions the lead made, pending founder review
in the pull request:

- The limit sentence is "Free projects can add 3 files in Discovery." The canvas's second sentence,
  "Remove one to add another", is dropped: no board and no acceptance text has a remove control.
- The data-tier and fit sentences are provisional. AT-004.63 requires both; the Finish board has
  neither.
- The demo-only "Use a sample file" button is not built. Tests and Codex use the real file picker.

## 2. The data model

| Piece | Lives in | Written by | Reaches the screen by |
|---|---|---|---|
| Transcript (messages and data parts) | the source; `useChat` in the client | the source, one turn at a time | `load()` seeds the chat; the stream appends |
| Brief snapshot (need, users, topics, questions, suggestions, tier, fit, labels, revision) | the source | the chat turn (AI) and the NGO's edits and accepted suggestions | `data-brief` per reply; each action's result; `subscribe()` after a read |
| Files (status, progress, facts, what the AI took, file-chat transcript) | the source | the read process; the first file-chat answer creates the file | `subscribe()`; the file-chat stream |
| Usage | the source | each main or file-chat turn | `data-usage`; `subscribe()` |
| Confirmation | the source | the NGO's finish only | `load()`; the result of `finish()` |
| Answer drafts, composer text, reopened questions, file-chat drafts, the staged file | the screen hook | the NGO | local state, kept across panels and the review page |
| Open panel, highlight, one-at-a-time mode | the screen hook | the NGO | local |
| Review ticks, the open edit | the review page | the NGO | local |

Rules:

- The client never writes source state optimistically. Every write goes through the port and
  returns the new value.
- The brief has one monotonic `revision`. Every write carries the `baseRevision` it read. The
  source refuses a stale write with `stale-revision` and returns the current snapshot. The client
  keeps the snapshot with the higher revision (`newerBrief`), whichever path delivered it. A
  refused edit keeps the NGO's text in the edit box.
- The review tick is `reviewedRevision: number | null`. The box shows ticked only when it equals
  `brief.revision`, so an edit clears it with no code.
- Question states, open questions, and progress are derived, never stored.
- Finish on an already-confirmed revision returns the existing confirmation.

Stream and snapshot types in `src/lib/discovery-stream.ts` (additions; existing names stay):

```ts
export type Importance = "needed" | "suggested" | "later";

export type DiscoveryUsage = {
  dailyLeft: number; dailyGrant: number; betaLeft: number; betaGrant: number;
  availableMicros: number; reservedMicros: number;
  /** NEW: this gate's paid allocation and what it has settled, for the paid gauge. */
  allocationMicros: number; settledMicros: number;
  /** NEW: the hold one paid reply reserves. */
  holdMicros: number;
  /** NEW: the next reset as an ISO instant, or null when no free reply returns (beta used up). */
  nextResetAt: string | null;
  nextReply: "free" | "paid" | "unavailable";
};

export type BriefSource =
  | { kind: "intake" } | { kind: "chat"; round: number } | { kind: "accepted-suggestion" }
  | { kind: "edit"; revision: number } | { kind: "file"; fileId: string; fileName: string };

export type BriefQuestion = {
  id: string; topicId: string; text: string; reason: string;
  options: SuggestedAnswer[]; suggestedId: string;         // exactly one Suggested
  importance: Importance; recommendation: string; uncertaintyHelp: string; askedInRound: number;
};

export type BriefTopic = {
  id: string; title: string; required: boolean;
  importance: Importance; why: string; suggestion: string | null;   // present from the start
  plannedQuestion: string;                                          // Coming next text
  state: { kind: "open" } | { kind: "not-sure"; questionId: string; help: string }
       | { kind: "agreed"; answer: string; source: BriefSource; answerMessageId: string | null };
};

export type FileSuggestion = { id: string; topicId: string; fileId: string; fileName: string; fact: string };

export type BriefSnapshot = {
  revision: number;
  need: { text: string; source: BriefSource };
  usersToday: { text: string; source: BriefSource } | null;
  successMeasure: { text: string; source: BriefSource } | null;
  topics: BriefTopic[]; questions: BriefQuestion[]; suggestions: FileSuggestion[];
  dataTier: { tier: 0 | 1 | 2; reason: string } | null;
  fit: { verdict: "fits" | "declined"; reason: string } | null;
  causeLabels: string[];                                             // zero to three
};

export type FileStatus =
  | { kind: "reading"; percent: number }
  | { kind: "waiting"; percent: number; question: { text: string; chips: string[] } }
  | { kind: "ready"; facts: number }
  | { kind: "failed"; reason: string };

export type DiscoveryFile =
  | { origin: "intake"; id: string; name: string; sizeBytes: number; tookFromIt: string | null }
  | { origin: "discovery"; id: string; name: string; sizeBytes: number; status: FileStatus; tookFromIt: string | null };

export type Confirmation = {
  revision: number; approver: string; at: string;
  acceptedGaps: { topicId: string; title: string; importance: Importance; reason: string }[];
};

export type DiscoveryState = {
  project: { title: string; organizationName: string; funded: boolean };
  transcript: DiscoveryUIMessage[];
  fileChats: Record<string, FileChatUIMessage[]>;
  brief: BriefSnapshot; files: DiscoveryFile[]; usage: DiscoveryUsage; confirmation: Confirmation | null;
};
```

`DiscoveryDataTypes.question` gains `topicId`, `importance`, `suggestedId`. `DiscoveryDataTypes`
gains `brief: BriefSnapshot` (transient: state, not transcript). `data-filed` stays for the
"Added to brief" line. File chat has its own message type:

```ts
export type FileChatDataTypes = {
  status: FileStatus;                                    // transient
  charge: DiscoveryDataTypes["charge"];
  usage: DiscoveryUsage;                                 // transient
};
export type FileChatUIMessage = UIMessage<never, FileChatDataTypes>;
```

The opening file question, "What should we know about this file?", is fixed copy with scripted
chips per file type, so the screen shows it before any source call.

## 3. The port: the one seam phase 3 replaces

`src/components/discovery/port.ts`:

```ts
export type Result<T> = { ok: true; value: T } | { ok: false; refusal: DiscoveryRefusal };
export type ServerChange = { files?: DiscoveryFile[]; brief?: BriefSnapshot; usage?: DiscoveryUsage };
export type FileChatTarget = { kind: "new"; file: File } | { kind: "existing"; fileId: string };

export interface DiscoveryPort {
  load(): Promise<Result<DiscoveryState>>;
  /** One main-chat turn per send. The only model call besides fileChat. */
  readonly chat: ChatTransport<DiscoveryUIMessage>;
  /** One file-chat turn per answer. For a new file, the first answer uploads the file, creates it,
   *  charges one turn, and starts the read, together. Refused at the three-file limit when not funded. */
  fileChat(target: FileChatTarget): ChatTransport<FileChatUIMessage>;
  subscribe(listener: (change: ServerChange) => void): () => void;
  saveBriefEdit(input: { sectionId: string; text: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  acceptSuggestion(input: { topicId: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  removeCauseLabel(input: { label: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  finish(input: { revision: number; acks: { reviewed: true; openGaps: boolean; data: true } }): Promise<Result<Confirmation>>;
}
```

No member rewrites or regenerates, so "no AI rewrite action" is a property of the type.

## 4. Module map

```
src/lib/discovery-stream.ts            the types above
src/styles.css                         + --usage-ok, --usage-warn, --usage-stop in :root and .dark, in @theme inline
src/components/discovery/
  a11y.ts            the accessible contract. No imports.
  model.ts           pure derivations: progressOf, currentQuestions, questionRows, gaugeTone, usageView,
                     fileRows, sourceText, openForReview, reviewGate, newerBrief, presentMessages
  port.ts            DiscoveryPort, Result, FileChatTarget
  use-discovery.ts   the screen hook: main Chat instance, file Chat instances (held in a ref map),
                     snapshot merge, drafts, staged file, panels, highlight
  use-is-phone.ts    matchMedia("(max-width: 767px)")
  DiscoveryScreen.tsx     loads; desktop grid or phone column; owns the hook
  ProgressStrip.tsx       percent, agreed count, Finish Discovery; compact sticky strip
  Conversation.tsx        the log: messages, receipts, Added to brief, highlight
  QuestionGroup.tsx       one current question: options, Suggested, Write my own, I'm not sure
  Composer.tsx            one-line growing message box and Send; no usage text
  QuestionsCard.tsx       rows with status, Answer and View; card on desktop, dialog on phone
  BriefPanel.tsx          card, desktop side panel, phone full-screen dialog with the usage card in its footer
  UsageCard.tsx           headline, one two-part bar (role img), one values line, footer, Buy fuel
  FilesCard.tsx           file rows with status and progress, Add a file, limit text
  FilePanel.tsx           chooser and one file chat; desktop panel beside the chat, phone full-screen dialog
  DiscoveryReview.tsx     the Finish review page, confirmation, done state
  DiscoveryDocument.tsx   the confirmed document (AT-004.63)
  index.ts                exports DiscoveryScreen, DiscoveryReview, the port types
```

Components use shadcn from `src/components/ui/` and the tokens in `src/styles.css`, including the
class-based `.dark`. No hex colours from the canvas and no new font. The screen never fetches: every
read and write goes through the port.

## 5. The fixture shell

| Action | Files |
|---|---|
| Delete | `Discovery.tsx`, `DiscoveryProgress.tsx`, `DiscoveryReferences.tsx`, `DiscoveryScope.tsx`, `discovery-examples.ts`, `discovery-chat.css` |
| Edit | `screens.tsx` (the Scope screen goes; its route points to `discovery-review`), `components.tsx` (route enum), `App.tsx` (mounts `DiscoveryScreen` and `DiscoveryReview` with the fixture port), `vite.config.ts` (`@` alias to `src/`) |
| Rewrite | `fixture-transport.ts`: the main and file-chat transports over the fixture world; each `sendMessages` reports one model call to the probe |
| Add | `fixture-world.ts` (in-memory state per scenario, persisted in `localStorage` so a reload keeps it), `fixture-port.ts` (`fixturePort(scenario): DiscoveryPort`, read timers), `fixture-data.ts` (question bank with importance, scripted replies, three file scripts, digests), `givens.ts` (scenario names, their visible inputs, the pace option, the model-call probe name; no imports) |
| Prune | `model.ts`, `questions.ts`: keep what the other mock screens read |

URL: `/?scenario=<name>&pace=test#discovery` (or `#discovery-review`). `pace=test` makes every
fixture timer 20 ms; `pace=demo` uses the canvas timings for Codex and people.

Model-call probe: the fixture transports and the fixture read call
`window[MODEL_CALL_PROBE]?.(kind)` once per model call they stand in for. The screen test installs
it with `exposeFunction`. Product code never calls it. This is how AT-004.61 proves, at the loop
tier, that the brief came from the reply's own call and that Finish, accept, and save make none.
Phase 3 must prove the same from the stack's own record of model calls.

## 6. The screen-test driver

| File | Role |
|---|---|
| `tests/at/harness/screen-host.mjs` | a small Node process that owns Playwright and Chromium. It reads one JSON command per line on stdin and answers one JSON line on stdout. Commands: open a page (URL, viewport, phone flags, colour scheme; installs the model-call probe), act on a locator given as a chain of role-and-name or text steps (click, fill, press, text, count, visible, box, attribute, focused, set files), read the probe's model calls, reload, close a page, shut down. Locator timeout 5 s. |
| `tests/at/harness/screen.ts` | the Bun side: builds the fixture shell once per test file into a temporary folder, serves it from `node:http` on a free port, starts `node screen-host.mjs`, sends typed commands, closes everything in `afterAll`, and throws on a teardown failure |
| `tests/at/harness/screen.selftest.ts` | pure parts only: the URL builder, `eventually`, the MIME map |
| `tests/at/suites/req-004/_screen.ts` | `discoveryScreens()`, `withDiscovery()`, the tier map, the page objects |
| `package.json` | `playwright-core` pinned to exactly `1.58.2` (devDependency), loaded only by the Node host. Chromium revision 1208 is already on this machine. |
| `tests/at/typecheck.ts` | adds the fixture shell's tsconfig as a fifth project |
| `.github/workflows/ci.yml` | "Install Chromium for the screen tests" (`bunx playwright-core install --with-deps chromium`) before the loop verify step, same `if`; `^design/astra/` in the code pattern |

Why a Node host (measured 2026-09-29 on this machine, Bun 1.3.14): under Bun, Playwright's
`chromium.launch()` hangs past 40 s, and `chromium.connect()` to a Node-launched browser server also
hangs, although Bun's own WebSocket reaches that server. Under Node, the same launch reads a page in
456 ms. Bun spawning a Node host over stdin and stdout opened a page in 574 ms, measured real layout,
and saw a textarea grow from 21 to 156 pixels. puppeteer-core launches under Bun, but its ARIA
queries returned nodes with no box. The test project therefore never imports Playwright, and
`dom-names.d.ts` is not needed. CI needs Node, which the GitHub-hosted runner has; the self-hosted
runner image needs Node and Chromium's libraries (not done here).
Tier map, in `_screen.ts` only:

- loop: the fixture shell. Each body calls `ctx.open()` first (the registry refuses a green that
  opened no world; in phase 3 the world is the Given).
- integration and drill in phase 2: `throw new CapabilityPending(['ui.discovery-surface'])` before
  anything is built. Phase 3 replaces that one line with the real route.

Bodies use page objects built on the contract. A body never holds a raw `Page` and never writes a
CSS selector. Layout checks use `boundingBox()`. .72 and .73 run at 1280 by 800 and 390 by 844.

Declarations in `tests/at/expected/req-004.json`, moved in the same commit as each body:

| Ids | loop | integration |
|---|---|---|
| .61 to .66, .70 to .73 | green | `capability-pending ["ui.discovery-surface"]` |
| .67, .68 | `pending sut-missing` (screen part asserted first) | `capability-pending ["ui.discovery-surface"]` |
| .69 | `pending sut-missing` | `pending sut-missing` |

What each body checks is the table in the Opus candidate, section 7, with these changes: .67 and
.68 end in `AtPending`; .61's Finish half is added in the Finish unit; .72 and .73 also run in dark
mode, and .72 checks that no required control or amount is clipped at 320 pixels.

## 7. Phone designs (390 px)

- **Questions.** Under the sticky progress strip, two equal buttons: "Open your live brief" and
  "Questions · 3 answered · 2 open". The second opens a full-screen dialog "Questions" with Back to
  chat and one row per topic: status dot, question text, status word, note, and one 44-pixel Answer
  or View. Answer closes the dialog and focuses the question's first option. View closes it,
  scrolls to the answer, and highlights it for two seconds.
- **File chat.** Add a file opens a full-screen dialog "Add a file": Back to chat, one large Choose
  a file button (the drop area shows only with a fine pointer), the accepted types, the sample-data
  sentence, and Cancel adding this file. After a file is chosen, the same dialog becomes "File chat:
  <name>": a live status line with a thin progress bar, the messages, wrapping chips, and the bottom
  dock with the compact usage bar directly above the answer box. "Close and keep reading" sits in
  the header while a read runs.
- **Finish review.** One column: "Review before you finish · Revision N"; open questions first as
  stacked cards with two full-width buttons; the sections with source and Edit (an open edit is a
  full-width box with Cancel and Save); files; cause label; the Confirm Discovery card last. A fixed
  bottom bar, "Go to Finish Discovery", jumps to the card and hides while the card is in view.
  Back to the chat sits in the header.
- **Brief.** The full-screen "Your live brief" dialog from the Phone board, with the usage card in
  its footer so usage stays visible while the brief is open.

## 8. Units

Each unit is one commit group, ends with its checks, and stops at a founder gate.

1. **One browser case through the whole path.** Stream types, `a11y.ts`, `port.ts`, `model.ts`
   (the functions this unit needs), the fixture world, port, transports and data for the first
   reply, a minimal `DiscoveryScreen` (conversation, composer, questions, files card), the shell
   mount and the deletions, the driver files, `playwright-core`, the typecheck and CI changes, and
   the AT-004.65 body. Checks: all type checks exit 0; `at:selftest` exits 0; `at:verify req-004
   --tier loop --expect` exits 0 with .65 declared green.
2. **Chat, questions, usage, brief.** Full `Conversation`, `QuestionGroup`, `Composer`,
   `QuestionsCard`, `UsageCard`, `BriefPanel`, `ProgressStrip`, both layouts. Bodies .61 (without its
   Finish half), .71, .72, .73. Same checks.
3. **Files.** `FilesCard`, `FilePanel`, fixture read timers and scripts. Bodies .66, .70, and the
   screen parts of .67 and .68. Same checks.
4. **Finish.** `DiscoveryReview`, `DiscoveryDocument`, the phone review. Bodies .62, .63, .64, and
   .61's Finish half. Same checks, plus the integration `--expect` run on the one stack.
5. **Codex loop and polish.** Codex (GPT-6 Astra at low) drives the shell at 1280 and 390 pixels,
   light and dark, `pace=demo`, and reports. The lead fixes and re-runs until Codex reports no new
   issue. Update the review record `design/astra/discovery-review.md` and `design/astra/screens.json`.

## Not done here

- Phase 3 wires the port to edge functions and points the same bodies at the real route.
- The backend halves of .67, .68 and the whole of .69.
- Whether the first AI reply costs a turn, and what starts it, is a phase 3 decision. The fixture
  seeds it in the transcript.
- `runner.ts --wired` keeps its refusal; its message becomes stale and is phase 3's to change.
- The self-hosted CI runner image needs Chromium's system libraries if `CI_RUNNER_LABEL` routes
  there.
