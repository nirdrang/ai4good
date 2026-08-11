# PHASE-STATE — AI4DEV-80 (attribution by spawn tree)

**Phase: MERGE RULED — the ruling is written and rides in this head. What remains is
mechanical: the required check green on this exact head, then a mechanical publishes the
ruling and executes the squash merge.** Written by the merge sitting, orchestrator on
fable (claude-fable-5 @ xhigh), 2026-08-11. Chain, derived from the branch: AI4DEV-4 (the
work skill, bring-up root) > AI4DEV-80 (attribution by spawn tree), label `attr:bringup`.

## What happened this sitting

1. **Both audit re-run seats came back clean** — reader one "AUDIT: CLEAN" (19/19 boxes),
   reader two "AUDIT: 0 FINDINGS" (18 boxes graded, scope box COULD-NOT-VERIFY). This
   sitting recorded both verdicts among its dispositions and settled the scope box PASS
   with the reviewer's own settling command: 54 files in the full range, zero outside
   `loop/items/AI4DEV-80/` and `loop/work/`; the only code files are the report and its
   selftest.
2. **The red check was classified, not merged through.** Thirteen pull-request runs
   failed on one cause outside this branch: main added the twin-guard step (21:55:18 UTC)
   while the checkout is pinned to the branch head, whose tree predates the guard's
   script. The last green run started 21:55:00 UTC — eighteen seconds before the guard
   landed. Earliest and latest failures spot-checked: same single step, script missing,
   twins never compared. Main's own push runs stay green. Not this item's defect, not
   infrastructure, not a flake — the one-re-run budget stays unspent (a re-run is pinned
   to its original workflow snapshot and would fail identically). The coordinator relayed
   the same diagnosis and fixed the skew on main (the guard now skips loudly on trees
   that predate it); the relay ruled nothing, this sitting ruled.
3. **Cure: forward merge of main into the branch, `93ee7f1`.** Zero conflicts (the file
   sets are disjoint). The item's own diff is byte-identical across the merge — patch-id
   `d4b20d0b8448731ba3301aedf5ca06d88c83bbd6` before and after — so no item code changed
   and the spent audit stands; no audit question reopens. The twin check passes locally
   on the merged tree ("SYNCED - 231 body lines identical apart from the declared
   differences", exit 0).
4. **The merge ruling is written: `merge-ruling.md`** — what was built, every disposition
   from gate 1, gate 2, the first audit and the re-run, the CI classification, what the
   green does and does not claim, the evidence stated plainly, the open founder question,
   and four follow-ups in words. It contains no item id but this branch's own.
5. **The pull-request body update is written: `pr-body.md`** — corrects the stale assert
   count (fifteen, not eight) and states plainly what the evidence shows.

## What completes the item

1. The required check goes green on THIS head (the commit that carries this file, the
   ruling, and the forward merge `93ee7f1`). Expected: prose fast lane, guards only; the
   twin guard now finds its script in the tree.
2. A mechanical, handed exact instructions:
   a. verify the required check is green on this exact head and record run id + SHA;
   b. `gh pr edit 52 --body-file loop/items/AI4DEV-80/pr-body.md` (as handed);
   c. `gh pr comment 52 --body-file loop/items/AI4DEV-80/merge-ruling.md` (as handed);
   d. `gh pr merge 52 --squash` — never `--admin`, never on a non-green check. A refusal
      is a STOP: report the exact denial text upward; no other actor runs the command.
3. The orchestrator (this sitting if alive, a successor otherwise) checks the merged
   state: pull request MERGED, the squash commit on main, the board item flipped Done by
   the integration. Then PHASE-STATE: done.
4. If the check comes back red on this head: it is a NEW cause by construction (the twin
   skew is cured in this tree; the guards passed this pull request's shape at the last
   green run). Classify fresh; do not spend the flake re-run on the old cause.

## Open founder question — carried in the ruling, not resolved

The board item expected the unattributed share to "drop sharply". Measured: 70.6% to
67.5%, because the denominator grows too (479 to 924 transcript files, 26352 to 49336
responses). Attributed responses nearly double (10816 to 21345, +97.4%); the spawn-tree
source attributes 4445 responses across 14 items; the previous item's scoped view grows
from 249 responses in 2 roles to 1935 in 7. Question for the founder: are the attribution
numbers the accepted headline, in place of a sharp percentage drop? Shapes the reading of
the outcome, not the merge.

## At close — follow-ups, FILED IN WORDS, not built

1. The flash/opencode reviewer-spend join (scoped out by the item).
2. One sentence for the conductor contract and the workflow: a derived gate SKIP is a
   floor an orchestrator ruling recorded in PHASE-STATE may tighten to RUN, never the
   reverse (ruling G1-1).
3. Pre-existing: a session transcript whose tool result quotes a stamp can corrupt that
   session's stamp state in the report (gate 2; re-observed by an audit seat).
4. Pre-existing (audit re-run, reader one, out of scope): the branch regex at
   `attribution-report.ps1:136` does not guard against a preceding backslash; the fix
   delta cannot reach it.

## Standing pointers

Dispositions: `merge-ruling.md` (summary), `audit-rulings.md`, `gate1-rulings.md`,
`gate2-rulings.md`, plan sections 7-10. Evidence: `after-delta.md` (section 5 is the A/B
run), the four selftest captures, `artifacts/` (all committed). Heads: base `ac8a235`,
audited `2be9782`, fix/re-run `8af0e18`, forward merge `93ee7f1`, final head = the commit
carrying this file.

## Anomalies

- This merge sitting received its birth certificate and its conductor address normally.
- Carried, no action: reader two's gate-2 contamination (ruled, no independence weight);
  the first audit's two-box seat conflict (resolved for the traced FAIL); `git commit -F`
  for multi-line messages in PowerShell 5.1.
