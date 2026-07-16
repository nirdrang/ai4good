# AT-REQ-007 — Volunteer Profile & Concierge Matching

Source: requirements/req-007.md (prd-mvp.md REQ-007). Dependencies: REQ-001, REQ-005, REQ-008.

**Boundary note:** REQ-007 owns the volunteer profile, candidacy, the concierge match log and its consent gates, GitHub-org membership timing, and org removal by cause. The signup-time GitHub-link *gate* is owned by REQ-001 (AT-001.04/05); lifecycle state changes by REQ-005.5; the NGO funding-time acknowledgment by REQ-006; key revocation mechanics by REQ-009 — `[cross:]` here.

## A. Profile & dashboard

- **AT-007.01 (P0)** — Given a volunteer whose linked GitHub fixture account holds BOTH public and private activity, When their profile is read, Then top languages, repository count, and contribution summary match the PUBLIC-only expected values — private data never leaks into the import. [cx: public-only boundary added] [cross: REQ-001 owns the signup gate]
- **AT-007.02 (P0)** — Given a volunteer editing their profile, When they save skills, causes, and availability (hours/week) once without a bio and once with one, Then both saves succeed, the three fields persist, and the supplied bio is returned unchanged — bio is optional, not ignored. [cx: supplied-bio case added]
- **AT-007.03 (P0)** — Given a volunteer with open candidacies AND closed ones (declined, expired, released, consented) in the fixture, When they open their dashboard, Then it shows their linked GitHub handle and exactly the open candidacies — closed ones are excluded. [cx: exclusion assertion added]

## B. Candidacy

- **AT-007.04 (P0)** — Given a public project page and a signed-in volunteer, When they mark interest ("candidate for this project"), Then a candidacy event is recorded in the match log with a timestamp and the volunteer appears in that project's interested pool.
- **AT-007.05 (P0)** — Given a project with candidacies, When its NGO views any of its surfaces (UI and API), Then no candidacy information is present anywhere — candidacies never surface to the NGO.
- **AT-007.06 (P0)** — Given a project's first candidacy arrives, When the candidacy window is evaluated, Then a bounded deadline exists from that moment, the project appears on the admin matching queue ordered by that deadline BEFORE it lapses, and an unmatched candidate-bearing project past its deadline is flagged overdue on that queue. [cx: "must be matched within the window" is a concierge (human) obligation — the system's testable duty is deadline-driven queueing + overdue flagging]
- **AT-007.07 (P0)** — Given an existing candidacy window, When additional candidacies accumulate, Then the recomputed deadline is never later than before — interest may only shorten the window.
- **AT-007.08 (P0)** — Given an open project with zero candidates, When time passes (controlled clock), Then no candidacy window exists for it and it stays `open` under Goal-5 aging, still publicly listed.

## C. Enforce-match & consent gates

- **AT-007.09 (P0)** — Given a project with a non-empty candidate pool, When the admin creates a match with one of the candidates, Then a match record in state `invited` exists, and no NGO approve/decline surface exists for it — the match is binding on the NGO.
- **AT-007.10 (P0)** — Given a project with a non-empty candidate pool, When the admin attempts an enforce-match with a volunteer NOT in that pool, Then it is rejected — matching draws from the candidate pool.
- **AT-007.11 (P0)** — Given an `invited` (unconsented) match, When the volunteer's access is probed, Then they have no repo access, no virtual key, no Linear access, and no Tier-2 data introduction — nothing is granted before consent.
- **AT-007.12 (P0)** — Given a volunteer who has never signed the first-project disclaimer, When they click consent on their first match, Then the disclaimer fires and consent completes only after it is signed; the signed record exists before any access grant.
- **AT-007.13 (P0)** — Given a volunteer who signed the disclaimer on an earlier match AND the disclaimer text is unchanged, When they consent to a later match, Then no disclaimer re-fires; Given the disclaimer text has had a material change since their signature, Then re-acceptance IS required before consent completes. [cx: conditioned on version — Promise §9 re-prompts on material text change]
- **AT-007.14 (P0)** — Given a consented match, When funding lands, Then kickoff fires with no further volunteer action required — a consented match is kickoff-ready. [cross: REQ-005.5/006]
- **AT-007.15 (P0)** — Given a consented but unfunded match, When provisioning is probed, Then no Anthropic provider workspace, no virtual key, and no Linear workspace exists for the project — kickoff fires only on funding. NGO-side Lovable preparation is not prohibited. [cx: resources named precisely — three workspace kinds exist in the PRD]
- **AT-007.16 (P0)** — Given an `invited` match, When the volunteer declines, Then the match record is `declined` with timestamp and reason, the volunteer is free to be matched elsewhere, and the project remains `open`.

## D. Match log

- **AT-007.17 (P0)** — Given a project passing through candidacy, invitation, consent — and separately decline, expiry, and release — When the match log is read, Then every one of these event types appears with its timestamp and reason.
- **AT-007.18 (P0)** — Given an NGO account, a volunteer account, and an unauthenticated caller, When any of them requests the match log or matching queue (UI or API), Then access is denied with no event or candidacy data returned — the log is admin-only and not a public queue; the volunteer's own candidacies remain visible only on their own dashboard. [cx: logged-out probe added]

## E. GitHub-org membership

