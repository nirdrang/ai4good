# PLAN — AI4DEV-24: make the AT harness and suites visible to the typechecker

Executor plan against `brief.md`. Base `origin/main` = `02baf79`, branch `nirdrang/ai4dev-24-typecheck`,
worktree `C:\Users\nirdr\Downloads\ai4good-tsconfig`. Toolchain measured, not assumed:
bun 1.3.14, TypeScript 5.9.3, vitest 4.1.10, `@types/node` 22.19.17 (`bun install` on a fresh
worktree: 515 packages).

Everything in section 0 was RUN before a line of this plan was written. Every claim below that
says "proven" has a command and an output behind it.

---

## 0. Ground truth

### 0a. Pre-change baselines (the diff targets for verification step 5)

Captured on a clean worktree at `02baf79`, before creating any file:

| # | command | result |
|---|---|---|
| 1 | `bunx tsc --noEmit --pretty false` | exit 0, no output |
| 2 | `bun run at:selftest` | 6 files, **96 tests**, all pass, exit 0 |
| 3 | `bun run at:check req-016` | `RESULT: 12 P0 ids in bijection`, exit 0 |
| 4 | `bun run at:verify req-016 --tier loop` | exit 1, **8 green / 4 red**, `12 P0: 8 green, 4 red, 0 missing` |
| 5 | `bun run at:verify req-016 --tier loop --expect` | exit 0, `EXPECTED: the run matches …\tests\at\expected\req-016.json exactly (8 declared green, 4 declared red)` |

The four reds, with the reason each one is red — this is the per-id expected state, unchanged by
this item:

- `AT-016.01` — `CapabilityPending: H3 static provider scan, H3 sentinels, H5 email provider simulator`
- `AT-016.07` — `CapabilityPending: H3 fault injection and process restart`
- `AT-016.09` — `CapabilityPending: H3 fault injection and process restart`
- `AT-016.11` — `CapabilityPending: H5 email provider simulator`

Raw captures live in the session scratchpad
(`…\scratchpad\base-tsc.txt`, `base-selftest.txt`, `base-check.txt`, `base-verify-loop.txt`,
`base-verify-expect.txt`). They are scratch, not repo artifacts; the verification step re-runs and
compares against them, and the final numbers are quoted in the verify report.

### 0b. The real error census — **24, not ~25**

Measured with the candidate `tests/at/tsconfig.json` of §1 (created, measured, then deleted, so the
worktree stayed clean for this commit):

```
tests/at/harness/registry.ts(175,48): error TS2344: Type 'W' does not satisfy the constraint 'WorldLike'.
tests/at/harness/registry.ts(495,37): error TS2344: Type 'W' does not satisfy the constraint 'WorldLike'.
tests/at/harness/registry.ts(519,66): error TS2345: Argument of type 'AtTestBody<Sut, W>' is not assignable to parameter of type 'AtTestBody<Sut, WorldLike>'.
  Type 'WorldLike' is not assignable to type 'W'.
    'W' could be instantiated with an arbitrary type which could be unrelated to 'WorldLike'.
tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts(28,18): error TS2339: Property 'static' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts(50,34): error TS2339: Property 'sentinels' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts(71,26): error TS2339: Property 'vendors' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts(71,59): error TS7006: Parameter 'a' implicitly has an 'any' type.
tests/at/suites/req-016/b-delivery-defaults.test.ts(39,15): error TS2339: Property 'faults' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/b-delivery-defaults.test.ts(87,23): error TS2339: Property 'config' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/b-delivery-defaults.test.ts(88,28): error TS2339: Property 'config' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/b-delivery-defaults.test.ts(89,28): error TS2339: Property 'config' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/b-delivery-defaults.test.ts(99,17): error TS2339: Property 'clock' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/b-delivery-defaults.test.ts(101,17): error TS2339: Property 'clock' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/b-delivery-defaults.test.ts(113,17): error TS2339: Property 'clock' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/c-reliability-guard.test.ts(64,31): error TS2339: Property 'faults' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/c-reliability-guard.test.ts(125,9): error TS2339: Property 'vendors' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/c-reliability-guard.test.ts(129,50): error TS2339: Property 'vendors' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/c-reliability-guard.test.ts(129,83): error TS7006: Parameter 'a' implicitly has an 'any' type.
tests/at/suites/req-016/c-reliability-guard.test.ts(131,44): error TS7006: Parameter 'a' implicitly has an 'any' type.
tests/at/suites/req-016/c-reliability-guard.test.ts(148,59): error TS7006: Parameter 'a' implicitly has an 'any' type.
tests/at/suites/req-016/c-reliability-guard.test.ts(160,9): error TS2339: Property 'vendors' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/c-reliability-guard.test.ts(182,31): error TS2339: Property 'vendors' does not exist on type 'HarnessLike'.
tests/at/suites/req-016/c-reliability-guard.test.ts(184,18): error TS7006: Parameter 'a' implicitly has an 'any' type.
tests/at/suites/req-016/c-reliability-guard.test.ts(185,15): error TS7006: Parameter 'a' implicitly has an 'any' type.
```

By code: 15× `TS2339` (`h.<capability>` missing on `HarnessLike`), 6× `TS7006` (implicit `any` on
the `(a) => …` callbacks that follow from `h.vendors.email.attempts()` being untyped), 2× `TS2344`
+ 1× `TS2345` (the generic-constraint family inside `registry.ts`).

By file: `c-reliability-guard.test.ts` 10, `b-delivery-defaults.test.ts` 7,
`a-emitter-and-taxonomy.test.ts` 4, `registry.ts` 3. `d-taxonomy-evidence.test.ts` has **zero** —
its bodies never touch `h`.

