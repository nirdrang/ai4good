# AI4DEV-48 — provenance is a verdict the harness computes, not a word a caller writes

**Item:** AI4DEV-48 (a green can be faked) · parent AI4DEV-3 (AT harness) · root label `attr:bringup`
**Sitting:** amended in DRAFT (sitting 2) after Gate 1 · **orchestrator model: opus
(the `orchestrator-opus` fallback).**

> **THE FALLBACK IS IN FORCE FOR THIS WHOLE ITEM.** Fable is out of credit, so every sitting on
> AI4DEV-48 runs as `orchestrator-opus` (opus at effort max) rather than the usual fable at xhigh.
> This is a different agent TYPE, not a model override on the fable definition. A fable run and an
> opus run are not the same evidence, so downstream sittings, the reviewers and the founder should
> read every ruling in this item as an opus ruling.

> **THIS PLAN WAS AMENDED MATERIALLY AFTER GATE 1.** The reviewer asked for a replacement and was
> right about the central defect: the first draft made `real` the outcome of a witness that found
> nothing to say, which is the same hole one door to the left. **D1 now has three outcomes and can
> refuse.** D4 no longer pretends a constant is a check, the `sut.*` prefix is gone, and S1, S4 and
> S6 are rewritten because each was unexecutable or guaranteed to pass. Every change traces to a
> ruling in `gate1-rulings.md`, which quotes the reviewer's claim beside each one. The replacement
> *mechanism* the reviewer proposed — tier-specific adapter selection — is rejected as this item's
> work, with reasons, and filed.

---

## 1. Where this came from

Filed 2026-08-07 from the Gate 1 (plan-critique) review of the proving-ground item, which rated it
a BLOCKER. That item was stood down because its own goal was unreachable; this finding was judged
real and separate, and outlives it.

