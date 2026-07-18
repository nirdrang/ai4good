# AT-REQ-014 — Volunteer Dashboard + Completion Credit (v1 minimal)

Source: requirements/req-014.md (prd-mvp.md REQ-014). Dependencies: REQ-005.5, REQ-006, REQ-009, REQ-012, REQ-021, REQ-024.

**Boundary note:** REQ-014 owns the volunteer dashboard's content, the completion-credit event semantics, and the no-public-reputation posture. The key reveal's mechanics are REQ-009's; completion firing REQ-005.5/012's; blocker data REQ-024's — `[cross:]` here.

## A. Dashboard

- **AT-014.01 (P0)** — Given a volunteer with MIXED fixtures — a current project AND a completed one; in-progress AND queued/done tasks; unresolved AND resolved blockers/clarifications — When their dashboard renders, Then the current-projects section shows ONLY the current project with its status, fuel balance, Lovable credit status; the tasks section ONLY the in-progress tasks; the blockers/clarifications section ONLY the unresolved ones — the qualifiers discriminate, not just the positives appear; and the key reveal is reachable from the dashboard. [cx: negative halves added — completed/done/resolved leaking in would have passed] [cross: AT-009 owns reveal mechanics]
- **AT-014.02 (P0)** — Given volunteer A and volunteer B on different projects, When A's dashboard renders, Then only A's projects appear — the dashboard is per-volunteer, never cross-volunteer.

## B. No public reputation

- **AT-014.03 (P0)** — Given the platform's public surfaces (routes, project pages, showcase, marketplace), When probed for volunteer reputation, Then NO public volunteer profile page exists (the route is absent), NO badge display appears anywhere public, and NO star or numerical rating for a volunteer renders on any surface — the four STATED prohibitions only; the requirement makes the credit-earned confirmation private, not every representation of completion credit. [cx: the invented blanket no-public-credit-display rule removed]

## C. Completion credit (durable events)

- **AT-014.04 (P0)** — Given a project completes, When the credit event is read, Then exactly one append-only event exists carrying the volunteer, the project, the completion timestamp, and first-tool eligibility; When overwrite, update, and delete are each attempted (three probes), Then each is rejected and the event is unchanged; When the service/storage restarts (reload fixture), Then the event survives byte-identical; When a SECOND project completes for the same volunteer, Then a NEW event appends with the first unchanged — and the first event carries the expected first-tool eligibility while the second does NOT; and When controlled out-of-band corruption is applied to a stored event (bypassing the mutation API), Then it is DETECTED, not silently accepted — tamper-evident proven. [cx: durability across restart, append-alongside, eligibility VALUES (always-true/always-false would have passed), and tamper detection added]
- **AT-014.05 (P0)** — Given the volunteer's FIRST project completion on a fresh account, When it fires, Then the credit event records immediately — "captured from day one," no volume precondition — the volunteer receives the private "credit earned" confirmation, visible to them only (absent from every public and NGO surface), and the volunteer-facing credit copy carries the recorded-from-day-one framing. [cx: the framing assertion added — the public-MIT fact stays delegated to AT-008.03]

## D. No satisfaction machinery

- **AT-014.06 (P0)** — Given a project reaching completion, When the completion flow runs for both parties, Then NO satisfaction modal appears at any step (absence probe); and When the platform's admin surfaces are probed, Then no satisfaction aggregate exists.
- **AT-014.07 (P0)** — Given any satisfaction-scoring data the platform may hold, When every volunteer-visible surface renders (dashboard, notifications, confirmations), Then no satisfaction score of their own is ever shown to the volunteer.

## Coverage map

| REQ-014 clause | Tests |
|---|---|
| Dashboard: ONLY current projects / in-progress tasks / unresolved blockers (discriminating fixtures) + key reveal | 01 [cx] |
| Per-volunteer scoping | 02 |
| The four stated prohibitions: no public profile page, badge, star, numerical rating | 03 [cx] |
| Credit event: append-only + restart-durable + append-alongside + eligibility VALUES + out-of-band tamper DETECTED | 04 [cx] |
| Captured from day one; private confirmation only; recorded-from-day-one framing in the copy | 05 [cx] |
| No satisfaction modal; no admin aggregate | 06 |
| Volunteer never sees own satisfaction scores | 07 |
| "Portfolio already exists on GitHub" — public-MIT fact delegated [cross: AT-008.03]; the framing copy asserted in .05 | 05 [cx] |
