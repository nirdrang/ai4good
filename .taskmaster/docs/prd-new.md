# PRD: ai4good � AI-Fueled Marketplace for NGO Tools (lean)

> Distilled product-requirements doc � implementation/architecture detail lives in the design docs + the Linear task tree.

## Executive Summary

NGOs routinely need custom internal tools (volunteer scheduling, beneficiary CRMs, grant trackers, impact dashboards) but cannot afford bespoke software; an emerging wave of AI-augmented developers can ship those tools at a fraction of the historical cost. **ai4good is a nonprofit-operated, open-source marketplace that turns NGO software needs into volunteer-built, AI-powered tools the NGO can run *and keep evolving itself*.** A volunteer builds the first version using Claude Code (which orchestrates the AI app-builder Lovable for the UI/app layer); the NGO ends up with a **deployed, running app it can keep evolving via chat — fixing bugs and adding features without a developer.** Build-phase AI compute is funded by metered Stripe credits ("fuel"); **the platform recognizes a configurable skim (default ~15%) at consumption time** — as the project actually uses compute, not when the NGO pays in. **Fuel is prepaid, fully-consumable, non-cash service credit** (it powers AI work, is not cash-refundable; unused fuel stays as redeployable platform credit — see §7 and REQ-009). As a nonprofit, ai4good runs on **blended revenue** — skim + grants + donations. Expected impact: 25 NGOs receive a working, deployed, self-maintainable tool and 100 active volunteer developers engage in the first 12 months.

**Critical framing — read the next section before the rest of this PRD.** ai4good is a coordination layer, not a software vendor: it connects NGO needs with volunteers, funds AI compute, and helps the NGO end up owning a tool it can self-maintain. The relationship is governed by a plain-language Terms of Service (no warranties, no SLA, no guaranteed deliverable) — warm in tone, real in force. All work is open-source by default; fuel funds AI usage, not guaranteed outcomes. This shapes every requirement that follows.

---

## Platform Promise & Disclaimers

ai4good is a **nonprofit coordination layer**, not a software vendor. Its promise: connect NGO needs with willing volunteer developers, fund build-phase AI compute ("fuel"), help the NGO end up with a deployed tool it can self-maintain, and bring open-source-grade transparency. **It is explicitly not a service provider with delivery commitments** — this framing justifies the whole design (free Discovery, fuel-on-match, open-source-by-default, no public ratings, tip-not-pay).

**Legal posture (decided 2026-06-03):** the relationship is governed by a **plain-language, counsel-reviewed Terms of Service** — the protective terms below (no warranty, no SLA, limitation of liability) are enforceable only inside a real contract, so a ToS holds them while the UI keeps the warm "coordination layer, not vendor" voice. ai4good does not assert "no contract exists"; it asserts a *limited, bona-fide coordination relationship* with no delivery obligation. Volunteers donate their time to charitable work and are not employees, contractors, or sub-contractors of ai4good or the NGO.

NGOs and volunteers must understand and accept the following before participating:

### 1. A limited coordination relationship — no delivery obligation
ai4good connects the parties and funds AI compute; **no party is obligated to deliver any specific outcome.** Volunteers donate their time; they are not employees or contractors of ai4good or the NGO. This is a coordinated effort under clear terms, not a commercial engagement with deliverables.

### 2. Work is open-source by default; private opt-in for justified cases
Every project repository is **public MIT by default** — volunteer code is publicly viewable, forkable, and re-usable from the first commit. This is the platform's IP model and a core volunteer value proposition: your work becomes a public, re-usable portfolio piece.

**Private repos are allowed by exception** for legitimate confidentiality needs (beneficiary PII, health data, internal HR/finance tools, classified workflows, donor identities). The NGO requests private at scope time with a brief justification; platform triage (REQ-023) confirms it is consistent with NGO mission and acceptable-use policy. Private projects:
- Keep code hidden from public view (description still visible)
- Show on the marketplace with a 🔒 **Private** badge so volunteers can self-select
- Count toward volunteer reputation ("5 tools shipped, 2 private") but project name/details are hidden on the volunteer's public profile by default
- Follow all other Platform Promise clauses

**Still not allowed**, public or private:
- Commercial / closed-source-for-resale work (ai4good is for nonprofit mission delivery, not commercial software)
- Surveillance tooling, spam infrastructure, illegal use, or content violating ai4good's acceptable-use policy

### 3. Fuel funds AI usage on this project — not deliverables
Funding a project's fuel pays for AI compute on that project — **both the Discovery scoping the NGO does with the AI Discovery Agent** (after the free Discovery credit pool is exhausted; decision-8, 2026-06-04) and **the build work the volunteer does** with Claude Code. On Track A it also pays Lovable credits directly from the NGO's own Lovable workspace. **It is NOT payment for a working tool, a fixed scope, or a specific outcome.** Fuel may be spent in full — by NGO scoping or volunteer build — without producing a viable deliverable. This is an irreducible risk of AI-assisted development: the tools can produce convincing-looking work that doesn't compile, doesn't meet scope, or doesn't survive contact with real NGO data. **NGOs assume this risk knowingly.**

### 4. No SLA, no completion guarantee
ai4good does not guarantee that any project reaches handoff:
- Volunteers may ghost mid-project (REQ-027 inactivity → auto-release + rematch; REQ-016 notifications).
- AI tools may produce non-working output that consumes fuel without progress.
- Scopes may prove infeasible once implementation begins.
- NGOs may decline handoffs that don't meet expectations.

The platform's job is to make these risks **transparent and bounded** — per-project fuel budgets cap the financial downside (you spend only what you commit), and inactivity / handoff flows surface stalls early.

### 5. What ai4good does promise
- **Bounded financial risk** — per-project fuel budgets are NGO-chosen at fund-time; no auto-charge beyond commitment.
- **Transparent volunteer track record** — completion credit, badges, project history (not stars).
- **Open-source IP norms** — your project is forkable forever; no lock-in.
- **Verification gating on the NGO side** — REQ-002 tiers reduce fraudulent and abusive demand.
- **Escalation paths when work stalls** — in-platform messaging (REQ-015), notifications (REQ-016). (Post-handoff issue surfacing — REQ-017 — is v2; v1 NGOs re-engage by posting a new project.)
- **A genuine attempt to ship** — motivated volunteers, AI leverage, real NGO problems.

### 6. Progress over promises (stepwise funding by design)
The platform encourages NGOs to fund in **small, frequent steps** rather than large upfront commitments. Each fuel run-out creates a natural progress-review moment where the NGO sees concrete work — commits, completed tasks, the volunteer's account of what's next — before continuing to fund. **Trust is built through demonstrated progress, not large prepayments.** Volunteers benefit too — smaller per-stage stakes, clearer feedback loops, less over-commitment anxiety. The cost-control machinery (per-project fuel cap and low-fuel cutoff — REQ-024) makes this the path of least resistance; the two progress signals that drive these review moments are defined in REQ-026 and REQ-010.

### 7. Fuel is non-cash, project-scoped credit — it stays yours and working (decided 2026-06-03)
Fuel is **prepaid, fully-consumable, non-cash service credit**. **Decision-8 (2026-06-04):** fuel can be funded on a project **at any point once it exists** — typically at match acceptance, but earlier if the NGO wants to continue Discovery past the free credit pool (REQ-002/004/006). It is **project-scoped**: unused fuel **stays on the project** and **survives a volunteer change** (if a volunteer leaves mid-project, the project re-opens and the next volunteer picks up the remaining balance — REQ-027). Your money keeps working on exactly the project you funded.

**Fuel is not cash-refundable.** Once a project is genuinely finished or abandoned, leftover credit can be:
- **Kept** on your account as redeployable platform credit, OR
- **Donated** to ai4good (tax-deductible given nonprofit status — see §11), OR
- **(v1.5) Moved** to another of your projects.

There is **no cash-out / withdrawal in v1** (this removes the only money-out path, eliminating laundering risk and the Treasury/ACH/AML/KYC machinery). **Nothing is ever silently removed.** Disclosed plainly at funding time: *"Fuel powers AI work and is not cash-refundable; unused fuel stays as credit for your projects or can be donated."*

### 8. Minimize admin intervention
The platform keeps admin work to a minimum so growth is not bottlenecked on human reviewers. Operating principle: **target < 10 minutes of admin time per active project per week** at steady state. Concretely:
- **Automation first** — anything automatable is automated; clear cases are auto-handled and only ambiguous ones reach an admin. *(Automated spend-anomaly detection is a v1.5 add — decision-14; v1 bounds loss with deterministic caps + daily human review.)*
- **Batched, not real-time** — admin work that must stay manual is batched rather than handled on-demand; users are told upfront there is a wait. **Lovable setup is NOT an admin task** — it is volunteer-driven (REQ-021).
- **Self-service for NGO actions** — verification doc upload, fuel top-up, key rotation request are all self-serve; admin sees only the resulting queue. (KYC submission + auto-top-up enable/disable are v1.5.)
- **Automated reconciliation** (REQ-006/029) — admin sees a task only when the money doesn't reconcile.

This is intentionally restrictive: features that would require routine admin involvement are evaluated against this principle before being added.

### 9. Acknowledgment cadence
The platform asks for explicit, audit-logged acknowledgment at **two NGO moments + one volunteer moment**:

| Actor | Moment | What's acknowledged | Why this moment |
|---|---|---|---|
| NGO | **At signup** (Story 1) | Full Terms of Service + Promise (all clauses) | Gate to project creation; sets baseline understanding |
| NGO | **First funding on a project + every match acceptance** (REQ-006 / decision-8) | Clauses 3+4 (fuel ≠ deliverable; no SLA) + fuel-is-non-cash-credit (§7) + data-responsibility for the project's sensitivity tier (REQ-004/023). First funding fires a hard ack naming the project + per-project cap; match acceptance fires its own naming the volunteer. Neither is reused for the other. | First funding = money commits to this project; match acceptance = volunteer + money + scope converge. Both warrant their own ack. |
| Volunteer | **First project application** (Story 3) | One combined first-apply disclaimer (REQ-007): Clauses 1+2 (limited coordination relationship; open-source by default) + per-project-key-use + a **standing data-confidentiality undertaking** ("on real-data projects I work only with the NGO's synthetic/anonymized fixtures and keep what I see confidential"). Sworn once, so it binds before the volunteer touches any private/Tier-1+ project. | One-time; re-prompted only if ToS/disclaimer text materially changes |

At fuel top-ups after the first per-project funding and after the first match, the platform shows a passive footer link to the full Promise (no hard checkbox), since these are refills during an active project. All acknowledgments are recorded with timestamp + IP + text version; a material change to the text re-triggers acknowledgment.

### 10. The deliverable: a tool the NGO can run and keep evolving (decided 2026-06-03)
ai4good's deliverable is not "a repo" — it is a **deployed, running tool the (non-technical) NGO can keep evolving itself.** A project's *track* is set at Discovery (REQ-004) by *who maintains the tool after the volunteer leaves*:
- **Track A — "NGO-maintains-it":** the durable home is an AI app-builder (**Lovable** in v1) where the NGO evolves the live app via chat after handoff — fixing bugs, adding features, no developer. The volunteer builds the first version through Claude Code, which orchestrates Lovable. **Track A is the only track ai4good builds in v1.**
- **Track B — "developer-grade / one-off"** *(deferred to post-v1 — decision-19):* custom logic / integrations / no expectation of non-dev chat maintenance. Track B can clear "deployed + running" but by construction cannot satisfy "the NGO evolves it itself," so v1 does not take it on. Needs requiring Track B are detected at Discovery and parked on a developer-grade waitlist (REQ-004).

**The honest promise for Track A:** *the NGO owns the code outright (portable, open-source, no lock-in) AND can self-maintain via chat for roughly the AI-builder's subscription (~$25/mo) as long as they choose to pay; if they stop paying, they keep a deployable app but lose hands-free chat maintenance.* Set as an expectation at kickoff, with a spend cap so metered edit costs never blindside a non-technical owner.

This section is not legalese. It is the actual operating model.

---

## Problem Statement

### Current Situation
NGOs run on a chronic software deficit — spreadsheets, generic SaaS (Airtable, Google Forms, mailing lists), and donated point-solutions that rarely fit their workflow. Commercial vendors price for corporate budgets, pro-bono dev shops are oversubscribed, and one-off volunteer projects stall before shipping because there is no shared backbone — no scope definition, funding model, project management, or handoff process.

On the supply side, a growing cohort of AI-augmented developers (Claude Code, Cursor, Lovable, Copilot) can now produce working software at 5-10x the pre-AI baseline, but has no aggregated channel to apply that productivity to social-impact work. The mismatch is a coordination failure, not a willingness failure.

### User Impact
- **Who:** NGOs and mission-driven orgs (charities, public-sector projects, researchers) needing custom internal tooling; AI-augmented volunteer developers wanting scoped projects, credit, and reimbursement for AI costs.
- **How:** NGOs lose staff hours to manual workarounds, miss reporting deadlines, cannot scale; volunteers can't find projects with clear scope, AI-token funding, and a path to delivering something useful.
- **Severity:** High — the opportunity-cost of un-built NGO tooling is well-documented (e.g. Code for America: 30-60% productivity loss to manual processes in under-resourced civic orgs).

### Business Impact
- **Cost of problem:** NGOs globally spend $1B+/year on commercial SaaS that only partially fits, and lose multiples of that in unbilled staff time on workarounds.
- **Opportunity cost:** AI-coding productivity gains aren't reaching the social-impact sector; without an aggregator, individual efforts fragment and stall.
- **Strategic importance:** Establishes ai4good as the default coordination layer between NGO needs and AI-augmented volunteer supply, with a revenue model decoupled from grant funding.

### Why Solve This Now?
1. **AI coding inflection point:** Claude Code, Lovable, and Cursor have crossed the threshold where one developer can ship production software in days, not months.
2. **Token-metered economics:** Pay-per-use AI APIs make per-project budgeting tractable — an NGO can fund a specific tool with a specific dollar amount.
3. **Open-source norms maturing:** GitHub-native workflows provide a free, transparent project-management spine.
4. **Stripe billing primitives** make a per-project credit-ledger feasible for a small team.

---

## Goals & Success Metrics

