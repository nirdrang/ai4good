# AT-REQ-005 — Scope Document & Project Publishing

Source: prd-mvp.md REQ-005 (+ REQ-005.5 transitions, REQ-023 triage at its boundary, REQ-002 vetting gate). Dependencies: REQ-004, REQ-023.

## A. The editable scope document

- **AT-005.01 (P0)** — Given a project at `scoped`, When the NGO admin edits the summary, user stories, acceptance criteria, or suggested stack, Then each edit persists and renders in the scope document.
- **AT-005.02 (P0)** — Given the scope document, When inspected, Then it contains no fuel-budget section and no dollar estimate anywhere [cross: REQ-004 no-dollar rule].
- **AT-005.03 (P0)** — Given any non-owner account (other NGO, volunteer, visitor), When it attempts to edit the scope, Then the attempt is rejected [cross: REQ-001].
- **AT-005.04 (P1)** — Given a scope edit session, When content is changed, Then the pre-publish state is the NGO's to shape freely — no approval is required to edit.

## B. Public MIT — no visibility choice

- **AT-005.05 (P0)** — Given project creation through publishing, When every surface is inspected, Then no repo-visibility or license choice exists anywhere: all projects are public MIT by policy.
- **AT-005.06 (P0)** — Given scope-doc and publish copy, When rendered, Then the public-MIT posture is stated (Platform Promise §2), and confidential-codebase needs are handled at Discovery (declined), never via a private option here [cross: REQ-004].

## C. Publishing gates

- **AT-005.07 (P0)** — Given an unvetted NGO with a completed scope, When it attempts to publish, Then publishing is blocked in UI and API — vetted status is required [cross: REQ-002].
- **AT-005.08 (P0)** — Given a vetted NGO with zero fuel on the project, When it publishes, Then publishing succeeds — no fuel deposit is required (fuel is required only at volunteer acceptance, match-first) [cross: REQ-006].
- **AT-005.09 (P0)** — Given any publish, When the transition fires, Then the project moves `scoped → triage` — never directly to `open` [cross: REQ-005.5/023].
- **AT-005.10 (P0)** — Given a screener-clean publish, When triage auto-approves, Then the project is live on the marketplace immediately and the NGO is notified [cross: REQ-023/016].
- **AT-005.11 (P0)** — Given a non-decided screener outcome, When the project waits on the founder queue, Then the NGO sees an "under review" state with no formal SLA promised [cross: REQ-023].
- **AT-005.12 (P0)** — Given a project at `scoped`, When the NGO does nothing for an arbitrary time, Then it may stay `scoped` indefinitely — no expiry, no auto-archive, no nag transition.

## D. Return-to-scoped & republish

- **AT-005.13 (P0)** — Given a triage return-to-scoped outcome, When the NGO views the project, Then the founder's reason note is visible for editing and republishing [cross: REQ-023].
- **AT-005.14 (P0)** — Given an edited project after return-to-scoped, When republished, Then it re-enters the screener (fresh triage pass) and remains publicly invisible until approved [cross: REQ-023].

## E. Unpublish

- **AT-005.15 (P0)** — Given an `open` project before any volunteer consent, When the NGO unpublishes, Then the project returns to `scoped` and leaves the marketplace [cross: REQ-005.5].
- **AT-005.16 (P0)** — Given an `open` project with a pending (not yet consented) match invitation, When the NGO unpublishes, Then the pending match is released and the volunteer notified [cross: REQ-005.5/007/016].
- **AT-005.17 (P0)** — Given a project after volunteer consent (`matched_pending_fuel` or later), When the NGO attempts unpublish, Then the unpublish path is unavailable — pre-consent only (cancel is the remaining exit) [cross: REQ-005.5].

## F. Fuel timing

- **AT-005.18 (P0)** — Given the whole publish flow, When inspected, Then the NGO picks its fuel amount at match acceptance — no funding step exists at publish time [cross: REQ-006].

## Coverage map

| REQ-005 clause | Tests |
|---|---|
| Editable: summary, stories, ACs, stack; no fuel-budget section | 01–04 |
| All projects public MIT; no visibility choice | 05, 06 |
| May stay `scoped` indefinitely | 12 |
| Publish requires vetted + no fuel deposit | 07, 08, 18 |
| Publish → `triage`, never directly `open`; clean live immediately; exceptions await founder | 09–11 |
| Unpublish → `scoped` any time before consent; pending match released | 15–17 |
| Return-to-scoped carries the reason note; republish re-enters screener | 13, 14 |
