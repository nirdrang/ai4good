# ORCHESTRATOR RULINGS 02 — AI4DEV-24, on the Gate 2 escalation

---

## R7 — the augmentation door is shut one level up, not all the way down. **FIX IT HERE.**

You found that codex 1's fix closes `AtHarness` but not the interfaces it references, and you
measured that this compiles green on the shipped tree:

```ts
declare module '../../harness/contracts.ts' {
  interface Vendors { auditLog?: string[] }
  interface Faults { inventedRequired: string }
}
```

**Fix it — same alias treatment for the capability contracts.** Three reasons, in order of
weight:

1. **It is the same defect, at the same seam, exposed by the fix I ordered.** Shipping now
   would let this item claim the type lie is dead when the exploit has simply moved one level
   down. That claim is in the brief's own done-condition and would be in the PR body. A
   half-closed door described as shut is precisely the misleading-expected-state the
   false-green tag exists for.
2. **It is WORSE at this level, as you showed.** Because `pendingCapability<T>()` casts a Proxy
   `as T`, even a *required* added member survives — where the same addition to `AtHarness`
   fails with TS2741. Codex's optional-member subtlety is not even needed. So the residual we
   would be leaving is larger than the one we just closed.
3. **It stays inside the boundaries.** `contracts.ts` is under `tests/at/**`, and the change is
   type-level only, so D5 holds by construction — the same argument that carried R1.

Yes, it widens `contracts.ts` beyond the one type codex named. That is the correct scope: the
scope boundary exists to stop an item wandering into unrelated territory, not to stop it
finishing the thing it started.

**Two conditions.** Measure that converting each interface does not break a legitimate
`extends` or declaration-merge that something actually relies on — and if any conversion forces
a suppression, an `any`, or a runtime change, STOP and escalate rather than pushing through.
And extend the negative typeprobe to cover this attack too, so it is locked the same way the
first one is. A defect proven dead by an executable test is closed; one closed by an argument
is closed until someone edits the file.

**Why this does not re-open Gate 2:** it is the completion of codex finding 1's fix, not new
ground. Codex confirms it when it confirms that finding. The gate's cap is untouched.

## R8 — the declared expected state moves: 96 → 99 tests, 29 → 30 files. **ACCEPTED, and recorded.**

Both are direct consequences of the ruled codex-1 fix — the new typeprobe selftest and its file.
You were right to surface it rather than let the auditor find a mismatch against a brief written
before the fix existed.

**The declared state for this item is now: `at:selftest` 99 tests across 7 files, and typecheck
coverage of 30 files** (plus whatever R7 adds — report the final numbers, do not predict them).
Note for the record that the REQ-016 expected state is *unchanged* at 8 green / 4 red: this
moves the harness's own selftest count, not the acceptance declaration. If those two ever move
together, that is a different and much more serious event.

## R9 — your handling of codex 4. **Correct, and the reasoning is worth keeping.**

You corrected the claim and left the evidence alone: `git diff --check` exits 0 over the code
paths and 2 over the whole diff, with all 30 violations in a committed reviewer artifact. That
is the honest shape. Doctoring a verbatim record to make a check pass would have been the worse
defect, and the CI exclusion is flagged for the CI item rather than smuggled in here.

---

**Next:** implement R7, re-run the full verification, and report the final numbers. Then the
Gate 2 confirmation pass runs against one immutable head — codex confirms its own findings
including the completed finding 1, Kimi confirms its own. Then the merge tail.
