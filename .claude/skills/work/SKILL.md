---
name: work
description: The one verb. Pick up work (a requirement or a dev item), build it, finish it. /work alone recommends and waits. Replaces /pm-next, /item-loop, /dev-start, /dev-end, /bind and /override.
---

# `/work` — the one verb

`/work` · `/work AI4DEV-19` · `/work AI4PM-12` · `/work explore`

There is one lifecycle and one entry point. Everything below is a phase inside this skill,
never a second verb.

## The rule that shapes everything

Every attribution failure in this project was one shape: a **declared** fact drifted from a
**real** fact, and nothing could detect the gap. The system is allowed to say "I don't know".
It is never allowed to be confidently wrong.

So: attribution is **derived from the branch**, never declared. The branch is coupled to
closure — its pull request closes that item — so a wrong branch shows up as a wrong closure
on the board instead of hiding.

```
branch and held item disagree -> CONFLICT. Show both, ask. Never pick one.
branch names one item         -> that item; walk parents for the chain
branch names 2+               -> unresolved
branch names none, session HOLDS one -> that, marked held-not-branch
explicitly exploring          -> exploration
otherwise                     -> unattributed
```

The **held item is a cross-check, never an answer**: it can raise CONFLICT or fill a gap the
branch left empty, but it can never override the branch. A stale held item makes the stamp
louder, never wronger — the exact inverse of the binding file this replaces.

**Attribution never blocks building.** Linear unreachable, chain ambiguous, root missing: say
so and carry on. The one thing it blocks is **closing a requirement**, because that is where a
wrong answer becomes permanent.

## The agent never moves itself (founder 2026-08-02)

A session works in the folder it was launched in, on one branch, for the whole item. It may
create a worktree and *tell the founder to open a session there*; it never teleports into one.

- **Serial work needs no worktree**: switch the branch in the folder you are in.
- **A worktree is only for a second item at the same time**, and the founder opens that session.
- Never rely on a tool that moves the session. If such a move silently failed, the session
  would sit in `main` believing it was elsewhere — which is exactly the AI4DEV-24 failure.

## Phase A — decide what

| you type | what happens |
|---|---|
| `/work AI4DEV-19` | a LEAF — build it (phase B) |
| `/work AI4DEV-3` | a PARENT — list its open children, recommend one, **wait** |
| `/work AI4PM-12` | requirement — five states below |
| `/work explore` | declare deliberately untracked work |
| `/work` | **recommend and wait** |

