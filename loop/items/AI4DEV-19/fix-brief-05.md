# AI4DEV-19 — executor brief for the confirmation-round fix

ONE fix. The ruling is in `loop/items/AI4DEV-19/rulings-05.md` and is **already made**. Do not
re-litigate it. If implementation proves it wrong, stop and report — do not silently choose
differently.

Work in this worktree, on the branch already checked out. You are the only writer while you run.

## Ground rules, unchanged from fix-brief-03

- `tests/at/harness/contracts.ts` is the contract. **Do not change it.**
- The five guard predicates in `guards.ts` stay the single place each judgement is made.
- Loop tier stays database-free and lock-free.
- `bun run at:verify req-016 --tier loop --expect` must match **exactly** at the end:
  10 green / 2 red, the reds being AT-016.01 and AT-016.11, both capability-pending.
- PowerShell, never Bash. bun, never npm/pnpm.

## The fix — AT-016.07 pins its own restart

**The residual (terra, confirmation round):** `b-delivery-defaults.test.ts:39-41` reads the
epoch before and after the restart, but nothing asserts they differ — they appear only in a
failure message. The harness's no-op-restart guard (`processEpochProblem`) runs only inside
`h.faults.processRestart()` itself, so deleting the restart call at line 40 skips the guard and
the test still passes: stamps and `afterRestart` are both `delivery-process-1`. The step whose
removal changes no outcome is back.

**1. Add the scenario pin.** Directly after `const afterRestart = await h.faults.processEpoch();`
(line 41), assert the restart actually produced a new identity:

```ts
expect(
  afterRestart,
  'the delivery-process identity is unchanged across the restart — this scenario never actually ' +
    'restarted, so every claim below would be about a process that never stopped',
).not.toBe(beforeRestart);
```

Wording may be tuned; the semantics may not: the assertion must fail when the restart call is
absent, and it must sit with the other scenario preconditions (the two mid-flight pins above it),
because that is what it is — the third precondition, "the restart happened at all".

**2. Rewrite the comment at lines 37-38.** It currently delegates the whole obligation to the
harness ("checked once in harness/guards.ts, not per suite"), which is half right and the wrong
half. Required content, in your own words: the HARNESS owns "an invoked restart must change the
identity" (`processEpochProblem`, routed by `faults.ts` — a no-op restart throws before this
test can even reach its assertions). The TEST owns "a restart was invoked here at all" — the
guard cannot fire for a call that was deleted, and the original Gate 2 finding was proved by
exactly that deletion. The pin below is not a re-check of the harness's judgement; it is the
scenario refusing to hold still while its restart is removed.

**3. Falsification, required — same standard as every other repair this round.** Into
`proof-restart.txt`, using its own cmd-redirection capture method:

- Temporary edit A (kept from the current file): `drainDeliveries` stamps the constant
  `'delivery-process-1'` instead of `processEpoch`. AT-016.07 must FAIL on the post-restart
  stamp assertion. Restore.
- Temporary edit B (new): delete the `await h.faults.processRestart();` line and nothing else.
  AT-016.07 must FAIL on the new scenario pin, with before === after in the message. Restore.
- Final run, clean tree: AT-016.07 passes, `git diff` against the final code commit empty.

**4. Re-capture all four proofs against the new final code commit.** The rule from rulings-04,
which binds this round too: the code commit lands FIRST, every capture happens against it, and
NOTHING changes afterwards — not a comment, not a docstring. Each file names the new commit.
`proof-restart.txt` is restructured to carry both falsifications and to add one line to its
"what this proves" trailer: the scenario cannot silently drop the restart, because deleting the
call is itself a captured red. `proof-green.txt`, `proof-red.txt`, `proof-oracle.txt`: re-run
their own recorded procedures, update transcripts and the named commit, change nothing about
what they claim to contain beyond that.

## What to run before you report

From the worktree root:

1. `bun run at:verify req-016 --tier loop --expect` — exact match, 10 green / 2 red.
2. `bun run at:selftest` — the harness conformance wall, all green.
3. Full `tests/at` at loop tier — the only reds may be AT-016.01 and AT-016.11, both
   capability-pending.
4. Typecheck, if the repo has one wired.

## How to report — this exact rule cost a round trip once already

**Put your report in your FINAL MESSAGE.** Do not use `SendMessage`, and never address
`item-agent` — that is an agent type, not a reachable id, and a report sent there lands on the
coordinator instead of on me. Your final message returns to me directly.

Report in plain sentences: what changed, file and line; both falsification exit codes and the
assertion each failed on; the per-AT-id `--expect` result against the declaration; any ruling
you believe is wrong, with evidence; anything you found that nobody has raised.

Commit in logical commits citing AI4DEV-19 — the code commit first, the proof re-captures
after it. Do **not** push and do **not** open or modify a pull request. The merge decision is
mine.
