# Explanation review at `f81062e`

All three explanations were scored against the checkout, not against their cited line numbers. A distinct root defect is counted once even when an explanation repeats it. A claim directly contradicted by the checkout is listed under factual accuracy, not counted a second time as an unsupported claim. Explanation B's later-state passage is excluded from every score, as required.

## Scores

| Criterion | A | B | C |
|---|---:|---:|---:|
| 1. Factual accuracy against the code | 1 | 0 | 0 |
| 2. Coverage of the explorer notes | 3 | 1 | 4 |
| 3. No unsupported claims | 5 | 5 | 5 |
| 4. Dependency map | 4 | 2 | 4 |
| 5. Reader load | 4 | 3 | 2 |
| **Total / 25** | **17** | **11** | **15** |

## Evidence

### 1. Factual accuracy against the code

#### Explanation A

- **A-F1 — `prepare()` is not the only place that forces `jwt_expiry = 120`.** A says that it is at `loop/notes/explanation-A.md:131-134`. The rewrite belongs to `generateSlotConfig()` (`tests/at/harness/db-pool.ts:407-409`), which is called both by per-run `prepare()` (`tests/at/harness/db-pool.ts:1297-1301`) and by pool `setup()` (`tests/at/harness/db-pool.ts:1453-1464`). `prepare()` is the relevant per-run caller, but it is not the only caller that forces the value.

- **A-F2 — the five-coordinate live input is described as four coordinates plus a different object.** A says `createLiveAdapter` receives five strings, then lists `apiUrl`, `dbUrl`, `anonKey`, `serviceRoleKey`, and “mail via `vendors`” (`loop/notes/explanation-A.md:155-157`). The fifth string is actually `mailUrl` in `Slot` (`tests/at/suites/req-001/_live.ts:148-154`); `vendors` is a separate factory argument beside `slot` (`tests/at/suites/req-001/_live.ts:226-230`). This matters when replacing `stackEnv()`: the child still needs the mail URL even though the adapter reads messages through the already-built vendor object.

- **A-F3 — non-email vendor stand-ins do not exist in this checkout.** A puts “vendor stand-ins beyond email” among machinery that can be left in place (`loop/notes/explanation-A.md:287-290`). The contracts say only the email provider has landed and that Anthropic, Stripe, GitHub, Lovable, and Linear arrive with future consuming suites (`tests/at/harness/contracts.ts:11-17`); the current `Vendors` type contains only `email` (`tests/at/harness/contracts.ts:156-158`).

- **A-F4 — two v2 helpers are incorrectly swept into the stated park inventory.** A introduces its table as “pieces the brief parks” and includes `sheet-check.ps1` and `render-mermaid.ps1` in the manual-only row (`loop/notes/explanation-A.md:199-221`). The live pstack workflow explicitly retains `loop/work/` for those helpers (`.claude/skills/work/pstack-workflow-ai4good.md:427-443`), names `render-mermaid.ps1` as the chart syntax check (`.claude/skills/work/pstack-workflow-ai4good.md:527-536`), and makes `sheet-check.ps1` the check for the deployed model sheet (`.claude/skills/work/pstack-workflow-ai4good.md:615-618`). The actual v1-script ruling names twin, stamp, attribution, watch, work-lib, and materialize—not these two (`.claude/skills/work/pstack-workflow-ai4good.md:641-650`).

Four material errors give A a factual-accuracy score of 1.

#### Explanation B

- **B-F1 — `loop/work/` does not contain seventeen PowerShell scripts.** B says it does at `loop/notes/explanation-B.md:22-24`. The checked directory contains seventeen files but only fifteen `*.ps1`; the other two are `loop/work/attribution-epoch.txt:1` and `loop/work/pstack-models.expected.md:1`. The source inventory also distinguishes both data files from scripts (`loop/notes/e3-v1-ceremony-findings.md:28-48`).

- **B-F2 — `pending` does not uniformly mean that product code is absent.** B says all three pending phases mean “the code under test does not exist yet” (`loop/notes/explanation-B.md:57-60`). `sut-missing` has that meaning, but `harness-missing` means the harness capability modules are absent (`tests/at/harness/registry.ts:10-11,670-675`), and `tier-unset` means no tier was supplied (`tests/at/harness/registry.ts:200,665`).

- **B-F3 — a bare vitest run does not make every id `tier-unset`.** B makes this claim twice (`loop/notes/explanation-B.md:45-47,422-423`). `tier-unset` is thrown only at the first `open()` (`tests/at/harness/registry.ts:665,917-920`). The sixteen req-001 `notLanded` bodies throw `sut-missing` directly without opening the harness (`tests/at/suites/req-001/_pending.ts:82-85`), so “every id” is false.

