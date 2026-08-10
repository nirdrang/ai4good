# AUDIT rulings — AI4DEV-80 (attribution by spawn tree)

Ruled by the AUDIT sitting, orchestrator on fable (claude-fable-5 @ xhigh), 2026-08-11.
Audited head: `2be9782` (the fix-and-goal sitting's push). This is the FIRST audit of this
item. The panel has two readers, blind to each other: reader one is luna via codex; reader
two is flash via opencode.

## The panel's verdicts

- **Reader one (luna): 2 findings.** Count line `AUDIT: 2 FINDINGS` matches the distillate.
  Fifteen checklist boxes PASS; two boxes FAIL (G1-6 and G2-3), and both FAIL boxes fold
  into finding [1]. Raw: `artifacts/audit-luna-output.txt`.
- **Reader two (flash): clean.** Count line `AUDIT: 0 FINDINGS` matches the distillate.
  Fifteen checklist boxes and the four stated-code-facts sub-items PASS; two boxes graded
  COULD-NOT-VERIFY because its cage has no shell tool. Raw:
  `artifacts/audit-flash-output.txt`. The clean seat is evidence, recorded here among the
  dispositions. It is never a veto over reader one's findings.
- **Seat conflict on two boxes, resolved by my own trace.** Reader two graded G1-6 and
  G2-3 PASS by reading; reader one traced the same lines and found a gap. A PASS proves
  the reader saw no defect, never that none exists. I traced the code myself at
  `loop/work/attribution-report.ps1:230-241`: the gap is real. Reader one's FAIL stands;
  see AUD-1.
- **Convergence: none.** The seats did not name a common defect, so no finding gets
  convergence weight.

## Reader two's COULD-NOT-VERIFY boxes — settled by this sitting: both PASS

Reader two gave the exact settling commands. I ran both in the item worktree at head
`2be9782`.

1. **The scope box.** `git diff ac8a235...HEAD --name-only` names 31 files under
   `loop/items/AI4DEV-80/` and exactly two files elsewhere:
   `loop/work/attribution-report.ps1` and `loop/work/attribution-report.selftest.ps1`.
   Every path sits under the declared scope. **PASS.**
2. **The containment half of G1-1.** `git diff ac8a235...HEAD --name-only -- loop/work`
   names exactly the two declared code files. No process contract changed. **PASS.**

## AUD-1 — reader one's finding [1]: ACCEPT — the code changes to match the record

Reader one's claim, verbatim (severity medium, `loop/work/attribution-report.ps1:235`):

> claim: `$spawnCtx` does not make the first sighting win when that sighting has no
> resolved item.
> why it matters: If a spawn call first appears while the session has no branch or stamp,
> lines 236-241 store no key; a later `tool_use_id` occurrence after the session resolves
> an item is then accepted, so the child inherits the later tool-result state rather than
> the state at its spawn call.

**Ruling: accept.** Class: an adopted ruling is not implemented as ruled — the record is
false, and that is never mergeable. Rulings G1-6 and G2-3 (plan D3c) say: first sighting
wins within a session, and the child inherits the item the session had resolved AT the
spawn call. The code stores a key only when the sighting RESOLVES an item. An unresolved
first sighting stores nothing, so the guard `ContainsKey` does not fire at the next
occurrence of the same session-qualified id — the tool result — and the code accepts the
session's LATER state. As written, the code implements "first RESOLVED sighting wins",
which is not the ruled semantics.

**The ruled fix.** At the sighting site (`attribution-report.ps1:236-241`): store the key
on EVERY first sighting. When the session state resolves exactly one item, store that
item; in every other case store the empty string. `Get-TreeItem` already treats an empty
stored value as unattributed, so no change is needed there. The pin makes a later
occurrence unable to overwrite — which is what "first sighting wins" means.

**The ruled test.** New assert A15, red before green. The fixture plants a session in
which a spawn `toolu_` id first appears BEFORE any branch or stamp fact; the session then
resolves an item; the same id appears again in the tool result. The spawned agent is
branchless, with its meta naming that session and tool-use id. A15 asserts the agent
stays unattributed. The executor captures A15 failing against the audited head's code
(committed as `selftest-a15-red.txt`), applies the fix, then runs the full suite to green
(`selftest-a15-green.txt`). A15 red against the old code is the proof the assert binds.

**Evidence refresh.** The fix can move the live-store numbers, so the executor re-runs
the report and refreshes `report-after.txt`, `report-after-79.txt` and `after-delta.md`
at the new head. Git history keeps the goal-head versions.

## AUD-2 — reader one's finding [2]: ACCEPT — the record changes to match the code

Reader one's claim, verbatim (severity low, `loop/work/attribution-report.ps1:574`):

> claim: The item's claim that the default invocation output is unchanged is false.
> why it matters: The new recursive scan at `:79-82`, changed header at `:574`, and new
> floor/output text at `:602-607` make a no-argument run differ materially from the base
> output, not only by its date.

**Ruling: accept — cured in the record, no code change.** The sentence "Default
invocation output is unchanged." (plan.md, D6) is false as written. The code is correct:
the default run's content changes BY DESIGN — the recursive scan, the `tree` source rows,
the revised header and floor notes are the item's purpose, and the before/after evidence
(D9, S8) documents exactly that change. The sentence's narrow intent was true — the
testability seams add no output change of their own, because the root-override parameters
default to the previous hard-coded paths and the tables render exactly when `-Json` is
absent. Plan.md D6 is amended this sitting to state the narrow claim and only it, marked
AUD-2.

## Reader two's note outside its findings

A pre-existing exposure: a session transcript whose tool result quotes a stamp can
corrupt that session's stamp state. The record already attributes it to another item, and
reader two saw no code evidence against that attribution. Already carried as follow-up 3
in `PHASE-STATE.md`. No action here.

## Disposition count

Two findings ruled: both accepted — one fixed in code (AUD-1), one cured in the record
(AUD-2). Reader two's two COULD-NOT-VERIFY boxes settled PASS by this sitting's own
measurement. One seat conflict resolved in favor of the traced defect.

## What follows

AUD-1 changes code, so the once-per-item audit re-run happens at the new head. BOTH seats
run again. Their change-set is the fix delta, `git diff 2be9782...<new head> -- loop/work`,
not the full range; the scope box alone re-checks the full range. The re-run prompts with
the rebuilt claim checklist are `audit-rerun-luna-prompt.txt` and
`audit-rerun-flash-prompt.txt`, byte-identical by design. The conductor launches the
runners; a fresh audit sitting rules on the re-run.
