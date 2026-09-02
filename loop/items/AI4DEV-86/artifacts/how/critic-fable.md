# Architectural critique: the harness, the integration repoint, and the parked ceremony

Critic: the Fable lane for AI4DEV-86 (v1 ceremony out, CI aligned). Read in full: the
explanation, the brief, every listed harness, machinery, suite, CI, settings and ceremony file,
and beside them `req-016/_oracles.ts`, `req016-oracles.selftest.ts`, `recordings/README.md`,
`shared-invariants.md`, `controller/SKILL.md`, the live SessionStart hook, the two small suite
binding files, and a line and import census of `tests/at`. Line numbers are this worktree's.

Three corrections to the inputs come first, because the rulings depend on them.

1. **The brief says the semantic judge is "used by req-016 only". It is used by nothing.**
   `tests/at/suites/req-016/_oracles.ts` holds three pure set-comparison functions
   (`countPairs`, `expectedPairs`, `pairProblems`). `req016-oracles.selftest.ts` tests those.
   No file under `tests/at/suites` calls `judge()`; the only callers of `createOracleCapability`
   are `index.ts`, the harness selftests, and the type probes. The word "oracles" names two
   different things, and the brief merged them. See finding 7.
2. **The done contract's integration line cannot exit 0 as written.** See finding 4.
3. **The explanation (section 9, step 4) recommends the no-target `resetLocalDatabase()`
   overload for the one stack. That overload carries no identity guard at all.** See finding 2.

The explanation is otherwise accurate where I checked it: no suite calls `h.oracles`, the oracle
is constructed on every `open()`, the reservation file plus `AT_DB_SLOT` are the only data that
cross from the ceremony into the harness, and its list of what a slot-free path needs is right in
substance. What it under-reports is in findings 2, 5 and 6.

## Findings

### 1. [structural] The integration path is built on an invariant the item inverts, and the pieces the repoint needs sit on the wrong side of the pool boundary

**Components**: `tests/at/harness/runner.ts` (the stack plumbing, lines 219-1037, and the
integration branch of `main()`, 1332-1370), `tests/at/harness/db-pool.ts`.

**Finding**: "the 44321 stack is the founder's personal stack and is untouchable" is not a
comment. It is the rule that decided which module owns which function. Everything generic
landed in `runner.ts` and takes a config or a target: the lock (397), the CLI seam (630), the
loopback and issuer checks (754), readiness (854), the migration proof (938), the reset (984).
Everything that touches a real stack landed in `db-pool.ts`, because the pool was the only thing
allowed to touch one. Four of those pool functions are what a slot-free integration run needs,
and none of them is slot-specific in substance:

- the positive identity read: `proveSlotTarget` (1194), `foreignContainerNames` (1084),
  `ownContainerNames` (1110), the docker probe `slotDbContainers` (1126). Each is parameterized
  by a project id and a workdir, not by a slot;
- the producer of `ProvenSlotRead`, the object `writeAttestation` demands (attestation.ts 80-114);
- the child coordinate emitter `stackEnv` (1373), which refuses ports 44320-44329 and the
  personal project id by constant (1385-1391), so it cannot be reused as it is;
- the evidence line `evidence` (1438).

The invariant itself lives in at least six places: the two file headers (runner 10-13, db-pool
8-12), the constants `PERSONAL_PORT_LOW/HIGH` and `PERSONAL_INSPECTOR_PORT` (72-75),
`personalBlockProblems` and the two `refusePersonal*` wrappers (457-522), `stackEnv` (1385-1391),
`withSlotSql` (1548-1551), and the drill-tier refusal text in the runner (1320-1330), which
names the repository's own stack as "untouchable" in the exact words the item now overturns.

**Evidence**: `supabaseInvocation` (630-645) already supports a target whose workdir is the
repository root. The measured hybrid hazard (618-622) needs the CLI's cwd to be one project while
`--workdir` names another; for the one stack the two are equal. A target of
`{ workdir: REPO_ROOT, projectId: readLocalConfig(REPO_ROOT).projectId }` states the identity
positively in `SUPABASE_PROJECT_ID`, which is also what the tracked `.env` says, so the wall
stays a wall against a hosted URL and a stray second variable.

