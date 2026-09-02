# Adversarial review — AI4DEV-86, head `ea73436`

Reviewer: Opus. Read-only. `bun run typecheck` over `tests/at/tsconfig.json` exits 0 at this head,
so nothing below is a compile error.

## Findings

### 1. [critical] The reset's own guard is now tautological, and the second, independent instrument that used to stand beside it was deleted

**Location**: `tests/at/harness/runner.ts:975-982` (`resetLocalDatabase`), `runner.ts:1150-1166`
(`prepareLocalStack`), `runner.ts:1096-1130` (`identityVerdict`); compare
`loop/parked/v1/tests/at/harness/db-pool.ts:1126-1152` (`slotDbContainers`, `proveSlotDbContainer`)
and `db-pool.ts:1255-1265` (`resetSlotDatabase`).

**Finding**: On the one live path there is now exactly ONE instrument between `at:verify --tier
integration` and `supabase db reset --local` against the founder's own database: the text
`identityVerdict` parses out of one `supabase status -o json` result. The parked pool required
two, and the second one is gone with no replacement.

**Evidence**: Trace the values.

`identityVerdict` ends with

```ts
return { status, provenProjectId: id, containers: own };   // id === target.projectId
```

`prepareLocalStack` then calls

```ts
const read = proveTarget(target);
...
await resetLocalDatabase(target, read);
```

with the SAME `target`. So `resetLocalDatabase`'s first statement,

```ts
if (proof.provenProjectId !== target.projectId) { throw ... }
```

compares a field that was assigned from `target.projectId` against `target.projectId`. It cannot
fail in production. The docstring above it claims this signature is the safety mechanism — "A
TARGET COSTS A PROOF, AND THE TYPE SYSTEM COLLECTS IT … the signature makes the skip a compile
error" — but `SlotIdentityProof` is a structural interface with one `string` field, so any importer
can write `resetLocalDatabase(target, { provenProjectId: target.projectId })` and reset the founder's
database with no read at all. `runner.selftest.ts:290` constructs exactly such a literal, which
demonstrates the forgeability inside this very changeset.

Under the parked design that hole was closed one layer down: `resetSlotDatabase` — the entry point
callers actually used — ran `proveSlotDbContainer(slot, 'reset')` immediately before the reset, and
that function asks **Docker**, not the CLI, whether this project's own `supabase_db_<id>` container
is running. Its own comment states the reason: *"The CLI's status output is one instrument and it is
coupled to the CLI's version. Docker is a second, independent one … It fails closed."* Nothing in
the new code asks Docker anything. The one surviving instrument is CLI stderr prose whose positive
half exists only by accident (finding 6).

There is also a check-to-use gap that the parked design did not have. The parked `prepare()` read
the identity, waited for readiness, and then called `resetSlotDatabase`, which **re-read the
identity for itself** — its comment says so: *"it is the same read the reset performs again for
itself immediately before acting."* The new `prepareLocalStack` reads once and then waits: on a
healthy stack `waitForReady` returns in well under a second, but its budget is `READY_TIMEOUT_MS`
(120 s by default), and the module docstring presents the single read as a virtue — *"One read is
the proof for both destructive acts; nothing re-reads between."* That sentence describes the
time-of-check-to-time-of-use window, not its absence.

**Suggestion**: Put the instrument back on the destructive path and make it non-forgeable. Two
concrete steps, in order of value:

1. Move a Docker confirmation into `resetLocalDatabase` itself — port `slotDbContainers`/
   `proveSlotDbContainer` from the parked file, keyed on `target.projectId`, and call it as the
   first statement. It fails closed if Docker cannot answer, which is the correct direction.
2. Make the proof unforgeable rather than structural: brand `StackIdentityRead` with a unique
   symbol that only `identityVerdict` can set, so `{ provenProjectId: 'x' }` stops compiling and
   the tautological string comparison can be deleted rather than kept as decoration.

If the Docker instrument is deliberately not being restored, say so in the file and delete the
docstring's claim that the type system collects the proof, because on this path it collects nothing.

---

### 2. [critical] `AT_REPO_ROOT` now selects which database is destroyed, and bun loads it out of `.env.local`

**Location**: `tests/at/harness/runner.ts:1524-1530` (integration branch of `main`),
`tests/at/harness/check.ts:34-38`.

**Finding**: The reset target is derived from `REPO_ROOT`, and `REPO_ROOT` is
`process.env.AT_REPO_ROOT` when that variable is set. Before this change `AT_REPO_ROOT` could not
choose a destructive target; now it is the only thing that chooses one.

**Evidence**:

```ts
const config = readLocalConfig(REPO_ROOT);
const target: CliTarget = { workdir: REPO_ROOT, projectId: config.projectId };
lock = acquireStackLock(config, `req-${requirement}`, { takeover: 'dead-pid-only' });
const prepared = await prepareLocalStack(target);
```

In the parked pool the destructive target was `slotTarget(slot)` — a pool directory — and
`AT_REPO_ROOT` (`itemRoot`) only chose the MIRROR SOURCE and the personal-identity guard's input.
`check.ts` still states the old property verbatim: *"The override moves DATA only."* That sentence
is now false, and it is the sentence a reader consults before setting the variable.

The delivery route matters. This runner's own header records that *"bun auto-loads `.env` and
`.env.local` into this process, and `.env.example` tells developers to put their real secrets in
`.env.local`"*. So a single stray `AT_REPO_ROOT=` line in an untracked dotenv file silently
re-aims `supabase db reset --local` at whatever local Supabase project that other tree declares.
`identityVerdict` will happily prove that other project — it only checks loopback, that tree's own
configured ports, and a `supabase-demo` issuer, all of which any local stack satisfies.

**Suggestion**: Decide the destructive target from `INSTALL_ROOT`, not `REPO_ROOT`, and say why:
the data root is for feeding the runner malformed suites, and a suite fixture must not be able to
name a database. If the override genuinely must reach the stack, require a second, explicit
opt-in variable and print both roots in the evidence line. Either way, correct the "moves DATA
only" sentence in `check.ts` in the same change.

---

### 3. [warning] Nothing checks that the running stack was started with the current `supabase/config.toml` — in the change that alters `jwt_expiry`

**Location**: `supabase/config.toml:174-176`, `tests/at/harness/runner.ts:1143-1166`
(`prepareLocalStack`), `runner.ts:1487-1490` (`stackHelp`); compare
`loop/parked/v1/tests/at/harness/db-pool.ts:1320-1332` (config hash, marker, restart).

