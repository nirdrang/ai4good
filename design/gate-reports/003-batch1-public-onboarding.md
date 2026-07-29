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

## Re-gate after the founder's revision pass (2026-07-29) — PASS

The founder reviewed in the design chat and the designer revised two screens. Re-pulled and
re-gated; **this is the rename-diff's first real exercise, and it passed.**

- **Rename-diff: CLEAN.** `marketing-landing` 20 unique handles before and after, zero lost,
  zero added. `volunteer-profile` 22 before and after, zero lost, zero added. A substantial
  redraw (a whole animated hero, a sixth process step, a restructured skills block) preserved
  every handle verbatim — which is exactly the property the convention exists to guarantee.
- **Never-show / verified scans: CLEAN.** Every keyword hit is the copy stating the negative
  ("no applicant pile", "followers and stars are never read or shown", "no public profile, no
  ratings and no leaderboard").
- **Accessibility:** the new animation carries a `prefers-reduced-motion` rule that freezes
  every animation — required by §4, and honoured without being asked.

**What changed:**
- *Marketing landing* (18,975 → 28,795 bytes): an animated wordless hero — five pictograms on
  a slowly turning ring, each lighting in turn on a 15-second loop, deliberately a **cycle**
  rather than a line, "the claim that the end of the build is not the end of the tool". The
  process strip gained a **sixth step — "You run it yourself: hosted, yours, keep shaping it
  by chat"** — plus tightened copy throughout ("Plain language. No spec, no budget"; "A human
  reads every project before it goes live"; "By hand. No applicant pile").
- *Volunteer profile* (33,394 → 35,977 bytes): skills split into **"AI tooling" first, then
  "Stack"** — the AI-tooling row is new vocabulary (claude-code, agent-orchestration,
  prompt-driven-builds, lovable, mcp-integrations, ai-evals-guardrails), on the reasoning that
  "building here *is* orchestrating Claude Code and Lovable, and the stack rows only qualify
  it"; Go and Docker dropped, Postgres added. Privacy copy strengthened considerably.

## Second re-gate (2026-07-29, landing revision 2) — PASS on rules, FAIL on markup hygiene

The landing was revised again (28,795 → 32,446 bytes): the hero ring **no longer rotates** —
the five connecting arcs now draw themselves in sequence as each stage lights, and the fifth
pictogram became three counter-rotating gears ("the tool keeps running"). No sections, states,
or handles changed.

- **Rename-diff: CLEAN** — 20 unique handles before and after, zero lost, zero renamed.
- **Never-show / money / verified scans: CLEAN.**
- **Markup hygiene: THREE DEFECTS** (verified directly in the file, not taken on report):
  1. **Orphan CSS at offset 3392** — `to{transform:rotate(360deg)}}` left behind when the
     ring-rotation keyframe was deleted; its `@keyframes` opener is gone. Browsers recover,
     but it is dead debris that would be copied into the built app.
  2. **Malformed SVG on all three gears** — each gear's centre-hole path fragment
     (`M2.50 0A2.50 …Z"`) sits **outside** the `d` attribute, after `fill-rule="evenodd"`.
     The gears therefore render solid with no centre holes, and the fragment degrades into
     junk attributes. This is a visible defect, not just untidiness.
  3. **Stale annotation** — the hero caption still describes "pictograms on a slowly turning
     ring"; the ring no longer turns.

Dispatched as **change order 006**. Not a blocker for Batch 2 design work, but it must be
fixed before the landing is handed to Lovable — the design HTML is the build target, and
malformed markup propagates.

## OPEN QUESTION raised by the designer (founder decision needed)

**Where does the cause list come from?** The ten cause labels on the volunteer profile are a
placeholder. Causes must be a **closed list**, and it must be **the same list NGOs tag projects
with at intake** — otherwise the match comparison is meaningless. The designer offers:
(a) a fixed taxonomy set at launch, or (b) a list the founder can extend when a real need does
not fit. This is a product decision, not a design one: it binds the volunteer profile, the
project intake screen (Batch 2), and the public listings' cause tags. **Not blocking Batch 1.**
