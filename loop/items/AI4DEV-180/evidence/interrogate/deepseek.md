## Findings

### 1. [critical] A file read that passed its pause keeps mutating the brief after the NGO confirms Discovery
**Location**: `design/astra/src/fixture-world.ts:503-528` (`finishRead`), `:548-582` (`scheduleRead`), contrast `:472-501` (`pauseRead`)
**Finding**: `pauseRead` deliberately refuses to ask while `state.confirmation` is set ("A finished Discovery stops new questions. The read waits here until a saved change reopens it"), but the `to70` and `ready` timers in `scheduleRead` have no such guard. If an existing file was answered (status back to `reading`, `questionStillOpen` false — e.g. a file with no pause, or a pause already answered), then `setReadingPercent(70)` and `finishRead` still run after confirmation. `finishRead` then does `next.brief.revision += 1`, appends a `brief.suggestions` entry, and stores `file.tookFromIt`, while `confirmation.revision` stays at the old revision.
**Evidence**: Trace: `applyFileAnswer` (existing target) → `scheduleRead(fileId, from)` → `questionStillOpen` false → `later(to70)` + `later(ready)`. Nothing in those callbacks checks `state.confirmation`. The client accepts the higher revision (`newerBrief`) and keeps the confirmation, so `DiscoveryReview.Finished` renders the new `TEXT.revision(review.brief.revision)` beside `TEXT.review.doneBody(confirmation.revision)`, i.e. "confirmed revision N" while showing revision N+1. The contract (`design/discovery-ui-contract.md:100-105`) says the confirmation records the revision and a changed answer must invalidate approval. The read is also visible in the UI as continuing ("Reading… 70%") after the NGO finished.
**Suggestion**: Apply the same confirmation hold as `pauseRead` to the `to70`/`ready` steps (park the completion until `releaseHeldQuestions` after a saved change), or on completion while confirmed refuse to bump the revision and keep the fact out of the brief until it reopens.

### 2. [warning] `askTopic` returns the topic id where a question id is required
**Location**: `src/components/discovery/use-discovery.ts:783-791`; call site `src/components/discovery/DiscoveryReview.tsx:282-284`
**Finding**: `useDiscoveryReview.askTopic` returns `topicId` as the question id (`return topicId;`). The review page then passes that value to `onBackToChat(questionId)` to focus the question in the chat, and `DiscoveryScreen` focuses a `QuestionGroup` keyed by `question.id`.
**Evidence**: `BriefQuestion` explicitly separates `id` and `topicId` (`src/lib/discovery-stream.ts`), and `currentQuestions` matches by `question.id`. The fixture only works because it aliases them (`fixture-data.ts`: `asked(topic.id, …)` sets `id: topicId`). A phase-3 edge function that mints a distinct question id silently focuses nothing; `pointAt`/`QuestionGroup` look up `focusId === question.id`.
**Suggestion**: Derive the id from the returned snapshot: `result.value.questions.find((q) => q.topicId === topicId)?.id ?? topicId`, or change the port's `askTopic` contract to return the new question id.

### 3. [warning] `sendFileAnswer` writes the AI SDK `Chat` store directly, outside its API, before the try/catch
**Location**: `src/components/discovery/use-discovery.ts:452-464`
**Finding**: `current.messages = [ ...current.messages, { id: \`ask-…\`, … } ]` assigns to the `Chat` instance's messages property instead of using the SDK's setter. The mutation sits before `fileSending.current = true` / `try`, and the caller discards the promise (`onSend={(text) => void discovery.sendFileAnswer(text)}`).
**Evidence**: If `messages` is a getter (or the installed `@ai-sdk/react` version changes), this throws a `TypeError` that is never caught and never surfaced: the pause answer is silently dropped and the file chat stays stuck on "A question for you". It also bypasses the notification path, so React subscribers are not told. The alteration is load-bearing only for live ordering: `fileChatView` already synthesises the pending question from `file.status` (`model.ts:251-253`) and the world stores `ask-${fileId}` itself (`fixture-world.ts:492-499`).
**Suggestion**: Destructure `setMessages` from the file `useChat` call and use it, or drop the mutation and let the view own the question line ordering (the world already persists it).

