---
name: override
description: Emergency manual correction on the PM board (revert a bad claim, fix a mangled item) — with founder confirmation and an audit comment. Can NEVER set In Progress or Done.
---

# /override — audited manual correction (PM board)

**Hard rule: /override can never move an item TO In Progress or TO Done.** Those states have
exactly one authority each (/next, /done). Everything else — reverting a bad claim back to
Backlog, unassigning, fixing a mangled title/description against the manifest, removing a
wrong relation — is allowed here, under two conditions:

1. **Founder confirmation in-session** for the specific action (name the item and the exact
   change; wait for the yes).
2. **Audit comment** on the item: what was changed, why, by whom, with a fresh op UUID —
   BEFORE the change where feasible, immediately after otherwise.

If the requested correction is "make it In Progress" or "make it Done" → refuse and point to
/next or /done (whose gates exist precisely for that).
