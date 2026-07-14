#### REQ-021: Lovable Integration — Durable Home + Claude-Code-Orchestrated Build

Lovable is the deliverable vehicle and the NGO's durable maintenance home: after completion the non-technical NGO evolves the live app via Lovable chat, no developer needed. During build, Claude Code is the volunteer's single entry point — it orchestrates Lovable for the UI and handles backend/logic/tests/docs — while ai4good metering, scope enforcement, and audit stay authoritative. Every project uses Lovable (→ RM-26).

**Orchestration posture:**
- Lovable is an external vendor surface outside platform control, accessed through a replaceable integration layer so that a Lovable break degrades to manual work, never a dead build.
- Primary path: Claude Code drives Lovable; on breakage the volunteer drives Lovable in-browser; both commit to the shared repo. UI work spends the NGO's Lovable credits; Claude Code work burns fuel. UI-heavy and backend-heavy mixes are both fine; only a pure-backend tool with no Lovable app fails the fit check and is declined at Discovery.
- Orchestrated calls bill the NGO's workspace under a per-task Lovable-credit cap, are audit-logged, and surface the NGO's credit balance in ai4good; the volunteer connects their own account and calls attribute to them.
- After completion the NGO owns the workspace outright, with no dependency on orchestration or Claude Code.

**Why NGO-self-provisioned:** Lovable exposes no per-project metering API and no BYOK, and bills per workspace; NGO self-provisioning gives zero infrastructure dependency, no markup, and day-one NGO ownership. There is no ai4good connector inside Lovable — Lovable never talks to ai4good.

**Lifecycle:**
- Discovery recommends Lovable with rationale and no dollar estimate; the scope doc states that Lovable is paid directly, never from fuel. The NGO is reminded before kickoff to set up the workspace and invite the volunteer.
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
- [ ] Discovery output recommends Lovable with rationale and no dollar fields; the rendered scope doc carries the paid-directly disclaimer and no dollar figure.
- [ ] Setup is required at kickoff (no opt-in/out) and resolves only on platform validation; a failed check surfaces the specific failure and fix and the item stays open.
- [ ] The setup guide documents the steps; the guide and project page let the parties transfer the required setup information accurately (scope summary, volunteer email, an optional commit-reference snippet — best-effort only, since status moves on PR merges, never parsing), with a validated paste-back and who-acts-next progress.
- [ ] Lovable credit status is pulled from Lovable (with a manual fallback), surfaces low/exhausted, notifies, and offers a direct route to Lovable top-up. No mail parser in v1.
- [ ] Repo-creation permission is granted at volunteer onboarding, not per project.
- [ ] The volunteer is invited at a build-only role; the NGO's Lovable billing (subscription, top-up, payment method) is never accessible to the volunteer, and the NGO can cap the volunteer's credit consumption.
- [ ] The NGO invites both the volunteer and ai4good's read-only monitoring account at kickoff; both memberships are validated before the volunteer starts.
- [ ] At completion the NGO removes both the volunteer and ai4good's read-only monitoring account (no MCP member-management path exists); the platform prompts and confirms.

**Non-goals (v1):** no Lovable subscriptions bought for NGOs; no per-task metering or attribution of Lovable credit consumption (only workspace-level status is read); Lovable cost is never debited from fuel; no credit reselling (→ RM-28); credit visibility is read-only via ai4good's monitoring account — ai4good has no Lovable billing control (no charging, no plan changes).

---

#### REQ-022: Stripe Connect for Volunteer Tips (DEFERRED to v1.5 per §11)

(→ RM-11)

---

#### REQ-023: Platform Triage Gate (compliance review before marketplace)

Every project passes a compliance gate between scope completion and publication, catching policy violations before volunteers see it. **v1: an automated triage screener plus a founder exception queue** — automation decides clear cases and the founder attends only non-decided ones (the REQ-036 scorer shape applied to triage).

**Screener checks:** open-source alignment (all projects public MIT; commercial or closed-source-for-resale work is prohibited; confidential-codebase needs are a categorical decline); nonprofit purpose against the vetted profile; scope reasonableness against the complexity tier (abusive scope caught here); acceptable use (no surveillance, spam, illegal use); data-tier correctness (Tier-2 requires a fixtures-only plan); and Discovery risk flags. It produces a decision with reasons and an uncertainty signal for routing.

