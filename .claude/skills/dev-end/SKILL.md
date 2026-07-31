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
7. **Clear the path (founder ruling: one session, one item).** Run `Clear-ItemState`
   (loop/work/work-lib.ps1) — drops this worktree's binding AND its PM acknowledgment, so the
   next item starts unbound and the PM question fires again exactly once. Remove the item
   worktree once nothing needs it. Then suggest the next item — suggestively, never
   auto-starting it.

## Never
- **Never assume verification.** The independent re-run is a checklist box precisely because
  the agent claiming green is the one being checked.
- Never merge without the written ruling and the SHA-pinned authorization; never merge at all
  in interim mode without the founder's word.
- Never touch the PM item — `/pm-done` is the only authority there.
- Never leave the binding in place after the merge: a stale binding mis-attributes the next
  item's work (observed, not hypothetical).
