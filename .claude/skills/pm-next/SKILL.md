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
| `/pm-next bringup AI4DEV-NN` | a bring-up **PHASE** (a parent) | `bringup` | AI4GOOD-DEV |
| `/pm-next exploration` | genuinely untracked work | `exploration` | none |

**A pull brackets a PHASE; the loop builds ONE ITEM inside it** (founder correction
2026-08-01). `/pm-next bringup` takes the **parent** — e.g. AI4DEV-3, which spans thirteen
sub-items — exactly as a requirement pull spans its whole dev tree. The individual dev items
are never named here. If the named item has no sub-items, the pull simply brackets that one.

**Worktrees belong to ITEMS, not to pulls** (founder ruling 2026-08-01: *"best dev items,
since this way I can build multiple in parallel"*). This verb creates **no worktree and no
branch** — it enters a phase, which is information, not a folder. `/item-loop AI4DEV-NN`
creates a dedicated worktree per dev item, so N sub-items of one phase build concurrently in
N sessions. An earlier draft had the pull own one worktree, which would have forced a
thirteen-item phase to run strictly sequentially for no reason.

**But this verb exists FOR attribution, and bindings are keyed to the FOLDER — so a pull with
no worktree of its own has a collision to answer for** (founder, 2026-08-01). It is answered
by making the phase binding *attribution-only*:

- It writes a **phase binding into the current folder** — pull fields only (`pmId`, `pmTitle`,
  `bucket`, `wave`), never a `devId` — so the session that enters a phase and plans in it is
  honestly stamped instead of reading `unattributed`.
- **Nothing reads it for correctness.** Each item worktree's binding is written by the loop
  and inherits the pull's fields by walking the item's PARENT on the board — never by copying
  this file. So parallel item worktrees share a phase with no shared mutable state, and a
  clobbered phase binding costs a wrong *stamp* in one session, never wrong *work*.
- **Guard, loudly.** `Read-Binding` first: if this folder already holds a live phase binding
  for a DIFFERENT phase, refuse, name the holder, and steer to another session/folder. Silent
  overwrite is the failure mode that cost AI4DEV-24 a run of mis-stamped messages.

The residual weakness is unchanged and known: two SESSIONS in one folder still share one
binding file, because the key is the folder. Session-keyed bindings would close that class
outright — filed as AI4DEV-34 — Bindings are keyed to the folder, so two sessions in one
folder share one binding; not fixed here.

**What differs is ceremony, not shape.** All three end identically: a dedicated worktree, a
binding placed in it, and a hand-off to **`/item-loop`** — the founder's go-to verb and the
only build lifecycle. Only the requirement form carries the PM-tree ceremony (atomic claim,
durable pull record, manifest identity, race detection, dev-tree materialization), because
only requirements have acceptance suites and an evidence gate. **d87 still stands** — bring-up
items have no pull *ceremony*; they now have a pull *verb*.

`/pm-next` remains the ONLY authority for In Progress on the PM board. On the dev board it is
ergonomic packaging, as ever.

## Short ritual — `/pm-next bringup AI4DEV-NN` · `/pm-next exploration`

Four steps, no filesystem side effects. Entering a phase is a board act, not a code act.

Five steps, no filesystem side effects beyond the phase binding. Entering a phase is a board
act, not a code act.

1. **Verify the target** (bringup only): `get_issue` — must be an AI4GOOD-DEV item, normally in
   the W0 Bring-up project. Prefer a PARENT (the phase); a childless item is a one-item phase
   and is fine. Refuse an AI4PM id here; that is the requirement form. For `exploration` there
   is no item and nothing to verify.
2. **Guard, then bind the phase into this folder.** `Read-Binding` — a live binding for a
   different phase means REFUSE and name the holder, never overwrite. Otherwise `Write-Binding`
   with pull fields only: `wave`, `project`, `pmId=<AI4DEV-NN or 'none'>`, `pmTitle=<its
   title>`, `bucket='bringup'|'exploration'`, `sessionId`. **No `devId`** — items belong to
   the loop.
3. **Board** (bringup only): the phase item → In Progress with a comment naming what the phase
   covers — a plain Linear call; the dev board is working space, no pull record (d87).
4. **Print the WORKING-ON line** immediately, so the founder sees the change as it happens.
5. **Report the phase and its open sub-items, each with its TITLE** — bare ids are unmemorable
   (founder instruction 2026-08-01). That list is the menu: the founder picks one and runs
   `/item-loop AI4DEV-NN`, which creates the worktree, branch and item binding. Several may
   run at once in separate sessions, one worktree each. End with the rename line for whichever
   session stays here (`/rename AI4DEV-NN · <short title>`, or `/rename exploration · <topic>`).

**`exploration`** has no board item and no phase — it binds the current folder as
`bucket='exploration'` so untracked poking is honestly labelled where it happens, and creates
no worktree. Exploration that grows into real work becomes a dev item and goes through the
loop like everything else.

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