**Acceptance criteria:**
- [ ] Publishing routes to the screener, never directly to the marketplace.
- [ ] **Confident-clean → auto-approved → `open`**, with a screener-written audit record (checks, rationale, version).
- [ ] **Tier-2 never auto-approves** — it always routes to the founder.
- [ ] **Non-decided → the founder exception queue** (findings pre-surfaced), reviewed promptly. Two outcomes: **return to `scoped`** (a reason note to the NGO; editing and republishing re-enters the screener and stays invisible; prior notes visible) or **terminal decline** (non-remediable — cannot be edited and resubmitted).
- [ ] Every human decision is recorded: reviewer, timestamp, decision, reason, data tier, scope snapshot.
- [ ] Auto-approved items are surfaced for post-hoc spot-check; exception items expose their age; a break-glass unpublish recovers (REQ-031).
- [ ] Screener threshold + model configuration (same model family as OD-7): **[DECISION: OD-8 — pilot-tuned.]**
- [ ] NGO copy: clean publishes go live immediately; exceptions show an "under review" state with no formal SLA.

---

#### REQ-024: Project Blockers (operational health, independent of lifecycle)

Blockers are independent of lifecycle status, separating "ghosting" from "waiting on someone else"; they feed reputation and escalation and never reduce public completion credit.

**Types (v1):** clarifying question (dev-raised, manually resolved); awaiting NGO review; external dependency; GitHub collaborator needed (a rare edge case, resolved when the NGO confirms access); Lovable setup pending (auto-resolves on validation, REQ-021); fuel top-up needed (auto-raised at the 20% warning and 0% blocking, auto-resolving above 20%); and Lovable credits (status read from Lovable, NGO-resolved) (→ RM-5). An auto-raised type keeps one unresolved instance per project, upgrading its severity in place when the condition worsens rather than creating a duplicate; manual types may have several open.

**Notifications and aging:** raising a blocker notifies the NGO admins (a blocking fuel blocker also notifies an admin); resolution notifies both. An unresolved blocker gets a reminder at 48h and escalates to an admin at 7d, with the project flagged at-risk; Lovable-setup aging notifies the NGO and volunteer, reaching an admin only after 7d of mutual silence. Open blockers auto-archive at completion.

- The volunteer raises a blocker (type, severity, title, body); resolution requires a note; the conversation is the blocker's Q&A plus the project comment thread (no separate chat channel). A manual catch-all type carries a per-instance action-owner, and choosing admin/ops creates the ops item immediately. Every NGO-facing free-text surface of a blocker carries the Tier-1/Tier-2 warning: never paste beneficiary data, passwords, keys, or live credentials.
- Clarifying questions are first-class, project-level or task-anchored (topic, what was tried, what is needed). While one is unresolved, its task is marked awaiting NGO clarification and the volunteer may continue other tasks. Resolved pairs persist in a lifetime Clarifications log (who asked, who answered, when).
- A blocker's presence, count, and highest severity are observable wherever the project is listed (the project page, the marketplace, and the NGO dashboard), which aggregates them by severity then age with prominence past 48h; cadence stats note when work is blocked on NGO action or fuel.

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

