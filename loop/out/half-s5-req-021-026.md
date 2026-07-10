#### REQ-021: Lovable Integration — Durable Home + Claude-Code-Orchestrated Build

Lovable is the deliverable vehicle and the NGO's durable maintenance home: post-handoff the non-technical NGO evolves the live app via Lovable chat — no developer needed. During build, Claude Code is the volunteer's single entry point — it orchestrates Lovable for UI and handles backend/logic/tests/docs; ai4good metering, scope enforcement, and audit stay authoritative. Every project uses Lovable (decision-23) (→ RM-26).

**Orchestration posture:**
- Lovable's surface is a research preview; access isolated behind one internal adapter.
- Primary path: Claude Code drives Lovable; on breakage the volunteer drives Lovable in-browser, both committing to the shared repo. UI work spends NGO Lovable credits; Claude Code work burns fuel. A pure-backend tool fails the fit check — declined at Discovery (decision-23).
- Orchestrated calls bill the NGO workspace: per-task Lovable-credit cap, every call audit-logged, NGO credit balance surfaced in ai4good. The volunteer connects their own account; calls attribute to them.
- Post-handoff the NGO owns the workspace outright; zero dependency on orchestration or Claude Code.

**Why NGO-self-provisioned:** Lovable has no per-project metering API, no BYOK, per-workspace billing. Self-provisioning: zero infrastructure dependency, no markup, day-one NGO ownership. No ai4good connector inside Lovable (decision-20); Lovable never talks to ai4good.

**Lifecycle:**
1. Discovery flags the Lovable recommendation with rationale; no dollar estimate; scope doc notes "paid directly to Lovable, never from fuel." Pre-kickoff reminder banner to the NGO: set up the workspace + invite the volunteer.
2. Setup mandatory at kickoff: a blocking item auto-raised to the NGO, self-served via blockers + comments; zero admin involvement; no NGO GitHub account. Checklist: NGO signs up (paid tier for workspace-admin), creates the workspace + Lovable project from a one-click-copied scope summary, invites the volunteer as workspace admin **plus the platform ops account as member (decision-35 — powers automated offboarding at handoff/abandonment, exits at handoff)**; volunteer accepts, connects GitHub sync (repo created in the platform org), pastes back identifiers; platform auto-validates (repo in org, flipped public post-validation, GitHub App installed, name collisions surfaced, volunteer permission normalized — cannot add collaborators unnoticed), auto-resolves, seeds the template, notifies both.
3. Stuck parties raise clarifying blockers, standard aging; admin pinged only at 7 days. The volunteer works locally immediately after setup — no further approval. (Collaborator-request blocker: legacy own-org edge case only.)
4. Credit status manual in v1: a volunteer-set widget (active / low / blocked); low/blocked shows the NGO a top-up CTA deep-linked to Lovable billing; "I've topped up — unblock" resets (→ RM-27).
5. Handoff (automated — decision-35): the platform removes the volunteer via its member seat, then itself; the NGO keeps workspace + billing alone. Repo stays in the platform org with NGO admin access (no transfer — decision-24/33); GitHub sync continues. **[VERIFY on the first pilot]:** member removal + self-removal via API/MCP; fallback = manual NGO removal with a notice.

**Acceptance criteria:**
- [ ] Discovery output: Lovable recommendation + rationale, no dollar fields; the rendered scope doc carries the paid-directly disclaimer and no dollar figure.
- [ ] Setup item auto-raised at kickoff (no opt-in/out); resolved only by platform validation; a failed check shows the specific failure + fix, item stays open.
- [ ] Setup guide + per-project page: one-click copies (scope summary, volunteer email, optional commit-identifier snippet — best-effort only; status moves on PR merges, never parsing), validated paste-back form, who-acts-next progress.
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

**Screener checks:** open-source alignment (all projects public MIT; confidential-codebase needs = categorical decline, decision-27; other alignment failures ride the screener/exception outcomes); nonprofit purpose vs the vetted profile; scope reasonableness vs complexity tier; acceptable-use (no surveillance, spam, illegal use); data-tier correctness (Tier-2 requires a fixtures-only plan); Discovery risk flags. Returns pass/flag + reasons + confidence.

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

- Dev raises via "Raise a flag" (type, severity, title, body); resolution requires a note; conversation = blocker Q&A + comment thread (no chat channel — decision-15). Manual catch-all types carry a per-instance action-owner (type default); choosing admin/ops creates the ops item immediately (decision-26/c4 guard). Every NGO-facing free-text surface from a blocker carries the Tier-1/Tier-2 warning: never paste beneficiary data, passwords, keys, or credentials (decision-26/c4 guard).
- Clarifying questions are first-class: project-level or task-anchored (topic, what you tried, what you need). While unresolved: "Awaiting NGO clarification — volunteer can continue other tasks; this one is paused." Resolved pairs persist in a lifetime Clarifications log (who asked, who answered, when).
- Surfacing: project-page badge (count + severity); card indicators; the NGO-dashboard "Action needed" rail (aggregating across projects) sorted severity-then-age, emphasized past 48h; cadence stats annotated "(blocked on NGO action / fuel)".

