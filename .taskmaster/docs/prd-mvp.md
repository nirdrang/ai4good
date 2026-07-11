# PRD: ai4good — MVP (v1 build spec)

> Pure v1 scope; deferrals in roadmap.md (RM-N). Source: prd-new.md.

## Executive Summary

NGOs need custom internal tools (scheduling, CRMs, grant trackers, dashboards) but cannot afford bespoke development. **ai4good: a nonprofit-operated, open-source marketplace turning NGO software needs into volunteer-built, AI-powered tools the NGO runs and keeps evolving itself.** A volunteer builds the first version via Claude Code orchestrating Lovable (the UI/app layer); the NGO then evolves the deployed app via chat. "Fuel" (prepaid, fully-consumable, non-cash metered Stripe credits) funds build-phase AI compute; the platform share is configurable (default ~15%), taken at consumption, not pay-in. Revenue: skim + grants + donations, never skim alone. Target: 25 NGOs with a working deployed tool and 100 active volunteer developers in the first 12 months.

---

## Platform Promise & Disclaimers

A nonprofit coordination layer, explicitly not a service provider with delivery commitments; hence free Discovery, fuel-on-match, open-source-by-default, no public ratings, tip-not-pay.

**Legal posture (decided 2026-06-03; founder verdict, flow #17 2026-07-08):** a plain-language ToS — warm in tone, real in force — carries the no-warranty/no-SLA/limitation-of-liability terms (enforceable only inside a contract); the MVP pilot runs on the un-reviewed draft, risk accepted (→ RM-1). ai4good asserts a limited, bona-fide coordination relationship, not "no contract exists." Volunteers donate time; never employees, contractors, or subcontractors of ai4good or the NGO.

### 1. A limited coordination relationship — no delivery obligation
Connects the parties, funds AI compute; no party owes any specific outcome; volunteers donate their time.

### 2. Work is fully open-source (public MIT)
Every repo is public MIT from first commit (a public volunteer portfolio). **v1 is public-only (decision-27);** needs genuinely requiring a closed/confidential codebase are declined at Discovery (→ RM-2). Sensitive-*data* tools are still served: public code, synthetic fixtures; the NGO connects real Tier-2 data itself post-handoff, never into the repo (REQ-004). Never allowed: commercial or closed-source-for-resale work, surveillance tooling, spam infrastructure, illegal use, acceptable-use violations.

### 3. Fuel funds AI usage on this project — not deliverables
Fuel pays for AI compute: NGO Discovery scoping past the free credit pool (decision-8) and volunteer build work. Lovable credits are separate: the NGO pays Lovable directly from its own workspace, never through fuel (REQ-021). Fuel does NOT buy a working tool, fixed scope, or outcome; NGO or volunteer may spend it in full without a viable deliverable — a risk NGOs knowingly assume.

### 4. No SLA, no completion guarantee
No project is guaranteed to reach handoff: volunteers may ghost (inactivity → auto-release + rematch, REQ-027), AI may consume fuel without progress, scopes may prove infeasible, NGOs may decline handoffs. Inactivity + handoff flows surface stalls early; the platform always strives to attribute every token consumed to a specific work item (REQ-034) — even when the outcome disappoints, the NGO sees exactly what its fuel was spent attempting.

### 5. What ai4good does promise
- Bounded financial risk: NGO-chosen per-project fuel budgets; nothing charged beyond commitment.
- Transparent volunteer track record: completion credit from day one (→ RM-3; every repo is public MIT, so the working portfolio exists on GitHub from the first commit); never stars.
- Open-source IP norms: forkable forever, no lock-in.
- NGO-side vetting gating (REQ-002, founder-vetted in v1) against fraudulent and abusive demand.
- Escalation paths on stalls: messaging (REQ-015), notifications (REQ-016); post-handoff issue surfacing → RM-4 (v1: re-engage via a new project).
- A genuine attempt to ship: motivated volunteers, AI leverage, real NGO problems.

### 6. Progress over promises (stepwise funding by design)
NGOs are steered to small, frequent funding steps; each fuel run-out is a review of visible work — PM task view (REQ-026), commit cadence (REQ-010), the volunteer's next steps — before top-up. Low-fuel blockers (REQ-024) make stepwise funding the path of least resistance.

### 7. Fuel is non-cash, project-scoped credit — it stays yours and working (decided 2026-06-03)
Fundable from draft onward (decision-8) — typically at match acceptance, or earlier to continue Discovery past the free pool. Project-scoped: unused fuel survives volunteer change (the successor inherits it, REQ-027). On genuine finish or abandonment, leftover credit becomes redeployable NGO general-balance credit: auto-applies at any NGO funding checkout (Discovery top-up or match funding), can satisfy the $50 minimum, remainder on card. No donation flow (decision-28). No cash-out or withdrawal: no money-out path means no laundering risk, no ACH/AML/KYC machinery. Nothing is ever silently removed. Funding screen: "Fuel powers AI work and is not cash-refundable; unused fuel stays as credit for your projects."

### 8. Minimize admin intervention
Target: under 10 minutes admin time per active project per week at steady state. Automation first: only ambiguous cases reach an admin; manual work is batched, never on a kickoff's critical path, wait stated upfront (NGO vetting: twice-daily batches). Virtual keys mint automatically at kickoff (decision-21). v1 bounds loss: deterministic caps + daily human review (→ RM-5). Lovable setup: volunteer-driven (REQ-021). Fuel top-up, key rotation: NGO self-serve. Vetting: one audited admin action in concierge onboarding (decision-29/r3 → RM-6, RM-7). Reconciliation: fully automatic; corrections auto-conform to provider truth (decision-31); only undecidable drift surfaces. Any feature needing routine admin involvement is weighed against this principle before being added; a standing review inventories manual procedures against the target, automates the automatable, re-audits on each added manual step.

### 9. Acknowledgment cadence (Option D)
Explicit, audit-logged acknowledgments:
- **NGO at signup**: full ToS + Promise (all clauses); required before project creation.
- **NGO at first funding on a project and at every match acceptance**: fuel ≠ deliverable, no SLA, non-cash credit, tier data-responsibility. The first per-project funding names the project and cap ("money commits to this project"); match acceptance names the volunteer ("volunteer + money + scope converge"); separate acknowledgments, never reused.
- **Volunteer at first match consent (decision-28, was first application)**: one combined account-held disclaimer: limited coordination relationship, open-source-by-default, per-project key use, standing data-confidentiality undertaking (when a project handles real data: the NGO's synthetic/anonymized fixtures only; confidentiality over anything seen). Sworn once, binding before any sensitive-data project; re-prompted only on material text change.

Later same-project top-ups: passive footer Promise link, no hard checkbox. Acknowledgments record timestamp, IP, text version; a material text change re-triggers acknowledgment.

### 10. The deliverable: a tool the NGO can run and keep evolving (decided 2026-06-03; single model per decision-23)
Not "a repo": a deployed, running tool the non-technical NGO keeps evolving itself. **Exactly one delivery model (decision-23, 2026-07-07; supersedes decision-19's deferred second track):** the durable home is an AI app-builder (Lovable in v1), evolved via chat post-handoff. Discovery (REQ-004) checks fit: needs requiring ongoing developer maintenance (custom logic or integrations a non-developer cannot evolve via chat) are **declined at Discovery** with plain messaging; each decline recorded for founder review. No second track, no waitlist.

The NGO owns the code outright (portable, no lock-in) and self-maintains via chat for roughly the AI-builder's subscription (~$25/mo); stopping payment keeps a deployable app but ends hands-free chat maintenance. Stated at kickoff, with a spend cap so metered edit costs never blindside a non-technical owner.

---

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

#### REQ-001: User Authentication & Org Membership

Two-layer authorization: global account type (NGO / volunteer / platform admin) + per-NGO role (admin / member, NGO accounts only); "NGO admin" = admin role in that NGO. NGO users may join multiple NGOs; volunteers are individual accounts.

- Email/password, GitHub OAuth, Google OAuth. GitHub link mandatory at volunteer signup (decision-36, supersedes decision-28's at-first-consent timing); linking runs volunteer GitHub onboarding (REQ-007).
- **Single-seat NGO in v1 (decision-28):** one NGO = one account performing every NGO-side action — funding, acknowledgments, scope edits, handoff sign-off (→ RM-12; the two-layer model stays in schema). Guards: acks capture name + title + authority attestation (bind NGO, fund non-refundable fuel, accept no-SLA, approve handoff); org email preferred, shared credentials prohibited in ToS/UI copy (acks per named human); audited platform-admin contact-transfer/recovery (out-of-band verification; ownership moves to the new account, the old one deactivates, history preserved); one non-login escalation contact captured at concierge onboarding.
- **Single-dev projects in v1 (decision-28):** one volunteer per project; no collaborator seats or co-volunteers (→ RM-13). (OD-1 "peer volunteer" = bench reviewer, not a second member.)
- NGO data visible only to its account and assigned volunteer.
- Password reset, email verification, session management.
- Lifecycle state (active/deactivated) gates every write (REQ-007 AUP) (→ RM-14).

Dependencies: none.

---

#### REQ-002: NGO Organization Profile + Founder Vetting (verification machinery deferred to v1.5 — decision-29/r3)

NGOs sign up (email-verified) and complete an org profile. v1 trust = the founder's hand, recorded; vetting happens in concierge onboarding. Two tiers (→ RM-6):

1. **Unverified** — email-verified (the Discovery bot floor). May draft projects, run Discovery within 10 credits/day; at zero: fund fuel now or wait for tomorrow. Cannot publish.
2. **Vetted** — ONE audited admin action at concierge onboarding. Allowance 30/day (3×). May publish and fund. Default for admitted pilot NGOs.

- NGO admin creates/edits the profile (name, mission, country, website, logo).
- Email verification precedes any Discovery message (composer disabled with a verify CTA). Vetting gates publish, never Discovery (decision-8).
- **Vetted action audited (decision-29/r3 guard):** vetted_by, vetted_at, NGO legal/display name, public reference link, contact name + title + authority attestation (decision-28/s2), evidence type, note; unvet/revoke exists. Vet/unvet emits the verification-outcome notification via the normal event path (REQ-016).
- **Evidence rule (PII-minimizing):** prefer public evidence (registry, website, EIN). Emailed registration docs: metadata recorded only, copy deleted after vetting. No sensitive personal identity documents in v1; nothing may imply a document review that did not occur.
- **No public "verified" claim in v1** — the flag may show only as "founder-vetted" (→ RM-6).
- On vetting the allowance rises 10 → 30 immediately and on later days (tier model); re-vetting never re-raises (idempotent).
- Only vetted NGOs publish; unvetted may reach `scoped` with Publish disabled ("your ai4good contact completes vetting during onboarding").
- Daily drip (decision-11): allowance hard-resets to the tier grant once per UTC day, no rollover — this wall replaces a separate message cap.
- Paid "Discovery wallet" excluded in v1 AND v1.5 (decision-8) (→ RM-6).

Dependencies: REQ-001.

---

#### REQ-003: Project Need Creation (free-text intake)

NGO admins start a "Project Need" with a free-text problem description, starting Discovery.

- Form: title, problem description, cause tags, urgency.
- Optional reference-file upload (screenshot, spreadsheet, blank form, mockup, requirements doc) for Discovery and the volunteer; shows the data-responsibility disclosure, hardened once Tier-2 sensitivity becomes known (REQ-032).
- Drafts autosave. Submission → Discovery; raw intake retained for audit.

Dependencies: REQ-001, REQ-002, REQ-032.

---

#### REQ-004: AI Discovery Agent (free, rate-limited)

A conversational agent turns intake into a scoped spec over 5–10 structured turns, on Claude Opus (decision-13; ~$1–2 per scoped run).

**Two-layer money (decision-11):** free Discovery runs on context-weighted credits — 10/day unverified, 30/day vetted; daily reset, no rollover. Funded fuel is dollar-pegged at the standard margin. **Routing ("Funded → all-$"):** a funded project's Discovery draws its fuel; the free pool serves only unfunded projects. At zero credits: get vetted (→ 30), fund fuel and continue now, or wait for tomorrow.

- System prompt tuned to extract technical scope from non-technical NGOs; the conversation persists and resumes in the platform UI.
- Reads Discovery-visible reference files multimodally, may request more mid-conversation, may cite them; never receives files not marked Discovery-visible (REQ-032).
- Structured scope output: summary; user stories with nested acceptance criteria; suggested stack; complexity tier (small/medium/large — never dollars); risk flags; data-sensitivity tier; maintainability fit; Lovable recommendation + rationale; workflow split (Lovable vs Claude Code). v1 always emits the split workflow (every match requires an Anthropic fuel kickoff) (→ RM-15).
- **Discovery output is a scope contract (decision-25):** the source for the dev-authored PRD (REQ-036) and the scorer's gate reference; never decomposed into tasks directly.
- **Data-sensitivity tiers** (Discovery asks what data the tool will handle before assigning one): Tier 0 (no restriction); Tier 1 (ordinary PII — minimization reminder + NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — **synthetic/anonymized fixtures only during build; the NGO connects real data itself after handoff**; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer). NGO owns the exposure risk (governance-by-disclosure); triage confirms. When unsure, Tier 2; health, immigration, abuse-victim, and financial data never below Tier 2.
- **Maintainability fit check (decision-23, supersedes decision-19):** who evolves the tool after the volunteer leaves — the criterion is the maintainer, not the technology. Fit = a non-technical staffer maintains the live app by chat, Lovable the durable home; internal tools (intake forms, CRUD trackers, directories, dashboards) default here. Needs requiring ongoing developer maintenance — developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable — are **declined**, plainly, Discovery explaining the limitation; a declined need never yields a publishable scope; each decline recorded for founder review. No waitlist, no second track. Confidential-codebase needs likewise declined (public-only — decision-27) (→ RM-2). Sensitive *data* is never a decline reason.
- Scope regenerable up to 3 times (reason logged), then admin escalation. Regenerations and system-error retries cost zero credits.
- Per-turn cost conversation-weighted; cached content heavily discounted. **File attachment never consumes credits and never interrupts — no pre-ingestion confirm** (founder review 2026-07-07); the daily allowance bounds platform spend. Funded projects bill each turn to fuel, files included.
- **Transparency UI:** credit gauge ("Discovery credits: 7 of 10 today") + per-turn cost; Lovable's opacity, forfeiture-on-cancel, and silent burn rejected. Credits never silently removed.
- **Free-phase scope guardrails (decision-34):** on FREE credits only: (1) a system-prompt scope line declines/redirects unrelated tasks (general Q&A, document drafting, translations, coding help); (2) a deterministic per-conversation turn ceiling (platform-configurable, pilot-tuned) — past it the agent moves to wrap-up and the composer offers only: generate the scope or start a fresh Discovery; (3) repeated off-topic declines → plain notice + founder daily-review flag; visibility, never lockout. **Funded Discovery carries NO scope guardrail:** per-turn cost display + fuel gauge are the controls.
- **Abuse guardrails:** email verification precedes any Discovery message; the daily allowance caps the per-NGO subsidy; funding is an expedite (same model, no latency change, no allowance raise); per-NGO admin kill switch (extra-credit grants removed — founder verdict 2026-07-08); no platform-wide circuit breaker (per-NGO caps bound exposure). Free credits are never purchased — zero stored-value/money-transmitter/escheatment exposure — and live outside the money ledger.

**No dollar estimation in v1:** the scope doc shows the complexity tier with rationale and links Lovable's public pricing where recommended; the NGO picks its fuel amount at funding ($50 minimum), topping up reactively (→ RM-16). The rendered doc explains plainly: tier + start-small advice; maintenance (NGO evolves by chat; ~$25/mo Lovable subscription paid direct; NGO owns the code); data tier (Tier 2 renders fixtures-only).

Dependencies: REQ-003.

---

#### REQ-005.5: Project Lifecycle State-Transition Table

Ten states: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `handoff_pending`, `handed_off`, `cancelled`. Every transition has actor, preconditions, side effects, failure handling. Abandonment/rematch (`in_progress → open`, REQ-027) is a transition, not an 11th state.

> **Decision-17: no `paused` state in v1.** At ~10–15 hand-matched projects, "pause" is a support conversation: pre-match, unpublish or cancel; mid-build, admin revokes keys and leaves a note, or cancel. (→ RM-17)

Transition rules:

- Any NGO — including unvetted — can create a draft. Vetting gates publish, never Discovery (decision-8).
- draft → Discovery: submitted intake + email-verified NGO admin + Discovery capacity (free credits or funded fuel); otherwise the composer is disabled, showing verify / fund-now / come-back-tomorrow CTAs.
- Discovery completion → `scoped` automatically on valid output; invalid output retries up to 3×, then admin escalation.
- `scoped` → `triage` on Publish (vetted only). Screener (decision-29/r4): confident-clean auto-approves → `open`; non-decided → founder exception queue — return to `scoped` with a reason note (edit; republish re-enters the screener) or `cancelled` (terminal, non-remediable only). Tier-2 never auto-approves.
- `open` → `matched_pending_fuel` on volunteer consent to a concierge match (decision-28 — admin-created, binding, no NGO approve/decline; drawn from the decision-36 candidate pool after the assimilation window). The first-match disclaimer gate is satisfied at the consent click (GitHub already linked at signup, decision-36). One match at a time per project (the match log tracks the rest).
- `matched_pending_fuel` → `in_progress` on funding (≥ $50): kickoff fires. 7 days unfunded → back to `open`, volunteer freed and notified, NGO gets the funding-expired notice with a restart CTA (REQ-016). NGO may cancel pre-payment.
- `in_progress` → `handoff_pending` on "Ready for Handoff": all P0 tasks done + repo exists. A failed checklist keeps `in_progress`, results shown.
- `handoff_pending` → `handed_off` on NGO acceptance (live deployment URL required): leftover fuel → general-balance credit; keys revoked; Linear membership removed, tree snapshotted read-only; attribution captured (REQ-035); completion credit + first-tool badge; 30-day-alive check scheduled. No tip in v1. Rejection → `in_progress` with comments (dispute machinery removed, flow #8).
- Abandonment/rematch (REQ-027): after 21 days of no code/task activity, or manual release, ex-volunteer access is revoked everywhere automatically — repo, keys, Linear, Lovable workspace (platform member seat, never waiting on the NGO — decision-35). **Remaining fuel stays on the project.** The departing volunteer's assigned tasks → backlog; departure flagged ghosted vs released-for-cause; project re-opens with rematch priority.
- `open` → `scoped` ("unpublish to revise") anytime before consent; a pending match is notified and released.
- Any pre-handoff state → `cancelled` by the NGO: keys revoked; fuel → general balance; volunteer notified; thread read-only (terminal).
- Operational blockers (REQ-024) are orthogonal badges on `in_progress`, never lifecycle states.

Match records track their own states — invited / consented / declined / expired / released — in the match log (REQ-007); an unfunded expiry frees the volunteer for re-match. (→ RM-8)

**Kickoff sequence** (parallel side effects on funding): (1) project gateway virtual key issued instantly, no ops task (decision-21); (2) Linear workspace assigned from the pool (pre-created in batches by concierge ops; empty pool → urgent ops task + blocker — decision-20); (3) repo established by NGO + volunteer via the Lovable setup checklist, no platform-admin involvement (REQ-021) — required before handoff; (4) workspace seeded with the one bootstrap task — author the project PRD from the Discovery scope (REQ-036, decision-25); the build backlog decomposes only after the automated completion gate; (5) comment thread opens; "funded and live" announced; (6) volunteer notified with setup instructions. Provisioning failures never invent a sub-state: the project stays `in_progress`; gaps surface as blockers/ops tasks, gating the volunteer only from the pending resource.

---

#### REQ-005: Scope Document & Project Publishing

Discovery output renders as an editable scope document; the NGO edits and publishes. Publishing needs no pre-funded fuel (fuel is required only at volunteer acceptance — match-first) but requires triage approval (REQ-023).

- Editable: summary, user stories, acceptance criteria, suggested stack. No fuel-budget section (no v1 dollar estimates).
- **All projects public MIT (decision-27, Platform Promise §2):** no visibility choice. Confidential-codebase needs declined at Discovery (→ RM-2); sensitive *data* → Tier-2 fixtures-only (REQ-004).
- A project may stay `scoped` indefinitely; the NGO picks its fuel amount at match acceptance.
- Publish requires vetted status, no fuel deposit; moves to `triage`, never directly to `open`. Clean projects go live immediately; exceptions await the founder (REQ-023).
- Unpublish to `scoped` anytime before consent; a return-to-scoped outcome carries the founder's reason note for edit + republish.

Dependencies: REQ-004, REQ-023.

---

#### REQ-006: Stripe Fuel Top-Up & Ledger (NGO + volunteer both consume; funding allowed anytime from draft onward)

NGOs buy fuel via Stripe Checkout (one-time, no subscription). The full gross amount credits the specified project or, at the NGO's choice, its general balance. Margin (15%, platform-configurable, locked per consumption — never retroactive) is recognized at consumption, not top-up: a $100 top-up shows $100 of fuel; a never-consuming project leaves the NGO its full balance and the platform nothing (Promise §3/§7). Fundable from `draft` onward (decision-8); the consumers — the NGO (Discovery, and post-funding the project assistant, REQ-033) and the volunteer (build) — pay the same margin; the ledger labels each consumption kind separately.

**Two funding moments** (either first; decision-8): (1) Discovery funding — the expedite when free credits run out (the credits→dollars boundary; buys continuation, not speed); (2) match funding — the default, at acceptance.

**Match-to-fund flow:**

1. Volunteer-consented concierge match → `matched_pending_fuel` (decision-28).
2. **Acknowledgment gate** before the funding CTA — a plain-language modal, volunteer's name pre-filled: coordination layer only, no obligation to deliver a finished tool; fuel funds AI compute and may be consumed without a viable deliverable; **fuel is non-cash credit, not cash-refundable — unused fuel remains credit for the NGO's projects**; the data tier + NGO data responsibility (Tier-2 = fixtures-only); the chosen amount is the hard maximum exposure. Recorded per match with timestamp + IP. The modal also hosts the Lovable setup reminder where Lovable is recommended.
3. **The NGO picks its own amount** — no prefilled estimate. Copy treats the complexity tier as context only and recommends starting small, topping up stepwise after reviewing concrete progress. Minimum $50; presets $50/$100/$200/$500/custom; default $50. **First-fund cap:** no handed-off history → capped per project (default $200) and per day; caps rise with history — bounding any fraud/chargeback incident to roughly one cap of compute.
4. 7 calendar days to fund the minimum. Payment → `in_progress` + kickoff. No payment → back to `open`, volunteer freed, funding-expired notice with restart CTA (REQ-016; renamed from "re-fund prompt," which collided with "refund" — founder review 2026-07-09). The no-refund rule is disclosed upfront on the funding screen.

**Acknowledgment cadence:** full disclaimer at signup (gates project creation); a hard per-project ack at FIRST funding; a per-match ack naming the volunteer at first acceptance (never reused across the two); later top-ups show a passive footer link only.

**Ledger (product level):** every money movement lands in one auditable ledger; all balances derive from it. **The dollar meter runs at two levels, both on Anthropic's numbers (decisions 30/31):**
- **Out-of-band anchor:** a tight-cadence pull (minutes, pilot-tuned) of Anthropic's usage/cost reporting is the truth; disagreeing books auto-correct to it (Stripe = the same truth for money-in). Corrections post via the guarded function — audited, dashboard-visible; only undecidable drift pages, never touching the books.
- **Inline preview** covers what the anchor cannot: per-project split (Anthropic sees one org credential; only the gateway knows each request's project) and real-time fuel-zero decline. Between anchors the gauge moves per request on Anthropic's OWN token counts at Anthropic's published rates — never trusted over the anchor.

Control totals verify nightly and auto-repair by the same provider-truth rules (→ RM-18). Match expiry (7 days) is automatic.

**Unused fuel — non-cash credit (Promise §7):**

- **Nothing is ever pre-committed to Anthropic:** the platform pays Anthropic only for actual usage, request by request, on one org account (pay-as-you-go); per-project accounting exists only in the platform ledger (gateway metering, decision-21/30). Cancellation or volunteer release therefore strands no money at Anthropic — the unconsumed balance never left the platform.
- **No cash-out or withdrawal exists in v1** — no money-out path; only chargeback risk survives.
- Leftover fuel **stays on the project** across a volunteer change.
- Only at handoff or cancellation does leftover credit release to the **general balance**: non-cash, no decay clock, no silent auto-renew, never silently removed; it **auto-applies at any of the NGO's funding checkouts** (decision-28), satisfying the $50 minimum, remainder to card. The release is a ledger operation under nightly control totals — never a manual balance tweak — respecting chargeback clawback. No donation flow, manual conversions, or tax receipts.
- No cash refunds of any kind — not even admin-initiated (goodwill valve removed, flow #9). A genuinely-wronged NGO is made whole in general-balance credit; disputes go through the chargeback rail — the only money-out surface is Stripe's dispute process.
- The NGO dashboard shows the general balance as redeployable credit, no expiry.

**v1 top-up is manual** — the 20% warning and 0% blocker drive top-up from the project page (→ RM-7).

**Chargebacks:** on a dispute the platform immediately freezes the NGO (no new funding or matching), cuts the project's AI access, claws back the unconsumed balance, books the consumed portion as loss, and opens an admin review; the audit-logged acknowledgment (timestamp + IP) is submitted as the Stripe dispute evidence. Loss bounded by no-cash-out + first-fund cap + rapid cutoff (→ RM-19); pilot losses absorbed from operating funds. Fraud posture: collusion/shared-fingerprint detection removed from v1 (decision-26 + founder verdict) — concierge hand-vetting of every pairing + no-cash-out + caps are the control (→ RM-20).

Concierge/admin work items (vetting, pool replenishment, chargeback reviews, incidents) land in one prioritized admin queue with SLA targets.

Dependencies: REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.

---

#### REQ-007: Volunteer Profile & Concierge Matching (organic marketplace apply-flow deferred to v1.5 — decision-28)

Volunteers sign up (GitHub link mandatory — decision-36) and build a profile. **v1 matching is concierge-only**; first cohort hand-matched (Goal 5 → RM-8). Project pages public (Platform Promise §2); **volunteers mark interest in-product — a "candidate for this project" action (decision-36); each open project gets an assimilation window (platform-configurable, pilot-tuned) to gather candidates before the concierge matches from the accumulated pool.**

- Sign-up: GitHub OAuth, Google OAuth, or email/password; **a GitHub link is mandatory at signup (decision-36 — no unlinked volunteer accounts)**; stats auto-populate (top languages, repo count, contribution summary).
- Profile: skills, causes, hours/week, optional bio.
- **Admin enforce-match (decision-28, drawing from the decision-36 candidate pool):** binding; no NGO approve/decline. Gates: (a) volunteer one-click confirm — first-project disclaimer if unsigned; no repo/key/Linear access or Tier-2 intro pre-disclaimer; (b) NGO per-match acknowledgment (fuel ≠ deliverable, no SLA, names the volunteer) on the funding screen; kickoff fires only on funding (match-to-fund). Consented = kickoff-ready.
- **Concierge match log (admin-only):** every event — candidacy marked, invited, consented, declined/expired/released, timestamps, short reason. Goal-5 evidence for opening organic browse; not a public queue; candidacies never surface to the NGO.
- **At first match consent, volunteer auto-added to the platform GitHub org** with repo-creation rights (REQ-008/021) — org membership waits for a real match, never granted at signup. Recorded + audited.
- **Org removal by cause:** (a) voluntary deactivation — membership removed, per-project access on active projects persists; (b) **AUP enforcement (v1 minimal — founder verdict 2026-07-08):** admin deactivates the account (lifecycle state gates every platform write), instantly revokes project virtual keys, audited note; residual repo/Linear/org access removed by a short manual checklist; Lovable-workspace removal via the build-phase member seat (decision-35); reversal = manual re-enable + key re-issue (→ RM-14); (c) 24-month inactivity — soft removal, like (a).
- Dashboard shows the linked GitHub handle and the volunteer's open candidacies.
- Public listing (read-only v1): title, summary, complexity tier, suggested stack, cause tags, NGO name, posted date — newest-first, no filter/sort (→ RM-8; no public verification badge, decision-29/r3 → RM-6).
- (→ RM-8, RM-21)

Dependencies: REQ-001, REQ-005, REQ-008.

---

#### REQ-008: GitHub Integration (Code substrate + dev-internal issue tracker)

Every funded project gets a public-MIT repo in the platform GitHub org (all public — decision-27), created only via the volunteer-driven Lovable→GitHub setup (decision-23). Verified: Lovable's GitHub App creates the repo where pointed; its collaborator permissions do NOT propagate to GitHub.

- **Uniform repo home:** repos stay in the platform org permanently — no handoff transfer; MIT + Lovable two-way sync keep code forkable/exportable; the NGO admin holds admin access post-handoff.
- Volunteer: maintain. NGO admin: read + comment, no push.
- Code events feed cadence stats + task linkage from repo creation; task status moves via Linear's GitHub integration.
- **GitHub Issues dev-internal only** (bugs, refactors, tech debt), never NGO-visible; the Linear tree = source of truth for NGO-visible deliverables. No issues auto-created from the scope doc; dev-internal labels seeded at bootstrap.
- **Repo seeding:** committed platform-owned session guidance — project-binding marker (REQ-009), task-binding conventions (REQ-034), Linear norms (one issue in progress; assign before starting; comment when blocked; never move status by hand), branch/commit conventions carrying the Linear identifier, skeptical reviewer-agent skill, env-file hygiene. Platform API credentials never committed — shown once, revocable, distinct from the virtual key (two revocation semantics). Longer onboarding = on-demand repo skills, not per-request fuel-billed files.
- Lovable commits lack Linear identifiers — acceptable: status moves on volunteer PR merges; a knowledge snippet asks Lovable to include them best-effort.
- Platform holds only short-lived GitHub credentials minted on demand; no user PATs.
- **One-time org setup at launch:** platform + Lovable GitHub Apps org-wide; least-privilege scopes, credential rotation, break-glass org-compromise runbook. Org membership grants NO repo read access — explicit adds only. Members may create repos (the Lovable flow needs it); abuse monitor for org repos matching no active project. NGO admins = per-project outside collaborators, never members.
- **Continuously-asserted base-permission invariant (P0):** no member default access + private-only repo creation (REQ-009 org-namespace guard) — continuously verified, alerting, auto-remediating. Member-created repos born private; public only after the setup checklist validates the repo URL.
- **Lovable path (v1 default):** no repo pre-created at funding. Kickoff auto-raises a Lovable-setup blocker; NGO (workspace + admin invite) and volunteer (GitHub install + connector + paste-back) work an 11-step auto-validated checklist recording the repo URL — typically same-day; aging escalation if stalled; no admin involvement. Repo URL = hard handoff precondition.
- README seeded: title, NGO name, plain-language summary, license, project-page link; MIT auto-seeded.
- **At handoff:** volunteer → read/triage, NGO admin → admin — no org transfer. Platform auto-removes the volunteer from the Lovable workspace via its build-phase member seat, then removes itself (decision-35).

Dependencies: REQ-006, REQ-007, REQ-021, REQ-026.

---

#### REQ-009: LLM Gateway — Virtual Keys, Caps & Inline Fuel Metering (decision-21)

> **Decision-21 re-architecture:** a platform-controlled **LLM gateway** in the request path replaces per-project provider workspaces, manual console keys, and usage polling. Deleted: workspace provisioning, key ops queue, usage poller, daily cost-drift reconciliation, console spend caps, the fuel-zero deactivation/reactivation saga. Hosting open (**OD-6**).

Each (volunteer, project) pair gets a **virtual key**; vanilla Claude Code works unchanged. Per request the gateway authenticates the key; checks status, caps, fuel, binding; injects the governance prompt; forwards on the real org credential (gateway-internal — volunteers never see it); streams back; prices; records consumption inline.

**Placement doctrine (platform-wide):** volunteer-editable files = soft norms, reinforced conversationally; the gateway-injected prompt = durable norms (re-applied every request, invisible to the volunteer); deterministic code = hard invariants. Third-party permission models: trusted for access, never policy (Lovable has no role between Admin and Editor; Linear scopes can't express "assign + comment but no status change").

**Threat model:** the binding marker = **tripwire, not lock** — copyable; converts accidental misuse (key reused on another repo, the dominant case) into unambiguous intent. The virtual key = the credential; key + repo context = a two-factor barrier against outsiders only. Caps bound exposure; the ledger attributes; revocation ends it — detection can afford latency. Revocation = individual enforcement; marker rotation = hygiene for lost repo access, never anti-insider. Rate limits = reliability; project-lifetime fuel = economics — never size caps adversarially. Governance capacity follows observed behavior; deterrence = onboarding disclosure (usage attributed, reviewed). Anything taxing legitimate volunteers inverts its purpose.

- One key per (volunteer, project), shown once, auto-minted at kickoff, never logged.
- Onboarding = two env vars on the volunteer dashboard, with instructions; all rejection/setup-failure copy instructs, never accuses.
- Streaming preserved end-to-end; gateway overhead under 150ms p95 (excluding model latency).
- **Caps per key:** per-request max + rolling 24-hour window sized 3–4× a heavy human day. 80% → soft warning; 100% → hard stop, one-action coordinator override. Values from pilot data (**OD-3**).
- **Project-binding check:** a committed marker ("ties NGO-funded fuel to this project; please don't move it") rides the session prompt; the gateway verifies it against the key's project on substantive requests only (small background calls skipped; threshold **OD-4**). Mismatch → instructive rejection naming the key's project.
- **Governance prompt on every request:** project-scope line (decline unrelated requests; redirect to project work) + the never-change-Linear-status rule (REQ-026).
- **Inline metering (the money path):** tokens priced by the local rate card, 15% margin, paired consumption recorded immediately; retries cannot double-charge; task attribution attached when known (REQ-034); all REQ-006 money invariants hold.
- **Fuel thresholds:** 20% → NGO notification + warning blocker; 5% → volunteer in-app warning; **0% → the gateway declines the next request inline, stating the cause** ("project fuel is exhausted — ask your NGO to top up"); the blocker flips to blocking. Post-top-up the next request passes — no reactivation machinery.
- **401 semantics:** flat externally (no revoked-vs-nonexistent distinction) EXCEPT fuel exhaustion, which states its cause — that caller must act. Rich diagnostics only on the authenticated dashboard. First-week 401s = onboarding-UX metric, not threat signal.
- **Revocation instant and self-serve:** NGO "suspect misuse — revoke access now" and admin enforcement cut access immediately; a replacement key issues instantly. All project keys terminate at handoff (REQ-012), abandonment release (REQ-027), AUP deactivation (REQ-007).
- **Privacy invariants (load-bearing):** request bodies inspected transiently, never persisted; ledger = token counts + metadata only; derived origin/mismatch signals stored as score or boolean — never paths or content.
- **Key-leak hygiene (v1 = prevention, not detection — decision-26):** env files ignored by default; the platform key pattern registered with GitHub secret scanning + push protection (→ RM-22). Org-namespace guard: private-only member repo creation, visibility changes owners/platform-automation only, Pages/Actions restricted for unmatched repos — asserted by the REQ-008 invariant. Public flip only after checklist validation; founder daily review = one-call org-repo-vs-active-projects comparison.
- **Escalation ladder documented, NOT built in v1** (keeps the no-surveillance decision visible) (→ RM-9).

Dependencies: REQ-006, REQ-024, REQ-034, REQ-012/027/007 (key-termination hooks). Only provider surface: the model API through the gateway.

---

#### REQ-010: Project Page (single view) & Cadence Stats

One **public page** per project — the same view for NGO admins, assigned volunteer, platform admins, logged-out visitors. Platform = PM/coordination; dev workflow lives on GitHub — no "developer view."

- One page, no per-role variants; the full task tree public on every project (Platform Promise §2).
- Header: title, NGO name, status, assigned volunteer, repo URL (plain-language empty state while Lovable→GitHub setup pends), complexity tier, cause tags.
- **Task tree = primary content:** hierarchical progress bars, status badges, "Now working on" highlight, plain-language titles. Progress % = done P0 tasks / total P0 tasks — from the tree, never GitHub issues.
- **Plain-language activity feed:** commits become readable statements tied to task titles ("Volunteer completed work on Task 3.2 — Scheduler core (2h ago)"), never raw PR jargon.
- Reference-files section (REQ-032): NGO-uploaded need-files with descriptions; downloads limited to assigned volunteer, NGO admins, platform admin — restricted despite the public repo; NGO adds/removes pre-handoff.
- Clarifications tab (REQ-024): resolved questions persist as a Q&A log (question, answer, who, when) for the project's lifetime; "Awaiting NGO clarification" banner while any is unresolved.
- Fuel gauge = real-time provider truth (decision-30): Anthropic-reported usage per gateway response (moves within seconds), validated continuously by a tight-cadence pull of Anthropic's aggregate usage reporting.
- **No GitHub Issues, PR lists, or raw commit logs on the page** — the header repo link is the only GitHub touchpoint.
- **Cadence stats (v1 minimal — decision-26):** commits this week vs last with delta + last-activity timestamp (red past 14 days during build), from code events only (→ RM-23). Promise §6's two progress signals stay intact.
- **Dual fuel-meter display (REQ-021):** side-by-side "Claude Code (via fuel)" (balance, % remaining, low/depleted indicators) and "Lovable (direct to Lovable)" (setup CTA pre-setup; then status + workspace link + top-up CTA); tooltips note separate purses. **Standing trigger (decision-30):** (→ RM-58)

Dependencies: REQ-008, REQ-009.

---

#### REQ-011: Public Project Listings (v1 read-only; browse/sort/filter machinery v1.5 — decision-28)

v1: public, newest-first list — anyone sees what ai4good is building. Read-only **plus exactly one volunteer action: mark interest ("candidate for this project" — decision-36)**, feeding the admin match log only. Matching is concierge (REQ-007); no NGO-facing apply queue, filters, badges, or scoring; NGOs make no accept/decline decision (enforce-match).

- Cards show needed skills + cause tags plainly; newest-first, read-only.
- No ML, no algorithmic ranking, no NGO-satisfaction weighting.
- (→ RM-8, RM-21, RM-24)

Dependencies: REQ-007.

---

#### REQ-012: Handoff Workflow

From "code done" to "NGO operating solo." Lovable is enforced and git-bound (decision-23) — app and repo are already the NGO's; handoff transfers nothing. Substance = **access transition (offboard the volunteer) + bookkeeping** (attribution, credit, fuel release, `handed_off`). Founder review 2026-07-09.

- Volunteer requests handoff once all P0 tasks are done; open GitHub Issues never block it.
- **Hard precondition: the project repo exists** (Promise §2). Incomplete Lovable→GitHub setup disables the button with instructions; the parties self-resolve, no admin escalation.
- Done-status arrives only via merged PRs (structural under decision-20) — every done P0 task carries shipped code; no manual spot-checks.
- Automated checks: README, RUNBOOK, deploy instructions, at least one passing CI run on main, LICENSE (MIT).
- **Deploy-to-running (deliverable = running tool, not repo):** a live deployment URL is a handoff precondition; the app is Lovable-hosted. The volunteer pastes the live URL into the handoff form (sole capture point — no URL, no completed handoff), confirms Lovable workspace ownership with the NGO, and runs the **guided-maintenance ritual**: (i) enable row-level access enforcement on the Lovable database (off by default — PII footgun); (ii) demo chat/plan mode + checkpoint rollback; (iii) set the Lovable spend cap/budget alert; (iv) confirm two-way GitHub sync live.
- **30-day-alive signal (north star):** automated ping 30 days post-handoff records whether the tool is alive — reachability only, measured, never guaranteed (no SLA, Promise §4). v1 longitudinal signal = the structured day-45–60 founder check-in (REQ-035 — decision-26/c8) (→ RM-25).
- NGO reviews (repo URL + live URL + checklist results); signs off or rejects with comments. Rejection-loop cap, neutral review, and contest path removed (flow #8 verdict 2026-07-08); a stuck reject cycle = a support conversation.
- On accept: project → `handed_off`; leftover fuel → NGO general balance as non-cash credit (REQ-006); volunteer completion-credit event recorded, private confirmation (→ RM-3); all project virtual keys terminate (REQ-009); Linear membership removed, tree snapshotted (REQ-026); the **REQ-035 attribution step** captured at sign-off.
- **Repo handoff (uniform):** repo stays in the platform org; NGO admin → admin; volunteer removed or read-only, **at the NGO's choice**. No transfer step.
- No tip flow in v1 (→ RM-11). Sign-off includes the attribution step (testimonial + 3 credit-framed dimensions), superseding the "no satisfaction form" deferral — attribution capture, not a satisfaction score; never blocks acceptance.

Dependencies: REQ-008, REQ-006, REQ-021, REQ-009, REQ-026, REQ-035.

#### REQ-021: Lovable Integration — Durable Home + Claude-Code-Orchestrated Build

Lovable is the deliverable vehicle and the NGO's durable maintenance home: post-handoff the non-technical NGO evolves the live app via Lovable chat — no developer needed. During build, Claude Code is the volunteer's single entry point — it orchestrates Lovable for UI and handles backend/logic/tests/docs; ai4good metering, scope enforcement, and audit stay authoritative. Every project uses Lovable (decision-23) (→ RM-26).

**Orchestration posture:**
- Lovable's surface is a research preview; access isolated behind one internal adapter.
- Primary path: Claude Code drives Lovable; on breakage the volunteer drives Lovable in-browser, both committing to the shared repo. UI work spends NGO Lovable credits; Claude Code work burns fuel. UI-heavy and backend-heavy mixes are both fine; only a pure-backend tool with no Lovable app fails the fit check — declined at Discovery (decision-23).
- Orchestrated calls bill the NGO workspace: per-task Lovable-credit cap, every call audit-logged, NGO credit balance surfaced in ai4good. The volunteer connects their own account; calls attribute to them.
- Post-handoff the NGO owns the workspace outright; zero dependency on orchestration or Claude Code.

**Why NGO-self-provisioned:** Lovable has no per-project metering API, no BYOK, per-workspace billing. Self-provisioning: zero infrastructure dependency, no markup, day-one NGO ownership. No ai4good connector inside Lovable (decision-20); Lovable never talks to ai4good.

**Lifecycle:**
1. Discovery flags the Lovable recommendation with rationale; no dollar estimate; scope doc notes "paid directly to Lovable, never from fuel." Pre-kickoff reminder banner to the NGO: set up the workspace + invite the volunteer.
2. Setup mandatory at kickoff: a blocking item auto-raised to the NGO, self-served via blockers + comments; zero admin involvement; no NGO GitHub account. Checklist: NGO signs up (paid tier for workspace-admin), creates the workspace + Lovable project from a one-click-copied scope summary, invites the volunteer as workspace admin **plus, one-click, the platform ops account as member (decision-35 — powers automated offboarding at handoff/abandonment, exits at handoff)**; volunteer accepts, connects GitHub sync (repo created in the platform org), pastes back identifiers; platform auto-validates (repo in org, flipped public post-validation, GitHub App installed, name collisions surfaced, volunteer permission normalized — cannot add collaborators unnoticed), auto-resolves, seeds the template, notifies both.
3. Stuck parties raise clarifying blockers, standard aging; admin pinged only at 7 days. The volunteer works locally immediately after setup — no further approval. (Collaborator-request blocker: legacy own-org edge case only.)
4. Credit status manual in v1: a volunteer-set widget (active / low / blocked); low/blocked shows the NGO a top-up CTA deep-linked to Lovable billing; "I've topped up — unblock" resets (→ RM-27).
5. Handoff (automated — decision-35): the platform removes the volunteer via its member seat, then itself; the NGO keeps workspace + billing alone. Repo stays in the platform org with NGO admin access (no transfer — decision-24/33); GitHub sync continues. **[VERIFY on the first pilot]:** member removal + self-removal via API/MCP; fallback = manual NGO removal with a notice.

**Acceptance criteria:**
- [ ] Discovery output: Lovable recommendation + rationale, no dollar fields; the rendered scope doc carries the paid-directly disclaimer and no dollar figure.
- [ ] Setup item auto-raised at kickoff (no opt-in/out); resolved only by platform validation; a failed check shows the specific failure + fix, item stays open.
- [ ] Setup guide documents the checklist; guide + per-project page: one-click copies (scope summary, volunteer email, optional snippet asking Lovable to reference the task identifier in commits — best-effort only; status moves on PR merges, never parsing), validated paste-back form, who-acts-next progress.
- [ ] Widget appears post-setup; volunteer-changeable; low/blocked notify; NGO resets; top-up CTA opens Lovable billing in a new tab. No mail parser in v1.
- [ ] Repo-creation permission granted at volunteer onboarding, not per project.
- [ ] At handoff the platform removes the volunteer, then itself (decision-35); manual NGO removal only as API/MCP fallback.

**Non-goals (v1):** no Lovable subscriptions bought for NGOs; no metering or attribution of Lovable credit consumption (no usage API); Lovable cost never debited from fuel; no credit reselling (→ RM-28); no backend access to Lovable *billing/usage* — credit visibility stays client-side, consent-gated; backend billing waits for scoped access or webhooks. (Decision-35's sole exception: the build-phase member seat, offboarding only, exits at handoff, reads no usage data.)

---

#### REQ-022: Stripe Connect for Volunteer Tips (DEFERRED to v1.5 per §11)

(→ RM-11)

---

#### REQ-023: Platform Triage Gate (compliance review before marketplace)

Every project passes a compliance gate between scope completion and publication, catching policy violations before volunteers see it. **v1: automated triage screener + founder exception queue (decision-29/r4):** automation decides clear cases; the founder attends only non-decided ones — the REQ-036 scorer shape applied to triage.

**Screener checks:** open-source alignment (all projects public MIT; commercial or closed-source-for-resale work prohibited; confidential-codebase needs = categorical decline, decision-27); nonprofit purpose vs the vetted profile; scope reasonableness vs complexity tier (abusive scope caught here); acceptable-use (no surveillance, spam, illegal use); data-tier correctness (Tier-2 requires a fixtures-only plan); Discovery risk flags. Returns pass/flag + reasons + confidence.

**Acceptance criteria:**
- [ ] "Publish" routes to the screener, never directly to the marketplace.
- [ ] **Confident-clean → auto-approved → `open`**, with a screener-written audit record (checks, rationale, version).
- [ ] **Tier-2 never auto-approves** — always routes to the founder.
- [ ] **Non-decided → founder exception queue** (findings pre-surfaced), reviewed daily. Two outcomes: **return to `scoped`** (reason note to the NGO; edit + republish re-enters the screener, stays invisible; prior notes visible) or **terminal decline** (non-remediable; cannot churn back).
- [ ] Every human decision recorded: reviewer, timestamp, decision, reason, data tier, scope snapshot.
- [ ] **Auto-approved items appear as one line in the daily review** (exception items display their age) — post-hoc spot-check; break-glass unpublish recovers (REQ-031).
- [ ] Screener threshold + model configuration (same model family as OD-7): **[DECISION: OD-8 — pilot-tuned.]**
- [ ] NGO copy: clean publishes go live immediately; exceptions show "Under review — typically within a day or two" — no formal SLA.

---

#### REQ-024: Project Blockers (orthogonal operational health)

Blockers are orthogonal to lifecycle status, separating "ghosting" from "waiting on someone else"; they feed reputation and escalation, and never reduce public completion credit.

**Types (v1):** clarifying question (dev-raised, manual resolve); awaiting NGO review; external dependency; GitHub collaborator needed (legacy edge case; resolves on NGO confirming access); Lovable setup pending (auto-resolves on validation, REQ-021); fuel top-up needed (auto at 20% warning / 0% blocking; auto-resolves above 20%); Lovable credits (widget; NGO resolves) (→ RM-5). Auto-raised types: one unresolved instance per project, severity upgrading in place; manual types may have several open.

**Notifications and aging:** raise → NGO admins (email + in-app + "Action needed" rail); blocking fuel also → admin; resolve → both. Reminder at 48h; escalation at 7d to the admin, project flagged at-risk. Lovable-setup aging routes to NGO + volunteer; admin only after 7d of mutual silence. Open blockers auto-archive at handoff.

- Dev raises via "Raise a flag" (type, severity, title, body); resolution requires a note; conversation = blocker Q&A + comment thread (no chat channel — decision-15). Manual catch-all types carry a per-instance action-owner (type default); choosing admin/ops creates the ops item immediately (decision-26/c4 guard). Every NGO-facing free-text surface from a blocker carries the Tier-1/Tier-2 warning: never paste beneficiary data, passwords, keys, or live credentials (decision-26/c4 guard).
- Clarifying questions are first-class: project-level or task-anchored (topic, what you tried, what you need). While unresolved: "Awaiting NGO clarification — volunteer can continue other tasks; this one is paused." Resolved pairs persist in a lifetime Clarifications log (who asked, who answered, when).
- Surfacing: project-page badge (count + severity); compact indicators on marketplace + dashboard cards; the NGO-dashboard "Action needed" rail (aggregating across projects) sorted severity-then-age, emphasized past 48h; cadence stats annotated "(blocked on NGO action / fuel)".

**Acceptance criteria:** raise/resolve works for both roles; fuel blockers auto-raise/resolve at thresholds with in-place upgrade; Lovable-credit blockers ride the widget; notifications and 48h/7d aging fire as above; auto-archive on handoff; all surfaces render.

---

#### REQ-025: Mid-Build Scope Additions (structured CR surface deferred to v1.5 — decision-29/r1, amending decision-16)

**v1 is informal, decision-16 principle intact:** nothing interrupts the volunteer, nothing auto-assigns; the volunteer is the sole work-acceptance authority (enforced socially at concierge scale, not mechanically). The NGO raises ideas in the comment thread. Protocol (decision-29 guards):
- Nothing enters scope until the volunteer accepts in-thread AND creates the linked task — before material fuel is spent (REQ-034).
- An accepted addition is top-priority (handoff-blocking) or explicitly NGO-acknowledged as optional — non-blocking — before handoff.
- One active scope-addition discussion per project; further asks wait or become a follow-up project.
- Copy: additions consume existing fuel, may extend the timeline, are volunteer-optional; never paste beneficiary data, secrets, or credentials.
- Additions changing data sensitivity, AUP/compliance posture, or open-source fit pause for founder re-triage before work starts.

(→ RM-10, RM-29)

---

#### REQ-026: Platform Task Management (Linear as system of record — decision-20)

Decision-20 replaces the git-as-truth tree: real signals, not AI-authored narratives. Linear gives event-granular, actor-attributed real-time signals; an enforceable read/write split; no merge conflicts under parallel worktrees; a hosted backlog predating the clone; per-volunteer attribution.

**Model:** task state lives in Linear — one free workspace per project. Volunteers and their agents (under the volunteer's identity) read, self-assign, comment; status moves only via Linear's GitHub integration on PR merge. The platform mirrors Linear events one-way into its store (powers the Status Panel + assistant); the NGO never touches Linear — the panel is its only Linear-visibility surface. GitHub Issues (code bugs only) and Linear comments stay dev-internal; NGO conversation stays on the comment thread.

**Ownership asymmetry (deliberate):** delivery infrastructure NGO-owned (Lovable workspace, repo); coordination infrastructure platform-owned (Linear, gateway), never transferred. Post-handoff the workspace sits dormant at $0; the tree snapshots into the repo as markdown. Any paid tier: platform pays.

**Provisioning — pool model:** workspace creation has no public API; the concierge pre-creates ready workspaces in batch (platform access, events, GitHub integration pre-wired). Kickoff: assign next ready workspace, rename, invite volunteer, seed the PRD bootstrap task (REQ-036) — no manual step. Replenishment fires below a watermark (default 3); an empty pool at kickoff raises an external-dependency blocker — the only stall mode. Bulk empties sharpen the fair-use question; pilot proceeds on free-tier terms, risk accepted (→ RM-30).

**Decomposition (from the gated PRD — decision-25):** kickoff seeds only the bootstrap task; once the dev PRD clears the gate, the platform drafts and auto-pushes the tree — one parent per story, one sub-issue per acceptance criterion, top priority. Briefs must be session-sized and dependency-ordered (blocking relations encoded); the precondition for pull-model correctness and per-task burn data (REQ-034). Coordinator review retires to a pilot spot-check (supersedes the decomposition half of decision-24(a)).

**Pull-based workflow:** self-assignment = the commitment signal (flips the panel to "in progress"); volunteers pull the next unblocked issue; the coordinator never pushes. Norms: one issue in progress (one per worktree if parallel); assign before starting; comment when blocked; never move status by hand. Onboarding: match → invite → browse briefs (before cloning anything) → first work session connects task access (one-time) → first pull activates attribution. An in-progress issue with no branch activity for N days raises a coordinator flag proposing return to backlog. Agentic loops permitted (handling loop-agnostic); the template ships a skeptical reviewer-agent; loops degrade on auth failure (updates queue, surface at session end); loop PRs never auto-merge. **[DECISION: OD-1 — reviewer identity + merge authority, per project.]**

**Write authority (real-signals enforcement):** volunteers/agents read, comment, self-assign — never change status. The GitHub integration moves status; the platform creates issues (decomposition; v1 scope-addition tasks are volunteer-created, REQ-025), invites, reverts, cancels. The NGO holds no Linear seat. OAuth scopes can't express "assign + comment but not status," so enforcement is detect-and-revert: any status change not from the GitHub integration and lacking a linked merged PR is auto-reverted with an explanatory comment + low-tone notification to the volunteer (a restricted read/assign/comment proxy held in reserve if reverting proves noisy). Agent actions attribute to the volunteer, who owns them.

**Lifecycle hooks:** accepted scope additions = volunteer-created linked tasks (REQ-025) (→ RM-10). At handoff-pending: lower-priority not-started issues cancel; top-priority never auto-cancels (handoff requires all done, REQ-012); the final tree snapshot commits to the repo. At handed-off: volunteer membership removed; the mirror goes read-only. On abandonment: the ex-volunteer's in-progress issues return to the backlog.

**Acceptance criteria:**
- [ ] NGO-visible task state derives solely from observed Linear events + platform lifecycle actions; public (decision-27).
- [ ] Pool assignment + watermark replenishment as described; empty pool raises the blocker.
- [ ] Kickoff seeds the bootstrap task; post-gate decomposition auto-pushes with session-sized briefs + blocking relations (pilot spot-check — decision-25).
- [ ] Status flows only from PR merges; detect-and-revert enforces and notifies.
- [ ] Status Panel: "now working on" strip, hierarchical tree, live activity feed. Panel functionality beyond the tree + NGO introduction mechanics: **[DECISION: OD-2.]**
- [ ] **[VERIFY on the first pool batch]:** free-tier events, API mutations, programmatic invites, rename, pre-connected GitHub integration seeing later repos. Fallback: paid tier (platform pays) or git-based state with a deterministic truth layer.

---

#### REQ-028: ai4good Claude Code Skill (volunteer-facing single pane of glass)

An ai4good-shipped Skill makes the volunteer's local Claude Code the canonical operating environment: conventions, helper commands, and session governance as installable, auto-updating agent code shipped through the standard Skill channel (docs drift; a Skill runs every session). One-command install; auto-runs in every session opened in an ai4good repo.

**v1 scope:**
- One-command install; open-source (MIT). Non-secret project config seeded at repo creation; one-time login per project. Three credentials, three revocation semantics: platform token (blockers, comments, fuel), task-system OAuth (backlog), gateway key (metered LLM traffic).
- Session bootstrap primes scope summary, status, in-progress tasks, unresolved blockers, recent NGO comments, fuel runway; verifies task access; reads the binding; prints a one-line banner (project, active task + age, fuel, unread comments). (→ RM-10)
- Task binding + degradation (load-bearing): self-assigning records the issue in a per-worktree binding riding every metered request — the attribution mechanism (REQ-034). **The Skill enforces pull-then-complete:** before substantial work, an explicit choice — pull an issue or enter the exploration bucket — so every session carries attribution context; exploration turning implementation → it insists on binding the matching issue. Completion is an explicit dev act: dev marks done; the Skill verifies and drives the merge that flips status (REQ-026). On task-system auth failure the session degrades without stopping: updates queue locally, surface at session end; binding floors to unattributed (a floor, not a bypass).
- Helper commands: pick next task (highest-priority unblocked, full context shown; self-assigns on confirm); fuel status (balance, burn rate, projected runway); list blockers (with suggested actions); raise a task-anchored clarifying question; handoff readiness check (top-priority done, README + runbook, repo + deployment URLs set, work pushed); disable/enable. (Reference files download from the project page.) (→ RM-31)
- Branch/commit conventions (task identifiers + linking keywords) auto-applied so the GitHub integration links work and moves status: branch link → In Progress, merge → Done (the only done-path). The volunteer can override anything the Skill generates. Manual fallback always: Linear app + project page cover every behavior; a disabled Skill still operates — attribution degrades to unattributed, norms arrive via the injected prompt.

**The Skill is the orchestration shell (v1 core):**
- Drives Lovable through the adapter (REQ-021 fallback posture). Per-task triage: build-locally vs delegate-to-Lovable from the task + Discovery's split, explained, overridable (heuristic: visual UI → Lovable; else local). After each delegation: pull, test, iterate / done / fix locally.
- Budget guardrails: per-task prompt cap (default 5); interactive confirmation past it with a running burn estimate; refusal beyond an NGO-set hard cap. Every call audit-logged with a cost estimate; NGO Lovable burn on admin + NGO dashboards.
- NGO consent gate: "Allow Skill to orchestrate Lovable" — default ON at kickoff with cost disclosure, revocable, checked before every call.

(→ RM-32, RM-33)

**Acceptance criteria:** install end-to-end; bootstrap auto-runs + banner; binding follows self-assignment per worktree; auth failure degrades without blocking; helper commands work; conventions applied with override; disable/enable persists; docs cover install, configuration, troubleshooting, opt-out, and the disabling implication.

---

#### REQ-027: Abandonment / Rematch (volunteer ghosts mid-project)
Adds a release + rematch edge (in_progress → open) + a partial-fuel rule.
- Triggers: inactivity (no repo activity AND no task movement) — reminder 14 days, auto-release 21 days; or manual release by either party, with reason. Clock runs only while in_progress (decision-17).
- Release revokes ex-volunteer access (repo, AI keys, workspace/PM) via the release revocation checklist (its own rule, no suspension dependency); in-progress tasks → backlog; done work + history preserved; remaining fuel STAYS on the project — no refund.
- Ghosted (timeout) recorded distinctly from released-for-cause; ghosting affects the outreach/reputation signal; for-cause carries no automatic penalty.
- Re-opens with concierge rematch priority; NGO notified; prior matches closed in the match log. Notifications: reminder, released, rematch available (REQ-016).

#### REQ-029: Observability & Operational Monitoring
~Eight unattended money-touching scheduled processes → heartbeats + business-invariant monitors that page a human.
- Every scheduled job heartbeats; a watchdog pages on a missed interval.
- PAGE monitors: undecidable ledger drift (decision-31); any negative balance; **any metered AI request accepted or recorded against a depleted project — every billable surface, gateway or direct, funded Discovery included (decision-26/c5 guard)**; gateway error rate or provider errors outside budget; a release revocation checklist incomplete >6h; org base-permission drift.
- **Every metered AI request — gateway or direct — emits the same privacy-preserving audit event** (surface/actor, project, request id, provider status + cost, fuel delta, rate-card version, ledger linkage; metadata only, never bodies) (decision-26/c5 guard).
- v1 dashboards = the ONE money dashboard (funding, consumption, platform share, reconciliation, chargebacks), founder-read daily (→ RM-34); error tracking + structured logging = baseline NFRs.

#### REQ-030: Operations, Incident Response & Admin Correction Tooling
Names the operating model. (Audited-reversal requirement removed — flow #7; undoing enforcement = ordinary admin ability.)
- On-call + escalation named (pilot: the founder, documented tree); incidents = first-class ops items.
- **Runbooks (v1 = three — decision-26):** backup restore within the 4-hour objective; gateway real-key rotation + mass virtual-key revocation; Lovable outage fallback. One-page cards: credential-compromise break-glass, PM-tool outage degraded mode, chargeback spike. The compromise card must: freeze reference-file access (disable signed-URL minting); start the breach clock (discovery time; counsel/statutory assessment if PII possibly exposed); reconcile Stripe vs the fuel ledger for the window before unfreezing money (decision-26/c6 guard). (→ RM-35)
- **Money corrections fully automatic (decision-31, supersedes the d26/c12 admin-invoked form): no correction UI, no human step.** Tight-cadence reconciliation (decision-30) auto-conforms the ledger to provider truth — Stripe wins money-in (top-ups, chargebacks); Anthropic wins AI spend; pairing arithmetic (every consumption carries its skim pair) resolves internal gaps — posting via the one privileged function (idempotency key, pair-sum zero, source reference, audit row); direct ledger writes revoked from every role. Founder gets visibility, never approval: corrections show on the money dashboard; large drift pages. **Refusal-to-guess backstop:** undecidable drift (provider data missing or self-contradictory) never auto-resolves — books untouched; it pages.
- Account deactivation (v1 AUP): documented recovery — re-enable + re-issue keys manually (→ RM-14).

#### REQ-031: Content Moderation, Takedown & Secret Scanning
Right-sized: ~15 concierge projects need no automated takedown surface; the one real exposure — secrets in public repos — is covered.
- v1: secret scanning + push protection org-wide; founder break-glass to hide a repo (emergency-takedown admin action, not a private-project feature).
- (→ RM-36)

#### REQ-032: Project Need Attachments (NGO reference files for Discovery + build)
The NGO uploads reference files (manual process, screenshots, sample forms/data, mockups, requirements PDFs); Discovery reads them multimodally; the volunteer uses them at build.
- Upload at intake, during Discovery (the agent may ask), or from the project page pre-handoff; drag-drop + picker. Types: PDF, PNG/JPG, CSV/TSV, TXT, DOCX/XLSX. Caps (tunable): ~25 MB/file, ~200 MB/project.
- Access: the project's NGO account + assigned volunteer + platform admin only (repo public, files restricted); short-lived authorized links; the UI never holds storage credentials.
- PII = governance-by-disclosure (decision-1): "redacted/sample data only, NOT real beneficiary records; ai4good + your volunteer will see these files." Tier-2 adds a hard checkbox restating fixtures-only: the NGO connects real data itself, in its own environment, post-handoff. No upload scanning in v1 — the NGO owns the risk per the data-responsibility acknowledgment (→ RM-37).
- Discovery may cite files in questions + the scope doc; file names + the NGO's one-line descriptions ride its context. File reads never consume credits, never interrupt (founder review 2026-07-07); on funded projects they consume fuel like any turn.
- Volunteer downloads from the project page (→ RM-31). The repo template gitignores the download path; files never committed (accidental-commit residual accepted at pilot; mitigated by secret scanning + fixtures-only).
- Project-page "Reference files" section (name/type/uploader/description); soft deletes; uploads + deletes audited.

#### REQ-033: Post-Discovery NGO Project Assistant (funded, fuel-metered)
Decision-12: post-funding, the Discovery chat reframes as a read-only project assistant (status, open blockers explained, recent progress summarized, fuel runway).
- Project page, in_progress onward; unfunded/pre-scoped projects have no assistant — Discovery is the only NGO↔AI chat there.
- Fuel-metered, no free credits; per-turn cost shown; fuel gauge visible; fuel-zero disables the composer with the top-up CTA.
- Strictly read-only (snapshot of tasks, blockers, fuel, activity): cannot set status, resolve blockers, accept scope additions, approve handoff, or move money. Scope/priority asks → explains the REQ-025 protocol, may pre-fill a draft the NGO submits.
- Reuses the Discovery surface + model — no new chat infrastructure; v1 = on-demand text Q&A (→ RM-38). No scope guardrail: paid usage is the NGO's call (decision-34); the cost display is the control.

#### REQ-034: Task-Level Attribution (telemetry, never gating — decision-22)
Classification (load-bearing): telemetry, NOT a security control — spoofable, soft-degrading, never gates a request. Purpose: NGO burn-per-deliverable, per-task cost baselines, reconciliation precision.
- Metered requests may carry a task binding; burn attributed at ledger-write time; capture ships in v1 (→ RM-39). No resolvable binding → "unattributed," never rejected.
- "Exploration" + "onboarding" = first-class taskless values, offered proactively — falsely-attributed burn corrupts baselines.
- Steering is conversational (the agent nudged to know its task context and select the matching task when exploration becomes implementation), never platform-enforced. Ceiling, verbatim: detection and suggestion only, never gating.
- Aggregation boundary: the NGO sees burn per deliverable (cents, no celebration); per-volunteer-per-task granularity stays coordinator-side. Bimodal per-task costs = data property, not anomaly.
- v1: capture + the NGO burn-per-deliverable view (→ RM-39).

#### REQ-035: Post-Handoff Attribution & Jumpstart Health (decision-22; 60/90-day layer trimmed to v1.5 — decision-26/c8)
No gates anywhere — quality becomes visible after the fact; reputation is the incentive. Capture ships in v1 (→ RM-25, RM-40).
1. NGO attribution at handoff (v1): optional free-text testimonial + three required dimensions — communication, delivered scope, onboarding into self-service — 4-point descriptive scale, credit-framed (~30s); deliberately NOT a star score. Feeds the volunteer's portfolio (private in v1). Supersedes the "no satisfaction form" deferral; "no public star ratings, ever" holds. Nothing here blocks handoff.
2. Post-handoff health (v1 = reachability + a structured human check-in) (→ RM-25): the automated 30-day ping stays, reachability-only (deployed and responding). The longitudinal layer → a founder check-in at day 45–60, a REQUIRED ops item created at handoff acceptance (handoff cannot complete without it — owner + due date). Outreach closed-form, PII-minimizing: six fields (self-service attempted, worked/failed, URL reachable, failure category, follow-up owner, follow-up due); the message itself instructs: never send screenshots, beneficiary data, secrets, or raw incident detail — privacy/security concerns route to the incident path first. Failures get an owner + a 2-business-day clock. Health signals never notify the volunteer punitively.
3. (→ RM-40)
4. (→ RM-41)

### P0 (promoted from P1): Required dependencies of REQ-024 / REQ-025 / REQ-026
REQ-013/014/015/016 (drafted P1) are P0-feature dependencies — reclassified P0, minimal v1 cuts (→ RM-42, RM-3, RM-43, RM-45). REQ-017 out of v1 (→ RM-4); no P1 work in v1.

#### REQ-013: NGO Dashboard (minimal v1 + v1.5 enhancements)
One NGO-wide view supporting the stepwise-funding moments (Promise §6).
- v1: project cards (status, % complete from tasks, dual fuel meters, assigned volunteer) + cadence signals — last commit, tasks X of Y, "Now working on: [task]" (→ RM-23). Cross-project fuel summary; general balance = "$X redeployable credit" (non-cash, no expiry, never removed). "Action needed" rail: open blockers, open scope-addition discussions, triage decisions awaiting the NGO. (No applicant queue — concierge, decision-28.)
- (→ RM-42)

#### REQ-014: Volunteer Dashboard + Completion Credit (v1 minimal)
Dashboard + completion-credit-only public reputation: no public star or numerical ratings.
- v1 dashboard: current projects (status, dual fuel gauges, in-progress tasks, unresolved blockers/clarifications); key reveal (REQ-009) (→ RM-22).
- **No public profile page or badge display in v1** (→ RM-3). Completion credit captured from day one as **append-only per-project events** (volunteer, project, handoff-accepted timestamp, first-tool eligibility); private "credit earned" confirmation at handoff. Copy: "credit recorded from day one" — every repo is public MIT; the portfolio already exists on GitHub.
- No satisfaction modal at handoff, no admin aggregate; the volunteer never sees own satisfaction scores (→ RM-24).
- (→ RM-3)

#### REQ-036: Dev-Authored Project PRD & Completion Gate (decision-25)

**Description:** Discovery output = scope contract, not task source. Kickoff seeds exactly one bootstrap task ("Author the project PRD"): the volunteer authors the project PRD in the repo from the Discovery scope (metered, fuel-billed, attributed to that task). Several clarifying blockers (REQ-024) expected → the project Q&A log (REQ-010). When the volunteer marks the PRD ready, an automated scorer compares it to the Discovery scope → completion score + named gaps. Score ≥ threshold → the build backlog decomposes from the PRD (REQ-026); below → gap list, iterate, re-score — bounded by project fuel, not an attempt cap.

**Acceptance criteria:**
- [ ] Kickoff creates the single bootstrap task in the project's Linear workspace; no build backlog before the gate passes.
- [ ] The PRD lives in the repo; authoring metered + attributed to the bootstrap task (REQ-009/REQ-034).
- [ ] Clarifying questions ride the blocker flow (REQ-024) → the Q&A log (REQ-010).
- [ ] The scorer evaluates Discovery-scope coverage (stories, acceptance criteria, data-sensitivity handling, constraints) → score + gaps; runs fuel-metered.
- [ ] Gate: score ≥ threshold → tree decomposed + pushed (REQ-026); below → gap report; PRD phase continues. **[DECISION: OD-7 — threshold + scorer configuration; pilot-tuned.]**
- [ ] The NGO sees PRD-phase status on the project page (bootstrap task + score state); the NGO is not an approver — the scorer is the gate; NGO input via clarifications.
- [ ] Score events recorded + notified (volunteer: gap report; NGO: gate pass + backlog live — REQ-016).

**Dependencies:** REQ-004, REQ-024, REQ-026, REQ-034, REQ-009.

#### REQ-015: Per-Project Comment Thread (full Slack-style channel deferred to v1.5 — decision-15)
A project-page comment thread replaces the v1 real-time channel (NGO admins, assigned volunteer, platform admin only when escalated); the ~10–15-project concierge pilot coordinates via blockers + comments + notifications + email (→ RM-43).
- v1: chronological plain-text stream, auto-linked URLs (no markdown, code blocks, attachments, @-mentions); loads on page view, no live push; posting notifies the other party; membership implicit from roles. System events never post to the thread — they surface in notifications + activity feeds. (Scope-addition discussions live here per REQ-025.) (→ RM-10) Post-handoff: read-only. No cross-project DMs.
- (→ RM-43, RM-44)

#### REQ-016: Notifications (Email + In-App)
Event-driven email + in-app, documented defaults in v1 (→ RM-45). One shared emitter on a single static event taxonomy is the sole writer — blockers, scope additions, lifecycle events never send comms directly.
v1 taxonomy (event → recipients, delivery), condensed:
- Project decisions: triage auto-approved / returned-to-scoped (with reason) / terminally declined → NGO (email + in-app; decision-29/r4); approval = marketplace visibility. Vetting outcome (vetted/unvetted) → NGO (decision-29/r3).
- Matching (decision-28): candidacy marked → admin only (match log, decision-36 — never the NGO); match created → volunteer (email + in-app, consent CTA); consented → NGO (email + in-app, fund-to-kick-off); declined/expired → admin (match log); unmatched open project aging → platform admin only (Goal 5).
- Abandonment (REQ-027): 14d reminder → volunteer + NGO; released → NGO + ex-volunteer; rematch available → NGO.
- Money: pre-deadline reminder → NGO; deadline expired → NGO + matched volunteer; payment succeeded → both; payment failed → NGO; fuel 20% → NGO; 5% and depleted → both (sessions warned/cut; depleted adds admin escalation); leftover released to general balance → NGO (no donation event — decision-28); chargeback opened → NGO + admin + ops item.
- Access: virtual key issued (instant at kickoff) / revoked (replacement on dashboard) → volunteer (email + in-app).
- Work signals: task status changed → NGO (in-app low-tone); task completed → NGO (email + in-app); task comment → volunteer (in-app); thread comment → the other party (in-app default; anti-spam guard); blockers raised/resolved/48h/7d → NGO email + in-app, volunteer on resolution, admin at 7d; PM status auto-reverted → volunteer (in-app, low-tone, instructive not punitive).
- Scope additions (informal — decision-29/r1): ride thread-comment notifications; no CR events in v1 (→ RM-10).
- Handoff + health: requested / accepted / rejected → both; verification outcome → NGO. (→ RM-25)
- Provisioning failure (repo setup failed, workspace pool empty at kickoff) → NGO + volunteer + admin + ops item, + urgent replenish alert on pool-empty. Lovable: setup reminder, credits low, credits blocked (escalation tier), setup-pending auto-raised at kickoff → NGO, setup complete → both (skip-path events removed per decision-19).
- (→ RM-43, RM-5, RM-7, RM-11)
Delivery defaults: email = critical (money, deadlines, blockers, handoff, decisions); in-app only = low-tone. One notification per committed event (→ RM-45). Critical-event reliability guard (money, access, handoff — decision-26/c2): the notification event writes atomically with its ledger/state transition via the outbox; recipients resolve at event creation; marked sent only on provider acceptance — unconfirmed sends retry, never silently drop. Escalation-tier events notify NGO + platform admin.

### Out of v1 / Deferred to v2 — referenced by ID only

#### REQ-017: Post-Handoff Feature Request Surfacing (v2)
(→ RM-4)

### Nice to Have (P2) — Future Enhancement

#### REQ-018: Discovery Agent — Voice Input
(→ RM-54)

#### REQ-019: Multi-Volunteer Per Project
(→ RM-13)

#### REQ-020: Public Impact Page
(→ RM-55)

## Non-Functional Requirements

### Performance

- p95: marketplace page < 500ms (re-validate pre-launch); Discovery first token < 1.5s; payment webhook < 2s end-to-end; code-hosting webhook < 5s end-to-end.
- Year 1: 1000 concurrent marketplace viewers (within budgeted hosting tiers); 50 concurrent Discovery conversations (provider quota).
- Infrastructure budget ~$50/mo year 1; re-baseline for the two-target deploy.

### Security

- Managed auth + automatic session refresh. Tenant isolation: NGO records, projects, fuel transactions, task comments, project files. Rate limits: auth, discovery, match-consent. Signature-verify every inbound webhook.
- Provider keys (payment, LLM, code-hosting, work-tracking): managed secrets, never logged. The real LLM key never issued to volunteers; individual revocable credentials (decision-21).
- PII minimum-necessary: verification docs encrypted at rest, never public. GDPR: right-to-erasure (profile deleted, ledger anonymized) + standard DPA for EU NGOs. PCI out of scope — all card data handled by the processor.
- Append-only audit: fuel transactions, project status transitions, role changes, volunteer AI-credential issuance/revocation, work-tracking webhook-ingest provenance.

### Scalability

- Pilot: 100 NGOs, 200 volunteers, 50 active projects; year 1: 500 NGOs, 1000 volunteers, 200 active projects — within budgeted tiers.
- Frontend, backend, database auto-scale as managed services; heavy work (webhook fan-out, outbox drain, scheduled scans, AI streaming) on managed functions, scheduled where periodic; standalone compute only past function limits.

#### Anthropic workspace-cap scale path — RETIRED by decision-21

- Per-project workspaces gone; the cap never binds. Org-level rate/quota limits monitored.

### Reliability

- Uptime 99.5% (~3.6 hours/month). RTO 4 hours; RPO 24 hours (point-in-time recovery).
- Application errors + structured logs captured centrally; alerts on error-rate spikes.

### Accessibility

- WCAG 2.1 AA; full keyboard navigation; automated checks per change + a manual screen-reader pass pre-launch; contrast >= 4.5:1.

### Compatibility

- Last 2 versions: Chrome, Firefox, Safari, Edge. Responsive web (mobile, tablet, desktop); no native apps. English only at launch (→ RM-46).

---

## Technical Considerations

### System Architecture

Lovable-owned frontend; Supabase backend; Stripe fuel payments; GitHub App (repos, commit/PR ingest); Linear = task system of record; Anthropic = LLM. Volunteer builds reach Anthropic only via the LLM gateway on per-project virtual keys (REQ-009, decision-21): caps + real-time fuel gate, governance-prompt injection, per-request fuel metering; bodies inspected transiently, never persisted; the gateway alone holds the real key; hosting open (OD-6). Platform AI (Discovery + assistant REQ-033, both Opus, decision-13) calls Anthropic directly. Volunteer LLM and task paths disjoint; sole touchpoint: task-ID binding (REQ-034). One platform-owned Linear workspace per project (decision-20), never transferred; NGO panel = read-only mirror; status moves on PR merge via Linear's GitHub integration; out-of-band edits auto-reverted with an explanatory comment (REQ-026). GitHub Issues never written/managed by ai4good in v1 — dev-internal (REQ-008). Hard dependencies with defined user-visible degraded states: Supabase, Stripe, Anthropic, gateway, GitHub; a Linear outage only stales the panel — volunteers keep working, the mirror catches up. Greenfield; no migration.

### Technology Stack

- Frontend: TanStack Start (SSR) — React, TanStack Router + Query, Tailwind CSS, shadcn/ui; Lovable owns/syncs the repo.
- Backend: Supabase — Postgres + RLS, Auth, Storage, Realtime; Edge Functions (Deno) for webhooks, mutations, streaming; pg_cron for scheduled jobs; Drizzle ORM for application queries.
- NGO project files: S3-compatible store (Cloudflare R2) (REQ-032); short-TTL signed URLs after membership check only.
- Payments: Stripe — Checkout, webhooks, Stripe Tax (EU VAT invoices).
- AI: Anthropic — Opus (decision-13); volunteer traffic only via gateway virtual keys (decision-21).
- Task coordination: Linear — one free workspace per project, pre-created pool (creation manual, no API); webhooks feed the mirror; agents via Linear MCP.
- VCS: GitHub App — org/repo setup, push/PR ingest (cadence stats, commit-to-task linkage).
- Observability: Sentry (errors), Axiom or Logflare (logs), Lovable analytics; golden-signal gateway paging (REQ-029).
- CI/CD: GitHub Actions (test/lint); frontend deploys via Lovable, backend via Supabase CLI.

---

## Implementation Roadmap

**Headline estimate (post decisions 20/21/22 — authoritative): ≈ ~420h core / ~530h buffered → ~14-17 weeks for 2 engineers.** Plus 4-6 weeks pilot operations (3 internal full-cycle projects): public beta in ~5 months (2 engineers), ~7-8 months (one).

Holds only with the §11 cuts; the authoritative build decomposition lives in Linear (decision-20); phases = overview. Phases 1+2 = MVP launch; 3 = dashboards/comms/operations; 4 = pre-launch hardening; 5 = public beta + concierge launch.

- **Phase 1 — Foundation (weeks 1-3):** Auth, NGO org profile + audited founder-vetted action (decision-29/r3), volunteer profiles, logging baseline; nothing user-facing public. Exit: test NGO + volunteer complete profiles; admin vets NGO.
- **Phase 2 — Core MVP (weeks 4-7):** One project end-to-end: intake → credit-metered Discovery → editable scope → publish → triage screener → public listing → concierge enforce-match + volunteer consent (decision-28) → **fund-on-match** (not fund-on-publish) → repo + workspace provisioning → PRD bootstrap task + completion gate (decision-25) → fuel-metered build with fuel-low blockers → live-URL deploy → handoff with attribution. Exit: a real NGO + volunteer reach a deployed, reachable live URL; handoff ritual executed.
- **Phase 3 — Dashboards, Comms & Platform Operations (weeks 8-10):** v1-minimal NGO + volunteer dashboards, project comment thread, notifications, admin audit viewer, observability + alerting, incident response, automatic ledger reconciliation (decision-31), content moderation, abandonment/rematch; §11 items out. Exit: 3 pilot NGOs + 5 pilot volunteers run entire engagements in-platform, no out-of-band Slack/email; an injected money error auto-corrects, books balanced.
- **Phase 4 — Hardening & Beta Launch (weeks 11-13):** Coverage to 80%, end-to-end journey tests, accessibility fixes, vulnerability/pen review, tax/VAT invoicing, GDPR erasure, rate limiting, performance pass, onboarding emails, public landing page. Exit: no critical pen-test findings; p95 marketplace < 500ms at 100 RPS; accessibility checks pass in CI.
- **Phase 5 — Public Beta & Concierge Launch (weeks 14-16):** Launch checklist, invite-only → open rollout, internal goals analytics, concierge supply-funnel tooling, aging-open-project nudges, hand-match tool (first ~10-15 projects), v1.5 spec + backlog prioritization + retrospective. Exit: 10+ projects in flight; ≥1 public-beta handoff; ≥1 handed-off project still reachable at its live URL 30 days post-handoff.

---

## Out of Scope

1. **ai4good AI Proxy** — ships in v1 as the LLM gateway (decision-21, REQ-009): token validation, per-token velocity + budget caps, real-time fuel check, instant rotation, fingerprint tripwire, governance-prompt injection, per-request audit metadata (timestamp, IP, User-Agent, endpoint, payload size, Anthropic cost, fuel delta → RM-5); real key never exposed; bodies never persisted. Default policy: allow message calls, token counting, file upload, model listing; block persistent-resource endpoints + all DELETEs; batch per-project opt-in (→ RM-47). Cannot verify prompt relevance, machine-lock a token, or stop a determined token holder — caps + rotation bound damage. Hosting open (OD-6).
2. **Crypto / on-chain tokens** — fuel = Stripe-backed fiat credits only; no tradeable token, no on-chain ledger.
3. **Native mobile apps** — web-responsive only; iOS/Android not on the roadmap.
4. **i18n / multi-language UI** — English only at launch.
5. **Multi-volunteer teams per project** — one volunteer per project in v1 (→ RM-13).
6. **Embedded IDE / web-based code editor** — volunteers bring their own Claude Code / Lovable.
7. **NGO-to-NGO tool sharing marketplace** — repos public; no curated fork experience.
8. **Anonymous / unvetted NGOs publishing** — founder-vetting required in v1 (→ RM-6).
9. **Automated NGO verification** — manual admin review in v1.
10. **Hosted production environment for built tools** — volunteer/NGO choose deployment.
11. **Public star ratings for volunteers** — reputation = completion credit + badges; NGO satisfaction private, never displayed (→ RM-24).
12. **Platform skim on tips** — tips (REQ-022): NGO→volunteer, 0% cut.
13. **Pay-gated Discovery in v1** — free daily per-NGO allowance (10/day unverified, 30/day verified; resets 00:00 UTC, no rollover — decisions 8/11); exhausted: verify, fund fuel — continues immediately (REQ-006) — or wait; funded projects draw on fuel from the outset ("Funded → all-$"); amounts revisited if abuse exceeds the grant.
13a. **Paid "Discovery wallet"** — out v1 + v1.5 (decision-8); post-allowance = regular project-fuel purchase (single-pot).
14. **ai4good-funded Lovable infrastructure** — the NGO owns/pays its Lovable workspace; never billed against fuel; the platform does meter/cap per-task usage and surfaces the NGO's Lovable credit balance during orchestration (REQ-021/028).
15. **Multi-tool fuel metering** — fuel = Anthropic (Claude Code) only; other tools NGO-direct or volunteer-personal unless they ship metering-compatible APIs.
16. **Lovable credit reselling through ai4good** — NGOs buy from Lovable directly; deep-linked "Top up" CTA only (→ RM-28).
17. **Service-level agreements / completion guarantees** — none: ghosting, fuel burn sans deliverable, infeasible scopes possible; the platform bounds financial risk (per-project fuel caps), surfaces stalls, never underwrites.
18. **Closed-source / proprietary builds** — MIT (or compatible permissive) default; closed-source not served.
19. **Fuel-spend insurance / refund-on-no-deliverable** — consumed fuel non-refundable even if nothing ships; NGOs warned at every top-up.
20. **Fully-automated Anthropic key provisioning** — moot (decision-21): no per-project Anthropic keys exist; virtual keys auto-issued at kickoff.
21. **Per-request prompt/response content capture** — permanently out (privacy posture): metadata only (tokens, model, timestamps, cost); bodies never persisted; deliberate, on record.
22. **Anthropic-side "agent budget" enforcement** — moot (decision-21): enforcement structural at the gateway.
23. **OpenTelemetry prompt-content export from Claude Code** — ai4good never requests/processes/aggregates volunteer prompt-content telemetry; independent OTel allowed.
24. **v1 keeps in place of the decision-10 deferrals** — per-IP/per-surface throttles (not full rate-limiting); allow-list + don't-advertise + waitlist page (not gradual rollout); a handful of internal reports (not an analytics dashboard); secret-scanning + push-protection (REQ-031, not takedown UI); automated tax calculation + hosted invoices + tax-ID field (not multi-jurisdiction registration); consent + sub-processor list + manual erasure runbook (not self-serve GDPR erasure/export UI; no EU/public signup until self-serve) (→ RM-36, RM-48). Multi-org Anthropic router retired (decision-21).
25. **Automated PII / secret pre-scan on uploaded reference files (REQ-032)** — v1 = governance-by-disclosure: the NGO acknowledges the data-responsibility rule; no scan (→ RM-37).
26. **Automated spend-anomaly detection engine (REQ-009)** — v1: deterministic loss caps (no cash-out, $200 first-fund cap, per-key caps + fuel gate), NGO instant "revoke access now", daily human money-dashboard review (→ RM-5).

---

## MVP Scope & Post-MVP Roadmap

Authoritative reference: Out of Scope=never built; this section=when features ship.

### v1 MVP (public beta launch)

**Decision summary (2026-06-03 pivot + decisions 8–35; later decision wins on conflict; this is a trail — operative detail lives in the cited REQs where an entry names one):**
- **Pivot (2026-06-03)** — Deliverable=deployed NGO-self-maintainable tool, not a repo; Lovable=build vehicle + durable home; Discovery classifies data-sensitivity tiers (highest=fixtures-only during build). No cash-out: fuel=non-cash project-scoped credit. Nonprofit + blended economics; real ToS; concierge-first launch. Added REQ-027/029/030/031.
- **8** — Unified fuel + free Discovery allowance (10/day unverified, 30/day vetted). Email verification=Discovery floor; vetting=publish wall. Hard acknowledgments at first funding + first match acceptance. No paid Discovery wallet, v1 or v1.5.
- **9** — Git-as-truth PM tree. Reversed by 20; trail only.
- **10** — Capability-preserving build trim; six reshapes, requirements intact; deferred slice=v1.5 (CRM, rate limiting, rollout tooling, analytics, takedown UI, tax registration, self-serve erasure).
- **11** — Two-layer money: funded fuel dollar-pegged (15% skim); free Discovery on context-weighted daily credits, no rollover; funding auto-flips Discovery to fuel; credits NGO-bound, fuel project-bound. Mechanics: REQ-004/006.
- **12** — Post-Discovery NGO assistant (REQ-033), fuel-metered, read-only.
- **13** — Opus for Discovery + the assistant; daily allowance caps worst-case spend.
- **14** — Spend-anomaly engine deferred to v1.5; caps hold the loss ceiling.
- **15** — Comms trimmed to one project comment thread; full channel v1.5.
- **16** — CR anti-distraction guardrails *(surface→v1.5 by 29/r1; principle governs the v1 informal protocol, REQ-025)*.
- **17** — `paused` state removed; pause=support conversation (substitutes: pre-match unpublish/cancel; mid-build admin access-off + note, or cancellation); returns v1.5 on first real request.
- **19** — Track B deferred *(superseded by 23)*.
- **20** — Linear replaces the git-as-truth PM tree (reverses decision-9): workspace-per-project from a concierge pool; status moves only via GitHub integration on PR merge; detect-and-revert; NGO visibility panel-only. Model: REQ-026.
- **21** — LLM gateway with virtual keys in v1 (rewrites REQ-009): show-once keys, caps, real-time fuel gate, inline metering; prompt bodies never persisted. Hosting=OD-6.
- **22** — Attribution capture in v1 (REQ-034/035): burn binds to tasks where derivable (telemetry, never gating); handoff attribution step; health checks from real signals.
- **23 (2026-07-07)** — Single delivery model; Track B removed altogether: taxonomy deleted, waitlist deleted; non-fits declined at Discovery, declines recorded.
- **24 (2026-07-07)** — (a) decomposition gated *(superseded by 25)*; (b) Skill ENFORCES pull-then-complete (REQ-028); (c) handoff repo-transfer removed; (d) Discovery file reads cost zero credits.
- **25 (2026-07-08)** — Dev-authored project PRD + automated completion gate (REQ-036); build tree decomposes from the gated PRD; coordinator review→pilot spot-check. Threshold=OD-7.
- **26 (2026-07-08)** — Codex-debated simplification pass: cadence minimal, badges→tags, cash-buffer alert→policy, canary/self-audit→v1.5 + org-settings guard, notification batching→v1.5 + atomic-outbox guard, uniform blocker rule, one money dashboard + all-surfaces metering audit, runbooks 6→3 + cards, file-sync→v1.5, money corrections via one guarded function. c7 assistant deferral REJECTED (REQ-033 stays); c8 CONFIRMED (60/90-day health→v1.5; day-45–60 founder check-in instead).
- **27 (2026-07-08)** — Public-only v1: private repos/visibility removed entirely; confidential-codebase needs declined at Discovery. Tier-2 *data* still served via fixtures-only. Retained admin mechanics: org-namespace guard; break-glass repo-hide.
- **28 (2026-07-08)** — Concierge **enforce-match** (organic marketplace→v1.5); single-seat NGO accounts + **single-dev projects**; donation flow removed — leftover credit auto-applies at any funding checkout. REJECTED: US-only pilot (VAT stays), Google OAuth cut (stays).
- **29 (2026-07-08)** — Flows #7/#8 removed. CRs→v1.5 informal protocol (amends 16); public profile/badge→v1.5 (append-only credit events); verification→ONE audited founder-vetted action; triage→**automated screener + founder exception queue** (Tier-2 never auto; threshold=OD-8). REJECTED: in-app notification center stays v1.
- **30 (2026-07-08)** — Provider truth drives the gauges: Anthropic's reported usage per response; aggregate reconciliation on a tight pull (minutes); Lovable standing trigger for pulled data. Flow #9: zero refunds of any kind; only money-out=Stripe's dispute rail.
- **31 (2026-07-08)** — Ledger corrections fully automatic: reconciliation auto-conforms to provider truth (Stripe wins money-in, Anthropic wins AI spend); undecidable drift pages, never guessed.
- **32 (2026-07-08)** — Manual-flows verdicts through #20 (#21–#25 pending). APPROVED backstops: #3 chargeback adjudication, #12 Discovery-failure escalation, #13 outbox DLQ, #14 incident command (steps to be scripted one-click), #15 blocker 7-day rung. REMOVED: #2 credit grants, #4 collusion, #5 AUP saga, #7 audited-reversal requirement, #8 handoff-dispute review, #9 goodwill refund, #10 human ledger correction. MOOT: #6 (public-only, d27). POSTPONED post-MVP: #17 counsel deliverables, #18 Anthropic commercial negotiation, #19 formal P&L/runway cadence, #20 Linear written blessing (paid tier fallback); to later stages: #11 chargeback reserve, #16 DMCA registration/escalation docs (the CSAM statutory duty exists by law regardless).
- **34 (2026-07-09)** — Free-phase Discovery scope guardrails: prompt scope line, turn ceiling, off-topic visibility flag — FREE credits only. Funded Discovery + assistant unguarded; per-turn cost display + fuel gauge=the controls.
- **35 (2026-07-09)** — Platform Lovable member seat (build-phase only) automates volunteer offboarding at handoff/abandonment/AUP; platform exits at handoff ("last one out"). [VERIFY on first pilot]: member add/remove/self-remove via API/MCP; fallback=manual NGO removal.
- **36 (2026-07-11)** — Volunteer candidacy precedes matching (amends 28): volunteers mark interest in-product on public projects; each open project gets an assimilation window (pilot-tuned) to gather candidates before the concierge enforce-match draws from the pool. Candidacies feed the admin match log only — no NGO-facing queue. GitHub link mandatory at volunteer signup (was at-first-consent); platform-org membership still waits for first match consent.

**Launch strategy — concierge-first:** supply liquidity=#1 launch gate; no organic browse first. Pre-recruit a ~20–30-volunteer bench, hand-match the first ~10–15 curated projects end-to-end, then open organic browse. v1 hooks: supply-funnel metric, aging nudge, concierge-match tooling (→RM-49).

**Foundation:**
- REQ-001 — Auth: email + GitHub + Google.
- REQ-002 minimal — NGO trust=audited founder-vetted action (decision-29/r3) (→RM-6).
- REQ-003 — Project Need intake.
- REQ-007 — Volunteer profile + concierge matching (enforce-match, one-click consent, match log — decision-28).
- REQ-011 minimal — Public read-only newest-first listings (→RM-8, RM-21).

**Discovery & Publishing:**
- REQ-004 — Discovery Agent: free within the daily allowance; complexity tier only, no dollar estimate.
- REQ-005 — Scope doc + publishing into triage.
- REQ-023 — Automated triage screener + founder exception queue (decision-29/r4); threshold=OD-8.

**Funding & Money:**
- REQ-006 — Stripe top-up + fuel ledger + match-to-fund, non-cash no-cash-out; leftover auto-applies at checkouts; no donation flow; chargeback handling + first-fund caps (→RM-19); no refunds (→RM-7).
- REQ-022 — No tips UI at handoff (→RM-11).

**Project Execution:**
- REQ-008 — GitHub repo per project in the platform org; dev-internal issues only.
- REQ-009 — LLM gateway per decision-21; hosting=OD-6 (→RM-5).
- REQ-010 — Project page + cadence stats + dual fuel meters.
- REQ-021 — Lovable=deliverable vehicle; Claude Code orchestrates behind a driver abstraction; manual status widget (→RM-27).
- REQ-024 — Orthogonal blockers + task-anchored clarifications.
- REQ-025 minimal — Informal scope-addition protocol (decision-29/r1) (→RM-10).
- REQ-026 — Task management via Linear per decision-20.
- REQ-028 — ai4good Claude Code Skill: install, bootstrap, task binding, commands, conventions + the Lovable orchestration layer.
- REQ-034 — Task-level attribution per decision-22 (→RM-39).
- REQ-035 — Handoff attribution + 30-day ping + day-45–60 founder check-in (→RM-25, RM-40).

**Comms & Dashboards (minimal v1):**
- REQ-013 minimal — NGO dashboard: projects + fuel + task progress + "Action needed" rail (→RM-42).
- REQ-014 minimal — Volunteer dashboard: projects + fuel gauge + completion-credit events (→RM-3).
- REQ-015 — Project comment thread (→RM-43).
- REQ-016 minimal — Event notifications, fixed defaults (→RM-45).

**Handoff:**
- REQ-012 minimal — Checklist + sign-off; permission adjustment (no transfer); access termination + tree snapshot; REQ-035 attribution step (→RM-11).

Additional post-MVP items with no other v1-doc mention: →RM-50, RM-51, RM-52, RM-53, RM-56, RM-57, RM-59 (roadmap.md).

### v1 design rationale: Claude Code orchestrates Lovable (v1 architecture)

The volunteer's local Claude Code runs the ai4good Skill, connected to Linear (tasks), Lovable (build), and the platform API (context, blockers, comments): pull next task, decide Lovable-vs-local, prompt Lovable, review, test, iterate; status lands only on PR merge. Why: single source of intent (the volunteer session=canonical record — metering, scope enforcement, audit stay authoritative); structural cost enforcement at the point of spend (per-task credit cap, call logging, balance surfacing); per-volunteer Lovable identity; contained research-preview risk (driver abstraction + manual dual-rail fallback degrade a Lovable break to manual work, never a dead build). (→RM-32, RM-33)

### Permanently out of scope (will not build)

Firm "no" — prevents re-litigation:
- Crypto, on-chain tokens, tradeable fuel — Stripe-backed fiat only.
- Native mobile apps — web-responsive only.
- Closed-source/proprietary builds — all projects MIT-licensed by default.
- Service-level agreements/completion guarantees — contradicts the Platform Promise.
- Fuel-spend insurance/refund-on-no-deliverable — spent tokens cannot be un-spent.
- Platform skim on volunteer tips — 0%.
- Hosted production environment for NGO-built tools — handoff=NGO ownership.
- NGO-to-NGO tool-sharing marketplace — out of mission.
- Multi-tool fuel metering — only Anthropic spend routes through fuel.
- Collection of volunteer prompt content — privacy posture.

### Open issues that should be resolved before public launch

Decisions/policies needing external (legal, accounting, business) input — not features:
1. Fuel legal/tax characterization — DECIDED: prepaid, fully-consumable, non-cash-refundable service credit; one-line counsel confirmation still wanted.
2. Refund/donation/chargeback mechanics — dissolved: no refunds (flow #9), no donation flow (decision-28), chargeback-after-consumption handled (→RM-19).
3. Abandonment/rematch state machine — RESOLVED as REQ-027.
4. Sensitive-data vs open-source conflict — RESOLVED: public MIT only (decision-27) (→RM-2); Tier-2 fixtures-only; acceptable-use document still owed (ops work, not a launch blocker).
5. Admin staffing model at scale — OPEN: manual gates hold at pilot volume, not the year-1 target.
6. Anthropic commercial readiness — pilot on self-serve billing + default limits (→RM-60).
7. Deployment ownership post-handoff — DECIDED: Lovable hosts, NGO owns the workspace (~$25/mo, disclosed); live deployment=handoff precondition; 30-day-alive tracked.
8. Entity type — DECIDED: nonprofit (fiscal sponsorship now, own 501(c)(3) later).
9. Counsel deliverables — pilot on the plain-language draft ToS, risk accepted (→RM-1).
10. Blended P&L + grant runway — daily money dashboard suffices at pilot (→RM-61).

## Open Questions & Risks

### Open Questions

**Resolved/superseded (trail only):** Q1+Q8: moot per decision-21 (REQ-009) — volunteer AI access platform-managed, attributed per volunteer, instantly revocable; no external-provisioning dependency remains. Q2: resolved; no product impact. Q5: v1 reward is completion credit+"Shipped first tool" badge only (REQ-014); NGO tips at handoff→v1.5; honoraria revisited only if Goal 2 underperforms. Q6: Discovery free within per-NGO daily credits (10/day unverified, 30/day verified); funding from draft allowed; funded Discovery dollar-metered (REQ-002/004/006); `kyc_verified` lift→v1.5.

**Still open:**

- **Q3, NGO verification:** v1: founder-vetted flag (decision-29/r3). v1.5 bar: `verified` needs registration document, public reference link, manual admin review; `kyc_verified` adds tax-exempt documentation+NGO-admin identity check (provider selected). Open: which jurisdictions' tax-exempt documents v1 accepts (US 501(c)(3), UK Charity Commission, EU equivalents).
- **Q4, skim rate:** flat 15% vs NGO-size-tiered vs sub-$200 waivers. Owner: business; due pre-public-launch; affects revenue model.
- **Q7, platform-level Lovable usage visibility:** v1: the NGO's Lovable balance is read only with the volunteer's consent, during the volunteer's own session, to enforce the per-task cap (REQ-021/028); standing cross-workspace visibility deferred (only broad per-user authorization today); revisit when usage-only scoped access ships — would replace manual + per-session capture, could add build-cadence analytics.

#### Open decisions register — founder calls still owed (decisions 20/21/22 fold-in; none block the PRD-dissection pass, each blocks only the build item named)

- OD-1: Reviewer identity+merge authority per project (coordinator/peer/agent-assisted human click; governance, not plumbing)→REQ-026 merge flow+reviewer role
- OD-2: NGO Status-Panel scope+workspace onboarding→REQ-010/013 panel
- OD-3: Volunteer spend-cap+low-fuel warning levels→REQ-009
- OD-4: Misuse-detection enforcement sensitivity→REQ-009
- OD-5: Deferred second spend-verification layer scope→v1.5
- OD-6: Usage-metering operational home (founder: deferred)→REQ-009
- OD-7: PRD completion-gate threshold+scorer configuration (decision-25; pilot-tuned)→REQ-036
- OD-8: Triage-screener confidence threshold+model configuration (decision-29/r4; pilot-tuned)→REQ-023

### Risks & Mitigation

Rows: risk (severity): mitigation→contingency.

- Volunteers exceed fuel without enforcement (High): low-balance alerts, hard zero cut-off, transparent ledger→NGO top-up; platform absorbs week-1 pilot overruns
- AI consumes fuel, no viable deliverable (High): first-match disclaimer, per-project fuel cap bounds exposure, user-test checkpoints during builds, Goal 4 target, burn-per-deliverable on the NGO panel (REQ-034)→transparency+post-mortem; no refund; handoff attribution records the outcome (REQ-035)
- Malicious NGO posts commercial need (High): founder vetting gate+triage screener (Tier-2/non-decided→founder)→decline, deactivate; policy documented
- Volunteers ghost mid-project (High): 14-day inactivity reminder→21-day auto-release→re-opened; NGO can request re-match; responsiveness on project page
- Payment succeeds, fuel not credited (High): tight-cadence reconciliation detects+auto-corrects to Stripe truth (decision-31)→undecidable-cases page
- Anthropic outage stops Discovery (High): "Service degraded" banner, queued intakes, manual scope option→alternate provider post-v1
- NGOs sign up, never fund (Medium): free Discovery funnel; $50 minimum at match-acceptance, not publish; abandonment detection→loosen if funnel-killing; unfunded projects tagged clearly
- NGO expects SLA/completion guarantee (Medium): mandatory no-SLA acknowledgment at signup+every match acceptance; Promise link per top-up→admin outreach; next-match priority
- AI code license/quality issues (Medium): MIT default (Platform Promise); first-match disclaimer carries volunteer IP attestation (REQ-007, no v1 CLA); handoff requires passing lint+tests (REQ-012)→NGO may reject; remediation playbook published
- Regulators deem verification documents sensitive PII (Medium): restricted access; DPA available→explicit consent+data-minimization review
- Fuel-cost inflation, Anthropic price rises (Medium): percentage skim scales; changes communicated to NGOs in advance→monthly rate-card adjustment
- Lovable security incident hits integration (Medium): exposure bounded (decision-35): build-phase member seat only (exits at handoff; build Tier-2 fixtures-only)+volunteers' own accounts→rotate/exit platform seats; pause Lovable-track recommendations until remediation confirmed; in-flight projects continue on the fallback build path (REQ-021)

---
