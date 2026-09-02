# Interrogate review — fable lane

Head reviewed: `ea73436362b6bcbd6ac5a3dea42fb8f9a93e6cd1` on branch
`nirdrang/ai4dev-86-the-v1-ceremony-leaves-the-codebase-and-ci-aligns-with-the`. The tree is
clean apart from the untracked `loop/items/AI4DEV-86/artifacts/` folder. The patch copy at
`artifacts/interrogate/diff.patch` equals `git diff main...HEAD -M` byte for byte after
line-ending normalization (179,046 characters, 74 files). A later head voids this verdict.

Checked and not flagged: the destructive order in `prepareLocalStack` (prove, wait, reset on
that proof, wait, migration proof, then the nonce); the CLI seam now demands a target and
asserts no second `SUPABASE_*` variable; the four `identityVerdict` selftests exercise the
load-bearing order; the parked tree is outside both `tsconfig` includes and outside vitest's
`--root tests/at` include, so it is neither compiled nor run; the twin-guard step is gone from
CI and nothing live invokes `twin-check.ps1`, `stamp-hook.ps1`, `banner.ps1`, `db-slots.ps1`,
`attribution-report.ps1`, `watch-items.ps1`, `db-pool.ts` or `oracles.ts`; the three loop-tier
clock advances in req-001 are all lifetime-relative, so the 120 s fixture value breaks no other
body.

## Findings

