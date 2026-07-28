# Change order 004 (v2) — the app shell: save it as a screen, in role variants

Date: 2026-07-24 · From: the build session (Batch 0 gate) · Status: OPEN
**v2 supersedes v1 entirely** (v1 was delivered to the project chat earlier the same day and
must be ignored). Revised after an adversarial review that found three structural gaps: a nav
tab with no screen behind it, no reconciliation with already-approved screens that render a
different shell, and no mobile behaviour despite an approved mobile screen.
Project: AI4GOOD platform screens
Sources: `design/ui-ux-instructions.md` §4, §6, §7, §8, §10, §11, §12, §13; `prd-mvp.md`;
decisions d74, d82, d85, d86.

## Why

The app shell exists only as canvas card **1a (Shell — GitHub-close)**. It was never saved into
`screens/`, so it never entered the repository and never passed the design gate — yet the shell
is one of the three things Batch 0 hands to the builder, and all 27 screens sit inside it.
Further: only the **NGO** variant was drawn (the shell is specified as role-aware), the sample
content carries pre-correction wording, and **three already-approved screens render mutually
inconsistent shells** (see §D) that this file must become the single reference for.

## A. What to produce

**`screens/app-shell.html`** — one self-contained file, GitHub-close (d85), showing the
variants below stacked and labelled. It is a **component reference sheet**, not a route: keep
sample page content beneath each bar minimal (a single card suffices to show the frame in use).

## B. Common structure — every signed-in variant

- **ai4good mark + wordmark**, left, links home.
- **Context breadcrumb** — see §E for exact per-role content and link rules.
- **Flexible spacer**, then the right-hand cluster:
  - **Notifications bell** with an **amber dot (#9A6700-family), no numeric count** — amber is
    the "action needed" semantic (`tokens-and-badges.html`), and matches the approved dashboards.
    Signed-in only.
  - **Account menu** (avatar) — contents per role in §F. Signed-in only.
- **Tab row BELOW the top bar**, not inside it: flat white bar, muted labels, **2px accent
  underline on the active tab**. (This resolves a conflict — `volunteer-dashboard.html`
  currently puts tabs inside the bar; the shell wins, see §D.)
- **Tab interaction states are part of this sheet** (§4 requires focus states designed in, not
  retrofitted): render each tab in **rest / hover / active / keyboard-focus** (visible focus
  ring), and show focus treatment on the bell and avatar too.
- **Labels in sentence case** ("My projects", not "My Projects").

## C. The variants

### C1 — NGO (signed in)

Tabs: **Dashboard · My projects · Post a need · Balance & invoices · Help**

Two label decisions, both flagged for founder review at the Batch 0 gallery:

- **"Credit & funding" → "Balance & invoices."** The word *credit* is ambiguous across **four**
  distinct money objects in this product: per-project **fuel** (dollars and cents), the
  organisation's **general balance** (non-cash redeployable credit, no expiry, auto-applies at
  the next checkout), **Discovery credits** (unitless daily allowance), and **Lovable credits**
  (a separate purse the NGO pays Lovable for directly, §7.3). "Balance & invoices" names what
  the section actually holds. It also avoids near-collision with the project page's existing
  **"Funding & ledger"** tab (`project-page.html`) — two money sections differing by one word
  would be hard to tell apart.
