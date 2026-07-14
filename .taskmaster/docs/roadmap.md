# ai4good — Post-MVP Roadmap

> Everything deferred out of v1, extracted from prd-new.md. The MVP spec (prd-mvp.md) references items here as RM-N.

## v1.5 (3–6 months post-launch)

### RM-3: Volunteer public profile, badge display & reputation dashboard
**Source:** Platform Promise §5; REQ-012; REQ-014
**Trigger/Gate:** their audiences (organic NGOs, algorithmic matching) arrive with the v1.5 marketplace (decision-29/r2)
No public profile page or badge display in v1. Public display and badges arrive in v1.5. Completion credit is captured from day one as append-only per-project events (volunteer, project, handoff-accepted timestamp, first-tool eligibility), so v1.5 reconstructs the full display without archaeology. Copy is honest: "credit recorded from day one; public reputation display arrives in v1.5." At handoff the volunteer's completion-credit event also gets a private confirmation (public display + badge is the v1.5 upgrade). v1.5 additionally ships: a multi-badge engine (5/10 tools shipped, active contributor, cause specialist); a handoff history view; opt-in NGO-authored testimonials; cause-specialization tags.

### RM-5: Automated spend-anomaly detection engine
**Source:** Platform Promise §8; REQ-009; REQ-024; Out of Scope #26
**Trigger/Gate:** v1.5 (decision-14); trigger: organic/EU signup
Deferred to v1.5: v1 keeps deterministic loss caps (no cash-out, the $200 first-fund cap, per-key caps + the gateway's real-time fuel gate), the NGO's instant "revoke access now" action, and daily human review of the money dashboard. Automated scoring only reduced detection latency, which does not bind at the concierge pilot's ~10–15 hand-vetted projects. If built, it lands as a gateway escalation rung. Audit metadata per request (timestamp, IP, User-Agent, endpoint, payload size, Anthropic cost, fuel delta) is captured in v1 for this future engine. Spend-anomaly review (REQ-024) and a second spend-anomaly signal via provider alert emails (RM-52) are later layers on top of this engine.

### RM-6: NGO self-serve verification pipeline + KYC tier
**Source:** Platform Promise §8; REQ-002; Out of Scope #8
**Trigger/Gate:** v1.5 gate: before ANY non-concierge admission path opens (organic NGO signup, EU/UK signup); v2 trigger (auto-approval): volume shows KYC-verified NGOs reliably pass (see RM-57)
The self-serve verification pipeline — doc upload UI, pending-review queue, document viewer, public badge — is deferred to v1.5, because vetting already happens in concierge onboarding in v1: the founder talks to every pilot NGO before admitting it. A document-verified badge returns with the v1.5 pipeline. The KYC tier (self-serve verification upload, KYC submission, auto-top-up controls) stays v1.5. `verified` requires a registration document, a public reference link, and manual admin review; `kyc_verified` adds tax-exempt documentation plus an identity check on the NGO admin. Trigger (v1.5 list): the verification queue outgrows one admin's batch capacity.

### RM-7: Auto-top-up
**Source:** Platform Promise §8; REQ-006
**Trigger/Gate:** v1.5 — pilot NGOs report fuel-low interrupts as friction; adoption when pitched manually exceeds 30%
v1 fuel top-up is manual: the fuel-low warning (20%) and blocker (0%) drive the NGO to top up from the project page. Off-session charging adds consent, cap, dispute, and failure-recovery machinery; build it only after pilot fuel-low patterns confirm demand. Auto-top-up events join the notification taxonomy once built.

### RM-8: Organic/self-serve marketplace — volunteer browse, filter, sort, apply flow; NGO applicant-review queue + auto-approve settings
**Source:** Goal 5; Story 3; REQ-005.5; REQ-007; REQ-011
**Trigger/Gate:** v1.5 — gate: concierge cohort proven, organic browse opens
Self-serve browse + apply, the NGO applicant-review queue, and auto-approve settings are deferred to v1.5 (gate: concierge cohort proven). Volunteer-facing featuring, filters, sort options, overlap badges, Apply + cover note, and self-serve application match states (invited/consented/declined/expired/released equivalents for organic apply) all arrive with organic browse. "First apply" joins the volunteer activation funnel alongside "first match consent" once organic browse opens.

### RM-9: LLM gateway escalation ladder (documented, not built in v1)
**Source:** Story 4; REQ-009 (OD-5)
**Trigger/Gate:** v1.5 (OD-5) for the first rungs; last rung trigger: "probably never"
Abuse protections beyond virtual keys, caps, inline metering, and the fuel gate are documented but not built in v1 (listed so the decision not to surveil stays visible): activity-vs-burn reconciliation on shape signals only, phase-aware (trigger: real ledger anomalies — OD-5); marker rotation with a mandatory grace window (trigger: adverse offboarding or a leak); a short-lived per-volunteer signed token checked pairwise against the key (trigger: repeated anomalies that conversations don't resolve); sampled content classification (trigger: probably never).

### RM-10: Structured Change Requests (CR) — v1.5 surface
**Source:** REQ-025 (v1.5 spec, decision-29/r1); REQ-015; REQ-016; REQ-026; REQ-028
**Trigger/Gate:** v1.5 (decision-29/r1, amending decision-16); "Full Change-Request workflow UI" trigger: pilot NGOs find the minimal CR surface too thin; "AI Change-Request Agent" trigger: NGOs find the raw CR flow too thin and need help articulating
v1.5 restores the structured surface (the original REQ-025 design). NGOs raise structured Change Requests (CRs) for additional scope while a project is in progress; the assigned volunteer accepts or declines — a binary decision, not an estimation exercise. Fuel is progressive: no upfront per-CR quote or top-up; accepted CRs join the working scope and burn from the existing pool.

**Principles (locked):** the NGO raises, the volunteer decides — keeping power symmetric; the volunteer is the work-acceptance authority. No upfront estimation by the volunteer. Declining is a legitimate boundary and never penalizes public completion credit.

**Flow:** the NGO submits a 3-field form (title, description, rationale), available only while in progress. The CR surfaces as an actionable row on the project page plus a notification carrying inline Accept/Decline. Accept → the platform creates one top-priority task under a "Change Request: [title]" parent — accepted CR work blocks handoff exactly like original scope; the volunteer may split it into sub-tasks (inheriting top priority), and downgrading one is an explicit, history-visible action. No GitHub issues are created. Decline → recorded with an optional note; the NGO may revise and re-raise. Work proceeds under the existing fuel systems with no CR-level instrumentation; completion is implicit.

**Guardrails (decision-16):** a CR never interrupts and never auto-assigns work: the notification is low-tone (in-app + a CR inbox; no per-CR email), surfaced at session start or between tasks; only Accept creates the task. One open CR per project — the NGO cannot submit another until the volunteer decides the current one. Decline is penalty-free and presented as a normal choice.

Also folded in here: the CR inbox on the Skill session banner; the structured CR notification taxonomy (dedicated CR events); the actionable CR row in the per-project comment thread; and an AI Change-Request Agent that helps NGOs articulate a CR (v1.5, per the roadmap trigger list).

### RM-11: Volunteer tips at handoff (Stripe Connect for Volunteer Tips)
**Source:** REQ-022; Story 6; REQ-012; REQ-014 (NGO-satisfaction tie-in)
**Trigger/Gate:** v1.5 — build trigger: the first pilot handoff where an NGO asks how to thank the volunteer with money
NGOs may send optional gratitude tips directly to volunteers at handoff; the platform takes 0% on tips — only standard processing fees apply. Deferred because payout onboarding, dispute/refund handling, and tax reporting are meaningful infrastructure and not load-bearing for the core thesis; v1 handoff presents no tip CTA. When built: volunteer opt-in from their dashboard, gated to at least one completed handoff; preset and custom amounts; tips recorded separately from fuel; a held-intent flow (30 days to claim, else refund) when the volunteer has not onboarded; tax forms handled by the payment provider. Arrives alongside the tips/satisfaction handoff UX (see RM-24).

### RM-12: Teammate invites, per-NGO roles, multi-NGO membership
**Source:** REQ-001
**Trigger/Gate:** v1.5 (the two-layer authorization model already lives in the schema, so v1.5 adds rows, not migrations)
v1 is single-seat NGO (decision-28): one NGO = one account, and the org contact who signed up performs every NGO-side action. Teammate invites, per-NGO roles, and multi-NGO membership are v1.5.

### RM-14: AUP enforcement machinery — suspended account state, staged-teardown saga, lazy per-project rebuild
**Source:** REQ-001; REQ-007; REQ-030
**Trigger/Gate:** v1.5
A distinct `suspended` account state arrives with the v1.5 suspension machinery (v1 uses only active/deactivated). REQ-007's AUP enforcement is v1-minimal: the admin deactivates the account and revokes keys, with remaining access removed via a short manual checklist; the orchestrated staged-teardown saga and lazy per-project rebuild machinery are v1.5. REQ-030 notes account deactivation has a documented v1 recovery playbook (re-enable and re-issue keys, manually); the suspension state machine itself is v1.5.

### RM-15: Lovable-only / Claude-Code-only kickoff modes
**Source:** REQ-004
**Trigger/Gate:** v1.5 — Lovable-only-suitable projects appear at meaningful volume
v1 always emits the split workflow (all matched v1 projects require an Anthropic fuel kickoff). Lovable-only and Claude-Code-only kickoff modes, and a kickoff path without Anthropic fuel, are reserved post-v1.

### RM-17: Project pause/resume (`paused` lifecycle state)
**Source:** REQ-005.5 (decision-17); REQ-027
**Trigger/Gate:** v1.5 — first real NGO pause request
Decision-17: no `paused` state in v1. Pause/resume carried disproportionate cross-cutting cost for a concierge pilot: restore-state edge cases, funding-clock freezes, special-casing in three scheduled jobs, key deactivate/reactivate side effects. v1 workaround: pre-match, the NGO unpublishes or cancels the match; mid-build, an admin turns off access and leaves a note, or the project is cancelled. Reinstated in v1.5 on first real demand.

### RM-18: Full double-entry accounting
**Source:** REQ-006
**Trigger/Gate:** v1.5 — once an accountant defines the chart of accounts
Full double-entry accounting is a v1.5 upgrade. v1 relies on internal arithmetic invariants (control totals) that verify nightly and auto-repair by the provider-truth rules.

### RM-20: Full anti-Sybil program / collusion detection
**Source:** REQ-006 (decision-26 + founder verdict)
**Trigger/Gate:** v1.5
Collusion/shared-fingerprint detection is removed from v1 — concierge hand-vetting of every pairing + no-cash-out + caps are the v1 control; the full anti-Sybil program is v1.5.

### RM-21: Match-score algorithm + breakdown UI
**Source:** REQ-007; REQ-011
**Trigger/Gate:** v1.5 — "why did this show up for me" feedback; more than 20 active marketplace projects
Deferred to v1.5 with organic browse: overlap badges and the match score (decision-26), and a deterministic match score with a visible breakdown.

### RM-22: Key-leak canary + volunteer self-audit usage view
**Source:** REQ-009 (decision-26); REQ-014
**Trigger/Gate:** v1.5 — gate: organic volunteer signup
The key-leak canary and the volunteer self-audit usage view are deferred to v1.5 — at hand-vetted pilot scale, caps + project binding + the fuel gate already bound exposure.

### RM-23: Cadence stats enhancements — 12-week commit sparkline, task close rate, Active/Quiet/Stalled health badge
**Source:** REQ-010; REQ-013
**Trigger/Gate:** v1.5 — presentation polish at 15-project scale
Deferred to v1.5: the 12-week commit sparkline, task close rate, and the Active/Quiet/Stalled health badge replicated on cards and dashboards.

### RM-24: NGO-satisfaction signal → private matching weight
**Source:** REQ-011; REQ-014; Out of Scope #11
**Trigger/Gate:** v1.5, arrives with the tips/satisfaction handoff UX; per Out of Scope #11, feeds a v2 matching weight
NGO-satisfaction signal collection is deferred to v1.5: no satisfaction modal at handoff and no admin-visible aggregate in v1; the volunteer never sees their own satisfaction scores (avoids anxiety and gaming). Once captured, NGO satisfaction is a private weighting component in matching (v1.5 with organic browse per REQ-011; described elsewhere as a v2 matching weight) — never displayed publicly.

### RM-25: 60/90-day automated health checks + synthesis
**Source:** REQ-012; REQ-016; REQ-035 (decision-26/c8)
**Trigger/Gate:** v1.5 (decision-26/c8, founder-confirmed 2026-07-08)
The 60/90-day health layer is v1.5; v1's longitudinal signal is only the structured day-45–60 founder check-in. v1.5 automates the 60/90-day checks plus real-signal synthesis, designed from what the manual check-ins actually reveal. The 60-day jumpstart email moves to v1.5 with the health layer.

### RM-27: Lovable inbound email parser
**Source:** REQ-021; REQ-016
**Trigger/Gate:** v1.5 — manual widget toggling proves annoying; the email format is stable across 2+ projects
Automatic detection of Lovable credit status by parsing Lovable's notification emails is deferred to v1.5: it is brittle, needs inbound-mail infrastructure, adds NGO setup friction, and the v1 manual widget already yields the same product behavior.

### RM-31: Local reference-file sync command (Skill helper)
**Source:** REQ-028; REQ-032
**Trigger/Gate:** v1.5 (decision-26)
The local reference-file sync command for the Claude Code Skill is v1.5; in v1 volunteers download reference files from the project page.

### RM-32: Replit as a second sanctioned builder platform
**Source:** REQ-028; v1 design rationale
**Trigger/Gate:** v1.5 — an ownership-transfer need Lovable cannot meet, or Lovable reliability falters
Replit as a second builder platform is deferred (v1.5+).

### RM-34: Golden-signal dashboard suite
**Source:** REQ-029 (decision-26)
**Trigger/Gate:** v1.5
The broader golden-signal dashboard suite is v1.5; v1 ships the ONE money dashboard (funding, consumption, platform share, reconciliation, chargebacks) plus baseline error tracking and structured logging.

### RM-35: Full six operational runbooks
**Source:** REQ-030
**Trigger/Gate:** v1.5
v1 authors three runbooks (backup restore, gateway key rotation/mass revocation, builder-tool outage fallback) plus one-page incident cards for the rest (credential-compromise break-glass, PM-tool outage degraded mode, chargeback spike). The full six runbooks are v1.5.

### RM-36: Content moderation & takedown surface
**Source:** REQ-031; Out of Scope #24
**Trigger/Gate:** v1.5 — gate: before organic/EU signup
v1.5 adds: a universal "Report" affordance (repos / Discovery output / messages) feeding an abuse-review queue; a rapid, reversible takedown state (repo private + "under review", decoupled from suspension); DMCA agent registration + a documented CSAM→NCMEC escalation; AUP suspension optionally flips the project's repos private. v1 keeps only secret-scanning + push-protection org-wide, plus a founder break-glass path to hide a repo.

### RM-37: Automated PII/secret pre-scan on uploaded reference files
**Source:** REQ-032; Out of Scope #25
**Trigger/Gate:** v1.5 trigger: an observed incident of sensitive data uploaded against the disclosure, or EU/public signup
v1 is governance-by-disclosure (the NGO acknowledges the data-responsibility rule; ai4good does not scan). An automated PII/secret pre-scan on uploaded reference files is a v1.5 option.

### RM-38: Proactive/push digests & scheduled summaries (NGO project assistant)
**Source:** REQ-033
**Trigger/Gate:** v1.5
v1 is on-demand text Q&A only; proactive/push digests and scheduled summaries for the post-Discovery NGO project assistant are v1.5.

### RM-39: Attribution reconciliation surfaces
**Source:** REQ-034
**Trigger/Gate:** v1.5 — coordinator wants unattributed-share visibility and per-task cost baselines feeding Discovery estimates
Analysis surfaces trail in v1.5: coordinator reconciliation surfaces (per-project unattributed %, broken/stale-binding signals) plus per-task cost baselines feeding Discovery estimates. v1 ships capture only, plus the NGO burn-per-deliverable view.

### RM-42: NGO dashboard v1.5 enhancements
**Source:** REQ-013
**Trigger/Gate:** v1.5 — engagement metrics show demand for more reputation surface
v1.5 adds: a 30-day activity feed; a KYC upsell banner for verified NGOs; a Lovable-enabled-projects rail; opt-in NGO testimonial authoring.

### RM-43: Full real-time project comment channel
**Source:** REQ-015; REQ-016
**Trigger/Gate:** v1.5 — before organic/EU signup; the minimal thread feels lacking
The full Slack-style channel is deferred to v1.5: a real-time channel with threaded replies; @-mentions, presence, typing indicators; markdown, code blocks, image attachments; full-text search. Channel-mention notifications join the taxonomy once built.

### RM-45: Per-user notification preferences, batching, dedup/digest
**Source:** REQ-016
**Trigger/Gate:** v1.5 — first complaint about email frequency; gate: reported notification fatigue
The per-user preference UI is v1.5: per-event email toggles, quiet hours, digest mode, batching + custom rules, and the time-window coalescing/dedup machinery.

### RM-47: Gateway allowlists, payload bounds, IP/geo/User-Agent anomaly flags
**Source:** Out of Scope #1 (ai4good AI Proxy)
**Trigger/Gate:** v1.5 — required before organic signup; real ledger anomalies
Allowlists beyond the v1 defaults, payload size bounds, and IP/geo/User-Agent anomaly flags defer to v1.5, alongside ledger-reconciliation and velocity-check hardening on the gateway.

### RM-48: Decision-10 v1.5 deferrals bundle
**Source:** Out of Scope #24
**Trigger/Gate:** v1.5 — gate: before organic/EU signup
Full rate-limiting infrastructure (v1 keeps per-IP and per-surface throttles); a gradual-rollout mechanism (v1 launches allow-list + don't-advertise, with a waitlist landing page); an internal analytics dashboard (v1 uses a handful of internal reports); a supply-funnel CRM + hand-match tool (first cohort hand-matched manually); multi-jurisdiction tax registration (v1 keeps automated tax calculation, hosted invoices, a tax-ID field); a self-serve GDPR erasure/export UI (v1 keeps consent, a sub-processor list, and a manual erasure runbook; no EU/public signup until self-serve lands); performance caching and load/quality CI gates. (Content-takedown UI is tracked separately as RM-36.)

### RM-49: Volunteer referral loop
**Source:** MVP Scope launch strategy
**Trigger/Gate:** v1.5 — the concierge cohort proves the loop and organic supply needs compounding
Referral loop v1.5.

### RM-50: Move funds between projects
**Source:** v1.5 trigger list
**Trigger/Gate:** v1.5 — NGOs accumulate idle credit on finished projects and ask to redeploy it
Move funds between projects.

### RM-51: Linear wrapper layer
**Source:** v1.5 trigger list
**Trigger/Gate:** v1.5 — detect-and-revert proves noisy (agents keep tripping status changes)
Linear wrapper layer.

### RM-52: Second spend-anomaly signal (provider alert emails)
**Source:** v1.5 trigger list
**Trigger/Gate:** v1.5 — the first high-spend anomaly detection misses
Second spend-anomaly signal (provider alert emails) — a layer on top of the anomaly engine at RM-5.

### RM-53: Triage self-attestation + spot-check
**Source:** v1.5 trigger list
**Trigger/Gate:** v1.5 — triage median age exceeds 24h or weekly admin triage time exceeds 5h
NGOs self-attest at publish and go live immediately, with a 10–20% random spot-check and a revoke-on-violation flow.

## v2 (6–12 months post-launch)

### RM-4: Post-handoff feature-request surfacing
**Source:** REQ-017
**Trigger/Gate:** v2 — enough handed-off projects to attract follow-up requests; detailed criteria wait on pilot data (how many handed-off projects attract follow-up requests, and how NGOs want to drive them)
After handoff, new repo issues labeled feature-request / bug would surface on the project's ai4good page for other volunteers to find and pick up.

### RM-13: Multi-volunteer per project
**Source:** REQ-001; REQ-019; Out of Scope #5
**Trigger/Gate:** v2 — project complexity outgrows the single-volunteer model
Teams of 2–3 volunteers per project, with role splits (frontend/backend/QA). v1 is strictly single-dev (decision-28); volunteer teams are post-v1.

### RM-16: Precise AI fuel estimator
**Source:** REQ-004
**Trigger/Gate:** v2
A precise AI fuel estimator is v2 — AI-coding spend is hard to predict, and overconfident estimates harm more than they help.

### RM-28: Lovable credit reselling
**Source:** REQ-021 (Non-goals); Out of Scope #16
**Trigger/Gate:** v2 trigger: a signed Lovable reseller agreement (tax and refund pass-through)
No reselling of Lovable credits in v1 (NGOs buy direct); v2 may revisit under a reseller agreement, requiring tax pass-through and refund integration.

### RM-29: CR v2 items — AI-assisted CR assessment, mid-project scope reduction, project splitting
**Source:** REQ-025 (v1.5 spec, "Deferred beyond the v1.5 spec")
**Trigger/Gate:** v2
AI-assisted CR assessment (estimates, acceptance-criteria drafts) is v2. Also deferred beyond the v1.5 CR spec (no release committed beyond "later than v1.5"): a dedicated CR section grouped by status; automatic completion detection + event; an AI agent drafting acceptance criteria from CR text; NGO cancellation of a pending CR. v2 also covers mid-project scope reduction (informal today); project splitting is not planned.

### RM-33: Zero-touch fully-autonomous orchestration
**Source:** REQ-028; v1 design rationale
**Trigger/Gate:** v2
Fully autonomous orchestration polish (v1.5+ precursor); zero-touch fully-autonomous orchestration is v2.

### RM-44: Slack workspace bridge + video/audio calls
**Source:** REQ-015; v2 roadmap list
**Trigger/Gate:** v2+ — NGOs already on Slack want project comms mirrored into their workspace
v2+: a bridge to a real Slack workspace; video/audio calls.

### RM-54: Discovery voice input
**Source:** REQ-018; v2 roadmap list
**Trigger/Gate:** v2 — typing-friction feedback
NGOs describe the need via a voice recording the agent transcribes and processes.

### RM-55: Public impact page per NGO
**Source:** REQ-020; v2 roadmap list
**Trigger/Gate:** v2 — enough shipped tools to populate it
A public page per NGO showing all the tools ai4good built for them, with usage/impact stats where instrumented.

### RM-56: Automated NGO verification via charity-registry APIs
**Source:** v2 roadmap list
**Trigger/Gate:** v2 — the manual review queue outgrows one admin
Automated NGO verification via charity-registry APIs, superseding the v1.5 manual-review pipeline (RM-6).

### RM-57: KYC auto-approval at triage
**Source:** v2 roadmap list
**Trigger/Gate:** v2 — volume shows KYC-verified NGOs reliably pass
KYC auto-approval at triage.

### RM-58: Lovable real-time credit status
**Source:** REQ-010 (decision-30 standing trigger); v2 roadmap list
**Trigger/Gate:** v2 — requires Lovable shipping scoped OAuth or billing webhooks; verify before building
The moment Lovable exposes programmatic usage/credit data (scoped OAuth or webhooks — the Q7 watch), the Lovable meter switches from the manual widget + consent-based session reads to pulled provider data, on the same tight cadence as the Anthropic reconciliation. No new decision needed once that trigger fires.

### RM-59: Anonymous post-handoff contributors
**Source:** v2 roadmap list
**Trigger/Gate:** v2 — drive-by fixes from non-registered developers appear
Anonymous post-handoff contributors.

## Reserved / future (no release assigned)

### RM-1: Counsel-reviewed ToS, volunteer-classification opinion, fiscal-sponsor agreement
**Source:** Platform Promise (Legal posture); Open issue #9
**Trigger/Gate:** postponed post-MVP (founder verdict, flow #17 2026-07-08); EU data-residency stance needed before EU onboarding
Counsel review, the volunteer-classification opinion, and the fiscal-sponsor agreement are post-MVP items; the MVP pilot runs on the un-reviewed plain-language draft ToS, risk accepted. Full scope: counsel-reviewed Terms of Service (no-warranty, no-SLA, limitation of liability; the UI keeps the warm voice); volunteer-classification opinion; fiscal-sponsor agreement; EU data-residency + sub-processor/DPA stance before EU onboarding.

### RM-2: Private / confidential-codebase repos
**Source:** Platform Promise §2; REQ-004; REQ-005
**Trigger/Gate:** future feature, no release assigned
A need that genuinely requires a closed or confidential codebase is declined at Discovery in v1 (public-only, decision-27); private repos are a future feature. This is separate from data sensitivity — Tier-2 sensitive data is still served via the fixtures-only rule (public code, real data connected post-handoff, never in the repo).

### RM-19: Formal chargeback reserve
**Source:** REQ-006; Open issue #2
**Trigger/Gate:** deferred to later stages entirely (founder verdict, flow #11 2026-07-08 — not an MVP item); no release assigned
A formal chargeback reserve is deferred to later stages entirely; at pilot scale, chargeback losses are absorbed from operating funds as they occur, bounded by no-cash-out + the first-fund cap + rapid access cutoff.

### RM-26: Skip-Lovable / Claude-Code-only opt-out
**Source:** REQ-021
**Trigger/Gate:** reserved post-v1; no release assigned
Every project uses Lovable in v1 (single delivery model — decision-23); the skip-Lovable opt-out is removed and reserved post-v1.

### RM-30: Linear written blessing / paid-tier fallback
**Source:** REQ-026
**Trigger/Gate:** postponed to a pool scale-out gate (founder verdict, flow #20 2026-07-08); no release assigned
The written blessing from Linear for bulk-provisioned workspaces is postponed to a pool scale-out gate: the pilot's handful of workspaces proceeds on ordinary free-tier terms, risk accepted, with the paid tier as the fallback if Linear ever objects.

### RM-46: i18n / multi-language UI
**Source:** NFR Compatibility
**Trigger/Gate:** "Phase 3" (no release assigned)
English only at launch — i18n is Phase 3, out of scope for v1.

### RM-60: Anthropic commercial negotiation / custom billing tier
**Source:** Open issue #6
**Trigger/Gate:** postponed post-MVP (founder verdict, flow #18 2026-07-08); no release assigned
The pilot runs on standard self-serve billing and default rate limits; tier negotiation, billing arrangement, and custom limits happen when volume justifies them.

### RM-61: Blended P&L + grant/donor-runway lock
**Source:** Open issue #10
**Trigger/Gate:** postponed post-MVP (founder verdict, flow #19 2026-07-08); no release assigned
The pilot's real spend is visible on the daily money dashboard; the formal bottom-up P&L and grant/donor-runway lock become a scale-up gate. Original scope: bottom-up year-1 P&L (skim + grants + donations vs compute float + infrastructure + labor); a grant/donor runway covering the projected net gap.

### RM-62: Formal completion ceremony + post-completion attribution & health
**Source:** REQ-012; REQ-035; Story 6; Open issue #7
**Trigger/Gate:** v1.5 — build trigger: pilot completions reveal whether NGOs want a structured acceptance step and whether volunteers want captured attribution beyond raw GitHub history
v1 has no formal handoff ceremony: the volunteer marks the project `completed` once all P0 tasks are done, and because Lovable is enforced and git-bound the NGO already owns the live app and repo throughout (no delivery, no transfer). This item restores, as a v1.5 layer, the pieces deferred out of v1: the completion checklist gate (README/runbook/deploy-instructions/passing-CI/license confirmation), the NGO sign-off / acceptance flow with a rejection loop back to `in_progress`, the guided-maintenance ("first change request") ritual, the live-URL-reachable gate, and post-completion capture — an NGO attribution step (optional testimonial plus credit-framed dimensions, never a public star score) feeding the volunteer's private portfolio, plus post-completion health (reachability ping and the structured founder check-in). Subsumes the attribution/health scope formerly split across REQ-035, including reputation-feeds-matching (the captured attribution + health record becomes visible during v1.5 matching; no gate — a volunteer with weak signals still applies) and an optional signal-only AI-maintainability check (a fresh agent runs realistic change requests against the repo; the result is shown, nothing is blocked). The 60/90-day automated health layer remains RM-25. "No public star ratings, ever" continues to hold.

### RM-63: Observability & operational monitoring framework
**Source:** REQ-029 (deferred out of v1, d59)
**Trigger/Gate:** post-pilot — build before opening organic/public volume, or immediately after the first silent automation failure, whichever comes first
v1 runs the zero-human money path with no monitoring framework: no job heartbeats/watchdog, no business-invariant pagers (negative balance; a billable AI request accepted against a depleted project on either surface; release-revocation completeness beyond 6 hours; org base-permission drift; error rates outside budget), and no operator paging. v1 detection is only the founder's daily money-dashboard read, baseline error-spike alerts, and automatic provider-truth reconciliation (undecidable drift surfaces on the dashboard and notifies the admin — not a paging system). This item restores the framework: heartbeat + watchdog on every job that moves money, sets provider limits, or revokes access; the invariant pager set; and actionable operator paging for gateway availability/enforcement failures. Risk accepted knowingly at pilot scale: a silently-dead job or money-path bug is caught by the daily read or a user report, not machinery.
