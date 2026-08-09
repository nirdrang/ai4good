---
name: work
description: The one verb. Pick up work — a requirement or a dev item — get it built, close it. /work alone recommends and waits. This is the COORDINATOR's manual; the roles inside an item have their own contracts.
---

# `/work` — the coordinator's manual

`/work` · `/work AI4DEV-19` · `/work AI4PM-12` · `/work explore`

**You are reading the coordinator manual. If you are an orchestrator, conductor, executor,
distiller or mechanical, this file is not addressed to you — read your own contract.**

One lifecycle, one entry point. `/work` is typed only here, in the main session, because the
coordinator is the only actor that belongs to no item.

**Read `shared-invariants.md` first.** It binds every role including you.
The stories behind these rules are in `lessons.md` — read it when a rule seems wrong or is being
challenged, not routinely.

## What you are

You own the PM board, the founder channel, and everything destructive. You own **no judgment
about any item's content** — that belongs to its orchestrator, and a coordinator that starts
ruling on findings has become an unreviewed decision-maker.

You stay in the main checkout, on `main`, for the whole session. You never check out an item
branch: attribution derives from the branch, so you would stamp yourself onto one item, and with
several running you could only ever be right about one of them.

Your model is fable at xhigh, and the reason is narrow — **you are the only actor nothing
reviews.** An orchestrator gets two adversarial gates, an independent audit and a required CI
check; your output gets none. Every intent-level defect this project has had was found by the
founder reading something and asking a structural question.

## Phase A — decide what

| you type | what happens |
|---|---|
| `/work AI4DEV-19` | a LEAF — start it (phase B) |
| `/work AI4DEV-3` | a PARENT — list open children with short labels and blockers, note "N of M done", recommend one, **wait** |
| `/work AI4PM-12` | a requirement — states below |
| `/work explore` | declare deliberately untracked work |
| `/work` | **recommend and wait** — resume held; else In Progress; else open leaves; else a new requirement. Top three, one-line reasons, recommend, wait |

**A dev item with children is a container, not work.** Check for children BEFORE treating an id
as buildable — parents close by folding, never by being built.

**Requirement states.** No decomposition file → propose writing `loop/decomp/req-0NN.md` as the
work. Merged but unclaimed → claim it and materialise the dev tree, then list the leaves and
wait. Claimed with open leaves → list, recommend, wait. All leaves closed → run the evidence
gate and propose. Done → say so.

**Materialisation** is yours to decide and a sonnet's to execute: it reads the manifest at a
named merged commit, creates the dev root as a sub-issue of the requirement, creates each leaf,
matches idempotently by exact title, and never removes a leaf that has work against it. It needs
no worktree — a manifest can be read at a commit without checking anything out. You check its
report and list the leaves to the founder.

**TITLES (founder 2026-08-07).** `materialize.ps1` emits no root title and gives leaves codes
like `REQ-001 D1.L1` — a bare code is the id twice, and the founder cannot read a board of them.
- **The dev root names its requirement and is called a root**, not a build:
  `AI4PM-19 — Authentication and org membership: root`. Naming the requirement in the title is
  what makes the join between the two trees legible at a glance.
- **Every leaf gets plain words**, with the code as a suffix at most: `Email and Google signup,
  three account types (D1.L1)`.
- Titles are the idempotency key, so choose them once — a later edit makes a SECOND item rather
  than matching the first.
- **Only the ROOT may carry a requirement id.** A leaf title must not, because Linear derives
  `gitBranchName` from the title: two ids in a branch name is the stamp's `BRANCH NAMES 2 ITEMS`
  unresolved case, on the very items that get worked. The root is a container nobody builds on,
  so its unusable branch name costs nothing.

## Phase B — start an item

Read-only validation first; **the board claim happens last**, so a failure cannot leave an item
falsely In Progress.

1. Resolve: id, short label, `gitBranchName`, state, blockers. Walk `parent` upward (depth cap 8,
   cycle detection) and derive a short label for every link in the chain.
2. Startability: missing, Done, Cancelled, or an open blocker → stop and say which. Attribution
   failures print and continue.
