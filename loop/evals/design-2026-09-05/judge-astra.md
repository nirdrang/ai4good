| Rubric criterion | K | L | M | N |
|---|---:|---:|---:|---:|
| 1. Compile-time proof on the destructive path | 3 | 3 | 3 | 3 |
| 2. Positive identity, nothing deleted | 3 | 2 | 3 | 2 |
| 3. Surface: one screen, at most two functions, no exposed stages | 1 | 1 | 3 | 0 |
| 4. Session lifetime single-sourced | 3 | 3 | 3 | 3 |
| 5. Smallest honest diff and selftest story | 2 | 2 | 2 | 2 |
| 6. Lock and evidence | 3 | 3 | 3 | 3 |
| **Total / 18** | **15** | **14** | **17** | **13** |

These are static design scores, not verified execution results. For criterion 3, I count stack-operation calls, excluding logging, assignment, and error reporting.

**K — evidence**

1. **Proof — 3.** K deletes the proof-less reset signatures and passes the identity read into both destructive operations. This matches the existing contracts in [runner.ts:984](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/runner.ts:984) and [attestation.ts:100](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/attestation.ts:100); the nullable proof remains subject to runtime refusal.

2. **Identity — 3.** Its own/foreign container checks, Docker confirmation, local validation, and targeted CLI invocation preserve the applicable safeguards while replacing the pool import. Checked against [db-pool.ts:1084](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/db-pool.ts:1084), `db-pool.ts:1262`, and `runner.ts:630,754`.

3. **Surface — 1.** The branch calls five stack functions—configuration read, lock acquisition, preparation, evidence, and environment emission—exceeding the explicit two-function limit. It hides the reset sequence, but still makes the caller coordinate several stages and exposes an optional destructive-read policy ([design-K.md:39](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/notes/design-K.md:39), `design-K.md:139`).

4. **Lifetime — 3.** K supplies the registry entry, fixture/integration reads, and both necessary loop-test changes. The harness already supplies fixture configuration at [index.ts:121](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/index.ts:121); the affected literals are `_fixture.ts:468`, `_integration.ts:65`, and `b-verification-and-sessions.test.ts:405,519`.

5. **Diff/selftests — 2.** Its pool counts are correct: 1,827 source lines, 668 selftest lines, 33 tests, and 13 selftest files becoming 12; the park also falls outside the compiler includes. However, K incorrectly claims that `live-ledger.selftest.ts` drives `buildLiveLedger`: it actually imports and calls `buildCapabilityLedger` ([live-ledger.selftest.ts:38](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/live-ledger.selftest.ts:38), `:577`), and its cited timing-cache directory is absent from this checkout.

6. **Lock/evidence — 3.** K specifies `dead-pid-only`, immediate runner ownership, existing cleanup, and all five evidence fields, including the lock filename. The key and policy agree with [runner.ts:308](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/runner.ts:308), `:339`, and the proposed transcript at `design-K.md:331`.

**L — evidence**

1. **Proof — 3.** L removes the proof-less reset and untargeted CLI branches, and narrows successful proof identity to a string. The claimed callers are accurate: the pool reset passes a proof at [db-pool.ts:1265](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/db-pool.ts:1265), and both runner refusal tests pass targets at `runner.selftest.ts:173,179`.

2. **Identity — 2.** L preserves positive CLI identity, `localStackProblems`, and the environment wall, but deliberately drops the independent Docker safeguard. That safeguard is an actual pre-reset requirement at [db-pool.ts:1262](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/db-pool.ts:1262), so L does not fully satisfy “nothing deleted.”

3. **Surface — 1.** The branch is compact, but exposes readiness, reset, migration proof, nonce creation, attestation, and output construction directly. Its sequence at [design-L.md:32](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/notes/design-L.md:32) substantially exceeds two function calls.

4. **Lifetime — 3.** The direct registry reads and exported constant cover the fixture, integration waits, and both loop boundaries without editing manifests. The proposed additional import is supported by the existing integration-module import at [b-verification-and-sessions.test.ts:69](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/suites/req-001/b-verification-and-sessions.test.ts:69).

5. **Diff/selftests — 2.** L provides a small file-by-file estimate, a testable pure identity verdict, and a valid park location, but does not replace the two `dead-pid-only` regression tests removed with the pool. Those tests specifically cover old live holders and unreadable claims at [db-pool.selftest.ts:189](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/db-pool.selftest.ts:189) and `:206`; its approximate 2,300-line move also understates the actual 2,495 lines.

6. **Lock/evidence — 3.** The proposed lock uses the correct project/port key and takeover policy, and the evidence includes the proven port, reset, migration counts, and full lock path. Checked against [runner.ts:308](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/runner.ts:308) and `design-L.md:298`.

