# The one-stack integration path — a stack-identity module the runner composes

Design candidate (opus lane). Direction: move the pool functions that are not slot-specific in
substance into one small module keyed by project id and workdir; the runner composes it with its
own lock, reset, attestation and env.

## Problem

`bun run at:verify req-001 --tier integration --expect` must run green against the one local stack
(project `poancmeitlmxejofwzuu`, api 44321) with no slot code on the path. Today the runner's
integration branch resolves a database only through `db-pool.ts`, and that file refuses this exact
stack by constant in four places. The item parks the pool as a unit, so the refusals leave with it;
what does not leave with it is the work they guarded. Four constraints shape the answer.
`writeAttestation` will not write unless it is handed a read whose `provenProjectId` equals the
target's, and `proveSlotTarget` is the only producer of such a read in the tree — so parking the
pool removes the producer of the proof every integration green depends on. `resetLocalDatabase`
refuses a target whose proof names another project, and the ruling deletes its no-target overloads,
so the one stack must be driven as a `CliTarget`. `stackEnv` throws on ports 44320–44329 by
construction and cannot be reused. And the 2026-08-09 incident recorded in the pool's own comment
says ports alone are not identity: a reset reported the right ports while resolving another project.
The new code sits on the destructive path, so it is the most safety-critical code this item writes.

## Usage (caller's view)

What a person runs does not change:

```
bun run db:start                                      # the one stack, once
bun run at:verify req-001 --tier integration --expect  # 16 green, 21 declared red, exit 0
```

The transcript loses the slot number and gains a line naming the lock and one naming the token
lifetime (answer 3 below carries both, verbatim).

**Call site 1 — the runner's integration branch.** This is the whole of it, and it reads in one
screen:

```ts
if (tier === 'integration') {
  const config = readLocalConfig(REPO_ROOT);
  const target: CliTarget = { workdir: REPO_ROOT, projectId: config.projectId };

  try {
    // dead-pid-only: a verify that waits out two token lifetimes must not be reset under.
    lock = acquireStackLock(config, `req-${requirement}`, { takeover: 'dead-pid-only' });
  } catch (err) {
    return infra((err as Error).message);
  }

  let prepared: ProvenLocalStack;
  try {
    prepared = await prepareLocalStack(target);
  } catch (err) {
    return infra(`${target.projectId} could not be prepared: ${(err as Error).message}\n${stackHelp}`);
  }

  console.log(localEvidence(prepared, lock));
  Object.assign(stackEnv, localStackEnv(prepared));
}
```

**Call site 2 — the selftest, through the seams.** The container-name instrument has no test today
(a grep for `ownContainerNames` outside `db-pool.ts` returns one doc comment and no caller). The
move buys it one, with no Docker and no stack:

```ts
const seams: IdentitySeams = {
  readStatus: () => ({ status: 0, stdout: HYBRID_JSON, stderr: 'Stopped services: [supabase_imgproxy_ai4good-slot-1]' }),
  runningDbContainers: () => ['supabase_db_poancmeitlmxejofwzuu'],
};
expect(() => proveLocalTarget(target, 'reset', { destructive: true, seams })).toThrow(
  /REFUSING TO RESET poancmeitlmxejofwzuu: .*supabase_imgproxy_ai4good-slot-1/,
);
```

**Call site 3 — the hand-off to the attestation, inside `prepareLocalStack`.** The proof travels
into both destructive acts as a parameter, so no importer reaches either without it:

```ts
const read = proveLocalTarget(target, 'reset', { destructive: true });
await resetLocalDatabase(target, read);          // refuses unless read.provenProjectId === target.projectId
await writeAttestation(target, read, nonce);     // same refusal, and reads the dbUrl out of the read
```

The child sees no difference at all. The six environment names, the nonce round trip, the `'slot'`
brand, `LiveSlotCoordinates` and `_live.ts` are untouched. Every line of this change is parent-side.

## Shape

