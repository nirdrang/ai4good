# Brief for AI4DEV-166 (PRD workspace backend and wiring)

Chain: AI4PM-35 (shared PRD workspace requirement) > AI4DEV-166 (PRD workspace backend and wiring)
Branch: nirdrang/ai4dev-166-build-shared-prd-chat-topic-progress-and-materialization
PRD slice: `loop/out/pure-s6-req-027-036.md`, lines 66 to 130, at revision 2087287, verbatim:

#### REQ-036: Shared PRD Workspace, Completion & Materialization

**Description:** After match and funding, the assigned developer turns approved Discovery into a versioned project PRD with AI help. The developer drives the PRD. When the developer needs the NGO's knowledge or authority, the developer posts a question to the NGO, and the NGO crafts the answer with the AI. There are no turns: both humans work at the same time. The Discovery document remains the need contract and coverage reference; the development plan derives from the completed PRD.

**Technical scope:** the PRD step, not Discovery, produces the technical scope from the confirmed Discovery document: user stories with nested acceptance criteria; a suggested stack; a complexity tier (small, medium, or large, never in dollars) with rationale and start-small advice; and risk flags. The technical scope section shows the stories with their nested acceptance criteria, the tier with its rationale and start-small advice, and the risk flags. No project or build cost estimate appears.

**Bootstrap and shared record:** kickoff seeds the PM scope requirements and the Author the project PRD bootstrap item (REQ-026). The developer pulls that item before authoring. Persist the transcript, actor, question dependencies, answer sources, topic states, topic chats, NGO questions with their side chats and answers, PRD revisions, and each human's draft. Authoring and scoring consume project USD and record requirement attribution (REQ-006/009/034). The repo receives the versioned PRD. The backend enforces membership and role authority: only the developer writes in the main chat and topic chats, posts NGO questions, confirms topics, and closes the PRD; the NGO writes only in the side chats of questions posted to it.

**Question flow:** apply Discovery's dependency-first questioning method. Reuse approved facts and obtain accessible technical facts without asking humans to repeat them. Ask ready independent questions together. Ask dependent questions after their prerequisites resolve. Show why a question matters now and provide suggested answers where useful. Keep unknown facts and unresolved choices open. After an answer changes, mark affected dependent decisions and topics Needs review. The AI progresses with the developer across topics. When a decision needs the NGO's knowledge or authority, the AI suggests a question for the NGO, and the developer posts it. Clarifications retain their requirement or project anchor and flow to the Q&A log (REQ-024/010).

**NGO questions:** only the developer posts NGO questions; the NGO never starts one. Each question is blocking or not blocking as the AI suggested it; posting offers no blocking choice. A posted question appears in a question list, and the developer keeps working while it waits. The NGO answers each question in a side chat with the AI, paid from the PRD funds. The AI asks follow-ups there and answers the NGO's questions about it. Mark answer complete is off before the NGO has written anything in the side chat, while the AI's follow-up is unanswered, while the AI is answering, and when the funds cannot pay for the answer. On Mark answer complete, the AI writes one answer from the whole side chat and sends it to the developer at once; the NGO sees what was sent and does not edit a draft during the chat. The developer can view the answer, edit it, and add a note. Use answer is off while the AI is answering and when the funds are short. Use answer posts a brief as the developer's own message in the main chat, with the rows Question, the NGO's answer, I changed it to (when the developer edited the answer), How the answer was reached, What it changes, To discuss (the open point), and My note. Brief and screen copy name each person and never assume a pronoun for them. The AI records the answer in its topic and raises any open point; a note settles the point and is written into the topic. The NGO is told when the developer changed the wording.

