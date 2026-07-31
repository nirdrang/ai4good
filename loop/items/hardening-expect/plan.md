# EXECUTION PLAN — expected-state manifest + `at:verify --expect`

Item: `hardening-expect` (hardening 1 of 3). Worktree `C:\Users\nirdr\Downloads\ai4good-expect`,
branch `nirdrang/at-verify-expect`. Authority: `loop/items/hardening-expect/brief.md`.
Status: **plan only — nothing implemented.** Every decision below is either forced by the brief
(marked "brief:") or is a small silent-point call I made and flagged, or is an open question I
refuse to decide (section 9).

---

## 0. Ground truth I established before planning

Not assumed — run in this worktree, raw output captured.

`bun install` — 515 packages, fresh worktree, `git status --porcelain` still clean afterwards
(no lockfile churn).

`bun run at:verify req-016 --tier loop` → exit 1, and this is the real current state D9 must
declare:

```
at:verify req-016 --tier loop
  AT-016.01    red      CapabilityPending: CAPABILITY PENDING — H3 static provider scan, H3 sentinels, H5 email provider simulator
  AT-016.02    green    registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event
  AT-016.03    green    every taxonomy row delivers to exactly its recipients on exactly its channels, with the named payloads
  AT-016.04    green    sensitive negatives: no candidacy to the NGO, no vetting outcome to the volunteer, no donation event
  AT-016.05    green    every critical class goes out by email; the low-tone event is in-app only
  AT-016.06    green    a documented delivery default exists for every taxonomy row
  AT-016.07    red      CapabilityPending: CAPABILITY PENDING — H3 fault injection and process restart
  AT-016.08    green    a comment burst delivers the count the pinned anti-spam configuration prescribes, on two different configurations
  AT-016.09    red      CapabilityPending: CAPABILITY PENDING — H3 fault injection and process restart
  AT-016.10    green    recipients resolve at event creation: the old holder receives, the new holder is excluded
  AT-016.11    red      CapabilityPending: CAPABILITY PENDING — H5 email provider simulator
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 8 green, 4 red, 0 missing
  FAILURE: 4 ids red
  FAILURE: the test process exited 1
```

`bun run at:selftest` → **42 passed (4 files)**, 3.2s wall.

I also ran a throwaway probe (in the scratchpad, never in the repo) that planted a disposable
tree the way `runner-blackbox.selftest.ts` does and made one id fail by throwing. This settles
what the conformance fixtures can rely on:

```
  AT-907.01    green    a green one
  AT-907.02    red      Error: CAPABILITY PENDING — H9 imaginary capability
```

So a red row's `detail` is `firstLine(failureMessages.join('\n'))` = `"<ErrorName>: <message>"`,
redacted. A thrown `Error` with a controlled message therefore gives a **deterministic** detail
string, which is what conformance case 4 (wrong reason) needs.

---

## 1. Files — the complete list, nothing else is touched

**Created**

| Path | Work item | What it is |
|---|---|---|
| `tests/at/harness/expected.ts` | W1 | manifest reader + the pure comparison functions |
| `tests/at/expected/req-016.json` | W1 | the REQ-016 declaration (D9) |
| `tests/at/harness/expected.selftest.ts` | W1 | unit tests for the pure functions (see 1a) |
| `tests/at/harness/runner-expect.selftest.ts` | W3 | the seven black-box conformance cases of D8 |
| `tests/at/expected/README.md` | W4 | what the manifest is, why red→green is a failure, how to update |

**Modified**

| Path | Work item | Change |
|---|---|---|
| `tests/at/harness/runner.ts` | W2 | `--expect` flag, declaration preflight, verdict branch, USAGE line |
| `loop/items/hardening-expect/plan.md` | — | this file (+ the critique dispositions folded in later) |

**Explicitly NOT modified, and why**

- `package.json` — no new script. `bun run at:verify` forwards extra arguments verbatim
  (verified: `bun run at:verify req-016 --tier loop` invokes `bun tests/at/harness/runner.ts
  "req-016" --tier loop`), and `at:selftest` already globs `harness/**/*.selftest.ts`, so both
  new selftest files are picked up with no wiring.
