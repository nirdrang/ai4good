#### REQ-007: Volunteer Profile & Concierge Matching

Volunteers sign up with a mandatory GitHub link and build a profile. **v1 matching is concierge-only**; the first cohort is hand-matched (Goal 5 → RM-8). Project pages are public (Platform Promise §2); **volunteers mark interest in-product ("candidate for this project"), and the concierge matches from the interested pool at its own judgment — there is no candidacy window or matching deadline in v1; a project with no candidates stays open under Goal-5 aging.** The organic marketplace apply-flow is deferred (→ RM-8).

- Sign-up via GitHub, Google, or email; **a GitHub link is mandatory at signup — no unlinked volunteer accounts**; a linked account's public GitHub stats (top languages, repository count, contribution summary) populate the profile.
- Profile: skills, causes, availability (hours/week), optional bio.
- **Admin enforce-match (from the candidate pool):** binding; no NGO approve/decline. Two consent gates: (a) the volunteer explicitly confirms, which fires the first-project disclaimer if unsigned — no repo/key/Linear access or Tier-2 introduction before that disclaimer; (b) the NGO acknowledges the match (fuel ≠ deliverable, no SLA, names the volunteer) at funding. Kickoff fires only on funding (match-to-fund); a consented match is kickoff-ready.
- **Concierge match log (admin-only):** records every match event (candidacy, invitation, consent, decline/expiry/release) with timestamps and reason — Goal-5 evidence for opening organic browse; not a public queue; candidacies never surface to the NGO.
- **At first match consent** the volunteer is added to the platform GitHub org with repo-creation rights (REQ-008/021); org membership is never granted at signup. Recorded + audited.
- **Org removal by cause:** (a) voluntary deactivation — membership removed; per-project access on active projects persists; (b) **AUP enforcement:** the admin deactivates the account (lifecycle state gates every platform write), immediately revoking account writes and the project's virtual keys; residual repo/Linear/org access is then promptly removed and audited, and the NGO removes Lovable workspace access on the platform's prompt (Lovable has no removal API); reversal is manual re-enable + key re-issue (→ RM-14); (c) 24-month inactivity — soft removal, as (a).
- The volunteer's dashboard shows their linked GitHub handle and open candidacies.
- **Public listing (read-only v1):** each open project is listed newest-first, exposing its title, summary, complexity tier, needed skills, cause tags, NGO name, and posted date; browse/sort/filter and any public verification badge are deferred (→ RM-8, RM-6).
- (→ RM-8, RM-21)

Dependencies: REQ-001, REQ-005, REQ-008.

---

#### REQ-008: GitHub Integration (Code substrate + dev-internal issue tracker)

Every funded project has a public-MIT repository in the platform GitHub org (all public), created through the volunteer-driven Lovable→GitHub setup.

- **Uniform repo home:** repositories remain in the platform org permanently — no transfer; MIT licensing + Lovable's two-way sync keep the code forkable and exportable; the NGO admin holds admin access from completion onward.
- Access: the volunteer maintains the repo; the NGO admin has read + comment, never push.
- Code events feed cadence stats and task linkage from repo creation; done status comes only from a verified MATCHING code merge (task identifier, PR author, recorded pull), In Progress from explicit self-assignment, and every other transition only from authorized platform actions — never manual edits or unmatched vendor automation (REQ-026).
- **GitHub Issues are dev-internal only** (bugs, refactors, tech debt), never NGO-visible; the Linear task tree is the source of truth for NGO-visible deliverables. No issues are auto-created from the scope doc.
- **Repo seeding:** each repo is seeded with the platform's session guidance and working conventions — the project-binding marker (REQ-009), task-binding conventions (REQ-034), the Linear working norms (one issue in progress, assign before starting, comment when blocked, never move status by hand), commit conventions that link work to its task, a reviewer-agent skill, and env-file hygiene. Platform API credentials are never committed; they are shown once and are separately revocable from the virtual key.
- The platform holds only short-lived, on-demand GitHub credentials; no user PATs.
- **One-time org setup at launch:** the platform and Lovable GitHub Apps are installed org-wide under least-privilege scopes, with credential rotation and a break-glass org-compromise runbook. Org membership grants no repo access by default (explicit adds only); orphan repos matching no active project are monitored; NGO admins are per-project outside collaborators, never members.
- **Continuously-asserted base-permission invariant (P0):** members have no default repo access; member-created repos stay private and become public only after setup validation of the repo URL; repository visibility changes are limited to owners and platform automation — continuously verified and auto-remediated (REQ-009 org-namespace guard).
- **Lovable path (v1 default):** no repo is pre-created at funding; the Lovable→GitHub setup is volunteer-driven with no admin involvement, the platform validates and records the resulting repo URL, and unresolved setup is surfaced for follow-up. A recorded repo URL is a hard precondition for completion.
- The seeded README carries the title, NGO name, plain-language summary, license, and project-page link.
- **At completion:** the volunteer drops to read/triage and the NGO admin holds admin — no org transfer; the NGO removes both the volunteer and ai4good's read-only monitoring account from the Lovable workspace.

