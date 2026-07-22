# AT-REQ-025 — Mid-Build Scope Additions (v1 informal protocol)

Source: requirements/req-025.md (prd-mvp.md REQ-025). Dependencies: REQ-015, REQ-023, REQ-026, REQ-034.

**Boundary note:** REQ-025 owns the informal protocol's rules. The comment thread itself is REQ-015's; task creation/linking mechanics REQ-026's; attribution REQ-034's; completion gating REQ-005.5/012's — `[cross:]` here.

## A. Acceptance protocol

- **AT-025.01 (P0)** — Given the NGO raises an addition idea in the comment thread, When no volunteer acceptance exists, Then the addition is not in scope and no work on it is authorized — the idea is just a thread message; the existence of any task artifact is not itself prohibited, only scope entry is. [cx: over-broad no-task-created claim narrowed — the requirement bars scope entry, not artifacts] [cross: REQ-015]
- **AT-025.02 (P0)** — Given the volunteer accepts in-thread AND creates the correctly linked requirement item on the PM tree [d86], Then — and only then — the addition is in scope; and the chronology proves order: the acceptance and linked task timestamps precede the first metered provider usage for that work (a known material-work fixture, judged on the authoritative request/usage chronology — not on attribution rows, which REQ-034 keeps soft). [cx r2: oracle moved from attributed-burn to metered-usage chronology] [cross: REQ-026/034]
- **AT-025.10 (P0)** — Given three defective variants — an in-thread acceptance WITHOUT a volunteer-created linked requirement item, a volunteer acceptance OUTSIDE the project thread, and an in-thread acceptance paired with an item linked to the WRONG project — When scope is probed, Then each addition is still out of scope — the conjunction requires the in-thread acceptance AND the correctly linked requirement item. [cx: acceptance-without-task] [cx r2: outside-thread + wrong-project variants added] [d86]
- **AT-025.03 (P0)** — Given an accepted addition, When recorded, Then it carries exactly one of: top-priority (completion-blocking) OR proposed-optional — and the optional classification becomes EFFECTIVE (non-blocking) only once the explicit NGO acknowledgment is recorded, which may happen any time before completion. [cx r2: acknowledgment decoupled from recording — the requirement says "before completion", not at acceptance]
- **AT-025.11 (P0)** — Given the volunteer labels an addition optional but the NGO never acknowledges it, When completion approaches, Then the volunteer-only label does NOT qualify as optional/non-blocking — the explicit NGO acknowledgment must exist before completion for the optional classification to hold. [cx: added — the missing-acknowledgment negative at the completion boundary]
- **AT-025.04 (P0)** — Given an addition classified optional/non-blocking (with the NGO acknowledgment recorded), When completion evaluates with it not done, Then completion proceeds; Given a top-priority addition not done, Then completion is blocked. [cross: AT-005.5.25/27; REQ-026 owns top-priority-never-auto-cancels]
- **AT-025.05 (P0)** — Given an NGO- or admin-created item artifact for an addition, When scope is probed, Then it does NOT constitute accepted scope — only the volunteer's in-thread acceptance plus volunteer-created linked requirement item does [d86]; no mechanical rejection control is required (the authority is enforced socially at concierge scale, per the requirement). [cx: de-mechanized — the requirement says social enforcement, not a rejection control]

## B. Flow constraints

- **AT-025.06 (P0)** — Given one active scope-addition discussion on project A, When a further ask arrives, Then an auditable disposition exists for it — a recorded WAITING disposition or a distinct follow-up-project identifier, timestamped after the active discussion's — and at no timestamp do two of project A's asks hold the active disposition; and Given project B raises its own ask concurrently (second fixture), Then B's discussion is active independently — the limit is PER PROJECT, not global. [cx: outcome-based] [cx r2: auditable disposition artifacts defined + two-project fixture]
- **AT-025.07 (P0)** — Given the NGO raises an idea, When it lands (any ordinary notification being governed by REQ-015/016, not asserted here), Then no forced assignment occurs, the volunteer's active task is unchanged, no queue-jump happens, and no blocking workflow interruption exists. [cx r2: notification delivery removed as a pass condition — it belongs to the owning suites]
- **AT-025.08 (P0)** — Given the comment-thread addition flow (the v1 surface — the structured CR surface is deferred), When the NGO engages it, Then the disclosure is observably delivered there (or via the auditable concierge disclosure): additions consume existing fuel, may extend the timeline, and are volunteer-optional — plus the never-paste-beneficiary-data/secrets/credentials warning. [cx r2: anchored to the existing thread flow — no dedicated CR surface exists to render on]

## C. Re-triage guard

- **AT-025.09 (P0)** — Given an accepted addition that changes data sensitivity, AUP/compliance posture, or open-source fit (three fixtures), When work would start, Then the addition is paused for founder re-triage and no work on it proceeds until the re-triage passes. [cx: the converse (no-change → no re-triage) removed — discretionary re-triage is not prohibited] [cross: REQ-023]

## Coverage map

| REQ-025 clause | Tests |
|---|---|
| Nothing enters scope without BOTH halves (idea-only, acceptance-only, outside-thread, wrong-project negatives); metered-usage chronology proves before-material-fuel | 01, 02, 10 [cx r2] |
| Classification: top-priority XOR proposed-optional at recording; NGO ack effective any time before completion (missing-ack negative); completion behavior per class | 03, 04, 11 [cx r2] |
| Volunteer sole acceptance authority (social, not mechanical — artifacts ≠ scope) | 05 |
| One active discussion per project (outcome-based) | 06 |
| Normal notification, but no forced assignment / task change / queue-jump / blocking interrupt | 07 |
| NGO disclosure (fuel, timeline, optional) + data warning | 08 |
| Sensitivity/AUP/open-source change → founder re-triage pause | 09 |
