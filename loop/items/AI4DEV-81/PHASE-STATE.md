# PHASE-STATE — AI4DEV-81 (per-item integration verification), batch with AI4DEV-45 (CI timeout counts queue time)

## Where the item stands

Phase: **FIX AND GOAL complete.** The FIX sitting (fable) ruled all 17 gate-2 findings
(`rulings-gate2.md`) — ten adopted (three of them convergences found by both slice-2 seats),
one adopted in part, four rejected with written reasons, one verify-first settled by the
sitting itself. The slice-1 panel disposition is recorded there: the second seat terminated
abnormally twice vendor-side, and the gate stands on the one landed seat, with the reasoning
written and the audit brief carrying the caution. The executor (opus, one invocation of the
three permitted) applied every adopted ruling and reached the goal: **all four exact-match
runs green** — req-001 and req-016, loop and integration tiers, `--expect` exit 0, no
declaration amended — with the slot evidence line `db slot 1 (ai4good-slot-1, api 55321) —
reset OK — migrations: 2 expected, 2 applied`. Typecheck clean, build clean, harness selftests
327 → 344, twin-check SYNCED. The sitting then ruled on the executor's six proposed judgments
(`rulings-fix.md`). Code head: 41bcadc; goal evidence: f11eaa1 (`goal-evidence.md`,
`verify-first.md` Part C). This file rides in the head that completes the phase; the conductor
verifies the reported head against the remote.

## What completes the next phase

The AUDIT — a panel of two readers, each launched by its own reviewer-runner with its prompt
file sent VERBATIM, both pinning the head this file rides in:

| seat | pins (launch metadata — never sent) | prompt file |
|---|---|---|
| one | `gpt-5.6-luna`, effort `max`, codex, `--sandbox read-only` | `loop/items/AI4DEV-81/audit-luna.txt` |
| two | `opencode-go/deepseek-v4-flash`, `--variant max`, opencode, agent `reviewer-flash`, clean session | `loop/items/AI4DEV-81/audit-flash.txt` |

The two prompt files are byte-identical by design. The phase is complete when both runners
report LANDED with distillates in `loop/items/AI4DEV-81/artifacts/`. Clean means BOTH seats
clean — then the merge sitting (opus, by design) absorbs the audit wait and records both
verdicts among its dispositions. Findings from either seat spawn the AUDIT sitting (fable),
which rules on BOTH seats' findings. The once-per-item re-run, if fixes change code, is of the
whole panel at the new head, never one seat.

## Facts the next sitting needs

- The claim checklist (A1–A28, B1–B3, C1–C9 in the audit brief) is the auditors' floor; the
  rulings files are their index. The source-only diff at this head equals `466880d...41bcadc`
  — every commit after 41bcadc touches only the record directory.
- The flash seat's read of the harness machinery is a FIRST read (its earlier reading of those
  files never landed); the brief says so in its closing caution. Weigh its harness findings as
  first-look evidence, not as a second pass.
- Branch `nirdrang/ai4dev-81-per-item-integration-verification-every-item-proves-its-ids`,
  PR #53 open, slot 1 reserved to this item. The required CI check is loop-only and unchanged
  by this item; the one sanctioned closes-line stands in the pull request body — do not touch
  `pr-body.md` or the PR.
- Rejected rulings the audit must not un-reject by accident: S1-5 (bare bodies run at every
  tier — documented design), S2-6/F4 (the closes-line and in-file id citations are correct).
  Checklist lines A19 and A26 state both.
- The executor-invocation cap is per sitting; a future audit sitting's budget is its own.

## Open questions

None for the founder. Nothing contradicts ratified text; no scope growth. The one process
observation this item generated (the gate-2 slice-2 prompt's hygiene box overstated the
enforced foreign-id rule) is recorded in `rulings-gate2.md` at F4 for the coordinator to fold.