- `tests/at/vitest.config.ts` — `include` already covers `harness/**/*.selftest.ts`. A `.json`
  and a `.md` under `tests/at/expected/` match no test glob.
- `tsconfig.json` — forbidden by D7 (AI4DEV-24 owns it). See open question OQ2, which is the
  consequence.
- `runner-blackbox.selftest.ts`, `runner.selftest.ts`, `conformance.selftest.ts`,
  `req016-oracles.selftest.ts` — D6 ("no existing selftest may change"). See OQ3.
- `check.ts` — nothing needed. `inspectBijection` already hands the runner the acceptance P0 id
  list, which is exactly the set D5's fourth refusal compares the manifest against.
- `src/`, `design/`, `supabase/`, the harness capability modules, the REQ-016 suite — D7.

### 1a. The extra unit selftest file — flagged, strikeable

W1 asks for "pure functions where possible so they are unit-testable"; the repo's own pattern is
pure-piece tests in `runner.selftest.ts` next to assembly tests in `runner-blackbox.selftest.ts`.
I plan ~6 small unit tests in `expected.selftest.ts` (parse rejects a non-object, rejects an empty
reason, rejects a `red` value that is not a string, bijection catches an undeclared P0 id and an
extra declared id, comparison catches each of the three deviation kinds). The brief mandates only
D8's seven. If the orchestrator considers this beyond scope, deleting this one file removes it
with no other change. Brief verification item 2 says "the existing 42 plus the new conformance
tests"; these extra tests make the count higher than that phrasing implies — flagging so the
number is not read as a discrepancy later.

---

## 2. `tests/at/harness/expected.ts` — module boundary and exact signatures

Placed in `harness/` beside `check.ts` because it is harness plumbing, not a test. It imports
`REPO_ROOT` from `check.ts` and **nothing from `runner.ts`** — the dependency runs
`runner.ts → expected.ts → check.ts`, one direction, no cycle. It imports the `IdRow` type from
`runner.ts`… which *would* be a cycle. **Resolution: `expected.ts` declares its own minimal
structural input type** (`{ id: string; status: string; detail: string }`) and never imports
`runner.ts`. `IdRow` satisfies it structurally, so `runner.ts` passes `rows` straight in.

```ts
/** One tier's declaration. `red` maps an id to the reason that MUST appear in its detail. */
export interface TierExpectation {
  green: string[];
  red: Record<string, string>;
}

export interface ExpectedManifest {
  requirement: string;
  tiers: Record<string, TierExpectation>;
}

/** Structural shape of a runner report row — deliberately not an import from runner.ts. */
export interface ReportedRow {
  id: string;
  status: string;   // 'green' | 'red' | 'missing'
  detail: string;
}

/** Where a requirement's declaration lives — under the DATA root, so AT_REPO_ROOT redirects it. */
export function expectedManifestPath(requirement: string): string;

/** Text → validated manifest. PURE. Throws Error with a precise message on any malformation. */
export function parseExpectedManifest(text: string, requirement: string): ExpectedManifest;

/** The tier's declaration, or throw naming the tiers that ARE declared. PURE. */
export function tierExpectation(manifest: ExpectedManifest, tier: string): TierExpectation;

/** D5#4: declared ids vs the acceptance file's P0 set. PURE. Empty array = in bijection. */
export function declarationBijectionProblems(
  expectation: TierExpectation,
  acceptanceIds: string[],
): string[];

/** D4: every way the run deviates from the declaration, one line per offending id. PURE. */
export function expectationDeviations(
  rows: ReportedRow[],
  unexpected: string[],
  expectation: TierExpectation,
): string[];

/** The only I/O. Throws with a distinguishable message when the file is absent. */
export function loadTierExpectation(
  requirement: string,
  tier: string,
  acceptanceIds: string[],
): TierExpectation;
```

`loadTierExpectation` is the single call the runner makes; it performs, in order, all four D5
refusals — read (ENOENT → "no declaration"), parse/validate, tier lookup, bijection — and throws
on the first. Every other exported function is pure and directly unit-testable.

### 2a. What `parseExpectedManifest` refuses (D5 "malformed")

