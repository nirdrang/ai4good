I applied the count scale mechanically: 0 errors/omissions = 5, one = 4, through five or more = 0. To avoid double-counting, code-contradicted claims are accuracy errors; criterion 3 covers additional unsupported-only claims.

| Criterion | W | X | Y | Z |
|---|---:|---:|---:|---:|
| 1. Factual accuracy | 0 | 0 | 0 | 0 |
| 2. Coverage of the notes | 3 | 4 | 0 | 0 |
| 3. No unsupported claims | 5 | 5 | 5 | 5 |
| 4. Dependency map | 4 | 4 | 2 | 2 |
| 5. Reader load | 4 | 2 | 3 | 4 |
| **Total** | **16** | **15** | **10** | **11** |

The four accuracy zeroes are mechanical rubric results: each explanation contains at least five discrete errors, even though W and X are substantially better overall.

## Factual errors

### W — six errors

- W says the ceremony and harness meet at “exactly one seam,” the slot reservation path ([W:20](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-W.md:20)). The executor also directly requires both `at:verify --expect` commands ([executor.md:38](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/agents/executor.md:38)), a separate dependency.

- W describes the live adapter’s five strings as four slot fields “plus mail via vendors” ([W:155](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-W.md:155)). `Slot` actually has five string fields, including `mailUrl`, and `LiveVendors` is an additional object ([req-001/_live.ts:148](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/suites/req-001/_live.ts:148), [req-001/_live.ts:226](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/suites/req-001/_live.ts:226)).

- W says all five req-001 capability-pending ids “call unbacked methods” ([W:157](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-W.md:157)). AT-001.05 and AT-001.10 instead use integration bodies that explicitly throw `CapabilityPending` after `open()` ([req-001/_integration.ts:1243](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/suites/req-001/_integration.ts:1243), [req-001/_integration.ts:1264](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/suites/req-001/_integration.ts:1264)).

- W’s proposed one-stack call is `acquireStackLock(repoConfig, requirement)` while telling the implementer to retain `dead-pid-only` ([W:246](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-W.md:246)). A two-argument call defaults to `stale-or-dead`; the pool obtains the stated behavior only by supplying the third argument ([runner.ts:397](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/runner.ts:397), [db-pool.ts:964](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/db-pool.ts:964)).

- W says the status line and branch guard are the only `loop/work` scripts a live session executes ([W:230](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-W.md:230)). The live controller invokes `Set-HeldItem` from `work-lib.ps1` ([controller/SKILL.md:71](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/skills/controller/SKILL.md:71)), while the current pstack workflow explicitly calls `sheet-check.ps1` and `render-mermaid.ps1` live helpers ([pstack-workflow-ai4good.md:441](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/skills/work/pstack-workflow-ai4good.md:441)).

- W says vendor stand-ins beyond email can remain in place ([W:289](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-W.md:289)). Only the email stand-in has landed; the other vendor contracts and stand-ins are deferred until a consuming suite exists ([contracts.ts:13](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/contracts.ts:13), [vendors.ts:2](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/vendors.ts:2)).

### X — five errors

- X says v2 uses none of the ceremony except `mechanical` ([X:25](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-X.md:25)). The controller still invokes `work-lib.ps1` functions and tells cloud sessions to run the pool setup ([controller/SKILL.md:71](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/skills/controller/SKILL.md:71), [controller/SKILL.md:155](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/skills/controller/SKILL.md:155)).

- X initially says every listener port moves by `N * 1000` ([X:56](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-X.md:56)). The inspector moves by `N * 10`, and only recognized listener ports in the mapping band receive the `N * 1000` transform ([db-pool.ts:344](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/db-pool.ts:344), [db-pool.ts:348](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/db-pool.ts:348)). X corrects this later, but the earlier claim remains erroneous.

- X says every `AtHarness` member comes from the capability ledger ([X:49](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-X.md:49)). `static` is installed directly as a pending capability after the ledger is built ([index.ts:468](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/index.ts:468), [index.ts:500](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/index.ts:500)).

- X says every real above-loop grant carries the attestation ([X:67](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-X.md:67)). `config.registry`, `sentinels.planted`, and `faults.injection` are classified real by fixed witnesses without carrying an attestation ([capabilities.ts:154](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/capabilities.ts:154), [capabilities.ts:281](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/capabilities.ts:281)). Attestation gates construction of the live ledger but is not carried by every real capability.

- X says report accounting requires there be no hook failure ([X:367](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-X.md:367)). A hook failure in a file that already contains a failed test is explicitly invisible ([expected.ts:371](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/expected.ts:371)). X acknowledges that later, leaving the earlier categorical claim inconsistent.

### Y — seven errors

