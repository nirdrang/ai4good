# AI4DEV-31 — Gate 1 rulings (item agent, OPUS)

Reviewer: codex `gpt-5.6-terra` @ `max`, read-only, launched in this worktree against the real tree.
Critique: `gate1-critique.md` (11.3 KB). Verdict: *"implement this design only with the named
changes, not as written."*

This was a high-value gate. The reviewer did not reason from the document — it **ran the pinned
compiler** and reported measured diagnostics, several of which contradict predictions I had made
from analogy rather than from measurement. I accept almost all of it.

| # | finding | severity | ruling |
|---|---|---|---|
| 1 | public generic surfaces still admit fabricated types; **exported `function` declarations can be augmented with a new overload** | blocker | **ACCEPTED in full** |
| 2 | D4 does not prove the map entry and the loaded module are the same module | blocker | **ACCEPTED**, adopting the self-identifying adapter |
| 3 | the negative-proof method is unsound and predicts the wrong diagnostics | blocker | **ACCEPTED in full** — proof method replaced |
| 4 | D5 claims exhaustive alias coverage, attacks only 2 of 9 | blocker | **ACCEPTED** |
| 5 | D3 not actually implemented by the shown types | important | **ACCEPTED** |
| 6 | D4's comparison must normalize `016` vs `req-016` | important | **ACCEPTED** |
| 7 | D5 overstates the need to convert `World` | important | **ACCEPTED with a condition** — work REMOVED |
| 8 | the producer boundary still trusts `any` / `as` / `AT_REPO_ROOT` | important | **ACCEPTED as documentation**, not as new machinery |
| 9 | `tests/at/README.md:48` still describes suite-supplied types | minor | **ACCEPTED** |

---

## 1 — the public generic surface, and the door I did not know existed

I had already found half of this myself before the gate returned (design D4b: `defineEvidenceCapture`
is a second door). The reviewer verified that half — a bound test accepting
`AtContext<NotificationsSut & { invented?: string }, …>` compiles and reads the invented member —
and then added something I did not have and would not have found:

> *A suite can also augment the exported `bindSuite` function with a new generic overload through
> `declare module`; I verified an overload that restores a required invented SUT method compiles
> cleanly. **Type aliases do not protect exported function declarations.***

That is a genuine hole in AI4DEV-24's own doctrine, not just in my design. The whole alias rule rests
on "declaration merging cannot reach a type alias" — but `bindSuite`, `atTest` and
`defineEvidenceCapture` are exported **`function` declarations**, and a function declaration accepts
a merged-in overload. The seam was protected at the type level and left open at the value level.

**Ruling: accepted.** The three exported entry points become `const` bindings whose types are alias
call signatures, so there is no function declaration left to merge into. A probe attack for the
overload route is added, and the selftest asserts it by name.

## 2 — the map entry and the loaded module

The reviewer is right and my design's language was wrong. I wrote that after D4 "the type looked up
and the module loaded are the same suite **by construction**." They are not: `AdapterModules['req-016']`
could name `req-017/_fixture.ts` by a typo, while `adapterUrl()` still loads `req-016/_fixture.ts`.
D4 compares the bound key against the AT id and never looks at the map's import path, so it passes.

Of the two fixes offered I take the stronger one rather than retracting the claim: **each fixture
module exports `requirement` as a literal, each map entry is constrained so its module's literal
equals its key, and `loadAdapter()` validates the same literal at run time.** The key, the module the
type came from, and the module actually loaded are then all tied to one self-declared value.

I rejected the alternative (declare `suite-adapters.ts` trusted configuration and drop the claim)
because "trust this file" is precisely the shape of the defect this item exists to remove, and the
cost of closing it is one exported constant per adapter.

The synthetic adapters in the runner selftests need the same tag. They are not in the type map at
all, which is fine — the run-time check compares the adapter's declared requirement against the one
requested, and needs no map.

## 3 — the proof method was unsound; it is replaced

Three measured corrections, all of which would have produced misleading evidence:

- **My predicted diagnostic was wrong.** I carried `TS2558` (arity) over from AI4DEV-24 by analogy.
  The new `bindSuite<R, K>` still has two type parameters, so a fabricated SUT gives **TS2344**
  (constraint violation) instead. Verified by the reviewer.
