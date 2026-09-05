# The one-stack integration path: subtract first

Direction: delete the no-target overloads and every personal-block refusal, make `CliTarget` plus a proof the only road to a destructive act, and keep the identity read as a section of `runner.ts`. Line numbers are this worktree's.

## Problem

`bun run at:verify req-001 --tier integration --expect` must run green against project `poancmeitlmxejofwzuu` on the 44321 block with nothing from `db-pool.ts` on the path. Today the integration branch (`runner.ts` 1332-1370) reaches a database only through `occupy` and `prepare`, and the pool refuses that project by constant. Four things already exist in `runner.ts` and take a target or a config: the lock (397), the CLI seam (630), `localStackProblems` (754), readiness (854), the migration proof (938), and the proof-typed reset (985). One thing does not exist outside the pool: a read that names `poancmeitlmxejofwzuu` positively from the CLI's own container names, in the `ProvenSlotRead` shape `writeAttestation` demands (`attestation.ts` 80-114). The constraints the rulings fix: no guard is deleted to make the target legal; the target is stated positively; the attestation round trip, its brand and its env names stay as they are; the manifests stay; at most one new module or one new section in `runner.ts`.

The shape is non-obvious for one reason. The runner keeps two destructive forms side by side: `resetLocalDatabase()` with no target and no proof, and `resetLocalDatabase(target, proof)`. The no-target form is what the explanation recommends for the one stack, and it is the one form that carries no identity read at all. The subtraction this design makes is to remove that form, so the type system collects the proof on the only path that resets anything.

## Usage (caller's view)

The caller is the integration branch of `main()`. It reads in one screen:

```ts
if (tier === 'integration') {
  const config = readLocalConfig();                                      // supabase/config.toml, the one stack
  const target: CliTarget = { workdir: REPO_ROOT, projectId: config.projectId };
  try {
    lock = acquireStackLock(config, `req-${requirement}`, { takeover: 'dead-pid-only' });
  } catch (err) {
    return infra((err as Error).message);
  }
  let prepared: PreparedStack;
  try {
    prepared = await prepareStack(target, config);                       // read, prove, reset, prove, attest
  } catch (err) {
    return infra(`the stack could not be prepared: ${(err as Error).message}\n${stackHelp}`);
  }
  console.log(evidenceLine(config, prepared, lock.file));
  Object.assign(stackEnv, suiteEnv(prepared));
}
```

Second call site, the reset inside `prepareStack`, which is the only reset in the tree after the change:

```ts
const read = proveStackTarget(target, 'reset', true);                    // throws, or carries provenProjectId
await resetLocalDatabase(target, read);                                  // the proof is a parameter
```

Third call site, the attestation write, unchanged from today:

```ts
const attestation = mintAttestationNonce();
await writeAttestation(target, read, attestation);                       // ProvenSlotRead satisfied structurally
```

A future caller that wants to reset anything writes `resetLocalDatabase(target, read)` or it does not compile. There is no `resetLocalDatabase()`.

## Shape

### Data structures

```ts
// runner.ts, existing, unchanged
export interface CliTarget { workdir: string; projectId: string }
export interface LocalConfig { projectId: string; apiPort: number; dbPort: number; mailPort?: number }
export interface StackStatus { apiUrl; dbUrl; anonKey; serviceRoleKey; mailUrl? }
export interface MigrationProof { expected: number; applied: number }
export interface SlotIdentityProof { provenProjectId: string | null }   // name kept; the comment changes

// runner.ts, new section "the stack's identity"
export interface StackIdentityRead extends SlotIdentityProof {
  /** the stack's own report, when a stack answered; the dbUrl is read from here and nowhere else */
  status: StackStatus | null;
  /** why no stack answered, when none did; a mismatch never lands here, it throws */
  notRunning: string | null;
  /** the container names the CLI printed that end in `_<projectId>`; the positive evidence */
  containers: string[];
}

export interface PreparedStack {
  status: StackStatus;
  migrations: MigrationProof;
  attestation: string;
}
```

`StackIdentityRead` satisfies `ProvenSlotRead` structurally (`provenProjectId` and `status.dbUrl`), so `writeAttestation` is untouched. `SlotIdentityProof` keeps its name: the rulings treat slot-shaped names as names, and renaming would widen the diff for nothing.

