# Architectural critique — the v1 ceremony and the acceptance-test harness

Written for AI4DEV-86 (v1 ceremony out, CI aligned). I read the explanation first, then formed
these judgements from the code. Line numbers are from this worktree.

Two measurements frame everything below.

- The harness is 15,493 lines. The two suites are 8,707 lines. Together 24,200 lines.
- The shipped code they grade is 1,699 lines of edge functions plus five migrations.

That ratio is not by itself a defect. What follows is about where the 24,200 lines go, and
which parts of them touch shipped code at all.

## Findings

### 1. [structural] The safety rule is a blacklist of one stack, not a whitelist of the target. The repoint inverts it.

**Components**: `tests/at/harness/db-pool.ts` (`personalBlockProblems`, `refusePersonal`,
`refusePersonalSlotConfig`, `proveSlotTarget`, `stackEnv`), `tests/at/harness/runner.ts`
(`localStackProblems`, `supabaseInvocation`, `resetLocalDatabase`).

**Finding**: Nowhere does the design state positively which stack a run may destroy. It states
only which stack it may not. Every guard is written as a refusal keyed on the personal stack,
and the personal stack is read from the repository's own config at run time:

```
// db-pool.ts:492
export function personalProjectId(itemRoot: string = REPO_ROOT): string {
  return readLocalConfig(itemRoot).projectId;   // => "poancmeitlmxejofwzuu"
}
```

Four separate refusals fire on that value or its port block:

- `personalBlockProblems` (db-pool.ts:457) — `value === personalProjectId` is a problem, and any
  port in 44320–44329 is a problem.
- `proveSlotTarget` (db-pool.ts:1194) — `carriesPersonal = personal !== '' && raw.includes(personal)`
  throws `REFUSING TO <act>`.
- `stackEnv` (db-pool.ts:1373) — throws when the API or DB URL port is in 44320–44329, and throws
  again when the project id is the personal one.
- `refusePersonalSlotConfig` — runs the first of these over the slot's config on disk before
  reset, stop and env emission.

The item points the integration tier at `poancmeitlmxejofwzuu` on 44321. Every one of those four
refusals now fires on the intended target. This is not a repoint. It is a polarity flip on four
guards, and the flip has to be made by hand in a file whose header states the opposite rule as
load-bearing (db-pool.ts:8–12, runner.ts:10–13).

**Impact**: Two costs. First, "repoint in place" is much larger than it sounds, and the brief's
risk line understates it — the difficulty is not that `runner.ts` is deep in slot assumptions, it
is that the guards mean the opposite of what the item needs. Second, and worse, the cheap way to
flip a refusal is to delete it. If the flip is done by removing checks rather than by restating
the target positively, the harness loses the only code that stops a reset reaching a hosted
project, and it loses it in a file whose git history records a real database being destroyed on
2026-08-09.

**What does carry over cleanly**, and is worth saying because it is the reusable half:
`localStackProblems` (runner.ts:754), `supabaseInvocation` (runner.ts:630),
`proveMigrationsReplayed`, `waitForReady` and `resetLocalDatabase()` with no target are all
target-neutral. They check loopback, configured ports, the local issuer, no hosted `ref`, and
the migration set. None of them names a slot. A thin integration entry that composes those five
against the repo config is a real option, and it is smaller than editing the pool.

### 2. [structural] The one producer of a positive project proof lives inside the unit being parked, and every integration green depends on it.

**Components**: `tests/at/harness/attestation.ts` (`writeAttestation`),
`tests/at/harness/db-pool.ts` (`proveSlotTarget`, `ownContainerNames`),
`tests/at/harness/index.ts` (`buildLiveLedger`).

**Finding**: The chain is short and it is a hard dependency, not a stylistic one.

`writeAttestation` refuses unless the read handed to it names the target:

```
// attestation.ts:100
if (read.provenProjectId !== target.projectId) throw new Error('REFUSING TO WRITE THE ATTESTATION...')
```

`provenProjectId` is non-null in exactly one place — `proveSlotTarget` (db-pool.ts:1194), from
`ownContainerNames(raw, project)`, which matches container names ending `_ai4good-slot-N`
(db-pool.ts:1110). No other function in the tree produces a `ProvenSlotRead`.

Downstream, `buildLiveLedger` (index.ts:337) calls `attestSlot` before it constructs anything,
and refuses the whole ledger if the round trip fails. Every `real` grant — the clock, the mail
catcher, every backed sut method — carries that attestation. `registry.ts`'s
`aboveLoopStubbedRefusal` then turns every id red when anything is a stand-in.

