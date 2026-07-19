# PRD: ai4good — MVP (v1 build spec)

> Pure v1 scope; deferrals in roadmap.md (RM-N).

## Executive Summary

NGOs need custom internal tools (scheduling, CRMs, grant trackers, dashboards) but cannot afford bespoke development. **ai4good: a nonprofit-operated, open-source marketplace turning NGO software needs into volunteer-built, AI-powered tools the NGO runs and keeps evolving itself.** A volunteer builds the first version via Claude Code orchestrating Lovable (the UI/app layer); the NGO then evolves the deployed app via chat. "Fuel" (prepaid, fully-consumable, non-cash metered Stripe credits) funds build-phase AI compute; the platform share (the "skim") is configurable (default ~15%), taken at consumption, not pay-in. Revenue is blended — skim, grants, and donations, never skim alone. Target: 25 NGOs with a working deployed tool and 100 active volunteer developers in the first 12 months.

---

## Platform Promise & Disclaimers

A nonprofit coordination layer, explicitly not a service provider with delivery commitments — hence free Discovery, fuel-on-match, open-source-by-default, no public ratings, tip-not-pay.

**Legal posture:** a plain-language ToS — warm in tone, real in force — carries the no-warranty/no-SLA/limitation-of-liability terms (enforceable only inside a contract); the MVP pilot runs on the un-reviewed draft, risk accepted (→ RM-1). ai4good asserts a limited, genuine coordination relationship, not "no contract exists." Volunteers donate time; they are never employees, contractors, or subcontractors of ai4good or the NGO.

### 1. A limited coordination relationship — no delivery obligation
ai4good connects the parties and funds AI compute; no party owes any specific outcome; volunteers donate their time.

### 2. Work is fully open-source (public MIT)
Every repo remains MIT-licensed (a public volunteer portfolio): a repo is born private — Lovable's creation default — and the platform flips it public at setup validation, within the first days of the build; from then on its canonical GitHub visibility is public unless an active, audited founder break-glass hide (REQ-031) requires it to be private. **v1 is public-only:** needs genuinely requiring a closed/confidential codebase are declined at Discovery (→ RM-2) — the hide is an emergency action, never a private-project option. A hide limits FUTURE access through ai4good-controlled surfaces and the canonical repo only; it cannot recall clones or forks, revoke rights in copies already obtained, or provide retroactive confidentiality. Throughout this PRD, statements that projects, pages, listings, showcases, task trees, portfolios, or repos are public describe their normal state, subject only to this exception. This is separate from data sensitivity — a tool handling sensitive *data* is still served with public code and synthetic fixtures, and the NGO connects real Tier-2 data itself post-completion, never into the repo (REQ-004). Never allowed: commercial or closed-source-for-resale work, surveillance tooling, spam infrastructure, illegal use, acceptable-use violations.

### 3. Fuel funds AI usage on this project — not deliverables
Fuel pays for AI compute: NGO Discovery scoping past the free credit pool and volunteer build work. Lovable credits are separate — the NGO pays Lovable directly from its own workspace, never through fuel (REQ-021). Fuel does NOT buy a working tool, a fixed scope, or an outcome; the NGO or volunteer may spend it in full without a viable deliverable, a risk NGOs knowingly assume.

### 4. No SLA, no completion guarantee
No project is guaranteed to reach completion: volunteers may ghost (inactivity → auto-release + rematch, REQ-027), AI may consume fuel without progress, scopes may prove infeasible, NGOs may cancel. Inactivity flows surface stalls early, and the platform always strives to attribute every token consumed to a specific work item (REQ-034) — even when the outcome disappoints, the NGO sees exactly what its fuel was spent attempting.

### 5. What ai4good does promise
- Bounded financial risk: NGO-chosen per-project fuel budgets; nothing charged beyond commitment.
- A transparent volunteer track record: completion credit from day one (→ RM-3), never stars; every repo is MIT from setup validation onward and normally public, so the portfolio is normally visible on GitHub throughout the build — an active REQ-031 hide may interrupt canonical visibility, never MIT licensing or already-distributed copies.
- Open-source IP norms: MIT rights are never revoked — copies and forks already made persist; no lock-in.
- NGO-side vetting (REQ-002, founder-vetted in v1) that gates against fraudulent and abusive demand.
- Escalation paths on stalls: messaging (REQ-015) and notifications (REQ-016); post-completion issue surfacing (→ RM-4; in v1, re-engage via a new project).
- A genuine attempt to ship: motivated volunteers, AI leverage, real NGO problems.

### 6. Progress over promises (stepwise funding by design)
NGOs are steered toward small, frequent funding steps; each fuel run-out is a review of visible work — the PM task view (REQ-026), commit cadence (REQ-010), and the volunteer's next steps — before top-up. Low-fuel blockers (REQ-024) make stepwise funding the path of least resistance.

### 7. Fuel is non-cash, project-scoped credit — it stays yours and working
Fuel is fundable from draft onward — typically at match acceptance, or earlier to continue Discovery past the free pool. It is project-scoped: unused fuel survives a volunteer change (the successor inherits it, REQ-027). On genuine finish or abandonment, leftover credit becomes redeployable NGO general-balance credit that auto-applies at any NGO funding checkout, can satisfy the $50 minimum, with any remainder on card. There is no donation flow and no cash-out or withdrawal — no money-out path means no laundering risk and no ACH/AML/KYC machinery. Nothing is ever silently removed. The funding flow discloses plainly, before commitment, that fuel funds AI work, is not cash-refundable, and that unused fuel stays as credit for the NGO's projects.

### 8. Minimize admin intervention
The target is under 10 minutes of admin time per active project per week at steady state. Automation comes first — only ambiguous cases reach an admin, with one deliberate v1 exception: every marketplace publication is human-reviewed at the triage gate (REQ-023), a compliance stance chosen over automation at pilot volume; manual work is batched, never on a kickoff's critical path, with the wait stated upfront (NGO vetting is batched). Virtual keys mint automatically at kickoff. Loss is bounded by caps plus regular human review (→ RM-5). Lovable setup is volunteer-driven (REQ-021); fuel top-up and key rotation are NGO self-serve; vetting is one audited admin action in concierge onboarding (→ RM-6, RM-7); reconciliation is fully automatic, with corrections conforming to provider-authoritative records and only undecidable drift surfacing. Any feature needing routine admin involvement is weighed against this principle before it is added, and a standing review inventories every manual procedure against the target, automates the automatable, and re-audits whenever a manual step is added.

