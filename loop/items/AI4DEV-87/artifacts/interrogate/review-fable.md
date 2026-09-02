# Reviewer A (fable) — AI4DEV-87 interrogate review

Scope: `git diff -M 7d897b7...HEAD` (four commits), plus the surrounding files the prompt names.

## Checks performed

- `bun run typecheck`: both configs clean.
- `bun run at:selftest`: 11 files, 170 tests, all green (the stated after-count).
- Verbatim move (unit 3), checked mechanically, not by eye: every code line of `tests/at/harness/local-stack.ts` exists in the pre-branch `runner.ts` except its two import lines. In the other direction, the only pre-branch code lines that appear in neither the new `runner.ts` nor `local-stack.ts` are the `attestation.ts` import, the `nonce` field on `PreparedStack`, the two lines that minted and wrote the nonce, and the `ATTESTATION_ENV` coordinate. Everything else that differs is a doc comment. `local-stack.ts` imports only `./atconfig.ts` and `./check.ts`; `check.ts` imports only Node built-ins. No cycle.
- Parked modules: no live import of `capabilities.ts`, `attestation.ts`, `live-email.ts`, `typeprobes`, `AT_SLOT_ATTESTATION`, `stubbedCapabilities`, `pendingMethodProxy`, `backedSutMethods`, or `witnessedCapability` anywhere outside `loop/`. Nine prose references remain (finding 5).
- Manifests: `git diff --stat 7d897b7...HEAD -- tests/at/expected/` is empty. The six explicit throws in `_live.ts` produce `CapabilityPending(['sut.accounts.<method>'])`, the same name shape the parked `pendingMethodProxy` threw (`${capabilityName}.${property}`), so the five `capability-pending` reds in `req-001.json` still rebuild.
- Adapter requests (unit 2): `authPost`, `functionPost`, the quoted-printable decode, the 20-second poll, and `followLink` are the old `_live.ts` bodies line for line. One difference: `x-forwarded-for` is now sent only when `ip` is truthy; both callers pass `'203.0.113.7'` or `CLIENT_IP` (`_integration.ts:42`), so nothing reachable changes.

## Findings

### 1. [warning] The `live` boolean is the only thing between a stand-in and a green above loop, the design's stated reason it is safe is wrong, and no selftest pins it
**Location**: `tests/at/harness/index.ts:247-256` (`createHarness`, the no-live-adapter branch); `tests/at/harness/conformance.selftest.ts` ('refuses to grade a stand-in above the loop tier, by name'); `loop/items/AI4DEV-87/artifacts/design.md:27`
**Finding**: When a suite has no `_live.ts`, `createHarness` above loop loads the LOOP fixture adapter (`loadAdapter(...)` at line 248) and hands its `fixtures` and `sut` through unchanged. So `h.sut.notifications` and `h.fixtures.world` are fully backed stand-ins at the integration tier; the only thing that keeps the twelve req-016 bodies from running against them is the literal `live: false` on line 255, read once by `aboveLoopStandInRefusal` in `registry.ts:695`. The design says the opposite: "A false `live: true` cannot produce a green: with no `_live.ts` there is no sut above loop, and the first call on it is a TypeError, which is red." There is a sut; it is the fixture's.
**Evidence**: Call chain: `openWorld` → `harnessModule.createHarness({ tier: 'integration' })` → `loadLiveAdapterModule('req-016')` returns `null` → `loadAdapter('req-016', ...)` → `finish({ adapter, live: false })` → `aboveLoopStandInRefusal('integration', false, 'notifications')` throws. Flip line 255 to `true` and the chain continues to `h.sut['notifications']` (defined), `h.fixtures.world(...)` (a fixture world), and the body — every req-016 id goes green at integration. What catches that? CI runs only `--tier loop --expect` (`.github/workflows/ci.yml:187`); the req-016 integration `--expect` run needs the one stack and is never run in CI. The replacement conformance test feeds `false` to the pure function by hand; it never asks `createHarness` what it produced. The test that used to cover this branch from `createHarness` ('refuses to build an integration-tier harness at all when no slot attestation reached this process') was deleted, not replaced. Before this branch the refusal was computed from the adapter-derived route on every build; now it is one literal with no test in the only tier CI runs.
**Suggestion**: Add one selftest that runs with no stack: `await createHarness({ requirement: 'req-016', tier: 'integration' })` resolves; `h.live === false`; `h.sut.notifications` is defined (this second assertion records that the stand-in IS present and only the boolean refuses it); then `aboveLoopStandInRefusal(h.tier, h.live, 'notifications')` is a `CapabilityPending` with the manifest's exact message. Correct the sentence in the design (and in the PR body if it repeats it): the loop fixture is loaded above loop; the boolean is the whole gate.