**Module map.** One new file, `tests/at/harness/stack-identity.ts`, about 185 lines, holding the
functions that are not slot-specific in substance, keyed by a `CliTarget` rather than by a slot
number. It imports from `runner.ts` and `runner.ts` imports from it — the same cycle `db-pool.ts`
had, safe for the same stated reason: neither module calls the other at module scope and both export
hoisted function declarations. The composition (lock, prepare, env, evidence) stays in `runner.ts`
as one section, beside the pieces it composes.

```ts
/* tests/at/harness/stack-identity.ts — which project answers, proven from the CLI's own output. */

/** Supabase container names in CLI output that do NOT end in `_<projectId>`. */
export function foreignContainerNames(text: string, projectId: string): string[] { throw new Error('not implemented'); }

/** Supabase container names in CLI output that DO — the positive half. */
export function ownContainerNames(text: string, projectId: string): string[] { throw new Error('not implemented'); }

/** Docker's own answer: the running `supabase_db_<projectId>` containers. Fails closed. */
export function dbContainers(projectId: string): string[] { throw new Error('not implemented'); }

/**
 * What the running Auth container says its access-token lifetime is, in seconds, or null when the
 * instrument could not say. FAILS OPEN, deliberately — see Tradeoffs.
 */
export function runningTokenLifetime(projectId: string): number | null { throw new Error('not implemented'); }

/** Selftest seams. The harness passes them nowhere; they substitute the instrument, never the verdict. */
export interface IdentitySeams {
  readStatus?: (target: CliTarget) => CliResult;
  runningDbContainers?: (projectId: string) => string[];
  authTokenLifetime?: (projectId: string) => number | null;
}

/** The read, in exactly the shape `resetLocalDatabase` and `writeAttestation` already demand. */
export interface StackIdentityRead extends SlotIdentityProof {
  status: StackStatus | null;      // the stack's own report, when one answered
  notRunning: string | null;       // why none did; never a mismatch — a mismatch throws
  provenProjectId: string | null;  // POSITIVE: a container name the CLI itself printed
  containers: string[];            // the own names, for the transcript
}

/**
 * THE PRE-DESTRUCTIVE IDENTITY READ, for any local target.
 *   1. every `supabase_*` name in the output ends in this project id;
 *   2. the ports, hosts and issuers the stack reports are this config's (`localStackProblems`);
 *   3. destructive only: at least one name IS this project's — absence of contrary evidence is not
 *      identity, which is the shape the 2026-08-09 hybrid wore;
 *   4. destructive only: docker shows `supabase_db_<projectId>` running.
 * A stack that is simply down is `notRunning`, not a mismatch.
 */
export function proveLocalTarget(
  target: CliTarget,
  act: string,
  opts?: { destructive?: boolean; seams?: IdentitySeams },
): StackIdentityRead { throw new Error('not implemented'); }
```

```ts
/* tests/at/harness/runner.ts — the one-stack section the integration branch calls. */

/** Everything the sequence established. The ONLY producer of the child's coordinates. */
export interface ProvenLocalStack {
  target: CliTarget;
  read: StackIdentityRead;
  migrations: MigrationProof;
  attestation: string;
  tokenLifetimeSeconds: number | null;
}

/** Prove, wait, reset, wait, prove the migration set, mint and write the nonce. In that order. */
export async function prepareLocalStack(target: CliTarget): Promise<ProvenLocalStack> { throw new Error('not implemented'); }

/** The six values, and nothing else. No port refusal; the proof is the admission. */
export function localStackEnv(prepared: ProvenLocalStack): Record<string, string> { throw new Error('not implemented'); }

/** project id, api port THAT ANSWERED, reset, migration counts, lock file. No slot number. */
export function localEvidence(prepared: ProvenLocalStack, lock: StackLock): string { throw new Error('not implemented'); }
```

