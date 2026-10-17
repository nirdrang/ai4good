# Brief for AI4DEV-215 (PRD screen build)

Chain: AI4PM-35 (shared PRD workspace) > AI4DEV-166 (shared PRD chat build) > AI4DEV-215 (PRD screen build)
Branch: nirdrang/ai4dev-215-screen-build-prd-workspace-d7l2
Screen: prd-workspace. Requirement: REQ-036. Deliverable: D7 in loop/decomp/req-036.md, `[ui-screen: prd-workspace]`, leaf L2.
Earlier stage: AI4DEV-176 (PRD screen design), merged in 36503ce. Its outputs: the canvas copy in design/canvas/prd-workspace/project/, the review record design/canvas/prd-workspace/review.md, the contract design/prd-ui-contract.md, and the acceptance file .taskmaster/docs/acceptance/at-req-036.md.
Later stage: AI4DEV-174 (PRD screen wiring, D7.L3). Its `verify:` field in the manifest names AT-036.10,13,14,15,16,17,18. The model route for that stage (AI SDK, provider by environment setting: Codex CLI with luna for development and tests, OpenRouter in production) is in the review record, section "Plan for screen wiring". This build does not wire it, but the chat transport it builds must fit that plan: `useChat` from `@ai-sdk/react` over a transport the edge function replaces.

PRD slice: loop/out/pure-s6-req-027-036.md, section "REQ-036: Shared PRD Workspace, Completion & Materialization", verbatim:

#### REQ-036: Shared PRD Workspace, Completion & Materialization

**Description:** After match and funding, the assigned developer turns approved Discovery into a versioned project PRD with AI help. The developer drives the PRD. When the developer needs the NGO's knowledge or authority, the developer posts a question to the NGO, and the NGO crafts the answer with the AI. There are no turns: both humans work at the same time. The Discovery document remains the need contract and coverage reference; the development plan derives from the completed PRD.

**Technical scope:** the PRD step, not Discovery, produces the technical scope from the confirmed Discovery document: user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large — never dollars) with rationale and start-small advice; risk flags; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split — which parts are built in Lovable and which are coded through Claude Code. v1 always emits both parts (every match requires an Anthropic fuel kickoff) (→ RM-15). The PRD explains maintenance plainly: the NGO evolves the tool by chat for roughly the ~$25/mo Lovable subscription, paid directly, and owns the code; it links Lovable's public pricing where recommended. No project or build cost estimate appears.

**Bootstrap and shared record:** kickoff seeds the PM scope requirements and the Author the project PRD bootstrap item (REQ-026). The developer pulls that item before authoring. Persist the transcript, actor, question dependencies, answer sources, topic states, topic chats, NGO questions with their side chats and answers, PRD revisions, and each human's draft. Authoring and scoring consume project USD and record requirement attribution (REQ-006/009/034). The repo receives the versioned PRD. The backend enforces membership and role authority: only the developer writes in the main chat and topic chats, posts NGO questions, confirms topics, and closes the PRD; the NGO writes only in the side chats of questions posted to it.

**Question flow:** apply Discovery's dependency-first questioning method. Reuse approved facts and obtain accessible technical facts without asking humans to repeat them. Ask ready independent questions together. Ask dependent questions after their prerequisites resolve. Show why a question matters now and provide suggested answers where useful. Keep unknown facts and unresolved choices open. After an answer changes, mark affected dependent decisions and topics Needs review. The AI progresses with the developer across topics. When a decision needs the NGO's knowledge or authority, the AI suggests a question for the NGO, and the developer posts it. Clarifications retain their requirement or project anchor and flow to the Q&A log (REQ-024/010).

**NGO questions:** only the developer posts NGO questions; the NGO never starts one. Each posted question is marked blocking or not blocking and appears in a question list, and the developer keeps working while it waits. The NGO answers each question in a side chat with the AI, paid from the PRD funds. The AI asks follow-ups there and answers the NGO's questions about it. The NGO cannot mark the answer complete while the AI's follow-up is unanswered. On Mark answer complete, the AI writes one answer from the whole side chat and sends it to the developer at once; the NGO sees what was sent and does not edit a draft during the chat. The developer can view the answer, edit it, and add a note. Use answer posts a brief (question, answer, PRD impact, open points) as the developer's own message in the main chat. The AI records the answer in its topic and raises any open point; a note settles the point and is written into the topic. The NGO is told when the developer changed the wording.

