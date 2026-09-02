# Cross-family re-read of unit 4 (opus, read-only)

Scope: commit `1cc6d32` read by SHA (`git diff 3141206..1cc6d32`), judged against
`loop/items/AI4DEV-87/artifacts/interrogate/rulings.md` ("Act on" items 1 to 9 and the Sol section).
The working tree was NOT the evidence: while this read ran, another writer held uncommitted unit-5
work (`tests/at/harness/live-stack.selftest.ts` modified, `tests/at/harness/live-refusal.selftest.ts`
new, `tests/at/README.md` modified). Every command below ran against a read-only snapshot of
`1cc6d32` extracted with `git archive`, with the repository's `node_modules` joined in, so nothing in
the writer's tree was touched.

Verdict: **8 of the 9 items landed as ruled. Item 4 landed in code and did not land in the Done
contract.**

## The nine items

1. **Liveness before construction — LANDED.** `liveAdapterExists` is `tests/at/harness/index.ts:127`;
   `HarnessModule` declares it at `registry.ts:187` and refuses a harness module that omits it
   (`registry.ts:195`); `openWorld` throws the refusal at `registry.ts:670` before the
   `createHarness` call at `registry.ts:673`; `createHarness` above loop with no live adapter throws
   at `index.ts:240-244`; `live` is gone from `AtHarness` (`contracts.ts:189`) and from `finish()`.
   The four selftest assertions are one `it` in `conformance.selftest.ts` and pass. `design.md`
   section 1 carries the corrected sentence. Residue: two sentences in that same section still
   describe the old shape (finding 3 below).
2. **One CLI seam — LANDED.** `stackFromLocalStatus` is `local-stack.ts:430`, and it is
   `readLocalConfig` → `runSupabaseCli` → `parseStackStatus` → `stackFromParsedStatus`
   (`local-stack.ts:416`). `stackFromStatus`, `parseStatusJson` and `stackFromStatusJson` are gone
   from `live-stack.ts`, which no longer imports `node:child_process` at all. The drive imports the
   one function (`drive-ngo-signup.ts:22`). The seam sentence at `local-stack.ts:278` is true again
   (check 2 below).
3. **One name map — LANDED.** `STACK_ENV` is `live-stack.ts:17`; `stackFromEnv`
   (`live-stack.ts:64`) refuses naming the missing variable for the four mandatory coordinates and
   leaves `mailUrl` empty when absent; `childCoordinates` (`local-stack.ts:998`) writes through the
   map and omits the catcher when the status reports none. The round-trip selftest in
   `local-stack.selftest.ts` asserts `Object.keys(coords)` equals `Object.values(STACK_ENV)`.
4. **The drive records and checks — LANDED IN CODE, NOT IN THE CONTRACT.** `authPost`
   (`live-stack.ts:80`) and `functionPost` (`live-stack.ts:99`) return `url`; the drive passes
   `r.url` to `recordHttp` at the four posts; `const api` is gone; `readJson` is exported
   (`live-stack.ts:51`) and the Doctor step uses it. Check (a2) is `drive-ngo-signup.ts:101-110` and
   check (a3) is `drive-ngo-signup.ts:112-143`; the drive now records 13 checks (a, a2, a3, b, c,
   d1, d2, e, f, g1..g4). **Missing:** the Done contract still says 11 of 11 — `brief.md:47` (the
   quoted item text), `brief.md:58`, `brief.md:111` (the evidence bar), and `design.md` section 2
   ("keeps its eleven checks", "the pin for the drive is 11 of 11"). Only the pull-request draft
   says 13 (`artifacts/pr/body.md:38`, and "13 checks, up from 11" at line 9). See finding 1.
5. **The recipe describes the one protocol — LANDED.** `SKILL.md` now states the Bearer anon key on
   every Auth post, `search` then `raw`, quoted-printable decoding, the `type=` filter and the
   20-second poll, and says the shipped drive runs (a), (a2) and (a3) itself. The pull-request
   Tradeoffs paragraph (`artifacts/pr/body.md:21`) names the three request changes.
