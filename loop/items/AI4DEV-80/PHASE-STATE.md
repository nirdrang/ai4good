# PHASE-STATE — AI4DEV-80 (attribution by spawn tree)

**Phase: DONE.** The item is merged and closed. Written by the merge sitting, orchestrator
on fable (claude-fable-5 @ xhigh), 2026-08-11. Chain, derived from the branch: AI4DEV-4
(the work skill, bring-up root) > AI4DEV-80 (attribution by spawn tree), label
`attr:bringup`.

## Terminal record

- Final head of the branch: `d83e8a9` (carries the merge ruling, the pull-request body
  file, the forward merge `93ee7f1`, and the previous phase state).
- Required check GREEN on that exact head: run 31447099690, job "verify" pass, completed
  2026-08-11 ~00:45 UTC. The thirteen prior red runs are classified in
  `merge-ruling.md` section 4: one cause outside this branch (the twin-guard script
  absent from a head tree that predates it), cured by the forward merge; the flake
  re-run budget was never spent.
- Pull request #52: MERGED at 2026-08-11T00:46:17Z. Squash commit on main:
  `712782a4fc391b23722c5cbc9ae43cb0243dd410` — verified an ancestor of `origin/main`.
- Board: the item flipped Done at 2026-08-11T00:46:19Z by the integration, two seconds
  after the merge. No hand edit.
- The merge ruling is published on the pull request (comment 5247745467, 00:46:12Z) and
  committed here as `merge-ruling.md`. The pull-request body was updated from
  `pr-body.md` as handed.

## Anomaly at the merge: two mechanicals raced, the merge ran once

The orchestrator handed the merge steps to its mechanical per the workflow. In parallel,
the conductor — whose CI monitor fired on the green — spawned a second mechanical from
the instruction list the previous PHASE-STATE carried. The conductor's mechanical
executed first: body edit, ruling comment 00:46:12Z, merge 00:46:17Z. The orchestrator's
mechanical then found the pull request already merged, reported exactly that, and never
retried. The merge command ran effectively once, from a mechanical both times it was
attempted — the boundary held; no orchestrator and no other role ran it. Residue: the
ruling comment posted twice (byte-identical): id 5247745467 at 00:46:12Z (kept, it
accompanied the merge) and id 5247747047 at 00:46:28Z (the duplicate). **Both mechanicals
attempted to delete the duplicate, independently, and the permission classifier refused
both DELETEs** ("Permission for this action was denied by the Claude Code auto mode
classifier. Reason: Blocked by classifier." — full text in each mechanical's transcript,
denial kind `automode-blocked`). Each stopped without retry or workaround. The two
instructions were issued before either instructing role knew of the other's refusal; once
the refusal was known, the orchestrator stopped all deletion work. **The duplicate
comment REMAINS on the merged pull request, by the boundary's ruling.** Surfaced to the
founder (delete in the UI / rule a permission / leave it); it blocks nothing. Lessons for
the workflow, filed in words: (a) a PHASE-STATE that lists executable merge steps must
name the ONE role that hands them to a mechanical, or two faithful actors will both do
it; (b) both mechanicals' reports were misdelivered because they addressed "orchestrator"
by type — a type name never resolves; every spawn prompt must hand the report-to address
as a bare agent id.

## Open founder question — carried in the merge ruling, unresolved

The board item expected the unattributed share to "drop sharply". Measured: 70.6% to
67.5%, because the denominator grows too (479 to 924 transcript files, 26352 to 49336
responses). Attributed responses nearly double (10816 to 21345, +97.4%); the spawn-tree
source attributes 4445 responses across 14 items; the previous item's scoped view grows
from 249 responses in 2 roles to 1935 in 7. Question: are the attribution numbers the
accepted headline, in place of a sharp percentage drop? Shapes the reading of the
outcome only; the item is closed.

## Follow-ups — FILED IN WORDS, not built (for the coordinator's fold)

1. The flash/opencode reviewer-spend join (scoped out by the item).
2. One sentence for the conductor contract and the workflow: a derived gate SKIP is a
   floor an orchestrator ruling recorded in PHASE-STATE may tighten to RUN, never the
   reverse (ruling G1-1).
3. Pre-existing: a session transcript whose tool result quotes a stamp can corrupt that
   session's stamp state in the report (gate 2; re-observed by an audit seat).
4. Pre-existing (audit re-run, reader one, out of scope): the branch regex at
   `attribution-report.ps1:136` does not guard against a preceding backslash; the fix
   delta cannot reach it.
5. Process, from this sitting's close: the merge-race lesson above.

## Corrections to the previous phase state

- The previous PHASE-STATE said this merge sitting "received its birth certificate ...
  normally". Wrong: the spawn brief carried the conductor's address but no "your own
  address is" line. Nothing was lost — the mechanical reported by completion text — but
  the record now says what actually happened.

## Standing pointers

Dispositions: `merge-ruling.md`, `audit-rulings.md`, `gate1-rulings.md`,
`gate2-rulings.md`, plan sections 7-10. Evidence: `after-delta.md`, the four selftest
captures, `artifacts/` (committed). Heads: base `ac8a235`, audited `2be9782`,
fix/re-run `8af0e18`, forward merge `93ee7f1`, final `d83e8a9`, squash on main
`712782a`.
