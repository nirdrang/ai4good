# AT-REQ-023 — Platform Background Review (founder review after publication + no-authority advisory pass)

Source: requirements/req-023.md (prd-mvp.md REQ-023, as rewritten by d74 and d96). Dependencies: REQ-002, REQ-005, REQ-005.5, REQ-031.

> **Ruling history:** d73 (screener never terminal) was superseded by **d74**: the autonomous screener is out of v1 entirely (→ RM-64), and a structured AI **advisory pass** attaches versioned per-check evidence to the queue item but holds no authority — it cannot transition state, emits no recommendation, and its unavailability never blocks review. **d96 (2026-10-06)** ends the gate: publishing lists the project at once, and the founder's review is a background governance guardrail over the first publish only. Humans still own every review outcome; none of them is a precondition for listing.

**Boundary note:** REQ-023 owns the background review queue, the advisory pass, and the decision records. The lifecycle transitions the decisions drive (`open`→`scoped`/`cancelled`) are owned by REQ-005.5; vetting by REQ-002; break-glass by REQ-031 — `[cross:]` here.

## A. Queue entry

- **AT-023.01 (P0)** — Given a project's FIRST publish, When it fires, Then the project is live on the marketplace at once AND exactly one background review item is created with the advisory pass's evidence attached; the listing does not wait on the item (probe that no publish, listing, or matching path reads it). [d74] [d96: queue entry no longer gates visibility] [cross: AT-005.5.13]
- **AT-023.23 (P0)** — Given a project that already has a background review item, When the NGO confirms a later edit of the Discovery document, republishes after an unpublish, or republishes after a return, Then no new queue item is created. [d96: first publish only]

## B. Advisory evidence (one violating fixture per check dimension — evidence, never a decision)

- **AT-023.02 (P0)** — Given four INDEPENDENT fixtures — a commercial need, a closed-source-for-resale need, a private-but-MIT publication request, and a public-but-non-MIT one — When each is first published, Then each queue item's advisory evidence marks the open-source-alignment check failed with its reasons. [cx: independent variants] [cx r2: private/non-MIT split] [d74: evidence-form] [d96: the project is live meanwhile]
- **AT-023.03 (P0)** — Given a confidential-codebase need (fixture), When first published, Then the advisory evidence flags it CATEGORICAL on the open-source dimension, and no automated outcome of any kind occurs. [d73→d74] [d96]
- **AT-023.04 (P0)** — Given a need whose purpose mismatches the NGO's vetted profile (fixture), When first published, Then the advisory evidence marks the nonprofit-purpose check failed with reasons. [cross: REQ-002 owns the profile]
- **AT-023.05 (P0)** — Given an abusive need relative to the Discovery document's stated scope (fixture), When first published, Then the advisory evidence marks scope-reasonableness failed with reasons. [cx: concretized] [d74: evidence-form] [d96: the complexity tier moved to the PRD step, so the check reads the Discovery document]
- **AT-023.06 (P0)** — Given an acceptable-use violation (surveillance fixture; spam and illegal-use variants), When each is first published, Then each item's advisory evidence marks acceptable-use failed with reasons. [cx] [d74: evidence-form]
- **AT-023.07 (P0)** — Given a Tier-2 need WITHOUT a fixtures-only plan and one WITH a valid plan (two fixtures), When first published, Then the advisory evidence carries the data-tier check result for each (failed vs passed) and the declared tier; neither result changes the project's state. [cx r2] [d74] [d96]
- **AT-023.08 (P0)** — Given Discovery raised risk flags on the project (fixture), When first published, Then those flags appear in the advisory evidence on the queue item. [cross: REQ-004]
- **AT-023.09 [retired — d74: the uncertainty signal and threshold routing no longer exist; there is nothing to route]**
- **AT-023.22 (P0)** — Given a need whose description involves health/financial personal data but is DECLARED Tier-1 (mis-tiered fixture), When first published, Then the advisory evidence marks the data-tier check failed for under-declaration. [cx r2: added] [d74: evidence-form]

## C. The reviewer's decisions

