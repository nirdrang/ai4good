# AI4DEV-48 — provenance is a verdict the harness computes, not a word a caller writes

**Item:** AI4DEV-48 (a green can be faked) · parent AI4DEV-3 (AT harness) · root label `attr:bringup`
**Sitting:** PLAN (sitting 1) · **orchestrator model: opus (the `orchestrator-opus` fallback).**

> **THE FALLBACK IS IN FORCE FOR THIS WHOLE ITEM.** Fable is out of credit, so every sitting on
> AI4DEV-48 runs as `orchestrator-opus` (opus at effort max) rather than the usual fable at xhigh.
> This is a different agent TYPE, not a model override on the fable definition. A fable run and an
> opus run are not the same evidence, so downstream sittings, the reviewers and the founder should
> read every ruling in this item as an opus ruling.

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
| flipping `standInCapability` → `realCapability` empties the stand-in list | **TRUE** | `index.ts:118,129,142,153-155` are the four stand-in sites; `capabilities.ts:25-30` filters on `provenance === 'stand-in'` and nothing else |
| `registry.ts` checks only the resulting names | **TRUE** | `registry.ts:618-620` — above `loop`, `expect(await h.stubbedCapabilities()).toEqual([])` |
| eleven notification tests are already green against the reference adapter | **TRUE, with a correction to the count** | `tests/at/expected/req-016.json` declares AT-016.02–12 green (eleven) and AT-016.01 red as `capability-pending` on `H3 static provider scan`. The board text says "twelve"; twelve is the number that would be green *after* the static scan lands, which is a different item's work |
| the reference adapter is specification-derived | **TRUE** | `tests/at/suites/req-016/_fixture.ts:1-19` |

**Two things I found that the finding did not say, and both matter.**

**(a) The harness already knows how to do this, one layer down.** `createOracleCapability`
(`oracles.ts:1120-1147`) does not accept a provenance — it DERIVES one from the tier plus the
transport's `kind` brand (`oracles.ts:179`), and it REFUSES the mismatched combinations in both
directions: a loop-tier oracle on a live transport throws, an above-loop oracle on a replay
transport throws. `oracles.selftest.ts:209-210` states the doctrine in one line — *"a provenance a
caller asserts is not provenance"*. That work was done at the oracle layer and never carried to the
capability layer. This item carries it.

**(b) `_fixture.ts:15-18` contains a false claim about its own enforcement.** It says the
specification-derived claim *"is not left to a comment to enforce"*, and points at
`standInCapability` in `harness/index.ts` as the enforcement. That pointer is the defect: the thing
it names as enforcement is itself a word in a file. The comment must be corrected in this item, or
the record still lies after the code is fixed.

**One existing test is narrower than it reads.** `conformance.selftest.ts:138-143` proves a
*capability value* cannot lie about itself. It does not touch the *caller* lying about the value,
which is the door this item closes.

---

## 3. The decisions

### D1 — There is no way to assert a provenance. It is computed, per capability name, from evidence.

`realCapability` and `standInCapability` are removed as the labelling API. A capability is built by
one constructor that takes a name and a value and **computes** the verdict from a **witness**
registered for that name. The witness answers one question in this tree's existing house idiom
(`sentinelValueProblem`, `faultPointProblem`, `requirementMismatch` all share it):

> `standInReason(value, evidence): string | null` — a non-null string is the reason this capability
> is not the article; `null` means it is.

`'real'` therefore has no spelling anywhere. It is the absence of a reason.

**Why this and not "add a brand to each producing factory":** a brand stamped by the factory that
builds the simulator is the same lie one file to the left. `createEmailProviderSim()` returning
`kind: 'real'` is as cheap an edit as `realCapability(...)` is today. A witness that reads the
value's own seam is not.

### D2 — A capability name with no witness is REFUSED, never defaulted.

Not defaulted to real (that is the hole) and not silently defaulted to stand-in either. A name
nobody has decided about is an error at construction, naming the name. This tree has written the
reason down twice already, in `index.ts:76-100` and `registry.ts:661-677`: *a guard that switches
itself off when a field is absent is the hole again, arriving through the door marked convenience.*

### D3 — The four stand-in witnesses key on the CONTROL SEAM the capability exposes, so faking the verdict breaks the suites that depend on it.

This is the part that gives the change teeth, and it is available today without inventing anything:

