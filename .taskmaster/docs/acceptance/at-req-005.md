# AT-REQ-005 — Project Publishing

Source: prd-mvp.md REQ-005 (isolated: requirements/req-005.md). Dependencies: REQ-004, REQ-023.

**Boundary note [cx] [d96]:** REQ-005 owns the public-MIT-no-choice invariant, the publish gates (vetted, owner, no fuel deposit), `scoped → open` on publish, what the listing shows, unpublish-before-consent, and return-to-scoped visibility. Tested elsewhere (setup/cross only here): editing and confirming the Discovery document, and its freeze when the volunteer starts PRD work → AT-REQ-004; the intake card before publish → AT-REQ-011 and AT-REQ-003; confidential-codebase **decline at Discovery** + Tier-2 fixtures-only → AT-REQ-004; the background review **queue mechanics** → AT-REQ-023; publish/return **notifications** → AT-REQ-016; the $25/mo maintenance/pricing copy → AT-REQ-036.

> **d96 (2026-10-06):** there is no separate scope editor and no review gate. Every project is public from intake submission as an intake card; the founder reviews it once in the background (REQ-023). The NGO reviews and edits the Discovery document in the Discovery screen until the matched volunteer starts PRD work. Publishing makes the project `open` and puts the Discovery document on its card.

## A. What the listing shows

