---
name: controller
description: Workflow v2 entry verb. Pick up one board item, write its brief, move this session into the item's worktree and hand it to the founder, who runs /pstack:poteto-mode in the same session. The lead merges; /controller done steers the board afterwards. /controller alone recommends and waits. This is the CONTROLLER's manual, a trimmed /work. The mechanic follows the pstack skills.
---

# The controller's manual: `/controller`

`/controller` · `/controller AI4DEV-19` · `/controller AI4DEV-19 cloud` · `/controller AI4PM-12` · `/controller done AI4DEV-19`

You are reading the controller manual for workflow v2. The way of work it serves is
`pstack-workflow-ai4good.md` in `.claude/skills/work/`. Read `shared-invariants.md` in the same
folder first. It binds you. `/work` remains the v1 manual and its relay is the fallback.

## What you are

You own the board, the founder channel, the item branch, the brief, the local gate, and the
merge. You own no judgment about the item's content. The mechanic, the lead running
poteto-mode, owns everything between the brief and the pull request.

**The mechanic runs in THIS session, after you.** You finish the brief, move the session into
the item's worktree, and stop. The founder then runs `/pstack:poteto-mode` here and talks to
the lead directly (founder ruling 2026-08-29: "i dont like it that i cant interact with the
lead. i want to run the controller it finshed with the brief and them i run the pstack poteto
mode on that session"). Never spawn the mechanic as a subagent.

You never check out an item branch in the main folder. The branch guard refuses it. The item
branch lives in a linked worktree under `.claude/worktrees/`, and the session moves into that
worktree with `EnterWorktree` and back out with `ExitWorktree`. That move is the one exception
to "a session works where it was launched", and it exists only for this hand-off.

## Phase A: decide what

| you type | what happens |
|---|---|
| `/controller AI4DEV-19` | a LEAF. Start it (phase B), end inside the item's worktree, and hand the session to the founder for `/pstack:poteto-mode`. |
| `/controller AI4DEV-19 cloud` | the same, but the mechanic is a cloud session started with `claude --cloud`. The session stays in the main folder. |
| `/controller done AI4DEV-19` | the lead merged. Steer the board: confirm Done, clear the held item, fold upward, judge the filing candidates (phase C). The lead invokes this itself as its last closing step. |
| `/controller AI4DEV-3` | a PARENT. List the open children with short labels and blockers, say "N of M done", recommend one, wait. |
| `/controller AI4PM-12` | a requirement. Apply the requirement states below. |
| `/controller` | recommend and wait: In Progress first, then open leaves, then a new requirement. Top three, one-line reasons, wait. |

A dev item with children is a container, not work. Check for children before you treat an id as
buildable. One item per run. Batching is not part of v2 until the founder rules on stacks.

Requirement states: no decomposition file → propose writing `loop/decomp/req-0NN.md` as the
work. Merged but unclaimed → materialise the dev tree as `/work` describes it (section
"Materialisation" and "TITLES" in `.claude/skills/work/SKILL.md`), list the leaves, wait. Open
leaves → list, recommend, wait. All leaves closed → run the evidence gate and propose. Done →
say so.

## Phase B: start an item

Validate first. The board claim comes after the branch, so a failure cannot leave an item
falsely In Progress.

1. Resolve the item: id, short label, `gitBranchName`, state, blockers. Walk `parent` upward
   (depth cap 8, cycle detection) and derive a short label for every link.
2. Startability: missing, Done, Cancelled, or an open blocker → stop and say which.
3. If the chain's root has nothing above it, ask once, at pickup, about the root. Offer ranked
   suggestions and always offer "standalone". If the board is unreadable, print
   `CHAIN UNRESOLVED` and carry on.
4. Branch. Take `gitBranchName` verbatim and check that it tokenises to exactly this item.
   Then `git fetch origin` and `git branch <branch> origin/main`. Never from local `main`.
5. Worktree. `git worktree add .claude/worktrees/<item> <branch>`. The item's files live here
   and nowhere else. The path is under `.claude/worktrees/` because `EnterWorktree` accepts
   only that location for later switches.
6. One item at a time on this machine. The local database is one instance: the project
   settings set `AT_DB_SLOT=1`, and there is no slot pool in v2 (founder 2026-08-29: "Clear
   the dB slot mechanism all together"). Parallel items run as cloud sessions, each on its own
   VM with its own database. If another item is already open on this PC, stop and say which.
7. Claim: assign the item, set In Progress. Then `Set-HeldItem '<id>' '<label>' 'main'
   '<your session id>'` so your own stamp, when it is live, names the item.
8. Brief. Write `loop/items/<item>/brief.md` in the worktree from the template below, commit
   it on the branch with a message that cites the item, and push.
9. Hand over. Two ways:

   **Local, the default.** Move this session into the worktree:
   `EnterWorktree(path: ".claude/worktrees/<item>")`. Print the transition line: item, branch,
   the worktree path. Then print exactly this and stop:

   > The brief is on the branch. Type
   > `/pstack:poteto-mode Read loop/items/<item>/brief.md and follow it.`
   > The lead merges when CI is green and you say "merge", then hands the board back to
   > `/controller done`.

   The founder runs the mechanic here and talks to it directly. You have no further part in
   the item.

   **Cloud, on `/controller <id> cloud`.** Stay in the main folder. From the worktree:

   ```powershell
   Set-Location .claude/worktrees/<item>
   claude --cloud "Read loop/items/<item>/brief.md and follow it."
   ```

   The cloud session clones the remote at the worktree's branch, so the push must land before
   the command runs. The command names the session: a `session_...` id and a
   `claude.ai/code/...` link. Record both in `loop/items/<item>/mechanic.md`, commit it to the
   branch, and push. The founder talks to it on claude.ai or in the mobile app. If the launch
   fails, print the exact command and ask the founder to run it. Do not retry silently.

## The brief

The brief is item facts plus the ask. It carries no process text. Process lives in the pstack
skills and in `pstack-workflow-ai4good.md`, which the mechanic reads from the branch.

```markdown
# Brief for <id> (<short label>)

Chain: <root id (label)> > ... > <id (label)>
Branch: <branch>
PRD slice: <the section of loop/out/pure-s*.md, pasted verbatim, with its path>
Item text: <the board item's description, verbatim>
Acceptance tests: <paths under tests/at/suites/ that this item must turn green>

## The ask
Run this item in poteto-mode, end to end, and open one pull request from this branch.
Ground it with /how in critique mode first: explorers, explainer, then the critics, on
every item.
Tool-heavy work without judgment goes to the mechanical agent with exact instructions: the
rebase into ordered commits, the per-commit builds and tests, driving the verify skill and
capturing its evidence, and the closing commands. You decide and you judge the evidence; it
types; you check each result once.
Do not name any other item's id in the pull request title or body.
The pull request body carries Why, Scope, Tradeoffs, Blast Radius, and Verification.
Then close the item as the Closing section says. You close it, nobody else.

## Closing (the git part is yours, the board is not)
1. Wait for CI to be green on the exact head of the pull request, and for the founder to
   say "merge". Both, never one.
2. Hand the git mechanics to the `mechanical` agent with exact commands. You decide, it
   types: `gh pr merge <n> --squash`, and after you leave the worktree, the worktree removal
   and the remote branch deletion. The merge closes the item on the board through the pull
   request link. Never touch the board yourself.
3. Leave the worktree with `ExitWorktree(action: "keep")`.
4. Invoke `/controller done <item>`. That skill does the board steering. Do not do it
   yourself.

## Mechanics never spend your calls
Fable calls are scarce. Tool-heavy work without judgment, the station 7 rebase, the merge
and cleanup commands, goes to the `mechanical` agent (sonnet, inherits the worktree,
executes exact instructions, rules on nothing). Write the exact plan, let it run, check the
result with one read. Do not use a fork for this: a fork runs on your own model.

## The evidence bar
- The verify suite for the acceptance tests above passes on the final head. Name each check
  and its timestamp in the Verification section.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- One database, AT_DB_SLOT=1, local and cloud alike. On a fresh cloud VM run
  `bun tests/at/harness/db-pool.ts setup` once before an integration test.
- codex needs `codex login --device-auth` once per fresh VM. The session banner says when.
```

Fill every field from the board and the repository. A field you cannot fill means the item is
not ready. Say which field, and stop.

## While the mechanic runs

A local mechanic is this session: the founder and the lead talk directly, and the controller
has no further part in the item. A cloud mechanic runs on its own. Nothing wakes you.

- `gh pr list --head <branch> --json number,url,state` finds the pull request.
- A cloud mechanic: `/tasks` lists it. To send it a message:
  `claude -p "<message>" --cloud <session-id>`.
- Never answer a content question yourself. A question from a cloud mechanic reaches the
  founder verbatim.

No timers, no wake-ups, no budgets. Silence is normal.

## Phase C: the lead closes git, `/controller done` steers the board

Two actors share one session, so the seam is explicit (founder 2026-08-29: "Lead closes but
linear steering is the controller work"). The brief's Closing section gives the lead the git
part only: CI green on the exact head AND the founder's "merge", then `gh pr merge --squash`,
leave and remove the worktree, delete the remote branch. Its last step is to invoke
`/controller done <id>`. The gate is pstack's own verify and interrogate, CI, and the founder.
There is no second local run of the suite.

On `/controller done <id>`, you do the board:

1. Confirm on Linear that the item is Done. The merge closes it through the pull request
   link. If it is not Done within a bounded re-read, repair from the merge commit and record
   the repair as a repair.
2. `Clear-HeldItem`.
3. Fold upward: read the parent's children fresh. All Done or Cancelled → fold, cascading,
   stopping below a requirement.
4. Read the pull request's "Not done here" list. Apply the four filing checks (section
   "Filing candidates"). Recommend; the founder files.
5. Print `session is free`, list the open siblings with short labels, and suggest the next
   `/controller`.

After `session is free`, the session is in the main folder on `main`. The next item starts
with `/controller <id>` in the same session, or in a new one.

The sweep of a worktree left behind by a dead session happens at the next `/controller`
start: a worktree under `.claude/worktrees/` whose branch is merged is removed, and one whose
branch is not merged is reported, never removed.

## Requirement evidence gate

Unchanged from `/work`: an exhaustive leaf snapshot at a named commit, attribution resolved,
the suite green at integration tier at that commit with named checks and timestamps, a recorded
founder attestation with a date, an explicit recorded waiver path. `/controller` proposes. It
never closes a requirement alone.

## Filing candidates

The mechanic's "Not done here" list and anything it reports are recommendations. Apply the four
checks from `/work` (actionable, distinct, worth a stranger's time, batch the small). The
founder files items. Nothing is filed automatically.

## Never

- Never rule on the item's content or answer a question addressed to the founder.
- Never check out an item branch in the main worktree. Move the session with `EnterWorktree`
  instead, and only for the hand-off to the mechanic.
- Never merge without CI green on the exact head and the local suite green.
- Never name another item's id in a pull request title or body.
- Never pass `model` when you spawn a local helper. The definition owns the pin.
