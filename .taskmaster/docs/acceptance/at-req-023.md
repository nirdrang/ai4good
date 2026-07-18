# AT-REQ-023 — Platform Triage Gate (founder-decided review + no-authority advisory pass)

Source: requirements/req-023.md (prd-mvp.md REQ-023, as rewritten by d74). Dependencies: REQ-002, REQ-005, REQ-005.5, REQ-031.

> **Ruling history:** d73 (screener never terminal) was superseded by **d74**: the autonomous screener is out of v1 entirely (→ RM-64). Every publish is decided by the founder-reviewer; a structured AI **advisory pass** attaches versioned per-check evidence to the queue item but holds no authority — it cannot transition state, emits no approve/decline recommendation, and its unavailability never blocks review. d73's human-only-terminal principle survives, extended: humans own ALL triage outcomes.

**Boundary note:** REQ-023 owns the review queue, the advisory pass, and the decision records. The lifecycle transitions the decisions drive (`triage`→`open`/`scoped`/`cancelled`) are owned by REQ-005.5; vetting by REQ-002; break-glass by REQ-031 — `[cross:]` here.

## A. Routing

- **AT-023.01 (P0)** — Given any publish — including a re-publish after a return — When it fires, Then the project enters the founder review queue with the advisory pass's evidence attached, remains publicly invisible on every surface, and no path reaches the marketplace without a recorded human approval (probe for bypasses). [d74: universal review replaces screener routing] [cross: AT-005.5.13]

## B. Advisory evidence (one violating fixture per check dimension — evidence, never a decision)

- **AT-023.02 (P0)** — Given four INDEPENDENT fixtures — a commercial need, a closed-source-for-resale need, a private-but-MIT publication request, and a public-but-non-MIT one — When each is published, Then each queue item's advisory evidence marks the open-source-alignment check failed with its reasons, and each project stays invisible pending the reviewer. [cx: independent variants] [cx r2: private/non-MIT split] [d74: assertion moved from screener decision to advisory evidence]
- **AT-023.03 (P0)** — Given a confidential-codebase need (fixture), When published, Then the advisory evidence flags it CATEGORICAL on the open-source dimension — and, like every publish, it awaits the founder's decision; no automated outcome of any kind occurs. [d73→d74: the one-click pre-flag machinery is gone; the founder sees every case directly]
- **AT-023.04 (P0)** — Given a need whose purpose mismatches the NGO's vetted profile (fixture), When published, Then the advisory evidence marks the nonprofit-purpose check failed with reasons. [cross: REQ-002 owns the profile]
- **AT-023.05 (P0)** — Given an abusive scope relative to the declared complexity tier (fixture), When published, Then the advisory evidence marks scope-reasonableness failed with reasons. [cx: concretized] [d74: evidence-form]
- **AT-023.06 (P0)** — Given an acceptable-use violation (surveillance fixture; spam and illegal-use variants), When each is published, Then each item's advisory evidence marks acceptable-use failed with reasons. [cx] [d74: evidence-form]
- **AT-023.07 (P0)** — Given a Tier-2 need WITHOUT a fixtures-only plan and one WITH a valid plan (two fixtures), When published, Then the advisory evidence carries the data-tier check result for each (failed vs passed) and the declared tier — and both await the founder like every other publish (no tier has an automated path anywhere). [cx r2] [d74: "never auto-approves" is now the universal rule, not a Tier-2 special case]
- **AT-023.08 (P0)** — Given Discovery raised risk flags on the project (fixture), When published, Then those flags appear in the advisory evidence on the queue item. [cross: REQ-004]
- **AT-023.09 [retired — d74: the uncertainty signal and threshold routing no longer exist; there is nothing to route]**
- **AT-023.22 (P0)** — Given a need whose description involves health/financial personal data but is DECLARED Tier-1 (mis-tiered fixture), When published, Then the advisory evidence marks the data-tier check failed for under-declaration. [cx r2: added] [d74: evidence-form]

## C. The reviewer's decisions

