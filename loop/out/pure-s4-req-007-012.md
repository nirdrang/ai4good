#### REQ-007: Volunteer Profile & Concierge Matching

Volunteers sign up with a mandatory GitHub link and build a profile. **v1 matching is concierge-only**; the first cohort is hand-matched (Goal 5 → RM-8). Project pages are public (Platform Promise §2); **volunteers mark interest in-product ("candidate for this project"). A candidate-bearing project must be concierge-matched from its interested pool within a bounded period; accumulating interest may only shorten that period, never extend it; a project with no candidates stays open under Goal-5 aging.** The organic marketplace apply-flow is deferred (→ RM-8).

- Sign-up via GitHub, Google, or email; **a GitHub link is mandatory at signup — no unlinked volunteer accounts**; a linked account's public GitHub stats (top languages, repository count, contribution summary) populate the profile.
- Profile: skills, causes, availability (hours/week), optional bio.
- **Admin enforce-match (from the candidate pool):** binding; no NGO approve/decline. Two consent gates: (a) the volunteer explicitly confirms, which fires the first-project disclaimer if unsigned — no repo/key/Linear access or Tier-2 introduction before that disclaimer; (b) the NGO acknowledges the match (fuel ≠ deliverable, no SLA, names the volunteer) at funding. Kickoff fires only on funding (match-to-fund); a consented match is kickoff-ready.
- **Concierge match log (admin-only):** records every match event (candidacy, invitation, consent, decline/expiry/release) with timestamps and reason — Goal-5 evidence for opening organic browse; not a public queue; candidacies never surface to the NGO.
- **At first match consent** the volunteer is added to the platform GitHub org with repo-creation rights (REQ-008/021); org membership is never granted at signup. Recorded + audited.
- **Org removal by cause:** (a) voluntary deactivation — membership removed; per-project access on active projects persists; (b) **AUP enforcement:** the admin deactivates the account (lifecycle state gates every platform write), immediately revoking account writes and the project's virtual keys; residual repo/Linear/org/Lovable access is then promptly removed and audited; reversal is manual re-enable + key re-issue (→ RM-14); (c) 24-month inactivity — soft removal, as (a).
- The volunteer's dashboard shows their linked GitHub handle and open candidacies.
- **Public listing (read-only v1):** each open project is listed newest-first, exposing its title, summary, complexity tier, needed skills, cause tags, NGO name, and posted date; browse/sort/filter and any public verification badge are deferred (→ RM-8, RM-6).
- (→ RM-8, RM-21)

Dependencies: REQ-001, REQ-005, REQ-008.

---

#### REQ-008: GitHub Integration (Code substrate + dev-internal issue tracker)

Every funded project has a public-MIT repository in the platform GitHub org (all public), created through the volunteer-driven Lovable→GitHub setup.

- **Uniform repo home:** repositories remain in the platform org permanently — no handoff transfer; MIT licensing + Lovable's two-way sync keep the code forkable and exportable; the NGO admin holds admin access from handoff onward.
- Access: the volunteer maintains the repo; the NGO admin has read + comment, never push.
- Code events feed cadence stats and task linkage from repo creation; done status comes only from verified code merge, other status transitions only from authorized integration events, never manual edits (REQ-026).
- **GitHub Issues are dev-internal only** (bugs, refactors, tech debt), never NGO-visible; the Linear task tree is the source of truth for NGO-visible deliverables. No issues are auto-created from the scope doc.
- **Repo seeding:** each repo is seeded with the platform's session guidance and working conventions — the project-binding marker (REQ-009), task-binding conventions (REQ-034), the Linear working norms (one issue in progress, assign before starting, comment when blocked, never move status by hand), commit conventions that link work to its task, a reviewer-agent skill, and env-file hygiene. Platform API credentials are never committed; they are shown once and are separately revocable from the virtual key.
- The platform holds only short-lived, on-demand GitHub credentials; no user PATs.
- **One-time org setup at launch:** the platform and Lovable GitHub Apps are installed org-wide under least-privilege scopes, with credential rotation and a break-glass org-compromise runbook. Org membership grants no repo access by default (explicit adds only); orphan repos matching no active project are monitored; NGO admins are per-project outside collaborators, never members.
- **Continuously-asserted base-permission invariant (P0):** members have no default repo access; member-created repos stay private and become public only after setup validation of the repo URL; repository visibility changes are limited to owners and platform automation — continuously verified and auto-remediated (REQ-009 org-namespace guard).
- **Lovable path (v1 default):** no repo is pre-created at funding; the Lovable→GitHub setup is volunteer-driven with no admin involvement, the platform validates and records the resulting repo URL, and unresolved setup is surfaced for follow-up. A recorded repo URL is a hard handoff precondition.
- The seeded README carries the title, NGO name, plain-language summary, license, and project-page link.
- **At handoff:** the volunteer drops to read/triage and the NGO admin holds admin — no org transfer; the platform removes the volunteer from the Lovable workspace and then removes itself.