- **`clock.controlled`** — the harness's `Clock` contract (`contracts.ts:54-57`) is `freezeAt` +
  `advance`. A capability that can be *commanded* to jump forward is not the passage of time. So
  the witness refuses on the presence of that command surface. To fake it you must remove
  `advance` — which reddens AT-016.08 and the clock-behaviour conformance test at
  `conformance.selftest.ts:648-679`.
- **`vendors.email`** — the harness's `Vendors` contract (`contracts.ts:120-138`) is the *simulator*
  seam: `rejectNext`, `acceptButLoseAck`, `accepted`, `attempts`. A provider that can be told to
  reject the next N sends, and that hands back every attempt that reached its seam, is a simulator.
  The witness refuses on that seam. To fake it you must remove the seam — which reddens AT-016.11,
  AT-016.12 and `vendors.selftest.ts`.

**The lie is self-defeating in both cases, and that property is the point of D3.** Note the value
registered at `index.ts:142` is a fresh wrapper `{ email: provider.sim }`, so the witness reads one
level down; the executor must check this against the actual object, not the type.

### D4 — `fixtures.worlds` and `sut.*` are refused on the PATH they were loaded from, not on a declaration.

These two come from the fixture adapter. There is exactly one fixture-adapter path in this harness:
`adapterUrl()` at `index.ts:53-55` builds
`<REPO_ROOT>/tests/at/suites/<requirement>/_fixture.ts`, and `loadAdapter()` holds the module to its
own declared `requirement` at both ends (`index.ts:92-100`). So the harness *derives*, and does not
take anybody's word for, the fact that every world and every system-under-test member it hands a
suite came from a module in the suites tree. There is no product-backed adapter path in this tree at
all. The witness refuses on that, and its reason names the module URL it actually loaded.

