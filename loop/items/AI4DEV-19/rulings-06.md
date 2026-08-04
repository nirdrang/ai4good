# AI4DEV-19 (planted markers, forced failures) — fold of the confirmation wave

**Item agent model: FABLE.** Both raisers confirmed against final code commit `a970880`
(prompts at `f3dfa2d`), each resumed in its own Gate 2 session with its model pinned and the
pins verified in the run header — the property the wrong-model turn broke, restored.

## Kimi — every finding resolved, including the one only the raiser could resolve

| finding | verdict |
|---|---|
| 1 — `nextId` outside the rollback unit | CLOSED, and the raiser notes the repair has a real oracle: reverting the allocation fails the conformance case |
| 2 — silent displacement of a live arming | CLOSED, all three edges (double-arm, re-arm after clear, refused kind reserves nothing) confirmed through the real harness |
| 3 — sentinel containment overlap | CLOSED, including the discriminating control that keeps the check honest |
| 4 — fault kind not routed through a guard | **the raiser ACCEPTS the rejection and its not-false-green classification**, with its own reasoning: even in its future-adapter scenario the fault genuinely fires and counts — semantics drift, existence does not — so no oracle passes on nothing. Filed stands. |
| 5 — "four judgements" docstring | CLOSED — the sentence is now true of the code |

Finding 4 was the one ruling on the kimi side that the item agent could not hold alone if the
raiser contested the classification. The raiser accepts it. Nothing on the kimi side blocks the
merge, and kimi adds unprompted that terra's AT-016.07 pin is sound.

## Terra — three closed, one maintained, and the maintained one is not mine to overrule

Findings 2, 3, 4: **CLOSED**, each with a citation into the current tree, including the
re-captured proofs naming `a970880`.

Finding 1: **PARTIALLY CLOSED.** The raiser confirms everything the two fix rounds claimed: the
scenario pin is real, both falsifications are real (breaking the stamp fails; deleting the
restart call fails), the delivery path reads and stamps the identity. The residual it maintains
is exactly the one recorded since `rulings-03.md`: `processRestart()` changes a string; the
fixture has no delivery-process lifecycle; duplicate delivery is unexercisable by construction.
Its conclusion: *"It proves attribution after a modeled identity change, not restart resilience;
I still consider the 'across a restart' green unearned as a resilience claim."*

**The facts are agreed by every party** — terra, both raisers' confirmations, three generations
of rulings, the code comment at `b-delivery-defaults.test.ts:78`, and the proof trailer all
state the same limitation in the same words. **The conclusion is disputed:** terra reads the
green as overclaiming; the item's standing position is that a loop-tier green claims the modeled
half, the unprovable half is filed in writing for whoever builds a real delivery process, and
both of terra's remedies were ruled out for cause and re-derived across two agents (a throwaway
volatile worker is staging the proof; per-test capability-pending is harness surgery the
registry deliberately lacks).

**Escalated, not overruled.** A reviewer's maintained "this green is unearned" tag on a declared
green is the one classification the item agent may not reject alone — the same rule that put
kimi's finding 4 to its raiser puts this to the founder. The question is sent through the
coordinator for verbatim relay, with merge recommendation A (merge with the residual recorded)
against option B (scope change: per-test pending machinery or a real worker model). The merge
ruling waits for the answer.

## Cycle accounting, stated so the cap is not ducked silently

Cycle 1 of 2 is spent: fix (`a970880`) → confirm (this wave). Cycle 2 is **deliberately not
spent**: no in-scope fix exists that would move the raiser — it confirmed the mechanism and
maintains a position about what the tier may claim, whose only fixes are the two remedies
already ruled out for cause. Spending a cycle re-litigating a settled remedy would be motion,
not repair. Anything still open after the founder's answer is terminal by that answer.
