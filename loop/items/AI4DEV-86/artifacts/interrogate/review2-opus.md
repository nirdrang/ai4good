# Review 2 — opus, on the fix commit db2153b (diff against ea73436)

Scope: the fix commit only, judged against the fifteen rulings. I read `diff-fix.patch` whole,
then `tests/at/harness/runner.ts`, `attestation.ts`, `capabilities.ts`, `check.ts`,
`runner.selftest.ts`, `tests/at/suites/req-001/_live.ts`, `_integration.ts`,
`b-verification-and-sessions.test.ts`, `supabase/config.toml`, `.github/workflows/ci.yml` and the
parked README, and ran the pinned compiler (`node_modules/typescript/bin/tsc -p tests/at/tsconfig.json
--noEmit`, exit 0) to confirm the private-symbol brand compiles under this project's settings.

**No critical findings.** The destructive path is genuinely safer than it was, not merely different:
the live-holder takeover is gone with its knob, `AT_REPO_ROOT` can no longer aim the reset, a proof
cannot be written as a literal, and the second read narrows the window before the reset. Every item
1–15 is present in the tree. What follows is where the execution falls short of the ruling it was
written for, and where a new claim is wider than what the code does.

## Findings

### 1. [warning] The reset kept the second parameter the ruling deleted from the write

**Location**: `tests/at/harness/runner.ts:971` (`resetLocalDatabase`), `1106-1148` (`identityVerdict`),
against `tests/at/harness/attestation.ts:95` (`writeAttestation`)

**Finding**: Ruling 3's doctrine is stated in the attestation file itself — the URL comes out of the
proof "so an importer cannot hand this function a proof of one database and the coordinates of
another, because there is no second parameter to disagree with the first". The fix applied that to
`writeAttestation`, which now reads `read.status.dbUrl`. `resetLocalDatabase(target, proof)` still
takes both, and aims the destructive act entirely with `target`:

```ts
const invocation = supabaseInvocation(target, ['db', 'reset', '--local']);
```

Nothing from `proof` reaches the CLI. `proof.status` is never touched.

**Evidence**: Two facts make this more than symmetry-for-its-own-sake.

First, `provenProjectId` is a tautology. `identityVerdict` opens with `const id = target.projectId`
and closes with `return { [PROVEN]: true, provenProjectId: id, ... }`. It is the target's own id
copied through, never a value read out of the CLI output — what the CLI output establishes is
`names.own.length > 0`. So `proof.provenProjectId !== target.projectId` can only fire when a caller
carries a read across from another target. On the one live path (`prepareLocalStack`, one `target`,
one `config`) it can never fire. The runtime check is exercised only by the two selftests that
fabricate the mismatch by hand.

Second, the half the proof does *not* carry is the half the incident was about. `CliTarget` names
both `workdir` and `projectId`, and the seam's own docstring (runner.ts:615-620) records that the
2026-08-10 hybrid came from `--workdir <other>` while the working directory was itself a project —
a project id and a working directory that disagreed. The read is taken through
`proveTarget(target, ...)`, so the workdir *was* judged; the read then throws it away. An importer
can hand `resetLocalDatabase({ workdir: elsewhere, projectId: same }, read)` and compile, and both
the type check and the equality check pass. That is the exact disagreement ruling 3 closed on the
other side of the same commit.

**Suggestion**: Put the target in the read — `readonly target: CliTarget` on `StackIdentityRead`,
set by `identityVerdict` from the target it judged. Then `resetLocalDatabase(read)` and
`writeAttestation(read, nonce)` take one parameter each, there is nothing left to disagree, and both
refusal branches, both refusal messages and both selftests that drive them delete themselves. That
is a smaller runner.ts and a stronger guarantee at the same time.

### 2. [warning] The brand is enumerable, so a spread reproduces it — unlike the symbol the docstring cites as precedent

**Location**: `tests/at/harness/runner.ts:1064-1071` and `1148`, against
`tests/at/harness/capabilities.ts:86-97`

**Finding**: The new brand is set as an ordinary object-literal key:

```ts
return { [PROVEN]: true, provenProjectId: id, status, containers: names.own };
```

Its docstring says an importer "cannot write one by hand", and that the line drawn is "the same line
`capabilities.ts` draws for its own symbol". `capabilities.ts` draws a stronger one. Its
`stampAttestation` uses `Object.defineProperty(value, ATTESTATION, { ..., enumerable: false,
writable: false, configurable: false })`, and the comment at line 86 says why in six words:
"Non-enumerable, so it never travels into a JSON dump."

