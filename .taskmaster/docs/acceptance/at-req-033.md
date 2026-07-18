# AT-REQ-033 — Post-Discovery NGO Project Assistant (funded, fuel-metered)

Source: requirements/req-033.md (prd-mvp.md REQ-033, incl. d37 NGO-only). Dependencies: REQ-004, REQ-005.5, REQ-006, REQ-015, REQ-025, REQ-026, REQ-034.

**Boundary note:** REQ-033 owns the assistant: its visibility, metering, read-only ceiling, and Discovery-surface reuse. The Discovery chat itself is REQ-004's; fuel mechanics REQ-006's; the read-only Linear mirror AT-026.02's; the attribution category row AT-034's; the scope-addition protocol REQ-025's — `[cross:]` here.

## A. Visibility (NGO-only, in_progress onward)

- **AT-033.01 (P0)** — Given an `in_progress` funded project, When each actor loads the project page: the project's NGO account sees the assistant; the assigned volunteer, an authenticated unrelated visitor, and an anonymous visitor each see NO assistant surface at all — the bot interface exists for the NGO alone.
- **AT-033.02 (P0)** — Given the same project BEFORE `in_progress` (at `open` and at `matched_pending_fuel` — two fixtures), When the NGO loads the page, Then no assistant exists there; and Given an UNFUNDED pre-scoped project, Then Discovery is the only NGO↔AI chat surface (probe: exactly one chat surface, framed as Discovery).
- **AT-033.03 (P0)** — Given the project later reaches `completed`, When the NGO loads the page, Then the assistant surface is still present — "from in_progress onward" — with billability governed by its own rules (AT-033.05), not by lifecycle.

## B. Metering (fuel, no free credits)

- **AT-033.04 (P0)** — Given an assistant turn, When it completes, Then the project's fuel reflects the consumption [cross: REQ-006 provider truth], the per-turn cost is shown on the surface, remaining fuel is visible, and the NGO's free-credit balance is UNCHANGED — the assistant never draws credits; the turn's usage row carries the NGO-assistant category. [cross: AT-034 owns the row schema]
- **AT-033.05 (P0)** — Given the project's fuel at zero, When the NGO sends a billable request, Then it is not accepted and a top-up path is offered; after a top-up lands, the same request is accepted — stop-and-offer, not silent failure. [cross: AT-006 owns top-up mechanics]

## C. Read-only ceiling

- **AT-033.06 (P0)** — Given the assistant's capabilities, When mutation is attempted through it by any phrasing (four probes: set a task status, resolve a blocker, accept a scope addition, move money/top-up), Then no mutation path exists — the underlying task, blocker, ledger, and scope records are unchanged (sentinels) — the assistant is strictly read-only.
- **AT-033.07 (P0)** — Given sentinel fixtures in each snapshot source (a task, a blocker, a fuel value, an activity event), When the NGO asks about each, Then the assistant's answers reflect the sentinels — it reads tasks, blockers, fuel, and activity. [cross: AT-026.02 owns the mirror's write-path absence]
- **AT-033.08 (P0)** — Given the NGO asks for a scope or priority change, When the assistant responds, Then it explains the REQ-025 protocol (in-thread acceptance by the volunteer) and MAY pre-fill a draft — and the submission act remains the NGO's own: no assistant-originated thread message or task exists without the NGO submitting. [cross: REQ-025/AT-025.01]

## D. Surface reuse & control posture

- **AT-033.09 (P0)** — Given the funded transition, When the project page chat is inspected before and after funding, Then it is the SAME chat surface — reframed from Discovery to assistant — and no second chat infrastructure exists (one surface, one model family, on-demand text Q&A).
- **AT-033.10 (P0)** — Given sustained heavy assistant usage (fixture), When it flows, Then no scope guardrail intervenes — no cap, no refusal threshold, no warning gate beyond the always-visible cost display — paid usage is the NGO's call and the cost display is the control (probe: the display is present on every turn).

## Coverage map

| REQ-033 clause | Tests |
|---|---|
| NGO-only visibility (volunteer/visitor/public never see it) | 01 |
| No assistant before in_progress; unfunded → Discovery is the only chat | 02 |
| Available from in_progress onward (incl. completed) | 03 |
| Fuel-metered, per-turn cost + remaining fuel shown, no credits, category row | 04 |
| Zero fuel → stop accepting billable + offer top-up | 05 |
| Strictly read-only (status/blockers/scope/money mutation impossible) | 06 |
| Reads snapshot of tasks/blockers/fuel/activity | 07 |
| Scope ask → REQ-025 protocol explanation + optional NGO-submitted draft | 08 |
| Reuses Discovery surface/model; no new chat infra; on-demand text Q&A | 09 |
| No scope guardrail; cost display is the control | 10 |
