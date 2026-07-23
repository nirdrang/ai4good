# AT-REQ-011 — Public Project Listings (v1 read-only)

Source: requirements/req-011.md (prd-mvp.md REQ-011). Dependencies: REQ-007.

**Boundary note:** REQ-011 owns the listing surface and its two card types. Candidacy mechanics (recording, admin-only log) are REQ-007's; project-page content REQ-010's; lifecycle states REQ-005.5's. AT-007.25–27/30 assert REQ-007's listing bullet from the volunteer-matching side — the card-content obligations are owned HERE; the suites intentionally share fixtures.

## A. The listing

- **AT-011.01 (P0)** — Given two open projects posted at different times, When a logged-out visitor renders the listing, Then it renders publicly with the projects newest-first.
- **AT-011.02 (P0)** — Given an explicitly `open` project on the listing, When a signed-in volunteer inspects its row, Then exactly ONE volunteer action exists — mark interest ("candidate for this project") — and no apply, contact, save, or other action is present; and Given an `in_progress` showcase card, Then it carries NO volunteer action at all. [cx r2: fixture pinned to open; the showcase-no-action half added]
- **AT-011.03 (P0)** — Given a volunteer marks interest from the listing, When the effect is probed, Then it creates the admin-log candidacy ONLY: the project stays `open`, no binding match exists, no kickoff or project access is granted, and no NGO-visible queue entry, public counter, or NGO notification appears — progression still requires concierge enforce-match. [cx r2: auto-match exclusion added — the original negatives left lifecycle/access side effects unconstrained] [cross: REQ-007.04/05/09]
- **AT-011.04 (P0)** — Given the NGO of a listed project, When probed for an apply queue or accept/decline surface, Then none exists — matching is concierge enforce-match. [cross: REQ-007.09]

## B. Open-project card (static)

> **Resolved [founder, d71 — codex-battle-tested]:** the OPEN card stays exactly as specified (identity attributes + mark-interest, posted date the only age signal — no blocker chip, no recency signal; a live-open-card variant was adversarially broken: adverse selection against rematch-priority projects, gameable freshness, public-rating drift, and a hidden REQ-007 exact-field contradiction). REQ-024's "marketplace" surface is defined as the IN-PROGRESS SHOWCASE, which gains a noninteractive blocker chip (count + `info/warning/blocking` public severity only — never type/title/body/owner). New release-cleanup rule: volunteer-tied blockers are archived/retargeted before an abandoned project re-lists. AT-011.05/06 stand unchanged.

- **AT-011.05 (P0)** — Given an open project, When its card renders, Then its project DATA ATTRIBUTES are exactly: title, summary, complexity tier, needed skills, cause tags, NGO name, and posted date — while the separately required mark-interest CONTROL (AT-011.02) is permitted and not counted as a data attribute. [cx r2: attribute-vs-control distinction stated — "exactly" literally banned the required control]
- **AT-011.06 (P0)** — Given an `open` project that carries funded fuel AND retained build history (a REQ-027 reopened project with tasks, repo, and commit activity — fixture), When its card renders, Then no dollar figure and no live build statistic appears: no task progress, cadence, stack, last-activity, or contributor data — static attributes only, even when live data exists to leak. [cx: fixture upgraded to a reopened project — funded-fuel-only exercised dollar suppression, not live-stat suppression]
- **AT-011.07 (P0)** — Given an open project with three candidacies, When its card and row render (to any viewer class), Then no candidate/interest count appears — candidacies are admin-only.

## C. In-progress showcase (public)

- **AT-011.08 (P0)** — Given an `in_progress` project with a live repo and two unresolved blockers (highest severity `warning` — fixture), When the public showcase renders, Then its live card conveys: requirement-tree progress, cadence, the language/stack, time since last activity, the assigned contributor, and a NONINTERACTIVE blocker chip showing count 2 and severity `warning` — and the chip exposes no blocker type, title, body, or acting party, and offers no click/hover action; cadence is proven two-input with discriminating fixtures — a task-movement-only period and a commit-only period each move it. [cx r2: discriminating cadence fixtures] [d71: blocker chip added with its leak-free constraints] [cross: REQ-010.16; REQ-024 owns chip correctness (zero-state, ordering, cleanup)]
- **AT-011.14 (P0)** — Given an `in_progress` project whose repo/setup is still pending, When the showcase renders, Then the live card still appears with the available signals populated (requirement-tree progress, assigned contributor) and explicit pending/unavailable states for repo-dependent values — "a project under build surfaces a live card" is not conditioned on the repo existing. [cx r2: added — the live-repo precondition hid the repo-pending case]
- **AT-011.09 (P0)** — Given the showcased project's repo has nonzero stars/forks/watchers (fixture), When the showcase renders, Then no popularity metric appears. [Promise §5]
- **AT-011.10 (P0)** — Given projects in EVERY lifecycle state, When the listing and showcase render, Then `open` projects carry only the static card, `in_progress` projects carry only the live card, and every other state (`draft`, `discovery_in_progress`, `scoped`, `triage`, `matched_pending_fuel`, `completed`, `cancelled`) appears in NEITHER card set. [cx: parameterized across all nine states — the original sweep left five states free to leak as static cards] [cross: REQ-005.5]

## D. Read-only + deferred machinery

- **AT-011.11 (P0)** — Given the enumerated probe set — the listing UI (no sort/filter controls rendered), the canonical listing endpoint called with `sort`, `filter`, `order`, `q`, and `rank` query parameters (each must be IGNORED: the response identical to the parameterless call), and dedicated sort/filter/browse routes (each must be ABSENT: not found) — When each probe runs, Then each meets its named pass condition. [cx r2: finite probe set + per-class outcomes defined (absent vs ignored-without-effect)] [mirrors AT-007.27]
- **AT-011.12 (P0)** — Given two projects with EQUAL posted dates whose NGO-satisfaction values are then mutated while all listing data is held constant, and other projects with distinct dates, When the listing order is read before and after the mutation, Then the equal-date pair's relative order is unchanged and distinct-date projects stay strictly newest-first — no algorithmic ranking, and NGO satisfaction does not participate even as a tie-breaker. [cx r2: satisfaction-mutation fixture — generic "attributes a ranking might favor" could not detect a tie-breaker]
- **AT-011.13 (P0)** — Given a signed-in volunteer and an anonymous caller, When either attempts to mutate listing or project content through the listing surface (UI or API), Then the attempt is rejected and content is unchanged. [mirrors AT-007.30]

## Coverage map

| REQ-011 clause | Tests |
|---|---|
| Public read-only listing of open projects, newest-first | 01 |
| Exactly one volunteer action on OPEN rows (none on showcase) → admin candidacy only, no auto-match/kickoff/access | 02, 03 [cx r2] |
| No NGO apply queue / accept-decline; concierge matching | 04 |
| Open card: exact static field set (resolved d71 — NO blocker chip, no recency; REQ-024's marketplace surface = the showcase); no live stats even with retained build history; no dollar figure; no interest count | 05–07 |
| In-progress showcase: live card signals + noninteractive blocker chip (count + public severity enum, leak-free) | 08, 14 [cx r2] [d71] |
| Popularity metrics never shown | 09 |
| Card type by lifecycle state (open=static, in_progress=showcase, ALL other states=neither) | 10 [cx] |
| No filters/sort/scoring/browse (UI+query+API probes); no algorithmic ranking | 11, 12 |
| Read-only (mutation rejected) | 13 |
