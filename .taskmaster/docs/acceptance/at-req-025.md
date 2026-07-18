# AT-REQ-025 — Mid-Build Scope Additions (v1 informal protocol)

Source: requirements/req-025.md (prd-mvp.md REQ-025). Dependencies: REQ-015, REQ-023, REQ-026, REQ-034.

**Boundary note:** REQ-025 owns the informal protocol's rules. The comment thread itself is REQ-015's; task creation/linking mechanics REQ-026's; attribution REQ-034's; completion gating REQ-005.5/012's — `[cross:]` here.

## A. Acceptance protocol

- **AT-025.01 (P0)** — Given the NGO raises an addition idea in the comment thread, When no volunteer acceptance exists, Then the addition is not in scope and no work on it is authorized — the idea is just a thread message; the existence of any task artifact is not itself prohibited, only scope entry is. [cx: over-broad no-task-created claim narrowed — the requirement bars scope entry, not artifacts] [cross: REQ-015]
- **AT-025.02 (P0)** — Given the volunteer accepts in-thread AND creates the linked task, Then — and only then — the addition is in scope; the acceptance and task exist BEFORE material fuel is spent on it (the task predates any attributed burn for that work). [cross: REQ-026/034]
- **AT-025.10 (P0)** — Given an in-thread acceptance WITHOUT a volunteer-created linked task, When scope is probed, Then the addition is still out of scope and no material fuel burns against it — the conjunction requires both halves. [cx: added — the acceptance-without-task negative]
- **AT-025.03 (P0)** — Given an accepted addition, When recorded, Then it carries exactly one of the two classifications: top-priority (completion-blocking) OR explicitly NGO-acknowledged optional/non-blocking — an acceptance with neither classification is rejected.
- **AT-025.11 (P0)** — Given the volunteer labels an addition optional but the NGO never acknowledges it, When completion approaches, Then the volunteer-only label does NOT qualify as optional/non-blocking — the explicit NGO acknowledgment must exist before completion for the optional classification to hold. [cx: added — the missing-acknowledgment negative at the completion boundary]
- **AT-025.04 (P0)** — Given an addition classified optional/non-blocking (with the NGO acknowledgment recorded), When completion evaluates with it not done, Then completion proceeds; Given a top-priority addition not done, Then completion is blocked. [cross: AT-005.5.25/27; REQ-026 owns top-priority-never-auto-cancels]
- **AT-025.05 (P0)** — Given an NGO- or admin-created task artifact for an addition, When scope is probed, Then it does NOT constitute accepted scope — only the volunteer's in-thread acceptance plus volunteer-created linked task does; no mechanical rejection control is required (the authority is enforced socially at concierge scale, per the requirement). [cx: de-mechanized — the requirement says social enforcement, not a rejection control]

## B. Flow constraints

- **AT-025.06 (P0)** — Given one active scope-addition discussion on a project, When a further ask arrives, Then the observable outcome holds: no two discussions are simultaneously active — the later ask waits or is directed to a follow-up project. [cx: outcome-based — no dedicated tracking mechanism is mandated]
- **AT-025.07 (P0)** — Given the NGO raises an idea, When it lands, Then the normal thread-comment notification fires [cross: REQ-015/016] — but no forced assignment occurs, the volunteer's active task is unchanged, no queue-jump happens, and no blocking workflow interruption exists. [cx: reconciled with REQ-015/016 — the notification is required; the INTERRUPTION is what is banned]
- **AT-025.08 (P0)** — Given the NGO-facing scope-addition surface, When it renders, Then the disclosure states: additions consume existing fuel, may extend the timeline, and are volunteer-optional — plus the never-paste-beneficiary-data/secrets/credentials warning.

## C. Re-triage guard

- **AT-025.09 (P0)** — Given an accepted addition that changes data sensitivity, AUP/compliance posture, or open-source fit (three fixtures), When work would start, Then the addition is paused for founder re-triage and no work on it proceeds until the re-triage passes. [cx: the converse (no-change → no re-triage) removed — discretionary re-triage is not prohibited] [cross: REQ-023]

## Coverage map

| REQ-025 clause | Tests |
|---|---|
| Nothing enters scope without BOTH halves (idea-only, acceptance-only negatives), before material fuel | 01, 02, 10 |
| Classification: top-priority XOR NGO-acknowledged optional; missing-ack negative at completion; completion behavior per class | 03, 04, 11 |
| Volunteer sole acceptance authority (social, not mechanical — artifacts ≠ scope) | 05 |
| One active discussion per project (outcome-based) | 06 |
| Normal notification, but no forced assignment / task change / queue-jump / blocking interrupt | 07 |
| NGO disclosure (fuel, timeline, optional) + data warning | 08 |
| Sensitivity/AUP/open-source change → founder re-triage pause | 09 |
