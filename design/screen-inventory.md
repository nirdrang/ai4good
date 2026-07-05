# ai4good — v1 Screen Inventory (for the sketch pass)

> Every v1 surface to sketch, grouped by journey. For each: purpose · key components ·
> states to show · source REQ. Pair with `design-brief.md`. Sketch the **batches in order**;
> establish the design system + global shell (Batch 0) before any screen so all screens stay
> consistent. "States" lists the variants worth drawing beyond the default.
>
> **Updated 2026-06-09** for decisions 10–17: Discovery credits are a daily drip (10/30, no
> dollar pool), no `paused` state (10 lifecycle states), the chat channel is now a project
> comment thread, CR flow carries anti-distraction guardrails, screens added for REQ-032
> reference files + the REQ-033 post-Discovery assistant, and the moderation + concierge-CRM
> screens moved to v1.5.
>
> **2026-07-05 addendum (decisions 20/21/22 — fold into the sketch pass):** the PM-task-tree
> node now renders Linear-backed state (status arrives via PR merge; no NGO edit affordances
> anywhere); screen 12 (Handoff review) gains the **attribution step** (testimonial + 3
> credit-framed dimensions — REQ-035); the project page gains a **burn-per-deliverable**
> section (REQ-034); the volunteer dashboard gains the **virtual-key reveal card** + env-var
> setup (REQ-009 — replaces the old "AI key ready within 12h" wait state); the admin ops queue
> gains the `linear_pool_replenish` batch checklist (workspace pool top-up — pool amendment;
> kickoff assignment itself is API-only, no screen); the old Anthropic key-paste ops screen
> is DELETED.

---

## Batch 0 — Design system + global shell (do first, get sign-off before screens)
- **Style frame:** color tokens, type scale, spacing, radius, elevation, the accent + semantic
  colors, button/badge/input variants, focus states.
- **App shell:** top bar, role-aware nav (NGO / volunteer / admin), the "Action needed" rail,
  notifications popover, account menu, empty/loading/error patterns, toast.
- **Reusable components rendered once:** fuel gauge/balance chip · lifecycle status badge (all
  **10** states — no `paused`, decision-17) · Discovery credit gauge (decision-11) · blocker
  badge · PM-task-tree node · acknowledgment modal · CR row + CR inbox chip (decision-16) ·
  Track A tag (Track B deferred post-v1 — decision-19).

---

## Batch 1 — Auth & onboarding
| # | Screen | Purpose | Key components | States | REQ |
|---|--------|---------|----------------|--------|-----|
| 1 | Marketing landing | Explain the model honestly; route NGO vs volunteer signup | Hero, "how it works", honesty/trust section, dual CTAs | — | Promise/launch |
| 2 | Sign up / Log in | Email + GitHub OAuth (+ Google); **email verification is the bot floor for Discovery** (decision-8) | Auth card, OAuth buttons, role pick, "check your email" confirm state | error, loading, awaiting-email-confirm | REQ-001 / 002 |
| 3 | NGO org setup + verification | Create org, upload verification docs; shows the daily free-credit allowance (decision-11) | Form, file upload, verification-pending banner, **"10 free Discovery credits/day — verify for 30/day" reward card** | unverified (email-verified, can do Discovery) / pending / verified (allowance now 30/day) / rejected | REQ-002 |
| 4 | Volunteer profile setup | GitHub import (repos/langs/contrib), skills, hours, causes | Profile form, GitHub-pulled stats, multi-select | import loading | REQ-007 |

