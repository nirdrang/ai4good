# AI4DEV-48 — rulings on Gate 2 (the draft-code critique)

**Sitting:** FIX AND GOAL (sitting 3) · **orchestrator model: opus (the `orchestrator-opus`
fallback — fable is out of credit for this whole item).**
**Ruled against commit `a871d59`**, the head both reviewers read.

Two reviewers, in parallel, neither seeing the other: **terra** (gpt-5.6, effort max) and **kimi**
(kimi-code/k3, effort high), both read-only. Seven findings between them, covering **five distinct
defects** — the two reviewers overlap on two of them and disagree sharply on the severity of one.

Every ruling below quotes the reviewer's claim beside it and is checked against the tree, including
against the **merge base `fc8d50dd`**, because two of terra's claims turn entirely on what this
change introduced versus what it inherited.

---

## FIRST: the severity disagreement, resolved rather than averaged

Terra rated the `oracles.judge` accepting branch a **BLOCKER**. Kimi read the same lines and rated
the same branch a **MINOR**, closing with *"no BLOCKER, no MAJOR."* One of them is wrong about how
much this matters, and splitting the difference would be a way of not deciding.

**My ruling: it is a real defect, it is MAJOR, and both reviewers are partly wrong.**

### Terra's blocker rests on two claims. One is true and one is false.

> terra [1]: *"`oracles.judge` reaches `real` on negative evidence: any non-`loop` tier plus any
> transport other than `replay-fs` is accepted, including the explicitly `fake` transport."*

**The structural half is TRUE.** `capabilities.ts:187-196` reads: refuse `replay-fs`, then return
`real`. That is "I found no forbidden thing, therefore the thing is present" — and it is the exact
sentence this file's own header forbids at line 18: *"I found no stand-in seam is NEVER evidence of
real backing."* Terra also correctly names **both** axes — the tier is accepted by absence too
(`tier !== 'loop'`), which kimi's narrower description missed.

**The semantic half is FALSE as a finding against this item.**

> terra [1]: *"`NEVER_TOUCHED` is `kind: 'fake'` in `oracles.selftest.ts:195-201`, yet lines 960-961
> require it to be `real` at integration/drill."*

Terra presents this as a contradiction the draft introduced. It is not. At the merge base
`fc8d50dd`, `createOracleCapability` did precisely this already:

```
1139:   if (transport.kind === 'replay-fs') { throw ... }
1146:   return realCapability('oracles.judge', createSemanticOracle({ transport, votes }));
```

Above loop, refuse `replay-fs`, label everything else `real` — including `fake`. The rule is
deliberate, argued at length, and pre-dates this item by a long way. `oracles.ts:174-177`:

> *"`'fake'` is legal at every tier on purpose. Conformance fakes are the instrument the tier rules
> are proved WITH; barring them would leave the rules untestable, which is a worse trade than
> allowing an obviously-labelled fake."*

And `oracles.selftest.ts:981-990` asserts the same rule **positively**, with its reason written out:
*"a rule that refused everything would satisfy the assertions above and leave the harness unable to
run."* So the test terra cites as evidence of a bug is the **encoding of the rule**, not a victim of
it. D6 of the plan preserves the oracle's judgement on purpose, and `oracles.selftest.ts` is on this
item's **may-not-touch list** (plan §6). Terra's `verify` instruction — *"an injected `kind: 'fake'`
transport ... may not yield `provenance: 'real'`"* — would, if followed, redden five assertions in a
file this item is forbidden to touch, to overturn a rule this item never made.

**That is why it is not a blocker.** A blocker defeats the item's central guarantee. The central
guarantee is that no caller names a provenance and that an unclassifiable value is refused. It
stands. And through **every production path** the defect is behaviourally invisible: above loop the
only producer is `createOracleCapability`, which passes `transport.kind`, typed
`TransportKind = 'replay-fs' | 'live' | 'fake'` (`oracles.ts:179`), and `tier`, typed
`Tier = 'loop' | 'integration' | 'drill'` (`registry.ts:104`). Refuse `replay-fs` and the residue is
exactly `{live, fake}` — precisely the two brands the tree deliberately accepts. Accept-by-absence
and accept-by-enumeration produce **identical ledgers today**. Nothing on the stand-in list moves.

