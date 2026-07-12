# ai4good — Architecture & Design Notes

> **Purpose.** `prd-mvp.md` is a pure requirements doc: it states the WHAT (observable invariants). This file is its companion and records the HOW — the design mechanisms, algorithms, tuning values, data shapes, and UI patterns that were deliberately lifted out of the PRD so the **architecture session** decides them. Nothing here is binding; it captures design intent and prior discussion so the architecture session starts warm, not cold. Each entry is keyed to the requirement (REQ-NNN) it serves.
>
> **Provenance.** Extracted from the pre-conversion PRD (git history before the pure-requirements pass) and the codex altitude audit (`loop/out/altitude-*.txt`). The decision history is in `loop/state/decisions.jsonl`.
>
> **Status legend.** `[intent]` = design direction discussed and favored. `[open: OD-N]` = an explicitly open decision. `[verify]` = must be confirmed against a provider's real behavior in the pilot.

---

## Cross-cutting A — Attribution enforcement & credit-leakage prevention (serves REQ-009, REQ-034)

**The problem.** Fuel (credits) is NGO money scoped to **one specific project**. A volunteer holds a per-project credential and could, by accident or intent, spend Project A's fuel on unrelated work — a different repo, a different project, or personal use. "Leakage" = project-scoped credits consumed outside the project they were funded for. This section records the defense-in-depth model discussed for preventing and attributing that, and the reasons each layer is shaped the way it is.

### Layered controls (defense in depth)

1. **Per-(volunteer, project) virtual key.** The credential a volunteer actually holds is a virtual key bound to exactly one project. The **real Anthropic org credential is never exposed** to volunteers; it lives only inside the gateway. This means "no-billing-exposure" is mechanical, not a policy the volunteer must honor. `[intent]`
2. **Project-binding marker — a tripwire, not a lock.** A marker is committed into the project repo (session prompt carries it, e.g. *"this ties NGO-funded fuel to this project; please don't move it"*). On **substantive** requests the gateway verifies the marker against the key's project; a mismatch yields an **instructive rejection naming the key's project** (not a flat error). Threshold for "substantive" is `[open: OD-4]` — small background calls are skipped so the check doesn't tax normal work.
   - **Why a tripwire, not a lock:** the marker is copyable, so it cannot stop a determined insider. Its job is to convert the **dominant real case — a key accidentally reused on another repo — into unambiguous intent**, cheaply. Locking is not the goal; detection + attribution + revocation is.
3. **Budget + velocity are provider-native (d40).** The workspace **spend limit** (= prepaid fuel) is the budget ceiling and the workspace **rate limits** (RPM/TPM) bound burn velocity / runaway loops — both provider-enforced. v1 adds **no custom gateway usage caps**; a light gateway anomaly-brake can return later if needed. (The earlier per-key rolling-window caps + OD-3 are retired — the workspace spend limit + rate limits cover budget and velocity.)
4. **Per-project provider workspace (d39) — the isolation + metering + hard-cap layer.** Each project is an **Anthropic Workspace** (created via the Admin API at kickoff, archived at handoff/cancellation). This gives, provider-native: a workspace-scoped key, **per-project billed cost** (Usage/Cost API `group_by=workspace_id` — the money-of-record, replacing local token reconstruction), a **per-workspace spend limit** set to the prepaid fuel (the provider-enforced hard fuel ceiling), per-workspace rate limits, and isolated prompt caches. Cap: 100 workspaces/org — archive-on-handoff makes it a concurrent-in-flight limit; new orgs + a negotiated lift are the escape hatches.
5. **Fuel state + thresholds = provider truth; enforcement = the spend limit (d41).** The platform's fuel monitor reads the provider's **Admin/usage API — the single source of truth** — on a tight cadence to compute remaining fuel and fire the **20/5/0%** notifications. The **zero-fuel ceiling is the workspace spend limit** (provider-enforced): at 0% the provider declines further requests and the **gateway just proxies that rejection** to the user — the gateway does **not** gate. The gateway still captures per-request usage tagged by task, but only as **attribution telemetry (REQ-034)** — never the money ledger and never the gate. So no gateway-side token math determines any dollar figure or any stop.
6. **Governance-prompt injection every request.** The gateway injects the project-scope rule (decline/redirect unrelated requests) and the never-change-Linear-status rule. This is a **durable** norm (re-applied every request), distinct from volunteer-editable files.
7. **Instant, self-serve revocation.** NGO "revoke access now" and admin enforcement cut access immediately with an instant replacement key. This is the real enforcement action; detection can afford latency because revocation ends exposure at any time. Marker **rotation** is hygiene for a lost-repo-access situation, **not** an anti-insider control.
8. **Task-level attribution (REQ-034) — telemetry, never a gate.** A task binding rides every metered request; burn is attributed when recorded. Attribution is **spoofable and soft-degrading and never rejects a request** — it exists for NGO burn-per-deliverable, per-task cost baselines, and reconciliation precision, not security. No resolvable binding → recorded as **"unattributed,"** never blocked. "Exploration" and "onboarding" are first-class taskless buckets so honest untasked work isn't misattributed (falsely-attributed burn corrupts baselines).

