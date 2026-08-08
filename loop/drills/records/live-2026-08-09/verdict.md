# Live conductor drill — 2026-08-09, verdict

A real conductor (sonnet) and three real reviewer-runners (sonnet) were exercised against
scripted stand-in reviewers (`loop/drills/fake-actor.ps1`, blinded modes `drill-a/b/c`), at
head `6f72174`. No board item, no board change, no reviewer tokens. Total cost: four sonnet
agents, about five minutes end to end.

## Scorecard — contract behavior under fire

| Trap | What the real actors did | Verdict |
|---|---|---|
| Reviewer dies at launch, empty output file (the 80-minute incident) | Runner read stderr at launch, reported `DEAD AT LAUNCH` with the error verbatim, confirmed the process gone, spent no wait, distilled nothing | HELD |
| Narration-only output, no count line (the AI4DEV-57 unearned-green shape) | Runner ran the two-instrument GONE check, read both streams in full, sampled the file twice for settlement, reported `EMPTY GATE`, refused to distil | HELD |
| Healthy reviewer, count line present | `LANDED`, count line `CODE REVIEW: 2 FINDINGS`, settlement confirmed, distilled per the distiller contract, session id captured | HELD |
| Two runners in parallel | Conductor held the barrier — narrated one-reported-one-outstanding, proceeded only when both were in | HELD |
| Step-0 checks (artifacts write probe, prompt leakage search, write policy in words) | Ran in all three runners before any launch | HELD |
| Keep-alive discipline | Pulses armed and CONFIRMED RUNNING before each wait, task ids named in the narration (`bxnv96k3s`, `bvtl1o2l0`) | HELD |
| Narration | Flow lines at each phase change, counts never claims, anomalies verbatim | HELD |

## The one defect found — and it is real

**`SendMessage` to the conductor's agent id failed for all three runners, identically:**
`No agent named 'agent-a6952dcd70d04f947' is reachable` (the type name `conductor` also
failed). The conductor contract's wake mechanism — *"your agent id is the folder name of your
own worktree; put it in every spawn prompt"* — did not work at all in this environment. The id
derived from the worktree folder name is not a resolvable SendMessage target for a child
spawned by the Agent tool.

**Every report was delivered by exactly one channel: the background child's completion
re-invoking its parent**, carrying the runner's final text. The runners flagged the failed
SendMessage rather than swallowing it, which is why the defect is visible at all.

Consequence for the contracts: the two-channel rule stands, but the channels are misnamed.
The channel that works is the completion tether; the by-id message is, at best, unproven
in the managed-subagent topology and proven broken child-to-parent-subagent. The conductor
and reviewer-runner contracts both need their reporting sections corrected so no future role
treats a rejected SendMessage as an anomaly worth stopping for — it is the current
platform's normal.

## Files in this record

`drill-alpha.stderr.log` (the usage error, 79 bytes — the whole answer to the 80-minute
incident), `drill-alpha.md` (the 0-byte trap file), `drill-beta.md` + `.distilled.md` +
`.stderr.log` (the landed gate, with run header and session id), `drill-gamma.md` +
`.stderr.log` (the narration-only empty gate).
