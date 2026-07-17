## Problem Statement

NGOs run a chronic software deficit (spreadsheets, generic SaaS, ill-fitting donated point-solutions); vendors price for corporate budgets, pro-bono shops are oversubscribed, and volunteer one-offs stall without a shared backbone (scope, funding, PM, delivery). AI-augmented developers now ship 5-10x faster than the pre-AI baseline but lack an aggregated channel into social-impact work — a coordination failure, not unwillingness.

**Impact:** NGOs and other mission-driven organizations lose staff hours, miss reporting deadlines, and cannot scale (cf. Code for America: 30-60% productivity loss to manual processes); volunteers lack scoped, token-funded, deliverable projects; NGOs spend $1B+/year on partially-fitting SaaS plus multiples in staff time.

**Why now:** (1) an AI coding inflection — a single developer ships production software in days, not months; (2) token-metered APIs make per-project dollar budgeting tractable for the first time; (3) GitHub-native norms give a free, transparent PM spine; (4) Stripe primitives make a credit ledger feasible for a small team.

---

## Goals & Success Metrics

### Goal 1: Ship Working, Deployed NGO Tools
Deployed tools NGOs use, end-to-end (post → discovery → match → build → deploy → completion), not just published repos. Metric: projects reaching completion — all P0 tasks done (REQ-012). Baseline 0. Target: 25 NGOs with working deployed tools in the first 12 months.

### Goal 2: Volunteer Engagement & Retention
Metrics: active volunteers (1+ committed task/month) and the repeat-project rate. Baseline 0. Target (month 12): 100 active monthly volunteers; 30% complete a second project within 90 days of their first.

### Goal 3: Blended Sustainability
Validate blended funding (skim + grants + charitable donations) covering costs: Anthropic pay-as-you-go usage billing, infrastructure, and deliberately-manual concierge/admin labor. v1 is expected to run net-negative on skim alone; the target is a credible blended path, not skim profitability. Metrics: net contribution and its inputs — fuel throughput, skim, and grant/donation intake (org-level; the leftover-fuel donation flow is removed). Target: $250k fuel throughput; grant/donor runway covering the projected year-1 net gap.

### Goal 4: Discovery Quality
Validate volunteer-executable Discovery scopes. Metric: % of scoped projects reaching completion without major scope renegotiation (more than one scope-doc reopen). Target (months 3-12): >70% ship against the original scope, with at most one minor revision.

### Goal 5: Volunteer Supply (the #1 launch gate)
Launch concierge-first: pre-recruit a volunteer bench and hand-match the first ~10-15 curated projects before organic browse (REQ-007). Metrics: the activation funnel (signup → first-match-consent → first-completion (→RM-8)) and time-to-first-match per open project, both fed by the concierge match log (REQ-007). Target: a pre-launch bench of ≥20 volunteers; ≥80% of first-cohort open projects matched within 7 days; signup→completion activation ≥25%. A project unmatched past 7 days goes to the concierge queue (REQ-016) (→RM-8).

## User Stories

### Story 1: NGO Posts a Need
An NGO program manager turns a plain-language need into a buildable scope that gets funded and built into a real tool; no technical spec. (Depends: REQ-001, REQ-002, REQ-004, REQ-005.)
- Org-profile signup (name, mission, contact); vetting happens in concierge onboarding (REQ-002). Explicit ToS + Platform-Promise acceptance (limited coordination relationship, open-source by default, fuel = non-cash AI-usage credit, no SLA), recorded for audit, gates project creation.
- The AI Discovery Agent refines a free-text need over 5-10 turns into a scope document; a complexity tier (small/medium/large — no dollar estimate in v1, REQ-004); a data-sensitivity tier and handling guideline (Tier-2: fixtures-only during build); a maintainability-fit check (maintain via Lovable chat; needs requiring ongoing developer maintenance are declined at Discovery and recorded for founder review); a suggested stack; and acceptance criteria.
- The scope is editable pre-publish; publishing lists it publicly; the NGO is emailed on publish and match.

### Story 2: NGO Funds a Project with Fuel
Card-purchased fuel is assigned per project, with no platform-wide commitment. (Depends: REQ-001, REQ-006, REQ-009.)
- One-time Stripe Checkout top-ups, no subscription; the Promise & Disclaimers are accessible, and the hard acknowledgment fires once at match acceptance, not per top-up.
- Fuel is USD-denominated and displayed gross ($100 = $100 fuel); there is no skim at top-up — the platform share (default 15%) is recognized as AI spend is consumed (REQ-006/REQ-009).
- A real-time per-project ledger shows purchases, consumption, and balance; failed payments get clear feedback; EU/UK NGOs get valid VAT invoices.

