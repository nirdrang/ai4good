The package below is the in-place repoint: one new identity read in `runner.ts`, no new module, and a counted diff.

# One-stack integration path (repoint in place)

Direction: smallest diff. No new module. The runner's integration branch is the caller.

## Problem

`bun run at:verify req-001 --tier integration --expect` must grade against the one local stack (project `poancmeitlmxejofwzuu`, API 44321), with no slot code on the path. Today that branch only talks to the slot pool. The pool refuses this stack by constant. Parking the pool removes the only producer of a `ProvenSlotRead`, so the attestation write cannot run, so no `real` grant, so the 16 integration greens die.

The non-obvious constraint is polarity, not missing wiring. Four pool guards treat this project as forbidden. The brief makes it the only legal target. No guard is deleted to make it legal. The target is stated positively. A target still costs a proof. The hosted-URL wall (`supabaseInvocation`, `childEnv` allowlist) stays. The attestation round trip stays, including the `'slot'` brand and `AT_SLOT_ATTESTATION`. Manifests are not edited.

Every building block except the positive container-name read already lives in `runner.ts`. The pool is the only production caller of `occupy` / `prepare` / `evidence` / `stackEnv`. Those four calls are the seam.

## Usage (caller's view)

Human command, after `bun run db:start`:

```
bun run at:verify req-001 --tier integration --expect
```

`--expect` is required for exit 0. The manifest declares 21 reds. Without `--expect`, `runVerdict` exits 1 by design. Every run resets this database. The lock file is `%LOCALAPPDATA%\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock` (XDG or temp on other hosts). Auth reads `jwt_expiry` at start. After the pin to 120, restart the stack once.

The caller is `main()` in `runner.ts`. It does not import `db-pool.ts`. It does not call `occupy`, `prepare`, `evidence`, or `stackEnv`. It does not wrap the sequence in a new `prepareOneStack`. The four pool calls become this branch:

```ts
if (tier === 'integration') {
  const config = readLocalConfig(REPO_ROOT);
  const target: CliTarget = { workdir: REPO_ROOT, projectId: config.projectId };
  try {
    lock = acquireStackLock(config, `req-${requirement}`, { takeover: 'dead-pid-only' });
  } catch (err) {
    return infra((err as Error).message);
  }

  let read: ProvenLocalRead;
  let migrations: MigrationProof;
  let attestation: string;
  try {
    read = proveLocalTarget(target, 'reset');
    await waitForReady(read.status, 'before the reset');
    await resetLocalDatabase(target, read);
    await waitForReady(read.status, 'after the reset');
    migrations = await proveMigrationsReplayed(read.status, REPO_ROOT);
    attestation = mintAttestationNonce();
    await writeAttestation(target, read, attestation);
  } catch (err) {
    return infra(
      `the local stack could not be prepared: ${(err as Error).message}\n` +
        `The integration tier rebuilds the local database from supabase/migrations on every run, ` +
        `so that a suite never grades leftover rows or a schema missing a migration; if that ` +
        `rebuild fails, the state under test is unknown and the run stops here.\n${stackHelp}`,
    );
  }

  console.log(
    `at:verify — ${target.projectId}, api ${config.apiPort} — reset OK — ` +
      `migrations: ${migrations.expected} expected, ${migrations.applied} applied — lock ${lock.file}`,
  );
  Object.assign(stackEnv, {
    AT_SUPABASE_URL: read.status.apiUrl,
    AT_SUPABASE_DB_URL: read.status.dbUrl,
    AT_SUPABASE_ANON_KEY: read.status.anonKey,
    AT_SUPABASE_SERVICE_ROLE_KEY: read.status.serviceRoleKey,
    AT_SLOT_ATTESTATION: attestation,
    ...(read.status.mailUrl ? { AT_SUPABASE_MAIL_URL: read.status.mailUrl } : {}),
  });
}
```

The vitest spawn is unchanged. It still passes that record through `childEnv({ ...stackEnv, ...rootOverride, AT_TIER, AT_REGISTRATION_DIR })`.

Second call site, same proof, same file: `resetLocalDatabase(target, read)` and `writeAttestation(target, read, attestation)`. One read feeds both destructive acts. The compiler collects the proof. A successful `proveLocalTarget` cannot hand `provenProjectId: null`.

Third call site, `runner.selftest.ts`, no Docker:

