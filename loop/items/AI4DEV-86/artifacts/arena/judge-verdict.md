## Scores

| Criterion | A Fable | B Sol | C Grok | D Opus |
|---|---:|---:|---:|---:|
| 1 Proof at compile time | 3 | 3 | 3 | 2 |
| 2 Positive identity | 3 | 3 | 3 | 2 |
| 3 Surface | 1 | 3 | 1 | 2 |
| 4 Session lifetime | 3 | 3 | 3 | 2 |
| 5 Smallest honest diff | 2 | 2 | 3 | 1 |
| 6 Lock and evidence | 3 | 3 | 2 | 3 |
| **Total** | **15** | **17** | **15** | **12** |

### 1. Proof at compile time
- **A 3:** Sketch deletes both no-target `resetLocalDatabase` overloads; the body always takes `CliTarget` plus proof; `provenProjectId` becomes `string`, so a null proof does not compile. `writeAttestation` still takes `ProvenSlotRead`.
- **B 3:** Same overload deletion. `prepareLocalStack` calls `resetLocalDatabase(target, proof)` and `writeAttestation(target, proof, nonce)`. No proof-less reset remains.
- **C 3:** Same overload deletion. `ProvenLocalRead` has non-null `provenProjectId` and `status`. Reset and write both take that object. `readStackStatus(target?)` stays, but it is not a reset.
- **D 2:** Overloads go, but `proveLocalTarget(..., { destructive?: boolean })` may return `provenProjectId: null` / `status: null`, and that object still type-checks as the reset proof.

### 2. Positive identity
- **A 3:** `identityVerdict` requires own CLI names, refuses foreign names first, then `localStackProblems`. Seam is called with a required `CliTarget`. No import of `db-pool.ts`. Target is `readLocalConfig(REPO_ROOT).projectId` (the tree’s `poancmeitlmxejofwzuu`).
- **B 3:** Same CLI-name proof plus `localStackProblems` and the hosted-URL wall. `ONE_STACK` states the target; no pool guard is deleted. Docker is extra, not a deleted check. No `db-pool.ts` import.
- **C 3:** `proveLocalTarget` requires own names on every success, keeps `localStackProblems`, uses `supabaseInvocation(target)`. No docker, no pool import, no personal-port blacklist recreated in `runner.ts`.
- **D 2:** `IdentitySeams` lets the live identity function accept fake CLI/docker output. `destructive?: boolean` can skip own-name and docker checks. The success type still allows `provenProjectId: null`.

### 3. Surface
- **A 1:** The branch fits one screen but calls lock, prove, wait, reset, wait, migrations, mint, write, `evidenceLine`, and `childCoordinates`. Every stage is in `main()`.
- **B 3:** The branch calls one function, `prepareLocalStack`. It returns `{ env, evidence, lock }`. No phase API, no new test framework.
- **C 1:** One new identity function, env inlined, but lock / wait / reset / migrations / write all remain in `main()`.
- **D 2:** One screen, but four calls (`acquireStackLock`, `prepareLocalStack`, `localEvidence`, `localStackEnv`) plus `IdentitySeams`.

### 4. Session lifetime
- **A 3:** `jwt_expiry = 120`; one `AT_CONFIG` entry; `_fixture.ts` and `_integration.ts` read it; `b-verification-and-sessions.test.ts` advances `TTL` and `TTL - 1000` so AT-001.13 cannot go red at loop. No manifest edit.
- **B 3:** Same pin and the same three files. Session file extends its existing `_integration.ts` import. No manifest edit.
- **C 3:** Same pin and entry. Fixture and integration read `AT_CONFIG`. The 3600 / 3599 advances are named and retargeted. No `CONFIG_KEYS` row, no manifest edit.
- **D 2:** Same pin, but a dotted `CONFIG_KEYS` row makes the loop model overridable, so a world can drift from the pinned 120.