Each refusal message names the offending path in the JSON.

1. `JSON.parse` throws → `"tests/at/expected/req-016.json is not valid JSON: <message>"`.
2. top level is not a plain object (null, array, scalar).
3. `requirement` missing, not a string, or **not equal to the requirement being verified** — a
   copy/paste guard; that field has no other purpose. *Silent-point call, flagged.*
4. `tiers` missing or not a plain object.
5. a key of `tiers` is not one of `loop` / `integration` / `drill`. *Silent-point call, flagged:*
   a typo'd tier key would otherwise surface as the much vaguer "tier absent". Alternative was to
   ignore unknown keys.
6. a tier value is not a plain object, or its `green` is not an array of strings, or its `red` is
   not a plain object of string values.
7. **a declared reason is empty or whitespace-only** → refuse. This one is load-bearing, not
   tidiness: the empty string is a substring of every detail, so an empty reason would make D3's
   check vacuously pass for that id and silently disable the gate on exactly the id someone was
   sloppy about.
8. an id in `green` or in the keys of `red` is not a well-formed AT id
   (`/^AT-\d{3}(?:\.\d+)*\.\d+[a-z]?$/`, the same grammar `registry.ts` enforces).

Every one of these reaches the user as exit 2, never as a pass — brief D5.

### 2b. `declarationBijectionProblems` — D5's fourth refusal

`declared = green ∪ keys(red)`. Problems, each naming the ids:

- P0 ids in the acceptance file with no declaration → `"2 P0 ids carry no declaration: AT-016.05, AT-016.06"` (this is D8 case 6);
- declared ids that are not P0 of this requirement → `"1 declared id is not a P0 of this requirement: AT-016.99"`;
- an id in both `green` and `red` → `"1 id declared both green and red: AT-016.03"`;
- an id listed twice inside `green` → `"1 id listed twice in green: AT-016.03"`.

Duplicate keys inside `red` are impossible after `JSON.parse` (last wins) and are therefore not
checkable here — noted as a known limit, not a gap I can close in this layer.

### 2c. `expectationDeviations` — D4's comparison, and the exact output lines

Runs over the report rows only; the D5 bijection already guarantees declared-set ≡ row-set, so
these are per-id status/reason comparisons plus two defensive cases.

