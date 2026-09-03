# Unit 3 brief: the stack lifecycle leaves runner.ts for its own module (writer: the feature lane)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87, branch nirdrang/ai4dev-87-the-acceptance-harness-shrinks-to-the-per-id-gate-over-the. You write in this worktree and commit on this branch. Nobody else writes while you do. Use PowerShell for every command. Units 1 and 2 have landed; read `git log -4 --stat` before you start.

## The design you implement
Read `loop/items/AI4DEV-87/artifacts/design.md` section 3. This is a move, not a rewrite: every function keeps its name, its signature, its body, and its doc comment. Read `tests/at/harness/runner.ts` and `tests/at/harness/runner.selftest.ts` in full before you edit.

## The behavior that must not change (the pin)
- The three manifests are not edited; the three `at:verify --expect` runs match exactly (req-001 integration: 16 green, 21 red).
- `bun run typecheck` clean; `bun run at:selftest` green with the same number of tests as before your change (tests move, none are added or deleted).
- The evidence line the integration run prints is byte-identical in shape to the one in `loop/items/AI4DEV-87/artifacts/units/baseline-integration-after-restart.txt` (project id, api port, reset, migration counts, lock file, head, dirty flag).

## What you create
- `tests/at/harness/local-stack.ts`: the one-stack section of `runner.ts`, moved. Its header is the runner header's paragraph about the one stack and the paranoid sequence (steps 1 to 3 and 5 as unit 1 left them), moved here; the runner header keeps the command-shape paragraph and points here for the stack. Contents, in the runner's current order: the constants `READY_TIMEOUT_MS`, `RESET_TIMEOUT_MS`, `GATE_STALE_MINUTES`, `DISABLED_SERVICES`, `SUPABASE_ENTRY`; `LocalConfig` and `readLocalConfig`; the lock (`StackLock`, `lockDir`, `processIsAlive`, `stackLockPath`, `Holder`, `holderIsLive`, `heldByAnotherRun`, `clearStrandedGate`, `acquireStackLock`); `StackStatus`, `supabaseArgs`, `CliTarget`, `CliInvocation`, `supabaseInvocation`, `CliResult`, `runSupabaseCli`, `statusJsonSpan`, `parseStackStatus`, `decodeJwtClaims`, `localStackProblems`; `databaseAnswers`, `gatewayAnswers`, `waitForReady`; `MigrationProof`, `expectedMigrations`, `appliedMigrations`, `migrationSetProblems`, `proveMigrationsReplayed`; `resetLocalDatabase`; `containerNames`, `StackIdentityRead`, `mintProvenRead`, `identityVerdict`, `proveTarget`, `lifetimePinProblem`, `configDriftProblems`, `PreparedStack`, `prepareLocalStack`, `childCoordinates`, `treeState`, `evidenceLine`. If any of these needs `redact`, `diagnostic`, `childEnv`, or `bunExecutable`, move that helper here too and have the runner import it back; the rule is that `local-stack.ts` imports nothing from `runner.ts`. It imports `INSTALL_ROOT` and `REPO_ROOT` from `./check.ts` and `AT_CONFIG` from `./atconfig.ts`.
- `tests/at/harness/local-stack.selftest.ts`: the describe blocks of `runner.selftest.ts` that drive the moved functions, moved unchanged: the stack must prove it is local; the container names are the identity instrument; the identity verdict; a proof is sealed; the config at the second read; the lifetime pin (both describes); the live adapter's exact lifetime check; what reaches the child and what the evidence line claims; nothing key-shaped is printed (if `redact` moved); the dead-holder lock takeover; the migration set. The imports follow the functions.

## What you edit
- `tests/at/harness/runner.ts`: keeps `parseArgs`, `Args`, `USAGE`, `TIERS`, the vitest report types, `AssertionResult`, `IdRow`, `RuntimeRegistration`, `ReportAnalysis`, `assertionId`, `analyzeReportedTests`, `runtimeRegistrations`, `ProcessOutcome`, `runVerdict`, `cleanupRun`, `firstLine`, `main`, and the helpers that stay; imports the six names `main` uses from `./local-stack.ts` (`readLocalConfig`, `lifetimePinProblem`, `acquireStackLock`, `prepareLocalStack`, `childCoordinates`, `evidenceLine`) plus the types `LocalConfig`, `CliTarget`, `StackLock`. The integration branch of `main` does not change.
- `tests/at/harness/runner.selftest.ts`: keeps the describe blocks that drive the runner (the child environment allowlist, the non-zero test process, the integration tier only from the real checkout, the lock released when the report directory cannot be removed) and any that drive helpers that stayed.
- `tests/at/README.md` and `loop/parked/v1/README.md`: where they name `runner.ts` as the home of the identity read or the lock, name `local-stack.ts`. Two or three sentences, no new sections.

Nothing else. Not `tests/at/expected/`, not `index.ts`, not `registry.ts`, not any suite file, not the drive skill.

## Order of work
1. Create `local-stack.selftest.ts` by moving the describe blocks and pointing their imports at `./local-stack.ts`; run `bun run at:selftest` and watch the file fail on the missing module.
2. Create `local-stack.ts` by moving the section; edit the runner's imports; `bun run typecheck` clean; `bun run at:selftest` green with the same test count.
3. Both loop `--expect` match; `bun run at:verify req-001 --tier integration --expect` matches (16 green, 21 red) and prints the evidence line in the same shape. If the lock is held, wait two minutes and try once more.
4. The README sentences. Commit as ONE commit with `git commit -F <file>`. First line exactly: `AI4DEV-87: the stack lifecycle moves out of runner.ts into local-stack.ts`. Body: what moved, what the runner keeps, the no-cycle rule, and the line counts of both files after. Trailers `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01SikdZcn3PmB9SrZ4dL1ziT`. Do not push. Do not stage anything under `loop/items/AI4DEV-87/artifacts/`.

## STOP rule
If a function cannot move without changing its body, stop and report which one and why. Do not widen the touch list. Do not edit a manifest.

## Report
Write `loop/items/AI4DEV-87/artifacts/units/unit-3-report.md`: the commit SHA; the two line counts; the list of moved functions and moved describe blocks; the pasted last 15 lines of typecheck, at:selftest, and the three at:verify runs (redact JWT-shaped strings); every deviation and why. Then reply with exactly five lines: the commit SHA; the selftest count; the three at:verify results; deviations (a number, and "none" when zero); the report path.
