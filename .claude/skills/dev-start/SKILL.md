---
name: dev-start
description: Open one board item for work — the front door of /item-loop. Creates the dedicated worktree, binds it, moves the item to In Progress, then hands over to the loop. Ergonomic packaging, not an authority, and not an alternative path.
---

# /dev-start [item] — open an item (the loop's front door)

**Rewritten 2026-07-31 (founder ruling, AI4DEV-32).** One lifecycle exists: `/item-loop`.
This verb is its HOUSEKEEPING PHASE with a convenient name — it opens an item and hands over.
It decides nothing the loop does not decide, and there is no work it starts that the loop
does not then govern. The old assumption that a leaf sits under an already-pulled PM
requirement is gone: this door works identically for a PM-requirement leaf (bind `task` via
the pull), a foundation item (bind `bringup`), or exploration.

## Ritual

1. **Verify the skill checkout is current** — `git fetch` + confirm the worktree serving
   `.claude/skills/` is at `origin/main`. A stale checkout serves superseded rules; it has
   happened and it cost a real under-run.
2. **One session, one item.** If this session already holds an item (a live binding in its
   worktree), STOP — finish or explicitly abandon it first. The merge tail's clear-path step
   (`Clear-ItemState`) is what frees a session for the next item.
3. **Dedicated worktree, always** — `git worktree add ../ai4good-<slug> -b <branch> origin/main`.
   Never the shared main folder: bindings are per-worktree and a shared folder means sessions
   overwrite each other's (observed, not hypothetical). **The orchestrator session itself works
   IN this worktree** — not just the executor.
4. **Bind it** — `/bind bringup AI4DEV-NN` for foundation work, or the task binding if under a
   pulled PM requirement. The stamp hook then shows the PM/DEV disclaimer on every prompt; if no
   PM item applies, the hook will demand the PM question be put to the dev once — answer it and
   record with `Set-PmAck`.
5. **Board:** item → In Progress with a comment naming the slice (plain Linear MCP call — the
   dev board is working space, no ceremony).
6. **Hand over:** invoke `/item-loop AI4DEV-NN`. From here the loop governs everything —
   brief, gates, verification, merge tail. This verb is done.

## Never
- Never start work in the shared main folder, and never orchestrate from it.
- Never open a second item in a session holding a live one.
- Never treat this verb as an authority: it moves a dev-board item to In Progress and nothing
  else. PM-tree status is `/pm-next`/`/pm-done` territory, untouched here.