Dependencies: REQ-006, REQ-007, REQ-021, REQ-026.

---

#### REQ-009: LLM Gateway — Virtual Keys, Caps & Inline Fuel Metering

A platform-controlled LLM gateway sits in the request path; hosting is open (**OD-6**). Each (volunteer, project) pair is issued its own **virtual key**, and standard Claude Code works unchanged. Every volunteer request must be authenticated, checked against the key's status, usage caps, remaining fuel, and project binding, governed by the injected project-scope policy, metered, and forwarded to the provider without ever exposing the real org credential; streaming is preserved end-to-end and gateway latency must not degrade the interactive experience.

**Enforcement placement (load-bearing):** policy that must hold cannot depend on volunteer-editable files or on third-party permission models — Lovable and Linear cannot express the roles the platform needs — so durable enforcement lives only in platform-controlled surfaces (the gateway) and deterministic code.

**Threat posture:** the project-binding marker is a tripwire, not a lock — it is copyable and flags misuse rather than preventing a determined insider. Usage caps bound exposure and must never be sized to punish legitimate heavy use; the ledger attributes spend; revocation is immediately available as enforcement; deterrence is onboarding disclosure that usage is attributed and reviewed.

- One key per (volunteer, project), shown once, minted at kickoff, never logged.
- Onboarding is minimal (the volunteer supplies the project credential to Claude Code); rejection and setup-failure messaging instructs, never accuses.
- **Usage caps per key** (per-request and rolling-window), sized to accommodate heavy legitimate use while bounding exposure — a soft warning as the cap approaches, a hard stop at it with a one-action coordinator override (values **OD-3**).
- **Project-binding check:** the committed marker rides the session; the gateway verifies it against the key's project on substantive requests (threshold **OD-4**), and a mismatch yields an instructive rejection naming the key's project.
- **Injected governance on every request:** the project-scope rule (decline/redirect unrelated requests) and the never-change-Linear-status rule (REQ-026).
- **Inline metering (the money path):** tokens are priced at the local rate card with the 15% margin and recorded as paired consumption immediately; retries cannot double-charge; task attribution is attached when known (REQ-034); all REQ-006 money invariants hold.
- **Fuel thresholds:** at 20% the NGO is notified with a warning blocker; at 5% the volunteer is warned; at 0% the gateway declines the next request inline, stating the cause, and the blocker becomes blocking. After top-up the next request passes — no reactivation step.
- **401 semantics:** externally flat (no revoked-vs-nonexistent distinction) except fuel exhaustion, which states its cause because that caller must act; rich diagnostics appear only on the authenticated dashboard.
- **Revocation is instant and self-serve:** an NGO "revoke access now" action and admin enforcement cut access immediately, with an instant replacement key; all project keys terminate at handoff (REQ-012), abandonment release (REQ-027), and AUP deactivation (REQ-007).
- **Privacy invariants (load-bearing):** request bodies are inspected transiently and never persisted; the ledger holds token counts and metadata only; any derived origin/mismatch signal is stored as a score or boolean, never paths or content.
- **Key-leak hygiene (v1 = prevention, not detection):** env files are ignored by default and the platform key pattern is registered with GitHub secret scanning + push protection (→ RM-22); the org-namespace guard keeps member repos private until setup validation (asserted by the REQ-008 invariant); the founder's daily review compares org repos against active projects.
- **An escalation ladder is documented, not built, in v1** (→ RM-9).

Dependencies: REQ-006, REQ-024, REQ-034, REQ-012/027/007 (key-termination hooks). Only provider surface: the model API through the gateway.

---

#### REQ-010: Project Page (single view) & Cadence Stats

One **public page** per project, whose read-only content is the same for NGO admins, the assigned volunteer, platform admins, and logged-out visitors. The platform surface is PM/coordination; the dev workflow lives on GitHub — there is no separate "developer view."