### Kimi's MINOR understates it, for one reason kimi itself named and then discounted.

> kimi [2]: *"Today the only producer constrains the brand through the `TransportKind` union, so this
> is reachable only via a hand-forged transport or evidence — source-edit territory the plan's §7
> ceiling already owns — which is why this is MINOR and not MAJOR."*

The reachability analysis is right; the conclusion it draws is not. `CapabilityEvidence.tier` and
`.transport` are declared plain `string` (`capabilities.ts:45-48`), not the branded unions. So
`witnessedCapability('oracles.judge', v, { tier: 'integration', transport: 'bogus' })` returns
`real` with confident-sounding evidence text, and so does `{ tier: 'bogus', transport: 'live' }`.
Kimi files that under §7's "the harness is source code" ceiling. It does not belong there. §7's
ceiling is about an author who **edits a guard**; this needs no edit at all — the exported
constructor hands out a `real` verdict for a brand nobody has ever heard of, on its current source.

And `oracles.judge` is **the only witness in the table with a reachable `real` outcome**. The three
`theArticleItself` rows are declarations; the two seam witnesses can only ever return stand-in or
throw. So this branch is the entire surface on which this item's mechanism can produce a `real`
verdict — and on that whole surface, the grounds are negative. Shipping that inside the item whose
subject line is *"a green can be faked"* would be self-refuting in the precise way the item exists to
prevent. Gate 1 already caught one criterion of mine that was empty by construction; this is the same
shape, and I am not shipping the second one.

**MAJOR. Adopted, with a fix neither reviewer proposed in full.**

---

## The rulings

### [T1 / K2] The `oracles.judge` witness accepts by absence — **ADOPTED, MAJOR, fixed more widely than either reviewer asked**

Reasoning above. The fix, and its three constraints:

1. **Enumerate BOTH axes, not just the transport.** Kimi proposed enumerating the accepted transport
   brands; terra's text names the tier axis too and terra is right that it is the same hole. A legal
   tier brand is `loop`, `integration` or `drill`; a legal transport brand is `replay-fs`, `live` or
   `fake`. Anything else on either axis is **unclassifiable and must refuse**, naming which axis and
   which value. Only then do the existing rules apply.
2. **The existing rules do not change.** loop + `live` throws · loop + {`replay-fs`,`fake`} →
   stand-in · above-loop + `replay-fs` throws · above-loop + {`live`,`fake`} → **real**. Every
   assertion in `oracles.selftest.ts` must stay green untouched. **Do not refuse `fake` above loop** —
   see the disagreement section; that is the tree's deliberate rule and not this item's to overturn.
3. **Do not import `TransportKind` or `Tier` into `capabilities.ts` to get the enumeration.**
   `oracles.ts` imports `capabilities.ts`; inverting that adds a cycle to buy a type that cannot
   constrain a runtime string anyway. Enumerate at runtime and write a comment naming the two files
   that own the source of truth, so a future divergence is findable.

### [T3 / K3] The witness's mismatch branches are duplicated defence that no test pins — **ADOPTED, MAJOR**

> terra [3]: *"Removing the witness's mismatch branches at `capabilities.ts:175-191` would leave
> these assertions green, despite D6's promise of independent refusal."*
> kimi [3]: *"the selftest regexes match BOTH copies' messages, so deleting either copy leaves every
> test green."*

