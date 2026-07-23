---
name: bind
description: Set, adopt, or clear this worktree's attribution binding (/bind AI4PM-NN, /bind exploration, /bind clear). Bindings drive the per-message stamp; they never change Linear state.
---

# /bind — manage the worktree binding (attribution only)

- `/bind AI4PM-NN` — adopt an existing pull: the issue must be In Progress and assigned to the
  founder with a pull-record comment (verify via `get_issue`); then `Write-Binding` with its
  identifiers and bucket `task`. Refuse if the item is not genuinely pulled — /bind never
  substitutes for /next.
- `/bind exploration` — honest untracked work: `Write-Binding @{ wave='none'; project='none';
  bucket='exploration'; sessionId=... }`.
- `/bind clear` — `Clear-Binding`; stamps fall back to unattributed.

Notes: one live session per worktree, one pulled requirement per worktree (the /next skill's
"Worktree way of work" section is the full discipline — parallel work happens in parallel git
worktrees, each with its own binding). If the session banner warned that another session wrote
the binding, adopt deliberately or clear. Binding is advisory context (stamps), NEVER a Linear
write and NEVER a gate; wrong or missing binding degrades data, not work.