- The page content is public and role-uniform; the full task tree is public on every project (Platform Promise §2). The one viewer-specific element is the NGO project assistant (REQ-033) — an interactive bot interface surfaced **only to the project's NGO account**, never to the volunteer, platform visitors, or the public.
- The page identifies the project (title, NGO, status, assigned volunteer, repo URL with a plain-language empty state while setup pends, complexity tier, cause tags).
- **The task tree is the primary content:** the page must convey task hierarchy, each task's status, the work currently underway, and overall progress, where progress reflects completed P0 tasks against all P0 tasks (from the tree, never GitHub issues).
- **Activity is shown in plain language** tied to task titles, never raw PR/commit jargon.
- Reference files (REQ-032) are listed with descriptions; downloads are restricted to the assigned volunteer, NGO admins, and platform admin despite the public repo; the NGO can add/remove them pre-handoff.
- Resolved clarifications (REQ-024) persist as a lifetime Q&A log recording who asked, who answered, and when; an unresolved clarification is conspicuously indicated.
- The fuel balance shown reflects real-time provider truth and stays reconciled with Anthropic's authoritative usage reporting.
- **No GitHub Issues, PR lists, or raw commit logs appear on the page** — the repo link is the only GitHub touchpoint.
- **Cadence stats (v1 minimal):** recent commit activity versus the prior period and time since last activity, from code events only, with a stale-activity indication during build (→ RM-23). Promise §6's two progress signals stay intact.
- **Both funding states are shown distinctly (REQ-021):** the Claude Code fuel balance and the separate Lovable-credit status — Lovable setup before connection, then Lovable status, workspace access, and top-up after — so the two purses are never conflated. **Standing trigger:** (→ RM-58)

Dependencies: REQ-008, REQ-009.

---

#### REQ-011: Public Project Listings (v1 read-only; browse/sort/filter machinery v1.5)

v1 is a public, read-only listing of open projects (newest-first) with exactly one volunteer action: marking interest ("candidate for this project"), which feeds the admin match log only. Matching is concierge (REQ-007); there is no NGO-facing apply queue, no filters/sort/scoring, and no NGO accept/decline (enforce-match). No algorithmic ranking or NGO-satisfaction weighting in v1.
- (→ RM-8, RM-21, RM-24)

Dependencies: REQ-007.

---

#### REQ-012: Handoff Workflow

From "code done" to "NGO operating solo." Because Lovable is enforced and git-bound, the app and repo are already the NGO's and handoff transfers nothing; its substance is the **access transition (offboarding the volunteer) plus bookkeeping** (attribution, credit, fuel release, `handed_off`).

- The volunteer requests handoff once all P0 tasks are done; open GitHub Issues never block it.
- **Hard precondition: the project repo exists** (Promise §2). Until it does, handoff cannot be requested and the parties are told how to resolve it, with no admin escalation.
- A P0 task reaches done only through verified code merge, so every done task carries shipped code; no manual spot-checks.
- Before handoff, the platform confirms the presence of required documentation, licensing, deployment guidance, and a passing CI run (README, RUNBOOK, deploy instructions, ≥1 passing CI run on main, MIT LICENSE).
- **Deploy-to-running (the deliverable is a running tool, not a repo):** a validated live deployment URL is a handoff precondition (no URL, no completed handoff); the volunteer confirms Lovable workspace ownership with the NGO and completes a guided maintenance handover that leaves the NGO able to self-maintain — row-level access enforcement enabled on the Lovable database, chat/plan-mode and rollback demonstrated, a Lovable spend cap set, and live two-way GitHub sync confirmed.
- **30-day-alive signal (north star):** 30 days post-handoff the platform records whether the tool is still reachable — measured, never guaranteed (no SLA, Promise §4). The v1 longitudinal signal is the structured day-45–60 founder check-in (REQ-035) (→ RM-25).
- The NGO reviews (repo URL, live URL, checklist results) and signs off or rejects with comments; there is no rejection-loop cap, neutral-review, or contest path — a stuck reject cycle is a support conversation.
- On acceptance: the project becomes `handed_off`; leftover fuel is released to the NGO's general balance as non-cash credit (REQ-006); the volunteer's completion-credit event is recorded with a private confirmation (→ RM-3); all project virtual keys terminate (REQ-009); Linear membership is removed and the final task history is preserved (REQ-026); the **REQ-035 attribution step** is captured at sign-off.
- **Repo handoff:** the repo stays in the platform org, the NGO admin holds admin, and the volunteer is removed or dropped to read-only **at the NGO's choice** — no transfer step.
- No tip flow in v1 (→ RM-11). Sign-off includes the attribution step (a testimonial plus three credit-framed dimensions), which supersedes the "no satisfaction form" deferral — attribution capture, not a satisfaction score, and never blocking acceptance.

Dependencies: REQ-008, REQ-006, REQ-021, REQ-009, REQ-035, REQ-026.