**Topic progress and topic chats:** the current PRD panel shows stable topic headings, required-topic progress, and Open, Draft, Ready to confirm, Confirmed, or Needs review states. Blockers and the needed human appear separately. The AI marks a topic Ready to confirm when current evidence resolves its required decisions and supports its text. The developer confirms each topic, and can reopen it, which sets Needs review. Confirm is off until the topic is Ready to confirm or Needs review, while a topic it depends on is not Ready to confirm or Confirmed, and while a completion-check gap on it is open. When confirming would start the completion check, Confirm is also off while the AI is answering and when the funds cannot pay for the check. A topic in Needs review after a change shows one line saying what changed since the developer confirmed it ("Changed since you confirmed: ..."). Each topic has its own lasting chat with the AI, which uses the current PRD and the approved Discovery document as context. Opening a topic shows it as a document at its current revision, with every assimilated decision, its sources, and for the technical scope its user stories; the topic's chat sits below it, and the developer completes the topic there. Sources show as plain names, with no links to source messages. The document does not list the conversation history. The main chat keeps the chronological history across topics and preserves drafts and cross-topic dependencies. Navigation never calls the model or consumes money. Topic completion changes the PRD overview, never development status or whole-PRD completion. Progress counts confirmed required topics, not turns, tokens, or fuel. Record any change to the required topic set.

**Recommendations and actors:** use purple for AI, blue for Dev, and amber for NGO, with written actor names. Ordinary continuation shows questions with no static continuation button. Only a current AI recommendation to change state exposes an action inline in its reply. Every chat queues: in the main chat, each topic chat, and each NGO side chat, a message sent while the AI is answering in that chat waits in a queue and is sent in order, each as its own paid request. A queued plain message can be edited while the input box is empty, and removed until it is sent. A queued Use answer or Close PRD can only be removed. Bind recommendations to the PRD and conversation revisions; changed answers invalidate stale actions.

**Effort and spending:** the composer has no effort selector; each request uses a fixed service setting, which is not decided yet. All PRD model calls use OpenRouter through the backend. Use its reported generation cost for the provider debit, once per generation identifier. Retain the ledger's platform fee separately and preserve fractional cents. Missing cost remains Pending with its reservation until reconciliation; it is not zero. The chat shows no per-reply receipt; provider cost, platform fee, and total stay in the ledger. The USD gauge writes this phase's available and pending funds as text. The bar shows settled spend, with pending spend as a hatched part of it. The color band uses settled spend only, unrounded: green below 80%, yellow from 80% through 95%, red above 95%. Color does not replace funding checks. There are no PRD free-turn credits. Automatic scoring and the planning package use explicit service effort settings.

**Completion:** the scorer compares the current PRD to the approved Discovery document for the need, agreed answers, open questions, data handling, and constraints, and checks the technical scope for stories with nested acceptance criteria. Each run records a score and named gaps. Use the configured threshold; its value and scorer configuration remain pilot decisions. The PRD panel shows the latest score and the threshold as a line, not only inside the AI's message. A passing score alone changes no board or authoring state. The PRD panel lists what is still open: topics ready to confirm, topics waiting on another section, topics still being written, blocking questions not posted or waiting for the NGO, answers to use, and completion-check gaps. Each line opens what it names. The developer can close the PRD at any time, from the PRD panel or from the AI's completion message, with two exceptions: Close PRD is off while the AI is answering in any chat (the screen shows "Wait for the AI to finish."), and when no completion check ran for the current revision and the funds cannot pay for one. Close PRD runs the completion check first, unless a check already ran for the current revision; a check that passed closes the PRD at once, and a check that found gaps shows its result again without a new run. Named gaps, unconfirmed required topics, and open blocking questions are a warning, not a block: the developer chooses Close anyway or Keep working. An open blocking question to the NGO counts as an open point, so it brings up Close anyway and Keep working even after a passing check. Closing anyway records the open points in the closed revision. Iteration remains bounded by fuel, not attempt count.

**After close:** closing freezes the PRD revision and opens UI Design, which takes its screen inventory from the closed PRD. The workspace becomes read-only, and the read-only banner shows for the developer as well as the NGO. Nothing is written to the board at close. After the last screen sign-off in UI Design, one background job writes the planning package once: the repository PRD, isolated requirements, stable acceptance specifications, coverage maps, decomposition manifests, dependency relations, and build workflow instructions, and the Linear PM requirements and development plan through the task-management writer. Its progress, a stop, and Retry show at the end of UI Design. Acceptance execution starts Not run. Reuse kickoff-seeded items, preserve requirement links, and derive work from this PRD rather than Discovery. Never mark implementation or tests complete because artifacts were generated.

Track each step of the job and its source revision. Resume partial failures without duplicate issues, files, events, or billed generations. A changed source requires a new revision. The bootstrap's verified completion requires the developer close and the completed package. Other PM requirements retain the merge and acceptance evidence rules. Record score, close, and package events. The gap-report and backlog-live notifications use the shared emitter (REQ-016); completion notifications wait for the completed package.