- **B-F4 — CI does not print all five exit-code meanings.** B says it does (`loop/notes/explanation-B.md:139-142`). The CI error text is emitted only for a nonzero result and lists meanings for 1 through 4; it does not print the meaning of 0 (`.github/workflows/ci.yml:208-215`).

- **B-F5 — CI was part of the v1 lifecycle.** B says “CI never took part in that” (`loop/notes/explanation-B.md:206-219`). The v1 conductor requires CI on the final head (`.claude/skills/work/conductor/phase-audit-tail.md:1-7`), has a CI-watch phase that calls the status helper (`.claude/skills/work/conductor/phase-ci-watch.md:29-35`), and gates the merge on that result. It is true that CI never runs the integration tier; it is false that CI did not participate in the lifecycle.

- **B-F6 — `AT_DB_SLOT` does not skip the reservation check.** B says the override makes `occupy()` skip it (`loop/notes/explanation-B.md:274-278`). In the override branch, `occupy()` still reads the reservation strictly and refuses a slot reserved for a different item (`tests/at/harness/db-pool.ts:910-929`). The override skips the requirement to discover an admission reservation; it does not ignore an existing reservation.

- **B-F7 — the one-hour JWT produces timed assertion failures, not four-minute hangs.** B says AT-001.12 and AT-001.13 “become hangs and then false reds” (`loop/notes/explanation-B.md:319-328`). AT-001.12 sleeps a fixed 135 seconds and then asserts that the token is expired (`tests/at/suites/req-001/_integration.ts:484-490`). AT-001.13 polls only until its fixed 150-second deadline and then asserts (`tests/at/suites/req-001/_integration.ts:555-566`). Both fail under a 3600-second JWT, but neither waits for the 240-second test timeout.

- **B-F8 — the live-caller census for `loop/work/` is false.** B says only work-lib, materialize, statusline, and guard-branch-switch have live callers (`loop/notes/explanation-B.md:372-379`). At this commit CI calls `twin-check.ps1` (`.github/workflows/ci.yml:85-103`); the v1 CI-watch phase calls `ci-status.ps1` (`.claude/skills/work/conductor/phase-ci-watch.md:29-35`); and the live pstack workflow uses `sheet-check.ps1` and `render-mermaid.ps1` (`.claude/skills/work/pstack-workflow-ai4good.md:267-274,527-536`). The explanation itself also describes `/work` and the drills calling twin-check at `loop/notes/explanation-B.md:267-269`.

Eight distinct material errors put B at the rubric floor for factual accuracy.

#### Explanation C

- **C-F1 — v2 uses more of the old ceremony than `mechanical`.** C says v2 “uses none of the ceremony except `mechanical`” (`loop/notes/explanation-C.md:19-26`). The controller directly requires the pstack workflow and shared invariants (`.claude/skills/controller/SKILL.md:10-12`), materializes “as `/work` describes it” (`.claude/skills/controller/SKILL.md:45-48`), invokes `Set-HeldItem` from work-lib (`.claude/skills/controller/SKILL.md:67-72`), and still tells cloud sessions to run `db-pool.ts setup` (`.claude/skills/controller/SKILL.md:154-157`). C maps some of these dependencies later, which makes its opening summary internally contradictory as well as factually wrong.

- **C-F2 — not every real grant above loop carries the slot attestation.** C states that it does (`loop/notes/explanation-C.md:67-70`). The capability witnesses for `config.registry`, `sentinels.planted`, and `faults.injection` grant the article itself with no attestation (`tests/at/harness/capabilities.ts:281-283`). A live oracle transport is also classified as real from tier plus transport brand, with no attestation in that verdict (`tests/at/harness/capabilities.ts:285-339`). Attestation is a global prerequisite to entering `buildLiveLedger()` and is carried by specific live clock, mail, fixture, and SUT grants; it is not carried by every real verdict.

- **C-F3 — pending red details are prefix-matched, not exact first-line matched.** C says every red is compared by its exact rebuilt first line (`loop/notes/explanation-C.md:360-366`). `capability-pending` is exact, but `pending` deliberately rebuilds only an anchored prefix because the tail varies by suite and machine (`tests/at/harness/expected.ts:272-295`).

