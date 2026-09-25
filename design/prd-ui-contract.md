# PRD conversation and progress contract

Status: accepted behavior for implementation, 2026-09-21.
Source: the founder's PRD conversation review and request to update the PRD and development board.
The final clarification makes PRD topics a progress navigator with focused chat.
This contract supersedes the earlier automatic score-to-backlog flow for PRD authoring.
The [Design contract](design-ui-contract.md) continues to govern the next workspace.

## Entry and actors

The approved Discovery revision supplies the scope contract and known answers.
Kickoff retains the PM requirement items and the Author the project PRD bootstrap item.
The developer pulls the bootstrap before authoring work. Missing attribution never bypasses or adds a spending gate.

AI, Dev, and NGO share one conversation and one versioned PRD.
Dev starts as the active human. Exactly one human can send requests at a time.
The other human can read, browse topics, and follow source links.
Viewing a topic never changes turn ownership.
The backend enforces membership, the current human, and the conversation revision on every mutation.
Simultaneous requests and stale browser tabs cannot create two active humans.

Use purple for AI, blue for Dev, and amber for NGO throughout the thread.
Retain actor names and icons, so color is never the only identifier.
Use the active human's color for the composer and turn controls.
Each human has a colored bookmark that jumps to their last authored turn.
Bookmarks do not mean last read, change ownership, or send a request.
Retain long history, handoff events, and exact source links when earlier turns are collapsed.

## PRD topics as a progress navigator

The current PRD panel shows the document outline and progress by topic.
Topics describe the product, for example Users and roles, Approval rules, Data handling, and Success criteria.
They are PRD headings, not development tasks or separate conversations.
Derive the initial required topics from the approved Discovery scope.
Keep stable topic identifiers. Record the reason and revision when the required topic set changes.
Conditional questions belong to their topic. They do not silently increase the progress denominator.

| State | Meaning |
| --- | --- |
| Open | The topic has no proposed PRD text yet and still has required questions. |
| Draft | The PRD contains proposed text that still needs a decision or confirmation. |
| Confirmed | Current evidence resolves every required decision for this topic and supports its text. |
| Needs review | A changed answer, constraint, or source invalidates part of an earlier confirmation. |

Show blockers separately from the topic state.
Needs review takes precedence after an invalidated confirmation. Otherwise, show Confirmed when evidence is complete, Draft when text exists, or Open.
Name an unresolved prerequisite and the human who can answer it.
Show NGO questions queued while Dev remains active and can make useful progress.
Use Waiting for NGO only after an accepted handoff gives NGO the turn.
Show the number of confirmed required topics out of the total required topics.
If a percentage is shown, derive it from those counts.
Message counts, fuel consumption, and the scorer's coverage score are separate measures.

Selecting a topic focuses the shared chat on its linked messages, decisions, and remaining questions.
Show the selected topic above the composer, its PRD text, and why its next question is ready or blocked.
A request carries the topic identifier and current PRD revision.
Messages can link to more than one topic without being copied into separate threads.
Show linked prerequisite topics and an All conversation action to restore chronological history.
Returning to the overview restores the viewer's place. Preserve their draft and effort choice.
Topic selection, history navigation, source links, and bookmarks make no model call and spend no money.

The active human can resolve a topic in focused chat, then choose another topic or the AI's next ready question.
The AI updates topic text and state from recorded answers and decisions, with source links.
A suggestion, a topic click, or a generated paragraph cannot confirm a human decision by itself.
Confirmation is part of the recorded conversation, not a competing topic-management workflow.
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

The AI advances useful work with the active human across topics before suggesting a handoff.
Selecting a blocked topic exposes its blocker; it does not force a switch or bypass prerequisites.
If other work is ready for the current human, offer that work and retain the queued question.
When further material progress requires the other human's knowledge or authority, recommend a handoff.
An unresolved conflict that needs the other human can justify a handoff before unrelated optional detail.
Turn counts, topic order, and topic confirmation alone never trigger a handoff.

## Recommendations and handoff

Ordinary AI continuation presents questions without a Keep working or Continue with Dev button.
An actionable recommendation appears inline in the current AI reply only when it proposes a state change.
It names the destination, the reason, the grouped questions, and the decisions already made.
It links the receiving human to relevant topics and source turns.
The active human accepts Handoff to NGO or Hand back to Dev.
Acceptance transfers ownership once and records the handoff in the same conversation.
The previous human becomes read-only. The receiving human can have several AI turns before returning control.
An answer alone never transfers control.

Bind every recommendation to the conversation revision, PRD revision, and active human.
Changed answers or ownership invalidate stale actions in history and in other browser tabs.
The backend rejects replayed or unauthorized actions without extra events or model charges.
Preserve each human's draft and effort choice across handoff and reload.

## Effort and USD usage

