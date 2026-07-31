# `tests/at` — the acceptance-test tree, and its own type-check

## Two tsconfigs, on purpose

| file | covers | what it is |
|---|---|---|
| `/tsconfig.json` | `src/**`, `vite.config.ts`, `eslint.config.js` | Lovable's application build: TanStack Start, JSX, DOM libs, bundler resolution |
| `/tests/at/tsconfig.json` | everything under `tests/at` | this tree: Node-side, no DOM, `types: ["node"]`, `.ts` import specifiers, `strict` |

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

Runs **both** configs and fails if **either** fails.

It is a small wrapper (`tests/at/typecheck.ts`), not `tsc -p a && tsc -p b`, because `&&` stops at
the first failure: an error in the app config would prevent the acceptance-test check from ever
starting, and a command that says nothing at all about `tests/at` reads exactly like one that found
it clean. Both projects are always launched; the exit code is the aggregate.

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
- **The harness shape is not a suite's to invent.** A suite parameterizes `bindSuite` with its
  system under test, its fixture world and its channel names — never with a harness type. The
  harness comes from the single shared contract in `harness/contracts.ts`, which
  `harness/index.ts`'s `createHarness` is statically checked to produce. A free harness parameter
  would let a suite declare seams the factory never supplies and still type-check green.