**Interface and access:** follow `design/prd-ui-contract.md`. This is a private participant workspace; the public page retains the PM-only projection. NGO users can read the PRD and its progress and answer the questions posted to them. They cannot close, override the scorer, or read development board content. UI code calls edge functions and never accesses the database or Linear directly. PRD and UI Design are workspace phases, not new project lifecycle states.

**Acceptance criteria:**
- [ ] Kickoff preserves the PM seed and empty development tree until the planning package is written after UI Design.
- [ ] The PRD carries the technical scope from the confirmed Discovery document: user stories with nested acceptance criteria, a suggested stack, a money-free complexity tier with rationale and start-small advice, and risk flags, all shown in the technical scope section.
- [ ] Both humans work at the same time with no turn ownership. Shared history, topic chats, NGO side chats, and drafts survive reload. Sources show as plain names.
- [ ] Only the developer posts NGO questions, with no blocking choice at posting, and question dependencies keep them to decisions that need the NGO; unknown answers remain open.
- [ ] The NGO cannot mark an answer complete before writing in the side chat or while the AI's follow-up is unanswered. On completion the AI writes the answer and sends it; the developer can view, edit, note, and use it, which posts a brief with pronoun-free rows and records the answer in its topic.
- [ ] The PRD outline shows topic state and progress. The AI proposes Ready to confirm; only the developer confirms or reopens a topic, and Confirm is off in the named cases. Each topic opens as its current document with its own lasting chat.
- [ ] Changed answers reopen affected topics, show what changed since the developer confirmed, and invalidate stale recommendations without discarding unaffected confirmations.
- [ ] OpenRouter cost settles once per generation with fee and pending amounts explicit in the ledger. The chat shows no per-reply receipt and the composer has no effort selector.
- [ ] The USD gauge writes available and pending funds as text. Its color band uses settled spend only and follows the exact 80% and 95% boundaries. Read and navigation actions consume no fuel.
- [ ] In every chat, messages sent while the AI answers queue in order. A queued plain message stays editable while the input box is empty; a queued Use answer or Close PRD can only be removed.
- [ ] Dev-only Close PRD is available at any time, except while the AI is answering in any chat and when no check is current and the funds cannot pay for one. It runs the completion check first unless one already ran for the current revision; gaps, unconfirmed topics, and open blocking questions warn without blocking, and closing anyway records them as open.
- [ ] The PRD panel shows the latest completion-check score and the threshold as a line.
- [ ] Close freezes the revision and opens UI Design, and the read-only banner shows for both humans. The planning package is written once after the last screen sign-off, records the frozen revision, and resumes failures without duplicate outputs or charges.
- [ ] Generated plans do not imply implemented requirements or executed acceptance tests.
- [ ] NGO and public projections never expose the development tree. Backend authorization rejects actions outside each role and stale actions.

**Design review after PRD close:** the platform derives the screen inventory from the closed PRD and opens the UI Design workspace. The developer and AI lead each screen review. The NGO joins when the developer asks a screen question. The accepted interface is recorded in `design/design-ui-contract.md`, with the reviewed fixture in `design/astra/design-review-preview.html`.

Only the small screen badges form a horizontal carousel. The selected preview stays in place. Each screen carries a status icon and text: white for Not started, yellow for In progress, orange for Waiting for NGO, and green for Signed off. These are review states, not project lifecycle states.

One human owns the conversation turn. The composer and primary controls use that actor's color, and Send is a round up-arrow icon. Ask NGO and Sign off screen sit below the composer. Ask NGO opens an editable question with the screen and revision attached. Send question & hand over records the question and transfers the turn. The NGO can discuss it with the AI and explicitly hands control back. An answer alone does not transfer control. An unresolved question keeps the screen waiting. The developer applies resolved guidance and reviews the new revision before sign-off.

Sign-off records the current revision and materializes its UI development item (REQ-026). The developer can start Build after one signed-off screen. Other screens can remain in Design. Reopening invalidates the current review approval. Re-signing updates the existing item with the new accepted revision. The NGO cannot sign off, and an older displayed revision cannot receive a new sign-off.

