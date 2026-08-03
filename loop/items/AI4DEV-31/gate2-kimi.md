# AI4DEV-31 — Gate 2 review (kimi), on the real tree at 475e951

Reviewer: kimi, in the worktree, against the real tree. Every claim below was executed: the pinned
compiler (`node node_modules/typescript/bin/tsc`, 5.9.3), the runner, and the selftests all ran here.
All scratch files were deleted and every tracked file restored; `git status` shows no content change.

Note: `gate2-terra.md` landed in this directory while this review was running. Both blockers it names
were found here INDEPENDENTLY (the Omit-widening attack and the untested `loadAdapter` rejection
path), and this review adds a third finding terra does not have: the `World`-interface upcast route.
It also ran the two behaviour commands terra could not.

---

## BLOCKER 1 — the body-widening closure is one spelling deep; the seam still widens structurally

`tests/at/harness/registry.ts:201` claims: "the only close is to make the widened type UNSPELLABLE:
a suite that cannot name a shape here cannot widen one." Measured false. A suite rebuilds the
widened type out of the EXPORTED `<R, K>` types and `Omit`, never naming a shape-parameterized
harness type:

```ts
type WidenedContext = Omit<AtContext<'req-016', 'notifications'>, 'open'> & {
  open(): Promise<
    Omit<OpenWorld<'req-016', 'notifications'>, 'sut'> & {
      sut: SutOf<'req-016', 'notifications'> & { invented?: string };
    }
  >;
};
suite.atTest('AT-016.97', '…', async (ctx: WidenedContext) => {
  const { sut } = await ctx.open();
  void sut.invented;            // compiles; undefined at run time
});
```