| Condition | Emitted line (`<id>` always first, so every case's assertion can key on the id) |
|---|---|
| declared green, reported red | `AT-016.05 — declared green, reported red: <detail>` |
| declared red, reported green | `AT-016.07 — declared red ("H3 fault injection"), reported GREEN. If this id genuinely works now, update the declaration in this same change.` |
| declared red, reported red, detail does not contain the reason | `AT-016.11 — declared red for "H5 email provider simulator", reported red for a different reason: <detail>` |
| row status `missing` | `AT-016.09 — no result was reported for this id` (defensive: `analyzeReportedTests` cannot currently emit `missing`, but `IdRow` permits it) |
| id in `unexpected` | `AT-016.99 — registered but not a P0 of this requirement` (D4's "no unexpected id is registered") |
| declared id with no row / row with no declaration | `AT-016.04 — declared but not reported` / `— reported but not declared` (defensive; unreachable after 2b) |

Reason matching is `detail.includes(reason)` — **case-sensitive substring**, brief D3, no
trimming, no normalisation, no regex.

---

## 3. `runner.ts` — exactly how `--expect` threads through

Three edits. Nothing else in the file moves.

**(a) Argument parsing.** `Args` gains `expectDeclared: boolean` (named that, not `expect`, so
nobody later reads it as vitest's `expect`; `runner.ts` imports no vitest). One new branch in the
existing loop:

```ts
else if (arg === '--expect') expectDeclared = true;
```

placed beside `--wired`. `USAGE` becomes
`'usage: bun run at:verify req-0NN --tier <loop|integration|drill> [--wired] [--expect]'`.
Before editing I will grep the selftests for `USAGE`/`usage:` to confirm no existing test asserts
that string (`runner.selftest.ts` currently asserts none — it tests `childEnv`, `runVerdict`,
`localStackProblems`, `redact`, the lock race, `cleanupRun`, migrations).

`--wired` keeps precedence: it returns 3 before anything else, so `--expect --wired` is still
exit 3. *Silent-point call, flagged* — the brief does not combine them, and `--wired` refusing
first is the existing shape.

**(b) The declaration preflight — after the bijection preflight, BEFORE vitest spawns.**
This placement is forced: D5's fourth refusal needs `preflight.expected` (the acceptance P0 id
set), which only exists after `inspectBijection`; and every D5 refusal must run *no tests*, so it
must precede the `spawnSync`. Inserted immediately after the existing preflight block and before
`const infra = …`:

```ts
let expectation: TierExpectation | null = null;
if (expectDeclared) {
  try {
    expectation = loadTierExpectation(requirement, tier, expected);
  } catch (err) {
    console.error(`at:verify req-${requirement} --tier ${tier} --expect — DECLARATION REFUSED: ${(err as Error).message}`);
    console.error(`No tests were run. The declaration is the contract; fix ${expectedManifestPath(requirement)}.`);
    return 2;
  }
}
```

Exit 2 matches the file's existing meaning for "the run was refused before it started" (bad args,
no suite, preflight refused) and is what D5 requires. The bijection preflight still wins when both
are wrong: it runs first and returns 2 for its own reason.

Note the ordering consequence at the non-loop tiers: the declaration is checked *before* the stack
lock, Docker, and the reset, so a bad declaration never starts a database. That is the right way
round and costs nothing.

**(c) The verdict branch — replacing the last five lines of `main`'s `try`.**

```ts
if (!expectation) {
  const verdict = runVerdict(rows, unexpected, run as ProcessOutcome);      // unchanged path
  if (verdict.length === 0) return 0;
  for (const problem of verdict) console.log(`  FAILURE: ${problem}`);
  return 1;
}

const deviations = expectationDeviations(rows, unexpected, expectation);
/* + the process-level checks of OQ1, once ruled */
if (deviations.length === 0) {
  console.log(
    `  EXPECTED: the run matches ${expectedManifestPath(requirement)} exactly ` +
      `(${expectation.green.length} declared green, ${Object.keys(expectation.red).length} declared red)`,
  );
  return 0;
}
for (const deviation of deviations) console.log(`  DEVIATION: ${deviation}`);
console.log(
  `  EXPECT FAILURE: ${deviations.length} deviation(s) from the declaration. A red that turned green is a ` +
    `failure too — if reality improved, update the declaration in the same change.`,
);
return 1;
```

**D6 is satisfied structurally, not by testing:** when `--expect` is absent, `expectation` is
`null`, the `if (!expectation)` branch is byte-identical to today's code, `runVerdict` is called
with the same arguments, and the per-id table above it is untouched. The only unconditional change
in the whole file is the `USAGE` string. `runVerdict` itself is **not modified** — see OQ1.

---

## 4. `tests/at/expected/req-016.json` — the D9 declaration

Reasons are derived from the raw details in section 0, per D9's "read the actual reported details
first; do not invent wording". Note the brief's own D9 parenthetical writes AT-016.01's reasons
slash-separated (`H3 static provider scan / H3 sentinels / …`) while the runner actually prints
them comma-separated; the slash form is **not** a substring of the real detail, so D9's
derive-from-reality instruction governs and I use the comma form. Flagging the reconciliation
rather than silently picking one.

All reasons are **ASCII only** — deliberately stopping before the em dash in
`CAPABILITY PENDING —`, so the file carries no non-ASCII byte and no encoding hazard.

```json
{
  "requirement": "016",
  "tiers": {
    "loop": {
      "green": [
        "AT-016.02", "AT-016.03", "AT-016.04", "AT-016.05",
        "AT-016.06", "AT-016.08", "AT-016.10", "AT-016.12"
      ],
      "red": {
        "AT-016.01": "H3 static provider scan, H3 sentinels, H5 email provider simulator",
        "AT-016.07": "H3 fault injection",
        "AT-016.09": "H3 fault injection",
        "AT-016.11": "H5 email provider simulator"
      }
    }
  }
}
```

Only the `loop` tier is declared. Per D2 that means `--tier integration --expect` exits 2 ("no
declaration for this tier"), which is correct: nobody has established what integration should
look like, and the loop tier is the only tier this item may run.

---

## 5. The seven conformance tests (D8) — `tests/at/harness/runner-expect.selftest.ts`

Same technique as `runner-blackbox.selftest.ts`, verified working by the probe in section 0:
plant a complete disposable tree under `tmpdir()`, point the REAL runner at it with
`AT_REPO_ROOT`, assert exit code and printed output, remove the tree (with the same
one-retry Windows unlink dance). `node_modules` still resolves from `INSTALL_ROOT`, so the child
runs the pinned vitest and the fixture suite imports the REAL registry by absolute file URL.
Every case runs at the **loop tier** — no lock, no Docker, no database.

The helper is local to this file:

```ts
interface ExpectTree {
  requirement: string;
  acceptance: string;
  files: Record<string, string>;
  /** raw text written to <tree>/tests/at/expected/req-<NNN>.json; omit to plant no manifest */
  manifest?: string;
  /** pass --expect to the runner */
  expect: boolean;
}
function runExpectTree(spec: ExpectTree): RunnerOutcome;   // {status, stdout, stderr, output, row()}
```

The manifest is written under the **tree**, not the checkout — which is exactly why
`expectedManifestPath` resolves from `REPO_ROOT` (the `AT_REPO_ROOT`-overridable data root) and
not `INSTALL_ROOT`. That is a hard constraint on section 2, not a preference.

Every case uses the same two-id suite shape, so the only variable between cases is the
declaration:

- `AT-9NN.01` — opens a world, asserts `ping() === 'pong'` → **green**;
- `AT-9NN.02` — opens a world, asserts `ping() === 'pong'`, then
  `throw new Error('CAPABILITY PENDING — H9 imaginary capability')` → **red** with the
  deterministic detail `Error: CAPABILITY PENDING — H9 imaginary capability` (probed, section 0).
  Opening and asserting first is not decoration: it satisfies the registry's
  `expect.hasAssertions()` and its never-opened guard, so the red is the thrown message and not a
  harness complaint.

Requirement numbers 910–916 — distinct from the existing black-box file's 901–906 so a failing
report is unambiguous about which file produced it. (No collision is possible anyway: each case
spawns its own child process against its own tree.)

| # | D8 case | req | Tree | `--expect` | Assertion |
|---|---|---|---|---|---|
| 1 | declaration matches reality | 910 | .01 green, .02 red | yes | `status === 0`; stdout contains `EXPECTED: the run matches`; stdout contains no `DEVIATION:` |
| 2 | a declared red is actually green | 911 | **both ids green** (.02's body does not throw), manifest declares .02 red with reason `H9 imaginary capability` | yes | `status === 1`; output contains `AT-911.02` and `reported GREEN`; output contains `update the declaration` |
| 3 | a declared green is actually red | 912 | .01 green, .02 red; manifest declares **both** green, `red: {}` | yes | `status === 1`; output contains `AT-912.02` and `declared green, reported red` |
| 4 | a red reports a different reason | 913 | .01 green, .02 red (throws `H9 imaginary capability`); manifest declares .02 red with reason `H4 a different capability` | yes | `status === 1`; output contains `AT-913.02` and `a different reason`; and contains the declared reason `H4 a different capability` so the message says what was expected |
| 5 | manifest missing | 914 | .01 green, .02 red; **no manifest file planted** | yes | `status === 2`; stderr contains `DECLARATION REFUSED`; stderr contains `req-914.json`; **stdout contains no `at:verify req-914 --tier loop` report table** — proving no tests ran |
| 6 | manifest omits a listed id | 915 | acceptance lists .01 and .02; manifest declares only .01 green | yes | `status === 2`; stderr contains `DECLARATION REFUSED` and `AT-915.02`; no report table |
| 7 | control, no `--expect` | 916 | **byte-identical tree and manifest to case 1** | no | `status === 1` (today's behaviour: one id red); stdout contains `FAILURE: 1 id red`; stdout contains neither `DEVIATION:` nor `EXPECTED:` nor `DECLARATION` |

Case 7 is a genuine control precisely because its tree is case 1's: the same tree exits 0 with the
flag and 1 without it, so the pair proves the flag is doing the work and D6 holds on the same
input.

Cases 2 and 3 each need their own manifest text written by hand rather than generated, so a bug in
a shared generator cannot make a case pass by agreeing with itself.

Cost: seven more spawned vitest runs. The existing six black-box cases contribute most of the
current 3.2s selftest wall time; expect roughly a doubling, to ~7-10s. Acceptable, but named so it
is not a surprise.

---

## 6. `tests/at/expected/README.md` (W4)

Short, three sections, no new policy invented: (1) what a declaration is and that `--expect`
refuses rather than passes when one is missing, absent for the tier, malformed, or not in
bijection with the acceptance file; (2) why a red turning green is a FAILURE — the declaration is
the contract, so improving reality means updating the contract in the same change, and without
that rule the gate cannot tell improvement from drift; (3) how to update one — run
`bun run at:verify req-0NN --tier loop`, read the actual reported details, move the id and write
the reason as the short capability names that actually appear in the detail, commit both together.

---

## 7. Commits

One per work item, in this order, each with the trailer:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014CNrNUNMPmUkUcrPab9fQR
```

0. `hardening-expect: execution plan` — this file (this turn).
1. `hardening-expect: expected-state manifest reader + the REQ-016 declaration` (W1).
2. `hardening-expect: at:verify --expect` (W2).
3. `hardening-expect: seven black-box conformance cases for --expect` (W3).
4. `hardening-expect: how to read and update an expected-state declaration` (W4).

No Linear id is cited: the brief records the board item as an open deferral because Linear was
down when it was authored. Never pushed, no PR — the orchestrator owns that.

---

## 8. Verification — what I will run and report raw

The brief's seven, plus two of my own:

1. `bunx tsc --noEmit --pretty false` → exit 0. **See OQ2 — this is currently vacuous for
   `tests/at/**`.**
2. `bun run at:selftest` → all pass (the existing 42, the 7 new conformance cases, and the unit
   tests of 1a unless struck).
3. `bun run at:check req-016` → 12 P0 ids in bijection.
4. `bun run at:verify req-016 --tier loop` → **unchanged**: the same 12-row table, 8 green,
   4 red, exit 1, and the two `FAILURE:` lines verbatim as in section 0. Diffed against the
   capture above, not eyeballed.
5. `bun run at:verify req-016 --tier loop --expect` → **exit 0** with the `EXPECTED:` line.
6. `git diff --check` → clean.
7. `git status --porcelain` → only `tests/at/**` and `loop/items/hardening-expect/**`.
8. (mine) `bun run at:verify req-016 --tier integration --expect` → exit 2, "no declaration for
   this tier", **before any lock or Docker call**. Safe at the loop tier's rules because the
   refusal happens before the stack sequence — but I will confirm that from the code path first
   and will NOT run it if there is any chance it reaches `readLocalConfig`/`acquireStackLock`.
   If in doubt this becomes a unit assertion instead of a live run.
9. (mine) a deliberate one-line temporary edit to `req-016.json` (flip AT-016.07 to green),
   `--expect` → exit 1 naming AT-016.07, then revert. Proves the gate bites on the real
   requirement, not only on fixtures. The revert is verified with `git status`.

---

## 9. OPEN QUESTIONS — I am not deciding these

### OQ1 (blocking W2) — `--expect` can currently exit 0 on a run that failed outside the assertions

D4 lists four conditions, all of them about id status and reasons. None mentions the vitest
process's own exit. But `runVerdict` exists in this file precisely because of that gap, in its own
words: *"A vitest process can report twelve green assertions and still exit non-zero — a global
teardown that threw, an unhandled rejection, a worker that died after its last test. Treating that
as success is exactly the false green this harness exists to prevent."*

Under `--expect` with declared reds, vitest **necessarily** exits non-zero, so the exit code stops
carrying information, and a teardown crash hides behind an expected failure. Implemented exactly
as D4 is written, `bun run at:verify req-016 --tier loop --expect` would return 0 for a run whose
test process died in global teardown — reintroducing, inside the new gate, the failure mode the
old gate was built to catch.

**Proposed resolution** — add three process-level deviations that do not require distinguishing
the indistinguishable:

- (a) `run.error` (the test process could not be launched) is always a deviation;
- (b) declared `red` is **empty** and the process exited non-zero → deviation (this is exactly
  `runVerdict`'s existing rule, unchanged);
- (c) declared `red` is **non-empty** and the process exited **zero** → deviation: the report and
  the process contradict each other.

Residual hole, stated plainly: declared reds non-empty **and** exit non-zero — a teardown crash
there is still invisible.

**Alternatives weighed.** (i) Implement D4 literally and accept the hole — smallest diff, but it
puts a known false-green inside the artefact whose entire purpose is to remove one. (ii) Close the
hole properly by comparing the vitest report's own failed-assertion count against the declared red
count, so any failure beyond the declared ones is a deviation — this is the technically right
answer, but it reads report state D4 does not mention and is a bigger change than the brief
authorises. I lean (ii) folded into the proposal, but I will implement whatever is ruled and
nothing until then.

### OQ2 (affects the evidence, not the code) — verification step 1 does not check any of this item's code

`tsconfig.json` `include` is `["src/**/*.ts", "src/**/*.tsx", "vite.config.ts", "eslint.config.js"]`.
`tests/at/**` is outside it, so `bunx tsc --noEmit` typechecks **none** of the harness — it will
exit 0 whatever I write. D7 forbids fixing that here (AI4DEV-24 owns `tsconfig`).

**Proposed resolution:** run the brief's command as required *and* additionally run a one-off,
config-free check over the harness as extra evidence, creating no file and changing no config:

```
bunx tsc --noEmit --pretty false --strict --target es2022 --module esnext \
  --moduleResolution bundler --allowImportingTsExtensions --types node \
  tests/at/harness/*.ts
```

**Risk this raises, needing a ruling:** that check may surface **pre-existing** type errors in
files this item does not touch. Fixing them is out of scope (D7 / surgical-changes); reporting
them and proceeding is my proposal, but "does a pre-existing error block this item" is a judgment
call I will not make.

### OQ3 (small, but it touches D6) — duplicate the tree-planting helper, or share it?

D8 says "follow the existing pattern in `runner-blackbox.selftest.ts`". Following it means the new
file carries a near-duplicate of `runAgainstTree` (~40 lines) differing only by the manifest and
the flag. The tidier move — extract the helper into a shared module and have both files import it
— edits an existing selftest file, and D6 says "no existing selftest may change".

**Proposed resolution:** duplicate; do not touch `runner-blackbox.selftest.ts`. I read D6 as
protecting those tests' behaviour *and* their bytes, and a duplicated 40-line fixture helper is a
cheap price for not perturbing the file that guards the runner's assembly. The plan above assumes
this. If ruled the other way, the change is confined to one new `harness/blackbox-tree.ts` plus a
one-line import swap in the existing file, with every assertion in it unchanged.

### OQ4 (known limitation, no action proposed) — a redacted detail can never match a reason

`firstLine` runs `redact()`, which rewrites any 40+ character run of `[A-Za-z0-9_-]` to
`<redacted-token>`. If a future red's reason ever fell inside such a run, no declared reason could
match it and the id would be permanently undeclarable. None of REQ-016's four reds is affected
(every detail contains spaces). Naming it so it is on the record, not proposing a change.

### OQ5 (scope note, no action proposed) — the integration path is unexercised

`--expect` is tier-agnostic by construction, but the loop tier is the only tier this item may run,
so every conformance case is a loop-tier case and the integration path ships untested by anything
but the "tier absent → exit 2" refusal (verification step 8). Deliberate consequence of the
database-free loop rule; recorded, not worked around.

### OQ6 (recorded, already a named deferral in the brief) — no Linear id

Commits will cite `hardening-expect` only. The brief already records this as a deferral to be
filed and linked before the merge ruling; I am not filing it.

---

## 10. Critique dispositions

*(Empty until the adversarial review returns. Every finding gets a row here: what it said, whether
the brief already decides it, and what was done.)*

| # | Finding | Disposition |
|---|---|---|
| — | — | — |