### Signatures, new section in `runner.ts` (after the reset section, before the vitest JSON shape)

```ts
/* ---------------------------------------------------------------- the stack's identity */

/** Every `supabase_…` token in CLI output that does NOT end in `_<projectId>`. Generalized from the pool. */
export function foreignContainerNames(text: string, projectId: string): string[] { /* not implemented */ }

/** Every `supabase_…` token that DOES end in `_<projectId>`. The positive half of the same instrument. */
export function ownContainerNames(text: string, projectId: string): string[] { /* not implemented */ }

/**
 * The pre-destructive identity read for ONE target. `status -o json` through the seam, then:
 *   1. no container name belongs to another project (foreignContainerNames is empty);
 *   2. the reported ports, host and keys are the target's own (localStackProblems against
 *      readLocalConfig(target.workdir));
 *   3. destructive only: at least one container name IS the target's own.
 * A stack that is not running is `notRunning`, never a mismatch. A mismatch throws and does nothing.
 */
export function proveStackTarget(target: CliTarget, act: string, destructive = false): StackIdentityRead { /* not implemented */ }

/** Read, prove, wait, reset, wait, prove the migrations, mint and write the nonce. The whole sequence. */
export async function prepareStack(target: CliTarget, config: LocalConfig): Promise<PreparedStack> { /* not implemented */ }

/** The six values and nothing else. No port refusal: the target was proven, and the proof is the guard. */
export function suiteEnv(prepared: PreparedStack): Record<string, string> { /* not implemented */ }

/** One line: project id, api port that answered, reset, migration counts, lock file, commit and dirty flag. */
export function evidenceLine(config: LocalConfig, prepared: PreparedStack, lockFile: string): string { /* not implemented */ }

/** `git rev-parse --short HEAD` plus `-dirty` when `git status --porcelain` is non-empty. */
function headStamp(): string { /* not implemented */ }
```

### Signatures that change (subtraction)

```ts
// before
export function supabaseInvocation(target: CliTarget | undefined, args: string[]): CliInvocation
export function runSupabaseCli(target: CliTarget | undefined, args: string[]): CliResult
export function readStackStatus(target?: CliTarget): StackStatus
export async function resetLocalDatabase(): Promise<void>;
export async function resetLocalDatabase(target: CliTarget, proof: SlotIdentityProof): Promise<void>;

// after
export function supabaseInvocation(target: CliTarget, args: string[]): CliInvocation
export function runSupabaseCli(target: CliTarget, args: string[]): CliResult
// readStackStatus: deleted (one caller, db-pool.ts 1497, parked). parseStackStatus stays.
export async function resetLocalDatabase(target: CliTarget, proof: SlotIdentityProof): Promise<void>
```

`supabaseInvocation` loses its first line (`if (!target) return …`) and its last paragraph of comment. What stays is the wall: `SUPABASE_PROJECT_ID` stated positively, no other `SUPABASE_*`, cwd equal to `--workdir`. For the one stack the target is `{ workdir: REPO_ROOT, projectId: 'poancmeitlmxejofwzuu' }`. The measured hybrid hazard (618-622) needs cwd to be one project and `--workdir` another; here they are the same directory, so the seam behaves as `bun run db:reset` does, with the identity stated instead of inherited from `.env`.

### Data flow

```
readLocalConfig()            -> LocalConfig            (ports, project id, mail port)
CliTarget from it            -> target
acquireStackLock(config, req, dead-pid-only)            at-verify-poancmeitlmxejofwzuu-44321.lock
prepareStack(target, config):
  proveStackTarget(target, 'prepare')      -> read (status, containers)   throws on foreign / not local
  waitForReady(read.status, 'before the reset')
  proveStackTarget(target, 'reset', true)  -> read2                       throws with no own container
  resetLocalDatabase(target, read2)                                       compile-time: proof required
  waitForReady(read.status, 'after the reset')
  proveMigrationsReplayed(read.status, REPO_ROOT) -> migrations
  mintAttestationNonce(); writeAttestation(target, read2, nonce)          unchanged
suiteEnv(prepared)           -> six AT_* values
childEnv({...suiteEnv, AT_TIER, AT_REGISTRATION_DIR})                    allowlist unchanged
```