- **⚠ OPEN — this tab has no screen behind it.** The screen inventory (§11) contains no global
  NGO money section: the funding screen (#11) is a per-project flow, the general balance renders
  on the dashboard (#10), and the ledger is explicitly **per-project**. The only PRD hook is that
  a top-up may be directed to the general balance rather than a project. **Do not invent the
  destination screen.** Draw the tab, and treat its destination as an open question for the
  founder: (a) design a thin balance-and-invoices page in a later batch, (b) drop the tab and
  keep balance on the dashboard with VAT invoices reached from the funding flow, or (c) keep it
  as a filtered view of the dashboard. Note this openly in the shell sheet as a margin note.
- **"My projects" vs "Dashboard" — state the distinction or drop the tab.** No separate
  "my projects" screen exists in §11; the dashboard (#10) already lists the NGO's projects. If
  kept, the intended split is **Dashboard = action-needed overview + cross-project money**, and
  **My projects = the complete list including completed and cancelled**. Render it that way and
  flag it for founder confirmation; if the founder drops it, no screen is lost.
- **"Help"** has no screen in §11 and no requirement behind it. Keep it, but state in the sheet
  what it opens (external documentation or a support contact) — it must not imply an
  in-product help section that does not exist.
- Breadcrumb example: `Hopeful Horizons / Volunteer Shift Scheduler`.

### C2 — Volunteer (signed in)

Tabs: **Dashboard · Open projects · My projects · Profile · Help**

- **"Open projects" and the logged-out "Browse projects" open the same screen** (#16, public
  listings). Use **one label for one destination** — prefer **"Browse projects"** in both, since
  the listings show in-progress showcase cards as well as open ones, so "Open projects"
  misnames the content.
- Same "My projects vs Dashboard" question as C1 — apply the same treatment.
- **No money tab**: volunteers never fund anything.
- Denser presentation than the NGO variant is acceptable (§12), but the shell **structure**
  stays identical.
- The **GitHub-handle chip** currently in `volunteer-dashboard.html`'s header is **not part of
  the shell** — the handle is dashboard content (§11 #18). Do not include it in the shell.

### C3 — Admin / founder (signed in)

Tabs: **Concierge · Review queue · Money · Ops**

- **"Exceptions (triage)" → "Review queue."** Decision **d74** made **every** publish
  founder-reviewed — no auto-approval path exists — so this is the normal queue every project
  passes through, not an exception handler. The new label also matches screen #25's own name,
  "Founder review queue".
- `Concierge` = matching + vetting (#24). `Money` = the single v1 money dashboard (#26).
  `Ops` = work items vs service targets (#27).
- Density over polish is correct here (§11 Batch 6).
- Breadcrumb example: `Review queue / Volunteer Shift Scheduler` (section, then the item).

### C4 — Logged out / public

- **No bell, no avatar.** In their place: **Sign in** (quiet) and **Sign up** (primary).
- Tabs: **Browse projects · How it works** — state in the sheet that "How it works" opens the
  marketing landing (#1); it is not a separate screen.
- This frame is used by public listings and the public project page, so **nothing role-gated may
  appear in it**.

### C5 — Mobile (narrow width) — REQUIRED, not optional

An approved mobile screen already exists (`project-page-mobile.html`) with a **third** header
pattern: compact bar with mark + page title + bell + avatar, **no tab row, no breadcrumb, no
wordmark**. §4 requires responsive design. Add a **mobile sample** to this sheet that either
blesses that pattern as the mobile shell or refines it, and state explicitly:

- what happens to the **tab row** at narrow width (collapse into a menu, or a bottom bar);
- what replaces the **breadcrumb**;
- how **Sign in / Sign up** appear in the logged-out mobile shell.

## D. Reconciliation — approved screens that currently contradict this shell

This file becomes the single reference, so these existing screens must be brought into line.
Apply these edits **in the same pass** (they are text/markup only, no redesign):

1. `screens/ngo-dashboard.html` — header tab reads **"Credit & funding"** → **"Balance &
   invoices"**; **"My Projects"** → **"My projects"** (sentence case).
2. `screens/volunteer-dashboard.html` — tabs are **inside the top bar**; move them to a **tab
   row below the bar** per §B. Add the **notifications bell** (missing) and the **Help** tab.
   Remove the GitHub-handle chip from the header (it belongs in the dashboard body).
3. `screens/public-listings.html` — logged-out header has **no tab row**; add the **Browse
   projects · How it works** row per §C4, and add the **primary "Sign up"** action beside the
   existing "Sign in".

If any of these is genuinely better than what this order specifies, say so rather than
complying — the shell is being defined now, and a better pattern should change the shell.

## E. Breadcrumb rules (were ambiguous — now explicit)

- **Inside a project:** `Organisation / Project name`. The **organisation segment is a plain
  label, not a link** — no public organisation page exists in v1. The project segment links to
  the project page.
- **At a section root:** show the **organisation name** for NGO (matching the approved
  dashboard), the **section name** for admin, and **"Projects"** for the public listings —
  i.e. it reflects context, not a literal repetition of the active tab.
- **Never** a repository path, branch, or any git reference (§10).

## F. Account-menu contents (were unspecified — now explicit)

- **NGO:** Organisation profile (#3, including vetting status — this is its *only* entry point,
  as no nav tab leads there) · Notification settings · Sign out.
- **Volunteer:** Settings · Sign out. (Profile is already a tab.)
- **Admin:** Sign out.

## G. Also include once in the same file

- **Degraded-service banner** (§13) in a **fixed position directly under the tab row** — "Service
  degraded — our AI provider is having issues…" — so screens do not improvise its placement.
- **The "action needed" rail** as a **standalone shared component**. §6 calls it a signature
  pattern to design once and reuse on both dashboards and the project page; today it exists only
  inside the NGO dashboard. Lift it out so the builder treats it as shared.

## H. Wording and units

- The sample project counter must read exactly **"9 of 14 must-haves"** — the canonical string
  established by change order 002 and rendered by four approved screens. Not "must-have tasks",
  not "must-haves done".
- Fuel sample stays **`$142.50`** (dollars and cents). **Never** a dollar sign on Discovery
  credits. Burn figures in tokens. Never mix units in one figure (§8).
- Where invoices are referenced, say **VAT invoices** (EU/UK) — the PRD explicitly rules out tax
  receipts, so avoid an unqualified "receipts".

## I. Never, in any variant (§10)

No stars/forks/watchers or any popularity metric; no candidate or interest counts; no git jargon
(issues, pull requests, commit logs) on NGO or public surfaces — the repository link is the only
GitHub touchpoint; no Linear branding; no editable status; no dev-tree content on NGO or public
surfaces; no "verified" claim (only "founder-vetted"); no pause/resume; no withdraw, cash-out, or
donate affordance.

## Done when

`screens/app-shell.html` exists showing the five labelled variants (NGO, volunteer, admin,
logged-out, mobile), each with tab interaction states, plus the degraded banner and the
standalone action-needed rail; the three reconciliation edits in §D are applied; and the open
questions (the Balance & invoices destination, and My projects vs Dashboard) are visible as
margin notes rather than silently resolved. The build session then pulls, gates, and commits;
the founder reviews all navigation labels and the two open questions at the Batch 0 sign-off
gallery — the labels above are derived from the specification and product decisions, and remain
the founder's to override.
