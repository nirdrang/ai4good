# Discovery interface contract

Status: accepted requirements, 2026-09-20. Implementation requires fresh verification.

The Discovery workspace preserves the layout and question flow agreed in this conversation.
It uses the existing application font and theme. The NGO and AI are the two chat participants.

Sources: [Discovery requirement](../.taskmaster/docs/requirements/req-004.md),
[acceptance criteria](../.taskmaster/docs/acceptance/at-req-004.md), and
[funding update](../loop/items/AI4DEV-132/discovery-update.md).
The saved [conversation prototype](references/discovery-conversation.html) records the agreed layout.
Its old credit arithmetic and standalone colors are superseded by this contract.

## Scope boundary

Clarified by the founder on 2026-09-21: the Discovery screen deals only with Discovery.
The stage bar is a separate shared component, a compact view of the process Kanban.
This document calls that component the **process bar**.

| Owner | Responsibility |
| --- | --- |
| Discovery screen | NGO and AI conversation, questions, answers, Discovery brief, Discovery usage, and NGO confirmation. |
| Shared project workspace | Process bar showing Intake, Discovery, Volunteer match, PRD, Design, Build, and Handoff, with the current stage identified. |

The process bar can remain above Discovery in the composed page. Its placement does not make it part of the Discovery screen.
The shared workflow supplies the current stage. The process bar displays that state; it does not approve or advance a gate.
Discovery records its own confirmation through the existing authorized workflow.

Assess Discovery completeness against Discovery requirements only.
Intake, Volunteer match, PRD, Design, Build, Handoff, and publishing retain their own screens and requirements.
AI4DEV-9 (Discovery screen design) groups several screens; its broader scope does not belong inside the Discovery page.
Assess the shared process bar separately from those screens.

## After Discovery: volunteer matching

After the NGO confirms Discovery, the process bar highlights **Volunteer match**, before PRD.
The finished screen offers **Find a volunteer**. This action publishes the project at once; only a vetted NGO can publish.
The project has been public since intake as an intake card; publishing swaps the intake need for the Discovery document and opens matching. ai4good then coordinates a volunteer match.
The volunteer must consent, and the NGO must fund kickoff before PRD work begins.
The matching step covers publishing, finding a volunteer, consent, and funding readiness.
These are existing workflow actions and lifecycle states. The label adds no lifecycle state and grants no approval.
The completed Discovery chat stays complete while matching proceeds.
Until the matched volunteer starts work in the PRD screen, the NGO keeps reviewing and editing the Discovery document here; a confirmed edit updates the project page. No public surface shows that an edit happened.
When the volunteer starts PRD work, Discovery closes: the document is frozen as the PRD's source and this screen is read-only, with no message box, no Edit, no file add or remove, and no confirm (d96, AT-004.74).

## Workspace layout

- The header shows the project, NGO, Discovery stage, and save state.
- The shared project workspace can display its process bar above the Discovery screen.
- The main column holds the NGO and AI conversation, current questions, answers, and composer.
- A side panel shows the live Discovery brief, confirmed facts, open questions, and review action.
  The Discovery usage card follows the brief, in the side panel and on narrow screens.
- The current gate has one usage gauge. Other gates have no gauges in this workspace.
- On desktop, the brief is a card that opens a side panel beside the chat. On narrow screens, the brief opens in a labeled full-screen panel with Back to chat, without losing the current answer (revision 12).

The shared process bar does not introduce new values into the existing project lifecycle table.
Its labels do not imply that later platform stages are implemented.

## Questions and answers

The AI reuses intake facts and asks the next unresolved question with a short reason.
Independent questions can share a round. A question that depends on another answer waits for that answer.
The interface supports suggested answers, a custom response, and **I'm not sure**.
An uncertain answer remains an open question. The AI must not invent certainty to finish the brief.

The NGO can revise a previous answer. The brief updates and affected dependent answers need review.
The interface preserves the transcript, pending questions, answers, brief, and usage after a reload.
Round navigation and manual answer editing do not consume AI turns.
One submission followed by one completed AI reply counts as one turn, including a reply addressing several independent questions.

