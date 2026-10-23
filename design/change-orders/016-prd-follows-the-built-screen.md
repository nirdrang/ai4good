# Change order 016: the PRD follows the built PRD workspace screen

Date: 2026-10-22. Decision d99. AI4DEV-166 (PRD workspace).

The PRD workspace screen was built on sample data and merged at `f63f589`. A review compared the built screen with REQ-036, its contract, and its acceptance cases, and found drift. The founder ruled that the requirements follow the screen as built, with named exceptions where the screen changes instead. The rulings below were given between 2026-10-17 and 2026-10-22, in the founder's local time. Where the founder chose an option the lead offered, the option text is quoted. Where no founder words are quoted, the line is the lead's record of the ruling.

## Founder rulings

1. The PRD describes the screen as built, except where a ruling below says the screen changes. The founder: "Write to prd. Make sure to sync prd to the screen".
2. Close PRD: the PRD follows the screen. The founder chose "PRD follows the screen (Recommended)". Close PRD is offered to the developer at any time, except while the AI is answering in any chat (the screen shows "Wait for the AI to finish."), and except when no completion check is current for this revision and the funds cannot pay for one.
3. Open blocking questions at close: the screen changes and the PRD keeps its rule. The founder chose "Screen must warn (Recommended)". An open blocking question to the NGO counts as an open point and brings up Close anyway and Keep working.
4. Two readings confirmed. The founder chose "Confirm both (Recommended)". After close, the read-only banner also shows for the developer. The funds color band uses settled spend only, and pending spend shows as text and as a hatched part of the bar.
5. Queueing in every chat. The founder: "Any where when we have a chat interface queue is the mode when user prompts while AI work on the response". A queued plain message can be edited while the input box is empty; a queued Use answer or Close PRD item can only be removed.
6. The notification "PRD gate passed → NGO" is dropped. The founder: "Drop it". The gap report to the developer and "backlog live" stay.
7. Discovery freezes the first time the developer opens the PRD workspace. The founder: "#1 agree".
8. Written into the PRD as built. The founder: "Write to prd". Sources show as plain names on a section page, with no links to source messages. Confirm, Mark answer complete, and Use answer are off in named cases. The Use answer brief rows are written without a pronoun for any person, because the founder's earlier hint ruling forbids assuming a pronoun. The "Changed since you confirmed" summary shows on Needs review. The PRD panel's open list also shows "waiting on another section" and "still being written", and each line opens what it names. Post to the NGO offers no blocking choice; blocking comes with the AI's suggestion.
9. The technical scope section: the founder picked option B. The PRD keeps user stories with nested acceptance criteria, the complexity tier with its rationale and start-small advice, and risk flags; the screen adds them. The completion-check score and the threshold also show as a line on the PRD panel.
10. Lovable. The founder: "Number 2 the entire loveable thing should be dropped this is a delpoy thing that once dev completes a project it can deploy it to a system like loveable that are best suited for ngo to continue operating". This change order removes Lovable from REQ-036 only. The founder files a separate item for the platform-wide removal.
11. The process bar's "Build plan" stage after UI Design stays: it matches the package being written after UI Design. The phase name is "UI Design", not "Design".
12. Run structure. The founder: "All", choosing "One run for the whole tree". The PRD workspace tree runs as one parent run.

## What changes in the requirements

The editable source is `loop/out/pure-s*.md`, assembled into `.taskmaster/docs/prd-mvp.md` and the isolates in `.taskmaster/docs/requirements/`. The text before this change is at `f63f589`.

### REQ-036, in `loop/out/pure-s6-req-027-036.md`

Technical scope, after:

> **Technical scope:** the PRD step, not Discovery, produces the technical scope from the confirmed Discovery document: user stories with nested acceptance criteria; a suggested stack; a complexity tier (small, medium, or large, never in dollars) with rationale and start-small advice; and risk flags. The technical scope section shows the stories with their nested acceptance criteria, the tier with its rationale and start-small advice, and the risk flags. No project or build cost estimate appears.

Removed from it: the Lovable recommendation with rationale, the Lovable-versus-Claude-Code build split, the sentence that v1 always emits both parts (with its roadmap link), and the sentence on the Lovable subscription for maintenance with the link to Lovable's pricing.

NGO questions, after:

