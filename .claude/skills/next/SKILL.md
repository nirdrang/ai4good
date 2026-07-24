---
name: next
description: Pull the next PM-tree requirement (or a named one, e.g. /next AI4PM-21) — the ONLY authority for In Progress on the PM board. Asks about a dedicated worktree up front, then atomic claim + pull record + binding + lazy dev-tree materialization, per the adopted way-of-work.
---

# /next — pull a requirement (PM board, AI4GOOD-PM)

**Only requirement items are pullable.** Bring-up and design-batch items (AI4GOOD-DEV) are
managed with plain Linear calls, never these verbs (d87).

## Ritual (execute in order; stop and report on any failure; NO Linear write before step 5)

1. **Pick the candidate.** If the founder named an item, use it. Otherwise list AI4GOOD-PM
   Backlog items whose blockers are all Done and propose the highest-value one; the founder
   confirms. No writes yet — this just names the target so later steps can label the
   worktree/branch and fetch the item's `gitBranchName`.

2. **Ask worktree placement — a question at the START (AskUserQuestion).** Because the binding
   file is keyed to the FOLDER, deciding now puts it in the right place from the first message.
   Ask: "Work `<AI4PM-NN>` in a **dedicated worktree (recommended)** — its attribution binding
   lives in its own folder, isolated from anything else — or **here in the current folder**?"
   - If **current folder**: run the **binding guard** now — `Read-Binding`; if THIS folder
     already holds an active `task` binding, REFUSE (never overwrite) and steer to the
     dedicated-worktree path instead. One pulled requirement per folder.
   - If **dedicated worktree**: no guard needed — a fresh folder gets created in step 8.

3. **Lock.** dot-source `loop/work/work-lib.ps1` → `Acquire-WorkLock`. Not ok → report the
   holder and STOP (one verb at a time, machine-wide).

4. **Freshness-read** the chosen issue (`get_issue`): must be Backlog, unassigned, blockers all
   Done. Any surprise → release the lock, report, STOP.

5. **Claim.** `save_issue`: assignee "me", state "In Progress".

6. **Pull record** (the durable claim — a comment on the issue): the issue's gitBranchName,
   base commit (`git rev-parse HEAD`), the manifest identity from `Get-ManifestIdentity <req>`
   (revision + digest), a fresh op UUID (`[guid]::NewGuid()`), the WORKING worktree's id, and
   the session id.

7. **Re-read** the issue's comments: if a pull-record with a DIFFERENT op UUID precedes ours →
   we lost the race: revert state to Backlog, unassign, release the lock, report, STOP.

8. **Create the dedicated worktree — only if chosen, and only NOW** (the claim is secured, so an
   earlier abort never leaves an orphan folder):
   - Prefer Claude Code's **`EnterWorktree`** — it moves THIS session into a fresh worktree, so
     the working folder becomes the worktree and step 9 uses `Write-Binding` normally.
   - Otherwise: `git worktree add -b <gitBranchName> ..\ai4good-<AI4PM-NN> HEAD` (redirect git's
     stderr — it writes progress there, and work-lib runs under `Stop`). The working folder is
     that new path; step 9 uses `Write-BindingFor`.

9. **Bind — into the WORKING folder** (the reason this whole flow exists — the binding must land
   where the work will happen):
   - current folder, or an *entered* worktree → `Write-Binding @{...}`.
   - a git-created dedicated worktree (not entered) → `Write-BindingFor '<newpath>' @{...}` so
     the binding lands in that folder's own file, where a session opened there will read it.
   Payload: `wave; project='REQ-0NN'; pmId='AI4PM-NN'; issueId=<uuid>; bucket='task';
   opUuid=...; manifestRevision=...; sessionId=...`.

10. **Materialize the dev tree** (idempotent): `powershell -File loop/work/materialize.ps1 -Req
    0NN` → for each parent not already on AI4GOOD-DEV (check by exact title): create the parent
    (relatedTo the PM item), then each leaf as a sub-issue (parentId), description = summary +
    `verify:` set, with blocked-by relations mapped to the sibling leaf issues. Cross-manifest
    blocked-by references go in the description, not as relations.

11. **Release the lock; report.**
    - Dedicated worktree created but NOT entered → tell the founder: open a session in
      `<newpath>` — the binding is ALREADY placed there, so its start banner will show the
      requirement bound. Work it from that folder.
    - Pulled in the main checkout → note serial work here is fine; a dedicated worktree is only
      needed to run a SECOND requirement at the same time.

## Worktree way of work (same model the product's volunteer Skill uses)

- **Binding follows the FOLDER, not the session.** Every message's attribution stamp reads this
  folder's binding file; two sessions in one folder share one binding and corrupt each other's
  stamps. Therefore: **one live session per worktree, one pulled requirement per worktree.**
- **Two layers, not either/or.** The worktree isolates the FOLDER (so attribution is clean);
  the leaf branches inside it isolate the CODE (so the dev-tree state transitions fire on
  PR-open / merge). You use both.
- **`/next` locks a folder; `/done` frees it.** `/next`'s guard refuses a second pull into a
  bound folder and steers you to a fresh worktree; `/done` clears the binding on completion,
  runs a clean-tree check, and offers to remove a dedicated worktree. One-live-requirement-
  per-folder, enforced from both ends.
- **Attribution degrades, never blocks:** a wrong or missing binding mis-buckets data
  (unattributed); it never gates work. The discipline exists to keep the DATA honest.

## Never
- Never mark In Progress outside this ritual. Never overwrite a live task binding (step 2).
  Never create the worktree before the claim is secured (step 8, not earlier). Never bind the
  ORCHESTRATING folder for a dedicated worktree — use `Write-BindingFor` so the binding lands in
  the working folder. Never materialize before the pull record exists.