### Placement doctrine (why enforcement lives where it does)

Policy that must hold **cannot** depend on volunteer-editable files (editable away) or on third-party permission models — **Lovable has no role between Admin and Editor; Linear's OAuth scopes cannot express "assign + comment but not change status."** So it lives only in platform-controlled surfaces the volunteer cannot override: the **gateway** (key confinement, the binding tripwire, governance-prompt injection) and the **provider-workspace limits the platform sets via the Admin API** (spend + rate — enforced provider-side but platform-configured, d41). Third-party RBAC is trusted for *access*, never for *policy*.

### Detection & audit (metadata only)

- Every metered AI request — gateway or direct — emits **one privacy-preserving audit event**: surface/actor, project, request id, provider status + cost, fuel delta, rate-card version, ledger linkage. **Metadata only; request/response bodies are never persisted.**
- Derived origin/mismatch signals are stored as a **score or boolean, never paths or content**.
- Monitors that **page a human**: any metered request accepted or recorded against a depleted project (every billable surface, gateway or direct, funded Discovery included); negative balances; undecidable ledger drift.

### Deterrence & the v1 loss ceiling

- **Deterrence = onboarding disclosure** that usage is attributed and reviewed. Governance capacity follows observed behavior.
- **v1 does NOT build:** an automated spend-anomaly engine (→ v1.5), collusion/shared-fingerprint detection (removed), or the escalation ladder (documented, not built). These only reduce *detection latency*, which does not bind at pilot scale.
- **v1 loss ceiling = deterministic caps + no cash-out + $200 first-fund cap + per-key caps + fuel gate + instant revoke + daily human money-dashboard review.** A leaked key can therefore only ever buy bounded compute.

### Tuning / open decisions for the architecture session

- `[resolved d40]` budget + velocity caps → provider-native (workspace spend limit + rate limits); OD-3 retired.
- `[open: OD-4]` misuse-detection sensitivity (the "substantive request" threshold for binding checks).
- `[open: OD-6]` the gateway's operational hosting home.
- `[intent]` gateway overhead target **< 150ms p95** (excluding model latency); streaming preserved end-to-end.
- `[intent]` 401 semantics: externally flat (no revoked-vs-nonexistent distinction) **except** fuel exhaustion, which states its cause because that caller must act; rich diagnostics only on the authenticated dashboard. First-week 401s are an onboarding-UX metric, not a threat signal.

---

## Cross-cutting B — The two-level dollar meter & zero-human money path (serves REQ-006, REQ-030, REQ-029)

> **Updated by d39 — per-project workspaces make the anchor per-project.** Because each project is its own Anthropic Workspace, Anthropic's usage/cost reporting is authoritative *per project* (`group_by=workspace_id`), so the anchor no longer has to be reconstructed from a single org credential. The inline estimate drops to a preview/gate-trigger.

