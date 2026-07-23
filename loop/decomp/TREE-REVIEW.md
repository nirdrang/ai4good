# Tree review — the decomposition, ready for your approval

> **What this is:** the founder-facing review of the full PRD decomposition, written after all
> five batches went through the pipeline (draft → one adversarial codex round → fold → commit).
> **Nothing has been pushed to Linear.** The push happens only after you approve this review.
> Written 2026-07-22.

## What was built

Every one of the 30 PRD requirements now has a decomposition file in `loop/decomp/` that says,
in plain terms: what pieces of work make the requirement real (its **deliverables** — 142 across
the tree), what the small buildable slices inside each piece are (its **leaves** — 360, each a
future child work item), and **which acceptance tests prove each leaf done**. Every requirement
file ends with an arithmetic check, and a mechanical checker (`loop/decomp/check-tree.ps1`)
re-verifies the whole tree in one run. Its current result:

- **All 658 P0 acceptance tests are mapped, each to exactly one leaf** — nothing double-counted,
  nothing dropped, across all 30 requirements.
- **The build-order graph has no circular dependencies** — a straight-line build order exists.

Four codex review rounds (one per batch, the agreed cap) produced **73 findings, all folded**:
coverage gaps, work items that mixed unrelated jobs, dependency lines that pointed both ways,
and references to work that did not exist. The four critique artifacts are committed in
`loop/out/decomp-critique-w1..w5.json`.

## The shape of the tree (what lands in Linear on approval)

One tracking item per requirement on the PM board (team AI4GOOD-PM), grouped into wave projects.
The engineering board (AI4GOOD-DEV) starts EMPTY — a requirement's deliverables and leaves are
created only when that requirement is pulled, from its decomposition file.

| Wave (Linear project) | Requirements | Tests |
|---|---|---|
| W1 Foundation | 001 auth · 003 intake · 005.5 lifecycle engine · 006 money ledger · 009 gateway · 016 notifications | 207 |
| W2 Discovery & intake | 002 vetting · 004 Discovery agent · 005 scope doc · 023 triage · 032 attachments | 126 |
| W3 Match & build rails | 007 matching · 008 GitHub · 021 Lovable · 026 Linear/tasks · 028 the volunteer Skill · 036 PRD gate | 153 |
| W4 Run & money surfaces | 010 project page · 011 listings · 013 NGO dashboard · 014 volunteer dashboard · 015 thread · 024 blockers · 025 scope additions · 033 NGO assistant · 034 attribution | 129 |
| W5 Lifecycle & ops | 012 completion · 027 abandonment · 030 ops & money corrections · 031 break-glass | 43 |

The W0 bring-up items (test harness + at-config registry, the work-skill build with its
rehearsal drills, staging infrastructure) and the 7 design batch items are NOT PM items —
they are created on the engineering board (d87): process work with no acceptance suites,
no attribution bindings, and no pull ceremony. Bring-up items close via the GitHub
integration on merge; design batches close manually on their real evidence (design gate
green + your gallery sign-off). The PM board holds exactly the 30 requirements below.

## Three things you should sign off on specifically

**1. Waves are grouping labels; the dependency edges are the real build order.**
One honest wrinkle surfaced: the intake requirement (REQ-003) sits in the Foundation wave
thematically, but its true prerequisites include vetting (REQ-002) and attachments (REQ-032)
from wave 2 — so in actual build order it runs after them, against stub fixtures until they
land. The blocking relations in Linear will reflect the TRUE order; the wave label is just the
project it is filed under. If you prefer the label to match (move REQ-003 into wave 2), say so
and I move it before the push — nothing else changes.

**2. Co-development pairs are split one-way, never circular.**
Six places where two requirements genuinely need each other were split so one side builds a
primitive first and the other consumes it: money↔gateway (reserve inventory before checkout;
ledger before budget math), publishing↔triage, task-management↔PRD-gate (the task push is
built against a controlled stand-in of the gate, then the real gate uses it), GitHub↔Lovable
setup, thread↔scope-protocol, assistant↔attribution. This is why the graph has no cycles.

**3. Some requirements only finish when later screens exist.**
A backend requirement whose tests include a user-facing surface keeps that surface's re-run in
its completion gate — so, for example, the gateway (W1) and attachments (W2) items cannot be
marked Done until the project page (W4) exists and their screen-level tests re-run against it.
These deferred re-runs are written into both requirements' files. Practically: expect several
early-wave PM items to sit at "everything but the screen re-run green" until wave 4.

## Small print (also review-worthy)

- **Four leaves own no test ids by design** (the gateway's key-reserve pool, the file-upload
  primitive, the assistant's visibility policy, the blocker aggregation feed) — each is proven
  by its consumers' tests; the checker accounts for them.
- **Pinned-but-open values** ride the at-config registry, not the manifests: the gateway latency
  targets (provisional pending your SLO), the binding-check threshold (OD-4), the PRD-gate
  threshold (OD-7), aging timers, size caps. Open decisions OD-1 (merge authority), OD-2 (panel
  scope), and OD-6 (gateway hosting) stay open — no manifest presumes an answer.
- **One coverage gap was found and flagged, not papered over:** the PRD's requirement that
  blockers tied to a departed volunteer are archived or retargeted before re-listing has no
  directly-asserting P0 test; it is flagged in the lifecycle manifest for the acceptance layer
  rather than silently attached to a neighboring test.

## What happens on your approval

1. Exactly 30 PM items created on AI4GOOD-PM from these files (title, wave project, the done
   contract in the description, blocking relations from the depends-on lines) — nothing else
   on the PM board (d87).
2. The W0 bring-up items and the 7 design batch items created on AI4GOOD-DEV (vanilla
   working items; merge-close for code, manual close on sign-off for design batches).
3. Nothing assigned; nothing In Progress. The first `/next` after that starts the first
   requirement.

**To approve:** say so (optionally with the REQ-003 wave call). To change anything first: name
it, and the change goes through a manifest edit + a check-tree run before the push.
