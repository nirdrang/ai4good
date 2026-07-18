# AT-REQ-008 — GitHub Integration (Code Substrate + Dev-Internal Issues)

Source: requirements/req-008.md (prd-mvp.md REQ-008). Dependencies: REQ-006, REQ-007, REQ-021, REQ-026.

**Boundary note:** REQ-008 owns the repo's home, access model, seeding, the org's base-permission invariant, and the GitHub credential posture. The Lovable setup *flow* is owned by REQ-021; Linear task-status rules by REQ-026; completion gating by REQ-005.5; the project-binding marker's gateway check by REQ-009 — `[cross:]` here.

## A. Repo creation & home

- **AT-008.01 (P0)** — Given a funded project, When the volunteer completes the Lovable→GitHub setup, Then the resulting repository lives in the platform GitHub org — created with no platform-admin step in the path. [cross: REQ-021]
- **AT-008.02 (P0)** — Given kickoff has fired but the volunteer has not yet run the Lovable→GitHub setup, When the org is inspected, Then no repo exists for the project — nothing is pre-created at funding.
- **AT-008.03 (P0)** — Given the project's repo after setup validation, When it is inspected, Then it is public and carries the MIT license.
- **AT-008.04 (P0)** — Given the volunteer-created repo, When the platform validates it, Then the repo URL is recorded on the project and the recorded URL resolves to that org repo.
- **AT-008.28 (P0)** — Given a nonexistent URL, a malformed URL, and a URL pointing outside the platform org (three cases), When each is submitted for validation, Then each is rejected, nothing is recorded, and the setup remains unresolved. [cx r2: validation negative added]
- **AT-008.05 (P0)** — Given a project `in_progress` whose repo setup remains unresolved, When the follow-up check runs, Then the setup-pending state is surfaced to the NGO and volunteer (blocker/notice) — the admin escalation after 7 days of mutual silence is owned by REQ-024. [cx: aligned with REQ-024's aging ladder] [cross: REQ-024]
- **AT-008.06 (P0)** — Given a project with no recorded repo URL — including the case where a valid org repo EXISTS but was never validated/recorded — When completion evaluates, Then it is blocked in both cases: REQ-005.5's "the repo exists" is operationalized as a validated, recorded URL, the hard precondition. [cx r2: existing-but-unrecorded differential added; wording note — REQ-005.5 says "repo exists", REQ-008 pins the stricter recorded-URL reading, which both AT suites test] [cross: AT-005.5.26]
- **AT-008.07 (P0)** — Given any actor including the NGO admin and the volunteer, When a repository transfer out of the org is attempted, Then no such capability exists, and after completion the repo still lives in the platform org — repositories remain permanently.

## B. Access model

- **AT-008.08 (P0)** — Given the assigned volunteer during the build, When they push to the project repo, Then the push succeeds — the volunteer maintains the repo. Merge authority is exercised under REQ-026 (open under OD-1), not asserted here. [cx: merge claim dropped — reviewer/merge authority unresolved under OD-1]
- **AT-008.09 (P0)** — Given the NGO admin during the build, When they read the repo and comment, Then both succeed; when they attempt a push, Then it is rejected — read + comment, never push.
- **AT-008.10 (P0)** — Given the NGO admin's GitHub identity, When org membership is probed, Then they are an outside collaborator on their project repo only — never an org member.
- **AT-008.11 (P0)** — Given a project reaching completion, When repo permissions are read, Then the volunteer holds read/triage and the NGO admin holds admin — with no org transfer having occurred. [cross: REQ-012]

## C. Code events & task linkage

- **AT-008.12 (P0)** — Given the FIRST commit pushed immediately after repo creation/recording, carrying a known task identifier in its message (fixture), When the project's activity data is read, Then the project's activity-event count increments by exactly one, the newest event references the fixture commit SHA, and the event links to exactly that task — ingestion runs from repo creation, not from some later milestone. [cx r2: exact before/after oracle (event count + SHA + task id); fixture pinned to the creation boundary] [cross: REQ-010 owns cadence display, REQ-026 owns task linkage]
- **AT-008.13 (P0)** — Given a task in the Linear tree, When an unauthorized manual status edit is made, Then it may exist transiently but never becomes authoritative — it is detected and reverted, and the final Linear/mirror status is unchanged; `done` lands only from a verified MATCHING code merge (task identifier + PR author + recorded pull), In Progress from explicit self-assignment, and other transitions only from authorized platform actions. [cx r2: detect-and-revert per REQ-026] [T2: matching-merge definition] [cross: REQ-026 owns the Linear rules]

## D. Issues — dev-internal only

- **AT-008.14 (P0)** — Given GitHub Issues exist on the project repo, When EVERY NGO-observable platform channel renders — project page, dashboard, thread, notifications, activity feed, and project-assistant output — Then no GitHub Issue content appears in any of them — the Linear task tree is the NGO-visible source of truth. The public repo itself remains publicly readable; "never NGO-visible" scopes platform surfaces, not GitHub. [cx: scoped] [cx r2: parameterized across all NGO-observable channels incl. assistant + notifications]
- **AT-008.15 (P0)** — Given a completed Discovery scope doc, When the repo is created and seeded, Then zero GitHub Issues have been auto-created from it.
- **AT-008.29 (P0)** — Given deliberately conflicting fixtures — a GitHub Issue asserting state X while the Linear task tree asserts state Y — When every NGO-visible deliverable and status renders, Then each follows Linear (Y) and ignores the GitHub Issue — Linear is proven the source of truth, not merely Issues proven absent. [cx r2: added — the positive half of the source-of-truth clause] [cross: REQ-026]

## E. Seeding

- **AT-008.16 (P0)** — Given a freshly seeded project repo, When its contents are inspected, Then each seeded element is present: the project-binding marker [cross: REQ-009], the task-binding conventions [cross: REQ-034], the Linear working norms (one issue in progress, assign before starting, comment when blocked, never move status by hand), the commit conventions linking work to its task, the reviewer-agent skill, and env-file hygiene.
- **AT-008.17 (P0)** — Given the seeded README, When it renders, Then it carries the title, NGO name, plain-language summary, license, and project-page link.
- **AT-008.18 (P0)** — Given the seeded repo and its full git history, When scanned for the platform API credential pattern (sentinel), Then no credential material is present; and When a post-seeding commit carrying the credential sentinel is pushed, Then it cannot enter repository history (blocked) and a full-history rescan stays clean — "never committed" is a lifetime invariant, not a seeding-time property. The credential is shown exactly once at issuance, and revoking it leaves the project's virtual key working (and vice versa) — separately revocable. [cx r2: lifetime half added] [cross: AT-009.29 owns the push-protection mechanism]

## F. Platform GitHub credentials

- **AT-008.19 (P0)** — Given the platform's GitHub operations, When its credential store and API calls are inspected, Then only short-lived, on-demand credentials are used and no user PAT is stored anywhere.

## G. Org setup & base-permission invariant

> **Resolved [founder, d66]:** mimic Lovable's behavior — Lovable creates every repo PRIVATE by default (vendor behavior, all plans), so "public from first commit" was physically impossible. The ruled sequence: repo born private → platform validates → platform flips public. Promise §2 reworded ("public MIT ... flipped public at setup validation"). AT-008.20/21 stand exactly as written.

- **AT-008.20 (P0)** — Given org member A (a volunteer) and another project's repo B, When A attempts a write to B, Then it is rejected; and while B is still private (pre-validation), A cannot read it — org membership grants no repo access by default.
- **AT-008.21 (P0)** — Given a member-created repo before setup validation, When its visibility is read, Then it is private; after the platform validates the repo URL, Then it is public — visibility flips only on validation.
- **AT-008.22 (P0)** — Given every non-owner role — the volunteer, AND the NGO admin both during the build and after completion (when they hold repository-admin) — When each attempts a repository visibility change via GitHub directly, Then each attempt is rejected or does not stand — visibility changes are limited to owners and platform automation. [cx: split from the remediation case] [cx r2: NGO-admin cases added, incl. post-completion repo-admin]
- **AT-008.23 (P0)** — Given a sentinel org repo matching no active project, When the orphan monitor runs, Then an observable orphan signal/alert records that repo — surface-agnostic; no specific UI is prescribed. [cx r2: "admin surface" was an unstated implementation]
- **AT-008.24 (P0)** — Given the one-time org setup and a versioned permission allowlist for each GitHub App, When the installed grants are compared, Then each App's grants equal its allowlist with no extras, and the break-glass org-compromise runbook exists as a document; and When an app credential is rotated, Then the old credential is rejected while the replacement works — rotation exercised, not just documented. [cx: P1→P0 + rotation made observable] [cx r2: least-privilege judged against a versioned allowlist, not prose]
- **AT-008.27 (P0)** — Given a harness-induced invalid visibility state (a validated-public repo flipped private, or a pre-validation repo flipped public), When the scheduled check's trigger fires (controlled clock — the checker is NOT invoked directly), Then the invalid state is detected and auto-remediated back within the configured interval; and Given an AUTHORIZED emergency hide (founder break-glass, REQ-031), Then remediation preserves that state — it reverses unauthorized changes only. [cx: added] [cx r2: continuity via scheduled trigger; REQ-031 break-glass carve-out] [cross: REQ-031]

## H. Sync, export & completion offboarding [cx: added round 1]

- **AT-008.25 (P0)** — Given the linked project repo, When an edit lands on the Lovable side and a commit lands on the GitHub side, Then each is reflected on the other (two-way sync observable in both directions); an anonymous user can clone the public repo, and an authenticated unrelated GitHub user can fork it — MIT + two-way sync keep the code forkable and exportable. [cx r2: anonymous fork is impossible on GitHub — clone anonymous, fork authenticated] [cross: REQ-021 owns the Lovable link setup]
- **AT-008.26 (P0)** — Given a project reaching completion, When the NGO completes the prompted Lovable offboarding, Then both the volunteer's and ai4good's read-only monitoring account's memberships are absent from the NGO's Lovable workspace (Lovable has no removal API — the platform prompts, the NGO acts). [cross: REQ-021/012]

## Coverage map

| REQ-008 clause | Tests |
|---|---|
| Public-MIT repo in the platform org via volunteer-driven Lovable→GitHub setup | 01, 03 |
| Uniform repo home: permanent, no transfer; NGO admin holds admin from completion | 07, 11 |
| MIT + two-way sync keep code forkable/exportable | 25 [cx] |
| Access: volunteer maintains (merge authority → REQ-026/OD-1); NGO read + comment, never push | 08, 09 |
| Code events feed cadence + linkage from repo creation; done only from verified merge; manual edits detected + reverted | 12, 13 |
| Issues dev-internal — no NGO-observable platform channel renders them; Linear proven the source of truth; no auto-created issues from scope | 14, 15, 29 [cx r2] |
| Repo seeding (marker, conventions, norms, reviewer skill, env hygiene) | 16 |
| Credentials never committed (lifetime invariant); shown once; separately revocable | 18 |
| Short-lived on-demand GitHub credentials; no user PATs | 19 |
| One-time org setup: least-privilege apps, rotation exercised, break-glass runbook | 24 [cx: P0] |
| Membership grants no default repo access; NGO admins outside collaborators only | 10, 20 |
| Base-permission invariant: private until URL validation (resolved d66 — mimics Lovable's private-by-default creation); non-owner change rejected (all roles); continuously verified via scheduled trigger + auto-remediated (break-glass preserved) | 21, 22, 27 |
| Orphan repos monitored | 23 |
| Lovable path: nothing pre-created; volunteer-driven; validate + record URL (invalid rejected); unresolved surfaced to parties (admin aging → REQ-024); URL gates completion (existing-but-unrecorded still blocks) | 02, 04, 05, 06, 28 [cx r2] |
| Seeded README fields | 17 |
| Completion Lovable offboarding (volunteer + monitoring account removed by NGO on prompt) | 26 [cx] |
