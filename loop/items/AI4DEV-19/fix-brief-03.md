# AI4DEV-19 — executor brief for the Gate 2 fixes

The rulings are in `loop/items/AI4DEV-19/rulings-03.md` and are **already made**. Do not
re-litigate them. If implementation proves one wrong, stop and report — do not silently choose
differently.

Work in this worktree, on the branch already checked out. You are the only writer while you run.

## Ground rules that still hold from the original brief

- `tests/at/harness/contracts.ts` is the contract. **Do not change it.**
- `pendingCapability` is not to be weakened.
- Loop tier stays database-free and lock-free.
- `Sentinel`, `Sentinels`, `FaultHandle`, `Faults`, `StaticScan` stay `type` aliases —
  `type-invention.selftest.ts` fails by name otherwise.
- The four guard predicates stay the single place each judgement is made.
- `bun run at:verify req-016 --tier loop --expect` must match **exactly** at the end:
  10 green / 2 red, with AT-016.01 and AT-016.11 the two reds. That is the gate, not a readout.
- PowerShell, never Bash. bun, never npm/pnpm.

## Fix A — make the restart causal (terra 1, upheld as false-green class)

**The defect:** `processRestart()` assigns `processEpoch`, and no code on the delivery path
reads it. Deleting `await h.faults.processRestart()` from `b-delivery-defaults.test.ts:39`
leaves AT-016.07 passing identically.

**What to build:**

1. `tests/at/suites/req-016/_contract.ts` — the `Delivery` type gains
   `deliveredByProcess: string | null`. Name it that, not `deliveredBy`: it sits next to
   `emittedBy`, which is a *component* name, and the two must not read as the same kind of thing.
2. `_fixture.ts` `emitKnown` — new deliveries are created with `deliveredByProcess: null`.
3. `_fixture.ts` `drainDeliveries` — when it flips a delivery to `'sent'`, it stamps
   `delivery.deliveredByProcess = processEpoch`. This is the coupling: the delivery path now
   reads the process identity instead of ignoring it.
4. `b-delivery-defaults.test.ts` AT-016.07 — read the epoch **before** and **after** the restart,
   and after the drain assert that every delivery for the event carries the **post-restart**
   identity. State in a comment what that buys: a process identity the delivery path does not
   read can no longer pass this test.

**Falsification, required — this is the substance of the finding, not a garnish.** AT-016.09 got
a captured falsification (`proof-oracle.txt`) and AT-016.07 did not; that asymmetry is what the
reviewer found. Break the coupling (simplest: have `drainDeliveries` stamp a constant string
instead of `processEpoch`), run AT-016.07, capture the **failure** transcript, restore the
coupling, run again, capture the **pass**. Write both to
`loop/items/AI4DEV-19/proof-restart.txt` with the commit they were captured against and the
exact edit that was reverted, in the style `proof-oracle.txt` already uses.

**Verification condition — this ruling adds a field to a shared record.** If the new field breaks
any existing assertion anywhere in `tests/at`, **do not weaken that assertion and do not delete
it.** Restore the record shape, stop, and report which assertion objected. The fallback design is
mine to make, not yours.

**Explicitly out of scope:** do NOT build a delivery worker with volatile in-flight state. That
is filed, not built. Inventing state whose only purpose is to be discarded would be staging the
proof.

## Fix B — AT-016.09's oracle reads everything it claims rolls back (terra 2)

`c-reliability-guard.test.ts:74-99` reads only `transitionCommitted` and `eventWritten`, while
its own message claims "the two must roll back as one unit". `emitKnown` also writes deliveries
and an ops item after the fault point, and the oracle never looks at them.

In the fault world, after the drain, also assert:

- no delivery of `row.event` exists, and
- no ops item whose `kind` is `row.event` exists. `sut.opsItems()` with no filter returns all of
  them; filter by `kind` yourself, because the crashed fire never yielded an event id to filter on.

Extend the existing problem string so it names **which** of the four leaked, rather than
reporting a generic failure. Keep the current two reads — this widens the oracle, it does not
replace it.

## Fix C — `state.nextId` joins the rollback unit (terra 3 and kimi 1, independently)

`_fixture.ts:258` allocates `event-${state.nextId++}` before the fault point; the catch restores
only the transition. Move the allocation to **after** the try/catch, so the crash consumes no id
at all. That removes the side effect rather than compensating for it, which is why it is
preferred over restoring the counter in the catch.

`eventId` is used only at the event write, the delivery loop and the ops item — all already after
the fault point, so the move is safe.

