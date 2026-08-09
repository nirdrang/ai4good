# PHASE-STATE — AI4DEV-79 (parallel local DB slot pool)

**Phase: DRAFT — INTERRUPTED BY AN INCIDENT. The founder must decide before work resumes.**
Draft sitting (sitting 2, `orchestrator` on fable, claude-fable-5 @ xhigh) closed 2026-08-10.
Chain, derived from the branch: AI4DEV-79 (parallel DB slot pool) → AI4DEV-3 (AT harness),
root label `attr:bringup`.

## THE INCIDENT — read plan.md §8 for the full record

The isolation spike destroyed the founder's personal local database. `supabase db reset`
aimed at slot-2 acted on the personal project identity because the tracked `.env` carries
`SUPABASE_PROJECT_ID="poancmeitlmxejofwzuu"` and the Supabase CLI treats that as a project-id
override — `--workdir` is NOT the isolation wall the plan assumed (F8 settled against the
plan). The personal db container is dead in state `Created`; its data volume was recreated
empty at 2026-08-09T22:04:38Z; the old volume is deleted. Schema is reproducible from
migrations; hand-made local rows are gone unless the founder holds a backup outside Docker.
The executor stopped at the breach, committed both transcripts, and escalated. The
orchestrator verified every fact independently (container states, volume timestamps, `.env`
content, remote head).

Nothing has touched the personal stack since the breach. The two slot stacks are healthy
(55321 and 56321 blocks) and stay up.

## FOUNDER DECISIONS NEEDED — the conductor raises these, relayed verbatim

1. **Recovery of the personal stack.** The broken container must be removed before the stack
   can start again (`docker rm supabase_db_poancmeitlmxejofwzuu`, then stop/start from the
   main checkout). This rebuilds an EMPTY database from migrations. Whether to do that, when,
   and whether any outside backup exists — only the founder can say. No agent will run these
   commands.
2. **Whether and how the spike re-runs.** The amended wall (plan §8 ruling E1: positive
   identity on every slot CLI call through one shared helper, plus a pre-destructive identity
   read) must be proven by a re-run spike. Options: (a) re-run as ruled, against the live
   personal stack, after recovery; (b) a dry pass first with the personal stack STOPPED —
   weaker proof (nothing could touch a stopped stack) but zero exposure, then the live run.
   The ruled text wants the live proof; the sequencing is the founder's call after this loss.
3. **Whether the item proceeds at all** given what the spike revealed about CLI identity
   behavior.

## For the next sitting (after the founder rules)

- Head to build on: this close's push (see the conductor's record; plan §8 and this file ride
  in it). Draft state: S1 done, S2 done (transcript committed), S3 FAILED (wall disproven,
  transcript committed), S4/S5/S6 not started.
- Implement ruling E1 (the shared invocation helper) in db-pool.ts FIRST; the re-run spike
  uses only that helper. E2: S3 then S5, in that order, only after the founder's go.
- Rulings E3 and E4 (plan §8) amend D7 and D2 — fold them into the S1 module when next
  touched.
- Gate 2 is NOT armed. No gate-2 prompts exist. The draft-code gate reads a COMPLETE draft;
  writing prompts for a half-draft whose central mechanism was disproven would gate the wrong
  thing. The sitting that completes S4–S6 (post-decision) writes both gate-2 prompts: terra
  via codex @ max, and flash via opencode (agent `reviewer-flash`, `--variant max`), assembled
  per reviewers.md, neither hinting the other exists.
- Executor budget used this sitting: one invocation of three. The incident consumed the
  sitting; no budget was exhausted and no cap fired — work stopped on judgment, not on limits.

## Gate-1 record (complete, committed at 6429e7e)

All 15 sol findings ruled in plan §7: 11 accepted, 4 accepted-fixed-differently, 0 rejected.
Raw output, stderr log (codex session id 019fe865-7f42-76d0-a39c-fbb5221a7f75 for spend
attribution), stdout log, pid file and distillate committed under
`loop/items/AI4DEV-79/artifacts/`.

## Anomalies

- The pull request: opened after the plan sitting per its hand-off; CI runs on the pushed
  heads. The incident does not change the branch's CI posture (no harness test touches a real
  stack).
- F4's "reset tolerates an absent seed" verification is tainted (plan §8) and returns to
  unverified.