- **One unchanged source file cannot prove both halves for every attack.** The read-a-missing-member
  attacks need fabricated type arguments to compile *before* the fix; *after* it, those arguments
  fail earlier, so the predicted TS2339 never appears.
- **My isolation method does not work at all.** `tsc <file>` does not inherit the probe config
  (`--showConfig` shows empty options) and `-p` cannot be combined with a filename, so the one-file
  compile would have failed on unrelated defaults — or exited 0 for a reason having nothing to do
  with the hole. That is exactly the "passes for the wrong reason" failure I asked the gate to hunt
  for, and it was in my own method.

**Ruling: accepted in full.** The proof becomes:

1. A **legacy probe** written against today's API, with its own committed child `tsconfig` that
   `extends` the acceptance config and lists only that file in `files`, compiled with `-p`.
   At the pre-fix commit it must compile **clean (exit 0)** — the hole, executed. It stays in the
   tree, and after the fix the same file must fail.
2. A **new-API probe** with its own child tsconfig, meaningful only after the change, carrying the
   read-a-missing-member and augmentation attacks.
3. **Diagnostics are asserted per probe file, and are never predicted.** The executor runs the
   compiler, reads the code it actually emits, and asserts that. Predicting a diagnostic from
   analogy is what produced this finding.
4. The transcript must rule out the empty-program exit 0 (a config matching no files also exits 0).

## 4 — exhaustive means exhaustive

My design named nine types to convert and then listed attacks for two. That is the identical failure
both AI4DEV-24 reviewers caught in that item's selftest ("three checked, all claimed"), reproduced by
me one item later. One augmentation attack per retained alias, in a named list that is a
specification, so the probe and the selftest cannot drift apart silently.

## 7 — the reviewer REMOVED work, and I am taking it

The reviewer verified that after D1 `open().w` is the concrete `NotificationFixtureWorld`, and that
augmenting the `World` interface still yields TS2339 on `open().w.invented`, because a class does not
acquire interface members merely by implementing the interface. So converting `World` to an alias
buys nothing on the seam path.

**Ruling: `World` comes OUT of the D5 conversion list**, conditional on the executor confirming that
no remaining seam path resolves to `World` once the capture helper is suite-bound. If one does, it
goes back in and the executor says so. The reason is recorded in the selftest so that a later author
does not "restore uniformity" without knowing why it is absent.

This is the gate working in the direction people forget it can: less code, because a claim was
measured instead of assumed.

**Superseded during Gate 2.** This ruling was overturned. The measurement above checked only the
direct read (`open().w.invented`) and missed the upcast route: because the fixture class implements
`World`, a plain `const asWorld: World = w` needs no cast, and a member merged into the `World`
interface then reads green. `World` was converted to a type alias after all, and IS in the
protected list. The full reasoning is in `gate2-rulings.md`, which wins wherever it disagrees with
this ruling.

## 8 — the threat model, stated instead of implied

The reviewer is right that `any`, `as`, `@ts-ignore`, `@ts-nocheck`, run-time mutation and an adapter
supplied through `AT_REPO_ROOT` all remain open, and that D1 does not close them.

**Ruling: these are documented as trusted-author escapes, and no machinery is added for them.** The
threat model this item addresses is *a suite drifting from the harness without anyone being able to
detect it* — an honest mistake that type-checks green. It is not *an author determined to defeat the
type system*, who can always write a cast. Adding a lint policy would be scope drift, and the gate
offered documentation as an acceptable resolution. The design and the code comments must say this
plainly, because a closure claim that is broader than the truth is this item's own defect.

`conformance.selftest.ts:273`'s existing `as World` / `as NotificationsSut` casts are pre-existing,
unbroken by this change, and outside D1's guarantee. Noted, not touched.

## What did NOT go to the founder

Nothing. Every finding is inside this item's scope, none contradicts ratified text, and none required
a judgment I do not hold. Scope grew by three small things — the adapter's self-identifying constant,
the run-time validation in `loadAdapter()`, and `tests/at/README.md` — all inside the SUT seam the
board item names. Scope also *shrank* by one (finding 7).

## Confirmation

Finding 3 changes the proof method materially, so the reviewer's own session will be **resumed**
(`codex exec resume <SESSION_ID>`) once the implementation exists, to confirm the replacement method
is sound — the rule being that a finding is confirmed by the reviewer that raised it, not by a fresh
context re-deriving it.
