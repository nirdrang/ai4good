The revision 12 screen keeps one client in front of the components. A later phase replaces that client and leaves the screen in place. This package is that client, the record it owns, and the browser checks around it.

# Discovery client for the revision 12 screen

## Problem

The Discovery screen has to ship as real components, while the data behind it is still a script. Phase 3 replaces that data with edge functions. The chat already has a stream shape in `src/lib/discovery-stream.ts`, and the live route posts plain text to `discovery-message`. Revision 12 adds a brief that updates in the same reply, file chat, read progress, and a review page that makes no model call. Those actions are not chat messages. If the components learn fixture URLs now, phase 3 has to edit the components. The client below is the boundary those components call. The fixture implements it in memory. The edge implementation is the same interface with empty bodies until phase 3.

The screen tests check what a person sees. They run in a headless Chromium at the loop tier. The same checks must be able to open the real route later. The production route stays the plain chat until that swap. The fixture shell is the only host in this phase.

## Usage (caller's view)

The shell builds a client and mounts one screen. The screen does not import the fixture script, a transport class, or an edge URL.

```tsx
// design/astra/src/App.tsx — the only fixture mount
const { situation } = readHash() // "#discovery?situation=review" → route + situation
<DiscoveryScreen
  client={createFixtureDiscoveryClient({ situation })}
  scope={{ organizationId: "harbor", projectId: "scheduling" }}
  onFindVolunteer={() => navigate("publish")}
/>
```

The chat hook asks the client for a transport and passes it to `useChat`. Main chat and file chat use the same call with a different lane.

```tsx
// src/components/discovery/chat-column.tsx
const chat = useChat({
  transport: client.chatTransport(scope, { kind: "main" }),
  messages: record.transcript,
})

// src/components/discovery/file-panel.tsx — first answer commits the file
const fileChat = useChat({
  transport: client.chatTransport(
    scope,
    pendingFile
      ? { kind: "new-file", file: pendingFile }
      : { kind: "file", fileId },
  ),
  messages: fileMessages,
})
```

A review save and Finish are commands. They return the next record. They do not stream.

```tsx
// src/components/discovery/finish-page.tsx
const saved = await client.saveBriefEdit({
  idempotencyKey: crypto.randomUUID(),
  baseRevision: record.brief.revision,
  sectionId: "need",
  text: draft,
})

const finished = await client.finish({
  idempotencyKey: crypto.randomUUID(),
  revision: record.brief.revision,
  reviewed: true,
  acceptGaps: openCount > 0,
  dataResponsibility: true,
})
```

`saved.record.brief.revision` is the revision the checkbox must match. A second call with the same `idempotencyKey` returns the current record and does not create another revision. `finished.record.confirmation` is set when the revision matches. The screen renders that record. It does not keep a second copy of the brief.

## Shape

One `DiscoveryClient` hides the stream, the script, and the future HTTP map. Components read a `DiscoveryRecord` and a session draft. A pure reducer is the only writer of the record. The draft holds what the person has not sent.

The public surface is the record, the chat lanes, and six commands (`sendTurn` through `readFile` below). Behind it sit idempotency keys, the three-file rule, revision checks, gauge bands, read-progress ticks, and the SDK chunk parser. Callers do not see edge paths or stream part names. `per boundary-discipline`, parsers live in `discovery-stream.ts`. The reducer trusts domain events.

### Where each fact lives

| Fact | Stored in | Writer | Reader |
| --- | --- | --- | --- |
| Transcript, brief, topics, files, usage, confirmation | `DiscoveryRecord` inside the client | Reducer, one event at a time | `useDiscoveryRecord()` |
| Picks, note, focused question, highlight, brief open, review edit, ack ticks, file sitting in the chooser | `SessionDraft` in the screen | The screen's `setDraft` | Cards and the composer |
| Question row state | Derived | Nobody | `questionCards(record, draft)` |
| "Confirmed" | Derived | Nobody | `confirmation.revision === brief.revision` |
| Gauge color | Derived | Nobody | `gauge(record.usage)` |
| Read percent | File on the record | A progress event from the fixture timer, or `readFile` on the edge | File row |

Two actors can write during one visit: the person, and the read timer. They do not share a mutable object. Each one emits an event. `commit` applies that event to the latest record on the JavaScript thread, with no `await` between the read of the record and the write. A progress event patches one file. An accept event patches the brief. `per separate-before-serializing-shared-state`.

The draft is not in the record. A reload restores the record and drops unsent picks, an open edit, and a file that has no answer yet. Cancel before the first file answer drops the draft file. The record never contained it.

