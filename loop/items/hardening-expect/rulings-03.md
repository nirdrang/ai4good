# ORCHESTRATOR RULINGS 03 — OP1, the three additions, and the CHECKPOINT

Board item: **AI4DEV-25**. These close the plan stage.

---

## R12 — OP1: "exact match" cannot be literal for the `pending` shape. **Your proposal is ACCEPTED: anchored prefix.**

You were right to stop rather than pick. Implement:

```
detail.startsWith(`AtPending: ${atId} PENDING [${phase}] — `)
```

Class, id and phase are all exact and anchored at position 0; only the trailing free text
is unconstrained — and it is unconstrainable by construction, since `sut-missing` carries a
suite-supplied string and `harness-missing` embeds a module-resolution message that differs
by machine and checkout path. A declaration that could never be written on a second machine
is not a stricter rule, it is a broken one.

This does not weaken R9's principle. The point of R9 was that a red must be described by
its SHAPE and IDENTITY, not by a substring that any other failure could also satisfy.
Codex's attack stays dead: a fixture-reset failure serialises as `Error: …` and cannot
begin `AtPending: `. Your alternatives were correctly weighed and correctly rejected — the
optional `detail` field is unrequested machinery that `harness-missing` could never use,
and dropping `kind: "pending"` would overrule a ruling to avoid a problem that has a clean
answer.

Record in the README (section 3) that `capability-pending` matches the whole first line
exactly while `pending` matches class + id + phase anchored, and say why the tail is free.

## R13 — the three additions beyond the brief's letter. **All three KEPT, none struck.**

- **§1a, the unit selftest** — keep. It is the only coverage of the `pending` matcher,
  since no REQ-016 red uses that shape. An untested matcher in a gate is exactly the
  centralized-guard risk the harness rules exist to prevent.
- **Case 8, the untagged failing `it()`** — keep, and it is the most valuable test in the
  set. It is codex's own blocker scenario, and you have shown the tree exits 0 without §2d.
  A fold that ships unproven is precisely what this loop exists to stop; without case 8,
  D4a would be a claim rather than a fact.
- **Case 9, `--expect --wired`** — keep. It proves a refusal this revision introduces, and
  costs no vitest spawn.

None of these is scope growth. Scope growth is building something the item did not ask for;
these three prove behaviour the item introduces. The brief's "seven cases" was my
enumeration of what I could foresee, not a ceiling — and the merge checklist requires that
required proofs exist, which is the stronger constraint. The ~7-12s selftest wall time is
a fair price and I am glad you named it rather than letting me discover it.

## R14 — verification step 8, the integration-tier refusal. **Your caution is correct; make it explicit.**

Confirm from the code path FIRST that the declaration refusal provably precedes
`readLocalConfig` and `acquireStackLock`. If it does, the live run is permitted. If there is
any doubt at all, make it a unit assertion instead — the standing constraint is that the
loop tier stays database-free and lock-free, and an accidental Docker or lock call breaks it
whatever the intent. If you run it live and it does anything beyond printing the refusal,
stop and report rather than interpreting.

---

# CHECKPOINT — APPROVED. Implement.

I have read the amended plan against the four things this checkpoint exists to check:

1. **Nothing silently dropped.** All seven Gate 1 findings carry a disposition; revision 1's
   six open questions are each stamped with the ruling that closed them; OP1 was escalated
   rather than absorbed.
2. **Folds stayed inside the contract.** F4/F5/F6/F7 were folded as R11 permitted; the two
   that turned out to have real consequences (the typed declaration reshaping req-016.json,
   and the conformance fixture needing the REAL `CapabilityPending` rather than a hand-rolled
   `Error`) were surfaced, not quietly absorbed. `capabilities.ts` is untouched, so D7 holds.
3. **Advice was folded as advised.** §2d implements R8's six conditions against the report
   fields I verified myself. §2c implements R9's typed shapes. R10 went to the README plus a
   filed deferral rather than into code.
4. **The plan still meets the done-criterion.** Verification step 5 is `--expect` → exit 0,
   and your ground-truth run shows R8's accounting already holds on the real declaration, so
   the new arithmetic does not put step 5 at risk.

Two findings of yours are worth recording as the reason this stage was not a formality:
AT-016.07/.09 carry ONE capability whose name contains "and" — revision 1's shorter
declaration passed only because substrings were enough, which is R9's own argument arriving
as evidence; and a conformance fixture throwing a plain `Error` could never have matched,
which would have made case 1 unpassable.

**Proceed to implementation.** W1 → W2 → W3 → W4, one commit per work item, then run the ten
verification steps and report every one with raw output. Escalate anything the brief and
R1–R14 do not decide. Do not push and do not open a PR — that is mine.
