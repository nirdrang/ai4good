# AT-REQ-033 — Post-Discovery NGO Project Assistant (funded, fuel-metered)

Source: requirements/req-033.md (prd-mvp.md REQ-033, incl. d37 NGO-only). Dependencies: REQ-004, REQ-005.5, REQ-006, REQ-015, REQ-025, REQ-026, REQ-034.

**Boundary note:** REQ-033 owns the assistant: its visibility, metering, read-only ceiling, and Discovery-surface reuse. The Discovery chat itself is REQ-004's; fuel mechanics REQ-006's; the read-only Linear mirror AT-026.02's; the attribution category row AT-034's; the scope-addition protocol REQ-025's — `[cross:]` here.

## A. Visibility (NGO-only, in_progress onward)

- **AT-033.01 (P0)** — Given an `in_progress` funded project, When each actor loads the project page: the project's NGO account sees the assistant; the assigned volunteer, an authenticated unrelated visitor, and an anonymous visitor each see NO assistant surface at all — the bot interface exists for the NGO alone.
- **AT-033.02 (P0)** — Given EVERY pre-`in_progress` lifecycle state (parameterized sweep), including a FUNDED project still before kickoff (funding is allowed from draft onward — fixture with positive fuel in `discovery`/`matched_pending_fuel`), When the NGO loads the page, Then no assistant exists in ANY of them and the chat surface remains framed as Discovery — funding alone never activates the assistant; and Given an unfunded pre-scoped project, Then Discovery is the only NGO↔AI chat surface. [cx: full state sweep + the funded-pre-kickoff fixture — funding is not the trigger]
- **AT-033.03 (P0)** — Given the project later reaches `completed`, When the NGO loads the page, Then the "from in_progress onward" clause governs the assistant surface's presence. **[TENSION → codex pass: a COMPLETED project's billable assistant collides with REQ-006/012 — leftover fuel releases to general balance, project keys terminate, and the provider workspace archives at completion, so no funded metering path exists there. Candidate resolutions: (a) assistant availability ends at completion (align the clause to in_progress-only), or (b) a read-only non-billable rendering post-completion. Held for the batch-5 adversarial evaluation; the assertion stays unpinned until resolved.]**

## B. Metering (fuel, no free credits)

- **AT-033.04 (P0)** — Given an assistant turn, When it completes, Then the project's fuel reflects the consumption [cross: REQ-006 provider truth], the per-turn cost is shown on the surface, remaining fuel is visible, and the NGO's free-credit balance is UNCHANGED — the assistant never draws credits; the turn's usage row carries the NGO-assistant category. [cross: AT-034 owns the row schema]
- **AT-033.05 (P0)** — Given the project's fuel at zero, When the NGO sends a billable request, Then it is not accepted and a top-up path is offered; after a top-up lands, the same request is accepted — stop-and-offer, not silent failure. [cross: AT-006 owns top-up mechanics]

## C. Read-only ceiling

- **AT-033.06 (P0)** — Given the assistant's capabilities, When mutation is attempted through it by any phrasing (four probes: set a task status, resolve a blocker, accept a scope addition, move money/top-up), Then no mutation path exists — the underlying task, blocker, ledger, and scope records are unchanged (sentinels) — the assistant is strictly read-only.
- **AT-033.07 (P0)** — Given controlled fixtures (a named in-progress task, an open blocker with a known cause, a recent-activity set, and a known fuel balance/burn), When the NGO asks the four framed questions, Then each answer is judgeable against its fixture: the STATUS answer names the current work state; the blocker answer EXPLAINS the open blocker (cause + what it waits on, not a bare echo); the progress answer SUMMARIZES the recent activity; and the runway answer carries the fuel runway consistent with the fixture. [cx: echo-the-sentinel could have passed — the four promised capabilities asserted individually] [cross: AT-026.02 owns the mirror's write-path absence]
- **AT-033.08 (P0)** — Given the NGO asks for a scope or priority change, When the assistant responds, Then it explains the REQ-025 protocol (in-thread acceptance by the volunteer) and MAY pre-fill a draft — and the submission act remains the NGO's own: no assistant-originated thread message or task exists without the NGO submitting. [cross: REQ-025/AT-025.01]

## D. Surface reuse & control posture

- **AT-033.09 (P0)** — Given the `matched_pending_fuel` → `in_progress` KICKOFF transition (the reframe trigger — not funding), When the project page chat is compared before and after, Then the named invariants hold: the same frontend chat component, the same request route/handler, the same conversation store/identifier lineage, and the same model configuration as Discovery — reframed, not replaced; a text question gets a text answer (on-demand Q&A exercised), and no assistant message is ever initiated without an NGO request. [cx: trigger corrected to kickoff (REQ-004 funded Discovery continues pre-kickoff); "no second infra" pinned to four observable invariants; Q&A exercised behaviorally]
- **AT-033.10 (P0)** — Given positive fuel, When the NGO submits both sustained heavy usage AND clearly off-project but otherwise-permitted text questions (two fixtures), Then none is declined, redirected, capped, or gated for being outside project scope — the absent guardrail is the SCOPE guardrail; the cost display is present on every turn (the control); and the zero-fuel stop (AT-033.05), budget commitments, and AUP/safety controls remain untouched and out of this test's scope. [cx: "no cap/threshold at all" over-asserted — zero-fuel refusal and Promise budget bounds are required elsewhere; off-scope-question fixture proves the actual clause]

## Coverage map

| REQ-033 clause | Tests |
|---|---|
| NGO-only visibility (volunteer/visitor/public never see it) | 01 |
| No assistant in ANY pre-in_progress state (funded-pre-kickoff stays Discovery); unfunded → Discovery is the only chat | 02 [cx] |
| "From in_progress onward" at completed — HELD for the codex pass (REQ-006/012 completion fuel-release/archival collision) | 03 [tension] |
| Fuel-metered, per-turn cost + remaining fuel shown, no credits, category row | 04 |
| Zero fuel → stop accepting billable + offer top-up | 05 |
| Strictly read-only (status/blockers/scope/money mutation impossible) | 06 |
| The four promised reads: status named, blockers EXPLAINED, progress SUMMARIZED, runway reported | 07 [cx] |
| Scope ask → REQ-025 protocol explanation + optional NGO-submitted draft | 08 |
| Kickoff-triggered reframe; same component/route/store/model (four invariants); text Q&A exercised; never unprompted | 09 [cx] |
| No SCOPE guardrail (off-project questions flow with positive fuel); cost display every turn; zero-fuel/budget/AUP controls out of scope here | 10 [cx] |
