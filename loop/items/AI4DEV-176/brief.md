# Brief for AI4DEV-176 (PRD screen design)

Chain: AI4PM-35 (shared PRD workspace) > AI4DEV-49 (all screen designs) > AI4DEV-176 (PRD screen design)
The board parent is AI4DEV-49. The requirement link to AI4PM-35 is recorded here only, by founder answer on 2026-10-08; the board was not moved.
Branch: nirdrang/ai4dev-176-screen-design-prd-workspace-d7l1
Screen: prd-workspace. Requirement: REQ-036. Deliverable: D7 in loop/decomp/req-036.md, `[ui-screen: prd-workspace]`.
Later stages: AI4DEV-215 (PRD screen build, D7.L2) and AI4DEV-174 (PRD screen wiring, D7.L3). The `verify:` field this item fills is on D7.L3.
Contract: design/prd-ui-contract.md. Requirement file: .taskmaster/docs/requirements/req-036.md. Acceptance file: .taskmaster/docs/acceptance/at-req-036.md.
Older visual reference: design/references/prd-grill-me-chat.html. It is scripted and predates topic focus.

PRD slice: loop/out/pure-s6-req-027-036.md, section "REQ-036: Shared PRD Workspace, Completion & Materialization", verbatim:

> #### REQ-036: Shared PRD Workspace, Completion & Materialization
>
> **Description:** After match and funding, the assigned developer turns approved Discovery into a versioned project PRD with AI help. The NGO joins the same conversation when its knowledge or authority is needed. One human owns the turn at a time. The Discovery document remains the need contract and coverage reference; the development plan derives from the completed PRD.
>
> **Technical scope:** the PRD step, not Discovery, produces the technical scope from the confirmed Discovery document: user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large — never dollars) with rationale and start-small advice; risk flags; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split — which parts are built in Lovable and which are coded through Claude Code. v1 always emits both parts (every match requires an Anthropic fuel kickoff) (→ RM-15). The PRD explains maintenance plainly: the NGO evolves the tool by chat for roughly the ~$25/mo Lovable subscription, paid directly, and owns the code; it links Lovable's public pricing where recommended. No project or build cost estimate appears.
>
> **Bootstrap and shared record:** kickoff seeds the PM scope requirements and the Author the project PRD bootstrap item (REQ-026). The developer pulls that item before authoring. Persist the transcript, actor, question dependencies, answer sources, topic states, PRD revisions, and each human's draft. Authoring and scoring consume project USD and record requirement attribution (REQ-006/009/034). The repo receives the versioned PRD. The backend enforces membership and current turn ownership; the inactive human can read but cannot submit AI requests.
>
> **Question flow:** apply Discovery's dependency-first questioning method. Reuse approved facts and obtain accessible technical facts without asking humans to repeat them. Ask ready independent questions together. Ask dependent questions after their prerequisites resolve. Show why a question matters now and provide suggested answers where useful. Keep unknown facts and unresolved choices open. After an answer changes, mark affected dependent decisions and topics Needs review. The AI progresses with the current human across topics until another human's knowledge or authority gates further material progress. Clarifications retain their requirement or project anchor and flow to the Q&A log (REQ-024/010).
>
> **Topic progress and focused chat:** the current PRD panel shows stable topic headings, required-topic progress, source turns, and Open, Draft, Confirmed, or Needs review states. Blockers and the needed human appear separately. Confirmed means current evidence resolves that topic's required decisions and supports its text. Selecting a topic focuses the same chat on its linked messages, decisions, and remaining questions. It preserves ownership, drafts, effort, and cross-topic dependencies. All conversation restores chronological history. Navigation never calls the model or consumes money. Topic completion changes the PRD overview, never development status or whole-PRD completion. Progress counts confirmed required topics, not turns, tokens, or fuel. Record any change to the required topic set.
>
> **Recommendations and actors:** use purple for AI, blue for Dev, and amber for NGO, with written actor names. Colored Dev and NGO bookmarks jump to each actor's last authored turn. Ordinary continuation shows questions with no static continuation button. Only a current AI recommendation to change state exposes an action inline in its reply. Handoff names the reason, grouped questions, and decisions already made. The active human accepts it; ownership transfers once. The other human becomes read-only. NGO questions stay queued while Dev can make useful progress. An answer alone never transfers ownership. Bind recommendations to the current human and PRD and conversation revisions; changed answers invalidate stale actions.
>
> **Effort and spending:** the active human selects Low, Med, High, Xhigh, or Max in the composer for the submitted request only. Med is the initial default. Preserve the submitted effort in history and each human's unsent choice. All PRD model calls use OpenRouter through the backend. Use its reported generation cost for the provider debit, once per generation identifier. Retain the ledger's platform fee separately and preserve fractional cents. Missing cost remains Pending with its reservation until reconciliation; it is not zero. The USD gauge shows this phase's spent, available, and pending funds. Use unrounded consumption: green below 80%, yellow from 80% through 95%, red above 95%. Color does not replace funding checks. There are no PRD free-turn credits. Automatic scoring and materialization use explicit service effort settings, not the composer draft.
>
> **Completion:** the scorer compares the current PRD to the approved Discovery document for the need, agreed answers, open questions, data handling, and constraints, and checks the technical scope for stories with acceptance criteria and both build-split parts. Each run records a score and named gaps. Use the configured threshold; its value and scorer configuration remain pilot decisions. A passing score alone changes no board or authoring state. Only a fresh AI completion recommendation exposes Close PRD, inline with chat. Dev must own the turn and accept it. Require confirmed required topics, no unresolved required decisions or conflicts, and a passing score for that same revision. If NGO owns the turn, recommend return to Dev first. Iteration remains bounded by fuel, not attempt count.
>
> **PRD materialize:** closing freezes the evidenced PRD revision and enters this phase before Design. The developer starts materialization. Create the repository PRD, isolated requirements, stable acceptance specifications, coverage maps, decomposition manifests, dependency relations, and build workflow instructions. Acceptance execution starts Not run. Create or update the Linear PM requirements and development plan through the task-management writer. Reuse kickoff-seeded items, preserve requirement links, and derive work from this PRD rather than Discovery. Produce the screen inventory for Design. UI items that require screen review remain dependent on sign-off, which updates the same item. Never mark implementation or tests complete because artifacts were generated.
>
> Track each materialization step and its source revision. Resume partial failures without duplicate issues, files, events, or billed generations. Design opens only after the required package completes. A changed source requires a new revision and completion recommendation. The bootstrap's verified completion requires the passing score, developer close, and completed package. Other PM requirements retain the merge and acceptance evidence rules. Record score, close, materialization, and handoff events. Existing gap-report, gate-pass, and backlog-live notifications use the shared emitter (REQ-016); completion notifications wait for the completed package.
>
> **Interface and access:** follow `design/prd-ui-contract.md`. This is a private participant workspace; the public page retains the PM-only projection. NGO users can read PRD and materialization progress and answer while active. They cannot close, materialize, override the scorer, or read development board content. UI code calls edge functions and never accesses the database or Linear directly. PRD, PRD materialize, and Design are workspace phases, not new project lifecycle states.
>
> **Acceptance criteria:**
> - [ ] Kickoff preserves the PM seed and empty development tree until authorized PRD materialization.
> - [ ] The PRD carries the technical scope from the confirmed Discovery document, with both build-split parts, a money-free complexity tier, and plain maintenance and pricing guidance.
> - [ ] One active human, shared history, source links, actor bookmarks, and drafts survive reload and handoff.
> - [ ] Question dependencies and semantic recommendations minimize unnecessary actor switches; unknown answers remain open.
> - [ ] The PRD outline shows evidence-based topic state and progress. Topic selection focuses the same chat and preserves its dependencies and owner.
> - [ ] Changed answers reopen affected topics and invalidate stale recommendations without discarding unaffected confirmations.
> - [ ] OpenRouter cost settles once per generation with fee and pending amounts explicit. Composer effort applies only when a request is sent.
> - [ ] The USD gauge follows the exact 80% and 95% boundaries. Read and navigation actions consume no fuel.
> - [ ] Dev-only Close PRD requires the current AI completion recommendation, passing coverage, and resolved required decisions.
> - [ ] Materialization records the frozen revision, produces the ai4good planning package, and resumes failures without duplicate outputs or charges.
> - [ ] Design follows completed materialization. Generated plans do not imply implemented requirements or executed acceptance tests.
> - [ ] NGO and public projections never expose the development tree. Backend authorization rejects inactive humans and stale actions.

