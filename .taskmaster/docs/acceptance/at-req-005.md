# AT-REQ-005 — Scope Document & Project Publishing

Source: prd-mvp.md REQ-005 (isolated: requirements/req-005.md). Dependencies: REQ-004, REQ-023.

**Boundary note [cx]:** REQ-005 owns the editable scope doc, the public-MIT-no-choice invariant, the publish gates (vetted, no fuel deposit), scoped→triage, unpublish-before-consent, and return-to-scoped visibility. Tested elsewhere (setup/cross only here): confidential-codebase **decline at Discovery** + Tier-2 fixtures-only → AT-REQ-004; triage **routing/queue mechanics** → AT-REQ-023; publish/return **notifications** → AT-REQ-016; the $25/mo maintenance/pricing copy → AT-REQ-004.

## A. The editable scope document

- **AT-005.01 (P0)** — Given a project at `scoped`, When the NGO admin edits the summary, user stories, acceptance criteria, or suggested stack, Then each edit persists and renders in the scope document.
- **AT-005.19 (P0)** — Given a scoped project, When the NGO inserts unique sentinel values into every editable field and then publishes, Then the scope snapshot handed to triage contains those exact edited values — not stale pre-edit content. [cx r2: end-to-end edit→publish fidelity]
- **AT-005.02 (P0)** — Given the scope document, When inspected, Then it contains no fuel-budget section and no project fuel/build-cost estimate. [cx: narrowed — the required ~$25/mo Lovable maintenance figure + pricing link (REQ-004) are permitted; only project cost estimates are barred]
- **AT-005.03 (P0)** — Given any non-owner account (other NGO, volunteer, visitor), When it attempts to edit the scope, Then the attempt is rejected [cross: REQ-001].
- **AT-005.04 (P1)** — Given a scope edit session, When content is changed, Then the pre-publish state is the NGO's to shape freely — no approval is required to edit.

## B. Public MIT — no visibility choice

- **AT-005.05 (P0)** — Given the scope-editing and publishing surfaces (UI and API), When inspected, Then no repo-visibility control and no license selector is offered on any of them. [cx: bounded surfaces]
- **AT-005.05b (P0)** — Given a published project, When its repository policy is read AND an explicit private-visibility or non-MIT-license mutation is attempted through any project settings/API path, Then visibility stays public, the license stays MIT, and the mutation is rejected/ignored. [cx r2: actively attempt the forbidden mutation, not just read the default]
- **AT-005.06 [retired — cx: invented copy requirement; confidential-decline is AT-REQ-004, Tier-2 fixtures-only is AT-REQ-004]**

## C. Publishing gates

- **AT-005.07 (P0)** — Given an unvetted NGO with a completed scope, When it attempts to publish, Then publishing is blocked in UI and API — vetted status is required [cross: REQ-002].
- **AT-005.20 (P0)** — Given an otherwise-publishable project owned by NGO A, When a different NGO, a volunteer, or a visitor attempts to publish it, Then the request is rejected and the project state is unchanged — only the owning NGO publishes. [cx r2: publish authorization, distinct from the vetting gate]
- **AT-005.08 (P0)** — Given a vetted NGO with zero fuel on the project, When it publishes, Then publishing succeeds — no fuel deposit is required (fuel is required only at volunteer acceptance, match-first) [cross: REQ-006].
- **AT-005.09 (P0)** — Given any publish, When the transition fires, Then the project moves `scoped → triage` — never directly to `open` [cross: REQ-005.5/023].
- **AT-005.10 (P0)** — Given a screener-clean publish, When triage auto-approves, Then the project is live on the marketplace immediately. [cx: notification moved to AT-REQ-016]
- **AT-005.11 (P0)** — Given a publish whose screener outcome is non-decided, When it routes, Then the project remains in `triage` and off the marketplace while awaiting the founder's decision, and the NGO sees an "under review" state with no formal SLA promised. [cx r2: "until approval" → "while awaiting the founder's decision" — the two exits are return-to-scoped or terminal cancel, not approval]
- **AT-005.12 (P0)** — Given a project at `scoped`, When a controlled clock advances beyond every configured lifecycle deadline and the NGO takes no action, Then the project remains `scoped` — no expiry-driven or nag transition is configured for `scoped`. [cx: deterministic clock]

## D. Return-to-scoped & republish

- **AT-005.13 (P0)** — Given a project in `triage` as a founder exception, When the founder applies the return-to-scoped outcome with a unique non-empty reason note, Then the project moves to `scoped` and that exact reason value is visible to the NGO for editing and republishing [cross: REQ-023]. [cx r2: unique reason value so visibility can't pass on an empty/placeholder field]
- **AT-005.14 (P0)** — Given an edited project after return-to-scoped, When republished, Then it re-enters the screener (fresh triage pass) and remains publicly invisible until approved [cross: REQ-023].

## E. Unpublish

- **AT-005.15 (P0)** — Given an `open` project before any volunteer consent, When the NGO unpublishes, Then the project returns to `scoped` and leaves the marketplace [cross: REQ-005.5].
- **AT-005.16 (P0)** — Given an `open` project with a pending (not yet consented) match invitation, When the NGO unpublishes, Then the project returns to `scoped` AND the pending match is released [cross: REQ-005.5/007]. [cx: added the return-to-scoped assertion; volunteer notification → AT-REQ-016]
- **AT-005.17 (P0)** — Given a project after volunteer consent (`matched_pending_fuel` or `in_progress`), When the NGO attempts unpublish, Then the unpublish path is unavailable — pre-consent only. [cx: dropped the "cancel is the remaining exit" parenthetical — cancel is pre-completion-only per REQ-005.5, tested there]

## F. Fuel timing

- **AT-005.18 [retired — cx r2: duplicate of AT-005.08 (both = vetted NGO, zero fuel, publish succeeds). The distinct clause "the NGO picks its fuel amount at match acceptance" is a funding-mechanics obligation → AT-REQ-006]**

## Coverage map

| REQ-005 clause | Tests |
|---|---|
| Editable: summary, stories, ACs, stack; no fuel-budget section / no project cost estimate; edits reach triage | 01–04, 19 |
| All projects public MIT; no visibility choice (UI absence + forbidden-mutation rejected) | 05, 05b |
| May stay `scoped` indefinitely | 12 |
| Publish requires vetted + owned by NGO + no mandatory funding step | 07, 08, 20 — "picks fuel amount at match acceptance" → AT-REQ-006 [cx] |
| Publish → `triage`, never directly `open`; clean live immediately; exceptions stay off-marketplace until approval | 09–11 |
| Unpublish → `scoped` any time before consent (incl. pending match released); unavailable after consent | 15–17 |
| Return-to-scoped moves to `scoped` + reason note visible; republish re-enters screener | 13, 14 |
