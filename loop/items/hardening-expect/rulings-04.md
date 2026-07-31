# RULINGS 04 — the founder closes G2-3, and Gate 2 closes

Board item: **AI4DEV-25**. This is the last ruling before the merge tail.

---

## R15 — G2-3 (provenance), tagged [FALSE-GREEN-CLASS] by codex. **CLOSED BY THE FOUNDER: accept and defer.**

The finding is real and is not disputed: exact text matching proves what a failure
*printed*, never what it *was*. A test that throws
`Object.assign(new Error("AT-900.02 PENDING [sut-missing] — …"), {name: "AtPending"})`
satisfies the anchored prefix without any genuine `AtPending` instance existing.

Neither the executor nor the orchestrator was permitted to close it: the raiser tagged it
false-green-class, and this project's own rule reserves those for the founder. It was put
to the founder with all four costed options and the recommendation below, and the founder
chose **accept and defer**.

**The ruling:** document the limitation plainly, and close it properly in the already-filed
structured-capability-codes deferral, in the slice that owns `capabilities.ts`.

**The reasoning, recorded so nobody re-litigates it:**
- The attack requires a suite author to *deliberately forge* a pending error. Anyone able to
  do that already has cheaper ways to manufacture a false green — they could simply write a
  test that passes. This gate exists to catch drift and breakage, not sabotage by someone
  who controls the suite.
- The side-channel alternative reaches into `registry.ts`, which every suite in the project
  runs through, and carries a hazard the executor identified and would have had to disprove
  first: the black-box fixtures import `capabilities.ts` by absolute file URL while
  `registry.ts` imports it relatively, so two module instances would make `instanceof` false
  for *genuine* errors and turn every declared red into a false RED. That failure is worse
  than the hole it closes.
- The filed deferral subsumes the finding exactly. Structured codes emitted at the source
  make provenance machine-checkable without text matching at all.

**Required:** the README states this limit in the same plain terms — `--expect` verifies the
shape and identity of a red, not the provenance of the error object behind it — and names
the follow-up. A limitation that is written down is a known boundary; one that is not is a
false green.

---

# GATE 2 IS CLOSED

Every finding from the panel has a terminal disposition, within the first fix cycle — the
two-cycle cap was not reached.

| # | Raiser | Disposition |
|---|---|---|
| G2-1 | codex + Kimi (both) | FIXED — file-level accounting, with conformance case 920 proving it |
| G2-2 | codex | FIXED — null-prototype map; `__proto__` refused as a malformed AT id |
| G2-3 | codex | **CLOSED BY FOUNDER** — accept + defer (R15) |
| G2-4 | codex | FIXED — redaction sentinels refused; a redacted detail fails closed |
| G2-5 | codex | FIXED — commas refused in capability names |
| G2-6 | Kimi | FOLDED — cases 918 and 919, both refusing before vitest spawns |

**Two reviewer claims were empirically refuted by the executor before implementation, and
the refutations are part of the record:**

1. Kimi's invariant `numFailedTestSuites <= numFailedTests` is **false** for this reporter —
   vitest counts `describe` blocks as suites, so a healthy REQ-016 run shows 6 failed suites
   against 4 failed tests. Shipping it literally would have made `--expect` exit 1 on the
   correct declaration and broken the done-criterion. The sound version, one level down at
   file granularity, is what shipped.
2. Kimi's claim that a throwing `afterAll` is serialised — and therefore that the README was
   misleading and `--expect` weaker than the legacy gate — is **false**. Four probe trees
   showed a hook failure in a file that also carries a failing test is byte-identical to a
   healthy run in every serialised field. R8's residual gap was accurately stated, and
   `--expect` was never weaker than what it fronts.

A reviewer is an adversary, not an authority. Both corrections were made with evidence
rather than argument, which is the standard.

---

**Next:** the merge tail — pre-merge audit with an independent re-run, then the merge ruling.
Per INTERIM MODE the tail stops at "ready to merge" plus a founder ping; autonomous merge
stays off until AI4DEV-25, AI4DEV-26 and AI4DEV-24 have all landed.
