# PRD conversation and progress contract

Status: accepted behavior for implementation, 2026-09-21; revised 2026-10-14 from the approved screen design.
Source: the founder's PRD conversation review and request to update the PRD and development board.
The 2026-10-14 revision follows the screen design rulings in `design/canvas/prd-workspace/review.md`.
The approved canvas copy in `design/canvas/prd-workspace/project/` is the visual target for screen build.
This contract supersedes the earlier automatic score-to-backlog flow for PRD authoring.
The [Design contract](design-ui-contract.md) continues to govern the next workspace, UI Design.

## Entry and actors

The approved Discovery revision supplies the scope contract and known answers.
Kickoff retains the PM requirement items and the Author the project PRD bootstrap item.
The developer pulls the bootstrap before authoring work. Missing attribution never bypasses or adds a spending gate.

AI, Dev, and NGO share one versioned PRD. The developer drives it.
There is no turn ownership, no handover, and no read-only human: both humans work at the same time.
Only Dev writes in the main chat and the topic chats, posts NGO questions, confirms topics, and closes the PRD.
The NGO reads the main chat and the PRD, and writes only in the side chats of questions posted to it.
The backend enforces membership, each role's actions, and the conversation revision on every mutation.

Use purple for AI, blue for Dev, and amber for NGO throughout the thread.
Retain actor names and icons, so color is never the only identifier.
There are no bookmarks to an actor's last turn.
Retain long history, events, and exact source links when earlier turns are collapsed.

## PRD topics as a progress navigator

The current PRD panel shows the document outline and progress by topic.
Topics describe the product, for example Users and roles, Approval rules, Data handling, and Success criteria.
They are PRD headings, not development tasks.
Derive the initial required topics from the approved Discovery scope.
Keep stable topic identifiers. Record the reason and revision when the required topic set changes.
Conditional questions belong to their topic. They do not silently increase the progress denominator.

| State | Meaning |
| --- | --- |
| Open | The topic has no proposed PRD text yet and still has required questions. |
| Draft | The PRD contains proposed text that still needs a decision. |
| Ready to confirm | The AI found that current evidence resolves every required decision for this topic and supports its text. |
| Confirmed | The developer confirmed the topic. |
| Needs review | The developer reopened it, or a changed answer, constraint, source, or completion-check gap invalidates part of an earlier confirmation. |

Show blockers separately from the topic state, and name the human who can answer an unresolved prerequisite.
Show the number of confirmed required topics out of the total required topics.
If a percentage is shown, derive it from those counts.
Message counts, fuel consumption, and the scorer's coverage score are separate measures.

Each topic has its own lasting chat with the AI. Its context is the current PRD and the approved Discovery document.
Opening a topic shows the topic as a document at its current revision: its text with every assimilated decision, its sources, and, for the technical scope, its user stories.
The document does not list the conversation history. The topic's chat sits below it, and the developer completes the topic there.
On the phone, the document and the chat form one page with one scroll that opens at the top of the document.
A request carries the topic identifier and current PRD revision.
The main chat keeps the chronological history across topics, and messages can link to more than one topic.
Topic selection, history navigation, and source links make no model call and spend no money.

The AI updates topic text and state from recorded answers and decisions, with source links.
The AI only proposes Ready to confirm. The developer confirms each topic with Confirm section, and can reopen a confirmed topic.
A suggestion, a topic click, or a generated paragraph cannot confirm a human decision by itself.
If a decision changes, mark affected dependent topics Needs review and recalculate progress.
Preserve unaffected confirmations.
Confirming one topic never closes the whole PRD or changes a PM requirement's build status.

## Dependency-based questioning

Apply the dependency-first questioning method already used in Discovery.
Questions record prerequisites, answer authority, state, source answers, and affected PRD topics.
Reuse approved answers. The AI obtains accessible technical facts instead of asking humans to repeat them.
Ask independent ready questions together. Wait for prerequisites before asking dependent questions.
Explain why a question matters now and offer a suggested answer where useful.
Keep uncertain answers open. Do not turn a suggestion or silence into an accepted decision.
After an answer, recompute the questions and affected PRD text from that answer.

The AI advances useful work with the developer across topics.
When a decision needs the NGO's knowledge or authority, the AI suggests a question for the NGO in its reply.
Selecting a blocked topic exposes its blocker; it does not bypass prerequisites.

## NGO questions

Only the developer posts an NGO question, from the AI's suggestion. The NGO never starts a question.
Each posted question is marked blocking or not blocking and appears in the question list. The developer keeps working while it waits.
The NGO answers each question in a side chat with the AI, paid from the PRD funds.
The AI asks real follow-ups and answers the NGO's questions about the question there.
Mark answer complete stays off while the AI's last message to the NGO is an unanswered follow-up, with the line "Answer the AI's question first."
On Mark answer complete, the AI writes one clean answer from the whole side chat and sends it to the developer at once.
The NGO returns to the question list, where the question shows the answer that was sent. The NGO does not edit a draft answer during the chat.

On a completed answer, the developer has View answer and Use answer.
View answer lets the developer edit the answer and add a note for the AI before using it.
Use answer posts a brief (question, answer, PRD impact, open points) as the developer's own message in the main chat.
The AI records the answer in its topic and raises any open point. A note settles the point and is written into the topic.
If the developer changed the wording, the AI tells the NGO the final wording.
Used answers move to an Answered list; selecting one shows its brief in the main chat.

## Recommendations

