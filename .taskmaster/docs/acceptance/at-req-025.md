# AT-REQ-025 — Mid-Build Scope Additions (v1 informal protocol)

Source: requirements/req-025.md (prd-mvp.md REQ-025). Dependencies: REQ-015, REQ-023, REQ-026, REQ-034.

**Boundary note:** REQ-025 owns the informal protocol's rules. The comment thread itself is REQ-015's; task creation/linking mechanics REQ-026's; attribution REQ-034's; completion gating REQ-005.5/012's — `[cross:]` here.

## A. Acceptance protocol

- **AT-025.01 (P0)** — Given the NGO raises an addition idea in the comment thread, When no volunteer acceptance exists, Then no task is created, no scope changes, and no work item appears anywhere — the idea is just a thread message. [cross: REQ-015]
- **AT-025.02 (P0)** — Given the volunteer accepts in-thread AND creates the linked task, Then — and only then — the addition is in scope; the acceptance and task exist BEFORE material fuel is spent on it (the task predates any attributed burn for that work). [cross: REQ-026/034]
- **AT-025.03 (P0)** — Given an accepted addition, When recorded, Then it carries exactly one of the two classifications: top-priority (completion-blocking) OR explicitly NGO-acknowledged optional/non-blocking — an acceptance with neither classification is rejected.
- **AT-025.04 (P0)** — Given an addition classified optional/non-blocking, When completion evaluates with it not done, Then completion proceeds; Given a top-priority addition not done, Then completion is blocked. [cross: AT-005.5.25/27; REQ-026 owns top-priority-never-auto-cancels]
- **AT-025.05 (P0)** — Given the volunteer's sole acceptance authority, When the NGO or a platform admin attempts to create a scope-addition task directly into scope, Then it is rejected — only the volunteer's accept-and-create path works.

## B. Flow constraints

- **AT-025.06 (P0)** — Given one active scope-addition discussion on a project, When a further ask arrives, Then it does not become a second active discussion — it waits or is directed to a follow-up project (the platform tracks one active at a time).
- **AT-025.07 (P0)** — Given the NGO raises an idea, When the volunteer's session state is probed, Then nothing interrupted them and nothing was auto-assigned — no forced assignment, notification interrupt, or queue-jump exists.
- **AT-025.08 (P0)** — Given the NGO-facing scope-addition surface, When it renders, Then the disclosure states: additions consume existing fuel, may extend the timeline, and are volunteer-optional — plus the never-paste-beneficiary-data/secrets/credentials warning.

## C. Re-triage guard

- **AT-025.09 (P0)** — Given an accepted addition that changes data sensitivity, AUP/compliance posture, or open-source fit (three fixtures), When work would start, Then the addition is paused for founder re-triage and no work on it proceeds until the re-triage passes; an addition changing none of these proceeds without re-triage. [cross: REQ-023]

## Coverage map

| REQ-025 clause | Tests |
|---|---|
| Nothing enters scope without in-thread acceptance + volunteer-created linked task, before material fuel | 01, 02 |
| Classification: top-priority XOR NGO-acknowledged optional; completion behavior per class | 03, 04 |
| Volunteer sole acceptance authority (actor negative) | 05 |
| One active discussion per project | 06 |
| Nothing interrupts, nothing auto-assigns | 07 |
| NGO disclosure (fuel, timeline, optional) + data warning | 08 |
| Sensitivity/AUP/open-source change → founder re-triage pause | 09 |
