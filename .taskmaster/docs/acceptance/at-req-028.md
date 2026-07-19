# AT-REQ-028 — ai4good Claude Code Skill (the volunteer's single operating surface)

> **[d82 AMENDED — two-tree model, 2026-07-19]:** the Skill's pull-then-complete now brackets PM-TREE REQUIREMENT items (REQ-026): pulling a requirement binds it per worktree (dev-tree items are never bound — requirement-level attribution); the complete flow verifies the requirement's completion evidence and flips the PM item; dev-tree leaves flip on merge via the vendor integration with no Skill act. Helper verbs retargeted accordingly.

Source: requirements/req-028.md (prd-mvp.md REQ-028). Dependencies: REQ-009, REQ-021, REQ-024, REQ-026, REQ-032, REQ-034.

**Boundary note:** REQ-028 owns the Skill: install, bootstrap, binding + pull-then-complete, helpers, conventions, degradation, and the volunteer-driven Lovable posture. Linear's rules are REQ-026's; the gateway REQ-009's; attribution rows REQ-034's; Lovable roles/caps REQ-021's — `[cross:]` here.

## A. Install, config & credentials

- **AT-028.01 (P0)** — Given a fresh volunteer machine, When the one-command install runs, Then the Skill is installed, its source is MIT open-source, and it auto-runs in every session opened in an ai4good repo. [cx: unstated non-ai4good-repo exclusion removed]
- **AT-028.23 (P0)** — Given the Skill installed at version N through the standard Skill channel, When version N+1 ships and a later session opens WITHOUT any reinstall action, Then N+1 runs — auto-updating through the standard channel, behaviorally proven. [cx: added — the auto-update clause had no test]
- **AT-028.02 (P0)** — Given disable and re-enable, When each is invoked, Then the state persists across sessions.
- **AT-028.03 (P0)** — Given repo creation, When the seeded config is inspected, Then non-secret project config is present and no secret is in the repo [cross: AT-008.18]; and When sessions are exercised, Then the FIRST session on the project requires one login, later sessions on the same project require none, and a different project requires its own login — one-login-per-project proven behaviorally. [cx r2: login exercised, not inferred from config]
- **AT-028.04 (P0)** — Given the three credentials, When each is revoked in turn (three fixtures), Then the revoked credential's OWN surface rejects — platform token → blockers/comments/fuel calls fail; task-system OAuth → backlog access fails; gateway key → metered requests fail — while the other two credentials' surfaces still succeed. [cx: per-credential surface mapping asserted — a no-op revocation could have passed] [cross: AT-008.18/AT-009.21]

## B. Session bootstrap

- **AT-028.05 (P0)** — Given distinct sentinel fixtures seeded for EVERY bootstrap input — a unique scope phrase, a unique status value, a named in-progress task, one unresolved blocker with sentinel title, one NGO comment with sentinel text, and a known fuel/runway value — When bootstrap completes, Then (a) the inspectable session context/output contains each of the six sentinels (context loading proven input-by-input), and (b) the concise banner separately carries its required fields exactly: project name, the fixture task + its age, the fuel figure, and the unread-comment count — plus the task-access verification result and the selected binding surfaced observably. [cx: fixture oracles] [cx r2: context loading split from banner rendering; status/scope/blocker/comment sentinels asserted individually]

## C. Task binding + pull-then-complete

- **AT-028.06 (P0)** — Given the volunteer pulls a PM-TREE REQUIREMENT in a worktree, When metered requests flow, Then the requirement binding rides EVERY metered request from that worktree as its attribution context; a second worktree carries its own pulled requirement; a dev-tree item is NEVER a binding target (probe). [d82] [cross: REQ-034/AT-009.08]
> **Resolved [founder, d77 — batch-4 T1, codex-amended]:** LAYERED ENFORCEMENT ruled. The Skill may pause only its OWN guided assistance pending the task-or-exploration choice; the platform/gateway never gate the forwarding of an otherwise-valid metered request for attribution reasons (unbound → unattributed); disabling the Skill is immediate, penalty-free, and degrades attribution to unattributed. REQ-034's ceiling reworded accordingly; REQ-028's floor clause pinned to the auth-failure attribution path (never a metering/access bypass — REQ-009 controls remain in force). AT-028.07/08/19 stand exactly as written.