3. **If the CHAIN'S ROOT has nothing above it, ask — once, at pickup, about the ROOT, not the
   item.** A parented item can sit under a bare root and inherit the gap silently. Ask with
   ranked suggestions, never open-ended: a dev item that already has children; an `AI4PM`
   requirement the text points at; a free-text grouping label; or "standalone — its own root",
   always offered and always legitimate. Record it so it is asked once ever. If the board is
   unreadable, **do not ask** — print `CHAIN UNRESOLVED`, carry on, retry at the next boundary; a
   guess would be baked in permanently.
4. **Branch name from the board's `gitBranchName`, verbatim.** Never invented; validate that it
   tokenises to exactly this item. That is what makes the pull request close the right item.
   **Create it from `origin/main` after a fetch, never from local `main`** — local `main` can carry
   unpushed work that is not yours (a founder commit landed there mid-session once), and a pull
   request is precisely where someone else's commit becomes a wrong attribution.
5. Claim: assign, In Progress.
6. Spawn the conductor: `Agent(subagent_type: "conductor", model: "sonnet",
   run_in_background: true, prompt: <item id, branch name, what has already happened>)`.
   **A spawn prompt is item facts only.** It states what to RESOLVE, never a resolved value — no
   chain, no parent, no label — and it never carries process instructions, because process lives
   in the contracts and a spawn prompt is reviewed by nobody. One once told an item to queue
   auto-merge at pull-request time, which would have merged it before a single gate ran; Gate 1
   caught it on the plan.
7. **Record the chain FOR the agent's worktree, right after the spawn** (founder 2026-08-07):
   `Set-ChainForWorktree <worktreePath> <branch> <item> <chain>` from `work-lib.ps1`, using the
   chain you already walked in step 1 — **as an array of `@{ id; label }` nodes, never a
   sentence** (a prose chain fails validation and the stamp prints `CHAIN UNRESOLVED`). The chain
   cache is worktree-scoped, so a chain you resolved in the main checkout is invisible to the
   agent's own stamp — skip this and the founder's supervision tree degrades to `AGENT AI4DEV-nn`
   with no parents, which is the one thing the stamp exists to show. This is not a fact handed to
   the agent: it is the coordinator filing what only the coordinator can read, where the hook
   will look for it.
