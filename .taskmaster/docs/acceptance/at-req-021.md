# AT-REQ-021 — Lovable Integration: Durable Home + Claude-Code-Orchestrated Build

Source: requirements/req-021.md (prd-mvp.md REQ-021). Dependencies: REQ-004, REQ-005, REQ-007, REQ-008, REQ-009, REQ-010, REQ-024.

**Boundary note:** REQ-021 owns the Lovable relationship: setup flow + gate, roles + billing isolation, orchestration posture, the two purses, credit-status reading, and completion ownership. Discovery output shape is REQ-004's; the scope doc REQ-005's; repo validation REQ-008's; fuel metering REQ-009's; the page display REQ-010's — `[cross:]` here.

## A. Discovery & fit

- **AT-021.01 (P0)** — Given an otherwise-fit Discovery need (not pure-backend), When Discovery completes, Then its output DOES recommend Lovable, carries a rationale, and contains ZERO dollar fields or estimates — the recommendation is asserted, not presupposed. [cx r2: fixture rebased to an unrecommended starting state] [cross: REQ-004 owns Discovery output]
> **Resolved [founder, d72]:** the two rules protect different things and both stand — "no dollar figure" was over-broad wording. The scope doc bans PROJECT-SPECIFIC dollar estimates and fuel-budget figures (no cost anchoring, per the pick-your-own-amount rulings) while the standard ~$25/month Lovable subscription disclosure is REQUIRED (REQ-004/Promise §10 transparency). REQ-021 reworded; AT-021.02's provisional reading is now final.

- **AT-021.02 (P0)** — Given the rendered scope doc of such a project, When inspected, Then it states Lovable is paid directly (never from fuel), carries the standard ~$25/mo subscription disclosure, and contains no project-specific dollar estimate or fuel-budget figure. [cx: reconciled] [d72: the disclosure is now REQUIRED, not merely permitted] [cross: REQ-005 owns the scope doc]
- **AT-021.03 (P0)** — Given a pure-backend need with no Lovable app surface, When the Discovery fit check evaluates it, Then it is declined at Discovery on the fit dimension; UI-heavy and backend-heavy mixes both pass (two passing fixtures). REQ-004's OTHER decline reasons (developer-grade one-off, unfit Tier-2 data, confidential codebase) remain in force and are owned by AT-REQ-004. [cx: "only fit-check failure" narrowed to the UI/backend-mix dimension] [cross: REQ-004]

## B. Setup: mandatory, gated, validated

- **AT-021.04 (P0)** — Given kickoff, When the setup flow is probed, Then no opt-in/opt-out control exists — Lovable setup is mandatory on every project.
- **AT-021.05 (P0)** — Given only ONE of the two required memberships is in place (volunteer invited but monitoring account not, and vice versa — two fixtures), When the volunteer attempts to start, Then start is blocked in both cases; with both memberships validated, Then it proceeds — the gate requires both. [cross: AT-005.5 owns state gating]
- **AT-021.06 (P0)** — Given each named validation check made to fail in turn — repo not in org, missing volunteer membership, missing monitoring-account membership, GitHub App not installed, visibility wrong, name collision, permission not reduced (seven sentinels) — When each setup item renders, Then it surfaces THAT specific failing check with its actionable fix and the item stays open — no generic error, no silent pass, for any check. [cx r2: parameterized across every named check — repo-not-in-org alone left six failure modes free to regress]
- **AT-021.07 (P0)** — Given the volunteer or NGO self-reports setup complete without the platform's checks passing, When the setup state is read, Then it is still unresolved — setup resolves only on platform validation.
- **AT-021.08 (P0)** — Given the setup guide and project page, When each is checked exactly: (a) the guide enumerates every documented setup step; (b) a sentinel scope summary and volunteer email round-trip through the page UNCHANGED; (c) a valid paste-back value is accepted and an invalid one rejected with the reason; (d) after each completed step the who-acts-next indicator names the expected NEXT actor (NGO → volunteer → platform per the step order) — Then all four hold. [cx r2: split into exact per-behavior oracles — "documents/validated/updates" were unjudgeable as one compound]
- **AT-021.30 (P0)** — Given a missing, malformed, and well-formed commit-reference snippet (three fixtures), When each is pasted, Then NO task status changes in any case — the snippet is best-effort context only; status moves on PR merges, owned by REQ-026, never on parsing. [cx: added — the never-parsing negative]

## C. Volunteer technical setup + platform validation

