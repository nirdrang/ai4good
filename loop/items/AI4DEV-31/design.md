# AI4DEV-31 — the harness does not check what it tests

**Item agent: OPUS, not fable.** The fable predecessor died mid-design when the founder's fable
credits ran out. The skill requires the fallback be stated, because a fable item run and an opus
item run are not the same evidence. Note also that the Agent tool exposes no effort setting, so
"opus at max effort" could not be honoured as such — this is opus at whatever effort the platform
gives a spawned agent, and I cannot raise it.

Attribution, derived by walking the board myself (not taken from the brief):

```
~bringup > AI4DEV-3 (test harness and config registry) > AI4DEV-31 (harness does not check what it tests)
```

`AI4DEV-31.parentId = AI4DEV-3`; `AI4DEV-3` has no parent and carries the label `attr:bringup`,
which renders as the floating root `~bringup`.

---

## 1. The defect, measured rather than described

`tests/at/harness/registry.ts:544`

```ts
return opened as OpenWorld<Sut, W>;
```

`openWorld()` (line 429) is declared to produce `Promise<{ opened: OpenWorld; harness: AtHarness }>`,
and `OpenWorld` defaults to `OpenWorld<unknown, WorldLike>`. Inside it:

- line 456 — `const sut = h.sut?.[o.sutKey];` where `h: AtHarness` resolves `sut` to
  `Record<string, unknown>`, so the read is **`unknown`**.
- line 459 — `const w = await h.fixtures.world(o.fixture);` where `h.fixtures` is
  `Fixtures<WorldSeam>`, so `w` is **`WorldSeam`** — `{ teardown(): Promise<void> }` and nothing else.

The cast at 544 relabels both with the type arguments the SUITE chose at
`bindSuite<NotificationsSut, World>` (`tests/at/suites/req-016/_bind.ts:23`). Nothing anywhere
checks that the harness supplies either shape.

### The three unverified reads — confirmed first-hand, not taken on trust

`loop/items/AI4DEV-24/plan.md:812-814` records the surviving Gate 2 finding: this item "must name
all three unverified reads — `OpenWorld.sut`, `OpenWorld.w` and `h.fixtures.world` — not only the
`Sut` axis", and that "the `h.fixtures` half is already closed here as a by-product, since `h` no
longer carries the suite's `W`." I checked each against the current tree:

| read | status now | evidence |
|---|---|---|
| `OpenWorld.sut` | **OPEN** | `registry.ts:176` types `h: AtHarness` concretely, so `h.sut[key]` is `unknown`; line 544 relabels it `Sut` |
| `OpenWorld.w` | **OPEN** | `w` is really `WorldSeam`; line 544 relabels it `W` |
| `h.fixtures.world` | **CLOSED** | `contracts.ts:167` + `registry.ts:176`: `h` is unparameterized `AtHarness`, so `h.fixtures` is `Fixtures<WorldSeam>` and reading through `h` yields `WorldSeam`, never the suite's `W` |

So: two live axes, one already shut. This item closes the two and must not disturb the third.

### The root cause is not the cast — it is that two statements never meet

The cast is the symptom. The cause is that the suite's declaration and the adapter's
implementation are **two independent claims with no link between them**:

- `tests/at/suites/req-016/_bind.ts:23` says "my system under test is a `NotificationsSut` and my
  world is a `World`".
- `tests/at/suites/req-016/_fixture.ts:211` says `const sut: NotificationsSut = { … }` and
  `class NotificationFixtureWorld implements World` — statically checked, **but only against
  itself**.

The link is severed in `tests/at/harness/index.ts:36-54`: `loadAdapter` imports the adapter
dynamically and casts the module to `Partial<FixtureAdapterModule>`, whose `sut` is
`Record<string, unknown>`. Every type the producer proved is discarded at that boundary, and the
consumer then invents its own.

This is exactly the failure shape the way of work names as the one it exists to delete: **a
declared fact drifting from a real fact with nothing able to detect the gap.** Today a suite can
write `bindSuite<AnythingAtAll, AnythingAtAll>` and `bun run typecheck` stays green.

---

## 2. The fix — derive the type from the producer; delete the ability to declare it

**Decision D1. The suite stops naming its types. It names its requirement and its sut key, and the
types are read off the adapter that actually supplies them.**

