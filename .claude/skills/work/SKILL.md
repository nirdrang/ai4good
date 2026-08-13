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

## The usage window — you are the only reader, and the line is 85 percent

`shared-invariants.md` holds the full rule. The part you act on, in the manual you actually open:

- **The stamp prints the reading before every prompt** (founder 2026-08-13), in your session only.
  `WINDOW  OK` with every window and its percentage, `WINDOW  PAUSE` with what to do, or
  `WINDOW  UNKNOWN` with why. The hook DISPLAYS; it never halts anything. You are still the only
  actor that stops work.
- **The line is ONE TURN BEHIND** (measured 2026-08-13). The hook runs before the status line
  renders, so it prints the reading from the previous render. After a long gap the first prompt
  shows a stale reading, or `UNKNOWN`; the next prompt shows a current one. Never treat the first
  reading after a gap as today's number.
- **So RE-READ THE GAUGE IN THE TURN whenever the stamp says `UNKNOWN` or names an age past the
  limit** (founder 2026-08-13). Your own turn renders the status line, so the snapshot is fresh a
  second later: run `loop/work/window-gauge.ps1` once and act on that value instead. Measured this
  morning — the stamp said 282 minutes old and the file was 3 seconds old. It costs about 120 ms
  and no tokens. If the re-read is stale too, report `UNKNOWN` and carry on, as always.
- **Each window family has its own line** (founder 2026-08-13): the five-hour window stops the
  workflow at **85 percent**, the weekly windows at **95 percent**, and a window nobody
  recognises at 85. A weekly window refills days later, so stopping it early costs days to save
  an afternoon; a five-hour one refills within hours. The blocker is the window furthest over
  **its own** line, never the largest percentage. Start nothing new.
- **Send `PARK`, and send it LEAF FIRST** (measured 2026-08-13). `PARK` is one word with one
  meaning, defined in the conductor, orchestrator and executor contracts: finish the work item,
  commit, push, report `PARKED at <commit>`, end.
  - A message is delivered at the receiver's **next tool round**. The executor takes one every few
    seconds, so it parks in seconds. The conductor and the orchestrator are blocked inside one
    call and take none, so a park sent to them only WAITS.
  - Send to every running agent in the item's tree anyway, deepest first. Descendants you did not
    spawn are still addressable: they register in this session's task list.
  - The queued park then lands on each blocked role **when its child returns**, attached to that
    result. So the pipe unwinds upward by itself. You never wait for the middle to listen.
- **Then arm `loop/work/window-wait.ps1` as a background command.** Its exit re-invokes this
  session, so the conversation continues with its context intact. A parked session spends nothing.
- **On the wake, re-read the gauge before releasing anything.** The exit means the window SHOULD
  be open, never that budget exists. Still over the line → park again. Under it → release one item
  at a time, re-reading between releases.
- **`UNKNOWN` reports loudly and does not halt.** A broken instrument is not a spent window.
- **The guard works while the founder is present.** Only founder-typed turns refresh the sensor,
  so the reading ages when nobody types. Never claim unattended cover.

## Phase A — decide what

| you type | what happens |
|---|---|
| `/work AI4DEV-19` | a LEAF — start it (phase B) |
| `/work AI4DEV-61 AI4DEV-75` | a BATCH — two leaves, one run, one pull request. The first id is the PRIMARY, the second the partner; typing both ids IS the founder's batch confirmation. Three or more ids → refuse: the cap is one partner, ever |
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

0. **The twin guard, before anything else**: run `loop/work/twin-check.ps1`. It proves the two
   orchestrator contract files still say the same thing (the founder-placed pre-flight,
   2026-08-11 — the rule drifted silently within a day of being relied on). `SYNCED` → proceed.
   `TWINS DRIFTED` or `STALE GUARD` → **STOP: no spawn happens from forked contracts.** Fix the
   lagging twin (light, mirroring the missing text verbatim) or the guard's allowance, then
   re-run to green and continue. An item started on drifted contracts hands its fallback
   orchestrator different rules than its primary — the exact silent fork the twin rule forbids.
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
5. **Reserve a database slot, BEFORE the claim** — `Reserve-DbSlot -Item <id> -Branch <branch>`
   from `loop/work/db-slots.ps1`. There are two slots, so two items verify at once without
   resetting each other's database. **A full pool REJECTS this item at start** — say so, name the
   two items holding the slots, and stop; there is no queue and no flagged limbo. **An item that
   needs no database skips the reservation**, and you say at start that it is skipping it, so a
   later "why has it no slot?" has an answer in the record. Reserve before claiming: a reservation
   that fails must not leave an item falsely In Progress.
