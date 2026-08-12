# PHASE-STATE — AI4DEV-62 (per-org roles and membership isolation), batch with AI4DEV-63 (single seat, single developer)

**Phase: FIX AND GOAL COMPLETE — the next event is the AUDIT, a panel of two readers.** Written by
the resumed FIX AND GOAL sitting, orchestrator on fable @ xhigh, 2026-08-12. Chain, derived from
the branch: `AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-53 (org membership and seats, container)` > `AI4DEV-62 (per-org roles and isolation)`.
The partner `AI4DEV-63 (single seat, single developer)` rides this branch.

## What happened this sitting

This sitting RESUMED the fix-and-goal phase after its predecessor was killed by a session limit.
The predecessor had already pushed the rulings (`374bc34`) and the three measured verification
conditions (`65a9d4f`), and left four files uncommitted. This sitting read every uncommitted hunk
against the rulings and ADOPTED all four files as they stood, then ran one executor invocation.

1. **The adopted leftovers** — `1bf6ac0`: R2a/R2b/R2c in `_fixture.ts`, R3 at both live catch
   sites, R4 in migration A, R6 and R7 (pinned to the MEASURED 401 shape) in `_integration.ts`.
2. **R5's UPDATE half and R8** — `90c3ed9`: the seventh operator method
   `repointMembershipAsOperator` across `_contract.ts`, `_fixture.ts`, `_live.ts` and
   `backedSutMethods.accounts`; AT-001.37's fourth arm at both tiers; the pending header's count
   corrected to eighteen.
3. **v3's after-half** — `bcb91cf`: the tab-only `p_name` now refuses with SQLSTATE `22023`,
   measured on slot 2 after a reset replay; recorded in `artifacts/gate2-verify-answers.md` and
   `artifacts/gate2-verify-transcript-after.txt`. The migration comment's before-and-after claim
   is now true.
4. **The goal** — `ca1a8e4` and `f5de217`: plan step 9's FOUR runs, all exit 0, ZERO fix
   iterations. req-001 loop 18 green / 19 red; req-001 integration 13 green / 24 red; req-016
   loop 11 green / 1 red; req-016 integration 0 green / 12 red. Both integration runs carry the
   identical slot evidence line:
   `at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 4 expected, 4 applied`.
   Record: `artifacts/goal-runs.md`.
5. **Executor deviations, ruled by this sitting — all four ADOPTED:** (i) the method shape
   (`repointMembershipAsOperator(organizationId, accountId)`, no role argument, new
   `RepointMembershipOutcome`) — inside the latitude R5 granted; (ii) the AT-001.37 header's arm
   count corrected three → four — the defect class R8 fixed; (iii) `src/routeTree.gen.ts`
   committed as build-regenerated (a type-only `declare module` block, no route, no invite or
   add-member naming) so the evidence describes the tree that produced it — it ENTERS the
   declared path-set and carries checklist claim F1; (iv) an environment recovery (Docker down at
   start; slot 2 restarted twice through the pool's own guarded seam; a stale kong upstream
   address measured from kong's log) counted as repair, not as a goal iteration — no product,
   test or declaration file changed for it. Slot 1 and the personal stack were never touched.
6. **The audit briefs** — `audit-luna-prompt.txt` and `audit-flash-prompt.txt`, identical by
   design, each assembled as the reviewers file directs: `## Your contract` + the audit section
   (Pins block stripped) + this item's additions. The additions carry the CLAIM CHECKLIST —
   thirteen adopted-ruling claims (C1–C13), the fifteen-file declared path-set, six code facts
   (F1–F6), and the two rejected rulings listed so their absence is not read as a gap. Neither
   brief names the other reader.
7. This state file.

## What completes the next phase

**The audit (conductor):** per the reviewers file's audit pins, TWO readers — luna via codex and
flash via opencode — each launched by its own reviewer-runner in the background, each handed its
own brief file, subject the tree at head `f5de217` (base `ea4f345`). Raw output and distillate
into `loop/items/AI4DEV-62/artifacts/` (for the opencode reader also the tool-call summary and
identity extract, per reviewer-runner.md).

- **Both readers CLEAN:** no audit sitting exists — the MERGE sitting (orchestrator-opus)
  absorbs the audit wait and records both clean verdicts among its dispositions. CI must be green
  on the exact head the merge ruling pins.
- **Findings from either seat:** spawn the AUDIT sitting (fable) to rule on BOTH readers'
  findings.

**The merge ruling decides the `Closes AI4DEV-63` line** — it is still ABSENT from the
pull-request body, and it is added only when that ruling declares it, as one line of exactly that
shape, alone on its line.

## Facts the next sitting needs

- Heads: judgment `374bc34` (gate-2 rulings + all four readers' committed evidence), probes
  `65a9d4f`, fixes `1bf6ac0` and `90c3ed9`, after-half `bcb91cf`, goal `ca1a8e4`, close
  `f5de217` (this file rides in the close commit ON TOP of `f5de217`; the conductor verifies the
  reported head against the remote).
- Base on main: `ea4f345`. Reserved database slot: **2** — do not reserve another.
- Pull request: #55, open, non-closing references only, closes-line absent.
- Gate-2 evidence is committed at `374bc34`: raw, distillate and stderr/stdout for both terra
  runs; raw, distillate, tool-call summary and identity extract for both flash runs. The flash
  slice-1 run's no-git-cage anomaly is ruled in `gate2-rulings.md` (A1 — stands as evidence with
  its caveat; the runner-environment defect was reported to the conductor).
- Executor budget: this sitting used ONE invocation of its three. A merge-sitting fix round is
  its own budget per the contract.
- Known residuals for the merge ruling, all recorded in the rulings files: the fixture's
  malformed-id transport divergence (R2 residual); the `platform_admin` reading pinned by text,
  not by an arm (R5 residual); the naming-oracle limit of AT-001.17's source arm (gate-1
  finding 3); AT-001.16's green claims operation-surface isolation, read-surface breadth stays
  with the tenant-isolation leaf (gate-1 finding 1).
- The merge ruling must state BOTH tiers' exact-match results for every declaration manifest —
  loop AND integration, requirement and exit code, with the integration runs' slot evidence
  line — from `artifacts/goal-runs.md` and CI's own run.

## Open questions

None for the founder. Nothing contradicts ratified text and there is no scope growth.
