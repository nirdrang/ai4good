# AT-REQ-011 — Public Project Listings (v1 read-only)

Source: requirements/req-011.md (prd-mvp.md REQ-011). Dependencies: REQ-007.

**Boundary note:** REQ-011 owns the listing surface and its two card types. Candidacy mechanics (recording, admin-only log) are REQ-007's; project-page content REQ-010's; lifecycle states REQ-005.5's. AT-007.25–27/30 assert REQ-007's listing bullet from the volunteer-matching side — the card-content obligations are owned HERE; the suites intentionally share fixtures.

## A. The listing

- **AT-011.01 (P0)** — Given two open projects posted at different times, When a logged-out visitor renders the listing, Then it renders publicly with the projects newest-first.
- **AT-011.02 (P0)** — Given the listing, When a signed-in volunteer inspects a project row, Then exactly ONE volunteer action exists — mark interest ("candidate for this project") — and no apply, contact, save, or any other action is present.
- **AT-011.03 (P0)** — Given a volunteer marks interest from the listing, When the effect is probed, Then it feeds the admin match log only: no NGO-visible queue entry, no public counter, no notification to the NGO. [cross: REQ-007.04/05 own the candidacy record]
- **AT-011.04 (P0)** — Given the NGO of a listed project, When probed for an apply queue or accept/decline surface, Then none exists — matching is concierge enforce-match. [cross: REQ-007.09]

## B. Open-project card (static)

> **PRD tension flag [needs founder ruling — cx round 1]:** REQ-011 says the open card is "static attributes only, with no live stats", but REQ-024 requires a blocker's presence, count, and highest severity to be observable "wherever the project is listed (the project page, the marketplace, and the NGO dashboard)". Blocker state is dynamic listing data — both rules cannot govern the marketplace card without a stated exception. AT-011.05/06 follow REQ-011's exact-field list pending the ruling (if REQ-024 wins, blocker presence/count/severity become an explicit tested exception and "no live stats" narrows to build/repo statistics).

- **AT-011.05 (P0)** — Given an open project, When its card renders, Then it exposes exactly: title, summary, complexity tier, needed skills, cause tags, NGO name, and posted date.
- **AT-011.06 (P0)** — Given an `open` project that carries funded fuel AND retained build history (a REQ-027 reopened project with tasks, repo, and commit activity — fixture), When its card renders, Then no dollar figure and no live build statistic appears: no task progress, cadence, stack, last-activity, or contributor data — static attributes only, even when live data exists to leak. [cx: fixture upgraded to a reopened project — funded-fuel-only exercised dollar suppression, not live-stat suppression]
- **AT-011.07 (P0)** — Given an open project with three candidacies, When its card and row render (to any viewer class), Then no candidate/interest count appears — candidacies are admin-only.

## C. In-progress showcase (public)

- **AT-011.08 (P0)** — Given an `in_progress` project with a live repo, When the public showcase renders, Then its live card conveys: task-tree progress, cadence (task progression + commit activity), the language/stack, time since last activity, and the assigned contributor. [cross: REQ-010 owns the same signals on the project page]
- **AT-011.09 (P0)** — Given the showcased project's repo has nonzero stars/forks/watchers (fixture), When the showcase renders, Then no popularity metric appears. [Promise §5]
- **AT-011.10 (P0)** — Given projects in EVERY lifecycle state, When the listing and showcase render, Then `open` projects carry only the static card, `in_progress` projects carry only the live card, and every other state (`draft`, `discovery_in_progress`, `scoped`, `triage`, `matched_pending_fuel`, `completed`, `cancelled`) appears in NEITHER card set. [cx: parameterized across all nine states — the original sweep left five states free to leak as static cards] [cross: REQ-005.5]

## D. Read-only + deferred machinery

- **AT-011.11 (P0)** — Given the listing's UI, URL/query parameters, and API paths, When each is probed for filters, sort, scoring, or browse machinery, Then none responds — deferred to v1.5. [mirrors AT-007.27]
- **AT-011.12 (P0)** — Given projects with attributes that a ranking might favor (fixture variety), When the listing order is read repeatedly and after new inserts, Then order is strictly posted-date newest-first — no algorithmic ranking, no NGO-satisfaction weighting participates.
- **AT-011.13 (P0)** — Given a signed-in volunteer and an anonymous caller, When either attempts to mutate listing or project content through the listing surface (UI or API), Then the attempt is rejected and content is unchanged. [mirrors AT-007.30]

## Coverage map

| REQ-011 clause | Tests |
|---|---|
| Public read-only listing of open projects, newest-first | 01 |
| Exactly one volunteer action (mark interest) → admin match log only | 02, 03 |
| No NGO apply queue / accept-decline; concierge matching | 04 |
| Open card: exact static field set (blocker-display exception PENDING FOUNDER RULING vs REQ-024); no live stats even with retained build history; no dollar figure; no interest count | 05–07 |
| In-progress showcase: live card signals | 08 |
| Popularity metrics never shown | 09 |
| Card type by lifecycle state (open=static, in_progress=showcase, ALL other states=neither) | 10 [cx] |
| No filters/sort/scoring/browse (UI+query+API probes); no algorithmic ranking | 11, 12 |
| Read-only (mutation rejected) | 13 |