### Goal 1: Ship Working, Deployed NGO Tools (decided 2026-06-03)
- **Description:** Produce real, **deployed and running** tools NGOs actually use — not just handed-off repos. End-to-end: post → discovery → match → build → **deploy** → handoff.
- **Primary Metric:** Projects reaching handoff **with a verified live deployment URL** (REQ-012 — Track A: live Lovable app + workspace ownership transferred to the NGO). *(Track B's plain-host deploy path is deferred — decision-19.)*
- **North-star:** **"Still alive at 30 days"** — deployed apps that respond to an automated health check 30 days post-handoff (tracked, not guaranteed — no SLA, §4).
- **Baseline:** 0 (greenfield).
- **Target:** **25 NGOs receive a working, deployed tool** in the first 12 months; ≥60% still-alive at 30 days.

### Goal 2: Volunteer Engagement & Retention
- **Description:** A stable supply of volunteer developers who return for multiple projects.
- **Metric:** Active volunteers (1+ committed task/month) and repeat-project rate.
- **Baseline:** 0.
- **Target:** **100 active monthly volunteers; 30% repeat-project rate** (2nd project within 90 days of the 1st). **Timeframe:** Month 12.

### Goal 3: Blended Sustainability (decided 2026-06-03 — re-pointed from skim-margin)
- **Description:** As a nonprofit, validate the **blended** funding model — earned skim + grants + donations covering the cost base (Anthropic float + infra + deliberately-manual concierge/admin labor). v1 is expected net-negative on skim alone; the goal is a credible path to blended sustainability, not skim profitability.
- **Metric:** Net contribution = (skim + grants + donations) − (Anthropic + infra + ops); plus fuel throughput, skim, and grant/donation intake.
- **Baseline:** $0.
- **Target:** **$250k fuel throughput; secured grant/donor runway covering the projected year-1 net gap; donation conversion on unused fuel ≥ 20%.**

### Goal 4: Discovery Quality
- **Description:** Validate that the AI Discovery Agent produces scopes volunteers can execute against.
- **Metric:** Percent of scoped projects reaching Handoff without major scope renegotiation (>1 reopen of the scope doc).
- **Baseline:** N/A.
- **Target:** **>70% of projects ship against original scope** with at most one minor revision. **Timeframe:** Months 3-12.

### Goal 5: Volunteer Supply Liquidity (decided 2026-06-03 — the #1 launch gate)
- **Description:** A two-sided marketplace dies on the side with no liquidity — for ai4good that's supply. This goal makes the supply funnel visible and healthy, mirroring the demand side. Launch is **concierge-first**: pre-recruit a volunteer bench and hand-match the first ~10–15 curated projects before opening organic browse (REQ-007 / §11).
- **Metric:** Volunteer activation funnel — signup → first apply → first match → first handoff — and time-to-first-match per open project.
- **Target:** **≥ 20-volunteer pre-launch bench; ≥ 80% of the first cohort's open projects matched within 7 days; volunteer signup→handoff activation ≥ 25%.**
- **Behavior:** Aging unmatched open projects are nudged to the concierge queue (hand-match candidate) and to matching volunteers (REQ-016) — SLA 7 days during the concierge phase, 14 days at organic-browse scale.

---


## User Stories

### Story 1: NGO Posts a Need

**As an** NGO program manager, I want to describe a software need in plain language and have it turned into a buildable scope, so that a real tool gets funded and built without me writing a technical spec.

**Acceptance Criteria:**
- [ ] NGO signs up and creates an org profile (name, mission, contact, verification docs).
- [ ] At signup the NGO must explicitly accept the ToS + Platform Promise (limited coordination relationship; work open-source by default; fuel funds AI usage and is non-cash credit, not a deliverable; no SLA). Without acceptance the account cannot create a project. Acceptance is recorded as an auditable event (time, source, and the exact version accepted).
- [ ] NGO starts a "Project Need" from a free-text problem description (no technical jargon required).
- [ ] The AI Discovery Agent runs a structured 5–10-turn conversation that refines the need into a scoped spec.
- [ ] At the end of discovery the NGO sees: a scope document; a qualitative complexity tier (small/medium/large — no dollar estimate in v1, REQ-004); the data-sensitivity tier + handling guideline (Tier-2 = fixtures-only during build); the maintenance track (Track A "you maintain it via chat in Lovable"; Track B deferred post-v1 — non-Track-A needs waitlisted, REQ-004); a suggested stack; and acceptance criteria.
- [ ] NGO can edit the scope before publishing; on publish the project enters the public marketplace and the NGO is emailed (and again on volunteer match).

### Story 2: NGO Funds a Project with Fuel

**As an** NGO program manager, I want to buy fuel by card and assign it to a specific project, so that I budget per-tool rather than committing to platform-wide spend.

**Acceptance Criteria:**
- [ ] NGO buys fuel by card as one-time top-ups (no subscription). The payment screen passively links to the Platform Promise & Disclaimers (no checkbox, no interrupt); the hard acknowledgment lives at match acceptance (Story 3), not per top-up.
- [ ] Fuel is denominated in USD; the project shows gross USD funded ($100 of fuel for $100 paid). A top-up may optionally land in a general NGO balance before being allocated to a project.
- [ ] No skim at top-up: the project is funded at full gross and the platform skim (default 15%) is recognized only as AI usage is consumed (REQ-009) — so NGOs always see full gross funded and pay the skim forward as they spend.
- [ ] NGO sees a real-time per-project fuel ledger (purchases, consumption, balance); failed payments give clear feedback and the ledger reconciles against the payment processor.
- [ ] EU/UK NGOs receive a valid VAT invoice.

### Story 3: Volunteer Joins and Gets Matched

**As an** AI-augmented developer, I want to browse open projects, filter by skills/scope, and claim one, so that I apply my time to scoped work with funded fuel.

**Acceptance Criteria:**
- [ ] Volunteer signs up and links a code-host profile (public stats: repos, languages, contribution history), then self-declares skills, weekly availability, and preferred causes.
- [ ] At first project application (same first-commitment-moment principle as the profile-link gate, REQ-007) the volunteer must explicitly accept the relevant ToS + Platform Promise clauses: ai4good is a limited coordination layer (no one is obligated to deliver a specific outcome); the volunteer volunteers time (not employee/contractor); work is public-by-default open-source under MIT (private allowed by NGO justification, Platform Promise §2); the project's virtual key is used only for that project; on real-data projects the volunteer works only with the NGO's synthetic/anonymized fixtures (Tier-2, REQ-004) and keeps what they see confidential; violations may cause suspension and forfeiture of completion credit. Acceptance is a property of the volunteer account (not the application), is recorded auditably (time, source, version), and a materially changed disclaimer version forces a one-time re-accept on next apply.
- [ ] Marketplace lists open projects with scope, suggested stack, cause tags, and skill/cause overlap badges ("Skills match: 3 of 5", "Causes match"). No numeric match score in v1 (REQ-011; scoring deferred to v1.5).
- [ ] Volunteer applies; NGO approves/declines via dashboard or auto-approves (configurable).
- [ ] Acceptance does NOT trigger kickoff. After the NGO accepts, the project sits at matched-pending-fuel; repo, Linear workspace, virtual keys, backlog, and comment thread are all created at funding (REQ-006 match-to-fund), not at acceptance.
- [ ] On funding (REQ-006) the kickoff sequence fires. v1 is Track A only (decision-19), so Lovable setup is mandatory (no volunteer skip). Programmatic repo creation is deferred; the platform auto-raises the Lovable-setup blocker (REQ-021) and NGO + volunteer land the repo via the checklist (no platform-admin involvement), under the shared ai4good-projects org. The backlog is decomposed from Discovery into the project's Linear workspace (REQ-026) — not GitHub Issues, which stay dev-internal (REQ-008); virtual keys are minted (REQ-009); the comment thread opens (REQ-015).
- [ ] Volunteer gets an in-platform starter kit: the Track-A build guide + the pull-based Linear workflow guide (browse briefs → self-assign → work → merged delivery moves status).

### Story 4: Volunteer Builds — Claude Code as the entry point (Track A: orchestrating Lovable)

**As an** assigned volunteer, I want to use Claude Code as my single entry point — backend/logic/tests directly (metered against project fuel) and, on Track A, orchestrating Lovable for the app/UI layer — so that I ship the NGO a deployed tool they can keep evolving, with ai4good's metering/enforcement in the loop.

**Acceptance Criteria:**
- [ ] Each (volunteer, project) pair holds a virtual key minted at kickoff and terminating at the ai4good LLM gateway (REQ-009); the real key is held only at the gateway and never reaches the volunteer. Standard, unmodified Claude Code connects through it.
- [ ] Volunteer gets a Project Starter Kit page and installs the ai4good Claude Code Skill (REQ-028), which primes project context, wires Linear (REQ-026) and the gateway, and (Track A) sets up Lovable orchestration.
- [ ] The gateway meters each request inline at response time (REQ-009) and deducts from project fuel.
- [ ] Enforcement is structural at the gateway, not polling-based: below 20% fuel the NGO is auto-notified to top up (REQ-024); below 5% dev sessions are warned in-app; at 0 the gateway declines the next request with a fuel-suspension response and both parties are notified — the next request passes once the NGO tops up (no reactivation step). Volunteer has a fuel-gauge widget in the dashboard.
- [ ] Track A — Claude Code orchestrates Lovable via its MCP (REQ-021 + REQ-028), enforcing the per-task Lovable-credit budget cap + audit, with a manual dual-rail fallback if the Lovable MCP is down. The NGO owns the Lovable workspace (durable post-handoff home). Track A is the only build track in v1 (Track B deferred, decision-19).
- [ ] Lovable status widget: volunteer can mark credits-low/blocked to escalate to the NGO; Lovable cost is paid by the NGO directly (not from fuel). The project page shows both meters — Claude Code fuel + Lovable status (REQ-010).
- [ ] The gateway's escalation ladder is documented-not-built beyond Layer 1 in v1 (REQ-009); v1 ships virtual keys, caps, inline metering, and the structural fuel gate.

### Story 5: Project Management via the Linear-Backed PM Task Tree (REQ-026)

**As an** NGO admin or assigned volunteer, I want to track tasks and progress in a plain-language hierarchical view whose status comes from deterministic events, not an agent's self-report, so that NGOs trust progress without reading code and the volunteer works pull-based from a session-sized, dependency-ordered backlog.

**Acceptance Criteria:**
- [ ] At kickoff (REQ-005.5/REQ-006) the platform decomposes Discovery's stories + acceptance criteria into a Linear issue tree (one parent issue per story; one sub-issue per acceptance criterion; P0 tasks labeled; a coordinator reviews the draft before it is created — REQ-026).
- [ ] The ai4good project page shows the task tree as primary content ("Now working on" strip + hierarchical list + activity feed, REQ-010), reflecting Linear status in near-real-time — NGOs never need Linear seats.
- [ ] Status is deterministic: self-assignment marks "in progress"; merged delivery marks "done"; agents comment and self-assign but never move status, and unauthorized status moves are detected and reverted (REQ-026). Project % complete = done P0 tasks ÷ total P0 tasks.
- [ ] No GitHub Issues are auto-created from scope (REQ-008/REQ-026); GitHub Issues stay dev-internal for code bugs and never appear in the NGO view.
- [ ] Sub-issues render as a tree (parent → children) and the volunteer can add sub-issues during work; Change-Request-derived issues (REQ-025) appear under a "Change Request: [title]" parent.
- [ ] After handoff the tree becomes read-only and a markdown snapshot of the final tree lives in the repo (REQ-026). Follow-up requests re-engage via a new project (REQ-017 is v2).

### Story 6: Handoff and Post-Handoff (tips deferred to v1.5; attribution capture in v1 — decision-22)

**As an** NGO, I want to receive the completed open-source repo with deploy instructions and a runbook, and a path to request follow-up work, so that I can operate and extend the tool without depending on any specific volunteer.

**Acceptance Criteria:**
- [ ] Volunteer marks a project "Ready for Handoff" once all P0 PM tasks (REQ-026) are done. Open GitHub Issues do not block handoff (dev-internal).
- [ ] The platform runs an automated handoff checklist: README, runbook, deploy instructions, passing automated checks, and a license file (MIT default).
- [ ] NGO reviews the deployed tool (hosted staging or live URL) and signs off via "Handoff Accepted."
- [ ] On sign-off the NGO sees the completion summary. Tips are deferred to v1.5 (§11). Sign-off DOES include the REQ-035 attribution step (optional testimonial + 3 required credit-framed dimensions, ~30s — decision-22). Volunteer reputation in v1 = completion credit + privately-held attribution; the matching surface is v1.5.
- [ ] On acceptance: optional repo transfer to the NGO, the project is marked handed-off (there is no separate "archived" status), and the volunteer profile gains a completion credit (+1 + "Shipped first tool" badge on first handoff — no public star rating).
- [ ] Remaining fuel is released to the NGO's general balance as a non-cash credit release (REQ-006 §7) — no decay clock, no cash refund, no auto-renew. The NGO keeps it (persists as redeployable credit, never removed) or donates it (tax-deductible, nonprofit); move-to-another-project is v1.5. Nothing is ever silently removed (Platform Promise §7).
- [ ] Post-handoff, the NGO can use GitHub Issues on the repo for follow-up; ai4good does NOT surface or fund these in v1 (REQ-017 deferred to v2). NGOs wanting a fresh paid project post a new one.

**Deferred to v1.5 (§11):**
- Volunteer payout onboarding + tip flow (checkout + payout).
- Private NGO satisfaction form — superseded by decision-22 (REQ-035 attribution ships in v1; the reputation/matching surface stays v1.5).


#### REQ-001: User Authentication & Org Membership

**Description:** Two-layer authorization: every account has one global role (NGO, volunteer, or platform admin); an NGO account also holds one or more per-NGO memberships (admin or member). Shorthand: **ngo_admin** = NGO account with an admin membership; **volunteer** = individual account, no memberships; **platform_admin** = the global role.

**Acceptance Criteria:**
- [ ] Multiple sign-in options. A volunteer must link a GitHub account before their first application (linking runs REQ-007 onboarding and grants the repo access needed to receive a project).
- [ ] NGO admins invite teammates (email invite + role). Volunteer accounts are always individual.
- [ ] NGO data is visible only to its own members and assigned volunteers.
- [ ] Password reset, email verification, and session management are provided.

**Dependencies:** None.

---

#### REQ-002: NGO Organization Profile + Verification (v1 minimal)

**Description (v1):** NGOs sign up (email-verified), complete an org profile, and submit a registration document for manual platform-admin review. Two tiers: **unverified** — can draft and run Discovery within a 10-credit/day allowance (resets daily, no rollover) and self-fund to continue, but cannot publish to volunteers; **verified** (registration doc + public reference link approved by an admin) — daily allowance rises to 30 (the 3× reward) and unlocks publish/match/fund. KYC is deferred to v1.5 (v1 is manual admin review only).

**Acceptance Criteria:**
- [ ] NGO admin creates/edits org profile (name, mission, country, website, logo) and uploads a registration document to private storage.
- [ ] Email verification is required before any Discovery message — the composer is disabled with a "verify your email to start" prompt until an admin is verified.
- [ ] Verification progresses unverified → pending → verified | rejected, independent of email verification. On verification the daily allowance rises 10 → 30 (re-verifying does not re-raise).
- [ ] Platform admin has a pending-verification queue with a document viewer and approve/reject + reason; may also grant extra daily credits on request (audited with reviewer id + reason).
- [ ] Only verified NGOs can publish; an unverified NGO may reach scoped but Publish is disabled with an "upload your verification doc" prompt.
- [ ] The free allowance is a daily grant reset to the current-tier amount (30 verified, else 10), no rollover — the fund-now-or-return-tomorrow moment; it replaces any separate per-day message cap.
- [ ] Marketplace and cards show a "Verified" badge. No KYC tier and no paid "Discovery wallet" in v1 — an unverified NGO funds Discovery via the project's regular fuel.

**v1.5 (deferred):** KYC tier (tax-exempt doc + identity check) with its own badge/state, a "Featured NGOs" rail, a match-score boost, and a "complete your KYC" prompt.

**Dependencies:** REQ-001.

---

#### REQ-003: Project Need Creation (free-text intake)

**Description:** Authenticated NGO admins start a "Project Need" with a free-text problem description that begins Discovery.

**Acceptance Criteria:**
- [ ] Fields: title, problem description (markdown), cause tags, urgency (low/med/high).
- [ ] Optional reference-file upload (REQ-032) — screenshot, spreadsheet, blank form, mockup, or requirements doc that feeds Discovery and the volunteer; the upload shows the data-responsibility disclosure.
- [ ] Draft autosaves; submitting starts Discovery; the raw intake is retained for auditing.

**Dependencies:** REQ-001, REQ-002, REQ-032.

---

#### REQ-004: AI Discovery Agent (free, rate-limited)

**Description:** A conversational agent turns the free-text intake into a scoped spec over a structured multi-turn conversation, using a top-tier reasoning model deliberately — Discovery is the highest-leverage step and its output drives the whole build, yet is short and one-time so absolute cost stays low. Discovery is free up to the per-NGO daily allowance (10 unverified / 30 verified). **"Funded → all-$" routing:** a funded project's Discovery draws that project's fuel, reserving the free pool for the NGO's unfunded projects. When the day's credits run dry the NGO can verify (allowance → 30), fund to continue now (the "expedite" path), or wait for tomorrow. Unverified NGOs can fund and finish Discovery but still cannot expose the project to volunteers until verified.

**Acceptance Criteria:**
- [ ] Tuned for "non-technical NGO → technical scope" extraction; runs in-platform (no third-party redirect) and is persisted/resumable.
- [ ] **Reference-file ingestion (REQ-032):** reads the NGO's uploaded files (PDF, images, CSV/TSV, text), may request more or cite them, and never receives files the NGO marked non-visible-to-Discovery.
- [ ] Output is a structured scope doc: summary; user stories with acceptance criteria; suggested stack; a **qualitative complexity tier** (small/medium/large, no dollar figure); risk flags; a data-sensitivity tier; a maintenance track; a Lovable recommendation; and a workflow mode.
- [ ] **Data-sensitivity tiers:** Tier 0 no restriction; Tier 1 (ordinary PII) minimization reminder + acknowledgment; **Tier 2 (special-category or high-volume PII) builds against synthetic/anonymized fixtures only — the NGO connects real data after handoff**, keeping real Tier-2 data out of provider/Lovable/volunteer hands (triage confirms). Discovery is conservative — when unsure it picks Tier 2, and never classifies health/immigration/abuse-victim/financial data below Tier 2.
- [ ] **Maintenance track (v1 = Track A only):** **Track A** (non-technical NGO maintains via chat) → Lovable is the deliverable vehicle, the only track v1 builds; **Track B** (developer-grade / one-off / Tier-2 data that cannot live in Lovable) is post-v1 — it gets no publishable scope; Discovery explains this and records the need on a developer-grade waitlist. Default internal tools (intake forms, trackers, directories, lightweight dashboards) to Track A.
- [ ] v1 workflow always pairs the Lovable builder with a coding-agent backend; single-tool modes are reserved/deferred. Output can be regenerated (reason logged) up to 3× before escalation; regeneration and system-error retries are free.
- [ ] **Transparency:** the chat shows a credit gauge ("Discovery credits: 7 of 10 today") and per-turn cost, and confirms before ingesting a large file; a funded project shows fuel cost per turn instead.
- [ ] **Abuse guardrails:** email verification is a hard precondition at any tier; the daily allowance bounds the free subsidy; funding is the expedite path (continue now, no latency change, no allowance raise); a platform admin can revoke Discovery access (kill switch) or grant credits. Discovery credits are a free grant, never purchased → no stored-value/money-transmitter exposure; funded fuel enters the ledger.

**v1: no precise dollar estimation.** No fuel-budget figure or builder cost estimate — the scope doc shows the complexity tier with a short rationale; a recommended Lovable subscription is noted as paid directly to Lovable (pricing link). The NGO picks the initial fuel at funding ($50 minimum) and tops up reactively (REQ-024). A precise estimator is deferred — AI-coding spend is hard to predict and overconfident estimates harm more than help.

**Dependencies:** REQ-003.

---

#### REQ-005.5: Project Lifecycle State-Transition Table

**Stages:** draft → discovery → scoped → in triage → open → matched (awaiting fuel) → in progress → handoff pending → handed off; plus cancelled (terminal). The REQ-027 abandonment/rematch edge (in progress → open) reuses existing stages. Each transition below names its actor and observable rule.

> **Decision-17: pause/resume is removed from v1** — disproportionate cross-cutting cost for a ~10–15-project concierge pilot, where a pause is a support conversation (pre-match: unpublish or cancel the match; mid-build: leave a note or cancel). Returns in v1.5 on real demand.

| From → To | Actor | Rule / observable effect |
|---|---|---|
| (none) → draft | NGO admin | Any NGO (incl. unverified) can draft — not gated. Verification gates scoped → in triage, not Discovery. |
| draft → discovery | NGO admin | Intake submitted; an admin is email-verified; NGO has Discovery capacity. Otherwise the composer is disabled with verify/fund prompts. |
| discovery → scoped | Discovery agent | Valid output produced (no verification needed); invalid output re-prompts up to 3× then escalates. |
| scoped → in triage | NGO admin (Publish) | NGO is verified — the volunteer-facing wall; Publish is disabled with an "upload verification doc" prompt if unverified. |
| in triage → open | Platform admin | Approved → visible in marketplace. |
| in triage → scoped | Platform admin | Changes requested → reviewer comments visible; NGO edits and resubmits. |
| in triage → cancelled | Platform admin | Rejected → NGO notified with reason. Terminal. |
| open → matched | NGO admin (accept) | Volunteer already has GitHub linked + disclaimer accepted; 7-day funding deadline set; other applicants stay pending. |
| matched → in progress | Payment | Payment ≥ the $50 minimum → kickoff fires (below). |
| matched → open | 7-day deadline or NGO cancel | Unfunded after 7 days, or NGO cancels before payment → volunteer freed and notified; re-fund prompt. |
| in progress → handoff pending | Volunteer (Ready) | All P0 tasks done AND a repo URL exists; otherwise disabled with a finish-Lovable-setup prompt. |
| handoff pending → handed off | NGO admin (Accept) | Deployment URL present. Leftover fuel → general credit; volunteer access ended; attribution captured; completion credit + first-tool badge; PM tree read-only; 30-day-alive check scheduled. No tip in v1. Terminal. |
| handoff pending → in progress | NGO admin (Reject) | Volunteer addresses feedback; 3rd rejection routes to neutral platform review. |
| in progress → open | 21-day inactivity or manual release | Ex-volunteer access revoked; remaining fuel stays for the next volunteer; work returned to backlog; re-opens with rematch priority (REQ-027). |
| open → scoped | NGO admin (Unpublish) | Only before acceptance; removed from marketplace, pending applications kept. |
| any pre-handoff → cancelled | NGO admin | Remaining fuel → general credit; volunteer notified; comment thread read-only. Terminal. |

**Kickoff (matched → in progress):** metering credentials issued (REQ-009); a Linear PM workspace assigned and the volunteer invited (REQ-026); the backlog decomposed from Discovery output; the repo created in the code org via the Lovable setup checklist (REQ-021), its URL required before handoff; the comment thread started (REQ-015) with a "funded and live" event; the volunteer notified. On any failure the project stays in progress and the failure surfaces as a blocker (REQ-024), gating the volunteer only from the pending resource.

**Applications:** accepting auto-declines other pending applications; decline/self-withdraw leave the project unchanged; an accepted application expires if the 7-day deadline passes, freeing the volunteer to re-apply.

---

#### REQ-005: Scope Document & Project Publishing

**Description:** Discovery output renders as an editable scope document. Publishing needs no pre-funded fuel (fuel comes later, REQ-006) — this match-first / fund-on-kickoff model lowers NGO friction — but does require passing triage (REQ-023): scoped → in triage on submit, in triage → open only on admin approval.

**Acceptance Criteria:**
- [ ] Editable markdown sections: summary, user stories, acceptance criteria, suggested stack. No fuel-budget section (no dollar estimate); the complexity tier is shown, and the NGO picks fuel at match-acceptance (REQ-006).
- [ ] **Repo visibility (Platform Promise §2):** public by default, or opt-in private with a required justification of the confidentiality need (e.g. "handles beneficiary PII"), reviewed at triage; private → public is allowed before kickoff, after kickoff needs admin support since commits exist.
- [ ] On Discovery completion the project is scoped (may stay so indefinitely). Publishing requires verified NGO status; "Publish" moves it to triage, not directly open; approved projects appear on the marketplace as open.
- [ ] The NGO can unpublish (→ scoped) before acceptance. If triage requests changes, the project returns to scoped with reviewer comments to edit and resubmit.

**Dependencies:** REQ-004, REQ-023.

---

#### REQ-006: Stripe Fuel Top-Up & Ledger (NGO + volunteer both consume; funding allowed anytime from `draft` onward)

**Description:** NGOs buy fuel via checkout; the full gross is credited to the project (skim recognized at consumption, default 15%, not at top-up). Fuel is funded anytime from draft onward and consumed by two parties — the **NGO** during Discovery (after the daily free allowance, or immediately on a funded project) and the **volunteer** during build (REQ-009) — both paying skim at consumption.

**Two funding moments (either first):** (1) **Discovery "expedite"** — when the daily allowance is spent, the composer offers "fund this project's fuel to keep going now"; this is the credits→dollars boundary (funding continues Discovery immediately, not faster per message). (2) **Match funding** — accepting a volunteer opens the kickoff funding modal with the volunteer's name pre-filled. Both use the same one-off checkout, $50 minimum, and first-fund cap.

**Match-to-fund:** on accept, an **acknowledgment gate** restates the key clauses with the volunteer's name — ai4good is a coordination layer (no delivery obligation); fuel funds AI compute and may be consumed without a viable deliverable; fuel is non-cash credit (not cash-refundable; unused stays as credit or can be donated); the NGO owns its data (Tier-2 → synthetic fixtures); the chosen amount is the NGO's hard maximum exposure. The NGO then picks the kickoff fuel (no pre-filled estimate; complexity tier shown; start-small guidance). A new funder (no prior handed-off project) is capped at a conservative per-project deposit (default $200) and per-day total, rising with completed-project history — bounding any single fraud/chargeback to ~one cap of compute (a leaked card only buys compute). 7 days to complete checkout; on payment → in progress (kickoff, REQ-005.5); unfunded after 7 days → reverts to open, volunteer freed.

**Acknowledgment cadence:** full acceptance at signup (blocks project creation); a per-project hard acknowledgment at the NGO's first funding on that project; the first match acceptance also fires a per-match acknowledgment with the volunteer name; later top-ups show a passive footer link only.

**Acceptance Criteria:**
- [ ] One-time checkout for $50 / $100 / $200 / $500 / custom; the full gross is credited to the project (a $100 top-up = $100 fuel), or to the NGO's general balance for a non-project top-up.
- [ ] **Skim is recognized at consumption, not top-up** — a project that never consumes leaves the full balance as redeployable credit and $0 earned. The skim percent (default 15%) is stamped on each consumption record so rate changes don't alter history.
- [ ] The ledger records every movement (top-up, build/Discovery consumption, credit release, donation, chargeback, goodwill refund, admin adjustments), reconciled on a schedule with drift paging an admin (full double-entry is v1.5). A replayed payment cannot double-credit. An unfunded matched project older than 7 days reverts to open and notifies both parties.

**Unused fuel (non-cash, project-scoped):**
- [ ] **No cash-out / withdrawal in v1** — removing the only money-out path eliminates laundering risk and Treasury/AML machinery (only the chargeback half survives). Leftover fuel stays on the project and survives a volunteer change (REQ-027 re-opens it for the next volunteer).
- [ ] Only at handed-off or cancelled is leftover credit released to the NGO's general balance (non-cash, no decay clock), where the NGO can keep it, donate it to ai4good (tax-deductible), or (v1.5) move it to another project. No cash refund, no decay clock, no silent auto-renew — disclosed upfront. Dashboard shows "$X redeployable credit."
- [ ] **(Admin-only) goodwill refund:** out of band, an admin may issue an original-charge refund within the processor's dispute window — rare, audited, not a user feature.

**Auto-top-up (deferred to v1.5):** v1 is manual top-up only; when the fuel-low blocker fires (warning 20%, blocking 0%) the NGO is notified and tops up. Off-session charging lands in v1.5.

**Chargeback + reserve:**
- [ ] On a dispute: freeze the NGO (no new funding/matching), revoke the project's access, reverse the unconsumed balance, and book the consumed-compute loss against revenue (never negative); open a review task; submit the audit-logged acknowledgment (timestamp + IP) as evidence. Loss is bounded to compute, capped by the first-fund cap + rapid revocation.
- [ ] A small chargeback reserve (year-1 ~$5–10k) with a low-coverage alert. **Detective fraud signals (not preventive in v1):** deny a previously-flagged payment fingerprint; raise a collusion-review task on shared payment/device/IP/GitHub-email-domain between an NGO and its matched volunteer. Anti-Sybil work is v1.5.

**Dependencies:** REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.

---

#### REQ-007: Volunteer Profile & Marketplace

**Description:** Volunteers sign up (preferably via GitHub), build a profile, and browse + apply to open projects.

**Acceptance Criteria:**
- [ ] Sign up via GitHub, another provider, or email/password; profile works without GitHub, which can be linked later. If linked, the profile auto-populates top languages, public repo count, and a contribution-graph summary; otherwise those fields are hidden.
- [ ] The volunteer adds skills, causes, hours/week availability, and an optional bio.
- [ ] **GitHub link required to apply:** clicking "Apply" without a linked GitHub blocks with a "Link GitHub to apply" modal + one-click sign-in; on link the volunteer gains the repo-creation access needed to receive/target a project (from Lovable, REQ-021, or a coding agent) and the application continues. Browsing and profile-building remain available without GitHub. Recorded for reconciliation.
- [ ] **Access removal depends on cause:** voluntary deactivation removes org access but leaves active-project collaborator grants intact (handoff cleans up); **AUP suspension** is an aggressive teardown protecting NGO data — the account is suspended (writes blocked), then per active project the volunteer's repo access, metering credentials, and Linear membership are revoked and the NGO is asked to remove them from Lovable (ai4good cannot revoke Lovable seats), retried until done and logged; re-enable rebuilds access lazily; 24-month inactivity is a soft removal like voluntary.
- [ ] Dashboard shows GitHub status. The marketplace lists open projects with title, summary, complexity tier, suggested stack, cause tags, NGO name + verification badge, a 🔒 Private badge if private (title + summary shown, code only to the assigned volunteer), and posted date.
- [ ] Filters: skill, cause, complexity tier, stack, with/without Lovable, public vs private. Each listing shows skill/cause overlap badges ("Skills match: N of M", "Causes match"); numeric score deferred to v1.5. Volunteers apply with a short cover note; NGOs see applicants in their dashboard.

**Dependencies:** REQ-001, REQ-005, REQ-008.

---

#### REQ-008: GitHub Integration (Code substrate + dev-internal issue tracker)

**Description:** When a project is funded (matched → in progress), a GitHub repo is provisioned for the code. **v1 is Track A only — every project takes the Lovable path; the coding-agent-only path is reserved for post-v1 Track B.** (Per Lovable docs, its GitHub app creates the repo wherever the NGO points it, and Lovable collaborator permissions do not propagate to GitHub.)

**Provisioning (always the ai4good code org):** ai4good does not pre-create the repo — the Lovable setup checklist (REQ-021) lands it in the code org with the NGO's chosen visibility, no platform-admin involvement; the volunteer gets maintain-level access, the NGO admin triage-level. The volunteer can then clone and run a coding agent locally. Push/pull-request activity drives cadence stats (REQ-010) and carries Linear identifiers from commits/branches (REQ-026); status moves via Linear's own GitHub integration. The Linear tree (REQ-026) is the source of truth for NGO deliverables; **GitHub Issues are dev-internal only** and not surfaced to the NGO.

**One-time setup (never repeated):** ai4good's and Lovable's GitHub apps are installed org-wide once. **A single org holds both public and private/Tier-2 projects in v1** (a separate private org is a v1.5 hardening), protected by a continuous invariant: **org membership alone grants no read access — a volunteer sees a repo only as a per-project collaborator, and a monitor auto-remediates any drift as a P0** (one accidental flip would expose every private repo). Members can create their own repos (so Lovable can, on their behalf) but not read others' private code. The app credential is least-privilege and rotated; outside collaborators are allowed only for NGO admins (per-project, triage). Every repo boots from committed ai4good files carrying the attribution block, Linear working norms (one issue in progress; assign before starting; comment when blocked; never move status by hand), branch/magic-word conventions, the Linear config, hooks, a reviewer-agent skill (REQ-026), and a gitignored env stub; any ai4good token is show-once and never committed.

**Acceptance Criteria:**
- [ ] The platform mints short-lived access tokens on demand rather than storing long-lived ones.
- [ ] **v1 (Lovable path):** the project goes in progress without a pre-created repo; the Lovable checklist drives repo creation, and once the URL validates the project is uniform with the reserved coding-agent path.
- [ ] **Handoff prerequisite (Platform Promise §2):** a repo URL is required before in progress → handoff pending; without one "Ready for Handoff" is disabled with a finish-checklist prompt — preserving the all-work-in-a-repo guarantee even when private.
- [ ] No auto-created Issues from the scope (the Linear backlog is canonical); standard dev-internal issue labels at bootstrap. Push and pull-request activity is tracked from creation; the Issues webhook is unused in v1.
- [ ] The README template (committed after the volunteer provides URLs) includes title, NGO name, plain-language summary, license, and a "View on ai4good →" link.
- [ ] **On handoff:** the repo stays in the code org with an optional one-click transfer to the NGO's org; ai4good removes the volunteer's collaborator role; the NGO removes them from Lovable separately.

**Dependencies:** REQ-006, REQ-007, REQ-021, REQ-026.

---

#### REQ-009: LLM Gateway — Virtual Keys, Caps & Inline Fuel Metering (decision-21)

> **Decision-21:** the per-project provider-workspace + manual key + usage-poller model is replaced by an ai4good-controlled metering layer in the request path between the volunteer's coding agent and the model provider (the former "AI Proxy," pulled into v1 as the metering path). Deleted: per-project workspace provisioning, the manual key ops queue, the usage poller, daily reconciliation, and the fuel-zero deactivation/reactivation saga. **Hosting is open (OD-6).**

**Description:** Every (volunteer, project) pair gets metering credentials issued automatically at kickoff — no ops task. Volunteer setup is minimal (a base URL + a key); their coding agent works unchanged. The layer checks status/caps/fuel/fingerprint, injects the governance prompt, forwards using the **real provider key that lives only in the layer** (volunteers never see it — mechanical no-billing-exposure), streams back, prices usage, and writes the ledger inline. Doctrine: nudges live in editable files, durable norms in the injected prompt, hard invariants in code; third-party permissions are trusted for access, never policy. The fingerprint is a copyable tripwire (turning accidental misuse into clear intent), not the control — the credential is; caps bound exposure, the ledger attributes it, revocation ends it, so detection tolerates latency, and caps aren't sized adversarially since a leaked credential only buys compute.

**Acceptance Criteria:**
- [ ] One credential per (volunteer, project): shown once with a copy button, stored hashed, minted at kickoff, never logged; the raw value reaches only the volunteer's environment. Onboarding is a base URL + a key on the dashboard with instructions; setup-failure copy instructs rather than accuses.
- [ ] **Streaming pass-through** with streaming intact and negligible added latency on the legitimate path.
- [ ] **Budget caps:** a per-request cap + a rolling-24h window sized a few times a heavy human day; 80% → soft warning; 100% → hard stop with a one-action coordinator override (values OD-3).
- [ ] **Fingerprint check:** the repo carries a static marker riding the system prompt; the layer checks it against the credential's project on substantive requests, rejecting a mismatch with instructive copy ("this key belongs to <project>…").
- [ ] **Governance injection:** every request appends the governance block (decline off-project requests; never move PM status).
- [ ] **Inline ledger writes:** per response, convert usage to cost, apply skim, and write paired consumption + skim records (REQ-006 invariants), once per request and non-double-charging; the ledger stores token counts + metadata only, plus the task reference when it resolves (REQ-034).
- [ ] **Fuel thresholds:** 20% → NGO alert + fuel-low blocker; 5% → volunteer warning; **0% → the next request is declined inline with the cause** ("project fuel is exhausted — ask your NGO to top up"); a top-up passes the next request with no reactivation step. The balance check is real-time.
- [ ] **Failure copy is flat externally** except fuel suspension (which states its cause); rich diagnostics only on the authenticated dashboard; first-week failures are an onboarding-UX metric, not a security signal.
- [ ] **Revocation is instant and self-serve** (NGO or admin), replacement instant; all project credentials terminate at handoff (REQ-012), abandonment (REQ-027), and AUP suspension (REQ-007).
- [ ] **Privacy:** request bodies inspected transiently, never persisted; the ledger stores counts + metadata only; any mismatch signal is a score/boolean, never paths or content.
- [ ] **Self-audit + leak hygiene:** the dashboard shows the volunteer's own per-project usage (today/week, cap, last session); the template gitignores the env file; a secret-scan pattern for ai4good keys is registered; a canary flags any key seen after appearing in a public commit.
- [ ] **Escalation ladder — documented, not built in v1** (so the decision not to surveil is visible): weekly ledger-vs-activity reconciliation, fingerprint rotation with a grace window, a per-volunteer short-TTL token, and sampled content classification triggered only by reconciliation.

**Dependencies:** REQ-006, REQ-024, REQ-034, REQ-012/REQ-027/REQ-007.

---

#### REQ-010: Project Page (single view) & Cadence Stats

**Description:** Each project has **one public page** — the same view for everyone (NGO, volunteer, admin, logged-out). The platform is PM/coordination only; the volunteer runs their dev workflow on GitHub. No "Developer view" duplicating GitHub.

**Acceptance Criteria:**
- [ ] One public view, no per-role variants. **Private projects read-restrict task details + comments (REQ-026):** logged-out viewers see metadata + progress count + 🔒 Private badge only; public projects show the full task tree (Platform Promise §2 OSS-by-default).
- [ ] Metadata header: title, NGO name + badge, status, assigned volunteer, repo URL (mid-setup it shows "Repo URL not provided — volunteer is completing Lovable→GitHub setup" instead of a broken link), complexity tier, cause tags.
- [ ] **PM task tree (REQ-026)** as primary content with hierarchical progress bars, status badges, a "Now working on" highlight, and plain-language titles. Progress % = done P0 / total P0.
- [ ] **Plain-language activity feed:** each commit rendered readably (e.g. "Volunteer completed work on Task 3.2 — Scheduler core (2h ago)") rather than "PR #14 merged."
- [ ] **Reference files (REQ-032):** the NGO's uploaded need-files, downloadable by the assigned volunteer + NGO admins + admin honoring visibility (private restricts to members; logged-out sees a count); the NGO can add/remove before handoff.
- [ ] **Clarifications tab + banner (REQ-024):** a persistent Q&A log of resolved clarifying-question blockers, plus an "Awaiting NGO clarification" banner with a call to action when ≥1 is unresolved.
- [ ] The fuel gauge updates near-real-time. **No Issues, PR list, or raw commit log** — the header repo link is the only GitHub touchpoint.
- [ ] **Cadence stats** (from commit ingestion, no GitHub UI): commits this/last week + delta; last-activity (red if >14 days in progress); PM close rate; a 12-week contributor sparkline; a health badge (Active <7d / Quiet 7–14d / Stalled >14d) — also shown compactly on cards and dashboards.
- [ ] **Dual fuel-meter (REQ-021):** every project is Lovable, so two meters render side by side — an AI-coding fuel meter (balance, % remaining, low/depleted) and a Lovable status meter (status + workspace link + "Top up Lovable credits" when low, or a "Set up Lovable" call to action + blocker status if setup isn't done), labeled for their two funding paths (fuel vs. direct-to-Lovable).

**Dependencies:** REQ-008, REQ-009.

---

#### REQ-011: Marketplace Sort + Skill/Cause Overlap Badges (v1 minimal)

**Description (v1):** Listings show **skill- and cause-overlap badges** as a visual hint — no numeric score, no scoring algorithm, no breakdown UI. Volunteers self-select; NGOs accept or decline without an algorithmic recommendation. The full deterministic score is deferred to v1.5.

**Acceptance Criteria (v1):**
- [ ] Each listing shows a "Skills match: 3 of 5" badge (volunteer skills vs. suggested stack) and a "Causes match" badge on any cause overlap — visual cues only, no score, ranking, or detail page.
- [ ] Default sort is newest-first; filters: skill, cause, complexity tier, with/without Lovable; no "best match" sort. No ML or NGO-satisfaction weighting in v1.

**v1.5 (deferred):** a deterministic score with a breakdown UI (skill / cause / availability / GitHub language / completion credit / KYC), per-listing score + breakdown page, and an NGO-satisfaction signal as a private weight.

**Dependencies:** REQ-007.

---

#### REQ-012: Handoff Workflow

**Description:** A structured workflow taking a project from "code done" to "NGO operating independently."

**Acceptance Criteria:**
- [ ] The volunteer clicks "Ready for Handoff" once all P0 PM tasks are done (open Issues don't block). **Hard precondition (Platform Promise §2):** a repo URL must exist — every project ends in a code-org repo; without one the button is disabled with a resolve-Lovable-setup prompt (no admin escalation). Because done arrives via Linear's GitHub integration on PR merge, every done P0 carries a merged PR.
- [ ] Automated checks: README, RUNBOOK, deploy-instructions section, ≥1 passing CI run on main, and a LICENSE if the project is public.
- [ ] **Deploy-to-running (the deliverable is a running tool):** a deployment URL is required. **Track A (Lovable):** the app is already hosted — the volunteer pastes the live URL (without it a Track-A handoff cannot complete), confirms NGO ownership of the Lovable workspace, and runs the guided-maintenance ritual: enable row-level security on the provisioned database (off by default — a PII footgun), demo plan/revert/checkpoint rollback, set a Lovable spend cap / budget alert, and confirm two-way GitHub sync.
- [ ] **30-day-alive signal (north-star):** a health check pings the deployment URL at 30 days post-handoff and records the alive signal — measured, not guaranteed (no SLA); extended to 30/60/90-day checks in REQ-035.
- [ ] The NGO sees a "Review Handoff" call to action (repo URL + live URL + checklist), then signs off or rejects with comments. **Rejection cap:** the third rejection routes to neutral platform review so an NGO can't extract unbounded unpaid rework; the volunteer can contest.
- [ ] On accept: handed off; leftover fuel → general balance as non-cash credit; completion credit + "Shipped first tool" badge; all project credentials terminated (REQ-009); Linear membership removed + tree snapshot (REQ-026); REQ-035 attribution captured. The repo stays in the code org with the NGO admin promoted and the volunteer downgraded, optional one-click transfer to the NGO's org; private/Tier-2 stay private in v1.
- [ ] No tip flow in v1 (v1.5). The REQ-035 attribution step (testimonial + 3 credit-framed dimensions) is capture, not a satisfaction score, and never blocks acceptance.

**Dependencies:** REQ-008, REQ-006, REQ-021, REQ-009, REQ-026, REQ-035.


#### REQ-021: Lovable Integration — Track-A Durable Home + Claude-Code-Orchestrated Build

**Description:** For Track-A "NGO-maintains-it" projects, **Lovable is the primary deliverable vehicle and the NGO's durable post-handoff maintenance home** — the non-technical NGO evolves the live app via Lovable's chat, no developer needed. During the build, **Claude Code is the single entry point:** the volunteer works in Claude Code (where the ai4good Skill, fuel metering, and enforcement live), and it orchestrates Lovable for the UI/app layer while doing backend/logic/tests directly — keeping ai4good's metering + scope + audit authoritative and giving the volunteer one pane of glass. **Track B is deferred to post-v1 (decision-19); in v1 every built project is Track A and uses Lovable.**

**Build-phase model:**
- **Graceful fallback:** if Lovable orchestration breaks, the volunteer drives Lovable manually and ai4good still enforces — **Track-A builds never go dead from a Lovable change.**
- **Cost enforcement:** because the volunteer's Skill makes the Lovable calls, it enforces a per-task Lovable credit-budget cap, **logs every Lovable call to the audit trail**, and surfaces the NGO's Lovable credit balance inside ai4good. Lovable bills the NGO's own workspace, so enforcement is structural, not honor-system.
- **Post-handoff** the NGO owns the Lovable workspace and self-maintains via chat — no dependency on Claude Code or ai4good.

**Why the NGO self-provisions Lovable:** Lovable has no per-project metering API and bills per workspace. NGO self-provisioning gives zero ai4good infrastructure dependency on Lovable, pricing transparency for the NGO, and NGO ownership of the workspace from day one — the durable post-handoff home, no migration.

**Lifecycle:** Discovery flags Lovable as recommended with a rationale and **no dollar estimate**; the scope doc notes "paid directly to Lovable, not deducted from fuel." Before kickoff a reminder tells the NGO to set up the workspace and invite the volunteer. **Setup is mandatory at kickoff:** ai4good raises a **blocking** "set up Lovable" item to the NGO (who needs no GitHub knowledge; the platform admin is out of the per-project loop). The NGO signs up (a paid Lovable plan — the NGO's own cost), creates a workspace/project from the scope summary, invites the volunteer, and confirms in ai4good; **ai4good validates the setup** (repo under the platform org, matching the requested visibility, no name collision) and holds the blocker open on the specific failed check until all pass. The skip-Lovable opt-out is removed in v1 (reserved for post-v1 Track B). **During work (manual in v1)** the volunteer sees a Lovable status of active / credits-low / blocked; low or blocked shows the NGO a "Top up Lovable credits" CTA to Lovable's billing, after which the NGO clicks "unblock." **ai4good does not resell Lovable credits in v1** — the NGO pays Lovable directly; automatic credit detection is deferred to v1.5. **At handoff** the NGO removes the volunteer from the workspace, retains the workspace + billing, and may transfer the repo to its own org.

**Acceptance Criteria:**
- [ ] Discovery flags Lovable with a rationale, no dollar figure, and a "paid directly to Lovable" disclaimer.
- [ ] Two states are tracked: "Lovable recommended" (always true in v1) and "Lovable enabled" (NGO completed setup — drives widget visibility).
- [ ] The Lovable status widget renders only when enabled; the volunteer can set credits-low/blocked and the NGO resets to active via "topped up — unblock"; credit detection is manual only in v1.
- [ ] Setup auto-initiates at kickoff (no "use Lovable?" choice); the setup blocker auto-resolves on ai4good's validation of the setup, and the NGO does zero GitHub work.

**Explicit non-goals (v1):** ai4good does **not** subscribe to Lovable for NGOs, meter or attribute Lovable credit consumption, debit Lovable cost from fuel, provide the NGO's payment method, or resell Lovable credits. ai4good's backend does not integrate with Lovable; only the volunteer's Skill calls Lovable (under the NGO consent gate) to surface the balance and enforce the per-task cap.

**Dependencies:** REQ-004, REQ-008, REQ-010, REQ-016, REQ-024, REQ-026.

---

#### REQ-022: Stripe Connect for Volunteer Tips (DEFERRED to v1.5 per §11)

**Description:** Optional gratitude tips from NGOs to volunteers at handoff (Story 6). Platform takes **0% on tips** — only standard processing fees apply.

**Status: Deferred to v1.5.** Tip infrastructure is not load-bearing for the core thesis (NGO + volunteer + fuel + handoff). v1 handoff sign-off presents no tip CTA; v1 volunteer reputation is completion credit only (REQ-014). **v1.5 trigger:** the first pilot handoff where an NGO asks how to thank the volunteer with money. When built: onboarding gated to volunteers with ≥1 handoff, tips routed entirely to the volunteer with zero platform fee, a claim/refund window if the volunteer hasn't onboarded, and tax reporting.

**Dependencies (when built):** REQ-006, REQ-012.

---

#### REQ-023: Platform Triage Gate (compliance review before marketplace)

**Description:** Every project passes a **platform-admin compliance review** between scope completion and marketplace publication, protecting the platform's open-source-only and nonprofit-mission norms and catching policy violations (commercial intent, surveillance tooling, abusive scope) before volunteers see it.

**What the reviewer checks:**
1. **Open-source alignment** — no closed-source-for-resale outputs (private repos allowed for legitimate confidentiality, never commercial resale).
2. **Nonprofit purpose** — the ask serves the NGO's verified mission.
3. **Scope reasonableness** — scope matches Discovery's complexity tier; no extreme mismatch (qualitative; v1 has no dollar budget).
4. **Policy compliance** — no surveillance, spam, illegal use, or AUP violation.
5. **Private-repo justification** — if private was requested, the justification is legitimate (real PII, internal-only), not "don't want anyone to see."
6. **Data-sensitivity gate** — confirms Discovery's tier; **Tier 2 requires a fixtures-only build plan** (synthetic/anonymized data; real data connected only post-handoff), else changes-requested or reject. Tier-2 projects default to private.
7. **Discovery risk flags** — surfaced as reviewer focus areas.

**Acceptance Criteria:**
- [ ] On NGO "Publish" (REQ-005) the project enters the admin triage queue, not the open marketplace; the queue lists pending triages oldest-first with title, NGO name + tier, scope summary, complexity tier, and risk flags.
- [ ] Approve → open marketplace; Reject → cancelled with reason; Request Changes → back to scoped with reviewer comments visible to the NGO. Every decision is recorded; the NGO is notified (REQ-016).
- [ ] **SLA target:** 48 hours to decision during the v1 pilot; an aging-queue dashboard exists.
- [ ] **All NGOs go through triage in v1** (KYC-based skipping is post-v1.5); re-submission after changes-requested re-enters triage with prior comments visible; triage access is restricted to the platform-admin role.

**Dependencies:** REQ-001, REQ-005, REQ-016.

---

#### REQ-024: Project Blockers (orthogonal operational health)

**Description:** Captures **operational blockers** within a project, orthogonal to lifecycle status — a project can be in-progress and healthy, or in-progress with unresolved blockers (dev waiting on NGO clarification, fuel depleted, Lovable credits low). This separates "dev is ghosting" from "dev is waiting on someone else," which affects volunteer reputation, the NGO-satisfaction signal, and admin escalation. Per decision-10, blockers are a raise/resolve surface that emits notifications (REQ-016); aging escalation runs on the shared periodic scan.

**Blocker types (v1):**

| Type | Raised by | Severity | Resolution |
|---|---|---|---|
| Clarifying question | Dev | info / warning / blocking | Dev or NGO resolves |
| Awaiting NGO review | Dev | info / warning | Manual |
| External dependency | Dev, or auto at kickoff | info / warning / blocking | Manual (or auto) |
| GitHub collaborator needed | Dev (rare legacy: NGO hosts in its own org) | blocking | NGO confirms collaborator + App installed |
| Lovable setup pending | Volunteer at kickoff setup | blocking | ai4good validates the setup (REQ-021) |
| Fuel top-up needed | Auto | warning at 20%, blocking at 0% | Balance back above 20% |
| Lovable credits low | Volunteer via the status widget (REQ-021) | warning / blocking | NGO clicks "topped up — unblock" |
| ~~Spend-anomaly review~~ | **Deferred to v1.5 (decision-14)** | — | — |

**User-facing rules:**
- **Dedup:** auto/single-owner types allow one unresolved instance per project, upgrading severity in place; manual types (clarifying question, awaiting NGO review, external dependency) allow multiple concurrent.
- **Cascade:** on transition to handoff, all open blockers auto-archive (no false-positive aging emails on completed work).

**Notification + aging:** a raised blocker notifies NGO admins immediately (auto-fuel-blocking also escalates to the platform admin); resolution notifies dev + NGO; aging reminders fire at 48h (NGO) and 7d (NGO + platform admin, project flagged "at risk"). For a between-actors blocker (Lovable setup pending) the 48h/7d messages route to NGO + volunteer; the admin sees it only at 7d.

**Clarification as first-class UX:** two entry points — a general project-page "Ask NGO a question" and a task-anchored "Raise concern on this task" (linking to REQ-026) — using one structured form (topic, what you tried, what you need). A project-page banner shows while any clarifying question is unresolved (volunteer can continue other tasks; this one is paused). Resolved clarifying questions persist as a project **Clarifications Q&A log** (who asked/answered, when) for handoff context, post-handoff contributors (REQ-017), and cross-project search.

**Surfacing:** the project page (REQ-010) shows a badge with unresolved count + severity expanding to the list; marketplace/dashboard cards show a compact indicator; the NGO Dashboard (REQ-013) shows an "Action needed" rail sorted by severity then age; cadence stats annotate the Quiet/Stalled badge with "(blocked on NGO action)" or "(blocked on fuel)." Blockers never reduce the volunteer's public completion credit (REQ-014) — often outside the dev's control.

**Acceptance Criteria:**
- [ ] The volunteer can raise a blocker (type, severity, title, body); it notifies NGO admins and shows on the "Action needed" rail. Auto-blockers raise at the fuel warning/blocking thresholds with severity upgrade-in-place; the Lovable-credits blocker raises from the widget (REQ-021).
- [ ] Manual resolution requires a note; auto-resolution fires for fuel and Lovable-credits on the documented conditions; cascade-archive fires on handoff; 48h/7d aging reminders fire per the flow above.
- [ ] Project page renders the badge + list; cards render the compact indicator; the NGO Dashboard renders the "Action needed" rail; cadence stats carry the blocker annotation.

**Dependencies:** REQ-009, REQ-010, REQ-013, REQ-015, REQ-016, REQ-021.

---

#### REQ-025: Change Requests (in-flight scope additions)

**Description:** NGOs raise structured Change Requests (CRs) for additional scope while a project is in-progress. The assigned volunteer **accepts or declines — a binary decision, not an estimation exercise.** Fuel is **progressive, not decisive:** no upfront per-CR quote or top-up; accepted CRs add to working scope and consume from the existing pool as work happens, with the existing fuel-low blocker (REQ-024) + top-up flow (REQ-006) handling further funding. Accepted CR work is added to the project's task tree (REQ-026) and **blocks handoff like original scope.**

**Design principles (locked):**
- **NGO raises; volunteer decides** — the NGO drives scope intent, the volunteer is the work-acceptance authority. **Decline is a legitimate boundary** and never penalizes the volunteer's completion credit or badges.
- **No upfront volunteer estimation** — estimation is its own skill and creates asymmetric power / conflict of interest.
- **Fuel is progressive** — no upfront per-CR funding moment; top-ups are reactive.
- **AI-assisted assessment is v2**, not v1 — v1 ships the minimal workflow.

**v1 minimal flow:** the NGO raises a CR via a 3-field form (title, description, rationale), shown only during in-progress. It surfaces as an actionable row on the project page and a **low-tone** notification to the volunteer with inline **Accept / Decline** (optional note). **Accept** adds the CR to working scope as handoff-blocking work and notifies the NGO; **Decline** records the note and lets the NGO revise + re-raise. Work then proceeds under the existing fuel/Lovable systems; fuel-low during CR work fires the existing blocker. **Completion is implicit in v1** — the NGO can manually mark a CR completed.

**CR guardrails — volunteer-focus protection (decision-16):** the volunteer's focus is the **default-protected state.**
- **Opt-in, never interrupt.** A CR fires a low-tone notification (in-app + CR inbox; **no per-CR email**) surfaced between tasks, not a real-time ping. **Only Accept creates work** — the dev is never auto-assigned.
- **One open CR at a time** (hard-enforced) — the NGO cannot submit another until the volunteer decides the current one.
- **Decline is penalty-free** and presented as a normal action.
- **NGO framing at submission:** a change request is optional; the volunteer decides whether and when; accepted changes add scope, may extend the timeline, and consume more fuel.

**Acceptance Criteria (v1 minimal):**
- [ ] One open CR per project: the "Request a Change" CTA is disabled while a pending CR exists and shows only during in-progress; fields are title, description, rationale, all required, with the submission framing on the form.
- [ ] The CR surfaces as an actionable row + a low-tone notification (in-app + CR inbox; no email) with inline Accept / Decline for the assigned volunteer; the decision + note are recorded; **only Accept creates work.**
- [ ] On Accept, the CR is added to the task tree as handoff-blocking scope (REQ-012/REQ-026).
- [ ] Declining does not affect the volunteer's completion credit; the NGO can manually mark a CR completed.

**v1.5 (deferred):** a grouped CR section; automatic completion detection; an AI CR Agent drafting acceptance criteria; an NGO-side cancellation flow. **v2 (out of scope):** reducing scope mid-project; splitting a project via CR — not on the roadmap.

**Dependencies:** REQ-006, REQ-010, REQ-016, REQ-024, REQ-026.

---

#### REQ-026: Platform Task Management (Linear as system of record — decision-20)

**Description (decision-20, replaces decision-9's git-as-truth tree):** Task state lives in **Linear** — one workspace per NGO project (mirroring the Lovable workspace-per-project pattern). Ground: **"real signals, not AI-authored narratives"** — under the prior design the volunteer's agent was the writer of task state, so every NGO-visible status was ultimately agent prose. Linear gives real-time, actor-attributed events; an enforceable read/write split; and a hosted backlog that exists **before clone** (an onboarding surface). Volunteers read the backlog, self-assign, and comment; **status transitions are deterministic** — a merged PR moves an issue to Done. ai4good observes Linear and mirrors it into the NGO-facing Status Panel (REQ-010) and the REQ-033 assistant. GitHub Issues stay dev-internal, for code bugs only.

**Coordination is platform-owned:** delivery infrastructure is NGO-owned (the Lovable workspace, the repo); **coordination infrastructure (Linear) is platform-owned and does not transfer at handoff.** Post-handoff the workspace goes dormant; a snapshot of the task tree is retained in the repo for handoff residency. If a paid tier is ever required, the platform pays — never the NGO. **Workspace creation has no public API, so workspaces are pre-created ahead of kickoff and assigned at kickoff; if none is ready, kickoff stalls (the only stall mode).**

**Decomposition (coordinator-owned):** at funding, automation drafts the issue tree from Discovery's user stories + acceptance criteria; the platform admin (coordinator) reviews/edits/approves. **Briefs must be session-sized and dependency-ordered** — the precondition for both the pull model and per-task burn data (REQ-034).

**Pull-based workflow:** self-assignment is the commitment signal — it flips the panel to "in progress"; volunteers pull the next unblocked issue and the coordinator does not push. **Norms** (carried in the injected governance prompt, REQ-009): one issue in progress at a time, assign before starting, comment when blocked, **never move status by hand.** **Onboarding:** match → workspace invite → browse session-sized briefs **before cloning** → first session connects Linear once → first pull activates attribution (REQ-034). Volunteers may run agentic loops; loops must **degrade on connection failure** (queue updates locally, surface at session end) and **loop PRs are never auto-merged.** **[OD-1 — reviewer identity + merge authority per project.]**

**Write authority (real-signals enforcement):**

| Actor | Can | Cannot |
|---|---|---|
| Volunteer + their agents | Read; comment; self-assign | **Change issue status** |
| GitHub integration | Move status on PR merge | — |
| Platform | Create issues, revert, cancel non-p0 at handoff | — |
| NGO | Nothing in Linear — visibility is the Status Panel only | — |

The read/write split cannot be expressed in Linear's permissions, so it is enforced one layer up: **any status change not backed by a merged PR is auto-reverted with an explanatory comment.** Agent actions are attributed to the volunteer's identity — human vs agent is indistinguishable and accepted (the volunteer owns their agents' actions).

**Projection + comments:** the NGO-facing status view is derived **solely from Linear events** (a single source; nothing else writes it), and a redelivered event is recorded once, never doubled. **Developer comments in Linear are internal and are not mirrored into the NGO view;** the NGO's own comment thread is separate (decision-15).

**Lifecycle hooks:** CR Accept adds one scope item under the CR (REQ-025); at handoff-pending the platform cancels remaining not-started non-p0 issues but **never p0** (handoff requires all p0 done, REQ-012) and commits the task-tree snapshot; on handoff the volunteer's membership is removed and the view goes read-only; on abandonment (REQ-027) the ex-volunteer's in-progress issues return to the backlog and membership is removed.

**Acceptance Criteria:**
- [ ] The NGO-facing status view is written from Linear events by a single source; its visibility mirrors the project's (public → open read; private → members only).
- [ ] At kickoff a pre-created workspace is assigned, the volunteer invited, and the coordinator-approved decomposition (session-sized, dependency-ordered) pushed; if none is ready, an external-dependency blocker fires.
- [ ] Status flows **only** from a merged PR; any manual status change is auto-reverted with an explanatory comment + a low-tone notification to the volunteer.
- [ ] The NGO Status Panel (REQ-010) renders a "Now working on" strip + hierarchical tree + activity feed, updating live. **[OD-2 — Status-Panel scope + onboarding mechanics.]**
- [ ] The volunteer can raise task-anchored clarifying-question blockers (REQ-024); the NGO appends comments; scope changes go through CR (REQ-025). A task-tree snapshot is committed to the repo at handoff (and periodically while in-progress); an aging scan flags issues idle for N days, proposing release to the backlog.
- [ ] **[VERIFY — architecture-deciding]:** the plan's free tier must support the needed automation; fallback if it regresses is a paid tier (platform pays) or git-based task truth.

**Dependencies:** REQ-004, REQ-005.5, REQ-008, REQ-010, REQ-016, REQ-024/025, REQ-034. **External dependency: Linear** (platform-owned coordination infra, one workspace per project).

---

#### REQ-028: ai4good Claude Code Skill (volunteer-facing single pane of glass)

**Description:** A Claude Code Skill shipped by ai4good that makes the volunteer's local Claude Code the operating environment for ai4good projects. It packages ai4good's conventions, helper commands, and **session-governance behaviors** (task binding, Linear pull-model norms — decisions 20/22) as installable, updatable agent code rather than docs the volunteer must read and remember. It runs on every Claude Code session in an ai4good repo. **Why a Skill (vs docs):** the operating model is non-trivial and docs drift; a Skill runs every session and its updates ship via the standard update mechanism, so the platform's opinion stays current.

**Decision-20 impact:** tasks live in **Linear.** The Skill reads / self-assigns / comments issues via the volunteer's Linear access (never status — a merged PR moves status, REQ-026), maintains the per-session task binding for attribution (REQ-034), and pulls NGO-side context (blockers, comments, fuel, project context).

**v1 minimal scope:**
- **Session bootstrap** primes the volunteer with the scope summary, current status, in-progress task, unresolved blockers, recent NGO comments, and fuel runway; verifies the Linear connection (prompting the one-time flow if needed); and surfaces the CR inbox + a one-line status banner.
- **Task binding + degradation:** the session binds to the assigned issue so attribution rides the work. **On Linear connection failure the session continues without stopping** — intended updates queue locally and surface at session end; attribution floors to unattributed. **Attribution never blocks work.**
- **Helper commands** (each with a manual equivalent): pick and self-assign the next unblocked issue (the commitment signal); show fuel balance + runway; view/raise blockers; run the handoff precondition check; disable / re-enable the Skill.
- **Branch/commit convention:** the Skill names branches and PRs so the Linear identifier links the work and status moves on merge — the only status path (REQ-026); the volunteer can override, and the Skill assists, never mandates.
- **Manual fallback always present** (the Linear app; the ai4good project page). Disabling the Skill still works — attribution degrades to unattributed; norms still arrive via the injected governance prompt (REQ-009).

**The Skill is the Track-A orchestration shell (v1 CORE)** — how Claude Code drives Lovable (with the graceful fallback of REQ-021):
- **Triage logic:** decides local vs delegate-to-Lovable per task (visual UI → Lovable; everything else → Claude Code local), explaining the choice with an override.
- **Budget guardrails:** enforces a per-task Lovable prompt cap with interactive confirmation past it and a running NGO-credit burn estimate; refuses an NGO-set hard cap.
- **Quality loop + audit:** after Lovable work, pulls the diff and runs tests locally; **every Lovable call is logged with a cost estimate,** surfacing NGO burn rate on the admin + NGO dashboards.
- **NGO consent gate:** an "allow the Skill to orchestrate Lovable" toggle (default ON for Track A at kickoff, with cost disclosure; revocable) is checked before any Lovable call.

**Deferred (v1.5+):** Replit as a second builder platform; v2 autonomous-orchestration polish.

**Acceptance Criteria (v1 minimal):**
- [ ] Install + session bootstrap work end-to-end; bootstrap auto-runs in an ai4good repo, primes the context fields above, and surfaces the status banner.
- [ ] The task binding activates on self-assignment (verified by observing attribution carry within the same session). Failure mode: Linear down → the Skill queues updates + surfaces at session end; attribution floors to unattributed; work is never blocked.
- [ ] The helper commands work end-to-end; the branch/commit convention is auto-applied and respects volunteer override.
- [ ] Disable + re-enable persists; documentation covers the implication of disabling (attribution degrades; Linear norms still arrive via the injected governance prompt).

**Dependencies:** REQ-026, REQ-024, REQ-008, REQ-012, REQ-009, REQ-034, the volunteer's Linear connection (one-time at first session).

---


#### REQ-027: Abandonment / Rematch (volunteer ghosts mid-project)

**Description (P0).** Ghosting is High-likelihood and irreducible, yet the lifecycle had no `in_progress → open` edge. REQ-027 defines release, rematch, and partial-fuel treatment.

**Lifecycle edge `in_progress → open`:** triggered by inactivity (no branch activity AND no task movement: 14d → reminder, 21d → auto-release) or NGO / volunteer manual release. The clock runs only while `in_progress` (v1 has no `paused` state).

**On release:** revoke the ex-volunteer's repo access, project keys, task-tracker membership, and (Track A) Lovable workspace access — the AUP per-project teardown minus account suspension; remaining fuel STAYS on the project (non-cash, project-scoped) for the next volunteer, no refund; return in-progress tasks to the backlog, preserve done tasks + commit history; distinguish ghosted (timeout — dents the reputation signal) from released-for-cause (initiated — no auto-penalty); re-open with rematch priority, NGO notified, prior applications cleared.

**Acceptance Criteria:**
- [ ] Inactivity computed only for `in_progress`; reminder 14d, auto-release 21d.
- [ ] An in-progress task with no branch activity for N days (tunable) raises a coordinator flag.
- [ ] `in_progress → open` added to REQ-005.5; teardown reuses the AUP path; fuel preserved on the project.
- [ ] Inactivity / release / rematch notifications (REQ-016); manual release available to NGO and to the volunteer stepping down, with a reason.

**Dependencies:** REQ-005.5, REQ-006, REQ-007, REQ-016, REQ-026.

---

#### REQ-029: Observability & Operational Monitoring

**Description (P0).** Correctness depends on several silent money-touching scheduled loops; crash / error-rate monitoring misses silent failures (a job that didn't fire, ledger drift, a key left active after fuel-zero). This REQ adds heartbeats + business-invariant monitors that page.

**Acceptance Criteria:**
- [ ] **Job heartbeats:** every scheduled job records a heartbeat; an overdue-run pager fires if a job misses its expected interval.
- [ ] **Business-invariant monitors that PAGE (not just log):** ledger totals fail to reconcile; any project or general balance below zero; consumption against a non-positive balance; gateway error rate / added latency / provider errors outside budget; failed-work-queue depth above zero; a released or suspended project whose access-teardown is incomplete after 6 hours; reserve / coverage below floor; repository base-permission drift (REQ-008).
- [ ] **Money-path dashboards** (funding, consumption, skim, reconciliation, chargeback) for admin.
- [ ] Errors + structured logs flow to the existing monitoring stack (NFR); this REQ adds the business layer.

**Dependencies:** REQ-006, REQ-009, REQ-024, all scheduled jobs.

---

#### REQ-030: Operations, Incident Response & Admin Correction Tooling

**Description (P0).** Auto-acting kill switches, auto-suspend, and ops queues route to one admin with no on-call model, no restore runbook, no false-positive reversal, no money-correction tooling. This REQ names the operating model.

**Acceptance Criteria:**
- [ ] **On-call + escalation model** named (even "the founder, with a documented escalation tree" at pilot scale); an incident ops-task type is the incident-commander entry.
- [ ] **Per-incident runbooks** authored: data-loss restore (meeting the NFR recovery-time objective); credential / org compromise (REQ-008); mass access-key revocation; task-tracker outage; chargeback spike; build-platform outage.
- [ ] **Task-tracker outage degraded mode:** the project / task panel serves the last known task state and reconciles once the tracker returns.
- [ ] **Manual override for every auto-action** — a false-positive auto-deactivation, AUP suspension, or key revocation is reversible by an admin (audited).
- [ ] **Admin money-correction tooling** — post a reconciliation adjustment / manual credit with an audit reason via UI (never direct ledger writes).
- [ ] **Account suspension is a represented lifecycle state** with a documented recovery playbook (REQ-007 saga + per-project re-enable).

**Dependencies:** REQ-006, REQ-007, REQ-009, REQ-026, REQ-029, NFR Reliability.

---

#### REQ-031: Content Moderation, Takedown & Secret Scanning

> **v1 scope (right-sized):** v1 keeps only GitHub secret-scanning + push-protection org-wide (free) + the founder's emergency repo-privatize path. Deferred to v1.5 (before organic / EU signup): Report buttons, content-abuse review queue, takedown saga, DMCA / CSAM policy doc. The ~15 hand-curated pilot projects don't need the automated takedown surface yet; secret-scanning (the one real exposure on public brand-named repos) ships in v1.

**Description (P1).** Public brand-named MIT repos + Discovery + comment threads are an unmonitored user-content surface reviewed only once at publish; AUP suspension acts on an account but never privatizes a public repo.

**Acceptance Criteria:**
- [ ] **Universal "Report" affordance** on repos / Discovery output / comment messages.
- [ ] **Rapid repo-takedown state** any admin can trigger: repo private + "under review" immediately (decoupled from key-rotation / suspension); reversible after review.
- [ ] **GitHub secret-scanning + push-protection org-wide** (free) on the single v1 org (public + private repos; extends to a second org if the v1.5 split ships, REQ-008).
- [ ] **DMCA agent registered**; documented **CSAM → NCMEC** escalation path.
- [ ] AUP suspension (REQ-007) can optionally flip the project's repos to private as part of the saga.

**Dependencies:** REQ-008, REQ-015, REQ-023, REQ-004, REQ-026.

---

#### REQ-032: Project Need Attachments (NGO reference files for Discovery + build)

**Description.** The NGO uploads reference files describing their need — process spreadsheet, screenshot, blank / sample form, mockup, requirements PDF, sample data structure. Files are read by the Discovery Agent multimodally to inform scoping and are available to the volunteer at build time.

**PII / Tier-2 — governance-by-disclosure + hard-warn:** the upload UI shows a standing data-responsibility disclosure (*"Upload redacted / sample data, screenshots, mockups, blank forms — NOT real beneficiary records. ai4good and your volunteer will see these files."*); Tier-2 projects (REQ-004) get a hard checkbox gate restating fixtures-only. ai4good does NOT scan uploads — the NGO owns the risk per the acknowledgment (REQ-004 / 023); enforced by disclosure, not code (pre-scan is a v1.5 option).

**Acceptance Criteria:**
- [ ] Upload at intake (REQ-003, optional), during Discovery (REQ-004), and from the project page (REQ-010 / 026) anytime pre-handoff. Types: PDF, PNG/JPG, CSV/TSV, TXT, DOCX/XLSX. Size caps (~25 MB/file, ~200 MB/project, tunable). No virus / secret scan in v1.
- [ ] Files stored privately (not in the app database); access restricted to the project's NGO members, assigned volunteer, and platform admins, honoring project visibility.
- [ ] Upload UI shows the disclosure; Tier-2 gets the hard checkbox gate before any upload.
- [ ] Discovery ingests Discovery-visible files multimodally and may cite them in questions + the scope doc; reading a file consumes Discovery credits proportional to context weight (estimated cost shown before a large file), and $-fuel once funded.
- [ ] Project page **"Reference files"** section (name / type / uploader / description); downloadable by assigned volunteer + NGO admins + platform admin per visibility.
- [ ] Reference files reach the volunteer's working environment but are never committed to the repository (private / Tier-2 contents stay out of version history).
- [ ] Soft-delete; audit trail on upload + delete.

**Dependencies:** REQ-001, REQ-003, REQ-004, REQ-010, REQ-026, REQ-028.

---

#### REQ-033: Post-Discovery NGO Project Assistant (funded, fuel-metered)

**Description.** Once funded, the NGO can keep chatting with an AI assistant beyond Discovery to understand status — the same chat surface as the Discovery Agent (REQ-004), continued past `scoped` and reframed read-only: it answers "how's my project going?", explains blockers, summarizes progress, estimates fuel runway. Fuel-metered, no free credits — it exists only on funded projects. It never mutates the project: scope changes route through CRs (REQ-025), task state is owned by the tracker (REQ-026), handoff is gated by REQ-012.

**Acceptance Criteria:**
- [ ] **Availability:** on the project page once funded (positive fuel) and past pre-fuel Discovery — `in_progress` onward. None on an unfunded or pre-`scoped` project.
- [ ] **Read-only context:** answers from a snapshot — task counts / P0s / recent completions (REQ-026), open blockers (REQ-024), fuel balance + runway (REQ-009), recent commits / NGO comments. No write tools (cannot set task status, resolve blockers, accept CRs, approve handoff, or move money).
- [ ] **Same chat surface as Discovery,** reframed as a read-only status explainer for a non-technical NGO.
- [ ] **Fuel-metered:** each turn consumes project fuel, metered like funded Discovery; the free daily Discovery allowance is never drawn. Cost shown per turn; fuel gauge visible; at fuel-zero the composer disables with the "Top up fuel" CTA (REQ-006).
- [ ] **Scope discipline:** on a scope / priority request it explains the CR flow (REQ-025) and does not act — it may pre-fill a draft CR, but the NGO submits it.
- [ ] **v1 is on-demand text Q&A only.** Proactive / push digests, scheduled summaries, notification-driven agents are v1.5.

**Dependencies:** REQ-004, REQ-006, REQ-009, REQ-010, REQ-024, REQ-025, REQ-026.

---

#### REQ-034: Task-Level Attribution (telemetry, never gating)

**Classification (load-bearing):** transparency / product telemetry — NOT a security control. Spoofable by design; soft-degrading; never gates a request. Purpose: burn-per-deliverable on the NGO panel, per-task cost baselines for fuel estimation, reconciliation precision.

**Description.** Every gateway request (REQ-009) carries an optional task binding so consumption is attributed to the task being worked; consumption without a binding is unattributable forever — capture ships in v1, the analysis surfaces in v1.5. When a volunteer is assigned a task, that assignment is recorded so subsequent consumption is attributed to it; an unresolved binding floors to unattributed (never rejected). Attribution is per-request, staying correct under parallel working copies. Exploration and onboarding are first-class non-task buckets the steering offers — falsely-attributed burn is worse than unattributed (it corrupts baselines); steering is conversational, never gateway-enforced. The NGO panel shows burn per deliverable; per-volunteer-per-task stays coordinator-side (metering individual volunteers would erode trust). Bimodal per-task cost (hand- vs loop-driven) is a data property, not an anomaly. **Ceiling: detection and suggestion only, never gating.**

**Acceptance Criteria:**
- [ ] Consumption records carry a task attribution — task identifier, `exploration`, `onboarding`, or unattributed — written by the gateway (REQ-009); no rejection path.
- [ ] v1 capture: task assignment is captured and rides subsequent requests; unresolved → unattributed.
- [ ] NGO project page shows **burn per deliverable** (v1): fuel per task, money-honesty style (REQ-010; cents, no celebration).
- [ ] **v1.5 (deferred):** coordinator reconciliation panel (unattributed %, broken / stale binding signals); per-task cost baselines feeding Discovery estimates.

**Dependencies:** REQ-009, REQ-026, REQ-010, REQ-006.

---

#### REQ-035: Post-Handoff Attribution & Jumpstart Health

**Description.** Closes the freedom-without-guarantee model economically: no gates anywhere — quality becomes visible ex post, reputation is the incentive. Two captures ship in v1 (uncaptured data is lost forever); synthesis / matching surfaces land in v1.5.

**1. NGO attribution at handoff (v1).** At sign-off (REQ-012), the NGO completes an attribution step: free-text testimonial + three structured dimensions (communication, delivered scope, onboarding into self-service). Framed as credit, not grading — feeds the volunteer's portfolio, deliberately NOT a single star score (single-rater scores inflate and measure the relationship, not the artifact). *(Supersedes the earlier "no satisfaction form in v1" deferral — reframed as attribution, so no conflict with REQ-014's deferred internal satisfaction signal; no public star ratings, ever.)*

**2. Jumpstart health at 30/60/90 days (v1).** Extends the 30-day-alive ping (REQ-012) to three marks from real signals only: NGO self-service changes in Lovable, feature requests opened / completed, rescue requests. Rendered actively self-served / stalled. Confound control: at 60-day inactivity the platform asks one question — *"did you try to make changes?"* — and only tried-and-failed counts against health.

**3–4. v1.5 (signal only, never a gate).** Attribution + health become visible during matching (weak-signal volunteers still apply; the NGO sees the record); optional AI-maintainability check at handoff (a fresh agent runs realistic change requests; result shown, nothing blocked).

**Acceptance Criteria:**
- [ ] Sign-off (REQ-012) includes the attribution step: testimonial (optional) + 3 dimensions (required, 4-point descriptive scale, credit-framed). Volunteer sees it on their profile (private v1; matching surface v1.5). Skipping the testimonial allowed; no capture blocks handoff.
- [ ] Health checks at 30/60/90 days: alive ping + self-service-change count (Lovable, where readable) + feature-request / rescue counts; state actively-self-served / stalled; never notify the volunteer punitively.
- [ ] 60-day one-question NGO email, one-click answer; only tried-and-failed marks health negatively.
- [ ] **v1.5 (deferred):** reputation in matching; health synthesis dashboard; AI-maintainability visible check.

**Dependencies:** REQ-012, REQ-021, REQ-016, REQ-014.

---

### P0 (promoted from P1): Required dependencies of REQ-024 / REQ-025 / REQ-026

> **Promotion note:** REQ-013, REQ-014, REQ-015, REQ-016 were drafted P1 but are required dependencies of P0 features (blockers, CRs, PM tasks) — reclassified **P0** for v1. REQ-015 ships a minimal version (one project comment thread; system events surface in notifications); full Slack-style enhancements (threaded replies, presence, search, attachments) move to **v1.5**. Per-user notification preferences (REQ-016) are also v1.5; v1 ships sensible defaults. Dashboards (REQ-013, REQ-014) ship with the **"Action needed" rail + core project list + fuel + task progress only**; richer surfaces (activity feed, badge engine, testimonials, KYC upsell) are v1.5. REQ-017 (post-handoff feature-request surfacing) moves to **v2**.

#### REQ-013: NGO Dashboard (minimal v1 + v1.5 enhancements)

**Description.** One view per NGO showing all their projects, fuel balances, applicants, recent activity, and prominent cadence + progress signals to support stepwise-funding decisions.

**v1 (minimal — ships at public beta):**
- [ ] Project cards: status, % complete (PM tasks, REQ-026), dual fuel meters (REQ-010), assigned volunteer.
- [ ] Per active project: last commit timestamp, cadence health badge (Active / Quiet / Stalled), PM task progress (X of Y done), "Now working on: [task title]".
- [ ] Fuel summary across projects + general balance as "$X redeployable credit" (non-cash; no expiry, never removed — REQ-006).
- [ ] **"Action needed" rail** (REQ-024 blockers incl. fuel-topup / Lovable-credits / GitHub-collaborator / clarifying-question + pending CRs + triage decisions awaiting NGO response).
- [ ] Applicants queue per project (when `open`).

**v1.5 (deferred):** recent activity feed (30 days); KYC upsell banner for `verified` NGOs; "Lovable-enabled projects" rail (REQ-021); opt-in NGO testimonials authoring page.

**Dependencies:** REQ-005, REQ-006, REQ-007.

---

#### REQ-014: Volunteer Dashboard + Completion Credit (v1 minimal)

**Description (v1).** Volunteer dashboard with current assignments, fuel gauges, and a completion-credit-only public reputation model — no public star rating. NGO satisfaction signal collection is deferred to v1.5 (with the tip flow): no satisfaction table, modal, or admin aggregate in v1.

**Public on the volunteer profile (v1):** completion count including private projects (e.g. "5 tools shipped (2 private)"; private projects disclose no title / NGO / details — only the count increments); one badge, "Shipped first tool" (auto-awarded on first handoff, any visibility); for public projects, title + NGO name + cause tags in the project list. Not shown: star / numerical ratings, testimonials, cause-area badges, multi-badge engine — all v1.5.

**Acceptance Criteria (v1):**
- [ ] Dashboard shows current projects: status, dual fuel gauges (REQ-010), in-progress PM tasks (REQ-026), unresolved blockers / clarifications.
- [ ] Public completion count + the "Shipped first tool" badge on the profile.
- [ ] Internal NGO Satisfaction collection deferred to v1.5 (no modal, no admin aggregate); the volunteer never sees their own satisfaction scores (avoid anxiety / gaming).
- [ ] Self-audit usage view (REQ-009).

**v1.5 (deferred):** multi-badge engine ("Shipped 5/10", "Active contributor", "Cause specialist"); handed-off history view; opt-in NGO testimonials; cause-area specialization tags.

**Dependencies:** REQ-007, REQ-012.

---

#### REQ-015: Per-Project Comment Thread (lightweight; full Slack-style channel deferred to v1.5)

> **Scope note:** the channel data-model + real-time transport are dropped from v1; REQ-015 ships a lightweight project comment thread. The actionable-message primitive survives, re-homed onto the CR row + notifications (not a chat UI). System events go to the notifications feed, not channel messages.

**Description.** Each project has a lightweight comment thread on its project page for the NGO admin(s), the assigned volunteer, and (when invited) platform admin — replacing the v1 Slack-style real-time channel. A concierge pilot of ~10–15 hand-matched projects (founder in every loop) does not need a real-time chat subsystem; structured blockers (REQ-024) + the comment stream + the notifications feed + email carry the load. This drops the real-time transport, markdown renderer, @-mention parser, and archival mode while keeping a shared free-text back-and-forth. Reinstate the full channel before organic / EU signup (v1.5).

**Acceptance Criteria (v1):**
- [ ] **Project comment thread** on the project page (REQ-010): chronological free-text stream for the NGO admins + assigned volunteer (+ platform admin when escalated). Membership is implicit (those parties); no member roster.
- [ ] Plain text + auto-linkified URLs (no markdown, code blocks, image attachments, or @-mentions in v1). Read on page load (no real-time); posting refreshes the stream and notifies the other party (in-app; email per REQ-016).
- [ ] **System events are NOT posted to the thread** — funding, repo / Lovable setup, fuel-low, handoff, blocker raised / resolved, CR raised / decided surface in the notifications feed (REQ-016) + the REQ-010 activity feed.
- [ ] **CR Accept/Decline** uses the actionable-message primitive on the CR row + the notification, not a chat message (REQ-025).
- [ ] After `handed_off`, the thread is read-only. No cross-project DMs.

**v1.5 (deferred — full Slack-style channel):** real-time channel (flat → threaded); @-mentions + notifications; presence / typing; markdown + code blocks + image attachments; full-text search. **v2+:** integration with a real Slack workspace (webhook bridge); video / audio calls.

**Dependencies:** REQ-001, REQ-007, REQ-010, REQ-016, REQ-026.

---

#### REQ-016: Notifications (Email + In-App)

**Description.** Event-driven notifications with sensible defaults in v1 (per-user preference UI is v1.5). One shared notify path is the sole writer; blockers / CRs / lifecycle events route through it. In-app in real time; email via the transactional provider (SMTP fallback). Same-event messages to a recipient are coalesced within a 60-second window and de-duplicated within 5 minutes.

**v1 events (defaults documented; no per-user preference UI yet):**

| Event | Recipient(s) | Delivery |
|---|---|---|
| Triage decision (approval makes the project visible on the marketplace) | NGO admins | email + in-app |
| Application received | NGO admins | in-app (daily digest if > 1) |
| Application accepted / declined | applicant volunteer | email + in-app |
| Project aging unmatched (`open` N days, no accepted match) | platform admin (concierge) + matching volunteers | email + in-app |
| Inactivity reminder (14d) | volunteer + NGO admins | email + in-app |
| Project released (auto 21d or manual) | NGO admins + ex-volunteer | email + in-app |
| Rematch available | NGO admins | in-app |
| Matched-pending-fuel reminder (24h before deadline) | NGO admins | email |
| Funding-deadline expired | NGO admins + matched volunteer | email + in-app |
| Payment succeeded / failed | NGO admins (+ volunteer on success) | email + in-app |
| Project access key issued (kickoff) / revoked | volunteer | email + in-app |
| Task status reverted (instructive, low-tone) | volunteer | in-app |
| Fuel low 20% | NGO admins | email + in-app |
| Fuel low 5% | NGO admins + volunteer | email (NGO) + in-app (both) |
| Fuel depleted | NGO admins + volunteer + platform admin | email + in-app |
| Task comment (NGO comments on a task) | volunteer | in-app |
| PM task status changed | NGO admins | in-app (digest cadence) |
| Task completed (`done`) | NGO admins | email + in-app |
| Blocker raised / resolved / aging-48h / aging-7d | NGO admins (+ platform admin on 7d; volunteer on resolved) | email + in-app |
| Handoff requested / accepted / rejected | NGO + volunteer (rejected adds platform admin) | email + in-app |
| Verification outcome | NGO admins | email + in-app |
| Provisioning failure (repo setup failed / task pool empty at kickoff) | NGO admins + volunteer + platform admin | email + in-app + ops task |
| Lovable setup reminder / credits-low / credits-blocked / setup-pending (kickoff) / setup-complete | NGO admins (+ volunteer on complete) | email + in-app |
| GitHub-collaborator needed raised / resolved | NGO admins (raised) / volunteer (resolved) | email + in-app |
| Project comment (REQ-015 thread) | the other party (NGO admins ↔ volunteer) | in-app (email per default) |
| CR raised | volunteer | in-app + CR inbox; no email (anti-distraction) |
| CR decided | NGO admins | email + in-app |
| Fuel-credit released / donation confirmed | NGO admins | in-app (+ email on donation receipt) |
| Jumpstart health question (60-day one-click; REQ-035) | NGO admins | email |
| Chargeback opened | NGO admins + platform admin | email + in-app + ops task |

**Default delivery rules (v1):** email = critical events (money, deadlines, blockers, handoff, decisions); in-app-only = low-tone events (comments, task-status changes). **Escalation tier (NGO + platform admin):** Lovable credits-blocked, provisioning failure, blocker 7d escalation.

**Deferred (v1.5):** channel @-mentions / posts; spend-anomaly events (no anomaly engine in v1); auto-top-up events; tip-received (REQ-022); per-user preference UI + custom batching.

**Dependencies:** REQ-001.

---

### Out of v1 / Deferred to v2 — referenced by ID only

#### REQ-017: Post-Handoff Feature Request Surfacing (v2)

**Description (v2, not built in v1).** After handoff, new GitHub issues labeled `feature-request` or `bug` would surface on the project's ai4good page so other volunteers can pick them up. Deferred to v2 — no issues-webhook subscription, no UI surfacing in v1; detailed AC deferred until v2 design begins (depends on pilot data). **Dependencies (when built):** REQ-008, REQ-012.

---

### Nice to Have (P2) — Future Enhancement

#### REQ-018: Discovery Agent — Voice Input
NGOs describe the need via a voice recording the agent transcribes + processes.

#### REQ-019: Multi-Volunteer Per Project
Teams of 2-3 volunteers per project with role splits (frontend / backend / QA).

#### REQ-020: Public Impact Page
Public-facing page per NGO showing all tools ai4good has built for them, with usage / impact stats (where instrumented).

---


## Non-Functional Requirements

### Performance
- **Response time (p95):** marketplace page < 500ms (re-validate before launch); Discovery Agent first-token < 1.5s.
- **Webhook handling (end-to-end):** Stripe < 2s; GitHub (contribution cadence + commit-task linking) < 5s.
- **Year-1 capacity/budget:** up to 1000 concurrent marketplace viewers and 50 concurrent discovery conversations within ~$50/mo hosting; re-baseline this cost for the two-target deploy before the year-1 budget is finalized.

### Security
- **Authentication:** authenticated sessions with automatic refresh — users stay signed in without manual re-login; expired or invalid sessions require re-authentication.
- **Authorization:** per-tenant isolation on all multi-tenant data.
- **Secrets:** API keys never logged or exposed; the platform's real AI-provider key is never shared with volunteers, who instead receive individual credentials shown once at issuance and not retrievable afterward.
- **PII:** minimum necessary; NGO verification documents encrypted at rest with private access.
- **Webhook verification:** signatures verified on every Stripe and GitHub webhook.
- **Rate limiting:** on authentication, Discovery Agent, and Apply flows.
- **Compliance:** GDPR right-to-erasure (deletes profile, anonymizes ledger) plus DPA for EU NGOs; PCI out of scope (all card data handled by Stripe — card numbers never touched).
- **Audit logging:** immutable trail for fuel transactions, project status transitions, role changes, volunteer-credential issuance/revocation, and Linear ingest provenance.

### Scalability
- **Targets:** pilot 100 NGOs / 200 volunteers / 50 active projects → year-1 500 NGOs / 1000 volunteers / 200 active projects; frontend, backend, and managed database scale to meet them.

### Reliability
- **Uptime SLA:** 99.5% (~3.6 hours/month); **RTO** 4 hours; **RPO** 24 hours.
- **Error handling:** error tracking and structured logs; alerts on error-rate spike.
- **Background work & failure modes:** webhook fan-out, queued outbound-event delivery, scheduled scans, and streamed Agent responses each fall back to an alternate execution path when they exceed platform execution limits.

### Accessibility
- WCAG 2.1 AA; keyboard navigation across all flows; color contrast ≥ 4.5:1; automated checks in CI; manual screen-reader pass before launch.

### Compatibility
- **Browsers:** last 2 versions of Chrome, Firefox, Safari, Edge. **Devices:** responsive web (mobile, tablet, desktop); no native mobile apps in v1. **Locale:** English only at launch (i18n out of scope for v1).

---


## Technical Considerations

### System Architecture

The platform surfaces a public project marketplace, NGO and volunteer dashboards, and the Discovery chat, over a backend that stores all data under per-row access rules, authenticates users, holds verification documents, pushes live fuel updates, and runs background jobs that ingest third-party webhooks and run periodic jumpstart-health and aging scans.

A volunteer's two data paths are disjoint and meet only at the task-ID binding (REQ-034):
- **AI usage** — volunteer AI builds reach the model provider only through the ai4good LLM gateway (REQ-009, decision-21), which meters fuel per request and enforces governance; volunteers never hold the provider key.
- **Task coordination** — volunteers coordinate work in Linear (decision-20), which is mirrored into a read-only projection that feeds the NGO panel.

Platform-side AI — the Discovery Agent and the post-Discovery assistant (REQ-033) — runs on Opus (decision-13) and calls the provider directly with the platform key; the gateway governs only the volunteer path.

**Gateway request rules (REQ-009, decision-21):** each request is subject to per-request and rolling-24h spend caps; a request is refused when the project's fuel balance is not positive; large requests get a fingerprint check; each request is idempotent and bound to a task ID (REQ-034); request bodies are inspected transiently and never stored.

**Handoff:** the running deployment transfers with the repo to the NGO; the Linear coordination workspace is platform-owned and never transfers.

### Product Data Model & Lifecycle States

Product-level states and rules (observable behavior, not storage mechanics):

- **Project lifecycle:** draft → discovery_in_progress → scoped → triage → open → matched_pending_fuel → in_progress → handoff_pending → handed_off, plus cancelled. `paused` was removed from v1 (decision-17); the v1 workaround is unpublish-before-match or admin key-deactivation / cancel mid-build; pause/resume returns in v1.5.
- **Triage gate (REQ-023):** a platform-admin compliance review must approve a project before it reaches the marketplace.
- **Funding deadline:** a matched project not funded within 7 days reverts from matched_pending_fuel to open.
- **Applications:** pending, accepted, declined, withdrawn, expired, released. `expired` = NGO did not fund within 7 days of acceptance; `released` = volunteer left mid-project, where `ghosted` affects the volunteer's outreach signal and `released_for_cause` does not auto-penalize. A volunteer may hold at most one active (pending/accepted) application per project; terminal applications do not block re-applying if the project re-opens. The volunteer's GitHub link is required at apply time.
- **Change requests (REQ-025):** pending_review → accepted_active, declined, completed, or cancelled. Exactly one CR may be open per project until the volunteer decides the current one (decision-16). Accepting a CR creates PM tasks (not GitHub issues). All scope or intent changes go through a CR.
- **Tasks (REQ-026):** statuses not_started, in_progress, done, blocked; priorities p0/p1/p2 (default p0); sources discovery, change_request, manual; tasks form a parent/child hierarchy. Handoff (REQ-012) is gated on every P0 task being done.
- **NGO task permissions:** NGO admins may append comments only; they cannot change a task's status, title, description, or priority.
- **Linear status integrity (decision-20):** a status change not made by Linear's GitHub integration or by a linked merged PR is reverted, with an explanatory comment and a linear_status_reverted notification. Volunteers move task status only by merging a PR.
- **GitHub contract:** commit pushes feed build-cadence stats and record which commits referenced which task; PRs (opened/merged) are cadence data only — there is no NGO-visible PR list in v1. GitHub Issues stay dev-internal in v1 (REQ-008); post-handoff issue surfacing (REQ-017) is deferred to v2.
- **Blockers (REQ-024):** types clarifying_question, awaiting_ngo_review, external_dependency, fuel_topup_needed, lovable_credits, github_collaborator_needed, lovable_setup_pending; severities info/warning/blocking. At most one unresolved blocker of a given singleton type per project; lovable_setup_pending auto-resolves once the pasted setup is validated; spend_anomaly_review is reserved and deferred to v1.5 (decision-14).
- **Data sensitivity tiers:** tier0_no_pii, tier1_ordinary_pii, tier2_special_category (set from Discovery output). **Maintenance tracks:** A_ngo_maintains (the only value v1 sets) and B_developer_grade (reserved for post-v1, decision-19).
- **Repo visibility:** public MIT by default; private is opt-in and requires a justification reviewed at triage (REQ-023).
- **Verification documents (REQ-002):** v1 accepts registration_doc and reference_link only; tax_exempt_doc and kyc_doc are deferred to v1.5.
- **Deployment URL:** a live running-app URL is a precondition for handoff (REQ-012) and the target of post-handoff alive checks.
- **Handoff attribution & jumpstart health (REQ-035, decision-22):** captured in v1, never shown as a public star score; health is checked at 30/60/90 days; a 60-day one-question "tried and failed" answer is the only self-service signal counted against health; each project resolves to a derived health state (actively self-served, stalled, or unknown).

### Cross-Cutting Rules

- **Discovery credits (decision-11):** a context-weighted, free pre-fuel allowance dripped daily with no rollover; verified NGOs receive a larger daily grant than unverified ones; cached input is weighted below fresh input.
- **Discovery / assistant conversations (REQ-004, REQ-033, decision-12):** one resumable conversation store serves both, distinguished by conversation mode (Discovery vs assistant); each turn's token/fuel cost is auditable. Both run on Opus (decision-13).
- **Communications scope (decision-15):** the full realtime channel is dropped from v1; v1 ships a project comment thread and routes system events to the notifications feed; the channel returns in v1.5.
- **Attachment governance (REQ-032):** NGO project-need files are accessible only to NGO members, the assigned volunteer, and platform admins; private-project files are restricted to members; a Discovery-visibility flag controls whether a file is included in Discovery context; deletion is soft; there is no upload scan in v1.
- **Chargeback handling (REQ-006):** on a funder chargeback the platform freezes the NGO, deactivates its project build key, reverses the top-up, books the already-consumed compute as a write-off, and opens a chargeback-review ops task.
- **Volunteer profile (REQ-007):** GitHub-org membership is added when the volunteer links GitHub and removed on deactivation, suspension, or 24-month inactivity; a first-apply disclaimer is accepted once and re-prompted only when its text version changes; a Lovable invitation email is required so the NGO can invite the volunteer to the workspace.
- **Consent audit (REQ-006):** each disclaimer acceptance records the actor's IP, user agent, the disclaimer text version, and the exact hash of the accepted text.

### Technology Stack

Decision-pinned choices per role (implementation libraries omitted):
- **Frontend:** owned and two-way-synced by Lovable (decision-18/19).
- **Backend:** a managed backend providing data with per-row access rules, authentication, file storage, live updates, and scheduled background jobs.
- **AI:** Opus platform-side for Discovery and the assistant (decision-13); volunteer builds routed through the ai4good LLM gateway (decision-21).
- **Task coordination:** Linear — one platform-owned workspace per project, status driven by its GitHub integration, mirrored to a read-only NGO projection (decision-20).
- **Version control:** a platform-owned GitHub App provisions each project repo and ingests commit/PR activity; GitHub Issues are dev-internal in v1 (REQ-008); repo-transfer scope is granted only at handoff.
- **Payments:** card-based fuel top-ups, with funder chargebacks handled per REQ-006.
- **Lovable Track-A (REQ-021, decision-19):** v1 is always Track A — the NGO owns the Lovable workspace and completes Lovable setup (including the required Lovable project ID); the volunteer skip opt-out is removed in v1.

### External Dependencies

Hard dependencies are the backend, the payments provider, the model provider (via the gateway), Linear, and GitHub: an outage of any one degrades or blocks the corresponding surface — a Linear outage leaves the NGO panel stale while volunteers keep working, a payments outage blocks top-ups, and a provider or gateway outage blocks Discovery and builds. Transactional email is a soft dependency.

### Migration Strategy

Greenfield — no data migration. Financial reporting is preserved across pricing- and skim-policy changes so historical records stay accurate.

### Testing Strategy

Before launch, the NGO and volunteer end-to-end journeys are verified, and access-control rules and dependencies are reviewed.

---


## Implementation Roadmap

**Headline estimate:** ≈ 420h core / 530h buffered engineering for v1 — roughly **14-17 weeks for two engineers**, and realistically **~5 months to public beta** for a two-engineer team (~7-8 months for one engineer). Add 4-6 weeks of pilot operations (three internal full-cycle projects) before opening public beta. v1 stays shippable in this range because the §11 scope cuts hold (auto-top-up, tips, full CR UI, match scoring, KYC automation, self-serve GDPR, multi-jurisdiction tax, and the other v1.5 deferrals are out of v1).

The per-task decomposition and hour estimates are not maintained here — the authoritative build breakdown lives in Linear (decision-20). The phases below are a planning overview: Phase 1 + 2 = MVP launch; Phase 3 = dashboards, comms & platform operations; Phase 4 = pre-launch hardening; Phase 5 = public beta + concierge launch.

### Phase 1: Foundation (Weeks 1-3)

Auth, NGO org, volunteer profiles, and app scaffolding — nothing public yet.

**Checkpoint 1:** A test NGO and a test volunteer can sign up, complete their profiles, and a platform admin can mark the NGO verified.

### Phase 2: Core MVP (Weeks 4-7)

The end-to-end first project across the full lifecycle (draft → discovery → scoped → triage → open → matched → in progress → handoff → handed off), with fund-on-match, the LLM gateway plus inline fuel metering, the Claude Code orchestration Skill, decomposition to Linear, deploy-to-running, and the handoff ritual.

**Checkpoint 2:** One real NGO and one volunteer complete a project through to a deployed, reachable live URL (deploy is a handoff precondition, not optional), with the handoff ritual executed (RLS on, revert demo, two-way GitHub, spend cap set).

### Phase 3: Dashboards, Comms & Platform Operations (Weeks 8-10) — v1 minimal only

The v1-minimal dashboards and comms surfaces that REQ-024 / REQ-025 / REQ-026 depend on, plus the operability layer the pivot requires: observability (REQ-029), ops & incident response (REQ-030), content moderation (REQ-031), and the abandonment/rematch saga (REQ-027). v1.5 enhancements are out of Phase 3.

**Checkpoint 3:** Three pilot NGOs and five pilot volunteers can run an entire engagement inside the platform with no out-of-band Slack/email, and the ops console can correct a money error via paired ledger rows.

### Phase 4: Hardening & Beta Launch (Weeks 11-13)

Reliability, hardening, and accessibility work to reach public-beta readiness — test coverage, end-to-end journeys, accessibility audit, RLS/pen-test review, tax + GDPR, rate limiting, and the public landing page.

**Checkpoint 4:** Pen-test shows no critical findings; accessibility checks pass; latency targets are met under load.

### Phase 5: Public Beta & Concierge Launch (Weeks 14-16)

Open the door concierge-first (Goal 5): concierge supply-funnel tooling, aging-project nudges, and a hand-match tool to curate the first projects, plus v1.5 backlog prioritization and the v1.5 PRD revision. Multi-volunteer and Claude Code proxy remain v1.5/v2 (spec docs only).

**Checkpoint 5:** 10+ projects in flight, at least one successful handoff in public beta, and at least one handed-off project still reachable at its live URL 30 days post-handoff (REQ-012 30-day-alive check / Goal 1).


## Out of Scope

1. **ai4good gateway — now SHIPPED IN v1 (decision-21; REQ-009), no longer out of scope.** In v1 the gateway meters and caps each volunteer's Anthropic usage against the project's funded fuel in real time, records per-request audit metadata (request bodies are never persisted), and revokes/rotates a compromised token instantly. Tighter request validation and anomaly checks are v1.5 hardening. Honest limits (unchanged): it cannot verify a request truly concerns the assigned project, cannot lock usage to one machine, and cannot stop a determined attacker who steals a token — caps + instant rotation only bound the damage. The real Anthropic org key is never exposed to volunteers. Gateway hosting is an open decision (OD-6).
2. **Crypto / on-chain tokens** — Fuel is Stripe-backed fiat credits only; no tradeable token, no on-chain ledger.
3. **Native mobile apps** — Web-responsive only; iOS/Android apps are not on the roadmap.
4. **i18n / multi-language UI** — English only at launch.
5. **Multi-volunteer teams per project** — One volunteer per project in v1; team support is v2.
6. **Embedded IDE / web-based code editor** — Volunteers use their own Claude Code / Lovable; we don't host an editor.
7. **NGO-to-NGO tool sharing marketplace** — Repos are public, but we don't curate a "fork this for your NGO" experience.
8. **Anonymous / unverified NGOs publishing** — All publishing NGOs must be verified.
9. **Automated NGO verification** — Manual review by platform admin in v1.
10. **Hosted production environment for built tools** — The volunteer/NGO decide where to deploy; we don't run their infra.
11. **Public star ratings for volunteers** — Excluded; volunteer reputation is completion-credit + badges only. NGO satisfaction is captured privately (v2 matching weight), never displayed, to protect volunteers from retaliation.
12. **Platform skim on tips** — Tips at handoff (REQ-022) flow directly NGO→volunteer via Stripe Connect at 0% platform skim.
13. **Pay-gated Discovery in v1** — Discovery is free up to a per-NGO daily allowance (10/day unverified, 30/day verified — decision-8/11), resetting daily with no rollover. When an unfunded project exhausts the day's credits, the NGO can verify, fund the project's fuel to continue, or wait for the next refill; a funded project draws Discovery from its fuel from the outset.
13a. **Paid "Discovery wallet" — out for v1 and v1.5 (decision-8).** No separate Discovery-credit product or wallet; past the free pool, NGOs fund the regular fuel ledger, keeping the money model single-pot.
14. **ai4good-funded Lovable infrastructure** — ai4good does not subscribe to or bill Lovable; the NGO owns and pays for its Lovable workspace. The ai4good Skill does meter + cap Lovable usage per task and surface the NGO's credit balance during Track-A orchestration (REQ-021/028); Lovable is the Track-A primary deliverable vehicle.
15. **Multi-tool fuel metering** — Fuel covers Anthropic (Claude Code) only; other tools are out-of-band, NGO-direct, or volunteer-personal unless they ship metering-compatible APIs.
16. **Lovable credit reselling through ai4good** — In v1, NGOs buy Lovable credits directly; ai4good provides a deep-linked "Top up" CTA only. Reselling would need a reseller agreement plus tax pass-through and refund handling. v2 trigger: signed Lovable partnership.
17. **Service-level agreements / completion guarantees** — ai4good offers no SLA and does not guarantee handoff; volunteers may ghost, tools may consume fuel without a working deliverable, scopes may be infeasible. The platform bounds financial risk (per-project fuel caps) and surfaces stalls but does not underwrite outcomes.
18. **Closed-source / proprietary builds** — All projects are open-source under MIT (or a compatible permissive license) by default; NGOs requiring closed-source are not served.
19. **Fuel-spend insurance / refund-on-no-deliverable** — Consumed fuel is not refundable even if the project does not ship (we cannot un-spend tokens); NGOs are warned at every top-up.
20. **Fully-automated Anthropic key provisioning** — MOOT (decision-21): no per-project Anthropic keys; virtual keys mint automatically at kickoff.
21. **Per-request prompt/response CONTENT capture — permanently out (privacy).** The gateway captures per-request metadata only; request bodies are inspected transiently and never persisted.
22. **Anthropic-side "agent budget" enforcement** — MOOT (decision-21): the workspace-spend-cap story dies with per-project workspaces; enforcement is ours at the gateway.
23. **OpenTelemetry prompt-content export from Claude Code** — ai4good does not request or process prompt-content telemetry from volunteers (privacy); volunteers may use OTel independently, and ai4good does not aggregate it.
24. **Decision-10 v1.5 deferrals** — deferred out of the concierge v1 surface, all gated behind one public-beta line: before organic/EU signup (the REQ-029 launch checklist enforces it). Deferred: full rate-limiting (v1 ships a throttle); gradual-rollout tooling (v1 launches invite-only with a waitlist page); the full internal analytics dashboard (v1 uses minimal read-only reporting); the concierge supply CRM + hand-match tool (first cohort matched by hand); the content-takedown UI incl. DMCA/CSAM handling (REQ-031); multi-jurisdiction tax registration (v1 keeps automatic tax + a tax-ID field); the self-serve GDPR erasure/export UI (v1 handles erasure manually — no EU/public signup until it lands); and performance caching + CI performance gates. The multi-org Anthropic router is not deferred but retired outright (decision-21 — no per-project workspaces).
25. **Automated PII / secret pre-scan on uploaded reference files (REQ-032)** — v1 uses governance-by-disclosure (the NGO acknowledges the data-responsibility rule; no scanning). A scan that quarantines likely-sensitive uploads before Discovery or the volunteer see them is a v1.5 option. v1.5 trigger: an observed real Tier-2 data incident, or EU/public signup.
26. **Automated spend-anomaly detection engine (REQ-009)** — the nightly scorer, tiered auto-deactivation, and the anomaly-review/escalation/resolution flow are deferred to v1.5 (decision-14). v1 bounds loss deterministically instead — no cash-out, a first-fund cap, and the real-time fuel gate — plus the NGO's instant revoke action and daily human review. Rationale: at the pilot's ~10–15 hand-vetted projects the scorer mainly cuts detection latency (not binding) and would risk false-positives against legitimate $50 kickoff projects. v1.5 trigger: organic/EU signup.

---


## MVP Scope & Post-MVP Roadmap

Authoritative scope/roadmap reference. **Out of Scope** = what won't be built; this section = **when** features ship.

### v1 MVP (public beta launch)

A 2026-06-03 10-persona review produced 7 founder decisions, followed by decisions 8-22. Net product deltas:

- **Deliverable is a deployed, NGO-self-maintainable tool** (not a repo). **Track A** (NGO maintains via chat on the sanctioned builder platform — Lovable in v1) is the only track v1 builds; **Track B** (developer-grade + plain-host deploy) is deferred to post-v1. Discovery classifies the track; non-Track-A needs are waitlisted.
- **Governance-by-disclosure:** Discovery assigns data-sensitivity tiers; Tier-2 = fixtures-only-during-build, enforced at triage.
- **No cash-out:** fuel is non-cash, project-scoped credit; stays-on-project; donate or keep (move-between-projects → v1.5). Removes Treasury/ACH/refund/KYC/AML.
- **Nonprofit** entity + blended economics; **real ToS** (no "no contract").
- **Concierge-first launch** — supply liquidity is the #1 gate.
- **New v1 REQs:** REQ-027 (abandonment/rematch), REQ-029 (observability), REQ-030 (ops/incident + admin money-correction), REQ-031 (content moderation/takedown/secret-scanning).

**Decisions 8-22.** Decisions 20-22 (2026-07-05) re-architect coordination (20) and token governance (21-22). Where a later decision conflicts with an earlier one — notably **20 reversing 9** — the later decision governs; the earlier text is kept only as decision trail.

- **8 — Unified fuel + free-pool Discovery:** NGOs and volunteers both consume project fuel; funding is allowed from `draft` onward. Discovery is free up to a per-NGO daily credit allowance; email verification is the floor to chat, NGO-doc verification is the wall to publish. No paid "Discovery wallet" in v1 or v1.5.
- **9 — Git-as-truth PM tree:** conflicts with 20 and is **reversed by 20**; retained only for the trail.
- **10 — Task-tree reduction pass:** deferred genuinely-v1.5 work without cutting any preserved REQ capability.
- **11 — Two-layer money:** funded fuel is real-dollar-pegged; the free pre-fuel Discovery phase is an abstract per-NGO credit system. Daily drip (10/day unverified, 30/day verified), no rollover. A funded project routes its Discovery to project fuel, not the free pool. Discovery chat shows a credit gauge, per-turn cost, and per-file cost before ingesting.
- **12 — Post-Discovery NGO assistant (REQ-033):** a funded project unlocks an ongoing, fuel-metered, read-only NGO↔AI assistant ("how's my project going?"). Funded projects only; no free credits.
- **13 — Opus** for Discovery + the post-Discovery assistant (highest-leverage reasoning step).
- **14 — Defer the REQ-009 spend-anomaly engine to v1.5;** the loss ceiling (no cash-out, spend caps, deactivation at fuel-zero, manual rotate) is preserved without it.
- **15 — REQ-015 → lightweight project comment thread;** full channel deferred to v1.5.
- **16 — CR anti-distraction guardrails:** a Change Request is opt-in and never interrupts; one open CR at a time; Decline is penalty-free and the default-protected choice; NGO framing at submission.
- **17 — Remove the `paused` state from v1;** pause/resume → v1.5 (workaround: unpublish pre-match; admin deactivate + note, or cancel, mid-build).
- **19 — Defer Track B** to post-v1; v1 is Track-A only (non-Track-A needs waitlisted at Discovery).
- **20 — A platform coordination workspace replaces the git-as-truth tree (REVERSES 9),** for the product and the ai4good buildout: one coordination workspace per project; coordinator-owned decomposition (automation drafts, a human approves); pull-based self-assignment is the commitment signal; task status reflects real completed work, never an agent's say-so; agents may read and comment but cannot mark work done. NGO visibility is panel-only. Coordination infra is platform-owned and never transfers at handoff; delivery infra (builder, repo) is NGO-owned.
- **21 — Platform LLM gateway in v1 (rewrites REQ-009):** volunteers reach the model only through a platform-mediated path, scoped per (volunteer, project), that enforces spend caps and the fuel gate, injects governance, and meters usage so NGOs are charged only for real consumption. Volunteer prompt/request content is never persisted (privacy). Hosting is open (OD-6).
- **22 — Attribution + transparency in v1 (REQ-034 + REQ-035):** burn is attributed per deliverable, so the NGO sees cost per deliverable (telemetry, never gates); handoff testimonial + 3 credit-framed dimensions + 30/60/90-day jumpstart health from real signals.

**Launch strategy — concierge-first:** supply liquidity is the #1 launch gate. Do not open organic browse first. Pre-recruit a ~20-30-volunteer bench, hand-match the first ~10-15 curated NGO projects end-to-end to prove the loop produces deployed tools, then open organic browse. v1 hooks: the supply-funnel metric (Goal 5), the unmatched-project nudge (REQ-016), admin concierge-match tooling. Referral loop → v1.5.

**v1 REQ scope:**

*Foundation:* REQ-001 (Auth: email + GitHub + Google); **REQ-002 minimal** (NGO verification: manual admin review of doc upload; KYC + identity automation → v1.5); REQ-003 (Project Need intake); REQ-007 (Volunteer profile + marketplace); **REQ-011 minimal** (Volunteer applies, NGO accepts/declines; match-score algorithm + breakdown UI → v1.5; v1 shows skill/cause-tag overlap as a count hint).

*Discovery & Publishing:* REQ-004 (Discovery Agent — free, rate-limited; complexity tier, no dollar estimate); REQ-005 (Scope doc + publishing → triage); REQ-023 (Triage gate — all NGOs go through human triage in v1, 48h SLA; no KYC auto-approval).

*Funding & Money:* **REQ-006** (Stripe top-up + match-to-fund + non-cash credit model, no cash-out; leftover stays-on-project; chargeback handling + first-fund caps. No Treasury/ACH/refund-cashout/KYC/AML; auto-top-up → v1.5); **REQ-022 deferred** (tips → v1.5; no tips UI at handoff).

*Project Execution:* REQ-008 (deliverable code repositories; v1 keeps volunteer repo access at a continuously-enforced baseline that limits exposure from a misused credential; infra/delivery-repo isolation → v1.5); **REQ-009** (platform LLM gateway — decision-21; automated spend-anomaly detection → v1.5; hosting = OD-6); REQ-010 (Single-view project page + cadence stats + dual fuel meters); REQ-021 (Lovable = Track-A deliverable vehicle, orchestrated on the NGO's behalf with a per-task builder-credit cap + audit + manual fallback; email-to-builder input → v1.5; Track B → post-v1); REQ-024 (blockers + task-anchored clarifications); **REQ-025 minimal** (Change Requests as an actionable CR row + notification; Accept/Decline with note; on Accept, one p0 coordination item; full CR workflow UI → v1.5); **REQ-026** (Platform coordination workspace — decision-20); **REQ-028** (ai4good orchestration workflow — v1 core shell + the Track-A build-orchestration layer); **REQ-034** (Task-level attribution — burn-per-deliverable; telemetry, never gates); **REQ-035** (Post-handoff attribution + 30/60/90 jumpstart health).

*Comms & Dashboards:* **REQ-013 minimal** (NGO dashboard: project list + fuel + task progress + "Action needed" rail; richer surfaces → v1.5); **REQ-014 minimal** (Volunteer dashboard: current projects + fuel gauge + completion credit; no badge engine; NGO satisfaction signals → v1.5); **REQ-015** (project comment thread; system events to the notifications feed; full channel → v1.5); **REQ-016 minimal** (Event notifications with sensible defaults; per-user preference UI → v1.5).

*Handoff:* **REQ-012 minimal** (Automated checklist + sign-off; repo permission adjustment with optional transfer; revoke volunteer access + archive the coordination record; includes the REQ-035 attribution step. Tip flow → v1.5).

---

### v1.5 (3-6 months post-launch)

Triggered by pilot operational pain or a specific external event. Each item lists its trigger.

| Item | Trigger |
|---|---|
| Move-funds-between-projects | NGOs accumulate idle credit on finished projects and ask to redeploy it |
| Project pause/resume (the `paused` state) | First real NGO request to pause an active project |
| Replit as a 2nd sanctioned builder platform | A Track-A project needs a clean transfer Lovable can't do, or Lovable reliability falters |
| Volunteer referral loop | Concierge cohort proves the loop; organic supply needs compounding |
| Auto-top-up (off-session Stripe) | Pilot NGOs report fuel-low interrupts are friction; manual-pitch adoption > 30% |
| Tips via Stripe Connect | First handoff where the NGO asks to thank the volunteer with money |
| REQ-025 full CR workflow UI | Pilot NGOs find the minimal CR surface too thin |
| REQ-011 match-score algorithm + breakdown UI | "I don't know why this project showed up for me"; >20 active projects |
| Reputation surface in matching (supersedes the old satisfaction-signal row via decision-22) | Attribution + jumpstart health visible in matching |
| REQ-034 reconciliation surfaces | Coordinator wants the unattributed-% panel + per-task cost baselines |
| Gateway anomaly/abuse hardening | Real spend anomalies appear before organic signup opens |
| REQ-002 KYC + identity automation | Verification queue outgrows one admin's twice-daily batch |
| Channel enhancements (threads, presence, search, images) | Minimal channels feel lacking |
| Per-user notification preferences UI | First complaint about email frequency |
| Dashboard richer surfaces (activity feed, badges, testimonials, KYC upsell, builder rail) | Engagement metrics show demand for reputation surface |
| Builder-only project mode (no Anthropic-fuel kickoff) | Builder-only-suitable projects at meaningful volume |
| AI Change-Request Agent | NGOs find the raw CR flow too thin |
| REQ-023 triage attestation + spot-check | Triage queue median age > 24h OR weekly admin triage > 5h |

**Dropped/superseded (kept to prevent re-litigation):** the REQ-026 platform task-tooling server (dropped by decision-9, then the coordination workspace by decision-20 — neither v1 nor v1.5); the standalone AI-proxy + wrapper-script approach (shipped instead as the v1 gateway, decision-21); real-time key-status display and multi-Anthropic-org provisioning (moot under decision-21).

---

### v2 (6-12 months post-launch)

Bigger architectural or ecosystem-dependent changes.

| Item | Trigger / Dependency |
|---|---|
| REQ-017 Post-handoff feature-request surfacing (P1) | Pilot NGOs want to drive follow-up work; enough handed-off projects exist |
| REQ-018 Discovery voice input | NGO feedback that typing is friction |
| REQ-019 Multi-volunteer per project | Project complexity outgrows the single-volunteer model |
| REQ-020 Public Impact page per NGO | NGOs want a marketing surface; enough shipped tools to populate it |
| Automated NGO verification via Charity Navigator / GuideStar | Manual review queue outgrows one admin |
| KYC auto-approval for verified NGOs | Triage volume shows KYC NGOs reliably pass |
| Real-time builder-credit status | Lovable ships scoped OAuth or a billing webhook |
| Lovable credit reselling | Signed reseller agreement with Lovable |
| External Slack integration | NGOs want to mirror project channels into their Slack |
| Anonymous post-handoff contributors | Post-handoff issues attract drive-by fixes |

---

### Track-A delivery architecture (v1): the platform orchestrates the builder

This is v1 (REQ-021 + REQ-028), not a future direction. Track-A delivery is produced by orchestrating the sanctioned builder (Lovable) on the NGO's behalf through the ai4good orchestration workflow; task status lands only when work actually completes, never by an agent's claim.

Why:
- **Single source of intent** — one canonical record of the build keeps metering, scope, and audit authoritative because everything routes through one entry point.
- **Structural cost enforcement** — because the orchestration makes the build calls, it enforces the per-task builder-credit cap, logs each call, and surfaces the NGO's builder balance.
- **Billing reality** — each build call bills the NGO's builder workspace regardless of identity; this is why the budget cap is mandatory and enforceable.
- **Research-Preview risk** — a builder breaking change degrades to a manual fallback; a pilot USER-TEST validates orchestration on 1-2 real projects.

Deferred: second builder platform (v1.5); zero-touch orchestration polish (v2).

---

### Permanently out of scope (will not build)

Firm "no" — listed to prevent re-litigation:
- Crypto / on-chain / tradeable fuel — Stripe-backed fiat only
- Native mobile apps — web-responsive only
- Closed-source / proprietary builds — all projects MIT-licensed open source by default
- Service-level agreements / completion guarantees — contradicts Platform Promise §4
- Fuel-spend insurance / refund-on-no-deliverable — can't un-spend tokens; contradicts Promise §3
- Platform skim on volunteer tips — explicitly 0%
- Hosted production environment for NGO-built tools — handoff is to NGO ownership
- NGO-to-NGO tool-sharing marketplace — out of mission scope
- Multi-tool fuel metering at platform level — only Anthropic via fuel
- Telemetry collection of prompt content from volunteers — privacy posture

---

### Open issues to resolve before public launch

Tier-2 decisions/policies (not features) to settle before exposing the platform to real NGOs.

**Resolved:** fuel = prepaid, fully-consumable, non-cash-refundable service credit (removes stored-value/money-transmission/escheatment concerns); refund/chargeback mechanics dissolved by no-cash-out + a chargeback-after-consumption handler; abandonment/rematch is REQ-027; sensitive-data/open-source conflict resolved via private-opt-in at triage; deployment ownership (Track A → Lovable hosts, NGO self-maintains, ai4good never operates infra; deployment URL is a handoff precondition, 30-day-alive tracked); entity = nonprofit (donations tax-deductible).

**Still open:**
- **Admin staffing model at scale** — "<10 min/project/week" holds at pilot volume but not at the year-1 target (~200 projects); need an explicit staffing model or cut manual gates before scale.
- **Anthropic commercial readiness** — year-1 target ~$210k spend; need org-tier terms / prepaid-vs-invoice / custom rate limits as a launch gate.
- **Counsel deliverables** — plain-language ToS (no-warranty / no-SLA / limitation-of-liability), volunteer-classification opinion, fiscal-sponsor agreement, EU data-residency + sub-processor/DPA stance before EU onboarding.
- **Blended P&L + grant runway** — bottom-up year-1 P&L; lock grant/donor runway covering the net gap.


## Open Questions & Risks

### Open Questions

**Closed / superseded (decision trail):**
- **Q1/Q8 — Metering and revoking AI access per project:** resolved and moot (decision-21); no longer blocked by external-provider key-management limits. Cost attribution and access revocation are handled per project.
- **Q2 — Backend execution environment:** resolved. Long-running usage polls and event fan-out were checked against the platform's job time-limits and fit; a heavier host is reserved only as an escape hatch for any job that would exceed them. Low product impact.
- **Q5 — Volunteer compensation beyond AI-cost coverage:** resolved. v1 is reputation-only (completion credit + one "Shipped first tool" badge, REQ-014). Optional NGO→volunteer tips at handoff (REQ-022, via Stripe Connect) and a platform honorarium pool are deferred to v1.5 — direct volunteer payouts need recipient onboarding and tax reporting, not load-bearing for the core thesis.
- **Q6 — Pre-funded fuel for Discovery:** resolved. Discovery is free up to a per-NGO daily limit (higher once the NGO is verified — REQ-002/004); once a project is funded, its Discovery draws on the project's fuel (decision-11). The earlier fixed message-count and per-session spend caps are retired.
- **Q7 — Automated monitoring of NGO build-credit balances:** deferred. v1 reads a project's remaining build credits per session, with the NGO's consent, to enforce that project's budget cap; a standing monitor across all NGO accounts waits until the build vendor exposes a billing-only access path or low-credit notifications.

**Partially resolved:**
- **Q3 — NGO verification bar:** a trusted NGO must supply a registration document, a public reference link, and pass manual admin review; a higher trust level adds proof of tax-exempt status and an identity check. Open: which countries' tax-exempt proofs to accept at launch.

**Open (none block the PRD-dissection pass):**
- **Q4 — Skim rate:** default 15% (REQ-006). Options: flat 15%, tiered by NGO revenue, or flat with waivers for sub-$200 budgets. Due pre-public-launch.
- **OD-1 — Reviewer identity + merge authority** per project (coordinator / peer volunteer / agent-assisted with a human click) — a governance call; blocks the REQ-026 merge flow and the reviewer-agent role.
- **OD-2 — NGO Status-Panel scope + workspace onboarding** (what the panel shows and how the NGO is introduced to it) — blocks the REQ-010/013 panel.
- Remaining founder calls are numeric-config and infrastructure tuning for the fuel-governance and coordination surfaces; each blocks only its own build task.

### Risks & Mitigation

| Risk | Severity | Mitigation / contingency |
|---|---|---|
| Volunteers exceed project fuel | High | Low-balance alerting + hard cut-off at fuel = 0 + transparent ledger; NGO may top up; platform absorbs pilot overruns |
| NGOs sign up but never fund | Medium | Free Discovery funnel; $50 minimum at match-acceptance (REQ-006), not at publish; abandonment detection (REQ-027) |
| Malicious NGO posts a commercial need | High | Verification gate + admin project review during pilot; reject + ban under documented policy |
| Volunteers ghost mid-project | High | 14-day inactivity reminder → 21-day auto-release → project re-opened; NGO may request re-match |
| Stripe webhook failure leaves a paid top-up uncredited | High | Stripe retries plus a scheduled nightly reconciliation check catch any missed credit; admin reconciliation tool as backstop |
| Anthropic outage kills Discovery | High | "Service degraded" banner, queued intakes, manual-scope option; OpenAI as a Discovery fallback (post-v1) |
| GitHub API rate limit throttles activity/cadence reads | Medium | Reads cached and batched to stay under the limit |
| Regulator treats NGO verification docs as sensitive PII | Medium | Docs held in a private, access-controlled store, encrypted at rest; DPA available; consent + minimization review as contingency |
| AI-generated code has license/quality issues | Medium | MIT default; first-apply IP attestation (REQ-007, no separate CLA); CI lint + tests required for handoff (REQ-012); NGO can reject handoff |
| Fuel-cost inflation — Anthropic raises prices | Medium | Skim is percentage-based and scales with cost; fuel rate card revisited periodically |
| Security incident at Lovable (the build vendor) affects the integration | Medium | No ai4good credential is stored with Lovable — only the volunteer's own login couples to it; if an incident affects NGOs, pause Lovable build recommendations and fall back to the manual path |
| Lovable status-email parser breaks on format changes | N/A in v1 | Deferred to v1.5; v1 uses a manual status widget, so no parser exists to break |
| AI tools burn fuel without a viable deliverable | High | Irreducible AI-dev risk. First-apply Platform Promise disclaimer; per-project fuel cap bounds exposure; USER-TEST checkpoints catch dead ends; burn-per-deliverable on NGO panel (REQ-034). Consumed tokens are non-refundable; outcome recorded for matching reputation (REQ-035, v1.5) |
| NGO expects an SLA / completion guarantee | Medium | No-SLA/no-completion clause acknowledged at signup and at every match acceptance; Promise-link footer at every top-up; admin outreach + next-match priority on stalls |

---