### 2. [warning] `live-stack.ts` builds a Supabase CLI invocation outside the one seam and keeps a second status parser, so the wall `local-stack.ts` describes now has a second builder in the same directory
**Location**: `tests/at/harness/live-stack.ts` — `stackFromStatus` (spawns `bun x supabase status -o json`), `parseStatusJson`, `stackFromStatusJson`; against `tests/at/harness/local-stack.ts:534-561` (`supabaseInvocation`), `:601-660` (`statusJsonSpan`, `parseStackStatus`)
**Finding**: `local-stack.ts` states: "THE ONE SEAM every Supabase CLI invocation is built at. Nothing under `tests/` assembles a CLI command line, working directory or environment anywhere else, and that single seam is the whole wall — a wall with two builders is a wall with a gap." Unit 2 moved exactly such a builder into `tests/at/harness/`: `stackFromStatus` runs the CLI with the inherited environment (bun has loaded `.env`, which carries `SUPABASE_PROJECT_ID="poancmeitlmxejofwzuu"`), no `--no-env-file`, no allowlist, a PATH-resolved `supabase` rather than the pinned `SUPABASE_ENTRY`, and no identity read. `parseStatusJson` + `stackFromStatusJson` are a second copy of `statusJsonSpan` + `parseStackStatus`, whose own comment says the parser is separate "rather than running the CLI twice or keeping a second copy of this parser".
**Evidence**: The drive did this before in its own script, so the drive's behavior is unchanged and `status` is read-only, so nothing is destroyed. What changed is that the harness directory now contains two ways to run the CLI and two parsers of its output, and the doctrine comment in `local-stack.ts` is false the moment it is read. Today `.env` and `config.toml` name the same project, so the override is harmless; the day they differ, the drive reads one project's coordinates while `at:verify` proves another's, and nothing in `live-stack.ts` would say so.
**Suggestion**: Delete `stackFromStatus`, `parseStatusJson`, `stackFromStatusJson` and their three selftest blocks. Give `local-stack.ts` one exported `stackFromLocalStatus(repoRoot)` that calls `runSupabaseCli({ workdir, projectId: readLocalConfig(repoRoot).projectId }, ['status', '-o', 'json'])` and `parseStackStatus`, and maps `StackStatus` (optional `mailUrl`) onto `Stack` (required `mailUrl`, refuse when absent). The drive imports that one function. `live-stack.ts` keeps `stackFromEnv` and the client helpers only.

### 3. [warning] A new 1,268-line module bundles four concerns that its own section banners already separate
**Location**: `tests/at/harness/local-stack.ts` (whole file)
**Finding**: The move was verbatim, and that is the right way to move; it is also the right moment to cut at the seams the file already draws with its banners: the child environment and redaction (`childEnv`, `bunExecutable`, `redact`, `diagnostic`, about 100 lines); the machine-wide lock (`acquireStackLock` and its helpers, about 250 lines); the CLI seam, status parse and local checks (`supabaseInvocation`, `runSupabaseCli`, `parseStackStatus`, `localStackProblems`, about 300 lines); the identity proof, reset, migration proof and evidence (`containerNames`, `identityVerdict`, `resetLocalDatabase`, `prepareLocalStack`, `childCoordinates`, `evidenceLine`, about 500 lines). `runner.ts` imports six values from it; `local-stack.selftest.ts` imports twenty.
**Evidence**: The rubric treats a file crossing 1,000 lines as a presumptive blocker unless the file stays clearly organized. This one is organized, so I rate it a warning, not a blocker. The cost is reader load: a reader who wants the lock reads past the env allowlist and the redaction; a reader who wants the reset reads past the lock. The design's own reason for a verbatim move (the lead reads the diff of every unit against the document) is satisfied by a second commit that only moves sections between files.
**Suggestion**: Split along the four banners in a follow-up commit on this branch, with `local-stack.ts` left as the barrel that `runner.ts` imports, or leave it and say in the PR why 1,268 lines is the right size.

