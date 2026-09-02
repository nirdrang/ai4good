# Candidate (Fable lane): subtract first — the one stack is a `CliTarget`, the read is a runner section

Direction: delete before adding. Every destructive act costs a `CliTarget` plus a proof, and the
compiler collects both. No new module. Line numbers are this worktree's.

## Problem

`bun run at:verify req-001 --tier integration --expect` must go green against the one local
stack (project `poancmeitlmxejofwzuu`, api 44321) with nothing on the path importing
`db-pool.ts`. Today the integration branch (`runner.ts` 1332-1370) reaches a database only through
the pool, and the pool refuses that stack by constant. Four things make the shape non-obvious.
(1) The only producer of the proof `writeAttestation` demands (`ProvenSlotRead`, attestation.ts
80-85) is `proveSlotTarget` in the parked file, keyed on `ai4good-slot-N` container names.
(2) The runner keeps a no-target `resetLocalDatabase()` (984) that carries no proof at all; the
explanation's plan routes the one stack through it, which would put an unproven reset beside a
proven attestation write (rulings 2). (3) `stackEnv` (db-pool 1373) refuses the target's ports by
construction, so the child emitter must be new. (4) The session lifetime the integration bodies
wait out is 120 s only inside the parked generator (db-pool 407); the tree says 3600 (config.toml
174). Constraints honoured: nothing imports db-pool.ts; no guard deleted to make the target
legal; the attestation round trip, brand and env names unchanged; manifests untouched; the
hosted-URL wall (`supabaseInvocation`, `childEnv`) kept.

## Usage (caller's view)

**Call site 1 — the integration branch of `main()`, the whole thing** (replaces 1332-1370):

```ts
if (tier === 'integration') {
  // THE ONE STACK, STATED POSITIVELY: the project id this tree's supabase/config.toml declares,
  // at this tree's root. Every CLI call below names it. The reset and the attestation write
  // demand the read that proved it. Every integration run resets this database.
  try {
    const config = readLocalConfig(REPO_ROOT);
    const target: CliTarget = { workdir: REPO_ROOT, projectId: config.projectId };
    lock = acquireStackLock(config, `req-${requirement}`, { takeover: 'dead-pid-only' });
    const read = proveTarget(target);                       // throws, or proves target.projectId
    await waitForReady(read.status, 'before the reset');
    await resetLocalDatabase(target, read);                 // the only reset signature left
    await waitForReady(read.status, 'after the reset');
    const migrations = await proveMigrationsReplayed(read.status, REPO_ROOT);
    const nonce = mintAttestationNonce();
    await writeAttestation(target, read, nonce);            // unchanged; read satisfies ProvenSlotRead
    console.log(evidenceLine(read, migrations, lock));
    Object.assign(stackEnv, childCoordinates(read, nonce));
  } catch (err) {
    return infra(`${(err as Error).message}\n${stackHelp}`);
  }
}
```

What the transcript shows, in order: the identity line from `proveTarget`
(`at:verify — identity proven before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322,
containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu`), the
migration line `proveMigrationsReplayed` already prints, then the evidence line
`at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5 applied
— lock C:\Users\...\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock`.

**Call site 2 — the suite reading the session lifetime** (three files, one source):

```ts
// tests/at/suites/req-001/_fixture.ts (replaces 457-468)
import { AT_CONFIG } from '../../harness/atconfig.ts';
const ACCESS_TOKEN_TTL_MS = AT_CONFIG.accessTokenLifetimeSeconds.value * 1000;

// tests/at/suites/req-001/_integration.ts (replaces 57-65; exported so the loop bodies read it too)
import { AT_CONFIG } from '../../harness/atconfig.ts';
export const ACCESS_TOKEN_LIFETIME_MS = AT_CONFIG.accessTokenLifetimeSeconds.value * 1000;
//   line 487: await wait(ACCESS_TOKEN_LIFETIME_MS + 15_000);
//   line 559: const deadline = Date.now() + ACCESS_TOKEN_LIFETIME_MS + 30_000;

// tests/at/suites/req-001/b-verification-and-sessions.test.ts (line 69 import gains the name)
//   line 405: await h.clock.advance(ACCESS_TOKEN_LIFETIME_MS);          // was 3600 * 1000
//   line 519: await h.clock.advance(ACCESS_TOKEN_LIFETIME_MS - 1000);   // was 3599 * 1000
```