**Impact**: Park `db-pool.ts` as a unit and there is no producer of the proof, so no attestation
write, so no attestation read, so no `real` capability, so all 37 req-001 ids go red at
integration. The done contract requires 16 of them green. So this item cannot park the pool
without writing new code on the destructive path — an identity read for the one stack that
proves `poancmeitlmxejofwzuu` from the CLI's own container names. That is the most
safety-critical code in the repository, and the item has to author it rather than move it.

The mechanism itself generalises fine: `supabase_db_poancmeitlmxejofwzuu` is a container name
like any other, and `ownContainerNames` takes the project as a parameter. What does not
generalise is the enclosing refusal, which throws when that same string appears (finding 1). The
new read has to require the name that the old read forbids.

### 3. [structural] One configuration value has four uncoordinated copies, and the registry built to prevent that does not hold it.

**Components**: `supabase/config.toml`, `tests/at/harness/db-pool.ts`,
`tests/at/suites/req-001/_integration.ts`, `tests/at/suites/req-001/_fixture.ts`,
`tests/at/harness/atconfig.ts`, `tests/at/harness/config.ts`.

**Finding**: `jwt_expiry` exists four times, with two different values, and no copy imports
another.

| Where | Value | How it is kept honest |
|---|---|---|
| `supabase/config.toml:174` | `3600` | the stack's real setting |
| `db-pool.ts` `SLOT_JWT_EXPIRY_SECONDS` (line 407) | `120` | overlaid onto the generated slot config |
| `_integration.ts:65` `SLOT_JWT_EXPIRY_MS` | `120_000` | a comment: "the generator's own constant is the source of truth ... the two are not imported into each other" |
| `_fixture.ts:468` `ACCESS_TOKEN_TTL_MS` | `3600 * 1000` | a comment citing "supabase/config.toml line 165" — the value now sits at line 174 |

Meanwhile `atconfig.ts` opens with the doctrine this is a counter-example to: "a threshold copied
into a test body is a second source of truth. When the founder re-tunes a value, a hard-coded
copy keeps asserting the old one and the suite goes green on a stale promise. Every configured
number lives here; no test may hard-code one."

The registry holds 22 entries. `CONFIG_KEYS` in `config.ts` exposes 4. One test body reads 3 of
those 4 (`req-016/b-delivery-defaults.test.ts:125–127`), and the fourth
(`harness.oracle.judge_votes`) feeds a capability nothing calls. `jwt_expiry` — the one
configured number with a live consumer, and the one this item must change — is not in the
registry.

**Impact**: The repoint has to move this value and there is no single place to move it.

- Pin `config.toml` to 120: the integration waits work, and `_fixture.ts` keeps asserting 3600
  and stays green, because the loop tier commands its own clock. That is a silent green over a
  model that no longer matches the stack — exactly the drift class this tree says it deletes.
  The stale line-number citation shows the comment-as-binding already failing.
- Leave `config.toml` at 3600: AT-001.12 must wait past an hour. Its budget is 240 s
  (`INTEGRATION_TIMEOUT_MS`). The declared integration green becomes unreachable.

Neither branch is free, and the design gives the lead no third option, because the abstraction
that would have given one is present, is documented, and does not cover this value.

### 4. [structural] The req-016 suite grades no shipped code. Its machinery is a fake talking to itself.

**Components**: `tests/at/suites/req-016/` (2,163 lines), `tests/at/harness/sentinels.ts`,
`faults.ts`, `vendors.ts`, `fixtures.ts`, `clock.ts`, `config.ts`.

**Finding**: `grep -rn "supabase/functions" tests/at/suites/req-016/` returns nothing.
`supabase/functions/` contains no notification code — the only match for "notification" under
`supabase/` and `src/` is a line in `config.toml`. `req-016/_fixture.ts` (507 lines) implements
the emitter, the taxonomy defaults, the delivery channels, the anti-spam guard, the ops queue and
the state transitions itself.

The harness capabilities that req-016 is the sole consumer of do not close that gap; they sit
inside it. `createSentinels(seam)` searches `seam.read(scope)`, and the seam is the fixture's own
store (`sentinels.ts:57`). `createFaults(seam)` arms `seam.points()`, and the points are the
fixture's own (`faults.ts:36–43`). The fixture names its own fault point
(`_fixture.ts:71`, `notifications.between_transition_and_event_write`) and its own sentinel scope
(`_fixture.ts:81`). Both ends of every sentinel and fault protocol are the same file.

