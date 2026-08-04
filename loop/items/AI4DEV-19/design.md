# AI4DEV-19 (planted markers, forced failures) — design

**Item agent model: OPUS** (documented fallback; fable is out of credit).

Every claim below was derived by reading the tree, and the file and line are given so a reviewer
can refute it. Where a fact came from a subagent's map, I re-derived the load-bearing ones
myself.

## The shape of the problem

Two seams currently wired to `pendingCapability<T>()` — a Proxy that throws on any property get —
become real. The types are already declared and are **not** to be redesigned.

The surprise the reading turned up, and the reason this item is not a simple fill-in-the-blanks:
**the fixture the tests drive cannot support either capability as it stands.** It has no process
identity to restart and its writes happen in the wrong order for the fault point's own name. So
this item is roughly one third harness code, two thirds making the `req-016` fixture able to be
faulted at all.

## Ruling 1 — provenance: both capabilities are REAL, not stand-ins

`index.ts` registers each capability through `realCapability(...)` or `standInCapability(...)`.
Sentinels and faults get **`realCapability`**.

Reasoning, and it is not a coin toss:

- `stubbedCapabilities()` reports what the **harness stubbed**. H3 is not stubbed here — it is
  implemented. What is a substitute in a loop-tier run is the *product*, and that is already
  declared by `sut.notifications` being a stand-in. Declaring H3 a stand-in would double-count
  the same substitution and misattribute it to the harness.
- `registry.ts:618-620` **refuses any stubbed capability above the loop tier.** Marking H3 a
  stand-in would therefore bar the identical sentinel and fault machinery from ever running at
  integration tier — the tier that is the `/pm-done` gate. That is a permanent, silent cost paid
  for a label.
- It follows the precedent already argued in `index.ts:100-102` for `config.registry`: the
  registry *is* the article, so calling it a stand-in "would tell an integration-tier run that
  the gate is grading a substitute, which would be a lie in the other direction".

**Consequence to verify, not assume:** `conformance.selftest.ts:139-158` asserts the stand-in
ledger *exhaustively* — `['clock.controlled', 'fixtures.worlds', 'sut.notifications']`. Under
this ruling that list is unchanged and the selftest needs no edit. **If the executor finds
itself editing that assertion, the ruling has been violated** — that is the tripwire.

## Ruling 2 — the adapter seam is optional in the type, refused at use

`FixtureAdapter` (`index.ts:12-16`) and `AdapterShape` (`suite-adapters.ts:60-64`) must carry the
new fault/sentinel members. They are **optional** at the type level, because
`runner-blackbox.selftest.ts` and `runner-expect.selftest.ts` plant disposable trees whose
adapters export only two methods; a required member would break those at run time.

Optional must not mean silently absent. A suite whose adapter offers nothing gets a **refusal**,
never a no-op — and the existing guard already produces exactly the right words:
`faultPointProblem(point, [])` yields *"the product exposes no fault point named … Exposed
points: (none)"*. So absence degrades to a loud refusal for free, which is the same philosophy
`pendingCapability` encodes.

## Ruling 3 — the static provider scan stays pending, and one name must move

`AT-016.01` stays red whatever this item does. Corrected after Gate 0: its blocker **right now**
is the pending static scan itself — `h.static.providerClientImporters()` at
`a-emitter-and-taxonomy.test.ts:28` throws before the test ever reaches `plant()` at line 50 or
the vendor trace at line 71.

**Why the scan is not implemented here, on the ground that survived review.** My first reason —
"loop tier has no product source" — was wrong, and Gate 0 was right to refuse it: loop tier is
database-free, not source-free, and `REPO_ROOT` is readable. The real reason is that implementing
it **breaks the gate this item must leave green**:

`expected.ts:45-48` admits exactly two declarable red shapes, `capability-pending` and `pending`
with a phase from `['harness-missing','sut-missing','tier-unset']` (`expected.ts:100`) — all
harness-thrown. A real scan would return `[]` today, because no notification product exists, and
`AT-016.01` would fail `toEqual(['notifications.emitter'])` as an ordinary `AssertionError`. That
matches neither shape, and `expected.ts:21-23` is explicit: *"a red whose detail fits neither
shape is undeclarable — and therefore a failure."* So `at:verify … --expect` would fail.

