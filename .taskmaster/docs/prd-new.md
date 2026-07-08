# PRD: ai4good — AI-Fueled Marketplace for NGO Tools (lean)

> Distilled product-requirements doc — implementation/architecture detail lives in the design docs + the Linear task tree.

## Executive Summary

NGOs need custom internal tools (volunteer scheduling, beneficiary CRMs, grant trackers, impact dashboards) but cannot afford bespoke development; AI-augmented developers can now ship such tools at a fraction of historical cost. **ai4good is a nonprofit-operated, open-source marketplace that turns NGO software needs into volunteer-built, AI-powered tools the NGO can run and keep evolving itself.** A volunteer builds the first version with Claude Code orchestrating Lovable (the UI/app layer); the NGO ends up with a deployed, running app it evolves via chat — fixing bugs and adding features without a developer. Build-phase AI compute is funded by metered Stripe credits ("fuel"); the platform recognizes a configurable skim (default ~15%) at consumption time, not at pay-in. Fuel is prepaid, fully-consumable, non-cash service credit. As a nonprofit, ai4good runs on blended revenue — skim + grants + donations, not skim alone. Target: 25 NGOs with a working deployed tool and 100 active volunteer developers in the first 12 months.

ai4good is a coordination layer, not a software vendor. The relationship is governed by a plain-language Terms of Service — no warranties, no SLA, no guaranteed deliverable — warm in tone, real in force. All work is open-source by default; fuel funds AI usage, not outcomes. This framing shapes every requirement that follows.

---

## Platform Promise & Disclaimers

ai4good is a nonprofit coordination layer: it connects NGO needs with volunteer developers, funds build-phase AI compute, helps the NGO end up with a self-maintainable deployed tool, and brings open-source-grade transparency. It is explicitly not a service provider with delivery commitments — the operating principle behind the whole design (free Discovery, fuel-on-match, open-source-by-default, no public ratings, tip-not-pay).

