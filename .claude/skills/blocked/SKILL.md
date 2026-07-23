---
name: blocked
description: Mark the bound (or named) PM requirement blocked — a LABEL plus an explanatory comment, never a status change.
---

# /blocked — flag a blocked requirement (PM board)

1. Target = the bound item, or the item the founder names.
2. `save_issue` with labels including `blocked` (labels replace the full set — read current
   labels first and append).
3. Add a comment: what is blocked, on whom/what, since when, and the unblock condition.
4. Report. The item's STATUS does not move — Blocked is information, not a state (the
   way-of-work bars status theater). When unblocked: remove the label, comment the resolution.