> **NGO questions:** only the developer posts NGO questions; the NGO never starts one. Each question is blocking or not blocking as the AI suggested it; posting offers no blocking choice. A posted question appears in a question list, and the developer keeps working while it waits. The NGO answers each question in a side chat with the AI, paid from the PRD funds. The AI asks follow-ups there and answers the NGO's questions about it. Mark answer complete is off before the NGO has written anything in the side chat, while the AI's follow-up is unanswered, while the AI is answering, and when the funds cannot pay for the answer. On Mark answer complete, the AI writes one answer from the whole side chat and sends it to the developer at once; the NGO sees what was sent and does not edit a draft during the chat. The developer can view the answer, edit it, and add a note. Use answer is off while the AI is answering and when the funds are short. Use answer posts a brief as the developer's own message in the main chat, with the rows Question, the NGO's answer, I changed it to (when the developer edited the answer), How the answer was reached, What it changes, To discuss (the open point), and My note. Brief and screen copy name each person and never assume a pronoun for them. The AI records the answer in its topic and raises any open point; a note settles the point and is written into the topic. The NGO is told when the developer changed the wording.

Topic progress and topic chats, the changed sentences, after:

> the current PRD panel shows stable topic headings, required-topic progress, and Open, Draft, Ready to confirm, Confirmed, or Needs review states. [...] Confirm is off until the topic is Ready to confirm or Needs review, while a topic it depends on is not Ready to confirm or Confirmed, and while a completion-check gap on it is open. When confirming would start the completion check, Confirm is also off while the AI is answering and when the funds cannot pay for the check. A topic in Needs review after a change shows one line saying what changed since the developer confirmed it ("Changed since you confirmed: ..."). [...] Sources show as plain names, with no links to source messages.

Removed: "source turns" from the panel.

Recommendations and actors, the queue, after:

> Every chat queues: in the main chat, each topic chat, and each NGO side chat, a message sent while the AI is answering in that chat waits in a queue and is sent in order, each as its own paid request. A queued plain message can be edited while the input box is empty, and removed until it is sent. A queued Use answer or Close PRD can only be removed.

Effort and spending, the gauge, after:

> The USD gauge writes this phase's available and pending funds as text. The bar shows settled spend, with pending spend as a hatched part of it. The color band uses settled spend only, unrounded: green below 80%, yellow from 80% through 95%, red above 95%.

Completion, after:

> **Completion:** the scorer compares the current PRD to the approved Discovery document for the need, agreed answers, open questions, data handling, and constraints, and checks the technical scope for stories with nested acceptance criteria. Each run records a score and named gaps. Use the configured threshold; its value and scorer configuration remain pilot decisions. The PRD panel shows the latest score and the threshold as a line, not only inside the AI's message. A passing score alone changes no board or authoring state. The PRD panel lists what is still open: topics ready to confirm, topics waiting on another section, topics still being written, blocking questions not posted or waiting for the NGO, answers to use, and completion-check gaps. Each line opens what it names. The developer can close the PRD at any time, from the PRD panel or from the AI's completion message, with two exceptions: Close PRD is off while the AI is answering in any chat (the screen shows "Wait for the AI to finish."), and when no completion check ran for the current revision and the funds cannot pay for one. Close PRD runs the completion check first, unless a check already ran for the current revision; a check that passed closes the PRD at once, and a check that found gaps shows its result again without a new run. Named gaps, unconfirmed required topics, and open blocking questions are a warning, not a block: the developer chooses Close anyway or Keep working. An open blocking question to the NGO counts as an open point, so it brings up Close anyway and Keep working even after a passing check. Closing anyway records the open points in the closed revision. Iteration remains bounded by fuel, not attempt count.

After close, the added sentence:

> The workspace becomes read-only, and the read-only banner shows for the developer as well as the NGO.

After close, the notification sentence, before and after:

> Existing gap-report, gate-pass, and backlog-live notifications use the shared emitter (REQ-016); completion notifications wait for the completed package.

> The gap-report and backlog-live notifications use the shared emitter (REQ-016); completion notifications wait for the completed package.

The acceptance criteria list of REQ-036 is rewritten to match: the technical scope without the build split, plain-name sources, no blocking choice at posting, the Mark answer complete rule, pronoun-free brief rows, Confirm off in named cases, the "Changed since" line, the settled-spend band, the queue in every chat, the Close PRD exceptions, the score line, and the read-only banner for both humans.