```ts
describe('container names in CLI output prove which project the CLI resolved', () => {
  const project = 'poancmeitlmxejofwzuu';
  const stopped =
    'Stopped services: [supabase_imgproxy_poancmeitlmxejofwzuu supabase_pooler_poancmeitlmxejofwzuu]';
  const hybrid =
    'Stopped services: [supabase_imgproxy_ai4good-slot-1 supabase_pooler_poancmeitlmxejofwzuu]';

  it('own names are the tokens that end in this project id', () => {
    expect(ownContainerNames(stopped, project)).toEqual([
      'supabase_imgproxy_poancmeitlmxejofwzuu',
      'supabase_pooler_poancmeitlmxejofwzuu',
    ]);
  });

  it('foreign names are the tokens that do not', () => {
    expect(foreignContainerNames(hybrid, project)).toEqual(['supabase_imgproxy_ai4good-slot-1']);
    expect(ownContainerNames(hybrid, project)).toEqual(['supabase_pooler_poancmeitlmxejofwzuu']);
  });

  it('an output that names no container proves no project', () => {
    expect(ownContainerNames('API_URL: http://127.0.0.1:44321', project)).toEqual([]);
    expect(foreignContainerNames('', project)).toEqual([]);
  });
});
```

Existing reset-proof tests stay. They already refuse a mismatched `provenProjectId` and a `null` one, and they spawn nothing.

The child still reads the six names through `liveCoordinatesFromEnv` and `attestationCoordinatesFromEnv`. `index.ts` does not change.

## Shape

Data structures first.

```ts
// already in runner.ts — lock key, CLI aim, proof parameter
export interface LocalConfig { projectId: string; apiPort: number; dbPort: number; mailPort?: number }
export interface CliTarget { workdir: string; projectId: string }
export interface SlotIdentityProof { provenProjectId: string | null }
export interface StackStatus {
  apiUrl: string; dbUrl: string; anonKey: string; serviceRoleKey: string; mailUrl?: string
}

// already in attestation.ts — unchanged
export interface ProvenSlotRead {
  provenProjectId: string | null;
  status: { dbUrl: string } | null;
}
export const ATTESTATION_ENV = 'AT_SLOT_ATTESTATION';

// new, in a section of runner.ts after localStackProblems
export interface ProvenLocalRead {
  provenProjectId: string; // never null: a successful read proved this target
  status: StackStatus;     // never null: a successful read parsed a stack
}

export function ownContainerNames(text: string, projectId: string): string[] {
  throw new Error('not implemented');
}
export function foreignContainerNames(text: string, projectId: string): string[] {
  throw new Error('not implemented');
}

/** THE ONE-STACK IDENTITY READ. Throws, names `act`, does nothing on failure. */
export function proveLocalTarget(target: CliTarget, act: string): ProvenLocalRead {
  throw new Error('not implemented');
}

// reset: delete the no-target overloads. This is the only remaining signature.
export async function resetLocalDatabase(target: CliTarget, proof: SlotIdentityProof): Promise<void> {
  throw new Error('not implemented');
}
```

`ProvenLocalRead` is assignable to `SlotIdentityProof` and to `ProvenSlotRead`. `string` fills `string | null`. `StackStatus` fills `{ dbUrl: string }`. The null cases remain on the parameter types so a bad proof still compiles as an argument and is refused at runtime, before spawn or SQL.

Flow:

1. `readLocalConfig(REPO_ROOT)` → `CliTarget` with `workdir = REPO_ROOT` and `projectId` from the file.
2. `acquireStackLock(config, req, { takeover: 'dead-pid-only' })`. File name carries project id and API port.
3. `proveLocalTarget(target, 'reset')` runs `runSupabaseCli(target, ['status', '-o', 'json'])`. That goes through `supabaseInvocation(target)`, which sets `SUPABASE_PROJECT_ID` and strips every other `SUPABASE_*`. It does **not** call `readStackStatus`, because that helper drops the raw text. One CLI invocation. Then:
   - `foreignContainerNames(raw, target.projectId)` non-empty → throw. This is the inverted personal-id refusal: other projects are forbidden; this project is required.
   - `parseStackStatus` fails → throw, name `bun run db:start`.
   - `localStackProblems(status, readLocalConfig(target.workdir))` → loopback, configured ports 44321/44322/44324, `iss=supabase-demo`, no hosted `ref`. Unchanged.
   - `ownContainerNames(raw, target.projectId)` empty → throw. Ports alone are not identity (2026-08-09). There is no `destructive` flag. The only caller is the reset path, so every successful read carries own names.
   - return `{ provenProjectId: target.projectId, status }`.
