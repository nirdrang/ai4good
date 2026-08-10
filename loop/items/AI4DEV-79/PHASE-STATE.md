# PHASE-STATE — AI4DEV-79 (parallel local DB slot pool)

**Phase: AUDIT ROUND TWO RULED, FIXES APPLIED → MERGE.**
Round-two audit sitting (orchestrator on fable, claude-fable-5 @ xhigh) closed 2026-08-10.
Chain, derived from the branch: AI4DEV-79 (parallel DB slot pool) → AI4DEV-3 (AT harness),
root label `attr:bringup`.

## What happened this sitting

- The once-per-item panel re-run returned findings from BOTH seats; all nine ruled in plan
  §11 — luna [B1]–[B6], flash [BF1]–[BF3]. Nine ACCEPTED, zero rejected, so no
  maintained-disagreement text is owed to the pull request from this gate. One convergence,
  recorded: [B1] and [BF1] are the same defect class (reviewer working files carrying the
  tracked `.env` content, crossing into the committed record).
- **The critical finding [B1] was verified by direct measurement and is REAL in fact,
  reclassified in severity.** The round-one committed reviewer stderr log carried 21
  JWT-shaped matches; exactly two distinct values across the record: the cloud project's
  ANON (publishable) key — which this repository already publishes, deliberately, in the
  TRACKED `.env` at the repo root — and a cryptographically invalid selftest fixture whose
  signature decodes to the word "signature". A wider secret battery found nothing else. No
  live secret leaked, no rotation is warranted, and the full evidence is in §11 [B1]. Both
  stderr logs are redacted in place with named markers; **history from 2e2a215 through
  db4a451 still carries the values on the remote — a forward edit cannot un-push them —
  and §11 says so plainly.** The merge ruling MUST carry this disclosure paragraph.
- Record repairs applied at 5018517: the oracle header's commit count corrected to the
  measured eight ([B6]), a postscript on the integration transcript stating what the graph
  proves about its DIRTY tree state ([BF2]), the pull-request body's stale "planned" status
  rewritten ([BF3]), and §11 itself is the correction of §10 [AF1]'s irreproducible
  zero-scan claim ([B1]'s record-false half).
- The fix executor (opus, ONE invocation, one iteration) applied [B2]–[B5] at 5277366; four
  judgment calls ratified as BX1–BX4 in §11. All four suites green (typecheck; at:selftest
  286 tests; at:check req-001; at:verify req-001 --tier loop --expect). Loop tier
  behaviorally untouched (fresh capture matches `oracle-loop-branch.txt` after the recorded
  non-ASCII fold).
- **NO THIRD PANEL RUN.** The once-per-item re-run is spent. §11's disposition summary
  states the reasoning in the open: [B2]–[B5] tighten guards already ruled fail-closed on
  edges no committed transcript exercised, change nothing on any proven path, and are each
  pinned by a selftest with CI re-proving the suites on the merge head; the record repairs
  carry no code. The residual — these four small fixes go unread by an external panel — is
  the accepted cost of the re-run cap, stated for the merge sitting and the founder.
- A mechanical synced the live pull request body (PR 51) from the corrected `pr-body.md`.
- **The personal stack was never touched.** No supabase command, no docker command, no
  start, stop, reset or connection by any role this sitting — slot stacks included. Every
  measurement ran on temp directories via `AT_DB_POOL_ROOT` / `AT_LOCK_DIR` and cleaned up
  after itself.
- Anomaly, minor: this sitting received no birth certificate (no "your own address is"
  line), so children were run synchronously and reported by completion text only. Nothing
  was lost; the conductor should restore the line for the merge sitting.

## For the MERGE sitting

- **CI first.** Confirm the required check `verify` green on the EXACT final head this file
  rides in. If red, classify before reacting per the contract (flake / broken by this change
  / pre-existing / CI unavailable). A fix needing another audit re-run is scope growth —
  escalate, never a third round.
- **The branch is deliberately behind main** (ruling X3). Confirm mergeability; GitHub
  conflicts are the merge sitting's problem to classify, never a reason to silently rebase.
- The merge ruling records the FULL audit history among the dispositions: round one's six
  findings and dispositions (§10) with the AX1–AX8 ratifications, and round two's nine
  findings and dispositions (§11) with BX1–BX4 — including both seats' verdicts in both
  rounds; a clean box is evidence and is recorded, never silently absorbed.
- The merge ruling must carry VERBATIM: the rejected [T9] claim beside its written reason
  (plan §9), and the false half of [T8] ("including non-numeric values") beside the code
  fact that refutes it. No audit-round rejection exists to carry — nothing was rejected in
  either round.
- The merge ruling must carry the [B1] disclosure: what sat in the committed logs, that the
  values remain in remote history from 2e2a215 onward, why no rotation is warranted (the
  anon key is public by design and deliberately tracked in `.env`; the other token is an
  invalid fixture), and that both logs are redacted at tip.
- What the green does and does not claim: plan §5 as amended (the X2 row). CI proves claim
  logic and guards on temp directories; the committed transcripts prove the real stacks,
  the wall, and the runner path, on the dev machine, once. NO integration-tier green for
  req-001 exists or is claimed.
- **The orchestrator NEVER runs the merge command** — the mechanical executes it; a
  mechanical refusal is a STOP reported upward with the denial text.
- For the coordinator to file as separate work (words only in the PR, never ids): the
  drill-tier stack decision (§6); the pre-existing direct personal-stack paths flash's
  gate-2 note 3 names (`package.json` db:start/db:stop/db:reset, and runner.selftest.ts
  writing a probe into the repo's `supabase/migrations`); the conductor's watcher-file
  state possibly moving to an untracked path (E9); NEW from §11 [B1]: (a) the
  reviewer-runner scrubbing key-shaped tokens from reviewer session logs at capture time,
  (b) one deliberate look at whether the tracked `.env` should carry even publishable keys.

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
evidence committed at 1c91bba; rulings in plan §9. Audit round one: both seats' evidence and
rulings §10 at 2e2a215; fixes at 15ada2a; ratifications AX1–AX8 at db4a451. Audit round two:
both seats' evidence (stderr logs redacted) and rulings §11 at 5018517; fixes [B2]–[B5] at
5277366; ratifications BX1–BX4 ride in this close's commit.