**A dev item with children is a container, not work** (founder question 2026-08-03: *"if I run
work on AI4DEV-3, what does it do for its children?"*). Check for children BEFORE treating any
id as buildable. A parent has no code of its own, so cutting a branch for it would produce a
pull request with nothing in it and an item that can never close on its own merge — parents
close by **folding** when their last child closes, never by being built.

So a parent behaves exactly like a claimed requirement: list the open children with their short
labels, say which are blocked and by what, recommend one with a reason, and wait. The founder
picks. Closed children are named in the listing too, because "5 of 13 done" is the useful frame
and a bare list of what remains hides it.

**`/work` alone** — never picks silently. In order: resume what this session holds; else
anything already In Progress; else open leaves under a claimed requirement; else a new
requirement to claim, with its decomposition state named. Show the top three with short
labels and a one-line reason each, recommend one, **wait**.

**`/work AI4PM-12`** reports which state it found and proposes; it never guesses which you meant.

| state | action |
|---|---|
| no decomposition file | propose writing `loop/decomp/req-0NN.md` as the work — its own branch, through this loop |
| decomposition merged, unclaimed | claim it, **materialize the dev tree**, list leaves, recommend one, wait |
| claimed, leaves open | list open leaves, recommend one, wait |
| all leaves closed | run the evidence gate, propose closing |
| Done | say so, offer what is next |

**Materialization** creates the dev root as a **sub-issue of the requirement**
(`parentId = AI4PM-12`) — that parent link is what makes the chain walk work. It reads the
decomposition at a merged commit, is idempotent (matched by exact title), and when scope
changes it adds new leaves but **never removes a leaf that has work against it**.

## Phase B — prepare the workspace

Read-only validation first. **The board claim happens last**, after everything else succeeded,
so a failure can never leave an item falsely In Progress.

1. Resolve the item: id, short label, `gitBranchName`, state, blockers; walk `parent` upward
   (depth cap 8, cycle detection) to the root; derive short labels for every id in the chain.

   **Deriving a short label: strip the internal code, keep the meaning.** Board titles often
   lead with one — `H5 — `, `REQ-0NN — `, `Batch 3 — `. Truncating from the front preserves the
   code and discards what the item actually is, which is backwards. `AI4DEV-21 (fake Stripe,
   GitHub, Anthropic)`, never `AI4DEV-21 (H5 vendor stand-ins)`. Two to five words a stranger
   could act on.
2. Startability **blocks**: item missing, Done, Cancelled, or an open blocker → stop and say
   which. Attribution failures do **not** block — they print and continue.
2a. **If the CHAIN'S ROOT has nothing above it, ASK — once, here at pickup**

   **Check the ROOT, not the item.** An item can have a parent whose own root is bare, and then
   the question never fires and the gap is inherited in silence by every sibling under that
   root. That is exactly what happened: a harness item had a parent, so the check passed, and
   nobody ever asked what the parent itself rolled up to — until the founder read a stamp and
   asked what was above it. One unasked question had been propagating down a subtree of eight.

   So: walk to the root first, then ask whether **the root** reaches a requirement, carries an
   `attr:` floating label, or is marked `standalone-root`. If none of those, that is the gap.
   (founder ruling 2026-08-02). Two failures that look alike must not be treated alike:

   | what happened | what to do |
   |---|---|
   | the walk **completed** and its ROOT has nothing above it — no requirement, no `attr:` label, no `standalone-root` marker | **stop and ask.** The board is saying nothing is above this, which is a modelling gap and the founder is the one who can close it. |
   | the board could **not be read** (API error, unreachable, partial response) | **do not ask.** That is a technical failure, not a modelling gap — asking would bake a guess into the board permanently. Print `CHAIN UNRESOLVED`, carry on, retry at the next boundary. |

   When asking, **offer suggestions rather than an open question**, ranked:
   1. dev-board items that already have children — the real phases (e.g. `AI4DEV-3 (AT harness)`,
      `AI4DEV-4 (the work skill)`), nearest first by project and subject;
   2. an `AI4PM` requirement, when the item's text points at one;
   3. **a free-text grouping label** — see floating roots below;
   4. **"standalone — it is its own root"**, always offered and always legitimate. Not every
      item belongs to a phase, and a phase with exactly one child tells you less than no phase.

   Then record the answer so it is asked **once, ever**:
   - a parent was chosen → `save_issue` sets `parentId`; the chain resolves permanently, for
     every future session, because the answer lives on the board rather than on this machine;
   - free text → a FLOATING root, below;
   - standalone → label the item `standalone-root`, which is why the question does not return;
   - **no answer, or the founder declines → proceed with no root and do not ask again this
     session.** Attribution degrades and never blocks; this is a question at the one moment a
     human is present, not a gate.

   The stamp hook never asks anything — it runs before every prompt and blocking there is not
   an option. This is `/work` at pickup, which is a deliberate interactive moment.

### Floating roots (founder ruling 2026-08-02)

A free-text answer is **accepted as-is**. It becomes a floating root — a grouping that exists
only for the attribution log and has **no item on the board**. The founder's reason, and it
governs the design: *the point of attribution is a log we can chew on for cadence and
monitoring*, and a grouping useful for that does not need a board item behind it.

I argued for creating a real item instead; the founder overruled, and the ruling stands. What
the implementation must therefore guarantee is that a floating root is never mistaken for a
verified one:

- **Written `~name`** — e.g. `~infrastructure`. The tilde makes it unmistakable to a reader and
  to a parser, so an analysis of the log can always separate "grouped by a real requirement"
  from "grouped by a label someone typed".
- **Legal only as the ROOT of a chain.** Anywhere else it would be asserting a board
  relationship that does not exist.
- **A real parent always wins.** If the walk later finds an actual parent, that is the chain and
  the floating label is dropped with a note. The traversal catches genuine structure; a floating
  root only fills space the board leaves empty.
- **Recorded as a Linear label** (`attr:<name>`) on the item as well as in the cache, so it
  survives a machine and stays queryable for the monitoring it exists to serve — a label is a
  tag on the item, not a parent, so this creates nothing on the PM board.

```
WORKING ON  ~infrastructure > AI4DEV-5 (CI pipeline)
IN          wt ai4good - branch nirdrang/ai4dev-5-bring-up-ci-pipeline-...
```
3. **Branch name comes from Linear's `gitBranchName` verbatim** — never invented. That is what
   makes the pull request close the right item. Validate it tokenises to exactly this item.
4. Put the folder on that branch. Serial work: switch this folder. A second concurrent item:
   create a worktree, then **ask the founder to open a session there** — do not proceed here.
5. Claim: assign, In Progress.
6. **Print the transition record** the moment the branch changes — the pre-prompt stamp
   describes the turn as it began, so a turn that changes branch must say so:

```
TRANSITION  AI4PM-19 (user auth) > AI4DEV-41 (login form)
            branch nirdrang/ai4dev-41-login-form  base 8c3a5ca
```

7. Journal each step so a crash between any two is recoverable by reading, not guessing.

## Running items in PARALLEL — one agent per item (tested 2026-08-02)

Serial work needs none of this: one item, worked on a branch in the folder you are already in.
This is for running two or three items at once **without the founder opening a session for
each**.

**The shape.** The coordinator session spawns ONE agent per item with worktree isolation. The
platform creates that agent's worktree and **the agent is born inside it** — it never has to
move itself, which is what made every earlier attempt fail. It is also *pinned*: the platform
refuses any command that resolves outside its worktree, so it cannot damage another item's
work even by mistake.

```
coordinator (main checkout, never moves) - spawns, and merges. Nothing else.
└── item agent - FABLE - own worktree, own branch, FULL AUTHORITY over its item
    ├── executor          - OPUS - writes the code, same worktree, same branch
    ├── mechanical        - sonnet - housekeeping, publish, merge, courier
    ├── gate reviewers    - codex TERRA @ max + Kimi k3 @ high, in the worktree
    └── pre-merge auditor - codex LUNA @ max, workspace-write, in the worktree
```

Terra reviews the code; luna audits the claim about it. A different vendor from the agent that
wrote the code, and a different variant from the one that reviewed it.

Spawned as: `Agent(subagent_type: "item-agent", isolation: "worktree",
run_in_background: true, model: "fable", prompt: <the spawn prompt>)`. The `isolation` line is
what creates the worktree; nothing else creates one.

**Effort comes from the agent DEFINITION, not the call.** The Agent tool sets `model` but has
no effort parameter, so "opus at max effort" cannot be requested at the call site.
`.claude/agents/item-agent.md` carries `effort: max` in its frontmatter, and effort is not a
caller parameter — so it applies whichever model the caller picks. To vary effort per call,
define another agent type; the choice lives in `subagent_type`.

That file also carries the standing role — no code, derive your own chain, push at every phase
boundary, how to ask a question — so a spawn prompt carries only what is specific to its item:
which item, and what has already happened to it. A shorter prompt is one with fewer places to
be wrong.

### Print the item's stamp to the founder when it starts (founder ruling 2026-08-03)

Every time an item is started, the coordinator derives that agent's stamp and prints it in the
conversation. Not a paraphrase — run the hook against the agent's worktree and paste what it
says:

```
$env:CLAUDE_PROJECT_DIR = <the agent's worktree>; powershell -NoProfile -File loop/work/stamp-hook.ps1
```

Subagent threads get no stamp hook, so an item agent's attribution is invisible unless somebody
renders it. Without this the founder has no way to see what a spawned agent believes it is
working on until its first report, which can be an hour later.

**Print it as emitted, including when it is not yet resolved.** A stamp reading
`CHAIN UNRESOLVED` while an agent is still walking the board is the honest state and worth
seeing — it is the difference between an agent that does not know its root yet and one that has
invented one.

### A spawn prompt states what to RESOLVE, never a resolved value

The coordinator must not put a derived fact into a spawn prompt. Not the chain, not the parent,
not a label, not a state the agent can read for itself. Say *"resolve your chain from the
board"*, never *"your chain is X > Y"*.

This was violated on AI4DEV-31: the spawn prompt contained a literal
`Set-Chain … @{id='AI4DEV-3'…}`. It happened to be right, and that is the danger — the agent
would have stamped a wrong value just as faithfully, for the life of the item, and no gate ever
reads a spawn prompt. It is the declared-not-derived defect this entire way of work exists to
delete, reintroduced by the one actor nobody reviews.

One net already exists and is not a substitute for the rule: the agent definition tells the
agent to treat a handed chain as a hint to verify. It fires AFTER the prompt is written. This
one fires before.

**The general form, because it is what makes any of this survive:** a correction exists only if
it lives in a file that loads every session — the skill, the agent definition, CLAUDE.md,
memory. A correction delivered in a message to a running agent dies with that agent. If it
matters for the next item, write it down before the conversation moves on.

**`--fallback-model` does not rescue this.** It fires on model overload and non-retryable server
errors; authentication, **billing**, rate-limit, request-size and transport errors explicitly
never trigger it. Out of credits is a billing error, so the fable→opus handoff stays manual and
must be **stated in the report** when it happens.

**The item agent has FULL AUTHORITY over its item and never sends judgment back to the
coordinator** (founder ruling 2026-08-02: *"why does the item agent need judgment back to you —
these are free agents"*). It triages findings, rules on them, and decides what merges. An
earlier draft had it escalating to the coordinator, which would have made the parallelism fake:
three agents all queued behind one conversation, with the coordinator as the serializer.

What still leaves the item goes **to the founder directly, not through the coordinator** — a
finding that contradicts ratified text, or scope growth. The coordinator spawns and merges.
That is the whole of its job.

**A reviewer's maintained "this green is unearned" tag is the ORCHESTRATOR'S judgment call**
(founder ruling 2026-08-04, on the first real firing of the old escalation tripwire: *"this is
a judgement call to the orchestrator"*). An earlier rule reserved the dismissal of such a tag
for the founder; the first time it fired, the item agent had already done everything a judge
needs — undisputed facts on the record, fix routes exhausted, both remedies rejected for
written cause — and the founder's answer was that the remaining call belonged to the agent.
So: the item agent rules a maintained residual terminal itself, with two conditions that are
not optional. The reviewer's maintained disagreement is recorded **verbatim** next to the
ruling and stays visible in the PR body — a ruling may overrule the objection, never erase it.
And the ruling states what the green DOES claim and what it does not, so the residual is a
documented boundary rather than a swallowed defect.

Its subagents **inherit its worktree and branch** (tested: a child reported the identical
directory and branch, and read a file its parent had just written). The coordinator does not
review the work in place — it reads what the agent **published**, the pushed branch and the PR,
which is the same surface the founder reviews.

### Models (founder ruling 2026-08-02)

| role | model | what it does |
|---|---|---|
| **item agent — the orchestrator** | **fable** (→ opus only when fable is out of credit) | **judgment only. Writes no code.** The plan, rulings, merge decision |
| **executor** | **opus** | **writes the code.** Implements the amended plan, triages findings first-hand, fixes |
| mechanical | **sonnet** | housekeeping, publish, merge execution, courier runs |
| **pre-merge auditor** | codex `gpt-5.6-luna` @ `max` | independent re-run — see below |
| gate reviewers | codex `gpt-5.6-terra` @ `max`, Kimi `k3` @ `high` | adversarial critique |

**Three tiers, and the boundary is strict** (founder ruling 2026-08-03: *"fable as orchestrator
is doing judgments, not creating code — that's the opus executor role"*). Premium credits buy
decisions, not keystrokes. The orchestrator writes the plan with every decision made, rules
on findings, and signs the merge decision; **it does not implement.** An earlier draft had it
driving the work itself and handing edits to sonnet — that spent fable tokens on typing and put
judgment and implementation in one context, where a decision can be quietly revised by whoever
is doing the typing.

The executor escalates judgment **to its own item agent**, not to the coordinator — that is
inside the item and costs no parallelism. When the fable fallback is used, **say so in the
report**, because a fable item run and an opus item run are not the same evidence.

### The auditor is codex luna (founder ruling 2026-08-03)

It runs before merge and independently re-runs the verification, gathering each checklist box's
evidence — because **the agent claiming green is the one being checked**, and its own transcript
is contaminated by having written the code.

**Independence is the property being bought.** A fresh in-house context gives one kind; a
different vendor gives a stronger one. And **luna audits while terra reviews**, so the model
that examined the code is not the model auditing the claim about it — the two variants'
blind spots are decorrelated rather than shared.

```
codex exec --sandbox workspace-write -C <worktree> \
  -c model=gpt-5.6-luna -c model_reasoning_effort=max \
  -o <worktree>/loop/items/<ITEM>/premerge-audit.md "<audit brief>"
```

**`--sandbox workspace-write` is load-bearing, not incidental.** The auditor must actually RUN
the suite; under `read-only` the test run fails and the audit silently degrades into a
documentation review that reports green because it never executed anything. That failure would
look exactly like a passing audit.

Run it **detached** — a max-effort pass that also executes a test suite will exceed the
ten-minute foreground ceiling.

**It reports; it rules on nothing.** The ruling belongs to the item agent, which holds authority
over its item. If codex is unavailable, fall back to a fresh-context **sonnet** auditor and say
which was used — an audit that is quietly skipped is worse than one that is openly weaker.

**Known boundary (2026-08-03): in a PLATFORM worktree — always nested inside the main
checkout — the workspace-scoped sandbox denies vitest's ancestor-directory config walk**
(`Cannot read directory "../../../../.."`), so vitest-based boxes fail with access-denied
while non-walking commands pass. Read that signature as COULD-NOT-VERIFY-IN-SANDBOX, take the
execution evidence from the PR's own CI run instead, and say so — it is not a red of the code
under audit.

### Rules the testing forced

- **Liveness of a detached reviewer is judged by ITS OWN ARTIFACTS, never by process scans
  or someone else's observation** (added 2026-08-03, after two wrong death calls on one
  item). An unflushed output file reads as zero bytes while the reviewer is mid-run; kimi
  runs as a node process, so a name scan misses it. The owning agent checks the task
  transcript's size and last-write time across a short interval — growth means alive. Only
  a verified-EMPTY result after completion is a failed gate: one relaunch, then rule the
  gate unavailable in writing and proceed. A coordinator does not make liveness claims; it
  points at files and lets the owner measure.
- **NEVER resume an agent after it has finished.** Its worktree is deleted on completion, and a
  resumed agent silently falls back to the main checkout. Observed: a resumed probe created a
  branch in the live checkout and switched it. If an agent must wait for a ruling, it stays
  **alive** — a live agent keeps its worktree.
- **Push before finishing.** The worktree dies with the agent, so anything uncommitted is lost.
  The remote is the only durable output.
- **Never hand an agent a worktree you created.** It cannot use one; the isolation guard blocks
  it and bricks the agent's shell (tested — `EnterWorktree` reported success and every
  subsequent command was refused). Worktrees are the platform's to create.

The auto-generated folder name (`agent-<hash>`) is irrelevant, because **attribution reads the
branch, not the folder**. The agent checks out the item's Linear branch inside its own worktree
and the stamp resolves correctly.

### Footgun

**PowerShell keeps no shell state between tool calls** — only the working directory persists.
A script that dot-sources `work-lib.ps1` in one call and uses its functions in the next will
fail with "not recognized". Source and use in the *same* command.

## Phase C — build

**Plan** (the item agent's own, from the Linear item, the spec and the code) → **Gate 1** (sol
refutes the plan, intent included) → rulings → implement → **Gate 2** (terra + Kimi in parallel
on the diff) → bounded fix cycles → verify.

### There is no brief, and no Gate 0 (founder ruling 2026-08-04)

The brief was the handoff document from when the planner and the orchestrator were different
contexts. In `/work` the item agent IS the planner, so a brief was the orchestrator writing
itself a letter — and Gate 0 was a gate invented to review that letter. The first real run
showed where that leads: three intent documents (brief, design, executor brief), of which only
the first was ever reviewed, while the one the executor actually follows was reviewed by
nobody.

**One plan.** It carries the decisions, the steps, and the expected verification state per AT
id — a plan is where decisions live. The executor implements the amended plan; it does not
write a second one. The plan's review absorbed Gate 0's job, so a defect in the intent is
caught at the same gate as a defect in the steps.

Sol refutes the plan, terra reviews the code, luna audits the claim. Three variants, three
jobs, decorrelated blind spots — and the plan and the diff are never judged by the same eyes.

### Gate 1 — sol refutes the plan, intent included

**codex `-c model=gpt-5.6-sol -c model_reasoning_effort=max`**, in the worktree, detached.

Gate 1 attacks BOTH layers, because nothing upstream of it reviews intent at all:
- a decision stated as settled that is not actually decided;
- a fact asserted that is wrong against the code — the reviewer verifies the plan's claims
  in the tree, never trusts them;
- a constraint that contradicts the skill;
- scope that will force a mid-flight redesign;
- anything the plan requires that no tool can do — **a plan that cannot be executed as written
  is the failure this gate exists to catch**, because an executor blocked mid-item is expensive
  and the block was knowable before a line was written;
- and the plan's own teeth: steps that do not reach the item's done-criterion, oracles too weak
  to prove what they claim, a test whose green would not mean what the item says it means.

The last point has already paid once: on its first real run this review caught a test oracle
that would have greened without proving anything, and a do-nothing implementation that would
have satisfied the whole verification gate.

**Item-specific prompt content is ADDITIVE ONLY.** The plan's author writes the review prompt,
which is a conflict of interest held in check by one rule: point the reviewer at more files or
more risks, never at fewer attack directions than the list above.

**Proportionality (founder 2026-08-02).** The gates exist for correctness risk. An item that
is documentation, or whose design has already been through adversarial review, runs a single
focused gate on the part that is actually code — and says in the report that it did. Running
nine phases of ceremony on a prose change is how a process stops being followed at all.

**Run gates in the BACKGROUND.** A max-effort review of a real diff exceeds the ten-minute
foreground command ceiling and gets killed — observed twice on 2026-08-02, losing the whole
run both times. Launch the reviewer detached, keep working, fold the findings when it returns.

**Reviewers run IN THE WORKTREE, against the real tree — never against an exported diff**
(2026-08-02, after the founder pushed back on this). A reviewer is a process with a working
directory, so `codex -C <worktree>` reads the actual source: it can follow a call into a file
the diff never touched. Exporting a diff to a scratchpad and reviewing that was a habit
mistaken for a limitation, and it made every gate weaker than it needed to be — the reviewer
could only see the lines it was handed. **Proven**: codex launched in a worktree read
`stamp-hook.ps1` unprompted and quoted its literal strings back.

**Reviewer sessions are RESUMED for confirmation, never rebuilt** (founder 2026-08-02: coming
back to a fresh session "recreates the context it built an iteration ago — complete waste").
It is worse than waste: a new session re-derives its findings from scratch, so the rule that
*a finding is confirmed by the reviewer that raised it* is quietly broken — a different chain
of reasoning is answering for the first one. Capture the session id from the gate run and
resume it:
- codex: `codex exec resume <SESSION_ID> "<confirmation prompt>"`
- Kimi: `kimi -S <id>`, or `-c` to continue the previous session **for this working
  directory** — which scopes to the item's worktree by itself

Reviewer pins, in each vendor's own vocabulary — **the ladders differ, and invalid values fall
back silently**:
- codex Gate 1 (the plan): `-c model=gpt-5.6-sol -c model_reasoning_effort=max`
- codex Gate 2 (the diff): `-c model=gpt-5.6-terra -c model_reasoning_effort=max` (the codex
  ladder tops at `max`; `xhigh` is one tier below — believing otherwise already cost a real
  under-run)
- Kimi: `kimi -m kimi-code/k3 -p "<short>" --output-format text`, effort `high` from config

Useful codex flags, all verified present: `-C <dir>` sets the working root, `-o <file>` writes
the final answer to a file instead of leaving it to be scraped from stdout, and `--json` emits
events as JSONL.

### How to actually launch a reviewer — this cost three failed launches on AI4DEV-5

Written down because it was folklore, and folklore is rediscovered by failing:

- **Short prompt on the command line, the material in a FILE.** The reviewer runs in the worktree and
  can read files, so pass a pointer — "read `loop/items/<ITEM>/gate2-prompt.txt` and the diff"
  — not the material itself. A long inline prompt hits the Windows argument limit and dies, and
  embedded quotes mangle it before that.
- **Capture with `-o <file>`**, never by scraping stdout. Redirect **stderr into the same file**
  too: a failure message in the file teaches you why it died; a silent 71-byte file teaches you
  nothing (observed).
- **`codex exec resume <SESSION_ID>` rejects `-C`.** Resume inherits the original session's
  working root; passing the flag again fails the invocation.
- **Kimi: `-p` is incompatible with `--auto` and `--yolo`.** The working form is
  `kimi -m kimi-code/k3 -p "<short>" --output-format text`.
- **Size is not the test — CONTENT is.** A 71-byte file containing
  `"• Reading the brief's context files…"` is a progress line, not a critique. Check for
  findings, and check the exit code. "Non-empty" was too weak a rule and let a failed gate look
  like a clean one.
- **Never judge a reviewer's liveness from a process list** (the coordinator did, twice, and was
  wrong both times — once from an unflushed file, once from a scan that did not match how Kimi
  runs). Measure the reviewer's own artifacts growing over an interval. The owner of a detached
  process is the only party that can judge whether it is alive.
- **Watch the SESSION TRANSCRIPT, not the `-o` file.** `-o` writes only the final answer, and
  the redirected streams can stay empty for several minutes, so a healthy reviewer looks dead
  for its whole opening stretch — an item agent nearly killed one on exactly this. The
  reviewer's own transcript grows continuously and is the honest liveness signal.

### ONE WRITER IN A WORKTREE AT A TIME

The skill told item agents to run reviewers in their worktree, and separately to use subagents
freely, and never said those must not overlap. One agent lost **two** audit runs to this: a
mutating subagent stashed the `workspace-write` auditor's in-flight changes, and later a kill
hit a wrapper while the real process survived and kept writing into the tree for eight more
minutes.

So: **only one writer touches a worktree at a time.** While a `workspace-write` reviewer or
auditor is running, nothing else mutates that tree — no editing subagent, no commit, no stash,
no checkout. And a reviewer's process must be **confirmed dead by process id**, not by its
wrapper exiting and not by an empty output file, before anything else writes there. A wrapper
that has returned is not evidence that the process it launched has stopped.

Confirmation runs at `high`; a confirmation asked to judge a *claim* rather than a fix is
review work and gets `max`.

### A ruling that REMOVES work carries a verification condition

When you accept a gate finding that says *"this part is unnecessary, take it out"*, attach a
condition the executor must check before removing it — and restore the work if the condition
fails.

This is not caution for its own sake. An item accepted a Gate 1 finding that converting one
type bought nothing; the measurement behind it covered only the direct read and missed an
upcast route, so the ruling was wrong. **Kimi caught it at Gate 2 — a finding terra missed, and
what it caught was an error in the item agent's own earlier ruling.** It was recoverable only
because the removal had carried a condition to verify.

Removals are the rulings least likely to be re-examined: nothing downstream fails, the diff
gets smaller, and the reviewer that proposed it has already moved on. A condition is the only
thing that makes a removal falsifiable later.

## Committing — `.claude/` and `loop/out/` are GITIGNORED

Both are ignored by directory rule and their contents are tracked only because they were
force-added. **A new file under either path will not stage, and `git add -A` reports nothing
wrong.** So: `git add -f <path>`, then **read `git status --short` and confirm the `A` line is
there** before committing.

Caught on this item as a near-miss: the commit was about to delete eight verb skills and add
zero replacements, because the new skill silently did not stage. Verify the add; do not trust it.

## Phase D — finish

A completion signal is always something **outside the agent's own claim**.

| level | signal | not the signal |
|---|---|---|
| leaf | PR merged **and** Linear flipped it Done | "the tests passed for me" |
| parent | every child closed, re-read fresh | memory of what was closed |
| requirement | the evidence gate | its leaves being closed |

1. Independent re-verification by a fresh-context agent — never the one that wrote the code.
2. Written merge ruling, pinned to the head commit.
3. PR published with that ruling; merge authorization pinned to the same commit.
4. Merge → the integration flips the item Done. See "when git and the board disagree" below.

**INTERIM MODE IS OVER (2026-08-03).** It existed because *"a hand-interpreted checklist is not
a merge licence"* — every green claim came from an agent transcribing its own local run. All
three conditions that were set for ending it have landed: `at:verify --expect` (AI4DEV-25),
the harness visible to tsc (AI4DEV-24), and CI on the PR head (AI4DEV-5) — now a **required**
status check named `verify` on `main`, so a red run cannot be merged at all.

An item agent may therefore merge its own work, on one condition that is not negotiable: **the
required CI check must be green on the exact head commit the merge decision pins.** Not a local
run, not an earlier head. Verify the run id against the head SHA before merging, and record
both. `strict` is false, so a branch need not be current with `main`; `enforce_admins` is false,
so the founder can still merge past a red check deliberately. Neither is a licence for an agent
to do so.
5. Post-merge check against merged `main`.
6. **Fold upward**: re-read the parent's children **fresh** (a sibling may have closed in a
   parallel session); all Done or Cancelled → parent folds; cascades upward. Cancelled counts
   as closed but every cancelled child is **listed by name**, so a quietly-cancelled item can
   never make a tree look complete. The cascade **stops below a requirement**.

