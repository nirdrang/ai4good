# Gate 1 rulings — AI4DEV-80 (attribution by spawn tree)

Written by the DRAFT sitting, orchestrator on fable (claude-fable-5 @ xhigh), 2026-08-11.
Ruled at head `1c475af` (the plan sitting's push). Reviewer: gpt-5.6-sol via codex, PLAN
review, count line `PLAN REVIEW: 10 FINDINGS` — distillate count matches.

Evidence: `loop/items/AI4DEV-80/artifacts/gate1-sol-distillate.md` (distillate),
`gate1-sol-output.txt` (raw), `gate1-sol-stderr.log` (run header and session id).

Each ruling quotes the reviewer's claim, then gives exactly one outcome. The plan amendments
these rulings order are woven into `plan.md` sections 4, 5 and 6; section 7 points here.

---

## G1-1 — accept, fixed differently (severity: critical, plan.md:126, D10)

Claim: "D10 orders the draft-code gate to run even though the governing territory rule
requires a `loop/`-only diff to skip it."

The contradiction is real. The conductor contract (`.claude/agents/conductor.md:266-274`) and
the workflow (`.claude/skills/work/WORKFLOW.md:126-127`) both make the skip derived, not
judged. But the derived rule exists to block a self-granted LOOSENING — an orchestrator
exempting its own item from review. D10 goes the opposite direction: the derived answer is
skip, and the ruling orders the gate to RUN. A tightening may be proposed openly; that is
what D10 is.

The implied remedy — obey the derived skip — is rejected: skipping code review on a
~400-line script rework is the wrong outcome. Disposition:

- D10 STANDS for this item. The conductor already carries the standing ruling in
  PHASE-STATE and has acknowledged it; gate 2 runs.
- The contract gap is FILED as standalone machinery work, in words, not built here: the
  derived skip needs one clarifying sentence in the conductor contract and the workflow —
  a derived SKIP is a floor an orchestrator ruling recorded in PHASE-STATE may tighten to
  RUN; a derived RUN may never be loosened to SKIP. This item's path-set does not include
  the process contracts, and the clarification stands alone.

## G1-2 — accept, fixed differently (severity: critical, plan.md:137)

Claim: "The numbered implementation sequence requires RED and GREEN selftest executions
during the draft pass, which the executor contract expressly forbids."

Correct: `.claude/agents/executor.md:24-27` forbids running the verify suite in a draft
pass, and S3 (RED run) and S6 (green run) both ordered exactly that. The fix is not an
exception to the contract — it is a resequencing that also produces stronger evidence:

- The draft pass runs NO selftest invocation at all. S3's draft-time done-criterion becomes:
  the selftest file exists, carries every assert A1–A14, and passes a syntax check
  (tokenize/parse, no execution). One commit per step stays, so the S3 commit pins the
  pre-mechanism report code.
- The RED baseline is captured in the FIX-AND-GOAL pass, after the ruled gate-2 fixes land:
  restore `loop/work/attribution-report.ps1` from the S3 commit
  (`git checkout <S3-sha> -- loop/work/attribution-report.ps1`), run the FINAL selftest
  against it, expect exit 1 with the predicted per-assert pattern (plan section 6), commit
  the log as `selftest-red.txt`, restore the head file. This way the RED evidence uses the
  final fixture — including any gate-2 amendments to it — against the pre-mechanism code.
- Fallback, decided now so it is not a judgment call later: if the final selftest cannot
  drive the S3-era report (a seam changed by a gate-2 fix), capture RED with BOTH files
  restored from the S3 commit and say so in the delta note.
- The green capture (`selftest-green.txt`) and S8 belong to the goal loop, as the executor
  contract already shapes it.
- Distinction stated so the draft is executable: the verify suite of this item is the
  SELFTEST. The report script itself is the subject under test — the draft runs the report
  where a done-criterion needs it (S1's evidence, S2's output comparison). That is a build
  check, not a suite run.

## G1-3 — accept (severity: high, plan.md:163, A3)

Claim: "A3 cannot have the predicted S3 PASS state against the S2 scan set."

Correct on both horns: before S4 the subagents files are unscanned, so the total-equality
half cannot pass; and a `bg.output` visible only through the real Temp root proves nothing.
Fix:

- `bg.output` moves INSIDE the fixture projects root (`<session>/tasks/bg.output`). The
  exclusion assert then tests the head scanner against its own root: a too-broad glob
  (`*.output`, unfiltered recursion) counts it and fails A3. Not vacuous.
- No temp-root seam is added. The S3-era `.output` scan reads the real Temp root and never
  sees the fixture; at the RED capture A3 fails on its total half, which is the corrected
  prediction (plan section 6).
- A3's fixture count is not hard-coded: the expected total is the assistant-usage line sum
  over all fixture `.jsonl` files, computed by the selftest from what it wrote (now nine
  files, after the fixture additions of G1-4/6/8).

## G1-4 — accept (severity: high, plan.md:95, D3)

Claim: "An agent file resolving two distinct items falls through to ancestor inheritance
instead of remaining ambiguous."

Correct — as written, D3(a) "single distinct item" fails on a two-item file and D3(b) then
inherits the parent's item: a confident guess, against the ruled "degrade, never guess".
Fix: D3(b) applies only when (a) finds ZERO items in the agent's own records. Two or more
distinct items: the file's branchless responses stay unattributed, and the floor note
states the ambiguous-file count. New assert A9: fixture agent `agent-M1.jsonl` carries
records on two item branches plus branchless usage lines, meta parent C1 — the branchless
lines land in the unattributed row and never under C1's item.

## G1-5 — accept (severity: high, plan.md:97, D3)

Claim: "The depth cap of eight truncates the ruled full spawn forest without any stated
platform bound justifying it."

Correct: the visited set already terminates the walk; the cap only truncates valid
propagation. The cap is removed; the visited set is the sole guard. Removal condition
(a ruling that removes work carries one): the walk must demonstrably keep the visited set.
If implementation contact shows it absent or ineffective, the executor restores a bound and
reports, rather than removing silently.

## G1-6 — accept (severity: high, plan.md:169, A7)

Claim: "A7 does not prove that session-root inheritance is resolved at the specific spawn
`toolUseId`."

Correct — with one held item file-wide, a latest-wins or file-wide implementation passes.
Fix: the coordinator fixture holds item `AI4DEV-901` when it spawns C1 and U1; the stamp
then changes to `AI4DEV-902`; the session spawns U2. A7 asserts U1 → `AI4DEV-901` AND
U2 → `AI4DEV-902`, each from the session's stamp state at its own spawn `toolUseId`.
Latest-wins gives U1 the wrong item; file-wide-single finds two items and resolves neither.
The chain cache keeps `AI4DEV-900 > AI4DEV-901`; `AI4DEV-902` stays chainless (the rollup's
pass-through path, reconciled by A4).

## G1-7 — accept, fixed differently (severity: high, plan.md:111, D6)

Claim: "The JSON oracle exposes neither Codex nor Kimi aggregates, and the fixture
exercises neither required vendor join."

The gap is real; the fix is scoped to what this item's changes can break. `-Json` gains the
vendor aggregate tables (`codexRows`, `kimiRows`). New assert A10: a minimal kimi fixture
under `-KimiRoot`, keyed by the BARE agentId `O1` (the file shape copied from the real
store by the executor, which has first-hand contact) — its row must join to
(`AI4DEV-901`, orchestrator). That tests the two hazards this item introduces: the
`agent-` prefix strip and tree-resolved agents feeding `agentItem`. The codex join is
touched by no plan step; its preservation is evidenced by the before/after captures on the
real store (E1/E2 both show the codex table). Condition: if implementation contact shows
the codex join entangled with the deleted pairing pass, the executor stops and reports,
and the fix sitting adds a fixture assert for it.

## G1-8 — accept in part (severity: high, plan.md:197, S8)

Claim: "The headline unattributed-percentage requirement has neither a correctness
assertion nor a quantitative done-criterion."

The correctness half is accepted. New fixture agent `agent-X1.jsonl`: usage lines, NO meta
file — an `unmarked agent` with no edge and no branch, unattributed BY DESIGN (D2). New
assert A11: the unattributed row equals exactly X1's responses plus M1's branchless
responses (the only unattributed lines the fixture plants), and the printed unattributed %
equals the value recomputed from the JSON totals, to the report's own rounding. A
hard-coded or miscalculated % fails A11; on the live store it is also a stated fact about
the code, which the audit grades.

The quantitative-threshold half is REJECTED, with this reason: the live store changes
daily, so any fixed number would be arbitrary — a threshold chosen to feel safe, not a
measured bound. The S8 criterion becomes: the after % is strictly lower than the before %,
both stated in the delta note with their response counts. The measured expectation (872
never-scanned transcripts, plan F1) is that the drop is large; if it is NOT large, S8
reports that number as a finding, never hides it. The number is the evidence; "sharp" is
judged at the merge ruling where the founder can see it.

## G1-9 — accept (severity: medium, plan.md:159)

Claim: "The goal selftest never invokes `-Days` or `-Item`, so its green result cannot
preserve either filter's semantics."

Correct. Two asserts, each its own report invocation against the same fixture:

- A12: `-Json -Item AI4DEV-902` returns rows for that item only, and its response count
  equals the fixture's known sum for `AI4DEV-902` (U2 + the coordinator's 902-stamp lines
  + M1's 902-branch lines).
- A13: the fixture sets `agent-E1.jsonl`'s LastWriteTime 40 days back. A `-Days 7` run
  excludes exactly E1's responses from the total; the default all-history run includes
  them (which A1–A11 already require).

## G1-10 — accept (severity: medium, plan.md:95)

Claim: "The new whole-file branch discovery and spawn-context reads are not constrained or
tested to ignore escaped JSON embedded in tool results."

Correct — a pass that matches `\"gitBranch\"` reads quoted transcripts as branch facts.
Fix: D3(a)'s whole-file discovery and the spawn-context reads reuse the existing
unescaped-only predicate (the same match shape the current per-record scan uses). Fixture:
`agent-O1.jsonl` gains a tool-result record containing an ESCAPED
`\"gitBranch\":\"nirdrang/ai4dev-999-decoy\"`. New assert A14: no row in any table names
`AI4DEV-999`.

---

## Disposition summary

| finding | outcome |
|---|---|
| G1-1 (gate ruled to run vs derived skip) | accept, fixed differently — D10 stands; contract clarification filed, in words |
| G1-2 (draft pass runs the suite) | accept, fixed differently — no draft-time run; RED captured in the goal pass from the S3 commit |
| G1-3 (A3's predicted state impossible) | accept — bg.output moves into the fixture root; prediction corrected |
| G1-4 (two-item file inherits parent) | accept — zero-item condition; ambiguity stays unattributed; A9 |
| G1-5 (depth cap truncates propagation) | accept — cap removed; visited set stays, as a checked removal condition |
| G1-6 (A7 passes latest-wins) | accept — stamp changes mid-fixture; U2 added; A7 split-item oracle |
| G1-7 (vendor joins untested) | accept, fixed differently — JSON vendor tables; kimi assert A10; codex via before/after evidence |
| G1-8 (unattributed % unproven) | accept in part — A11 correctness oracle; fixed live threshold rejected with reason |
| G1-9 (`-Days`/`-Item` unprotected) | accept — A12, A13 |
| G1-10 (escaped-JSON decoys) | accept — unescaped-only predicate; decoy fixture; A14 |