**Finding**: This branch changes `jwt_expiry` from 3600 to 120. The GoTrue container reads that
value at container START, not at `db reset`. The parked pool handled that with a mechanism —
hash the generated config, compare against a marker written after a successful start, and restart
the stack when they differ, with the comment *"The auth container reads config at START, not at
reset, so a changed config that is not restarted into would grade the previous item's auth
behaviour."* This change deletes the mechanism and replaces it with a sentence in a help string:
*"or was started before supabase/config.toml last changed: run `bun run db:stop` then `bun run
db:start`."*

**Evidence**: `prepareLocalStack` documents the omission as deliberate ("WHAT IT DELIBERATELY DOES
NOT DO: restart the stack"), which is a defensible call about a founder-owned stack. The problem is
that nothing then DETECTS the stale case. The identity proof passes on a stack running last week's
config, the reset succeeds, `proveMigrationsReplayed` passes, and `evidenceLine` prints "reset OK"
plus migration counts, head and tree state — and says nothing about which configuration the stack
is serving. `tests/at/expected/req-001.json` declares `AT-001.12` and `AT-001.13` GREEN at the
integration tier; against a stack still serving `jwt_expiry = 3600` both go red (the body waits
135 s for a token that lives 3600 s), so the failure is loud — but it presents as two red acceptance
criteria, not as "your stack is stale", and the evidence line actively asserts the run was
well-founded.

This is the rubric's "instructions where structure would be better" case, on the item that made the
instruction necessary.

**Suggestion**: Keep not restarting, and add a cheap detection instead. `readLocalConfig` already
parses `supabase/config.toml`; have it read `[auth] jwt_expiry`, and have `prepareLocalStack`
compare it against what the running Auth service actually issues — sign in as a throwaway user
after the reset and read `exp - iat` off the access token, or at minimum record a config hash at
`db:start` time the way the pool did. Failing that, put the configuration hash into `evidenceLine`
so a green at least names the config it graded, which is exactly the claim that line exists to make.

---

### 4. [warning] The session lifetime is pinned TWICE, not once, and nothing compares the two

**Location**: `supabase/config.toml:174-176`, `tests/at/harness/atconfig.ts:183-197`.

**Finding**: The intent says the lifetime "is pinned once". It is written in two places as two
literals — `jwt_expiry = 120` and `accessTokenLifetimeSeconds.value = 120` — and the only thing
joining them is prose: the config comment cites the registry entry, and the registry entry cites
the config line. No code reads one and checks the other.

**Evidence**: Drift is detectable in one direction only, and only at a tier that needs Docker.
Raise the config to 600 and leave the registry at 120: `at00112` waits 135 s and then asserts the
write is refused, the live token is still valid, the body fails red. Loud. Lower the config to 60
and leave the registry at 120: `at00112` waits 135 s past a 60 s token, the token is still expired,
the assertion still passes — a green over a premise that is wrong. The loop tier cannot see drift
at all, in either direction, because `_fixture.ts:471` and `b-verification-and-sessions.test.ts:406`
now both derive from the SAME registry value, so the fixture and the body agree with each other
however far either has drifted from the stack.

The fix is already sitting in the file. `readLocalConfig` (`runner.ts:241-270`) is a scanner over
that exact TOML, already extracting `project_id` and three ports by section.

**Suggestion**: Add `jwtExpirySeconds` to `LocalConfig` — three lines in the existing loop
(`section === 'auth' && /^jwt_expiry\s*=/`) — and assert `config.jwtExpirySeconds ===
AT_CONFIG.accessTokenLifetimeSeconds.value` in `prepareLocalStack`, refusing with both numbers
named. Pin it in `runner.selftest.ts` so the check runs at the loop tier in CI too. Then "pinned
once" is true, the config comment becomes a fact rather than a request, and finding 3 gets its
detection for free.

---

### 5. [warning] The lock's default takeover policy is the unsafe one, and it now has no caller

**Location**: `tests/at/harness/runner.ts:325-343`, `:398-400`, `:1530`.

**Finding**: `TakeoverPolicy` has two members. `dead-pid-only` never displaces a running process.
`stale-or-dead` displaces a LIVE holder whose claim is older than `LOCK_STALE_MINUTES` (60 by
default). The only production call site passes `dead-pid-only`. `stale-or-dead` is nevertheless
still the DEFAULT of both `acquireStackLock` and `holderIsLive`, and it is the policy that will
delete a live run's claim and reset the founder's database out from under it.

**Evidence**: The parked pool was the caller that asked for `dead-pid-only`; the runner's own
integration path used to take no lock at all (`occupy()` produced the claim). Now the runner is the
only caller and it also asks for `dead-pid-only`. Grep over the live tree finds `stale-or-dead`
reached from nothing but `runner.selftest.ts:265` and `:278`, which exercise the default. The
in-file comment now reads *"`stale-or-dead` keeps its long-standing behaviour: that path predates
the slot pool and is another item's business"* — but the pool is parked, so the path has no
business left; it is a strictly less safe default kept alive for a caller that no longer exists.

The safety asymmetry is not theoretical. `identified()` deliberately refuses to take over an
unidentifiable claim file under `dead-pid-only` because *"a claim file being written right now looks
exactly like this"*, and explicitly declines to extend that protection to `stale-or-dead`. So the
default policy still deletes half-written claim files.

**Suggestion**: Delete `TakeoverPolicy`, `StackLockOptions`, `LOCK_STALE_MINUTES`,
`AT_LOCK_STALE_MINUTES` and the `startedAt`-age branch of `holderIsLive`; make dead-pid-only the
only behaviour. That removes an option, a branch, an environment knob, a parameter and two
selftests, and it makes the dangerous variant unreachable rather than merely unused. If the age
rule must survive for a future caller, at minimum invert the default so forgetting the option is
the safe outcome.

---

### 6. [warning] "REFUSING TO RESET" now fires on the most common operational failure, and its wording sends the operator after the wrong cause

**Location**: `tests/at/harness/runner.ts:1103-1130` (`identityVerdict`), `:1060-1066`
(`ownContainerNames` docstring), `supabase/config.toml:53-54`.

**Finding**: Two very different situations now produce the same alarm phrase, and neither of them
is the situation the phrase was coined for.

**Evidence**: (a) A stack that is simply not running. `parseStackStatus` throws "reported no JSON";
`identityVerdict` wraps it as `REFUSING TO RESET <id>: the stack did not report its status …
Nothing was done.` The parked design distinguished this case explicitly — *"A stack that is simply
not running is not a mismatch: it is reported as `notRunning`"* — and this change collapses the
distinction. "Forgot to run `db:start`" is by far the most frequent way this path fails, and it now
prints the same words as a genuine identity mismatch. A safety phrase that fires on routine
operator error stops being read.

(b) The positive-identity check depends on two services being disabled. `ownContainerNames` needs at
least one `supabase_*_<projectId>` token in the output, and the docstring records that the only
tokens the CLI prints come from `Stopped services: [supabase_imgproxy_<id> supabase_pooler_<id>]`,
which exist because the tracked config disables both. `supabase/config.toml:53-54` currently has
`[db.pooler] enabled = false`. Flip that one line — a normal thing to do while testing connection
pooling — and every integration run refuses, with a message that says *"the identity read names no
container belonging to `<id>` … The ports alone are not identity — the 2026-08-09 incident reported
the right ports while resolving another project."* The operator will go hunting for a hybrid stack.
The residual is recorded in the docstring, but the docstring is not what the operator reads at 2 a.m.

**Suggestion**: Split the verdict's failure modes: return a distinct "no stack answered" outcome and
report it as `at:verify — no stack is running for <id>; run bun run db:start` rather than as a
refusal. For (b), have `readLocalConfig` read `[db.pooler] enabled` and `[storage.image_transformation]
enabled`, and when the own-name check finds nothing while both are enabled, say so in the refusal —
one sentence naming the actual cause.

---

### 7. [warning] `bun run db:reset` is a target-less destructive CLI call, which is the exact shape this change deleted from the code

**Location**: `package.json:19`, `.claude/skills/verify-ai4good/SKILL.md:29`,
`tests/at/harness/runner.ts:600-628` (`supabaseInvocation` docstring).

**Finding**: The change removes the target-less `supabaseInvocation`/`runSupabaseCli`/
`resetLocalDatabase` overloads on the stated ground that *"EVERY INVOCATION STATES A TARGET. There
is no target-less form: a CLI call that names no identity is exactly the shape this wall exists to
refuse, so the seam does not offer one."* The seam's own header claims *"Nothing in this repository
assembles a CLI command line, working directory or environment anywhere else, and that single seam
is the whole wall — a wall with two builders is a wall with a gap."*

`package.json` assembles three, and one of them is destructive:

```json
"db:reset": "bunx supabase db reset"
```

No `--workdir`, no `SUPABASE_PROJECT_ID` stated positively, no `--no-env-file`, and bun loads the
tracked `.env` — which, per the seam's own docstring, carries `SUPABASE_PROJECT_ID`. This is the
2026-08-09 shape: environment supplies the identity, working directory supplies the ports.

It is not dormant. This change newly promotes these scripts as the operator path in three places
(`stackHelp`, `CLAUDE.md` section 5, the controller manual), and `verify-ai4good/SKILL.md:29` — a
file this branch edits — tells the operator to run `bun run db:reset` "before evidence-grade drives".

**Evidence**: The gap is only harmless today because the repo's project id and the target project id
happen to coincide. That is a coincidence the seam exists to stop relying on, and it is exactly the
coincidence that stopped holding on 2026-08-09.

**Suggestion**: Point `db:reset` at the harness rather than at the raw CLI — a small
`bun tests/at/harness/runner.ts`-adjacent entry that calls `proveTarget` then `resetLocalDatabase`,
so the operator command goes through the same wall as the runner. If that is out of scope, soften
the seam docstring's absolutism to the truth ("nothing under `tests/` assembles one elsewhere") so
the next reader is not misled about what the wall covers.

---

### 8. [warning] CLAUDE.md is loosened outside the stated intent, and the file's own rule forbids that

**Location**: `CLAUDE.md` (commit `761cd87`, "CLAUDE.md prompt audit, three hunks").

**Finding**: The branch's stated intent for CLAUDE.md is "section 5 … rewritten to the v2 way of
work". Commit `761cd87` also edits the Communication section and deletes two `MUST-FOLLOW` markers.
Its own body says: *"Lower the volume on two rules and drop two sentences that described earlier
versions of this file."*

**Evidence**: The two deletions are

- `**ALWAYS USE ASD-STE100 SIMPLIFIED TECHNICAL ENGLISH (MUST-FOLLOW, founder 2026-08-09).**`
  → `**Use ASD-STE100 Simplified Technical English for everything written for a person (founder 2026-08-09).**`
- `**NEVER PRINT A BARE ITEM NUMBER — always `id (very short title)` in PARENTHESES (MUST-FOLLOW, founder instruction 2026-08-01 …)**`
  → `**Print every item id as `id (very short title)`, never bare (founder instruction 2026-08-01 …)**`

Three MUST-FOLLOW markers survive elsewhere in the same file (derived attribution, never naming
another item's id, writing about what the founder said), so this creates a two-tier reading in which
the two edited rules now look optional beside their neighbours. The bare-item-id rule is the one the
file records as chronically broken.

The same file states: *"**A rule that LOOSENS the process needs a real, explicit founder ruling.**
Tightening may be proposed; loosening may never be inferred."* No founder ruling is cited for either
deletion, and the commit body describes the change as a loosening in its own words. The precedent
the file records is that this exact rule already caught a draft deleting the reflection step, and
the founder then ruled explicitly.

Also deleted, and this one loses information rather than volume: section 5's sentence *"The reply
header (TURN line, HOOK block) is PARKED with the stamp hook (founder 2026-08-29: 'park the
header'); its full text stays in that section and returns with the stamp."* That pointer aimed at
`SKILL.md`'s "The standing rules" section, which this branch parks. With both gone, the header's
full text is now only recoverable from `loop/parked/v1/`, and no live file says where it went or
that it is meant to return.

**Suggestion**: Revert the two MUST-FOLLOW deletions and the two deleted sentences, or get the
founder to rule on them separately from this item. Keep the header-parking sentence and repoint it
at the parked file.

---

### 9. [warning] `CapabilityEvidence` and the third parameter of every witness are now vestigial

**Location**: `tests/at/harness/capabilities.ts:44-48`, `:129`, `:275-285`.

**Finding**: `oracles.judge` was the only witness that consumed caller-supplied evidence. It is
parked. The change edits the docstring to say so — *"No live witness needs any of it — the judge
that did is parked"* — and keeps the whole mechanism.

**Evidence**: Every remaining `witnessedCapability(...)` call in the live tree passes two arguments
(`index.ts` ×11, `conformance.selftest.ts` ×9, `live-ledger.selftest.ts` ×7). Nothing anywhere
constructs a `CapabilityEvidence`. So the type, the `evidence` parameter with its `= {}` default,
and the `evidence` parameter on the `CapabilityWitness` function type are dead parameterization —
the rubric's "vestigial parameters" and "configuration for cases that don't exist yet", kept for a
consumer that was deleted in this same commit.

**Suggestion**: Delete `CapabilityEvidence`; narrow `CapabilityWitness` to
`(value: unknown) => CapabilityVerdict`; drop the third parameter of `witnessedCapability`. That is
a mechanical edit across five call-site-free signatures, and it removes the one route by which a
caller could ever again contribute to its own provenance verdict — which is what this file's header
says it exists to prevent.

---

### 10. [warning] The documentation of the number this change alters still states the old number, including in the block that records what was measured against the real vendor

**Location**: `tests/at/suites/req-001/_fixture.ts:110`, `:117`, `:473`;
`tests/at/suites/req-001/b-verification-and-sessions.test.ts:19`;
`tests/at/suites/req-001/_integration.ts:442`; `tests/at/harness/contracts.ts:70`.

**Finding**: Every one of these files is edited by this branch, and every one still states 3600 or
"one hour" for a value that is now 120.

**Evidence**:

- `_fixture.ts:110` — `EXPIRES ONE HOUR LATER.` This is VENDOR MIRROR 5's heading in the block that
  records which mirror claims are BOUND by measurement.
- `_fixture.ts:117` — `The one hour is `jwt_expiry = 3600` at `supabase/config.toml` line 165, and
  the constant below cites that line.` Three errors in one sentence: the value is 120, the unit is
  not an hour, and `jwt_expiry` is now at line 176.
- `_fixture.ts:473` — `One `auth.sessions` row, expiring one hour from now.` — directly above the
  constant the change rewrote.
- `b-verification-and-sessions.test.ts:19` — `an expiry one hour out mirroring `jwt_expiry = 3600``.
- `_integration.ts:442` — `the slot's config pins a standing low `jwt_expiry`` — there is no slot.

