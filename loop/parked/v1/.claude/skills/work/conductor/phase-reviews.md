# Reviewer runs

Read this the moment a state file names reviewers, before that gate's first runner spawn.
It also governs the audit panel's two seats — `phase-audit-tail.md` sends you here for them.

You never start a reviewer process. The ONLY actor that launches a reviewer is a
`reviewer-runner`, and you spawn one runner per reviewer the state file names. The recipes,
the stderr check, the count-line test, and the distillation live in the runner's contract;
never duplicate them here or in a spawn prompt — two copies of a recipe drift apart, and the
drifted copy wins silently.

## Assembling the prompt

Assemble each reviewer's prompt from `.claude/skills/work/reviewers.md`, never by handing
over the whole file. Read that file's assembly section first. The assembled prompt is exactly
three parts: the `## Your contract` section, the reviewer's OWN gate section, and the
orchestrator's additions. No reviewer sees the assembly section or a sibling gate — a
reviewer that reads another gate's instructions reviews the wrong thing with full confidence.

Pins: copy them verbatim, never choose them. The `**Pins**` block itself never enters a
reviewer prompt. The runner re-checks for leakage, but the runner's check is the backstop,
not the mechanism.

**Gate 1's pin has two sources (founder ruling 2026-08-23).** If your own spawn prompt carries
a plan-gate pin — an opencode model id, with or without a variant — that pin IS gate 1's pin:
hand it verbatim, and the gate runs as an opencode seat, with everything that implies (agent
`reviewer-flash`, the two extra output paths, the identity extract). A model with no variant is
a complete handed fact, not a gap — the runner launches without the variant flag. If your spawn
prompt carries none, gate 1 uses the default in the `reviewers.md` pins block. Either way you
still choose nothing: both sources are copies.

## Spawning the runner

The runner spawn prompt carries facts only: the gate, the reviewer label, the assembled
prompt file, the tree and artifacts paths, the output, stderr, and distillate paths, the pins
verbatim, your agent id as report-to, and the statement that completion text is the report of
record. For an opencode seat, add two more output paths — the tool-call summary and the
identity extract. The runner REFUSES to launch without them; their names are yours to assign.
Healthy opencode stderr is empty; the seat's evidence is the tool-call summary and the
identity extract, and the runner deletes its own working files.

If the `reviewer-runner` type is unresolved, that is a `STALL`, never an improvised launch.
The agent registry loads once per session, so the fix is a restart: report the resolver error
verbatim, say the fix is a restart, stop. Do not launch the reviewer yourself — a role that
reaches around a boundary because the boundary looks broken is how boundaries stop existing
(lessons.md holds the incident).

## Waiting on runners

Arm no watch on a reviewer's files. The runner holds that wait, and a second watcher on the
same files is a second authority to declare a gate landed — the same defect as a second way
to close work. Your wake is the runner's ending, nothing else.

Ask a runner for status or an abort, never what the review says: it has not read one, and a
characterisation from the actor holding the process would be believed.

## What a runner reports

One of five words: `LANDED`, `EMPTY GATE`, `DEAD AT LAUNCH`, `INVALID RUN`, `REFUSED`. All
but the first are anomalies, and anomalies go DOWN: name them in the state file for the next
sitting to rule on, and spawn that sitting early if the ruling cannot wait. `INVALID RUN` (a
spent opencode slot, or a failed identity or read-only check) is a dead gate: the open
decision is whether to relaunch, and its output is never distilled. **Never record an empty,
aborted, invalid or dead gate as a clean one** — an empty gate is an unearned green, and an
unearned green is the failure this whole review path exists to prevent.

The gate completes when EVERY runner has reported — a partial landing is not progress — and
each report is logged. Distillates return with the runners; you spawn no distiller. Then the
contract's boundary sequence resumes: flow line, next sitting.
