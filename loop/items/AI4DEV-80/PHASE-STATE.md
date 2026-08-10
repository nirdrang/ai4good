# PHASE-STATE — AI4DEV-80 (attribution by spawn tree)

**Phase: gate 2 HALF-RULED — reader one's six findings ruled, reader two ruled a
RELAUNCH. Next is that relaunch, then a successor fix-and-goal sitting.** Written by the
fix-and-goal sitting (first half), orchestrator on fable (claude-fable-5 @ xhigh),
2026-08-11. Chain, derived from the branch: AI4DEV-4 (the work skill, bring-up root) >
AI4DEV-80 (attribution by spawn tree), label `attr:bringup`. Branch base: `ac8a235`.
Draft code head: `9c8a6bd`; this sitting adds RECORD commits only — `loop/work` is
byte-identical to `9c8a6bd`.

## What happened this sitting

- Reader one (terra via codex) landed six findings. All six are ruled in
  `loop/items/AI4DEV-80/gate2-rulings.md` with claims quoted: G2-1 accept, G2-2 accept,
  G2-3 verify first, G2-4 accept (already ruled — draft ruling D-1, convergence noted),
  G2-5 accept, G2-6 verify first.
- Reader two (flash via opencode) died before reading anything: zero tokens,
  `step_finish` reason "unknown", empty stderr, no count line. The runner cleaned its
  own working files, so no artifact exists for that run. Recorded as an EMPTY GATE,
  never as clean. Ruled: RELAUNCH (reasons in gate2-rulings.md).
- Reader one's evidence is committed: distillate, raw output, stderr log (force-added
  past the `*.log` ignore rule — the codex spend join reads committed `*stderr*` files),
  pid file.
- `plan.md` is deliberately NOT amended this sitting. The relaunched reader must review
  the same plan reader one reviewed, and a gate-2 rulings section in the plan would
  reveal the panel to its own second seat. The fix specs live complete in
  gate2-rulings.md; the successor sitting folds them into the plan after it rules
  reader two's seat.

## What completes the next phase

1. The conductor spawns ONE reviewer-runner: reader two, per the DRAFT CODE pins in
   `.claude/skills/work/reviewers.md`, prompt
   `loop/items/AI4DEV-80/gate2-flash-prompt.txt` handed UNCHANGED, pinned at the head
   this sitting pushes. The reviewed code in `loop/work` is unchanged from `9c8a6bd`,
   so the seat still reviews the draft.
2. Completing files: a reader-two distillate in `loop/items/AI4DEV-80/artifacts/` plus
   the runner's LANDED report. If the relaunch dies the same empty way again, that
   second death is a FACT for the successor sitting to rule on — report it as empty,
   never as clean, and spawn the sitting anyway; deciding whether the panel's purpose
   is still served on one seat belongs to an orchestrator, not to the conductor.
3. Then spawn the successor FIX-AND-GOAL sitting with both gate-2 distillates (reader
   one's is already in artifacts/). Its work, in order (plan section 5's closing block):
   rule reader two's findings; run the verify-first probes (G2-3, G2-6) before changing
   anything; apply the ruled fixes — G2-1, G2-2, G2-5, plus the fixture additions W1
   (D-1), M1's stamp line (G2-1), M1's kimi directory (G2-2); RED capture from the S3
   commit; goal loop to selftest green (three iterations maximum); S8 after-evidence.
   Then the audit brief.
4. Blindness note for the successor: the relaunched seat runs against a head whose
   `loop/items/AI4DEV-80/` carries reader one's evidence and the rulings. Weigh any
   reader-two finding that mirrors reader one's distillate wording rather than the
   code, and say so if seen.

## Standing facts the successor sitting needs (carried forward)

1. Goal-pass order of operations: the closing block of plan section 5. The S3 commit
   that pins the pre-mechanism report for the RED capture is `0c1bbf7`.
2. The fixture gains W1 (the nested `workflows/wf_1` agent, plan S3, ruling D-1) — it
   joins A1 and A3. Gate 2 adds: M1's stamp line (G2-1), M1's kimi directory and the
   A10 extension (G2-2), A1's per-row token sums (G2-5).
3. Predicted RED pattern: plan section 6 table — PASS = A4, A8, A14; every other assert
   FAILS. The gate-2 fixture additions flip no prediction (checked this sitting: W1, the
   M1 stamp line and the M1 kimi directory all sit in files the S3-era report never
   scans). A deviation is reported, never silently adjusted around.
4. Audit brief (the audit is a panel of two, per the AUDIT pins in reviewers.md): ADD
   `git diff <base>...<head> -- loop/work` to the enumeration instrument; scope box =
   the path-set in plan section 1. The claim checklist names rulings G1-1 through
   G1-10, D-1, and G2-1 through G2-6 by id — including the verify-first outcomes of
   G2-3 and G2-6 with their recorded evidence — plus the path-set and the code facts
   stated in plan sections 3 and 8.
5. S8's delta note states both percentages WITH both denominators. At the draft head:
   unattributed 70.6% → 67.7%; transcript files scanned 480 → 912; responses
   26371 → 48658. S8 re-measures at the goal head.
6. Also measured on the real store: 2 agents ambiguous (two items in their own
   records), 0 agents without a meta file.
7. No pull-request text names any item id but AI4DEV-80; other items appear in words
   only.

## Open founder question — non-blocking, raise at or before the merge ruling

The board item expects the unattributed share to "drop sharply" as the headline
evidence. Measured at the draft head: the share moves 70.6% → 67.7%, because the 877
newly-visible transcripts also enlarge the denominator, and because 19892 of 37610
branchless responses sit in coordinator sessions on `main`, where the tree has nothing
to hand down. The mechanism itself works: 3764 responses across 14 items are newly
attributed, and the previous item's scoped view grows from 249 to 1935 responses with
its full role table. Question: does the founder accept the attribution numbers as the
headline evidence, in place of a sharp percentage drop? This shapes the merge ruling
only.

## At close — carry forward

- Two follow-ups are FILED IN WORDS, not built: the flash/opencode reviewer-spend join
  (scoped out by the item), and a one-sentence clarification in the conductor contract
  and the workflow that a derived gate SKIP is a floor an orchestrator ruling recorded
  in PHASE-STATE may tighten to RUN, never the reverse (ruling G1-1).

## Expectations that are not anomalies

- The required CI check takes the prose fast lane (guards run, TypeScript suite
  skipped) — expected for a `loop/`-only diff; this item's verification is the
  PowerShell selftest, run at the successor sitting.
- Pull request #52 is open and gates every push.
- `gate2-terra.stdout.log` stays untracked, like reader one's gate-1 twin — it
  duplicates the committed raw output byte-for-near-byte.

## Anomalies

- Reader two's empty gate, described above — ruled, relaunch pending.
- Carried from the draft sitting: one executor shell read denied by the permission
  classifier, ruled compliance (the switch was TOWARD the sanctioned instrument); two
  commit messages needed `git commit -F` (PowerShell 5.1 here-string mangling). No
  action on either.