- **AT-007.19 (P0)** — Given a volunteer's first match consent, When it completes, Then the volunteer is added to the platform GitHub org with repo-creation rights, and the grant is recorded and audited. [cross: REQ-008]
- **AT-007.20 (P0)** — Given a volunteer who has completed signup but never consented to a match, When org membership is probed, Then they are NOT a member — membership is never granted at signup.

## F. Org removal by cause

- **AT-007.21 (P0)** — Given a volunteer with an active project, When they voluntarily deactivate, Then their platform-org membership is removed while their per-project access on the active project persists.
- **AT-007.22 (P0)** — Given an AUP enforcement, When the admin deactivates the account, Then platform writes are rejected immediately and the project's virtual keys are revoked immediately; residual repo, Linear, and org access are removed within 15 minutes (AT-defined bound for "promptly" — controlled clock) with an audit record for each removal; and the NGO receives the prompt to remove the volunteer's Lovable workspace access. [cx: "promptly" pinned to a judgeable bound] [cross: REQ-001/009]
- **AT-007.23 (P0)** — Given a deactivated volunteer, When the admin re-enables the account and re-issues keys (the manual reversal), Then otherwise-authorized platform writes resume and the newly issued virtual key authenticates — restoration of removed repo/Linear/org/Lovable memberships is NOT asserted (the requirement defines reversal as re-enable + key re-issue only). [cx: over-broad "project access" claim narrowed] [cross: REQ-001.31/REQ-009]
- **AT-007.24 (P0)** — Given a volunteer inactive just short of 24 months (controlled clock), When the inactivity check runs, Then org membership remains; at the 24-month threshold, Then it is removed via the same path as voluntary deactivation — no immediate account-write or key revocation fires (the AUP-only effects). [cx: boundary negative added; invented "AUP flag" assertion replaced with observable path behavior]

## G. Public listing (read-only v1)

- **AT-007.25 (P0)** — Given two open projects posted at different times, When the public listing renders, Then they appear newest-first and each row exposes exactly: title, summary, complexity tier, needed skills, cause tags, NGO name, and posted date.
- **AT-007.26 (P0)** — Given projects in non-`open` states (`draft`, `scoped`, `triage`, `matched_pending_fuel`, `cancelled`), When the OPEN-projects listing renders, Then none of them appears in it — that listing is `open` projects only. `in_progress` projects appear on the separate public in-progress showcase, owned by REQ-011, and are likewise absent from the open listing. [cx: in_progress removed from the never-public sweep — REQ-011's showcase is public] [cross: REQ-005.5/011]
- **AT-007.27 (P0)** — Given the public listing, When inspected, Then no browse/sort/filter controls and no public verification badge exist (deferred), while the in-product mark-interest action IS present for signed-in volunteers.
- **AT-007.28 (P0)** — Given v1, When any surface is probed for an organic apply/accept flow, Then none exists: no volunteer self-apply endpoint creates a match, an NGO or volunteer attempt to create or approve a match is rejected, and mark-interest produces only a candidacy record — matching is concierge-only. [cx: added — the concierge-only negative]
- **AT-007.29 (P0)** — Given a logged-out visitor, When they request an open project's page, Then its public content renders — project pages are public. [cx: added] [cross: AT-001.24 owns the public/authenticated split; REQ-010 owns page content]
- **AT-007.30 (P0)** — Given a signed-in volunteer and an anonymous caller, When either attempts to mutate project or listing content through the listing surface (UI or API), Then the attempt is rejected and the content is unchanged — the listing is read-only. [cx: added — read-only was asserted only as control absence]

## Coverage map

| REQ-007 clause | Tests |
|---|---|
| GitHub link mandatory at signup (gate) | [cross → AT-REQ-001.04/05]; import content: 01 |
| PUBLIC stats populate the profile (private data excluded) | 01 |
| Profile: skills, causes, availability, optional bio (omitted AND supplied) | 02 |
| Dashboard: linked handle + OPEN candidacies only | 03 |
| v1 matching concierge-ONLY; organic apply-flow deferred (negative) | 28 [cx] |
| Project pages public | 29 [cx] [cross → AT-001.24/REQ-010] |
| In-product mark-interest; candidacy recorded | 04, 27, 28 |
| Candidacies never surface to the NGO | 05 |
| Bounded candidacy window (deadline-queued + overdue-flagged); interest only shortens; no-candidate projects age under Goal-5 | 06–08 |
| Enforce-match from the pool; binding; no NGO approve/decline | 09, 10 |
| Consent gate (a): volunteer confirms; first-project disclaimer (re-fires only on material change); nothing before disclaimer | 11–13 |
| Consent gate (b): NGO acknowledges at funding | [cross → AT-REQ-006.11–13, 23–24] |
| Kickoff only on funding (no provider/key/Linear before); consented match kickoff-ready | 14, 15 |
| Match log admin-only; every event with timestamp + reason; not a public queue (incl. logged-out probe) | 17, 18 |
| Decline/expiry/release recorded; volunteer freed | 16, 17 [expiry: cross → AT-REQ-005.5.23/40] |
| Org membership at first consent, never signup; recorded + audited | 19, 20 |
| Org removal: voluntary / AUP ("promptly" = 15-min AT bound) / 24-month inactivity (boundary-tested); reversal = re-enable + key re-issue only | 21–24 |
| Public listing: newest-first, exact field set, open-only (in_progress showcase → REQ-011), read-only v1 (no sort/filter/badge; mutation rejected) | 25–27, 30 [cx] |