The ai4good backend enforces actor authority and routes agent work through an API. UI code calls edge functions. The project agent edits files and produces preview revisions in its workspace. Its provider and preview connection remain implementation decisions. General element selection and region annotation require a separate design follow-up. The reviewed mock demonstrates fixed anchors and scripted replies only.

**Design acceptance criteria:**
- [ ] The closed PRD supplies the screen inventory and requirement links. Only badges scroll horizontally; changing the selected screen replaces one stationary preview.
- [ ] Status labels and icons distinguish all four review states. Long conversations retain actor, screen, and revision context.
- [ ] Backend authorization enforces the active human turn, draft preservation, explicit NGO handoff and return, and developer-only sign-off.
- [ ] Ask NGO opens an editable draft. Cancel keeps developer control. Send transfers control and marks the screen Waiting for NGO.
- [ ] Unresolved NGO questions and stale displayed revisions prevent sign-off of that screen. They do not block unrelated signed-off work.
- [ ] Sign-off and reopening follow the task-management contract. One signed-off screen can produce workable Build UI while the others remain in Design.

The existing PRD-gate acceptance suite predates these Design criteria. Register the additional cases before closing the production implementation.

**Dependencies:** REQ-004, REQ-024, REQ-026, REQ-034, REQ-009.


Item text:

The PRD workspace for REQ-036, built to the approved and built screen (decisions d97, d98, d99).

The developer drives and there are no turns or handovers. Each section has its own chat, and only the developer posts questions to the NGO, who answers each in a side chat with the AI. The composer has no effort selector. Close PRD is available at any time and reuses a check that already ran for the current revision. Close freezes the revision and opens UI Design. The planning package is written once after the last UI Design screen sign-off (AI4DEV-164), never at close.

**Run structure (founder, 2026-10-22):** one parent run. The open children are the units, in blocked-by order, with screen wiring last; a child blocked only by an earlier unit of the same run counts as ready. One branch and one pull request.

Units: AI4DEV-167 (shared PRD record), AI4DEV-231 (technical scope section), AI4DEV-168 (question order), AI4DEV-169 (roles and permissions), AI4DEV-170 (section states and chats), AI4DEV-171 (OpenRouter costs), AI4DEV-172 (completion check), AI4DEV-173 (Close PRD), AI4DEV-174 (screen wiring). Done: AI4DEV-176 (screen design), AI4DEV-215 (screen build).

Canonical sources:

* loop/decomp/req-036.md
* .taskmaster/docs/acceptance/at-req-036.md
* design/prd-ui-contract.md
* design/change-orders/016-prd-follows-the-built-screen.md
* design/canvas/prd-workspace/

AI4DEV-161 (Design workspace) keeps the later UI Design work.

Acceptance tests: `tests/at/suites/req-036/` (all eighteen cases, AT-036.01 to .18) with the expected-result manifest `tests/at/expected/req-036.json`. At the start of the run all eighteen are green at the loop tier; at the integration tier 11 and 12 are green and the other sixteen are pending.

Run facts (founder rulings, 2026-10-22):
- The first commit on this branch, 2087287, is the doc change set for decision d99 (change order 016). It is done; build to it.
- AI4DEV-250 (UI Design screen design) is also open on this machine. The founder allowed both to stay open ("Both stay open"); it does not use the local database.
- Lovable is removed only from REQ-036 here. Removing it from the other requirements is a separate item the founder files; do not touch Lovable outside REQ-036 and the PRD screen.
- The AI path is open. The founder leans towards hosted agents instead of OpenRouter (2026-10-22: "I mean something like Claude managed agents"). Build units 1 to 5 behind one provider-neutral boundary for AI calls. Before unit 6 (OpenRouter costs) and before the model part of unit 9, stop at the gate and ask the founder for the AI path decision. REQ-036 and unit 6 still say OpenRouter until that decision is recorded.
- The code still produces the build split (`scope.ts`, its Discovery skill and `scope.test.ts`) and still lists the `prd_gate.passed` notification (`notification-taxonomy.ts` and the req-016 test copy). Units 2 and 9 change them.

## Units

### Unit 1: AI4DEV-167 (shared PRD record)
Item text: Seed and version the PRD from the approved Discovery revision the first time the developer opens the PRD workspace, which is also when Discovery freezes (REQ-004). Keep the pulled bootstrap, the main chat, every section chat, every NGO side chat, actors, drafts, and plain-name sources across reload. The development tree stays empty until the planning package.

