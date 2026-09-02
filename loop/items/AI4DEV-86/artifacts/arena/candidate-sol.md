# Design package: one-stack integration path

## Problem

The integration runner currently reaches a database only through `db-pool.ts`, whose defining invariant forbids the repository’s own stack. AI4DEV-86 deliberately reverses that policy: `req-001` integration verification must reset and grade the single local stack—project `poancmeitlmxejofwzuu`, API 44321, database 44322, Mailpit 44324—without reservations, slot selection, mirroring, or personal-port refusals. The design must preserve the safeguards that remain valid: a machine-wide lock, positive container identity, loopback and configured-port validation, the Supabase environment wall, proof-required destructive calls, exact migration proof, and the post-reset attestation round trip. The non-obvious constraint is ownership: the runner should retain target-neutral primitives while one new module owns the entire target-specific lifecycle behind one call.

## Usage (caller's view)

The operator starts the tracked stack and runs the exact declared-verdict command:

```text
bun run db:start
bun run at:verify req-001 --tier integration --expect
```

Every integration run resets the database on 44322. Existing local data is intentionally destroyed.

The runner has one production call to the new module:

```ts
import { prepareLocalStack } from './local-stack.ts';

const stackEnv: Record<string, string> = {};
let lock: StackLock | null = null;

if (tier === 'integration') {
  try {
    const prepared = await prepareLocalStack(`req-${requirement}`);

    // Assign immediately: the existing finally/signal cleanup now owns the returned lock.
    lock = prepared.lock;
    console.log(prepared.evidence);
    Object.assign(stackEnv, prepared.env);
  } catch (err) {
    return infra(
      `the local integration stack could not be prepared: ${(err as Error).message}\n` +
        `Every integration run resets the repository's local database; when its identity, reset, ` +
        `or migration state cannot be proved, no tests run.\n${stackHelp}`,
    );
  }
}
```

The runner then uses its existing target-neutral child-environment wall:

```ts
const run = spawnSync(bunExecutable(), args, {
  env: childEnv({
    ...stackEnv,
    ...(process.env.AT_REPO_ROOT ? { AT_REPO_ROOT: process.env.AT_REPO_ROOT } : {}),
    AT_TIER: tier,
    AT_REGISTRATION_DIR: registrationDir,
  }),
});
```

The returned lock remains in the existing process-lifetime cleanup:

```ts
finally {
  process.off('SIGINT', onSignal);
  process.off('SIGTERM', onSignal);
  cleanupRun(reportDir, lock);
}
```

There is intentionally no second production caller, no slot selector, and no preparatory object the runner must drive step by step.

## Shape

Data structures come first. These types are private to `tests/at/harness/local-stack.ts`; the module has one named export.

```ts
import type { ProvenSlotRead } from './attestation.ts';
import type {
  CliTarget,
  LocalConfig,
  MigrationProof,
  StackLock,
  StackStatus,
} from './runner.ts';

const ONE_STACK = {
  projectId: 'poancmeitlmxejofwzuu',
  apiPort: 44321,
  dbPort: 44322,
  mailPort: 44324,
} as const;

type ProvenLocalStackRead = ProvenSlotRead & {
  readonly status: StackStatus;
  readonly provenProjectId: typeof ONE_STACK.projectId;
};

type LocalStackChildEnv = Readonly<{
  AT_SUPABASE_URL: string;
  AT_SUPABASE_DB_URL: string;
  AT_SUPABASE_ANON_KEY: string;
  AT_SUPABASE_SERVICE_ROLE_KEY: string;
  AT_SLOT_ATTESTATION: string;
  AT_SUPABASE_MAIL_URL: string;
}>;

type PreparedLocalStack = Readonly<{
  env: LocalStackChildEnv;
  evidence: string;
  lock: StackLock;
}>;
```

The module’s exact signatures are:

```ts
function localStackTarget(config: LocalConfig): CliTarget {
  throw new Error('not implemented');
}

function readLocalStackIdentity(
  target: CliTarget,
  config: LocalConfig,
): ProvenLocalStackRead {
  throw new Error('not implemented');
}

function proveLocalDatabaseContainer(target: CliTarget): void {
  throw new Error('not implemented');
}

function localStackChildEnv(
  read: ProvenLocalStackRead,
  attestation: string,
): LocalStackChildEnv {
  throw new Error('not implemented');
}

function localStackEvidence(
  target: CliTarget,
  read: ProvenLocalStackRead,
  migrations: MigrationProof,
  lock: StackLock,
): string {
  throw new Error('not implemented');
}