Dependencies: REQ-006, REQ-007, REQ-021, REQ-026.

---

#### REQ-009: LLM Gateway — Virtual Keys, Caps & Inline Fuel Metering

A platform-controlled LLM gateway sits in the request path; hosting is open (**OD-6**). **Each project is isolated in its own provider workspace (an Anthropic Workspace), and each (volunteer, project) pair is issued its own workspace-scoped virtual key**; standard Claude Code works unchanged. Every volunteer request is authenticated, checked against the key's status and project binding, governed by the injected project-scope policy, and forwarded to the provider — which enforces the workspace's rate limits and rejects a key the platform has set inactive — without ever exposing the real credential; the gateway proxies the provider's response (including the fuel-exhaustion rejection) and captures per-request usage for task attribution (REQ-034). Streaming is preserved end-to-end and gateway latency must not degrade the interactive experience.

**Enforcement placement:** rules that must hold live only on surfaces the platform controls and the volunteer cannot edit — the **gateway** (key confinement, the project-binding tripwire, governance-prompt injection) and the **provider-side controls** (per-workspace rate limits, provider key status, and the coarse spend fuse — all enforced by the provider). Files in the repo and third-party permission settings are never trusted to enforce anything.

**Threat posture:** the project-binding marker detects misuse; it does not prevent it (the marker is copyable). The real bounds are the provider-executed stop (never more than the funded provider budget plus a bounded stopping distance), the workspace's rate limits (never faster than allowed), attribution of every request, and instant revocation. Volunteers are told at onboarding that usage is attributed and reviewed.

