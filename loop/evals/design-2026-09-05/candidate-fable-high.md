# The one-stack integration path: subtract first

Candidate direction: delete the no-target overloads and every personal-block refusal; make
`CliTarget` plus a proof the only way to reach a destructive act; keep the identity read as one
section of `runner.ts`; no new module. Line numbers are this worktree's.

## Problem

`at:verify req-001 --tier integration --expect` must run against the stack that
`supabase/config.toml` describes (project `poancmeitlmxejofwzuu`, api 44321, db 44322, mail
44324). Today the integration branch of `runner.ts` (1332-1369) reaches a database only through
`db-pool.ts`, and the pool refuses that project id and that port block by constant. The pool is
parked as one unit. Four things the path still needs sit inside the parked file: the positive
identity read (`proveSlotTarget`, `ownContainerNames`, `foreignContainerNames`), the only
producer of the `ProvenSlotRead` that `writeAttestation` demands, the child-coordinate emitter
(`stackEnv`, which refuses ports 44320-44329), and the evidence line. Everything else the path
needs is already in `runner.ts` and is target-neutral: the lock (397), the CLI seam (630),
`localStackProblems` (754), `waitForReady` (854), `proveMigrationsReplayed` (938), and the
proof-typed reset (985). The constraints the design honors: nothing on the path imports
`db-pool.ts`; no guard is deleted to make the target legal, the target is stated positively; the
attestation round trip, its brand, and its env names stay as they are; the manifests are not
edited; at most one new section in `runner.ts`.

One correction to the explanation's plan (section 9, step 4): the no-target `resetLocalDatabase()`
has no identity guard at all. This design deletes it rather than using it.

## Usage (caller's view)

The caller is the integration branch of `main()`. It reads in one screen:

```ts
if (tier === 'integration') {
  const config = readLocalConfig(REPO_ROOT);
  const target = repoTarget(config);
  try {
    lock = acquireStackLock(config, `req-${requirement}`, { takeover: 'dead-pid-only' });
  } catch (err) {
    return infra((err as Error).message);
  }
  let prepared: StackPreparation;
  try {
    prepared = await prepareStack(target, config);
  } catch (err) {
    return infra(`${target.projectId} could not be prepared: ${(err as Error).message}\n${stackHelp}`);
  }
  console.log(stackEvidence(prepared, lock));
  Object.assign(stackEnv, stackCoordinates(prepared));
}
```

The second call site is a selftest that drives the pure half of the identity read with a
synthetic CLI result and no stack:

```ts
const res: CliResult = { status: 1, stdout: '{ "API_URL": "http://127.0.0.1:44321", ... }',
  stderr: 'Stopped services: [supabase_imgproxy_poancmeitlmxejofwzuu supabase_pooler_poancmeitlmxejofwzuu]' };
const read = stackIdentity(res, { workdir: REPO_ROOT, projectId: 'poancmeitlmxejofwzuu' }, config);
expect(read.provenProjectId).toBe('poancmeitlmxejofwzuu');
```

The third is the two destructive acts, unchanged, consuming the same proof:

```ts
await resetLocalDatabase(target, read);
await writeAttestation(target, read, nonce);
```

What the caller sees: one config read, one lock, one `prepareStack`, one evidence line, one
coordinate map. It never sees a container name, a docker call, a slot, or a port refusal.

## Shape

### Data structures

```ts
/** A read that RETURNS has proven the target. A read that cannot prove it throws. */
export interface StackIdentityRead extends SlotIdentityProof {
  provenProjectId: string;      // narrowed from string | null: non-null by construction
  status: StackStatus;          // narrowed from StackStatus | null: a stack answered
  containers: string[];         // the CLI's own container names that end in `_<projectId>`
}

/** What prepareStack proved, and what the evidence line and the coordinates are built from. */
export interface StackPreparation {
  target: CliTarget;
  status: StackStatus;
  migrations: MigrationProof;
  attestation: string;          // the nonce this run minted and wrote after the reset
  head: { commit: string; dirty: boolean };   // sol 12: the tested tree, bound to the line
}
```

