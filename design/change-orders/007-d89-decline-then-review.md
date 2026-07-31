# Change order 007 — fit decline becomes decline-then-review (d89 re-flow)

Date: 2026-07-31 · From: the build session (founder ruling d89, folded into the requirements
2026-07-30, commit 3ef223e) · Status: OPEN
Project: AI4GOOD platform screens · Immediate scope: `screens/discovery-chat.html` only.
The spec (`design/ui-ux-instructions.md`) is already updated in seven places; Batches 3, 5
and 6 inherit their parts from it when drawn — no work on those now.

## The ruling in one paragraph

The Discovery fit decline was the only consequential AI judgment in the product with no human
in the loop — and the one nobody contests, because a declined NGO simply leaves. It is now
**decline-then-review**: the decline still lands immediately and reads as final, but every
decline is read by a person afterwards, and a wrong one can be overturned. From the NGO's
side the decline is final until an overturn notification arrives — they never see the review
item, the deliberation, or any hint of a pending appeal.

## Edits to screens/discovery-chat.html

### 1. Rework state G (fit decline)

Keep the existing tone — plain, kind, final in the moment. The message must now carry three
things:

- **The cause**, plainly stated (one of the two v1 causes: needs ongoing developer
  maintenance / confidential codebase) — already present.
- **A reshaping suggestion** — already present ("a tracker that a person updates"); keep.
- **NEW — the oversight sentence**, one sentence of honest oversight, e.g.: *"A person reads
  every one of these decisions — if we got this wrong, we'll reach out."* This is
  TEST-ENFORCED: the sentence must appear in the copy the NGO receives, not in an annotation.

No waiting state, no pending badge, no SLA language, no "appeal" affordance. The composer
still never returns in this state. Also note in the state's annotation: the decline is a
durable record on the project (cause, date, reshaping suggestion) and the project moves to
`cancelled` but stays in the NGO's complete project list — those surfaces are drawn in
Batch 3, not here.

### 2. NEW state I — reopened after overturn

The platform admin overturned the decline: the SAME conversation resumes intact. Draw:

- A **reopen notice** at the point of resumption, warm but factual: a person reviewed the
  decline, the project is reopened, Discovery continues from where it stopped.
- The full prior transcript still visible above (including the original decline message —
  history is not rewritten).
- The composer restored; the credit gauge showing **free daily credits** (unitless as
  always). **The notice must NOT imply any fuel came back** — fuel released to the general
  balance at decline stays there; if the project was funded before, the reopened Discovery
  runs on free daily credits until the NGO re-funds.
- Test handles per §5.1 throughout the new state (e.g. `decline-overturned-notice`), and the
  existing handles preserved verbatim.

## Not in this order (spec-carried, for later batches)

- **Batch 3:** the durable decline record on the project page + the declined project's row in
  the complete project list (states already added to spec rows 10 and 13).
- **Batch 5:** three new notification-taxonomy rows (spec row 22).
- **Batch 6:** the fit-decline review item as a NEW KIND of ops item with uphold/overturn
  (spec row 27).

## Done when

State G carries the oversight sentence in NGO-visible copy; state I exists with the reopen
notice, restored composer, free-credit gauge, and no fuel implication; all existing handles
preserved verbatim; new elements carry handles per the grammar.
