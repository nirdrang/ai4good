# AI4DEV-31 — executor brief

You are the OPUS executor. You write the code. **Every design decision below is already made — you
implement it, you do not invent it.** If you believe a decision is wrong, STOP and report to me (the
item agent) with the reasoning; do not quietly do something else. That escalation costs nothing and
is expected; a silent deviation is the one thing that is not allowed.

Read `loop/items/AI4DEV-31/design.md` in full before writing anything. This brief is the
implementation order; the design is the reasoning behind it.

## Ground rules

- PowerShell only, never Bash. `bun`, never npm/pnpm.
- Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\agent-ae7047f6712c0743a`.
  Branch `nirdrang/ai4dev-31-the-sut-seam-is-an-unverified-claim-openworld-hands-back`. Do not
  switch branches, do not create worktrees.
- **Commit and push after every numbered step below.** A previous agent on this item died mid-turn
  and lost everything it had not pushed. An incomplete artifact on the remote beats a perfect one in
  a worktree that evaporates.
- Match the existing house style: dense explanatory comments that say *why*, not *what*; every
  comment that makes a claim must be true of the code beside it. This codebase's comments are load-
  bearing documentation and reviewers check them against the code.
- Do not touch anything outside the file list in design.md §5.

## The measured baseline you must not regress

Taken on this worktree at `761aaa9` after `bun install`:

| command | result |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run at:verify req-016 --tier loop --expect` | exit 0 — `12 P0: 8 green, 4 red, 0 missing`, matching `tests/at/expected/req-016.json` exactly |
| `bun run at:selftest` | exit 0 — 7 files, 114 tests passed |

All three must hold at the end, with the identical 8/4/0 split and 114+ tests. If a number changes,
that is a finding to report, not a number to update.

## GATE 1 HAS RUN. Read `gate1-rulings.md` — it overrides parts of design.md

The design went through an adversarial gate (codex terra at max) that **ran the compiler** rather
than reasoning from the document, and it corrected several things I had predicted from analogy.
`gate1-rulings.md` is authoritative where it and `design.md` disagree. The corrections that change
your work most:

- **My predicted diagnostics were wrong.** Do NOT hard-code a predicted TypeScript error code
  anywhere. Run the compiler, read the code it actually emits, assert that. (The fabrication attack
  gives TS2344, not the TS2558 design.md predicts.)
- **My proof-isolation method does not work.** `tsc <file>` does not inherit a config; `-p` cannot be
  combined with a filename. Use a committed child tsconfig per probe (below).
- **`World` comes OUT of the D5 conversion list** (see step 3).
- **Exported `function` declarations can be augmented with an extra overload** — the alias doctrine
  does not protect them. See step 2.

## Step 0 — capture the RED half of the proof FIRST, before any fix

This is the deliverable, not a formality, and it is **impossible to reproduce once you have changed
`registry.ts`**. Do it first, and push it before touching a source file.

Write `tests/at/typeprobes/sut-seam-legacy.probe.ts` containing the attacks **written in the form a
suite can use on TODAY's tree** — the current `bindSuite<Sut, W>(...)` and
`defineEvidenceCapture<T, Sut, W>(...)` signatures. Cover at least: a fabricated SUT type read
through `open()`; a fabricated world type read through `open()`; and the same two through
`defineEvidenceCapture`'s generics. Shape:

```ts
const t = bindSuite<{ notThere(): Promise<void> }, World>({ sut: 'notifications' });
t('AT-016.99', 'reads a fabricated sut member', async ({ open }) => {
  const { sut, w } = await open();
  await sut.notThere();
  void (w as unknown as { invented?: string }).invented;
});
```

Give it a **committed** child config `tests/at/typeprobes/tsconfig.sut-seam-legacy.json` that
`extends` `../tsconfig.json` (the acceptance config), sets `"files": ["sut-seam-legacy.probe.ts"]`
and `"include": []`, and compile it with the pinned compiler via `-p`:

```
node node_modules/typescript/bin/tsc --noEmit --pretty false -p tests/at/typeprobes/tsconfig.sut-seam-legacy.json
```

**Expected: exit 0 — it compiles clean.** That is the defect, executed. Capture the command, the
exit code and the output into `loop/items/AI4DEV-31/proof-red.txt`.

**Rule out the empty-program exit 0**, which is the way this evidence could be a lie: a config that
matches no files also exits 0. Include `--listFiles` output (or an equivalent positive control, e.g.
show that inserting a deliberate error into the probe makes the same command fail) in the transcript.
Without that control the red half proves nothing.

If it does NOT compile clean, STOP and report — either the attack is written wrong or the hole is not
where we think it is, and I need to know before you go further.

After the fix this same file must FAIL. It stays in the tree as a permanent guard.

## Step 1 — the derived registry

New file `tests/at/harness/suite-adapters.ts`, types only. Exactly the shape in design.md §2 (D1),
which was **verified by spike** — see `loop/items/AI4DEV-31/spike-raw.txt`; it resolves
`SutOf<'req-016','notifications'>` to `NotificationsSut` exactly, and `WorldOf<'req-016'>` to a world
assignable to `World` and satisfying the teardown constraint.