Ack ticks are keyed by revision. The screen treats ticks as clear when `acks.revision !== brief.revision`. A save bumps the revision inside the reducer. The screen does not also clear the ticks. `per` one source of truth.

```ts
type Importance = "needed" | "suggested" | "later" // Needed before build · A suggestion exists · Can wait

type Source = {
  kind: "turn" | "accepted-suggestion" | "ngo-edit" | "intake"
  label: string // "chat, round 2" · "suggestion you accepted" · "You edited this"
}

type TopicState =
  | { kind: "open"; importance: Importance; why: string; suggestion: string | null }
  | { kind: "uncertain"; text: string; help: string }
  | { kind: "agreed"; text: string; source: Source }
  | { kind: "needs-review"; text: string; source: Source }

type Brief = {
  revision: number
  need: { text: string; source: Source }
  users: { text: string; source: Source }
  topics: { id: string; title: string; question: string; state: TopicState }[]
  suggestions: {
    id: string
    fileId: string
    title: string
    text: string
    why: string
    importance: "suggested"
  }[]
  filesTaken: { fileId: string; name: string; taken: string }[] // digest narrative
  dataTier: { tier: 0 | 1 | 2; text: string } | null
  fit: { verdict: "fit" | "declined"; text: string } | null
  causes: { id: string; label: string }[] // zero to three
}

type FileRead =
  | { status: "reading"; percent: number } // integer 0–100
  | { status: "waiting"; percent: number; question: string; suggestions: { id: string; label: string }[] }
  | { status: "ready"; factCount: number }

type DiscoveryFile = {
  id: string
  name: string
  sizeLabel: string
  origin: "discovery" | "intake"
  read: FileRead
  digest: string | null
  chat: DiscoveryUIMessage[]
}

type DiscoveryRecord = {
  project: { organizationId: string; projectId: string; title: string; funded: boolean }
  transcript: DiscoveryUIMessage[]
  brief: Brief
  /** Stable six topics. Dependents point at topic ids. The screen does not hardcode the graph. */
  dependents: Record<string, string[]>
  roundQuestionIds: string[]
  files: DiscoveryFile[]
  usage: DiscoveryUsage & { resetLabel: string; receipts: { turnId: string; text: string }[] }
  confirmation: {
    revision: number
    actorName: string
    at: string
    acceptedGaps: { questionId: string; reason: string }[]
  } | null
  progress: { agreed: number; total: number } // certain topics / checklist length
}

type QuestionCard =
  | { state: "answered"; questionId: string; text: string; note: string; messageId: string }
  | { state: "not-sure"; questionId: string; text: string; messageId: string }
  | { state: "ready-to-send"; questionId: string; text: string; draft: string }
  | { state: "open"; questionId: string; text: string }
  | { state: "coming-next"; questionId: string; text: string }

type SessionDraft = {
  picks: Record<string, { choiceId: string; text: string; certain: boolean } | undefined>
  writingOwn: Record<string, boolean>
  note: string
  focusedQuestionId: string | null
  highlightedMessageId: string | null
  briefOpen: boolean
  view: "chat" | "review"
  /** Bytes live here until the first file answer. The record has no such file. */
  pendingFile: { name: string; mediaType: string; byteSize: number; bytes: Uint8Array } | null
  chooserOpen: boolean
  openFileId: string | null
  reviewEdit: { sectionId: string; text: string } | null
  acks: { revision: number; reviewed: boolean; gaps: boolean; data: boolean }
}
```

`questionCards` walks the checklist in order. A certain topic is Answered. An uncertain topic is Not sure. A draft pick is Ready to send. A topic in `roundQuestionIds` with no pick is Open. Anything else is Coming next. A topic in `needs-review` is Open on the card, and the brief shows "Needs review". The card has no sixth label. The visible prefix is the state word the test looks for: `Answered`, `Not sure`, `Open`, `Ready to send`, `Coming next`.

Progress counts topics in `agreed` only. Uncertain, open, and needs-review stay out of the numerator. The denominator is `brief.topics.length` (six in the fixture). Finish does not change the count.

A file fact is a `suggestion` until `acceptSuggestion`. The file row can already say `Ready · N facts`, and `filesTaken` can show the digest narrative. Those are the read result. They are not agreed brief text.

### Stream additions

`DiscoveryDataTypes` gains fields on `question`, plus three parts. Amounts stay integer millionths of a US dollar. The live route's `data-turn` chunk stays on the old route. The new parsers do not read it.

