# EXECUTION PLAN — expected-state manifest + `at:verify --expect`

Board item: **AI4DEV-25** (filed 2026-07-31). Item `hardening-expect` (hardening 1 of 3).
Worktree `C:\Users\nirdr\Downloads\ai4good-expect`, branch `nirdrang/at-verify-expect`.
Authority, in order: `brief.md` → `rulings-01.md` (R1..R7) → `rulings-02.md` (R8..R11).
Status: **plan only — nothing implemented.** Every decision below is either forced by the
authority chain, or is a small silent-point call I made and flagged, or is the one point I
refuse to decide (section 9, OP1).

**Revision 2 (this pass) folds the Gate 1 critique.** Three rulings change the design rather
than merely confirming it, and they are already applied throughout the sections below:
**R8** makes D4a concrete against the reporter's real fields (section 2d, 3c);
**R9 REPLACES D3** — declared reds are now typed objects matched by exact shape, not
substrings (sections 2, 2a, 2c, 4, 5); **R10** puts the "an author can launder a regression
into a declared red" problem outside this item, as a README warning plus a filed follow-up.
Section 10 records the disposition of all seven findings; section 11 lists the deferrals the
orchestrator files.

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
redacted. A thrown error with a controlled message therefore gives a **deterministic** detail
string, which is what conformance cases 1–4 need.

### 0a. Ground truth added in revision 2 (for R8 and R9)

**(i) The report's own totals for the real REQ-016 loop run.** I ran the same vitest invocation
the runner spawns (`--reporter=json --outputFile=…`, `AT_TIER=loop`, suite `suites/req-016/`) and
read the top-level fields. They are exactly the thirteen R8 names, and their values are:

```
numTotalTestSuites=8 numPassedTestSuites=2 numFailedTestSuites=6 numPendingTestSuites=0
numTotalTests=12 numPassedTests=8 numFailedTests=4 numPendingTests=0 numTodoTests=0 success=False
```

So R8's six conditions hold on the real declaration today: 4 failed = 4 declared red, 8 passed =
8 declared green, 12 total = 8 + 4, 0 pending, 0 todo, `success === false` with reds declared.
There is **no** unhandled-errors field — codex's claim confirmed a second time, from the report
itself. Note also that the *suite* counts do not line up with anything id-shaped (8 "test suites"
over 4 files, 6 of them failed for 4 failing tests), which is why the accounting in 2d uses the
**test** counts only and ignores the suite counts entirely.

**(ii) The four red details, verbatim from `failureMessages`** — these are the shapes R9's typed
declarations must reproduce exactly:

```
AT-016.01  CapabilityPending: CAPABILITY PENDING — H3 static provider scan, H3 sentinels, H5 email provider simulator
AT-016.07  CapabilityPending: CAPABILITY PENDING — H3 fault injection and process restart
AT-016.09  CapabilityPending: CAPABILITY PENDING — H3 fault injection and process restart
AT-016.11  CapabilityPending: CAPABILITY PENDING — H5 email provider simulator
```

Two facts that only show up by looking: AT-016.07/.09 carry **one** capability name that happens
to contain the word "and" (`H3 fault injection and process restart`), not two names — so their
declared array has a single element; and the separator in every one of these is U+2014 EM DASH,
confirmed by codepoint in `capabilities.ts`, in `registry.ts`, and in the report.

**(iii) The config-free typecheck baseline** (R2, and F5's request that baseline and introduced
diagnostics be separated). Run over every `tests/at/harness/*.ts` with an explicit,
PowerShell-safe file list — command in section 8 — the tree today emits exactly three errors,
all in `registry.ts`, none in any file this item touches:

```
tests/at/harness/registry.ts(175,48): error TS2344: Type 'W' does not satisfy the constraint 'WorldLike'.
tests/at/harness/registry.ts(495,37): error TS2344: Type 'W' does not satisfy the constraint 'WorldLike'.
tests/at/harness/registry.ts(519,66): error TS2345: Argument of type 'AtTestBody<Sut, W>' is not assignable to parameter of type 'AtTestBody<Sut, WorldLike>'.
```

