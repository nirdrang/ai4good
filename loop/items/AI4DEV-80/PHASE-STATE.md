# PHASE-STATE — AI4DEV-80 (attribution by spawn tree)

**Phase: FIX-AND-GOAL COMPLETE — gate 2 fully ruled, selftest green at the head, after
evidence committed. Next is the AUDIT: a two-reader panel, prompts assembled and
committed.** Written by the fix-and-goal sitting (second half), orchestrator on fable
(claude-fable-5 @ xhigh), 2026-08-11. Chain, derived from the branch: AI4DEV-4 (the work
skill, bring-up root) > AI4DEV-80 (attribution by spawn tree), label `attr:bringup`.
Branch base: `ac8a235`.

## What happened this sitting

- Reader two (flash via opencode) landed on the relaunch: six findings naming the SAME
  six defects as reader one. Its seat was NOT blind (it read the committed rulings and
  reader one's distillate), so its convergence was given no independence weight; each
  finding was judged against the code alone and subsumed by the standing rulings. Full
  dispositions: `gate2-rulings.md`. Its evidence (raw output, distillate, tool-call
  summary, identity extract) is committed in `artifacts/`.
- The executor ran the goal pass. Both verify-first probes measured BEFORE any change:
  **G2-3 PROVEN** (580 cross-session `toolu_` duplicates, one resumed-session pair, five
  resolving a different item — the pre-ruled fix landed: `$spawnCtx` keyed by session
  plus tool-use id); **G2-6 DISPROVEN** (in-process `de-DE` probe, dot-decimal
  confirmed, live-culture control — no code change). Probes committed in `artifacts/`.
- The ruled fixes landed: G2-1 (`-not $isAgent` on the stamp fallback), G2-2 (ambiguous
  agents get no vendor join key), G2-5 (A1 asserts `OutputTok` per row), the W1 nested
  fixture agent (draft ruling D-1), M1's stamp line, M1's kimi directory, A10 extended.
- RED matched the predicted pattern assert for assert (PASS = A4, A8, A14; eleven FAIL).
  Green on the FIRST goal iteration; `selftest-green.txt` also carries three mutation
  checks proving the new guards bind. S8 committed: `report-after.txt`,
  `report-after-79.txt`, `after-delta.md` with both percentages and BOTH denominators.
- Two executor additions ratified, one proposed judgment ruled (the report's floor note
  does not change; the store-growth caveat lives in the delta note) — all recorded in
  `gate2-rulings.md`.
- `plan.md` now carries section 9 (gate 2 rulings) and the fix-pass amendments to D3,
  D4, S3, A1, A10.

## What completes the next phase — the AUDIT

1. The conductor spawns TWO reviewer-runners per the AUDIT pins in
   `.claude/skills/work/reviewers.md`, pinned at the head this sitting pushes:
   - reader one: prompt `loop/items/AI4DEV-80/audit-luna-prompt.txt`, handed UNCHANGED;
   - reader two: prompt `loop/items/AI4DEV-80/audit-flash-prompt.txt`, handed UNCHANGED.
   The two prompt files are byte-identical by design; the pins (model, lane, cage) come
   from reviewers.md, and neither prompt names the other seat.
2. Completing files: one distillate per reader in `loop/items/AI4DEV-80/artifacts/`,
   plus each runner's LANDED report. An empty output is an EMPTY GATE, reported as
   empty, never as clean.
3. If EITHER seat has findings: spawn the AUDIT sitting — it rules on BOTH seats'
   verdicts (a clean seat beside a seat with findings is evidence, recorded among the
   dispositions, never a veto).
4. If BOTH seats are clean: no audit sitting exists. The MERGE sitting absorbs the
   audit's wait, records both clean verdicts among its dispositions, and proceeds per
   its contract (CI classification, merge ruling pinned to the exact head, mechanical
   executes the merge).
5. Blindness note: by construction the audit readers read the record — it is their list
   of claims. That is not contamination at this gate. The panel requirement that stands
   is that neither seat learns the other exists; the prompts and the launch mechanics
   keep it.

## Standing facts for the audit and merge sittings

1. This is a FIRST audit, not a re-run — no fix delta exists. The audit prompts say so.
2. The audit's change-set instrument ADDS `git diff ac8a235...<head> -- loop/work`
   (plan D10) — the pinned source-only command enumerates nothing for this item. The
   scope box is plan section 1's path-set. The claim checklist names G1-1 through
   G1-10, D-1, and G2-1 through G2-6 by id, including the verify-first outcomes of
   G2-3 (proven, fix in code) and G2-6 (disproven, nothing changed).
3. Pull request #52 is open and gates every push. No pull-request text names any item
   id but AI4DEV-80; other items appear in words only.
4. The required CI check takes the prose fast lane (guards run, TypeScript suite
   skipped) — expected for a `loop/`-only diff. This item's verification is the
   committed selftest evidence: `selftest-red.txt` (exit 1, predicted pattern),
   `selftest-green.txt` (exit 0, plus mutation checks). The merge ruling must state
   plainly what the CI green does and does not claim for this item.
5. Goal-head measurements (S8, `after-delta.md`): unattributed 70.6% → 67.6%;
   transcript files 479 → 919; responses 26352 → 49071; attributed responses
   10816 → 21085 (+95.0%); the `tree` source attributes 4188 responses across 14
   items; ambiguous agents 2, metaless 0.
6. Kimi vendor-spend behaviour changed at G2-2: an ambiguous agent's spend now stays
   unjoined; the floor note says so.

## Open founder question — non-blocking, raise at or before the merge ruling

The board item expects the unattributed share to "drop sharply" as the headline
evidence. Measured at the goal head: 70.6% → 67.6%, because 440 newly-visible
transcripts also enlarge the denominator, and because most branchless responses sit in
coordinator sessions on `main`, where the tree has nothing to hand down. The mechanism
works: attributed responses nearly double (10816 → 21085), and the previous item's
scoped view grows from 249 responses in 2 roles to 1935 in 7. Question: does the
founder accept the attribution numbers as the headline evidence, in place of a sharp
percentage drop? This shapes the merge ruling only.

## At close — carried follow-ups, FILED IN WORDS, not built

1. The flash/opencode reviewer-spend join (scoped out by the item).
2. One sentence in the conductor contract and the workflow: a derived gate SKIP is a
   floor an orchestrator ruling recorded in PHASE-STATE may tighten to RUN, never the
   reverse (ruling G1-1).
3. NEW this sitting (flash's outside-findings observation, ruled pre-existing): a
   session transcript whose tool result quotes a stamp can corrupt that session's stamp
   state in the attribution report — predates this branch, untouched by this item.

## Expectations that are not anomalies

- `gate2-terra.stdout.log` stays untracked (ignored by the `*.log` rule; it duplicates
  the committed raw output).
- The fast-lane CI behaviour in standing fact 4.
- The audit readers reading the record (blindness note above).

## Anomalies

- Reader two's gate-2 contamination — ruled this sitting, no independence weight given;
  described in `gate2-rulings.md`.
- The executor's first G2-6 probe attempt used a child process, which takes the OS
  culture; it was discarded from the evidence and the in-process probe stands. Recorded,
  correct, no action.
- Carried from the draft sitting: one executor shell read denied by the permission
  classifier, ruled compliance; two commit messages needed `git commit -F` (PowerShell
  5.1 here-string mangling). No action on either.
