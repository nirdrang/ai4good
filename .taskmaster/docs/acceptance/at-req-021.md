# AT-REQ-021 — Lovable Integration: Durable Home + Claude-Code-Orchestrated Build

Source: requirements/req-021.md (prd-mvp.md REQ-021). Dependencies: REQ-004, REQ-005, REQ-007, REQ-008, REQ-009, REQ-010, REQ-024.

**Boundary note:** REQ-021 owns the Lovable relationship: setup flow + gate, roles + billing isolation, orchestration posture, the two purses, credit-status reading, and completion ownership. Discovery output shape is REQ-004's; the scope doc REQ-005's; repo validation REQ-008's; fuel metering REQ-009's; the page display REQ-010's — `[cross:]` here.

## A. Discovery & fit

- **AT-021.01 (P0)** — Given a Discovery run recommending Lovable, When its output renders, Then it carries a rationale and ZERO dollar fields or estimates. [cross: REQ-004 owns Discovery output]
- **AT-021.02 (P0)** — Given the rendered scope doc of such a project, When inspected, Then it states Lovable is paid directly (never from fuel) and carries no dollar figure. [cross: REQ-005 owns the scope doc]
- **AT-021.03 (P0)** — Given a pure-backend need with no Lovable app surface, When the Discovery fit check evaluates it, Then it is declined at Discovery — the only fit-check failure; UI-heavy and backend-heavy mixes both pass (two passing fixtures). [cross: REQ-004]

## B. Setup: mandatory, gated, validated

- **AT-021.04 (P0)** — Given kickoff, When the setup flow is probed, Then no opt-in/opt-out control exists — Lovable setup is mandatory on every project.
- **AT-021.05 (P0)** — Given only ONE of the two required memberships is in place (volunteer invited but monitoring account not, and vice versa — two fixtures), When the volunteer attempts to start, Then start is blocked in both cases; with both memberships validated, Then it proceeds — the gate requires both. [cross: AT-005.5 owns state gating]
- **AT-021.06 (P0)** — Given a validation check fails (sentinel: repo not in org), When the setup item renders, Then it surfaces the SPECIFIC failing check and its fix, and the item stays open — no silent pass, no generic error.
- **AT-021.07 (P0)** — Given the volunteer or NGO self-reports setup complete without the platform's checks passing, When the setup state is read, Then it is still unresolved — setup resolves only on platform validation.
- **AT-021.08 (P0)** — Given the setup guide and project page, When the parties work through setup, Then the guide documents the steps, the page transfers the required information (scope summary, volunteer email, optional best-effort commit-reference snippet), pasted-back values are validated, and a who-acts-next indicator updates as steps complete.

## C. Volunteer technical setup + platform validation

- **AT-021.09 (P0)** — Given the volunteer's session runs the technical setup, When it completes, Then all four effects are observable: the Lovable project is provisioned, its database enabled, GitHub sync connected to a repo in the platform org, and ai4good's conventions + reviewer skill injected so Lovable's own agent follows them. [cross: REQ-008 owns repo mechanics]
- **AT-021.10 (P0)** — Given platform validation runs, When it completes, Then the repo is confirmed in the org and flipped public [cross: AT-008.21], the GitHub App is installed, a name collision (sentinel duplicate) is surfaced, the volunteer's repo permission is reduced to the standard role, and BOTH parties are notified.
- **AT-021.11 (P0)** — Given the volunteer's reduced standard role, When they attempt to add a collaborator to the repo, Then it is rejected — collaborators cannot be added unnoticed.
- **AT-021.12 (P0)** — Given a project needing a workspace-level connector (e.g., payments), When it is added, Then the adding actor is the NGO owner — the volunteer cannot add it.

## D. Roles & billing isolation

- **AT-021.13 (P0)** — Given the volunteer's build-only membership, When they build, publish, and connect GitHub, Then all succeed; and When they probe the workspace subscription, top-up, and payment-method surfaces (UI and API), Then every one is inaccessible — billing is owner-gated and never visible to the volunteer.
- **AT-021.14 (P0)** — Given the NGO sets a native Lovable credit cap for the volunteer, When the volunteer's consumption reaches it, Then further orchestrated spend is bounded by that cap — the only spend bound; no platform-side cap exists (config probe). [cross: REQ-009.17 pattern]
- **AT-021.15 (P0)** — Given ai4good's read-only monitoring account, When it reads credit consumption and workspace state, Then both succeed; and When it attempts ANY write (project edit, member change, billing action, plan change), Then every attempt is rejected — observe-only, no billing or admin access.

## E. Two purses

- **AT-021.16 (P0)** — Given an orchestrated Lovable UI edit and a Claude Code backend task on the same project, When both complete, Then the UI edit decrements Lovable credits with ZERO fuel movement, and the backend work burns fuel with ZERO Lovable-credit movement — the purses never cross. [cross: REQ-009/006]
- **AT-021.17 (P0)** — Given the money ledger, When scanned, Then no Lovable cost row exists anywhere — Lovable cost is never debited from fuel. [cross: REQ-006.25]

