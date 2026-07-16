# AT-REQ-010 — Project Page (single view) & Cadence Stats

Source: requirements/req-010.md (prd-mvp.md REQ-010 + Promise §2/§5/§6). Dependencies: REQ-008, REQ-009.

**Boundary note:** REQ-010 owns the project page's content, visibility rules, and cadence presentation. The assistant's behavior is REQ-033's; reference-file storage/ACL mechanics REQ-032's; blocker/Q&A mechanics REQ-024's; fuel-truth plumbing REQ-009/006's; Lovable credit reading REQ-021's — each appears here only as what the PAGE must show, marked `[cross:]`.

## A. One public page, identical for every viewer

- **AT-010.01 (P0)** — Given one project, When its page is rendered as the NGO admin, the assigned volunteer, a platform admin, and a logged-out visitor, Then the read-only content is identical across all four — the ONLY differing element is the NGO project assistant block.
- **AT-010.02 (P0)** — Given the same project, When each viewer class is probed for the project-assistant interface, Then it is present for the project's NGO account only and absent for the volunteer, other NGOs, platform visitors, and logged-out viewers (UI and API). [cross: REQ-033 owns assistant behavior]
- **AT-010.03 (P0)** — Given the routing surface, When probed for a separate developer view/route/variant of the project page, Then none exists — the platform surface is PM/coordination; the dev workflow lives on GitHub.
- **AT-010.04 (P0)** — Given a project with all attributes set, When the page renders, Then it identifies the project: title, NGO, status, assigned volunteer, repo URL, complexity tier, and cause tags.
- **AT-010.05 (P0)** — Given a project whose repo setup is still pending, When the page renders, Then the repo slot shows a plain-language empty state — no broken link, no technical jargon.

## B. Task tree as primary content

- **AT-010.06 (P0)** — Given a fixture task tree with nested tasks in mixed statuses and one task in progress, When the page renders, Then the hierarchy, each task's status, and the work currently underway are all conveyed.
- **AT-010.07 (P0)** — Given 3 of 5 P0 tasks done plus several done P1 tasks, and a GitHub Issues fixture asserting a different count, When overall progress renders, Then it shows exactly 3/5 (P0-only, from the tree) — P1 tasks and GitHub Issues never move the number.
- **AT-010.08 (P0)** — Given a logged-out visitor on any project, When the page renders, Then the full task tree is visible — public on every project. [Promise §2]

## C. Plain-language activity

- **AT-010.09 (P0)** — Given a fixture commit titled with raw jargon (SHA, `fix(api):` prefix, PR number) linked to a task, When the activity feed renders, Then the entry is phrased in plain language tied to the task title, and no raw commit hash, PR number, or commit-message jargon appears anywhere in the feed.

## D. Reference files

- **AT-010.10 (P0)** — Given reference files on the project, When the page renders, Then the files are listed with their descriptions; and When download is attempted by the assigned volunteer, an NGO admin, and a platform admin, Then each succeeds, while an unassigned volunteer, another NGO, and a logged-out visitor are each denied — despite the public repo. [cross: REQ-032 owns storage/ACL]
- **AT-010.11 (P0)** — Given a pre-completion project, When the NGO adds and removes a reference file, Then both succeed; after completion, Then add/remove are unavailable. [cross: REQ-032]

## E. Clarifications Q&A log

- **AT-010.12 (P0)** — Given a clarification asked and later resolved, When the page renders at any later point in the project's life, Then the Q&A log entry persists recording who asked, who answered, and when. [cross: REQ-024 owns blocker mechanics]
- **AT-010.13 (P0)** — Given an unresolved clarification, When the page renders, Then it is clearly flagged as unresolved — visually distinct from resolved entries.

## F. Fuel gauge

- **AT-010.14 (P0)** — Given a sentinel spend value in the provider's Admin/usage API, When the page's fuel balance renders after the propagation interval, Then it equals the provider-truth value — never a locally-derived number. [cross: REQ-009 owns the monitor, REQ-006 owns reconciliation]

## G. GitHub absence

- **AT-010.15 (P0)** — Given a project repo with open Issues, PRs, and commits, When the page renders, Then no GitHub Issue list, PR list, or raw commit log appears — the repo link is the only GitHub touchpoint.

## H. Cadence stats (v1 minimal)

- **AT-010.16 (P0)** — Given one project with ONLY task progression (no commits) and another with ONLY commit activity (no task movement) inside the current period, When liveness renders, Then both read as live — liveness draws on both signals, not commits alone.
- **AT-010.17 (P0)** — Given controlled-clock activity fixtures spanning two periods, When cadence renders, Then it shows recent movement versus the prior period and the time since the last of either signal (task movement or commit).
- **AT-010.18 (P0)** — Given an `in_progress` project with neither task movement nor commits past the staleness threshold, When the page renders, Then a stale-activity indication is shown during build.

## I. Repo-derived signals

- **AT-010.19 (P0)** — Given an `in_progress` project with a live repo, When the page renders, Then it conveys the language/stack in use, time since last activity, the assigned contributor, the license, and completion-readiness.
- **AT-010.20 (P0)** — Given the project repo has nonzero stars, forks, and watchers (fixture), When any project surface renders, Then none of these popularity metrics appears anywhere. [Promise §5]

## J. Two funding states

- **AT-010.21 (P0)** — Given a funded project with a connected Lovable workspace, When the page renders, Then the Claude Code fuel balance and the Lovable credit status appear as two distinct displays — never merged, summed, or interchangeable; before the Lovable connection, Then the Lovable slot shows the setup state instead, and after it shows status, workspace access, and top-up.
- **AT-010.22 (P0)** — Given the Lovable-side credit value changes (fixture via the workspace), When the platform's display refreshes, Then the new value appears without any hand-entered input — the status is read via ai4good's monitoring account. [cross: REQ-021 owns the read mechanism]

## Coverage map

| REQ-010 clause | Tests |
|---|---|
| One public page; identical content for all viewers; no developer view | 01, 03 |
| Assistant surfaced only to the project's NGO account | 02 |
| Identity fields incl. repo empty state | 04, 05 |
| Task tree primary: hierarchy, statuses, current work, P0-only progress from the tree (never GitHub issues) | 06, 07 |
| Full task tree public on every project | 08 |
| Plain-language activity tied to task titles, no raw jargon | 09 |
| Reference files listed w/ descriptions; restricted downloads; NGO add/remove pre-completion | 10, 11 |
| Lifetime Q&A log (who/who/when); unresolved flagged | 12, 13 |
| Fuel balance = real-time provider truth | 14 |
| No Issues/PRs/commit logs; repo link the only GitHub touchpoint | 15 |
| Cadence from BOTH task progression and commits; recent-vs-prior + time-since-last; stale indication | 16–18 |
| Repo-derived signals (language, last activity, contributor, license, completion-readiness) | 19 |
| Popularity metrics never shown | 20 |
| Two purses shown distinctly; Lovable status machine (setup → status/access/top-up); read via monitoring account | 21, 22 |
