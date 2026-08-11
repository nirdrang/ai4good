# PHASE-STATE — AI4DEV-65 (who signed fields)

## Where the item stands

- Phase completed: FIX AND GOAL. Gate 2 ruled (`loop/items/AI4DEV-65/gate2-rulings.md`: terra's
  finding 1 accept-fixed-differently, terra's finding 2 verify-first with branch B held,
  flash's clean seat recorded, flash's self-dismissed concern ratified). Rulings were pushed
  before any code change.
- Code head (the audit's pinned commit): `6ee87419b88aa210b1d08003536469666b65fec0`. Every
  branch commit after it is record-only (files under `loop/items/`, outside the source-only
  code territory by construction). Branch base for diffs:
  `ea4f3453ed59081a3e24c035e6d321d1f2ebaa45`.
- Verify-first measurement, on the record: U+FEFF is NOT in the slot-1 database's POSIX
  `[[:space:]]` class (`feff_is_posix_blank` = false) and DOES trim to empty in the suite's
  runtime (bun 1.3.14). Evidence verbatim in
  `loop/items/AI4DEV-65/artifacts/verify-first-feff.txt`.
- The ruled fix is comment-only: the migration's boundary paragraphs ("WHERE THIS FILE'S
  AUTHORITY ENDS", "THE TWO BLANK FLOORS ARE NOT THE SAME WIDTH"). Zero SQL statements changed.
- Goal reached in ONE executor iteration. Full verification table exit 0: `at:check` req-001
  (37 ids) and req-016 (12 ids) in bijection; typecheck clean; `at:verify` loop and integration
  both requirements `--expect` exact-match. Integration ran serially on slot 1 with the
  runner's slot evidence lines (project ai4good-slot-1, api 55321, db 55322; reset OK;
  3 migrations expected, 3 applied). AT-001.19, .20, .39 green at both tiers; every other id
  unchanged in both manifests.
- Gate 2 evidence is fully committed: both raws, both distillates, terra's stderr log, flash's
  tool-call summary and identity extract, and the runner pid files.
- Branch: `nirdrang/ai4dev-65-who-signed-name-title-and-authority-on-every-acknowledgment`.
  Database slot 1 remains reserved under this item.

## What completes the next phase (the audit)

- TWO readers per the audit pins in `.claude/skills/work/reviewers.md` (a panel, blind to each
  other): reader one codex `gpt-5.6-luna` effort max, prompt
  `loop/items/AI4DEV-65/audit-prompt-luna.md`; reader two opencode flash variant max, agent
  `reviewer-flash`, prompt `loop/items/AI4DEV-65/audit-prompt-flash.md`. The two prompt files
  are byte-identical (SHA256 `C83F12AA74E56161D1EF96195A667DC81EB2B701AF774A523ED82B6169631C6C`);
  the model pin lives with the conductor, never in the prompt.
- Subject: the CLAIM CHECKLIST in the brief (8 ruling lines R1–R8, the 13-path territory, 10
  fact lines F1–F10), against the source-only diff `ea4f345...6ee8741`. Read-only; no suite
  execution — CI holds execution evidence.
- The phase is complete when BOTH distillates have landed in `loop/items/AI4DEV-65/artifacts/`
  and both runners have reported. Clean means BOTH seats clean; findings from EITHER seat spawn
  the AUDIT sitting (fable), which rules on both seats' output. On a clean panel the MERGE
  sitting (orchestrator-opus, by design) absorbs the audit wait and records both verdicts among
  its dispositions. If audit fixes change code, the whole panel re-runs once at the new head
  and the re-run sitting runs on opus.

## What the merge ruling must carry (accumulating list)

- AT-001.19's integration green narrowed to the email/Google path (plan decision F).
- AT-001.20's green claiming copy content and runtime enforcement of the authority statement,
  never display — with sol's gate 1 claim on the display clause quoted verbatim (dismissed
  unearned-green tag, terminal; text in `gate1-rulings.md` finding 2).
- Terra's gate 2 finding 1 claim quoted verbatim beside its accept-fixed-differently ruling
  (ordered in `gate2-rulings.md`): the database floors presence and nonblank, the content pin
  lives in the validation layer, service-role residual accepted.
- Both tiers' exact-match results for BOTH declaration manifests — tier, requirement, exit code
  each time, and the integration runner's slot evidence line (slot, reset, migration count).

## Open questions

- For the founder: none.

## Notes for the next sitting

- Any local `bun run build` rewrites `src/routeTree.gen.ts` (pre-existing generator drift) —
  never commit that file under this item. It is untouched at the audit head.
- The audit brief instructs by-name grading of every checklist line; a false claim the
  checklist omits is still a finding (floor, not ceiling).
