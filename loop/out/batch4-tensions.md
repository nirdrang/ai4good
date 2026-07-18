# Batch-4 AT-critique tensions — proposed resolutions (for adversarial evaluation)

Three cross-requirement inconsistencies surfaced during AT batch-4 round-1 critique. For each: the conflicting texts, the proposed resolution, and what would change. Read the named REQ sections in .taskmaster/docs/prd-mvp.md and the AT files in .taskmaster/docs/acceptance/ for full context.

## T1 — Skill "enforces pull-then-complete" (REQ-028) vs "attribution is telemetry, never gating" (REQ-034)

REQ-028: "The Skill enforces pull-then-complete: before substantial work, an explicit choice — pull an issue or enter the exploration bucket... exploration turning into implementation forces binding." Also: "binding floors to unattributed (a floor, not a bypass)."
REQ-034 (read it in the PRD): attribution is telemetry, not a security control; steering is detection/suggestion; never gating.

**Proposed resolution (layered):** the enforcement is SKILL-LOCAL workflow discipline — the Skill withholds its own assistance until a binding choice is made; the platform/gateway NEVER blocks a metered request for attribution reasons (a raw request without the Skill flows, attributed unattributed). Disabling the Skill (an allowed act, REQ-028) bypasses the local discipline with attribution flooring. The PRD's own "floor, not a bypass" line is read as the reconciliation. Change set: none to the PRD (a clarifying sentence optional); AT-028.07/08 already folded to this reading.

## T2 — In-Progress authority (three-way: REQ-026 model vs REQ-026 AC vs REQ-028)

REQ-026 model: "self-assignment is the commitment signal (marking the task in progress)"; volunteers "self-assign" as an allowed write.
REQ-026 AC: "Status flows only from PR merges; detect-and-revert enforces it."
REQ-028: "a branch link marks In Progress, a merge marks Done (the only done-path)."

**Proposed resolution:** self-assignment is the AUTHORITY for entering in-progress (the volunteer's allowed write and the commitment signal). The branch link is the GitHub integration's MIRROR/confirmation of that state (Linear's native branch-link automation) — not an independent authority; a branch link without self-assignment should reconcile to the self-assignment rule (integration may set it; the volunteer's assignment is expected first per the norms). "Status flows only from PR merges" is re-scoped to the DONE transition (and other integration-driven transitions), not in-progress. Change set: REQ-026 AC reworded ("done flows only from PR merges; in-progress from self-assignment, mirrored by the branch link"); AT-026.10/17 and AT-028.17 aligned.

## T3 — GitHub Issues categories (REQ-026 "(code bugs only)" vs REQ-008 "bugs, refactors, tech debt")

**Proposed resolution:** REQ-008's category list governs (GitHub Issues = dev-internal code work: bugs, refactors, tech debt); REQ-026's parenthetical is stale shorthand and is harmonized to it. The load-bearing invariant either way: NGO-visible deliverables and scope tasks are NEVER managed in GitHub Issues — Linear is their only home. Change set: REQ-026 parenthetical reworded; AT-026.04 already folded to the invariant.

## Evaluation ask

For each tension: (1) is the proposed resolution CORRECT against the full PRD (check REQ-034's exact wording for T1; Linear's actual branch-link behavior assumptions for T2; both Issue-category texts for T3)? (2) does it break anything elsewhere (other REQs, Promise, existing AT assertions)? (3) is a founder ruling genuinely required, or is this an editorial harmonization the docs can absorb? (4) name the minimal PRD wording change per tension. Attack hidden implications: T1 — does "Skill withholds assistance" itself violate any never-gating language, and is the disable path truly unrestricted? T2 — what happens when the integration's branch-link fires WITHOUT self-assignment (race, wrong task id in branch name): which state wins and does detect-and-revert apply? T3 — does REQ-012 ("open GitHub Issues never block completion") or REQ-010 interact?

OUTPUT ONLY this JSON:
{"tensions":[{"id":"T1|T2|T3","resolution_verdict":"correct|needs-amendment|wrong","founder_ruling_needed":true,"breaks":[".."],"amended_resolution":"..","minimal_prd_change":".."}],"overall":".."}
