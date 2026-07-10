## Problem Statement

NGOs run a chronic software deficit (spreadsheets, generic SaaS, ill-fitting donated point-solutions); vendors price for corporate budgets, pro-bono shops are oversubscribed, volunteer one-offs stall without a shared backbone (scope, funding, PM, handoff). AI-augmented developers now ship 5-10x the pre-AI baseline but lack an aggregated channel into social-impact work — coordination failure, not willingness.

**Impact:** NGOs lose staff hours, miss reporting deadlines, cannot scale (cf. Code for America: 30-60% productivity loss to manual processes in under-resourced civic orgs); volunteers lack scoped, token-funded, deliverable projects; NGOs spend $1B+/year on partially-fitting SaaS plus multiples in staff time.

**Why now:** (1) AI coding inflection — production software in days, not months; (2) token-metered APIs: per-project dollar budgeting; (3) GitHub-native norms: free, transparent PM spine; (4) Stripe primitives: credit ledger feasible for a small team.

---

## Goals & Success Metrics

### Goal 1: Ship Working, Deployed NGO Tools (decided 2026-06-03)
Deployed tools NGOs use, end-to-end (post→discovery→match→build→deploy→handoff), not handed-off repos. Metric: handoffs with verified live deployment (live Lovable app, NGO-owned workspace). North-star: health check answered 30 days post-handoff (tracked, never guaranteed — no SLA per §4). Baseline 0. Target: 25 NGOs with working deployed tools in first 12 months; ≥60% still-alive at 30 days.

### Goal 2: Volunteer Engagement & Retention
Metrics: active volunteers (1+ committed task/month), repeat-project rate. Baseline 0. Target (month 12): 100 active monthly volunteers; 30% complete a second project within 90 days of their first.

### Goal 3: Blended Sustainability (decided 2026-06-03 — re-pointed from skim-margin)
Validate blended funding (skim+grants+donations) covering costs: Anthropic float, infra, deliberately-manual concierge/admin labor. v1 net-negative on skim alone; target credible blended path, not skim profitability. Metrics: net contribution and its inputs — fuel throughput, skim, grant/donation intake (org-level, not leftover fuel; that donation flow removed from v1, decision-28). Target: $250k fuel throughput; grant/donor runway covering the projected year-1 net gap.

### Goal 4: Discovery Quality
Validate volunteer-executable Discovery scopes. Metric: % reaching handoff without major scope renegotiation (>1 scope-doc reopen). Target (months 3-12): >70% ship against original scope, at most one minor revision.

### Goal 5: Volunteer Supply Liquidity (decided 2026-06-03 — the #1 launch gate)
Launch concierge-first: pre-recruit a volunteer bench, hand-match the first ~10-15 curated projects before organic browse (REQ-007). Metrics: activation funnel (signup→first-match-consent→first-handoff (→RM-8)) and time-to-first-match per open project (concierge match log, REQ-007). Target: pre-launch bench ≥20 volunteers; ≥80% of first-cohort open projects matched within 7 days; signup→handoff activation ≥25%. Unmatched past 7 days → concierge queue for hand-matching (REQ-016), max once per project per 72h (→RM-8).

## User Stories

### Story 1: NGO Posts a Need
Plain-language need → funded, buildable scope; no technical spec. (Depends: REQ-001, REQ-002, REQ-004, REQ-005.)
- Org-profile signup (name, mission, contact); vetting = concierge onboarding (REQ-002, decision-29/r3). Explicit ToS+Platform-Promise acceptance (limited coordination relationship, open-source by default, fuel = non-cash AI-usage credit, no SLA), recorded for audit, gates project creation.
- AI Discovery Agent refines a free-text Project Need over 5-10 turns into: scope document; complexity tier (small/medium/large — no dollar estimate in v1, REQ-004); data-sensitivity tier + handling guideline (Tier-2: fixtures-only during build); maintainability fit check ("maintain via Lovable chat"; ongoing-maintenance needs declined at Discovery, recorded for founder review, decision-23); suggested stack; acceptance criteria.
- Scope editable pre-publish; publish → public marketplace listing; email on publish and match.

### Story 2: NGO Funds a Project with Fuel
Card-purchased fuel assigned per project; no platform-wide commitment. (Depends: REQ-001, REQ-006, REQ-009.)
- One-time Stripe Checkout top-ups, no subscription; passive Platform Promise & Disclaimers link — hard acknowledgment once at match acceptance, not per top-up.
- Fuel USD-denominated, displayed gross ($100=$100 fuel); no skim at top-up — platform share (default 15%) recognized as AI spend is consumed (REQ-006/REQ-009).
- Real-time per-project fuel ledger (purchases, consumption, balance); failed payments: clear feedback; EU/UK NGOs get valid VAT invoices.

