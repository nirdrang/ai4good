# AI4DEV-48 (a green can be faked) — rulings on Gate 1

**Sitting:** DRAFT (sitting 2) · **orchestrator model: opus (`orchestrator-opus`, the fallback).**
Fable is out of credit for this item, so this is an opus ruling, not a fable one — the same as the
plan sitting. Read it as such.

**Reviewer:** sol, gpt-5.6, effort xhigh, `--sandbox read-only`, against `plan.md` at `219cae23`.
**Findings:** 12 (6 BLOCKER, 3 MAJOR, 3 MINOR) plus a closing verdict of *"replace the plan"*.
**Raw output and distillate** are committed beside this file as `gate1-sol.md` and
`gate1-sol-distilled.md`. They were moved into the record in this sitting rather than the next one,
because Gate 1 is closed and evidence left only in the artifacts directory dies with the sweep.

**I read every finding against the code myself.** The reviewer's word was checked exactly as hard as
the plan's. Where I confirmed something with my own eyes I say so with the line I read; where I did
not, I say that too.

---

## The headline ruling: the plan is AMENDED, materially, and NOT replaced

The verdict asks for a replacement on two grounds. I uphold the first and reject the second.

**Ground one — "the central witness design fails open" — is CORRECT, and it is my own defect.**
`plan.md:73` says: *"`'real'` therefore has no spelling anywhere. It is the absence of a reason."*
That sentence is the hole. It makes `real` the outcome of a witness that found nothing to say, so a
`clock.controlled` value with its `advance` stripped is classified **real** — `realCapability()`
reached through a different door, which is the precise shape this item exists to close. The reviewer
earned this finding and I adopt it without reservation.

But the remedy is not a different mechanism. It is a third outcome. A witness returns
`{ kind: 'stand-in', reason }` or `{ kind: 'real', evidence }` **or it throws**; `null` stops
existing, and "I have nothing to say about this value" refuses instead of defaulting. That is the
same mechanism made fail-closed. It changes D1's central sentence, and it does not change D1's idea.

**Ground two — "a tier-separated adapter route is smaller and materially stronger" — is REJECTED,**
for three reasons, none of which needs the founder citation the plan wrongly leaned on.

1. **It does not cover the item.** Eight capability names are constructed in `index.ts`. Five of
   them — `clock.controlled` (`:118`), `config.registry` (`:123`), `sentinels.planted` (`:137`),
   `faults.injection` (`:138`), `vendors.email` (`:142`) — involve no adapter at all. Tier-aware
   adapter selection reaches `fixtures.worlds` and the `sut.*` family and nothing else, and it
   leaves `realCapability`/`standInCapability` in place as the labelling API. The item is
   *"provenance is a caller"*; the caller is `index.ts`, at eight sites. The alternative is not
   smaller and stronger, it is smaller and **narrower**.
2. **It is a real behaviour change belonging to a later slice.** Making the above-loop path select a
   module that does not exist turns `createHarness({ tier: 'integration' })` from something that
   returns a harness into something that throws at load. I checked whether it returns one today:
   `createOracleCapability` at integration builds a live transport that constructs fine and only
   throws when `judge()` is called (`oracles.ts:1138`, and `oracles.selftest.ts:1014-1023` drives
   exactly that path), so an integration-tier harness does build. The tree already names the owner
   of this work in its own words, at `oracles.ts:1022`: *"deferred to the slice that makes the
   integration tier real."* I file it there rather than absorb it here.
3. **It is a good idea and I am recording it as one.** See §"Filed, not built" at the end. Rejecting
   it as this item's work is not rejecting it.

**The amendment is large enough to say so out loud.** D1 gains a third verdict, D4 changes shape,
the `sut.*` prefix disappears, and S1, S4 and S6 are rewritten. My contract's DRAFT sitting rules
findings, amends the plan, pushes both **before** any code, and then drafts — there is no second
plan gate in it, and inventing one would cost a cycle to review prose when Gate 2 is about to review
the real code. So I proceed to draft, and I point Gate 2's prompt directly at the seams that moved.
That is the second look, and it looks at code instead of at paragraphs.