**Impact**: This is where the largest share of frozen machinery earns or fails to earn its place,
and the honest reading is that eleven loop-tier greens are a consistency check between a
specification and a simulation of that specification, written together, by the same hand, in the
same change. That is not nothing — it pins the taxonomy and the delivery defaults before any code
exists, and the taxonomy table is real product knowledge. It is not evidence about the product,
and no amount of harness ceremony around it makes it one. If the lead keeps sentinels, faults and
the vendor sims frozen, keep them knowing their only consumer proves a fake correct.

### 5. [structural] The semantic judge is a complete subsystem with no consumer, and above loop the ledger stamps it `real` while its transport provably cannot answer.

**Components**: `tests/at/harness/oracles.ts` (1,159), `oracles.selftest.ts` (1,126),
`record-oracles.ts` (261), `contracts.ts` lines 190–340, the `oracles.judge` witness in
`capabilities.ts`, `CONFIG_KEYS['harness.oracle.judge_votes']`, three call sites in `index.ts`.

**Finding**, in two parts.

*It has no consumer.* No suite calls `h.oracles.judge`. The only `_oracles.ts` under `suites/` is
req-016's, and it holds three pure multiset helpers with no relation to the judge.
`harness/recordings/` holds one README and no recording. `record-oracles.ts` is the only live
writer, says NEVER IN CI, and has never run. `oracles.selftest.ts` at 1,126 lines is the largest
single selftest in the tree, and it tests the one capability nothing consumes. The subsystem's own
constants concede the situation: `JUDGE_EFFORT` is labelled PROVISIONAL because "there is no
consuming evaluation to run that sweep against yet ... The labelled sweep belongs to the first
suite that consumes an oracle" (oracles.ts:77–83).

*Its provenance verdict is false above loop.* `createOracleCapability` at any tier above loop
builds `createLiveTransport()` and registers the capability `real` (oracles.ts:1147–1158). That
transport reads `AT_JUDGE_API_KEY` at send time and throws `OracleUnavailable` when it is absent
(oracles.ts:798–808) — and the runner's `ENV_ALLOWLIST` never passes that variable to a child, by
design. So on every integration run, a capability that cannot answer is on the ledger as `real`,
and the witness reaches that verdict from two caller-supplied brand strings rather than from the
value (`capabilities.ts`, the `oracles.judge` witness). This is the exact sentence the
capabilities header forbids, arriving through a different door: `real` granted with no positive
grounds about the thing itself.

**Impact**: 2,546 lines plus about 150 lines of `contracts.ts` types plus the most complex
witness in `capabilities.ts`, all dead. Parking it costs three call sites in `index.ts`, one
member on `CapabilityLedger`, one member on `AtHarness`, one `CONFIG_KEYS` row. Nothing else
moves. The provenance defect above is not costing anything today only because no test asks the
oracle a question — which is another way of saying the subsystem is invisible in both directions.
This is the clearest keep/park/remove call in the item and it is not close.

### 6. [concern] The alternative the brief asks the lead to weigh is already in the tree, in CI, and reaches inputs the acceptance path cannot. The heavy path says so itself.

**Components**: `tests/at/harness/shipped-caller.selftest.ts` (173),
`shipped-verification.selftest.ts` (130), `tests/at/vitest.config.ts`, the `at:selftest` script.

**Finding**: Plain vitest against shipped modules is not a hypothetical. It runs today, in CI,
under `at:selftest`, and it imports `supabase/functions/_shared/caller.ts` directly. Its header
states why the acceptance path cannot do the same work:

> "the acceptance fixture renders WELL-FORMED GoTrue shapes: a 200 with a whole user, or a 401
> with no user. So no acceptance body can hand this module a number, an array, or a body whose
> `id` is an object without first making the fixture lie about what Auth sends. Driving the
> module DIRECTLY is the only way to reach those inputs."

The arithmetic is on the same side. Of 5,912 selftest lines, 303 (5%) test shipped code; the
other 5,609 test the machinery. Of the 32 loop-tier greens across both suites, 11 (req-016) touch
no shipped code at all, and the other 21 reach four `_shared` modules through a Map-backed
fixture — never `edge.ts`, and never any of the three function entry points.

**Impact**: The strongest evidence for the ruling the brief asks for is written inside the design
being ruled on. The heavy path concedes that a 300-line light lane covers cases it structurally
cannot reach. That is an argument from the architecture, not from taste, and it is the one to put
in the pull request body under "Harness ruling".

