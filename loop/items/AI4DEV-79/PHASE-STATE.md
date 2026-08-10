# PHASE-STATE — AI4DEV-79 (parallel local DB slot pool)

**Phase: AUDIT ROUND ONE RULED, FIXES APPLIED → AUDIT RE-RUN (whole panel, the once-per-item
re-run).**
Audit sitting (orchestrator on fable, claude-fable-5 @ xhigh) closed 2026-08-10.
Chain, derived from the branch: AI4DEV-79 (parallel DB slot pool) → AI4DEV-3 (AT harness),
root label `attr:bringup`.

## What happened this sitting

- Both audit seats landed with findings; all six ruled in plan §10. Luna [A1]–[A5]: [A1]
  record-false ACCEPTED (§4 S8 rewritten in place to the X2 criterion); [A2] high, ACCEPTED
  (fail-open reservation read on the AT_DB_SLOT override path — the tree changed to match the
  record's fail-closed rule); [A3] ACCEPTED (evidence line's port now from the post-prepare
  status); [A4] ACCEPTED with the measurement recorded (fail-open occupancy read in the
  release helper — measured real, then fixed fail-closed); [A5] ACCEPTED (whole-token,
  underscore-aware port parse in the personal-block guard; unparseable port values now
  refuse). Flash [AF1]: ACCEPTED as the verification it asks — the leaked events log is
  absent from disk, never entered the index, and a token-shape scan of every artifact returns
  zero; nothing derived from it is in the record. NOTHING was rejected, so no
  maintained-disagreement text is owed to the pull request from this gate.
- No convergences: the six findings are disjoint. Flash's clean boxes (PASS, plus
  could-not-verify on git-level facts — its cage has no git) are recorded in §10 as evidence.
- Rulings and ALL round-one panel evidence committed and pushed at 2e2a215 BEFORE any code
  change: both raw outputs, both distillates, luna's stderr log (force-added past the
  `*.log` ignore, as prior gates did) and pid file, flash's tool-call summary and identity
  extract. The flash lane produced no stderr log this run.
- The fix executor (opus, ONE invocation of three, one iteration) applied [A2]–[A5] at
  15ada2a; eight judgment calls ratified as AX1–AX8 in plan §10. All four suites green
  (typecheck; at:selftest 284 tests; at:check req-001; at:verify req-001 --tier loop
  --expect). The loop tier is behaviorally untouched (normalized output matches
  `oracle-loop-branch.txt`; `runner.ts` not modified).
- **The personal stack was never touched.** No supabase command, no docker command, no
  start, stop, reset or connection by any role this sitting — slot stacks included. Every
  test and measurement ran on temp directories via `AT_DB_POOL_ROOT` / `AT_LOCK_DIR`.

## THE AUDIT RE-RUN — what the conductor launches

Code changed after the panel read the tree, so the WHOLE panel re-runs at the new head —
both seats, never one. This is the ONCE-per-item re-run; it is now spent.

- **Both prompt files were amended in place this sitting and are VALID for the re-run** —
  regeneration beyond that is not needed. What changed in them: the record description now
  names plan §10 (round-one rulings [A1]–[A5], [AF1], and the AX ratifications), and the
  presence-as-ruled box now includes §10 [A2]–[A5] and the scope of the commits carrying
  them. Neither prompt names or hints the other reader; that held through the amendment.
- Pin both at this close's pushed head — the sitting's completion report names it; verify
  with ls-remote before launching.
- **Round-two artifacts use the `audit2-` prefix** so round one's committed evidence is
  never overwritten:
  - Reader one, codex lane: prompt `loop/items/AI4DEV-79/audit-luna-prompt.txt`; output
    `artifacts/audit2-luna-output.md`; stderr `artifacts/audit2-luna-output.stderr.log`;
    distillate `artifacts/audit2-luna-distillate.md`.
  - Reader two, opencode lane (agent file `.opencode/agent/reviewer-flash.md`): prompt
    `loop/items/AI4DEV-79/audit-flash-prompt.txt`; output
    `artifacts/audit2-flash-output.md`; distillate `artifacts/audit2-flash-distillate.md`;
    tool-call summary `artifacts/audit2-flash-toolcalls.md`; identity extract
    `artifacts/audit2-flash-identity.md`.
- Clean means BOTH readers clean. If the re-run panel returns findings, an audit sitting
  rules them — but a fix that would need ANOTHER panel re-run is scope growth and goes up as
  an escalation, never a third round.

## For the next sitting after the re-run

- **Re-run clean → the MERGE sitting**, which records both round-two verdicts among the
  dispositions, alongside round one's (§10).
- **Re-run finds something → an audit sitting** rules by the same classes: record-false is
  never mergeable; real but out of scope is filed and named; auditor-wrong is rejected with
  a written reason and the claim verbatim in the pull request (eliding any foreign item id,
  saying so).

## For the merge sitting

- The merge ruling records the full audit history: round one's six findings and their
  dispositions (§10), the AX ratifications, and round two's verdicts.
- **The branch is deliberately behind main** (ruling X3). Confirm mergeability; if GitHub
  reports conflicts, that is the merge sitting's problem to classify, not a reason to
  silently rebase.
- The merge ruling must carry VERBATIM: the rejected [T9] claim beside its written reason
  (plan §9), and the false half of [T8] ("including non-numeric values") beside the code
  fact that refutes it. No audit-round rejection exists to carry — nothing was rejected.
- What the green does and does not claim: plan §5 as amended (the X2 row). CI proves claim
  logic and guards on temp directories; the committed transcripts prove the real stacks, the
  wall, and the runner path, on the dev machine, once. NO integration-tier green for req-001
  exists or is claimed — X2 records why, and §4 S8 now says the same after [A1].
- For the coordinator to file as separate work (words only in the PR, never ids): the
  drill-tier stack decision (§6); the pre-existing direct personal-stack paths flash's
  gate-2 note 3 names (`package.json` db:start/db:stop/db:reset, and runner.selftest.ts
  writing a probe into the repo's `supabase/migrations`); the conductor's watcher-file state
  possibly moving to an untracked path (E9, still churning).

## HARD LINE, unchanged and permanent

The personal stack (project id poancmeitlmxejofwzuu, ports 54320–54329, inspector 8083) is
untouchable — no start, stop, reset, connection, or write by any role. Docker reads only.

## Anomalies

- The conductor's remote-tip watcher (`artifacts/watch-tip.sh`, tracked) rewrites its own
  base pointer after every push; sittings commit the change as it arrives (ruling E9).
- The personal stack's kong container reports "unhealthy" and the vector container
  restart-loops on ALL three stacks — pre-existing, observed 2026-08-10, not this item's
  defect, not touched.
- The committed loop oracle stores em dashes in a different encoding than a fresh capture;
  comparisons fold non-ASCII first (recorded in §10's executor ruling preamble).

## Prior-gate records (complete, committed)

Gate 1: all 15 findings ruled in plan §7 (committed at 6429e7e). Gate 2: both seats' full
evidence committed at 1c91bba; rulings in plan §9. Audit round one: both seats' full
evidence and rulings §10 committed at 2e2a215; the fixes at 15ada2a; the AX ratifications
ride in this close's commit.
