# AT-REQ-005 — Project Publishing

Source: prd-mvp.md REQ-005 (isolated: requirements/req-005.md). Dependencies: REQ-004, REQ-023.

**Boundary note [cx] [d96]:** REQ-005 owns the public-MIT-no-choice invariant, the publish gates (vetted, owner, no fuel deposit), `scoped → open` on publish, what the listing shows, unpublish-before-consent, and return-to-scoped visibility. Tested elsewhere (setup/cross only here): editing and confirming the Discovery document, and its read-only lock at consent → AT-REQ-004; confidential-codebase **decline at Discovery** + Tier-2 fixtures-only → AT-REQ-004; the background review **queue mechanics** → AT-REQ-023; publish/return **notifications** → AT-REQ-016; the $25/mo maintenance/pricing copy → AT-REQ-036.

> **d96 (2026-10-06):** there is no separate scope editor and no review gate. The NGO reviews and edits the Discovery document in the Discovery screen until a volunteer consents. Publishing lists the project at once; the founder reviews the first publish in the background (REQ-023).

## A. What the listing shows

- **AT-005.01 [retired — d96: there is no separate scope editor; editing the Discovery document is AT-004.64, and the technical fields moved to the PRD step, AT-036.11]**
- **AT-005.02 [retired — d96: the no-cost rule for the Discovery document is AT-004.63]**
- **AT-005.03 [retired — d96: non-owner edits of the Discovery document are rejected by the Discovery screen's ownership rules, AT-004.64 and REQ-001]**
- **AT-005.04 [retired — d96: free editing before consent is AT-004.64]**
- **AT-005.19 (P0)** — Given a confirmed Discovery document carrying unique sentinel values in every section, When the NGO publishes, Then both the marketplace listing and the snapshot on the first-publish background review item contain those exact values from the latest confirmed revision — not stale content. [cx r2: end-to-end edit→publish fidelity] [d96: the snapshot is the Discovery document; the listing is checked too]
- **AT-005.21 (P0)** — Given an `open` project before any volunteer consent, When the NGO edits the Discovery document in the Discovery screen and confirms the new revision, Then the live listing shows the new revision; and Given an edit that is saved but not yet confirmed, Then the listing still shows the last confirmed revision. [d96]

## B. Public MIT — no visibility choice

- **AT-005.05 (P0)** — Given the Discovery document and publishing surfaces (UI and API), When inspected, Then no repo-visibility control and no license selector is offered on any of them. [cx: bounded surfaces] [d96: the scope-editing surface is now the Discovery screen]
- **AT-005.05b (P0)** — Given a published project, When its repository policy is read AND an explicit private-visibility or non-MIT-license mutation is attempted through any project settings/API path, Then visibility stays public, the license stays MIT, and the mutation is rejected/ignored. [cx r2: actively attempt the forbidden mutation, not just read the default]
- **AT-005.06 [retired — cx: invented copy requirement; confidential-decline is AT-REQ-004, Tier-2 fixtures-only is AT-REQ-004]**

## C. Publishing gates

- **AT-005.07 (P0)** — Given an unvetted NGO with a confirmed Discovery document, When it attempts to publish, Then publishing is blocked in UI and API — vetted status is required [cross: REQ-002].
- **AT-005.20 (P0)** — Given an otherwise-publishable project owned by NGO A, When a different NGO, a volunteer, or a visitor attempts to publish it, Then the request is rejected and the project state is unchanged — only the owning NGO publishes. [cx r2: publish authorization, distinct from the vetting gate]
- **AT-005.08 (P0)** — Given a vetted NGO with zero fuel on the project, When it publishes, Then publishing succeeds — no fuel deposit is required (fuel is required only at volunteer acceptance, match-first) [cross: REQ-006].
- **AT-005.09 (P0)** — Given any publish by a vetted owning NGO, When the transition fires, Then the project moves `scoped → open` in one step; no intermediate state exists and no human or AI decision is awaited [cross: REQ-005.5/023]. [d96: replaces `scoped → triage`]
- **AT-005.10 (P0)** — Given a publish, When it completes, Then the project is live on the marketplace immediately, before the founder has acted on its background review item [cross: REQ-023]. [d96: replaces live-only-after-approval]
- **AT-005.11 (P0)** — Given ANY publish, When the NGO views its project, Then it shows as live on the marketplace, and no "under review" or pending-approval state appears anywhere for the NGO. [d96: the under-review state is gone]
- **AT-005.12 (P0)** — Given a project at `scoped`, When a controlled clock advances beyond every configured lifecycle deadline and the NGO takes no action, Then the project remains `scoped` — no expiry-driven or nag transition is configured for `scoped`. [cx: deterministic clock]

## D. Return-to-scoped & republish

- **AT-005.13 (P0)** — Given an `open` project with no volunteer consent, When the founder's background review returns it to `scoped` with a unique non-empty reason note, Then the project moves to `scoped`, leaves the marketplace, and that exact reason value is visible to the NGO in the Discovery screen [cross: REQ-023]. [cx r2: unique reason value] [d96: return acts on a live project]
- **AT-005.14 (P0)** — Given a project returned to `scoped` and edited in the Discovery screen, When the NGO republishes, Then it goes live at once and no new background review item is created [cross: REQ-023]. [d96: replaces re-entering review]

## E. Unpublish

- **AT-005.15 (P0)** — Given an `open` project before any volunteer consent, When the NGO unpublishes, Then the project returns to `scoped` and leaves the marketplace [cross: REQ-005.5].
- **AT-005.16 (P0)** — Given an `open` project with a pending (not yet consented) match invitation, When the NGO unpublishes, Then the project returns to `scoped` AND the pending match is released [cross: REQ-005.5/007]. [cx: added the return-to-scoped assertion; volunteer notification → AT-REQ-016]
- **AT-005.17 (P0)** — Given a project after volunteer consent (`matched_pending_fuel` or `in_progress`), When the NGO attempts unpublish, Then the unpublish path is unavailable — pre-consent only. [cx: dropped the "cancel is the remaining exit" parenthetical — cancel is pre-completion-only per REQ-005.5, tested there]

## F. Fuel timing

- **AT-005.18 [retired — cx r2: duplicate of AT-005.08 (both = vetted NGO, zero fuel, publish succeeds). The distinct clause "the NGO picks its fuel amount at match acceptance" is a funding-mechanics obligation → AT-REQ-006]**

## Coverage map

| REQ-005 clause | Tests |
|---|---|
| Publishes the confirmed Discovery document; listing and review snapshot show the latest confirmed revision | 19 [d96] |
| Before consent, a confirmed edit updates the listing; an unconfirmed edit never reaches it | 21 [d96] |
| No separate scope editor; editing and the consent lock live in the Discovery screen | → AT-004.64, AT-004.74 [d96] |
| All projects public MIT; no visibility choice (UI absence + forbidden-mutation rejected) | 05, 05b |
| May stay `scoped` indefinitely | 12 |
| Publish requires vetted + owned by NGO + no mandatory funding step | 07, 08, 20 — "picks fuel amount at match acceptance" → AT-REQ-006 [cx] |
| Publish → `open` at once; live before any review; no under-review state | 09–11 [d96] |
| Unpublish → `scoped` any time before consent (incl. pending match released); unavailable after consent | 15–17 |
| Background-review return moves to `scoped` + reason note visible; republish goes live without a new queue item | 13, 14 [d96] |
