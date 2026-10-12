# Brief for AI4DEV-250 (UI Design screen design)

Chain: AI4DEV-49 (the product's screens) > AI4DEV-250 (UI Design screen design)
Branch: nirdrang/ai4dev-250-screen-design-ui-design

PRD slice: `loop/out/pure-s6-req-027-036.md`, REQ-036 (shared PRD workspace), the PRD materialize
paragraphs and the Design review section, verbatim:

> **PRD materialize:** closing freezes the evidenced PRD revision and enters this phase before Design. The developer starts materialization. Create the repository PRD, isolated requirements, stable acceptance specifications, coverage maps, decomposition manifests, dependency relations, and build workflow instructions. Acceptance execution starts Not run. Create or update the Linear PM requirements and development plan through the task-management writer. Reuse kickoff-seeded items, preserve requirement links, and derive work from this PRD rather than Discovery. Produce the screen inventory for Design. UI items that require screen review remain dependent on sign-off, which updates the same item. Never mark implementation or tests complete because artifacts were generated.
>
> Track each materialization step and its source revision. Resume partial failures without duplicate issues, files, events, or billed generations. Design opens only after the required package completes. A changed source requires a new revision and completion recommendation. The bootstrap's verified completion requires the passing score, developer close, and completed package. Other PM requirements retain the merge and acceptance evidence rules. Record score, close, materialization, and handoff events. Existing gap-report, gate-pass, and backlog-live notifications use the shared emitter (REQ-016); completion notifications wait for the completed package.
>
> **Design review after PRD materialization:** the platform derives the screen inventory from the materialized PRD and opens the Design workspace. The developer and AI lead each screen review. The NGO joins when the developer asks a screen question. The accepted interface is recorded in `design/design-ui-contract.md`, with the reviewed fixture in `design/astra/design-review-preview.html`.
>
> Only the small screen badges form a horizontal carousel. The selected preview stays in place. Each screen carries a status icon and text: white for Not started, yellow for In progress, orange for Waiting for NGO, and green for Signed off. These are review states, not project lifecycle states.
>
> One human owns the conversation turn. The composer and primary controls use that actor's color, and Send is a round up-arrow icon. Ask NGO and Sign off screen sit below the composer. Ask NGO opens an editable question with the screen and revision attached. Send question & hand over records the question and transfers the turn. The NGO can discuss it with the AI and explicitly hands control back. An answer alone does not transfer control. An unresolved question keeps the screen waiting. The developer applies resolved guidance and reviews the new revision before sign-off.
>
> Sign-off records the current revision and materializes its UI development item (REQ-026). The developer can start Build after one signed-off screen. Other screens can remain in Design. Reopening invalidates the current review approval. Re-signing updates the existing item with the new accepted revision. The NGO cannot sign off, and an older displayed revision cannot receive a new sign-off.
>
> The ai4good backend enforces actor authority and routes agent work through an API. UI code calls edge functions. The project agent edits files and produces preview revisions in its workspace. Its provider and preview connection remain implementation decisions. General element selection and region annotation require a separate design follow-up. The reviewed mock demonstrates fixed anchors and scripted replies only.
>
> **Design acceptance criteria:**
> - [ ] PRD materialization supplies the screen inventory and requirement links. Only badges scroll horizontally; changing the selected screen replaces one stationary preview.
> - [ ] Status labels and icons distinguish all four review states. Long conversations retain actor, screen, and revision context.
> - [ ] Backend authorization enforces the active human turn, draft preservation, explicit NGO handoff and return, and developer-only sign-off.
> - [ ] Ask NGO opens an editable draft. Cancel keeps developer control. Send transfers control and marks the screen Waiting for NGO.
> - [ ] Unresolved NGO questions and stale displayed revisions prevent sign-off of that screen. They do not block unrelated signed-off work.
> - [ ] Sign-off and reopening follow the task-management contract. One signed-off screen can produce workable Build UI while the others remain in Design.
>
> The existing PRD-gate acceptance suite predates these Design criteria. Register the additional cases before closing the production implementation.

Note for the run: the PRD text above still says materialization runs at Close PRD, before
Design. The PRD workspace screen design, on its own unmerged branch
`nirdrang/ai4dev-176-screen-design-prd-workspace-d7l1`, changed that on 2026-10-12: Close PRD
only freezes the PRD, and the planning package is written once, after the last screen is signed
off in UI Design. That branch's `review.md` holds the change. That item is still open and runs in
parallel with this one, by founder choice at pickup.

Item text:

> The screen design stage of the UI Design screen, the step after the PRD in the project's process bar (Intake, Discovery, Volunteer match, PRD, UI Design, Build plan, Build, Handoff). The ui-design skill runs this item.
>
> Where it comes from: the PRD workspace design session (canvas versions 52 to 54, 2026-10-12). There, Close PRD became a freeze only. The workspace shows "PRD closed at revision 15 · UI Design starts from it" with an Open UI Design button, and nothing is written to the board at close. That session named this screen as its own item.
>
> What this screen owns, according to that session:
>
> * It reads its screen list straight from the closed PRD.
> * Each screen is designed and signed off here. A sign-off updates the PRD once.
> * After the last screen is signed off, one job writes the requirements, the board, the acceptance cases and the development items. That job's progress and its Retry belong to this screen.
>
> It makes the screen on a Claude Design canvas from the PRD, in desktop and phone sizes. The canvas is a design, not app code, and this stage commits nothing under src/ or supabase/. The founder changes it in chat, and Codex reviews it as the screen's user until every interaction works. When the founder agrees the screen is complete, it updates the PRD for contract changes and big changes or additions, and it writes the acceptance tests as pending stubs.
>
> Open point: the older post-PRD Design workspace mock in design/astra/ and its approval item cover the same step. Decide at the start whether this item replaces that mock.
>
> Done when: the founder agrees the screen is complete, the canvas copy is in design/canvas/ui-design/project/, and the new acceptance tests are pending stubs.

Acceptance tests: none turn green in this stage. New ids register as pending. REQ-036 has no
suite under `tests/at/suites/` yet.

## The ask
Follow the ui-design skill. It opens the pull request and closes the item.
In the pull request title and body, name no item id except this branch's own.