- Y says the PowerShell scripts sequence the ceremony ([Y:3](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Y.md:3)). The conductor and its nine phase Markdown files own the sequence; the scripts are helpers ([conductor.md:27](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/agents/conductor.md:27)).

- Y says `--wired` always exits 3 ([Y:9](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Y.md:9)). Combined with `--expect`, it is rejected as usage and exits 2 ([runner.ts:105](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/runner.ts:105)).

- Y gives one port formula, repo port plus `N * 1000` ([Y:12](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Y.md:12)), omitting the inspector’s `N * 10` rule and unchanged client ports ([db-pool.ts:344](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/db-pool.ts:344), [db-pool.ts:348](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/db-pool.ts:348)).

- Y says `buildCapabilityLedger()` builds the `AtHarness` ([Y:13](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Y.md:13)). `createHarness()` builds it and calls `buildCapabilityLedger()` internally ([index.ts:463](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/index.ts:463), [index.ts:468](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/index.ts:468)).

- Y says the twins may differ only in frontmatter and two paragraphs ([Y:23](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Y.md:23)). The guard also permits and requires an opus-only HTML mirror-note comment ([twin-check.ps1:36](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/work/twin-check.ps1:36), [twin-check.ps1:42](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/work/twin-check.ps1:42)).

- Y says nothing needed by the loop tier imports `db-pool.ts`, despite including `runner.ts` in that set ([Y:37](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Y.md:37)). `runner.ts` imports the pool at module load ([runner.ts:42](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/runner.ts:42)); removing it without changing the runner breaks loop execution and CI.

- Y says the H4 oracle can park silently because no suite calls it ([Y:37](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Y.md:37)). `index.ts` imports it and constructs it on every loop `open()` ([index.ts:24](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/index.ts:24), [index.ts:205](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/index.ts:205)); moving it requires coordinated `index.ts` changes.

### Z — nine errors

- Z says `loop/work` contains seventeen PowerShell scripts ([Z:23](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:23)). It contains fifteen `.ps1` files and seventeen files total.

- Z defines every `pending` result as meaning that code under test does not exist ([Z:57](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:57)). The phases also include `harness-missing` and `tier-unset`; the latter is raised merely because no tier was supplied ([registry.ts:200](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/registry.ts:200), [registry.ts:665](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/registry.ts:665)).

- Z says the capability ledger holds every seam, including `static` ([Z:62](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:62)). `static` is created directly outside the ledger ([index.ts:468](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/index.ts:468), [index.ts:500](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/index.ts:500)).

- Z says integration refuses unless the ceremony reserved a slot ([Z:28](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:28)) and later says `AT_DB_SLOT` skips the reservation check ([Z:277](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:277)). The override skips admission but still reads the reservation and refuses foreign ownership ([db-pool.ts:894](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/db-pool.ts:894), [db-pool.ts:919](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/db-pool.ts:919)); an unreserved override run is allowed.

- Z gives the same incomplete twin-difference rule as Y ([Z:87](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:87)); the HTML mirror-note comment is a third permitted difference ([twin-check.ps1:36](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/work/twin-check.ps1:36)).

- Z says CI prints all five exit-code meanings ([Z:139](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:139)). The error line lists only nonzero codes 1 through 4 ([ci.yml:214](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.github/workflows/ci.yml:214)).

- Z says `chooseTierBody` selects `integration` and otherwise `default` ([Z:150](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:150)). The actual priority is the specifically named tier, then `default`, then `loop` ([registry.ts:794](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/harness/registry.ts:794)).

- Z calls AT-016.01 “the only loop red in the whole tree” ([Z:199](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:199)). Req-001 has sixteen loop reds ([req-001.json:28](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/tests/at/expected/req-001.json:28)); AT-016.01 is only req-016’s sole loop red.

- Z says only `work-lib`, `materialize`, `statusline`, and the branch guard have live callers ([Z:377](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:377)). At this commit `twin-check` has CI, `/work`, and drill callers; `ci-status` is invoked by the CI-watch phase ([phase-ci-watch.md:32](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/skills/work/conductor/phase-ci-watch.md:32)); and pstack documents `sheet-check` and `render-mermaid` as live helpers ([pstack-workflow-ai4good.md:441](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/skills/work/pstack-workflow-ai4good.md:441)).

## Coverage omissions

I did not count a correct fact again as an omission when an explanation instead made an explicit contrary claim; those are already listed above.

### W — two omissions

- W does not state the three rules that must survive parking the old `/work` prose: branch-derived attribution, sessions staying where launched, and merge being the sole close mechanism ([e3:188](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:188)).

- W does not name `loop/decomp` pins or `verify-ai4good` among the explicitly untouched surfaces ([e3:208](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:208)).

### X — one omission

