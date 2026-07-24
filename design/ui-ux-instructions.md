# ai4good — UI/UX Instructions for the Screen-Design Pass (v2)

> **Source of truth:** `.taskmaster/docs/prd-mvp.md` (v1 build spec, pure requirements).
> **Written 2026-07-16; updated 2026-07-18** to the d74–d81 decisions: founder-decided triage
> (no auto-publish), break-glass = audited visibility switch, assistant window = first kickoff →
> terminal, participants-only comment thread + the two-layer public-page rule, status
> provenance (self-assign → In Progress, verified merge → Done), candidacy window removed (d68).
> **Updated 2026-07-20** to d82 — the two-tree task model: the NGO-facing panel renders the
> **PM requirement tree** only (In Progress from the volunteer's pull, Done from verified
> completion); the volunteer's dev tree never surfaces; burn attribution is **per requirement**
> — and to the d69 fuel-stop mechanics (the platform monitor stops spending via provider key
> status; stop causes are ranked, so a top-up clears only the out-of-fuel stop).
> **Updated 2026-07-24** to d86 — all NGO-facing communication (status-panel comments,
> clarifying questions, accepted scope-addition items) anchors at the **requirement** level or
> project level, never the dev tree; dev-tree detail may ride as free text in a question body
> but is never a structural anchor.
> Supersedes `design/design-brief.md` and `design/screen-inventory.md`
> (both predate the v1 scope freeze and describe screens that no longer exist — handoff
> ceremony, CR forms, marketplace filters, donation flow, Track tags, verification-doc upload).
> **How to use this doc:** design Batch 0 (system + shell + reusable components) first and get
> sign-off before any screen; then sketch batches in order. Mid-fidelity, real content from the
> PRD — no lorem ipsum. Grayscale + one accent is fine; the point is layout, hierarchy,
> components, and states. Every REQ-N reference points into prd-mvp.md.

## 1. What the product is (one paragraph)

ai4good is a **nonprofit-operated, open-source marketplace** connecting NGOs that need small
custom internal tools (intake forms, CRUD trackers, directories, dashboards) with **volunteer
AI-augmented developers**. NGOs fund **"fuel"** — prepaid, non-cash, project-scoped credit that
pays for AI compute during the build. The volunteer builds the first version through Claude
Code orchestrating **Lovable**; the deliverable is a **deployed, running app the non-technical
NGO owns and keeps evolving itself via chat**. ai4good is a *coordination layer*, not a vendor
— it makes no delivery guarantee, and the UI must never imply one.

## 2. Personas (who the screens are for)

- **NGO admin — non-technical.** Program/ops staff at a small nonprofit. Single account does
  everything (funding, acknowledgments, scope edits, offboarding — REQ-001 single-seat).
  Anxious about cost and lock-in. Needs plain language, visible cost/risk, clear next actions.
  *Most screens must be legible to this person.*
- **Volunteer — AI-augmented developer.** Comfortable with GitHub, Claude Code, a terminal.
  One volunteer per project (REQ-001). Their real workbench is Claude Code + the ai4good Skill;
  the platform UI is their coordination surface (candidacies, consent, key, blockers, done).
  Tolerates density.
- **Platform admin / founder-concierge.** Internal operator: vetting, exception triage, match
  concierge, money oversight. Density and control over polish.
- **Logged-out visitor.** Project pages and listings are public (REQ-010/011) — the public sees
  what ai4good is building. Design public surfaces to read well with zero context.

## 3. Voice, tone & emotional target

- **"Coordination layer, not a vendor."** Warm, human, honest, civic — not corporate SaaS.
- **Radically transparent about money and risk.** Never hide that fuel can be fully spent
  without a viable deliverable; never imply an SLA. Honesty is the trust mechanism.
- **Calm and low-anxiety.** A non-technical NGO is spending money on something it doesn't fully
  understand. Reduce dread: clear next actions, no jargon, visible safety rails.
- **Instructive, never accusatory.** Rejection/failure copy (key 401s, fuel exhaustion, setup
  failures) tells the user what happened and what to do next — first-week errors are
  onboarding UX, not abuse (REQ-009).
- **Declines are plain and kind.** Discovery declines a bad-fit need (needs ongoing developer
  maintenance, or a confidential codebase) with plain messaging explaining the limitation —
  no euphemism, no dead-end shame (REQ-004).
