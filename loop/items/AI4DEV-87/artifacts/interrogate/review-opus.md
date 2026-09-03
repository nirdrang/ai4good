# Adversarial review — Reviewer D (opus)

Scope: `git diff -M 7d897b7...HEAD` in `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87`,
plus the surrounding modules the rubric names.

## What I verified before judging

- `bun run typecheck` — clean on both configs.
- `bun run at:selftest` — 11 files, 170 tests, all green. The stated before/after counts hold.
- `git diff --stat 7d897b7...HEAD -- tests/at/expected/` — empty. The two `--expect` manifests are
  byte-identical, as claimed.
- The lifecycle move is verbatim. I compared the 1277 lines deleted from `runner.ts` against the
  1267 lines added to `local-stack.ts`: 58 lines differ, and every one of them is the attestation
  nonce (its mint, its write, its `PreparedStack` field, its env var) or a comment that named it.
  No logic drifted.
- No import cycle. `local-stack.ts` imports only `atconfig.ts` and `check.ts`; `runner.ts` imports
  `local-stack.ts`; nothing goes back.
- No selftest was lost in the split. The old `runner.selftest.ts` had 36 `it()` blocks; the new
  `runner.selftest.ts` has 7 and `local-stack.selftest.ts` has 29, and the titles match one for one.
- The adapter's requests are unchanged. `mailMessagesFor` in `live-stack.ts:206` sends the same two
  requests the parked `live-email.ts:144,156` sent, character for character. **The drive's mail
  requests did change**: it used to poll `/api/v1/messages` and read `/api/v1/message/{id}`, and it
  now searches `/api/v1/search?query=to:...` and reads `/raw`. That is deliberate and it is the
  point of the unit, but it means the drive's 11 of 11 is evidence for the new requests, not for the
  old ones.

I did not run the integration tier or the drive.

## Findings

### 1. [Critical] The drive imports the shared module, and no tsconfig compiles the drive

**Location**: `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts:20-31`;
`tsconfig.json:2`; `tests/at/tsconfig.json:8`; `tests/at/typecheck.ts:41-44`

**Finding**: Unit 2's whole claim is that one module now serves two consumers. Only one of the two
consumers is inside a TypeScript program. The root config includes
`["src/**/*.ts", "src/**/*.tsx", "vite.config.ts", "eslint.config.js"]`. The acceptance config is
rooted at `tests/at` and includes `**/*`. `tests/at/typecheck.ts` runs exactly those two projects.
The drive lives under `.claude/skills/`, which is in neither.

**Evidence**: I ran the pinned compiler over the drive with the acceptance config's options. It
reports one diagnostic, `TS2339: Property 'dir' does not exist on type 'ImportMeta'` at line 63 —
the bun global. So the file is otherwise clean today, and nothing in the repository checks that it
stays clean. Trace what that costs: `live-stack.ts` is a `tests/at` module, so a later harness item
will refactor it under `bun run typecheck` and `bun run at:selftest`, both green, while the drive
still calls the old signature. `sqlClient` returning a client without `.close()`, `verifyLinksFor`
gaining a fourth required parameter, `functionPost` reordering `bearer` and `ip` — each of those
breaks the drive at run time, on the founder's machine, with no CI signal anywhere. The drive is the
tool the item's own Done contract leans on ("the drive still passes 11 of 11"), so the one artifact
that certifies the change is the one artifact no gate protects.

Before this change the drive imported nothing from `tests/at` and the gap did not matter. The change
created the coupling and did not extend the check to cover it.

**Suggestion**: Add a third entry to `PROJECTS` in `tests/at/typecheck.ts` for a config that includes
`.claude/skills/**/scripts/*.ts`. It needs bun's globals for `import.meta.dir`; either add
`bun-types` to that one project, or replace line 63 with
`resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..')` and keep `"types": ["node"]`.
Either way the check must fail when the drive and `live-stack.ts` disagree.

---

### 2. [Warning] Above loop with no live adapter, the harness builds the whole loop fixture and then throws it away — and a fixture defect turns twelve declared reds into undeclarable ones

