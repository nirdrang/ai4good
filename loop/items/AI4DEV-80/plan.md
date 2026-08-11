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
separately, named in the record in words, not built here. A second filed follow-up comes
from ruling G1-1: one clarifying sentence in the conductor contract and the workflow, that
a derived gate SKIP is a floor an orchestrator ruling recorded in PHASE-STATE may tighten
to RUN, never the reverse. Also filed in words, not built here — the path-set above does
not include the process contracts.

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
  today) plus every `agent-*.jsonl` under each session's `subagents` tree — RECURSIVE,
  because 587 of the 877 real transcripts sit one level deeper, in
  `subagents/workflows/wf_<id>/` (draft ruling D-1; the flat glob this plan first wrote
  would have kept two thirds of the store invisible). Temp `.output` files leave the usage scan
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
  its file (F3 makes this the common case; the whole-file discovery uses the SAME
  unescaped-only match shape as the existing per-record scan — an escaped `\"gitBranch\"`
  inside a tool result is never a branch fact, ruling G1-10); (b) ONLY when (a) finds ZERO
  items: TREE-ITEM(parent agent), walking `parentAgentId` upward with a visited-set cycle
  guard — no depth cap (ruling G1-5; the visited set must remain, as the removal
  condition); if (a) finds TWO OR MORE distinct items, the file's branchless responses stay
  unattributed and the floor note states the ambiguous-file count (ruling G1-4); (c) at a
  session root: the item the session had resolved (branch first, stamp fallback) at the
  spawn's `toolUseId` — the stamp is rendered from the chain cache `/work` maintains, which
  is exactly the ruled coordinator root (bullet 2). Unresolvable stays unattributed —
  degrade, never guess. A branch naming two items stays `unresolved` (unchanged).
  FIX-PASS AMENDMENT (G2-1): the code applies the `$curStamp` fallback ONLY when the file
  is a session file (`-not $isAgent`) — the draft applied it to every file, which let a
  stamp quoted inside an agent transcript guess an item. FIX-PASS AMENDMENT (G2-3,
  PROVEN by measurement): `$spawnCtx` is keyed by SESSION plus tool-use id, because 580
  `toolu_` ids appear in two session files on the real store — one resumed-session pair
  copying records, five of them resolving a DIFFERENT item across the pair. A session
  file's id is its base name; an agent's session derives from its directory path.
- D4 **Tree-resolved responses feed the role table and `agentItem`** exactly as
  branch-resolved ones, so a sitting's tokens land under its item AND its role (ruled bullet
  3), and the kimi join keeps working. Join key note: subagents file base names carry an
  `agent-` prefix — strip it, keys stay bare agentIds. FIX-PASS AMENDMENT (G2-2): the
  `$agentItem` assignment is SKIPPED for an agent file whose own records name two or more
  items (the pre-pass `$fileItems` count) — the ambiguous agent's vendor spend stays
  unjoined, per the floor note. The tree-fed assignment needs no guard: an ambiguous
  agent never has a tree item.
- D5 **`-Days` filters which transcripts are usage-scanned** (unchanged semantics). Meta
  files are ALWAYS all read — 872 tiny files, and edges must exist even when a parent
  transcript sits outside the window. Spawn-context (D3c) is captured only from scanned
  sessions; a window that excludes the parent session loses that root, stated in the floor
  note. The default (`-Days 0`, all history) has no such gap.
- D6 **Testability seams**: the report gains root-override parameters — `-ProjectsDir`,
  `-AttrDir`, `-ItemsDir`, `-CodexSessions`, `-KimiRoot` — defaulting to today's hard-coded
  paths, plus a `-Json` switch that emits the aggregates (per-item rows, role rows, rollup
  rows, totals, unattributed %, AND the vendor aggregate tables `codexRows` and `kimiRows`
  — ruling G1-7) as one JSON object instead of tables. AUDIT AMENDMENT (AUD-2): this
  section earlier said "Default invocation output is unchanged." — false as written, and
  replaced by the narrow claim that was meant: the SEAMS add no output change of their
  own. The root-override parameters default to the previous hard-coded paths, and the
  table output renders exactly when `-Json` is absent. The default run's CONTENT does
  change with this item, by design — the recursive agent scan, the `tree` source rows,
  the revised header and floor notes — and the before/after evidence (D9, S8) documents
  that change. The selftest asserts on parsed JSON, not on `Format-Table` text — an exact
  oracle instead of a whitespace-brittle one.
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