**Topic progress and topic chats:** the current PRD panel shows stable topic headings, required-topic progress, source turns, and Open, Draft, Ready to confirm, Confirmed, or Needs review states. Blockers and the needed human appear separately. The AI marks a topic Ready to confirm when current evidence resolves its required decisions and supports its text. The developer confirms each topic, and can reopen it, which sets Needs review. Each topic has its own lasting chat with the AI, which uses the current PRD and the approved Discovery document as context. Opening a topic shows it as a document at its current revision, with every assimilated decision, its sources, and for the technical scope its user stories; the topic's chat sits below it, and the developer completes the topic there. The document does not list the conversation history. The main chat keeps the chronological history across topics and preserves drafts and cross-topic dependencies. Navigation never calls the model or consumes money. Topic completion changes the PRD overview, never development status or whole-PRD completion. Progress counts confirmed required topics, not turns, tokens, or fuel. Record any change to the required topic set.

**Recommendations and actors:** use purple for AI, blue for Dev, and amber for NGO, with written actor names. Ordinary continuation shows questions with no static continuation button. Only a current AI recommendation to change state exposes an action inline in its reply. Messages the developer sends while the AI is answering are queued and sent in order, each as its own paid request; a queued message can be edited or removed until it is sent. Bind recommendations to the PRD and conversation revisions; changed answers invalidate stale actions.

**Effort and spending:** the composer has no effort selector; each request uses a fixed service setting, which is not decided yet. All PRD model calls use OpenRouter through the backend. Use its reported generation cost for the provider debit, once per generation identifier. Retain the ledger's platform fee separately and preserve fractional cents. Missing cost remains Pending with its reservation until reconciliation; it is not zero. The chat shows no per-reply receipt; provider cost, platform fee, and total stay in the ledger. The USD gauge writes this phase's available and pending funds and shows spent as the bar. Use unrounded consumption: green below 80%, yellow from 80% through 95%, red above 95%. Color does not replace funding checks. There are no PRD free-turn credits. Automatic scoring and the planning package use explicit service effort settings.

**Completion:** the scorer compares the current PRD to the approved Discovery document for the need, agreed answers, open questions, data handling, and constraints, and checks the technical scope for stories with acceptance criteria and both build-split parts. Each run records a score and named gaps. Use the configured threshold; its value and scorer configuration remain pilot decisions. A passing score alone changes no board or authoring state. The PRD panel lists what is still open. The developer can close the PRD at any time, from the PRD panel or from the AI's completion message. Close PRD runs the completion check first, unless it already passed for the current revision. Named gaps, unconfirmed required topics, and open blocking questions are a warning, not a block: the developer chooses Close anyway or Keep working. Closing anyway records them as open in the closed revision. Iteration remains bounded by fuel, not attempt count.

**After close:** closing freezes the PRD revision and opens UI Design, which takes its screen inventory from the closed PRD. Nothing is written to the board at close. After the last screen sign-off in UI Design, one background job writes the planning package once: the repository PRD, isolated requirements, stable acceptance specifications, coverage maps, decomposition manifests, dependency relations, and build workflow instructions, and the Linear PM requirements and development plan through the task-management writer. Its progress, a stop, and Retry show at the end of UI Design. Acceptance execution starts Not run. Reuse kickoff-seeded items, preserve requirement links, and derive work from this PRD rather than Discovery. Never mark implementation or tests complete because artifacts were generated.

Track each step of the job and its source revision. Resume partial failures without duplicate issues, files, events, or billed generations. A changed source requires a new revision. The bootstrap's verified completion requires the developer close and the completed package. Other PM requirements retain the merge and acceptance evidence rules. Record score, close, and package events. Existing gap-report, gate-pass, and backlog-live notifications use the shared emitter (REQ-016); completion notifications wait for the completed package.

**Interface and access:** follow `design/prd-ui-contract.md`. This is a private participant workspace; the public page retains the PM-only projection. NGO users can read the PRD and its progress and answer the questions posted to them. They cannot close, override the scorer, or read development board content. UI code calls edge functions and never accesses the database or Linear directly. PRD and UI Design are workspace phases, not new project lifecycle states.

**Acceptance criteria:**
- [ ] Kickoff preserves the PM seed and empty development tree until the planning package is written after UI Design.
- [ ] The PRD carries the technical scope from the confirmed Discovery document, with both build-split parts, a money-free complexity tier, and plain maintenance and pricing guidance.
- [ ] Both humans work at the same time with no turn ownership. Shared history, source links, topic chats, NGO side chats, and drafts survive reload.
- [ ] Only the developer posts NGO questions, and question dependencies keep them to decisions that need the NGO; unknown answers remain open.
- [ ] The NGO cannot mark an answer complete while the AI's follow-up is unanswered. On completion the AI writes the answer and sends it; the developer can view, edit, note, and use it, which posts a brief and records the answer in its topic.
- [ ] The PRD outline shows topic state and progress. The AI proposes Ready to confirm; only the developer confirms or reopens a topic. Each topic opens as its current document with its own lasting chat.
- [ ] Changed answers reopen affected topics and invalidate stale recommendations without discarding unaffected confirmations.
- [ ] OpenRouter cost settles once per generation with fee and pending amounts explicit in the ledger. The chat shows no per-reply receipt and the composer has no effort selector.
- [ ] The USD gauge writes available and pending funds and follows the exact 80% and 95% boundaries. Read and navigation actions consume no fuel.
- [ ] Messages sent while the AI answers queue in order and stay editable until sent.
- [ ] Dev-only Close PRD is available at any time. It runs the completion check first; gaps and unconfirmed topics warn without blocking, and closing anyway records them as open.
- [ ] Close freezes the revision and opens UI Design. The planning package is written once after the last screen sign-off, records the frozen revision, and resumes failures without duplicate outputs or charges.
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

