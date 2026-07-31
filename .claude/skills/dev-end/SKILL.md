---
name: dev-end
description: Close one board item — the back door of /item-loop, running its merge tail. Independent audit, merge ruling, SHA-pinned merge, post-merge check, parent reconcile, then clear the path for the next item. Verification is NEVER assumed.
---

# /dev-end [item] — close an item (the loop's merge tail)

**Rewritten 2026-07-31 (founder ruling, AI4DEV-32).** The previous version of this verb said
verification was "assumed, not re-run" and that the founder self-merges. Both contradicted
`/item-loop`, and the weaker path would have let unreviewed work land while the way of work
appeared followed. This verb is now the loop's MERGE TAIL with a convenient name — the same
steps, the same evidence bar, nothing assumed.

## Ritual (any failure → report the named failure and STOP)

1. **Pre-merge audit — a fresh-context subagent, never the executor.** Independently re-runs
   the full verification and gathers every checklist box's evidence. Independence from the
   agent claiming green is the point; "the implement loop already passed" is a claim, not
   evidence. It reports; it rules on nothing.
2. **Merge ruling — the orchestrator, never delegated.** All ten `/item-loop` checklist boxes,
   ruled in writing (`merge-decision.md` in the item folder), pinned to the head SHA.
3. **Publish + authorize + merge.** PR with the ruling's text; a SHA-pinned single-use merge
   authorization posted as a PR comment; execution by a hands-only subagent that stops on any
   surprise. INTERIM MODE: while autonomous merge is off, stop at "ready to merge" + a founder
   ping; the founder's word executes the same pinned mandate.
4. **The merge flips the item → Done** (the GitHub↔Linear integration) — this verb never fakes
   a state the merge should produce.
5. **Post-merge verification against merged main** — the full suite in a clean checkout, raw
   output posted to the item. A regression here is the most important possible finding; report
   it, never patch it quietly.
6. **Reconcile the parent (Linear MCP).** If the item's parent now has all sub-issues
   Done/Cancelled, `save_issue` the parent → Done — Linear does not auto-close parents.
7. **Retire this ITEM's worktree — and only this one** (founder correction 2026-08-01). The
   loop calls this verb **once per dev item**: at the end of that item's run, inside that
   item's own worktree, which `/dev-start` created for it. Worktrees belong to items, so
   retiring one is local and safe — `Clear-ItemState` (loop/work/work-lib.ps1) drops this
   worktree's binding and PM acknowledgment together, then remove the worktree once nothing
   needs it.
   **What this step must NOT do is end the PHASE.** A bring-up parent like AI4DEV-3 spans
   thirteen sub-items and a requirement spans its whole dev tree; sibling items may be
   building *right now* in their own worktrees and are untouched by any of this. A phase is
   not a folder and needs no cleanup: it ends on the board when its parent goes Done (step 6),
   or through `/pm-done` for a requirement, which owns the evidence gate.
8. **Close by reporting the phase.** List its still-open sub-items **with their titles** —
   bare ids are unmemorable (founder instruction 2026-08-01) — and suggest the next
   `/item-loop AI4DEV-NN`, noting that several can be taken in parallel. Suggestive, never
   auto-starting.

## When the loop calls this

Once per item, as the loop's final phase — after verification, before the session goes idle.
It is invoked BY `/item-loop`, never typed by the founder, whose surface is `/pm-next` to
enter a phase and `/item-loop` to build one item in it.

## Never
- **Never assume verification.** The independent re-run is a checklist box precisely because
  the agent claiming green is the one being checked.
- Never merge without the written ruling and the SHA-pinned authorization; never merge at all
  in interim mode without the founder's word.
- Never touch the PM item — `/pm-done` is the only authority there.
- **Never treat closing an item as closing its phase** — do not clear a sibling's binding, do
  not remove a sibling's worktree, do not mark a parent Done that still has open sub-items.
- Never leave this worktree's binding live after its merge: a stale binding mis-attributes
  whatever the folder is used for next (observed, not hypothetical).