export async function prepareLocalStack(
  requirement: string,
): Promise<PreparedLocalStack> {
  throw new Error('not implemented');
}
```

`localStackTarget` reads `supabase/config.toml` through `readLocalConfig(REPO_ROOT)` and requires it to equal the positively authorized `ONE_STACK` identity. The constants are an authorization allowlist, not an alternative coordinate emitter: disagreement with the tracked configuration fails closed.

The target-neutral container classifiers move from the parked pool into `runner.ts`:

```ts
export function foreignContainerNames(
  text: string,
  targetProjectId: string,
): string[] {
  throw new Error('not implemented');
}

export function ownContainerNames(
  text: string,
  targetProjectId: string,
): string[] {
  throw new Error('not implemented');
}
```

`readLocalStackIdentity` then:

1. Calls `runSupabaseCli(target, ['status', '-o', 'json'])`. This necessarily passes through `supabaseInvocation(target)`, which sets `SUPABASE_PROJECT_ID` positively and strips every other `SUPABASE_*` value.
2. Refuses every Supabase container name not ending in the target project id.
3. Requires at least one container name belonging to `poancmeitlmxejofwzuu`; absence is not proof.
4. Parses that same CLI result rather than issuing an unrelated status read.
5. Runs `localStackProblems(status, config)`, retaining loopback, API/database/Mailpit ports, local issuer and role checks, and the hosted `ref` refusal.
6. Requires Docker to report the exact running database container `supabase_db_poancmeitlmxejofwzuu`.
7. Returns a non-null `ProvenLocalStackRead`. A stopped or unproved stack throws instead of creating a nullable state the caller must interpret.

The preparation sequence is:

1. Read and positively validate the one tracked configuration.
2. Acquire `acquireStackLock(config, requirement, { takeover: 'dead-pid-only' })`.
3. Read and prove identity, then wait for readiness.
4. Repeat the same identity read immediately before destruction so a long readiness wait cannot separate the proof from the act.
5. Call only `resetLocalDatabase(target, proof)`.
6. Wait for readiness and call `proveMigrationsReplayed(status, REPO_ROOT)`.
7. Mint the nonce and call `writeAttestation(target, proof, nonce)`.
8. Build the exact six-key environment and the evidence line.
9. Return `{ env, evidence, lock }`.

If anything after acquisition fails, the module releases the lock before rethrowing. While preparation is in progress, it temporarily prepends signal listeners that release its not-yet-returned lock before the runner’s existing signal handler exits; those listeners are removed immediately before a successful return. This closes the otherwise real interval in which the runner’s `lock` variable is still null.

The reset becomes unconditionally proof-required:

```ts
export interface TargetIdentityProof {
  readonly provenProjectId: string | null;
}

export async function resetLocalDatabase(
  target: CliTarget,
  proof: TargetIdentityProof,
): Promise<void> {
  throw new Error('not implemented');
}
```

Both no-target overload declarations and the optional-argument implementation disappear. The stronger `ProvenLocalStackRead` satisfies this reset signature and the unchanged `ProvenSlotRead` attestation signature structurally, per proof-travels-with-the-act.

The child emitter has no personal-port blacklist and no `extra` argument. It can emit only the six required names. It requires `status.mailUrl`; missing Mailpit is therefore an infrastructure refusal before Vitest starts. The URLs have already passed `localStackProblems`, per boundary discipline.

The evidence has this exact shape:

```text
at:verify — local stack poancmeitlmxejofwzuu, api 44321 — reset OK — migrations: 5 expected, 5 applied — lock: C:\...\at-verify-poancmeitlmxejofwzuu-44321.lock
```

The API port comes from the proven status response, not a guessed value. The project id is the authorized target. The lock path comes from the acquired lock.

The module map is deliberately small:

```text
runner.ts ── one call ───────────────> local-stack.ts
    ^                                      │
    └── target-neutral primitives ─────────┘
                                           │
                                           └── attestation.ts: mint + write