**Evidence**: Object spread and `Object.assign` copy own **enumerable** symbol-keyed properties. So
`{ ...read, provenProjectId: config.projectId }` carries the brand at run time, and TypeScript's
spread type carries the symbol-named member too, which means the result is a `StackIdentityRead`
without a cast anywhere. That matters because of the threat model the same paragraph states: "an
honest mistake nothing can notice, not an author set on defeating the design". `capabilities.ts`
sets the bar at "something at least as deliberate as a cast" (line 65-68). A spread that adjusts one
field is not that — it is the first thing someone reaches for when they want the same read aimed at
a target the read did not prove, and it is precisely the mistake the brand exists to make impossible.

**Suggestion**: Mint the read through a one-line private helper that stamps the brand with
`Object.defineProperty(..., { value: true, enumerable: false, writable: false, configurable: false })`,
as `stampAttestation` does. The type stays identical; the spread stops working; the docstring's claim
of parity with `capabilities.ts` becomes true.

### 3. [warning] The lifetime-pin refusal wears the Docker advice that ruling 5 removed from the lock, in the same commit that removed it

**Location**: `tests/at/harness/runner.ts:1215-1217` (`prepareLocalStack`), `1596-1607` (the second
`try`/`catch` in `main`), `1533-1538` (`stackHelp`)

**Finding**: D14's defect was a message about lock contention followed by advice to restart Docker.
The fix gave the lock its own `try`, which is correct — and then put a new refusal of exactly the
same character inside the block that still appends the advice. `lifetimePinProblem` is a pure
comparison of two literals in this tree. It throws from the first two lines of `prepareLocalStack`,
which sits in the second `try`, whose catch produces:

> …Nothing was done.
> The integration tier rebuilds the one stack's database from supabase/migrations on every run…
> Two things cause this:
>   1. Docker Desktop is not installed, or is installed but not running…
>   2. Docker is fine but the one stack is not up…

Docker is not one of the two things that cause it. Neither is the stack. Nothing was contacted.

**Evidence**: There is a second symptom of the same misplacement. `main`'s own comment at line
1511-1515 states the principle: the declaration preflight sits before the stack sequence so that
"a bad declaration never takes the machine-wide lock, never talks to Docker and never resets a
database — the refusal costs nothing at any tier". The lifetime pin is the same kind of refusal —
decidable from two files on disk, before anything is contacted — and it is now the one preflight
that runs *after* the machine-wide lock is taken. On a mispinned tree every integration run acquires
and releases the lock to learn a fact that was true before it started.

**Suggestion**: Hoist it beside the guard added in the same commit:

```ts
if (REPO_ROOT !== INSTALL_ROOT) return infra(…);
const pin = lifetimePinProblem(readLocalConfig(REPO_ROOT));   // or inside the first try
if (pin) return infra(pin);
```

Report it bare through `infra()`. Two "refuse before anything happens" checks now live in two
different functions with two different error dressings; one place with one dressing is both simpler
and correct.

### 4. [warning] "No stack is running" is decided by a syntactic proxy, and the neighbouring shape still wears the safety banner

**Location**: `tests/at/harness/runner.ts:1117-1122` (the new branch), `669-673` (`statusJsonSpan`),
`713-720` (the required-field check in `parseStackStatus`)

**Finding**: Ruling 5 asked that a stack answering no JSON be reported as not running rather than as
a refusal, because "a safety phrase that fires on routine operator error stops being read". The
implementation tests for the absence of a `{`…`}` span in stdout. That is a proxy for the condition,
not the condition, and the adjacent shapes fall through to the refusal.

**Evidence**: Trace a stack that is up but not finished starting, or a CLI that prints an object with
empty values. `statusJsonSpan` returns a span, so the new branch does not fire. `parseStackStatus`
then reaches line 717 and throws ``supabase status` reported no API_URL, no DB_URL, no ANON_KEY, no
SERVICE_ROLE_KEY`, and `identityVerdict`'s catch at 1127-1129 wraps it as:

> REFUSING TO RESET poancmeitlmxejofwzuu: the stack did not report its status — … Nothing was done.

