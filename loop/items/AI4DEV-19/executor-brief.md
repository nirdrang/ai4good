# AI4DEV-19 (planted markers, forced failures) — executor brief

You are the **opus executor**. You write the code. Every design decision is already made — read
`loop/items/AI4DEV-19/design.md` and `loop/items/AI4DEV-19/brief.md` in full before your first
edit. They are not summarised here; a restatement is one more place to be wrong.

You inherit this worktree and this branch. Do not create a branch, do not merge, do not touch
Linear. **PowerShell, never Bash. bun, never npm/pnpm.**

## Escalate to me, not to anyone else

If a decision in `design.md` turns out to be wrong, **stop and report it to me** with the
evidence. Do not quietly route around it. Two rulings in particular were made with reasons that
an implementation could refute, and if you refute one, say so plainly — that is a good outcome,
not a failure:

- both capabilities register as `realCapability`, not `standInCapability`;
- no change to the declared types in `contracts.ts`.

## The order of work — the middle step is the proof, do not collapse it

### 1. Harness capabilities

Implement `Sentinels` and `Faults` and replace the two `pendingCapability` seams in
`tests/at/harness/index.ts`. **Do not weaken `pendingCapability` itself** — it must keep throwing
for capabilities that have not landed, and `static` and `vendors` must stay wired to it.

Route every check through `tests/at/harness/guards.ts` as the design's table specifies. Do not
re-derive any of those four judgements locally; `guards.ts:13-14` makes that binding, and a
second copy of the rule is how the two drift apart.

`triggerCount()` counts times execution **reached** the armed point. Not times it was armed.
A handle that counts arming as firing makes every atomicity test in thirty future suites pass on
nothing, which is the specific catastrophe `AI4DEV-3-at-harness.md:127-135` warns about.

Extend the adapter seam on **both** `index.ts`'s `FixtureAdapter` and `suite-adapters.ts`'s
`AdapterShape`, optional at the type level (the black-box selftest trees export two-method
adapters and must keep working), refused at use.

### 2. Fixture faultable, but NOT yet atomic — capture the RED

In `tests/at/suites/req-016/_fixture.ts`, introduce the process epoch and reorder `emitKnown` to
**transition → fault point → event write**. Do *not* add the rollback yet.

Run and capture the transcript verbatim:

```powershell
bun run at:verify req-016 --tier loop 2>&1 | Tee-Object loop/items/AI4DEV-19/proof-red.txt
```

**`AT-016.09` must fail with the atomicity complaint** — `transition=… notificationEvent=… — the
fault committed one without the other`. If instead it fails with `CapabilityPending`, or an
adapter error, or passes, the proof is void: that would mean the fault never fired and the run
proves nothing. Fix the wiring and re-capture until the red is the *right* red.

### 3. Make it atomic — capture the GREEN

Make the transition and the event write (with its deliveries and ops item) commit as one unit:
under a crash at the point, roll the transition back so **neither** side is committed.

```powershell
bun run at:verify req-016 --tier loop 2>&1 | Tee-Object loop/items/AI4DEV-19/proof-green.txt
```

`AT-016.09` passes. Same test, same command, two transcripts — the difference is the rollback.

### 4. Conformance tests that prove the WIRING, not just the predicates

`conformance.selftest.ts:236-264` already tests the four guards as pure functions. That is not
enough, and this tree says so itself at `conformance.selftest.ts:114-128`: a problem computed and
not acted on is *"this tree's own recurring false-green shape"*.

Add tests that the implementation **calls** each guard: a short value refused at `plant`, a typo
point refused at `at`, a never-fired handle refused at `clear`, an unchanged epoch refused at
`processRestart`. Plus sentinels' own proof — presence, absence, refusal of an unregistered scope,
refusal of a reused value — because `req-016`'s only sentinel consumer stays red and `scan()` has
no caller anywhere, so these tests are the only thing standing behind that half of the item.

### 5. Move the declaration in the SAME commit as the behaviour

`tests/at/expected/req-016.json` per the design's table: `AT-016.07` and `AT-016.09` move to
`green`; `AT-016.01`'s `capabilities` drops `'H3 sentinels'`, leaving
`["H3 static provider scan", "H5 email provider simulator"]`; `AT-016.11` untouched. And
`index.ts`'s `static` seam drops the same name.

A red that turns green without its declaration moving is a **failure**, not progress.

### 6. The gate

```powershell
bun run at:verify req-016 --tier loop --expect
bun run at:selftest
bun run typecheck
```

All three green. The first is the gate, not a status readout.

## Tripwires — if you find yourself doing any of these, stop and tell me

- **Editing `conformance.selftest.ts:139-158`**, the exhaustive stand-in ledger
  `['clock.controlled','fixtures.worlds','sut.notifications']`. Under the `realCapability` ruling
  that list does not change. Needing to edit it means the ruling was violated or is wrong.
- **Converting `Sentinel`, `Sentinels`, `FaultHandle`, `Faults` or `StaticScan` to an
  `interface`.** They are in `ALIAS_PROTECTED` and must stay `type` aliases.
- **Renaming the fault point** to match the fixture's current write order instead of reordering
  the writes. The name says `between_transition_and_event_write`; making the name fit the code
  rather than the code fit the name is precisely the declared-versus-real drift this way of work
  exists to delete.
- **Relaxing an assertion to get green.** Turning a red green by loosening the test is the one
  outcome worse than leaving it red.
- Touching the semantic oracle, the vendor stand-ins, or `providerClientImporters()`.

## Report back

What you built, which of the three commands are green with their exact output, both proof
transcripts, every place the design was wrong, and anything you changed that the design did not
anticipate. Do not commit anything you have not run.
