# AT-REQ-007 — Volunteer Profile & Concierge Matching

Source: requirements/req-007.md (prd-mvp.md REQ-007). Dependencies: REQ-001, REQ-005, REQ-008.

**Boundary note:** REQ-007 owns the volunteer profile, candidacy, the concierge match log and its consent gates, GitHub-org membership timing, and org removal by cause. The signup-time GitHub-link *gate* is owned by REQ-001 (AT-001.04/05); lifecycle state changes by REQ-005.5; the NGO funding-time acknowledgment by REQ-006; key revocation mechanics by REQ-009 — `[cross:]` here.

## A. Profile & dashboard

- **AT-007.01 (P0)** — Given a volunteer whose GitHub account is linked (fixture account with known public stats), When their profile is read, Then the imported public stats — top languages, repository count, contribution summary — are populated and match the fixture. [cross: REQ-001 owns the signup gate]
- **AT-007.02 (P0)** — Given a volunteer editing their profile, When they set skills, causes, and availability (hours/week) and save without a bio, Then the save succeeds with all three fields persisted — bio is optional.
- **AT-007.03 (P0)** — Given a volunteer with open candidacies, When they open their dashboard, Then it shows their linked GitHub handle and each open candidacy.

## B. Candidacy

- **AT-007.04 (P0)** — Given a public project page and a signed-in volunteer, When they mark interest ("candidate for this project"), Then a candidacy event is recorded in the match log with a timestamp and the volunteer appears in that project's interested pool.
- **AT-007.05 (P0)** — Given a project with candidacies, When its NGO views any of its surfaces (UI and API), Then no candidacy information is present anywhere — candidacies never surface to the NGO.
- **AT-007.06 (P0)** — Given a project's first candidacy arrives, When the candidacy window is evaluated, Then a bounded window deadline exists from that moment, and an unmatched candidate-bearing project past its deadline is surfaced on the admin matching queue.
- **AT-007.07 (P0)** — Given an existing candidacy window, When additional candidacies accumulate, Then the recomputed deadline is never later than before — interest may only shorten the window.
- **AT-007.08 (P0)** — Given an open project with zero candidates, When time passes (controlled clock), Then no candidacy window exists for it and it stays `open` under Goal-5 aging, still publicly listed.

## C. Enforce-match & consent gates

- **AT-007.09 (P0)** — Given a project with a non-empty candidate pool, When the admin creates a match with one of the candidates, Then a match record in state `invited` exists, and no NGO approve/decline surface exists for it — the match is binding on the NGO.
- **AT-007.10 (P0)** — Given a project with a non-empty candidate pool, When the admin attempts an enforce-match with a volunteer NOT in that pool, Then it is rejected — matching draws from the candidate pool.
- **AT-007.11 (P0)** — Given an `invited` (unconsented) match, When the volunteer's access is probed, Then they have no repo access, no virtual key, no Linear access, and no Tier-2 data introduction — nothing is granted before consent.
- **AT-007.12 (P0)** — Given a volunteer who has never signed the first-project disclaimer, When they click consent on their first match, Then the disclaimer fires and consent completes only after it is signed; the signed record exists before any access grant.
- **AT-007.13 (P0)** — Given a volunteer who signed the disclaimer on an earlier match, When they consent to a later match, Then no disclaimer re-fires — it is a first-project gate.
- **AT-007.14 (P0)** — Given a consented match, When funding lands, Then kickoff fires with no further volunteer action required — a consented match is kickoff-ready. [cross: REQ-005.5/006]
- **AT-007.15 (P0)** — Given a consented but unfunded match, When provisioning is probed, Then no keys, workspace, or Linear provisioning has occurred — kickoff fires only on funding.
- **AT-007.16 (P0)** — Given an `invited` match, When the volunteer declines, Then the match record is `declined` with timestamp and reason, the volunteer is free to be matched elsewhere, and the project remains `open`.

## D. Match log