4. `waitForReady` → `resetLocalDatabase(target, read)` → `waitForReady` → `proveMigrationsReplayed`.
5. `mintAttestationNonce` → `writeAttestation(target, read, nonce)`.
6. Print the evidence line. Assign the six env keys. No port-block refusal.

Load-bearing decisions:

- **No new module.** The allowed new surface is one section of `runner.ts`. A second file would be a public import for a second caller that does not exist (`per boundary-discipline`).
- **No wrapper around the sequence.** `occupy`/`prepare`/`evidence`/`stackEnv` are inlined. Hiding them behind `prepareOneStack` would move the proof-typed reset out of the screen the runner author reads (`per interface-depth`).
- **One new function, `proveLocalTarget`.** Complexity of CLI + raw scan + parse + `localStackProblems` + own-name rule is pulled into the callee. The branch stays one screen (`per simplicity`).
- **Invariants in types.** A target costs a proof. A successful identity read cannot be null. The no-target reset overload is deleted, so a proof-less reset does not compile (`per "a target costs a proof"`).
- **Single source for session lifetime.** `jwt_expiry = 120` in `supabase/config.toml`. The same number lives in `atconfig.ts`. Fixture and integration bodies read it. Manifests stay (`per single-source`).
- **Wall stays, polarity flips by restating the target.** `localStackProblems`, `supabaseInvocation`, and `childEnv` are not deleted. `personalBlockProblems` / `stackEnv` port refusal die because their file is parked, not because a check is commented out.
- **Docker probe does not move.** Ruling 1 names the two container-name helpers. This direction moves only those. The CLI already prints `supabase_imgproxy_<id>` and `supabase_pooler_<id>` while those services stay disabled.

What the public surface hides: CLI construction, raw token scan, status parse, the four `localStackProblems` checks, the own-name rule.

What stays exposed: the order lock → prove → wait → reset → wait → migrations → write → evidence → env. That order is the contract.

What the system does not do: overlay a generated config, restart Auth per run, mirror a tree, read `AT_DB_SLOT`, refuse ports 44320–44329, probe `docker ps`, emit coordinates through a named `stackEnv`, rename `'slot'` / `AT_SLOT_ATTESTATION` / `attestSlot`.

### Module map

| Module | Role after the change |
|---|---|
| `runner.ts` | lock, CLI wall, `localStackProblems`, two helpers, `proveLocalTarget`, proof-typed reset, migrations, integration branch, vitest spawn, grading |
| `attestation.ts` | mint, write, read-back. Signatures unchanged |
| `index.ts` | live ledger. Unchanged |
| `atconfig.ts` | adds `authJwtExpirySeconds` |
| `req-001/_fixture.ts`, `_integration.ts` | read that entry |
| `db-pool.ts` + `db-pool.selftest.ts` | parked as a unit. No live import |

## Synthesis decision

Arena fills this after the candidates are compared.

## Tradeoffs accepted

- We accept an inline integration branch instead of a named `prepareOneStack` in exchange for no second public function and a branch that still fits one screen.
- We accept CLI container names as the only positive identity instrument in exchange for not moving `slotDbContainers`. A machine without Docker already cannot start the stack; a second `docker ps` would fail closed for a reason the CLI status already covers when imgproxy and the pooler stay disabled.
- We accept that enabling imgproxy or the pooler makes `ownContainerNames` empty and the reset refuses, in exchange for keeping the fail-closed coupling the pool already recorded.
- We accept one identity read shared by reset and write, not a second read immediately before reset, in exchange for one CLI round-trip. The type system still forbids a proof-less reset.
- We accept deleting the no-target `resetLocalDatabase` overloads in exchange for no compile-time skip. They have zero production callers. The parked pool was the last one.
- We accept wiping the founder's local database on every integration run in exchange for isolation by reset, which is what `_live.ts` teardown already relies on.
- We accept two-minute local Auth tokens (Studio, verify-ai4good, supabase-js refresh) in exchange for AT-001.12 and AT-001.13 staying integration-green without a manifest edit.
- We accept leftover "slot" / `prepare()` wording in `attestation.ts` and `index.ts` in exchange for not touching the round-trip module.
- We accept that `bun run db:reset` and verify-ai4good still take no lock, in exchange for not widening this path past `at:verify`. The evidence line prints the lock file the runner holds.
- We accept a one-time Auth restart after the pin, in exchange for not copying the pool's start/stop/hash-marker machinery. The runner does not restart the stack.

