# AT-REQ-036 — Dev-Authored Project PRD & Completion Gate

> **[d82 AMENDMENT PENDING — two-tree model, 2026-07-19]:** the founder ruled a TWO-TREE Linear model (PM tree = requirement items from the scope doc, the only NGO-facing authority, pull/verified-completion authorities, requirement-level attribution; dev tree = the volunteer's decomposition, vendor-native incl. merge-to-Done, exempt from revert) and REQUIREMENT-LEVEL attribution granularity. The requirement text is already updated (see the isolate); this suite's tests still reflect the single-tree / task-level model and need an amendment pass (retargeting detect-and-revert to the PM tree, binding tests to requirement granularity, decomposition push to the dev tree, per-task baselines to per-requirement). Do not implement against this suite until the pass lands.

Source: requirements/req-036.md (prd-mvp.md REQ-036; OD-7 open — threshold + scorer configuration, pilot-tuned). Dependencies: REQ-004, REQ-009, REQ-010, REQ-024, REQ-026, REQ-034.

**Boundary note:** REQ-036 owns the bootstrap task's purpose, the PRD-authoring phase, the scorer, and the gate. Linear seeding mechanics are REQ-026's (AT-026.06/08); blocker mechanics REQ-024's; the Q&A log display REQ-010's; metering/attribution REQ-009/034's — `[cross:]` here. OD-7 keeps the threshold value and scorer configuration open: tests use the CONFIGURED threshold, never a pinned number.

## A. Bootstrap & authoring

- **AT-036.01 (P0)** — Given kickoff completes, When the Linear workspace is read, Then exactly ONE task exists — the bootstrap "Author the project PRD" task — and no build-backlog issue exists anywhere before the gate passes. [cross: AT-026.06/08 own the seeding mechanics]
- **AT-036.02 (P0)** — Given the volunteer authors the PRD, When the work is inspected, Then the PRD file lives in the project repo; the authoring session's metered requests carry bootstrap-task-bound attribution rows (token telemetry), AND the provider-authoritative billed usage / project-fuel balance shows a corresponding before/after change for the authoring requests — the two meters proven separately. [cx r2: the two-meter correction applied to authoring too — a usage row cannot prove fuel billing] [cross: AT-009.08/AT-034.01/AT-006]
- **AT-036.03 (P0)** — Given the volunteer raises a clarifying question during authoring, When it flows, Then it rides the REQ-024 blocker flow and lands in the project Q&A log. [cross: AT-024.17/AT-010.12]

## B. Scorer

- **AT-036.04 (P0)** — Given a PRD fixture with a KNOWN coverage gap against the Discovery scope (one story unaddressed, one acceptance criterion missing, a data-sensitivity handling omission, and a violated constraint — four seeded gaps), When the volunteer marks the PRD ready and the scorer runs, Then it produces a numeric completion score AND named gaps that identify the four seeded omissions — coverage judged over stories, acceptance criteria, data-sensitivity handling, and constraints.
- **AT-036.05 (P0)** — Given the scorer runs, When its execution completes, Then an AUTHORITATIVE project-fuel consumption is observable (the provider-truth balance/billed figure reflects the run) — and separately, the attribution row for the scoring run exists (token-denominated, REQ-034). [cx: a usage row alone could not prove fuel billing — the two meters are separate by REQ-034] [cross: AT-006/AT-034.05]
- **AT-036.06 (P0)** — Given THREE controlled end-to-end fixtures — a score above, exactly AT, and below the configured threshold (controlled scorer results), When the volunteer performs ONLY the mark-ready action in each, Then the scorer runs and its score event AUTOMATICALLY drives the correct branch with no separate gate invocation: above and at-threshold end with the tree decomposed and pushed; below ends with NO tree, a gap report produced, and the PRD phase continuing; and the PASSING fixture's PRD carries traceable PRD-specific story/AC wording (absent from the Discovery scope doc — sentinel phrasing) that the pushed tree derives from — the backlog decomposes from the PRD artifact, never from Discovery directly. [cx: end-to-end from mark-ready] [cx r2: at-threshold given its own controlled fixture; PRD-derivation sentinel added — Discovery is a scope contract, not a task source] [cross: AT-026.08/09]
- **AT-036.07 (P0)** — Given a DEFINED attempt count (derived from the configured limits and fuel sized to cover it), When the volunteer re-scores that many times below threshold, Then EVERY pre-fuel-stop attempt succeeds, NO scorer/gate decision depends on the prior attempt or score-event count — regardless of where a boundary might be encoded: state, configuration, hard-coding, or a count-derived computation (the inspection asserts count-independence of the decision, not just absent config) — and when fuel then reaches the stop, the FIRST rejected attempt is rejected by the fuel machinery alone (its rejection cause is the fuel stop, not a scorer limit). [cx: boundary pinned] [cx r2: count-independence, not merely no-attempt-limit-state — a hard-coded or derived cap could have passed] [cross: AT-006/009 own the fuel stop]
- **AT-036.08 (P0)** — Given the volunteer iterates on the gaps and marks ready again, When the scorer re-runs, Then a NEW score event records with the new score and gaps — each run is an event, not an overwrite.

## C. Roles & notifications

- **AT-036.09 (P0)** — Given the NGO during the PRD phase, When the project page renders, Then the PRD-phase status is visible (the bootstrap task and score state); and When the NGO role attempts EVERY PRD-phase mutation through any UI or API route — edit the PRD, mark it ready, trigger a re-score, override the score, change the threshold, or force the gate — Then each is absent or authorization-denied and produces NO score or backlog event, while answering a clarification SUCCEEDS — the scorer is the gate; NGO input flows only via clarifications. [cx: control-absence alone left mutation routes untested] [cross: AT-010 owns page rendering]
- **AT-036.10 (P0)** — Given score events, When each fires, Then the volunteer receives the gap report on a below-threshold run, and the NGO receives gate-pass and backlog-live on the passing run — all three delivered through REQ-016's shared emitter as registered taxonomy events. [Resolved — d81: these events were mandated here but absent from REQ-016's closed taxonomy (same shape as d78/T4's watchdog registration); the taxonomy now carries the PRD-gate rows] [cross: REQ-016 owns delivery]

## Coverage map

| REQ-036 clause | Tests |
|---|---|
| Kickoff seeds exactly one bootstrap task; no backlog pre-gate | 01 |
| PRD in repo; authoring metered (authoritative fuel) + attributed (token rows) to bootstrap | 02 [cx r2] |
| Clarifications ride blocker flow → Q&A log | 03 |
| Scorer: Discovery-scope coverage (stories, ACs, data sensitivity, constraints) → score + named gaps | 04 |
| Scorer runs fuel-metered (authoritative fuel + separate attribution row) | 05 [cx] |
| Gate END-TO-END from mark-ready alone: above/AT/below fixtures; tree derives from the PRD artifact (Discovery = scope contract, not task source) | 06 [cx r2] |
| Bounded by fuel, not attempts (count-independent decisions; rejection cause = fuel stop) | 07 [cx r2] |
| Re-score = new event | 08 |
| NGO sees status, is never an approver (all mutation routes denied; clarifications succeed) | 09 [cx] |
| Score events recorded + notified via registered REQ-016 taxonomy rows (d81) | 08, 10 [d81] |