**Draft/goal split (ruling G1-2).** The verify suite of this item is the SELFTEST. The
draft pass implements S1–S7 and NEVER invokes the selftest. The report script itself is
the subject under test: the draft runs the REPORT where a done-criterion needs it (S1's
evidence, S2's comparison) — that is a build check, not a suite run. The RED baseline, the
green run and S8 all belong to the fix-and-goal pass; its order of operations closes this
section. Selftest-dependent done-criteria below are therefore the GOAL SPEC, checked in
that pass, not at draft time.

- **S1 — capture BEFORE evidence, before touching any code.** Run the CURRENT script: full
  report → `loop/items/AI4DEV-80/report-before.txt`; `-Item AI4DEV-79` →
  `report-before-79.txt`. Done: both files committed; each carries the header date, the
  unattributed % line, and the per-item table.
- **S2 — seams.** Add the root-override parameters and `-Json` (D6, D7). Done: a default run
  differs from S1's capture only in the header date line; `-Json` output parses with
  `ConvertFrom-Json` and carries `rows`, `roleRows`, `rollRows`, `totals` fields.
- **S3 — the selftest, complete, not yet run.** `loop/work/attribution-report.selftest.ps1`
  builds a synthetic fixture in a temp directory:
  - a coordinator session `.jsonl`: stamp lines holding item `AI4DEV-901`, a spawn
    tool_use for the conductor C1, a spawn for utility agent U1 (still under `AI4DEV-901`),
    THEN stamp lines holding `AI4DEV-902`, then a spawn for utility agent U2 (ruling G1-6);
  - `subagents/agent-C1.jsonl` (conductor, records on branch `nirdrang/ai4dev-901-fixture`,
    with usage) + meta (agentType `conductor`, spawnDepth 1, its toolUseId);
  - two sittings `agent-O1/O2.jsonl` (records with empty `gitBranch`, usage) + metas
    (agentType `orchestrator`, parentAgentId C1). O1 additionally carries a tool-result
    record containing an ESCAPED `\"gitBranch\":\"nirdrang/ai4dev-999-decoy\"` (G1-10);
  - one executor `agent-E1.jsonl` (branch-less, usage) + meta (agentType `executor`,
    parentAgentId O1 — a two-level walk); the fixture sets this file's LastWriteTime 40
    days back for A13 (G1-9);
  - utility agents `agent-U1.jsonl` and `agent-U2.jsonl` (branch-less, usage) + metas
    (spawnDepth 1, each with its own toolUseId);
  - `agent-M1.jsonl`: records on TWO item branches (`…ai4dev-901…` and `…ai4dev-902…`)
    plus branchless usage lines, + meta (parentAgentId C1) — the ambiguity case (G1-4).
    ADDED AT THE FIX PASS (G2-1): a stamp line naming `AI4DEV-902` BEFORE the branchless
    lines — if the stamp fallback leaks into agent files, A1's stamp-row counts, A9 and
    A11 go red from the fixture's own bytes;
  - `agent-X1.jsonl`: usage lines, NO meta file — the `unmarked agent`, unattributed by
    design (G1-8);
  - `workflows/wf_1/agent-W1.jsonl` one level deeper in the session's `subagents` tree
    (branch-less, usage) + meta beside it (agentType `reviewer-runner`, parentAgentId C1)
    — the nested-store case (draft ruling D-1). ADDED AFTER THE DRAFT: the drafted
    selftest predates this fixture agent; the fix sitting implements it;
  - one background file INSIDE the fixture projects root, `<session>/tasks/bg.output`,
    carrying 3 transcript-shaped assistant-usage lines (G1-3);
  - a minimal kimi usage fixture under `-KimiRoot`, keyed by the BARE agentId `O1`, file
    shape copied from the real store (G1-7). ADDED AT THE FIX PASS (G2-2): a
    `wd_agent-M1_*` kimi directory with turn-usage lines carrying distinctive amounts —
    the ambiguous agent's spend, which must stay unjoined;
  - a chain cache with `AI4DEV-900 > AI4DEV-901`; `AI4DEV-902` stays chainless.
  It runs the report with the override parameters and `-Json` and asserts:
  - A1 the tree-mechanism agents' tokens land under `AI4DEV-901`: C1 via branch,
    O1/O2/E1/W1 via tree (W1 proves the nested store is scanned, D-1), U1 via spawn
    context; the coordinator's stamp lines split between `AI4DEV-901` and `AI4DEV-902`
    as written. EXTENDED AT THE FIX PASS (G2-5): A1 also asserts `OutputTok` on each of
    its rows, computed from the fixture's own measurements — branch = C1 + M1's first
    branch line; tree = O1 + O2 + E1 + U1 + W1; stamp rows = each session segment —
    computed, never hard-coded.
  - A2 the executor's tokens are under the item; the unattributed row carries none of them.
  - A3 `bg.output`'s 3 usage lines appear in no row; the response total equals exactly the
    assistant-usage line sum over ALL fixture `.jsonl` files — computed by the selftest
    from what it wrote, never hard-coded.
  - A4 the per-item rows sum to the TOTAL line's responses and output tokens (reconciliation).
  - A5 role rows: O1+O2 tokens under (item, `orchestrator`), E1 under (item, `executor`) —
    role from meta `agentType`.
  - A6 tree-resolved rows carry `From = tree`.
  - A7 U1 inherits `AI4DEV-901` and U2 inherits `AI4DEV-902`, each via the session's stamp
    state at its own spawn `toolUseId` — latest-wins and file-wide-single both fail (G1-6).
  - A8 the rollup credits `AI4DEV-900` with its child's totals (chain preserved).
  - A9 M1's branchless responses land in the unattributed row, never under C1's item; its
    branch-resolved records land under their own items (G1-4).
  - A10 the kimi row for `O1` joins to (`AI4DEV-901`, orchestrator) — the `agent-` prefix
    strip and the tree-fed `agentItem` both hold (G1-7). EXTENDED AT THE FIX PASS (G2-2):
    the kimi table holds exactly ONE row (the O1 join) and its output tokens equal the O1
    wire sum alone — the ambiguous M1's kimi spend stays unjoined.
  - A11 the unattributed row equals exactly X1's responses plus M1's branchless responses,
    and the printed unattributed % equals the value recomputed from the JSON totals, to the
    report's own rounding (G1-8).
  - A12 a separate `-Json -Item AI4DEV-902` run returns rows for that item only, with the
    fixture's known response sum for it (G1-9).
  - A13 a separate `-Days 7` run excludes exactly E1's responses; the default all-history
    run includes them (G1-9).
  - A14 no row in any table names `AI4DEV-999` — the escaped decoy is never read as a
    branch fact (G1-10).
  Exit code: 0 all green, 1 otherwise, one PASS/FAIL line per assert. Done at S3 (draft
  time, ruling G1-2): the file exists, carries all fourteen asserts, and passes a
  PowerShell syntax check (tokenize/parse only — NO execution). The S3 commit pins the
  pre-mechanism report code for the goal pass's RED capture.
- **S4 — the scan set** (D1). Add the recursive `subagents` scan — `agent-*.jsonl` only,
  nested `workflows/wf_*` directories included (D-1) — to the usage scan; remove the Temp
  `.output` scan and the transcript-pairing pass it fed. Goal-spec criterion: A3 green
  in full — every fixture `.jsonl` scanned, `bg.output` not, though it sits inside the
  scanned root.
- **S5 — the forest from meta** (D2). Goal-spec criterion: A5 green; roles on the real
  store show `conductor` / `orchestrator` / `reviewer-runner` / `executor` rows (visible in
  S8's capture).
- **S6 — propagation** (D3, D4, D5). Per-response `tree` fallback for agent files; session
  spawn-context capture at `toolUseId`; role table and `agentItem` fed from tree-resolved
  responses; parent walk guarded by a visited set, no depth cap (G1-5). Goal-spec
  criterion: A1, A2, A6–A14 green.
- **S7 — the text tells the truth.** Rewrite the closing floor note (the "deeply-nested
  sitting" gap is closed; the remaining floors: coordinator work on `main` holding no item;
  vendor reviewer tokens only partially joined, with the flash/opencode spend join named in
  words as separately-filed follow-up work; a `-Days` window that excludes a parent session
  loses that spawn-context root; a metaless agent reads `unmarked agent`). Update the header
  line that counts transcripts. Done: no output sentence contradicts the implemented
  behaviour.
- **S8 — AFTER evidence (goal pass only).** At the goal head, run the full report →
  `report-after.txt` and `-Item AI4DEV-79` → `report-after-79.txt`; commit both plus a
  short delta note in the record (unattributed % before → after; the previous item's
  response count before → after). The note states BOTH denominators beside the
  percentages — the after run counts hundreds of previously-invisible transcripts, so the
  two percentages divide different totals and the note must say so (draft measurement,
  section 8). Done: files committed; the after % is STRICTLY LOWER than the before %,
  both stated with their response counts (G1-8). No fixed threshold is
  promised — the number is the evidence, and if the drop is not large, the delta note says
  that number plainly rather than hiding it.

**The fix-and-goal pass — order of operations (rulings G1-2, G1-8):**

1. Check every verify-first claim and removal condition from gate 2, before changing
   anything.
2. Apply the ruled gate-2 fixes; commit.
3. Capture the RED baseline: restore the pre-mechanism report alone from the S3 commit
   (`git checkout <S3-sha> -- loop/work/attribution-report.ps1`), run the FINAL selftest
   against it, expect exit 1 matching the predicted pattern in section 6; commit the log as
   `loop/items/AI4DEV-80/selftest-red.txt`; restore the head file (`git checkout HEAD --
   loop/work/attribution-report.ps1`). Fallback, decided now: if a gate-2 fix changed a
   seam so the final selftest cannot drive the S3-era report, capture RED with BOTH files
   from the S3 commit and say so in the delta note. A RED run deviating from the predicted
   pattern is REPORTED, never silently adjusted around.
4. Goal loop, three iterations maximum: selftest exit 0 at the head; log committed as
   `loop/items/AI4DEV-80/selftest-green.txt`.
5. S8, at the goal head.

## 6. Verification state

This is a bring-up item: NO ratified acceptance-test ids attach to it, and the product
acceptance suite is untouched (CI's fast lane will skip it for this diff — D10). The
executable criteria of this item are the selftest asserts, written at S3 before the
mechanism lands. At draft end every step is implemented and UNVERIFIED (ruling G1-2); the
RED column below is the predicted pattern of the goal pass's baseline capture — the FINAL
selftest against the S3-commit report code:

| criterion | at the RED capture (goal pass) | at goal |
|---|---|---|
| A1 tree agents under the item | FAIL (tree nodes absent) | PASS |
| A2 executor not unattributed | FAIL | PASS |
| A3 background file excluded, totals exact | FAIL (subagents unscanned → total short) | PASS |
| A4 totals reconcile | PASS | PASS |
| A5 roles from meta | FAIL | PASS |
| A6 `From = tree` visible | FAIL | PASS |
| A7 per-spawn stamp inheritance (U1≠U2) | FAIL | PASS |
| A8 chain rollup preserved | PASS (chain cache path unchanged) | PASS |
| A9 two-item file stays unattributed | FAIL (M1 unscanned) | PASS |
| A10 kimi join on bare agentId | FAIL (no `agentItem` entry) | PASS |
| A11 unattributed row and % exact | FAIL (X1/M1 unscanned) | PASS |
| A12 `-Item` scoping | FAIL (902 rows incomplete) | PASS |
| A13 `-Days` filtering | FAIL (E1 absent from both runs → delta 0) | PASS |
| A14 escaped decoy ignored | PASS (decoy file unscanned) | PASS |
| E1 before evidence | committed at S1 (draft) | committed |
| E2 after evidence + delta note | — | committed at S8 |

A RED capture deviating from this pattern is reported, never silently adjusted around
(G1-2). The verify command for the goal loop:
`powershell -File loop/work/attribution-report.selftest.ps1` exits 0, and a default
`powershell -File loop/work/attribution-report.ps1` completes without error on the real
store.

## 7. Gate 1 rulings

Ruled by the DRAFT sitting, 2026-08-11, at head `1c475af`. Full rulings with the
reviewer's claims quoted verbatim: `loop/items/AI4DEV-80/gate1-rulings.md`. Ten findings,
ten rulings; the amendments are woven into sections 2, 4, 5 and 6 above, each marked with
its ruling id:

| ruling | outcome | lands in |
|---|---|---|
| G1-1 gate ruled to run vs derived skip | accept, fixed differently — D10 stands; contract clarification filed in words | section 2 |
| G1-2 draft pass ran the suite | accept, fixed differently — no draft-time run; RED captured in the goal pass | section 5 preamble, S3, goal-pass block |
| G1-3 A3 prediction impossible | accept — bg.output inside the fixture root; prediction corrected | S3, section 6 |
| G1-4 two-item file inherited parent | accept — zero-item condition; A9 | D3, S3 |
| G1-5 depth cap truncates | accept — cap removed, visited set is the checked removal condition | D3, S6 |
| G1-6 A7 passes latest-wins | accept — mid-fixture stamp change, U2, split oracle | S3 |
| G1-7 vendor joins untested | accept, fixed differently — JSON vendor tables; A10; codex via E1/E2 evidence | D6, S3 |
| G1-8 unattributed % unproven | accept in part — A11; fixed live threshold rejected with written reason | S3, S8 |
| G1-9 `-Days`/`-Item` unprotected | accept — A12, A13 | S3 |
| G1-10 escaped-JSON decoys | accept — unescaped-only predicate; A14 | D3, S3 |

## 8. Draft-pass ruling and measured facts

Ruled by the DRAFT sitting after the executor's report, 2026-08-11. Draft head `a119c4e`;
the S3 commit that pins the pre-mechanism report for the RED capture is `0c1bbf7`.

**D-1 — the recursive scan, accepted.** The executor measured the real store before
obeying the written glob: 877 agent transcripts, only 290 directly in
`<session>/subagents/`, 587 one level deeper in `subagents/workflows/wf_<id>/`, each with
its meta beside it. The plan's flat glob would have scanned 290 of 877 — preserving two
thirds of the exact blindness this item removes. The executor implemented the recursive
form, still `agent-*.jsonl` only, and reported the deviation instead of hiding it. Ruling:
this is D1 executed correctly against the measured tree; the plan text above is amended to
match (D1, S4), and the fixture gains the nested agent W1 at the fix sitting.

**Measured on the real store at the draft head** (the fix sitting's S8 restates these at
the goal head):

- Unattributed output-token share: 70.6% before → 67.7% after. The drop in the headline
  percentage is SMALL, and per ruling G1-8 that is stated, not hidden. The denominators
  differ: transcript files scanned 480 → 912, responses 26371 → 48658, because 877
  previously-invisible transcripts now count at all.
- The tree mechanism itself works: 3764 responses across 14 items are newly attributed;
  the previous item's scoped view grows from 249 to 1935 responses and its role table now
  shows the whole relay instead of two roles.
- The measured floor, named in the report's closing note: of 37610 branchless responses,
  19892 sit in coordinator session files on `main`, and most of the rest have their whole
  ancestry on `main`, `HEAD` or a branch naming no item — there is nothing to inherit.
- Ambiguous agents (two items in their own records): 2. Metaless agents: 0.

The board item expects the unattributed share to "drop sharply" as the headline evidence.
The measured store says the honest headline is the attribution numbers above, not the
percentage. This is flagged for the founder at the merge ruling; it blocks nothing now.

## 9. Gate 2 rulings

Ruled across the two halves of the fix-and-goal sitting, 2026-08-11. Full rulings with
every claim quoted verbatim: `loop/items/AI4DEV-80/gate2-rulings.md`. Gate 2 is a panel
of two readers. Reader one (terra via codex) landed six findings, ruled G2-1 through
G2-6. Reader two (flash via opencode) died empty once, was ruled a relaunch, landed on
the relaunch with six findings naming the SAME six defects — each subsumed by the
standing ruling. The relaunched seat was NOT blind to reader one (it read the committed
rulings and distillate), so its convergence carries no independence weight; every
disposition stands on the code alone. One pre-existing exposure it observed outside its
findings (session-file stamp corruption via a quoted stamp) is filed in words, not built.

| ruling | outcome | lands in |
|---|---|---|
| G2-1 stamp fallback reaches agent files | accept — `-not $isAgent` guard at the fallback site; M1 stamp-line fixture | D3, S3, code |
| G2-2 `$agentItem` collapses a multi-item agent | accept — skip the assignment when the file's own records name two or more items; M1 kimi directory; A10 extended | D4, S3 |
| G2-3 spawn context keyed globally by toolUseId | verify first → PROVEN: 580 cross-session `toolu_` duplicates (one resumed-session pair, five resolving a different item); pre-ruled fix applied — `$spawnCtx` keyed by session plus tool-use id | D3, code, `artifacts/g2-3-probe.txt` |
| G2-4 fixture lacks the nested W1 case | accept, already ruled (draft ruling D-1) — convergence noted | S3 (W1 bullet) |
| G2-5 A1 checks response counts, not tokens | accept — A1 asserts `OutputTok` per row, computed from the fixture | S3 (A1) |
| G2-6 A11 assumes a dot decimal separator | verify first → DISPROVEN: in-process `de-DE` probe emits dot-decimal from the exact print shape and from `ConvertTo-Json`, with a live-culture control; no code change | `artifacts/g2-6-probe.txt` |

## 10. Audit rulings

Ruled by the AUDIT sitting, 2026-08-11, at audited head `2be9782`. Full rulings with both
readers' verdicts and every claim quoted verbatim: `loop/items/AI4DEV-80/audit-rulings.md`.
Reader one (luna via codex) landed two findings; reader two (flash via opencode) was
clean, with two COULD-NOT-VERIFY boxes the sitting settled PASS by its own measurement.

| ruling | outcome | lands in |
|---|---|---|
| AUD-1 first sighting does not win when unresolved | accept — pin the spawn-context key on EVERY first sighting, empty when unresolved; new assert A15, red before green | D3 site in code, S3 (A15), `selftest-a15-red.txt`, `selftest-a15-green.txt` |
| AUD-2 "default invocation output is unchanged" is false | accept — cured in the record: D6 amended to the narrow seams-only claim; no code change | D6 |
