# PHASE-STATE — AI4DEV-58 (GitHub sign-in, mandatory GitHub link)

**THE ITEM IS DONE.** Merge sitting (sitting 5, `orchestrator` on fable, claude-fable-5 @
xhigh) completed 2026-08-09. There is no next phase.

## The closing facts, all verified live this sitting

- **Merged head:** `60a02cb70d065d95db68ea92a08728c7502f90a9` — squash-merged to main as
  `026c8cc2dc49c0cf3cedddf4d686dad57753d2f8` at 2026-08-09T01:28:06Z, confirmed on
  `origin/main` after fetch.
- **CI:** required check `verify` (workflow "CI") green on exactly the merged head — run
  31288110295, created 2026-08-09T01:21:44Z, completed 01:22:29Z, conclusion success.
  Confirmed against the live API this sitting, not carried from the conductor's report.
- **Merge ruling:** posted on pull request #48 as handed, before the merge —
  https://github.com/nirdrang/ai4good/pull/48#issuecomment-5229178177 — pinned to the merged
  head, with every finding's disposition across gate 1 (5), gate 2 (7 rulings over 8 findings
  plus 5 deviation rulings), and the audit (3), the single-reader gate-2 disclosure, the
  green-does-and-does-not-claim section, and the rejected audit claim verbatim.
- **Execution:** a mechanical published the ruling and ran the merge (founder ruling
  2026-08-07: the orchestrator never runs the merge command). No refusal fired.
- **Board:** the integration flipped the item In Progress → Done at 2026-08-09T01:28:08Z,
  two seconds after the merge. Verified in Linear directly. No repair was needed.
- **Live PR body** was byte-identical to `loop/items/AI4DEV-58/pr-body.md` at ruling time
  (an apparent 34-character difference was this sitting's own mis-decoded file read — the
  ANSI-codepage em-dash trap; re-measured with a UTF-8 read, exact match).
- The audit's re-run budget was never spent; CI never turned red; no post-merge fix exists.

## Handed to the coordinator for filing (in the merge sitting's completion report)

1. Product question (from gate-1 F3): should Auth permit a volunteer to unlink the GitHub
   identity after signup? `enable_manual_linking = true` opens the unlink surface; no
   acceptance id covers post-signup identity lifecycle.
2. Pre-existing on main (from gate-2 R5's re-capture): the predecessor item's four tables
   each grant REFERENCES/TRIGGER/TRUNCATE to anon, authenticated and service_role —
   default-privilege residue, measured, NOT fixed on this branch.
3. Process finding (from deviation ruling Dev-4): a `supabase functions serve` can outlive
   its worktree and keep answering from a deleted directory — for the worktree-lifecycle
   lessons.

## Cleanup note for the coordinator's sweep

The fix sitting's local Supabase stack and `supabase functions serve` (executor background
task `bxb22m5k7`) may still be running on the machine; they are cleanup, not evidence.