```ts
export type Importance = "needed" | "suggested" | "later"

export type DiscoveryDataTypes = {
  question: {
    id: string
    text: string
    reason: string
    suggestions: SuggestedAnswer[]
    suggestedOptionId: string // one option
    importance: Importance
    recommendation: string
    uncertaintyHelp: string
  }
  /** One structured brief update for this reply. The reducer applies this part and ignores data-filed. */
  brief: {
    revision: number
    agreed: { sectionId: string; title: string; text: string; sourceLabel: string }[]
    suggestions: { id: string; fileId: string; title: string; text: string; why: string }[]
    open: { id: string; title: string; importance: Importance; why: string; suggestion: string | null }[]
  }
  /** Transient. The read continues after the file-chat stream ends, so watch/readFile is the later source. */
  fileRead: { fileId: string; read: FileRead }
  fileQuestion: { fileId: string; text: string; suggestions: SuggestedAnswer[] }
  filed: { topics: { id: string; title: string }[] } // still parsed; the screen derives the "Added to your brief" line from brief.agreed
  charge: { kind: "free" } | { kind: "paid"; usageMicros: number; feeMicros: number }
  ready: { agreed: number; total: number }
  usage: DiscoveryUsage
}

export type ChatLane =
  | { kind: "main" }
  | { kind: "file"; fileId: string }
  | { kind: "new-file"; file: { name: string; mediaType: string; byteSize: number; bytes: Uint8Array } }

export type DiscoveryRequestBody = {
  organizationId: string
  projectId: string
  message: string
  mode: "answer" | "ask"
  answers: DiscoveryAnswer[]
  lane: ChatLane
  idempotencyKey: string
}
```

`replyPlan(update)` builds the chunks for one reply. It copies `brief.agreed` into the filed list, so a caller cannot emit one without the other. The screen prints "Added to your brief" from `brief.agreed` only.

File-chat answers use the same request body with `lane.kind === "file"` or `"new-file"`. The first `new-file` turn is the file add. There is no add call that runs before that answer. A failed turn does not leave a file: the fixture commits the file and the answer in one event, and only after the turn is accepted. A retry with the same `idempotencyKey` does not add a second file or a second charge. `per make-operations-idempotent`.

Read progress after the stream ends is a `read-progress` event, not a second model call. The fixture timer emits those events. The edge client polls `readFile`.

### The client

```ts
type DiscoveryScope = { organizationId: string; projectId: string }

type DiscoveryResult =
  | { ok: true; record: DiscoveryRecord }
  | { ok: false; kind: "stale-revision" | "file-limit" | "acknowledgments" | "not-found"; record: DiscoveryRecord }

type SendTurn = {
  idempotencyKey: string
  scope: DiscoveryScope
  lane: ChatLane
  message: string
  mode: "answer" | "ask"
  answers: DiscoveryAnswer[]
}

interface DiscoveryClient {
  read(scope: DiscoveryScope): Promise<DiscoveryRecord>
  /** The only model-call door. Main chat, file answer, and the first file answer (the add) all use it. */
  sendTurn(command: SendTurn): Promise<ReadableStream<UIMessageChunk>>
  /** SDK adapter. Both clients return bindChatTransport(this). Components pass the result to useChat. */
  chatTransport(scope: DiscoveryScope, lane: ChatLane): ChatTransport<DiscoveryUIMessage>
  saveBriefEdit(command: { idempotencyKey: string; baseRevision: number; sectionId: string; text: string }): Promise<DiscoveryResult>
  acceptSuggestion(command: { idempotencyKey: string; baseRevision: number; suggestionId: string }): Promise<DiscoveryResult>
  finish(command: {
    idempotencyKey: string
    revision: number
    reviewed: true
    acceptGaps: boolean
    dataResponsibility: true
  }): Promise<DiscoveryResult>
  removeCause(command: { idempotencyKey: string; baseRevision: number; causeId: string }): Promise<DiscoveryResult>
  /** Components do not call this. watch() calls it. */
  readFile(scope: DiscoveryScope, fileId: string): Promise<DiscoveryFile>
  /** Apply one stream chunk to the cache. A chunk whose revision is already applied does nothing. */
  applyPart(part: DiscoveryUIMessage["parts"][number]): void
  watch(scope: DiscoveryScope, listener: (record: DiscoveryRecord) => void): () => void
}
```

`sendTurn` is the file add and the file-chat answer. A separate `addFile` or `answerFile` would forward the same arguments into `sendTurn`. That is a pass-through, so it is not on the interface. The lane carries the operation.

`bindChatTransport` lives in `src/lib/discovery-chat-transport.ts`. It is the only `ChatTransport`. It reads `DiscoveryRequestBody`, calls `sendTurn`, and forwards chunks into `applyPart`. Fixture and edge clients both do this:

```ts
chatTransport(scope: DiscoveryScope, lane: ChatLane): ChatTransport<DiscoveryUIMessage> {
  return bindChatTransport(this, scope, lane)
}
```

