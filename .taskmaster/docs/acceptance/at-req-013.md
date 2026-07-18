# AT-REQ-013 — NGO Dashboard (minimal v1)

Source: requirements/req-013.md (prd-mvp.md REQ-013). Dependencies: REQ-005.5, REQ-006, REQ-010, REQ-021, REQ-023, REQ-024, REQ-025.

**Boundary note:** REQ-013 owns the NGO-wide dashboard view: what it aggregates and surfaces. The underlying data truths are owned elsewhere — fuel by REQ-006, Lovable credit status by REQ-021, cadence computation by REQ-010, blockers by REQ-024, the general-balance ledger semantics by REQ-006 — `[cross:]` here; this suite asserts the dashboard RENDERS them.

## A. Per-project rows

- **AT-013.01 (P0)** — Given an NGO with two projects seeded with distinct fixtures, When the dashboard renders, Then each project's row shows its status, its task-based percent complete — a fixture of 10 P0 tasks with 3 done PLUS non-P0 decoy tasks renders exactly 30% (an all-task denominator fails; progress counts completed P0 over all P0) — the fuel balance, the Lovable credit status, and the assigned volunteer — all five per project, each matching its fixture. [cx r2: decoy tasks pin the P0 denominator]
- **AT-013.02 (P0)** — Given cadence fixtures (a known last-commit timestamp, tasks done of total, a named current task), When the row renders, Then the three cadence signals appear and match. [cross: AT-010 owns cadence computation]
- **AT-013.03 (P0)** — Given one project at known values (3 of 10 P0 done, a known last commit, a named current task), When one more P0 task completes and the dashboard is next viewed, Then percent complete reads exactly 40% and tasks-done reads 4 of 10, WHILE last commit and current task are explicitly UNCHANGED (a task completion pushes no commit and names no new current task in this fixture) — the affected signals move, the unaffected ones hold. [cx r2: exact before/after values; unaffected signals pinned]

## B. Money views

- **AT-013.04 (P0)** — Given two funded projects with distinct fuel balances, When the dashboard renders, Then a cross-project fuel summary presents both projects' fuel consistently with the per-project figures. [cross: AT-006/010.14 own the gauge truth]
- **AT-013.05 (P0)** — Given a general balance from a COMPLETED project after provider final-cost settlement (fixture — leftover releases to general balance only at completion/cancellation, never at volunteer release), When the dashboard renders it, Then it is presented as redeployable CREDIT — non-cash, with NO expiry shown and no cash-out control — and after a SUBSTANTIAL deterministic clock advance (a year-scale fixture) with every due scheduled job run, the balance is unchanged and available absent spending, chargeback, or another legitimate ledger movement — no expiry path exists. [cx: completion-settlement fixture; AT-006 delegation] [cx r2: the advance given a scale + scheduled jobs drained — a short hop could have missed a finite expiry] [cross: AT-006 owns the ledger semantics and the no-cash-out invariant]

## C. Needs-action surface

- **AT-013.06 (P0)** — Given one item of each needs-action kind — an open blocker, an open scope-addition discussion, and a triage decision awaiting the NGO (three fixtures), When the dashboard renders, Then each appears on the needs-action surface, whose prominence is observable: a top-level region with a needs-action heading, visible on dashboard load WITHOUT opening any project detail or secondary panel; and When each item is resolved/closed, Then it leaves the surface. [cx: "prominent" given an observable criterion] [cross: AT-024/025/023 own the underlying flows]
- **AT-013.08 (P0)** — Given projects with structurally EMPTY data — one pre-match (no assigned volunteer), one pre-task (zero total tasks, no current task, no commit yet) — When the dashboard renders, Then every such project is still LISTED and each unavailable field renders its CONFIGURED empty-state sentinel — an explicit expected value per field defined in the test configuration (the copy itself is a product choice, the test pins that the configured sentinel and not a fabricated datum renders), with the zero-total-tasks percent complete rendering the configured zero-state value rather than an error or an invented number. [cx: added] [cx r2: "defined empty state" de-circularized — expected observables come from test configuration, matching the suite's configured-threshold discipline]

## D. Scope & authorization

- **AT-013.07 (P0)** — Given the NGO account and a second unrelated NGO whose project carries its OWN open blocker, scope-addition discussion, and awaiting-triage item (seeded), When the dashboard renders for the first NGO, Then it is ONE NGO-wide view listing all of that NGO's projects and NONE of the other NGO's — and NONE of the other NGO's action items appears anywhere on the first NGO's needs-action surface (cross-tenant isolation covers the aggregation, not just the project list); and no applicant-queue surface exists anywhere on it (concierge — absence probe). [cx r2: needs-action leakage was untested]

## Coverage map

| REQ-013 clause | Tests |
|---|---|
| Per-project: status, P0-denominator % complete (decoy-proofed), fuel, Lovable credit status, volunteer | 01 [cx r2] |
| Cadence signals (last commit, done-of-total, current task) | 02 |
| Current state, not stale (exact deltas; unaffected signals hold) | 03 [cx r2] |
| Cross-project fuel summary | 04 |
| General balance = redeployable credit (non-cash, no expiry — year-scale advance with jobs drained; completion-settlement fixture) | 05 [cx r2] |
| Needs-action surface (blockers, scope discussions, awaiting-NGO triage), observably prominent, live | 06 [cx] |
| One NGO-wide view; own projects only incl. needs-action cross-tenant isolation; no applicant queue | 07 [cx r2] |
| Empty states listed, configured sentinels, never fabricated (pre-match / zero-task fixtures) | 08 [cx r2] |