- **Level 1 — provider-truth anchor, per-project (truth).** A tight-cadence pull of Anthropic's per-workspace usage/cost reporting is authoritative for each project's AI spend; Stripe is authoritative for money-in. Disagreeing books **auto-conform** to provider truth.
- **Level 2 — the platform monitor** reads the per-workspace usage/limit from the Admin API to drive the gauge + 20/5/0% thresholds; the **zero-fuel stop is the workspace spend limit (provider-enforced), proxied by the gateway** — not a gateway-side gate. Any per-request usage the gateway records is attribution telemetry (REQ-034), never the ledger.
- **Automatic corrections.** Reconciliation posts corrections **only** through one guarded function: idempotency key, **pair-sum zero** (every correction balanced), source reference, audit row. **Direct ledger writes are revoked from every role.** The founder gets visibility, never approval.
- **Refusal-to-guess backstop.** Undecidable drift (provider data missing or self-contradictory) is **never auto-resolved** — books untouched, it pages.
- **Nothing is pre-committed to Anthropic.** Pay-as-you-go on one org account; per-project accounting exists only in the platform ledger. Cancellation/volunteer-release strands no money at Anthropic. (If prepaid Anthropic credits are ever bought for a discount, they're org-level and fungible — the "Anthropic float" Goal 3 covers.)
- `[verify]` provider reporting cadence + field availability from Anthropic; Lovable usage API (currently none — consent-gated per-session reads only, Q7).

---

## Cross-cutting C — GitHub-style project activity UI (mimic) (serves REQ-010, REQ-011)

Design intent: model the project page and the in-progress card on a code-host's repo view (GitHub's "About" sidebar + activity graphs) so contributors and the public read a project's health at a glance. `[intent]`

**Mimic — informational/activity signals (align with "progress over promises"):**
- **Languages/stack bar** — a horizontal colored percentage bar of the repo's languages (GitHub `/languages`); colored language dots on cards.
- **"Updated N ago"** — relative time since the last activity, drawn from the latest of a commit OR a PM task movement (see cadence below).
- **Activity sparkline** — a mini weekly bar graph, GitHub Pulse/Commits-style.
- **Contribution heatmap** (optional) — a calendar of project activity (green-squares style).
- **Contributor** — the single assigned volunteer's avatar (GitHub shows a contributor grid; ai4good is single-dev).
- **License** — MIT badge (uniform across projects).
- **Readiness %** — modeled on GitHub's Community Standards checklist → ai4good handoff-readiness (README, RUNBOOK, deploy instructions, ≥1 passing CI run, LICENSE, live URL).
- **Topics** → cause tags.

**Cadence = task progression + commits (d38):** ai4good's cadence/liveness metric is NOT commits alone — it combines **PM task progression (Linear task-completion events)** with **commit activity**. "Time since last activity" and the sparkline draw from both event streams, so a project moving tasks forward reads as live between commits, and vice versa.

