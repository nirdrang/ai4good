#### REQ-027: Abandonment / Rematch (volunteer ghosts mid-project)
Adds a release + rematch edge (in_progress → open) + a partial-fuel rule.
- Triggers: inactivity (no repo activity or task movement) — reminder 14 days, auto-release 21 days; or manual release by either party, with reason. Clock runs only while in_progress (decision-17).
- Release revokes ex-volunteer access (repo, AI keys, workspace/PM) via the release revocation checklist (its own rule); in-progress tasks → backlog; done work + history preserved; remaining fuel STAYS on the project — no refund.
- Ghosted (timeout) recorded distinctly from released-for-cause; ghosting affects the reputation signal; for-cause carries no automatic penalty.
- Re-opens with concierge rematch priority; NGO notified; prior matches closed in the match log. Notifications: reminder, released, rematch available (REQ-016).

#### REQ-029: Observability & Operational Monitoring
~Eight unattended money-touching scheduled processes → heartbeats + business-invariant monitors that page a human.
- Every scheduled job heartbeats; a watchdog pages on a missed interval.
- PAGE monitors: undecidable ledger drift (decision-31); any negative balance; **any metered AI request accepted or recorded against a depleted project — every billable surface, gateway or direct, funded Discovery included (decision-26/c5 guard)**; gateway error/provider rates outside budget; a release revocation checklist incomplete >6h; org base-permission drift.
- **Every metered AI request — gateway or direct — emits the same privacy-preserving audit event** (surface/actor, project, request id, provider status + cost, fuel delta, rate-card version, ledger linkage; metadata only, never bodies) (decision-26/c5 guard).
- v1 dashboards = the ONE money dashboard (funding, consumption, share, reconciliation, chargebacks), founder-read daily (→ RM-34); error tracking + structured logging = baseline NFRs.