**This is exactly the brief's D3 description**: one family (21 suite errors, all downstream of
`open()` returning a minimal `HarnessLike`) plus "three generic-constraint complaints inside
`registry.ts`". 24 against "~25" is not a material difference and it corroborates the previous
item's own record — `loop/items/hardening-expect/plan.md:770` states its config-free baseline was
"exactly three errors, all in `registry.ts`", which are the same three. **No escalation on count.**

Nothing else appeared under `strict` (D4). In particular the two `import.meta.main` uses
(`check.ts:173`, `runner.ts:1209`) do **not** error: `@types/node` 22.19 declares
`ImportMeta.main` (`module.d.ts`, `@since v22.18.0`). `@types/bun` is not needed and will not be
added.

### 0c. The fix is proven, end to end, before proposing it

A throwaway copy of `tests/at` in the scratchpad (with a junction to the real `node_modules`)
reproduced the 24 errors, then took exactly the changes of §1 and §2 below:

- `bunx tsc -p <scratch>/tests/at/tsconfig.json --noEmit --pretty false` → **exit 0, zero output**.
- grep of the changed files for `ts-expect-error` / `ts-ignore` / `: any` / `as any` / `<any` →
  **no hits**. D3 is satisfied literally, not by a number going down.
- **The four `*.test.ts` files need no change at all** — zero diff. So D6's "the REQ-016 suite's
  assertions" is not merely respected, it is untouched.

### 0d. D5 (behaviour must not change) — checked, not asserted

The one live behavioural risk is that vite/esbuild resolves the *nearest* `tsconfig.json` for each
file it transforms. Today the nearest ancestor for `tests/at/**` is the **root** config; after this
item it is the new one, and vite reads `target` from it (which drives `useDefineForClassFields`,
which changes class-field semantics in `_fixture.ts`, `clock.ts` and `registry.ts`). Measured with
the candidate config in place:

- `bun run at:selftest` → 6 files, 96 tests, all pass (identical to baseline).
- `bun run at:verify req-016 --tier loop` → **byte-identical to the baseline capture** after
  normalizing the two non-deterministic lines (see §5, step 5). `Compare-Object` returned nothing.

The mitigation is deliberate, not lucky: §1 sets `target: "ES2022"`, the same value the root config
carries, precisely so this field cannot move.

---

## 1. W1 — `tests/at/tsconfig.json` + the `typecheck` script

### 1a. Exact file contents

**Amended at Gate 1** — F1 (`skipLibCheck`), F4 (`noUncheckedSideEffectImports`) and F5 (the include
shape) are folded below. The values were re-measured **together**, not one at a time: the combined
config yields **0 errors** over the same 28 files.

```json
{
  "include": ["**/*"],
  "exclude": ["node_modules"],
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "skipLibCheck": false,
    "strict": true,
    "noUncheckedSideEffectImports": true
  }
}
```

Why each option is what it is:

- **`include: ["**/*"]` + `exclude: ["node_modules"]` + `allowJs`/`checkJs` (F5).** The explicit
  `exclude` is load-bearing, and here the coordinator's premise was right where mine was wrong:
  **there IS a `tests/at/node_modules`.** Vitest writes its cache there
  (`node_modules/.vite/vitest/…`) on every `at:selftest` run, so it is guaranteed, not hypothetical;
  it is gitignored (`.gitignore:10`), which is why my first survey of the tree missed it.
  TypeScript's *default* exclude would cover it, but naming an `exclude` at all replaces that
  default, so `node_modules` has to be written out.
  On the extension question I am **deviating from the shape the coordinator specified**, under the
  "unless you can show it wrong" clause, and flagging it here so it can be reversed in one line. A
  TypeScript-only include list narrows the *claim* until it is true but leaves codex's actual
  failure scenario open. Reproduced literally: a JavaScript helper under `tests/at` carrying a real
  error (`export function seed() { return typoedGlobalThatDoesNotExist(); }`) is **invisible** to
  the TS-only include (exit 0) and is **caught** by `**/*` + `allowJs` + `checkJs`
  (`TS2304: Cannot find name 'typoedGlobalThatDoesNotExist'`). This shape therefore enforces
  mechanically what a README sentence would only request. The README still states the
  TypeScript-only policy (W4) — it becomes a convention backed by a check rather than a convention
  standing in for one.
  Coverage today is identical either way: 28 files, and **0** files from `tests/at/node_modules`
  leak in (measured with `--listFiles`).
- **`target: "ES2022"`** — same value as the root config. Two reasons: the code is run by bun and
  by vitest, both of which support ES2022 natively; and it pins the one field whose divergence
  could move runtime class semantics through vite's esbuild transform (§0d).
- **`module: "ESNext"`** — the harness is ESM (`"type": "module"`) and `registry.ts:125` uses a
  top-level `await import(…)`, which needs an ESM module target.
- **`lib: ["ES2022"]`** — implied by `target`, written out to record the intent: **no DOM**. Harness
  code reaching for `document`/`window` should be a hard error. The root config carries
  `["ES2022","DOM","DOM.Iterable"]` — this divergence is exactly what D1 says the two configs are
  for.
- **`types: ["node"]`** — the harness uses `node:fs`, `node:path`, `node:url`, `process`,
  `import.meta`. Explicit rather than implicit, because with no `types` field TypeScript pulls in
  **every** package under `node_modules/@types`, which would drag `@types/react` and
  `@types/react-dom` into a Node-side program that has nothing to do with them.
- **`moduleResolution: "Bundler"`** — the harness imports with explicit `.ts` extensions
  (`from './registry.ts'`). `Bundler` is the resolution mode that accepts that; `Node16`/`NodeNext`
  would demand `.js` specifiers and force a rewrite of every import in the tree — a change with no
  purpose that D6 would rightly object to.
- **`allowImportingTsExtensions: true`** — required by those specifiers. TypeScript requires
  `noEmit` alongside it.
- **`noEmit: true`** — required by the above, and correct in itself: this config is a checker, never
  a build. (`bun` and `vitest` do the transpiling.)