**Model:** task state lives in Linear — one free workspace per project. Volunteers and their agents (under the volunteer's identity) read, self-assign, and comment; status moves only via Linear's GitHub integration on PR merge. The platform maintains a read-only mirror of Linear (which powers the status panel and the assistant); the NGO never touches Linear and the panel is its only Linear-visibility surface. GitHub Issues (code bugs only) and Linear comments stay dev-internal; NGO conversation stays on the comment thread, except a task-anchored NGO comment is relayed onto its task for the volunteer (REQ-015).

**Ownership asymmetry (deliberate):** delivery infrastructure is NGO-owned (the Lovable workspace, the repo); coordination infrastructure is platform-owned (Linear, the gateway) and never transfers. After completion the workspace sits dormant at $0 and the final tree is preserved with the repo. Any paid tier is paid by the platform.

**Provisioning:** each project is assigned its Linear workspace at kickoff with no manual step on the kickoff critical path — the volunteer is invited and the PRD bootstrap task is seeded (REQ-036). Provisioning that cannot complete surfaces as an external-dependency blocker rather than stalling silently or inventing a sub-state. The pilot runs on Linear's free tier, risk accepted (→ RM-30).

**Decomposition (from the gated PRD):** kickoff seeds only the bootstrap task; once the dev PRD clears the gate, the platform drafts and pushes the tree — one parent per story, one sub-issue per acceptance criterion, top priority. Briefs must be session-sized and dependency-ordered (blocking relations encoded), the precondition for pull-model correctness and per-task burn data (REQ-034). Coordinator review is a pilot spot-check.

**Pull-based workflow:** self-assignment is the commitment signal (marking the task in progress); volunteers pull the next unblocked issue and the coordinator never pushes. Norms: one issue in progress (one per worktree if parallel), assign before starting, comment when blocked, never move status by hand. Onboarding: match → invite → browse briefs (before cloning anything) → the first work session connects task access → the first pull activates attribution. An in-progress issue with no branch activity for N days raises a coordinator flag proposing return to the backlog. Agentic loops are permitted (handling is loop-agnostic); the template ships a reviewer agent; a loop degrades on auth failure and its PRs never auto-merge. **[DECISION: OD-1 — reviewer identity + merge authority, per project.]**

**Write authority (real-signals enforcement):** volunteers and agents read, comment, and self-assign — never change status. The GitHub integration moves status; the platform creates issues (decomposition; v1 scope-addition tasks are volunteer-created, REQ-025), invites, reverts, and cancels. The NGO holds no Linear seat. Vendor permissions cannot allow assign-and-comment while blocking status changes, so enforcement is detect-and-revert: any status change not backed by a linked merged PR is reverted with an explanatory comment and a low-tone notification to the volunteer. Agent actions attribute to the volunteer, who owns them.

**Lifecycle hooks:** accepted scope additions are volunteer-created linked tasks (REQ-025) (→ RM-10). At completion, lower-priority not-started issues cancel while top-priority never auto-cancels (completion requires all done, REQ-012); volunteer membership is removed, the final tree is preserved with the repo, and the mirror goes read-only. On abandonment, the ex-volunteer's in-progress issues return to the backlog.

**Acceptance criteria:**
- [ ] NGO-visible task state derives solely from observed Linear events and platform lifecycle actions, and is public.
- [ ] A Linear workspace is assigned at kickoff with no manual step on the critical path; if none can be assigned, an external-dependency blocker is raised.
- [ ] Kickoff seeds the bootstrap task; post-gate decomposition pushes session-sized briefs with blocking relations (pilot spot-check).
- [ ] Status flows only from PR merges; detect-and-revert enforces it and notifies.
- [ ] The status panel conveys current work, the task hierarchy, and recent activity. Panel scope beyond that and NGO-introduction mechanics: **[DECISION: OD-2.]**

---

#### REQ-028: ai4good Claude Code Skill (the volunteer's single operating surface)

An ai4good-shipped Skill makes the volunteer's local Claude Code the default operating environment — conventions, helper commands, and session governance as installable, auto-updating agent code shipped through the standard Skill channel (written docs drift out of date; a Skill re-applies itself every session). One-command install; it auto-runs in every session opened in an ai4good repo.

**v1 scope:**
- One-command install, open-source (MIT). Non-secret project config is seeded at repo creation; one login per project. Three separately-revocable credentials: the platform token (blockers, comments, fuel), the task-system OAuth (backlog), and the gateway key (metered LLM traffic).
- Session bootstrap loads the scope summary, status, in-progress tasks, unresolved blockers, recent NGO comments, and fuel runway; verifies task access; reads the binding; and prints a concise session banner (project, active task and its age, fuel, unread comments). (→ RM-10)
- Task binding + degradation (load-bearing): self-assigning binds the issue per worktree, and that binding rides every metered request as the attribution mechanism (REQ-034). **The Skill enforces pull-then-complete:** before substantial work, an explicit choice — pull an issue or enter the exploration bucket — so every session carries attribution context, and exploration turning into implementation forces binding the matching issue. Completion is an explicit dev act: the dev marks done and the Skill verifies and drives the merge that flips status (REQ-026). On task-system auth failure the session degrades without stopping — updates queue locally and surface at session end, and binding floors to unattributed (a floor, not a bypass).
- Helper commands: pick the next task (highest-priority unblocked, full context shown, self-assigns on confirm); fuel status (balance, burn rate, projected runway); list blockers (with suggested actions); raise a task-anchored clarifying question; a completion-readiness check (top-priority done, README + runbook, repo and deployment URLs set, work pushed); and disable/enable. Reference files download from the project page. (→ RM-31)
- Branch/commit conventions (task identifiers + linking keywords) are auto-applied so the GitHub integration links work and moves status: a branch link marks In Progress, a merge marks Done (the only done-path). The volunteer can override anything the Skill generates. A manual fallback always exists — the Linear app and project page cover every behavior, and a disabled Skill still operates, with attribution degrading to unattributed and norms arriving via the injected prompt.

**The Skill is the orchestration shell (v1 core):**
- It drives Lovable through the replaceable integration layer (REQ-021). Per task it recommends build-locally vs delegate-to-Lovable from the task and Discovery's split, explained and overridable; after each delegation it pulls, tests, and iterates, or fixes locally.
- Budget guardrails: a per-task prompt cap, interactive confirmation past it with a running burn estimate, and refusal beyond an NGO-set hard cap. Every call is audit-logged with a cost estimate, and the NGO's Lovable burn shows on the admin and NGO dashboards.
- NGO consent gate: "Allow Skill to orchestrate Lovable" — on by default at kickoff with cost disclosure, revocable, and checked before every call.

(→ RM-32, RM-33)

**Acceptance criteria:** install works end-to-end; bootstrap auto-runs with the banner; binding follows self-assignment per worktree; auth failure degrades without blocking; helper commands work; conventions apply with override; disable/enable persists; and docs cover install, configuration, troubleshooting, opt-out, and the disabling implication.
