---
name: work
description: The one verb. Pick up work (a requirement or a dev item), build it, finish it. /work alone recommends and waits. Replaces /pm-next, /item-loop, /dev-start, /dev-end, /bind and /override.
---

# `/work` — the one verb

`/work` · `/work AI4DEV-19` · `/work AI4PM-12` · `/work explore`

One lifecycle, one entry point. Everything below is a phase inside this skill, never a second
verb. **Every rule here was paid for; the story behind any of them is in `lessons.md` beside
this file — read it when a rule seems wrong or is being challenged, not routinely.**

## Attribution — derived, never declared

A **declared** fact drifting from a **real** fact with nothing able to notice is the failure
class this whole design deletes. The system may say "I don't know"; it may never be confidently
wrong. So attribution derives from the branch — the branch is coupled to closure (its PR closes
that item), so a wrong branch surfaces as a wrong closure instead of hiding.

```
branch and held item disagree -> CONFLICT. Show both, ask. Never pick one.
branch names one item         -> that item; walk parents for the chain
branch names 2+               -> unresolved
branch names none, session HOLDS one -> that, marked held-not-branch
explicitly exploring          -> exploration
otherwise                     -> unattributed
```

- The **held item is a cross-check, never an answer** — it can raise CONFLICT or fill a gap,
  never override the branch.
- **Attribution never blocks building.** It blocks exactly one thing: closing a requirement.

## The agent never moves itself (founder 2026-08-02)

A session works where launched, on one branch, for the whole item. Serial work: switch the
branch in place. A second concurrent item: create a worktree and ask the founder to open a
session there — never teleport; never rely on a tool that moves the session.

## Phase A — decide what

| you type | what happens |
|---|---|
| `/work AI4DEV-19` | a LEAF — build it (phase B) |
| `/work AI4DEV-3` | a PARENT — list open children with short labels and blockers, note "N of M done", recommend one, **wait** |
| `/work AI4PM-12` | requirement — states below |
| `/work explore` | declare deliberately untracked work |
| `/work` | **recommend and wait** — resume held; else In Progress; else open leaves; else a new requirement. Top three, one-line reasons, recommend, wait |

**A dev item with children is a container, not work** (founder 2026-08-03). Check for children
BEFORE treating an id as buildable — parents close by folding, never by being built.

Requirement states: no decomposition file → propose writing `loop/decomp/req-0NN.md` as the
work; merged unclaimed → claim, **materialize the dev tree**, list leaves, wait; claimed with
open leaves → list, recommend, wait; all leaves closed → run the evidence gate and propose;
Done → say so. **Materialization** creates the dev root as a sub-issue of the requirement
(`parentId`), reads the decomposition at a merged commit, is idempotent by exact title, and
never removes a leaf that has work against it.

## Phase B — prepare the workspace

Read-only validation first; **the board claim happens last** so a failure cannot leave an item
falsely In Progress.

1. Resolve: id, short label, `gitBranchName`, state, blockers; walk `parent` up (depth cap 8,
   cycle detection); derive short labels for the whole chain. **Short label = strip the internal
   code, keep the meaning** — `AI4DEV-21 (fake Stripe, GitHub, Anthropic)`, never
   `(H5 vendor stand-ins)`. Two to five words a stranger could act on.
2. Startability blocks: missing, Done, Cancelled, open blocker → stop and say which.
   Attribution failures print and continue.
2a. **If the CHAIN'S ROOT has nothing above it, ask — once, at pickup. Check the ROOT, not the
   item** (a parented item can sit under a bare root and inherit the gap silently).
   - Walk completed, root bare (no requirement, no `attr:` label, no `standalone-root` marker)
     → **stop and ask** — a modelling gap only the founder can close.
   - Board unreadable → **do not ask** (a guess would be baked in permanently). Print
     `CHAIN UNRESOLVED`, carry on, retry at the next boundary.
   - Ask with ranked suggestions, never open-ended: (1) dev items that already have children;
     (2) an `AI4PM` requirement the text points at; (3) a free-text grouping label;
     (4) "standalone — its own root", always offered, always legitimate.
   - Record so it is asked once ever: parent chosen → `save_issue` sets `parentId`; free text →
     floating root; standalone → label `standalone-root`; declined → proceed rootless, don't
     ask again this session. The stamp hook itself never asks anything.
3. **Branch name from Linear's `gitBranchName` verbatim** — never invented; validate it
   tokenises to exactly this item. That is what makes the PR close the right item.
4. Serial: switch this folder. Concurrent: worktree + founder opens the session there.
5. Claim: assign, In Progress.
6. **Print the TRANSITION record the moment the branch changes** (the pre-prompt stamp
   describes the turn as it began): `TRANSITION <chain>` / `branch <name>  base <sha>`.