- Tone words: trustworthy, hopeful, grounded, generous, plainspoken. Avoid: hype, growth-hacky
  urgency, dark patterns, fake scarcity, celebration around spend.

## 4. Visual direction

- Civic-tech / human, not fintech-slick. Generous whitespace, large readable type, soft cards,
  rounded corners, gentle shadows. Money UI sober and exact.
- **Palette:** warm neutral base (off-white/stone), one hopeful primary accent (friendly
  teal/green for "go / funded / healthy"), plus semantic colors — amber = "action needed /
  warning", red = "blocked / error", muted = "waiting / deferred".
- **GitHub-style activity surfaces.** Project cards and the in-progress showcase are modeled on
  a code-host's project view (REQ-010/011): stack/language chips, time-since-last-activity,
  assigned contributor, license, progress — familiar developer-grade information design, but
  translated to plain language on NGO surfaces. **Never** show stars/forks/watchers.
- Accessibility is a v1 requirement, not a polish item: WCAG 2.1 AA, contrast ≥ 4.5:1, full
  keyboard navigation, visible focus states, labeled inputs (NFR). Design it in from the sketch.
- Responsive web (mobile / tablet / desktop); no native apps. English only at launch.

## 5. Tech mapping (so screens are buildable as designed)

- Stack: **TanStack Start (SSR) + Tailwind CSS + shadcn/ui** frontend (built via Lovable);
  Supabase backend via edge functions; Stripe Checkout for payments (redirect, not embedded).
- **Design with shadcn/ui primitives:** Card, Table, Tabs, Dialog/Sheet, Badge, Progress,
  Avatar, Button, Input/Textarea, Select, Toast, Alert, Tooltip, Accordion, Breadcrumb,
  DropdownMenu, Skeleton.
- Streaming AI chat (Discovery first token < 1.5s target) — design typing/streaming states.
  Marketplace pages target p95 < 500ms — design skeleton loading, not spinners-forever.

## 6. Global app shell (consistent everywhere)

- **Top bar:** ai4good wordmark (home) · context breadcrumb · notifications bell (REQ-016) ·
  account menu (role-aware).
- **Role-aware primary nav** (starting hypothesis — refine in Batch 0):
  - NGO: Dashboard · My Projects · Post a need · Credit & funding · Help
  - Volunteer: Dashboard · Open projects · My projects · Profile · Help
  - Admin: Concierge (matching + vetting) · Exceptions (triage) · Money · Ops
- **"Action needed" rail** — a recurring panel surfacing the user's next required action (fund
  a match, answer a clarification, resolve a blocker, top up fuel, complete Lovable setup).
  A signature pattern: design it once, reuse on both dashboards and the project page.
- Global patterns to define once: empty states, error states, loading skeletons, toast,
  degraded-service banner (see §13).

## 7. Reusable components (design once in Batch 0, reuse verbatim)

1. **Lifecycle status badge** — one chip per project state; exactly **9 states** (§9). There is
   no `paused` and no handoff state — never design pause/resume or handoff affordances.
2. **Fuel gauge / balance chip** — project fuel in real dollars-and-cents, burn rate, runway;
   the live gauge is the platform monitor's minute-cadence read of the provider's usage
   reporting (billed cost is the final record — REQ-006/009). Threshold states: 20% = NGO
   top-up warning · 5% = volunteer warned · at the stop the platform has the provider reject
   further requests — composer/build blocked with the cause stated + top-up CTA; the depleted
   blocker is a status mirror of the provider-side stop, never its own enforcement (d67/d69).
   Top-up restores service automatically — no "reactivation" step to show. **Stop causes are
   ranked (d69):** a top-up clears only the out-of-fuel stop — a chargeback/enforcement stop
   renders its own distinct blocked state that a top-up never clears.
3. **Lovable credit chip** — the second purse. Every funding surface shows **both meters
   distinctly** (fuel = Anthropic build compute vs Lovable credits = NGO-paid app layer,
   REQ-010/021); they are never conflated, never summed. States: setup-pending → connected →
   low → exhausted (with a direct route to Lovable top-up).
4. **Discovery credit gauge** — "Discovery credits: 7 of 10 today" chip + per-turn credit cost.
   Credits are abstract units — **never render with a $ sign**, never as a balance the NGO
   owns. Vetted tier shows 30/day. Exhausted state offers the three remedies (§8).