**Data first, and the invariants sit in those two structures.** `StackIdentityRead` widens
`SlotIdentityProof`, which `resetLocalDatabase` takes, and satisfies `ProvenSlotRead`, which
`writeAttestation` takes — so the new module produces the object both destructive acts already
demand, and neither signature changes. "A target costs a proof and the compiler collects it" (audit
ruling D13) is therefore preserved rather than re-invented, by driving the one stack as a
`CliTarget` instead of teaching the reset a second untargeted mode. `ProvenLocalStack` is the second
structure, and its job is admission: `localStackEnv` and `localEvidence` take it and nothing else,
so nothing can emit coordinates or print a green over a status nothing proved. That moves one
invariant out of run-time constants and into a type — "the coordinates a child sees came from a
proven read" was four port comparisons inside `stackEnv`. `localStackEnv` still re-asserts
`read.provenProjectId === target.projectId` in one line, because the struct is exported and a caller
could hand-build one; `writeAttestation` keeps the same belt-and-braces for the same reason.

**Validation lives at the boundary** with the CLI and Docker, inside `proveLocalTarget`
(`per boundary-discipline`). The integration branch checks nothing itself and nothing downstream
re-reads the config.

**What it deliberately does not do.** It does not refuse the personal port block, because that block
is now the target. It does not re-read identity a second time before the reset: the pool did, because
`resetSlotDatabase` was a separate exported entry point, and there is none here. It does not mirror a
tree, generate a config, restart a stack, or extend the lock to `db:reset` and the drive skill.

**Interface depth.** Five functions, two interfaces. Hidden: the CLI invocation and its environment
wall, the raw-output parse, two container-name filters, `localStackProblems`, the docker probe, the
readiness waits, the migration proof, the nonce write, and the ordering between them. Exposed:
`CliTarget` (two strings the caller already holds from `readLocalConfig`), and the fact that a read
can say "nothing was running". No smaller, because the runner needs the lock and the proof
separately — the lock is held before the read, and the read must outlive the reset to reach the
attestation write.

## Synthesis decision

*Filled in by arena.*

## Tradeoffs accepted

- **A new module and its cycle with `runner.ts`, in exchange for the tree's most safety-critical
  functions having a name, a file and a selftest of their own.** Folded into `runner.ts` they would
  sit between argument parsing and vitest report grading. This is the closest call; see Alternatives.
- **A docker read on every integration run, in exchange for a second independent instrument on the
  destructive path.** On a slot, a hybrid invocation announced itself as a foreign container name.
  On the one stack the `SUPABASE_PROJECT_ID` wall now states the same value the tracked `.env`
  states, so it can no longer tell those two apart — it protects against a hosted URL and a stray
  second variable, and nothing else. Docker says what is actually running under this project name,
  reads no config, and does not depend on the pinned CLI's output shape. Hence "own container name
  AND docker", never OR.
- **Docker absent is an infrastructure refusal — exit 3, no tests run.** Mostly already paid: the
  CLI cannot reach a stack without a container runtime either. The new cost is a machine whose
  runtime is reachable but whose `docker` binary is not — a podman shim. `childEnv` carries
  `DOCKER_HOST`, `DOCKER_CONTEXT`, `DOCKER_CONFIG` and `DOCKER_CERT_PATH`, so a remote context still
  works; a podman-only machine refuses loudly, naming the probe. CI pays nothing: it never runs this
  tier.
- **A two-minute local session lifetime, in exchange for two ids that wait out a real expiry inside
  a four-minute budget.** `supabase-js` refreshes, so `bun run dev` is unaffected. A copied raw token
  — a curl by hand, a captured bearer in a drive session — dies after two minutes.
- **One check the rulings did not ask for: the running Auth's token lifetime is read and printed,
  and it fails OPEN.** Without it, pinning `jwt_expiry = 120` has no effect until someone restarts
  the stack, and the symptom is two red ids that look like product defects. Identity checks fail
  closed; this one names what it could not read and continues, because a missing `GOTRUE_JWT_EXP`
  cannot destroy anything while refusing on it would block every run for no product reason.
- **Three legacy signatures deleted: the no-target `resetLocalDatabase` overloads,
  `readStackStatus`, and the `undefined` branch of the CLI seam.** No guard is weakened. The seam's
  own comment says the positive form is the stronger wall — "an absence can be reintroduced by any
  parent process, a positive value cannot" — so this removes the last way to run the CLI with no
  stated identity (`per migrate-callers-then-delete-legacy-apis`).
