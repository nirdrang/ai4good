# PHASE-STATE — AI4DEV-65 (who signed fields)

## Where the item stands

- Phase completed: **AUDIT, entirely.** The audit phase is CLOSED. The once-per-item re-run is
  spent and no further audit runs on this item.
- The re-run panel ran at fix head `9728a82f9361e5138f4f65ac51c637d3bf148551`, change-set the fix
  delta `6ee87419...9728a82f` restricted to the code territory. Reader one (luna, codex) landed
  **AUDIT: CLEAN**, every box PASS. Reader two (flash, opencode) landed **AUDIT: 1 FINDINGS**,
  plus two boxes graded COULD-NOT-VERIFY which it explicitly did not count as findings.
- The AUDIT RE-RUN sitting (orchestrator-opus at max, by design) ruled both seats in
  `loop/items/AI4DEV-65/audit-rerun-rulings.md`:
  - **Flash [1] S3 — ACCEPTED**, comment-only fix, applied in this sitting. The comment at
    `supabase/functions/complete-signup/index.ts:137-139` claimed the four github rpc keys are
    omitted "because the columns behind them are nullable". All four `volunteer_profiles` columns
    are `not null`. It is the SAME defect the first audit ruled (luna finding 1), in a SECOND
    file: R9's fix corrected the migration's copy of the sentence and did not sweep for the other
    copy. Before the fix both texts were false and agreed; after it they contradicted each other,
    which is how the re-run's delta reached the claim.
  - **Luna — CLEAN**, recorded as evidence. It did not clear flash's finding; the disputed
    sentence sits outside every line of the rebuilt checklist, and the checklist is a floor.
  - Both COULD-NOT-VERIFY boxes **settled PASS first-hand** by the sitting, with git.
- The accepted fix is comment-only in one file
  (`supabase/functions/complete-signup/index.ts`). Zero statements, zero declarations, zero test
  assertions change. `bun run typecheck` and `bun run at:check` pass after it.

## Why no second re-run

The fix corrects one comment paragraph, in a file both readers read at this head, to state what
two other texts in the same tree already state correctly — the corrected migration paragraph
(`20260811120000...sql:82-94`) and the pre-existing block directly above it
(`complete-signup/index.ts:106-117`, not this item's text and already correct). Nothing
behavioural moves. A fix that would need a second audit re-run is scope growth to escalate; this
one is nowhere near that line.

## What completes the next phase — the MERGE sitting

- The next sitting is **MERGE**, run by **orchestrator-opus, by design** (founder 2026-08-11).
  There is no separate audit wait left to absorb: the audit is closed here, so the merge sitting's
  only wait is CI.
- **CI is to be armed on the branch head this sitting pushes** — the head that carries the ruling,
  the fix and this file. The required check must be green on that exact SHA, and the merge ruling
  pins that same SHA. If the head moves, the evidence describes a different commit.
- A mechanical publishes the merge ruling as handed and executes the merge. The orchestrator never
  runs the merge command, and the merge tail has exactly ONE executor — the mechanical the merge
  sitting spawns. If that mechanical reports a permission refusal, that is a STOP: report it
  upward with the exact denial text and end the sitting.

## What the merge ruling must carry (FINAL list)

1. AT-001.19's integration green narrowed to the email/Google path (plan decision F).
2. AT-001.20's green claiming copy content and runtime enforcement of the authority statement,
   never display — with sol's gate 1 claim on the display clause quoted verbatim (dismissed
   unearned-green tag, terminal; text in `gate1-rulings.md` finding 2).
3. Terra's gate 2 finding 1 claim quoted verbatim beside its accept-fixed-differently ruling
   (`gate2-rulings.md`): the database floors presence and nonblank, the content pin lives in the
   validation layer, the service-role residual is accepted.
4. **Both tiers' exact-match results for BOTH declaration manifests** — tier, requirement and exit
   code each time, and the integration runner's own slot evidence line naming the slot, the reset
   and the migration count. A ruling that states only the loop result states a green against
   stand-ins. Database slot 1 is reserved under this item.
5. The FIRST audit panel: both luna findings quoted verbatim beside their accept rulings and the
   comment-only fixes (`audit-rulings.md`); flash's clean verdict; its two COULD-NOT-VERIFY items
   settled PASS first-hand.
6. **The RE-RUN panel, both seats** (`audit-rerun-rulings.md`): luna CLEAN; flash's one finding
   quoted verbatim beside its ACCEPT ruling and the comment-only fix; both COULD-NOT-VERIFY boxes
   settled PASS first-hand with the commands and their output.
7. **The scope box as measured at the final head**, not merely at the audited head: the full-range
   source-only diff returns exactly the declared thirteen paths, `src/routeTree.gen.ts` absent,
   and the file list at the current head is identical to the list at the fix head — so every
   commit after the fix head is record-only.

## Open questions

- For the founder: none.

## Notes for the next sitting

- Any local `bun run build` rewrites `src/routeTree.gen.ts` (pre-existing generator drift) — never
  commit that file under this item. It is untouched at the head this sitting closes on.
- Branch base for full-range diffs: `ea4f3453ed59081a3e24c035e6d321d1f2ebaa45`. Code territory:
  `src supabase tests .github package.json bun.lockb tsconfig.json vitest.config.ts`.
- The pull request already exists and must name no item id but this branch's own.