- **AT-005.01 [retired — d96: there is no separate scope editor; editing the Discovery document is AT-004.64, and the technical fields moved to the PRD step, AT-036.11]**
- **AT-005.02 [retired — d96: the no-cost rule for the Discovery document is AT-004.63]**
- **AT-005.03 [retired — d96: non-owner edits of the Discovery document are rejected by the Discovery screen's ownership rules, AT-004.64 and REQ-001]**
- **AT-005.04 [retired — d96: free editing before consent is AT-004.64]**
- **AT-005.19 (P0)** — Given a confirmed Discovery document carrying unique sentinel values in every section, When the NGO publishes, Then the published project's page and card contain those exact values from the latest confirmed revision, replacing the intake need — not stale content. [cx r2: end-to-end edit→publish fidelity] [d96: the review snapshot is the intake now (AT-023.14); this checks what volunteers read]
- **AT-005.21 (P0)** — Given an `open` project, When the NGO edits the Discovery document in the Discovery screen and confirms the new revision, Then the project page shows the new revision; Given an edit that is saved but not yet confirmed, Then the page still shows the last confirmed revision; and in both cases the card shows only the project's state — no edit marker, edit count, or "updated" signal appears anywhere public. [d96]

## B. Public MIT — no visibility choice

- **AT-005.05 (P0)** — Given the Discovery document and publishing surfaces (UI and API), When inspected, Then no repo-visibility control and no license selector is offered on any of them. [cx: bounded surfaces] [d96: the scope-editing surface is now the Discovery screen]
- **AT-005.05b (P0)** — Given a published project, When its repository policy is read AND an explicit private-visibility or non-MIT-license mutation is attempted through any project settings/API path, Then visibility stays public, the license stays MIT, and the mutation is rejected/ignored. [cx r2: actively attempt the forbidden mutation, not just read the default]
- **AT-005.06 [retired — cx: invented copy requirement; confidential-decline is AT-REQ-004, Tier-2 fixtures-only is AT-REQ-004]**

## C. Publishing gates

- **AT-005.07 (P0)** — Given an unvetted NGO with a confirmed Discovery document, When it attempts to publish, Then publishing is blocked in UI and API — vetted status is required [cross: REQ-002].
- **AT-005.20 (P0)** — Given an otherwise-publishable project owned by NGO A, When a different NGO, a volunteer, or a visitor attempts to publish it, Then the request is rejected and the project state is unchanged — only the owning NGO publishes. [cx r2: publish authorization, distinct from the vetting gate]
- **AT-005.08 (P0)** — Given a vetted NGO with zero fuel on the project, When it publishes, Then publishing succeeds — no fuel deposit is required (fuel is required only at volunteer acceptance, match-first) [cross: REQ-006].
- **AT-005.09 (P0)** — Given any publish by a vetted owning NGO, When the transition fires, Then the project moves `scoped → open` in one step; no intermediate state exists and no human or AI decision is awaited [cross: REQ-005.5/023]. [d96: replaces `scoped → triage`]
- **AT-005.10 (P0)** — Given a publish, When it completes, Then the project is `open` and matchable immediately, its card shows the Discovery document in place of the intake need, and no new background review item is created [cross: REQ-023/011]. [d96: replaces live-only-after-approval]
- **AT-005.11 (P0)** — Given ANY publish, When the NGO views its project, Then it shows as live on the marketplace, and no "under review" or pending-approval state appears anywhere for the NGO. [d96: the under-review state is gone]
- **AT-005.12 (P0)** — Given a project at `scoped`, When a controlled clock advances beyond every configured lifecycle deadline and the NGO takes no action, Then the project remains `scoped` — no expiry-driven or nag transition is configured for `scoped`. [cx: deterministic clock]

## D. Return-to-scoped & republish

- **AT-005.13 (P0)** — Given an `open` project with no volunteer consent, When the founder's background review returns it to `scoped` with a unique non-empty reason note, Then the project moves to `scoped`, matching closes and its card returns to the intake need, and that exact reason value is visible to the NGO in the Discovery screen [cross: REQ-023]. [cx r2: unique reason value] [d96: return acts on a live project]
- **AT-005.14 (P0)** — Given a project returned to `scoped` and edited in the Discovery screen, When the NGO republishes, Then it is `open` again at once and no new background review item is created [cross: REQ-023]. [d96: replaces re-entering review]

## E. Unpublish

- **AT-005.15 (P0)** — Given an `open` project before any volunteer consent, When the NGO unpublishes, Then the project returns to `scoped`, matching closes, and its card returns to the intake need [cross: REQ-005.5]. [d96: scoped projects stay public as intake cards]
- **AT-005.16 (P0)** — Given an `open` project with a pending (not yet consented) match invitation, When the NGO unpublishes, Then the project returns to `scoped` AND the pending match is released [cross: REQ-005.5/007]. [cx: added the return-to-scoped assertion; volunteer notification → AT-REQ-016]
- **AT-005.17 (P0)** — Given a project after volunteer consent (`matched_pending_fuel` or `in_progress`), When the NGO attempts unpublish, Then the unpublish path is unavailable — pre-consent only. [cx: dropped the "cancel is the remaining exit" parenthetical — cancel is pre-completion-only per REQ-005.5, tested there]

## F. Fuel timing

- **AT-005.18 [retired — cx r2: duplicate of AT-005.08 (both = vetted NGO, zero fuel, publish succeeds). The distinct clause "the NGO picks its fuel amount at match acceptance" is a funding-mechanics obligation → AT-REQ-006]**

## Coverage map

| REQ-005 clause | Tests |
|---|---|
| Publishes the confirmed Discovery document; the card and page switch from the intake need to its latest confirmed revision | 19 [d96] |
| A confirmed edit updates the project page; an unconfirmed edit never reaches it; no public edit signal | 21 [d96] |
| No separate scope editor; editing and the PRD-start freeze live in the Discovery screen | → AT-004.64, AT-004.74 [d96] |
| All projects public MIT; no visibility choice (UI absence + forbidden-mutation rejected) | 05, 05b |
| May stay `scoped` indefinitely | 12 |
| Publish requires vetted + owned by NGO + no mandatory funding step | 07, 08, 20 — "picks fuel amount at match acceptance" → AT-REQ-006 [cx] |
| Publish → `open` at once; live before any review; no under-review state | 09–11 [d96] |
| Unpublish → `scoped` any time before consent (incl. pending match released); unavailable after consent | 15–17 |
| Background-review return moves to `scoped` + reason note visible; republish goes live without a new queue item | 13, 14 [d96] |
