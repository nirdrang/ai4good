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
Classification (load-bearing): this is telemetry, NOT a security control — it is spoofable, soft-degrading, and never gates a request. Its purpose is the NGO burn-per-deliverable view, per-task burn baselines, and usage reconciliation.
- A metered request may carry a task binding, and burn is attributed when recorded; capture ships in v1 (→ RM-39). A request with no resolvable binding is recorded as "unattributed," never rejected.
- "Exploration" and "onboarding" are first-class taskless values, offered proactively, because falsely-attributed burn corrupts baselines.
- **One usage log, not an event system:** every metered AI request — gateway or direct — is recorded as a single row in one append-only usage log, written in-line by the component already handling that request (the gateway for volunteer traffic; the platform backend for its own Discovery/assistant calls). A row carries surface/actor, project, request id, provider status, and the provider's echoed token usage by category (the provider echoes token counts per response, never dollars) — metadata only, never bodies, and **no money fields: the log is token-denominated**.
- **Two meters, never mixed: fuel is money, attribution is tokens.** The fuel meter is rendered from provider truth alone — Anthropic's billed cost and usage reporting per workspace (REQ-006/REQ-009) and Lovable's credit status (REQ-021); **money is never derived from token math.** The attribution meter is token-denominated: burn per task, bucket, and category is measured and displayed in tokens, and per-task baselines are token-based. Reconciliation is same-unit only — row token totals against the provider's usage reporting, the money ledger against billed cost and Stripe — no cross-conversion. Attribution, the NGO burn views, and reconciliation are reads over this one log; nothing subscribes to it and it never gates a request.
- **Attribution spans both billable surfaces:** gateway traffic (volunteer build) attributes to a task or a taskless bucket; the **direct surface** — NGO-facing platform AI (funded Discovery and the assistant, REQ-004/033) — attributes to first-class **project categories** (Discovery, NGO assistant), so NGO-facing token consumption is counted and attributed to the project, never uncounted or folded into build burn. Every metered request on either surface carries project + category, and all categories reconcile to the project's total token usage.
- Steering is conversational (the agent is nudged to know its task context and select the matching task when exploration becomes implementation), never platform-enforced. The ceiling, verbatim: attribution telemetry and platform/gateway steering are detection-and-suggestion only and never gate the forwarding of an otherwise-valid metered request. The one permitted pause is Skill-local: the optional Skill may pause only its OWN guided workflow pending the task-or-exploration choice (REQ-028); disabling the Skill is immediate, penalty-free, and degrades attribution to unattributed.
- Aggregation boundary: the NGO sees burn per deliverable and per NGO-facing category (Discovery, assistant), token-denominated, no celebration. Exploration, onboarding, and unattributed appear as their own honest buckets, so total token usage always reconciles to visible lines — usage is never hidden or folded into a task. Per-volunteer-per-task detail and the per-project unattributed-% / binding-failure signals stay coordinator-side. Wide per-task burn variation is expected data, not an anomaly.
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

**Description:** Discovery output is a scope contract, not a task source. Kickoff seeds exactly one bootstrap task ("Author the project PRD"): the volunteer authors the project PRD in the repo from the Discovery scope (metered, fuel-billed, attributed to that task). Clarifying blockers (REQ-024) are expected and flow to the project Q&A log (REQ-010). When the volunteer marks the PRD ready, an automated scorer compares it to the Discovery scope, producing a completion score and named gaps. A score at or above the threshold decomposes the build backlog from the PRD (REQ-026); below it, the volunteer iterates on the gaps and re-scores — bounded by project fuel, not an attempt cap.

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
A project-page comment thread replaces the v1 real-time channel (NGO admins, the assigned volunteer, and the platform admin only when escalated); the concierge pilot coordinates via blockers, comments, notifications, and email (→ RM-43).
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
- Work signals: task status changed → NGO (in-app, low-tone); task completed → NGO (email + in-app); task comment → volunteer (in-app); thread comment → the other party (in-app default, with an anti-spam guard); blockers raised/resolved/48h/7d → NGO email + in-app, volunteer on resolution, admin at 7d; PM status auto-reverted → volunteer (in-app, low-tone, instructive not punitive).
- Scope additions (informal): ride thread-comment notifications; no dedicated CR events in v1 (→ RM-10).
- Completion: project marked complete → both. (→ RM-25)
- Provisioning failure (repo setup failed, task-system workspace unavailable at kickoff) → NGO + volunteer + admin + ops item. Lovable: setup reminder, credits low, credits blocked (escalation tier), setup-pending auto-raised at kickoff → NGO, setup complete → both.
- (→ RM-43, RM-5, RM-7, RM-11)
Delivery defaults: email for critical events (money, deadlines, blockers, completion, decisions); in-app only for low-tone. One notification per committed event (→ RM-45). **Critical-event reliability guard (money, access, completion):** the notification event is written atomically with its ledger/state transition; recipients resolve at event creation; and it is marked sent only on provider acceptance — an unconfirmed send retries and is never silently dropped. Escalation-tier events notify the NGO and platform admin.

