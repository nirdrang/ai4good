# AT-REQ-033 — Post-Discovery NGO Project Assistant (funded, fuel-metered)

Source: requirements/req-033.md (prd-mvp.md REQ-033, incl. d37 NGO-only). Dependencies: REQ-004, REQ-005.5, REQ-006, REQ-015, REQ-025, REQ-026, REQ-034.

**Boundary note:** REQ-033 owns the assistant: its visibility, metering, read-only ceiling, and Discovery-surface reuse. The Discovery chat itself is REQ-004's; fuel mechanics REQ-006's; the read-only Linear mirror AT-026.02's; the attribution category row AT-034's; the scope-addition protocol REQ-025's — `[cross:]` here.

## A. Visibility (NGO-only, in_progress onward)

- **AT-033.01 (P0)** — Given an `in_progress` funded project, When each actor loads the project page: the project's NGO account sees the assistant; the assigned volunteer, an authenticated unrelated visitor, an anonymous visitor, AND the platform admin each see NO assistant surface at all — "only to the project's NGO account" includes privileged roles. [cx r2: the admin fixture added]
- **AT-033.02 (P0)** — Given EVERY pre-`in_progress` lifecycle state (parameterized sweep), including a FUNDED project still before kickoff (positive fuel in `discovery`/`matched_pending_fuel`) AND an unfunded project that reached `cancelled` (two named fixtures), When the NGO loads the page, Then no assistant exists in ANY of them — funding alone never activates the assistant; and SEPARATELY, in the states where Discovery actually exists (post-intake), Then Discovery is the only NGO↔AI chat surface there. [cx] [cx r2: sweep asserts assistant ABSENCE only (Discovery does not exist in every pre-state, e.g. draft); Discovery-only scoped to post-intake states; unfunded-cancelled fixture added]
- **AT-033.03 (P0)** — Given the availability interval (resolved d78 T5: first kickoff → terminal state), When probed across states, Then the assistant is PRESENT from the first `in_progress` entry, still PRESENT during a post-kickoff nonterminal window (release → re-opened rematch fixture), and the bot interface is ABSENT at `completed` and at `cancelled` while the project's static task and activity surfaces remain. [Resolved — d78 T5, codex-amended, editorial: a completed project has no funded metering path (REQ-006/012 fuel release + key termination + workspace archival), and the interval form — not in_progress-only — keeps the assistant through funded rematch windows.]

## B. Metering (fuel, no free credits)

- **AT-033.04 (P0)** — Given an assistant turn, When it completes, Then the project's fuel reflects the consumption [cross: REQ-006 provider truth], the per-turn cost is shown on the surface, remaining fuel is visible, and the NGO's free-credit balance is UNCHANGED — the assistant never draws credits. (The NGO-assistant category row is REQ-034's obligation — non-gating here.) [cx r2: the category-row assertion was a REQ-034 behavior, moved out of this test's pass condition] [cross: AT-034.10]
- **AT-033.05 (P0)** — Given the project's fuel at zero, When the NGO sends a billable request, Then it is not accepted and a top-up path is offered; after a top-up lands, the same request is accepted — stop-and-offer, not silent failure. [cross: AT-006 owns top-up mechanics]

## C. Read-only ceiling

- **AT-033.06 (P0)** — Given the assistant's capabilities, When mutation is attempted through it by any phrasing (four probes: set a requirement status, resolve a blocker, accept a scope addition, move money/top-up), Then no mutation path exists — the underlying requirement, blocker, ledger, and scope records are unchanged (sentinels) — the assistant is strictly read-only.
- **AT-033.07 (P0)** — Given controlled fixtures (a named in-progress task, an open blocker with a known cause and a known awaited action, a recent-activity set of N known events, and a known fuel balance + burn rate whose runway is a defined value: balance ÷ burn), When the NGO asks the four framed questions, Then each answer passes its defined oracle: the STATUS answer states the fixture task as current work; the blocker answer names the fixture cause AND the awaited action; the progress answer includes at least a configured minimum of the N fixture events and introduces NO fabricated facts; and the runway answer states the defined runway value within a configured tolerance. [cx] [cx r2: each oracle pinned — facts, minimums, formula, tolerance] [cross: AT-026.02 owns the mirror's write-path absence]
- **AT-033.08 (P0)** — Given a SCOPE ask and separately a PRIORITY ask (two probes), When the assistant responds to each, Then each response passes the REQ-025 protocol checklist: the in-thread volunteer acceptance AND the volunteer-created linked task are both named as required before work; the assistant MAY pre-fill a draft — and the submission act remains the NGO's own: no assistant-originated thread message or task exists without the NGO submitting. [cx r2: both branches parameterized; the explanation judged against the full protocol (acceptance + linked task), not acceptance alone] [cross: REQ-025/AT-025.01/02]

## D. Surface reuse & control posture

- **AT-033.09 (P0)** — Given the `matched_pending_fuel` → `in_progress` KICKOFF transition (the reframe trigger — not funding), When the project page chat is compared before and after, Then the EXISTING chat surface/infrastructure is reused (the same chat surface, not a newly introduced one) and the model identity is the same as Discovery's — while a separate conversation record and an assistant-specific prompt/configuration are PERMITTED (the read-only reframe requires them); a text question gets a text answer (on-demand Q&A exercised), and no assistant message is ever initiated without an NGO request. [cx: trigger corrected to kickoff] [cx r2: same-component/route/conversation-id invariants over-specified — reuse + model identity is what the requirement states]
- **AT-033.10 (P0)** — Given fuel provisioned to cover the FULL fixture sequence (a defined finite turn count, staying clear of the zero-fuel stop and provider rate limits), When the NGO submits the named harmless off-project prompts from the fixture list plus the defined repeat-turn sequence, Then NO response is declined, redirected, capped, or gated FOR PROJECT-SCOPE RELEVANCE — the absent guardrail is the SCOPE guardrail; the cost display is present on every turn (the control); the zero-fuel stop (AT-033.05), budget commitments, and AUP controls remain untouched and out of this test's scope. [cx] [cx r2: fixtures pinned — named prompts, finite count, fuel sized to the sequence, rejection-reason scoped]

## Coverage map

| REQ-033 clause | Tests |
|---|---|
| NGO-only visibility (volunteer/visitor/public/ADMIN never see it) | 01 [cx r2] |
| Assistant ABSENT in every pre-in_progress state (funded-pre-kickoff + unfunded-cancelled fixtures); Discovery-only where Discovery exists | 02 [cx r2] |
| Availability interval: first kickoff → terminal (present through rematch; bot ends at completed/cancelled, static surfaces remain) | 03 [d78] |
| Fuel-metered, per-turn cost + remaining fuel shown, no credits (category row → AT-034.10, non-gating) | 04 [cx r2] |
| Zero fuel → stop accepting billable + offer top-up | 05 |
| Strictly read-only (status/blockers/scope/money mutation impossible) | 06 |
| The four promised reads with pinned oracles (task fact, cause + awaited action, min-N events + no fabrication, runway formula + tolerance) | 07 [cx r2] |
| Scope AND priority asks → full REQ-025 checklist (acceptance + linked task) + optional NGO-submitted draft | 08 [cx r2] |
| Kickoff-triggered reframe; existing surface reused + same model identity (separate record/prompt permitted); text Q&A exercised; never unprompted | 09 [cx r2] |
| No SCOPE guardrail (named off-project prompts, finite sequence, fuel-sized fixture); cost display every turn; zero-fuel/budget/AUP controls out of scope here | 10 [cx r2] |