**Verify:** AT-036.01, AT-036.02
**Blocked by:** cross-manifest: REQ-026 workspace seeding and pull contracts.
**Manifest:** `loop/decomp/req-036.md`, deliverable D1 leaf L1, revision `2087287`. Decision d99 (the PRD follows the built PRD workspace screen; no turns, no handovers).
Acceptance tests: `tests/at/suites/req-036/` cases 01 and 02.

### Unit 2: AI4DEV-231 (technical scope section)
Item text: The PRD step produces the technical scope from the confirmed Discovery document (d94): user stories with nested acceptance criteria, a suggested stack, a money-free complexity tier with rationale and start-small advice, and risk flags. No Lovable recommendation and no build split (d99). It reuses the scope generator that leaves Discovery; the generator and its test still produce the build split and must change here. The screen's Technical scope section shows the nested criteria, tier rationale and risks (screen wiring adds them).

The generator and its rendering were built under REQ-004 as AI4DEV-145 and AI4DEV-146 (both Done). AI4DEV-178 (Done) was to move the shipped generator with the Discovery screen work, so check what already moved before building.

**Verify:** AT-036.11, AT-036.12
**Blocked by:** D1.L1 (AI4DEV-167); cross-manifest: the REQ-004 D7 transition that moves the generator out of Discovery.
**Manifest:** `loop/decomp/req-036.md`, deliverable D1 leaf L2, revision `2087287`. Decisions d94, d99.
Acceptance tests: `tests/at/suites/req-036/` cases 11 and 12.

### Unit 3: AI4DEV-168 (question order)
Item text: Choose dependency-ready questions, reuse approved facts, keep unknowns open, and ask ready independent questions together. When a decision needs the NGO, the AI suggests a question for the NGO, blocking or not, which only the developer posts. In the NGO side chat the AI asks follow-ups, records an open follow-up as an outcome, writes the answer at Mark answer complete, and records a used answer in its section.

**Verify:** AT-036.03
**Blocked by:** D1.L1 (AI4DEV-167).
**Manifest:** `loop/decomp/req-036.md`, deliverable D2 leaf L1, revision `2087287`. Decision d99.
Acceptance tests: `tests/at/suites/req-036/` case 03.

### Unit 4: AI4DEV-169 (roles and permissions)
Item text: The backend decides who may post, answer, confirm, and close. Only the developer writes in the main chat and section chats, posts NGO questions, uses answers, confirms or reopens sections, and closes. The NGO writes only in the side chats of questions posted to it and marks those answers complete. Unrelated users can neither read nor write. Stale tabs, replayed actions, and simultaneous sends are refused against the conversation and PRD revisions.

**Verify:** AT-036.09
**Blocked by:** D1.L1 (AI4DEV-167), D2.L1 (AI4DEV-168).
**Manifest:** `loop/decomp/req-036.md`, deliverable D2 leaf L2, revision `2087287`. Decision d99.
Acceptance tests: `tests/at/suites/req-036/` case 09.

### Unit 5: AI4DEV-170 (section states and chats)
Item text: Evidence-based states (Open, Draft, Ready to confirm, Confirmed, Needs review) and required-section progress. The AI proposes Ready to confirm and the developer confirms or reopens, with Confirm off in the cases REQ-036 names. A changed decision sends affected dependents to Needs review with the "Changed since you confirmed" line. Each section has its own lasting chat with the current PRD and approved Discovery as context. The PRD panel's still-open list: each line opens what it names.

**Verify:** AT-036.08
**Blocked by:** D1.L1 (AI4DEV-167), D2.L1 (AI4DEV-168).
**Manifest:** `loop/decomp/req-036.md`, deliverable D3 leaf L1, revision `2087287`. Decision d99.
Acceptance tests: `tests/at/suites/req-036/` case 08.

### Unit 6: AI4DEV-171 (OpenRouter costs)
Item text: Every PRD model call (main, section, and side chats, the completion check, and the planning package) goes through OpenRouter from an edge function. Reserve before the call, settle the reported generation cost once per generation identifier, keep missing cost pending, and keep the platform fee and fractional cents. No effort selector; fixed service settings. The gauge band comes from settled spend, with pending spend as text and a hatched part of the bar.