The original critique is not in this branch. It is at commit `6a47f1b` on the remote branch
`nirdrang/ai4dev-22-h7-proving-ground-req-016-green-end-to-end-at-integration`, readable as
`git show 6a47f1b:loop/items/AI4DEV-22/gate1-sol.md` (the finding is #1 of 7, at lines 15–25). It
is cited here by pointer, never pasted.

---

## 2. What I verified against the tree, before deciding anything

Every specific claim on the board is a REPORTED claim. I checked each one myself.

| reported claim | verdict | where |
|---|---|---|
| provenance is a word the caller passes | **TRUE** | `capabilities.ts:12-23` — `capability(name, provenance, value)` takes the label as an argument and validates only that the name is non-empty |
| flipping `standInCapability` → `realCapability` empties the stand-in list | **TRUE, and now measured** | `index.ts:118,129,142,153-155` are the stand-in sites; `capabilities.ts:25-30` filters on `provenance === 'stand-in'` and nothing else. A probe run at the pre-fix head printed `stubbedCapabilityNames = []` for all five relabelled names — `baseline-before-fix.md` |
| `registry.ts` checks only the resulting names | **TRUE** | `registry.ts:618-620` — above `loop`, `expect(await h.stubbedCapabilities()).toEqual([])` |
| eleven notification tests are already green against the reference adapter | **TRUE, with a correction to the count, and now measured** | `bun run at:verify req-016 --tier loop --expect` at the pre-fix head reports `12 P0: 11 green, 1 red, 0 missing`. The board text says "twelve"; twelve is the number that would be green *after* the static scan lands, which is a different item's work |
| the reference adapter is specification-derived | **TRUE** | `tests/at/suites/req-016/_fixture.ts:1-19` |

**Two things I found that the finding did not say, and both matter.**

**(a) The harness already knows how to do this, one layer down.** `createOracleCapability`
(`oracles.ts:1120-1147`) does not accept a provenance — it DERIVES one from the tier plus the
transport's `kind` brand (`oracles.ts:179`), and it REFUSES the mismatched combinations in both
directions: a loop-tier oracle on a live transport throws, an above-loop oracle on a replay
transport throws. `oracles.selftest.ts:209-210` states the doctrine in one line — *"a provenance a
caller asserts is not provenance"*. That work was done at the oracle layer and never carried to the
capability layer. This item carries it.

**(b) `_fixture.ts:15-18` claims an enforcement that is real but INSUFFICIENT.** *(Corrected after
Gate 1 finding 12; the first draft called the claim false, which was an overstatement, and writing a
false accusation into the record is the same class of defect as writing a false green.)* The header
says the ledger marks `sut.notifications` a stand-in through `standInCapability`, and that the
registry refuses any stubbed capability above loop. **Both mechanisms exist** — `index.ts:153-155`
and `registry.ts:618-620`. What is over-strong is the last sentence, *"The gate can only ever be
satisfied by the real implementation"*, because the label feeding that gate was editable by anyone.
The header must be corrected in this item to name what enforces it *after* the change, or the record
overclaims after the code is fixed.

**One existing test is narrower than it reads.** `conformance.selftest.ts:138-143` proves a
*capability value* cannot lie about itself. It does not touch the *caller* lying about the value,
which is the door this item closes. It also calls `standInCapability` directly, so this item must
rewrite it rather than merely preserve it.

---

## 3. The decisions

### D1 — Provenance is a computed VERDICT with three outcomes, and the third one refuses.

`realCapability` and `standInCapability` are removed as the labelling API. A capability is built by
one constructor that takes a **name**, a **value**, and any **evidence the caller holds that the
witness cannot derive**, and computes the verdict from a witness registered for that name.

```ts
export type CapabilityVerdict =
  | { readonly kind: 'stand-in'; readonly reason: string }
  | { readonly kind: 'real'; readonly evidence: string };
```

A witness returns a `CapabilityVerdict` **or throws**. There is no `null` and there is no default.

> **THIS IS THE GATE 1 CORRECTION, AND IT IS THE MOST IMPORTANT LINE IN THE PLAN.** The first draft
> said *"`'real'` has no spelling anywhere. It is the absence of a reason."* That was the hole: it
> made `real` the outcome of a witness that found nothing to say, so a `clock.controlled` value with
> its `advance` stripped would have been classified real — `realCapability()` reached through a
> different door. **A witness that cannot classify a value REFUSES it.** "I found no stand-in seam"
> is never evidence of real backing.

**Why this and not "add a brand to each producing factory":** a brand stamped by the factory that
builds the simulator is the same lie one file to the left. `createEmailProviderSim()` returning
`kind: 'real'` is as cheap an edit as `realCapability(...)` is today. A witness that reads the
value's own seam is not.

**On the one place a caller contributes evidence.** The oracle hands over `tier` and the transport's
`kind`. Neither is derivable inside `capabilities.ts`, both are already guarded, and
`oracles.ts:1112-1118` argues that seam at length and refuses both mismatched combinations. This is
no weaker than what the tree holds up today as its model. It is named here so it is not discovered
later.

### D2 — A capability name with no witness is REFUSED, never defaulted.

Not defaulted to real (that is the hole) and not silently defaulted to stand-in either. A name
nobody has decided about is an error at construction, naming the name. This tree has written the
reason down twice already, in `index.ts:76-100` and `registry.ts:661-677`: *a guard that switches
itself off when a field is absent is the hole again, arriving through the door marked convenience.*

**The table is CLOSED: six exact names, no prefixes and no wildcards.** *(Amended after Gate 1
finding 9. The first draft matched `sut.*` by prefix, which meant nobody ever decided about a SUT
name — an unlimited namespace inside a table whose whole claim was that it was closed. See D4.)*

### D3 — The two seam witnesses key on the CONTROL SEAM the capability exposes, and refuse what they cannot classify.

This is the part that gives the change teeth, and it is available today without inventing anything:

- **`clock.controlled`** — the harness's `Clock` contract (`contracts.ts:54-57`) is `freezeAt` +
  `advance`. A capability that can be *commanded* to jump forward is not the passage of time.
  - **seam present → stand-in**, with a reason naming the seam.
  - **seam absent → THROW.** This tree has no real clock backing to attest, so a value that is
    neither the control seam nor an attested real clock is unclassifiable, and unclassifiable
    refuses.
- **`vendors.email`** — the harness's `Vendors` contract (`contracts.ts:120-138`) is the *simulator*
  seam: `rejectNext`, `acceptButLoseAck`, `accepted`, `attempts`. A provider that can be told to
  reject the next N sends, and that hands back every attempt that reached its seam, is a simulator.
  - **seam present → stand-in.** **seam absent → THROW**, for the same reason.

**TEST CALLABILITY THROUGH THE PROTOTYPE CHAIN, NEVER OWN-PROPERTY PRESENCE.** `ControlledClock` is
a class (`clock.ts:1`) and `advance` is a prototype method (`clock.ts:10`), so
`Object.hasOwn(value, 'advance')` is **false** for today's clock and would misclassify it on the
first run. Use `typeof (value as …).advance === 'function'`. *(Gate 1 finding 1; verified in the
source, not assumed.)*

**The value registered at `index.ts:142` is a fresh wrapper `{ email: provider.sim }`**, so the
vendor witness reads one level down — `.email.rejectNext`, not `.rejectNext`. Check this against the
actual object, not the type.

**A consequence, stated rather than discovered later:** while the harness's `Clock` and `Vendors`
contracts are control seams, these two names have exactly **two reachable outcomes — stand-in or
refusal.** They can never be real. That is the truth about a harness with no product behind it, and
saying so is this item's purpose rather than a cost of it. *(Gate 1 called this a defect; it is the
finding, and §7 has always said so.)*