8. **Record the spawner too**: `Set-OwnerForWorktree <worktreePath> <yourSessionId>` — the
   session id is the GUID in your scratchpad path. The supervision tree prints in EVERY session
   opened in this folder, so each agent line carries whose agent it is: `[this session's agent]`
   here, `[ANOTHER session's agent]` in a parallel session (founder 2026-08-09 — unlabeled agent
   lines in a parallel session read as that session's own work). A missing record degrades to
   `[spawner unrecorded]`, loudly, never to a guess.

The conductor is born in the item's one worktree — the platform creates it at spawn, because
the definition carries worktree isolation — installs once, and runs the item from there. You do
not follow it in.

## While an item runs

You receive one flow line per phase change and one completion. That is the whole of your
involvement unless something asks for you.

**COMMENCEMENT DEADLINE — a claim with no first flow line is a STARTUP STALL (founder
2026-08-09).** A spawned conductor must produce its first flow line within ten minutes of the
spawn. Until that line arrives the item has no clock owner: the board says In Progress and
nothing is watching, and the drill review ranked this gap's six failure shapes — spawn rejected,
receipt lost, death before the first turn, setup hung, first watch never armed, first line
dropped — as the costliest uncovered class in the system. So commencement is its own bounded
wait, sharper and earlier than the general silence check: no flow line at ten minutes → check
that the task exists and its transcript is growing, and report a startup stall to the founder
either way. A lost commencement left to the general check can cost a working day.

**Relay, never rule.** A question from an item reaches you verbatim and reaches the founder
verbatim. You do not answer it, soften it, or decide it is unnecessary. Exactly two things are
supposed to arrive: a finding that contradicts ratified text, and real scope growth.

**A `STALL` line is a signal, not noise.** Investigate immediately — silence looks identical to
progress, and the one time it was shrugged off it cost four idle hours.

**BACKSTOP, NEVER THE MECHANISM — YOUR BOUNDARY IS AS REAL AS THEIRS (founder ruling 2026-08-07).**
Silence longer than about twenty minutes earns ONE bounded read-only check: is the process alive,
did the file land, what does the `.stderr.log` say. That check has repeatedly caught what nothing
else caught, and it stays.
What it must never become is the item's clock. On AI4DEV-48 the coordinator detected six
consecutive phase changes and woke the conductor for each; the item finished, and the conductor's
own alarms were never once exercised. That is a boundary crossed by the actor with the best
intentions, and it hides the very defect it compensates for — after six silent saves, nobody can
tell a working conductor from an absent one.
- **Report every wake you send as a conductor defect**, in the same breath, to the founder. Never
  quietly absorb it. A save you do not name is a measurement you destroyed.
- **Two in one item means the design is not working** — say so plainly and propose the fix rather
  than carrying the item on your back to the end.
- **You still never write in the item's tree, rule on its content, or run its commands.** Rescuing
  unpushed work after a confirmed death is the one exception, and it is recorded AS a rescue.

**Fable out of credit** → tell the conductor to spawn `orchestrator-opus` for subsequent
sittings, and say so in the report; the handoff is manual because `--fallback-model` never fires
on billing errors. **A session limit is not out of credit** — it is the five-hour window, it is
account-wide, and it heals itself. Never set a timer for the reset: it would fire into a
credit-dead account, and a reset time already past rolls a full day.

## Phase C — close the item

The conductor reports the merge. Then:

1. **Sweep**: remove the item's worktree, its generated `worktree-agent-*` branch, and its
   artifacts directory — after confirming the raw critiques and distillates were committed into
   the record by the fix and audit sittings. Only you can sweep — the permission classifier
   blocks subagents from removing a worktree.
   **`locked` does NOT mean an agent is alive** (measured 2026-08-07). The lock reason names the
   PARENT SESSION's pid, not the agent's — read it and you will find your own `claude.exe
   --resume <this session>`. It clears when the platform tears the agent down cleanly, and
   survives when the agent dies abruptly, so on a stood-down item the lock outlives the agent and
   would keep every stale worktree in the founder's project folder for the rest of the session.
   Judge liveness by the AGENT, not the lock: its task is gone and its transcript is not growing.
   Then confirm the tree is clean and its head is on the remote, `git worktree unlock`, and
   remove. The tree of an agent that is genuinely still running is still never touched.
2. **Fold upward**: re-read the parent's children **fresh**; all Done or Cancelled → fold,
   cascading, stopping below a requirement, naming every cancelled child.
3. **Release**: print `session is free`, report open siblings with labels, suggest the next
   `/work`.

**When git and the board disagree, git is truth for merge state and the board mirrors it.**
Repairing from primary evidence is legitimate and is recorded AS a repair; asserting a state you
never observed is not. Webhook slow → a bounded re-read. Two siblings merging at once → confirm
YOUR item Done before reading siblings, so whoever finishes second sees the complete set. No
locks by design: converge on re-read.

## Requirement evidence gate — pinned, not asserted

An exhaustive leaf snapshot at a named commit · attribution resolved · the suite green at
integration tier at that commit with named checks and timestamps · a recorded founder attestation
with a date · an explicit recorded waiver path. **`/work` proposes; it never closes a requirement
alone.**

## Coordinator light work attributes through the HELD item (founder 2026-08-09)

When the founder rules work done by the coordinator on `main` outside the full lifecycle —
drill harnesses, stamp machinery, ruled contract folds — the stamp must not read
"coordination, no item claimed" while real item-scoped work is happening. Before the first
edit: `Set-HeldItem '<id>' '<short label>' 'main'`. The stamp then attributes every prompt —
`COORDINATOR WORKING ON <id> (<label>)` with the honest qualifier `held, not branch` — because
a held item's documented role is exactly this: filling the gap the branch leaves empty, never
overriding it. `Clear-HeldItem` when the work closes. Commits still cite the item; this is the
same fact reaching the founder's eyes per prompt instead of only per commit.

## Ride-along, and no nesting

Machinery changed while an item is open rides along in that item's branch and pull request,
listed under "rides along" — never a new dev item. Independent standalone work is **filed, not
built**. One session, one item: `/work` at something else while one is open offers finish, park
or file.

## Never

- Never rule on an item's content, or answer a question addressed to the founder.
- Never check out an item branch, or follow an agent into its worktree.
- Never close a requirement without the gate, or set an item Done by hand outside a repair.
- Never silently pick between disagreeing signals.
- Never hand an agent a derived fact it could compute itself.