- **Every integration run resets the founder's local database.** The pool was the separate-before-you-
  serialize answer and the founder ruled it out, so serialization is what is left — and the lock
  serializes `at:verify` against `at:verify` only. `bun run db:reset` and the drive skill take no
  lock and can still collide. The evidence line names the lock file; extending it to those two
  writers is filed, not built.

## Alternatives considered

- **Teach `db-pool.ts` a "slot 0" that is the one stack.** Rejected. It keeps 1,827 lines on the
  path, keeps the reservation read and the port arithmetic, and requires inverting four refusals in a
  file whose header states the opposite rule as load-bearing. It fails "no slot code on the path"
  outright, and the cheap way to invert a refusal is to delete it — the failure mode all three
  critics named.
- **A new section inside `runner.ts`, no new module.** The real contender, and it loses narrowly.
  Interface depth is identical: the integration branch reads the same either way, and nothing extra
  is hidden or exposed. Naming and coverage decide it — `runner.ts` grows from 1,467 to about 1,650
  lines with no boundary around the code that decides whether a reset may proceed, and the tree's
  convention is a selftest file per module, which is how these functions finally get one. A module
  also leaves room for the second consumer the rulings filed as "Consider" (a lock and identity check
  for `db:reset` and the drive skill) without exporting it out of the runner's grab bag.
- **Accept `localStackProblems` alone as the proof for the attestation write** (the explanation's
  section 9, step 5, second option). Rejected: strictly weaker than today's destructive-path rule, it
  reopens the 2026-08-09 hole of right ports and wrong project, and it can only be built by weakening
  `writeAttestation`'s refusal or fabricating a `provenProjectId` — lying to the compiler about a
  fact nothing established.
- **Keep `jwt_expiry = 3600` and declare AT-001.12 and AT-001.13 red at integration with a
  `capability-pending` naming the missing lever.** Rejected by ruling 3, and named because it is the
  only option that leaves the founder's local session lifetime alone. It costs a manifest edit and
  moves the integration green count from 16 to 14.

## Open questions and risks

1. **The session-lifetime pin has four read sites, not two, and one of them turns a declared loop
   green red if it is missed.** `b-verification-and-sessions.test.ts` line 519 advances the loop clock
   by `3599 * 1000` and then asserts both sessions still work; against a 120-second model that is far
   past expiry, both writes are refused, and AT-001.13 goes red at the loop tier. Line 405 advances
   by exactly `3600 * 1000` to pin the strict-versus-inclusive expiry boundary; against a 120-second
   model it lands an hour past that boundary and stays green while proving nothing. Both must read
   the registry. Is the founder content for the loop tier's boundary to sit at 120 seconds?
2. **Does the running Auth honour a changed `jwt_expiry` without a restart?** The pool restarted a
   slot whenever its config hash changed, because the auth container reads its config at start. The
   one-stack path has no restart step and should not gain one — restarting the founder's stack is not
   a verify run's business. Should the pull request carry a one-time
   `bun run db:stop && bun run db:start` instruction, with the fail-open lifetime check as the
   standing reminder, or should that check refuse instead?
3. **The positive-name instrument depends on the repo config disabling imgproxy and the pooler.**
   Those two stopped services are the only container names `supabase status` prints. Enabling
   `[storage.image_transformation]` would leave the read with no positive evidence and every
   integration run would refuse. Under the pool this coupling was to a generated config; now it is to
   the file the founder edits. Should the docker probe be permitted to supply the positive project
   name when the CLI prints none, or should the refusal stand?
4. **`dead-pid-only` on the founder's own stack.** An unreadable or half-written claim file refuses
   loudly and names manual deletion rather than being taken over. On a shared build machine that was
   right; here it blocks the founder's own verify until a file is deleted by hand. Keep it, or allow
   `stale-or-dead` with its 60-minute window, which a four-minute run can never reach?
5. **Nobody has run any of this.** No colour here comes from an execution. Whether the 44321 stack is
   up, what lifetime its GoTrue really issues, and whether Mailpit answers on 44324 are all
   unmeasured. The first step is a measurement, not an edit.

## Next implementation step

