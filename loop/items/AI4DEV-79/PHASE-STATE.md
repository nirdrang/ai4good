# PHASE-STATE — AI4DEV-79 (parallel local DB slot pool)

**Phase: MERGE RULED — decision MERGE.** The merge sitting (orchestrator on fable,
claude-fable-5 @ xhigh) closed 2026-08-10. Chain, derived from the branch: AI4DEV-79
(parallel DB slot pool) → the acceptance-test harness bring-up root, label `attr:bringup`.

## The merge ruling exists and the decision is MERGE

- `loop/items/AI4DEV-79/merge-ruling.md`, committed with this file. It pins head
  `c01bc21b5f37de88afe01ab6a9b7de7cfc488426` — the commit that carries all work — and
  records: what was built (the incident included), all 52 external findings and their
  dispositions across the four gates, the one rejection ([T9]) verbatim beside its reason,
  the [T8] false half beside the code fact, the [B1] disclosure (what sat in the logs, the
  values' remote-history persistence from 2e2a215 onward, why no rotation, redaction at
  tip), both audit seats' verdicts in both rounds with the clean boxes recorded, the
  no-third-panel residual, and what the green does and does not claim (§5 as amended by X2).
- CI confirmed first-hand this sitting: required check `verify` SUCCESS on exactly
  `c01bc21b5f37de88afe01ab6a9b7de7cfc488426`, run 93420268343, 2026-08-10T10:05:36Z →
  10:06:18Z. Pull request 51: OPEN, MERGEABLE, merge state CLEAN against main — the
  deliberately-behind position (ruling X3) causes no conflict.
- This file and the ruling ride in one commit after the pinned head. That commit carries no
  code — the ruling, this close, and the watcher-file drift (E9). The merge executes only
  after `verify` is green on this final tip too; the sitting waits for that run, then hands
  execution to a mechanical: publish the ruling as a pull-request comment (with a postscript
  naming the final tip and its run id), then `gh pr merge 51 --squash`, no branch deletion.
  The orchestrator never runs the merge command; a mechanical refusal is a STOP reported
  upward with the exact denial text.

## When the squash lands

The item is DONE — the pull-request link flips the board. Nothing else remains: no open
founder question, no maintained reviewer disagreement, no uncommitted evidence. The five
follow-ups for the coordinator are listed in the merge ruling in words, never ids.

## HARD LINE, unchanged and permanent

The personal stack (project id poancmeitlmxejofwzuu, ports 54320–54329, inspector 8083) is
untouchable — no start, stop, reset, connection, or write by any role. Docker reads only.
This sitting touched nothing: no supabase command, no docker command, no stack of any kind.

## Anomalies

- The conductor's watcher (`artifacts/watch-tip.sh`, tracked) rewrites its own base pointer
  after every push. The drift that arrived from the previous close is committed here (E9).
  The drift this close's own push causes cannot be committed by this sitting (each push
  causes the next rewrite); at post-merge close the sitting restores the file to its
  committed content so the tree ends clean without an unmerged commit, and says so in its
  report. The follow-up that moves this state to an untracked path ends the churn.
- The personal stack's kong container reports "unhealthy" and the vector container
  restart-loops on all three stacks — pre-existing, observed 2026-08-10, not this item's
  defect, not touched.

## Prior-gate records (complete, committed)

Gate 1: all 15 findings ruled in plan §7 (committed at 6429e7e). Gate 2: both seats' full
evidence committed at 1c91bba; rulings in plan §9. Audit round one: both seats' evidence and
rulings §10 at 2e2a215; fixes at 15ada2a; ratifications AX1–AX8 at db4a451. Audit round two:
both seats' evidence (stderr logs redacted) and rulings §11 at 5018517; fixes [B2]–[B5] at
5277366; ratifications BX1–BX4 at c01bc21. Merge ruling: this commit.