A new types-only module, `tests/at/harness/suite-adapters.ts`, holds the one declaration:

```ts
export type AdapterModules = {
  'req-016': typeof import('../suites/req-016/_fixture.ts');
};
```

and the derivations:

```ts
export type SuiteId = keyof AdapterModules;
type AdapterOf<R extends SuiteId> = Awaited<ReturnType<AdapterModules[R]['createFixtureAdapter']>>;
export type SutMapOf<R extends SuiteId> = AdapterOf<R>['sut'];
export type SutKeyOf<R extends SuiteId> = keyof SutMapOf<R> & string;
export type SutOf<R extends SuiteId, K extends SutKeyOf<R>> = SutMapOf<R>[K];
export type WorldOf<R extends SuiteId> = Awaited<ReturnType<AdapterOf<R>['fixtures']['world']>>;
```

`typeof import(...)` in a type position is erased at emit, so this adds **no runtime edge** from
the harness to the suites. It mirrors, at compile time, the resolution
`tests/at/harness/index.ts:32` already performs at run time.

`bindSuite` then becomes:

```ts
export function bindSuite<R extends SuiteId, K extends SutKeyOf<R>>(binding: {
  requirement: R;
  sut: K;
  sutMissingDetail?: string;
}): /* an atTest bound to SutOf<R, K> and WorldOf<R> */
```

**What this buys, concretely:**

1. **There is no longer a type argument to lie with.** `bindSuite<NotificationsSut, World>` becomes
   an arity error — the same defence, and the same diagnostic (TS2558), that killed the harness-type
   attack in AI4DEV-24.
2. **The producer is the single source.** `_fixture.ts` already annotates `const sut: NotificationsSut`,
   so the shape is checked where it is written. The consumer now *reads that* instead of restating it.
   This is the brief's instruction — make the producer statically checked rather than asserting at the
   consumer — satisfied without touching the factory.
3. **A mistyped sut key is a compile error.** `K extends SutKeyOf<R>` rejects `sut: 'notificatoins'`
   where today it compiles and fails at run time as `sut-missing`.
4. **A required member the adapter does not supply now goes red at the adapter** (TS2741), because
   there is only one type and the producer is annotated with it.

**Decision D2. `W` travels from the same adapter, but by its own path — it is not welded to `Sut`
and it is never welded to the harness.**

`WorldOf<R>` derives from `fixtures.world`'s return type; `SutOf<R, K>` derives from `sut[K]`. Same
source, separate derivations. The file warns twice that these were once conflated
(`registry.ts:160-175`, `contracts.ts:151-165`) and AI4DEV-24 ruled on that boundary twice. To be
unambiguous about which conflation is forbidden:

- **`h` is not re-parameterized. It stays concrete `AtHarness`.** Re-labelling the harness with the
  suite's `W`/`Channel` is the door AI4DEV-24's Gate 1 and Gate 2 shut, and this item **must not
  reopen it**. `OpenWorld.h` keeps its type and its comment.
- `w` and `sut` are parameters of `OpenWorld` only, and they are now derived, not supplied.

For REQ-016 this makes `WorldOf<'req-016'>` resolve to the concrete `NotificationFixtureWorld`
class rather than the `World` interface. That is *more* honest — it is what the producer really
returns — and test bodies typed against `World` continue to work because the class implements it.

**Decision D3. The registry must be constrained so a world that cannot be torn down is rejected at
the declaration**, i.e. the mapped type requires every entry's world to extend `WorldLike`. An
adapter whose world forgets `teardown()` then fails in `suite-adapters.ts` where the entry is
written, not in whichever suite first opens it.

**Decision D4. Close the last string-level gap with a runtime cross-check.**

Two strings must denote the same suite: the key used for the *type* lookup (`'req-016'`) and the
path used for the *runtime* adapter load (`adapterUrl()` in `index.ts:32`, fed from the parsed AT
id at `registry.ts:534`). They are currently independent.

`atTest` must therefore assert, at registration, that the AT id's requirement equals the bound
requirement, and throw where it is written — the same doctrine the file already applies to a
malformed id (`registry.ts:15`, `:44-49`). Once that holds, the type looked up and the module
loaded are the same suite by construction, not by convention.