### D4 — `fixtures.worlds` and every `sut.<key>` leave the name table and are built on the ADAPTER-DERIVED route.

*(Restructured after Gate 1 findings 2 and 9.)*

These two families do not come from a name lookup at all. They are constructed through a separate
route whose evidence is **the module URL `loadAdapter()` actually imported**, and which returns
stand-in **unconditionally**:

> `stand-in — loaded from the fixture adapter at <moduleUrl>`

**Three things follow, and each answers a Gate 1 objection directly.**

1. **`loadAdapter()` must return the URL alongside the adapter.** Today it computes `moduleUrl` at
   `index.ts:64` and discards it, returning only `module.createFixtureAdapter(...)` at `:102`. This
   is a small mechanical change inside the harness.
2. **The URL is loader-derived and cannot be caller-supplied.** `adapterUrl()` (`index.ts:53-55`)
   builds it from `REPO_ROOT` plus the requirement; `createHarness` is its only caller and passes no
   path. The reviewer's objection that this "replaces a caller-supplied word with a caller-supplied
   path" does not hold, and contradicts its own closing remedy that evidence be loader-owned.
3. **It does not branch, and that is deliberate.** `adapterUrl()` has exactly one possible output
   today, so a witness that *branched* on it would be a constant dressed as a check — the same
   dishonesty this item exists to remove. The URL is the **content of the reason string**, so the
   refusal names the module really loaded. It is not the condition of a test, and this plan does not
   claim it is.

**This also removes the typo surface entirely.** Nothing looks a SUT name up, because the only thing
that constructs one is `Object.entries(adapter.sut)` at `index.ts:153`. The runner's generated
black-box adapters export `sut: { probe: … }` with no fault or sentinel seam
(`runner-blackbox.selftest.ts:54-61`); `sut.probe` needs no entry and cannot be mistyped into
existence.

**I deliberately do NOT add a `backing` declaration to the adapter.** It was the obvious move —
`requirement` is a perfect precedent — and I rejected it: with only one legal value today the
witness would not consult it, so it would be a declaration with no decision behind it.

> **CITATION CORRECTED AFTER GATE 1 FINDING 3.** The first draft cited the founder ruling of
> 2026-08-04 (`loop/bringup/AI4DEV-3-at-harness.md:52-64`) as settling this. **It does not.** That
> ruling amends item 8, *"Provider/vendor simulation at the seams"*, and governs when the five named
> vendor stand-ins are built. It says nothing about fixture-adapter routing. What I am relying on is
> the **principle** stated inside it — *"a sim contract authored without its consuming test is a
> guess that gets rewritten when the real suite arrives"* — extended by analogy **on my own
> authority, not the founder's**. I still find it persuasive. It is no longer presented as a ruling
> on this question.