**I deliberately do NOT add a `backing` declaration to the adapter.** It was the obvious move —
`requirement` is a perfect precedent — and I rejected it: with only one legal value today the
witness would not consult it, so it would be a declaration with no decision behind it. Building the
seam for a product-backed adapter that does not exist is exactly the thing the founder ruled against
on 2026-08-04 (`loop/bringup/AI4DEV-3-at-harness.md:52-64`: stand-ins are built with the FIRST test
suite that consumes them, *"because a sim contract authored without its consuming test is a guess
that gets rewritten when the real suite arrives"*).

### D5 — I adopt the reviewer's third bullet and REJECT its first, with a reason.

The critique proposed three things. Dispositions:

| the critique's direction | ruling |
|---|---|
| "A reference adapter merely relabelled as real must be **refused**, not accepted" | **ADOPTED** — this is the item, and D1–D4 deliver it |
| "a structurally separate integration adapter path, rather than one adapter that can be relabelled" | **REJECTED as this item's work.** There is no product, no schema and no edge function for such an adapter to adapt; it would be a guess with no consumer, against the founder ruling cited in D4; and the item's own done contract does not ask for it. Refusing by construction is *stronger* than refusing by comparison against an alternative adapter, and needs none of it |
| "conformance tests proving that path consumes the validated local coordinates and product-backed seams" | **MOOT under the rejection above**, and reshaped: the conformance tests prove the refusal instead (S4) |

### D6 — The oracle keeps its derivation; it is routed through the new constructor, not rewritten.

`createOracleCapability` already derives correctly. Its two call sites (`oracles.ts:1136,1146`) lose
their direct labelling and instead hand the constructor the evidence they hold and `index.ts` does
not — the tier and the transport's `kind`. The tier/transport refusals at `oracles.ts:1129-1135` and
`:1139-1145` stay exactly as they are; this item does not touch the oracle's judgement.

### D7 — ONE slice, not several.

The witness constructor and every call site must change together or the tree does not compile, so
slicing would produce a non-compiling intermediate and a Gate 2 review of a half-change. The diff is
bounded (see §6) and sits in one subsystem. The code gate runs once, on the whole change.

---

## 4. Steps, each with its own done-criterion

**S1 — Reproduce the exploit first, as a failing test.**
Before changing any production code, add a conformance test that performs the exploit through the
current API and asserts it is refused. On the tree as it stands, this test must FAIL. Record the
failure output in `loop/items/AI4DEV-48/exploit-before.txt`.
→ *Done when:* the new test exists, is red for the stated reason, and the transcript is committed.
→ *Why first:* this tree's own recurring false-green shape is a guard that is computed and not
acted on. A test that never failed before the fix proves nothing about the fix.

**S2 — Rewrite `capabilities.ts` around the witness (D1, D2).**
One constructor. A closed witness table keyed by capability name (`sut.*` matched by prefix, since
the key set is the adapter's). `Capability<T>` gains `standInReason: string | null`, non-null
exactly when `provenance === 'stand-in'`. `stubbedCapabilityNames` keeps its signature and meaning.
An unwitnessed name throws.
→ *Done when:* `capabilities.ts` exports no function that accepts a provenance; `bun run typecheck`
is clean.

**S3 — Write the six witnesses (D3, D4, D6) and rewire the call sites.**
Refusing: `clock.controlled` and `vendors.email` on their control seams; `fixtures.worlds` and
`sut.<key>` on the adapter module URL. Accepting: `config.registry`, `sentinels.planted`,
`faults.injection` — these are the harness's own machinery, not substitutes for an article
elsewhere, and `index.ts:120-136` already argues at length why; the witness records that reasoning
in one place instead of three comments. `oracles.judge` derives from tier + transport kind.
Then `index.ts:118-156` and `oracles.ts:1136,1146` stop naming provenances.
→ *Done when:* no call site anywhere passes a provenance; the S1 test is green; `stubbedCapabilities()`
on a loop-tier harness still returns exactly `['clock.controlled', 'fixtures.worlds', 'oracles.judge',
'sut.notifications', 'vendors.email']`.

**S4 — The conformance wall (the item's done contract).**
In `conformance.selftest.ts`, alongside the existing false-green reproductions. Required assertions:
1. Each of the four reference capabilities, assembled through `createHarness()`, is a stand-in, and
   its `standInReason` names the seam or the module path that makes it one — not a generic string.
2. **Both sides of every witness.** The three harness-owned capabilities still come back real
   (a guard that refuses everything is as broken as one that refuses nothing, and it would break
   the existing `not.toContain('config.registry')` assertion at `conformance.selftest.ts:161-164`).
3. An unwitnessed capability name is refused at construction, naming the name (D2).
4. The existing test at `conformance.selftest.ts:138-143` is preserved in meaning: a value that
   claims `stubbedCapabilities: () => []` is still counted a stand-in.
5. **The integration gate still fires from the reference adapter**: a harness built at
   `tier: 'integration'` still reports a non-empty stubbed list, so `registry.ts:618-620` refuses.
→ *Done when:* all five hold, and each fails if its guard is reverted.

**S5 — Correct the record that the fix falsifies (§2b).**
`_fixture.ts:15-18` currently points at `standInCapability` in `index.ts` as its enforcement. Rewrite
those lines to name what actually enforces it after this change. Same for the provenance sentences
in `contracts.ts:335-341` and the four comment blocks at `index.ts:120-152` that argue a labelling
decision the code no longer makes.
→ *Done when:* no comment in the tree names `realCapability` or `standInCapability` as an
enforcement mechanism, and `grep -r "standInCapability" tests/` returns only intended hits.

**S6 — Verify, and prove the declaration did not move.**
Run the full gate (§5). `tests/at/expected/req-016.json` must be **byte-identical** — confirm with
`git diff --stat` showing it unchanged, not by eye.
→ *Done when:* every command in §5 passes and `git status --porcelain` is empty.

---

## 5. Expected verification state

**Per acceptance-test id — unchanged from today, and that is the claim.** This item must not move
the notification suite at all.

| id | loop tier, before | loop tier, after | why |
|---|---|---|---|
| AT-016.01 | red — `capability-pending`, `H3 static provider scan` | **identical** | the static scan is untouched by this item |
| AT-016.02 … AT-016.12 | green (eleven) | **green (eleven)** | no test body, no fixture behaviour and no config value changes |

| command | expected |
|---|---|
| `bun run typecheck` | clean, both projects |
| `bun run at:selftest` | green, including the new S1/S4 conformance tests |
| `bun run at:verify req-016 --tier loop --expect` | green against an unchanged `tests/at/expected/req-016.json` |
| `bun run at:check` | green (bijection unchanged — no AT id is added or removed) |
| `bun run lint` | clean |
| `git diff --stat tests/at/expected/req-016.json` | **no output** |
| `git diff --stat tests/at/suites/req-016/*.test.ts` | **no output** — no test body changes |

Negative controls the executor must actually run, not reason about: revert each new guard one at a
time and confirm the matching S4 assertion goes red. A guard that passes when disabled is not a guard.

---

## 6. Blast radius

May be touched: `tests/at/harness/capabilities.ts`, `index.ts`, `oracles.ts` (the two capability
call sites only), `conformance.selftest.ts`, `contracts.ts` (the `Capability` shape and the
provenance comments), the `_fixture.ts` header comment, and files under `loop/items/AI4DEV-48/`.

May **not** be touched: any file under `tests/at/suites/req-016/` other than the header comment,
`tests/at/expected/req-016.json`, `registry.ts`, `runner.ts`, any product code, any migration.

**Watch item for the executor:** the runner's black-box trees generate throwaway fixture adapters at
run time (`runner-blackbox.selftest.ts:54-74`, `runner-expect.selftest.ts:48-58`) exporting only
`requirement`, `sut`, `fixtures` and `teardown`. Their `sut` key is `probe`, so the `sut.*` witness
must handle a key it has never seen and an adapter with no fault or sentinel seam. If those
selftests go red, the witness is over-specified — fix the witness, not the generated adapters.

---

## 7. What a green here does and does not claim

**Does:** no caller in this tree can name a capability's provenance; the four reference capabilities
cannot reach `real` through any route the API offers; the integration-tier gate at
`registry.ts:618-620` cannot be satisfied by the reference adapter under any relabelling; and for the
clock and the vendor simulator, faking the verdict requires removing the very seam the suites drive,
so the lie reddens tests rather than hiding.

**Does not — and this bound is stated because a closure claim wider than the truth is the defect
this item removes.** The harness is source code. An author who edits a witness *and* the conformance
test that asserts it can still produce a false green. What changes is the character of the act: it
stops being a one-word relabel that reads like a routine promotion and becomes a multi-file edit
that visibly disables a named guard. That is the same ceiling `registry.ts:267-273` states about the
type seam, reached the same way, and this item claims no more than that.

Neither does it make the integration tier reachable. It makes the tier honestly unreachable, which
it already was — and note D3's consequence, worth recording because a later item will meet it: while
the harness's `Clock` and `Vendors` contracts are control seams, those two capabilities can never be
real. Reaching integration means changing what the harness hands a suite, not relabelling it.

---

## 8. Risks

1. **The witnesses over-fit REQ-016 and break the black-box trees.** Mitigated by the watch item in
   §6; the executor runs `at:selftest` before declaring S3 done, not after S4.
2. **`Capability` is an `interface`, the only one left on the harness path** (`contracts.ts:288-319`
   requires type aliases everywhere reachable from the harness object, and `Capability` is exempt
   only because it never reaches a suite). Adding `standInReason` to an interface is a declaration
   merging surface. Convert it to a type alias in S2 while it is being rewritten anyway.
3. **The removal in S5 is a removal, and removals are the rulings least likely to be re-examined.**
   The verification condition: after deleting each comment claim, `grep` must show the replacement
   text naming the real mechanism. A deleted claim with no replacement is a worse record, not a
   smaller one.

---

## 9. Out of scope — named here, absorbed nowhere

- **The static provider scan (`h.static`) is unconditionally pending** (`index.ts:173`), which is
  why AT-016.01 is red and why the board text says twelve where the file says eleven. It is
  harness-owned work buildable today and independent of the product, and supplying it is what would
  make the count twelve. **I checked the board and it has no item.** It is H3 work left unbuilt when
  H3 closed (AI4DEV-19, Done), and the machinery that would have caught an unowned red —
  AI4DEV-30, every declared red naming the item that will resolve it — is itself still in Backlog.
  **This should be filed as its own item.** It is not absorbed here.
- **A typed `stubbed-capabilities` failure kind** for the declaration file, so the integration
  refusal is structurally declarable rather than free-form text (finding 6 of the same Gate 1
  review). This is close enough to AI4DEV-28 — structured capability codes, already filed, and its
  own text says it *"Belongs to the slice that owns `capabilities.ts`"* — that it should be added
  to that item rather than filed fresh.
- **AI4DEV-28 overlaps this item's file and is still NOT absorbed.** This item rewrites
  `capabilities.ts`, which is exactly where AI4DEV-28 wants a machine-readable code emitted. It
  rides along nowhere: absorbing a filed, separately-scoped item into the last engine item before
  product work is the scope growth this plan exists to avoid. The one obligation on the executor is
  negative — the rewrite must not make emitting such a code harder than it is today.