Both are right and they agree on every fact. I checked each one: `createOracleCapability` throws at
`oracles.ts:1135` and `:1148` **before** the witness is reached, so the witness's copies are
unreachable in production; the pinning regexes `/loop-tier oracle on a live/` and
`/filesystem replay transport/` match substrings present in **both** copies' text; the new
conformance assertion covers only the missing-evidence refusal. So neither copy is individually
load-bearing under test. That is a guard that cannot fail — one file over from the S6 defect Gate 1
caught in this same plan.

**Fix: pin the witness's copy, do not delete it.** I reject kimi's alternative remedy (*"or drop them
and say the guard lives in `oracles.ts` alone"*) on two grounds: D6's stated design is that neither
side trusts the other to have checked, and — decisively — after the T1 fix the witness is the **only**
thing standing between a direct `witnessedCapability` call and a verdict. Deleting it reopens exactly
the surface T1 closes.

The two texts are already distinguishable without editing either: the witness says
`refusing to construct capability "oracles.judge": …` where `oracles.ts` says `refusing to build a …
oracle`. Pin on wording unique to the witness, so the assertion cannot be satisfied by the other
copy. **No production string needs to change** — if the executor finds it does, stop and report
rather than editing `oracles.ts`'s refusal text, which D6 preserves.

### [T2] The adapter-derived route is unconstrained — **ADOPTED-MODIFIED. The severity and the framing are rejected; a different, real hole underneath it is adopted.**

> terra [2]: *"any caller may supply any non-empty name and module URL … Thus a fabricated or wrong
> URL passes, as does an unwitnessed name on this route."*

**Rejected as framed, and the MAJOR rating with it.** Every outcome of `adapterDerivedCapability` is
`stand-in`. A stand-in cannot produce a false green: it **adds** to the list `registry.ts:618-620`
refuses above loop, so a fabricated entry makes the closing gate stricter, never laxer. The worst it
can produce is a false red. Terra's own remedy asks for *"rejection or that the recorded reason
identifies the module actually executed"* — and the second disjunct already holds by construction:
`loadAdapter` returns the very URL it passed to `import()` (`index.ts:76`, `:114`). Kimi traced the
identical path and concluded *"since a fabricated URL can only produce a stand-in (false-red
direction), this is not a hole."* On the false-green axis kimi is right.

**The path-traversal sub-claim is rejected too.** `join()` normalises, so traversal collapses, and
the adapter's own `requirement` literal must match the string requested or the load throws
(`index.ts:104-112`). A symlinked component would name the symlink while denoting the same executed
content. The reason names the module really imported in every case.

**But there is a real hole inside the observation, and I am adopting that instead.** Terra noticed
the route accepts "an unwitnessed name" and drew the wrong consequence from it. The right one is
that **the two routes overlap**: `adapterDerivedCapability('clock.controlled', strippedClock, url)`
mints a stand-in for a name the closed witness table would have **REFUSED**. It routes around the
table. It is fail-closed, so it is not a false green — but a function that stamps stand-in on *any*
name is the deleted `standInCapability` wearing a new name and a mandatory reason string, and S5's
exact-zero grep passes while it exists.

**Fix: make the two routes disjoint and total.** The adapter route refuses any name the witness table
knows, and refuses any name that is not `fixtures.worlds` or `sut.<key>`.

> **This is NOT the prefix rule D4 removed, and the code must say so where it is written.** D4 removed
> a prefix from the **witness table**, where matching by pattern means a *verdict* is granted to a name
> nobody decided about. Here the verdict is unconditional stand-in whatever the name is, so the prefix
> grants nothing; it restricts **which names may use a route**. Its whole effect is to make the two
> routes partition the capability namespace instead of overlapping it. If the executor cannot write
> that distinction honestly in a comment, that is a signal the fix is wrong — stop and report.

**Also adopted, and both reviewers found it independently:** the docblock at `capabilities.ts:238-239`
says the URL *"cannot be caller-supplied."* That is true of the route and false of the function's
signature — kimi: *"true of the ledger path, not of the function's signature … it is the kind of
sentence this item exists to keep honest."* Correct it to say what is true.

