---
name: bound
description: Print this worktree's current attribution - which requirement it is bound to, the stamp every message carries, and where the binding file lives. Read-only; changes nothing.
---

# /bound — what is this worktree attributed to?

Run, from the repo root:

```
powershell -NoProfile -ExecutionPolicy Bypass -File loop/work/status.ps1
```

Show the output as-is. Do not paraphrase it and do not go looking in Linear — this verb answers
one question from local state only, in under a second.

If it reports `binding : NONE`, say plainly that the work in this folder is being counted as
unattributed, and offer the two honest fixes: `/pm-next` to pull a requirement, or
`/bind exploration` when the work really is untracked. Offer once; never run either yourself.

This verb never writes: no binding change, no Linear call, no status transition. To change the
binding use `/bind`; to pull or close a requirement use `/pm-next` and `/pm-done`.
