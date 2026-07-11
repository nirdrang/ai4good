## Problem Statement

NGOs run a chronic software deficit (spreadsheets, generic SaaS, ill-fitting donated point-solutions); vendors price for corporate budgets, pro-bono shops are oversubscribed, volunteer one-offs stall without a shared backbone (scope, funding, PM, handoff). AI-augmented developers now ship 5-10x faster than the pre-AI baseline but lack an aggregated channel into social-impact work — a coordination failure, not unwillingness.

**Impact:** NGOs and other mission-driven organizations lose staff hours, miss reporting deadlines, cannot scale (cf. Code for America: 30-60% productivity loss to manual processes); volunteers lack scoped, token-funded, deliverable projects; NGOs spend $1B+/year on partially-fitting SaaS plus multiples in staff time.

**Why now:** (1) AI coding inflection — a single developer ships production software in days, not months; (2) token-metered APIs: per-project dollar budgeting tractable for the first time; (3) GitHub-native norms: free, transparent PM spine; (4) Stripe primitives: a credit ledger feasible for a small team.

---

## Goals & Success Metrics

### Goal 1: Ship Working, Deployed NGO Tools (decided 2026-06-03)
Deployed tools NGOs use, end-to-end (post → discovery → match → build → deploy → handoff), not handed-off repos. Metric: handoffs with verified live deployment (live Lovable app, NGO-owned workspace). North-star: health check answered 30 days post-handoff (tracked, never guaranteed — no SLA per §4). Baseline 0. Target: 25 NGOs with working deployed tools in the first 12 months; ≥60% still-alive at 30 days.

### Goal 2: Volunteer Engagement & Retention
Metrics: active volunteers (1+ committed task/month), repeat-project rate. Baseline 0. Target (month 12): 100 active monthly volunteers; 30% complete a second project within 90 days of their first.

### Goal 3: Blended Sustainability (decided 2026-06-03 — re-pointed from skim-margin)
Validate blended funding (skim+grants+charitable donations) covering costs: Anthropic float, infra, deliberately-manual concierge/admin labor. v1 expected to run net-negative on skim alone; the target is a credible blended path, not skim profitability. Metrics: net contribution + its inputs — fuel throughput, skim, grant/donation intake (org-level; the leftover-fuel donation flow is removed, decision-28). Target: $250k fuel throughput; grant/donor runway covering the projected year-1 net gap.

### Goal 4: Discovery Quality
Validate volunteer-executable Discovery scopes. Metric: % of scoped projects reaching handoff without major scope renegotiation (>1 scope-doc reopen). Target (months 3-12): >70% ship against original scope, at most one minor revision.

### Goal 5: Volunteer Supply Liquidity (decided 2026-06-03 — the #1 launch gate)
Launch concierge-first: pre-recruit a volunteer bench, hand-match the first ~10-15 curated projects before organic browse (REQ-007). Metrics: activation funnel (signup→first-match-consent→first-handoff (→RM-8)) + time-to-first-match per open project — both fed by the concierge match log (REQ-007). Target: pre-launch bench ≥20 volunteers; ≥80% of first-cohort open projects matched within 7 days; signup→handoff activation ≥25%. Unmatched past 7 days → concierge queue (REQ-016), max once per project per 72h (→RM-8).

## User Stories

### Story 1: NGO Posts a Need
An NGO program manager turns a plain-language need into a buildable scope that gets funded and built into a real tool; no technical spec. (Depends: REQ-001, REQ-002, REQ-004, REQ-005.)
- Org-profile signup (name, mission, contact); vetting = concierge onboarding (REQ-002, decision-29/r3). Explicit ToS+Platform-Promise acceptance (limited coordination relationship, open-source by default, fuel = non-cash AI-usage credit, no SLA), recorded for audit, gates project creation.
- The AI Discovery Agent refines a free-text need over 5-10 turns into: scope document; complexity tier (small/medium/large — no dollar estimate in v1, REQ-004); data-sensitivity tier + handling guideline (Tier-2: fixtures-only during build); maintainability fit check ("maintain via Lovable chat"; needs requiring ongoing developer maintenance declined at Discovery, recorded for founder review — decision-23); suggested stack; acceptance criteria.
- Scope editable pre-publish; publish → public listing; email on publish and match.

### Story 2: NGO Funds a Project with Fuel
Card-purchased fuel assigned per project; no platform-wide commitment. (Depends: REQ-001, REQ-006, REQ-009.)
- One-time Stripe Checkout top-ups, no subscription; passive Promise & Disclaimers link — the hard acknowledgment fires once at match acceptance, not per top-up.
- Fuel USD-denominated, displayed gross ($100=$100 fuel); no skim at top-up — the platform share (default 15%) is recognized as AI spend is consumed (REQ-006/REQ-009).
- Real-time per-project ledger (purchases, consumption, balance); failed payments get clear feedback; EU/UK NGOs get valid VAT invoices.