### 1. [warning] The lock keeps two takeover policies; the unsafe one is the default and has no live caller
**Location**: `tests/at/harness/runner.ts:63-66` (`LOCK_STALE_MINUTES`), `322-344`
(`TakeoverPolicy`, `holderIsLive`), `398-400` (the default), `468-500` (`identified`),
`537-540` (the takeover log line); caller at `1530`.
**Finding**: After this change the only production call is
`acquireStackLock(config, req, { takeover: 'dead-pid-only' })`. The `stale-or-dead` policy, the
age arithmetic, the `AT_LOCK_STALE_MINUTES` knob and the `policy !== 'dead-pid-only'` branch
inside `identified` survive only because the selftests call `acquireStackLock(config, 'req-016')`
with no options. The default is the policy that displaces a LIVE holder after sixty minutes,
which is the exact event the dead-pid-only policy exists to make impossible ("a run that
legitimately lasts longer than the stale window must not have its database reset under it").
The doc comment still says the pool passes `dead-pid-only`; the pool is parked.
**Evidence**: This is a legacy dual path with the wrong side as the default. Any future
`acquireStackLock(config, req)` compiles and gets the destructive policy on the founder's one
stack. A rule that must be remembered at every call site is weaker than a rule with one
behaviour. Removing the option loses no test: the two selftests that plant pid `999_999` take
over a dead holder under either policy, the "live, fresh holder" test refuses under either, and
the race test's holder is dead by pid.
**Suggestion**: Delete `TakeoverPolicy`, `StackLockOptions`, `LOCK_STALE_MINUTES` and the age
arithmetic; `holderIsLive` becomes `typeof pid === 'number' && processIsAlive(pid)`; the
`identified` guard applies unconditionally; the takeover log line always says "is no longer
running". The lock section shrinks by roughly twenty lines and one environment knob.

### 2. [warning] The identity proof is narrowed on the reset and left nullable on the attestation write
**Location**: `tests/at/harness/runner.ts:955-958` (`SlotIdentityProof.provenProjectId: string`),
`1076-1081` (`StackIdentityRead`); `tests/at/harness/attestation.ts:80-85`
(`ProvenSlotRead.provenProjectId: string | null`, `status: ... | null`), `100-114` (two refusal
branches); `tests/at/harness/live-ledger.selftest.ts:296-306` (the two tests that reach them).
**Finding**: The intent says the proof was narrowed so that "a proof that names no project
cannot be written". That holds for `resetLocalDatabase` and not for `writeAttestation`, which
still accepts `{ provenProjectId: null, status: null }` and carries the "proves no project at
all" and "carries no stack report" refusals. From the live path both branches are unreachable
(`prepareLocalStack` hands both acts the same `StackIdentityRead`); they are kept alive by two
selftests only. Three types now describe one fact: `SlotIdentityProof`, `ProvenSlotRead`,
`StackIdentityRead`.
**Evidence**: Two destructive acts, two shapes of the same proof, one of them still admitting
the value the other made unrepresentable. The next reader of `attestation.ts` is told a read
"proved none" is a runtime case; the runner says it is not. The stated reason for the structural
type (no import cycle) does not apply to a type-only import.
**Suggestion**: One proof type. `attestation.ts` does
`import type { StackIdentityRead } from './runner.ts'` (no runtime edge, no cycle), takes it in
`writeAttestation`, and drops the two null branches and their two tests. Delete `ProvenSlotRead`
and fold `SlotIdentityProof` into `StackIdentityRead`.

### 3. [warning] The positive half of the identity proof rests on a notice about two disabled services, and the refusal for its known failure shape blames identity
**Location**: `tests/at/harness/runner.ts:1048-1069` (`ownContainerNames` and its "Residual"
paragraph), `1124-1131` (the refusal in `identityVerdict`).
**Finding**: The only positive evidence that the CLI resolved this project is the
`Stopped services: [supabase_imgproxy_<id> supabase_pooler_<id>]` line, which exists because
`supabase/config.toml` disables imgproxy and the pooler. The comment records this. It does not
carry the fact into the refusal: when the JSON parses, every local check passes, no foreign
name appears and no own name appears, the message says "no positive evidence of which project
the CLI resolved ... the 2026-08-09 incident reported the right ports while resolving another
project". Enabling the pooler for a real reason turns every integration run into that refusal,
and the operator is sent hunting for a hybrid invocation that does not exist.
**Evidence**: Fail-closed is the right direction and the coupling is documented, but a guard
whose known benign trigger is diagnosed as its worst-case cause costs a wrong investigation each
time it fires. The four checks in the verdict already separate this shape from the hybrid
shape: a hybrid has a foreign name (refused at step 1); this shape has no name at all.
**Suggestion**: At minimum, make the no-own-name refusal name the known cause: "the CLI printed
no container name at all; this happens when config.toml enables both imgproxy and the pooler;
the proof needs at least one name". Better, take the positive half from an instrument that does
not depend on a service being disabled: `docker inspect supabase_db_<id>` through the same
allowlisted environment names the container positively and is the runtime the CLI itself
resolves through. Keep the foreign-name refusal as it is.

### 4. [warning] A stack started under a different `config.toml` passes every identity check and fails 135 seconds later with the wrong cause
**Location**: `tests/at/harness/runner.ts:1159-1180` (`prepareLocalStack`, "WHAT IT
DELIBERATELY DOES NOT DO"), `1486-1491` (`stackHelp`); `tests/at/harness/atconfig.ts:182-196`;
`tests/at/suites/req-001/_integration.ts:59-66`, `488`, `560`;
`tests/at/suites/req-001/_live.ts:177-186` (`sessionIdOf`, `accountIdOf` already decode the
token payload).
**Finding**: The lifetime pin has three read sites and no check against the running stack.
`identityVerdict` compares the CLI's report with the tree's config, and the CLI derives its
ports from that same file, so a stack started before `jwt_expiry` changed (from `main`, say,
where it is still 3600) is proven, reset and handed to the suite. AT-001.12 then waits 135 s
and reports "an expired access token performed a write"; AT-001.13 polls 150 s and reports
"the client never rotated its access token". Both name the product. The registry comment
accepts this ("a mismatch shows up as a body waiting past its own budget and failing loudly");
`stackHelp` tells the operator to restart, as an instruction.
**Evidence**: This is the shared-stack case the design creates: one set of containers, started
from whichever checkout ran `db:start`, reset by whichever checkout runs `at:verify`. Two
checkouts of this repository exist on the machine today (main and this worktree) and their
`config.toml` files differ on exactly this line until the merge. The check is one subtraction
on a payload the live adapter already parses. Two smaller costs of the pin, stated so the
ruling can weigh them: the one stack is also the drive target, so every local token now lives
two minutes (the verify-ai4good recipe signs in at step 4 and calls at step 5, so it is
unaffected today); and `supabase/config.toml` is the file `supabase config push` sends to the
hosted project, and its comment does not say the pin is local-only (nothing in the tree runs
that command today).
**Suggestion**: In `_live.ts` at sign-in, compare `exp - iat` from the access token with the
pinned lifetime and refuse with the true cause: "the running stack issues 3600-second tokens;
supabase/config.toml pins 120; run db:stop then db:start". One place, both ids, immediate.
Add "local stack only, never push" to the `jwt_expiry` comment.

### 5. [warning] The new registry entry is read around the config capability, not through it
**Location**: `tests/at/suites/req-001/_fixture.ts:194`, `470`;
`tests/at/suites/req-001/_integration.ts:28`, `66`;
`tests/at/suites/req-001/b-verification-and-sessions.test.ts:69`;
`tests/at/harness/config.ts:23-35` (`CONFIG_KEYS` and its `harness.` paragraph).
**Finding**: `config.ts` states the doctrine: suites address a pinned value by dotted key
through `h.config`, "the map below is the only place the two meet", and overrides may re-tune
any registered knob. This diff removes the one `harness.` key and does not register the new
entry. Instead the two suite files import `AT_CONFIG` directly, which no suite file did before
(these are the first two such imports in `tests/at/suites/`). The fixture adapter is handed a
`ConfigRegistry` in its options and ignores it for this value; the loop bodies hold `h` and
reach into `_integration.ts` for an exported constant instead.
**Evidence**: The value now lives outside the seam built for it: it cannot be overridden per
world, it is absent from the "known keys" list every refusal prints, and the `harness.`
family the comment describes is empty. A loop-tier test file importing a constant from the
integration-tier module is also a coupling in the wrong direction.
**Suggestion**: Register `'harness.auth.access_token_lifetime_seconds': 'accessTokenLifetimeSeconds'`
in `CONFIG_KEYS`. The fixture reads `config.get<number>(key) * 1000` from its options; the loop
bodies read `h.config.get`; the integration bodies read it from the `h` that `ctx.open()`
returns; `_live.ts` reads it for the check in finding 4. Delete the exported constant and the
two direct imports.

### 6. [warning] The one-stack program was appended to a 1,640-line file that now holds two programs
**Location**: `tests/at/harness/runner.ts` (1,640 lines; 1,449 before this diff; the new
section is `1027-1228`), plus `1526` and `1142` (config read twice per run), `1043-1046` and
`1066-1069` (the same token scan twice).
**Finding**: `runner.ts` was already past the thousand-line mark and this diff adds about 190
lines to it. It now carries argument parsing, the child allowlist, redaction, config reading,
the machine-wide lock, the CLI seam, status parsing, the local checks, readiness, the migration
proof, the reset, the identity verdict, `prepareLocalStack`, coordinates, the evidence line,
the vitest report analysis, and `main`. The item's own risk note asked to weigh "a thin new
integration entry that reuses the identity checks" against repointing in place; the diff took
the second option and added a fourth section rather than a module. Inside the new section,
`main` reads `config.toml` to build the lock and the target and `proveTarget` reads it again;
`foreignContainerNames` and `ownContainerNames` each run the same regex over the same text and
differ by one predicate.
**Evidence**: The file already held the runner and the stack lifecycle; the stack half is now
the larger and the more dangerous half, and it is the half a reviewer of the destructive path
has to find inside the report machinery. The two duplications are small, but both sit on the
path that decides what gets reset.
**Suggestion**: Move everything from `readLocalConfig` through `evidenceLine` (config, lock,
seam, status, local checks, readiness, migrations, reset, verdict, prepare, coordinates,
evidence) into `tests/at/harness/stack.ts`; `runner.ts` keeps arguments, report analysis and
`main`. Pass the already-read `config` into `prepareLocalStack(target, config)`. One
`containerNames(text)` scan, partitioned by suffix inside `identityVerdict`.

### 7. [warning] Live prose now states the opposite of the safety model this diff installs, and still cites parked code by name
**Location**: `tests/at/harness/attestation.ts:5-10`, `12`, `30-33`, `74`, `88`, `94`, `146`;
`tests/at/harness/capabilities.ts:53-64`; `tests/at/harness/live-email.ts:12-15`;
`tests/at/harness/runner.ts:241-243`, `326-329`, `480-481`, `568-569`, `669-671`, `764-768`,
`868`; `tests/at/suites/req-001/_live.ts:15`, `943`;
`tests/at/suites/req-001/b-verification-and-sessions.test.ts:9-12`, `19`;
`tests/at/suites/req-001/_fixture.ts:473`, `576`; `tests/at/suites/req-001/_integration.ts:441-442`;
`supabase/config.toml:11-18`; `.env.example:28`; `.claude/agents/mechanical.md:3`;
`.claude/hooks/session-start-banner.sh:7`, `14`; `loop/parked/v1/README.md:3-4`, `11-12`.
**Finding**: Three kinds of stale statement remain in files this diff touched or depends on.
(a) Safety claims that are now false: `attestation.ts` says the shape checks exist "to make the
founder's personal stack unreachable, and they do it" and that "`personalBlockProblems()` and
`localStackProblems()` do that, they still run"; `capabilities.ts` says the same; the tree now
targets that stack on purpose and `personalBlockProblems` is parked. (b) Names of parked or
renamed code presented as live: `prepare()`, `proveSlotTarget()`, "`runner.ts`'s `stackEnv()`"
(there is no such function; the child coordinates come from `childCoordinates`, and
`stackEnv` is a local in `main`), "`db-pool.ts`'s arithmetic", "see EPHEMERAL_FLOOR in
tests/at/harness/db-pool.ts" in the config file the runner reads,
`tests/at/harness/record-oracles.ts` in `.env.example` beside a variable nothing reads,
"Spawned by an orchestrator" in the one agent that stays. (c) Facts the diff itself changed:
the suite header says "this leaf ships no configuration change at all ... the final `git diff`
proves the file unchanged" and "an expiry one hour out mirroring `jwt_expiry = 3600`", two
lines above the bodies whose advances this diff rewrote; the fixture still says "expiring one
hour from now" and "EXACTLY the one-hour TTL". The parked README says "Nothing under
`tests/at` names them" (`live-email.ts` names `db-pool.ts`) and "byte for byte as they last
stood" (`.claude/skills/work/SKILL.md` was edited on the way out, `R099`, one table row).
**Evidence**: The reviewers were asked to challenge the safety of a reset on the founder's
database. The files on that path tell the next reader that a guard protects that database
which no longer exists, and that a config value is one hour when it is two minutes. Prose that
contradicts the code on the destructive path is a defect of the same kind as a stale
assertion, only nothing fails when it is wrong.
**Suggestion**: Rewrite the `attestation.ts` and `capabilities.ts` paragraphs to the one-stack
model in this change; replace the parked names with the live ones (`prepareLocalStack`,
`proveTarget`, `childCoordinates`); fix the suite header, the two fixture comments, the config
comment and the `.env.example` line (or drop the dead variable); correct the two README claims;
drop "by an orchestrator" from `mechanical.md`. Add `loop/parked` to the `ignores` in
`eslint.config.js`, since `bun run lint` still matches `**/*.ts` there.

### 8. [warning] Four `loop/work` scripts and one skill stay with no live caller, and the status line still pays per keystroke for a parked reader
**Location**: `loop/work/statusline.ps1:63-87`; `loop/work/context-gauge.ps1`;
`loop/work/ci-status.ps1`; `loop/work/render-mermaid.ps1`; `loop/work/sheet-check.ps1` with
`loop/work/pstack-models.expected.md`; `.claude/skills/find-batch/SKILL.md:3`, `14`;
`loop/parked/v1/README.md:41`.
**Finding**: The item's rule was "scripts in `loop/work/` with no live caller are parked", and
the README records the two kept scripts and their callers (`work-lib.ps1`, `materialize.ps1`).
Four others stay with no caller anywhere in the live tree: `.claude/settings.json` references
only the branch guard, the cloud banner and the status line; the deleted workflow file was the
only document that told anyone to run `render-mermaid.ps1` or `sheet-check.ps1`, and
`pstack-model-selection.md` does not name `sheet-check`; `context-gauge.ps1` reads the
snapshot that `statusline.ps1` writes "for the stamp's context gauge", and the stamp is
parked. So the status line still writes a JSON file on every refresh to feed a script nothing
runs. `find-batch`'s description says a batch "happens only when the founder types both ids
into /work", and its body tells the founder to type `/work <primary> <partner>`; the
controller says batching is not part of v2, and `/work` is parked.
**Evidence**: The rule was applied to seven scripts and not to these four; a reader has no way
to tell the kept-with-a-caller set from the kept-by-oversight set, which is the "spare part"
state the README says the parked folder exists to prevent. The snapshot block is the one item
here with a live cost (a directory check and a file write per status refresh).
**Suggestion**: Park `context-gauge.ps1`, `render-mermaid.ps1`, `find-batch` and, unless the
founder runs them by hand, `ci-status.ps1` and `sheet-check.ps1` with its expected copy; record
any that stay and their caller in the README line that lists `work-lib.ps1` and
`materialize.ps1`. Delete the snapshot block from `statusline.ps1`.

### 9. [nit] `CapabilityEvidence` and the `evidence` parameter are vestigial
**Location**: `tests/at/harness/capabilities.ts:39-47`, `129`, `275`.
**Finding**: The only witness that read `evidence` was the judge's, and it is parked. The type
now exists to say "No live witness needs any of it"; no caller passes a third argument.
**Evidence**: A parameter that every witness ignores and every caller omits is dead code with a
type attached, and it keeps a door open for a caller to contribute evidence a witness is
supposed to derive for itself.
**Suggestion**: Delete `CapabilityEvidence`, the third parameter of `witnessedCapability`, and
the second parameter of `CapabilityWitness`.
