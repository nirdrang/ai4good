# PHASE-STATE — AI4DEV-81 (per-item integration verification), batch with AI4DEV-45 (CI timeout counts queue time)

## Where the item stands

Phase: **DRAFT complete.** The DRAFT sitting (fable) ruled all 11 gate-1 findings — every one
accepted, one fixed differently (`rulings-gate1.md`) — amended `plan.md` (this amended plan is
what gets built; decisions D1-D12 and the settled per-id table), and pushed the rulings BEFORE
any code changed. The executor (opus, one invocation of the three permitted — two remain) then
wrote the draft for both slices: plan steps 1-8 implemented, typecheck and build clean, 327
harness selftests green, loop-tier exact-match unchanged for both requirements, **the
integration verify suite deliberately not run**. The sitting then ruled on the five judgments
the executor raised (`rulings-draft.md`) and assembled the four gate-2 prompts. This file rides
in the head that completes the phase; the conductor verifies the reported head against the
remote.

## What completes the next phase

Gate 2 — critique of the draft code, per slice (plan D11), two readers per slice, four runs in
all, each launched by its own reviewer-runner with the prompt sent VERBATIM:

| slice | reader pins (assembly metadata — never sent) | prompt file |
|---|---|---|
| 1 — harness machinery | `gpt-5.6-terra`, effort `max`, codex, `--sandbox read-only` | `loop/items/AI4DEV-81/gate2-slice1-terra.txt` |
| 1 — harness machinery | `opencode-go/deepseek-v4-flash`, `--variant max`, opencode, agent `reviewer-flash`, clean session | `loop/items/AI4DEV-81/gate2-slice1-flash.txt` |
| 2 — suite, declarations, process text | `gpt-5.6-terra`, effort `max`, codex, `--sandbox read-only` | `loop/items/AI4DEV-81/gate2-slice2-terra.txt` |
| 2 — suite, declarations, process text | `opencode-go/deepseek-v4-flash`, `--variant max`, opencode, agent `reviewer-flash`, clean session | `loop/items/AI4DEV-81/gate2-slice2-flash.txt` |

The four runs are independent and may run in parallel; all four pin the same head (the one this
file rides in). The phase is complete when all four runners report LANDED with distillates in
`loop/items/AI4DEV-81/artifacts/`. No reader learns another reader or another gate exists; the
per-slice prompt pairs are byte-identical by design, since the pins are launch metadata.

## Facts the FIX sitting needs

- Branch: `nirdrang/ai4dev-81-per-item-integration-verification-every-item-proves-its-ids`, cut
  from main at 466880d. PR #53 open. Reserved database slot: slot 1.
- Draft head before this file: 26ac293 (executor's six commits, one per step group; its full
  report is reproduced in the conductor's record of this sitting's completion).
- Read `rulings-gate1.md` AND `rulings-draft.md` before ruling on gate-2 findings — several
  likely findings are already ruled there (the sessionless-handle design R-D3, the supabase-js
  load seam R-D4, AT-001.05 red R-D1) and a gate-2 claim against them is ruled on its merits,
  not re-litigated from scratch.
- Known accepted gap (executor report, step 4): the loader's two live paths (adapter present /
  absent fallback) have no selftest — both need an attested slot; the goal phase's integration
  run exercises them. A gate-2 finding about this is expected; the ruling context is that the
  gap was declared, not hidden.
- Verify-first answers (evidence in `verify-first.md`): (a) slot serves edge functions from its
  own container, no serve process per run; (b) Mailpit at the slot's status-reported URL;
  (c) `jwt_expiry` 120 pinned and verified live; (d) supabase-js auto-refresh rotation observed
  at ~30 s into a 120 s token.
- Slot 1 state: the executor deleted its start marker after probing, so the next `prepare()`
  restarts it into the generated config carrying `jwt_expiry = 120`. Recorded in
  `rulings-draft.md`.
- The partner item's remedy: already on main (ci.yml line 49, `timeout-minutes: 30`); this
  branch's only ci.yml change is the comment neutralization (D10, gate-1 ruling 11). The pull
  request body already carries the one sanctioned closes-line — do not touch `pr-body.md` or
  the PR.
- Executor invocation budget for the FIX sitting: fresh (the three-invocation cap is per
  sitting; the DRAFT sitting used one).

## Open questions

None for the founder. Nothing contradicts ratified text; no scope growth. The plan's D1 was
loosened one notch by gate-1 ruling 11 (ci.yml comment-only edit) — recorded, behavior
unchanged, inside this item's batch scope.