### Load-bearing decisions

- **The proof is the guard, and it is positive.** `proveStackTarget` says which project the CLI resolved, from the CLI's own container names, and `resetLocalDatabase` and `writeAttestation` both demand it as a parameter. No refusal keyed on "the personal stack" survives, because the target is now named, not avoided (per boundary-discipline: the guard sits at the CLI seam and the destructive functions, and nowhere else). The reset that the explanation recommended, unproven, no longer exists.
- **The identity read is a section, not a module.** It uses `runSupabaseCli`, `parseStackStatus`, `readLocalConfig` and `localStackProblems`, all in `runner.ts`. A module would import six things from the runner and export four back, which is the cycle the pool had (per laziness-protocol; per minimize-reader-load: the whole destructive path is readable top to bottom in one file).
- **The docker second instrument is dropped.** `proveSlotDbContainer` (db-pool 1140) existed because a slot's containers could belong to another slot with the same ports. The one stack has one project id, and that id is what the config, the `.env`, and the target all say. The CLI's own container name is the positive evidence; docker was a CLI-version hedge. Named in Tradeoffs and Open questions.
- **No personal-port refusal in `suiteEnv`.** `stackEnv` (db-pool 1373) refused 44320-44329 by constant. That refusal is the rule the item inverts, and deleting it is not "deleting a guard to make the target legal": the guard that makes the emission safe is that `prepared.status` came out of a read that proved the target. The emitter has nothing to decide.
- **Session lifetime is one number in `atconfig.ts`.** `config.toml` pins 120; the fixture, the loop test file, and both integration bodies read the registry entry. The loop model cannot drift from the stack (per encode-lessons-in-structure: the registry header already forbids a copied threshold).
- **The lock is `dead-pid-only`.** AT-001.12 and AT-001.13 wait about two and a half minutes; a run that lasts longer than the 60-minute stale window is exactly the run a takeover would reset under. The evidence line prints the lock file so a drive session can see who holds the stack.

What the surface hides: the read-reset-read-attest order, the readiness waits, the migration proof, and the nonce. What stays exposed: the target, the config, and the lock, because the caller has to name what it destroys. The interface is `prepareStack(target, config)` in, `PreparedStack` out; the branch is fourteen lines.

## Synthesis decision

Filled in by the arena.

## Tradeoffs accepted

