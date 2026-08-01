---
name: dev-start
description: INTERNAL — phase 0 of /item-loop, invoked BY the loop, not typed by the founder. Opens an item for work; the founder's entry points are /pm-next (to pull) and /item-loop (to build).
---

# /dev-start [item] — INTERNAL: the loop's phase 0

**Not a founder-facing verb (founder ruling 2026-08-01).** The founder types **`/pm-next`** to
pull work and **`/item-loop`** to build it — that is the whole surface. `/item-loop` calls this
skill as its phase 0; nobody else should. It survives as a named skill so the loop has one
place to change how an item is opened, not so there is a second way to start work.

**Rewritten 2026-07-31 (AI4DEV-32).** One lifecycle exists: `/item-loop`. This is its
HOUSEKEEPING PHASE. It decides nothing the loop does not decide, and starts no work the loop
does not then govern. It works identically for a PM-requirement leaf (bound `task` by the
pull), a foundation item (`bringup`), or exploration.

**If a founder types it directly:** do the work anyway — nothing is blocked — but say plainly
that `/pm-next` and `/item-loop` are the two entry points, so the surface stays two verbs wide.

## Ritual

1. **Verify the skill checkout is current** — `git fetch` + confirm the worktree serving
   `.claude/skills/` is at `origin/main`. A stale checkout serves superseded rules; it has
   happened and it cost a real under-run.
2. **One session, one item.** If this session already holds an item (a live binding in its
   worktree), STOP — finish or explicitly abandon it first. The merge tail's clear-path step
   (`Clear-ItemState`) is what frees a session for the next item. Note this bounds the
   SESSION, not the phase: sibling items of the same phase run happily in parallel sessions.
3. **This verb OWNS the worktree** (founder ruling 2026-08-01: *"best dev items, since this
   way I can build multiple in parallel"*). `/pm-next` creates none — a phase is information,
   not a folder — so every worktree in the system is created here, one per dev item:
   `git worktree add ../ai4good-<slug> -b <branch> origin/main`. That is what lets thirteen
   sub-items of one phase build concurrently instead of queueing behind one folder. Never the
   shared main folder: bindings are per-worktree and a shared folder means sessions overwrite
   each other's (observed, not hypothetical). **Then `cd` into it — the session itself, not
   just the executor.** If a subagent created the worktree, its working directory died with
   it; the orchestrator is still in the old folder until it moves. **Print the WORKING-ON line
   immediately after the move**, so the founder sees the change when it happens rather than a
   reply later.
4. **Bind it — both tiers, with titles.** Read the item AND its parent from Linear
   (`get_issue`), then one `Write-Binding`:
   - *pull fields, inherited from the parent* — `pmId` (the AI4PM requirement, or the bring-up
     parent; the item itself when it has no parent), `pmTitle`, `bucket` (`task` under a
     requirement, else `bringup`), `wave`.
   - *item fields* — `devId`, `devTitle`.
   Inheriting from the board rather than from a pull-time file is what keeps parallel
   worktrees consistent with no shared state to race on. **Titles are not decoration:** the
   stamp hook prints them beside every id because bare numbers are unmemorable (founder
   instruction 2026-08-01), and the hook must never call Linear itself.
   If no PM requirement applies, the hook will demand the PM question be put to the dev once —
   answer it and record with `Set-PmAck`.
5. **Board:** item → In Progress with a comment naming the slice (plain Linear MCP call — the
   dev board is working space, no ceremony).
6. **Hand over:** invoke `/item-loop AI4DEV-NN`. From here the loop governs everything —
   brief, gates, verification, merge tail. This verb is done.

## Never
- Never start work in the shared main folder, and never orchestrate from it.
- Never open a second item in a session holding a live one.
- Never treat this verb as an authority: it moves a dev-board item to In Progress and nothing
  else. PM-tree status is `/pm-next`/`/pm-done` territory, untouched here.
