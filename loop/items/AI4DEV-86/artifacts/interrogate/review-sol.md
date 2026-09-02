## Findings

### 1. [critical] Container suffix matching can authorize a reset of a foreign project

**Location**: `tests/at/harness/runner.ts:1043-1068`, `identityVerdict()` at `:1097-1133`  
**Finding**: Project ownership is determined with `name.endsWith(\`_${projectId}\`)`, not an exact project-id comparison.  
**Evidence**: For target `demo`, `supabase_db_evil_demo` is classified as belonging to `demo` and excluded from the foreign set. With otherwise matching status data, `identityVerdict()` returns a proof and permits the destructive reset. The selftest uses `supabase_db_notdemo`, which does not exercise the separator-bearing collision.  
**Suggestion**: Compare exact expected container names or inspect Docker’s project labels. Add an `evil_demo` refusal test.

### 2. [critical] The takeover gate can be stolen from a live process

**Location**: `tests/at/harness/runner.ts:60-66`, `:355-369`, `:514-545`  
**Finding**: `clearStrandedGate()` removes a gate older than two minutes even when its recorded PID is alive, and the original owner later removes whatever gate currently occupies the path without checking ownership.  
**Evidence**: If process A is suspended while holding the gate, process B can delete A’s live gate and create its own. When A resumes, both can enter the takeover section, remove and replace the main lock, and proceed to reset the database. A also blindly deletes B’s gate in `finally`. Conversely, a crash between `openSync(gate, 'wx')` and `writeSync()` leaves an empty gate that JSON parsing can never clear, permanently blocking acquisition.  
**Suggestion**: Use a dead-PID-only, uniquely tokened gate and verify the token before deletion, or replace this protocol with an OS-backed lock whose acquisition and ownership are atomic.

### 3. [critical] Reset descendants can outlive the lock that protects them

**Location**: `tests/at/harness/runner.ts:975-1024`, `:1499-1508`  
**Finding**: The lock records only the runner PID. Signal cleanup releases it and exits without terminating or awaiting the active reset child.  
**Evidence**: A second runner can acquire the lock while the first `supabase db reset` or a container-runtime descendant is still mutating the database. Abrupt parent death has the same result when dead-PID takeover occurs. The timeout path also overclaims on Linux: `child.kill('SIGKILL')` kills only the direct child, not the process tree the comment says must be killed.  
**Suggestion**: Own the reset through a POSIX process group or Windows job object, terminate the whole tree, await its exit, and only then release the stack lock.

### 4. [critical] Official database commands bypass the stack lock

**Location**: `package.json:17-19`, `tests/at/harness/runner.ts:1486-1491,1530-1533`, `loop/items/AI4DEV-86/brief.md:128-130`  
**Finding**: Only `at:verify` acquires the lock. The repository’s `db:start`, `db:stop`, and `db:reset` commands operate directly on the same stack.  
**Evidence**: A concurrent `bun run db:reset` can run between `proveTarget()` and the runner’s reset or while Vitest is using the database. The brief explicitly advertises this command as managing the one stack, so serialization currently depends on operator convention.  
**Suggestion**: Route every repository-supported start, stop, and reset command through one lock-aware wrapper.

### 5. [warning] The destructive proof types are freely forgeable and stale

**Location**: `tests/at/harness/runner.ts:948-981,1171-1178`, `tests/at/harness/attestation.ts:68-100`  
**Finding**: `SlotIdentityProof` and `ProvenSlotRead` are exported structural interfaces. Reset checks only a matching project-id string, while attestation trusts a caller-supplied database URL inside the structural read.  
**Evidence**: Any importer can construct `{ provenProjectId: target.projectId }` without performing `proveTarget()`; the selftest already constructs these objects directly. A genuine proof can also be reused after the workdir, Docker context, containers, or configuration changes. The claimed type-system enforcement therefore does not exist.  
**Suggestion**: Keep both destructive operations private behind `prepareLocalStack()`, or use an opaque proof bound to the complete target and refresh it immediately before mutation.

### 6. [warning] The 120-second lifetime can drift while all required tests remain green

**Location**: `supabase/config.toml:173-176`, `tests/at/harness/atconfig.ts:182-195`, `tests/at/harness/runner.ts:245-273`, `tests/at/suites/req-001/_integration.ts:58-66,485-500,556-567`  
**Finding**: The running Auth service and the tests read two independent literals. Nothing parses or compares `jwt_expiry` with `accessTokenLifetimeSeconds`.  
**Evidence**: If Auth runs with a 60-second lifetime while the registry remains 120, AT-001.12 waits 135 seconds and correctly observes expiry, while AT-001.13 can observe rotation within its 150-second deadline. The loop tests read only the registry. Thus every required run can pass without proving the configured lifetime is 120 seconds. Several suite comments still describe the removed one-hour lifetime.  
**Suggestion**: Validate `[auth].jwt_expiry` during preparation and assert `exp - iat` on a real issued token.