`StackIdentityRead` is structurally a `ProvenSlotRead` (attestation.ts 80) and a
`SlotIdentityProof` (runner.ts 964). Both consumers keep their runtime comparison; the narrowed
type only says a returned read is never the null case. The `containers` field is evidence for
the console, never a credential.

### Signatures (the new section of runner.ts, after the reset section)

```ts
/* ------------------------------------------------------ the one stack: identity, prepare, evidence */

/** The repository's own stack as a CLI target: the repo root is the workdir, the identity comes
 *  from config.toml. cwd equals --workdir, so the measured hybrid (618-622) cannot occur. */
export function repoTarget(config: LocalConfig): CliTarget { throw new Error('not implemented'); }

/** Every `supabase_*` token in CLI output, split by whether it ends in `_<projectId>`.
 *  Replaces ownContainerNames and foreignContainerNames with one scan. */
export function containerNames(text: string, projectId: string): { own: string[]; foreign: string[] } {
  throw new Error('not implemented');
}

/** The pure half of the identity read: judge one raw `status -o json` result. Throws on:
 *  a CLI that could not launch; any foreign container name (named); no JSON (the stack is not
 *  running: names `bun run db:start`); any localStackProblems entry (named, values withheld);
 *  no own container name (ports alone are not identity, the 2026-08-09 shape). */
export function stackIdentity(res: CliResult, target: CliTarget, config: LocalConfig): StackIdentityRead {
  throw new Error('not implemented');
}

/** The spawning half: run `status -o json` through the seam against the target, then judge it. */
export function proveStackTarget(target: CliTarget, config: LocalConfig, act: string): StackIdentityRead {
  throw new Error('not implemented');
}

/** Read, wait, reset, wait, prove the migration set, mint, write. The read travels into both
 *  destructive acts. Order is load-bearing: the nonce is written after the reset and after the
 *  migration proof, exactly as prepare() ordered it. */
export async function prepareStack(target: CliTarget, config: LocalConfig): Promise<StackPreparation> {
  throw new Error('not implemented');
}

/** `git rev-parse HEAD` and `git status --porcelain` at the workdir, through childEnv(). A git
 *  that does not answer yields commit 'unknown' and dirty true: fail toward "not clean". */
function headOfTree(workdir: string): { commit: string; dirty: boolean } { throw new Error('not implemented'); }

/** The six values and nothing else. No port refusal: the target was proven, not blacklisted. */
export function stackCoordinates(prepared: StackPreparation): Record<string, string> {
  throw new Error('not implemented');
}

/** at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected,
 *  5 applied — lock <file> — head 1a2b3c4d5e6f (clean|dirty). Port from the status that answered. */
export function stackEvidence(prepared: StackPreparation, lock: StackLock): string {
  throw new Error('not implemented');
}
```

### Signatures that narrow (deletions inside existing functions)

```ts
export function supabaseInvocation(target: CliTarget, args: string[]): CliInvocation;   // was CliTarget | undefined
export function runSupabaseCli(target: CliTarget, args: string[]): CliResult;            // was CliTarget | undefined
export async function resetLocalDatabase(target: CliTarget, proof: SlotIdentityProof): Promise<void>; // the two overloads go
// readStackStatus(target?) is deleted: its one caller was the pool's setup report.
```

### Data flow

`readLocalConfig(REPO_ROOT)` gives ports and the project id. `repoTarget` turns the id into the
positive statement `SUPABASE_PROJECT_ID=poancmeitlmxejofwzuu` that the seam asserts (630-645).
`proveStackTarget` runs the status read through that seam, and `stackIdentity` turns the raw
result into a `StackIdentityRead` or a named refusal. `prepareStack` hands that read to
`resetLocalDatabase` and to `writeAttestation`; both compare `provenProjectId` to
`target.projectId` at run time as they do today. `stackCoordinates` and `stackEvidence` are pure
over the preparation. The child receives the six values through `childEnv`, unchanged.

### Load-bearing decisions

