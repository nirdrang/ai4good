# PHASE-STATE — AI4DEV-80 (attribution by spawn tree)

**Phase: AUDIT RULED — the first audit landed findings, both are ruled, the AUD-1 fix is
in code and green. Next is the once-per-item AUDIT RE-RUN: both seats, at the head this
sitting pushes.** Written by the audit sitting, orchestrator on fable (claude-fable-5 @
xhigh), 2026-08-11. Chain, derived from the branch: AI4DEV-4 (the work skill, bring-up
root) > AI4DEV-80 (attribution by spawn tree), label `attr:bringup`. Branch base:
`ac8a235`.

## What happened this sitting

- The first audit's panel: reader one (luna via codex) 2 findings; reader two (flash via
  opencode) clean, with two COULD-NOT-VERIFY boxes (no shell in its cage). Both readers'
  raw outputs, distillates, the opencode tool-call summary and identity extract, the
  codex stderr log and pid are committed in `artifacts/`.
- Both COULD-NOT-VERIFY boxes were settled PASS by this sitting's own measurement — the
  full-range file list and the `loop/work`-restricted diff both stay inside the declared
  scope. Recorded in `audit-rulings.md`.
- **AUD-1 (luna's finding 1): ACCEPTED, fixed in code.** The spawn-context key now pins
  on EVERY first sighting, empty when the session state resolves nothing; a later
  occurrence never overwrites. New assert A15, red before green against the audited
  head's code (`selftest-a15-red.txt`, exit 1, A15 the only FAIL; `selftest-a15-green.txt`,
  exit 0, fifteen asserts). The A15 fixture lives in an isolated second fixture root — a
  ratified executor addition; every A1-A14 oracle is byte-unchanged.
