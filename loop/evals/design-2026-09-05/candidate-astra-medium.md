## Problem

The integration runner currently delegates to a pool that explicitly forbids the database this task requires: project `poancmeitlmxejofwzuu`, API 44321, database 44322, and mail 44324. Replace that delegation with one module, `tests/at/harness/local-stack.ts`, that prepares the repository-configured stack completely before returning. Preserve the existing CLI environment wall, local-coordinate validation, proof-required reset, migration comparison, and attestation round trip. Every integration run intentionally resets the founder’s local database.

## Usage (caller’s view)

Start the stack with `bun run db:start`, then run:

```sh
bun run at:verify req-001 --tier integration --expect
```

The runner imports one function. It receives only what it needs to launch and account for the child:

```ts
// runner.ts — replaces the pool import
import { prepareLocalStack } from './local-stack.ts';

// Inside main's existing try/finally, after bijection and manifest validation:
if (tier === 'integration') {
  try {
    const prepared = await prepareLocalStack(`req-${requirement}`);
    lock = prepared.lock; // Transfer ownership before anything else can throw.
    Object.assign(stackEnv, prepared.env);
    console.log(prepared.evidence);
  } catch (err) {
    return infra(
      `the local integration stack could not be prepared: ` +
      `${(err as Error).message}\n${stackHelp}`,
    );
  }
}
```

The existing child launch consumes the environment without understanding preparation:

```ts
// Existing spawnSync options; the pinned bun --no-env-file launch stays.
{
  cwd: REPO_ROOT,
  env: childEnv({
    ...stackEnv,
    ...rootOverride,
    AT_TIER: tier,
    AT_REGISTRATION_DIR: registrationDir,
  }),
}

// Existing finally owns the returned lock through cleanupRun(reportDir, lock).
```

A selftest calls the same preparation entry point, with external operations mocked:

```ts
const prepared = await prepareLocalStack('req-001');
try {
  expect(prepared.env.AT_SUPABASE_URL).toBe('http://127.0.0.1:44321');
  expect(prepared.evidence).toContain('reset OK');
  expect(lockReleased()).toBe(false);
} finally {
  prepared.lock.release();
}
```

No caller selects a target, obtains an identity proof, supplies a nonce, or assembles stack evidence.

## Shape

Data structures first; only `prepareLocalStack` is exported by the new module:

```ts
// local-stack.ts — type sketch, not implementation
import type {
  CliTarget,
  LocalConfig,
  StackLock,
  StackStatus,
} from './runner.ts';
import type { ProvenSlotRead } from './attestation.ts';

type LocalStackEnv = Readonly<Record<
  | 'AT_SUPABASE_URL'
  | 'AT_SUPABASE_DB_URL'
  | 'AT_SUPABASE_ANON_KEY'
  | 'AT_SUPABASE_SERVICE_ROLE_KEY'
  | 'AT_SLOT_ATTESTATION'
  | 'AT_SUPABASE_MAIL_URL',
  string
>>;

interface PreparedLocalStack {
  readonly env: LocalStackEnv;
  readonly evidence: string;
  readonly lock: StackLock;
}

// Private refinement of the existing attestation contract.
// A successful read has a proven project and usable coordinates.
interface ProvenLocalRead extends ProvenSlotRead {
  readonly provenProjectId: string;
  readonly status: StackStatus & { mailUrl: string };
}

export async function prepareLocalStack(
  requirement: string,
): Promise<PreparedLocalStack> {
  throw new Error('not implemented');
}

// Private: performs the CLI read, coordinate validation, and Docker confirmation.
function readLocalStack(
  target: CliTarget,
  config: LocalConfig,
): ProvenLocalRead {
  throw new Error('not implemented');
}
```

The retained reset primitive has exactly one signature:

```ts
// runner.ts — existing implementation retained behind this required signature
export async function resetLocalDatabase(
  target: CliTarget,
  proof: SlotIdentityProof,
): Promise<void> {
  throw new Error('not implemented');
}
```

The module reads `readLocalConfig(REPO_ROOT)` and constructs the target from that same configuration:

```ts
const target: CliTarget = {
  workdir: REPO_ROOT,
  projectId: config.projectId,
};
```

The tracked configuration remains the identity authority; no second project-id or port constant is introduced. Today it names the required project and 44321 block. Observed identity must independently agree with it.

Preparation owns this sequence:

1. Read configuration and the Git commit/dirty-state snapshot for `REPO_ROOT`.
2. Acquire the machine-wide stack lock with `takeover: 'dead-pid-only'`.
3. Read and prove the stack; wait for readiness.
4. Repeat the identity read immediately before reset, including Docker confirmation.
5. Call `resetLocalDatabase(target, read)`; wait for readiness afterward.
6. Prove exact migration-version equality against `REPO_ROOT`.
7. Mint a fresh nonce and call the unchanged `writeAttestation(target, read, nonce)`.
8. Assemble the six environment values and evidence line; transfer the lock to the caller.