6. Claim: assign, In Progress.
7. Spawn the conductor: `Agent(subagent_type: "conductor", model: "sonnet",
   run_in_background: true, prompt: <item id, branch name, reserved database slot, what has
   already happened>)`.
   **A spawn prompt is item facts only.** It states what to RESOLVE, never a resolved value — no
   chain, no parent, no label — and it never carries process instructions, because process lives
   in the contracts and a spawn prompt is reviewed by nobody. One once told an item to queue
   auto-merge at pull-request time, which would have merged it before a single gate ran; Gate 1
   caught it on the plan. The reserved slot is an item fact and belongs here: only the coordinator
   reserves, and the item's verify runs have to know which slot they own.
8. **Record the chain FOR the agent's worktree, right after the spawn** (founder 2026-08-07):
   `Set-ChainForWorktree <worktreePath> <branch> <item> <chain>` from `work-lib.ps1`, using the
   chain you already walked in step 1 — **as an array of `@{ id; label }` nodes, never a
   sentence** (a prose chain fails validation and the stamp prints `CHAIN UNRESOLVED`). The chain
   cache is worktree-scoped, so a chain you resolved in the main checkout is invisible to the
   agent's own stamp — skip this and the founder's supervision tree degrades to `AGENT AI4DEV-nn`
   with no parents, which is the one thing the stamp exists to show. This is not a fact handed to
   the agent: it is the coordinator filing what only the coordinator can read, where the hook
   will look for it.
9. **Record the spawner too**: `Set-OwnerForWorktree <worktreePath> <yourSessionId>` — the
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

**The MERGE sitting and the AUDIT RE-RUN sitting run on `orchestrator-opus` by design** (founder
2026-08-11), to spare fable. Both are fenced judgment: the merge sitting cannot merge without a
green on the exact head, and the re-run grades a scoped fix delta against the rebuilt checklist.
The FIRST audit stays on fable — it is the item's last open-ended safety net. The conductor does
this on its own; you never tell it to. This is separate from the credit-out handoff below.

**Fable out of credit** → tell the conductor to spawn `orchestrator-opus` for subsequent
sittings, and say so in the report; the handoff is manual because `--fallback-model` never fires
on billing errors. **A session limit is not out of credit** — it is the five-hour window, it is
account-wide, and it heals itself. Never set a timer for the reset: it would fire into a
credit-dead account, and a reset time already past rolls a full day.

## Phase C — close the item

The conductor reports the merge. Then:

1. **Sweep**: release the database slot, then remove the item's worktree, its generated
   `worktree-agent-*` branch, and its artifacts directory — after confirming the raw critiques and
   distillates were committed into the record by the fix and audit sittings. Only you can sweep —
   the permission classifier blocks subagents from removing a worktree.
   **`Release-DbSlot -Item <id>`** from `loop/work/db-slots.ps1` gives the slot back. It refuses a
   reservation naming a different item, and it refuses while a verify window is still open on that
   slot — both refusals are loud, and both mean the sweep is early, not that the helper is broken.
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