Compiled under the acceptance config via a child config (`extends ../tsconfig.json`, `files: [probe]`):
**EXIT 0**, on BOTH the sut axis and the world axis. Controls: `--listFiles` shows the probe in the
program (221 files); appending `const e: number = 'x'` fails the same command with TS2322, exit 2.
No `any`, no `as`, no `@ts-ignore`, no `declare

• Review complete. Full report written to `loop/items/AI4DEV-31/gate2-kimi.md`. Everything below was executed against the real tree, not reasoned from the diff; all scratch files were deleted and the tree restored (`git status` shows no content change). Note: a `gate2-terra.md` from another reviewer landed in the item directory mid-review — my two shared findings were made independently before I read it, and the `World` finding is one it does not have.

  **BLOCKER 1 — the body-widening closure is one spelling deep.** `registry.ts:201` claims the widened type is now "UNSPELLABLE… a suite that cannot name a shape here cannot widen one." I compiled this attack under a child config of the acceptance tsconfig — **exit 0**, on both the sut and world axes, with `--listFiles` and a deliberate-error control proving the compile was real:

  ```ts
  type WidenedContext = Omit<AtContext<'req-016','notifications'>, 'open'> & {
    open(): Promise<Omit<OpenWorld<'req-016','notifications'>, 'sut'> &
      { sut: SutOf<'req-016','notifications'> & { invented?: string } }>;
  };
  suite.atTest('AT-016.97', '…', async (ctx: WidenedContext) => { void (await ctx.open()).sut.invented; });
  ```

  No `any`, cast, suppression, or module augmentation. The design itself says why nothing can stop it (optional-member intersections are assignable both ways), so the fix is honesty, not machinery: reword `registry.ts:201`, `_bind.ts:23`, `type-invention.selftest.ts:252`, `contracts.ts:161`, and `proof-green.txt` §3 to state what is actually stopped and put structural reconstruction on the documented not-closed list.

  **BLOCKER 2 — `World` stayed an interface, and the upcast route is open.** Gate 1 finding 7 measured only the direct read (`open().w.invented` → TS2339). But the class implements `World`, so `const asWorld: World = w` needs no cast, and a member merged into the `World` interface via `declare module` then reads green — measured exit 0. This is exactly the optional-member lie D5 converted eight types to kill, and `World` is on the seam path (the suite itself spells it at `d-taxonomy-evidence.test.ts:23`). The ruling's own condition ("no remaining seam path resolves to `World`") fails. Fix is cheap and in scope: convert `World` to an alias, add it to `SEAM_ALIAS_PROTECTED` with a probe attack, correct the two "why World is absent" records.

  **IMPORTANT — `loadAdapter()`'s requirement check has no failing-path test.** Every synthetic adapter in the runner selftests carries the correct literal, so deleting the check at `index.ts:72` leaves all 140 tests green. The `atTest` cross-check, by contrast, is genuinely tested both ways. Fix: one synthetic-tree test with a wrong (and one with a missing) literal, asserting the throw names both values.

  **MINOR** — `suite-adapters.ts:18`/`README.md:62` ("the compile error says what to add" — the real TS2322 names no remedy) and `README.md:48` ("takes no type arguments at all" — it still takes `<R, K>`, just not shapes).

  Verified sound: red half reproduced live at pre-fix commit `da4a015` (exit 0, probe in program); green probes rerun with every asserted marker present; reverting `Delivery` to an interface failed exactly its named selftest (restored, 43/43); map constraint rejects a teardown-less world and a requirement/key mismatch at the entry; runner selftests changed zero assertion lines; the 8-alias list is otherwise exhaustive. Behaviour, all run here: `typecheck` exit 0, `at:verify req-016 --tier loop --expect` exit 0 with 8/4/0 matching expected, `at:selftest` 140/140, `at:check` in bijection.

  **Verdict: do not merge as written.** Blocker 2 is a mechanical in-scope fix; blocker 1 requires the comments to stop claiming a closure the type system cannot give; plus the `loadAdapter` negative test.

cond with no) `requirement`, asserting the run fails and the message names both real values. The
black-box machinery to do this already exists.

## MINOR — two doc overpromises

- `suite-adapters.ts:18` and `tests/at/README.md:62`: "the compile error says what to add." The real
  diagnostic is `Type '"req-999"' is not assignable to type '"req-016"'` — it names no remedy.
  Reword, since tsc messages are not ours to change.
- `tests/at/README.md:48`: "`bindSuite` … takes no type arguments at all." It still has type
  parameters `<R, K>`; what a suite cannot pass is SHAPES. Reword to the design's own phrasing
  ("no type argument left to lie with").

## Sound — verified, one line each

- Overload merging on all three const entry points fails TS2451; the probe covers each, asserted by name.
- The map constraint rejects a world without `teardown()` AND a `requirement`/key mismatch AT the entry (`suite-adapters.ts:80`) — built both counter-examples live; the messages name the offending entry and both literals.
- Red half reproduced live: scratch worktree at `da4a015` (probe committed, source pre-fix), same command → **exit 0**, probe in the program via `--listFiles`; worktree removed after.
- Green half rerun: both probe compiles exit 2 and every marker the selftest asserts is present in the real output.
- Per-name failure verified: `Delivery` back to `interface` → exactly `rejects a member merged into Delivery` failed (42/43 passed); restored, 43/43 green.
- The 8-alias list is exhaustive over `open().sut`'s reach (`Role`/`Channel`/`Tone`/`EventClass` are unions; `TaxonomyRow`/`ChannelRule` are not handed to bodies) — exhaustive, that is, except for `World`, which is blocker 2.
- Runner black-box/expect selftests: zero assertion lines changed; the diff is setup-only (`suitePreamble(requirement)` + adapter tag). Both still execute the real runner against synthetic trees.
- `requirementMismatch` normalizes `016` vs `req-016` correctly (dotted-id case `AT-005.5.03` also tested) and its errors name both values.
- `executeRegisteredBody` staying shape-generic is justified: it builds nothing harness-backed; the comment says exactly that.
- No dead machinery found; nothing deleteable without losing a guarantee.

## Behaviour — run here, all green

- `bun run typecheck` → exit 0 (both configs).
- `bun run at:verify req-016 --tier loop --expect` → exit 0, `12 P0: 8 green, 4 red, 0 missing`, matching `expected/req-016.json` exactly.
- `bun run at:selftest` → exit 0, 7 files, 140 tests.
- `bun run at:check req-016` → exit 0, 12 P0 in bijection.

## Failed attacks (the evidence item 1 asks for)

Tried and rejected: `declare module` overloads on all three entry points (TS2451); legacy
`bindSuite<Sut, W>` / `defineEvidenceCapture<T, Sut, W>` (TS2344/TS2554); unregistered requirement
(TS2322); misspelled sut key (TS2322); undeclared members off derived `sut`/`w` (TS2339);
augmenting each of the eight aliases (TS6200); constructing `EvidenceCapture` (TS2693); annotating
the body with `AtContext<shape, shape>` (TS2344/TS2345); reaching raw `atTest` directly (derives
identically). Succeeded: the two blockers above.

## VERDICT — do not merge as written

Merge once blocker 2 is fixed (mechanical, in scope) and blocker 1's claims are reworded to the
truth, plus the `loadAdapter` negative test (important). Blocker 1 needs no new machinery — it
needs the comments to stop claiming a closure the type system cannot give.
