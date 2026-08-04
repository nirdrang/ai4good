# AI4DEV-19 — rulings on the executor's report and the proof-staleness caveat

Ruled by the item agent (**OPUS**). Authority for these sits with this item; nothing here went
back to the coordinator for a decision.

## 1. The executor's six design errors — all accepted, none reversed

| # | finding | ruling |
|---|---|---|
| 1 | `at:verify` alone never contains the atomicity complaint; it prints one line per id and vitest elides the array as `[ …(11) ]` | **Accepted.** My brief named a string the prescribed command cannot emit. Fixed by capturing the direct vitest run alongside it. |
| 2 | Step 3b tightened the oracle *after* step 2 captured the RED, so the transcript quoted a message the tree could no longer produce | **Accepted — my ordering defect.** Re-capture ordered and delivered at `fec959b`. The executor was right to follow the brief rather than silently reorder it. |
| 3 | Nothing validated the fault KIND — a point could accept `lose_ack`, no-op, still increment its trigger count, and read as fault-injected | **Accepted, and this is a real hole I missed.** Closed fixture-side with a test. |
| 4 | "two-method adapters" — they export three members | **Accepted**, immaterial to the ruling that depended on it. |
| 5 | Ruling 4's "fixed at runtime, not in the type" understated it: an adapter-side seam was needed | **Accepted.** `contracts.ts` is genuinely untouched, so the ruling stands; the framing was loose. |
| 6 | `processRestart()` is thinner than the contract's prose — `drainDeliveries` holds no state between calls, so nothing can be dropped | **Accepted and important later, not now.** The executor was right **not** to invent volatile state for a restart to discard; that would be staging the proof. Flagged for whoever builds the real delivery worker. |

On finding 3 the executor put the kind check in the fixture rather than in `guards.ts`, reasoning
that which kinds a point honours is the product's business and a generic guard would need new
contract surface this item was told not to add. **That reasoning is correct and I endorse it.**

## 2. The proof-staleness caveat — FILED, not built

The caveat, and it is well-raised: `proof-red.txt` reproduces from the merged tree only **by
hand** — someone must revert the rollback hunk to see the red. Nothing in the repository enforces
that the transcript still describes the code, so if the fixture's fault handling changes later the
proof goes stale **silently**. That already happened once inside this item, which is what makes it
a demonstrated risk rather than a hypothetical one.

The concern is exactly right in kind: evidence that looks like evidence after it has stopped being
true is the same false-green shape this harness exists to prevent.

**Ruling: file it, do not build it here.** The skill's ride-along rule is explicit — what rides
along is "what the item needs" and "small corrections to machinery being used while using it";
what gets **filed, not built** is "independent work that could stand alone and costs real time".

Enforcing proof freshness means a mutation check: revert a known-good behaviour, assert the suite
notices, restore. That is general harness infrastructure serving **every** red-then-green proof in
every future item — not an H3 concern. Building it inside this item would grow the diff well past
what these gates reviewed, and would bury a broadly useful mechanism inside a sentinels-and-faults
commit where nobody would look for it. It is also the natural companion to the measurement this
item already performed by hand twice (no-op sentinels still pass the gate; the old oracle passes a
misplaced fault), which is the strongest argument that it deserves its own item rather than a
footnote in this one.

**What rides along instead, because it is one line and closes the silent half:** `proof-red.txt`
records the commit it was captured against, so a reader can see at a glance whether the fixture
has moved since. That converts *silently* stale into *visibly* stale, which is the property
actually being bought. The enforcement remains filed.

Named in the final report so it is not lost. I am not opening a board item for it — the founder
places filed work.

## 3. Ride-along from the machinery: a subagent cannot address its parent by TYPE

My executor's report went to the coordinator instead of to me: it addressed `item-agent`, which is
the agent **type** name, not a reachable running agent id. The coordinator relayed it, so nothing
was lost — but only because a human-shaped fallback existed.

This is a real defect in how I briefed it, and it generalises: **a spawning agent must give its
subagent its own agent id and tell it to send there.** A subagent cannot look its parent up by
type. Left unfixed, an item agent running with no coordinator watching would simply lose its
executor's report, which on this item was the single most valuable artifact produced.

Recorded here and carried into the reflection section of the final report, per the rule that a
correction exists only if it lives in a file that loads every session.
