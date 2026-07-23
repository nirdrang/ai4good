# AT-REQ-010 — Project Page (single view) & Cadence Stats

Source: requirements/req-010.md (prd-mvp.md REQ-010 + Promise §2/§5/§6). Dependencies: REQ-008, REQ-009.

**Boundary note:** REQ-010 owns the project page's content, visibility rules, and cadence presentation. The assistant's behavior is REQ-033's; reference-file storage/ACL mechanics REQ-032's; blocker/Q&A mechanics REQ-024's; fuel-truth plumbing REQ-009/006's; Lovable credit reading REQ-021's — each appears here only as what the PAGE must show, marked `[cross:]`.

## A. One public page, identical for every viewer

- **AT-010.01 (P0)** — Given one project, When its page is rendered as the NGO admin, the assigned volunteer, an UNASSIGNED volunteer, ANOTHER NGO's account, a platform admin, and a logged-out visitor, Then the PUBLIC STATUS PROJECTION is identical across all six — project identity, the full requirement tree, activity, the blocker signal, the Q&A log, reference-file metadata, fuel/Lovable status, cadence, and repo-derived signals — while the role-gated elements (the participants-only comment thread REQ-015, file downloads REQ-032, the NGO assistant REQ-033) differ per their owning requirements and are NOT part of the equality comparison. [cx: unassigned volunteer + foreign NGO added] [d80: equality scoped to the projection — exception-counting replaced by the two-layer contract]
- **AT-010.02 (P0)** — Given the same project in `in_progress` or later (the assistant's availability window, REQ-033), When each viewer class is probed for the project-assistant interface, Then it is present for the project's NGO account only and absent for the volunteer, other NGOs, platform visitors, and logged-out viewers (UI and API); pre-`in_progress` absence is owned by REQ-033. [cx: lifecycle precondition pinned] [cross: REQ-033]
- **AT-010.03 (P0)** — Given the routing surface, When probed for a separate developer view/route/variant of the project page, Then none exists — the platform surface is PM/coordination; the dev workflow lives on GitHub.
- **AT-010.04 (P0)** — Given a project with all attributes set, When the page renders, Then it identifies the project: title, NGO, status, assigned volunteer, repo URL, complexity tier, and cause tags.
- **AT-010.05 (P0)** — Given a project whose repo setup is still pending, When the page renders, Then the repo slot shows a plain-language empty state — no broken link, no technical jargon.

## B. Requirement tree as primary content

- **AT-010.06 (P0)** — Given a fixture requirement tree with nested requirements in mixed statuses and one requirement in progress, When the page renders, Then the hierarchy, each requirement's status, and the work currently underway are all conveyed, AND the requirement tree occupies the page's primary/main content region — primary, not merely present (no DOM/layout ordering constraint beyond the main region). [cx: primacy made observable] [cx r2: ahead-of-every-panel ordering dropped — an invented layout rule]
- **AT-010.07 (P0)** — Given 3 of 5 P0 requirements done plus several done P1 requirements, and a GitHub Issues fixture asserting a different count, When overall progress renders, Then it represents exactly the 60% ratio (3/5, "3 of 5", or an accessible progress value of 60% all pass — the RATIO is asserted, not a display format) — P1 requirements and GitHub Issues never move it. [cx: display format un-invented]
- **AT-010.08 (P0)** — Given a logged-out visitor on any project, When the page renders, Then the full requirement tree is visible — public on every project. [Promise §2]

## C. Plain-language activity

- **AT-010.09 (P0)** — Given three activity fixtures — a commit titled with raw jargon (SHA, `fix(api):` prefix, PR number), a PM task progression, and a PR-merge event — each linked to a task, When the activity feed renders, Then every entry is phrased in plain language tied to its task title, and no raw commit hash, PR number, status jargon, or commit-message jargon appears anywhere in the feed. [cx r2: task-progression + PR/merge fixtures added — commit-only left two activity sources unexercised]

## D. Reference files

- **AT-010.10 (P0)** — Given reference files on the project, When the page renders, Then the files are listed with their descriptions; and When download is attempted by the assigned volunteer, an NGO admin, and a platform admin, Then each succeeds, while an unassigned volunteer, another NGO, and a logged-out visitor are each denied — despite the public repo. [cross: REQ-032 owns storage/ACL]
- **AT-010.11 (P0)** — Given a pre-completion project, When the NGO adds and removes a reference file, Then both succeed; after completion, Then add/remove are unavailable. [cross: REQ-032]

## E. Clarifications Q&A log

- **AT-010.12 (P0)** — Given a clarification asked and later resolved, When the page renders at any later point in the project's life, Then the Q&A log entry persists recording who asked, who answered, and when. [cross: REQ-024 owns blocker mechanics]
- **AT-010.13 (P0)** — Given an unresolved clarification, When the page renders, Then it is clearly flagged as unresolved — visually distinct from resolved entries.

## F. Fuel gauge

- **AT-010.14 (P0)** — Given an authoritative provider usage fixture priced at the official rate card against the project's provider budget (remaining = budget − priced usage), a conflicting local value seeded against it, and the provider usage then changed (two-step fixture), When the page's fuel balance is read after each step, Then the displayed REMAINING BALANCE matches that provider-derived oracle within the bounded freshness interval (provisional ≤5 minutes — the AT-006.48 bound; founder to pin) in both steps, ignoring the conflicting local value. [cx: bounded interval + conflict fixtures] [cx r2: unit corrected] [d69: oracle = budget − priced usage (the spend-limit quantity no longer exists)] [cross: REQ-009/006]

## G. GitHub absence

- **AT-010.15 (P0)** — Given a project repo with open Issues, PRs, and commits, When the page renders, Then no GitHub Issue list, PR list, or raw commit log appears — the repo link is the only GitHub touchpoint.

## H. Cadence stats (v1 minimal)

- **AT-010.16 (P0)** — Given one project with ONLY requirement progression (no commits) and another with ONLY commit activity (no requirement movement) inside the current period, When liveness renders, Then both read as live — liveness draws on both signals, not commits alone.
- **AT-010.17 (P0)** — Given a controlled-clock fixture with exactly 4 task movements + 2 commits in the current period and 1 task movement + 3 commits in the prior period, When cadence renders, Then each SIGNAL's current-vs-prior values are reflected (tasks 4 vs 1; commits 2 vs 3 — no aggregate sum is prescribed, the PRD defines none); and Given competing timestamps in BOTH orders — a task movement at 6h with the last commit at 20h, and a commit at 3h with the last task movement at 15h (two fixtures) — Then time-since-last reads 6h and 3h respectively, always from the newer signal whichever kind it is. [cx: exact fixtures] [cx r2: invented 6-vs-4 aggregation dropped; mirrored newer-commit case added — always-prefer-task code would have passed]
- **AT-010.18 (P0)** — Given the authoritative staleness-threshold configuration and two controlled-clock `in_progress` fixtures — one with its last activity just INSIDE the threshold, one just PAST it — When each page renders, Then the fresh one shows NO stale indication and the stale one shows it — both sides of the configured boundary, so an always-on warning fails. [cx r2: threshold pinned to the authoritative config + fresh-side control added]

## I. Repo-derived signals

- **AT-010.19 (P0)** — Given an `in_progress` project with a live repo AND a `completed` project with a live repo (two fixtures — "in-progress onward" includes completed), When each page renders, Then both convey the language/stack in use, time since last activity, the assigned contributor, the license, and completion-readiness. [cx: completed-state fixture added]
- **AT-010.20 (P0)** — Given the project repo has nonzero stars, forks, and watchers (fixture), When any project surface renders, Then none of these popularity metrics appears anywhere. [Promise §5]

## J. Two funding states

- **AT-010.21 (P0)** — Given a funded project with a connected Lovable workspace, When the page renders, Then the Claude Code fuel balance and the Lovable credit status appear as two distinct displays — never merged, summed, or interchangeable. [cx: split — lifecycle states moved to .23]
- **AT-010.23 (P0)** — Given a funded project BEFORE its Lovable connection, When the page renders, Then the Lovable slot shows the setup state AND the Claude Code fuel balance is simultaneously present and distinct from it; When the connection then completes (explicit transition in the fixture), Then the same slot shows Lovable status, workspace access, and top-up — the slot's two states observed across a real transition, with the fuel purse visible throughout. [cx: added] [cx r2: pre-connection fuel-balance presence asserted — the split had dropped it]
- **AT-010.22 (P0)** — Given the Lovable-side credit value changes (fixture via the workspace), When the platform's display refreshes, Then the new value appears without any hand-entered input — the status is read via ai4good's monitoring account. [cross: REQ-021 owns the read mechanism]

## Coverage map

| REQ-010 clause | Tests |
|---|---|
| One public page; identical public STATUS PROJECTION for all viewers (role-gated thread/downloads/assistant outside the rule, d80); no developer view | 01 [d80], 03 |
| Assistant surfaced only to the project's NGO account | 02 |
| Identity fields incl. repo empty state | 04, 05 |
| Requirement tree PRIMARY (main content region): hierarchy, statuses, current work, P0-only progress ratio from the tree (never GitHub issues) | 06, 07 |
| Full task tree public on every project | 08 |
| Plain-language activity tied to requirement titles, no raw jargon | 09 |
| Reference files listed w/ descriptions; restricted downloads; NGO add/remove pre-completion | 10, 11 |
| Lifetime Q&A log (who/who/when); unresolved flagged | 12, 13 |
| Fuel balance = real-time provider truth, stays reconciled (bounded freshness, conflict + change fixtures) | 14 |
| No Issues/PRs/commit logs; repo link the only GitHub touchpoint | 15 |
| Cadence from BOTH requirement progression and commits; recent-vs-prior + time-since-last; stale indication | 16–18 |
| Repo-derived signals, in_progress AND completed (language, last activity, contributor, license, completion-readiness) | 19 |
| Popularity metrics never shown | 20 |
| Two purses shown distinctly; Lovable slot state machine across a real transition (setup → status/access/top-up); read via monitoring account | 21, 22, 23 [cx] |
