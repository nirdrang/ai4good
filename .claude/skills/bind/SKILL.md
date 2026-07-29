---
name: bind
description: Set, adopt, or clear this worktree's attribution binding (/bind AI4PM-NN, /bind exploration, /bind clear). Bindings drive the per-message stamp; they never change Linear state.
---

# /bind — manage the worktree binding (attribution only)

- `/bind AI4PM-NN` — adopt an existing pull: the issue must be In Progress and assigned to the
  founder with a pull-record comment (verify via `get_issue`); then `Write-Binding` with its
  identifiers and bucket `task`. Refuse if the item is not genuinely pulled — /bind never
  substitutes for /pm-next.
- `/bind bringup AI4DEV-NN` — **foundation work** (W0 bring-up: the harness, staging, CI, the
  work skill, at-config). Verify via `get_issue` that the id is a DEV-board item in the W0
  Bring-up project; then `Write-Binding @{ wave='W0'; project='AI4DEV-NN'; pmId='AI4DEV-NN';
  bucket='bringup'; sessionId=... }`. Bind to the SUB-item being worked where one exists
  (e.g. the fixture-worlds item), not the parent — the parent stays open across many slices and
  tells the burn report almost nothing. Foundation work is planned and approved; it is NOT
  exploration and must never be stamped as such.
- `/bind exploration` — honest untracked work: `Write-Binding @{ wave='none'; project='none';
  bucket='exploration'; sessionId=... }`. Poking around, spikes, answering questions — NOT
  approved foundation work, which is `bringup`.
- `/bind clear` — `Clear-Binding`; stamps fall back to unattributed.

The four honest buckets: `task` (a pulled PM requirement, set by `/pm-next` only), `bringup`
(an approved W0 foundation item), `exploration` (genuinely untracked), `unattributed` (no
binding). Never reach for a looser bucket than the work deserves, and never fake a requirement
binding to make foundation work look like product progress.

**Always end with the session rename line** (founder instruction, 2026-07-29). Binding sets what
the work is COUNTED against; the session name is how the founder tells one open window from
another. Scheme (same table as `/pm-next`'s "Naming a session"):

| this verb | rename line |
|---|---|
| `/bind AI4PM-NN` | `/rename REQ-0NN · <short requirement title>` |
| `/bind bringup AI4DEV-NN` | `/rename AI4DEV-NN · <short item title>` |
| `/bind exploration` | `/rename exploration · <topic in 2-4 words>` |
| `/bind clear` | none — nothing to name it after |

**The agent cannot run `/rename`** — it is a built-in the founder types, exposed by no tool and
stored in no file. Print the line, never claim the rename happened.

Notes: one live session per worktree, one pulled requirement per worktree (the /pm-next skill's
"Worktree way of work" section is the full discipline — parallel work happens in parallel git
worktrees, each with its own binding). If the session banner warned that another session wrote
the binding, adopt deliberately or clear. Binding is advisory context (stamps), NEVER a Linear
write and NEVER a gate; wrong or missing binding degrades data, not work.