### 7. [warning] Slot machinery remains on the active integration path

**Location**: `tests/at/harness/attestation.ts:1-205`, `tests/at/harness/capabilities.ts:49-85,399-484`, `tests/at/harness/index.ts:241-388`, `tests/at/suites/req-001/_live.ts:148-241`  
**Finding**: The active protocol still uses `AT_SLOT_ATTESTATION`, `SLOT_ATTESTATION_BRAND`, `ProvenSlotRead`, `attestSlot()`, `LiveSlotCoordinates`, and a `slot` adapter parameter.  
**Evidence**: `buildLiveLedger()` calls `attestSlot()` and passes `slot: coordinates` into the live adapter. This directly contradicts the brief’s requirement to remove the slot-shaped attestation/live-email path and run integration with no slot code. Active comments also claim parked functions such as `personalBlockProblems()` still protect the destructive path.  
**Suggestion**: Replace the active protocol with stack-generic types and names, and remove claims about parked guards.

### 8. [warning] A live skill routes users into the parked `/work` workflow

**Location**: `.claude/skills/find-batch/SKILL.md:3,12-19,55`  
**Finding**: `/find-batch` instructs the founder to continue with `/work <primary> <partner>` and says its mechanics live in the work skill.  
**Evidence**: The `/work` skill now exists only under `loop/parked/v1`, while the live controller states that batching is not part of workflow v2. Following this live skill therefore produces a nonexistent next step and still assumes slot allocation.  
**Suggestion**: Park `/find-batch` or rewrite it around supported v2 entry points and batching policy.

### 9. [warning] The branch’s current brief still prescribes `AT_DB_SLOT`

**Location**: `loop/items/AI4DEV-86/brief.md:127-132`  
**Finding**: The newly added brief says local and cloud runs use `AT_DB_SLOT=1`.  
**Evidence**: The setting and runner read have been removed, so this instruction is now ignored and contradicts the same document’s one-stack description. It also fails the stated requirement that `AT_DB_SLOT` disappear from live documentation.  
**Suggestion**: Remove the variable and describe the fixed stack directly.

### 10. [warning] Live documentation still advertises parked components

**Location**: `.claude/cloud-environment-setup.sh:49,72-75`, `.env.example:25-34`, `.claude/cloud-session-readme.md:57-60`, `loop/out/way-of-work.md:5-11`  
**Finding**: The documentation rewrite leaves the slot pool, stamp hook, semantic-oracle recorder, and parked `/work` documents presented as current machinery.  
**Evidence**: The cloud template says the slot pool is repository-derived and that `stamp-hook.ps1` provides attribution, although both are parked or unwired. `.env.example` says the judge key has two readers and then says nothing live reads it. The cloud guide still tells users how to provision that unused credential, and `way-of-work.md` calls parked files the current specification.  
**Suggestion**: Remove the obsolete operational instructions and point every live document solely at the v2 workflow.

### 11. [warning] The obsolete live-age takeover mode remains the default API

**Location**: `tests/at/harness/runner.ts:60-64,322-343,398-400`, `tests/at/harness/runner.selftest.ts:265-286`  
**Finding**: The intended lock is dead-PID-only, but `acquireStackLock()` still defaults to the legacy `stale-or-dead` policy.  
**Evidence**: The sole runtime call explicitly passes `dead-pid-only`; omitted-option calls exist only in selftests. Any future caller using the exported default can displace a live run after 60 minutes—the exact failure this change says the one-stack lock prevents. The parked slot pool no longer justifies retaining both modes.  
**Suggestion**: Make dead-PID-only unconditional and delete the policy option, live-age constant, branch, and obsolete tests.

### 12. [warning] The parked archive is neither fully byte-identical nor excluded from live tooling

**Location**: `loop/parked/v1/README.md:1-12`, `loop/parked/v1/.claude/skills/work/SKILL.md`, `package.json:11-13`, `eslint.config.js:8-10`, `.prettierignore`  
**Finding**: The archive promises byte-for-byte preservation, but one parked file was edited during the move and standard lint/format commands still traverse the archive.  
**Evidence**: Git reports the work skill as a 99% rename because a line was removed. `eslint .` has no parked exclusion, and `prettier --write .` can rewrite archived files because `.prettierignore` also omits `loop/parked/**`.  
**Suggestion**: Restore the exact archived content and exclude `loop/parked/**` from linting and formatting.