That is the loud safety phrase, fired on a half-started stack, which is a routine thing to hit
seconds after `bun run db:start`. The required-field branch exists in `parseStackStatus` because that
shape has been seen; the fix guarded one of the two shapes of "nothing is really answering yet" and
left the other one banner-clad.

**Suggestion**: Decide "is anything running" on the answer rather than on its punctuation — if the
four required fields are absent or empty, that is the same "no stack is running for `<id>`; run
`bun run db:start`" message, not a refusal. Reserve `REFUSING` for identity.

### 5. [warning] `AT_LOCK_DIR` keeps the parity the code claims and the new guard withdrew

**Location**: `tests/at/harness/runner.ts:298-311` (`lockDir`), `1569-1578` (the new guard),
`tests/at/harness/runner.selftest.ts:365`

**Finding**: The fix refuses the integration tier when `AT_REPO_ROOT` redirects the data root,
because "a data root must not choose which database is reset". `AT_LOCK_DIR` redirects the machine-wide
lock — the only thing that stops two runs resetting the one stack under each other — and gained no
guard. The docstring above it still says it is "the same pattern and the same reason as
`AT_REPO_ROOT`", which after this commit is no longer true.

**Evidence**: The new selftest itself passes them as a pair: `childEnv({ AT_REPO_ROOT: root,
AT_LOCK_DIR: join(root, 'locks') })`. The comment at 1571 notes that bun loads `AT_REPO_ROOT` out of
`.env.local`; the same is true of `AT_LOCK_DIR`, and the runner reads it in the parent, where the
lock is taken. An operator who exports it in one shell and not another gives two concurrent
integration runs two different lock files for one stack, silently, with no message — which is the
failure `acquireStackLock`'s whole 60-line takeover-gate argument exists to prevent.

**Suggestion**: One more line beside the guard just added — refuse the integration tier when
`AT_LOCK_DIR` is set — or, if the selftests need it at the loop tier only, say that in the
`lockDir` docstring instead of claiming a parity that no longer holds.

### 6. [warning] The two-read safety claim is true of the reset and false of the attestation write

**Location**: `tests/at/harness/runner.ts:1200-1204` (the "WHY TWO READS" paragraph), `1215-1227`

**Finding**: The paragraph says the second read "is taken immediately before the destructive act and
is the one both destructive acts receive", and that this "narrows the check-to-use window to the
width of one CLI call". There are two destructive acts and the sentence is only true of the first.

**Evidence**: The sequence is `proveTarget` → `resetLocalDatabase` → `waitForReady` →
`proveMigrationsReplayed` → `writeAttestation`. The write receives the same `read`, but by then the
reset has had up to `RESET_TIMEOUT_MS` (600 s by default), the readiness wait up to
`READY_TIMEOUT_MS` (120 s), and a migration query has run. The check-to-use window for the second
destructive act is up to twelve minutes, not one CLI call. The residual risk is small — the write
goes to the database the reset just rebuilt — but this codebase's stated standard is
`capabilities.ts:58`, "a closure claim wider than the truth is the defect this file exists to
remove", and this is one.

