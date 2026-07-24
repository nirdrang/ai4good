---
name: next
description: Pull the next PM-tree requirement (or a named one, e.g. /next AI4PM-21) — the ONLY authority for In Progress on the PM board. Atomic claim + pull record + binding + lazy dev-tree materialization, per the adopted way-of-work.
---

# /next — pull a requirement (PM board, AI4GOOD-PM)

**Only requirement items are pullable.** Bring-up and design-batch items (AI4GOOD-DEV) are
managed with plain Linear calls, never these verbs (d87).

## Ritual (execute in order; stop and report on any failure)

1. **Worktree guard — refuse, then hand over the parallel command.** `Read-Binding` first: if
   THIS worktree already holds an active `task` binding, REFUSE (never overwrite a live
   binding) — one pulled requirement per worktree. Then present the options in this order:
   - **To work the new requirement in parallel (the recommended path): a fresh worktree.**
     Don't just name it — give the exact, ready-to-paste command, filled with the candidate's
     Linear branch name (fetch it with `get_issue` if the item was named). Concretely:
     ```
     git worktree add -b <gitBranchName> ..\ai4good-<AI4PM-NN> HEAD
     cd ..\ai4good-<AI4PM-NN>
     # open a NEW session in this folder, then: /next <AI4PM-NN>
     ```
     (Claude Code's own worktree support — `EnterWorktree`, or the Agent tool's
     `isolation:"worktree"` — is the tool-native equivalent; offer whichever fits.) A fresh
     folder means a fresh, independent binding: no attribution collision with the requirement
     bound here.
   - **To switch what THIS folder is doing instead:** finish it (`/done`) or release it
     deliberately (`/override` to revert the claim, then `/bind clear`).
   Recommend the worktree first — parallelism is the common reason to hit this guard, and the
   whole point of the discipline is that a second requirement gets its own folder.
2. **Lock.** `powershell -File loop/work/work-lib.ps1`-dot-sourced: `Acquire-WorkLock`. If not
   ok → report the holder and STOP (one verb at a time, machine-wide).
3. **Choose.** If the founder named an item, use it. Otherwise list AI4GOOD-PM Backlog items
   whose blockers are all Done and propose the highest-value candidate — the founder confirms
   before any write (suggestive, never auto).
4. **Freshness-read** the chosen issue (`get_issue`): must be Backlog, unassigned, blockers all
   Done. Any surprise → release the lock, report, STOP.
5. **Claim.** `save_issue`: assignee "me", state "In Progress".
6. **Pull record** (the durable claim — a comment on the issue) containing: the issue's
   gitBranchName, base commit (`git rev-parse HEAD`), the manifest identity from
   `Get-ManifestIdentity <req>` (revision + digest), a fresh op UUID (`[guid]::NewGuid()`),
   the worktree id (`Get-WorktreeId`), and the session id.
7. **Re-read** the issue's comments: if another pull-record comment with a DIFFERENT op UUID
   precedes ours → we lost the race: revert state to Backlog, unassign, release the lock,
   report, STOP.
8. **Bind.** `Write-Binding @{ wave=...; project='REQ-0NN'; pmId='AI4PM-NN'; issueId=<uuid>;
   bucket='task'; opUuid=...; manifestRevision=...; sessionId=... }`.
9. **Materialize the dev tree** (idempotent): run
   `powershell -File loop/work/materialize.ps1 -Req 0NN` → for each parent not already on
   AI4GOOD-DEV (check by exact title with `list_issues`): create the parent (relatedTo the PM
   item), then each leaf as a sub-issue (parentId), description = summary + `verify:` set,
   with blocked-by relations mapped to the sibling leaf issues named in the manifest.
   Cross-manifest blocked-by references are recorded in the description, not as relations.
10. **Release the lock.** Report the session banner: item, branch name, manifest revision,
    dev items created vs found existing. If this pull happened in the MAIN checkout, note that
    serial work here is fine — a dedicated worktree is only needed to run a SECOND requirement
    at the same time (the guard will offer it then).

## Worktree way of work (the discipline this verb enforces — same model the product's volunteer Skill uses)

- **Binding follows the FOLDER, not the session.** Every message's attribution stamp reads
  this worktree's binding file; two sessions in one folder share one binding and corrupt each
  other's stamps. Therefore: **one live session per worktree, one pulled requirement per
  worktree** — step 1 refuses a second pull into a bound folder.
- **Parallel work = parallel worktrees.** A second folder with its own independent binding;
  open the second session THERE, and each worktree pulls its own requirement and stamps it
  correctly, in isolation. The guard (step 1) hands over the exact command at the moment you
  hit it. Inside a requirement's worktree, leaf branches happen as normal — the worktree
  isolates the FOLDER (for attribution); the branches isolate the CODE (for the dev-tree
  state transitions). Both layers, not either/or.
- **`/done` frees the folder; the guard locks it.** `/next` refuses a second pull into a bound
  folder; `/done` clears the binding when the requirement completes and offers to remove a
  dedicated worktree. Together they enforce one-live-requirement-per-folder from both ends.
- **The session banner is the tripwire:** if it warns the binding was written by a different
  session, stop and decide — adopt (`/bind AI4PM-NN`) or clear — before doing work.
- **Attribution degrades, never blocks:** a wrong or missing binding mis-buckets data
  (unattributed), it never gates work. The discipline exists to keep the DATA honest.

## Never
- Never mark In Progress outside this ritual. Never overwrite a live task binding (step 1).
  Never pull with a dirty claim (step 7 losers back off). Never materialize before the pull
  record exists.
