# PHASE-STATE — AI4DEV-81 (per-item integration verification), batch with AI4DEV-45 (CI timeout counts queue time)

## Where the item stands

Phase: **AUDIT ruled, fixes applied.** The AUDIT sitting (fable) ruled on both seats' findings
at head `1fef027` (`rulings-audit.md`): AU-1 accepted — the live `linkGithubIdentity` now
routes its handle through `tokensOf`, refusing a session-less registration handle by name
(draft ruling R-D3, checklist A12, which one seat caught and the other missed); AU-2 accepted
as one convergent defect — the checklist's C5 sentence stated the membership column's physical
name backwards, the code was always correct, and the record was corrected to match the code
(`rulings-fix.md` RF-2 item 4, with a visible correction marker). The executor (opus, one
invocation, one iteration) landed both as commit `7525e32`: code delta exactly
`tests/at/suites/req-001/_live.ts`, 6 insertions, 0 deletions. At that head: typecheck clean,
build clean, selftests 344 unchanged, all four exact-match runs green with exit 0 on slot 1,
twin-check SYNCED, **no declaration amended, no declared kind shifted**. Full table in
`rulings-audit.md`, post-fix section.

## What completes the next phase

The **AUDIT RE-RUN** — the once-per-item re-run of the WHOLE panel at the new head, never one
seat. Each reader is launched by its own reviewer-runner with its prompt file sent VERBATIM:

| seat | pins (launch metadata — never sent) | prompt file |
|---|---|---|
| one | `gpt-5.6-luna`, effort `max`, codex, `--sandbox read-only` | `loop/items/AI4DEV-81/audit-rerun-luna.txt` |
| two | `opencode-go/deepseek-v4-flash`, `--variant max`, opencode, agent `reviewer-flash`, clean session | `loop/items/AI4DEV-81/audit-rerun-flash.txt` |

The two prompt files are byte-identical by design (hash-verified at assembly). They carry the
REBUILT claim checklist — A1–A29, B1–B3, C1–C10, with A12 rewritten and C5 corrected, A29 and
C10 new — and the re-run scoping: the change-set is the fix delta
`git diff 1fef027...HEAD` restricted to the code territory (exactly one file), lines the delta
cannot reach carried forward with stated independence, the scope boxes B1–B3 re-checked in
full against `466880d...HEAD`. The phase is complete when both runners report LANDED with
distillates in `loop/items/AI4DEV-81/artifacts/`.

Clean means BOTH seats clean — then the merge sitting (opus, by design) absorbs the wait and
records both verdicts among its dispositions. Findings spawn the AUDIT RE-RUN sitting, which
runs on **opus @ max by design** (founder 2026-08-11) and works from the rebuilt checklist and
the fix delta, not the full plan. **The re-run has now been spent once it runs: a further fix
that would need a second re-run is scope growth and escalates — it is never an excuse to skip
the audit.**

## Facts the next sitting needs

- Heads: base `466880d`; first-audit head `1fef027` (code head `41bcadc`); fix commit
  `7525e32`; the rulings and briefs commits after it touch only the record directory. The
  source-only diff at any head from `7525e32` on equals the diff at `7525e32`.
- The rulings index is now five files: `rulings-gate1.md`, `rulings-draft.md`,
  `rulings-gate2.md`, `rulings-fix.md` (RF-2 item 4 carries AU-2's correction marker),
  `rulings-audit.md` (AU-1, AU-2, the panel disposition notes, and the post-fix verification
  table for head `7525e32`).
- Rejected rulings the re-run must not un-reject: S1-5 (bare bodies run at every tier —
  documented design, checklist A19), S2-6/F4 (the closes-line and in-file id citations are
  correct, checklist A26). AU-1's recorded residual (a revoked handle still passes `tokensOf`
  after S2-2, sim refuses a dead session at link) is a WRITTEN observation, ruled not acted
  on — not an open defect.
- Branch `nirdrang/ai4dev-81-per-item-integration-verification-every-item-proves-its-ids`,
  PR #53 open, slot 1 reserved to this item. The one sanctioned closes-line stands in the
  pull request body — do not touch `pr-body.md` or the PR.
- `goal-evidence.md`'s "last commit that changes code: 41bcadc" line is a dated statement,
  true for the runs it describes; `rulings-audit.md`'s post-fix section is the verification
  record for `7525e32`.
- The executor-invocation cap is per sitting; this sitting spent one of its three.

## Open questions

None for the founder. Nothing contradicts ratified text; no scope growth. One seat's A12 PASS
was graded incorrect (recorded in `rulings-audit.md`, panel disposition notes) — evidence for
the panel's value, not a process defect to raise.
