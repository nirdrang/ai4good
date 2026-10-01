## Findings

### 1. [critical] Model-call probe counts refusals as turns
**Location**: `design/astra/src/fixture-transport.ts:142-147`, `240-246`
**Finding**: `FixtureChatTransport` and `FixtureFileChatTransport` call `reportModelCall("chat-turn"/"file-chat-turn")` before `world.applyTurn` / `world.applyFileAnswer`. Both `apply*` can still refuse after the probe.
**Evidence**: Chat path pre-checks `allRequiredAgreed` and `unavailable`, then reports, then pauses 20ms, then `applyTurn` re-checks `confirmation`, `discovery-ready`, `daily-limit/beta-limit` and can return `{ok:false}`. File path pre-checks `unavailable` and `fileBlock`, reports, pauses, then `applyFileAnswer` re-checks `confirmation` and `fileBlock` and can refuse `finished/not-waiting`. The probe already appended, so `modelCalls()` overcounts. `file-read` is correctly reported after success (`245-246`); the turn probes are not. Tests assert exact sequences like `['file-chat-turn','file-read','file-chat-turn']` — a raced refusal would still add a turn.
**Suggestion**: Move `reportModelCall` to after `turned.ok` is known, or make `apply*` infallible after the pre-check.

### 2. [critical] `ServerChange` omits `confirmation`, subscribers go stale
**Location**: `src/components/discovery/port.ts:16-22`, `design/astra/src/fixture-world.ts:153-166,406-427`
**Finding**: `commit()` notifies only `{files, brief, usage, transcript?}`. `finish()` and `saveBriefEdit()` mutate `confirmation` but never push it.
**Evidence**: `finish` does `commit({...state, confirmation})` — `commit` drops `confirmation` on the floor. `saveBriefEdit` does `next.confirmation=null; commit(next,true)` — same drop. `useDiscovery` and `useDiscoveryReview` subscribe only to `files/brief/usage/transcript` and never learn of the confirmation change except via an explicit `port.load()` in narrow paths (`use-discovery.ts:592,237-249`). Two components sharing one world (chat kept mounted hidden in `App.tsx:276-283` while review finishes) disagree until the next load. `fileChats` is likewise never pushed; the UI reconstructs pause/done lines from `file.status` instead.
**Suggestion**: Add `confirmation?: Confirmation|null` (and `fileChats` if needed) to `ServerChange` or force a `load()` on every commit.

### 3. [critical] `askTopic` returns `topicId` disguised as `questionId`
**Location**: `src/components/discovery/use-discovery.ts:783-791`, `src/components/discovery/DiscoveryReview.tsx:282-284`
**Finding**: `useDiscoveryReview.askTopic` returns `topicId` on success; the caller treats it as `questionId` for `onBackToChat`.
**Evidence**: `askTopic` does `setBrief(...); return topicId`. `OpenItem` does `review.askTopic(item.topicId).then((questionId)=>onBackToChat(questionId))`. It works only because the fixture makes `question.id === topicId` (`fixture-data.ts:257-270`). The port returns only `BriefSnapshot`, so a real backend with distinct question ids would focus the wrong node or nothing. The boundary fabricates an id instead of reading the new question from the returned brief.

### 4. [critical] `stillOpen` ignores `not-sure`; question tail excludes `needsReview`
**Location**: `design/astra/src/fixture-world.ts:259,268-272,282-287`
**Finding**: Two inconsistent definitions of "open" in the same turn.
**Evidence**: `stillOpen = topics.some(open || needsReview)` — `not-sure` topics are neither, so after an uncertain answer with no new questions `stillOpen` is false and the reply appends `Nothing is left to ask. Select Finish Discovery`, while `allRequiredAgreed` is still false and `currentQuestions` (`model.ts:44-54`, `!topicSettled`) still includes the `not-sure` question. Conversely the streamed tail filters `topic.state.kind !== "agreed"`, which drops `needsReview===true` agreed topics even though `currentQuestions` includes them and `stillOpen` counts them. The client and the stream disagree on what remains.

### 5. [critical] Duplicate React keys in the conversation log
**Location**: `src/components/discovery/Conversation.tsx:137-152`
**Finding**: `key={paragraph}` and `key={title}` for filed topics.
**Evidence**: `message.paragraphs.map((paragraph)=><p key={paragraph} ...>)`. Two identical paragraphs in one reply (scripted replies join with `\n\n`, file reports + reply body can repeat) collide; React reuses the wrong node and the `aria-current` highlight (`highlight.text === paragraph`) can attach to the wrong paragraph or fail to move. Same for `filed.map(title)` if two topics share a title. Use the index.

### 6. [warning] `Send` silently drops reopened answers
**Location**: `src/components/discovery/use-discovery.ts:305-306,318,491-494`
**Finding**: `sendable` excludes `reopened`, but the UI lets a reopened draft and a normal draft coexist.
**Evidence**: `sendable = questions.filter(!reopened.includes)`; `answers = answersFromDrafts(drafts, open)` where `open` is also filtered. If the NGO picks a new answer for an Edit-reopened question and also answers an open question, then hits `Send`, the reopened answer is quietly discarded — no error, no save. The correct path is `Save change` (free, base revision), but nothing stops or warns about the mixed submit. This is silent data loss.