- **`skipLibCheck: false` (F1, blocker — folded).** OQ-1 is settled against my own proposal. Codex is
  right that the flag cannot distinguish a third-party `.d.ts` from a first-party
  `tests/at/**/*.d.ts`, and the include glob admits the latter — so `true` would be a standing
  instruction to skip our own code the moment anyone writes an ambient declaration here. Measured:
  `false` yields **0 errors** and costs 0.5s (1.4s against 0.9s). Written out explicitly rather than
  omitted, so the choice is legible and a future edit has to argue with it.
- **`noUncheckedSideEffectImports: true` (F4 — folded).** The root config enables it
  (`tsconfig.json:22`) and the harness config must not be laxer than the app's. Without it an
  unresolved bare side-effect import (`import './register-vendors.ts';` after a rename) produces no
  diagnostic at all, so `bun run typecheck` could exit 0 while vitest fails at runtime. Measured: 0
  errors on the current tree.
- **`strict: true`** — D4.

Deliberately **not** set, each with a measurement:

- `noUnusedLocals` / `noUnusedParameters` — the root config sets both to `false`. Turning both on
  measures **0 errors** today, so it is free, but it is a new rule the brief did not ask for. See
  **OQ-2**.
- `noUncheckedIndexedAccess` — **46 errors** if enabled. It is *not* part of `strict`, so D4 does
  not reach it, and adopting it would mean rewriting suite bodies. Out of scope. Recorded here
  because "make the check real" invites the question.
- `paths` — nothing under `tests/at` imports through the `@/` alias (grep clean), so an alias map
  would be dead configuration.
- `verbatimModuleSyntax` — root sets it `false`; leaving it at the default `false` keeps
  `import type` elision identical to how the files are transpiled today.

These options are a **superset of the ad-hoc command the previous two items had to bolt on**
(`loop/items/hardening-expect/plan.md:766-767`: `--strict --skipLibCheck --target es2022 --module
esnext --moduleResolution bundler --allowImportingTsExtensions --types node`). Two deliberate
departures from it, both Gate 1 folds: `skipLibCheck` flips to `false` (F1) and
`noUncheckedSideEffectImports` is added (F4). So the standing check is the ad-hoc check plus two
holes closed, over the whole tree instead of a hand-typed file list — which is what "the ad-hoc
per-item workaround becomes unnecessary" means.

### 1b. The `typecheck` command (F2 — folded; the `&&` form is withdrawn)

Codex is right and I was wrong to accept the short-circuit: D2 says the command runs **both**
configs and fails if either fails, and `&&` cannot do that — an app error prevents the AT command
from ever starting, so the run yields no evidence at all about `tests/at`. That is a false-green
shape: silence about the harness reads the same as a clean harness.

New file `tests/at/typecheck.ts`, and the script becomes:

```json
"typecheck": "bun tests/at/typecheck.ts"
```

The wrapper always launches both projects, prints a header per project, collects the failures and
exits non-zero if **either** failed:

```ts
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Repo root, resolved from THIS file, so the result does not depend on the caller's cwd. */
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const PROJECTS = [
  { label: 'app', project: 'tsconfig.json' },
  { label: 'acceptance tests', project: 'tests/at/tsconfig.json' },
] as const;

const failures: string[] = [];

for (const { label, project } of PROJECTS) {
  console.log(`\n=== typecheck: ${label} (${project}) ===`);
  const result = spawnSync(process.execPath, ['x', 'tsc', '--noEmit', '--pretty', 'false', '-p', project], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`${project}: the compiler could not be started — ${result.error.message}`);
    failures.push(project);
  } else if (result.status !== 0) {
    failures.push(project);
  }
}

if (failures.length) {
  console.error(`\ntypecheck FAILED: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\ntypecheck OK: both configs clean');
