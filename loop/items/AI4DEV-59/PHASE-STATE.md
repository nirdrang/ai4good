# PHASE-STATE — AI4DEV-59 (email verification, unverified-write gate)

**Phase just completed:** AUDIT (sitting 4, `orchestrator` on fable, claude-fable-5 @ xhigh),
2026-08-09. This file rides in the head that completes the phase; the sitting's completion
report names that head, and the conductor verifies the report against the remote.

## What exists now

- **The audit panel's first run is ruled.** Five findings — four from seat A, one from seat B —
  five rulings, `plan.md` section 9, every claim quoted verbatim. The seats converged on no
  defect. Seat B's three PASS verdict boxes are recorded as evidence beside seat A's two FAIL
  boxes; neither seat vetoed the other.
- **Dispositions:** [L1] accepted — section 8's "three accept, fixed differently" count was
  false (the itemized record holds two); the record was corrected in the open, in section 8
  and in the audit brief. [L2]–[L4] accepted — three tightenings of the proof instrument
  `proof-local.ts` (the confirmation-refusal predicate now needs the pinned error code
  exactly; the signup guard now also catches a string `refresh_token`; the mail-catcher probe
  now scrubs response text before printing). [L5] verified this sitting with read-only git —
  the diff-scope fact seat B could not check is TRUE, and the code-gate ruling it conditions
  stands.
- **The fixes are applied and pushed.** Rulings pushed BEFORE code changes (judgment survives
  an executor death); the executor's one commit changes only `proof-local.ts`, with no printed
  format string or check-title string the committed transcript mirrors. Typecheck: the repo
  script passes but does not cover `loop/items/`; the executor proved the file with a scoped
  compiler run whose diagnostics are identical before and after the edit, and probed the
  instrument with deliberate errors to prove it reads both edited regions.
- **`proof-local.txt` is NOT regenerated** — it is the recorded output of the run pinned by
  the previous state file (in history at the audited head). Section 9 shows, per tightening,
  the recorded lines that satisfy the tightened predicate: lines 62 and 67 (the pinned error
  code held on both wires), line 56 (the verbatim NGO signup body carries no token of any
  kind), line 53 (the probe line is clean version metadata, and the pre-commit credential
  search found zero residue).
- Executor invocations this sitting: one of the permitted three.

## What completes the NEXT phase (the panel re-run)

**Code changed, so the WHOLE audit panel re-runs once at the new head — both seats, never
one.** This is the item's ONE audit re-run.

1. The conductor verifies this push landed (ls-remote tip equals the head the sitting
   reported).
2. The conductor spawns TWO reviewer-runners (background, sonnet, no isolation) — one per seat
   of the AUDIT block in `.claude/skills/work/reviewers.md`, pins exactly as that block states
   them. Both seats use the same prompt file, `loop/items/AI4DEV-59/audit-prompt.txt` (amended
   this sitting: the corrected count, plus one additive trace box pointing at the audit
   tightenings), pinned to this head. Outputs land ONLY in `loop/items/AI4DEV-59/artifacts/`,
   seat-labelled, named so they do not overwrite the first run's committed outputs.
3. The phase is complete when BOTH runners report LANDED with distillates. An empty or
   progress-line-only output is never a clean gate — hand it down as an anomaly.
4. BOTH seats clean → spawn the MERGE sitting; it absorbs the re-run wait, records both clean
   verdicts among its dispositions, and needs CI armed on this same head. Findings from EITHER
   seat → spawn a fresh AUDIT sitting to rule on them; a fix that would need a second panel
   re-run is scope growth, escalated to the founder — the re-run cap bounds effort, never
   truth.
5. CI arming: the head is final only after this sitting's close push. Arm the required check
   on the pushed head (pull request already open); a re-run finding that forces a new commit
   re-arms on the new head.

## Notes for the next sitting

- **Flake carry-forward:** `tests/at/harness/runner.selftest.ts` line 222, stale-lock race,
  pre-existing on the unchanged tree (evidence: `baseline.txt` appendix). If CI goes red
  there: one flake re-run, no new commit; the same failure again → classify pre-existing on
  main with the baseline appendix as proof — the founder's, never fixed in this branch. Also
  a candidate standalone item to file.
- **Candidate item to file:** the CLI ignoring `[auth.rate_limit] email_sent` on the local
  stack (measured this item, recorded in `stack-up.txt`) may surprise a future leaf. Not this
  item's defect.
- **Candidate item to file:** `loop/items/` sits outside every typecheck config, so proof
  scripts there are proved only by hand-scoped compiler runs (seen by the code gate and again
  this sitting). Not this item's defect; filed thinking, not built.
- **Noted by the draft sitting, still untouched:** `tests/at/suites/req-001/_bind.ts` line
  31's "33 not-yet-landed ids" count was stale before this item (baseline truth 30; after
  this item 28). Outside the plan's surfaces; reported, not fixed.
- **What the green does and does not claim:** `plan.md` section 4 — repeat it in the merge
  ruling, and note the merge ruling also records both re-run verdicts.

## Open questions for the founder

None. Nothing contradicts ratified text; no scope growth.