### 9. Acknowledgment cadence
Explicit, audit-logged acknowledgments:
- **NGO at signup:** the full ToS + Promise (all clauses); required before project creation.
- **NGO at first funding on a project and at every match acceptance:** fuel ≠ deliverable, no SLA, non-cash credit, and data-responsibility for the tier. The first per-project funding names the project and its cap; match acceptance names the volunteer; separate acknowledgments, never reused.
- **Volunteer at first match consent:** one combined account-held disclaimer — limited coordination relationship, open-source-by-default, per-project key use, and a standing data-confidentiality undertaking (when a project handles real data, the NGO's synthetic/anonymized fixtures only, with confidentiality over anything seen). Sworn once, binding before any sensitive-data project; re-prompted only on a material text change.

Later same-project top-ups do not require renewed acknowledgment, while the Promise stays readily accessible. Every acknowledgment records timestamp, IP, and text version; a material text change re-triggers it.

### 10. The deliverable: a tool the NGO can run and keep evolving
The deliverable is not "a repo" but a deployed, running tool the non-technical NGO keeps evolving itself. **There is exactly one delivery model:** the durable home is an AI app-builder (Lovable in v1), evolved via chat after completion; the volunteer builds the first version through Claude Code orchestrating Lovable. Discovery (REQ-004) checks fit — a need requiring ongoing developer maintenance (custom logic or integrations a non-developer cannot evolve via chat) is **declined at Discovery** with plain messaging, each decline recorded for founder review. No second track, no waitlist.

The NGO owns the code outright (portable, no lock-in) and self-maintains via chat for roughly the AI-builder's subscription (~$25/mo); stopping payment keeps a deployable app but ends hands-free chat maintenance. This is set as an expectation at kickoff, with a spend cap so metered edit costs never blindside a non-technical owner.

---

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
- The scope is editable pre-publish; publishing submits it to the triage review, and public listing begins at the reviewer's approval (REQ-023); the NGO is emailed on publish and match.

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

#### REQ-001: User Authentication & Org Membership

Two-layer authorization: a global account type (NGO / volunteer / platform admin) plus a per-NGO role (admin / member, NGO accounts only); "NGO admin" means the admin role in that NGO. NGO users may belong to multiple NGOs; volunteers are individual accounts.

- Sign-in by email/password, GitHub, or Google. A GitHub link is mandatory at volunteer signup; linking runs volunteer GitHub onboarding (REQ-007).
- **Single-seat NGO in v1:** one NGO is one account performing every NGO-side action — funding, acknowledgments, scope edits, volunteer offboarding — without precluding later multi-member support (→ RM-12). Guards: every acknowledgment captures the acting person's name, title, and authority attestation (to bind the NGO, fund non-refundable fuel, accept no-SLA); an org email is preferred and shared credentials are prohibited (acknowledgments are per named human); an audited platform-admin contact-transfer/recovery path moves ownership to a new account, deactivates the old one, and preserves history; one non-login escalation contact is captured at concierge onboarding.
- **Single-dev projects in v1:** one volunteer per project; no collaborator seats or co-volunteers (→ RM-13). (OD-1's "peer volunteer" is a bench reviewer, not a second project member.)
- NGO data is visible only to its own account and the assigned volunteer, plus the platform admin (whose role spans all accounts for operations and support).
- Password reset, email verification, and session management.
- Lifecycle state (active/deactivated) gates every write (REQ-007 AUP) (→ RM-14).

Dependencies: none.

---

#### REQ-002: NGO Organization Profile & Founder Vetting

NGOs sign up (email-verified) and complete an org profile. v1 trust is a founder-vetted flag applied during concierge onboarding; the verification machinery is deferred (→ RM-6). Two tiers:

1. **Unverified** — email-verified (the Discovery floor). May draft projects and run Discovery within 10 credits/day; at zero, fund fuel to continue now or wait for the next day. Cannot publish.
2. **Vetted** — one audited admin action at concierge onboarding. Allowance 30/day. May publish and fund. The default for admitted pilot NGOs.

- The NGO admin creates and edits the profile (name, mission, country, website, logo).
- Email verification precedes any Discovery message; vetting gates publishing, never Discovery.
- **The vetting action is audited:** it records who vetted and when, the NGO legal/display name, a public reference link, the contact's name + title + authority attestation, the evidence type, and a note; unvet/revoke exists; vet/unvet emits the verification-outcome notification through the normal event path (REQ-016).
- **Evidence rule (PII-minimizing):** public evidence is preferred (registry, website, EIN); emailed registration documents have only their metadata recorded and the copy deleted after vetting; no sensitive personal identity documents in v1; nothing may imply a document review that did not occur.
- **No public "verified" claim in v1** — the flag may show only as "founder-vetted" (→ RM-6).
- On vetting, the allowance rises 10 → 30 immediately and on later days; re-vetting never re-raises.
- Only vetted NGOs publish; an unvetted NGO may reach `scoped` with publishing disabled.
- The daily allowance hard-resets to the tier grant once per UTC day, with no rollover.
- A paid "Discovery wallet" is excluded in v1 and v1.5 (→ RM-6).

Dependencies: REQ-001.

---

#### REQ-003: Project Need Creation (free-text intake)

An NGO admin starts a "Project Need" with a free-text problem description, which begins Discovery.

- Intake captures a title, problem description, cause tags, and urgency.
- An optional reference-file upload (screenshot, spreadsheet, blank form, mockup, requirements doc) is available for Discovery and the volunteer, shown with the data-responsibility disclosure, which is hardened once Tier-2 sensitivity becomes known (REQ-032).
- Drafts persist automatically without an explicit save; on submission Discovery begins and the raw intake is retained for audit.

Dependencies: REQ-001, REQ-002, REQ-032.

---

#### REQ-004: AI Discovery Agent (free, rate-limited)

A conversational agent, on Claude Opus, turns intake into a scoped spec over 5–10 structured turns.

**Two-layer money:** free Discovery runs on daily credits — 10/day unverified, 30/day vetted; daily reset, no rollover. Funded fuel is dollar-pegged at the standard platform share. **Routing ("Funded → all-$"):** a funded project's Discovery draws on its fuel and the free pool serves only unfunded projects. At zero credits the NGO can get vetted (→ 30), fund fuel to continue now, or wait for the next day.

- Discovery elicits enough from a non-technical NGO to produce a valid technical scope; the conversation persists and resumes.
- It reads Discovery-visible reference files, may request more mid-conversation, and may cite them; it never receives files not marked Discovery-visible (REQ-032).
- **Structured scope output:** a summary; user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large — never dollars); risk flags; a data-sensitivity tier; a maintainability-fit verdict; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split — which parts are built in Lovable and which are coded through Claude Code. v1 always emits both parts (every match requires an Anthropic fuel kickoff) (→ RM-15).
- **Discovery output is a scope contract:** the source for the dev-authored PRD (REQ-036) and the scorer's gate reference; never decomposed into tasks directly.
- **Data-sensitivity tiers** (Discovery asks what data the tool will handle before assigning one): Tier 0 (no restriction); Tier 1 (ordinary PII — a minimization reminder and NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — synthetic/anonymized fixtures only during build, the NGO connecting real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer). The NGO owns the exposure risk and triage confirms the tier; when unsure, Tier 2; health, immigration, abuse-victim, and financial data are never below Tier 2.
- **Maintainability fit check:** the criterion is who evolves the tool after the volunteer leaves — the maintainer, not the technology. A fit means a non-technical staffer can maintain the live app by chat, with Lovable as the durable home; internal tools (intake forms, CRUD trackers, directories, dashboards) fit by default. A need requiring ongoing developer maintenance — developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable — is declined plainly, with Discovery explaining the limitation and never producing a publishable scope; each decline is recorded for founder review. No waitlist, no second track. Confidential-codebase needs are likewise declined (public-only → RM-2). Sensitive *data* is never a decline reason.
- Scope is regenerable a bounded number of times (each with a logged reason) before admin escalation; regenerations and system-error retries cost zero credits.
- Discovery consumes credits in proportion to the platform cost of each turn. **File attachment never consumes credits and never interrupts** (no pre-ingestion confirm); the daily allowance bounds platform spend. Funded projects bill each turn to fuel, files included.
- **Transparency:** the NGO can see its remaining daily credits and each turn's cost; credits are never silently removed.
- **Free-phase scope guardrails (free credits only):** (1) a scope rule declines/redirects unrelated tasks (general Q&A, document drafting, translations, coding help); (2) a bounded per-conversation turn ceiling, past which Discovery wraps up — generate the scope or start a fresh Discovery; (3) repeated off-topic declines show a plain notice and flag the conversation for founder visibility, never a lockout. **Funded Discovery carries no scope guardrail** — the per-turn cost display and fuel gauge are the controls.
- **Abuse guardrails:** email verification precedes any Discovery message; the daily allowance caps the per-NGO subsidy; funding only removes the wait (same model, no speed change, no allowance raise); a per-NGO admin kill switch exists; free-credit allowances cannot be supplemented by admin grants; there is no platform-wide circuit breaker (per-NGO caps bound exposure). Free credits are never purchased — no stored-value/money-transmitter/escheatment exposure — and live outside the money ledger.

**No dollar estimation in v1:** the scope doc shows the complexity tier with rationale and links Lovable's public pricing where recommended; the NGO picks its fuel amount at funding ($50 minimum), topping up reactively (→ RM-16). The rendered doc plainly explains the tier and start-small advice, maintenance (the NGO evolves by chat for roughly the ~$25/mo Lovable subscription, paid directly, and owns the code), and the data tier (Tier 2 renders fixtures-only).

Dependencies: REQ-003.

---

#### REQ-005.5: Project Lifecycle State-Transition Table

Nine states: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `completed`, `cancelled`. Every transition has an actor, preconditions, side effects, and failure handling. Abandonment/rematch (`in_progress → open`, REQ-027) is a transition, not a tenth state.

> **No `paused` state in v1.** A pause is a support conversation: pre-match, the NGO unpublishes or cancels; mid-build, an admin revokes access with a note, or the project is cancelled. (→ RM-17)

Transition rules:

- Any NGO — including unvetted — can create a draft. Vetting gates publishing, never Discovery.
- draft → Discovery requires submitted intake, an email-verified NGO admin, and Discovery capacity (free credits or funded fuel); otherwise the transition is blocked and the NGO is shown its remedies (verify, fund now, or return later).
- Discovery completion → `scoped` automatically on valid output; invalid output is retried a bounded number of times, then escalated to an admin.
- `scoped` → `triage` on Publish (vetted only). Every publish enters the founder review queue (an AI advisory pass attaches per-check evidence, never a decision — REQ-023); the reviewer either approves → `open`, returns to `scoped` with a reason note (edit and republish re-enters review), or declines → `cancelled` (terminal; only for needs that editing cannot fix). No automated path to `open` exists.
- `open` → `matched_pending_fuel` on volunteer consent to a concierge match (admin-created, binding, no NGO approve/decline; drawn from the candidate pool). The first-match disclaimer is satisfied at the consent click (GitHub is already linked at signup). One match at a time per project; the match log tracks the rest.
- `matched_pending_fuel` → `in_progress` on funding (≥ $50): kickoff fires. If unfunded after 7 days the project returns to `open`, the volunteer is freed and notified, and the NGO gets the funding-expired notice with a restart CTA (REQ-016). The NGO may cancel pre-payment.
- `in_progress` → `completed` when all P0 tasks are done and the repo exists (no formal handoff ceremony — REQ-012): leftover fuel → general-balance credit; keys revoked and the provider workspace archived; Linear membership removed and the final task history preserved; completion credit and first-tool badge recorded. The NGO owns the live app and repo throughout and offboards the volunteer and ai4good's monitoring account self-serve. No tip in v1.
- Abandonment/rematch (REQ-027): after 21 days of no code/task activity, or a manual release, the ex-volunteer's platform-controlled access — repo, keys, Linear — is revoked automatically, never waiting on the NGO; Lovable membership has no removal API, so the NGO removes the ex-volunteer on the platform's prompt. **Remaining fuel stays on the project.** The departing volunteer's assigned tasks return to the backlog; blockers tied to the departed volunteer or their setup are archived or retargeted before the project re-lists (REQ-024); the departure is flagged ghosted vs released-for-cause; the project re-opens with rematch priority.
- `open` → `scoped` ("unpublish to revise") any time before consent; a pending match is notified and released.
- Any pre-completion state → `cancelled` by the NGO: keys revoked; fuel → general balance; the volunteer notified; the thread read-only (terminal).
- Operational blockers (REQ-024) are independent of `in_progress`, never lifecycle states.

Match records track their own states — invited / consented / declined / expired / released — in the match log (REQ-007); an unfunded expiry frees the volunteer for re-match. (→ RM-8)

**Kickoff sequence** (side effects fire in parallel on funding):
- The project's reserved provider workspace+key pair (reserved at checkout, REQ-009) is bound and its virtual key issued, with no ops task.
- A Linear workspace is assigned; unavailability raises an urgent ops task + blocker.
- The repo is established by the NGO and volunteer with no platform-admin involvement (REQ-021, required before completion).
- The Linear workspace is seeded with the one bootstrap task — author the project PRD from the Discovery scope (REQ-036); the build backlog decomposes only after the automated completion gate.
- The funded/kickoff status is announced, the comment thread opens, and the volunteer is notified with setup instructions.

Provisioning failures never invent a sub-state — the project stays `in_progress` and gaps surface as blockers/ops tasks, gating the volunteer only from the pending resource.

---

#### REQ-005: Scope Document & Project Publishing

Discovery output renders as an editable scope document the NGO edits and publishes. Publishing needs no pre-funded fuel (fuel is required only at volunteer acceptance — match-first) but requires triage approval (REQ-023).

- Editable: summary, user stories, acceptance criteria, suggested stack. No fuel-budget section (no v1 dollar estimates).
- **All projects are public MIT (Platform Promise §2):** no visibility choice. Confidential-codebase needs are declined at Discovery (→ RM-2); sensitive *data* is served as Tier-2 fixtures-only (REQ-004).
- A project may stay `scoped` indefinitely; the NGO picks its fuel amount at match acceptance.
- Publishing requires vetted status and no fuel deposit; it moves the project to `triage`, never directly to `open`. Every publish awaits the founder's review decision; marketplace visibility begins only at approval (REQ-023).
- Unpublish to `scoped` any time before consent; a return-to-scoped outcome carries the founder's reason note for editing and republishing.

Dependencies: REQ-004, REQ-023.

---

#### REQ-006: Stripe Fuel Top-Up & Ledger

NGOs buy fuel via Stripe Checkout (one-time, no subscription). The full gross amount credits the specified project or, at the NGO's choice, its general balance. The platform share (15%, configurable, locked per consumption — never retroactive) is recognized at consumption, not top-up: a $100 top-up shows $100 of fuel, and a never-consuming project leaves the NGO its full balance and the platform nothing (Promise §3/§7). Fuel is fundable from `draft` onward; the consumers — the NGO (Discovery, and post-funding the project assistant, REQ-033) and the volunteer (build) — pay the same share, and the ledger labels each consumption kind separately.

**Two funding moments** (either first): (1) Discovery funding — the expedite when free credits run out (it buys continuation, not speed); (2) match funding — the default, at acceptance.

**Match-to-fund flow:**

1. A volunteer-consented concierge match moves the project to `matched_pending_fuel`.
2. **An acknowledgment gate precedes the funding CTA,** naming the volunteer: coordination layer only, no obligation to deliver a finished tool; fuel funds AI compute and may be consumed without a viable deliverable; fuel is non-cash credit, not cash-refundable, and unused fuel remains credit for the NGO's projects; the data tier and NGO data responsibility (Tier-2 = fixtures-only); and the chosen amount is the hard maximum exposure. It is recorded per match with timestamp and IP, and it also carries the Lovable setup reminder where Lovable is recommended.
3. **The NGO picks its own amount** — no prefilled estimate; the complexity tier is context only, with start-small, top-up-stepwise guidance. Minimum $50. **First-fund cap:** with no completed-project history, funding is capped per project (default $200) and per day, with caps rising as history accrues — bounding any fraud/chargeback incident to roughly one cap of compute.
4. There are 7 calendar days to fund the minimum. Payment moves the project to `in_progress` and fires kickoff; no payment returns it to `open`, frees the volunteer, and sends the funding-expired notice with a restart CTA (REQ-016). The no-refund rule is disclosed upfront on the funding screen.

**Acknowledgment cadence:** the full disclaimer at signup (gates project creation); a hard per-project acknowledgment at first funding; a per-match acknowledgment naming the volunteer at first acceptance (never reused across the two); later top-ups carry a passive Promise link only.

**Ledger:** every money movement lands in one auditable ledger and all balances derive from it. **Each project is isolated in its own provider workspace, so the dollar meter runs on the provider's billed cost per project (REQ-009):**
- **Provider-truth (per-project), two speeds:** the provider's reporting **per workspace** is the single source of truth for each project's AI spend and fuel state — the platform monitor prices the provider's per-workspace usage report at the provider's official rate card each minute for the live gauge and the 20/5/0% thresholds (provisional), and the books conform nightly to the provider's billed cost (final; Stripe is the same truth for money-in). A payment's gross amount funds a provider budget of gross ÷ (1 + share rate); the share is recognized only at consumption. Corrections are audited and visible; only undecidable drift needs a human — it never touches the books and is surfaced to the platform admin (REQ-030).
- **The zero-fuel stop executes at the provider:** when the project's provider budget is consumed, the platform sets the project's provider key inactive and the provider rejects further requests (REQ-009); the gateway does not gate — it proxies the provider's rejection. Any per-request usage the gateway captures is attribution telemetry (REQ-034), never the money ledger.
- **Checkout requires reserved provider inventory:** a funding checkout opens only when a pre-created provider workspace+key pair and a workspace slot are reserved for the project (REQ-009); with none available, checkout is blocked BEFORE payment — money is never taken against missing capacity.

Control totals are reconciled and auto-repaired by the same provider-truth rules (→ RM-18). Match expiry (7 days) is automatic.

**Unused fuel — non-cash credit (Promise §7):**

- **Nothing is ever pre-committed to Anthropic:** the platform pays Anthropic only for actual usage (pay-as-you-go), and each project's usage is isolated in and reported per its own provider workspace. Neither cancellation nor volunteer release strands money at Anthropic — the unconsumed balance never left the platform. On cancellation (as at completion) the workspace is archived, freeing its slot; on a volunteer release the workspace persists so the successor inherits it with the project's fuel and spend history intact (REQ-009).
- **There is no cash-out or withdrawal in v1** — no money-out path; only chargeback risk survives.
- Leftover fuel **stays on the project** across a volunteer change.
- Only at completion or cancellation does leftover credit release to the **general balance**, and only after the provider's final cost settlement for the workspace has landed (so late billing can never over-credit): non-cash, with no decay clock, no silent auto-renew, and never silently removed; it auto-applies at any of the NGO's funding checkouts, satisfying the $50 minimum with any remainder on card. The release is a ledger operation under control totals, never a manual balance tweak, and it respects chargeback clawback. No donation flow, manual conversions, or tax receipts.
- No cash refunds of any kind, not even admin-initiated. A genuinely-wronged NGO is made whole in general-balance credit; the only money-out surface is Stripe's dispute process.
- The NGO dashboard shows the general balance as redeployable credit with no expiry.

**v1 top-up is manual** — the 20% warning and 0% blocker drive top-up from the project page (→ RM-7).

**Chargebacks:** on a dispute the platform immediately freezes the NGO (no new funding or matching), cuts the project's AI access, claws back the unconsumed balance, books the consumed portion as loss, and opens an admin review; the audit-logged acknowledgment (timestamp + IP) is submitted as the Stripe dispute evidence. Loss is bounded by no-cash-out, the first-fund cap, and rapid cutoff (→ RM-19); pilot losses are absorbed from operating funds. Collusion / shared payment-fingerprint detection is out of v1 — concierge hand-vetting of every pairing, no-cash-out, and caps are the control (→ RM-20).

Concierge/admin work items (vetting, task-system provisioning, chargeback reviews, incidents) are tracked and prioritized against their service targets.

Dependencies: REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.

#### REQ-007: Volunteer Profile & Concierge Matching

Volunteers sign up with a mandatory GitHub link and build a profile. **v1 matching is concierge-only**; the first cohort is hand-matched (Goal 5 → RM-8). Project pages are public (Platform Promise §2); **volunteers mark interest in-product ("candidate for this project"), and the concierge matches from the interested pool at its own judgment — there is no candidacy window or matching deadline in v1; a project with no candidates stays open under Goal-5 aging.** The organic marketplace apply-flow is deferred (→ RM-8).

- Sign-up via GitHub, Google, or email; **a GitHub link is mandatory at signup — no unlinked volunteer accounts**; a linked account's public GitHub stats (top languages, repository count, contribution summary) populate the profile.
- Profile: skills, causes, availability (hours/week), optional bio.
- **Admin enforce-match (from the candidate pool):** binding; no NGO approve/decline. Two consent gates: (a) the volunteer explicitly confirms, which fires the first-project disclaimer if unsigned — no repo/key/Linear access or Tier-2 introduction before that disclaimer; (b) the NGO acknowledges the match (fuel ≠ deliverable, no SLA, names the volunteer) at funding. Kickoff fires only on funding (match-to-fund); a consented match is kickoff-ready.
- **Concierge match log (admin-only):** records every match event (candidacy, invitation, consent, decline/expiry/release) with timestamps and reason — Goal-5 evidence for opening organic browse; not a public queue; candidacies never surface to the NGO.
- **At first match consent** the volunteer is added to the platform GitHub org with repo-creation rights (REQ-008/021); org membership is never granted at signup. Recorded + audited.
- **Org removal by cause:** (a) voluntary deactivation — membership removed; per-project access on active projects persists; (b) **AUP enforcement:** the admin deactivates the account (lifecycle state gates every platform write), immediately revoking account writes and the project's virtual keys; residual repo/Linear/org access is then promptly removed and audited, and the NGO removes Lovable workspace access on the platform's prompt (Lovable has no removal API); reversal is manual re-enable + key re-issue (→ RM-14); (c) 24-month inactivity — soft removal, as (a).
- The volunteer's dashboard shows their linked GitHub handle and open candidacies.
- **Public listing (read-only v1):** each open project is listed newest-first, exposing its title, summary, complexity tier, needed skills, cause tags, NGO name, and posted date; browse/sort/filter and any public verification badge are deferred (→ RM-8, RM-6).
- (→ RM-8, RM-21)

Dependencies: REQ-001, REQ-005, REQ-008.

---

#### REQ-008: GitHub Integration (Code substrate + dev-internal issue tracker)

Every funded project has a public-MIT repository in the platform GitHub org (all public), created through the volunteer-driven Lovable→GitHub setup.

- **Uniform repo home:** repositories remain in the platform org permanently — no transfer; MIT licensing + Lovable's two-way sync keep the code forkable and exportable; the NGO admin holds admin access from completion onward.
- Access: the volunteer maintains the repo; the NGO admin has read + comment, never push.
- Code events feed cadence stats and task linkage from repo creation; done status comes only from a verified MATCHING code merge (task identifier, PR author, recorded pull), In Progress from explicit self-assignment, and every other transition only from authorized platform actions — never manual edits or unmatched vendor automation (REQ-026).
- **GitHub Issues are dev-internal only** (bugs, refactors, tech debt), never NGO-visible; the Linear task tree is the source of truth for NGO-visible deliverables. No issues are auto-created from the scope doc.
- **Repo seeding:** each repo is seeded with the platform's session guidance and working conventions — the project-binding marker (REQ-009), task-binding conventions (REQ-034), the Linear working norms (one issue in progress, assign before starting, comment when blocked, never move status by hand), commit conventions that link work to its task, a reviewer-agent skill, and env-file hygiene. Platform API credentials are never committed; they are shown once and are separately revocable from the virtual key.
- The platform holds only short-lived, on-demand GitHub credentials; no user PATs.
- **One-time org setup at launch:** the platform and Lovable GitHub Apps are installed org-wide under least-privilege scopes, with credential rotation and a break-glass org-compromise runbook. Org membership grants no repo access by default (explicit adds only); orphan repos matching no active project are monitored; NGO admins are per-project outside collaborators, never members.
- **Continuously-asserted base-permission invariant (P0):** members have no default repo access; repository visibility changes are limited to owners and platform automation; desired repo visibility is EXACT — private before setup validation of the repo URL, public after validation when no active REQ-031 hide exists, and private while an audited hide is active — and scheduled verification continuously remediates to that exact state in both directions, never inferring authorization from private visibility alone (REQ-009 org-namespace guard). The hide exception relaxes nothing else: base permissions, change authority, participant access, secret scanning, and push protection stay in force.
- **Lovable path (v1 default):** no repo is pre-created at funding; the Lovable→GitHub setup is volunteer-driven with no admin involvement, the platform validates and records the resulting repo URL, and unresolved setup is surfaced for follow-up. A recorded repo URL is a hard precondition for completion.
- The seeded README carries the title, NGO name, plain-language summary, license, and project-page link.
- **At completion:** the volunteer drops to read/triage and the NGO admin holds admin — no org transfer; the NGO removes both the volunteer and ai4good's read-only monitoring account from the Lovable workspace.

Dependencies: REQ-006, REQ-007, REQ-021, REQ-026.

---

#### REQ-009: LLM Gateway — Virtual Keys, Caps & Inline Fuel Metering

A platform-controlled LLM gateway sits in the request path; hosting is open (**OD-6**). **Each project is isolated in its own provider workspace (an Anthropic Workspace), and each (volunteer, project) pair is issued its own workspace-scoped virtual key**; standard Claude Code works unchanged. Every volunteer request is authenticated, checked against the key's status and project binding, governed by the injected project-scope policy, and forwarded to the provider — which enforces the workspace's rate limits and rejects a key the platform has set inactive — without ever exposing the real credential; the gateway proxies the provider's response (including the fuel-exhaustion rejection) and captures per-request usage for task attribution (REQ-034). Streaming is preserved end-to-end and gateway latency must not degrade the interactive experience.

**Enforcement placement:** rules that must hold live only on surfaces the platform controls and the volunteer cannot edit — the **gateway** (key confinement, the project-binding tripwire, governance-prompt injection) and the **provider-side controls** (per-workspace rate limits, provider key status, and the coarse spend fuse — all enforced by the provider). Files in the repo and third-party permission settings are never trusted to enforce anything.

**Threat posture:** the project-binding marker detects misuse; it does not prevent it (the marker is copyable). The real bounds are the provider-executed stop (never more than the funded provider budget plus a bounded stopping distance), the workspace's rate limits (never faster than allowed), attribution of every request, and instant revocation. Volunteers are told at onboarding that usage is attributed and reviewed.

- One key per (volunteer, project), shown once, minted at kickoff, never logged.
- Onboarding is minimal (the volunteer supplies the project credential to Claude Code); rejection and setup-failure messaging instructs, never accuses.
- **Provisioning inventory (the provider mints no keys by API):** the platform holds a reserve of pre-created workspace+key pairs, stocked in a batched provider-console routine that sits OUTSIDE every money flow. Checkout opens only when a reserve pair and a workspace slot are available, and reserves the pair; kickoff binds it with no ops task. A low reserve raises an admin task; an empty reserve blocks NEW checkouts, never paid work.
- **Velocity bound and catastrophe fuse (set once at reserve creation):** each reserve workspace gets low per-workspace provider rate limits — the burn-velocity ceiling that keeps the stopping distance small enough for the smallest funded budget — and a coarse monthly provider spend fuse far above any healthy month. Neither is touched during operation; the fuse is a last-resort blast-radius bound, never the ledger or the fuel ceiling. v1 adds no custom gateway usage caps.
- **Project-binding check:** the committed marker rides the session; the gateway verifies it against the key's project on substantive requests (threshold **OD-4**), and a mismatch yields an instructive rejection naming the key's project.
- **Injected governance on every request:** the project-scope rule (decline/redirect unrelated requests) and the never-change-Linear-status rule (REQ-026).
- **Money path — provider truth, two speeds:** each project's spend-of-record is the **provider's billed cost for its workspace** (final; the ledger conforms to it nightly). The live fuel state is provisional: the platform monitor polls the provider's per-workspace usage report each minute and prices it at the provider's official rate card — provisional values drive the gauge and the stop, never the ledger. A payment's gross amount funds a **provider budget of gross ÷ (1 + share rate)**; the share portion is recognized only as consumption occurs (never at top-up), and fuel is exhausted when the provider budget is consumed. The per-request usage the gateway captures is **attribution telemetry only (REQ-034) — never the money ledger and never a request-path gate.**
- **The stop — provider key status, platform-decided:** when remaining provider budget reaches the stopping distance (the worst-case burn during data lag + poll interval + actuation, computed from the workspace's rate limits), the monitor sets the workspace key **inactive at the provider** (Admin API). The provider rejects further requests and the gateway proxies that rejection stating the cause. A top-up lifting remaining above the re-arm line (set above the stop line, so the key never flaps) sets the key active again: the next request passes, no reactivation step. **Stop causes are ranked:** a top-up clears only the exhausted stop — never a chargeback, AUP, revocation, or archival stop.
- **Fuel thresholds (the same monitor):** at 20% remaining the NGO gets a warning blocker, at 5% the volunteer is warned, and at the stop the blocker's state flips to blocking. **The blocker is a status surface mirroring the provider's stop — never an enforcement point.**
- **Watchdog — fail closed:** the gateway passively observes each response's usage and the provider's rate-limit headers. If provider usage data goes stale while traffic still flows, or a key flip fails to confirm, the platform fails closed: the project's virtual keys are cut and a watchdog-failed-closed event notifies the platform admin (REQ-016) — no paging integration is used. This is a credential-status action — never a money computation in the request path. Cumulative fuel math never resets at a month boundary; only the catastrophe fuse resets, by design.
- **401 semantics:** the gateway's own rejections are externally flat (no revoked-vs-nonexistent distinction); the one exception is a proxied fuel-exhaustion rejection, which states its cause because that caller must act; rich diagnostics appear only on the authenticated dashboard.
- **Revocation is instant and self-serve:** an NGO "revoke access now" action and admin enforcement cut access immediately, with an instant replacement key; all project keys terminate at completion (REQ-012), abandonment release (REQ-027), and AUP deactivation (REQ-007). The project's provider workspace is archived at completion or cancellation (revoking its keys and freeing a workspace slot); on abandonment the workspace persists so the successor volunteer inherits it.
- **Privacy invariants (load-bearing):** request bodies are inspected transiently and never persisted; the ledger holds token counts and metadata only; any derived origin/mismatch signal is stored as a score or boolean, never paths or content.
- **Key-leak hygiene (v1 = prevention, not detection):** env files are ignored by default and the platform key pattern is registered with GitHub secret scanning + push protection (→ RM-22); the org-namespace guard keeps member repos private until setup validation (asserted by the REQ-008 invariant); the founder's daily review compares org repos against active projects.
- **An escalation ladder is documented, not built, in v1** (→ RM-9).

Dependencies: REQ-006, REQ-024, REQ-034, REQ-012/027/007 (key-termination hooks). Only provider surface: the model API through the gateway.

---

#### REQ-010: Project Page (single view) & Cadence Stats

One **public page** per project, whose public project-status PROJECTION is identical for every viewer — NGO admins, the assigned volunteer, platform admins, and logged-out visitors. The platform surface is PM/coordination; the dev workflow lives on GitHub — there is no separate "developer view."

- The public projection comprises the expressly public surfaces of this page: project identity, the full task tree (Platform Promise §2), activity, the blocker signal, the Q&A log, reference-file metadata, fuel/Lovable status, cadence, and repo-derived signals — identical for every viewer. Role-gated communication content and action controls sit OUTSIDE this equality rule and follow their owning requirements: the comment thread (REQ-015, participants only), reference-file downloads (REQ-032), and the NGO project assistant (REQ-033) — an interactive bot interface surfaced **only to the project's NGO account**, never to the volunteer, platform visitors, or the public.
- The page identifies the project (title, NGO, status, assigned volunteer, repo URL with a plain-language empty state while setup pends, complexity tier, cause tags).
- **The task tree is the primary content:** the page must convey task hierarchy, each task's status, the work currently underway, and overall progress, where progress reflects completed P0 tasks against all P0 tasks (from the tree, never GitHub issues).
- **Activity is shown in plain language** tied to task titles, never raw PR/commit jargon.
- Reference files (REQ-032) are listed with descriptions; downloads are restricted to the assigned volunteer, NGO admins, and platform admin despite the public repo; the NGO can add/remove them before completion.
- Resolved clarifications (REQ-024) persist as a lifetime Q&A log recording who asked, who answered, and when; an unresolved clarification is clearly flagged.
- The fuel balance shown reflects real-time provider truth and stays reconciled with Anthropic's authoritative usage reporting.
- **No GitHub Issues, PR lists, or raw commit logs appear on the page** — the repo link is the only GitHub touchpoint.
- **Cadence stats (v1 minimal):** liveness is measured from **both PM task progression and commit activity** (not commits alone) — recent movement versus the prior period, and time since the last of either — with a stale-activity indication during build (→ RM-23). Promise §6's two progress signals (the task view and commit cadence) stay intact.
- **Repo-derived activity signals (in-progress onward):** where a project has a live repo, the page conveys informational build signals — the language/stack in use, time since last activity, the assigned contributor, the license, and completion-readiness — modeled on a code-host's project view. **Popularity metrics (stars, forks, watchers) are never shown** — reputation is completion credit, not popularity (Promise §5).
- **Both funding states are shown distinctly (REQ-021):** the Claude Code fuel balance and the separate Lovable-credit status — Lovable setup before connection, then Lovable status, workspace access, and top-up after — so the two purses are never conflated; the Lovable-credit status is read from Lovable via ai4good's monitoring account, not hand-entered (REQ-021) (→ RM-58).

Dependencies: REQ-008, REQ-009.

---

#### REQ-011: Public Project Listings (v1 read-only; browse/sort/filter machinery v1.5)

v1 is a public, read-only listing of open projects (newest-first) with exactly one volunteer action: marking interest ("candidate for this project"), which feeds the admin match log only. Matching is concierge (REQ-007); there is no NGO-facing apply queue, no filters/sort/scoring, and no NGO accept/decline (enforce-match). No algorithmic ranking or NGO-satisfaction weighting in v1.
- **Open-project card** (pre-build, no repo yet): title, summary, complexity tier, needed skills, cause tags, NGO name, and posted date — static attributes only, with no live stats, no dollar figure, and no candidate/interest count (candidacies are admin-only).
- **In-progress showcase** (public): a project under build surfaces a live card modeled on a code-host's project view — task-tree progress, cadence (task progression + commit activity), the language/stack, time since last activity, the assigned contributor, and the blocker chip (noninteractive; count + `info / warning / blocking` severity only — REQ-024) — so the public sees what ai4good is building. The open-project card stays identity-only (no blocker signal, no liveness beyond the posted date). Browse/sort/filter machinery stays v1.5; **popularity metrics (stars/forks/watchers) are never shown**.
- (→ RM-8, RM-21, RM-24)

Dependencies: REQ-007.

---

#### REQ-012: Project Completion

A project completes when all P0 tasks are done. Because Lovable is enforced and git-bound, the NGO already owns the live app and repo throughout — there is no delivery or transfer, and **no formal handoff ceremony in v1**: the completion checklist gate, sign-off/acceptance flow, guided-maintenance walkthrough, rejection loop, live-URL gate, and post-completion attribution + health are all deferred (→ RM-62).

- The volunteer marks the project done once all P0 tasks are complete; open GitHub Issues never block it. A P0 task reaches done only through verified code merge, so every done task carries shipped code.
- On completion the project enters `completed`: leftover fuel is released to the NGO's general balance as non-cash credit (REQ-006); the volunteer's completion-credit event is recorded with a private confirmation (→ RM-3); all project virtual keys terminate and the project's provider workspace is archived (REQ-009); Linear membership is removed and the final task history is preserved (REQ-026).
- **Offboarding is self-serve:** the NGO removes or downgrades the volunteer's repo and Lovable access whenever it chooses — the repo stays in the platform org with NGO admin, and MIT + two-way sync already make the code the NGO's to fork or export. In the Lovable workspace the NGO removes both the volunteer and ai4good's read-only monitoring account (REQ-021).
- The deliverable is a deployed, running tool the NGO owns and evolves via chat (Promise §10); the live URL is captured as project metadata (auto from Lovable), not gated.
- No tip flow in v1 (→ RM-11).

Dependencies: REQ-006, REQ-009, REQ-021, REQ-026.

#### REQ-021: Lovable Integration — Durable Home + Claude-Code-Orchestrated Build

Lovable is the deliverable vehicle and the NGO's durable maintenance home: after completion the non-technical NGO evolves the live app via Lovable chat, no developer needed. During build, Claude Code is the volunteer's single entry point — it orchestrates Lovable for the UI and handles backend/logic/tests/docs — while ai4good metering, scope enforcement, and audit stay authoritative. Every project uses Lovable (→ RM-26).

**Orchestration posture:**
- Lovable is an external vendor surface outside platform control, driven from the volunteer's Claude Code session via Lovable's own MCP; a break degrades to in-browser manual work, never a dead build.
- Primary path: Claude Code drives Lovable; on breakage the volunteer drives Lovable in-browser; both commit to the shared repo. UI work spends the NGO's Lovable credits; Claude Code work burns fuel. UI-heavy and backend-heavy mixes are both fine; only a pure-backend tool with no Lovable app fails the fit check and is declined at Discovery.
- Orchestrated calls bill the NGO's workspace, are audit-logged, and attribute to the volunteer, who connects their own account; the volunteer's spend is bounded only by the NGO-set credit cap, native to Lovable — no platform-side caps.
- After completion the NGO owns the workspace outright, with no dependency on orchestration or Claude Code.

**Why NGO-self-provisioned:** Lovable exposes no per-project metering API and no BYOK, and bills per workspace; NGO self-provisioning gives zero infrastructure dependency, no markup, and day-one NGO ownership. There is no ai4good connector inside Lovable — Lovable never talks to ai4good.

**Lifecycle:**
- Discovery recommends Lovable with rationale and no project-specific dollar estimate; the scope doc states that Lovable is paid directly, never from fuel, and carries the standard ~$25/month Lovable subscription disclosure (REQ-004, Promise §10) — the one dollar figure it must show. The NGO is reminded before kickoff to set up the workspace and invite the volunteer.
- Setup is mandatory at kickoff and self-served with no platform-admin involvement and no NGO GitHub account:
  1. **NGO (account + billing only):** creates the workspace, funds it, sets the volunteer's credit cap, and invites two members — the volunteer as a **build-only member with no billing access**, and **ai4good's read-only monitoring account** (no billing or admin access; it can only observe, surfacing Lovable credit consumption and workspace state to the platform).
  2. **Gate:** both memberships are validated before the volunteer starts.
  3. **Volunteer (all technical setup):** their session provisions the project, enables its database, connects GitHub sync (repo in the platform org), and injects ai4good's conventions and the reviewer skill so Lovable's own agent follows them.
  4. **Platform (validation):** repo in the org, flipped public after validation, GitHub App installed, name collisions surfaced, and the volunteer's repo permission reduced to the standard role so collaborators cannot be added unnoticed — then both parties are notified.
  - A workspace-level connector a specific project needs (for example, payments) is added by the NGO owner.
- The volunteer's Lovable access is **build-only**: they build, connect GitHub, and publish, but the workspace subscription, top-up, and payment method are owner-gated and never visible or accessible to the volunteer. The NGO can cap the volunteer's Lovable credit consumption natively.
- Stuck parties raise clarifying blockers with standard aging; an admin is involved only after prolonged mutual silence. The volunteer works locally immediately after setup, with no further approval.
- Lovable credit status is **read from Lovable programmatically** via ai4good's read-only monitoring account (→ RM-58), with a manual report as fallback; low or exhausted is surfaced in-platform and prompts the NGO with a direct route to Lovable top-up. Top-up itself stays a Lovable billing action — no programmatic purchase (→ RM-27).
- At completion the NGO keeps the workspace and billing alone. Because the Lovable MCP exposes no member-management, offboarding is manual: the NGO removes both the volunteer and ai4good's read-only monitoring account, with the platform prompting and confirming. The repo stays in the platform org with NGO admin access (no transfer) and GitHub sync continues.

**Acceptance criteria:**
- [ ] Discovery output recommends Lovable with rationale and no project-specific dollar fields; the rendered scope doc carries the paid-directly disclaimer, the standard ~$25/month subscription disclosure, and no project-specific dollar estimate or fuel-budget figure.
- [ ] Setup is required at kickoff (no opt-in/out) and resolves only on platform validation; a failed check surfaces the specific failure and fix and the item stays open.
- [ ] The setup guide documents the steps; the guide and project page let the parties transfer the required setup information accurately (scope summary, volunteer email, an optional commit-reference snippet — best-effort only, since status moves on PR merges, never parsing), with a validated paste-back and who-acts-next progress.
- [ ] Lovable credit status is pulled from Lovable (with a manual fallback), surfaces low/exhausted, notifies, and offers a direct route to Lovable top-up. No mail parser in v1.
- [ ] Repo-creation permission is granted at volunteer onboarding, not per project.
- [ ] The volunteer is invited at a build-only role; the NGO's Lovable billing (subscription, top-up, payment method) is never accessible to the volunteer, and the NGO can cap the volunteer's credit consumption.
- [ ] The NGO invites both the volunteer and ai4good's read-only monitoring account at kickoff; both memberships are validated before the volunteer starts.
- [ ] At completion the NGO removes both the volunteer and ai4good's read-only monitoring account (no MCP member-management path exists); the platform prompts and confirms.

**Non-goals (v1):** no Lovable subscriptions bought for NGOs; no per-task metering or attribution of Lovable credit consumption (only workspace-level status is read); Lovable cost is never debited from fuel; no credit reselling (→ RM-28); credit visibility is read-only via ai4good's monitoring account — ai4good has no Lovable billing control (no charging, no plan changes).

---

#### REQ-023: Platform Triage Gate (compliance review before marketplace)

Every project passes a compliance gate between scope completion and publication, catching policy violations before volunteers see it. **v1: every publish is decided by the founder-reviewer; an AI advisory pass assists but holds no authority.** Nothing reaches the marketplace without a recorded human decision. The autonomous screener is deferred (→ RM-64), where the v1 review records become its calibration dataset.

**Advisory pass (evidence, never authority):** at publish, a structured AI review evaluates the final scope snapshot on six dimensions — open-source alignment (all projects public MIT; commercial or closed-source-for-resale work is prohibited; a confidential-codebase need is flagged categorical); nonprofit purpose against the vetted profile; scope reasonableness against the complexity tier (abusive scope caught here); acceptable use (no surveillance, spam, illegal use); data-tier correctness (Tier-2 requires a fixtures-only plan); and Discovery risk flags. It attaches versioned per-check evidence to the queue item. It never transitions project state, never emits an approve/decline recommendation (evidence only), and its unavailability never blocks review — the reviewer proceeds unaided.

**Acceptance criteria:**
- [ ] Publishing routes every project into the review queue, never directly to the marketplace; the project stays publicly invisible until a human decision.
- [ ] The reviewer has exactly three actions: **approve → `open`**, **return to `scoped`** (a reason note to the NGO; editing and republishing re-enters review and stays invisible; prior notes visible), or **terminal decline** (non-remediable — cannot be edited and resubmitted).
- [ ] Every decision is recorded: reviewer, timestamp, decision, reason, per-check dispositions, policy version, advisory output + version (or its recorded absence), data tier, scope snapshot — the record doubles as RM-64's evaluation dataset.
- [ ] Queue items expose their age; the internal review target is end of the next business day (an ops target, never an NGO-facing SLA). v1 names no backup reviewer — the queue pauses during founder absence, a knowingly accepted limit.
- [ ] A break-glass unpublish recovers an erroneous approval (REQ-031).
- [ ] NGO copy: every publish shows an "under review" state with no formal SLA; marketplace visibility begins only at approval.

---

#### REQ-024: Project Blockers (operational health, independent of lifecycle)

Blockers are independent of lifecycle status, separating "ghosting" from "waiting on someone else"; they feed reputation and escalation and never reduce public completion credit.

**Types (v1):** clarifying question (dev-raised, manually resolved); awaiting NGO review; external dependency; GitHub collaborator needed (a rare edge case, resolved when the NGO confirms access); Lovable setup pending (auto-resolves on validation, REQ-021); fuel top-up needed (auto-raised at the 20% warning and 0% blocking, auto-resolving above 20%); and Lovable credits (status read from Lovable, NGO-resolved) (→ RM-5). An auto-raised type keeps one unresolved instance per project, upgrading its severity in place when the condition worsens rather than creating a duplicate; manual types may have several open.

**Notifications and aging:** raising a blocker notifies the NGO admins (a blocking fuel blocker also notifies an admin); resolution notifies both. An unresolved blocker gets a reminder at 48h and escalates to an admin at 7d, with the project flagged at-risk; Lovable-setup aging notifies the NGO and volunteer, reaching an admin only after 7d of mutual silence. Open blockers auto-archive at completion.

- The volunteer raises a blocker (type, severity, title, body); resolution requires a note; the conversation is the blocker's Q&A plus the project comment thread (no separate chat channel). A manual catch-all type carries a per-instance action-owner, and choosing admin/ops creates the ops item immediately. Every NGO-facing free-text surface of a blocker carries the Tier-1/Tier-2 warning: never paste beneficiary data, passwords, keys, or live credentials.
- Clarifying questions are first-class, project-level or task-anchored (topic, what was tried, what is needed). While one is unresolved, its task is marked awaiting NGO clarification and the volunteer may continue other tasks. Resolved pairs persist in a lifetime Clarifications log (who asked, who answered, when).
- A blocker's presence, count, and highest severity are observable on the project page, the in-progress showcase card, and the NGO dashboard; the dashboard aggregates them by severity then age with prominence past 48h; cadence stats note when work is blocked on NGO action or fuel. On the showcase card the signal is a noninteractive chip carrying count and a public severity from the enum `info / warning / blocking` — never a blocker's type, title, body, or acting party. **The open-project marketplace card carries no blocker signal** (it stays identity-only; blockers on an `open` project are visible on its public project page and the NGO dashboard).
- **Release cleanup:** when a project returns to `open` on abandonment/release (REQ-005.5), blockers tied to the departed volunteer or their setup are archived or retargeted before the project re-lists — no stale or ownerless blocker survives onto any public surface.

**Acceptance criteria:** raising and resolving work for both roles; fuel blockers auto-raise and auto-resolve at their thresholds with in-place severity; Lovable-credit blockers follow the NGO-reported status; notifications and 48h/7d aging fire as above; blockers auto-archive on completion; all surfaces reflect current state.

---

#### REQ-025: Mid-Build Scope Additions (structured CR surface deferred to v1.5)

**v1 is informal:** nothing interrupts the volunteer and nothing auto-assigns; the volunteer is the sole work-acceptance authority (enforced socially at concierge scale, not mechanically). The NGO raises ideas in the comment thread. Protocol:
- Nothing enters scope until the volunteer accepts in-thread AND creates the linked task — before material fuel is spent (REQ-034).
- An accepted addition is either top-priority (completion-blocking) or explicitly NGO-acknowledged as optional and non-blocking before completion.
- One active scope-addition discussion per project; further asks wait or become a follow-up project.
- The NGO is told that additions consume existing fuel, may extend the timeline, and are volunteer-optional; never paste beneficiary data, secrets, or credentials.
- An addition that changes data sensitivity, AUP/compliance posture, or open-source fit pauses for founder re-triage before work starts.

(→ RM-10, RM-29)

---

#### REQ-026: Platform Task Management (Linear as system of record)

Linear is the task system of record: real-time signals per event and per actor; an enforceable read/write split; no merge conflicts under parallel worktrees; a hosted backlog that exists before any code is cloned; and per-volunteer attribution.

**Model (two trees):** task state lives in Linear — one free workspace per project carrying TWO trees. The **PM tree** holds requirement-level items deduced from the Discovery scope doc (seeded at kickoff alongside the PRD bootstrap item); it is the ONLY tree the NGO-facing panel and assistant read (via the platform's read-only mirror), and the only tree carrying NGO-facing authority. The **dev tree** holds the volunteer's generated decomposition (REQ-036) and working items; it is the volunteer's working space — its state is working data, never NGO-facing authority. Volunteers and their agents (under the volunteer's identity) read, self-assign, and comment. **PM-tree status authorities, no others:** an explicit pull (via the Skill) authorizes In Progress on a requirement item, and only verified completion — the requirement's linked dev work merged and its acceptance evidenced, recorded against the pull — authorizes Done; every other PM-tree status change is reverted. Dev-tree items use Linear's vendor-native mechanics as shipped, including the GitHub integration's merge-to-Done. The NGO never touches Linear and the panel is its only Linear-visibility surface. GitHub Issues (dev-internal code work: bugs, refactors, technical debt — never deliverable or scope authority; anything required for P0 acceptance must be represented in Linear) and Linear comments stay dev-internal; NGO conversation stays on the comment thread, except a task-anchored NGO comment is relayed onto its task for the volunteer (REQ-015).

**Ownership asymmetry (deliberate):** delivery infrastructure is NGO-owned (the Lovable workspace, the repo); coordination infrastructure is platform-owned (Linear, the gateway) and never transfers. After completion the workspace sits dormant at $0 and the final tree is preserved with the repo. Any paid tier is paid by the platform.

**Provisioning:** each project is assigned its Linear workspace at kickoff with no manual step on the kickoff critical path — the volunteer is invited and the PRD bootstrap task is seeded (REQ-036). Provisioning that cannot complete surfaces as an external-dependency blocker rather than stalling silently or inventing a sub-state. The pilot runs on Linear's free tier, risk accepted (→ RM-30).

**Decomposition (from the gated PRD):** kickoff seeds the PM tree (the scope doc's requirement items + the bootstrap item) and nothing on the dev tree; once the dev PRD clears the gate, the platform drafts and pushes the DEV tree — one parent per story, one sub-issue per acceptance criterion, top priority, each dev item carrying a relation to its PM requirement. Briefs must be session-sized and dependency-ordered (blocking relations encoded), the precondition for pull-model correctness and per-requirement burn data (REQ-034). Coordinator review is a pilot spot-check.

**Pull-based workflow:** the pull operates on the PM TREE — pulling a requirement item is the commitment signal (marking it in progress) and binds attribution to it; volunteers pull the next unblocked requirement and the coordinator never pushes. Within a pulled requirement, the volunteer works its dev-tree items with vendor-native tooling at their own discretion. Norms: one PM requirement in progress (one per worktree if parallel), pull before starting, comment when blocked, never move PM-tree status by hand. Onboarding: match → invite → browse the PM tree (before cloning anything) → the first work session connects task access → the first pull activates attribution. An in-progress issue with no branch activity for N days raises a coordinator flag proposing return to the backlog. Agentic loops are permitted (handling is loop-agnostic); the template ships a reviewer agent; a loop degrades on auth failure and its PRs never auto-merge. **[DECISION: OD-1 — reviewer identity + merge authority, per project.]**

**Write authority (real-signals enforcement, PM tree):** volunteers and agents read, comment, and pull — never change PM-tree status directly. In Progress flows from the explicit pull; Done flows from verified completion; the platform creates PM items (kickoff seeding; v1 scope-addition items are volunteer-created, REQ-025), invites, reverts, and cancels. The NGO holds no Linear seat. Vendor permissions cannot allow pull-and-comment while blocking status changes, so PM-tree enforcement is detect-and-revert: any PM-tree status change not backed by its authority is reverted with an explanatory comment and a low-tone notification to the volunteer. The dev tree is exempt — its vendor-native automations run as shipped and are never reverted. Agent actions attribute to the volunteer, who owns them.

**Lifecycle hooks:** accepted scope additions are volunteer-created linked tasks (REQ-025) (→ RM-10). At completion, lower-priority not-started issues cancel while top-priority never auto-cancels (completion requires all done, REQ-012); volunteer membership is removed, the final tree is preserved with the repo, and the mirror goes read-only. On abandonment, the ex-volunteer's in-progress issues return to the backlog.

**Acceptance criteria:**
- [ ] NGO-visible task state derives solely from observed PM-TREE Linear events and platform lifecycle actions, and is public; dev-tree state never reaches an NGO surface.
- [ ] A Linear workspace is assigned at kickoff with no manual step on the critical path; if none can be assigned, an external-dependency blocker is raised.
- [ ] Kickoff seeds the PM tree (scope requirements + bootstrap); post-gate decomposition pushes the dev tree's session-sized briefs with blocking relations (pilot spot-check), each related to its PM requirement.
- [ ] PM-tree In Progress flows only from the explicit pull; PM-tree Done flows only from verified completion; detect-and-revert enforces both and notifies. Dev-tree items use vendor-native mechanics (incl. merge-to-Done), exempt from revert.
- [ ] The status panel conveys current work, the PM-tree hierarchy, and recent activity. Panel scope beyond that and NGO-introduction mechanics: **[DECISION: OD-2.]**

---

#### REQ-028: ai4good Claude Code Skill (the volunteer's single operating surface)

An ai4good-shipped Skill makes the volunteer's local Claude Code the default operating environment — conventions, helper commands, and session governance as installable, auto-updating agent code shipped through the standard Skill channel (written docs drift out of date; a Skill re-applies itself every session). One-command install; it auto-runs in every session opened in an ai4good repo.

**v1 scope:**
- One-command install, open-source (MIT). Non-secret project config is seeded at repo creation; one login per project. Three separately-revocable credentials: the platform token (blockers, comments, fuel), the task-system OAuth (backlog), and the gateway key (metered LLM traffic).
- Session bootstrap loads the scope summary, status, in-progress tasks, unresolved blockers, recent NGO comments, and fuel runway; verifies task access; reads the binding; and prints a concise session banner (project, active task and its age, fuel, unread comments). (→ RM-10)
- Task binding + degradation (load-bearing): pulling a PM-TREE REQUIREMENT binds it per worktree, and that binding rides every metered request as the attribution mechanism (REQ-034) — attribution is requirement-level; dev-tree items are never bound. **The Skill enforces pull-then-complete Skill-locally, at the PM-tree level:** before substantial work, an explicit choice — pull a requirement or enter the exploration bucket — so every session carries attribution context, and exploration turning into implementation forces binding the matching requirement; the enforcement lever is the Skill's OWN guided assistance only — the platform and gateway never block a metered request for attribution reasons (REQ-034). Within a pulled requirement, dev-tree work needs no Skill ceremony. Completion is an explicit dev act at the PM level: the dev invokes the Skill's complete flow, which verifies the requirement's completion evidence (its dev-tree work merged, its acceptance evidenced) and records the verified completion that flips the PM item (REQ-026); dev-tree leaves flip on merge via the vendor integration, no Skill act involved. On task-system auth failure the session degrades without stopping — updates queue locally and surface at session end, and binding floors to unattributed (an attribution floor for the auth-failure path — never a metering or access bypass: fuel, project binding, and revocation controls (REQ-009) remain in force).
- Helper commands: pick the next task (highest-priority unblocked, full context shown, self-assigns on confirm); fuel status (balance, burn rate, projected runway); list blockers (with suggested actions); raise a task-anchored clarifying question; a completion-readiness check (top-priority done, README + runbook, repo and deployment URLs set, work pushed); and disable/enable. Reference files download from the project page. (→ RM-31)
- Branch/commit conventions (task identifiers + linking keywords) are auto-applied so the GitHub integration links work: a branch/PR link corroborates the pulled task (it never independently changes status — In Progress comes from self-assignment, REQ-026), and a verified matching merge marks Done (the only done-path). The volunteer can override anything the Skill generates. A manual fallback always exists — the Linear app and project page cover every behavior, and a disabled Skill still operates, with attribution degrading to unattributed and norms arriving via the injected prompt.

**Lovable orchestration (v1 core):**
- Orchestration is run by the volunteer, not the Skill: from their Claude Code session the volunteer drives Lovable over Lovable's own MCP (REQ-021), choosing per task between building locally and delegating to Lovable — Discovery's build split is guidance, never binding. After a delegation they pull, test, and iterate, or fix locally.
- No Skill-side budget guardrails (no per-task caps, no burn estimates, no refusal thresholds): the volunteer's Lovable spend is bounded by the NGO-set credit cap, native to Lovable (REQ-021), and surfaced by the workspace-level credit status the platform reads. Orchestrated calls are audit-logged.

(→ RM-32, RM-33)

**Acceptance criteria:** install works end-to-end; bootstrap auto-runs with the banner; binding follows self-assignment per worktree; auth failure degrades without blocking; helper commands work; conventions apply with override; disable/enable persists; and docs cover install, configuration, troubleshooting, opt-out, and the disabling implication.

#### REQ-027: Abandonment / Rematch (volunteer ghosts mid-project)
Adds a release + rematch edge (in_progress → open) plus a partial-fuel rule.
- Triggers: inactivity (no repo activity AND no task movement) — a reminder at 14 days and auto-release at 21 days — or a manual release by either party, with a reason. The clock runs only while in_progress.
- A release revokes all platform-controlled ex-volunteer access (repo, AI keys, Linear) as its own action, with no dependency on suspension; the NGO removes Lovable workspace access on the platform's prompt (Lovable has no removal API); in-progress tasks return to the backlog; done work and history are preserved; and remaining fuel STAYS on the project — no refund.
- A ghosting (timeout) is recorded distinctly from a release-for-cause; ghosting affects the outreach/reputation signal, and a for-cause release carries no automatic penalty.
- The project re-opens with concierge rematch priority, the NGO is notified, and prior matches are closed in the match log. Notifications: reminder, released, rematch available (REQ-016).

#### REQ-030: Operations, Incident Response & Admin Correction Tooling
Names the operating model. (The audited-reversal requirement is removed — undoing enforcement is an ordinary admin ability.)
- An on-call and escalation model is named (the founder in the pilot, with a documented tree); incidents are first-class ops items.
- The one v1 dashboard is the money dashboard (funding, consumption, platform share, reconciliation, chargebacks), founder-read daily (→ RM-34).
- No general monitoring framework in v1 — no job heartbeats, invariant pagers, or operator paging (→ RM-63); detection is the daily dashboard read, error-spike alerts (NFR), and automatic reconciliation, plus one named fail-closed interlock: the REQ-009 gateway watchdog, whose failed-closed event notifies the platform admin through REQ-016 — no paging integration exists. Risk accepted at pilot scale: a silently-failed job or money-path bug is caught by the daily read or a user report.
- **Runbooks (v1 = three):** backup restore within the 4-hour objective; gateway real-key rotation plus mass virtual-key revocation; and Lovable outage fallback. One-page cards cover credential-compromise break-glass, PM-tool outage degraded mode, and chargeback spike. The credential-compromise card must freeze reference-file access, start the breach clock (discovery time, with counsel/statutory assessment if PII may be exposed), and reconcile Stripe against the fuel ledger for the window before unfreezing money movement. (→ RM-35)
- **Money corrections are fully automatic — no correction UI, no human step.** Reconciliation auto-conforms the ledger to provider truth (Stripe wins money-in including top-ups and chargebacks; Anthropic wins AI spend; pairing arithmetic resolves internal gaps), and every correction is balanced and traceable to its authoritative source, posting only through the one guarded, idempotent, audited function, with direct ledger writes revoked from every role. The founder gets visibility, never approval: corrections show on the money dashboard, and large drift additionally notifies the platform admin (REQ-016). **Refusal-to-guess backstop:** undecidable drift (provider data missing or self-contradictory) is never auto-resolved — the books are untouched, it surfaces on the money dashboard, and the platform admin is notified (REQ-016).
- Account deactivation (v1 AUP): a documented recovery — manually re-enable and re-issue keys (→ RM-14).

#### REQ-031: Content Moderation, Takedown & Secret Scanning
v1 needs no automated takedown surface; the one real exposure — secrets in public repos — is covered.
- v1: secret scanning and push protection org-wide; a founder **break-glass** emergency-takedown action (not a private-project feature). Break-glass is an audited, reversible VISIBILITY switch, never a lifecycle transition: one action hides the project from every public surface — the marketplace listing, the showcase card, and the public project page — and hides the repository when one exists. The project keeps its lifecycle state while hidden; the follow-up (return to the NGO, cancel, or un-hide) flows through the normal paths, and un-hide is the same audited action in reverse. It also recovers an erroneous triage approval (REQ-023).
- The audited hide remains active across lifecycle transitions until founder reversal and applies whenever a repo exists — including one created or validated after a repo-less project was hidden; un-hide restores each controlled surface to the visibility appropriate for the project's CURRENT lifecycle state. Reversibility refers to controlled surfaces and canonical-repo visibility only — never prior copies, forks, granted MIT rights, or retroactive confidentiality (Promise §2). Secret scanning, push protection, and participant repo access continue unchanged while a hide is active.
- (→ RM-36)

#### REQ-032: Project Need Attachments (NGO reference files for Discovery + build)
The NGO uploads reference files (screenshots, sample forms/data, mockups, requirements PDFs); Discovery reads them multimodally and the volunteer uses them at build.
- Files can be uploaded at intake, during Discovery (the agent may ask), or from the project page pre-completion. Supported types include PDF, images, CSV/TSV, TXT, and DOCX/XLSX, under per-file and per-project size caps.
- Access is limited to the project's NGO account, the assigned volunteer, and the platform admin (the repo is public but the files are restricted); access is via short-lived authorized links and the UI never holds storage credentials.
- PII is governed by disclosure: the NGO is told to provide redacted/sample data only, not real beneficiary records, and that ai4good and the volunteer will see the files. Tier-2 adds a hard acknowledgment restating fixtures-only — the NGO connects real data itself, in its own environment, after completion. There is no upload scanning in v1; the NGO owns the risk per the data-responsibility acknowledgment (→ RM-37).
- Discovery may cite files in its questions and the scope doc; file names and the NGO's one-line descriptions ride its context. File reads never consume credits and never interrupt; on funded projects they consume fuel like any turn.
- The volunteer downloads files from the project page (→ RM-31); downloaded files are kept out of the repo's normal contents (an accidental-commit residual is accepted at pilot scale, mitigated by secret scanning and the fixtures-only rule).
- The project page lists reference files with their metadata (name, type, uploader, description); deleted files remain recoverable and deletion history remains auditable; uploads and deletes are audited.

#### REQ-033: Post-Discovery NGO Project Assistant (funded, fuel-metered)
At the project's first kickoff (first entry into `in_progress`), the Discovery chat reframes as a read-only project assistant (status, open blockers explained, recent progress summarized, fuel runway).
- It is available on the project page from the project's first entry into `in_progress` until the project enters `completed` or `cancelled` — including any intervening post-kickoff nonterminal state (abandonment/rematch, re-opened) — and is surfaced **only to the project's NGO account** — the bot interface never appears for the volunteer, platform visitors, or the public; at a terminal state the bot interface ends while the project's static task and activity surfaces remain; unfunded or pre-scoped projects have no assistant, and there Discovery is the only NGO↔AI chat.
- It is fuel-metered with no free credits: the per-turn cost is shown, remaining fuel is visible, and at zero fuel it stops accepting billable requests and offers top-up.
- It is strictly read-only over a snapshot of tasks, blockers, fuel, and activity: it cannot set status, resolve blockers, accept scope additions, or move money. A scope or priority ask is answered by explaining the REQ-025 protocol, optionally pre-filling a draft the NGO submits.
- It reuses the Discovery surface and model — no new chat infrastructure; v1 is on-demand text Q&A (→ RM-38). It carries no scope guardrail: paid usage is the NGO's call and the cost display is the control.

#### REQ-034: Task-Level Attribution (telemetry, never gating)
Classification (load-bearing): this is telemetry, NOT a security control — it is spoofable, soft-degrading, and never gates a request. Its purpose is the NGO burn-per-requirement view, per-requirement burn baselines, and usage reconciliation. Attribution granularity is the PM-tree REQUIREMENT — the same items the NGO tracks — never finer.
- A metered request may carry a binding to a pulled PM-TREE REQUIREMENT (REQ-026's requirement-level items — the attribution granularity; dev-tree items are never attribution targets), and burn is attributed when recorded; capture ships in v1 (→ RM-39). A request with no resolvable binding is recorded as "unattributed," never rejected.
- "Exploration" and "onboarding" are first-class taskless values, offered proactively, because falsely-attributed burn corrupts baselines.
- **One usage log, not an event system:** every metered AI request — gateway or direct — is recorded as a single row in one append-only usage log, written in-line by the component already handling that request (the gateway for volunteer traffic; the platform backend for its own Discovery/assistant calls). A row carries surface/actor, project, request id, provider status, and the provider's echoed token usage by category (the provider echoes token counts per response, never dollars) — metadata only, never bodies, and **no money fields: the log is token-denominated**.
- **Two meters, never mixed: fuel is money, attribution is tokens.** The fuel meter is rendered from provider truth alone — Anthropic's billed cost and usage reporting per workspace (REQ-006/REQ-009) and Lovable's credit status (REQ-021); **money is never derived from token math.** The attribution meter is token-denominated: burn per requirement, bucket, and category is measured and displayed in tokens, and per-requirement baselines are token-based. Reconciliation is same-unit only — row token totals against the provider's usage reporting, the money ledger against billed cost and Stripe — no cross-conversion. Attribution, the NGO burn views, and reconciliation are reads over this one log; nothing subscribes to it and it never gates a request.
- **Attribution spans both billable surfaces:** gateway traffic (volunteer build) attributes to a task or a taskless bucket; the **direct surface** — NGO-facing platform AI (funded Discovery and the assistant, REQ-004/033) — attributes to first-class **project categories** (Discovery, NGO assistant), so NGO-facing token consumption is counted and attributed to the project, never uncounted or folded into build burn. Every metered request on either surface carries project + category, and all categories reconcile to the project's total token usage.
- Steering is conversational (the agent is nudged to know its task context and select the matching task when exploration becomes implementation), never platform-enforced. The ceiling, verbatim: attribution telemetry and platform/gateway steering are detection-and-suggestion only and never gate the forwarding of an otherwise-valid metered request. The one permitted pause is Skill-local: the optional Skill may pause only its OWN guided workflow pending the task-or-exploration choice (REQ-028); disabling the Skill is immediate, penalty-free, and degrades attribution to unattributed.
- Aggregation boundary: the NGO sees burn per requirement and per NGO-facing category (Discovery, assistant), token-denominated, no celebration — the recorded granularity IS the displayed granularity (no finer detail exists to leak). Exploration, onboarding, and unattributed appear as their own honest buckets, so total token usage always reconciles to visible lines — usage is never hidden or folded into a requirement. The per-project unattributed-% / binding-failure signals stay coordinator-side. Wide per-requirement burn variation is expected data, not an anomaly.
- v1: capture plus the NGO burn-per-deliverable view (→ RM-39).

### P0 (promoted from P1): Required dependencies of REQ-024 / REQ-025 / REQ-026
REQ-013/014/015/016 (drafted P1) are P0-feature dependencies, reclassified P0 with minimal v1 cuts (→ RM-42, RM-3, RM-43, RM-45). Post-completion feature-request surfacing is out of v1 (→ RM-4); no P1 work in v1.

#### REQ-013: NGO Dashboard (minimal v1 + v1.5 enhancements)
One NGO-wide view supporting the stepwise-funding moments (Promise §6).
- v1: for each project, status, task-based percent complete, the fuel balance and the Lovable credit status, and the assigned volunteer, plus cadence signals (last commit, tasks done of total, current task) (→ RM-23); a cross-project fuel summary; the general balance shown as redeployable credit (non-cash, no expiry, never removed); and a prominent surface of items needing NGO action (open blockers, open scope-addition discussions, triage decisions awaiting the NGO). No applicant queue (concierge).
- (→ RM-42)

#### REQ-014: Volunteer Dashboard + Completion Credit (v1 minimal)
A dashboard plus completion-credit-only public reputation: no public star or numerical ratings.
- v1 dashboard: current projects (status, the fuel balance and the Lovable credit status, in-progress tasks, unresolved blockers/clarifications) and the key reveal (REQ-009) (→ RM-22).
- **No public profile page or badge display in v1** (→ RM-3). Completion credit is captured from day one as durable, append-only per-project events (non-overwritable, non-deletable, tamper-evident: volunteer, project, completion timestamp, first-tool eligibility), with a private "credit earned" confirmation at completion. The framing is "credit recorded from day one" — every repo is public MIT, so the portfolio already exists on GitHub.
- No satisfaction modal at completion and no admin aggregate; the volunteer never sees their own satisfaction scores (→ RM-24).
- (→ RM-3)

#### REQ-036: Dev-Authored Project PRD & Completion Gate

**Description:** Discovery output is a scope contract, not a task source. Kickoff seeds exactly one bootstrap task ("Author the project PRD"): the volunteer authors the project PRD in the repo from the Discovery scope (metered, fuel-billed, attributed to that task). Clarifying blockers (REQ-024) are expected and flow to the project Q&A log (REQ-010). When the volunteer marks the PRD ready, an automated scorer compares it to the Discovery scope, producing a completion score and named gaps. A score at or above the threshold decomposes the build backlog from the PRD onto the DEV TREE (REQ-026); below it, the volunteer iterates on the gaps and re-scores — bounded by project fuel, not an attempt cap.

**Acceptance criteria:**
- [ ] Kickoff creates the single bootstrap task in the project's Linear workspace; no build backlog before the gate passes.
- [ ] The PRD lives in the repo; authoring is metered and attributed to the bootstrap task (REQ-009/REQ-034).
- [ ] Clarifying questions ride the blocker flow (REQ-024) to the Q&A log (REQ-010).
- [ ] The scorer evaluates Discovery-scope coverage (stories, acceptance criteria, data-sensitivity handling, constraints), producing a score and gaps, and runs fuel-metered.
- [ ] Gate: at or above the threshold the tree is decomposed and pushed (REQ-026); below, a gap report is produced and the PRD phase continues. **[DECISION: OD-7 — threshold + scorer configuration; pilot-tuned.]**
- [ ] The NGO sees PRD-phase status on the project page (bootstrap task and score state); the NGO is not an approver — the scorer is the gate and NGO input is via clarifications.
- [ ] Score events are recorded and notified (the volunteer gets the gap report; the NGO gets gate-pass and backlog-live — REQ-016).

**Dependencies:** REQ-004, REQ-024, REQ-026, REQ-034, REQ-009.

#### REQ-015: Per-Project Comment Thread (full Slack-style channel deferred to v1.5)
A project-page comment thread replaces the v1 real-time channel (NGO admins, the assigned volunteer, and the platform admin only when escalated); the concierge pilot coordinates via blockers, comments, notifications, and email (→ RM-43). Only current thread participants may READ its history or post — the project's NGO account, the currently assigned volunteer, and the platform admin only while escalated; role changes update access automatically, and after completion or cancellation authorized readers retain history access while posting is disabled.
- v1: a chronological plain-text stream with auto-linked URLs (no markdown, code blocks, attachments, or @-mentions); it need not update in real time but shows current comments on view; posting notifies the other party; membership is implicit from project roles. System events never post to the thread — they surface in notifications and activity feeds. (Scope-addition discussions live here per REQ-025.) (→ RM-10) Post-completion it is read-only. No cross-project DMs.
- **Task-anchored NGO comments:** from the read-only status panel the NGO can attach a comment to a specific task (queued or in progress); the platform surfaces it to the volunteer in context on that task (REQ-026) and notifies them, and the volunteer's reply returns to the thread. Routine dev-internal task chatter never surfaces to the NGO, and the NGO never accesses the task system directly.
- (→ RM-43, RM-44)

#### REQ-016: Notifications (Email + In-App)
Event-driven email and in-app notifications with documented defaults in v1 (→ RM-45). One shared emitter on a single static event taxonomy is the sole writer — blockers, scope additions, and lifecycle events never send comms directly.
v1 taxonomy (event → recipients, delivery), condensed:
- Project decisions: triage approved / returned-to-scoped (with reason) / terminally declined → NGO (email + in-app); approval means marketplace visibility. Vetting outcome (vetted/unvetted) → NGO.
- Matching: candidacy marked → admin only (match log, never the NGO); match created → volunteer (email + in-app, consent CTA); consented → NGO (email + in-app, fund-to-kick-off); declined/expired → admin (match log); unmatched open-project aging → platform admin only (Goal 5).
- Abandonment (REQ-027): 14d reminder → volunteer + NGO; released → NGO + ex-volunteer; rematch available → NGO.
- Money: pre-deadline reminder → NGO; deadline expired → NGO + matched volunteer; payment succeeded → both; payment failed → NGO; fuel 20% → NGO; 5% and depleted → both (sessions warned/cut; depleted adds admin escalation); leftover released to general balance → NGO (no donation event); chargeback opened → NGO + admin + ops item.
- Access: virtual key issued (instant at kickoff) / revoked (replacement on dashboard) → volunteer (email + in-app).
- Fail-closed interlock: gateway watchdog failed closed (REQ-009) → platform admin (email + in-app).
- PRD gate (REQ-036): below-threshold gap report → volunteer (email + in-app); gate passed → NGO (email + in-app); backlog live → NGO (email + in-app).
- Money corrections (REQ-030): large reconciliation drift → platform admin (email + in-app); undecidable drift surfaced → platform admin (email + in-app).
- Work signals: task status changed → NGO (in-app, low-tone); task completed → NGO (email + in-app); task comment → volunteer (in-app); thread comment → the other party (in-app default, with an anti-spam guard); blockers raised/resolved/48h/7d → NGO email + in-app, volunteer on resolution, admin at 7d; PM status auto-reverted → volunteer (in-app, low-tone, instructive not punitive).
- Scope additions (informal): ride thread-comment notifications; no dedicated CR events in v1 (→ RM-10).
- Completion: project marked complete → both. (→ RM-25)
- Provisioning failure (repo setup failed, task-system workspace unavailable at kickoff) → NGO + volunteer + admin + ops item. Lovable: setup reminder, credits low, credits blocked (escalation tier), setup-pending auto-raised at kickoff → NGO, setup complete → both.
- (→ RM-43, RM-5, RM-7, RM-11)
Delivery defaults: email for critical events (money, deadlines, blockers, completion, decisions); in-app only for low-tone. One notification per committed event (→ RM-45). **Critical-event reliability guard (money, access, completion):** the notification event is written atomically with its ledger/state transition; recipients resolve at event creation; and it is marked sent only on provider acceptance — an unconfirmed send retries and is never silently dropped. Escalation-tier events notify the NGO and platform admin.

## Non-Functional Requirements

### Performance

- p95: marketplace page < 500ms at 100 RPS (re-validate pre-launch); Discovery first token < 1.5s; payment webhook < 2s end-to-end; code-hosting webhook < 5s end-to-end.
- Year 1: 1000 concurrent marketplace viewers (within the budgeted hosting tiers); 50 concurrent Discovery conversations (provider quota).
- Infrastructure budget ~$50/mo in year 1; re-baseline once the deployment architecture is chosen.

### Security

- Authentication and sessions are managed, with automatic refresh, and access ends on expiry or revocation. Tenant isolation covers NGO records, projects, fuel transactions, task comments, and project files; project-file access is time-bounded and granted only after a current-membership check. Rate limits apply to the auth, Discovery, and match-consent flows. Every inbound webhook is signature-verified.
- All provider keys (payment, LLM, code-hosting, work-tracking) are held as managed secrets and never logged. The real LLM key is never issued to volunteers; each volunteer holds an individual revocable credential.
- PII is minimum-necessary: verification documents are encrypted at rest and never public. GDPR: right-to-erasure (profile deleted, ledger anonymized) plus a standard DPA for EU NGOs. PCI is out of scope — all card data is handled by the processor.
- An append-only audit history (records cannot be altered or deleted) covers fuel transactions, project status transitions, role changes, volunteer AI-credential issuance/revocation, and work-tracking webhook-ingest provenance.

### Scalability

- Pilot: 100 NGOs, 200 volunteers, 50 active projects; year 1: 500 NGOs, 1000 volunteers, 200 active projects — within the budgeted tiers.
- The frontend, backend, and database scale to sustain these targets within budget; heavy and periodic work (webhook fan-out, outbox drain, scheduled scans, AI streaming) runs without blocking interactive traffic. Each project is isolated in its own Anthropic Workspace (REQ-009), so the provider's **100-workspaces-per-org cap** applies: workspaces are archived at completion/cancellation (archived ones don't count), so it binds only on concurrent in-flight projects; beyond that, projects spread across additional Anthropic orgs, with a cap lift negotiated once the platform has traction. Org-level provider rate/quota limits are also monitored.

### Reliability

- Uptime 99.5% (~3.6 hours/month). RTO 4 hours; RPO 24 hours.
- Application errors and logs are captured centrally with enough fidelity to investigate failures, and alerts fire on error-rate spikes. The monitoring framework — heartbeats, invariant pagers, operator paging — is out of v1 (→ RM-63).

### Accessibility

- WCAG 2.1 AA; full keyboard navigation; automated checks per change plus a manual screen-reader pass pre-launch; contrast ≥ 4.5:1.

### Compatibility

- The last 2 versions of Chrome, Firefox, Safari, and Edge. Responsive web (mobile, tablet, desktop); no native apps. English only at launch (→ RM-46).

---

## Technical Considerations

**Fixed platform partners (product decisions):** Stripe (fuel payments), GitHub (repos and commit/PR ingest), Lovable (the build vehicle and durable home), Linear (the task system of record), and Anthropic/Claude Opus (the LLM). Volunteer builds reach Anthropic only through the LLM gateway on per-project virtual keys, and the gateway alone holds the real key (REQ-009); every volunteer request is metered against project fuel and cannot exceed available fuel or caps. Platform AI (Discovery and the assistant (REQ-033), both Opus) calls Anthropic directly. A volunteer's LLM path and task path are disjoint, touching only at the task-ID binding (REQ-034). Each project has one platform-owned Linear workspace that never transfers; the NGO sees a read-only mirror, status moves on PR merge via the GitHub integration, and out-of-band edits are auto-reverted with an explanatory comment (REQ-026). GitHub Issues are never written or managed by ai4good in v1 (REQ-008). The platform backend, Stripe, Anthropic, the gateway, and GitHub are hard dependencies with defined, user-visible degraded states; a Linear outage only stales the panel while volunteers keep working, and the mirror converges once Linear recovers. Greenfield; no data migration.

**Implementation stack — architecture-session decision:** the frontend framework, backend runtime, ORM, the object store for reference files (REQ-032), observability, CI/CD, and the gateway's hosting home (OD-6) are chosen in the architecture session; only the platform partners above are fixed.

**Implementation roadmap — build-plan pointer:** the phased plan (Foundation → Core MVP → Dashboards, Comms & Operations → Hardening → Public Beta + Concierge Launch), the effort estimate (~420h core / ~530h buffered, ~14–17 weeks for two engineers, plus 4–6 weeks of pilot operations), and per-phase exit criteria are maintained in the build plan; task decomposition lives in Linear.

---

## Out of Scope

1. **ai4good AI Proxy** — ships in v1 as the LLM gateway (REQ-009): token validation, the project-binding tripwire, governance-prompt injection, instant rotation, and per-request audit metadata (→ RM-5); budget and velocity limits are provider-enforced (workspace spend + rate limits, REQ-009); the real key is never exposed and bodies are never persisted. Default policy: allow message calls, token counting, file upload, and model listing; block persistent-resource endpoints and all DELETEs; batch submission is per-project opt-in (→ RM-47). It cannot verify prompt relevance, machine-lock a token, or stop a determined token holder — the provider limits and rotation bound the damage. Hosting open (OD-6).
2. **Crypto / on-chain tokens** — fuel is Stripe-backed fiat credits only; no tradeable token, no on-chain ledger.
3. **Native mobile apps** — web-responsive only; iOS/Android not on the roadmap.
4. **i18n / multi-language UI** — English only at launch.
5. **Multi-volunteer teams per project** — one volunteer per project in v1 (→ RM-13).
6. **Embedded IDE / web-based code editor** — volunteers bring their own Claude Code / Lovable.
7. **NGO-to-NGO tool sharing marketplace** — repos are public; no curated fork experience.
8. **Anonymous / unvetted NGOs publishing** — founder-vetting is required in v1 (→ RM-6).
9. **Automated NGO verification** — manual admin review in v1.
10. **Hosted production environment for built tools** — the volunteer/NGO choose deployment.
11. **Public star ratings for volunteers** — reputation is completion credit plus badges; NGO satisfaction stays private, never displayed (→ RM-24).
12. **Platform skim on tips** — tips (post-MVP → RM-11) flow NGO→volunteer with a 0% cut.
13. **Pay-gated Discovery in v1** — a free daily per-NGO allowance (10/day unverified, 30/day verified; resets 00:00 UTC, no rollover); when exhausted the NGO verifies, funds fuel to continue immediately (REQ-006), or waits; funded projects draw on fuel from the outset ("Funded → all-$"); amounts are revisited if abuse exceeds the grant.
13a. **Paid "Discovery wallet"** — out for v1 and v1.5; the post-allowance path is a regular project-fuel purchase (single-pot).
14. **ai4good-funded Lovable infrastructure** — the NGO owns and pays for its Lovable workspace, never billed against fuel; the platform reads the workspace-level credit status through its monitoring account (REQ-021) and never meters or caps Lovable usage — the only spend bound is the NGO-set credit cap, native to Lovable.
15. **Multi-tool fuel metering** — fuel covers Anthropic (Claude Code) only; other tools are NGO-direct or volunteer-personal unless they ship metering-compatible APIs.
16. **Lovable credit reselling through ai4good** — NGOs buy from Lovable directly; a deep-linked "top up" route only (→ RM-28).
17. **Service-level agreements / completion guarantees** — none: ghosting, fuel burn without a deliverable, and infeasible scopes are all possible; the platform bounds financial risk (per-project fuel caps) and surfaces stalls but never underwrites.
18. **Closed-source / proprietary builds** — MIT (or a compatible permissive license) by default; closed-source is not served.
19. **Fuel-spend insurance / refund-on-no-deliverable** — consumed fuel is non-refundable even if nothing ships; NGOs are warned at every top-up.
20. **Automated Anthropic workspace + key binding** — now IN v1 (REQ-009): projects draw pre-created workspace+key pairs from a platform reserve (stocked in a batched console routine outside every money flow, since the provider mints no keys by API); binding at kickoff and archival at completion/cancellation run via the provider Admin API with no ops task.
21. **Per-request prompt/response content capture** — permanently out (privacy posture): metadata only (tokens, model, timestamps); bodies are never persisted; deliberate and on record.
22. **Anthropic-side budget enforcement** — now USED (REQ-009): the stop executes at the provider via project key status, decided by the platform monitor from provider usage truth; workspace rate limits bound burn velocity and a coarse provider spend fuse bounds catastrophe; the gateway adds governance and audit on top — it does not gate.
23. **OpenTelemetry prompt-content export from Claude Code** — ai4good never requests, processes, or aggregates volunteer prompt-content telemetry; independent OTel is allowed.
24. **v1 keeps, in place of the earlier deferrals:** per-IP/per-surface throttles (not full rate-limiting); an allow-list + don't-advertise + waitlist page (not gradual rollout); a handful of internal reports (not an analytics dashboard); secret-scanning + push-protection (REQ-031, not a takedown UI); automated tax calculation + hosted invoices + a tax-ID field (not multi-jurisdiction registration); and consent + a sub-processor list + a manual erasure runbook (not a self-serve GDPR erasure/export UI; no EU/public signup until self-serve) (→ RM-36, RM-48). The multi-org Anthropic router is retired.
25. **Automated PII / secret pre-scan on uploaded reference files (REQ-032)** — v1 is governance-by-disclosure: the NGO acknowledges the data-responsibility rule; no scan (→ RM-37).
26. **Automated spend-anomaly detection engine (REQ-009)** — v1 uses deterministic loss caps (no cash-out, the $200 first-fund cap, the provider-enforced workspace spend + rate limits), the NGO's instant "revoke access now," and daily human money-dashboard review (→ RM-5).

---

## MVP Scope & Post-MVP Roadmap

Authoritative reference: Out of Scope = never built; this section = when features ship. (The decision history behind v1 lives in the project decision log, not here.) **REQ IDs are stable identifiers: an ID absent from this document is a deferred requirement tracked in roadmap.md (RM-N).**

### v1 MVP (public beta launch)

**Launch strategy — concierge-first:** volunteer supply is the #1 launch gate; there is no organic browse first. Pre-recruit a ~20–30-volunteer bench, hand-match the first ~10–15 curated projects end-to-end, then open organic browse. v1 hooks: the supply-funnel metric, the aging nudge, and concierge-match tooling (→RM-49).

**Foundation:**
- REQ-001 — Auth: email + GitHub + Google.
- REQ-002 minimal — NGO trust via the audited founder-vetted action (→RM-6).
- REQ-003 — Project Need intake.
- REQ-007 — Volunteer profile + concierge matching (enforce-match, one-action consent, match log).
- REQ-011 minimal — Public read-only newest-first listings (→RM-8, RM-21).

**Discovery & Publishing:**
- REQ-004 — Discovery Agent: free within the daily allowance; complexity tier only, no dollar estimate.
- REQ-005 — Scope doc + publishing into triage.
- REQ-023 — Founder-decided triage with a no-authority AI advisory pass; the autonomous screener is deferred (→ RM-64).

**Funding & Money:**
- REQ-006 — Stripe top-up + fuel ledger + match-to-fund, non-cash and no-cash-out; leftover auto-applies at checkouts; no donation flow; chargeback handling + first-fund caps (→RM-19); no refunds (→RM-7).
- No tips UI at completion (→RM-11).

**Project Execution:**
- REQ-008 — GitHub repo per project in the platform org; dev-internal issues only.
- REQ-009 — LLM gateway; hosting = OD-6 (→RM-5).
- REQ-010 — Project page + cadence stats + the fuel and Lovable meters.
- REQ-021 — Lovable as the deliverable vehicle; the volunteer's Claude Code drives Lovable via its MCP; credit status via the monitoring account, manual fallback (→RM-27).
- REQ-024 — Lifecycle-independent blockers + task-anchored clarifications.
- REQ-025 minimal — Informal scope-addition protocol (→RM-10).
- REQ-026 — Task management via Linear.
- REQ-028 — ai4good Claude Code Skill: install, bootstrap, task binding, commands, conventions; the volunteer drives Lovable via its MCP (REQ-021).
- REQ-034 — Task-level attribution (→RM-39).

**Comms & Dashboards (minimal v1):**
- REQ-013 minimal — NGO dashboard: projects + fuel + task progress + items needing action (→RM-42).
- REQ-014 minimal — Volunteer dashboard: projects + fuel + completion-credit events (→RM-3).
- REQ-015 — Project comment thread (→RM-43).
- REQ-016 minimal — Event notifications, documented defaults (→RM-45).

**Completion:**
- REQ-012 — Volunteer marks done when all P0 tasks complete; access termination + provider-workspace archive + tree snapshot; no formal ceremony (checklist/sign-off/attribution/health deferred →RM-62).

Additional post-MVP items with no other v1-doc mention: →RM-50, RM-51, RM-52, RM-53, RM-54, RM-55, RM-56, RM-57, RM-59 (roadmap.md).

### Permanently out of scope (will not build)

A firm "no," to prevent re-litigation:
- Crypto, on-chain tokens, tradeable fuel — Stripe-backed fiat only.
- Native mobile apps — web-responsive only.
- Closed-source/proprietary builds — all projects MIT-licensed by default.
- Service-level agreements / completion guarantees — contradicts the Platform Promise.
- Fuel-spend insurance / refund-on-no-deliverable — spent tokens cannot be un-spent.
- Platform skim on volunteer tips — 0%.
- Hosted production environment for NGO-built tools — completion means NGO ownership.
- NGO-to-NGO tool-sharing marketplace — out of mission.
- Multi-tool fuel metering — only Anthropic spend routes through fuel.
- Collection of volunteer prompt content — privacy posture.

### Open issues to resolve before public launch

Decisions/policies needing external (legal, accounting, business) input — not features:
1. Fuel legal/tax characterization — DECIDED: prepaid, fully-consumable, non-cash-refundable service credit; a one-line counsel confirmation is still wanted.
2. Refund/donation/chargeback mechanics — dissolved: no refunds, no donation flow, chargeback-after-consumption handled (→RM-19).
3. Abandonment/rematch state machine — RESOLVED as REQ-027.
4. Sensitive-data vs open-source conflict — RESOLVED: public MIT only (→RM-2); Tier-2 fixtures-only; an acceptable-use document is still owed (ops work, not a launch blocker).
5. Admin staffing model at scale — OPEN: manual gates hold at pilot volume, not the year-1 target.
6. Anthropic commercial readiness — pilot on self-serve billing + default limits (→RM-60).
7. Deployment ownership at completion — DECIDED: Lovable hosts, the NGO owns the workspace (~$25/mo, disclosed) throughout; no live-deployment precondition and no 30-day-alive tracking in v1 (deferred →RM-62).
8. Entity type — DECIDED: nonprofit (fiscal sponsorship now, own 501(c)(3) later).
9. Counsel deliverables — pilot on the plain-language draft ToS, risk accepted (→RM-1).
10. Blended P&L + grant runway — a daily money dashboard suffices at pilot (→RM-61).

## Open Questions & Risks

### Open Questions

**Resolved / superseded (trail only):** Q1+Q8: moot — volunteer AI access is platform-managed, attributed per volunteer, and instantly revocable, with no external-provisioning dependency (REQ-009). Q2: resolved; no product impact. Q5: the v1 reward is completion credit plus the "Shipped first tool" badge only (REQ-014); NGO tips at completion → v1.5; honoraria revisited only if Goal 2 underperforms. Q6: Discovery is free within per-NGO daily credits (10/day unverified, 30/day verified); funding from draft is allowed; funded Discovery is dollar-metered (REQ-002/004/006); the `kyc_verified` allowance lift → v1.5.

**Still open:**

- **Q3, NGO verification:** v1 is a founder-vetted flag. The v1.5 bar: `verified` needs a registration document, a public reference link, and manual admin review; `kyc_verified` adds tax-exempt documentation and an NGO-admin identity check (provider selected). Open: which jurisdictions' tax-exempt documents v1 accepts (US 501(c)(3), UK Charity Commission, EU equivalents).
- **Q4, skim rate:** flat 15% vs NGO-size-tiered vs sub-$200 waivers. Owner: business; due pre-public-launch; affects the revenue model.
- **Q7, platform-level Lovable usage visibility — resolved in v1; one vendor ask open:** the platform reads each workspace's credit status through its own read-only monitoring account (REQ-021), so visibility no longer depends on the volunteer's session. Still open with Lovable: a durable service-account / API-key and a member-management API — today the platform's read depends on an interactive sign-in and all workspace invites/removals are manual dashboard actions.

#### Open decisions register — founder calls still owed (none block the PRD-dissection pass; each blocks only the build item named)

- OD-1: reviewer identity + merge authority per project (coordinator / peer / agent-assisted human click; governance, not plumbing) → REQ-026 merge flow + reviewer role
- OD-2: NGO Status-Panel scope + workspace onboarding → REQ-010/013 panel
- OD-4: misuse-detection enforcement sensitivity → REQ-009
- OD-5: deferred second spend-verification layer scope → v1.5
- OD-6: usage-metering operational home (deferred) → REQ-009
- OD-7: PRD completion-gate threshold + scorer configuration (pilot-tuned) → REQ-036
- OD-8: retired — v1 triage has no autonomous screener (every publish is founder-decided, REQ-023); the threshold/model questions move to RM-64's activation gate

### Risks & Mitigation

Rows: risk (severity): mitigation → contingency.

- Volunteers exceed fuel without enforcement (High): low-balance alerts, a hard zero cut-off, a transparent ledger → NGO top-up; the platform absorbs week-1 pilot overruns.
- AI consumes fuel with no viable deliverable (High): the first-match disclaimer, a per-project fuel cap bounding exposure, user-test checkpoints during builds, the Goal 4 target, and burn-per-deliverable on the NGO panel (REQ-034) → transparency + post-mortem; no refund; the completion record notes the outcome (REQ-012).
- Malicious NGO posts a commercial need (High): the founder vetting gate + mandatory founder triage review of every publish (assisted by advisory findings) → decline, deactivate; policy documented.
- Volunteers ghost mid-project (High): a 14-day inactivity reminder → 21-day auto-release → re-opened; the NGO can request re-match; responsiveness shown on the project page.
- Payment succeeds but fuel is not credited (High): tight-cadence reconciliation detects and auto-corrects to Stripe truth → undecidable cases surface to the founder (money dashboard + notification).
- Anthropic outage stops Discovery (High): a "service degraded" banner, queued intakes, a manual scope option → alternate provider post-v1.
- NGOs sign up but never fund (Medium): the free Discovery funnel; the $50 minimum at match-acceptance, not publish; abandonment detection → loosen if funnel-killing; unfunded projects tagged clearly.
- NGO expects an SLA / completion guarantee (Medium): the mandatory no-SLA acknowledgment at signup and every match acceptance; the Promise link per top-up → admin outreach; next-match priority.
- AI-code license/quality issues (Medium): MIT by default (Platform Promise); the first-match disclaimer carries the volunteer IP attestation (REQ-007, no v1 CLA); the NGO may open GitHub Issues on its repo post-completion (REQ-012); a remediation playbook is published.
- Regulators deem verification documents sensitive PII (Medium): restricted access; a DPA available → explicit consent + a data-minimization review.
- Fuel-cost inflation, Anthropic price rises (Medium): the percentage skim scales; changes communicated to NGOs in advance → a monthly rate-card adjustment.
- Lovable security incident hits the integration (Medium): exposure bounded — ai4good's only seat is a read-only monitoring account (editor role, no billing or admin; build Tier-2 is fixtures-only) and volunteers use their own accounts → rotate volunteer and monitoring-account credentials; pause Lovable recommendations until remediation is confirmed; in-flight projects continue on the fallback build path (REQ-021).

---