**Suggestion**: Either say which act the sentence covers ("the reset receives a read one CLI call
old; the attestation write receives the same read after the reset, because between them the reset
itself is the thing that would have to have failed"), or take a third read before the write.

### 7. [nit] Two unreachable refusal branches were deleted and one was created

**Location**: `tests/at/harness/runner.ts:669-673`, `687-695`

**Finding**: `statusJsonSpan` was extracted so the same test could run in two places. After the
extraction, `parseStackStatus`'s own "reported no JSON" throw is unreachable: its only caller is
`identityVerdict:1126`, and `identityVerdict` performs the identical test at 1117 and returns before
it. The same `indexOf('{')` / `lastIndexOf('}')` scan runs twice over the same stdout, and one of the
two messages it can produce can never be produced.

**Evidence**: `grep parseStackStatus` over the live tree returns runner.ts:681 (the definition) and
runner.ts:1126 (the one call). It is not imported by any selftest. Ruling 3 asked for two unreachable
branches to go; this one arrived in the same commit.

**Suggestion**: Have `parseStackStatus` take the span (or keep the not-running classification in one
place per finding 4), and drop the branch that cannot fire.

### 8. [nit] A new comment claims the loop tier does not import the integration module, on a line the loop tier imports it from

**Location**: `tests/at/suites/req-001/_integration.ts:58-68`, against
`tests/at/suites/req-001/b-verification-and-sessions.test.ts:71`

**Finding**: The un-export is what ruling 8 asked for, and the twin comment in the test file is
correctly scoped — "so the loop tier never imports the integration module **for a number**". The
comment left in `_integration.ts` drops the qualifier: "each reads the registry for itself, so the
loop tier never imports this integration module."

**Evidence**: `b-verification-and-sessions.test.ts:71` reads
`import { at00109, at00110, at00112, at00113, at00114, at00138, INTEGRATION_TIMEOUT_MS } from './_integration.ts';`
— unconditional, on every tier. The module is imported; only the constant moved. Worth correcting
rather than shrugging at, because the sentence is the whole justification for having created a third
copy of `AT_CONFIG.accessTokenLifetimeSeconds.value * 1000` (`_fixture.ts:473`, `_integration.ts:68`,
`b-verification-and-sessions.test.ts:100`).

### 9. [nit] `_live.ts`'s opening list now contradicts itself

**Location**: `tests/at/suites/req-001/_live.ts:10-14`

**Finding**: The commit rewrote the second bullet to say "the stack's own edge-runtime container out
of this tree's `supabase/`" and left the sentence that introduces the list and the bullet above it
unchanged: "Every operation below goes to **the slot's own stack**: — Supabase Auth over HTTP, at
**the slot's own gateway** … as **the slot's own mail catcher** really holds them".

**Evidence**: `attestation.ts` was given an explicit closing paragraph for exactly this residual
("THE NAMES STILL SAY 'SLOT' … read 'slot' here as 'the one prepared stack'"), which is the right
answer where the names are on the wire. Here they are prose in a block the commit edited, and the
block now reads as though two different things are being described. Either finish the paragraph or
give it the note `attestation.ts` got.

### 10. [nit] The file the parked README newly vouches for still contradicts it

**Location**: `.claude/hooks/session-start-banner.sh:7`, against `loop/parked/v1/README.md`

**Finding**: The commit added a README line stating that this hook stays live, exits unless
`CLAUDE_CODE_REMOTE` is true, and that with `banner.ps1` parked a local session now has no
session-start banner from either source. The hook's own comment, two lines above the guard, still
explains itself by saying "the founder's local Windows sessions already run banner.ps1 for this same
slot, and this script has no meaning there." Both halves are now wrong: `banner.ps1` is parked, and
there is no slot.

## Not findings, recorded so the next panel does not re-open them

- **runner.ts is 1549 lines and this commit adds about ninety.** The extraction is ruled into
  "Consider" with reasons I agree with; findings 1, 3 and 7 above would each take lines out of it
  rather than add them, which is the cheaper direction while the extraction waits.
- **The anchored container-name tail is sound in the direction that matters.** With
  `[A-Za-z0-9_.-]*[A-Za-z0-9]` the match is the longest prefix ending in an alphanumeric, so a
  foreign token can never be truncated into one that ends `_<this project id>`. The only behaviour
  loss is a name with a single character after `supabase_`, which no Supabase service produces.
- **The `.env.example` rewrite is accurate.** It claims `runner.selftest.ts` plants
  `AT_JUDGE_API_KEY` and proves against a real child that it does not arrive; it does, at
  `runner.selftest.ts:60`, `68` and `97`.
- **The new AT_REPO_ROOT selftest is safe even if its guard is later removed.** It spawns the
  integration tier at a disposable tree with no `supabase/config.toml`, so `readLocalConfig` would
  throw before any CLI call. Two layers, and the `not.toContain('config.toml')` assertion is a real
  canary for the first one.
- **The parked README's two new factual claims check out.** `loop/items/AI4DEV-62/verify-first.ts:26`
  and `gate2-verify.ts:24` do import the pool by its old path, and the session-start hook does exit
  unless `CLAUDE_CODE_REMOTE` is true.
- **Nothing live still references the parked scripts.** `ci-status`, `context-gauge`,
  `render-mermaid`, `sheet-check`, `pstack-models.expected.md` and `find-batch` have no caller
  outside `loop/parked/` and frozen item folders, and `.github/workflows/ci.yml` names none of them.
- **The branded type compiles under this project's settings**, because `tests/at/tsconfig.json` sets
  `noEmit` and no `declaration` — an exported interface with a module-private `unique symbol` key
  would otherwise be a declaration-emit error. Worth knowing before anyone turns declarations on.