- **AT-021.09 (P0)** — Given the volunteer's session runs the technical setup, When it completes, Then all four effects are observable: the Lovable project is provisioned, its database enabled, GitHub sync connected to a repo in the platform org, and ai4good's conventions + reviewer skill injected; and When the Lovable agent is then given (a) a prompt that a named sentinel convention forbids and (b) a change the reviewer skill must flag (two fixtures), Then its output observably complies with the convention AND performs the prescribed review behavior — both injections proven by behavior, not file presence. [cx: behavioral oracle] [cx r2: reviewer-skill oracle added — only the convention was behaviorally proven] [cross: REQ-008 owns repo mechanics]
- **AT-021.10 (P0)** — Given platform validation runs, When it completes, Then the repo is confirmed in the org and flipped public [cross: AT-008.21], the GitHub App is installed, a name collision (sentinel duplicate) is surfaced, the volunteer's repo permission is reduced to the standard role, and BOTH parties are notified.
- **AT-021.11 (P0)** — Given the volunteer's reduced standard role, When they attempt to add a collaborator to the repo, Then the addition cannot happen SILENTLY: either the attempt is rejected, or the addition immediately produces an observable audit record/notification — "cannot be added unnoticed" permits an audited model, not only rejection. [cx r2: rejection-only reading widened to the requirement's actual claim]
- **AT-021.12 (P0)** — Given a project needing a workspace-level connector (e.g., payments), When it is added, Then the adding actor is the NGO owner — the volunteer cannot add it.

## D. Roles & billing isolation

- **AT-021.13 (P0)** — Given the volunteer's build-only membership, When they build, publish, and connect GitHub, Then all succeed; and When they probe the workspace subscription, top-up, and payment-method surfaces (UI and API), Then every one is inaccessible — billing is owner-gated and never visible to the volunteer.
- **AT-021.14 (P0)** — Given the NGO sets a native Lovable credit cap for the volunteer, When the volunteer's consumption reaches it, Then further spend is bounded through BOTH paths — Claude Code orchestration AND the volunteer's in-browser Lovable session — by that same native cap; no platform-side cap exists (config probe). [cx r2: in-browser path added — the cap governs the volunteer's consumption, not just orchestrated calls] [cross: REQ-009.17 pattern]
- **AT-021.15 (P0)** — Given ai4good's read-only monitoring account, When it reads credit consumption and workspace state, Then both succeed; and When it attempts ANY write (project edit, member change, billing action, plan change), Then every attempt is rejected — observe-only, no billing or admin access.

## E. Two purses

- **AT-021.16 (P0)** — Given an orchestrated Lovable UI edit driven from Claude Code, When it completes, Then the Lovable ACTION decrements Lovable credits while the Claude Code requests that orchestrated it are fuel-metered as normal volunteer requests — separate accounting on both meters; and Given an in-browser (non-orchestrated) Lovable edit, Then it moves Lovable credits with zero fuel. A direct Claude Code backend task moves fuel with zero Lovable credits. The purses never cross — but orchestration itself is never fuel-free. [cx: corrected — the original demanded ZERO fuel on an orchestrated edit, contradicting every-volunteer-request-is-metered] [cross: REQ-009/034]
- **AT-021.17 (P0)** — Given the money ledger after Lovable activity, When scanned, Then no Lovable cost appears in any fuel/ledger row — Lovable cost is never debited from fuel; asserted fully locally. [cx: wrong REQ-006.25 delegation dropped — that test proves row completeness, not Lovable exclusion]

## F. Orchestration posture

- **AT-021.18 (P0)** — Given the volunteer's Claude Code session drives Lovable via Lovable's own MCP, When an orchestrated call completes, Then it billed the NGO's workspace, an audit log records it, and it is attributed to the volunteer (who connected their OWN Lovable account — identity separation observable).
- **AT-021.19 (P0)** — Given the MCP path is unavailable (sentinel breakage), When the volunteer works in-browser instead, Then the build continues and commits land in the same shared repo — degradation, never a dead build; both paths produce commits in the one repo.
- **AT-021.20 (P0)** — Given Lovable's side of the integration, When probed, Then no ai4good connector exists inside Lovable and no Lovable-originated call reaches any ai4good endpoint — Lovable never talks to ai4good.

## G. Credit status reading

- **AT-021.21 (P0)** — Given the Lovable workspace's credit state changes (fixture), When the platform's stored status refreshes, Then the new value was read programmatically via the monitoring account with no hand-entered input. [cross: AT-010.22 owns the page display]
- **AT-021.22 (P0)** — Given credit status low and then exhausted (two fixtures), When each is detected, Then each is surfaced in-platform, the NGO is notified, and a direct route to Lovable top-up is offered — while no programmatic purchase path exists (top-up stays a Lovable billing action). [cross: REQ-016]
- **AT-021.23 (P0)** — Given the programmatic read fails (sentinel), When status is needed, Then a manual-report fallback path exists and accepts a value; and no mail parser exists anywhere (absence probe). [cx: unstated "marked as manually reported" provenance label dropped]

## H. Blockers & flow

- **AT-021.24 (P0)** — Given a stuck party, When they raise a blocker, Then the oracle splits per REQ-024: a LOVABLE-SETUP blocker reaches an admin only after the mutual-silence condition, while an ordinary clarifying blocker follows the standard 48h/7d aging ladder (admin at 7 days regardless of silence) — REQ-021's "only after prolonged mutual silence" scopes the setup context, not all blockers. [cx r2: oracle split — the blanket mutual-silence reading contradicted REQ-024's ladder] [cross: REQ-024 owns aging]
- **AT-021.25 (P0)** — Given platform validation completes, When the volunteer starts local work, Then no approval step stands between validation and first local work — immediate, no further approval.

## I. Completion & ownership

