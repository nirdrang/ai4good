---
name: done
description: Complete the currently bound PM-tree requirement — the ONLY authority for Done on the PM board. Evidence gate (dev items closed + full AT suite green at integration tier) + founder attestation, then the completion record, then Done LAST.
---

# /done — complete the bound requirement (PM board)

## Ritual (execute in order; ANY gate failure → report the named failure and STOP — /done never partially applies)

1. **Lock.** `Acquire-WorkLock` (loop/work/work-lib.ps1). Not ok → report holder, STOP.
2. **Binding check.** `Read-Binding` must name the target item (bucket `task`). No binding or
   a different item → STOP (bind first; /done acts only on the pulled requirement). This is the
   worktree-scoping guarantee: `/done` reads only THIS worktree's binding, so it can only
   complete the requirement pulled in the folder you run it from.
3. **Clean-tree guard.** `git status --porcelain` MUST be empty. Uncommitted or untracked work
   in this worktree → STOP: "commit, stash, or discard before completing — a requirement is not
   done with work still loose in the tree." (No point attesting completion over a dirty tree.)
4. **Evidence gate — in this order:**
   a. **Reconcile deliverable parents (Linear MCP — this is how we overcome Linear's
      no-auto-close-parent).** For each deliverable parent of this requirement, list its
      sub-issues; if EVERY sub-issue is Done or Cancelled, `save_issue` the parent → Done.
      This is a dev-board close (vendor-native tier, revert-exempt), never a PM verb. Idempotent
      and bidirectional: if a parent is Done but a manifest re-sync added an unfinished child,
      reopen it. After this, a still-open parent means a genuinely open leaf, not housekeeping.
   b. **Dev tree closed:** every materialized AI4GOOD-DEV item for this requirement (parents
      included, now reconciled) is Done or Cancelled (`list_issues` check). An open leaf is a
      NAMED gate failure.
   c. **Acceptance suite green:** run the manifest's verify command at integration tier and
      capture the summary. Until the AT harness (AI4DEV-3) exists this gate FAILS CLOSED —
      /done cannot pass, by design; say so plainly.
   d. **Founder attestation:** ask the founder explicitly to attest completion of THIS
      requirement in this session; record their exact words. No attestation → STOP.

   *(The same reconcile is worth running opportunistically in the coding loop — right after a
   leaf merges, close its parent if the siblings are all done — so the dev board reads true
   mid-build. `/done` runs it as the guaranteed final sweep regardless.)*
5. **Completion comment** on the PM item: test-run summary, the dev-item list, the pull
   record's op UUID it closes, the attestation quote, a fresh completion op UUID.
6. **Attachment:** link the merged work / test output (where one exists).
7. **State Done — LAST**, after all evidence is durably on the item.
8. **Unbind** (`Clear-Binding`), release the lock, report.
9. **Suggest, once (never auto-execute):** this worktree is now free (its binding is cleared),
   so — (a) if it is a DEDICATED parallel worktree (not the main checkout), offer to remove it:
   `git worktree remove <this path>`; and (b) offer to pull the next requirement here (`/next`).
   Propose both; do neither without the founder's word.

## Never
- Never Done (PM) without 4b+4c+4d. Never over a dirty tree (step 3). Never reorder (Done before
  evidence). Never close a dev LEAF from here — leaves close on merge (vendor-native) or their
  own management; step 4a closes only PARENT deliverables whose leaves are already all closed.
  Never remove a worktree or pull next automatically (step 9 is a suggestion).
