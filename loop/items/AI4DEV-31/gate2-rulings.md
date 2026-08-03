# AI4DEV-31 — Gate 2 rulings (item agent, OPUS)

Two reviewers, different vendors, run in parallel in this worktree against the real tree:

- **codex `gpt-5.6-terra` @ `max`** — `gate2-terra.md`. Verdict: *do not merge*.
- **Kimi `kimi-code/k3` @ `high`** — `gate2-kimi.md`. Verdict: *do not merge as written*.

Both executed rather than reasoned: they compiled attacks, reverted protections to check the
selftest names them, and built counter-examples. Kimi additionally ran the two behaviour commands
terra could not (terra hit the documented sandbox limitation where vitest's parent-path config walk
is denied inside a nested worktree — read as could-not-verify-in-sandbox, not as a red).

**The two-vendor split paid for itself on this item.** Kimi found a blocker terra did not, and that
blocker was an error in *my own* Gate 1 ruling. Had I run one reviewer, I would have merged it.

| # | finding | raised by | severity | ruling |
|---|---|---|---|---|
| 1 | the seam still widens structurally, via `Omit` + intersection around the derived types | **both, independently** | blocker | **ACCEPTED as real; NOT fixed. Documented, recorded, filed as AI4DEV-37.** Founder confirmed. |
| 2 | `World` stayed an interface and the upcast route is open | **kimi only** | blocker | **ACCEPTED — my Gate 1 ruling was wrong. Converted.** |
| 3 | `loadAdapter()`'s requirement check has no failing-path test | **both** | important | **ACCEPTED, fixed** |
| 4 | doc overpromises ("the compile error says what to add"; "takes no type arguments at all") | both | minor | **ACCEPTED, fixed** |

---

## 1 — the structural-widening attack: real, and deliberately left open

Both reviewers independently built this, and I had a third agent reproduce it before ruling:

```ts
type WidenedContext = Omit<AtContext<'req-016','notifications'>, 'open'> & {
  open(): Promise<Omit<OpenWorld<'req-016','notifications'>, 'sut'> &
    { sut: SutOf<'req-016','notifications'> & { invented?: string } }>;
};
suite.atTest('AT-016.97', '…', async (ctx: WidenedContext) => {
  const { sut } = await ctx.open();
  void sut.invented;            // compiles; undefined at run time
});
```

Confirmed clean through **all three** entry points — the bound `atTest`, the raw `atTest` and
`defineEvidenceCapture` — with `--listFiles` and deliberate-error controls proving the compile was
real (`gate2-widen-reproduction.txt`). No cast, no `any`, no suppression, no augmentation.

**Ruling: the attack is real and is NOT fixed in this item. What gets fixed is the overclaiming.**

The reasoning, which the founder confirmed:

The defect this item owns is the one **nobody could see**. The old API positively invited a suite to
state its own seam types — `bindSuite<NotificationsSut, World>` was the documented usage — and then
believed whatever it was told. That is how an honest suite drifts from the harness with nothing able
to notice, and it is closed: there is no type argument left to lie with, proven red-then-green.

What survives requires hand-building a wrapper type whose only possible purpose is to defeat the
check. That is the same act as writing a cast, spelled longer, and Gate 1's finding 8 — accepted
*before* this finding existed — already put that class in documentation rather than machinery. I did
not move the line to accommodate an inconvenient result; the line was already there.

It also **cannot** be closed with types, and both reviewers said so independently: optional-member
intersections are assignable in both directions, so no constraint, variance annotation or conditional
trick can distinguish the widened type from the real one. Terra's own proposal is a source-inspection
pass over callback annotations — a separate static-analysis tool, not a change to the seam. Per the
ride-along rule, independent work that could stand alone is **filed, not built**: **AI4DEV-37 (forbid
hand-annotated callback contexts)**.

**But an overclaiming comment is a finding at the same severity as an overclaiming test**, by my own
standard set in the Gate 1 rulings. So every place that claims more than the truth is corrected, the
attack is recorded verbatim where a future author will meet it, and structural reconstruction joins
the documented not-closed list beside `any` / `as` / `@ts-ignore` / `AT_REPO_ROOT`.

The same correction was applied one level up, at the founder's instruction: the item's **board
description** called this "the last known one of its kind at that seam", which is no longer true. A
board description that overclaims is the same defect as a comment that overclaims.

## 2 — `World`: I was wrong at Gate 1, and the condition I attached is what caught it

Gate 1 measured that augmenting the `World` interface still yields TS2339 on `open().w.invented`,
because a class does not acquire interface members merely by implementing one. On that basis I
**removed** the conversion from scope and called it the gate working in the direction people forget —
less code, because a claim was measured instead of assumed.

Gate 1 measured only the **direct read**. Kimi measured the **upcast**: the fixture class implements
`World`, so `const asWorld: World = w` needs no cast, and a member merged into `World` then reads
green — exit 0. The suite itself still spells `World` (`d-taxonomy-evidence.test.ts:23`), so the
condition I attached to that ruling — *"confirm no remaining seam path resolves to `World`"* — fails.

**Ruling: converted after all**, added to the exhaustive protected list with its own attack, and the
records that explained "why `World` is deliberately absent" corrected to say what actually happened.

Two things worth keeping from this. First, **a measured finding can still be incomplete** — Gate 1
measured a true fact and drew a conclusion wider than it supported, which is the same shape as the
defects this item hunts. Second, **the conditional was load-bearing**: attaching "verify this for
yourself, and if it fails, do the work" to a ruling I was removing work on is the only reason this
was recoverable rather than shipped.

## 3 — the untested rejection path

`loadAdapter()` validates the adapter's self-declared `requirement` and throws naming both values —
but every synthetic adapter carries the correct literal, so **deleting the check left all 140 tests
green**. A check nothing exercises is indistinguishable from a check that was removed, which is this
item's own defect wearing a different hat. Both reviewers raised it. Fixed with synthetic-tree tests
for the wrong literal and the missing literal.

## What both reviewers confirmed sound

Recorded because a list of *failed* attacks is the evidence that matters here: `declare module`
overload merging on all three entry points (TS2451); the legacy `bindSuite<Sut, W>` and
`defineEvidenceCapture<T, Sut, W>` forms (TS2344/TS2554); an unregistered requirement (TS2322); a
misspelled sut key (TS2322); undeclared members off the derived `sut`/`w` (TS2339); augmenting each
converted alias (TS6200); constructing `EvidenceCapture` (TS2693); annotating the body with
`AtContext<shape, shape>` (TS2344/TS2345); reaching raw `atTest` directly.

Also verified by kimi: the red half reproduced **live** in a scratch worktree at the pre-fix commit;
per-name failure confirmed by reverting `Delivery` to an interface and observing exactly its named
test fail (42/43), then restoring; the runner black-box and expectation selftests had **zero**
assertion lines changed, setup only; `requirementMismatch` handles the dotted-requirement case
(`AT-005.5.03`); and no dead machinery — nothing deletable without losing a guarantee.

## Escalated to the founder

One question, sent mid-run without parking: whether the residual deliberate route should block this
item, given the board description called this seam's problem the last of its kind. The founder ruled
that the item closes on removing the invited route, the deliberate route is documented and filed, and
the stricter bar was explicitly not chosen. That ruling is implemented above.