- One key per (volunteer, project), shown once, minted at kickoff, never logged.
- Onboarding is minimal (the volunteer supplies the project credential to Claude Code); rejection and setup-failure messaging instructs, never accuses.
- **Provisioning inventory (the provider mints no keys by API):** the platform holds a reserve of pre-created workspace+key pairs, stocked in a batched provider-console routine that sits OUTSIDE every money flow. Checkout opens only when a reserve pair and a workspace slot are available, and reserves the pair; kickoff binds it with no ops task. A low reserve raises an admin task; an empty reserve blocks NEW checkouts, never paid work.
- **Velocity bound and catastrophe fuse (set once at reserve creation):** each reserve workspace gets low per-workspace provider rate limits — the burn-velocity ceiling that keeps the stopping distance small enough for the smallest funded budget — and a coarse monthly provider spend fuse far above any healthy month. Neither is touched during operation; the fuse is a last-resort blast-radius bound, never the ledger or the fuel ceiling. v1 adds no custom gateway usage caps.
- **Project-binding check:** the committed marker rides the session; the gateway verifies it against the key's project on substantive requests (threshold **OD-4**), and a mismatch yields an instructive rejection naming the key's project.
- **Injected governance on every request:** the project-scope rule (decline/redirect unrelated requests) and the never-change-Linear-status rule (REQ-026).
- **Money path — provider truth, two speeds:** each project's spend-of-record is the **provider's billed cost for its workspace** (final; the ledger conforms to it nightly). The live fuel state is provisional: the platform monitor polls the provider's per-workspace usage report each minute and prices it at the provider's official rate card — provisional values drive the gauge and the stop, never the ledger. A payment's gross amount funds a **provider budget of gross ÷ (1 + share rate)**; the share portion is recognized only as consumption occurs (never at top-up), and fuel is exhausted when the provider budget is consumed. The per-request usage the gateway captures is **attribution telemetry only (REQ-034) — never the money ledger and never a request-path gate.**
- **The stop — provider key status, platform-decided:** when remaining provider budget reaches the stopping distance (the worst-case burn during data lag + poll interval + actuation, computed from the workspace's rate limits), the monitor sets the workspace key **inactive at the provider** (Admin API). The provider rejects further requests and the gateway proxies that rejection stating the cause. A top-up lifting remaining above the re-arm line (set above the stop line, so the key never flaps) sets the key active again: the next request passes, no reactivation step. **Stop causes are ranked:** a top-up clears only the exhausted stop — never a chargeback, AUP, revocation, or archival stop.
- **Fuel thresholds (the same monitor):** at 20% remaining the NGO gets a warning blocker, at 5% the volunteer is warned, and at the stop the blocker's state flips to blocking. **The blocker is a status surface mirroring the provider's stop — never an enforcement point.**
- **Watchdog — fail closed:** the gateway passively observes each response's usage and the provider's rate-limit headers. If provider usage data goes stale while traffic still flows, or a key flip fails to confirm, the platform fails closed: the project's virtual keys are cut and a watchdog-failed-closed event notifies the platform admin (REQ-016) — no paging integration is used. This is a credential-status action — never a money computation in the request path. Cumulative fuel math never resets at a month boundary; only the catastrophe fuse resets, by design.
- **401 semantics:** the gateway's own rejections are externally flat (no revoked-vs-nonexistent distinction); the one exception is a proxied fuel-exhaustion rejection, which states its cause because that caller must act; rich diagnostics appear only on the authenticated dashboard.
- **Revocation is instant and self-serve:** an NGO "revoke access now" action and admin enforcement cut access immediately, with an instant replacement key; all project keys terminate at completion (REQ-012), abandonment release (REQ-027), and AUP deactivation (REQ-007). The project's provider workspace is archived at completion or cancellation (revoking its keys and freeing a workspace slot); on abandonment the workspace persists so the successor volunteer inherits it.
- **Privacy invariants (load-bearing):** request bodies are inspected transiently and never persisted; the ledger holds token counts and metadata only; any derived origin/mismatch signal is stored as a score or boolean, never paths or content.
- **Key-leak hygiene (v1 = prevention, not detection):** env files are ignored by default and the platform key pattern is registered with GitHub secret scanning + push protection (→ RM-22); the org-namespace guard keeps member repos private until setup validation (asserted by the REQ-008 invariant); the founder's daily review compares org repos against active projects.
- **An escalation ladder is documented, not built, in v1** (→ RM-9).

Dependencies: REQ-006, REQ-024, REQ-034, REQ-012/027/007 (key-termination hooks). Only provider surface: the model API through the gateway.

---

#### REQ-010: Project Page (single view) & Cadence Stats

One **public page** per project, whose read-only content is the same for NGO admins, the assigned volunteer, platform admins, and logged-out visitors. The platform surface is PM/coordination; the dev workflow lives on GitHub — there is no separate "developer view."

- The page content is public and identical for every viewer; the full task tree is public on every project (Platform Promise §2). The one viewer-specific element is the NGO project assistant (REQ-033) — an interactive bot interface surfaced **only to the project's NGO account**, never to the volunteer, platform visitors, or the public.
- The page identifies the project (title, NGO, status, assigned volunteer, repo URL with a plain-language empty state while setup pends, complexity tier, cause tags).
- **The task tree is the primary content:** the page must convey task hierarchy, each task's status, the work currently underway, and overall progress, where progress reflects completed P0 tasks against all P0 tasks (from the tree, never GitHub issues).
- **Activity is shown in plain language** tied to task titles, never raw PR/commit jargon.
- Reference files (REQ-032) are listed with descriptions; downloads are restricted to the assigned volunteer, NGO admins, and platform admin despite the public repo; the NGO can add/remove them before completion.
- Resolved clarifications (REQ-024) persist as a lifetime Q&A log recording who asked, who answered, and when; an unresolved clarification is clearly flagged.
- The fuel balance shown reflects real-time provider truth and stays reconciled with Anthropic's authoritative usage reporting.
- **No GitHub Issues, PR lists, or raw commit logs appear on the page** — the repo link is the only GitHub touchpoint.
- **Cadence stats (v1 minimal):** liveness is measured from **both PM task progression and commit activity** (not commits alone) — recent movement versus the prior period, and time since the last of either — with a stale-activity indication during build (→ RM-23). Promise §6's two progress signals (the task view and commit cadence) stay intact.
- **Repo-derived activity signals (in-progress onward):** where a project has a live repo, the page conveys informational build signals — the language/stack in use, time since last activity, the assigned contributor, the license, and completion-readiness — modeled on a code-host's project view. **Popularity metrics (stars, forks, watchers) are never shown** — reputation is completion credit, not popularity (Promise §5).
- **Both funding states are shown distinctly (REQ-021):** the Claude Code fuel balance and the separate Lovable-credit status — Lovable setup before connection, then Lovable status, workspace access, and top-up after — so the two purses are never conflated; the Lovable-credit status is read from Lovable via ai4good's monitoring account, not hand-entered (REQ-021) (→ RM-58).

Dependencies: REQ-008, REQ-009.

---

#### REQ-011: Public Project Listings (v1 read-only; browse/sort/filter machinery v1.5)

v1 is a public, read-only listing of open projects (newest-first) with exactly one volunteer action: marking interest ("candidate for this project"), which feeds the admin match log only. Matching is concierge (REQ-007); there is no NGO-facing apply queue, no filters/sort/scoring, and no NGO accept/decline (enforce-match). No algorithmic ranking or NGO-satisfaction weighting in v1.
- **Open-project card** (pre-build, no repo yet): title, summary, complexity tier, needed skills, cause tags, NGO name, and posted date — static attributes only, with no live stats, no dollar figure, and no candidate/interest count (candidacies are admin-only).
- **In-progress showcase** (public): a project under build surfaces a live card modeled on a code-host's project view — task-tree progress, cadence (task progression + commit activity), the language/stack, time since last activity, the assigned contributor, and the blocker chip (noninteractive; count + `info / warning / blocking` severity only — REQ-024) — so the public sees what ai4good is building. The open-project card stays identity-only (no blocker signal, no liveness beyond the posted date). Browse/sort/filter machinery stays v1.5; **popularity metrics (stars/forks/watchers) are never shown**.
- (→ RM-8, RM-21, RM-24)

Dependencies: REQ-007.

---

#### REQ-012: Project Completion

A project completes when all P0 tasks are done. Because Lovable is enforced and git-bound, the NGO already owns the live app and repo throughout — there is no delivery or transfer, and **no formal handoff ceremony in v1**: the completion checklist gate, sign-off/acceptance flow, guided-maintenance walkthrough, rejection loop, live-URL gate, and post-completion attribution + health are all deferred (→ RM-62).

- The volunteer marks the project done once all P0 tasks are complete; open GitHub Issues never block it. A P0 task reaches done only through verified code merge, so every done task carries shipped code.
- On completion the project enters `completed`: leftover fuel is released to the NGO's general balance as non-cash credit (REQ-006); the volunteer's completion-credit event is recorded with a private confirmation (→ RM-3); all project virtual keys terminate and the project's provider workspace is archived (REQ-009); Linear membership is removed and the final task history is preserved (REQ-026).
- **Offboarding is self-serve:** the NGO removes or downgrades the volunteer's repo and Lovable access whenever it chooses — the repo stays in the platform org with NGO admin, and MIT + two-way sync already make the code the NGO's to fork or export. In the Lovable workspace the NGO removes both the volunteer and ai4good's read-only monitoring account (REQ-021).
- The deliverable is a deployed, running tool the NGO owns and evolves via chat (Promise §10); the live URL is captured as project metadata (auto from Lovable), not gated.
- No tip flow in v1 (→ RM-11).

Dependencies: REQ-006, REQ-009, REQ-021, REQ-026.