## Batch 2 — NGO: post → discovery → publish
| # | Screen | Purpose | Key components | States | REQ |
|---|--------|---------|----------------|--------|-----|
| 5 | Project intake (draft) | Capture the raw need | Intake form, save-draft | — | REQ-003 |
| 6 | **Discovery chat** | AI Discovery Agent structured conversation → scope; unfunded projects burn the daily free credits, funded projects burn fuel ("Funded → all-$", decision-11) | Chat transcript, agent/user bubbles, progress, **credit gauge ("Discovery credits: 7 of 10 today") + per-turn credit cost**, **"≈ N credits to include this file — proceed?" pre-ingest confirm (REQ-032)**, reference-file upload affordance, data-sensitivity + Track A/B surfacing, guideline callouts | typing, **daily-credits-exhausted-unverified** (3 CTAs: Verify → 30/day, Fund-to-continue-now, come-back-tomorrow), **daily-credits-exhausted-verified** (2 CTAs: Fund, come-back-tomorrow), **funded-Discovery** (per-turn fuel cost replaces the credit gauge), finished | REQ-002 / 004 / 006 / 032 |
| 6c | **Reference-file upload** (REQ-032) | NGO attaches need files (screenshots, spreadsheets, blank forms, mockups) at intake, mid-Discovery, or from the project page | Drag-drop + picker, file list w/ one-line descriptions, data-responsibility disclosure, **hard fixtures-only checkbox gate on Tier-2 projects**, per-file size/type errors | default disclosure / **Tier-2 hard-warn gate** / upload error | REQ-032 |
| 6b | **Discovery fuel top-up modal** (decision-8) | Pre-publish Stripe Checkout when the NGO funds fuel mid-Discovery to keep going | Acknowledgment modal (**hard ack — first per-project funding**: project name + per-project cap, no volunteer pinned yet), preset amounts ($50/$100/$200/$500), honest cost line, redirect to Stripe | hard ack required (first time) | REQ-006 / Promise §9 |
| 7 | Scope document editor | Review/edit DiscoveryOutput (user stories, ACs, stack, data_sensitivity tier, maintenance track) | Editable scope doc, sections, Tier-2 fixtures notice | invalid → re-prompt | REQ-005 |
| 8 | Publish → triage | Submit for platform triage; **disabled with a "verify your org to publish" CTA if unverified** (decision-8 wall — unverified NGOs may reach `scoped` but not `triage`) | Confirm modal, "in review" state, SLA note, unverified-blocked variant | unverified-blocked / verified-ready / submitted | REQ-005 / 005.5 / 023 |

## Batch 3 — NGO: dashboard, fund, handoff, credit
| # | Screen | Purpose | Key components | States | REQ |
|---|--------|---------|----------------|--------|-----|
| 9 | **NGO dashboard** | Home: projects + fuel + progress + "Action needed" rail | Project cards w/ status badges, fuel chips, task-progress, action rail | empty (no projects) | REQ-024 |
| 10 | Match acceptance | Accept a volunteer; hard disclaimer; pre-filled cap | Applicant card, acknowledgment modal, per-project cap | — | REQ-006 / Story 3 |
| 11 | Fund / Stripe Checkout | Top up fuel ($50 min; presets) | Amount presets, honest cost line, Stripe redirect | min-not-met, payment error | REQ-006 |
| 12 | Handoff review + accept | Review deployed tool + handoff checklist, accept | Checklist (RLS-on, revert demo, 2-way GitHub, spend cap), `deployment_url` preview, Accept/Reject | reject-with-comments | REQ-012 |
| 13 | Redeployable credit | Keep or donate general-balance credit | Balance card, keep/donate, tax-deductible note | zero balance | REQ-006 |
| 13b | **Post-Discovery project assistant** (REQ-033, decision-12) | Funded NGO keeps chatting with the AI about project status ("how's my project going?") — read-only, fuel-metered | Same chat surface as Discovery in `assistant` mode, **per-turn fuel cost line**, fuel gauge visible, read-only context cards (tasks/blockers/runway), **draft-CR handoff** ("I can pre-fill a change request — you submit it") | funded-active / **fuel-zero (composer disabled + top-up CTA)** / unfunded (no assistant — Discovery only) | REQ-033 |
| 14 | Lovable Track-A setup checklist | NGO+volunteer 11-step Lovable→GitHub setup | Step checklist, status per step, blocker if stalled | pending / done | REQ-021 |

## Batch 4 — Volunteer: browse → apply → build → handoff
| # | Screen | Purpose | Key components | States | REQ |
|---|--------|---------|----------------|--------|-----|
| 15 | **Marketplace** | Browse/filter open projects | Filterable list, skill/cause/complexity badges, overlap badges ("Skills match 3/5"), search/command | empty results | REQ-011 / Story 3 |
| 16 | Project detail (public) | Scope, stack, cause, fuel, status; apply | Scope summary, status badge, fuel, PM-task preview, Apply CTA | open vs matched vs in_progress | REQ-010 |
| 17 | Apply + first-apply disclaimer | One-time account-level disclaimer, then apply | Acknowledgment modal (open-source, per-key, confidentiality), apply confirm | already-acknowledged | REQ-007 / Story 3 |
| 18 | **Volunteer dashboard** | Current projects, fuel gauges, completion credit | Project cards, fuel gauge, "Shipped first tool" badge, action rail | empty, first-project | REQ-024 |
| 19 | **Project workspace** | Where the volunteer runs the build | PM task tree, fuel gauge + burn/runway, activity feed, **project comment thread (decision-15)**, blockers, **CR inbox chip (decision-16)**, reference-files section (REQ-032), local-TaskMaster/Skill setup hints, commit-prefix guide | blocked, fuel-low | REQ-026 / 010 / 015 / 032 |
| 20 | Ready-for-Handoff | Trigger handoff when P0 tasks done + repo exists | Handoff checklist evaluation, deploy-to-running step, disabled-if-incomplete | blocked, rejection-loop | REQ-012 |

