Candidate D (the state-machine package) is the base. Total 26. It is the only package that closes the five hard flows, including the edit-versus-reply race, and whose test registration matches the harness.

## Scores

### Candidate A (`out-astra.md`, snapshot replace) — 24

1. **Flow correctness: 4.** The main-chat queue claims an item before any await, refuses to pass an item that is being edited, and keeps a stable request id if the stream breaks. Use answer while that same chat is still answering is left open: the port has a busy refusal, and the Use answer steps never say they take it.
2. **Interface depth and reader load: 4.** `load`, `execute`, `subscribe`, and `chat` are a small port, and the Use answer button only submits the edited text plus a server-issued action. The view still carries the whole workspace snapshot, so a later edit can start reading domain fields in the component.
3. **Testability and honesty: 4.** The sixteen loop bodies stay on the shell and the fixture port, and they leave scoring, the ledger, and the planning package for the integration tier. The sample registration names loop and integration only. `tierBodyProblem` in `tests/at/harness/registry.ts` rejects a tier map that omits drill and has no `default`.
4. **Fit with screen wiring: 3.** Swapping the port leaves the components alone, and ordinary replies use `useChat`. Mark answer complete, Use answer, and the completion check return a finished snapshot and can skip streaming. Every transition lives in the fixture world, so wiring has to write that authority again.
5. **Invariants in types: 5.** Question state is a discriminated union with the follow-up inside `answering`, and Confirm, Use, and Close are `Availability` values carrying a server token. `parsePrdWorkspace` is the boundary that must reject a dangling reference.
6. **Scope discipline: 4.** The harness change is the settled `testId` step plus a hash route on `shellUrl`. Two-tab draft conflicts and interrupted-operation recovery go past the acceptance cases.

### Candidate B (`out-fable.md`, navigation in the URL) — 18

1. **Flow correctness: 3.** Queue, follow-up, close, and dependent topics are named and mostly coherent. The Use answer example navigates with `lastOwnTurnId()` as soon as `useAnswer` returns, while the flow section navigates only after the brief turn exists.
2. **Interface depth and reader load: 3.** A typed `PrdLocation` makes the phone tab and the open pane one value. The port has eight methods, and the review button both sends and calls `nav.go`, so copying that example splits one action across two owners.
3. **Testability and honesty: 3.** The per-case notes are plain about what the shell cannot prove. The sample map has no `default` and no drill body, so registration throws, and `url` / `back` are new host operations the driver does not have.
4. **Fit with screen wiring: 3.** `port.chat(scope)` and one `Chat` per scope match a later `DefaultChatTransport`. Mark answer complete is the one paid path that never goes through that transport, and the dependency walk lives only in the fixture world.
5. **Invariants in types: 3.** Question status and location are real unions. `PrdRefusal` ends with `| string`, and topic state is a flat label that can sit beside any blocker list.
6. **Scope discipline: 3.** Deep links are the assigned direction. The new host operations are outside the one locator step the brief allows. This package is the short saved report, about 117 lines, so several of the required `throw` bodies are absent.

### Candidate C (`out-grok.md`, one chat per conversation) — 22

1. **Flow correctness: 3.** Each conversation has its own phase, and Use answer submits on the main `Chat` even when that pane is hidden. The queue is also on topic and side chats, while the canvas turns those sends off (`secBusy`, `threadBusy`) and the review record keeps the queue on Priya’s main chat. `authoring` and `authoring-ngo` use different storage keys, so the shell does not show one shared record.
2. **Interface depth and reader load: 4.** The screen takes a port, the port has four methods, and `ConversationPane` is the only `useChat`. `PrdSession` is one large class, which is where a later change will land.
3. **Testability and honesty: 4.** Loop versus integration is stated per case, direct calls go through `portFor`, and drill is named so the registrar accepts the map. `testKey` is a second locator attribute beyond the settled `testId` step.
4. **Fit with screen wiring: 4.** `port.transport(id)` and `new Chat` are the seam wiring can replace. `reviseDependents`, `authorize`, and `gaugeOf` live in `src/lib` for both the fixture and the edge. The queue is stored with commands, so wiring also has to persist the outbox.
5. **Invariants in types: 3.** Conversation ids are branded and parsed. Question status is a flat string beside a separate `sentAnswer`, so `complete` with no answer still type-checks, and refusal kinds are open strings.
6. **Scope discipline: 4.** The file list stays inside the screen, the shell, and the suite. `testKey` and a persisted queue are the extra machinery.

### Candidate D (`out-opus.md`, one domain state machine) — 26

