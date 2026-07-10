## MVP Scope & Post-MVP Roadmap

Authoritative reference: Out of Scope=never built; this section=when features ship.

### v1 MVP (public beta launch)

**Decision summary (2026-06-03 pivot + decisions 8–22; later decision wins on conflict):**
- **Pivot (2026-06-03)** — Deliverable=deployed NGO-self-maintainable tool, not a repo; Track A (NGO maintains via chat; Lovable=build vehicle + durable home); Discovery classifies track, records data-sensitivity tiers (highest=fixtures-only-during-build; triage enforces). No cash-out: fuel=non-cash project-scoped credit (donate or keep); no payout/cash-refund/money-transmission rails. Nonprofit + blended economics; real ToS. Concierge-first launch. New v1 REQs: REQ-027 abandonment/rematch, REQ-029 observability, REQ-030 ops/incident + admin money-correction, REQ-031 moderation/takedown/secret-scanning.
- **8 — Unified fuel + free Discovery allowance.** Both roles consume project fuel; funding allowed from draft; Discovery free within per-NGO daily credits (10/day unverified, 30/day verified). Email verification=floor for any Discovery message; org-document verification=wall for publishing. First funding and first match acceptance each trigger a hard acknowledgment. No paid Discovery wallet in v1 or v1.5.
- **9 — Git-as-truth PM tree.** Reversed by decision-20; decision trail only.
- **10 — Capability-preserving build trim.** Six reshapes, every v1 requirement intact. To v1.5: concierge supply-funnel CRM + hand-match tool, rate-limiting infrastructure, gradual-rollout tooling, analytics dashboard, report/takedown UI, multi-jurisdiction tax registration, self-serve data-erasure UI (manual runbook kept).
- **11 — Two-layer money.** Funded fuel dollar-pegged (15% skim; no subscription). Free Discovery uses a context-weighted credit: long conversations and reference files (REQ-032) cost more, cached content less; regenerations and system-error retries free. Daily drip, no rollover; verification triples it (10→30/day). Transparency: credit gauge, per-turn cost, pre-ingestion file estimate; credits=free grant, never silently removed. Funding auto-flips Discovery to dollar-metered fuel; free pool serves only unfunded projects (credits NGO-bound, fuel project-bound). At exhaustion: verify, fund to continue now, or return tomorrow — "keep going now," never "go faster."
- **12 — Post-Discovery NGO project assistant (REQ-033, new in v1).** Funding unlocks a fuel-metered read-only NGO↔AI assistant answering "how is my project going?" from tasks, blockers, fuel runway, activity. Never mutates tasks, approves handoff, or accepts scope (changes→Change Requests). No free credits — disables at fuel zero with a top-up prompt. Proactive/push agents v1.5.
- **13 — Opus for Discovery + the assistant.** Cost bounded: Discovery short, one-time; the daily allowance caps worst-case spend; credit unit model-agnostic — allowances stay 10/30. Assistant cost passes to the NGO.
- **14 — Automated spend-anomaly engine deferred to v1.5.** Loss ceiling holds: no cash-out, first-fund cap, spend caps, fuel-zero cutoff, manual rotate-key. Reinstate before organic/EU signup.
- **15 — Project comms trimmed to a comment thread.** One project-level thread; full channel (real-time, threads, @-mentions, search) v1.5. System events→notifications/activity feeds, not chat; CR Accept/Decline on the CR row.
- **16 — Change-Request anti-distraction guardrails** *(surface→v1.5 by 29/r1; principle governs the v1 informal protocol)*. CRs opt-in, never interrupt: low-tone notification, no per-CR email; only Accept creates work. One open CR per project; Decline penalty-free, the protected default; NGO sees submission framing ("optional; the volunteer decides; adds scope, time, and fuel").
- **17 — `paused` state removed from v1.** Pause=support conversation: pre-match NGO unpublishes/cancels; mid-build admin turns off access + leaves a note, or cancel. Returns v1.5 on first real request.
- **19 — Track B deferred to post-v1** *(superseded by decision-23)*. v1=Track A only; non-Track-A needs waitlisted at Discovery; 100% Lovable dependency accepted.
- **23 — Single delivery model; Track B removed altogether (2026-07-07).** Supersedes 19: taxonomy deleted. One model — NGO-self-maintainable tool, Lovable durable home, Claude-Code-orchestrated build. Developer-grade waitlist deleted; needs failing the maintainability fit check declined at Discovery with plain messaging, each decline recorded for founder review (visibility only; no queue or re-engagement promise).
- **24 — Review-batch corrections (2026-07-07, founder).** (a) Kickoff decomposition gated by coordinator review (OD-1); no admin ops tasks, exactly one human gate *(superseded by 25: gate=automated PRD completion score)*. (b) The Skill ENFORCES pull-then-complete: task-or-exploration binding before substantial work (attribution context always present); completion=explicit dev act driving the status-flipping merge. (c) Handoff repo-transfer removed — repo stays in the platform org permanently. (d) Discovery file attachment/reads never consume credits, never interrupt — daily allowance=platform-spend ceiling.
- **35 — Platform Lovable member seat; offboarding automated (2026-07-09, founder).** Setup checklist adds one invite: platform ops account joins each Lovable workspace as build-phase member — powers automated volunteer removal at handoff, abandonment, AUP deactivation; at handoff the platform removes itself ("last one out"), leaving the NGO zero platform access. Exception to the no-Lovable-access posture: seat reads no usage/billing data, member management only; exposure bounded by Tier-2 fixtures-only. [VERIFY on the first pilot]: member add/remove/self-remove via Lovable API/MCP; fallback=manual NGO-removal path with notice.
- **34 — Free-phase Discovery scope guardrails (2026-07-09, founder; FREE PHASE ONLY).** On free daily credits: a system-prompt scope line declines/redirects unrelated tasks; a deterministic per-conversation turn ceiling (pilot-tuned) bounds any drip; repeated off-topic declines show the NGO a plain notice + flag the conversation for founder visibility — never a lockout. **Funded Discovery and the REQ-033 assistant carry NO scope guardrail:** paid usage=the NGO's call; per-turn cost display + fuel gauge are the controls.
- **32 — Manual-flows session, verdicts through #20 (2026-07-08, founder; #21–#25 pending).** POSTPONED post-MVP: #17 counsel deliverables (un-reviewed plain-language draft ToS, risk accepted), #18 Anthropic commercial negotiation (self-serve billing suffices), #19 formal P&L + runway cadence (daily money dashboard suffices), #20 Linear written blessing (pool scale-out gate; paid-tier fallback). APPROVED (human backstop family): #3 chargeback adjudication, #12 Discovery-failure escalation, #13 outbox DLQ, #14 incident command (3 runbooks + cards; steps scripted one-click), #15 blocker 7-day rung. REMOVED: #2 credit grants, #4 collusion, #5 AUP saga, #7 audited-reversal, #8 handoff-dispute review, #9 goodwill refund, #10 human ledger correction. MOOT: #6 (public-only, d27). POSTPONED later: #11 chargeback reserve; #16 DMCA registration/escalation docs (CSAM statutory reporting duty exists by law regardless).
- **31 — Ledger corrections fully automatic (2026-07-08, founder — flow #10 removed).** No human step: tight-cadence reconciliation auto-conforms the ledger to provider truth (Stripe wins money-in; Anthropic wins AI spend; pairing arithmetic resolves internal gaps), posting through the guarded idempotent function with audit rows + dashboard visibility. Founder informed, never asked. Backstop: undecidable drift never guessed — books untouched, it pages. Supersedes the d26/c12 admin-invoked procedure.
- **30 — Provider truth drives the money gauges, tightly checked (2026-07-08, founder).** Fuel gauge=Anthropic's reported usage (each gateway response carries Anthropic's token counts); aggregate reconciliation vs Anthropic usage/cost reporting: nightly→tight pull (minutes, pilot-tuned); internal arithmetic control totals stay nightly. Lovable: v1=manual widget + consent-based session reads (no scoped API — Q7); STANDING TRIGGER — when Lovable exposes programmatic usage data, the meter switches to pulled provider data, same cadence, no new decision. Flow #9: goodwill-refund valve REMOVED — zero refunds of any kind in v1; a wronged NGO made whole in spendable general-balance credit; only money-out surface=Stripe's dispute rail.
- **29 — Third MVP-cut round + flow verdicts (2026-07-08, founder rulings).** Flows: #7 audited-reversal removed; #8 handoff-dispute review + rejection-loop cap removed. Round 3 (codex-evaluated): (r1) structured Change Requests→v1.5, amending decision-16 — v1=informal comment-thread protocol, d16 principle intact (task-created-before-spend, top-priority-or-acknowledged, one discussion at a time, sensitivity changes re-triage); (r2) volunteer public profile + badge→v1.5 — credit captured as append-only per-project events from day one, private confirmation at handoff; (r3) verification machinery→ONE audited founder-vetted action (no public "verified" claim; public-evidence-preferred, PII-minimizing; pipeline returns before any non-concierge admission); (r4) founder redesign: automated triage screener — confident-clean auto-approves with auto-written audit record, Tier-2 never auto-approves, non-decided→founder exception queue (return-to-scoped vs terminal-decline), auto-approvals spot-checked in the daily review (threshold=OD-8); (r5) REJECTED — in-app notification center stays in v1.
- **28 — Second MVP-cut round, codex-evaluated (2026-07-08, founder rulings).** (s1) Organic marketplace→v1.5: v1 matching=concierge with **admin enforce-match** (binding, no NGO approve/decline; volunteer consents with one click, firing the first-match disclaimer before any access; NGO per-match acknowledgment rides the funding screen); public read-only listings stay; admin match log feeds Goal 5. (s2) Single-seat NGO accounts (invites/roles v1.5): authority-attestation, no-shared-credentials copy, audited contact-transfer action, escalation contact — plus founder extension: **single-dev projects** (exactly one volunteer per project; teams post-v1). (s4) Leftover-fuel **donation flow removed entirely**; leftover credit auto-applies at any NGO funding checkout (satisfying the $50 minimum); release=ledger operation under nightly control totals. REJECTED: s3 US-only pilot (EU/UK VAT + Stripe Tax stay v1), s5 Google OAuth cut (stays v1).
- **27 — Public-only v1; private repos/visibility removed (2026-07-08, founder).** Every project public MIT: no visibility choice, Private badge, private-repo justification/triage path, or restricted project-page view. Private/confidential-codebase needs declined at Discovery (future feature). Orthogonal to data sensitivity: Tier-2 sensitive *data* still served via fixtures-only (public code; real data connected post-handoff, never in the repo). Retained admin mechanics: org-namespace guard (member repos born private, flipped public after setup validation); founder break-glass repo-hide (emergency takedown).
- **26 — MVP simplification pass, codex-debated (2026-07-08).** Twelve cuts, each debated (max 3 rounds): cadence stats minimal; skill-overlap badges→plain tags; cash-buffer alert→treasury policy; canary + self-audit view→v1.5 (org-settings guard replaces the repo-abuse monitor); notification batching/dedup/digests→v1.5 (atomic-outbox + provider-acceptance guard for critical events); blocker matrix uniform (per-instance action-owner + Tier-2 warnings added); observability=one money dashboard + pagers, metering audit invariant extended to ALL billable AI surfaces; runbooks 6→3 + incident cards (breach card hardened); reference-file sync command→v1.5; money corrections=one privileged idempotent validating function, no UI. Founder verdicts folded: collusion detection removed; admin extra-credit grants removed; AUP suspension saga→plain deactivate + revoke (machinery v1.5). Resolutions (2026-07-08): c7 assistant deferral REJECTED — REQ-033 stays, decision-12 stands; c8 CONFIRMED — decision-22 amended: 30-day reachability ping + attribution stay v1; 60/90-day layer + email→v1.5, replaced by the structured day-45–60 founder check-in (required ops item, PII-minimizing closed form).
- **25 — Dev-authored project PRD + automated completion gate (2026-07-08).** Discovery no longer feeds decomposition directly. Kickoff seeds one bootstrap task: the volunteer authors the project PRD from the Discovery scope (clarifications via REQ-024). An automated scorer gates progression against Discovery; the build tree decomposes from the gated PRD (new REQ-036). Coordinator review retires to a pilot spot-check. Threshold + scorer config=OD-7.
- **20 — Linear replaces the git-as-truth PM tree (reverses decision-9)** for product + the ai4good buildout. One free Linear workspace per project from a pre-created, concierge-replenished pool (creation manual-only). Coordinator-owned decomposition: automation drafts, a human approves; briefs session-sized, dependency-ordered. Pull-based volunteer self-assignment=the commitment signal. Status moves only via the GitHub integration on PR merge; agents may read, comment, self-assign but never move status — violations detected and reverted. NGO visibility panel-only (no Linear seats); tree snapshotted into the repo at handoff; coordination infrastructure platform-owned, never transfers (delivery infrastructure — Lovable, repo — NGO-owned).
- **21 — LLM gateway with virtual keys in v1 (rewrites REQ-009).** Per volunteer per project, a show-once virtual key; the real provider key never leaves the platform. Per request: spend caps (per-request + rolling 24h), real-time fuel gate, sanctioned-setup origin check, governance-prompt injection, per-request metering; instant revocation. Eliminates per-project provider workspaces, manual key operations, usage polling. Prompt bodies never persisted — only token counts, metadata, score/boolean signals. Escalation ladder documented, not built. Hosting=OD-6.
- **22 — Attribution + transparency capture in v1 (new REQ-034/035).** Every spend record binds to a task where derivable — telemetry never gates work; exploration/onboarding=first-class buckets. NGO sees burn per deliverable; per-volunteer granularity stays coordinator-side. Handoff adds an attribution step: testimonial + three credit-framed dimensions (supersedes the "no satisfaction form in v1" deferral; never a public star score) + 30/60/90-day jumpstart health from real signals with a 60-day "did you try?" confound question. Matching/synthesis surfaces v1.5.