## F. Orchestration posture

- **AT-021.18 (P0)** — Given the volunteer's Claude Code session drives Lovable via Lovable's own MCP, When an orchestrated call completes, Then it billed the NGO's workspace, an audit log records it, and it is attributed to the volunteer (who connected their OWN Lovable account — identity separation observable).
- **AT-021.19 (P0)** — Given the MCP path is unavailable (sentinel breakage), When the volunteer works in-browser instead, Then the build continues and commits land in the same shared repo — degradation, never a dead build; both paths produce commits in the one repo.
- **AT-021.20 (P0)** — Given Lovable's side of the integration, When probed, Then no ai4good connector exists inside Lovable and no Lovable-originated call reaches any ai4good endpoint — Lovable never talks to ai4good.

## G. Credit status reading

- **AT-021.21 (P0)** — Given the Lovable workspace's credit state changes (fixture), When the platform's stored status refreshes, Then the new value was read programmatically via the monitoring account with no hand-entered input. [cross: AT-010.22 owns the page display]
- **AT-021.22 (P0)** — Given credit status low and then exhausted (two fixtures), When each is detected, Then each is surfaced in-platform, the NGO is notified, and a direct route to Lovable top-up is offered — while no programmatic purchase path exists (top-up stays a Lovable billing action). [cross: REQ-016]
- **AT-021.23 (P0)** — Given the programmatic read fails (sentinel), When status is needed, Then a manual-report fallback path exists and its value is marked as manually reported; and no mail parser exists anywhere (absence probe).

## H. Blockers & flow

- **AT-021.24 (P0)** — Given a stuck party during setup or build, When they raise a clarifying blocker, Then it ages on the standard ladder and an admin is involved only after prolonged mutual silence — no immediate admin routing. [cross: REQ-024 owns aging]
- **AT-021.25 (P0)** — Given platform validation completes, When the volunteer starts local work, Then no approval step stands between validation and first local work — immediate, no further approval.

## I. Completion & ownership

- **AT-021.26 (P0)** — Given a completed project, When the NGO evolves the live app via Lovable chat with no Claude Code and no orchestration in the loop, Then it works — the NGO owns the workspace outright with zero orchestration dependency.
- **AT-021.27 (P0)** — Given completion, When offboarding runs, Then the platform PROMPTS the NGO to remove both the volunteer and the monitoring account, and CONFIRMS after the NGO acts (no MCP member-management path exists — the removal itself is the NGO's manual action); the repo stays in the platform org with NGO admin and GitHub sync continues. [cross: AT-008.26/AT-012.12]
- **AT-021.28 (P0)** — Given repo-creation permission, When its grant time is audited, Then it was granted at volunteer onboarding (first consent), not per project. [cross: AT-007.19]

## J. Non-goals (absences)

- **AT-021.29 (P0)** — Given v1 surfaces, When probed, Then: no flow buys a Lovable subscription for an NGO; no per-task metering or attribution of Lovable credit exists (only workspace-level status); no credit-reselling surface exists; and ai4good has no Lovable billing control (no charge, no plan change — the monitoring account's write-rejection in AT-021.15 is the enforcement evidence).

## Coverage map

| REQ-021 clause / AC | Tests |
|---|---|
| AC1: Discovery recommends w/ rationale, no dollar; scope doc paid-directly + no dollar | 01, 02 |
| Fit check: pure-backend declined; mixes pass | 03 |
| AC2: setup mandatory (no opt-in/out), resolves only on validation, failures specific + open | 04, 06, 07 |
| AC3: guide + page info transfer, validated paste-back, who-acts-next | 08 |
| AC7: NGO invites both; gate validates both before start | 05 |
| Volunteer technical setup (provision, DB, GitHub sync, conventions+skill) | 09 |
| Platform validation (org, public flip, App, collisions, role reduction, notify) + collaborator guard | 10, 11 |
| Connector added by NGO owner | 12 |
| AC6: build-only role; billing never accessible; native credit cap (only bound) | 13, 14 |
| Monitoring account read-only (observe-only, no billing/admin) | 15 |
| Two purses: UI→Lovable credits, code→fuel; never from fuel | 16, 17 |
| Orchestrated calls bill NGO workspace, audit-logged, attributed; own account | 18 |
| Degradation path (in-browser, same repo, never dead) | 19 |
| No ai4good connector; Lovable never calls ai4good | 20 |
| AC4: credit status pulled (manual fallback), low/exhausted surfaced + notify + top-up route, no mail parser, no programmatic purchase | 21–23 |
| Blockers standard aging, admin after mutual silence; local work immediately | 24, 25 |
| Completion: NGO owns workspace outright, no orchestration dependency | 26 |
| AC8: offboarding prompt + confirm; repo stays, sync continues | 27 |
| AC5: repo-creation permission at onboarding, not per project | 28 |
| Non-goals: no bought subscriptions, no per-task Lovable metering, no reselling, no billing control | 29 |