### When git and the board disagree (founder question, 2026-08-02)

Closing depends on an asynchronous integration: the merge fires a webhook and Linear moves the
item. That transport can be slow, can drop, and can interleave with a sibling's merge.

**Git is the source of truth for merge state; Linear mirrors it.** So the rule is narrower than
"never set Done by hand" — which, stated that way, forbade the repair without providing one and
would strand an item In Progress forever. What is forbidden is **asserting a state that was
never observed**. If the pull request is verifiably merged — the commit is on `main`, the API
reports merged — then setting Done is not faking anything: the event happened and the evidence
is in hand. Repair from primary evidence, and **record it as a repair**, never as the
integration having worked.

| failure | handling |
| --- | --- |
| webhook slow | **bounded re-read (~30s)** before concluding anything. An instant check turns normal latency into a false alarm. |
| webhook dropped | merge confirmed in git → set Done, and say plainly the integration did not fire |
| branch names no item | cannot auto-close, ever. Prevented upstream: the branch comes from Linear verbatim and is validated to tokenise to exactly this item |
| **two siblings merging at once** | **confirm YOUR item is Done in Linear BEFORE reading the siblings.** That ordering is the whole fix: whoever finishes second necessarily observes the complete set, so the parent cannot be left unfolded by both sessions each seeing the other still open. Both folding is harmless — folding is idempotent. |
| crash between merge and fold | nothing repairs it in the moment; the backstop is that `/work` on any parent re-reads and folds. Drift self-heals on next touch. |
| Linear unreachable at merge | the merge still happened and the board is stale. Report it; the next `/work` reconciles. |

