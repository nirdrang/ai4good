# ai4good — Design Brief (v1)

> Distilled from `.taskmaster/docs/prd.md` for a screen-sketching pass. This is the
> shared context every screen sketch should respect. Pair it with `screen-inventory.md`.
>
> **Updated 2026-06-09** to capture decisions 10–17: daily-drip Discovery *credits* (not the
> old $3/$15 pool), no `paused` state, project comment thread (not a chat channel), CR
> anti-distraction guardrails, reference-file attachments (REQ-032), and the post-Discovery
> NGO assistant (REQ-033).

## 1. What the product is (one paragraph)
ai4good is a **nonprofit-operated, open-source marketplace** that connects NGOs needing
small custom internal tools (intake forms, CRUD trackers, directories, lightweight
dashboards) with **volunteer AI-augmented developers**. NGOs fund **"fuel"** — prepaid,
non-cash, project-scoped service credit that pays for AI compute (Anthropic tokens, and on
Track A, Lovable credits). The deliverable is a **deployed app the non-technical NGO can
keep maintaining itself via chat**. ai4good is a *coordination layer*, not a vendor — it
makes no delivery guarantee.

## 2. Personas (who the screens are for)
- **NGO admin — non-technical.** Program/ops staff at a small nonprofit. Not a developer.
  Anxious about cost and being locked in. Needs plain language, visible cost/risk, and
  reassurance. *Most screens must be legible to this person.*
- **Volunteer — AI-augmented developer.** Comfortable with GitHub, Claude Code, and a
  terminal. Wants clear scope, funded fuel, and low-friction project ops. Tolerates density.
- **Platform admin / concierge.** Internal operator. Verification, triage, money
  corrections, moderation, hand-matching. Density and control over polish.

## 3. Brand voice & emotional target
- **"Coordination layer, not a vendor."** Warm, human, honest, civic — *not* corporate SaaS.
- **Radically transparent about money and risk.** Never hide that fuel can be spent without
  producing a working tool; never imply an SLA. Honesty is the trust mechanism.
- **Calm and low-anxiety.** A non-technical NGO is spending money on something they don't
  fully understand. Reduce dread: clear next actions, no jargon, visible safety rails.
- Tone words: trustworthy, hopeful, grounded, generous, plainspoken. Avoid: hype,
  growth-hacky urgency, dark patterns, fake scarcity.

## 4. Visual direction (starting hypothesis — the sketch pass may refine)
- Civic-tech / human, not fintech-slick. Generous whitespace, large readable type, soft
  cards, rounded corners, gentle shadows.
- **Palette:** warm neutral base (off-white/stone), one hopeful primary accent
  (e.g. a friendly teal or green for "go/fund/healthy"), plus semantic colors —
  amber = "action needed / warning", red = "blocked / error", muted = "deferred".
- Keep money UI sober and clear (no celebratory confetti around spend).
- Accessibility is a v1 requirement: WCAG 2.1 AA, axe-core in CI. Design for it (contrast,
  focus states, labels, keyboard paths) from the sketch.

## 5. Tech mapping (so sketches are reusable for build)
- Build stack: **TanStack Start (SSR) + Tailwind CSS + shadcn/ui (on Lovable); Supabase Edge
  Functions for backend**; Track-A apps deploy on **Lovable**; data on **Supabase**; payments
  via **Stripe Checkout**.
- **Sketch with shadcn/ui primitives in mind:** Card, Table, Tabs, Dialog/Sheet, Badge,
  Progress, Avatar, Button, Input/Textarea, Select, Toast, Alert, Tooltip, Accordion,
  Breadcrumb, DropdownMenu, Command (for the marketplace filter/search).
- Mid-fidelity, **real content from the PRD — no lorem ipsum.** Grayscale + one accent is
  fine for sketches; the point is layout, hierarchy, components, and states.

## 6. Global app shell (consistent across all screens)
- **Top bar:** ai4good wordmark (links home) · context breadcrumb · notifications bell
  (REQ-016) · account menu (role-aware).
- **Role-aware primary nav** (left rail or top tabs):
  - NGO: Dashboard · My Projects · Discover/Post a need · Credit · Help
  - Volunteer: Dashboard · Marketplace · My Projects · Profile · Help
  - Admin: Verification · Triage · Ops/Incidents · Moderation · Observability · Concierge
- **"Action needed" rail** — a recurring right-hand or top panel surfacing the next thing a
  user must do (fund a match, answer a blocker, accept a handoff, top up fuel). This is a
  signature pattern; design it once, reuse everywhere.

## 7. Cross-cutting UI components to define once and reuse
- **Fuel gauge / balance chip** — shows project fuel as redeployable credit, burn rate,
  runway estimate, low-fuel warning at 20% / blocking at 0%. Money shown in cents, honest.
- **Lifecycle status badge** — one chip per project state (see §9).
- **PM task tree** — hierarchical tasks (story → acceptance-criterion sub-tasks), status +
  priority (p0/p1/p2). Decision-9: written by the volunteer's *local* TaskMaster → git push →
  webhook → Postgres projection; the NGO view is read-only with append-only comments.
  NOT GitHub issues.
- **Discovery credit gauge** (decision-11) — "Discovery credits: 7 of 10 today" chip in the
  Discovery chat, per-turn credit cost, and a pre-ingest "≈ N credits to include this file —
  proceed?" confirm. Free-grant framing: never shown as a balance the NGO owns.
