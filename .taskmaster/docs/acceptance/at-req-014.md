# AT-REQ-014 — Volunteer Dashboard + Completion Credit (v1 minimal)

Source: requirements/req-014.md (prd-mvp.md REQ-014). Dependencies: REQ-005.5, REQ-006, REQ-009, REQ-012, REQ-021, REQ-024.

**Boundary note:** REQ-014 owns the volunteer dashboard's content, the completion-credit event semantics, and the no-public-reputation posture. The key reveal's mechanics are REQ-009's; completion firing REQ-005.5/012's; blocker data REQ-024's — `[cross:]` here.

## A. Dashboard

- **AT-014.01 (P0)** — Given a volunteer with a current project seeded with fixtures, When their dashboard renders, Then the project appears with its status, fuel balance, Lovable credit status, in-progress tasks, and unresolved blockers/clarifications — each matching its fixture; and the key reveal is reachable from the dashboard. [cross: AT-009 owns reveal mechanics]
- **AT-014.02 (P0)** — Given volunteer A and volunteer B on different projects, When A's dashboard renders, Then only A's projects appear — the dashboard is per-volunteer, never cross-volunteer.

## B. No public reputation

- **AT-014.03 (P0)** — Given the platform's public surfaces (routes, project pages, showcase, marketplace), When probed for volunteer reputation, Then NO public volunteer profile page exists (the route is absent), NO badge display appears anywhere public, and NO star or numerical rating for a volunteer renders on any surface — completion credit is the ONLY reputation primitive and it has no public display in v1.

## C. Completion credit (durable events)

- **AT-014.04 (P0)** — Given a project completes, When the credit event is read, Then exactly one append-only event exists carrying the volunteer, the project, the completion timestamp, and first-tool eligibility; and When overwrite, update, and delete are each attempted (three probes), Then each is rejected and the event is unchanged — durable, tamper-evident.
- **AT-014.05 (P0)** — Given the volunteer's FIRST project completion on a fresh account, When it fires, Then the credit event records immediately — "captured from day one," no volume precondition — and the volunteer receives the private "credit earned" confirmation, visible to them only (absent from every public and NGO surface).

## D. No satisfaction machinery

- **AT-014.06 (P0)** — Given a project reaching completion, When the completion flow runs for both parties, Then NO satisfaction modal appears at any step (absence probe); and When the platform's admin surfaces are probed, Then no satisfaction aggregate exists.
- **AT-014.07 (P0)** — Given any satisfaction-scoring data the platform may hold, When every volunteer-visible surface renders (dashboard, notifications, confirmations), Then no satisfaction score of their own is ever shown to the volunteer.

## Coverage map

| REQ-014 clause | Tests |
|---|---|
| Dashboard: current projects (status, fuel, Lovable credits, in-progress tasks, blockers/clarifications) + key reveal | 01 |
| Per-volunteer scoping | 02 |
| No public profile/badge/star/numerical rating in v1 | 03 |
| Credit event: append-only, non-overwritable, non-deletable, tamper-evident, four fields | 04 |
| Captured from day one; private confirmation only | 05 |
| No satisfaction modal; no admin aggregate | 06 |
| Volunteer never sees own satisfaction scores | 07 |
| "Portfolio already exists on GitHub" — framing over the public-MIT repos, no test needed [cross: AT-008.03] | — |