### D5 — The reviewer's tier-separated adapter route is REJECTED as this item's work, and FILED.

The Gate 1 reviewer proposed replacing the whole mechanism with tier-specific adapter selection:
loop loads `_fixture.ts`, above-loop selects a distinct product-adapter path and fails explicitly
while that module does not exist. It builds no product adapter, so the "it would be a guess with no
consumer" objection does **not** apply to it. It is rejected on different grounds:

1. **It does not cover the item.** Eight capability names are constructed in `index.ts`, and five of
   them — `clock.controlled` (`:118`), `config.registry` (`:123`), `sentinels.planted` (`:137`),
   `faults.injection` (`:138`), `vendors.email` (`:142`) — involve no adapter at all. Tier-aware
   selection reaches `fixtures.worlds` and the `sut.*` family and leaves the labelling API standing
   for everything else. The item is *"provenance is a caller"*; the caller is `index.ts`, at eight
   sites. The alternative is not smaller and stronger, it is smaller and **narrower**.
2. **It is a real behaviour change belonging to a later slice.** It turns
   `createHarness({ tier: 'integration' })` from something that returns a harness into something
   that throws at load. It does return one today: the integration-tier oracle builds a live
   transport that constructs fine and only throws when `judge()` is called (`oracles.ts:1138`,
   driven at `oracles.selftest.ts:1014-1023`). The tree already names the owner of that work in its
   own words, at `oracles.ts:1022` — *"deferred to the slice that makes the integration tier real."*
3. **It is a good idea and it is filed, not dismissed** (§9). After this item the ledger can only be
   emptied by editing a named witness; tier-aware selection would be a second, independent barrier.

The original critique's other two directions keep their earlier dispositions: *"a relabelled
reference adapter must be refused"* is **ADOPTED** — it is the item — and *"conformance tests proving
that path consumes product-backed seams"* is **MOOT** under the rejection and reshaped, so the
conformance tests prove the refusal instead (S4).

### D6 — The oracle keeps its derivation; it is routed through the new constructor, not rewritten.

`createOracleCapability` already derives correctly. Its two call sites (`oracles.ts:1136,1146`) lose
their direct labelling and instead hand the constructor the evidence they hold and `index.ts` does
not — the tier and the transport's `kind`. The tier/transport refusals at `oracles.ts:1129-1135` and
`:1139-1145` stay exactly as they are; this item does not touch the oracle's judgement.

**This is the one witness with a genuinely evidenced `real` outcome**, and existing tests depend on
it: `oracles.selftest.ts:960,961,984` assert `.provenance === 'real'` for integration and drill
oracles on a live transport. Those must keep passing unchanged.

### D7 — The ledger is readable by the harness's own tests and NOT by suites.

*(New, after Gate 1 finding 4.)* `createHarness()` keeps every wrapper in the private `constructed`
array (`index.ts:156`) and returns only `.value` fields, so a conformance test cannot read a
capability's reason through the canonical assembly at all — the first draft's S4 asked for something
impossible.

**`AtHarness` gains nothing.** The doctrine at `contracts.ts:307-309` covers *"everything reachable
from the harness object AND the objects `open()` hands a test body"*, so a diagnostic member there
would be a diagnostic in front of every suite. Instead **`index.ts` exports the ledger builder**;
`createHarness` consumes it and still returns only values, and the harness's own conformance test
imports the builder directly. A suite only ever holds an `AtHarness` and cannot reach it.

**The same move closes finding 8.** `createHarness` derives every capability member from its ledger
entry's `.value` — one expression each — so the object the witness judged **is** the object handed to
the suite, by construction rather than by convention. Today they happen to be the same object
(`index.ts:118`→`:162`, `:142`→`:174`); nothing enforces it, and an edit that witnessed a stripped
facade while returning the working clock would leave the behaviour tests green.

### D8 — ONE slice, not several.

