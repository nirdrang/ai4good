# PHASE-STATE — AI4DEV-59 (email verification, unverified-write gate)

**Phase just completed:** AUDIT (sitting 5, `orchestrator` on fable, claude-fable-5 @ xhigh),
2026-08-09 — the sitting that ruled on the panel RE-RUN's findings. This file rides in the
head that completes the phase; the sitting's completion report names that head, and the
conductor verifies the report against the remote.

## What exists now

- **The audit re-run is ruled and the audit phase is CLOSED.** The whole panel re-ran at head
  `6e22564`. Seat A (luna via codex): three findings; boxes rulings-implemented PASS,
  diff-scope PASS, stated-facts FAIL, runtime COULD-NOT-VERIFY (correct — execution evidence
  is CI's). Seat B (flash via opencode): first launch crashed on a ripgrep tool-output-size
  error with NO output — an empty gate is an anomaly, never a clean seat — and the relaunch
  landed two findings; boxes rulings-implemented PASS, diff-scope PASS, stated-facts FAIL.
  The seats converged twice, so five raw findings yielded three rulings: `plan.md`
  section 10, every claim quoted verbatim.
- **Dispositions:** [M1] accepted, fixed differently — the record over-claimed check (e)'s
  volunteer predicate ("repeats (a)–(d)"); the record now enumerates exactly what (e)
  re-asserts and names the three (d)-conjuncts it does not (step 5(e), section 3). The
  predicate itself is deliberately untouched: no adopted ruling required those conjuncts,
  and a code change would demand a second panel re-run the once-per-item cap forbids. [M2]
  accepted — the `stack-up.txt` launch-timestamp contradiction is real; fixed by a dated,
  attributed annotation appended to the entry, original evidence lines untouched. [M3]
  accepted — the ambiguous "seats converge on no defect" sentence in section 9 now says the
  first run's seats' findings were DISJOINT, count of five beside it.
- **No ruling changed code.** All three fixes are record: `plan.md` (sections 3, 9, 10) and
  the `stack-up.txt` annotation. The audit re-run trigger is "only if code changed" (the
  orchestrator contract's caps), so nothing re-arms it; the item's one re-run is spent and
  stays spent. No executor was spawned this sitting: zero code changes existed, and the
  record edits ARE the rulings, which the contract assigns to the orchestrator.
- **Evidence in the record:** both re-run raw outputs, both distillates, seat B's tool-call
  summary and identity extract were committed at `91b5933`; the rulings and amendments land
  in this sitting's close commit. Seat B's crashed first launch wrote nothing to commit; its
  record is section 10's opening and the `91b5933` commit message.

## What completes the NEXT phase (MERGE)

1. The conductor verifies this close push landed (ls-remote tip equals the head the sitting
   reported), then ARMS the required CI check on that exact head — after the push, never
   before, because the close commit moved the head. The pull request is already open.
2. The conductor spawns the MERGE sitting (orchestrator, fable, no isolation) once CI has a
   result — or with CI pending, for the sitting to hold per its contract's CI
   classification rules.
3. The merge ruling is pinned to the exact head and records: what was built; the
   dispositions of EVERY finding from BOTH panel waves (section 9's five, section 10's
   three) with both re-run seats' box verdicts beside them; what the green does and does not
   claim (`plan.md` section 4 — repeat it); and no maintained reviewer disagreement exists —
   every audit finding was accepted (none rejected), so nothing needs verbatim carriage as a
   dismissed claim.
4. A mechanical publishes the ruling and executes the merge; the orchestrator NEVER runs the
   merge command itself and verifies the merged state afterwards. If the mechanical reports
   a permission refusal, that is a STOP, reported upward with the exact denial text.
5. The pull request body must name no item id this branch does not own; other items are
   named in words.

## Notes for the merge sitting

- **Flake carry-forward:** `tests/at/harness/runner.selftest.ts` line 222, stale-lock race,
  pre-existing on the unchanged tree (evidence: `baseline.txt` appendix). If CI goes red
  there: one flake re-run, no new commit; the same failure again → classify pre-existing on
  main with the baseline appendix as proof — the founder's, never fixed in this branch.
  Also a candidate standalone item to file.
- **Candidate item to file:** the CLI ignoring `[auth.rate_limit] email_sent` on the local
  stack (measured this item, recorded in `stack-up.txt`). Not this item's defect.
- **Candidate item to file:** `loop/items/` sits outside every typecheck config, so proof
  scripts there are proved only by hand-scoped compiler runs. Not this item's defect.
- **Carried-forward instrument thinking (ruling [M1]):** a successor that copies
  `verificationRoundTrip` into an aggregate check should carry (d)'s status conjuncts, and
  an ASSERTED tampered-probe outcome, in the aggregate's predicate — never a prose
  "repeats" claim. Filed thinking, not built.
- **Noted by the draft sitting, still untouched:** `tests/at/suites/req-001/_bind.ts` line
  31's "33 not-yet-landed ids" count was stale before this item (baseline truth 30; after
  this item 28). Outside the plan's surfaces; reported, not fixed.

## Open questions for the founder

None. Nothing contradicts ratified text; no fix grew scope. (The one path that would have
needed the founder — tightening `proof-local.ts`, a code change needing a second panel
re-run — was not required for truth and was not taken; ruling [M1] records the reasoning.)
