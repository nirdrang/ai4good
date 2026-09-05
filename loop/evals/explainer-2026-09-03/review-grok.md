# Explainer review — 2026-09-03

Variant: which model writes the how-explainer from four explorer notes.
Tree: commit `f81062e` in `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\harness-review`.
Question: how the v1 ceremony and the acceptance-test harness work, and what depends on what, so that the slot machinery, the v1 relay agents and scripts, and the CI twin-guard step can be parked, the harness frozen, and CI aligned, while req-001 and req-016 stay green at the loop tier with `--expect` and req-001 stays green at the integration tier against the one local stack.

Scale: 0 to 5, 5 best. Same scale for A, B, and C. Not graded on a curve.
For criteria 1–3, 5 means none found, 0 means five or more.

## Scores

| Criterion | A | B | C |
|---|---|---|---|
| 1. Factual accuracy against the code | 4 | 2 | 3 |
| 2. Coverage of the notes | 2 | 1 | 4 |
| 3. No unsupported claims | 5 | 4 | 4 |
| 4. Dependency map | 4 | 3 | 4 |
| 5. Reader load | 4 | 3 | 3 |
| **Total** | **19** | **13** | **18** |

## 1. Factual accuracy — errors

Each item is a named file, function, line, port, count, or default that does not match this checkout.

### A (1 error → 4)

- **A.** “Five ids (AT-001.02/.03/.04/.05/.10) call unbacked methods and are declared `capability-pending` by name.” AT-001.02/.03/.04 do hit unbacked methods through the shared loop body. AT-001.05 and AT-001.10 do not: `_integration.ts` exports `at00105 = refusesWith('vendors.github-public-statistics')` at line 1264 and `at00110 = refusesWith('sut.accounts.sendDiscoveryMessage')` at line 1274. Those bodies call `open()` and throw `CapabilityPending`; they never call an unbacked method. The five names in `tests/at/expected/req-001.json` lines 67–71 are right; the mechanism is not.

Line numbers A cites for the runner, the pool, the manifests, CI, settings, JWT, and attestation checked clean against this tree (for example `runner.ts` `main` at 1233, `AT_DB_SLOT` at 1338, pool import at 44, `personalBlockProblems` at 457, `SLOT_JWT_EXPIRY_SECONDS` at 407, `_integration.ts` `SLOT_JWT_EXPIRY_MS` at 65, `index.ts` static pending at 500, `ci.yml` twin guard at 85–103). Manifest counts (req-001 loop 21/16, integration 16/5+16; req-016 loop 11/1, integration 0/12) match the two JSON files. Slot 1 API 45321 and the 44321 block match `db-pool.ts` port arithmetic and `supabase/config.toml`.

### B (3 errors → 2)

- **B.** “seventeen PowerShell scripts in `loop/work/`” (overview). That directory has **15** `.ps1` files and **17** files in total (`attribution-epoch.txt` and `pstack-models.expected.md` are not scripts). The later “17 files” line is the file count, not the script count.
- **B.** “CI prints all five meanings in its error line (`ci.yml:214`).” Line 214 prints codes 1, 2, 3, and 4 only. It does not print 0.
- **B.** “`loop/work/` 17 files; only `work-lib`, `materialize`, `statusline`, `guard-branch-switch` have a live caller.” At this commit `twin-check.ps1` is live in CI (`ci.yml` 85–103). B’s own map earlier in the same document shows that caller. The “Where things live” line is false of `f81062e`.

Minor line-number slips not counted as separate errors: inspector mapping is `db-pool.ts:346` not `:345`; `check.ts` 61–63 defines `suiteDir`, while the exists check is `runner.ts` 1255.

True counts B got right: 33 `it()` cases in `db-pool.selftest.ts`; `settings.json` line 5 `AT_DB_SLOT`; Studio port 44323.

### C (2 errors → 3)

- **C.** “Either the one stack’s config pins 120 (a standing change to `supabase/config.toml`, which also changes what the loop-tier `_fixture.ts` models, 3600).” The loop fixture does **not** read `config.toml`. It hard-codes `ACCESS_TOKEN_TTL_MS = 3600 * 1000` at `tests/at/suites/req-001/_fixture.ts` 468, with a comment at 460–463 that a config change is a **separate one-line edit in the fixture**. Pinning `jwt_expiry = 120` on the one stack does not change the loop model and does not, by itself, move loop `--expect`. Explanation A states the opposite, correctly: the loop fixture “models 3600 and does not care.”
- **C.** Cloud brief “`db-pool.ts setup` (line 157).” The command sits at `.claude/skills/controller/SKILL.md` 155–156. Line 157 is the next bullet (`codex login`).