---

## Finding-by-finding

### [1] BLOCKER — "D3's witnesses fail open" → **ADOPTED IN FULL**

> *"for a known capability, absence of the stand-in-shaped method produces `null`, which the plan
> defines as \"real,\" without any positive evidence of real backing."*

Correct, and it is the most important thing in this review. Ruled in the headline above.

Three sub-claims, each checked:

- *"`Clock` and `Vendors` actually require those methods at `contracts.ts:54-57,120-138`."*
  **Confirmed** — I read both. `Clock` is `freezeAt` + `advance`; `Vendors` is
  `{ email: EmailProviderSim }` with `rejectNext`/`acceptButLoseAck`/`accepted`/`attempts`.
- *"so the same shape test also rejects every future product-backed implementation conforming to
  those contracts."* **Confirmed as a fact, REJECTED as a defect.** The plan already owns this at
  `plan.md:264-267`. Under the fail-closed amendment it gets sharper, not softer: these two names
  have exactly two reachable outcomes, stand-in or refusal, for as long as the harness's contracts
  are control seams. That is the truth about a harness with no product behind it, and stating it is
  the item's purpose rather than a cost of it.
- *"`advance` is inherited from `ControlledClock.prototype`, not an own property, so an otherwise
  conforming `Object.hasOwn(value, 'advance')` witness would misclassify today's object
  immediately."* **Confirmed with my own eyes** — `clock.ts:1` is `export class ControlledClock`
  and `:10` is `async advance(ms: number)`, a prototype method. `Object.hasOwn` would return false.
  This is a genuine implementation trap and it goes into the plan as a named instruction, not as a
  footnote: the witnesses test callability through the prototype chain
  (`typeof v.advance === 'function'`), never own-property presence.
- *"The vendor seam is correctly one level down and directly reachable: `index.ts:127,142` →
  `vendors.ts:84-93`."* **Confirmed at `index.ts:142`** — the registered value is a fresh wrapper
  `{ email: provider.sim }`. This agrees with the plan's own note at `plan.md:102-104`.

### [2] BLOCKER — "D4 defines no trustworthy route to the witness" → **ADOPTED IN PART**

> *"D1 says the constructor takes only name and value, while the witness takes additional
> `evidence`; S3 then assumes callers can supply that evidence."*

**Adopted.** A straight internal contradiction in my own text: `plan.md:65-70` says name and value,
`plan.md:72` gives the witness `(value, evidence)`, and D6 at `plan.md:136-138` has the oracle call
sites hand over tier and transport kind. The constructor takes all three. Plan text corrected.

> *"In the real loader, `moduleUrl` is local and discarded."*

**Confirmed** — `index.ts:64` computes it, `:102` returns only `module.createFixtureAdapter(...)`.
`loadAdapter()` must return the URL alongside the adapter. Adopted as a named step.

> *"Adding a caller-supplied URL simply replaces the caller-supplied word `real` with a
> caller-supplied path."*

**REJECTED as applied.** The URL is not caller-supplied and cannot be. `adapterUrl()` at
`index.ts:53-55` builds it from `REPO_ROOT` plus the requirement; `createHarness` is its only caller
and passes no path. Threading a loader-computed value out of the loader is exactly what the
reviewer's own closing paragraph asks for — *"evidence should be loader/producer-owned and
opaque"* — so this objection contradicts its own remedy.

> *"`adapterUrl()` always selects `suites/<requirement>/_fixture.ts`, regardless of tier."*