- X likewise omits the explicit requirement that `loop/decomp` pins and `verify-ai4good` remain untouched ([e3:208](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:208)).

### Y — seven omissions

- The three standing workflow rules that survive the prose parking ([e3:188](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:188)).

- The untouched `loop/decomp` and `verify-ai4good` surfaces ([e3:208](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:208)).

- That parking `db-pool.selftest.ts` silently removes its 33 tests from the glob-driven `at:selftest` run ([e3:230](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:230)).

- The single-stack lock and its required `dead-pid-only` or equivalent takeover rule ([e1:279](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:279), [e1:332](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:332)).

- The reusable no-target Supabase invocation and no-target reset path, including the environment wall against tracked `.env` values ([e1:276](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:276), [e1:342](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:342)).

- The need for a new positive project/container identity read before `writeAttestation`, because `proveSlotTarget` is tied to `ai4good-slot-N` ([e1:354](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:354)).

- The replacement path’s evidence contract—project id, API port, reset, and migration counts—and explicit obligation to preserve migration replay ([e1:278](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:278), [e1:280](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:280)).

### Z — eight omissions

- The three standing workflow rules ([e3:188](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:188)).

- The untouched `loop/decomp` and `verify-ai4good` surfaces ([e3:208](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:208)).

- The actual frozen-harness authoring rule: new ATs use `atTest` plus existing adapters, or become shipped-module/one-stack selftests without new sentinel, fault, oracle, or fixture-world machinery ([e4:233](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e4-suites-findings.md:233)).

- The single-stack serialization lock and takeover policy ([e1:279](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:279), [e1:332](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:332)).

- The already-available no-target CLI and database-reset path ([e1:276](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:276), [e1:342](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:342)).

- The replacement evidence line and explicit migration-replay obligation ([e1:278](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:278), [e1:280](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e1-runner-findings.md:280)).

- The controller cloud template’s direct dependency on `db-pool.ts setup` ([e3:236](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:236)).

- A complete inventory of the scripts being parked and their remaining prose/config callers ([e3:141](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/e3-v1-ceremony-findings.md:141)).

## Unsupported claims

No additional unsupported-only claims were found in W, X, Y, or Z. All source-grounding failures I found were directly contradicted by the checkout and are already counted under factual accuracy. Z’s later-state appendix is excluded as instructed.

## Dependency-map and reader-load evidence

- W earns 4 for dependency mapping: it connects the pool, runner, settings, reservation script, selftest, agents, twin guard, CI, frozen harness, and one-stack replacement. It loses the final point for the caller-map errors and for omitting the cloud setup/readme dependencies, which still name `AT_DB_SLOT` and `db-pool.ts setup` ([cloud-environment-setup.sh:24](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/cloud-environment-setup.sh:24), [cloud-session-readme.md:107](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/.claude/cloud-session-readme.md:107)). Its structure is direct and usable, hence reader load 4.

- X also earns 4 for the map: it provides the fullest transition recipe and most detailed import graph, but carries the same uncharted cloud and live-helper callers. Reader load is 2 because core facts are repeated across the overview, concepts, detailed walkthrough, dependency map, path inventory, and twenty-item gotcha list.

- Y earns 2 for the map: all major nouns appear, but the load-time pool dependency, oracle construction, one-stack locking, positive identity proof, and replacement sequence are either missing or wrong. Its brevity helps, but the compressed paragraphs require rereading, so reader load is 3.

- Z earns 2 for the map: its graph handles the pool import, selftest, settings, drills, and central ceremony pieces, but does not map the harness freeze or a complete one-stack replacement and omits many scripts. The in-scope narrative remains easy to follow, giving reader load 4.

## Out-of-scope notes

- W — no out-of-scope passage.
- X — no out-of-scope passage.
- Y — no out-of-scope passage.
- Z — out of scope: “How it actually resolved,” lines 447–474, discusses later commits and the merged state; none of it affected scoring ([Z:447](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/harness-review/loop/notes/explanation-Z.md:447)).

## Ranking

1. W — Best balance of a usable dependency map, transition guidance, and readable structure, despite several exactness defects.
2. X — Broadest coverage and strongest one-stack recipe, but materially harder to consume and internally inconsistent in several places.
3. Z — Clearer and more substantial than Y, especially on the slot inversion and JWT/reset hazards, but incomplete and frequently inaccurate.
4. Y — Concise and well aimed, but its load-time pool and oracle claims would make a parking implementation unsafe.

W=16 X=15 Y=10 Z=11
W > X > Z > Y
Y: Its claim that nothing needed by loop imports db-pool.ts misses runner.ts’s load-time import, so following it would break both loop verification and CI.
No—the best explanation is not good enough to hand to a new engineer unchanged; its seam count, one-stack lock call, and vendor claims need correction.