- **The target is stated positively, never blacklisted** (per boundary-discipline). Deleted:
  `PERSONAL_PORT_LOW/HIGH`, `PERSONAL_INSPECTOR_PORT`, `personalBlockProblems`,
  `personalProjectId`, `refusePersonal`, `refusePersonalSlotConfig`, the `carriesPersonal`
  branch of the read, and the two port refusals in `stackEnv`. All go with the parked file. What
  stays and is generalized is the wall: the seam's positive identity and its no-other-`SUPABASE_*`
  assertion, `localStackProblems`, and the foreign-container refusal. What is added is the
  positive own-container requirement on every read, not only on a destructive one, because the
  only caller is the destructive path.
- **A returned read is a proof** (per type-system-discipline). `StackIdentityRead` has no null
  arm. The pool needed `notRunning` because `stopSlotStack` had "nothing to stop"; the one-stack
  path never stops a stack, so a stack that does not answer is an infrastructure refusal.
- **One read, two consumers** (per laziness-protocol). The pool read the identity twice: once in
  `prepare`, once inside `resetSlotDatabase`, because the reset was an exported entry point.
  Here `prepareStack` is the only entry, the reset takes the proof as a parameter, and the
  compiler collects it.
- **No target means no call** (per subtract-before-you-add). The `undefined` branch of the seam
  ran the CLI with an environment that carried no `SUPABASE_*` at all. After the pool leaves,
  nothing calls it. The wall is then one shape: identity stated, always.
- **The pure half is separable from the spawn**, mirroring `parseStackStatus(res)` (682), so the
  five refusals are selftested with no CLI and no Docker.
- **No docker probe.** `slotDbContainers` was a second instrument, coupled to a docker binary on
  PATH, added when the hybrid hazard was cwd-versus-workdir disagreement. For the one stack the
  two are equal by construction. The CLI's own container names remain the positive instrument.
  See Open questions.

### Interface depth

Public surface added to `runner.ts`: two types, seven functions, of which the integration branch
calls three (`repoTarget`, `prepareStack`, `stackEvidence`) plus `stackCoordinates`. Hidden
inside `prepareStack`: the read, two readiness waits, the reset, the migration proof, the mint,
the write, the head read. Exposed to the caller: the lock (it must land in the `lock` variable
`cleanupRun` releases, 1308-1311) and the config (it keys the lock). The surface is no larger
than the six facts the caller has to print and pass on.

## Synthesis decision

*Filled in by arena.*

## Tradeoffs accepted

- We accept that every integration run resets the founder's local database, in exchange for one
  stack and no slot code. The evidence line and the pull request say so.
- We accept one identity read per run instead of two, in exchange for a read that is a
  parameter of both destructive acts rather than a call inside one of them.
- We accept that the positive proof depends on `config.toml` disabling imgproxy and the pooler
  (those two stopped services are the only container names `supabase status` prints; residual
  F4, db-pool.ts 1104-1108), in exchange for reusing the instrument the pool measured on
  2026-08-10. A config that enables both makes the read refuse, loudly.
- We accept dropping the docker second instrument, in exchange for one fewer binary on the
  destructive path and about 30 fewer lines. The hazard it guarded (cwd one project, `--workdir`
  another) is structurally absent when both are the repo root.
- We accept a `git` spawn on the evidence path, in exchange for a local integration green that
  names the commit it graded and whether the tree was dirty (sol 12).
- We accept that the runner does not restart Auth after the `jwt_expiry` pin (the pool's
  config-hash marker is parked with it), in exchange for no marker file and no start/stop code in
  the runner. The pin is a standing config change; the restart is one manual step recorded in the
  Verification section (sol 3), and a stale Auth fails AT-001.12 and AT-001.13 by timeout, which
  is loud.
- We accept two-minute development tokens on the local stack, in exchange for the loop model and
  the running stack reading one number.

## Alternatives considered

- **A new module `tests/at/harness/stack.ts` holding the section.** Same functions, one more
  file, one more import into `runner.ts`, and an import of `runner.ts` back for the seam, the
  lock types and `localStackProblems`: the same cycle the pool had. It exposes one more module
  name to readers and hides nothing more than the section does. Lost on depth: it is the same
  surface behind a second door.