**Verify:** AT-036.05, AT-036.07
**Blocked by:** D1.L1 (AI4DEV-167); cross-manifest: REQ-006 ledger and REQ-009 authorized provider dispatch.
**Manifest:** `loop/decomp/req-036.md`, deliverable D4 leaf L1, revision `2087287`. Decision d99.
Acceptance tests: `tests/at/suites/req-036/` cases 05 and 07.

### Unit 7: AI4DEV-172 (completion check)
Item text: Score the current revision against approved Discovery (need, agreed answers, open questions, data handling, constraints, and stories with nested criteria). Record the score, threshold, and named gaps, and send each gap's section to Needs review. Run when all required sections are confirmed or when Close PRD is pressed, and reuse a check that already ran for the current revision with no new model call (d98). A passing score changes no board state.

**Verify:** AT-036.04
**Blocked by:** D2.L1 (AI4DEV-168), D3.L1 (AI4DEV-170), D4.L1 (AI4DEV-171).
**Manifest:** `loop/decomp/req-036.md`, deliverable D5 leaf L1, revision `2087287`. Decisions d98, d99.
Acceptance tests: `tests/at/suites/req-036/` case 04.

### Unit 8: AI4DEV-173 (Close PRD)
Item text: Developer-only Close PRD at any time, except while the AI is answering in any chat and when no check is current and the funds cannot pay for one. Gaps, unconfirmed sections, and open blocking questions warn with Close anyway and Keep working. Closing freezes the revision, records the open points, makes the workspace read-only for both humans, and hands the closed revision to UI Design as its screen inventory source. Nothing is written to the board at close.

The planning package is not built here: it moved to AI4DEV-164 (sign-off into Build), written once after the last UI Design screen sign-off. AT-036.06 stays registered here and proves the close half; its package half gets evidence once AI4DEV-164 lands.

**Verify:** AT-036.06
**Blocked by:** D2.L2 (AI4DEV-169), D4.L1 (AI4DEV-171), D5.L1 (AI4DEV-172).
**Manifest:** `loop/decomp/req-036.md`, deliverable D6 leaf L1, revision `2087287`. Decision d99.
Acceptance tests: `tests/at/suites/req-036/` case 06.

### Unit 9: AI4DEV-174 (screen wiring)
Item text: The screen wiring stage of the PRD workspace screen, for REQ-036. poteto-mode runs this item, with its feature playbook and these steps.

1. Write the edge functions and the migrations the screen needs, on the local database.
2. Replace the sample-data transport with the real one. Keep the screen components and the screen tests fixed, except for the changes listed below.
3. Run `bun run at:verify req-036 --tier integration --expect`. The screen's acceptance tests are in this leaf's `verify:` field, so they must pass here.
4. Teach the verify-ai4good skill the new screen. Add or update one file in .claude/skills/verify-ai4good/features/ for the screen, and one for each new edge function. Each file says what the feature is, how to reach it, how to drive it, and what end state proves it works, as features/README.md says. Add a row for each file to the table in features/README.md. If the screen needs prepared data, add a script in .claude/skills/verify-ai4good/scripts/.
5. Use the verify-ai4good skill to drive the real screen through the new feature file, and capture the evidence.
6. Remove or move each test that the screen design stage marked to retire.

Connect the main chat, section chats, NGO question side chats, Close PRD, the read-only state, inline actions, and the gap-report and backlog-live notifications. Model calls go through OpenRouter in production, using the AI SDK as planned in design/canvas/prd-workspace/review.md; an environment setting may pick another provider for development and tests only.

**Screen changes allowed here (change order 016, decision d99):** the queue in every chat, the warning for open blocking questions at close, the technical scope details (nested criteria, tier rationale and start-small advice, risk flags), the completion-check score line on the PRD panel, pronoun-free copy, and the sample-data stack and build-split lines that name Lovable.

Done when: the screen's acceptance tests pass at the integration tier, the verify-ai4good feature map lists the screen, and its evidence is in the pull request.