7. Journal each step so a crash is recoverable by reading, not guessing.

### Floating roots (founder 2026-08-02)

A free-text root answer is accepted **as-is** — a grouping for the attribution log with no
board item. Written **`~name`**; legal only as the ROOT of a chain; a real parent found later
always wins; recorded as a Linear label `attr:<name>` (a tag, not a parent — nothing is
created on the PM board).

## Running items in PARALLEL — one agent per item

The coordinator spawns ONE agent per item with worktree isolation; the platform creates the
worktree and the agent is **born inside it**, pinned to it.

```
coordinator (main checkout, never moves) - spawns, watches, merges. Nothing else.
└── item agent - FABLE @ xhigh - own worktree, own branch, FULL AUTHORITY
    ├── executor          - OPUS - writes the code, same worktree, same branch
    ├── mechanical        - sonnet - housekeeping, publish, merge, courier, liveness checks
    ├── gate reviewers    - codex TERRA @ max + Kimi k3 @ high, in the worktree
    └── pre-merge auditor - codex LUNA @ max, workspace-write, in the worktree
```

- Spawn: `Agent(subagent_type: "item-agent", isolation: "worktree", run_in_background: true,
  model: "fable", prompt: <the spawn prompt>)`. Fable out of credit → `subagent_type:
  "item-agent-opus", model: "opus"` — the fallback is a different agent TYPE, never a model
  override (effort lives in the definition file, not the call: `item-agent` = fable @ xhigh,
  `item-agent-opus` = opus @ max, founder 2026-08-04; the two files share one body,
  edit-both-or-neither). `--fallback-model` never fires on billing errors, so the handoff is
  manual and **stated in the report**.
- **A spawn prompt is: the item id, what has already happened, and item-specific deltas.
  Nothing else.** It states what to RESOLVE, never a resolved value — no chain, no parent, no
  label, nothing the agent can read for itself. No gate ever reads a spawn prompt.
- **Print the item's stamp to the founder at start** (founder 2026-08-03): run
  `$env:CLAUDE_PROJECT_DIR=<worktree>; powershell -NoProfile -File loop/work/stamp-hook.ps1`
  and paste as emitted — including `CHAIN UNRESOLVED`; honest-unresolved beats invented.
- **The item agent has FULL AUTHORITY and never sends judgment to the coordinator** (founder
  2026-08-02). To the founder go exactly two things: a finding that contradicts ratified text,
  and scope growth. **A reviewer's unearned-green claim that the item agent dismisses rather
  than fixes is the item agent's own terminal ruling** (founder 2026-08-04), under two
  non-optional conditions: the claim recorded verbatim beside the ruling and visible in the PR
  body, and the ruling states what the green does and does not claim.
- Subagents inherit the worktree and branch. The coordinator reads only what is **published** —
  the pushed branch and the PR.
- A correction that matters beyond this conversation lives only if written into a file every
  session loads (skill, agent definition, CLAUDE.md, memory) — a message to a running agent
  dies with it.

### Models

| role | model | does |
|---|---|---|
| item agent | fable @ xhigh (fallback: `item-agent-opus` opus @ max) | judgment only, no code: plan, rulings, merge decision |
| executor | opus | the code: implements the amended plan, triages first-hand, fixes |
| mechanical | sonnet | housekeeping, publish, merge execution, courier, waiting-room checks |
| Gate 1 | codex `gpt-5.6-sol` @ `xhigh` (founder 2026-08-05) | refutes the plan, intent included |
| Gate 2 | codex `gpt-5.6-terra` @ `max` + Kimi `kimi-code/k3` @ `high` | adversarial diff review |
| auditor | codex `gpt-5.6-luna` @ `max`, `--sandbox workspace-write` | independent pre-merge re-run |

Premium credits buy decisions, not keystrokes; the orchestrator never implements. The executor
escalates to its own item agent, never the coordinator. The codex effort ladder tops at `max`
(`xhigh` is one below); Kimi's is `low|high|max`; invalid values fall back SILENTLY — pins are
load-bearing config, changed only in reviewed commits.

### The auditor

Luna independently re-runs verification before merge — the agent claiming green is the one
being checked. `workspace-write` is load-bearing: under `read-only` the audit silently degrades
into a documentation review that looks like a pass. Run detached. It reports; the item agent
rules. Codex unavailable → fresh-context sonnet auditor, named as such. Known boundary: in a
platform worktree the sandbox denies vitest's ancestor-directory walk — read that signature as
COULD-NOT-VERIFY-IN-SANDBOX, take execution evidence from the PR's CI run, and say so.