The mirror-5 point is more than prose. Mirror 5's BOUND claim cites `loop/items/AI4DEV-60/proof-local.ts`
checks (a) and (b), measured against a stack running 3600, and mirror 7 is bound "against a
transiently lowered `jwt_expiry`". The tracked configuration has now moved to the transient value
permanently and nobody re-ran the measurement. In a suite whose whole doctrine is that a mirror
states what was measured, the mirror now states a number the tree no longer uses.

**Suggestion**: Update all five sites to cite `AT_CONFIG.accessTokenLifetimeSeconds` rather than a
literal, drop the line-number citation (it has drifted twice now), and either re-run the
AI4DEV-60 checks against 120 or note in mirror 5 that the binding measurement was taken at 3600 and
what that does and does not still establish.

---

### 11. [warning] Live files still point into `loop/parked/v1/`, and one of them is `supabase/config.toml`

**Location**: `supabase/config.toml:18`, `tests/at/harness/live-email.ts:14`, `.env.example:28`,
`.claude/hooks/session-start-banner.sh:7` and `:14`, `.claude/skills/work/`.

**Finding**: The parked README claims *"They are not imported. Nothing under `tests/at` names
them"*, which is true of imports. Five live files still NAME them in prose, and each one is a
pointer a reader will follow to a path that no longer exists.

