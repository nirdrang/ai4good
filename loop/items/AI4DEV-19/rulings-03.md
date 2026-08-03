# AI4DEV-19 (planted markers, forced failures) — Gate 2 rulings

**Item agent model: OPUS.** Fable is out of the founder's credits; this is the documented
fallback, and a fable run and an opus run are not the same evidence. Stated here because the
agent that ran Gate 2 died mid-read and this is a **resumed** item — the reviews below were
committed unread by anyone.

Chain, derived by walking `parent` upward from the item until one had none:

```
~bringup > AI4DEV-3 (acceptance-test harness) > AI4DEV-19 (planted markers, forced failures)
```

`AI4DEV-3` has no parent and carries the Linear label `attr:bringup`, which renders as the
floating root `~bringup`. Nothing in this chain was accepted from a brief.

Both reviewers finished. Terra raised 4 findings, Kimi 5. Every one was re-derived against the
tree before being ruled on — none was accepted or refused on the plausibility of its sentence.

## The ruling table

| # | raised by | the claim | ruling |
|---|---|---|---|
| A | terra 1 (P1) | AT-016.07's "restart" changes only an unused label; the green is unearned | **UPHELD — false-green class. Fixed.** |
| B | terra 2 (P1) | AT-016.09's oracle reads only two of the four things it claims roll back | **Accepted. Fixed.** |
| C | terra 3 (P2) **and** kimi 1 (#1) | `state.nextId` is a third side effect the "ONE ROLLBACK UNIT" does not roll back | **Accepted. Fixed.** |
| D | kimi 2 | arming an armed point displaces it silently; clearing the replacement disarms the point | **Accepted. Fixed.** |
| E | kimi 3 | sentinel uniqueness is exact-equality while the scan matches by substring | **Accepted. Fixed.** |
| F | kimi 4 | the fault KIND is validated per-adapter, not through a guard | **REJECTED — filed.** Not false-green class; reasoning below. |
| G | terra 4 (P3) | the proof files claim content they do not contain | **Accepted. Fixed.** |
| H | kimi 5 | `faults.ts:13` says "the four judgements" and routes three | **Accepted. Fixed.** |

## A — terra 1. The one that mattered, and it is upheld

The claim goes to the heart of what this item says it delivered, so I ruled it on the code.

**Verified, and it is worse than stated.** `processRestart()` (`_fixture.ts:241-243`) assigns
`processEpoch` and nothing else. An exhaustive search for readers of `processEpoch` across
`tests/` returns exactly two: `faults.ts:47`, which is the harness's own before/after comparison,
and the type declaration. **No code on the delivery path reads it.** `drainDeliveries()`
(`_fixture.ts:333-341`) iterates `state.deliveries` and `state.events` and consults no process
identity at all.

The consequence is mechanical: **deleting line 39 of `b-delivery-defaults.test.ts` — the
`processRestart()` call itself — leaves AT-016.07 passing identically.** A step whose removal
changes no outcome did not participate in the result.

And a second one the reviewer did not reach: no code path anywhere appends a second delivery for
a recipient-channel pair. `emitKnown`'s loops (`_fixture.ts:290-303`) write one per pair by
construction and `drainDeliveries` mutates in place. So the `duplicated` assertion at
`b-delivery-defaults.test.ts:49-50` — the test's central anti-duplication claim — cannot fail
in this fixture regardless of restarts.

**Why this is the item's defect and not an inherited one.** The declaration move is this item's
own act: nothing forced `AT-016.07` to go green rather than the work being scoped to leave it
red. `rulings-02.md` item 6 already recorded that `processRestart()` is "thinner than the
contract's prose" and ruled it "important later, not now" — while greening the test in the same
change. That is the seam: the observation was accepted and its consequence was not drawn.

The asymmetry is the cleanest statement of it. This item **tightened** AT-016.09's oracle
(commit `a7d5b70`) precisely because the old form "passed on nothing", and captured a real
falsification to prove the new one discriminates (`proof-oracle.txt`). It applied that standard
to one test and not to the other.

**What I did NOT order, and why.** Terra's remedy (i) is "make restart replace an actual worker
used by delivery". Building a delivery worker with volatile in-flight state inside a stand-in
fixture is independent work with real blast radius across five tests, and my predecessor's
ruling that inventing state whose only purpose is to be discarded would be *staging the proof*
is right on that narrow point. **Filed, not built** under the skill's own rule.

Terra's remedy (ii) — keep AT-016.07 red — I costed and refused. `AtPending` with
`sut-missing` is raised per **suite** at `registry.ts:623` when the bound seam is absent; there
is no per-test mechanism for one id to declare a missing sub-capability, and inventing one is
harness surgery larger than the defect.

**What I ordered instead.** Make the epoch load-bearing on the delivery path: `drainDeliveries`
stamps the identity of the process that performed each send, and AT-016.07 asserts the pending
work was completed by the **post-restart** identity, which differs from the pre-restart one.
That closes exactly the mechanism terra named — "`drainDeliveries()` never observes or replaces
a delivery worker" — and makes the restart causal instead of decorative: an epoch that the
delivery path does not read now fails the test.

It is required to carry the same evidence AT-016.09 was held to: a captured falsification
showing the test **fails** when the coupling is reverted. Applying that standard to both tests
is the whole substance of this finding.

**Residual limitation, written down rather than implied:** at loop tier there is still no
volatile in-flight state for a restart to lose. What is now proven is that the identity changed,
that the delivery path reads it, and that durable pending work was completed exactly once by the
new identity. Proving that a restart *loses and recovers* work needs a real delivery process.
Filed for whoever builds one.

## C — terra 3 and kimi 1, independently. The strongest signal this gate produces

Two vendors, two chains of reasoning, one defect. `const eventId = \`event-${state.nextId++}\``
(`_fixture.ts:258`) runs **before** `reachFaultPoint` at line 276, and the catch at 277-281
restores only the transition. The comment at 266-272 claims "ONE ROLLBACK UNIT … so neither side
is committed"; the id allocation is a third side effect that survives the crash, and the comment
does not mention it.

Accepted without reservation. Allocating after the fault point removes the side effect rather
than compensating for it, which is why I chose it over restoring the counter in the catch.

## F — kimi 4, rejected. Stating the classification, because it decides who may rule

Kimi asks for the fault **kind** to be validated through a guard, with the adapter seam
extended to declare which kinds each point implements.

**This is not false-green class,** and I say so explicitly because the escalation rule turns on
that classification. No currently-declared green depends on it. The tree has exactly one fault
adapter, it refuses every non-`crash` kind (`_fixture.ts:226-230`), and a conformance test drives
that refusal. The hazard kimi describes requires a *second, future* adapter that accepts a kind
it does not implement. That is a forward-looking centralization gap, not a claim that anything
declared green today is false.

Refused on the merits it was already refused on once: it needs new surface on `AdapterFaultSeam`,
and the brief's decision 1 admits contract changes only when implementation proves a contract
wrong. Implementation proved the opposite — the check lands correctly where the knowledge lives.
`rulings-02.md` item 3 ruled this and I re-derived it rather than inheriting it.

**Filed** for whoever adds the second fault adapter, which is the moment the centralization
argument starts paying for itself.

## G — terra 4. A ride-along that was ruled and then not delivered

Both halves verified. `proof-red.txt` contains no commit hash — the only hex-shaped tokens in it
are the old worktree's folder name. `proof-green.txt:6` says "the gate is the `--expect` run,
which is in the report", and the file contains no `--expect` transcript at all.

This is sharper than a documentation nit: `rulings-02.md:45` explicitly ruled that the capture
commit **rides along** in this item, calling it "one line" that "closes the silent half". It was
ruled and not delivered. A promise recorded and unkept is worse evidence than no promise, because
a reader who finds the ruling stops looking.