**Impact**: "repoint in place" and "a thin new integration entry" move the same four functions.
The real choice is where the seam sits, and the smaller change is a stack module (or a section
of `runner.ts`) that owns `proveLocalTarget(target)` built from `ownContainerNames` and
`foreignContainerNames`, plus an emitter and an evidence line with no port refusal. Drive the one
stack as a `CliTarget`, so `resetLocalDatabase(target, proof)` and
`writeAttestation(target, read, nonce)` stay on the path unchanged. Two costs travel with the
instrument and should be written down where it lands: the positive read depends on the config
disabling imgproxy and the pooler (db-pool.ts 1104-1108, residual F4), because those two stopped
services are the only container names `supabase status` prints; and the docker probe is a second
instrument on the destructive path that CI can never run. The `runner.ts`/`db-pool.ts` import
cycle (44, and db-pool 36-38) is "safe" only while both files exist; parking the pool forces the
cut at exactly this seam.

### 2. [structural] The proof-typed reset guards the targeted overload only; the path the explanation recommends is the unguarded one

**Components**: `runner.ts` `resetLocalDatabase` (984-1037), `attestation.ts` `writeAttestation`
(100-127), `runner.ts` `readStackStatus` (673).

**Finding**: audit ruling D13, quoted at 976-982, says a target costs a proof and the type system
collects it. The guard is one line: `if (target && proof?.provenProjectId !== target.projectId)`
(987). The no-target overload runs `supabase db reset --local` from the repository root with no
identity read of any kind. It is kept "exactly as every call site behaved before targets existed"
(982), and today it has zero production callers: the drill tier refuses (1320-1330), the loop
tier never resets, and the pool reaches the reset only through `resetSlotDatabase` (1250-1267),
which runs the identity read inside and calls the targeted overload. `readStackStatus()` with no
target has one caller, the pool's `setup()` personal-stack report (1497), which is parked.

`writeAttestation` (100-114) refuses without a `ProvenSlotRead` whose `provenProjectId` equals
the target's. So the path the explanation proposes is asymmetric: an unproven reset, then a
proven nonce write into the same database.

**Evidence**: the overload signatures at 984-986; the guard at 987; the explanation's section 9,
steps 4 and 5, which pair the no-target reset with a proven attestation write.

**Impact**: once the personal-stack refusals go, "the reset landed where it was aimed" is the one
runtime safety property left, and it would be unenforced on the only path that resets anything.
Either delete the no-target overloads (they are the legacy path the evolution lens asks about:
preserved for compatibility with nothing) or route the one stack through the targeted form
(finding 1). Do not leave a proof-less overload beside a proof-required one. That is the
compile-time skip D13 said could not exist.

### 3. [structural] The session lifetime is one number written five times in two values, and the parked pool was the only thing reconciling them

**Components**: `supabase/config.toml` (174), `db-pool.ts` `generateSlotConfig` (407, 424-437),
`req-001/_fixture.ts` (468), `req-001/b-verification-and-sessions.test.ts` (405, 519, 537),
`req-001/_integration.ts` (65, 83, 487, 559), `atconfig.ts`.

