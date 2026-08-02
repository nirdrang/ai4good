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

Reviewer pins, in each vendor's own vocabulary — **the ladders differ, and invalid values fall
back silently**:
- codex: `-c model=gpt-5.6-terra -c model_reasoning_effort=max` (ladder tops at `max`; `xhigh`
  is one tier below — believing otherwise already cost a real under-run)
- Kimi: `kimi -m kimi-code/k3 -p "<short>" --output-format text`, effort `high` from config

A finding is confirmed by the reviewer that raised it. Confirmation runs at `high`; a
confirmation asked to judge a *claim* rather than a fix is review work and gets `max`.

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
4. Merge → the integration flips the item Done. **Never set Done by hand**; if the integration
   did not fire, that is a discrepancy to report, not to tidy away.
5. Post-merge check against merged `main`.
6. **Fold upward**: re-read the parent's children **fresh** (a sibling may have closed in a
   parallel session); all Done or Cancelled → parent folds; cascades upward. Cancelled counts
   as closed but every cancelled child is **listed by name**, so a quietly-cancelled item can
   never make a tree look complete. The cascade **stops below a requirement**.

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