5. **PM requirement tree panel** — the plain-language requirement view renders the **PM tree only**
   (d82, REQ-026): requirement-level items deduced from the scope doc, seeded at kickoff
   (including the "Author the project PRD" bootstrap item, REQ-036), with status per item,
   current work highlighted, and percent complete = done top-priority requirements / all
   top-priority requirements. The volunteer's fine-grained **dev tree is never rendered on any
   platform surface** — not to the NGO, not to the public. Read-only for the NGO; **status is
   never editable by anyone in the UI** (In Progress comes only from the volunteer's explicit
   pull; Done only from verified completion — the requirement's linked dev work merged and its
   acceptance evidenced). Includes the requirement-anchored NGO comment affordance (REQ-015, d86).
6. **Burn-per-requirement rows** — token consumption per PM requirement, the same items the
   NGO tracks (d82, REQ-034: the recorded granularity IS the displayed granularity — nothing
   finer exists). **Token-denominated** (attribution is tokens; money is a separate meter —
   never mix units in one figure). `exploration`, `onboarding`, `unattributed`, and the
   NGO-facing categories (Discovery, assistant) render as first-class honest rows, never as
   errors; totals always reconcile to visible lines.
7. **Blocker badge + card** — orthogonal to lifecycle status (REQ-024). Types: clarifying
   question, awaiting NGO review, external dependency, GitHub collaborator needed, Lovable
   setup pending, fuel top-up needed, Lovable credits. Severity + 48h reminder / 7d escalation
   aging; auto-raised types keep one instance that upgrades in place. Visible wherever the
   project is listed.
8. **Acknowledgment modal** — hard, checkbox-gated, warm-but-unmissable. Distinct variants
   (§8, never reused): NGO signup ToS+Promise · first per-project funding (names project +
   cap) · per-match acknowledgment (names the volunteer) · volunteer first-consent disclaimer ·
   Tier-2 fixtures-only acknowledgment. Captures the acting person's name, title, and
   authority attestation on NGO money/consent gates (REQ-001).
9. **Virtual-key reveal card** — shows the volunteer's per-project gateway key **once** (copy
   button + "I've stored it" confirm) with the env-var setup snippet; live key-state chip;
   instant-replacement flow on revocation (REQ-009).
10. **Comment thread** — chronological plain-text stream, auto-linked URLs, **no markdown, no
    attachments, no @-mentions, no threading** (REQ-015). **Participants-only, read AND post
    (d80):** the project's NGO account, the currently assigned volunteer, and the platform
    admin only while escalated — the thread never renders for logged-out visitors or unrelated
    accounts; role changes update access automatically. Posting notifies the other party.
    After completion/cancellation: participants keep the history, posting is frozen. System
    events never appear here.
11. **Project card, two variants** (REQ-011): **open-project card** (title, summary, complexity
    tier, needed skills, cause tags, NGO name, posted date — static, no live stats, no dollar
    figure, **no candidate/interest count**) and **in-progress showcase card** (live,
    code-host style: requirement progress, cadence, stack, time since last activity, contributor).
12. **Q&A / clarifications log** — lifetime record of resolved clarifying questions (who asked,
    who answered, when); unresolved ones clearly flagged (REQ-010/024).
13. **Notification patterns** — in-app inbox item (low-tone vs escalation tier) + email
    template for critical events (money, deadlines, blockers, completion, decisions).

## 8. Money rules that shape UI (get these exactly right)

- **Fuel is non-cash, project-scoped, fully consumable.** No cash-out, no withdrawal, no
  refunds — never design a money-out affordance. A wronged NGO is made whole in credit.
- **Gross display:** a $100 top-up shows $100 of fuel. The platform share (15%) is recognized
  at consumption, never at top-up — no fee line on the checkout.
- **No donation flow.** Leftover fuel at completion/cancellation releases to the NGO **general
  balance**: non-cash redeployable credit, no expiry, never silently removed; it **auto-applies
  at any funding checkout** and can satisfy the $50 minimum (remainder on card).
- **Two funding moments** (REQ-006): mid-Discovery ("keep going now" when free credits run
  out) and match funding (the default). Same checkout. Funding buys continuation, **not
  speed** — copy says "keep going now," never "go faster."
- **Match-to-fund:** consent ≠ kickoff. After volunteer consent the NGO has **7 calendar days**
  to fund ≥ $50; the acknowledgment gate (naming the volunteer, fuel ≠ deliverable, no SLA,
  data tier, "your chosen amount is your maximum exposure") **precedes** the funding CTA.