The message must name both values and the file, e.g.:
`AT-017.03 was registered through a suite bound to req-016 — the harness would load req-016's
fixture adapter while the type-check described req-017's`.

**Decision D5. Extend the alias doctrine to the suite contract types that now flow through the seam.**

After D1, `OpenWorld.sut` resolves to `NotificationsSut` and `OpenWorld.w` to the adapter's world —
both declared in `tests/at/suites/req-016/_contract.ts` as **`interface`**, along with everything
their methods return (`SenderProbe`, `RegisteredRow`, `DocumentedDefault`, `NotificationEvent`,
`Delivery`, `OpsItem`, `EmitResult`, `World`).

AI4DEV-24's rule (`contracts.ts:151-165`, `type-invention.selftest.ts:50-84`) is that everything
reachable from the objects `open()` hands a test body must be a type alias, because an interface can
be augmented and read green. These types are now exactly that. So they must become aliases and join
the **exhaustive** `ALIAS_PROTECTED` list, which is explicitly a specification and not a sample.

I considered leaving this to a follow-up and **ruled against it**. Without it the item's own proof is
nominal: it would close "a suite declares a different SUT type" and leave "a suite adds a member to
the SUT type" open at the same seam, one line further down. Note the severity does drop either way —
after D1 a *required* invented member breaks the producer with TS2741 — so what D5 actually kills is
the *optional* member that reads `undefined`, which is precisely the case that slipped past two gates
in AI4DEV-24 and is the reason the alias rule exists at all.

This is not scope drift: it is the same defect class, at the same seam, in the anchor the board item
names. It is **not** H3/H4/H5 capability work and **not** a harness-factory redesign, both of which
stay out.

### Alternatives considered and rejected

| alternative | why rejected |
|---|---|
| Parameterize `AtHarness` / `createHarness` over the suite's `Sut` | This is the door AI4DEV-24 shut after two adversarial gates. Reopening it to close this hole would regress a fix that cost that item its Gate 1 and Gate 2. |
| Runtime duck-type validation of the sut at `open()` (assert a method-name list) | The list cannot be derived from a type without a code generator, so it is a second hand-maintained declaration — the exact drift this item exists to remove. It would also make the proof a runtime test, where the brief requires a negative *type* test. |
| Derive the requirement from the AT id at the type level with template-literal types | Requirement ids legitimately carry dots (`005.5` — `registry.ts:28-32`), so the parse is fragile, and it moves the derivation onto every call site instead of one place. |
| Assert the shape at the consumer with a better-worded cast | It is still an assertion. The brief says prefer the checked producer, and the whole item is that assertions at this seam are the defect. |

### The cost, stated plainly so it can be argued with

Every suite must have one line in `suite-adapters.ts`, and a new suite's `_bind.ts` will not compile
until it is added. For thirty suites that is a thirty-line file. I judge that acceptable and in fact
desirable — the harness's knowledge of which suites exist becomes explicit and checkable rather than
a path convention — but it is a real ergonomic commitment beyond this item's own blast radius, so it
is named here rather than buried. The compile error must therefore say exactly what to add.

---

## 3. The proof — a negative test, demonstrated RED first

The established pattern is `tests/at/typeprobes/` (a program that MUST NOT compile) plus
`tests/at/harness/type-invention.selftest.ts` (which runs the compiler over it and fails **by name**
if any attack is accepted). This item extends it.

**A NEW probe file, `tests/at/typeprobes/sut-seam.probe.ts`**, kept separate from
`harness-invention.probe.ts` so the red-then-green demonstration can compile it in isolation.

Every attack must be written in **the form a suite can use on today's tree**, so the same file is
meaningful before and after the fix. That is what makes the demonstration honest.

| # | attack | must be rejected by |
|---|---|---|
| 5 | fabricate the SUT type: `bindSuite<{ notThere(): Promise<void> }, World>({ sut: 'notifications' })`, then call `sut.notThere()` in a body | TS2558 (arity) |
| 6 | fabricate the world type the same way and read a member off `w` | TS2558 (arity) |
| 7 | name a sut key the adapter does not supply (`sut: 'notificatoins'`) | assignability error on the key |
| 8 | read a member off `opened.sut` that the adapter's sut does not declare | TS2339 |
| 9 | read a member off `opened.w` that the adapter's world does not supply | TS2339 |
| 10 | merge a member into `NotificationsSut` via `declare module` | TS2300 / TS6200 |
| 11 | merge a member into `World` via `declare module` | TS2300 / TS6200 |