The refreshed read in step 4 supplies the coordinates used afterward. Missing Mailpit coordinates refuse preparation: this one stack must emit all six values, and the current live ledger constructs mail unconditionally. The general-purpose `localStackProblems` function keeps its existing optional-mail semantics.

Preparation releases its lock on every rejection. During preparation, temporary signal handlers record interruption; they prevent subsequent phases and release only after the in-flight operation settles. In particular, they never unlock while reset is still running. Move the runner’s existing exit-on-signal listener installation until after preparation and lock transfer. Preparation interruption follows the infrastructure-failure path; afterward the runner retains its existing signal cleanup.

**Interface depth:** one requirement string enters; environment, evidence, and one resource obligation leave. Target selection, proof production, operation ordering, nonce handling, and formatting remain private, per **information-hiding**. The lock remains exposed because its lifetime includes the child and grading, per **resource-ownership**. Required proof parameters preserve compiler checks, with runtime project equality enforcing the value relationship, per **boundary-discipline**. These existing structural proofs are not claimed to be unforgeable.

Module map:

| Module | Responsibility |
|---|---|
| `local-stack.ts` | One-stack policy and the entire preparation transaction |
| `runner.ts` | CLI dispatch, child execution, grading, cleanup, and existing target-neutral primitives |
| `attestation.ts` | Existing nonce write and child read-back |
| `index.ts`, `live-email.ts`, `clock.ts`, `capabilities.ts` | Existing attested live-capability construction |
| `atconfig.ts` and session consumers | Shared test lifetime |
| `loop/parked/v1/tests/at/harness/db-pool*` | Inactive historical pool |

There is a narrow `runner.ts` ↔ `local-stack.ts` import cycle because the requested architecture keeps primitives in the runner. Neither module may call the other during module initialization; the new module exports a function declaration and imports reusable primitives. Keep the existing `import.meta.main` guard and test imports under both Bun and Vitest. Introducing a primitive module merely to remove this cycle would exceed the one-new-module constraint.

## Synthesis decision

This is the candidate for the requested single-module direction. No cross-candidate synthesis has been performed. The arena should record its selected base, adaptations, and rejections here after comparing candidates.

## Tradeoffs accepted

- We accept destructive reuse of the founder’s database in exchange for one standing integration stack.
- We accept two-minute local access tokens in exchange for bounded expiry tests; automatic client refresh remains available.
- We accept the narrow import cycle in exchange for retaining existing primitives without adding another module or dependency-injection interface.
- We accept interruption waiting for an in-flight preparation operation in exchange for never releasing the lock underneath a reset.
- We accept a CLI-output dependency in exchange for positive project evidence; missing evidence fails closed.
- We accept that ordinary database commands and application drives do not honor this lock in exchange for keeping their coordination outside this change.

## Alternatives considered

- **Runner orchestrates exported identity, reset, environment, and evidence helpers.** It hides individual operations but exposes their ordering, proof association, nonce lifetime, and failure cleanup to the caller. Its interface is shallower than one complete preparation operation.
- **Everything lives in a new runner section.** It avoids the import cycle and can present one preparation function, but leaves one-stack policy accessible inside the grading module. The separate module gives that policy a clear boundary.
- **A callback or disposable-session abstraction owns the child too.** It hides lock release but must expose child execution callbacks or absorb runner concerns. Three result fields preserve the existing cleanup owner with less interface machinery.

## Open questions and risks

- Does the running pinned CLI emit the expected project-suffixed container names for this stack, including its disabled services?
- Will operators avoid database commands and application drives while integration holds the lock, pending shared coordination?
- Can implementation verification record the required stack restart and demonstrate both session tests against the restarted Auth service?
- Will the evidence run use an unchanged checkout throughout preparation and grading, given that commit plus dirty state identifies a snapshot but does not preserve uncommitted contents?

## Next implementation step

Build the public preparation function against selftests that supply real-format CLI/Docker answers and prove identity refusals prevent reset and release the lock.

## Explicit answers

### 1. Identity read and its exact signature

The private function is:

```ts
function readLocalStack(
  target: CliTarget,
  config: LocalConfig,
): ProvenLocalRead;
```

It calls `runSupabaseCli(target, ['status', '-o', 'json'])`, preserving `supabaseInvocation`, matching `cwd` and `--workdir`, positive `SUPABASE_PROJECT_ID`, and the stripped environment.

From the combined stdout and stderr, adapt the pool’s container-token extraction:

```ts
/\bsupabase_[A-Za-z0-9][A-Za-z0-9_.-]*/g
```