### 4. [warning] "View" on a `Not sure` question is a dead control
**Location**: `src/components/discovery/model.ts:400-409` (`canView: true` for `not-sure`), `src/components/discovery/use-discovery.ts:642-649` (`viewAnswer`), `model.ts:133-146` (`answerTarget` returns null unless the topic is `agreed`)
**Finding**: The Questions card renders a "View" button for a `not-sure` row, but `answerTarget` only returns a target for `state.kind === "agreed"`, so `viewAnswer` clears the panel and highlights nothing. On desktop nothing visible happens; on phone the Questions dialog just closes.
**Evidence**: `questionRows` sets `status: "notSure", canView: true` (model.ts:400-409); `viewAnswer` calls `answerTarget`, which returns `null` at line 140 for any non-agreed topic; `setHighlight` is guarded by `if (target)`. AT-004.71 only exercises View on an agreed question, so the tests never see it.
**Suggestion**: Either drop `canView` for `not-sure` rows, or give the not-sure state a target (its `help` line) so the control does what its label says.

### 5. [nit] `ProgressStrip`'s compact mode cannot ever activate
**Location**: `src/components/discovery/ProgressStrip.tsx:18-31, 48-52`; `design/astra/src/styles.css` (`body:has(.discovery-content) { overflow: hidden }`)
**Finding**: The strip observes a sentinel with the viewport as root, but the page never scrolls: the frame is fixed height and the only scroller is the conversation log, which is a flex sibling of the strip. `entry.isIntersecting` is therefore always true and `compact` is always false.
**Evidence**: `DiscoveryScreen` renders `ProgressStrip` above the `Conversation`, and the conversation alone has `overflow-y-auto`; the sentinel (`h-px`) sits at the top of the fixed frame. The "compact strip after the progress panel scrolls out of view" behavior (contract line 189-190) is consequently never implemented or tested, only dead code.
**Suggestion**: Remove the observer and render the single strip, or move the sentinel into the scrolling log if the compact behavior is actually wanted.

### 6. [nit] Duplicated autosize textarea and full-screen dialog class
**Location**: `src/components/discovery/Composer.tsx:20-40` vs `src/components/discovery/FilePanel.tsx:57-77`; `FULL_SCREEN` in `BriefPanel.tsx:9`, `FilePanel.tsx:11`, `QuestionsCard.tsx:8`
**Finding**: Two 25-line copies of identical measure-and-grow logic (line height, padding, border, 192 px cap), and the same long Tailwind `FULL_SCREEN` string is copy-pasted three times.
**Evidence**: The two blocks differ only in the surrounding form markup; divergence (e.g. one cap changed) would be invisible. The test `oneLineLimit` depends on the computation, so drift would be caught late.
**Suggestion**: Extract one `GrowingTextarea` used by both, and one shared constant/component for the phone dialog shell.

### 7. [nit] Fixture validation collapses every diagnostic and keeps a dead `ask` mode
**Location**: `design/astra/src/fixture-transport.ts` (`requestOf`), `design/astra/src/fixture-world.ts:114-122`
**Finding**: Every invalid request shape throws `invalid-request, "The reply needs a project."` even when the problem is an unknown mode or malformed answers, and the `mode: "ask"` path is unreachable — nothing sends it since `askTopic` became a port method (`use-discovery.ts:783`). `applyTurn` still charges a turn for that dead mode.
**Evidence**: `requestOf` returns the same message for a missing project, a bad mode, and a bad answer entry; no caller constructs `mode: "ask"`.
**Suggestion**: Name the failing field in each refusal and delete the `ask` branch (or keep it only if a caller is planned).