**Location**: `tests/at/harness/index.ts:247-256`; `tests/at/harness/registry.ts:682-696`

**Finding**: `openWorld` builds the harness first and asks whether it is live second. At the
integration tier for req-016 that means, per AT id: construct an `EmailProviderSim`, construct a
`FixtureWorldStore`, import and run the 79 KB `_fixture.ts`, build sentinels and faults — and then
`aboveLoopStandInRefusal('integration', false, 'notifications')` throws and `h.teardown()` unwinds
all of it. Twelve times per run, for a verdict that reads three values none of which come from the
harness.

**Evidence**: `aboveLoopStandInRefusal(tier, live, sutKey)` is now pure and takes nothing from the
built object (`registry.ts:789-792`). The old gate genuinely needed the harness, because it read a
ledger computed from the constructed values; that reason is gone and the construction was left
behind. This is not only waste. `createHarness` is called on line 682, **outside** the `try` on line
688, so anything it throws escapes `openWorld` as a plain `Error`. A defect in req-016's loop fixture
— a module that no id at this tier is supposed to touch — therefore reports as
`Error: no fixture adapter for req-016 ...` against a manifest that declares
`capability-pending`, and all twelve declared reds become deviations. The tier that is meant to
refuse a suite before it runs anything runs the suite's fixture first.

**Suggestion**: Decide liveness before building. `HarnessModule` gains
`liveAdapterExists(requirement): boolean` (a one-line `existsSync`, already written at
`index.ts:139`), `openWorld` calls it and throws the refusal before `createHarness`, and
`createHarness` loses its third branch entirely. That deletes a whole branch, the wasted
construction, the escaping-error path, and — with finding 3 — the `live` member from the contract.

---

### 3. [Warning] `live` sits on the body-facing harness type, where the tree's own doctrine says a tier flag must never be

**Location**: `tests/at/harness/contracts.ts:188-206` (the member) and `:225-232` (`TierHarness`)

**Finding**: `live: boolean` is a member of `AtHarness`, and `TierHarness` omits `clock` and
`vendors` but not `live`. Every test body at every tier can read `h.live`.

**Evidence**: `registry.ts:716-736` states the rule this breaks, in its own words: "a body that reads
`if (h.tier === …)` is a body whose green means something different depending on a value the reader
has to trace." That is why the per-tier body map exists and why `TierHarness` subtracts rather than
adds. `contracts.ts` states the companion rule — everything reachable from the harness object is
under the alias doctrine because a suite must not be handed diagnostics. The deleted
`buildCapabilityLedger` docstring said the same thing about provenance: it was "deliberately NOT a
member of `AtHarness`" so that "a `capabilities` member there would be a provenance diagnostic
sitting in front of every suite." The change removed the provenance ledger and then put a coarser
version of the same fact on the harness, and deleted the paragraph that forbade it. The member's own
docstring — "Nothing else reads it" — is a convention, not a constraint; the rubric asks for a type
constraint where a comment is doing the work.

**Suggestion**: If finding 2 is taken, `live` disappears. If it is not, add `'live'` to both arms:
`AtHarness` keeps it for `registry.ts`, and `TierHarness` becomes
`Omit<AtHarness<…>, 'live'>` in the loop arm and `Omit<AtHarness<…>, 'clock' | 'vendors' | 'live'>`
above it. One line, and no body can branch on it.

---

### 4. [Warning] Nine places in the live tree still describe the parked design, two of them claiming a dead probe is executable

**Location**: `supabase/functions/_shared/accounts.ts:13`; `tests/at/harness/registry.ts:262` and
`:297`; `tests/at/harness/suite-adapters.ts:10`; `tests/at/harness/local-stack.ts:496` and `:1013`;
`tests/at/suites/req-001/_fixture.ts:7`; `tests/at/suites/req-016/_fixture.ts:25`;
`tests/at/suites/req-001/_integration.ts:1241`

**Finding**: I grepped the whole tree outside `loop/parked/` and `loop/items/` for the parked names.
Nine live files still name modules and functions that this change moved out of the live tree:
`capabilities.ts`, `live-email.ts`, `tests/at/typeprobes/`, `adapterDerivedCapability()`,
`pendingMethodProxy`.

