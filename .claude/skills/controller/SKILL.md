---
name: controller
description: Workflow v2 entry verb. Pick up one board item, write its brief, open the mechanic that runs open-pstack on it as a session the founder can talk to (local window by default, cloud on request), then gate, merge, and close on return. /controller alone recommends and waits. This is the CONTROLLER's manual, a trimmed /work. The mechanic follows the pstack skills.
---

# The controller's manual: `/controller`

`/controller` · `/controller AI4DEV-19` · `/controller AI4DEV-19 cloud` · `/controller AI4PM-12` · `/controller spin AI4DEV-19`

You are reading the controller manual for workflow v2. The way of work it serves is
`pstack-workflow-ai4good.md` in `.claude/skills/work/`. Read `shared-invariants.md` in the same
folder first. It binds you. `/work` remains the v1 manual and its relay is the fallback.

## What you are

You own the board, the founder channel, the item branch, the brief, the local gate, and the
merge. You own no judgment about the item's content. The mechanic, a cloud session in
poteto-mode, owns everything between the brief and the pull request.

You stay in the main checkout, on `main`, for the whole session. You never check out an item
branch there. The branch guard refuses it. When you must act on the item branch, you use a
linked worktree and `git -C <worktree>`.

## Phase A: decide what

| you type | what happens |
|---|---|
| `/controller AI4DEV-19` | a LEAF. Start it (phase B). The mechanic runs locally in its own window. |
| `/controller AI4DEV-19 cloud` | the same, with the mechanic as a cloud session. |
| `/controller AI4DEV-3` | a PARENT. List the open children with short labels and blockers, say "N of M done", recommend one, wait. |
| `/controller AI4PM-12` | a requirement. Apply the requirement states below. |
| `/controller` | recommend and wait: In Progress first, then open leaves, then a new requirement. Top three, one-line reasons, wait. |
| `/controller spin AI4DEV-19` | the item is already claimed and its brief is on the branch. Do phase B step 8 only. |

A dev item with children is a container, not work. Check for children before you treat an id as
buildable. One item per run. Batching is not part of v2 until the founder rules on stacks.

Requirement states: no decomposition file → propose writing `loop/decomp/req-0NN.md` as the
work. Merged but unclaimed → materialise the dev tree as `/work` describes it (section
"Materialisation" and "TITLES" in `.claude/skills/work/SKILL.md`), list the leaves, wait. Open
leaves → list, recommend, wait. All leaves closed → run the evidence gate and propose. Done →
say so.

## Phase B: start an item

Validate first. The board claim comes after the branch and the slot, so a failure cannot leave
an item falsely In Progress.

1. Resolve the item: id, short label, `gitBranchName`, state, blockers. Walk `parent` upward
   (depth cap 8, cycle detection) and derive a short label for every link.
2. Startability: missing, Done, Cancelled, or an open blocker → stop and say which.
3. If the chain's root has nothing above it, ask once, at pickup, about the root. Offer ranked
   suggestions and always offer "standalone". If the board is unreadable, print
   `CHAIN UNRESOLVED` and carry on.
4. Branch. Take `gitBranchName` verbatim and check that it tokenises to exactly this item.
   Then `git fetch origin` and `git branch <branch> origin/main`. Never from local `main`.
5. Worktree. `git worktree add worktrees/<item> <branch>`. This is the only place you touch
   the item's files. You never open a session there.
6. Reserve a database slot for the local gate: `Reserve-DbSlot -Item <id> -Branch <branch>`
   from `loop/work/db-slots.ps1`. A full pool rejects the item at start. Say so and stop. An
   item that needs no database skips this and you say so.
7. Claim: assign the item, set In Progress. Then `Set-HeldItem '<id>' '<label>' 'main'
   '<your session id>'` so your own stamp, when it is live, names the item.