Run `bun run db:start`, then capture `supabase status -o json` and
`docker ps --filter name=supabase_db_poancmeitlmxejofwzuu` — the two facts the whole identity read
rests on — before a line of `stack-identity.ts` is written.

---

# The nine answers

**1. Where the one-stack identity read lives, and its exact signature.**
`tests/at/harness/stack-identity.ts`, about 185 lines, keyed by a `CliTarget` (workdir plus project
id) and by nothing else: `proveLocalTarget(target, act, opts?: { destructive?: boolean; seams?:
IdentitySeams }): StackIdentityRead`, as sketched in Shape. It runs
`runSupabaseCli(target, ['status', '-o', 'json'])` through the one CLI seam, so the read and the
destructive act resolve identically; it refuses on any `supabase_*` token not ending in
`_<projectId>`; it runs `localStackProblems(status, readLocalConfig(target.workdir))`, which keeps
loopback, the configured 44321/44322/44324, `iss=supabase-demo` and no hosted `ref`; and on a
destructive act it also requires one own container name plus a `docker ps` match for
`supabase_db_<projectId>`. `StackIdentityRead` extends `SlotIdentityProof` and satisfies
`ProvenSlotRead` — exactly the object `writeAttestation` demands. The hosted-URL wall is unchanged,
and for this target the CLI's working directory equals `--workdir`, so the measured 2026-08-10
hybrid shape cannot arise.

**2. How the proof-typed reset stays the only reset on the path.**
The one stack is driven as a `CliTarget`, so the path is `resetLocalDatabase(target, read)` and
nothing else. The no-target overloads are **deleted**: zero production callers today (drill refuses,
loop never resets, the pool always went through the targeted form), and after this change they would
be the only way to reset without a proof — the compile-time skip audit ruling D13 says cannot exist.
`runner.selftest.ts`'s two reset-refusal tests already pass a target and do not change.
`readStackStatus` goes with them, orphaned by the park; `supabaseInvocation` and `runSupabaseCli`
narrow to a required `CliTarget`.

**3. The lock and the evidence line.**
`acquireStackLock(readLocalConfig(REPO_ROOT), 'req-001', { takeover: 'dead-pid-only' })`, taken
before the identity read and released in the existing `cleanupRun` chain. The file is
`%LOCALAPPDATA%\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock`. The evidence line:

```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5 applied — lock at-verify-poancmeitlmxejofwzuu-44321.lock
```