The React context exposes `read` results plus `saveBriefEdit`, `acceptSuggestion`, `finish`, `removeCause`, and `chatTransport`. It does not expose `sendTurn`, `applyPart`, or `readFile`.

Phase 3's `EdgeDiscoveryClient` maps the methods as follows. Bodies stay `throw new Error("not implemented")` in this phase. Nothing in the route imports the class.

| Method | Later edge function |
| --- | --- |
| `read` | `discovery-conversation`, extended |
| `sendTurn` lane `main` or `file` | `discovery-message`, body gains `lane` and `idempotencyKey` |
| `sendTurn` lane `new-file` | `discovery-message` stores the file, records the turn, and starts the read in one request |
| `saveBriefEdit`, `acceptSuggestion` | `discovery-brief` |
| `finish` | `discovery-finish`, one transaction for the confirmation row |
| `removeCause` | `discovery-cause` |
| `readFile` | `discovery-file-read` |
| `watch` | polls `read` and `readFile` while any file is `reading` or `waiting` |

The edge `sendTurn` may upload bytes and then open the stream. The screen still passes one `new-file` lane. The screen does not learn the upload step.

### Reducer

```ts
type DiscoveryEvent =
  | { type: "replace"; record: DiscoveryRecord }
  | { type: "turn"; command: SendTurn; plan: ReplyPlan }
  | { type: "read-progress"; fileId: string; read: FileRead; digest: string | null }
  | { type: "edit-section"; idempotencyKey: string; baseRevision: number; sectionId: string; text: string }
  | { type: "accept-suggestion"; idempotencyKey: string; baseRevision: number; suggestionId: string }
  | { type: "finish"; idempotencyKey: string; revision: number; reviewed: true; acceptGaps: boolean; dataResponsibility: true }
  | { type: "remove-cause"; idempotencyKey: string; baseRevision: number; causeId: string }

function reduce(record: DiscoveryRecord, event: DiscoveryEvent, applied: Set<string>): DiscoveryRecord {
  throw new Error("not implemented")
  // TODO: if event key is in applied, return record unchanged.
  // turn: if !canSend(usage), do not change record (caller throws the refusal).
  //   new-file: if !funded && discoveryFileCount >= 3, return record (caller returns file-limit).
  //   else append the file in status reading at percent 5, append both chat messages, apply plan.brief, push one receipt, bump revision.
  //   file lane waiting: move that file back to reading and append the chat lines. One receipt. The read consumes no receipt.
  //   main: append messages, apply plan.brief, one receipt, bump revision when brief changed.
  //   Reopen dependents listed on the record when an agreed answer's text changes. Their state becomes needs-review.
  // edit-section: if baseRevision !== record.brief.revision, caller returns stale-revision and does not add the key.
  //   if trimmed text is empty or equal to the current text, return record.
  //   write the text, source { kind: "ngo-edit", label: "You edited this" }, bump revision, reopen dependents.
  // accept-suggestion: move that suggestion into an agreed topic, source label "suggestion you accepted", drop it from suggestions, bump revision.
  // finish: if revision mismatches, stale. If !reviewed || !dataResponsibility || (open questions && !acceptGaps), kind acknowledgments.
  //   Set confirmation at this revision. Do not bump revision. Do not add a receipt. Actor name comes from the implementation (fixture: "Harbor coordinator").
  // remove-cause: drop that id, bump revision.
  // read-progress: replace that file's read and digest only.
  // A successful mutation adds its key to applied. A refused mutation does not.
}
```

`canSend` is the existing free-first rule: free when daily and beta both have capacity, otherwise paid when available fuel covers the hold, otherwise unavailable. The fixture copies the numbers from the current `funding()` helper's rules (daily grant 10, beta grant 50, hold 250_000 micros). The screen reads `usage.nextReply` and does not recompute the mode.

```ts
function gauge(usage: DiscoveryUsage): { band: "green" | "yellow" | "red" | "empty"; percentConsumed: number; label: string } {
  throw new Error("not implemented")
  // TODO: free mode uses the greater of dailyUsed/dailyGrant and betaUsed/betaGrant, unrounded.
  // paid mode uses spent/allocation. allocation 0 yields band "empty" and percent 0.
  // below 80 green; 80 through 95 inclusive yellow; above 95 through 100 red.
}
function questionCards(record: DiscoveryRecord, draft: SessionDraft): QuestionCard[] {
  throw new Error("not implemented")
}
function discoveryFileCount(files: DiscoveryFile[]): number {
  return files.filter((file) => file.origin === "discovery").length
}
```