Ordinary AI continuation presents questions without a Keep working or Continue button.
An actionable recommendation appears inline in the current AI reply only when it proposes a state change.
It names the reason and links the relevant topics and source turns.
Bind every recommendation to the conversation revision and PRD revision.
Changed answers invalidate stale actions in history and in other browser tabs.
The backend rejects replayed or unauthorized actions without extra events or model charges.
Preserve each human's draft across reload.

Messages the developer sends while the AI is answering are queued and sent in order, each as its own paid request.
A queued message can be edited or removed until it is sent.

## Effort and USD usage

The composer has no effort selector. Each request uses a fixed service configuration, which is not decided yet.
Automatic scoring and the planning package use an explicit service configuration.
Validate the configured model's capabilities and record the effective provider parameters.

The backend sends PRD model requests through OpenRouter. Credentials stay on the server.
PRD uses USD fuel. Discovery's free turn allowance does not continue into PRD.
Read OpenRouter's reported cost from the completed response, including the final streaming usage message.
Settle once per provider generation identifier, associated with a stable application request identifier.
Preserve fractional cents and distinguish a reported zero cost from missing cost.
If usage is missing, retain the reservation, display Pending cost, and reconcile by generation identifier.
Do not issue a second generation merely to retrieve the first generation's cost.

Retain the existing platform fee from the ledger requirement.
The chat shows no receipt under each reply. Provider cost, platform fee, and total deducted stay in the ledger for a later spending page.
Admission reserves a bounded amount from available PRD allocation before a paid call.
Release unused reservation after settlement. Reconcile corrections without duplicating consumption.
Revocation, project binding, and funding checks apply before dispatch.

The PRD gauge covers this phase only. It writes available and pending USD as text and shows spent as the bar.
Use the unrounded consumed percentage: green below 80%, yellow from 80% through 95%, and red above 95%.
Red alone does not block a funded request.
Keep pending reservations distinct from settled spend and subtract them from available funds.
Topic navigation and viewing the current PRD do not consume fuel.

## Close and continue to UI Design

The process bar reads Intake, Discovery, Volunteer match, PRD, UI Design, Build plan, Build, Handoff.
These are workspace phases, not new project lifecycle enum values.
Only Dev can close the PRD, and Dev can close it at any time.
The PRD panel lists what is still open (topics not confirmed, blocking questions not posted or waiting, answers to use, completion-check gaps) above a Close PRD button that is always available to Dev.
The AI's completion message also offers Close PRD.

The completion check (the scorer) checks stories, acceptance criteria, data handling, and constraints against approved Discovery, and names gaps.
It runs when all required topics are confirmed, and when Dev presses Close PRD unless it already passed for the current revision.
Keep the configured threshold open until its existing configuration decision is resolved.
Gaps, unconfirmed required topics, and open blocking questions are a warning, not a block: the AI lists them with Close anyway and Keep working.
Each gap links to its topic, and the topic goes to Needs review until Dev fixes it in the topic chat and confirms it again.
Close anyway closes the PRD and records the open points in the closed revision.

Closing freezes the PRD revision and opens UI Design. The workspace becomes read-only.
The banner reads "PRD closed at revision N · UI Design starts from it", with "with K open points" when Dev closed anyway, and Open UI Design for Dev.
UI Design takes its screen inventory from the closed PRD. Nothing is written to the board at close.

After the last screen sign-off in UI Design, one background job writes the planning package once, using the ai4good planning structure:

- The PRD and isolated requirements, linked to Discovery and conversation decisions.
- Acceptance specifications with stable identifiers, traceability, and explicit Not run execution status.
- Decomposition manifests with session-sized work, dependency relations, and acceptance coverage.
- The Linear PM requirement items and development plan, with stable links to repository artifacts.
- The build workflow instructions for item pickup, briefs, branches, worktrees, verification, and completion evidence.

Its progress, a stop, and Retry belong to the end of UI Design.
Update kickoff-seeded PM requirements in place; do not create duplicate requirements.
Generate the development plan from the frozen PRD and the signed-off screens, never directly from Discovery.
Use the existing task-management writer and preserve PM and development tree separation.
No package generation, acceptance specification, or screen sign-off proves implementation or passing tests.
Register executable acceptance cases through atTest during their implementation and maintain the expected-result manifests.

Track the job's steps, output links, source revision, and failures.
Resume failed steps for the same package without duplicate issues, files, events, or billed generations.
Do not label partial output complete.
A changed source requires a new revision; stale jobs cannot publish the new revision's results.
The bootstrap completion evidence includes the developer close and the completed package.
Other PM requirements retain their existing implementation and evidence gates.
The NGO can see PRD progress and package status, but never development board contents.

## Verification and reference limits

Use edge functions for all writes and reads that need backend data. UI code never accesses the database or Linear directly.
Test backend permissions as well as visible controls, including stale tabs, duplicate requests, and interrupted streams.
Verify topic chats, cross-topic prerequisites, revised answers, the NGO question flow from post to use, and Close PRD with and without open points.
Verify color boundaries at 79.999%, 80%, 95%, and 95.001%, using the stored values before display rounding.
Verify long history, source links, keyboard navigation, narrow layouts, and both themes.

The approved canvas in `design/canvas/prd-workspace/project/` shows every interaction on sample data, on desktop at 1280 by 900 and on the phone at 390 by 844.
The older [conversation reference](references/prd-grill-me-chat.html) predates the screen design and is kept for history only.
Neither makes live model calls, settles money, writes to Linear, or proves production acceptance.

OpenRouter implementation references checked on 2026-09-21:
[usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting) and
[model reasoning capabilities](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).
