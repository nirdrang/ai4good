# Design gate report 002 — the app shell + three reconciled screens

Date: 2026-07-24 · Gate: UI WoW §3 step 2 (pre-Lovable validation)
Input: `screens/app-shell.html` (new) + the three screens change order 004 v2 asked to be
brought into line (`ngo-dashboard`, `volunteer-dashboard`, `public-listings`).

## Verdict: PASS — clear for the Batch 0 build, with two founder ratifications pending

Everything change order 004 v2 asked for was produced, and the mechanical scans are clean.
Two items need a founder decision before they harden, and one of them changes the screen
inventory — neither blocks building the shell itself.

## Mechanical scans — all clean

| Check | Result |
|---|---|
| Never-show list (popularity metrics, candidate counts, apply, withdraw/cash-out/donate, "verified", pause/resume, git jargon on NGO/public surfaces) | PASS — the only matches are the shell's own descriptive reference note and legitimate volunteer dev-tree wording |
| Money units (§8) — no `$` on Discovery credits, fuel in dollars-and-cents, burn in tokens | PASS — zero credit/dollar collisions across all screens |
| Canonical counter string | PASS — `9 of 14 must-haves` exactly, and the shell documents it as canonical |
| Label `Balance & invoices` applied | PASS — shell + NGO dashboard |
| Sentence case (`My projects`) | PASS — no `My Projects` remains |
| Reconciliation 1 — NGO dashboard label | PASS |
| Reconciliation 2 — volunteer dashboard: tabs moved BELOW the bar, notifications bell added, Help tab added, GitHub-handle chip removed | PASS on all four |
| Reconciliation 3 — public listings: tab row added, primary `Sign up` added beside `Sign in` | PASS |
| Five variants present (NGO, volunteer, admin, logged-out, mobile) | PASS |

## Founder ratifications pending

**R1 — the two questions were answered, not left open.** Change order 004 v2 asked for them as
visible open questions; the designer instead answered both with reasoning, labelled them
**Confirmed**, and explicitly wrote *"Navigation labels are the founder's to override at the
Batch 0 gallery."* So nothing was hidden — but they are now recommendations awaiting
ratification, not open questions:
- **`Balance & invoices` keeps the tab** — option (a): a thin organisation-level page designed
  in a later batch, holding the general balance and how it auto-applies, Discovery credits
  remaining, the Lovable purse, and the VAT invoice list. Per-project fuel and ledger stay on
  the project page.
- **`My projects` stays** — Dashboard = action-needed overview + cross-project money;
  My projects = the complete list including completed and cancelled. Applies to the volunteer
  variant on the same terms.

**R2 — CONSEQUENCE: the screen inventory grows from 27 to 29.** Both answers above imply
screens that do not exist in `ui-ux-instructions.md` §11 and are not in any batch:
1. an organisation-level **Balance & invoices** page (NGO), and
2. a **My projects** list (NGO and volunteer — one screen, role-varied, or two).
If the founder ratifies R1, the spec's screen inventory and the batch plan must be updated
(likely Batch 3 for the NGO money page, Batch 4 for the volunteer list), and the Linear design
batch items adjusted. If the founder overrides either answer, the corresponding screen
disappears and the tab is dropped instead.

## Designer pushback (recorded, all reasonable)

The change order invited disagreement; the designer used it, with reasons:
- **Mobile keeps the tab row** — no hamburger, no bottom bar: *"the product is not a native app
  and the tab row must stay adjacent to the degraded banner it sits above."* At 390px it becomes
  four equal slots with `Balance & invoices` and `Help` behind **More**; logged-out keeps both
  tabs since two fit.
- **Mobile drops the wordmark and breadcrumb**, confirming the already-approved
  `project-page-mobile` pattern; the page title in the bar carries the project, the organisation
  appears in the page's own header.
- **`Browse projects` in both the volunteer and logged-out variants** (rather than the volunteer
  `Open projects`) — one label for one destination, and the listings carry in-progress showcase
  cards too, so "open" would misname the content.
- **The GitHub-handle chip is dashboard content, not shell.**
- **The action-needed rail has no empty state** — when there is nothing to do it is not rendered
  at all, rather than showing a "nothing to do" card.

All five are accepted: each is consistent with the specification and improves on the order.

## Not re-verified here

Visual fidelity and coherence across the five variants is founder judgment at the Batch 0
sign-off gallery, not a gate check.
