# PHASE-STATE — AI4DEV-79 (parallel local DB slot pool)

**Phase: FIX AND GOAL COMPLETE → AUDIT (panel of two).**
Fix sitting (orchestrator on fable, claude-fable-5 @ xhigh) closed 2026-08-10.
Chain, derived from the branch: AI4DEV-79 (parallel DB slot pool) → AI4DEV-3 (AT harness),
root label `attr:bringup`.

## What happened this sitting

- Gate 2 ruled in full, plan §9: terra 13 findings (8 accepted, 4 accepted-fixed-differently,
  1 rejected — [T9], reason written); flash 9 findings (all accepted) plus four notes ruled.
  Three convergences named ([T3]+[F3], [T7]+[F1], [T12]+[F2] second half; terra [T4] converges
  with flash note 2). Rulings and both readers' full evidence pushed at 1c91bba BEFORE any
  code change.
- The fix executor (opus, one invocation, two iterations) implemented every accepted ruling
  and reached the goal state. Five judgment calls ruled as X1–X5 in plan §9, including:
  X1 ratifies the executor's measured completion of [T10] (commit bb14267 — the ruled re-read
  alone cannot see through the winner's unshared file handle); X2 corrects S8's done-criterion
  (req-001 declares the loop tier only, so `--expect` cannot run at integration — the changed
  path ran end to end without it); X3 ratifies the oracle baseline as the merge base c11e352.
- Goal suite results: typecheck 0; build 0; at:selftest 0 (279 tests, includes the grown
  db-pool selftests); at:check req-001 0; at:verify req-001 --tier loop --expect 0 with the
  gate-1 [10] oracle diff EMPTY (`oracle-loop.diff`, baseline reasoned in its header);
  S8 ran on slot 1 with `AT_DB_SLOT=1`, evidence line
  `at:verify — db slot 1 (ai4good-slot-1, api 55321) — reset OK — migrations: 2 expected, 2
  applied`, both [T2] identity instruments visible, transcript `integration-run.txt`
  committed and scanned clean.
- **The personal stack was never touched.** Docker reads only; every CLI act through the
  shared seam with a slot target. Two independent instruments: the S8 transcript's own
  before/after docker snapshot (IDENTICAL), and the container id + volume CreatedAt matching
  the prior sitting's recorded values.
- Executor budget: ONE invocation of three used this sitting.

## THE AUDIT — what the conductor launches

Two readers, audit gate, pins per reviewers.md "The AUDIT — critique of the CLAIM". Both
prompts are assembled per reviewers.md and scanned free of pin-shaped tokens. NEITHER prompt
names or hints the other reader; no spawn prompt may either. Pin both at this close's pushed
head — the sitting's completion report names it; verify with ls-remote before launching.

Reader one — the codex lane, pins per reviewers.md, audit reader one:
- prompt file: `loop/items/AI4DEV-79/audit-luna-prompt.txt`
- output: `loop/items/AI4DEV-79/artifacts/audit-luna-output.md`
- stderr log: `loop/items/AI4DEV-79/artifacts/audit-luna-output.stderr.log`
- distillate: `loop/items/AI4DEV-79/artifacts/audit-luna-distillate.md`
- (the runner may add stdout and pid files per its recipe, as prior gates did)

Reader two — the opencode lane, pins per reviewers.md, audit reader two; the agent file
`.opencode/agent/reviewer-flash.md` exists in this worktree:
- prompt file: `loop/items/AI4DEV-79/audit-flash-prompt.txt`
- output: `loop/items/AI4DEV-79/artifacts/audit-flash-output.md`
- stderr log: `loop/items/AI4DEV-79/artifacts/audit-flash-output.stderr.log`
- distillate: `loop/items/AI4DEV-79/artifacts/audit-flash-distillate.md`
- tool-call summary: `loop/items/AI4DEV-79/artifacts/audit-flash-toolcalls.md`
- identity extract: `loop/items/AI4DEV-79/artifacts/audit-flash-identity.md`

Clean means BOTH readers clean. Findings from either seat spawn the audit sitting; the
once-per-item re-run, if code changes, is of the whole panel at the new head, never one seat.

## For the audit sitting (only if the panel found something)

Rule BOTH readers' findings — a clean seat beside a seat with findings is evidence, recorded
among the dispositions, never a veto. Rule by class: record-false is never mergeable; real but
out of scope is filed and named; auditor-wrong is rejected with a written reason and the claim
verbatim in the pull request (eliding any foreign item id, saying so). If fixes change code:
executor applies, push, END the sitting — the conductor re-runs the whole panel at the new
head.

## For the merge sitting

- On a clean audit, both readers' verdicts are the merge sitting's to record among the
  dispositions.
- **The branch is deliberately behind main** (ten commits at the time of the goal run; ruling
  X3). Confirm mergeability; if GitHub reports conflicts, that is this sitting's problem to
  classify, not a reason to silently rebase.
- The merge ruling must carry VERBATIM: the rejected [T9] claim beside its written reason
  (plan §9), and the false half of [T8] ("including non-numeric values") beside the code fact
  that refutes it.
- What the green does and does not claim: plan §5 as amended (the X2 row). CI proves claim
  logic and guards on temp directories; the committed transcripts prove the real stacks, the
  wall, and the runner path, on the dev machine, once. NO integration-tier green for req-001
  exists or is claimed — X2 records why.
- For the coordinator to file as separate work (words only in the PR, never ids): the
  drill-tier stack decision (§6); the pre-existing direct personal-stack paths flash's note 3
  names (`package.json` db:start/db:stop/db:reset, and runner.selftest.ts writing a probe into
  the repo's `supabase/migrations`); the conductor's watcher-file state possibly moving to an
  untracked path (E9, still churning).

## HARD LINE, unchanged and permanent

The personal stack (project id poancmeitlmxejofwzuu, ports 54320–54329, inspector 8083) is
untouchable — no start, stop, reset, connection, or write by any role. Docker reads only.

## Anomalies

- The conductor's remote-tip watcher (`artifacts/watch-tip.sh`, tracked) rewrites its own base
  pointer after every push; sittings commit the change as it arrives (ruling E9).
- The personal stack's kong container reports "unhealthy" and the vector container
  restart-loops on ALL three stacks — pre-existing, observed 2026-08-10, not this item's
  defect, not touched.

## Prior-gate records (complete, committed)

Gate 1: all 15 findings ruled in plan §7 (committed at 6429e7e). Gate 2: both seats' raw
outputs, distillates, terra stderr log, flash tool-call summary and identity extract committed
at 1c91bba; rulings in plan §9.