The third file is not in the task's list, and it must change: at 120 s the loop fixture expires a
session after two minutes, and the `3599 * 1000` advance at 519 would land past expiry and turn
AT-001.13's declared loop green red.

**Call site 3 — the selftest, with no stack** (new in `runner.selftest.ts`):

```ts
const target: CliTarget = { workdir: REPO_ROOT, projectId: 'demo' };
const cli = (stderr: string, status = localStatus()): CliResult =>
  ({ status: 1, stdout: JSON.stringify({ API_URL: status.apiUrl, DB_URL: status.dbUrl, ANON_KEY: status.anonKey, SERVICE_ROLE_KEY: status.serviceRoleKey }), stderr });
expect(identityVerdict(cli('Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]'), target, config).provenProjectId).toBe('demo');
expect(() => identityVerdict(cli('Stopped services: [supabase_imgproxy_other]'), target, config)).toThrow(/named supabase_imgproxy_other/);
expect(() => identityVerdict(cli(''), target, config)).toThrow(/ports alone are not identity/);
```

## Shape

### Data structures

```ts
// runner.ts — narrowed. A proof that names no project is no longer representable (per type-system-discipline).
export interface SlotIdentityProof { provenProjectId: string; }            // was string | null

// runner.ts — new. Satisfies SlotIdentityProof (the reset) and attestation.ts's ProvenSlotRead
// (the write) structurally, so both destructive signatures stay exactly as they are.
export interface StackIdentityRead extends SlotIdentityProof {
  status: StackStatus;                                                   // never null: no stack, no read
}
```

Unchanged and reused: `LocalConfig`, `CliTarget`, `CliInvocation`, `CliResult`, `StackStatus`,
`MigrationProof`, `StackLock`, `ProvenSlotRead` and `AttestationTarget` (attestation.ts).

### Signatures (all in `runner.ts`, one new section after the reset section, before "vitest json shape")

```ts
/* ------------------------------------------- the one stack: identity, coordinates, evidence */

/** Moved from db-pool.ts 1084 and 1110, parameter renamed from slotProject to projectId. Same regex, same suffix rule. */
export function foreignContainerNames(text: string, projectId: string): string[] { throw new Error('not implemented'); }
export function ownContainerNames(text: string, projectId: string): string[] { throw new Error('not implemented'); }

/**
 * PURE. The verdict over one `status -o json` result. Order is load-bearing: foreign names first
 * (an identity mismatch must never be reported as "stopped services"), then parse, then the
 * local checks against the target's own config, then at least one OWN name — ports alone are
 * not identity (the 2026-08-09 shape). Every failure throws `REFUSING TO RESET <projectId>: ...
 * Nothing was done.` and names the check, never a value.
 */
export function identityVerdict(res: CliResult, target: CliTarget, config: LocalConfig): StackIdentityRead { throw new Error('not implemented'); }

/** The read that precedes every destructive act: `status -o json` through the seam AS the target, judged above. */
export function proveTarget(target: CliTarget): StackIdentityRead {
  // return identityVerdict(runSupabaseCli(target, ['status', '-o', 'json']), target, readLocalConfig(target.workdir));
  throw new Error('not implemented');
}

/** The six coordinates and nothing else, from a PROVEN read. No port refusal: the target was stated, not avoided. */
export function childCoordinates(read: StackIdentityRead, nonce: string): Record<string, string> {
  // AT_SUPABASE_URL, AT_SUPABASE_DB_URL, AT_SUPABASE_ANON_KEY, AT_SUPABASE_SERVICE_ROLE_KEY,
  // AT_SLOT_ATTESTATION: nonce, and AT_SUPABASE_MAIL_URL only when read.status.mailUrl is set.
  throw new Error('not implemented');
}

/** One line: project id, api port that answered (new URL(read.status.apiUrl).port), reset, migration counts, lock file. No slot number. */
export function evidenceLine(read: StackIdentityRead, migrations: MigrationProof, lock: StackLock): string { throw new Error('not implemented'); }
```

Changed signatures (the subtraction):

```ts
export function supabaseInvocation(target: CliTarget, args: string[]): CliInvocation   // 630: `| undefined` and the `if (!target)` branch (631) deleted
export function runSupabaseCli(target: CliTarget, args: string[]): CliResult           // 657: same
export async function resetLocalDatabase(target: CliTarget, proof: SlotIdentityProof): Promise<void>   // 984-986: one signature; guard loses `target &&`
```

