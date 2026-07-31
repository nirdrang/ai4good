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

```json
{
  "include": ["**/*.ts"],
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true
  }
}
```

Why each option is what it is:

- **`include: ["**/*.ts"]`** — relative to `tests/at`, so it covers all 28 `.ts` files in the tree
  (18 under `harness/`, 9 under `suites/req-016/`, plus `vitest.config.ts`). Proven with
  `--listFiles`. It is a glob and not a file list on purpose: a suite added next month is covered
  the day it is written, which is the whole point of the item. No `exclude` — nothing is generated
  under `tests/at`.
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
- **`skipLibCheck: true`** — see **OQ-1**; both values yield 0 errors today.
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

Together these options are **identical to the ad-hoc command the previous two items had to bolt on**
(`loop/items/hardening-expect/plan.md:766-767`: `--strict --skipLibCheck --target es2022 --module
esnext --moduleResolution bundler --allowImportingTsExtensions --types node`). So this item does not
invent a new standard — it makes the standing check the same check, over the whole tree instead of a
hand-typed file list, which is what "the ad-hoc per-item workaround becomes unnecessary" means.

### 1b. Exact `package.json` script

Added to `scripts`, immediately after `"lint"`:

```json
"typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tests/at/tsconfig.json"
```

- Bare `tsc`, not `bunx tsc`: `bun run` puts `node_modules/.bin` on PATH. Verified in the scratch
  probe — `bun run` of a script whose body is bare `tsc … -p tests/at/tsconfig.json` exits 0.
- `&&` on Windows: verified that bun's script shell honours it and propagates the failing exit
  code — a probe script `node -e "process.exit(3)" && node -e "…"` returned **3** and never ran the
  second command. So "fails if either fails" holds (D2).
- App config first, so the familiar output comes first and the new output is additive.
- The existing `bunx tsc --noEmit` remains exactly what it is; nothing that invokes it changes
  meaning (D2). No existing script is edited.
- Known and accepted property: `&&` short-circuits, so while the app config is red the harness
  errors stay hidden. Alternative in **OQ-3**.

### 1c. The commit

`AI4DEV-24: tests/at typecheck config + typecheck script`, with the full 24-line error list of §0b
in the message body, so the starting point is on the record (W1's explicit instruction). This commit
leaves `bun run typecheck` **failing** — that is intended and is the evidence.

---

## 2. W2 — the registry generics carry the harness type

### 2a. The shape of the change

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

---

## 3. W3 — whatever remains

**Measured: nothing remains.** §0c shows exit 0 after §1 + §2, with no suppression and no `any`.
So W3 is a slot, not a planned edit. If Gate 1 or implementation surfaces something, it lands here
as its own commit; if it stays empty, this plan says so out loud rather than manufacturing a commit
to fill a numbered box.

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
   and reasons listed in §0a — **diffed, not eyeballed**, against `base-verify-loop.txt`. Two lines
   in that output are non-deterministic and only these two: the runner's
   `JSON report written to …/at-verify-<random>/vitest-report.json` and vitest's
   `Duration …` / `Start at …`. The diff normalizes `at-verify-[A-Za-z0-9]+` → `at-verify-XXX`,
   drops the `Duration`/`Start at` lines, and requires `Compare-Object` to return **nothing**. This
   exact procedure already returned nothing for the config-only change (§0d).
6. `bun run at:verify req-016 --tier loop --expect` → **exit 0**, with the `EXPECTED: …(8 declared
   green, 4 declared red)` line.
7. `git diff --check` clean. `git status --porcelain` shows only `tests/at/**`, `package.json`,
   `loop/items/AI4DEV-24/**` — no `src/`, no `design/`, no `supabase/`, no change to the root
   `tsconfig.json` (D6).

Not in the brief's list, offered: `bun run build`. §6 R-1 argues the app build cannot be affected;
if the orchestrator wants that argument replaced by a measurement, this is the measurement.

---

## 6. Open questions and residual risks

Named rather than decided, per the brief's escalation clause. None of them blocks writing the
implementation of §1–§4; **OQ-1** is the only one that changes a line of it.

- **OQ-1 — `skipLibCheck`, which D3 names but does not settle.** D3 says "no `skipLibCheck` on our
  own code". Both values honour that literally: `skipLibCheck` only ever skips `.d.ts` files, and
  `tests/at` contains **zero** `.d.ts` files (verified) — it is arithmetically incapable of skipping
  our code. Measured: `false` also yields **0 errors**, and costs 0.5s (1.4s vs 0.9s). **My
  proposal: `true`** — it matches the root app config, and it matches the ad-hoc command both
  previous items used, so the standing check is byte-for-byte the check it replaces; it also stops
  a third-party `.d.ts` regression in a dependency bump from reddening the harness check for reasons
  that have nothing to do with the harness. **Alternative: `false`** — maximally literal reading of
  D3, free today, at the cost of coupling our check to `@types/*` churn. Say the word and it is a
  one-character change.
- **OQ-2 — `noUnusedLocals` / `noUnusedParameters`.** Both measure 0 errors, so enabling them is
  free today. **My proposal: leave them off**, matching the root config's explicit `false`; D4 asked
  for `strict`, and adding lint-flavoured rules the brief did not request is scope growth that
  future authors inherit. Recorded because "the check is real" could be read to demand them.
- **OQ-3 — `&&` short-circuits.** While the app config is red, `bun run typecheck` never reports the
  harness errors. D2's requirement ("fails if either fails") holds either way. The alternative is to
  run both unconditionally and aggregate the exit codes, which in a portable npm script means a
  wrapper script — more machinery than the brief asked for. **My proposal: keep `&&`**, and note the
  property in `tests/at/README.md`.
- **OQ-4 — the one call site left on the `HarnessLike` default.**
  `d-taxonomy-evidence.test.ts:32` keeps `defineEvidenceCapture<TaxonomyEvidence, NotificationsSut,
  World>`. **My proposal: leave it**, because a zero diff across all four `*.test.ts` files is the
  strongest evidence there is for D5. **Alternative:** add `, AtHarness` for consistency — type-only
  and permitted by D6, but it trades that evidence for symmetry.
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
- **R-3 — `import.meta.main` depends on the `@types/node` floor.** It typechecks because
  `@types/node` ≥ 22.18 declares it; `package.json` allows `^22.16.5`, whose floor does **not**, and
  `bun.lock` pins 22.19.17. A fresh `bun install` honours the lockfile, so this bites only if
  someone regenerates the lock downward. **My proposal: change nothing** — raising the floor is a
  dependency edit the brief did not ask for. Recorded so the dependency is not invisible.

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

_(Appended after the codex `gpt-5.6-terra` @ `max` critique returns. Every finding gets a
disposition here: folded / already decided by the brief / escalated to the orchestrator.)_