### The red-then-green demonstration — this is the deliverable, not a formality

`tests/at/typeprobes/tsconfig.json` includes `**/*.ts`, so both probe files compile together and a
whole-program exit code cannot isolate the new attacks. The demonstration is therefore **per-file**:

1. **RED (hole open).** At the pre-fix commit, compile `sut-seam.probe.ts` ALONE with the pinned
   compiler and the probe config's options. Expected: **exit 0 — it compiles clean.** That is the
   defect, executed rather than described.
2. **GREEN (hole shut).** At the fix commit, compile the same file the same way. Expected: non-zero,
   with each attack's named diagnostic present.

Both transcripts are committed to `loop/items/AI4DEV-31/` verbatim. A claim of "it fails now" without
the recorded "it passed before" is not evidence, and this item is about evidence.

The selftest must then assert each attack **by name**, in the style of the existing
`ALIAS_PROTECTED` loop, so that removing any single protection fails a test that says which one.

---

## 4. No behaviour change — the bar, pinned to a measured baseline

Baseline taken on this worktree at `761aaa9` (origin/main), after `bun install`:

- `bun run typecheck` → **exit 0**
- `bun run at:verify req-016 --tier loop --expect` → **exit 0**, `12 P0: 8 green, 4 red, 0 missing`,
  matching `tests/at/expected/req-016.json` exactly.

Both must still hold, with the identical 8/4/0 split and the same four reds
(AT-016.07, .09, .11 pending capabilities, plus the one shown above the fold). `bun run at:selftest`
must also stay green.

### A constraint the design must survive — found by reading, not by failing

`tests/at/harness/runner-blackbox.selftest.ts:63-69` and `runner-expect.selftest.ts:57-59` **generate
synthetic suites at run time** into a disposable tree, whose shared preamble calls
`bindSuite({ sut: 'probe', sutMissingDetail: … })` with no requirement and no type arguments. They
run under requirements 901-906 and are never type-checked (they live outside every tsconfig), but
they **are executed**, so D4's runtime cross-check will throw on them as written.

The fix is mechanical and must be done deliberately, not discovered: `suitePreamble()` takes the
requirement and emits `bindSuite({ requirement: 'req-<n>', sut: 'probe', … })`, and every call site
passes its own. Their assertions must not otherwise change — these tests are the runner's black-box
guarantees and altering what they assert would trade this item's proof for theirs.

I considered making the cross-check fire only when a requirement is supplied, so these would pass
untouched, and **rejected it**: a check that can be disabled by omitting a field is the hole again,
arriving through the door marked "convenience".

---

## 5. Files in scope

| file | change |
|---|---|
| `tests/at/harness/suite-adapters.ts` | NEW — the derived registry and its type functions (types only) |
| `tests/at/harness/registry.ts` | `bindSuite` / `atTest` derive rather than accept `Sut`/`W`; requirement cross-check; the cast at 544 narrowed and its comment rewritten to say what is now checked |
| `tests/at/suites/req-016/_bind.ts` | names its requirement and sut key instead of two types |
| `tests/at/suites/req-016/_contract.ts` | the seam-reachable `interface`s become type aliases (D5) |
| `tests/at/typeprobes/sut-seam.probe.ts` | NEW — attacks 5-11 |
| `tests/at/harness/type-invention.selftest.ts` | asserts each new attack by name |
| `tests/at/harness/runner-blackbox.selftest.ts`, `runner-expect.selftest.ts` | generated preamble carries the requirement |
| `loop/items/AI4DEV-31/` | design, gates, red-then-green transcripts, merge ruling |

Out of scope, explicitly: H3/H4/H5 capability work; any change to `createHarness`'s signature or to
`AtHarness`; any change to what the runner selftests assert; `OpenWorld.h`.

## 6. Open questions

None that I cannot decide. If Gate 1 finds the per-suite registry line (§2 cost) or the D5 scope
ruling unacceptable, I rule on it; if a finding contradicts ratified text or demands scope this item
does not own, it goes to the founder as a question, relayed verbatim through `main`.