- We accept that every integration run resets the founder's local database, in exchange for no slot machinery. The evidence line and the pull request say so plainly.
- We accept one instrument on the destructive path (the CLI's container names) instead of two (CLI plus docker), in exchange for about 40 fewer lines and no `docker` spawn. The read still fails closed: no own container, no reset.
- We accept that the positive read depends on the config disabling imgproxy and the pooler, because those stopped services are the only container names `supabase status` prints (db-pool 1104-1108, residual F4). A config that enables both makes the read refuse loudly, which is the fail-closed direction.
- We accept that `supabaseInvocation` and `runSupabaseCli` lose their no-target form, in exchange for one way to reach the CLI. Nothing outside the pool used it.
- We accept a two-minute token lifetime on the local development stack, in exchange for a session number that lives in one place. supabase-js refreshes tokens on its own; the verify-ai4good drives feel nothing unless they hold a raw token for more than two minutes.
- We accept that the loop fixture and the loop test file now import a value from `atconfig.ts` (today they import only types from the harness), in exchange for a model that follows the stack's number.
- We accept the pin doing nothing until the stack restarts. The write unit runs `db:stop` then `db:start`; AT-001.12 and AT-001.13 are the observation.

## Alternatives considered

- **A new module `stack.ts` that owns the read, the prepare and the emitter.** It imports `runSupabaseCli`, `parseStackStatus`, `readLocalConfig`, `localStackProblems`, `waitForReady`, `proveMigrationsReplayed`, `resetLocalDatabase` and `childEnv` from the runner and exports four functions back, so the runner imports it and the "safe cycle" comment returns. It hides nothing the section does not hide and adds a file to the reader's path. Lost on depth: same interface, one more hop.
- **Keep `resetLocalDatabase()` with no target and route the one stack through it.** Smallest diff by line count. It leaves an unproven reset beside a proof-required one, on the only path that resets anything, and pairs it with a proven attestation write into the same database. Lost on the constraint that a target costs a proof, and on the rulings' item 2.
- **Keep the personal-block constants and flip their polarity (`requirePersonal`).** It states the target positively by port range instead of by project id, so a `config.toml` with moved ports refuses the tree's own stack, and the project id is still a string compared against itself. Lost on interface honesty: a port block is not an identity, which is the sentence the pool's own comment records (db-pool 1234-1235).

## Open questions and risks

- Does the lead want the docker second instrument kept on the destructive path, as `dockerDbContainers(projectId)` (about 20 lines), or is the CLI container name sufficient positive evidence for the one stack?
- Should `foreignContainerNames` stay a refusal at all on the one stack? A second local project on this machine (a `supabase init` in another folder) prints its own names only under its own `--workdir`, so a foreign name in this output is a real hybrid. The design keeps it; confirm.
- Does the founder accept that `jwt_expiry = 120` is the standing local development lifetime, with the verify-ai4good drives running on two-minute tokens?
- Is the `-dirty` suffix on the evidence line the right shape for "the worktree was dirty", or does the lead want the porcelain line count?
- Risk: the running Auth on 44321 still carries 3600 until restarted. The item's Verification section must record the restart, or the two waiting bodies fail by timeout with a message that blames the harness.
- Risk: `bun run db:reset` and the drive skill take no lock (rulings, Consider). A drive during a verify still collides. Not done here.

## Next implementation step

Delete the no-target overload of `resetLocalDatabase` and the `undefined` branch of `supabaseInvocation`, run `bun run typecheck`, and let the compiler list every site that reached the CLI without a target; that list is the park set for `db-pool.ts` and nothing else.

---

## The nine answers

### 1. Where the one-stack identity read lives, and its signature

A new section of `runner.ts`, "the stack's identity", placed after the reset section. Exact signature:

```ts
export function proveStackTarget(target: CliTarget, act: string, destructive = false): StackIdentityRead
```

Body, in order: `runSupabaseCli(target, ['status', '-o', 'json'])`; on `res.error` throw "refusing to `act` `projectId`: the CLI could not be launched"; `raw = stdout + stderr`; `foreign = foreignContainerNames(raw, target.projectId)`; if any, throw `REFUSING TO <ACT> <projectId>: the identity read named <foreign>`; `parseStackStatus(res)`, and on failure return `{ status: null, notRunning, provenProjectId: null, containers: [] }`; `localStackProblems(status, readLocalConfig(target.workdir))`, and on problems throw naming the checks; `own = ownContainerNames(raw, target.projectId)`; if `destructive && own.length === 0` throw the ports-are-not-identity refusal; log `at:verify — identity proven before the <act>: project <id>, api <port>, db <port>, containers <own>`; return `{ status, notRunning: null, provenProjectId: own.length ? target.projectId : null, containers: own }`.

The two helpers move from `db-pool.ts` 1084 and 1110 with the parameter renamed from `slotProject` to `projectId` and no other change. The hosted-URL wall stays where it is: `supabaseInvocation` states `SUPABASE_PROJECT_ID` and refuses a second `SUPABASE_*`; `childEnv` carries none. The return type satisfies `ProvenSlotRead`.

### 2. How the proof-typed reset stays the only reset

The no-target overload at `runner.ts` 984 and the `target?` and `proof?` optionality at 986 are deleted; the guard at 987 loses its `target &&` prefix. `supabaseInvocation` 631 and `runSupabaseCli` 657 lose `| undefined`; `readStackStatus` 673 is deleted. After this, `resetLocalDatabase` is called once in the tree, inside `prepareStack`, with the read that proved the target. The compiler collects the proof: a call without one is a type error, which `bun run typecheck` reports in CI.

### 3. The lock and the evidence line

`acquireStackLock(config, \`req-${requirement}\`, { takeover: 'dead-pid-only' })` in the integration branch, before `prepareStack`. The file is `at-verify-poancmeitlmxejofwzuu-44321.lock` under `%LOCALAPPDATA%\ai4good-build\at-locks`. It goes into the same `lock` variable `cleanupRun` releases. Evidence line:

```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5 applied — lock C:\…\at-verify-poancmeitlmxejofwzuu-44321.lock — commit e56f9f6-dirty
```

The api port comes from `prepared.status.apiUrl` (the port that answered), the project id from `config`, the commit from `headStamp()`. No slot number anywhere.

### 4. The child environment emitter

```ts
export function suiteEnv(prepared: PreparedStack): Record<string, string> {
  const { status, attestation } = prepared;
  return {
    AT_SUPABASE_URL: status.apiUrl,
    AT_SUPABASE_DB_URL: status.dbUrl,
    AT_SUPABASE_ANON_KEY: status.anonKey,
    AT_SUPABASE_SERVICE_ROLE_KEY: status.serviceRoleKey,
    AT_SLOT_ATTESTATION: attestation,
    ...(status.mailUrl ? { AT_SUPABASE_MAIL_URL: status.mailUrl } : {}),
  };
}
```

No port refusal and no project-id refusal. The attestation is always present because `prepareStack` always writes one; the mail URL follows `StackStatus.mailUrl`'s optionality as today. The names are unchanged.

### 5. The session lifetime

`supabase/config.toml` line 174: `jwt_expiry = 120`, with a two-line comment saying the acceptance suite waits it out and `tests/at/harness/atconfig.ts` mirrors it. The registry entry:

```ts
accessTokenLifetimeSeconds: {
  name: 'lifetime of a local development access token',
  value: 120,
  unit: 'seconds',
  source: 'supabase/config.toml [auth] jwt_expiry — pinned to 120 so AT-001.12 and AT-001.13 can wait a real expiry out inside their four-minute budget; the loop fixture models the same number',
},
```

Read sites:

```ts
// tests/at/suites/req-001/_fixture.ts, replaces line 468
import { AT_CONFIG } from '../../harness/atconfig.ts';
const ACCESS_TOKEN_TTL_MS = AT_CONFIG.accessTokenLifetimeSeconds.value * 1000;

// tests/at/suites/req-001/_integration.ts, replaces line 65
import { AT_CONFIG } from '../../harness/atconfig.ts';
const SLOT_JWT_EXPIRY_MS = AT_CONFIG.accessTokenLifetimeSeconds.value * 1000;
```

A third site the task did not list but the pin forces: `b-verification-and-sessions.test.ts` lines 405 (`3600 * 1000`) and 519 (`3599 * 1000`) advance the loop clock by the old number. With a 120-second model, 519 lands past expiry and the "still works" assertion fails. Both become `AT_CONFIG.accessTokenLifetimeSeconds.value * 1000` and `(value - 1) * 1000`; line 537 (`2 * 1000`) is unchanged. The comment at `_fixture.ts` 460 citing "line 165" goes with it. The waits in `_integration.ts` (487, 559) and `INTEGRATION_TIMEOUT_MS` are unchanged. The manifests are unchanged.

### 6. What changes in `runner.ts`

- Line 44: the `db-pool.ts` import and its two-line cycle comment are deleted. No import is added.
- Header (1-34): steps 1-4 rewritten. "The `integration` tier runs against the one local stack `supabase/config.toml` describes, started with `bun run db:start`. The sequence: 1. take the machine-wide lock keyed by project id and api port; 2. read the stack, prove the project it resolves from the CLI's own container names, prove it is local, reset it, prove the migration set replayed, write this run's attestation nonce; 3. print the evidence line; 4. run the suite with the allowlisted environment." The sentence calling the repository stack untouchable is deleted.
- `stackHelp` (1295-1300): "1. Docker Desktop is not running or is not on PATH. 2. The stack is not started; run `bun run db:start`."
- Drill refusal (1324-1330): "the drill tier's stack is not yet decided, so this tier resolves no database at all. The item that decides drill's stack replaces this." The two sentences about the personal stack are deleted.
- Integration branch (1332-1370): replaced by the fourteen lines in Usage. The `AT_DB_SLOT` read at 1338 is gone.
- The reset section: overload deleted (984-986), guard simplified (987), the comment at 957-963 rewritten to say the read lives in the section below.
- `supabaseInvocation` (627-631) and `runSupabaseCli` (657): `undefined` gone. `readStackStatus` (673-675) deleted; `parseStackStatus` keeps its comment minus "the slot pool's".
- New section: about 140 lines (two helpers, `proveStackTarget`, `prepareStack`, `suiteEnv`, `evidenceLine`, `headStamp`).
- Comments naming the pool at 240, 326, 480, 567, 679, 877 and 960: the ones that describe a parameter's reason are reworded in one clause each; none changes behaviour.

### 7. The selftest story

`runner.selftest.ts`: the deletions remove nothing. The file never called `resetLocalDatabase()` with no target; both calls (173, 179) use the targeted form and still compile. Its `target` literal names `ai4good-slot-2`; that is a string and stays. Added, from `db-pool.selftest.ts`'s pure tests re-homed:

- `describe('the identity read names the project positively')`: `ownContainerNames` and `foreignContainerNames` over the measured `Stopped services: [supabase_imgproxy_x supabase_pooler_x]` line, with `x` the target and with a foreign name; an output with no name yields empty for both.
- `describe('the suite environment is exactly six names')`: `suiteEnv` emits the six keys and no other; omits the mail URL when the status has none.
- `describe('the evidence names the stack it ran against')`: `evidenceLine` carries the project id, the api port that answered (a status on a different port than the config), the counts, the lock path, and a commit stamp; it never contains the word "slot".

`live-ledger.selftest.ts`: unchanged. `attestSlot`, `writeAttestation`, `createLiveEmail` and their seams keep their signatures.

`bun run at:selftest` shrinks by one file, `db-pool.selftest.ts`, 602 lines and 35 `it` blocks, and grows by about 8 `it` blocks in `runner.selftest.ts`. Thirteen selftest files become twelve.

### 8. The parked layout

`tests/at/harness/db-pool.ts` and `tests/at/harness/db-pool.selftest.ts` move to `loop/parked/v1/tests/at/harness/`. `tests/at/tsconfig.json` includes `**/*` relative to `tests/at`, and `vitest.config.ts` includes `harness/**/*.selftest.ts` relative to the same root, so the parked files are in neither. Their relative imports (`./runner.ts`, `./check.ts`, `./attestation.ts`) no longer resolve, and the README at `loop/parked/v1/README.md` says the code is dead text and is not compiled. Nothing else from `tests/at` moves: `attestation.ts`, `live-email.ts`, `capabilities.ts`, `clock.ts` and `live-ledger.selftest.ts` are the round trip and stay. `loop/work/db-slots.ps1` moves under the same park root by the rulings, outside `tests/at`.

### 9. Diff estimate

| File | Added | Removed | Note |
|---|---|---|---|
| `tests/at/harness/runner.ts` | ~175 | ~90 | new section; overload, no-target seam, `readStackStatus`, integration branch, header, help, drill text |
| `tests/at/harness/runner.selftest.ts` | ~60 | 0 | three re-homed describes |
| `tests/at/harness/atconfig.ts` | 7 | 0 | one entry |
| `tests/at/suites/req-001/_fixture.ts` | 2 | 2 | import, constant, comment |
| `tests/at/suites/req-001/_integration.ts` | 2 | 2 | import, constant |
| `tests/at/suites/req-001/b-verification-and-sessions.test.ts` | 3 | 2 | import, two advances |
| `supabase/config.toml` | 3 | 1 | the pin and its comment |
| `tests/at/harness/db-pool.ts` | 0 | 1674 | moved to `loop/parked/v1/tests/at/harness/` |
| `tests/at/harness/db-pool.selftest.ts` | 0 | 602 | moved with it |
| `loop/parked/v1/README.md` | ~15 | 0 | the park note |
| `.claude/settings.json` | 0 | 1 | `AT_DB_SLOT` |

About 270 lines added in live code and about 100 removed, plus 2,276 lines moved out of the compiled tree. Nothing on the integration path imports `db-pool.ts`; `grep db-pool tests/at` returns nothing after the change.
