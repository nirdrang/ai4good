# AT-REQ-028 — ai4good Claude Code Skill (the volunteer's single operating surface)

Source: requirements/req-028.md (prd-mvp.md REQ-028). Dependencies: REQ-009, REQ-021, REQ-024, REQ-026, REQ-032, REQ-034.

**Boundary note:** REQ-028 owns the Skill: install, bootstrap, binding + pull-then-complete, helpers, conventions, degradation, and the volunteer-driven Lovable posture. Linear's rules are REQ-026's; the gateway REQ-009's; attribution rows REQ-034's; Lovable roles/caps REQ-021's — `[cross:]` here.

## A. Install, config & credentials

- **AT-028.01 (P0)** — Given a fresh volunteer machine, When the one-command install runs, Then the Skill is installed, its source is MIT open-source, and it auto-runs in every session opened in an ai4good repo — and does NOT auto-run in a non-ai4good repo.
- **AT-028.02 (P0)** — Given disable and re-enable, When each is invoked, Then the state persists across sessions.
- **AT-028.03 (P0)** — Given repo creation, When the seeded config is inspected, Then non-secret project config is present, no secret is in the repo [cross: AT-008.18], and exactly one login per project is required.
- **AT-028.04 (P0)** — Given the three credentials (platform token, task-system OAuth, gateway virtual key), When each is revoked in turn, Then the other two keep working — separately revocable, three fixtures. [cross: AT-008.18/AT-009.21]

## B. Session bootstrap

- **AT-028.05 (P0)** — Given a session opens in an ai4good repo, When bootstrap completes, Then it has loaded the scope summary, status, in-progress tasks, unresolved blockers, recent NGO comments, and fuel runway; verified task access; read the binding; and printed a banner carrying the project, the active task and its age, fuel, and unread comments.

## C. Task binding + pull-then-complete

- **AT-028.06 (P0)** — Given the volunteer self-assigns an issue in a worktree, When metered requests flow, Then the binding rides EVERY metered request from that worktree as its attribution context; a second worktree carries its own binding. [cross: REQ-034/AT-009.08]
- **AT-028.07 (P0)** — Given a session before any explicit choice, When substantial work is attempted, Then the Skill forces the choice — pull an issue or enter the exploration bucket — and work proceeds only after one is made (pull-then-complete is ENFORCED, not suggested).
- **AT-028.08 (P0)** — Given an exploration-bucket session that turns into implementation (edits toward a known issue's scope — fixture), When detected, Then the Skill forces binding the matching issue before continuing.
- **AT-028.09 (P0)** — Given the dev marks a task done, When the Skill acts, Then it verifies and drives the merge that flips status — completion is an explicit dev act, and the merge is the only done-path. [cross: AT-026.17]
- **AT-028.10 (P0)** — Given task-system auth fails mid-session (sentinel), When work continues, Then the session does NOT stop: updates queue locally and surface at session end, and binding floors to unattributed — observable as a floor (attribution rows carry the unattributed marker), never a bypass (metering continues). [cross: REQ-034]

## D. Helper commands

- **AT-028.11 (P0)** — Given the pick-next helper, When invoked, Then it offers the highest-priority unblocked issue with its full context and self-assigns only on confirm. [cross: AT-026.11]
- **AT-028.12 (P0)** — Given the fuel-status helper, When invoked, Then it shows balance, burn rate, and projected runway consistent with the provider-truth gauge. [cross: AT-010.14]
- **AT-028.13 (P0)** — Given the list-blockers helper, When invoked, Then it lists unresolved blockers with suggested actions. [cross: REQ-024]
- **AT-028.14 (P0)** — Given the clarifying-question helper, When invoked on a task, Then a task-anchored clarifying blocker is raised with the REQ-024 fields. [cross: AT-024.17]
- **AT-028.15 (P0)** — Given the completion-readiness helper, When invoked, Then it checks: top-priority tasks done, README + runbook present, repo and deployment URLs set, and work pushed — reporting each check's state.
- **AT-028.16 (P0)** — Given reference files on the project, When the download helper runs, Then the files download from the project page path with the volunteer's authorization. [cross: REQ-032/AT-010.10]

## E. Conventions, override & fallback

- **AT-028.17 (P0)** — Given the Skill generates branch/commit names, When work flows, Then the conventions carry the task identifier + linking keywords so the GitHub integration links the work: the branch link marks In Progress, the merge marks Done. [cross: AT-026.17/AT-008.12]
- **AT-028.18 (P0)** — Given anything the Skill generates (branch name, commit message, banner choice), When the volunteer overrides it, Then the override stands — nothing is forced.
- **AT-028.19 (P0)** — Given the Skill disabled, When the volunteer works via the Linear app and project page, Then every behavior remains achievable, attribution degrades to unattributed, and the working norms still arrive via the injected prompt — the manual fallback is complete. [cross: AT-009.10]

## F. Lovable orchestration posture

- **AT-028.20 (P0)** — Given a task, When the volunteer chooses per task between building locally and delegating to Lovable via Lovable's own MCP, Then both paths work and Discovery's build split is observably non-binding (a task Discovery marked "Lovable" can be built locally, and vice versa). [cross: AT-021.18/19]
- **AT-028.21 (P0)** — Given the Skill's configuration and behavior, When probed, Then NO Skill-side budget guardrail exists: no per-task caps, no burn estimates gating work, no refusal thresholds — the only spend bounds are the NGO-set Lovable cap and the provider-side fuel stop. [cross: AT-021.14/AT-009.17]

## G. Docs

- **AT-028.22 (P0)** — Given the Skill's documentation, When inspected, Then it covers install, configuration, troubleshooting, opt-out, and the disabling implication (attribution → unattributed).

## Coverage map

| REQ-028 clause | Tests |
|---|---|
| One-command install, MIT, auto-run in ai4good repos only; disable/enable persists | 01, 02 |
| Non-secret config seeded; one login; three separately-revocable credentials | 03, 04 |
| Bootstrap loads + verifies + banner | 05 |
| Binding per worktree rides every metered request | 06 |
| Pull-then-complete enforced; exploration → forced binding | 07, 08 |
| Completion = explicit dev act; Skill verifies + drives merge | 09 |
| Auth-failure degradation (queue locally, floor to unattributed — floor not bypass) | 10 |
| Helpers: pick-next, fuel, blockers, clarifying question, readiness, reference files | 11–16 |
| Conventions auto-applied (branch→In Progress, merge→Done); override anything | 17, 18 |
| Manual fallback complete (Linear app + page; unattributed; norms via injected prompt) | 19 |
| Volunteer-driven Lovable orchestration; Discovery split non-binding | 20 |
| No Skill-side budget guardrails | 21 |
| Docs coverage | 22 |
