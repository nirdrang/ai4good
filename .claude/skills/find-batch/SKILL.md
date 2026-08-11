---
name: find-batch
description: The founder's MANUAL scout — given one dev item, find AT MOST one batch partner at the CLOSEST proximity, or fail plainly when nothing is near. Never invoked automatically; a batch happens only when the founder types both ids into /work.
---

# `/find-batch AI4DEV-nn` — the partner finder

One job: given a primary dev item, name the single best batch partner, or say **NO BATCH** and
stop. Carved out of the work skill (founder 2026-08-11) so the search has one home, one
standard, and its own verdict shape.

**Manual only (founder 2026-08-11).** The work skill does not call this; the coordinator does
not run it unprompted. The founder invokes it to scout, reads the verdict, and — if convinced —
types `/work <primary> <partner>`, which is the batch signal itself. This skill's output is a
recommendation and nothing else.

**This skill recommends. It never claims, spawns, or edits the board.** The batch mechanics —
one branch, owner-cited commits, the joint plan, the sanctioned closes-line, the stamp pair —
live in the work skill and do not repeat here.

## The verdict is binary, and FAR MEANS FAIL

The goal is the closest-proximity partner, singular. If the closest candidate is still far,
the correct output is failure: `NO BATCH — nothing within proximity`, with one line saying what
was closest and why it does not qualify. **Never stretch the ladder to make a pair.** A forced
batch spends the pairing's whole benefit on review friction, and a "maybe" partner is a NO.

## The proximity ladder — qualify at a rung or fail

Walk the board once, rank every open leaf against the primary, and take the best rung:

1. **Sibling** — same deliverable container as the primary. The strongest pairing: shared
   fixtures, shared contracts, shared suite files.
2. **Touching cousin** — same requirement, different deliverable, and the surfaces genuinely
   touch: the same tables, the same functions, the same suite files. Same requirement alone is
   NOT enough — name the shared surface or it does not count.
3. **Territory fix** — a filed fix item whose subject lives inside the code territory the
   primary will already be editing. Name the files that overlap.

Nothing at rungs 1–3 → **NO BATCH**. Rung membership is checked against the primary's manifest
entry and the candidate's text, never guessed from titles.

## Disqualifiers — any one kills a candidate, whatever its rung

- an open blocker, or state other than Backlog
- an open founder decision inside it
- a container (an item with children is not work)
- a different database need than the primary (one slot serves the pair)
- new acceptance criteria would be needed to close it (a criteria change is never a rider)

## Output shape — always the same three parts

```
PRIMARY   AI4DEV-61 (wire the auth screens)
VERDICT   BATCH with AI4DEV-75 (unlink refusal) - rung 3, territory fix
WHY       both edit the auth edge functions; 75 adds one guard and one test there
```

or

```
PRIMARY   AI4DEV-45 (CI timeout)
VERDICT   NO BATCH - nothing within proximity
CLOSEST   AI4DEV-30 (reds name their resolver) - same root, but no shared surface; rung none
```

Every id carries its short label. The founder's yes or no comes after this output, never before.
