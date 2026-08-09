# PHASE-STATE — AI4DEV-59 (email verification, unverified-write gate)

**Phase just completed:** PLAN (sitting 1, `orchestrator` on fable, claude-fable-5 @ xhigh),
2026-08-09. This file rides in the head that completes the phase; the sitting's completion
report names that head, and the conductor verifies the report against the remote.

## What exists now

- `loop/items/AI4DEV-59/plan.md` — the plan: decisions D-A..D-I, steps 0–6 each with a
  done-criterion, the expected per-id verification table (the executor's goal spec), and the
  risks. One review slice (decision D-I).
- `loop/items/AI4DEV-59/gate1-prompt.txt` — the assembled gate-1 prompt: the reviewer
  contract + the PLAN review section (Pins block stripped) + this item's additions. Nothing in
  it names any other gate or reader.
- `loop/items/AI4DEV-59/pr-body.md` — the pull-request body as handed to a mechanical. The
  mechanical opens the pull request AFTER this phase's push, so the required CI check has a
  pull request to gate from the first push onward. The conductor should verify the pull
  request exists; its number is in the sitting's completion report, not here.

## What completes the NEXT phase (gate 1 — the plan review)

1. The conductor verifies this push landed (ls-remote tip equals the head the sitting
   reported).
2. The conductor spawns ONE reviewer-runner (background, sonnet, no isolation) for the single
   gate-1 reviewer: **sol via codex** — pins per the PLAN review block in
   `.claude/skills/work/reviewers.md` (`gpt-5.6-sol`, effort `xhigh`, `--sandbox read-only`).
   The prompt is `loop/items/AI4DEV-59/gate1-prompt.txt`, pinned to this head. Reviewer output
   and the distillate land ONLY in `loop/items/AI4DEV-59/artifacts/`.
3. The phase is complete when the runner reports LANDED with its distillate. An empty or
   progress-line-only output is never a clean gate — hand it down as an anomaly.
4. Then spawn the DRAFT sitting, which rules on every finding, amends `plan.md`, pushes the
   rulings BEFORE any code changes, and only then spawns the executor for the draft pass.

## Notes for the draft sitting

- The plan carries marked **unverified-runtime-claims** about GoTrue's confirmations-on
  behaviour (no session at signup; sign-in refused until confirmed; the `/auth/v1/user`
  serialisation). Expect the reviewer to press on them; they are routed to plan step 5 and are
  natural verify-first material.
- Baseline expectation before any code: req-001 at 7 green / 30 declared red.

## Open questions for the founder

None. Nothing contradicts ratified text; no scope growth.
