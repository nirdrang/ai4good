#### REQ-021: Lovable Integration — Durable Home + Claude-Code-Orchestrated Build

Lovable is the deliverable vehicle and durable NGO maintenance home: post-handoff the non-technical NGO evolves the live app via Lovable chat. During build, Claude Code is the volunteer's single entry point: orchestrates Lovable for UI, handles backend/logic/tests/docs; ai4good metering, scope enforcement, audit stay authoritative. Every project uses Lovable (decision-23) (→ RM-26).

**Orchestration posture:**
- Integration surface is a research preview; access isolated behind one internal adapter.
- Primary path: Claude Code drives Lovable; if it breaks, the volunteer drives Lovable in-browser, both committing to the shared GitHub repo. Either way, UI work spends NGO Lovable credits; Claude Code work burns ai4good fuel. A pure-backend tool (no Lovable app) fails the maintainability fit check; declined at Discovery (decision-23).
- Orchestrated calls bill the NGO workspace: platform enforces a per-task Lovable-credit budget cap, audit-logs every call, surfaces the NGO's credit balance in ai4good. Volunteer connects their own account; calls attribute to the volunteer.
- Post-handoff the NGO owns the workspace outright; zero dependency on orchestration or Claude Code.

**Why NGO-self-provisioned Lovable:** no per-project metering API, no BYOK, per-workspace billing. Self-provisioning: zero infrastructure dependency, no markup on Lovable spend, day-one NGO workspace ownership. No ai4good connector inside Lovable (decision-20): task state lives in Linear; Lovable never talks to ai4good.

**Lifecycle:**
1. Discovery flags whether Lovable is recommended, with rationale; no dollar estimate. Scope doc: labeled note, paid directly to Lovable, never deducted from fuel. Pre-kickoff: NGO reminder banner to set up the workspace and invite the volunteer.
2. Setup mandatory at kickoff: blocking item auto-raised to the NGO, completed via existing blocker + comment surfaces; zero per-project admin involvement; no NGO GitHub account. Checklist: NGO signs up (paid tier required for workspace-admin), creates workspace/project from one-click-copied scope summary, invites the volunteer as workspace admin **plus the platform ops account as member (decision-35; powers automated offboarding, exits at handoff)**; volunteer accepts, connects Lovable's GitHub sync (repo created in platform org), pastes back workspace/repo identifiers; platform auto-validates (repo in platform org, flipped public post-validation, GitHub App installed, name collisions surfaced, volunteer repo permission normalized), auto-resolves, seeds repo template, notifies both.
3. Stuck parties raise clarifying-question blockers, standard aging; admin pinged only at 7-day escalation. Volunteer can clone and work locally immediately after setup. (Collaborator-request blocker: legacy NGO-own-org edge case only.)
4. Credit status manual in v1: volunteer-set widget (active / credits low / blocked); low/blocked shows the NGO a "Top up Lovable credits" CTA deep-linked to Lovable billing; "I've topped up — unblock" resets (→ RM-27).
5. Handoff (automated, decision-35): platform removes the volunteer via its member seat, then itself; NGO keeps workspace + billing alone. Repo stays in platform org with NGO admin access (no transfer; decision-24/33); GitHub sync continues. **[VERIFY on the first pilot project]:** member management via API/MCP (member seat removes another member and itself); fallback: NGO removes the volunteer manually, prompted by a notice.

**Acceptance criteria:**
- [ ] Discovery output: Lovable recommendation + rationale, no dollar fields; scope doc renders the "paid directly to Lovable" disclaimer, no dollar figure.
- [ ] Setup item auto-raised at kickoff (no volunteer opt-in/opt-out); resolved only by platform validation of pasted-back identifiers; failed check shows specific failure + suggested fix, item stays open.
- [ ] Setup guide documents the checklist; per-project setup page: one-click copies (scope summary, volunteer email, optional snippet asking Lovable to reference the task identifier in commits; best-effort readability, status driven by PR merges, never parsing), validated paste-back form, per-step who-acts-next progress.
- [ ] Widget appears once setup completes; volunteer-changeable; low/blocked transitions notify; NGO resets to active; top-up CTA opens Lovable billing in a new tab. No inbound mail parser in v1.
- [ ] Repo-creation permission in platform org granted at volunteer onboarding; no per-project grant.
- [ ] At handoff platform removes the volunteer, then itself, automatically (decision-35); manual NGO removal only as fallback if member management is unavailable via API/MCP.