The scan belongs where the notification product exists, and how its honest red gets declared is a
separate piece of work. **Filed, not built.**

But the `static` seam is constructed with three names so its first throw reports the whole
missing set. The moment `plant()` works, `'H3 sentinels'` in that list becomes a **false claim**.
So, in the same commit:

- `index.ts:120` → `pendingCapability<StaticScan>('H3 static provider scan', 'H5 email provider simulator')`
- `req-016.json` `AT-016.01.capabilities` → `["H3 static provider scan", "H5 email provider simulator"]`

This is **gate-enforced**, not cosmetic — see the declaration section below.

## Ruling 4 — no contract change; the declared `Sentinels` type is sufficient

The brief asked whether the scan surface needs anything the type cannot express. Answer: **no.**

`Sentinels` declares `plant(kind, value)` and `scan(scope)`. The danger the item names is that a
scan which cannot tell *"not there"* from *"did not look"* is worthless. That is fixed at
**runtime, not in the type**: `scan()` refuses a scope that was never registered, so it can never
silently return `[]` for a store it did not look at. An empty array then means one thing only —
the scope was real, was searched, and held nothing.

I considered adding `scopes(): Promise<string[]>` for symmetry with `Faults.points()`, and
rejected it: `points()` exists because `faultPointProblem` needs the exposed set for its message,
whereas the scope set can be held privately. `scan()` has **zero call sites** in the entire tree
today, so adding public surface for it would be speculative. Recorded as an observation, filed
not built.

**`Sentinel`, `Sentinels`, `FaultHandle`, `Faults`, `StaticScan` must stay `type` aliases** —
`type-invention.selftest.ts` lists them in `ALIAS_PROTECTED` and fails by name if any becomes an
`interface`.

## The fixture work — where the real difficulty is

### The write order is backwards for the fault point's own name

`_fixture.ts`'s `emitKnown` (lines 179-221) currently writes, in order: the event
(`state.events.push`, ~line 194), the deliveries, the ops item, and **the transition last**
(`state.transitions.set(event, true)`, ~line 219).

The fault point is named `notifications.between_transition_and_event_write`. For that name to be
true, the order must become **transition → [fault point] → event write**, and the pair must
become a single rollback unit. A crash at the seam must leave **neither** side committed;
`AT-016.09` reads `transitionCommitted !== eventWritten` as the failure.

A fault point whose name lies about what it sits between is exactly the declared-versus-real
drift this project exists to delete, so renaming the point instead of reordering the writes is
**not** an acceptable shortcut.

`sut.emit()` (~line 238) and `burstThreadComments` (~lines 277, 282) reach the same path and
inherit the point.

### There is no process to restart

`drainDeliveries` (~lines 245-253) is a synchronous sweep with no identity, no loop and no
lifecycle. Nothing in the adapter can serve as an epoch (`state.nextId` is an event-id counter).
An epoch must be introduced, and `processRestart()` must:

1. change it — routed through `processEpochProblem`, which refuses an unchanged identity; and
2. **preserve durable state.** `AT-016.07` asserts after the restart that exactly one logical
   event survives and every recipient-channel pair has exactly one delivery. A restart that
   cleared `state.events`/`state.deliveries` would fail those, and correctly so.

## Everything routes through `guards.ts` — and the wiring itself gets tested

`guards.ts:13-14` is binding: `plant`, `faults.at`, `FaultHandle.clear` and `processRestart`
**must route through** the four predicates rather than re-deriving them.

| call | predicate | on problem |
|---|---|---|
| `sentinels.plant` | `sentinelValueProblem(value, alreadyPlanted)` | throw — refuse to plant |
| `faults.at` | `faultPointProblem(point, exposed)` | throw — arming an unknown point is never a no-op |
| `FaultHandle.clear` | `faultFiredProblem(point, triggerCount)` | throw — a fault that never fired proves nothing |
| `faults.processRestart` | `processEpochProblem(before, after)` | throw — an unchanged identity restarted nothing |