C’s other named lines and counts checked clean: 13 `*.selftest.ts` files under `tests/at/harness/`; 5 SQL files in `supabase/migrations/`; 30 `at-req-*.md` files; 9 conductor phase files; 7 agents; `writeAttestation` at `attestation.ts` 100; `occupy` 901–998; `prepare` 1297–1360; `proveSlotTarget` 1194; `statusline.ps1` 108; `run-drills.ps1` 303; `shared-invariants.md` 79; `AGENTS.md` 65–110; ownership 242–303 including the `src/routeTree.gen.ts` exemption at 275–283; reference guard 305–391. The `itemFromBranch` / `currentBranch` pair is compressed (`itemFromBranch` at 799 parses a branch string; `currentBranch` at 811 runs `git rev-parse`) and is not counted as a separate error.

## 2. Coverage of the notes — omissions

Facts the question needs (what depends on what, what can be parked, what stays green) that appear in the four explorer notes and are missing from the explanation.

### A (3 omissions → 2)

- **A.** `CLAUDE.md` section 5 still names `/work` as the one lifecycle entry. The three standing rules (attribution from the branch; a session works where it was launched; the merge closes an item) stay in that section when `/work` prose is parked. Explorer e3 states this as the parking edit for the old coordinator manual. A names `Agents.md` as a third stale story and does not name this `CLAUDE.md` edit.
- **A.** Loop req-016 green is not product green. `tests/at/suites/req-016/_fixture.ts` is a taxonomy-derived stand-in (explorer e4). A freeze that “fixed” that fixture would move the declared loop state. A never says this.
- **A.** `materialize.ps1` is still invoked by `/controller` and `/work` prose (explorer e3 script table). A lists it only as a caller of `work-lib.ps1`, not as a stay-live script. A planner following A’s park table can park materialisation and break v2 pickup.

### B (4 omissions → 1)

- **B.** `resetLocalDatabase()` with no target already resets the repo stack (`runner.ts` 984–986) and the integration path never calls that overload (explorer e1 keep-list). B never names this function. The 44321 path is then invented from scratch instead of reused.
- **B.** The `/controller` cloud brief still tells a fresh VM to run `bun tests/at/harness/db-pool.ts setup` (explorer e3; `controller/SKILL.md` 155–156). Parking the pool without editing that template leaves a live instruction to run parked code. B does not mention it.
- **B.** `CLAUDE.md` section 5 still leads with `/work`; the three standing rules stay (explorer e3). B does not mention this parking edit.
- **B.** A 44321 path still needs `acquireStackLock` on the repo config (`poancmeitlmxejofwzuu` + 44321) so two integration runs do not reset the one stack under each other (explorer e1). Today the lock is only taken on `slotClaimKey` (`ai4good-slot-N`, port 0). B discusses isolation via `prepare()`’s reset and does not name the lock.

### C (1 omission → 4)

- **C.** Under a frozen harness, new acceptance ids register through `atTest` with the existing adapters; a test with no AT id lives under `tests/at/harness/*.selftest.ts` beside the shipped-module selftests, because `at:verify` filters to `suites/req-0NN/` (explorer e4). C lists frozen modules and their suite consumers and does not state this authoring rule. A planner freezing the harness needs it.

C covers the rest of the load-bearing note facts: load-time pool import, `AT_DB_SLOT=1` ≠ 44321, JWT 120 vs 3600, `_live.ts` isolation via reset, attestation round trip and `'slot'` brand, `stackEnv` refusal of 44320–44329, `proveSlotTarget` keyed on `ai4good-slot-N`, `writeAttestation` needing a `ProvenSlotRead`, twin-check’s three callers, drills binding agents and phase files, stamp/banner already unwired, settings paths into the main checkout, `work-lib` required by the live status line, mechanical stays, CI loop-only `--expect`, declared greens/reds with the five named capability-pending ids, req-016 all-red at integration, controller cloud `db-pool.ts setup`, `Agents.md`, `CLAUDE.md` `/work` lead-in, `--expect` hole at `expected.ts` 371–376, two different “oracles.”

## 3. Unsupported claims

Claims that neither the notes nor the code support.

### A (none → 5)

No unsupported claim found. Advice (“the design station should say the inversion out loud”) is marked as a conflict between the brief and the runner/pool headers, which both files still state at `runner.ts` 10–13 and `db-pool.ts` 8–12.

### B (1 → 4)

- **B.** “Park the drills and leave the guard, and the guard has nothing to guard.” `twin-check.ps1` compares `.claude/agents/orchestrator.md` and `orchestrator-opus.md`. If the drills move and those two files remain, the guard still has something to compare. The notes do not support the stronger claim.

### C (1 → 4)

- **C.** Overview: v2 “uses none of the ceremony except `mechanical`.” Section 2 then lists four further v1 pieces: `work-lib.ps1` (`Set-HeldItem` / `Clear-HeldItem`), materialisation “as `/work` describes it,” the cloud brief’s `db-pool.ts setup`, and `AT_DB_SLOT=1` in settings. The overview sentence is not supported as a complete picture. Section 2 is the supported account.

