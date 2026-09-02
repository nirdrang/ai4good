# `tests/at` — the acceptance-test tree, and its own type-check

## Two tsconfigs, on purpose

| file | covers | what it is |
|---|---|---|
| `/tsconfig.json` | `src/**`, `vite.config.ts`, `eslint.config.js` | Lovable's application build: TanStack Start, JSX, DOM libs, bundler resolution |
| `/tests/at/tsconfig.json` | everything under `tests/at` | this tree: Node-side, no DOM, `types: ["node"]`, `.ts` import specifiers, `strict` |
| `/.claude/skills/verify-ai4good/scripts/tsconfig.json` | the verify drive scripts | extends the acceptance config so the drive and `live-stack.ts` cannot disagree |

They are **not** one widened `include`, and the separation is not stylistic:

- **Their settings genuinely differ.** The app needs `lib: ["ES2022","DOM","DOM.Iterable"]` and
  `jsx: "react-jsx"`. The harness is Node-side and must have neither — harness code reaching for
  `document` or `window` should be a compile error, and it is only an error if DOM is absent.
- **Lovable owns and regenerates the root config.** Coupling the harness check to a file another
  tool rewrites means a regeneration could silently stop checking this tree. That is precisely the
  failure this arrangement exists to prevent: before AI4DEV-24 the root `include` was `src/**` only,
  so `bunx tsc --noEmit` — the command every verification report in this project quotes as
  evidence — never read `tests/at` at all, and every "tsc exit 0" claim about the harness was a
  claim about `src/`.

## `bun run typecheck`

Runs **all three** projects and fails if **any** fails.

It is a small wrapper (`tests/at/typecheck.ts`), not `tsc -p a && tsc -p b`, because `&&` stops at
the first failure: an error in the app config would prevent the acceptance-test check from ever
starting, and a command that says nothing at all about `tests/at` reads exactly like one that found
it clean. All three projects are always launched; the exit code is the aggregate.

The wrapper lives here rather than in a repo-level `scripts/` because AI4DEV-24's allowed paths
stopped at `tests/at/**` and `package.json`. If a `scripts/` directory is ever added, this is a
natural thing to move into it.

`bunx tsc --noEmit` still means what it always meant — the app config alone — so nothing that
already invokes it changed meaning.

## Conventions this tree's config enforces

- **TypeScript only.** `include` is `**/*` with `allowJs` and `checkJs` on, so a JavaScript file
  dropped in here is type-checked rather than silently skipped. Write TypeScript; the config is
  what makes that a checked rule instead of a request.
- **`node_modules` is excluded explicitly.** Naming an `exclude` at all replaces TypeScript's
  default, and vitest recreates `tests/at/node_modules` (its own cache) on every `at:selftest` run.
- **`skipLibCheck` is `false`.** It cannot distinguish a third-party `.d.ts` from a first-party one
  written under `tests/at`, and skipping our own declarations is the defect this check exists to
  remove.
- **A suite names STRINGS, never types.** `bindSuite({ requirement: 'req-016', sut: 'notifications' })`
  is the whole of a suite's contact with the harness. It still has type parameters — `<R, K>` — but
  they are a requirement id and a system-under-test key, so **there is no type argument left to lie
  with**: the harness comes from the single shared contract in `harness/contracts.ts`, and the system
  under test and the fixture world are read off the adapter registered for that requirement in
  `harness/suite-adapters.ts` — the same module `harness/index.ts` loads at run time.

  It used to take three SHAPES: the harness type (removed by AI4DEV-24) and then the
  system-under-test and world types (removed by AI4DEV-31). Each was a claim nothing checked, so
  `bindSuite<AnythingAtAll, AnythingAtAll>` type-checked green and a body could read members no
  runtime value supplies.

- **Adding a suite is one line in `harness/suite-adapters.ts`,** plus
  `export const requirement = 'req-0NN' as const;` in that suite's `_fixture.ts`. Until both exist
  the suite cannot bind. The compile error is `Type '"req-999"' is not assignable to type '"req-016"'`,
  which names the problem and **not** the remedy — tsc's wording is not ours to change, so the two
  lines to add are written out here and in `harness/suite-adapters.ts` instead. The literal is what
  ties the map key, the module the types are read from, and the module the loader actually imports to
  one self-declared value — checked at the map entry and again at run time in `loadAdapter()`, whose
  two failing paths are exercised in `harness/runner-blackbox.selftest.ts`.

- **What IS closed.** A suite can no longer **name** the seam types. Every route the old API invited
  is shut: no shape arguments on `bindSuite` / `atTest` / `defineEvidenceCapture`, no
  shape-parameterized type exported for a body to annotate with, no constructor to reach
  `EvidenceCapture` through, no function declaration to merge a fresh overload onto, and no interface
  on the seam path to merge a member into.

- **What that does NOT close.** `any`, `as`, `@ts-ignore`, `@ts-nocheck`, mutating an adapter after
  it is built, pointing `AT_REPO_ROOT` at another tree, and **rebuilding a widened context by hand**
  out of the derived types — `Omit<AtContext<R, K>, 'open'> & { open(): Promise<OpenWorld<R, K> &
  { sut: { invented?: string } }> }`, which was measured compiling clean with no cast and no
  suppression (`loop/items/AI4DEV-31/gate2-widen-reproduction.txt`). No type can reject that last one:
  a type and that type intersected with an optional member are assignable in both directions.
  Rejecting it needs a source-inspection pass, filed as its own item (AI4DEV-37). The threat model
  is a suite drifting from its harness with nobody able to notice — an honest mistake that
  type-checks green — not an author set on defeating the type system, who can always write a cast.

The integration tier's one stack — the identity read, the reset, the migration proof,
and the evidence line — lives in `harness/local-stack.ts`. The machine-wide lock lives in
`harness/stack-lock.ts`. The runner in `harness/runner.ts` grades per AT id and imports those
modules; it is not the home of the identity read or the lock.