### Story 3: Volunteer Joins and Gets Matched
Developer joins the bench, gets concierge-matched, consents in one click. (Depends: REQ-007, REQ-008.)
- GitHub OAuth imports stats; self-declared skills, availability, causes.
- First match consent (first-commitment moment, REQ-007) requires ToS+Platform-Promise: coordination layer only, no obligated outcomes; volunteering, not employment; all work public open-source (MIT — v1 public-only); per-project API key used only for that project; fixtures-only+confidentiality on Tier-2 data; violations risk deactivation and completion-credit forfeiture. Per-account; material text change → one-time re-accept; disclaimer always precedes any project intro or access.
- v1 matching = concierge (decision-28): admin-created, binding, no NGO approve/decline; one-click volunteer consent; NGO per-match acknowledgment rides the funding screen (→RM-8); consent does NOT trigger kickoff — project waits for funding (match-to-fund, REQ-006).
- On funding, kickoff fires, no admin ops tasks: repo via Lovable setup checklist (Lovable mandatory, decision-23, REQ-021); per-project AI keys (REQ-009); comment thread (REQ-015). No build backlog at kickoff; one seeded bootstrap task — volunteer authors project PRD from Discovery scope (REQ-036, decision-25), raising NGO clarifying questions; automated scorer measures PRD completion vs Discovery; only a passing score unlocks backlog decomposition (REQ-026; GitHub Issues stay dev-internal, REQ-008). Repo setup and key issuance never wait on it. Starter kit: build guide + pull-based workflow.

### Story 4: Volunteer Builds — Claude Code as the entry point (orchestrating Lovable via MCP)
Claude Code = single entry point: backend/logic/tests metered against project fuel; Lovable orchestrated for the app/UI layer. (Depends: REQ-009, REQ-010, REQ-021, REQ-026, REQ-028.)
- Platform-issued virtual key per volunteer-project pair; real provider key never leaves the platform (decision-21); standard Claude Code unmodified. Starter Kit + Claude Code Skill (REQ-028) prime context, wire Linear rail (REQ-026) and Lovable orchestration.
- Per-request metering deducts from fuel: below 20%, NGO top-up prompt (REQ-024); below 5%, in-app dev warning; at 0, next request declined (fuel-suspension notice, both parties notified); top-up restores service, no reactivation step (REQ-009).
- Skill drives Lovable under per-task Lovable-credit budget caps, audit-trailed; manual driving if Lovable's MCP is down. NGO owns the Lovable workspace, pays Lovable directly — never from fuel; volunteer can flag Lovable status (credits low/blocked) to the NGO.
- Project page dual meters: Claude Code fuel gauge + Lovable status (REQ-010); further abuse protections documented-not-built in v1 (→RM-9).

### Story 5: Project Management via the Linear-Backed PM Task Tree (REQ-026)
Plain-language hierarchical view; status only from deterministic events (PR merges, self-assignment), never agent self-report; pull-then-complete discipline **enforced by the Claude Code Skill (REQ-028)** — every metered request carries attribution context. (Depends: REQ-008, REQ-026, REQ-028.)
- Tree decomposed from the dev-authored PRD post-gate (REQ-036, decision-25): one parent per story, one sub-issue per acceptance criterion; Discovery is the PRD's source, never decomposed directly; automation drafts and pushes, coordinator spot-checks during the pilot.
- ai4good project page = primary view: "Now working on" strip, task list, activity feed (REQ-010); NGOs never need Linear seats.
- Self-assignment marks in-progress; dev-marked completion drives the PR merge — the only path to done; agents may comment and self-assign but never move status (violations detected and reverted); percent complete = done/total must-have tasks.
- No GitHub Issues auto-created from scope — dev-internal, never in NGO view (REQ-008/REQ-026); volunteer-added sub-issues join the tree; accepted scope addition = volunteer-created linked task (REQ-025 v1 protocol →RM-10).
- Post-handoff: tree read-only, snapshot preserved in the repo; follow-ups via a new project (→RM-4).

### Story 6: Handoff and Post-Handoff (attribution capture in v1 — decision-22)
NGO already owns everything by handoff (single delivery model — decision-23; founder review 2026-07-09): live Lovable app (chat-edited throughout) + bound git repo (two-way synced, platform org, NGO admin from creation); handoff = **offboarding the volunteer (remove dev or drop to read-only)** + bookkeeping. (Depends: REQ-008, REQ-009, REQ-012.)
- "Ready for Handoff" once all must-have PM tasks done (open GitHub Issues never block — dev-internal); automated checklist confirms completion quality: README, runbook, deploy instructions, ≥1 passing CI run, license file (MIT default) — completion confirmation, not delivery gate.
- NGO reviews the deployed tool (staging or live URL), signs off "Handoff Accepted": completion summary + REQ-035 attribution step (optional testimonial + 3 required credit-framed dimensions, ~30 seconds; decision-22) (→RM-11); v1 volunteer reputation = completion credit + privately-held attribution.
- On acceptance, access change automated (decision-35): write access ends; virtual keys terminate (REQ-009); Linear membership removed; volunteer removed from Lovable workspace via the platform's build-phase seat; platform then removes itself ("last one out": NGO alone, zero platform access). NGO decides if dev keeps read-only repo access. Project archived handed-off; volunteer earns completion credit (counter +1; "Shipped first tool" badge on first handoff; no public star rating). No GitHub-transfer step (repo already the NGO's; fork/export anytime).
- Remaining fuel → NGO general balance as non-cash credit: no decay clock, no cash refund, no auto-renew; persists indefinitely, auto-applies at next funding checkout on any of its projects (decision-28; no donation flow in v1); nothing ever silently removed (Platform Promise §7).
- Post-handoff NGO may use GitHub Issues on its repo; ai4good does not surface or fund follow-ups in v1 (→RM-4); new paid work = post a new project.