**D3, corrected (Gate 1 finding 5).** The type shapes in design.md §2 do NOT actually constrain
anything — I wrote derivations, not a constraint. Wrap the map in a generic constraint that requires
each entry's adapter to have at least `sut`, `fixtures.world(): Promise<WorldLike>` and `teardown()`,
so a malformed adapter fails **at the map entry** where it is written. The reviewer verified the real
adapter satisfies such a constraint and that a world missing `teardown()` fails at the entry.

**Blocker 2, the self-identifying adapter.** The map key and the module actually loaded at run time
are still two independent facts — `AdapterModules['req-016']` could name `req-017/_fixture.ts` by a
typo while `adapterUrl()` loads `req-016/_fixture.ts`, and nothing notices. Close it:

- each fixture module exports `export const requirement = 'req-016' as const;`
- each map entry is constrained so its module's `requirement` literal **equals its key** — a
  mismatched entry fails in `suite-adapters.ts`
- `loadAdapter()` in `tests/at/harness/index.ts` validates the same literal at run time against the
  requirement it was asked for, and throws naming both values

The synthetic adapters generated by the runner selftests need the tag too (step 4). They are not in
the type map and do not need to be — the run-time check compares what the adapter declares against
what was requested.

The file's header comment must say what it is for: that the harness's knowledge of its suites is now
explicit and checked rather than a path convention, that a new suite adds one line here, and that the
`requirement` literal is what ties the entry to the module the loader actually resolves.

## Step 2 — `registry.ts`: derive instead of accept

Apply design.md D1, D2, D4, D4b:

- `bindSuite<R extends SuiteId, K extends SutKeyOf<R>>({ requirement, sut, sutMissingDetail })`,
  returning the bound `atTest` **and** a bound `defineEvidenceCapture`, both carrying
  `SutOf<R, K>` / `WorldOf<R>`.
- `atTest`'s options carry the requirement so it derives too; a suite must not be able to supply
  `Sut`/`W` to it directly.
- **D4b is not optional and is easy to under-do.** Every exported symbol generic over `Sut` or `W`
  is a door: `OpenWorld`, `AtContext`, `EvidenceCapture`, `defineEvidenceCapture`, `AtTestBody`,
  `executeRegisteredBody`, `InternalContext`, `atTest`, `bindSuite`. Each must either derive or be
  unreachable from a suite with suite-supplied arguments. Walk the list and say in your report what
  you did to each one.
- **`OpenWorld.h` does not change.** It stays concrete `AtHarness`. Re-parameterizing the harness is
  the door AI4DEV-24 shut with two adversarial gates and reopening it is out of the question.
- **Exported `function` declarations are a door the alias doctrine does not cover** (Gate 1
  blocker 1, verified: a `declare module` overload on `bindSuite` restoring a required invented SUT
  member compiles cleanly). So `bindSuite`, `atTest` and `defineEvidenceCapture` must stop being
  exported `function` declarations and become `const` bindings typed by alias call signatures, which
  cannot be merged into. Add a probe attack for the overload route and assert it by name.
- D4: `atTest` asserts at registration that the AT id's requirement equals the bound requirement,
  throwing where it is written, with a message naming both values and saying what would otherwise
  happen (the harness loads one suite's adapter while the type-check described another's).
  **Normalize the formats** (Gate 1 finding 6): `parseAtId('AT-016.01').requirement` is `"016"` while
  the binding and map key are `"req-016"`, so compare against `` `req-${parsed.requirement}` ``. A
  literal comparison would reject every valid suite. Keep the field mandatory. Add run-time selftests
  for both the missing-field and the mismatch cases — the check itself needs a test.
- The cast at the end of `open()` must survive only at the narrowest possible point, with a comment
  stating exactly what remains unchecked and why. Rewrite the `OpenWorld` doc comment
  (`registry.ts:160-180`): it currently says `w` and `sut` "are still the suite's own claims,
  asserted rather than verified. That is the pre-existing seam AI4DEV-31 owns." **That sentence
  becomes false with this change and must be replaced by an accurate one.** Do not leave a comment
  that describes the old defect as if it were current — a stale comment here is exactly the kind of
  false statement this item exists to remove.

## Step 3 — the suite side

- `tests/at/suites/req-016/_bind.ts`: names its requirement and sut key; exports the bound `atTest`
  and the bound evidence-capture helper. Its comment (lines 20-22) already says the suite "cannot
  name — or re-label — the harness TYPE"; extend that to say it can no longer name its own SUT or
  world type either, and why.
- `tests/at/suites/req-016/d-taxonomy-evidence.test.ts`: import the bound capture helper instead of
  the raw generic.
