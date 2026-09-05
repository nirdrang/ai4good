# Design package: one-stack integration path via a small identity module

Assumptions: the one stack is project `poancmeitlmxejofwzuu` on api 44321, db 44322, mail 44324 as read in `supabase/config.toml`; Docker is the container runtime on a verify machine; GoTrue reads session lifetime at start so a config pin needs a restart to take effect. I read the explanation, the lead rulings, and the touched code (runner, pool container helpers and prepare, attestation, live ledger, suite waits, both selftests, the Supabase config) and did not run any stack. Simplicity rule followed: one new module, everything else is composition of existing runner pieces.

## Problem

`bun run at:verify req-001 --tier integration --expect` must run green against the one local stack with no slot code on the path. Today the integration branch in `tests/at/harness/runner.ts` resolves a database only through the slot pool in `tests/at/harness/db-pool.ts`, and the pool refuses that very stack by constant: the personal-port block 44320-44329, the personal project id, and the env emitter guard. The pool is parked as a unit. The repoint is therefore a polarity flip on four guards, not a wiring change: keep the runner's target-neutral pieces (machine lock, CLI seam, loopback and port and issuer checks, readiness wait, migration proof, proof-typed reset, attestation round trip) and add one new identity read for the one project built from the pool's own container-name instruments. The constraint that forces the shape is that nothing on the integration path may import the pool afterwards, no guard may be deleted to make the target legal, the attestation round trip and its names stay, the expect manifests stay untouched, and at most one new module is allowed.

## Usage (caller's view)

The caller is the runner's integration branch. It reads in one screen. No slot number, no reservation, no `AT_DB_SLOT`.

```ts
import { proveLocalTarget } from './stack-identity.ts';

if (tier === 'integration') {
  const config = readLocalConfig(REPO_ROOT);
  const target = { projectId: config.projectId, workdir: REPO_ROOT };
  lock = acquireStackLock(config, `req-${requirement}`, { takeover: 'dead-pid-only' });
  const read = proveLocalTarget(target, 'prepare', config, { destructive: false });
  if (!read.status) return infra(`one-stack ... reported no running stack (${read.notRunning}) ...`);
  await waitForReady(read.status, 'before the one-stack reset');
  await resetOneStack(target, 'reset'); // proves again inside, resets, waits, proves migrations
  const prepared = await finishOneStack(target, requirement); // attestation + status + migrations
  console.log(oneStackEvidence(prepared, lock.file));
  Object.assign(stackEnv, oneStackEnv(prepared.status, prepared.attestation));
}
```

Call site two, the destructive path itself (`resetOneStack`, lives in the runner next to the reset):

```ts
const read = proveLocalTarget(target, 'reset', config, { destructive: true });
if (!read.status) throw new Error(`refusing to reset ... no running stack ...`);
proveTargetDbContainer(target.projectId, 'reset'); // docker ps, second instrument
await resetLocalDatabase(target, read); // proof-typed overload only; mismatch refuses
await writeAttestation(target, read, nonce); // ProvenSlotRead-shaped proof, unchanged shape
```

Call site three, selftests: `runner.selftest.ts` drives `proveLocalTarget` against canned CLI output and a fake docker listing, the same way it drives `localStackProblems` today. No container needed.

What the caller never does: name a slot, read a reservation file, generate a config, mirror a tree, or check a personal-port block. The target is stated positively from the repo config; the wall that strips stray `SUPABASE_*` variables and pins the workdir stays inside `supabaseInvocation`.

## Shape

Data first. `CliTarget` (`{ workdir, projectId }`) and `SlotIdentityProof` (`{ provenProjectId }`) already exist in the runner and are reused unchanged, so `resetLocalDatabase` and `writeAttestation` keep their signatures. The new module adds one read type:

```ts
// tests/at/harness/stack-identity.ts — not implemented bodies shown as throws
import type { CliTarget, LocalConfig, StackStatus, SlotIdentityProof } from './runner.ts';

export interface LocalIdentityRead extends SlotIdentityProof {
  status: StackStatus | null;
  notRunning: string | null;
  provenProjectId: string | null;
}
export function foreignContainerNames(text: string, projectId: string): string[] { throw new Error('not implemented'); }
export function ownContainerNames(text: string, projectId: string): string[] { throw new Error('not implemented'); }
export function stackDbContainers(projectId: string): string[] { throw new Error('not implemented'); }
export function proveTargetDbContainer(projectId: string, act: string): void { throw new Error('not implemented'); }
export function proveLocalTarget(target: CliTarget, act: string, config: LocalConfig, opts?: { destructive?: boolean }): LocalIdentityRead { throw new Error('not implemented'); }
```

Load-bearing decisions:

