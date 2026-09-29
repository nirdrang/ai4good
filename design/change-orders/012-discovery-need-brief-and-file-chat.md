# Change order 012: the need brief, the file chat, and Finish without generation

Date: 2026-09-29. Author: Claude. Status: revision 12 approved by the founder for desktop on 2026-09-29, with the contract edits below applied. The shared mock does not show it yet.

AI4DEV-175 (Discovery screen design) owns this revision. Decision d94 records the product rulings.
The design lives on the Claude Design canvas "Discovery brief side panel"
(https://claude.ai/artifact/QuVKgGycBLMMhWVXUwX4e6): boards Interview (desktop), Phone, and Finish.

## Founder rulings, quoted as written

- On Discovery's purpose: "discvoery should be about the need not the stack its a n ngo do not dev oriented doc this is why we have a prd step."
- On files: "Ai can read for the files is not needed. as long as the ngo is free a max of 3 files can be uploaded this should be reflected in the PRD."
- On the file flow: "when add a file is pressed a small chat ui should be avilable that ai will interview the funder till the ai is ready for file ingest."
- On counting the file chat: "these should be counted".
- On the first reply: "on session start you should request the user to upload relevant files using the add a file card".
- On the file chat, replacing three fixed questions: "single question - what should we know about the file. then ai start the ingest if it has more questions it asks funder until ingest is complete".
- Through the question tool, 2026-09-29: keep the three importance labels; the read is free and file-chat answers count; a file fact enters the brief only after the NGO agrees; an edit on the review page clears the review tick; approve desktop now and apply the contract edits.

## Result

- **The need brief.** Each AI reply updates the live brief in the same model call. Every question carries an importance: needed before build, a suggestion exists, or can wait.
- **Finish.** Finish Discovery makes no model call. It opens one review page. The open questions come first, each with an importance tag, why it matters, and a suggestion; the NGO can use the suggestion, answer in the chat, or keep the question open. The brief follows as it stands, each section with its source and an Edit. Saving an edit is free, creates a new revision, and clears the review checkbox. The three confirmation checkboxes keep their text; the open-questions checkbox shows only while questions remain open. The green Finish Discovery button stays unavailable until the boxes are ticked and no edit is open. There is no AI rewrite.
- **The Discovery document.** The need in the NGO's words, users and today's work, agreed answers with sources, the success measure, open questions with importance, files with what the AI took from each, the data tier, the fit verdict, and cause labels. No stack, complexity tier, Lovable recommendation, build split, or cost: those move to the PRD step.
- **Files.** The first AI reply asks for files. Add a file opens a small file chat with one question: what should we know about this file. The answer starts the read. If the AI needs more to finish, the read pauses and it asks in the file chat until the read is complete. Each answer is a turn; the read is free. The NGO can close the file chat; the file row shows Reading with progress, A question for you, then Ready with the fact count, and reopens the chat when selected. The next main-chat reply says what the file showed and asks the NGO to confirm before a fact enters the brief. There is no "AI can read" switch. At most three Discovery files while the project is not funded; intake files do not count.
- **Layout, from earlier in the same session.** No usage line beside Send; one usage bar with free replies first, then fuel; the usage card stays visible while the brief is open; the phone shows the bar above the message box; the message box starts at one line and grows. A Questions card sits above the usage card: Answer focuses the question in the chat, View jumps to the answer in the chat. The desktop brief opens as a side panel; the phone brief opens as a labeled full-screen panel with Back to chat.

## Contract edits, approved and applied 2026-09-29

These changed fixed rules in `design/discovery-ui-contract.md`. The founder approved them with revision 12, and the contract now carries them, with a new section "Claude revision 12".

1. Remove the per-reply usage line beside Send (revisions 5 and 7). The next reply's mode moves into the usage card headline.
2. The four usage values stay together in the usage card, as one two-part bar plus one line of values.
3. Replace the scope review with the Discovery document review. Remove "Rewrite this draft · free, 3 of 3".
4. Keep both confirmation checkboxes with their exact text. The open-questions checkbox appears only when questions remain open.
5. Replace the "Discovery-visible" file rule (revision 1) with the file chat and the three-file limit.
6. Close the open point on the narrow-screen brief: the phone opens a labeled full-screen panel.

## Updated sources

- REQ-004, REQ-032, REQ-036 and the product framing, through `loop/out/pure-s2`, `pure-s3`, and `pure-s6`, assembled into `.taskmaster/docs/prd-mvp.md` with the three isolates.
- `.taskmaster/docs/acceptance/at-req-004.md` section J (AT-004.61 to .73), AT-032.13, AT-036.11 and .12, with amendments tagged d94.
- `design/discovery-model-calls.md`: the design target, the file steps, and the gaps.
- `design/astra/discovery-review.md` revision 12.

## Not changed here, and why

REQ-005 (scope document and publishing), REQ-021 (Lovable integration), and REQ-023 (triage) still describe a technical scope document from Discovery. Their acceptance tests assert it. Changing them is a separate decision, because they govern publishing and triage, not the Discovery screen.
