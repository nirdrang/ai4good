# PHASE-STATE — AI4DEV-59 (email verification, unverified-write gate)

**THE ITEM IS DONE.** Merge sitting (sitting 6, `orchestrator` on fable, claude-fable-5 @
xhigh) completed 2026-08-09. There is no next phase.

## The closing facts, all verified live this sitting

- **Merged head:** `f877787dc0a047c2c6f0ba6db1bc282586275671` — squash-merged to main as
  `e2e0799ce89f149e2602494fc404eb731f570daa` at 2026-08-09T17:12:04Z. Confirmed by two
  instruments: the pull-request API (state MERGED) and a fetch showing that commit as the
  tip of `origin/main`.
- **CI:** required check `verify` (workflow "CI", the only required status context on main)
  green on exactly the merged head — run 31325473331, job 93275013384, created
  2026-08-09T17:05:03Z, conclusion success. Confirmed against the live API this sitting with
  the head SHA in the run record.
- **Merge ruling:** posted on pull request #49 as handed, before the merge —
  https://github.com/nirdrang/ai4good/pull/49#issuecomment-5232724532 — pinned to the merged
  head. It records every disposition: gate 1 (4 findings, 4 accepted), gate 2 (12 findings,
  10 distinct defects, 12 accepted), audit wave 1 (5 findings, 5 accepted or verified), audit
  wave 2 (5 raw findings, 3 rulings, 3 accepted), both audit seats' box verdicts in both
  waves, the green-does-and-does-not-claim section, and the statement that no maintained
  reviewer disagreement exists (zero rejections across the whole item).
- **Execution:** a mechanical published the ruling and ran the merge (founder ruling
  2026-08-07: the orchestrator never runs the merge command). The merge command itself was
  not refused. The mechanical's post-merge READ (`gh pr view`) was refused by the permission
  classifier; per the workflow the post-merge check is the orchestrator's own step, and the
  orchestrator ran it in its own session. The denial text is carried verbatim in the merge
  sitting's completion report for the founder.
- **Board:** the integration flipped the item In Progress → Done at 2026-08-09T17:12:06Z,
  two seconds after the merge. Verified in Linear directly. No repair was needed.
- **Live PR body** was byte-identical to `loop/items/AI4DEV-59/pr-body.md` at ruling time
  (normalized UTF-8 comparison; a first "mismatch" was this sitting's own instrument error —
  a line-array capture — re-measured as single strings, exact match). The body names no item
  id this branch does not own, and the green reference guard agrees.
- The audit's one re-run was spent in the audit phase (code changed by three wave-1
  rulings); CI never turned red; no post-merge fix exists; no founder question is open.

## Handed to the coordinator for filing (in the merge sitting's completion report)

1. Pre-existing flaky selftest: `tests/at/harness/runner.selftest.ts` line 222, a stale-lock
   race on the unchanged tree (evidence: the item's `baseline.txt` appendix).
2. The Supabase CLI ignores the local `[auth.rate_limit] email_sent` config key; measured
   this item, recorded in `stack-up.txt`. The container ran with its own default.
3. `loop/items/` sits outside every typecheck config, so proof scripts there are proved only
   by hand-scoped compiler runs.

## Cleanup note for the coordinator's sweep

The fix sitting's local Supabase stack and its `supabase functions serve` process may still
be running on the machine; they are cleanup, not evidence. The remote item branch still
exists (the merge did not delete it) and carries this close commit until the sweep.