### REQ-016, in the same file

Before:

> - PRD gate (REQ-036): below-threshold gap report → volunteer (email + in-app); gate passed → NGO (email + in-app); backlog live → NGO (email + in-app).

After:

> - PRD gate (REQ-036): below-threshold gap report → volunteer (email + in-app); backlog live → NGO (email + in-app).

The REQ-016 acceptance file is not amended: AT-016.02 names "the d81 PRD-gate" rows, and two PRD-gate rows remain.

### REQ-004 and REQ-005.5, in `loop/out/pure-s3-req-001-006.md`

REQ-004, Discovery document. Before: "When the matched volunteer starts work in the PRD workspace (REQ-036), Discovery closes:". After: "The first time the matched volunteer opens the PRD workspace (REQ-036), Discovery closes:".

REQ-005.5, kickoff sequence. Before: "the build backlog is materialized only after the passing completion check and developer close (REQ-036)." After: "the build backlog is written only after the developer closes the PRD and the last screen in UI Design is signed off (REQ-036)."

### Stories, REQ-009, REQ-010, REQ-026

- Story 3, `loop/out/pure-s2-problem-goals-stories.md`. Before: "an automated scorer measures PRD completion against Discovery. After a passing check, the AI recommends Close PRD to the developer. Developer-started PRD materialization then creates the planning package and dev-tree decomposition". After: "an automated completion check compares the PRD with Discovery and warns about gaps without blocking. The developer closes the PRD at any time, which freezes it and opens UI Design. After the last screen sign-off in UI Design, one background job writes the planning package and dev-tree decomposition".
- Story 5, same file. Before: "The tree is materialized from the frozen PRD after a passing completion check and developer close (REQ-036)". After: "The tree is written from the frozen PRD after the developer closes it and the last screen in UI Design is signed off (REQ-036)".
- REQ-009, PRD boundary, `loop/out/pure-s4-req-007-012.md`. Before: "active-human authority" and "Scoring and materialization require their own authorized operation." After: "role authority" and "Scoring and the planning package require their own authorized operation."
- REQ-010, private PRD workspace, same file. Before: "the assigned developer and NGO share the PRD conversation, topic progress navigator, and current draft (REQ-036). Topic focus retains one active human. Close PRD and materialization follow the current AI recommendation and developer authority." After: "the assigned developer and NGO share the PRD, its topic progress, the main chat, a chat per topic, and the side chats of the questions posted to the NGO (REQ-036). There are no turns: the developer drives, and the NGO answers the questions posted to it. Only the developer closes the PRD, at any time; closing freezes it and opens UI Design."
- REQ-010, private Design workspace. "after PRD materialization" becomes "after PRD close".
- REQ-026, `loop/out/pure-s5-req-021-026.md`. Before: "PRD materialization also identifies the screens for Design review (REQ-036)." After: "The closed PRD supplies the screens for UI Design review (REQ-036)." Before: "After a passing coverage check and developer close, developer-started PRD materialization creates the plan from the frozen PRD (REQ-036)." After: "After the developer closes the PRD and the last screen in UI Design is signed off, one background job writes the plan from the frozen PRD (REQ-036)."

The Lovable wording in these sections is not changed.

## Acceptance cases

Tagged `[d99]`, no identifier changes:

- `.taskmaster/docs/acceptance/at-req-036.md`: the status line (green at the loop tier, pending at integration except 11 and 12); 04 and 16 (Close PRD availability, the score line, the warning for open blocking questions, the still-open lines); 06 (the read-only banner for Dev); 07 (the settled-spend band, pending hatched); 10 (no gate-passed notification); 11 and 12 (no Lovable and no build split; stories with nested criteria, tier rationale, risk flags); 13 (Mark answer complete off before the NGO writes; the follow-up read from the reply's outcome, not from punctuation); 14 (pronoun-free brief rows; Use answer off cases); 15 (plain-name sources, the "Changed since" line, Confirm off cases, the NGO's section line); 17 (the queue in every chat and its edit rules).
- `.taskmaster/docs/acceptance/at-req-004.md`: AT-004.74, Discovery freezes when the volunteer first opens the PRD workspace.
- `.taskmaster/docs/acceptance/at-req-026.md`: AT-026.08 and AT-026.27, the plan is written after close and the last UI Design sign-off; a passing score is not required.