- **The NGO picks its own amount** — no prefilled estimate, no suggested dollar figure; the
  complexity tier is context only, with start-small / top-up-stepwise guidance. **First-fund
  cap** (default $200/project) for NGOs with no completed history — shown plainly, not as a
  punishment.
- **Free Discovery credits:** 10/day unverified · 30/day vetted; hard reset once per UTC day,
  no rollover. Exhausted-state CTAs: **get vetted → 30/day** (only if unvetted) · **fund this
  project to keep going now** · **come back tomorrow**. File attachments never consume credits
  and never interrupt (no pre-ingest confirmation dialog).
- **Honest cost line near every spend:** fuel powers AI work, is not cash-refundable, and
  unused fuel stays as credit for the NGO's projects. Later top-ups carry a passive Promise
  link only — no repeated hard modals.
- **Ledger view:** every project shows purchases, consumption, and balance in real time;
  EU/UK NGOs get VAT invoices; failed payments get clear feedback.
- **Chargeback freeze:** a disputed NGO is frozen (no funding, no matching) with the project's
  AI access cut — design the frozen-account and frozen-project states (admin-visible reason;
  NGO sees a plain "account under review" with support contact).

## 9. Lifecycle: exactly 9 states (drive every status chip and available action)

`draft → discovery_in_progress → scoped → triage → open → matched_pending_fuel → in_progress
→ completed`, plus `cancelled` (terminal). (REQ-005.5)

- **No `paused` state** — never design pause/resume. Unpublish is `open → scoped`.
- **No handoff states** — `completed` replaces them. Completion = all top-priority PM
  requirements done (each through verified completion); the NGO already owns the live app and
  repo throughout, so there is **no delivery ceremony, no sign-off screen, no
  acceptance/rejection loop** (REQ-012).
- Abandonment/rematch is a transition (`in_progress → open`), not a state: ex-volunteer access
  revoked, fuel **stays on the project**, project re-opens with rematch priority (REQ-027).
- Each screen reflects state: a project in `open` shows "mark interest" (volunteer view); in
  `matched_pending_fuel` shows the funding gate + countdown; in `in_progress` shows the live
  build surfaces; in `completed` everything goes read-only with offboarding prompts.
- Match records have their own mini-lifecycle (invited / consented / declined / expired /
  released) — admin-facing in the match log.

## 10. Hard "never show" list (PRD-enforced negatives)

Never design any of the following into any screen:

- Pause/resume, handoff/delivery ceremony, acceptance sign-off, star or numeric ratings,
  NGO-satisfaction scores (volunteers never see them), tips (v1).
- Stars/forks/watchers or any popularity metric; applicant queues, apply buttons, NGO
  approve/decline on matches (matching is concierge enforce-match); candidate/interest counts
  on public cards (candidacies are admin-only, invisible to the NGO).
- Dollar estimates in Discovery output or the scope doc (complexity tier only); a $ sign on
  Discovery credits; a fee/skim line at checkout; withdraw/cash-out/donate affordances.
- GitHub issue lists, PR lists, raw commit logs, or git jargon on the project page or any NGO
  surface (the repo link is the only GitHub touchpoint); Linear branding or seats for NGOs —
  the requirement panel is their only window.
- Editable requirement status anywhere (In Progress only from the volunteer's pull, Done only
  from verified completion; violations auto-revert) — and **never any dev-tree content** on an
  NGO or public surface (d82).
- A "verified" public claim — the v1 flag may render only as **"founder-vetted"** (REQ-002).

## 11. Screen inventory (design in batch order)

### Batch 0 — design system + shell (sign-off before any screen)
Style frame (tokens, type scale, spacing, radius, elevation, semantic colors, button/badge/
input variants, focus states) · app shell + role-aware nav · "Action needed" rail ·
empty/loading/error/toast patterns · all §7 components rendered once, including all 9
lifecycle badges.