**M — evidence**

1. **Proof — 3.** M makes reset unconditionally proof-required and returns a non-null, project-specific identity read satisfying the unchanged attestation contract. This correctly closes the overload at [runner.ts:984](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/runner.ts:984) while preserving [attestation.ts:80](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/attestation.ts:80).

2. **Identity — 3.** M preserves both CLI and Docker identity checks, the local/hosted validation walls, and the repeated read immediately before reset. These correspond to [db-pool.ts:1255](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/db-pool.ts:1255), `:1262`, and `:1342`; its explicit authorized identity matches `supabase/config.toml:5,19,44`.

3. **Surface — 3.** The runner makes one substantive preparation call and receives only environment, evidence, and the lock. The lifecycle remains inside the callee, and the existing hoisted-function import-cycle arrangement supports the proposed module structure ([design-M.md:26](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/notes/design-M.md:26), `runner.ts:42`).

4. **Lifetime — 3.** M supplies one registry entry, both direct reads, and the two additional loop-boundary replacements. Checked against [supabase/config.toml:174](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/supabase/config.toml:174), `_fixture.ts:468`, `_integration.ts:65`, and `b-verification-and-sessions.test.ts:405,519`.

5. **Diff/selftests — 2.** The 19-file accounting, pool removal counts, and compilation boundaries check out, and M preserves the two important lock regressions. However, its proposed tests exercise classifiers rather than the complete new identity verdict, leaving their required composition and preparation cleanup untested ([design-M.md:252](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/notes/design-M.md:252), `:309`; `runner.selftest.ts:116`).

6. **Lock/evidence — 3.** M specifies the correct lock and complete evidence, and explicitly handles ownership before preparation returns. That addresses a real interval: the runner’s signal handler only releases its current `lock` variable ([runner.ts:1304](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/runner.ts:1304); `design-M.md:194`).

**N — evidence**

1. **Proof — 3.** N removes the zero-argument reset path and preserves proof arguments for reset and attestation. Keeping optional `readStackStatus` does not itself preserve a proof-less reset; checked against [runner.ts:673](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/runner.ts:673), `:984`, and `attestation.ts:100`.

2. **Identity — 2.** Positive own-name proof, foreign-name refusal, local validation, and the targeted environment wall are retained. Like L, N drops the existing Docker confirmation required at [db-pool.ts:1262](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/db-pool.ts:1262), losing the preservation point.

3. **Surface — 0.** N exposes the entire preparation sequence and six-key environment construction in a 42-line branch, with substantially more than two stack-function calls. Its explicit choice to inline those stages directly contradicts this criterion ([design-N.md:28](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/notes/design-N.md:28)).

4. **Lifetime — 3.** N covers the configuration pin, registry entry, fixture/integration reads, and both loop advances. Keeping the old local constant name does not create another numeric source; its uses are at [_integration.ts:487](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/suites/req-001/_integration.ts:487) and `:559`.

5. **Diff/selftests — 2.** N correctly counts the existing 18 runner tests and the 33-test, 668-line pool selftest, preserves lock regression coverage, and chooses a valid park location. Its three identity tests only check token extraction, explicitly leaving the new proof-producing function outside CI coverage ([design-N.md:363](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/notes/design-N.md:363); `db-pool.ts:1231`).

6. **Lock/evidence — 3.** N supplies the required policy, key, cleanup ownership, and every evidence field. Using the configuration’s port earns credit here because the unchanged validation explicitly checks that the reported port matches it ([runner.ts:766](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/design-judge/tests/at/harness/runner.ts:766); `design-N.md:57`).

**Ranking**

1. **M:** Best overall fit: one lifecycle call, preserved safeguards, explicit lock ownership, and a reasonably small diff.
2. **K:** Strong identity testing and safeguard preservation, but a wider interface and substantially larger addition.
3. **L:** Compact implementation with a useful pure verdict boundary, weakened by exposed orchestration and lost safeguards/coverage.
4. **N:** Covers the essential functional changes, but most directly contradicts the required caller surface.

**Grafts into M**

- **From L:** Add the pure `identityVerdict` boundary and its combined acceptance/refusal tests, rather than testing container extraction alone.
- **From K:** Add the Docker-empty and Docker-error refusal cases.
- **From L:** Remove the orphaned `readStackStatus` and untargeted CLI branches after confirming their remaining callers disappear.
- **From N:** Leave unrelated live-ledger fixture labels unchanged to reduce unnecessary edits.

**Judgment**

M and K are close enough that either could work well after focused review. M has the cleaner ownership boundary and smaller proposed change; K offsets some of that advantage with stronger identity testing, so choosing K would not inherently be regrettable.

K=15 L=14 M=17 N=13
M > K > L > N
close