- **C-F4 — the JWT failure timing is misstated.** C says AT-001.12 and AT-001.13 wait for an expiry beyond their four-minute budget (`loop/notes/explanation-C.md:526-530`). They use fixed 135- and 150-second waits/deadlines and then fail assertions while the one-hour token is still valid (`tests/at/suites/req-001/_integration.ts:484-490,555-566`); the 240-second timeout is not what ends either test.

- **C-F5 — `live-ledger.selftest.ts` can break for behavioral changes, not only renames.** C says it “survives the pool's removal and breaks only on renames” (`loop/notes/explanation-C.md:497-498`). The selftest asserts nonce mismatch and row-count refusal behavior (`tests/at/harness/live-ledger.selftest.ts:179-231`), positive-project proof for writes (`tests/at/harness/live-ledger.selftest.ts:280-305`), the slot brand and Mailpit-identification rules (`tests/at/harness/live-ledger.selftest.ts:309-350`), and attested live capability behavior (`tests/at/harness/live-ledger.selftest.ts:359-508`). A semantic redesign of any of those rules can break it without renaming a symbol.

- **C-F6 — the v1-script section fails to protect the live pstack helpers.** Under “v1 scripts parked,” C puts `sheet-check.ps1` and `render-mermaid.ps1` in a residual “not in settings or CI” row (`loop/notes/explanation-C.md:544-556`) without recording that they are v2's retained work helpers. The pstack workflow calls the `loop/work/` pair live (`.claude/skills/work/pstack-workflow-ai4good.md:427-443`), assigns them the deployed-sheet and mermaid checks (`.claude/skills/work/pstack-workflow-ai4good.md:267-274,527-536,615-618`), and excludes them from the named v1 park scope (`.claude/skills/work/pstack-workflow-ai4good.md:641-650`). “Not in settings or CI” is true but is not the relevant dependency boundary.

- **C-F7 — a bare vitest run does not report every id as `tier-unset`.** C says it does at `loop/notes/explanation-C.md:625-628`. The registry only throws that phase at the first `open()` (`tests/at/harness/registry.ts:665,917-920`), while req-001's sixteen `notLanded` bodies throw `sut-missing` without calling `open()` (`tests/at/suites/req-001/_pending.ts:82-85`).

Seven material errors put C at the rubric floor for factual accuracy.

### 2. Coverage of the explorer notes

#### Explanation A

- **A-O1 — the frozen harness is not mapped to all of its current suite consumers.** A names the broad ledger and the unused oracle, but its “stays frozen” section never explains that req-016 actively consumes sentinel planting and email attempts (`tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts:50-71`), restart and crash fault seams (`tests/at/suites/req-016/b-delivery-defaults.test.ts:46-48`; `tests/at/suites/req-016/c-reliability-guard.test.ts:64`), pinned config and controlled time (`tests/at/suites/req-016/b-delivery-defaults.test.ts:121-151`), and email rejection/ambiguous-ack behavior (`tests/at/suites/req-016/c-reliability-guard.test.ts:163-221`). That is the material reason those frozen modules and their centralized guards cannot be parked with the unused semantic judge.

- **A-O2 — it omits the v2 keep-boundary for the pstack model-sheet and mermaid helpers.** This is the coverage consequence of A-F4: the dependency account does not say that `sheet-check.ps1`, `render-mermaid.ps1`, and `pstack-models.expected.md` are the retained v2 work helpers (`.claude/skills/work/pstack-workflow-ai4good.md:433-442,615-618`). A parking plan based on A's table can move files the replacement workflow still names.

Two material omissions give A a coverage score of 3.

#### Explanation B

- **B-O1 — it omits serialization for the one shared stack.** B never carries `acquireStackLock(repoConfig, requirement, { takeover: 'dead-pid-only' })` into the 44321 design. The runner states why this is mandatory: two verifies against one stack let the second reset the first run's database (`tests/at/harness/runner.ts:345-350,371-399`). This is the most consequential omission in all three explanations.

- **B-O2 — it does not give the slot-free parent-runner replacement path.** The notes' usable replacement is: no-target CLI invocation with the `SUPABASE_*` wall (`tests/at/harness/runner.ts:627-644`), no-target status (`tests/at/harness/runner.ts:673-675`), readiness, no-target reset, migration replay proof (`tests/at/harness/runner.ts:938-952,984-1000`), fresh attestation, six child values, and non-slot evidence. B discusses identity, JWT lifetime, reset necessity, and attestation separately, but never joins these into the dependency-preserving path needed to remove the load-time pool import.