```

Verified against the real worktree, both directions:

- app clean + AT red → both headers print, the 24 AT errors print, `typecheck FAILED:
  tests/at/tsconfig.json`, exit 1.
- **first project red** (a deliberately broken config substituted for the app's) → both headers
  still print, **both** error sets print, `typecheck FAILED: tests/at/tsconfig.broken.json,
  tests/at/tsconfig.json`, exit 1. Under `&&` the second command would never have run. The probe
  files were deleted; the worktree is clean.

Design notes, each of which a reviewer will otherwise ask about:

- `spawnSync(process.execPath, ['x', 'tsc', …])` runs `tsc` through **the same bun binary that is
  running the wrapper**, so there is no PATH dependency and no shell. Measured against the
  alternatives: `bunx` with and without `shell: true` and a direct `node_modules/typescript/bin/tsc`
  path all work too, but `require.resolve('typescript')` is **not** usable — from outside the
  project it resolved to a global bun cache copy of TypeScript **7.0.2** rather than the project's
  pinned 5.9.3, which is precisely the kind of silent version drift this item exists to stop.
- `result.error` (compiler could not be started) and a `null` status from a signal death are both
  treated as failures, never as passes.
- `cwd: ROOT` is derived from `import.meta.url`, not from the caller, so `bun run typecheck` behaves
  the same from any directory.
- **The file's location is a compromise worth naming.** A repo-level `scripts/` directory is its
  natural home; this item's allowed-path list is `tests/at/**`, `package.json`,
  `loop/items/AI4DEV-24/**`, so putting it anywhere else would breach D6. `tests/at/typecheck.ts`
  keeps the diff inside the fence; the README says why it lives there.
- The existing `bunx tsc --noEmit` is untouched and no existing script is edited (D2).

### 1c. The commit

`AI4DEV-24: tests/at typecheck config + typecheck script`, with the full 24-line error list of §0b
in the message body, so the starting point is on the record (W1's explicit instruction). This commit
leaves `bun run typecheck` **failing** — that is intended and is the evidence.

---

## 2. W2 — the registry generics carry the harness type

> **BLOCKED ON F3 — nothing in this section is implemented until the orchestrator rules.**
> Gate 1 finding 3 (blocker, false-green-class) says the shape below lets a suite declare harness
> members the factory never produces. It is **reproduced and confirmed** in §2e. §2a–§2d record the
> shape as planned; §2e records the reproduction, why the proposed fix does not close it, and the
> variant that does. Implementation waits for the ruling.

### 2a. The shape of the change (as planned — superseded pending the F3 ruling)

`registry.ts` gains a third type parameter `H extends HarnessLike = HarnessLike` on the context
types, and — the part that kills the three `registry.ts` errors — the existing `W` parameter gains
the `extends WorldLike` constraint it was always used under but never declared.

Every parameter is **defaulted**, so every existing call site that supplies `<Sut, W>` or nothing at
all keeps compiling unchanged. That is what makes this a widening rather than a break.

| # | site (current) | becomes |
|---|---|---|
| 1 | `interface OpenWorld<Sut = unknown, W = WorldLike>` with `h: HarnessLike` | `<Sut = unknown, W extends WorldLike = WorldLike, H extends HarnessLike = HarnessLike>` with `h: H` |
| 2 | `interface AtContext<Sut = unknown, W = WorldLike>` | same three parameters; `open(): Promise<OpenWorld<Sut, W, H>>`, `capture<T>(e: EvidenceCapture<T, Sut, W, H>)` |
| 3 | `interface InternalContext<Sut, W extends WorldLike> extends AtContext<Sut, W>` | `<Sut, W extends WorldLike, H extends HarnessLike> extends AtContext<Sut, W, H>` |
| 4 | `class EvidenceCapture<T, Sut = unknown, W extends WorldLike = WorldLike>` | `+ H extends HarnessLike = HarnessLike`; producer is `(ctx: AtContext<Sut, W, H>) => Promise<T>`; `consume(ctx: InternalContext<Sut, W, H>)` |
| 5 | `defineEvidenceCapture<T, Sut, W>` | `+ H`; returns `EvidenceCapture<T, Sut, W, H>` |
| 6 | `executeRegisteredBody<Sut, W extends WorldLike>` | `+ H extends HarnessLike`; `body: AtTestBody<Sut, W, H>`, `ctx: AtContext<Sut, W, H>` |
| 7 | `type AtTestBody<Sut = unknown, W = WorldLike>` | `<Sut = unknown, W extends WorldLike = WorldLike, H extends HarnessLike = HarnessLike>` |
| 8 | `atTest` — 2 overloads + 1 implementation signature | all three take `<Sut, W extends WorldLike, H extends HarnessLike>` and `AtTestBody<Sut, W, H>` |
| 9 | inside `atTest`: `const ctx: InternalContext<Sut, W>` and `return opened as OpenWorld<Sut, W>` | `InternalContext<Sut, W, H>` and `opened as OpenWorld<Sut, W, H>` |
| 10 | `bindSuite<Sut, W extends WorldLike>` — 2 overloads + 1 implementation signature + the inner `atTest<Sut, W>(…)` call | `+ H extends HarnessLike = HarnessLike` threaded through all four |

No runtime statement is touched. Every edit is a type annotation, a type parameter list, or a type
argument. The only executable lines that move are the `atTest`/`bindSuite` signatures reflowed onto
several lines to stay inside the file's print width — the bodies are byte-identical.

### 2b. How `_bind.ts` supplies `AtHarness`

Two lines, both type-only:

```ts
import type { AtHarness, NotificationsSut, World } from './_contract.ts';
…
export const atTest = bindSuite<NotificationsSut, World, AtHarness>({ … });
```

`AtHarness` already exists at `_contract.ts:149` — `SharedHarness<{ notifications?: NotificationsSut }, World, Channel>` — exactly as the brief says. That it structurally satisfies
`H extends HarnessLike` was **verified by the compiler**, not argued: `tier`, `stubbedCapabilities`,
`teardown` match outright; `Fixtures<World>` satisfies `{ world(name: string): Promise<WorldLike> }`
because `World extends WorldSeam`; and the inline `{ notifications?: NotificationsSut }` gets an
implicit index signature, so it satisfies `sut: Record<string, unknown>`. The binding object literal
and `sutMissingDetail` text are unchanged.

### 2c. What this does to every call site

- **The four `*.test.ts` files: nothing.** `atTest` comes from `_bind.ts`, so `h` in every body
  becomes `AtHarness`, and all 21 suite errors — the 15 `TS2339` and the 6 `TS7006` behind them —
  disappear with **zero diff in those files**. `h.vendors.email.attempts()` now returns
  `ProviderAttempt<Channel>[]`, so `(a) => …` infers.
- **`d-taxonomy-evidence.test.ts:32**, `defineEvidenceCapture<TaxonomyEvidence, NotificationsSut, World>`: left unchanged. `H` falls back to `HarnessLike`, and `ctx.capture(taxonomyEvidence)` still
  typechecks because the producer body uses only `open`, `w` and `sut`. A future capture that needs
  `h` supplies the fourth argument. See **OQ-4**.
- **`_fixture.ts`, `_contract.ts`, `_oracles.ts`, `taxonomy.ts`, every `harness/*.ts` other than
  `registry.ts`, all six `*.selftest.ts`: nothing.** No file imports `AtContext`/`OpenWorld`/
  `AtTestBody` in a way that pins the arity; `_bind.ts`'s type re-export of `AtContext`/`OpenWorld`
  is an un-instantiated re-export and stays as it is.
- **The one type assertion.** `registry.ts:510`'s `opened as OpenWorld<Sut, W>` becomes
  `opened as OpenWorld<Sut, W, H>`. Flagging it before a reviewer does: it is **pre-existing**, not
  introduced, and it is not what makes the 24 errors go away — keep it and skip the generics and all
  24 remain. It exists because the harness arrives through `await import(HARNESS_MODULE)` and is
  therefore typed `HarnessLike` at that seam; the suite's richer type is asserted once, at the
  boundary where it genuinely cannot be known statically. Making `HarnessModule.createHarness`
  generic over `H` would only relocate the same unchecked assertion one level up, to the dynamic
  import itself.

### 2d. The commit

`AI4DEV-24: registry context generics carry the harness type`. Expected state after it:
`bun run typecheck` → **exit 0**.

### 2e. F3 — the finding is real, the proposed fix does not close it, and one variant does

**ESCALATED. Implementing nothing here until ruled.** Every claim below is a measurement in a
throwaway copy of `tests/at`, not an argument.

**(i) The defect reproduces exactly as codex describes.** With the §2a shape in place, a suite that
binds an invented harness compiles clean:

```ts
type InventedHarness = AtHarness & { auditLog: string[] };
const atTestInvented = bindSuite<NotificationsSut, World, InventedHarness>({ sut: 'notifications' });
atTestInvented('AT-016.99', 'F3 reproduction', async ({ open }) => {
  const { h } = await open();
  console.log(h.auditLog.length);   // tsc: exit 0 — nothing ever produces auditLog
});
```

`tsc` exit **0**, zero errors. The new green check would promise a runtime shape the factory never
establishes. Codex is right, and it is the crux of the item: a type-check that lies is the defect
this item exists to remove.

**(ii) The proposal as literally worded does NOT close it.** Constraining `H` to the canonical
harness type still admits the invention, because an intersection is a *subtype* and therefore
satisfies `extends`. Measured on the two directions:

| constraint | `H = AtHarness` | `H = AtHarness & { auditLog }` |
|---|---|---|
| `H extends AtHarness` (the proposal's direction) | accepted | **accepted — the hole stays open** |
| `AtHarness extends H` (the reverse) | `'OK'` | `'REJECTED'` |

So "constrain `H` to the canonical harness type" has to mean the reverse direction, and `extends`
cannot express that on a type parameter. Worse, the reverse direction is *too strict* if it is
written against what the factory produces: REQ-016's `AtHarness` legitimately narrows `sut` from
`Record<string, unknown>` to `{ notifications?: NotificationsSut }`, which the produced type is not
assignable to — so the reverse constraint would reject the one real binding we have.

**(iii) The other half of the proposal is sound and independently valuable.** Annotating
`index.ts`'s factory does real work, and it currently does not even typecheck as-is. Measured: the
factory's *inferred* return type today has `sentinels`, `faults`, `static` and `vendors` all typed
`object` — because `pendingCapability<T extends object>()` has no inference site, so `T` falls back
to its constraint. Consequently `Awaited<ReturnType<typeof createHarness>> extends AtHarness` is
**false**: `index.ts` does not currently produce anything the compiler recognises as the shared
contract. Annotating it forces four explicit type arguments:

```ts
): Promise<AtHarness> {                                   // the annotation
  sentinels: pendingCapability<Sentinels>('H3 sentinels'),
  faults: pendingCapability<Faults>('H3 fault injection and process restart'),
  static: pendingCapability<StaticScan>('H3 static provider scan', …),
  vendors: pendingCapability<Vendors>('H5 email provider simulator'),
```

All type-only, all permitted by D6. Measured: **0 errors** with the annotation in place, and it
genuinely bites — deleting `vendors:` from the returned object now fails with
`TS2741: Property 'vendors' is missing … but required in type 'AtHarness<…>'`, where before it was
invisible.

**(iv) The variant that does close it — remove the free parameter.** If the suite cannot name a
harness type at all, it cannot invent one. `H` is replaced by the suite's *channel* names, and the
context's harness is derived:

```ts
/** The harness a suite's test bodies see: the ONE shared contract, bound to the suite's own
 *  world and channel names — deliberately NOT a free type parameter. */
