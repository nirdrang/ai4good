# PHASE-STATE — AI4DEV-65 (who signed fields)

## Where the item stands

- Phase completed: AUDIT (first audit). The panel ran at code head
  `6ee87419b88aa210b1d08003536469666b65fec0`: reader one 2 findings, reader two CLEAN with two
  COULD-NOT-VERIFY items. All rulings are in `loop/items/AI4DEV-65/audit-rulings.md` (committed
  at `ad55590`): both findings ACCEPTED as comment-only fixes; the clean seat's verdict
  recorded; both COULD-NOT-VERIFY items settled PASS first-hand by the sitting.
- Recovery note: the first audit sitting died at the account session limit after committing its
  rulings, with the two fix edits staged but uncommitted. A recovery sitting (fable) verified
  the staged edits first-hand — every fact claim in the new comment text checked against the
  previous migration — and adopted them unchanged.
- **Fix delta**: previous audited head `6ee87419b88aa210b1d08003536469666b65fec0` → fix head
  `9728a82f9361e5138f4f65ac51c637d3bf148551`. Two files, comments only
  (`supabase/migrations/20260811120000_acknowledgment_signer_identity.sql`,
  `tests/at/suites/req-001/_contract.ts`). Zero SQL statements and zero TypeScript declarations
  change; typecheck clean on both configs after the fixes.
- Branch: `nirdrang/ai4dev-65-who-signed-name-title-and-authority-on-every-acknowledgment`.
  Database slot 1 remains reserved under this item. Branch base for full-range diffs:
  `ea4f3453ed59081a3e24c035e6d321d1f2ebaa45`.

## What completes the next phase — the audit RE-RUN (required; ruled by this sitting)

- **The re-run IS required.** The fixes are comment-only, but both files sit inside the declared
  13-path code territory, so the source-only diff instrument moves at the fix head. This item's
  migration comments are ruled load-bearing boundary text, the first audit's only findings were
  false comment claims, and the fixes state NEW facts about the code (the rebuilt checklist's
  F12 and F13). New claims of the class the audit just caught wrong get the same independent
  read.
- BOTH readers run again at the fix head — never one seat: reader one codex `gpt-5.6-luna`
  effort max, prompt `loop/items/AI4DEV-65/audit-rerun-prompt-luna.md`; reader two opencode
  flash variant max, agent `reviewer-flash`, prompt
  `loop/items/AI4DEV-65/audit-rerun-prompt-flash.md`. The two prompt files are byte-identical
  (SHA256 `4BDDB6C377A22DA674AAEFCB3E84045457B8C8ECD49FFED808D22E1A4DA98EEB`); the model pin
  lives with the conductor, never in the prompt.
- Subject: the REBUILT claim checklist in the brief — R9, R10 (the two adopted audit rulings),
  F11–F13 (the new fact claims), the declared-scope box in full against the full range, and
  carry-forward of R1–R8 / F1–F10 where the delta cannot reach them. Change-set instrument: the
  fix delta `6ee8741...9728a82` restricted to the code territory. Read-only; no suite execution.
- This is the ONE re-run this item gets.
- The phase is complete when BOTH distillates have landed in `loop/items/AI4DEV-65/artifacts/`
  and both runners have reported. Findings from EITHER seat spawn the AUDIT RE-RUN sitting
  (orchestrator-opus @ max, by design), which works from the rebuilt checklist and the fix
  delta. A clean panel means the MERGE sitting (orchestrator-opus, by design) absorbs the wait
  and records both re-run verdicts among its dispositions.

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
- The first audit panel's result: both findings quoted verbatim beside their accept rulings and
  the comment-only fixes (`audit-rulings.md`); the clean seat's verdict; the two
  COULD-NOT-VERIFY items settled PASS first-hand.
- The re-run panel's verdicts, both seats, at the fix head.

## Open questions

- For the founder: none.

## Notes for the next sitting

- Any local `bun run build` rewrites `src/routeTree.gen.ts` (pre-existing generator drift) —
  never commit that file under this item. It is untouched at the fix head.
- The re-run brief instructs by-name grading of the rebuilt lines and named carry-forward of
  the rest; a false claim the checklist omits is still a finding (floor, not ceiling).
- CI is to be armed on the final head after a clean re-run; the required check gates the merge.
