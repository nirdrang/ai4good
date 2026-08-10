# plan.md — AI4DEV-80 (attribution by spawn tree)

Written by the PLAN sitting, orchestrator on fable (claude-fable-5 @ xhigh), 2026-08-11.
Chain, derived from the branch of this worktree: AI4DEV-4 (the work skill, bring-up root) >
AI4DEV-80 (attribution by spawn tree). Label `attr:bringup` — foundation work, no requirement
above it, no evidence gate. Base for the branch: `ac8a235` (origin/main at pickup).

## 1. What this item changes

One read-only reporting script, `loop/work/attribution-report.ps1`, plus one new selftest,
`loop/work/attribution-report.selftest.ps1`. Record files land under `loop/items/AI4DEV-80/`.
No product code. No database. No UI. Declared path-set (the audit's scope box):

- `loop/work/attribution-report.ps1`
- `loop/work/attribution-report.selftest.ps1`
- `loop/items/AI4DEV-80/**`

## 2. The ruled design (founder, 2026-08-11 — the board item's text; decisions, not open questions)

1. Attribute by the SPAWN TREE, not only by each record's own branch. Build parent→child
   edges — the full spawn forest.
2. Root each tree at whoever already resolves an item: the conductor via its git branch, or
   the coordinator main session via the chain cache `/work` writes.
3. Propagate the item down the tree: an agent whose own records resolve no item inherits its
   nearest ancestor's item. The role column stays derived from the spawn call.
4. Exclude non-transcript `.output` files from the response count. Count only genuine
   assistant transcripts.
5. Preserve every existing behaviour: `-Item`, `-Days`, the codex and kimi joins, the chain
   rollup, the reconciling total, the unattributed-% signal. The unattributed share must drop
   sharply; that drop is the headline evidence.

Scope boundary from the item: the flash/opencode reviewer-spend join is OUT — filed
separately, named in the record in words, not built here.

## 3. Measured facts the mechanism stands on

This sitting measured the transcript store before planning. Every fact below is re-runnable;
the probe recipes are in this section so a reviewer can re-derive them. Machine: the founder's,
project key `C--Users-nirdr-Downloads-ai4good`.

- F1. Agent transcripts live at
  `~\.claude\projects\<projKey>\<sessionId>\subagents\agent-<agentId>.jsonl`. The report's
  session glob (`Get-ChildItem $projDir -Filter '*.jsonl'`, line 40) is non-recursive, so it
  has NEVER read them. 872 such files exist.
- F2. Beside every agent transcript sits `agent-<agentId>.meta.json` — 872 of 872, zero
  missing. It carries `agentType` (the spawn's `subagent_type`), `parentAgentId` (absent at
  `spawnDepth` 1, where the parent is the session whose directory holds the file),
  `toolUseId` (the spawn call in the parent), `spawnDepth`, `model`, `description`. The spawn
  forest the design asks for is already on disk, written by the platform at spawn, derived
  from the real spawn call.
- F3. Agent transcripts DO carry `gitBranch` per record. Measured on the previous item's
  flash reviewer-runner (`agent-a682396ff34b41b5c.jsonl`): 85 records, 53 usage lines, every
  record on the item branch `nirdrang/ai4dev-79-a-pool-...`. Measured on that item's
  conductor: 471 records, 292 usage lines, branches `main` early then the item branch. So the
  bulk of the fix is making these files VISIBLE; propagation covers the records that still
  resolve nothing (`main`, `worktree-agent-*`, empty).
- F4. Under `Temp\claude\<projKey>\`, 435 `.output` files: 34 are full transcripts (records
  with unescaped `"parentUuid"` and usage), 401 carry zero countable usage lines. Of the 34,
  33 are agentId-named and EVERY one has a byte-identical `.jsonl` twin under `subagents\`
  (the conductor twin measured line-for-line equal: 471 lines, 292 usage lines in both).
  Scanning both stores would double-count every background-spawned agent.
- F5. The 34th transcript-shaped `.output` is NOT an agent:
  `ce2949dd-…\tasks\bims7hajm.output`, 336KB, 50 countable assistant-usage lines, head
  `{"type":"ai-title",…}` — a background task that emitted transcript-shaped records. Today
  those 50 lines count as unattributed responses. This is the measured instance of the
  inflation class the design's bullet 4 removes.
- F6. Synchronously-spawned children (the 14 the previous item's conductor spawned) leave
  near-empty `.output` files; their real transcripts are the `subagents\*.jsonl` files. This
  is why the item's premise sentence ("its `.output` transcript carries no `gitBranch`") was
  observed: the `.output` is empty of records. The premise stands; the store that holds the
  usable records was simply not scanned.
- F7. There is no sibling temp or projects key for worktrees — everything for this project,
  any nesting depth, lands under the one project key.
- Probe recipes: enumerate `.output` under the temp key and classify by unescaped
  `"parentUuid"` plus the counting predicate (`"usage"` + `"output_tokens"` +
  `"type":"assistant"` on one line); list `agent-*.jsonl` and `agent-*.meta.json` recursively
  under the projects key; diff a twin pair's line and usage counts; extract distinct
  unescaped `"gitBranch"` values per file.

## 4. Decisions

- D1 **Usage is counted ONLY from `.jsonl` transcripts**: the top-level session files (as
  today) plus `*/subagents/agent-*.jsonl` (new). Temp `.output` files leave the usage scan
  entirely. This lands ruled bullet 4 structurally (F5's file can never count again), avoids
  the twin double-count F4 proves, and loses nothing (zero orphan transcripts measured). The
  header's "transcript file(s)" count then counts scanned `.jsonl` transcripts only.
- D2 **The spawn forest comes from the meta files** (F2): role = `agentType` (the same
  spawn-call value the design names; the file-name pairing pass and its `.output` scan are
  deleted with D1), parent edge = `parentAgentId`, session root = the directory path (derived,
  never declared). A `.jsonl` with no meta (zero today) reads role `unmarked agent`, builds
  no edge, and is said in the output — never silent.
- D3 **Per-response resolution order** (existing rules first, one new fallback): own-record
  branch → item (unchanged); stamp fallback for session files (unchanged); NEW for agent
  files: the agent's TREE-ITEM, labeled source `tree` in the From column. TREE-ITEM(agent) =
  first of: (a) the single distinct item the agent's own branch records resolve anywhere in
  its file (F3 makes this the common case); (b) TREE-ITEM(parent agent), walking
  `parentAgentId` upward, depth cap 8, visited-set cycle guard; (c) at a session root: the
  item the session had resolved (branch first, stamp fallback) at the spawn's `toolUseId` —
  the stamp is rendered from the chain cache `/work` maintains, which is exactly the ruled
  coordinator root (bullet 2). Unresolvable stays unattributed — degrade, never guess.
  A branch naming two items stays `unresolved` (unchanged).
- D4 **Tree-resolved responses feed the role table and `agentItem`** exactly as
  branch-resolved ones, so a sitting's tokens land under its item AND its role (ruled bullet
  3), and the kimi join keeps working. Join key note: subagents file base names carry an
  `agent-` prefix — strip it, keys stay bare agentIds.
- D5 **`-Days` filters which transcripts are usage-scanned** (unchanged semantics). Meta
  files are ALWAYS all read — 872 tiny files, and edges must exist even when a parent
  transcript sits outside the window. Spawn-context (D3c) is captured only from scanned
  sessions; a window that excludes the parent session loses that root, stated in the floor
  note. The default (`-Days 0`, all history) has no such gap.
- D6 **Testability seams**: the report gains root-override parameters — `-ProjectsDir`,
  `-AttrDir`, `-ItemsDir`, `-CodexSessions`, `-KimiRoot` — defaulting to today's hard-coded
  paths, plus a `-Json` switch that emits the aggregates (per-item rows, role rows, rollup
  rows, totals, unattributed %) as one JSON object instead of tables. Default invocation
  output is unchanged. The selftest asserts on parsed JSON, not on `Format-Table` text — an
  exact oracle instead of a whitespace-brittle one.
- D7 **Windows PowerShell 5.1 is the target** (`powershell -File`): no ternary, no `??`, no
  `-AsHashtable`; `ConvertTo-Json` gets an explicit `-Depth`. Same for the selftest.
- D8 **No slicing.** One script plus one selftest is one reviewable diff; the code gate runs
  once.
- D9 **Evidence is captured before and after on the real store** (ruled bullet 5's headline):
  the full report and `-Item AI4DEV-79` at the pre-change code, then again at the goal head,
  committed into `loop/items/AI4DEV-80/`. The item explicitly allows documented before/after
  numbers instead of a live-transcript assertion; a live assertion would be
  machine-dependent, so: documented numbers.
- D10 **CI territory fact and gate ruling**: the diff touches `loop/` only, which CI's fast
  lane does not class as code (`^(src|supabase|tests|\.github)/|^package\.json$|…`, ci.yml
  line 101) — the required check will run the guards and skip the suite. The substance of
  this item is nonetheless code, so this sitting RULES: the draft-code gate RUNS (a
  tightening, within the orchestrator's authority); and the audit brief must ADD
  `git diff <base>...<head> -- loop/work` to the auditor's enumeration instrument (additive:
  more files to look at), else the pinned source-only diff command enumerates nothing for
  this item. Carried in PHASE-STATE for the conductor and the fix sitting.

## 5. Steps — each with its done-criterion

Test bodies come early (S3 writes every executable criterion before the mechanism lands).
One commit per step (S4+S5 may share one commit if splitting them would leave the role
column broken mid-sequence; the commit message must say so).

- **S1 — capture BEFORE evidence, before touching any code.** Run the CURRENT script: full
  report → `loop/items/AI4DEV-80/report-before.txt`; `-Item AI4DEV-79` →
  `report-before-79.txt`. Done: both files committed; each carries the header date, the
  unattributed % line, and the per-item table.
- **S2 — seams.** Add the root-override parameters and `-Json` (D6, D7). Done: a default run
  differs from S1's capture only in the header date line; `-Json` output parses with
  `ConvertFrom-Json` and carries `rows`, `roleRows`, `rollRows`, `totals` fields.
- **S3 — the selftest, written RED.** `loop/work/attribution-report.selftest.ps1` builds a
  synthetic fixture in a temp directory: a coordinator session `.jsonl` (stamp lines holding
  item `AI4DEV-901`, a spawn tool_use for the conductor, a later spawn for one utility agent
  while the stamp still holds the item); `subagents/agent-C1.jsonl` (conductor, records on
  branch `nirdrang/ai4dev-901-fixture`, with usage) + meta (agentType `conductor`,
  spawnDepth 1, its toolUseId); two sittings `agent-O1/O2.jsonl` (records with empty
  `gitBranch`, usage) + metas (agentType `orchestrator`, parentAgentId C1); one executor
  `agent-E1.jsonl` (branch-less, usage) + meta (agentType `executor`, parentAgentId O1 — a
  two-level walk); the utility agent `agent-U1.jsonl` (branch-less, usage) + meta
  (spawnDepth 1, its toolUseId); one background file `tasks/bg.output` carrying 3
  transcript-shaped assistant-usage lines; a chain cache with `AI4DEV-900 > AI4DEV-901`.
  It runs the report with the override parameters and `-Json` and asserts:
  - A1 every fixture agent's tokens land under `AI4DEV-901` (coordinator rows via stamp,
    conductor via branch, O1/O2/E1/U1 via tree).
  - A2 the executor's tokens are under the item; the unattributed row carries none of them.
  - A3 `bg.output`'s 3 usage lines appear in no row; the response total equals exactly the
    assistant-usage line count of the six `.jsonl` fixtures.
  - A4 the per-item rows sum to the TOTAL line's responses and output tokens (reconciliation).
  - A5 role rows: O1+O2 tokens under (item, `orchestrator`), E1 under (item, `executor`) —
    role from meta `agentType`.
  - A6 tree-resolved rows carry `From = tree`.
  - A7 U1 (branch-less, session-rooted) inherits the item via the session's stamp state at
    its spawn `toolUseId`.
  - A8 the rollup credits `AI4DEV-900` with its child's totals (chain preserved).
  Exit code: 0 all green, 1 otherwise, one PASS/FAIL line per assert. Done at S3: the
  selftest runs against the S2 code and is RED exactly as predicted — A1 (tree part), A2,
  A5, A6, A7 fail because subagents files are unscanned and no forest exists; A3's total
  side and A4 hold; the RED run log is committed to
  `loop/items/AI4DEV-80/selftest-red.txt`.
- **S4 — the scan set** (D1). Add `*/subagents/agent-*.jsonl` to the usage scan; remove the
  Temp `.output` scan and the transcript-pairing pass it fed. Done: the fixture's six
  `.jsonl` files are scanned, `bg.output` is not; A3 green in full.
- **S5 — the forest from meta** (D2). Done: A5 green; roles on the real store show
  `conductor` / `orchestrator` / `reviewer-runner` / `executor` rows (visible in S8's
  capture).
- **S6 — propagation** (D3, D4, D5). Per-response `tree` fallback for agent files; session
  spawn-context capture at `toolUseId`; role table and `agentItem` fed from tree-resolved
  responses; depth cap 8 with a visited set. Done: A1, A2, A6, A7, A8 green — selftest exit
  0, log committed as `loop/items/AI4DEV-80/selftest-green.txt`.
- **S7 — the text tells the truth.** Rewrite the closing floor note (the "deeply-nested
  sitting" gap is closed; the remaining floors: coordinator work on `main` holding no item;
  vendor reviewer tokens only partially joined, with the flash/opencode spend join named in
  words as separately-filed follow-up work; a `-Days` window that excludes a parent session
  loses that spawn-context root; a metaless agent reads `unmarked agent`). Update the header
  line that counts transcripts. Done: no output sentence contradicts the implemented
  behaviour.
- **S8 — AFTER evidence.** At the goal head, run the full report → `report-after.txt` and
  `-Item AI4DEV-79` → `report-after-79.txt`; commit both plus a short delta note in the
  record (unattributed % before → after; the previous item's response count before → after).
  Done: files committed; the drop is stated in numbers. No fixed threshold is promised — the
  number is the evidence.

## 6. Verification state

This is a bring-up item: NO ratified acceptance-test ids attach to it, and the product
acceptance suite is untouched (CI's fast lane will skip it for this diff — D10). The
executable criteria of this item are the selftest asserts, written at S3 before the
mechanism lands:

| criterion | at S3 (RED run) | at goal |
|---|---|---|
| A1 all nodes under the item | FAIL (tree nodes absent) | PASS |
| A2 executor not unattributed | FAIL | PASS |
| A3 background file excluded | PASS on total, scan-set half lands at S4 | PASS |
| A4 totals reconcile | PASS | PASS |
| A5 roles from meta | FAIL | PASS |
| A6 `From = tree` visible | FAIL | PASS |
| A7 session-rooted inheritance | FAIL | PASS |
| A8 chain rollup preserved | PASS (chain cache path unchanged) | PASS |
| E1 before evidence | committed at S1 | committed |
| E2 after evidence + delta note | — | committed at S8 |

The verify command for the goal loop: `powershell -File loop/work/attribution-report.selftest.ps1`
exits 0, and a default `powershell -File loop/work/attribution-report.ps1` completes without
error on the real store.

## 7. Gate 1 rulings

(Appended by the DRAFT sitting after the plan review lands.)
