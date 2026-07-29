# Change order 006 — marketing landing: three markup defects from the hero revision

Date: 2026-07-29 · From: the build session (design gate 003, second re-gate) · Status: OPEN
Project: AI4GOOD platform screens · Scope: `screens/marketing-landing.html` only.
No design change requested — the revised hero is approved. These are three defects the
revision left behind.

## Why it matters

The design HTML is the build target: Lovable rebuilds from this markup, so defects propagate
into the app. Two of the three are invisible in a screenshot but real in the file.

## The three fixes

1. **Orphan CSS rule.** A stray line `to{transform:rotate(360deg)}}` sits alone in the
   stylesheet (immediately after the `con5` keyframes block). It is the tail of the deleted
   ring-rotation keyframe whose `@keyframes cyr{from{…}` opener was removed. **Delete the
   orphan line.**

2. **Malformed gear paths — all three gears.** Each gear's centre-hole arc sits **outside**
   the `d` attribute: the markup reads
   `… fill-rule="evenodd" M2.50 0A2.50 0 1 0 -2.50 0A2.50 …Z"` — the fragment should be
   **appended to the end of the `d` attribute's path data**, before the closing quote, so the
   even-odd rule can cut the hole. As it stands the gears render **solid, with no centre
   holes**, and the loose fragment degrades into junk attributes. Same fix on all three
   (radii 2.50, 1.60, 1.25).

3. **Stale annotation.** The hero caption still reads "drawn as pictograms on a slowly turning
   ring". The ring no longer turns — the arcs now draw themselves in sequence. **Update the
   caption to describe what it actually does**, keeping the existing rationale about the
   cycle (that the end of the build is not the end of the tool).

## Done when

`marketing-landing.html` contains no orphan keyframe line, all three gear paths carry their
centre-hole data inside the `d` attribute (gears render with holes), and the hero caption
describes the sequential arc-drawing rather than a turning ring. **No test handles change** —
the current 20 must survive verbatim.
