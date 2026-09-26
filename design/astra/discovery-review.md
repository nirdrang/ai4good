# Discovery design review — revision 5

Date: 2026-09-26. Author: Claude, on Astra revision 4. Status: ready for founder review; approval is pending.

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
The founder must approve revision 5 explicitly in the conversation.

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

The TypeScript check passes. The last critic rounds gave "ready" for the main flow and for eleven usage states.
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

Decision: pending.
Approved revision: none.
Founder feedback: revision 1 did not make the chat clear. Revision 2 added the visible conversation. Revision 3 added progress and a defined finish.
Revision 4 adds volunteer matching after Discovery and before PRD.
Revision 5 applies the NGO usability critique.

Approval covers the Discovery design only. It does not close the broader design item or the production requirements.