**Legal posture (decided 2026-06-03; counsel review postponed post-MVP — founder verdict, flow #17 2026-07-08):** a plain-language ToS carries the protective terms (no warranty, no SLA, limitation of liability) — the MVP pilot runs on the un-reviewed plain-language draft (risk accepted; counsel review, the volunteer-classification opinion, and the fiscal-sponsor agreement are post-MVP items), since such terms are only enforceable inside a contract. ai4good asserts a limited, bona-fide coordination relationship — not "no contract exists." Volunteers donate time to charitable work; they are not employees, contractors, or subcontractors of ai4good or the NGO.

### 1. A limited coordination relationship — no delivery obligation
ai4good connects the parties and funds AI compute; no party is obligated to deliver any specific outcome. Volunteers donate their time.

### 2. Work is fully open-source (public MIT)
Every project repo is public MIT from the first commit — viewable, forkable, re-usable; the volunteer's work becomes a public portfolio piece. **v1 is public-only (decision-27):** there is no private-repo option — a need that genuinely requires a closed/confidential codebase is declined at Discovery (private repos are a future feature). This is separate from data sensitivity: a tool that handles sensitive *data* is still served — its code is public but built against synthetic fixtures, and real Tier-2 data is connected by the NGO itself after handoff and never enters the repo (REQ-004). Never allowed: commercial / closed-source-for-resale work, surveillance tooling, spam infrastructure, illegal use, acceptable-use violations.

### 3. Fuel funds AI usage on this project — not deliverables
Fuel pays for AI compute: the NGO's Discovery scoping past the free credit pool (decision-8) and the volunteer's build work. Lovable credits are the second, separate funding path — paid by the NGO directly from its own Lovable workspace, never through fuel (REQ-021). It does NOT buy a working tool, a fixed scope, or an outcome. Fuel may be spent in full — by NGO or volunteer — without a viable deliverable; this is an irreducible risk of AI-assisted development that NGOs assume knowingly.

### 4. No SLA, no completion guarantee
No project is guaranteed to reach handoff: volunteers may ghost (inactivity → auto-release + rematch, REQ-027), AI output may consume fuel without progress, scopes may prove infeasible, NGOs may decline handoffs. The platform's job is to make these risks transparent and bounded — per-project fuel budgets cap the financial downside; inactivity and handoff flows surface stalls early. The backbone of that transparency is attribution: the platform always strives to attribute every token consumed to a specific work item (REQ-034), so even when the outcome disappoints, the NGO can see exactly what its fuel was spent attempting.

### 5. What ai4good does promise
- Bounded financial risk — NGO-chosen per-project fuel budgets; no auto-charge beyond commitment.
- Transparent volunteer track record — completion credit recorded from day one (public display + badges arrive in v1.5 — decision-29/r2; every repo is public MIT, so the working portfolio exists on GitHub from the first commit). Never stars.
- Open-source IP norms — forkable forever, no lock-in.
- NGO-side vetting gating (REQ-002 — founder-vetted in v1) against fraudulent and abusive demand.
- Escalation paths when work stalls — messaging (REQ-015), notifications (REQ-016); post-handoff issue surfacing (REQ-017) is v2 — in v1 NGOs re-engage by posting a new project.
- A genuine attempt to ship, by motivated volunteers with AI leverage, on real NGO problems.

### 6. Progress over promises (stepwise funding by design)
The platform steers NGOs toward small, frequent funding steps rather than large upfront commitments. Each fuel run-out is a progress-review moment: the NGO looks at visible work — commits, completed PM tasks, the volunteer's account of what's next — and decides whether to top up. Trust is built through demonstrated progress, not large prepayments; volunteers get smaller per-stage stakes and clearer feedback loops. Low-fuel blockers (REQ-024) make stepwise funding the path of least resistance. The two progress signals: the PM task view (REQ-026) and git commit cadence (REQ-010).

### 7. Fuel is non-cash, project-scoped credit — it stays yours and working (decided 2026-06-03)
Fuel can be funded from draft onward (decision-8) — typically at match acceptance, or earlier to continue Discovery past the free pool. It is project-scoped: unused fuel stays on the project and survives a volunteer change (the next volunteer picks up the remaining balance — REQ-027). Fuel is not cash-refundable; once a project is genuinely finished or abandoned, leftover credit moves to the NGO's general balance as redeployable credit — and redeployable is real: the balance auto-applies at any of the NGO's funding checkouts (Discovery top-up, match funding; it can satisfy the $50 minimum, with any remainder charged to card). No donation flow in v1 (decision-28 — removed entirely). No cash-out or withdrawal — deliberately removing the only money-out path eliminates laundering risk and the ACH/AML/KYC machinery. Nothing is ever silently removed, and all of this is stated plainly on the funding screen: "Fuel powers AI work and is not cash-refundable; unused fuel stays as credit for your projects."

### 8. Minimize admin intervention
Target: under 10 minutes of admin time per active project per week at steady state, so growth is not bottlenecked on human reviewers. Automation first — clear cases are auto-handled; only ambiguous ones reach an admin. What must stay manual is batched, never on a kickoff's critical path, with the expectation set upfront (e.g. NGO verification reviewed in twice-daily batches). AI keys are not an example — virtual keys mint automatically at kickoff (decision-21), no ops task, no wait. Automated spend-anomaly detection is v1.5 (decision-14); v1 bounds loss with deterministic caps plus daily human review. Lovable setup is volunteer-driven, not an admin task (REQ-021). NGO actions — fuel top-up, key rotation — are self-serve; vetting is one audited admin action during concierge onboarding (decision-29/r3; self-serve verification upload, KYC submission, and auto-top-up controls are v1.5). Money reconciliation is fully automatic — corrections auto-conform to provider truth (decision-31); only undecidable drift surfaces for visibility. Features requiring routine admin involvement are weighed against this principle before being added. Standing review: every manual procedure in this document is inventoried and must justify itself against the target — anything automatable gets automated, and the inventory is re-audited whenever a manual step is added.

### 9. Acknowledgment cadence (Option D)
Explicit, audit-logged acknowledgment at two NGO moments plus one volunteer moment:
- **NGO at signup** — full ToS + Promise (all clauses); required before project creation.
- **NGO at first funding on a project and at every match acceptance** — fuel ≠ deliverable, no SLA, fuel-is-non-cash-credit, and data-responsibility for the project's sensitivity tier. First per-project funding (whether a Discovery top-up or a match-acceptance top-up) names the project and its cap — "money commits to this project." Match acceptance names the volunteer — "volunteer + money + scope converge." Both are real-commitment moments; each gets its own acknowledgment, never reused for the other.
- **Volunteer at first match consent (decision-28 — was first application)** — one combined disclaimer, a property of the volunteer account: limited coordination relationship, open-source-by-default, per-project key use, and a standing data-confidentiality undertaking ("when a project handles real data I will work only with the NGO's synthetic/anonymized fixtures and keep what I see confidential"). Sworn once, binding before the volunteer ever touches a project that handles sensitive data; not re-prompted unless the text materially changes.

Later top-ups on the same project show a passive footer link to the full Promise, not a hard checkbox. Every acknowledgment is recorded with timestamp, IP, and text version; a material text change re-triggers acknowledgment.

### 10. The deliverable: a tool the NGO can run and keep evolving (decided 2026-06-03; single model per decision-23)
The deliverable is not "a repo" — it is a deployed, running tool the non-technical NGO keeps evolving itself. **ai4good has exactly one delivery model (decision-23, 2026-07-07 — supersedes decision-19's deferred second track):** the durable home is an AI app-builder (Lovable in v1); the NGO evolves the live app via chat after handoff; the volunteer builds the first version through Claude Code, which orchestrates Lovable. Discovery (REQ-004) still checks fit — a need that requires ongoing developer maintenance (custom logic / integrations no non-developer can evolve via chat) by construction cannot satisfy "the NGO evolves it itself," and is **declined at Discovery** with plain messaging; declines are recorded for founder review. There is no second track and no waitlist.

The honest promise: the NGO owns the code outright (portable, open-source, no lock-in) and can self-maintain via chat for roughly the AI-builder's subscription (~$25/mo) as long as they choose to pay; if they stop, they keep a deployable app but lose hands-free chat maintenance. Set as an expectation at kickoff, with a spend cap so metered edit costs never blindside a non-technical owner.

This section is not legalese. It is the actual operating model.

---

## Problem Statement

NGOs run on a chronic software deficit — spreadsheets, generic SaaS, and donated point-solutions that rarely fit their workflows. Commercial vendors price for corporate budgets, pro-bono dev shops are oversubscribed, and one-off volunteer projects stall for lack of a shared backbone: scope definition, funding model, project management, handoff. On the supply side, AI-augmented developers now produce working software 5-10x faster than the pre-AI baseline but have no aggregated channel into social-impact work. The mismatch is a coordination failure, not a willingness failure.

**Impact:** NGOs and other mission-driven organizations lose staff hours to manual workarounds, miss reporting deadlines, and cannot scale operations (cf. Code for America: 30-60% productivity loss to manual processes in under-resourced civic orgs). Volunteers cannot find projects with clear scope, funded AI tokens, and a path to delivering something useful. NGOs spend $1B+/year on partially-fitting SaaS and lose multiples of that in staff time; without an aggregator, AI productivity gains keep missing the social-impact sector.

**Why now:** (1) AI coding inflection — a single developer can ship production software in days, not months; (2) token-metered APIs make per-project dollar budgeting tractable for the first time; (3) mature GitHub-native norms provide a free, transparent project-management spine; (4) Stripe billing primitives make a credit-ledger product feasible for a small team.

---

## Goals & Success Metrics

### Goal 1: Ship Working, Deployed NGO Tools (decided 2026-06-03)
Deployed, running tools NGOs actually use — not handed-off repos; end-to-end post → discovery → match → build → deploy → handoff. Primary metric: projects reaching handoff with a verified live deployment (live Lovable app + workspace ownership transferred to the NGO). North-star: "still alive at 30 days" — the deployed app responds to a health check 30 days post-handoff (tracked, not guaranteed — no SLA per §4). Baseline 0. Target: 25 NGOs with a working deployed tool in the first 12 months; ≥60% still-alive at 30 days.

### Goal 2: Volunteer Engagement & Retention
A stable supply of volunteers who return for multiple projects. Metrics: active volunteers (1+ committed task per month) and repeat-project rate. Baseline 0. Target (month 12): 100 active monthly volunteers; 30% complete a second project within 90 days of their first.

### Goal 3: Blended Sustainability (decided 2026-06-03 — re-pointed from skim-margin)
Validate the blended funding model — earned skim + grants + donations covering the cost base (Anthropic float + infra + the deliberately-manual concierge/admin labor). v1 is expected net-negative on skim alone; the goal is a credible path to blended sustainability, not skim profitability. Metrics: net contribution plus its inputs (fuel throughput, skim, grant/donation intake — org-level grants and charitable donations, not leftover fuel; the leftover-fuel donation flow is removed from v1, decision-28). Target: $250k fuel throughput; grant/donor runway covering the projected year-1 net gap.

### Goal 4: Discovery Quality
Validate that AI Discovery scopes are executable by volunteers. Metric: percent of scoped projects reaching handoff without major scope renegotiation (more than one reopen of the scope doc). Target (months 3-12): >70% of projects ship against original scope with at most one minor revision.

### Goal 5: Volunteer Supply Liquidity (decided 2026-06-03 — the #1 launch gate)
A two-sided marketplace dies on the side with no liquidity — for ai4good, supply. Launch is concierge-first: pre-recruit a volunteer bench and hand-match the first ~10-15 curated projects before opening organic browse (REQ-007). Metrics: volunteer activation funnel (signup → first match consent → first handoff; "first apply" joins the funnel with organic browse in v1.5) and time-to-first-match per open project — both fed by the concierge match log (REQ-007). Target: ≥20-volunteer pre-launch bench; ≥80% of the first cohort's open projects matched within 7 days; signup→handoff activation ≥25%. Projects unmatched past 7 days surface to the concierge queue for hand-matching (REQ-016), at most once per project per 72h (volunteer-facing featuring arrives with organic browse).

## User Stories

### Story 1: NGO Posts a Need
An NGO program manager describes a software need in plain language and has it turned into a buildable scope — a real tool funded and built without writing a technical spec. (Depends: REQ-001, REQ-002, REQ-004, REQ-005.)
- NGO signs up with an org profile (name, mission, contact) — vetting happens in concierge onboarding (REQ-002, decision-29/r3) — and must explicitly accept the ToS + Platform Promise (limited coordination relationship, work open-source by default, fuel = non-cash credit funding AI usage, no SLA); acceptance is recorded for audit and gates project creation.
- NGO starts a Project Need from a free-text description; the AI Discovery Agent refines it over a 5-10-turn structured conversation into: a scope document, a qualitative complexity tier (small/medium/large — no dollar estimate in v1, REQ-004), the data-sensitivity tier + its handling guideline (Tier-2 = fixtures-only during build), the maintainability fit check ("you maintain it via chat in Lovable"; needs requiring ongoing developer maintenance are declined at Discovery and recorded for founder review — decision-23), a suggested stack, and acceptance criteria.
- NGO can edit the scope before publishing; publishing lists the project on the public marketplace. NGO is emailed on publish and on volunteer match.

### Story 2: NGO Funds a Project with Fuel
An NGO purchases fuel credits by card and assigns them to a specific project — per-tool budgeting, no platform-wide commitment. (Depends: REQ-001, REQ-006, REQ-009.)
- One-time top-ups via Stripe Checkout; no subscription. Checkout carries a passive reminder link to the Platform Promise & Disclaimers — the hard acknowledgment happens once at match acceptance, not per top-up.
- Fuel is USD-denominated and displayed gross: $100 paid shows as $100 of fuel. No skim is taken at top-up; the platform share (default 15%) is recognized as AI spend is consumed (REQ-006/REQ-009).
- NGO sees a real-time per-project fuel ledger (purchases, consumption, balance); failed payments surface clear feedback; EU/UK NGOs receive a valid VAT invoice.

### Story 3: Volunteer Joins and Gets Matched
An AI-augmented developer joins the bench, gets concierge-matched to a project with clear scope, and consents with one click. (Depends: REQ-007, REQ-008.)
- Sign-up via GitHub OAuth imports GitHub stats; volunteer self-declares skills, time availability, and preferred causes.
- At first match consent (the first-commitment moment, REQ-007), the volunteer must accept the ToS + Platform Promise clauses: coordination layer only — no obligated outcomes; volunteering, not employment; all work public open-source (MIT — v1 is public-only); each project's API key used only for that project's work; fixtures-only plus confidentiality on Tier-2 data; violations risk account deactivation and forfeiture of completion credit. Acceptance is per account; a material text change forces a one-time re-accept. The disclaimer always precedes any project intro or access.
- v1 matching is concierge (decision-28): the admin creates the match — binding, no NGO approve/decline; the volunteer consents with one click; the NGO's per-match acknowledgment rides the funding screen. Self-serve browse + apply is v1.5 (gate: concierge cohort proven). A consented match does NOT trigger kickoff — the project waits until the NGO funds it (match-to-fund, REQ-006).
- On funding, kickoff fires with no admin ops tasks: NGO + volunteer land the repo via the Lovable setup checklist (Lovable is mandatory — decision-23, REQ-021); per-project AI keys are issued (REQ-009); the project comment thread opens (REQ-015). The build backlog is NOT created at kickoff: the workspace is seeded with one bootstrap task — the volunteer authors the project PRD from the Discovery scope (REQ-036, decision-25), raising clarifying questions to the NGO as needed; an automated scorer measures the PRD's completion against Discovery, and only a passing score lets the build backlog be decomposed from that PRD (REQ-026; GitHub Issues stay dev-internal, REQ-008). Repo setup and key issuance never wait on it. Volunteer receives a starter kit: build guide + pull-based task workflow.

### Story 4: Volunteer Builds — Claude Code as the entry point (orchestrating Lovable via MCP)
The assigned volunteer uses Claude Code as the single entry point — backend/logic/tests directly, metered against project fuel, and orchestrating Lovable for the app/UI layer — one pane of glass with ai4good metering and enforcement in the loop. (Depends: REQ-009, REQ-010, REQ-021, REQ-026, REQ-028.)
- Each volunteer-project pair holds a platform-issued virtual key; the real provider key never leaves the platform (decision-21). Standard Claude Code works unmodified. The Starter Kit + ai4good Claude Code Skill (REQ-028) prime project context, wire the Linear task rail (REQ-026), and set up the Lovable orchestration.
- AI usage is metered per request and deducted from project fuel. Below 20% fuel the NGO is prompted to top up (REQ-024); below 5% dev sessions get an in-app warning; at 0 the next request is declined with a fuel-suspension notice and both parties are notified. A top-up restores service with no reactivation step — enforcement is structural, not polling-based (REQ-009).
- The Skill drives Lovable under a per-task Lovable-credit budget cap with an audit trail, with a manual fallback if Lovable's MCP is down. The NGO owns the Lovable workspace (its durable post-handoff home) and pays Lovable directly — never from fuel. Volunteer can flag Lovable status (credits low / blocked) to escalate to the NGO.
- Project page shows dual meters: Claude Code fuel gauge + Lovable status (REQ-010). Abuse protections beyond virtual keys, caps, inline metering, and the fuel gate are documented-not-built in v1 (REQ-009).

### Story 5: Project Management via the Linear-Backed PM Task Tree (REQ-026)
NGO admins and volunteers track tasks and progress in a plain-language hierarchical view whose status comes from deterministic events (PR merges, self-assignment) — never an agent's self-reported narrative. NGOs get progress they can trust without reading code. The working discipline is pull-then-complete, and **the Claude Code Skill (REQ-028) enforces it**: the dev pulls an item before working on it — so every metered request carries attribution context — and the dev explicitly marks completion, which drives the merge that flips status. (Depends: REQ-008, REQ-026, REQ-028.)
- The build tree is decomposed from the dev-authored project PRD after it clears the completion gate (REQ-036, decision-25) — one parent per story, one sub-issue per acceptance criterion. Discovery is the PRD's source, never decomposed directly. Decomposition from a gated PRD is drafted and pushed by automation; the coordinator spot-checks during the pilot.
- The ai4good project page is the primary view — "Now working on" strip, hierarchical task list, activity feed (REQ-010). NGOs never need Linear seats.
- Status is deterministic: self-assignment marks in-progress (the commitment signal — the dev's pull); the dev marks work complete, and that act drives the PR merge which is the only path to done; agents may comment and self-assign but never move status (violations are detected and reverted). Percent complete = done / total of the must-have tasks.
- No GitHub Issues are auto-created from scope; they remain dev-internal and never appear in the NGO view (REQ-008/REQ-026). Volunteer-added sub-issues join the tree; Change-Request work (REQ-025) groups under a "Change Request: [title]" parent.
- After handoff the tree becomes read-only, with a snapshot preserved in the repo; follow-up work re-engages via a new project (REQ-017 is v2).

### Story 6: Handoff and Post-Handoff (tips deferred to v1.5; attribution capture in v1 — decision-22)
The NGO receives the completed open-source repo with deployment instructions and a runbook, and can operate and extend the tool without depending on any specific volunteer. (Depends: REQ-008, REQ-009, REQ-012.)
- Volunteer marks "Ready for Handoff" once all must-have PM tasks are done (open GitHub Issues never block — dev-internal); an automated checklist then gates handoff: README, runbook, deploy instructions, at least one passing CI run, license file (MIT default).
- NGO reviews the deployed tool (staging or live URL) and signs off via "Handoff Accepted". Sign-off shows a completion summary and includes the REQ-035 attribution step (optional testimonial + 3 required credit-framed dimensions, ~30 seconds — decision-22). Tips are deferred to v1.5; v1 volunteer reputation = completion credit + privately-held attribution.
- On acceptance: the project is archived as handed off; the volunteer earns a completion credit (counter +1, "Shipped first tool" badge on first handoff; no public star rating). No GitHub-transfer step — the repo stays in the platform org permanently (NGO admin holds admin access; ownership is already real via MIT + Lovable's two-way sync — fork or export anytime).
- Remaining fuel is released to the NGO's general balance as non-cash credit — no decay clock, no cash refund, no auto-renew. It persists indefinitely and auto-applies at the NGO's next funding checkout on any of its projects (decision-28; no donation flow in v1). Nothing is ever silently removed (Platform Promise §7).
- Post-handoff the NGO may use GitHub Issues on its repo, but ai4good does not surface or fund follow-ups in v1 (REQ-017 → v2); new paid work = post a new project.

#### REQ-001: User Authentication & Org Membership

Two-layer authorization: every account has one global type — NGO, volunteer, or platform admin — and NGO accounts additionally carry a per-NGO role (admin or member). "NGO admin" = an NGO account with the admin role in that NGO. NGO users may belong to multiple NGOs; volunteers are always individual accounts.

- Email/password, GitHub OAuth, and Google OAuth sign-in. GitHub link is required at first match consent (decision-28); linking runs the volunteer GitHub onboarding (REQ-007).
- **Single-seat NGO in v1 (decision-28):** one NGO = one account — the org contact who signed up performs every NGO-side action (funding, acknowledgments, scope edits, handoff sign-off). Teammate invites, per-NGO roles, and multi-NGO membership are v1.5 (the two-layer authorization model stays in the schema so v1.5 adds rows, not migrations). Guards (codex-required, all cheap): the acknowledgment moments capture name + title + an explicit authority attestation (authorized to bind the NGO, fund non-refundable fuel, accept no-SLA terms, approve handoff); org-controlled email preferred and shared credentials prohibited in ToS/UI copy (acknowledgments are per named human); an audited platform-admin contact-transfer/recovery action (out-of-band verification → move NGO ownership to a new account, deactivate the old, preserve history); one non-login secondary escalation contact captured at concierge onboarding.
- **Single-dev projects in v1 (founder extension, decision-28):** exactly one assigned volunteer per project — a single dev, never a team; no collaborator seats, no co-volunteers. Volunteer teams are post-v1. (OD-1's "peer volunteer" reviewer option refers to a reviewer from the bench, not a second project member.)
- NGO data is visible only to its account and assigned volunteer.
- Password reset, email verification, and session management provided.
- Accounts carry a lifecycle state (active / deactivated) that gates every write (see REQ-007 AUP enforcement; a distinct suspended state arrives with the v1.5 suspension machinery).

Dependencies: none.

---

#### REQ-002: NGO Organization Profile + Founder Vetting (verification machinery deferred to v1.5 — decision-29/r3)

NGOs sign up (email-verified) and complete an org profile. v1 trust is the founder's hand, recorded properly: the self-serve verification pipeline (doc upload UI, pending-review queue, document viewer, public badge) is deferred to v1.5 — vetting already happens in concierge onboarding, where the founder talks to every pilot NGO before admitting it. Two trust tiers in v1; the KYC tier stays v1.5.

1. **Unverified** — email-verified account (the bot floor for any Discovery message). Can draft projects and run Discovery within a 10-credit/day free allowance; when the day's credits run out, can fund the project's fuel to continue now or wait for tomorrow's refill. Cannot publish to volunteers.
2. **Vetted** — set by ONE audited admin action during concierge onboarding. Daily free allowance rises to 30/day (the 3× reward). Can publish and fund fuel. Default tier for admitted pilot NGOs.

- NGO admin can create/edit the org profile (name, mission, country, website, logo).
- Email verification is required before any Discovery message; the composer is disabled with a verify CTA until confirmed. Vetting remains the publish wall, not the Discovery wall (decision-8).
- **The vetted action is audited (codex-required):** vetted_by, vetted_at, NGO legal/display name, public reference link, contact name + title + authority attestation (decision-28/s2), evidence type, vetting note; an unvet/revoke action exists. Marking vetted/unvetted emits the verification-outcome notification (REQ-016) through the normal event path — the NGO learns publish is unlocked.
- **Evidence rule (PII-minimizing):** prefer public evidence — registry entry, website, EIN lookup. If a registration document must be requested (by email), only its metadata is recorded in-platform and the copy is deleted after vetting. No sensitive personal identity documents in v1.
- **No public "verified" claim in v1** — the flag is internal (or displayed as "founder-vetted"); a document-verified badge returns with the v1.5 pipeline. Nothing implies a document review that did not run.
- On vetting the daily allowance rises 10 → 30 immediately and for every later day; re-vetting never re-raises (idempotent).
- Only vetted NGOs can publish; unvetted NGOs may reach `scoped`, with Publish disabled ("your ai4good contact completes vetting during onboarding").
- Daily drip (decision-11): the free allowance hard-resets to the tier grant once per UTC day, no rollover — the daily wall is the deliberate fund-now-or-return-tomorrow moment, and this one mechanism replaces a separate daily message cap.
- **v1.5 gate (explicit):** self-serve doc upload, the review queue + viewer, badge display, and the KYC tier return before ANY non-concierge admission path (organic NGO signup, EU/UK signup). A paid "Discovery wallet" stays excluded in v1 AND v1.5 (decision-8).

Dependencies: REQ-001.

---

#### REQ-003: Project Need Creation (free-text intake)

NGO admins start a "Project Need" with a free-text problem description that kicks off the Discovery conversation.

- Form: project title, problem description, cause tags, urgency.
- Optional reference-file upload (screenshot, spreadsheet, blank form, mockup, requirements doc) feeding Discovery and the volunteer; upload shows the data-responsibility disclosure, hardened for Tier-2 once sensitivity is known (REQ-032).
- Drafts autosave; submitting the intake moves the project into Discovery; the raw intake is retained for audit.

Dependencies: REQ-001, REQ-002, REQ-032.

---

#### REQ-004: AI Discovery Agent (free, rate-limited)

A conversational agent (Claude Opus — deliberate: Discovery is the highest-leverage reasoning step in the funnel, its scope output drives the entire build, and a Discovery is short and one-time, ~$1–2 per scoped run; decision-13) turns the intake into a scoped spec over a structured 5–10 turn conversation.

**Two-layer money model (decision-11):** the free pre-fuel Discovery phase runs on abstract, context-weighted Discovery credits — a per-NGO daily allowance (10/day unverified, 30/day verified; daily reset, no rollover) that serves as the acquisition funnel without bankrupting the platform. Funded fuel stays real-dollar-pegged with the standard margin. **Routing ("Funded → all-$"):** a funded project's Discovery draws that project's fuel, not the free pool; the free pool is reserved for the NGO's unfunded projects. When the day's credits run out the NGO can (a) verify (allowance rises to 30), (b) fund the project's fuel and continue now — the expedite path, or (c) wait for tomorrow's refill.

- System prompt tuned for non-technical-NGO → technical-scope extraction; conversation happens in the platform UI, is persisted, and resumes.
- Reads the NGO's Discovery-visible reference files multimodally, can request more mid-conversation, and may cite them in the scope; never receives files the NGO did not mark Discovery-visible (REQ-032).
- Output is a structured scope: summary; user stories with nested acceptance criteria; suggested stack; qualitative complexity tier (small/medium/large — never a dollar figure); risk flags; data-sensitivity tier; maintainability fit; Lovable recommendation with rationale; workflow split (which parts go to Lovable vs Claude Code). v1 always emits the split workflow; Lovable-only and Claude-Code-only modes are reserved post-v1 (all matched v1 projects require an Anthropic fuel kickoff).
- **Discovery output is a scope contract (decision-25):** it is the source for the dev-authored project PRD (REQ-036) and the reference the completion scorer gates against — it is never decomposed into build tasks directly.
- **Data-sensitivity classification:** Discovery asks what data the tool will handle and assigns Tier 0 (no restriction), Tier 1 (ordinary PII — minimization reminder + NGO data-responsibility acknowledgment), or Tier 2 (special-category or high-volume PII — **build against synthetic/anonymized fixtures only; the NGO connects real data itself after handoff**, so real Tier-2 data never reaches Anthropic, Lovable, or the volunteer). The NGO owns the data-exposure risk (governance-by-disclosure); triage confirms compliance. Conservative default: when unsure, Tier 2; health/immigration/abuse-victim/financial data never below Tier 2.
- **Maintainability fit check (single delivery model — decision-23, supersedes decision-19):** Discovery asks who evolves the tool after the volunteer leaves — the selector is the maintainer, not the technology. Fit = a non-technical NGO staffer maintains the live app by chat, with Lovable as the durable home; bread-and-butter internal tools (intake forms, CRUD trackers, directories, dashboards) default here. A need that requires ongoing developer maintenance (developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable) gets no publishable scope — Discovery explains the limitation plainly and **declines the need**; each decline is recorded for founder review. There is no waitlist and no second track. A need that requires a private/confidential codebase is likewise declined in v1 (public-only — decision-27; private repos are a future feature). Sensitive *data* is not a decline reason — it is handled by the Tier-2 fixtures-only rule above.
- Scope output can be regenerated up to 3 times (reason logged) before escalation. Regenerations and system-error retries cost zero credits — the NGO is never charged for the platform's failed output (avoids the silent retry-burn complaint flagged at Lovable/Cursor).
- Per-turn credit cost is conversation-weighted (cached content heavily discounted). **Attaching reference files never consumes credits and never interrupts** — no per-file charge, no pre-ingestion confirm (removed as wrong-and-cumbersome, founder review 2026-07-07); the daily allowance is the cost ceiling that bounds platform spend. Funded projects bill each turn to fuel instead (real usage, files included — fuel is honest metering, credits are a free grant).
- **Transparency UI (the anti-Lovable move):** a credit gauge ("Discovery credits: 7 of 10 today") and each turn's cost shown. The per-action cost display is copied from Lovable; its opacity, forfeiture-on-cancel, and silent burn are rejected — credits are a free grant, never silently removed.
- **Abuse guardrails:** email verification is a hard precondition for any Discovery message at any tier; the daily allowance caps the free subsidy per NGO per day; funding is an expedite (continue now — same model, no latency change, no allowance raise); per-NGO admin kill switch (admin-grantable extra credits removed — founder verdict 2026-07-08, over-design); no platform-wide circuit breaker in v1 (per-NGO daily caps already bound exposure). Free credits are never purchased → zero stored-value / money-transmitter / escheatment exposure — and they live outside the money ledger so its control totals stay clean.

**No dollar estimation in v1:** the scope doc shows the qualitative complexity tier with rationale, and links to Lovable's public pricing where Lovable is recommended; the NGO picks its own fuel amount at funding time ($50 minimum) and tops up reactively. A precise AI fuel estimator is v2 — AI-coding spend is hard to predict and overconfident estimates harm more than they help. The rendered scope doc explains in plain language: the complexity tier with start-small advice; "how you'll maintain it" (the NGO keeps evolving the tool by chat; Lovable subscription ~$25/mo paid directly to Lovable; the NGO owns the code regardless); and the data-handling tier (Tier 2 renders the fixtures-only rule).

Dependencies: REQ-003.

---

#### REQ-005.5: Project Lifecycle State-Transition Table

Ten lifecycle states: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `handoff_pending`, `handed_off`, `cancelled`. Every transition has an actor, preconditions, side effects, and failure handling. Abandonment/rematch (`in_progress → open`, REQ-027) is a transition between existing states, not an 11th state.

> **Decision-17: no `paused` state in v1.** Pause/resume carried disproportionate cross-cutting cost for a concierge pilot (restore-state edge cases, funding-clock freezes, special-casing in three scheduled jobs, key deactivate/reactivate side effects). At ~10–15 hand-matched projects, "NGO needs to pause" is a support conversation: pre-match the NGO unpublishes or cancels the match; mid-build an admin revokes the project's keys and leaves a note, or the project is cancelled. Reinstated in v1.5 on first real demand.

Product-level transition rules:

- Any NGO — including unvetted — can create a draft. Vetting gates publish (`scoped → triage`), never Discovery (decision-8).
- draft → Discovery requires a submitted intake, an email-verified NGO admin, and Discovery capacity (today's free credits or funded fuel). With neither, the composer is disabled with verify / fund-now / come-back-tomorrow CTAs.
- Discovery completion → `scoped` automatically on valid output (no verification needed); invalid output retries up to 3 times, then escalates to an admin.
- `scoped` → `triage` on Publish (vetted NGOs only). Triage (decision-29/r4 screener): confident-clean auto-approves → `open` (marketplace-visible); non-decided → founder exception queue with two outcomes — return to `scoped` with a reason note (edit + republish re-enters the screener) or `cancelled` with reason (terminal, non-remediable only). Tier-2 never auto-approves.
- `open` → `matched_pending_fuel` when a concierge match is consented by the volunteer (decision-28 — the admin creates the match, binding; no NGO approve/decline). Both volunteer gates (GitHub link, first-match disclaimer) are satisfied at the consent click, so no post-match readiness races exist. Only one acceptance can win; other pending applications auto-decline with a "matched a different volunteer" notice.
- `matched_pending_fuel` → `in_progress` on funding (≥ $50): the kickoff sequence fires. 7 days without funding → back to `open`, the volunteer is freed and notified, the NGO gets a re-fund prompt; the NGO can also cancel the match anytime pre-payment.
- `in_progress` → `handoff_pending` on the volunteer's "Ready for Handoff": requires all P0 tasks done and the project repo to exist. A failed checklist keeps the project `in_progress` with results shown.
- `handoff_pending` → `handed_off` on NGO acceptance (live deployment URL required): leftover fuel becomes non-cash NGO general-balance credit; project AI keys are revoked; Linear membership removed and the task tree snapshotted read-only; attribution captured (REQ-035); volunteer earns completion credit + a first-tool badge; a 30-day-alive check is scheduled. No tip in v1. Rejection returns the project to `in_progress` with comments; the 3rd rejection routes to neutral platform review (REQ-012).
- Abandonment/rematch (REQ-027): after 21 days with no code or task activity, or on manual release, the ex-volunteer's access is revoked everywhere (repo, keys, Linear; the NGO removes them from Lovable); **remaining fuel stays on the project** for the next volunteer; assigned tasks return to the backlog; the departure is flagged ghosted vs released-for-cause; the project re-opens with rematch priority.
- `open` → `scoped` ("unpublish to revise") anytime before a match is consented; a pending match is notified and released.
- Any pre-handoff state → `cancelled` by the NGO: keys revoked; remaining fuel → general balance as non-cash credit; volunteer notified; comment thread read-only (terminal).
- Operational blockers (REQ-024) are orthogonal badges on `in_progress`, never lifecycle states.

Match records track their own states (invited / consented / declined / expired / released — the concierge match log, REQ-007); a match that expires unfunded frees the volunteer for a later re-match. (Self-serve application states arrive with organic browse, v1.5.)

**Kickoff sequence** (funding fires parallel side effects): (1) the project's gateway virtual key is issued instantly — no ops task, no wait (decision-21); (2) a Linear workspace is assigned from a pre-created pool — workspace creation has no public API, so the concierge pre-creates in batch; an empty pool raises an urgent ops task + blocker (decision-20); (3) the GitHub repo is established via the NGO+volunteer Lovable setup checklist (REQ-021) — no platform-admin involvement, and required before handoff; (4) the workspace is seeded with a single bootstrap task — author the project PRD from the Discovery scope (REQ-036, decision-25); the build backlog is decomposed from that PRD only after it clears the automated completion gate; (5) the project comment thread starts and a "funded and live" event is announced; (6) the volunteer is notified with setup instructions. Provisioning failures never invent a sub-state: the project stays `in_progress` and gaps surface as blockers/ops tasks, gating the volunteer only from the pending resource.

---

#### REQ-005: Scope Document & Project Publishing

Discovery output renders as an editable scope document; the NGO edits and publishes. Publishing requires no pre-funded fuel — fuel is required only at volunteer acceptance (match-first / fund-on-kickoff minimizes NGO friction) — but does require platform triage approval (REQ-023).

- Editable sections: summary, user stories, acceptance criteria, suggested stack. No fuel-budget section (v1 makes no dollar estimates).
- **All projects are public MIT (Platform Promise §2, decision-27):** v1 has no visibility choice — every repo is public. Confidential-codebase needs are declined at Discovery (private repos are a future feature); sensitive *data* is handled by the Tier-2 fixtures-only rule (REQ-004), not by hiding the repo.
- A project may stay `scoped` indefinitely; the scope doc shows only the qualitative complexity tier — the NGO picks its fuel amount at match acceptance.
- Publish requires vetted NGO status and no fuel deposit; it moves the project to `triage` (the automated screener), never directly to `open`. Clean projects go live immediately; exceptions await the founder (REQ-023).
- The NGO can unpublish back to `scoped` anytime before a match is consented; a return-to-scoped triage outcome carries the founder's reason note for edit + republish.

Dependencies: REQ-004, REQ-023.

---

#### REQ-006: Stripe Fuel Top-Up & Ledger (NGO + volunteer both consume; funding allowed anytime from draft onward)

NGOs buy fuel via Stripe Checkout (one-time sessions, no subscription). The full gross amount credits the specified project — or, at the NGO's choice, its general balance — platform margin (15%, platform-configurable, locked per consumption so rate changes are never retroactive) is recognized at consumption time, not at top-up. Consequence: a $100 top-up shows as $100 of fuel, and if a project never consumes fuel the NGO keeps the full balance as redeployable credit while the platform has earned nothing — aligned with "fuel funds AI usage, not deliverables" (Platform Promise §3/§7). Fuel can be funded at any point from `draft` onward (decision-8) and is consumed by two parties: the NGO during Discovery (once free daily credits are exhausted, or immediately on a funded project) and the volunteer during build. Both pay the same margin; the ledger labels the two consumption kinds separately so spend is attributable by phase.

**Two funding moments** (either may be first; decision-8): (1) Discovery funding — the expedite path when the day's free credits run out ("fund to keep going now" alongside "or come back tomorrow"); this is the credits→dollars boundary and buys continuation, not per-message speed; (2) match funding — the historical default, at volunteer acceptance.

**Match-to-fund flow:**

1. A volunteer-consented concierge match puts the project in `matched_pending_fuel` (decision-28).
2. **Acknowledgment gate** before the funding CTA — a plain-language modal restating the key clauses with the volunteer's name pre-filled: coordination layer only, no obligation to deliver a finished tool; fuel funds AI compute and may be consumed without a viable deliverable; **fuel is non-cash credit** (not cash-refundable; unused stays as credit or can be donated); the project's data tier and the NGO's data responsibility (Tier-2 = fixtures-only build); the chosen amount is the hard maximum exposure. Recorded per match with timestamp + IP. The same modal hosts the Lovable workspace-setup reminder when Lovable is recommended.
3. **The NGO chooses its own kickoff amount** — no prefilled estimate; the complexity tier is context only. Copy recommends starting small with stepwise top-ups after reviewing concrete progress. Minimum $50; presets $50 / $100 / $200 / $500 / custom; default $50. **First-fund cap:** a funder with no handed-off project history is capped per project (default $200) and per day; caps rise with completed-project history — bounding any single fraud/chargeback incident to roughly one cap of compute, since with no cash-out a stolen card only ever buys compute.
4. 7 calendar days to fund at least the minimum; payment → `in_progress` + kickoff + volunteer notified; no payment → back to `open`, volunteer freed, NGO re-fund prompt.

**Acknowledgment cadence:** full disclaimer at signup (blocks project creation until accepted); a hard per-project acknowledgment at the project's FIRST funding — whether a Discovery top-up or match funding; a per-match acknowledgment naming the volunteer at first acceptance (acks are never reused across the two moments); subsequent top-ups show only a passive footer link — a refill should not feel like re-signing.

**Ledger (product level):** every money movement lands in one auditable ledger from which all balances derive. **Provider truth drives the gauges (decision-30):** every gateway response carries Anthropic's OWN reported token counts — the gauge reflects Anthropic's numbers within seconds of each request, not a poll. Aggregate reconciliation against Anthropic's usage/cost reporting runs on a TIGHT pull (minutes, pilot-tuned — not nightly), auto-correcting drift to provider truth (decision-31 — Stripe wins money-in, Anthropic wins AI spend; corrections auto-post through the guarded function, audited and dashboard-visible; only undecidable drift pages without touching the books); the internal arithmetic invariants (control totals) verify nightly and auto-repair by the same rules; full double-entry accounting is a v1.5 upgrade once an accountant defines the chart of accounts. Match expiry (7 days) is enforced automatically.

**Unused fuel — non-cash credit (Platform Promise §7):**

- **No cash-out or withdrawal exists in v1.** Removing the only money-out path eliminates laundering exposure and payout-compliance machinery; only the chargeback half of that risk survives.
- Leftover fuel **stays on the project** and survives a volunteer change — the next volunteer uses it; no money movement needed.
- Only at handoff or cancellation is leftover credit released to the NGO's **general balance**: non-cash, no decay clock, never silently removed. One behavior in v1 (decision-28): the balance is kept and **auto-applies at any of the NGO's funding checkouts** — Discovery top-up or match funding, satisfying the $50 minimum with any remainder charged to card. The release is a ledger operation under the nightly control totals (never a manual balance tweak) and respects chargeback clawback. No donation flow in v1; no manual leftover-credit conversions or tax receipts.
- No cash refunds of any kind in v1 — not even admin-initiated (the goodwill-refund valve was removed by founder verdict, flow #9 2026-07-08); no retention clock, no silent auto-renew; the funding screen discloses this upfront. A genuinely-wronged NGO is made whole in general-balance credit (which auto-applies at checkout, decision-28); payment disputes go through the chargeback rail. The only money-out surface is Stripe's own dispute process.
- The NGO dashboard shows the general balance as redeployable credit with no expiry.

**Auto-top-up deferred to v1.5:** v1 is manual — the fuel-low warning (20%) and blocker (0%) drive the NGO to top up from the project page. Off-session charging adds consent, cap, dispute, and failure-recovery machinery; build it only after pilot fuel-low patterns confirm demand.

**Chargebacks + reserve:** on a payment dispute the platform immediately freezes the NGO (no new funding/matching), cuts the project's AI access, claws back the unconsumed balance, books the consumed portion as a platform loss, and opens an admin review; the audit-logged acknowledgment (timestamp + IP) is submitted as dispute evidence — what wins friendly-fraud disputes. Loss stays bounded by no-cash-out + the first-fund cap + rapid access cutoff. A formal chargeback reserve is deferred to later stages entirely (founder verdict, flow #11 2026-07-08 — not an MVP item); at pilot scale chargeback losses are absorbed from operating funds as they occur, bounded by the first-fund cap + no-cash-out + rapid access cutoff. Fraud posture (decision-26 + founder verdict): collusion/shared-fingerprint detection is removed from v1 — concierge hand-vetting of every pairing + no-cash-out + caps are the v1 control; the full anti-Sybil program is v1.5.

Concierge/admin work items (verification reviews, Linear-pool replenishment, chargeback reviews, incidents) land in one prioritized admin queue with SLA targets.

Dependencies: REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.

---

#### REQ-007: Volunteer Profile & Concierge Matching (organic marketplace apply-flow deferred to v1.5 — decision-28)

Volunteers sign up (GitHub preferred) and build a profile. **v1 matching is concierge-only:** the launch is already concierge-first by design (Goal 5) — the first cohort is hand-matched, so the self-serve browse/filter/apply surface and the NGO applicant-review queue are deferred to v1.5 (gate: concierge cohort proven, organic browse opens). Project pages stay public and readable by anyone (transparency, Platform Promise §2); v1 volunteers signal interest to the concierge out-of-band.

- Sign-up via GitHub OAuth, Google OAuth, or email/password; GitHub can be linked later. A linked GitHub auto-populates top languages, repo count, and a contribution summary; unlinked profiles hide those fields.
- Volunteer adds skills, causes of interest, hours/week availability, optional bio.
- **Admin enforce-match (founder call, decision-28):** the platform admin creates a match directly — binding, no NGO approve/decline step. Two gates ride it without ceremony: (a) the volunteer confirms with one click, which fires the first-project disclaimer if unsigned (GitHub link required at this consent step — the OAuth modal opens inline; nothing sensitive, no repo/key/Linear access, and no intro to Tier-2 context before the disclaimer is signed); (b) the NGO's per-match acknowledgment (fuel ≠ deliverable, no SLA, names the volunteer) fires on the funding screen — which the NGO must visit anyway, since kickoff only fires on funding (match-to-fund). A consented match therefore represents a fully kickoff-ready volunteer.
- **Concierge match log (admin-only, lightweight):** every match attempt recorded — invited, consented, declined/expired/released, timestamps, short reason — the Goal-5 evidence for deciding when organic browse opens. Not a public applicant queue.
- **On GitHub link the volunteer is automatically added to the platform's GitHub org** with repo-creation rights — one-time onboarding replacing per-project permission labor; needed so the volunteer (or Lovable acting for them) can create the project repo later (REQ-008/021). Recorded and audited.
- **Org removal by cause:** (a) voluntary deactivation — membership removed, but per-project access on active projects stays so in-flight work can finish; (b) **AUP enforcement (v1 simple — founder verdict 2026-07-08):** the admin deactivates the account (the lifecycle state gates every platform write) and instantly revokes the project's virtual keys, with an audited note; remaining access (repo, Linear membership, org membership) is removed via a short manual checklist, and the NGO removes the volunteer from their Lovable workspace (only the workspace owner can). Reversal = admin re-enables the account and re-issues keys, manually. The orchestrated staged-teardown saga + lazy per-project rebuild machinery is v1.5; (c) 24-month inactivity — soft removal like (a).
- Dashboard shows GitHub status ("Linked as @handle" / "Not linked — link now to accept a match").
- Public project listing (read-only in v1): title, summary, complexity tier, suggested stack, cause tags, NGO name, posted date — newest-first, no filters/sort machinery (v1.5 with the browse surface; no public verification badge in v1, decision-29/r3).
- Deferred to v1.5 with organic browse: filters, overlap badges/match score (decision-26), Apply + cover note, the NGO applicant-review queue, auto-approve settings.

Dependencies: REQ-001, REQ-005, REQ-008.

---

#### REQ-008: GitHub Integration (Code substrate + dev-internal issue tracker)

Every funded project gets a public-MIT GitHub repo in the platform's GitHub org (all projects are public in v1 — decision-27). The repo is always created through the volunteer-driven Lovable→GitHub setup (single delivery model — decision-23; no platform-created repo path). (Verified against Lovable's docs: Lovable's GitHub App creates the repo wherever pointed, and Lovable collaborator permissions do NOT propagate to GitHub.)

- **Uniform repo home:** all repos land in the platform org and stay there permanently — no transfer ceremony at handoff (the NGO's ownership is real without it: MIT license + Lovable two-way sync mean the code is forkable/exportable anytime; the NGO admin holds admin access post-handoff).
- The volunteer gets maintain-level access; the NGO admin gets read + comment access for visibility (cannot push).
- Code events (pushes, PRs) feed cadence stats and task linkage from the moment a repo exists; task status itself moves via Linear's own GitHub integration.
- **GitHub Issues are dev-internal only** (code bugs, refactors, tech debt) and never surfaced to NGOs; the Linear task tree is the source of truth for NGO-visible deliverables. No auto-created issues from the scope doc. Standard dev-internal labels seeded at bootstrap.
- **Repo seeding:** every repo carries committed, platform-owned session guidance — the project-binding marker (REQ-009), task-binding conventions (REQ-034), Linear norms (one issue in progress; assign before starting; comment when blocked; never move status by hand), branch/commit conventions carrying the Linear identifier so merges move task status, a skeptical reviewer-agent skill, and env-file hygiene defaults. Platform API credentials are never committed — shown once, revocable, and distinct from the LLM-side virtual key (two credentials, two revocation semantics, deliberately not merged). Longer onboarding lives in on-demand repo skills, not files that ride every request and bill NGO fuel.
- Lovable-side commits arrive without Linear identifiers — acceptable: status moves on the volunteer's PR merges, and a knowledge snippet asks Lovable to include identifiers best-effort.
- The platform holds only short-lived GitHub credentials minted on demand; no user PATs.
- **One-time org setup at launch:** the platform's GitHub App and Lovable's GitHub App installed org-wide, with least-privilege scopes, credential rotation, and a break-glass org-compromise runbook. Org membership alone grants NO read access to any repo — a volunteer sees only repos they are explicitly added to; members can create repos (required for the Lovable flow), with an abuse monitor for org repos that map to no active project. NGO admins are per-project outside collaborators (read + comment), never org members.
- **Continuously-asserted base-permission invariant (P0):** the org base permission (members get no default access + private-only repo creation, per the REQ-009 org-namespace guard) is verified continuously with alerting + auto-remediation — a single accidental flip would broaden org-member access beyond assigned projects and defeat the namespace guard. Member-created repos are born private and flipped public only after the setup checklist validates the repo URL.
- **Lovable path (v1 default):** the platform does not pre-create the repo at funding; kickoff auto-raises a Lovable-setup blocker, and the NGO (workspace + admin invite) and volunteer (GitHub install + connector + paste-back) work an 11-step checklist that the platform auto-validates, recording the repo URL — typically same-day, with aging escalation if either party stalls. No platform-admin involvement. The repo URL is a hard handoff precondition.
- README seeded with project title, NGO name, plain-language summary, license, and a link back to the platform project page; MIT license auto-seeded for public projects.
- **At handoff:** volunteer downgraded to read/triage, NGO admin promoted to admin — no org transfer (the repo's permanent home is the platform org); the NGO removes the volunteer from the Lovable workspace separately (only the workspace owner can).

Dependencies: REQ-006, REQ-007, REQ-021, REQ-026.

---

#### REQ-009: LLM Gateway — Virtual Keys, Caps & Inline Fuel Metering (decision-21)

> **Decision-21 re-architecture:** the per-project provider workspace + manual console keys + usage-report polling model is replaced by a platform-controlled **LLM gateway** in the request path between the volunteer's coding agent and the model provider — pulled forward from v1.5 and made the metering path itself. Deleted outright: per-project workspace provisioning, the manual key ops queue, the usage poller, daily cost-drift reconciliation, console spend caps, and the fuel-zero key-deactivation/reactivation saga. Gateway hosting is an open decision (**OD-6**).

Every (volunteer, project) pair gets a **virtual key** issued automatically at kickoff — no ops task, no waiting. Volunteer setup is two environment variables; vanilla Claude Code works unchanged. The gateway authenticates the virtual key; checks status, caps, project fuel, and project binding; injects the platform governance prompt; forwards to the provider using the real org credential that exists only inside the gateway (volunteers never see it — mechanical enforcement of no-billing-exposure); streams the response back; prices usage; and records consumption inline.

**Placement doctrine (platform-wide):** volunteer-editable files carry norms and nudges (soft — reinforced conversationally, can be edited away); the gateway-injected prompt carries durable norms (invisible, platform-controlled, re-applied per request); deterministic code carries hard invariants (cannot be talked out of its verdict). Third-party permission models are trusted for access, never for policy (Lovable has no role between Admin/Editor; Linear scopes cannot express "assign + comment but no status change").

**Threat model (stated plainly):** the project-binding marker is a **tripwire, not a lock** — copyable by design; its job is converting accidental misuse (a key left in env vars, used on another repo — the dominant real case) into unambiguous intent. The virtual key is the actual credential; key + repo context is a two-factor barrier against outsiders only. Containment chain: caps bound exposure, the ledger attributes it, revocation ends it — detection can afford latency because exposure is capped. Key revocation = individual enforcement; marker rotation = hygiene for people who lost repo access, never used against active insiders. Rate limits are reliability engineering and project-lifetime fuel is economics — do not size caps adversarially. Proportionality: governance capacity follows observed behavior, not imagined adversaries; deterrence comes from disclosure at onboarding (usage is attributed and reviewed); any mechanism that taxes legitimate volunteers has inverted its purpose.

- One key per (volunteer, project), shown once at issuance, minted automatically at kickoff, never logged.
- Onboarding = two env vars on the volunteer dashboard with instructions; all setup-failure UX lands on rejection copy written to instruct, not accuse.
- Streaming preserved end-to-end; gateway overhead budgeted under 150ms p95 (excluding model latency).
- **Caps per key:** per-request max + a rolling 24-hour window sized 3–4× a heavy human day so legitimate agentic-loop use fits; 80% → soft warning; 100% → hard stop with a one-action coordinator override. Cap values tuned from pilot data (**OD-3**), not adversarial guesswork.
- **Project-binding check:** a committed marker (with a one-line human explanation: "ties NGO-funded fuel to this project; please don't move it") rides the session prompt; the gateway verifies it pairwise against the presented key's project on substantive requests only (small background calls skipped; threshold **OD-4**). Mismatch → instructive rejection naming the project the key belongs to.
- **Governance prompt injected on every request:** the project-scope line (decline unrelated requests; redirect to project work) and the never-change-Linear-status rule (REQ-026).
- **Inline metering (the money path):** each response's token usage is priced by a local rate card, the 15% margin applied, and paired consumption recorded immediately — a retried request cannot double-charge — with task attribution when known (REQ-034). All REQ-006 money invariants unchanged.
- **Fuel thresholds:** 20% → NGO notification + warning blocker; 5% → volunteer in-app warning; **0% → the gateway declines the next request inline, stating the cause** ("project fuel is exhausted — ask your NGO to top up") and flipping the blocker to blocking. After top-up the next request passes — no reactivation machinery exists or is needed.
- **401 semantics:** flat externally (no revoked-vs-nonexistent distinction) EXCEPT fuel exhaustion, which states its cause — the one case where the caller is a legitimate volunteer who must act. Rich diagnostics only on the authenticated dashboard. First-week 401s are an onboarding-UX metric, not a threat signal.
- **Revocation is instant and self-serve:** the NGO's "suspect misuse — revoke access now" action and platform-admin enforcement both cut access immediately; a replacement key issues instantly. All project keys terminate at handoff (REQ-012), abandonment release (REQ-027), and AUP deactivation (REQ-007).
- **Privacy invariants (load-bearing):** request bodies are inspected transiently and never persisted; the ledger stores token counts and metadata only; any derived origin/mismatch signal is stored as a score or boolean — never paths or content.
- **Key-leak hygiene (v1 = prevention, not detection — decision-26):** env files ignored by default; the platform key pattern registered with GitHub secret scanning + push protection. The key-leak canary and the volunteer self-audit usage view are deferred to v1.5 (gate: organic volunteer signup) — at hand-vetted pilot scale, caps + project binding + the fuel gate already bound exposure. Org-namespace guard (near-zero build, codex-required): org settings restrict members to private-only repo creation, visibility changes to owners/platform automation, and Pages/Actions for unmatched repos — asserted by the same continuously-checked base-permission invariant (REQ-008); project repos flip public only after the setup checklist validates the repo URL; the founder's daily review includes a one-call org-repo-vs-active-projects comparison.
- **Escalation ladder documented, NOT built in v1** (listed so the decision not to surveil is visible): activity-vs-burn reconciliation on shape signals only, phase-aware (trigger: real ledger anomalies; **OD-5**); marker rotation with a mandatory grace window (trigger: adverse offboarding or a leak); a short-lived per-volunteer signed token checked pairwise against the key (trigger: repeated anomalies conversations don't resolve); sampled content classification (trigger: probably never).

Dependencies: REQ-006, REQ-024, REQ-034, REQ-012/027/007 (key-termination hooks). The only provider surface used is the model API through the gateway.

---

#### REQ-010: Project Page (single view) & Cadence Stats

Each project has **one public page** — the same view for NGO admins, the assigned volunteer, platform admins, and logged-out visitors. The platform's role is PM and coordination; the volunteer's real dev workflow lives on GitHub outside the platform, so there is no "developer view" duplicating GitHub UI.

- Public page, one view, no per-role variants. Every project shows the full task tree publicly (all projects are public — OSS-by-default, Platform Promise §2).
- Header: title, NGO name, status, assigned volunteer, repo URL (with a plain-language empty state while Lovable→GitHub setup is pending), complexity tier, cause tags.
- **The task tree is the primary content:** hierarchical progress bars, status badges, a "Now working on" highlight, plain-language task titles. Progress % = done P0 tasks / total P0 tasks — computed from the task tree, never GitHub issues.
- **Plain-language activity feed:** commits are translated into readable statements tied to task titles ("Volunteer completed work on Task 3.2 — Scheduler core (2h ago)"), never raw PR jargon.
- Reference-files section (REQ-032): the NGO's uploaded need-files listed with descriptions; downloads limited to the assigned volunteer, NGO admins, and platform admin (reference files stay access-restricted even though the repo is public — they are the NGO's raw uploads); the NGO can add/remove files pre-handoff.
- Clarifications tab (REQ-024): resolved clarifying questions persist as a Q&A log (question, answer, who, when) for the project's lifetime; an "Awaiting NGO clarification" banner tops the page while any question is unresolved.
- Fuel gauge shows provider truth in real time (decision-30): driven by Anthropic's own reported usage from each gateway response — the gauge moves within seconds of every request, and a tight-cadence pull of Anthropic's aggregate usage reporting continuously validates it.
- **No GitHub Issues, PR lists, or raw commit logs on the page** — the repo link in the header is the only GitHub touchpoint.
- **Cadence stats (v1 minimal — decision-26):** commits this week vs last with delta + last-activity timestamp (red past 14 days during build), from code events only. Deferred to v1.5: the 12-week commit sparkline, task close rate, and the Active/Quiet/Stalled health badge replicated on cards and dashboards — presentation polish at 15-project scale; Promise §6's two progress signals (task view + commit cadence) stay intact.
- **Dual fuel-meter display (REQ-021):** every v1 project renders two meters side-by-side — "Claude Code (via fuel)" (balance, % remaining, low/depleted indicators) and "Lovable (direct to Lovable)" (setup CTA before setup completes; status + workspace link + top-up CTA after) — with tooltips explaining that fuel and the Lovable subscription are separate purses. **Standing trigger (decision-30):** the moment Lovable exposes programmatic usage/credit data (scoped OAuth or webhooks — the Q7 watch), the Lovable meter switches from the manual widget + consent-based session reads to pulled provider data on the same tight cadence as the Anthropic reconciliation — no new decision needed.

Dependencies: REQ-008, REQ-009.

---

#### REQ-011: Public Project Listings (v1 read-only; browse/sort/filter machinery v1.5 — decision-28)

v1 shows a public, read-only, newest-first project list (transparency — anyone can see what ai4good is building); matching is concierge (REQ-007). No apply flow, no filters, no badges, no scoring in v1. Volunteers self-select via the concierge; NGOs make no accept/decline decision (enforce-match)rithmic recommendation.

- Cards show the project's needed skills and cause tags plainly; newest-first, read-only.
- No ML, no algorithmic ranking, no NGO-satisfaction weighting in v1.
- v1.5 (deferred, with organic browse): filters, sort options, apply flow, a deterministic match score with a visible breakdown, and NGO satisfaction as a private weighting component.

Dependencies: REQ-007.

---

#### REQ-012: Handoff Workflow

A structured workflow from "code done" to "NGO operating independently."

- The volunteer requests handoff once all P0 tasks are done; open GitHub Issues never block handoff.
- **Hard precondition: the project repo exists** (Platform Promise §2) — every project ends in a platform-org repo at handoff. If the Lovable→GitHub setup is incomplete, the button is disabled with instructions to finish the setup checklist; NGO + volunteer self-resolve, no admin escalation.
- Done-status arrives only via merged PRs (structural under decision-20), so every done P0 task carries shipped code by construction — no manual commit spot-checks.
- Automated checks: README present, RUNBOOK present, deploy instructions present, at least one passing CI run on main, LICENSE present (MIT — all projects are open-source).
- **Deploy-to-running (the deliverable is a running tool, not a repo):** a live deployment URL is a handoff precondition. The app is already hosted by Lovable; the volunteer pastes the live app URL into the handoff form (the only step that captures it — without it a handoff cannot complete), confirms Lovable workspace ownership with the NGO, and runs the **guided-maintenance ritual**: (i) enable row-level access enforcement on the Lovable-provisioned database (off by default — a PII footgun); (ii) demo chat/plan mode and checkpoint rollback so the NGO staffer can self-maintain without breaking production; (iii) set a Lovable spend cap / budget alert so metered edits never blindside a non-technical owner; (iv) confirm two-way GitHub sync is live.
- **30-day-alive signal (north star):** an automated check pings the deployed tool 30 days post-handoff and records whether it is alive — a reachability signal ("deployed and responding," not evidence of self-maintenance), measured, never guaranteed (no SLA, Platform Promise §4). The 60/90-day health layer is v1.5; v1's longitudinal signal is the structured day-45–60 founder check-in (REQ-035 — decision-26/c8).
- The NGO reviews handoff (repo URL + live URL + checklist results) and signs off or rejects with comments. (The rejection-loop cap + neutral platform review + volunteer contest path were removed from v1 — founder verdict, flow #8 2026-07-08; at concierge scale the founder sees every handoff, and a stuck reject cycle surfaces as a support conversation, not specced machinery.)
- On accept: project → `handed_off`; leftover fuel → NGO general balance as non-cash credit (REQ-006 — not a cash refund); volunteer's completion-credit event is recorded with a private confirmation (public display + badge v1.5 — decision-29/r2); all project virtual keys terminate (REQ-009); Linear membership is removed and the task tree snapshotted (REQ-026); the **REQ-035 attribution step** is captured at sign-off.
- **Repo handoff (uniform):** the repo stays in the platform org with the NGO admin promoted to admin and the volunteer downgraded — no transfer step (redundant: MIT + Lovable two-way sync already make the code the NGO's to fork or export).
- No tip flow in v1. The sign-off includes the attribution step (testimonial + 3 credit-framed dimensions) — deliberately superseding the earlier "no satisfaction form in v1" deferral: this is attribution capture, not a satisfaction score, and it never blocks acceptance.

Dependencies: REQ-008, REQ-006, REQ-021, REQ-009, REQ-026, REQ-035.

#### REQ-021: Lovable Integration — Durable Home + Claude-Code-Orchestrated Build

Lovable is the primary deliverable vehicle and the NGO's durable maintenance home: after handoff the non-technical NGO evolves the live app via Lovable's chat, no developer needed. During the build, Claude Code is the volunteer's single entry point: it orchestrates Lovable for the UI layer and handles backend/logic/tests/docs directly, keeping ai4good's metering, scope enforcement, and audit authoritative over Lovable work. Every project uses Lovable (single delivery model — decision-23); the skip-Lovable opt-out is removed (reserved post-v1).

**Orchestration posture:**
- Lovable's integration surface is a research preview; access is isolated behind one internal adapter so churn touches one place.
- Primary path: Claude Code drives Lovable. If the integration breaks, the volunteer drives Lovable directly in the browser with both tools committing to the shared GitHub repo — builds never go dead from a Lovable API change. Either way, UI work runs on the NGO's Lovable credits and Claude Code work burns ai4good fuel; projects can lean UI-heavy or backend-heavy, and a pure-backend tool with no Lovable app fails the maintainability fit check → declined at Discovery (decision-23).
- Orchestrated Lovable calls bill the NGO's Lovable workspace, so the platform enforces a per-task Lovable-credit budget cap, audit-logs every call, and surfaces the NGO's Lovable credit balance inside ai4good — structural enforcement, not honor-system. The volunteer connects their own Lovable account; calls bill the NGO's workspace, attributed to the volunteer.
- Post-handoff the NGO owns the workspace outright — zero dependency on the orchestration layer or Claude Code.

**Why NGO-self-provisioned Lovable:** Lovable has no per-project metering API, no BYOK, and per-workspace billing; owning it on NGOs' behalf would mean linear ops cost and inscrutable attribution. Self-provisioning gives zero infrastructure dependency, pricing transparency (no markup on Lovable spend), NGO workspace ownership from day one (the durable post-handoff home, no migration), and matches how AI-augmented developers already work. No ai4good connector exists inside Lovable (decision-20): task state lives in Linear, and Lovable itself never talks to ai4good.

**Lifecycle:**
1. Discovery flags whether Lovable is recommended, with rationale — no dollar estimate. The scope doc shows a labeled note: paid directly to Lovable, never deducted from fuel. Pre-kickoff, the NGO sees a reminder banner to set up the workspace and invite the volunteer.
2. Setup is mandatory at kickoff: a blocking setup item is auto-raised to the NGO. NGO + volunteer complete it through the existing blocker + comment surfaces; the platform admin has zero per-project involvement, and the NGO needs no GitHub account. Checklist: NGO signs up (paid Lovable tier required for the workspace-admin role), creates the workspace/project seeded from a one-click-copied scope summary, and invites the volunteer as workspace admin; the volunteer accepts, connects Lovable's GitHub sync so the repo is created inside the platform's GitHub org, and pastes back the workspace/repo identifiers; the platform auto-validates (repo in the platform org, repo flipped public after validation, platform GitHub App installed, name collisions surfaced, volunteer repo permission normalized so they cannot add collaborators unnoticed), auto-resolves the item, seeds the repo template, and notifies both parties.
3. Stuck parties raise clarifying-question blockers with standard aging; the platform admin is pinged only at the 7-day escalation. The volunteer can clone and work locally in Claude Code immediately after setup — no further approvals. (A collaborator-request blocker exists only for the legacy edge case where an NGO insists on hosting the repo in their own org.)
4. Credit status is manual in v1: the volunteer sets a Lovable status widget (active / credits low / blocked); low/blocked shows the NGO a "Top up Lovable credits" CTA deep-linked to Lovable billing, and the NGO clicks "I've topped up — unblock" to reset. Automatic detection by parsing Lovable's notification emails is deferred to v1.5: brittle, needs inbound-mail infrastructure, adds NGO setup friction, and the widget already yields the same product behavior.
5. Handoff: the NGO removes the volunteer from the Lovable workspace and keeps the workspace + billing relationship; the repo is offered for one-click transfer to the NGO's own org; Lovable's GitHub sync follows without reconfiguration.

**Acceptance criteria:**
- [ ] Discovery output includes the Lovable recommendation + rationale with no dollar fields; the scope doc renders it with a "paid directly to Lovable" disclaimer and no dollar figure.
- [ ] Setup item auto-raised at kickoff (no volunteer opt-in or opt-out); resolved only by platform validation of the pasted-back identifiers; a failed check shows the volunteer the specific failure + suggested fix and keeps the item open.
- [ ] A setup guide documents the checklist, and a per-project setup page provides one-click copies (scope summary, volunteer email, an optional snippet asking Lovable to reference the task identifier in commits — best-effort readability only; status is driven by PR merges, never by parsing), the validated paste-back form, and per-step progress showing which actor acts next.
- [ ] Status widget appears once setup completes; the volunteer can change it; low/blocked transitions notify; the NGO can reset to active; the top-up CTA opens Lovable billing in a new tab. No inbound mail parser in v1.
- [ ] The volunteer's permission to create the repo in the platform org is granted at volunteer onboarding — no per-project grant.
- [ ] The handoff runbook includes removing the volunteer from the Lovable workspace.

**Non-goals (v1):** no Lovable subscriptions purchased for NGOs; no metering or attribution of Lovable credit consumption (no usage API exists); Lovable cost never debited from fuel; no reselling of Lovable credits (NGOs buy direct; v2 may revisit under a reseller agreement); no backend access to Lovable accounts — credit visibility is client-side under the volunteer's own consent-gated connection, and a backend billing integration waits for scoped access or webhooks from Lovable.

---

#### REQ-022: Stripe Connect for Volunteer Tips (DEFERRED to v1.5 per §11)

NGOs may send optional gratitude tips directly to volunteers at handoff (Story 6); the platform takes 0% on tips — only standard processing fees apply. Deferred: payout onboarding, dispute/refund handling, and tax reporting are meaningful infrastructure and not load-bearing for the core thesis, so v1 handoff presents no tip CTA. Build trigger: the first pilot handoff where an NGO asks how to thank the volunteer with money. When built: volunteer opt-in from their dashboard, gated to at least one completed handoff; preset and custom amounts; tips recorded separately from fuel; a held-intent flow (30 days to claim, else refund) when the volunteer has not onboarded; tax forms handled by the payment provider.

---

#### REQ-023: Platform Triage Gate (compliance review before marketplace)

Every project passes a compliance gate between scope completion and marketplace publication — protecting the open-source-only and nonprofit-mission norms and catching policy violations (commercial intent, surveillance tooling, abusive scope) before volunteers see the project. **v1 gate = an automated triage screener with a founder exception queue (decision-29/r4, founder redesign):** automation decides the clear cases; the founder attends only the non-decided ones — Promise §8 applied to triage, the same evaluator-gates/human-handles-exceptions shape as the REQ-036 PRD scorer.

**Screener checks (same checklist, automated):** open-source alignment (all v1 projects are public MIT — no commercial / closed-source-for-resale work; a confidential-codebase request is a decline, per decision-27); nonprofit purpose against the vetted NGO profile; scope reasonableness against Discovery's complexity tier; acceptable-use compliance (no surveillance, spam infrastructure, illegal use); data-sensitivity tier correctness, with Tier-2 projects required to carry a fixtures-only build plan; Discovery risk flags. The screener returns pass/flag + reasons + confidence.

**Acceptance criteria:**
- [ ] NGO "Publish" routes the project to the screener, never directly to the marketplace.
- [ ] **Confident-clean → auto-approved → `open`**, with an audit record written by the screener (checks run, rationale, screener version) — the compliance trail is automatic.
- [ ] **Tier-2 projects never auto-approve** — special-category data always routes to the founder (conservative default).
- [ ] **Everything non-decided → the founder's exception queue** (screener findings pre-surfaced as focus areas), reviewed in the daily routine. Two outcomes: **return to `scoped`** (fixable — reason note to the NGO, who edits and republishes; republish re-enters the screener and stays marketplace-invisible; prior notes visible so requested fixes are never lost) or **terminal decline** (non-remediable policy failures — stays dead, cannot churn back).
- [ ] Every human decision recorded: reviewer, timestamp, decision, reason, data tier, scope snapshot reference.
- [ ] **Auto-approved items appear as one line in the founder's daily review** (post-hoc spot-check against screener false-negatives; break-glass unpublish is the recovery, REQ-031).
- [ ] Screener confidence threshold + model configuration: **[DECISION: OD-8 — pilot-tuned, same family as OD-7.]**
- [ ] NGO copy: clean publishes go live immediately; exception-queue items show "Under review — typically within a day or two" (no formal SLA machinery; the daily review shows item age).

---

#### REQ-024: Project Blockers (orthogonal operational health)

Operational blockers are orthogonal to lifecycle status: a project can be in progress and healthy, or in progress with unresolved blockers (waiting on NGO clarification, fuel depleted, Lovable credits low). The distinction separates "dev is ghosting" from "dev is waiting on someone else" — it drives volunteer reputation, NGO-satisfaction signal, and admin escalation. Blockers never reduce the volunteer's public completion credit; they are often outside the dev's control.

**Types (v1):** clarifying question (dev-raised; manual resolve), awaiting NGO review, external dependency, GitHub collaborator needed (legacy own-org-repo edge case; resolves once the NGO confirms access), Lovable setup pending (auto-resolves on platform validation, REQ-021), fuel top-up needed (auto-raised at 20% warning and 0% blocking; auto-resolves above 20%), Lovable credits (volunteer widget; NGO resolves via "topped up"). Spend-anomaly review is deferred to v1.5 with the anomaly engine. Auto-raised types allow one unresolved instance per project, with severity upgrading in place; manual types may have several open concurrently.

**Notifications and aging:** raise → NGO admins (email + in-app + "Action needed" rail); a blocking fuel state also escalates to the platform admin; resolve → both parties; reminder at 48 hours; escalation at 7 days to the platform admin with the project flagged at-risk. Lovable-setup aging routes to NGO + volunteer (a between-actors item); the admin sees it only after 7 days of mutual silence. On transition to handoff, open blockers auto-archive so completed work never generates aging reminders.

- Dev raises via a "Raise a flag" action (type, severity, title, body); resolution requires a note; the conversation lives in the blocker's Q&A plus the project comment thread (v1 has no chat channel — decision-15). Manual catch-all types carry a selectable action-owner per instance (type default preset); selecting admin/ops creates the ops item immediately rather than waiting for 7-day aging (codex-required). Every NGO-facing free-text surface reached from a blocker carries the Tier-1/Tier-2 data warning — never paste beneficiary data, passwords, keys, or live credentials (codex-required).
- Clarifying questions are first-class: raisable at project level or anchored to a specific task; the form asks topic, what you tried, what you need. While one is unresolved the project shows "Awaiting NGO clarification — volunteer can continue with other tasks; this one is paused" (call to action for the NGO, status for the volunteer). Resolved question/answer pairs persist for the project's lifetime in a Clarifications log (who asked, who answered, when) — handoff context, future contributors, search.
- Surfacing: project-page badge with unresolved count + severity; compact indicator on marketplace/dashboard cards; NGO-dashboard "Action needed" rail across projects sorted by severity then age, with emphasis past 48 hours; cadence stats annotated "(blocked on NGO action)" or "(blocked on fuel)".

**Acceptance criteria:** raise and resolve flows work for volunteer and NGO; fuel blockers auto-raise and auto-resolve at the stated thresholds with in-place severity upgrade; Lovable-credit blockers ride the manual widget in v1; notifications and 48h/7d aging fire per the matrix above; auto-archive on handoff; all surfaces above render.

---

#### REQ-025: Mid-Build Scope Additions (structured CR surface deferred to v1.5 — decision-29/r1, amending decision-16)

**v1 is informal, with the decision-16 principle intact:** nothing interrupts the volunteer, nothing auto-assigns, the volunteer is the sole work-acceptance authority — enforced socially at concierge scale, not by machinery. The NGO raises a mid-build idea in the project comment thread. The v1 protocol (codex-required guards):
- Nothing enters scope until the volunteer explicitly accepts in-thread AND creates the linked task — before any material fuel is spent on it (attribution stays clean, REQ-034).
- An accepted addition is either top-priority (handoff-blocking, like original scope) or explicitly acknowledged by the NGO as optional/non-blocking before handoff.
- One active scope-addition discussion per project (concierge-runbook rule); further asks wait or become a follow-up project.
- Project copy states plainly: additions consume existing fuel, may extend the timeline, and are volunteer-optional; never paste beneficiary data, secrets, or credentials.
- An addition that changes data sensitivity, AUP/compliance posture, or open-source fit pauses for founder re-triage before work starts.

**v1.5 restores the structured surface** (the original REQ-025 design below is the v1.5 spec):

#### v1.5 spec — Change Requests (in-flight scope additions)

NGOs raise structured Change Requests (CRs) for additional scope while a project is in progress; the assigned volunteer accepts or declines — a binary decision, not an estimation exercise. Fuel is progressive, not decisive: no upfront per-CR quote or top-up. Accepted CRs join the working scope; fuel burns from the existing pool, and the existing low-fuel blocker + top-up flow handle replenishment.

**Principles (locked):** NGO raises, volunteer decides — keeps power symmetric; the volunteer is the work-acceptance authority. No upfront estimation by the volunteer — estimation is its own skill and creates conflict of interest. Declining is a legitimate boundary and never penalizes public completion credit. AI-assisted CR assessment (estimates, acceptance-criteria drafts) is v2.

**v1 flow:** NGO submits a 3-field form (title, description, rationale), available only while in progress. The CR surfaces as an actionable row on the project page plus a notification carrying inline Accept/Decline. Accept → the platform creates one top-priority task under a "Change Request: [title]" parent — accepted CR work blocks handoff exactly like original scope, because accepting means committing to ship; the volunteer may split it into sub-tasks (inheriting top priority), and downgrading one is an explicit, history-visible action, never silent. No GitHub issues are created. Decline → recorded with an optional note; the NGO may revise and re-raise. Work proceeds under the existing fuel systems with no CR-level instrumentation; completion is implicit in v1 (progress shows in the normal task tree; the NGO can manually mark a CR completed; no completion event).

**Guardrails (decision-16) — volunteer focus is the default-protected state:**
- A CR never interrupts and never auto-assigns work: the notification is low-tone (in-app + a CR inbox; no per-CR email), surfaced at session start or between tasks; only Accept creates the task. One open CR per project — the NGO cannot submit another until the volunteer decides the current one, capping pile-up at the source.
- Decline is penalty-free and presented as a normal choice. The form tells the NGO: a change request is optional — the volunteer decides whether and when; accepted changes add scope, may extend the timeline, and consume more fuel.

**Deferred:** v1.5 — dedicated CR section grouped by status; automatic completion detection + event; AI agent drafting acceptance criteria from CR text; NGO cancellation of a pending CR. v2 — mid-project scope reduction (informal today); project splitting (not planned).

---

#### REQ-026: Platform Task Management (Linear as system of record — decision-20)

Decision-20 replaces the git-as-truth task tree. Ground: real signals, not AI-authored narratives — under the prior design the volunteer's agent authored task state, so every NGO-visible status was ultimately agent prose. Linear supplies event-granular, actor-attributed progress signals in real time; an enforceable read/write split; no shared-file merge conflicts under parallel worktrees; a hosted backlog that exists before the volunteer clones anything (an onboarding surface); and per-volunteer attribution.

**Model:** task state lives in Linear — one free workspace per NGO project. Volunteers (and their agents, under the volunteer's identity) read the backlog, self-assign, and comment. Status transitions are deterministic: moved only by Linear's GitHub integration on PR merge — never by hand. The platform observes Linear events and mirrors them one-way into its own store, which powers the NGO Status Panel and the NGO assistant; the NGO never touches Linear. GitHub Issues stay dev-internal (code bugs only); Linear comments are dev-internal and never shown to the NGO, whose conversation stays on the project comment thread.

**Ownership asymmetry (written down deliberately):** delivery infrastructure is NGO-owned (Lovable workspace, repo); coordination infrastructure is platform-owned (Linear, the gateway) and does not transfer at handoff. Post-handoff the workspace sits dormant at $0, and the task tree is snapshotted into the repo as markdown for handoff residency — hedging exportability and dependency risk. If a paid tier is ever required, the platform pays, never the NGO.

**Provisioning — pool model:** Linear workspace creation has no public API, so the concierge pre-creates a pool of ready workspaces in batch, each pre-wired for platform access, events, and GitHub integration. Kickoff then needs no manual step: assign the next ready workspace, rename it for the project, invite the volunteer, seed the PRD bootstrap task (REQ-036 — the build tree arrives post-gate). A replenishment task fires when the ready pool drops below a watermark (default 3); an empty pool at kickoff raises an external-dependency blocker — the only stall mode. Honest note: bulk-provisioned empty workspaces sharpen — not soften — the fair-use question; the written blessing from Linear is POSTPONED to a pool scale-out gate (founder verdict, flow #20 2026-07-08) — the pilot's handful of workspaces proceeds on ordinary free-tier terms, risk accepted; the paid tier is the fallback if Linear ever objects.

**Decomposition (from the gated PRD — decision-25):** kickoff seeds only the PRD bootstrap task (REQ-036). Once the dev-authored project PRD clears the completion gate, the platform drafts the build tree from the PRD (one parent per story, one sub-issue per acceptance criterion, top priority) and pushes it by automation. Briefs must be session-sized and dependency-ordered — the precondition for pull-model correctness and for per-task burn data meaning anything (REQ-034); sequencing is encoded as blocking relations at decomposition time. Because the PRD is score-gated upstream, the per-kickoff coordinator review is retired to a pilot-phase spot-check (supersedes the decomposition half of decision-24(a)).

**Pull-based workflow:** self-assignment is the commitment signal — it flips the NGO panel to "in progress." Volunteers pull the next unblocked issue; the coordinator never pushes assignments. Norms: one issue in progress at a time (one per worktree if parallel); assign before starting; comment when blocked; never move status by hand. Onboarding: match → workspace invite → volunteer browses session-sized briefs before cloning anything → first work session connects task access once → first pull activates attribution (REQ-034). An in-progress issue with no branch activity for N days raises a coordinator flag proposing release back to the backlog. Agentic loops are permitted — governance is loop-agnostic; the repo template ships a skeptical reviewer-agent default; loops must degrade on auth failure (queue updates, surface at session end); loop PRs are never auto-merged. **[DECISION: OD-1 — reviewer identity + merge authority per project.]**

**Write authority (real-signals enforcement):** volunteers and their agents may read, comment, and self-assign — never change status. The GitHub integration moves status on PR events. The platform creates issues (decomposition, CR accept), invites members, reverts, and cancels. The NGO holds no Linear seat — its visibility is the Status Panel exclusively. Because OAuth scopes cannot express "assign + comment but not status," enforcement is detect-and-revert: any status change not made by the GitHub integration and lacking a linked merged PR is automatically reverted with an explanatory comment and a low-tone notification to the volunteer (a restricted read/assign/comment proxy is held in reserve if reverting proves noisy). Agent actions are attributed to the volunteer — human vs agent is indistinguishable and accepted; the volunteer owns their agents' actions.

**Lifecycle hooks:** an accepted informal scope addition is a volunteer-created linked task, top-priority or NGO-acknowledged-optional (REQ-025 v1 protocol; the CR-parent convention returns in v1.5). At handoff-pending, remaining lower-priority not-started issues are cancelled; top-priority issues never auto-cancel — handoff requires all of them done (REQ-012) — and the final tree snapshot is committed to the repo. At handed-off, the volunteer's membership is removed and the NGO-facing mirror goes read-only. On abandonment, the ex-volunteer's in-progress issues return to the backlog.

**Acceptance criteria:**
- [ ] NGO-visible task state derives solely from observed Linear events and platform lifecycle actions, and is public (all v1 projects are public — decision-27).
- [ ] Pool assignment at kickoff and watermark-driven replenishment behave as described; an empty pool raises the blocker.
- [ ] Kickoff seeds the PRD bootstrap task; post-gate decomposition drafts from the PRD and pushes automatically, with session-sized briefs and blocking relations (coordinator spot-check during the pilot — decision-25).
- [ ] Status flows only from PR merges; detect-and-revert enforces the rule and notifies the volunteer.
- [ ] NGO Status Panel renders a "now working on" strip, hierarchical task tree, and live activity feed. Panel scope beyond the tree + NGO introduction mechanics: **[DECISION: OD-2.]**
- [ ] **[VERIFY on the first pool batch]:** free-tier event registration, API mutations, programmatic invites, workspace rename, and the pre-connected GitHub integration seeing later-created repos. Fallback if the free tier regresses: paid tier (platform pays) or git-based task state with a deterministic truth layer.

---

#### REQ-028: ai4good Claude Code Skill (volunteer-facing single pane of glass)

A Claude Code Skill shipped by ai4good makes the volunteer's local Claude Code the canonical operating environment for ai4good projects: behavioral conventions, helper commands, and session governance (task binding, pull-model norms) packaged as installable, auto-updating agent code — not docs. Docs get read once at onboarding and drift; a Skill runs every session and its updates ship through the standard Skill channel, so the platform's opinion stays live. One-command install; auto-runs in every session opened in an ai4good repo.

**v1 scope:**
- One-command install; published open-source (MIT). The repo carries non-secret project config seeded at creation; the volunteer completes a one-time login per project. Three credentials, three revocation semantics: a platform token for NGO-side context (blockers, comments, fuel), task-system OAuth for the backlog, and the gateway key for metered LLM traffic.
- Session bootstrap primes each session with scope summary, current status, in-progress tasks, unresolved blockers, recent NGO comments, and fuel runway; verifies task-system access; reads the task binding; surfaces the CR inbox; prints a one-line banner (project, active task + age, fuel remaining, unread NGO comments).
- Task binding + degradation (load-bearing): self-assigning an issue records its identifier in a per-worktree binding that rides every metered request — the attribution mechanism (REQ-034). **The Skill enforces the pull-then-complete flow:** before substantial work it requires an explicit choice — pull an issue or explicitly enter the exploration bucket — so every session carries attribution context (no silent unattributed drift); exploration turning into implementation → it insists on binding the matching issue; completion is an explicit dev act (the dev marks done → the Skill verifies and drives the merge path that flips status, REQ-026). On task-system auth failure the session degrades without stopping: intended updates queue locally and surface at session end; the binding floors to unattributed — the auth-failure floor, not a bypass of the discipline.
- Helper commands: pick next task (highest-priority unblocked issue with full context; self-assigns on confirm — the commitment signal); fuel status (balance, burn rate, projected runway); list blockers with suggested actions; raise a task-anchored clarifying question; handoff readiness check (all top-priority tasks done, README + runbook present, repo + deployment URLs set, all work pushed); disable/enable. (The local reference-file sync command is v1.5 — decision-26; volunteers download from the project page.)
- Branch/commit conventions auto-applied (task identifiers + linking keywords) so the GitHub integration links the work and moves status — branch links flip an issue to In Progress, merge to Done, the only path to done-status; the volunteer can override anything the Skill generates. Manual fallback always present: the Linear app plus the project page cover every Skill behavior, and a volunteer who disables the Skill still operates — attribution degrades to unattributed, and norms still arrive via the injected governance prompt.

**The Skill is the orchestration shell (promoted to v1 core):**
- Drives Lovable through the adapter with the fallback posture of REQ-021. Per-task triage decides build-locally vs delegate-to-Lovable from the task and Discovery's scope split, explaining the decision with an override (heuristic: visual UI rendering → Lovable; everything else → local); after each delegation it pulls the changes, runs tests, and decides iterate vs done vs fix locally.
- Lovable budget guardrails: per-task prompt cap (default 5), interactive confirmation past the cap with a running NGO-credit burn estimate, and refusal to exceed an NGO-set hard cap; every Lovable call is audit-logged with a cost estimate, surfacing NGO Lovable burn on the admin and NGO dashboards.
- NGO consent gate: an "Allow Skill to orchestrate Lovable" toggle — default ON at kickoff with cost disclosure, revocable by the NGO; checked before any Lovable call.

**Deferred (v1.5+):** Replit as a second builder platform; fully autonomous orchestration polish.

**Acceptance criteria:** install works end-to-end; bootstrap auto-runs in ai4good repos and shows the banner; the binding follows self-assignment per worktree, and auth failure degrades to unattributed without blocking work; helper commands work end-to-end; conventions applied with volunteer override; disable/enable persists; docs cover install, configuration, troubleshooting, opt-out, and the implication of disabling (attribution degrades; norms still arrive via the injected prompt).

---

#### REQ-027: Abandonment / Rematch (volunteer ghosts mid-project)
Ghosting is the most probable non-happy-path event; the lifecycle needs a release + rematch edge (in_progress → open) and a partial-fuel rule.
- Triggers: inactivity (no repo activity and no task movement) — reminder at 14 days, auto-release at 21 days — or manual release by NGO or volunteer with a reason. The inactivity clock runs only while the project is in_progress (decision-17: no paused state in v1).
- On release: the ex-volunteer's project access is revoked — repo access, AI keys, workspace/PM memberships — via the release revocation checklist (its own rule; no dependency on suspension machinery); their in-progress tasks return to the backlog; done work + commit history preserved; remaining fuel STAYS on the project (non-cash, project-scoped) for the next volunteer — no refund.
- Ghosted (timeout) is recorded distinctly from released-for-cause (NGO/volunteer initiated): ghosting affects the volunteer's outreach/reputation signal; released-for-cause carries no auto-penalty.
- Project re-opens with concierge rematch priority; NGO notified; prior match records closed in the match log. Notifications: inactivity reminder, project released, rematch available (REQ-016).

#### REQ-029: Observability & Operational Monitoring
Correctness depends on ~8 unattended money-touching scheduled processes; crash/error-spike monitoring misses silent failures (a job that never fired, undetected ledger drift, a key left active after fuel-zero). Adds heartbeats + business-invariant monitors that page a human.
- Every scheduled job records a heartbeat; a watchdog pages when a job misses its expected interval.
- Monitors that PAGE (not just log): undecidable ledger drift (auto-reconciliation could not conform the books to provider truth — decision-31); any negative balance; **any metered AI request accepted or recorded against an already-depleted project — across every billable surface, gateway or direct platform AI (funded Discovery included), not just gateway traffic (codex-required)**; gateway error rate / provider errors outside budget; a release revocation checklist incomplete > 6h; org base-permission drift.
- **Every metered AI request — gateway or direct — emits the same privacy-safe audit event** (surface/actor, project, request id, provider status + cost, fuel delta, rate-card version, ledger linkage; metadata only, never bodies) so the founder can always answer "where did the fuel go" (codex-required; closes the direct-surface gap).
- v1 dashboards = the ONE money dashboard (funding, consumption, platform share, reconciliation, chargebacks) the founder reads daily; the broader golden-signal dashboard suite is v1.5 (decision-26). Error tracking + structured logging stay baseline NFRs.

#### REQ-030: Operations, Incident Response & Admin Correction Tooling
Kill switches, admin enforcement, and ops queues previously routed to one admin with no on-call model, restore runbook, or money-correction tooling. This REQ names the operating model. (The formal audited-reversal requirement was removed by founder verdict, flow #7 2026-07-08 — undoing an enforcement action is an ordinary admin ability, not specced machinery.)
- On-call + escalation model named (pilot scale: the founder, with a documented escalation tree); incidents are first-class ops items.
- **Runbooks (v1 = three authored — decision-26):** backup restore within the 4h recovery objective; gateway real-key rotation + mass virtual-key revocation; builder-tool (Lovable) outage fallback. The remaining scenarios (credential-compromise break-glass, PM-tool outage degraded mode, chargeback spike) get one-page incident cards, not full runbooks; the credential-compromise card must include freezing reference-file access (disable signed-URL minting), starting the breach clock (discovery time + counsel/statutory assessment if PII may be exposed), and reconciling Stripe events against the fuel ledger for the compromise window before unfreezing money movement (codex-required). Full six runbooks are v1.5.
- **Money corrections are fully automatic (decision-31 — supersedes the d26/c12 admin-invoked form): no correction UI, no human correction step.** The tight-cadence reconciliation (decision-30) auto-conforms the ledger to provider truth under a deterministic hierarchy — Stripe records win for money-in rows (top-ups, chargebacks), Anthropic usage/cost reporting wins for AI-spend rows, and pairing arithmetic (every consumption carries its skim pair) resolves internal gaps. Corrections auto-post through the one privileged function (idempotency key, pair-sum zero, source reference, audit row); direct writes to ledger tables stay revoked from every role. The founder gets visibility, never an approval step: every auto-correction appears on the money dashboard, large drift pages. **The refusal-to-guess backstop:** drift with no deterministic winner (provider data missing or self-contradictory) is never auto-resolved — the books stay untouched and it pages for visibility.
- Account deactivation (v1 AUP enforcement, founder verdict) has a documented recovery playbook: re-enable + re-issue keys manually; the suspension state machine is v1.5.

#### REQ-031: Content Moderation, Takedown & Secret Scanning
Public brand-named repos + Discovery output + comments are a UGC surface reviewed only once at publish. Right-sized (founder-approved): ~15 hand-curated concierge projects don't need an automated takedown surface yet; the one real exposure — secrets pushed to public repos — is covered in v1.
- v1: secret scanning + push protection enabled org-wide (all repos); founder break-glass path to hide a repo (emergency takedown — an admin incident action, not a user-facing private-project feature).
- v1.5 (gate: before organic/EU signup): universal "Report" affordance (repos / Discovery output / messages) feeding an abuse-review queue; rapid reversible takedown state (repo private + "under review", decoupled from suspension); DMCA agent registration + documented CSAM→NCMEC escalation; AUP suspension optionally flips the project's repos private.

#### REQ-032: Project Need Attachments (NGO reference files for Discovery + build)
Words-only intake under-specifies; one screenshot of the spreadsheet being replaced is worth a paragraph of clarifying questions. The NGO uploads reference files (current manual process, screenshots of liked tools, blank/sample forms, mockups, requirements PDFs, sample data structures); the Discovery Agent reads them multimodally to inform scoping, and the volunteer uses them at build time.
- Upload at intake, during Discovery (the agent can ask for more mid-conversation), or from the project page anytime pre-handoff; drag-drop + picker. Types: PDF, PNG/JPG, CSV/TSV, TXT, DOCX/XLSX; caps (tunable) ~25 MB/file, ~200 MB/project.
- Access limited to the project's NGO account, assigned volunteer, and platform admin (reference files are access-restricted even though the repo is public); files served only via short-lived authorized links; the UI never holds storage credentials.
- PII posture = governance-by-disclosure (decision-1): standing disclosure — "upload redacted/sample data, NOT real beneficiary records; ai4good and your volunteer will see these files." Tier-2 (special-category) projects add a hard checkbox gate restating fixtures-only (the NGO connects real data itself, in its own environment, after handoff). No upload scanning in v1 — the NGO owns the risk per the data-responsibility acknowledgment; automated PII/secret pre-scan is a v1.5 option.
- Discovery may cite files in clarifying questions and the scope doc; file names + the NGO's one-line descriptions ride the Discovery context. Reading a file never consumes Discovery credits and never interrupts with a confirm (founder review 2026-07-07 — the daily allowance bounds platform spend); on funded projects file reads consume fuel like any turn.
- The volunteer downloads files from the project page as build reference (the Skill's local sync command is v1.5 — decision-26); the repo template gitignores the standard download path, and files are never committed to the repo — keeps Tier-2/sensitive content out of git history (residual accidental-commit risk at pilot scale is accepted, mitigated by secret scanning + the Tier-2 fixtures-only rule).
- Project page shows a "Reference files" section (name / type / uploader / one-line description); deletes are soft; uploads + deletes audited.

#### REQ-033: Post-Discovery NGO Project Assistant (funded, fuel-metered)
Decision-12: once funded, the NGO keeps chatting past scoping — the same Discovery chat surface reframed as a read-only project assistant: "how's my project going?", open blockers explained, recent progress summarized, fuel runway estimated.
- Available on the project page from in_progress onward (funded, past Discovery); unfunded or pre-scoped projects have no assistant — Discovery is the only NGO↔AI chat.
- Fuel-metered, no free credits: it exists only on funded projects, so every turn is dollar-metered against project fuel exactly like funded Discovery. Each turn shows its cost; the fuel gauge is visible; at fuel-zero the composer disables with the standard "Top up fuel" CTA.
- Strictly read-only (answers from a snapshot of tasks, blockers, fuel/runway, recent activity): it cannot set task status, resolve blockers, accept scope additions, approve handoff, or move money. Asked to change scope or priorities, it explains the scope-addition protocol (REQ-025) and may pre-fill a draft CR — the NGO submits it.
- Reuses the Discovery surface and model — no new chat infrastructure. v1 is on-demand text Q&A only; proactive/push digests and scheduled summaries are v1.5.

#### REQ-034: Task-Level Attribution (telemetry, never gating — decision-22)
Classification (load-bearing): transparency / product telemetry — NOT a security control. Spoofable by design, soft-degrading by design, never gates a request. Purpose: burn-per-deliverable on the NGO panel, per-task cost baselines for fuel estimation, reconciliation precision.
- Every metered AI request may carry a binding to the task being worked; burn is attributed at ledger-write time. Capture ships in v1 (usage recorded unbound is unattributable forever); analysis surfaces trail in v1.5. A request with no resolvable binding floors to "unattributed" — never rejected.
- "Exploration" and "onboarding" are first-class taskless attribution values offered proactively: falsely-attributed burn is worse than unattributed (it corrupts cost baselines).
- Steering is conversational — the volunteer's agent is nudged to know its task context and to pick the matching task when exploration turns into implementation — never enforced by the platform. Ceiling, verbatim: detection and suggestion only, never gating.
- Aggregation boundary: the NGO sees burn per deliverable (money-honesty style: cents, no celebration); per-volunteer-per-task granularity stays coordinator-side only (per-volunteer productivity metering would erode trust). Bimodal per-task costs (hand-driven vs loop-driven work) are a data property, not an anomaly.
- v1: capture + NGO burn-per-deliverable view. v1.5: coordinator reconciliation surfaces (per-project unattributed %, broken/stale-binding signals) + per-task cost baselines feeding Discovery estimates.

#### REQ-035: Post-Handoff Attribution & Jumpstart Health (decision-22; 60/90-day layer trimmed to v1.5 — decision-26/c8, founder-confirmed 2026-07-08)
Closes the freedom-without-guarantee model economically: no gates anywhere — quality becomes visible ex post; reputation is the incentive. Capture ships in v1 (uncaptured data is lost forever); synthesis/matching surfaces land in v1.5.
1. NGO attribution at handoff (v1): sign-off includes an optional free-text testimonial + three required structured dimensions — communication, delivered scope, onboarding into self-service — on a 4-point descriptive scale, credit-framed (~30 seconds). Deliberately NOT a single star score (single-rater scores inflate and measure the relationship, not the artifact). Feeds the volunteer's portfolio (private in v1). Supersedes the earlier "no satisfaction form in v1" deferral; "no public star ratings, ever" still holds. Nothing here blocks handoff.
2. Post-handoff health (v1 = reachability + a structured human check-in; 60/90-day automation is v1.5): the 30-day automated ping stays (reachability-only — "deployed and responding," not evidence of self-maintenance). The longitudinal layer is replaced in v1 by a founder check-in at day 45–60, run as a REQUIRED ops item: the check-in task is created at handoff acceptance (handoff cannot complete without it — owner + due date), the outreach is closed-form and PII-minimizing (six fields only: self-service attempted, worked/failed, URL reachable, failure category, follow-up owner, follow-up due; the message itself instructs never to send screenshots, beneficiary data, secrets, or raw incident detail — privacy/security concerns route to the incident path before details are requested), and any failure gets a follow-up owner with a 2-business-day clock. v1.5 automates 60/90-day checks + real-signal synthesis, designed from what the manual check-ins actually reveal. Health signals never notify the volunteer punitively.
3. Reputation feeds matching (v1.5): attribution + health record become visible during matching; no gates — a volunteer with weak signals still applies, the NGO sees the record.
4. AI-maintainability check (v1.5, signal only — never a gate): optional visible test at handoff — a fresh agent runs realistic change requests against the repo; the result is shown, nothing is blocked.

### P0 (promoted from P1): Required dependencies of REQ-024 / REQ-025 / REQ-026
REQ-013/014/015/016 were drafted P1 but are dependencies of P0 features (blockers, scope additions, PM tasks) — reclassified P0, each shipping a minimal v1 cut with enhancements in v1.5. REQ-017 moves to v2; no P1 work in v1.

#### REQ-013: NGO Dashboard (minimal v1 + v1.5 enhancements)
One view per NGO across all projects — status, fuel, and prominent cadence/progress signals supporting stepwise-funding decision moments (Platform Promise §6).
- v1: project cards (status, % complete from tasks, dual fuel meters, assigned volunteer) with cadence signals per card — last commit, tasks X of Y done, "Now working on: [task]" (the Active/Quiet/Stalled badge is v1.5 with the cadence extras — decision-26/c3). Fuel summary across projects + general balance shown as "$X redeployable credit" (non-cash; no expiry, never removed). "Action needed" rail: open blockers (fuel top-up, Lovable credits, collaborator needed, clarifying questions), pending CRs, and triage decisions awaiting the NGO. (No applicant queue in v1 — matching is concierge, decision-28.)
- v1.5: 30-day activity feed; KYC upsell banner for verified NGOs; Lovable-enabled-projects rail; opt-in NGO testimonial authoring.

#### REQ-014: Volunteer Dashboard + Completion Credit (v1 minimal)
Dashboard plus a completion-credit-only public reputation model: no public star or numerical ratings for volunteers.
- v1 dashboard: current projects with status, dual fuel gauges, in-progress tasks, unresolved blockers/clarifications; key reveal (REQ-009 — the volunteer self-audit usage view is v1.5, decision-26/c1).
- **Public profile + badge deferred to v1.5 (decision-29/r2):** no public profile page or badge display in v1 — its audiences (organic NGOs, algorithmic matching) arrive with the v1.5 marketplace. Completion credit is captured from day one as **append-only per-project events** (volunteer, project, handoff-accepted timestamp, first-tool eligibility) so v1.5 reconstructs the full display without archaeology; at handoff the volunteer gets a private "credit earned" confirmation. Copy is honest: "credit recorded from day one; public reputation display arrives in v1.5" — and every repo is public MIT, so the actual portfolio already exists on GitHub.
- NGO-satisfaction signal collection deferred to v1.5 (arrives with the tips/satisfaction handoff UX): no satisfaction modal at handoff, no admin-visible aggregate in v1; the volunteer never sees their own satisfaction scores (avoids anxiety/gaming).
- v1.5: multi-badge engine (5/10 tools shipped, active contributor, cause specialist); handoff history view; opt-in NGO-authored testimonials; cause-specialization tags.

#### REQ-036: Dev-Authored Project PRD & Completion Gate (decision-25)

**Description:** Discovery output is a scope contract, not a task source. Kickoff seeds the project's Linear workspace with exactly one bootstrap task: the volunteer authors the project PRD in the repo, using the Discovery scope as its source. Authoring is normal metered work — fuel-billed and attributed to the bootstrap task. The volunteer raises clarifying-question blockers (REQ-024) as needed — several clarifications are expected, and they land in the project Q&A log (REQ-010). When the volunteer marks the PRD ready, an automated scorer compares it against the Discovery scope and returns a completion score with named gaps; only a score at or above the platform threshold lets the project progress — the build backlog is then decomposed from the PRD (REQ-026) and the build begins. Below threshold, the volunteer gets the gap list, iterates (more clarifications, PRD edits), and re-scores; iteration is bounded by the project's fuel, not by an attempt cap.

**Acceptance criteria:**
- [ ] Kickoff creates the single bootstrap task ("Author the project PRD"); no build backlog exists before the gate passes.
- [ ] The PRD lives in the project repo; authoring requests are metered and attributed to the bootstrap task (REQ-009/REQ-034).
- [ ] Clarifying questions ride the existing blocker flow (REQ-024) and appear in the project Q&A log (REQ-010).
- [ ] The scorer evaluates coverage of the Discovery scope — user stories, acceptance criteria, data-sensitivity handling, constraints — and returns a score plus named gaps; scoring runs are fuel-metered like any project AI usage.
- [ ] Progress gate: score ≥ platform threshold → the build tree is decomposed from the PRD and pushed (REQ-026); below threshold → gap report to the volunteer and the project stays in the PRD phase. **[DECISION: OD-7 — threshold value + scorer configuration; pilot-tuned.]**
- [ ] The NGO sees PRD-phase status on the project page (bootstrap task + score state). The NGO is not a PRD approver — the gate is the scorer; NGO input flows through clarifications.
- [ ] Score events are recorded and notified (volunteer on gap report; NGO when the gate passes and the build backlog goes live — REQ-016).

**Dependencies:** REQ-004, REQ-024, REQ-026, REQ-034, REQ-009.

#### REQ-015: Per-Project Comment Thread (full Slack-style channel deferred to v1.5 — decision-15)
Each project has a comment thread on its project page for NGO admins, the assigned volunteer, and (when escalated) platform admin. Decision-15 replaces the v1 real-time channel with this thread: a concierge pilot of ~10–15 hand-matched projects coordinates through structured blockers + a comment stream + notifications + email, while a shared free-text back-and-forth keeps the product a warm coordination layer, not an inbox. The full channel returns in v1.5, before organic/EU signup.
- v1: chronological free-text stream; plain text with auto-linked URLs (no markdown, code blocks, attachments, or @-mentions). Loads on page view — no live push; posting notifies the other party. Membership implicit from project roles. System events (funding, setup, fuel-low, handoff, blockers, CRs) never post to the thread — they surface in the notifications + project activity feeds. CR Accept/Decline is an actionable prompt on the CR itself, not a chat message (REQ-025). After handoff the thread is read-only. No cross-project DMs.
- v1.5: real-time channel with threaded replies; @-mentions, presence, typing indicators; markdown, code blocks, image attachments; full-text search. v2+: bridge to a real Slack workspace; video/audio calls.

#### REQ-016: Notifications (Email + In-App)
Event-driven email + in-app notifications with documented defaults in v1; per-user preference UI is v1.5. One shared emitter driven by a single static event taxonomy is the sole writer of notifications — blockers, CRs, and lifecycle events all notify through it rather than sending comms directly.
v1 taxonomy (event → recipients, delivery), condensed:
- Project decisions: triage auto-approved / returned-to-scoped (with reason) / terminally declined → NGO (email + in-app; decision-29/r4); approval is the moment the project becomes marketplace-visible. Vetting outcome (vetted/unvetted) → NGO (decision-29/r3).
- Matching (concierge, decision-28): match created → volunteer (email + in-app, consent CTA); match consented → NGO (email + in-app — "your volunteer is ready; fund to kick off"); match declined/expired → admin (match log); unmatched open project aging → platform admin only in v1 (concierge hand-matching + supply-liquidity nudge, Goal 5).
- Abandonment (REQ-027): inactivity reminder (14d) → volunteer + NGO; project released → NGO + ex-volunteer; rematch available → NGO.
- Money: pre-deadline funding reminder → NGO; funding deadline expired → NGO + matched volunteer; payment succeeded → NGO + volunteer; payment failed → NGO; fuel low 20% → NGO; fuel low 5% and fuel depleted → NGO + volunteer (sessions will be warned/cut; depleted adds admin escalation); leftover credit released to general balance → NGO (no donation event — decision-28); chargeback opened → NGO + admin + ops item.
- Access: virtual key issued (instant at kickoff) / revoked (replacement on dashboard) → volunteer (email + in-app).
- Work signals: task status changed → NGO (in-app low-tone only; no email); task completed → NGO (email + in-app, higher signal); task comment → volunteer (in-app); project-thread comment → the other party (in-app by default; anti-spam guard kept); blockers raised / resolved / aging 48h / aging 7d → NGO email + in-app, volunteer on resolution, admin joins at 7d; PM status auto-reverted → volunteer (in-app only, low-tone — instructive, not punitive).
- Scope additions (v1 informal — decision-29/r1): discussion rides project-thread comment notifications; no dedicated CR events in v1 (the structured CR taxonomy returns in v1.5 with the surface).
- Handoff + health: requested / accepted / rejected → NGO + volunteer; verification outcome → NGO. (The 60-day jumpstart email moved to v1.5 with the health layer — decision-26/c8.)
- Provisioning failure (repo setup failed, workspace pool empty at kickoff) → NGO + volunteer + admin + ops item, plus an urgent replenish alert on pool-empty. Lovable: workspace-setup reminder, credits low, credits blocked (escalation tier), setup-pending auto-raised at kickoff → NGO, setup complete → NGO + volunteer (skip-path events removed per decision-19).
- Deferred to v1.5 with their features: channel mentions, spend-anomaly reviews, auto-top-up events, tip received.
Delivery defaults (v1): email = critical events (money, deadlines, blockers, handoff, decisions); in-app only = low-tone events. One notification per committed event, plainly — the time-window coalescing/dedup machinery is v1.5 (decision-26; gate: reported notification fatigue). Reliability guard for critical events (money, access, handoff — codex-required): the notification event is written atomically with its ledger/state transition via the existing outbox layer, recipients are resolved at event-creation time, and an event is marked sent only on provider acceptance — a claimed-but-unconfirmed send retries rather than silently dropping. Escalation-tier events (credits blocked, provisioning failure, 7-day blocker aging) notify NGO + platform admin. v1.5: per-user preferences (per-event email toggles, quiet hours, digest mode), batching + custom rules.

### Out of v1 / Deferred to v2 — referenced by ID only

#### REQ-017: Post-Handoff Feature Request Surfacing (v2)
After handoff, new repo issues labeled feature-request / bug would surface on the project's ai4good page for other volunteers to find and pick up. Deferred to v2; detailed criteria wait on pilot data (how many handed-off projects attract follow-up requests, and how NGOs want to drive them).

### Nice to Have (P2) — Future Enhancement

#### REQ-018: Discovery Agent — Voice Input
NGOs describe the need via a voice recording the agent transcribes + processes.

#### REQ-019: Multi-Volunteer Per Project
Teams of 2–3 volunteers per project with role splits (frontend/backend/QA).

#### REQ-020: Public Impact Page
Public page per NGO showing all tools ai4good built for them, with usage/impact stats where instrumented.

## Non-Functional Requirements

### Performance

- Latency (p95): marketplace page < 500ms — re-validate this target before launch following the platform migration; Discovery Agent first token < 1.5s; payment webhook handling < 2s end-to-end; code-hosting webhook processing < 5s end-to-end.
- Year-1 load: up to 1000 concurrent marketplace viewers (within the budgeted hosting tiers) and 50 concurrent discovery conversations (bounded by LLM-provider quota).
- Infrastructure budget ~$50/mo for year 1; re-baseline for the two-target deploy.

### Security

- Managed authentication with automatic session refresh. Tenant isolation on all multi-tenant data: NGO records, projects, fuel transactions, task comments, and project files. Rate limiting on the auth, discovery, and apply flows. Signature verification on every inbound webhook, payment and code-hosting alike.
- All provider API keys — payment, LLM, code-hosting, and work-tracking — live in managed secret storage and are never logged. The real LLM key is never issued to volunteers (decision-21); each volunteer holds an individual, revocable credential instead.
- PII minimum-necessary: NGO verification documents encrypted at rest and never publicly accessible. GDPR: right-to-erasure (profile deleted, ledger entries anonymized) plus standard DPA for EU NGOs. PCI: out of scope — all card data handled by the payment processor.
- Append-only audit trail: fuel transactions, project status transitions, role changes, volunteer AI-credential issuance/revocation, and work-tracking webhook-ingest provenance.

### Scalability

- Pilot: 100 NGOs, 200 volunteers, 50 active projects; year 1: 500 NGOs, 1000 volunteers, 200 active projects — within the budgeted managed-service tiers.
- Frontend, backend, and database auto-scale as managed services. Heavy work (webhook fan-out, outbox drain, scheduled scans, AI-request streaming) runs on managed backend functions, scheduled where periodic; standalone compute is retained only as an escape hatch for jobs that exceed managed-function limits.

#### Anthropic workspace-cap scale path — RETIRED by decision-21

- Decision-21 eliminated per-project provider workspaces, so workspace count no longer grows with project count and the provider's workspace cap never binds. Remaining provider-side concern: org-level rate/quota limits, which are monitored.

### Reliability

- Uptime 99.5% (~3.6 hours/month — a realistic small-team target). RTO 4 hours; RPO 24 hours — both grounded in restore from the managed database's point-in-time recovery.
- Application errors and structured logs captured centrally; alerts on error-rate spikes.

### Accessibility

- WCAG 2.1 AA; keyboard navigation across all flows; automated accessibility checks on every change plus a manual screen-reader pass before launch; color contrast >= 4.5:1.

### Compatibility

- Browsers: last 2 versions of Chrome, Firefox, Safari, Edge. Responsive web (mobile, tablet, desktop); no native mobile apps in v1. English only at launch — i18n is Phase 3, out of scope for v1.

---

## Technical Considerations

### System Architecture

Lovable-owned web frontend on a Supabase backend; Stripe for fuel payments; a GitHub App for repository provisioning and commit/PR event ingest; Linear as the task-coordination system of record; Anthropic as the LLM provider. Volunteer builds reach Anthropic only through the ai4good LLM gateway on per-project virtual keys (REQ-009, decision-21): the gateway enforces spend caps and a real-time project-fuel gate, injects the governance prompt, meters fuel per request, and alone holds the real provider key; request bodies are inspected transiently, never persisted; gateway hosting is an open decision (OD-6). Platform-side AI — the Discovery Agent and the post-Discovery assistant (REQ-033), both Opus (decision-13) — calls Anthropic directly. A volunteer's two data paths, LLM usage and task coordination, are disjoint and touch only at the task-ID binding (REQ-034). Each project gets one platform-owned Linear workspace (decision-20) that never transfers at handoff; the NGO-visible task panel is a read-only mirror of Linear, task status moves on PR merge via Linear's GitHub integration, and out-of-band status edits are auto-reverted with an explanatory comment (REQ-026). GitHub Issues are not written or managed by ai4good in v1 — they stay dev-internal (REQ-008). Supabase, Stripe, Anthropic, the gateway, and GitHub are hard dependencies with defined user-visible degraded states; a Linear outage only stales the NGO panel — volunteers keep working and the mirror catches up. Greenfield build; no data migration.

### Technology Stack

- Frontend: TanStack Start (SSR) — React, TanStack Router + Query, Tailwind CSS, shadcn/ui. Lovable owns and syncs the frontend repo.
- Backend: Supabase — Postgres with RLS, Auth, Storage, Realtime; Edge Functions (Deno) for webhooks, mutations, and streaming; pg_cron for scheduled jobs; Drizzle ORM for application queries.
- Attachments: S3-compatible object store (Cloudflare R2) for NGO project files (REQ-032); access only through short-TTL signed URLs minted after a membership check.
- Payments: Stripe — Checkout, webhooks, Stripe Tax (EU VAT invoices).
- AI: Anthropic — Opus for Discovery and the assistant (decision-13); volunteer traffic exclusively via the LLM gateway on virtual keys (decision-21).
- Task coordination: Linear — one free workspace per project from a pre-created pool (workspace creation is manual; Linear exposes no creation API); webhooks feed the platform's read-side mirror; agents connect via Linear MCP.
- VCS: GitHub App for org/repo setup and push/PR webhook ingest (cadence stats and commit-to-task linkage).
- Observability: Sentry (errors), Axiom or Logflare (logs), Lovable analytics; golden-signal paging on the gateway (REQ-029).
- CI/CD: GitHub Actions for test/lint; frontend deploys via Lovable, backend via Supabase CLI.

---

## Implementation Roadmap

**Headline estimate (post decisions 20/21/22 — authoritative): ≈ ~420h core / ~530h buffered → ~14-17 weeks for 2 engineers.** Add 4-6 weeks of pilot operations (3 internal full-cycle projects) before public beta. Honest kickoff-to-public-beta total: ~5 months for a 2-engineer team, ~7-8 months for one engineer.

v1 stays shippable in this range only with the §11 scope cuts. The authoritative build decomposition lives in Linear (decision-20); the phases below are an overview, not a task list. Phases 1+2 = MVP launch; 3 = dashboards, comms & platform operations; 4 = pre-launch hardening; 5 = public beta + concierge launch.

- **Phase 1 — Foundation (weeks 1-3):** Auth, NGO org profile + verification review, volunteer profiles, admin review queue, logging baseline; nothing user-facing public. Exit: a test NGO and volunteer sign up, complete profiles, and an admin marks the NGO verified.
- **Phase 2 — Core MVP (weeks 4-7):** One project end-to-end in lifecycle order: intake → credit-metered Discovery → editable scope → publish/triage → marketplace listing → apply/accept → **fund-on-match** (not fund-on-publish) → repo + workspace provisioning → fuel-metered build with fuel-low blockers → deploy to a live URL → handoff with attribution step. Exit: a real NGO + volunteer complete a project through to a deployed, reachable live URL, with the handoff ritual executed.
- **Phase 3 — Dashboards, Comms & Platform Operations (weeks 8-10):** v1-minimal NGO and volunteer dashboards, per-project messaging, notifications, admin audit viewer, first volunteer badge, observability + alerting, incident response + admin money-correction console, content moderation, abandonment/rematch. v1.5 enhancements (§11) explicitly out. Exit: 3 pilot NGOs + 5 pilot volunteers run entire engagements in-platform with no out-of-band Slack/email, and ops corrects a money error with the books staying balanced.
- **Phase 4 — Hardening & Beta Launch (weeks 11-13):** Test coverage to 80%, end-to-end journey tests, accessibility fixes, vulnerability and penetration review, tax/VAT invoicing, GDPR erasure, rate limiting, performance pass, onboarding emails, public landing page. Exit: no critical pen-test findings; p95 marketplace < 500ms at 100 RPS; accessibility checks pass in CI.
- **Phase 5 — Public Beta & Concierge Launch (weeks 14-16):** Launch checklist, invite-only → open rollout, internal goals analytics, concierge supply-funnel tooling, aging-open-project nudges, hand-match tool for the first ~10-15 projects, v1.5 spec + backlog prioritization + retrospective. Exit: 10+ projects in flight, ≥1 public-beta handoff, and ≥1 handed-off project still reachable at its live URL 30 days post-handoff.

---

## Out of Scope

1. **ai4good AI Proxy** — no longer out: ships in v1 as the LLM gateway (decision-21, REQ-009) with token validation, per-token velocity and budget caps, a real-time fuel check, per-request audit metadata, instant token rotation, plus a fingerprint tripwire and governance-prompt injection the original design lacked; the real Anthropic key is never exposed to volunteers. Audit metadata per request (timestamp, IP, User-Agent, endpoint, payload size, Anthropic cost, fuel delta) feeds anomaly detection; request bodies are never persisted. Default request policy: message calls, token counting, file upload, and model listing are allowed; endpoints that create persistent Anthropic-side resources and all DELETE operations are blocked by default; batch submission is per-project opt-in. Allowlists beyond these defaults, payload size bounds, and IP/geo/User-Agent anomaly flags defer to v1.5. Known limits: the gateway cannot verify a prompt is project-related, lock a token to one machine, or stop a determined attacker holding a token — caps plus rotation bound the damage. Hosting is an open decision (OD-6).
2. **Crypto / on-chain tokens** — Fuel is Stripe-backed fiat credits only; no tradeable token, no on-chain ledger.
3. **Native mobile apps** — web-responsive only; iOS/Android not on the roadmap.
4. **i18n / multi-language UI** — English only at launch.
5. **Multi-volunteer teams per project** — one volunteer per project in v1; team support is v2.
6. **Embedded IDE / web-based code editor** — volunteers use their own Claude Code / Lovable; no hosted editor.
7. **NGO-to-NGO tool sharing marketplace** — repos are public, but no curated "fork this for your NGO" experience.
8. **Anonymous / unvetted NGOs publishing** — all publishing NGOs must be founder-vetted (v1; document-verified via the v1.5 pipeline).
9. **Automated NGO verification** — manual review by platform admin in v1.
10. **Hosted production environment for built tools** — volunteer/NGO decide where to deploy; ai4good does not run their infrastructure.
11. **Public star ratings for volunteers** — excluded; volunteer reputation is completion credit + badges only; NGO satisfaction is captured privately (v2 matching weight) and never displayed — protects volunteer motivation and prevents rating-anxiety/retaliation cycles.
12. **Platform skim on tips** — handoff tips (REQ-022) flow NGO-to-volunteer with 0% platform cut; skimming gratitude is off-brand.
13. **Pay-gated Discovery in v1** — Discovery is free up to a per-NGO daily credit allowance (10/day unverified, 30/day verified; resets daily at 00:00 UTC, no rollover — decisions 8/11); when an unfunded project exhausts the day's credits the NGO can verify (raising the allowance), fund the project's fuel to continue immediately (REQ-006), or wait for the next refill; a funded project's Discovery draws on its fuel from the outset ("Funded → all-$"); daily amounts may be revisited if abuse exceeds the grant.
13a. **Paid "Discovery wallet"** — out for v1 and v1.5 (decision-8): no separate Discovery credit product or wallet; the post-allowance path is the regular project-fuel purchase flow, deliberately keeping the money model single-pot.
14. **ai4good-funded Lovable infrastructure** — the NGO owns and pays for its Lovable workspace directly and Lovable consumption is never billed against fuel; the platform does meter and cap Lovable usage per task and surfaces the NGO's Lovable credit balance during orchestration (REQ-021/028).
15. **Multi-tool fuel metering** — fuel covers Anthropic (Claude Code) only; other tools are NGO-direct or volunteer-personal expenses unless they ship metering-compatible APIs.
16. **Lovable credit reselling through ai4good** — NGOs buy Lovable credits from Lovable directly; ai4good provides only a deep-linked "Top up" CTA; reselling would require a reseller agreement, tax pass-through, and refund integration (v2 trigger: signed Lovable partnership).
17. **Service-level agreements / completion guarantees** — none; volunteers may ghost, AI may consume fuel without a working deliverable, scopes may prove infeasible; the platform bounds financial risk (per-project fuel caps) and surfaces stalls but does not underwrite outcomes.
18. **Closed-source / proprietary builds** — all projects are open-source under MIT (or a compatible permissive license) by default; closed-source requests are not served.
19. **Fuel-spend insurance / refund-on-no-deliverable** — consumed fuel is not refundable even if the project never ships (spent tokens cannot be un-spent); NGOs are warned of this at every top-up.
20. **Fully-automated Anthropic key provisioning** — moot (decision-21): no per-project Anthropic keys exist; virtual keys are issued automatically at kickoff.
21. **Per-request prompt/response content capture** — permanently out (privacy posture): the v1 gateway records per-request metadata only (tokens, model, timestamps, cost); request bodies are inspected transiently and never persisted; the decision not to surveil is deliberate and on the record.
22. **Anthropic-side "agent budget" enforcement** — moot (decision-21): per-project workspaces are deleted; enforcement is structural at the gateway (per-key caps + the real-time fuel gate).
23. **OpenTelemetry prompt-content export from Claude Code** — ai4good does not request, process, or aggregate prompt-content telemetry from volunteers (privacy posture); volunteers may use OTel independently for their own observability.
24. **Decision-10 v1.5 deferrals (gate: before organic/EU signup)** — full rate-limiting (v1 keeps per-IP and per-surface throttles); gradual-rollout mechanism (v1 launches allow-list + don't-advertise, with a waitlist landing page); internal analytics dashboard (v1 uses a handful of internal reports); supply-funnel CRM + hand-match tool (first cohort hand-matched manually); content-takedown UI (REQ-031 — v1 keeps secret-scanning + push-protection); multi-jurisdiction tax registration (v1 keeps automated tax calculation, hosted invoices, tax-ID field); self-serve GDPR erasure/export UI (v1 keeps consent, sub-processor list, and a manual erasure runbook; no EU/public signup until self-serve lands); performance caching and load/quality CI gates; the multi-org Anthropic router is retired outright (decision-21).
25. **Automated PII / secret pre-scan on uploaded reference files (REQ-032)** — v1 is governance-by-disclosure (the NGO acknowledges the data-responsibility rule; ai4good does not scan); v1.5 trigger: an observed incident of sensitive data uploaded against the disclosure, or EU/public signup.
26. **Automated spend-anomaly detection engine (REQ-009)** — deferred to v1.5 (decision-14): v1 keeps deterministic loss caps (no cash-out, the $200 first-fund cap, per-key caps + the gateway's real-time fuel gate), the NGO's instant "revoke access now" action, and daily human review of the money dashboard; automated scoring only reduced detection latency, which does not bind at the concierge pilot's ~10–15 hand-vetted projects; if built, it lands as a gateway escalation rung; v1.5 trigger: organic/EU signup.

---

## MVP Scope & Post-MVP Roadmap

This is the authoritative scope/roadmap reference: the Out of Scope section says what will not be built; this section says when features ship.

### v1 MVP (public beta launch)

**Decision summary (2026-06-03 pivot + decisions 8–22; where entries conflict, the later decision wins):**
- **Pivot (2026-06-03)** — The deliverable is a deployed, NGO-self-maintainable tool, not a repo; Track A (NGO maintains via chat; Lovable is the build vehicle and durable home), with Discovery classifying the track. Data governance by disclosure: Discovery records data-sensitivity tiers; the highest tier is fixtures-only-during-build; triage enforces. No cash-out: fuel is non-cash, project-scoped credit (stays on the project; donate or keep) — removes payout, cash-refund, and money-transmission rails. Nonprofit entity + blended economics; a real Terms of Service. Concierge-first launch. New v1 REQs: REQ-027 (abandonment/rematch), REQ-029 (observability), REQ-030 (ops/incident + admin money-correction), REQ-031 (content moderation/takedown/secret-scanning).
- **8 — Unified fuel + free Discovery allowance.** NGOs and volunteers both consume project fuel; funding is allowed from draft onward; Discovery is free up to a per-NGO daily credit allowance (10/day unverified, 30/day verified). Email verification is the floor for any Discovery message; org-document verification is the wall for publishing to volunteers. First funding and first match acceptance each trigger their own hard acknowledgment. No paid Discovery wallet in v1 or v1.5.
- **9 — Git-as-truth PM tree.** Reversed by decision-20; retained only as decision trail.
- **10 — Capability-preserving build trim.** Six reshapes of implementation shape with every v1 requirement intact; deferred to v1.5: concierge supply-funnel CRM + hand-match tool (first cohort matched manually), rate-limiting infrastructure, gradual-rollout tooling, analytics dashboard, report/takedown UI, multi-jurisdiction tax registration, self-serve data-erasure UI (manual runbook kept).
- **11 — Two-layer money.** Funded fuel stays dollar-pegged (15% skim unchanged; no subscription). The free pre-fuel Discovery phase uses an abstract, context-weighted credit: long conversations and uploaded reference files (REQ-032) cost more, cached content costs less, and output regenerations and system-error retries are free. The allowance is a daily drip with no rollover; verification triples it (10 → 30/day). Transparency: a credit gauge, per-turn cost display, and a cost estimate shown before a file is ingested — credits are a free grant, never silently removed (a free grant also carries no stored-value/escheatment exposure). Funding a project flips its Discovery to dollar-metered fuel automatically; the free pool serves only unfunded projects (credits are NGO-bound, fuel is project-bound). At daily exhaustion the NGO can verify, fund to continue now, or return tomorrow — the UI says "keep going now," never "go faster."
- **12 — Post-Discovery NGO project assistant (REQ-033, new in v1).** A funded project unlocks an ongoing, fuel-metered, read-only NGO↔AI assistant that answers "how is my project going?" from tasks, blockers, fuel runway, and recent activity. It never mutates tasks, approves handoff, or accepts scope (changes route through Change Requests). No free credits — it disables at fuel zero with a top-up prompt. Proactive/push agents v1.5.
- **13 — Opus for Discovery + the assistant.** Discovery is the highest-leverage reasoning step — its scope drives the whole build — so the strongest model de-risks every downstream volunteer hour. Cost is bounded: Discovery is short and one-time, the daily allowance caps worst-case spend, and the credit unit is model-agnostic so allowances stay 10/30 (the per-credit subsidy is deliberate acquisition spend). The funded assistant's cost passes through to the NGO.
- **14 — Automated spend-anomaly engine deferred to v1.5.** The loss ceiling holds without it: no cash-out, first-fund cap, spend caps, fuel-zero cutoff, and a manual rotate-key action mean a leaked key only ever buys bounded compute. The engine only reduced detection latency, which does not bind at pilot scale with daily founder review. Reinstate before organic/EU signup.
- **15 — Project comms trimmed to a comment thread.** v1 keeps one project-level comment thread; the full channel (real-time, threads, @-mentions, search) is v1.5. System events go to the notifications and activity feeds, not chat; CR Accept/Decline surfaces on the CR row on the project page.
- **16 — Change-Request anti-distraction guardrails** *(surface deferred to v1.5 by 29/r1; the principle governs the v1 informal protocol)*. Volunteer churn is the #1 supply risk, so CRs are opt-in and never interrupt: a low-tone notification with no per-CR email, and only Accept creates work. One open CR per project at a time; Decline is penalty-free and the protected default; the NGO sees expectation-setting framing at submission ("optional; the volunteer decides; adds scope, time, and fuel").
- **17 — `paused` state removed from v1.** At pilot scale a pause is a support conversation: pre-match the NGO unpublishes or cancels; mid-build an admin turns off access and leaves a note, or the project is cancelled. Pause/resume returns in v1.5 on the first real request.
- **19 — Track B deferred to post-v1** *(superseded by decision-23)*. v1 builds Track A only; non-Track-A needs are waitlisted at Discovery; 100% Lovable dependency accepted.
- **23 — Single delivery model; Track B removed altogether (2026-07-07).** Supersedes 19's deferral: the track taxonomy is deleted, not parked. One model — NGO-self-maintainable tool, Lovable durable home, Claude-Code-orchestrated build. The developer-grade waitlist is deleted; needs failing the maintainability fit check are declined at Discovery with plain messaging, each decline recorded for founder review (visibility only — no queue, no re-engagement promise).
- **24 — Review-batch corrections (2026-07-07, founder line-comments on prd-new).** (a) Kickoff decomposition is gated, not instant: the draft tree goes live only after coordinator review (OD-1) — kickoff has no admin ops tasks but exactly one human gate *(this half superseded by 25: the gate is now the automated PRD completion score)*. (b) The Claude Code Skill ENFORCES pull-then-complete: explicit task-or-exploration binding before substantial work (attribution context always present); completion is an explicit dev act that drives the merge flipping status. (c) The handoff repo-transfer step is removed — the repo stays in the platform org permanently (MIT + Lovable two-way sync already make ownership real). (d) Discovery file attachment/reads never consume credits and never interrupt — the daily allowance is the platform-spend ceiling.
- **32 — Manual-flows session, verdicts through #20 (2026-07-08, founder one-by-one rulings; #21–#25 pending).** Also POSTPONED post-MVP: #17 counsel deliverables (pilot runs on the un-reviewed plain-language draft ToS, risk accepted), #18 Anthropic commercial negotiation (standard self-serve billing carries the pilot), #19 formal P&L + runway cadence (daily money dashboard suffices at pilot), #20 Linear written blessing (pool scale-out gate; paid tier is the fallback). APPROVED as the human backstop family: #3 chargeback adjudication, #12 Discovery-failure escalation, #13 outbox DLQ, #14 incident command (3 runbooks + cards; steps to be scripted one-click), #15 blocker 7-day rung. REMOVED: #2 credit grants, #4 collusion, #5 AUP saga, #7 audited-reversal requirement, #8 handoff-dispute review, #9 goodwill refund, #10 human ledger correction. MOOT: #6 (public-only, d27). POSTPONED to later stages: #11 chargeback reserve; #16 DMCA registration/escalation docs (the CSAM statutory reporting duty itself exists by law regardless of documentation).
- **31 — Ledger corrections fully automatic (2026-07-08, founder — flow #10 removed).** No human correction step: the tight-cadence reconciliation auto-conforms the ledger to provider truth under a deterministic hierarchy (Stripe wins money-in; Anthropic wins AI spend; pairing arithmetic resolves internal gaps), auto-posting through the guarded idempotent function with audit rows and dashboard visibility. The founder is informed, never asked. Backstop: undecidable drift (provider data missing/contradictory) is never guessed — books stay untouched, it pages. Supersedes the d26/c12 admin-invoked correction procedure.
- **30 — Provider truth drives the money gauges, tightly checked (2026-07-08, founder).** The fuel gauge reflects Anthropic's own reported usage (each gateway response carries Anthropic's token counts — real-time by construction, tighter than any poll); aggregate reconciliation against Anthropic's usage/cost reporting moves from nightly to a tight pull (minutes, pilot-tuned); internal arithmetic control totals stay nightly. Lovable: v1 = manual widget + consent-based session reads (no scoped API exists — Q7); STANDING TRIGGER — when Lovable exposes programmatic usage data, the meter switches to pulled provider data on the same cadence, no new decision needed. Also flow #9: the goodwill-refund valve REMOVED — zero refunds of any kind in v1; a wronged NGO is made whole in spendable general-balance credit; the only money-out surface is Stripe's own dispute rail.
- **29 — Third MVP-cut round + flow verdicts (2026-07-08, founder rulings).** Flow session: #7 audited-reversal requirement removed; #8 handoff-dispute review + rejection-loop cap removed (support conversation at concierge scale). Suggestion round 3 (codex-evaluated): (r1) structured Change Requests → v1.5, amending decision-16 — v1 is an informal comment-thread protocol with the d16 principle intact (task-created-before-spend, top-priority-or-acknowledged, one discussion at a time, sensitivity changes re-triage); (r2) volunteer public profile + badge → v1.5 — credit captured as append-only per-project events from day one, private confirmation at handoff; (r3) verification machinery → ONE audited founder-vetted action (no public "verified" claim; public-evidence-preferred, PII-minimizing; pipeline returns before any non-concierge admission); (r4) **founder redesign: automated triage screener** — confident-clean auto-approves with an auto-written audit record, Tier-2 never auto-approves, non-decided → founder exception queue with return-to-scoped vs terminal-decline semantics, auto-approvals spot-checked in the daily review (threshold = OD-8); (r5) REJECTED — the in-app notification center stays in v1.
- **28 — Second MVP-cut round, codex-evaluated (2026-07-08, founder rulings).** (s1) Organic marketplace deferred to v1.5: v1 matching is concierge with **admin enforce-match** (founder call — binding, no NGO approve/decline; volunteer consents with one click, firing the first-match disclaimer before any access; the NGO's per-match acknowledgment rides the funding screen); public read-only project listings stay; a lightweight admin match log feeds Goal 5. (s2) Single-seat NGO accounts (invites/roles v1.5) with authority-attestation, no-shared-credentials copy, an audited contact-transfer action, and an escalation contact — plus the founder extension: **single-dev projects** (exactly one volunteer per project; teams post-v1). (s4) The leftover-fuel **donation flow is removed entirely**; leftover credit auto-applies at any of the NGO's funding checkouts (satisfying the $50 minimum), release is a ledger operation under nightly control totals. REJECTED by founder: s3 US-only pilot (EU/UK VAT + Stripe Tax stay v1), s5 Google OAuth cut (stays v1).
- **27 — Public-only v1; private repos/visibility removed (2026-07-08, founder).** The entire private-project feature is dropped from v1 — every project is public MIT, no visibility choice, no Private badge, no private-repo justification/triage path, no restricted project-page view. A need that requires a private/confidential codebase is declined at Discovery (a future feature). This is orthogonal to data sensitivity: Tier-2 sensitive *data* is still served via the fixtures-only rule (public code, real data connected post-handoff, never in the repo). The org-namespace guard (member repos born private, flipped public after setup validation) and the founder break-glass repo-hide (emergency takedown) are retained as admin mechanics, not user features.
- **26 — MVP simplification pass, codex-debated (2026-07-08).** Twelve cuts proposed, each adversarially debated with codex (max 3 rounds; codex conceded every core cut, forcing only minimal guards): cadence stats minimal; skill-overlap badges → plain tags; cash-buffer alert → treasury policy; canary + self-audit view → v1.5 (org-settings guard replaces the repo-abuse monitor); notification batching/dedup/digests → v1.5 (atomic-outbox + provider-acceptance guard for critical events); blocker matrix stays uniform (per-instance action-owner + Tier-2 warnings added); observability = one money dashboard + pagers, with the metering audit invariant extended to ALL billable AI surfaces; runbooks 6 → 3 + incident cards (breach card hardened); reference-file sync command → v1.5; money corrections via one privileged idempotent validating function, no UI. Plus founder verdicts folded: collusion detection removed, admin extra-credit grants removed, AUP suspension saga → plain deactivate + revoke (machinery v1.5). Founder resolutions (2026-07-08): c7 assistant deferral REJECTED — REQ-033 stays in v1, decision-12 stands (the assistant survived its own adversarial review); c8 CONFIRMED — decision-22 amended: 30-day reachability ping + attribution stay v1, the 60/90-day layer and its email move to v1.5, replaced by the structured day-45–60 founder check-in (required ops item, PII-minimizing closed form).
- **25 — Dev-authored project PRD + automated completion gate (2026-07-08).** Discovery no longer feeds decomposition directly. Kickoff seeds one bootstrap task: the volunteer authors the project PRD from the Discovery scope (clarifications via REQ-024). An automated scorer measures the PRD's completion against Discovery and gates progression; the build tree is decomposed from the gated PRD (new REQ-036). The per-kickoff coordinator decomposition review retires to a pilot spot-check. Threshold + scorer configuration = OD-7. This applies the platform's own build methodology to its projects: source contract → authored PRD → evaluator gate → decomposition.
- **20 — Linear replaces the git-as-truth PM tree (reverses decision-9)**, for the product and the ai4good buildout itself. Ground: real signals, not AI-authored narratives. One free Linear workspace per project, assigned from a pre-created, concierge-replenished pool (workspace creation is manual-only). Coordinator-owned decomposition: automation drafts, a human approves; briefs are session-sized and dependency-ordered. Pull-based volunteer self-assignment is the commitment signal. Task status moves only via the GitHub integration on PR merge; agents may read, comment, and self-assign but never move status — violations are detected and reverted. NGO visibility stays panel-only (no Linear seats); the tree is snapshotted into the repo at handoff; coordination infrastructure is platform-owned and never transfers at handoff (delivery infrastructure — Lovable, repo — is NGO-owned).
- **21 — LLM gateway with virtual keys in v1 (rewrites REQ-009).** Each volunteer gets a show-once virtual key per project; the real provider key never leaves the platform. Per request the gateway enforces spend caps (per-request + rolling 24h), a real-time fuel gate, a check that traffic originates from the sanctioned setup, governance-prompt injection, and per-request metering, with instant revocation. Eliminates per-project provider workspaces, manual key operations, and usage polling. Privacy: prompt bodies are never persisted — only token counts, metadata, and score/boolean signals. An escalation ladder is documented, not built. Gateway hosting is open decision OD-6.
- **22 — Attribution + transparency capture in v1 (new REQ-034/035).** Every spend record binds to a task where derivable — telemetry that never gates work, with exploration/onboarding recognized as first-class buckets. The NGO sees burn per deliverable; per-volunteer granularity stays coordinator-side. Handoff gains an attribution step: a testimonial plus three credit-framed dimensions (consciously supersedes the "no satisfaction form in v1" deferral; never a public star score), plus 30/60/90-day jumpstart health from real signals with a 60-day "did you try?" confound question. Rationale: uncaptured data is lost forever. Matching/synthesis surfaces v1.5.

**Launch strategy — concierge-first:** supply liquidity is the #1 launch gate; do not open organic browse first. Pre-recruit a ~20–30-volunteer bench, hand-match the first ~10–15 curated NGO projects end-to-end to prove the loop produces deployed tools, then open organic browse. Supporting v1 hooks: the supply-funnel metric, the unmatched-project aging nudge, admin concierge-match tooling. Referral loop v1.5.

**Foundation:**
- REQ-001 — Auth: email + GitHub + Google.
- REQ-002 minimal — NGO verification by manual admin review of an uploaded document; KYC tier + automated identity verification v1.5.
- REQ-003 — Project Need intake.
- REQ-007 — Volunteer profile + marketplace.
- REQ-011 minimal — Volunteer applies; NGO accepts or declines. v1 shows skill- and cause-tag overlap badges only; numeric match score + breakdown UI v1.5.

**Discovery & Publishing:**
- REQ-004 — Discovery Agent: free within the daily credit allowance; outputs a complexity tier only, no dollar estimate.
- REQ-005 — Scope doc + publishing into triage.
- REQ-023 — Human triage gate, 48h SLA; every NGO passes through it in v1 (no KYC auto-approval).

**Funding & Money:**
- REQ-006 — Stripe top-up + fuel ledger + match-to-fund under the non-cash, no-cash-out model. Leftover releases to the general balance and auto-applies at future checkouts (no donation flow — decision-28); chargeback handling, reserve, and first-fund caps included. No payout, cash-refund, payee-KYC, or AML rails in v1. Auto-top-up v1.5.
- REQ-022 — Deferred: tips v1.5; v1 has no tips UI at handoff.

**Project Execution:**
- REQ-008 — GitHub repo per project inside the platform-owned org; dev-internal issues only.
- REQ-009 — LLM gateway per decision-21; automated spend-anomaly detection v1.5 (decision-14); gateway hosting = OD-6.
- REQ-010 — Single-view project page + cadence stats + dual fuel meters.
- REQ-021 — Lovable is the deliverable vehicle; Claude Code orchestrates it behind a driver abstraction with a per-task credit cap, audit logging, and a manual dual-rail fallback; manual status widget retained; inbound email parser v1.5.
- REQ-024 — Orthogonal blockers + task-anchored clarifications, including collaborator-access requests for the fallback rail.
- REQ-025 minimal — Change Requests captured and surfaced as an actionable row on the project page plus a notification; volunteer Accept/Decline with note; Accept creates one top-priority task. Full CR workflow UI v1.5.
- REQ-026 — Platform task management via Linear per decision-20; no platform-hosted task server; no in-repo task file.
- REQ-028 — ai4good Claude Code Skill, the core orchestration shell: install, session bootstrap, task binding, slash commands, branch/magic-word convention, plus the Lovable orchestration layer (build-vs-local triage, per-task budget guardrails, quality loop, consent gate, audit reporting).
- REQ-034 — Task-level attribution per decision-22: telemetry that never gates work; NGO burn-per-deliverable view; reconciliation surfaces v1.5.
- REQ-035 — Post-handoff attribution at sign-off (v1) + 30-day reachability ping (v1) + structured day-45–60 founder check-in as a v1 ops commitment; 60/90-day automated health + matching/synthesis surfaces v1.5 (decision-26/c8).

**Comms & Dashboards (minimal v1 versions):**
- REQ-013 minimal — NGO dashboard: project list + fuel + task progress + "Action needed" rail. Activity feed, KYC upsell, Lovable rail, testimonials v1.5.
- REQ-014 minimal — Volunteer dashboard: current projects + fuel gauge + completion credit; no badge engine in v1.
- REQ-015 — Project-level comment thread on the project page; system events go to the notifications feed; full channel v1.5 (decision-15).
- REQ-016 minimal — Event notifications with fixed defaults; per-user preference UI v1.5.

**Handoff:**
- REQ-012 minimal — Automated checklist + sign-off; repo permission adjustment (no org transfer); volunteer access termination (virtual key + task-workspace membership) + task-tree snapshot; includes the REQ-035 attribution step. Tip flow v1.5.

### v1.5 (3-6 months post-launch)

Each item ships on pilot operational pain or its named trigger:
- Move funds between projects — NGOs accumulate idle credit on finished projects and ask to redeploy it.
- Project pause/resume — first real NGO pause request (v1 workaround: unpublish pre-match; admin access-off with a note, or cancel, mid-build).
- Replit as a second sanctioned builder platform — an ownership-transfer need Lovable cannot meet, or Lovable reliability falters.
- Volunteer referral loop — the concierge cohort proves the loop and organic supply needs compounding.
- Auto-top-up — pilot NGOs report fuel-low interrupts as friction; adoption when pitched manually exceeds 30%.
- Tips via payment-provider onboarding — first handoff where an NGO asks how to thank the volunteer with money.
- Full Change-Request workflow UI — pilot NGOs find the minimal CR surface too thin.
- Match-score algorithm + breakdown UI — "why did this show up for me" feedback; more than 20 active marketplace projects.
- Reputation surface in matching (attribution + jumpstart health visible) — the v1.5 remainder of decision-22.
- Attribution reconciliation surfaces — coordinator wants unattributed-share visibility and per-task cost baselines feeding Discovery estimates.
- Gateway residual hardening (ledger reconciliation, allowlists, payload bounds, velocity checks) — real ledger anomalies; required before organic signup.
- Linear wrapper layer — detect-and-revert proves noisy (agents keep tripping status changes).
- NGO KYC tier + automated identity verification — the verification queue outgrows one admin's batch capacity.
- Lovable inbound email parser — manual widget toggling proves annoying; the email format is stable across 2+ projects.
- Channel enhancements (threaded replies, presence, search, image attachments) — the minimal thread feels lacking.
- Per-user notification preferences UI — first complaint about email frequency.
- Richer dashboards (activity feed, badge engine, opt-in testimonials, KYC upsell) — engagement metrics show demand for more reputation surface.
- Lovable-only mode + a kickoff path without Anthropic fuel — Lovable-only-suitable projects appear at meaningful volume.
- AI Change-Request Agent — NGOs find the raw CR flow too thin and need help articulating.
- Second spend-anomaly signal (provider alert emails) — the first high-spend anomaly detection misses.
- Triage attestation + spot-check — triage median age exceeds 24h or weekly admin triage time exceeds 5h: NGOs self-attest at publish and go live immediately, with a 10–20% random spot-check and a revoke-on-violation flow.

### v2 (6-12 months post-launch)

Bigger architectural changes or items dependent on ecosystem shifts outside ai4good's control:
- REQ-017 — Post-handoff feature-request surfacing — enough handed-off projects to surface.
- REQ-018 — Discovery voice input — typing-friction feedback.
- REQ-019 — Multi-volunteer per project — project complexity outgrows the single-volunteer model.
- REQ-020 — Public impact page per NGO — enough shipped tools to populate it.
- Automated NGO verification via charity-registry APIs — the manual review queue outgrows one admin.
- KYC auto-approval at triage — volume shows KYC-verified NGOs reliably pass.
- Lovable real-time credit status — requires Lovable shipping scoped OAuth or billing webhooks; verify before building.
- Lovable credit reselling — requires a signed reseller agreement (tax and refund pass-through).
- External Slack integration — NGOs already on Slack want project comms mirrored into their workspace.
- Anonymous post-handoff contributors — drive-by fixes from non-registered developers appear.

### v1 design rationale: Claude Code orchestrates Lovable (v1 architecture)

The volunteer's local Claude Code runs the ai4good Skill, connected to Linear (tasks) and Lovable (build) plus the platform API (context, blockers, comments). It pulls the next task, decides Lovable-vs-local, prompts Lovable, reviews the output, tests, and iterates; task status lands only on PR merge, never by agent say-so.

Why: single source of intent (the volunteer's session is the canonical record, so platform metering, scope enforcement, and audit stay authoritative); structural cost enforcement (Lovable build messages bill the NGO's workspace, so the mandatory per-task credit cap, call logging, and NGO balance surfacing sit at the point of spend); per-volunteer Lovable identity (individual audit; cross-workspace scope bounded by invitations); contained research-preview risk (the driver abstraction + manual dual-rail fallback mean a Lovable breaking change degrades to manual work, never a dead build; orchestration validated on 1–2 real pilot projects). Deferred: Replit as a second builder platform (v1.5); zero-touch fully-autonomous orchestration (v2).

### Permanently out of scope (will not build)

Firm "no" — listed to prevent re-litigation:
- Crypto, on-chain tokens, tradeable fuel — Stripe-backed fiat only.
- Native mobile apps — web-responsive only.
- Closed-source / proprietary builds — all projects MIT-licensed open source by default.
- Service-level agreements / completion guarantees — contradicts the Platform Promise.
- Fuel-spend insurance / refund-on-no-deliverable — spent tokens cannot be un-spent; contradicts the Promise.
- Platform skim on volunteer tips — explicitly 0% on tips.
- Hosted production environment for NGO-built tools — handoff is to NGO ownership.
- NGO-to-NGO tool-sharing marketplace — out of mission scope; OSS forking happens on GitHub naturally.
- Multi-tool fuel metering — only Anthropic spend routes through fuel; other tools are NGO-direct or volunteer-personal.
- Collection of volunteer prompt content — privacy posture.

### Open issues that should be resolved before public launch

Decisions to make and policies to write, needing external (legal, accounting, business) input — not features:
1. Fuel legal/tax characterization — DECIDED: prepaid, fully-consumable, non-cash-refundable service credit (no cash-out removes stored-value/money-transmission concerns; no decay clock); one-line counsel confirmation still wanted.
2. Refund/donation/chargeback mechanics — mostly dissolved by no-cash-out; chargeback-after-consumption is handled (freeze, access-off, write-off, reserve); donations are tax-deductible under the nonprofit.
3. Abandonment/rematch state machine — RESOLVED as REQ-027.
4. Sensitive-data vs open-source conflict — RESOLVED: v1 is public MIT only (decision-27 — private opt-in is a future feature); sensitive *data* is handled by the Tier-2 fixtures-only rule, not by hiding code; an acceptable-use document is still owed (ops work, not a launch blocker).
5. Admin staffing model at scale — OPEN: manual gates hold at pilot volume but not at the year-1 target; need an explicit staffing model or fewer manual gates before scale.
6. Anthropic commercial readiness — POSTPONED post-MVP (founder verdict, flow #18 2026-07-08): the pilot runs on standard self-serve billing and default rate limits; tier negotiation, billing arrangement, and custom limits happen when volume justifies them.
7. Deployment ownership post-handoff — DECIDED: the deliverable is a deployed running tool; Lovable hosts it and the NGO owns the workspace (~$25/mo, disclosed); ai4good never operates infrastructure; a live deployment is a handoff precondition; 30-day-alive is tracked.
8. Entity type — DECIDED: nonprofit path (fiscal sponsorship now, own 501(c)(3) later); enables tax-deductible donations and grant funding; forecloses traditional VC.
9. Counsel deliverables — OPEN: counsel-reviewed Terms of Service (no-warranty, no-SLA, limitation of liability; the UI keeps the warm voice); volunteer-classification opinion; fiscal-sponsor agreement; EU data-residency + sub-processor/DPA stance before EU onboarding.
10. Blended P&L + grant runway — POSTPONED post-MVP (founder verdict, flow #19 2026-07-08): the pilot's real spend is visible on the daily money dashboard; the formal bottom-up P&L and grant/donor-runway lock become a scale-up gate. Original scope: bottom-up year-1 P&L (skim + grants + donations vs compute float + infrastructure + labor); a grant/donor runway covering the projected net gap.

## Open Questions & Risks

### Open Questions

**Resolved / superseded (trail only):** Q1+Q8 — moot per decision-21: volunteer AI access is platform-managed, attributed per volunteer, and revocable immediately (REQ-009); no external provisioning dependency remains. Q2 — resolved; no product impact. Q5 — v1 volunteer reward is reputation-only: completion credit plus the single "Shipped first tool" badge (REQ-014); NGO tips at handoff deferred to v1.5; honoraria revisited only if volunteer retention (Goal 2) underperforms. Q6 — Discovery is free within the per-NGO daily credit allowance (10/day unverified, 30/day verified); funding may start from draft; a funded project's Discovery is dollar-metered (REQ-002/004/006); lifted allowances for `kyc_verified` are deferred to v1.5 — v1 grants that tier no higher limit.

**Still open:**

- **Q3 — NGO verification:** v1 = founder-vetted flag (decision-29/r3); the documented bar below applies to the v1.5 pipeline — `verified` requires a registration document, a public reference link, and manual admin review; `kyc_verified` adds tax-exempt documentation plus an identity check on the NGO admin (verification provider selected). Open: which jurisdictions' tax-exempt documents v1 accepts (US 501(c)(3), UK Charity Commission, EU equivalents).
- **Q4 — skim rate:** flat 15% vs NGO-size-tiered vs waivers for sub-$200 budgets. Owner: business; due pre-public-launch; affects revenue model.
- **Q7 — platform-level Lovable usage visibility:** in v1, the NGO's Lovable credit balance is read only with the volunteer's consent during the volunteer's own session, to enforce the per-task budget cap (REQ-021/028). Standing platform-side visibility across NGO workspaces stays deferred: Lovable today offers only broad per-user authorization (the platform would need over-wide access to each NGO account) and its integration surface may change without notice. Revisit when Lovable offers narrowly scoped, usage-only access; that would replace manual and per-session capture with platform-side usage data and could add build-cadence analytics.

#### Open decisions register — founder calls still owed (decisions 20/21/22 fold-in; none block the PRD-dissection pass, each blocks only the build item named)

| # | Decision | Blocks |
|---|---|---|
| OD-1 | Reviewer identity + merge authority per project (coordinator, peer volunteer, or agent-assisted human click) — governance, not plumbing | REQ-026 merge flow + reviewer role |
| OD-2 | NGO Status-Panel scope + workspace onboarding | REQ-010/013 panel |
| OD-3 | Volunteer spend-cap and low-fuel warning levels | REQ-009 |
| OD-4 | Sensitivity at which misuse detection enforces | REQ-009 |
| OD-5 | Scope of the deferred second spend-verification layer | v1.5 |
| OD-6 | Operational home of usage metering (founder: deferred) | REQ-009 |
| OD-7 | PRD completion-gate threshold + scorer configuration (decision-25; pilot-tuned) | REQ-036 |
| OD-8 | Triage-screener confidence threshold + model configuration (decision-29/r4; pilot-tuned) | REQ-023 |

### Risks & Mitigation

| Risk | Severity | Mitigation → Contingency |
|---|---|---|
| Volunteers exceed project fuel without enforcement | High | Low-balance alerting, hard cut-off at zero fuel, transparent ledger → NGO may top up; platform absorbs week-1 pilot overruns |
| AI consumes fuel without a viable deliverable | High | Irreducible risk of AI-assisted dev: first-match disclaimer, per-project fuel cap bounds financial exposure, user-test checkpoints during builds, Discovery quality target (Goal 4), burn-per-deliverable visible on the NGO panel (REQ-034) → transparency + post-mortem; consumed fuel is not refunded; handoff attribution records the outcome (REQ-035) |
| Malicious NGO posts a commercial need | High | Verification gate + admin review of projects during pilot → reject and ban; policy documented |
| Volunteers ghost mid-project | High | 14-day inactivity reminder → 21-day auto-release → project re-opened; NGO can request re-match; volunteer responsiveness surfaced on the project page |
| Payment succeeds but fuel is not credited | High | Detected by the tight-cadence reconciliation and auto-corrected to Stripe truth (decision-31) → undecidable cases page for visibility |
| Anthropic outage stops Discovery | High | "Service degraded" banner, queued intakes, manual scope option → alternate-provider fallback post-v1 |
| NGOs sign up but never fund | Medium | Free Discovery as funnel; $50 minimum at match-acceptance, not at publish; abandonment detection → loosen if it kills the funnel; unfunded projects tagged clearly |
| NGO expects an SLA / completion guarantee | Medium | Mandatory no-SLA acknowledgment at signup and at every match acceptance; Promise link at every top-up → admin outreach; next-match priority |
| AI-generated code has license or quality issues | Medium | MIT license by default (Platform Promise); first-match disclaimer carries the volunteer's IP attestation (REQ-007 — no separate CLA in v1); handoff requires passing lint and tests (REQ-012) → NGO may reject the handoff; remediation playbook published |
| Regulators treat NGO verification documents as sensitive PII | Medium | Documents held under restricted access; data-processing agreement available → add explicit consent + data-minimization review |
| Fuel-cost inflation (Anthropic price rises) | Medium | Skim is percentage-based and scales with prices; changes communicated to NGOs in advance → adjust the fuel rate card monthly |
| Lovable security incident affects the integration | Medium | The platform holds no standing access to Lovable — only volunteers connect their own accounts (decision-20) → pause Lovable-track recommendations until remediation confirmed; in-flight projects continue on the fallback build path (REQ-021) |

---