- **Accept `localStackProblems` alone as the proof for the write and the reset** (the
  explanation's section 9, point 5, second option). Smallest code. It hides nothing and exposes
  the caller to the exact hybrid the 2026-08-09 incident wore: right ports, another project's
  containers. Rejected because it deletes a guard to make the target legal, which the rulings
  forbid.
- **Keep the no-target overloads and route the one stack through them.** Zero new proof code.
  Exposes a proof-less reset beside a proof-required one, which is the compile-time skip D13 said
  could not exist. Rejected.
- **Keep `db-pool.ts` and flip its four refusals to accept 44321.** Keeps 1,674 lines and the
  slot directory, the mirror, the marker, and the reservation on the path for a stack that has
  none of those. Rejected: the item parks the pool as a unit.

## Open questions and risks

- Does the lead want the docker second instrument kept? Keeping it is about 15 lines inside
  `proveStackTarget` (`docker ps --filter name=supabase_db_poancmeitlmxejofwzuu`) and a docker
  binary on PATH for every run. This design drops it and says why above.
- Should `containerNames` keep requiring at least one own name when `config.toml` one day
  enables imgproxy and the pooler? Today the answer is yes and the read refuses; is a loud refusal
  the wanted behaviour, or should the read then fall back to the docker probe?
- The two loop bodies in `b-verification-and-sessions.test.ts` (405, 519) hard-code 3600 and 3599
  seconds. With the pin at 120 the second one fails at loop tier (3599 s is past a 120 s
  lifetime). Both must read the registry too. Is the lead content that this touches a `*.test.ts`
  file, given the freeze on the suites' substrate?
- `loop/items/AI4DEV-62/verify-first.ts` and `gate2-verify.ts` import `db-pool.ts` by relative
  path. They are under `loop/`, in no tsconfig, already dead text. Leave them?
- Risk: `git` is not on the allowlisted PATH of some cloud VM. `headOfTree` then prints `head
  unknown (dirty)` and the run continues. Is that the wanted fail direction, or should a missing
  git refuse the run?
- Risk: the running GoTrue still carries 3600 after the pin until `bun run db:stop; bun run
  db:start`. The bodies observe it by timeout after four minutes. Should the Verification section
  carry a `select exp - iat` check from a fresh token as a faster observation?

## Next implementation step

Write `containerNames` and `stackIdentity` with their six selftest cases in `runner.selftest.ts`,
driven by a synthetic `CliResult`, before any spawn code exists.

---

# The nine questions, answered

**1. Where the identity read lives and its signature.** In `runner.ts`, a new section after the
reset section (after line 1037), titled "the one stack: identity, prepare, evidence".
`stackIdentity(res: CliResult, target: CliTarget, config: LocalConfig): StackIdentityRead` is the
judgement; `proveStackTarget(target, config, act)` runs `runSupabaseCli(target, ['status', '-o',
'json'])` and calls it. It proves the project positively from the CLI's own output: at least one
`supabase_*` token ending in `_poancmeitlmxejofwzuu`, and no token that does not. It keeps
`localStackProblems(status, config)` (loopback, 44321, 44322, 44324, `iss=supabase-demo`, no
hosted `ref`). It keeps the hosted-URL wall because it runs through `supabaseInvocation(target,
…)`, which states `SUPABASE_PROJECT_ID` positively and refuses any second `SUPABASE_*`, and the
child still receives only `childEnv`. It returns a `StackIdentityRead` whose `provenProjectId`
is a non-null string and whose `status` is a non-null `StackStatus`; that object satisfies
`ProvenSlotRead` structurally, so `writeAttestation(target, read, nonce)` compiles and its
runtime comparison runs unchanged.

**2. The proof-typed reset is the only reset.** The two overloads at 984-985 are deleted and the
implementation signature becomes `resetLocalDatabase(target: CliTarget, proof:
SlotIdentityProof)`. The guard at 987 loses its `target &&` prefix. `supabaseInvocation`,
`runSupabaseCli` lose their `undefined` arm; `readStackStatus` is deleted (one caller, parked).
The no-target overloads had zero production callers (the drill tier refuses, the loop tier never
resets, the pool used the targeted form). After the change no importer can reset without a
`CliTarget` and a proof, and no code path builds a CLI environment that states no identity.

**3. The lock and the evidence line.** `acquireStackLock(config, 'req-001', { takeover:
'dead-pid-only' })` in the integration branch, before `prepareStack`, into the same `lock`
variable `cleanupRun` releases. The file is `at-verify-poancmeitlmxejofwzuu-44321.lock` under
`%LOCALAPPDATA%\ai4good-build\at-locks`. The evidence line:
`at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5
applied — lock C:\...\at-verify-poancmeitlmxejofwzuu-44321.lock — head 1a2b3c4d5e6f (clean)`.
The api port comes from the status that answered (`statusApiPort`, moved from db-pool.ts 1418).
No slot number exists to print.

**4. The child environment emitter.** `stackCoordinates(prepared)` returns exactly
`AT_SUPABASE_URL`, `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY`,
`AT_SLOT_ATTESTATION`, and `AT_SUPABASE_MAIL_URL` when the status reports a catcher. The
attestation is unconditional because `prepareStack` always mints one. There is no port refusal
and no project-id refusal: the target was proven by the read, and the values are the read's own
`status`. The spawn at 1395 is unchanged.

**5. The session lifetime.** `supabase/config.toml` line 174 becomes `jwt_expiry = 120` with a
one-line comment naming the two waiting bodies. The number lives once in `atconfig.ts`:

```ts
  accessTokenLifetimeSeconds: {
    name: 'access-token lifetime the local stack issues ([auth] jwt_expiry)',
    value: 120,
    unit: 'seconds',
    source: 'supabase/config.toml [auth] jwt_expiry — pinned to 120 so AT-001.12 and AT-001.13 can wait out a real token inside their four-minute budget; the loop fixture models the same number',
  },
```

`config.ts` `CONFIG_KEYS` gains one row: `'req-001.auth.access_token_lifetime_seconds':
'accessTokenLifetimeSeconds'`. The suites reach it through the dotted-key door `config.ts`
documents, not by importing the registry module. Read sites:

- `_fixture.ts` 426 destructures `config` from `AdapterOptions` (it already carries a
  `ConfigRegistry`, index.ts 50) and line 468 becomes
  `const ACCESS_TOKEN_TTL_MS = config.get<number>('req-001.auth.access_token_lifetime_seconds') * 1000;`.
  The stale "line 165" citations at 117 and 460 go.
- `_integration.ts` 65 (`SLOT_JWT_EXPIRY_MS`) and its comment 57-64 are deleted. Line 487
  becomes `await wait(lifetimeMs(h) + 15_000)` and 559 becomes `Date.now() + lifetimeMs(h) +
  30_000`, with one local helper `const lifetimeMs = (h: Ctx) =>
  h.config.get<number>('req-001.auth.access_token_lifetime_seconds') * 1000;`.
  `INTEGRATION_TIMEOUT_MS = 240_000` stays a literal; it is a budget, not a configured promise.
- Two more sites the task did not list, stated plainly: `b-verification-and-sessions.test.ts`
  405 (`advance(3600 * 1000)`) and 519 (`advance(3599 * 1000)`) become `advance(ttl)` and
  `advance(ttl - 1000)` over the same `h.config` read. Without this the 3599 s advance passes
  a 120 s lifetime and AT-001.13 goes red at loop tier, which `--expect` would catch.

The pin changes nothing in the running Auth until `bun run db:stop` then `bun run db:start`; the
Verification section records that restart.

**6. What changes in runner.ts.** Line 44: the `db-pool.ts` import is replaced by
`import { mintAttestationNonce, writeAttestation } from './attestation.ts';` (no cycle:
attestation.ts imports only capabilities.ts). The integration branch 1332-1369 becomes the
one-screen block in Usage. The header 1-34 is rewritten: the integration tier runs against the
stack `supabase/config.toml` describes; the sequence is lock, prove, reset, prove migrations,
attest, evidence, allowlisted child; the personal-stack sentences go. `stackHelp` 1295-1300
becomes two causes: Docker Desktop is not running; the stack is not started, run `bun run
db:start`. The drill refusal 1320-1330 becomes: the drill tier's stack is not decided, so it
resolves no database; the integration tier is the only tier that touches a stack. One-line
comment touches: `TakeoverPolicy` (326), `readLocalConfig` (240), `MigrationProof` (877),
`SlotIdentityProof` (960), `parseStackStatus` (679), `localStackProblems` (774), which name the
pool or `stackEnv`.

**7. The selftest story.** `runner.selftest.ts`: nothing is deleted. The deletions in `runner.ts`
remove no test, because no test drove the no-target overloads, and the personal-block tests were
in `db-pool.selftest.ts`. The describe at 166 ("a reset aimed at a target demands the identity
read") compiles and passes as it is. Added, two describe blocks, about 130 lines:
(a) `containerNames` splits own from foreign by suffix; (b) `stackIdentity` accepts a result
whose stderr names the two stopped services for the project and whose JSON is the local status;
(c) refuses a foreign container name, naming it; (d) refuses an output with no own name; (e)
refuses a wrong port through `localStackProblems`; (f) refuses a not-running stack and names
`bun run db:start`; (g) `stackCoordinates` emits exactly the six names and omits the mail URL
when the status has none; (h) `stackEvidence` names the project id, the port that answered, the
reset, the counts, the lock file and the head (migrated from db-pool.selftest.ts 582-611);
(i) under `dead-pid-only` a live holder is never displaced at any age, and (j) an
unidentifiable claim file is refused and named (migrated from db-pool.selftest.ts 189-225, now
driven through `acquireStackLock` directly, because the integration path now uses that policy).
`live-ledger.selftest.ts`: unchanged; its `writeAttestation` cases use structural literals that
stay valid. `bun run at:selftest` shrinks by one file, `db-pool.selftest.ts`: 602 lines, 9
describe blocks, 33 cases (the occupancy claim, reservation admission, the branch parser, the
personal-block refusals, the overlay, the path closure, the mirror, the evidence line, the pool
size). Thirteen selftest files become twelve.

**8. The parked layout.** `tests/at/harness/db-pool.ts` and `tests/at/harness/db-pool.selftest.ts`
move to `loop/parked/v1/tests/at/harness/`, with a README there that says the two files are dead
text, are compiled by no tsconfig, and import `./runner.ts` and `./attestation.ts` by paths that
no longer resolve. That location is outside both tsconfigs (`tsconfig.json` includes `src/**`
only; `tests/at/tsconfig.json` includes `tests/at/**`) and outside the vitest include
(`harness/**/*.selftest.ts` under `tests/at`). Nothing else from `tests/at` moves:
`attestation.ts`, `live-email.ts`, `capabilities.ts` and `clock.ts` are the round trip and its
brand, which stay by ruling. `loop/items/AI4DEV-62/verify-first.ts` and `gate2-verify.ts` already
sit outside every tsconfig and are left alone.

**9. Diff estimate.**

| File | Added | Removed | Note |
|---|---|---|---|
| `tests/at/harness/runner.ts` | ~190 | ~90 | new section ~150; import, overloads, `undefined` arms, `readStackStatus`, header, help, drill text, branch |
| `tests/at/harness/runner.selftest.ts` | ~130 | 0 | ten cases in two describe blocks |
| `tests/at/harness/db-pool.ts` | 0 | 1,674 | moved to `loop/parked/v1/tests/at/harness/` |
| `tests/at/harness/db-pool.selftest.ts` | 0 | 602 | moved with it |
| `loop/parked/v1/tests/at/harness/README.md` | ~15 | 0 | dead text, not compiled |
| `supabase/config.toml` | 2 | 1 | `jwt_expiry = 120` and one comment line |
| `tests/at/harness/atconfig.ts` | 8 | 0 | one entry |
| `tests/at/harness/config.ts` | 1 | 0 | one dotted key |
| `tests/at/suites/req-001/_fixture.ts` | 2 | 3 | destructure `config`; the constant; the stale citations |
| `tests/at/suites/req-001/_integration.ts` | 4 | 12 | the helper; the two reads; the deleted constant block |
| `tests/at/suites/req-001/b-verification-and-sessions.test.ts` | 4 | 2 | two advances read the registry |
| Total, moves excluded | ~356 | ~108 | |
