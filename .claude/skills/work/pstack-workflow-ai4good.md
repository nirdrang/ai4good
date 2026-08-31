# The pstack workflow for ai4good

This file describes how ai4good runs one board item through open-pstack. This is workflow v2.
The file is live: it describes the machinery as it stands on main today. If you change any part
of the pstack flow, update this file in the same commit. Section 12 lists every change.

One document, three kinds of content, kept apart by section: sections 2 to 4 are reference and
only describe. Sections 5 to 9 explain the choices behind the reference. Section 10 is the
bring-up procedure.

Source of the pstack facts: [open-pstack](https://github.com/ericlitman/open-pstack) v1.2.0 as
installed in [`~/.claude/plugins/cache/open-pstack/pstack/1.2.0/`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/),
read file by file in session `ebf2407e` on 2026-08-27 to 2026-08-29. Founder rulings carry a
date and, where a message exists, a quote.

Every file reference is a link. Repository files link by relative path. Files outside the
repository link to this PC's copy with a `file:///` address.

Names used throughout. The **controller** is the local Claude Code session on this PC, started
on branch `main`. The **mechanic** is the same session after the hand-off, running poteto-mode
in the item's worktree, or a cloud session when asked for. Inside the mechanic, pstack calls
the top-level model the **lead**. A **sheet role** is one row of
[`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md). A **family** is
one row of the model matrix.

---

## 1. Installation status on 2026-08-31

| piece | state |
|---|---|
| plugin `pstack@open-pstack` v1.2.0 | installed and enabled in [`.claude/settings.json`](../../settings.json) |
| pstack session-start hook ([`hooks/hooks.json`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/hooks/hooks.json)) | live. The founder keeps it (2026-08-29). |
| model sheet [`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md) | WRITTEN 2026-08-31, the first-write column, per-role efforts. Five families probed green; the grok probe FAILED at opencode's 4.6 upstream and the founder ruled keep-and-mark. Re-probe grok before its first real use. The record: [`pstack-setup-2026-08-31.md`](../../../loop/drills/records/pstack-setup-2026-08-31.md). |
| the model matrix | edited in the plugin cache on 2026-08-31: grok through the codex router, opus default max, deepseek and glm added. Six families. Re-apply after a plugin update. |
| sheet shape for the first write | settled. The first-write column of the sheet-roles table in section 3, decided row by row on 2026-08-30 and 2026-08-31. |
| the v1 hooks | stamp and local banner parked. Branch guard ([`guard-branch-switch.ps1`](../../../loop/work/guard-branch-switch.ps1)) live and skipped on cloud. Cloud banner ([`session-start-banner.sh`](../../hooks/session-start-banner.sh)) live on remote only. |
| verification skill [`verify-ai4good`](../verify-ai4good/) | not generated |
| controller skill `/controller` | written ([`.claude/skills/controller/SKILL.md`](../controller/SKILL.md)). Not yet run on an item. |

## 2. The shape: one session, controller then mechanic

The chart shows every step of every phase. A step that runs on a sheet role carries the role
and its model on a second line, as of the current sheet. The sheet-roles table in section 3 is
the source. "Lead (fable)" is the session's own model. Section 3 gives the same stations as a
table.

To check that the chart still draws after an edit, run
[`loop/work/render-mermaid.ps1`](../../../loop/work/render-mermaid.ps1)
`-Markdown .claude/skills/work/pstack-workflow-ai4good.md`. It fails on a syntax error.

```mermaid
flowchart TB
  subgraph CTRL["Controller. This session, on main. /controller ID"]
    direction TB
    subgraph PA["Phase A. Decide what"]
      direction TB
      A1["Read the item on Linear: id, label, branch name, state, blockers"]
      A2["Walk up the parents. Label every link"]
      A3["Stop if the item is missing, Done, Cancelled, or blocked"]
      A4["Root with no parent? Ask the founder once"]
      A1 --> A2 --> A3 --> A4
    end
    subgraph PB["Phase B. Start the item"]
      direction TB
      B1["Create the branch from origin/main"]
      B2["Create the worktree .claude/worktrees/ITEM"]
      B3["Only one item at a time on this PC"]
      B4["Claim on Linear: assign, In Progress"]
      B5["Write the brief: chain, PRD slice, item text, acceptance tests, the ask, the evidence bar"]
      B6["Commit the brief on the branch. Push"]
      B7["Move this session into the worktree with EnterWorktree.<br/>Cloud: run claude --cloud from the worktree instead"]
      B8["Hand over. The founder types /pstack:poteto-mode with the brief"]
      B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7 --> B8
    end
    subgraph PW["While the lead works"]
      direction TB
      W1["Local: the founder talks to the lead here.<br/>The controller waits for /controller done"]
      W2["Cloud: gh pr list finds the pull request.<br/>claude -p --cloud sends rulings"]
      W3["No timers. No wake-ups"]
      W1 --> W2 --> W3
    end
    subgraph PC["Phase C. /controller done ID. The board"]
      direction TB
      K1["Check on Linear that the item is Done.<br/>If not, repair from the merge and say so"]
      K2["Clear the held item"]
      K3["Fold the parent when all its children are Done or Cancelled"]
      K4["Judge the Not done here list as filing candidates. The founder files"]
      K5["Print session is free. Suggest the next item"]
      K1 --> K2 --> K3 --> K4 --> K5
    end
    PA --> PB
  end

  subgraph MECH["Mechanic. Same session, in the worktree, poteto-mode"]
    direction TB
    subgraph S1["1 Ground. /how"]
      direction TB
      G1["Lead (fable) splits the question into 2 to 4 slices"]
      G2["One explorer per slice, read-only<br/>how explorer = sol@high"]
      G3["One explainer merges the notes into one explanation<br/>how explainer = fable@max"]
      G5["Critics, always. Each gets the explanation, the paths, and the 6-lens rubric<br/>how critics = fable@max, sol@max, grok@xhigh, deepseek@max, glm@max, opus@xhigh"]
      G6["Lead (fable) rules each finding: Act on, Consider, Noted, Dismissed"]
      G1 --> G2 --> G3 --> G5 --> G6
    end
    subgraph S2["2 Design arena. /architect and /arena"]
      direction TB
      D1["Lead (fable) writes a rubric of 3 to 6 criteria. Runners never see it"]
      D2["Runners each design the whole thing, with a rationale. The lead assigns each runner a distinct structural direction<br/>architect runners = fable@max, sol@max, grok@xhigh, opus@xhigh, deepseek@max, glm@max"]
      D3["Lead (fable) screens each design for red flags:<br/>shallow module, information leakage, temporal decomposition, pass-through"]
      D4["One judge scores each design against the rubric. Its provider differs from the lead's and the front-runner's<br/>arena cross-judge pool = sol@max, grok@xhigh, deepseek@max, glm@max. Opus@max only when the others drop out"]
      D5["Lead (fable) reads every design, picks a base, grafts the best parts of the others"]
      D6{"Do the designs agree?"}
      D7["Lead (fable) reframes the task and runs the arena again"]
      D1 --> D2 --> D3 --> D4 --> D5 --> D6
      D6 -- no --> D7 --> D2
    end
    subgraph S3["3 Throughput checkpoint. Lead (fable) writes four todos"]
      direction TB
      T1["Todo 1. Which steps must finish before anything runs in parallel?"]
      T2["Todo 2. Which parts can run in parallel?<br/>Different files: yes. Same files: one after another"]
      T3["Todo 3. Where would two writers touch the same state? Split it first"]
      T4["Todo 4. What is the smallest safe split? One writer only? Say why"]
      T1 --> T2 --> T3 --> T4
    end
    subgraph S4["4 Write. One unit at a time"]
      direction TB
      X1["Lead (fable) writes the unit brief: the files it may touch, the data shape, the acceptance criteria"]
      X2["Lead spawns one writer in its own worktree, isolated-write<br/>feature, refactoring = opus@max<br/>bug-fix, perf-issue, hillclimb = sol@max<br/>A unit that still has a real shape choice, such as error handling, an abstraction layer, or test structure, goes to the arena instead"]
      X3["Writer writes the failing test first"]
      X4["Writer watches it fail"]
      X5["Writer makes it pass. Commits"]
      X6["Writer reports: done, BLOCKED, deviations, or partial"]
      X7{"Clean report?"}
      X8["Lead (fable) escalates: a fresh writer, or<br/>hardest tasks = fable@max,<br/>or re-arena, or scrap. Two retries, then replan"]
      X1 --> X2 --> X3 --> X4 --> X5 --> X6 --> X7
      X7 -- no --> X8 --> X2
    end
    subgraph S5["5 Diff against the design"]
      direction TB
      R1["Lead (fable) reads the diff against the design"]
      R2["Each deviation is one of: design wrong, requirement missed, writer overreached"]
      R3{"A pattern of deviations?"}
      R1 --> R2 --> R3
    end
    subgraph S6["6 Verify on the real surface"]
      direction TB
      V1["The mechanical agent (sonnet) drives verify-ai4good: launch, doctor, drive the feature, capture the evidence.<br/>The skill is its exact instructions"]
      V2["Cloud evidence: HTTP responses and database side effects.<br/>Headless Playwright where the sandbox has it"]
      V3{"Lead (fable) reads the evidence. Proof in hand?"}
      V4["Not done. Back to the unit"]
      V1 --> V2 --> V3
      V3 -- no --> V4 --> X1
    end
    subgraph S7["7 Sequence"]
      direction TB
      Q1["Lead (fable) decides the commit order and writes the exact rebase plan"]
      Q1b["The mechanical agent (sonnet) executes the rebase, then builds and tests every commit alone"]
      Q2["Lead (fable) reads the mechanical's per-commit report once"]
      Q1 --> Q1b --> Q2
    end
    subgraph S8["8 Interrogate. /interrogate"]
      direction TB
      I1["Lead (fable) scopes the diff and writes the intent paragraph"]
      I2["Reviewers, read-only, the same rubric each<br/>interrogate reviewers = fable@max, sol@max, grok@xhigh, opus@xhigh, deepseek@max, glm@max"]
      I3["Lead (fable) merges the findings: consensus, duplicates out, disagreements listed"]
      I4["Lead (fable) rules each finding: Act on, Consider, Noted, Dismissed"]
      I5{"Any Act on?"}
      I6["A writer fixes it. The new head voids the verdict"]
      I1 --> I2 --> I3 --> I4 --> I5
      I5 -- yes --> I6 --> I2
    end
    subgraph S9["9 Ship. opening-a-pr"]
      direction TB
      P1["Lead (fable) runs deslop, no-comments, unslop"]
      P2["Conventional commit messages<br/>judgment and prose = fable@max"]
      P3["Pull request body: Why, Scope, Tradeoffs, Blast Radius, Verification, Not done here<br/>judgment and prose = fable@max"]
      P4["No other item's id in the title or body"]
      P5["Open the pull request. Never a draft"]
      P1 --> P2 --> P3 --> P4 --> P5
    end
    subgraph S10["10 Close. The lead does the git part"]
      direction TB
      C1{"CI green on the exact head, and the founder said merge?"}
      C2["The mechanical agent (sonnet) runs gh pr merge --squash.<br/>The pull request link closes the item on the board"]
      C3["Leave the worktree with ExitWorktree. The mechanical agent removes it and deletes the remote branch"]
      C4["Invoke /controller done ITEM"]
      C1 -- yes --> C2 --> C3 --> C4
      C1 -- not yet --> C1
    end
    P5 --> C1
    G6 --> S2
    D6 -- yes --> S3
    T4 --> X1
    X7 -- yes --> R1
    R3 -- yes --> D1
    R3 -- no --> V1
    V3 -- yes --> Q1
    Q2 --> I1
    I5 -- no --> P1
  end

  B8 -- "the lead's checkout is the item branch" --> G1
  C4 -- "the board goes back to the controller" --> K1
  K5 -- "next item, same session" --> A1
```

The controller owns the board, the branch, and the brief. The mechanic owns everything from
the brief to the merge. The cloud environment runs the Supabase pool in Docker and holds codex
and opencode credentials.

The controller's manual is [`.claude/skills/controller/SKILL.md`](../controller/SKILL.md). The
mechanic is never a subagent. The founder talks to the lead directly (founder ruling
2026-08-29: "i dont like it that i cant interact with the lead. i want to run the controller it
finshed with the brief and them i run the pstack poteto mode on that session"). Two shapes:

- **Local, the default for the first run.** One session. `/controller <id>` creates the branch
  and the worktree `.claude/worktrees/<item>`, commits the brief, moves the session into the
  worktree with `EnterWorktree`, and stops. The founder types
  `/pstack:poteto-mode Read loop/items/<item>/brief.md and follow it.` in the same session.
  The lead closes the git side (founder 2026-08-29: "I want the lead to do it"): when CI is
  green on the exact head and the founder says "merge", it merges, leaves the worktree with
  `ExitWorktree`, removes it, and deletes the remote branch. Its last closing step invokes
  `/controller done <id>`, and that verb steers the board: confirm Done, clear the held item,
  fold the parent, judge the filing candidates, print `session is free` (founder: "Lead closes
  but linear steering is the controller work"). There is no second local run of the suite.
  The session's move between folders is the one exception to the rule that a session works
  where it was launched.
- **Cloud, on `/controller <id> cloud`.** The session stays in the main folder and runs
  `claude --cloud` from the worktree, because a cloud session clones the remote at the current
  directory's branch. The founder talks to it on claude.ai. The controller sends follow-ups
  with `claude -p "<message>" --cloud <session-id>`.

**One database per machine, no slot pool.** Local and cloud alike set `AT_DB_SLOT=1` (the
project `.claude/settings.json` env block locally, the environment variables on cloud). One
item runs at a time on this PC. Parallel items run as cloud sessions, each VM with its own
database (founder 2026-08-29: "Clear the dB slot mechanism all together"). The v1 slot pool
scripts stay parked with v1.

Work that the mechanic discovers does not ride along. The mechanic lists it in its report. The
controller judges each entry as a filing candidate. The founder files items.

## 3. The nine stations

Each row gives the station, who acts, the sheet roles it uses, and the station's loop or exit.
The models behind each role are in the sheet-roles table below. "Lead" in the role column
means the lead does the work itself and no sheet role applies.

| # | station | who acts | sheet roles | loop or exit |
|---|---|---|---|---|
| 1 | Ground ([`/how`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/how/SKILL.md)) | Two to four explorers with disjoint slices, then one explainer, then the critics. The critics run on every item: the brief asks for the ground in critique mode (founder 2026-08-30). | `how explorer`, `how explainer`, `how critics` | The lead rules each critic finding: Act on, Consider, Noted, or Dismissed. |
| 2 | Design arena ([`/architect`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/architect/SKILL.md), [`/arena`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/arena/SKILL.md)) | Runners fan out, each with a rationale. The lead assigns each runner a distinct structural direction, so smart models do not converge on the same respectable design. When the item has a wide solution space, it touches more than one subsystem or adds a data shape, the lead adds deepseek@max and glm@max lanes. The judge scores against a rubric of three to six criteria that the runners never see. The design-red-flags screen runs on every candidate. The lead reads every candidate end to end, picks a base, and grafts the best parts of the others. | `architect runners`, `arena runners`, `arena cross-judge pool` | If the candidates converge, ship the design. If they diverge, reframe the task and run the arena again. |
| 3 | Throughput checkpoint | The lead writes four todos. A todo that does not apply stays as `n/a: <reason>`. | Lead | None. |
| 4 | Write | One delegated writer per unit, in its own worktree, in isolated-write mode. The writer is a leaf and spawns nothing. The writer first writes the failing test from the lead's acceptance criteria, watches it fail, then implements. A unit that still has a real shape choice, such as error handling, an abstraction layer, or test structure, goes to the arena instead of one writer. | `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `hardest tasks` | The writer reports `BLOCKED`, a list of deviations, or a partial result at its time limit. The lead escalates (section 6). |
| 5 | Diff against the sketch | The lead reads the diff against the design. Each deviation is one of: the sketch was wrong, a requirement was missed, or the writer overreached. | Lead | A pattern of deviations sends the item back to station 2. |
| 6 | Verify | The `mechanical` agent drives [`verify-ai4good`](../verify-ai4good/) on the real surface: the skill is its exact instructions. On cloud the evidence is HTTP responses and database side effects. Headless Playwright is used where the sandbox provides it. The lead reads the evidence and gives the verdict. | `mechanical` drives, lead judges | No proof means not done. |
| 7 | Sequence | The lead decides the commit order and writes the exact rebase plan. The `mechanical` agent executes it, then builds and tests every commit alone. The lead reads the per-commit report once. Tool-heavy work without judgment never spends the lead's calls (founder 2026-08-30). | Lead decides, `mechanical` executes | None. |
| 8 | Interrogate ([`/interrogate`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/interrogate/SKILL.md)) | A read-only panel. Every reviewer gets the same rubric. The lead merges the consensus, removes duplicates, and rules on each finding. The writer's own family stays seated for recall, and the lead reads its silence as weak evidence: a cross-family consensus is what clears a diff. | `interrogate reviewers` | pstack has no re-clearance loop. Our rubric adds one line: "A changed head voids the verdict. Re-panel." |
| 9 | Ship ([`opening-a-pr`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/playbooks/opening-a-pr.md)) | The lead runs deslop, no-comments, and unslop, writes conventional commits, and fills the sections Why, Scope, Tradeoffs, Blast Radius, and Verification. The pull request is never a draft. Opening a pull request and babysitting it are two verbs. | `judgment and prose` | Babysit is not used here. It is a second way to close work, which the way of work forbids. |

The verbs fix-ci, deslop, and recall run on the lead with no pin. pstack has no verifier role.
The verifier rule is a line in the user-level [`CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md) (section 5).

The critic rubric ([`critique-rubric.md`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/how/references/critique-rubric.md)) has six lenses: abstraction fit, data model, boundary discipline, evolution
readiness, complexity against value, and consistency. A critic uses the lenses that apply.

### The sheet roles

The sheet [`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md) has one row per role. The table gives every documented
role with three values. **pstack default** is the first-run value the plugin ships. **First
write** is what `/pstack:setup-pstack` wrote on 2026-08-31. **Current** is the founder's
batch ruling later the same day. The current column is the deployed sheet, mirrored in
[`loop/work/pstack-models.expected.md`](../../../loop/work/pstack-models.expected.md) and
checked by [`loop/work/sheet-check.ps1`](../../../loop/work/sheet-check.ps1).

Descriptor shorthand: `fable` is `claude:claude-fable-5`, `sol` is `codex:gpt-5.6-sol`, `grok`
is `codex:opencode-go-responses/grok-4.6`, `opus` is `claude:claude-opus-5`, `deepseek` is
`codex:opencode-go/deepseek-v4-flash`, and `glm` is `codex:opencode-go/glm-5.3-flash`. A list is a
panel, and the list length is the fan-out count. The judge pool is the one exception: only one
entry runs per arena.

| sheet role | station | pstack default | first write | current |
|---|---|---|---|---|
| `feature, refactoring` | 4 | grok@xhigh | grok@xhigh | opus@max |
| `bug-fix` | 4 | sol@max | sol@xhigh | sol@max |
| `perf-issue` | 4 | sol@max | sol@xhigh | sol@max |
| `hillclimb` | 4 | sol@max | sol@xhigh | sol@max |
| `hardest tasks` | 4 | fable@max | fable@max | fable@max |
| `judgment and prose` | 9 | fable@max | fable@high | fable@max |
| `how explorer` | 1 | grok@xhigh | sol@high | sol@high |
| `how explainer` | 1 | fable@max | fable@high | fable@max |
| `how critics` | 1 | fable@max, sol@max, grok@xhigh, opus@xhigh | sol@max, grok@xhigh, deepseek@max, glm@max | fable@max, sol@max, grok@xhigh, deepseek@max, glm@max, opus@xhigh |
| `why investigators` | not a station | inherit-parent | inherit-parent | opus@max |
| `why synthesizer` | not a station | inherit-parent | inherit-parent | fable@max |
| `reflect tooling, judgment, divergent, synthesizer` | not a station | inherit-parent | inherit-parent | fable@xhigh |
| `arena runners` | 2 | fable@max, sol@max, grok@xhigh, opus@xhigh | fable@max, sol@max, grok@xhigh | fable@max, sol@max, grok@xhigh, opus@xhigh, deepseek@max, glm@max |
| `arena cross-judge pool` | 2 | fable@max, sol@max, grok@xhigh, opus@xhigh | sol@max, grok@xhigh, deepseek@max, glm@max, opus@max | sol@max, grok@xhigh, deepseek@max, glm@max, opus@max |
| `swarm workers` | any `/swarm` call | grok@xhigh | grok@xhigh | opus@xhigh |
| `architect runners` | 2 | fable@max, sol@max, grok@xhigh, opus@xhigh | fable@max, sol@max, grok@xhigh | fable@max, sol@max, grok@xhigh, opus@xhigh, deepseek@max, glm@max |
| `interrogate reviewers` | 8 | fable@max, sol@max, grok@xhigh, opus@xhigh | fable@max, sol@max, grok@xhigh, deepseek@max, glm@max | fable@max, sol@max, grok@xhigh, opus@xhigh, deepseek@max, glm@max |

The `why` and `reflect` rows are pinned since the batch ruling of 2026-08-31, and the why row
splits because its two roles carry different values. All of these roles run on native Claude
lanes, which keep the MCP surface the skills need. grok has no `max`
in its selectable efforts, so its panel lanes stay at `xhigh`. Every model decision and every
measured finding is in [`pstack-model-selection.md`](pstack-model-selection.md).

## 4. The model matrix as it will be configured

The shipped matrix lives in [`provider-dispatch.md`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/references/provider-dispatch.md)
(source: [GitHub](https://github.com/ericlitman/open-pstack/blob/main/skills/poteto-mode/references/provider-dispatch.md)). One row changes.

| family | provider | model | default effort | selectable efforts | route |
|---|---|---|---|---|---|
| fable | claude | claude-fable-5 | max | low, medium, high, xhigh, max | native agents `pstack-fable-<effort>` |
| sol | codex | gpt-5.6-sol | max | low, medium, high, xhigh, max | external runner |
| grok | codex | opencode-go-responses/grok-4.6 | xhigh | low, medium, high, xhigh | external runner. Our change (founder 2026-08-29). |
| opus | claude | claude-opus-5 | max | low, medium, high, xhigh, max | native agents `pstack-opus-<effort>`. Our change: the shipped default is xhigh (founder 2026-08-30). |
| deepseek | codex | opencode-go/deepseek-v4-flash | high | low, high, max | external runner. Our addition (founder 2026-08-31). |
| glm | codex | opencode-go/glm-5.3-flash | high | low, high, max | external runner. Our addition (founder 2026-08-31). |

The matrix edits live in one plugin cache file,
[`provider-dispatch.md`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/references/provider-dispatch.md).
A plugin update reverts that file. Re-apply the rows after every update; the file itself
carries a note saying so. Setup asks one effort question per family, six here.

The sheet [`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md) maps
each role to one or more descriptors of the form `provider:model@effort`.
[`/pstack:setup-pstack`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/setup-pstack/SKILL.md)
writes the sheet and adds one line, `@~/.claude/pstack-models.md`, to the user-level
[`~/.claude/CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md). The project
[`CLAUDE.md`](../../../CLAUDE.md) is never touched. A role name that the sheet does not document is "inconsistent state" and
stops setup.

Other router models available for later trials: `opencode-go/deepseek-v4-pro` (high, max),
`opencode-go/glm-5.3` (high, max), `opencode-go/kimi-k3` (low, high, max), `gpt-5.6-luna` and
`gpt-5.6-terra` (low to max). This list is partial.
[`~/.codex/codex-router/merged-models.json`](file:///C:/Users/nirdr/.codex/codex-router/merged-models.json)
holds the full catalog.

## 5. Why the grok row changes, and how roles get their models

`/pstack:setup-pstack` probes all four families live before it writes anything. If one probe
fails, setup writes nothing. This machine has no Grok CLI, so the shipped grok row fails its
probe. The codex router serves grok-4.6 under the slug `opencode-go-responses/grok-4.6`, and
[`pstack-runner`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/scripts/runner/pstack-runner)
takes the model as a free string. So the row keeps its model and changes its
provider to codex. Every role that names grok keeps its meaning.

To add a model later, edit its matrix row, rerun setup, and let setup probe it. Custom rules
that pstack does not model, such as a verifier rule or a tier map, go in the user-level
[`CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md) as plain lines. They do not go in the sheet.

## 6. The current sheet, and how escalation works

The 2026-08-28 target kept effort headroom as the first escalation step: writers at `@high`,
three-lane panels, opus in the judge pool only. The founder replaced that design on
2026-08-31, before the pilot item: every seat runs at or near its family ceiling, and the
extra views are bought up front. Its row values are the **current** column of the sheet-roles
table in section 3.

- The feature and refactoring writer is `opus@max`. The bug-fix, perf-issue, and hillclimb
  writer is `sol@max`. `hardest tasks` stays `claude:claude-fable-5@max` as the named
  escalation target.
- The critics, both runner panels, and the interrogate panel run six lanes: fable@max,
  sol@max, grok@xhigh, opus@xhigh, deepseek@max, glm@max. Two of the six are Claude lanes;
  the founder accepted the shared-vendor overlap for the extra view.
- The judge pool is unchanged: sol@max, grok@xhigh, deepseek@max, glm@max, and opus@max when
  the others drop out. The arena picks a judge whose provider differs from the lead's and
  the front-runner's.
- The why and reflect rows are pinned (section 3). Swarm workers run on `opus@xhigh`.
- Two lines in the user-level [`CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md): "The verifier is a sonnet-class model from a different
  family than the writer." A tier map (docs, mechanical, standard, sensitive, each with a panel
  width) waits for a founder ruling, because it loosens the process.

Escalation happens after the fact, through reports, because a worker cannot ask a question.
The steps, from cheapest:

1. In the lane: the writer's own red-green loop and its retries.
2. The report: `BLOCKED`, a list of deviations, or a partial result at the time limit. Never
   silence.
3. The lead: respawn fresh, move the unit to `hardest tasks`, run the arena again, or scrap
   the loop. The writers already run at their ceilings, so raising effort is not a rung.
4. A human: irreversible actions, calls that the lead cannot settle, batched at the gates.

After two retries of one unit, abandon it and replan.

## 7. How to test a candidate model for a sheet role

Run the cheapest test first. Stop when the candidate fails.

1. Replay one finished station with the candidate in that one seat. The receipts hold the
   inputs. Grade the output against the known-good answer.
2. Run an arena with the candidate and the incumbent as two lanes and one judge from a third
   family.
3. As the last confirmation, run one item end to end twice, in two cloud sessions. Do not use
   two worktrees on one machine, because the one database and the CPU contend. Score each
   station from its receipts. Blind the run as the [eval playbook](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/playbooks/eval.md) requires: no words like eval,
   test, judge, or candidate anywhere visible, organic prompts, sanitized directories, one
   blinded judge from another family, one pass, and verification read from the transcripts.

A false green disqualifies a candidate at any price. Cost decides only between candidates that
told the truth.

## 8. Context and cache discipline for the mechanic

- The project [`.claude/settings.json`](../../settings.json) sets `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` and
  `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h` in its `env` block. The settings take effect from
  client 2.1.242.
- The mechanic ends when the item closes. At every phase boundary the lead writes a canon file.
  The canon file survives a compact and lets a fresh session resume after a crash. Autocompact
  stays on. The pstack session-start hook injects its mandate again after each compact.
- The controller cannot compact the mechanic from outside. When the mechanic's context is
  full, write the canon file and start a fresh session. Do not send wake-up messages to keep a
  cache warm.

## 9. Where our two gates fit

- Gate 1, the plan review, is the design arena plus one interrogate pass over the plan with our
  plan rubric.
- Gate 2, the diff review, is interrogate over the diff with one added rubric line: "A changed
  head voids the verdict. Re-panel."
- The brief carries the evidence bar: the named checks and their timestamps in the pull
  request's Verification section, and CI green on the final head. Nobody runs the suite a
  second time. The merge gate is CI green on the exact head and the founder's "merge".

## 10. How to finish the bring-up

Done: the plugin is installed, the session-start hook is kept, the project [`CLAUDE.md`](../../../CLAUDE.md) is lean,
the stamp and the reply header are parked, the branch guard skips cloud sessions, and the cloud
banner is kept.

Do these steps in order:

1. Done 2026-08-31: the matrix in
   [`provider-dispatch.md`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/references/provider-dispatch.md)
   carries the grok row on the codex router, the opus default at max, and the deepseek and
   glm rows. Re-apply after a plugin update.
2. Done 2026-08-31: setup ran. Five families probed green, grok recorded as a failed probe
   at opencode's 4.6 upstream, the sheet and the include line written, the smoke panel a
   four-for-four pass under an opus judge. The record:
   [`pstack-setup-2026-08-31.md`](../../../loop/drills/records/pstack-setup-2026-08-31.md).
   Re-probe grok before its first real use.
3. Done 2026-08-31: the verifier line is in the user-level
   [`~/.claude/CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md), under the sheet include.
4. Done 2026-08-31: [`.claude/skills/verify-ai4good/`](../verify-ai4good/) is generated and
   committed — launch, doctor, drive recipes, a five-feature map, and the helper
   `scripts/drive-ngo-signup.ts`. Proven end to end: 11 of 11 checks on the real path
   (signup, refused unconfirmed sign-in, Mailpit confirmation link, sign-in,
   `complete-signup` NGO, four database rows read over `DB_URL`). Evidence:
   `loop/verify-evidence/2026-08-31T20-25-26/transcript.json`.
5. Run one item with [`/controller <id>`](../controller/SKILL.md). It ends inside the item's
   worktree. Type `/pstack:poteto-mode Read loop/items/<item>/brief.md and follow it.` in the
   same session. When CI is green on the pull request, say "merge". The lead merges and
   hands the board to `/controller done`.

Settled 2026-08-31: the lead merges only when both hold, CI green on the exact head and the
founder's "merge". The ruling is in CLAUDE.md, the brief, and station 10.

Two questions stay open and belong to the founder: whether a feature plan needs a "go" before
the first child or an interrogate pass replaces it, and how a parent with children becomes one
feature brief. Both parked 2026-08-29. The exact text of the evidence bar in the brief is open
too.

## 11. After a plugin update

An update installs the new version into a new cache folder and reverts nothing else. The
sheet and the user-level CLAUDE.md survive. Do these steps after every update:

1. Re-apply the matrix rows to the new version's `provider-dispatch.md`. Section 4 of this
   file is the source: the grok row on the codex router, the opus default at max, the
   deepseek and glm rows, and the re-apply note.
2. Diff the new version's skills against what this file describes. Update this file and its
   `file:///` links, which name the version folder, in the same commit.
3. Run `/pstack:setup-pstack` again only if the sheet itself must change. Until the matrix
   rows are re-applied, a setup run stops on "inconsistent state" by design.

## 12. Changes to this file

- 2026-08-29. Created from the education record. Recorded the grok row change, the parked
  stamp, local banner, and reply header, and the cloud-safe branch guard. Rewritten to the
  technical-writing standard the same day.
- 2026-08-29. Added the controller skill. Section 2 now names how the controller starts and
  steers the mechanic (`claude --cloud`, `claude -p --cloud`). The brief no longer carries
  `AT_DB_SLOT`. The cloud VM sets its own.
- 2026-08-29. Added the sheet-roles table: every role with its pstack default, the first
  write for ai4good, and the target. The stations table now names roles only.
- 2026-08-29. Every file reference is a link: relative for repository files, `file:///` for
  this PC's copies, GitHub for the plugin source.
- 2026-08-29. The flow chart shows every internal step of every phase: the controller's four
  phases and the mechanic's nine stations with their loops.
- 2026-08-29. The chart is also an SVG beside this file, rendered by
  `loop/work/render-mermaid.ps1`. Regenerate it after every chart edit.
- 2026-08-29. The mechanic is always a session the founder can talk to: local in its own
  window by default, cloud on request. Never a subagent.
- 2026-08-29. Local mode is ONE session: the controller ends inside the item's worktree
  (`EnterWorktree`), the founder runs poteto-mode there, and `/controller close` leaves it
  (`ExitWorktree`) for the gate. Founder ruling quoted in section 2 and in CLAUDE.md.
- 2026-08-29. The SVG and its links are gone. The mermaid text in this file is the chart
  (founder: "i like the text flowchart in the md"). `render-mermaid.ps1` stays as the syntax
  check only.
- 2026-08-29. Every chart step that runs on a sheet role names the role and its first-write
  model. Lead steps say "Lead (fable)".
- 2026-08-29. The database slot pool is out of v2. One database per machine, `AT_DB_SLOT=1`
  everywhere, one item at a time locally, parallel items as cloud sessions.
- 2026-08-29. The lead closes the item (founder: "I want the lead to do it"). Station 10 in
  the chart. `/controller close` and the second local run of the suite are gone. The gate is
  pstack's verify and interrogate, CI, and the founder's "merge".
- 2026-08-29. The seam between git and the board is a skill call: the lead's last closing
  step invokes `/controller done <id>`, which confirms Done, clears the held item, folds
  upward, and judges the filing candidates (founder: "Lead closes but linear steering is the
  controller work").
- 2026-08-29. Stale lines fixed after a full read: the mechanic is the same session, not a
  cloud one; the mechanic owns the merge; no second suite run; the open rulings now list the
  parked questions (merge on green alone, "go" before the first child, feature briefs).
- 2026-08-30. `how explainer` is `opus@high` from the first write. The ground critique is a
  brief field the controller sets by rule, not a reading of the request's wording.
- 2026-08-30. `how critics` is three lanes from the first write: fable, sol, grok. Opus
  leaves the panel because it shares a vendor with fable and adds no independent view.
- 2026-08-30. `how explainer` is `fable@high`, not opus (founder). The ground critique runs
  on every item; the G4 decision is gone from the chart and the brief. Every model decision
  and finding now lives in `pstack-model-selection.md`.
- 2026-08-30. Opus runs at `max` wherever it sits, not the shipped `xhigh` (founder: "When we
  need max effort for opus it should be opus@max"). The matrix default for the opus family
  is `max`.
- 2026-08-30. The chart rewritten for reading: one plain sentence per step, the role and
  model on their own line, the four throughput todos written as the questions they ask
  (founder: "T is completely not readable").
- 2026-08-30. Fable leaves the judge pool: the arena picks a judge from a provider other than
  the lead's, and the lead is fable. Opus stays only as the dropout fallback that keeps one
  descriptor per family for setup (founder: "D2 and d4 why fable in the loop ?").
- 2026-08-30. X2 names pstack's own exception: a unit that still has a real shape choice goes
  to the arena instead of one writer (founder: "Why X2 is not an arena ?").
- 2026-08-30. Mechanics never spend the lead's calls. The station 7 rebase and the station 10
  git commands run on the `mechanical` agent, sonnet. The lead decides and checks. A fork is
  not the tool: a fork runs on the parent's model (founder: "any mechanics like this is a
  waste").
- 2026-08-31. The same split reaches stations 6 and 7 fully: `mechanical` drives the verify
  skill and builds every commit; the lead judges the evidence and reads the report (founder:
  "why we need fable to drive the verify running").
- 2026-08-31. The merge gate is settled and in CLAUDE.md: CI green on the exact head AND the
  founder's "merge", never one alone. The open-rulings list shrinks to the feature-brief
  questions and the evidence bar text. The first-write sheet shape is marked settled.
- 2026-08-31. Two families added through the codex router: deepseek (deepseek-v4-pro) and
  glm (glm-5.3). Their seats are the arena judge pool, where a seat costs nothing until a
  judge is picked. The matrix in the plugin cache is edited: six families, one file.
- 2026-08-31. The ground critics panel grows to five lanes, each at its family's highest
  effort: fable@max, sol@max, grok@xhigh, deepseek@max, glm@max (founder: "Add G5 more
  critics @ highest effort. glm and deepseek").
- 2026-08-31. Fable leaves the critics panel: the ruler is fable, so a fable critic shares
  the ruler's blind spots, and four cross-family lanes remain (founder: "why G5 need
  fable ?"). The panel is sol@max, grok@xhigh, deepseek@max, glm@max.
- 2026-08-31. `how explorer` moves to sol@high. Opus shares the scarce Claude pool with the
  lead, and the explorers are the heaviest readers in the flow. Retrieval needs high, not
  max (founder: "i think either opus or sol").
- 2026-08-31. Opus leaves the design runners, both `architect runners` and `arena runners`:
  a second Claude candidate is a near-duplicate of fable's at full design-package cost. The
  runners are fable@max, sol@max, grok@xhigh (founder: "D2 is not logical to have bothe
  fable@max here and opus@max").
- 2026-08-31. Variety at D2 is tailored two ways: the lead assigns each runner a distinct
  structural direction, and a wide-solution-space item adds deepseek@max and glm@max lanes
  (founder: "what should we tailer variety as well as intelliegence ?").
- 2026-08-31. The deepseek and glm family models are the flash variants: 
  `opencode-go/deepseek-v4-flash` and `opencode-go/glm-5.3-flash`, ladders low, high, max
  (founder correction). The pro and plain variants move to the later-trials list.
- 2026-08-31. The sol writer roles, bug-fix, perf-issue, hillclimb, run at xhigh, one step
  below the ceiling (founder: "sol@xhigh on X2"). Raising sol to max becomes a real rung on
  the escalation ladder.
- 2026-08-31. The interrogate panel follows the same shape as the others: opus out, deepseek
  and glm in at max, fable kept because it reviews another family's code. Five lanes, five
  vendors. The writer's-family lane stays seated and its silence reads as weak evidence
  (founder: "I2 revieweres currently both opus and fabel and no glm and no deepseek").
- 2026-08-31. `judgment and prose` is `fable@high`: station 9 is normally the lead itself,
  and the sheet row fires only for delegated prose, where high matches the explainer logic
  (founder: "yes fabel@high is enough").
- 2026-08-31. Setup ran and completed. The sheet is written with per-role efforts, the
  include and verifier lines are in the user CLAUDE.md, five families probed green, grok is
  a recorded failed probe at opencode's 4.6 upstream, and the smoke panel passed four for
  four under an opus judge.
- 2026-08-31. The deployed sheet gets a repo-tracked twin:
  `loop/work/pstack-models.expected.md`, checked by `loop/work/sheet-check.ps1`. A model
  decision updates the docs and the expected copy in one commit, then the expected copy is
  copied over the deployed sheet and the check proves they match.
- 2026-08-31. The founder's batch ruling rewrites the sheet before the pilot: the feature
  writer is opus@max and grok becomes panel-only, the sol writers run at max, judgment and
  prose and the how explainer run at fable@max, the critics and both runner panels and the
  interrogate panel grow to six lanes with opus@xhigh, swarm workers move to opus@xhigh, and
  the why and reflect rows leave inherit-parent: why investigators opus@max, why synthesizer
  fable@max, reflect tooling sol@max, reflect judgment, divergent, and synthesizer fable@max.
  The table's target column becomes the current column, and section 6 now describes the
  ceiling-first design.
- 2026-08-31. Reflect runs on fable@xhigh, one row for all four reflect roles (founder:
  "Reflect should be fable@xhigh"). The sol tooling lane and its missing-MCP exception are
  gone; every why and reflect lane is native Claude with the full MCP surface.
- 2026-08-31. The verification skill exists: `verify-ai4good` drives the real local surface
  (auth with mandatory confirmation, Mailpit, the three edge functions, Postgres readback
  over DB_URL) and is proven 11-for-11. Two facts it recorded: the started stack serves the
  edge functions itself, and the service role has no SELECT grant on organizations or
  acknowledgments, so evidence readback goes to Postgres, not REST. Bring-up step 5, the
  pilot item, is the one step left.