`conformance.selftest.ts:236-264` already tests these as **pure functions**. That is not enough
and the tree already knows it: `conformance.selftest.ts:114-128` calls a problem computed and not
acted on *"this tree's own recurring false-green shape"*. So the new conformance tests must prove
the implementation **actually calls** each guard — plant a short value and require a throw, arm a
typo point and require a throw, clear a never-fired handle and require a throw, stub an unchanged
epoch and require a throw.

This is the load-bearing wall: `AI4DEV-3-at-harness.md:127-135` warns that a fault handle
counting "armed" as "triggered" makes every atomicity test in thirty suites pass on nothing.

`triggerCount()` must count times execution **reached** the armed point — not times it was armed.

## Scale the implementation must survive

`AT-016.09` loops all 11 guarded rows, each with a control `open()` and a fault `open()`. One
loop-tier run is therefore **22 `createHarness()` calls, 11 `at()` and 11 `clear()`** — and every
`clear()` throws unless its fault genuinely fired. The fault must fire for all 11 rows, including
the ops-item rows.

## The declaration moves in the same commit — it is the gate

`tests/at/expected/req-016.json`, all in one change:

| id | now | after | why |
|---|---|---|---|
| `AT-016.07` | red | **green** | fault-only; `processRestart` lands |
| `AT-016.09` | red | **green** | fault-only; atomicity holds |
| `AT-016.01` | red, 3 capabilities | red, **2** capabilities | `'H3 sentinels'` is no longer pending |
| `AT-016.11` | red | red, untouched | pure vendor work |

Final partition: **10 green / 2 red.**

Two independent mechanisms punish getting this wrong, which is why it is not optional:

- `detailMatches()` compares a `capability-pending` red by **whole-string equality** on a line
  rebuilt from the declaration, so a stale or reordered `capabilities` array fails.
- `reportAccountingDeviations()` compares raw counts — `failed !== red`, `passed !== green`,
  `total !== green + red` — so leaving 07/09 in `red` fails on arithmetic alone.

`bun run at:verify req-016 --tier loop --expect` matching exactly is the gate, not a status
readout.

## Red-then-green: what will be demonstrated, not asserted

The proof vehicle is real rather than staged, which is what makes it worth capturing:

1. **RED** — implement fault injection and arm the point, but leave `emitKnown`'s writes in their
   current order and non-atomic. `AT-016.09` fails with a genuine atomicity complaint
   (`transition=… notificationEvent=… — the fault committed one without the other`), **not** a
   `CapabilityPending`. That distinction is the whole point: it proves the fault fired and the
   oracle discriminates.
2. **GREEN** — reorder to transition → fault point → event write as one rollback unit. The same
   test passes.

Both transcripts get captured to `loop/items/AI4DEV-19/proof-red.txt` and `proof-green.txt` and
committed. A red that is merely `capability-pending` would prove nothing and is not an acceptable
substitute.

## What sentinels get proven by, given their only consumer stays red

`req-016` is the **only** suite that exists, and its one sentinel consumer (`AT-016.01`) throws at
`h.static` on line 28 — **before** it ever reaches `plant()` on line 50. `scan()` has no call site
anywhere in the tree. So nothing in the entire acceptance suite exercises sentinels, and a
**no-op `Sentinels` implementation would pass `at:verify … --expect` completely.**

That is the sharpest thing Gate 0 found, and it makes the conformance tests below not supporting
evidence but the **entire** evidence base for half this item.

They are therefore proven by **harness conformance tests** — presence, absence, refusal of an
unregistered scope, refusal of a short value, refusal of a reused value. This is not a
consolation prize: `AI4DEV-3-at-harness.md:127-135` says generic self-checks belong in the
harness with their own conformance tests, and calls them the load-bearing wall.

## Out of scope, stated so drift is visible

The semantic oracle (`AI4DEV-20`), the vendor stand-ins (`AI4DEV-21`), the proving ground
(`AI4DEV-22`), and `providerClientImporters()`. `pendingCapability` itself is **not** weakened —
it must keep throwing for capabilities that have not landed.