**Non-goals (v1):** no Lovable subscriptions purchased for NGOs; no metering/attribution of Lovable credit consumption (no usage API); Lovable cost never debited from fuel; no reselling of Lovable credits, NGOs buy direct (→ RM-28); no backend access to Lovable *billing/usage*: credit visibility stays client-side under the volunteer's consent-gated connection; backend billing integration waits for scoped access or webhooks. (Decision-35's sole exception: build-phase workspace *member seat* solely for automated offboarding, exiting at handoff; reads no usage data, no post-handoff access.)

---

#### REQ-022: Stripe Connect for Volunteer Tips (DEFERRED to v1.5 per §11)

(→ RM-11)

---

#### REQ-023: Platform Triage Gate (compliance review before marketplace)

Every project passes a compliance gate between scope completion and marketplace publication, catching policy violations (commercial intent, surveillance tooling, abusive scope) before volunteers see it. **v1: automated triage screener + founder exception queue (decision-29/r4, founder redesign):** automation decides clear cases; the founder attends only non-decided ones (Promise §8; same shape as the REQ-036 PRD scorer).

**Screener checks (same checklist, automated):** open-source alignment (all v1 projects public MIT; no commercial or closed-source-for-resale work; confidential-codebase request = decline, decision-27); nonprofit purpose vs vetted NGO profile; scope reasonableness vs Discovery's complexity tier; acceptable-use compliance (no surveillance, spam infrastructure, illegal use); data-sensitivity tier correctness (Tier-2 requires a fixtures-only build plan); Discovery risk flags. Returns pass/flag + reasons + confidence.

**Acceptance criteria:**
- [ ] NGO "Publish" routes to the screener, never directly to the marketplace.
- [ ] **Confident-clean → auto-approved → `open`**, screener-written audit record (checks run, rationale, screener version).
- [ ] **Tier-2 never auto-approves**; special-category data always routes to the founder.
- [ ] **Everything non-decided → founder exception queue** (findings pre-surfaced as focus areas), reviewed in the daily routine. Two outcomes: **return to `scoped`** (fixable; reason note to the NGO, who edits and republishes; republish re-enters the screener, stays marketplace-invisible; prior notes remain visible) or **terminal decline** (non-remediable; stays dead, cannot churn back).
- [ ] Every human decision recorded: reviewer, timestamp, decision, reason, data tier, scope snapshot reference.
- [ ] **Auto-approved items appear as one line in the founder's daily review**: post-hoc spot-check against false-negatives; break-glass unpublish recovers (REQ-031).
- [ ] Screener confidence threshold + model configuration: **[DECISION: OD-8 — pilot-tuned, same family as OD-7.]**
- [ ] NGO copy: clean publishes go live immediately; exception-queue items show "Under review — typically within a day or two" (no formal SLA; daily review shows item age).

---

#### REQ-024: Project Blockers (orthogonal operational health)

Blockers are orthogonal to lifecycle status, separating "dev is ghosting" from "dev is waiting on someone else"; they feed volunteer reputation and admin escalation, and never reduce the volunteer's public completion credit.

**Types (v1):** clarifying question (dev-raised; manual resolve); awaiting NGO review; external dependency; GitHub collaborator needed (legacy own-org-repo edge case; resolves on NGO access confirmation); Lovable setup pending (auto-resolves on platform validation, REQ-021); fuel top-up needed (auto-raised at the 20% warning and 0% blocking; auto-resolves above 20%); Lovable credits (volunteer widget; NGO resolves via "topped up") (→ RM-5). Auto-raised types: one unresolved instance per project, severity upgrading in place; manual types: several may be open.

