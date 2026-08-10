The burn report (`loop/work/attribution-report.ps1`) loses the tokens of every agent a
conductor spawns: the real agent transcripts live under `subagents/` directories the report
never scans, and the `.output` files it does scan are either empty stand-ins or full
duplicates of background agents. This change makes the report read the `subagents/`
transcripts, stop reading the `.output` files (no double-count, no background-file
inflation), build the spawn forest from the platform's `agent-*.meta.json` records, and
propagate the item down that tree for any record that resolves no item on its own — so a
sitting's tokens land under its item and its role.

Also new: `loop/work/attribution-report.selftest.ps1`, a dogfood selftest with eight
enumerated asserts against a synthetic spawn forest, plus before/after runs of the report
committed under `loop/items/AI4DEV-80/` as evidence.

Read-only reporting script; no product code, no database, no UI. The plan, phase record and
review evidence live in `loop/items/AI4DEV-80/`.

Opened at the plan phase so the required check gates every push of this branch.