**Finding**: 3600 is written in `config.toml` (`jwt_expiry = 3600`, line 174), in the loop
fixture (`ACCESS_TOKEN_TTL_MS = 3600 * 1000`, citing "line 165", which is stale), and in two loop
bodies (`h.clock.advance(3600 * 1000)` at 405, `3599 * 1000` at 519). 120 is written in the pool
generator (`SLOT_JWT_EXPIRY_SECONDS = 120`) and in the integration bodies
(`SLOT_JWT_EXPIRY_MS = 120_000`), and the two files deliberately do not import each other
(`_integration.ts` 57-64). The at-config registry, whose header forbids exactly this ("a
threshold copied into a test body is a second source of truth", atconfig.ts 4-8), does not hold
the value. The generator was the bridge: the slot ran at 120 while the tree said 3600, and every
integration green for AT-001.12 and AT-001.13 rests on that overlay.

**Evidence**: `_integration.ts` waits `SLOT_JWT_EXPIRY_MS + 15_000` (487) and polls to
`SLOT_JWT_EXPIRY_MS + 30_000` (559) under `INTEGRATION_TIMEOUT_MS = 240_000` (83). Against a
3600 s token both bodies fail by timeout.

**Impact**: this is the "120 s vs 3600 s" question, and it is a product-configuration decision
wearing a harness costume. Each way out is a cross-cutting edit:

- (a) Pin 120 in `config.toml`. Touches one config line, the fixture constant, and three loop
  literals. It also makes every local development session two minutes long; the verify-ai4good
  drives and any raw-token flow will feel that, and the loop tier then models a lifetime the
  product ships nowhere else.
- (b) Keep 3600 and declare AT-001.12 and AT-001.13 red at integration with a
  `CapabilityPending` naming the missing lever (for example `stack.short-session-lifetime`).
  Honest, exactly matchable by `--expect` (expected.ts 286-296), and it moves the integration
  green count from 16 to 14 with a manifest edit.
- (c) Mint an expired token with the local development secret for the expiry arm. That proves
  the gateway rejects `exp`, not that GoTrue expires sessions, and it does nothing for
  AT-001.13's "automatically".

Whichever the lead picks, the number belongs in `atconfig.ts` once, read by the fixture and by
both bodies. The freeze should not freeze a fork.

### 4. [concern] The done contract's integration line is unsatisfiable as written

**Components**: the brief (lines 51 and 121-123), `runner.ts` `runVerdict` (1179-1204) and the
verdict branch of `main()` (1433-1438), `tests/at/expected/req-001.json`.

**Finding**: `bun run at:verify req-001 --tier integration` without `--expect` grades through
`runVerdict`, where any red row is a failure and the exit is 1. The manifest declares 21
integration reds: 16 `pending / sut-missing` bodies that throw `AtPending` (`_pending.ts` 82-86)
and 5 `capability-pending` bodies that throw `CapabilityPending` (`_integration.ts` 1243-1274).
The command cannot exit 0 until all 37 of REQ-001's ids are live. The two loop lines in the same
brief carry `--expect`.

**Evidence**: `runVerdict` pushes `${red} ids red` whenever `red > 0` (1184); `main()` returns 1 on
any problem (1436-1437).

**Impact**: the evidence bar needs `--expect` on the integration line, or the ruling has to define
"green" as "exact match with the declaration". Without that, the mechanical driving the verify
step reports a red that is not a defect, and the lead spends judgment on it.

### 5. [concern] One stack, three writers, and a lock that only one of them honors

**Components**: `runner.ts` `acquireStackLock` (290-548), `package.json` `db:reset` (19), the
`verify-ai4good` skill, `supabase/config.toml`.

**Finding**: the lock serializes `at:verify` runs only. It is keyed on project id plus API port
(308-310) and lives under `%LOCALAPPDATA%\ai4good-build\at-locks`. `bun run db:reset` is
`bunx supabase db reset` and takes no lock. The verify-ai4good skill drives the running app on
the same stack, creates users and rows, and takes no lock. Under the pool these writers never
met: the runner reset slots, and the founder's stack belonged to the drives. After the repoint an
integration run resets the database a drive session is using, or a drive mutates the database
while a suite grades it, and neither side can see the other. The brief expects both kinds of
evidence inside this one item.

**Evidence**: `_live.ts` 940-954 says a world tears nothing down and relies on `prepare()` having
reset the database before the run; `stackHelp` (runner 1295-1300) still tells a user to run
`db-pool.ts setup`; the verify-ai4good manual (line 16) says "AT_DB_SLOT=1 everywhere; the slot
pool is deleted".

**Impact**: a green that graded a database another actor was writing, or a drive session whose
users vanish under it. The pool was the "separate before you serialize" answer and the founder
ruled it out, so serialization is what is left, and it has to reach all three writers. At
minimum: the runner's evidence line prints the lock file it holds, and `db:reset` and the drive
skill refuse while `at-verify-poancmeitlmxejofwzuu-44321.lock` names a live pid. Keep the pool's
`dead-pid-only` policy on that lock (330-343): the integration run lasts longer than the
runner's 60-minute stale window only when AT-001.12 and AT-001.13 wait, which is exactly when a
takeover would reset under a live run.

### 6. [concern] Coordinates reach test bodies through two doors, so the env names are a suite contract and the attestation does not cover them

**Components**: `req-001/_integration.ts` (535-537, 947-949), `index.ts`
`liveCoordinatesFromEnv` (318-327), `attestation.ts` `attestationCoordinatesFromEnv` (211-214),
`capabilities.ts` (53-65, 86), `db-pool.ts` `stackEnv`.

**Finding**: the live design says a body reaches the stack only through ledger entries that carry
the round trip (capabilities.ts 53-65; every `real` constructor checks the brand: clock.ts 38,
live-email.ts 100, capabilities.ts 536 and 558). Two bodies bypass it. AT-001.13 reads
`process.env.AT_SUPABASE_URL` and `AT_SUPABASE_ANON_KEY` directly to build a real supabase-js
client (535-539), and AT-001.17 does the same for its absence probes (947-949). The comment at
514-518 gives a reason for the first (the client library is the thing under test); the second has
no such reason. So the names `AT_SUPABASE_*` and `AT_SLOT_ATTESTATION` (attestation.ts 39) are
read in three places: the harness, the attestation module, and a suite.

**Evidence**: the explanation's section 8 table lists `_integration.ts`'s imports and does not
list these environment reads. A grep for the slot-shaped names (`attestSlot`,
`SLOT_ATTESTATION_BRAND`, `slot_attestation`, `AT_SLOT_ATTESTATION`, `ATTESTATION_ENV`) finds 32
occurrences in 7 files, 8 of them in `live-ledger.selftest.ts`.

**Impact**: for the repoint, a rename of the slot-shaped names is mechanical inside the harness
and reaches suites through this door. The done line "no slot code on the path" has to say whether
`AT_SLOT_ATTESTATION`, `at_runtime.slot_attestation` and the brand `'slot'` are slot code or
names. I read them as names: `attestSlot` refuses on no nonce (160-165), and every real grant
refuses without the brand, so the round trip is the spine of every integration green. Rename or
keep; never park. And the second env read (AT-001.17) should go through the ledger like every
other absence probe, so the door stays one body wide and justified.

### 7. [concern] The semantic judge has no consumer, is a required member of every harness object, and is a library wearing a capability's shape

**Components**: `oracles.ts` (1091 lines), `record-oracles.ts` (246), `rubrics/` (291),
`recordings/` (README only), `oracles.selftest.ts` (1028), `contracts.ts` (160-304, 377),
`capabilities.ts` (194-195, 284-341), `index.ts` (205, 376, 406), `config.ts` (35),
`atconfig.ts` (192-200), `typeprobes/harness-invention.probe.ts`, `type-invention.selftest.ts`.

**Finding**: see correction 1 above: nothing calls `judge()`. Yet `createOracleCapability` runs on
every `open()` at every tier (index.ts 205, 376, 406) and reads `harness.oracle.judge_votes`
each time; `AtHarness.oracles` is required (contracts.ts 377), so `createHarness` cannot omit
it; the witness table's only derived `real` verdict is the judge's, with a transport list that
mirrors `oracles.ts` by hand (capabilities.ts 195, 284-341); the recordings store is empty by
design (README 7-10); the live transport has never been called (oracles.ts 743-746;
record-oracles.ts 30-32); and the three ids it was designed for (AT-009.07, AT-004.10,
AT-033.07) have no suites. The cluster is about 2,900 lines: the four modules plus about 230
lines spread across contracts, capabilities, config and atconfig.

**Evidence**: the grep for `judge(|createOracleCapability|oracles.judge` over `tests/at`
returns eleven files, none under `suites/`.

**Impact**: freezing costs one construction per test open and 2,900 frozen lines that no real
judge has ever answered. Parking touches about ten files: `index.ts` at three sites,
`contracts.ts` (the rubric and verdict types, the `oracles` member), `capabilities.ts` (the
witness entry and `LEGAL_TRANSPORTS`), `config.ts` and `atconfig.ts` (the vote knob), the type
probe and its selftest, and the four modules. What stops being checked: nothing today. What gets
simpler: the witness table becomes "seam-detected stand-ins and attested reals", and `AtHarness`
loses a member every suite had to carry. When AT-009.07 or a sibling lands, a judge is a
function that test imports, with its own record-and-replay store, not a member of `h`. The
record-and-replay design inside `oracles.ts` is sound; its placement as a mandatory capability
was speculative, and the freeze should not preserve the placement.

### 8. [concern] The frozen loop machinery and req-016 are one unit with no product behind it, and that unit has no live realization on this stack

**Components**: `sentinels.ts` (57), `faults.ts` (96), `vendors.ts` (112), `guards.ts` (147),
`fixtures.ts` (118), `clock.ts` (77), `config.ts` (78), `atconfig.ts` (207),
`req-016/_fixture.ts`, `conformance.selftest.ts` (827), `vendors.selftest.ts` (305), `index.ts`
`buildLiveLedger` (337-447).

**Finding**: req-016's adapter is "a CONFORMING REFERENCE STAND-IN of REQ-016's notification
system, not the product" (`_fixture.ts` 1-13), and it is the only consumer of `h.sentinels`,
`h.faults`, the email sim's arming methods, and `h.config` (the grep over `suites/`: every hit
for those seams is under `req-016/`; req-001's only seam use is `h.clock.advance`). A loop green
there proves the harness discriminates; the file says so itself. Above loop, `buildLiveLedger`
grants `real` only to a `_live.ts` adapter (356-402). A live adapter's `faults` and `sentinels`
seams would need a product that exposes fault points and a delivery-process epoch to a test
process; a Supabase stack exposes neither, and `createLiveEmail` is read-only by design with no
arming methods (live-email.ts 43-47). So the H3 and H5 arming machinery is loop-only by
construction, and the gate at registry.ts 807 refuses req-016 at integration until the product
is instrumented, which no ratified text asks for.

**Evidence**: `tests/at/expected/req-016.json` declares every integration id red on
`fixtures.worlds, sut.notifications`; `buildLiveLedger` at 369-379 loads the whole loop adapter
with a fresh `ControlledClock` only to stamp it stand-in and refuse.

**Impact**: the brief fixes the answer: the manifest and the suite stay untouched, so the
machinery is frozen. The ruling should still say what the freeze buys and costs. It keeps about
890 lines of capability modules and about 1,130 lines of their selftests so that 11 loop-green
ids of an unimplemented requirement keep their bijection and their `--expect` floor. That is a
standing check on the harness, not on ai4good. Parking instead would cost the 12 REQ-016 ids
their P0 floor and would shrink `AtHarness` to clock, fixtures, config and sut. One more freeze
cost, said plainly: every integration `open()` performs an attestation round trip, a Mailpit
probe, and a live adapter construction with a new SQL connection (337-402), and a suite with no
`_live.ts` builds the entire loop adapter first. Cheap at 16 ids; a cliff at 30 suites, and a
hard requirement for a mail catcher on every integration stack even for a suite that never
reads mail (353 is unconditional; the optionality of `StackStatus.mailUrl` is undone one layer up).

### 9. [concern] "Park, never delete" has a placement cost for TypeScript that the brief does not state

**Components**: `tests/at/tsconfig.json` (8, 12), `tests/at/vitest.config.ts` (16),
`package.json` `at:selftest` (16), `db-pool.ts` imports (41-70), `loop/drills/run-drills.ps1`
(303, 310, 328-336, 364).

**Finding**: `tests/at/tsconfig.json` includes `**/*` on purpose; its own comment says a file
written next month is covered the day it is written. A `db-pool.ts` parked anywhere under
`tests/at/` stays in `bun run typecheck`. It imports `./runner.ts`, `./check.ts` and
`./attestation.ts` by relative path, so from a new folder it does not compile without edits, and
if it is edited to compile it still ships the personal-port refusals the tree no longer believes.
Parked outside `tests/at/`, it is in no tsconfig and rots silently. `db-pool.selftest.ts` is
matched by `harness/**/*.selftest.ts` only while it sits under `harness/`, which is the
mechanism by which "`at:selftest` shrinks". On the ceremony side, `run-drills.ps1` binds
`..\work\twin-check.ps1`, `.claude\agents\*.md`, the nine phase files and five contracts by
relative path, and nothing in CI runs it (ci.yml 134-135 treats `loop/` as prose).

**Impact**: choose the park root before moving a file. A parked folder under `tests/at/` needs a
tsconfig `exclude` entry and a README that says the code is not compiled; a folder outside needs
the same README. Either way parked TypeScript is dead text under version control, and the README
should say so rather than imply a spare part that still fits. The drills go with the agents: they
drill v1 hand-offs only (the fake actor and the relay control library), and the founder's
"drill before you trust" rule in `SKILL.md` is discipline, not a check.

### 10. [concern] The script park list is cut by authorship, not by dependency; `work-lib.ps1` is v2 infrastructure

**Components**: `loop/work/work-lib.ps1`, `statusline.ps1` (27, 108, 167-170),
`.claude/settings.json` (22, 40), `.claude/skills/controller/SKILL.md` (48, 72, 191),
`materialize.ps1` (7), `attribution-report.ps1` (317-332).

**Finding**: `statusline.ps1` dot-sources `work-lib.ps1` at 108, runs under
`SilentlyContinue`, and its catch prints `ai4good`. `settings.json` runs it by absolute path
into the main checkout. `/controller` calls `Set-HeldItem` and `Clear-HeldItem` from work-lib
and defers materialisation to `/work`'s prose, which `materialize.ps1` implements by
dot-sourcing work-lib. So the brief's "park work-lib, materialize" breaks the status bar on
every keystroke after merge, silently, and leaves the v2 entry verb calling functions that do not
exist. The explanation's gotcha 10 names the status line; the controller's two calls make it a
v2 dependency, not a v1 leftover.

**Evidence**: `work-lib.ps1` exports `Set-HeldItem` (112), `Clear-HeldItem` (122), `Get-Chain`
(159), `Test-Chain` (188); the live SessionStart hook is `.claude/hooks/session-start-banner.sh`
(settings.json 32), so `banner.ps1` and `stamp-hook.ps1` are already unwired.

**Impact**: cut by callers. Park: `twin-check`, `stamp-hook`, `banner`, `db-slots`,
`watch-items`, `attribution-report` with its selftest and epoch file, and `materialize` only if
the controller's materialisation prose is rewritten in the same item. Keep: `work-lib`,
`statusline`, `guard-branch-switch`, `ci-status`, `context-gauge`, `sheet-check`,
`render-mermaid`. The kept PowerShell has zero CI coverage, so a break there is found by the
founder, not by a check.

### 11. [observation] `AT_DB_SLOT` becomes a name that no code reads while five documents give it a meaning

**Components**: `.claude/settings.json` (5), `runner.ts` (1338), `controller/SKILL.md` (69,
156), `verify-ai4good/SKILL.md` (16), `.claude/cloud-session-readme.md` (107),
`.claude/cloud-environment-setup.sh` (45-48).

**Finding**: the runner reads the variable as pool slot 1 (API 45321) and the pool refuses 44321
by constant, so the five documents are already wrong today: `AT_DB_SLOT=1` cannot mean the
44321 stack in current code. After the park the only reader is gone.

**Impact**: delete the variable and the sentences, or the next reader treats it as a switch. A
named fact that nothing derives is the drift class the repository's own doctrine names.

### 12. [observation] Vestigial shape kept alive in four places: the drill tier, `--wired`, `Surface`, and a manifest tier nobody runs

**Components**: `runner.ts` (53, 1245-1252, 1324-1330), `registry.ts` (58, 134-136, 748-758),
`expected.ts` (87), `capabilities.ts` (194), `tests/at/expected/req-016.json`.

**Finding**: `drill` is a hard exit 3; `--wired` is a hard exit 3; `surface` is recorded in every
registration and read by nothing; `AtTestBodies.drill` exists; the tier list is spelled in four
files (one copy deliberately, to avoid a cycle). req-016's integration declaration describes a
tier v2 never runs (the brief's evidence bar names req-001 only), and the manifest schema has no
way to say "not run".

**Impact**: none at runtime. Each is a place a later change must touch, and a freeze that keeps
them freezes speculation. The manifest point matters more than the others: a declared tier
nobody runs drifts with no signal, and `loadTierExpectation` validates only the tier requested
(519-538), so a broken `integration` block in req-016's manifest would pass CI.

### 13. [observation] Kept prose still speaks v1

**Components**: `.claude/agents/mechanical.md` (13, 23-24),
`.claude/skills/work/shared-invariants.md` (76-79, 129), `controller/SKILL.md` (157),
`runner.ts` (1-34, 1295-1300).

**Finding**: `mechanical.md` reads `shared-invariants.md` first and names "the orchestrator" as
the actor that confirms CI green before a merge. `shared-invariants.md` recommends `ref`, `part
of` and `towards`, which the CI reference guard fails (ci.yml 314-324) and CLAUDE.md forbids; it
also binds every role to `reviewer-runner`, which is parked. `controller/SKILL.md` 157 tells a
cloud VM to run the parked setup command. `runner.ts`'s header and `stackHelp` describe the pool
as the only integration path.

**Impact**: the kept v2 agent runs under a constitution written for v1, and it is the agent that
types this item's closing commands. Small edits; do them here.

### 14. [observation] Where the cost sits, for the per-part ruling

The census below is from `tests/at` in this worktree (14,494 lines under `harness/`, of which
about 5,340 are selftests). Consumers are from the grep over `suites/`.

| Part | Code lines | Selftest lines | Consumers today | Stops being checked if parked |
|---|---|---|---|---|
| Grading core: `check.ts`, `expected.ts`, the grading and main half of `runner.ts`, `registry.ts`, `suite-adapters.ts`, `index.ts`, the non-judge parts of `capabilities.ts` and `contracts.ts` | about 3,500 | `expected` 329, `runner-expect` 423, `runner-blackbox` 340, `runner` 291, `type-invention` 347, `live-ledger` 534 | both suites, CI | the P0 bijection, per-id verdicts, the declared-red floor, per-test teardown accounting, the derived seam types |
| Stack plumbing in `runner.ts` (219-1037): lock, CLI seam, identity checks, readiness, migrations, reset | about 780 | inside `runner.selftest` (the lock race, the refusals) | the integration path only | the reset-lands-where-aimed proof; the lock |
| Live tier: `attestation.ts`, `live-email.ts`, the attested half of `clock.ts` | about 430 | inside `live-ledger.selftest` | req-001 integration | every integration `real` grant |
| Loop machinery: sentinels, faults, vendors, guards, fixtures, controlled clock, config, atconfig | about 890 | `conformance` 827, `vendors` 305 | req-016 (all), req-001 (`h.clock.advance` only) | REQ-016's 12 ids |
| Judge: `oracles.ts`, `record-oracles.ts`, rubrics, recordings | about 1,670 | `oracles.selftest` 1,028 | none | nothing |
| Pool: `db-pool.ts` | 1,674 | `db-pool.selftest` 602 | the integration path | parked by ruling |
| Shipped-module tests: `shipped-caller`, `shipped-verification` | 0 | 278 | the product modules | these are the brief's alternative, already living under the harness's vitest config |

Two readings of the table bear on the ruling. First, the alternative the brief names, "plain
vitest against the shipped modules", already exists inside `at:selftest` (the last row), and it
is 278 lines. It coexists with the harness rather than replacing it, because it tests decisions,
not acceptance ids. Second, what plain vitest cannot give is the first row's last column: an
honest red. Vitest expresses a not-yet-landed criterion only as a skip or a todo, and
`reportAccountingDeviations` (expected.ts 431-432) exists to forbid exactly those. If the lead
keeps one thing frozen, it is the first row; if the lead parks one thing beyond the pool, it is
the judge.
