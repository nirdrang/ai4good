# AI4DEV-19 (planted markers, forced failures) — item brief

**Item agent model: OPUS.** Fable is out of the founder's credits; this is the documented
fallback. A fable run and an opus run are not the same evidence, so it is stated here and in
every report.

## Chain — derived, not accepted

Walked from the item upward via `parent` until an item had none:

```
~bringup > AI4DEV-3 (acceptance-test harness) > AI4DEV-19 (planted markers, forced failures)
```

- `AI4DEV-19` has **no children** — it is a real leaf, buildable. (Checked; a parent would be a
  container, not work.)
- `AI4DEV-3` has **no parent** and carries the Linear label `attr:bringup`, which renders as the
  floating root `~bringup`. Floating because it is a grouping label, not a board item.
- Branch, taken verbatim from Linear's `gitBranchName`:
  `nirdrang/ai4dev-19-h3-sentinels-fault-injection`, cut from `origin/main` at `8e939a0`.

The stamp hook printed `CHAIN UNRESOLVED` on first run — its cache had no entry for a branch
created seconds earlier. Recorded as emitted rather than silently corrected; the chain above is
derived from Linear directly.

## What this item builds

Two capabilities whose types are already declared in `tests/at/harness/contracts.ts` and whose
behaviour does not exist — both currently wired to `pendingCapability<T>()` in
`tests/at/harness/index.ts`, a Proxy that throws the capability's name on any property access.

1. **Sentinels** — plant a marker, scan a scope for **presence AND absence**. A scan that cannot
   distinguish "not there" from "did not look" is worthless.
2. **Fault injection** — force a failure at a chosen point and assert atomicity, notably a fault
   induced between a state transition and its event write, where the assertion is that the
   rollback held. Plus process restart with an observable identity change.

## Decided before work starts — not to be re-litigated

1. The declared types in `contracts.ts` **are** the contract. Implement to them. Change them only
   if implementation proves one wrong, and say so explicitly in the rulings if so.
2. Replace the `pendingCapability` seams in `index.ts` with real implementations. **Do not weaken
   `pendingCapability` itself** — it must keep throwing for capabilities that have not landed.
3. **Loop tier stays database-free and lock-free.**
4. **A red that turns green is a FAILURE unless the declaration moves in the same change.**
   `tests/at/expected/req-016.json` is a contract, not a report.
   `bun run at:verify req-016 --tier loop --expect` must match exactly at the end. It is the
   gate, not a status readout.
5. Scope is H3 only. No drift into the semantic oracle (`AI4DEV-20`), the vendor stand-ins
   (`AI4DEV-21`), or the proving ground (`AI4DEV-22`).
6. Red-then-green proof, **demonstrated not asserted**, for the fault-injection half at minimum:
   a test that fails without the induced-fault handling and passes once atomicity is asserted.
   Both transcripts captured and committed.

## A constraint the repository already states, found by reading rather than handed down

`tests/at/harness/guards.ts` exists and carries four predicates plus an explicit instruction:

> H3 (sentinels + fault injection) **MUST route** its `sentinels.plant`, `faults.at`,
> `FaultHandle.clear` and `faults.processRestart` implementations through the predicates below
> rather than re-deriving them — that is what makes this file the single place the property can
> be got wrong, and the single place a test can prove it right.

The four: `sentinelValueProblem` (non-empty, >= 16 chars, never reused), `faultPointProblem`
(arming an unexposed point is a refusal, never a no-op), `faultFiredProblem` (a fault armed but
never reached proves nothing — trigger count < 1 is a problem), `processEpochProblem` (an
unchanged epoch means the restart restarted nothing). `conformance.selftest.ts` already tests all
four. This is binding on the implementation.

## Which of the four declared reds this work actually turns green — derived from the tests

Determined by reading each test body and the capability each one reaches first, **not assumed**.

| test | capabilities it actually reaches | verdict |
|---|---|---|
| `AT-016.01` | `h.static` (line 28), `h.sentinels` (line 50), **`h.vendors.email.attempts()` (line 71)** | **stays RED** — blocked by H5, outside this item |
| `AT-016.07` | `h.faults.processRestart()` only | **turns GREEN** |
| `AT-016.09` | `h.faults.at(...)` + `fault.clear()` only | **turns GREEN** |
| `AT-016.11` | `h.vendors.email` only | **stays RED**, untouched — pure H5 |

So: **two of the four**, not one and not all four.

### The consequence nobody declared, and it forces an edit

`AT-016.01` stays red either way — but the `static` seam is constructed with **three** capability
names (`'H3 static provider scan'`, `'H3 sentinels'`, `'H5 email provider simulator'`) so that the
first throw reports the complete missing set at once. The moment sentinels land, that seam keeps
claiming `'H3 sentinels'` is pending, **which becomes false** — a declared fact drifting from a
real one, which is precisely the defect class this way of work exists to delete.

Therefore `index.ts`'s `static` seam name list and `AT-016.01`'s `capabilities` array in
`tests/at/expected/req-016.json` must both drop `'H3 sentinels'`, leaving
`["H3 static provider scan", "H5 email provider simulator"]`. The red does not move; the reason
for the red does.

### Ruling: the static provider scan stays pending

`index.ts` names it `'H3 static provider scan'` and `contracts.ts` files it under the H3 section
header, so by the repo's own naming it is this item's. No sibling owns it (H4 is the semantic
oracle, H5 the vendor stand-ins, H7 the proving ground). I am nevertheless leaving it **pending**,
for a derived technical reason rather than a scoping preference:

`providerClientImporters()` must return components whose **product source** imports a
comms-provider client. At loop tier there is no product source — the tier is database-free and
drives a fixture stand-in. Scanning the stand-in would prove nothing about the product, and would
be exactly the self-report the type's own comment says it exists to avoid ("the witness that is
not the subject"). It is a real-source capability and belongs where real source exists.

Implementing it would turn nothing green (`AT-016.01` is H5-blocked regardless). Leaving it
pending costs one honest name-list edit, above.

## Open questions this brief does not settle

1. **Does `at:verify --expect` compare the `capabilities` array of each red, or only the
   green/red partition?** If only the partition, the name-list edit above is still correct but is
   not enforced by the gate. Being measured, not assumed.
2. Does the `req-016` fixture adapter expose a real state transition separate from its event
   write — i.e. is there somewhere for
   `notifications.between_transition_and_event_write` to be inserted — and does it have a delivery
   process whose identity can form a `processEpoch`?
3. Does the scan surface need anything the declared `Sentinels` type cannot express? The type has
   `plant(kind, value)` and `scan(scope)`; the absence assertions in `AT-016.01` are currently
   made by filtering `sut.deliveries()`, not by calling `scan()` at all.