### [T4] `_fixture.ts:23` names the wrong enforcement mechanism — **ADOPTED, MINOR**

> terra [4]: *"`sut.*` is deliberately outside `WITNESSES`; its provenance comes from the separate
> unconditional route … Altering that route changes every adapter-derived verdict without editing any
> named witness."*

True as read. The header says it takes *"a visible edit to a named witness in
`harness/capabilities.ts`"*; for the `sut` family there is no named witness — the adapter-derived
route is what would have to be edited. This is the S5 defect class exactly: a record naming an
enforcement mechanism that is not the one enforcing. Correct it to name the route. Keep the honest
bound in the last sentence — that part is right and hard-won.

### [K1] `contracts.ts:327-330` overgeneralizes the self-defeating-lie property — **ADOPTED, MINOR**

> kimi [1]: *"`emptying this list means removing a seam the suites drive, not editing a word` is true
> for `clock.controlled` and `vendors.email` … For `fixtures.worlds`, every `sut.<key>` and
> `oracles.judge`, emptying the list means editing the adapter-derived route or the oracles witness in
> `capabilities.ts` — a word-edit in a source file, exactly what the sentence says it is not."*

True as read, and the sharpest kind of finding: the comment claims **more** than the plan it
summarises. Plan §7 already scopes it correctly — *"for the clock and the vendor simulator"* — and
`_fixture.ts:22-25` states the weaker true version for the adapter family. Only this comment
overreaches. Narrow it to the two names where it holds, and say plainly what the other three cost.

---

## What kimi found that terra did not, and vice versa — recorded because it bears on the audit

Kimi ran the eleven attack questions to completion and reported the central hunt **empty**:
*"I found no path by which a value nobody could classify reaches `real`."* It traced all eight ledger
members for Gate 1 finding 8 (the object judged is the object handed over) and reports it closed by
construction. Terra did not answer the attack questions; it returned four findings and stopped.

That asymmetry is worth stating rather than smoothing over: terra found the accept-by-absence branch
that kimi rated too low, and kimi did the systematic sweep terra did not. **Neither review alone would
have produced this ruling.** On the one question they both answered — is there a route to a false
`real` — they agree there is none through any production path, and I have verified that reading
myself against `index.ts`, `oracles.ts` and the witness table.

---

## Rulings the executor must NOT reopen

- **Do not refuse `fake` above loop.** Ruled above; it would redden `oracles.selftest.ts:960,961,984`
  and `:985-990`, a file on the may-not-touch list.
- **Do not touch `oracles.ts`'s two refusal texts or its derivation.** D6 preserves them.
- **Do not chase `bun run lint`.** PHASE-STATE.md and plan §5 explain why; the red is a repository-wide
  CRLF artifact and CI runs no lint step. Do not "fix" line endings anywhere.
- **Do not re-litigate tier-specific fixture-adapter selection.** Rejected in D5, filed, and a founder
  question is already open on it.

---

## Negative controls this fix pass owes — eight, each observed, each reported separately

Plan §5 requires four. The adopted fixes add four new guards, and the same rule applies to them: a
guard that passes when disabled is not a guard.

| # | revert this | expect red |
|---|---|---|
| 1-4 | the four S4 new-guard assertions' guards, one at a time | the matching assertion, per plan §5 |
| 5 | the brand enumeration in the oracle witness | the unrecognised-tier and unrecognised-transport assertions |
| 6 | the witness's loop + `live` throw | the direct witness-refusal assertion for that combination |
| 7 | the witness's above-loop + `replay-fs` throw | the direct witness-refusal assertion for that combination |
| 8 | the adapter route's name constraint | the cross-route refusal assertion |

Controls 6 and 7 are precisely the mutation kimi asked for: *"delete the witness's two mismatch throws
… run `bun run at:selftest`, and observe."* Do it, and report what was observed — not what was
expected.
