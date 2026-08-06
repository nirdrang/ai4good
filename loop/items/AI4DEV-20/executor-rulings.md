# Rulings on the executor's proposed judgements P1–P9 — AI4DEV-20 (item agent, 2026-08-05)

The executor implemented plan rev 2 with no plan/tree contradictions and proposed nine
judgements (`executor-done.txt`). Rulings, all by the item agent:

- **P1 — SDK declarations inside the strict typecheck: KEEP AS WRITTEN.** While no credential
  exists, the compile-checked request shape is the only verification the live path has; the
  version is lockfile-pinned, so the feared redden can only arrive inside a deliberate upgrade
  commit — exactly where a red is the wanted signal, priced into that upgrade's review.
- **P2 — vote count read at createHarness(): KEEP.** The registry doctrine is that an invalid
  or unpinned configured value fails loudly rather than lurking; the wide blast radius only
  triggers on an explicit bad override or an unpinned registry entry, both authoring bugs that
  deserve to be loud. The coupling is hereby seen, not discovered.
- **P3 — validation predicates in oracles.ts, not guards.ts: KEEP.** guards.ts is scoped to
  checks every suite would otherwise re-assert; these are one capability's construction checks,
  exported and directly tested to the same standard. The centralized-guard hazard is answered
  by the mutation-checked conformance wall, not by file placement.
- **P4 — the recordingsDir seam: KEEP.** It converts F3's live-never-replay clause from an
  argument about code into an observed refusal; same spirit as the plan-blessed transport seam,
  consulted only at loop tier, never overridden by the harness.
- **P5 — provenance arrays (servedModels[], requestHashes[] in vote order): ACCEPT.** The
  faithful reading; collapsing would hide the split-serving case provenance exists to expose.
- **P6 — source split (run-source 'live'|'replay' vs recording-source 'live'|'synthetic'):
  ACCEPT.** A replayed verdict claiming 'live' would be precisely the lie provenance exists to
  prevent; the split is a correctness fix the plan's single field could not express.
- **P7 — live-smoke.md committed as a NOT RUN record: KEEP THE FILE.** A committed, versioned
  boundary statement beside the machinery beats absence; the PR will point at it. The plan's
  "absence stated in the PR" is superseded by something strictly stronger.
- **P8 — recorder stores only the first repeat (identical requests hash identically): ACCEPT**
  as structurally forced; the stability spread lives in the smoke report by design. "Recorded"
  and "measured" covering different call counts is now a stated fact, not a surprise.
- **P9 — one conformance test aims the real writer at the real committed directory: ACCEPT.**
  A deliberate, narrow exception to tests-don't-touch-the-tree: the refusal must be proven on
  the path that matters, the `finally` cleanup exists, and the mutation run demonstrated the
  test catches exactly the leak it was built for. Gate 2 is invited to attack it.

No proposal rejected; no restore triggers fired; the F8 removal condition is discharged in
`verify-f8-removal.txt`.