**Confirmed, and it forces an honesty correction I am making unprompted.** A witness that *branches*
on a value with exactly one possible output is a constant dressed as a check, and dressing a
constant as a check is the same dishonesty this item exists to remove. So the adapter-derived route
does not branch. It returns stand-in **unconditionally**, and the module URL is the *content of the
reason string* — so the refusal names the module actually loaded — never the condition of a test.
The plan now says that in those words. This was PHASE-STATE's own attack question 4 and it deserved
a straight answer rather than a defence.

### [3] BLOCKER — "the founder ruling does not bear on adapter routing" → **ADOPTED IN FULL**

> *"`AI4DEV-3-at-harness.md:52-64` rules specifically on provider/vendor simulators … It says
> nothing about whether the harness needs separate loop and integration adapter paths."*

**Correct, and I read the passage myself to be sure.** Lines 52-64 amend item 8, *"Provider/vendor
simulation at the seams"*, and rule that the five named vendor stand-ins are each built with the
first suite that consumes them. Lines 32-38 separately define `integration` as *"real components +
real test DB"*. Nothing there rules on adapter routing.

`plan.md:118-122` cited that ruling as settling D4/D5. It does not, and this is the more serious
half of the finding: the shared invariants forbid converting what the founder said about one thing
into authority over another, and a miscited ruling is a declared fact drifting from a real one with
nothing able to notice. The citation is corrected to what it is — a **principle I am extending by
analogy, on my own authority**: *"a sim contract authored without its consuming test is a guess that
gets rewritten when the real suite arrives."* I still find it persuasive. It is no longer presented
as a founder ruling on this question.

D5's rejection stands on grounds 1 and 2 of the headline, which never needed the citation.

### [4] BLOCKER — "S4 cannot inspect `standInReason` through `createHarness()`" → **ADOPTED**

> *"`createHarness()` keeps every wrapper in the private `constructed` array and returns only
> `.value` fields."*

**Confirmed** — `index.ts:156` builds `constructed` as a local, `:159-183` returns the harness
object, and `stubbedCapabilities` at `:161` returns `string[]`. S4 assertion 1 as written is not
executable. A real defect in my plan.

Of the three remedies the reviewer offers I take none exactly. Adding a diagnostic member to
`AtHarness` is the wrong one: the doctrine at `contracts.ts:307-309` covers *"everything reachable
from the harness object AND the objects `open()` hands a test body"*, so a diagnostic there is a
diagnostic in front of every suite. Instead `index.ts` **exports the ledger builder**;
`createHarness` consumes it and still returns only values. The harness's own conformance test imports
the builder directly; a suite, which only ever holds an `AtHarness`, cannot reach it. Finding
answered, suite-facing contract untouched.

### [5] BLOCKER — "S1 cannot be executed under the draft contract" → **ADOPTED, fixed differently**

> *"The executor's draft contract expressly says \"Do not run the verify suite\" at
> `.claude/agents/executor.md:22-24`."*

**Confirmed verbatim at `executor.md:22-24`.** S1 as written asked the executor to do something its
contract forbids.

> *"a test that calls today's `realCapability` exploit stops compiling when S2 removes that export."*

**Confirmed** — `capabilities.ts:17-19`, and S2 removes it. The S1 test could not survive its own
item.

The reviewer's remedy (*"an explicit pre-draft evidence step"*) is right about the shape and points
at the wrong actor. The evidence does not belong to the executor at all: it is a measurement of the
tree **before** anything changes, so it belongs to this sitting. I dispatched a mechanical to capture
it at the pre-fix head — the verify tally, the selftest baseline, and a six-line probe showing the
capability API accepts a caller-supplied `real` for all five names the harness stands in for,
yielding an empty stand-in ledger. It lands in the record as `baseline-before-fix.md`, pinned to the
pre-fix SHA, and it needs no test that survives S2 because it is not a test.

The *surviving* assertions become the things that still mean something afterwards: the labelling API
is gone, an unwitnessed name throws, and a known name with a malformed value throws.

### [6] BLOCKER — "S6's byte-identity check is guaranteed to pass" → **ADOPTED IN FULL**