- **AT-007.17 (P0)** — Given a project passing through candidacy, invitation, consent — and separately decline, expiry, and release — When the match log is read, Then every one of these event types appears with its timestamp and reason.
- **AT-007.18 (P0)** — Given an NGO account and a volunteer account, When either requests the match log (UI or API), Then access is denied — the log is admin-only; the volunteer's own candidacies remain visible only on their own dashboard.

## E. GitHub-org membership

- **AT-007.19 (P0)** — Given a volunteer's first match consent, When it completes, Then the volunteer is added to the platform GitHub org with repo-creation rights, and the grant is recorded and audited. [cross: REQ-008]
- **AT-007.20 (P0)** — Given a volunteer who has completed signup but never consented to a match, When org membership is probed, Then they are NOT a member — membership is never granted at signup.

## F. Org removal by cause

- **AT-007.21 (P0)** — Given a volunteer with an active project, When they voluntarily deactivate, Then their platform-org membership is removed while their per-project access on the active project persists.
- **AT-007.22 (P0)** — Given an AUP enforcement, When the admin deactivates the account, Then platform writes are rejected immediately and the project's virtual keys are revoked immediately; residual repo, Linear, and org access are then removed with an audit record for each removal; and the NGO receives the prompt to remove the volunteer's Lovable workspace access. [cross: REQ-001/009]
- **AT-007.23 (P0)** — Given a deactivated volunteer, When the admin re-enables the account and re-issues keys (the manual reversal), Then platform writes and project access work again. [cross: REQ-001.31/REQ-009]
- **AT-007.24 (P0)** — Given a volunteer with 24 months of inactivity (controlled clock), When the inactivity removal runs, Then org membership is removed as in the voluntary case (soft removal) and no AUP flag is recorded.

## G. Public listing (read-only v1)

- **AT-007.25 (P0)** — Given two open projects posted at different times, When the public listing renders, Then they appear newest-first and each row exposes exactly: title, summary, complexity tier, needed skills, cause tags, NGO name, and posted date.
- **AT-007.26 (P0)** — Given projects in non-`open` states (`draft`, `scoped`, `triage`, `matched_pending_fuel`, `in_progress`, `cancelled`), When the public listing renders, Then none of them appears — the listing is open projects only. [cross: REQ-005.5]
- **AT-007.27 (P0)** — Given the public listing, When inspected, Then no browse/sort/filter controls and no public verification badge exist (deferred), while the in-product mark-interest action IS present for signed-in volunteers.

## Coverage map

| REQ-007 clause | Tests |
|---|---|
| GitHub link mandatory at signup (gate) | [cross → AT-REQ-001.04/05]; import content: 01 |
| Public stats populate the profile | 01 |
| Profile: skills, causes, availability, optional bio | 02 |
| Dashboard: linked handle + open candidacies | 03 |
| In-product mark-interest; candidacy recorded | 04, 27 |
| Candidacies never surface to the NGO | 05 |
| Bounded candidacy window; interest only shortens; no-candidate projects age under Goal-5 | 06–08 |
| Enforce-match from the pool; binding; no NGO approve/decline | 09, 10 |
| Consent gate (a): volunteer confirms; first-project disclaimer; nothing before disclaimer | 11–13 |
| Consent gate (b): NGO acknowledges at funding | [cross → AT-REQ-006.11–13, 23–24] |
| Kickoff only on funding; consented match kickoff-ready | 14, 15 |
| Match log admin-only; every event with timestamp + reason; not a public queue | 17, 18 |
| Decline/expiry/release recorded; volunteer freed | 16, 17 [expiry: cross → AT-REQ-005.5.23/40] |
| Org membership at first consent, never signup; recorded + audited | 19, 20 |
| Org removal: voluntary / AUP / 24-month inactivity; reversal manual | 21–24 |
| Public listing: newest-first, exact field set, open-only, read-only v1 (no sort/filter/badge) | 25–27 |