### Story 3: Volunteer Joins and Gets Matched
An AI-augmented developer joins the bench, marks interest on projects, gets concierge-matched from that pool, consents in one click. (Depends: REQ-007, REQ-008.)
- GitHub link mandatory at signup (decision-36); OAuth imports stats; self-declared skills, availability, preferred causes.
- The volunteer browses public listings and marks candidacies; each project gathers interest through its assimilation window before the concierge matches from the pool (decision-36).
- First match consent (first-commitment moment, REQ-007) requires ToS+Platform-Promise: coordination layer only, no obligated outcomes; volunteering, not employment; all work public open-source (MIT); the per-project API key used only for that project; fixtures-only+confidentiality on Tier-2 data; violations risk deactivation + completion-credit forfeiture. Per-account; material text change → one-time re-accept; the disclaimer always precedes any project intro or access.
- v1 matching = concierge (decision-28): admin-created, binding, no NGO approve/decline; one-click volunteer consent; NGO per-match acknowledgment rides the funding screen (→RM-8); consent does NOT trigger kickoff — the project waits for funding (match-to-fund, REQ-006).
- On funding, kickoff fires, no admin ops tasks: repo established by NGO + volunteer via the Lovable setup checklist (Lovable mandatory, decision-23, REQ-021); per-project AI keys (REQ-009); comment thread (REQ-015). No build backlog at kickoff; one seeded bootstrap task — the volunteer authors the project PRD from the Discovery scope (REQ-036, decision-25), raising NGO clarifying questions; an automated scorer measures PRD completion vs Discovery; only a passing score unlocks backlog decomposition (REQ-026; GitHub Issues stay dev-internal, REQ-008). Repo setup + key issuance never wait on it. Starter kit: build guide + pull-based workflow.

### Story 4: Volunteer Builds — Claude Code as the entry point (orchestrating Lovable via MCP)
Claude Code = the single entry point: backend/logic/tests metered against fuel; Lovable orchestrated for the app/UI layer. (Depends: REQ-009, REQ-010, REQ-021, REQ-026, REQ-028.)
- Platform-issued virtual key per volunteer-project pair; the real provider key never leaves the platform (decision-21); standard Claude Code unmodified. Starter Kit + Skill (REQ-028) prime context, wire the Linear rail (REQ-026) + Lovable orchestration.
- Per-request metering deducts from fuel — enforcement structural (virtual keys, caps, inline metering, fuel gate), never polling-based: below 20%, NGO top-up prompt (REQ-024); below 5%, in-app dev warning; at 0, the next request is declined (fuel-suspension notice, both parties notified); top-up restores service, no reactivation step (REQ-009).
- The Skill drives Lovable under per-task Lovable-credit budget caps, audit-trailed; manual driving if Lovable's MCP is down. The NGO owns the Lovable workspace, pays Lovable directly — never from fuel; the volunteer can flag Lovable status (credits low/blocked) to the NGO.
- Project page dual meters: Claude Code fuel gauge + Lovable status (REQ-010); further abuse protections documented-not-built (→RM-9).

### Story 5: Project Management via the Linear-Backed PM Task Tree (REQ-026)
Plain-language hierarchical view; status only from deterministic events (PR merges, self-assignment), never agent self-report; pull-then-complete (pull an item before working on it) **enforced by the Skill (REQ-028)** — every metered request carries attribution context. (Depends: REQ-008, REQ-026, REQ-028.)
- Tree decomposed from the dev-authored PRD post-gate (REQ-036, decision-25): one parent per story, one sub-issue per acceptance criterion; Discovery is the PRD's source, never decomposed directly; automation drafts + pushes, coordinator spot-checks during the pilot.
- The ai4good project page = primary view: "Now working on" strip, task list, activity feed (REQ-010); NGOs never need Linear seats.
- Self-assignment marks in-progress; dev-marked completion drives the PR merge — the only path to done; agents may comment and self-assign but never move status (violations detected + reverted); percent complete = done/total must-have tasks.
- No GitHub Issues auto-created from scope — dev-internal, never in NGO view (REQ-008/REQ-026); volunteer-added sub-issues join the tree; an accepted scope addition = a volunteer-created linked task (REQ-025 →RM-10).
- Post-handoff: tree read-only, snapshot preserved in the repo; follow-ups via a new project (→RM-4).

### Story 6: Handoff and Post-Handoff (attribution capture in v1 — decision-22)
The NGO already owns everything by handoff (single delivery model — decision-23; founder review 2026-07-09): live Lovable app (chat-edited by the NGO throughout) + bound git repo (two-way synced, platform org, NGO admin from creation); handoff = **offboarding the volunteer** + bookkeeping. (Depends: REQ-008, REQ-009, REQ-012.)
- The volunteer marks "Ready for Handoff" once all must-have PM tasks are done (open GitHub Issues never block); automated checklist: README, runbook, deploy instructions, ≥1 passing CI run, license file (MIT default) — completion confirmation, not delivery gate.
- The NGO reviews the deployed tool (staging or live URL), signs off "Handoff Accepted": completion summary + the REQ-035 attribution step (optional testimonial + 3 required credit-framed dimensions, ~30 seconds; decision-22) (→RM-11); v1 reputation = completion credit + privately-held attribution.
- On acceptance, the access change is automated (decision-35): write access ends; virtual keys terminate (REQ-009); Linear membership removed; volunteer removed from the Lovable workspace via the platform's build-phase seat; the platform then removes itself ("last one out"). The NGO decides if the dev keeps read-only repo access. Project archived handed-off; the volunteer earns completion credit (counter +1; "Shipped first tool" badge on first handoff; no public star rating). No GitHub-transfer step — the repo is already the NGO's; fork/export anytime.
- Remaining fuel → NGO general balance as non-cash credit: no decay clock, no cash refund, no auto-renew; persists indefinitely, auto-applies at the next funding checkout on any of its projects (decision-28; no donation flow in v1); nothing ever silently removed (Promise §7).
- Post-handoff the NGO may use GitHub Issues on its repo; ai4good does not surface or fund follow-ups in v1 (→RM-4); new paid work = a new project.