### 4. [warning] The drive's requests changed; the PR should say so instead of "behavior-preserving"
**Location**: `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts` (b), (c), (d), (e); `tests/at/harness/live-stack.ts` `authPost`, `mailMessagesFor`, `verifyLinksFor`
**Finding**: The intent says the three units are behavior-preserving and asks whether the shared module changed any request the drive sends. It did, in three places. (a) `authPost` sends `Authorization: Bearer <anon key>` on signup, token, and recover; the drive sent only `apikey` before. (b) Mail: the drive used `GET /api/v1/messages` then `GET /api/v1/message/{ID}` and searched the rendered `Text`/`HTML`; it now uses `GET /api/v1/search?query=to:<address>&limit=50` then `GET /api/v1/message/{ID}/raw` with quoted-printable decoding. (c) The poll went from twenty attempts one second apart to 250 ms steps for twenty seconds.
**Evidence**: The 11-of-11 pin proves the new requests work against this stack. It does not make them the old requests. A reader of the PR who is told the drive is unchanged, and later sees a Mailpit search failing where a list used to work, will look in the wrong place. The adapter side is unchanged (see Checks performed).
**Suggestion**: One sentence under Tradeoffs: the drive now sends the adapter's requests, not its own; list the three differences.

### 5. [warning] Prose in the live tree still describes the parked design, in nine places
**Location**:
- `tests/at/harness/local-stack.ts:11-20` — the header numbers the sequence 1, 2, 3, 5. Step 4 (the attestation write) was cut and the list was not renumbered.
- `tests/at/harness/local-stack.ts:321` — "the race is in runner.selftest.ts". It is in `local-stack.selftest.ts`.
- `tests/at/harness/local-stack.ts:496` — "a suite that DOES need it refuses loudly at its own construction — `live-email.ts` says exactly that". `live-email.ts` is parked; `mailIdentification` in `live-stack.ts` is that refusal now.
- `tests/at/harness/local-stack.ts:1013` — "the same line `capabilities.ts` draws for its own symbol". Parked.
- `tests/at/harness/registry.ts:262` and `:297` — "`tests/at/typeprobes/sut-seam.probe.ts` carries it verbatim" and "`sut-seam-legacy.probe.ts` is that attack, kept alive: it compiled clean before this change and must fail now". Nothing runs it now.
- `tests/at/harness/suite-adapters.ts:10` — the same probe named as "that hole, executed".
- `tests/at/harness/contracts.ts:174` — "`sentinels`, `faults`, `static` and `vendors` come from a Proxy cast `as T`". Only `static` does at every tier, and `vendors` only above loop; `sentinels` and `faults` come from `createSentinels` and `createFaults`.
- `tests/at/suites/req-001/_integration.ts:1241` — "the same shape `pendingMethodProxy` throws".
- `tests/at/suites/req-001/_fixture.ts:7`, `tests/at/suites/req-016/_fixture.ts:25`, and `supabase/functions/_shared/accounts.ts:13` — "`adapterDerivedCapability()` in `tests/at/harness/capabilities.ts` stamps every `sut.<key>` a fixture exports". The last one is product code citing a parked test file.
**Evidence**: This tree uses its comments as the record of what protects what (the identity read, the brand, the seam). A comment that names a parked file as the thing standing guard sends the next reader to `loop/parked/` for a guard that is not there. `tests/at/README.md` was corrected for the same probe in this branch; these were not.
**Suggestion**: One mechanical pass: delete or rewrite each sentence to name the live thing (`mailIdentification`, the boolean `live`, `local-stack.selftest.ts`), and renumber the header.

### 6. [nit] A runner test moved into the lifecycle selftest
**Location**: `tests/at/harness/local-stack.selftest.ts` — describe block 'the lifetime pin is a preflight: decidable from two files on disk, so it refuses before the lock'
**Finding**: The block spawns `runner.ts` with `--tier integration`, asserts the runner's exit code 3, its stderr text, and that no lock directory was created. That drives the runner's `main`, which the design keeps in `runner.selftest.ts` ("the runner selftest keeps the child-environment, exit-code, and lock-release blocks that drive the runner"). It also edits and restores the real `supabase/config.toml`, which is a runner-level fact to keep beside the other runner spawn test ('the integration tier runs only from the real checkout').
**Suggestion**: Move the block back to `runner.selftest.ts`.

### 7. [nit] A pass-through re-export keeps two import homes for `bunExecutable` and `childEnv`
**Location**: `tests/at/harness/runner.ts:51` (`export { bunExecutable, childEnv };`); `tests/at/harness/runner.selftest.ts:22-25`; `tests/at/harness/runner-expect.selftest.ts:35`
**Finding**: The re-export exists only so two selftests keep importing from `./runner.ts`, while `local-stack.selftest.ts` imports the same two functions from `./local-stack.ts`. Two homes for one function is the legacy dual path the rubric names.
**Suggestion**: Point the two selftests at `./local-stack.ts` and delete the re-export.