**Notifications and aging:** raise notifies NGO admins (email + in-app + "Action needed" rail); blocking fuel also escalates to the platform admin; resolve notifies both. Reminder at 48 hours; escalation at 7 days to the platform admin, project flagged at-risk. Lovable-setup aging routes to NGO + volunteer; admin sees it only after 7 days of mutual silence. Open blockers auto-archive at transition to handoff.

- Dev raises via "Raise a flag" (type, severity, title, body); resolution requires a note; conversation lives in the blocker's Q&A + project comment thread (no chat channel in v1; decision-15). Manual catch-all types carry a per-instance action-owner (per-type default); selecting admin/ops creates the ops item immediately, not at 7-day aging (decision-26/c4 guard). Every NGO-facing free-text surface reached from a blocker carries the Tier-1/Tier-2 warning: never paste beneficiary data, passwords, keys, or live credentials (decision-26/c4 guard).
- Clarifying questions are first-class: project-level or task-anchored; form asks topic, what you tried, what you need. While unresolved: "Awaiting NGO clarification — volunteer can continue with other tasks; this one is paused." Resolved pairs persist for the project's lifetime in a Clarifications log (who asked, who answered, when).
- Surfacing: project-page badge (unresolved count + severity); compact indicator on marketplace/dashboard cards; NGO-dashboard "Action needed" rail sorted by severity then age, emphasized past 48 hours; cadence stats annotated "(blocked on NGO action)" or "(blocked on fuel)".

**Acceptance criteria:** raise/resolve flows work for volunteer and NGO; fuel blockers auto-raise/auto-resolve at the stated thresholds with in-place severity upgrade; Lovable-credit blockers ride the manual widget in v1; notifications and 48h/7d aging fire per the rules above; auto-archive on handoff; all surfaces render.

---

#### REQ-025: Mid-Build Scope Additions (structured CR surface deferred to v1.5 — decision-29/r1, amending decision-16)

**v1 is informal, decision-16 principle intact:** nothing interrupts the volunteer, nothing auto-assigns, the volunteer is the sole work-acceptance authority (enforced socially at concierge scale). NGO raises a mid-build idea in the project comment thread. v1 protocol (guards from the decision-29 review):
- Nothing enters scope until the volunteer explicitly accepts in-thread AND creates the linked task, before material fuel is spent (attribution stays clean, REQ-034).
- An accepted addition is top-priority (handoff-blocking, like original scope) or explicitly NGO-acknowledged as optional/non-blocking before handoff.
- One active scope-addition discussion per project (concierge-runbook rule); further asks wait or become a follow-up project.
- Project copy: additions consume existing fuel, may extend the timeline, are volunteer-optional; never paste beneficiary data, secrets, or credentials.
- An addition changing data sensitivity, AUP/compliance posture, or open-source fit pauses for founder re-triage before work starts.

(→ RM-10, RM-29)

---

#### REQ-026: Platform Task Management (Linear as system of record — decision-20)

Decision-20 replaces the git-as-truth task tree: real signals, not AI-authored narratives (previously every NGO-visible status was agent prose). Linear gives event-granular, actor-attributed real-time signals; enforceable read/write split; no shared-file merge conflicts under parallel worktrees; a hosted backlog predating the volunteer's clone; per-volunteer attribution.