- **AUD-2 (luna's finding 2): ACCEPTED, cured in the record.** Plan D6's sentence
  "Default invocation output is unchanged." was false as written and is replaced by the
  narrow seams-only claim. No code change.
- One seat conflict (flash graded G1-6/G2-3 PASS where luna graded FAIL) resolved by the
  orchestrator's own trace: the defect was real; the traced FAIL won.
- Evidence refreshed at the fix head: `report-after.txt`, `report-after-79.txt`,
  `after-delta.md`. An A/B run (audited code vs fixed code, identical parameters,
  identical output) shows the pin moves NOTHING on today's store — the drift against the
  goal-head numbers is store growth. `after-delta.md` section 5 records it.
- Audited head: `2be9782`. Rulings commit `bef7285`; fix commits `ef85ecf`, `92d8ec0`;
  this file rides in the closing commit.

## What completes the next phase — the AUDIT RE-RUN

1. The conductor spawns TWO reviewer-runners per the AUDIT pins in
   `.claude/skills/work/reviewers.md`, pinned at the head this sitting pushes:
   - reader one: prompt `loop/items/AI4DEV-80/audit-rerun-luna-prompt.txt`, handed UNCHANGED;
   - reader two: prompt `loop/items/AI4DEV-80/audit-rerun-flash-prompt.txt`, handed UNCHANGED.
   The two files are byte-identical by design; neither names the other seat.
2. The re-run's change-set is the FIX DELTA — `git diff 2be9782...<pinned head> -- loop/work`
   — never the full range. One box re-checks in full: the declared scope, against the
   full-range file list. The prompts carry the REBUILT claim checklist (AUD-1 and AUD-2
   added; G1-2 restated for fifteen asserts).
3. Completing files: one distillate per reader in `loop/items/AI4DEV-80/artifacts/`, plus
   each runner's LANDED report. An empty output is an EMPTY GATE, reported as empty,
   never as clean.
4. If EITHER seat has findings: a fresh audit sitting rules on BOTH seats' verdicts.
   **The re-run cap is spent after this run.** A re-run finding that requires a further
   code change is a cap event: stop working, do not stop judging — record it open and
   escalate as scope growth; never a second re-run.
5. If BOTH seats are clean: the MERGE sitting proceeds and records both re-run verdicts
   among its dispositions. If flash again grades the scope box COULD-NOT-VERIFY (its cage
   has no shell), the ruling sitting settles it with the settling commands, as this
   sitting did — precedent in `audit-rulings.md`.

## Standing facts for the re-run and merge sittings

1. Full audit dispositions live in `audit-rulings.md`; plan section 10 is the summary
   table. Gate rulings: `gate1-rulings.md`, `gate2-rulings.md`, plan sections 7-9.
2. Pull request #52 is open and gates every push. No pull-request text names any item id
   but AI4DEV-80; other items appear in words only.
3. The required CI check takes the prose fast lane (guards run, TypeScript suite skipped)
   — expected for a `loop/`-only diff. This item's verification is the committed selftest
   evidence: `selftest-red.txt`, `selftest-green.txt`, `selftest-a15-red.txt`,
   `selftest-a15-green.txt`. The merge ruling must state plainly what the CI green does
   and does not claim for this item.
4. Fix-head measurements (`after-delta.md`): unattributed 70.6% → 67.5%; transcript files
   479 → 924; responses 26352 → 49336; attributed responses 10816 → 21345 (+97.4%); the
   `tree` source attributes 4445 responses across 14 items; ambiguous agents 2, metaless
   0. The previous item's scoped view stands at 1935 responses in 7 roles.
5. Kimi vendor-spend behaviour changed at G2-2: an ambiguous agent's spend stays
   unjoined; the floor note says so.
6. The merge ruling must record: both first-audit verdicts and dispositions (luna 2
   findings, both accepted; flash clean), the re-run verdicts, and the maintained
   evidence that the AUD-1 pin corrects semantics today's store does not yet exercise
   (the A/B measurement).

## Open founder question — non-blocking, raise at or before the merge ruling

The board item expects the unattributed share to "drop sharply" as the headline evidence.
Measured at the fix head: 70.6% → 67.5%, because 445 newly-visible transcripts also
enlarge the denominator, and because most branchless responses sit in coordinator
sessions on `main`, where the tree has nothing to hand down. The mechanism works:
attributed responses nearly double (10816 → 21345), and the previous item's scoped view
grows from 249 responses in 2 roles to 1935 in 7. Question: does the founder accept the
attribution numbers as the headline evidence, in place of a sharp percentage drop? This
shapes the merge ruling only.

## At close — carried follow-ups, FILED IN WORDS, not built

1. The flash/opencode reviewer-spend join (scoped out by the item).
2. One sentence in the conductor contract and the workflow: a derived gate SKIP is a
   floor an orchestrator ruling recorded in PHASE-STATE may tighten to RUN, never the
   reverse (ruling G1-1).
3. A session transcript whose tool result quotes a stamp can corrupt that session's stamp
   state in the attribution report — predates this branch, untouched by this item (ruled
   at gate 2; reader two's audit seat re-observed it and saw no evidence against that
   attribution).

## Expectations that are not anomalies

- `gate2-terra.stdout.log` and `audit-luna.stdout.log` stay untracked (the `*.log` ignore
  rule; each duplicates its committed raw output). The stderr logs ARE committed, force-added.
- The fast-lane CI behaviour in standing fact 3.
- The audit readers reading the record — it is their list of claims; the panel blindness
  that stands is that neither seat learns the other exists.
- Reader two grading shell-dependent boxes COULD-NOT-VERIFY: a cage limitation, not a
  finding; the ruling sitting settles those boxes itself.

## Anomalies

- The audit seats CONFLICTED on two boxes (G1-6, G2-3): flash PASS by reading, luna FAIL
  by tracing. Resolved for the traced FAIL; a box PASS proves the reader saw no defect,
  never that none exists. Recorded in `audit-rulings.md`.
- This orchestrator sitting received no birth certificate (no "your own address is" line
  arrived), so its executor was instructed to report by completion text only. Nothing was
  lost; noted for the conductor.
- Carried from earlier sittings: reader two's gate-2 contamination (ruled, no
  independence weight); the executor's discarded child-process G2-6 probe attempt; one
  denied executor shell read ruled compliance; `git commit -F` needed for multi-line
  messages in PowerShell 5.1. No action on any.
