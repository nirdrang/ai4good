# AT-REQ-008 — GitHub Integration (Code Substrate + Dev-Internal Issues)

Source: requirements/req-008.md (prd-mvp.md REQ-008). Dependencies: REQ-006, REQ-007, REQ-021, REQ-026.

**Boundary note:** REQ-008 owns the repo's home, access model, seeding, the org's base-permission invariant, and the GitHub credential posture. The Lovable setup *flow* is owned by REQ-021; Linear task-status rules by REQ-026; completion gating by REQ-005.5; the project-binding marker's gateway check by REQ-009 — `[cross:]` here.

## A. Repo creation & home

- **AT-008.01 (P0)** — Given a funded project, When the volunteer completes the Lovable→GitHub setup, Then the resulting repository lives in the platform GitHub org — created with no platform-admin step in the path. [cross: REQ-021]
- **AT-008.02 (P0)** — Given kickoff has fired but the volunteer has not yet run the Lovable→GitHub setup, When the org is inspected, Then no repo exists for the project — nothing is pre-created at funding.
- **AT-008.03 (P0)** — Given the project's repo after setup validation, When it is inspected, Then it is public and carries the MIT license.
- **AT-008.04 (P0)** — Given the volunteer-created repo, When the platform validates it, Then the repo URL is recorded on the project and the recorded URL resolves to that org repo.
- **AT-008.05 (P0)** — Given a project `in_progress` whose repo setup remains unresolved, When the follow-up check runs, Then the unresolved setup is surfaced as an admin/ops follow-up item.
- **AT-008.06 (P0)** — Given a project with no recorded repo URL, When completion evaluates, Then it is blocked — a recorded repo URL is a hard precondition for completion. [cross: REQ-005.5.26]
- **AT-008.07 (P0)** — Given any actor including the NGO admin and the volunteer, When a repository transfer out of the org is attempted, Then no such capability exists, and after completion the repo still lives in the platform org — repositories remain permanently.

## B. Access model

- **AT-008.08 (P0)** — Given the assigned volunteer during the build, When they push and merge to the project repo, Then both succeed — the volunteer maintains the repo.
- **AT-008.09 (P0)** — Given the NGO admin during the build, When they read the repo and comment, Then both succeed; when they attempt a push, Then it is rejected — read + comment, never push.
- **AT-008.10 (P0)** — Given the NGO admin's GitHub identity, When org membership is probed, Then they are an outside collaborator on their project repo only — never an org member.
- **AT-008.11 (P0)** — Given a project reaching completion, When repo permissions are read, Then the volunteer holds read/triage and the NGO admin holds admin — with no org transfer having occurred. [cross: REQ-012]

## C. Code events & task linkage

- **AT-008.12 (P0)** — Given a push to the project repo, When activity surfaces are read, Then the code event feeds cadence stats and task linkage — observable from repo creation onward. [cross: REQ-026]
- **AT-008.13 (P0)** — Given a task in the Linear tree, When status changes are attempted, Then `done` lands only from a verified code merge event and other transitions land only from authorized integration events — a manual status edit never moves status. [cross: REQ-026 owns the Linear rules; asserted here for GitHub-event provenance]

## D. Issues — dev-internal only

- **AT-008.14 (P0)** — Given GitHub Issues exist on the project repo, When any NGO-visible platform surface renders (project page, dashboard, thread), Then no GitHub Issue content appears anywhere — the Linear task tree is the NGO-visible source of truth.
- **AT-008.15 (P0)** — Given a completed Discovery scope doc, When the repo is created and seeded, Then zero GitHub Issues have been auto-created from it.

## E. Seeding

- **AT-008.16 (P0)** — Given a freshly seeded project repo, When its contents are inspected, Then each seeded element is present: the project-binding marker [cross: REQ-009], the task-binding conventions [cross: REQ-034], the Linear working norms (one issue in progress, assign before starting, comment when blocked, never move status by hand), the commit conventions linking work to its task, the reviewer-agent skill, and env-file hygiene.
- **AT-008.17 (P0)** — Given the seeded README, When it renders, Then it carries the title, NGO name, plain-language summary, license, and project-page link.
- **AT-008.18 (P0)** — Given the seeded repo and its full git history, When scanned for the platform API credential pattern (sentinel), Then no credential material is present; the credential is shown exactly once at issuance, and revoking it leaves the project's virtual key working (and vice versa) — separately revocable.

## F. Platform GitHub credentials

- **AT-008.19 (P0)** — Given the platform's GitHub operations, When its credential store and API calls are inspected, Then only short-lived, on-demand credentials are used and no user PAT is stored anywhere.

## G. Org setup & base-permission invariant

- **AT-008.20 (P0)** — Given org member A (a volunteer) and another project's repo B, When A attempts a write to B, Then it is rejected; and while B is still private (pre-validation), A cannot read it — org membership grants no repo access by default.
- **AT-008.21 (P0)** — Given a member-created repo before setup validation, When its visibility is read, Then it is private; after the platform validates the repo URL, Then it is public — visibility flips only on validation.
- **AT-008.22 (P0)** — Given a sentinel out-of-band visibility change by a non-owner (the volunteer flips the repo via GitHub directly), When the continuous invariant check runs, Then the change is auto-remediated back and an audit record exists — visibility changes are limited to owners and platform automation.
- **AT-008.23 (P0)** — Given a sentinel org repo matching no active project, When the orphan monitor runs, Then the repo is flagged on the admin surface.
- **AT-008.24 (P1)** — Given the one-time org setup, When its configuration is audited, Then the platform and Lovable GitHub Apps are installed org-wide under the documented least-privilege scopes, a credential-rotation procedure and a break-glass org-compromise runbook exist as documents.

## Coverage map

| REQ-008 clause | Tests |
|---|---|
| Public-MIT repo in the platform org via volunteer-driven Lovable→GitHub setup | 01, 03 |
| Uniform repo home: permanent, no transfer; NGO admin holds admin from completion | 07, 11 |
| Access: volunteer maintains; NGO read + comment, never push | 08, 09 |
| Code events feed cadence + linkage; done only from verified merge; never manual | 12, 13 |
| Issues dev-internal, never NGO-visible; no auto-created issues from scope | 14, 15 |
| Repo seeding (marker, conventions, norms, reviewer skill, env hygiene) | 16 |
| Credentials never committed; shown once; separately revocable | 18 |
| Short-lived on-demand GitHub credentials; no user PATs | 19 |
| One-time org setup: least-privilege apps, rotation, break-glass runbook | 24 (P1) |
| Membership grants no default repo access; NGO admins outside collaborators only | 10, 20 |
| Base-permission invariant: private until URL validation; visibility guarded, continuously verified + auto-remediated | 21, 22 |
| Orphan repos monitored | 23 |
| Lovable path: nothing pre-created; volunteer-driven; validate + record URL; unresolved surfaced; URL gates completion | 02, 04, 05, 06 |
| Seeded README fields | 17 |
