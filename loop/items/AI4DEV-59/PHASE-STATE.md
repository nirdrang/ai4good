# PHASE-STATE — AI4DEV-59 (email verification, unverified-write gate)

**Phase just completed:** FIX AND GOAL (sitting 3, `orchestrator` on fable, claude-fable-5 @
xhigh), 2026-08-09. This file rides in the head that completes the phase; the sitting's
completion report names that head, and the conductor verifies the report against the remote.

## What exists now

- **Gate 2 is ruled.** Twelve findings (nine seat A, three seat B), twelve accepted, zero
  rejected; two convergent pairs; ten distinct fixes; three "accept, fixed differently", one
  with a verify-first condition that HELD. The rulings are `plan.md` section 8, every claim
  quoted verbatim, pushed at `a0b0a4b` BEFORE any code change.
- **The fixes are applied** at `154f6aa`; typecheck clean.
- **The goal is REACHED, first attempt.** Step 4: stack restarted with the flip live
  (`fa6db5a`, `stack-up.txt`) — the stale `GOTRUE_MAILER_AUTOCONFIRM=true` container was
  stopped and started, not merely reset, so the run measured the flipped system. Step 5: live
  proof 7 checks / 7 passed / 0 failed / 0 skipped (`73cae87`, `proof-local.txt`) — including
  the new (b2) tampered-link negative and the confirmation-specific (c) refusal
  (`error_code=email_not_confirmed`, pinned right the first time; link source `emailed` for
  BOTH addresses). Step 6: the whole verify surface green (`e933d9f`, `verify-final.txt`) —
  req-001 exactly 9 green / 28 declared red, req-016 unchanged from baseline. The D-B relief
  valve did NOT fire. The pre-existing stale-lock selftest flake did NOT recur.
- **Credential inspection of the transcripts: zero residue.** The executor's search list and
  result are in its report; every key in `stack-up.txt` is `<REDACTED-…>`.
- **Two sitting rulings after the executor's report**, both recorded in `plan.md`:
  (1) (b2)'s widened skip condition UPHELD — beside ruling [A2] and in step 5's text;
  (2) the rate-limit measurement accepted — the CLI did not push `email_sent = 2` into the
  auth container (`GOTRUE_RATE_LIMIT_EMAIL_SENT=360000` measured, recorded in `stack-up.txt`),
  and the proof script's comment was amended at `0e9f4de` so no stated fact contradicts the
  measurement.
- Executor invocations: two of the permitted three (the goal; the one-comment amendment).
- **The audit brief exists:** `loop/items/AI4DEV-59/audit-prompt.txt` — the reviewer contract +
  the AUDIT section (Pins block stripped) + this item's additions. ONE file serves both seats;
  nothing in it names a model, a peer, or any other gate.
- **Ruling [A9]:** `pr-body.md` is up to date in the tree; a mechanical syncs the GitHub
  pull-request body from the file after this sitting's close push (an out-of-tree act; its
  result is in the sitting's completion report).

## What completes the NEXT phase (the audit)

1. The conductor verifies this push landed (ls-remote tip equals the head the sitting
   reported).
2. The conductor spawns TWO reviewer-runners (background, sonnet, no isolation) — one per seat
   of the AUDIT block in `.claude/skills/work/reviewers.md`, pins exactly as that block states
   them. Both seats use the same prompt file, `loop/items/AI4DEV-59/audit-prompt.txt`, pinned
   to this head. Outputs land ONLY in `loop/items/AI4DEV-59/artifacts/`, seat-labelled.
3. The phase is complete when BOTH runners report LANDED with distillates. An empty or
   progress-line-only output is never a clean gate — hand it down as an anomaly.
4. BOTH seats clean → spawn the MERGE sitting; it absorbs the audit wait and records both
   clean verdicts among its dispositions. Findings from EITHER seat → spawn the AUDIT sitting,
   which rules on BOTH readers' findings (a clean seat beside a seat with findings is
   evidence, recorded, never a veto). If audit fixes change code, the whole panel re-runs once
   at the new head — never one seat.

## Notes for the next sitting

- **Flake carry-forward:** `tests/at/harness/runner.selftest.ts` line 222, stale-lock race,
  pre-existing on the unchanged tree (evidence: `baseline.txt` appendix). If CI goes red
  there: one flake re-run, no new commit; the same failure again → classify pre-existing on
  main with the baseline appendix as proof — the founder's, never fixed in this branch. Also
  a candidate standalone item to file.
- **Candidate item to file:** the CLI ignoring `[auth.rate_limit] email_sent` on the local
  stack (measured this item, recorded in `stack-up.txt`) may surprise a future leaf. Not this
  item's defect.
- **Noted by the draft sitting, still untouched:** `tests/at/suites/req-001/_bind.ts` line
  31's "33 not-yet-landed ids" count was stale before this item (baseline truth 30; after
  this item 28). Outside the plan's surfaces; reported, not fixed.
- **What the green does and does not claim:** `plan.md` section 4 — repeat it in the merge
  ruling.

## Open questions for the founder

None. Nothing contradicts ratified text; no scope growth.
