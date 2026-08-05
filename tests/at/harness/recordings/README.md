# Committed judge recordings — deliberately EMPTY

This directory is the loop tier's semantic oracle. Every `*.json` in it is one recorded call to
the pinned judge model, keyed on a SHA-256 of the complete rendered request plus the vote index.
`harness/oracles.ts` replays them; nothing here ever reaches the network.

**It contains no recordings, and that is the honest state rather than an oversight.** No judge
credential (`AT_JUDGE_API_KEY`) existed on the machine where AI4DEV-20 was built, so no live call
was ever made, so there is nothing truthful to commit. Committing synthetic entries dressed as
live ones would be the exact false green the harness exists to remove — and the store refuses
them anyway: a recording carries `recordedFrom`, and both the reader and the writer reject
anything but `"live"` in **this** directory. Conformance exercises the identical writer and reader
into temp directories, with entries marked `"synthetic"`, which is why the replay path is tested
while this store is empty.

Until it is filled, any loop-tier `judge()` call fails with a typed miss naming the key it wanted.
That is intended: a loop-tier oracle that quietly went live on a miss would report today's answer
under yesterday's expectations.

## Filling it

Parent-side only — the credential is never passed into a test child (see `oracles.ts`, and ruling
F8 in `loop/items/AI4DEV-20/gate1-rulings.md`):

```powershell
$env:AT_JUDGE_API_KEY = '<key>'   # in the calling shell only; never committed, never logged
bun tests/at/harness/record-oracles.ts
```

The recorder canonicalizes the request, calls the judge, validates the response against the
verdict schema, and writes each entry atomically with its provenance. Commit what it writes.

## When they go stale

By construction, not by discipline. The key covers the model id, max tokens, effort, the output
schema and the fully rendered prompt including every material value — so any change to what the
judge is asked produces a different key and the old recordings simply stop matching. A stale
recording cannot answer a changed question; it can only fail to be found.
