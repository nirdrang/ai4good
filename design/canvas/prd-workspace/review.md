# PRD workspace screen design: review record

Item: AI4DEV-176 (PRD screen design). Requirement: REQ-036.
Canvas: https://claude.ai/artifact/2C3E67dNymAStfLY5GSdxn, final version 65.
Boards: Main.dc.html (desktop, 1280 by 900) and Phone.dc.html (phone, 390 by 844). The Materialize board was removed in version 54.
Copy for screen build: `design/canvas/prd-workspace/project/` (both boards and `canvas.json`, downloaded from version 65).

## Outcome

- Codex reviews: round 1 on version 49 found 13 interactions that did not work, all fixed in version 50; round 2 on version 57 found 6, four fixed in version 58 and two ruled by the founder (no chat after Close PRD; funds used up shows a message only). Reports: `loop/items/AI4DEV-176/codex-review/round-1.md` and `round-2.md`. Usability hints from both rounds were answered one by one (below). No third round: at step 5 the founder chose to close out.
- Step 5: the screen is complete in both sizes.
- Step 6: every marked ruling in force went into the PRD (REQ-036 in `loop/out/pure-s6-req-027-036.md`, assembled into `.taskmaster/docs/prd-mvp.md` and `requirements/req-036.md`), the contract (`design/prd-ui-contract.md`), and the PRD workspace note and process bar in `design/ui-ux-instructions.md`, recorded as decision d97.
- Step 7: `acceptance/at-req-036.md` amends cases 01 to 10 and adds cases 13 to 18, bound to the boards' `data-testid` handles; the six new ids are pending stubs and are in the `verify:` field of the screen wiring leaf (D7.L3).
- Known gaps, not changed here because no ruling names them: REQ-010 (project page) still describes the private PRD workspace with one active human and materialization; REQ-026 still says developer-started PRD materialization creates the plan after close and that each Design sign-off creates its UI item; the Design review part of REQ-036 and `design/design-ui-contract.md` still have turns, handover, and per-screen sign-off creating the UI item, and say "Design" for the phase; the manifest leaves D2 to D6 of `loop/decomp/req-036.md` and their board items still describe turns, request effort, and materialize at close; the process bar keeps a Build plan stage although the planning package is now written at the end of UI Design.

## Plan for screen wiring: the model route

Recorded 2026-10-14 for the screen wiring brief. The founder asked whether the backend could "utilze codex with luna model for best utilization of credits" and whether the Vercel chat SDK can use Codex. After the recommendation below, the founder answered "yes record it in the wiring brief".