export type SuiteHarness<W extends WorldLike = WorldLike, Channel extends string = string> =
  AtHarness<Record<string, unknown>, W, Channel>;
```

`OpenWorld`/`AtContext`/`AtTestBody`/`atTest`/`bindSuite`/`EvidenceCapture` take
`<…, Channel extends string = string>` instead of `<…, H extends HarnessLike = HarnessLike>`, and
`_bind.ts` becomes `bindSuite<NotificationsSut, World, Channel>` with `Channel` from `./taxonomy.ts`.
The registry's dynamic-import seam is retyped from `Promise<HarnessLike>` to `Promise<SuiteHarness>`,
which is exactly what `index.ts` is now annotated to return — so the one remaining assertion at that
seam is honest, because the producer is statically checked to produce that shape.

Measured, whole 28-file tree:

- **0 errors**, coverage unchanged at 28 files.
- The F3 reproduction now **fails**, which is the point:
  `TS2344: Type 'InventedHarness' does not satisfy the constraint 'string'` and
  `TS2339: Property 'auditLog' does not exist on type 'SuiteHarness<World, InventedHarness>'`.
- **The four `*.test.ts` files remain byte-identical to HEAD** (hash-compared).
- No `any`, no `@ts-expect-error`, no `@ts-ignore` anywhere in the changed files.
- Cost: `registry.ts` renames the parameter across the same 10 sites, gains one type-only import and
  the `SuiteHarness` alias, and retypes the seam in 2 places; `index.ts` gains 1 annotation, 4 type
  arguments and 1 import line; `_bind.ts` swaps which type it imports. All type-level, so D5 holds by
  construction — verified for real at implement time by re-running §5.
- One orphan: `HarnessLike` becomes unreferenced except by its own declaration. Per the repo's
  surgical-changes rule an orphan my change creates should go, but it is an exported type — I have
  not decided this; it rides on the ruling.

**(v) Codex's other option — a suite-supplied runtime guard — and its D5 cost.** Codex offers
"require a suite-provided runtime assertion/guard before returning `H`", and says itself that this
"changes invalid-harness behavior, so D5 requires escalation". Concretely: `open()` would have to
validate the harness against a suite-supplied predicate and fail differently when it does not match.
That is a new runtime failure mode on a path the four reds already traverse, so it can change what
`at:verify` reports — a direct D5 breach on a types-and-config item. It also cannot be derived from
the types, since they are erased; every suite would have to hand-write and hand-maintain a validator
that duplicates its own contract, which is a second source of truth for the seam. **I do not
recommend it.**

**(vi) The adjacent hole codex did not raise, for the ruling's completeness.** `OpenWorld.sut` has
the *same* character: `openWorld` reads `h.sut?.[sutKey]` — typed `unknown` — and hands it back as
the suite's `Sut`. So the `Sut` axis is already an unverified claim at the same seam, and has been
since before this item. It is **pre-existing**, W2 does not widen it, and closing it needs the same
runtime guard rejected in (v). Variant (iv) is attractive partly because it removes the *new*
unverified surface without disturbing the old one. If the founder's false-green ruling is meant to
reach every unverified claim at this seam and not only the one codex named, that is a bigger item
than this one and should be filed separately.

---

## 3. W3 — whatever remains

**Nothing remained, and W3 has no commit** — as planned, the box is not filled with a manufactured
change. Two things about it belong on the record:

- The one edit W3 might have carried — deleting the orphaned `HarnessLike` per R3 — **landed inside
  the W2 commit instead**, because the interface sat in the same declaration block W2 rewrote;
  removing it was not a separable edit.
- **R3's measurement was run after the deletion rather than before it**, inverting the order R3
  specified. Stating the sequence rather than presenting it as clean: `git grep HarnessLike` across
  the whole repository returns **zero code references** — every hit is prose inside this item's own
  `brief.md`, `gate1-critique.txt` and `plan.md`. Had it found a real reference the type would have
  had to come back; it did not, so the outcome is the one R3 required.

---

## 4. W4 — `tests/at/README.md` (new file; none exists today)

Short, and only about the two configs: that `tsconfig.json` at the root is Lovable's application
build (DOM libs, JSX, bundler resolution over `src/**`); that `tests/at/tsconfig.json` is the
Node-side harness check (no DOM, `types: ["node"]`, `.ts` import specifiers, `strict`); why they are
separate rather than one widened `include` (D1 — the two genuinely need different `lib`/`types`, and
Lovable regenerates the root config, so coupling them lets a regeneration silently un-check the
harness); and that `bun run typecheck` runs both and fails if either fails.

Commit: `AI4DEV-24: note why the harness has its own tsconfig`.

---

## 5. Verification — the expected state for this item

Run from the worktree root, in order. Steps 1–7 are the brief's; the file-count evidence in step 2
and the diff method in step 5 are spelled out so the result is reproducible by the auditor.

1. `bunx tsc --noEmit --pretty false` → **exit 0, no output**. Unchanged from baseline 0a#1.
2. `bun run typecheck` → **exit 0**. Coverage proven, not asserted, with
   `bunx tsc -p tests/at/tsconfig.json --noEmit --listFiles --pretty false`: **28 files under
   `tests/at`** (all 28 `.ts` files in the tree — the full list is quoted in the verify report),
   **282 files in the program** counting `lib.*.d.ts` and `@types`. Pre-change the same tree had
   **0** files checked by any configured command.
3. `bun run at:selftest` → 6 files, **96 tests**, all pass, exit 0.
4. `bun run at:check req-016` → `RESULT: 12 P0 ids in bijection`, exit 0.
5. `bun run at:verify req-016 --tier loop` → exit 1, 8 green / 4 red, the four reds exactly the ids
   and reasons listed in §0a — **diffed, not eyeballed**, and now **reproducible from the repository**
   (F7 — folded). Both halves are committed under `loop/items/AI4DEV-24/baseline/`:

   ```powershell
   powershell -File loop/items/AI4DEV-24/baseline/normalize-verify.ps1 > current.txt
   Compare-Object `
     (Get-Content loop/items/AI4DEV-24/baseline/verify-req-016-loop.baseline.txt) `
     (Get-Content current.txt)
   ```

   Empty output means unchanged. The baseline was captured on the clean worktree at `02baf79`
   **before any implementation**, and two independent runs of the normalizer were confirmed
   byte-identical to each other.

   **Correction to what this plan said before.** I claimed two kinds of non-deterministic line and a
   normalizer that *drops* `Duration`/`Start at`. That was wrong: those lines belong to vitest's own
   summary in `at:selftest`, and they do not appear in `at:verify` output at all. The committed
   normalizer therefore **drops nothing**. It rewrites exactly one line — the report path, whose temp
   root is machine-specific and whose suffix is random — and unwraps PowerShell's ErrorRecord
   rendering of the child's stderr, which otherwise embeds the caller's own script text. The whole
   per-id table, both `FAILURE:` lines and the `error: script "at:verify" exited with code 1` line
   pass through verbatim, and the exit code is appended as the final line, so neither a changed
   verdict nor a changed exit status can be normalized away.
6. `bun run at:verify req-016 --tier loop --expect` → **exit 0**, with the `EXPECTED: …(8 declared
   green, 4 declared red)` line.
7. `git diff --check` clean. `git status --porcelain` shows only `tests/at/**`, `package.json`,
   **`bun.lock`** (F6 — the `@types/node` floor bump) and `loop/items/AI4DEV-24/**` — no `src/`, no
   `design/`, no `supabase/`, no change to the root `tsconfig.json` (D6).

Not in the brief's list, offered: `bun run build`. §6 R-1 argues the app build cannot be affected;
if the orchestrator wants that argument replaced by a measurement, this is the measurement.

---

## 6. Open questions and residual risks

Named rather than decided, per the brief's escalation clause. Gate 1 settled four of them; what is
left is marked.

- **OQ-1 — `skipLibCheck`. SETTLED by F1, against my proposal.** I had argued `true` on the grounds
  that `tests/at` contains zero `.d.ts` files today, so the flag was arithmetically incapable of
  skipping our own code. Codex's point is the one that matters: the config is a *standing*
  instruction and the include glob admits `tests/at/**/*.d.ts`, so `true` would silently skip the
  first ambient declaration anyone writes here — which is exactly D3's ban. `false` costs 0.5s and
  measures 0 errors. Folded as `false`.
- **OQ-2 — `noUnusedLocals` / `noUnusedParameters`. STILL OPEN.** Both measure 0 errors, so enabling
  them is free today. **My proposal is unchanged: leave them off**, matching the root config's
  explicit `false`; D4 asked for `strict`, and adding lint-flavoured rules the brief did not request
  is scope growth future authors inherit. Codex did not raise it.
- **OQ-3 — `&&` short-circuits. SETTLED by F2, against my proposal.** I proposed keeping `&&` and
  documenting the short-circuit. That was wrong: D2 says the command runs both configs, and a
  command that reports nothing about `tests/at` is indistinguishable from one that found it clean.
  Folded as the `tests/at/typecheck.ts` wrapper (§1b), with the "first project fails, second still
  runs" case measured.
- **OQ-4 — the one call site left on the default third parameter. STILL OPEN, and its shape now
  depends on the F3 ruling.** `d-taxonomy-evidence.test.ts:32` keeps
  `defineEvidenceCapture<TaxonomyEvidence, NotificationsSut, World>` and lets the third parameter
  default. It compiles under both the §2a shape and the §2e(iv) variant, and under (iv) the default
  is `Channel = string`, which merely widens `ProviderAttempt<Channel>` to `ProviderAttempt<string>`
  inside a capture producer — and that producer never touches `h`. **My proposal is unchanged: leave
  it**, because a zero diff across all four `*.test.ts` files is the strongest D5 evidence available.
- **R-1 — could the new config reach the app build?** `vite-tsconfig-paths` (bundled inside
  `@lovable.dev/vite-tanstack-config`) discovers tsconfig files under the vite root, so it will now
  find this one. It carries no `paths`, and it governs only files under `tests/at`, which are not in
  the app's module graph — so there is no route to `src/`. ESLint is clear too: `eslint.config.js`
  uses `tseslint.configs.recommended`, the non-type-checked preset, with no `project` or
  `projectService`, so it reads no tsconfig at all. Argument, not measurement — see the optional
  `bun run build` in §5.
- **R-2 — Lovable regenerates `package.json`.** D1's own rationale (Lovable owns and regenerates the
  root config) applies to `package.json` as well, and the `typecheck` script lives there. A
  regeneration could silently drop it, which would restore exactly the defect this item fixes,
  quietly. Nothing inside this item's scope can prevent that; it wants a guard elsewhere (a CI step
  that runs `bun run typecheck`, or a check that the script exists). Flagging it, not fixing it.
- **R-3 — the `@types/node` floor. SETTLED by F6, against my proposal.** I proposed recording it and
  changing nothing. Codex is right that a manifest which *permits* a resolution the check cannot
  survive is not made safe by a lockfile that currently happens to avoid it. Folded: raise the floor
  to `"@types/node": "^22.18.0"` (the first version declaring `ImportMeta.main`), regenerate
  `bun.lock`, and add `bun.lock` to §5 step 7's allowed-diff list. `@types/bun` is **not** added.
  Measured end to end and then reverted, so implementation carries no surprise: the change is one
  line in `package.json` and one line in `bun.lock`, `bun install` reports "533 installs across 637
  packages (no changes)", and the resolved version stays 22.19.17.

## 7. Escalation checks — the four the orchestrator named

Run against the ground truth of §0, all four are negative, so there is nothing to escalate before
implementing:

- **Error count materially different from ~25?** No — **24**, and it is the same family the brief
  describes, corroborated by the previous item's recorded 3-error `registry.ts` baseline. Reported,
  not escalated.
- **Any fix that would change runtime behaviour (D5)?** No — every edit is a type annotation or a
  type parameter. Proven by re-running the whole loop-tier suite with the config in place: 96
  selftests pass and the verify output is byte-identical after normalizing two non-deterministic
  lines.
- **A suite file that cannot conform to `AtHarness` without altering an assertion?** No — the four
  `*.test.ts` files need **no change at all**.
- **Does the generic change force an `any` or a suppression?** No — grep for
  `ts-expect-error`/`ts-ignore`/`any` over the changed files is clean. The single `as` assertion at
  `registry.ts:510` is pre-existing and is disclosed in §2c rather than left for a reviewer to find.

---

## 8. Gate 1 dispositions

Reviewer: codex `gpt-5.6-terra`, effort `max`. Critique: `loop/items/AI4DEV-24/gate1-critique.txt`,
examined against head `518508e` (plan commit) on base `02baf79`. **7 findings, 2 blockers, all seven
raiser-tagged [FALSE-GREEN-CLASS]** — so nothing here is closed by argument; six are closed by a
change plus a measurement, and the seventh is escalated unresolved.

**Opening correction, accepted.** Codex notes the open questions are in §6, not §9. Correct — the
plan never had a §9; the reference in my hand-off note was wrong, the document was not. Numbering
unchanged.

| # | severity | disposition | where |
|---|---|---|---|
| F1 | blocker | **FOLDED — against my proposal.** `skipLibCheck: false`. | §1a, §6 OQ-1 |
| F2 | important | **FOLDED — against my proposal.** `&&` withdrawn; `tests/at/typecheck.ts` wrapper. | §1b, §6 OQ-3 |
| F3 | blocker | **ESCALATED — unresolved, blocking. Implementing nothing.** Reproduced; the proposed fix measured insufficient; one variant measured sufficient. | §2e |
| F4 | important | **FOLDED.** `noUncheckedSideEffectImports: true`. | §1a |
| F5 | minor | **FOLDED, in a stronger shape than either the coordinator or codex specified**, with the deviation flagged and reversible. | §1a |
| F6 | important | **FOLDED — against my proposal.** `@types/node` floor → `^22.18.0`, lockfile regenerated, `bun.lock` added to the allowed diff. | §6 R-3, §5 step 7 |
| F7 | important | **FOLDED.** Normalized baseline and normalizer committed under `loop/items/AI4DEV-24/baseline/`; my description of the normalizer was itself wrong and is corrected. | §5 step 5 |

Detail on the three where the disposition is not simply "did what it said":

- **F5 — folded in a stronger shape.** Codex offered two acceptable fixes; the coordinator chose the
  TypeScript-only extension list plus a README policy sentence. I measured both against codex's own
  failure scenario and took the other branch: a JavaScript helper under `tests/at` carrying a real
  error is **invisible** to the TS-only include and **caught** by `**/*` + `allowJs` + `checkJs`. So
  the policy option narrows the claim until it is true, while this one makes the claim true. The
  coordinator's load-bearing requirement — keep `tests/at/node_modules` out — is honoured with an
  explicit `exclude`, and their premise was right where mine was wrong: that directory really does
  exist, vitest recreates it on every selftest run, and it is invisible in `git status` because it is
  gitignored. One line reverts this if the checkpoint prefers the specified shape.
- **F6 — the lockfile enters the allowed diff.** Folding this widens the item's permitted paths by
  one file. Recorded here rather than done quietly, because §5 step 7 is a merge-checklist box.
- **F7 — the finding was right about more than it knew.** Committing the baseline forced me to write
  the normalizer out properly, and doing so exposed that my §5 description of it was wrong: I said it
  dropped `Duration`/`Start at` lines, which belong to `at:selftest` and never appear in `at:verify`
  output at all. The committed normalizer drops **nothing**; it rewrites one line and unwraps
  PowerShell's stderr wrapping. A reviewer can now re-run it instead of taking my word.

### Effect on §7's escalation checks

Two of the four answers I gave before Gate 1 no longer stand as written:

- "Does the generic change force an `any` or a suppression?" — still **no**, and now measured on the
  §2e(iv) variant too: no `any`, no `@ts-expect-error`, no `@ts-ignore`, and the four `*.test.ts`
  files stay byte-identical to HEAD.
- "Any fix that would change runtime behaviour?" — still **no** for everything folded, but F3's
  runtime-guard option *would*, which is exactly why it is escalated rather than chosen (§2e(v)).
- The §7 claim that "there is nothing to escalate before implementing" is **superseded**: F3 is now
  a live escalation and the implementation of §2 is blocked behind it. §1, §3 and §4 are unblocked.

---

## 9. Implementation record — what actually shipped

Commits on `nirdrang/ai4dev-24-typecheck`, one per work item as planned:

| commit | work item |
|---|---|
| `17e88a9` | W1 — `tests/at/tsconfig.json`, `tests/at/typecheck.ts`, the `typecheck` script, the `@types/node` floor. Committed deliberately red, with the 24-error starting point in the message. |
| `6e17a78` | W2 — `SuiteHarness`, the retyped seam, the `createHarness` annotation, `_bind.ts`. Also carries R3's `HarnessLike` deletion (§3). |
| — | W3 — no commit; nothing remained (§3). |
| `3255f3b` | W4 — `tests/at/README.md`. |

### Verification — all seven steps pass

1. `bunx tsc --noEmit --pretty false` → **exit 0**, no output. Unchanged.
2. `bun run typecheck` → **exit 0**, both projects launched and both clean.
3. `bun run at:selftest` → 6 files, **96 tests**, all pass, exit 0.
4. `bun run at:check req-016` → `RESULT: 12 P0 ids in bijection`, exit 0.
5. `bun run at:verify req-016 --tier loop` → exit 1, 8 green / 4 red — and **byte-identical to the
   committed pre-change baseline**: `Compare-Object` against
   `loop/items/AI4DEV-24/baseline/verify-req-016-loop.baseline.txt` returned nothing. D5 held.
6. `bun run at:verify req-016 --tier loop --expect` → **exit 0**, with the `EXPECTED:` line.
7. `git diff --check` clean; the branch touches only `tests/at/**`, `package.json`, `bun.lock` and
   `loop/items/AI4DEV-24/**`. No `src/`, no `design/`, no `supabase/`, no change to the root
   `tsconfig.json` (D6).

### Coverage — proven, not asserted

The item's own failure mode is "the check exits 0 while checking nothing", so the count is
cross-checked against the filesystem rather than reported from the compiler alone:

- `tsc -p tests/at/tsconfig.json --listFiles` → **29 files under `tests/at`**, **0** leaked from
  `tests/at/node_modules`, 283 files in the whole program counting `lib.*.d.ts` and `@types`.
- Files on disk under `tests/at` outside `node_modules` with a TypeScript or JavaScript
  extension → **29**. Every one is in the program.
- Before this item the same tree had **0** files covered by any configured command.

**The count is 29, not the 28 this plan predicted.** The extra file is `tests/at/typecheck.ts`
itself, which did not exist when the prediction was made and is covered by the config it invokes.

### The defect is closed, and re-checked after implementation

The Gate 1 reproduction was re-run against the shipped tree and now **fails**, which is the point:

```
tests/at/suites/req-016/_f3repro.ts(4,59): error TS2344: Type 'InventedHarness' does not satisfy the constraint 'string'.
tests/at/suites/req-016/_f3repro.ts(7,17): error TS2339: Property 'auditLog' does not exist on type 'SuiteHarness<World, InventedHarness>'.
```

The probe file was deleted; it is not part of the diff. The four `*.test.ts` files were never
touched — the only file changed under `suites/req-016/` is `_bind.ts`.