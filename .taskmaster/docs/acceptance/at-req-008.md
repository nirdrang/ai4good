# AT-REQ-008 — GitHub Integration (Code Substrate + Dev-Internal Issues)

Source: requirements/req-008.md (prd-mvp.md REQ-008). Dependencies: REQ-006, REQ-007, REQ-021, REQ-026.

**Boundary note:** REQ-008 owns the repo's home, access model, seeding, the org's base-permission invariant, and the GitHub credential posture. The Lovable setup *flow* is owned by REQ-021; Linear task-status rules by REQ-026; completion gating by REQ-005.5; the project-binding marker's gateway check by REQ-009 — `[cross:]` here.

## A. Repo creation & home

- **AT-008.01 (P0)** — Given a funded project, When the volunteer completes the Lovable→GitHub setup, Then the resulting repository lives in the platform GitHub org — created with no platform-admin step in the path. [cross: REQ-021]
- **AT-008.02 (P0)** — Given kickoff has fired but the volunteer has not yet run the Lovable→GitHub setup, When the org is inspected, Then no repo exists for the project — nothing is pre-created at funding.
- **AT-008.03 (P0)** — Given the project's repo after setup validation, When it is inspected, Then it is public and carries the MIT license.
- **AT-008.04 (P0)** — Given the volunteer-created repo, When the platform validates it, Then the repo URL is recorded on the project and the recorded URL resolves to that org repo.
- **AT-008.05 (P0)** — Given a project `in_progress` whose repo setup remains unresolved, When the follow-up check runs, Then the setup-pending state is surfaced to the NGO and volunteer (blocker/notice) — the admin escalation after 7 days of mutual silence is owned by REQ-024. [cx: aligned with REQ-024's aging ladder] [cross: REQ-024]
- **AT-008.06 (P0)** — Given a project with no recorded repo URL, When completion evaluates, Then it is blocked — a recorded repo URL is a hard precondition for completion. [cross: REQ-005.5.26]
- **AT-008.07 (P0)** — Given any actor including the NGO admin and the volunteer, When a repository transfer out of the org is attempted, Then no such capability exists, and after completion the repo still lives in the platform org — repositories remain permanently.

## B. Access model

- **AT-008.08 (P0)** — Given the assigned volunteer during the build, When they push to the project repo, Then the push succeeds — the volunteer maintains the repo. Merge authority is exercised under REQ-026 (open under OD-1), not asserted here. [cx: merge claim dropped — reviewer/merge authority unresolved under OD-1]
- **AT-008.09 (P0)** — Given the NGO admin during the build, When they read the repo and comment, Then both succeed; when they attempt a push, Then it is rejected — read + comment, never push.
- **AT-008.10 (P0)** — Given the NGO admin's GitHub identity, When org membership is probed, Then they are an outside collaborator on their project repo only — never an org member.
- **AT-008.11 (P0)** — Given a project reaching completion, When repo permissions are read, Then the volunteer holds read/triage and the NGO admin holds admin — with no org transfer having occurred. [cross: REQ-012]

## C. Code events & task linkage

- **AT-008.12 (P0)** — Given a commit pushed with a known task identifier in its message (fixture), When the project's activity data is read, Then the named activity/cadence field reflects the new code event AND the event is linked to exactly that task — observable from repo creation onward. [cx: concretized — known task id, named field] [cross: REQ-010 owns cadence display, REQ-026 owns task linkage]
- **AT-008.13 (P0)** — Given a task in the Linear tree, When status changes are attempted, Then `done` lands only from a verified code merge event and other transitions land only from authorized integration events — a manual status edit never moves status. [cross: REQ-026 owns the Linear rules; asserted here for GitHub-event provenance]

## D. Issues — dev-internal only

- **AT-008.14 (P0)** — Given GitHub Issues exist on the project repo, When every NGO-facing PLATFORM surface renders (project page, dashboard, thread), Then no GitHub Issue content appears on any of them — the Linear task tree is the NGO-visible source of truth. The public repo itself remains publicly readable; "never NGO-visible" scopes platform surfaces, not GitHub. [cx: scoped — literal invisibility is impossible on a public repo]
- **AT-008.15 (P0)** — Given a completed Discovery scope doc, When the repo is created and seeded, Then zero GitHub Issues have been auto-created from it.

## E. Seeding

- **AT-008.16 (P0)** — Given a freshly seeded project repo, When its contents are inspected, Then each seeded element is present: the project-binding marker [cross: REQ-009], the task-binding conventions [cross: REQ-034], the Linear working norms (one issue in progress, assign before starting, comment when blocked, never move status by hand), the commit conventions linking work to its task, the reviewer-agent skill, and env-file hygiene.
- **AT-008.17 (P0)** — Given the seeded README, When it renders, Then it carries the title, NGO name, plain-language summary, license, and project-page link.
- **AT-008.18 (P0)** — Given the seeded repo and its full git history, When scanned for the platform API credential pattern (sentinel), Then no credential material is present; the credential is shown exactly once at issuance, and revoking it leaves the project's virtual key working (and vice versa) — separately revocable.

## F. Platform GitHub credentials

- **AT-008.19 (P0)** — Given the platform's GitHub operations, When its credential store and API calls are inspected, Then only short-lived, on-demand credentials are used and no user PAT is stored anywhere.

## G. Org setup & base-permission invariant

> **PRD tension flag [needs founder ruling — cx round 1]:** Platform Promise §2 says every repo is public MIT "from first commit", while REQ-008's base-permission invariant keeps member-created repos **private until setup validation** of the repo URL. AT-008.20/21 follow the isolated REQ-008 wording (private-until-validation); if Promise-§2 wording governs, these tests and REQ-008 must be amended.

- **AT-008.20 (P0)** — Given org member A (a volunteer) and another project's repo B, When A attempts a write to B, Then it is rejected; and while B is still private (pre-validation), A cannot read it — org membership grants no repo access by default.
- **AT-008.21 (P0)** — Given a member-created repo before setup validation, When its visibility is read, Then it is private; after the platform validates the repo URL, Then it is public — visibility flips only on validation.
- **AT-008.22 (P0)** — Given a non-owner (the volunteer), When they attempt a repository visibility change via GitHub directly, Then the attempt is rejected — visibility changes are limited to owners and platform automation. [cx: split from the remediation case]
- **AT-008.23 (P0)** — Given a sentinel org repo matching no active project, When the orphan monitor runs, Then the repo is flagged on the admin surface.
- **AT-008.24 (P0)** — Given the one-time org setup, When its configuration is audited, Then the platform and Lovable GitHub Apps are installed org-wide under the documented least-privilege scopes and the break-glass org-compromise runbook exists as a document; and When an app credential is rotated, Then the old credential is rejected while the replacement works — rotation exercised, not just documented. [cx: P1→P0 + rotation made observable]
- **AT-008.27 (P0)** — Given a harness-induced invalid visibility state (a validated-public repo flipped private, or a pre-validation repo flipped public, via owner/automation-level access), When the continuous invariant check runs, Then the invalid state is detected and auto-remediated back to the correct visibility — continuously verified and auto-remediated. [cx: added — the remediation half of retired-in-place AT-008.22's original compound]

## H. Sync, export & completion offboarding [cx: added round 1]

- **AT-008.25 (P0)** — Given the linked project repo, When an edit lands on the Lovable side and a commit lands on the GitHub side, Then each is reflected on the other (two-way sync observable in both directions), and an anonymous user can clone/fork the public repo — MIT + two-way sync keep the code forkable and exportable. [cross: REQ-021 owns the Lovable link setup]
- **AT-008.26 (P0)** — Given a project reaching completion, When the NGO completes the prompted Lovable offboarding, Then both the volunteer's and ai4good's read-only monitoring account's memberships are absent from the NGO's Lovable workspace (Lovable has no removal API — the platform prompts, the NGO acts). [cross: REQ-021/012]

## Coverage map

| REQ-008 clause | Tests |
|---|---|
| Public-MIT repo in the platform org via volunteer-driven Lovable→GitHub setup | 01, 03 |
| Uniform repo home: permanent, no transfer; NGO admin holds admin from completion | 07, 11 |
| MIT + two-way sync keep code forkable/exportable | 25 [cx] |
| Access: volunteer maintains (merge authority → REQ-026/OD-1); NGO read + comment, never push | 08, 09 |
| Code events feed cadence + linkage; done only from verified merge; never manual | 12, 13 |
| Issues dev-internal — no NGO-facing PLATFORM surface renders them; no auto-created issues from scope | 14, 15 |
| Repo seeding (marker, conventions, norms, reviewer skill, env hygiene) | 16 |
| Credentials never committed; shown once; separately revocable | 18 |
| Short-lived on-demand GitHub credentials; no user PATs | 19 |
| One-time org setup: least-privilege apps, rotation exercised, break-glass runbook | 24 [cx: P0] |
| Membership grants no default repo access; NGO admins outside collaborators only | 10, 20 |
| Base-permission invariant: private until URL validation (see PRD tension flag); non-owner change rejected; continuously verified + auto-remediated | 21, 22, 27 |
| Orphan repos monitored | 23 |
| Lovable path: nothing pre-created; volunteer-driven; validate + record URL; unresolved surfaced to parties (admin aging → REQ-024); URL gates completion | 02, 04, 05, 06 |
| Seeded README fields | 17 |
| Completion Lovable offboarding (volunteer + monitoring account removed by NGO on prompt) | 26 [cx] |
