---
name: next
description: Pull the next PM-tree requirement (or a named one, e.g. /next AI4PM-21) — the ONLY authority for In Progress on the PM board. Atomic claim + pull record + binding + lazy dev-tree materialization, per the adopted way-of-work.
---

# /next — pull a requirement (PM board, AI4GOOD-PM)

**Only requirement items are pullable.** Bring-up and design-batch items (AI4GOOD-DEV) are
managed with plain Linear calls, never these verbs (d87).

## Ritual (execute in order; stop and report on any failure)

1. **Lock.** `powershell -File loop/work/work-lib.ps1`-dot-sourced: `Acquire-WorkLock`. If not
   ok → report the holder and STOP (one verb at a time, machine-wide).
2. **Choose.** If the founder named an item, use it. Otherwise list AI4GOOD-PM Backlog items
   whose blockers are all Done and propose the highest-value candidate — the founder confirms
   before any write (suggestive, never auto).
3. **Freshness-read** the chosen issue (`get_issue`): must be Backlog, unassigned, blockers all
   Done. Any surprise → release the lock, report, STOP.
4. **Claim.** `save_issue`: assignee "me", state "In Progress".
5. **Pull record** (the durable claim — a comment on the issue) containing: the issue's
   gitBranchName, base commit (`git rev-parse HEAD`), the manifest identity from
   `Get-ManifestIdentity <req>` (revision + digest), a fresh op UUID (`[guid]::NewGuid()`),
   the worktree id (`Get-WorktreeId`), and the session id.
6. **Re-read** the issue's comments: if another pull-record comment with a DIFFERENT op UUID
   precedes ours → we lost the race: revert state to Backlog, unassign, release the lock,
   report, STOP.
7. **Bind.** `Write-Binding @{ wave=...; project='REQ-0NN'; pmId='AI4PM-NN'; issueId=<uuid>;
   bucket='task'; opUuid=...; manifestRevision=...; sessionId=... }`.
8. **Materialize the dev tree** (idempotent): run
   `powershell -File loop/work/materialize.ps1 -Req 0NN` → for each parent not already on
   AI4GOOD-DEV (check by exact title with `list_issues`): create the parent (relatedTo the PM
   item), then each leaf as a sub-issue (parentId), description = summary + `verify:` set,
   with blocked-by relations mapped to the sibling leaf issues named in the manifest.
   Cross-manifest blocked-by references are recorded in the description, not as relations.
9. **Release the lock.** Report the session banner: item, branch name, manifest revision,
   dev items created vs found existing.

## Never
- Never mark In Progress outside this ritual. Never pull with a dirty claim (step 6 losers
  back off). Never materialize before the pull record exists.
