---
name: pm-next
description: Pull the next piece of work — a PM-tree requirement (/pm-next AI4PM-21), an approved bring-up item (/pm-next bringup AI4DEV-33), or untracked work (/pm-next exploration). The ONLY authority for In Progress on the PM board. Claims it, creates and enters a dedicated worktree, binds it, hands over to /item-loop.
---

# /pm-next — pull the next piece of work

**One pull verb for every kind of work** (founder ruling 2026-08-01, implementing an
instruction from 2026-07-28 that was narrowed at the time rather than carried out:
*"there is a bring up item that can be set explicitly in next skill like exploration and used
exactly for this phase"*). Three forms:

| form | pulls | bucket | board |
|---|---|---|---|
| `/pm-next` or `/pm-next AI4PM-NN` | a product requirement | `task` | AI4GOOD-PM |
| `/pm-next bringup AI4DEV-NN` | an approved foundation item | `bringup` | AI4GOOD-DEV |
| `/pm-next exploration` | genuinely untracked work | `exploration` | none |

**What differs is ceremony, not shape.** All three end identically: a dedicated worktree, a
binding placed in it, and a hand-off to **`/item-loop`** — the founder's go-to verb and the
only build lifecycle. Only the requirement form carries the PM-tree ceremony (atomic claim,
durable pull record, manifest identity, race detection, dev-tree materialization), because
only requirements have acceptance suites and an evidence gate. **d87 still stands** — bring-up
items have no pull *ceremony*; they now have a pull *verb*.

`/pm-next` remains the ONLY authority for In Progress on the PM board. On the dev board it is
ergonomic packaging, as ever.

## Short ritual — `/pm-next bringup AI4DEV-NN` · `/pm-next exploration`

1. **Verify the target** (bringup only): `get_issue` — must be an AI4GOOD-DEV item, normally in
   the W0 Bring-up project. Refuse an AI4PM id here; that is the requirement form. For
   `exploration` there is no item and nothing to verify.
2. **Guard the folder.** `Read-Binding` — if THIS folder already holds a live binding, refuse
   and steer to a dedicated worktree. One item per folder, one item per session.
3. **Create the dedicated worktree** — `EnterWorktree` if available (it moves this session in),
   else `git worktree add -b <branch> ..\ai4good-<slug> origin/main`.
4. **`cd` INTO it — the session itself.** A subagent's working directory dies with the
   subagent, so a session that merely *ordered* a worktree is still in the old folder. Not
   theoretical: it cost AI4DEV-24 a hijacked binding and a run of mis-stamped messages.
5. **Bind it** — `Write-Binding` if entered, else `Write-BindingFor '<path>'`. Payload:
   `wave; project=<item or 'none'>; pmId=<AI4DEV-NN or 'none'>; bucket='bringup'|'exploration';
   sessionId=...`.
6. **Board** (bringup only): item → In Progress with a comment naming the slice — a plain
   Linear call; the dev board is working space, no pull record (d87).
7. **Print the WORKING-ON line** immediately, so the founder sees the change as it happens.
8. **Hand over:** invoke `/item-loop AI4DEV-NN`, and print the rename line
   (`/rename AI4DEV-NN · <short title>`, or `/rename exploration · <topic>`).

## Full ritual — a requirement (execute in order; stop and report on any failure; NO Linear write before step 5)

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
    `verify:` set, with blocked-by relations mapped to the sibling leaf issues. **Each leaf is
    then built by `/item-loop`** — one lifecycle for every kind of work. Cross-manifest
    blocked-by references go in the description, not as relations. (Leaves are then worked with
    `/dev-start` and `/dev-end`.)

11. **Release the lock; report — and offer the session rename.**
    - Dedicated worktree created but NOT entered → tell the founder: open a session in
      `<newpath>` — the binding is ALREADY placed there, so its start banner will show the
      requirement bound. Work it from that folder.
    - Pulled in the main checkout → note serial work here is fine; a dedicated worktree is only
      needed to run a SECOND requirement at the same time.
    - **Session rename (see "Naming a session" below):** end the report with the ready-to-paste
      line — `/rename REQ-0NN · <short requirement title>`. The agent CANNOT execute `/rename`
      (it is a user-typed built-in; there is no tool and no file to write), so print it, never
      claim to have done it.

## Naming a session (founder instruction, 2026-07-29)

Attribution answers "what is this work counted against". The session NAME answers "which of my
open windows is this" — a different question, and the session list is where the founder reads
it. Every verb that changes what a session is working on ends its report with the matching
rename line, in ONE scheme so the list sorts and scans:

| verb | rename line |
|---|---|
| `/pm-next` | `/rename REQ-0NN · <short requirement title>` |
| `/bind AI4PM-NN` | `/rename REQ-0NN · <short requirement title>` |
| `/bind bringup AI4DEV-NN` | `/rename AI4DEV-NN · <short item title>` |
| `/bind exploration` | `/rename exploration · <topic in 2-4 words>` |
| `/bind clear` | (no rename — nothing to name it after) |
| `/dev-start` | `/rename REQ-0NN <leaf> · <short leaf title>` |

**The agent cannot run `/rename`.** It is a built-in the founder types; no tool exposes it and
no file stores the name. Print the line and stop — never report a rename as done.

## Worktree way of work (same model the product's volunteer Skill uses)

- **Binding follows the FOLDER, not the session.** Every message's attribution stamp reads this
  folder's binding file; two sessions in one folder share one binding and corrupt each other's
  stamps. Therefore: **one live session per worktree, one pulled requirement per worktree.**
- **Two layers, not either/or.** The worktree isolates the FOLDER (so attribution is clean);
  the leaf branches inside it isolate the CODE (so the dev-tree state transitions fire on
  PR-open / merge). You use both.
- **`/pm-next` locks a folder; `/pm-done` frees it.** `/pm-next`'s guard refuses a second pull
  into a bound folder and steers you to a fresh worktree; `/pm-done` clears the binding on
  completion, runs a clean-tree check, and offers to remove a dedicated worktree.
  One-live-requirement-per-folder, enforced from both ends.
- **Attribution degrades, never blocks:** a wrong or missing binding mis-buckets data
  (unattributed); it never gates work. The discipline exists to keep the DATA honest.

## Never
- Never mark In Progress outside this ritual. Never overwrite a live task binding (step 2).
  Never create the worktree before the claim is secured (step 8, not earlier). Never bind the
  ORCHESTRATING folder for a dedicated worktree — use `Write-BindingFor` so the binding lands in
  the working folder. Never materialize before the pull record exists.
