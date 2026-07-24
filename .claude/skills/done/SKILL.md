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
4. **Evidence gate — all three, in this order:**
   a. **Dev tree closed:** every materialized AI4GOOD-DEV item for this requirement is Done or
      Cancelled (`list_issues` check). An open leaf is a NAMED gate failure.
   b. **Acceptance suite green:** run the manifest's verify command at integration tier and
      capture the summary. Until the AT harness (AI4DEV-3) exists this gate FAILS CLOSED —
      /done cannot pass, by design; say so plainly.
   c. **Founder attestation:** ask the founder explicitly to attest completion of THIS
      requirement in this session; record their exact words. No attestation → STOP.
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
- Never Done without 4a+4b+4c. Never over a dirty tree (step 3). Never reorder (Done before
  evidence). Never close dev items from here — dev leaves close on merge (vendor-native) or
  their own management. Never remove a worktree or pull next automatically (step 9 is a
  suggestion).