**Verify:** AT-036.10, 13, 14, 15, 16, 17, 18
**Blocked by:** D7.L2 (AI4DEV-215, Done), D2.L2 (AI4DEV-169), D3.L1 (AI4DEV-170), D4.L1 (AI4DEV-171), D6.L1 (AI4DEV-173).
**Manifest:** `loop/decomp/req-036.md`, deliverable D7 leaf L3, revision `2087287`.
Acceptance tests: `tests/at/suites/req-036/` cases 10 and 13 to 18, plus the wired re-run of the UI-bearing cases.

## The ask
Run this item in poteto-mode and open one pull request from this branch. One pull request is
a project rule; it overrides the playbook's preference for narrow pull requests.
If the brief has Units, design once for the whole subtree, then build the units in order, one
commit group per unit.
At every unit boundary, after the unit's commit is on the branch and the resume note is
rewritten, stop at a gate opened with the `AskUserQuestion` tool, never as prose. Ask one
question with three options, labelled exactly `Continue`, `Run /compact` and `Fast compact`,
and put in its text what the unit landed, its commit, and the remaining context budget. Always
state in the question text and in the `Fast compact` option's description whether the
`self-compact-gate` plugin is loaded in this session: loaded when an earlier gate answer in this
session began with the plugin's "Context now:" prefix, not loaded when a check showed it absent,
otherwise not known yet. Ask a second question for any decision the next unit needs from the
founder. If the answer is `Continue`, start the next unit. If the answer is either compact
option, make sure the resume note holds the second answer, then end the turn and start nothing.
For `Fast compact`, the answer itself proves the plugin's state: it begins with "Context now:"
only when the plugin is loaded. Say in one line which holds: "The fast compact plugin is loaded:
it compacts now and starts the next unit." or "The fast compact plugin is not loaded in this
session, so nothing will compact: type /compact." For `Run /compact`, say "Type /compact."
Send lookups that do not depend on each other together in one message. Each message is one
step, and each step re-reads the whole conversation.
Send a question whose answer is a fact or a short list to a subagent: where something is,
which files use something, what a value is. Write it as facts to locate, and ask for
`file:line` references with the key lines verbatim. Read the exact lines yourself before you
edit them.
In the design arena, give every runner a distinct structural direction.
In the pull request title and body, name no item id except this branch's own, and name each
unit by its short label in words.
Then close the item as the Closing section says.

## Closing (the git part is yours, the board is not)
1. Wait for CI to be green on the exact head of the pull request, and for the founder to
   say "merge". Both, never one.
2. Hand the git mechanics to the `mechanical` agent with exact commands. You decide, it
   types: `gh pr merge <n> --squash`. The merge closes the item on the board through the
   pull request link. Never touch the board yourself. Delete no branch and no worktree: the
   founder keeps merged branches for reflection, and deletes by name when they choose
   (founder 2026-09-06).
3. Leave the worktree with `ExitWorktree(action: "keep")`.
4. Invoke `/controller done AI4DEV-166`. That skill does the board steering. Do not do it
   yourself.

## The evidence bar
- The verify suite for the acceptance tests above passes on the final head, run as background
  shell commands. Name each check, its exit code, its counts and its timestamp in the
  Verification section.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- One database, the stack `supabase/config.toml` describes, local and cloud alike. Start it
  with `bun run db:start`; every integration run resets it.
- codex needs `codex login --device-auth` once per fresh VM. The session banner says when.
- The `mechanical` agent takes tool-heavy work that needs no judgment: the rebase into
  ordered commits, the verify-ai4good drive, and the merge commands. Give it exact
  instructions and check its result once. Spawn it with no `model` parameter; its definition
  owns the model. Do not use a fork for this, because a fork runs on your own model.
- Run the acceptance suite yourself, never in a lane:
  `bun run at:verify <req> --tier integration --expect` as background shell commands that
  write to a file. Read back only the exit code and the green and red counts. CI runs only
  the loop tier. A lane costs about eighty thousand tokens whatever it runs; ten verification
  lanes once cost 746k tokens for thirty minutes of commands.
- The verify skill for this project is `verify-ai4good`, not the built-in verify.
- Spawn the comment audit with `subagent_type: "pstack:comment-sicko", model: "sonnet"`. It
  is the one helper you spawn with a model parameter, because its definition pins none and
  would otherwise run on your model.
- A writer that dies after finishing its work is recovered by running the pin and committing
  the finished tree, not by rerunning the writer.
