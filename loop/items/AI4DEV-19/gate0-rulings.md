# AI4DEV-19 — rulings on Gate 0 (codex `gpt-5.6-sol` @ max, read-only, in the worktree)

Ruled by the item agent (**OPUS**). Seven findings: **five accepted** (two of them confirming the
design independently), **one accepted as a correction to my reasoning with the conclusion
restated on stronger ground**, **one rejected**.

---

## 1. ACCEPTED — my table named the wrong blocker for `AT-016.01`

Sol is right. `h.static.providerClientImporters()` at `a-emitter-and-taxonomy.test.ts:28` throws
**first**, so the test never reaches `plant()` at line 50 or the vendor trace at line 71. Its
current blocker is the pending static scan; the vendor work is a *latent* dependency that only
becomes the blocker once the scan lands.

My brief said "stays RED — blocked by H5". True as an eventual fact, wrong as a present one, and
the imprecision mattered: it is what made finding 4 possible.

**Conclusion unchanged** — `AT-016.01` stays red, and the declaration edit (dropping
`'H3 sentinels'` from the seam's name list) is unaffected, because the thrown line comes from the
`static` seam either way. Brief corrected.

## 2. ACCEPTED — already the centre of the design (independent confirmation)

Sol: fault injection cannot live in `index.ts` alone; the fixture has no fault seam, writes the
event before the transition, has no rollback boundary, and `drainDeliveries()` is an array loop
with no restartable identity.

This is exactly what `design.md` says, written before this critique arrived and from my own
reading of `_fixture.ts:179-221` and `:245-253`. A different vendor reaching the same conclusion
independently is the strongest signal available that the design's central claim is sound. No
change.

## 3. ACCEPTED, with a verification condition — `AT-016.09`'s oracle is too weak

The best finding of the seven. The test's oracle is:

```ts
if (transitionCommitted !== eventWritten) { problems.push(...) }
```

It rejects only **unequal** outcomes. A fault that fires *after* both writes leaves both
committed — equal — and the test **passes**, having proved nothing about atomicity. The control
run does not close this: it also ends with both committed.

So turning `AT-016.09` green against this oracle would be a weak green, and this item exists to
make that test mean something.

**Ruling:** tighten it. After a fired `crash` at the point, assert **both sides false** for every
guarded row, rather than merely equal. This is strictly stronger — it rejects a superset of what
the current oracle rejects — so it cannot make a correct implementation pass that previously
failed. Tightening an oracle is not the loosening the brief forbids; it is its opposite.

**Verification condition** (a ruling that changes work must carry one): the tightened oracle must
(a) pass with the point correctly placed between the two writes, and (b) **fail** if the fault
point is moved after both writes. The executor demonstrates (b) and captures it. If (b) passes,
the tightening bought nothing and the finding was wrong — report that to me rather than keeping
the change.

## 4. ACCEPTED — nothing in the acceptance suite exercises sentinels at all

Sol's sharpest structural point, and finding 1 is what exposes it: since `h.static` throws first,
`AT-016.01` never reaches `plant()`. `scan()` has no caller anywhere in the tree. Therefore **a
no-op `Sentinels` implementation would satisfy `at:verify … --expect` completely.**

`design.md` already routed around this by mandating conformance tests, but stated it as a
consequence of the vendor blocker rather than of the static-scan blocker — a right answer resting
on a wrong reason. Restated, and hardened in the executor brief: the conformance tests are not
supporting evidence for sentinels, they are the **entire** evidence, and must cover planting,
refusal of a short value, refusal of a reused value, presence, absence, and refusal of an
unregistered scope. Sol's prescription and mine agree on the shape.

## 5. ACCEPTED — the existing conformance tests prove the predicates, not the routing

Correct, and already in `design.md` and step 4 of the executor brief. The four guards are tested
as pure functions at `conformance.selftest.ts:236-264`; nothing proves that `plant`, `at`, `clear`
and `processRestart` actually call them. Independent confirmation; no change beyond emphasis.

## 6. ACCEPTED as a correction to my REASONING — conclusion stands on better ground

Sol is right that my stated reason was loose. Loop tier is **database-free, not source-free**;
`REPO_ROOT` is available, and a source scanner could run there. My "there is no product source at
loop tier" was wrong as written.

But the conclusion survives, for a reason I verified in the code rather than assumed:

`expected.ts:45-48` admits exactly two declarable red shapes —
`{ kind: 'capability-pending', capabilities }` and `{ kind: 'pending', phase }`, where
`PENDING_PHASES = ['harness-missing', 'sut-missing', 'tier-unset']` (`expected.ts:100`), all
thrown by the harness itself. **An ordinary assertion failure matches neither**, and
`expected.ts:21-23` is explicit that "a red whose detail fits neither shape is undeclarable — and
therefore a failure."

Implementing the scan now would do exactly that: it would return `[]` (no notification product
exists), `AT-016.01` would fail its `toEqual(['notifications.emitter'])` as an `AssertionError`,
and that red would be **undeclarable**. `bun run at:verify req-016 --tier loop --expect` — the
gate this item must leave green — would fail.

So the scan stays pending, now on the ground that implementing it breaks the gate, not that its
inputs are missing. Sol's own suggestion concedes the point ("resolve how that honest assertion
red is declared **before** implementing the scan") — that resolution is a different piece of work
than this item.

**Filed, not built** (the skill's rule for independent work): the static provider scan is
genuinely ownerless once this item closes. Named in my final report so it is not lost. I am not
opening a board item for it — mechanics ride along, and independent work is filed for the founder
to place.

## 7. REJECTED — the rule cited does not apply to this artifact

Sol reads the skill's ban on derived facts in briefs as forbidding my brief from recording the
chain, the branch and the base commit.

That rule governs **a coordinator writing a brief for an agent**: *"The coordinator must not put a
derived fact into a brief … Say 'resolve your chain from the board', never 'your chain is X > Y'."*
Its purpose is that an agent must not be handed a fact it should derive, because it would stamp a
wrong value faithfully.

`brief.md` is the opposite artifact. It is **my own record of facts I derived myself**, from
Linear and from git, which the same skill and my own configuration explicitly require of me
("walk `parent` upward … and write the chain yourself"). Recording the result of a derivation I
performed is not the same act as asserting a derivation to someone who should have performed it.

Applying finding 7 would delete the audit trail that proves the derivation happened — making the
attribution *less* checkable, which is the exact inverse of the rule's intent. Rejected, and the
reason recorded here so the rejection is itself reviewable.

---

## What changes as a result

| artifact | change |
|---|---|
| `brief.md` | `AT-016.01`'s blocker corrected: pending static scan now, vendor work latent |
| `design.md` | Ruling 3 restated on the undeclarable-red ground; sentinel-evidence reason corrected |
| `executor-brief.md` | new step: tighten `AT-016.09`'s oracle, with its falsification check; sentinel conformance tests hardened as the sole evidence |