```
codex exec --sandbox workspace-write -C <worktree> -c model=gpt-5.6-luna \
  -c model_reasoning_effort=max -o <worktree>/loop/items/<ITEM>/premerge-audit.md "<brief>"
```

### Hard-won rules (stories in lessons.md)

- Judge a detached reviewer's liveness by ITS OWN artifacts growing over an interval — never a
  process scan, never someone else's observation, never the `-o` file (written once, at the
  end; the session transcript grows continuously). Verified-empty after completion = one
  relaunch, then rule the gate unavailable in writing.
- NEVER resume an agent after it has FINISHED — its worktree is gone and it silently falls back
  to the main checkout. A waiting agent stays alive.
- Push at every phase boundary; death may be involuntary; the remote is the only durable output.
- Never hand an agent a worktree you created — the isolation guard bricks its shell.
- PowerShell keeps no state between tool calls — dot-source and use in the SAME command.
- A fresh worktree has no `node_modules` — `bun install --frozen-lockfile` before first run.

## Token discipline (founder 2026-08-04)

- **Park once per phase, wake once per phase.** A parked item agent's resume replays its whole
  transcript, so wake-ups are the expensive unit. Launch a phase's detached work as one batch,
  tell the coordinator in the parking message exactly which FILES complete the phase, and be
  woken once when the set is complete — not per file. A detached process notifies nobody, ever.
