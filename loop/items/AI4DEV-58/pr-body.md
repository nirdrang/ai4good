# AI4DEV-58 — GitHub sign-in, and the mandatory GitHub link for volunteers

Deliverable D1 leaf L2 of the authentication requirement (`loop/decomp/req-001.md`, revision
`0579425`): GitHub OAuth signup for volunteers, the mandatory GitHub link without which a
volunteer signup cannot complete, and the volunteer-onboarding profile import fired by the link —
asserted as observable firing against a **stub** import source, per the manifest's cross-contract
with the volunteer-profile requirement (real import arrives with that requirement, in a later
wave).

**Acceptance ids this leaf owns:** AT-001.02, AT-001.04, AT-001.05
(`.taskmaster/docs/acceptance/at-req-001.md`). It builds directly on the leaf that landed email
and Google signup and the three account types (merged as pull request #47).

**Status: draft code under review.** The plan critique returned five findings; every one is
ruled on in `loop/items/AI4DEV-58/gate1-rulings.md`, the plan is amended accordingly, and the
draft implementing the amended plan is on this branch. The draft is deliberately un-verified —
it is being critiqued before it is polished green; the verify suite runs after the code critique
is ruled on.

**The draft-code review gate is designed for two readers of different model families and is
running with ONE.** The second reader is stopped by founder ruling (2026-08-08, after it
exhausted its billing-cycle quota mid-gate). The cost is known, not assumed: on a previous item
one reader found a blocker on code where the other reported nothing — the panel has demonstrably
caught what a single reader missed — so a single-reader run is a deliberately weaker gate,
recorded here so the record states what the gate did and did not cover.

The merge ruling — what was built, every review finding and its disposition, and exactly what
the green does and does not claim — will be posted on this pull request before merge, pinned to
the exact head it licenses.
