# AI4DEV-5 — rulings 03 (Gate 2 fold and endgame rulings)

## Ruling 5 — the merge-decision install row: corrected with provenance, on the record

The executor, reading `merge-decision.md` as evidence, caught the first row of the local
verification table claiming a populated-tree no-change check ("533 installs across 637
packages, no changes") as if it were the from-scratch frozen-lockfile gate. It was the item
agent's re-run after the executor's own install had populated the shared worktree. RULING:
corrected in place WITH provenance per row (executor empty-tree install, item agent
populated-tree check, CI's ubuntu empty-tree install), and the correction is recorded in
the file rather than silently swapped — a number not measured on the commit it pins is the
exact failure this way of work exists to prevent, and the catch itself is the paper trail
working.

## Ruling 6 — kimi was reported dead; the evidence said alive; no relaunch

The coordinator twice reported the kimi Gate 2 reviewer dead (71-byte critique file, no
process by that name). Direct measurement said otherwise: its task transcript grew 46,375 →
49,830 bytes across a 25-second window with the last-write timestamp advancing, and the
transcript showed real review work (twelve executed simulations of the ownership guard —
including the rename-crossing FAIL case and the 1,500-renames-no-ceiling case — then YAML
validation). Kimi streams progress to stderr and writes its final answer to stdout at the
end, so a small stdout file mid-run is expected, not diagnostic. RULING: do not kill, do
not relaunch a live working reviewer. Contingency stands: if the finished critique contains
no findings section, one relaunch (short -p, stderr captured); failing that, Gate 2
proceeds on terra alone and says so.

## Ruling 7 — branch protection attempted, denied by the permission layer, not faked

`gh api -X PUT repos/nirdrang/ai4good/branches/main/protection` with
`required_status_checks: {strict: false, contexts: ["verify"]}` (all other observed
protection flags preserved as-is) was blocked by this environment's permission classifier.
Per decision 11: recorded plainly here, in the merge decision, and in the item report with
the exact command for the founder. No workaround attempted — the denial's intent is that an
admin-surface change needs a human, which is also what decision 11 assumes.

## Gate 2 — codex gpt-5.6-terra @ max (diff): PENDING FOLD

(Findings and rulings land here when the session returns.)

## Gate 2 — kimi kimi-code/k3 @ high (diff): PENDING FOLD

(Findings and rulings land here when the run returns.)