Require at least one token ending in `_${target.projectId}` and refuse any Supabase container token without that suffix. Parse the same CLI result once through `parseStackStatus`; apply every existing `localStackProblems` check: loopback, configured API/database/mail ports, local issuer, expected key roles, and no hosted reference.

Then run Docker through `childEnv()`:

```sh
docker ps --filter name=supabase_db_<projectId> --format "{{.Names}}"
```

Require the exact `supabase_db_<projectId>` name and reject unexpected filtered names. A Docker failure or missing container refuses; Docker evidence cannot substitute for absent CLI project evidence.

Return `{ provenProjectId: target.projectId, status }` only after all checks pass. It structurally satisfies both `SlotIdentityProof` and `ProvenSlotRead`. Failures name checks and use existing diagnostic redaction; raw status and credentials never enter evidence.

### 2. Proof-required reset

Delete the no-argument overload and optional implementation parameters. Keep the required `(target, proof)` signature, runtime proof equality check, CLI seam, timeout, and process-tree termination behavior.

There is one reset call inside `prepareLocalStack`, immediately after the refreshed identity read. Neither the runner branch nor an environment emitter can initiate another reset.

Add compile-time assertions that calls without a target or without a proof are rejected. Preserve runtime tests for wrong-project and null proofs.

### 3. Lock and evidence

Use:

```ts
acquireStackLock(config, requirement, { takeover: 'dead-pid-only' });
```

For the current configuration, the filename is:

```text
at-verify-poancmeitlmxejofwzuu-44321.lock
```

Keep dead-holder takeover, refusal of arbitrarily old live holders, and refusal of unreadable/unidentifiable holders.

The evidence format is:

```text
at:verify — local stack poancmeitlmxejofwzuu, api 44321 — reset OK — migrations: <E> expected, <A> applied — lock <absolute-path> — commit <full-sha>, dirty <yes|no>
```

The API port comes from validated status; counts come from migration proof. Resolve Git evidence in `REPO_ROOT`, including untracked files in dirty detection, and fail before reset if it cannot be read. Evidence describes successful preparation; the later runner verdict establishes whether `--expect` matched.

### 4. Child environment

Construct this private object only after the attestation write succeeds:

```ts
{
  AT_SUPABASE_URL: read.status.apiUrl,
  AT_SUPABASE_DB_URL: read.status.dbUrl,
  AT_SUPABASE_ANON_KEY: read.status.anonKey,
  AT_SUPABASE_SERVICE_ROLE_KEY: read.status.serviceRoleKey,
  AT_SLOT_ATTESTATION: nonce,
  AT_SUPABASE_MAIL_URL: read.status.mailUrl,
}
```

No values come from ambient stack variables or reconstructed URLs. There is no personal-port refusal: positive configuration and observed-identity checks authorize the intended local stack.

The runner still applies `childEnv` and launches Bun with `--no-env-file`. Keep `AT_SLOT_ATTESTATION`, the `'slot'` brand, `attestSlot`, and `at_runtime.slot_attestation` unchanged.

### 5. Session lifetime

Set `[auth] jwt_expiry = 120` in `supabase/config.toml`.

Add this entry to `AT_CONFIG`:

```ts
localAccessTokenTtlSeconds: {
  name: 'local Supabase access-token lifetime',
  value: 120,
  unit: 'seconds',
  source: 'AI4DEV-86 session-lifetime ruling; supabase/config.toml [auth].jwt_expiry',
},
```

Both requested files read it directly:

```ts
// req-001/_fixture.ts
import { AT_CONFIG } from '../../harness/atconfig.ts';

const ACCESS_TOKEN_TTL_MS =
  AT_CONFIG.localAccessTokenTtlSeconds.value * 1000;
```

```ts
// req-001/_integration.ts
import { AT_CONFIG } from '../../harness/atconfig.ts';

const ACCESS_TOKEN_TTL_MS =
  AT_CONFIG.localAccessTokenTtlSeconds.value * 1000;

// AT-001.12:
await wait(ACCESS_TOKEN_TTL_MS + 15_000);

// AT-001.13:
const deadline = Date.now() + ACCESS_TOKEN_TTL_MS + 30_000;
```

Keep the 240,000 ms integration budget. In `b-verification-and-sessions.test.ts`, derive the same lifetime from the registry: replace `3600 * 1000` with the lifetime and `3599 * 1000` with lifetime minus 1,000 ms. Keep the subsequent 2,000 ms advance, preserving the exact-expiry and refresh-boundary assertions.

`config.ts` needs no change: this standing stack setting is not a per-world override. TOML necessarily contains its own literal; add a section-scoped selftest comparing `[auth].jwt_expiry` with the registry value so the two cannot silently diverge.

Implementation verification must run `bun run db:stop` followed by `bun run db:start` after the pin. Database reset alone does not apply Auth configuration.

### 6. Runner changes

