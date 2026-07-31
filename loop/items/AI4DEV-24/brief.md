# BRIEF — AI4DEV-24: make the AT harness and suites visible to the typechecker

Hardening item 3 of 3 for switching autonomous merge on. Branch `nirdrang/ai4dev-24-typecheck`,
worktree `C:\Users\nirdr\Downloads\ai4good-tsconfig`, based on `origin/main` (`02baf79`).

**Why this exists.** `tsconfig.json`'s `include` lists only `src/**`, `vite.config.ts` and
`eslint.config.js`. So `bunx tsc --noEmit` — the command every verification report in this
project quotes as evidence — **never reads `tests/at/` at all.** The harness passes the
type-check because the type-check does not look at it. Every "tsc exit 0" claim about the
harness has been a claim about `src/` only, and both items shipped so far had to bolt on an
ad-hoc config-free typecheck to get any coverage of the code they were actually writing.

**Done when** the standard type-check covers `tests/at/**`, all of it passes, and the ad-hoc
per-item workaround becomes unnecessary.

---

## Decisions — pre-made. Anything not decided here is an escalation.

### D1 — A SEPARATE tsconfig for the tests, not an extension of the app's
Add `tests/at/tsconfig.json` covering `tests/at/**`, and wire it into the standard check.
Do NOT simply widen the root `tsconfig.json` `include`: the app is a Lovable-owned TanStack
build with DOM libs, JSX and bundler resolution; the harness is Node-side code with different
lib and module needs, and Lovable regenerates the root config. Their settings genuinely differ,
and coupling them means a Lovable regeneration can silently break the harness check.

### D2 — The command surface
`bun run typecheck` runs BOTH configs and fails if either fails. Add it to `package.json`.
Leave the existing `bunx tsc --noEmit` behaviour for the app config untouched, so nothing that
currently invokes it changes meaning.

### D3 — Fix the errors, do not suppress them
The ~25 errors are one family: `open()` returns an `OpenWorld` whose `h` is the registry's
minimal `HarnessLike`, so every `h.clock` / `h.config` / `h.faults` / `h.static` / `h.vendors`
in a suite body is `TS2339`, with implicit-any cascades behind. Plus three generic-constraint
complaints inside `registry.ts`.

The fix is to make the registry's context generics carry the harness type, so `_bind.ts` can
supply REQ-016's `AtHarness` (the shared contract already exists in `tests/at/harness/contracts.ts`).
**No `@ts-expect-error`, no `any` to make a number go down, no `skipLibCheck` on our own code.**
A suppressed error is a type-check that lies, which is the same defect as the one being fixed.

### D4 — `strict` is on
The new tsconfig sets `strict: true`. If that surfaces errors beyond the ~25 known, they are
in scope: this item's purpose is that the check is real.

### D5 — Behaviour must not change
This is a types-and-config item. No runtime behaviour changes. The proof is that the full
verification suite reports exactly what it reports today, byte-for-byte where it is diffable.

### D6 — Scope boundary — do NOT touch
`src/`, `design/`, `supabase/`, the root `tsconfig.json`'s existing `include` semantics for the
app, the REQ-016 suite's assertions, or `capabilities.ts` behaviour. Type annotations that change
no runtime semantics are fine anywhere under `tests/at/**`.

---

## Work items (one commit each)

- **W1** — `tests/at/tsconfig.json` + the `typecheck` script. Commit with the error list it
  produces, so the starting point is on the record.
- **W2** — the registry generics: `AtContext`, `OpenWorld`, `atTest`, `bindSuite` carry the
  harness type; `_bind.ts` supplies `AtHarness`.
- **W3** — whatever remains after W2, fixed properly.
- **W4** — a short note in `tests/at/README.md` (create if absent): what the two configs are and
  why they are separate.

## Verification — the expected state for THIS item

1. `bunx tsc --noEmit --pretty false` (app config) → exit 0, unchanged.
2. `bun run typecheck` → exit 0, **covering `tests/at/**`**. Report the file count it checked,
   so coverage is proven rather than asserted.
3. `bun run at:selftest` → 96 tests, all pass.
4. `bun run at:check req-016` → 12 P0 ids in bijection.
5. `bun run at:verify req-016 --tier loop` → exit 1, 8 green / 4 red, **diffed** against a
   capture taken before you change anything.
6. `bun run at:verify req-016 --tier loop --expect` → exit 0.
7. `git diff --check` clean; only `tests/at/**`, `package.json`, `loop/items/AI4DEV-24/**` touched.

## Escalate (do not decide)

- Any error whose honest fix would change runtime behaviour.
- Any error that cannot be fixed without touching a D6 path.
- Any temptation to suppress rather than fix — bring it to me instead.
- If the true error count is materially different from ~25, stop and report before fixing.
