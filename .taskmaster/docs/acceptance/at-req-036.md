# AT-REQ-036 — Dev-Authored Project PRD & Completion Gate

Source: requirements/req-036.md (prd-mvp.md REQ-036; OD-7 open — threshold + scorer configuration, pilot-tuned). Dependencies: REQ-004, REQ-009, REQ-010, REQ-024, REQ-026, REQ-034.

**Boundary note:** REQ-036 owns the bootstrap task's purpose, the PRD-authoring phase, the scorer, and the gate. Linear seeding mechanics are REQ-026's (AT-026.06/08); blocker mechanics REQ-024's; the Q&A log display REQ-010's; metering/attribution REQ-009/034's — `[cross:]` here. OD-7 keeps the threshold value and scorer configuration open: tests use the CONFIGURED threshold, never a pinned number.

## A. Bootstrap & authoring

- **AT-036.01 (P0)** — Given kickoff completes, When the Linear workspace is read, Then exactly ONE task exists — the bootstrap "Author the project PRD" task — and no build-backlog issue exists anywhere before the gate passes. [cross: AT-026.06/08 own the seeding mechanics]
- **AT-036.02 (P0)** — Given the volunteer authors the PRD, When the work is inspected, Then the PRD file lives in the project repo, and the authoring session's metered requests are attributed to the bootstrap task (usage rows bound to it, fuel-billed). [cross: AT-009.08/AT-034.01]
- **AT-036.03 (P0)** — Given the volunteer raises a clarifying question during authoring, When it flows, Then it rides the REQ-024 blocker flow and lands in the project Q&A log. [cross: AT-024.17/AT-010.12]

## B. Scorer

- **AT-036.04 (P0)** — Given a PRD fixture with a KNOWN coverage gap against the Discovery scope (one story unaddressed, one acceptance criterion missing, a data-sensitivity handling omission, and a violated constraint — four seeded gaps), When the volunteer marks the PRD ready and the scorer runs, Then it produces a numeric completion score AND named gaps that identify the four seeded omissions — coverage judged over stories, acceptance criteria, data-sensitivity handling, and constraints.
- **AT-036.05 (P0)** — Given the scorer runs, When its execution is metered, Then it consumes project fuel (a usage row exists for the scoring run). [cross: REQ-009/034]
- **AT-036.06 (P0)** — Given a score AT or ABOVE the configured threshold, When the gate evaluates, Then the build tree is decomposed from the PRD and pushed [cross: AT-026.08/09]; and Given a score BELOW it, Then NO tree is pushed, a gap report is produced, and the PRD phase continues — the two outcomes are mutually exclusive on the threshold boundary (at-threshold passes).
- **AT-036.07 (P0)** — Given repeated below-threshold iterations, When the volunteer re-scores many times (fixture: more attempts than any plausible cap), Then no attempt cap intervenes — iteration is bounded by project fuel alone; and When fuel reaches the stop, Then metered scoring stops with the fuel machinery, not a scorer-specific limit. [cross: AT-006/009 own the fuel stop]
- **AT-036.08 (P0)** — Given the volunteer iterates on the gaps and marks ready again, When the scorer re-runs, Then a NEW score event records with the new score and gaps — each run is an event, not an overwrite.

## C. Roles & notifications

- **AT-036.09 (P0)** — Given the NGO during the PRD phase, When the project page renders, Then the PRD-phase status is visible (the bootstrap task and score state); and When the NGO's controls are probed, Then NO approve/reject control over the PRD or the gate exists — the scorer is the gate; NGO input flows only via clarifications. [cross: AT-010 owns page rendering]
- **AT-036.10 (P0)** — Given score events, When each fires, Then the volunteer receives the gap report on a below-threshold run, and the NGO receives gate-pass and backlog-live on the passing run. [cross: REQ-016 owns delivery]

## Coverage map

| REQ-036 clause | Tests |
|---|---|
| Kickoff seeds exactly one bootstrap task; no backlog pre-gate | 01 |
| PRD in repo; authoring metered + attributed to bootstrap | 02 |
| Clarifications ride blocker flow → Q&A log | 03 |
| Scorer: Discovery-scope coverage (stories, ACs, data sensitivity, constraints) → score + named gaps | 04 |
| Scorer runs fuel-metered | 05 |
| Gate: ≥ threshold → decompose + push; below → gap report + continue (OD-7 threshold configured) | 06 |
| Bounded by fuel, not attempts | 07 |
| Re-score = new event | 08 |
| NGO sees status, is never an approver | 09 |
| Score events recorded + notified (gap report → volunteer; gate-pass/backlog-live → NGO) | 08, 10 |
