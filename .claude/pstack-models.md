# pstack model configuration

Provider-qualified per-role choices. Read the installed pstack provider-dispatch reference
before dispatching a configured role. Every documented role remains present. `inherit-parent`
and `auto` use the parent model natively and still count as one panel lane.

Written by setup on 2026-09-02 for ai4good on pstack 1.2.1: the default role map at the
matrix default efforts. The earlier customized sheets are kept beside this file as
`pstack-models.md.bak-*`.

feature, refactoring: grok:grok-4.6@xhigh
bug-fix: codex:gpt-5.6-sol@max
perf-issue: codex:gpt-5.6-sol@max
hillclimb: codex:gpt-5.6-sol@max
judgment and prose: claude:fable@max
hardest tasks: claude:fable@max
how explorer: grok:grok-4.6@xhigh
how explainer: claude:fable@low
how critics: codex:gpt-6-astra@medium, codex:opencode-go-responses/muse-spark-1.3-contributor@xhigh, grok:grok-4.6@xhigh, claude:opus@xhigh
why investigators, synthesizer: inherit-parent
reflect tooling, judgment, divergent, synthesizer: inherit-parent
arena runners: claude:fable@max, codex:gpt-5.6-sol@max, grok:grok-4.6@xhigh, claude:opus@xhigh
arena cross-judge pool: claude:fable@max, codex:gpt-5.6-sol@max, grok:grok-4.6@xhigh, claude:opus@xhigh
swarm workers: grok:grok-4.6@xhigh
architect runners: claude:fable@max, codex:gpt-5.6-sol@max, grok:grok-4.6@xhigh, claude:opus@xhigh
interrogate reviewers: codex:gpt-6-astra@medium, codex:opencode-go-responses/muse-spark-1.3-contributor@xhigh, grok:grok-4.6@xhigh, claude:opus@xhigh

## Changes made by eval, and how to undo each one

Do not write an old row out in full anywhere in this file, even inside a comment. Setup reads this
file as text and treats a second row for the same role as inconsistent state, so a commented-out
row stops the next setup run. Each entry below gives the old descriptor on its own line for copying.

### The two panel rows, 2026-09-04

`how critics` and `interrogate reviewers` held fable at high as their first lane until 2026-09-04.
The lane is now muse 1.3 at xhigh. Bundle against bundle on the harness item, replayed from the
real panel's own ruling: the fable lane raised no acted-on item that another lane did not also
raise, and two blinded judges from different families both ranked muse above fable for the seat,
16 to 14 and 16 to 12, naming the same single marginal defect. Full record in
`loop/evals/panel-2026-09-04/`.

To undo: replace the muse descriptor with the line below on both rows. Change both or neither; the
two rows are deliberately identical.

    claude:fable@high

### The sol lane on the two panel rows, 2026-09-05

`how critics` and `interrogate reviewers` held sol at max as a lane until 2026-09-05. The lane is
now GPT-6 Astra at medium. Replay on the harness diff with the two candidates against the same
fixed panel: two blinded judges from different families (fable and grok) both gave astra the seat,
21 to 18 and 21 to 15, naming the same two defects nobody else on the panel raised. Astra ran six
minutes at medium; sol's lanes ran three to five times longer at max. Sol keeps every other seat.
Full record in `loop/evals/panel-2026-09-04/scoring.md`.

To undo: replace the astra descriptor with the line below on both rows. Change both or neither.

    codex:gpt-5.6-sol@max

### The explainer row, 2026-09-04

`how explainer` held fable at high until 2026-09-04. It is now fable at low. Four candidates,
two rounds, four blinded judge passes across two families, all four ranking fable at low first,
ahead of fable at max, opus at max, and muse 1.3. Fable at low costs about half the tokens of high.
Full record in `loop/evals/explainer-2026-09-03/`.

To undo: replace the descriptor with the line below.

    claude:fable@high