Deleted, with the caller evidence (grep over `tests/at`):

| Deleted | Where | Callers today | After |
|---|---|---|---|
| `resetLocalDatabase()` no-target overload | runner.ts 984 | none (db-pool 1265 and both selftests at 173/179 pass a target) | gone |
| `supabaseInvocation(undefined, …)` branch | runner.ts 631 | only via the two rows below | gone; every CLI call states `SUPABASE_PROJECT_ID` and `--workdir` |
| `readStackStatus(target?)` | runner.ts 673-675 | db-pool.ts 1497 (`setup`'s personal-stack report, parked) | gone |
| `SlotIdentityProof.provenProjectId: null` | runner.ts 966 | `proveSlotTarget`'s informational reads (parked) | unrepresentable |
| import of `evidence, occupy, prepare, stackEnv, Occupancy, PrepareResult` | runner.ts 42-44 | the old branch | replaced by `import { mintAttestationNonce, writeAttestation } from './attestation.ts'` (attestation.ts imports only capabilities.ts: no cycle) |
| every personal-block constant and refusal (`PERSONAL_*` 72-75, `personalBlockProblems` 457, `personalProjectId` 492, `refusePersonal*` 496-522, `stackEnv`'s port and id refusals 1385-1392, `withSlotSql`'s) | db-pool.ts | the pool | parked with the pool; `runner.ts` re-creates none. The positive statement replaces them: the target is `readLocalConfig(REPO_ROOT).projectId` at `REPO_ROOT` |
| the docker probe (`slotDbContainers` 1126, `proveSlotDbContainer` 1140) | db-pool.ts | `resetSlotDatabase`, `stopSlotStack` | not carried over (tradeoff below) |
| `statusApiPort` | db-pool.ts 1418 | `evidence` | one expression inside `evidenceLine` |
| `stackHelp` text, drill-tier refusal text, header lines 10-27 | runner.ts 1295-1300, 1320-1330, 1-34 | prose | rewritten (rulings 12) |

### Module map

- `runner.ts`: unchanged sections (lock 275-548, seam 585-667, status parser 682, local checks 754,
  readiness 854, migrations 875-953, reset 955-1037) plus the new one-stack section (about 110
  lines including comments) and the branch above. Imports `attestation.ts` for the nonce and the
  write. Imports nothing from `db-pool.ts`.
- `attestation.ts`, `index.ts`, `live-email.ts`, `capabilities.ts`, `registry.ts`, `expected.ts`:
  zero code change. `attestation.ts` line 5 names `db-pool.ts`'s `stackEnv` in prose; one word.
- `atconfig.ts`: one entry. `config.ts`: unchanged (no dotted key; the lifetime is not a knob a
  world re-tunes, and the live stack could not honour an override).
- `loop/parked/v1/tests/at/harness/db-pool.ts`, `db-pool.selftest.ts`: moved, byte-identical, plus
  `loop/parked/v1/README.md`.

### Load-bearing decisions

- **Invariants in types.** A destructive act is unreachable without a `CliTarget` and a
  `SlotIdentityProof`; with `provenProjectId: string` the "proves no project" branch is a compile
  error, and the runtime guard keeps only "proves another project" (per type-system-discipline).
  `childCoordinates` takes the read, not a bare status, so coordinates can only be emitted from a
  proven read (the pool's "emitting the wrong one is as destructive as resetting the wrong one",
  now enforced by the parameter type instead of a port refusal).
- **Where validation lives.** All of it at the CLI boundary, in `identityVerdict`, once; the
  branch has no checks of its own (per boundary-discipline). The wall is unchanged and one notch
  tighter: with the target required, no CLI invocation can run without stating the identity.
- **Single source per invariant.** The project id is read from `config.toml` once and flows into
  the lock key, the target, the identity read, the reset, the write and the evidence line. The
  lifetime is one `atconfig` entry read by three suite files.
- **What it deliberately does not do.** It does not restart the stack (the pool restarted its own
  slot on a config change; a restart of the founder's stack would be a fourth destructive act, so
  the help text names `bun run db:stop` and `db:start` instead). It does not take docker's second
  opinion. It does not re-read identity between the read and the reset; one read is the proof for
  both destructive acts, as in the pool's `prepare`.
- **Interface depth.** Public surface: five functions and one type, of which the branch calls
  three (`proveTarget`, `childCoordinates`, `evidenceLine`); `identityVerdict` and the two name
  helpers are exported for the selftest only. Hidden behind `proveTarget`: the seam, the parse,
  the four checks and the config read. Exposed to the caller: the sequence itself, on purpose,
  because the order (lock, prove, reset, prove migrations, write nonce) is the safety argument and
  a reader of `main()` should see it in one screen (per minimize-reader-load). No `prepare()`
  wrapper: it would hide the one thing worth reading and add a result type (per laziness-protocol).

## Synthesis decision

*Filled in by the arena.*

## Tradeoffs accepted

- We accept that every integration run resets the founder's local database, in exchange for one
  stack and no slot code (rulings 5). The evidence line says so on every run.
- We accept one identity instrument (the CLI's own container names) instead of two (plus
  docker), in exchange for no docker dependency on the destructive path. Docker added liveness,
  which `waitForReady` already proves, not identity, which only the CLI's resolution can give.
  The residual is unchanged from the pool: the own-name proof exists because the config disables
  imgproxy and the pooler; a config enabling both prints no "Stopped services" line and the read
  REFUSES (fail closed, loud).
- We accept `--workdir <repo root>` on every CLI call where the old no-target form passed none,
  in exchange for one seam branch fewer. The measured hybrid (618-622) needs cwd and `--workdir`
  to name different projects; here they are the same directory.
- We accept two-minute local development tokens (`jwt_expiry = 120`) for everyone, in exchange
  for AT-001.12 and AT-001.13 staying integration-green inside their 240 s budget and the loop
  model following the same number (rulings 3). supabase-js refreshes silently; raw-token drives
  in the verify skill feel it.
- We accept losing one selftest ("refuses a read that proved no project at all") because the
  compiler now refuses it, in exchange for a smaller runtime guard.
- We accept parked TypeScript whose relative imports no longer resolve, in exchange for a park
  outside every tsconfig. The README says it is dead text, not a spare part.

## Alternatives considered

- **A new module `one-stack.ts` holding the read, emitter and evidence line.** Same interface
  depth, one more file, and it re-creates the runner/pool import cycle (it needs the seam and the
  checks from `runner.ts`, and `runner.ts` needs it). Rejected: the runner already owns every
  neighbour of this code, and the section is about 110 lines.
- **Keep the no-target overloads and route the one stack through them** (explanation section 9,
  step 4). Smallest diff of all, and it exposes an unproven reset beside a proven write: the
  compile-time skip D13 said could not exist. Rejected on rulings 2.
- **Accept `localStackProblems` alone as the proof for the write** (drop the container-name
  requirement). Hides one check from the caller, and re-opens the 2026-08-09 shape (right ports,
  wrong project). Rejected: the target must be stated positively, and the CLI's own output is the
  only positive statement available without docker.
- **Flip the pool's guards in place.** Rejected by the constraints: the path may not import
  `db-pool.ts`, and a polarity flip on four refusals in a file whose header states the opposite
  rule is the deletion-shaped change the rulings forbid.

## Open questions and risks

1. Does the lead want docker as a second instrument on the destructive path? Restoring it is
   about 20 lines (`dbContainers(projectId)` and a check in `proveTarget`) and adds the docker
   binary to the path CI never runs.
2. The `stale-or-dead` takeover policy has no production caller after this change (the only
   caller passes `dead-pid-only`). Delete it now (about 25 lines: `LOCK_STALE_MINUTES`, the age
   arithmetic in `holderIsLive`, `TakeoverPolicy`, `StackLockOptions`, one branch in
   `identified`)? All three lock selftests plant a dead pid or a live fresh holder, so they pass
   under `dead-pid-only` unchanged. Not in the core diff; it is a second subtraction.
3. The running stack picks up `jwt_expiry = 120` only at start. If the founder's stack was started
   before the config change, AT-001.12 fails by timeout, not by a named refusal. Is one
   `bun run db:stop; bun run db:start` after merge acceptable as the procedure, or should the
   read prove the running value (docker inspect of the auth container's environment would; that
   puts docker back on the path)?
4. Nobody has measured the one stack's `status -o json` output. The own-name proof assumes it
   prints `Stopped services: [supabase_imgproxy_poancmeitlmxejofwzuu supabase_pooler_…]` as the
   slots did (measured 2026-08-10). The first live run settles it; a different shape refuses,
   loudly, and the fix is in `identityVerdict` only.
5. `bun run db:reset` and the verify-ai4good drive take no lock (rulings, Consider). The evidence
   line prints the lock file so a later item can teach them to honour it. Confirm "not here".
6. Is the direct `AT_CONFIG` import the right door for the suite, or should the lifetime also get
   a dotted `CONFIG_KEYS` row for `h.config.get`? The direct import is one line per file and the
   fixture already imports harness modules; a dotted key would be a second door for one number.
7. `bun run lint` (`eslint .`) may walk `loop/parked/`; lint is not a CI step. Add an ignore
   entry if it complains.

## Next implementation step

Add the one-stack section to `runner.ts` with `not implemented` bodies, delete the no-target
overload, the `undefined` seam branch and `readStackStatus`, narrow `SlotIdentityProof`, and run
`bun run typecheck`: the compiler's error list is then the exact edit list (the old branch, the
import, one selftest line, and `db-pool.ts`, which leaves for the park).