8. Brief and spin. Write `loop/items/<item>/brief.md` in the worktree from the template
   below, commit it on the branch with a message that cites the item, and push. Then start
   the mechanic as a session the founder can talk to. **Never as a subagent** (founder
   2026-08-29: "i dont like it that i cant interact with the lead"). Two ways:

   **Local, the default.** Open a new terminal window in the worktree with the lead in it:

   ```powershell
   Start-Process wt.exe -ArgumentList '-d', '<worktree>', 'claude', '"Read loop/items/<item>/brief.md and follow it."'
   ```

   The lead's checkout is the item branch. The founder talks to it in that window, or from the
   phone through Remote Control, which every session here starts with. Record the worktree
   path and the launch time in `loop/items/<item>/mechanic.md`.

   **Cloud, on `/controller <id> cloud`.** From the worktree:

   ```powershell
   Set-Location <worktree>
   claude --cloud "Read loop/items/<item>/brief.md and follow it."
   ```

   The cloud session clones the remote at the worktree's branch, so the push must land before
   the command runs. The command names the session: a `session_...` id and a
   `claude.ai/code/...` link. Record both in `loop/items/<item>/mechanic.md`. The founder talks
   to it on claude.ai or in the mobile app.

   In both cases, commit `mechanic.md` to the branch and push. If the launch fails, print the
   exact command and ask the founder to run it. Do not retry silently.
9. Print the transition line: item, branch, slot, where the mechanic lives. Then wait.

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
Do not merge. Do not name any other item's id in the pull request title or body.
The pull request body carries Why, Scope, Tradeoffs, Blast Radius, and Verification.

## The evidence bar
- The verify suite for the acceptance tests above passes on the final head. Name each check
  and its timestamp in the Verification section.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- The cloud environment sets AT_DB_SLOT=1 with a one-slot pool. Run
  `bun tests/at/harness/db-pool.ts setup` once if an integration test needs the database.
- codex needs `codex login --device-auth` once per fresh VM. The session banner says when.
```

Fill every field from the board and the repository. A field you cannot fill means the item is
not ready. Say which field, and stop.

## While the mechanic runs

The mechanic is not a subagent. Nothing wakes you. Check on it only when the founder asks or
when you need the pull request:

- `gh pr list --head <branch> --json number,url,state` finds the pull request.
- A local mechanic: the founder talks to it in its own window. When you have something for
  it, a gate failure or a ruling, print the exact text and the founder pastes it there.
- A cloud mechanic: `/tasks` lists it. To send it a message:
  `claude -p "<message>" --cloud <session-id>`.
- Never answer a content question yourself. A question from the mechanic reaches the founder
  verbatim.

No timers, no wake-ups, no budgets. Silence is normal.

## Phase C: close the item

When the pull request exists:

1. Local gate. Fetch the head. In the worktree, `git -C <worktree> checkout <branch>` and
   `git -C <worktree> pull`. Run the verify suite for the item's acceptance tests with the
   reserved slot. Read the Verification section of the pull request body and check that it
   names the same checks. Confirm CI is green on the exact head.
2. If the gate fails, send the failure to the mechanic verbatim: print it for the founder to
   paste into a local mechanic, or `claude -p` it to a cloud one. Wait. Do not fix the code
   yourself.
3. If the gate passes, merge: `gh pr merge <n> --squash`. The merge closes the item on the
   board. Never set the item Done by hand.
4. Sweep: `Release-DbSlot -Item <id>`, `Clear-HeldItem`, `git worktree remove worktrees/<item>`,
   delete the remote branch.
5. Fold upward: re-read the parent's children fresh. All Done or Cancelled → fold, cascading,
   stopping below a requirement.
6. Print `session is free`, report open siblings with labels, and suggest the next
   `/controller`.

Who gates the merge is an open founder ruling. Until the founder rules, the controller gates
and merges as written here, and says so in the merge comment.

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
- Never check out an item branch in the main worktree.
- Never merge without CI green on the exact head and the local suite green.
- Never name another item's id in a pull request title or body.
- Never pass `model` when you spawn a local helper. The definition owns the pin.
