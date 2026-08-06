# AI4DEV-20 — live judge smoke: NOT RUN

**No live smoke was performed, because no judge credential existed.** `AT_JUDGE_API_KEY` was unset
in the executor's environment and no `.env.local` carried one, so the semantic oracle has never
made a real call. Nothing here is a measurement; this file exists so the absence is written down
rather than inferred from a missing file.

Checked, without printing or logging any value: `$env:AT_JUDGE_API_KEY` unset, `$env:ANTHROPIC_API_KEY`
unset, no `.env.local` in the worktree or in the main checkout.

## What that means, concretely

| | state |
|---|---|
| `tests/at/harness/recordings/` | **empty** — only its `README.md`. Nothing synthetic was committed. |
| Any loop-tier `judge()` call today | a typed `OracleReplayMiss` naming the key it wanted |
| The live transport | written, compiles against the pinned SDK's own request and response types, **never executed** |
| The recorder | written; its no-credential path was run and exits 2 writing nothing (see below) |
| Measured stability (Gate 1 finding F1) | **absent.** The N=5 repeat measurement needs live calls. |

The recorder's refusal path is the one part of the live surface that was exercised:

```
$ bun tests/at/harness/record-oracles.ts
record-oracles: no AT_JUDGE_API_KEY in this process.
...
exit 2
```

## What is unproved, stated plainly

1. **That a live call succeeds at all.** The request shape is compile-checked against
   `@anthropic-ai/sdk@0.115.0` — the pinned model id, `max_tokens`, `output_config.effort` and
   `output_config.format` are assembled through that SDK's own parameter types, so a shape the SDK
   rejects fails `bun run typecheck`. That is a check of the SHAPE, not of the behaviour. Whether
   the judge returns a verdict matching `VERDICT_SCHEMA`, whether `stop_reason` is `end_turn`,
   whether the prompt elicits usable extractions — all unknown.
2. **The stability bound.** Finding F1 accepted the k-vote majority argument only on condition the
   stability be measured. It has not been. `record-oracles.ts` is the instrument; it has not been
   pointed at anything.
3. **The effort pin.** `low` is PROVISIONAL and labelled so in `oracles.ts`. The sweep that would
   settle it needs a consuming evaluation, which does not exist either.
4. **The SDK under bun.** The dependency installs and type-checks; it has not been executed.

## The proof point

The first consuming suite's integration run is where all four become answerable, and that is the
same slice that has to decide how a judge credential reaches a test child. Until then the loop
tier is honest about having nothing to replay: it fails loudly with the key it wanted rather than
going live, and the committed store refuses any entry that cannot show live provenance.

**To fill the gap**, parent-side, on a machine with a key:

```powershell
$env:AT_JUDGE_API_KEY = '<key>'
bun tests/at/harness/record-oracles.ts
```

That records k votes per example specimen, repeats the full verdict five times to count flips,
overwrites this file with the measurement, and leaves the recordings to be committed alongside it.
