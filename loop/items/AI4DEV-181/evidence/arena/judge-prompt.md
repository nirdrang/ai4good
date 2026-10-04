# Cross-judge: five design candidates for wiring the Discovery screen (AI4DEV-181)

You are the read-only judge of an architect arena. Do not edit any file. The repository is your
working directory. Read the task the candidates got, then all five candidates in full, then score.

- The task: `C:\Users\nirdr\AppData\Local\Temp\claude\C--Users-nirdr-Downloads-ai4good\44802c73-47d7-44cd-b178-89b3ea791dc2\scratchpad\arch181\task.md`
  (and the grounding it lists: `loop/items/AI4DEV-181/plan.md`, `decisions.tsv`, the screen's
  `src/components/discovery/port.ts`, `src/lib/discovery-stream.ts`, `design/astra/src/fixture-world.ts`).
- The candidates, by label (same folder): `out-astra.md` (C1), `out-fable.md` (C2), `out-grok.md` (C3),
  `out-opus.md` (C4), `out-sol.md` (C5). Each had a different assigned direction: C1 one JSONB
  document per revision with rules in TypeScript; C2 normalized tables with rules in plpgsql; C3
  event sourcing; C4 smallest change, one JSONB row per project updated in place; C5 the turn ledger
  as the unit of truth.

## Rubric (score each candidate 1 to 5 per criterion, with one line of evidence each)

1. **One source of truth for the brief and its revision.** One writer of the revision; a real-change
   bump rule; idempotent finish per revision; stale-revision on a base mismatch; no two places that
   compute the same rule.
2. **Turn path correctness.** One model call (forced `reply` tool) both streams the reply text and
   updates the brief atomically with settle; structured answers authoritative over the model's
   re-listed topics; the screen's `DiscoveryRequestBody` accepted (empty note with answers); the data
   parts `use-discovery.ts` reads; stable message ids across live stream and reload.
3. **Concurrency and failure.** Turn settle versus review writes versus the file read job on the same
   brief: what happens when they overlap; crash and retry behaviour; credits never double-charged.
4. **Interface depth and reader load.** The screen's `DiscoveryPort` unchanged except the beta
   fields; a small, deep server surface; short call chains; no pass-through layers.
5. **Testability.** The same section J screen test bodies at the loop tier (fixture shell) and the
   integration tier (real route, seeded worlds); a realistic answer to scripted assertions versus a
   real model; the model-call counter.
6. **Smallest correct change.** Lines and moving parts versus what the definition of done needs.

## Output

A table of scores (candidate x criterion) with totals; the recommended base and why; the one or two
best ideas in each losing candidate worth grafting into the base; any defect a candidate has that
would make it wrong (not merely different). Be specific and cite candidate sections.