**Evidence**: Two of them are worse than stale — they assert a live guard that no longer exists.
`suite-adapters.ts:10` says "`tests/at/typeprobes/sut-seam-legacy.probe.ts` is that hole,
**executed**." `registry.ts:297` says the same probe is "that attack, **kept alive**: it compiled
clean before this change and must fail now." Neither is true any more: `tests/at/tsconfig.json` no
longer excludes `typeprobes` because there are no typeprobes, `type-invention.selftest.ts` — the
selftest that asserted the probes still fail — is parked, and the directory is dead text under
`loop/parked/v1/`. A reader who acts on those two sentences believes a negative test guards the seam
when nothing does. The change knew this: it deleted the identical sentence from `tests/at/README.md`
(diff line 700) and from `contracts.ts`, then missed the three copies elsewhere.

`supabase/functions/_shared/accounts.ts:13` is the one that left the test tree entirely. Shipped
product code now cites `tests/at/harness/capabilities.ts` to explain why it exists.

`_integration.ts:1241` still names `pendingMethodProxy` as the single home of the refusal shape —
in the same change that replaced it with six hand-written throws in `_live.ts:806-811`. The
`_live.ts` comment that justified the old arrangement ("A hand-written stub here would be a second
copy of a rule, which is how two copies come to disagree") was deleted, so the tree now carries the
justification for the abandoned design and no statement of the new one.

**Suggestion**: Sweep the nine sites in this branch. For the two probe claims, say what is true: the
attack is recorded under `loop/parked/v1/tests/at/typeprobes/` and nothing executes it. For
`_integration.ts:1241`, name where the refusal shape actually comes from now.

---

### 5. [Warning] `loop/parked/v1/README.md` says the mail reader moved "byte for byte"; it did not

**Location**: `loop/parked/v1/README.md:85`

**Finding**: The sentence reads "`tests/at/harness/live-email.ts` moved here byte for byte." The
diff records `similarity index 73%` with 52 changed lines, and the changes are not only prose: the
`attestation` parameter, its brand check, its refusal message and the closing `stampAttestation`
call were all removed from `createLiveEmail`.

**Evidence**: The other four parked paths really are 100% renames, which is what makes this one
sentence misleading rather than merely loose — a reader comparing the park to the pre-park tree will
trust the claim and stop looking. The parked tree's only value is as a record of what the design
was; a record edited on the way in, under a claim that it was not, is worth less than no record. The
project's own writing rule ("cite a date only where a message exists", "quote exactly, or do not use
quote marks") is the same principle applied to a different kind of evidence.

**Suggestion**: Say what happened: the file moved and the attestation was stripped on the way, so it
is the reader for the shape rather than the file that ran. Or move it unmodified and take the
compile-free hit, which is free because nothing compiles that tree.

---

### 6. [Warning] The five `AT_SUPABASE_*` names are written twice, by hand, with opposite strictness

**Location**: `tests/at/harness/local-stack.ts:1230-1240` (`childCoordinates`, the writer);
`tests/at/harness/live-stack.ts:63-72` (`stackFromEnv`, the reader);
`tests/at/harness/live-stack.ts:56-61, 92-105` (`requiredField` / `stackFromStatusJson`)

**Finding**: One module writes the five environment names as string literals; a different module,
created by this same change, reads them back as string literals. Nothing joins them. And the two
constructors of the same `Stack` type disagree about rigour: `stackFromStatusJson` throws naming the
missing field, while `stackFromEnv` silently substitutes `''` for every one of the five.

**Evidence**: This is the "one rule, two copies" hazard `vendors.ts:17-19` warns about, in the very
module the change created to end a duplication. Trace the silent path: rename
`AT_SUPABASE_MAIL_URL` in `childCoordinates` and forget the reader, and `stackFromEnv` returns
`mailUrl: ''`; `_live.ts` calls `mailIdentification`, which refuses with "the slot's status reported
no mail catcher URL." The message blames the stack's status report for a wiring mistake in the
harness, and it does so on a path that only runs on a live stack, which CI never exercises. The
other four have no guard at all — a renamed `AT_SUPABASE_DB_URL` gives `sqlClient` an empty
connection string and whatever error the driver chooses.

A smaller version of the same asymmetry: `stackFromStatusJson` hard-requires `SERVICE_ROLE_KEY`,
which the drive never uses. The old drive checked only the four fields it needed. That is fail-loud
and unlikely to fire, but it is the same boundary drawn in two places to two standards.

**Suggestion**: Export the name map once from `live-stack.ts`
(`export const STACK_ENV = { apiUrl: 'AT_SUPABASE_URL', … } as const`) and have `childCoordinates`
import it — no cycle, since `live-stack.ts` imports nothing from the harness. Then give
`stackFromEnv` the same `requiredField` treatment for the four mandatory coordinates, leaving
`mailUrl` optional, so a child launched without coordinates says which one is missing.

---

### 7. [Warning] `stackFromStatus` reports "the stack is down" when the CLI could not be launched

**Location**: `tests/at/harness/live-stack.ts:107-113`

**Finding**: `stackFromStatus` calls `spawnSync` and then passes `status.stdout ?? ''` straight to
`parseStatusJson`. It never looks at `status.error`. When bun cannot be launched, `stdout` is
undefined, `parseStatusJson('')` finds no `{`, and it throws
"supabase status did not answer JSON — is the stack up? (bun run db:start)".

**Evidence**: The operator is told to start a stack that may already be running, and the real cause —
the CLI never ran — is discarded. `local-stack.ts` goes to deliberate lengths to avoid exactly this:
`identityVerdict` separates "no stack is running for demo; run `bun run db:start`" from "the CLI
could not be launched to read the identity of demo," and `local-stack.selftest.ts:283-288` asserts
both, because "a safety phrase that fires on routine operator error stops being read." The new module
lost that distinction on the drive's entry path. Note that checking the exit code is the wrong fix
and the tree knows why — `supabase status` exits non-zero while still printing valid JSON when a
service is disabled — so the guard is `status.error`, not `status.status`.

**Suggestion**: In `stackFromStatus`, throw a distinct message when `status.error` is set, naming the
spawn failure. Three lines, and it matches the standard the sibling module already holds.

---

### 8. [Warning] The drive rebuilds every request URL for its own transcript, and never uses the module's identification probe

**Location**: `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts:76, 84-97, 102, 110, 134,
155`

**Finding**: `authPost` and `functionPost` build their URL from `stripSlash(stack.apiUrl)` plus the
path. The drive keeps its own `const api = stack.apiUrl.replace(/\/$/, '')` on line 76 and rebuilds
the same URL by hand at each of the five `recordHttp` calls. Separately, the Doctor step on lines
84-97 hand-rolls fetch, `response.text()` and a `JSON.parse` in a try/catch — ten lines that
`live-stack.ts` already has in its unexported `readJson` and `jsonBody`.

**Evidence**: The transcript is the drive's evidence artifact. It now records a URL that no code
path proves was the URL called: two independent expressions produce it, in two files, and the one in
the transcript is the one nobody sent. Change the base in `authPost` and the transcript keeps
recording the old shape while the drive keeps passing. That is precisely the failure the change
exists to remove, reintroduced in the consumer.

The Doctor step is the more useful gap. `mailIdentification` (`live-stack.ts:158`) is the module's
positive proof that the endpoint is really a Mailpit and not a web page on a reused port — the
parked README calls that probe out as the reason the module exists — and the drive never calls it.
The drive is the consumer most likely to meet a different catcher, because it runs against whatever
`supabase start` gave the operator, and it now depends on Mailpit-only endpoints
(`/api/v1/search`, `/raw`) that the old drive did not use. Against an Inbucket the drive gets an
unhandled 404 at step (d), after which `flush()` never runs and no evidence file is written.

**Suggestion**: Have `authPost` and `functionPost` return the `url` they called alongside `status`
and `json`; `recordHttp` then takes it, and `const api` on line 76 disappears with all five
reconstructions. Add `await mailIdentification(stack)` to the Doctor step and record its answer as
check (a2) — one line, and it turns a mystery 404 into the module's own precise refusal. Export
`readJson`/`jsonBody` (or add `authGet`) so the Doctor step stops hand-rolling the client.

---

### 9. [Warning] The new gate is tested as a predicate and not as a mechanism

**Location**: `tests/at/harness/conformance.selftest.ts:139-146`; `tests/at/harness/index.ts:233,
244, 255`

**Finding**: The only test of the above-loop refusal calls `aboveLoopStandInRefusal` directly with
literal arguments. Nothing asserts that `createHarness` produces the right `live` value. The three
assignments — `live: false` at loop, `live: true` with a live adapter, `live: false` without one —
are unverified.

**Evidence**: The deleted tests covered the producer, not the predicate: the old
conformance file asserted that `createHarness({requirement: 'req-016', tier: 'integration'})` rejects,
and that a loop harness reports exactly its four stand-ins. Those went, and what replaced them tests
a three-line pure function. The gate is now `tier !== 'loop' && !live`, so `live` is the entire
mechanism, and a one-word edit to `index.ts:255` would grade req-016's loop fixture as if it were
live at the integration tier. `--expect` catches it, because those twelve ids are declared red — but
`--expect` is a flag, and the harness's own conformance wall exists precisely so that a centralized
guard cannot green-light thirty suites with no suite showing a symptom (`conformance.selftest.ts:4-8`).

**Suggestion**: Two assertions, both runnable today without a stack or Docker:
`expect((await createHarness({requirement: 'req-016', tier: 'loop'})).live).toBe(false)` and the same
for `tier: 'integration'` (req-016 has no `_live.ts`, so it takes the third branch and returns).
A third — `await expect(createHarness({requirement: 'req-001', tier: 'integration'})).rejects.toThrow(/mail catcher/)`
— proves the live branch is reached and that `_live.ts` is found, and is the direct replacement for
the deleted attestation test.

---

### 10. [Warning] The extraction stopped one module short: `local-stack.ts` lands at 1268 lines

**Location**: `tests/at/harness/local-stack.ts`, whole file; the lock occupies lines 225-480

**Finding**: The change replaces one 1832-line `runner.ts` with a 531-line `runner.ts` and a new
1268-line `local-stack.ts`. The direction is right and the move is verbatim. But the new module is
still ten concerns wide — child environment, redaction, config reading, machine-wide lock, CLI seam,
status parsing, local-stack checks, readiness, migration proof, reset, identity, coordinates,
evidence line — and it crosses the thousand-line line that this review standard treats as a strong
smell.

**Evidence**: One seam is already drawn for you. The machine-wide lock is lines 225-480 — 256 lines,
its own header comment, its own gate protocol, its own staleness rule — and it needs nothing from
the rest of the file except `config.projectId` and `config.apiPort` for its key. Fifteen of
`local-stack.selftest.ts`'s twenty-nine tests are about it. Nothing else in the module reads a lock
and the lock reads nothing else. Lifting it to `stack-lock.ts` puts `local-stack.ts` at about 1010
lines, gives the lock a selftest file that is about one thing, and costs one import.

**Suggestion**: Extract `stack-lock.ts` with `StackLock`, `Holder`, `stackLockPath`,
`acquireStackLock`, `processIsAlive`, `holderIsLive`, `heldByAnotherRun`, `clearStrandedGate` and
`GATE_STALE_MINUTES`. Give `stackLockPath` a `{ projectId, apiPort }` parameter instead of
`LocalConfig` so the new module does not import back. Move the lock's fifteen tests with it.

---

### 11. [Warning] `runner.ts` keeps a pass-through re-export so two sibling selftests need not change one import line

**Location**: `tests/at/harness/runner.ts:51` — `export { bunExecutable, childEnv };`

**Finding**: Both helpers now live in `local-stack.ts`. `runner.ts` re-exports them for no reason
other than that `runner-expect.selftest.ts:35` and `runner-blackbox.selftest.ts` import them from
`./runner.ts`. Meanwhile `local-stack.selftest.ts:126-148` imports the same two from
`./local-stack.ts`. The tree now has two spellings for one helper, in files that sit next to each
other.

**Evidence**: This is the compatibility layer the review standard says to migrate and delete in the
same wave. There are exactly two callers, both in this directory, both already being edited by this
change. The cost of keeping it is that the next reader has to work out which import is canonical,
and the answer is "either" — which is how the canonical home stops being canonical.

**Suggestion**: Change the two import lines and delete line 51.

---

### 12. [Warning] The stale-mount failure the item measured is guarded by a sentence in a markdown file

**Location**: `.claude/skills/verify-ai4good/SKILL.md`, the Doctor block (diff lines 30-39)

**Finding**: The change adds a `docker inspect ... --format "{{json .Mounts}}"` line to the Doctor
list and a paragraph telling the operator to read the source path and judge whether it names a
removed worktree or another checkout.

**Evidence**: The paragraph records what this cost: "Measured 2026-09-02 on this item: the container
mounted the previous item's removed worktree and the integration tier reported 34 reds with the
stack otherwise healthy." So the failure is real, it is silent, it is recent, and it wastes a whole
integration run — and the countermeasure is a human remembering to run one more command and compare
two paths by eye. The rubric's own line applies: if the fix is a convention someone has to remember,
ask whether it could be a runtime check that makes the wrong thing impossible. It could. The drive
already knows `repoRoot`; the comparison is a string containment test against the inspect output.

I note the runner deliberately declined to put Docker on its path, and `prepareLocalStack`'s
docstring explains why (a destructive path CI never runs). That reasoning does not extend to the
drive, which is a local, manual, non-destructive tool that already spawns the Supabase CLI.

**Suggestion**: Put the check in the drive's Doctor step, as check (a3): run the inspect, compare the
mount source against `repoRoot`, and fail the drive with the exact remedy the paragraph already
states. Keep the paragraph as the explanation; let the code be the guard.

---

### 13. [Nit] Two double casts replaced a single cast, and the comment that explained the reconciliation went with it

**Location**: `tests/at/harness/index.ts:240` and `:252` —
`clock: new RealClock() as unknown as AtHarness['clock']`

**Finding**: `RealClock` has only `now()`; `AtHarness['clock']` is `Clock`, which also declares the
control seam. `as unknown as` is required because the direct cast no longer type-checks — the old
code went through `Capability<unknown>` and needed only one step.

**Evidence**: The deleted comment was the only place in the tree that said where the two tiers'
shapes are reconciled and what the cast does and does not buy ("NOTHING IS WIDENED BY IT.
`registry.ts` hands a body `TierHarness<T>`, which SUBTRACTS the two members at integration... so it
is the line to read when they disagree"). The claim is still true — `TierHarness` still subtracts —
but the two `as unknown as` sites now read as unexplained escapes in a file whose neighbouring
comments spend paragraphs justifying much smaller liberties. `as unknown as` is also the spelling
that survives a genuine type error, so it is worth being loud about.

**Suggestion**: Restore a two-line version of the deleted note above `finish`, or take the cast out
of the picture by having `finish` accept `Clock | RealClock` and narrow in `TierHarness` only.

---

### 14. [Nit] The new shared module's refusals speak in two parked vocabularies

**Location**: `tests/at/harness/live-stack.ts:162, 172, 179, 191, 198, 273`

**Finding**: The module header (line 5) states "No provenance. No attestation." Six operator-facing
strings inside it say "refusing to build the live email **capability**" and refer to "the **slot**'s
status" and "the **slot** database". Both concepts are parked: the capability ledger by this change,
the slot pool earlier.

**Evidence**: These reach a person. `mailIdentification` is what refuses when the mail catcher is
wrong, and the drive surfaces its message through `fatal()`. An operator reading "the slot's status
reported no mail catcher URL" will look for a slot, find the corpse containers the SKILL.md warns
about on ports 45xxx/46xxx, and chase the wrong thing. This is the same class as finding 4, in text
the change itself wrote rather than text it forgot to update.

**Suggestion**: Say "the live mail reader" and "the stack" while the strings are being written.
