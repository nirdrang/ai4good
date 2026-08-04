# AI4DEV-19 — rulings on the executor's four challenges (round 2)

**Item agent model: OPUS** (documented fallback; fable is out of credit).

The executor implemented all seven ordered fixes and then challenged the rulings in four places.
Three are upheld against me and one is a process lesson. This is the round the item's own thesis
was aimed at, so I am taking all of it.

## 1. Fix C landed with no test — UPHELD AGAINST ME. Build the guard.

The executor's words: revert the allocation back above the try/catch and the entire suite stays
green. It proved the fix with a throwaway probe and then deleted the probe.

That is indefensible in *this* item specifically. The whole subject of AI4DEV-19 is greens that
are not earned, and the round repairing them introduced a change with no oracle behind it. Both
reviewers called the `nextId` defect "latent" because nothing reads id contiguity — and that is
exactly as true after the repair as before it. A repair that nothing can notice being undone is a
repair on the same footing as the defect.

**Build the conformance case the executor proposed:** arm the fault, fire and let it crash, clear,
fire again, and require the surviving event to be `event-1`. Against the pre-fix allocation that
case yields `event-2` and fails, which is what makes it a guard rather than a restatement.

## 2. The unfailable anti-duplication assertion — UPHELD AGAINST ME. Say so in the code.

`rulings-03.md` recorded that no code path anywhere appends a second delivery for a
recipient-channel pair, so AT-016.07's `duplicated` assertion cannot fail in this fixture. I
recorded it and ordered nothing about it.

The executor's objection is correct and it is my own argument: *leaving it
observed-in-a-ruling-and-invisible-in-the-code is the shape of the thing this round is repairing.*
A limitation that lives only in a rulings file is a limitation nobody will meet again.

**Not** to be repaired by making the fixture able to duplicate — that needs the real delivery
process, which stays filed. Repair it by making the limitation visible where the assertion sits: a
comment stating plainly that in this fixture one delivery per pair is written by construction and
the drain mutates in place, so this assertion cannot fail here; its value is as a regression guard
for the tier where a real delivery process exists. Name what it is waiting on.

## 3. The stamp records the last drain, not the first send — ORDERED, and the reason it was declined does not hold.

The executor declined this because re-capturing proofs a second time seemed disproportionate. I
measured that cost instead of estimating it: **no proof file embeds a `_fixture.ts` line number
at all.** The pinned stack references across all four proofs are `registry.ts:486/555/778`,
`c-reliability-guard.test.ts:85/102/123` and `b-delivery-defaults.test.ts:58`. Editing
`_fixture.ts` invalidates nothing.

So the change is cheap and it removes a clause that the executor itself called "defensible rather
than airtight". Guard the stamp so a delivery keeps the identity of the process that **first**
sent it. Then the docstring's claim — a send after a restart carries a different string than one
before it — is true rather than nearly true.

## 4. Capture only after the final code commit — ACCEPTED as a process fix.

The executor added a cross-reference comment after capturing, which shifted line numbers inside
committed stack traces and forced a full re-capture. Its proposed strengthening is right, and my
brief's "re-capture last, not first" was too weak: **capture only once the final code commit
exists, and change nothing afterwards, including comments.** Carried into this item's reflection
so it reaches the next brief rather than dying here.

## Consequence for this round

All three code changes land first and get committed. Only then is every proof captured, against
that final commit, with nothing edited afterwards. `proof-restart.txt` needs re-capture regardless
because change 2 moves `b-delivery-defaults.test.ts:58`, which it pins.

This is the **last fix round**. Anything still open after it is ruled terminal in writing.
