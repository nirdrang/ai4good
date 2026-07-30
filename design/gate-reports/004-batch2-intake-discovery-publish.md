# Design gate report 004 — Batch 2: NGO intake → Discovery → publish

Date: 2026-07-30 · Gate: UI WoW §3 step 2
Input: five Batch 2 screens (project-intake, discovery-chat redrawn, reference-files,
scope-document, publish-review) + the change-order-006 fix on marketing-landing.
All six pulled byte-exact against the project's own current sizes.

## Verdict: PASS — all six clear for build; one founder decision still open

## Change order 006 — RESOLVED, all three defects fixed

1. **Orphan CSS gone.** The only `rotate(360deg)` occurrence is now a complete, legitimate
   `@keyframes gearspin` (paired with `gearspinrev` for the counter-rotating gear).
2. **Gear centre holes fixed on all three.** Each hole arc now sits inside its `d` attribute
   before the closing quote (`…ZM2.50 0A2.50…Z" fill-rule="evenodd"`), so even-odd punches the
   holes instead of rendering solid. Zero occurrences of the malformed pattern remain.
3. **Caption updated** — no "turning ring" anywhere; it now describes arcs drawing themselves
   clockwise in sequence with the arrowhead riding the tip, and still notes the reduced-motion
   freeze.

## Mechanical scans

| Check | Result |
|---|---|
| Money units — no `$` on Discovery credits | **PASS** — zero credit/dollar adjacency anywhere in the batch; credits render unitless ("0 of 10", "0 of 30") |
| Dollar figures where allowed only | **PASS** — three occurrences, all required: funded-mode fuel balance (`Fuel: $47.20`) and per-turn fuel cost (`$0.14`) in Discovery, and the mandated Lovable disclaimer in the scope document ("paid by your organisation directly — roughly $25 a month… not part of fuel") |
| No dollar estimate in scope output | **PASS** — complexity tier carries no price; the only figure is the Lovable disclaimer, which the spec requires |
| Never-show list (popularity, applicants, apply, pause, withdraw/cash-out/donate, ratings, git jargon) | **PASS** — zero hits across the batch |
| Handle grammar | **PASS** — all names kebab-case requirement vocabulary; zero `task-*`, zero layout names, zero uppercase/underscore. (`scope-ready-panel` initially tripped an over-broad scan pattern; it is semantic, not a layout name — the scan pattern, not the handle, was wrong.) |
| Rename-diff, marketing-landing | **PASS** — 20 handles before and after change order 006, zero lost, zero renamed. Third consecutive clean rename-diff. |

## Handle inventory added this batch

- discovery-chat 29 unique (86 occurrences), project-intake 13, scope-document 21,
  publish-review 11, reference-files 11.
- **discovery-chat was retrofitted deliberately**: it predates the convention, but Batch 2
  redrew it for its states, so handles were added rather than deferred to its wiring leaf —
  as instructed. The designer noted this explicitly in the file.

## Discovery chat — all eight required states present

A streaming (with file request, citation, bounded regeneration) · B credits-exhausted-unvetted
(three ways forward) · C credits-exhausted-vetted (two, no vetting call to action) ·
D funded mode (fuel in dollars, no daily limit) · E off-topic decline (no credit charged) ·
F turn-ceiling wrap-up · G fit-decline (terminal, composer never returns) · H finished
(scope-ready panel linking to the scope document).

## OPEN — founder decision, correctly flagged rather than invented

`project-intake.html` carries a highlighted **"Open question"** box: the **cause taxonomy is
unresolved**. The picker is drawn as a closed list, and the file states the vocabulary must be
shared between project intake and the volunteer profile or matching cannot compare them.
Founder to choose **fixed-at-launch** vs **founder-extendable**. This is the instruction being
obeyed exactly — flag, do not invent. It now blocks nothing in design, but binds three screens
and should be settled before wiring.

## Not verified here

Visual and tonal judgment — especially the fit-decline and credits-exhausted states — is the
founder's gallery pass, not a gate check.