## Alternatives considered

- **One module `tests/at/harness/local-stack.ts` with one function the branch calls.** Hides lock, prove, reset, write, env, and evidence behind `prepareLocalStack()`. Exposes a new import and a result type (`env`, evidence, lock). Hides the proof-typed reset from the only call site a runner author reads. Loses: the caller is one branch in one file. A module is interface for a second caller that does not exist.
- **A small `stack-identity.ts` that also moves the docker probe.** Keeps the two-instrument destructive-path rule. Exposes `proveLocalTarget` plus `docker ps` to every integration run. Hides nothing the branch needs except the scan. Costs a Docker CLI dependency on a path CI never runs, and a false refuse if leftover slot containers match a naive name filter. Loses: this direction moves only the two helpers; the CLI already prints own names on this config.
- **Keep the no-target reset and aim it at 44321.** Smallest line count. Exposes a proof-less destructive act next to a proof-required write. Hides nothing; it deletes the invariant. Loses: that is the skip the proof parameter exists to make uncompilable.

This was not the only viable shape in the large. It is the only shape that matches "repoint in place, no new module, inline the four pool calls."

## Open questions and risks

- After `jwt_expiry` becomes 120, who restarts the running Auth container? The runner will not. If Auth still issues 3600 s tokens, AT-001.12 and AT-001.13 fail by timeout under a 240 s budget. Is a one-time `bun run db:stop` then `bun run db:start` an instruction in the pull-request Verification section, and nothing in code?
- Should `stackHelp` name leftover `ai4good-slot-*` containers as corpses to ignore, or is "start with `bun run db:start`" enough?
- Should `bun run db:reset` and the verify-ai4good drive take the same lock? This path does not add that. A drive session can vanish under an integration reset. Is that accepted for this item?
- `proveLocalTarget` depends on stopped imgproxy and pooler names in `supabase status`. If a later config change enables them, integration refuses closed. Is that the wanted failure, or should a later item add the docker probe then?

## Next implementation step

Copy `ownContainerNames` and `foreignContainerNames` into `runner.ts`, add the three synthetic-output tests, then replace the integration branch with the sequence in Usage.

---

## Answers to the nine questions

### 1. Where the one-stack identity read lives, and its signature

It lives in `runner.ts`, in a new section after `localStackProblems`. Not a new file.

```ts
export function ownContainerNames(text: string, projectId: string): string[]
export function foreignContainerNames(text: string, projectId: string): string[]
export function proveLocalTarget(target: CliTarget, act: string): ProvenLocalRead
```

`proveLocalTarget` is the one new identity read. It proves `target.projectId` from CLI container names (`ownContainerNames` non-empty, `foreignContainerNames` empty). It keeps `localStackProblems`. It uses `supabaseInvocation(target)` / `childEnv` as the hosted-URL wall. It returns a `ProvenLocalRead`, which is a `ProvenSlotRead` as `writeAttestation` demands, with `status` fully parsed.

It does not call `readStackStatus`. That helper discards raw output. The container-name proof needs the raw text. One `runSupabaseCli` + `parseStackStatus` is the status read on this path.

There is no personal-id blacklist. This project id in the output is the proof, not a refuse. That is the polarity flip stated positively.

### 2. Proof-typed reset is the only reset

Delete both no-target overloads:

```
export async function resetLocalDatabase(): Promise<void>;
export async function resetLocalDatabase(target?: CliTarget, proof?: SlotIdentityProof): Promise<void>;
```

Keep only:

```
export async function resetLocalDatabase(target: CliTarget, proof: SlotIdentityProof): Promise<void>
```

The body always goes through `supabaseInvocation(target, ['db', 'reset', '--local'])`. The guard stays: `proof.provenProjectId !== target.projectId` refuses before spawn.

Those overloads have zero production callers today. The loop tier never resets. Drill already refuses. The pool's `resetSlotDatabase` parks with the pool. `runner.selftest.ts` already calls the targeted form. After deletion, a zero-argument call is a compile error.

`readStackStatus(target?)` keeps its optional target. This item does not delete it. The integration path does not call it.

### 3. Lock and evidence

```ts
lock = acquireStackLock(readLocalConfig(REPO_ROOT), `req-${requirement}`, { takeover: 'dead-pid-only' });
```

Lock file: `at-verify-poancmeitlmxejofwzuu-44321.lock`.