The api port is read from the status that answered, never from the config (ruling A3's idiom, kept).
No slot number appears. The token-lifetime finding prints as its own line, so the ruled evidence line
carries exactly the five facts ruling 5 names.

**4. The child environment emitter.**
`localStackEnv(prepared: ProvenLocalStack)` emits six values and nothing else: `AT_SUPABASE_URL`,
`AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY`, `AT_SLOT_ATTESTATION`,
`AT_SUPABASE_MAIL_URL` (the last two conditional, as today). No personal-port refusal and no personal
project-id refusal: both were the parked file's rule about a target that is now the target. Admission
by type replaces them, plus one re-asserted line comparing `read.provenProjectId` to
`target.projectId`. The names do not change, so `liveCoordinatesFromEnv`,
`attestationCoordinatesFromEnv`, `createLiveEmail` and the two direct `process.env` reads in
`_integration.ts` keep working untouched.

**5. The session lifetime.**
`supabase/config.toml` line 174 becomes `jwt_expiry = 120`, with the reason written beside it. The
number lives once in `atconfig.ts`:

```ts
authAccessTokenTtlSeconds: {
  name: 'lifetime of an access token issued by the local Auth stack',
  value: 120,
  unit: 'seconds',
  source:
    'supabase/config.toml [auth] jwt_expiry — pinned to 120 by this item so AT-001.12 and AT-001.13 ' +
    'can wait out a real expiry inside a bounded budget. The parked slot generator used to overlay ' +
    'the same 120 onto a generated config; this entry replaces that overlay.',
},
```

`config.ts` gains one dotted key,
`'req-001.auth.access_token_ttl_seconds': 'authAccessTokenTtlSeconds'`.

Read site A, `_fixture.ts` line 468. The harness already passes a `ConfigRegistry` to
`createFixtureAdapter`; req-001's adapter destructures only `{ clock, worlds }` today. It gains
`config`, and the constant becomes
`const ACCESS_TOKEN_TTL_MS = config.get<number>('req-001.auth.access_token_ttl_seconds') * 1000;`.
At the loop tier the number is *model* configuration, so it travels through the registry and a world
override re-tunes the model coherently.

Read site B, `_integration.ts` lines 65 and 83. `SLOT_JWT_EXPIRY_MS` becomes a module-scope read of
the entry itself, `AT_CONFIG.authAccessTokenTtlSeconds.value * 1000`, and `INTEGRATION_TIMEOUT_MS`
derives from it (`+ 120_000`, today's 240 s) instead of being a second literal. Read directly rather
than through `h.config` for a reason worth stating: at the integration tier this number is a fact
about a **running stack**, not a knob a world may re-tune, and the override-capable registry would
let an override desynchronise the test from the GoTrue under it.

Two further read sites the rulings did not name, and they are not optional — see risk 1:
`b-verification-and-sessions.test.ts` line 405 (`advance(3600 * 1000)` → `advance(ttlMs)`) and line
519 (`advance(3599 * 1000)` → `advance(ttlMs - 1000)`), both through `h.config.get(…)`, which those
loop bodies already have in scope.

**6. What changes in `runner.ts`.**
- **Header (10–26):** the integration tier targets the stack this repository's own `config.toml`
  describes; the sequence is lock, prove identity from the CLI's container names and from Docker,
  reset, prove the migration set, mint and write the nonce, hand over six coordinates. The sentence
  calling that stack untouchable goes.
- **Line 44:** the `db-pool.ts` import becomes
  `import { proveLocalTarget, type StackIdentityRead } from './stack-identity.ts'`, plus
  `mintAttestationNonce, writeAttestation` from `./attestation.ts`. The cycle comment moves with it.
- **New section, about 95 lines:** `ProvenLocalStack`, `prepareLocalStack`, `localStackEnv`,
  `localEvidence`, and the small `statusApiPort` helper that comes back from the parked file.
- **Integration branch (1332–1370):** 39 lines become about 22, shown in Usage. The `AT_DB_SLOT` read
  at line 1338 goes; nothing in the harness reads that variable afterwards.
- **`stackHelp` (1295–1300):** Docker not installed, not running, or its CLI not on PATH; or Docker
  fine and the stack not up — `bun run db:start`. The `db-pool.ts setup` sentence goes.
- **Drill refusal (1320–1330):** keeps exit 3, loses the inverted rule. Drill has never named a stack
  of its own; the item that decides one replaces this refusal.
- **Deletions:** the two no-target `resetLocalDatabase` overloads, `readStackStatus`, and the
  `undefined` branch of the CLI seam.

**7. The selftest story.**
`runner.selftest.ts` gains one describe — "the one-stack identity read states its target positively",
about 95 lines and six tests, all driven through `IdentitySeams` with no Docker and no stack:
`ownContainerNames` finds this project's names and not a slot's; `foreignContainerNames` reports a
slot name in this project's output (the hybrid, caught from the other side); a destructive read over
output naming no own container refuses (the vacuous-pass closure); a destructive read whose docker
probe returns nothing refuses and names the probe; a docker probe that throws refuses rather than
proceeding; and a non-destructive read over a stack that is down returns `notRunning`. Nothing else
in the file changes — the reset-refusal describe at 166–181 already passes a `CliTarget`. These
functions have **no test at all today**, so this is coverage the item adds rather than moves.

`live-ledger.selftest.ts` gains one test of about 14 lines inside its existing "the attestation WRITE
demands the identity read that proved its target" describe: a `StackIdentityRead` handed to
`writeAttestation` with a mismatched target must produce the same refusal. It pins the structural
contract between the new module and `attestation.ts` once the pool that held it is gone. Nothing else
there changes; that file drives `attestSlot`, `createLiveEmail` and `buildLiveLedger` through their
own seams and never imported the pool.

`bun run at:selftest` shrinks by `db-pool.selftest.ts`: 668 lines, 33 tests in 9 describes, 13 files
down to 12, and 13.3 of the roughly 40 seconds of per-file time recorded in vitest's cached results
for this worktree (read from `tests/at/node_modules/.vite/…/results.json`, not measured by me).
Eight of those nine describes cover machinery that leaves with the pool — occupancy, admission
control, the branch parser, the personal-block refusals, the identity overlay, the path closure, the
mirror and the pool size. The ninth, the evidence line, has a successor in `localEvidence`.

The new tests go into `runner.selftest.ts` rather than a fourteenth file, because every function they
exercise is runner stack-plumbing that moved one file sideways. If the lead prefers the
module-per-selftest convention, `stack-identity.selftest.ts` is the same 95 lines elsewhere and the
count stays at 13.

**8. The parked layout.**
`loop/parked/v1/tests/at/harness/db-pool.ts` and `…/db-pool.selftest.ts`, moved with `git mv` and not
edited. `loop/parked/v1/` is outside `tests/at`, so it is in neither tsconfig —
`tests/at/tsconfig.json` includes `**/*` on purpose, so a park inside that tree would stay in
`bun run typecheck`. It is outside `harness/`, so `at:selftest`'s `harness/**/*.selftest.ts` glob no
longer matches it. `loop/parked/v1/README.md` says the files are dead text under version control, not
compiled and not run, that their relative imports of `./runner.ts`, `./check.ts` and
`./attestation.ts` no longer resolve, and that they still carry the personal-stack refusals this tree
no longer believes — a record, not a spare part that still fits.

**Nothing else from `tests/at` moves.** `attestation.ts`, `live-email.ts`, `capabilities.ts`,
`clock.ts` and `index.ts` are slot-shaped in their **names** only. The brand `'slot'`,
`AT_SLOT_ATTESTATION`, `at_runtime.slot_attestation`, `attestSlot`, `LiveSlotCoordinates`,
`ProvenSlotRead` and `SlotIdentityProof` all stay: the round trip they implement is the spine of
every integration green, and renaming is leftover cleanup, not a dependency. Outside `tests/at`,
`loop/work/db-slots.ps1` goes to `loop/parked/v1/loop/work/`, because the reservation files it writes
have no reader once `occupy` is parked.

**9. Diff estimate.**

| File | + | − | What |
|---|---:|---:|---|
| `tests/at/harness/stack-identity.ts` (new) | 185 | 0 | two name filters, the docker probe, the lifetime read, `proveLocalTarget`, the seams |
| `tests/at/harness/runner.ts` | 155 | 90 | header, import, one-stack section, integration branch, stackHelp, drill text, three deletions |
| `tests/at/harness/runner.selftest.ts` | 95 | 2 | the identity describe |
| `tests/at/harness/live-ledger.selftest.ts` | 14 | 0 | the shape contract with `writeAttestation` |
| `tests/at/harness/atconfig.ts` | 10 | 0 | the token-lifetime entry |
| `tests/at/harness/config.ts` | 1 | 0 | the dotted key |
| `tests/at/suites/req-001/_fixture.ts` | 8 | 6 | `config` in the adapter options; the TTL from the registry |
| `tests/at/suites/req-001/_integration.ts` | 14 | 12 | the module-scope read; the derived budget; two waits |
| `tests/at/suites/req-001/b-verification-and-sessions.test.ts` | 8 | 5 | the two loop advances read the registry |
| `supabase/config.toml` | 4 | 1 | `jwt_expiry = 120`, with the reason |
| `loop/parked/v1/README.md` (new) | 25 | 0 | dead text, not compiled |
| `db-pool.ts` → `loop/parked/v1/tests/at/harness/` | — | — | 1,827 lines moved, unedited |
| `db-pool.selftest.ts` → `loop/parked/v1/tests/at/harness/` | — | — | 668 lines moved, unedited |
| **Total edited** | **~519** | **~116** | plus 2,495 lines moved |

Compiled and run under `tests/at/harness/`: 34 files and 15,493 lines today, 33 files and about
13,370 lines after. No manifest is edited, no acceptance id changes, and no file under
`tests/at/expected/` is touched.
