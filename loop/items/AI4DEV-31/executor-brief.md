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

## Step 0 — capture the RED half of the proof FIRST, before any fix

This is the deliverable, not a formality, and it is **impossible to reproduce once you have changed
`registry.ts`**. Do it first.

Write `tests/at/typeprobes/sut-seam.probe.ts` containing the attacks in design.md §3, **written in
the form a suite can use on TODAY's tree** — i.e. using the current
`bindSuite<Sut, W>(...)` and `defineEvidenceCapture<T, Sut, W>(...)` signatures. Example of the
shape (the fabricated-SUT attack):

```ts
const t = bindSuite<{ notThere(): Promise<void> }, World>({ sut: 'notifications' });
t('AT-016.99', 'reads a fabricated sut member', async ({ open }) => {
  const { sut, w } = await open();
  await sut.notThere();          // must not compile after the fix
  void (w as { invented?: string }).invented;
});
```

Then compile **that file alone** with the pinned compiler and the probe config's options, into
`loop/items/AI4DEV-31/proof-red.txt`, recording the command and the exit code.

**Expected: exit 0 — it compiles clean.** That is the defect, executed. If it does NOT compile
clean, stop and report: either the attack is written wrong or the hole is not where we think it is,
and both are findings I need before you go further.

Isolation matters here: `tests/at/typeprobes/tsconfig.json` includes `**/*.ts`, so the whole probe
program already fails because of attacks 1-4. Compile the single new file with an explicit temporary
config that `extends` `tests/at/tsconfig.json` and includes only that file, so the exit code
describes only the new attacks. Guard against a misleading exit 0: the transcript must show the file
was actually found and checked (a config that matches no files also exits 0 — that failure mode must
be ruled out in the transcript, e.g. by `--listFiles` or by a deliberate syntax error trial).

Commit and push the red transcript **before** touching any source file.

## Step 1 — the derived registry

New file `tests/at/harness/suite-adapters.ts`, types only. Exactly the shape in design.md §2 (D1),
which was **verified by spike** — see `loop/items/AI4DEV-31/spike-raw.txt`; it resolves
`SutOf<'req-016','notifications'>` to `NotificationsSut` exactly, and `WorldOf<'req-016'>` to a world
assignable to `World` and satisfying the teardown constraint.

Include D3: constrain the map so every entry's world extends `WorldLike`, so an adapter whose world
forgets `teardown()` fails where the entry is written.

The file's header comment must say what it is for: that the harness's knowledge of its suites is now
explicit and checked rather than a path convention, and that a new suite adds one line here.

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
- D4: `atTest` asserts at registration that the AT id's requirement equals the bound requirement,
  throwing where it is written, with a message naming both values and saying what would otherwise
  happen (the harness loads one suite's adapter while the type-check described another's).
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
- `tests/at/suites/req-016/_contract.ts` (D5): convert the seam-reachable `interface`s to type
  aliases — `NotificationsSut`, `World`, `SenderProbe`, `RegisteredRow`, `DocumentedDefault`,
  `NotificationEvent`, `Delivery`, `OpsItem`, `EmitResult`. `World extends WorldSeam` becomes an
  intersection. `class NotificationFixtureWorld implements World` still works against an object type
  alias — verify, do not assume.

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

- Re-compile `sut-seam.probe.ts` alone, same method as step 0, into
  `loop/items/AI4DEV-31/proof-green.txt`. Expected: non-zero, with each attack's diagnostic present.
- Add the new attacks to `tests/at/typeprobes/sut-seam.probe.ts` in final form and extend
  `tests/at/harness/type-invention.selftest.ts` so **each new protection is asserted by name**, in
  the style of the existing `ALIAS_PROTECTED` loop — removing any single protection must fail a test
  that says which one. Follow that file's own doctrine: the list is a SPECIFICATION, not a sample,
  and the two files must not be able to drift apart silently.
- If the new probe file needs to be part of the probe program too (so `bun run at:selftest` covers
  it), make sure the existing whole-program assertion still holds and that the per-attack assertions
  are specific enough to fail individually.

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