## Contract edits

`design/prd-ui-contract.md`:

- Entry and actors: sources are not linked; screen copy names each person and assumes no pronoun.
- Topics: sources as plain names; the technical scope section shows nested criteria, tier rationale and start-small advice, and risk flags, with no Lovable recommendation and no build split; Confirm section off cases; the "Changed since you confirmed" line.
- NGO questions: no blocking choice at posting; the open follow-up is read from the reply's outcome; Mark answer complete off before the NGO writes, while the AI answers, and when funds are short; Use answer off cases; the brief rows.
- Recommendations: no source-turn links; every chat queues, with the edit and remove rules.
- USD usage: the bar shows settled spend with pending hatched; the band uses settled spend only.
- Close: the two exceptions to "at any time"; the still-open lines and that each opens what it names; the score line on the PRD panel; open blocking questions warn even after a passing check; the read-only banner for Dev.
- Verification: boundaries of settled spend; the queue in every chat; Close PRD while another chat is answering.

`design/ui-ux-instructions.md`: "after PRD materialization" becomes "after PRD close"; a PRD funds gauge note under the reusable components; a PRD workspace row (28) in the screen table pointing at `design/canvas/prd-workspace/` and this contract.

## Screen changes for the wiring run

Screen wiring (AI4DEV-174) may change the built components for these items, even though wiring normally keeps components fixed. The manifest `loop/decomp/req-036.md` records this.

- Queue in every chat. Today only the main chat queues. Each section chat and the NGO side chat queue the same way, with the same edit and remove rules.
- Open blocking questions warn. Today Close PRD after a passing check closes at once even with an open blocking question. It must bring up Close anyway and Keep working, and Close anyway records the question as open.
- Technical scope section details. Today the section shows the stories. It must also show each story's nested acceptance criteria, the tier with its rationale and start-small advice, and the risk flags.
- Check score line. The PRD panel shows the latest completion-check score and the threshold as a line.
- Pronoun-free copy. "How she got there" becomes "How the answer was reached". The refusal lines "Only Maya marks her answer complete." and "Only Maya answers in her side chat." (`src/lib/prd-rules.ts`) are rewritten without "her".
- The fixture stack line that says Lovable. The sample data in `design/astra/src/prd-fixture-data.ts` has a "Stack: Lovable app on Supabase" line, a "Build split: Lovable builds ..." line, and an AI message suggesting a Lovable app. They are rewritten without Lovable and without the build split.

## Known gaps left open

- Lovable elsewhere. REQ-004, REQ-021, and other requirements, the stories, the roadmap entry RM-15, the design screens, and `.taskmaster/docs/architecture-notes.md` still mention Lovable and the build split, until the founder's separate platform-wide removal item lands.
- The technical scope code. The scope generator (`supabase/functions/_shared/scope.ts` and the Discovery skill that writes the scope) and the executable tests for AT-036.11 and AT-036.12 (`tests/at/suites/req-036/scope.test.ts`) still produce and check the Lovable build split. The amended case text no longer asks for it. The code change belongs to D1.L2, AI4DEV-231 (technical scope section), or to the platform-wide Lovable item.
- The gate-passed notification code. `supabase/functions/_shared/notification-taxonomy.ts` and the oracle `tests/at/suites/req-016/taxonomy.ts` still list `prd_gate.passed`. A code change removes it from both.
- The Design review section of REQ-036 ("Design review after PRD close" and "Design acceptance criteria") still describes one human owning the turn, handover, and per-screen materialization at sign-off. It belongs to the UI Design item and is not rewritten here. The REQ-026 paragraph "UI work from Design sign-off" and the REQ-010 "Private Design workspace" bullet still describe per-screen UI items and NGO handoff for the same reason.
- AT-036.06 covers both the close and the planning package. It stays registered to D6.L1 (Close PRD); its package half has evidence only after AI4DEV-164 (sign-off into Build) writes the package.
- The manifest sync stamp in `loop/decomp/req-036.md` still reads d94. The forward sync updates it.
- `loop/items/AI4DEV-166/planning.md` is a planning record from 2026-09-21 with the old board titles. It is history and is not rewritten.
- The approved canvas in `design/canvas/prd-workspace/project/` is not revised. The coded screen and this contract are the targets.
