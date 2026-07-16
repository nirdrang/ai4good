# AT-REQ-023 — Platform Triage Gate (compliance review before marketplace)

Source: requirements/req-023.md (prd-mvp.md REQ-023). Dependencies: REQ-002, REQ-005, REQ-005.5, REQ-031, REQ-036.

**Boundary note:** REQ-023 owns the screener's checks, its decision/audit outputs, and the founder exception queue's mechanics. The lifecycle transitions the gate drives (`scoped`→`triage`→`open`/return/cancel) are owned by REQ-005.5 (AT-005.5.13–19/50); vetting itself by REQ-002; break-glass unpublish by REQ-031 — `[cross:]` here.

## A. Routing

- **AT-023.01 (P0)** — Given any publish — including a re-publish after a return — When it fires, Then the project routes to the screener; no path reaches the marketplace without a screener run (probe for bypasses). [cross: AT-005.5.13]

## B. Screener checks (one violating fixture per dimension)

- **AT-023.02 (P0)** — Given three INDEPENDENT fixtures — a commercial need, a closed-source-for-resale need, and a need requesting private or non-MIT publication — When each is screened, Then each shows an observable failed open-source-alignment check, is not auto-approved, and never appears in the marketplace. [cx: split into independent variants + non-MIT/private case added — one combined fixture could pass on detecting a single condition]
- **AT-023.03 (P0)** — Given a confidential-codebase need (fixture), When screened, Then it takes the categorical-decline path — not a mere flag.
- **AT-023.04 (P0)** — Given a need whose purpose mismatches the NGO's vetted profile (fixture), When screened, Then it is not auto-approved and the reasons name the nonprofit-purpose check. [cross: REQ-002 owns the profile]
- **AT-023.05 (P0)** — Given an abusive scope relative to the declared complexity tier (fixture), When screened, Then the scope-reasonableness check shows an observable failed status, the project is not auto-approved, and it never appears in the marketplace. [cx: "is caught" concretized to failed-check + no-approval + no-exposure]
- **AT-023.06 (P0)** — Given an acceptable-use violation (surveillance fixture; spam and illegal-use variants), When each is screened, Then the acceptable-use check shows an observable failed status, none is auto-approved, and none appears in the marketplace. [cx: same concretization]
- **AT-023.07 (P0)** — Given a Tier-2 need WITHOUT a fixtures-only plan, When screened, Then the data-tier check fails; and Given a Tier-2 need WITH a valid fixtures-only plan, Then it still never auto-approves — it routes to the founder in both cases. [cross: AT-005.5.19]
- **AT-023.08 (P0)** — Given Discovery raised risk flags on the project (fixture), When screened, Then those flags appear in the screener's considered findings — Discovery risk feeds the gate. [cross: REQ-004]
- **AT-023.09 (P0)** — Given one screener run of EACH route class — confident-clean, non-decided, Tier-2, and categorical decline — When each output is read, Then every one contains a decision, reasons, and an uncertainty signal; and Given controlled fixtures whose uncertainty falls on either side of the configured threshold, Then each routes to the corresponding destination (auto-approve vs exception queue) — the signal demonstrably DRIVES routing, not merely exists. [cx: parameterized across all route classes incl. clean; "used for routing" proven via controlled threshold cases]

## C. Outcomes

