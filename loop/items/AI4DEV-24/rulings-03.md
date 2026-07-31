# ORCHESTRATOR RULINGS 03 — AI4DEV-24, Gate 2 confirmation → fix cycle 2 (the last)

Confirmation at head `7e5858e`: codex **5 CONFIRMED, 1 PARTIAL, 0 REFUTED**; Kimi **6 CONFIRMED,
0 REFUTED**. Nothing was refuted — every fix that was judged, held. What remains is one gap
against a condition I set, plus two new observations.

**Cycle count: this is fix cycle 2 of the 2 permitted.** Whatever is open after the next
confirmation gets a terminal ruling; it does not loop again.

---

## R10 — codex's PARTIAL, which both reviewers found independently. **FIX IT. It fails my own condition.**

R7 required: *"extend the negative typeprobe to cover this attack, so it is locked the way the
first one is — a defect proven dead by an executable test is closed; one closed by an argument
is closed until someone edits the file."*

The report said the selftest "asserts each contract **by name**". It does not. Codex lists nine
omissions — `WorldSeam`, `Fixtures`, `Clock`, `Sentinel`, `Sentinels`, `FaultHandle`,
`StaticScan`, `ProviderAttempt`, `EmailProviderSim` — and Kimi reached the same place from its
own angle: *"the executable guard is narrower than its own comment."*

Two reviewers converging on a claim being wider than its evidence is the strongest signal this
panel produces. **Assert every converted contract by name, or narrow the comment to exactly what
is tested — not the other way round.** I prefer the former: the conversion is uniform, so the
test should be too, and a partially-guarded rule invites exactly the reversion it fails to catch.

## R11 — codex's NEW observation: `AtContext` and `OpenWorld` are still augmentable. **FIX IT HERE. This is the bounded extra epoch.**

The protocol says a new observation found mid-confirmation does not extend the gate — recorded,
then folded, filed or rejected at the merge ruling — **except** a blocking-class defect, which
opens one bounded, scoped epoch. This qualifies, and I am invoking that exception once.

It is the same species, and codex's probe shows it live: augment `OpenWorld` with an optional
member, read it, zero diagnostics, `undefined` at runtime. R7's boundary was "everything
reachable from `h`", and these are the wrapper types the test bodies hold directly — so the
door we shut on the harness object stands open on the object handed to every test. Shipping now
would put "the type lie is dead" in the PR body while a working exploit exists one call away.

Same alias treatment, same probe extension. If either conversion forces a suppression, an `any`,
or a runtime change, STOP and escalate — the same stop clause as R7, and I mean it identically.

**This does not reach `WorldLike`.** Your R7 reasoning stands: it constrains `OpenWorld.w`, which
is the suite's own asserted claim and belongs to AI4DEV-31's seam. The boundary remains
principled — the harness object and the wrapper that delivers it — rather than "whatever we
noticed last".

## R12 — Kimi's NEW observation: dead `AtHarness`/`HarnessModule` in `_contract.ts`. **FOLD, same cycle.**

Leftovers from the deleted Channel plumbing, referenced by nothing. Kimi is right that nothing
is dishonest today and right that deleting them completes what the ruling asked for. Our change
orphaned them, so the CLAUDE.md orphan rule applies exactly as it did to `HarnessLike`. Confirm
zero references first, as before.

## R13 — everything else. **CLOSED.**

Codex 2–6 and Kimi 1–6 confirmed, including the two that were ruled against a reviewer's own
proposal: the D5 comparator now hashes one ordered normalized sequence (codex verified order,
case and trailing space all produce different hashes), and the trailing-whitespace disposition
was confirmed by BOTH — Kimi's words: *"This disposition is more honest than my proposed fix,
not less."* That is worth recording. A reviewer endorsing a ruling that overrode it is the
clearest evidence available that the ruling was right.

---

**Next:** implement R10–R12, re-run the full verification with final counts, then the confirmation
pass runs once more — scoped to these three items only, against one immutable head. Then the
merge tail. No third cycle exists.
