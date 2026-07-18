# AT-REQ-014 — Volunteer Dashboard + Completion Credit (v1 minimal)

Source: requirements/req-014.md (prd-mvp.md REQ-014). Dependencies: REQ-005.5, REQ-006, REQ-009, REQ-012, REQ-021, REQ-024.

**Boundary note:** REQ-014 owns the volunteer dashboard's content, the completion-credit event semantics, and the no-public-reputation posture. The key reveal's mechanics are REQ-009's; completion firing REQ-005.5/012's; blocker data REQ-024's — `[cross:]` here.

## A. Dashboard

- **AT-014.01 (P0)** — Given a volunteer with MIXED fixtures — TWO current projects AND three decoys (a completed, a cancelled, and a formerly-assigned/released project); in-progress AND queued/done tasks; unresolved AND resolved blockers/clarifications — When their dashboard renders, Then the current-projects section equals EXACTLY the two current projects (set equality) and each shows its exact fixture status, fuel balance, Lovable credit status, in-progress-task set, and unresolved-blocker/clarification set; none of the three decoys appears; the tasks and blockers sections carry ONLY the in-progress/unresolved items; and the key reveal is reachable from the dashboard. [cx: negative halves] [cx r2: cancelled + released decoys (completed-only filtering would have passed); two-project set equality + full per-project oracles restored] [cross: AT-009 owns reveal mechanics]
- **AT-014.02 (P0)** — Given volunteer A and volunteer B on different projects, each seeded with sentinel tasks, blockers, clarifications, AND key-reveal controls, When A's dashboard renders, Then only A's projects appear and NONE of B's sentinels — task, blocker, clarification, or key control — appears in ANY section of A's dashboard: per-volunteer scoping covers every section, not just the project list. [cx r2: section-level cross-volunteer leakage was untested]

## B. No public reputation

- **AT-014.03 (P0)** — Given the platform's public surfaces (routes, project pages, showcase, marketplace), When probed for volunteer reputation, Then NO public volunteer profile page exists (the route is absent), NO badge display appears anywhere public, NO star or numerical rating for a volunteer renders on any surface, AND no OTHER public reputation primitive exists either (no endorsement, rank label, or equivalent — probe) — "completion-credit-only public reputation" means any public reputation primitive that exists must be completion-credit-derived, and in v1 none is displayed at all (the display itself is deferred, RM-3), so the enforceable assertion is the absence of every non-credit primitive. [cx: blanket rule removed] [cx r2: the other-primitives exclusion restored; a positive public-credit oracle would contradict the v1 no-display clause — RM-3 defers it]

## C. Completion credit (durable events)

- **AT-014.04 (P0)** — Given project P1 completes at controlled time T1 for volunteer V (pinned IDs), When the credit event is read, Then exactly one append-only event exists carrying V's id, P1's id, timestamp T1, and eligibility=ELIGIBLE (first tool); When overwrite, update, and delete are each attempted (three probes), Then each is rejected and the event unchanged; When the ACTUAL service/storage restarts WITHOUT reseeding, Then the same event identity and exact semantic field values remain (byte equality NOT required — reserialization/migration is compliant); When P2 completes at controlled T2, Then a NEW event appends carrying V, P2, T2, eligibility=NOT-ELIGIBLE, with the first event unchanged; When controlled out-of-band corruption EDITS a stored event, Then it is DETECTED; and When an out-of-band DELETION removes an event, Then integrity verification detects the missing event — tamper-evident against edits AND silent loss. [cx: durability set] [cx r2: pinned IDs/timestamps/eligibility values per event; restart-without-reseed; byte-equality over-assertion dropped; out-of-band deletion detection added]
- **AT-014.05 (P0)** — Given the volunteer's FIRST project completion on a fresh account AND a LATER completion (two fixtures), When each completion transition commits, Then EACH has its credit event and its private "credit earned" confirmation observable by the time the completion transition completes (the observation boundary) — per-project, not once-per-volunteer; the confirmation is visible to the volunteer only (absent from every public and NGO surface), and the volunteer-facing credit copy carries the recorded-from-day-one framing. [cx: framing] [cx r2: the confirmation is per-completion (a send-once implementation would have passed); "immediately" bounded at the transition commit]

## D. No satisfaction machinery

- **AT-014.06 (P0)** — Given a project reaching completion, When the completion flow runs for both parties, Then NO satisfaction modal appears at any step (absence probe); and When the platform's admin surfaces are probed, Then no satisfaction aggregate exists.
- **AT-014.07 (P0)** — Given any satisfaction-scoring data the platform may hold, When every volunteer-visible surface renders (dashboard, notifications, confirmations), Then no satisfaction score of their own is ever shown to the volunteer.

## Coverage map

| REQ-014 clause | Tests |
|---|---|
| Dashboard: exact current-project SET (completed/cancelled/released decoys excluded) + full per-project oracles + key reveal | 01 [cx r2] |
| Per-volunteer scoping across EVERY section (sentinel leakage probes) | 02 [cx r2] |
| No public profile/badge/star/numerical rating AND no other public reputation primitive (credit-only rule; display deferred RM-3) | 03 [cx r2] |
| Credit event: pinned field oracles, restart-without-reseed durability, append-alongside, eligibility values, edit + deletion tamper detection | 04 [cx r2] |
| Per-completion event + private confirmation at the transition-commit boundary; day-one first case; framing copy | 05 [cx r2] |
| No satisfaction modal; no admin aggregate | 06 |
| Volunteer never sees own satisfaction scores | 07 |
| "Portfolio already exists on GitHub" — public-MIT fact delegated [cross: AT-008.03]; the framing copy asserted in .05 | 05 [cx] |