The usage bar is one `role="img"`. Its accessible name states free replies and fuel, for example `Free replies 4 of 10 left today. Paid fuel full.` The free segment's fill is the remaining daily share. The fuel segment's fill is the remaining fuel share. Segment color uses `gauge` on that segment's consumed percent. The values line and the footer stay text, so color is not the only cue.

On a phone (viewport under 768px) the dock order is headline, values, reset line, bar, message box. The bar is the last thing above the message box, with at most 16px of padding between them. Desktop keeps the canvas order inside the side column: headline, bar, values, reset. The card stays in the column while the brief panel is open. The questions card is in that column only while the brief is closed, which matches the canvas.

The message box is a `textarea` with `rows={1}`, `aria-label="Your message"`, and an input handler that sets its height from `scrollHeight`. It grows with the text on desktop and on the phone. Send is `Send` in free mode and `Send paid reply` in paid mode. The composer does not render a usage count. Send stays disabled until one question has a pick or own text. Unanswered questions in the round stay Open and return on the next round.

Edit on the live brief calls `setDraft` to focus that question and close the panel. It does not call `saveBriefEdit` and does not bump the revision. Edit on the review page is the inline save that calls `saveBriefEdit`.

Finish Discovery on the chat is enabled at zero agreed topics and when fuel is empty. It sets `view` to `review`. It does not call `sendTurn`. The review page has no control whose name matches `rewrite`.

Confirmation is derived: the screen shows the finished state when `confirmation !== null && confirmation.revision === brief.revision`. Otherwise the review checkboxes render from `acks` only when `acks.revision === brief.revision`.

Checkbox copy, with the count in words (`1 question` or `N questions`):

- `I have reviewed revision N. It describes the first version we need.`
- `I understand that {count} remain open. I choose to finish Discovery anyway and keep them in the brief.` This checkbox renders only while an open or uncertain topic remains.
- `Our NGO takes responsibility for data access and keeps only the personal information this tool needs.`

The Finish button on the review page has `aria-disabled="true"` while `reviewEdit !== null`, or while the required boxes are clear. The hint while an edit is open is `Save or cancel your edit first.` Back to the chat is always a button named `Back to the chat`. It sets `view` to `chat` and leaves the record alone.

Finished copy is `Discovery finished` when the open count is zero, and `Discovery finished with open questions` otherwise. `Find a volunteer` calls the `onFindVolunteer` prop. The screen does not route.

File row copy: `Reading… 35%`, `A question for you`, `Ready · 3 facts`, `from intake`. The progress bar's accessible name is `Reading {file name}`. Limit copy, only when the project is not funded and the discovery file count is 3: `A free project can add 3 files in Discovery.` The canvas sentence about removing a file is not used, because the screen has no remove-file control. Add a file is `aria-disabled` in that state. A funded project does not show the limit and can add past three. Intake files stay in the list and do not count.

Chooser copy: `Choose a file`, `PDF, images, CSV, TSV, TXT, Word, or Excel.`, `Use sample or redacted data, not real records. ai4good and your volunteer will see it.` Cancel before the first answer is `Cancel adding this file`. Close during a read is `Close this file chat`. The read keeps going. Choosing the file name opens that chat again.

The opening file question is `What should we know about this file?` Chips are scripted. The answer starts the read. There is no second start button.

The first assistant reply, while discovery files are under three, includes: `If you have a file that shows how you work today, add it. A rota spreadsheet, a volunteer list, or a week of messages would help this need. Use Add a file.` The questions in that reply stay enabled when the file panel is closed. At three discovery files the first reply does not contain `Add a file`.

A free receipt on the assistant message reads `Free reply · no charge`. A paid receipt reads `AI usage {amount} + platform fee {amount} = {amount} total`. Finish, accept, save, and read progress do not add a receipt. That receipt count is how AT-004.61 shows that the brief came with the reply and that Finish made no further reply. The assistant region for that turn contains the reply text and the importance label from the same message. The review page shows the same brief text and no status named like a generation step.

The fixture script's sample file contains the raw line `RAW-ROW-SHOULD-NOT-APPEAR`. The digest fact is ordinary copy, such as `14 Sunday shifts`. The next main reply states the fact. The page never shows the raw line. That is the visible half of AT-004.68. The context-boundary half stays pending.

### Module map