The active human selects Low, Med, High, Xhigh, or Max beside Send.
The selection applies only to the request they submit. Med is the initial default.
Retain the submitted effort with its request in history.
There is no global effort control in the PRD panel or recommendations.
Automatic scoring and materialization use an explicit service configuration, never an unsent human draft setting.
Validate the configured model's capabilities and record the effective provider parameters.
Do not silently ignore or reduce an unsupported effort choice.

The backend sends PRD model requests through OpenRouter. Credentials stay on the server.
PRD uses USD fuel. Discovery's free turn allowance does not continue into PRD.
Read OpenRouter's reported cost from the completed response, including the final streaming usage message.
Settle once per provider generation identifier, associated with a stable application request identifier.
Preserve fractional cents and distinguish a reported zero cost from missing cost.
If usage is missing, retain the reservation, display Pending cost, and reconcile by generation identifier.
Do not issue a second generation merely to retrieve the first generation's cost.

Retain the existing platform fee from the ledger requirement.
Show provider cost, platform fee, and total deducted separately in the receipt.
Admission reserves a bounded amount from available PRD allocation before a paid call.
Release unused reservation after settlement. Reconcile corrections without duplicating consumption.
Revocation, project binding, and funding checks apply before dispatch.

The PRD gauge shows spent, available, and pending USD for this phase only.
Use the unrounded consumed percentage: green below 80%, yellow from 80% through 95%, and red above 95%.
The gauge shows text as well as color. Red alone does not block a funded request.
Keep pending reservations distinct from settled spend and subtract them from available funds.
Handoff, topic navigation, and viewing the current PRD do not consume fuel.

## Close, materialize, and continue to Design

The process bar places PRD materialize between PRD and Design.
These are workspace phases, not new project lifecycle enum values.
Only Dev can close the PRD, while Dev owns the turn.
Show Close PRD inline in the latest AI completion recommendation.
Require confirmed required topics, no unresolved required decisions or conflicts, and a passing scope-coverage result for the same revision.
The scorer checks stories, acceptance criteria, data handling, and constraints against approved Discovery.
Keep the configured threshold open until its existing configuration decision is resolved.
All topics confirmed alone is insufficient. The AI recommends return to Dev if NGO holds the turn at completion.

Closing freezes the evidenced PRD revision and enters PRD materialize.
The developer starts materialization from that phase.
Materialization creates a versioned project package using the ai4good planning structure:

- The PRD and isolated requirements, linked to Discovery and conversation decisions.
- Acceptance specifications with stable identifiers, traceability, and explicit Not run execution status.
- Decomposition manifests with session-sized work, dependency relations, and acceptance coverage.
- The Linear PM requirement items and development plan, with stable links to repository artifacts.
- The Design screen inventory, linked to requirements and the frozen PRD revision.
- The build workflow instructions for item pickup, briefs, branches, worktrees, verification, and completion evidence.

Update kickoff-seeded PM requirements in place; do not create duplicate requirements.
Generate the development plan from the frozen PRD, never directly from Discovery.
Use the existing task-management writer and preserve PM and development tree separation.
UI work that requires a screen retains that dependency until Design sign-off updates the same planned item.
Do not create a second UI item for that screen at sign-off.
No package generation, acceptance specification, or screen sign-off proves implementation or passing tests.
Register executable acceptance cases through atTest during their implementation and maintain the expected-result manifests.

Track materialization steps, output links, source revision, and failures.
Resume failed steps for the same package without duplicate issues, files, events, or billed generations.
Do not label partial output complete. Keep Design unavailable until the required package is complete.
A changed source requires a new revision and completion recommendation; stale jobs cannot publish the new revision's results.
The bootstrap completion evidence includes the passing score, developer close, and completed package.
Other PM requirements retain their existing implementation and evidence gates.
The NGO can see PRD progress and package status, but never development board contents.

## Verification and reference limits

Use edge functions for all writes and reads that need backend data. UI code never accesses the database or Linear directly.
Test backend permissions as well as visible controls, including stale tabs, duplicate requests, and interrupted streams.
Verify focused topic chat, cross-topic prerequisites, revised answers, both handoff directions, and closure after NGO participation.
Verify color boundaries at 79.999%, 80%, 95%, and 95.001%, using the stored values before display rounding.
Verify long history, source links, bookmarks, keyboard navigation, narrow layouts, and both themes.

The [conversation reference](references/prd-grill-me-chat.html) contains scripted replies and example materialization.
It predates the final topic-focus interaction. This contract defines that addition for implementation.
Its sample Waiting for Maya label becomes NGO questions queued before handoff.
The reference does not make live model calls, settle money, write to Linear, or prove production acceptance.

OpenRouter implementation references checked on 2026-09-21:
[usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting) and
[model reasoning capabilities](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).