## Batch 5 — Shared comms & in-project flows
| # | Screen | Purpose | Key components | States | REQ |
|---|--------|---------|----------------|--------|-----|
| 21 | **Project comment thread** (decision-15 — replaces the chat channel) | Plain chronological NGO↔volunteer comment stream on the project page | Comment list (plain text + auto-linkified URLs), composer, read-on-load (no Realtime), read-only-after-handoff state | empty / read-only (handed_off) | REQ-015 |
| 22 | Notifications center | All events (matches, blockers, handoff, fuel-low); system events land HERE, never in the comment thread (decision-15) | Inbox list, read/unread, escalation tier, **volunteer CR inbox (decision-16 — low-tone `cr_raised`, surfaced at session start, no email)** | empty | REQ-016 |
| 23 | Blocker / "awaiting you" detail | Resolve a blocker (fuel-low, awaiting clarification, Lovable setup) | Blocker card, Q&A log, 48h/7d aging, resolve action | escalated (7d) | REQ-024 |
| 24 | Change Request (CR) flow | NGO requests an in-scope change mid-build; volunteer-focus is the default-protected state (decision-16) | **3-field CR form with framing copy ("optional — the volunteer decides whether and when")**, **CR row on the project page with inline Accept/Decline (decision-15 actionable primitive)**, decline-is-penalty-free presentation. **No AI CR agent in v1** (v1.5+). | **CTA disabled — one open CR already pending** / accepted / declined | REQ-025 |

## Batch 6 — Platform admin / ops (density over polish)
| # | Screen | Purpose | Key components | States | REQ |
|---|--------|---------|----------------|--------|-----|
| 25 | Verification queue | Approve/reject NGO verification | Queue table, doc viewer, approve/reject | empty | REQ-002 |
| 26 | Triage queue | Approve / request-changes / reject projects; data-sensitivity + Tier-2 enforcement | Queue, scope viewer, private-repo justification check, 48h SLA | — | REQ-023 |
| 27 | Ops & incident console | Admin money-correction (paired-row double-entry: goodwill_refund / chargeback_writeoff), incident tasks | Ledger correction form, paired-row preview, control-total status, incident list | drift/page alert | REQ-030 |
| 28 | ~~Content moderation / takedown~~ **→ v1.5 (decision-10 right-size)** | v1 ships GitHub secret-scanning + push-protection config only (no UI); report buttons + abuse queue + takedown UI are v1.5 — do not sketch for v1 | — | — | REQ-031 |
| 29 | Observability / SLO dashboard | Job heartbeats, outbox lag (incl. `failed_dlq` pager), ledger control-total, provisioning failures | Job-run status grid, lag charts, alert banners | paging | REQ-029 |
| 30 | ~~Concierge supply-funnel CRM + hand-match~~ **→ v1.5 (decision-10, task #45 removed)** | First cohort is hand-matched manually in SQL; Goals 1–5 read from 3–4 Postgres VIEWs. No v1 screen — the `project_aging_unmatched` nudge arrives via notifications | — | — | Goal 5 |
| 31 | Audit-log viewer | Inspect audit_events | Filterable log table | — | REQ-024 |

---

### Notes for the sketcher
- Draw the **default** for every screen; add the listed **states** for the high-traffic ones
  (Discovery chat, both dashboards, project workspace, marketplace, fund, handoff).
- Reuse Batch-0 components verbatim — don't reinvent the fuel gauge or status badge per screen.
- Annotate each screen with: which **lifecycle state(s)** it represents, the **primary action**,
  and any **empty/error** condition.
- Keep the non-technical-NGO screens (Batches 2–3) noticeably calmer and more guided than the
  volunteer (Batch 4) and admin (Batch 6) screens.