- **AT-023.10 (P0)** — Given a confident-clean Tier-1 project, When screened, Then it is auto-approved to `open` and a screener-written audit record exists carrying the checks run, the rationale, and the screener version. [cross: AT-005.5.15]
- **AT-023.20 (P0)** — Given the auto-approved project of AT-023.10, When the founder exception queue is read before publication, Then it is ABSENT — the founder attends only non-decided cases; decided cases reach the post-hoc spot-check surface instead, never the pre-publication queue. [cx: added — auto-open plus queue placement could both happen and pass]
- **AT-023.11 (P0)** — Given a non-decided case, When routing completes, Then a founder exception-queue entry exists with the screener's findings PRE-SURFACED on it — the founder never starts from a blank case.
- **AT-023.21 (P0)** — Given a founder acting on an exception-queue item, When the decision surface/API is probed, Then it permits exactly two outcomes — return to `scoped` and terminal decline — and any other decision (including a direct founder-approve to `open`) is rejected. [cx: added — the two-outcomes clause needed its negative]
- **AT-023.12 (P0)** — Given a founder return-to-`scoped`, When it lands, Then the NGO sees the reason note; the project stays INVISIBLE to the marketplace throughout the edit-republish loop; the republish re-enters the screener; and on that later review the prior notes are visible to the reviewer. [cross: AT-005.5.16/17]
- **AT-023.13 (P0)** — Given a founder terminal decline (non-remediable), When it lands, Then the project cannot be edited and resubmitted — the decline is terminal. [cross: AT-005.5.18/50 own the state + the fixable-cannot-cancel negative]
- **AT-023.14 (P0)** — Given any human (founder) decision, When its record is read, Then it captures all six fields: reviewer, timestamp, decision, reason, data tier, and scope snapshot.

## D. Oversight & configuration

- **AT-023.15 (P0)** — Given auto-approved projects, When the oversight surface is read, Then they are listed for post-hoc spot-check.
- **AT-023.16 (P0)** — Given exception-queue items of different ages (controlled clock), When the queue renders, Then each item exposes its age.
- **AT-023.17 (P0)** — Given a wrongly auto-approved project, When break-glass unpublish runs, Then the project is recovered off the marketplace. [cross: REQ-031 owns the mechanism]
- **AT-023.18 (P0)** — Given two test-environment deployments configured with different OD-8 thresholds, When the same borderline fixture is screened under each, Then each routes per its configured threshold — the configuration is consumed by routing (no runtime-mutability claim); and the screener demonstrably uses its CONFIGURED model, whose family matches the REQ-036/OD-7 scorer family. [cx: live-mutation claim dropped (unstated); model-config + family-equality assertions added]

## E. NGO-facing copy

- **AT-023.19 (P0)** — Given a clean publish and an exception-routed publish, When each NGO views its project, Then the clean one is live immediately with copy saying so, and the exception one shows an "under review" state whose copy promises no formal SLA.

## Coverage map

| REQ-023 clause / AC | Tests |
|---|---|
| Publishing always routes to the screener, never directly to marketplace (incl. republish) | 01 |
| Open-source alignment (public MIT — non-MIT/private variant; commercial AND closed-for-resale independently; confidential = categorical decline) | 02, 03 |
| Nonprofit purpose vs vetted profile | 04 |
| Scope reasonableness vs tier (abusive scope) | 05 |
| Acceptable use (surveillance/spam/illegal) | 06 |
| Data-tier correctness (Tier-2 fixtures-only plan) + Tier-2 never auto-approves | 07 |
| Discovery risk flags feed the screener | 08 |
| Output shape: decision + reasons + uncertainty signal, every route class; signal drives routing | 09 |
| Confident-clean → auto-approve → open + screener audit record; decided cases NEVER in the founder queue | 10, 20 [cx] |
| Non-decided → founder queue, findings pre-surfaced; "reviewed promptly" UNTESTABLE as stated — escalated for an internal review-target number (not an NGO SLA); age exposure (16) is the current mechanism | 11, 16 |
| Founder outcomes exactly two (return / terminal decline); no direct approve | 21 [cx] |
| Return to scoped: reason note, invisible during loop, republish re-enters, prior notes visible | 12 |
| Terminal decline: cannot edit/resubmit | 13 |
| Human decision record: six fields | 14 |
| Post-hoc spot-check of auto-approvals; exception age exposed; break-glass recovery | 15–17 |
| OD-8 threshold consumed by routing; configured model, family = OD-7 scorer family | 18 [cx] |
| NGO copy: clean live immediately; "under review", no SLA | 19 |