**Acceptance criteria:** raise/resolve works for both roles; fuel blockers auto-raise/resolve at thresholds with in-place upgrade; Lovable-credit blockers ride the widget; notifications and 48h/7d aging fire as above; auto-archive on handoff; all surfaces render.

---

#### REQ-025: Mid-Build Scope Additions (structured CR surface deferred to v1.5 — decision-29/r1, amending decision-16)

**v1 is informal, decision-16 principle intact:** nothing interrupts the volunteer, nothing auto-assigns; the volunteer is the sole work-acceptance authority (enforced socially at concierge scale, not mechanically). The NGO raises ideas in the comment thread. Protocol (decision-29 guards):
- Nothing enters scope until the volunteer accepts in-thread AND creates the linked task — before material fuel is spent (REQ-034).
- An accepted addition is top-priority (handoff-blocking) or explicitly NGO-acknowledged as optional — non-blocking — before handoff.
- One active scope-addition discussion per project; further asks wait or become a follow-up project.
- Copy: additions consume existing fuel, may extend the timeline, are volunteer-optional; never paste beneficiary data, secrets, or credentials.
- Additions changing data sensitivity, AUP/compliance posture, or open-source fit pause for founder re-triage.

(→ RM-10, RM-29)

---

#### REQ-026: Platform Task Management (Linear as system of record — decision-20)

Decision-20 replaces the git-as-truth tree: real signals, not AI-authored narratives. Linear gives event-granular, actor-attributed real-time signals; an enforceable read/write split; no merge conflicts under parallel worktrees; a hosted backlog predating the clone; per-volunteer attribution.