### 5. Smallest honest diff
- **A 2:** About +270 / −120. Park path is outside `tests/at/tsconfig.json` (`include: "**/*"` under `tests/at` only). `identityVerdict` is pure and newly tested. The two `dead-pid-only` lock cases that today live only in `db-pool.selftest.ts` (live holder of any age; unidentifiable file) are not moved.
- **B 2:** About +286 / −154 across 19 paths. Park is correct. Five new cases include the lock policy. `prepareLocalStack` has no unit seam. Docker and comment edits in `index.ts` / `attestation.ts` grow the slice.
- **C 3:** About +246 / −99 live, table split from the park move. Three name-helper tests plus the two `dead-pid-only` lock tests. `live-ledger.selftest.ts` unchanged. Park is outside every tsconfig.
- **D 1:** About +519 / −116. Park is correct. Identity tests are thorough, but docker, seams, a fail-open lifetime probe, and a 185-line module are not a small diff.

### 6. Lock and evidence
- **A 3:** `acquireStackLock(config, req, { takeover: 'dead-pid-only' })` → `at-verify-poancmeitlmxejofwzuu-44321.lock`. Evidence names project, port from `read.status.apiUrl`, reset, migration counts, and `lock.file`.
- **B 3:** Same lock key and policy. Evidence names the same five facts from proven status.
- **C 2:** Same lock. The printed port is `config.apiPort` while `read.status` is already in hand (`statusApiPort` in `db-pool.ts` 1418–1425 exists because occupancy config can lie).
- **D 3:** Same lock, taken before prepare. Evidence names the five facts from status.

## Per candidate

**A (Fable, subtract in `runner.ts`).** Strongest point: the proof idiom is in the types a maintainer sees — required `CliTarget`, non-null `provenProjectId`, untargeted CLI seam gone, and a pure `identityVerdict` the selftest can run without Docker. Weakest point: the integration branch is a ten-call recipe, and parking `db-pool.selftest.ts` would drop the only `dead-pid-only` lock coverage unless those two tests move.

**B (Sol, one-call `local-stack.ts`).** Strongest point: the branch is one screen and one call; the compiler still collects the proof inside the module; lock, evidence, and six env keys come back as data. Weakest point: the module grows toward a second pool (hardcoded `ONE_STACK`, docker on the destructive path, a second identity read, extra signal listeners around a lock the runner already owns).

**C (Grok, in-place). ** Strongest point: smallest honest live diff, and it is the only in-place sketch that relocates the two `dead-pid-only` lock tests that otherwise leave with the pool. Weakest point: evidence prints `config.apiPort` instead of the port that answered, and `proveLocalTarget` itself is not driven in CI.

**D (Opus, `stack-identity.ts`).** Strongest point: lock stays in the runner, prepare is a sequence, and the identity tests through seams actually cover foreign names, vacuous pass, and docker failure. Weakest point: `destructive?: boolean` plus `IdentitySeams` plus a nullable success type is a skip hatch on the proof the rest of the design is trying to make unskippable.

## Base

**Use B (Sol) as the base.**

It is the only sketch whose integration branch meets “one screen, at most two functions, no exposed internal stages.” Lock, reset, attestation write, env, and evidence still take a proof; the no-target reset overload is gone; identity is stated as this project, not by deleting `localStackProblems` or the hosted-URL wall; lifetime is pinned once at 120 and read by the fixture and the integration bodies; the lock is `dead-pid-only` keyed by project id and API port.

The one-call module is the structure to keep. The extra lifecycle inside it is what to cut.

## Grafts

**From A into B**
- Make the identity verdict a pure function over one `CliResult` (foreign names, parse, `localStackProblems`, own names). That is the first CI coverage the helpers have never had.
- Drive the target from `readLocalConfig(REPO_ROOT)`, not a second `ONE_STACK` constant.
- One identity read, not two. Drop docker on this path.
- Delete the `supabaseInvocation(undefined)` branch so no CLI call runs without a stated project.

**From C into B**
- Keep `AT_SUPABASE_MAIL_URL` optional, as today’s `stackEnv` does (`db-pool.ts` 1407–1408).
- Keep C’s two `dead-pid-only` lock tests (B already lists them; they must actually land in `runner.selftest.ts` before the pool selftest is parked).
- Print the API port from `read.status.apiUrl`, not from config.
- Leave `index.ts` and `attestation.ts` APIs and names untouched in this slice.

**From D into B**
- Acquire the lock in `runner.ts` and assign it before prepare, so the existing `cleanupRun` `finally` owns it. Drop the extra signal listeners.
- Do not take `IdentitySeams`, the `destructive` flag, the fail-open Auth lifetime probe, or a world-overridable dotted lifetime key.