- **AT-028.07 (P0)** — Given a session before any explicit choice, When substantial work is attempted, Then the SKILL withholds its own assistance until the choice is made — pull a PM requirement or enter the exploration bucket — while metered requests themselves are never blocked platform-side for attribution reasons (a raw request without the Skill still flows, attributed as unattributed). [cx: layered — Skill-local enforcement, never platform gating]
- **AT-028.08 (P0)** — Given an exploration-bucket session that turns into implementation (edits toward a known requirement's scope — fixture), When detected, Then the Skill requires binding the matching PM requirement before continuing its assistance — same Skill-local layer, same platform never-gates boundary. [cx: layered]
- **AT-028.09 (P0)** — Given the dev invokes the complete flow on the pulled requirement, When the Skill acts, Then it verifies the requirement's completion evidence (dev-tree work merged, acceptance evidenced) and records the verified completion that flips the PM item — completion is an explicit dev act at the PM level; dev leaves flip on merge with no Skill act (probe: no Skill path exists to flip a dev leaf). [d82] [cross: AT-026.17]
- **AT-028.10 (P0)** — Given task-system auth fails MID-SESSION and separately AT BOOTSTRAP (two sentinel fixtures), When work continues and a DISTINCT task update is attempted after each failure, Then in both cases the session does NOT stop, that exact update is stored in the local queue, its pending state is shown at session end, metering continues, and binding floors to unattributed (attribution rows carry the unattributed marker) — a floor, never a bypass. [cx: bootstrap case] [cx r2: an actual queued update asserted — an empty queue could have passed] [cross: REQ-034]

## D. Helper commands

- **AT-028.11 (P0)** — Given the pick-next helper, When invoked, Then it offers the highest-priority unblocked PM REQUIREMENT with its full context and pulls (assigns) only on confirm. [d82] [cross: AT-026.11]
- **AT-028.12 (P0)** — Given the fuel-status helper, When invoked, Then it shows balance, burn rate, and projected runway consistent with the provider-truth gauge. [cross: AT-010.14]
- **AT-028.13 (P0)** — Given the list-blockers helper, When invoked, Then it lists unresolved blockers with suggested actions. [cross: REQ-024]
- **AT-028.14 (P0)** — Given the clarifying-question helper, When invoked on a task, Then a task-anchored clarifying blocker is raised with the REQ-024 fields. [cross: AT-024.17]
- **AT-028.15 (P0)** — Given the completion-readiness helper, When invoked, Then it checks: top-priority tasks done, README + runbook present, repo and deployment URLs set, and work pushed — reporting each check's state.
- **AT-028.16 (P0)** — Given reference files on the project, When the download helper runs, Then the files download from the project page path with the volunteer's authorization. [cross: REQ-032/AT-010.10]

## E. Conventions, override & fallback

> **Resolved [codex-verified harmonization, batch-4 tension pass — T2]:** explicit self-assignment is the SOLE In-Progress authority; a branch/PR link is corroborating linkage only (Linear's native automations are independent configurable behaviors, not mirrors — reverted when they fire unmatched); Done = verified matching merge. REQ-026/028 reworded. [Superseded in part by d82 — PM tier: pull/verified completion; dev tier: vendor merge mechanics. See the banner.]

- **AT-028.17 (P0)** — Given an ordinary, uncustomized task workflow (no manual naming, no separate generation command), When the volunteer works a pulled task, Then branch and commit conventions are applied automatically, carrying the DEV-ITEM identifier + linking keywords so the GitHub integration links and closes dev leaves on merge (vendor-native, d82); PM-item status is never moved by conventions — the pull and the complete flow are its only authorities. [cx: uncustomized flow] [T2: corroboration-only finalized] [cross: AT-026.17/AT-008.12]
- **AT-028.18 (P0)** — Given anything the Skill generates (branch name, commit message, banner choice), When the volunteer overrides it, Then the override stands — nothing is forced.
- **AT-028.19 (P0)** — Given the Skill disabled, When each requirement-owned behavior is exercised through its manual route (parameterized matrix: pull a requirement → Linear app (PM team); raise blocker/clarifying question → project page; fuel status → project page gauge; comment reading → project page thread; reference files → project page download; complete a requirement → the platform's verified-completion path; close dev leaves → PR merge; completion-readiness → the project page checklist surfaces; scope summary / project status / in-progress tasks → the public project page), Then each produces its observable result; attribution degrades to unattributed; and the working norms still arrive via the injected prompt. [cx: enumerated matrix] [cx r2: completion-readiness + bootstrap-context routes added] [cross: AT-009.10]

## F. Lovable orchestration posture

- **AT-028.20 (P0)** — Given a task, When the volunteer chooses per task between building locally and delegating to Lovable via Lovable's own MCP, Then both paths work, Discovery's build split is observably non-binding (a task Discovery marked "Lovable" can be built locally, and vice versa), the SKILL never initiates or chooses a delegation without the volunteer's action (probe: no autonomous delegation path exists), and after a delegation the pulled change is tested and followed by either iteration or a local fix — the post-delegation loop is exercised. [cx: volunteer-not-Skill orchestration + post-delegation loop added] [cross: AT-021.18/19]
- **AT-028.24 (P0)** — Given an orchestrated Lovable call from the volunteer's session, When it completes, Then exactly one audit record exists carrying the project, the volunteer, the operation, and a timestamp. [cx: added] [cx r2: task/binding context dropped — Lovable calls are not metered/bound requests, and REQ-021 excludes per-task Lovable attribution] [cross: AT-021.18]
- **AT-028.21 (P0)** — Given the Skill's configuration and behavior, When probed, Then NO Skill-SIDE budget guardrail exists: no per-task caps, no refusal thresholds, and no Skill-side burn ESTIMATE of any kind — informational or gating (the fuel-status helper reports the provider-truth balance/burn/runway, never a per-task prediction). External controls remain in force and are out of this test's scope: the NGO-set Lovable cap, and REQ-009's provider-side stop, rate limits, and catastrophe fuse. [cx: estimates banned outright] [cx r2: "only spend bounds" corrected — REQ-009's provider controls also bound spend; this test asserts only the SKILL-side absence] [cross: AT-021.14/AT-009.17]

## G. Docs

- **AT-028.22 (P0)** — Given the Skill's documentation, When inspected, Then it covers install, configuration, troubleshooting, opt-out, and the disabling implication (attribution → unattributed).

## Coverage map

| REQ-028 clause | Tests |
|---|---|
| One-command install, MIT, auto-run in ai4good repos; auto-updating via the standard Skill channel; disable/enable persists | 01, 02, 23 [cx r2: map fixed] |
| Non-secret config seeded; one login; three separately-revocable credentials | 03, 04 |
| Bootstrap loads + verifies + banner | 05 |
| Binding per worktree rides every metered request | 06 |
| Pull-then-complete enforced; exploration → forced binding | 07, 08 |
| Completion = explicit dev act; Skill verifies + drives merge | 09 |
| Auth-failure degradation (queue locally, floor to unattributed — floor not bypass) | 10 |
| Helpers: pick-next, fuel, blockers, clarifying question, readiness, reference files | 11–16 |
| Conventions auto-applied (branch→In Progress, merge→Done); override anything | 17, 18 |
| Manual fallback complete (Linear app + page; unattributed; norms via injected prompt) | 19 |
| Volunteer-driven Lovable orchestration (Skill never initiates; post-delegation loop); Discovery split non-binding | 20 |
| Orchestrated calls audit-logged (project, volunteer, operation, timestamp) | 24 [cx r2] |
| No Skill-side budget guardrails (external REQ-009/021 controls out of scope) | 21 |
| Docs coverage | 22 |
