# Discovery design review — revision 12

Date: 2026-09-29. Author: Claude, on revision 11. Status: approved by the founder for desktop on 2026-09-29; the shared mock shows revision 12 on fixtures since 2026-10-01 (see "Revision 12 built on fixtures").

Open [the Discovery fixture](http://127.0.0.1:4310/#discovery).
This review covers Discovery and its scope confirmation. Other screens retain their own review status.
The process bar belongs to the shared project workspace. It displays progress and cannot approve a gate.

AI4DEV-175 (Discovery screen design) owns this review, under AI4DEV-9 (design batch 2 screens).
AI4DEV-158 (Discovery interface wiring) owns the later production interface.
The specification remains [the Discovery interface contract](../discovery-ui-contract.md).

## Review sequence

1. Type a message in the chat or select a suggested answer. Check both participants in the transcript.
2. Try a custom answer or uncertainty. Check the live brief and dependent questions.
3. Complete the data and maintenance questions. Open the scope review.
4. Check the scope details and NGO acknowledgment. Confirm the sample brief.
5. Edit an earlier answer. Check that approval clears and dependent answers need review.
6. Open **Astra · fixture mock** to inspect funding, failure, decline, and reference-file states.

The sample confirmation button records a fictional NGO decision. It does not approve this design.
The founder approved revision 12 for desktop on 2026-09-29.

## Revision 12: the need brief, the file chat, and Finish without generation

Author: Claude. The founder reviewed this revision live on the Claude Design canvas "Discovery brief side panel"
(https://claude.ai/artifact/QuVKgGycBLMMhWVXUwX4e6), boards Interview, Phone, and Finish.
Change order 012 lists each ruling in the founder's words and the contract edits it proposes. Decision d94 records the product change.

- The usage line beside Send is gone. One bar shows free replies first, then fuel. The usage card stays visible while the brief is open. The phone shows the bar above the message box.
- The message box starts at one line and grows with the text, on desktop and phone.
- The guided interview offers every question's options, a Suggested tag, and Write my own. Unanswered questions carry over.
- A Questions card sits above the usage card. Answer focuses the question in the chat. View jumps to the answer in the chat.
- The desktop brief is a card that opens a side panel. The phone brief is a labeled full-screen panel with Back to chat.
- The first AI reply asks for files. Add a file opens a file chat with one question, what should we know about this file. The answer starts the read; the AI pauses to ask more when it needs to. Each answer is a turn; the read is free and runs in the background. Three Discovery files while the project is not funded.
- Finish is one review page. Open questions come first, with an importance tag and a suggestion to accept. The brief follows as it stands; each section can be edited in place, which is free, makes a new revision, and clears the review checkbox. Finish makes no model call. The Discovery document holds the need, not the technical scope. There is no AI rewrite.

Verification: each board works in Play on the canvas. The file-chat flow and turn counting were also checked in a scripted run of the board logic.

## Revision 12 built on fixtures

Date: 2026-10-01. Author: Claude, with Grok as the feature writer. Status: waiting for the founder's review.

The real Discovery components now live in `src/components/discovery/`. The shared mock mounts them on fixture data, so [the Discovery fixture](http://127.0.0.1:4310/?scenario=first-reply&pace=demo#discovery) shows revision 12. The scenario names are in `design/astra/src/givens.ts`.

The acceptance tests for the screen drive the shell headless at 1280 and 390 pixels, in light and dark. Codex explored the shell as an NGO person in eight rounds. It reported 23 issues, and all 23 are fixed. The eighth round reported no new issue. The reports and screenshots are in `loop/items/AI4DEV-180/evidence/unit5/`.

The build differs from the boards in these places. Each difference is a decision, not an open issue:

- The desktop file panel fills the right column, in place of the board's floating panel. The founder chose this place at the unit 3 gate. The panel is read-only.
- There is no "Use a sample file" button.
- The review page section headings show in capitals, as on the Finish board. The page text stays in sentence case.
- After confirmation, Add a file is disabled. While a file is still being read, Finish Discovery stays unavailable on the review page. A saved change reopens Discovery.

On 2026-10-01 the founder decided that a Discovery file is ingested automatically. The founder said: "It should be automatic ingest process I even debate having to ask the funder anything there and just let it upload and the ingest skill will digest according to the intake and". Asked to choose, the founder chose "Go automatic now".

What left: the file chat, its opening question, the pause question, the "Reading paused" row, the file-chat turn, and the "Suggestion · waiting for you" marker for a file fact. Choosing a file starts the read. The facts enter the brief and are marked as from the file. The read uses no turn and no fuel.

Provisional copy, for the founder to approve or replace:

- "You changed Main priority: Fewer unfilled shifts" and "You used the suggestion for Booking rules: Weekly shift limit". These are the chat lines for a saved change and an accepted suggestion.
- "Discovery is finished, so files cannot be added. Change an answer to reopen it."
- The ready reply and the finish invitation that replaces the message box.
- The data-tier sentences and the fit sentences on the Discovery document.
- Tier 0 shows no data box. Finish does not need one.
- Tier 1 keeps: "Our NGO takes responsibility for data access and keeps only the personal information this tool needs."
- Tier 2 uses: "Our NGO keeps real sensitive data out of the build. The volunteer and the AI work only with fake or anonymized records."
- The line under the Tier 1 and Tier 2 box stays: "In practice: your NGO decides who can see volunteer details, and the tool stores only what “Information handled” lists."
- "The reply cost changed. Review the usage card, then send again."

## Revision 11: highlight the selected scenario

The founder could not see what changed after selecting a scenario.
Each selection now scrolls to its example and outlines the relevant panel.
Interview scenarios highlight the current question. Credit scenarios highlight the usage card. The completion scenario highlights progress and Finish Discovery.
The highlighted panel names the selected example and explains the important starting values or behavior.
**Change scenario** returns to the selector. **Show highlight** returns to the example without resetting answers or balances.
These controls belong to the fixture review. They add no requirement to the production Discovery interface.

Verification: type checking and the build pass. All nine scenarios highlight exactly one panel with the correct example label and explanation.
The browser confirms that Change scenario focuses the selector. Show highlight returns to the selected example.
The browser reports no warnings or errors during these checks.

## Revision 10: finish with open questions

The founder requested an active Finish Discovery button, a review of missing critical information, and completion despite those gaps.
Both Finish Discovery buttons are always enabled and primary. Review lists each missing decision and explains why it matters.
The NGO can return to Discovery or acknowledge the gaps and confirm completion. The existing scope and data acknowledgments remain.
The confirmation records the open questions with the actor, time, and brief revision. It survives reload.
Topic coverage stays accurate after early completion. The conversation stops and Volunteer match becomes the next step.
Manual editing reopens the brief as before. Usage limits cannot prevent review or confirmation.
The mock preserves existing human review holds. It distinguishes those holds from missing information.
The PRD, isolated Discovery requirement, and interface contract now record this behavior.

Verification: type checking and the build pass. The browser completes at 50% coverage after all acknowledgments and preserves completion after reload.
The conversation stops while coverage remains 50%. The review fits at desktop and narrow widths with no browser errors.
Model checks cover zero coverage, no fuel, an empty summary, uncertainty, and a dependent training question.
Completion uses no turn, transfers available fuel once, and preserves existing review holds. An answer edit clears approval.

## Revision 9: read each section or the whole brief

Each decision has a viewing arrow beside its title. Opening it shows the full answer and its question context.
An unanswered section shows the question. An uncertain section also shows guidance for finding the missing fact.
The header arrow expands the whole brief across the workspace. Every section opens in this view.
**Back to chat** restores the conversation and the previous section views. The selected answers and message draft stay in place.
Each answered section keeps Edit. Editing from the whole brief returns to the conversation without using a turn.
Reading and expanding remain available when the free allowance or paid fuel is empty.
**Finish Discovery** still opens the final scope review. Expanding the brief does not confirm or finish Discovery.

Verification: the type check and build pass. Browser checks confirm section expansion, whole-brief expansion, and return to chat.
Selected answers, the message draft, and credit balances survive these actions. Edit from the whole brief opens the existing free editor.
The full brief fits at 1024 pixels in light mode and 320 pixels in dark mode.

## Revision 8: keep editing with each section

The founder questioned the opening **View brief** button and preferred editing each section.
The button was a shortcut to the brief on narrow screens. This revision removes that shortcut.
The live brief keeps its labeled Edit controls. Manual edits remain free and reopen dependent decisions when necessary.
**Finish Discovery** still opens the full brief for final review and NGO confirmation.

## Revision 7: usage scenarios and guided interview

The founder requested more low-credit scenarios and an example of a guided grill-me interview.
The shared prototype now offers nine examples directly above the Discovery workspace.
Each selection loads a separate fictional conversation and balances. It changes no real project.

- The usage examples cover two free replies left, 80% and 97% paid usage, insufficient fuel, and beta exhaustion.
- A ready example has no free turns or fuel. Review and confirmation remain available without a charge.
- Independent questions appear together by default. The NGO can switch to one question at a time.
- Each question includes a suggested approach and its reason. The NGO supplies the decision.
- Choosing trained roles reveals training approval in the next round. Booking rules remain open within the six-topic checklist.
- An uncertain answer gets guidance for finding the missing fact. It does not increase completion.
- A funded paid submission says **Send paid reply**. The amount and temporary hold remain beside the button.
- If the balance cannot cover the hold, the gauge says that more fuel is needed. It does not promise that replies work.

The interview adapts [Matt Pocock's grilling method](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md)
for an NGO: ask independent decisions together, then wait for the answers before asking dependent questions.
The existing Vercel AI SDK fixture transport still streams scripted replies. No real model or payment call runs.
The earlier critics did not review these additions. Revision 7 requires founder review.

Verification: the mock type check and production build pass. Browser checks cover grouped answers, a dependent training question,
uncertainty without completion, the last free reply, and a paid receipt of $0.046. The conversation stops at six agreed topics.
The $0.10 example preserves selected answers and disables Send. The no-fuel example completes through both NGO acknowledgments without a charge.
The inline layout has no horizontal overflow at 1024 pixels in light mode or 320 pixels in dark mode.

## Revision 6: the real chat library, on sample data

The founder asked for the mock to use the chat library chosen for the real screen, the Vercel AI SDK.
The founder chose to keep the reviewed look. Only the chat logic changed. The layout, text, and rules of revision 5 are unchanged.

- The chat uses `useChat` from `@ai-sdk/react`, as the real page at `src/routes/discovery/` does.
- A sample-data transport, `src/fixture-transport.ts`, takes the place of the `discovery-message` function.
  It reads and writes the mock's saved state and streams the same kind of reply chunks the real route streams.
- Replies stream word by word. The NGO can stop a reply. As on the real route, a stopped turn is still used.
- Replies render through `react-markdown`, as on the real page.
- Refusals arrive as an error with a kind and a reason, as the real send route answers today.
- The typed stream parts are in `src/lib/discovery-stream.ts`: question, filed topics, charge, ready, and usage.
  The real route does not emit them yet. The wired screen must emit and read these parts.

Browser checks pass for streaming, stop, a no-fuel refusal, failure and retry, a paid reply with its receipt,
reload, and the ready state. The TypeScript checks for the mock and the whole application pass.
Revision 6 replaces revision 5 for design approval. The critics' "ready" still applies, because the screen does not change.

## Revision 5: NGO usability fixes

The founder asked for an agent to critique the layout as an NGO, then asked Claude to make the fixes.
The founder then ruled that Claude and Astra share this one mock, with no separate folder.
The critique method, rounds, and findings not acted on are in [the critique record](discovery-critique/README.md).
All changes stay inside the Discovery interface contract.

- The Finish Discovery button stays visible. It is a secondary button until every required topic is agreed.
- Before the first answer, the progress panel says where to start.
- At 100%, the chat card points to Finish Discovery at the top. It does not repeat the button.
- The live brief comes before the usage card. Each answered row has a labeled Edit button.
- The usage card starts with one plain sentence about cost.
- When a limit stops replies, the card says which limit applies and when free replies return.
- When no reply is possible, the card and composer say "Not available now".
- In paid mode, the composer shows the fuel left, a low-fuel warning, and the $0.25 hold, next to Send.
- Buy fuel shows only when free replies are used up. It states the $50 minimum.
- The pending message says the fuel shown already excludes the hold, and that it is not an extra charge.
- The yellow and red gauge captions say that replies still work.
- Each AI reply lists the brief topics it added. Free receipts say "Free reply · no charge".
- The review page says it is the last step of Discovery.
- On narrow screens, a fixed bar jumps to the confirmation card. On wide screens, the card stays in view.
- The confirmation card shows no success mark before confirmation.
- A plain explanation sits under the data-responsibility checkbox. The checkbox wording is unchanged.

A second critic, GPT-6 Astra at low, then operated the mock in a browser as the same NGO, in three iterations.
Revision 5 now also includes its fixes:

- A compact progress strip with Finish Discovery stays on screen after the progress panel scrolls away.
- The side menu uses the process bar's stage names and numbers.
- The review page explains Lovable, shows the required disclosure of about $25 a month, and states that ai4good gives no support after handoff.

The TypeScript check passes. Both critics gave "ready": DeepSeek on screenshots, Astra by operating the mock.
Revision 5 replaces revision 4 for design approval.

## Revision 4: volunteer matching after Discovery

The founder requested volunteer matching as the project step after Discovery.
The process bar now shows Intake, Discovery, Volunteer match, PRD, Design, Build, and Handoff.
After confirmation, Volunteer match becomes current. PRD remains a later step.
Both the finished chat and scope confirmation offer **Find a volunteer**.
The action opens publication review. The screen explains human review, volunteer consent, and funding kickoff before PRD work.
The change preserves the Discovery completion rules and existing lifecycle states.
This fixture demonstrates the transition into matching; it does not recruit or assign a real volunteer.

TypeScript and build checks pass. Browser checks confirm that NGO signoff marks Discovery complete and makes Volunteer match current.
The Find a volunteer action opens publication review. Submitting the sample keeps Volunteer match current while human review is pending.
The revised page fits 1024 pixels in light mode and 320 pixels in dark mode without horizontal overflow.
The browser reports no warnings or errors during these checks.

## Revision 3: visible progress and a finish action

The founder asked for completion guidance, a finish button, and an agent that works toward ending Discovery.

- A panel above the conversation shows the percentage, agreed topic count, remaining topics, and **Finish Discovery**.
- Six fixed topics define progress in this fixture. A conditional training question keeps booking rules open without changing the denominator.
- Progress changes when topics are agreed. Additional messages and uncertain answers do not increase it.
- The AI stops asking when the required topics are agreed. The message box becomes a review invitation.
- **Finish Discovery** opens the brief. The existing NGO and data acknowledgments precede **Confirm and finish Discovery**.
- Finishing records the approved revision, actor, and time. It consumes no turn and transfers available paid funds once.
- Editing a required answer clears approval, reopens affected topics, and updates the percentage.
- Uncertain topics wait behind unanswered independent topics. An unchanged uncertainty cannot be submitted repeatedly as a new answer.
- The usage panel changes its next action to free brief review when questions are complete. It stops offering further replies or fuel purchases.

The completion examples are available under **Astra · fixture mock** in the repository prototype and **Review states** in the inline preview.
**Discovery · one topic left** loads a separate sample at 83%. **Discovery · ready to finish** loads all required topics.
Both presets replace the sample conversation; they do not change a real project.

The model checks pass for incomplete, uncertain, conditional, ready, confirmed, and edited states.
They also verify that a completed Discovery rejects additional replies without charge and that confirmation cannot transfer funds twice.
Browser checks verify 83% to 100%, removal of the composer, required acknowledgments, the finish record, and reduced progress after an edit.
Finishing remains available with no free turns or paid fuel. The completed state offers free review without a fuel purchase action.
An unchanged uncertain answer cannot be submitted again. The topic remains open and progress stays at 83%.
The revised layout fits 1024 pixels in light mode and 320 pixels in dark mode without horizontal overflow.
The browser reports no warnings or errors during these checks.
Production enforcement and model behavior still require implementation and acceptance evidence.

## Revision 2: visible NGO and AI chat

The founder asked, "Where is the chat interface with the AI for the ngo ?"
Revision 1 gave the question forms too much prominence. Revision 2 makes the conversation the main interaction.

- The main column says **Chat with ai4good AI**. NGO messages and AI messages remain visible in sequence.
- Each completed exchange retains the AI question, NGO answer, AI reply, and turn charge.
- The message box accepts a written answer directly. Suggested answers fill that same message box.
- The default presents one question at a time. The NGO can answer independent questions together in one turn.
- **Ask AI a question first** demonstrates clarification. It preserves the pending decision and current brief revision.
- The Discovery gauge and live brief remain beside the chat. Mobile layout places them below it.

The fixture uses scripted clarification based on the current question. It does not interpret arbitrary questions with a model.
The inline preview keeps state only for the preview session. The repository prototype still uses browser storage.

Revision 2 verification: TypeScript and build pass. Browser checks verify typed answers, visible question history, clarification, and grouped answers.
A typed answer uses one free turn. A clarification uses one free turn without confirming a fact.
Three grouped answers use one free turn. The paid balance stays unchanged in all three checks.
The embedded layout fits 1024 pixels and 320 pixels. Both themes show the message box without horizontal overflow.
The browser reports no warnings or errors during these checks.

## Revision 1 coverage retained

- Only NGO and AI participate in Discovery. Suggested, custom, and uncertain answers remain distinct.
- The usage panel appears before the brief. It shows one Discovery gauge, both free counters, paid dollars, and the next reply mode.
- The data question precedes confirmation. The scope includes stories, acceptance checks, risk, data tier, maintenance, and a suggested build approach.
- Reference files have an explicit Discovery visibility control. Attachments and visibility changes use no turns.
- A changed answer removes the old approval and marks dependent decisions for review.
- Three free scope rewrites record their reasons. Further requests enter a simulated human review state.
- Confirmation shows the NGO actor, revision, timestamp, and available paid funds carried forward.
- The screen inherits the application font and theme. The mobile brief action focuses the brief below the fixed header.

## Revision 1 verification

The final TypeScript check and Vite build pass. The Claude Design exports remain unchanged.
These checks exercise the fixture, not production acceptance criteria.

| Check | Observed result |
| --- | --- |
| Draft reload | Selected answers and the additional note survive reload. |
| Uncertainty | An uncertain maintenance answer stays open and blocks its dependent data question. |
| Question dependencies | Self-booking exposes booking rules. Trained roles expose training approval. |
| Custom and keyboard answers | A custom owner answer reaches the brief. Space selects a suggested answer. |
| Reply progress | Progress appears while the reply runs. The form and Send prevent duplicate submission. |
| Free metering | Three answers in one reply consume one daily and one beta turn. Paid dollars stay unchanged. |
| Failure and retry | Failure keeps the draft and costs nothing. A successful retry uses one free turn. |
| Paid receipt | The fixture debits $0.046: $0.040 usage and $0.006 fee. Available fuel becomes $9.954. |
| Daily reset | The next-day fixture restores daily free capacity. The paid balance and beta counter persist. |
| Gauge boundaries | 79.99% is green; 80% and 95% are yellow; 95.01% and 100% are red. |
| Empty allocation | Zero paid allocation has an explicit empty state. It does not show a healthy green gauge. |
| Exhausted beta | No free-turn reset remedy appears. An empty paid balance blocks new replies. |
| Free without fuel | Eligible free replies remain available with $0 paid fuel. |
| Pending usage | The $0.25 reservation appears separately from settled usage. |
| File visibility | A sample file starts unshared. Sharing persists after reload and changes no usage counter. |
| Scope confirmation | The data acknowledgment is required. Confirmation records the actor, revision, and time, and survives reload. |
| Changed answer | Editing booking clears approval, marks booking rules for review, and uses no turn. |
| Carryover | Available funds move once. Model checks retain a pending reservation and prevent a second transfer. |
| Free rewrites | Three reasons and revisions appear. A fourth request shows human review without charging usage. |
| Decline | The cause, date, reshaping suggestion, and human oversight notice appear. |
| Reopening | The earlier decline remains available. Copy explains that reopening does not renew the allowance. |
| Mobile and theme | Both themes fit a 320-pixel viewport. The brief receives focus and begins 90 pixels below the viewport top. |

Additional model checks cover funding mode selection, tiny dollar amounts, fixed reply mode, and the persistent beta cap.

## Limits of this evidence

The assistant replies are scripted. The fixture uses browser storage and sample amounts.
It makes no model, payment, database, or notification calls. Real file contents are not processed.
The browser rejected automated file selection. File visibility was checked with the named sample-file preset instead.
The upload control still needs a manual browser check and later production verification.

Production work must enforce access through edge functions, atomic reservations, provider usage settlement, and durable approval records.
Production must also verify model output, file isolation, concurrency, rate limits, and admin review.
The $0.25 reply reservation is a fixture value. It does not define the production spending limit.
Fixture presets set sample balances; they do not represent quota grants or real lifecycle operations.

## Approval record

Decision: approved for desktop, 2026-09-29, in the Claude session through the question tool (choice: "Desktop now, apply rules").
Approved revision: 12. The phone file chat, Questions card, and review page are designed in phase 2 with the mock.
Founder feedback: revision 1 did not make the chat clear. Revision 2 added the visible conversation. Revision 3 added progress and a defined finish.
Revision 4 adds volunteer matching after Discovery and before PRD.
Revision 5 applies the NGO usability critique.
Revision 6 moves the chat onto the Vercel AI SDK with a sample-data transport.
Revisions 7 to 11, by Astra, add the guided interview, brief reading, finish with open questions, and scenario highlights.
Revision 12, by Claude, adds the need brief, the file chat, the single Finish review page, and the layout changes in change order 012.

Approval covers the Discovery design only. It does not close the broader design item or the production requirements.