- **AT-021.26 (P0)** — Given a completed project, When the NGO requests a sentinel visible change via Lovable chat (no Claude Code, no orchestration, no developer anywhere in the loop), Then that change appears in the live app — the NGO owns the workspace outright with zero orchestration dependency. [cx: "it works" concretized to a sentinel chat-to-live-app change]
- **AT-021.27 (P0)** — Given completion, When offboarding runs, Then the platform PROMPTS the NGO to remove both the volunteer and the monitoring account, and CONFIRMS after the NGO acts (no MCP member-management path exists — the removal itself is the NGO's manual action); the repo stays in the platform org with NGO admin and GitHub sync continues. [cross: AT-008.26/AT-012.12]
- **AT-021.28 (P0)** — Given repo-creation permission, When its grant time is audited, Then it was granted at volunteer onboarding (first consent), not per project. [cross: AT-007.19]
- **AT-021.31 (P0)** — Given a project approaching kickoff, When the pre-kickoff reminder fires, Then it reaches the NGO BEFORE kickoff and names both workspace setup and the required invitations. [cx: added — the reminder clause had no test] [cross: REQ-016]
- **AT-021.32 (P0)** — Given the NGO runs the account/billing setup, When it creates the workspace, funds it, sets the credit cap, and sends both invites, Then all succeed with ZERO platform-admin actions and NO NGO GitHub account or credential anywhere in the flow; and the two invitation events carry timestamps INSIDE the kickoff-setup window, before the membership gate releases the volunteer — invitation timing asserted, not assumed. [cx: added] [cx r2: kickoff-timing timestamps added — no test observed WHEN the invites happen]
- **AT-021.33 (P0)** — Given Claude Code task fixtures for backend, logic, tests, and docs work (four), When each completes, Then each burns fuel and lands as commits in the shared repo — Claude Code handles all four categories; the enforced project-scope rule on those requests is owned by AT-009.10/11. [cx: added — logic/tests/docs were uncovered; scope enforcement cross-delegated]
- **AT-021.34 (P0)** — Given workspace creation at kickoff, When ownership is probed then and at every later lifecycle point (build, completion), Then the NGO is the workspace owner throughout and no transfer event ever occurs — day-one ownership, not completion-day ownership. [cx: added — ownership was only tested post-completion]

## J. Non-goals (absences)

- **AT-021.29 (P0)** — Given v1 surfaces, When probed, Then: no flow buys a Lovable subscription for an NGO; no per-task metering or attribution of Lovable credit exists (only workspace-level status); no credit-reselling surface exists; and ai4good has no Lovable billing control (no charge, no plan change — the monitoring account's write-rejection in AT-021.15 is the enforcement evidence).

## Coverage map

| REQ-021 clause / AC | Tests |
|---|---|
| AC1: Discovery recommends w/ rationale, no project-specific dollar; scope doc paid-directly + REQUIRED ~$25/mo disclosure, no project-specific estimate (resolved d72) | 01, 02 |
| Fit check: pure-backend declined (mix dimension only; other declines → REQ-004); mixes pass | 03 |
| NGO reminded before kickoff (workspace setup + invites) | 31 [cx] |
| NGO creates/funds workspace self-served: zero admin actions, no NGO GitHub account | 32 [cx] |
| AC2: setup mandatory (no opt-in/out), resolves only on validation, failures specific + open | 04, 06, 07 |
| AC3: guide + page info transfer, validated paste-back, who-acts-next; snippet NEVER moves status | 08, 30 [cx] |
| AC7: NGO invites both (actor + kickoff timing); gate validates both before start | 05, 32 |
| Volunteer technical setup (provision, DB, GitHub sync, conventions+skill — agent compliance behaviorally proven) | 09 |
| Platform validation (org, public flip, App, collisions, role reduction, notify) + collaborator guard | 10, 11 |
| Connector added by NGO owner | 12 |
| AC6: build-only role; billing never accessible; native credit cap (only bound) | 13, 14 |
| Monitoring account read-only (observe-only, no billing/admin) | 15 |
| Two purses: Lovable action→credits, orchestrating Claude Code requests→fuel (never fuel-free), in-browser→credits only; Lovable never debited from fuel | 16, 17 |
| Claude Code handles backend/logic/tests/docs (fuel + commits); scope enforcement → AT-009.10/11 | 33 [cx] |
| Orchestrated calls bill NGO workspace, audit-logged, attributed; own account | 18 |
| Degradation path (in-browser, same repo, never dead) | 19 |
| No ai4good connector; Lovable never calls ai4good | 20 |
| AC4: credit status pulled (manual fallback), low/exhausted surfaced + notify + top-up route, no mail parser, no programmatic purchase | 21–23 |
| Blockers standard aging, admin after mutual silence; local work immediately | 24, 25 |
| Ownership: day-one at creation, throughout, and outright at completion (sentinel chat-to-live-app change, no orchestration) | 26, 34 [cx] |
| AC8: offboarding prompt + confirm; repo stays, sync continues | 27 |
| AC5: repo-creation permission at onboarding, not per project | 28 |
| Non-goals: no bought subscriptions, no per-task Lovable metering, no reselling, no billing control | 29 |
