# PRD: ai4good — AI-Fueled Marketplace for NGO Tools

**Author:** nirdrang@gmail.com
**Date:** 2026-05-15
**Status:** Draft
**Version:** 1.0
**Taskmaster Optimized:** Yes

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Promise & Disclaimers](#platform-promise--disclaimers)
3. [Problem Statement](#problem-statement)
4. [Goals & Success Metrics](#goals--success-metrics)
5. [User Stories](#user-stories)
6. [Functional Requirements](#functional-requirements)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [Technical Considerations](#technical-considerations)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Out of Scope](#out-of-scope)
11. [MVP Scope & Post-MVP Roadmap](#mvp-scope--post-mvp-roadmap)
12. [Open Questions & Risks](#open-questions--risks)
13. [Validation Checkpoints](#validation-checkpoints)
14. [Appendix: Task Breakdown Hints](#appendix-task-breakdown-hints)

---

## Executive Summary

NGOs routinely need custom internal tools (volunteer scheduling, beneficiary CRMs, grant trackers, impact dashboards) but cannot afford bespoke software development; meanwhile, an emerging wave of AI-augmented developers can ship those tools in a fraction of the historical cost. **ai4good is a nonprofit-operated, open-source marketplace that turns NGO software needs into volunteer-built, AI-powered tools the NGO can run *and keep evolving themselves*.** A volunteer developer builds the first version using Claude Code (which orchestrates an AI app-builder, Lovable, for the UI/app layer); the NGO ends up with a **deployed, running app it can continue to evolve via a chat interface — fixing bugs and adding features without a developer.** Build-phase AI compute is funded by metered Stripe credits ("fuel"); **the platform recognizes a configurable skim (default ~15%) at consumption time** — as the project actually uses AI compute, not when the NGO pays in. **Fuel is prepaid, fully-consumable, non-cash service credit** (it powers AI work and is not cash-refundable; unused fuel stays as redeployable platform credit — see Platform Promise §7 and REQ-009). As a nonprofit, ai4good runs on **blended revenue** — skim + grants + donations — not skim alone. Expected impact: 25 NGOs receive a working, deployed-and-self-maintainable tool and 100 active volunteer developers engage in the first 12 months.

**Critical framing — read the next section before reading the rest of this PRD.** ai4good is a coordination layer, not a software vendor: it connects NGO needs with volunteers, funds AI compute, and helps the NGO end up owning a tool it can self-maintain. The relationship is governed by a plain-language Terms of Service (no warranties, no SLA, no guaranteed deliverable) — warm in tone, real in force. All work is open-source by default; fuel funds AI usage, not guaranteed outcomes. This shapes every requirement that follows.

---

## Platform Promise & Disclaimers

ai4good is a **nonprofit coordination layer**, not a software vendor. The platform's promise is to connect NGO needs with willing volunteer developers, fund build-phase AI compute ("fuel"), help the NGO end up with a deployed tool it can self-maintain, and bring open-source-grade transparency to the work. **It is explicitly not a service provider with delivery commitments.** This framing is not a footnote — it is the operating principle that justifies the entire design (free Discovery, fuel-on-match, open-source-by-default, no public ratings, tip-not-pay, etc.).

**Legal posture (decided 2026-06-03):** the relationship is governed by a **plain-language, counsel-reviewed Terms of Service** — the protective terms below (no warranty, no SLA, limitation of liability) are only enforceable *inside* a contract, so a real ToS holds them while the UI keeps the warm "coordination layer, not vendor" voice. ai4good does NOT assert "no contract exists"; it asserts a *limited, bona-fide coordination relationship* with no delivery obligation. As a nonprofit coordinating genuine volunteers who donate their time to charitable work, volunteers are not employees, contractors, or sub-contractors of ai4good or the NGO.

NGOs and volunteers must understand and accept the following before participating:

### 1. A limited coordination relationship — no delivery obligation
The ToS establishes a limited, bona-fide coordination relationship: ai4good connects the parties and funds AI compute; **no party is obligated to deliver any specific outcome.** Volunteers donate their time; they are not employees or contractors of ai4good or the NGO. This is a coordinated effort under clear terms, not a commercial engagement with deliverables.

### 2. Work is open-source by default; private opt-in for justified cases

Every project repository is **public MIT by default** — volunteer code is publicly viewable, forkable, and re-usable from the first commit. This is the platform's IP model and a core volunteer value proposition (your work becomes a public portfolio piece, re-usable by anyone).

**Private repos are allowed by exception** for projects with legitimate confidentiality needs (beneficiary PII, health data, internal HR/finance tools, classified workflows, donor identities). NGO requests private at scope time with a brief justification; platform triage (REQ-023) confirms the justification is consistent with NGO mission and acceptable-use policy. Private projects:
- Live in the same `ai4good-projects` GitHub org with private visibility (GitHub Free org includes unlimited private repos with unlimited collaborators)
- Show on the marketplace with a 🔒 **Private** badge so volunteers can self-select; project description visible, code hidden
- Count toward volunteer reputation ("5 tools shipped, 2 private") but project name/details on the volunteer's public profile are hidden by default for private projects
- Still follow all other Platform Promise clauses (limited coordination relationship, fuel ≠ deliverables, no SLA, etc.)

**What is still not allowed**, regardless of public/private:
- Commercial / closed-source-for-resale work (ai4good is for nonprofit mission delivery, not commercial software development)
- Surveillance tooling, spam infrastructure, illegal use, or content violating ai4good's acceptable-use policy

This resolves Codex round-1 finding #14 (open Issue §11 #4) — sensitive NGO data no longer forces the open-source default to break.

### 3. Fuel funds AI usage on this project — not deliverables
When an NGO funds a project's fuel, they are paying for AI compute on that project — **both the Discovery scoping work the NGO does with the AI Discovery Agent** (after the free Discovery credit pool is exhausted; decision-8, 2026-06-04) and **the build work the volunteer does** with Claude Code (Anthropic API tokens). On Track A this also pays Lovable credits directly to Lovable from the NGO's own Lovable workspace. **They are NOT paying for a working tool, a fixed scope, or a specific outcome.** Fuel may be spent in full — by either the NGO during scoping or the volunteer during build — without producing a viable deliverable. This is a known and irreducible risk of AI-assisted software development: the tools can produce convincing-looking work that doesn't compile, doesn't meet the scope, or doesn't survive contact with real NGO data. **NGOs assume this risk knowingly.**

### 4. No SLA, no completion guarantee
ai4good does not guarantee that any project will reach handoff. Specifically:
- Volunteers may ghost mid-project (REQ-027 inactivity → auto-release + rematch; REQ-016 notifications; 100% reliability is not promised).
- AI tools may produce non-working output that consumes fuel without progress.
- Scopes may prove infeasible once implementation begins.
- NGOs may decline handoffs that don't meet expectations.

The platform's job is to make these risks **transparent and bounded** — per-project fuel budgets cap the financial downside (you only ever spend what you commit), and inactivity / handoff flows surface stalls early.

### 5. What ai4good does promise
- **Bounded financial risk** — per-project fuel budgets are NGO-chosen at fund-time; we do not auto-charge beyond commitment.
- **Transparent volunteer track record** — completion credit, badges, project history (not stars).
- **Open-source IP norms** — your project is forkable forever; no lock-in.
- **Verification gating on the NGO side** — REQ-002 tiers reduce fraudulent and abusive demand.
- **Escalation paths when work stalls** — in-platform messaging (REQ-015), notifications (REQ-016). (Post-handoff issue surfacing — REQ-017 — is a v2 capability; v1 NGOs re-engage by posting a new project.)
- **A genuine attempt to ship** — by motivated volunteers, with AI leverage, on real NGO problems.

### 6. Progress over promises (stepwise funding by design)

The platform encourages NGOs to fund projects in **small, frequent steps** rather than large upfront commitments. This is intentional: each fuel run-out creates a natural progress-review moment where the NGO sees concrete work — commits, completed PM tasks, the volunteer's account of what's next — before continuing to fund.

**Trust is built through demonstrated progress, not large prepayments.** Volunteers benefit too — smaller per-stage stakes, clearer feedback loops, less anxiety from over-commitment. The platform's cost-control machinery (per-project fuel cap, `fuel_topup_needed` blocker at 20% / 0%, REQ-024) makes this the path of least resistance, not an extra discipline the NGO has to impose on themselves.

The two main progress signals that drive these review moments:
- **PM task tree (REQ-026)** — "Now working on" + completed-tasks count + activity feed
- **Git commit cadence (REQ-010)** — commits this week, last activity, cadence health badge

NGOs do not need to learn a new "trust ceremony"; they need to look at the project page when the fuel-low blocker fires, evaluate the visible work, and decide whether to top up.

### 7. Fuel is non-cash, project-scoped credit — it stays yours and working (decided 2026-06-03)

Fuel is **prepaid, fully-consumable, non-cash service credit**. **Decision-8 (2026-06-04):** fuel can be funded on a project **at any point from `draft` onward** — typically at match acceptance, but also earlier if the NGO wants to continue Discovery past the free credit pool (REQ-002/004/006). It is **project-scoped**: unused fuel **stays on the project** — and crucially **survives a volunteer change** (if a volunteer leaves mid-project, the project re-opens and the next volunteer picks up the remaining balance — REQ-027). So in practice your money keeps working on exactly the project you funded, whether you spent it scoping with the AI Discovery Agent, or your volunteer spent it building.

**Fuel is not cash-refundable.** It powers AI compute; once the project is genuinely finished or abandoned, leftover credit can be:
- **Kept** on your account as redeployable platform credit, OR
- **Donated** to ai4good (a tax-deductible donation given ai4good's nonprofit status — see §11),
- **(v1.5) Moved** to another of your projects (move-funds-between-projects is on the roadmap).

There is **no cash-out / withdrawal in v1** (this deliberately removes the only money-out path, eliminating laundering risk and the Treasury/ACH/AML/KYC machinery). **Nothing is ever silently removed.** This is disclosed plainly at funding time so no NGO is surprised — funding screen states: *"Fuel powers AI work and is not cash-refundable; unused fuel stays as credit for your projects or can be donated."*

### 8. Minimize admin intervention

The platform is designed to keep admin work to a minimum so that growth is not bottlenecked on human reviewers. Operating principle: **target < 10 minutes of admin time per active project per week** at steady state.

Concretely, this means:
- **Automation first** — anything that can be automated, is (virtual-key issuance + revocation, Linear pool assignment + invites + decomposition push, inline metering, blockers, ledger updates). The one honest exception: Linear workspace *creation* has no public API — so it runs as **batch pool replenishment in the background** (decision-20 pool amendment), never on a kickoff's critical path. *(Automated spend-anomaly detection is a v1.5 add — decision-14; v1 bounds loss with deterministic caps + daily human review.)*
- **Batched, not real-time** — admin work that must remain manual (e.g. Anthropic key creation, which Anthropic restricts to Console) is **batched twice daily** (9am + 5pm) rather than processed on-demand. Volunteers and NGOs are told upfront ("AI key ready within 12h of fuel deposit") so expectations match the SLA. **Lovable setup is NOT an admin task** as of open-item-4 redesign (2026-05-26) — it's volunteer-driven via the `lovable_setup_pending` blocker (REQ-021).
- **Tiered confidence-based escalation** — anomaly response auto-acts on high-confidence cases (≥0.9 score), only routing ambiguous middle-confidence (0.6–0.9) cases to admin queue.
- **Self-service for NGO actions** — verification doc upload, fuel top-up, key rotation request — all self-serve UI; admin only sees the resulting queue items. (KYC submission + auto-top-up enable/disable are v1.5 per §11 — not v1 self-serve surfaces.)
- **Unified ops queue** (`ops_tasks` table) — one admin inbox, one notification pattern, one UI to triage.
- **Monthly reconciliation is automated** — admin only sees a task if discrepancy > 1% of monthly Anthropic invoice.
- **Admin time KPI surfaced on admin dashboard** — weekly rolling average of admin minutes per active project; alerts if trend goes above 10-min/project/week target.

This is intentionally restrictive: features that would require routine admin involvement should be evaluated against this principle before being added.

### 9. Acknowledgment cadence (Option D)

The platform asks for explicit, audit-logged acknowledgment at **two NGO moments + one volunteer moment**:

| Actor | Moment | What's acknowledged | Why this moment |
|---|---|---|---|
| NGO | **At signup** (Story 1) | Full Terms of Service + Promise (all clauses) | Cannot proceed to project creation without it; sets baseline understanding |
| NGO | **At first funding on a project + at every match acceptance** (REQ-006 / Story 3 NGO-side — updated 2026-06-04 for decision-8) | Clauses 3 + 4 (fuel ≠ deliverable; no SLA) + fuel-is-non-cash-credit (§7) + data-responsibility for the project's `data_sensitivity` tier (REQ-004/023). Under decision-8, fuel can be funded before or at match — the **first per-project funding** (whether a Discovery top-up or a match-acceptance top-up) fires a hard acknowledgment naming the project + per-project cap; **match acceptance** still fires its own hard acknowledgment naming the volunteer (the "you and this person" moment). Both are recorded in `audit_events`; neither is reused for the other. | First funding = "money commits to this project." Match acceptance = "volunteer + money + scope all converge." Both are real-commitment moments and warrant their own ack. |
| Volunteer | **At first project application** (Story 3 — disclaimer is a property of the volunteer account) | A single combined first-apply disclaimer (Story 3 / REQ-007): Clauses 1 + 2 (limited coordination relationship; all work open-source by default) + per-project-key-use + a **standing data-confidentiality undertaking** ("when a project handles real data I will work only with the NGO's synthetic/anonymized fixtures and keep what I see confidential"). This is universal — sworn once by every volunteer, not a separate per-project artifact — so it already binds before they ever touch a private/Tier-1+ project. | One-time; not re-prompted on subsequent applies unless ToS/disclaimer text materially changes |

At fuel top-ups *after* the first per-project funding and after the first match (i.e. subsequent refills on the same project), the platform shows a passive footer link to the full Promise (no hard checkbox), since these are usually refill-during-active-project events where a hard interrupt would feel out-of-tone.

All acknowledgments are recorded in `audit_events` with timestamp + IP + ToS/disclaimer text version + SHA. A material change to the text re-triggers acknowledgment.

### 10. The deliverable: a tool the NGO can run and keep evolving (decided 2026-06-03)

ai4good's deliverable is not "a repo" — it is a **deployed, running tool the (non-technical) NGO can continue to evolve itself.** A project's *track* is set at Discovery (REQ-004) by *who maintains the tool after the volunteer leaves*:
- **Track A — "NGO-maintains-it":** the durable home is an AI app-builder (**Lovable** in v1) where the NGO evolves the live app via chat after handoff — fixing bugs, adding features, with no developer. The volunteer builds the first version through Claude Code, which orchestrates Lovable. **Track A is the only track ai4good builds in v1.**
- **Track B — "developer-grade / one-off"** *(deferred to post-v1 — decision-19):* custom logic / integrations / no expectation of non-dev chat maintenance. Track B can clear "deployed + running" but by construction cannot satisfy "the NGO evolves it itself," so v1 does not take it on. Needs that would require Track B are detected at Discovery and parked on a developer-grade waitlist (see REQ-004).

**The honest promise for Track A:** *the NGO owns the code outright (portable, open-source, no lock-in) AND can self-maintain via chat for roughly the AI-builder's subscription (~$25/mo) as long as they choose to pay; if they stop paying, they keep a deployable app but lose hands-free chat maintenance.* This is set as an expectation at kickoff, with a spend cap so metered edit costs never blindside a non-technical owner.

This section is not legalese. It is the actual operating model.

---

## Problem Statement

### Current Situation

NGOs run on a chronic software deficit. They juggle spreadsheets, generic SaaS (Airtable, Google Forms, mailing lists) and donated point-solutions that rarely fit their actual workflow. Commercial software vendors price for corporate budgets, pro-bono dev shops are oversubscribed, and one-off volunteer projects routinely stall before shipping because there is no shared backbone — no scope definition, no funding model, no project management, no handoff process.

On the supply side, a growing cohort of AI-augmented developers (Claude Code, Cursor, Lovable, Copilot users) can now produce working software 5-10x faster than the pre-AI baseline, but they have no aggregated channel to apply that productivity to social-impact work. The mismatch is a coordination failure, not a willingness failure.

### User Impact

- **Who is affected:**
  - NGOs and other mission-driven organizations (charities, public-sector projects, researchers) needing custom internal tooling.
  - AI-augmented volunteer developers who want meaningful, scoped projects and a way to be credited (and reimbursed for AI costs) for their contributions.
- **How they're affected:**
  - NGOs lose staff hours to manual workarounds, miss reporting deadlines, and cannot scale operations.
  - Volunteers struggle to find projects with clear scope, available funding for AI tokens, and a path to actually delivering something useful.
- **Severity:** High. The opportunity-cost of un-built NGO tooling is well-documented (e.g. Code for America research showing 30-60% productivity loss to manual processes in under-resourced civic orgs).

### Business Impact

- **Cost of problem:** Conservatively, NGOs globally spend $1B+/year on commercial SaaS that only partially fits their workflows, and lose multiples of that in unbilled staff time on workarounds.
- **Opportunity cost:** AI-coding productivity gains are not currently reaching the social-impact sector; without an aggregator, individual project efforts will continue to fragment and stall.
- **Strategic importance:** Establishes ai4good as the default coordination layer between NGO needs and AI-augmented volunteer supply, with a self-sustaining revenue model decoupled from grant funding.

### Why Solve This Now?

1. **AI coding inflection point:** Tools like Claude Code, Lovable, and Cursor have crossed the threshold where a single developer can ship production software in days, not months.
2. **Token-metered economics:** Pay-per-use AI APIs make per-project budgeting tractable for the first time — an NGO can fund a specific tool with a specific dollar amount.
3. **Open-source norms maturing:** GitHub-native workflows (issues, projects, releases) provide a free, transparent project-management spine.
4. **Stripe billing primitives:** Metered billing, customer balances, and webhooks make a credit-ledger product feasible for a small team.

---

## Goals & Success Metrics

### Goal 1: Ship Working, Deployed NGO Tools (decided 2026-06-03)

- **Description:** Produce real, **deployed and running** tools for real NGOs that the NGO actually uses — not just handed-off repos. End-to-end: post → discovery → match → build → **deploy** → handoff.
- **Primary Metric:** Number of projects reaching `handed_off` **with a verified live deployment URL** (REQ-012 deploy step — Track A: live Lovable app + workspace ownership transferred to the NGO). *(Track B's plain-host deploy path is deferred to post-v1 — decision-19.)*
- **North-star Metric:** **"Still alive at 30 days"** — projects whose deployed app responds to an automated health check 30 days post-handoff (tracked, not guaranteed — no SLA per Platform Promise §4).
- **Baseline:** 0 (greenfield).
- **Target:** **25 NGOs receive a working, deployed tool** in the first 12 months; ≥60% still-alive at 30 days.
- **Measurement Method:** `projects.status = 'handed_off' AND deployment_url IS NOT NULL`, joined to distinct `ngo_id`; 30-day health-check job records the alive signal.

### Goal 2: Volunteer Engagement & Retention

- **Description:** Build a stable supply of volunteer developers who return for multiple projects.
- **Metric:** Active volunteers (1+ committed task per month) and repeat-project rate.
- **Baseline:** 0 volunteers.
- **Target:** **100 active monthly volunteers; 30% repeat-project rate** (volunteers who complete a 2nd project within 90 days of their 1st).
- **Timeframe:** Month 12.
- **Measurement Method:** Monthly cohort analysis on `volunteers` joined to `project_assignments`; cohort retention dashboard.

### Goal 3: Blended Sustainability (decided 2026-06-03 — re-pointed from skim-margin)

- **Description:** As a nonprofit, validate the **blended** funding model — earned skim + grants + donations covering the cost base (Anthropic float + infra + the deliberately-manual concierge/admin labor). v1 is expected to be net-negative on skim alone; the goal is a credible path to blended sustainability, not skim profitability.
- **Metric:** Net contribution = (skim revenue + grants + donations) − (Anthropic cost + infra + ops). Plus the inputs: fuel throughput, skim, grant/donation intake.
- **Baseline:** $0.
- **Target:** **$250k fuel throughput; secured grant/donor runway covering the projected year-1 net gap; donation conversion on unused fuel ≥ 20%.**
- **Measurement Method:** Stripe reports + `fuel_transactions` ledger (control-total reconciled per REQ-006) + a bottom-up year-1 P&L maintained alongside this PRD.

### Goal 4: Discovery Quality

- **Description:** Validate that the AI Discovery Agent produces scopes that volunteers can actually execute against.
- **Metric:** Percent of scoped projects that reach Handoff without major scope renegotiation (>1 reopen of the scope doc).
- **Baseline:** N/A.
- **Target:** **>70% of projects ship against original scope** with at most one minor scope revision.
- **Timeframe:** Months 3-12.
- **Measurement Method:** Project audit field `scope_renegotiations`; correlation with handoff success.

### Goal 5: Volunteer Supply Liquidity (decided 2026-06-03 — the #1 launch gate)

- **Description:** A two-sided marketplace dies on the side with no liquidity, and for ai4good that's supply. This goal makes the supply funnel visible and healthy, mirroring the demand-side funnel. Launch is **concierge-first**: pre-recruit a volunteer bench and hand-match the first ~10–15 curated projects before opening organic browse (REQ-007 / §11 launch strategy).
- **Metric:** Volunteer activation funnel — signup → first apply → first match → first handoff — and time-to-first-match per `open` project.
- **Target:** **≥ 20-volunteer pre-launch bench; ≥ 80% of the first cohort's `open` projects matched within 7 days; volunteer signup→handoff activation ≥ 25%.**
- **Measurement Method:** Supply-funnel cohort dashboard; `projects` aging-in-`open` distribution; the **aging-`open`-project nudge job** fires on the laggards. *Job definition:* an hourly `job_runs` job (`job_name = 'aging_open_nudge'`) scans `projects WHERE status = 'open'` (excludes every funded/matched status by definition; decision-17 removed `paused` from v1) for rows whose `published_at` (or last re-open timestamp) is older than the cohort SLA — **7 days during the concierge phase, 14 days at organic-browse scale** — and emits one `project_aging_unmatched` event per laggard (deduped so a project nudges at most once per 72h). The event routes to the platform-admin concierge queue (hand-match candidate) and featured-nudges matching volunteers (REQ-016). Implemented as Phase-5 Task 5.8 / Appendix task 59.

---

## User Stories

### Story 1: NGO Posts a Need

**As an** NGO program manager,
**I want to** describe a software need in plain language and have it turned into a buildable scope,
**So that I can** get a real tool funded and built without writing a technical spec myself.

**Acceptance Criteria:**
- [ ] NGO can sign up and create an organization profile (name, mission, contact, verification docs).
- [ ] **At signup, NGO must explicitly accept the Terms of Service + Platform Promise** (limited coordination relationship, work open-source by default, fuel funds AI usage and is non-cash credit not a deliverable, no SLA). Acceptance recorded with timestamp + IP + ToS version + SHA in `audit_events`. Without acceptance, the account cannot proceed to project creation.
- [ ] NGO can start a new "Project Need" with a free-text problem description (no technical jargon required).
- [ ] The AI Discovery Agent conducts a structured conversation (5-10 turns) to refine the need into a scoped spec.
- [ ] At the end of discovery, the NGO is shown: a scope document, a **qualitative complexity tier** (small / medium / large — no dollar estimate in v1, per REQ-004), the project's **`data_sensitivity` tier + the data-handling guideline** for it (REQ-004 — Tier-2 = fixtures-only during build), the **maintenance track** (Track A "you maintain it via chat in Lovable"; Track B "developer-grade" is deferred to post-v1 — non-Track-A needs are waitlisted per REQ-004), a suggested tech stack, and a list of acceptance criteria.
- [ ] NGO can edit the scope before publishing; once published, the project goes to the public marketplace.
- [ ] NGO receives an email when the project is published and when a volunteer is matched.

**Task Breakdown Hint:**
- Task 1.1: NGO sign-up + org profile UI (~6h)
- Task 1.2: Project Need creation form (~4h)
- Task 1.3: Discovery Agent conversation engine (Claude API integration) (~12h)
- Task 1.4: Scope document generator + editor UI (~8h)
- ~~Task 1.5: Fuel-budget estimator heuristic (~6h)~~ — **dropped (v1 doesn't produce dollar estimates per REQ-004)**
- Task 1.6: Tests for discovery flow (~6h)

**Dependencies:** REQ-001 (Auth), REQ-002 (NGO org model), REQ-004 (Discovery Agent), REQ-005 (Scope doc + publishing)

---

### Story 2: NGO Funds a Project with Fuel

**As an** NGO program manager,
**I want to** purchase fuel credits via credit card and assign them to a specific project,
**So that I can** budget per-tool and not commit to platform-wide spending.

**Acceptance Criteria:**
- [ ] NGO can purchase fuel via Stripe Checkout (one-time top-ups; no subscription required).
- [ ] Stripe Checkout footer includes a passive reminder line linking to the Platform Promise & Disclaimers section (no checkbox, no hard interrupt). The hard acknowledgment lives at match acceptance (Story 3 NGO-side), not per-top-up — see Acknowledgment Cadence below.
- [ ] Fuel is denominated in USD; the project page shows gross USD funded (NGO sees $100 of fuel for $100 paid — Option γ).
- [ ] **No skim is taken at top-up.** Top-up creates a single `kind='topup'` row crediting the full gross amount to the project (REQ-006). **Platform skim (default 15%) is recognized at consumption time** in REQ-009 — i.e. paired consumption + skim rows are written as Anthropic spend accumulates, with a markup factor (`1 / (1 − skim_rate)`).
- [ ] Top-up amount is credited to a per-project `fuel_balance` (or to a general NGO balance, then allocated to projects).
- [ ] NGO can view a real-time fuel ledger per project (purchases, consumption, current balance).
- [ ] Webhooks from Stripe reconcile the ledger; failed payments trigger clear user feedback.
- [ ] NGOs in EU/UK get a valid VAT invoice (Stripe Tax integration).

**Task Breakdown Hint:**
- Task 2.1: Stripe Checkout integration (~6h)
- Task 2.2: Fuel ledger schema + service (single-row topup + consumption-time skim pairs, Option γ) (~8h)
- Task 2.3: Skim rate configuration (per-project, stored on consumption rows) (~4h)
- Task 2.4: Webhook handler + reconciliation (~6h)
- Task 2.5: Per-project fuel UI (NGO dashboard, gross-amount display) (~6h)
- Task 2.6: Stripe Tax setup + invoice surfacing (~4h)

**Dependencies:** REQ-001 (Auth), REQ-006 (Fuel ledger + match-to-fund flow), REQ-009 (consumption-time skim recognition)

---

### Story 3: Volunteer Joins and Gets Matched

**As an** AI-augmented developer,
**I want to** browse open projects, filter by skills/scope, and claim one,
**So that I can** apply my time to impactful work that has clear scope and funded fuel.

**Acceptance Criteria:**
- [ ] Volunteer can sign up via GitHub OAuth; profile pulls GitHub stats (public repos, languages, contribution graph).
- [ ] Volunteer self-declares skills, time-availability (hours/week), and preferred causes.
- [ ] **At first project application** (same first-commitment-moment principle as the GitHub link gate per REQ-007), volunteer must explicitly accept the relevant ToS + Platform Promise clauses: *"ai4good is a limited, bona-fide coordination layer — no one is obligated to deliver a specific outcome, and my participation is governed by ai4good's Terms of Service. I am volunteering my time (not an employee or contractor). All my work on any project I'm matched to will be public-by-default open-source under MIT (private allowed by NGO justification per Platform Promise §2). I will use each project's Anthropic API key only for that project's work — not for personal projects, other ai4good projects, or any non-project purpose. When a project handles real data, I will only work with the synthetic/anonymized fixtures the NGO provides (Tier-2 special-category data, REQ-004), and I will keep what I see confidential. Violations may result in account suspension and forfeiture of completion credit."* Bumping the ToS/disclaimer text version re-triggers acceptance. Acceptance is a property of the volunteer account (`volunteer_profiles.first_apply_disclaimer_accepted_at`), not the application — recorded with timestamp + IP in `audit_events` with `disclaimer_text_version` + `disclaimer_text_sha256` per the existing audit schema. Subsequent applies do not re-prompt unless the disclaimer text materially changes (a new version forces a one-time re-accept on next apply).
- [ ] Marketplace shows open projects with scope, suggested stack, cause tags, and **skill/cause overlap badges** for the logged-in volunteer (e.g. "Skills match: 3 of 5", "Causes match"). No numeric match score in v1 (REQ-011 minimal — full scoring algorithm deferred to v1.5 per §11).
- [ ] Volunteer can apply to a project; NGO approves/declines via dashboard or auto-approves (configurable).
- [ ] **Acceptance does NOT trigger kickoff** — repo, Linear workspace, virtual keys, task backlog, comment thread are all created at funding (REQ-006 match-to-fund → `in_progress`), not at acceptance. After NGO accepts, project sits at `matched_pending_fuel` until NGO funds.
- [ ] **On successful funding** (REQ-006 → `in_progress`), the kickoff sequence fires. **v1 is Track A only (decision-19), so `lovable_recommended` is always true and Lovable setup is mandatory** — no volunteer skip/opt-out. ai4good defers programmatic repo creation and auto-raises the `lovable_setup_pending` blocker (REQ-021); NGO + volunteer collaborate via the 11-step checklist to land the repo in `ai4good-projects/<slug>`. **No platform-admin involvement.** Task backlog decomposed from Discovery output into the project's Linear workspace (REQ-026, decision-20) — NOT GitHub Issues, which are dev-internal only (REQ-008); virtual keys minted (REQ-009, decision-21); project comment thread opened (REQ-015).
- [ ] Volunteer receives an in-platform "starter kit" with the Track-A build guide (Claude Code setup + the Lovable-orchestration guide pointer), plus the pull-based Linear workflow guide (browse briefs → assign → work → PR merge moves status).

**Task Breakdown Hint:**
- Task 3.1: GitHub OAuth + profile import (~6h)
- Task 3.2: Volunteer profile editor (~4h)
- Task 3.3: Project marketplace listing UI + filters (~8h)
- Task 3.4: Skill/cause overlap badges (count-based; **no numeric score in v1** — REQ-011 minimal) (~3h)
- Task 3.5: Apply / approve flow (~5h)
- Task 3.6: GitHub repo + PM task tree bootstrap **on funding** (not on acceptance) — Lovable→GitHub repo path per REQ-008/021 (v1: `lovable_recommended` always true) (~10h)
- Task 3.7: Starter kit page with Track-A build guide (~4h)

**Dependencies:** REQ-007 (Volunteer model), REQ-008 (GitHub integration)

---

### Story 4: Volunteer Builds — Claude Code as the entry point (Track A: orchestrating Lovable via MCP)

**As an** assigned volunteer developer,
**I want to** use Claude Code as my single entry point — doing backend/logic/tests directly (metered against project fuel) and, on Track A, orchestrating Lovable via its MCP for the app/UI layer —
**So that I can** ship the NGO a deployed tool they can keep evolving themselves, with one pane of glass and ai4good's metering/enforcement in the loop.

**Acceptance Criteria:**
- [ ] Each project provisions an Anthropic API key (REQ-009) tied to the project's fuel balance.
- [ ] Volunteer receives a Project Starter Kit page + installs the **ai4good Claude Code Skill (REQ-028)**, which auto-configures the ai4good MCP server, primes project context, and (Track A) sets up the Lovable orchestration.
- [ ] Token usage from Claude Code is pulled from the Anthropic Usage API (idempotent cursored poller, REQ-009) and deducted from the project's fuel balance.
- [ ] When fuel drops below 20%, NGO is auto-notified to top up; below 5%, dev sessions are warned in-app + the key deactivates at the 5% blocking threshold (REQ-009 — absorbs polling lag).
- [ ] When fuel hits 0, the project's API key is revoked; both volunteer and NGO are notified.
- [ ] Volunteer has a "fuel gauge" widget in the platform dashboard.
- [ ] **Track A — Claude Code orchestrates Lovable (REQ-021 + REQ-028):** when `maintenanceTrack = A_ngo_maintains`, the Skill drives Lovable via the `LovableDriver` port (`send_message`/`get_diff`/…), enforcing the per-task Lovable-credit budget cap + audit, with manual dual-rail fallback if Lovable MCP is down. The NGO owns the Lovable workspace (durable post-handoff home). *(Track A is the only build track in v1 — Track B's Claude-Code-direct / plain-host path is deferred to post-v1, decision-19.)*
- [ ] **Lovable status widget:** volunteer can mark `credits_low`/`blocked` to escalate to the NGO; Lovable cost is paid by the NGO directly (not from fuel).
- [ ] **Dual fuel-meter display:** project page shows the Claude Code fuel meter + Lovable status meter (REQ-010).
- [ ] **Decision-21 (2026-07-05) supersedes the old "AI Proxy is v1.5" line:** the LLM gateway (REQ-009) ships **in v1** — the volunteer holds a project-scoped virtual key, the real provider key never leaves the gateway, and fuel enforcement is structural at request time.

**Task Breakdown Hint:**
- Task 4.1: Virtual-key mint at kickoff + show-once dashboard reveal (REQ-009, decision-21) (~3h)
- Task 4.2: Gateway inline metering — per-request paired ledger writes via the rate card (REQ-009) (~6h)
- Task 4.3: Fuel-threshold alerting (20%/5%) + blocker wiring (~4h)
- Task 4.4: Gateway fuel gate — inline fuel-suspension response at 0; next request passes after top-up (~2h)
- Task 4.5: Fuel-gauge UI (~4h)
- Task 4.6: Starter Kit page + Skill install guide (Track-aware) (~6h)
- Task 4.7: Lovable Status widget + status transitions (~5h)
- Task 4.8: Dual fuel-meter component for project page (~4h)

**Dependencies:** REQ-009 (Fuel ledger + Anthropic key provisioning), REQ-021 (Track-A Lovable orchestration), REQ-028 (Skill orchestration shell).

---

### Story 5: Project Management via the Linear-Backed PM Task Tree (REQ-026)

**As an** NGO admin or assigned volunteer,
**I want to** track tasks, sub-tasks, and progress in a plain-language hierarchical view whose status comes from deterministic events (PR merges, assignment webhooks) — not from an agent's self-reported narrative —
**So that** NGOs see progress they can trust without reading code, and the volunteer works pull-based from a session-sized, dependency-ordered backlog.

**Acceptance Criteria:**
- [ ] At project kickoff (transition to `in_progress`, REQ-005.5/REQ-006), the platform decomposes Discovery's `userStories[]` + `acceptanceCriteria[]` into a Linear issue tree (one parent issue per story; one sub-issue per acceptance criterion; `p0` label; coordinator reviews the draft before the API push — REQ-026).
- [ ] The ai4good project page shows the PM task tree as primary content: "Now working on" strip + hierarchical task list + activity feed, rendered from the Postgres projection fed by Linear webhooks (REQ-010 single view). NGOs never need Linear seats.
- [ ] Issue status is deterministic: self-assignment marks "in progress" (the commitment signal); PR merge via Linear's GitHub integration marks "done"; agents comment and self-assign but never move status (detect-and-revert enforces, REQ-026). The project's % complete = `done_p0 / total_p0` from the projection.
- [ ] **No GitHub Issues are auto-created from scope** (REQ-008/REQ-026) — GitHub Issues stay dev-internal for code bugs and never appear in the NGO view.
- [ ] Sub-issues render as a tree (parent → children); the volunteer can add sub-issues during work (they appear in the projection like any other issue).
- [ ] Change-Request-derived issues (REQ-025) appear under a "Change Request: [title]" parent.
- [ ] After handoff, the tree becomes read-only in the panel; a markdown snapshot of the final tree lives in the repo (REQ-026 CI job). Follow-up requests re-engage via a new project (REQ-017 is v2 per §11).

**Task Breakdown Hint:**
- Task 5.1: Decomposition draft + coordinator approval + Linear API push (~6h)
- Task 5.2: Plain-language activity feed (webhook events → feed rows) (~4h)
- Task 5.3: Progress calculation from the projection (p0 done ratio) (~3h)

**Dependencies:** REQ-008 (GitHub repo — the substrate Linear's GitHub integration watches), REQ-026 (Linear task system — primary spec)

---

### Story 6: Handoff and Post-Handoff (tips deferred to v1.5; attribution capture in v1 — decision-22)

**As an** NGO,
**I want to** receive the completed open-source repo with deployment instructions and a runbook, and have a path to request follow-up work (tips deferred to v1.5 per §11; sign-off captures the REQ-035 attribution),
**So that I can** continue to operate and extend the tool without depending on any specific volunteer.

**Acceptance Criteria:**
- [ ] Volunteer can mark a project as "Ready for Handoff" once **all P0 PM tasks (REQ-026) are marked `done`**. Open GitHub Issues do not block handoff (they are dev-internal).
- [ ] Platform runs an automated handoff checklist: README present, runbook present, deploy instructions present, at least one passing CI run, license file (MIT default).
- [ ] NGO reviews the deployed tool (against a hosted staging or live URL) and signs off via a "Handoff Accepted" button.
- [ ] On the sign-off screen, NGO sees the project's completion summary. **Tip flow is deferred to v1.5 per §11.** The sign-off **DOES include the REQ-035 attribution step** (optional testimonial + 3 required credit-framed dimensions, ~30 seconds — decision-22). Volunteer reputation in v1 = completion credit + privately-held attribution; the matching surface for it is v1.5.
- [ ] On acceptance: repo transfer (optional) to NGO's GitHub org, archival of project in ai4good (status `handed_off`), volunteer's profile gets a **completion credit** (counter +1 + "Shipped first tool" badge on first handoff — no star rating shown publicly).
- [ ] Remaining fuel is released to the NGO's general balance as **non-cash `credit_release`** (REQ-006 §7) — **no decay/retention clock, no cash refund, no auto-renew.** The NGO can **keep** it (persists as redeployable credit, never removed) or **donate** it (tax-deductible, nonprofit); **move-to-another-project is v1.5**. Nothing is ever silently removed (Platform Promise §7).
- [ ] Post-handoff, NGO can naturally use GitHub Issues on the repo for any follow-up; ai4good does NOT surface or fund these in v1 (REQ-017 deferred to v2 per §11). NGOs who want a fresh paid project re-engage by posting a new project.

**Task Breakdown Hint (v1):**
- Task 6.1: Handoff checklist automation (~6h)
- Task 6.2: Handoff UI + sign-off flow (no tips — v1.5; includes the REQ-035 attribution step) (~5h)
- Task 6.3: Repo transfer integration (GitHub API; same flow for both project shapes since both live in `ai4good-projects` after open-item-4 redesign) (~4h)
- Task 6.4: Volunteer completion credit + "Shipped first tool" badge logic (~3h)
- Task 6.5: Fuel reconciliation on handoff (~4h)

**Deferred to v1.5 (per §11):**
- Stripe Connect Express onboarding for volunteers
- Tip Checkout flow + payout
- ~~Private NGO satisfaction form + storage~~ — superseded by decision-22: the REQ-035 attribution step ships in v1 (credit-framed capture; the reputation/matching surface stays v1.5)

**Dependencies:** REQ-008 (GitHub integration), REQ-009 (Fuel ledger), REQ-012 (handoff workflow).

---

## Functional Requirements

### Must Have (P0) — Critical for Launch

#### REQ-001: User Authentication & Org Membership

**Description:** All users authenticate via Supabase Auth. Users belong to one of three roles per organization: `ngo_admin`, `volunteer`, `platform_admin`. NGO users belong to an NGO organization; volunteers are individual accounts.

**Acceptance Criteria:**
- [ ] **Email/password, GitHub OAuth, and Google OAuth** sign-in supported (Supabase Auth handles all three natively). NGO admins typically use email/password; volunteer devs can pick any provider — GitHub is convenient but not required at signup. **GitHub link is required at first project application** (open-item-4 redesign 2026-05-26 — moved earlier than the prior NGO-acceptance gate; on link, the REQ-007 onboarding flow runs and adds the volunteer to `ai4good-projects` GitHub org); see Story 3 / REQ-007.
- [ ] NGO admins can invite teammates to their org (email invitation, role assignment).
- [ ] Volunteer accounts are always individual (no org membership).
- [ ] Row-Level Security (RLS) policies enforce that NGO data is only visible to its own members and assigned volunteers.
- [ ] Password reset, email verification, and session management handled by Supabase.

**Technical Specification:**
```sql
-- Supabase manages auth.users; we extend with:
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  github_handle TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('ngo','volunteer','platform_admin')),
  -- Account lifecycle (codex round 8 — AUP suspension saga needs a single source of truth for write-rejection middleware)
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended','deactivated')),
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES profiles(id),
  suspend_reason TEXT,
  reactivated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,                          -- self-serve account deletion
  -- Decision-8 (2026-06-04): email verification is the bot floor for any Discovery message (REQ-002/004).
  -- Mirrored from Supabase Auth's auth.users.email_confirmed_at so RLS + app-side gates can read it
  -- without crossing the auth schema. Synced by an INSERT/UPDATE trigger on auth.users.
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ngos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mission TEXT,
  website TEXT,
  -- verification_state matches REQ-002 v1 state machine (codex round 5 fix — was just BOOLEAN, didn't match the documented state machine).
  -- v1 enum: 'unverified' → 'pending' → 'verified' | 'rejected'. v1.5 extends with 'kyc_pending' / 'kyc_verified' / 'kyc_rejected' when KYC tier ships.
  verification_state TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_state IN (
    'unverified','pending','verified','rejected'
  )),
  verification_decided_at TIMESTAMPTZ,
  verification_reviewer_id UUID REFERENCES profiles(id),
  verification_rejection_reason TEXT,
  -- Decision-11 (2026-06-06): per-NGO free DISCOVERY CREDITS (abstract unit; context-weighted burn). Platform
  -- compute spend, NOT a fuel_transactions ledger row (outside the fuel ledger; the $ control-total invariant is
  -- untouched — REQ-006). 1 credit = platform_settings.discovery_tokens_per_credit (default 10000) context-token-
  -- equivalents. A free grant the NGO never purchases (no stored-value/escheatment exposure). Admin can grant
  -- more same-day (REQ-002). Per-turn decrement = ceil((uncached_input + 0.1*cached_input + output)/tokens_per_credit),
  -- logged to audit_events. (Replaces decision-8's dollar-denominated discovery_credit_remaining_cents.)
  -- DAILY DRIP (decision-11 daily-drip amendment, 2026-06-06): this column holds TODAY's remaining free credits.
  -- A daily scan HARD-RESETS it to the tier daily grant at 00:00 UTC — discovery_credits_remaining =
  -- (verified ? discovery_credit_grant_verified[30] : discovery_credit_grant_unverified[10]) — NO ROLLOVER
  -- (yesterday's unused is discarded; the daily allowance is the natural fund-now-or-wait-until-tomorrow wall).
  -- This daily allowance also SUBSUMES the old separate 30-msg/day verified cap (one mechanism).
  -- Per-turn ROUTING: a Discovery turn draws these free credits ONLY while the project is unfunded; once the
  -- project has a positive fuel balance its Discovery routes to that project's fuel (discovery_consumption,
  -- 15% skim — REQ-006), leaving the NGO's free daily allowance for its other unfunded projects.
  discovery_credits_remaining INTEGER NOT NULL DEFAULT 10 CHECK (discovery_credits_remaining >= 0),
  discovery_credits_last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- decision-11: anchor for the DAILY reset (one hard reset per UTC day)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ngo_memberships (
  ngo_id UUID REFERENCES ngos(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin','member')),
  PRIMARY KEY (ngo_id, profile_id)
);
```

**Task Breakdown:** Small (4h schema + RLS), Small (4h invite UI), Small (3h tests).

**Dependencies:** None.

---

#### REQ-002: NGO Organization Profile + Verification (v1 minimal)

**Description (v1, updated 2026-06-04 for decision-8 unified-fuel + free-pool Discovery):** NGOs sign up (email-verified), complete an org profile, and submit a registration document for manual platform-admin review. Two tiers: `unverified` (can run Discovery within a small daily free-credit allowance and self-fund to continue, but cannot publish to volunteers) and `verified` (larger daily free allowance + publish/triage/match access). The third tier (`kyc_verified` with Stripe Identity automation) is **deferred to v1.5** per §11 — v1 has manual admin review only.

**Trust tiers (v1) — decision-8 amendment:**

1. **`unverified`** — Has signed up and **email-verified** (`email_verified_at IS NOT NULL`; mandatory for any Discovery message — the bot floor). Can draft projects. **Can run Discovery within a 10-credit/day free allowance** (`discovery_credits_remaining`, hard-resets to 10 daily at 00:00 UTC, no rollover; context-weighted burn, REQ-004/decision-11). Once the day's credits run dry **can fund the project's fuel** via Stripe Checkout to continue Discovery now on real-$ fuel — or wait for tomorrow's free refill (REQ-006 decision-8 unified-fuel). **Cannot publish to triage** (`scoped → triage` is verification-gated, REQ-005.5).
2. **`verified`** — Submitted registration document + public reference link, approved by platform admin. **The daily free Discovery allowance rises 10/day → 30/day** on the `unverified → verified` transition (the 3× reward, REQ-004). Can publish projects, accept volunteers, fund fuel. **Default tier for active NGOs.**

**Acceptance Criteria (v1):**
- [ ] NGO admin can create/edit org profile (name, mission, country, website, logo).
- [ ] **Email verification is required before any Discovery message** — sign-up sends a verification email; `profiles.email_verified_at` is set on confirmation. The Discovery composer is disabled (with a "verify your email to start" CTA) until this timestamp exists for at least one admin of the NGO. *(Decision-8 — this replaces NGO-doc verification as the bot floor for Discovery while keeping NGO-doc verification as the publish wall.)*
- [ ] NGO can upload registration document (PDF, stored in Supabase Storage with private access via `verification_documents` table).
- [ ] Verification state machine: `unverified` → `pending` → `verified` | `rejected`. The state machine is **independent of `email_verified_at`** — an unverified NGO whose admin is email-verified can run Discovery within the 10-credit/day free allowance.
- [ ] **On `unverified → verified` transition: the daily free Discovery allowance rises 10/day → 30/day** (decision-11). Today's `discovery_credits_remaining` is immediately raised to 30 if currently below; every subsequent daily reset uses 30. This is the "verification reward" (3×). Idempotent — re-verifying does not re-raise.
- [ ] Platform admin sees a queue of pending verifications with doc viewer; manual approve/reject + reason note.
- [ ] **Only `verified` NGOs can publish projects** (REQ-005.5 `scoped → triage` gate). Unverified NGOs may reach `scoped` (decision-8) but the Publish button is disabled with an "Upload your verification doc to publish and find a volunteer" CTA.
- [ ] **Admin-resettable free credits:** a platform admin can manually grant additional `discovery_credits_remaining` to any NGO on request (e.g. a verified NGO scoping a 5th project), recorded as an audit event with reviewer id + reason.
- [ ] **Daily free-credit reset (decision-11 daily-drip amendment, 2026-06-06):** the free Discovery allowance is a **daily drip**, not a lifetime or monthly pool — a daily scan **hard-resets** each NGO to its current-tier daily grant at 00:00 UTC: `discovery_credits_remaining = discovery_credit_grant_verified` (30) if `verified` else `discovery_credit_grant_unverified` (10). **No rollover** — yesterday's unused credits are discarded (the daily wall is the deliberate fund-now-or-come-back-tomorrow moment). The reset runs once per UTC day (guarded by `discovery_credits_last_reset_at::date < CURRENT_DATE`), writes an `audit_events` row, and advances `discovery_credits_last_reset_at`. This daily allowance **replaces** the separate 30-msg/day cap (one mechanism, REQ-004).
- [ ] Marketplace and project cards display a "Verified" badge for verified NGOs.
- [ ] **No KYC tier, no Stripe Identity integration, no kyc_pending/kyc_verified states in v1** (deferred to v1.5 per §11).
- [ ] **No paid "Discovery wallet" in v1 OR v1.5** (decision-8 closed this door explicitly — unverified NGOs who want to fund Discovery do so via the project's regular fuel ledger, not a separate Discovery wallet).

**v1.5 (deferred per §11):**
- `kyc_verified` tier with tax-exempt doc upload + Stripe Identity (admin selfie/ID check)
- KYC state machine: `verified` → `kyc_pending` → `kyc_verified` | `kyc_rejected`
- KYC badge in marketplace, "Featured NGOs" rail, +10pt boost in match score (when REQ-011 score also ships)
- "Complete your KYC for higher visibility" dashboard CTA

**Dependencies:** REQ-001.

---

#### REQ-003: Project Need Creation (free-text intake)

**Description:** Authenticated NGO admins can start a new "Project Need" with a free-text problem description that kicks off the Discovery Agent conversation.

**Acceptance Criteria:**
- [ ] Form fields: project title, problem description (markdown), cause tags (multi-select), estimated urgency (low/med/high).
- [ ] **Optional reference-file upload** (REQ-032) alongside the free-text — the NGO can attach a screenshot, spreadsheet, blank form, mockup, or requirements doc that describes the need; these feed Discovery + the volunteer. Upload shows the data-responsibility disclosure (hard Tier-2 warn once `dataSensitivity` is known).
- [ ] Draft is saved every 5 seconds (autosave).
- [ ] Submitting the intake transitions the project to status `discovery_in_progress`.
- [ ] Project initial record stores the raw intake for auditing.

**Dependencies:** REQ-001, REQ-002, REQ-032 (optional reference-file upload).

---

#### REQ-004: AI Discovery Agent (free, rate-limited)

**Description:** Conversational agent (**Claude Opus** via Anthropic API — model choice is deliberate: Discovery is the highest-leverage reasoning step in the funnel, its scope output drives the entire build, and a Discovery is short + one-time so the absolute cost is low — ~$1-2 on Opus per scoped Discovery; decision-13, 2026-06-06) that takes the free-text intake and conducts a structured 5-10 turn conversation to produce a scoped spec. **Discovery is free up to a per-NGO grant of DISCOVERY CREDITS** (decision-11, 2026-06-06 — re-denominates decision-8's dollar pool into an abstract, context-weighted credit unit). The credits are a per-NGO **daily allowance** (`ngos.discovery_credits_remaining`, default **10/day unverified / 30/day verified** — see REQ-002; hard-resets daily at 00:00 UTC, no rollover, Lovable-style), the platform's acquisition funnel without bankrupting it. **Routing is by project fuel balance (decision-11 routing amendment): a *funded* project's Discovery draws that project's fuel (15% skim), not the free pool — the free pool is reserved for the NGO's *unfunded* projects (the "Funded → all-$" rule).** **Credit burn scales with context weight** (long conversations + big uploaded reference files cost more; prompt caching costs less — see the credit-cost AC below). When the day's credits run dry the NGO can either (a) verify (if not already — the daily allowance rises to 30/day), (b) fund the project's fuel and continue Discovery NOW on real-$ fuel (REQ-006 decision-8 unified-fuel; 15% skim — this is the "expedite" path), or (c) wait for tomorrow's free refill. NGOs can publish only after `verified` (REQ-005.5 `scoped → triage` gate); unverified NGOs CAN fund and finish Discovery, they just cannot expose the project to volunteers. **Funded fuel remains real-dollar-pegged with unchanged skim — only the FREE pre-fuel Discovery phase uses credits (the two-layer money model, decision-11).**

**Acceptance Criteria:**
- [ ] Agent uses a system prompt tuned for "non-technical NGO → technical scope" extraction.
- [ ] Conversation is conducted in the platform UI (chat interface, no third-party redirect).
- [ ] Each conversation is persisted (messages + agent state) so it can be resumed.
- [ ] **Reference-file ingestion (REQ-032):** the agent reads the NGO's uploaded `discovery_visible` reference files **multimodally** (PDF, images, CSV/TSV, text — within Anthropic's supported types/sizes), can request more mid-conversation, references them in clarifying questions, and may cite them in the scope doc. File metadata is in the Discovery context. Reading files consumes Discovery fuel / the free pool like any turn (decision-8). The agent does NOT receive files the NGO marked non-`discovery_visible`, and the Tier-2 fixtures-only disclosure governs what the NGO should upload (REQ-032).
- [ ] Discovery output is a structured JSON conforming to the `DiscoveryOutput` interface below (no `fuel_budget_usd` field — v1 does not produce dollar estimates).
- [ ] Complexity is a **qualitative tier only** (`'small' | 'medium' | 'large'`) — no derived dollar formula.
- [ ] **Data-sensitivity classification (decided 2026-06-03):** Discovery asks what data the tool will handle and sets `dataSensitivity.tier`. It then **surfaces the matching data-handling guideline inline** to the NGO before they publish: Tier 0 → no restriction; Tier 1 (ordinary PII) → minimization reminder + NGO data-responsibility acknowledgment; **Tier 2 (special-category / high-volume PII) → "build against synthetic/anonymized fixtures only; connect real data yourself after handoff"** + a stronger data-responsibility acknowledgment. The NGO owns the data-exposure risk (governance-by-disclosure); ai4good's rule keeps real Tier-2 data out of Anthropic/Lovable/volunteer hands. Triage (REQ-023) confirms compliance.
- [ ] **Maintenance-track classification (decided 2026-06-03; v1 scope narrowed by decision-19):** Discovery asks *"after the volunteer is done, who keeps this running and evolving?"* and sets `maintenanceTrack.track`. **Track A (non-technical NGO maintains via chat)** → AI builder (Lovable) is the primary deliverable vehicle (REQ-021); this is the only track v1 builds. **Track B (developer-grade / one-off) is deferred to post-v1** — a need that is not Track-A-able (pure-backend, heavy custom logic/integrations, or Tier-2 data that cannot live in Lovable) does **not** get a publishable scope; Discovery explains that v1 builds only NGO-self-maintainable tools and records the need on a developer-grade waitlist (NGO notified if/when Track B opens). No build kickoff. The track drives REQ-008/021 provisioning and the REQ-012 deploy/handoff path.
- [ ] Discovery output can be regenerated (with reason logged) up to 3 times per project before requiring escalation. **Regeneration and system-error retries are FREE (cost 0 Discovery credits)** — the dev/NGO is never charged for the platform's failed output (decision-11; avoids the "retries silently burn credits" complaint the credit-vs-money research flagged at Lovable/Cursor).
- [ ] **Per-turn credit cost is context-weighted (decision-11, 2026-06-06):** each Discovery turn deducts `credits = ceil( (uncached_input_tokens + (discovery_cached_input_weight_bps/10000) × cached_input_tokens + output_tokens) / discovery_tokens_per_credit )` (defaults: cached input at 10%, 10,000 tokens/credit — `platform_settings`). So a **long conversation** (whole context re-sent each turn) and a **big uploaded reference file** (REQ-032 — rides in context every turn) cost more credits; **prompt caching the system prompt + uploaded files + conversation prefix makes turns cheaper** (cached tokens count at 10%). Credits are decremented on `ngos.discovery_credits_remaining` from the metered token counts, logged to `audit_events`.
- [ ] **Per-turn routing — free credits only while unfunded (decision-11 routing amendment, 2026-06-06):** before each Discovery turn the cost source is resolved by the *project's* fuel balance, not the NGO's. **If the project has a positive fuel balance → the turn debits that project's fuel** (`discovery_consumption` + paired skim, real-$, 15% skim — REQ-006) and the NGO's free `discovery_credits_remaining` is left untouched; **otherwise → the turn debits the NGO's free `discovery_credits_remaining`** (context-weighted, above). So funding a project routes *that* project's Discovery to its fuel (the "Funded → all-$" rule: a funded project is dollar-metered end-to-end, Discovery + build), while the NGO's free pool stays reserved for its other unfunded projects. The credit gauge shows only while the project is on the free pool; once the project is funded, the turn shows its fuel cost instead.
- [ ] **Transparency UI (decision-11, the anti-Lovable move):** the Discovery chat shows a **credit gauge** ("Discovery credits: 7 of 10 today"); each turn shows **its** credit cost; and **before** the agent ingests a large uploaded file the UI shows **"≈ N credits to include this file — proceed?"** (REQ-032). ai4good copies Lovable's per-action cost display but rejects its opacity / forfeiture-on-cancel / silent-burn — credits are a free grant, never silently removed.
- [ ] **Abuse guardrails (decision-11 — credit-based, two-tier):**

  | NGO tier | Discovery access |
  |---|---|
  | `unverified` (with `email_verified_at IS NOT NULL`) | Free Discovery up to a **10-credit/day allowance** (`ngos.discovery_credits_remaining`, hard-resets to 10 daily at 00:00 UTC, no rollover; REQ-002). When the day's credits hit 0: composer disables with *"Verify your org → 30 free credits/day"*, *"Fund this project's fuel to keep going now"* (REQ-006 decision-8, real-$ fuel), and *"or come back tomorrow for 10 more free."* No publish path until verified (REQ-005.5 gate). |
  | `verified` | Free Discovery up to a **30-credit/day allowance** (hard-resets to 30 daily at 00:00 UTC, no rollover; rises 10→30 on the `unverified → verified` transition). When the day's credits hit 0: *"Fund this project's fuel to keep going now"* or come back tomorrow. **This daily allowance replaces the old separate 30-msg/day cap** — one mechanism, not two. |
  | ~~`kyc_verified`~~ | **Deferred to v1.5 along with REQ-002 KYC tier per §11** — v1 has no `kyc_verified` tier. |

  Plus:
  - **Email-verification is a hard precondition for any Discovery message at any tier** (REQ-002 `email_verified_at`) — the bot floor the credit grant depends on.
  - Per-NGO daily allowance bounds the free subsidy **per day** (decision-11 daily-drip amendment): the free credits issued to an NGO are capped at the daily grant — 10/day unverified, 30/day verified (hard reset, no rollover). A *funded* project's Discovery does not draw the free allowance at all (it routes to that project's fuel), so the free allowance is spent only on unfunded scoping. **Funding is the "expedite" path — it lets the NGO continue immediately instead of waiting for the next day's free credits; it does NOT lower per-message latency (same model) and does NOT raise the daily allowance.** No platform-wide circuit-breaker in v1 — the per-NGO daily allowance already caps exposure; revisit if cohort behavior reveals a need.
  - Platform-level kill switch (admin can revoke Discovery access for a specific NGO if abuse is detected).
  - Admin-resettable: a platform admin can grant additional `discovery_credits_remaining` on request (e.g. a verified NGO scoping their 5th project), recorded in `audit_events`.
  - **Discovery credits are a FREE grant the NGO never purchases** → zero stored-value / money-transmitter / escheatment exposure (decision-11; unlike *purchased* credits). The grant is NOT a fuel_transactions ledger row — it is platform compute spend, a per-NGO counter on `ngos`, *outside* the fuel ledger so it does not pollute the balance control total (REQ-006). Once an NGO funds the project's fuel mid-Discovery, *that* consumption hits the fuel ledger as `discovery_consumption` (REQ-006) and pays standard skim.

**Technical Specification:**
```typescript
interface DiscoveryOutput {
  summary: string;
  userStories: {
    title: string;
    description: string;
    acceptanceCriteria: string[];   // nested under each story (codex round 5 fix — was flat top-level array, but REQ-026 needs the tree shape to bootstrap parent (story) + child (AC) tasks)
  }[];
  suggestedStack: { frontend?: string; backend?: string; db?: string; integrations?: string[] };
  complexityEstimate: 'small' | 'medium' | 'large';   // qualitative tier ONLY — no dollar figure
  riskFlags: string[];

  // Data sensitivity classification (decided 2026-06-03 — governance-by-disclosure, Items 1).
  // Discovery asks what data the tool will handle and classifies it; drives the data-handling
  // guideline shown to the NGO + the triage gate (REQ-023) + the NGO data-responsibility acknowledgment.
  dataSensitivity: {
    tier: 'tier0_no_pii' | 'tier1_ordinary_pii' | 'tier2_special_category';
    rationale: string;        // what data + why this tier (e.g. "stores client names + appointment times = ordinary PII")
    // tier2 = special-category (health, immigration, abuse-victim, financial) OR high-volume PII.
    // tier2 build-phase rule: SYNTHETIC/ANONYMIZED FIXTURES ONLY; NGO connects real data only post-handoff
    // in their own environment. Real Tier-2 data never flows through Anthropic/Lovable/the volunteer.
  };

  // Maintenance track (decided 2026-06-03 — Item 2). The SELECTOR is "who evolves this after the
  // volunteer leaves," NOT the technology.
  maintenanceTrack: {
    track: 'A_ngo_maintains' | 'B_developer_grade';   // v1 Discovery only ever emits 'A_ngo_maintains'; 'B_developer_grade' reserved for post-v1 (decision-19)
    rationale: string;
    // Track A: a non-technical NGO staffer will evolve the live app via chat → AI builder (Lovable)
    //   is the PRIMARY deliverable vehicle + durable home; Claude Code is the dev's build/debug rail.
    // Track B (DEFERRED to post-v1 — decision-19): custom logic/integrations, special-category data, or
    //   no non-dev chat-maintenance expectation. v1 detects these needs and waitlists them instead of
    //   publishing a scope (see REQ-004 maintenance-track classification).
  };

  suggestedLovable: {
    needed: boolean;
    rationale: string;     // e.g. "Public-facing dashboard with frequent UI iteration"
    // No dollar estimate in v1 — see roadmap. Scope doc shows Lovable pricing reference link only.
  };
  recommendedWorkflow: {
    mode: 'split' | 'claude_code_only';        // v1 Discovery only ever emits 'split' (Lovable UI + Claude Code backend); 'claude_code_only' reserved for post-v1 Track B (decision-19); 'lovable_only' deferred to v1.5 — all v1 matched projects require Anthropic fuel per REQ-006 / REQ-009
    rationale: string;
    claudeCodeScope?: string[];   // e.g. ["API design", "Postgres schema", "Stripe integration", "tests"]
    lovableScope?: string[];      // e.g. ["NGO dashboard UI", "public landing page"]
  };
}
```

**Discovery Agent system prompt additions:**
- **Workflow split:** When the project has BOTH UI work AND non-UI work, recommend `mode: 'split'` and list which parts go to which tool. For pure-backend, `mode: 'claude_code_only'` (note: a standalone pure-backend tool has no Lovable app for the NGO to chat-maintain → it is Track B → waitlisted in v1 per decision-19; a *publishable* v1 project is `split`, with Claude Code on the backend rail). **`lovable_only` is NOT a valid v1 mode** — all matched projects require an Anthropic fuel kickoff and use Claude Code at minimum.
- **Maintenance track (v1 = Track A only, decision-19):** ask explicitly who will maintain the tool after the volunteer leaves. If a **non-technical NGO staffer** will own ongoing changes → **Track A** (Lovable as the durable chat-maintenance home) — the only track v1 builds. If a developer will keep maintaining it, or it's a one-off, or it handles special-category data that cannot live in Lovable → it would be **Track B**, which is **deferred to post-v1**: do not emit a publishable scope; explain that v1 builds only NGO-self-maintainable tools and offer to waitlist the need. Default bread-and-butter NGO internal tools (intake forms, CRUD trackers, directories, lightweight dashboards) to Track A; custom-integration / complex-logic / Tier-2-data tools are Track B → waitlist.
- **Data sensitivity:** ask what real data the tool will handle and classify the tier. Be conservative — if unsure between Tier 1 and Tier 2, choose Tier 2 (fixtures-only is the conservative default). Never classify health/immigration/abuse-victim/financial data below Tier 2.

**v1: No precise dollar estimation.** Discovery does **not** produce a fuel-budget dollar figure or a Lovable cost estimate. Instead:
- The scope doc shows the qualitative `complexityEstimate` (small / medium / large) with a short rationale.
- The Lovable section, when `suggestedLovable.needed = true`, shows a disclaimer line: *"Lovable is recommended for [reason]. Lovable subscription is paid directly to Lovable — see [lovable.dev/pricing](https://lovable.dev/pricing) for current tiers."*
- The NGO chooses an initial fuel amount themselves at funding time (REQ-006, with $50 minimum). Top-ups are reactive via the existing fuel-low blocker flow (REQ-024).
- **A precise AI-generated fuel estimator is on the v2 roadmap** — deferred because AI-coding spend is hard to predict accurately, and overconfident estimates harm more than they help.

**Scope doc rendering — complexity + track + data tier (no budget):** The scope doc shows:

> **Project Complexity: Medium**
> Based on the scope, Discovery rates this **medium-complexity**. Start with a smaller fuel deposit and top up as work progresses (you'll be notified when fuel is low).
>
> **How you'll maintain it: Track A — you keep it yourself.** This tool will live in Lovable, where your team can keep evolving it by chat after the volunteer is done — fixing bugs, adding features, no developer needed. (Lovable subscription, ~$25/mo, is paid directly to Lovable; you own the code regardless. See lovable.dev/pricing.)
>
> **Data handling: Tier 2 — sensitive data.** This tool handles special-category data, so **the volunteer will build it against realistic *synthetic* sample data — you connect your real records yourself after handoff, in your own environment.** Your real beneficiary data never passes through the build tools or the volunteer. *(Tier 0/1 render their lighter guideline + the data-responsibility acknowledgment.)*

**Dependencies:** REQ-003.

---

#### REQ-005.5: Project Lifecycle State-Transition Table (codex round 2 #5)

**The 10-state lifecycle machine spelled out explicitly (states: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `handoff_pending`, `handed_off`, `cancelled`). Every transition has an actor, preconditions, side effects, and failure handling. The REQ-027 abandonment/rematch edge (`in_progress → open`, added 2026-06-03) is a new transition between existing states — it does not add an 11th state.**

> **› Decision-17 (2026-06-09): the `paused` state is REMOVED from v1** (was the 11th state). Pause/resume carried disproportionate cross-cutting cost for a concierge pilot: a `paused_from_status` restore column with resume-validity edge cases, the `fuel_deadline_remaining_seconds` funding-clock freeze/recompute stash, paused-special-casing inside three separate cron jobs (REQ-027 inactivity scan, REQ-006 match-expiry job, Goal-5 aging-open nudge), and key deactivate/reactivate side effects. At ~10–15 hand-matched pilot projects, "NGO needs to pause" is a support conversation: pre-match the NGO unpublishes (`open → scoped`) or cancels the match; mid-build the platform admin deactivates the Anthropic key + leaves a note (REQ-009 rotation/deactivation tooling already exists), or the project is cancelled. **Pause/resume is reinstated in v1.5 on first real NGO demand** (see §11 v1.5 table).

| From → To | Actor | Preconditions | Side effects | Failure / rollback |
|---|---|---|---|---|
| (none) → `draft` | NGO admin | Any NGO (including `unverified`) can create a draft — drafting itself is not gated. **Decision-8 update (2026-06-04):** the post-pivot rule is "verification gates `scoped → triage` (the volunteer-facing wall) — NOT Discovery." `unverified` NGOs CAN run Discovery (within the per-NGO free pool) and CAN fund fuel to finish Discovery on their own dime. | Project row created with intake form contents | — |
| `draft` → `discovery_in_progress` | NGO admin | Intake submitted (REQ-003); **`ngos.email_verified_at IS NOT NULL`** (bot floor — decision-8); NGO has Discovery capacity = `discovery_credits_remaining > 0 OR project_balance > 0` (today's daily free allowance or NGO-funded fuel; REQ-004/decision-11) | Discovery conversation started; `audit_events` logs intake | If today's credits=0 AND balance=$0: composer disabled with "Verify your org for 30 free credits/day" (unverified) and/or "Fund this project to keep going now (or come back tomorrow)" CTAs; stays in `draft` |
| `discovery_in_progress` → `scoped` | Discovery Agent (auto) on conversation end | Discovery output produced (valid `DiscoveryOutput` JSON). **No verification requirement** — unverified NGOs may reach `scoped` (decision-8) | Scope doc rendered editable | If output invalid: re-prompt up to 3× then escalate to admin |
| `scoped` → `triage` | NGO admin (Publish click) | **NGO is `verified`** — this is the post-decision-8 *volunteer-facing wall*; the publish CTA is disabled with an "Upload verification doc to publish" prompt if unverified (v1 has no `kyc_verified` tier — that's v1.5 per §11) | `triage_submitted_at = NOW()`; admin queue entry | — |
| `triage` → `open` | Platform admin | Triage decision = `approved` | Project visible in marketplace; `triage_decided_at` set | — |
| `triage` → `scoped` | Platform admin | Triage decision = `changes_requested` | Reviewer comments visible to NGO; NGO can edit & resubmit | — |
| `triage` → `cancelled` | Platform admin | Triage decision = `rejected` | NGO notified with reason | Terminal |
| `open` → `matched_pending_fuel` | NGO admin (accept volunteer's application) | Volunteer has linked GitHub (already true at apply time per REQ-007 open-item-4 redesign) AND volunteer has accepted the first-apply disclaimer (already true at apply time per Story 3 open-item-5 redesign — disclaimer is a property of the volunteer account, recorded in `volunteer_profiles.first_apply_disclaimer_accepted_at`) | `matched_at = NOW()`; `fuel_deadline_at = NOW() + 7d`; application status → `accepted`; volunteer notified | (No post-acceptance volunteer-readiness races anymore — open-items 4+5 moved both gates to apply time; any application in the system already has `github_handle` AND a disclaimer-accepted volunteer.) |
| `matched_pending_fuel` → `in_progress` | Stripe webhook (auto, on `checkout.session.completed`) | Payment ≥ $50 min | **Kickoff sequence fires** (see below) | Webhook retry / refund handling (REQ-006) |
| `matched_pending_fuel` → `open` | pg_cron match-expiry job (auto, on 7-day expiry) | `NOW() > fuel_deadline_at` AND not funded | **Atomic transaction:** `projects.status = 'open'` AND `project_applications.status = 'expired'` for the accepted application AND `assigned_volunteer_id = NULL` AND `matched_at = NULL` AND `fuel_deadline_at = NULL` — all in one transaction (codex round 5 fix). Volunteer notified + freed; NGO re-fund prompt. | If transaction fails, retry on next nightly run (idempotent — only acts when status is still `matched_pending_fuel`). |
| `matched_pending_fuel` → `open` | NGO admin (cancel match) | Anytime before payment | Volunteer notified; back to applicants pool | — |
| `in_progress` → `handoff_pending` | Volunteer (Ready for Handoff click) | All P0 PM tasks marked `done` (REQ-012) AND `projects.github_repo_url IS NOT NULL` (Platform Promise §2 + codex round 6 fix — every project ships into an `ai4good-projects` repo at handoff) | Handoff checklist evaluated; NGO notified | If checklist fails: blocked with checklist results; stays in `in_progress`. If repo URL missing (Lovable path, NGO hasn't completed setup): button disabled with prompt to complete Lovable Setup checklist (REQ-021). |
| `handoff_pending` → `handed_off` | NGO admin (Accept Handoff) | `deployment_url IS NOT NULL` (REQ-012 deploy step) | Leftover fuel → general balance as **non-cash `credit_release`** (REQ-006 §7 — no cash refund, no decay clock); Anthropic workspace archived (REQ-009); volunteer completion credit + "Shipped first tool" badge (if first); PM tree → read-only; 30-day-alive check scheduled. **No tip or satisfaction modal in v1.** | Terminal |
| `handoff_pending` → `in_progress` | NGO admin (Reject Handoff with comments) | — | Volunteer notified to address feedback; **any blockers auto-archived by the `handoff_pending` cascade are NOT restored**. Rejection-loop cap: 3rd rejection routes to neutral platform review (REQ-012). | — |
| `in_progress` → `open` (abandonment / rematch — REQ-027, added 2026-06-03) | Inactivity job (auto, 21d no branch activity + no Linear issue movement) OR NGO/volunteer manual release | — | **Outbox saga (idempotent):** revoke ex-volunteer repo collab + revoke the project's virtual keys (REQ-009) + remove Linear workspace membership + (Track A) NGO notice to remove from Lovable workspace (reuses REQ-007 step-2 teardown, minus account-suspend); **remaining fuel STAYS on the project** (Item 3 — non-cash, project-scoped, used by next volunteer); assigned in-progress Linear issues unassigned + returned to the backlog (REQ-026); ex-volunteer application → `released`; flagged `ghosted` vs `released_for_cause`; project re-opens with rematch priority | Idempotent; retried via outbox until clean |
| `open` → `scoped` | NGO admin (Unpublish to revise) | No volunteer has been accepted yet (project still in `open`, no `assigned_volunteer_id` set) | Project removed from marketplace; pending applications notified ("NGO unpublished — feel free to apply when re-listed"); applications kept for re-publish | If volunteer already accepted: action disabled in UI (NGO must cancel the match first) |
| any pre-handoff → `cancelled` | NGO admin (cancel) | — | Project virtual keys revoked (REQ-009); Linear workspace dormant; **remaining fuel → NGO general balance as non-cash `credit_release`** (REQ-006 §7 — no cash refund, no decay clock); volunteer notified; comment thread → read-only | Terminal |
| `in_progress` ↔ orthogonal blockers (REQ-024) | (various) | (various) | Status stays `in_progress`; blocker badge surfaces operational state | — |

**Application status side effects (REQ-007 / REQ-011):**

| `project_applications.status` transition | Trigger | Side effects on project / volunteer |
|---|---|---|
| `pending` → `accepted` | NGO admin Accept | Project → `matched_pending_fuel`; other pending applications on the same project auto-`declined` with "Project matched a different volunteer" notice; volunteer notified |
| `pending` → `declined` | NGO admin Decline | Volunteer notified; volunteer remains eligible to apply to other projects |
| `pending` → `withdrawn` | Volunteer self-withdraw | NGO sees withdrawn state on applicant card; no state change to project |
| `accepted` → `expired` | **pg_cron match-expiry job** (nightly/hourly) runs after `fuel_deadline_at` passes without fuel payment | Project → `open` (per main table — `matched_pending_fuel` → `open`); application's `status` flips `accepted` → `expired` (explicit, not "rolled back"); volunteer notified + freed; volunteer may re-apply to the same project later (active-application uniqueness is partial — see schema note) |

(The prior row covering the GitHub-link-not-yet-done case was removed open-item-4 2026-05-27 — apply-time GitHub gate per REQ-007 makes the post-acceptance race impossible.)

**Kickoff sequence on `matched_pending_fuel` → `in_progress`** (one transition fires multiple parallel side effects):

1. **Virtual keys minted** (REQ-009, decision-21): a `virtual_keys` row per (volunteer, project) is written in the kickoff transaction — no external call, no failure mode, no wait. The volunteer dashboard shows the key (once) + the two env vars (`ANTHROPIC_BASE_URL` + key) immediately.
2. **Linear workspace assigned from the pool — API-only, no human in the loop** (REQ-026, decision-20 pool amendment): next `ready` pool workspace renamed to the project (`organizationUpdate`), team key set, volunteer invited, decomposition queued. If the pool is empty: `external_dependency` blocker + urgent `linear_pool_replenish` ops_task (the concierge pre-creates workspaces in batch because creation has no public API).
3. **GitHub repo**:
   - **v1 (Track A only — `lovable_recommended` always true, decision-19):** ai4good does **not** create the repo at kickoff. It auto-raises the `lovable_setup_pending` blocker (REQ-024); NGO + volunteer collaborate via the 11-step checklist in REQ-021 (NGO steps 1-4, volunteer steps 5-9, ai4good auto-validates 10-11); the blocker resolves when the GitHub repo URL + MCP last_seen_at validate, landing the repo in `ai4good-projects/<slug>`. **No platform-admin involvement.** `lovable_enabled` flips on blocker resolution. Repo URL is required before handoff per REQ-012 hard precondition.
   - *(Reserved, post-v1: the Claude-Code-only programmatic-repo path — `lovable_recommended = false` / `lovable_skipped_at` set, ai4good auto-creates `ai4good-projects/<slug>` with README + CLAUDE.md + MIT LICENSE seeded — is the Track-B path deferred by decision-19; plumbing kept, never taken in v1.)*
4. **Task backlog decomposed** from Discovery output → coordinator review → pushed to the project's Linear workspace via API (REQ-026); the Postgres projection fills via webhooks. Follows the pool assignment in step 2.
5. **Project comment thread** initialized (REQ-015); "Project funded and live" activity-feed event fires via `notify()` (REQ-016) — decision-15, no chat channel.
6. **Volunteer notified** via email + in-app: "Project live. Your gateway key is ready now (env-var setup on your dashboard). The Linear backlog arrives once the coordinator pushes the decomposition. (Lovable workspace invitation comes from the NGO separately.)"

**Provisioning failure handling:** if any of the above fails mid-sequence, project stays in `in_progress` (no `provisioning` sub-state; failures surface as blockers or the pending ops task). The volunteer is gated from work on whichever resource is pending (e.g., no backlog to pull until pool assignment + decomposition push complete — pool-empty is the only workspace stall mode; the Lovable invite comes from the NGO, outside ai4good). This avoids state-machine bloat while keeping the operational status visible via REQ-024 blockers — codex round 2 #6 resolved this way rather than adding a new state.

**Notes on race conditions handled in the table:**
- **NGO double-acceptance** (accepting multiple applications): use `UPDATE projects SET assigned_volunteer_id = X WHERE id = Y AND assigned_volunteer_id IS NULL`; only first succeeds; others get 409.
- **Payment webhook vs 7-day expiry job**: idempotent — webhook check sets `in_progress` only if status is still `matched_pending_fuel`; expiry job checks `NOT EXISTS (SELECT FROM fuel_transactions WHERE …)`.
- **Provisioning partial-success retry**: each side-effect task is idempotent and can be retried individually without re-running the whole kickoff.

---

#### REQ-005: Scope Document & Project Publishing

**Description:** Discovery output is rendered as an editable scope document. NGO can edit, save, and publish. Publishing does **not** require pre-funded fuel — fuel is required only at volunteer-acceptance time (see REQ-006). This match-first / fund-on-kickoff model minimizes NGO friction. **Publishing does require passing platform triage (REQ-023)** — projects move from `scoped` to `triage` on submit, and from `triage` to `open` only after admin approval.

**Acceptance Criteria:**
- [ ] Scope doc has editable sections (markdown editor): summary, user stories, acceptance criteria, suggested stack. **No fuel budget section** — v1 doesn't produce dollar estimates (REQ-004); NGO chooses fuel amount at match acceptance (REQ-006).
- [ ] **Repo visibility choice (Platform Promise §2):** NGO selects `visibility` on the scope doc editor — default `public_mit`, opt-in to `private` with required `visibility_justification` text (≥30 characters, NGO explains the legitimate confidentiality need — e.g. "handles beneficiary PII", "internal HR data"). Triage (REQ-023) reviews and confirms the justification at publish time. Switching from `private` back to `public_mit` is allowed pre-`in_progress`; switching after kickoff requires admin support since commits already exist.
- [ ] On Discovery completion, project transitions to status `scoped` (free to remain in this state indefinitely).
- [ ] Scope doc shows the qualitative complexity tier (`small` / `medium` / `large`) — no dollar figure. NGO chooses fuel amount themselves at match-acceptance time (REQ-006).
- [ ] Publishing requires `verified` NGO status (v1 has no `kyc_verified` tier — deferred to v1.5 per §11). **No fuel deposit required at publish.**
- [ ] On "Publish" click, project transitions to `triage` (NOT directly to `open`) — see REQ-023.
- [ ] Published-and-approved projects appear on `/marketplace` with status `open`.
- [ ] NGO can unpublish (revert to `scoped` — the REQ-005.5 `open → scoped` transition) at any time prior to volunteer acceptance. *(Decision-17: there is no `paused` state in v1; unpublish-to-revise IS the revert.)*
- [ ] If triage rejects with `changes_requested`, project returns to `scoped` with reviewer comments visible; NGO edits and re-submits.

**Dependencies:** REQ-004, REQ-023.

---

#### REQ-006: Stripe Fuel Top-Up & Ledger (NGO + volunteer both consume; funding allowed anytime from `draft` onward)

**Description:** NGOs purchase fuel via Stripe Checkout; the platform records the gross amount as a single top-up row and credits the full amount to the project (skim is recognized at consumption time per Option γ — REQ-009 — not at top-up). **Decision-8 (2026-06-04): the "funded only at volunteer acceptance" rule is dropped.** Fuel can be funded on a project at **any point from `draft` onward**, and is **consumed by two parties**: the **NGO** during Discovery (the AI Discovery Agent draws on fuel once the NGO's daily free Discovery allowance is used up for the day, or immediately if the project is already funded — decision-11 routing; REQ-002/004) and the **volunteer** during build (Claude Code via Anthropic API — REQ-009). The two consumption flows write the same shape of ledger row (kind `consumption` for build, kind `discovery_consumption` for Discovery); both pay the standard 15% skim at consumption time. Match acceptance remains the most common *first* funding moment, but it is no longer the only one.

**Two funding moments (either may be first; decision-8):**

1. **Discovery funding (optional, pre-publish — the "expedite" path):** the NGO's daily free Discovery allowance (REQ-002, `ngos.discovery_credits_remaining`, 10/day unverified / 30/day verified — decision-11) is used up for the day. The composer surfaces a *"Fund this project's fuel to keep going now"* CTA (alongside *"or come back tomorrow for more free credits"*) — clicking fund opens the same project-scoped Stripe Checkout flow used at match. Funded fuel (real-$, 15% skim) now sits on a `draft` or `discovery_in_progress` project; the Discovery Agent draws on it until either Discovery completes (state advances to `scoped`) or the NGO stops. **This is the credits→dollars boundary (decision-11): free Discovery runs on the daily credit allowance; everything from funded fuel onward is $-based. Funding lets the NGO continue immediately instead of waiting for tomorrow's free refill — it does not make Discovery faster per message.**
2. **Match funding (the historical default):** the NGO accepts a volunteer's application → project status → `matched_pending_fuel`; the kickoff funding modal appears with the volunteer's name pre-filled. This remains the typical first money moment for projects that complete Discovery within the daily free allowance.

In both cases the same Stripe Checkout flow is used (one-off session, no subscription), the same $50 minimum applies (decision-8: kept uniform — any NGO funding $50 mid-Discovery has $50 ready for the build, returns to general balance via `credit_release` if abandoned), and the same first-fund cap protects new funders.

**Match-to-fund flow (the most common path):**
1. NGO accepts a volunteer application → project status → `matched_pending_fuel`.
2. **Acknowledgment gate:** Before NGO sees the "Fund this project" CTA, an acknowledgment modal appears restating the key clauses in plain language, with the volunteer's name pre-filled:
   > *"You're about to fund the kickoff of `<project-title>` with `<volunteer-handle>`. Remember: ai4good is a coordination layer — neither we nor the volunteer are obligated to deliver a finished tool (governed by our Terms of Service). Fuel funds AI compute and AI tools may consume it without producing a viable deliverable. **Fuel is non-cash credit — it powers AI work, isn't cash-refundable, and unused fuel stays as credit for your projects or can be donated (Platform Promise §7).** This project is classified `<data_sensitivity tier>`; **you are responsible for the data you put into the tool** — for sensitive (Tier-2) data the volunteer builds against synthetic fixtures and you connect real data yourself after handoff (REQ-004). The amount you choose is your hard maximum exposure for this stage. [ ] I understand. Proceed to funding."*
   - Acknowledgment is recorded per-match (not per-top-up) in `audit_events` with timestamp + IP.
   - The same modal also reminds NGO to set up their Lovable workspace if `suggestedLovable.needed = true` (REQ-021's pre-kickoff banner is hosted in this modal).
3. After acknowledgment, NGO sees the "Fund this project to confirm the match" screen. **NGO chooses the initial *kickoff fuel* themselves** — no pre-filled estimate from Discovery; the qualitative complexity tier (small / medium / large) is shown for context only. The screen explicitly recommends starting small with stepwise top-ups:
   > *"Start small. Most projects succeed with stepwise funding — a kickoff deposit covers the first wave of work, you'll review concrete progress (commits + completed PM tasks), then top up if you're happy with what you see. Larger upfront deposits aren't necessary and aren't recommended."*
   Minimum $50; presets at **$50 / $100 / $200 / $500 / custom**. Default selection: $50 (the minimum, encouraging stepwise).
   **First-fund cap (decided 2026-06-03 — Item 3 fraud bound):** a *new* funder (NGO with no prior handed-off project) is capped at a conservative per-project deposit (default **$200**, `platform_settings.first_fund_cap_cents`) and a per-day total; the cap **rises with completed-project history** (progressive trust). This bounds any single fraud/chargeback incident to ~one cap's worth of compute — the dominant lever (a leaked/stolen-card key only ever buys *compute*, never cash, since there's no cash-out). Funding screen states fuel is non-cash credit (Platform Promise §7).
4. NGO has 7 calendar days to complete a Stripe Checkout for at least the minimum.
5. On successful payment → project status → `in_progress`, repo created (REQ-008), volunteer notified, AI key provisioned (REQ-009).
6. If 7 days pass without funding → project status reverts to `open`, volunteer is notified and freed to apply elsewhere, NGO sees a re-fund prompt.

**Acknowledgment cadence (Option D — updated 2026-06-04 for decision-8):**
- **At signup** (Story 1): Full disclaimer acceptance — blocks account from project creation until acknowledged.
- **At the NGO's *first* fuel funding on a project — whichever comes first** (this REQ): per-project hard acknowledgment of Clauses 3 + 4 (fuel ≠ deliverable; no SLA) + fuel-is-non-cash-credit (§7) + data-responsibility for the project's `data_sensitivity` tier (REQ-004/023). This is the real commitment moment — money + scope + (eventually) volunteer converge here. Under decision-8 the first funding may be a **Discovery top-up** (pre-match) OR a **match-acceptance top-up** — either fires the hard ack on the project. If the first funding is a Discovery top-up, the volunteer name is not yet pinned; the modal still names the project and the per-project cap. The first match acceptance still fires its own per-match acknowledgment with the volunteer name pre-filled (the "you and this person" moment) — both acks are recorded in `audit_events` and a single ack is never reused across the two moments. *Pre-2026-06-04 behavior was "hard ack at every match acceptance only" — now generalized to "hard ack at first project funding AND first match acceptance," so an NGO who funds Discovery first lands the funding ack first, then the match ack at match.*
- **At every subsequent top-up** (this REQ): Passive footer link only; no hard checkbox. Subsequent top-ups are typically "refill, project going well" — the hard checkbox there would feel out-of-tone.

**Acceptance Criteria:**
- [ ] One-time Stripe Checkout sessions (no subscription) for amounts in **$50 / $100 / $200 / $500 / custom** presets (smaller default presets to encourage stepwise funding per Platform Promise §6).
- [ ] The `stripe-webhook` Supabase Edge Function (Deno) on `checkout.session.completed` creates **a single `fuel_transactions` row** for the top-up — no skim split at top-up time:
  - Row: `kind='topup'`, `amount_micro_cents = +gross_micro_cents` (full amount the NGO paid, converted to micro-cents), `project_id = X`, `stripe_event_id = evt_...`
  - Project balance = `SUM(amount_micro_cents WHERE project_id = X)` — fully reflects the gross amount the NGO paid (so a $100 top-up shows as $100 of fuel on the project page, not $85). Display rounds to cents.
  - **Skim is not taken at top-up.** Platform revenue is recognized at **consumption** time (see REQ-009 fuel ingestion). This matters: if a project never consumes fuel (volunteer ghosts, NGO cancels before kickoff), the full balance remains as the NGO's non-cash redeployable credit and the platform has earned $0 — aligned with Platform Promise §3 (fuel funds AI usage, not deliverables) + §7 (non-cash credit).
- [ ] **Gross** amount (full NGO payment, no skim deduction at top-up time per Option γ) is added to the specified project's balance — or to NGO's general balance if NGO chose a non-project top-up at Checkout. Skim is recognized at consumption time per REQ-009, not at this step (codex round 6 nit fix).
- [ ] Skim percent is set at the platform level (`platform_settings.skim_percent_bps`, default 1500 = 15%) and stored on each **consumption row's** `skim_rate_bps` field (so rate-card changes don't retroactively change historical accounting).
- [ ] Ledger is **single-entry with paired-row convention** (not full double-entry; that's a v1.5 upgrade). Every movement (top-up, consumption + skim pair, **discovery_consumption + skim pair**, credit_release pair, donation pair, allocation [v1.5], chargeback + chargeback_writeoff, goodwill_refund, reconciliation_adjustment) is one or more rows in `fuel_transactions`. Project balance = `SUM(amount_micro_cents WHERE project_id = X)`. Platform skim revenue = `SUM(amount_micro_cents WHERE project_id IS NULL AND kind = 'skim')`. NGO general balance = `SUM(amount_micro_cents WHERE ngo_id = N AND project_id IS NULL AND kind IN ('credit_release','donation','allocation'))`.
- [ ] **`discovery_consumption` row shape (decision-8, 2026-06-04):** when the Discovery Agent draws on funded fuel (after the free pool is exhausted), the consumption writer (same shape as REQ-009 build consumption) writes a paired row set: `kind='discovery_consumption'`, `project_id=X`, `amount_micro_cents=−fuel_debit`, plus a `kind='skim'` row at `project_id=NULL` for the standard 15% margin — same row shape as build `consumption`, just a different `kind` label so we can attribute Anthropic spend back to Discovery vs build in dashboards. The balance control total treats `discovery_consumption` identically to `consumption` (both reduce project balance).
- [ ] **Discovery cost routing — "Funded → all-$" (decision-11 routing amendment, 2026-06-06):** the Discovery Agent's per-turn cost source is decided by the *project's* fuel balance, not the NGO's. A project with a **positive fuel balance** has its Discovery turns debited as `discovery_consumption` (above), full stop — the NGO's free `discovery_credits_remaining` is **not** consulted or decremented for a funded project. Only an **unfunded** project (zero fuel balance) draws the NGO's free Discovery credits (REQ-004). Consequence: once any fuel sits on a project, that project is dollar-metered end-to-end (Discovery + build, 15% skim); the NGO's free credit pool (NGO-bound) is reserved for its other, still-unfunded projects (fuel is project-bound). This makes the credit→dollar transition automatic at the moment of funding, rather than only at credit exhaustion.
- [ ] **Paired-row integrity invariant (decided 2026-06-03 — codex review hardening; control-total formula corrected 2026-06-04):** every multi-row movement shares a `pair_id`; rows for a `pair_id` are written in **one transaction** and **must sum to zero** (a release/donation/allocation moves value between buckets without creating or destroying it). A **pg_cron nightly schedule → `control-total` Supabase Edge Function (Deno)** verifies two global invariants and **pages** on drift; job_runs heartbeat ('control_total'):
  - **(1) Balance control total** (user-held funds): `Σ(topup) − Σ(consumption) − Σ(discovery_consumption) − Σ(chargeback) − Σ(donation_out) == Σ(live project balances + general balances)`. The `credit_release` and `allocation` pairs move value *between* the project and general buckets that both sit on the right-hand side, so they net out and need no term. **`chargeback` MUST be subtracted** — a dispute clawback reverses the *unconsumed* portion of a top-up, reducing a project balance; omitting it (the pre-2026-06-04 formula did) would page the job on every legitimate dispute. **`chargeback_writeoff` and `goodwill_refund` are NOT in this total** — they book the consumed-compute loss / admin refund **against platform revenue** (`project_id IS NULL`), which is not a user balance, so they belong to (2), not (1). (The earlier formula wrongly subtracted them here.)
  - **(2) Revenue control total** (platform margin): `Σ(skim) − Σ(chargeback_writeoff) − Σ(goodwill_refund) == net platform margin`, with the per-row identity `skim = fuel_debit − anthropic_cost` where `Σ(fuel_debit) = −Σ((consumption ∪ discovery_consumption).amount_micro_cents)` and `Σ(anthropic_cost) = Σ((consumption ∪ discovery_consumption).anthropic_micro_cents)` — both consumption kinds carry the same per-row identity (column names per REQ-009; `fuel_debit`/`anthropic_cost` are derived quantities, not columns).
  This gives independent control totals the per-balance SUMs lack. **Full double-entry (separate `accounts` + `ledger_entries`) is the v1.5 accounting upgrade** once a certified accountant defines the chart of accounts.
- [ ] **All amounts stored as INTEGER `amount_micro_cents BIGINT`** (1 micro-cent = 1/1000 of a cent). Display rounds to cents. Sub-cent precision required for small Anthropic Usage Report buckets (some 1-min buckets cost <1¢). Rounding-bias risk addressed by storing at micro-cent granularity; display-time rounding is one-way and never persisted.
- [ ] Idempotency keys used on Stripe API calls.
- [ ] **pg_cron schedule → `match-expiry` Supabase Edge Function (Deno)** (or a pg_cron DB-only transition): any `matched_pending_fuel` project older than 7 days → revert to `open` + call notify() to both parties; job_runs heartbeat ('match_expiry'). *(Decision-17: no `paused` state in v1, so the job needs no freeze-clock guard — it acts on every `matched_pending_fuel` project by status alone.)*

**Unused fuel: non-cash credit, stays-on-project (decided 2026-06-03 — Item 3; replaces the prior cash-refund retention flow):**

- [ ] **Fuel is non-cash, project-scoped credit. There is NO cash-out / withdrawal in v1.** This deliberately removes the only money-out path — eliminating laundering risk and the Stripe Treasury/ACH/AML/payee-KYC machinery entirely (Open Issue §11 #2 mostly dissolves; only the chargeback half survives).
- [ ] **Leftover fuel stays on the project**, and **survives a volunteer change** — if a volunteer leaves mid-project the project re-opens (REQ-027) and the remaining balance is used by the next volunteer. No ledger movement needed in this common case; the project balance is simply preserved.
- [ ] **Only when a project is genuinely finished (`handed_off`) or abandoned (`cancelled`)** is leftover credit released to the NGO's **general balance** via two paired rows:
  - Row 1: `kind='credit_release', amount_micro_cents = -remaining_balance, project_id = X, pair_id = uuid_v` — zeroes the project balance
  - Row 2: `kind='credit_release', amount_micro_cents = +remaining_balance, ngo_id = N, project_id = NULL, pair_id = uuid_v` — credits NGO general balance (non-cash credit; no decay clock — credit persists, never silently removed)
- [ ] **What the NGO can do with general-balance credit:**
  - **Keep** — it persists as redeployable platform credit (default; nothing taken, no clock)
  - **Donate to ai4good** — one-click; writes `kind='donation'` row debiting NGO balance + a paired credit to the platform donation account. **Tax-deductible** given ai4good's nonprofit status (§11 / Open Issue #8 = nonprofit path).
  - **(v1.5) Move to another project** — `kind='allocation'` from general balance to a new project. Move-funds-between-projects is on the v1.5 roadmap.
- [ ] **No cash refund option, no decay/retention clock, no silent auto-renew** (the prior escheatment-risky mechanic is removed). The funding screen discloses upfront: *"Fuel powers AI work and is not cash-refundable; unused fuel stays as credit for your projects or can be donated."*
- [ ] **(Optional, admin-only) goodwill refund:** out of band, a platform admin MAY issue an original-charge Stripe refund within Stripe's 180-day window for a genuinely-wronged NGO (writes a `goodwill_refund` row). This is a manual, rare, audited exception — not a user-facing feature, not a cash-out path.
- [ ] NGO dashboard shows general balance as "$X redeployable credit" (no expiry date, since it never expires or is removed).

**Auto-top-up (DEFERRED TO v1.5 per §11):**

v1 ships **manual top-up only.** When the `fuel_topup_needed` blocker fires (warning at 20%, blocking at 0%), the NGO is notified and tops up via Stripe Checkout from the project page. v1 does not auto-charge a saved payment method off-session.

**Why deferred:** Off-session Stripe charging adds meaningful complexity: Setup Intent capture flow, off-session payment intent handling, SCA challenge management, dispute/chargeback flow after consumed AI spend, per-project consent acknowledgment modal, cap enforcement state machine, payment failure → disable → notify recovery flow. Per codex round 3 operational realism finding, this is a v1.5 feature that lands after we've seen real fuel-low patterns in pilot and confirmed NGOs actually want it. The fuel-low blocker + email notification (REQ-024 + REQ-016) drives the manual top-up reliably enough for v1.

**v1.5 acceptance criteria (when built):** opt-in per project; trigger threshold + topup amount + hard lifetime cap configurable; consent + cap acknowledgment modal; Setup Intent for payment method; off-session charge on blocker fire; failure → disable + urgent notify; one active policy per project (unique partial index); audit trail of policy enable/disable + each auto-charge event.

**Chargeback handling + reserve (decided 2026-06-03 — Item 3):**

- [ ] **`charge.dispute.created` webhook handler:** on a Stripe dispute, immediately (a) set the NGO to a frozen state (no new funding/matching), (b) deactivate the disputed project's Anthropic key via Admin API, (c) write a `chargeback` row (`amount_micro_cents = −remaining_unconsumed_project_balance`, `project_id = X` — zeroes the project balance) plus a paired `chargeback_writeoff` row (`amount_micro_cents = −consumed_portion`, `project_id = NULL` — books the irreversible consumed-compute Anthropic cost against platform revenue) — so the loss never drives a project balance negative, (d) create a `chargeback_review` ops_task. Submit the audit-logged acknowledgment (timestamp+IP+SHA) as Stripe dispute evidence — this is exactly what wins friendly-fraud disputes.
- [ ] **Why the loss is bounded:** with no cash-out path (§7), a fraudster only ever obtains *compute*, capped per incident by the first-fund cap + rapid key-deactivation. The reserve only needs to cover *residual consumed-compute chargebacks*.
- [ ] **Reserve:** capitalize a small chargeback reserve (`platform_settings.reserve_floor_cents`, year-1 scale ~$5–10k). The `cash_buffer_alert` ops_task (REQ-030 / Observability) fires when liabilities-vs-coverage dips below the floor. Reserve sizing revisited once real loss rates are observed.
- [ ] **Detective fraud signals (not preventive in v1):** persist a payment fingerprint at funding; deny a previously-flagged fingerprint from re-funding; a `collusion_review` ops_task is raised on shared payment/device/IP/GitHub-email-domain between an NGO and its matched volunteer. Full anti-Sybil program is v1.5.

**Technical Specification:**
```sql
CREATE TABLE fuel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID NOT NULL REFERENCES ngos(id),
  project_id UUID REFERENCES projects(id),  -- NULL for platform-revenue (skim) rows
  kind TEXT NOT NULL CHECK (kind IN (
    'topup','consumption','skim',
    'discovery_consumption',    -- decision-8 (2026-06-04): NGO-side AI Agent draws on funded fuel — Discovery
                                -- (after the daily free credits are used up, or immediately on a funded project)
                                -- AND the post-Discovery project assistant (REQ-033, decision-12). Same row shape
                                -- as 'consumption' (project_id=X, amount=-fuel_debit, paired skim row); separate
                                -- label so dashboards can split NGO-side AI vs volunteer-build Anthropic spend.
    'credit_release',           -- leftover project fuel → NGO general balance (non-cash), paired
    'donation',                 -- general balance → platform donation account (tax-deductible), paired
    'allocation',               -- general balance → another project (v1.5 move-funds), paired
    'chargeback',               -- Stripe dispute clawed back a topup; reverses the topup
    'chargeback_writeoff',      -- consumed-compute loss on a chargeback, booked against platform revenue
    'goodwill_refund',          -- rare admin original-charge Stripe refund within 180d (audited exception)
    'reconciliation_adjustment' -- admin money-correction rows (REQ-030); the daily Cost-Report drift job is deleted (decision-21 — the gateway meters inline from response usage)
  )),
  -- 'refund_cashout' removed 2026-06-03 — no cash-out path in v1 (Item 3 decision)
  -- All amounts stored as INTEGER micro-cents (1/1000 of a cent) for sub-cent precision on
  -- small 1-min Anthropic usage buckets. Display rounds to cents.
  amount_micro_cents BIGINT NOT NULL,        -- signed; the fuel-side amount
  -- For consumption rows (skim-at-consumption model, Option γ):
  anthropic_micro_cents BIGINT,              -- actual Anthropic cost (what ai4good owes Anthropic)
  skim_rate_bps INTEGER,                     -- skim rate applied at consumption (basis points; 1500 = 15%)
  pair_id UUID,                              -- links a consumption row to its matching skim row
  -- Gateway response usage dimensions (for audit + rate-card recompute if the rate card changes retroactively):
  anthropic_model TEXT,                      -- e.g. 'claude-sonnet-4-6'
  anthropic_context_window TEXT,             -- e.g. '200k', '1m'
  anthropic_service_tier TEXT,               -- 'standard' / 'batch' / 'priority'
  usage_bucket_start TIMESTAMPTZ,            -- request timestamp (column name retained; per-request granularity since decision-21)
  gateway_request_id TEXT,                   -- decision-21: one ledger write per gateway request (idempotency key)
  task_ref TEXT,                             -- decision-22 / REQ-034: Linear identifier | 'exploration' | 'onboarding' | NULL = unattributed
  stripe_event_id TEXT UNIQUE,               -- idempotency for topup/chargeback/goodwill_refund; NULL for consumption/skim/release/donation
  -- decay_eligible_at removed 2026-06-03 — non-cash credit has no retention/decay clock (Item 3); credit persists, never silently removed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_fuel_tx_ngo ON fuel_transactions(ngo_id);
CREATE INDEX idx_fuel_tx_project ON fuel_transactions(project_id);

-- Idempotent paired-row guard (decision-21 — ledger invariant). One ledger write per gateway request;
-- a retried/replayed request cannot double-charge.
CREATE UNIQUE INDEX idx_fuel_consumption_request_once
  ON fuel_transactions(gateway_request_id)
  WHERE kind = 'consumption' AND gateway_request_id IS NOT NULL;

-- (usage_poll_state table DELETED by decision-21 — no poller; the gateway meters inline per request.)

-- Gateway virtual keys (REQ-009, decision-21): one per (volunteer, project). Plaintext `a4g_*` key is
-- shown ONCE at issuance; hash-only at rest. Revocation = one row update. All project keys terminate
-- at handoff (REQ-012), abandonment release (REQ-027), and AUP suspension (REQ-007).
CREATE TABLE virtual_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES profiles(id),
  key_hash TEXT NOT NULL UNIQUE,                   -- bcrypt of the a4g_* key; raw key never stored, never logged
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  caps JSONB NOT NULL DEFAULT '{}',                -- per-request max tokens + rolling-24h window (values = open decision; sized 3-4x a heavy human day)
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT
);
CREATE INDEX idx_virtual_keys_active ON virtual_keys(project_id) WHERE revoked_at IS NULL;

-- Linear workspace pool (REQ-026, decision-20 pool amendment): workspaces are pre-created in batch
-- (creation has no public API); kickoff assigns the next ready row via API (organizationUpdate rename,
-- team key, invite, decomposition). Secrets (workspace API key, webhook secret) live in Vault; this
-- table holds references only.
CREATE TABLE linear_workspace_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linear_workspace_id TEXT NOT NULL UNIQUE,
  url_key TEXT NOT NULL,                            -- current urlKey (Linear redirects prior keys after rename)
  api_key_vault_ref TEXT NOT NULL,
  webhook_secret_vault_ref TEXT NOT NULL,
  github_integration_connected BOOLEAN NOT NULL DEFAULT false,  -- pre-connected to ai4good-projects, all repositories
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','assigned','retired')),
  assigned_project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ
);
CREATE INDEX idx_linear_pool_ready ON linear_workspace_pool(created_at) WHERE status = 'ready';

-- Transactional outbox (decided 2026-06-03 — REQ-007 AUP saga, kickoff, expiry, abandonment all depend on it).
-- State-changing transactions enqueue side-effect rows in the SAME transaction; a worker drains with retry/backoff.
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,                    -- 'project' | 'profile' | 'fuel' | ...
  aggregate_id UUID,
  event_type TEXT NOT NULL,                        -- 'revoke_repo_collab' | 'revoke_virtual_keys' | 'remove_org_member' | 'remove_linear_membership' | 'release_assigned_issues' | 'expire_match' | 'release_project' ... (handler names updated by decisions 20/21)
  payload JSONB NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,            -- (aggregate_id + event_type + target) — re-enqueue is a no-op; already-done targets short-circuit
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','failed_dlq')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_outbox_due ON outbox_events(next_attempt_at) WHERE status IN ('pending','in_progress');
-- pg_cron (~1m) → `outbox-drain` Supabase Edge Function (Deno): SELECT ... FOR UPDATE SKIP LOCKED; idempotent handlers; terminal failures → status='failed_dlq'; job_runs heartbeat ('outbox_drain') + an `incident` ops_task (DLQ).

-- Scheduled-job heartbeats (decided 2026-06-03 — REQ-029 observability). Every cron records start/finish;
-- an overdue-run pager fires if a job hasn't completed within expected_interval_seconds.
CREATE TABLE job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,                          -- 'match_expiry' | 'inactivity' | 'aging_cadence' | 'aging_open_nudge' | 'outbox_drain' | 'base_permission_assert' | 'jumpstart_health_check' | 'tree_snapshot' | 'control_total' ... ('usage_poll' / 'daily_reconciliation' / 'nightly_anomaly' deleted — decisions 14/21)
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
  expected_interval_seconds INTEGER,               -- pager fires if no successful run within this window
  rows_processed INTEGER,
  error TEXT
);
CREATE INDEX idx_job_runs_name_time ON job_runs(job_name, started_at DESC);

-- Unified ops tasks queue (admin work items; minimizes context-switching by batching)
-- Used by: linear_pool_replenish, ngo_verification_review, anomaly_investigation (reserved),
--          cash_buffer_alert, chargeback_review, collusion_review, content_abuse_review, incident
-- (kyc_review_manual removed from v1 enum — KYC tier deferred to v1.5 per §11; type added back when REQ-002 KYC tier ships)
-- (anthropic_key_creation / anthropic_key_rotation_recreation / raise_spend_limit /
--  anthropic_provisioning_failure / reconciliation_discrepancy DELETED by decision-21 — no manual key
--  ops, no Console caps, no Cost-Report reconciliation; virtual keys mint/revoke as row writes)
-- Triage (REQ-023) stays in projects table fields — deeply integrated state, not a free-floating task.
CREATE TABLE ops_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'linear_pool_replenish',   -- batch pool top-up (REQ-026, decision-20 pool amendment): pre-create workspaces + keys + webhooks + GitHub integration; fires at watermark, urgent when a kickoff finds the pool empty (workspace creation has no public API)
    'ngo_verification_review',
    'anomaly_investigation',   -- v1.5 (decision-14): anomaly engine deferred; enum reserved, not raised in v1
    'cash_buffer_alert',
    'chargeback_review',           -- Stripe charge.dispute.created → freeze NGO + deactivate key + review (REQ-006 Item 3)
    'collusion_review',            -- shared payment/device/IP/GitHub-domain between NGO + volunteer (REQ-009 fraud, detective)
    'content_abuse_review',        -- a Report on a repo/Discovery/channel (REQ-031 moderation)
    'incident'                     -- generic incident commander entry (REQ-030 ops/incident-response)
    -- 'ngo_refund_request' removed 2026-06-03 — no cash-out path in v1 (Item 3)
    -- (lovable_github_setup removed open-item-4 2026-05-26 — Lovable setup is now volunteer-driven)
  )),
  payload JSONB NOT NULL,                          -- type-specific data
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','in_progress','completed','dismissed','auto_resolved'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low','medium','high','urgent'
  )),
  sla_target_at TIMESTAMPTZ,                       -- when SLA expires (e.g. 48h for a watermark linear_pool_replenish; 12h when urgent)
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  related_project_id UUID REFERENCES projects(id),
  related_ngo_id UUID REFERENCES ngos(id)
);

CREATE INDEX idx_ops_tasks_pending_priority ON ops_tasks(priority, sla_target_at)
  WHERE status = 'pending';
CREATE INDEX idx_ops_tasks_aging ON ops_tasks(sla_target_at)
  WHERE status = 'pending' AND sla_target_at IS NOT NULL;
CREATE INDEX idx_ops_tasks_project ON ops_tasks(related_project_id);

-- (auto_topup_policies table removed from v1 schema — auto-top-up is deferred to v1.5 per §11; table will be added when v1.5 work begins)
```

**Dependencies:** REQ-001, REQ-002.

---

#### REQ-007: Volunteer Profile & Marketplace

**Description:** Volunteers sign up (preferably via GitHub OAuth), build a profile, and can browse + apply to open projects.

**Acceptance Criteria:**
- [ ] **Volunteer signs up via GitHub OAuth, Google OAuth, or email/password** (REQ-001). Profile fields work without GitHub; GitHub link can be added later.
- [ ] If GitHub linked at signup: profile auto-populates with top languages, public repo count, contribution-graph summary. If not: those fields are empty / hidden until volunteer links GitHub.
- [ ] Volunteer manually adds skills (tag list), causes of interest, hours/week availability, optional bio.
- [ ] **GitHub link required at application time** (open-item-4 redesign — moved earlier than the previous accept-time gate): when volunteer clicks "Apply" on any project, if `github_handle IS NULL`, a modal blocks application: *"Link GitHub to apply"* with one-click OAuth flow. On successful link, ai4good adds volunteer to `ai4good-projects` org (per the next AC) and proceeds with application submission in the same flow. Browsing the marketplace + building skill/cause/hours profile + viewing project details remain available without GitHub. By the time an application exists in the system, the volunteer is fully ready for NGO-acceptance + kickoff — no `pending_github_link` substate needed.
- [ ] **On GitHub link (either at signup or later), ai4good automatically adds the volunteer as a `Member` of `ai4good-projects` org** (codex round 6 + open-item-4 redesign — moves repo-creation permission from JIT-per-project to one-time-at-onboarding). Membership grants the volunteer `Repository creator` rights via org base permissions (REQ-008 one-time setup) so they can later target `ai4good-projects` from Lovable when activating Lovable projects (REQ-021), or from Claude Code directly. Membership is recorded in `volunteer_profiles.ai4good_projects_org_added_at`; logged in `audit_events` for reconciliation.
- [ ] **Removal from `ai4good-projects` org membership** behavior depends on cause (codex round 7 critical — AUP suspension must be aggressive to protect NGO data):
  - **(a) Voluntary account deactivation**: removal calls GitHub Org API `DELETE /orgs/ai4good-projects/memberships/{username}`; records `volunteer_profiles.ai4good_projects_org_removed_at` with reason `deactivation`. Repo collaborator grants on active projects are LEFT intact (volunteer may complete in-flight work) — per-project handoff handles cleanup per REQ-008.
  - **(b) Platform-admin AUP suspension**: implemented as an **idempotent saga** rather than an atomic operation, since external services (GitHub / Anthropic / Lovable) make true atomicity impossible (codex round 8 fix). Sequence:
    - **Step 1 (in one DB transaction, immediate):** flip `profiles.account_status = 'suspended'`, `profiles.suspended_at = NOW()`, `profiles.suspended_by = <admin_id>` (codex round 9 fix — was missing the admin attribution), `profiles.suspend_reason = '<text>'`; **enqueue outbox rows for steps 2-4 in the same transaction** (codex round 9 sprint-hardening — prevents the "suspended but no revocation jobs queued" race) — outbox rows have idempotency keys on `(user_id, target_kind, target_id, action)` so re-suspension is a no-op for already-revoked targets. Mutation middleware in REQ-026/REQ-001 checks `account_status` on every API/MCP/UI write and rejects with 403 if suspended — denies subsequent writes; for safety against in-flight writes that already passed middleware, the same `account_status='suspended'` check is enforced via Supabase RLS on all write-capable tables (defense in depth).
    - **Step 2 (queued, retryable):** for each `assigned_volunteer_id = this_user AND projects.status IN ('in_progress','matched_pending_fuel','handoff_pending')` (decision-17: no `paused` state in v1): (i) revoke volunteer's repo collaborator grant via GitHub repo API, (ii) revoke the project's virtual keys (REQ-009, decision-21 — a row update, instant), (ii-b) remove Linear workspace membership (REQ-026), (iii) post NGO-facing notice on the project channel + raise `awaiting_ngo_review` blocker asking NGO to remove the volunteer from their Lovable workspace (Lovable workspace admin = NGO; ai4good cannot revoke Lovable seats directly).
    - **Step 3 (queued, retryable):** revoke **all** active `project_api_tokens` rows touching this user — query: `actor_id = this_user OR (actor_role = 'workspace' AND project_id IN (this_user's active projects))` (codex round 8 fix — workspace tokens have `actor_id = NULL` so the prior `actor_id = this_user` filter alone missed them; now we also revoke workspace tokens of active projects since the suspended volunteer might still have the token cached). Mark `revoked_at = NOW()`, `revoke_reason = 'aup_suspension'`.
    - **Step 4 (queued, retryable):** remove org membership from `ai4good-projects` via GitHub Org API; record `volunteer_profiles.ai4good_projects_org_removed_at` + reason `aup_violation`.
    - All steps are idempotent and retried by an outbox-pattern worker until success; failures surface in admin queue. Each call is logged in `audit_events` for forensic review.
    - **Reversal:** platform admin re-enables (`account_status = 'active'`); collaborator/token/Anthropic-key/membership rebuilds happen lazily per-project as the volunteer re-engages — not auto-rebuilt for safety (admin must approve each project's resumption).
  - **(c) 24-month inactivity** (yearly maintenance job): soft removal, same as (a) — repo collaborator grants on active projects (rare for inactive volunteers) left intact.
- [ ] Volunteer dashboard shows GitHub status: "Linked as `@<handle>`" or "Not linked — link now to apply to any project."
- [ ] `/marketplace` lists open projects with: title, summary, complexity tier (from Discovery), suggested stack, cause tags, NGO name + verification badge, **`🔒 Private` badge if `visibility = 'private'`** (Platform Promise §2 — title + summary still visible, code only available to assigned volunteer), posted date.
- [ ] Filters: skill match, cause, complexity tier, stack, with/without Lovable, **public vs private** (volunteers who only want public-portfolio work can filter out private projects).
- [ ] Each listing shows **skill/cause overlap badges** for the logged-in volunteer (REQ-011 v1 minimal: "Skills match: N of M", "Causes match"). Numeric match score + breakdown panel deferred to v1.5 per §11.
- [ ] Volunteer can "Apply" with a short cover note; NGO sees applicants in their dashboard.

**Dependencies:** REQ-001, REQ-005, REQ-008 (GitHub repo creation needs the linked handle).

---

#### REQ-008: GitHub Integration (Code substrate + dev-internal issue tracker)

**Description:** When a project is funded (NGO completes Stripe top-up at `matched_pending_fuel` → `in_progress`), a GitHub repo is provisioned for the code. **v1 is Track A only (decision-19), so every project takes the Lovable-recommended (`lovable_recommended = true`) path below; the Claude-Code-only (`lovable_recommended = false`) row is reserved for post-v1 Track B.** (Verified 2026-05-23 against [Lovable docs](https://docs.lovable.dev/integrations/github) — Lovable's GitHub App creates the repo itself wherever the NGO points it, and Lovable's project-collaborator permissions do NOT propagate to GitHub):

| Case | Who creates the repo | Where it lives | When |
|---|---|---|---|
| **`lovable_recommended = false`** *(reserved — post-v1 Track B, decision-19; never taken in v1)* | ai4good (programmatic via our GitHub App) | **Always `ai4good-projects/<slug>`** GitHub org. Visibility = public/private per `projects.visibility` (option α — locked) | Immediately on funding |
| **`lovable_recommended = true`** (Track A — Lovable-orchestrated) | **Volunteer drives Lovable→GitHub install** (open-item-4 redesign 2026-05-26) — NGO does workspace + admin-invite (steps 1-4 of REQ-021 11-step checklist); volunteer does install + MCP connector + paste-back (steps 5-9); ai4good auto-validates (10-11). No platform-admin involvement. | **Always `ai4good-projects/<slug>`** (uniform with Claude-Code path). Visibility = public/private per `projects.visibility` | Whenever `lovable_setup_pending` blocker resolves — typically same-day if NGO + volunteer move promptly; 7d aging escalation per REQ-024 if either party silent |

**Repo provisioning (always `ai4good-projects` org) — v1 note (decision-19):** in v1 every project is Track A, so the repo is created via the Lovable→GitHub path (REQ-021 11-step); the "on funding, auto-create" bullet below is reserved for post-v1 Track B. The App install, collaborator roles, and webhooks below apply uniformly to the Lovable-created repo.
- ai4good's own GitHub App is installed org-wide on `ai4good-projects` once at platform launch (single ops setup, not per-project)
- *(Reserved post-v1 — decision-19; v1 creates the repo via the Lovable→GitHub flow, REQ-021)* On funding, ai4good auto-creates `ai4good-projects/<slug>` via the App's repo-creation API; visibility set per `projects.visibility` (`public_mit` → public repo + LICENSE seeded as MIT; `private` → private repo)
- Volunteer added as `maintain`-role collaborator
- NGO admin added as `triage`-role collaborator (read + can comment, cannot push) for visibility
- App is already installed so webhooks (`push`, `pull_request`) start firing immediately — drives cadence stats (REQ-010) + `external_commit_refs` capture (Linear identifiers parsed from commit messages / branch names, REQ-026). Issue *status* moves via Linear's own per-workspace GitHub integration, not our webhook.
- At handoff (REQ-012), NGO admin offered a one-click GitHub transfer to their own org if they have one; declining keeps the repo in `ai4good-projects/` permanently

**Lovable path (volunteer-driven via `lovable_setup_pending` blocker per open-item-4 redesign 2026-05-26; uniform with Claude-Code path):**
- Per REQ-021's open-item-4 redesign (2026-05-26): NGO invites volunteer to their Lovable workspace as **Lovable workspace admin** (NOT Editor); volunteer drives the Lovable→GitHub install + ai4good MCP connector setup via the `lovable_setup_pending` blocker checklist (REQ-021). No platform-admin involvement.
- Volunteer targets `ai4good-projects` org (same as Claude-Code path) — Lovable creates the repo there with visibility per `projects.visibility`. Volunteer's permission to do this is granted at onboarding via REQ-007 org-membership.
- Volunteer auto-added as `maintain`-role collaborator on the created repo (via blocker validation step 11); NGO admin as `triage`-role.
- ai4good's GitHub App is **already installed org-wide** so webhooks fire immediately.
- *(Removed by decision-20: the ai4good-MCP-in-Lovable Chat Connector step — a decision-9 orphan. Task interaction now happens in Linear via the volunteer's OAuth; Lovable needs no connector to ai4good.)*
- **Dual-rail (volunteer also wants Claude Code locally on same Lovable repo):** Since volunteer is already a `maintain` collaborator in `ai4good-projects/<slug>` (REQ-007 + blocker validation) and the ai4good App is already installed, there's nothing extra to do — volunteer can `git clone` and use Claude Code immediately. **The `github_collaborator_needed` blocker is now mostly obsolete** for v1 default Lovable flows; kept in REQ-024 only for legacy/edge cases.

The platform PM task tree (REQ-026) is the source of truth for NGO-visible deliverables — **GitHub Issues are dev-internal only** (code bugs, refactors, technical debt, dev tooling) and are not surfaced in the NGO PM view.

**Scope of GitHub's role:**

| Used for | NGO-visible via platform? |
|---|---|
| Source code (commits, branches) | Yes (cadence stats, REQ-010) — but not for browsing code |
| Pull requests + code review | No — dev-internal |
| **GitHub Issues** | **No — dev-internal only**; for code bugs, refactors, tech debt |
| Releases / tags | Optional surfacing at handoff |

**Repo template seeding (decision-20/21/22 — the volunteer session boots from committed, ai4good-owned files):**
- For every project's repo, ai4good seeds: **`CLAUDE.md`** — imports `.a4g/fingerprint.md` (committed marker, REQ-009) + `.a4g/task.md` (gitignored task binding, REQ-034), carries the attribution steering block and the Linear norms (one issue in progress; assign before starting; comment when blocked; **never move status by hand**), and instructs branch-name / magic-word conventions carrying the Linear identifier (e.g. branch `a4g-12-add-scheduler`, commit/PR text `Fixes A4G-12`) so Linear's GitHub integration links work and moves status; **`.mcp.json`** — the Linear MCP (volunteer OAuths once at first session); **`.claude/settings.json`** — the ai4good-owned hooks (the REQ-034 PostToolUse assignment hook); the **skeptical reviewer-agent skill** (REQ-026); a gitignored-by-default **`.env`** stub. Longer onboarding material lives in repo skills, not CLAUDE.md (placement doctrine, REQ-009).
- The ai4good REST bearer token (`AI4GOOD_PROJECT_TOKEN` / `~/.ai4good/config.json`) is unchanged for platform REST calls (context/blockers/comments): **never written into CLAUDE.md or any committed file**; show-once + hash-only in `project_api_tokens`; one-click rotate. The LLM-side credential is the separate gateway virtual key (REQ-009) — two credentials, two revocation semantics, deliberately not merged.
- Lovable-side commits arrive via Lovable's GitHub sync without Linear identifiers — acceptable: issue status moves on the volunteer's PR merges, and a Knowledge-field snippet asks Lovable to include the identifier where practical (best-effort). *(The former ai4good-MCP-in-Lovable Chat Connector is deleted — decision-20; the Linear MCP replaced that surface.)*

**Acceptance Criteria:**
- [ ] Platform stores the GitHub App's **installation ID + private key** (NOT long-lived installation tokens — codex round 6 nit fix). the Supabase Edge Functions (Deno) mint short-lived installation tokens on demand via the GitHub App JWT flow (~1h TTL; auto-refreshed). Private key in Supabase Vault / Edge Function secrets. All GitHub API calls use these per-request tokens, not user PATs.
- [ ] **One-time platform setup at platform launch (single ops task; never repeated):**
  - **ai4good's own GitHub App** installed on `ai4good-projects` org with permissions: `Repository administration: write` + `Contents: write` + `Pull requests: write` + `Workflows: write` + **`Organization members: write`** (codex round 6 + open-item-4 redesign — needed so ai4good's backend can add/remove volunteer accounts as org members without per-project admin labor; narrower than `Organization administration: write` — covers membership add/remove/role-change only, NOT org settings/billing/teams; risk mitigations: audit_events log + a pg_cron → Supabase Edge Function (Deno) org-membership reconciliation job (verifies each active volunteer's ai4good-projects membership/role matches an active assignment; remediates drift via #27's outbox) + a pg_cron max-membership-lifetime auto-revoke sweep; job_runs heartbeats). Token stored in Supabase Vault per NFR Security.
  - **Lovable's GitHub App** installed on `ai4good-projects` org (so any volunteer with org membership can target ai4good-projects from their Lovable session when creating repos). One-time install via the GitHub App marketplace.
  - **Single org in v1, two-org separation deferred to v1.5 (decided 2026-06-03):** v1 keeps both public-OSS and private/Tier-2 projects in **`ai4good-projects`**, with the **continuous base-permission invariant (below)** as the SPOF mitigation. The PM-architect Rec #4 split into a separate `ai4good-private` org (smaller blast radius) is a **v1.5 hardening** — the continuous invariant gives most of the protection at far less v1 plumbing. (`projects.github_org` column exists for the v1.5 split; always `ai4good-projects` in v1.)
  - **Org permissions configured (preserves private-repo confidentiality):**
    - Org-level **Base permission for repositories = `No permission`** (NOT `Read`) — org membership alone does NOT grant read access to other projects' code; volunteers see a repo only when explicitly added as collaborators per project.
    - **Continuous base-permission invariant (NEW — preventive, not just detective):** a **pg_cron short-interval schedule → `base-permission-assert` Supabase Edge Function (Deno)** (plus a GitHub org-webhook Edge Function) runs the assertion continuously, not nightly, verifying `ai4good-projects` base permission == `No permission`; on drift it **alerts + auto-remediates** and is treated as a **P0 invariant** (a single accidental flip to `Read` would expose every private NGO repo). Replaces the prior nightly-only reconciliation as the primary guard. (This is the v1 SPOF mitigation that lets the two-org split defer to v1.5.)
    - Org-level **Member-can-create-repositories = enabled (public + private)** — gives org members the practical "Repository creator" right so volunteers (and Lovable on their behalf) can create new repos. Combined with `No permission` base, a volunteer can create + admin their own new repos but cannot read others' private code without an explicit collaborator grant. **Repo-creation-abuse monitor:** alert on org repos created that don't map to an active assigned project (catches a member spinning up unrelated repos).
    - **App credential least-privilege + rotation:** the GitHub App credential is scoped to the minimum needed, rotated on a schedule by a pg_cron → Supabase Edge Function (Deno) (or a documented manual ops runbook); App installation-ID + private key in Supabase Vault / Edge Function secrets, and a **break-glass org-compromise runbook** is documented (REQ-030).
    - **Outside collaborators allowed only for NGO admins** (per-project, `triage` role; codex round 8 disambiguation — earlier "not allowed by default" wording conflicted with the NGO-admin access path). Volunteers are always org members (REQ-007), never outside collaborators. NGO admins are always outside collaborators per-project (they're nonprofit staff, not platform developers; don't need org membership). Accidental org-wide visibility is prevented by the `No permission` base + the fact that volunteers see only the repos they're explicitly added to as collaborators (the project they're matched on).
- [ ] **Claude-Code-only path** *(reserved — post-v1 Track B, decision-19; v1 creates the repo via the Lovable path below)*: repo auto-created on first successful fuel payment as `ai4good-projects/<slug>` with topics: `ai4good`, NGO slug, cause tags. Visibility per `projects.visibility` (`public_mit` → public repo, LICENSE auto-seeded as MIT; `private` → private repo, no license file). Volunteer added as `maintain`-role collaborator; NGO admin added as `triage`-role collaborator. README template + CLAUDE.md commit-prefix template included.
- [ ] **Lovable path (v1 default — decision-19):** ai4good does NOT pre-create the repo on funding; project transitions to `in_progress` cleanly. At kickoff the `lovable_setup_pending` blocker (REQ-024) auto-raises (no volunteer opt-in — decision-19); NGO+volunteer collaborate via 11-step checklist (NGO does 1-4, volunteer does 5-9 including the Lovable→GitHub install targeting `ai4good-projects/<slug>` with visibility per `projects.visibility`, ai4good auto-validates 10-11) → `github_repo_url` set, `lovable_enabled = true` flips → uniform with Claude-Code-only after that point (same App, same collaborators, same webhooks). **No platform-admin involvement.**
- [ ] **Handoff prerequisite (Platform Promise §2 + REQ-012):** for both project shapes, `projects.github_repo_url IS NOT NULL` is a precondition for `in_progress → handoff_pending` transition. For Lovable projects where NGO hasn't yet completed setup, the volunteer's "Ready for Handoff" button is disabled with copy: "Lovable→GitHub setup not yet complete. Ask NGO to complete the Lovable Setup checklist before handoff." This preserves the all-work-ends-up-in-an-OSS-style-repo guarantee even when the visibility is private.
- [ ] **`github_collaborator_needed` blocker (REQ-024)** is rare in v1 — only fires for the legacy edge case where an NGO explicitly insists on Lovable creating the repo in their own GitHub org instead of `ai4good-projects` (NGO-driven exception path, not default). Default Lovable flow (open-item-4 redesign) lands the repo in `ai4good-projects` via the volunteer-driven `lovable_setup_pending` blocker, with the volunteer auto-added as `maintain` collaborator on the new repo at validation step 11.
- [ ] README template (added by ai4good for Claude-Code path; committed automatically at REQ-021 step 11 for Lovable path after volunteer pastes the URLs and ai4good validates) includes: project title, NGO name, plain-language summary, license, "View on ai4good →" link to the platform project page.
- [ ] **No auto-creation of GitHub Issues from the scope doc.** The Linear backlog (REQ-026) is the canonical task list.
- [ ] Webhooks subscribed (immediate for both project shapes — ai4good's GitHub App is installed org-wide on `ai4good-projects` per the one-time platform setup, so any repo created in the org has webhook coverage from creation): `push`, `pull_request` (cadence + `external_commit_refs` via Linear-identifier parsing per REQ-026; issue status itself moves via Linear's GitHub integration). GitHub Issues webhook is **not** used in v1 (post-handoff issue surfacing is v2 per §11). Codex round 9 fix — earlier wording incorrectly framed the Lovable-path webhook as "optional"; with org-wide App install + uniform `ai4good-projects` invariant, it's always on.
- [ ] Standard GitHub issue labels established at repo bootstrap: `bug`, `refactor`, `tech-debt`, `dev-task`, `priority-p0`, `priority-p1`, `priority-p2` (for dev-internal use only).
- [ ] **On Handoff (REQ-012):**
  - Claude-Code path: NGO offered one-click transfer of `ai4good-projects/<slug>` to NGO's own GitHub org if they have one; can decline (repo stays in `ai4good-projects` indefinitely). Volunteer downgraded to `triage`-role; NGO admin promoted to `admin`.
  - Lovable path: repo lives in `ai4good-projects/<slug>` (same as Claude-Code path after the open-item-4 redesign — uniform invariant). At handoff, NGO admin offered the same one-click transfer to their own GitHub org if they have one; declining keeps the repo in `ai4good-projects`. ai4good removes the volunteer's collaborator role at handoff; NGO removes the volunteer from the Lovable workspace separately (Lovable workspace admin = NGO).

**Dependencies:** REQ-006 (funding triggers repo creation), REQ-007 (volunteer identity for GitHub collaborator add), REQ-026 (PM tasks are the NGO-facing task model).

---

#### REQ-009: LLM Gateway — Virtual Keys, Caps & Inline Fuel Metering (decision-21)

> **› Decision-21 (2026-07-05) re-architecture:** the per-project Anthropic workspace + manual Console key + Usage-Report poller model is **replaced** by an ai4good-controlled **LLM gateway** sitting in the request path between the volunteer's coding agent (Claude Code / Codex / Cursor — the direct-agent rail) and the model provider. This pulls the former "AI Proxy" (v1.5, Out of Scope #1) forward into v1 **and makes it the metering path itself**, not just an enforcement layer. **Deleted outright:** per-project Anthropic workspace provisioning, the `anthropic_key_creation` manual ops queue (Console key paste), the 5-min Usage-Report poller + `usage_poll_state` cursor, the daily Cost-Report drift reconciliation, the workspace spend-cap Console step, and the fuel-zero key-deactivation / top-up-reactivation outbox saga. The `UsageMeteringProvider` port is retired with them — the gateway writes the ledger inline from each response's usage block. **Gateway hosting is an OPEN decision** (thin Deno proxy on Supabase Edge Functions vs a self-hosted LiteLLM-style service) — see the Open Decisions register.

**Description:** Every (volunteer, project) pair gets a **virtual key** (`a4g_*` prefix) minted as a Supabase row at kickoff — automatically, with no ops task and no 12-hour wait. The volunteer's setup is two env vars (`ANTHROPIC_BASE_URL=<gateway>`, `ANTHROPIC_API_KEY=<a4g_ key>`); vanilla Claude Code works unchanged. The gateway terminates the virtual key, checks `{status, caps, project fuel balance, project fingerprint}`, injects the governance prompt, forwards to Anthropic using the **real org key that lives only in gateway env** (volunteers never see it — mechanical enforcement of no-billing-exposure), streams the response back, prices the response's token usage via the local rate card, and writes the paired ledger rows inline. All identity/scope checks are **pairwise** (presented key ↔ project marker; any future token claims ↔ presenting key) — explicit requirements, not implied.

**Placement doctrine (where rules live — applies platform-wide):**

| Layer | Carries | Property |
|---|---|---|
| Volunteer-editable files (CLAUDE.md, repo docs, skills) | Norms, nudges, workflow education | Soft; the agent reinforces conversationally; can be edited away |
| Gateway-injected system prompt | Durable norms (project scope line, never-change-Linear-status rule) | Invisible, ai4good-controlled, re-applied per request |
| Deterministic code (gateway checks, webhook consumers, CI) | Hard invariants | Cannot be talked out of its verdict |

Third-party permission models are trusted for **access, never for policy** (Lovable has no role between Admin/Editor; Linear OAuth scopes cannot express "assign+comment but no status change") — policy enforcement always lives in ai4good-controlled layers. Longer onboarding material goes in repo **skills** (loaded on demand), not CLAUDE.md (which rides every request and is billed to NGO fuel).

**Threat model (stated plainly):**
- The **fingerprint is a tripwire, not a lock.** It is copyable by design. Its function is to convert *accidental* misuse into unambiguous intent — it kills the dominant real case (a key left in env vars, used absentmindedly on another repo).
- The **virtual key is the actual credential.** Key + repo-context is a two-factor barrier against **outsiders only**; insiders hold both legitimately.
- **Containment chain:** caps bound the exposure, the ledger attributes it, revocation (one Supabase row) ends it. Detection can afford latency because exposure is capped.
- **Revocation instruments:** key revocation = individual enforcement; fingerprint rotation = hygiene against people who *lost* repo access (off-boarding, leaks). Rotation is never used against active insiders (they just re-pull).
- Rate limits are reliability engineering; project-lifetime fuel is economics; **neither is a security control** — do not size caps adversarially.
- **Proportionality:** governance capacity is provisioned against observed behavior, not imagined adversaries. Deterrence comes from disclosure at onboarding (usage is attributed and reviewed), not from machinery. Any governance mechanism that taxes legitimate volunteers has inverted its purpose — every check below must cost the legitimate path nothing.

**Acceptance Criteria:**
- [ ] **`virtual_keys` table** — one row per (volunteer, project): `key_hash` (bcrypt; plaintext shown ONCE at issuance with copy button), `status`, `caps` JSONB, `last_used_at`, `revoked_at`. Minted automatically on the `matched_pending_fuel → in_progress` transition. Keys are never logged; the raw key never reaches any store but the volunteer's env.
- [ ] **Volunteer onboarding = two env vars** (`ANTHROPIC_BASE_URL` + the `a4g_*` key), surfaced on the volunteer dashboard at kickoff with install instructions. All setup-failure UX lands on the gateway's 401 copy — that copy is treated as part of the mechanism and is written to instruct, not accuse.
- [ ] **Streaming pass-through:** the gateway forwards `POST /v1/messages` (+ token counting) with SSE streaming intact; per-request overhead budget < 150ms p95 (excluding model latency).
- [ ] **Budget caps per key:** a per-request max-token cap + a **rolling 24h window** (not calendar-day), sized 3–4× an expected heavy human day so legitimate agentic-loop usage fits. At 80% of the window: soft warning (response header + platform notification). At 100%: hard stop with **coordinator override** (one admin action raises the window for that key). Cap values are an open decision (register) — tuned from pilot data, not adversarial guesswork.
- [ ] **Project fingerprint check:** the repo template commits `.a4g/fingerprint.md` (a static marker + a one-line human-readable explanation: *"ties NGO-funded fuel to this project; please don't move it"*), imported by the repo's CLAUDE.md so it rides the system prompt. The gateway checks the marker **pairwise against the presented key's project**, enforced only on requests above ~1.5k input tokens (skips background calls; threshold value = open decision). Mismatch → rejection with volunteer-facing, instructive copy (*"this key belongs to <project>; you appear to be in a different repo"*).
- [ ] **Governance prompt injection:** the gateway appends the ai4good governance block to the system prompt on every request — the project scope line (decline requests unrelated to the project; redirect to project work) and the never-change-Linear-status rule (REQ-026).
- [ ] **Inline ledger writes (the money path, Option γ unchanged):** per gateway response, convert the usage block's tokens → `anthropic_micro_cents` via the local rate card (`anthropic_rate_cards`, per model/context/tier/cache breakdown), apply the 15% markup (`1 / 0.85`), and write the paired `consumption` + `skim` rows exactly as before (micro-cents precision, `pair_id`, display-time rounding — all REQ-006 math and invariants unchanged). Idempotency: one ledger write per `gateway_request_id` (unique index) — a retried request cannot double-charge. The ledger stores **token counts and metadata only** (see privacy invariant below). Rows carry `task_ref` when the request's task binding resolves (REQ-034).
- [ ] **Fuel thresholds:** 20% → NGO email + `fuel_topup_needed` blocker (warning, REQ-024); 5% → in-app warning to volunteer; **0% → the gateway declines the next request inline** with a fuel-suspension response that **states the cause** (*"project fuel is exhausted — ask your NGO to top up"*) + flips the blocker to blocking. On top-up, the next request passes — **no reactivation machinery exists or is needed.** The fuel-balance check is structural and real-time (reads the balance VIEW), replacing the old polling+deactivation loss ceiling with a stronger one.
- [ ] **401 semantics:** flat externally — no revoked-vs-nonexistent distinction — **except** fuel suspension, which states its cause inline (the one case where the caller is a legitimate volunteer who needs to act). Rich diagnostics (which check failed, key status, cap position) are available only on the authenticated volunteer dashboard. **First-week 401s are tagged as an onboarding-UX metric, not a security signal.**
- [ ] **Revocation is one Supabase row:** the NGO's *"Suspect misuse — revoke access now"* action and the platform admin's enforcement both set `revoked_at` — instant, self-serve, no ops queue. A replacement key mints instantly (show-once). **All project keys terminate at handoff** (REQ-012 lifecycle rule), on abandonment release (REQ-027), and in the AUP suspension saga (REQ-007).
- [ ] **Privacy invariants (verbatim, load-bearing):** the gateway inspects request bodies **transiently and never persists them**. The ledger stores token counts and metadata only. Any derived origin/mismatch signal is stored as a **score or boolean, never paths or content**.
- [ ] **Volunteer self-audit:** volunteer dashboard shows their own per-project usage (tokens today/week, cap position, last session) — helps catch a wrong-env-var accident same-day.
- [ ] **Key-leak hygiene:** the repo template gitignores `.env` by default; a **GitHub secret-scanning custom pattern** for `a4g_*` keys is registered on the org; the gateway runs a **canary check** that flags any key seen in requests after appearing in a public commit.
- [ ] **Escalation ladder — documented, NOT built in v1** (each rung with its trigger; listed so the decision *not* to surveil is visible):
  - **Layer 2 — reconciliation:** a weekly job joining ledger burn vs GitHub/Linear activity. Phase-aware (early development is legitimately read-heavy/commit-light; "activity" includes branch pushes, issue movement, clone/fetch events). Shape signals only (cadence, session length, capped-every-day pattern) — usable without reading content. *Trigger: the ledger shows real anomalies.*
  - **Fingerprint rotation via CI** (the separate `.a4g/fingerprint.md` file avoids merge conflicts; a grace window is mandatory — rotation must never interrupt a session that pulled within the window). *Trigger: adverse offboarding or a leak.*
  - **Per-volunteer short-TTL signed token** fetched at SessionStart (JWT; claims pairwise-checked against the presenting key; fail-open to a grace window if the endpoint is down). *Trigger: Layer 2 fires repeatedly and conversations don't resolve it.*
  - **Layer 3 — content classification:** sampled, triggered by Layer 2 only, never inline. *Trigger: probably never.*

**Task Breakdown Hint (decision-21):**
- Task 9.1: Gateway core — virtual-key auth + streaming pass-through + real-key env isolation (~10h)
- Task 9.2: `virtual_keys` schema + mint-at-kickoff + revoke + show-once dashboard UI (~5h)
- Task 9.3: Caps — per-request max + rolling 24h window + 80%/100% behavior + coordinator override (~5h)
- Task 9.4: Fingerprint pairwise check + governance prompt injection + rejection copy (~4h)
- Task 9.5: Inline ledger writes — rate-card pricing, paired rows, `gateway_request_id` idempotency, `task_ref` capture (~6h)
- Task 9.6: Fuel thresholds + inline fuel-suspension response + blocker wiring (REQ-024) (~3h)
- Task 9.7: 401 UX + authenticated dashboard diagnostics + onboarding-401 metric tag (~3h)
- Task 9.8: Secret-scanning pattern + leak canary + `.env` template hygiene (~2h)
- Task 9.9: Volunteer self-audit usage view (~3h)

**Dependencies:** REQ-006 (fuel ledger + balance VIEW), REQ-024 (fuel blockers), REQ-034 (task-ref capture rides the same request pass), REQ-012/REQ-027/REQ-007 (key-termination lifecycle hooks). Replaces all prior Anthropic Admin-API dependencies — the only Anthropic surface used is the Messages API through the gateway.

---

#### REQ-010: Project Page (single view) & Cadence Stats

**Description:** Each project has **one public page** — same view for everyone (NGO admins, the assigned volunteer, platform admin, logged-out visitors). The platform's role for the project is PM and coordination only; the volunteer handles their actual code/dev workflow on GitHub (or wherever they prefer) outside the platform. No "Developer view" with GitHub UI duplication.

**Acceptance Criteria:**
- [ ] Page is public (logged-out users can view). One view; no toggle; no per-role variants. **For private projects (`visibility = 'private'`), task tree details + task comments are read-restricted per REQ-026 RLS rule** — logged-out viewers see metadata + progress-count + 🔒 Private badge but not task titles/descriptions/code. Public projects show the full task tree publicly per Platform Promise §2 OSS-by-default (codex round 8 fix).
- [ ] Project metadata header: title, NGO name + verification badge, status, assigned volunteer, **repo URL (single linked field; empty-state behavior: for Lovable projects where the volunteer hasn't yet completed the `lovable_setup_pending` blocker steps 5-9, shows "Repo URL not provided — volunteer is completing Lovable→GitHub setup" instead of a broken link)**, complexity tier (from Discovery), cause tags.
- [ ] **PM task tree (REQ-026)** as the primary content area, with hierarchical progress bars per parent task, status badges, "Now working on" highlight for in_progress tasks, plain-language task titles.
- [ ] Progress % = `done_p0_tasks / total_p0_tasks` (computed from PM tasks, NOT GitHub issues).
- [ ] **Plain-language activity feed**: each commit translated to readable form (e.g. *"Volunteer completed work on Task 3.2 — Scheduler core (2h ago)"* rather than *"PR #14 merged"*). Translation derives from commit-message task-references and PM task titles.
- [ ] **Reference files section (REQ-032):** lists the NGO's uploaded need-files (name / type / uploader / one-line description). Download is available to the assigned volunteer + NGO admins + platform admin via a signed-URL edge function honoring `projects.visibility` (private projects restrict to members; logged-out viewers on a private project see only a count). The NGO can add/remove files here pre-handoff.
- [ ] **Clarifications tab (REQ-024):** Lists resolved `clarifying_question` blockers as a persistent Q&A log — each entry shows the original question (`title` + `body`), the answer (`resolution_note`), who asked, who answered, and timestamps. Persists for the project's lifetime.
- [ ] **"Awaiting NGO clarification" banner (REQ-024):** When ≥1 unresolved `clarifying_question` blocker exists, the project page shows a prominent banner at the top with the question summary and a call to action for the NGO to respond.
- [ ] Fuel gauge updates near-real-time (poll every 30s on the page, push via Supabase Realtime where possible).
- [ ] **No GitHub Issues, PR list, or raw commit log displayed on the project page.** GitHub Issues exist for dev-internal code bugs (REQ-008) but are not surfaced; volunteer accesses them directly on GitHub. The repo URL header link is the only GitHub touchpoint on the project page.
- [ ] **Cadence stats panel** (computed from GitHub commits via the `github-webhook` Supabase Edge Function on push (primary) + a pg_cron → `cadence-pull` Supabase Edge Function (Deno) hourly catch-up — data ingestion only; no GitHub UI surfaced):
  - **Commits this week / last week** with delta (e.g. "12 commits this week, ↑33% vs last").
  - **Last activity** timestamp ("2 hours ago", "3 days ago" — colored red if > 14 days during `in_progress`).
  - **PM task close rate** — done-tasks-this-week / new-tasks-this-week (from REQ-026 PM tasks, NOT GitHub issues; codex round 2 nit fix — issue close rate would have exposed dev-internal activity).
  - **Contributor sparkline** — 12-week mini-chart of commit volume.
  - **Cadence health badge:** `Active` (commits in last 7d) / `Quiet` (7-14d) / `Stalled` (>14d).
- [ ] Cadence stats are also surfaced as a compact summary on each project card in the marketplace (REQ-007) and in dashboards (REQ-013, REQ-014).
- [ ] Cadence data cached for 1 hour to avoid GitHub API rate-limit pressure.
- [ ] **Dual fuel-meter display (REQ-021)** — v1 (Track A only, decision-19) always renders two parallel fuel meters side-by-side (every project is Lovable). Claude Code meter shows current fuel balance (gross — Option γ), % remaining, low/depleted indicators. Lovable status meter — if `lovable_enabled = true` (setup done): shows current `lovable_status` + Lovable workspace link + "Top up Lovable credits →" CTA when `credits_low`/`blocked`. If `lovable_enabled = false` (setup not yet done): shows "Set up Lovable" CTA pointing to `/docs/lovable-setup-guide` + the `lovable_setup_pending` blocker status.
  - *(Reserved, post-v1: the single-meter display for skipped / `lovable_recommended = false` projects is the Track-B path deferred by decision-19 — `lovable_skipped_at` is never set in v1.)*
  - Layout: two equal-width cards under the project header, labeled "Claude Code (via fuel)" and "Lovable (direct to Lovable)" with brief tooltips explaining the difference.

**Dependencies:** REQ-008, REQ-009.

---

#### REQ-011: Marketplace Sort + Skill/Cause Overlap Badges (v1 minimal)

**Description (v1):** Marketplace listings display **skill-overlap and cause-overlap badges** as a visual hint to volunteers — no numeric match score, no scoring algorithm, no breakdown UI. Volunteers self-select which projects look like a fit; NGO accepts or declines applications without an algorithmic recommendation. The full deterministic match score (REQ-011 v1.5) is deferred per §11.

**Acceptance Criteria (v1):**
- [ ] Each marketplace listing card shows: (a) a small "Skills match: 3 of 5" badge counting overlap between volunteer's declared skills and project's `suggestedStack`, (b) a "Causes match" badge if any cause tag overlaps. Both badges are visual cues only — no numeric score, no ranking, no detail page.
- [ ] Marketplace default sort is "newest first" (`created_at DESC`). Volunteer can filter by skill, cause, complexity tier, with/without Lovable. **No "best match" sort in v1** — that's the v1.5 scoring work.
- [ ] **No ML, no algorithmic ranking, no NGO-satisfaction weighting in v1.**

**v1.5 (deferred per §11 — full score):**
- Deterministic 0-110 score with breakdown UI (skill 40 / cause 20 / availability 15 / GitHub language 15 / completion credit 10 / KYC 10)
- Per-listing score on tile, breakdown on detail page
- NGO satisfaction signal (REQ-014) as a private weighting component

**Dependencies:** REQ-007.

---

#### REQ-012: Handoff Workflow

**Description:** Structured workflow that takes a project from "code done" to "NGO operating independently".

**Acceptance Criteria:**
- [ ] Volunteer clicks "Ready for Handoff" once all P0 PM tasks (REQ-026) are marked `done`. Open GitHub Issues do not block handoff.
- [ ] **Hard precondition (Platform Promise §2 + REQ-008):** `projects.github_repo_url IS NOT NULL` — every project ends in an `ai4good-projects/<slug>` repo at handoff regardless of project shape (Claude-Code projects always have it from kickoff; Lovable projects must have completed the `lovable_setup_pending` blocker per REQ-021). For Lovable projects where the URL is missing, the "Ready for Handoff" button is disabled with copy: "Lovable→GitHub setup not yet complete. Resolve the `lovable_setup_pending` blocker (REQ-021 11-step checklist) before requesting handoff." **No platform-admin escalation** — NGO + volunteer self-resolve via the blocker's checklist + clarifying_question pattern.
- [ ] ~~Optional verification: each P0 PM task marked `done` has at least one associated commit reference~~ — **structural under decision-20:** `done` only arrives via Linear's GitHub integration on PR merge, so every done p0 carries a merged PR by construction; the commit-ref spot check is retired.
- [ ] Automated checks: README present, RUNBOOK.md present, deploy instructions section present, ≥1 passing CI run on `main`, **LICENSE file present if `visibility = 'public_mit'`** (private repos don't require a LICENSE file since they're not open-licensed for redistribution).
- [ ] **Deploy-to-running step (decided 2026-06-03 — Goal 1; the deliverable is a *running* tool, not a repo):** the volunteer's final task is to **deploy a working instance and hand over ownership**, and `projects.deployment_url IS NOT NULL` is a handoff precondition:
  - **Track A (Lovable):** the app is already deployed and hosted by Lovable; "deploy" = the volunteer **pastes the live Lovable app URL into the handoff form, which WRITES `projects.deployment_url`** (this is the Track-A source of `deployment_url` — the precondition above; the step-9 *setup* paste-back captures workspace/repo URLs only, never the deployed-app URL, so without this step a Track-A handoff is structurally un-completable) + transfer Lovable workspace ownership to the NGO (NGO owns it from kickoff per REQ-021, so this is a confirmation) + run the **guided-maintenance handoff ritual**: (i) **enable Supabase RLS** (off by default on Lovable-provisioned Supabase — a PII footgun), (ii) **demo chat/plan mode + revert/checkpoint rollback** to the NGO staffer so they can self-maintain without breaking production, (iii) **set a Lovable spend cap / budget alert** so metered edits never blindside a non-technical owner, (iv) confirm two-way GitHub sync is live.
  - *(Track B plain-host deploy is deferred to post-v1 — decision-19. v1 deploy/handoff is Track-A / Lovable only.)*
- [ ] **30-day-alive signal (Goal 1 north-star):** a health-check job pings `deployment_url` at 30 days post-handoff and records the alive signal. Not guaranteed (no SLA, Platform Promise §4) — measured. **Extended by decision-22 to 30/60/90-day jumpstart health checks with real self-service signals — REQ-035.**
- [ ] NGO sees a "Review Handoff" CTA with the repo URL + live deployment URL + checklist results.
- [ ] NGO signs off (or rejects with comments → back to volunteer). **Rejection-loop cap (decided 2026-06-03 — dispute resolution):** after 2 reject→resubmit cycles, the third rejection routes to neutral **platform review** (a lightweight `incident`/review ops task) so an NGO can't extract unbounded unpaid rework; the volunteer has a "contest this rejection" path.
- [ ] On accept: project status → `handed_off`, **leftover fuel released to NGO general balance as non-cash credit** (REQ-006 §7 — `credit_release`, not a cash refund), completion credit + "Shipped first tool" badge awarded to volunteer, **all project virtual keys terminated (REQ-009 lifecycle rule)**, Linear workspace membership removed + tree snapshot committed (REQ-026), and the **REQ-035 attribution step** captured as part of sign-off.
- [ ] **Repo handoff (uniform for both tracks):** the project repo remains under `ai4good-projects/` with the NGO admin promoted to `admin` and the volunteer downgraded to `triage`. Optional one-click transfer to the NGO's own GitHub org if connected (same flow both tracks). Private/Tier-2 projects use private *visibility* within `ai4good-projects` in v1 (the separate private org is a v1.5 hardening per REQ-008).
- [ ] Sign-off screen in v1 has no tip flow (v1.5 per §11). It **DOES include the REQ-035 attribution step** (testimonial + 3 credit-framed dimensions) — decision-22 consciously supersedes the earlier "no satisfaction form in v1" deferral; this is attribution capture, not a satisfaction score, and it never blocks acceptance.

**Dependencies:** REQ-008, REQ-006, REQ-021 (Track-A deploy + ritual), REQ-009 (key termination), REQ-026 (p0-done gate + snapshot), REQ-035 (attribution step).

---

#### REQ-021: Lovable Integration — Track-A Durable Home + Claude-Code-Orchestrated Build

**Description (rearchitected 2026-06-03 — Item 2):** For **Track A "NGO-maintains-it" projects** (REQ-004 `maintenanceTrack = A_ngo_maintains`), **Lovable is the PRIMARY deliverable vehicle and the NGO's durable maintenance home** — after handoff the non-technical NGO evolves the live app via Lovable's chat interface, no developer needed. During the build, however, **Claude Code is the single entry point**: the volunteer works in Claude Code (where the ai4good Skill, fuel metering, and enforcement live), and **Claude Code orchestrates Lovable via Lovable's MCP server** (`send_message`, `get_diff`, `get_workspace`, etc.) for the UI/app layer while doing backend/logic/tests directly. This keeps ai4good's metering + scope + audit authoritative even for Lovable work, and gives the volunteer a single pane of glass. **Track B is deferred to post-v1 (decision-19), so in v1 every built project is Track A and uses Lovable.**

**Build-phase orchestration model (Track A — the v1 architecture):**

- **`LovableDriver` anti-corruption port.** The ai4good Skill (REQ-028) calls a small internal port (`buildUI(prompt)`, `readDiff()`, `getCredits()`, `deployPreview()`) implemented over Lovable's MCP. Lovable's MCP is **Research Preview** (breaking changes possible), so this port isolates that churn to one adapter.
- **Primary path + graceful fallback (decided 2026-06-03 — dependency posture):** when Lovable MCP is healthy, Claude Code orchestrates Lovable through the port. If Lovable MCP breaks/changes, the Skill **degrades to the manual dual-rail**: the volunteer drives Lovable directly in the browser, ai4good enforces via the commit-prefix + synced-`ai4good-projects`-repo path. **Track-A builds never go dead from a Lovable API change.**
- **Cost enforcement (solves the "invisible Lovable burn" risk):** because the ai4good Skill makes the `send_message` calls, it **enforces a per-task Lovable-credit budget cap**, logs every call to `audit_events`, and polls `get_workspace` to surface the NGO's Lovable credit balance inside ai4good. `send_message` bills the NGO's Lovable workspace (per Lovable docs), so this enforcement is essential and is now structural rather than honor-system.
- **OAuth note:** Lovable MCP is OAuth-user-scoped — the volunteer (invited as Lovable workspace admin per the setup flow below) OAuth-connects their Lovable account into Claude Code; calls bill the NGO's workspace, audit-attributed to the volunteer.
- **Post-handoff:** the NGO owns the Lovable workspace (from kickoff) and self-maintains via chat — **zero dependency on the MCP layer or Claude Code.** The durable-owner promise holds even if orchestration wobbles.

**The legacy "split workflow" framing below remains valid for the manual fallback** (both tools commit to the shared GitHub repo) — Track B, its other original use, is deferred to post-v1 (decision-19). For Track A the default is orchestration-through-Claude-Code, not manual side-by-side.

**Manual split workflow (the Track-A fallback when Lovable MCP is unavailable — NOT the Track-A primary path):**

| Work type | Recommended tool | Funded by | Why |
|---|---|---|---|
| Visual layout, design iteration, component polish, public-facing UI | **Lovable** | NGO → Lovable (direct) | Lovable's strength: low-latency visual builds with the NGO previewing changes live |
| Backend logic, data models, API integrations, testing, complex refactors, devops | **Claude Code** | ai4good fuel → Anthropic | Claude Code's strength: deep code reasoning, file-system access, terminal/CLI work |
| Documentation, runbooks, README | **Claude Code** | ai4good fuel | Better at producing structured docs and code-aware explanations |
| **GitHub repo** | **Both tools commit here** | — | Single source of truth; commits flow either way |

A volunteer can lean the mix either way: backend-heavy Track-A projects keep Lovable to a thin UI layer; UI-heavy projects lean almost entirely on Lovable. (A *pure*-backend tool with no Lovable app is Track B → waitlisted in v1 per decision-19.)

**Why the NGO-self-provisioned Lovable boundary holds (applies to both the orchestrated primary path and this manual fallback):** Lovable has no public per-project metering API, no BYOK, and per-workspace billing. Owning Lovable infrastructure on behalf of NGOs would expose ai4good to linear ops cost and inscrutable attribution. NGO-self-provisioned Lovable gives: (1) zero ai4good infrastructure dependency on Lovable, (2) pricing transparency for the NGO (no platform markup on Lovable spend), (3) **the NGO owns the Lovable workspace from day one** — the durable post-handoff chat-maintenance home, no migration needed, and (4) it matches how AI-augmented developers already work. (In the Track-A *primary* path the Skill orchestrates this same workspace via Lovable MCP and enforces the per-task credit cap — REQ-021 build-phase orchestration model above; the manual workflow here is the Track-A fallback when Lovable MCP is unavailable. Track B, its other original use, is deferred to post-v1 — decision-19.)

**Lifecycle:**

1. **Discovery phase:** The Discovery Agent detects UI-heavy scope and adds a `suggestedLovable` block to its output: `{ needed: bool, rationale: string }`. **No dollar estimate** — Discovery does not produce cost figures in v1 (consistent with REQ-004 / Story 1). The NGO sees this in the scope doc as a clearly labeled note: *"Lovable subscription is recommended for [reason] — paid directly to Lovable, not deducted from fuel. See [lovable.dev/pricing](https://lovable.dev/pricing)."*

2. **Pre-kickoff reminder:** When the project enters `matched_pending_fuel` AND `suggestedLovable.needed === true`, the platform shows a sticky banner: *"Set up your Lovable workspace and invite your volunteer there. Lovable bills you directly. Setup guide →"*

3. **Setup (volunteer-driven, mediated via blockers + channel messages between NGO and volunteer — open-item-4 redesign 2026-05-26):**

   The NGO does NOT need a GitHub account or GitHub knowledge. The **platform admin is completely OUT of the per-project Lovable setup loop** (Platform Promise §8 "minimize admin" — zero admin time per Lovable project). Setup is orchestrated entirely by NGO + volunteer through ai4good's existing blocker (REQ-024) + channel (REQ-015) surfaces.

   **No ai4good connector exists in Lovable (decision-20).** Task state lives in Linear; the volunteer's agents interact with it via the Linear MCP in the project repo's committed `.mcp.json` — Lovable itself never talks to ai4good. *(The former "ai4good MCP server as Lovable chat connector" design — a decision-9 orphan with an un-passable validation step — is deleted.)*

   **Lovable setup is mandatory at kickoff (v1 — decision-19):** every v1 project is Track A, so `lovable_recommended` is always true and Lovable is the deliverable, not an option. At kickoff (`matched_pending_fuel → in_progress`) ai4good **auto-raises** the `lovable_setup_pending` blocker (REQ-024, severity `blocking`) addressed to the NGO. Activity-feed event (via notify(), decision-15): *"🚩 Set up the Lovable workspace and invite the volunteer as workspace admin so they can connect GitHub + the ai4good MCP."* NGO sees an Action-Needed banner; the blocker ages on the normal REQ-024 schedule (48h/7d). **The volunteer "skip Lovable / Claude-Code-only" opt-out and the 14-day auto-skip are removed in v1** — `projects.lovable_skipped_at` is reserved (never set; no migration) and `mode: 'claude_code_only'` is reserved for post-v1 Track B.

   **Setup checklist (visible on the `lovable_setup_pending` blocker to both NGO and volunteer; 11 steps total; blocker auto-resolved when ai4good's step-11 validation succeeds):**

   | Step | Actor | What they do |
   |---|---|---|
   | 1 | NGO | Signs up at lovable.dev (or signs in to existing account). Requires Pro+ plan ($25/mo) — Lovable's workspace-admin role is a paid-tier feature. NGO's existing Lovable cost; no new ai4good cost. |
   | 2 | NGO | Creates a Lovable **workspace** (or uses existing) and a new Lovable **project** seeded by pasting the scope summary from ai4good's setup page (one-click copy). |
   | 3 | NGO | In Lovable Project Settings → People → Invite: invites the volunteer as **Lovable workspace admin** (NOT just Editor — workspace admin is required so volunteer can manage Git settings + chat connectors per Lovable docs). |
   | 4 | NGO | Returns to ai4good project page; checks off "I've completed steps 1-3 → over to volunteer." Activity-feed event (via notify(), decision-15): *"✅ NGO completed Lovable workspace + invited volunteer as workspace admin."* |
   | 5 | Volunteer | Accepts Lovable workspace invitation; signs in to Lovable. |
   | 6 | Volunteer | In Lovable Workspace/Project Settings → Git → GitHub: connects, targets `ai4good-projects` org (Lovable's GitHub App is pre-installed on it via REQ-008 one-time platform setup; volunteer already has org Member + `Repository creator` rights via REQ-007 onboarding — added when volunteer linked GitHub). Lovable creates `ai4good-projects/<slug>` with visibility per `projects.visibility`. |
   | 7 | — | *(Removed by decision-20 — no ai4good connector in Lovable. Row kept so step numbering stays stable across references.)* |
   | 8 | Volunteer | (Optional, recommended) Pastes the ai4good-provided Knowledge snippet into Lovable's Knowledge / Custom Instructions field asking Lovable to include the Linear identifier in commits where practical — best-effort git-blame readability, NOT load-bearing (Linear's GitHub integration on PR merge is the status mechanism — decision-20). |
   | 9 | Volunteer | Returns to ai4good project page; pastes back URLs/IDs: `lovable_workspace_url`, `lovable_workspace_id`, `lovable_project_id`, `github_repo_url`. Clicks "I've completed steps 5-9 → resolve blocker." |
   | 10 | ai4good (auto) | **Validation suite (codex round 7 fix — strengthened from prior single-GET check):** (a) Repo URL parses; **owner is `ai4good-projects`** (reject if elsewhere); **repo name matches `<slug>` convention** (warn if mismatch but accept); **GitHub repo API returns 200 with the requested `visibility`** (public_mit projects must be public; private projects must be private); **ai4good GitHub App is installed on the repo** (org-wide install means YES — verify via App installation listing); **slug-collision check** (if `ai4good-projects/<slug>` already exists for a different project, surface error to volunteer + suggest `<slug>-2`); (b) ~~workspace-token `last_seen_at` freshness check~~ — **DELETED by decision-20** (no connector exists; this check was un-passable as specced); (c) volunteer's repo permission normalized to `maintain` collaborator (downgrade from `admin` to `maintain` to prevent volunteer from inviting collaborators without ai4good's knowledge). Any validation failure: clear error to volunteer in blocker UI with the specific failed check + suggested fix; blocker stays open until all checks pass. |
   | 11 | ai4good (auto) | On full-validation success: blocker auto-resolves; `lovable_enabled = true`; `lovable_status = 'active'`; volunteer permission normalized to `maintain` (per step 10c); NGO admin added as `triage` collaborator; the repo template seeded (REQ-008: `.ai4good/config.json` with project_id + ai4good_api_base — no MCP server URL; CLAUDE.md imports; `.mcp.json` Linear MCP; `.claude/settings.json` hooks; `.a4g/fingerprint.md`); `lovable_setup_complete` notification fires to NGO + volunteer. Activity-feed event (via notify(), decision-15): *"✅ Lovable setup complete. Volunteer can build."* |

   **If actors get stuck mid-checklist:** either party raises a `clarifying_question` blocker via REQ-024 → resolved in the blocker's Clarifications Q&A + the project comment thread → NGO / volunteer resolves. Examples:
   - Volunteer: *"NGO, can you elevate me to Lovable workspace admin? You only invited me as Editor."*
   - NGO: *"Volunteer, can you walk me through the Lovable signup? Step 1's URL doesn't match what I see."*

   Each clarifying_question flows through REQ-024's existing 48h/7d aging escalation; platform admin gets pinged only on 7-day escalation (the standard auto-escalation path; not the default for Lovable setup).

   **At handoff:** NGO removes volunteer from Lovable workspace; ai4good's GitHub App remains until NGO opts to remove it; volunteer's `ai4good-projects` org membership is unchanged (REQ-007 manages that separately on the volunteer's overall lifecycle, not per-project).

4. **Dual-rail (Lovable + Claude Code locally on same repo) — no extra setup needed in the default flow** (codex round 9 clarification — `github_collaborator_needed` blocker is a legacy edge case, not the default path):
   - In the default Lovable flow (open-item-4 redesign), the repo lives in `ai4good-projects/<slug>` and the volunteer is already added as a `maintain` collaborator at step 11 of `lovable_setup_pending` validation. ai4good's GitHub App is already installed org-wide. So the volunteer can `git clone` and run Claude Code locally **immediately** after Lovable setup completes — no separate blocker, no NGO action.
   - The `github_collaborator_needed` blocker (REQ-024) exists **only for the legacy edge case** where an NGO specifically insisted on hosting the Lovable repo in their own GitHub org instead of `ai4good-projects` (rare; explicit NGO opt-out from the platform invariant). In that edge case, the volunteer raises the blocker and NGO does the per-repo collaborator add + ai4good App install. Default v1 flow does not exercise this path.

5. **During work — credit-status detection (manual UI only in v1):**

   - Volunteer sees a **Lovable Status** widget on the project page (visible only when `lovable_enabled = true`) with three states the volunteer can set:
     - `active` (default)
     - `credits_low` — volunteer sets this when they see Lovable's low-credit warning in the Lovable UI
     - `blocked` — volunteer sets this when they can't proceed
   - When `lovable_status IN ('credits_low','blocked')`, the project page shows an **NGO-facing CTA: "Top up Lovable credits →"** which opens Lovable's billing page in a new tab (deep link including the workspace URL where the NGO has provided one; fallback to `https://lovable.dev/settings/billing`).
   - **ai4good does NOT resell Lovable credits in v1** — NGO pays Lovable directly. (See Out of Scope #16; v2 may revisit with a reseller agreement.)
   - After topping up, NGO clicks **"I've topped up — unblock"** in ai4good to reset `lovable_status` to `active`.
   - **v1.5 enhancement (deferred per §11):** automatic credit-status detection via inbound email parsing of Lovable's notification emails. Deferred because: (a) brittle (Lovable email format changes break it), (b) requires inbound-mail infrastructure (Resend inbound / Postmark / Edge Function), (c) requires NGO-side alias setup that adds setup friction, and (d) manual widget already provides the same product behavior with zero infrastructure.
   - If `github_repo_url` is set AND ai4good's App is installed, cadence stats flow from GitHub (REQ-010) for Lovable commits too — but only as a side benefit, since Lovable commits are authored by `lovable-dev[bot]` (co-authored to the volunteer) and PM-task linkage depends on the best-effort commit-prefix convention from the Knowledge snippet.

6. **Handoff:**
   - Step added to the handoff runbook: *"NGO removes volunteer from the Lovable workspace's seat list. If ai4good's GitHub App is installed on the repo, ai4good removes it on NGO's confirmation."*
   - NGO retains the Lovable workspace + billing relationship. The GitHub repo lives in `ai4good-projects/<slug>` (per open-item-4 invariant); at handoff NGO is offered the same one-click transfer-to-own-org as the Claude-Code path (REQ-012). Lovable's GitHub-sync remains pointed at the repo wherever it ends up — no Lovable-side reconfig needed.
   - ai4good archives `lovable_workspace_url` for reference; no further state changes

**Acceptance Criteria:**
- [ ] Discovery Agent output schema includes `suggestedLovable: { needed: bool, rationale: string }` block — no dollar estimate fields (REQ-004 consistent).
- [ ] Scope doc renders the Lovable recommendation as a separate note with a clear "paid directly to Lovable" disclaimer; no dollar figure shown.
- [ ] Project table adds: **two distinct flags** — `lovable_recommended BOOLEAN DEFAULT false` (Discovery's recommendation; **v1: always true — every project is Track A, decision-19**; retained as a flag for post-v1) AND `lovable_enabled BOOLEAN DEFAULT false` (NGO completed setup; drives status-widget visibility and MCP connector reminders) — plus `lovable_workspace_url TEXT`, `lovable_status TEXT DEFAULT 'not_enabled' CHECK (lovable_status IN ('not_enabled','active','credits_low','blocked'))`.
- [ ] Project page renders the Lovable Status widget when `lovable_enabled = true`; widget is hidden otherwise.
- [ ] Volunteer can change `lovable_status` from their project page; transitions to `credits_low` or `blocked` trigger notifications (REQ-016).
- [ ] NGO can transition `lovable_status` back to `active` via the "I've topped up — unblock" CTA.
- [ ] **No inbound mail parser in v1.** Credit-status detection is manual via the Lovable Status widget only (deferred to v1.5 per §11).
- [ ] "Top up Lovable credits →" CTA opens Lovable's billing page in a new tab (deep link to workspace URL when set; fallback to `https://lovable.dev/settings/billing`).
- [ ] **Lovable setup auto-initiated at kickoff (v1, decision-19):** when a project reaches `in_progress` (always `lovable_recommended = true` in v1), ai4good auto-raises the `lovable_setup_pending` blocker — no volunteer "use Lovable?" choice. The skip-to-Claude-Code-only opt-out is removed in v1 (reserved post-v1).
- [ ] **`projects.lovable_skipped_at TIMESTAMPTZ`** column retained but **reserved** — never set in v1 (the skip opt-out is removed, decision-19); kept for no-migration reinstatement of post-v1 Track B.
- [ ] **`lovable_setup_pending` blocker** auto-raised at kickoff (v1 — no volunteer opt-in needed, decision-19); severity `blocking`; resolved by ai4good auto-validation after step 9 of the checklist (URL + MCP `last_seen_at` validation). Added to REQ-024 blocker types + CHECK constraint + unique partial index.
- [ ] NGO setup guide at `/docs/lovable-setup-guide` covers the **11-step checklist** (steps 1-4 NGO; 5-9 volunteer; 10-11 ai4good auto-validation). **NGO does ZERO GitHub work** — once NGO completes steps 1-4, volunteer drives the rest. **Platform admin is NOT involved** in per-project Lovable setup.
- [ ] **ai4good Lovable Setup page** in the platform UI provides (reachable for every project — v1: `lovable_recommended` always true, decision-19):
  - (a) Scope-summary text (one-click copy; NGO pastes into Lovable project intake at step 2)
  - (b) Volunteer's Lovable email (one-click copy; NGO pastes into Lovable's invite-as-workspace-admin field at step 3)
  - (c) ~~ai4good MCP server URL~~ + (d) ~~workspace bearer token~~ — **REMOVED by decision-20** (no ai4good connector in Lovable; step 7 is a retired row)
  - (e) Knowledge snippet text (one-click copy; optional step 8 — asks Lovable to include the Linear identifier where practical)
  - (f) Paste-back form (URLs + IDs from step 9) with inline validation
  - (g) Checklist UI showing which steps are complete + which actor needs to do what next
- [ ] Knowledge snippet is provided as a **best-effort signal** (not load-bearing): "When committing ai4good work, include the Linear issue identifier (e.g. `A4G-12`) in the commit subject for readable git history." Status is driven by Linear's GitHub integration on PR merge (decision-20), never by parsing.
- [ ] ~~MCP connector token~~ — **RETIRED (decision-20):** `tok_workspace_*` is reserved-never-issued; the only volunteer credentials are the REST bearer token (REQ-008) + the gateway virtual key (REQ-009).
- [ ] Volunteer's permission to drive step 6 (Lovable → GitHub → create `ai4good-projects/<slug>`) is granted **at volunteer onboarding via REQ-007** — volunteer is added as Member of `ai4good-projects` org with `Repository creator` base permission on first GitHub link. **No per-project JIT grant needed** for the Lovable flow.
- [ ] Handoff runbook (REQ-012) includes the "NGO removes volunteer from Lovable workspace; ai4good's GitHub App remains on the repo until NGO opts to remove it on full ownership transfer" step.
- [ ] Pre-kickoff reminder banner shown to NGO when `matched_pending_fuel` AND `lovable_recommended = true` — same as before, but now the followup blocker is `lovable_setup_pending` (volunteer-initiated post-kickoff) rather than an admin-driven ops task.

**Explicit non-goals for v1 (clarifies the boundary):**
- ai4good does **not** subscribe to Lovable on behalf of NGOs.
- ai4good does **not** meter or attribute Lovable credit consumption (no Lovable usage API exists).
- Lovable cost is **not** debited from fuel; it is a separate NGO-direct expense, surfaced transparently in Discovery.
- ai4good does **not** provide the NGO's Lovable payment method.
- ai4good does **not** resell Lovable credits in v1 (no reseller agreement with Lovable). NGOs purchase credits directly from Lovable via the deep-linked CTA. v2 may revisit if a partnership agreement is in place.
- **ai4good's *backend* does not poll `mcp.lovable.dev`** (no server-side OAuth; Lovable MCP is user-scoped, so a backend integration would require each NGO to grant ai4good account-wide access — over-broad). **However, the *volunteer's* Claude Code Skill DOES call `mcp.lovable.dev` `get_workspace` during Track-A orchestration** (under the volunteer's own OAuth, behind the consent gate + `LovableDriver` port) to surface the NGO's credit balance and enforce the per-task budget cap (REQ-021/028). So credit visibility exists in v1 — it's client-side (Skill), not server-side (backend). A future **backend** billing integration is deferred until Lovable ships scoped OAuth (e.g. `billing:read`) or a billing webhook (Lovable MCP is Research Preview; the April 2026 BOLA incident reinforces caution about backend account-wide access).

**Dependencies:** REQ-004 (Discovery sets `lovable_recommended`), REQ-008 (GitHub repo — Lovable path is NGO-driven), REQ-010 (project page dual-fuel-meter), REQ-016 (notifications), REQ-024 (`github_collaborator_needed` blocker for dual-rail), REQ-026 (Linear task rail — Lovable needs no ai4good connector, decision-20).

---

#### REQ-022: Stripe Connect for Volunteer Tips (DEFERRED to v1.5 per §11)

**Description:** Enables NGOs to send optional gratitude tips directly to volunteers at handoff (Story 6). Volunteers onboard to Stripe Connect Express to receive funds. Platform takes **0% on tips** — only standard Stripe processing fees apply.

**Status:** **Deferred to v1.5.** Stripe Connect Express onboarding + destination charges + held-intent flow + dispute/refund handling + 1099/T4 reporting is meaningful infrastructure and not load-bearing for the core thesis (NGO + volunteer + fuel + handoff). v1 handoff sign-off does not present a tip CTA. Volunteer reputation in v1 = completion credit only (REQ-014 minimal). v1.5 trigger: first pilot handoff where NGO asks "how do I thank the volunteer with money?"

**v1.5 acceptance criteria (when built):**
- Stripe Connect Express onboarding flow from volunteer dashboard ("Enable tips" CTA)
- Onboarding gated to volunteers with ≥1 handoff
- Tip Checkout at handoff: $25 / $50 / $100 / custom; `transfer_data[destination] = volunteer_connected_account_id`
- `application_fee_amount = 0`
- Tip recorded in `tips` table (not fuel_transactions)
- Held-intent flow if volunteer hasn't onboarded (30d to claim or auto-refund)
- Tax form handling via Stripe Connect

**Dependencies (when built):** REQ-006 (Stripe baseline), REQ-012 (handoff sign-off).

---

#### REQ-023: Platform Triage Gate (compliance review before marketplace)

**Description:** Every project must pass a platform-admin compliance review between scope completion and marketplace publication. Triage protects the platform's open-source-only and nonprofit-mission norms, and gives the platform a chance to catch policy violations (commercial intent, surveillance tooling, abusive scope) before exposing the project to volunteers.

**Triage scope (what the reviewer checks):**

1. **Open-source alignment** — scope does not require commercial / closed-source-for-resale outputs (private repos allowed per Platform Promise §2 for legitimate confidentiality, but never for commercial resale).
2. **Nonprofit purpose** — the ask actually serves the NGO's stated mission (per the verified NGO profile).
3. **Scope reasonableness** — proposed scope matches the `complexityEstimate` (small / medium / large) from Discovery; no extreme mismatch between described work and Discovery's complexity tier. (v1 does not produce a dollar budget; reasonableness is a qualitative check on scope vs. complexity.)
4. **Policy compliance** — no surveillance, spam infrastructure, illegal use, or content violating ai4good's acceptable-use policy.
5. **Private-repo justification (Platform Promise §2):** if NGO requested `visibility = 'private'`, reviewer confirms the `visibility_justification` is legitimate (e.g. handles real PII / classified info, internal-only workflow). Reject if the justification reads as "just don't want anyone to see" without a real confidentiality need — that's a sign the project may be commercial-leaning.
6. **Data-sensitivity gate (decided 2026-06-03 — Item 1):** reviewer sees the Discovery `dataSensitivity.tier` + rationale and confirms it's classified correctly (escalate up if the project obviously handles health/immigration/abuse-victim/financial data but is tagged below Tier 2). For **Tier 2**, the reviewer confirms a **fixtures-only build plan** is in the scope (synthetic/anonymized sample data; real data connected only post-handoff) — if the scope implies real special-category data flowing through Anthropic/Lovable/the volunteer, **bounce back with `changes_requested`** until it's fixtures-only, or reject. Tier-2 projects also default to `visibility = 'private'`.
7. **Discovery `risk_flags`** — reviewer sees these pre-surfaced as focus areas.

**Acceptance Criteria:**
- [ ] On NGO "Publish" (REQ-005), project status transitions to `triage`, not `open`.
- [ ] `triage_submitted_at` recorded; project enters platform admin's triage queue UI.
- [ ] Admin queue UI (`/admin/triage`) lists pending triages sorted by `triage_submitted_at` ascending, with: project title, NGO name + verification tier, scope summary, **complexity tier (small/medium/large)**, Discovery `risk_flags`, "Approve" / "Reject" / "Request Changes" actions.
- [ ] Reviewer can: **Approve** → status → `open`; **Reject** → status → `cancelled` with reason; **Request Changes** → status → `scoped` with reviewer comments visible to NGO.
- [ ] All decisions recorded: `triage_decision`, `triage_decided_at`, `triage_reviewer_id`, `triage_comments`.
- [ ] NGO sees current triage state on project page: "Awaiting platform review (typically within 48 hours)" while in `triage`.
- [ ] NGO receives email + in-app notification on triage decision (`triage_approved`, `triage_rejected`, `triage_changes_requested` — added to REQ-016 event types).
- [ ] **SLA target:** 48 hours from `triage_submitted_at` to decision during v1 pilot. Dashboard surfaces aging-queue items.
- [ ] **All NGOs go through triage in v1.** (v1 has only `verified` and `unverified` tiers — `kyc_verified` is v1.5 per §11. KYC auto-approval / triage-skipping is a post-v1.5 v2 option once the KYC tier ships and triage volume justifies it.)
- [ ] Re-submission after `changes_requested`: project re-enters triage; previous comments visible to reviewer for context.
- [ ] Triage queue access restricted by RLS to `platform_admin` role only.

**Task Breakdown Hint:**
- Task 23.1: Schema additions to `projects` table (~2h)
- Task 23.2: Triage queue UI for platform admin (~8h)
- Task 23.3: Triage decision actions + state transitions (~5h)
- Task 23.4: NGO-side "awaiting review" status display (~3h)
- Task 23.5: Notifications for triage decisions (~3h)
- Task 23.6: Acceptable-use policy doc (`/docs/aup`) for reviewer reference (~4h)

**Dependencies:** REQ-001 (Auth roles), REQ-005 (publish flow), REQ-016 (notifications).

---

#### REQ-024: Project Blockers (orthogonal operational health)

> **› Decision-10 (2026-06-06) override:** REQ-024 (task #43) shrinks to *table + form + emit*: `project_blockers` schema + the raise/resolve UI + indicators + the NGO "Action needed" rail. On raise/resolve it ONLY calls `notify()` (REQ-016) — it no longer posts system messages itself, and its **48h/7d aging cron moves into the single merged hourly aging scan** (task #41, shared with inactivity 14d/21d and unmatched-open 7d). All v1 ACs below are preserved; only the cron ownership + comms-write path changed.

**Description:** Captures **operational blockers** within a project, orthogonal to lifecycle status. A project can be `in_progress` and healthy, or `in_progress` with one or more unresolved blockers (e.g. dev waiting on NGO clarification, fuel depleted, Lovable credits low). This distinction is essential — it separates "dev is ghosting" from "dev is waiting on someone else", which directly affects volunteer reputation, NGO-satisfaction signal, and platform-admin escalation decisions.

**Blocker types (v1):**

| Type | Raised by | Severity options | Auto-resolution path |
|---|---|---|---|
| `clarifying_question` | Dev (manual) | info / warning / blocking | Manual: dev or NGO clicks Resolve |
| `awaiting_ngo_review` | Dev (manual) | info / warning | Manual |
| `external_dependency` | Dev (manual) OR Auto (kickoff sub-types) | info / warning / blocking | Manual (or auto for sub-typed variants) |
| `github_collaborator_needed` | Dev (manual via "I need Claude Code on this repo" CTA — rare legacy case where NGO insisted on hosting in their own GitHub instead of ai4good-projects) | blocking | Auto: NGO confirms in ai4good UI (a) volunteer added as repo collaborator AND (b) ai4good GitHub App installed on the repo. ai4good verifies via GitHub API once App is installed. |
| `lovable_setup_pending` | Volunteer (manual via "Set up Lovable" decision on post-kickoff banner — open-item-4 2026-05-26) | blocking | Auto: ai4good validates step-9 paste-back (URLs + MCP last_seen_at). Checklist visible to both NGO + volunteer; NGO does steps 1-4, volunteer does steps 5-9, ai4good does steps 10-11. Either party can ask clarifying_question if stuck. |
| ~~`spend_anomaly_review`~~ | **DEFERRED to v1.5 (decision-14)** — the REQ-009 anomaly scorer that raised this is not built in v1. Type stays reserved in the schema enum for v1.5; nothing raises it in v1. |
| `fuel_topup_needed` | Auto (REQ-009 fuel ingest) | warning at 20%, blocking at 0% | Auto: balance > 20% triggers resolution |
| `lovable_credits` | Dev manual via Lovable Status widget (REQ-021) | warning / blocking | Manual: NGO clicks "I've topped up — unblock" on the project page. (v1.5: optional inbound email parser also auto-detects.) |

**Dedup rules:**
- `fuel_topup_needed`, `lovable_credits`, `github_collaborator_needed`, `lovable_setup_pending`, `spend_anomaly_review`: at most one unresolved row per project; severity upgrades in place (warning → blocking) without creating duplicates. Enforced by the unique partial index in Technical Considerations.
- Manual types (`clarifying_question`, `awaiting_ngo_review`, `external_dependency`): multiple distinct unresolved instances per project allowed (devs may have several concurrent open questions).

**Notification flow (added to REQ-016):**

| Event | Notified | Channel | Timing |
|---|---|---|---|
| Blocker raised (manual) | NGO admins | Email + in-app + project-page Action-needed rail (decision-15) | Immediately |
| Blocker raised (auto: fuel warning) | NGO admins | Email + in-app | Immediately |
| Blocker raised (auto: fuel blocking) | NGO admins + platform admin (escalation) | Email + in-app + project-page Action-needed rail (decision-15) | Immediately |
| Blocker raised (auto: Lovable) | NGO admins | Email + in-app (dedup with REQ-021's existing notification) | Immediately |
| Blocker resolved | Dev + NGO admins | In-app + project-page Action-needed rail (decision-15) | Immediately |
| Blocker aging 48h | NGO admins | Email reminder | 48h after raised_at |
| Blocker aging 7d (escalation) | NGO admins + platform admin | Email + admin queue; project flagged "at risk" | 7 days after raised_at |

**Per-type aging overrides (codex round 7 fix — types with their own escalation timing override the generic 48h/7d):**

| Blocker type | Aging override |
|---|---|
| ~~`spend_anomaly_review`~~ | **DEFERRED to v1.5 (decision-14)** — no v1 raiser (REQ-009 anomaly scorer deferred), so no aging override needed in v1. |
| `lovable_setup_pending` | Generic 48h reminder + 7d escalation apply — escalation message routes to the NGO + volunteer (not admin) since this is a between-actors blocker; admin only sees it on 7d if both parties have been silent. |
| All other types | Generic 48h reminder + 7d escalation per main table above. |

**Surface (decision-15 — notifications feed + project page; no chat channel in v1):**
- Dev clicks "🚩 Raise a flag" on the project page → modal asks for type, severity, title, body
- New `project_blockers` row created; a `blocker_raised` notify() event fires (NGO admins; in-app + email) and the blocker shows on the project-page **"Action needed" rail**
- The resolution conversation happens in the blocker's **Clarifications Q&A** (`project_blockers.resolution_note`) + the **project comment thread** (REQ-015)
- On resolution: a `blocker_resolved` notify() event fires; the Clarifications Q&A log keeps the question + answer pair (REQ-024 persistent log)

**Cascade on lifecycle transitions:**
- When project transitions to `handoff_pending`, all open blockers are auto-archived with `resolution_reason = 'project_moved_to_handoff'` (no false-positive aging emails on completed work).

**Clarification as first-class UX (special handling for `type='clarifying_question'`):**

- **Two entry points** for raising clarification blockers — both use the same underlying mechanism but differ in scope:
  - **Project page → "❓ Ask NGO a question"** — general question not tied to a specific task; `task_id = NULL`
  - **Task page → "❓ Raise concern on this task"** — anchored to a specific task; `task_id = <task uuid>` (links blocker to that task in REQ-026)
- Both routes lead to the same structured form: topic, what you've tried, what you need to know. Single-click for the most common dev-blocking action.
- **Project-page banner when any unresolved `clarifying_question` exists:**
  > ⏸️ *Awaiting NGO clarification (1 question raised 2h ago) — Volunteer can continue with other tasks; this one is paused.*
  Visible to NGO (call to action: answer) and to volunteer (status indicator). Replaces the generic 🚩 badge specifically for clarification cases.
- **Persistent "Clarifications" Q&A log tab** on the project page. When a `clarifying_question` blocker resolves, its `resolution_note` becomes the **answer**; the original `title` + `body` are the **question**. Each entry persists for the project's lifetime as a Q&A pair (who asked, who answered, when). Useful for handoff context, future post-handoff contributors (REQ-017), and cross-project search. No new schema — `resolution_note` already captured.

**Surfacing in UI:**
- **Project page (REQ-010):** 🚩 badge (top-right) with count of unresolved blockers + severity color; click expands the blocker list panel. **Clarification-type blockers also surface via the dedicated banner above (rather than only the badge).**
- **Project card (marketplace + dashboards):** Compact 🚩 N indicator with severity color + most-severe blocker title on hover.
- **NGO Dashboard (REQ-013):** "Action needed" rail at top — open blockers across all active projects, sorted by severity then age. Aging blockers (>48h) get visual emphasis (red border / pulsing dot).
- **Cadence stats (REQ-010):** `Quiet` / `Stalled` badge annotated with "(blocked on NGO action)" or "(blocked on fuel)" when applicable — separates "dev ghosted" from "dev waiting on someone else".
- **Volunteer profile (REQ-014):** Blockers do not negatively affect the volunteer's public completion credit (they're often outside the dev's control). Internal NGO satisfaction signal is the long-term measure of work quality.

**Acceptance Criteria:**
- [ ] `project_blockers` table created with schema specified in Technical Considerations.
- [ ] "🚩 Raise a flag" action available in the project channel UI for the assigned volunteer.
- [ ] Auto-blockers raised by fuel-ingestion worker (REQ-009) at warning + blocking thresholds with severity upgrade-in-place behavior.
- [ ] `lovable_credits` blocker raised by manual volunteer status widget (REQ-021) in v1. (Inbound email parser is v1.5 — adds an auto-raise path.)
- [ ] Manual resolution via "Resolve" CTA (dev or NGO); resolution note required.
- [ ] Auto-resolution for `fuel_topup_needed` and `lovable_credits` on the conditions documented above.
- [ ] Cascade-archive on `handoff_pending` transition.
- [ ] Notifications fire per the matrix above.
- [ ] The blocker branch of the pg_cron → `aging-scan` Supabase Edge Function (Deno) hourly job fires `blocker_aging_48h` / `blocker_aging_7d_escalation` via the shared notify() Deno module; job_runs heartbeat.
- [ ] Project page renders 🚩 badge + blocker list; marketplace cards render compact indicator.
- [ ] NGO Dashboard "Action needed" rail surfaces blockers across the NGO's projects.
- [ ] Cadence stats annotation when blocker is unresolved during `in_progress`.

**Task Breakdown Hint:**
- Task 24.1: `project_blockers` schema + RLS (~3h)
- Task 24.2: "Raise a flag" modal in channel UI + create blocker (~5h)
- Task 24.3: Auto-blocker creation hooks in fuel ingestion (REQ-009); manual Lovable Status widget integration (REQ-021) (~4h)
- Task 24.4: Resolve flow (manual + auto) (~5h)
- Task 24.5: `blocker_raised` / `blocker_resolved` notify() events → notifications feed + Action-needed rail (decision-15; no channel) (~2h)
- Task 24.6: Aging-blocker branch of the pg_cron → `aging-scan` Supabase Edge Function (Deno) hourly job (merged blocker 48h/7d branch) + notify() + job_runs heartbeat (~5h)
- Task 24.7: Project-page 🚩 badge + blocker panel (~5h)
- Task 24.8: Marketplace / dashboard card indicator (~3h)
- Task 24.9: NGO Dashboard "Action needed" rail (~5h)
- Task 24.10: Cadence stats annotation (REQ-010) (~3h)

**Dependencies:** REQ-009 (fuel ingestion), REQ-010 (project page), REQ-013 (NGO dashboard), REQ-015 (project comment thread — decision-15), REQ-016 (notifications), REQ-021 (manual Lovable Status widget).

---

#### REQ-025: Change Requests (in-flight scope additions)

> **› Decision-10 (2026-06-06) override + decision-9 fix:** REQ-025 (task #44) shrinks to *table + 3-field form + emit*: Accept/Decline rendered via #34's actionable-message primitive; `cr_raised`/`cr_decided` via `notify()` (REQ-016). **On Accept, the new p0 issue is created in the project's Linear workspace via the API (platform actor — decision-20)** under a "Change Request: [title]" parent; the `linear-webhook` projection mirrors it back — it does **NOT** `INSERT` into `project_tasks` directly (one-writer invariant unchanged). Any AC below that says "create the PM task" means via the Linear API path, not a direct projection write.

**Description:** Allows NGOs to raise structured Change Requests (CRs) for additional scope while a project is `in_progress`. The assigned volunteer (project lead) accepts or declines — a binary decision, not an estimation exercise. Fuel consumption is **progressive**, not decisive: there is no upfront per-CR fuel quote or per-CR Stripe top-up. Accepted CRs simply add to the project's working scope; fuel is consumed from the existing project pool as work happens, and the existing `fuel_topup_needed` blocker (REQ-024) + Stripe top-up flow (REQ-006) handle replenishment when needed.

**Design principles (locked in):**

| Principle | Why |
|---|---|
| **NGO raises; volunteer (project lead) decides** | Keeps power symmetric. NGO drives scope intent; volunteer is the work-acceptance authority. |
| **No upfront estimation by the volunteer** | Estimation is its own skill and creates asymmetric power / conflict of interest. Volunteers shouldn't have to translate "this feature" into "$X of Anthropic spend." |
| **Fuel is progressive, not decisive** | No upfront per-CR funding moment. Work happens against existing fuel; top-ups are reactive via the existing fuel-low blocker flow. |
| **Volunteer's decline is a legitimate boundary** | Declining a CR does NOT penalize the volunteer's public completion credit or badges. (NGO satisfaction signal collection is v1.5 per §11 — REQ-014 minimal in v1 has no satisfaction surface.) |
| **AI-agent-assisted assessment is roadmap (v2), not v1** | A future AI Change-Request Agent could produce cost/time estimates and acceptance-criteria drafts; v1 ships the minimal-machinery workflow first. |

**The v1 minimal flow** (per §11 — full dedicated CR section + completion detection deferred to v1.5):

1. **NGO raises a CR** via a 3-field form (title, description, rationale) linked from the project page (visible during `in_progress` only).
2. CR is stored in `change_requests` table with `status='pending_review'` and **surfaces as an actionable CR row on the project page** (decision-15 — the CR row is the surface, not a chat message): *"📝 [NGO admin] raised a change request: '[title]'. — [Review]"*.
3. Volunteer receives a `cr_raised` notification (REQ-016) carrying inline **Accept / Decline** actions (the actionable-message primitive) + sees the CR row on the project page. **No chat channel in v1 (decision-15)** — the CR row (project page + notification) is the surface.
4. Volunteer reviews and clicks **Accept** or **Decline** on the CR row / notification, with an optional note.
   - **Accept** → CR `status` → `accepted_active`. Platform creates **a single Linear issue** (REQ-026, platform actor via API) under a "Change Request: [title]" parent, with the CR's `description` as the issue body and the `p0` label (codex round 6 — CR-accepted work blocks handoff just like original scope; the whole point of accepting a CR is committing to ship it). Volunteer can break it down into sub-issues in Linear; sub-issues default to p0 but the volunteer CAN downgrade specific ones to p1/p2 if scope exceeds what they signed up for — that downgrade is an explicit action visible in Linear's history, not silent. **No GitHub Issues are created** — GitHub Issues remain dev-internal only. NGO receives `cr_decided` notification. (v1.5 adds an AC field to the CR form + AI Change-Request Agent that auto-derives multiple sub-tasks, per §11.)
   - **Decline** → CR `status` → `declined` with note. NGO receives `cr_decided` notification. Can revise + re-raise as a new CR.
5. **Work proceeds** under the existing fuel/Lovable systems — no special CR-level instrumentation. The CR-derived PM task (and any sub-tasks the volunteer added) appears in the regular PM task tree under "Change Request: [title]" — that's where progress shows.
6. **If fuel runs low** during CR work: the existing `fuel_topup_needed` blocker (REQ-024) fires; NGO tops up via REQ-006.
7. **Completion is implicit in v1** — when all PM tasks in the CR sub-tree are `done`, the NGO sees the progress in the normal PM tree. **No `cr_completed` event in v1** (deferred to v1.5). NGO can manually mark the CR `status='completed'` from a small admin link on the CR row if they want to close it out.

**CR guardrails — volunteer-focus protection (decision-16, 2026-06-09):** the NGO can request changes, but the volunteer's focus is the **default-protected state** — a CR never interrupts and never auto-assigns work:
- **Opt-in, never interrupt.** A CR fires a **low-tone** `cr_raised` (in-app + the volunteer's **CR inbox**; **no per-CR email blast**) and surfaces at **session bootstrap / between tasks**, not as a real-time ping. The volunteer reviews CRs at their own cadence. **Only Accept creates the p0 task** (REQ-026) — the dev is never auto-assigned work.
- **One open CR at a time** (`platform_settings.max_open_crs_per_project`, default **1**; v1 hard-enforces 1 via the unique partial index on `change_requests(project_id) WHERE status='pending_review'`). The NGO **cannot submit another CR until the volunteer decides the current one** — caps the "anxious NGO fires many CRs" pile-up at the source.
- **Decline is penalty-free and the default-protected choice.** Declining never affects completion credit (REQ-014); the volunteer signed up for the *original* scope, and the CR UI presents Decline as a normal, no-penalty action.
- **NGO framing at submission.** The CR form shows: *"A change request is optional — the volunteer decides whether and when to take it on. Accepted changes add scope, may extend the timeline, and consume more fuel."*

**Acceptance Criteria (v1 minimal):**
- [ ] **One open CR per project (decision-16):** the "Request a Change" CTA is **disabled** (with *"You already have a change request awaiting the volunteer's review"*) whenever a `pending_review` CR exists — enforced by the unique partial index (`max_open_crs_per_project`, v1 = 1).
- [ ] **`cr_raised` is low-tone (decision-16):** in-app + the volunteer's CR inbox, surfaced at **session bootstrap**; **no email blast**. **Only Accept** creates the PM task — no work is auto-assigned by a raised CR.
- [ ] **Submission framing** is shown on the CR form (optional / volunteer-decides-if-and-when / adds scope + time + fuel).
- [ ] "Request a Change" CTA visible on project page only during `in_progress`.
- [ ] CR form fields: title (required), description (required, markdown), rationale (required).
- [ ] CR surfaces as an actionable CR row on the project page + an actionable `cr_raised` notification (Accept / Decline rendered inline for the assigned volunteer — decision-15; no chat channel).
- [ ] Accept / Decline records `decided_at` and `dev_response_note`.
- [ ] On Accept, platform creates **one Linear issue** (REQ-026, API, platform actor) under a "Change Request: [title]" parent, with the CR's `description` as the issue body and the **`p0` label (so CR-accepted work blocks handoff per REQ-012; codex round 6 fix)**. Volunteer can add sub-issues in Linear, which also default to `p0`; explicit downgrades are visible in Linear history. Projection row IDs stored on the CR record (`change_requests.created_task_ids`). **No GitHub issues are created.** (v1.5 enhancement: AC field + AI agent for multi-issue auto-derivation.)
- [ ] Notifications: `cr_raised` (→ volunteer), `cr_decided` (→ NGO). **No `cr_completed` notification in v1** (deferred).
- [ ] Volunteer's public completion credit (REQ-014) is **not** affected by declining CRs.
- [ ] NGO can manually mark CR `completed` via a small action link on the CR row (for record-keeping).

**v1.5 (deferred per §11):**
- Dedicated "Change Requests" section on the project page grouped by status
- Automatic CR completion detection (all linked PM tasks `done` → fires `cr_completed` event + activity-feed entry)
- AI Change-Request Agent (drafts acceptance criteria from CR free-text)
- NGO-side cancellation flow for `pending_review` CRs

**Task Breakdown Hint (v1 minimal):**
- Task 25.1: `change_requests` schema + RLS (~3h)
- Task 25.2: "Request a Change" form (NGO side; minimal modal) (~3h)
- Task 25.3: CR-row actionable surface (project page + notification) with inline Accept/Decline buttons (volunteer side) — decision-15 (~4h)
- Task 25.4: Linear issue creation on Accept via API (under a "Change Request: [title]" parent, REQ-026) (~4h)
- Task 25.5: Notifications wiring for `cr_raised` / `cr_decided` (~2h)
- Task 25.6: NGO "mark completed" action link (~1h)

**Dependencies:** REQ-006 (fuel top-up — used reactively), REQ-010 (project page — hosts the CR row, the v1 CR surface per decision-15), REQ-016 (notifications — carries the actionable Accept/Decline), REQ-024 (fuel blocker for low-balance handling), REQ-026 (creates PM tasks, NOT GitHub issues).

**v2 roadmap notes (out of scope for v1 and v1.5):**
- Reducing scope mid-project (drop a requirement) — currently handled informally
- Splitting a project into multiple via CR — not on the roadmap

---

#### REQ-026: Platform Task Management (Linear as system of record, mirrored to Postgres — decision-20)

> **⚠️ Decision-20 re-architecture (2026-07-05) — REPLACES decision-9's git-as-truth `tasks.json` tree.** Ground: **"real signals, not AI-authored narratives"** — under decision-9 the volunteer's *agent* was the designed writer of task state, so every NGO-visible status was ultimately agent prose with a git wrapper. Linear provides what the platform actually needs: native **webhooks** (event-granular, real-time, actor-attributed) feeding progress projection; an enforceable read/write split; no shared-file merge conflicts under parallel worktrees; a hosted backlog that exists **pre-clone** (an onboarding surface); and OAuth-per-volunteer attribution for free. **Deleted from v1:** TaskMaster + `tasks.json` in the project repo, the Skill auto-commit hook (REQ-028), the `github-webhook` `tasks.json` ingest + diff, the `head-sha-reconcile` worker, the bootstrap-from-Discovery git commit, and the export-proxy endpoint. The dead ai4good-MCP-in-Lovable Chat-Connector machinery (a decision-9 orphan) is deleted with them — the Linear MCP replaces that surface entirely.

**Description:** Task state lives in **Linear** — one **free Linear workspace per NGO project** (mirrors the Lovable workspace-per-project pattern). Volunteers (and their agents, via the volunteer's OAuth) read the backlog, self-assign, and comment; **status transitions are deterministic** — Linear's GitHub integration moves issues on PR merge. ai4good observes via Linear webhooks and mirrors into the Postgres `project_tasks` **projection** for the NGO-facing Status Panel (REQ-010) and the REQ-033 assistant. **One-way mirror: Linear → Postgres.** GitHub Issues stay dev-internal for code bugs only (REQ-008).

**Platform-owned coordination infrastructure (write this asymmetry down):** delivery infrastructure is NGO-owned (the Lovable workspace, the repo); **coordination infrastructure is platform-owned (Linear, the gateway) — it does not transfer at handoff.** Post-handoff the workspace sits dormant at $0; a CI job snapshots the task tree into the repo as markdown for handoff residency (hedges exportability + dependency risk). If a paid Linear tier is ever required, the platform pays — never the NGO.

**Workspace provisioning — pool model (decision-20 amendment, 2026-07-05):** Linear's free plan includes API + webhook access, unlimited members, 2 teams, and a 250-active-issue cap — verified at docs level 2026-07-05; the first project workspace doubles as the empirical test. **Workspace creation has no public API**, so creation is moved OFF the kickoff critical path: the concierge **pre-creates a pool of ready workspaces in batch** (neutral names `a4g-pool-N`; per workspace: platform API key → Vault, webhook registered → secret in Vault, GitHub integration pre-connected to `ai4good-projects` with all-repositories scope so later-created repos are picked up automatically). **Kickoff is then API-only:** assign the next `ready` pool workspace to the project, rename it (`organizationUpdate` — `name` + `urlKey`; Linear keeps + redirects prior URL keys), set the team key to the project slug, invite the volunteer, push the decomposition. A `linear_pool_replenish` ops_task fires when the ready pool drops below the watermark (default 3) — the concierge tops up on their own schedule instead of blocking a kickoff. Pool empty at kickoff = `external_dependency` blocker + urgent replenish task (the only stall mode). **Two [VERIFY] items on the first pool batch:** (a) `organizationUpdate` rename works on the free tier via the workspace API key; (b) the pre-connected GitHub integration sees repos created after connection. **Honest note:** bulk-provisioned empty workspaces sharpen — not soften — the fair-use question; the "written blessing from Linear" probe is a stronger prerequisite under the pool model than it was per-project.

**Decomposition (coordinator-owned; automation drafts, a human owns):** at funding, the platform drafts the issue tree from Discovery's `userStories[]` + `acceptanceCriteria[]` (one parent issue per story, one sub-issue per acceptance criterion, `p0` label); the platform admin (concierge coordinator) reviews/edits the draft; the approved tree is pushed via the Linear API. **Task briefs must be session-sized and dependency-ordered** — a platform/coordinator responsibility, and the precondition for both pull-model correctness and per-task burn data meaning anything (REQ-034). Backlog sequencing is encoded with Linear blocking relations at decomposition time.

**Pull-based workflow (volunteer-facing):**
- **Self-assignment is the commitment signal** — the assignment webhook flips the panel to "in progress." Volunteers pull the next unblocked issue; the coordinator does not push assignments.
- Norms (carried in CLAUDE.md + the injected governance prompt, REQ-009): one issue in progress at a time (one per worktree if parallel); assign before starting; comment when blocked; **never move status by hand**.
- Onboarding sequence: match → workspace invite (API) → volunteer browses session-sized briefs **before cloning anything** → first Claude Code session OAuths the Linear MCP via the repo's committed `.mcp.json` (one-time; silent refresh after) → first pull activates attribution (REQ-034).
- **Staleness:** an in-progress issue with no branch activity for N days raises a coordinator flag proposing release back to the backlog (a branch of the REQ-027 aging scan).
- **Agentic loops:** volunteers are free to run loops — the governance stack is request-shaped and loop-agnostic. The repo template ships a skeptical reviewer-agent skill (a default, not a wall); loops must degrade gracefully on MCP auth failure (queue Linear updates locally, surface at session end); **loop PRs are never auto-merged.**

**Write authority (real-signals enforcement):**

| Actor | Can | Cannot |
|---|---|---|
| Volunteer + their agents (volunteer OAuth) | Read everything; comment freely; assign self | **Change issue status** |
| Linear GitHub integration | Move status on branch/PR events (merge → Done) | — |
| Platform (API actor) | Create issues (decomposition, CR-accept), invite members, revert, cancel p1/p2 at handoff | — |
| NGO | Nothing in Linear (no seats) — visibility is the Status Panel exclusively | — |

- Linear OAuth scopes **cannot express** "assign+comment but no status change," so the split is enforced one layer up: **detect-and-revert** — the `linear-webhook` Edge Function auto-reverts any status-change event whose actor is not the GitHub integration and which has no linked merged PR, via the API, with an explanatory comment. A wrapper-MCP (a proxy exposing only list/read/assign/comment) is held in reserve; *trigger: detect-and-revert proves noisy.*
- Agent actions are attributed to the volunteer's Linear identity — human vs agent is indistinguishable in webhooks (accepted; the volunteer owns their agents' actions). Convention only: agents prefix their comments.

**Projection (`linear-webhook` Supabase Edge Function, Deno):** receives issue/assignment/comment/status webhook events (signature-verified), upserts `project_tasks` rows (`linear_issue_id`, `linear_identifier` e.g. `A4G-12`, title, status, labels → `priority`, parent linkage, assignee), records one `audit_events` row per delivery (`delivery_id` de-dup), and runs the detect-and-revert branch. The projection is written by this consumer **only**. NGO comments stay in Postgres `task_comments` (decision-15 — the project comment thread); **Linear comments are dev-internal** and are not mirrored into the NGO view.

**Lifecycle hooks:**
- **CR Accept (REQ-025):** the platform creates one `p0` Linear issue under a "Change Request: [title]" parent via the API (platform actor). No direct `project_tasks` write.
- **`handoff_pending`:** platform cancels remaining `p1`/`p2` not-started issues via API (audit comment: `lifecycle_handoff`); **p0 issues are never auto-cancelled** (handoff requires all p0 done, REQ-012). The CI snapshot job commits the final tree as markdown to the repo.
- **`handed_off`:** volunteer's workspace membership removed; projection marked read-only; workspace dormant at $0.
- **Abandonment (REQ-027):** the ex-volunteer's assigned in-progress issues are unassigned + returned to the backlog via API; membership removed.

**Acceptance Criteria (decision-20):**
- [ ] `project_tasks` survives as the **read-side projection** — written only by the `linear-webhook` consumer and lifecycle API jobs; adds `linear_issue_id` (unique) + `linear_identifier`; keeps join compatibility with `task_comments`, `project_blockers`, `audit_events`.
- [ ] **Pool assignment at kickoff (API-only):** next `ready` row in `linear_workspace_pool` → `organizationUpdate` rename (name + urlKey), team key set to the project slug, volunteer invited, labels set (`p0/p1/p2`, `change-request`), decomposition pushed after coordinator approval; pool row flips to `assigned` with `project_id`. Pool empty → `external_dependency` blocker + urgent `linear_pool_replenish`.
- [ ] **Pool replenishment (`linear_pool_replenish` ops_task, batch):** fires when ready count < watermark (default 3, `platform_settings`-tunable); concierge checklist per workspace: create (no API), mint platform API key → Vault, register webhook → secret in Vault, pre-connect the GitHub integration to `ai4good-projects` (all repositories), insert `ready` pool row.
- [ ] Decomposition draft generated from Discovery output; coordinator edit/approve step; push via Linear API; issues carry session-sized briefs + blocking relations.
- [ ] `linear-webhook` Edge Function: signature verification, projection upsert, `delivery_id` de-dup in `audit_events`, detect-and-revert on non-integration status changes (revert + explanatory comment + `linear_status_reverted` low-tone notification to the volunteer).
- [ ] Status flows only from the GitHub integration (PR merge → Done; branch link → In Progress). The volunteer-facing norm + the injected prompt say never to move status; detect-and-revert enforces it.
- [ ] NGO Status Panel (REQ-010) renders "Now working on" strip + hierarchical tree + activity feed from the projection (Supabase Realtime on row changes) — UI unchanged from the prior design; only the feed source changed.
- [ ] Volunteer can raise task-anchored `clarifying_question` blockers (REQ-024) from the panel or the Skill; NGO appends `task_comments`; scope changes go through CR (REQ-025) — all unchanged.
- [ ] Repo template commits `.mcp.json` (Linear MCP) + `.claude/settings.json` (ai4good-owned hooks, REQ-034) + the reviewer-agent skill; `.a4g/` carries the fingerprint (committed) and task binding (gitignored) per REQ-009/034.
- [ ] CI snapshot job: on `handoff_pending` (and weekly while `in_progress`), commit `docs/task-tree.md` snapshot to the repo (`job_runs` heartbeat `tree_snapshot`).
- [ ] Staleness branch in the hourly aging scan: in-progress issue, no linked branch activity for N days → coordinator flag (ops surface), proposing release to backlog.
- [ ] RLS on the projection mirrors `projects.visibility` (public → open SELECT; private → members only) — unchanged.
- [ ] **[VERIFY — architecture-deciding, run on the first pool batch]:** free-tier webhook registration + API mutations + programmatic invites + `organizationUpdate` rename (name + urlKey) + the pre-connected GitHub integration picking up later-created repos. Fallback if the free tier regresses: Basic tier (platform pays) or git-based task state with a deterministic truth layer.

**Task Breakdown Hint (decision-20):**
- Task 26.1: `project_tasks` projection schema deltas (`linear_issue_id`, `linear_identifier`) + RLS (~2h)
- Task 26.2: Decomposition draft from Discovery output + coordinator review surface + Linear API push (~6h)
- Task 26.3: Project page NGO view — strip + tree + activity feed from projection (~10h, unchanged)
- Task 26.4: `linear-webhook` consumer — verification, upsert, de-dup, detect-and-revert (~8h)
- Task 26.5: Workspace pool — `linear_workspace_pool` table + API-only kickoff assignment (rename/team-key/invite/labels) + `linear_pool_replenish` watermark task + replenish checklist UI (~4h)
- Task 26.6: NGO REST Edge Functions (context / comments / blockers) — unchanged surface (~5h)
- Task 26.7: CI tree-snapshot job + handoff cancel-p1/p2 + read-only-at-handed_off (~3h)
- Task 26.8: Staleness flag branch in the aging scan (~1h)

**Dependencies:** REQ-004 (Discovery output for decomposition), REQ-005.5 (lifecycle triggers), REQ-008 (GitHub App + the repo the GitHub integration links to), REQ-010 (panel), REQ-016 (notifications), REQ-024/025 (blockers/CRs), REQ-034 (attribution binding rides assignment). **New external dependency: Linear** (free workspace per project; coordination infra, platform-owned).

---

#### REQ-028: ai4good Claude Code Skill (volunteer-facing single pane of glass)

**Description:** A [Claude Code Skill](https://docs.claude.com/en/docs/claude-code/skills) shipped by ai4good that turns the volunteer's local Claude Code into the canonical operating environment for ai4good projects. The Skill packages ai4good's behavioral conventions, helper slash commands, and the **session-governance behaviors** (task binding, Linear pull-model norms — decisions 20/22) as installable, updatable agent code — rather than as docs the volunteer has to read and remember. **One-command install** (`claude skill install ai4good`); auto-runs on every Claude Code session opened in an ai4good repo.

> **Decision-20 impact (2026-07-05; supersedes the decision-9 note):** tasks live in **Linear**. The Skill (a) reads / self-assigns / comments issues via the volunteer's **Linear MCP** OAuth (never status — that's the GitHub integration's job, REQ-026), (b) maintains the per-worktree task binding `.a4g/task.md` via the PostToolUse assignment hook (REQ-034), and (c) calls ai4good's **REST API** for NGO-side context (blockers, comments, fuel, project context). The decision-9 tasks.json auto-commit hook is deleted — there is no tasks.json.

**Why a Skill (vs docs):** ai4good's operating model (commit-prefix convention, MCP server setup, when to use Lovable vs local, fuel-budget awareness, handoff checklist) is non-trivial. Putting it in docs means every volunteer reads it once at onboarding and then drifts. Putting it in a Skill means the behavior runs every session — and updates ship via Claude Code's standard Skill update mechanism, so the platform's opinion is always live and current. **Same packaging model used by Claude Code's official Skills** like `format-pdf` or `excel-create`.

**v1 minimal scope:**

- **One-command install:** `claude skill install ai4good` (Skill published open-source MIT to ai4good's GitHub; can also be registered with the Claude Code skill registry).
- **`.ai4good/config.json` in the repo** (committed; non-secret): `{ project_id, ai4good_api_base: "https://ai4good.dev/api" }`. Seeded by REQ-008 at repo creation. **Note (decisions 9/20):** no `mcp_server_url` field — there is no platform task MCP; tasks live in Linear via the repo's committed `.mcp.json`.
- **`~/.ai4good/config.json` in the volunteer's home dir** (gitignored; secret): `{ "<project_id>": { "token": "tok_volunteer_..." } }`. Populated via `claude skill exec ai4good login` (one-time per project). The token authorizes ai4good REST calls (context, blockers, comments) — task interaction goes through the Linear MCP, and LLM traffic through the gateway virtual key (three credentials, three revocation semantics).
- **Session bootstrap** (auto-runs at start of any Claude Code session in a repo containing `.ai4good/config.json`):
  - Reads `project_id` and `ai4good_api_base` from `.ai4good/config.json`
  - Reads bearer token from `~/.ai4good/config.json` (or env `AI4GOOD_PROJECT_TOKEN`)
  - Calls `GET ${ai4good_api_base}/projects/${project_id}/context` (REST) → primes session with scope summary, current status, in-progress tasks, unresolved blockers, recent NGO comments, fuel runway
  - Verifies the Linear MCP OAuth is live (prompts the one-time OAuth flow if not); reads the task binding (`.a4g/task.md`) and the volunteer's assigned-issue state; surfaces the CR inbox (decision-16)
  - Surfaces a one-line status banner: *"ai4good project foo-tool — A4G-12 in progress (2d) — $42 fuel remaining — 2 unread NGO comments."*
- **Task binding + degradation (decisions 20/22 — the load-bearing change):** the repo's committed `.claude/settings.json` carries the **PostToolUse hook on the Linear assignment MCP call** — it writes the issue identifier to the gitignored, worktree-relative `.a4g/task.md` (REQ-034), which CLAUDE.md imports so the binding rides every gateway request. The Skill's steering keeps the session bound: unbound before substantial work → offer the issue list or the `exploration` bucket; exploration turning into implementation → suggest the matching issue. **On Linear MCP auth failure the session degrades without stopping:** intended Linear updates queue locally and surface at session end; the binding floors to `unattributed` — attribution never blocks work (REQ-034 ceiling).
- **Slash commands:**
  - `/ai4good:next-task` → reads the Linear backlog via MCP, picks the highest-priority **unblocked** issue (the decomposition's blocking relations encode order), shows full context (brief, related blockers from `GET {AI4GOOD_API_BASE}/projects/:id/blockers`, recent commits from local git), and **self-assigns on confirm** — the commitment signal that fires the REQ-034 binding hook
  - `/ai4good:fuel` → calls `GET {AI4GOOD_API_BASE}/projects/:id/context` (Supabase Edge Function), shows current fuel balance + recent burn rate + projected runway
  - `/ai4good:blockers` → calls `GET {AI4GOOD_API_BASE}/projects/:id/blockers` (Supabase Edge Function), shows unresolved blockers + suggested actions per type
  - `/ai4good:raise-blocker --task=X` → calls `POST {AI4GOOD_API_BASE}/projects/:id/blockers` (the `raise-blocker` Supabase Edge Function, accepting a per-project bearer token) with `task_id` populated; creates a `clarifying_question` blocker per REQ-024
  - `/ai4good:handoff-check` → runs REQ-012 handoff precondition check (all p0 issues Done in Linear? README + RUNBOOK present? `github_repo_url` + `deployment_url` set? `git rev-list origin/main..HEAD --count == 0` — i.e. everything pushed?)
  - `/ai4good:files` → fetches signed URLs (REQ-032) and downloads the NGO's reference files into a gitignored `/.ai4good/reference/` dir so the volunteer + Claude Code can read them; re-syncs on demand. Also runs at session bootstrap if reference files exist and aren't yet local. Files are NEVER committed to the repo.
  - `/ai4good:disable` / `/ai4good:enable` → opt out / back in (preferences stored in `~/.ai4good/config.json`)
- **Branch / commit convention enforcement:** the Skill names branches with the Linear identifier (`a4g-12-add-scheduler`) and includes magic words in PR text (`Fixes A4G-12`) so Linear's GitHub integration links the work and moves status on merge — the only status path (REQ-026). REQ-008's webhook ingests identifier references into `external_commit_refs[]` for the activity feed. Volunteer can override any generated message — the Skill assists, never mandates.
- **Manual fallback always present** — Skill behaviors have manual equivalents: the Linear app for browsing/assigning/commenting issues; the ai4good project page for blockers/comments/fuel. Volunteer can disable the Skill entirely via `/ai4good:disable` and still operate (binding degrades to `unattributed`; norms still arrive via the injected governance prompt, REQ-009).

**The Skill is the Track-A orchestration shell (promoted to v1 CORE 2026-06-03 — Item 2).** It is no longer "an onboarding helper with a deferred orchestration layer" — for Track-A projects the Skill *is* how Claude Code drives Lovable. The following moved from v1.5 into **v1** (behind the `LovableDriver` port + graceful fallback per REQ-021):

- **Lovable MCP integration via the `LovableDriver` port:** Skill connects Lovable's MCP server and exposes its tools (`send_message`, `get_message`, `get_diff`, `list_files`, `read_file`, `set_project_knowledge`, `get_workspace`) for orchestrated use. If Lovable MCP is unavailable/breaks, the port falls back to manual-dual-rail (volunteer drives Lovable in-browser; commit-prefix enforcement).
- **Triage decision logic:** `/ai4good:work-on <task_key>` reads the task + Discovery's `claudeCodeScope` / `lovableScope` + `maintenanceTrack` and decides Claude-Code-local vs delegate-to-Lovable, explaining the decision with an override option. Heuristic: visual UI rendering → Lovable; everything else → Claude Code local.
- **Budget guardrails for Lovable (cost enforcement):** tracks per-task `send_message` count; default cap = 5 prompts/task; interactive confirmation past cap with a running NGO-Lovable-credit burn estimate; refuses to exceed an NGO-set hard cap.
- **Quality loop after Lovable work:** after `send_message`, calls `get_diff`, pulls git locally, runs tests, decides iterate vs success vs fallback-to-local-fix; reports back concisely.
- **NGO consent gate:** project page has an "Allow Skill to orchestrate Lovable" toggle (default ON for Track A at kickoff, with cost disclosure; NGO can revoke). Skill checks `get_project_context.lovable_orchestration_allowed` before any Lovable call.
- **Audit reporting:** every Lovable call logged via the ai4good Supabase Edge Function (`POST {AI4GOOD_API_BASE}/projects/:id/audit-events`) with a cost estimate, surfacing NGO Lovable burn rate on the admin + NGO dashboards.

**Genuinely v1.5+ (still deferred):** Replit as a second builder platform; the v2 fully-autonomous orchestration polish.

**Acceptance Criteria (v1 minimal, decision-9 adjusted):**
- [ ] Skill package published open-source MIT to ai4good's GitHub repo + listed in install docs
- [ ] One-command install: `claude skill install ai4good` works end-to-end
- [ ] `.ai4good/config.json` schema documented (no `mcp_server_url` field) + auto-seeded by REQ-008 at repo creation; `~/.ai4good/config.json` schema documented; `claude skill exec ai4good login` flow walks volunteer through token setup
- [ ] Session bootstrap auto-runs on Claude Code session start in any repo containing `.ai4good/config.json`; reads config + token; calls REST `GET /context`; surfaces status banner
- [ ] **Task-binding hook fires on Linear assignment.** Verified by: opening a Claude Code session, self-assigning an issue via the Linear MCP, then observing `.a4g/task.md` contains the issue identifier within the same turn (worktree-relative — repeat under a second worktree). Failure-mode test: Linear MCP auth down → Skill queues the intended updates + surfaces at session end; binding floors to `unattributed`; work is never blocked.
- [ ] Five v1 slash commands (`/ai4good:next-task`, `/ai4good:fuel`, `/ai4good:blockers`, `/ai4good:raise-blocker`, `/ai4good:handoff-check`) work end-to-end against the Linear MCP + ai4good REST
- [ ] Branch/commit convention auto-applied when the agent generates branches and PR text (Linear identifiers + magic words); respects volunteer override
- [ ] Manual disable via `/ai4good:disable` + re-enable via `/ai4good:enable`; preference persisted
- [ ] Documentation at `/docs/skill` covers install, configuration, troubleshooting, opt-out, and the **implication of disabling** (Skill off → binding degrades to `unattributed`; Linear norms still arrive via the injected governance prompt)

**Task Breakdown Hint (v1, decision-9 adjusted):**
- Task 28.1: Skill scaffold + manifest + publish to ai4good GitHub repo with install docs (~3h)
- Task 28.2: Session-bootstrap logic (config-reader + token-reader + REST `GET /context` + status banner) (~3h)
- Task 28.3: **Task-binding PostToolUse hook + offline-queue degradation** (writes `.a4g/task.md` on assignment; queues Linear updates on auth failure) (~3h)
- Task 28.4: Five v1 slash commands (~5h — `/ai4good:raise-blocker` and `/ai4good:next-task` talk to two backends each, Linear MCP + REST)
- Task 28.5: Branch/commit convention hook (Linear identifiers + magic words) (~2h)
- Task 28.6: `/ai4good:disable` / `/ai4good:enable` + token-setup login flow (~2h)
- Task 28.7: Docs site `/docs/skill` (~2h)

Estimated v1: **~20h** (decision-20 removes the auto-commit hook ~−4h; decisions 20/22 add task-binding + Linear-norm wiring ~+3h).

**Dependencies:** REQ-026 (Linear workspace + REST API for context/blockers/comments), REQ-024 (blocker queries + raise), REQ-008 (repo template seeding — CLAUDE.md imports, `.mcp.json`, `.claude/settings.json` hooks), REQ-012 (handoff-check command), REQ-009 (fuel context for `/ai4good:fuel` + the gateway env vars), REQ-034 (the binding the hook maintains), **the Linear MCP** (committed `.mcp.json`; volunteer OAuths once at first session).

---

#### REQ-027: Abandonment / Rematch (volunteer ghosts mid-project)

> **› Decision-10 (2026-06-06) override:** REQ-027 (task #41) hosts the **single merged hourly aging scan** (its inactivity 14d/21d branch + REQ-024's blocker 48h/7d branch + Goal-5's unmatched-open 7d branch, each an isolated pure function calling `notify()`). The 21d auto-release **saga reuses #27's idempotent step-handler registry** (`revoke_repo_collab`, `revoke_virtual_keys`, `remove_org_member`, `remove_linear_membership`, `post_ngo_notice`, `release_assigned_issues` — "AUP teardown minus suspension"; handler names updated by decisions 20/21) — zero new teardown code. Only DETECTION merged; the saga semantics below are unchanged.

**Description (added 2026-06-03 — PM-architect P0; the most probable non-happy-path event).** Ghosting is High-likelihood and named as irreducible, yet the lifecycle previously had no `in_progress → open` edge. REQ-027 defines the release + rematch path and the partial-fuel treatment that Item 3 depends on.

**Lifecycle edge:** `in_progress → open` (status `released`-then-`open`), triggered by **inactivity** (no branch activity AND no Linear issue movement for **14 days** → reminder; **21 days** → auto-release) or by the NGO/volunteer manually releasing. **The inactivity clock runs only while the project is `in_progress`** — a plain status filter; no other state needs clock-exclusion semantics (decision-17 removed the `paused` state from v1).

**Side effects on release (run via the outbox saga, idempotent):**
- Revoke the ex-volunteer's repo collaborator grant + revoke the project's virtual keys (REQ-009) + remove their Linear workspace membership (REQ-026) + (Track A) post an NGO notice to remove them from the Lovable workspace — **reuse the AUP per-project teardown (REQ-007 step 2) minus the account suspension.**
- **Remaining fuel STAYS on the project** (Item 3 — non-cash, project-scoped); the next matched volunteer uses it. No `credit_release`, no refund.
- Unassign the ex-volunteer's in-progress Linear issues and return them to the backlog (REQ-026, API); preserve done issues + commit history.
- Distinguish **`ghosted`** (inactivity timeout) from **`released_for_cause`** (NGO/volunteer initiated) on the application record — `ghosted` affects volunteer outreach/reputation signal; `released_for_cause` does not auto-penalize.
- Project re-opens to the marketplace with **rematch priority** + NGO notified; `project_applications` from the prior round are cleared to allow fresh applications (the ex-volunteer's becomes `released`).

**Acceptance Criteria:**
- [ ] The hourly aging scan — a **pg_cron → `aging-scan` Supabase Edge Function (Deno)** — computes inactivity **only for projects currently in `in_progress`** (skips `handoff_pending` and every other status — a plain status filter, decision-17) from branch activity + Linear issue movement (projection timestamps); fires `inactivity_reminder` at 14d, auto-releases at 21d. Also hosts the REQ-026 staleness branch (in-progress issue, no branch activity N days → coordinator flag).
- [ ] `in_progress → open` transition added to REQ-005.5; teardown via outbox; fuel preserved on the project.
- [ ] `inactivity_reminder` / `project_released` / `rematch_available` notifications (REQ-016).
- [ ] Manual release available to NGO (and to the volunteer who wants to step down) with a reason.

**Dependencies:** REQ-005.5, REQ-006 (fuel stays-on-project), REQ-007 (teardown reuse), REQ-016, `outbox_events` table (defined in the REQ-006 schema block).

---

#### REQ-029: Observability & Operational Monitoring

> **› Decision-10 (2026-06-06) override:** the transactional outbox (REQ-006/task #27) is right-sized to **one worker + one idempotent step-handler registry** with a **flat fixed retry** (NOW()+5m, cap ~12 → `failed_dlq`). The bespoke DLQ→incident state machine is dropped; instead REQ-029 adds **a pager on `outbox failed_dlq count > 0`** (and on released/suspended-with-teardown-incomplete > 6h). The base-permission invariant (REQ-008/task #29) keeps **detection** as a cron and routes **remediation** through an outbox enqueue. Heartbeat/invariant ACs below otherwise stand.

**Description (added 2026-06-03 — PM-architect P0).** Correctness depends on ~8 silent money-touching cron loops; Sentry + "error-rate spike" catches crashes, not silent failures (a cron that didn't fire, undetected ledger drift, a key left active after fuel-zero). This REQ adds the heartbeats + business-invariant monitors that **page**.

**Acceptance Criteria:**
- [ ] **`job_runs` heartbeat table** — every scheduled job is a **pg_cron → Supabase Edge Function (Deno)** pair recording a job_runs heartbeat (match-expiry, aging-scan, cadence-pull, outbox-drain, base-permission-assert, jumpstart-health-check, tree-snapshot, control-total); an **overdue-run pager** fires from a pg_cron job_runs watchdog Edge Function if a job hasn't completed within its expected interval. *(The usage-poller + daily-reconciliation heartbeats are deleted with the poller — decision-21; the gateway is request-path, monitored by the golden signals below.)*
- [ ] **Business-invariant monitors that PAGE (not just log):** ledger control-total mismatch (REQ-006); any project or general balance < 0; a ledger `consumption` row on a project whose balance was ≤ 0 at write time (sampled assertion — the gateway's fuel gate must make this impossible); gateway golden signals (error rate, added latency, 5xx from provider) outside budget; outbox DLQ depth > 0; reserve/coverage below floor (`cash_buffer_alert`); private-org base-permission drift (REQ-008).
- [ ] **Money-path golden-signal dashboards** (funding, consumption, skim, reconciliation, chargeback) for admin.
- [ ] Errors → Sentry; structured logs → Axiom/Logflare (existing NFR) — this REQ adds the *business* layer on top.

**Dependencies:** REQ-006, REQ-009, REQ-024, all scheduled jobs.

---

#### REQ-030: Operations, Incident Response & Admin Correction Tooling

**Description (added 2026-06-03 — PM-architect P0).** Auto-acting kill switches, auto-suspend, and ops queues route to a single `platform_admin` with no on-call model, no restore runbook, no false-positive reversal, no money-correction tooling. This REQ names the operating model.

**Acceptance Criteria:**
- [ ] **On-call + escalation model** named (even if "the founder, with a documented escalation tree" at pilot scale); an `incident` ops_task type is the incident-commander entry (also the outbox DLQ sink).
- [ ] **Per-incident runbooks** authored: PITR restore for the 4h RTO; GitHub-App-key break-glass / org-compromise (REQ-008); gateway real-key rotation + virtual-key mass-revocation (decision-21); Linear outage degraded mode (panel serves the last projection; status catches up on webhook replay); chargeback spike; Lovable-MCP-down fallback.
- [ ] **Manual override for every auto-action** — a false-positive anomaly auto-deactivation, AUP suspension, or key revocation can be reversed by an admin (audited).
- [ ] **Admin money-correction tooling** — post a `reconciliation_adjustment` / manual credit with an audit reason via UI (never raw SQL); no direct ledger writes.
- [ ] **Account suspension is a represented lifecycle state** (`profiles.account_status`) with a documented recovery playbook (REQ-007 saga + per-project re-enable).

**Dependencies:** REQ-006, REQ-007, REQ-009, REQ-029, NFR Reliability, Open Issue §11 #5.

---

#### REQ-031: Content Moderation, Takedown & Secret Scanning

> **› Decision-10 (2026-06-06) right-size (founder-approved):** v1 keeps only **GitHub secret-scanning + push-protection org-wide** (free) + the founder repo-privatize break-glass path (task #40). **Deferred to v1.5** (gated "before organic/EU signup", logged in the v1.5 backlog): the three Report buttons, the `content_abuse_review` ops queue, the takedown saga, and the DMCA/CSAM policy doc. The concierge pilot's ~15 hand-curated projects don't need the automated takedown surface yet; the secret-scanning core (the one real exposure on public brand-named repos) ships in v1.

**Description (added 2026-06-03 — PM-architect P1; the PRD previously had zero moderation surface).** Public brand-named MIT repos + Discovery + channels are an unmonitored UGC surface re-reviewed only once at publish. AUP suspension acts on a volunteer *account* but never makes a public repo private.

**Acceptance Criteria:**
- [ ] **Universal "Report" affordance** on repos / Discovery output / channel messages → creates a `content_abuse_review` ops_task.
- [ ] **Rapid repo-takedown state** any admin can trigger: set the repo **private + "under review"** immediately (decoupled from key-rotation/suspension); reversible after review.
- [ ] **GitHub secret-scanning + push-protection enabled org-wide** (free) on the `ai4good-projects` org (the single v1 org — covers both public and private repos; extends to the second org if/when the v1.5 two-org split ships, REQ-008).
- [ ] **DMCA agent registered**; a documented **CSAM → NCMEC** escalation path.
- [ ] AUP suspension (REQ-007) extended to optionally flip the project's repos to private as part of the saga.

**Dependencies:** REQ-008, REQ-015, REQ-023, REQ-004, REQ-026.

---

#### REQ-032: Project Need Attachments (NGO reference files for Discovery + build)

**Description (added 2026-06-06).** Part of the **project space**: the NGO can upload reference files that describe their need — a spreadsheet of their current manual process, a screenshot of a tool they like, a blank/sample form, a mockup, a requirements PDF, a sample data *structure*. These files (a) are read by the **Discovery Agent** (multimodally) to inform scoping, and (b) are available to the **volunteer** at build time. Words-only intake under-specifies; one screenshot of the spreadsheet they're replacing is worth a paragraph of clarifying questions.

**Where the bytes live (decided 2026-06-06):** a dedicated **S3-compatible cloud object store — Cloudflare R2 recommended** (zero egress, since the dev + the AI read these files repeatedly), **NOT Supabase Storage**. Only file *metadata* lives in Postgres (`project_files`). Object stores have no row-level security, so all access is via **short-TTL signed URLs minted by the `sign-project-file` Supabase Edge Function (Deno)** (`POST {SUPABASE_URL}/functions/v1/sign-project-file` with `{projectId, fileId}`) that first checks the caller is an NGO member / the assigned volunteer / a platform admin AND honors `projects.visibility` (private projects restrict to members). The UI/Skill never hold the object-store credentials — consistent with the "UI never touches storage/DB directly, always via an edge function" rule. (Existing `verification_documents` stay on Supabase Storage for v1; consolidating all blobs onto R2 is a v1.5 cleanup.)

**When the NGO can upload:**
- At **intake** (REQ-003) — optional, alongside the free-text need.
- During **Discovery** (REQ-004) — the agent can ask for and the NGO can add more mid-conversation.
- From the **project space / project page** (REQ-010/026) — anytime pre-handoff.

**PII / Tier-2 handling — governance-by-disclosure + hard-warn (decided 2026-06-06; consistent with decision-1):**
- The upload UI shows a standing **data-responsibility disclosure**: *"Upload redacted/sample data, screenshots, mockups, blank forms — NOT real beneficiary records. ai4good and your volunteer will be able to see these files."*
- For projects classified **Tier-2** (special-category, `dataSensitivity.tier` from REQ-004), the disclosure is a **hard, unmissable checkbox gate** restating fixtures-only: *"This project handles special-category data. Do NOT upload real records here — only synthetic/redacted samples. You connect real data yourself, in your own environment, after handoff."*
- **ai4good does NOT scan uploads** (governance-by-disclosure — the NGO owns the risk per the data-responsibility acknowledgment, REQ-004/023). No real Tier-2 data should reach the Discovery AI or the volunteer through this path; that is enforced by disclosure, not by code — matching the platform's existing Tier-2 posture. (Automated PII/secret pre-scan on uploads is a v1.5 option, logged in §11.)

**What Discovery does with them (REQ-004):** the agent ingests `discovery_visible` files **multimodally** (PDF, PNG/JPG, CSV/TSV, TXT, common docs — within Anthropic's supported types + size limits), references them in clarifying questions, and may cite them in the scope doc ("based on your uploaded `current-intake-form.pdf`, the tool needs fields X/Y/Z"). File metadata (name, type, the NGO's one-line "what this is") is included in the Discovery context. Reading a file consumes Discovery credits proportional to its context weight (decision-11); the UI shows **"≈ N credits to include this file — proceed?"** before the agent ingests a large one. (Once on funded fuel, file reads consume $-fuel like any Discovery turn.)

**What the volunteer does with them (REQ-028):** at session bootstrap (or on demand via `/ai4good:files`), the Skill fetches signed URLs and **downloads the files into a gitignored local `/.ai4good/reference/` directory** — **never committed to the repo** (keeps private/Tier-2 file contents out of git history entirely). The volunteer + their Claude Code read them as build reference.

**Acceptance Criteria:**
- [ ] NGO can upload reference files at intake, during Discovery, and from the project page (drag-drop + picker). Allowed types: PDF, PNG/JPG, CSV/TSV, TXT, DOCX/XLSX. Caps (v1, tunable): ~25 MB/file, ~200 MB/project. No virus/secret scan in v1 (governance-by-disclosure).
- [ ] Bytes stored in an **S3-compatible object store (Cloudflare R2 recommended), not Supabase Storage**; key layout `projects/<project_id>/<file_id>/<filename>`; private bucket. Metadata in `project_files`. Access only via short-TTL signed URLs from the edge function, which enforces NGO-member / assigned-volunteer / platform-admin + `projects.visibility`.
- [ ] Upload UI shows the data-responsibility disclosure; for **Tier-2** projects it is a hard checkbox gate restating fixtures-only before any upload is accepted.
- [ ] Discovery Agent ingests `discovery_visible` files multimodally and may reference them in clarifying questions + the scope doc; file metadata is in the Discovery context.
- [ ] Project page (REQ-010) shows a **"Reference files"** section (name / type / uploader / one-line description); downloadable by the assigned volunteer + NGO admins + platform admin per visibility RLS.
- [ ] The Skill (REQ-028) downloads files into a gitignored `/.ai4good/reference/` dir for the volunteer; `/ai4good:files` re-syncs on demand. Files are never committed to the repo.
- [ ] Soft-delete (`deleted_at`); `audit_events` row on upload + delete with `actor_source`.

**Dependencies:** REQ-001 (auth), REQ-003 (intake), REQ-004 (Discovery multimodal ingestion), REQ-010 (project page), REQ-026 (project space), REQ-028 (Skill download). **New infra:** Cloudflare R2 (or any S3-compatible store) + a signed-URL edge function.

**Task Breakdown Hint:** `project_files` table + RLS (~2h); R2 bucket + signed-URL edge function + membership/visibility check (~4h); upload UI (intake + Discovery + project page) with the Tier-2 hard-warn (~4h); Discovery multimodal ingestion of `discovery_visible` files (~3h); project-page Reference-files section (~2h); Skill `/ai4good:files` + bootstrap download to `/.ai4good/reference/` (~2h). **≈ 17h.**

---

#### REQ-033: Post-Discovery NGO Project Assistant (funded, fuel-metered)

**Description (added 2026-06-06, decision-12):** Once a project is **funded**, the NGO can keep chatting with an AI assistant **beyond the Discovery/scoping phase** to understand project status. It is the same chat surface as the Discovery Agent (REQ-004, Claude Sonnet), continued past `scoped` and reframed as a **read-only project assistant**: it answers "how's my project going?", explains open blockers, summarizes recent progress, and estimates fuel runway. **It is fuel-metered (no free credits)** — it exists only on funded projects, so every turn is dollar-metered against the project's fuel exactly like funded Discovery. It never mutates the project: scope additions still route through Change Requests (REQ-025), task state is owned by Linear (REQ-026 — the assistant reads the projection), and handoff is gated by REQ-012 — the assistant only *reads* and *explains*.

**Acceptance Criteria:**
- [ ] **Availability:** the assistant is reachable on the project page once the project is funded (positive fuel balance) and past pre-fuel Discovery — i.e. status `in_progress` onward. On an unfunded or pre-`scoped` project there is no assistant (Discovery REQ-004 is the only NGO↔AI chat).
- [ ] **Read-only project context:** each turn assembles a read-only snapshot — `project_tasks` (REQ-026 projection: counts by status, current P0s, recent `done` transitions), open `project_blockers` (REQ-024), fuel balance + runway (REQ-009), and recent `external_commit_refs` / NGO comments (REQ-026) — and answers from it. The assistant has **no write tools**: it cannot set task status, resolve blockers, accept CRs, approve handoff, or move money.
- [ ] **Reuses the Discovery chat surface:** same conversation store as REQ-004 with a `mode` marker (`'discovery' | 'assistant'`); same **Opus** model (decision-13 — the assistant is funded, so the NGO bears the cost via fuel); a distinct system prompt tuned for "status explainer for a non-technical NGO." No new chat infrastructure, no new table.
- [ ] **Fuel-metered, no free credits:** each turn debits the project's fuel as `kind='discovery_consumption'` (REQ-006; reglossed "NGO-side AI Agent: Discovery + project assistant") plus the paired 15% `skim` row, using the same context-weighted token accounting as REQ-004's per-turn cost. The free daily Discovery credit allowance is **never** drawn (the assistant is post-fuel by definition).
- [ ] **Cost transparency:** each turn shows its fuel cost (consistent with the funded-Discovery display, REQ-004); the project fuel gauge is visible in the assistant.
- [ ] **Fuel-zero behavior:** when project fuel hits 0 the assistant composer disables with the standard *"Top up fuel"* CTA (REQ-006), mirroring build-side behavior.
- [ ] **Scope discipline:** if the NGO asks the assistant to change scope or priorities, it explains the Change Request flow (REQ-025) and does not act — it may pre-fill a draft CR for the NGO to review, but the NGO submits it.
- [ ] **v1 is on-demand text Q&A only.** Proactive / push status digests, scheduled summaries, and notification-driven agents are **v1.5** (Out of Scope).

**Technical note:** no new ledger kind (reuses `discovery_consumption`); no new table (reuses the Discovery conversation store + a `mode` column); the only net-new code is the read-only project-state context assembler + the assistant system prompt + the funded-project availability gate. **Drive the UI through Lovable MCP per project guidelines; the chat calls an edge function, never the DB directly.**

**Dependencies:** REQ-004 (Discovery chat surface + per-turn metering), REQ-006 (fuel ledger + `discovery_consumption`), REQ-009 (fuel runway), REQ-010 (project page), REQ-024 (blockers), REQ-025 (Change Requests), REQ-026 (`project_tasks` projection + commit refs).

**Task Breakdown Hint:** `mode` marker on the conversation store + funded-project availability gate (~2h); read-only project-state context assembler (tasks/blockers/fuel/activity) (~4h); assistant system prompt + scope-discipline guardrail (~2h); cost display + fuel-zero disable reuse (~1h); tests (~1h). **≈ 10h.**

---

#### REQ-034: Task-Level Attribution (telemetry, never gating — decision-22)

**Classification (load-bearing):** transparency / product telemetry — **NOT a security control.** Spoofable by design; soft-degrading by design; **never gates a request.** Purpose: burn-per-deliverable on the NGO panel, per-task cost baselines for fuel estimation, and reconciliation precision (the REQ-009 Layer-2 ladder rung, if ever built).

**Description:** every gateway request (REQ-009) carries an optional task binding so ledger rows attribute burn to the Linear issue being worked. Ledger rows written without a binding are unattributable forever — capture ships in v1; the analysis surfaces trail in v1.5.

**Binding mechanism:**
- **Primary:** a PostToolUse hook (in the repo template's committed, ai4good-owned `.claude/settings.json`) fires on the Linear **assignment** MCP call — the commitment moment — and writes the issue identifier to **`.a4g/task.md`** (gitignored, worktree-relative), which the repo's CLAUDE.md imports → the binding rides the system prompt → the gateway extracts it in the same pass as the fingerprint (REQ-009) and stamps `task_ref` on the ledger rows.
- **Fallback:** gateway-side derivation from the branch name / transcript present in the request body.
- **Floor:** `unattributed` — a request with no resolvable binding is **never rejected**.
- **Rejected alternatives (for the record):** a launcher script (nonstandard invocation), SessionStart-only binding (fires before the task exists), header-only binding (session-granular — breaks under parallel worktrees). The binding must be per-request/directory-derived to stay correct under parallelism; the repo template is worktree-ready (relative paths in `.a4g/` and hooks).

**Legitimate taskless buckets:** `exploration` and `onboarding` are first-class `task_ref` values the steering offers proactively — **falsely-attributed burn is worse than unattributed** (it corrupts the cost baselines).

**Steering (CLAUDE.md, static, cache-friendly):** the agent checks its local binding (branch + session assignment) and, if unattributed before substantial work, offers the task list or the exploration bucket; when exploration turns into implementation, it suggests picking the matching issue. This is the "agent always knows its task context" discipline the founder set — conversational, never enforced by the gateway.

**Measurement (platform-side, v1.5 surfaces):** the reconciliation join — unattributed burn while an assigned issue is in progress = binding-broken signal; burn against a Done issue = stale binding. The coordinator sees per-project unattributed %. **Ceiling, verbatim: detection and suggestion only, never gating.**

**Aggregation boundary:** the NGO panel shows **burn per deliverable**; per-volunteer-per-task granularity stays coordinator-side only (volunteer-efficiency metering would erode trust). Expect bimodal per-task cost distributions (hand-driven vs loop-driven tasks) — a data property, not an anomaly.

**Acceptance Criteria:**
- [ ] `fuel_transactions.task_ref TEXT` — the Linear identifier (e.g. `A4G-12`), `exploration`, `onboarding`, or NULL (= unattributed). Written by the gateway at ledger-write time (REQ-009).
- [ ] Repo template ships the PostToolUse assignment hook + `.a4g/task.md` (gitignored) + the CLAUDE.md import + the steering block; all paths worktree-relative.
- [ ] Gateway extracts the binding in the fingerprint pass; falls back to branch/transcript derivation; floors to unattributed. No rejection path exists.
- [ ] NGO project page shows **burn per deliverable** (v1): fuel consumed per task, from `task_ref` aggregation — rendered in the money-honesty style (REQ-010; cents, no celebration).
- [ ] **v1.5 (deferred):** coordinator reconciliation panel (unattributed %, binding-broken/stale signals); per-task cost baselines feeding Discovery estimates.
- [ ] **[VERIFY — before build]:** branch/env-block presence + stability in Claude Code main-request bodies (fallback path); CLAUDE.md import re-resolution mid-session; PostToolUse payload shape for MCP tools.

**Task Breakdown Hint:** `task_ref` column + gateway stamp (~2h); template hook + `.a4g/task.md` + CLAUDE.md import + steering block (~4h); fallback derivation in the gateway (~3h); NGO burn-per-deliverable panel section (~3h). **≈ 12h (capture + NGO surface).**

**Dependencies:** REQ-009 (gateway pass), REQ-026 (Linear assignment is the binding moment), REQ-010 (panel), REQ-006 (ledger).

---

#### REQ-035: Post-Handoff Attribution & Jumpstart Health (decision-22)

**Description:** closes the freedom-without-guarantee model economically: **no gates anywhere — quality becomes visible ex post, and reputation is the incentive.** Two capture mechanisms ship in v1 (uncaptured data is lost forever); the synthesis/matching surfaces land in v1.5.

**1. NGO attribution at handoff (v1 capture).** At sign-off (REQ-012), the NGO completes an attribution step: a free-text **testimonial** + three structured dimensions — *communication*, *delivered scope*, *onboarding into self-service*. **Framed as credit, not grading** — it feeds the volunteer's portfolio, and deliberately is NOT a single star score (single-rater scores inflate and measure the relationship, not the artifact). *(This consciously supersedes the earlier "no satisfaction form in v1" deferral — decision-22 reframes the capture as attribution. Out of Scope #11 still holds: no public star ratings, ever.)*

**2. Jumpstart health at 30/60/90 days (v1 capture).** Extends the existing 30-day-alive ping (REQ-012) to three marks, synthesized from **real signals only**: successful NGO self-service changes in Lovable, feature requests opened/completed, rescue requests. Project state renders as *actively self-served* / *stalled*. **Confound control:** at 60-day inactivity the platform asks the NGO exactly one question — *"did you try to make changes?"* — and **only tried-and-failed counts against health** (an NGO that didn't need changes is not a failure).

**3. Reputation feeds matching (v1.5).** Attribution + health track record become visible during matching. No gates: a volunteer with weak signals still applies; the NGO sees the record.

**4. AI-maintainability check (v1.5, signal only — never a gate).** An optional, visible test at handoff: a fresh agent runs realistic change requests against the repo; the result is shown, nothing is blocked.

**Acceptance Criteria:**
- [ ] Handoff sign-off (REQ-012) includes the attribution step: testimonial (optional free text) + 3 structured dimensions (required, 4-point descriptive scale, credit-framed copy). Stored in `handoff_attributions`; volunteer sees it on their profile (private in v1; matching surface is v1.5).
- [ ] `project_health_checks` rows at 30/60/90 days post-handoff (pg_cron → Edge Function; `job_runs` heartbeat `jumpstart_health_check`): alive ping + self-service-change count (Lovable activity, where readable) + feature-request/rescue counts; state derived as actively-self-served / stalled.
- [ ] 60-day one-question NGO email (*"did you try to make changes?"*) with a one-click answer; only tried-and-failed marks the health record negatively.
- [ ] No capture blocks handoff: skipping the testimonial is allowed (dimensions required, ~30 seconds); health checks never notify the volunteer punitively.
- [ ] **v1.5 (deferred):** reputation surfaces in matching; health synthesis dashboard; the AI-maintainability visible check.

**Task Breakdown Hint:** `handoff_attributions` + `project_health_checks` tables + RLS (~2h); sign-off attribution step UI (~3h); 30/60/90 cron + signal assembly (~4h); 60-day one-question email + one-click answer (~2h). **≈ 11h (capture).**

**Dependencies:** REQ-012 (sign-off flow + alive ping), REQ-021 (Lovable self-service signals), REQ-016 (the one-question email), REQ-014 (volunteer profile hosts the attribution).

---

### P0 (promoted from P1): Required dependencies of REQ-024 / REQ-025 / REQ-026

> **Promotion note (resolves Codex review #8):** REQ-013, REQ-014, REQ-015, and REQ-016 were originally drafted as P1 but are required dependencies of P0 features (blockers, CRs, PM tasks). They are reclassified as **P0** for v1. For REQ-015 specifically, v1 ships a **minimal** version (one channel per project with auto-posted system messages, basic chat, email-on-mention) and the full Slack-style enhancements (threaded replies, presence, full-text search, attachments) move to **v1.5**. Per-user notification preferences (REQ-016) are also v1.5; v1 ships sensible defaults only. NGO and volunteer dashboards (REQ-013, REQ-014) ship with the **"Action needed" rail and core project list + fuel + task progress only**; richer surfaces (recent-activity feed, badge engine, opt-in testimonials, KYC upsell CTA) are v1.5.
>
> REQ-017 (post-handoff feature-request surfacing) is moved to **v2** per §11 (was previously P1) — not v1-launch-blocking and no P1 work in v1.

#### REQ-013: NGO Dashboard (minimal v1 + v1.5 enhancements)

**Description:** A single view per NGO showing all their projects, fuel balances, applicants, recent activity, **and prominent cadence + progress signals to support stepwise-funding decision moments** (Platform Promise §6).

**Acceptance Criteria (split per Platform Promise §11 / codex round 2 fix):**

**v1 (minimal — ships at public beta):**
- [ ] Project cards with status, % complete (from PM tasks, REQ-026), dual fuel meters (REQ-010), assigned volunteer.
- [ ] Cadence + progress signals per active project on each card: last commit timestamp, cadence health badge (Active/Quiet/Stalled), PM task progress (X of Y done), "Now working on: [task title]".
- [ ] Fuel summary across all projects + general balance shown as "$X redeployable credit" (non-cash; no expiry date, never removed — REQ-006 §7).
- [ ] **"Action needed" rail** (REQ-024 blockers including `fuel_topup_needed` / `lovable_credits` / `github_collaborator_needed` / `clarifying_question` + pending CRs awaiting NGO response + triage decisions awaiting NGO response).
- [ ] Applicants queue per project (when project is `open`).

**v1.5 (deferred per Platform Promise §11):**
- [ ] Recent activity feed (last 30 days of events) across all projects.
- [ ] KYC upsell CTA for `verified` NGOs (persistent banner).
- [ ] "Lovable-enabled projects" rail (REQ-021 — currently in REQ-021's AC; moved here as v1.5).
- [ ] Opt-in NGO testimonials authoring page.

**Dependencies:** REQ-005, REQ-006, REQ-007.

---

#### REQ-014: Volunteer Dashboard + Completion Credit (v1 minimal)

**Description (v1):** Volunteer dashboard with current assignments, fuel gauges, and a **completion-credit-only** public reputation model. There is **no public star rating** for volunteers — only completion count + a single "Shipped first tool" badge are shown publicly. **NGO satisfaction signal collection is deferred to v1.5** per §11 (it ships with the v1.5 tips + satisfaction handoff UX).

**Public on volunteer profile (`/volunteers/<github_handle>`) — v1:**
- Completion count: total handed-off projects, **including private** (e.g. "5 tools shipped (2 private)"). Both count toward completion credit; private projects don't disclose project title/NGO/details on the public profile (just the "+1 private project shipped" count).
- One badge: "Shipped first tool" (auto-awarded on first handoff, regardless of visibility)
- For **public projects**, the project title + NGO name + cause tags appear in the volunteer's project list. For **private projects**, only the count increments — no per-project disclosure on the public profile.
- **Not shown:** star/numerical ratings, NGO testimonials, cause-area badges, multi-badge engine — all deferred to v1.5

**Internal NGO Satisfaction (DEFERRED to v1.5):**
- No `ngo_satisfaction_signals` table in v1; no satisfaction modal at handoff; no admin-visible aggregate. v1.5 introduces all three together with the tip flow.

**Acceptance Criteria (split per Platform Promise §11 / codex round 2 fix):**

**v1 (minimal — ships at public beta):**
- [ ] Dashboard shows current projects with status, dual fuel gauges (REQ-010), in-progress PM tasks (REQ-026), unresolved blockers / clarifications.
- [ ] Public completion count surfaced on volunteer profile (`/volunteers/<github_handle>` or `/volunteers/<slug>`).
- [ ] **One badge in v1: "Shipped first tool"** (auto-awarded on first handoff). Other badges deferred to v1.5.
- [ ] Internal NGO Satisfaction signal collection is **deferred to v1.5** (no `ngo_satisfaction_signals` table in v1 — added with the v1.5 handoff tips/satisfaction UX). v1 has no satisfaction modal at handoff and no internal aggregate visible to admins.
- [ ] Volunteer never sees their own NGO Satisfaction scores (avoid anxiety / gaming).
- [ ] Anthropic key reveal + self-audit usage view (already specified in REQ-009).

**v1.5 (deferred per Platform Promise §11):**
- [ ] Multi-badge engine: "Shipped 5 tools", "Shipped 10 tools", "Active contributor (3+ in last 90d)", "Cause specialist (3+ in same cause)".
- [ ] History view of handed-off projects with badges and dates.
- [ ] Opt-in NGO testimonials (free-text, NGO-authored with consent) on public profile.
- [ ] Cause-area specialization tags derived from completed-project cause tags.

**Dependencies:** REQ-007, REQ-012.

---

#### REQ-015: Per-Project Comment Thread (lightweight; full Slack-style channel deferred to v1.5 — decision-15)

> **› Decision-15 (2026-06-08) supersedes the Decision-10 override below:** the channel data-model + Realtime transport are **dropped from v1** — REQ-015 ships a lightweight project comment thread on `task_comments` (see the rewritten spec). The **actionable-message primitive survives**, re-homed onto the CR row + notifications (not a chat UI). System events go to the `notifications` feed via `notify()` (no `is_system` channel messages in v1).
>
> *(Superseded) Decision-10 (2026-06-06) override: REQ-015 (task #34) keeps the channel data-model + transport ONLY, plus one reusable actionable-message primitive (JSONB `actions` = body + inline buttons + callback `event_type`); the system-message event catalog moved to REQ-016's `EVENT_MAP`.*

**Description (decision-15, 2026-06-08 — middle-option simplification of the review+verify pass):** Each project has a lightweight **comment thread** on its project page for the NGO admin(s), the assigned volunteer, and (when invited) platform admin. This **replaces the v1 Slack-style real-time channel** — the full channel (Realtime, threaded replies, @-mentions, presence, search, attachments) becomes the **v1.5 upgrade**. The v1 thread is a plain project-level comment stream backed by `task_comments` (project-level rows where `task_id IS NULL`), rendered on the project page; system events surface in the `notifications` feed + the REQ-010 activity feed via `notify()` (the sole writer), not as channel posts.

**Why the middle option (decision-15):** a concierge pilot of ~10–15 hand-matched projects (one volunteer + a couple NGO admins, founder in every loop out-of-band per §11) does not need a real-time chat subsystem to coordinate — structured blockers (REQ-024) + a project comment stream + the notifications feed + email carry the load. This drops the Supabase Realtime transport, the markdown renderer, the @-mention parser, the post-handoff archival mode, and the `channels`/`channel_members`/`messages` tables, while keeping a shared free-text back-and-forth (so the product stays a warm coordination layer, not an inbox). Reinstate the full channel before organic/EU signup (v1.5).

**Acceptance Criteria (v1):**
- [ ] **Project comment thread** on the project page (REQ-010): a chronological free-text comment stream for the project's NGO admins + assigned volunteer (+ platform admin when escalated). Backed by `task_comments` with `task_id IS NULL` (project-level) — no separate channel/messages tables.
- [ ] Plain text + auto-linkified URLs (no markdown renderer, no code blocks, no image attachments, no @-mentions in v1).
- [ ] **Read on page load** (no Supabase Realtime in v1); posting a comment refreshes the stream and emits a `project_comment` notify() event to the other party (in-app; email per REQ-016 defaults).
- [ ] **Membership is implicit** (NGO admins of the project + assigned volunteer + platform admin), enforced by RLS on `project_id` — no `channel_members` roster.
- [ ] **System events are NOT posted to the thread** — funding, repo / Lovable setup, fuel-low, handoff, blocker raised/resolved, CR raised/decided surface in the `notifications` feed (REQ-016) + the REQ-010 activity feed via `notify()` (the sole writer; this dissolves the prior channel-system-message path and the `notify()`-bypass concern).
- [ ] **CR Accept/Decline** uses the actionable-message primitive **on the CR row** (project page) + the notification, not a chat message (REQ-025).
- [ ] After `handed_off`, the thread is **read-only** (an RLS check on project status — one policy, not an archival subsystem).
- [ ] No cross-project DMs.

**v1.5 (deferred — the full Slack-style channel upgrade):**
- [ ] Real-time channel (Supabase Realtime, flat list → threaded replies) on `channels` + `channel_members` + `messages` tables.
- [ ] @-mentions + `channel_mention` notifications; presence + typing indicators.
- [ ] Markdown + code blocks + image attachments; full-text search (Postgres `tsvector`).

**v2+ (out of scope for v1 and v1.5):**
- [ ] Integration with a real Slack workspace (webhook bridge); video/audio calls.

**Task Breakdown Hint (v1 only):**
- Task 15.1: Extend `task_comments` (nullable `task_id` + `project_id` FK) + RLS for project-level comments (~2h)
- Task 15.2: Project-page comment-stream UI (load + post; no Realtime) (~3h)
- Task 15.3: `project_comment` notify() event + email default (~1h)
- Task 15.4: Re-home the CR Accept/Decline actionable-message primitive onto the CR row (REQ-025) (~3h)
- Task 15.5: Post-handoff read-only RLS policy (~1h)

**Dependencies:** REQ-001, REQ-007, REQ-010 (project page), REQ-016 (notifications), REQ-026 (`task_comments`).

---

#### REQ-016: Notifications (Email + In-App)

> **› Decision-10 (2026-06-06) override:** implement as a single `notify(recipientIds, event_type, payload, channel_id?)` shared Deno module (task #35), imported by every Supabase Edge Function, that is the **SOLE writer** of `notifications` AND system `messages`, driven by one static **`EVENT_MAP`** encoding the taxonomy below (`event_type → {channels, escalate_admin, render()}`). It is NOT a bespoke "dispatch system" — no worker/queue. The v1 ACs **batching (60s coalescing query)** and **dedup (partial-unique / NOT-EXISTS on (recipient,event_type,entity_id) within 5min)** are KEPT, implemented as SQL guards. In-app via Supabase Realtime on `notifications`; email via one Resend call. Blockers/CRs/lifecycle events all call `notify()` rather than writing comms directly.

**Description:** Event-driven notifications with sensible defaults in v1 (per-user preference UI is v1.5 — see §11).

**Acceptance Criteria (split per Platform Promise §11 / codex round 2 fix):**

**v1 event types (must fire; defaults documented; no per-user preference UI yet):**

| Event | Recipient(s) | Delivery | Notes |
|---|---|---|---|
| `triage_approved` / `triage_rejected` / `triage_changes_requested` | NGO admins | email + in-app | Canonical "project decision" events. `triage_approved` is the moment the project becomes visible on `/marketplace`; we previously had a duplicate `project_published` event firing the same notification — collapsed into `triage_approved` (codex round 3 fix). |
| `application_received` | NGO admins | in-app (batched daily digest if > 1) | |
| `project_aging_unmatched` (an `open` project sits N days with no accepted match) | platform admin (concierge) + matching volunteers (featured nudge) | in-app + email | Goal 5 supply-liquidity hook — surfaces laggards for concierge hand-matching + nudges matching volunteers (decided 2026-06-03 — Item 6) |
| `inactivity_reminder` (14d no commits/task-transitions on `in_progress`) | volunteer + NGO admins | in-app + email | REQ-027 abandonment — warns before auto-release |
| `project_released` (volunteer auto-released at 21d or manual) | NGO admins + ex-volunteer | in-app + email | REQ-027 — fuel stays on project; project re-opens |
| `rematch_available` (released project back on marketplace) | NGO admins | in-app | REQ-027 — rematch priority |
| `application_accepted` / `application_declined` | Volunteer (applicant) | email + in-app | Canonical volunteer-side match notification. We previously had a duplicate `volunteer_matched` firing the same content from the NGO acceptance — collapsed into `application_accepted` (codex round 3 fix). |
| `matched_pending_fuel_reminder` (24h before deadline) | NGO admins | email | |
| `funding_deadline_expired` (project reverted to `open`) | NGO admins + matched volunteer | email + in-app | NEW (codex gap) |
| `payment_succeeded` (Stripe checkout completed → in_progress) | NGO admins + volunteer | email + in-app | NEW (codex gap) |
| `payment_failed` | NGO admins | email + in-app | NEW (codex gap) |
| `virtual_key_issued` (kickoff — instant; decision-21) | Volunteer | email + in-app | replaces `anthropic_key_ready` (the manual key-ops bootstrap is deleted) |
| `virtual_key_revoked` (NGO/admin revocation; replacement key on dashboard) | Volunteer | email + in-app | replaces `anthropic_key_rotation_complete` |
| `linear_status_reverted` (detect-and-revert fired; REQ-026) | Volunteer | in-app only (low-tone) | NEW (decision-20) — instructive, not punitive |
| `jumpstart_health_question` (60-day one-question email; REQ-035) | NGO admins | email | NEW (decision-22) — one click to answer |
| `fuel_low_20pct` | NGO admins | email + in-app | |
| `fuel_low_5pct` | NGO admins + **volunteer** | email (NGO) + in-app (both) | Volunteer added per Story 4 AC + codex round 3 fix — they need to know dev sessions will be warned/cut soon |
| `fuel_depleted` | NGO admins + **volunteer** + platform admin (escalation) | email + in-app | Volunteer added per Story 4 AC + codex round 3 fix |
| `task_comment` (NGO comments on a task; REQ-026) | Volunteer | in-app only by default | Was referenced in REQ-026 ACs but missing from taxonomy (codex round 3 fix) |
| `blocker_resolved` | **Volunteer + NGO admins** | in-app + project-page Action-needed rail (decision-15) | Volunteer added per REQ-024 notification matrix (codex round 3 fix — prior version only listed NGO escalation paths) |
| `handoff_requested` / `handoff_accepted` / `handoff_rejected` | NGO + volunteer (rejected adds platform admin) | email + in-app | `handoff_rejected` NEW |
| `verification_outcome` | NGO admins | email + in-app | (`kyc_outcome` deferred to v1.5 along with KYC tier per §11) |
| `provisioning_failure` (repo setup failed / Linear pool empty at kickoff) | **NGO admins + volunteer + platform admin** | email + in-app + ops_task | Volunteer added per REQ-005.5 (codex round 3 fix); virtual-key minting has no failure mode (a local row write, decision-21); pool-empty also fires an urgent `linear_pool_replenish` |
| Lovable: `lovable_workspace_setup_reminder` (`matched_pending_fuel` + `lovable_recommended`), `lovable_credits_low`, `lovable_credits_blocked` (escalation tier), `lovable_setup_pending_raised` (auto-raised at kickoff → NGO; decision-19 — no longer volunteer-initiated), `lovable_setup_complete` (blocker auto-resolved → NGO + volunteer). *(`lovable_skipped_manual` + `lovable_decision_auto_skipped` removed in v1 — the skip opt-out + 14-day auto-skip are gone per decision-19; reserved for post-v1 Track B)* | per event (escalation tier on `lovable_credits_blocked`) | email + in-app | decision-19 — skip events (`lovable_skipped_manual`, `lovable_decision_auto_skipped`) removed; `lovable_setup_pending_raised` auto-raised at kickoff |
| `github_collaborator_needed_raised` / `github_collaborator_needed_resolved` (REQ-024 / REQ-008 dual-rail blocker) | NGO admins (raised); volunteer (resolved) | email + in-app | NEW (round 3) |
| ~~Channel: `channel_mention` / `channel_message_new`~~ | — | — | **v1.5 (decision-15)** — the real-time channel is deferred; no @-mentions or channel posts in v1. |
| Project thread: `project_comment` (decision-15) | the other party (NGO admins ↔ assigned volunteer) | **in-app by default** (email per recipient default; the would-be-spam guard is kept) | the v1 project comment thread (REQ-015) — a `task_comments` project-level post |
| Blockers: `blocker_raised` / `blocker_resolved` / `blocker_aging_48h` / `blocker_aging_7d_escalation` | NGO admins (+platform admin on 7d) | email + in-app | |
| ~~`spend_anomaly_review_*` events~~ | **DEFERRED to v1.5 (decision-14)** — the REQ-009 anomaly engine that fires these is not built in v1; reserved for v1.5. | — | — |
| CRs: `cr_raised` | volunteer | **in-app + CR inbox at session bootstrap; NO email (decision-16 anti-distraction)** | only Accept creates work; one open CR per project (decision-16) |
| CRs: `cr_decided` | NGO admins | email + in-app | `cr_completed` deferred to v1.5 per REQ-025 (v1 doesn't auto-detect CR completion) |
| **PM Tasks (REQ-026):** `task_status_changed` (assignment → in progress; PR merge → done — fired from the `linear-webhook` consumer, decision-20) | NGO admins | **in-app only by default** (email at digest cadence) | **Clarifies prior contradiction:** task status events are notified-but-low-tone — they surface in NGO's notification feed but don't fire email per-event. v1.5 adds per-user toggle. |
| `task_completed` (specific to `done` transition; higher signal) | NGO admins | email + in-app | |
| ~~Auto-top-up: `auto_topup_charged` / `auto_topup_cap_reached` / `auto_topup_payment_failed`~~ | — | — | **DEFERRED to v1.5 per §11** — auto-top-up itself isn't in v1; events fire only when v1.5 lands |
| Fuel credit: `fuel_credit_released` (project ended, leftover → general balance) / `fuel_donation_confirmed` | NGO admins | in-app (+ email on donation receipt) | replaces the removed retention/decay notifications (Item 3 — no cash-out, no decay clock) |
| `chargeback_opened` (dispute received → NGO frozen) | NGO admins + platform admin | email + in-app + ops_task | Item 3 |
| ~~`tip_received`~~ | — | — | **DEFERRED to v1.5 per §11** (REQ-022 tips deferred — event fires only when v1.5 ships) |

- [ ] **Default delivery rules in v1:**
  - Email = critical events (money, deadlines, blockers, handoff, decisions)
  - In-app only = low-tone events (channel messages, task status changes)
  - Batching: aggregate same-event-type to same recipient within 60s into a single notification (prevents per-keystroke spam)
  - Dedup: identical `(recipient_id, event_type, entity_id)` within 5 min → drop second
- [ ] Email via Resend (default) or Supabase SMTP fallback; in-app via Supabase Realtime channel.
- [ ] `lovable_credits_blocked` and `provisioning_failure` and `blocker_aging_7d_escalation` are **escalation tier** — notify NGO + platform admin. (`auto_topup_payment_failed` joins this list when v1.5 auto-top-up ships.)

**v1.5 (deferred per Platform Promise §11):**
- [ ] Per-user notification preferences UI (email on/off per event type; quiet hours; digest mode).
- [ ] Custom batching rules per recipient.

**Dependencies:** REQ-001.

---

### Out of v1 / Deferred to v2 — referenced by ID only

#### REQ-017: Post-Handoff Feature Request Surfacing (v2)

**Description (v2 spec, not built in v1):** After handoff, new GitHub issues labeled `feature-request` or `bug` on the repo would be surfaced on the project's ai4good page so that other volunteers can find and optionally pick them up.

**Status:** **Deferred to v2** per §11 MVP Scope. v1 has no `post_handoff_issues` table, no issues webhook subscription, no UI surfacing. Detailed acceptance criteria deferred until the v2 design work begins (depends on pilot data: how many handed-off projects actually attract follow-up requests, and how NGOs want to drive them).

**Dependencies (when built):** REQ-008, REQ-012.

---

### Nice to Have (P2) — Future Enhancement

#### REQ-018: Discovery Agent — Voice Input

Allow NGOs to describe the need via a voice recording that the agent transcribes + processes.

#### REQ-019: Multi-Volunteer Per Project

Support teams of 2-3 volunteers per project with role splits (frontend/backend/QA).

#### REQ-020: Public Impact Page

Public-facing page per NGO showing all the tools ai4good has built for them, with usage / impact stats (where instrumented).

---

## Non-Functional Requirements

### Performance

- **Response Time:**
  - Marketplace page: < 500ms p95 (with TanStack Start SSR streaming + HTTP cache-control / stale-while-revalidate). RE-VALIDATE the 500ms target holds under TanStack Start before launch.
  - Discovery Agent first-token latency: < 1.5s p95 (Anthropic streaming).
  - Stripe webhook handling: < 2s end-to-end.
  - GitHub webhook processing (push / pull_request → cadence stats + commit-task linking): < 5s end-to-end.
- **Throughput:**
  - Up to 1000 concurrent marketplace viewers in year 1 (well within Lovable hosting + Supabase free/pro tiers).
  - Up to 50 concurrent discovery conversations (Anthropic API quota-bounded).
- **Resource Usage:**
  - Stay within Lovable Pro ($25/mo) + Supabase Pro tier for year 1 (~$50/mo); re-baseline the cost figure for the two-target deploy.

### Security

- **Authentication:** Supabase Auth (JWT, httpOnly cookies, automatic refresh).
- **Authorization:** Row-Level Security on all multi-tenant tables (`ngos`, `projects`, `fuel_transactions`, `messages`).
- **Secrets:** All API keys (Stripe, Anthropic, GitHub, Linear) stored in Supabase Vault + Supabase Edge Function secrets; never logged. The real Anthropic key additionally lives **only in gateway env** (decision-21) — volunteers hold `a4g_*` virtual keys, hash-only at rest, show-once at issuance.
- **PII Handling:** Minimum necessary — NGO verification docs encrypted at rest (Supabase Storage with private bucket + signed URLs).
- **Webhook Verification:** Stripe signature verification + GitHub HMAC signature verification on every webhook.
- **Rate Limiting:** Upstash Redis-based rate limiting on Auth, Discovery Agent, and Apply endpoints.
- **Compliance:**
  - **GDPR:** Right-to-erasure endpoint (deletes profile, anonymizes ledger entries); standard DPA available to EU NGOs.
  - **PCI:** Out of scope — all card data handled by Stripe; we never touch card numbers.
- **Audit Logging:** Append-only `audit_events` table for: fuel transactions, project status transitions, role changes, virtual-key issuance/revocation, Linear webhook ingest provenance.

### Scalability

- **Initial pilot:** 100 NGOs, 200 volunteers, 50 active projects.
- **Year 1 target:** 500 NGOs, 1000 volunteers, 200 active projects (well within Supabase Pro tier).
- **Horizontal scaling:** Lovable hosting auto-scales the TanStack Start SSR frontend; Supabase Edge Functions auto-scale the backend; Supabase provides managed Postgres scaling.
- **Heavy work** (webhook fanout, outbox drain, scheduled scans; gateway streaming if hosted on Supabase — OD-6) runs on **Supabase Edge Functions** (Deno), scheduled via **pg_cron** where periodic. Fly.io retained only as an escape hatch for any job exceeding Edge Function limits. (TBD resolved.)

#### Anthropic workspace-cap scale path — RETIRED by decision-21

The former plan managed Anthropic's 100-active-workspaces-per-org cap (per-project workspaces, archival pressure, multi-org fan-out, `anthropic_org_id` routing). **Decision-21 deletes per-project workspaces entirely** — the gateway attributes usage per virtual key at request time, so workspace count no longer grows with project count and the cap never binds. Gateway capacity scales per-request (Edge Functions auto-scale; a self-hosted gateway scales horizontally); the only Anthropic-side scale concern left is org-level rate/quota limits, monitored via the gateway golden signals (REQ-029).

### Reliability

- **Uptime SLA:** 99.5% (a small-team realistic target; ~3.6 hours/month).
- **RTO:** 4 hours (managed services, backup restore from Supabase PITR).
- **RPO:** 24 hours (Supabase point-in-time recovery on Pro tier).
- **Error Handling:** Sentry for app errors; structured logs to Axiom or Logflare; alerts on error-rate spike.

### Accessibility

- WCAG 2.1 AA target.
- Keyboard navigation across all flows.
- Tested with axe-core in CI; manual screen-reader pass before launch.
- Color contrast ≥ 4.5:1 (Tailwind default palette generally compliant, audit edge cases).

### Compatibility

- **Browsers:** Last 2 versions of Chrome, Firefox, Safari, Edge.
- **Devices:** Responsive web (mobile, tablet, desktop). **No native mobile apps in v1.**
- **Locale:** English only at launch. (i18n is Phase 3 / out of scope for v1.)

---

## Technical Considerations

### System Architecture

```
                       ┌──────────────────────┐
                       │  Lovable App          │
                       │  TanStack Start (SSR) │
                       │  - Marketplace        │
                       │  - NGO/Volunteer UI   │
                       │  - Discovery chat     │
                       └──────────┬───────────┘
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       │                          │                          │
       v                          v                          v
┌────────────┐           ┌──────────────┐         ┌───────────────────┐
│  Supabase  │           │   Stripe     │         │   GitHub App      │
│  - Auth    │           │   - Checkout │         │   - Repos         │
│  - Postgres│           │   - Webhooks │         │   - Issues        │
│  - Storage │           │   - Tax      │         │   - Webhooks      │
│  - Realtime│           └──────────────┘         └───────────────────┘
│  - Vault   │
└──────┬─────┘
       │
       v
┌────────────────────────────────┐          ┌──────────────────────────┐
│  Background Workers            │◄─webhooks─│  Linear (decision-20)    │
│  Supabase Edge Fns + pg_cron   │          │  workspace per project   │
│   - outbox drain / aging scan  │          │  status via GitHub       │
│   - linear/github/stripe hooks │          │  integration (PR merge)  │
│   - jumpstart health checks    │          └──────────────────────────┘
└────────────────────────────────┘

Two disjoint volunteer data paths (they touch ONLY at the task-ID binding, REQ-034):

  LLM path:   Claude Code (virtual key) ──► ai4good LLM GATEWAY ──► Anthropic
                                              │  caps · fingerprint · governance prompt
                                              └─► fuel ledger (inline, per request)

  Task path:  Claude Code ──► Linear MCP ──► Linear ──► webhook ──► Postgres projection ──► NGO panel

  (Platform-side Anthropic use — Discovery + the REQ-033 assistant — calls Anthropic directly
   from Edge Functions with the platform key; the gateway governs the volunteer rail only.)
```

### Key Components

1. **Lovable App — TanStack Start (SSR):** SSR loaders + TanStack Query for reads; webhooks/mutations/REST/SSE handled by Supabase Edge Functions (Deno); SSR-with-HTTP-cache (stale-while-revalidate) for the marketplace.
2. **Supabase:** Postgres + RLS for all data; Auth; Storage for NGO docs / logos; Realtime for live fuel updates; Vault for API keys.
3. **Stripe:** Checkout + webhooks for fuel; Stripe Tax for EU VAT invoices.
4. **GitHub App:** webhook ingest (push + pull_request) for cadence stats + `external_commit_refs` (Linear-identifier parsing, REQ-026). Issue *status* moves via Linear's own per-workspace GitHub integration, not our App. **GitHub Issues are not written or managed by ai4good in v1** — they remain dev-internal per REQ-008. One GitHub App owned by ai4good; NGOs grant repo-transfer scope only at handoff time.
5. **Anthropic API:** Discovery Agent + post-Discovery assistant (**Opus** — decision-13) called platform-side from Edge Functions; volunteer builds reach Anthropic only **through the LLM gateway** (decision-21).
6. **Worker layer:** Supabase Edge Functions (Deno), pg_cron-scheduled for periodic jobs; Fly.io worker only as an escape hatch if a specific job exceeds Edge Function time limits.
7. **LLM Gateway (REQ-009, decision-21):** terminates `a4g_*` virtual keys; caps + fingerprint + governance-prompt injection; streams to Anthropic with the real key held only in gateway env; writes the fuel ledger inline per request. Hosting = open decision (thin Deno proxy on Supabase vs self-hosted LiteLLM-style).
8. **Linear (REQ-026, decision-20):** coordination system of record — one free workspace per project; webhooks feed the Postgres projection; detect-and-revert enforces the status read/write split; platform-owned, never transfers at handoff.

### API Specifications

**Discovery Agent — Start Conversation**
```
POST {SUPABASE_FUNCTIONS_URL}/discovery-start   (Supabase Edge Function, Deno)
Auth: Bearer <Supabase JWT>  (ngo_admin)

Request:
{
  "projectDraftId": "uuid",
  "intake": "We need a way to track volunteer hours across our 5 chapters..."
}

Response (200):
{
  "conversationId": "uuid",
  "firstMessage": "Got it. To scope this well, I have a few questions..."
}
```

**Discovery Agent — Continue Conversation**
```
POST {SUPABASE_FUNCTIONS_URL}/discovery-message/{conversationId}   (Supabase Edge Function, Deno; SSE via ReadableStream/TransformStream — Deno natively supports SSE)
Body: { "content": "We use Google Sheets right now..." }
Response: streamed (SSE) — token-by-token from Claude
```

**Stripe Webhook**
```
POST {SUPABASE_FUNCTIONS_URL}/stripe-webhook   (Supabase Edge Function, Deno; Stripe-Signature verification unchanged)
Headers: Stripe-Signature

Events handled:
- checkout.session.completed       → create topup fuel_transaction (gross, Option γ)
- charge.dispute.created           → chargeback: freeze NGO + deactivate the project key + write 'chargeback' (reverse topup) and book consumed-compute loss as 'chargeback_writeoff' against platform revenue; create 'chargeback_review' ops_task (REQ-006 Item 3)
- charge.refunded                  → goodwill_refund row (only fires for the rare admin-initiated original-charge refund within 180d)
- payment_intent.payment_failed    → notify NGO admin
```

**GitHub Webhook**
```
POST {SUPABASE_FUNCTIONS_URL}/github-webhook   (Supabase Edge Function, Deno; X-Hub-Signature-256 verification unchanged)
Headers: X-Hub-Signature-256, X-GitHub-Event

Events handled (v1):
- push                              → cadence stats (REQ-010); Linear-identifier parse for external_commit_refs (REQ-026)
- pull_request (opened/merged)      → cadence stats (data only; no NGO-visible PR list per REQ-010). Issue STATUS moves via Linear's GitHub integration, not here.

Not subscribed in v1:
- issues                            → REQ-017 (post-handoff surfacing) is deferred to v2 per §11; during in_progress, GitHub Issues are dev-internal and ignored by the platform
```

**Linear Webhook (decision-20)**
```
POST {SUPABASE_FUNCTIONS_URL}/linear-webhook   (Supabase Edge Function, Deno; Linear signature verification)

Events handled (v1):
- Issue create/update/assign        → project_tasks projection upsert (one-way mirror); delivery_id de-dup in audit_events
- Issue status change               → projection upsert + DETECT-AND-REVERT: actor is not the GitHub integration AND no linked merged PR → revert via API + explanatory comment + linear_status_reverted notification
- Comment created                   → dev-internal; NOT mirrored to the NGO view (NGO comments live in task_comments, decision-15)
```

**LLM Gateway (decision-21; hosting = open decision)**
```
POST {ANTHROPIC_BASE_URL}/v1/messages          (volunteer's env points here; vanilla Claude Code unchanged)
Auth: x-api-key / Authorization = a4g_* virtual key

Per request: key lookup (hash) → caps check (per-request + rolling 24h) → project fuel balance > 0 →
fingerprint pairwise check (requests > ~1.5k input tokens) → governance prompt injection → stream to
Anthropic (real key in gateway env only) → price usage via rate card → paired ledger rows inline
(gateway_request_id idempotency; task_ref from the REQ-034 binding).
Request bodies are inspected transiently and never persisted.
```

### Database Schema (core tables)

```sql
-- Profiles & orgs (REQ-001, REQ-002) — see above

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID NOT NULL REFERENCES ngos(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'draft','discovery_in_progress','scoped','triage','open',
    'matched_pending_fuel','in_progress',
    'handoff_pending','handed_off','cancelled'
  )),
  -- 'paused' removed from v1 by decision-17 (2026-06-09) — pause/resume is v1.5; the
  -- paused_from_status restore column + fuel_deadline_remaining_seconds freeze-clock stash
  -- (codex rounds 3+4 / REQ-005.5) return with it. v1 workaround: unpublish pre-match,
  -- admin key-deactivation or cancel mid-build.
  matched_at TIMESTAMPTZ,
  fuel_deadline_at TIMESTAMPTZ,  -- 7 days after match; reverts to 'open' if not funded
  -- LLM gateway (REQ-009, decision-21): per-project Anthropic workspaces/keys are DELETED — volunteer
  -- credentials are `virtual_keys` rows (below); the real provider key lives only in gateway env.
  -- Linear coordination workspace (REQ-026, decision-20): created manually at kickoff (no public API),
  -- then API-driven (invites, decomposition push, webhook consumer).
  linear_workspace_id TEXT,
  linear_workspace_url TEXT,
  linear_team_id TEXT,
  -- Triage gate (REQ-023): platform-admin compliance review before marketplace
  triage_submitted_at TIMESTAMPTZ,
  triage_decided_at TIMESTAMPTZ,
  triage_decision TEXT CHECK (triage_decision IN ('approved','rejected','changes_requested')),
  triage_reviewer_id UUID REFERENCES profiles(id),
  triage_comments TEXT,
  -- Repo visibility (Platform Promise §2 — public MIT default, private opt-in for justified cases)
  visibility TEXT NOT NULL DEFAULT 'public_mit' CHECK (visibility IN ('public_mit','private')),
  visibility_justification TEXT,  -- required when visibility='private' (e.g. "handles beneficiary PII"); reviewed at triage REQ-023
  -- Data sensitivity + maintenance track (decided 2026-06-03 — Items 1 + 2; set from Discovery output)
  data_sensitivity TEXT NOT NULL DEFAULT 'tier0_no_pii' CHECK (data_sensitivity IN ('tier0_no_pii','tier1_ordinary_pii','tier2_special_category')),
  maintenance_track TEXT CHECK (maintenance_track IN ('A_ngo_maintains','B_developer_grade')),  -- v1 only ever sets 'A_ngo_maintains'; 'B_developer_grade' reserved for post-v1 (decision-19 — no migration needed to re-enable)
  github_org TEXT NOT NULL DEFAULT 'ai4good-projects',  -- always 'ai4good-projects' in v1; the two-org split ('ai4good-private') is a v1.5 hardening (REQ-008)
  deployment_url TEXT,                          -- live running app URL; handoff precondition (REQ-012 Goal 1); 30-day-alive health check pings this
  deployment_alive_last_checked_at TIMESTAMPTZ,
  deployment_alive BOOLEAN,
  -- Lovable Track-A orchestration (REQ-021): NGO-owned workspace; ai4good's backend doesn't bill it against fuel, but the volunteer's Skill meters + caps per-task usage
  -- Two distinct fields, codex round 4 critical fix — were overloaded as one:
  lovable_recommended BOOLEAN DEFAULT false,   -- Discovery flipped this when suggestedLovable.needed = true; v1: always true (every project is Track A, decision-19); drives NGO-setup CTAs
  lovable_enabled BOOLEAN DEFAULT false,       -- NGO flipped this when they completed Lovable setup (pasted lovable_workspace_url, optionally github_repo_url); drives UI features that need a live workspace (status widget, MCP connector reminder)
  lovable_workspace_url TEXT,
  lovable_workspace_id TEXT,                    -- Lovable's internal workspace ID; captured by volunteer at step 9 of lovable_setup_pending blocker checklist (REQ-021)
  lovable_project_id TEXT,                      -- Lovable's internal project ID; REQUIRED in v1 for Track-A Claude-Code-orchestrates-Lovable (REQ-021 + REQ-028 LovableDriver port) so the volunteer's Claude Code passes it to Lovable MCP `send_message(project_id=...)`. Captured by volunteer at step 9 of lovable_setup_pending blocker checklist.
  lovable_skipped_at TIMESTAMPTZ,               -- RESERVED (decision-19): the volunteer skip opt-out is removed in v1, so this is never set; kept for no-migration reinstatement of post-v1 Track B (was: volunteer chose Skip Lovable, project proceeds Claude-Code-only)
  lovable_status TEXT DEFAULT 'not_enabled' CHECK (
    lovable_status IN ('not_enabled','active','credits_low','blocked')
  ),
  intake_raw TEXT,
  scope_doc JSONB,
  suggested_stack JSONB,
  cause_tags TEXT[],
  assigned_volunteer_id UUID REFERENCES profiles(id),
  github_repo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  handed_off_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_ngo ON projects(ngo_id);

-- Volunteer profile extension
CREATE TABLE volunteer_profiles (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  skills TEXT[],
  cause_interests TEXT[],
  hours_per_week INTEGER,
  bio TEXT,
  github_languages JSONB,
  -- ai4good-projects org membership (REQ-007 — added on GitHub link, removed on deactivation/suspension/24-month-inactivity)
  ai4good_projects_org_added_at TIMESTAMPTZ,
  ai4good_projects_org_removed_at TIMESTAMPTZ,
  ai4good_projects_org_remove_reason TEXT,  -- 'deactivation' | 'aup_violation' | 'inactivity_24mo'
  -- First-apply disclaimer (open-item-5 2026-05-27 — moved from first-acceptance to first-apply per Story 3): one-time per volunteer; re-prompted only on disclaimer text version change
  first_apply_disclaimer_accepted_at TIMESTAMPTZ,
  first_apply_disclaimer_text_version TEXT,
  -- Lovable invitation email (codex round 7 fix — required at REQ-021 step 3 so NGO can invite the volunteer to their Lovable workspace; volunteer self-provides on first Lovable-recommended project, or sets in profile; defaults to platform email if unspecified)
  lovable_invite_email TEXT
);

-- Applications
CREATE TABLE project_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES profiles(id),
  cover_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','accepted','declined','withdrawn','expired','released'
  )),  -- 'released' = volunteer left/ghosted mid-project (REQ-027 abandonment). 'expired' = NGO didn't fund within 7d after acceptance
  release_reason TEXT CHECK (release_reason IS NULL OR release_reason IN ('ghosted','released_for_cause')),  -- REQ-027: 'ghosted' affects volunteer outreach signal; 'released_for_cause' does not auto-penalize (REQ-006/REQ-005.5). 'pending_github_link' removed open-item-4: GitHub link is now gated at apply time (REQ-007), so any application in the system already has the volunteer's github_handle present.
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- No table-level UNIQUE on (project_id, volunteer_id) — codex round 4 fix: an expired/declined/withdrawn applicant must be able to re-apply if the project re-opens. Active-only uniqueness enforced via partial index below.
);

-- Active application uniqueness: at most one open application per (project, volunteer). Past terminal applications don't block re-apply.
CREATE UNIQUE INDEX idx_applications_one_active_per_project_volunteer
  ON project_applications(project_id, volunteer_id)
  WHERE status IN ('pending','accepted');

-- (post_handoff_issues table removed from v1 schema — REQ-017 is v2 per §11; table will be added when REQ-017 is built)

-- Change requests (REQ-025): defined BEFORE project_tasks because project_tasks.change_request_id references it (codex round 3 forward-reference fix)
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  raised_by UUID REFERENCES profiles(id),  -- NGO admin
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'pending_review','accepted_active','declined','completed','cancelled'
  )),
  dev_response_note TEXT,
  created_task_ids UUID[],          -- PM tasks (REQ-026) created on accept; not GitHub issues
  decided_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  channel_message_id UUID,           -- v1.5 (decision-15): set when the full channel ships; unused in v1 (events go to the notifications feed)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- decision-16 (2026-06-09): ONE open CR per project (anti-distraction guardrail). v1 hard-enforces the default
-- of 1 via this unique partial index; the NGO cannot submit another CR until the volunteer decides the current
-- one. To relax to N>1 (v1.5) swap this index for an app-level count check against platform_settings.max_open_crs_per_project.
CREATE UNIQUE INDEX idx_change_requests_one_open ON change_requests(project_id) WHERE status = 'pending_review';

CREATE INDEX idx_change_requests_project ON change_requests(project_id);
CREATE INDEX idx_change_requests_open ON change_requests(project_id) WHERE status IN ('pending_review','accepted_active');

-- Platform PM tasks (REQ-026): NGO-visible task tree.
-- Decision-20 (2026-07-05): this is a READ-SIDE PROJECTION of the canonical state which lives in LINEAR
-- (one free workspace per project). Rows are written ONLY by the `linear-webhook` ingest consumer and
-- the lifecycle API jobs (decomposition push, CR-accept, handoff cancel). No user-facing code path
-- writes to this table. Linear is the canonical store; this table is the queryable mirror.
CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,            -- mirrors linear_identifier (e.g. 'A4G-12'); stable join key for task_comments / project_blockers
  linear_issue_id TEXT UNIQUE,       -- Linear's issue UUID (decision-20)
  linear_identifier TEXT,            -- human-readable Linear key (e.g. 'A4G-12'); appears in branch names / magic words
  parent_task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE,  -- hierarchy
  position INTEGER NOT NULL,                                            -- ordering among siblings (display order; may change freely)
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started','in_progress','done','blocked'
  )),
  priority TEXT NOT NULL DEFAULT 'p0' CHECK (priority IN ('p0','p1','p2')),  -- codex round 6 fix: NULL was a latent bug because handoff (REQ-012) gates on P0 — every task is p0 by default unless explicitly downgraded by the volunteer
  source TEXT NOT NULL CHECK (source IN ('discovery','change_request','manual')),
  change_request_id UUID REFERENCES change_requests(id),  -- if source=change_request (change_requests defined above)
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  external_commit_refs TEXT[],   -- commit SHAs that referenced this task ID
  metadata JSONB DEFAULT '{}',    -- e.g. {rail: 'claude' | 'lovable', auto_archived_reason: 'lifecycle_handoff', auto_archived_at: '...'} (codex round 5 fix — was referenced in REQ-026 but missing from schema)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON project_tasks(project_id);
CREATE INDEX idx_tasks_status ON project_tasks(project_id, status);
CREATE INDEX idx_tasks_parent ON project_tasks(parent_task_id);
CREATE INDEX idx_tasks_in_progress ON project_tasks(project_id) WHERE status = 'in_progress';
CREATE UNIQUE INDEX idx_tasks_unique_key_per_project ON project_tasks(project_id, task_key);

-- Per-project MCP / REST API tokens — per-actor or per-workspace for audit attribution (codex rounds 5+6)
-- v1 token types:
--   'volunteer' — issued to the assigned volunteer for their local Claude Code (token_hash stored; raw token shown once on project page, env var AI4GOOD_PROJECT_TOKEN)
--   'workspace' — RESERVED, never issued in v1 (decision-20 deleted the ai4good-MCP-in-Lovable chat connector; Linear MCP replaced that surface)
--   'platform_admin' — issued to platform-admin tooling for ops (audit-traceable; rarely used; minted as needed)
-- v1 does NOT issue NGO tokens. NGOs use the ai4good UI only; the UI mutates via server-side auth (Supabase JWT + RLS), not via project API tokens.
CREATE TABLE project_api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),                 -- NULL for 'workspace' tokens (not tied to a single profile); set for 'volunteer'/'platform_admin'
  actor_role TEXT NOT NULL CHECK (actor_role IN ('volunteer','workspace','platform_admin')),
  token_hash TEXT NOT NULL UNIQUE,                       -- bcrypt of the bearer; raw token never stored; show-once on issue
  label TEXT,                                            -- e.g. 'lovable-connector', 'claude-code-laptop', 'ops-rotation'
  last_seen_at TIMESTAMPTZ,                              -- updated on every authenticated call; drives Lovable Setup-page connection-status indicator
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT
);

CREATE INDEX idx_project_api_tokens_project ON project_api_tokens(project_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_project_api_tokens_actor ON project_api_tokens(actor_id) WHERE actor_id IS NOT NULL;

-- Task comments (REQ-026 `comment_task` MCP tool + the `NGO can comment` permission; codex round 5 fix — table was referenced but missing)
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,  -- decision-15: always set (the thread's project)
  task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE,         -- decision-15: NULLABLE — NULL = project-level comment (the REQ-015 project thread); non-NULL = task-anchored comment
  author_id UUID REFERENCES profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id, created_at) WHERE task_id IS NOT NULL;
CREATE INDEX idx_task_comments_project ON task_comments(project_id, created_at);  -- decision-15: project comment-thread read path

-- RLS rule (codex round 6 resolution, option iii; updated by decision-20):
-- - NGO admins CAN add comments via task_comments (append-only feedback for typos / staging-review notes — they need *somewhere* to leave short reactions without the full CR overhead).
-- - NGO admins CANNOT update task status, title, description, or priority anywhere.
-- - Volunteers do task work in LINEAR (read / self-assign / comment; status moves on PR merge — decision-20); ai4good-side they may append task_comments like the NGO.
-- - No task mutations exist through ai4good at all — the projection has ONE writer (the linear-webhook consumer + lifecycle API jobs).
-- - No NGO tokens in v1 — NGOs use the UI only.
-- - Scope/intent changes always go through CR (REQ-025) regardless of who's asking.

-- Project blockers (REQ-024): orthogonal operational health
CREATE TABLE project_blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'clarifying_question','awaiting_ngo_review','external_dependency',
    'fuel_topup_needed','lovable_credits','github_collaborator_needed',
    'lovable_setup_pending',  -- open-item-4 2026-05-26: replaces the prior platform-admin ops task; volunteer-initiated post-kickoff when they choose to use Lovable; auto-resolved on validation of pasted URLs + MCP last_seen_at
    'spend_anomaly_review'    -- DEFERRED to v1.5 (decision-14): REQ-009 anomaly scorer not built in v1; enum reserved, not raised in v1
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','blocking')),
  title TEXT NOT NULL,
  body TEXT,
  raised_by UUID REFERENCES profiles(id),  -- NULL for auto-raised
  raised_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  resolution_reason TEXT,  -- 'manual_resolution', 'auto_fuel_topup', 'auto_lovable_topup', 'project_moved_to_handoff'
  channel_message_id UUID,  -- v1.5 (decision-15): unused in v1 (no channel; events to notifications feed)
  task_id UUID REFERENCES project_tasks(id),  -- task-anchored clarification (REQ-026 ↔ REQ-024); NULL = project-level
  metadata JSONB
);

CREATE INDEX idx_blockers_project_open ON project_blockers(project_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_blockers_aging ON project_blockers(raised_at) WHERE resolved_at IS NULL;

-- Dedup: at most one unresolved fuel_topup_needed / lovable_credits / github_collaborator_needed per project (codex rounds 2 + 3 fix)
CREATE UNIQUE INDEX idx_blockers_unique_open_singletons
  ON project_blockers(project_id, type)
  WHERE resolved_at IS NULL AND type IN ('fuel_topup_needed','lovable_credits','github_collaborator_needed','lovable_setup_pending','spend_anomaly_review');

-- Tables added to address codex round 2 schema gaps (channels, messages, notifications, tips, NGO satisfaction, verification docs, platform settings, rate-card versions)

-- Channels (REQ-015) — DROPPED from v1 by decision-15 (2026-06-08). The real-time Slack-style channel
-- (channels / channel_members / messages tables + Realtime + markdown + @-mentions + archival) is a v1.5
-- upgrade. v1 ships a lightweight project comment thread backed by task_comments (task_id IS NULL =
-- project-level). System events surface in the notifications feed via notify() (sole writer), not channel posts.

-- Project need attachments (REQ-032, added 2026-06-06): NGO reference files for Discovery + build.
-- Bytes live in an S3-compatible OBJECT STORE (Cloudflare R2 recommended), NOT Supabase Storage.
-- This table is metadata only; access is via short-TTL signed URLs minted by an ai4good edge function
-- that enforces NGO-member / assigned-volunteer / platform-admin + projects.visibility (object stores
-- have no row-level security). Governance-by-disclosure for PII (REQ-032); no upload scan in v1.
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_key TEXT NOT NULL,                         -- object-store key: projects/<project_id>/<file_id>/<filename>
  description TEXT,                                   -- NGO's one-line "what this is"
  discovery_visible BOOLEAN NOT NULL DEFAULT true,   -- include in Discovery Agent multimodal context (REQ-004)
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                              -- soft-delete
);
CREATE INDEX idx_project_files_project ON project_files(project_id) WHERE deleted_at IS NULL;
-- RLS: SELECT by NGO members of project_id + assigned volunteer + platform_admin (private projects
-- restricted to members per projects.visibility); INSERT by NGO members + platform_admin; soft-delete
-- by uploader or NGO admin. The signed-URL edge function re-checks the same predicate before minting a URL.

-- messages (REQ-015) — DROPPED from v1 by decision-15. Reinstated with channels/channel_members in v1.5
-- for the full real-time channel. The v1 project comment thread uses task_comments (project-level rows,
-- task_id IS NULL). System messages are gone in v1 — events go to the notifications feed via notify().

-- Notifications (REQ-016)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,    -- e.g. 'blocker_raised', 'fuel_low_20pct'
  payload JSONB,
  delivered_email_at TIMESTAMPTZ,
  delivered_in_app_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE read_at IS NULL;

-- Post-handoff attribution + jumpstart health (REQ-035, decision-22). Capture ships in v1;
-- synthesis / matching surfaces are v1.5. Credit-framed — never a public star score (Out of Scope #11).
CREATE TABLE handoff_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES profiles(id),
  submitted_by UUID NOT NULL REFERENCES profiles(id),   -- NGO admin at sign-off
  dimensions JSONB NOT NULL,                            -- {communication, delivered_scope, self_service_onboarding} — 4-point descriptive scale
  testimonial TEXT,                                     -- optional free text; feeds the volunteer's portfolio
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  day_mark INTEGER NOT NULL CHECK (day_mark IN (30, 60, 90)),
  deployment_alive BOOLEAN,
  self_service_change_count INTEGER,                    -- NGO self-service changes in Lovable (where readable)
  feature_requests_opened INTEGER,
  rescue_requests INTEGER,
  ngo_tried_and_failed BOOLEAN,                         -- 60-day one-question answer; ONLY tried-and-failed counts against health
  derived_state TEXT CHECK (derived_state IN ('actively_self_served','stalled','unknown')),
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, day_mark)
);

-- (tips table removed from v1 schema — REQ-022 deferred to v1.5 per §11; table will be added when v1.5 tips ship)

-- (ngo_satisfaction_signals table removed from v1 schema — collection mechanism deferred to v1.5 along with handoff tips UX; table will be added when v1.5 work begins)

-- Verification docs (REQ-002)
CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
  kind TEXT CHECK (kind IN ('registration_doc','reference_link')),  -- v1 only. v1.5 adds 'tax_exempt_doc' + 'kyc_doc' when REQ-002 KYC tier ships.
  storage_path TEXT,           -- Supabase Storage private bucket
  reference_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_decision TEXT CHECK (review_decision IN ('approved','rejected','requested_changes')),
  review_notes TEXT
);

-- Platform settings (singleton table — one row only)
CREATE TABLE platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  skim_percent_bps INTEGER NOT NULL DEFAULT 1500,  -- 15%
  fuel_min_topup_cents INTEGER NOT NULL DEFAULT 5000,  -- $50
  -- retention_decay_months removed 2026-06-03 — non-cash credit has no decay clock (Item 3)
  first_fund_cap_cents INTEGER NOT NULL DEFAULT 20000,         -- $200 per-project cap for new funders (rises with history; Item 3)
  reserve_floor_cents INTEGER NOT NULL DEFAULT 500000,         -- $5k chargeback reserve floor (Item 3); cash_buffer_alert fires below
  workspace_cap_multiplier_bps INTEGER NOT NULL DEFAULT 30000,  -- 3.0× (300%) of funded
  workspace_cap_floor_cents INTEGER NOT NULL DEFAULT 20000,     -- $200
  max_open_crs_per_project INTEGER NOT NULL DEFAULT 1,          -- decision-16: anti-distraction cap on open CRs (v1 enforces 1 via unique partial index; >1 is a v1.5 count-check)
  -- Decision-11 (2026-06-06): context-weighted Discovery CREDITS (free pre-fuel phase). DAILY drip, no rollover. Tunable.
  discovery_tokens_per_credit INTEGER NOT NULL DEFAULT 10000,   -- 1 credit = 10k context-token-equivalents (~$0.15 Opus; the credit COUNT is token-based/model-agnostic, only platform $/credit changes — decision-13)
  discovery_credit_grant_unverified INTEGER NOT NULL DEFAULT 10,  -- DAILY free allowance, unverified (~10 normal turns/day)
  discovery_credit_grant_verified INTEGER NOT NULL DEFAULT 30,    -- DAILY free allowance, verified (3x reward; absorbs the retired 30-msg/day cap)
  discovery_cached_input_weight_bps INTEGER NOT NULL DEFAULT 1000,  -- cached input tokens count at 10% (prompt-caching discount)
  -- daily reset is at 00:00 UTC (hard reset to the tier grant, no rollover) — no interval knob (daily-drip amendment retired discovery_credit_reset_interval_days)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anthropic rate-card versioning (REQ-009 needs this for retroactive recomputes if rates change)
CREATE TABLE anthropic_rate_cards (
  version TEXT PRIMARY KEY,                    -- e.g. '2026-05-23-v1'
  rate_card JSONB NOT NULL,                    -- per-model, per-service-tier, per-cache-type
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,                 -- NULL = current
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit (extended for disclaimer-acceptance tracking per codex round 2 nit)
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  actor_ip INET,                       -- captured for disclaimer acceptances (Story 1/3 + REQ-006)
  actor_user_agent TEXT,               -- captured for disclaimer acceptances
  event_type TEXT NOT NULL,            -- e.g. 'disclaimer_accepted', 'key_revealed', 'match_acknowledged'
  entity_type TEXT NOT NULL,           -- e.g. 'ngo', 'project', 'volunteer', 'consent'
  entity_id UUID,
  payload JSONB,
  disclaimer_text_version TEXT,        -- for consent events: which version of disclaimer text
  disclaimer_text_sha256 TEXT,         -- hash of exact accepted text (legal-grade)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
```

### Technology Stack

- **Frontend:** TanStack Start (SSR) — React 18, TanStack Router + TanStack Query, Tailwind CSS, shadcn/ui components. Lovable owns and two-way-syncs the frontend repo. (No App Router / Server Components / Server Actions.)
- **Backend:** Supabase Edge Functions (Deno) for webhooks / mutations / REST / SSE; pg_cron for periodic jobs; Supabase Postgres, Supabase Auth, Supabase Storage (verification docs), Supabase Realtime. **Cloudflare R2** (S3-compatible object store, zero egress) for **project need attachments** (REQ-032), accessed only via signed URLs from an ai4good edge function.
- **DB / ORM:** Postgres via Supabase; direct SQL + RLS for security-sensitive paths; Drizzle ORM for application queries.
- **Payments:** Stripe (Checkout, Webhooks, Tax).
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`) — **Opus for Discovery + the post-Discovery assistant** (decision-13, platform-side); volunteer builds route through the **ai4good LLM gateway** (decision-21) on `a4g_*` virtual keys — the real key never leaves gateway env.
- **Task coordination:** **Linear** (decision-20) — free workspace per project; GraphQL API + webhooks; GitHub integration drives issue status; Linear MCP for agents via the repo's committed `.mcp.json`. Platform-owned; workspaces come from a pre-created pool (creation has no API — batch concierge replenishment; kickoff assignment is API-only via `organizationUpdate` rename).
- **VCS:** GitHub App (Octokit) for org setup + webhook ingest (push / pull_request → cadence + `external_commit_refs`). GitHub Issues are not managed by ai4good in v1 (dev-internal only per REQ-008).
- **Infra:** Lovable hosting (frontend, TanStack Start SSR), Supabase (data + auth + Edge Functions + pg_cron). (Upstash already deferred per §11 decision-10.)
- **Observability:** Sentry (errors), Axiom or Logflare (logs), Lovable analytics (get_project_analytics) + Supabase Edge Function / DB logs.
- **CI/CD:** GitHub Actions for test/lint; deploy = Lovable `deploy_project` (frontend) + Supabase CLI `functions deploy` / `db push` (backend Edge Functions + migrations).

### External Dependencies

| Service | Purpose | Failure mode | Fallback |
|---|---|---|---|
| Supabase | DB, Auth, Storage | Hard dependency | None (status page surfaced to users) |
| Stripe | Payments | Hard dependency for top-ups | Queue intent + retry; show "try again in a few minutes" |
| Anthropic API | Discovery + volunteer dev (via the gateway) | Hard dependency for discovery + builds | Queue + retry with backoff; manual scope option as escape hatch |
| ai4good LLM gateway | Volunteer build metering + governance (decision-21) | Hard dependency for volunteer builds | Golden-signal paging (REQ-029); real-key rotation runbook (REQ-030); hosting choice open |
| Linear | Task coordination system of record (decision-20) | Panel goes stale; volunteers keep working (git unaffected) | Projection serves last state; webhook replay catches up; workspace-creation fallback = Basic tier or git-based deterministic truth layer |
| GitHub | Repo + webhooks + Linear status integration | Hard dependency for project execution | Retry queue; degraded mode (read-only project page) |
| Resend | Transactional email | Soft | Fall back to Supabase SMTP |
| Upstash Redis | Rate limit + cache | Soft | Open the limit (log warning) |

### Migration Strategy

Greenfield — no data migration. Strategy concerns are forward-compatibility:

1. Use UUIDs everywhere (never auto-inc) so future sharding/import carries no key-collision risk.
2. Use **`BIGINT amount_micro_cents`** for fuel ledger amounts (never float, never plain cents — micro-cents are required for sub-cent Anthropic Usage Report buckets per REQ-009). Stripe-facing config fields (e.g. `platform_settings.fuel_min_topup_cents`) stay as `INTEGER cents` since they're user-facing dollar presets.
3. Store skim percentage **on the transaction**, not just in `platform_settings`, so historical reporting survives policy changes.
4. Schema versioned via Supabase migrations; `db push` on each PR + production migrations gated by PR approval.

### Testing Strategy

- **Unit:** Vitest. Target ≥80% on `lib/` (pure logic: fuel math, match scoring, scope parsing). Mocks for external services.
- **Integration:** Vitest + Supabase local + Stripe CLI listeners. Tests for: signup → publish → fund → apply → accept → handoff. Cover webhook idempotency.
- **E2E:** Playwright. Two scripted journeys: (a) NGO end-to-end happy path, (b) Volunteer end-to-end happy path. Run against the Lovable preview_url (frontend) + a Supabase staging project (Edge Functions deployed via Supabase CLI), triggered after Lovable deploy_project + Supabase functions deploy / db push (not a single Vercel deploy).
- **Performance:** k6 smoke on marketplace + discovery start. Target: marketplace p95 < 500ms at 100 RPS.
- **Security:** Snyk or GitHub Advanced Security on dependencies; manual review of RLS policies; OWASP ZAP baseline scan before launch against the Supabase staging project (Edge Functions + RLS) behind the Lovable preview_url.

---

## Implementation Roadmap

**Total timeline (post-scope-cut; re-baselined 2026-06-03 pivot; +10h decision-8; -6h decision-9; -80h decision-10; +17h REQ-032 attachments; +5h decision-11 Discovery credits incl. daily-drip; +10h decision-12 post-Discovery NGO assistant REQ-033; −9h decision-14 defer REQ-009 spend-anomaly engine; −12h decision-15 REQ-015 → project comment thread; +2h decision-16 CR anti-distraction guardrails; −6h decision-17 remove `paused` state):** **≈ ~392h core / ~494h buffered; then −3h decision-19 and ≈ +31h the 2026-07-05 governance fold-in (decisions 20/21/22 — Linear, gateway, attribution) → ≈ ~420h core / ~530h buffered → ~14-17 weeks for 2 engineers.** **NOTE (2026-07-05): the per-phase task hints below predate decisions 20/21/22 and are NOT re-decomposed here — the authoritative build decomposition is produced by the PRD-dissection loop into Linear (the TaskMaster tree was dropped with decision-20).** Cut scope per §11 (auto-top-up, tips, full CR UI, match scoring, satisfaction signals, KYC automation, Lovable email parser, two-org GitHub split, paid Discovery wallet, **platform task-MCP server (decision-9)**, **plus the decision-10 v1.5 deferrals: rate-limiting/Upstash, gradual-rollout, analytics dashboard, concierge CRM, content-takedown UI, multi-jurisdiction tax, self-serve GDPR, Upstash cache, multi-org Anthropic router**) keeps v1 shippable in this range. The decision-10 pass also consolidated the meter trio, the comms substrate, and the outbox reliability layer (ranks 2-4) without losing v1 capability. **PM tree storage is git (decision-9): `.taskmaster/tasks/tasks.json` in the project repo, mirrored to Postgres via GitHub webhook for NGO UI; volunteer's Claude Code drives local TaskMaster. No platform-hosted task-MCP server.** Phase 1 + 2 = MVP launch; Phase 3 = dashboards, comms & platform-operations; Phase 4 = pre-launch hardening; Phase 5 = public beta + concierge launch.

### Phase 1: Foundation (Weeks 1-3)

**Goal:** Auth, NGO org, profiles, scaffolding. Nothing user-facing public yet.

- Task 1.1: Supabase project + base schema (profiles, ngos, ngo_memberships) — Medium (8h)
- Task 1.2: Scaffold app shell — Lovable creates the TanStack Start (SSR) project + GitHub repo (Tailwind, shadcn/ui) — Small (4h)
- Task 1.3: Supabase Auth integration (email + GitHub OAuth) — Medium (6h)
- Task 1.4: RLS policies for multi-tenant data — Medium (6h)
- Task 1.5: NGO org profile + verification doc upload — Medium (8h)
- Task 1.6: Volunteer profile + GitHub OAuth import — Medium (8h)
- Task 1.7: Platform admin queue (verification review) — Small (5h)
- Task 1.8: Sentry + logging baseline — Small (3h)

**Validation Checkpoint 1:** A test NGO and test volunteer can sign up, complete profiles, and the NGO can be marked verified by a platform admin.

---

### Phase 2: Core MVP (Weeks 4-7)

**Goal:** End-to-end first project, in the correct lifecycle order: **draft → discovery_in_progress → scoped → triage → open → matched_pending_fuel → in_progress → handoff_pending → handed_off**. The NGO flow is **post → discovery → publish → triage → match → fund → kickoff**, with **fund-on-match** (not fund-on-publish — corrects prior phrasing).

- Task 2.1: Project draft + intake form — Medium (6h)
- Task 2.2: Discovery Agent — system prompt + conversation engine — Large (16h)
- Task 2.3: Discovery output → editable scope doc — Medium (8h)
- Task 2.4: Project publish flow → triage (REQ-023) — Medium (6h)
- Task 2.5: Stripe Checkout integration + fuel ledger schema (single-row topup, Option γ; **NO auto-top-up in v1**) — Medium (10h)
- Task 2.6: Stripe webhook + idempotent reconciliation — Medium (8h)
- Task 2.7: Marketplace listing + filters (skill/cause/complexity badges; **no numeric match score in v1**) — Medium (8h)
- Task 2.8: Apply / accept flow (Accept/Decline buttons; **no match score algorithm in v1**) — Small (5h)
- Task 2.9: GitHub App registration + repo creation on funding (Claude Code path only; Lovable repo URL captured separately per REQ-008) — Medium (10h)
- Task 2.10: **Decomposition-to-Linear + NGO REST API** (REQ-026 decision-20 — draft issue tree from Discovery output, coordinator review, API push; REST endpoints (comments/blockers/context) as Supabase Edge Functions with per-project bearer-token auth) — Medium (11h)
- Task 2.11: **`linear-webhook` Supabase Edge Function (Deno) + Postgres projection** (REQ-026 decision-20 — signature verify, projection upsert, `delivery_id` de-dup, **detect-and-revert** on non-integration status changes) + `github-webhook` (cadence + `external_commit_refs`) — Medium (12h)
- Task 2.12: LLM gateway core — virtual keys (mint/revoke/show-once) + streaming pass-through + caps + fingerprint + governance injection (REQ-009 decision-21) — Large (24h)
- Task 2.13: Gateway **inline metering** — rate-card pricing + paired ledger rows + `gateway_request_id` idempotency + `task_ref` capture (REQ-009/034) — Medium (8h)
- Task 2.14: Fuel-low blockers + notifications integration (REQ-024) — Small (5h)
- Task 2.15: Project page (public, single view) + PM task tree + activity feed (REQ-010) — Medium (10h)
- Task 2.16: Lovable Track-A surfaces (REQ-021: manual status widget + Lovable Setup page — post-decision-20, no connector/token panels — + Knowledge-field snippet docs; the active orchestration logic lives in the Skill, Task 2.18; **no inbound email parser in v1**) — Small (5h)
- Task 2.17: Handoff checklist + sign-off flow (no tips in v1; includes the REQ-035 attribution step — decision-22) — Medium (7h)
- Task 2.18: ai4good Claude Code Skill — **v1 CORE orchestration shell** (REQ-028 + REQ-021): `LovableDriver` anti-corruption port over Lovable MCP (`send_message`/`get_diff`/`get_workspace`), structural per-task credit cap + `get_workspace` balance polling + scope/audit enforcement, **manual dual-rail fallback** when Lovable MCP is unavailable, plus install/session-bootstrap/slash-commands/branch-convention-hook/**task-binding PostToolUse hook (decisions 20/22)** — Large (27h: decision-20 removes the auto-commit hook, decision-22 adds the binding hook)
- Task 2.19: Transactional **outbox** — `outbox_events` table + relay worker + at-least-once delivery driving all side-effect sagas (kickoff, teardown, abandonment, handoff) — Medium (10h)
- Task 2.20: Ledger integrity — pair-sum **control-total** pg_cron → Supabase Edge Function (Deno) nightly job (every entry balances) + the `stripe-webhook` Supabase Edge Function handling dispute/`chargeback` + `chargeback_writeoff` + `reserve_floor_cents` + `first_fund_cap_cents` enforcement (REQ-006) — Medium (10h)
- Task 2.21: Continuous **base-permission invariant** job (REQ-008 — every active volunteer holds exactly their project's repo role; reconcile drift; single-org v1) — Small (4h)
- Task 2.22: **Deploy-to-running** step (REQ-012 — deploy the app to a live URL, capture `deployment_url`, gate handoff on it; handoff ritual: enable Supabase RLS, demo revert/rollback, wire two-way GitHub, set spend cap) — Medium (7h)
- Task 2.23: **Tier-2 fixtures enforcement** (Discovery `data_sensitivity` classification gate + triage enforcement + fixtures-only build guard so special-category data never reaches Anthropic/Lovable/the volunteer pre-handoff) — Small (4h)
- Task 2.24: **Decision-8 unified-fuel + decision-11 Discovery CREDITS** — `ngos.discovery_credits_remaining` (credits, not cents) + `platform_settings` credit params + `unverified→verified` 500-refill + `profiles.email_verified_at` sync trigger + Stripe Checkout reachable from `draft`/`discovery_in_progress` + `discovery_consumption` ledger kind + **context-weighted per-turn credit cost (caching discount) + credit gauge + per-turn + per-file cost UI** + credits-exhausted composer states (verify-CTA / top-up-CTA) + first-funding hard-ack modal (REQ-002/004/006/032, Promise §3/§9) — Medium (13h)

**Validation Checkpoint 2:** End-to-end happy path works against the staging environment (Lovable preview_url + Supabase staging project, Edge Functions deployed via Supabase CLI) — one real NGO + one volunteer can complete a project **through to a deployed, reachable `deployment_url`** (REQ-012 deploy step is a handoff precondition, not optional), with the handoff ritual (RLS-on, revert demo, two-way GitHub, spend cap) executed.

---

### Phase 3: Dashboards, Comms & Platform Operations (Weeks 8-10) — v1 minimal versions only

**Goal:** Ship the v1 minimal dashboards + comms surfaces that REQ-024 / REQ-025 / REQ-026 depend on; reduce platform-team toil; enable scale; **stand up the operability layer the pivot requires (observability, incident response, moderation, abandonment/rematch)**. v1.5 enhancements (per §11) are explicitly out of Phase 3.

- Task 3.1: NGO dashboard v1 minimal (project list + fuel + task progress + "Action needed" rail; **no recent activity feed, KYC upsell, Lovable rail, testimonials in v1**) — Small (6h)
- Task 3.2: Volunteer dashboard v1 minimal (current projects + fuel gauge + completion credit; **no badge engine in v1**) — Small (5h)
- Task 3.3: In-platform messaging v1 minimal (one channel per project; basic chat; auto system messages; @mention email; **no threading/search/attachments in v1**) — Medium (8h)
- Task 3.4: Notification dispatch with sensible defaults (event-driven; **no per-user preferences UI in v1 — that's v1.5**) — Small (6h)
- Task 3.5: Audit-log viewer (admin) — Small (5h)
- Task 3.6: Volunteer "Shipped first tool" badge (single badge in v1; **multi-badge engine deferred to v1.5**) — Small (3h)
- Task 3.7: **Observability** (REQ-029) — `job_runs` heartbeat monitor + outbox-lag + ledger control-total + Anthropic-provisioning-failure alerting; v1 SLO dashboard — Medium (10h)
- Task 3.8: **Ops & Incident Response** (REQ-030) — runbooks + admin money-correction console (`goodwill_refund` / `chargeback_writeoff` / paired-row corrections, all double-entry) + incident `ops_tasks` types — Medium (10h)
- Task 3.9: **Content moderation** (REQ-031) — takedown flow + secret-scanning on `ai4good-projects` repos + `content_abuse_review` ops queue — Medium (10h)
- Task 3.10: **Abandonment / rematch saga** (REQ-027) — 21-day inactivity job (plain `in_progress` status filter, decision-17) + manual release + outbox teardown reusing REQ-007 step-2 + fuel-stays-on-project + rematch priority — Medium (8h)
- ~~Tips / Connect onboarding, REQ-017 post-handoff, NGO satisfaction modal~~ — **all deferred to v1.5 per §11; not Phase 3 work**

**Validation Checkpoint 3:** 3 pilot NGOs and 5 pilot volunteers can run their entire engagement inside the platform without out-of-band Slack/email; the ops console can correct a money error via paired ledger rows and the control-total job stays balanced.

---

### Phase 4: Hardening & Beta Launch (Weeks 11-13)

**Goal:** Reliability, security, accessibility — ready for public beta.

- Task 4.1: Test coverage push to 80% — Large (16h)
- Task 4.2: Playwright E2E suite (NGO + volunteer journeys) — Medium (10h)
- Task 4.3: Accessibility audit + fixes — Medium (10h)
- Task 4.4: Security: RLS audit + ZAP scan + Snyk integration — Medium (10h)
- Task 4.5: Stripe Tax + VAT invoice setup — Small (5h)
- Task 4.6: GDPR: erasure endpoint + DPA copy — Small (5h)
- Task 4.7: Rate limiting (Upstash) — Small (4h)
- Task 4.8: Performance pass (SSR-with-HTTP-cache / stale-while-revalidate, TanStack image handling, TanStack Query caching) — Medium (8h)
- Task 4.9: Onboarding emails + help center stubs — Small (5h)
- Task 4.10: Public landing page + signup-gating — Small (6h)

**Validation Checkpoint 4:** Pen-test report shows no critical findings; p95 marketplace < 500ms under 100 RPS; axe-core CI passes.

---

### Phase 5: Public Beta & Concierge Launch (Weeks 14-16)

**Goal:** Open the door (concierge-first per Goal 5) + plant the seeds for the v1.5 roadmap. (Multi-volunteer / Claude Code proxy remain v2/v1.5 per Out of Scope — no v1 build here beyond spec docs.)

- Task 5.1: Public-beta launch checklist (status page, support email, monitoring) — Small (5h)
- Task 5.2: Gradual rollout (invite-only → open) — Small (3h)
- Task 5.3: Analytics dashboard (internal) for goals 1-5 (adds the supply-funnel + 30-day-alive metrics) — Medium (10h)
- Task 5.4: v1.5 AI Proxy spec doc — Small (5h)
- Task 5.5: v1.5 deferred-feature backlog prioritization based on pilot data — Small (5h)
- Task 5.6: Retrospective + v1.5 PRD revision — Small (5h)
- Task 5.7: **Concierge supply-funnel tooling** (Goal 5 / Item 6) — volunteer-bench admin CRM + supply-funnel metric (signup→apply→match→handoff) + volunteer-activation dashboard — Medium (8h)
- Task 5.8: **Aging-`open`-project nudge job** (Goal 5 — surfaces stale `open` projects to concierge for hand-match; plain status filter per decision-17) — Small (3h)
- Task 5.9: **Hand-match admin tool** (curate + directly assign the first ~10-15 projects before organic browse opens) — Small (5h)

**Validation Checkpoint 5:** 10+ projects in flight, ≥1 successful handoff in public beta, **and ≥1 handed-off project still reachable at its `deployment_url` 30 days post-handoff** (REQ-012 30-day-alive check / Goal 1).

---

### Critical Path

```
1.1 schema → 1.3 auth → 1.5 NGO org → 2.1 intake → 2.2 discovery → 2.3 scope
  → 2.4 publish (triage) → 2.5 Stripe → 2.7 marketplace → 2.8 apply
  → 2.9 GitHub repo → 2.10 Linear decomposition → 2.11 linear-webhook projection
  → 2.12 LLM gateway → 2.13 inline metering → 2.18 Skill orchestration shell → 2.19 outbox
  → 2.20 ledger control-total → 2.22 deploy-to-running → 2.15 project page
  → 2.17 handoff → 3.7 observability → 3.8 ops/incident → 4.* hardening → 5.* launch
```

### Effort Estimation (post-scope-cut)

- Phase 1: ~48h (8 tasks, unchanged)
- Phase 2: ~219h (post-pivot re-decomposition + decision-9: prior ~157h + Skill orchestration shell upgrade +19h [Task 2.18: 16→35h] + idempotent poller +4h [Task 2.13: 10→14h] + outbox 10h [2.19] + ledger control-total/chargeback 10h [2.20] + base-permission invariant 4h [2.21] + deploy-to-running 7h [2.22] + Tier-2 fixtures enforcement 4h [2.23] + decision-8 unified-fuel + free-pool Discovery 10h [2.24] = +68h; **decision-9 net -6h** [2.10 +3h, 2.11 -2h, 2.18 -7h: platform task-MCP dropped, git-webhook projection added])
- Phase 3: ~71h (prior ~33h + observability 10h [3.7] + ops/incident 10h [3.8] + content moderation 10h [3.9] + abandonment/rematch saga 8h [3.10] = +38h)
- Phase 4: ~79h (unchanged — hardening must happen regardless)
- Phase 5: ~49h (prior ~33h + concierge supply-funnel 8h [5.7] + aging-open nudge 3h [5.8] + hand-match tool 5h [5.9] = +16h)
- **Subtotal before decision-10: ~466h** (Phase 1 ~48 + Phase 2 ~219 + Phase 3 ~71 + Phase 4 ~79 + Phase 5 ~49). The ~350h pre-pivot figure + the pivot/decision-8 hardening ≈ +122h, then decision-9 nets ~-6h.
- **2026-06-06 decision-10 simplification pass: ≈ −80h** (ranks 2-4 consolidations ≈ −45h across Phase 2/3 — meter split, one comms substrate, one outbox+handler-registry; plus the #45 + rank-6 v1.5 deferrals ≈ −35h across Phase 3/4/5). Rank 1 already counted under decision-9.
- **Total v1 (post-decision-10): ≈ ~385h core** engineering. Per-phase split is now approximate (cuts span phases).
- **Decisions 11–19 net:** +17h (REQ-032) +5h (d11 credits) +10h (d12 assistant) −9h (d14) −12h (d15) −6h (d17) +2h (d16) −3h (d19) → ≈ ~389h core.
- **2026-07-05 governance fold-in (decisions 20/21/22): ≈ +31h net** — Linear replaces the git-projection plumbing (≈ +7h), the gateway replaces the poller / manual-key-ops / deactivation stack (≈ +1h — near cost-neutral for strictly stronger properties and zero manual key ops), attribution capture + NGO burn-per-deliverable (REQ-034, ≈ +12h), post-handoff attribution + jumpstart health capture (REQ-035, ≈ +11h). **Landing v1 at ≈ ~420h core / ~530h buffered — treat this as authoritative** (supersedes ~392h/~494h).
- **Risk buffer:** +25% → **≈ ~480h total budget** (**realistically 12-15 calendar weeks for 2 engineers at 60-70% capacity**, accounting for the unaccounted-for engineering work codex round 3 flagged: deployment/CI/CD, environment management, monitoring stack, support tooling, runbooks, on-call).
- **Beyond engineering:** Add 4-6 weeks of pilot operations before public beta — running 3 internal full-cycle projects to validate the system end-to-end (Checkpoint 3).
- **Honest total from kickoff to public beta:** ~5 months for a 2-engineer team, ~7-8 months for a 1-engineer team.

---

## Out of Scope

1. **ai4good AI Proxy — SHIPPED IN v1 as the LLM gateway (decision-21, 2026-07-05; REQ-009).** The v1 gateway carries layers 1 (token validation), 2 (velocity/budget caps), 6 (real-time fuel check), 8 (per-request audit *metadata* — request bodies are never persisted), and 9 (instant rotation) of the model below, plus the fingerprint tripwire + governance-prompt injection the original design lacked. **Residual v1.5 hardening from the 9-layer list:** endpoint/method allowlists beyond the defaults (layers 3/4), payload size bounds (5), and IP-velocity/geo/User-Agent checks (7). The original design record is kept below for the trail:

   **9-layer enforcement model** (every request passes through these checks before reaching Anthropic):
   1. **Token validation** — token valid + bound to the project_id in the URL path; else 401
   2. **Velocity caps per token** — hard caps on req/sec, $/hour, $/day; bounds damage if token leaks; else 429
   3. **Endpoint allowlist** — default deny; per-project policy of allowed `(method, path)` patterns; else 403
      - Allowed by default: `POST /v1/messages`, `POST /v1/messages/count_tokens`, `POST /v1/files`, `GET /v1/models`
      - Blocked by default: `POST /v1/messages/batches` (per-project opt-in if needed), `POST /v1/agents/*`, `POST /v1/sessions/*`, `POST /v1/environments/*`, `POST /v1/memory_stores/*` (persistent Anthropic-side resources), any `DELETE` method
   4. **Method allowlist** — typically POST/GET only; no DELETE/PUT
   5. **Payload size bounds** — max request body size to prevent abuse; else 413
   6. **Real-time fuel balance check** — project balance > 0 in our ledger; else 402 Payment Required (replaces v1's polling-based key deactivation entirely)
   7. **IP velocity / geo / User-Agent anomaly checks** — flag (log; do not auto-block in v1.5) on: distinct IPs > N per token per hour, geographically-impossible IP transitions, suspicious User-Agent (non-Claude-Code/non-SDK)
   8. **Per-request audit log** — every request logged with timestamp, IP, User-Agent, endpoint, payload size, Anthropic cost, fuel delta — feeds anomaly detection
   9. **Instant token rotation** — programmatic invalidation in seconds (no Anthropic Admin API call needed, just toggle our token validity)

   **Benefits** (vs the old direct-key model — all live in v1 now): real Anthropic key never exposed to volunteers; per-request audit metadata with no lag; hard scope enforcement; instant rotation; real-time fuel enforcement (replaced 5-min polling). ~~Per-project Anthropic workspaces remain the substrate~~ — superseded: decision-21 deleted workspaces; the gateway holds one org key in env.

   **What the proxy still CAN'T enforce (honest limits):**
   - **Verify request content is project-related.** Once a volunteer has a valid token, the proxy is blind to "is this prompt actually about project X?" — working directory, git remote, etc. are not in the API payload. Determined misuse remains a volunteer-agreement + cross-reference-audit problem (same as v1, no worse).
   - **Lock to a specific machine.** Would require per-device hardware attestation; impractical for volunteers. IP-velocity check is the lightweight approximation.
   - **Defeat a determined attacker who got the token.** They can spoof headers and route through residential proxies. The velocity cap + instant rotation bound the damage; they don't prevent the leak from being briefly exploited.

   ~~v1 acceptable interim (direct per-project key exposure)~~ — no longer applicable: the gateway ships in v1 (decision-21); no direct key exposure exists.

   **Effort:** the v1 gateway Layer 1 is ~41h (REQ-009 task hints, largely offset by the deleted poller/ops-queue/deactivation stack); the residual v1.5 layers ≈ ~20h. Hosting = open decision OD-6.
2. **Crypto / on-chain tokens** — Fuel is Stripe-backed fiat credits only. No tradeable token, no on-chain ledger.
3. **Native mobile apps** — Web-responsive only. iOS/Android apps are not on the roadmap.
4. **i18n / multi-language UI** — English only at launch.
5. **Multi-volunteer teams per project** — One volunteer per project in v1; team support is v2.
6. **Embedded IDE / web-based code editor** — Volunteers use their own Claude Code / Lovable; we don't host an editor.
7. **NGO-to-NGO tool sharing marketplace** — Out of scope; though all repos are public, we don't curate a "fork this for your NGO" experience.
8. **Anonymous / unverified NGOs publishing** — All publishing NGOs must be verified.
9. **Automated NGO verification** — Manual review by platform admin in v1.
10. **Hosted production environment for built tools** — The volunteer/NGO decide where to deploy; we don't run their infra.
11. **Public star ratings for volunteers** — Explicitly excluded. Volunteer reputation surface is completion-credit + badges only. NGO satisfaction is captured privately for internal matching weight (v2) but is never displayed publicly. This protects volunteer motivation and prevents Uber-driver-style anxiety / retaliation cycles.
12. **Platform skim on tips** — Tips at handoff (REQ-022) flow directly from NGO to volunteer via Stripe Connect with 0% platform skim. Skimming gratitude is off-brand.
13. **Pay-gated Discovery in v1** — Discovery is free **up to a per-NGO daily credit allowance** (10/day unverified / 30/day verified — decision-8/decision-11, re-denominated to context-weighted credits; supersedes the "free for verified only" rule). The allowance is a **daily drip** — hard-resets to the tier grant every day at 00:00 UTC, no rollover (decision-11 daily-drip amendment), replacing the old 30-msg/day cap. Once the day's credits are used up on an *unfunded* project, the NGO can verify (allowance rises to 30/day), fund the project's fuel to continue immediately (REQ-006 unified-fuel — the "expedite" path), or wait for tomorrow's free refill; a *funded* project's Discovery routes to its fuel from the outset ("Funded → all-$"). We may revisit the daily amounts if abuse exceeds the daily grant.
13a. **Paid "Discovery wallet" — explicitly out for v1 AND v1.5 (decision-8).** Unverified NGOs who want to keep going past the free pool fund the project's fuel via the existing Stripe Checkout flow; there is **no** separate "Discovery credit" Stripe product, **no** discovery-only top-up SKU, **no** separate wallet column. The post-pool path is the regular fuel ledger (kind `discovery_consumption`, REQ-006). Closing this door deliberately keeps the money model single-pot.
14. **ai4good-funded Lovable infrastructure** — ai4good does not subscribe to Lovable on behalf of NGOs and does not bill Lovable consumption against fuel; the NGO owns + pays for the Lovable workspace directly. **However (post-2026-06-03 pivot), the ai4good Skill DOES meter + cap Lovable usage per task and surface the NGO's credit balance via `get_workspace` during Track-A orchestration (REQ-021/028)** — "doesn't meter" applied to the old side-track model and is no longer true. Lovable is the Track-A primary deliverable vehicle, not a side track.
15. **Multi-tool fuel metering** — Fuel covers Anthropic (Claude Code) only. Other tools (Lovable today; potentially v0.dev, Bolt.new, Cursor in future) are out-of-band, NGO-direct, or volunteer-personal expenses unless they ship metering-compatible APIs.
16. **Lovable credit reselling through ai4good** — In v1, NGOs purchase Lovable credits directly from Lovable. ai4good provides a deep-linked "Top up" CTA only. Becoming a Lovable reseller would require (a) a reseller agreement with Lovable, (b) tax/VAT pass-through handling, (c) refund flow integration. v2 trigger: signed partnership agreement with Lovable.
17. **Service-level agreements / completion guarantees** — ai4good does not offer SLAs or guarantee that any project will reach handoff. This is a core operating principle (see Platform Promise & Disclaimers). Volunteers may ghost; AI tools may consume fuel without producing a working deliverable; scopes may prove infeasible. The platform bounds the financial risk (per-project fuel caps) and surfaces stalls, but does not underwrite outcomes.
18. **Closed-source / proprietary builds** — All projects are open-source under MIT (or a compatible permissive license) by default. NGOs requesting closed-source or proprietary work are not served by this platform.
19. **Fuel-spend insurance / refund-on-no-deliverable** — Fuel that has been consumed by AI tools is not refundable, even if the project does not ship. This is structurally required (we cannot un-spend Anthropic tokens). NGOs are warned of this risk at every top-up (Story 2).
20. ~~Fully-automated Anthropic key provisioning~~ — **MOOT (decision-21):** there are no per-project Anthropic keys; virtual keys mint as Supabase row writes at kickoff, fully automated. (Q8 closed.)
21. **Per-request prompt/response CONTENT capture — permanently out (privacy posture, reaffirmed by decision-21).** The v1 gateway IS in the request path and captures per-request **metadata** (tokens, model, timestamps, task_ref, cost) — but request bodies are inspected transiently and never persisted (REQ-009 invariant). Content classification exists only as the never-built Layer-3 ladder rung, sampled and Layer-2-triggered, listed so the decision *not* to surveil is visible.
22. ~~Anthropic-side "agent budget" enforcement~~ — **MOOT (decision-21):** the whole workspace-spend-cap story (Console-only caps, ambiguous hard-block semantics, the `raise_spend_limit` ops_task, the `max(funded×3,$200)` formula) is deleted with per-project workspaces. Enforcement is ours, structural, at the gateway: per-key caps + the real-time fuel gate.
23. **Optional OpenTelemetry export from Claude Code (`OTEL_LOG_*` env vars)** — Claude Code natively supports detailed OTel export including full prompt content. ai4good does **not** request or process prompt-content telemetry from volunteers — privacy posture. The v1.5 AI Proxy supersedes the need for OTel-based audit (we capture per-request metadata server-side without touching prompts). Volunteers may use OTel independently for their own observability needs; ai4good does not aggregate it.
24. **Decision-10 v1.5 deferrals (2026-06-06; founder-approved; gate = "before organic/EU signup").** The task-tree simplification pass deferred the following out of the concierge v1 surface; each is logged with its reinstatement trigger and the public-beta launch checklist (REQ-029 / task #56) carries the hard gate:
    - **Rate-limiting / Upstash** (task #47, removed) — v1 ceiling is a Supabase per-IP throttle + Edge Function per-surface caps (Cloudflare WAF if fronting Lovable hosting) (Discovery caps owned by REQ-004/decision-8; Apply 5/min via the apply unique index; auth via Supabase per-IP throttle). Removes Upstash from the v1 surface entirely. Reinstate full rate-limiting before organic signup.
    - **Gradual-rollout mechanism** (task #57, removed) — concierge launch is allow-list + don't-advertise; the landing page captures the waitlist. Reinstate before organic signup.
    - **Internal analytics dashboard** (task #58, removed) — Goals 1-5 are met in v1 by 3-4 Postgres VIEWs over the ledger/tasks/deploy/discovery tables. Build the full dashboard post-pilot.
    - **Concierge supply-funnel CRM + hand-match tool** (task #45, removed) — first cohort hand-matched manually in SQL; build the CRM when organic browse opens.
    - **Content-takedown UI** (REQ-031 right-size) — report buttons + `content_abuse_review` queue + takedown saga + DMCA/CSAM doc deferred; v1 keeps secret-scanning + push-protection.
    - **Multi-jurisdiction tax registration** (Stripe Tax right-size) — v1 keeps `automatic_tax` + hosted invoices + tax-ID field.
    - **Self-serve GDPR erasure/export UI** — v1 keeps consent + sub-processor list + a manual erasure runbook; no EU/public signup until the self-serve flow lands.
    - **Upstash cache + k6/Lighthouse CI gates** (performance right-size) — v1 keeps TanStack Start image handling + SSR-with-HTTP-cache (stale-while-revalidate, in lieu of ISR) + the Supabase pooler.
    - ~~Multi-org Anthropic router~~ — **RETIRED by decision-21** (no per-project workspaces → the 100-workspace cap never binds; the `UsageMeteringProvider` port is retired with the poller).
25. **Automated PII / secret pre-scan on uploaded reference files (REQ-032)** — v1 uses governance-by-disclosure (the NGO acknowledges the data-responsibility rule; ai4good does not scan). A lightweight scan that quarantines likely-sensitive uploads before they reach the Discovery AI or the volunteer is a v1.5 option. v1.5 trigger: an observed incident of real Tier-2 data uploaded against the disclosure, or EU/public signup.
26. **Automated spend-anomaly detection engine (REQ-009)** — the nightly confidence-scorer (2σ spend baseline + zero-commit / zero-task-done / off-hours signals), the tiered auto-deactivate (≥0.9) auto-action, the `spend_anomaly_review` blocker (REQ-024) + its 48h escalation + 3-branch NGO resolution UI, and the `anomaly_investigation` ops_task are **deferred to v1.5 (decision-14, 2026-06-07).** v1 keeps the deterministic loss caps (no cash-out §7, the $200 first-fund cap, and — post-decision-21 — per-key caps + the gateway's real-time fuel gate) + the NGO's instant "revoke access now" action + the REQ-029 money dashboard for daily human review; the scorer only reduced detection *latency*, which does not bind at the concierge pilot's ~10–15 hand-vetted projects (and its mis-calibrated `spend > $50` floor would have false-positived on legitimate $50-kickoff projects). The schema enums (`ops_tasks.anomaly_investigation`, `project_blockers.spend_anomaly_review`) stay reserved for the v1.5 reinstatement; **if built, it lands as the gateway's Layer-2 reconciliation rung (REQ-009 escalation ladder)**. v1.5 trigger: organic/EU signup (same gate as the decision-10 fraud-adjacent deferrals).

---

## MVP Scope & Post-MVP Roadmap

This is the authoritative scope/roadmap reference. Use the **Out of Scope** section for what won't be built; use this section for **when** features ship.

### v1 MVP (public beta launch)

**⚠️ 2026-06-03 PIVOT + 2026-06-04 DECISION-8 + 2026-06-06 DECISION-9 — read this first.** After a 10-persona PM-architect strategic review (2026-06-03) the founder made 7 decisions that materially reshape v1 (see Platform Promise + REQ-004/006/008/012/021/026/028 + new REQ-027/029/030/031). A follow-up **decision-8 (2026-06-04)** unified the money model: NGOs and volunteers BOTH consume project fuel, funding is allowed from `draft` onward, and Discovery is gated by a per-NGO free credit pool. A further **decision-9 (2026-06-06)** simplified the PM-tree architecture to git-as-truth. **Decisions 20/21/22 (2026-07-05) then re-architected coordination + token governance: Linear replaces the git-as-truth tree (decision-20 — REVERSES decision-9), an LLM gateway with virtual keys replaces per-project Anthropic keys + the usage poller (decision-21), and attribution capture ships in v1 (decision-22).** Where decision-9 text below conflicts, decisions 20–22 win (kept for the decision trail). Net deltas to v1 scope:
- **Deliverable is a *deployed, NGO-self-maintainable* tool** (not a repo). **Track A** (NGO maintains via chat) → Lovable is the primary vehicle + durable home; Claude Code orchestrates Lovable via its MCP (Skill is the orchestration shell). **Track A is the only track v1 builds; Track B (developer-grade + plain-host deploy) is deferred to post-v1 (decision-19) — non-Track-A needs are waitlisted at Discovery.** Discovery classifies the track.
- **Data governance-by-disclosure**: Discovery `data_sensitivity` tiers; Tier-2 = fixtures-only-during-build; triage enforces.
- **No cash-out**: fuel is non-cash project-scoped credit; stays-on-project; donate/keep (move-between-projects v1.5). Removes Treasury/ACH/refund/KYC/AML.
- **Nonprofit** entity + **blended** economics (Goal 3 re-pointed); **real ToS** (no "no contract").
- **Concierge-first launch** (Goal 5) — supply liquidity is the #1 gate.
- **New v1 REQs:** REQ-027 (abandonment/rematch), REQ-029 (observability), REQ-030 (ops/incident + admin money-correction), REQ-031 (content moderation/takedown/secret-scanning). **New mechanical:** transactional outbox, idempotent cursored usage poller, ledger pair-sum control-total job, **single-org GitHub + continuous base-permission invariant in v1** (the two-org split is deferred to v1.5 — REQ-008), `UsageMeteringProvider` port.
- **Decision-8 (2026-06-04) — Unified fuel + free-pool Discovery:**
  - Fuel can be funded **at any point from `draft` onward** (REQ-006); the "funded at match acceptance" invariant is dropped.
  - Fuel is consumed by **two parties**: the NGO during Discovery (`discovery_consumption` kind in `fuel_transactions`, added 2026-06-04) and the volunteer during build (`consumption`, existing). Both pay the standard 15% skim at consumption.
  - Discovery itself is free up to a **per-NGO DAILY free credit allowance** (`ngos.discovery_credits_remaining`): **10 credits/day unverified, 30/day verified** (rises 10→30 on `unverified → verified`). *(Re-denominated by decision-11, 2026-06-06, into a context-weighted credit unit; made a DAILY drip by the decision-11 daily-drip amendment — hard-resets daily at 00:00 UTC, no rollover; replaces the old 30-msg/day cap.)* The allowance is platform compute spend tracked as a per-NGO counter, deliberately OUTSIDE the fuel ledger so it does not pollute the balance control total.
  - **Email verification is the bot floor** for any Discovery message (`profiles.email_verified_at`); NGO-doc verification (`ngos.verification_state = 'verified'`) is the **publish wall** (REQ-005.5 `scoped → triage`). Unverified NGOs may reach `scoped` and may fund their own Discovery via the project's fuel — they just cannot expose the project to volunteers until verified.
  - **First per-project funding** (whether Discovery top-up or match top-up) fires a hard Option-D acknowledgment; first match acceptance still fires its own ack naming the volunteer. Both are recorded; neither is reused (Promise §9 updated).
  - **No paid "Discovery wallet"** in v1 OR v1.5 (Out of Scope #13a) — the post-pool path is the regular fuel Checkout.
- **Decision-9 (2026-06-06) — Git-as-truth for the PM tree (REQ-026 re-scope):**
  - **TaskMaster runs locally on the volunteer's laptop only.** The platform does NOT host TaskMaster as a service, does NOT vendor it, does NOT import its code. The volunteer's `.mcp.json` points at their **local** `task-master-ai` process — full 33-tool TaskMaster UX, no scope-lock.
  - **`.taskmaster/tasks/tasks.json` lives in the project's git repo** (`ai4good-projects/<slug>`). The dev's local TaskMaster writes to it; the ai4good Skill (REQ-028) auto-commits + pushes after every mutation. Git IS the per-project server-side source of truth — pushed state is canonical, local state is a working copy.
  - **ai4good observes via GitHub webhooks.** A webhook receiver fires on every push event, fetches the updated `tasks.json`, diffs against the projection, and upserts into `project_tasks` in Postgres. **One-way mirror: git → Postgres.** No bi-directional sync. No conflict resolution code. No optimistic locking.
  - **NGO comments live in Postgres, not in `tasks.json`.** The dev's tasks and the NGO's comments are two separate stores joined by `task_key` at render time. NGO writes to comments via the ai4good UI / REST API; NGO never edits the task tree. Dev sees comments through the Skill's `get_project_context` REST call.
  - **No platform-hosted task-MCP server.** The `mcp.ai4good.dev/projects/<id>/mcp` endpoint and its `list_tasks` / `update_task` / `add_task` / `comment_task` / `get_project_context` / `list_blockers` tools are **dropped from v1**. The Skill talks to local TaskMaster for tasks and to ai4good REST for blockers/fuel/comments/context. NGO UI reads Postgres directly.
  - **Bootstrap from Discovery becomes a Supabase Edge Function git commit** at project funding: ai4good reads the scope doc, generates the initial `tasks.json`, commits it to the new repo. Volunteer takes over from there.
  - **Audit trail is git log.** Every task mutation is a commit with author, timestamp, diff. Better than `audit_events` rows for the task layer.
  - **License posture: clean.** TaskMaster is on the volunteer's laptop — pure individual MIT+CC use. No ai4good hosting. No Commons Clause exposure.
  - **Effort delta: NET REDUCTION of ~6h** at the roadmap level. Roadmap Task 2.10 (now bootstrap action + NGO REST API for context/blockers/comments): 6h → 9h (+3h). Task 2.11 (now GitHub webhook receiver + Postgres projection worker; was platform MCP server thin wrapper): 10h → 8h (−2h). Task 2.18 (Skill — drops platform task-MCP wiring, adds tasks.json auto-commit + push hook): 35h → 28h (−7h). Total Phase 2: 225h → 219h.

- **Decision-10 (2026-06-06) — Task-tree simplification pass (architecture + simplicity tournament).** A 6-lens survey + per-candidate approach tournament (3 approaches each, judged on architecture + simplicity, capability-preserving) produced six accepted simplifications. These are folded into the affected REQs (each carries a "› Decision-10" override callout). Net ≈ **−80h** off the post-decision-9 baseline (rank 1 already counted under decision-9), landing v1 at **≈ ~385h core / ~480h buffered**. The reshapes touch the *implementation shape*, not v1 capabilities — every preserved REQ AC is intact; only genuinely-v1.5 work is deferred.
  - **(Rank 1, already folded as decision-9) PM-tree reconciliation** — `project_tasks` is a derived read model with exactly one writer (the projection worker's `ingestPush()` boundary). Killed the two-writer/lock-conflict bug class.
  - **(Rank 2) Anthropic meter split (REQ-009).** Split the meter trio along the write-vs-read seam behind the single `UsageMeteringProvider` port: the **write side** owns the port + key create/deactivate/reactivate + workspace creation + manual key-bootstrap ops queue against **one hard-coded org**; the **read/policy side** owns the cursored idempotent poller + micro-cent ledger + balance VIEW + fuel-low thresholds (20%/5%/0%) and calls the port to deactivate at zero. The standalone fuel-low-alert task is **folded into the read side**. The **multi-org router / least-full selection** is deferred to v1.5 *behind the unchanged port* (PRD gates it to ~80 active workspaces, ~7× the pilot).
  - **(Rank 3) One comms substrate (REQ-015/016/024/025/027).** A single `notify(recipientIds, event_type, payload)` shared Deno module (imported by every Supabase Edge Function) is the **sole writer** of `notifications` AND system `messages`, driven by one static `EVENT_MAP` encoding the REQ-016 taxonomy. **Keeps** the REQ-016 v1 ACs (60s batching, 5min dedup) as SQL guards — no worker/queue. Messaging (REQ-015) keeps the channel data-model + one reusable **actionable-message primitive** (inline buttons → callback event), reused by blockers and CR Accept/Decline; it no longer owns the system-message catalog. Blockers (REQ-024) and CRs (REQ-025) shrink to *table + form + emit*. **Decision-9 fix:** CR-Accept (REQ-025) routes the new p0 task through #26's Supabase Edge Function **git bootstrap-commit** (NOT a direct `project_tasks` INSERT — that violated the one-writer invariant). The three time-triggers (blocker 48h/7d, inactivity 14d/21d, unmatched-open 7d) **merge into one hourly aging scan** with isolated pure-function branches.
  - **(Rank 4) One reliability implementation (REQ-006 outbox / REQ-027 / REQ-029 / REQ-008).** The transactional outbox is one worker + **one idempotent step-handler registry** (`revoke_repo_collab`, `deactivate_anthropic_key`, `reactivate_anthropic_key`, `remove_org_member`, `post_ngo_notice`, `reset_pm_tasks`, `provision_workspace`) shared by every reliability path. Replaces the tuned 1m/5m/15m/1h backoff with a **flat fixed retry** (NOW()+5m, cap ~12 → `failed_dlq`); the bespoke DLQ→incident state machine is dropped — REQ-029 observability **pages on `failed_dlq` count** instead. The 21d auto-release saga (REQ-027) reuses the registry (zero new teardown code). The base-permission invariant (REQ-008) keeps **detection** as a cron and routes **remediation** through an outbox enqueue.
  - **(Rank 5, partial — founder-approved) Defer the Concierge Supply-Funnel CRM + hand-match tool to v1.5.** First cohort hand-matched manually in SQL. (The broader ops-inbox consolidation from rank 5 was NOT taken.)
  - **(Rank 6 — founder-approved) Defer the public-beta hardening slice.** To v1.5 (gated "before organic/EU signup", logged in the v1.5 backlog): **Rate-limiting/Upstash** (v1 ceiling = a Supabase per-IP throttle + Edge Function per-surface caps; Cloudflare WAF if fronting Lovable), **Gradual-rollout** (allow-list + waitlist suffices), **Analytics dashboard** (Goals 1-5 met by 3-4 Postgres VIEWs). Right-sized in place: **Content moderation (REQ-031)** → keep secret-scanning + push-protection only, defer report/takedown UI + abuse queue; **Stripe Tax** → keep `automatic_tax` + hosted invoices, defer multi-jurisdiction registration; **GDPR** → keep consent + sub-processor list + a *manual* erasure runbook, defer self-serve erasure UI; **Performance** → keep TanStack Start image handling + SSR-with-HTTP-cache + Supabase pooler, defer Upstash cache + k6/Lighthouse gates.
  - **Task-tree state:** applied directly to `.taskmaster/tasks/tasks.json` (72 → 66 tasks; removed #22/#45/#46/#47/#57/#58; reshaped 20 tasks). TaskMaster dependency-validation passes (66 tasks, 83 deps valid).

- **Decision-11 (2026-06-06) — Two-layer money: $-based funded fuel + a context-weighted Discovery CREDIT system.** Validated by a credit-vs-money research+tournament workflow (Lovable + v0/Replit/Cursor/Devin + SaaS prepaid-credit/escheatment/ASC-606). Founder calls: **no subscription; the 15% skim does not change; funded fuel stays real-dollar-pegged (status quo, Option A); but the FREE pre-fuel Discovery phase becomes an abstract CREDIT system where credit burn scales with context weight.** This mirrors Lovable's two-layer model (abstract credits where cost variance is absorbed = Discovery; real dollars where cost is metered + attributable = funded fuel), and the regulatory bonus: Discovery credits are a **free grant the NGO never purchases**, so — unlike *purchased* credits — they carry zero stored-value / money-transmitter / escheatment exposure.
  - **Discovery Credits (the unit):** an abstract per-NGO unit for the free, pre-fuel Discovery phase only. `1 Discovery credit = 10,000 context-token-equivalents` (`platform_settings.discovery_tokens_per_credit`, tunable). **Daily allowance: 10 credits/day unverified / 30/day verified** (`discovery_credit_grant_unverified` / `_verified`; ~$0.15/credit of Opus — decision-13; the credit count is token-based, so the daily allowance buys the same number of turns regardless of model). Verification raises the daily allowance 10→30 (the 3× "reward"). *(Daily-drip amendment, 2026-06-06 — see the routing + daily-drip bullet below; supersedes the initial 100/500 monthly-pool sizing.)*
  - **Context weight drives the burn (the founder's ask):** per Discovery turn, credits deducted = `ceil( (uncached_input_tokens + 0.1 × cached_input_tokens + output_tokens) / discovery_tokens_per_credit )`. So a **long conversation** (the whole context re-sent each turn) and a **big uploaded reference file** (REQ-032 — rides in context every turn) cost more credits, and **prompt caching makes turns cheaper** (cached tokens count at 10%). Discovery output regeneration (≤3×, REQ-004) and system-error retries are **free** (avoids the "retries silently burn credits" complaint the research flagged at Lovable/Cursor).
  - **Transparency (the anti-Lovable move):** the Discovery chat shows a **credit gauge** ("Discovery credits: 73 of 100"), each turn shows **its** credit cost, and a file upload shows **"≈ N credits to include this file" BEFORE** the agent ingests it. ai4good copies Lovable's per-action cost UI but rejects its opacity / forfeiture-on-cancel / silent-burn — credits are a free grant, never silently removed.
  - **The flip to $:** at 0 credits for the day → "verify your org → 30 free credits/day" (unverified) / "fund this project to keep going now, or come back tomorrow" (the funded path is real-$, decision-8, 15% skim). That daily-exhaustion point is the credits→dollars boundary; everything from funded fuel onward is unchanged $-based accounting.
  - **Routing + daily-drip reset (amendment, 2026-06-06 — founder calls "Funded → all-$" + "low free credit per day, Lovable-style"):**
    - **(a) Per-turn routing is by *project* fuel balance.** A Discovery turn on a *funded* project (positive fuel balance) routes to that project's fuel (`discovery_consumption`, 15% skim, REQ-006) — the free credit pool is touched ONLY for *unfunded* projects. So funding a project makes it dollar-metered end-to-end (Discovery + build), and the NGO's free pool stays reserved for its *other* unfunded projects. **Credits are NGO-bound; fuel is project-bound.** This makes the credit→dollar flip automatic at funding, not only at credit exhaustion.
    - **(b) The free grant is a DAILY DRIP, not lifetime or monthly.** A daily scan **hard-resets** each NGO to its tier daily allowance at 00:00 UTC (`discovery_credits_remaining = 30 if verified else 10`), **no rollover** — yesterday's unused is discarded. Numbers: **10/day unverified, 30/day verified** (3× verification reward; the 30/day cleanly **absorbs the retired 30-msg/day verified cap** — one mechanism, not two). The daily wall is the deliberate **"expedite" moment**: an NGO that has used today's free credits either **waits for tomorrow's refill (free)** or **funds the project's fuel to continue now** (real-$, 15% skim). **Honesty:** funding removes the daily/credit wall — it does NOT lower per-message latency (same Opus model either way) and does NOT raise the daily allowance — so the UI says "keep going now," never "go faster." Lovable-style: a small daily free pool, pay to exceed it today. Tunable in `platform_settings` (`discovery_credit_grant_unverified` / `_verified`) — adjust the daily amounts if cohort data shows abuse.
  - **Accounting:** `ngos.discovery_credits_remaining INTEGER` (replaces the `_cents` column), tracked OUTSIDE the fuel ledger (the $ control-total invariant is untouched). ai4good knows the internal $-cost-per-credit for the Goal-3 blended P&L; the NGO sees credits. Touches REQ-002/004/005.5/006/032 + schema; net effort ≈ +5h over decision-8's existing pool work (a re-denomination + a credit-cost-per-turn function + the gauge UI + the per-turn fuel-vs-credit routing branch + a daily hard-reset scan, not new infrastructure). *(The daily-drip amendment is effort-neutral vs the earlier monthly-reset design — same scan, daily cadence.)*

- **Decision-12 (2026-06-06) — Post-Discovery NGO Project Assistant (REQ-033, new v1 feature).** Founder call: once a project is funded, the NGO can keep chatting with the AI **beyond scoping** to "figure status." A funded project unlocks an ongoing, **fuel-metered** NGO↔AI assistant (Claude Sonnet) on the project page that answers "how's my project going?" — reading the PM-tree projection (REQ-026 `project_tasks`), open blockers (REQ-024), fuel runway (REQ-009), and recent commit/activity (REQ-026 `external_commit_refs`). **Read-only / advisory** — it never mutates tasks, approves handoff, or accepts scope (scope changes still route through REQ-025 Change Requests). It reuses the Discovery chat surface + the NGO-side consumption path (kind `discovery_consumption`, reglossed "NGO-side AI Agent: Discovery + project assistant"); each turn is context-weighted + 15%-skimmed against the project's fuel exactly like funded Discovery. **No free daily credits** — the assistant exists only on funded projects (post-fuel), so it is always dollar-metered; at fuel 0 it disables with the top-up CTA. v1 = on-demand text Q&A over current state; proactive / push-notification agents are v1.5. Effort ≈ **+10h** (chat-surface reuse + project-state context assembler + system prompt + tests). New REQ-033; schema reuse only (a `mode` marker on the Discovery conversation store; no new table; no new ledger kind).

- **Decision-13 (2026-06-06) — Opus for Discovery + the post-Discovery assistant (model choice).** The Discovery Agent (REQ-004) and the post-Discovery NGO assistant (REQ-033) run on **Claude Opus**, not Sonnet (the early-draft default). **Rationale:** Discovery is the **highest-leverage reasoning step** — its structured scope drives the entire build, so a stronger model here de-risks every downstream hour of volunteer time + fuel. Cost is bounded because a Discovery is **short + one-time** (~5–10 turns): a typical scoped Discovery ≈ **$1–2 on Opus** (vs ~$0.25 Sonnet), and the **daily free credit allowance (10/30) already caps the worst case** (a grinder maxing 30/day verified ≈ $4.50/day Opus, bounded further by the kill switch + per-NGO scope). **Mechanics:** the credit unit is **token-based and model-agnostic** — a turn costs the same *number* of credits on either model; only the platform's real **$/credit** changes (~$0.03 Sonnet → ~$0.15 Opus), so the **daily allowance was kept at 10/30** (founder call — the ~5× per-credit subsidy is deliberate acquisition spend; absolute per-Discovery cost is low). The **funded** assistant (REQ-033) passes Opus cost through to the NGO via fuel (15% skim), so there is no platform subsidy concern there. The `anthropic_rate_cards` table already prices per-model for the funded ledger. **Effort: 0h** (a model-config change); the only impact is a higher per-credit $-cost line in the Goal-3 blended P&L, not new build work. Touches REQ-004/033 + tech stack + credit gloss + §11.

- **Decision-14 (2026-06-07) — Defer the REQ-009 automated spend-anomaly engine to v1.5 (review-and-verify simplification).** Surfaced by a review+verify workflow (goal: ≥2 major capability-preserving simplifications beyond decision-10) and adversarially confirmed (3/3 skeptics: capability-preserving, genuinely-simpler, major). **Cut from v1:** the nightly confidence-scorer (2σ spend baseline + zero-commit / zero-task-done / off-hours signals → 0.6/0.9 tiers), the ≥0.9 auto-deactivate auto-action, the `spend_anomaly_review` blocker + 48h escalation + 3-branch NGO resolution UI, the `anomaly_investigation` ops_task, and the 3 `spend_anomaly_review_*` REQ-016 events (PRD task hint 9.11, ~6h). **Kept (the loss ceiling is preserved without the scorer):** no cash-out (§7), the $200 first-fund cap, the workspace spend cap `max(funded×3,$200)`, fuel-zero programmatic key-deactivation, the NGO/admin "rotate key now" action, and the independent `collusion_review` signal — a leaked/stolen key still only ever buys bounded compute. The scorer only reduced detection *latency*, which does not bind at the concierge pilot's ~10–15 hand-vetted projects (founder reads the REQ-029 money dashboard daily); a LOW-severity defect also showed its `spend > $50` floor was mis-calibrated against the $50 min kickoff. Schema enums stay reserved (forward-compat); reinstate before organic/EU signup (Out of Scope #26). **Effort: ≈ −9h** (the ~6h scorer + shed `spend_anomaly_review` wiring across the blocker/aging/notify paths; no standalone task in `tasks.json` — branches shed from #41/#43/#38/#39).

- **Decision-15 (2026-06-08) — REQ-015 → lightweight project comment thread; full Slack-style channel deferred to v1.5 (review+verify simplification, "middle option").** Surfaced by the resume of the review+verify workflow (the original run's rate-limiting had hidden it); founder chose the middle path over a full cut. **Cut from v1:** the Supabase Realtime chat transport, the markdown renderer, the @-mention parser + `channel_mention` notifications, the post-handoff archival *mode*, and the `channels` / `channel_members` / `messages` tables. **Kept:** a single **project-level comment thread** on the project page, backed by `task_comments` (`task_id IS NULL` = project-level; added `project_id`), so a shared free-text NGO↔volunteer back-and-forth survives (the product stays a warm coordination layer). **Re-homed:** system events now go to the `notifications` feed + the REQ-010 activity feed via `notify()` (sole writer) — NOT channel posts (this dissolves the prior channel-system-message path and the `notify()`-bypass HIGH defect); the **CR Accept/Decline actionable-message primitive moves onto the CR row** on the project page + the notification (REQ-025), so a minimal CR surface is pulled forward. Touched: REQ-015 (rewritten), REQ-016 (`channel_mention`/`channel_message_new` → v1.5; new `project_comment` event), REQ-024 (blocker surface → notifications feed + Action-needed rail), REQ-025 (CR row is the surface), REQ-021 (channel captions → activity-feed/`notify()`; stuck-states → blocker Q&A + comment thread), schema (drop 3 tables, extend `task_comments`, annotate `channel_message_id` v1.5), §11 in-scope. Effort ≈ **−12h** (REQ-015 v1 ~28h → ~10h, less the ~3h CR-row primitive pulled forward from REQ-025's v1.5). Reinstate the full real-time channel before organic/EU signup (v1.5).

- **Decision-16 (2026-06-09) — CR anti-distraction guardrails (volunteer-focus protection).** Founder concern: a Change Request mid-build can distract/scope-creep an unpaid volunteer (volunteer churn is the #1 supply risk). REQ-025 had a gap — a CR fired a `cr_raised` notification at the volunteer the instant the NGO submitted it, with no throttle. Guardrails added (CR stays `in_progress`-only — deliberately NOT broadened to paused/handoff): **(1) Opt-in, never interrupt** — a CR fires a low-tone `cr_raised` (in-app + CR inbox, surfaced at session bootstrap; NO per-CR email blast); only **Accept** creates the p0 task, so the dev is never auto-assigned work. **(2) One open CR at a time** (`platform_settings.max_open_crs_per_project`, default 1; v1 hard-enforces 1 via a unique partial index on `change_requests(project_id) WHERE status='pending_review'`) — the NGO cannot submit another CR until the volunteer decides the current one. **(3) Decline is penalty-free + the default-protected choice** (reinforces REQ-014; surfaced in the CR UI). **(4) NGO framing at submission** ("optional; the volunteer decides whether/when; adds scope + time + fuel"). Touches REQ-025 (guardrails block + 3 ACs), REQ-016 (`cr_raised` → low-tone, no email; split from `cr_decided`), schema (`change_requests` unique-open index + `platform_settings.max_open_crs_per_project`), task #44. Effort ≈ **+2h** (the unique-open index + the session-bootstrap CR-inbox surfacing + the framing copy).

- **Decision-17 (2026-06-09) — Remove the `paused` state from v1; pause/resume deferred to v1.5 (PRD-review simplification).** Surfaced by a simplification review (goal: 3 capability-light cuts beyond decisions 10/14/15). `paused` was the most expensive state in the lifecycle relative to expected pilot use: it carried the `paused_from_status` restore column with resume-validity edge cases, the `fuel_deadline_remaining_seconds` funding-clock freeze/recompute stash, paused-special-casing inside **three separate cron jobs** (REQ-027 inactivity 14d/21d scan, REQ-006 match-expiry job, Goal-5 aging-open nudge — all branches of the merged hourly aging scan, task #41), key deactivate/reactivate side effects, and marketplace hiding. At the concierge pilot's ~10–15 hand-matched projects, "pause" is a support conversation, not a state machine: **pre-match** the NGO unpublishes (`open → scoped`) or cancels the match; **mid-build** the platform admin deactivates the Anthropic key + leaves a note (REQ-009 tooling already exists) or the project is cancelled. **Cut from v1:** the `paused` state + 2 transitions (REQ-005.5), both stash columns (schema), and every cron's paused-clock exclusion (each scan becomes a plain status filter). **Kept:** `open → scoped` unpublish-to-revise (now the only "take it off the marketplace" path). Touches Goal-5 job def, REQ-005/005.5/006/007/027, schema, tasks #41/#59 + the lifecycle/schema tasks. Reinstate in v1.5 on first real NGO pause request (v1.5 table row added). Effort ≈ **−6h**.

- **Decision-20 (2026-07-05) — Linear replaces the git-as-truth PM tree (REVERSES decision-9), for the product AND the ai4good buildout itself.** Ground: "real signals, not AI-authored narratives" — under decision-9 the volunteer's agent was the designed writer of task state. New shape (REQ-026 rewritten): free Linear **workspace per project**, drawn from a **pre-created pool** (pool amendment, same day: creation has no public API, so the concierge batch-creates ready workspaces — API key, webhook, GitHub integration pre-connected — and kickoff assigns + renames one via `organizationUpdate`, fully API-only; a watermark `linear_pool_replenish` ops_task keeps the pool topped up); coordinator-owned decomposition (automation drafts, human approves, API push; briefs session-sized + dependency-ordered); **pull-based** volunteer workflow (self-assignment = commitment signal); **status moves only via Linear's GitHub integration on PR merge**; agents read/comment/self-assign but never move status — enforced by **detect-and-revert** in the `linear-webhook` consumer (wrapper-MCP held in reserve); `project_tasks` survives as the projection with a new feed source; NGO visibility stays panel-only (no Linear seats); CI snapshots the tree to repo markdown at handoff; **coordination infra is platform-owned and never transfers at handoff** (delivery infra — Lovable, repo — is NGO-owned). Deleted: tasks.json + TaskMaster, the Skill auto-commit hook, github-webhook tasks.json ingest, HEAD-SHA reconcile, the bootstrap git-commit, and the dead ai4good-MCP-in-Lovable connector. Effort ≈ +7h net.
- **Decision-21 (2026-07-05) — LLM gateway with virtual keys in v1 (pulls the "AI Proxy v1.5" forward; rewrites REQ-009).** Per-(volunteer, project) `a4g_*` **virtual keys** (hash-only, show-once, minted as row writes at kickoff); volunteer setup = two env vars; the **real Anthropic key lives only in gateway env**; per-request: caps (per-request max + rolling 24h) → fuel gate (structural, real-time) → fingerprint tripwire (`.a4g/fingerprint.md`, pairwise, >~1.5k tokens) → governance-prompt injection → stream → **inline paired ledger rows** (gateway_request_id idempotency, task_ref). Deleted: per-project Anthropic workspaces + manual Console key ops queue + the 5-min usage poller + `usage_poll_state` + daily Cost-Report reconciliation + workspace spend caps + the fuel-zero deactivation/reactivation saga + the multi-org scale path + the `UsageMeteringProvider` port. Privacy invariants: bodies never persisted; ledger = token counts + metadata; signals as scores/booleans only. Escalation ladder documented-not-built (Layer-2 reconciliation, CI fingerprint rotation, short-TTL JWT, Layer-3 sampled classification — each with triggers). **Hosting = open decision OD-6.** Effort ≈ +1h net (near cost-neutral; kills all manual key ops).
- **Decision-22 (2026-07-05) — attribution + transparency capture in v1 (new REQ-034 + REQ-035).** REQ-034: task-ID binding on every ledger row (PostToolUse hook on Linear assignment → `.a4g/task.md` → CLAUDE.md import → gateway extracts; fallback branch/transcript derivation; floor `unattributed`, never gates; first-class `exploration`/`onboarding` buckets; NGO panel shows **burn per deliverable**; per-volunteer granularity stays coordinator-side; reconciliation surfaces v1.5). REQ-035: handoff **attribution** step (testimonial + 3 credit-framed dimensions — consciously supersedes the "no satisfaction form in v1" deferral; never a public star score) + **jumpstart health at 30/60/90 days** from real signals with the 60-day "did you try?" confound question (extends the 30-day-alive ping); reputation-feeds-matching + health synthesis + the AI-maintainability visible check are v1.5. Rationale: uncaptured data is lost forever. Effort ≈ +23h.

**Launch strategy — concierge-first (decided 2026-06-03 — Item 6 / Goal 5):** supply liquidity is the #1 launch gate. **Do not open organic browse first.** Pre-recruit a ~20–30-volunteer bench (seed Claude Code / AI-builder / civic-tech communities), hand-match the first ~10–15 *curated* NGO projects end-to-end to prove the loop produces deployed tools, *then* open organic browse. v1 product hooks supporting this: the supply-funnel metric (Goal 5), the `project_aging_unmatched` nudge (REQ-016), and admin concierge-match tooling. The referral loop is v1.5.

**Honest framing:** the product thesis is intact and stronger; this pivot adds the "real money + real NGO data + real adversaries + real deployment" hardening the prior parse-ready PRD lacked.

**v1 estimate (RE-BASELINED — pivot + decision-8 + decision-9 folded in):** the prior single-source figure was **~350h core / ~438h buffered**. The 2026-06-03 pivot adds **+112h** (REQ-027/029/030/031 + outbox + poller hardening + base-permission invariant + deploy-to-running + Skill-orchestration promotion +19h + concierge tooling). The 2026-06-04 decision-8 adds **~+10h** to Phase 2 (per-NGO Discovery pool + email_verified_at sync + Stripe Checkout reachable from draft + discovery_consumption ledger kind). The 2026-06-06 decision-9 NETS OUT **~-6h** from Phase 2 at the roadmap level (Task 2.10 +3h for NGO REST API + bootstrap action, Task 2.11 -2h for webhook/projection vs. MCP server, Task 2.18 -7h for Skill drops platform-MCP wiring and adds tasks.json auto-commit hook). Per-phase before decision-10: **Phase 1 ~48h + Phase 2 ~219h + Phase 3 ~71h + Phase 4 ~79h + Phase 5 ~49h = ~466h core / ~583h buffered**. The **2026-06-06 decision-10 simplification pass** then nets out approximately **−80h** (ranks 2-4 consolidations −45h spread across Phase 2/3, plus the #45 + rank-6 v1.5 deferrals −35h across Phase 3/4/5; rank 1 was already counted under decision-9). De-duplicated landing point after decision-10: **≈ ~385h core / ~480h buffered**. Then **REQ-032 (project need attachments) adds ~17h** and **decision-11 (Discovery credits — context-weighted credit cost + caching discount + credit-gauge/per-turn/per-file cost UI + per-turn fuel-vs-credit routing + daily-drip credit reset) adds ~5h** and **decision-12 (REQ-033 post-Discovery fuel-metered NGO project assistant) adds ~10h**, then **decision-14 (defer the REQ-009 spend-anomaly engine to v1.5) nets out ~−9h**, and **decision-15 (REQ-015 → lightweight project comment thread; full channel to v1.5) nets out ~−12h**, then **decision-16 (CR anti-distraction guardrails) adds ~+2h**, and **decision-17 (remove the `paused` state; pause/resume → v1.5) nets out ~−6h**, landing at ~392h/~494h. Then **decision-19 (defer Track B) nets ~−3h**, and the **2026-07-05 governance fold-in (decisions 20/21/22 — Linear ≈ +7h, gateway ≈ +1h, attribution capture ≈ +23h) adds ≈ +31h net**, landing the current v1 at **≈ ~420h core / ~530h buffered** — call it **~5 months for 2 engineers**. The per-phase split is now approximate; treat ~420h/~530h as authoritative. Old figures are superseded.

**Foundation:**
- REQ-001 (Auth: email + GitHub + Google)
- **REQ-002 minimal** (NGO verification: manual admin review of doc upload only; **KYC tier + Stripe Identity automation deferred to v1.5**)
- REQ-003 (Project Need intake)
- REQ-007 (Volunteer profile + marketplace)
- **REQ-011 minimal** (Volunteer applies; NGO accepts/declines. **Match score algorithm + score breakdown UI deferred to v1.5** — v1 marketplace shows skill-tag and cause-tag overlap badges as a count-based hint, no numeric score)

**Discovery & Publishing:**
- REQ-004 (Discovery Agent — free, rate-limited; complexity tier only, no dollar estimate)
- REQ-005 (Scope doc + publishing → triage)
- REQ-023 (Triage gate, 48h SLA, all NGOs go through it in v1)

**Funding & Money:**
- **REQ-006** (Stripe top-up + ledger + match-to-fund + **non-cash credit model, no cash-out** per Item 3). Includes: single-row top-up (Option γ); leftover stays-on-project + `credit_release`/`donation`/(v1.5)`allocation`; chargeback handler + `chargeback`/`chargeback_writeoff` kinds + reserve + first-fund caps + paired-row control-total job. **No Treasury/ACH/refund-cashout/payee-KYC/AML in v1** (removed by Item 3). **Auto-top-up deferred to v1.5.**
- **REQ-022 deferred** (Stripe Connect for tips → v1.5; v1 has no tips UI at handoff)

**Project Execution:**
- REQ-008 (GitHub repo + dev-internal Issues only; Claude Code repos locked to `ai4good-projects/` org per option α)
- **REQ-009** (LLM gateway — decision-21: `a4g_*` virtual keys per volunteer×project, caps + rolling 24h window, fingerprint tripwire, governance-prompt injection, **inline micro-cents ledger writes per request**, structural fuel gate, instant revocation, escalation ladder documented-not-built; **automated spend-anomaly detection deferred to v1.5 — decision-14**; gateway hosting = OD-6)
- REQ-010 (Single-view project page + cadence stats + dual fuel meters)
- REQ-021 (Lovable = Track-A primary deliverable vehicle; Claude Code orchestrates it via the `LovableDriver` port over Lovable MCP with per-task credit cap + audit + manual dual-rail fallback; volunteer-driven setup; manual status widget retained; **inbound email parser deferred to v1.5**; **Track B / developer-grade deferred to post-v1 — decision-19, v1 is Track-A only**)
- REQ-024 (Orthogonal blockers + task-anchored clarifications, including `github_collaborator_needed` for dual-rail)
- **REQ-025 minimal** (Change Requests captured in DB + surfaced as the actionable CR row on the project page + notification — decision-15/16; volunteer Accept/Decline with note; on Accept, one p0 Linear issue created via API — decision-20. **Full CR UI workflow with cards, NGO-side prompts, completion notifications, post-handoff re-list path deferred to v1.5**.)
- **REQ-026** (Platform task management via **Linear — decision-20**: free workspace per project, assigned API-only from a pre-created pool (batch concierge replenishment — pool amendment); coordinator-owned decomposition pushed via API; pull-based self-assignment; **status only via the GitHub integration on PR merge**; detect-and-revert; `linear-webhook` → one-way Postgres projection; REST API for NGO context/comments/blockers + the project-page panel; CI tree snapshot at handoff. NO platform task-MCP server; no tasks.json.)
- **REQ-028** (ai4good Claude Code Skill — **v1 CORE orchestration shell**: install + session bootstrap + task-binding hook (REQ-034) + slash commands + Linear branch/magic-word convention, **AND the Track-A Lovable orchestration layer** (LovableDriver port, triage logic, per-task budget guardrails, quality loop, consent gate, audit reporting). The §11 "v1 design rationale" section details the orchestration.)
- **REQ-034** (Task-level attribution — decision-22: binding hook + gateway task_ref capture + NGO **burn-per-deliverable**; telemetry, never gates; reconciliation surfaces v1.5)
- **REQ-035** (Post-handoff attribution + jumpstart health — decision-22: sign-off testimonial + 3 credit-framed dimensions; 30/60/90-day health from real signals + the 60-day one-question confound control; matching/synthesis surfaces v1.5)

**Comms & Dashboards (minimal v1 versions of promoted-P0 REQs):**
- **REQ-013 minimal** (NGO dashboard: project list + fuel + task progress + "Action needed" rail only. Recent activity feed, KYC upsell CTA, Lovable rail, opt-in testimonials all deferred to v1.5.)
- **REQ-014 minimal** (Volunteer dashboard: current projects + fuel gauge + completion credit; **no badge engine, no NGO satisfaction signal collection in v1**. NGO satisfaction signals deferred to v1.5 because they need a UX flow at handoff that doesn't exist without tips.)
- **REQ-015** (project comment thread on the project page via `task_comments`; system events go to the notifications feed via `notify()`; **the full Slack-style channel — Realtime / threads / @-mentions / search — is v1.5, decision-15**)
- **REQ-016 minimal** (Event notifications with sensible defaults — no per-user preference UI; deferred to v1.5)

**Triage gate:** All NGOs go through human triage (REQ-023). No KYC auto-approval in v1.

**Handoff:**
- **REQ-012 minimal** (Automated checklist + sign-off; repo permission adjustment with optional transfer; virtual-key termination + Linear membership removal + tree snapshot; **includes the REQ-035 attribution step — decision-22**. **Tip flow deferred to v1.5.**)

---

### v1.5 (3-6 months post-launch)

Triggered by either pilot operational pain or a specific external event. Each item lists its trigger.

| Item | Trigger | Effort |
|---|---|---|
| **Move-funds-between-projects** (decided 2026-06-03 — Item 3) | NGOs accumulate idle credit on finished projects and ask to redeploy it elsewhere | `allocation` ledger flow + UI; ~8h |
| **Project pause/resume — the `paused` state** (decision-17 removed it from v1) | First real NGO request to pause an active project (v1 workaround: unpublish pre-match; admin key-deactivation + note, or cancel, mid-build) | Re-add the state + 2 transitions + `paused_from_status` restore + `fuel_deadline_remaining_seconds` funding-clock freeze + paused-exclusion in the merged aging scan; ~8h |
| **Replit as a 2nd sanctioned builder platform** (decided 2026-06-03 — Item 2) | A Track-A project needs clean post-build ownership transfer that Lovable can't do, or Lovable reliability falters | ~30h (per-platform handoff playbook + PII review + integration) |
| **Volunteer referral loop** (decided 2026-06-03 — Item 6) | Concierge cohort proves the loop; organic supply needs compounding | ~15h |
| **Auto-top-up (off-session Stripe + SCA + dispute handling)** (REQ-006 deferred) | Pilot NGOs report fuel-low interrupts are friction; auto-top-up adoption rate when manually pitched > 30% | ~25h |
| **Tips via Stripe Connect** (REQ-022 deferred) | First pilot handoff where NGO asks "how do I thank the volunteer with money?"; volunteer demand for tip-eligibility | ~30h (Connect Express onboarding, destination charges, dispute/refund handling) |
| ~~**REQ-026 MCP server**~~ | — | — | **DROPPED entirely by decision-9 (2026-06-06)** — neither v1 nor v1.5. The platform task-MCP server (`mcp.ai4good.dev/projects/:id`) is replaced by git-as-truth (local TaskMaster + `tasks.json` in the repo + GitHub-webhook → Postgres projection). It was briefly promoted to v1 on 2026-05-24; decision-9 superseded that and removed the ~15h. |
| **REQ-025 full CR workflow UI** (v1 has minimal channel-based CR) | Pilot NGOs raising CRs find the channel surface too thin; want a dedicated section with cards, statuses, completion notifications | ~15h |
| **REQ-011 match score algorithm + breakdown UI** (v1 has skill-tag overlap only) | NGO/volunteer feedback that "I don't know why this project showed up for me"; >20 active marketplace projects making manual browsing painful | ~12h |
| ~~REQ-014 NGO satisfaction signal collection~~ | — | **Superseded by decision-22:** the REQ-035 attribution step ships in v1 (credit-framed capture at sign-off). What stays v1.5 is the richer reputation SURFACE: attribution + jumpstart health visible in matching (~8h). |
| **REQ-034 reconciliation surfaces** (decision-22) | Coordinator wants the unattributed-% panel + binding-broken/stale signals; per-task cost baselines feeding Discovery estimates | ~8h |
| **Gateway Layer-2 reconciliation + residual hardening** (decision-21 ladder) | Ledger shows real anomalies (Layer 2); endpoint/method allowlists, payload bounds, IP-velocity checks before organic signup | ~20h |
| **Linear wrapper-MCP** (decision-20) | Detect-and-revert proves noisy (agents keep tripping status changes) | ~10h |
| **REQ-002 KYC tier + Stripe Identity automation** (v1 is manual review only) | Verification queue grows beyond 1 admin's twice-daily batch capacity | ~15h |
| **REQ-021 Lovable inbound email parser** (v1 is manual widget only) | Pilot NGOs report manual widget toggling is annoying; Lovable email format proves stable across 2+ projects | ~12h |
| ~~AI Proxy with 9-layer enforcement~~ | — | **SHIPPED IN v1 as the LLM gateway (decision-21)**; only the residual layers (allowlists, payload bounds, IP-velocity) remain v1.5 — see the Layer-2 row above |
| **Channel enhancements** — threaded replies (Slack-side-panel pattern), presence indicators, full-text search, image attachments | NGO/volunteer feedback that minimal channels feel lacking | ~25h |
| **Per-user notification preferences UI** | First user complaint about email frequency | ~8h |
| **Dashboard richer surfaces** — recent activity feed, badge engine, opt-in testimonials, KYC upsell CTA, Lovable rail | Engagement metrics indicate volunteers/NGOs want more reputation surface | ~20h |
| **`lovable_only` mode + no-Anthropic-fuel kickoff path** | Discovery sees Lovable-only-suitable projects at meaningful volume; willingness to design a separate funding path | ~15h |
| **AI Change-Request Agent** (REQ-025 v2 note) | NGOs find raw CR flow too thin; need help articulating | ~25h |
| **Anthropic spend-alert email parsing as 2nd anomaly signal** (Out of Scope #23 follow-up) | First high-spend anomaly that our polling missed | ~6h |
| ~~Wrapper script for Claude Code~~ | — | **Superseded by decision-21** — the gateway ships in v1; vanilla Claude Code + two env vars |
| ~~Real-time anthropic_key_status display~~ | — | **MOOT (decision-21)** — virtual-key status is a live Supabase row; the volunteer dashboard reads it directly |
| ~~Multi-Anthropic-org provisioning~~ | — | **RETIRED (decision-21)** — no per-project workspaces; the 100-workspace cap never binds |
| **REQ-023 Triage attestation + spot-check** (devolution of admin queue per open-item-5 2026-05-27) | Triage queue median age exceeds 24h OR weekly admin triage time > 5h | NGO self-attests at publish (open-source / nonprofit / no-PII checkboxes); project goes live immediately; admin spot-checks 10-20% random sample + investigates blockers from volunteers/NGOs reporting violations; revoke-on-violation flow added. Aligns with §11 Open Issue #5 (admin staffing at scale). ~15h (attestation UI + spot-check sampling job + revocation flow). |

---

### v2 (6-12 months post-launch)

Bigger architectural changes or features that need significant ecosystem changes outside ai4good's control.

| Item | Trigger / Dependency | Notes |
|---|---|---|
| **REQ-017 — Post-handoff feature-request surfacing** (P1) | Pilot NGOs report wanting to drive follow-up work | Not v1 launch-blocking; ships when there are enough handed-off projects to surface |
| **REQ-018 — Discovery voice input** | NGO feedback that typing is too much friction | |
| **REQ-019 — Multi-volunteer per project** | Project complexity outgrows single-volunteer model | Schema changes; team coordination UX |
| **REQ-020 — Public Impact page per NGO** | NGOs want a marketing surface; we have enough shipped tools to populate it | |
| **Automated NGO verification via Charity Navigator / GuideStar API** | Manual review queue grows beyond 1 admin's capacity | |
| **KYC auto-approval for `kyc_verified` NGOs** | Triage volume informs that KYC NGOs reliably pass; staffing model needs relief | |
| **Lovable MCP polling for real-time credit status** (Open Q7) | Lovable graduates MCP from Research Preview AND ships scoped OAuth (e.g. `billing:read`) OR ships billing webhook | Verify before building; Lovable may also ship a partner program that supersedes this |
| ~~Fully-automated Anthropic key provisioning~~ (Open Q8) | — | **MOOT (decision-21)** — no per-project Anthropic keys exist; Q8 closed |
| **Lovable credit reselling** (Out of Scope #16) | Signed reseller agreement with Lovable | Requires tax/VAT pass-through + refund flow |
| **External Slack integration** (REQ-015 v2 note) | NGOs already on Slack want to mirror project channels into their workspace | |
| **Anonymous post-handoff contributors** | Post-handoff issues attract drive-by fixes from non-registered devs | Architectural simplification post-launch |

---

### v1 design rationale: Claude Code orchestrates Lovable (now the Track-A v1 architecture — promoted 2026-06-03)

**This is now v1 (REQ-021 + REQ-028), not a future direction.** For Track-A projects the volunteer's local Claude Code runs the ai4good Skill and is configured with two MCP servers — the **Linear MCP** (tasks — decision-20; committed `.mcp.json`, volunteer OAuth) and `mcp.lovable.dev` (Lovable, OAuth-user-scoped, Research Preview) — plus ai4good REST for context/blockers/comments, and orchestrates Lovable behind the `LovableDriver` port: pulls the next Linear issue, decides Lovable vs local, prompts Lovable via `send_message`, reads `get_diff`, runs tests, iterates; **status lands via the PR merge** (Linear GitHub integration), never by agent say-so. If Lovable MCP breaks, the port falls back to manual dual-rail. This section captures the rationale + the concrete Lovable tool surface; the *requirements* live in REQ-021/REQ-028.

**Concrete Lovable MCP tool surface (verified 2026-05-25 against [Lovable docs](https://docs.lovable.dev/integrations/lovable-mcp-server)):**

| Skill use | Lovable MCP tool |
|---|---|
| "Generate this UI piece" | `send_message(project_id, message, plan_mode?, files?)` — sends a chat message to Lovable's agent; returns sync result or `message_id` to poll |
| "What did Lovable produce" | `get_message(message_id)`, `get_diff()`, `list_files()`, `read_file(path)`, `list_edits()` |
| "Seed Lovable Knowledge with our commit convention" | `set_project_knowledge(project_id, knowledge)` |
| "List the volunteer's accessible projects" | `list_projects()`, `get_project(project_id)` |
| "Inspect Lovable workspace" | `get_workspace(workspace_id)` (also returns credit balance, used for the v1 budget-cap surfacing), `list_workspaces()` |
| "Deploy a preview" | `deploy_project(project_id)` |
| "Register ai4good MCP inside Lovable" | `add_mcp_server(...)` |

**Why this is the right architecture (and the v1 risk handling):**
- **Single source of intent** — the dev's Claude Code conversation is the canonical record; ai4good metering/scope/audit stays authoritative because everything routes through the entry point.
- **Cost enforcement is structural** — the Skill makes the `send_message` calls, so it enforces the per-task Lovable-credit budget cap, logs each call, and polls `get_workspace()` to surface the NGO's Lovable balance (the v1 cost-guardrail, REQ-021/028). `send_message` bills the NGO's Lovable workspace.
- **Billing reality:** per Lovable docs, *"every `send_message` operation draws from the workspace's build credit pool"* — billed to the NGO's workspace regardless of the OAuth identity; this is why the budget cap is mandatory and now enforceable.
- **OAuth note:** Lovable's MCP is user-scoped (no service tokens); each volunteer OAuth-connects their own Lovable account; their Claude Code session is their Lovable identity for audit; cross-workspace scope is bounded by who invited them.
- **Research-Preview risk handling:** the `LovableDriver` anti-corruption port + manual dual-rail fallback (REQ-021) mean a Lovable MCP breaking change degrades gracefully — Track-A builds never go dead. **Checkpoint USER-TEST** validates orchestration on 1-2 real projects in pilot.

**Genuinely deferred (v1.5/v2):** Replit as a second builder platform (v1.5); fully-autonomous orchestration polish + `add_mcp_server`-driven zero-touch setup (v2). The v1 Skill already ships the orchestration shell.

---

### Permanently out of scope (will not build)

These are firm "no" — included to prevent re-litigation:

- **Crypto / on-chain tokens / tradeable fuel** (Out of Scope #2) — Stripe-backed fiat only
- **Native mobile apps** (Out of Scope #3) — web-responsive only
- **Closed-source / proprietary builds** (Out of Scope #18) — all projects MIT-licensed open source by default
- **Service-level agreements / completion guarantees** (Out of Scope #17) — directly contradicts Platform Promise §4
- **Fuel-spend insurance / refund-on-no-deliverable** (Out of Scope #19) — structurally impossible (can't un-spend tokens) and contradicts Platform Promise §3
- **Platform skim on volunteer tips** (Out of Scope #12) — explicitly 0% on tips
- **Hosted production environment for NGO-built tools** (Out of Scope #10) — handoff is to NGO ownership
- **NGO-to-NGO tool sharing marketplace** (Out of Scope #7) — out of mission scope; OSS forking happens on GitHub naturally
- **Multi-tool fuel metering at platform level** (Out of Scope #15) — only Anthropic via fuel; other tools are NGO-direct or volunteer-personal
- **OpenTelemetry collection of prompt content from volunteers** (Out of Scope #23) — privacy posture; v1.5 proxy supersedes

---

### Open issues that should be resolved before public launch

These are **Tier 2 issues from the codex review (2026-05-23)** that were not addressed in the Tier 1 cleanup pass. They are not "features to build" but **decisions to make + policies to write** before exposing the platform to real NGOs:

| # | Issue | Status | Decision needed |
|---|---|---|---|
| 1 | ~~**Legal/tax characterization of "fuel"**~~ | **Decided 2026-06-03** | Fuel = **prepaid, fully-consumable, non-cash-refundable service credit** (Item 3 — no cash-out removes stored-value/money-transmission concerns; non-cash credit doesn't escheat like an abandoned cash balance; no decay clock). One-line counsel confirmation still wanted, but the design is set. |
| 2 | ~~**Refund / donation / chargeback mechanics**~~ | **Mostly dissolved 2026-06-03** | No cash-out in v1 (Item 3) removes Treasury/ACH/180-day-refund/AML entirely. Chargeback-after-consumption handled: `charge.dispute.created` → freeze + key-deactivate + `chargeback`/`chargeback_writeoff` ledger kinds + reserve (REQ-006). Donations are tax-deductible (nonprofit, #8). |
| 3 | ~~**Abandonment / rematch state machine**~~ | **Resolved 2026-06-03** | Now **REQ-027** — `in_progress → open` edge, 14/21-day inactivity release, outbox teardown, fuel-stays-on-project, ghosted-vs-released-for-cause. |
| 4 | ~~**Sensitive-data / open-source repo conflict**~~ | **Resolved 2026-05-24** | Resolved by introducing private-opt-in to Platform Promise §2 (public MIT default; private allowed for justified PII/classified cases, confirmed at triage REQ-023). `projects.visibility` field + `visibility_justification` text + triage review flow now spec'd. Prohibited project types (medical-records, PII-processor-without-consent) still need a separate acceptable-use doc per REQ-023 task 23.6 — out-of-PRD ops work, not a blocker. Secret-scanning, anonymization/fixture policy: standard GitHub-side hygiene; not v1 platform features. |
| 5 | **Admin staffing model at scale** | Open | "<10 min/project/week admin time" is achievable at pilot volume (≤10 projects) but Codex correctly flags it's not credible at year-1 target (200 active projects = 33 admin hours/week of manual work). Need: explicit staffing model OR cut manual gates (auto-triage for KYC NGOs, etc.) before scale. |
| 6 | **Anthropic commercial readiness for year-1 spend** | Open | Year-1 target = ~$210k of Anthropic spend. Need: org-tier negotiation, prepaid credit arrangement vs invoice billing, multi-org provisioning agreement, custom rate limits. Should be a launch gate, not a quarterly watch item. |
| 7 | ~~**Deployment ownership post-handoff**~~ | **Decided 2026-06-03** | Item 2 / Goal 1: the deliverable is a *deployed running tool*. Track A → Lovable hosts it + NGO self-maintains via chat (NGO owns the workspace + ~$25/mo to Lovable, disclosed); Track A is the only track v1 builds. (Track B → free-tier host on the NGO's account + credentials handoff is deferred to post-v1 — decision-19.) ai4good never operates infra. `deployment_url` is a handoff precondition (REQ-012); 30-day-alive tracked. |
| 8 | ~~**Entity type**~~ | **Decided 2026-06-03** | **Nonprofit path** — fiscal sponsorship now → own 501(c)(3) later. Makes "donate unused fuel" tax-deductible, legitimizes volunteers-donating-time, opens grant funding. Forecloses traditional VC. |
| 9 | **Counsel deliverables (the residual legal work)** | Open | Item 7: a plain-language, counsel-reviewed **Terms of Service** holding the no-warranty/no-SLA/limitation-of-liability terms (the UI keeps the warm "coordination layer" voice); a light **volunteer-classification opinion** (low-risk given nonprofit); fiscal-sponsor agreement; EU **data-residency posture + sub-processor/DPA** stance before EU onboarding (Anthropic/Lovable/Stripe). |
| 10 | **Blended P&L + grant runway** (Item 5) | Open | Build a bottom-up year-1 P&L (skim + grants + donations vs Anthropic float + infra + concierge/admin labor); lock in grant/donor runway covering the projected net gap. Goal 3 re-pointed to blended sustainability. |

These open issues are tracked separately from technical Open Questions (Q1-Q8 below) because they require external input (legal, accounting, business) rather than just engineering decisions.

---

## Open Questions & Risks

### Open Questions

#### Q1: Per-project Anthropic API keys — re-resolved 2026-05-16; SUPERSEDED by decision-21 (2026-07-05)

> **Decision-21 supersedes everything below:** there are no per-project Anthropic workspaces or keys. Volunteers hold `a4g_*` virtual keys terminated at the ai4good LLM gateway (REQ-009); attribution is per-request at the gateway; revocation is one Supabase row; the manual Console step, the 100-workspace cap, and the spend-limit ambiguity are all moot. Kept for the decision trail:

- **Original resolution (2026-05-15):** Option B (platform key + `metadata.user_id` tagging).
- **Re-resolved (2026-05-16) → Option A: per-project Anthropic Workspaces.** Triggered by audit-architecture research: Anthropic's Usage API does **not** expose `metadata.user_id` as a filter or group_by dimension (only `api_key_id`, `workspace_id`, `model`, `service_tier`, etc.). Option B's per-project attribution was therefore essentially unworkable.
- **New v1 architecture:**
  - One **Anthropic Workspace per ai4good project**, created programmatically via Admin API (`POST /v1/organizations/workspaces`).
  - One API key per workspace. **Anthropic does NOT permit programmatic key creation** ("API keys can only be created through the Claude Console for security reasons" — Anthropic Admin API FAQ). v1 includes a **manual Console step in the ops queue** to mint each project's key (~30 sec admin task on `in_progress` transition).
  - Per-workspace spend limit set in Console (also currently manual; could automate if/when Anthropic exposes the endpoint).
  - Usage attribution: native per-workspace via Usage API (no metadata gap).
  - Revocation: programmatic via Admin API (`status: 'inactive'` on the key, or archive the workspace which auto-revokes all its keys).
  - **Vanilla Claude Code works** — volunteer just sets `ANTHROPIC_API_KEY` to the project's dedicated key. No wrapper script needed for the metadata gap (which no longer exists).
- **Caveats accepted in v1:**
  - One manual Console step per project (queued in ops).
  - 100-workspace org cap (Anthropic-imposed). v1 pilot fits within one org; year-1 target (200 active projects per NFR Scalability) **exceeds** one org → multi-org plan kicks in at 80 active workspaces per the NFR "Anthropic 100-workspace-per-org scale path" subsection (was understated as "manageable" — corrected codex round 6 nit). Archive policy + multi-org provisioning are documented; volunteer DX unchanged.
  - Spend-limit hard-block semantics are not unambiguously documented by Anthropic for non-batch calls. Treat as soft; back up with our own Usage API polling + programmatic key deactivation when project fuel hits zero (REQ-009).
  - No per-request log table (Anthropic does not offer an OpenAI-style per-request log). Audit is via 1-min Usage API buckets + cross-reference with PM-task / commit cadence — see REQ-009 audit acceptance criteria.

#### Q8: When does Anthropic expose programmatic key creation? — MOOT (decision-21)

- **Status: closed 2026-07-05.** Decision-21 removed per-project Anthropic keys entirely — virtual keys mint as Supabase rows; no Anthropic Admin-API dependency remains. Nothing to monitor.

#### Open decisions register — governance fold-in (decisions 20/21/22, 2026-07-05)

Open calls the founder still owes; none block the PRD-dissection pass, all block the specific build task named:

| # | Decision | Blocks |
|---|---|---|
| OD-1 | **Reviewer identity + merge authority** per project (coordinator? peer volunteer? agent-assisted with a human click?) — a governance decision, not plumbing | REQ-026 merge-flow copy + the reviewer-agent skill's role |
| OD-2 | **NGO Status-Panel scope + workspace onboarding mechanics** (what the panel shows beyond the tree; how the NGO is introduced to it) | REQ-010/013 panel build |
| OD-3 | **Cap values** — rolling-window size, per-request max, fuel-warning thresholds | REQ-009 Task 9.3 config |
| OD-4 | **Fingerprint enforcement token threshold** (the ~1.5k figure) | REQ-009 Task 9.4 config |
| OD-5 | **Layer-2 reconciliation cadence + anomaly thresholds** (only if/when the ladder rung is built) | v1.5 |
| OD-6 | **Gateway hosting** — thin Deno proxy on Supabase Edge Functions vs self-hosted LiteLLM-style service (founder: "leave the gateway for now") | REQ-009 Task 9.1 |

#### Q2: Worker layer — Supabase Edge Functions vs Fly.io?

- **Current Status (resolved):** Edge Functions carry less overhead but have time limits; long usage polls + webhook fanout were checked against those limits and fit.
- **Resolved:** Supabase Edge Functions (Deno) + pg_cron for all periodic backend work; Fly.io reserved as an escape hatch only. (Option C Vercel Cron + serverless dropped — platform no longer on Vercel.)
- **Owner:** Tech lead.
- **Deadline:** Phase 2 week 4.
- **Impact:** Low (mostly internal complexity).

#### Q3: NGO verification process — what minimum bar?

- **Status: Partially resolved (2026-05-15).** KYC provider locked to **Stripe Identity** (~$1.50/verification, already in our Stripe ecosystem, supports doc + selfie). Bar for `verified` tier: registration doc + public reference link, manual admin review. Bar for `kyc_verified` tier: above + tax-exempt status doc + Stripe Identity check on admin. Open sub-question: which jurisdictions' tax-exempt docs to accept in v1 (US 501(c)(3), UK Charity Commission, EU equivalents)?

#### Q4: Skim rate — fixed 15% or NGO-size-tiered?

- **Current Status:** Default 15% in REQ-006. Should very small NGOs pay less? Or larger funders pay more?
- **Options:** (A) Flat 15%, (B) Tiered by NGO annual revenue, (C) Flat 15% but allow waivers for sub-$200 budgets.
- **Owner:** Business.
- **Deadline:** Pre-public-launch (Phase 4).
- **Impact:** Medium (affects revenue model).

#### Q5: Volunteer compensation beyond AI-cost coverage?

- **Status:** **Resolved (2026-05-15); updated 2026-05-24 to reflect §11 scope cut.** v1 ships with (a) reputation-only (completion credit + the single "Shipped first tool" badge, REQ-014 minimal). Option (c) — optional NGO tips at handoff via Stripe Connect (REQ-022) at 0% platform skim — was originally planned for v1 but is **deferred to v1.5** per §11 (operational realism). Option (b) — separate platform-funded honorarium pool — explicitly deferred; revisit only if Goal 2 (volunteer retention) underperforms.

#### Q6: Should Discovery require pre-funded fuel?

- **Status: Resolved (2026-05-15); updated 2026-05-24, then superseded 2026-06-06 by decision-8/11.** v1 ships with **free Discovery** for both tiers within a per-NGO **daily context-weighted credit allowance** (10/day unverified, 30/day verified — REQ-002/004). **The old "30 messages/day" cap and the "$5 Anthropic spend cap per session" are RETIRED** — both are superseded by the daily credit allowance (which is itself the daily limit) and the context-weighted per-turn burn; neither has a `platform_settings` column and neither should be cited as a live ceiling. Fuel is no longer required only at acceptance — it can be funded from `draft` onward (decision-8, REQ-006), and a funded project's Discovery is dollar-metered (decision-11 routing). The `kyc_verified` lifted-limit incentive remains **deferred to v1.5** per §11. Revisit the daily amounts if abuse exceeds guardrails.

#### Q7: When (if ever) should ai4good adopt MCP-based polling of Lovable workspaces?

- **Status: Researched 2026-05-16; re-scoped 2026-06-03 by the Track-A pivot.** The question splits into two distinct integrations that the pre-pivot text conflated:
  1. **Client-side, in v1 (SHIPS):** During Track-A orchestration the *volunteer's* Claude Code Skill calls `mcp.lovable.dev` `get_workspace` (under the volunteer's own OAuth, behind the consent gate + `LovableDriver` port) to read the NGO's credit balance and enforce the per-task budget cap (REQ-021/028). This is per-session, user-scoped, and consented — not backend polling.
  2. **Backend, server-side polling (DEFERRED):** A backend integration that polls `mcp.lovable.dev` on a schedule across all NGO workspaces is what stays deferred. Lovable MCP auth is OAuth-only and user-scoped with no API keys / scoped tokens, so a backend poller would require each NGO to grant ai4good account-wide access — over-broad. MCP is also Research Preview ("breaking changes without notice"), and the April 2026 BOLA incident at Lovable indicates ongoing API security maturation. Analytics tools (`get_project_analytics`, `get_project_analytics_trend`) that could enrich cadence stats ride on this same deferred backend path.
- **Specific v1.5/v2 triggers to revisit the *backend* poller:**
  1. Lovable graduates MCP from Research Preview, AND
  2. Lovable ships scoped OAuth (e.g. a `billing:read` scope that doesn't expose project read/write), OR
  3. Lovable ships a billing webhook for credit-level events (`credits.low`, `credits.exhausted`).
- **Owner:** Tech lead — watch [docs.lovable.dev/changelog](https://docs.lovable.dev/changelog) quarterly. If a `billing:read` scope or webhook ships, file a half-day research spike to redesign the backend polling integration.
- **Impact (when triggered):** Replaces email-forwarding + client-side reads with deterministic backend real-time polling; unlocks Lovable-side analytics (`get_project_analytics_trend`) as a potential cadence-stats enhancement alongside GitHub data.

### Risks & Mitigation

| Risk | Likelihood | Impact | Severity | Mitigation | Contingency |
|---|---|---|---|---|---|
| Volunteers exceed project fuel without enforcement | High | Medium | **High** | Aggressive low-balance alerting, hard cut-off when fuel = 0, social pressure (transparent ledger) | NGO can choose to top up; platform absorbs overrun for week-1 pilots and learns |
| NGOs sign up but never fund | High | Medium | **Medium** | Free Discovery as funnel; $50 minimum at match-acceptance (REQ-006), not at publish; aggressive abandonment-detection (Open Issues §11 #3 — to be REQ-027). | Loosen if it kills funnel; tag unfunded projects clearly |
| Malicious NGO posts a need that's actually commercial | Medium | High | **High** | Verification gate + Project review by platform admin during pilot | Reject + ban; document policy clearly |
| Volunteers ghost mid-project | Medium | High | **High** | 14-day inactivity reminder → 21-day auto-release → project re-opened | Project page surfaces volunteer responsiveness; NGOs can request re-match |
| Stripe webhook delivery failure (fuel not credited) | Low | High | **High** | Stripe handles retries; the `stripe-webhook` Supabase Edge Function is idempotent; a pg_cron nightly reconciliation Edge Function (daily-reconciliation/control-total) catches missed credits | Manual reconciliation tool for platform admin |
| Anthropic outage stops new projects (Discovery dead) | Medium | High | **High** | Show clear "Service degraded" banner; queue intakes; offer manual scope option | OpenAI as Discovery fallback (post-v1) |
| GitHub API rate limit hit | Low | Medium | **Medium** | GitHub App tokens have 5000 req/hour; we batch + cache | Backoff + retry queue |
| Privacy regulator views NGO docs as sensitive PII | Low | Medium | **Medium** | Private bucket, signed URLs, encryption at rest; DPA available | Add explicit consent + minimization review |
| AI-generated code has license or quality issues | Medium | Medium | **Medium** | MIT default (Platform Promise §2); first-apply disclaimer covers volunteer's IP attestation (REQ-007 + Story 3 open-item-5 redesign — no separate CLA needed in v1); CI lints and tests required for handoff (REQ-012) | NGO can reject handoff; we publish remediation playbook |
| Fuel-cost inflation (Anthropic raises prices) | Medium | Medium | **Medium** | Skim is %-based, scales naturally; communicate clearly to NGOs | Adjust fuel rate card monthly |
| Lovable security incident affects our integration (e.g. April 2026 BOLA) | Low | Medium | **Medium** | **No ai4good credential lives in Lovable at all (decision-20 deleted the connector)** — the only Lovable coupling is the volunteer's own OAuth for the Skill's `LovableDriver` calls; monitor [docs.lovable.dev/changelog](https://docs.lovable.dev/changelog) and security advisories. | If incident affects NGOs, pause Track-A Lovable recommendations until Lovable confirms remediation; in-flight Track-A projects fall back to the manual dual-rail (Claude Code direct, REQ-021 fallback path) |
| ~~Lovable email format changes, breaking the auto-detection parser~~ | — | — | **N/A in v1** | Lovable inbound-email parser is deferred to v1.5 per §11; v1 uses manual Lovable Status widget only (REQ-021). Row retained as historical context; will move to active mitigation when v1.5 parser ships. | — |
| **AI tools consume fuel without producing a viable deliverable** | **High** | **Medium** | **High** | **This is the irreducible risk of AI-assisted dev. Mitigations: (a) explicit Platform Promise disclaimer at first-apply (Story 3 / REQ-007 open-item-5 redesign), (b) per-project fuel cap = bounded financial exposure, (c) USER-TEST checkpoints in the build plan every ~5 tasks catch dead-end work early, (d) Discovery Agent quality target (Goal 4) reduces foundational scope errors, (e) burn-per-deliverable on the NGO panel (REQ-034) makes unproductive burn visible per task, not just in aggregate.** | Be transparent with the NGO; offer post-mortem; do not refund consumed fuel (cannot un-spend tokens). The REQ-035 handoff attribution + jumpstart health record (decision-22) captures the outcome; reputation surfaces in matching at v1.5. |
| NGO expects an SLA / completion guarantee and is angered when project stalls | Medium | Medium | **Medium** | Hard disclaimer acknowledgment is mandatory at signup and at every match acceptance (Option D — the no-SLA/no-completion clause is acknowledged exactly where the real commitment happens); a passive Promise-link footer appears at every top-up; NGO dashboard reminds of the operating model; support copy is consistent | Direct outreach by platform admin; offer next-volunteer match priority; document case for FAQ |

---

## Validation Checkpoints

These map 1:1 with the Phase checkpoints above. Each is a **user-test task** in the taskmaster plan.

### Checkpoint 1: Foundation Complete

**Criteria:**
- [ ] Test NGO + test volunteer accounts created via real auth flow
- [ ] NGO upload of verification doc succeeds; admin queue shows it
- [ ] Platform admin can flip NGO to `verified`
- [ ] RLS policies prevent cross-NGO data access (proven by red-team test)

**If Failed:** Revisit auth + RLS before any product work proceeds.

---

### Checkpoint 2: First End-to-End Project

**Criteria:**
- [ ] One full NGO journey: signup → verify → intake → discovery → publish → triage approval → match → fund $50 (kickoff fuel)
- [ ] One full volunteer journey: signup (GitHub/Google/email) → browse → apply (link GitHub at this step if not yet linked, per REQ-007) → NGO accepts → wait for NGO fund → in_progress (repo + Linear backlog + virtual key all live)
- [ ] Fuel is correctly debited by the gateway inline (test with 10k tokens through the gateway; verify micro-cent precision + skim-row pairing + `gateway_request_id` idempotency + `task_ref` stamped)
- [ ] Detect-and-revert fires on a hand-moved Linear status; PR merge moves status to done
- [ ] Handoff flow completes; NGO can sign off
- [ ] No critical bugs in audit log

**If Failed:** Don't ship to pilot NGOs.

---

### Checkpoint 3: Pilot-Ready

**Criteria:**
- [ ] NGO + volunteer dashboards (v1 minimal versions per §11) usable without help docs
- [ ] In-platform messaging (basic chat, no threading/search/attachments in v1) replaces out-of-band coordination
- [ ] Notifications fire with sensible v1 defaults (no per-user preference UI yet — v1.5)
- [ ] 3 internal full-cycle runs successful
- [ ] **USER-TEST: the Linear rail end-to-end (decision-20; replaces the retired ai4good-MCP-in-Lovable test).** On a throwaway project workspace: (a) self-assign an issue via the Linear MCP from a Claude Code session → panel shows "in progress" within seconds and `.a4g/task.md` carries the identifier (REQ-034 binding); (b) merge a PR with `Fixes <identifier>` → issue lands Done via the GitHub integration → projection + NGO panel update; (c) hand-move a status in the Linear UI as the volunteer → **detect-and-revert** fires (revert + explanatory comment + low-tone notification); (d) burn a gateway request while bound → the ledger row carries `task_ref`. **Pass:** all four. **Fail:** investigate webhook delivery/ordering; wrapper-MCP is the documented fallback if reverts prove noisy.

**If Failed:** Push pilot back; identify highest-friction step from screen recordings.

---

### Checkpoint 4: Public-Beta Ready

**Criteria:**
- [ ] All P0 + P1 tests passing in CI
- [ ] axe-core passes on all top-level pages
- [ ] Pen-test report: no critical or high findings
- [ ] p95 marketplace < 500ms under 100 RPS load test
- [ ] Stripe Tax + VAT invoices verified with 1 EU pilot NGO
- [ ] GDPR erasure tested end-to-end

**If Failed:** Delay public beta; address each red flag.

---

### Checkpoint 5: Public Beta Health

**Criteria (rolling, weekly through Phase 5):**
- [ ] Error rate < 1% on all critical endpoints
- [ ] Sign-up → first publish funnel ≥ 30%
- [ ] First handed-off project occurs within 4 weeks of opening
- [ ] No critical incident requiring rollback

**If Failed:** Halt onboarding of new NGOs; root-cause; resume only when fixed.

---

## Appendix: Task Breakdown Hints

### Suggested Taskmaster Task Structure

**Phase 1 — Foundation (8 tasks, ~48h)**
1. Supabase project + base schema (8h)
2. Scaffold app shell — Lovable creates the TanStack Start (SSR) project + GitHub repo (4h)
3. Supabase Auth integration (6h)
4. RLS policies (6h)
5. NGO org profile + verification upload (8h)
6. Volunteer profile + GitHub OAuth (8h)
7. Platform admin verification queue (5h)
8. Sentry + logging (3h)

**Phase 2 — Core MVP (24 tasks, ~219h — post-2026-06-03 pivot + 2026-06-04 decision-8 + 2026-06-06 decision-9; prior ~157h + 58h pivot + 10h decision-8 - 6h decision-9)**
9. Project draft + intake form (6h)
10. Discovery Agent conversation engine (16h)
11. Discovery output → scope doc UI (8h)
12. Project publish flow → triage (REQ-023) (6h)
13. Stripe Checkout + fuel ledger schema (single-row topup, Option γ; **NO auto-top-up in v1**) (10h)
14. Stripe webhook + reconciliation (8h)
15. Marketplace listing + filters (skill/cause/complexity badges; **no numeric match score in v1**) (8h)
16. Apply / accept flow (Accept/Decline; **no match score algorithm in v1**) (5h)
17. GitHub App + repo creation on funding (Claude Code only; Lovable repo URL captured separately) (10h)
18. Bootstrap-from-Discovery Supabase Edge Function (Deno) + NGO REST API (Supabase Edge Functions) (REQ-026 decision-9 — generate initial `tasks.json`, commit to repo via GitHub App on `in_progress`; REST endpoints for comments / blockers / context / tasks.json proxy; per-project bearer-token auth) (9h)
19. `github-webhook` Supabase Edge Function (Deno) + Postgres projection worker (REQ-026 decision-9 — single ingestPush — push event filter, fetch updated `tasks.json`, diff against `project_tasks`, upsert; pg_cron → head-sha-reconcile Edge Function for missed webhooks; idempotent via delivery_id) (8h)
20. Per-project Anthropic workspace + manual key-bootstrap ops queue (REQ-009) (12h)
21. **Idempotent cursored** Anthropic Usage poller behind `UsageMeteringProvider` port (`usage_poll_state` cursor + per-consumption-bucket unique index + `job_runs` heartbeat) + local rate-card + daily Cost Report reconciliation (REQ-009) (14h)
22. Fuel-low blockers + notifications (REQ-024 integration) (5h)
23. Project page (public, single view) + PM task tree + activity feed (REQ-010) (10h)
24. Lovable Track-A surfaces (REQ-021: manual status widget + per-actor MCP token setup page + Knowledge-field snippet docs; orchestration logic lives in the Skill, task 26; **no inbound email parser in v1**) (5h)
25. Handoff checklist + sign-off (**no tips, no satisfaction modal in v1**) (6h)
26. ai4good Claude Code Skill — **v1 CORE orchestration shell** (REQ-028 + REQ-021: `LovableDriver` port over Lovable MCP, structural per-task credit cap + `get_workspace` polling + scope/audit enforcement + manual dual-rail fallback + install/session-bootstrap/slash-commands/code-commit-prefix-hook/**tasks.json auto-commit+push hook decision-9**) (28h)
27. Transactional **outbox** — `outbox_events` table + relay worker + at-least-once delivery for all side-effect sagas (REQ-029/030) (10h)
28. Ledger integrity — pair-sum **control-total** pg_cron → Supabase Edge Function (Deno) nightly job + the `stripe-webhook` Supabase Edge Function handling dispute/`chargeback` + `chargeback_writeoff` + `reserve_floor_cents` + `first_fund_cap_cents` enforcement (REQ-006) (10h)
29. Continuous **base-permission invariant** job (REQ-008 — every active volunteer holds exactly their project repo role; reconcile drift; single-org v1) (4h)
30. **Deploy-to-running** step (REQ-012 — deploy app to a live URL, capture `deployment_url`, gate handoff; handoff ritual: RLS-on, revert demo, two-way GitHub, spend cap) (7h)
31. **Tier-2 fixtures enforcement** (Discovery `data_sensitivity` gate + triage enforcement + fixtures-only build guard for special-category data) (4h)
31b. **Decision-8 unified-fuel + decision-11 Discovery CREDITS (daily drip)** — `ngos.discovery_credits_remaining` + `discovery_credits_last_reset_at` + credit params (daily grants 10/30) + `unverified→verified` 10→30 daily-allowance raise + daily HARD-RESET credit scan (00:00 UTC, no rollover) + per-turn fuel-vs-credit routing branch ("Funded → all-$") + `email_verified_at` sync + Stripe Checkout from `draft`/`discovery_in_progress` + `discovery_consumption` kind + context-weighted per-turn credit cost (caching discount) + credit-gauge/per-turn/per-file cost UI + daily-credits-exhausted composer states (fund-now / wait-tomorrow) + first-funding hard ack + retire the old 30-msg/day + $5/session caps (REQ-002/004/006/032) (15h)
31c. **Decision-12 — Post-Discovery NGO Project Assistant (REQ-033)** — `mode` marker on the Discovery conversation store + funded-project availability gate + read-only project-state context assembler (tasks/blockers/fuel/activity) + assistant system prompt + scope-discipline guardrail + fuel-metered turns (`discovery_consumption`) + cost display + fuel-zero disable + tests (REQ-033) (10h)

**Phase 3 — Dashboards, Comms & Platform Operations v1 minimal (10 tasks, ~71h — prior ~33h + 38h of pivot operability)**
32. NGO dashboard v1 minimal (project list + fuel + task progress + "Action needed" rail only) (6h)
33. Volunteer dashboard v1 minimal (current projects + fuel gauge + completion credit; "Shipped first tool" badge only) (5h)
34. In-platform messaging v1 minimal (basic chat; auto system messages; @mention email; **no threading/search/attachments**) (8h)
35. Notification dispatch with sensible defaults (**no per-user preferences UI in v1**) (6h)
36. Audit-log viewer (admin) (5h)
37. "Shipped first tool" badge logic (~3h)
38. **Observability** (REQ-029 — `job_runs` heartbeat + outbox-lag + ledger control-total + provisioning-failure alerting; v1 SLO dashboard) (10h)
39. **Ops & Incident Response** (REQ-030 — runbooks + admin money-correction console: `goodwill_refund` / `chargeback_writeoff` / paired-row double-entry corrections + incident `ops_tasks` types) (10h)
40. **Content moderation** (REQ-031 — takedown flow + secret-scanning on `ai4good-projects` repos + `content_abuse_review` queue) (10h)
41. **Abandonment / rematch saga** (REQ-027 — 21-day inactivity job, plain `in_progress` status filter per decision-17 + manual release + outbox teardown + fuel-stays-on-project + rematch priority) (8h)

**Phase 4 — Hardening (10 tasks, ~79h)** — unchanged
42. Test coverage push to 80% (16h)
43. Playwright E2E suite (10h)
44. Accessibility audit + fixes (10h)
45. Security: RLS audit + ZAP + Snyk (10h)
46. Stripe Tax + VAT (5h)
47. GDPR erasure + DPA (5h)
48. Rate limiting (Upstash) (4h)
49. Performance pass (8h)
50. Onboarding emails + help center stubs (5h)
51. Public landing page (6h)

**Phase 5 — Public Beta & Concierge Launch (9 tasks, ~49h — prior ~33h + 16h concierge tooling, Goal 5 / Item 6)**
52. Public-beta launch checklist (5h)
53. Gradual rollout (3h)
54. Internal analytics dashboard — goals 1-5, adds supply-funnel + 30-day-alive metrics (10h)
55. v1.5 AI Proxy spec doc (5h)
56. v1.5 deferred-feature backlog prioritization based on pilot data (5h)
57. Retrospective + v1.5 PRD revision (5h)
58. **Concierge supply-funnel tooling** (Goal 5 — volunteer-bench admin CRM + supply-funnel metric signup→apply→match→handoff + activation dashboard) (8h)
59. **Aging-`open`-project nudge job** (Goal 5 — surfaces stale `open` projects to concierge; plain status filter per decision-17) (3h)
60. **Hand-match admin tool** (curate + directly assign first ~10-15 projects before organic browse) (5h)

**Subtotal before decision-10: ~466h** (Phase 1 ~48h + Phase 2 ~219h + Phase 3 ~71h + Phase 4 ~79h + Phase 5 ~49h; post-pivot + decision-8 + decision-9). **NOTE:** this Appendix flat list still enumerates the *pre-decision-10* per-task shape; the authoritative build plan is now `.taskmaster/tasks/tasks.json` (66 tasks after the 2026-06-06 decision-10 pass: removed #22/#45/#46/#47/#57/#58; reshaped 20 tasks — see the Decision-10 entry in §11). **Total v1 post-decision-10: ≈ ~385h core / ~480h buffered.** Decision-10 nets ≈ −80h (ranks 2-4 consolidations + #45/rank-6 v1.5 deferrals; rank 1 already in decision-9).

### Parallelizable Tasks

**Can work in parallel within a phase:**
- Phase 1: Tasks 5 (NGO profile) and 6 (volunteer profile) are independent after 1-4.
- Phase 2: Frontend (15 marketplace, 11 scope UI) can parallelize with backend (13 Stripe, 17 GitHub); 31 (Tier-2 fixtures) rides on 10-12 and parallelizes with the money chain.
- Phase 3: All four v1-minimal feature streams (32 NGO dashboard, 33 volunteer dashboard, 34 messaging, 35 notifications) parallelize; the operability tasks (38 observability, 39 ops, 40 moderation, 41 abandonment) parallelize among themselves once 27 outbox + 28 ledger control-total land.
- Phase 4: 42 (tests), 44 (a11y), 45 (security) can run concurrently.

**Must be sequential:**
- Setup (1-4) → most of Phase 2 (depends on auth + schema).
- 10 (Discovery) → 11 (scope UI) → 12 (publish) → 15 (marketplace) — content chain.
- 13 (Stripe) → 14 (webhook) → 28 (ledger control-total + chargeback) — money chain.
- 17 (GitHub repo) → 18 (PM tasks) → 19 (MCP) → 26 (Skill orchestration) → 30 (deploy-to-running) → 23 (project page) → 25 (handoff) — execution chain.
- 27 (outbox) → 38 (observability) + 39 (ops console) + 41 (abandonment saga) — operability chain (all consume the outbox).

### Critical Path Tasks

1, 3, 4, 5, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 26, 27, 28, 30, 23, 25, 38, 39, 42, 45, 52.

**Critical path duration:** ~271h (~7 weeks at full-time; the pivot added the Skill orchestration shell [26=35h], outbox [27], ledger control-total [28], deploy-to-running [30], and the observability/ops operability gates [38/39] to the critical chain — the 27 enumerated tasks above sum to 271h).

---

**End of PRD**

*This PRD is optimized for taskmaster AI task generation. All requirements include task breakdown hints, complexity estimates, and dependency mapping to enable effective automated task planning.*
