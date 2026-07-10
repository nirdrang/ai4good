#### REQ-007: Volunteer Profile & Concierge Matching (organic marketplace apply-flow deferred to v1.5 — decision-28)

Volunteers sign up (GitHub preferred) and build a profile. **v1 matching is concierge-only**; first cohort hand-matched (Goal 5 → RM-8). Project pages public (Platform Promise §2); interest reaches the concierge out-of-band.

- Sign-up: GitHub OAuth, Google OAuth, or email/password; GitHub linkable later. Linked = auto-populated languages, repo count, contribution summary; unlinked hides them.
- Profile: skills, causes, hours/week, optional bio.
- **Admin enforce-match (decision-28):** binding; no NGO approve/decline. Gates: (a) volunteer one-click confirm — first-project disclaimer if unsigned (GitHub link required; inline OAuth modal); no repo/key/Linear access or Tier-2 intro pre-disclaimer; (b) NGO per-match acknowledgment (fuel ≠ deliverable, no SLA, names the volunteer) on the funding screen; kickoff fires only on funding (match-to-fund).
- **Concierge match log (admin-only):** every attempt — invited, consented, declined/expired/released, timestamps, reason. Goal-5 evidence for opening organic browse; not a public queue.
- **On GitHub link, volunteer auto-added to the platform GitHub org** with repo-creation rights (REQ-008/021). Recorded + audited.
- **Org removal by cause:** (a) voluntary deactivation — membership removed, per-project access on active projects persists; (b) **AUP enforcement (v1 minimal — flow verdict 2026-07-08):** admin deactivates the account (lifecycle state gates every platform write), instantly revokes project virtual keys, audited note; residual repo/Linear/org access removed by a short manual checklist; Lovable-workspace removal via the build-phase member seat (decision-35); reversal = manual re-enable + key re-issue (→ RM-14); (c) 24-month inactivity — soft removal, like (a).
- Dashboard shows GitHub status ("Linked as @handle" / "Not linked — link now to accept a match").
- Public listing (read-only v1): title, summary, complexity tier, stack, cause tags, NGO name, posted date — newest-first, no filter/sort (→ RM-8; no public verification badge, decision-29/r3 → RM-6).
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