**Held state is SESSION-BOUND (founder 2026-08-11: "all I care is stamping to be session
bound").** Every session has its own cache directory, keyed by its session id — the GUID in
your scratchpad path — and the stamp reads ONLY this session's held label through the id in the
hook payload. `Set-HeldItem` and `Clear-HeldItem` REQUIRE the session id and refuse loudly
without it; two sessions can no longer fight over one slot, and a neighbour's thread can never
show in your stamp.

When the founder rules work done by the coordinator on `main` outside the full lifecycle —
drill harnesses, stamp machinery, ruled contract folds — the stamp must not read
"coordination, no item claimed" while real item-scoped work is happening. Before the first
edit: `Set-HeldItem '<id>' '<short label>' 'main' '<your session id>'`. The stamp then attributes every prompt —
`COORDINATOR WORKING ON <id> (<label>)` with the honest qualifier `held, not branch` — because
a held item's documented role is exactly this: filling the gap the branch leaves empty, never
overriding it. `Clear-HeldItem` when the work closes. Commits still cite the item; this is the
same fact reaching the founder's eyes per prompt instead of only per commit.

**Work that belongs to NO board item holds a FLOATING label instead** (founder 2026-08-09):
`Set-HeldItem '~exploration' '<what, in a few words>' 'main'` prints
`WORKING ON ~exploration (stamp and attribution design)`. The tilde is the floating-root
convention from the attribution design — unmistakable to a reader and a parser, so the
attribution log can separate item work from labeled exploration. Set it the moment the
subject of the exploration is nameable, update the label when the subject shifts, clear it
when the thread ends. The bare "coordination, no item claimed" line is only for the moments
genuinely between things.

## Workflow changes get drilled before they are trusted (founder 2026-08-10)

After any change to the control machinery lands — an agent contract, this skill,
`reviewers.md`, the drill library — run the drill regression before the next item depends on
it: the mechanical suite green, plus the live scenario in `loop/drills/live-scenarios.md`
nearest the changed behaviour when one exists, with the result recorded in
`loop/drills/records/`. The addressing bug lived in a contract for a day because nothing
drilled the sentence that carried it; a workflow change with no drill evidence is code with no
test.

**The stamp now raises the alarm ITSELF (founder 2026-08-11): a `CONTRACTS DRIFTED` line
appears on the first prompt after `CLAUDE.md` or any agent contract changes on disk**, because
every session fingerprints those files at its first prompt and the hook compares on every one
after. The line names the changed files and says the session and its spawns may still carry the
old text. When it appears: finish nothing that depends on the changed contract, probe or
restart, exactly as below.

**And PROBE THE REGISTRY before the next spawn (founder 2026-08-10 — "this should have
proposed by u").** Skills and reviewer briefs are read from disk at use, so their changes are
live at once. Agent DEFINITIONS are served from a per-session registry that refreshes with a
lag of minutes, and a spawn during the lag runs the OLD contract silently. So after editing any
`.claude/agents/*.md`: spawn the changed type as a two-line PROBE (model sonnet, "quote the
sentence I changed"), and only spawn real work once the probe returns the new text. If the
probe stays stale, a session restart is the fix, and PROPOSING that restart to the founder is
the coordinator's duty, not the founder's discovery. Agents already running keep the contract
they were born with — an in-flight item finishes under mixed vintages, and the contracts must
stay backward-tolerant for exactly that reason (the birth-certificate fallback line is the
model).

## Filing candidates — few, distinct, and worth a stranger's time (founder 2026-08-09)

**AN ITEM'S GOAL IS TO FULFIL THE ITEM — NEVER TO GENERATE MORE ITEMS (founder ruling
2026-08-12).** Observations that fall out of a run are recommendations, judged carefully against
the checks below — and even one the coordinator deems a must-file reaches the board only WITH
FOUNDER APPROVAL, named and granted. The coordinator recommends; the founder approves; nothing is
filed automatically. The same restraint covers machinery: a run that suggests a new guard, script
or check hands up the suggestion — it does not build it as a rider.

Item runs hand up observations, and the coordinator judges them. Filing is not free: every item
is a promise the board makes to the founder, and a board of small promises hides the large ones.
One day produced six filed candidates, and the founder called it out. Before filing, four checks:

1. **Actionable** — the item names work someone can start. An observation with no action is a
   note for the item's record, not a board item.
2. **Distinct** — search the board first. A second item for a known fault is noise that splits
   the evidence between two pages.
3. **Worth a stranger's time** — if nobody should act on it within a month, it goes in the
   item's record, where the reflection can still find it.
4. **Batch the small** — several minor observations from one run become ONE record note or one
   grouped item, never a fan of board entries.

**The filing RATE is itself a signal.** Many candidates from one item means the item's scope was
wrong or the machinery has a fault the candidates are symptoms of. Say that to the founder
plainly instead of fanning out items — five symptoms filed separately bury the one cause.

## Batching mode — the batch SIGNAL is two ids on the /work line (founder 2026-08-11)

`/work <primary> <partner>` is the whole interface. **The coordinator never proposes a batch
and never invokes `find-batch` itself** — that skill is the founder's manual scout, and its
recommendation becomes a batch only when the founder types both ids into `/work`. One partner
maximum: three or more ids is a refusal, not a bigger batch.

A two-id invocation changes phase B like this:
- **Both items get the full startability validation** — state, blockers, container check — and
  the pair gets the batch checks: neither may hold an open founder decision, need a different
  database than the other, or require new acceptance criteria. Any failure stops the WHOLE
  invocation before any claim; there is no silent fallback to a solo run of the primary —
  scaling down is the founder's call.
- **The first id is the PRIMARY**: its `gitBranchName` names the branch, its reservation holds
  the slot, its chain leads the stamp.

**The mechanics, each one load-bearing:**
- The branch names the PRIMARY only. The partner is claimed at pickup too, and recorded on both
  board items.
- Every commit cites the item it belongs to — in a batch this is the abort path: dropping the
  partner means reverting the partner-cited commits in one commit, and its ids return to
  declared reds. Shared groundwork cites the primary.
- One joint plan, shared decisions hoisted, each step tagged to its item, the verify table
  spanning both id sets. Gate 1 reads the pair as one plan — the cheap place a wrong pairing
  dies. Gate 2 slices by surface as always; the audit reads one source-only diff and both
  claim lists.
- The partner closes through ONE sanctioned line in the pull-request body — `Closes AI4DEV-nn`,
  alone on its line, at most one, declared in the merge ruling. The CI ownership guard verifies
  exactly that shape and still fails every other foreign id.
- The stamp shows the pair: record the partner beside the chain at spawn
  (`Set-ChainForWorktree ... -BatchedWith @{ id; label }`), so the supervision tree never shows
  one id while two items ride.
- One database slot covers the pair, reserved under the primary.

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