That makes the separation mechanical rather than a judgment call: these three lines are the
baseline (AI4DEV-24's inheritance, out of scope by D7), and **any other line is introduced by
this item and blocks it.**

**(iv) No existing selftest asserts the `USAGE` string or exercises `--wired`** (grepped:
`USAGE`/`usage:`/`--wired` appear only in `runner.ts`, `check.ts` and two registry comments). So
the USAGE-line edit and the new `--expect --wired` refusal in section 3(a) cannot perturb D6.

---

## 1. Files — the complete list, nothing else is touched

**Created**

| Path | Work item | What it is |
|---|---|---|
| `tests/at/harness/expected.ts` | W1 | manifest reader + the pure comparison functions |
| `tests/at/expected/req-016.json` | W1 | the REQ-016 declaration (D9) |
| `tests/at/harness/expected.selftest.ts` | W1 | unit tests for the pure functions (see 1a) |
| `tests/at/harness/runner-expect.selftest.ts` | W3 | the seven black-box conformance cases of D8, plus the two of section 5a |
| `tests/at/expected/README.md` | W4 | what the manifest is, why red→green is a failure, how to update |

**Modified**

| Path | Work item | Change |
|---|---|---|
| `tests/at/harness/runner.ts` | W2 | `--expect` flag, `--expect --wired` usage refusal, declaration preflight, report-totals fields on the `VitestJson` interface, verdict branch, USAGE line |
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
I plan ~10 small unit tests in `expected.selftest.ts`: parse rejects a non-object, rejects a red
value that is not an object, rejects an unknown `kind`, rejects an empty `capabilities` array,
rejects an unknown `phase`; the bijection check catches an undeclared P0 id and an extra declared
id; the comparison catches each deviation kind; and — the two that matter most after R9 — the
`capability-pending` matcher accepts the exact line and rejects
`Error: H3 fault injection: fixture reset failed`, and the `pending` matcher accepts the declared
phase and rejects a different one. The `pending` kind is exercised **only** here: no REQ-016 red
uses it (all four are `capability-pending`), so without these unit tests it would ship with no
coverage at all.

The brief mandates only D8's seven black-box cases. If the orchestrator considers this file beyond
scope, deleting it removes it with no other change — but the two R9 matcher tests above would then
have no home, and the R9 hole would ship unproven at the unit level. Brief verification item 2 says
"the existing 42 plus the new conformance tests"; these extra tests make the count higher than that
phrasing implies — flagging so the number is not read as a discrepancy later.

---

## 2. `tests/at/harness/expected.ts` — module boundary and exact signatures

Placed in `harness/` beside `check.ts` because it is harness plumbing, not a test. It imports
`REPO_ROOT` from `check.ts` — the runtime dependency runs `runner.ts → expected.ts → check.ts`,
one direction, no cycle.

**Revision 2, per R11/F7: the row type is `Pick<IdRow, 'id' | 'status' | 'detail'>` behind a
type-only import**, not the hand-rolled duplicate revision 1 proposed. `import type` is erased at
compile time, so it creates no runtime cycle back into `runner.ts`, and it keeps `status` the
closed union `'green' | 'red' | 'missing'` instead of widening it to `string` — which is codex's
point: a future fourth status would then be a compile error here rather than a silent drift. The
`Pick` (rather than importing `IdRow` whole) states which three fields this module actually
consumes. `PendingPhase` is imported the same way, type-only, from `registry.ts`.

```ts
import type { IdRow } from './runner.ts';
import type { PendingPhase } from './registry.ts';

/** A red we can describe exactly. Any other detail shape is undeclarable, and so a failure (R9). */
export type RedDeclaration =
  | { kind: 'capability-pending'; capabilities: string[] }
  | { kind: 'pending'; phase: PendingPhase };

/** One tier's declaration. */
export interface TierExpectation {
  green: string[];
  red: Record<string, RedDeclaration>;
}

export interface ExpectedManifest {
  requirement: string;
  tiers: Record<string, TierExpectation>;
}

/** Exactly the three fields this module reads off a runner report row. */
export type ReportedRow = Pick<IdRow, 'id' | 'status' | 'detail'>;

/** The report's own arithmetic, as the JSON reporter really emits it (R8). Unknown = unvalidated. */
export interface ReportTotals {
  numTotalTests?: unknown;
  numPassedTests?: unknown;
  numFailedTests?: unknown;
  numPendingTests?: unknown;
  numTodoTests?: unknown;
  success?: unknown;
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

/**
 * The text a declared red MUST produce, rebuilt from the declaration. PURE.
 * `capability-pending` → the whole first line; `pending` → the anchored prefix (section 9, OP1).
 */
export function declaredDetail(atId: string, red: RedDeclaration): string;

/** Does this reported detail carry exactly the declared shape? PURE. See 2c. */
export function detailMatches(atId: string, red: RedDeclaration, detail: string): boolean;

/** D4: every way the run deviates from the declaration, one line per offending id. PURE. */
export function expectationDeviations(
  rows: ReportedRow[],
  unexpected: string[],
  expectation: TierExpectation,
): string[];

/** D4a/R8: every way the RUN ITSELF is not fully accounted for by the declaration. PURE. */
export function reportAccountingDeviations(
  totals: ReportTotals,
  run: { error?: unknown; status: number | null; signal?: NodeJS.Signals | null },
  expectation: TierExpectation,
): string[];

/** The only I/O. Throws with a distinguishable message when the file is absent. */
export function loadTierExpectation(
  requirement: string,
  tier: string,
  acceptanceIds: string[],
): TierExpectation;
```

`loadTierExpectation` is the single call the runner makes before the run; it performs, in order,
all four D5 refusals — read (ENOENT → "no declaration"), parse/validate, tier lookup, bijection —
and throws on the first. Every other exported function is pure and directly unit-testable.

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
   not a plain object.
7. **a red's value is not a well-formed `RedDeclaration`** (R9). Each sub-rule refuses with the
   id named:
   - the value is not a plain object (this is where revision 1's bare-string reasons now land — a
     manifest written against the old D3 schema is refused loudly, never silently reinterpreted);
   - `kind` is missing or is not `"capability-pending"` or `"pending"`;
   - `kind: "capability-pending"` and `capabilities` is not a non-empty array of non-empty
     strings. Non-empty is load-bearing for the same reason revision 1's empty-reason rule was: an
     empty list would declare the line `CapabilityPending: CAPABILITY PENDING — `, which no real
     failure produces, so it could never match — a permanently-red declaration is a mistake worth
     catching at parse time rather than at comparison time;
   - `kind: "pending"` and `phase` is not one of `harness-missing` / `sut-missing` / `tier-unset`.
     The runtime list is written out and pinned to the type with
     `satisfies readonly PendingPhase[]`, so a phase renamed in `registry.ts` becomes a compile
     error here instead of a declaration that can never match.
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

### 2c. Matching a declared red — R9's replacement for D3

**D3 is gone.** A declared red is no longer a substring to look for; it is a shape to reproduce.
`declaredDetail(atId, red)` rebuilds the exact first line the harness prints, and the comparison
is equality (or, for one shape, an anchored prefix — see the flagged point below), never
`includes`.

| kind | Rebuilt line | Match |
|---|---|---|
| `capability-pending` | `` `CapabilityPending: CAPABILITY PENDING — ${capabilities.join(', ')}` `` | **whole-line equality** with `row.detail` |
| `pending` | `` `AtPending: ${atId} PENDING [${phase}] — ` `` | **anchored prefix** — `row.detail.startsWith(line)` |

Both literals are derived from source that this item may only read: `CapabilityPending`'s
constructor in `capabilities.ts` (`CAPABILITY PENDING — ${capabilities.join(', ')}`, `name =
'CapabilityPending'`) and `AtPending`'s in `registry.ts` (`${atId} PENDING [${phase}] —
${detail}`, `name = 'AtPending'`), plus vitest's `"<name>: <message>"` serialisation, which
section 0a(ii) confirms against a real report. The separator is U+2014, verified by codepoint.

**Why the literal rather than importing the error classes and asking them.** Constructing a
`CapabilityPending` to derive the string would track a change in the harness's wording silently.
R9 chose the opposite direction on purpose: the coupling to message text is a **known, accepted
trade-off**, and if the text changes, declarations should break loudly with a clear diff rather
than keep passing. The literals therefore live in `expected.ts` with a comment naming
`capabilities.ts` / `registry.ts` as the source they mirror, and the follow-up in section 11
(machine-readable capability codes) is the real long-term fix. *Silent-point call, flagged.*

This kills codex's scenario outright: `Error: H3 fault injection: fixture reset failed` does not
begin `CapabilityPending: `, so a new harness defect cannot satisfy a declaration that names a
pending capability. It also means a red arriving through a wrapper — an `EvidenceCapture` failure
reads `Error: evidence capture "x" produced by AT-016.NN failed — …` — is **undeclarable, and
therefore a failure**. That is R9's intent stated plainly: a red we cannot describe exactly is a
red we do not understand.

**FLAGGED, and the one thing I will not decide alone — see section 9, OP1:** for `pending` the
match is an anchored prefix, not whole-line equality, because `AtPending`'s trailing detail is
free text supplied by the throw site (and for `harness-missing` it embeds a machine-specific
module-resolution error, so no declaration could ever reproduce it). Everything the declaration
determines — the error class name, the id, the phase in brackets — is still matched exactly and
anchored at position 0.

### 2c-bis. `expectationDeviations` — D4's per-id comparison, and the exact output lines

Runs over the report rows only; the D5 bijection already guarantees declared-set ≡ row-set, so
these are per-id status/detail comparisons plus two defensive cases.

| Condition | Emitted line (`<id>` always first, so every case's assertion can key on the id) |
|---|---|
| declared green, reported red | `AT-016.05 — declared green, reported red: <detail>` |
| declared red, reported green | `AT-016.07 — declared red (capability-pending: H3 fault injection and process restart), reported GREEN. If this id genuinely works now, update the declaration in this same change.` |
| declared red, reported red, detail does not carry the declared shape | `AT-016.11 — declared red as capability-pending, reported a red of a different shape. expected: "CapabilityPending: CAPABILITY PENDING — H5 email provider simulator" actual: "<detail>"` |
| row status `missing` | `AT-016.09 — no result was reported for this id` (defensive: `analyzeReportedTests` cannot currently emit `missing`, but `IdRow` permits it) |
| id in `unexpected` | `AT-016.99 — registered but not a P0 of this requirement` (D4's "no unexpected id is registered") |
| declared id with no row / row with no declaration | `AT-016.04 — declared but not reported` / `— reported but not declared` (defensive; unreachable after 2b) |

Printing both the expected and the actual line on a shape mismatch is not decoration: under exact
matching that diff IS the diagnosis, and without it an author sees only "different" and has to
re-run the suite to find out how.

### 2d. `reportAccountingDeviations` — D4a made concrete (R8)

R1 set the principle — *every non-zero exit must be fully accounted for by the declaration;
anything unaccounted for is a failure* — and R8 fixes exactly which fields carry that accounting,
against the reporter's real output (section 0a(i)). Nothing here is invented: every field used
appears in a report I read. **No custom reporter** — that is scope growth and D7 stands.

Let `G` = `expectation.green.length` and `R` = `Object.keys(expectation.red).length`. All of the
following must hold, each producing its own named deviation line when it does not:

1. `run.error` is absent — a launch failure always fails, whatever the declaration says (R8#5).
   Line: `the test process could not be launched (<code>): <redacted message>`.
2. each of `numTotalTests`, `numPassedTests`, `numFailedTests`, `numPendingTests`, `numTodoTests`
   is a **number**, and `success` is a **boolean**. A missing or non-numeric field means the
   accounting cannot be performed, and under `--expect` that must fail rather than be skipped.
   Line names the field.
3. `numFailedTests === R` (R8#1) — line:
   `the report counts N failed tests but the declaration declares R reds; a failure outside the
   declared ids (an untagged test, a failing hook) looks exactly like this`.
4. `numPassedTests === G` (R8#2).
5. `numTotalTests === G + R` (R8#3) — no extra test ran.
6. `numPendingTests === 0` and `numTodoTests === 0` (R8#4) — a skip must never hide inside a
   declared red.
7. `success === (R === 0)`. Both directions matter and both are already ruled: `success === true`
   with reds declared is R8#6 (vitest should have reported those failures, so a clean run means
   the suite did not do what the declaration says); `success === false` with **no** red declared
   is the report-level half of R1's rule 2, which R8 does not repeal.
8. if `R === 0`, `run.status === 0` — the process-level half of R1's rule 2, i.e. today's rule
   unchanged for a declaration that expects a clean run.

Conditions 3–6 close codex's concrete scenario (a declared-red-matching pair of rows plus an
untagged failing `it()`): the extra failure is invisible to the id parser but moves
`numFailedTests` and `numTotalTests` off their declared counts, and the run fails. Conformance
case 8 (section 5) proves it end to end.

**The residual gap, named not hidden (R8).** When `R > 0` the process exit is necessarily
non-zero, so a failure that fails no test and is not serialised into the JSON — an unhandled
rejection, a hook error attributed to nothing — remains invisible to `--expect`. It is partly
covered elsewhere (AI4DEV-26 puts raw vitest output in front of CI), it is stated plainly in the
README, and section 11 files the reporter-side envelope that would close it. It is **not** closed
here.

---

## 3. `runner.ts` — exactly how `--expect` threads through

Four edits (revision 2 adds the `VitestJson` fields). Nothing else in the file moves.

**(a) Argument parsing.** `Args` gains `expectDeclared: boolean` (named that, not `expect`, so
nobody later reads it as vitest's `expect`; `runner.ts` imports no vitest). One new branch in the
existing loop:

```ts
else if (arg === '--expect') expectDeclared = true;
```

placed beside `--wired`. `USAGE` becomes
`'usage: bun run at:verify req-0NN --tier <loop|integration|drill> [--wired] [--expect]'`.
Already checked (section 0a(iv)): no existing selftest asserts that string — `runner.selftest.ts`
tests `childEnv`, `runVerdict`, `localStackProblems`, `redact`, the lock race, `cleanupRun` and
migrations, and none of them passes `--wired`.

**Revision 2, per R11/F4 — `--expect --wired` is now a usage error, exit 2.** `parseArgs` throws
`"--expect and --wired cannot be combined: --wired runs no tests, so there is no report for a
declaration to be checked against"`, which the existing catch turns into exit 2 plus the USAGE
line. Codex's finding is right: as revision 1 had it, `--expect --wired` with a missing or
malformed manifest exited 3, and D5 requires every `--expect` command shape that cannot be
honoured to refuse at exit 2. Of codex's two remedies I take the first — reject the combination —
because the second (run the declaration preflight before the `--wired` refusal) would make a
command that can never produce a report still do manifest I/O and a bijection check, which is
work with no possible consumer. Plain `--wired` alone is completely unchanged, still exit 3, and
no test asserts otherwise.

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

**(b-bis) The report-totals fields on `VitestJson`.** The interface currently declares only
`testResults`. It gains the six fields 2d reads, all optional and typed as the reporter really
emits them:

```ts
interface VitestJson {
  testResults?: { assertionResults?: AssertionResult[] }[];
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  numTodoTests?: number;
  success?: boolean;
}
```

Optional because the interface describes someone else's JSON: declaring them required would be a
type-level assertion about a file on disk. 2d validates them at runtime instead, and a missing
field is a deviation, never a skipped check. Nothing outside the `--expect` branch reads them, so
the default path is untouched.

**(c) The verdict branch — replacing the last five lines of `main`'s `try`.**

```ts
if (!expectation) {
  const verdict = runVerdict(rows, unexpected, run as ProcessOutcome);      // unchanged path
  if (verdict.length === 0) return 0;
  for (const problem of verdict) console.log(`  FAILURE: ${problem}`);
  return 1;
}

const deviations = [
  ...expectationDeviations(rows, unexpected, expectation),
  ...reportAccountingDeviations(report, run as ProcessOutcome, expectation),
];
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

Both deviation sets are computed and printed together rather than short-circuiting: an id-level
and a report-level problem in the same run are two facts an author needs at once, and printing
only the first would cost a second run to find the second.

**D6 is satisfied structurally, not by testing:** when `--expect` is absent, `expectation` is
`null`, the `if (!expectation)` branch is byte-identical to today's code, `runVerdict` is called
with the same arguments, and the per-id table above it is untouched. The only unconditional
changes in the whole file are the `USAGE` string and six optional fields on an interface.
`runVerdict` itself is **not modified**: R8's accounting is additive and lives in `expected.ts`,
so the default path's verdict logic is not touched at all.

---

## 4. `tests/at/expected/req-016.json` — the D9 declaration

**Revision 2: the typed form R9 mandates.** Capability names are lifted verbatim out of the real
details captured in section 0a(ii), per D9's "read the actual reported details first; do not
invent wording".

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
        "AT-016.01": {
          "kind": "capability-pending",
          "capabilities": ["H3 static provider scan", "H3 sentinels", "H5 email provider simulator"]
        },
        "AT-016.07": {
          "kind": "capability-pending",
          "capabilities": ["H3 fault injection and process restart"]
        },
        "AT-016.09": {
          "kind": "capability-pending",
          "capabilities": ["H3 fault injection and process restart"]
        },
        "AT-016.11": {
          "kind": "capability-pending",
          "capabilities": ["H5 email provider simulator"]
        }
      }
    }
  }
}
```

Three things the typed form settles that revision 1 had to reason about:

- **R7's slash-vs-comma reconciliation is now moot.** The joining is done in code with `', '`,
  so the manifest carries names and never a separator. R7's ruling still governs — derive from
  what the runner really prints — the typed form just makes the derivation mechanical.
- **AT-016.07 and .09 declare ONE capability, not two.** The real detail reads `H3 fault
  injection and process restart`: that is a single capability name that contains the word "and".
  Revision 1's shorter `H3 fault injection` worked only because a substring was enough; under
  exact matching it would fail, which is precisely the tightening R9 asked for.
- **The file stays pure ASCII.** The em dash lives in the `expected.ts` literal, not here, so
  every declaration a human writes is ASCII and carries no encoding hazard — the property
  revision 1 wanted, now achieved by construction instead of by stopping the reason short.

Only the `loop` tier is declared. Per D2 that means `--tier integration --expect` exits 2 ("no
declaration for this tier"), which is correct: nobody has established what integration should
look like, and the loop tier is the only tier this item may run.

---

## 5. The conformance tests — `tests/at/harness/runner-expect.selftest.ts`

D8's seven, plus the two of 5a that revision 2 adds.

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
- `AT-9NN.02` — opens a world, asserts `ping() === 'pong'`, then throws → **red** with a
  deterministic detail. Opening and asserting first is not decoration: it satisfies the registry's
  `expect.hasAssertions()` and its never-opened guard, so the red is the thrown message and not a
  harness complaint.

**Revision 2 — the fixture must throw the REAL `CapabilityPending`, not a plain `Error`.** Under
R9 the match is exact, so `throw new Error('CAPABILITY PENDING — …')` (revision 1's fixture) would
serialise as `Error: CAPABILITY PENDING — …` and could never equal a `capability-pending`
declaration, making case 1 impossible to pass. The fixture preamble therefore imports the real
class by absolute file URL — exactly as it already imports the real registry, and read-only, so
D7 is untouched:

```ts
import { CapabilityPending } from '<file:// URL of tests/at/harness/capabilities.ts>';
…
throw new CapabilityPending(['H9 imaginary capability']);
```

which produces the detail `CapabilityPending: CAPABILITY PENDING — H9 imaginary capability`. This
is a strictly better test than revision 1's: the conformance cases now exercise the same class the
product declarations describe, so a change to that class's message breaks these tests as loudly as
it breaks `req-016.json`.

Requirement numbers 910–917 — distinct from the existing black-box file's 901–906 so a failing
report is unambiguous about which file produced it. (No collision is possible anyway: each case
spawns its own child process against its own tree.)

Every manifest below is typed per R9; "declares .02 red" means
`{"kind":"capability-pending","capabilities":["H9 imaginary capability"]}` unless said otherwise.

| # | D8 case | req | Tree | `--expect` | Assertion |
|---|---|---|---|---|---|
| 1 | declaration matches reality | 910 | .01 green, .02 red | yes | `status === 0`; stdout contains `EXPECTED: the run matches`; stdout contains no `DEVIATION:` |
| 2 | a declared red is actually green | 911 | **both ids green** (.02's body does not throw), manifest still declares .02 red | yes | `status === 1`; output contains `AT-911.02` and `reported GREEN`; output contains `update the declaration` |
| 3 | a declared green is actually red | 912 | .01 green, .02 red; manifest declares **both** green, `red: {}` | yes | `status === 1`; output contains `AT-912.02` and `declared green, reported red` |
| 4 | a red reports a different reason | 913 | .01 green, .02 red (throws `CapabilityPending(['H9 imaginary capability'])`); manifest declares .02 with `capabilities: ["H4 a different capability"]` | yes | `status === 1`; output contains `AT-913.02` and `a red of a different shape`; and contains BOTH the expected line (with `H4 a different capability`) and the actual one (with `H9 imaginary capability`) |
| 5 | manifest missing | 914 | .01 green, .02 red; **no manifest file planted** | yes | `status === 2`; stderr contains `DECLARATION REFUSED`; stderr contains `req-914.json`; **stdout contains no `at:verify req-914 --tier loop` report table** — proving no tests ran |
| 6 | manifest omits a listed id | 915 | acceptance lists .01 and .02; manifest declares only .01 green | yes | `status === 2`; stderr contains `DECLARATION REFUSED` and `AT-915.02`; no report table |
| 7 | control, no `--expect` | 916 | **byte-identical tree and manifest to case 1** | no | `status === 1` (today's behaviour: one id red); stdout contains `FAILURE: 1 id red`; stdout contains neither `DEVIATION:` nor `EXPECTED:` nor `DECLARATION` |

Case 7 is a genuine control precisely because its tree is case 1's: the same tree exits 0 with the
flag and 1 without it, so the pair proves the flag is doing the work and D6 holds on the same
input.

Cases 2 and 3 each need their own manifest text written by hand rather than generated, so a bug in
a shared generator cannot make a case pass by agreeing with itself.

### 5a. Two cases beyond D8's seven — added in revision 2, and why

Both prove behaviour this revision **introduces**; neither is decoration, and both are strikeable
at the checkpoint if the orchestrator reads them as scope growth.

| # | What it proves | req | Tree | Assertion |
|---|---|---|---|---|
| 8 | **R8's accounting bites** — the Gate 1 blocker's own scenario | 917 | .01 green, .02 red, PLUS an untagged `it('a failure no id claims', …)` that fails; manifest declares .01 green and .02 red, so **every per-id comparison passes** | `status === 1`; output contains the count-mismatch line naming `2` failed against `1` declared red. Without 2d this tree exits **0** — that is the false green codex found, and this case is the proof it is gone. (The untagged `it()` is not an `atTest(` call site, so the static bijection preflight still passes and the case reaches the verdict.) |
| 9 | `--expect --wired` refuses (F4) | — | no tree at all — the runner is spawned with both flags | `status === 2`; stderr contains the "cannot be combined" message and the USAGE line. Costs no vitest spawn: it fails in `parseArgs`. |

Cost: nine spawned runner invocations, eight of which spawn vitest. The existing six black-box
cases contribute most of the current 3.2s selftest wall time; expect roughly a doubling, to
~7-12s. Acceptable, but named so it is not a surprise.

---

## 6. `tests/at/expected/README.md` (W4)

Short, no new policy invented. Revision 2 expands it from three sections to six, because four
rulings put documentation duties here (R4, R5, R8, R10) and F6 correctly caught two of them
missing.

1. **What a declaration is**, and that `--expect` refuses rather than passes when one is missing,
   absent for the tier, malformed, or not in bijection with the acceptance file.
2. **Why a red turning green is a FAILURE** — the declaration is the contract, so improving
   reality means updating the contract in the same change; without that rule the gate cannot tell
   improvement from drift.
3. **How to write and update one**, in the typed form: run `bun run at:verify req-0NN --tier loop`,
   read the actual reported detail, and copy the capability names out of it into `capabilities`
   (or the phase into `phase`). The match is EXACT, not a substring: the whole first line is
   rebuilt from what you declare. A red whose detail fits neither shape is undeclarable and
   therefore fails — that is deliberate, and the fix is to understand the red, not to loosen the
   declaration.
4. **A declaration change is a governance act (R10).** No current-state checker can prove a red is
   honest: moving an id from `green` to `red` is an author's claim about intent, and a reviewer
   should treat it with more suspicion than a code change. A red that names a capability should
   point at the board item that will deliver it. The mechanical version of that check is filed
   (section 11), not built here.
5. **What `--expect` still cannot see (R8).** The accounting in 2d makes every failing, pending
   and todo test add up against the declaration, but an unhandled rejection or a hook error that
   fails no test and is not serialised into the JSON report stays invisible while any red is
   declared. AI4DEV-26 (raw vitest output in CI) covers part of it; the reporter-side envelope
   that would close it is filed.
6. **Two known limits.** (R4) `firstLine` runs `redact()`, so if a detail ever contained a 40+
   character `[A-Za-z0-9_-]` run it would be rewritten to `<redacted-token>` and no declaration
   could reproduce it — under exact matching that id becomes undeclarable rather than merely
   hard to phrase. None of REQ-016's four reds is affected. (R5) `--expect` is tier-agnostic by
   construction, but every conformance case runs at the loop tier, so the integration path is
   exercised only by its "tier absent → exit 2" refusal: integration-tier declarations become
   exercised when integration-tier declarations exist.

---

## 7. Commits

One per work item, in this order, each with the trailer:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014CNrNUNMPmUkUcrPab9fQR
```

0. `hardening-expect: execution plan` — this file, revision 1 (`859f61d`).
0b. `AI4DEV-25: gate 1 dispositions` — this file, revision 2, plus `rulings-02.md` (this turn).
1. `AI4DEV-25: expected-state manifest reader + the REQ-016 declaration` (W1).
2. `AI4DEV-25: at:verify --expect` (W2).
3. `AI4DEV-25: black-box conformance cases for --expect` (W3).
4. `AI4DEV-25: how to read and update an expected-state declaration` (W4).

The board item is now filed as **AI4DEV-25** (rulings-02 header), so commits cite it from this
turn on; the earlier "no Linear id" deferral (R6/OQ6) is closed. The first two commits keep their
original `hardening-expect:` prefix because they are already written. Never pushed, no PR — the
orchestrator owns that.

---

## 8. Verification — what I will run and report raw

The brief's seven, plus three of my own:

1. `bunx tsc --noEmit --pretty false` → exit 0. Kept per R2 — it proves nothing in the covered
   tree regressed — but it typechecks **none** of this item's code (`tsconfig.json` `include` is
   `src/**` only). Step 1b is the check that actually covers the new files.
1b. **(R2 + F5) The config-free typecheck, with a PowerShell-safe file list.** Codex is right that
   the shell here does not expand `tests/at/harness/*.ts` when it is passed as a literal argument
   to `tsc`, so the command enumerates the files itself:

   ```powershell
   $files = (Get-ChildItem 'tests\at\harness\*.ts' | ForEach-Object { $_.FullName })
   & bunx tsc --noEmit --pretty false --strict --skipLibCheck --target es2022 --module esnext `
     --moduleResolution bundler --allowImportingTsExtensions --types node $files
   ```

   Baseline captured BEFORE any implementation (section 0a(iii)): exactly three errors, all in
   `registry.ts`. **Pass condition: the output after implementation contains those three lines and
   nothing else.** Any additional diagnostic is introduced by this item and blocks it; the three
   baseline lines are AI4DEV-24's inheritance and are out of scope by D7. R2's "if separating
   pre-existing from new is not cleanly possible, escalate" does not trigger — the separation is
   exact, because no baseline error is in a file this item touches.
2. `bun run at:selftest` → all pass (the existing 42, the 7 conformance cases of D8, the 2 added
   cases of 5a, and the unit tests of 1a unless struck).
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
9. (mine) a deliberate one-line temporary edit to `req-016.json` (move AT-016.07 from `red` to
   `green`), `--expect` → exit 1 naming AT-016.07, then revert. Proves the gate bites on the real
   requirement, not only on fixtures. The revert is verified with `git status`.
10. (mine, revision 2) a second deliberate temporary edit — shorten AT-016.11's declared
   capability to `H5 email provider` — `--expect` → exit 1 naming AT-016.11 with the expected and
   actual lines printed. This is the R9 tightening exercised against the real requirement: that
   truncated name IS a substring of the real detail, so revision 1's rule would have passed it,
   and exact matching must not. Reverted and verified the same way.

---

## 9. OPEN QUESTIONS — status after rulings 01 and 02

Revision 1's six are all ruled. Their text is kept below as the record, each stamped with the
ruling that closed it. **One new point (OP1) is open and I have not implemented anything on it.**

| # | Was | Now |
|---|---|---|
| OQ1 | `--expect` can exit 0 on a run that failed outside the assertions | **RULED — R1 then R8.** Section 2d is the concrete answer; the residual gap is named and filed. |
| OQ2 | `bunx tsc` covers none of this item's code | **RULED — R2, sharpened by F5.** Verification step 1b: PowerShell-safe file list, three-line baseline recorded, new diagnostics block. |
| OQ3 | duplicate the tree helper, or share it | **RULED — R3: duplicate.** Plan approved as written; `runner-blackbox.selftest.ts` is not touched. |
| OQ4 | a redacted detail can never match a reason | **RULED — R4: document, do not fix.** README section 6. |
| OQ5 | the integration path ships unexercised | **RULED — R5: accepted and named.** README section 6. |
| OQ6 | no Linear id | **CLOSED — the item is filed as AI4DEV-25.** Commits cite it from this turn on. |

### OP1 (NEW, open — I will not decide it) — "exact match" cannot be literal for the `pending` shape

R9 says a declared red must match its shape *exactly* — "an exact match of the whole first line" —
and describes `capability-pending` precisely enough to implement: the literal prefix plus the
declared names in the harness's order and joining. For that kind the rule is implementable as
written, and section 2c implements it as whole-line equality.

`kind: "pending"` is where it stops being literal. The line `AtPending` produces is

```
AtPending: <atId> PENDING [<phase>] — <detail>
```

and `<detail>` is free text chosen by the throw site. R9 has the declaration carry `phase` only.
For `sut-missing` the detail defaults to `REQ-016's implementation is not in the tree —
harness.sut.<key> is absent` but any suite may override it via `sutMissingDetail`; for
`harness-missing` it embeds `harnessResolveError`, a module-resolution message that differs by
machine and checkout path. **So there is no whole line to compare against: the declaration does
not determine it, and for `harness-missing` nothing portable could.**

**What I propose** (and have NOT implemented): match `pending` as an **anchored prefix** —
`` detail.startsWith(`AtPending: ${atId} PENDING [${phase}] — `) `` — so the error class, the id
and the phase are all matched exactly and from position 0, and only the trailing free text is
unconstrained. Codex's attack is still dead: a fixture-reset `Error:` does not begin `AtPending: `,
and a red in a different phase does not match.

**Alternatives, none of which I like as much:**
1. add an optional `detail` field to the `pending` declaration and require whole-line equality
   when it is present — closer to R9's letter, but it is machinery nobody asked for, and for
   `harness-missing` it would be unusable anyway;
2. drop `kind: "pending"` from this item entirely — no REQ-016 red uses it, so nothing here needs
   it; but R9 explicitly mandates both kinds, so this would be overruling a ruling;
3. require whole-line equality for `pending` too, with the declaration carrying the full detail —
   makes `harness-missing` permanently undeclarable and couples declarations to machine-specific
   paths.

**Why this is low-risk either way:** all four REQ-016 reds are `capability-pending`, so no
verification step in section 8 depends on the answer. It is flagged because it is a place where
the ruling's letter and the code's reality do not meet, and quietly picking one is exactly what
the escalation rule exists to prevent.

### OQ1 (blocking W2) — `--expect` can currently exit 0 on a run that failed outside the assertions

**RULED by R1 and then made concrete by R8 — see section 2d. Kept below as the record.**

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

**RULED by R2, and F5 fixed the command — see verification step 1b. Kept below as the record.**

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

**RULED by R3: duplicate, and do not touch the existing selftest. Kept below as the record.**

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

**RULED by R4: document in the README, do not fix — README section 6. Kept below as the record.**
Note that R9 makes it slightly sharper: under exact matching a redacted detail is not merely hard
to phrase, it is undeclarable.

`firstLine` runs `redact()`, which rewrites any 40+ character run of `[A-Za-z0-9_-]` to
`<redacted-token>`. If a future red's reason ever fell inside such a run, no declared reason could
match it and the id would be permanently undeclarable. None of REQ-016's four reds is affected
(every detail contains spaces). Naming it so it is on the record, not proposing a change.

### OQ5 (scope note, no action proposed) — the integration path is unexercised

**RULED by R5: accepted and named, stated in the README — README section 6. Kept as the record.**

`--expect` is tier-agnostic by construction, but the loop tier is the only tier this item may run,
so every conformance case is a loop-tier case and the integration path ships untested by anything
but the "tier absent → exit 2" refusal (verification step 8). Deliberate consequence of the
database-free loop rule; recorded, not worked around.

### OQ6 — no Linear id

**CLOSED.** The board item is filed as **AI4DEV-25** (rulings-02 header). Commits cite it from
this turn on; the R6 deferral is discharged.

---

## 10. Critique dispositions — Gate 1 (codex `gpt-5.6-terra` @ `xhigh`, 2 blockers, 3 important, 2 minor)

Every finding, its disposition, and where the change landed. **All seven are folded; none is
disputed; nothing from the critique is left open.** The one thing I escalate (OP1) is not a
critique finding — it is a gap between R9's wording and the code, found while folding F2.

| # | Severity | Finding, in one line | Disposition | Where it landed |
|---|---|---|---|---|
| F1 | blocker | D4a is still a placeholder comment, so an untagged failing `it()` hides behind the declared reds | **FOLDED — R8.** Codex's factual claim was independently confirmed twice: the installed JSON reporter has no unhandled-errors field. Implemented as report arithmetic over the fields it *does* expose; the residual hole is stated in the README and filed rather than papered over. No custom reporter (D7). | §0a(i) evidence, §2d the six conditions plus R1's rule 2, §3(b-bis) the interface fields, §3(c) the verdict, §5a case 8 as end-to-end proof, §6.5 README, §11 deferral 1 |
| F2 | blocker | D3's substring rule cannot establish that a red has its *declared cause* — `Error: H3 fault injection: fixture reset failed` satisfies `H3 fault injection` | **FOLDED — R9, which REPLACES D3.** Typed declarations matched by exact shape. Codex's proposed remedy (structured codes out of `capabilities.ts`) is NOT taken — D7 forbids it and it is not needed; it is filed as the long-term answer instead. Two consequences I found in the code and folded: AT-016.07/.09 declare **one** capability, not two; and the conformance fixture must throw the REAL `CapabilityPending`, since a plain `Error` can no longer match. | §2 types, §2a validation, §2c the matcher and the accepted text-coupling, §2c-bis output lines, §4 the typed declaration, §5 fixture change, §8 step 10, §11 deferral 2 |
| F3 | important | a manifest edit can launder a regression into an expected red | **FOLDED as documentation — R10.** Governance, not code: no current-state checker can prove a red is honest. README warning plus a filed follow-up (require and check a board reference on every declared red). Explicitly out of scope here. | §6.4 README, §11 deferral 3 |
| F4 | important | `--wired` precedence violates D5: `--expect --wired` with a bad manifest exits 3, not 2 | **FOLDED — mine under R11.** Took codex's first remedy: the combination is a usage error, exit 2. Rejected the second (preflight before the `--wired` refusal) because it makes a command that can never produce a report still do manifest I/O. Verified no existing test asserts `--wired` or the USAGE string. | §0a(iv), §3(a), §5a case 9 |
| F5 | important | R2's promised typecheck cannot run as written — PowerShell does not expand the glob — and leaves baseline-vs-new unseparated | **FOLDED — mine under R11.** Command now enumerates files explicitly; baseline captured before implementation and it is three errors, all in `registry.ts`, none in a file this item touches, so the separation is exact and R2's escalation clause does not trigger. | §0a(iii), §8 step 1b |
| F6 | minor | the README plan omits two duties R4 and R5 already mandate | **FOLDED — mine under R11.** README goes from three sections to six: R4's redaction limit and R5's unexercised integration path were indeed missing; R8's residual gap and R10's governance warning are added in the same pass. | §6 |
| F7 | minor | the hand-rolled row type widens a closed status contract to `string` | **FOLDED — mine under R11, and R11 states the preference.** `import type { IdRow }` + `Pick<IdRow, 'id' \| 'status' \| 'detail'>`; type-only imports are erased, so the runtime cycle revision 1 feared does not exist. Same technique for `PendingPhase`, pinned with `satisfies`. | §2 |

Codex's "No finding" paragraph (preflight ordering, the disposable-tree design, case 7 as a
genuine control, R3's duplication, no materially simpler design) is recorded as agreement; nothing
in it required a change.

---

## 11. Named deferrals — for the orchestrator to file

Each is a real gap this item deliberately does not close. They belong in the PR body under
merge-checklist box 8.

1. **A reporter-side envelope for failures the JSON report does not serialise (R8).** While any
   red is declared, an unhandled rejection or a hook error that fails no test remains invisible to
   `--expect`. AI4DEV-26 (raw vitest output in CI) covers part of it; closing it properly needs a
   custom reporter, which is out of scope by D7.
2. **Structured, machine-readable capability codes emitted by `capabilities.ts` (R9).** Exact
   shape-matching couples declarations to the harness's message text — accepted deliberately,
   because the failure direction is loud. A code emitted before redaction is the better long-term
   answer, and it belongs to the slice that owns `capabilities.ts`.
3. **Require every declared red to reference the board item that will resolve it, and check that
   reference (R10).** The mechanical half of the governance answer to F3.

Already discharged: the "no Linear id" deferral (R6/OQ6) — the item is **AI4DEV-25**.
Already owned elsewhere: `tests/at` invisible to `tsc` is **AI4DEV-24**; CI on the PR head is
**AI4DEV-26**.

---

## 12. What the checkpoint is being asked to approve

1. The seven dispositions in section 10 — all folded, none disputed.
2. **OP1 (section 9)**, the only open point: `pending` reds matched by anchored prefix rather than
   whole-line equality, because the trailing detail is free text the declaration cannot determine.
   Nothing is implemented on it either way.
3. Three additions beyond the brief's letter, each strikeable: the unit selftest file (§1a),
   conformance case 8 (§5a — the R8 accounting proof), and conformance case 9 (§5a — the F4
   refusal). Cases 8 and 9 test behaviour this revision introduces; without them, two folds ship
   unproven.
