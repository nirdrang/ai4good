# PHASE-STATE — AI4DEV-81 (per-item integration verification), batch with AI4DEV-45 (CI timeout counts queue time)

## Where the item stands

Phase: **PLAN complete.** The PLAN sitting (fable) wrote `plan.md`, the gate-1 prompt, and the
pull-request body, and ended. This file rides in the head that completes the phase; the sitting
reports that head, and the conductor verifies the report against the remote.

## What completes the next phase

Gate 1 — critique of the plan. One reviewer (sol via codex, per the pins in
`.claude/skills/work/reviewers.md`), launched by a reviewer-runner. The phase is complete when
the runner reports LANDED with its distillate in `loop/items/AI4DEV-81/artifacts/`. The prompt to
send is `loop/items/AI4DEV-81/gate1-prompt.txt`, verbatim.

## Facts the next sitting needs

- Branch: `nirdrang/ai4dev-81-per-item-integration-verification-every-item-proves-its-ids`,
  cut from main at 466880d. Reserved database slot: slot 1, under this item, serving the pair.
- Batch: AI4DEV-45 is the partner; its remedy is ALREADY on main (`.github/workflows/ci.yml`
  line 49, `timeout-minutes: 30`, landed in commit 2795926) — plan decision D10: zero code
  change, closed by the sanctioned closes-line in the pull request, declared in the merge ruling
  with that evidence.
- The pull request: a mechanical opens it at the end of the PLAN sitting — title
  `AI4DEV-81: items prove their acceptance ids against a real slot database`, body verbatim from
  `loop/items/AI4DEV-81/pr-body.md` (it carries the partner's closes-line; no other foreign id).
- Proportionality: this item reaches code. The code gate runs, per slice (plan D11: slice 1 =
  harness machinery, slice 2 = live adapter + bodies + declarations + process text).
- Key plan decisions the DRAFT sitting builds on: D2 (declarable above-loop refusal), D3
  (tier-selected adapter), D4 (real provenance only on positive evidence; attested real clock),
  D5 (per-tier bodies, one per id per tier), D6 (integration green floor = the three migrated
  check sets; provider-handshake ids and the Discovery id are NOT green).
- Step 1 of the plan (id ↔ check-set mapping against the acceptance file) settles the
  "green target / red expected" rows of the plan's table; the DRAFT sitting amends the plan with
  the settled table after ruling gate-1 findings.

## Open questions

None for the founder. Nothing contradicts ratified text; no scope growth identified at plan
time.