The section continues with the post-PRD Design review screen (lines 104 to 122 of the same file). That is a different screen, owned by AI4DEV-177 (Design screen design), and is out of scope here.

Item text:

> The screen design stage of the PRD workspace screen, for REQ-036. The ui-design skill runs this item.
>
> It makes the screen on a Claude Design canvas from the PRD, in desktop and phone sizes. The canvas is a design, not app code, and this stage commits nothing under src/ or supabase/. The founder changes it in chat, and Codex reviews it as the screen's user until every interaction works. When the founder agrees the screen is complete, it updates the PRD for contract changes and big changes or additions, and it writes the acceptance tests. It adds their ids to the `verify:` field of the screen wiring leaf of D7 in the manifest. That field lists the acceptance tests that leaf must turn green.
>
> Done when: the founder agrees the screen is complete, the canvas copy is in design/canvas/prd-workspace/project/, and the new acceptance tests are pending stubs.
> Acceptance tests: none turn green in this stage. New ids register as pending.

Acceptance tests: none turn green here. New ids register as pending stubs under tests/at/suites/req-036/ and are declared pending in tests/at/expected/.

This branch also carries the manifest change that made D7 a three-stage UI screen (loop/decomp/req-036.md). Founder answer on 2026-10-08: convert the item to the three stages. `loop/decomp/check-tree.ps1` passed after the change.

## The ask

Follow the ui-design skill. It opens the pull request and closes the item.
