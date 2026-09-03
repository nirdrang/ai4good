# Unit 3 report

Commit: `314120680babe05b8a98a0c745b19dcfee77465c`

## Line counts after

- `tests/at/harness/local-stack.ts`: 1268
- `tests/at/harness/runner.ts`: 530

## Moved functions

From `runner.ts` into `local-stack.ts`, names and bodies unchanged:

- constants: `READY_TIMEOUT_MS`, `RESET_TIMEOUT_MS`, `GATE_STALE_MINUTES`, `DISABLED_SERVICES`, `SUPABASE_ENTRY`
- helpers the lifecycle needs: `ENV_ALLOWLIST`, `childEnv`, `bunExecutable`, `redact`, `diagnostic`
- `LocalConfig`, `readLocalConfig`
- lock: `StackLock`, `lockDir`, `processIsAlive`, `stackLockPath`, `Holder`, `holderIsLive`, `heldByAnotherRun`, `clearStrandedGate`, `acquireStackLock`
- `StackStatus`, `supabaseArgs`, `CliTarget`, `CliInvocation`, `supabaseInvocation`, `CliResult`, `runSupabaseCli`, `statusJsonSpan`, `parseStackStatus`, `decodeJwtClaims`, `localStackProblems`
- `databaseAnswers`, `gatewayAnswers`, `waitForReady`
- `MigrationProof`, `expectedMigrations`, `appliedMigrations`, `migrationSetProblems`, `proveMigrationsReplayed`
- `resetLocalDatabase`
- `containerNames`, `StackIdentityRead`, `mintProvenRead`, `identityVerdict`, `proveTarget`, `lifetimePinProblem`, `configDriftProblems`, `PreparedStack`, `prepareLocalStack`, `childCoordinates`, `treeState`, `evidenceLine`

`local-stack.ts` imports `INSTALL_ROOT` and `REPO_ROOT` from `./check.ts` and `AT_CONFIG` from `./atconfig.ts`. It imports nothing from `runner.ts`.

## Moved describe blocks

From `runner.selftest.ts` into `local-stack.selftest.ts`:

- the stack must prove it is local before anything destructive happens
- the container names in CLI output are the identity instrument
- the identity verdict proves the target from the CLI's own container names
- a proof is sealed: the brand does not travel through a spread, and the read cannot be re-aimed
- the config the lock and the first proof were judged against must still be the file at the second read
- the access-token lifetime is pinned once: config.toml and the registry must agree
- the live adapter holds the running stack to the pinned lifetime EXACTLY
- what reaches the child, and what the evidence line claims
- the lifetime pin is a preflight: decidable from two files on disk, so it refuses before the lock
- nothing key-shaped is ever printed
- taking over a dead holder's lock is atomic — one owner, never two — and a live holder is never displaced
- the rebuild is proven against the migration set, and an empty set is visible

`runner.selftest.ts` keeps: the child environment allowlist; a non-zero test process; the integration tier only from the real checkout; the lock released when the report directory cannot be removed.

## Pin command tails

### `bun run typecheck`

```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

typecheck OK: both configs clean
```

### `bun run at:selftest`

```
 Test Files  11 passed (11)
      Tests  170 passed (170)
   Start at  00:55:13
   Duration  8.50s (transform 1.08s, setup 0ms, import 1.78s, tests 16.81s, environment 1ms)
```

Same test count as before the change (170). One extra file (`local-stack.selftest.ts`).

Step 1 (selftest file present, module absent) failed as required:

```
 FAIL  harness/local-stack.selftest.ts [ harness/local-stack.selftest.ts ]
Error: Cannot find module './local-stack.ts' imported from C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-87/tests/at/harness/local-stack.selftest.ts
 Test Files  1 failed | 10 passed (11)
      Tests  141 passed (141)
```

### `bun run at:verify req-001 --tier loop --expect`

```
  AT-001.25    red      AtPending: AT-001.25 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.26    red      AtPending: AT-001.26 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.27    red      AtPending: AT-001.27 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.28    red      AtPending: AT-001.28 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.35    red      AtPending: AT-001.35 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 21 green, 16 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-001.json exactly (21 declared green, 16 declared red)
```

### `bun run at:verify req-016 --tier loop --expect`

```
  AT-016.01    red      CapabilityPending: CAPABILITY PENDING — H3 static provider scan
  AT-016.02    green    registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event
  AT-016.03    green    every taxonomy row delivers to exactly its recipients on exactly its channels, with the named payloads
  AT-016.04    green    sensitive negatives: no candidacy to the NGO, no vetting outcome to the volunteer, no donation event
  AT-016.05    green    every critical class goes out by email; the low-tone event is in-app only
  AT-016.06    green    a documented delivery default exists for every taxonomy row
  AT-016.07    green    one logical event per committed event, one delivery per recipient-channel pair, across a restart
  AT-016.08    green    a comment burst delivers the count the pinned anti-spam configuration prescribes, on two different configurations
  AT-016.09    green    every guarded transition writes its notification event atomically under an induced fault
  AT-016.10    green    recipients resolve at event creation: the old holder receives, the new holder is excluded
  AT-016.11    green    sent only on provider acceptance; unconfirmed sends retry; a lost ack mints no duplicate
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 11 green, 1 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```

### `bun run at:verify req-001 --tier integration --expect`

```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 5 migrations expected, 5 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head 9df3166, dirty
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 16 green, 21 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-001.json exactly (16 declared green, 21 declared red)
```

Evidence line shape matches the baseline (project id, api port, reset, migration counts, lock file, head, dirty flag). Head hash differs because the tree moved on; dirty is expected (untracked item artifacts).

No JWT-shaped string appeared in these tails.

## Deviations

1. `runner.ts` re-exports `bunExecutable` and `childEnv` after importing them from `local-stack.ts`. The brief said import them back; it did not say re-export. `runner-blackbox.selftest.ts` and `runner-expect.selftest.ts` are not on the touch list and import those two names from `./runner.ts`, so the re-export is what keeps those files compiling.

2. The two-contender lock race's in-child dynamic import path is now `./local-stack.ts` instead of `./runner.ts`. The describe body is otherwise unchanged. The brief said the imports follow the functions.

No function body had to change for the move. Manifests were not edited.
