# Cross-judge: four design packages for the admin-operations subtree

You are the arena's cross-judge. You are read-only. Do not run git, do not start processes, do not touch the database, do not write any file. Your sandbox may refuse writes; deliver the WHOLE verdict as your final message, because the launcher saves only your final message to loop/items/AI4DEV-56/artifacts/arena/judge-verdict.md.

## What you judge

Four design packages, blinded, at these paths under loop/items/AI4DEV-56/artifacts/arena/judge/:

- candidate-A.md
- candidate-B.md
- candidate-C.md
- candidate-D.md

All four answer the same task: loop/items/AI4DEV-56/artifacts/arena/design-task.md. The rubric is loop/items/AI4DEV-56/artifacts/arena/rubric.md (six criteria, 0 to 3 each). The critique rulings every candidate had to obey are loop/items/AI4DEV-56/artifacts/how/rulings.md (R1 to R15). The system explanation is loop/items/AI4DEV-56/artifacts/how/explanation.md. The brief is loop/items/AI4DEV-56/brief.md. Read the rubric, the rulings and all four candidates end to end before you score. Verify claims against the tree when a score turns on a fact (for example, whether `callDatabaseFunction` is the only RPC path in supabase/functions/_shared/edge.ts, or what tests/at/suites/req-001/_policy-scan.ts already checks).

## How you score

For each candidate, score each of the six criteria 0 to 3 with one or two sentences of evidence quoting the candidate's own text or a file it names. A criterion scored without evidence is scored 0. Then list, per candidate:

- rulings it violates (by R number) with the sentence that violates;
- the single strongest idea another candidate lacks (the graft);
- the single weakest decision a maintainer would pay for.

Then recommend a base: the candidate a future maintainer extends most easily without breaking invariants, with cleaner boundary or smaller surface breaking ties. Give the rationale in one paragraph. Name the grafts you would take from each loser into the base, one line each.

## Output shape

Markdown. Sections in this order: Scores (a table, candidates as columns, criteria as rows, total as the last row), Per-candidate notes (A to D), Base recommendation, Grafts, Dropouts (any candidate that is empty, truncated or off-task). Plain sentences, twenty-five words maximum each.