- **AT-023.10 (P0)** — Given a queued publish, When the founder-reviewer APPROVES, Then the project moves to `open` and becomes publicly visible, and the decision record exists — no project reaches `open` any other way. [d74: human approval replaces auto-approval] [cross: AT-005.5.15]
- **AT-023.11 (P0)** — Given EVERY publish (clean and flagged fixtures alike), When routing completes, Then each has a founder-queue entry with the advisory evidence pre-surfaced — the reviewer never starts from a blank case. [d74: widened from non-decided-only to all]
- **AT-023.21 (P0)** — Given a founder acting on a queue item, When the decision surface/API is probed, Then it permits exactly THREE outcomes — approve → `open`, return → `scoped`, terminal decline → `cancelled` — and any other decision is rejected. [cx: added] [d74: approve added as the third outcome (the screener's exit is now the founder's)]
- **AT-023.12 (P0)** — Given a founder return-to-`scoped`, When it lands, Then the NGO sees the reason note; the project stays INVISIBLE to the marketplace throughout the edit-republish loop; the republish re-enters review; and on that later review the prior notes are visible to the reviewer. [cross: AT-005.5.16/17]
- **AT-023.13 (P0)** — Given a founder terminal decline (non-remediable), When it lands, Then the project cannot be edited and resubmitted — the decline is terminal. [cross: AT-005.5.18/50]
- **AT-023.14 (P0)** — Given any reviewer decision, When its record is read, Then it captures: reviewer, timestamp, decision, reason, per-check dispositions, policy version, the advisory output and its version (or its recorded absence), data tier, and scope snapshot — the RM-64 evaluation dataset fields. [d74: record enriched beyond the original six fields]
- **AT-023.15 [retired — d74: no auto-approvals exist, so the post-hoc spot-check surface is gone]**
- **AT-023.20 [retired — d74: every publish is in the founder queue by design; the decided-cases-never-queued assertion is moot]**

## D. Advisory has no authority

- **AT-023.18 (P0)** — Given the advisory pass output for any fixture, When inspected, Then it contains per-check evidence and versions but NO approve/decline recommendation and NO state transition; and Given the advisory model is unavailable (sentinel outage), When a publish fires, Then the queue item is created without evidence, marked advisory-absent, and the reviewer can decide unaided — the pass never blocks review. [d74: replaces the threshold/model-family test — authority-absence is the new invariant]

## E. Oversight & NGO-facing copy

- **AT-023.16 (P0)** — Given queue items of different ages (controlled clock), When the queue renders, Then each item exposes its age; the end-of-next-business-day target is an internal ops target with no NGO-facing surface. [d74: target named]
- **AT-023.17 (P0)** — Given a wrongly APPROVED project (human error) — one pre-build with no repo and one in-build with a repo (two fixtures), When break-glass runs, Then every public surface (listing, showcase, public page) is no longer reachable in both cases, the repo is additionally hidden in the with-repo case, the lifecycle state is UNCHANGED, and an audit record exists; un-hide restores visibility with nothing else altered. [cx r2] [d75: finalized — break-glass is an audited reversible visibility switch, never a transition] [cross: REQ-031]
- **AT-023.19 (P0)** — Given a clean publish and a flagged publish (two fixtures), When each NGO views its project pre-decision, Then BOTH show the "under review" state with copy promising no formal SLA; visibility begins only at approval — no publish is ever live before a decision. [d74: clean-goes-live-immediately is dead]

## Coverage map

| REQ-023 clause (d74) | Tests |
|---|---|
| Every publish → review queue; invisible until human decision; no marketplace bypass (incl. republish) | 01, 19 |
| Advisory evidence per check: open-source (4 variants), categorical flag, purpose-vs-profile, scope-vs-tier, acceptable use, data-tier (Tier-2 both ways + under-declared), risk flags | 02–08, 22 |
| Advisory holds no authority: no recommendation, no transition, outage never blocks review | 18 |
| Reviewer's exactly-three outcomes; approve is the only path to `open` | 10, 21 |
| Every publish queued with evidence pre-surfaced | 11 |
| Return loop (reason note, invisibility, re-entry, prior notes) | 12 |
| Terminal decline (non-remediable) | 13 |
| Decision record = RM-64 dataset fields | 14 |
| Queue age + internal review target (no NGO SLA) | 16 |
| Break-glass recovery of erroneous approvals (d75: visibility switch — all public surfaces + repo-when-exists, state untouched, reversible, audited) | 17 |
| Retired by d74: uncertainty routing (09), spot-check (15), decided-never-queued (20) | — |