## The nine answers

1. **Where the identity read lives, and its signature.** A section of `runner.ts`, after the
   reset section: `proveTarget(target: CliTarget): StackIdentityRead`, built on the pure
   `identityVerdict(res: CliResult, target: CliTarget, config: LocalConfig): StackIdentityRead`
   and the two container-name helpers generalized by project id (the workdir travels in the
   target and reaches the CLI through `supabaseInvocation`). It proves the project id positively
   from own container names, refuses foreign names before parsing, keeps `localStackProblems`
   against `readLocalConfig(target.workdir)`, keeps the hosted-URL wall by calling the seam with
   a required target, and returns `{ status, provenProjectId }`, which is the
   `ProvenSlotRead` shape `writeAttestation` demands.
2. **The proof-typed reset as the only reset.** `resetLocalDatabase(target, proof)` becomes the
   one signature; the no-target overload and its implementation branch are deleted (zero
   production callers: db-pool 1265 and the selftest at 173/179 all pass a target). The seam's
   `undefined` branch and `readStackStatus` go with it, so no CLI call of any kind runs without a
   stated identity. `SlotIdentityProof.provenProjectId` narrows to `string`.
3. **The lock and the evidence line.** `acquireStackLock(readLocalConfig(REPO_ROOT),
   `req-${requirement}`, { takeover: 'dead-pid-only' })`, file
   `at-verify-poancmeitlmxejofwzuu-44321.lock`, released by the existing `cleanupRun` chain.
   Evidence: `at:verify — stack <projectId> (api <port from status>) — reset OK — migrations: E
   expected, A applied — lock <file>`. No slot number anywhere.