### Story 3: Volunteer Joins and Gets Matched
An AI-augmented developer joins the bench, marks interest on projects, gets concierge-matched from that pool, and consents in one action. (Depends: REQ-007, REQ-008.)
- A GitHub link is mandatory at signup, which imports the volunteer's stats; the volunteer self-declares skills, availability, and preferred causes.
- The volunteer browses public listings and marks candidacies; the concierge matches from the interested pool at its own judgment — no candidacy window or matching deadline in v1.
- First match consent (the first-commitment moment, REQ-007) requires the ToS + Platform-Promise: coordination layer only, no obligated outcomes; volunteering, not employment; all work public open-source (MIT); the per-project key used only for that project; fixtures-only and confidentiality on Tier-2 data; and violations risking deactivation and completion-credit forfeiture. It is per-account, re-accepted once on a material text change, and the disclaimer always precedes any project introduction or access.
- v1 matching is concierge: admin-created, binding, no NGO approve/decline; one-action volunteer consent; the NGO's per-match acknowledgment rides the funding screen (→RM-8); consent does NOT trigger kickoff — the project waits for funding (match-to-fund, REQ-006).
- On funding, kickoff fires with no admin ops tasks: the repo is established by the NGO and volunteer via the Lovable setup (Lovable mandatory, REQ-021); per-project AI keys are issued (REQ-009); and the comment thread opens (REQ-015). There is no build backlog at kickoff — one bootstrap task is seeded and the volunteer authors the project PRD from the Discovery scope (REQ-036), raising NGO clarifying questions; an automated scorer measures PRD completion against Discovery, and only a passing score unlocks backlog decomposition (REQ-026; GitHub Issues stay dev-internal, REQ-008). Repo setup and key issuance never wait on it. The starter kit is a build guide plus the pull-based workflow.

### Story 4: Volunteer Builds — Claude Code as the entry point (orchestrating Lovable)
Claude Code is the single entry point: backend/logic/tests are metered against fuel, and Lovable is orchestrated for the app/UI layer. (Depends: REQ-009, REQ-010, REQ-021, REQ-026, REQ-028.)
- A platform-issued virtual key per volunteer-project pair keeps the real provider key on the platform; standard Claude Code is unmodified. The Starter Kit and Skill (REQ-028) load project context and connect the Linear task flow (REQ-026) and the Lovable MCP.
- The fuel stop executes at the provider: a platform monitor reads the provider's usage — the single source of truth — and fires the thresholds: below 20% the NGO gets a top-up prompt (REQ-024), below 5% the volunteer is warned, and at exhaustion the platform sets the project's provider key inactive so the provider declines further requests while the gateway proxies the rejection (both parties notified). Top-up re-arms the key and restores service with no human step (REQ-009).
- The volunteer drives Lovable from Claude Code via Lovable's MCP, audit-trailed, driving Lovable in-browser if the MCP is unavailable; their Lovable spend is bounded only by the NGO-set native credit cap (REQ-021). The NGO owns the Lovable workspace and pays Lovable directly, never from fuel; the platform reads Lovable credit status through its monitoring account (REQ-021), with a volunteer flag as fallback.
- The project page shows both funding states distinctly — the Claude Code fuel balance and the Lovable status (REQ-010); further abuse protections are documented, not built (→RM-9).

### Story 5: Project Management via the Linear-Backed PM Task Tree (REQ-026)
A plain-language hierarchical view; status comes only from deterministic events (PR merges, self-assignment), never agent self-report; pull-then-complete (pull an item before working on it) is **enforced by the Skill (REQ-028)**, so every metered request carries attribution context. (Depends: REQ-008, REQ-026, REQ-028.)
- The tree is decomposed from the dev-authored PRD after the gate (REQ-036): one parent per story, one sub-issue per acceptance criterion; Discovery is the PRD's source, never decomposed directly; automation drafts and pushes and the coordinator spot-checks during the pilot.
- The ai4good project page is the primary view (current work, task list, activity); NGOs never need Linear seats.
- Self-assignment marks in-progress; dev-marked completion drives the PR merge, the only path to done; agents may comment and self-assign but never move status (violations are detected and reverted); percent complete is done over total must-have tasks.
- No GitHub Issues are auto-created from scope — they stay dev-internal, never in the NGO view (REQ-008/REQ-026); volunteer-added sub-issues join the tree; an accepted scope addition is a volunteer-created linked task (REQ-025 →RM-10).
- Post-completion the tree is read-only with a snapshot preserved in the repo; follow-ups go through a new project (→RM-4).

### Story 6: Project Completion
The NGO already owns everything throughout (single delivery model): the live Lovable app it has chat-edited, plus the bound git repo (two-way synced, in the platform org; the code is the NGO's from the first commit via MIT + two-way sync, with NGO admin access at completion — REQ-008). Because there is no delivery or transfer, completion is **offboarding the volunteer and ai4good's read-only monitoring account** plus bookkeeping — no formal ceremony in v1 (REQ-012). (Depends: REQ-008, REQ-009, REQ-012.)
- The volunteer marks the project done once all must-have (P0) PM tasks are done; open GitHub Issues never block.
- On completion the access change is automated: write access ends; virtual keys terminate and the provider workspace is archived (REQ-009); Linear membership is removed and the final task tree preserved. The NGO removes both the volunteer and ai4good's read-only monitoring account from the Lovable workspace. The NGO decides whether the dev keeps read-only repo access. The project is archived `completed`, and the volunteer earns completion credit (counter +1; a "Shipped first tool" badge on the first completion; no public star rating). There is no GitHub-transfer step — the repo is already the NGO's, to fork or export anytime.
- Remaining fuel goes to the NGO general balance as non-cash credit: no decay clock, no cash refund, no auto-renew; it persists indefinitely and auto-applies at the next funding checkout on any of its projects (no donation flow in v1); nothing is ever silently removed (Promise §7).
- Post-completion the NGO may use GitHub Issues on its repo; ai4good does not surface or fund follow-ups in v1 (→RM-4); new paid work is a new project.
- The completion checklist gate, sign-off/acceptance flow, rejection loop, attribution capture, and post-completion health are deferred (→ RM-62).