- `tests/at/suites/req-016/_fixture.ts`: add `export const requirement = 'req-016' as const;`.
- `tests/at/suites/req-016/_contract.ts` (D5, **corrected by Gate 1 finding 7**): convert these
  EIGHT to type aliases — `NotificationsSut`, `SenderProbe`, `RegisteredRow`, `DocumentedDefault`,
  `NotificationEvent`, `Delivery`, `OpsItem`, `EmitResult`. They are the SUT and the values its
  methods return, so they are all on the seam path.

  **`World` is deliberately NOT in that list.** The reviewer verified that after D1 `open().w` is the
  concrete `NotificationFixtureWorld`, and that augmenting the `World` interface still yields TS2339
  on `open().w.invented` — a class does not acquire interface members merely by implementing the
  interface. So converting it buys nothing.

  **Condition on that ruling:** confirm for yourself that no remaining seam path resolves to `World`
  once the capture helper is suite-bound. If one does, convert it, and say so in your report. Either
  way, record in the selftest WHY `World` is absent from the protected list, so a later author does
  not "restore uniformity" without knowing.

  **Superseded during Gate 2.** This instruction was overturned. The reasoning above measured only
  the direct read (`open().w.invented`) and missed the upcast route: because the fixture class
  implements `World`, a plain `const asWorld: World = w` needs no cast, and a member merged into
  the `World` interface then reads green. `World` was therefore converted to a type alias after
  all, and IS in the protected list. The full reasoning is in `gate2-rulings.md`, which wins
  wherever it disagrees with this brief.

## Step 4 — the runner selftests' synthetic suites

`tests/at/harness/runner-blackbox.selftest.ts:63-69` and `runner-expect.selftest.ts:57-59` generate
suites at run time whose shared preamble calls `bindSuite({ sut: 'probe', … })` with no requirement.
They are never type-checked but they ARE executed, so D4's cross-check throws on them as written.

Parameterize `suitePreamble(requirement)` to emit the requirement, and update **every** call site to
pass its own (901-906 and whatever else you find — check both files exhaustively).

**Do not change what these tests assert.** They are the runner's black-box guarantees; trading their
proof for ours would be a bad deal. If one cannot be made to pass without weakening an assertion,
stop and report.

## Step 5 — the GREEN half of the proof, and the selftest

- Re-compile `sut-seam-legacy.probe.ts` with its committed child config, same command as step 0,
  into `loop/items/AI4DEV-31/proof-green.txt`. **Expected: non-zero.** That is the red-then-green
  pair: the same file, the same command, exit 0 before and non-zero after.
- Add `tests/at/typeprobes/sut-seam.probe.ts` — the NEW-API attacks, which are only meaningful after
  the change — with its own committed child config. These carry: reading a member the adapter's sut
  does not declare; reading a member the adapter's world does not supply; naming a sut key the
  adapter does not have; the `declare module` overload attack on each of the three `const` entry
  points; and one module-augmentation attack per protected alias.
- **Do not predict diagnostics.** Run the compiler, read the codes it actually emits, and assert
  those. Record the real output in the transcripts.
- Extend `tests/at/harness/type-invention.selftest.ts` so **each protection is asserted by name and
  per probe file** — asserting only that the combined output contains some code is what Gate 1
  called unsound. Removing any single protection must fail a test that says which one. Follow that
  file's own doctrine: the list is a SPECIFICATION, not a sample, and probe and list must not be
  able to drift apart silently.
- The alias list must be **exhaustive over the eight converted contracts** (Gate 1 blocker 4:
  claiming exhaustive coverage while attacking two of nine is the exact failure AI4DEV-24's own
  reviewers caught in that item).
- Keep the existing whole-program probe assertion working.

## Step 5b — say what is NOT closed, in the code

Gate 1 finding 8, accepted: `any`, `as`, `@ts-ignore`, `@ts-nocheck`, run-time mutation and an
adapter supplied through `AT_REPO_ROOT` all remain open, and this change does not close them. The
threat model is *a suite drifting from the harness with nobody able to detect it* — an honest mistake
that type-checks green — not an author determined to defeat the type system.

Write that into the `suite-adapters.ts` header and the `OpenWorld` comment. A closure claim broader
than the truth is this item's own defect, and the comments here are read as documentation.

Also update `tests/at/README.md:48`, which still tells suite authors they parameterize `bindSuite`
with their own types and channels. That instruction becomes false.

## Step 6 — verify, exhaustively

Run and capture all of these into `loop/items/AI4DEV-31/verify-post.txt`:

1. `bun run typecheck` → exit 0
2. `bun run at:verify req-016 --tier loop --expect` → exit 0, 8 green / 4 red / 0 missing
3. `bun run at:selftest` → exit 0, all tests pass
4. `bun run at:check req-016` (the bijection checker) → whatever it did before, unchanged
5. `bun run lint` → report the result; if it was already failing on main, say so rather than fixing
   unrelated lint

Then report to me with: what you changed and why, what each of the D4b doors got, the red and green
transcripts, any place where the design was wrong or under-specified, and anything you had to decide
that the design did not cover. **List the decisions you made that were not in the design — I need to
rule on them.**

Do not open a pull request. Do not merge. That is mine.