**Launch strategy — concierge-first:** supply liquidity=#1 launch gate; no organic browse first. Pre-recruit a ~20–30-volunteer bench, hand-match the first ~10–15 curated NGO projects end-to-end to prove deployed tools, then open organic browse. v1 hooks: supply-funnel metric, unmatched-project aging nudge, admin concierge-match tooling (→RM-49).

**Foundation:**
- REQ-001 — Auth: email + GitHub + Google.
- REQ-002 minimal — NGO trust=audited founder-vetted action at concierge onboarding (decision-29/r3) (→RM-6).
- REQ-003 — Project Need intake.
- REQ-007 — Volunteer profile + concierge matching (admin enforce-match, one-click consent, match log — decision-28).
- REQ-011 minimal — Public read-only newest-first listings (→RM-8, RM-21).

**Discovery & Publishing:**
- REQ-004 — Discovery Agent: free within the daily allowance; outputs complexity tier only, no dollar estimate.
- REQ-005 — Scope doc + publishing into triage.
- REQ-023 — Automated triage screener + founder exception queue (decision-29/r4); threshold=OD-8.

**Funding & Money:**
- REQ-006 — Stripe top-up + fuel ledger + match-to-fund, non-cash no-cash-out; leftover auto-applies at future checkouts, no donation flow (decision-28); chargeback handling + first-fund caps (→RM-19); no payout/cash-refund/payee-KYC/AML rails; no refunds (flow #9) (→RM-7).
- REQ-022 — No tips UI at handoff (→RM-11).

**Project Execution:**
- REQ-008 — GitHub repo per project in the platform-owned org; dev-internal issues only.
- REQ-009 — LLM gateway per decision-21; hosting=OD-6 (→RM-5).
- REQ-010 — Single-view project page + cadence stats + dual fuel meters.
- REQ-021 — Lovable=deliverable vehicle; Claude Code orchestrates behind a driver abstraction (per-task credit cap, audit logging, manual dual-rail fallback); manual status widget retained (→RM-27).
- REQ-024 — Orthogonal blockers + task-anchored clarifications, incl. collaborator-access requests for the fallback rail.
- REQ-025 minimal — Mid-build scope additions via the informal protocol (decision-29/r1): volunteer accepts in-thread, creates the linked task before any spend (→RM-10).
- REQ-026 — Task management via Linear per decision-20; no platform-hosted task server or in-repo task file.
- REQ-028 — ai4good Claude Code Skill, core orchestration shell: install, session bootstrap, task binding, slash commands, branch/magic-word convention + Lovable orchestration layer (build-vs-local triage, per-task budget guardrails, quality loop, consent gate, audit reporting).
- REQ-034 — Task-level attribution per decision-22; NGO burn-per-deliverable view (→RM-39).
- REQ-035 — Post-handoff attribution at sign-off (v1) + 30-day reachability ping (v1) + day-45–60 founder check-in, a v1 ops commitment (→RM-25, RM-40).

**Comms & Dashboards (minimal v1 versions):**
- REQ-013 minimal — NGO dashboard: project list + fuel + task progress + "Action needed" rail (→RM-42).
- REQ-014 minimal — Volunteer dashboard: current projects + fuel gauge + completion-credit events, recorded from day one (→RM-3).
- REQ-015 — Project-level comment thread; system events→notifications feed (→RM-43).
- REQ-016 minimal — Event notifications, fixed defaults (→RM-45).

**Handoff:**
- REQ-012 minimal — Automated checklist + sign-off; repo permission adjustment (no org transfer); volunteer access termination (virtual key + task-workspace membership) + task-tree snapshot; includes the REQ-035 attribution step (→RM-11).

Additional post-MVP items with no other v1-doc mention: →RM-50, RM-51, RM-52, RM-53, RM-56, RM-57, RM-59 (roadmap.md).

### v1 design rationale: Claude Code orchestrates Lovable (v1 architecture)

The volunteer's local Claude Code runs the ai4good Skill, connected to Linear (tasks), Lovable (build), and the platform API (context, blockers, comments): pull next task, decide Lovable-vs-local, prompt Lovable, review, test, iterate; status lands only on PR merge, never by agent say-so.

Why: single source of intent (volunteer session=canonical record; metering, scope enforcement, audit stay authoritative); structural cost enforcement (Lovable build messages bill the NGO workspace — mandatory per-task credit cap, call logging, balance surfacing at the point of spend); per-volunteer Lovable identity (individual audit; scope bounded by invitations); contained research-preview risk (driver abstraction + manual dual-rail fallback degrade a Lovable break to manual work, never a dead build; validated on 1–2 real pilot projects). (→RM-32, RM-33)

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
1. Fuel legal/tax characterization — DECIDED: prepaid, fully-consumable, non-cash-refundable service credit; no decay clock; one-line counsel confirmation still wanted.
2. Refund/donation/chargeback mechanics — dissolved: no refunds in v1 (flow #9), donation flow removed (decision-28), chargeback-after-consumption handled (freeze, access-off, write-off) (→RM-19).
3. Abandonment/rematch state machine — RESOLVED as REQ-027.
4. Sensitive-data vs open-source conflict — RESOLVED: v1 public MIT only (decision-27; private opt-in=future feature) (→RM-2); sensitive *data*=Tier-2 fixtures-only; acceptable-use document still owed (ops, not a launch blocker).
5. Admin staffing model at scale — OPEN: manual gates hold at pilot volume, not the year-1 target; need a staffing model or fewer manual gates before scale.
6. Anthropic commercial readiness — pilot on standard self-serve billing + default rate limits (→RM-60).
7. Deployment ownership post-handoff — DECIDED: deliverable=deployed running tool; Lovable hosts, NGO owns the workspace (~$25/mo, disclosed); ai4good never operates infrastructure; live deployment=handoff precondition; 30-day-alive tracked.
8. Entity type — DECIDED: nonprofit (fiscal sponsorship now, own 501(c)(3) later); enables tax-deductible donations + grants; forecloses traditional VC.
9. Counsel deliverables — pilot on the plain-language draft ToS, risk accepted (→RM-1).
10. Blended P&L + grant runway — real spend visible on the daily money dashboard (→RM-61).