4. **The child environment emitter.** `childCoordinates(read: StackIdentityRead, nonce: string)`
   returns exactly `AT_SUPABASE_URL`, `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`,
   `AT_SUPABASE_SERVICE_ROLE_KEY`, `AT_SLOT_ATTESTATION`, and `AT_SUPABASE_MAIL_URL` when the
   status reports one. No personal-port refusal; the only admission is the parameter type. It is
   merged into `childEnv` at 1395 as today.
5. **The session lifetime.** `supabase/config.toml` 174: `jwt_expiry = 120`, with a comment
   naming `atconfig.ts` and the reason. The entry:

   ```ts
   accessTokenLifetimeSeconds: {
     name: 'lifetime of an access token issued by the local Auth service (jwt_expiry)',
     value: 120,
     unit: 'seconds',
     source:
       'supabase/config.toml [auth] jwt_expiry, pinned to 120 so AT-001.12 and AT-001.13 wait out a real expiry inside their 240 s budget (lead ruling 2026-09-02); the config comment cites this entry back',
   },
   ```

   Read sites: `_fixture.ts` 468 (`ACCESS_TOKEN_TTL_MS`, comment 457-467 rewritten; its "line
   165" citation is stale today) and `_integration.ts` 65 (`ACCESS_TOKEN_LIFETIME_MS`, exported;
   uses at 487 and 559). A third site follows from the first: `b-verification-and-sessions.test.ts`
   405 and 519 import the exported constant (see Usage, call site 2).