Replace the line-44 pool import with `prepareLocalStack`; remove the pool-cycle explanation and all occupancy/result types. Replace the integration branch with the usage above, including removal of the `AT_DB_SLOT` read.

Rewrite the header to describe lock → prove → reset → migration proof → attestation → allowlisted child, explicitly naming the destructive use of the repository stack.

Replace `stackHelp` with:

```text
Check that Docker is running and its CLI is on PATH.
Start the repository's local stack with `bun run db:start`.
Integration resets that stack from supabase/migrations on every run.
After changing Auth configuration, restart with `bun run db:stop` then `bun run db:start`.
```

Keep drill as exit 3:

```text
the drill tier has no configured execution path and resolves no database
```

Retain grading, manifests, preflight ordering, child launch, and final cleanup. Adjust signal-listener installation as described in Shape.

Also remove obsolete pool environment instructions from `.claude/settings.json`, the controller template, verify skill, cloud readme, and cloud setup script. Replace pool setup instructions with `bun run db:start`; remove obsolete pool-variable guidance alongside `AT_DB_SLOT`.

### 7. Selftests and verification

In `runner.selftest.ts`:

- Retarget reset-proof examples to the one-stack project; retain wrong-project/null refusals and add compile-time missing-argument checks.
- Exercise preparation with real parsers/validators and mocked external answers: correct identity succeeds; no own names, mixed projects, suffix lookalikes, stopped required services, malformed status, hosted coordinates/keys, wrong ports, missing mail, and absent Docker confirmation refuse before reset.
- Verify a second identity read occurs after initial readiness; a changed answer prevents reset.
- Verify order, fresh nonce emission, all six environment names, evidence fields, and lock ownership transfer.
- Inject failure at each awaited preparation phase; assert no downstream operation runs and the lock is released. Test interruption during reset without early unlock.
- Retain or transplant dead-pid-only lock cases, including old live holders, unreadable claims, and competing takeover.
- Preserve environment/redaction/migration tests; add targeted CLI-wall coverage and TOML/registry equality.

Mock imported external operations in tests; add no public test hooks or configurable preparation options.

In `live-ledger.selftest.ts`, retain existing provenance and refusal coverage. Change representative coordinates to 44322/44324 and the write target to the configured project. Add a successful mocked-SQL write/read-back case using the emitted coordinates and nonce, then show that stale or different nonce answers still refuse. This proves contract compatibility, not a real database run.

Parking `db-pool.selftest.ts` removes **668 lines and 33 test declarations**, reducing selftest files from **13 to 12** before any separate judge parking. New cases remain in existing files; their count offsets part of the removed test count.

Implementation validation:

```sh
bun run typecheck
bun run at:selftest
bun run at:check req-001
bun run at:check req-016
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-016 --tier loop --expect
bun run at:verify req-001 --tier integration --expect
```

The final command must match the unchanged **16 integration greens and 21 declared reds**. Record its timestamp, evidence line, verdict, and preceding restart in the PR. CI alone cannot witness the live repoint.

### 8. Parked layout

Move these files unchanged:

```text
loop/parked/v1/tests/at/harness/db-pool.ts
loop/parked/v1/tests/at/harness/db-pool.selftest.ts
```

Add `loop/parked/v1/README.md`: these are historical dead text, not compiled or maintained as runnable replacements. Do not repair their relative imports or import them from active code. Verify no active import reaches the parked tree; no tsconfig exclusions are needed.

Nothing else under `tests/at` moves for this one-stack unit. Attestation and live-email remain active.

The separate, last-in-sequence semantic-judge parking ruling covers `oracles.ts`, `oracles.selftest.ts`, `record-oracles.ts`, `rubrics/`, and `recordings/`, with its own consumer/type cleanup. It is not a dependency of this design or included in its estimate. The req-016 multiset helpers and their selftest stay.

### 9. Diff estimate

Approximate implementation size; moves are counted separately from rewritten lines.

| Files | Added | Removed | Moved unchanged |
|---|---:|---:|---:|
| New `local-stack.ts` | 210–250 | — | — |
| `runner.ts` | 30–45 | 70–95 | — |
| `runner.selftest.ts` | 220–280 | 5–15 | — |
| `live-ledger.selftest.ts` | 25–45 | 5–15 | — |
| `atconfig.ts`, `supabase/config.toml` | 10–15 | 5–12 | — |
| Three req-001 session files | 15–25 | 25–45 | — |
| `attestation.ts` stale explanatory comments | 5–10 | 10–20 | — |
| Five settings/setup/instruction files | 15–30 | 35–65 | — |
| Parked README | 8–12 | — | — |
| Pool and pool selftest | — | — | 2,495 |
| **Total** | **538–712** | **155–267** | **2,495** |

That is **16 added/modified files plus two moves**, with one new runtime module and one exported function. No repository files were changed and no tests were run for this design-only package.