| Path | Owns |
| --- | --- |
| `src/lib/discovery-record.ts` | Record, draft, events, `reduce`, `questionCards`, `gauge`, `discoveryFileCount` |
| `src/lib/discovery-stream.ts` | Part types, request body, `replyPlan`, part parsers |
| `src/lib/discovery-client.ts` | `DiscoveryClient` and command types |
| `src/lib/discovery-chat-transport.ts` | `bindChatTransport` |
| `src/lib/discovery-edge-client.ts` | Phase 3 class, every method throws `not implemented` |
| `src/components/discovery/discovery-screen.tsx` | Load, watch, draft, layout, progress strip |
| `src/components/discovery/chat-column.tsx` | Transcript, question chips, `Write my own`, `I'm not sure` |
| `src/components/discovery/questions-card.tsx` | Five states, Answer, View |
| `src/components/discovery/usage-dock.tsx` | One bar, values, composer |
| `src/components/discovery/brief-panel.tsx` | Side panel and phone dialog |
| `src/components/discovery/file-panel.tsx` | Chooser and file chat |
| `src/components/discovery/finish-page.tsx` | Review, inline edit, confirmation |
| `design/astra/src/fixture-client.ts` | In-memory client, timer, persistence |
| `design/astra/src/fixture-script.ts` | Scripted replies, file chats, digests, situations |
| `design/astra/src/fixture-transport.ts` | `scriptedStream(plan)` used by fixture `sendTurn` |
| `tests/at/harness/screen-driver.ts` | Server, Chromium, `withScreen` |
| `tests/at/harness/screen-driver.selftest.ts` | URL and tier guard, no browser |
| `tests/at/harness/discovery-record.selftest.ts` | Reducer twice, stale revision, file limit |

The production route file is unchanged in this phase. Phase 3 replaces its chat markup with `DiscoveryScreen` and `EdgeDiscoveryClient`.

Components use `Button`, `Textarea`, `Badge`, `Checkbox`, `Label`, and `Progress` from `src/components/ui/`. They use the tokens in `src/styles.css`. Dark mode is the existing `.dark` class. The shell already toggles that class. The screen adds three usage colors to `:root` and `.dark`, and registers them in `@theme inline`: `--usage-ok`, `--usage-warn`, `--usage-stop`, with oklch values that stay readable on the light background and on the dark background. Importance and gauge fills use those tokens. The screen does not copy hex from the canvas and does not load a font.

A reader who asks what a save does opens `finish-page.tsx`, then `saveBriefEdit` on the fixture client, then `reduce`. That is three files. `per minimize-reader-load`.

### Fixture shell

`design/astra` keeps the Vite app on port 4310, the hash router, `ProjectBuild.tsx`, `screens.tsx`, `components.tsx`, `model.ts`, `questions.ts`, `main.tsx`, and the shell CSS. The discovery route renders `DiscoveryScreen` instead of `Discovery`.

`readHash` splits `#discovery?situation=review` on `?` before the route enum. Today's parser would reject that hash and fall through to the dashboard.

The fixture client persists under `ai4good.astra.discovery.v1` when `situation` is null. A situation ignores storage so a test starts from a known record. Situations: `first-reply`, `three-files`, `all-question-states`, `usage`, `send-one-answer`, `file-chooser`, `file-reading`, `file-waiting`, `file-ready`, `review`, `funded-three-files`. Each one is a record the script builds. `send-one-answer` is the record just before a send, so the test can press Send and watch one reply.

`vite.config.ts` gains the `@` alias to `src/`, because the screen imports `src/components/ui`. `src/styles.css` already scans `src/`, so the new classes are included.

Deleted, because the new screen replaces them: `Discovery.tsx`, `DiscoveryProgress.tsx`, `DiscoveryReferences.tsx`, `DiscoveryScope.tsx`, `discovery-examples.ts`, `discovery-chat.css`. `screens.tsx` loses the `<DiscoveryScope />` line. The rest of the scope page stays. `questions.ts` stays because that page and `model.ts` still use it. The new script does not import it.

The screen region is `aria-label="Discovery"`. Tests search inside that region so the shell sidebar is outside the assertion.

On construction, the fixture client scans files in `reading` and starts one timer. The timer emits progress events until the scripted pause question or until ready. Strict-mode remounts unsubscribe `watch`. They do not start a second timer.

### Screen driver

New devDependency: `playwright`. The suite does not use `@playwright/test`. `tests/at/tsconfig.json` stays without the DOM lib. `screen-driver.ts` loads Playwright with `createRequire` so the typecheck does not pull Playwright's DOM types into the project (`skipLibCheck` is false). Suite files import only `withScreen` and a small `ScreenPage` facade (`getByRole`, `getByText`, `boundingBox`, `click`, `fill`).