- **Your PRIMARY alarm is your own tracked child.** Before parking, start a tracked
  background shell (an until-loop on the phase's files that then exits) — a tracked child's
  completion re-invokes you directly, costing the coordinator nothing. The coordinator's
  file-watch is the BACKSTOP, not the mechanism.
- **Detached must mean SURVIVES-THE-LAUNCHER.** A reviewer launched as a child of your shell
  dies with you (observed: two confirmation runs silently died with a session-limited agent
  and stalled the item for hours). Launch OS-detached (`Start-Process`), then verify the
  process is alive by its own artifact growing before you park.
- **A watch expiring with nothing landed is a SIGNAL, not a shrug.** Investigate immediately —
  silence looks identical to progress, and the one time it was shrugged off cost four idle
  hours. Every watch names its expiry as the investigate-now trigger.
- **Mechanics never run in premium context.** Liveness checks, file polling, header reads,
  publish/merge execution — sonnet children or the coordinator's shell, never the item agent's
  own turns.
- **Reviewer output files are findings only.** Codex: `-o` gives that. Kimi: pointer-prompt it
  like codex (it reads the tree — never embed the diff) and require the findings section as the
  whole output. The item agent reads verdicts, not transcripts.
- **Folds are batched.** Way-of-work fixes accumulate into one daily fold PR — unless a live
  agent needs the rule now.
- **Plumbing questions get filesystem/config answers.** An agent probe (~33K tokens each) is
  the last resort, justified only when the answer lives inside an agent's context.

## Phase C — build

**Plan** (the item agent's own, from the Linear item, spec and code) → **Gate 1** (sol refutes
it, intent included) → rulings → implement → **Gate 2** (terra + Kimi in parallel on the diff)
→ fix round → **the item agent rules each finding's disposition** → verify.

**There is no brief and no Gate 0** (founder 2026-08-04). The item agent IS the planner; ONE
plan carries decisions, steps, and expected verification state per AT id. The executor
implements the amended plan and writes no second one.

### Gate 1 — sol refutes the plan, intent included

Attack both layers: a decision stated as settled that is not decided; a fact wrong against the
code (verify claims in the tree, never trust them); a constraint contradicting the skill; scope
forcing a mid-flight redesign; anything no tool can do — **a plan that cannot be executed as
written is this gate's target failure**; and the plan's teeth — steps missing the
done-criterion, oracles too weak to prove what they claim, greens that would not mean what the
item says. **Item-specific prompt content is ADDITIVE ONLY** — more files, more risks, never
fewer attack directions.

**Proportionality** (founder 2026-08-02): documentation items or already-reviewed designs run a
single focused gate on the actually-code part — and say so in the report.

### Reviewer mechanics

- **Detached, in the worktree, against the real tree** — never foreground (ten-minute ceiling
  kills max-effort runs), never an exported diff (a reviewer is a process with a working
  directory; pointer-prompt it to files).
- **There is NO confirmation step** (founder 2026-08-05). Reviewers are not re-engaged to
  approve fixes. After the fix round the item agent rules each finding — closed by the fix, or
  rejected with a written reason — and the checks on the fixes are the ones that already
  exist: the verify suite, luna's independent audit, and the required CI check on the pinned
  head.
- **Re-engaging a reviewer at all** (rare — recovering a lost output, or a fresh scoped review
  of changed material): resume its own session; pin model, effort and sandbox; **verify the
  RUN HEADER** — an unpinned resume runs CLI defaults, and one once silently ran as the wrong
  model. A lost output may already exist in the vendor's session store — recover rather than
  re-derive, and verify whose it is. codex `resume` rejects `-C`; Kimi resumes only in the
  directory that created the session (exit 199 otherwise; placeholder-directory workaround).
- Pins: Gate 1 `-c model=gpt-5.6-sol -c model_reasoning_effort=xhigh` (founder 2026-08-05) · Gate 2
  `-c model=gpt-5.6-terra -c model_reasoning_effort=max` · Kimi
  `kimi -m kimi-code/k3 -p "<short>" --output-format text` (effort from config).
- Launch folklore: short prompt on the command line, material in a file; capture `-o` plus
  stderr to a file; `-p` is incompatible with `--auto`/`--yolo`; **content is the test, not
  size** — a progress line is not a critique, check findings and exit code; committed reviewer
  prompts carry repo-relative paths, never worktree paths.
- **ONE WRITER IN A WORKTREE AT A TIME.** While a workspace-write reviewer or auditor runs,
  nothing else mutates that tree; confirm a reviewer dead by PROCESS ID, not wrapper exit, not
  an empty file.

### A ruling that REMOVES work carries a verification condition

Attach a condition the executor checks before removing; restore if it fails. Removals are the
rulings least likely to be re-examined — a condition is what keeps them falsifiable.

## Committing — `.claude/` and `loop/out/` are GITIGNORED

New files under either will not stage and `git add -A` reports nothing wrong. `git add -f
<path>`, then read `git status --short` and confirm the `A` line before committing.

## Phase D — finish

A completion signal is always **outside the agent's own claim**: leaf = PR merged AND Linear
flipped Done; parent = every child closed, re-read fresh; requirement = the evidence gate.

1. Independent re-verification by a fresh-context agent — never the author.
2. Written merge ruling pinned to the head commit.
3. PR published with the ruling; authorization pinned to the same commit.
4. Merge → the integration flips the item Done. **Interim mode is over (2026-08-03)**: an item
   agent may merge its own work on one non-negotiable condition — the required `verify` check
   green on the exact pinned head (verify run id against head SHA; record both). Auto-merge is
   enabled: queue `gh pr merge --auto --merge` at PR-open. `strict` and `enforce_admins` are
   false by design; neither is an agent licence to merge past red.
5. Post-merge check against merged `main`.
6. **Fold upward**: re-read the parent's children FRESH; all Done/Cancelled → fold, cascading,
   stopping below a requirement; every cancelled child listed by name.

### When git and the board disagree

**Git is truth for merge state; Linear mirrors it.** Forbidden is asserting a state never
observed — repairing from primary evidence, recorded as a repair, is not that. Webhook slow →
bounded ~30s re-read. Dropped → merge confirmed in git → set Done and say the integration
did not fire. Two siblings merging → confirm YOUR item Done in Linear BEFORE reading siblings
(whoever is second sees the complete set; folding is idempotent). Crash between merge and fold
→ the next `/work` on any parent re-reads and folds. No locks by design — converge on re-read.

### Requirement evidence gate — pinned, not asserted

Exhaustive leaf snapshot at a named commit · attribution resolved · suite green at integration
tier at that commit with named checks and timestamps · recorded founder attestation with date ·
an explicit recorded waiver path. `/work` proposes; it never closes a requirement alone.

## Phase E — release

Clear the held item, print `session is free`, report open siblings with labels, suggest the
next `/work`. **Park** mid-item: commit WIP, release, item stays In Progress.

## Reflect on this skill — BEFORE the merge decision

Reflect while the PR is open, so fixes ride along in it. A post-merge finding goes to the
coordinator to fold directly — never a second PR. Answer plainly: did `/work` behave as
intended, and does it need a fix? Watch for the two known failure shapes: a rule that cannot
be followed and gets skipped, and ceremony out of proportion that stops the process being
followed at all.

## Ride-along, and no nesting

Machinery changes made while working an item ride along in that item's branch and PR, listed
under "rides along" — never a new dev item (founder 2026-08-02). Independent standalone work is
**filed, not built**. One session, one branch, one item; `/work` at something else while one is
open offers finish, park, or file.

## Never

- Never invent a branch name; never set an item Done by hand (outside the documented repair);
  never close a requirement without the gate; never override the branch with a declared item;
  never silently pick between disagreeing signals; never delete a leaf with work against it;
  never let the stamp fail quietly.
- PowerShell, never Bash. bun, never npm/pnpm. Loop tier stays database-free.
