# PRD workspace, completion, and materialization acceptance

Source: requirements/req-036.md and design/prd-ui-contract.md.
Amendment d93 records the accepted conversation and topic-navigation behavior on 2026-09-21.
The ten existing acceptance identifiers remain stable. Their scenarios cover the revised PRD workflow.
The automatic score-to-board behavior and blanket NGO mutation denial are superseded.
The separate Design extension retains its own implementation work and outstanding acceptance registration.

Status: specification only. This requirement has no executable suite or expected-result manifest yet.
Implementation must register each case through atTest and record honest results before any completion claim.
No scenario below has passed merely because this document exists.

## Bootstrap and shared authoring

- **AT-036.01 (P0)** Given kickoff and approved Discovery, when the developer enters PRD, the PM scope requirements and bootstrap exist. The development tree remains empty before authorized materialization. Initial topics and known answers reference the approved Discovery revision. Repeat entry creates no duplicate bootstrap or topics. Cross: AT-026.06 owns seeding.
- **AT-036.02 (P0)** Given the developer pulls the bootstrap, when Dev and AI author the PRD, the versioned PRD and shared record retain messages, actors, sources, decisions, and revisions. Reload preserves the active human and each human's draft and effort choice. Token attribution remains separate from provider-cost settlement. A failed attribution binding degrades honestly and never adds a funding bypass or an attribution money gate. Cross: task pull, attribution, and money retain their existing owners.
- **AT-036.03 (P0)** Given ready independent Dev questions, a dependent Dev question, and NGO-owned questions, when the AI chooses a round, it asks ready questions and explains why. It reuses facts, offers suggestions, and retains uncertainty. It continues useful Dev work before recommending NGO handoff. When NGO authority gates material progress, it groups questions into a reasoned handoff. After acceptance, NGO can answer several rounds before a recommended return. Answers determine subsequent questions. Topic selection never bypasses dependencies or forces ownership transfer. Clarifications retain PM requirement or project anchors in the Q&A log. Cross: REQ-024/010 own blocker and log delivery.

## Coverage, spending, and materialization

- **AT-036.04 (P0)** Given a PRD missing a story, acceptance criterion, data-handling decision, and constraint, when scored against approved Discovery, the result identifies each gap and records the revision and configured threshold. Above-threshold and exactly-at-threshold results qualify only when all required decisions are resolved and confirmed. A stale passing result, unresolved conflict, or required unknown prevents completion recommendation. Confirmed topic badges cannot bypass coverage. The AI returns to Dev before closure if NGO owns the turn. The threshold stays configured, never invented by the test.
- **AT-036.05 (P0)** Given PRD authoring, scoring, and materialization calls, when their OpenRouter responses finish, the backend settles each reported generation cost once. Test normal and streaming replies, fractional cents, actual zero cost, missing cost, duplicate receipts, retries, and interrupted streams. Missing cost stays pending until generation-cost reconciliation. Readback separates provider cost, the locked platform fee, total deducted, and token attribution. A repeated receipt or cost lookup creates no second charge or generation. Low, Med, High, Xhigh, and Max apply only to submitted human requests. Record effective provider settings and reject unsupported mappings without silent downgrade. Automatic operations do not inherit an unsent choice.
- **AT-036.06 (P0)** Given a current passing completion recommendation, when active Dev selects inline Close PRD, the platform freezes that revision and enters PRD materialize. No score event alone creates the development plan. When Dev starts materialization, the package includes the PRD, isolated requirements, acceptance identifiers, coverage, dependency-ordered decomposition, PM updates, development plan, Design inventory, and build instructions. Trace distinct PRD-only story and criterion wording into the correct requirement and work items. Reuse seeded PM items and preserve tree separation. Acceptance execution reads Not run. Test partial repository and Linear failures, repeat clicks, resume after reload, and changed source revisions. Resume updates the same outputs without rebilling completed generations. Design opens only after the required package completes. Bootstrap evidence includes score, developer close, and completed package; other PM requirements remain uncompleted. Later UI sign-off reuses any planned screen item.
- **AT-036.07 (P0)** Given repeated funded authoring and scoring attempts, when the user continues below the threshold, no turn count or attempt count blocks progress. Check available USD after pending reservations and enforce applicable funding and access rules. No free Discovery counter funds PRD. Top-up does not clear revocation or other ranked stops. Verify USD labels and gauge colors at 79.999%, 80%, 95%, and 95.001% consumed, before display rounding. Red alone permits a funded call. Typing, selecting effort, reading, topic navigation, source links, bookmarks, and handoff acceptance create no model cost.

## Topics, actors, and interface

- **AT-036.08 (P0)** Given Open, Draft, Confirmed, and Needs review topics, when the overview renders, it shows required-topic counts, blockers, answer owners, draft text, and source links. Selecting a topic focuses related turns and questions in the same conversation. Messages retain shared identity; linked prerequisites and All conversation remain reachable. Focus preserves the human, drafts, effort, and budget. Confirmed requires current recorded evidence. Changed answers invalidate affected dependents, lower progress where needed, and invalidate stale recommendations. Preserve unaffected confirmations. Each score remains a separate revision-linked event. Topic confirmation cannot close the PRD, change PM build status, or silently change the required-topic denominator.
- **AT-036.09 (P0)** Given Dev, NGO, an unrelated member, and stale tabs, when they call the backend directly, only the authorized active human can submit or accept a handoff recommendation. Acceptance transfers the sole turn once. Inactive and unrelated users cannot bypass the UI. Active NGO can answer and request AI help, but cannot close, materialize, change the threshold, override scoring, or read development board content. Only active Dev with a fresh completion recommendation can close. Stale recommendations, duplicate acceptance, and simultaneous sends leave consistent history and ownership. An answer never automatically transfers control. Ordinary AI continuation has no state-action button.
- **AT-036.10 (P0)** Given long history and both handoff directions, when the actual workspace renders, AI, Dev, and NGO retain their colors and names throughout. Colored bookmarks reach each human's last authored turn, including collapsed history. The PRD panel supports topic focus. Handoff and Close PRD appear inline with the current AI reply. Effort appears in the active composer only. Queued NGO questions do not claim an accepted handoff. Keyboard, narrow layout, and both themes preserve readable state and reachable controls. NGO and public projections exclude development board content. Gap reports and completed-package gate-pass/backlog-live notifications use the registered emitter with duplicate protection. Handoff and materialization progress persist without an unregistered notification channel.

## Coverage and evidence

| Contract | Primary case |
| --- | --- |
| Bootstrap and Discovery source | 01 |
| Shared record, drafts, and attribution | 02 |
| Dependency questioning and semantic handoff | 03 |
| Coverage and current completion recommendation | 04 |
| OpenRouter cost and request effort | 05 |
| Close, package creation, retries, and Design entry | 06 |
| USD admission, free navigation, and gauge thresholds | 07 |
| Topic overview, focus, and revised answers | 08 |
| One active human and backend authority | 09 |
| Interface, history, bookmarks, and events | 10 |

Run the ten cases at integration tier. Re-run interface cases through the wired UI.
Requirement completion still requires the normal merge evidence and founder attestation.