**Placement doctrine (platform-wide):** volunteer-editable files = soft norms; the gateway-injected prompt = durable norms (re-applied every request); deterministic code = hard invariants. Third-party permission models: trusted for access, never policy (Lovable has no role between Admin and Editor; Linear scopes can't express "assign + comment but no status change").

**Threat model:** the binding marker = **tripwire, not lock** — copyable; converts accidental misuse (key reused on another repo, the dominant case) into unambiguous intent. The virtual key = the credential; key + repo context blocks outsiders only. Caps bound exposure; the ledger attributes; revocation ends it — detection can afford latency. Revocation = individual enforcement; marker rotation = hygiene, never anti-insider. Rate limits = reliability; project-lifetime fuel = economics — never size caps adversarially. Governance capacity follows observed behavior; deterrence = onboarding disclosure (usage attributed, reviewed). Anything taxing legitimate volunteers inverts its purpose.

- One key per (volunteer, project), shown once, auto-minted at kickoff, never logged.
- Onboarding = two env vars on the volunteer dashboard, with instructions; rejection copy instructs, never accuses.
- Streaming preserved end-to-end; gateway overhead under 150ms p95 (excluding model latency).
- **Caps per key:** per-request max + rolling 24-hour window sized 3–4× a heavy human day. 80% → soft warning; 100% → hard stop, one-action coordinator override. Values from pilot data (**OD-3**).
- **Project-binding check:** a committed marker ("ties NGO-funded fuel to this project; please don't move it") rides the session prompt; the gateway verifies it against the key's project on substantive requests only (small background calls skipped; threshold **OD-4**). Mismatch → instructive rejection naming the key's project.
- **Governance prompt on every request:** project-scope line (decline unrelated requests) + the never-change-Linear-status rule (REQ-026).
- **Inline metering (the money path):** tokens priced by the local rate card, 15% margin, paired consumption recorded immediately; retries cannot double-charge; task attribution attached when known (REQ-034); all REQ-006 money invariants hold.
- **Fuel thresholds:** 20% → NGO notification + warning blocker; 5% → volunteer in-app warning; **0% → the gateway declines the next request inline, stating the cause** ("project fuel is exhausted — ask your NGO to top up"); the blocker flips to blocking. Post-top-up the next request passes — no reactivation machinery.
- **401 semantics:** flat externally (no revoked-vs-nonexistent distinction) EXCEPT fuel exhaustion, which states its cause — that caller must act. Rich diagnostics only on the authenticated dashboard. First-week 401s = onboarding-UX metric, not threat signal.
- **Revocation instant and self-serve:** NGO "suspect misuse — revoke access now" and admin enforcement cut access immediately; a replacement key issues instantly. All project keys terminate at handoff (REQ-012), abandonment release (REQ-027), AUP deactivation (REQ-007).
- **Privacy invariants (load-bearing):** request bodies inspected transiently, never persisted; ledger = token counts + metadata only; derived origin/mismatch signals stored as score or boolean — never paths or content.
- **Key-leak hygiene (v1 = prevention, not detection — decision-26):** env files ignored by default; the platform key pattern registered with GitHub secret scanning + push protection (→ RM-22). Org-namespace guard: private-only member repo creation, visibility changes owners/platform-automation only, Pages/Actions restricted for unmatched repos — asserted by the REQ-008 invariant. Public flip only after checklist validation; founder daily review = one org-repo-vs-active-projects comparison.
- **Escalation ladder documented, NOT built in v1** (keeps the no-surveillance decision visible) (→ RM-9).

Dependencies: REQ-006, REQ-024, REQ-034, REQ-012/027/007 (key-termination hooks). Only provider surface: the model API through the gateway.

---

#### REQ-010: Project Page (single view) & Cadence Stats

One **public page** per project — the same view for NGO admins, assigned volunteer, platform admins, logged-out visitors. Platform = PM/coordination; dev workflow lives on GitHub — no "developer view."

- One page, no per-role variants; the full task tree public on every project (Platform Promise §2).
- Header: title, NGO name, status, assigned volunteer, repo URL (plain-language empty state while setup pends), complexity tier, cause tags.
- **Task tree = primary content:** hierarchical progress bars, status badges, "Now working on" highlight, plain-language titles. Progress % = done P0 tasks / total P0 tasks — from the tree, never GitHub issues.
- **Plain-language activity feed:** commits become readable statements tied to task titles ("Volunteer completed work on Task 3.2 — Scheduler core (2h ago)"), never raw PR jargon.
- Reference-files section (REQ-032): need-files with descriptions; downloads limited to assigned volunteer, NGO admins, platform admin — restricted despite the public repo; NGO adds/removes pre-handoff.
- Clarifications tab (REQ-024): resolved questions persist as a Q&A log (question, answer, who, when); "Awaiting NGO clarification" banner while any is unresolved.
- Fuel gauge = real-time provider truth (decision-30): Anthropic-reported usage per gateway response (moves within seconds), validated continuously by a tight-cadence pull of Anthropic's aggregate usage reporting.
- **No GitHub Issues, PR lists, or raw commit logs on the page** — the header repo link is the only GitHub touchpoint.
- **Cadence stats (v1 minimal — decision-26):** commits this week vs last with delta + last-activity timestamp (red past 14 days during build), from code events only (→ RM-23). Promise §6's two progress signals stay intact.
- **Dual fuel-meter display (REQ-021):** side-by-side "Claude Code (via fuel)" (balance, % remaining, low/depleted indicators) and "Lovable (direct to Lovable)" (setup CTA pre-setup; then status + workspace link + top-up CTA); tooltips note separate purses. **Standing trigger (decision-30):** (→ RM-58)

Dependencies: REQ-008, REQ-009.

---

#### REQ-011: Public Project Listings (v1 read-only; browse/sort/filter machinery v1.5 — decision-28)

v1: public, read-only, newest-first list — anyone sees what ai4good is building. Matching is concierge (REQ-007); no apply flow, filters, badges, or scoring. Volunteers self-select via the concierge; NGOs make no accept/decline decision (enforce-match).

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
- **30-day-alive signal (north star):** automated ping 30 days post-handoff — reachability only, measured, never guaranteed (no SLA, Promise §4). v1 longitudinal signal = the structured day-45–60 founder check-in (REQ-035 — decision-26/c8) (→ RM-25).
- NGO reviews (repo URL + live URL + checklist results); signs off or rejects with comments. Rejection-loop cap, neutral review, and contest path removed (flow #8 verdict 2026-07-08); a stuck reject cycle = a support conversation.
- On accept: project → `handed_off`; leftover fuel → NGO general balance as non-cash credit (REQ-006); volunteer completion-credit event recorded, private confirmation (→ RM-3); all project virtual keys terminate (REQ-009); Linear membership removed, tree snapshotted (REQ-026); the **REQ-035 attribution step** captured at sign-off.
- **Repo handoff (uniform):** repo stays in the platform org; NGO admin → admin; volunteer removed or read-only, **at the NGO's choice**. No transfer step.
- No tip flow in v1 (→ RM-11). Sign-off includes the attribution step (testimonial + 3 credit-framed dimensions), superseding the "no satisfaction form" deferral — attribution capture, not a satisfaction score; never blocks acceptance.

Dependencies: REQ-008, REQ-006, REQ-021, REQ-009, REQ-026, REQ-035.