The witness constructor and every call site must change together or the tree does not compile, so
slicing would produce a non-compiling intermediate and a Gate 2 review of a half-change. The diff is
bounded (see §6) and sits in one subsystem. The code gate runs once, on the whole change.

---

## 4. Steps, each with its own done-criterion

> **WHICH SITTING RUNS WHAT — read this before starting.** Gate 1 finding 5 caught a step that
> asked the executor to do what its own contract forbids on a draft pass, and the same conflict
> survived into S3, S4 and S6 of this amendment. Closing it here rather than letting the executor
> discover it:
>
> - **The DRAFT pass writes everything and runs nothing but the type-checker.** S2, S3, S5 and the
>   *writing* of S1's and S4's assertions. `bun run typecheck` must be clean on both projects. The
>   verify suite is **not** run — `.claude/agents/executor.md:22-24`. Where a done-criterion below
>   names `at:selftest`, `at:verify` or a negative control, that half of the criterion belongs to
>   the next pass, and the draft is done without it.
> - **The FIX-AND-GOAL pass runs the suite.** §5's whole table, S4's four negative controls, and
>   S6. That is the pass that may iterate to green.
>
> A draft that stops at a clean typecheck with the suite unrun is **complete**, not incomplete. It
> exists to be critiqued, and polishing it to green first spends attempts on code the critique is
> about to change.

**S1 — The pre-fix baseline is already captured; the SURVIVING assertions are what this step owes.**
*(Rewritten after Gate 1 finding 5. The first draft asked the executor to run a test and record its
red before touching production code, which its own contract forbids — `.claude/agents/executor.md:22-24`
says "Do not run the verify suite" on a draft pass — and the test it described could not compile
after S2 removed the API it called.)*

The measurement belonged to this sitting, not the executor, because it is a measurement of the tree
*before* anything changed. It is in `loop/items/AI4DEV-48/baseline-before-fix.md`, pinned to
`219cae23`: `12 P0: 11 green, 1 red, 0 missing`, selftest `243 passed (243)`, and a probe printing
`stubbedCapabilityNames = []` for the five relabelled names.