The counter-argument is real and should be stated beside it: the light lane has no id bijection,
so nothing would notice an acceptance criterion losing its test. `at:check` is 173 lines, one
regex over `atTest(` call sites, and zero dependencies (`check.ts:78–121`). It is the cheapest
thing in the harness per unit of value, and it is separable from everything else here. Whatever
else is ruled, that piece should stay.

### 7. [concern] Parking `work-lib.ps1` breaks the status line for every session, and the branch cannot see it happen.

**Components**: `.claude/settings.json`, `loop/work/statusline.ps1`, `loop/work/work-lib.ps1`,
`materialize.ps1`, `stamp-hook.ps1`.

**Finding**: `statusline.ps1:108` dot-sources `work-lib.ps1` unconditionally, inside the branch
that runs on every prompt:

```
. (Join-Path $PSScriptRoot 'work-lib.ps1')
```

`materialize.ps1:7` and `stamp-hook.ps1:105` do the same. The brief lists `work-lib.ps1` in the
park set and lists `statusline.ps1` as staying.

The timing is the dangerous part. `.claude/settings.json` runs the status line by absolute path
into the main checkout — `C:\Users\nirdr\Downloads\ai4good\loop\work\statusline.ps1` — not
through the worktree. So while this item works, the status line reads the unparked main checkout
and looks healthy. The breakage arrives at merge, on every session, in a command the harness runs
before every prompt.

**Impact**: The item's own verification cannot catch this, because the item runs in a worktree the
broken path does not reach. Either the dot-source moves with the park, or `work-lib.ps1` stays.

### 8. [concern] The drill harness binds the exact set being parked, is not in the park list, and is not in CI.

**Components**: `loop/drills/run-drills.ps1`, `.claude/agents/*.md`,
`.claude/skills/work/conductor/phase-*.md`, `loop/work/twin-check.ps1`.

**Finding**: `run-drills.ps1` asserts four things about the park set.

- Line 303: runs `twin-check.ps1` and asserts exit 0.
- Lines 306–323: every file under `.claude/agents/*.md` and `.claude/skills/work` recursively is
  tracked by git and not ignored.
- Lines 325–340: nine named phase files exist, and `conductor.md` names each one.
- Lines 360–370: no role contract defines the removed PARK verb.

There is no placement of a parked folder that survives this. Put it under `.claude/skills/work/`
and the `tracked-machinery` scan walks it. Put it elsewhere and the phase-file guard fails on the
nine missing files. Either way the drills go red.

There is also a word collision worth naming before it bites. The drills' drift guard treats the
literal string `PARK` as resurrected dead machinery (`$deadWords`, line 344). This item's chosen
verb for "moved aside" is that word, and the parked README will say it.

**Impact**: A self-check harness that is permanently red and never run is worse than none: the
next person to run it cannot tell the ceremonial failures from the real ones. The drills belong in
this item's scope or in an explicit "not done here" line that says why they stay red.

### 9. [concern] The v2 entry point's authority chain runs through the v1 prose being parked.

**Components**: `.claude/skills/controller/SKILL.md`, `.claude/skills/work/shared-invariants.md`,
`.claude/skills/work/SKILL.md`, `loop/work/work-lib.ps1`, `tests/at/harness/db-pool.ts`.

**Finding**: Four separate dependencies, one of which is a binding claim:

- Line 12: "`shared-invariants.md` in `.claude/skills/work/` first. **It binds you.**"
- Lines 47–48: materialisation is delegated to `/work` SKILL.md by section name.
- Line 72: `Set-HeldItem` from `work-lib.ps1`.
- Line 157: a fresh cloud VM runs `bun tests/at/harness/db-pool.ts setup` — the exact command
  this item's brief says never to run.

**Impact**: "Park the old `/work` prose" cannot be a move while the v2 entry point says a file in
that set binds the session. Either `/controller` absorbs what binds it, or the parked folder is a
live dependency of v2 under a name that says otherwise. The cloud-brief line is a straight
contradiction and has to change in this item regardless of how the rest is ruled.

### 10. [concern] `AT_DB_SLOT=1` names two stacks 1,000 ports apart, and the seam it bypasses is already inert.

**Components**: `.claude/settings.json`, `tests/at/harness/runner.ts:1338`,
`tests/at/harness/db-pool.ts` (`occupy`, `slotProjectId`, `portMappings`),
`.claude/skills/controller/SKILL.md:156`.