### 7. [warning] `isState` accepts corrupt persisted worlds
**Location**: `design/astra/src/fixture-world.ts:60-73`
**Finding**: Validation checks only five top-level shapes.
**Evidence**: It verifies `brief.revision` is a number, `transcript/files` are arrays, `allocationMicros` is a number, `project.title` is a string, `fileChats` is a non-array object. A stored value missing `brief.topics`, `brief.questions`, `usage.dailyLeft`, or with wrong element shapes passes and crashes later (`brief.topics.find`, `brief.questions.map`, `usageView`). The key is versioned (`...v1.${scenario}`) but the check is not a schema. Validate or discard on any structural mismatch.

### 8. [warning] Progress compact strip is dead code
**Location**: `src/components/discovery/ProgressStrip.tsx:18-31,47-53`
**Finding**: The sentinel/`IntersectionObserver` can never fire.
**Evidence**: `body:has(.discovery-content){overflow:hidden}` and `.discovery-content{height:calc(100dvh-64px);overflow:hidden}` mean the page never scrolls; the conversation scroller is a nested `overflow-y-auto` that does not move the sentinel relative to the viewport. `compact` stays `false`, `projectTitle` never hides, the `sticky top-0` bar is sticky inside a non-scrolling flex column. The contract's "compact strip after scroll" is not implemented.

### 9. [warning] Impure render in shell theme init
**Location**: `design/astra/src/App.tsx:305-316`
**Finding**: `document.documentElement.classList.toggle` runs inside the `useState` initializer, i.e. during render.
**Evidence**: The initializer reads `localStorage`, falls back to `matchMedia`, mutates the DOM, and returns. Render-phase side effects break under StrictMode double-render and SSR/hydration assumptions. Move the DOM write to an effect (the existing `useEffect(...,[dark])` already does it).

### 10. [warning] Render-phase ref write drives scroll intent
**Location**: `src/components/discovery/Conversation.tsx:67-71`
**Finding**: `intentRef.current = followRef.current` executes on every render.
**Evidence**: Ref writes during render are not safe with concurrent/strict rendering; the "intent from before paint" can be clobbered by an aborted render. Capture it in an effect or event handler (`onScroll` already maintains `followRef`; snapshot it in `useLayoutEffect` before adjusting).

### 11. [warning] `openChooser` / `chooseFile` ignore confirmation
**Location**: `src/components/discovery/use-discovery.ts:620-627,375-402`
**Finding**: The finished guard lives only in `FilesCard.canAdd` and inside `chooseFile`'s silent `return`.
**Evidence**: `openChooser` checks `fileRows(...).canAdd` (funded/count) but not `confirmationRef`. A programmatic `openChooser` after confirmation opens the chooser; `chooseFile` then returns without notice, leaving an empty chooser. `send`/`sendFileAnswer` share the silent-return shape. Defense in depth: check confirmation in `openChooser` and surface a notice instead of no-op.

### 12. [warning] Opening brief/questions discards a staged file
**Location**: `src/components/discovery/use-discovery.ts:345-361,607-612,367-373`
**Finding**: `releaseUncommitted` deletes a staged (chosen-not-answered) file chat.
**Evidence**: `openPanel`, `pointAt` (via `reopen`/`focusQuestion`), and `viewAnswer` all call `releaseUncommitted`, which drops `held` entries, `staged`, and `fileDrafts` when the file is not yet committed. Staging `shift-notes.txt`, then opening the live brief to check wording, silently loses the staged file and its draft. Either preserve staged state across panels or confirm.

### 13. [warning] `answerTarget` is null for seeded confirmations
**Location**: `src/components/discovery/use-discovery.ts:133-146`, `design/astra/src/fixture-data.ts:808-848`
**Finding**: `confirmedState` seeds agreed topics with `answerMessageId: null`, so `View` can never highlight.
**Evidence**: `answerTarget` returns null when `!messageId`. `viewAnswer` then sets no highlight but still records `restore`. `questionRows` marks those topics `canView:true`, so the button exists and appears to work while doing nothing visible. Seed real message ids or hide `View` when there is no target.

### 14. [warning] CI installs Chromium via `playwright-core`
**Location**: `.github/workflows/ci.yml:170-173`, `package.json`
**Finding**: `bunx playwright-core install --with-deps chromium` is the wrong package for system-dep installs.
**Evidence**: Browser download + `--with-deps` (apt) is documented for the `playwright` package; `playwright-core` intentionally omits the driver/installer in some setups. If the runner resolves a core build without the installer, the screen-test step fails on every code-touching PR. Use `playwright` for the install step or pin-verify the core CLI supports `--with-deps` on `ubuntu-latest`.

### 15. [warning] Usage bar geometry misrepresents the values
**Location**: `src/components/discovery/UsageCard.tsx:38-45`, `src/components/discovery/model.ts:614-620`
**Finding**: The two-part bar is a fixed `w-[34%]` free segment plus flex fuel, while `free`/`fuel` fractions are each 0..1 of different denominators.
**Evidence**: `free = dailyLeft/dailyGrant`, `fuel = available/allocation`. Rendering each as `width:%` inside unequal containers means 50% free + 50% fuel do not read as halves, and the 34% split has no relation to free-vs-paid weight. Either normalize to one scale or render two independent gauges. The numeric labels are correct; the bar is decorative but misleading.

### 16. [warning] `held` file chats never evicted
**Location**: `src/components/discovery/use-discovery.ts:184,404-433`
**Finding**: Every opened `fileId` stays in the `held` map for the session.
**Evidence**: Entries are added in `chooseFile`/`openFile` and the staged→committed migration, removed only for uncommitted staging. Committed chats accumulate `Chat` instances, message arrays, and transports. Bounded to three files in the fixture, unbounded against the real port. Evict on close or LRU.