Deliberately absent: locks and transactions. For a handful of parallel sessions, converge-on-
re-read plus reconcile-on-next-touch is proportionate, and the cost of being wrong is a board
briefly behind — never lost work.

### Requirement evidence gate — pinned, not asserted

1. Exhaustive leaf snapshot at a named commit — every leaf listed with label and state.
2. Attribution resolved — refuse to close while the chain is unknown.
3. Acceptance suite green at integration tier at that commit, with named checks and timestamps.
4. Recorded founder attestation, with its date.
5. An explicit, recorded **waiver** path, so one flaky test cannot deadlock a requirement.

`/work` proposes. It never closes a requirement on its own.

## Phase E — release

Clear the held item, print `session is free`, report the phase's still-open siblings with
their labels, suggest the next `/work`. **Park** instead when stopping mid-item: commit WIP,
release, item stays In Progress, resume later with `/work AI4DEV-19`.

## Reflect on this skill — BEFORE the merge decision, not after

**Reflect while the pull request is still open.** The rule is that fixes found this way ride
along in the item's own PR; scheduling the reflection after the merge made that impossible, and
an item hit exactly that: by the time it was asked to reflect, its PR was closed and the only
way to deliver four real findings was to open a second one, which the ride-along rule forbids.
So the reflection belongs immediately **before** the merge decision, where its output can still
be committed to the branch.

