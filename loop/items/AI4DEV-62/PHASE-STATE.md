# PHASE-STATE — AI4DEV-62 (per-org roles and membership isolation), batch with AI4DEV-63 (single seat, single developer)

**Phase: DRAFT COMPLETE — the next event is gate 2, the draft-code review.** Written by the DRAFT
sitting, orchestrator on fable @ xhigh, 2026-08-11. Chain, derived from the branch:
`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-53 (org membership and seats, container)` > `AI4DEV-62 (per-org roles and isolation)`.
The partner `AI4DEV-63 (single seat, single developer)` rides this branch.

## What happened this sitting

1. **Gate-1 rulings** — `loop/items/AI4DEV-62/gate1-rulings.md`: four findings, four accepts
   (rulings 1 and 3 fixed differently in part or whole; ruling 4 carries a verify-first
   condition), zero rejects, no removals. Pushed with the amended plan BEFORE any code change
   (judgment head `610ead7`, which also carries the gate-1 raw, distillate and stderr log with
   the codex session id).
2. **The amended plan** — `plan.md` now carries: a sixth operator method that creates an UNSEATED
   organisation; AT-001.16's not-a-member arm against a third organisation C; AT-001.17's source
   arm over `src/routes/` and the generated route tree; migration B's explicit revoke-all plus
   verify-first (f).
3. **The draft** — executor (opus), one invocation, one iteration. Three commits, all pushed:
   - `c2a7b6b` — slice 1 (AI4DEV-62): decision module, migration A, `update-organization`,
     role/isolation SUT surface, bodies .16/.36/.37, flips, `D3_L1` deletion.
   - `d0444da` — slice 2 (the partner): migration B, seats/projects SUT surface,
     `_source-scan.ts`, bodies .17/.32, flips, `D3_L2` deletion, the pending ledger.
   - `054f7ec` — the verify-first instrument and its recorded answers.
   Typecheck green, build green, `at:check req-001` green (37 ids in bijection). **The verify
   suite was NOT run — deliberate; the draft exists to be critiqued.** Verify-first answers
   (a)–(f) all recorded with command evidence in `artifacts/verify-first-answers.md`; none
   contradicts the plan. One measurement changed the live adapter: the driver reports SQLSTATE
   on `errno`, not `code` (answer (d)).
   Six small executor deviations, all adopted by the sitting as latitude: `parseOrgRole` helper;
   `_source-scan.ts` as a shared non-test file; `timeoutMs` on all five ids; a same-volunteer
   control assertion in .32; `routeTree.gen.ts` restored after builds; the instrument file with
   its own header.
4. **The two gate-2 prompts** — `gate2-slice1-prompt.txt` (subject `git diff 610ead7...c2a7b6b`)
   and `gate2-slice2-prompt.txt` (subject `git diff c2a7b6b...d0444da`), each assembled as the
   reviewers file directs: contract + draft-code section (Pins block stripped) + additive
   item sections. Neither names any other reader or gate.
5. This state file.

## What completes the next phase

**Gate 2 (conductor):** per the reviewers file's draft-code pins, TWO readers per slice — four
runs total, each a reviewer-runner in the background, raw output and distillate into
`loop/items/AI4DEV-62/artifacts/` (for the opencode reader also the tool-call summary and
identity extract, per reviewer-runner.md). Prompt and subject pairs:

- `gate2-slice1-prompt.txt` → subject `git diff 610ead7...c2a7b6b`
- `gate2-slice2-prompt.txt` → subject `git diff c2a7b6b...d0444da`

Note: `054f7ec` (instrument + record material) is in neither subject range — deliberate; it
touches no product code. The tree the runners sit in is this sitting's closing head.

**Then the FIX AND GOAL sitting (orchestrator, fable):**

1. Rule EVERY gate-2 finding from all four runs; convergence across readers is signal, ruled
   once. Push rulings BEFORE code changes.
2. Executor: check verify-first claims and removal conditions first, apply ruled fixes, then the
   goal — step 9's four exit-0 runs (`at:verify req-001` and `req-016`, both tiers, slot 2 with
   the slot evidence line), at most three iterations.
3. Commit each code reader's FULL evidence into the record before closing.
4. Write the audit brief per reader (luna via codex, flash via opencode) with the CLAIM
   CHECKLIST: adopted rulings by id, the declared path-set, each concrete code fact.
5. Add the sanctioned `Closes AI4DEV-63` line ONLY when the merge ruling declares it — still
   absent from the pull-request body.

## Facts the next sitting needs

- Heads: judgment `610ead7`, draft code `c2a7b6b` (slice 1) and `d0444da` (slice 2), instrument
  `054f7ec`, this sitting's close is the head carrying this file.
- Base on main: `ea4f345`. Reserved database slot: **2** — do not reserve another.
- Pull request: #55, open, non-closing references only.
- Declarations now: loop 18 green / 19 red; integration 13 green / 24 red; `_pending.ts` header
  24 → 21 → 19 across the two slices.
- The five ids: AT-001.16/.36/.37/.17 in `c-membership-and-acknowledgment.test.ts`, AT-001.32 in
  `f-lifecycle-and-audit.test.ts` (kept in place).
- Executor caps: this sitting used one invocation of its three; the next sitting's budget is its
  own.
- The stated open risk stands (fixture hand-models the database semantics); gate-2 direction 2/8
  attacks it per slice, and the goal loop's two tiers are the mitigation.

## Open questions

None for the founder. Nothing contradicts ratified text and there is no scope growth.
