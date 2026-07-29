# Design gate report 003 — Batch 1: public & onboarding

Date: 2026-07-29 · Gate: UI WoW §3 step 2 · Input: the four Batch 1 screens
(marketing-landing, sign-up-login, ngo-org-profile, volunteer-profile), pulled byte-exact.

## Verdict: PASS — all four clear; first live run of the test-handle scan

## Mechanical scans

| Check | Result |
|---|---|
| Never-show list | PASS — every keyword hit is the honest-model copy stating the negative ("no refunds, no cash-out", "no application queue and no rating", "followers and stars are never read or shown") or an annotation quoting the rule |
| "verified" ban | PASS — single hit is the annotation mandating "founder-vetted, never verified" |
| Money units | PASS — no $ near credits; the honest cost line ("$100 top-up gives you $100 of fuel — there is no fee") present on the landing |
| GitHub jargon on NGO/public surfaces | PASS — repository/language stats appear only on the volunteer profile, where the spec requires them |
| `data-screen-label` | PASS — present once per screen |

## Test-handle scan (first live run — convention §5.1)

- **Presence:** PASS — 170 handles across the four screens (29/38/25/78), covering controls,
  state displays, lists + items, and every empty/error/alert state.
- **Grammar:** PASS — all 76 unique names kebab-case requirement vocabulary; zero layout/visual
  names, zero `task-*`, zero uppercase/underscore, zero numeric-index testkeys.
- **Rename-diff:** N/A — first batch under the convention; this handle inventory becomes the
  baseline for Batch 2's diff.
- Two interpretation notes, both accepted: (1) the designer states singleton-uniqueness as
  once **per state block** on a design sheet (a sheet renders several states of one screen),
  with once-per-route holding in the built screen — same logic as our catalog exemption;
  (2) `how-it-works-step` uses ordinal testkeys (`step-5`) — acceptable because a step's domain
  identity IS its position; not a precedent for real data rows, which use domain ids.

## Designer annotations worth the founder's eye (quality, not compliance)

- Landing: the volunteer card is "quiet and equal in size — neither audience is a secondary
  citizen"; waitlist state REPLACES the signup actions rather than disabling them ("a dead
  button teaches nothing").
- Sign-up: email fields visibly present but inert until GitHub is linked ("hiding them would
  read as a trick"); the ToS modal renders full scrollable text, two separate checkboxes,
  neither pre-checked; error copy names the cause and next action ("never 'invalid
  credentials'").
- Org profile: the unvetted limit is "a fact with its remedy attached, never a penalty".
- Volunteer profile: availability copy argues for "a low honest number"; loading is skeletons
  in the shape of the real figures.

## Handle baseline (for the Batch 2 rename-diff)

76 unique `data-testid` values recorded in this report's commit; the diff runs against the
union of Batch 1's inventory at the next batch's gate.