- **B-O3 — it does not resolve v2's dependencies on scripts that the ruling parks.** B labels work-lib and materialize “stays live” (`loop/notes/explanation-B.md:227-234`) instead of explaining the necessary controller updates. The controller uses `/work` materialization and `Set-HeldItem` (`.claude/skills/controller/SKILL.md:45-48,67-72`), and its cloud template names the pool setup command (`.claude/skills/controller/SKILL.md:154-157`). The stated v1 park scope includes work-lib and materialize (`.claude/skills/work/pstack-workflow-ai4good.md:641-650`), so these callers must be removed or replaced in the same change.

- **B-O4 — it omits the correct live-helper boundary inside `loop/work/`.** B neither preserves the pstack sheet/mermaid helpers nor accounts for the v1 CI-status caller, leading to the false four-caller census in B-F8. The relevant evidence is `.claude/skills/work/pstack-workflow-ai4good.md:267-274,427-443,527-536,615-618` and `.claude/skills/work/conductor/phase-ci-watch.md:29-35`.

Four material omissions give B a coverage score of 1.

#### Explanation C

- **C-O1 — it never states the retained v2 dependency of the sheet and mermaid helpers.** C inventories both scripts but stops at “not in settings or CI” (`loop/notes/explanation-C.md:544-556`). The needed fact is that pstack itself calls them retained, live helpers and describes their checks (`.claude/skills/work/pstack-workflow-ai4good.md:267-274,427-443,527-536,615-618`). Every other material fact needed from the four notes to answer the question is present.

One material omission gives C a coverage score of 4.

### 3. Unsupported claims

- **A:** No additional material unsupported claim. Its checkout-refuted assertions are already A-F1 through A-F4.
- **B:** No additional material unsupported claim in the in-scope portion. Its checkout-refuted assertions are already B-F1 through B-F8; the later-state passage is excluded rather than judged.
- **C:** No additional material unsupported claim. Its checkout-refuted assertions are already C-F1 through C-F7.

All three therefore score 5 on this separate criterion; no defect is double-counted merely because a false statement also lacked support.

### 4. Dependency map

- **A — 4/5.** It gives the cleanest compact map of the present runner, the load-time pool import, reservation files, relay and drill callers, CI, the one-stack replacement, locking, reset, attestation, Mailpit, and JWT decision. It loses one point because the live pstack helpers are placed on the wrong side of the park boundary and the frozen H2/H3/H5 consumers are under-mapped.

- **B — 2/5.** Its current-state graph is readable and catches the load-time import, selftest shrink, drill/twin coupling, hooks, and reservation files. It is not sufficient to plan the requested change: it omits the shared-stack lock and full no-target runner path, misstates reservation override behavior, and leaves or misclassifies v2 script dependencies.

- **C — 4/5.** It supplies the broadest graph and the most complete one-stack checklist, including lock identity, no-target CLI/reset, migration proof, attestation, child environment, JWT, controller, settings, drills, and CI. It cannot score 5 because several drawn or narrated edges are wrong: v2's old-work dependencies, universal attestation, and the sheet/mermaid keep boundary.

### 5. Reader load

- **A — 4/5.** The order follows the question, the current and desired paths are separated, and the summary tables are useful. Some repeated gotchas and the imprecise frozen-module inventory keep it from a 5.

- **B — 3/5.** The prose is approachable and the central concepts arrive in a sensible order, but important implementation facts are scattered, the graph does not contain the eventual one-stack design, and the excluded later-state appendix adds substantial distraction.

- **C — 2/5.** Its headings and diagrams are clear, but at 680 lines it repeats the same port, lock, attestation, CI, settings, and drill facts across concepts, flow, dependency map, location table, and twenty gotchas. A senior engineer must reconcile contradictions between the opening summary and later map rather than being able to use one concise account.

## Out-of-scope notes

- **A:** No passage describes repository state later than `f81062e`.
- **B:** `loop/notes/explanation-B.md:447-474`, headed “How it actually resolved,” describes later `main` commits and files absent from this checkout. It received no factual-error penalty, no coverage credit, and no dependency-map credit.
- **C:** No passage describes repository state later than `f81062e`.

## Ranking

1. **A** — Best overall because it is the shortest explanation that still gives an actionable current-state and one-stack dependency map, including the critical shared-stack lock and the correct 135/150-second JWT failure behavior.
2. **C** — Second because it covers almost every needed edge and offers the fullest replacement checklist, but its length and seven material inaccuracies make it less safe and harder to use than A.
3. **B** — Third because its narrative is readable but its factual error count reaches the rubric floor and its missing shared-stack serialization and incomplete replacement path make it unsafe as a parking guide.