**If a finding arrives after the merge anyway** — the audit turns something up late, or the
post-merge check does — do NOT open a second pull request for it. Report it to the coordinator,
which folds it into the way of work directly. A finding with nowhere to go is a finding that
gets dropped, and dropping it is worse than the small inconsistency of the coordinator carrying
it.

Answer in plain sentences: **did `/work` behave as intended on this item, and does it need a
fix?** Name what was awkward, what needed a rule that does not exist, and what a rule forced
that turned out to be wrong.

Fixes found this way **ride along in the current item's PR**. This is the mechanism by which
the way of work improves from use rather than from redesign sessions — and it is why the
ride-along rule exists at all.

Two failures this exists to catch, both already observed:
- A rule that cannot be followed (a step depending on a tool that is refused or unavailable)
  and gets quietly skipped instead of fixed.
- Ceremony out of proportion to the work, which is how a process stops being followed at all
  rather than being followed badly.

## Ride-along, and no nesting

**Ride-along. NEVER open a dev item for mechanics** (founder ruling 2026-08-02). Changes to the
machinery made while working an item ride along in **that item's branch and PR** — no new item,
no second PR, no exceptions for "it's small and clean". Listed in the PR body under "rides
along", covered by the same gates because they are in the same diff.

Qualifies: what the item needs; small corrections to machinery being used while using it;
anything the reflection step above turns up. Does not qualify: independent work that could
stand alone and costs real time — **filed, not built**.

The failure this replaces: a one-line rule change became its own board item, its own worktree,
its own branch and its own pull request in four minutes flat, bypassing every gate — while the
session was in the middle of designing the process it bypassed.

**No nesting.** One session, one branch, one item. `/work` at something else while one is open
refuses and offers three doors: finish, park, or file the new thing.

## Never

- Never invent a branch name; never set an item Done by hand; never close a requirement
  without the gate; never override the branch with a declared item; never silently pick between
  disagreeing signals; never delete a leaf that has work against it; never let the stamp fail
  quietly.
- PowerShell, never Bash. bun, never npm/pnpm. Loop tier stays database-free.