runner.ts ── childEnv + Vitest ──> index.ts ──> attestSlot read-back
```

This retains one safe import cycle: `runner.ts` imports the one-stack entry, while `local-stack.ts` imports hoisted target-neutral functions from the runner. Neither module performs stack work at module scope. Avoiding that cycle would require a second new primitives module and broad relocation, contrary to the one-module constraint.

Interface depth is high: one scalar input hides configuration agreement, lock ownership, two identity reads, Docker confirmation, readiness, reset, migration comparison, nonce writing, environment construction, evidence formatting, failure cleanup, and pre-return signal cleanup. The caller sees only the three things it genuinely must use after preparation: child environment, printable evidence, and a process-lifetime lock. No phase method, target parameter, slot number, optional policy, status object, nonce, or release wrapper is exposed, per interface-depth discipline.

## Synthesis decision

Use the dedicated one-call `local-stack.ts` module as the base. Adapt the pool’s container-name classification and Docker database confirmation, but place the generic classifiers with the runner’s other target-neutral primitives. Preserve the runner’s CLI wall, local validation, lock implementation, readiness, migration proof, and targeted reset without copying them. Reject occupancy, reservation lookup, tree mirroring, generated configurations, slot arithmetic, personal-stack blacklists, and the pool’s environment/evidence APIs.

## Tradeoffs accepted

- We accept one controlled import cycle in exchange for retaining the one-new-module limit and avoiding relocation of the runner’s target-neutral stack machinery.
- We accept resetting the founder’s local database on every integration run in exchange for removing the pool and still guaranteeing an empty, migrated starting state.
- We accept a strict dependency on the pinned CLI continuing to print disabled-service container names in exchange for positive project identity from the CLI’s own output; a changed output fails closed.
- We accept a Docker read in addition to the CLI read in exchange for an independent confirmation of the exact database container before reset.
- We accept requiring Mailpit for every integration preparation in exchange for returning a complete six-key environment and failing as infrastructure rather than during suite construction.
- We accept two-minute local development access tokens in exchange for making the shipped local configuration, loop model, and bounded real-time integration tests agree.
- We accept that the lock protects cooperating `at:verify` runs only in exchange for keeping this change surgical; Studio, `db:reset`, and manual verification remain external writers.
- We accept that the full preparation orchestration has no injectable unit-test bypass in exchange for ensuring test seams cannot fabricate identity on a destructive path; its components are selftested and the integration command is the end-to-end proof.

## Alternatives considered

- **Inline the lifecycle inside `runner.ts`.** This avoids the import cycle but loses interface depth: the integration branch must see and order identity, Docker, reset, migration, attestation, environment, evidence, and partial-failure cleanup. It hides nothing from the caller and makes target policy part of the command runner.
- **Expose `acquire`, `identify`, `reset`, `attest`, `environment`, and `evidence` functions.** This makes each implementation simpler but exposes every ordering invariant to the runner and recreates the exact “caller can skip the proof” failure the proof-required reset fixed.
- **Extract runner primitives into one module and put policy in another.** This is acyclic and internally clean, but needs two new modules, moves roughly 800 lines of stable machinery, and expands the review surface without improving the caller’s one-call experience.
- **Adapt `db-pool.ts` in place.** Its public concepts are slots, reservations, mirrored trees, generated identities, and refusal of this exact target. It exposes far more complexity than one-stack verification needs and would require reversing rather than preserving its core invariant.

## Open questions and risks

- Should `bun run db:reset` and the manual verification drive be taught to refuse while the same one-stack lock has a live holder in a follow-up?
- Should rollout instructions require one explicit `db:stop` followed by `db:start` after changing `jwt_expiry`, since a database reset does not prove that the already-running Auth container reloaded its configuration?
- Is the fail-closed dependency on disabled imgproxy or pooler names in CLI status output acceptable, or should a future CLI upgrade first add another positive CLI identity field?
- Should the exact Docker database-container check require exactly one matching name, so an unexpected duplicate container is a refusal rather than merely additional evidence?

## Next implementation step

Add the container-classification and `dead-pid-only` lock tests to `runner.selftest.ts`, then remove the reset’s no-target signature before implementing `prepareLocalStack`.

## Explicit answers to the nine design decisions

1. **Identity read.** It is private to `tests/at/harness/local-stack.ts` with signature `readLocalStackIdentity(target: CliTarget, config: LocalConfig): ProvenLocalStackRead`. It uses the targeted CLI seam, own/foreign container-name classifiers, `localStackProblems`, and the exact Docker database container. Its non-null result structurally satisfies unchanged `ProvenSlotRead`.

2. **Only reset.** Delete `resetLocalDatabase()` with no arguments and the optional implementation parameters. The only remaining signature is `resetLocalDatabase(target, proof)`. There are zero production callers to migrate beyond the new module; mismatched and null-proof selftests remain.

3. **Lock and evidence.** Acquire the one-stack lock with `dead-pid-only`; current configuration yields `at-verify-poancmeitlmxejofwzuu-44321.lock`. Evidence names project id, proven API port, reset success, expected/applied migration counts, and `lock.file`, with no slot number.

4. **Child environment.** Emit exactly `AT_SUPABASE_URL`, `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY`, `AT_SLOT_ATTESTATION`, and `AT_SUPABASE_MAIL_URL`. There is no personal-port refusal and no generic `extra` parameter.

5. **Session lifetime.** Change `supabase/config.toml` to `jwt_expiry = 120`. Add this entry:

```ts
supabaseJwtExpirySeconds: {
  name: 'local Supabase access-token lifetime',
  value: 120,
  unit: 'seconds',
  source: 'AI4DEV-86 ruling 3; supabase/config.toml [auth].jwt_expiry',
},
```

The two direct registry reads are:

```ts
// req-001/_fixture.ts
const ACCESS_TOKEN_TTL_MS =
  AT_CONFIG.supabaseJwtExpirySeconds.value * 1000;