#### REQ-030: Operations, Incident Response & Admin Correction Tooling
Names the operating model. (Audited-reversal requirement removed — flow #7; undoing enforcement = ordinary admin ability.)
- On-call + escalation named (pilot: the founder, documented tree); incidents = first-class ops items.
- **Runbooks (v1 = three — decision-26):** backup restore within the 4-hour objective; gateway real-key rotation + mass virtual-key revocation; Lovable outage fallback. One-page cards: credential-compromise break-glass, PM-tool outage, chargeback spike. The compromise card must: freeze reference-file access (disable signed-URL minting); start the breach clock (discovery time; counsel/statutory assessment if PII possibly exposed); reconcile Stripe vs the fuel ledger for the window before unfreezing money (decision-26/c6 guard). (→ RM-35)
- **Money corrections fully automatic (decision-31): no correction UI, no human step.** Reconciliation (decision-30) auto-conforms the ledger to provider truth — Stripe wins money-in; Anthropic wins AI spend; pairing arithmetic resolves internal gaps — posting via the one privileged function (idempotency key, pair-sum zero, source reference, audit row); direct ledger writes revoked from every role. Founder gets visibility, never approval; large drift pages. **Refusal-to-guess backstop:** undecidable drift never auto-resolves — books untouched; it pages.
- Account deactivation (v1 AUP): documented recovery — re-enable + re-issue keys manually (→ RM-14).

#### REQ-031: Content Moderation, Takedown & Secret Scanning
Right-sized: ~15 concierge projects need no automated takedown surface; the one real exposure — secrets in public repos — is covered.
- v1: secret scanning + push protection org-wide; founder break-glass to hide a repo (emergency-takedown admin action, not a private-project feature).
- (→ RM-36)

#### REQ-032: Project Need Attachments (NGO reference files for Discovery + build)
The NGO uploads reference files (manual process, screenshots, sample forms/data, mockups, requirements PDFs); Discovery reads them multimodally; the volunteer uses them at build.
- Upload at intake, during Discovery (the agent may ask), or from the project page pre-handoff; drag-drop + picker. Types: PDF, PNG/JPG, CSV/TSV, TXT, DOCX/XLSX. Caps (tunable): ~25 MB/file, ~200 MB/project.
- Access: the project's NGO account + assigned volunteer + platform admin only (repo public, files restricted); short-lived authorized links; the UI never holds storage credentials.
- PII = governance-by-disclosure (decision-1): "redacted/sample data only, NOT real beneficiary records; ai4good + your volunteer will see these files." Tier-2 adds a hard checkbox restating fixtures-only. No upload scanning in v1 — the NGO owns the risk (→ RM-37).
- Discovery may cite files in questions + the scope doc; names + one-line descriptions ride its context. File reads never consume credits, never interrupt (founder review 2026-07-07); on funded projects they consume fuel like any turn.
- Volunteer downloads from the project page (→ RM-31). The repo template gitignores the download path; files never committed (accidental-commit residual accepted at pilot; mitigated by secret scanning + fixtures-only).
- "Reference files" section (name/type/uploader/description); soft deletes; uploads + deletes audited.

#### REQ-033: Post-Discovery NGO Project Assistant (funded, fuel-metered)
Decision-12: post-funding, the Discovery chat reframes as a read-only project assistant (status, blockers, progress, fuel runway).
- Project page, in_progress onward; unfunded/pre-scoped projects have no assistant.
- Fuel-metered, no free credits; per-turn cost shown; fuel gauge visible; fuel-zero disables the composer with the top-up CTA.
- Strictly read-only (snapshot of tasks, blockers, fuel, activity): cannot set status, resolve blockers, accept scope additions, approve handoff, or move money. Scope asks → explains the REQ-025 protocol, may pre-fill a draft the NGO submits.
- Reuses the Discovery surface + model — no new chat infrastructure; v1 = on-demand text Q&A (→ RM-38). No scope guardrail: paid usage is the NGO's call (decision-34); the cost display is the control.

#### REQ-034: Task-Level Attribution (telemetry, never gating — decision-22)
Classification (load-bearing): telemetry, NOT a security control — spoofable, soft-degrading, never gates a request. Purpose: NGO burn-per-deliverable, per-task cost baselines, reconciliation precision.
- Metered requests may carry a task binding; burn attributed at ledger-write time; capture ships in v1 (→ RM-39). No resolvable binding → "unattributed," never rejected.
- "Exploration" + "onboarding" = first-class taskless values, offered proactively — falsely-attributed burn corrupts baselines.
- Steering is conversational, never platform-enforced. Ceiling, verbatim: detection and suggestion only, never gating.
- Aggregation boundary: the NGO sees burn per deliverable (cents, no celebration); per-volunteer-per-task granularity stays coordinator-side. Bimodal per-task costs = data property, not anomaly.
- v1: capture + the NGO burn-per-deliverable view (→ RM-39).

#### REQ-035: Post-Handoff Attribution & Jumpstart Health (decision-22; 60/90-day layer trimmed to v1.5 — decision-26/c8)
No gates anywhere — quality becomes visible after the fact; reputation is the incentive. Capture ships in v1 (→ RM-25, RM-40).
1. NGO attribution at handoff (v1): optional testimonial + three required dimensions — communication, delivered scope, onboarding into self-service — 4-point descriptive scale, credit-framed (~30s); deliberately NOT a star score. Feeds the volunteer's portfolio (private in v1). Supersedes the "no satisfaction form" deferral; "no public star ratings, ever" holds. Nothing blocks handoff.
2. Post-handoff health (v1 = reachability + a structured human check-in) (→ RM-25): the 30-day ping stays, reachability-only. The longitudinal layer → a founder check-in at day 45–60, a REQUIRED ops item created at handoff acceptance (handoff cannot complete without it — owner + due date). Outreach closed-form, PII-minimizing: six fields (self-service attempted, worked/failed, URL reachable, failure category, follow-up owner, follow-up due); never send screenshots, beneficiary data, secrets, or raw incident detail — privacy/security concerns route to the incident path first. Failures get an owner + a 2-business-day clock. Health signals never notify the volunteer punitively.
3. (→ RM-40)
4. (→ RM-41)

### P0 (promoted from P1): Required dependencies of REQ-024 / REQ-025 / REQ-026
REQ-013/014/015/016 (drafted P1) are P0-feature dependencies — reclassified P0, minimal v1 cuts (→ RM-42, RM-3, RM-43, RM-45). REQ-017 out of v1 (→ RM-4); no P1 work in v1.

#### REQ-013: NGO Dashboard (minimal v1 + v1.5 enhancements)
One NGO-wide view supporting the stepwise-funding moments (Promise §6).
- v1: project cards (status, % complete from tasks, dual fuel meters, assigned volunteer) + cadence signals — last commit, tasks X of Y, "Now working on: [task]" (→ RM-23). Cross-project fuel summary; general balance = "$X redeployable credit" (non-cash, no expiry). "Action needed" rail: open blockers, open scope-addition discussions, triage decisions awaiting the NGO. (No applicant queue — concierge, decision-28.)
- (→ RM-42)

#### REQ-014: Volunteer Dashboard + Completion Credit (v1 minimal)
Dashboard + completion-credit-only public reputation: no public star or numerical ratings.
- v1 dashboard: current projects (status, dual fuel gauges, in-progress tasks, unresolved blockers/clarifications); key reveal (REQ-009) (→ RM-22).
- **No public profile page or badge display in v1** (→ RM-3). Completion credit captured from day one as **append-only per-project events** (volunteer, project, handoff timestamp, first-tool eligibility); private "credit earned" confirmation at handoff. Every repo is public MIT — the portfolio already exists on GitHub.
- No satisfaction modal at handoff, no admin aggregate; the volunteer never sees own satisfaction scores (→ RM-24).
- (→ RM-3)

#### REQ-036: Dev-Authored Project PRD & Completion Gate (decision-25)

**Description:** Discovery output = scope contract, not task source. Kickoff seeds exactly one bootstrap task: the volunteer authors the project PRD in the repo from the Discovery scope (metered, fuel-billed, attributed to that task). Clarifying blockers (REQ-024) expected → the project Q&A log (REQ-010). On PRD-ready, an automated scorer compares it to the Discovery scope → completion score + named gaps. Score ≥ threshold → the build backlog decomposes from the PRD (REQ-026); below → gap list, iterate, re-score — bounded by project fuel, not an attempt cap.

**Acceptance criteria:**
- [ ] Kickoff creates the single bootstrap task; no build backlog before the gate passes.
- [ ] The PRD lives in the repo; authoring metered + attributed to the bootstrap task (REQ-009/REQ-034).
- [ ] Clarifying questions ride the blocker flow (REQ-024) → the Q&A log (REQ-010).
- [ ] The scorer evaluates Discovery-scope coverage (stories, acceptance criteria, data-sensitivity handling, constraints) → score + gaps; runs fuel-metered.
- [ ] Gate: score ≥ threshold → tree decomposed + pushed (REQ-026); below → gap report; PRD phase continues. **[DECISION: OD-7 — threshold + scorer configuration; pilot-tuned.]**
- [ ] The NGO sees PRD-phase status (bootstrap task + score state); the NGO is not an approver — the scorer is the gate; NGO input via clarifications.
- [ ] Score events recorded + notified (volunteer: gap report; NGO: gate pass — REQ-016).

**Dependencies:** REQ-004, REQ-024, REQ-026, REQ-034, REQ-009.

#### REQ-015: Per-Project Comment Thread (full Slack-style channel deferred to v1.5 — decision-15)
A project-page comment thread replaces the v1 real-time channel (NGO admins, assigned volunteer, escalated admin); the concierge pilot coordinates via blockers + comments + notifications + email (→ RM-43).
- v1: chronological plain-text stream, auto-linked URLs (no markdown, code blocks, attachments, @-mentions); loads on page view, no live push; posting notifies the other party; membership implicit from roles. System events never post to the thread — they surface in notifications + activity feeds. (Scope-addition discussions live here per REQ-025.) (→ RM-10) Post-handoff: read-only. No cross-project DMs.
- (→ RM-43, RM-44)

#### REQ-016: Notifications (Email + In-App)
Event-driven email + in-app, fixed defaults in v1 (→ RM-45). One shared emitter on a single static event taxonomy is the sole writer — nothing sends comms directly.
v1 taxonomy (event → recipients, delivery), condensed:
- Project decisions: triage auto-approved / returned-to-scoped (with reason) / terminally declined → NGO (email + in-app; decision-29/r4); approval = marketplace visibility. Vetting outcome → NGO (decision-29/r3).
- Matching (decision-28): match created → volunteer (email + in-app, consent CTA); consented → NGO (fund-to-kick-off); declined/expired → admin (match log); unmatched aging → platform admin only (Goal 5).
- Abandonment (REQ-027): 14d reminder → volunteer + NGO; released → NGO + ex-volunteer; rematch available → NGO.
- Money: pre-deadline reminder → NGO; deadline expired → NGO + volunteer; payment succeeded → both; payment failed → NGO; fuel 20% → NGO; 5% and depleted → both (depleted adds admin escalation); leftover released to general balance → NGO (no donation event — decision-28); chargeback opened → NGO + admin + ops item.
- Access: key issued / revoked → volunteer (email + in-app).
- Work signals: task status changed → NGO (in-app low-tone); task completed → NGO (email + in-app); task comment → volunteer (in-app); thread comment → the other party (in-app default; anti-spam guard); blockers raised/resolved/48h/7d → NGO email + in-app, volunteer on resolution, admin at 7d; PM status auto-reverted → volunteer (in-app, low-tone).
- Scope additions (informal — decision-29/r1): ride thread-comment notifications; no CR events in v1 (→ RM-10).
- Handoff + health: requested / accepted / rejected → both; verification outcome → NGO. (→ RM-25)
- Provisioning failure (repo setup failed, pool empty) → NGO + volunteer + admin + ops item, + urgent replenish alert. Lovable: setup reminder, credits low, credits blocked (escalation tier), setup-pending at kickoff → NGO, setup complete → both.
- (→ RM-43, RM-5, RM-7, RM-11)
Delivery defaults: email = critical (money, deadlines, blockers, handoff, decisions); in-app only = low-tone. One notification per committed event (→ RM-45). Critical-event reliability guard (decision-26/c2): the notification event writes atomically with its ledger/state transition via the outbox; recipients resolve at event creation; marked sent only on provider acceptance — unconfirmed sends retry, never silently drop. Escalation-tier events notify NGO + platform admin.

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
