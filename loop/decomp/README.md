# loop/decomp — the decomposition manifests (P1)

Canonical source for the buildout's Linear content. Per the adopted way-of-work (d83) and
d82's two-tree model: **the PM tree is pushed from these manifests once, after the founder's
tree review; the dev tree is materialized lazily per requirement by `/next` from the same
manifest.** Linear is the working mirror; these files are the truth (`/doc-sync` keeps them
aligned; sync-stamps prove currency).

## Manifest format (`req-0NN.md`)

```
# DECOMP REQ-0NN — <title>
pm-item: <Linear ID once pushed> · wave: <wave> · surface: backend|ui|mixed|skill
sync-stamp: <commit> · <dNN>
depends-on: REQ-…, REQ-…            ← machine-readable set of TRUE PREREQUISITE edges only —
                                      the whole graph must topologically order; becomes PM
                                      blocking relations. May be a SUBSET of the requirement
                                      text's dependency line (those lines mix prerequisites
                                      with consumers/interfaces); every deviation is recorded
                                      in cross-contracts.
cross-contracts: <prose>            ← stubs, co-development splits, consumer/interface-only
                                      relations, cross-manifest leaf edges, deviations from
                                      the requirement text's line; never parsed as dependencies
sources: requirements/req-0NN.md · acceptance/at-req-0NN.md (<N> P0) · architecture-notes#req-0NN

## Done contract
Every P0 green at integration tier [+ wired, for UI-fronted REQs] + founder attestation.
Verify commands: <exact commands>            ← pinned at pull (the manifest revision)

## Deliverables (3–6, plain-language — the dev tree's parent issues)
### D1 — <name>
  leaves:
  - L1 <slice> · verify: AT-0NN.xx,xx · blocked-by: —
  - L2 <slice> · verify: AT-0NN.xx    · blocked-by: L1
### D2 — …

## Coverage check
Every P0 AT-id of this requirement appears in exactly one leaf's verify set (bijection).
```

## Pipeline per batch (same rhythm as the AT batches)

draft (deliverable-first, from the AT coverage maps) → ONE codex critique round
(completeness bijection, sizing, dependency correctness, invented-work) → fold → commit.
After all batches: whole-tree pass (cross-REQ dedup, wave assignment check, global
bijection script) → the founder's TREE REVIEW artifact → only then the PM push.

## Waves (Initiatives; PM projects until initiatives are created manually)

- **W0 Bring-up** — infra items (harness, staging, CI, work skill + drills, at-config).
- **W1 Foundation** — REQ-001, 003, 005.5, 006, 009, 016.
- **W2 Discovery & intake** — REQ-002, 004, 005, 032, 023.
- **W3 Match & build rails** — REQ-007, 008, 021, 026, 036, 028.
- **W4 Run & money surfaces** — REQ-010, 011, 013, 014, 015, 024, 025, 034, 033.
- **W5 Lifecycle & ops** — REQ-012, 027, 030, 031.
- **Design** — the 7 batch items (playbook: design/design-session.md).
- **Wiring** — inside each UI-fronted REQ as its wiring leaf, surfaced per REQ.
- **Pilot readiness** — full-corpus run, drills, empirical probe.

Wave membership = a starting hypothesis from the REQ dependency lines; the whole-tree pass
finalizes it against the extracted dependency graph.