6. **What changes in `runner.ts`.** Line 44: the pool import becomes
   `import { mintAttestationNonce, writeAttestation } from './attestation.ts'`. The integration
   branch: replaced by the 15-line sequence in Usage. The header (10-27): the four numbered steps
   become lock, prove identity from the CLI's own container names, reset and prove migrations,
   write the nonce and print the evidence, with the data cost stated. `stackHelp`: "1. Docker
   Desktop is not installed or not running; 2. Docker is fine but the one stack is not up, or was
   started before `supabase/config.toml` last changed: run `bun run db:stop` then
   `bun run db:start`." Drill refusal: "the drill tier resolves no database: no item has decided
   which stack drill runs against, so this tier refuses rather than guess. The item that decides
   drill's stack replaces this." Six other comments name the pool as measured history (240, 326,
   480, 567, 622, 679); they stay.
7. **The selftest story.** `runner.selftest.ts`: removed, one test, "refuses a read that proved no
   project at all" (178-180; a null proof no longer compiles). Kept, everything else, including
   "refuses a proof that names another project" and the three lock tests. Added, two describes
   (about 50 lines): the container-name helpers (own is a suffix match, foreign is everything
   else, deduplicated) and `identityVerdict` (proves on own names plus a local status; refuses a
   foreign name before parsing; refuses no name at all; refuses a status that fails the local
   checks, naming the check). This is the first CI coverage of the identity read: the pool's
   selftest never exercised `proveSlotTarget` or the helpers. `live-ledger.selftest.ts`: zero
   changes; it drives `attestSlot`, `writeAttestation` and the brand, none of which move.
   `bun run at:selftest` shrinks by `db-pool.selftest.ts`: 9 describe blocks, 33 tests, about
   670 lines, among them the two-process occupy race, the personal-stack refusals (4), the
   generator overlay (6) and the pool-size arithmetic (4); each goes with the code it tests.
8. **The parked layout.** `git mv tests/at/harness/db-pool.ts loop/parked/v1/tests/at/harness/`
   and the same for `db-pool.selftest.ts`, byte-identical, plus `loop/parked/v1/README.md`
   ("dead text: not compiled, not run, not a spare part; what moved and why; never run
   `db-pool.ts setup`"). Outside every tsconfig: the root config includes `src/**`,
   `vite.config.ts`, `eslint.config.js`; `tests/at/tsconfig.json` includes `**/*` relative to
   `tests/at`; vitest's include is relative to `--root tests/at`; CI's fast lane reads `loop/` as
   prose. Nothing else from `tests/at` moves: `attestation.ts`, `live-email.ts` and the `'slot'`
   brand are names, not slot machinery (rulings, Noted). `loop/work/db-slots.ps1` goes to
   `loop/parked/v1/loop/work/` in the same move; it is outside the harness.
9. **Diff estimate.**

   | File | Change | Added | Removed |
   |---|---|---|---|
   | `tests/at/harness/runner.ts` | header, import, seam target required, overload and `readStackStatus` deleted, new section, branch, help and drill text | ~170 | ~90 |
   | `tests/at/harness/runner.selftest.ts` | two describes added, one test removed | ~50 | ~4 |
   | `tests/at/harness/atconfig.ts` | one entry | 8 | 0 |
   | `tests/at/harness/attestation.ts` | one prose word | 1 | 1 |
   | `tests/at/harness/index.ts`, `live-ledger.selftest.ts`, `config.ts` | none | 0 | 0 |
   | `supabase/config.toml` | `jwt_expiry = 120` and its comment | 5 | 1 |
   | `tests/at/suites/req-001/_fixture.ts` | import, constant, comment | 4 | 8 |
   | `tests/at/suites/req-001/_integration.ts` | import, exported constant, comment, two uses | 8 | 10 |
   | `tests/at/suites/req-001/b-verification-and-sessions.test.ts` | import name, two advances, comment | 4 | 4 |
   | `tests/at/harness/db-pool.ts`, `db-pool.selftest.ts` | moved to `loop/parked/v1/…` unchanged | 0 | 0 (about 2,300 lines leave `tests/at`) |
   | `loop/parked/v1/README.md` | new | ~20 | 0 |
   | `.claude/settings.json` | `AT_DB_SLOT` env removed (rulings 6; outside these nine questions) | 0 | 1 |

   Total: about +270 / −120 in edited files, plus the move. Nine files edited, two moved, one
   created.