### 8. [nit] A double cast, twice, with its explanation deleted
**Location**: `tests/at/harness/index.ts:240` and `:252` — `new RealClock() as unknown as AtHarness['clock']`
**Finding**: The pre-branch code had one cast on an `unknown` ledger value with a long comment saying exactly what the cast takes on trust and that `TierHarness` subtracts the seam at integration. Now the cast is `as unknown as`, appears twice, and the comment is gone.
**Suggestion**: Type `finish`'s `clock` parameter as `ControlledClock | RealClock`, cast once inside `finish`, and keep two sentences of the old comment at that one site.

### 9. [nit] The Bun SQL shape and the JWT redaction are now duplicated across two files in one directory
**Location**: `tests/at/harness/live-stack.ts:25-29, 272` and `tests/at/harness/local-stack.ts:744-748, 752, 832` (three copies of the `globalThis.Bun?.SQL` lookup and two of `BunSqlClient`/`BunSqlCtor`); `local-stack.ts:143` `redact` (JWT parts `{5,}`) beside `live-stack.ts` `redactString` (JWT parts `{8,}`)
**Finding**: Both existed before in different places (runner.ts and the drive). Unit 2 and unit 3 put them side by side under `tests/at/harness/` without joining them.
**Suggestion**: `local-stack.ts` imports one `sqlClient(dbUrl)` from `live-stack.ts` (or a ten-line `bun-sql.ts`) and deletes its two lookups. Leave the two redactions unless one of them is wrong; note them in the PR.

### 10. [nit] The drive's transcript now asserts its URLs instead of recording them
**Location**: `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts` — `recordHttp(...)` calls at (a) through (f)
**Finding**: The old `step()` recorded the URL it fetched. `recordHttp` is handed a URL string re-assembled at each call site (`${api}/auth/v1/signup`), separate from the URL `authPost` builds. If the two ever differ, the transcript reports a request that was not sent.
**Suggestion**: Have `authPost` and `functionPost` return the `url` they fetched, and pass that to `recordHttp`.

### 11. [nit] The Doctor's mount check is prose only; the drive's own doctor step does not run it
**Location**: `.claude/skills/verify-ai4good/SKILL.md` Doctor section; `drive-ngo-signup.ts` step (a)
**Finding**: The measured incident (the edge runtime mounted a removed worktree; 34 reds with the stack otherwise healthy) is now documented as a manual `docker inspect`. The drive's step (a) still checks only `/auth/v1/health`, which passed during that incident.
**Suggestion**: Either add the mount check to step (a) of the drive, or say in SKILL.md that the drive will not detect a stale mount and the operator must run the inspect first.

### 12. [nit] `CapabilityPending` moved into the module that dynamically imports its consumer
**Location**: `tests/at/harness/index.ts:12` (value import from `./registry.ts`); `tests/at/harness/registry.ts:209` (dynamic import of `./index.ts`); `tests/at/suites/req-001/_live.ts:53`
**Finding**: `index.ts` now depends on `registry.ts` at value level, and `registry.ts` loads `index.ts` at run time. It works because the dynamic import runs after `registry.ts` has evaluated. It also means `_live.ts` now transitively imports vitest (`registry.ts` imports `expect` and `it` at top level), so the live adapter module can only load inside a vitest worker. Before the branch `CapabilityPending` lived in a leaf.
**Suggestion**: A leaf `pending.ts` holding `AtPending`, `CapabilityPending`, and `PendingPhase`, re-exported from `registry.ts` for the suites that already import from there.

## Answers to the five questions the intent asks

1. Parked things with a live caller or reference: no caller. Nine prose references (finding 5).
2. Can the boolean `live` or the explicit refusals produce a false green above loop: not with the code as written. The boolean is the entire gate, the design's argument for why it is safe is wrong, and nothing CI runs would notice it flipping (finding 1). The six explicit throws produce the manifest's exact names, and the `AccountsSut` annotation without a cast now makes an omitted method a compile error, which is stronger than before.
3. Did the shared module change any request: the adapter's, no; the drive's, yes in three places (finding 4).
4. Is the lifecycle move verbatim and cycle-free: yes, checked mechanically (Checks performed).
5. Does prose in the live tree still describe the parked design: yes (finding 5).