> *"Once a changed expected JSON or acceptance test is committed, that command compares the clean
> working tree to the index and prints nothing. This directly permits the forbidden declaration
> change while satisfying the criterion."*

**Correct, and it is the sharpest finding in the review.** `git diff --stat <path>` on a tree that
S6 itself requires to be clean is empty by construction. I wrote a guard that cannot fail, inside
the item whose subject is guards that cannot fail. Replaced with a blob-hash comparison against the
merge base, which survives commits and is exact:
`git rev-parse origin/main:<path>` against `git rev-parse HEAD:<path>`.

The tail — *"S5 has the same weaker form: \"only intended hits\" names no exact permitted set"* — is
also correct and cheaper to fix than it looks. After S2 the exports do not exist, so the permitted
set is **zero occurrences** outside `loop/items/`. An exact number, not a judgement call.

### [7] MAJOR — "three of S4's five assertions already pass" → **ADOPTED, with one correction to the reviewer**

**Confirmed** against `conformance.selftest.ts:146-168`: the exact-list assertion at `:154-160` plus
`not.toContain('config.registry')` at `:161-164` already establish that the harness-owned
capabilities are off the stand-in list, and assertion 4 is literally the existing test at
`:138-143`.

**Confirmed** that assertion 5 does not reach the enforcement: `openWorld` at `registry.ts:595` is
not exported, so no conformance test can call it, and checking `stubbedCapabilities()` is not
checking the gate at `:618-620`.

So S4 is split: **new-guard assertions**, which must go red when their guard is reverted, and
**preserved assertions**, which pass before and after and are regression guards. A regression guard
is legitimate; claiming it proves a new guard is not, and my plan claimed that at `plan.md:190`.

**One thing the reviewer missed and I am adding**: the existing test at `:138-143` calls
`standInCapability` directly (`conformance.selftest.ts:13,139`), which S2 deletes. It is not merely
"preserved in meaning" — it must be **rewritten** against the new constructor. My plan said preserved
and did not say rewritten.

*"\"Both sides of every witness\" is also inaccurate"* — **accepted**. Under the amendment every
witness family gets its refusing branch exercised as well, which is now three branches for the two
seam witnesses, not two.

### [8] MAJOR — "section 7's claim is narrower than the actual residual" → **ADOPTED**

> *"The capability value being judged need not remain the object handed to the suite … An edit can
> witness a stripped facade while returning the original functioning clock or simulator, leaving
> AT-016.08 and the vendor behavior tests green."*

**Confirmed as a hazard, with one factual correction.** Today the objects *are* the same — `clock`
is created at `index.ts:118` and `h.clock` is `clock.value` at `:162`; `vendors` at `:142` and
`h.vendors` at `:174`. The reviewer's *"coupled only by convention"* is the accurate part: nothing
enforces it, so an edit could decouple them, and then the self-defeating-lie property evaporates
while behaviour tests stay green.

The remedy is structural and costs nothing, because the ledger builder from finding 4 already exists:
`createHarness` derives every capability member from its ledger entry's `.value`, one expression
each, so the object judged **is** the object handed over, by construction rather than by convention.

§7 is rewritten to the honest ceiling the reviewer proposes. *"the seam must be removed"* was too
strong and it goes.

### [9] MAJOR — "`sut.*` is an open witness namespace" → **ADOPTED, fixed differently**

The doctrinal complaint is right — a prefix that swallows everything under `sut.` means nobody
decided about SUT names, which is what D2 exists to prevent. The severity is overstated in one
respect I want on the record: the `sut.*` witness returns stand-in, so a typo produces a false
**red**, never a false green.

The reviewer's remedy is to register from the adapter's key set after loading. I go one step
further, which is smaller: **SUT capabilities and `fixtures.worlds` leave the name table entirely**
and are built on the adapter-derived route with the module URL as evidence. There is then no prefix,
no wildcard and no typo surface, because the only thing that ever constructs a `sut.<key>` is
`Object.entries(adapter.sut)` at `index.ts:153`. The name table becomes six exact names and is
genuinely closed, which is what D2 claimed and did not deliver.