- **Project comment thread** (decision-15) — a plain chronological comment stream on the
  project page (NGO ↔ volunteer). No real-time chat, no threading, no @-mentions in v1;
  system events go to the notifications feed + activity feed, never into the thread.
- **CR row + CR inbox** (decision-16) — change requests render as an actionable row on the
  project page (inline Accept/Decline for the volunteer) + a low-tone CR inbox surfaced at
  session start. Never a real-time interrupt; Decline is presented as a normal, no-penalty
  action; the "Request a change" CTA disables while one CR is already open.
- **Reference-files section** (REQ-032) — NGO-uploaded need files (screenshots, spreadsheets,
  blank forms, mockups) listed on the project page; upload shows the data-responsibility
  disclosure, with a hard fixtures-only checkbox gate on Tier-2 projects.
- **Blocker / "awaiting you" badge** — orthogonal to status (fuel-low, awaiting NGO
  clarification, Lovable setup pending) with 48h/7d aging escalation.
- **Acknowledgment modal** — hard, checkbox-gated disclaimer at signup and at every match
  acceptance (NGO) / first apply (volunteer). Warm wording, but unmissable. Passive
  Promise-link footer at top-ups (no hard interrupt).
- **Track tag** — A = "NGO maintains it via chat" (Lovable home). Set in Discovery;
  affects deploy + handoff screens. (Track B "developer-grade / one-off" is deferred to
  post-v1 — decision-19; v1 builds Track A only.)

## 8. Money rules that shape UI (get these right)
- Fuel is **non-cash, project-scoped credit. No cash-out in v1.** Never show a "withdraw to
  bank" affordance.
- Unused fuel **stays on the project** and survives a volunteer change; on project end it
  becomes **general "redeployable credit"** the NGO can **keep or donate** (donations are
  tax-deductible — nonprofit). "Move funds between projects" is v1.5 (don't surface as live).
- **Decisions 8 + 11 (2026-06-04/06) — unified fuel + DAILY-DRIP Discovery credits:**
  - Every NGO gets a **free daily allowance of Discovery CREDITS** on the NGO record (not
    the project): **10/day unverified, 30/day verified** — hard-reset at 00:00 UTC, **no
    rollover**. Verification raises the daily allowance 10→30 (design this as a positive
    3× reward). Credits are abstract units (1 credit = 10k context-token-equivalents), NOT
    dollars — never render them with a $ sign.
  - Credits are a free grant of platform compute (NOT user-held credit). Show as the
    **credit gauge** in the Discovery chat ("Discovery credits: 7 of 10 today"), NOT in any
    "your balance" surface. Each turn shows **its** credit cost; big uploaded files show
    "≈ N credits to include this file — proceed?" BEFORE ingestion (anti-Lovable
    transparency: per-action cost display, never silent burn).
  - **"Funded → all-$" routing (decision-11):** a project with a positive fuel balance has
    its Discovery turns billed to that project's fuel (real $, shown as fuel cost per turn)
    — the credit gauge only shows while the project is unfunded.
  - When today's credits run dry, the Discovery composer disables with CTAs: **"Verify your
    org → 30 free credits/day"** (only if unverified), **"Fund this project's fuel to keep
    going now"**, and **"or come back tomorrow for more free credits."** The daily wall is
    the deliberate "expedite" moment.
  - **Honesty rule:** funding removes the daily wall — it does NOT make Discovery faster per
    message and does NOT raise the daily allowance. Copy says "keep going now," never
    "go faster."
  - **Email verification is required before any Discovery message** (bot floor); NGO-doc
    verification is the publish wall, not the Discovery wall.
- **Post-Discovery NGO assistant (REQ-033, decision-12):** once a project is funded, the
  same chat surface continues past scoping as a **read-only, fuel-metered project
  assistant** ("how's my project going?"). Each turn shows its fuel cost; at fuel 0 the
  composer disables with the top-up CTA. It never mutates anything — scope asks route to a
  pre-filled draft Change Request the NGO submits themselves.
- Funding can happen **any time from `draft` onward**: typically at match acceptance, but
  also pre-publish for NGOs whose daily free credits ran out. Same Stripe Checkout, same
  $50 minimum, same presets ($50/$100/$200/$500).
- **First per-project funding fires a hard acknowledgment modal** (Option D — names the
  project + per-project cap); first match acceptance fires its own hard ack (names the
  volunteer). Subsequent top-ups: passive Promise-link footer only.
- Honest cost line near every spend: *"Fuel powers AI work and is not cash-refundable;
  unused fuel stays as credit for your projects or can be donated."*

## 9. Lifecycle states (drive status chips and what actions are available)
`draft → discovery_in_progress → scoped → triage → open → matched_pending_fuel →
in_progress → handoff_pending → handed_off`, plus `cancelled` — **10 states; there is NO
`paused` state in v1 (decision-17)**. Don't design pause/resume affordances; "take it off
the marketplace" is unpublish (`open → scoped`), and mid-build stops are cancel or an
admin support action.
Each screen should reflect the project's state (e.g. a project page in `open` shows "Apply";
in `matched_pending_fuel` shows "Fund to start"; in `in_progress` shows the workspace).

## 10. The one-sentence design goal
Make a non-technical NGO feel **safe, informed, and in control** while spending money on AI
they don't fully understand — and give a volunteer a **clear, low-friction** place to do
good work — without ever pretending ai4good guarantees an outcome.
