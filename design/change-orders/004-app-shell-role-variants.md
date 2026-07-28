# Change order 004 — the app shell: save it as a screen, in all four role variants

Date: 2026-07-24 · From: the build session (Batch 0 gate) · Status: OPEN
Project: AI4GOOD platform screens
Sources: `design/ui-ux-instructions.md` §6 (global app shell) + §11 (screen inventory) +
§10 (never-show list); `prd-mvp.md` (money model, roles, lifecycle).

## Why

The app shell exists only as canvas card **1a (Shell — GitHub-close)**. It was never saved
into `screens/`, so it never entered the repository and never passed the design gate — yet
the shell is one of the three things Batch 0 hands to the builder, and every one of the 27
screens sits inside it. Two further problems: only the **NGO** variant was drawn (the shell is
specified as role-aware, and volunteer/admin/public screens all inherit it), and the sample
content inside it still carries pre-correction wording.

## What to produce

**Save as `screens/app-shell.html`** — one self-contained file showing **four variants**
stacked vertically, each labelled, sharing identical structure and styling (GitHub-close,
per d85). This is a component reference sheet, not a route: sample page content beneath each
bar should be minimal (a single card is enough to show the frame in use).

### Common to every variant — the top bar

- **ai4good mark + wordmark** on the left (links home).
- **Context breadcrumb** next to it: `Organisation / Project` when inside a project, just the
  section name otherwise. Plain language; never a repository path or git reference.
- **Flexible spacer**, then the right-hand cluster.
- **Notifications bell** with an unread indicator (REQ-016) — **signed-in variants only**.
- **Account menu** (avatar) — role-aware; **signed-in variants only**.
- Below the bar: **one row of underline tabs** (GitHub-close: flat bar, 2px accent underline on
  the active tab, muted labels otherwise).

### Variant 1 — NGO (signed in)

Tabs: **Dashboard · My projects · Post a need · Funding & balance · Help**

- `Funding & balance` **replaces the earlier "Credit & funding"** label. Reason: the product has
  three distinct money objects — per-project **fuel** (dollars), the organisation's **general
  balance** (non-cash redeployable credit, no expiry, auto-applies at the next checkout), and
  **Discovery credits** (unitless daily allowance). The word "credit" alone is ambiguous across
  all three; "Funding & balance" names the two things this section actually holds (funding a
  project, and the general balance + invoices/receipts). The per-project ledger stays a tab on
  the project page, not a global nav item.
- Breadcrumb example: `Hopeful Horizons / Volunteer Shift Scheduler`.

### Variant 2 — Volunteer (signed in)

Tabs: **Dashboard · Open projects · My projects · Profile · Help**

- Denser than the NGO variant is acceptable per §12 (NGO surfaces stay calmer and more guided;
  volunteer surfaces may be denser) — but the shell itself stays structurally identical.
- No money-section tab: volunteers never fund anything.

### Variant 3 — Admin / founder (signed in)

Tabs: **Concierge · Review queue · Money · Ops**

- **`Review queue` replaces the earlier "Exceptions (triage)" label.** Reason: decision d74
  made **every** publish founder-reviewed — no auto-approval path exists — so this is the
  normal queue every project passes through, not an exception handler. Calling it "Exceptions"
  would misdescribe the product's actual flow.
- `Concierge` = matching + vetting (candidate pools, enforce-match, match log, the audited
  vet/unvet action). `Money` = the single v1 money dashboard. `Ops` = work items vs service
  targets.
- Density over polish is correct here (§11 Batch 6).

### Variant 4 — Logged out / public

- **No bell, no avatar.** In their place: **Sign in** (quiet) and **Sign up** (primary).
- Tabs: **Browse projects · How it works**
- This is the frame for the public listings and the public project page, which any visitor can
  reach — so nothing role-gated may appear in it.

## Also include in the same file

- **The degraded-service banner** in place (§13): a calm full-width strip directly under the
  tab row — "Service degraded — our AI provider is having issues…" — shown once as a state, so
  its position in the shell is fixed rather than improvised per screen.
- **The "action needed" rail** rendered once as a **standalone shared component** (§6 calls it
  a signature pattern: design once, reuse on both dashboards and the project page). It exists
  today only inside the NGO dashboard; lift it out so the builder treats it as shared.

## Corrections to carry

- The sample project card inside the current shell card reads **"9 of 14 tasks done"**. Use
  **"9 of 14 must-haves done"** — requirement vocabulary, per d82 and change order 002.
- Keep the existing sample money figure format: fuel as `$142.50` (dollars and cents). Never a
  dollar sign on Discovery credits anywhere in the shell.

## Never, in any variant (§10)

No stars/forks/watchers or any popularity metric; no candidate or interest counts; no git
jargon (issues, pull requests, commit logs) on NGO or public surfaces — the repository link is
the only GitHub touchpoint; no Linear branding; no editable status; no dev-tree content on NGO
or public surfaces; no "verified" claim (only "founder-vetted").

## Done when

`screens/app-shell.html` exists in the project, showing the four labelled variants plus the
degraded banner and the action-needed rail, with corrected wording. The build session then
pulls it, runs the design gate, and commits — and the founder reviews the navigation labels at
the Batch 0 sign-off gallery (the labels above are derived from the specification and the
product decisions, and remain the founder's call to override).