**Model:** task state lives in Linear — one free workspace per project. Volunteers and their agents (under the volunteer's identity) read, self-assign, comment; status moves only via Linear's GitHub integration on PR merge. The platform mirrors Linear events one-way into its store (powers the Status Panel + assistant); the NGO never touches Linear — the panel is its only Linear-visibility surface. GitHub Issues (code bugs only) and Linear comments stay dev-internal; NGO conversation stays on the comment thread.

**Ownership asymmetry (deliberate):** delivery infrastructure NGO-owned (workspace, repo); coordination infrastructure platform-owned (Linear, gateway), never transferred. Post-handoff the workspace sits dormant at $0; the tree snapshots into the repo as markdown. Any paid tier: platform pays.

**Provisioning — pool model:** workspace creation has no public API; the concierge pre-creates ready workspaces in batch (platform access, events, GitHub integration pre-wired). Kickoff: assign next ready workspace, rename, invite volunteer, seed the PRD bootstrap task (REQ-036) — no manual step. Replenishment fires below a watermark (default 3); an empty pool at kickoff raises an external-dependency blocker — the only stall mode. Bulk empties sharpen the fair-use question; pilot proceeds on free-tier terms, risk accepted (→ RM-30).

**Decomposition (from the gated PRD — decision-25):** kickoff seeds only the bootstrap task; once the dev PRD clears the gate, the platform drafts and auto-pushes the tree — one parent per story, one sub-issue per acceptance criterion, top priority. Briefs must be session-sized and dependency-ordered (blocking relations encoded); the precondition for pull-model correctness and per-task burn data (REQ-034). Coordinator review retires to a pilot spot-check (supersedes the decomposition half of decision-24(a)).

**Pull-based workflow:** self-assignment = the commitment signal (flips the panel to "in progress"); volunteers pull the next unblocked issue; the coordinator never pushes. Norms: one issue in progress (one per worktree if parallel); assign before starting; comment when blocked; never move status by hand. Onboarding: match → invite → browse briefs (before cloning anything) → first session connects task access → first pull activates attribution. No branch activity for N days raises a coordinator release flag. Agentic loops permitted (handling loop-agnostic); the template ships a skeptical reviewer-agent; loops degrade on auth failure (updates queue, surface at session end); loop PRs never auto-merge. **[DECISION: OD-1 — reviewer identity + merge authority.]**

**Write authority (real-signals enforcement):** volunteers/agents read, comment, self-assign — never change status. The GitHub integration moves status; the platform creates issues (decomposition; v1 scope-addition tasks are volunteer-created, REQ-025), invites, reverts, cancels. The NGO holds no Linear seat. OAuth scopes can't express "assign + comment but not status," so enforcement is detect-and-revert: any status change not from the GitHub integration and lacking a merged PR is auto-reverted with an explanatory comment + low-tone notification (a restricted proxy held in reserve if reverting proves noisy). Agent actions attribute to the volunteer, who owns them.

**Lifecycle hooks:** accepted scope additions = volunteer-created linked tasks (REQ-025) (→ RM-10). At handoff-pending: lower-priority not-started issues cancel; top-priority never auto-cancels (handoff requires all done, REQ-012); the final tree snapshot commits to the repo. At handed-off: volunteer membership removed; the mirror goes read-only. On abandonment: the ex-volunteer's in-progress issues return to the backlog.

**Acceptance criteria:**
- [ ] NGO-visible task state derives solely from observed Linear events + platform lifecycle actions; public (decision-27).
- [ ] Pool assignment + watermark replenishment as described; empty pool raises the blocker.
- [ ] Kickoff seeds the bootstrap task; post-gate decomposition auto-pushes with session-sized briefs + blocking relations (pilot spot-check — decision-25).
- [ ] Status flows only from PR merges; detect-and-revert enforces and notifies.
- [ ] Status Panel: "now working on" strip, hierarchical tree, live activity feed. Panel scope beyond that + NGO introduction mechanics: **[DECISION: OD-2.]**
- [ ] **[VERIFY on the first pool batch]:** free-tier events, API mutations, programmatic invites, rename, pre-connected GitHub integration seeing later repos. Fallback: paid tier (platform pays) or git-based state with a deterministic truth layer.

---

#### REQ-028: ai4good Claude Code Skill (volunteer-facing single pane of glass)

An ai4good-shipped Skill makes the volunteer's local Claude Code the canonical operating environment: conventions, helper commands, and session governance as installable, auto-updating agent code shipped through the standard Skill channel (docs drift; a Skill runs every session). One-command install; auto-runs in every session opened in an ai4good repo.

**v1 scope:**
- One-command install; open-source (MIT). Non-secret project config seeded at repo creation; one-time login per project. Three credentials, three revocation semantics: platform token (blockers, comments, fuel), task-system OAuth (backlog), gateway key (metered LLM traffic).
- Session bootstrap primes scope summary, status, in-progress tasks, unresolved blockers, recent NGO comments, fuel runway; verifies task access; reads the binding; prints a one-line banner (project, active task + age, fuel, unread comments). (→ RM-10)
- Task binding + degradation (load-bearing): self-assigning records the issue in a per-worktree binding riding every metered request — the attribution mechanism (REQ-034). **The Skill enforces pull-then-complete:** before substantial work, an explicit choice — pull an issue or enter the exploration bucket — so every session carries attribution context; exploration turning implementation → it insists on binding the matching issue. Completion is an explicit dev act: dev marks done; the Skill verifies and drives the merge that flips status (REQ-026). On auth failure the session degrades without stopping: updates queue locally, surface at session end; binding floors to unattributed (a floor, not a bypass).
- Helper commands: pick next task (highest-priority unblocked, full context shown; self-assigns on confirm); fuel status (balance, burn, runway); list blockers (with suggested actions); raise a task-anchored clarifying question; handoff readiness check (top-priority done, README + runbook, URLs set, work pushed); disable/enable. (Reference files download from the project page.) (→ RM-31)
- Branch/commit conventions (task identifiers + linking keywords) auto-applied so the GitHub integration links work and moves status: branch link → In Progress, merge → Done (the only done-path). The volunteer can override anything the Skill generates. Manual fallback always: Linear app + project page cover every behavior; a disabled Skill still operates — attribution degrades to unattributed, norms arrive via the injected prompt.

**The Skill is the orchestration shell (v1 core):**
- Drives Lovable through the adapter (REQ-021 fallback posture). Per-task triage: build-locally vs delegate-to-Lovable from the task + Discovery's split, explained, overridable (heuristic: visual UI → Lovable; else local). After each delegation: pull, test, iterate / done / fix locally.
- Budget guardrails: per-task prompt cap (default 5); interactive confirmation past it with a running burn estimate; refusal beyond an NGO-set hard cap. Every call audit-logged with a cost estimate; NGO Lovable burn on admin + NGO dashboards.
- NGO consent gate: "Allow Skill to orchestrate Lovable" — default ON at kickoff with cost disclosure, revocable, checked before every call.

(→ RM-32, RM-33)

**Acceptance criteria:** install end-to-end; bootstrap auto-runs + banner; binding follows self-assignment per worktree; auth failure degrades without blocking; helper commands work; conventions applied with override; disable/enable persists; docs cover install, configuration, troubleshooting, opt-out, and the disabling implication.

---