```ts
export function withScreen(
  options: { situation: Situation; width: number; height: number },
  check: (page: ScreenPage) => Promise<void>,
): Promise<void> {
  throw new Error("not implemented")
  // TODO: if AT_TIER !== "loop", throw new CapabilityPending(["ui.discovery-surface"]).
  // First call in this worker starts Vite on an ephemeral port (not 4310) and Chromium.
  // Later calls reuse both. Refcount. The last finally closes the page context.
  // When the count hits 0, kill the Vite child. On worker exit, kill it too.
  // URL: http://127.0.0.1:{port}/#discovery?situation={situation}
  // A pid file under os.tmpdir records pid and port. A dead pid is started again.
}
```

CI's `ci.yml` gains one step, after install and immediately before the loop verify step: `bunx playwright install chromium`. The same `if` as the other code steps. `--wired` stays exit 3. This driver is not that flag. Codex can walk the shell during the build. The test run does not start Codex.

`atTest` for these ids sets `surface: 'ui'` and `timeoutMs: { loop: 90_000 }` so the first Vite start fits.

Tier behavior in this phase:

| Id | Loop | Integration and drill |
| --- | --- | --- |
| .61–.66, .70–.73 | `withScreen` checks. Declaration moves to green. | `awaiting(AWAITED.discoverySurface)`. Declaration becomes `capability-pending` on `ui.discovery-surface`. |
| .67, .68 | The visible checks run. Then `throw new AtPending(id, "sut-missing", "...")`. Declaration stays `pending` / `sut-missing`. | Same `awaiting` call. Declaration becomes `capability-pending`. |
| .69 | `notYet`, no browser. Declaration stays `pending` / `sut-missing`. | `awaiting`. Declaration becomes `capability-pending`. |

The loop map names `loop`, `integration`, and `drill`. There is no `default`. The manifest has no drill tier. A drill `--expect` run still fails at the declaration preflight, as it does today.

If a .67 screen check fails, the error is an assertion error. That does not match the pending declaration, so `--expect` fails. If the screen check passes, the pending throw matches the declaration and the id stays red. The backend half is the real counters and, for .68, the model context. The fixture cannot show those.

Phase 3 points the same check functions at the real route by deleting the `AT_TIER !== "loop"` refusal inside `withScreen` and opening the app URL for integration. The check callbacks stay. .67 can drop the trailing `AtPending` once the usage card is bound to `read()` on the edge client, and the id can go green. .68 keeps the trailing pending until a check can see the model context without a tier branch. .69 stays `notYet` at loop. Its integration body, in that later phase, drives a large file on the real route. This phase does not write that body.