**Evidence**:

- `supabase/config.toml:18` — `The slot overlay enforces this floor; see EPHEMERAL_FLOOR in
  tests/at/harness/db-pool.ts.` This is the paragraph explaining why the ports are in the 443xx
  block. The mechanism that enforced the floor is parked, so the config now documents a guard that
  no longer runs, and points at a missing file to prove it.
- `tests/at/harness/live-email.ts:14` — `that arithmetic is `db-pool.ts`'s`. The sentence explains
  why `mailUrl` is read from status rather than recomputed; the reason it gives is gone.
- `.env.example:28` — still names `tests/at/harness/record-oracles.ts`. The added line
  ("The judge is parked … nothing live reads this variable") sits below the stale path rather than
  replacing it.
- `.claude/hooks/session-start-banner.sh:7` — `Guarded to remote only: the founder's local Windows
  sessions already run banner.ps1 for this same slot`. The hook exits at line 17 when
  `CLAUDE_CODE_REMOTE != true`, on the strength of that assumption. `banner.ps1` is now parked, so
  local sessions get no session-start banner from either source.
- `.claude/skills/work/` now contains only `pstack-model-selection.md` and no `SKILL.md`. It is a
  skill directory with no skill in it, named after a verb that no longer exists.

**Suggestion**: Fix the four prose pointers to say "parked; see loop/parked/v1/README.md", and
decide the banner question explicitly (either drop the remote-only guard or record that local
sessions have no banner). Move `pstack-model-selection.md` somewhere that is not a skill folder —
note that `~/.claude/pstack-models.md` cites its absolute path, so the move needs that reference
updated in the same change.

