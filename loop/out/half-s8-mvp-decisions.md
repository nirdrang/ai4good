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
- **36 (2026-07-11)** — Volunteer candidacy precedes matching (amends 28): volunteers mark interest in-product on public projects; the assimilation window is time-based, starting at the FIRST candidacy (pilot-tuned; each additional candidate shrinks the remaining window — interest expedites matching, never extends the wait; candidate-less projects just stay open under Goal-5 aging); at lapse the concierge enforce-match draws from the pool. Candidacies feed the admin match log only — no NGO-facing queue. GitHub link mandatory at volunteer signup (was at-first-consent); platform-org membership still waits for first match consent.

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