- The PRD backend uses the AI SDK (Vercel), with the model provider chosen by an environment setting. The chat code is the same for every provider.
- Development and testing: the community provider `ai-sdk-provider-codex-cli`, on the founder's ChatGPT subscription, so test runs spend no money. It needs Node 18 or newer and a globally installed Codex CLI, so it cannot run inside a Deno edge function; screen wiring settles how the local stack reaches it (for example a local Node service the edge function calls only in development). Codex runs its own tools, so AI SDK tools are not passed through; the recording tools must not depend on that provider in tests that check them.
- Production: the OpenRouter provider (`@openrouter/ai-sdk-provider`), with the key only in the edge function's environment. The model is luna if OpenRouter or OpenAI offers it as a paid API model, otherwise Haiku; screen wiring checks availability and the price per reply first and asks the founder. This keeps the PRD as written (all PRD model calls through OpenRouter, real cost settled per generation).
- Production does not run through Codex on a subscription: one account would serve every kitchen, it has no per-reply cost to charge to a project's funds, and a personal subscription is likely not meant to serve other people's requests (not checked against OpenAI's terms).
- Discovery's backend calls the Anthropic SDK directly (`supabase/functions/_shared/anthropic-messages.ts`), so the AI SDK is a new pattern here.
- Order, founder answer "Build first, then wire (Recommended)": screen build on sample data first, then screen wiring.

## Rulings

### 2026-10-13 and 2026-10-14, step 6: which marked rulings go into the PRD

Step 5: asked whether the screen is complete, the founder chose "Yes, close it out (Recommended)" over a third Codex round.

Step 6, asked in four grouped questions, the founder ticked "Only the developer asks", "A chat per section" and "No effort selector", and answered "not clear" on the group about what follows the PRD. Asked what to do with the unticked rulings, the founder answered "discuss these rulings". Taken one at a time, each shown against the PRD sentence it replaces:
- Close PRD only freezes, everything is written once after UI Design: "Yes, change the PRD (Recommended)".
- The phase after the PRD is named UI Design: "Yes, rename it (Recommended)".
- The colored bookmarks: "Yes, remove them (Recommended)".
- Turns and handovers: "This is why we built the post question and claim threads. In prd the dev is the main driver if he need a question he post it to ngo that can discuss with AI to craft an answer". Taken as: the PRD drops turn ownership and handovers; the developer drives, posts questions to the NGO, and the NGO crafts each answer with the AI.
- How the NGO finishes an answer: "Yes, write it in (Recommended)".
- What happens when the developer uses an answer: "Yes, write it in (Recommended)".

On 2026-10-14, the three section rulings:
- Who confirms a section: "Developer confirms (Recommended)".
- What opening a section shows: "show chat related to this section. so i can choose to compete a section using chat in that context". Asked which layout, the founder chose "Document on top, its chat below", which is what the boards show. Into the PRD: the section document with its own chat below it, where the developer completes the section.
- Where Priya can close the PRD: "i dont like the experince where we have the close button apperas only on conditions. let dev decided to close it freely". Asked what happens to the completion check, the founder chose "Check runs, warns only (Recommended)". Applied in canvas version 64, on the desktop and phone boards: Close PRD is always on for Priya; the panel lists what is still open ("Still open"). Pressing Close PRD closes at once when the check already passed; otherwise the AI runs the completion check and, when it finds gaps or unconfirmed sections, lists them with "Close anyway" and "Keep working". Close anyway closes the PRD, and the banner reads "PRD closed at revision N with K open points · UI Design starts from it".
  - **[PRD]** The developer can close the PRD at any time. Close PRD runs the completion check first; gaps and unconfirmed sections are a warning, not a block. Closing anyway records them as open in the closed revision. This replaces "Only a fresh AI completion recommendation exposes Close PRD" and the requirement that the score pass before closing, and withdraws the version 22 ruling that the panel button turns on only when the check passes.

Then the last three: no receipt per reply, "Yes, drop it (Recommended)"; the gauge, "Available and pending (Recommended)"; messages sent while the AI answers, "Yes, they queue (Recommended)".

Result of step 6: every marked ruling in force goes into the PRD and the contract, together with the new Close PRD ruling above. Nothing is left as a known gap by the founder's choice.

### 2026-10-13, in the session: the round 2 hints, one at a time

Asked which hints to apply, the founder answered "discuss each". Each hint was shown on the boards in the browser at its screen, on both the laptop and the phone.

- Hint 1, Mark answer complete while the AI's follow-up is unanswered: the founder chose "Block until answered (Recommended)". Applied in canvas version 62: while the AI's last message to Maya is a question, the button is grey and the line "Answer the AI’s question first." shows under it; any reply from Maya unblocks it.
  - **[PRD]** The NGO cannot mark an answer complete while the AI's follow-up question to her is unanswered.
- Hint 2, Maya's replies joined with semicolons: the founder answered "why this is needed when ngo mark the answer complete you craft the answer back to the dev board", then chose "Sent at once, she can read it (Recommended)". Applied in canvas version 62: the "Your answer: …" line with Edit is gone (this replaces the version 55 ruling on hint #5 below). When Maya presses Mark answer complete, the AI writes one clean answer from the whole chat, for example "Keep a volunteer’s email and phone for a year, then delete them. Shift history stays, without names.", and it goes straight to Priya. Maya returns to All questions, where the question shows "Sent to Priya: …". The section text uses the written answer as it stands. Priya can still change it with View answer.
  - **[PRD]** When the NGO marks an answer complete, the AI writes the answer from the whole side chat and sends it to the developer at once; the NGO sees what was sent. The NGO does not edit a draft answer during the chat.
- Hint 3, explain the card, View answer and Use answer: shown with three versions side by side, the founder chose "Now, no explanation (Recommended)". No change.
- Hint 4, two scroll areas in a phone section: the founder chose "One page, one scroll (Recommended)". Applied in canvas version 62 on the phone board: the section document at full length, then a "Section chat" divider and the chat, on one page that scrolls once; it opens at the top, and Priya's message box stays at the bottom. A detail for the boards.

### 2026-10-12, Codex review round 2

The founder: "run the second codex round". Round 2 ran on canvas version 57 (report: `loop/items/AI4DEV-176/codex-review/round-2.md`, 157,098 tokens) and found 6 interactions that did not work, down from 13. Fixed in canvas version 58, each covered by the board flow test:
- The cost answer quoted the balance before its own charge. It now says what is left and about what will be left after the reply.
- A note written in View answer settled the open point but was not written into the section. It now is.
- On the phone, Maya's question card inside the chat could not be opened. The card has "Answer it", which opens her side chat (desktop too).
- The completion-check fix replaced Priya's words with a fixed sentence. The section now records what she wrote.
Wording found on the way, fixed as defects: sections with a completion-check gap were counted as "ready to confirm" in the Close PRD list; Maya opening a section was told to confirm it; saved text could end with doubled punctuation; Technical scope did not gain the stories that Maya's answers imply (removal after the retention period, the weekly success count). The sample PRD now starts with $8.80 left instead of $4.38, so a full run does not use the funds up.

Not fixed, for the founder:
- Funds used up: neither Priya nor Maya can add funds on this screen; Codex had to restart. Asked what the screen should offer, the founder chose "Message only (Recommended)": Send stays off and the line says the kitchen adds funds; adding funds belongs to the funding screen. No change.
- After Close PRD the workspace is read-only, so Priya cannot ask the AI anything there (ruled on 2026-10-11/12; reported as a defect by Codex).
- Hints: Mark answer complete is possible while the AI's follow-up is unanswered; the AI should combine Maya's replies into one clean answer instead of joining them with semicolons; explain the difference between opening a question, View answer and Use answer; on the phone, a full-page section view instead of two scrolling areas. Repeats of declined or out-of-scope hints: price before Send (declined 2026-10-11), the threshold placeholder (a pilot decision).

### 2026-10-12, in the session: the section card is the document, not a history

> the gray part in the section is the completed PRD section as of current state with everything we assimilated for it from the chat and review process . it should be doc view not chat like view of the history

Applied in canvas version 57, on the desktop and phone boards: the "Questions for Maya" and "From the main chat" lists added in version 56 are removed from the section card. The card reads as the section's document as it stands: its statements with everything already worked in (Maya's answers once used, Priya's decisions, the points settled in the main chat, and changes asked for in the section chat, written as plain statements with no "From the section chat:" prefix), the user stories for Technical scope, and its sources. Where a decision is still missing, the text says so (for example, "No text yet. It waits for Maya's answer on how long the kitchen keeps volunteer data."). The history stays in the main chat and the section chat.
- **[PRD]** The section view shows the section as a document at its current revision, with every assimilated decision; it does not list the conversation history. This refines the version 56 ruling below.

### 2026-10-12, in the session: a section shows everything related to it

After hint #3 (list the user stories in Technical scope) was explained again, the founder ruled:

> when a user (dev or ngo) presses the section of the left side bar for the PRD section ALL related to the PRD should be presneted there

Applied in canvas version 56, on the desktop and phone boards, for Priya and Maya alike. The section card now holds, under the section text and its sources:
- For Technical scope, its user stories as a numbered list (7 before the swap rule, then 8 with the swap story the pick implies, or 7 with "No swaps"). This settles hint #3.
- "Questions for Maya" on this section: each question, its status, and Maya's answer once she marked it complete.
- "From the main chat": every main-chat message and event about this section, with its day, who wrote it, a short excerpt, and "Show in chat", which opens the main chat at that message.
- The completion-check gap, when there is one (already shown since version 49).
The section's own chat stays below the card. The card is taller (up to 380 pixels on desktop, 360 on the phone) and scrolls.
- **[PRD]** Opening a PRD section shows everything tied to it: its text, its stories where it has them, the NGO questions on it with their answers, the main-chat messages about it with a link to each, and any completion-check gap. This extends the "one lasting chat per section" ruling: the section is the place to read all of it, for both the developer and the NGO.

### 2026-10-12, in the session: the remaining Codex hints

The founder answered: "#5 yes", "#6 yes", "#7 yes", "#3 not clear". Applied in canvas version 55:
- #5: above "Mark answer complete", Maya sees one line, "Your answer: …", with Edit. Edit puts the answer back in her input box so she can rewrite it. A detail for the boards.
- #6: Maya's phone opens on the Questions tab; Priya's opens on Chat. Switching the prototype viewer does the same. A detail for the boards.
- #7 (defect): the phone tab labels were cut off and "PRD 2/6" broke over several lines. Each label is now one line inside its tab, checked in the browser at 390 by 844.
- #3 (list the user stories in Technical scope): to be explained again.

### 2026-10-12, in the session: everything is written after UI Design

> i am not sure that prd materlize should be done after the PRD step and not after the UI design phase as we have seen in this project the ui screen can chnage quite a bit the PRD items

Asked when ai4good should write the requirement items and the board, the founder chose "All after UI Design (Recommended)".

Applied in canvas version 54, on the desktop and phone boards: Close PRD only freezes the PRD. There is no background job at close, no Retry, and no counts. The banner reads "PRD closed at revision N · UI Design starts from it" with "Open UI Design" (Maya: "Priya opens UI Design next."), and the workspace is read-only.
- **[PRD]** Close PRD freezes the PRD and opens UI Design, which takes its screen list from the closed PRD. Nothing is written to the board at close. After the last screen sign-off, one background job writes the requirement items, the board, the acceptance cases and the development items, once. Its progress, a stop, and Retry belong to the end of UI Design, in that screen's item. This replaces the split ruled on 2026-10-08 (requirements and screen list at close, the rest in the build plan) and the version 52 banner below.

### 2026-10-11, in the session: PRD materialize is not a step the user sees

On the hint to rename PRD materialize:

> For #4 why we even have this exposed as a step. Once we complete the prd section we should generate the boards that means the sequence flow is done we need new screens.

Asked what Priya sees after Close PRD, the founder asked "What the banner shows ?", and after the three banner states were described:

> Remove materialize board banners is ok for the scope of progression as we generate prd items from the doc .
> Next step
> Should be ui design on the screens.

Applied in canvas version 52, on the desktop and phone boards:
- The Materialize board is removed from the canvas, and "PRD materialize" is removed from the process bar: Intake, Discovery, Volunteer match, PRD, UI Design, Build plan, Build, Handoff. The phone chip reads "PRD · stage 4 of 8".
- Close PRD stays in the PRD workspace. A banner under the process bar shows the progress: "PRD closed at revision N · ai4good is creating the requirements and the screen list…", then "Ready · 6 requirements and 4 screens to design" with "Open UI Design" (Maya sees "Priya opens UI Design next."). If the job stops, it reads "Creating the requirements stopped after 2 of 6" with Retry ("Retry continues where it stopped and creates nothing twice."; Maya: "Priya can retry. Nothing is created twice."). The board shows one stop and one successful retry.
- After closing, the workspace is read-only: no input boxes, no Confirm or Reopen, and the Close PRD box reads "Closed at revision N".
- "Open UI Design" leads to the next screen, which is designed in its own item; the board says so.
- **[PRD]** PRD materialize is a background job started by Close PRD, not a stage or a page. Its progress, a stop, and Retry show in a banner on the PRD workspace, with counts only. The next stage after PRD is UI Design. This withdraws the version 27 ruling that the materialize page shows the PM board; the board view for the team belongs to the project page item (REQ-010), and "the next step should be UI design on the screens" points to a UI Design screen item, which the founder files.

### 2026-10-11, Codex review round 1 and the founder's answers on its hints

Before the review, the founder set the reviewing model: "which model are you using this should be astra low", and chose the local copy over the artifact URL: "go ahead with the local copy". The recipe in `.claude/skills/ui-design/codex-review.md` now names `gpt-6-astra` at `low`.

Round 1 ran on canvas version 49 (report: `loop/items/AI4DEV-176/codex-review/round-1.md`, 135,493 tokens). It found 13 interactions that did not work. All 13 are fixed in canvas version 50, each covered by the board flow test:
1. The balance could go below zero. Now a request that the funds cannot cover is refused: Send and Use answer turn off, the input says "PRD funds are used up. The AI cannot answer until the kitchen adds funds.", and the gauge says so too. This follows the contract's funding check before dispatch.
2. Maya's draft followed her to another question. Each question now starts with an empty box.
3. "Both of these" was written into the PRD literally. The AI now writes out both targets.
4. Changes asked for in a section chat did not show in the section. They now appear as "From the section chat: …".
5. "No swaps" still left a swap approval story in Technical scope. The story now follows the pick.
6. With Priya's note the AI still asked about the open point, and without it the section was already confirmable. Now a note settles the point; with no note the section stays Draft ("One point to settle in the main chat") until Priya answers in the main chat.
7. The AI ignored a question Maya asked it. It now answers, and her question stays out of her answer.
8. The logo follow-up contradicted "No, plain text emails". It now keeps her choice.
9. The main chat gave the same reply to "what blocks closing" and "what does it cost". It now answers both.
10. On the phone, Maya's heading said 2 open while the badge said 1. Her heading now reads "Questions for you · N to answer".
11 and 12. Remove and Edit on a queued message lost the race with the reply. The scripted reply now takes 4 seconds instead of 2.
13. "Open UI Design" did nothing. It now says the UI Design screen is designed in its own item.

The founder's answers on the usability hints, after discussing them in the session:
- Show the cost of each message before sending: declined, together with a "replies left" line in the gauge. The founder asked "For #1 why I need to expose cost per message ?" and then ruled "Remove both".
- Rename "Claim answer": "Use answer bedside view for #2". Applied in canvas version 51: the button is "Use answer", beside "View answer", and every status line says "use" instead of "claim" ("Maya marked it complete · use it", "Used by Priya"). **[PRD]** The developer's action on a completed NGO answer is named "Use answer" (the rulings below say "claim").
- Not answered yet: list the stories in Technical scope, a plainer title for PRD materialize, a final-answer preview before Mark answer complete, opening Maya's phone on the Questions tab. Full tab labels on the phone is a defect to check.

### 2026-10-11, in the session: the failed completion check is drawn

Asked what comes next, the founder chose "Draw failed check, then Codex (Recommended)".

Applied in canvas version 49, on the desktop and phone boards: the first time Priya confirms the last section, the completion check fails. The AI turn reads "the PRD covers 84% of the confirmed Discovery document … so it does not pass yet" and lists two named gaps, each in a red box with an "Open <section>" button: the kitchen's 6 public-holiday closures (Shift scheduling rules) and volunteers aged 16 and 17 (Users and roles). Both sections drop to Needs review with the line "Completion check gap · fix it in this section", and Confirm is off until the gap is fixed. The Close PRD list shows "2 gaps from the completion check to fix". In the section chat, Priya says how to cover the gap; the AI adds the line to the section, the gap shows "Gap closed", and Priya confirms again. When all six are confirmed, the check runs again, passes at 91%, and Close PRD turns on. The threshold stays the placeholder [THRESHOLD — pilot decision]. This fills the gap noted under version 22 ("a failed completion check with named gaps"). A detail for the boards; the PRD already requires named gaps on a failed check.

### 2026-10-11, canvas comment on the "Main chat · whole PRD" entry

> not really clear

Version 47 added an explanation line and a section heading. The founder then said in the session "why we even need this its self explantory". Applied in canvas version 48: both are removed, and the entry reads only "Main chat" (the old "whole PRD" tag is gone too). A detail for the boards, not for the PRD.

### 2026-10-11, canvas comment on a completed question in Priya's list

> need to add a view answer before claim if i want to view and maybe edit something

Applied in canvas version 46, on the desktop and phone boards: a question Maya marked complete shows two buttons, "View answer" and "Claim answer". View answer opens a review in the right panel: the question, Maya's answer in an editable box, what it changes, the point to discuss, an optional "Note for the AI", and Claim answer. Claiming from there sends the brief as Priya's message with "I changed it to" when she edited the answer and "My note" when she wrote one. The AI records the edited answer and says it will tell Maya the final wording. "Claim answer" in the list still claims at once, unchanged.
- **[PRD]** Before claiming, the developer can view the NGO's answer and edit it or add a note; the edit and the note go into the claim brief, and the NGO is told the final wording.

### 2026-10-11, canvas comment on the brief card

> post claim this should be seen as blue Priya reply to the AI

Asked whether the brief should land in Priya's input box as a draft or be sent at once, the founder chose "Sent at once as hers". Applied in canvas version 45, on the desktop and phone boards: pressing Claim posts a blue Priya message, "I claimed Maya's answer for <section>. Brief:", followed by the brief (question, Maya's answer, how she got there, what it changes, the point to discuss). The AI then replies: it records the answer in the section, raises the revision, and asks about the open point (for retention: should the export follow the same rule) before Priya confirms. The amber brief card of version 44 is gone. This replaces the version 44 ruling above; the order is still Priya first, then the AI.
- **[PRD]** Claiming an NGO answer sends the brief as the developer's own message to the AI; the AI answers it, records the answer, and raises any open point.

### 2026-10-11, canvas comment on the AI turn after a claim

> after dev claims its his turn to post to the AI not the other way around since somethihng will be done to continue pushing the PRD fwd

Applied in canvas version 44, on the desktop and phone boards: claiming no longer starts an AI request. The brief appears in the main chat as its own amber card ("Brief from the AI · Maya answered · <section>"), with no cost and no PRD change. The input hint says "Maya's answer is in the brief above. Tell the AI what to do with it." Only when Priya posts does the AI record the answer in the section, raise the revision, and mark the section ready to confirm. Until then the section stays Draft, its line reads "Claimed · Priya tells the AI how to use it", and the Close PRD list shows "1 claimed answer to take forward with the AI". This refines the version 42 ruling above.
- **[PRD]** Claiming an NGO answer posts the brief only. The AI changes the PRD after the developer's next message, not on the claim itself.

### 2026-10-11, canvas comment on the AI's reply in Maya's side chat

> well i guess the reply i got here is just becaude of the mock as i expect to have a discussion here where the AI would help me here

Answered in the session: yes, the one canned reply was a limit of the mock. In the product the AI discusses the question with Maya. Applied in canvas version 43, so the board shows it: after Maya's first answer the AI asks one real follow-up (for retention: does "contact details" mean email and phone only, and may shift history be kept without names); after her second message it sums up both and suggests marking the answer complete. Both messages go into the answer that Priya's brief shows. A detail for the boards, not for the PRD; the contract already has the AI help the NGO answer.

### 2026-10-11, canvas comment on the claimed-answer card in the main chat

> when claiming the ai should present here in the chat a brief for a discussion between the dev and the ai. we dont need to open maya side chat

Applied in canvas version 42, on the desktop and phone boards: claiming an answer no longer adds the amber card with "Open Maya's side chat". The AI's next turn in the main chat carries a brief: the question, Maya's answer, how she got there (messages with the AI, then marked complete), what it changes in the PRD, and, where there is one, a point to discuss (for the retention question: should the coordinator's export follow the same rule). The AI then asks Priya to settle the point there and confirm the section. The Answered list in the right panel jumps to this brief.
- **[PRD]** Claiming an NGO answer makes the AI post a discussion brief in the developer's main chat (question, answer, PRD impact, open points). The developer does not need the NGO's side chat to continue.

### 2026-10-11, canvas comment on "Mark answer complete"

> after pressing this NGO should be brought back to the "All questions" section

Applied in canvas version 41, on the desktop and phone boards: pressing "Mark answer complete" closes the side chat and shows Maya the question list, where that question now reads "Complete · waiting for Priya to claim". A detail for the boards, not for the PRD.

### 2026-10-11, canvas comment on the people list of the desktop board

> this takes to much realestate

Applied in canvas version 40: the "People in this PRD" cards become one row, "People" followed by three small colored circles (AI, P, M). Each circle shows the name and role on hover and to screen readers. A detail for the boards, not for the PRD.

### 2026-10-11, in the session: only Priya starts questions

The founder commented "i dont understand this" on the "Handed to you by Maya" card, asked "what is the side chat ?", and then described the flow:

> but the flow is that dev send questions to NGO. NGO can talk with AI to clarify the question once done this should appear on the dev board who can claim it to main board to continue finalizing this aspect

Asked what to do with the flow where Maya starts her own question, the founder chose "Remove it".

Applied in canvas version 39, on the desktop and phone boards: "Ask the AI a question", "Hand to Priya", "Handed to you by Maya" and Maya's own question chats are gone. The flow that stays: Priya posts a question to Maya; Maya opens it and clarifies and answers it with the AI in that question's side chat; she marks it complete; it shows on Priya's panel to claim; claiming brings it into the main chat, where Priya and the AI finish that part of the PRD.
- **[PRD]** The NGO person does not start questions. This replaces the two rulings below about Maya asking Priya (version 29) and Maya asking the AI with a hand-off (version 38); their [PRD] marks are withdrawn. The ruling that Maya's side-chat AI messages are paid from the PRD funds stays.

### 2026-10-11, in the session: Maya asks through the AI, with an optional hand-off

> the thing with letting NGO and dev talk to each other is AI being out of the loop. better to let them communicate through the AI with optional handoffs

This replaces the direct thread between Maya and Priya from version 29. Applied in canvas version 38, on the desktop and phone boards:
- Maya presses "Ask the AI a question". The AI answers in a side chat from the PRD and the Discovery document. Many questions end there; a sample one on the board does ("Will our volunteers need to install an app…?").
- When only Priya can decide, Maya presses "Hand to Priya". The AI writes a short summary. Priya sees it under "Handed to you by Maya", with a Claim button. Priya does not see Maya's chats that were never handed to her.
- Claiming puts an amber card and an AI turn in Priya's main chat: the summary, the section it touches, and "What should I tell Maya and record in the PRD?". Priya answers there. The AI records it in the PRD (a confirmed section goes to Needs review), and posts "Priya answered: …" in Maya's side chat.
- Priya never writes in Maya's side chat, and Maya never writes in the main chat. Every message between them goes through the AI.
- Priya's Questions badge counts answers to claim plus questions handed to her.
- **[PRD]** The NGO person can ask the AI about the PRD in a side chat of their own, paid from the PRD funds. They can hand a question to the developer; the AI summarizes it, the developer claims it and answers in the main chat, and the AI records the answer and posts it back to the NGO's side chat. There is no direct message between the two people. This replaces the direct-thread [PRD] mark of version 29.

### 2026-10-08, in the session: Maya's side chats, Maya asks Priya, the phone board

The founder answered the two open points and asked for the phone board: "update phone board", "paid from PRD funds", "Maya can ask Priya on her own", and on the Codex review, "codex we will do later".

- Maya's side-chat AI messages are paid from the PRD funds. The boards already worked this way; no board change.
- Applied in canvas version 29, on the desktop board: under the questions for Maya, a second list. Maya sees "Your questions for Priya" and an "Ask Priya a question" button. Priya sees "Questions from Maya · N waiting". Each question opens a thread in the right panel where Maya and Priya write to each other. The AI does not answer in this thread, so it costs nothing. Priya's reply marks it "Priya replied"; a new message from Maya makes it wait for Priya again. Priya can press "Discuss in the main chat", which puts the question into her main chat input, because only Priya talks to the AI about the PRD. A sample question from Maya is on the board, waiting for Priya.
- Choices made by the designer, not by the founder, open for the founder to change: the thread is between the two people with no AI; a question from Maya never blocks Close PRD; Priya can take it to the main chat but the thread itself does not change the PRD.
- Applied in canvas version 29, the phone board is rebuilt on the desktop board's logic. It opens as Maya, with the same "Prototype only" switch. Three tabs at the bottom: Chat (the main chat; Priya writes, Maya reads), PRD (progress, the Close PRD list, the sections, the funds gauge; a section opens full screen with its card and its own chat), and Questions (the questions for Maya with their side chats, the Answered list, and Maya's questions for Priya). The Questions tab has a badge: for Maya, questions she can answer; for Priya, answers to claim plus Maya's questions waiting for a reply. On the phone, opening a question opens its side chat; it does not jump to the chat.
- **[PRD]** The NGO person can ask the developer a question of their own, in a direct thread without the AI. The developer replies there, and brings it into the main chat when it changes the PRD. The NGO's AI side chats are paid from the PRD funds.
- The Codex review (skill step 3) waits until the founder asks for it.

### 2026-10-08, in the session: materialization splits in two

The founder: "the thing is that from our experice working here UI design chnages quite a bit of PRD so the question if not to postpone the materlize step post the UI screens step". Asked for options, the founder answered "send this for advisory review by fable". The Fable advisory recommended a split: write at PRD close only what UI Design needs as input and what the NGO should see (requirement items with stable ids, the screen list); write what UI Design changes (acceptance cases, work plan, development items) once, after sign-off, as a second pass of the same process keyed on the same requirement ids; raise the PRD revision once per screen sign-off; the NGO sees the requirement list at PRD close, the screens during UI Design, progress per requirement after the build plan, and never the work plan or development items. The founder chose "Split in two (Fable's pick)".

Applied in canvas version 28: the materialize board has three steps (PRD and requirements, PM board, UI Design screen list), its PM board cards say acceptance cases come with the build plan, and the process bar on both boards reads Intake, Discovery, Volunteer match, PRD, PRD materialize, UI Design, Build plan, Build, Handoff.
- **[PRD]** PRD materialize writes only the PRD, the requirement items and the screen list. A new "Build plan" phase after UI Design writes acceptance specifications, decomposition manifests, development items and build instructions from the post-design PRD, keyed on the requirement ids from PRD materialize. Each screen sign-off raises the PRD revision once and reruns the completion check. This changes REQ-036 and the Design contract (screen sign-off no longer creates the UI development item; the build plan does).
- Not drawn: the Build plan phase itself, which belongs to a later screen.

### 2026-10-08, in the session: a different view once the screens exist

> the thing is that once we have the screens the UI should chnage its structure and the view for the team should be different where we can see as NGO the project cadence ' the board progressions etc...

On how to handle it here: "yes i want to have a new item for that . what is the build plan screen ?". Not part of this item. Known gap: after the build plan, the project opens on a project page (REQ-010, project page and work-pace stats): stages, PM board progress per requirement, work pace, blockers, and the read-only PRD and screens. A "Screen design: Project page" item was drafted in the session for the founder to file. The build plan is described in the session as a second run of the materialize board, not a separate screen design.

The founder then set the role of the task board: "the linear useage is an under the hood thing. where dev can utilize it to progress items for developemnt and ngo to read only and gaguge progress on this level". This confirms the boards as drawn: the developer moves development items in Linear ("Open in Linear" on the PM board is the developer's only); the NGO sees a read-only PM board inside ai4good with progress per requirement, and never sees the word Linear or the development items. No board change. It also applies to the project page item.

### 2026-10-08, in the session: the PM board after materialization

> PRD materlization should show a view of the linear PM board post process

Applied in canvas version 27, on the materialize board: when all steps are complete, the step list folds to "6 of 6 steps complete · Show steps", and a PM board appears below it with Backlog, In progress and Done columns. The 6 PM requirements start in Backlog; each card shows its id, title, acceptance case count with "Not run", and "Needs UI Design" where a screen review comes first. Priya gets "Open in Linear". Maya sees the same board with no link, because the NGO never uses the task system directly, and never sees the development plan.
- **[PRD]** PRD materialize shows the resulting PM requirements board once the package is complete, to both the developer and the NGO.

### 2026-10-08, in the session: no turns and no handover; NGO questions run in side chats

The founder asked how an NGO answer to a blocking question works while the developer is on another topic, then concluded "so the entire handover idea is not realy helpfuk", and set the model:

> it could be the an answer will have a number of turns on a side chat for the NGO this is ok as long as it completes. so the idea is that the question on the side panel are posted by the dev (with ai help) answered on a side chat by NGO and claimed and may be progressed by the dev. in case its claimed the main chat should bring that to context of the turns to complete the discussion? or be integrate to the PRD from the side chat >

and then confirmed: "so the floow is that the dev once clained the question its being brought to the main chat for contiunue discussion and neen taken out from the open question side panel ?>". In the confirmation question that followed, the founder chose "Build it; closed 'Answered' list".

Applied in canvas version 20, a rebuild of the desktop board:
- No turn and no handover. Only Priya talks to the AI in the main chat. Maya reads it and browses topics.
- The AI suggests a question for Maya in the main chat; Priya presses "Post to Maya", and it enters the side list.
- Maya opens a question and answers in a side chat with the AI, over as many messages as she needs, then marks the answer complete.
- Priya claims a complete answer. It leaves the open list for a closed "Answered" list, an amber card with the answer appears in the main chat, and the AI updates the PRD there. Pressing an answered question goes to its card.
- Close PRD appears when every required topic is confirmed, which needs every blocking question claimed. An optional question can stay open.
- A dashed "Prototype only · view as" switch in the top bar plays Priya or Maya on one board. It is not part of the screen. The two boards signed in as Maya are removed.
- **[PRD]** This replaces the contract's model of one active human, accepted handovers, read-only inactive humans, and inline Handoff to NGO and Hand back to Dev. It also removes the rule that NGO questions wait for a handover. The rulings below about the turn panel, the handover states, and messages queued during a reply were made under the old model: the turn panel is gone, and the queue now applies to Priya's main chat only.
- Version 21 adds three earlier days of chat history with day dividers, at the founder's request "populate much more into the chat history to have it beefy".
- Version 22, after the founder asked "how dev can complete the PRD to go to the next step ?" and chose "Checklist in the PRD panel": under the topic progress, a Close PRD box lists what is left (topics not confirmed, blocking questions not posted, waiting for Maya, answers to claim, the completion check), with a disabled Close PRD button that turns active when the check passes. Maya sees the list and "Only Priya can close the PRD." **[PRD]** Close PRD is also reachable from the PRD panel, with the remaining conditions listed, not only inline in the AI's completion message.
- Not drawn yet: a failed completion check with named gaps.

### 2026-10-08, in the session: the AI marks a section ready, Priya confirms it

The founder asked "i dont understand the design idea arounf the left side bar. explain". After the explanation, on how to read the PRD: "i think pressing an item should allow dev to get this part of the doc. review it and he can confirm it. its not clear who is reposnsible for chnaging the states of the sections states". On who changes the states: "i would like the ai to assist here in case the section is ready accorindg to its logic".

Applied in canvas version 23, on the desktop board:
- Pressing a topic opens that PRD section above the chat: its full text, its sources, its state, and what is left. The chat below shows only that section's messages.
- States: Open (no text), Draft (the AI is writing it), Ready to confirm (set by the AI when its logic finds every decision recorded), Confirmed (set only by Priya with "Confirm section"), Needs review (Priya pressed "Reopen for review").
- Each confirm and reopen shows as a short line in the chat, for example "Priya confirmed Users and roles · revision 4".
- The completion check runs when Priya confirms the last section. Reopening a section after a passed check withdraws Close PRD until the sections are confirmed and the check passes again.
- The Close PRD box lists "N sections ready for you to confirm" separately from sections still being written.
- **[PRD]** The contract says the AI updates topic states from recorded answers and that confirmation is part of the recorded conversation. Now the AI only proposes a section as ready, and the developer confirms each section explicitly; the developer can also reopen a section.
- Not drawn yet: a changed answer that turns a confirmed section to Needs review on its own.

### 2026-10-08, in the session: each section gets its own chat, in a tab

The founder said "i dont realy get the chat interfgace after pressing a draft item on he PRD section", and on what pressing a section should do: "it should be a side chat(new) created for this with current PRD  and discovery docs as context." In the follow-up question the founder chose "Tab in the middle" and "One per section, kept".

Applied in canvas version 24, on the desktop board:
- The middle column has tabs: "Main chat" plus one tab per opened section, each with a state dot and a close button.
- Pressing a section on the left opens its tab. The tab has the section card at the top (text, sources, state, Confirm or Reopen) and the section's own chat below. A line says the AI there sees the current PRD and the Discovery document.
- One chat per section, kept: reopening a tab continues it. Only Priya writes; Maya reads.
- The two shift questions now live in the Shift scheduling rules chat. The main chat points to it with "Open the Shift scheduling rules chat".
- Each change made in a section chat adds a line to the main chat, for example "Technical scope updated in its section chat · Open".
- Changing a confirmed section in its chat turns it to Needs review and withdraws a passed completion check.
- The main chat stays for the whole PRD and no longer filters by topic. The topic filter of version 23 is gone.
- Version 25, after a canvas comment on the context line above the section chat ("this is not needed"): the line is removed. The AI's first message in each section chat still says what it reads.
- Version 26, after a canvas comment on the tab bar ("not needed here side panel browing is enough"): the tabs are removed. The left panel is the only way to switch: a "Main chat" entry at the top of the section list, then one entry per section. The middle column shows whichever is selected. This replaces the "Tab in the middle" choice above.
- **[PRD]** The contract's "selecting a topic focuses the same chat on its linked messages" becomes a separate, lasting chat per PRD section, with the current PRD and the approved Discovery document as the AI's context.
- Not decided yet: whether Maya's side-chat AI messages are paid from the same PRD funds (the board assumes they are), and whether Maya can ask Priya a question of her own.

Rulings marked **[PRD]** change the contract or are a big change or addition. They go to the PRD and to `design/prd-ui-contract.md` at step 6, after the founder confirms them.

### 2026-10-08, canvas comment on the PRD panel of the desktop board

> its not clear who is the NGO for this part and who is in charge according to the handover states. also open question to NGO should be aggregated on a side panel and allow the dev to continue with the PRD as long as a question is not a blocker for his progression

Applied in canvas version 5, on the desktop board:
- A right-hand side panel. At the top, "Who has the turn": the active person's name in their color and the current handover state. Below it, "People in this PRD": the AI; Priya Shah, the developer; and Maya Levi, the NGO coordinator of Harbor Community Kitchen. Each person shows "Has the turn" or "Reads only".
- "Questions for Maya (NGO)" in the same panel, collected in one list. Each question names its topic and is marked "Blocks <topic>" or "Not blocking". Its status moves from Queued, to Asked when Maya has the turn, to Answered or Still open.
- A third question that blocks nothing (the logo on reminder emails). It stays queued while Priya works, and leaving it unanswered does not stop the PRD from closing.
- **[PRD]** NGO questions are collected in a side panel, each marked as blocking or not blocking. Priya keeps working while they wait, and the AI recommends a handover only when the blocking questions are all that is left. The contract already says NGO questions stay queued while Dev can make useful progress; the side panel and the blocking mark are the addition.

Not yet applied to the phone board.

### 2026-10-08, canvas comment on the bookmark buttons of the desktop board

> there should be 2 bookmarks one in Maya color and one with dev color. pressing each focus the user on the location of that place in the chat

Applied in canvas version 6, on the desktop board: both bookmarks always show, filled in the actor's color (blue for Priya, amber for Maya). Before Maya's first message her bookmark shows "Maya has not written yet", with a dashed amber outline, and cannot be pressed. Pressing a bookmark leaves any topic focus, scrolls the chat to that person's last message, moves keyboard focus to it, and rings it in the actor's color for a moment. The contract already requires the two colored bookmarks; this is a detail for the boards, not for the PRD.

### 2026-10-08, second canvas comment on the bookmarks

> this should only be a small icon of a bookmark with color pressing it jsut send me to the chat location of the current turn the user (nog or dev) are curretnly at

Applied in canvas version 8, replacing the labelled buttons of version 6: each bookmark is a small bookmark icon in the actor's color, with no text (the name is in its accessible label and tooltip). Pressing it goes to that person's latest turn in the chat and rings it. Maya's icon is an amber outline that cannot be pressed until her first message. A detail for the boards, not for the PRD.

### 2026-10-08, third canvas comment on the bookmarks

> it should always be clicakble there shouldnt be a state like transperncy here. when i press it in case of NGO and it at the start it just send me to the start

Applied in canvas version 9, replacing the outline state of version 8: both bookmark icons are always solid and always clickable. If a person has no turn yet, their bookmark goes to the start of the chat. A detail for the boards, not for the PRD.

### 2026-10-08, canvas comment on a question in the NGO list, on the board signed in as Maya

> pressing a question should take the chat for the NGO to the exact location in the chat history where this question got introduced

Applied in canvas version 19, on all desktop boards: each question for Maya is raised in the chat at the AI turn that first needed it, as a dashed amber card that says whether it blocks and its state (queued, Maya can answer now, answered, still open). The retention question comes from the first AI turn, the optional logo question from the notifications turn, and the success question from the shift-questions turn. Pressing a question in the side list always goes to that card and rings it, for Priya and for Maya, whatever the phase. This replaces the version 7 targets. A detail for the boards, not for the PRD.

### 2026-10-08, canvas comment on the cost line under an AI reply

> why we have it here ?

Answered in the session: it was the per-reply receipt (provider cost, platform fee, total) the contract asks for. The founder chose "Remove it from the chat" from three options (remove, developer only, total only). Applied in canvas version 18: no cost line under AI replies for anyone. The funds gauge keeps the running total.
- **[PRD]** The contract says the receipt shows provider cost, platform fee and total deducted separately. The chat no longer shows a receipt. The per-reply detail stays in the ledger and can appear on a later spending page, which is not part of this screen.

### 2026-10-08, in the session: how the topic list is filled

The founder asked "how should the left side panel is populated" and chose "AI derives all of them" from three options (a fixed core plus AI topics, all from the AI, the AI proposes and the developer edits). This confirms the contract as written: the AI derives every required topic from the approved Discovery document, with no fixed core, and the list changes only with a recorded reason and revision. No board change and no PRD change.

### 2026-10-08, canvas comment on the funds gauge

> too much info

Applied in canvas version 16, on the desktop board: the gauge is the title "PRD funds", the colored bar (green, yellow or red, with pending hatched), and one line, for example "$3.87 left of $20.00 · $0.55 pending". The pending part shows only while an amount is on hold. The spent column and the "% used · band" line are gone.
- **[PRD]** The PRD and the contract say the gauge shows spent, available and pending funds, with text as well as color. The screen now writes only available and pending; spent shows as the bar. The color thresholds (80% and 95%) are unchanged.

### 2026-10-08, canvas comment on the Design stage in the process bar

> this is UI Design

Applied in canvas version 15, on both desktop boards: the stage after PRD materialize is named "UI Design" in the process bar, on the materialize board's card and button ("Open UI Design"), and in the screen-list step.
- **[PRD]** The workspace phase called "Design" in the PRD, the PRD contract and the process bar of `design/ui-ux-instructions.md` is named "UI Design". The Design contract (`design/design-ui-contract.md`) is a different screen; a rename there is a known gap until its own design item.

### 2026-10-08, in the session: messages sent while the AI is answering

The founder asked "do we have queue of messages in case we send a message before a response ?" and chose "Queue the messages" from three options (block sending while the AI answers, queue, merge into one request).

Applied in canvas version 14, on the desktop board: an AI reply shows "Answering…" for a moment before its text. Pressing Send during that time adds the message to a "Queued" strip above the input box, where it can be edited (back into the input box) or removed. When the reply ends, the first queued message goes out on its own as a separate request, with its own cost; the rest follow one by one. Accepting a handover waits until the reply ends. A free-text message can now be sent at any time while you have the turn, not only after answering questions.
- **[PRD]** Messages sent by the active human while the AI is answering are queued and sent in order, each as its own paid request. The queued messages can be edited or removed until they are sent.

### 2026-10-08, canvas comment on the reserve line under the input box

> whats this ?

Answered in the session: it showed the amount held back before each AI request until the provider reports the real cost. The founder chose "Remove it" in the question that followed. Applied in canvas version 13: the line is gone. The hold still shows as Pending in the funds gauge, and each AI reply still shows its cost. A detail for the boards, not for the PRD.

### 2026-10-08, canvas comment on the queued-questions note in the chat

> why this is here ?

Answered in the session: the dashed note was left over from before the side panel and repeated it. Applied in canvas version 12: the note is gone. The AI turn that queued the questions says so in one line, and pressing a queued question in the side panel goes to that turn. A detail for the boards, not for the PRD.

### 2026-10-08, in the session: the bookmarks come out

The founder doubted the bookmarks ("not realy sure about the bookmarking thing at all. what purpose does it serve"). A Fable advisory found no real job for "jump to a person's last message": the developer's last message is at the bottom of the chat, a returning NGO person needs what is new since their visit, and the question list and handover lines already cover finding things. It recommended removing them. The founder ruled:

> well in case NGO want to track the dev progress for the discussion it can set a bookmark manually on the place it left but i agree this is a nice to have and not needed for PoC

Applied in canvas version 11, on the desktop board: both bookmark icons are removed. The jump-and-ring behavior stays for the NGO question list.
- **[PRD]** Remove the contract line that gives each human a colored bookmark to their last authored turn. Later, not for the proof of concept: the NGO person can set a bookmark by hand where they left off, to follow the developer's progress.

### 2026-10-08, canvas comment on the effort selector

> remove effort

Applied in canvas version 10, on the desktop board: the effort selector is gone from the input box, human turns no longer show "Effort", and receipts no longer name an effort. Every request uses one fixed setting.
- **[PRD]** The PRD and the contract say the active human picks Low, Med, High, Xhigh or Max for each request, Med by default, and that history keeps the submitted effort. This ruling removes that choice from the screen. The fixed setting each request uses is not decided here.

### 2026-10-08, canvas comment on a question in the NGO question list

> what happens when NGO answers ?
> when a dev press the answer the chat should focus on the turn the question apperaed

Answered in the session: when Maya answers and sends, her turn appears in the chat in amber, the AI confirms the topics her answers resolve (progress goes to 6 of 6), each question in the side list changes to "Answered by Maya: <answer>", and the AI recommends handing back to Priya.

Applied in canvas version 7, on the desktop board: each question in the side list is a button. Pressing it leaves any topic focus and scrolls the chat to where the question appeared, with a ring for a moment: the queued note while Priya has the turn, the live question card while Maya has the turn, and the handover turn that listed it afterwards. An answered question also has "Show Maya's answer in the chat", which goes to Maya's turn. A detail for the boards, not for the PRD.