---

### 12. [warning] `runner.ts` is 1639 lines and holds seven unrelated concerns; the one-stack section is a module

**Location**: `tests/at/harness/runner.ts` (1467 → 1639 lines).

**Finding**: The file was already over the threshold, so the strict "under 1k to over 1k" rule does
not bite — but this change adds 172 net lines to a file that now contains: argument parsing, the
child-environment allowlist, redaction, a TOML scanner, a two-phase machine-wide lock protocol with
its own takeover gate, the CLI seam, a status parser, the local-stack proof, readiness probes, the
migration proof, the reset, the identity verdict, stack preparation, coordinate emission, the
evidence line, vitest report analysis, and `main`. The parked `db-pool.ts` used to hold roughly a
third of that.

**Evidence**: The new section is announced with its own banner comment
(`/* ---- the one stack: identity, coordinates, evidence */`, line 1027) and is internally
cohesive: `foreignContainerNames`, `ownContainerNames`, `StackIdentityRead`, `identityVerdict`,
`proveTarget`, `PreparedStack`, `prepareLocalStack`, `childCoordinates`, `treeState`,
`evidenceLine`. A banner comment marking a boundary is the file telling you where the module seam
is. The reason this content lived in a separate file before was not the cycle — the header notes the
cycle was *"deliberate and safe"* — it was size.

**Suggestion**: Extract `stack.ts` holding the CLI seam, `LocalConfig`/`readLocalConfig`,
`StackStatus`/`parseStackStatus`, `localStackProblems`, `waitForReady`, the migration proof, the
reset, and the whole one-stack section. `runner.ts` keeps argument parsing, report analysis and
`main`, and imports one module. There is no cycle: `stack.ts` depends on `check.ts` and
`attestation.ts` only. That is roughly a 700/900 split, and it puts the destructive code in one file
a reviewer can read end to end — which is exactly what a reviewer of finding 1 needs.

---

### 13. [warning] `attestation.ts` was not narrowed alongside `SlotIdentityProof`, and its header now names a function this change deleted

**Location**: `tests/at/harness/attestation.ts:5`, `:70-80` (`ProvenSlotRead`), `:96-113`
(`writeAttestation`).

**Finding**: The intent narrows `SlotIdentityProof.provenProjectId` to `string`. The parallel type
in `attestation.ts` was not narrowed: `ProvenSlotRead` still declares `provenProjectId: string |
null` and `status: { dbUrl: string } | null`. `writeAttestation` therefore keeps two refusal
branches that no caller can reach — `proves no project at all` and `the identity read carries no
stack report` — because the only live caller passes a `StackIdentityRead`, where both fields are
non-nullable.