### Batch 1 — Public & onboarding
| # | Screen | Purpose & key elements | States | REQ |
|---|--------|------------------------|--------|-----|
| 1 | Marketing landing + waitlist | Explain the model honestly (coordination layer, fuel, open source); dual CTAs (NGO / volunteer); allow-list beta → waitlist form | open-beta / waitlist | Promise |
| 2 | Sign up / log in | Email+password, GitHub, Google. **Volunteer signup requires GitHub link** (imports stats). NGO signup fires the full ToS+Promise acknowledgment (gates project creation; captures name/title/authority) | error, loading, awaiting-email-confirm | REQ-001/007 |
| 3 | NGO org profile | Name, mission, country, website, logo. Vetting status display: unverified (10 credits/day, can't publish) vs **founder-vetted** (30/day, can publish+fund). No self-serve doc upload — vetting happens in concierge onboarding | unverified / vetted | REQ-002 |
| 4 | Volunteer profile | GitHub-imported stats (languages, repos, contributions), skills, causes, availability h/week, optional bio | import loading | REQ-007 |

### Batch 2 — NGO: need → Discovery → publish
| # | Screen | Purpose & key elements | States | REQ |
|---|--------|------------------------|--------|-----|
| 5 | Project intake | Title, problem description, cause tags, urgency; optional reference-file upload; **drafts persist automatically** (no save button) | — | REQ-003 |
| 6 | **Discovery chat** | 5–10 structured turns → scope. Credit gauge + per-turn credit cost (unfunded) OR per-turn fuel cost (funded — "Funded → all-$"); resumable; agent may request files mid-chat and cite them; bounded regeneration with logged reason (free) | streaming; credits-exhausted-unvetted (3 CTAs) / -vetted (2 CTAs); funded mode; off-topic decline notice; turn-ceiling wrap-up; **fit-decline** (needs developer maintenance / confidential codebase — plain, kind, terminal); finished | REQ-004 |
| 7 | Reference files | Upload at intake, mid-Discovery, or from project page (pre-completion). List with name/type/uploader/description; data-responsibility disclosure ("redacted/sample data only — ai4good and the volunteer will see these"); downloads restricted to NGO/volunteer/admin | default disclosure / **Tier-2 hard fixtures-only acknowledgment** / upload error | REQ-032 |
| 8 | Scope document editor | Editable: summary, user stories + nested ACs, suggested stack. Read-only context: complexity tier + rationale (**no dollars**), data-sensitivity tier (Tier-2 renders fixtures-only plan), maintainability verdict, Lovable recommendation + build split, "Lovable paid directly ~$25/mo" disclaimer, start-small advice | invalid-output retry | REQ-005 |
| 9 | Publish → triage | Publish CTA (vetted only; unvetted see "get vetted to publish"). **Every publish is founder-reviewed (d74 — no auto-publish exists):** every NGO sees the same calm "under review" state (no SLA promise). Exactly three outcomes: approved → live / returned-to-scoped with the founder's reason note (edit + republish) / terminally declined | unvetted-blocked / under-review / returned-to-scoped / terminally-declined | REQ-005/023 |

### Batch 3 — NGO: dashboard, fund, run, complete
| # | Screen | Purpose & key elements | States | REQ |
|---|--------|------------------------|--------|-----|
| 10 | **NGO dashboard** | Per project: status badge, % complete (done top-priority PM requirements / all — d82), fuel chip, Lovable chip, volunteer, cadence signals (last commit, requirements done/total, current requirement). Cross-project fuel summary; **general balance** as redeployable credit; action-needed rail (blockers by severity/age, scope-addition discussions, funding deadlines) | empty (no projects) | REQ-013 |
| 11 | **Funding screen** | Ack gate naming the volunteer **before** the CTA → amount input (no prefill, $50 min, first-fund cap notice, tier as context, start-small copy) → Stripe redirect. General balance auto-applies. 7-day countdown; no-refund disclosure; Lovable setup reminder when recommended | first-fund ack / repeat top-up (passive Promise link) / deadline reminder / **expired** (project → open, restart CTA) / payment failed | REQ-006 |
| 12 | Lovable setup checklist | Who-acts-next stepper. NGO: create workspace, fund it, set volunteer credit cap, invite volunteer (build-only) + ai4good monitoring account. Gate: both memberships validated. Volunteer: provision project, DB, GitHub sync, inject conventions. Platform: validate repo → flip public → notify both. Validated paste-back for transferred info | pending per step / validation failed (specific fix shown) / stalled → blocker | REQ-021 |
| 13 | **Project page** (the flagship screen — public; **two-layer rule, d80:** the public STATUS PROJECTION is identical for every viewer, while three role-gated elements render only for their roles — the participants-only thread, reference-file downloads, the NGO assistant) | Projection: identity (title, NGO, status, volunteer, repo link **with plain-language empty state**, tier, causes) · **PM requirement tree = primary content** (never dev-tree content — d82) + current work + progress · PRD-phase status (the bootstrap item on the PM tree + score state, REQ-036) · plain-language activity feed (task titles, never commit jargon) · fuel gauge (provider truth) + Lovable chip side by side · burn-per-requirement (tokens) · blockers · Q&A log · reference-file METADATA · cadence + code-host-style signals (stack, last activity, contributor, license). Role-gated: comment thread (participants) · file downloads (NGO/volunteer/admin) · **NGO-only** assistant entry point | per lifecycle state; blocked; fuel-low; PRD-phase vs build-phase; hidden (break-glass — page publicly unreachable) | REQ-010 |
| 14 | NGO project assistant | Chat reframed at **first kickoff** (d78 — NOT at funding: a funded project pre-kickoff still shows Discovery): read-only project Q&A (status, blockers explained, progress, runway). Available first kickoff → terminal — stays through abandonment/rematch windows; the bot interface ends at completed/cancelled while the static page surfaces remain. Per-turn fuel cost + fuel visible. **Only the project's NGO account ever sees it** (not the volunteer, not admins, not visitors). Scope asks → explains the informal protocol + pre-fills a draft comment the NGO posts | pre-kickoff (Discovery only) / active / **fuel-zero** (composer disabled, top-up CTA) / terminal (bot gone) | REQ-033 |
| 15 | Completion & offboarding (NGO) | `completed` notice: leftover fuel → general balance (shown). Offboarding prompts with confirm: remove volunteer + ai4good monitoring account from Lovable workspace; choose whether dev keeps read-only repo access. Everything else goes read-only | prompts pending / done | REQ-012 |

### Batch 4 — Volunteer: browse → candidacy → build → done
| # | Screen | Purpose & key elements | States | REQ |
|---|--------|------------------------|--------|-----|
| 16 | **Public listings** | Newest-first, read-only (no filters/sort in v1). Open-project cards (static) + in-progress showcase cards (live, code-host style). One action: **"mark interest"** (candidate for this project) — feeds the admin match log only | empty; logged-out (no action button) | REQ-011 |
| 17 | Match consent | Invitation (from concierge match) → one-action consent. First consent fires the combined account-held disclaimer (coordination layer, open-source MIT, per-project key, Tier-2 fixtures-only + confidentiality, deactivation risk) **before any project introduction**. Consent ≠ kickoff — "waiting for NGO funding" | disclaimer unsigned / already-signed / consented-awaiting-funding / declined / expired | REQ-007 |
| 18 | **Volunteer dashboard** | Current projects (status, fuel, Lovable status, in-progress tasks, unresolved blockers/clarifications), open candidacies, GitHub handle, **virtual-key reveal card** (show-once at kickoff; replacement flow), completion-credit events + "Shipped first tool" badge (private — no public profile in v1) | empty / first-project / key-revealed vs stored | REQ-014/009 |
| 19 | Volunteer actions on the project page | Same public page (no separate dev view) + role-gated actions: raise blocker (type, severity, title, body + **never-paste-real-data warning**), raise a requirement-anchored or project-level clarifying question, reply to thread, view reference files | — | REQ-010/024 |
| 20 | Mark done / completion readiness | Readiness check (all top-priority PM requirements Done through verified completion — dev work merged + acceptance evidenced, repo URL recorded, README/runbook, work pushed) → mark done → private "credit earned" confirmation. Disabled with named gaps while incomplete | blocked-incomplete / done | REQ-012/028 |

### Batch 5 — Comms & in-project flows
| # | Screen | Purpose & key elements | States | REQ |
|---|--------|------------------------|--------|-----|
| 21 | Comment thread (full view) | Plain-text chronological stream (§7.10 — **participants-only read+post, d80**; never rendered to visitors/unrelated accounts). Requirement-anchored NGO comments on queued/in-progress requirements only (from the requirement panel → relayed onto that requirement's PM-tree item; reply returns to thread). Scope-addition discussions live here: guidance copy (additions consume existing fuel, may extend timeline, volunteer-optional; **one active discussion at a time**) | empty / one-discussion-active / read-only post-terminal (participants keep history) | REQ-015/025 |
| 22 | Notifications center | In-app inbox; read/unread; low-tone vs escalation tier; email mirrors critical events (money, deadlines, blockers, completion, decisions). Taxonomy in REQ-016 | empty | REQ-016 |
| 23 | Blocker detail | Card + Q&A + project-thread link; severity; 48h reminder / 7d admin-escalation aging shown; resolution requires a note; auto-raised types upgrade in place | escalated (7d) / resolved | REQ-024 |

### Batch 6 — Platform admin / founder (density over polish)
| # | Screen | Purpose & key elements | States | REQ |
|---|--------|------------------------|--------|-----|
| 24 | Concierge console | Candidate pools per project (**no candidacy window / no countdown — d68 removed it**; the concierge matches from the pool at their own judgment); create enforce-match (binding, no NGO approval); **match log** (candidacy/invite/consent/decline/expiry/release, timestamps, reasons); unmatched-aging queue (7d); audited **vet/unvet action** (legal name, public reference link, contact name+title+attestation, evidence type, note) | — | REQ-007/002 |
| 25 | Founder review queue (triage, d74) | **Every publish lands here** — no auto-approval exists. Per item: the no-authority ADVISORY panel (versioned per-check evidence across the six dimensions; deliberately NO recommendation; advisory outage never blocks deciding). Three decision actions: approve → live / return-to-scoped (reason note to NGO) / terminal decline — each recorded with per-check dispositions, policy + advisory versions, and an override-rationale field (the RM-64 calibration dataset). Item age exposed; the queue simply pauses during founder absence (accepted). **Break-glass** = the d75/d79 visibility switch: one audited, reversible, founder-only action hiding listing + showcase + page + repo — never a lifecycle change; un-hide is the same action in reverse | aging item / advisory-unavailable / hidden-project | REQ-023/031 |
| 26 | Money dashboard (the one v1 dashboard) | Funding, consumption, platform share, reconciliation status, chargebacks; auto-corrections visible (never approved — visibility only); **undecidable drift** surfaced for human attention; founder-read daily | drift-flagged | REQ-030 |
| 27 | Ops items | Work items vs service targets (vetting batch, provisioning failures, chargeback reviews, incidents); admin actions: per-NGO Discovery kill switch, account deactivation (AUP), contact-transfer/recovery. (Break-glass hide/un-hide lives on screen 25 — one audited visibility switch, not a repo-only action) | — | REQ-006/030/031 |

## 12. Designer's working notes

- Draw the **default** for every screen; add listed states for the high-traffic ones
  (Discovery chat, both dashboards, project page, funding, listings).
- Reuse Batch-0 components verbatim — never reinvent the fuel gauge, status badge, or blocker
  card per screen.
- Annotate each screen with: the **lifecycle state(s)** it represents, the **primary action**,
  and its **empty/error** condition.
- Keep NGO screens (Batches 2–3) noticeably calmer and more guided than volunteer (Batch 4)
  and admin (Batch 6) screens.
- **Units discipline:** fuel and ledgers in dollars-and-cents; Discovery credits unitless
  (never $); burn-per-requirement in tokens. Never mix units in one figure.
- Acknowledgment modals are legally load-bearing: full text visible (not behind a link),
  checkbox-gated, distinct per variant, and never pre-checked.

## 13. Degraded & edge states (design them, don't improvise later)

- **Anthropic outage:** "service degraded" banner; Discovery intakes queue; assistant offline.
- **Lovable outage/MCP break:** build degrades to in-browser Lovable — messaging, never a
  dead build; setup blockers age instead of erroring.
- **Linear outage:** the requirement panel goes stale (staleness indicator), volunteers keep working;
  it converges on recovery — never an error wall.
- **Provisioning failure at kickoff:** the project stays `in_progress`; gaps surface as
  blockers/ops items ("your repo setup is pending"), never a special lifecycle state.
- **Frozen (chargeback) / deactivated (AUP) accounts:** plain, non-accusatory lockout states.
- **Status auto-revert (PM tree only):** low-tone, instructive notification to the volunteer
  ("requirement status moves only through the pull and verified completion — we've reverted
  the manual change"). The dev tree is exempt — its vendor-native automations never revert.

## 14. The one-sentence design goal

Make a non-technical NGO feel **safe, informed, and in control** while spending money on AI it
doesn't fully understand — and give a volunteer a **clear, low-friction** place to do good
work — without ever pretending ai4good guarantees an outcome.
