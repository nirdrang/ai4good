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
| `/work AI4DEV-19` | build that item (phase B) |
| `/work AI4PM-12` | requirement — five states below |
| `/work explore` | declare deliberately untracked work |
| `/work` | **recommend and wait** |

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
2. Startability **blocks**: item missing, Done, Cancelled, or an open blocker → stop and say
   which. Attribution failures do **not** block — they print and continue.
2a. **If the walk finds no requirement above the item, ASK — once, here at pickup**
   (founder ruling 2026-08-02). Two failures that look alike must not be treated alike:

   | what happened | what to do |
   |---|---|
   | the walk **completed** and the item has no parent | **stop and ask.** The board is saying nothing is above this, which is a modelling gap and the founder is the one who can close it. |
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
    ├── mechanical subagents - sonnet - same worktree, same branch
    ├── gate reviewers    - codex TERRA @ max + Kimi k3 @ high, in the worktree
    └── pre-merge auditor - codex LUNA @ max, workspace-write, in the worktree
```

Terra reviews the code; luna audits the claim about it. A different vendor from the agent that
wrote the code, and a different variant from the one that reviewed it.

Spawned as: `Agent(subagent_type: "general-purpose", isolation: "worktree",
run_in_background: true, model: "fable", prompt: <the whole item brief>)`. The `isolation` line
is what creates the worktree; nothing else creates one.

**The item agent has FULL AUTHORITY over its item and never sends judgment back to the
coordinator** (founder ruling 2026-08-02: *"why does the item agent need judgment back to you —
these are free agents"*). It triages findings, rules on them, and decides what merges. An
earlier draft had it escalating to the coordinator, which would have made the parallelism fake:
three agents all queued behind one conversation, with the coordinator as the serializer.

What still leaves the item goes **to the founder directly, not through the coordinator** — a
finding that contradicts ratified text, scope growth, a disputed false-green tag. The
coordinator spawns and merges. That is the whole of its job.

Its subagents **inherit its worktree and branch** (tested: a child reported the identical
directory and branch, and read a file its parent had just written). The coordinator does not
review the work in place — it reads what the agent **published**, the pushed branch and the PR,
which is the same surface the founder reviews.

### Models (founder ruling 2026-08-02)

| role | model |
|---|---|
| **item agent — the orchestrator** | **fable**, falling back to **opus only when fable is out of credit** |
| everything mechanical — edits, publish, merge, housekeeping | **sonnet** |
| **the pre-merge auditor** | **codex `gpt-5.6-luna` @ `max`** — see below |
| gate reviewers | codex `gpt-5.6-terra` @ `max`, Kimi `k3` @ `high` |

Two tiers for our own agents, not three: judgment and mechanics. There is no separate premium
executor — the item agent drives the work itself and hands mechanical edits to sonnet. When the
fable fallback is used, **say so in the report**, because a fable item run and an opus item run
are not the same evidence.

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

### Three rules the testing forced

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

Brief → plan → **Gate 1** (codex refutes the plan) → triage → orchestrator checkpoint →
implement → **Gate 2** (codex + Kimi in parallel on the diff) → bounded fix cycles → verify.

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
- codex: `-c model=gpt-5.6-terra -c model_reasoning_effort=max` (ladder tops at `max`; `xhigh`
  is one tier below — believing otherwise already cost a real under-run)
- Kimi: `kimi -m kimi-code/k3 -p "<short>" --output-format text`, effort `high` from config

Useful codex flags, all verified present: `-C <dir>` sets the working root, `-o <file>` writes
the final answer to a file instead of leaving it to be scraped from stdout, and `--json` emits
events as JSONL.

Confirmation runs at `high`; a confirmation asked to judge a *claim* rather than a fix is
review work and gets `max`.

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

## Reflect on this skill, every item (founder ruling 2026-08-02)

Before the report, answer in plain sentences: **did `/work` behave as intended on this item,
and does it need a fix?** Name what was awkward, what needed a rule that does not exist, and
what a rule forced that turned out to be wrong.

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