**Evidence**: `runner.ts:1076` declares `StackIdentityRead extends SlotIdentityProof` with
`status: StackStatus` (non-null) and `provenProjectId: string` inherited. `prepareLocalStack:1164`
is the only `writeAttestation` call in the live tree. So the two branches are dead code that
`runner.selftest.ts` deliberately stopped testing in this same diff (the "refuses a read that proved
no project at all" case was deleted with the comment *"not a runtime case any more"*) — and the
equivalent case survives untested in the sibling file.

The header is worse than stale. The diff changes one word — `` `db-pool.ts`'s `stackEnv()` `` to
`` `runner.ts`'s `stackEnv()` `` — pointing at a function this same commit deleted (it is
`childCoordinates` now). The surrounding paragraphs still describe `prepare()` and
`proveSlotTarget()`, both parked, as the mechanism.

**Suggestion**: Narrow `ProvenSlotRead` to `{ provenProjectId: string; status: { dbUrl: string } }`,
delete both refusal branches, and rewrite the header against the functions that exist. While there:
`SlotIdentityProof`, `ATTESTATION_ENV = 'AT_SLOT_ATTESTATION'`, `ATTESTATION_TABLE =
'slot_attestation'`, `attestSlot`, `SLOT_ATTESTATION_BRAND` and every "refusing to attest the slot"
message keep the slot vocabulary on the live path, in a change whose evidence line advertises "No
slot number anywhere". One word, one meaning — pick `stack` and finish the rename, or state that
the wire name `AT_SLOT_ATTESTATION` is frozen and why.

---

### 14. [warning] A lock-contention failure is now reported with a paragraph about Docker

**Location**: `tests/at/harness/runner.ts:1519-1544`.

**Finding**: The change merges two `try`/`catch` blocks into one, so the lock error and the
preparation error now share a handler and a message.

**Evidence**: Before, `occupy()`'s failure returned `infra((err as Error).message)` on its own, and
only `prepare()`'s failure appended the rebuild explanation and `stackHelp`. Now
`acquireStackLock` sits inside the same `try`, so *"another at:verify run holds this stack (pid
1234 …). Wait for it to finish."* is followed by *"The integration tier rebuilds the one stack's
database from supabase/migrations on every run … Docker Desktop is not installed, or is installed
but not running … run `bun run db:stop` then `bun run db:start`."* The advice is not merely
irrelevant; `db:stop` on a stack another run is mid-reset against is actively harmful, and it is
now printed directly beneath the message saying another run holds the stack.

**Suggestion**: Keep the lock acquisition in its own `try` returning `infra(message)` with no
suffix, exactly as `occupy()` had. Three lines.

---

### 15. [nit] The two container-name functions are one function written twice, and the pattern is greedy at the end

**Location**: `tests/at/harness/runner.ts:1043-1046` and `:1066-1069`.

**Finding**: `foreignContainerNames` and `ownContainerNames` are byte-identical apart from a `!`.
Both re-run the same match and the same `Set`.

**Evidence**:

```ts
const names = [...String(text ?? '').matchAll(/\bsupabase_[A-Za-z0-9][A-Za-z0-9_.-]*/g)].map((m) => m[0]);
return [...new Set(names.filter((name) => !name.endsWith(`_${projectId}`)))];   // foreign
return [...new Set(names.filter((name) =>  name.endsWith(`_${projectId}`)))];   // own
```

`identityVerdict` calls both on the same `raw` string, so the text is scanned twice for no reason.
Separately, the character class ends with `.` and `-`, so a container name that terminates an
English sentence — `... container supabase_db_<id>.` — matches with the period attached, fails the
`endsWith(`_${projectId}`)` test, and is reported as a FOREIGN container. That is the fail-closed
direction, but the resulting refusal names the project's own container as evidence of another
project, which is the most confusing possible false alarm on the loudest possible message.

**Suggestion**: One `containerNames(text, projectId): { own: string[]; foreign: string[] }`, scanned
once, and anchor the pattern's tail on an alphanumeric: `/\bsupabase_[A-Za-z0-9][A-Za-z0-9_.-]*[A-Za-z0-9]/g`.

---

### 16. [nit] The new code that decides what reaches the child, and what the transcript claims, has no tests

**Location**: `tests/at/harness/runner.ts:1180-1196` (`childCoordinates`), `:1203-1224`
(`treeState`, `evidenceLine`), `:1152-1166` (`prepareLocalStack`);
`tests/at/harness/runner.selftest.ts`.

**Finding**: The selftests added by this change cover `foreignContainerNames`, `ownContainerNames`,
`identityVerdict` and the `dead-pid-only` lock cases — good, and the identity tests are well
constructed. Nothing covers the three pure-enough functions that replaced the parked pool's
`stackEnv()` and `evidence()`, both of which the parked `db-pool.selftest.ts` did exercise.

