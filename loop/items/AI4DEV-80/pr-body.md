The burn report (`loop/work/attribution-report.ps1`) loses the tokens of every agent a
conductor spawns: the real agent transcripts live under `subagents/` directories the report
never scans, and the `.output` files it does scan are either empty stand-ins or full
duplicates of background agents. This change makes the report read the `subagents/`
transcripts (recursively, one level of workflow nesting included), stop reading the
`.output` files (no double-count, no background-file inflation), build the spawn forest
from the platform's `agent-*.meta.json` records, and propagate the item down that tree for
any record that resolves no item on its own — so a sitting's tokens land under its item and
its role.

Also new: `loop/work/attribution-report.selftest.ps1`, a dogfood selftest with fifteen
enumerated asserts against a synthetic spawn forest, plus before/after runs of the report
committed under `loop/items/AI4DEV-80/` as evidence.

What the evidence shows, measured on the real store at the fix head: the unattributed
output-token share moves 70.6% to 67.5%. The share does not drop sharply, because the same
change also enlarges the denominator — transcript files scanned grow 479 to 924, responses
26352 to 49336. The attribution itself nearly doubles: attributed responses grow 10816 to
21345 (+97.4%), the spawn-tree source attributes 4445 responses across 14 items, and the
previous item's scoped burn view grows from 249 responses in 2 roles to 1935 responses in
7 roles. Most remaining branchless responses sit in coordinator sessions on `main`, where
the tree has nothing to hand down.

Read-only reporting script; no product code, no database, no UI. The plan, phase record,
review evidence and the merge ruling live in `loop/items/AI4DEV-80/`. The branch was merged
forward from `main` once, to pick up the twin-guard script the required check runs; the
item's own diff is unchanged across that merge (identical patch-id).

Opened at the plan phase so the required check gates every push of this branch.