What the executor owes is the assertions that still mean something *after* the API is gone:
1. the labelling API no longer exists (S5's exact-zero grep is the check);
2. an unwitnessed capability name throws at construction, naming the name;
3. a **known** name with a malformed value throws — the finding-1 case, and the one the first draft
   would have classified real.
→ *Done when:* those three exist as tests and (2) and (3) are written so that reverting their guard
turns them red.

**S2 — Rewrite `capabilities.ts` around the three-outcome verdict (D1, D2).**
One constructor taking name, value and evidence. `CapabilityVerdict` as in D1. A closed witness table
of **six exact names** — no prefixes. `Capability<T>` gains `standInReason: string | null`, non-null
exactly when `provenance === 'stand-in'`. `stubbedCapabilityNames` keeps its signature and meaning.
An unwitnessed name throws; a witness that cannot classify throws.
→ *Done when:* `capabilities.ts` exports no function that accepts a provenance, no code path returns
a provenance for a value no witness could classify, and `bun run typecheck` is clean on both projects.

**S3 — Write the witnesses and rewire the call sites (D3, D4, D6).**

*The six in the closed table:*
| name | verdict | evidence |
|---|---|---|
| `clock.controlled` | stand-in if the `Clock` control seam is callable; **throws** otherwise | the value's own seam |
| `vendors.email` | stand-in if `.email.rejectNext`/`.attempts` are callable; **throws** otherwise | the value's own seam, one level down |
| `config.registry` | real | **a name-scoped decision, not a test of the value** — `atconfig.ts` IS the registry of pinned values |
| `sentinels.planted` | real | same — the marker store is the article, not a substitute for one |
| `faults.injection` | real | same — the fault router is the article |
| `oracles.judge` | derived: loop+replay → stand-in, above-loop+live → real; both mismatches keep throwing | tier + transport `kind`, supplied by `oracles.ts` |

**Say plainly in the code what the three `real` rows are.** They are declarations of nature, not
tests of a value: the thing they would be a stand-in *for* does not exist elsewhere. `index.ts:130-136`
already argues this at length across three comment blocks; the witness table becomes the one place it
lives. Dressing them as checks would be the defect this item removes.

*Off the table, on the adapter-derived route (D4):* `fixtures.worlds` and every `sut.<key>`, built
from the module URL `loadAdapter()` returns, unconditionally stand-in, the URL in the reason.

Then `index.ts:118-156` and `oracles.ts:1136,1146` stop naming provenances.
→ *Done when:* no call site anywhere passes a provenance; `bun run at:selftest` is green **including
the runner's black-box trees** (run this before declaring S3 done, not after S4); and
`stubbedCapabilities()` on a loop-tier harness still returns exactly `['clock.controlled',
'fixtures.worlds', 'oracles.judge', 'sut.notifications', 'vendors.email']`.

**S4 — The conformance wall (the item's done contract), split by what each assertion proves.**
*(Restructured after Gate 1 finding 7: three of the first draft's five assertions already pass on the
unchanged harness, so "each fails if its guard is reverted" was unmeetable for them, and one claimed
to prove an enforcement it cannot reach.)*

**NEW-GUARD assertions — each MUST go red when its guard is reverted, and the executor must actually
revert each one and observe the red rather than reason about it:**
1. Each of the four reference capabilities, read off **the exported ledger builder** (D7), is a
   stand-in whose `standInReason` names the seam or the module path that makes it one — not a generic
   string.
2. A **known** name with a malformed value **throws** — a `clock.controlled` value with no `advance`,
   a `vendors.email` value with no `.email.rejectNext`. This is the finding-1 case and the single
   most important assertion in the item.
3. An **unwitnessed** capability name is refused at construction, naming the name (D2).
4. The three harness-owned capabilities come back real **through the accepting branch**, not by
   being absent from a list — a guard that refuses everything is as broken as one that refuses
   nothing.

**PRESERVED assertions — these pass before and after; they are regression guards and the plan claims
nothing more for them:**
5. `conformance.selftest.ts:154-164` keeps its exact five-name list and its
   `not.toContain('config.registry')`.
6. The existing test at `conformance.selftest.ts:138-143` keeps its meaning: a value claiming
   `stubbedCapabilities: () => []` is still counted a stand-in. **It must be REWRITTEN, not merely
   preserved** — it calls `standInCapability` at `:139` and imports it at `:13`, and S2 deletes it.
7. A harness built at `tier: 'integration'` still reports a non-empty stubbed list. **This does NOT
   prove the registry gate fires.** That enforcement is in `openWorld` (`registry.ts:595-620`), which
   is not exported and cannot be called from a conformance test. The assertion proves the reference
   adapter still declares itself above loop, and the plan claims only that.

→ *Done when:* all seven hold, and each of 1–4 has been observed red with its guard reverted.

**S5 — Correct the record that the fix falsifies (§2b).**
`_fixture.ts:15-18` points at `standInCapability` in `index.ts` as its enforcement — a real mechanism
that this item replaces, and an over-strong final sentence. Rewrite those lines to name what actually
enforces it after this change. Same for the provenance sentences in `contracts.ts:335-341` and the
comment blocks at `index.ts:120-152` that argue a labelling decision the code no longer makes.
→ *Done when:* no comment in the tree names `realCapability` or `standInCapability` as an enforcement
mechanism, and a repository grep for either identifier returns **exactly zero** hits outside
`loop/items/` — not "only intended hits". After S2 the exports do not exist, so zero is the whole
permitted set. *(Gate 1 finding 6's tail.)*

**S6 — Verify, and prove the declaration did not move.**
Run the full gate (§5). `tests/at/expected/req-016.json` must be **byte-identical to its state on
`main`**, and so must the suite's test bodies.
→ *Done when:* every command in §5 passes, `git status --porcelain` is empty, and the blob-hash
comparison in §5 shows equality.

> **DO NOT USE `git diff --stat <path>` FOR THIS.** *(Gate 1 finding 6, the sharpest in the review.)*
> S6 requires a clean tree, and on a clean tree that command compares the working tree to the index
> and prints nothing **whether or not the file was changed and committed**. It is a guard that cannot
> fail, written inside the item whose subject is guards that cannot fail. Compare blob hashes against
> the merge base instead:
> `git rev-parse origin/main:<path>` against `git rev-parse HEAD:<path>` — equal means byte-identical,
> and it survives commits.

---

## 5. Expected verification state

**Per acceptance-test id — unchanged from the measured baseline, and that is the claim.** This item
must not move the notification suite at all.

| id | loop tier, measured before | loop tier, after | why |
|---|---|---|---|
| AT-016.01 | red — `capability-pending`, `H3 static provider scan` | **identical** | the static scan is untouched by this item |
| AT-016.02 … AT-016.12 | green (eleven) | **green (eleven)** | no test body, no fixture behaviour and no config value changes |

Baseline measured at `219cae23`, not read off a file: `12 P0: 11 green, 1 red, 0 missing`;
`bun run at:selftest` → `Test Files 9 passed (9)`, `Tests 243 passed (243)`.

| command | expected |
|---|---|
| `bun run typecheck` | clean, both projects |
| `bun run at:selftest` | green — **at least 243 tests**, plus the new S1/S4 assertions |
| `bun run at:verify req-016 --tier loop --expect` | `12 P0: 11 green, 1 red, 0 missing` |
| `bun run at:check` | green (bijection unchanged — no AT id is added or removed) |
| `bun run lint` | clean |
| `git rev-parse origin/main:tests/at/expected/req-016.json` vs `git rev-parse HEAD:…` | **identical hashes** |
| same comparison for each `tests/at/suites/req-016/*.test.ts` | **identical hashes** |

Negative controls the executor must actually run, not reason about: revert each of S4's four
new-guard assertions' guards one at a time and confirm the matching assertion goes red. A guard that
passes when disabled is not a guard. Report the four observations individually.

---

## 6. Blast radius

May be touched: `tests/at/harness/capabilities.ts`, `index.ts`, `oracles.ts` (the two capability call
sites only), `conformance.selftest.ts`, `contracts.ts` (the provenance comments), the `_fixture.ts`
header comment, and files under `loop/items/AI4DEV-48/`.

May **not** be touched: any file under `tests/at/suites/req-016/` other than the header comment,
`tests/at/expected/req-016.json`, `registry.ts`, `runner.ts`, `oracles.selftest.ts` (its
`.provenance === 'real'` assertions at `:960,961,984` are the contract D6 preserves), any product
code, any migration.

**Watch item for the executor:** the runner's black-box trees generate throwaway fixture adapters at
run time (`runner-blackbox.selftest.ts:54-74`, `runner-expect.selftest.ts:48-58`) exporting only
`requirement`, `sut`, `fixtures` and `teardown`. Their `sut` key is `probe`. Under D4 nothing looks a
SUT name up, so this should now be a non-event — but if those selftests go red, the adapter-derived
route is over-specified; fix the route, not the generated adapters.

---

## 7. What a green here does and does not claim

*(Narrowed after Gate 1 finding 8. The first draft said faking a verdict requires "removing the very
seam the suites drive". That holds only while the object the witness judges is the object the suite
receives — which today is true by convention and not by construction.)*

**Does:** no caller in this tree can name a capability's provenance; a capability name nobody decided
about is refused; a **known** name whose value cannot be classified is refused rather than promoted;
the four reference capabilities cannot reach `real` through any route the API offers; the
integration-tier gate at `registry.ts:618-620` cannot be satisfied by the reference adapter under any
relabelling; and — **because D7 makes `createHarness` derive every member from the ledger entry it
judged** — for the clock and the vendor simulator, faking the verdict requires removing the very seam
the suites drive, so the lie reddens tests rather than hiding.

**Does not — and this bound is stated because a closure claim wider than the truth is the defect this
item removes.** The harness is source code. An author who edits a witness *and* the conformance test
that asserts it can still produce a false green. Producer and witness can also drift apart in future
edits, and a future value could collide with a witness's shape by accident. The honest ceiling is:
**the current assemblies are pinned by construction and by conformance assertions; deliberate or
future producer/witness drift remains possible.** What changes is the character of the act — it stops
being a one-word relabel that reads like a routine promotion and becomes a multi-file edit that
visibly disables a named guard. That is the same ceiling `registry.ts:267-273` states about the type
seam, reached the same way, and this item claims no more than that.

Neither does it make the integration tier reachable. It makes the tier honestly unreachable, which it
already was — and note D3's consequence, worth recording because a later item will meet it: while the
harness's `Clock` and `Vendors` contracts are control seams, those two capabilities can never be
real. Reaching integration means changing what the harness hands a suite, not relabelling it.

---

## 8. Risks

1. **The witnesses over-fit REQ-016 and break the black-box trees.** Mitigated by the watch item in
   §6 and largely dissolved by D4; the executor runs `at:selftest` before declaring S3 done, not
   after S4.
2. **The three `real` rows are decisions, not measurements** (D3, S3). They are the weakest part of
   the mechanism by construction, because nothing about the value is inspected. Mitigation is
   honesty, not machinery: the table states in words that they are name-scoped decisions about the
   harness's own machinery, so a future reader is not misled into thinking a check ran.
3. **The removal in S5 is a removal, and removals are the rulings least likely to be re-examined.**
   The verification condition: after deleting each comment claim, a grep must show the replacement
   text naming the real mechanism. A deleted claim with no replacement is a worse record, not a
   smaller one.

> **DROPPED after Gate 1 finding 10:** the first draft converted `Capability` from an `interface` to
> a type alias, justified by the claim that it is *"the only interface left on the harness path"*.
> **That claim is false** — `index.ts:16` and `:31` declare `interface FixtureAdapter` and
> `interface FixtureAdapterModule`. The doctrine at `contracts.ts:307-309` covers what is reachable
> from the harness object and from what `open()` hands a body, and `Capability` is reachable from
> neither. It was unrelated hardening on a false premise, and project guidance is explicit that every
> changed line must trace to the request. Do not convert it.

---

## 9. Out of scope — named here, absorbed nowhere

- **Tier-specific fixture-adapter selection** — the Gate 1 reviewer's alternative, rejected as this
  item's work in D5 and **recommended for filing**. Loop loads `_fixture.ts`; above loop selects a
  distinct product-adapter path and fails explicitly while that module does not exist. It builds no
  product adapter. It would be a second, independent barrier: after this item the ledger can only be
  emptied by editing a named witness, and tier-aware selection would make the reference adapter
  unreachable above loop even then. Note for whoever picks it up: it changes
  `createHarness({ tier: 'integration' })` from returning a harness to throwing, which has its own
  blast radius through the oracle selftests.
- **The static provider scan (`h.static`) is unconditionally pending** (`index.ts:173`), which is why
  AT-016.01 is red and why the board text says twelve where the measurement says eleven. It is
  harness-owned work buildable today and independent of the product, and supplying it is what would
  make the count twelve. **I checked the board and it has no item.** It is H3 work left unbuilt when
  H3 closed (AI4DEV-19, Done), and the machinery that would have caught an unowned red — AI4DEV-30,
  every declared red naming the item that will resolve it — is itself still in Backlog. **This should
  be filed as its own item.** It is not absorbed here.
- **A typed `stubbed-capabilities` failure kind** for the declaration file, so the integration refusal
  is structurally declarable rather than free-form text (finding 6 of the same earlier Gate 1
  review). This is close enough to AI4DEV-28 — structured capability codes, already filed, and its own
  text says it *"Belongs to the slice that owns `capabilities.ts`"* — that it should be added to that
  item rather than filed fresh.
- **AI4DEV-28 overlaps this item's file and is still NOT absorbed.** This item rewrites
  `capabilities.ts`, which is exactly where AI4DEV-28 wants a machine-readable code emitted. It rides
  along nowhere: absorbing a filed, separately-scoped item into the last engine item before product
  work is the scope growth this plan exists to avoid. The one obligation on the executor is negative —
  the rewrite must not make emitting such a code harder than it is today.