- **AT-023.10 (P0)** — Given a queue item for an `open` project, When the founder-reviewer KEEPS it, Then the project's state and listing are unchanged, no NGO notice is sent, and the decision record exists. [d96: keep replaces approve → `open`] [cross: AT-005.5.15]
- **AT-023.11 (P0)** — Given EVERY first publish (clean and flagged fixtures alike), When it completes, Then each has a founder-queue entry with the advisory evidence pre-surfaced — the reviewer never starts from a blank case. [d74: widened to all] [d96: first publish only]
- **AT-023.21 (P0)** — Given a founder acting on a queue item, When the decision surface/API is probed, Then it permits exactly THREE outcomes — keep (no transition), return → `scoped`, terminal decline → `cancelled` — and any other decision is rejected. [cx: added] [d74] [d96: keep replaces approve]
- **AT-023.12 (P0)** — Given an `open` project with no volunteer consent, When the founder returns it to `scoped`, Then it leaves the marketplace, a pending match is released, and the NGO sees the reason note; When the NGO edits and republishes, Then it is live at once with no new queue item, and the prior notes stay visible on the original item. And Given a project after volunteer consent, When return is attempted, Then it is refused. [cross: AT-005.5.16/17] [d96: return takes a live project down; post-consent problems go through break-glass and cancellation]
- **AT-023.13 (P0)** — Given a founder terminal decline (non-remediable), When it lands, Then the project moves to `cancelled` with the ordinary cancellation side effects and cannot be edited and resubmitted — the decline is terminal. [cross: AT-005.5.18/50]
- **AT-023.14 (P0)** — Given any reviewer decision, When its record is read, Then it captures: reviewer, timestamp, decision, reason, per-check dispositions, policy version, the advisory output and its version (or its recorded absence), data tier, and the Discovery document snapshot — the RM-64 evaluation dataset fields. [d74: record enriched] [d96: the snapshot is the Discovery document]
- **AT-023.15 [retired — d74: no auto-approvals exist, so the post-hoc spot-check surface is gone]**
- **AT-023.20 [retired — d74: every publish is in the founder queue by design; the decided-cases-never-queued assertion is moot]**

## D. Advisory has no authority

- **AT-023.18 (P0)** — Given the advisory pass output for any fixture, When inspected, Then it contains per-check evidence and versions but NO keep/return/decline recommendation and NO state transition; and Given the advisory model is unavailable (sentinel outage), When a first publish fires, Then the project is still live, the queue item is created without evidence, marked advisory-absent, and the reviewer can decide unaided — the pass never blocks publishing or review. [d74] [d96]

## E. Oversight & NGO-facing copy

- **AT-023.16 (P0)** — Given queue items of different ages (controlled clock), When the queue renders, Then each item exposes its age; the end-of-next-business-day target is an internal ops target with no NGO-facing surface; and items left undecided past the target leave their projects listed. [d74: target named] [d96: an aged item never hides a project]
- **AT-023.17 (P0)** — Given a project KEPT in error (human error) — one pre-build with no repo and one in-build with a repo (two fixtures), When break-glass runs, Then every public surface (listing, showcase, public page) is no longer reachable in both cases, the repo is additionally hidden in the with-repo case, the lifecycle state is UNCHANGED, and an audit record exists; un-hide restores visibility with nothing else altered. [cx r2] [d75: break-glass is an audited reversible visibility switch, never a transition] [d96: keep replaces approve] [cross: REQ-031]
- **AT-023.19 (P0)** — Given a clean publish and a flagged publish (two fixtures), When each NGO views its project before the founder has acted, Then BOTH show as live with no "under review" state and no review copy at all; a return or decline later reaches the NGO with its reason [cross: REQ-016]. [d96: replaces the under-review copy]

## Coverage map

| REQ-023 clause (d74, d96) | Tests |
|---|---|
| Publish lists at once; first publish adds one queue item; nothing waits on the queue | 01, 19 |
| Later edits and republishes add no queue item | 23 |
| Advisory evidence per check: open-source (4 variants), categorical flag, purpose-vs-profile, scope reasonableness, acceptable use, data-tier (Tier-2 both ways + under-declared), risk flags | 02–08, 22 |
| Advisory holds no authority: no recommendation, no transition, outage never blocks publishing or review | 18 |
| Reviewer's exactly-three outcomes; keep changes nothing | 10, 21 |
| Every first publish queued with evidence pre-surfaced | 11 |
| Return takes a live project down before consent (reason note, republish without re-queue, prior notes); refused after consent | 12 |
| Terminal decline (non-remediable) | 13 |
| Decision record = RM-64 dataset fields | 14 |
| Queue age + internal review target (no NGO SLA); aged items never hide projects | 16 |
| Break-glass recovery of a project kept in error (d75: visibility switch — all public surfaces + repo-when-exists, state untouched, reversible, audited) | 17 |
| Retired by d74: uncertainty routing (09), spot-check (15), decided-never-queued (20) | — |