**Model:** task state lives in Linear; one free workspace per NGO project. Volunteers and their agents (under the volunteer's identity) read the backlog, self-assign, comment; status moves only via Linear's GitHub integration on PR merge, never by hand. Platform mirrors Linear events one-way into its store, powering the NGO Status Panel and NGO assistant; the NGO never touches Linear. GitHub Issues stay dev-internal (code bugs only); Linear comments dev-internal; NGO conversation stays on the project comment thread.

**Ownership asymmetry (deliberate):** delivery infrastructure NGO-owned (Lovable workspace, repo); coordination infrastructure platform-owned (Linear, gateway), never transferred at handoff. Post-handoff the workspace sits dormant at $0; the task tree is snapshotted into the repo as markdown. Any paid tier: platform pays, never the NGO.

**Provisioning — pool model:** workspace creation has no public API; the concierge pre-creates ready workspaces in batch, pre-wired for platform access, events, GitHub integration. Kickoff (no manual step): assign next ready workspace, rename, invite volunteer, seed the PRD bootstrap task (REQ-036; build tree arrives post-gate). Replenishment fires below a watermark (default 3); an empty pool at kickoff raises an external-dependency blocker (the only stall mode). Bulk-provisioned empties sharpen the fair-use question; pilot proceeds on ordinary free-tier terms, risk accepted (→ RM-30).

**Decomposition (from the gated PRD — decision-25):** kickoff seeds only the PRD bootstrap task (REQ-036); once the dev-authored PRD clears the completion gate, the platform drafts and auto-pushes the build tree: one parent per story, one sub-issue per acceptance criterion, top priority. Briefs must be session-sized and dependency-ordered (precondition for pull-model correctness and per-task burn data, REQ-034); sequencing encoded as blocking relations. PRD score-gated upstream, so per-kickoff coordinator review retires to a pilot-phase spot-check (supersedes the decomposition half of decision-24(a)).

**Pull-based workflow:** self-assignment is the commitment signal, flipping the NGO panel to "in progress"; volunteers pull the next unblocked issue, the coordinator never pushes. Norms: one issue in progress at a time (one per worktree if parallel); assign before starting; comment when blocked; never move status by hand. Onboarding: match → workspace invite → browse session-sized briefs before cloning → first session connects task access once → first pull activates attribution (REQ-034). No branch activity on an in-progress issue for N days raises a coordinator flag proposing release to the backlog. Agentic loops permitted (governance loop-agnostic); repo template ships a skeptical reviewer-agent default; loops must degrade on auth failure (queue updates, surface at session end); loop PRs never auto-merged. **[DECISION: OD-1 — reviewer identity + merge authority per project.]**

**Write authority (real-signals enforcement):** volunteers and agents may read, comment, self-assign; never change status. GitHub integration moves status on PR events; the platform creates issues (decomposition; v1 scope-addition tasks volunteer-created per REQ-025), invites, reverts, cancels. NGO holds no Linear seat; visibility is the Status Panel exclusively. OAuth scopes cannot express "assign + comment but not status," so enforcement is detect-and-revert: any status change not from the GitHub integration and lacking a linked merged PR is auto-reverted with explanatory comment and low-tone volunteer notification (restricted read/assign/comment proxy held in reserve if reverting proves noisy). Agent actions attribute to the volunteer, who owns them; human vs agent indistinguishable, accepted.

**Lifecycle hooks:** an accepted scope addition is a volunteer-created linked task, top-priority or NGO-acknowledged-optional (REQ-025) (→ RM-10). At handoff-pending: lower-priority not-started issues cancelled; top-priority issues never auto-cancel (handoff requires all done, REQ-012); final tree snapshot committed to the repo. At handed-off: volunteer membership removed; NGO-facing mirror goes read-only. On abandonment: ex-volunteer's in-progress issues return to the backlog.

**Acceptance criteria:**
- [ ] NGO-visible task state derives solely from observed Linear events and platform lifecycle actions, and is public (all v1 projects public; decision-27).
- [ ] Pool assignment at kickoff and watermark-driven replenishment behave as described; an empty pool raises the blocker.
- [ ] Kickoff seeds the PRD bootstrap task; post-gate decomposition drafts from the PRD and pushes automatically, with session-sized briefs and blocking relations (pilot coordinator spot-check; decision-25).
- [ ] Status flows only from PR merges; detect-and-revert enforces this and notifies the volunteer.
- [ ] NGO Status Panel renders a "now working on" strip, the hierarchical task tree, and a live activity feed. Panel scope beyond the tree + NGO introduction mechanics: **[DECISION: OD-2.]**
- [ ] **[VERIFY on the first pool batch]:** free-tier event registration, API mutations, programmatic invites, workspace rename, pre-connected GitHub integration seeing later-created repos. Fallback if the free tier regresses: paid tier (platform pays) or git-based task state with a deterministic truth layer.

---

#### REQ-028: ai4good Claude Code Skill (volunteer-facing single pane of glass)

An ai4good-shipped Claude Code Skill makes the volunteer's local Claude Code the canonical operating environment: behavioral conventions, helper commands, session governance (task binding, pull-model norms) packaged as installable, auto-updating agent code (docs drift; a Skill runs every session, updates via the standard Skill channel). One-command install; auto-runs in every session in an ai4good repo.

**v1 scope:**
- One-command install; open-source (MIT). Repo carries non-secret project config seeded at creation; one-time login per project. Three credentials, three revocation semantics: platform token (NGO-side context: blockers, comments, fuel), task-system OAuth (backlog), gateway key (metered LLM traffic).
- Session bootstrap primes each session with scope summary, current status, in-progress tasks, unresolved blockers, recent NGO comments, fuel runway; verifies task-system access; reads the task binding; prints a one-line banner (project, active task + age, fuel remaining, unread NGO comments). (→ RM-10)
- Task binding + degradation (load-bearing): self-assigning records the issue identifier in a per-worktree binding riding every metered request — the attribution mechanism (REQ-034). **The Skill enforces pull-then-complete:** before substantial work, an explicit choice: pull an issue or explicitly enter the exploration bucket, so every session carries attribution context, no silent unattributed drift; when exploration turns into implementation, it insists on binding the matching issue. Completion is an explicit dev act: dev marks done; the Skill verifies and drives the merge path that flips status (REQ-026). On task-system auth failure the session degrades without stopping: updates queue locally, surface at session end; binding floors to unattributed (a floor, not a bypass).
- Helper commands: pick next task (highest-priority unblocked issue, full context; self-assigns on confirm, the commitment signal); fuel status (balance, burn rate, projected runway); list blockers with suggested actions; raise a task-anchored clarifying question; handoff readiness check (all top-priority tasks done, README + runbook present, repo + deployment URLs set, all work pushed); disable/enable. (Reference files download from the project page.) (→ RM-31)
- Branch/commit conventions auto-applied (task identifiers + linking keywords) so the GitHub integration links work and moves status: branch link flips In Progress, merge flips Done, the only path to done-status. Volunteer can override anything Skill-generated. Manual fallback always present: Linear app + project page cover every Skill behavior; a volunteer who disables the Skill still operates, attribution degrades to unattributed, norms still arrive via the injected governance prompt.

**The Skill is the orchestration shell (promoted to v1 core):**
- Drives Lovable through the adapter, REQ-021 fallback posture. Per-task triage decides build-locally vs delegate-to-Lovable from the task and Discovery's scope split, explains the decision, allows override (heuristic: visual UI rendering → Lovable; else local). After each delegation: pull changes, run tests, decide iterate / done / fix locally.
- Lovable budget guardrails: per-task prompt cap (default 5); interactive confirmation past the cap with a running NGO-credit burn estimate; refusal to exceed an NGO-set hard cap. Every Lovable call audit-logged with a cost estimate; NGO Lovable burn surfaces on admin and NGO dashboards.
- NGO consent gate: "Allow Skill to orchestrate Lovable" toggle; default ON at kickoff with cost disclosure, NGO-revocable, checked before any Lovable call.

(→ RM-32, RM-33)

**Acceptance criteria:** install works end-to-end; bootstrap auto-runs in ai4good repos and shows the banner; binding follows self-assignment per worktree; auth failure degrades to unattributed without blocking work; helper commands work end-to-end; conventions applied with volunteer override; disable/enable persists; docs cover install, configuration, troubleshooting, opt-out, and the disabling implication (attribution degrades; norms via injected prompt).

---