This follows the dependency-first questioning discussed from
[Matt Pocock's grill-me skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md).
Use the questioning method without adopting an adversarial tone toward the NGO.

## Completion guidance and Finish Discovery

The Discovery agent must work toward completion. It must not keep an open-ended interview running.
Show a Discovery progress panel above the conversation. It contains the agreed topic count, percentage, remaining topics, and **Finish Discovery**.
This panel belongs to Discovery. It is separate from the shared process bar and the Discovery usage gauge.

Progress equals agreed required topics divided by required topics. It does not measure messages, tokens, fuel, time, or AI confidence.
Use a stable checklist. Conditional follow-up questions belong to their existing topic and keep that topic open until resolved.
In the volunteer fixture, six topics cover priority, booking, maintenance, success measure, booking rules, and information handled.
If trained roles require an approval owner, booking rules remain open until that owner is agreed. The denominator stays six.

The agent selects the next unresolved required topic. Each reply must help resolve that topic or explain its blocker.
Reusing intake facts and grouping independent questions can reduce the number of turns.
Optional detail must not delay completion. Unknown facts stay visible; the agent must not invent certainty or repeat the same question indefinitely.

When required topics are agreed, the AI states that Discovery is ready for review and stops asking questions.
The interface replaces the composer with a finish invitation. Completion must stop further automatic model calls and charges.
The **Finish Discovery** action remains enabled and primary throughout, including at zero topic coverage or with no fuel.
Clicking it opens one review page (revision 12). The open questions come first, each with its importance (Needed before build, A suggestion exists, or Can wait), why it matters, and any suggested answer. The NGO can use the suggestion, answer in the chat, or keep the question open.
The NGO can return to the conversation or acknowledge the gaps and finish anyway.
Unanswered topics, uncertainty, dependent questions, and an empty summary do not block acknowledged completion.
Existing human review holds and data responsibilities remain separate. A missing answer is not a review hold.
If a manual edit or AI reply is in progress, the active button explains how to save, cancel, or stop before review.

The review page then shows the current brief as it stands, each section with its source and an Edit. Saving an edit is free, creates a new revision, and clears the review acknowledgment. There is no AI rewrite, and opening the review makes no model call.
The NGO supplies the existing acknowledgments and selects **Finish Discovery**, which stays unavailable while an edit is open or while a file is still being read. The page says so in plain words (founder decision 2026-10-01).
If gaps remain, require an explicit acknowledgment that the NGO chooses to finish with those gaps open. That checkbox appears only while questions remain open.
That action records the revision, actor, time, and accepted gaps with their reasons. Confirmation survives reload.
It carries available paid funds once under the existing funding rules.
The interface then says **Discovery finished**. AI readiness and 100% topic coverage do not constitute NGO approval.
If the NGO finishes early, show **Finished with open questions** and preserve actual coverage. Stop further AI questions and charges.
The confirmed brief carries the accepted gaps into project review and volunteer matching.
If the NGO changes an answer, reopen affected topics, lower progress where needed, and invalidate the previous approval.

Required checks include incomplete, uncertain, conditional follow-up, ready, confirmed, and edited-after-confirmation states.
Verify that the last answer stops questioning, finishing is free, and repeated completion cannot charge or transfer funds twice.

## Funding panel

Keep these values visible together in one Discovery usage card (revision 12). One two-part bar shows free replies first, then paid fuel. One line gives the daily turns left of the grant and fuel values; the reset sits in the card's footer. The card stays visible while the brief is open. On a phone, the bar sits directly above the message box.

| Value | Example | Rule |
| --- | --- | --- |
| Daily free turns | 3 of 10 remaining today | One completed free reply consumes one turn. The daily grant is 10, or 30 when vetted. |
| Paid fuel available | $10.00 | This is available USD allocated to this gate, after reservations. |
| Next reply | Free · 1 turn | Free applies when daily capacity remains. |
| Reset | Resets at 03:00 in your time zone | Convert 00:00 UTC to the viewer's actual local time. |

If free capacity is exhausted, show **Paid · actual usage in USD** before Send.
Show the paid reservation or turn spending limit where the NGO can inspect it.
If a concurrent request changes the displayed funding mode, refresh that mode before accepting a newly paid submission.
A submission labeled Free cannot silently become Paid.

The **Buy fuel** action uses the existing project checkout, acknowledgment, and $50 minimum.
There is no separate paid-credit SKU. A $10.00 example is a remaining balance, not a new minimum purchase.
Buying fuel does not replenish daily turns.

After a paid reply, show AI usage, the platform fee, and the total debit in USD.
For example: $0.040 AI usage + $0.006 platform fee = $0.046 total.
Keep fractional cents in storage. Small charges must not appear as free because of display rounding.
If final usage is missing, show **Usage pending** and retain the relevant reservation.

## Gauge behavior

Use the unrounded percentage consumed when choosing the color:

| Consumed | Color |
| --- | --- |
| Below 80% | Green |
| 80% through 95%, inclusive | Yellow |
| Above 95% through 100% | Red |

In free mode, the gauge uses the percentage consumed of the daily grant.
Its label identifies the daily limit. Today's turns left of the grant remain visible as text.
In paid mode, it shows consumption against the current gate's paid allocation.
Label reservations separately from settled charges. A paid allocation of zero has an empty state, not a division by zero.
Use labels and numbers in addition to color. Red is a usage warning and does not itself block a funded reply.

When the NGO approves the gate, carry available paid funds to the next allocation once.
Retain pending reservations until settlement. A transfer cannot increase project fuel.
Free turns never become dollars. The prototype's former per-gate free grants do not apply to this pilot.

## Required states

| State | Visible behavior |
| --- | --- |
| Free capacity available | Free label, daily turns left of the grant, paid balance, active composer. |
| Daily cap reached, fuel available | Paid label, USD balance, next reset. |
| Daily cap reached, no fuel | Preserve draft; show Buy fuel and applicable reset. |
| Fuel exhausted, free eligible | Free composer remains available. |
| Streaming | Show progress; prevent duplicate submission. |
| Failure or automatic retry | Preserve answers; no extra free charge; show retry state. |
| Brief ready | Show review and NGO confirmation of the current revision. |
| Earlier answer edited | Mark dependent answers for review and invalidate old approval. |
| Gate approved | Retain the approved revision and actor; carry only available paid allocation. |
| Fit declined or reopened | Preserve the existing decline, oversight, and admin-overturn rules. |

The AI cannot sign off for the NGO. The server checks role, project access, and brief revision.
Reading, manual editing, review, confirmation, file attachment, and the file read cost no AI turn. A file read is not a turn (founder decision 2026-10-01: a Discovery file is ingested automatically).

## Usability rules from the NGO critique

Added 2026-09-26 with Discovery design revision 5, at the founder's request. Founder approval of revision 5 is pending.
Two agent critics played a non-technical NGO coordinator with a small budget.
DeepSeek V4.1 Flash judged screenshots of the main flow and eleven usage states, on desktop and phone.
GPT-6 Astra at low operated the mock in a browser, in three iterations.
Both critics ended with "ready". The record is in [the critique folder](astra/discovery-critique/README.md).
The rules below stay inside the sections above. They say how the screen presents those rules.

### Progress and finishing

- Before the first answer, the progress panel lists the open topics and offers review and completion with those topics open.
- Finish Discovery in the progress panel is always an enabled primary button. Missing information appears in the review instead of disabling it.
- A file that is still being read keeps Finish Discovery unavailable on the review page. The page says so. The progress button still opens the review (founder decision 2026-10-01).
- After the progress panel scrolls out of view, a compact strip stays at the top of the page.
  The strip shows the percentage, the agreed topic count, and the same enabled Finish Discovery action.
- When the questions are complete, the finish invitation points to Finish Discovery. It does not add a second finish button.

### Conversation and brief

- Each AI reply that saves answers lists the brief topics it added.
- A free reply receipt says "Free reply · no charge".
- Each answered topic in the brief has a labeled Edit button. The brief says that edits are free.

### Usage and money

- The usage card starts with one plain sentence. The sentence says whether the next reply is free and how many free replies remain today.
  If a limit stops free replies, the sentence names the limit and says when free replies return at the next UTC reset.
- If no reply is possible, the next-reply value is "Not available now". The card and composer then omit the paid hold.
- In paid mode, the usage card headline shows paid mode, the fuel left, a low-fuel warning at yellow and red, and the per-reply hold. No usage line sits beside Send (revision 12).
- Buy fuel appears only when free replies are used up. It states the $50 minimum and that fuel does not add free replies.
- The pending message says the shown fuel already excludes the hold, that only actual usage is charged, and that the hold is not an extra charge.
- Yellow and red gauge captions say that replies still work.
- Limit messages name the Discovery usage card as the place to add fuel. They use no position word such as "beside".

### Review and confirmation

- The review page names itself as the last step of Discovery. The process bar keeps Discovery current.
- On narrow screens, a fixed bar jumps to the confirmation card. On wide screens, the confirmation card stays in view while the NGO reads.
- The confirmation card shows no success mark before confirmation.
- A plain explanation follows the data-responsibility checkbox. The checkbox wording does not change.
- The review page shows no stack, complexity tier, build split, cost, or maintenance plan (revision 12). The Lovable explanation, the $25 a month subscription, and the pricing link move to the PRD step.

### Astra revisions 7 to 9, 2026-09-26

Astra added these at the founder's request. The earlier critics did not review them. Founder approval is pending.

Guided interview (revision 7):

- Independent questions appear together by default. The NGO can switch to one question at a time.
  The AI asks dependent follow-up questions only after the answers they depend on.
- Each question shows a suggested approach and its reason. The NGO still makes the decision.
- An uncertain answer gets guidance for finding the missing fact. It does not increase completion.
- A dependent follow-up, such as training approval after trained roles, stays inside its topic. The checklist keeps six topics.

Paid sending (revision 7):

- In paid mode the send button says "Send paid reply". The amount and the temporary hold show in the usage card, not beside Send (revision 12).
- If the fuel cannot cover the hold, the gauge caption says "More fuel needed to reply". It does not say that replies still work.
  The rule "Yellow and red gauge captions say that replies still work" applies only when the fuel covers the hold.

Reading the brief (revisions 8 and 9):

- The opening "View brief" shortcut is removed. The live brief keeps a labeled Edit control on each answered section.
- Each brief section has a viewing arrow. An open section shows the full answer and its question.
  An unanswered section shows the question. An uncertain section also shows the guidance for the missing fact.
- An arrow in the brief heading expands the whole brief across the workspace, with every section open.
  "Back to chat" restores the conversation, the earlier section views, the selected answers, and the message draft.
- Edit from the expanded brief returns to the conversation and uses no turn.
- Reading and expanding stay available when free replies and fuel are both empty.
- Expanding the brief does not confirm or finish Discovery. Finish Discovery still opens the final review.

Resolved in revision 12: on a phone, the brief card opens a labeled full-screen panel with Back to chat.

Prototype only: the scenario examples above the workspace load sample conversations and balances. They are review tools, not product.

Stream format: each `data-question` part also carries `recommendation` and `uncertaintyHelp`, in `src/lib/discovery-stream.ts`.

### Claude revision 12, 2026-09-29

The founder approved revision 12 for desktop on 2026-09-29 and accepted these rule changes. The design is on the Claude Design canvas "Discovery brief side panel", boards Interview, Finish, and Phone. Change order 012 records each ruling. Phone versions of the file panel, the Questions card, and the review page are designed in phase 2 with the mock.

Composer and questions:

- The message box starts at one line and grows with the text, on desktop and phone.
- A Questions card sits above the usage card. It lists every asked question as Answered, Not sure, Open, Ready to send, or Coming next.
  Answer focuses that question in the chat. View on an answered question scrolls to and highlights its answer in the chat.
- Every question offers its options with one marked Suggested, and Write my own for free text. Send works with at least one answer; unanswered questions carry over.

Files:

- The first AI reply asks for files while the project has fewer than three Discovery files, and points to Add a file.
- Add a file opens a panel beside the main chat with a drop area and Choose a file, which opens the device's file picker. It lists the accepted types and says to use sample or redacted data that ai4good and the volunteer will see. Cancel adds nothing.
- Choosing or dropping a file starts the read at once. No question comes first. The panel closes. The founder decided this on 2026-10-01: a Discovery file is ingested automatically.
- The file appears in Your files as Reading with a percent, then Ready with the number of facts. The read never pauses. The read never asks a question.
- Selecting the file opens a read-only panel in the same place. It shows the file name, the size, the read progress, and the facts when the read is ready. It has no answer box. Closing the panel does not stop the read. Focus returns to the control that opened the panel.
- A read uses no reply, no free turn, and no fuel. The usage card does not change.
- When the read finishes, its facts enter the brief. The brief marks them as coming from that file. A file fact does not agree a topic. The NGO agrees topics in the chat.
- The next main-chat reply says, in one sentence, what the file showed. It asks nothing about the file.
- Finish Discovery on the review page stays unavailable while a file is still being read. After confirmation, Add a file stays disabled.
- There is no "AI can read" switch. Every uploaded file is read. At most three Discovery files while the project is not funded. Intake files do not count.

### Open minor findings

These findings are not requirements. The founder may choose them later.

- The full usage card is below the brief, away from Send.
- On a phone, the first question starts below the first screen.
- Small amounts such as $0.046 show no cents equivalent. Fractional cents must stay visible.
- The process bar label "PRD" has no plain explanation. The process bar labels are fixed above.

## Application theme

The source is [src/styles.css](../src/styles.css) and the app's existing Tailwind and shadcn components.
Inherit the app font; do not load Inter or introduce another web font.
The current application uses the system sans-serif stack supplied by Tailwind.

| Element | Existing token or behavior |
| --- | --- |
| Page and card | `--background`, `--foreground`, `--card`, `--card-foreground` |
| Primary action | `--primary`, `--primary-foreground` |
| Secondary panel | `--muted`, `--muted-foreground` |
| Controls | `--input`, `--border`, `--ring`, existing Button and input variants |
| Selected answer | `--accent`, `--accent-foreground`, visible selected state |
| Corners and spacing | Existing component defaults and `--radius` |
| Errors | Existing destructive tokens |
| Usage warnings | Green, yellow, and red semantic styles that pass contrast in both themes |

Light and dark themes use the existing variables. Do not copy the prototype's independent green page palette.
Keep visible focus, keyboard answer selection, labeled controls, and accessible progress values.
At 320 CSS pixels, no required control or amount may be clipped.

## Implementation and proof

AI4DEV-175 (Discovery screen design) owns the screen revision under change orders 008 and 009, within AI4DEV-9 (design batch 2 screens).
AI4DEV-158 (Discovery interface wiring) owns implementation through edge functions.
AI4DEV-157 (Discovery usage display) owns the funding display.
AI4DEV-141 (Discovery question flow) owns dependent questions and persistence.
AI4DEV-139 (free-first paid routing) owns mode selection and metering.

Run the revised acceptance criteria against the implementation, including both themes and narrow screens.
Exercise usage boundaries at 79.99%, 80%, 95%, 95.01%, and 100%.
Exercise a funded free turn, paid spillover, UTC reset, vetted daily grant, and a stale Free preview.
Old completion evidence does not establish compliance with these revised requirements.
Check each rule in the usability section on the wired screen, on desktop and at phone width.

The chat uses the Vercel AI SDK, `useChat` from `@ai-sdk/react`, on the mock and on the real page.
The mock swaps only the transport: `design/astra/src/fixture-transport.ts` streams sample replies.
The wired screen keeps the mock's chat code and uses a transport to the `discovery-message` function.
Each reply streams the typed parts in `src/lib/discovery-stream.ts`: question, filed, charge, ready, and usage.
The send route must emit those parts. Today it emits only the reply text and one `data-turn` part.
The critique prompts and capture scripts in `design/astra/discovery-critique/` can repeat the NGO critique on the wired screen.