6. **The drive is type-checked — LANDED AND PROVEN.** `.claude/skills/verify-ai4good/scripts/
   tsconfig.json` extends the acceptance config; `typecheck.ts` carries the third `PROJECTS` row;
   `import.meta.dir` became `fileURLToPath(new URL('.', import.meta.url))` (`drive-ngo-signup.ts:67`).
   On the snapshot of `1cc6d32` the pinned `tsc` exits 0 for the acceptance project and 0 for the
   drive project, and `--listFiles` shows the drive project compiling `drive-ngo-signup.ts` together
   with `live-stack.ts` and `local-stack.ts`, so a disagreement between them is a compile error.
7. **Prose sweep — LANDED.** All nine sites are corrected: `local-stack.ts` (the renumbered list,
   the `mailIdentification` reference, the `capabilities.ts` clause in the `PROVEN` note, and the
   race pointer that moved to `stack-lock.selftest.ts` with the lock), `registry.ts` 247 and 281,
   `suite-adapters.ts:10`, `runner-blackbox.selftest.ts`, `contracts.ts`, `_integration.ts`,
   `req-001/_fixture.ts`, `req-016/_fixture.ts`, `accounts.ts`. The parked README records that
   `live-email.ts` was edited before it moved; `live-stack.ts` messages say "the live mail reader"
   and "the stack"; the `index.ts` cast carries its note. A grep of live code for `capabilities.ts`,
   `attestation.ts`, `live-email.ts`, `pendingMethodProxy`, `adapterDerivedCapability`,
   `backedSutMethods` and `type-invention` returns nothing. The `_live.ts` note is one sentence
   rather than two; the fact is stated, so this is not a gap.
8. **Structural nits — LANDED, with one deliberate deviation.** The lifetime-pin preflight describe
   is back in `runner.selftest.ts` and passes; `runner.ts` no longer re-exports `bunExecutable` and
   `childEnv`, and the three selftests import them from `local-stack.ts`; `pending.ts` holds
   `AtPending`, `CapabilityPending` and `PendingPhase`, re-exported from `registry.ts`. Deviation:
   the ruling said "re-exported from `registry.ts` so no suite import changes", and `_live.ts` DID
   change its import to `../../harness/pending.ts`. That is the better reading of the finding it
   answers (the cycle sol 4 named), and the re-export means no other suite moved. Recorded, not
   faulted.
9. **The lock left `local-stack.ts` — LANDED.** `stack-lock.ts` holds `StackLock`, `Holder`,
   `stackLockPath({ projectId, apiPort })`, `acquireStackLock`, `processIsAlive`, `holderIsLive`,
   `heldByAnotherRun`, `clearStrandedGate` and `GATE_STALE_MINUTES`; `runner.ts` imports the lock
   from there; `local-stack.ts` is 951 lines. One correction to the ruling's own text: the lock
   carried **five** `it` blocks, not fifteen, and all five moved and pass.

Selftests on the snapshot: 12 files, 169 tests, 168 pass. The one failure is
`local-stack.selftest.ts:350` ("head `[0-9a-f]{4,40}`"), which fails only because a `git archive`
snapshot is not a git checkout — the evidence line correctly reports "head unknown (git did not
report it)". Nothing in that failure touches unit 4.

## Check 1 — the refusal precedes construction, and the loop fixture is unreachable above loop

`openWorld` in `tests/at/harness/registry.ts` asks `harnessModule.liveAdapterExists("req-" + o.requirement)`
at line 670 and throws `aboveLoopStandInRefusal(TIER, live, o.sutKey)` at line 671, two statements
before the `createHarness` call at line 673, and after the `harnessModule` null guard at line 657, so
the boolean can never be read off a missing module. Nothing between them can build anything. On the
other side, `createHarness` in `index.ts` reaches `loadAdapter` — the only function that resolves
`_fixture.ts` (`adapterUrl`, line 54) — inside `if (opts.tier === 'loop')` at line 232 and nowhere
else; `Tier` is `'loop' | 'integration' | 'drill'` (`registry.ts:134`), so both non-loop tiers fall
through to `loadLiveAdapterModule`, and a null there throws at line 240 instead of falling back. I
looked for a second route and found none: there is no other call to `loadAdapter`, no default
parameter that could make `tier` `'loop'`, and no catch that could swallow the throw. The
conformance selftest proves the pair at run time — `liveAdapterExists('req-016')` false,
`('req-001')` true, `createHarness({req-016, integration})` rejecting with "no live adapter for
req-016; the registry refuses this tier before construction", `createHarness({req-001, integration})`
reaching the live branch and refusing on the mail reader, and the req-016 loop harness building. The
check passes.