The screen build stage of the PRD workspace screen, for REQ-036. poteto-mode runs this item, with its feature playbook and these steps.

1. Read the canvas copy in design/canvas/prd-workspace/project/ and the review record design/canvas/prd-workspace/review.md. Serve the copy locally and use every board once, as .claude/skills/ui-design/codex-review.md says.
2. Build the real components in src/components/prd-workspace/, with the app's own UI stack: the code that ships, not a mock. That means TanStack Start routes, shadcn/ui components, Tailwind with the tokens in src/styles.css, and the Vercel AI SDK (`useChat` from `@ai-sdk/react`) for chat. Only the data is a mock: sample data comes through a fixture transport, which stands where the edge functions will be. Match the canvas copy board by board, and build any viewport that the review record moves to this stage. The canvas copy is a specification of what the screen shows and does, not source to paste: rebuild each part in the app's stack, and carry over no canvas comment, class name, inline style, or fixture shortcut. Copy only the data-testid handles.
3. Put only the sample-data transport and the sample data in design/astra/. The shell there imports the real components. No screen logic lives in design/astra/.
4. The UI never calls the database directly. It reads and writes through the transport, which becomes an edge function in screen wiring.
5. Bind the screen tests to the data-testid handles on the canvas copy, so that the same test file runs on the sample-data shell and on the real route.
6. Run `bun run at:verify req-036 --tier loop --expect` until the screen's pending acceptance tests are green at the loop tier.
7. Run the Codex review on the running sample-data shell, with the prompt, the model, and the command in .claude/skills/ui-design/codex-review.md and the persona and tasks in the review record. Start Codex directly, not through provider dispatch. Fix each interaction that does not work, and run both checks again until the tests are green and the review ends with ALL WORKS. Bring the usability hints to the founder.
8. Run the comment audit over the diff and also over each file under src/ that the screen imports and this diff does not change. A comment that an earlier stage left in such a file is in scope.

Done when: the pending acceptance tests are green at the loop tier, the Codex review ends with ALL WORKS, and the founder has answered each usability hint.

Acceptance tests: tests/at/suites/req-036/ (pending.test.ts holds the screen's pending cases; the manifest is tests/at/expected/req-036.json). The cases this stage turns green at the loop tier are the UI-bearing ones the review record binds to the canvas `data-testid` handles: AT-036.01 to 10 as amended, and 13 to 18.

## The ask
Run this item in poteto-mode and open one pull request from this branch. One pull request is
a project rule; it overrides the playbook's preference for narrow pull requests.
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
4. Invoke `/controller done AI4DEV-215`. That skill does the board steering. Do not do it
   yourself.

## The evidence bar
- The verify suite for the acceptance tests above passes on the final head, run as background
  shell commands. Name each check, its exit code, its counts and its timestamp in the
  Verification section.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- One database, the stack `supabase/config.toml` describes, local and cloud alike. Start it
  with `bun run db:start`; every integration run resets it. This stage runs the loop tier only
  and needs no database.
- codex needs `codex login --device-auth` once per fresh VM. The session banner says when.
- The `mechanical` agent takes tool-heavy work that needs no judgment: the rebase into
  ordered commits, the verify-ai4good drive, and the merge commands. Give it exact
  instructions and check its result once. Spawn it with no `model` parameter; its definition
  owns the model. Do not use a fork for this, because a fork runs on your own model.
- Run the acceptance suite yourself, never in a lane:
  `bun run at:verify req-036 --tier loop --expect` as background shell commands that
  write to a file. Read back only the exit code and the green and red counts. CI runs only
  the loop tier. A lane costs about eighty thousand tokens whatever it runs; ten verification
  lanes once cost 746k tokens for thirty minutes of commands.
- The verify skill for this project is `verify-ai4good`, not the built-in verify.
- Spawn the comment audit with `subagent_type: "pstack:comment-sicko", model: "sonnet"`. It
  is the one helper you spawn with a model parameter, because its definition pins none and
  would otherwise run on your model.
- A writer that dies after finishing its work is recovered by running the pin and committing
  the finished tree, not by rerunning the writer.