// req-001/_integration.ts
export const ACCESS_TOKEN_TTL_MS =
  AT_CONFIG.supabaseJwtExpirySeconds.value * 1000;
```

`b-verification-and-sessions.test.ts` already imports from `_integration.ts`; extend that import with `ACCESS_TOKEN_TTL_MS`, replace `3600 * 1000` with it, and replace `3599 * 1000` with `ACCESS_TOKEN_TTL_MS - 1000`. Thus there are two reads of the registry and no hard-coded lifetime in a body.

6. **Runner changes.** Replace the pool import with `prepareLocalStack`; rewrite the header around one positively identified, destructively reset local stack; replace `stackHelp`’s pool setup command with `bun run db:start`; rewrite the drill refusal to say drill has no authorized database target; replace occupancy/prepare/env/evidence with the one call; remove the `AT_DB_SLOT` read; and retain `childEnv`, CLI, lock, readiness, migration, grading, and final cleanup. Remove `AT_DB_SLOT` and pool setup guidance from settings, controller guidance, the verification skill, cloud README, and cloud setup script.

7. **Selftests.** `runner.selftest.ts` gains five cases: own-name extraction, foreign-name extraction, absence of positive names, refusal to take over an old but live holder under `dead-pid-only`, and refusal to take over an unidentifiable holder. Its two reset-proof tests use `poancmeitlmxejofwzuu` as the target. `live-ledger.selftest.ts` keeps all attestation behavior and names; only fixture labels and proof examples change from numbered slots to the one local stack. Parking `db-pool.selftest.ts` removes one discovered file, 33 pool cases, and 668 physical lines; after the five replacement cases, the pool-only net is 13 to 12 selftest files, 28 fewer cases, and roughly 610 fewer lines.

8. **Parked layout.** Move `db-pool.ts` and `db-pool.selftest.ts` unchanged to `loop/parked/v1/tests/at/harness/`, with the park README stating that they are dead text outside every TypeScript and Vitest configuration. No other `tests/at` file moves as part of this one-stack package. In particular, `attestation.ts`, `live-email.ts`, `index.ts`, `clock.ts`, and `capabilities.ts` remain active; `attestSlot`, the `'slot'` brand, `AT_SLOT_ATTESTATION`, and `at_runtime.slot_attestation` remain unchanged names. The independently ruled semantic-judge park should remain a separate implementation bundle.

9. **Estimated diff.** The estimate covers the one-stack package and its required `AT_DB_SLOT` cleanup, excluding the separate ceremony and semantic-judge bundles.

| Files | Change | Added | Removed |
|---|---|---:|---:|
| `local-stack.ts`, `runner.ts` | New lifecycle façade; primitive classifiers; targeted-only reset; runner branch and prose | ~175 | ~65 |
| `runner.selftest.ts`, `live-ledger.selftest.ts` | Replacement safety coverage and current one-stack fixtures | ~60 | ~15 |
| `atconfig.ts`, `_fixture.ts`, `_integration.ts`, session test | Single token lifetime and all consumers | ~20 | ~35 |
| `index.ts`, `attestation.ts` | Accurate local-stack labels/comments; no API rename | ~8 | ~8 |
| `supabase/config.toml` | Pin `jwt_expiry = 120` | 1 | 1 |
| Pool source and selftest | Two unchanged path moves | 0* | 0* |
| `loop/parked/v1/README.md` | Dead-text and compilation-boundary notice | ~12 | 0 |
| Five settings/guidance files | Remove `AT_DB_SLOT`, pool setup, and pool-only cloud variables | ~10 | ~30 |
| **Estimated total: 19 paths** |  | **~286** | **~154** |

\* Rename-aware diff. Without rename detection, the two moves appear as 2,495 added and 2,495 removed lines.