**Skip — popularity/vanity (clashes with no-public-ratings, Out-of-Scope #11, and the private-candidacy rule d36):** stars, forks, watchers, "used by"/dependents, trending counts. Reputation is completion credit, not popularity; interest/candidacy is admin-only, never public.

**Open vs in-progress (load-bearing):** GitHub activity stats need a repo with history, and ai4good repos exist only from kickoff. So the **open-project listing card** = static attributes only (no repo yet); the **project page + in-progress showcase card** = the activity panel above.

**API sources (public, no auth for public repos):** `/repos/{o}/{r}` (pushed_at, license, primary language), `/languages`, `/stats/commit_activity` + `/stats/contributors` (202-cache-then-fetch), `/community/profile` (readiness). **PM task progression comes from the Linear mirror, not GitHub.**

---

## Cross-cutting D — Lovable MCP automation map (d43) (serves REQ-021, REQ-012, REQ-028, REQ-035)

The Lovable MCP is a standard offering (OAuth, no documented SLA/rate-limit). Its tool surface lets ai4good automate much of the Lovable side that the doc previously described as manual. Everything below runs in the **volunteer's connected Lovable session** (their OAuth) unless marked `[needs platform Lovable access]`.

**Automates (fold-worthy wins):**
- **Kickoff provisioning** — `create_project(workspace_id, initial_message, tech_stack, design_systems, template_project_id)` creates the Lovable project; `enable_database` provisions its Supabase Postgres (one-time). So the volunteer's session stands up the project + DB instead of a manual checklist.
- **Governance into Lovable's own agent** — `set_project_knowledge` / `set_workspace_knowledge` (≤10k chars) push ai4good's conventions + project-scope rules; `create_workspace_skill` + `enable_project_skill` install the skeptical-reviewer skill. This closes the gap where Lovable's agent (when the Skill delegates or the volunteer drives in-browser) was ungoverned — a soft-norm surface alongside the gateway prompt.
- **Handoff live-URL auto-capture** — `deploy_project` returns the live production URL; `get_project` returns editor_url, preview_url, status, and a **screenshot**. So the handoff URL is captured automatically (no manual paste), and the screenshot can enrich the in-progress showcase (d38) + the NGO's handoff review.
- **Build review** — `get_diff`, `list_files`, `read_file`, `list_edits` let the Skill inspect what Lovable built (feeds the reviewer + handoff checks).
- **DB-state verification** — `get_database_status` / `query_database` / `get_database_connection_info` can verify the RLS/DB posture at handoff (part (i) of the maintenance ritual).
- **Credit status** — `get_workspace` (plan + credits), already folded (d42).

**Cannot do (stay manual / UI):**
- **Add connectors** — `add_connector` only returns a dashboard **deep link**; GitHub + Stripe connector setup stays a Lovable UI step.
- **Member management** — **no** add/remove/invite tools. So automated volunteer offboarding is NOT possible (resolves the old `[VERIFY]`) → the NGO removes the volunteer **and the platform ops seat** manually at handoff. The platform seat also cannot self-remove.
- **Workspace creation** (a billing action) and **programmatic credit top-up** (none) stay NGO-side.

**Two decisions this surfaced:**
1. `[resolved — no, d44]` **Post-handoff analytics: not required at this stage.** The 30-day-alive check stays **reachability-only** — a plain request to the public live URL (`…lovable.app`), which needs **no** Lovable API access. Lovable's analytics (`get_project_analytics`) are not used in v1.
2. `[recommend DROP — pending founder]` **Platform ops Lovable seat.** With offboarding not MCP-automatable *and* analytics not required (#1), the build-phase member seat has **no remaining purpose** and is a liability (it can't self-remove, so the NGO would have to revoke it). Recommendation: **drop the seat** — ai4good is then never a member of the NGO's Lovable workspace, offboarding is simply the NGO removing the volunteer, and "last one out, zero platform access" is automatic (revises d35).

**Verified live (Lovable API interrogated directly, 2026-07-12 — not doc inference):**
- **Credit shape refinement (d42).** `get_workspace` returns **billing-period usage + limits**, not a single "balance": `backend_total_used_in_billing_period`, `billing_period_credits_limit`, `billing_period_credits_used`, billing-period dates, plan/subscription status — and a per-member **`monthly_credit_limit`**. So ai4good **computes** remaining/low from usage-vs-limit (on unified-billing/metered plans the limit may be null → track usage + Lovable's own low/out signals). Bonus: the per-member `monthly_credit_limit` is a **native Lovable cap** — it maps to ai4good's "cap the volunteer's Lovable spend" (REQ-021/028), though setting it is UI-only (no MCP setter).
- **Handoff URL + screenshot confirmed.** `list_projects`/`get_project` return `url` (published live URL, e.g. a real published project returned `https://…lovable.app`), `preview_url`, `editor_url`, `status`, and `latest_screenshot_url` — so the handoff live-URL auto-capture (REQ-012) and the showcase/handoff **screenshot** are real fields, not assumptions.
- **Stack confirmed.** `create_project` `tech_stack` includes the ai4good target (`tanstack_start_ts_*` was live on the account's existing "AI4GOOD" project) + `design_systems`/`template_project_id`.
- **Templates/design-systems empty today → an action.** `list_template_projects` returned none. ai4good should maintain an **"ai4good starter" template project + design system** so `create_project` clones a consistent, convention-baked baseline per project.
- **Governance surface writable.** `get_workspace_knowledge` = empty and `list_workspace_skills` = none today → `set_workspace_knowledge`/`set_project_knowledge`/`create_workspace_skill` are free to populate (confirms d43 governance-into-Lovable).
- **Connector catalog (confirms UI-only add).** Zero-config (Lovable's built-in type): **lovable-cloud, supabase, stripe, paddle, shopify, ai_gateway**. Standard (OAuth/APIKEY): **github (API), linear, salesforce, hubspot, twilio, resend, …**. MCP: linear, notion, sentry, posthog, atlassian, figma, …. All `is_enabled` in the catalog, but `add_connector` only returns a **dashboard deep-link** — programmatic add still not possible. GitHub two-way **sync** is a workspace feature (`experimental_features.gitsync_github`), separate from the GitHub-API connector.

---

## By requirement — stripped design (the HOW)

### REQ-001 — Auth & org membership
- The two-layer (account-type × per-NGO-role) model is **retained in the schema** even though v1 is single-seat, so multi-member support later needs no migration. `[intent]`
- Contact-transfer/recovery: out-of-band verification → move ownership to the new account → deactivate the old → preserve history. (Data-model + admin-flow design.)

### REQ-002 — NGO profile & vetting
- Email-verification enforcement UI (composer disabled + verify CTA).
- Vetting audit record shape: `vetted_by`, `vetted_at`, legal/display name, public reference link, contact name+title+authority attestation, evidence type, note.
- Daily-drip reset: allowance hard-resets to the tier grant once per UTC day (`credits_last_reset::date < CURRENT_DATE` guard).

### REQ-003 — Project Need intake
- Draft autosave; upload widget (drag-drop + picker). Disclosure copy hardening once Tier-2 becomes known.

### REQ-004 — Discovery Agent
- **Charging formula:** per-turn cost is conversation-weighted; cached content heavily discounted; regenerations + system-error retries cost zero credits. `[intent]`
- System-prompt tuning to extract technical scope from non-technical NGOs.
- Model: **Claude Opus**; ~$1–2 per scoped run; 5–10 structured turns.
- Free-phase guardrail mechanics: a system-prompt scope line; a **deterministic per-conversation turn ceiling** (platform-configurable, pilot-tuned) → wrap-up; repeated-off-topic decline counter → founder-visibility flag.
- Scope regenerable up to **3×** (reason logged) then admin escalation.
- Transparency UI: credit gauge ("Discovery credits: 7 of 10 today") + per-turn cost.

### REQ-005 / REQ-005.5 — Scope publishing & lifecycle
- Blocked-transition UI (disabled composer with verify / fund-now / come-back-tomorrow CTAs).
- Invalid Discovery output retries **up to 3×** then escalates.
- Final task history preserved as a **read-only tree snapshot**.
- **Kickoff sequence** (parallel side effects on funding): virtual key issued instantly; Linear workspace assigned from a **concierge-pre-created batch pool** (empty pool → urgent ops task + blocker); repo established via the volunteer-driven Lovable setup; one bootstrap task seeded; comment thread opens; funded/live announced; volunteer notified. Provisioning failures never invent a sub-state — project stays `in_progress`, gaps surface as blockers.

### REQ-006 — Fuel top-up & ledger
- **Stripe Checkout** (one-time, no subscription); acknowledgment **modal**; preset amounts **$50/$100/$200/$500/custom**, default $50.
- First-fund cap default **$200**/project + per-day, rising with history.
- The two-level dollar meter + guarded correction function → see **Cross-cutting B**.
- Nightly internal arithmetic control totals (in addition to the provider-truth reconciliation).
- Concierge/admin work items land in one prioritized queue with SLA targets.

### REQ-007 — Profile & concierge matching
- **Assimilation window (decision-36):** time-based, clock starts at the **first candidacy**; each additional candidacy **shrinks the remaining window by a backoff factor** (pilot-tuned) — interest expedites, never delays; candidate-less projects stay open under Goal-5 aging; concierge matches from the accumulated pool at lapse. `[intent]`
- Match-log event/field shape; one-action ("one-click") consent UI.
- AUP residual-access removal via a short manual checklist.

### REQ-008 — GitHub integration
- **Org-namespace guard:** member-created repos born **private**, flipped public only after the setup checklist validates the repo URL; repository **visibility changes limited to owners/platform automation**; Pages/Actions restricted for repos matching no active project; continuous verify + auto-remediation of the base-permission invariant.
- Repo seeding payload: binding marker, task-binding conventions, Linear norms, commit conventions, reviewer-agent skill, env-file hygiene.
- The Lovable→GitHub setup as an **11-step auto-validated checklist**; aging escalation.
- `[verify]` Lovable's GitHub App creates the repo where pointed and its collaborator permissions do **not** propagate to GitHub.

### REQ-009 — LLM gateway → see **Cross-cutting A** (the full pipeline, caps, binding, governance, privacy, threat model).

### REQ-010 — Project page & cadence
- Widgets: hierarchical progress bars, status badges, "Now working on" highlight; dual fuel-meter **side-by-side layout** with separate-purse tooltips; Clarifications **tab** + "Awaiting NGO clarification" **banner**.
- **Progress% formula = done P0 tasks / total P0 tasks.**
- Activity-feed rendering: commits → plain-language statements tied to task titles.
- Stale-activity indicator: **red past 14 days** during build.

### REQ-011 — Public listings
- Card field set + newest-first ordering; the one volunteer action (mark interest) feeds the match log.

### REQ-012 — Handoff
- Disabled-button-with-instructions when the repo doesn't exist.
- Live-URL capture via the handoff form (sole capture point).
- **Guided-maintenance ritual:** (i) enable row-level access enforcement on the Lovable DB (off by default — PII footgun); (ii) demo chat/plan-mode + checkpoint rollback; (iii) set a Lovable spend cap; (iv) confirm two-way GitHub sync.
- 30-day-alive automated ping mechanism.

### REQ-013 / REQ-014 — Dashboards
- NGO: project cards, dual fuel meters, "Action needed" rail; % complete from tasks.
- Volunteer: dual fuel gauges; **completion credit as append-only per-project events** (volunteer, project, handoff-accepted timestamp, first-tool eligibility); private "credit earned" confirmation; no satisfaction shown to the volunteer.

### REQ-015 — Comment thread
- Rendering: chronological plain-text stream, auto-linked URLs, **no** markdown/code-blocks/attachments/@-mentions; loads on page view, no live push; membership implicit from roles; system events never post to the thread.

### REQ-016 — Notifications
- **Topology:** one shared emitter on a single static event taxonomy is the **sole writer**; nothing sends comms directly.
- **Reliability (outbox):** the notification event is written **atomically** with its ledger/state transition via the outbox; recipients resolve at event-creation time; marked sent only on **provider acceptance**; unconfirmed sends retry, never silently drop.
- The full event→recipient→channel taxonomy + 48h/7d blocker aging (see the pre-conversion doc for the complete table).

### REQ-021 — Lovable integration
- Access behind **one replaceable internal adapter** (so a Lovable break degrades to manual, not a dead build).
- Setup checklist (workspace + Lovable project creation, invites, GitHub-sync, paste-back, auto-validation).
- **Lovable-credit status is pulled, not typed (d42).** The volunteer's connected Lovable session calls the **Lovable MCP `get_workspace`** (returns plan + available credits) to read the real balance; ai4good computes low/exhausted and surfaces it, with a manual report as fallback. Top-up CTA deep-links to Lovable billing (no programmatic purchase; the NGO may also enable Lovable **auto-top-up**). The Lovable MCP is now a standard offering (no longer "Research Preview"), OAuth-only, **no documented SLA/rate-limit** → keep the manual fallback. Auth: the read rides the **volunteer's** OAuth in-session (client-side, consent-gated, Q7) — no new access. A **background/standing poll** (alerts between sessions) would need the platform ops seat to hold its own Lovable OAuth and read billing, widening decision-35's "member-management only, no usage/billing reads" — deferred.
- `[verify]` member add/remove/self-remove via Lovable API/MCP; fallback = manual NGO removal.

### REQ-023 — Triage screener
- Screener output shape: pass/flag + reasons + **confidence**.
- Founder exception queue reviewed daily; auto-approved items shown one-line in the daily review; exception items show age.
- `[open: OD-8]` screener threshold + model configuration (same model family as OD-7).

### REQ-024 — Blockers
- Aging thresholds **48h reminder / 7d escalation**; severity **upgrades in place** (no duplicate).
- Surfacing widgets: project-page badge, marketplace/dashboard card indicators, "Action needed" rail sorted severity-then-age.
- Per-instance action-owner mechanism for manual catch-all types.

### REQ-025 — Scope additions
- v1 surface = the comment thread; one active discussion at a time; social (not mechanical) enforcement of volunteer work-acceptance authority.

### REQ-026 — Linear task management
- **One-way mirror** of Linear events into the platform store (powers the panel + assistant).
- **Pool model:** concierge pre-creates ready workspaces (no creation API); **replenish below a watermark (default 3)**; empty-pool → external-dependency blocker.
- **Decomposition shape:** one parent per story, one sub-issue per acceptance criterion; briefs session-sized + dependency-ordered.
- **Detect-and-revert enforcement:** because OAuth can't express "assign+comment but not status," any status change not backed by a linked merged PR is auto-reverted with an explanatory comment + low-tone notification; a restricted read/assign/comment proxy held in reserve if reverting proves noisy.
- N-day branch-inactivity → coordinator flag; reviewer-agent shipped in the template; tree snapshot **as markdown** into the repo.
- `[open: OD-1]` reviewer identity + merge authority. `[open: OD-2]` status-panel scope + NGO-introduction mechanics.
- `[verify]` free-tier Linear events, API mutations, programmatic invites, rename, pre-connected GitHub integration seeing later repos. Fallback: paid tier or git-based state with a deterministic truth layer.

### REQ-028 — Claude Code Skill
- **Three-credential topology:** platform token (blockers/comments/fuel), task-system OAuth (backlog), gateway key (metered LLM).
- Session bootstrap sequence + one-line banner (project, active task+age, fuel, unread comments).
- **Per-worktree task binding** rides every metered request (the attribution mechanism).
- Helper-command algorithms: pick-next-task = highest-priority-unblocked with full context; branch/commit conventions (task identifiers + linking keywords); build-locally-vs-Lovable **heuristic (visual UI → Lovable, else local)**.
- Budget guardrails: **per-task prompt cap default 5**, interactive confirm past it, hard refusal past the NGO cap; consent gate checked before every Lovable call.

### REQ-029 / REQ-030 — Observability & ops → see **Cross-cutting B** for the money-correction function; plus: heartbeat + watchdog design; the single money dashboard; runbooks (v1 = 3) + incident cards; the credential-compromise breach-card steps.

### REQ-031 — Moderation / secret scanning
- v1 controls = **GitHub secret scanning + push protection** org-wide; founder break-glass repo-hide (emergency takedown).

### REQ-032 — Reference-file attachments
- Storage: **S3-compatible (Cloudflare R2)**; access via **short-lived signed URLs after a membership check**; UI never holds storage credentials.
- Upload widgets (drag-drop + picker); size caps ~**25 MB/file, ~200 MB/project** (tunable).
- Repo template gitignores the download path; **soft deletes**; project-page "Reference files" section with metadata.

### REQ-033 — Post-Discovery assistant
- Reuses the Discovery surface + model (no new chat infra); per-turn cost display + fuel gauge; composer disabled at fuel-zero.
- **NGO-only bot interface:** the assistant is surfaced solely to the project's NGO account. The project page's read content stays public/role-uniform, but the interactive bot is the one viewer-specific element — never shown to the volunteer, platform visitors, or the public (it spends the NGO's fuel and answers the NGO's "how is my project going?").

### REQ-034 — Attribution → see **Cross-cutting A**. Additional: aggregation boundary — NGO sees burn per deliverable **in cents, no celebration**; per-volunteer-per-task granularity stays coordinator-side; bimodal per-task costs treated as a data property, not an anomaly.

### REQ-035 — Post-handoff attribution & health
- Attribution: **4-point descriptive scale** across 3 dimensions (~30s), not a star score.
- Health: automated **30-day** reachability ping; the **day-45–60** founder check-in as a required ops item created at handoff acceptance; closed-form **six-field** check-in record (self-service attempted, worked/failed, URL reachable, failure category, follow-up owner, follow-up due).

### REQ-036 — Dev-authored PRD & completion gate
- Automated scorer compares the dev PRD to the Discovery scope → completion score + named gaps; **score ≥ threshold** decomposes/pushes the build tree; below → iterate, bounded by fuel not attempts.
- `[open: OD-7]` completion-gate threshold + scorer configuration (pilot-tuned).

---

*Maintenance: when a requirement changes in `prd-mvp.md`, update the matching entry here if its mechanism is affected. This doc is non-normative — on any conflict, `prd-mvp.md` (the requirement) wins and this file is corrected.*
