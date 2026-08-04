# Kimi confirmation - the raiser, resumed in place

Session: session_0a2bbaf7-10c7-47b2-ab9d-b879cf5f357b (the Gate 2 raiser session), resumed by the
third item agent on 2026-08-04: model pinned `kimi-code/k3`, `--output-format text`, exit 0.
Kimi refuses to resume outside the directory that created the session and that worktree is
deleted, so the path was recreated as an EMPTY placeholder purely to satisfy the check (removed
after the run); the prompt forbade relative operations and pointed every read at this item's
live worktree. Prompt: `confirm-kimi.txt` at commit f3dfa2d (final code commit a970880).

Verdicts: findings 1, 2, 3, 5 CLOSED; finding 4 - the raiser ACCEPTS the rejection and its
not-false-green classification. One new line: terra's AT-016.07 pin endorsed as sound.

---

• All five findings checked against the current code in the named worktree, with the conformance suite (28/28) and the `--expect` gate (10 green / 2 red, exact match) re-run green there.

  **Finding 1 — `nextId` allocated before the fault point: CLOSED.** The allocation is now after the try/catch at `tests/at/suites/req-016/_fixture.ts:288`, so a crashed emit consumes no id; the comment at lines 268–273 now explicitly lists the id among the things allocated only after the point. The repair has a real oracle: `conformance.selftest.ts:484-516` arms, crashes, clears, fires again, and requires both the returned id and the stored event to be `event-1` — moving the allocation back above the try/catch fails that test, so the fix cannot be silently reverted.

  **Finding 2 — silent displacement of a live arming: CLOSED.** `faultAlreadyArmedProblem` exists at `guards.ts:92-103` and is routed at `faults.ts:70-71`, before `seam.arm()` is called. The reservation is taken only after the adapter accepts the arming (`faults.ts:73-77`), so a kind refusal reserves nothing; and `clear()` releases the reservation in the same breath as the disarm, before judging (`faults.ts:88-89`), so a "never fired" refusal cannot leave the point permanently unarmable. The map holds the arming object, not a boolean, so clearing a handle can never release a later reservation on the same point (`faults.ts:89`). Conformance covers all three edges through the real harness: double-arm refused with the first arming surviving and counting (`conformance.selftest.ts:450-464`), re-arm after clear (`:469-471`), and refused-kind reserving nothing (`:475-478`). The check-and-set in `at()` is synchronous, so no interleaving hole.

  **Finding 3 — substring overlap in sentinel values: CLOSED.** `sentinelValueProblem` now refuses both directions of containment at `guards.ts:57-63`, with the rationale in the docstring at `:37-41`. The exact-equality branch and its "planted before" wording are untouched, as stated. Tested at the pure level in both directions plus a discriminating control (two same-shape distinct values are NOT refused — `:265-268`, which is what keeps the new check honest rather than just stricter), and through the implementation at `:340-343`.

  **Finding 4 — kind validated per-adapter, not through a guard: I ACCEPT the rejection and its classification.** It is not false-green class. The decisive point the ruling makes and I confirm by reading: no currently-declared green depends on this — the one adapter refuses every non-`crash` kind at `_fixture.ts` and a conformance test drives that refusal (`conformance.selftest.ts:475`). Even in the future-adapter scenario I described, the armed fault genuinely fires and genuinely counts — what drifts is the *semantics* of the injection (a crash where a lost ack was asked for), not its existence — so no atomicity oracle passes on nothing. That is a forward-looking centralization gap, correctly filed, not a silent-green defect. The remedy requiring new surface on `AdapterFaultSeam` is also a real constraint, not an excuse.

  **Finding 5 — "four judgements" comment: CLOSED.** `faults.ts:10-13` now names four judgements this module genuinely routes (point real, already armed, fired, restart changed anything) and says where the fifth lives; the sentence is now true of the code.

  One line on what is new since my review: terra's AT-016.07 pin (`b-delivery-defaults.test.ts:46-70`) is sound — the epoch assertion plus `deliveredByProcess` stamps mean deleting the `processRestart()` call now fails the test instead of passing silently, and the harness-level guard correctly cannot cover a deleted call. Nothing serious.