**Finding**: `.claude/settings.json` sets `AT_DB_SLOT: "1"` as a session-wide environment value
for every Claude session in this project. Two readings exist:

- The code: `runner.ts:1338` passes it to `occupy` as a slot override; slot 1 is project
  `ai4good-slot-1` on API 45321 (`db-pool.ts:349`).
- The prose: `controller/SKILL.md:156` and this item's brief both read it as "one database" on
  44321.

A second fact makes this sharper. On the override path, `occupy` consults the reservation only
when one exists (`db-pool.ts:918–928`); with no reservation file it proceeds. So in every v2
session the reservation file — which the explanation calls the only data crossing from the
ceremony into the harness — is already bypassed. The live coupling is not the reservation. It is
this variable, and it points at the wrong stack.

**Impact**: After the repoint the variable is dead at best. Delete it from `.claude/settings.json`
in this item rather than repurposing it. A repurposed name keeps the old meaning alive in every
transcript, every cloud brief and every future reader's head, and the two meanings differ by a
whole database.

### 11. [observation] The document that "binds" a v2 session gives instructions CI fails, and CI's own comment says that instruction caused the defect it was meant to prevent.

**Components**: `.claude/skills/work/shared-invariants.md:79`, `.github/workflows/ci.yml`
reference guard.

**Finding**: `shared-invariants.md` line 79 tells authors: "Write 'the instruction that repaired
X', 'motivated by X', or use `ref` / `part of` / `towards`. CI enforces this."

The guard's own comment says the opposite: "The deliberately 'non-closing' words are NOT safe:
ref, part of, related to, towards all do it. ... An earlier version checked only the verb and told
authors to reach for `ref`/`towards` instead — advice that caused the exact defect it was
preventing."

**Impact**: Small in isolation, larger given finding 9: this is the file `/controller` says binds
a v2 session. Parking it as written preserves a wrong instruction under a name that says
"invariants". Correct the line in whatever absorbs it, or before it is parked.

### 12. [observation] The `--expect` floor is thinner than it reads, and a third of req-001 is a to-do list expressed as declared failures.

**Components**: `tests/at/expected/req-001.json`, `tests/at/suites/req-001/_pending.ts`,
`tests/at/harness/expected.ts`.

**Finding**: 16 of req-001's 37 ids route through `notLanded()` (`_pending.ts:80`), all throwing
the same `sut-missing` phase for features that do not exist. `expected.ts` rebuilds and compares
only the anchored prefix `AtPending: <id> PENDING [<phase>] — `. `_pending.ts`'s own header states
the residual plainly: "the tail after the em dash is FREE ... a stub whose detail read 'todo'
would pass every command in this repository. Nothing mechanical holds the detail below to the
truth."

`expected.ts:371–376` records a second residual: a hook that throws in a file that also holds a
declared red is invisible to the count arithmetic.

**Impact**: Worth stating exactly when ruling on `--expect`, because the manifest is easy to
overvalue. What it really buys is two things: a declared red that turns green fails, and vitest's
own counts must reconcile. What it does not buy is any check that a pending id's stated reason is
true — a written ledger does that, by hand, per leaf. Both are real; neither is "every red is
exactly described".

## Where the architecture is sound

Three things are well built and should survive whatever is ruled.

**The CLI seam.** `supabaseInvocation` (runner.ts:630) is one function, states the project
identity positively rather than merely avoiding an override, asserts the absence of every other
`SUPABASE_*` rather than trusting the allowlist, and pins the working directory to `--workdir`.
Each of the three rules cites a measured incident. A wall with one builder is the right shape, and
this is one.

**The child environment allowlist.** `ENV_ALLOWLIST` (runner.ts:129–166) plus `bun --no-env-file`
closes both routes by which a tracked `.env` could reach a test. Deny-by-default at a process
boundary is the correct placement, and it is stated once.

**The proof-travels-with-the-act idiom.** `resetLocalDatabase(target, proof)` and
`writeAttestation(target, read, nonce)` both make the identity read a parameter rather than a
prior call, so an importer cannot reach the destructive act without it. That is a real use of the
type system to move a convention into the compiler, and it is the pattern worth keeping if a new
integration entry is written for the one stack — it is what would keep finding 1's polarity flip
from becoming a deletion.

## What I did not do

I ran nothing. Every colour above comes from the manifests and from reading the code paths. I did
not measure the running 44321 stack, and I did not check whether its GoTrue actually carries
`jwt_expiry = 3600` at run time rather than only in `config.toml`. Finding 3's second branch
depends on that, and it is one command to settle.