**Evidence**: `childCoordinates` is the function that decides which values cross into the test
process, including the conditional `AT_SUPABASE_MAIL_URL` that is dropped when `status.mailUrl` is
absent — a silent omission that surfaces three assertions later as "no confirmation email arrived",
which `live-email.ts` says at its head is the exact failure mode it exists to prevent. It takes a
`PreparedStack`, which is a plain object, so a test costs four lines. `evidenceLine` is likewise
constructible from a literal — and it is worth testing for a second reason: it reads as string
formatting and in fact spawns two `git` processes through `treeState`, so a caller in a hot path
would be surprised.

**Suggestion**: Three small selftests: `childCoordinates` emits exactly five keys without a catcher
and six with one; `evidenceLine` names the project, the api port from the proven status, both
migration counts and the lock path; `treeState` returns "head unknown" when git reports nothing.
Consider renaming `evidenceLine` to `readEvidenceLine` or hoisting the `git` reads to the call site,
so the name stops implying purity.

---

### 17. [nit] Vestigial `root` parameters and docstrings that name the parked pool as their reason

**Location**: `tests/at/harness/runner.ts:241-245` (`readLocalConfig`), `:868`
(`MigrationProof`), `:874-880` (`expectedMigrations`), `:920` (`proveMigrationsReplayed`),
`:565-570` (`StackStatus.mailUrl`), `:668-672` (`parseStackStatus`), `:768`
(`localStackProblems`).

**Finding**: Four functions carry an optional `root`/`itemRoot` parameter whose stated justification
is the parked pool, and every live call now passes `REPO_ROOT` or `target.workdir`, which are the
same value.

**Evidence**: `readLocalConfig`'s docstring: *"The root is a parameter so the database-slot pool can
read a SLOT's own config with this exact scanner instead of a second copy of it."* `MigrationProof`:
*"the pool's evidence line has to state the migration state it saw."* `parseStackStatus`:
*"separate from the invocation so that a caller which needs the RAW output for its own checks (the
slot pool's identity read) reads it once"* — that caller is now `identityVerdict`, in this file.
`StackStatus.mailUrl`: *"read here rather than recomputed from `[local_smtp] port` plus the pool's
per-slot offset."* `localStackProblems`: *"`stackEnv` puts it in `AT_SUPABASE_MAIL_URL`"* — the
function is `childCoordinates` now.

**Suggestion**: Keep the parameters if a future disposable-tree caller genuinely needs them (they
are cheap), but rewrite each justification to name the caller that exists. A docstring whose reason
is a parked module is a docstring a reader will disbelieve, and this file asks the reader to believe
a great many of them.

---

### 18. [nit] The verify skill was edited by this change but not told that access tokens now live two minutes

**Location**: `.claude/skills/verify-ai4good/SKILL.md:16-19`, `:75-76`.

**Finding**: The skill's scripted drive obtains an `access_token` at step 4 and uses it at step 5
and beyond. Against the previous configuration that token was valid for an hour; it is now valid for
120 seconds. An agent-driven or hand-driven verification that pauses to read output between steps
will now get a 401 that looks exactly like a product defect.

**Evidence**: The change edits this file's "One stack per machine" paragraph and adds the reset
warning, so the file was in scope; the token-lifetime consequence of the sibling `config.toml`
change is not recorded anywhere the operator will see it.

**Suggestion**: One sentence under "Doctor" or beside step 4: access tokens live
`[auth] jwt_expiry` seconds (currently 120), so re-mint before a long drive, or refresh with the
refresh token.

## What I checked and did not flag

- `bun run typecheck` over both projects: clean at this head.
- `loop/parked/v1/**` is excluded from both `tsconfig` programs, from vitest's `--root tests/at`,
  and is imported by nothing under `tests/`. The park is structurally sound; my finding 11 is about
  prose pointers only. (ESLint's config ignores only `dist`, `.output`, `.vinxi`, so `bun run lint`
  will now walk the parked TypeScript — CI does not run lint, so I have not raised it.)
- `loop/work/statusline.ps1` dot-sources `work-lib.ps1`, which stays live; `materialize.ps1` stays
  live and the controller manual now names it directly. No live PowerShell caller reaches a parked
  script.
- The `--expect` manifests are unchanged, as the intent states.
- The lock's takeover gate protocol itself (the second exclusive-create lock, the stranded-gate
  age clearance, the `identified()` re-read window) is carefully reasoned and the new
  `dead-pid-only` selftests pin the cases that matter. My finding 5 is about the default, not the
  protocol.
