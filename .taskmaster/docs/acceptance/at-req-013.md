# AT-REQ-013 — NGO Dashboard (minimal v1)

Source: requirements/req-013.md (prd-mvp.md REQ-013). Dependencies: REQ-005.5, REQ-006, REQ-010, REQ-021, REQ-023, REQ-024, REQ-025.

**Boundary note:** REQ-013 owns the NGO-wide dashboard view: what it aggregates and surfaces. The underlying data truths are owned elsewhere — fuel by REQ-006, Lovable credit status by REQ-021, cadence computation by REQ-010, blockers by REQ-024, the general-balance ledger semantics by REQ-006 — `[cross:]` here; this suite asserts the dashboard RENDERS them.

## A. Per-project rows

- **AT-013.01 (P0)** — Given an NGO with two projects seeded with distinct fixtures, When the dashboard renders, Then each project's row shows its status, its task-based percent complete (a fixture of 3 done of 10 total renders the matching percentage), the fuel balance, the Lovable credit status, and the assigned volunteer — all five per project, each matching its fixture.
- **AT-013.02 (P0)** — Given cadence fixtures (a known last-commit timestamp, tasks done of total, a named current task), When the row renders, Then the three cadence signals appear and match. [cross: AT-010 owns cadence computation]
- **AT-013.03 (P0)** — Given one project's data changes (a task completes — fixture), When the dashboard is next viewed, Then the percent complete and cadence reflect the change — current state, not a stale snapshot.

## B. Money views

- **AT-013.04 (P0)** — Given two funded projects with distinct fuel balances, When the dashboard renders, Then a cross-project fuel summary presents both projects' fuel consistently with the per-project figures. [cross: AT-006/010.14 own the gauge truth]
- **AT-013.05 (P0)** — Given a general balance from a released project (fixture), When the dashboard renders it, Then it is presented as redeployable CREDIT — non-cash, with NO expiry shown and no cash-out control — and it persists across a controlled clock advance (never removed). [cross: AT-006 owns the ledger semantics; AT-001 the no-cash-out invariant]

## C. Needs-action surface

- **AT-013.06 (P0)** — Given one item of each needs-action kind — an open blocker, an open scope-addition discussion, and a triage decision awaiting the NGO (three fixtures), When the dashboard renders, Then each appears on the prominent needs-action surface; and When each is resolved/closed, Then it leaves the surface. [cross: AT-024/025/023 own the underlying flows]

## D. Scope & authorization

- **AT-013.07 (P0)** — Given the NGO account and a second unrelated NGO with its own project, When the dashboard renders for the first NGO, Then it is ONE NGO-wide view listing all of that NGO's projects and NONE of the other NGO's; and no applicant-queue surface exists anywhere on it (concierge — absence probe).

## Coverage map

| REQ-013 clause | Tests |
|---|---|
| Per-project: status, task-based % complete, fuel, Lovable credit status, volunteer | 01 |
| Cadence signals (last commit, done-of-total, current task) | 02 |
| Current state, not stale | 03 |
| Cross-project fuel summary | 04 |
| General balance = redeployable credit (non-cash, no expiry, never removed) | 05 |
| Needs-action surface (blockers, scope discussions, awaiting-NGO triage), prominent, live | 06 |
| One NGO-wide view; own projects only; no applicant queue | 07 |
