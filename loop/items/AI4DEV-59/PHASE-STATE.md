# PHASE-STATE — AI4DEV-59 (email verification, unverified-write gate)

**Phase just completed:** DRAFT (sitting 2, `orchestrator` on fable, claude-fable-5 @ xhigh),
2026-08-09. This file rides in the head that completes the phase; the sitting's completion
report names that head, and the conductor verifies the report against the remote.

## What exists now

- **Gate 1 is ruled.** All four findings adopted (two as accept, two as accept-fixed-
  differently); the rulings are `plan.md` section 7, with every claim quoted verbatim. The
  rulings and the amended plan were pushed at `135ea57`, BEFORE any code change.
- **The draft is built and pushed** — commits `4529602` (step 0 baseline) through `942f1c3`
  (step 5 proof script), one commit per plan step. `bun run typecheck` and both `at:check`
  runs exit 0 on the changed tree. **The verify suite has deliberately not been run on the
  changed tree** — no `at:verify`, no `at:selftest` after the first edit. The draft exists to
  be critiqued.
- `loop/items/AI4DEV-59/baseline.txt` — step 0 on the unchanged tree: req-001 at 7 green / 30
  declared red, all six commands exit 0. Its appendix records a pre-existing flake (below).
- `loop/items/AI4DEV-59/proof-local.ts` — the live-stack proof script, written and NEVER run.
  Running it belongs to the fix-and-goal sitting (plan steps 4–6).
- `loop/items/AI4DEV-59/gate2-prompt.txt` — the assembled draft-code prompt: the reviewer
  contract + the DRAFT CODE review section (Pins block stripped) + this item's additions. ONE
  file serves both seats; nothing in it names a model, a peer, or any other gate.

## What completes the NEXT phase (gate 2 — the code review)

The diff reaches code (~913 lines outside `loop/items/`), so the code gate RUNS — it is not
skipped. One slice, per amended D-I.

1. The conductor verifies this push landed (ls-remote tip equals the head the sitting
   reported).
2. The conductor spawns TWO reviewer-runners (background, sonnet, no isolation) — one per seat
   of the DRAFT CODE review block in `.claude/skills/work/reviewers.md`, pins exactly as that
   block states them. Both seats use the same prompt file,
   `loop/items/AI4DEV-59/gate2-prompt.txt`, pinned to this head. Outputs land ONLY in
   `loop/items/AI4DEV-59/artifacts/`, seat-labelled.
3. The phase is complete when BOTH runners report LANDED with distillates. An empty or
   progress-line-only output is never a clean gate — hand it down as an anomaly.
4. Then spawn the FIX AND GOAL sitting: it rules on both seats' findings, pushes rulings
   first, then sends the executor to check verify-first claims, apply ruled fixes, and pursue
   the goal — plan steps 4 (stack restart), 5 (the live proof) and 6, `at:verify` green within
   the caps. That sitting also commits both seats' full evidence and writes the audit brief.

## Rulings this sitting made outside gate 1

- **Pre-existing flaky selftest, ruled not this item's defect.** On the UNCHANGED tree at
  `135ea57`, `bun run at:selftest` failed 1 run in 6 at `tests/at/harness/runner.selftest.ts`
  line 222 (the stale-lock race: both contenders acquired). Evidence: the appendix of
  `loop/items/AI4DEV-59/baseline.txt`. The file is outside this item's surfaces and was not
  touched. If CI goes red on that line for this item's pull request: one flake re-run, no new
  commit; if it fails the same way again, classify it pre-existing-on-main with the baseline
  appendix as proof — it goes to the founder, never fixed in this branch. It is also handed
  upward in the completion report as candidate standalone work to file.
- **Two beyond-letter edits accepted.** The draft amends `_contract.ts`'s header and routes
  the fixture's `completeSignup` through a shared `renderAuthUser` helper — both keep the
  code's own comments true. Accepted by this sitting; the gate-2 prompt points reviewers at
  the refactor explicitly.
- Noted, untouched, for later filing: `tests/at/suites/req-001/_bind.ts` line 31's "33
  not-yet-landed ids" count was stale before this item (baseline truth: 30; after this item:
  28). Not in the plan's surfaces; reported, not fixed.

## Notes for the fix-and-goal sitting

- The plan's unverified-runtime-claims (GoTrue confirmations-on behaviour) are step 5's
  subject; expect gate-2 unverified markers to route there as verify-first rulings.
- Step 3's done-criterion (at:verify exactly 9 green / 28 declared red) has NOT been checked
  yet — the declaration ledger already claims 9/28, so at:verify stays red until the bodies
  pass. That is the draft contract working as designed, not a defect.
- The D-B relief valve (raising `email_sent` from 2) is pre-authorized and will likely fire:
  the amended step 5(e) needs confirmation emails for at least two addresses.

## Open questions for the founder

None. Nothing contradicts ratified text; no scope growth.