- Keyed by project id and workdir, never by slot number. `proveSlotTarget(slot, ...)` becomes `proveLocalTarget(target, ...)`; `slotDbContainers(slot)` becomes `stackDbContainers(projectId)` filtering `docker ps` on `supabase_db_<projectId>`; `slotProjectId`, `slotDir`, pool root, pool size, port mapping, config generation, mirroring, and occupancy stay in the parked pool. The parameter rename (`slotProject` to `projectId`) is the whole generalization; the regex and suffix-match bodies move verbatim.
- The four checks keep their order and failure modes: foreign container names refuse; the personal project id appearing in raw output refuses; `localStackProblems(status, config)` against the repo config refuses; destructive reads additionally require at least one own container name. Non-running (unparseable status, no stack) returns `{ status: null, notRunning, provenProjectId: null }` and never throws a mismatch, so callers decide.
- The docker probe is a second function on the destructive path, called after the CLI read and before the reset, exactly as `proveSlotDbContainer` sits inside `resetSlotDatabase` for slots today. It fails closed: docker missing, docker error, or no matching `supabase_db_<projectId>` row refuses with a message naming the act and the restart command, and nothing is reset.
- Validation lives in the callee. The runner passes target plus config; the module runs the CLI through `supabaseInvocation(target, ['status','-o','json'])` so the read and the reset resolve identically. Interface depth is one module with two pure helpers, one docker probe, one read. The runner keeps its lock, reset, readiness, migration proof, attestation, env emitter, and evidence. Complexity hidden: CLI output shapes, container-name parsing, docker failure modes. Complexity exposed: the caller still sequences lock, read, wait, reset, wait, migrations, attestation, and must handle the not-running case.
- What the shape deliberately does not do: no config generation or restart-if-changed (the one stack runs its tracked config); no reservation or override; no personal-block scan moved over (the positive read replaces it; the broad scan is slot machinery and parks with the pool).

Module map: new `tests/at/harness/stack-identity.ts` (~150 lines) importing only types and the CLI seam from the runner; `runner.ts` gains a short one-stack section (lock, `resetOneStack`, `finishOneStack`, `oneStackEnv`, `oneStackEvidence`) and loses the pool import; `attestation.ts`, `index.ts` live ledger, `live-email.ts`, and the `slot` brand names are untouched.

## Synthesis decision

This package is the identity-module candidate. If it becomes the base, take from the in-runner-section candidate only its evidence-line wording (commit plus dirty flag) and from the config-pin candidate only the at-config entry name, and reject whole-path duplication inside the runner (a second prove function next to the CLI seam forks the wall) and reject reusing `localStackProblems` alone as the reset proof (ports alone were not identity in the August incident; the container-name plus docker rule is the point).

## Tradeoffs accepted

- We accept a hard dependency on Docker container names on the one stack in exchange for keeping the two-instrument destructive rule; without Docker nothing destructive runs.
- We accept resetting the founder's local database on every integration run in exchange for deleting the pool; the evidence line and the dead-pid-only lock state that cost on every run.
- We accept pinning session lifetime to 120 seconds in the tracked config in exchange for keeping the 16 declared integration greens and their four-minute budgets; local dev tokens live two minutes.
- We accept deleting the no-target reset overloads in exchange for making an unproven reset a compile error; the only callers are selftests, updated in the same change.
- We accept a fail-closed coupling to the CLI's `Stopped services` output shape in exchange for positive evidence; a future CLI that names no container refuses loudly rather than resetting on ports alone.

## Alternatives considered

- Put the generalized read as a new section inside `runner.ts` instead of a new module. It loses on interface depth: the runner already owns the CLI seam, locks, reset, and grading, and folding container parsing plus docker probing into it makes the file the only place the rule can be tested or reused, while a 150-line module with pure helpers is independently selftested and keeps the runner's integration branch to one screen.
- Keep the pool file and add a slot-zero or personal-stack exception to it. It loses because it keeps the reservation, config generation, mirroring, and port-overlay machinery on the path and inverts the founding refusal by flag, so every future pool edit risks the one stack; parking the pool whole is the honest cut.

## Open questions and risks

- Is treating the 44321 stack as resettable on every run acceptable to the founder, given both file headers still call it personal and untouchable?
- Should the one-stack lock also cover `db:reset` and manual verify drives, or only `at:verify`, given the same database is reachable outside the runner?
- The running Auth container holds the old session lifetime until restarted; does the change that pins 120 seconds include the stop plus start in the same verified run?
- Nobody measured the live 44321 stack (up, Mailpit on 44324, migration count at five); would you like that probe run before implementation starts?

## Next implementation step

Build `stack-identity.ts` against canned CLI and docker outputs in `runner.selftest.ts`, then repoint the runner's integration branch to it behind the existing `--expect` manifests.

## Explicit answers to the nine required questions