Evidence line, printed in the branch, no helper function, no slot number:

```
at:verify — poancmeitlmxejofwzuu, api 44321 — reset OK — migrations: E expected, A applied — lock <file>
```

API port comes from `config.apiPort`. `localStackProblems` already proved it matches the status. The pool read the port from status because `prepare` could rewrite the slot config. This path does not rewrite config, so ruling A3 does not apply.

The pull request states the data cost: every integration run resets the founder's local database.

### 4. Child environment emitter

There is no emitter function. `stackEnv` in the pool refuses 44320–44329 and this project id; it cannot be reused. The branch assigns six keys into the existing `stackEnv` record:

| Key | Source |
|---|---|
| `AT_SUPABASE_URL` | `read.status.apiUrl` |
| `AT_SUPABASE_DB_URL` | `read.status.dbUrl` |
| `AT_SUPABASE_ANON_KEY` | `read.status.anonKey` |
| `AT_SUPABASE_SERVICE_ROLE_KEY` | `read.status.serviceRoleKey` |
| `AT_SLOT_ATTESTATION` | minted nonce |
| `AT_SUPABASE_MAIL_URL` | `read.status.mailUrl` when present |

No personal-port refusal. Shape is already proved by `proveLocalTarget`. `childEnv` remains the allowlist at spawn. It still does not pass `AT_DB_SLOT` or `AT_JUDGE_API_KEY`. Brand and env names are not renamed.

### 5. Session lifetime

`supabase/config.toml`:

```
# Pinned at 120 so AT-001.12 and AT-001.13 can wait a real token out.
# supabase-js refreshes inside this window. Local Studio sessions last two minutes.
jwt_expiry = 120
```

`tests/at/harness/atconfig.ts` entry:

```ts
authJwtExpirySeconds: {
  name: 'Auth access-token lifetime on the local stack',
  value: 120,
  unit: 'seconds',
  source:
    'supabase/config.toml [auth] jwt_expiry — pinned at 120 so AT-001.12 and AT-001.13 wait the lifetime out inside INTEGRATION_TIMEOUT_MS; supabase-js refreshes inside this window',
},
```

No `CONFIG_KEYS` row. `h.config` has no consumer of this number. A dotted key with no reader is unused surface.

Read site 1 — `tests/at/suites/req-001/_fixture.ts`:

```ts
import { AT_CONFIG } from '../../harness/atconfig.ts';
const ACCESS_TOKEN_TTL_MS = AT_CONFIG.authJwtExpirySeconds.value * 1000;
```

Read site 2 — `tests/at/suites/req-001/_integration.ts`:

```ts
import { AT_CONFIG } from '../../harness/atconfig.ts';
const SLOT_JWT_EXPIRY_MS = AT_CONFIG.authJwtExpirySeconds.value * 1000;
```

The local name `SLOT_JWT_EXPIRY_MS` stays so the two wait sites do not rename. The number is no longer a literal.

Same source, required or loop `--expect` goes red: `b-verification-and-sessions.test.ts` currently advances `3600 * 1000` (AT-001.12) and `3599 * 1000` (AT-001.13). With a 120 s fixture TTL, 3599 s kills both sessions before the refresh. Those two advances read the same entry (`TTL` and `TTL - 1` seconds). They are not a second source.

Manifests are not edited. 16 integration greens stay.

### 6. What changes in `runner.ts`

- **Import at line 44.** Delete the db-pool import and the cycle comment. Add `import { mintAttestationNonce, writeAttestation } from './attestation.ts'`. Attestation does not import the runner. The cycle dies.
- **Integration branch (1332–1369).** Replace as in Usage. Drop the `AT_DB_SLOT` read. Drop `occupy` / `prepare` / `evidence` / `slotStackEnv`.
- **Header (lines 10–33).** The integration database is this repository's `supabase/config.toml` stack. Sequence: lock, prove, reset, evidence, allowlisted child. State the data cost. Stop calling that stack untouchable.
- **`stackHelp`.** Cause 1 stays Docker. Cause 2 becomes `bun run db:start`. Delete `bun tests/at/harness/db-pool.ts setup`.
- **Drill-tier refusal.** Keep exit 3. Drop "founder's personal stack, and that stack is untouchable." Say only that drill's stack is not decided, so this tier resolves no database.
- **Also in this file:** identity section; delete no-target reset overloads; rewrite the `SlotIdentityProof` comment so the read lives here, not "beside the pool"; rewrite the `TakeoverPolicy` sentence so integration, not the pool, passes `dead-pid-only`.