AT-004.72 at width 390 measures the bar's bottom against the message box's top. The gap is at most 16px and the two boxes overlap horizontally. It then fills a long line and expects the message box height to grow. AT-004.73 opens the brief at 1280 (panel's left edge is to the right of the chat) and at 390 (dialog labeled `Your live brief`, `Back to chat`, dialog covers the chat width).

The declaration is written from this table in the same change as the bodies, before the first `--expect` run. The run has to match it.

### Phone layouts

The canvas has no phone file chat, questions card, or review page. These are the layouts this phase builds. Width is 390. Targets are at least 44px tall.

**File chat.** A full-width panel covers the transcript and the side cards. The title is the file name. One status line sits under it (`What should we know about this file`, `Reading…`, `A question for you`, or `Ready · N facts`). The transcript scrolls. Suggested answers wrap, each on its own row. The dock stays at the bottom of the viewport: the usage bar, then this panel's message box in place of the main message box. Close returns to the main chat. During a read, close does not stop the timer. The chooser is the same panel before a file is chosen: drop area, full-width `Choose a file`, the type line, the disclosure, then `Cancel adding this file`.

**Questions card.** It sits in the scrolling column after the transcript and before the dock. It is expanded. It does not sit between the bar and the message box. Answer scrolls the chat question into view and focuses its first option. View scrolls the answer bubble into view. The bubble's background uses the accent token for the highlight. When the phone brief dialog is open, this card is covered with the rest of the chat. The dock stays visible.

**Finish review.** One column. `Back to the chat` at the top. Open questions first. Each row shows the importance words, why it matters, the suggestion, then full-width `Use the suggestion` and `Answer in the chat`. Brief sections follow, each with Edit. An open edit replaces that section with a text area, Save, and Cancel. A sticky bar labeled `Jump to confirmation` focuses the confirmation heading. The bar hides while that heading is in view. The confirmation card is full width. Its Finish button is full width. The done state replaces the column with the finished heading, the open-question sentence, and `Find a volunteer`.

**Brief dialog.** Header with `Back to chat` and the heading `Your live brief`. The brief scrolls above the dock. The dock remains in the viewport so the usage card stays visible and the unsent note stays in the message box. The dialog covers the chat from the top down to the dock.

Desktop file chat stays the canvas panel: 380 by 520 at the bottom right, with its own composer and one line of the same usage headline. Desktop questions and usage stay in the side column. Desktop review is a row at widths of at least 1024: the document scrolls on the left, and the confirmation card is sticky on the right, so it stays in view. Under 1024, review uses the phone column.

### Build order

Each unit is one commit group. The check is part of the unit.

1. `discovery-record.ts` and its selftest. Check: `bun run at:selftest` passes the reducer cases (second apply is a no-op, stale edit does not bump, a fourth unfunded file does not appear, accept drops the suggestion).
2. Stream types, `replyPlan`, `bindChatTransport`, `DiscoveryClient`, and the throwing edge class. Check: `bun run typecheck`.
3. Fixture client, script, and `fixture-transport.ts`, mounted from `App.tsx`. Old discovery files deleted. Check: `bun run design:astra:check`, and the shell's `#discovery` shows `Chat with ai4good AI`.
4. Screen driver, without the acceptance bodies yet. Check: the driver selftest, plus one local `withScreen` smoke that finds that heading.
5. Chat column, questions card, usage dock, brief panel, including the phone dock and phone brief. Check: loop bodies for .71, .72, .73, and .61, then `bun run at:verify req-004 --tier loop --expect` with those four moved to green.
6. File chooser, file chat, read timer, phone file panel. Check: .65, .66, .70 go green; .67 and .68 stay pending after their visible checks.
7. Finish page, phone review, accept, inline edit, cause removal. Check: .62, .63, and .64 go green. .69 stays `notYet`.
8. Chromium step in `ci.yml`, Playwright devDependency, lockfile. Check: the workflow diff is that one step, and `bun run at:verify req-004 --tier loop --expect` exits 0.

## Synthesis decision

The arena writes this section. This package is the client-port candidate. It does not record a synthesis.

## Tradeoffs accepted

- We accept an unwired production route in this phase in exchange for a screen that never calls an edge function that does not exist yet.
- We accept a second question list in `questions.ts` for the old scope page in exchange for leaving that page's behavior alone.
- We accept that the phone bar is the last dock row, above the message box, in exchange for a bounding-box check that matches the acceptance sentence. The canvas draws the reset line under the bar.
- We accept that the phone brief dialog stops above the dock in exchange for the usage card staying visible and the unsent note staying on screen.
- We accept `role="img"` on a two-part bar in exchange for one accessible name. A single progressbar cannot state two fills.
- We accept trailing `AtPending` on .67 and .68 in exchange for running the visible checks without marking the ids green.
- We accept ephemeral-port Vite in the test worker in exchange for leaving a person's server on port 4310 alone.
- We accept `createRequire` for Playwright in exchange for keeping the DOM lib out of `tests/at/tsconfig.json`.
- We accept situation hashes as fixture-only start states in exchange for checks that do not click through the whole script. The screen component does not read the hash.

## Alternatives considered

**Transport swap only.** The screen would call `useChat` and `fetch` the review and file routes itself. The fixture would replace `ChatTransport` and nothing else. This lost because phase 3 would still edit every call site that knows an URL. The interface is wide, and the policy for revisions and file limits sits in the components. The client hides that policy.

**One shared store, hydrated from the network.** Components would dispatch into a store, and phase 3 would fill the store from HTTP. This lost because the stream, the timer, and the person would all write the same object. The reducer-plus-draft split gives each writer its own event or its own draft. Callers of a shared store also learn action names that mirror the stream parts. That leaks the wire shape.

**A brief client and a file client.** Each would be smaller. This lost because a file answer and a main answer share one usage record and one charge rule. Two clients would make the screen keep those counters in step. One `sendTurn` keeps the rule in the reducer.

The separate `answerFile` method lost inside this shape for the same reason a pass-through loses: it would call `sendTurn` with a file lane and add a second door.

## Open questions and risks

- Should the phone brief cover the usage bar, as the phone canvas covers the whole 390 by 844 board? This package leaves the dock on screen so the usage card stays visible while the brief is open. If the full cover is required, the usage sentence and the full-screen sentence need a new reading.
- Playwright's browser download is a new CI cost on every code pull request. The step is one install. A failed download is an infrastructure failure of the job, not a red acceptance id.
- `sendTurn` for `new-file` carries bytes in the lane. Sample files are small. A large real file may need an upload step inside the edge client before the stream. The screen's lane stays the same. AT-004.69 is the later proof.
- The fixture scope page and the new script can drift, because both describe the volunteer scheduling sample. This phase does not join them.

## Next implementation step

Write `src/lib/discovery-record.ts` with the record, `reduce`, and `questionCards`, and the harness selftest that applies one edit event twice and expects a single revision bump.