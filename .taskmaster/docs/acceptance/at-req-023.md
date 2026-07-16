# AT-REQ-023 — Platform Triage Gate (compliance review before marketplace)

Source: requirements/req-023.md (prd-mvp.md REQ-023). Dependencies: REQ-002, REQ-005, REQ-005.5, REQ-031, REQ-036.

**Boundary note:** REQ-023 owns the screener's checks, its decision/audit outputs, and the founder exception queue's mechanics. The lifecycle transitions the gate drives (`scoped`→`triage`→`open`/return/cancel) are owned by REQ-005.5 (AT-005.5.13–19/50); vetting itself by REQ-002; break-glass unpublish by REQ-031 — `[cross:]` here.

## A. Routing

- **AT-023.01 (P0)** — Given any publish — including a re-publish after a return — When it fires, Then the project routes to the screener; no path reaches the marketplace without a screener run (probe for bypasses). [cross: AT-005.5.13]

## B. Screener checks (one violating fixture per dimension)

- **AT-023.02 (P0)** — Given a commercial / closed-source-for-resale need (fixture), When screened, Then it is NOT auto-approved and the decision's reasons name the open-source-alignment check.
- **AT-023.03 (P0)** — Given a confidential-codebase need (fixture), When screened, Then it takes the categorical-decline path — not a mere flag.
- **AT-023.04 (P0)** — Given a need whose purpose mismatches the NGO's vetted profile (fixture), When screened, Then it is not auto-approved and the reasons name the nonprofit-purpose check. [cross: REQ-002 owns the profile]
- **AT-023.05 (P0)** — Given an abusive scope relative to the declared complexity tier (fixture), When screened, Then it is caught and the reasons name scope reasonableness.
- **AT-023.06 (P0)** — Given an acceptable-use violation (surveillance fixture; spam and illegal-use variants), When screened, Then it is caught and the reasons name acceptable use.
- **AT-023.07 (P0)** — Given a Tier-2 need WITHOUT a fixtures-only plan, When screened, Then the data-tier check fails; and Given a Tier-2 need WITH a valid fixtures-only plan, Then it still never auto-approves — it routes to the founder in both cases. [cross: AT-005.5.19]
- **AT-023.08 (P0)** — Given Discovery raised risk flags on the project (fixture), When screened, Then those flags appear in the screener's considered findings — Discovery risk feeds the gate. [cross: REQ-004]
- **AT-023.09 (P0)** — Given every screener run above, When its output is read, Then it contains a decision, reasons, and an uncertainty signal used for routing — all three, every run.

## C. Outcomes

- **AT-023.10 (P0)** — Given a confident-clean Tier-1 project, When screened, Then it is auto-approved to `open` and a screener-written audit record exists carrying the checks run, the rationale, and the screener version. [cross: AT-005.5.15]
- **AT-023.11 (P0)** — Given a non-decided case, When routing completes, Then a founder exception-queue entry exists with the screener's findings PRE-SURFACED on it — the founder never starts from a blank case.
- **AT-023.12 (P0)** — Given a founder return-to-`scoped`, When it lands, Then the NGO sees the reason note; the project stays INVISIBLE to the marketplace throughout the edit-republish loop; the republish re-enters the screener; and on that later review the prior notes are visible to the reviewer. [cross: AT-005.5.16/17]
- **AT-023.13 (P0)** — Given a founder terminal decline (non-remediable), When it lands, Then the project cannot be edited and resubmitted — the decline is terminal. [cross: AT-005.5.18/50 own the state + the fixable-cannot-cancel negative]
- **AT-023.14 (P0)** — Given any human (founder) decision, When its record is read, Then it captures all six fields: reviewer, timestamp, decision, reason, data tier, and scope snapshot.

## D. Oversight & configuration

- **AT-023.15 (P0)** — Given auto-approved projects, When the oversight surface is read, Then they are listed for post-hoc spot-check.
- **AT-023.16 (P0)** — Given exception-queue items of different ages (controlled clock), When the queue renders, Then each item exposes its age.
- **AT-023.17 (P0)** — Given a wrongly auto-approved project, When break-glass unpublish runs, Then the project is recovered off the marketplace. [cross: REQ-031 owns the mechanism]
- **AT-023.18 (P0)** — Given the screener's threshold and model configuration (OD-8, pilot-tuned), When the threshold is changed (sentinel config), Then routing outcomes change accordingly — the threshold is a live configuration, not a constant.

## E. NGO-facing copy

- **AT-023.19 (P0)** — Given a clean publish and an exception-routed publish, When each NGO views its project, Then the clean one is live immediately with copy saying so, and the exception one shows an "under review" state whose copy promises no formal SLA.

## Coverage map

| REQ-023 clause / AC | Tests |
|---|---|
| Publishing always routes to the screener, never directly to marketplace (incl. republish) | 01 |
| Open-source alignment (public MIT; commercial/closed prohibited; confidential = categorical decline) | 02, 03 |
| Nonprofit purpose vs vetted profile | 04 |
| Scope reasonableness vs tier (abusive scope) | 05 |
| Acceptable use (surveillance/spam/illegal) | 06 |
| Data-tier correctness (Tier-2 fixtures-only plan) + Tier-2 never auto-approves | 07 |
| Discovery risk flags feed the screener | 08 |
| Output shape: decision + reasons + uncertainty signal, every run | 09 |
| Confident-clean → auto-approve → open + screener audit record (checks, rationale, version) | 10 |
| Non-decided → founder queue, findings pre-surfaced | 11 |
| Return to scoped: reason note, invisible during loop, republish re-enters, prior notes visible | 12 |
| Terminal decline: cannot edit/resubmit | 13 |
| Human decision record: six fields | 14 |
| Post-hoc spot-check of auto-approvals; exception age exposed; break-glass recovery | 15–17 |
| OD-8 threshold + model live-configurable | 18 |
| NGO copy: clean live immediately; "under review", no SLA | 19 |