Companion deletes of `AT_DB_SLOT` (settings, controller template, verify-ai4good line, cloud readme and setup) belong in the same item. They are not types on this path.

### 7. Selftest story

`runner.selftest.ts` — add, do not rewrite the existing 18 tests:

- Three tests on `ownContainerNames` / `foreignContainerNames` with synthetic CLI text (stopped-services line, hybrid line, empty). No Docker. This is the CI-reachable half of the new read. `proveLocalTarget` itself talks to the CLI and is not driven in CI.
- Two tests of `acquireStackLock(..., { takeover: 'dead-pid-only' })`: refuse a live holder of any age; refuse an unidentifiable claim file and leave it in place. Those tests live only in `db-pool.selftest.ts` today, behind `occupy`. Parking the pool would drop them. The one-stack lock uses that policy.

Existing reset-proof tests stay. They already cover mismatched and null proofs. Do not change their `ai4good-slot-2` target strings; they spawn nothing.

`live-ledger.selftest.ts` — no change. Write-attestation refusals, `attestSlot` round trip, `'slot'` brand, and `AT_SLOT_ATTESTATION` naming stay. A rename would be leftover cleanup, not this path.

`bun run at:selftest` shrinks by parking `db-pool.selftest.ts`: **33 tests, 668 lines, 1 of 13 selftest files**. The script is `harness/**/*.selftest.ts` under `tests/at`. A file under `loop/parked/` is not included. Typecheck does not see it (`tests/at/tsconfig.json` includes `**/*` only under `tests/at`).

### 8. Parked layout

```
loop/parked/v1/README.md
loop/parked/v1/tests/at/harness/db-pool.ts
loop/parked/v1/tests/at/harness/db-pool.selftest.ts
```

Outside every tsconfig. The README says the code is dead text, is not compiled, is not imported, and is not a spare part that still fits.

From `tests/at`, only those two files move for this path. Nothing else under `tests/at` moves here. `attestation.ts`, `live-email.ts`, `oracles.ts` stay. The semantic-judge park is a later slice of the same item (last in sequence, revert if the conformance walls fight). It is not part of this seam.

### 9. Diff estimate

Counted from the sketch, not from an applied patch. Park is a move: removed from `tests/at`, added under `loop/parked/v1`. Rewrites count on both sides.

| File | added | removed | net |
|---|---:|---:|---:|
| `tests/at/harness/runner.ts` | 140 | 75 | +65 |
| `tests/at/harness/runner.selftest.ts` | 75 | 0 | +75 |
| `tests/at/harness/live-ledger.selftest.ts` | 0 | 0 | 0 |
| `tests/at/harness/atconfig.ts` | 12 | 0 | +12 |
| `tests/at/suites/req-001/_fixture.ts` | 4 | 6 | −2 |
| `tests/at/suites/req-001/_integration.ts` | 4 | 10 | −6 |
| `tests/at/suites/req-001/b-verification-and-sessions.test.ts` | 8 | 6 | +2 |
| `supabase/config.toml` | 3 | 2 | +1 |
| `tests/at/harness/attestation.ts` | 0 | 0 | 0 |
| `tests/at/harness/index.ts` | 0 | 0 | 0 |
| `tests/at/expected/*.json` | 0 | 0 | 0 |
| `tests/at/harness/db-pool.ts` (move out) | 0 | 1827 | −1827 |
| `tests/at/harness/db-pool.selftest.ts` (move out) | 0 | 668 | −668 |
| `loop/parked/v1/tests/at/harness/db-pool.ts` (move in) | 1827 | 0 | +1827 |
| `loop/parked/v1/tests/at/harness/db-pool.selftest.ts` (move in) | 668 | 0 | +668 |
| `loop/parked/v1/README.md` | 20 | 0 | +20 |
| `AT_DB_SLOT` companion (settings, controller, verify skill, cloud) | 8 | 14 | −6 |
| **Live harness/suite/config (no park move)** | **246** | **99** | **+147** |
| **Park move (copy, not new logic)** | **2495** | **2495** | **0** |

`runner.ts` identity section is +73 (two helpers, `ProvenLocalRead`, `proveLocalTarget`, comments). Integration branch is +40 / −38. Header, import, reset overloads, `stackHelp`, drill, and comments are the rest.

No new module. One new section. The integration branch stays one screen.