1. **Where the one-stack identity read lives and its exact signature.** New `tests/at/harness/stack-identity.ts`: `proveLocalTarget(target: CliTarget, act: string, config: LocalConfig, opts?: { destructive?: boolean }): LocalIdentityRead`, where `LocalIdentityRead` is `{ status: StackStatus | null; notRunning: string | null; provenProjectId: string | null }` (the same shape `writeAttestation` demands as `ProvenSlotRead`). It runs `supabase status -o json` through `supabaseInvocation(target, ...)`, refuses on foreign container names or the personal project id in raw output, parses via `parseStackStatus`, runs `localStackProblems(status, config)` for loopback, configured ports, local issuer, and no hosted ref, and for destructive reads requires `ownContainerNames(raw, target.projectId).length > 0`. Non-running returns null status with a reason; mismatch throws.
2. **How the proof-typed reset stays the only reset.** Delete both no-target overloads of `resetLocalDatabase`; the sole signature is `resetLocalDatabase(target: CliTarget, proof: SlotIdentityProof)`. Zero production callers use the deleted overloads today; the runner's one-stack helpers and the selftests are updated to pass the read. An unproven or cross-project reset becomes a compile error, and a proof naming another project or none is a named refusal before anything spawns.
3. **The lock and the evidence line.** `acquireStackLock(readLocalConfig(REPO_ROOT), requirement, { takeover: 'dead-pid-only' })`, file `at-verify-poancmeitlmxejofwzuu-44321.lock`, never displaced under a live pid. Evidence line names project id, api port read from post-prepare status (not from config), reset, migration counts, lock file, plus tested commit and dirty flag: `at:verify — one-stack (poancmeitlmxejofwzuu, api 44321) — reset OK — migrations: 5 expected, 5 applied — lock <file> — <sha><-dirty?>`.
4. **The child environment emitter.** New small runner function `oneStackEnv(status, attestation, mailUrl?)` emitting exactly `AT_SUPABASE_URL`, `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY`, `AT_SLOT_ATTESTATION`, `AT_SUPABASE_MAIL_URL`, with no personal-port refusal (that refusal parks with `stackEnv`). The hosted-URL wall stays via `supabaseInvocation` plus the `childEnv` allowlist; `AT_DB_SLOT` never reaches the child.
5. **Session lifetime.** Pin `jwt_expiry = 120` in `supabase/config.toml`; add one at-config entry (for example `authJwtExpiryMs`, value `120_000`, source the config line); `req-001/_fixture.ts` replaces its `3600 * 1000` literal with the registry read and `req-001/_integration.ts` replaces its `SLOT_JWT_EXPIRY_MS = 120_000` literal with the same read, keeping the 135-second and 150-second waits and the 240-second budget unchanged.
6. **What changes in runner.ts.** Line 44 pool import becomes the `stack-identity.ts` import; the integration branch (around lines 1332-1369) becomes the usage sketch above; the header comment (lines 10-13) drops the slot doctrine for the one-stack doctrine; `stackHelp` drops the pool-setup line for Docker plus `bun run db:start`; the drill-tier refusal text is reworded to name the undecided drill stack without calling the one stack personal.
7. **Selftest story.** `runner.selftest.ts` gains canned-output tests for `proveLocalTarget` (foreign name refuses, no own name refuses destructive but allows informational, loopback and port and issuer checks refuse, docker probe missing refuses) and drops no-target reset tests; `live-ledger.selftest.ts` is unchanged except the attestation label wording if touched at all. `bun run at:selftest` shrinks by exactly `db-pool.selftest.ts`, the only selftest importing the pool; count the remaining files as the new total in the change description.
8. **Parked layout.** Move `tests/at/harness/db-pool.ts` and `tests/at/harness/db-pool.selftest.ts` to `loop/parked/v1/tests/at/harness/` mirroring paths, outside every tsconfig, with the planned dead-text readme. Nothing else from `tests/at` moves: attestation, live-email, capabilities brand, clock, index, suites, and manifests stay.
9. **Diff estimate.**

| File | Change | Est. lines |
|---|---|---|
| new `tests/at/harness/stack-identity.ts` | moved helpers generalized + `proveLocalTarget` + docker probe | +150 |
| `tests/at/harness/runner.ts` | import, integration branch, env, evidence, header, help, drill text | +90 / -70 |
| `tests/at/harness/runner.selftest.ts` | new read tests, reset overload updates | +80 / -20 |
| `supabase/config.toml` | `jwt_expiry` 3600 to 120 | +1 / -1 |
| `tests/at/harness/atconfig.ts` | one session-lifetime entry | +10 |
| `tests/at/suites/req-001/_integration.ts`, `_fixture.ts` | read lifetime from registry | +6 / -6 |
| parked moves | pool + pool selftest out of `tests/at` | -1800 (moved, not deleted) |

Why the docker probe earns its place here and what it costs: the August incident proved ports plus keys can report correctly while the CLI resolves another project, so the CLI read alone cannot authorize a wipe of the founder's database; Docker is the only second instrument that names the running database container independently of the CLI. The cost is that without Docker (not installed, not running, or names changed by a future CLI or config) the one-stack path refuses every destructive act by design, including on machines that could otherwise run the loop tier and selftests fine.