**Verification condition:** for a *successful* emit the id values and the `event-N` format must be
unchanged, and `ops-${eventId}` linkage must still hold. If any test observes a specific id
sequence and objects, restore the allocation where it was and instead restore `state.nextId` in
the catch beside the transition restore — then say so in your report.

While you are there: the comment at `_fixture.ts:266-272` claims "ONE ROLLBACK UNIT … neither
side is committed". Make it true or make it say what is true.

## Fix D — arming an armed point is a refusal (kimi 2)

`faults.ts` `at()` never checks for a live arming and `_fixture.ts:232` overwrites the map entry.
The displaced handle's counter is then never incremented again, and clearing the *replacement*
deletes the map entry while the first handle's owner still believes a fault is armed — a suite
can run an atomicity assertion with nothing injected and get no refusal anywhere.

- Add a fifth predicate to `guards.ts` — the judgement belongs there, with the other four, in
  plain words matching their voice. Its docstring says why: a displaced arming is a run that is
  not fault-injected and does not know it.
- `createFaults` tracks which points have a live arming and routes through the predicate in
  `at()`. Clearing releases the point.
- **Release the point at the same moment `clear()` disarms — before it judges and throws.** A
  refusal from `faultFiredProblem` must not leave the point permanently unarmable; the existing
  code already disarms before judging for exactly this reason, and the release belongs in that
  same breath.
- Add conformance coverage: arming twice refuses, and after a clear the point can be armed again.
- Update `faults.ts`'s module docstring, which now genuinely routes four judgements (this also
  settles fix H below — check the sentence is true when you are done rather than assuming).

**Verification condition:** AT-016.09 arms and clears the same point 11 times, each in a fresh
`open()`. If the live-arming set leaks across harnesses, AT-016.09 goes red — that would be a
defect in this fix, not in the test. Confirm AT-016.09 still passes before you call this done.

## Fix E — sentinel uniqueness covers containment (kimi 3)

`sentinelValueProblem` refuses only `planted === value`, but `sentinels.ts` scans with
`body.includes(sentinel.value)`. A value containing an earlier planted value as a substring makes
every body carrying the later one report the earlier one as present.

Refuse a value that contains, or is contained in, any already-planted value. **Keep the existing
exact-equality branch and its current wording** — a conformance test asserts on that text — and
add the containment case with its own words explaining the different harm.

Add a conformance case that plants an overlapping value and requires the refusal.

## Fix F — nothing to do

Kimi 4 (fault kind through a guard) is **rejected and filed**. Do not implement it. Do not add
`faultKindProblem` and do not extend `AdapterFaultSeam`.

## Fix G — the proof files say only what they contain (terra 4)

- `proof-red.txt` has no commit hash. `rulings-02.md:45` ruled that it would carry one and it
  does not. Add the commit it was captured against.
- `proof-green.txt:6` claims "the gate is the `--expect` run, which is in the report" and the
  file contains no `--expect` transcript. Append a real one.
- **Both proofs must be re-captured against the final code once every fix above has landed.**
  The fixture changes in this round, so a proof captured before it would be stale on arrival —
  which is the exact defect this finding is about. Re-capture last, not first.

## Fix H — `faults.ts:13` counts its own judgements correctly (kimi 5)

Covered by fix D; verify rather than assume.

## What to run before you report

All from the worktree root:

1. `bun run at:verify req-016 --tier loop --expect` — must match exactly, 10 green / 2 red.
2. The harness conformance selftest — all cases, including the new ones.
3. The full `tests/at` run at loop tier (`AT_TIER=loop`) — the only failures may be AT-016.01 and
   AT-016.11, both `CapabilityPending`.
4. Typecheck, if the repo has one wired.

## How to report — read this, it cost a round trip last time

**Put your report in your FINAL MESSAGE.** Do not use `SendMessage`, and in particular never
address `item-agent`: that is an agent *type*, not a reachable id, and a report sent there goes to
the coordinator instead of to me. Your final message returns to me directly.

Report, in plain sentences:

- what you changed, per fix, file and line;
- **any ruling you believe is wrong**, with the evidence — you have first-hand contact with the
  code and I would rather hear it now than after the audit;
- every verification condition above: which held, which did not, and what you did about it;
- the per-AT-id result of the `--expect` run against the declaration;
- anything you found that neither reviewer raised.

Commit your work in logical commits citing `AI4DEV-19` — but do **not** push and do **not** open
or modify a pull request. The merge decision is mine.