## Check 2 — one CLI seam, and nothing else spawns the Supabase CLI

`stackFromLocalStatus` (`local-stack.ts:430`) reads the config, calls `runSupabaseCli({ workdir:
repoRoot, projectId }, ['status', '-o', 'json'])`, hands the raw `CliResult` to `parseStackStatus`,
and maps it with `stackFromParsedStatus`, which refuses when the status names no catcher — exactly
the chain the ruling described. `runSupabaseCli` (line 330) builds through `supabaseInvocation` (line
305), and so does the one other CLI call, `resetLocalDatabase` (line 687); those are the only two
places under `tests/` that spawn the CLI, and both state `SUPABASE_PROJECT_ID` positively over an
allowlisted `childEnv`. A grep for `spawnSync`, `spawn(`, `execSync`, `bunx` and `bun x` across
`tests/at` and `.claude/skills` returns nothing else that reaches the Supabase CLI: the other spawns
are `tsc` (`typecheck.ts:60`), `vitest` (`runner.ts:439`), `where bun` (`local-stack.ts:122`), `git`
(`local-stack.ts:1016`), `taskkill`, the selftests' own child runners, and the drive's new `docker
inspect`. The two `bunx supabase status` strings that remain are prose in
`.claude/skills/verify-ai4good/SKILL.md` and `features/email-signup-and-confirmation.md`, kept
deliberately by item 5 as the recipe for a custom drive. The check passes, and the drive's status
call is now stricter than the one it replaced: it states the identity the CLI must resolve, which the
old `bun x supabase status` did not.

## Check 3 — the Doctor's two new checks fail loudly and cannot pass on an empty or malformed answer

Both go through `fatal`, which prints `ABORT: <redacted message>`, flushes the transcript and exits 1
(`drive-ngo-signup.ts:51-55`). (a2) wraps `mailIdentification(stack)` in try/catch, records the
failure and calls `fatal` in the catch, and `mailIdentification` itself throws on an absent catcher
URL, a transport error, a non-200, non-JSON, and JSON with no string `Version` — so there is no
answer short of a Mailpit that identifies itself which lets it pass. (a3) computes `ok` from one
expression, `source.length > 0 && normalize(source).startsWith(root)`, and `ok` is initialised
`false`; every path that does not set it leaves it false, and `if (!ok) fatal(note)` follows the
`record`. I walked the malformed answers: a launch failure sets the note in the `inspect.error`
branch and never touches `ok`; empty stdout becomes `JSON.parse('[]')`, whose `find` returns
undefined, so `source` is `''` and `ok` is false; `null` or an object answer makes `.find` throw a
TypeError that the catch turns into a note with `ok` still false; a mounts array with no
`supabase/functions` entry gives the same `''`; a mount from another checkout fails `startsWith`.
There is no branch that sets `ok` true without a Source that both ends in `supabase/functions` and
starts with this checkout's root. The check passes. Two small observations, neither a defect:
`inspect.status` is not consulted (it does not need to be — a non-zero exit yields no usable mounts
and still fatals), and `inspect.stderr` is not carried into the note, so docker's own words are lost
to the operator.

## New findings

1. **The Done contract still says 11 of 11 — severity medium (contract drift).**
   Location: `loop/items/AI4DEV-87/brief.md` lines 47, 58 and 111, and
   `loop/items/AI4DEV-87/artifacts/design.md` section 2. Evidence: the drive at `1cc6d32` records 13
   checks (a, a2, a3, b, c, d1, d2, e, f, g1..g4) and prints `13/13 checks passed`; ruling item 4
   said the Done contract's "11 of 11" becomes "13 of 13"; only `artifacts/pr/body.md` says 13. The
   evidence bar a verifier reads at station 6 (`brief.md:111`, "the drive, 11 of 11") therefore
   states a bar the drive can no longer meet, in the exact shape — two statements of one fact,
   drifting apart — this branch's prose sweep exists to delete. Note before fixing: `brief.md:39-48`
   is a blockquote of the founder's item text and must not be silently rewritten; the honest repair
   is the lead's own restatements at lines 58 and 111 plus one sentence saying the contract's 11
   became 13 and why.