This also settles the runner's generated adapters without a special case: I read
`runner-blackbox.selftest.ts:54-61` and their `sut` is `{ probe: … }` with no fault or sentinel seam.
`sut.probe` needs no entry, because nothing looks a SUT name up.

*"S3 also says \"six witnesses\" while naming eight"* — **correct**; I count eight in my own S3 text.
Corrected, and under the amendment the name table holds six while two families move off it.

### [10] MINOR — "converting `Capability` to a type alias is unrelated hardening" → **ADOPTED**

> *"it is an unrelated hardening refactor based on the false statement that it is \"the only
> interface left on the harness path\"—there are numerous internal interfaces, including
> `FixtureAdapter` and `FixtureAdapterModule` at `index.ts:16,31`."*

**The false statement is mine and I confirmed it false with my own eyes**: `index.ts:16` is
`interface FixtureAdapter` and `:31` is `interface FixtureAdapterModule`. `plan.md:275-276` is wrong.

And the doctrine does not reach it: `contracts.ts:307-309` covers what is reachable from the harness
object and from what `open()` hands a body, and `Capability` is reachable from neither — my own plan
concedes it never reaches a suite. The conversion is dropped. Project guidance is explicit that a
change must trace to the request and that adjacent code is not to be improved in passing; a
one-line change justified by a false premise is exactly that.

### [11] MINOR — "the count is right, the file is not runtime evidence" → **ADOPTED**

Eleven is confirmed as the declaration count and the plan's correction of the board's "twelve"
stands. The reviewer is right that an expected-state file is not a runtime measurement, and this is
the one finding it flagged as needing a run. It is being run this sitting, at the pre-fix head, by
the mechanical capturing `baseline-before-fix.md` — so the number in the amended plan will be a
measurement rather than a reading. If the run disagrees with eleven, the plan takes the run's number
and says why.

### [12] MINOR — "§2(b) mischaracterizes `_fixture.ts:15-18`" → **ADOPTED**

> *"the record should say the old enforcement was insufficient, not nonexistent."*

**Correct, and I read the header to check.** `_fixture.ts:15-18` says the ledger marks
`sut.notifications` a stand-in through `standInCapability` and that the registry refuses any stubbed
capability above loop — both are real mechanisms at `index.ts:153-155` and `registry.ts:618-620`.
My §2(b) called the header *"a false claim about its own enforcement"* and said the named mechanism
*"is itself a word in a file."* That is an overstatement, and writing a false accusation into the
record is the same class of defect as writing a false green. The only over-strong part of the header
is its last sentence, *"The gate can only ever be satisfied by the real implementation"*, because
the label was editable. §2(b) is rewritten to say insufficient, and S5 rewrites the header to name
what enforces it after the change.

---

## Filed, not built — reported upward, absorbed nowhere

**Tier-specific fixture-adapter selection.** Loop loads `_fixture.ts`; above loop selects a distinct
product-adapter path and fails explicitly while that module does not exist. This is the reviewer's
alternative, and rejecting it as *this* item's work is not rejecting it. It is a second, independent
barrier: after this item the stand-in ledger can only be emptied by editing a named witness, and
tier-aware selection would make the reference adapter unreachable above loop even then. The tree
already names its owner in its own words at `oracles.ts:1022` — *"deferred to the slice that makes
the integration tier real."* **Recommend filing**, with the note that it changes
`createHarness({ tier: 'integration' })` from returning a harness to throwing, which has its own
blast radius through the oracle selftests.

The two items the plan already reported for filing — the static provider scan having no owner, and a
typed `stubbed-capabilities` failure kind belonging to the structured-capability-codes item — are
unchanged by this review and still stand.