## 4. Dependency map

The question names: slot machinery, v1 agents and scripts, the CI twin-guard step, the harness freeze, the one stack. The map must say what each touches and what touches it, well enough to plan the parking without reading the code.

### A — 4

A table maps ceremony pieces to live callers (CI, settings, `/work`, drills, runner load-time import). The 44321 keep/drop list names `readLocalConfig`, `supabaseInvocation(undefined, …)`, `localStackProblems`, `waitForReady`, `proveMigrationsReplayed`, the no-target reset, `acquireStackLock` with `dead-pid-only`, attestation round trip, Mailpit on 44324, and the JWT / `proveSlotTarget` gaps. Frozen modules and “do not remove `oracles.ts` because `createHarness` constructs it” are present. Gaps that keep this off 5: `materialize.ps1` is not a stay-live row; `stackEnv()`’s refusal of 44321 is stated on the current path but not as “the replacement must emit env from something other than `stackEnv()`”; `CLAUDE.md` `/work` is missing. The JWT note is the correct one: loop does not care.

### B — 3

B’s mermaid of the park set versus live callers is the clearest picture of twin-check, drills, agents, settings hooks, and the runner→pool load-time import. It is enough to avoid deleting `work-lib` or `statusline` by accident. It is not enough to build the 44321 path without the code: no-target reset, repo-config lock, and a replacement for `stackEnv()` are absent. The “Where things live” live-caller summary contradicts the map (see accuracy).

### C — 4

C’s section 9 is the parking plan: mermaid of settings, scripts, harness, suites, ceremony, and CI; then six scope bullets; then an eight-point 44321 recipe including the lock file `at-verify-poancmeitlmxejofwzuu-44321.lock`, the CLI wall, `localStackProblems`, no-target reset, nonce write, **a new env emitter because `stackEnv()` refuses 44320–44329**, evidence without a slot number, and JWT. Script stay/park table names `work-lib` as required by the live status line and warns that parking it as the brief lists it breaks the status line. Mechanical stays; drills go red; cloud template names `db-pool.ts setup`. The defect that keeps this off 5 is point 8 of that recipe: it wrongly couples `config.toml` `jwt_expiry` to the loop fixture (accuracy error above). A planner using only C would edit loop req-001 when pinning 120 on the one stack.

## 5. Reader load

### A — 4

Overview, key concepts, runner, integration path, child/ledger, declared state, CI, ceremony table, 44321 keep/drop, freeze, gotchas. A senior engineer can read it front to back. The JWT inversion and the load-time import are stated once, in the place the parking job needs them. Not a 5: the ceremony table is denser than the prose around it, and `CLAUDE.md` / materialise gaps mean a first read is not a complete parking plan.

### B — 3

The narrative is the easiest to follow until “Where things live” and the last section. The live-caller contradiction forces a re-read of the earlier map. The final “How it actually resolved” section is a later-`main` story (see out of scope) and does not belong in an explanation of `f81062e`.

### C — 3

Section order matches the question (ceremony, v2, CI, runner, pool, child, `--expect`, suite imports, parking map). Nothing is fluff. At ~680 lines and twenty gotchas it is a reference, not a single-pass read. A senior engineer will skip to section 9 and then hunt back for JWT, locks, and callers.

## Out of scope

- **A.** None. A states it is written against `f81062e` before any parking.
- **B.** Section “How it actually resolved” (explanation-B.md 447–474): later `main` commits, `loop/parked/v1/README.md`, `live-stack.ts`, and a parked harness shape. Noted once. Not scored as an error and not scored as coverage of the notes.
- **C.** None.

## Ranking

1. **A** — Highest total (19). The named facts that were checked are almost all right, including the load-bearing JWT fact that loop does not follow `config.toml`. The ceremony table and the 44321 keep/drop list are enough to start the parking change. Coverage holes (CLAUDE.md, req-016 stand-in, materialise) keep it from being the whole plan.
2. **C** — Total 18. The widest note coverage and the only full 44321 recipe (new env emitter, repo lock file, `ProvenSlotRead` gap). One parking-critical error: it treats a `jwt_expiry = 120` pin on the one stack as a change to the loop fixture. That is the mistake most likely to move loop `--expect`.
3. **B** — Total 13. Best ceremony graph, then three count/caller errors and four missing keep-list facts for the one stack. A reader cannot plan the 44321 path from B alone, and the “only four live callers” line fights B’s own map.

Most consequential error: **C**, the claim that pinning `jwt_expiry = 120` on `supabase/config.toml` also changes what `req-001/_fixture.ts` models. Loop `--expect` for AT-001.12 and AT-001.13 advances a hard-coded 3600 s clock (`_fixture.ts` 468; `b-verification-and-sessions.test.ts` 405, 519, 537). Editing that fixture to “match” 120 would move the two suites the done contract requires to stay green at loop.