2. **The "stack is down" message lost its remedy — severity low (operator guidance).**
   Location: `tests/at/harness/live-stack.ts` (deleted `parseStatusJson`) versus
   `local-stack.ts:366-371`. Evidence: the deleted function threw "supabase status did not answer
   JSON — is the stack up? (bun run db:start)", and a deleted selftest pinned that string
   ("throws a message that names bun run db:start"). The drive's most common failure now reports
   "`supabase status` reported no JSON (exit N): <stderr>" with no remedy, while every other refusal
   the drive can hit names one — check (a3) names `bun run db:stop` then `bun run db:start` twice.
3. **Two sentences in `design.md` section 1 still describe the replaced shape — severity low
   (prose).** Location: `loop/items/AI4DEV-87/artifacts/design.md`, section 1. Evidence: the section
   says "Replacement: **one boolean on the harness, `live`**" when the boolean deliberately left
   `AtHarness` in this commit, and "`CapabilityPending` moves into `registry.ts` beside `AtPending`"
   when it lives in `pending.ts` and is re-exported. The corrected sentence item 1 demanded IS
   present two paragraphs later, so this is residue, not a missed correction.
4. **The uncommitted unit-5 selftest does not type-check — severity medium, and it is NOT a defect
   of `1cc6d32`.** Location: `tests/at/harness/live-stack.selftest.ts` in the working tree (modified,
   uncommitted). Evidence: `bun run typecheck` in the worktree fails with four errors, all in that
   file — `(173,41)`, `(197,41)` and `(222,39)` "Cannot find name 'RequestInfo'", because the
   acceptance project sets `lib: ["ES2022"]` and `types: ["node"]` and @types/node exposes `fetch`,
   `Response` and `RequestInit` but no `RequestInfo` (use `Parameters<typeof fetch>[0]`); and
   `(184,80)` "Expected 3 arguments, but got 4", because the new test calls `verifyLinksFor(STACK,
   address, 'signup', 1_000)` while `verifyLinksFor` in `live-stack.ts` still takes three — sol item
   10's deadline parameter is not in the module yet. The same `tsc`, run over a clean snapshot of
   `1cc6d32`, exits 0 on both projects, so the commit under review is clean and this belongs to the
   unit in flight.
5. **Filed, not a unit-4 gap: the integration bodies still speak of "the slot" — severity low
   (prose, out of the ruling's scope).** Location: `tests/at/suites/req-001/_integration.ts` lines 2,
   149, 397, 488, 541, 546, 610, 953 and `_live.ts` lines 228 and 416. Evidence: item 7 renamed the
   shared module's refusals away from the parked slot pool ("the live mail reader", "the stack"), but
   the assertion messages a failing integration id prints still say "no confirmation email reached
   the slot's mail catcher" and "over the slot's own gateway". Same class as the nine sites, not on
   the list; a later item, or the next prose sweep.

## Commands run

All against the `git archive` snapshot of `1cc6d32` with `node_modules` joined in, from
`…/scratchpad/at1cc6d32`:

- `node node_modules/typescript/lib/tsc.js --noEmit -p tests/at/tsconfig.json` → exit 0.
- `node node_modules/typescript/lib/tsc.js --noEmit -p .claude/skills/verify-ai4good/scripts/tsconfig.json` → exit 0.
- `bunx vitest run --root tests/at --config vitest.config.ts harness/` → 12 files, 169 tests,
  168 pass, 1 fail (the `head <sha>` assertion, a snapshot artefact).

`at:verify --tier integration` and the drive were not run, as instructed. Nothing in the writer's
tree was read as evidence and nothing in it was changed.