1. **Flow correctness: 5.** One reducer step owns the queue: main queues, topic and side block, `take` does nothing once an item has started, and `settle` is the only place a send begins. Follow-up is server state, Close anyway must match the current check, and a changed answer comes back as topic events from `afterTopicChange`. Mark answer complete moves Maya to the list before the call settles; a refusal does not say it restores the side chat.
2. **Interface depth and reader load: 3.** The barrel is the screen plus a five-method port, and a button dispatches `review.use` or renders nothing. The reader also has to hold `state.ts`, `reducer.ts`, `outbox.ts`, `selectors.ts`, and `store.ts`, and the call chain runs through all of them.
3. **Testability and honesty: 5.** `default` covers integration and drill, which is what `tierBodyProblem` requires, and every loop body is required to call `ctx.open()`. Handles come from one `TID` list. The queue example edits the middle item, removes the last, and expects two probe calls. The case table leaves the ledger, the scorer, and membership to integration.
4. **Fit with screen wiring: 4.** Wiring replaces the port. `Chat` and `useChat` match Discovery (`src/components/discovery/use-discovery.ts`). `prd-machine.ts` is the shared rule module. Wiring must emit the ordered `seq` log the reducer folds, and `chat.messages = []` is not how Discovery updates a `Chat` (it uses `setMessages`).
5. **Invariants in types: 5.** Topic state and NGO question state are discriminated, including `followUp: "pending" | "none"` and `used` with a brief message id. No command sets Ready to confirm. `CloseFlow` and the authority table make the illegal clicks unrepresentable.
6. **Scope discipline: 4.** The harness addition is `testId` plus an optional text filter on that same step, which matches rows that already carry `data-testkey` without a new attribute. The shell viewer switch repeats the canvas “Prototype only” control so two viewers share one world. Reducer unit tests are extra and replaceable by the loop body.

### Candidate E (`out-sol.md`, commands and an event log) — 20

1. **Flow correctness: 4.** Admission of a queued line is atomic, the next line starts on `operation-finished`, and Maya returns to the list only after `answer-sent`. Use answer can post the brief while an earlier main-chat operation is still running, so the transcript and the live stream can pass each other until the batch lands.
2. **Interface depth and reader load: 3.** Components call `actions.useAnswer` and never build the brief. The shared vocabulary adds replica ids, feed cursors, batch ids, five revision brands, a decision graph, and an operation lifecycle before a contributor reaches the screen.
3. **Testability and honesty: 4.** The sample has `ctx.open()`, a `default` pending body, and canvas handles only. The loop column stays on scripted probes and says fixture refusal is the contract, leaving edge authorization to integration.
4. **Fit with screen wiring: 3.** `chat(conversation)` and one lasting `Chat` are the right SDK seam, and `decidePrdCommand` is shared so the fixture script does not own the transitions. Those functions sit under `src/components/`, and the port also requires replay, an operation store, and queue revisions before the screen can load.
5. **Invariants in types: 4.** Queue entries, question state (including `composing-answer`), and close warnings are unions bound to revisions. Topic state is still a flat string, and the projection’s derived indexes can drift from the events if `foldPrdBatch` rebuilds them wrong.
6. **Scope discipline: 2.** The harness diff is the settled one. Replica drafts, content hashes, read-dependency patches, and `reconciliation-required` are a second persistence design beyond this screen build.

## Totals

| Candidate | Flow | Interface | Tests | Wiring | Types | Scope | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A snapshot | 4 | 4 | 4 | 3 | 5 | 4 | 24 |
| B URL navigation | 3 | 3 | 3 | 3 | 3 | 3 | 18 |
| C one chat each | 3 | 4 | 4 | 4 | 3 | 4 | 22 |
| D state machine | 5 | 3 | 5 | 4 | 5 | 4 | 26 |
| E event log | 4 | 3 | 4 | 3 | 4 | 2 | 20 |

## Base

Use Candidate D. The queue, the follow-up block, Use answer, Close anyway, and dependent topics all run through one pure step, so the race the canvas already hit (edit or remove while the reply finishes) has one result. The same `prd-machine.ts` guards the buttons and the fixture world, which is what keeps the later edge function from growing a second set of rules. The cost is the file count. Keep the public import as the screen and the port, and do not let components call `step` themselves.

## Grafts into D

- **From A:** Parse the loaded snapshot at the boundary, and keep three counters apart: snapshot sequence, PRD revision, and conversation revision, so a funds tick does not stale a confirm. Move Maya back to All questions only after the complete-answer result, which A already requires.
- **From C:** Create each `Chat` with `port.transport(id)` and keep a single `ConversationPane` on `useChat({ chat })`. Count the gauge from settled spend over allocation. The contract shows pending as text and spent as the bar.
- **From B:** Put the open pane and the phone tab in one `PrdLocation` on the hash, and open a case by passing that value through the `shellUrl` params D already adds. Drive Back with `prd-section-back`. Leave the driver without new `url` or `back` operations.
- **From E:** Apply one event batch in one reducer step, and record the Dev brief and the move to Answered in that same batch. Keep command and request ids so a repeated press returns the first result.

Leave E’s replica ids, content hashes, and feed cursors out. Leave C’s persisted outbox and per-viewer storage keys out. Leave A’s non-streaming command path for Use answer out. The brief is a message in the main chat and belongs on the `Chat`.

## Repository claims checked

These claims match the tree: desktop and phone boards have 88 and 91 `data-testid` lines; rows carry `data-testkey`; `prd-readonly-banner` is the NGO notice “Priya works on the PRD with the AI here.”; the version 20 review entry says the viewer switch is not part of the screen; `shellUrl` hard-codes the Discovery hashes; `locate` accepts role or text; the desktop viewport is 1280×800; `tierBodyProblem` rejects a tier map with a missing tier and no `default`; a finished `atTest` body must open a world or consume a capture; the suite binds `sut: 'scope'`; Discovery constructs `Chat` from `@ai-sdk/react` and returns when `status` is `submitted` or `streaming`; the review record says the queue applies to Priya’s main chat only; the canvas sets a used answer’s status to `claimed`.

One claim does not match. Candidate D says the contract shows pending as a hatched bar. `design/prd-ui-contract.md` says available and pending are text and spent is the bar. The hatched pending segment is in the review record, canvas version 16.