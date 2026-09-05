# pstack model configuration

Provider-qualified per-role choices. Read the installed pstack provider-dispatch reference
before dispatching a configured role. Every documented role remains present. `inherit-parent`
and `auto` use the parent model natively and still count as one panel lane.

Written by setup on 2026-09-02 for ai4good on pstack 1.2.1: the default role map at the
matrix default efforts. The earlier customized sheets are kept beside this file as
`pstack-models.md.bak-*`.

feature, refactoring: grok:grok-4.6@xhigh
bug-fix: codex:gpt-5.6-sol@max
perf-issue: codex:gpt-6-astra@high
hillclimb: codex:gpt-6-astra@high
judgment and prose: claude:fable@max
hardest tasks: claude:fable@max
how explorer: grok:grok-4.6@xhigh
how explainer: claude:fable@low
how critics: codex:gpt-6-astra@medium, claude:fable@high, grok:grok-4.6@xhigh, claude:opus@xhigh
why investigators, synthesizer: inherit-parent
reflect tooling, judgment, divergent, synthesizer: inherit-parent
arena runners: codex:gpt-6-astra@medium, claude:fable@low, grok:grok-4.6@xhigh, claude:opus@xhigh
arena cross-judge pool: codex:gpt-6-astra@medium, grok:grok-4.6@xhigh, claude:opus@xhigh
swarm workers: grok:grok-4.6@xhigh
architect runners: codex:gpt-6-astra@medium, claude:fable@low, grok:grok-4.6@xhigh, claude:opus@xhigh
interrogate reviewers: codex:gpt-6-astra@medium, claude:fable@high, grok:grok-4.6@xhigh, claude:opus@xhigh

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

### The sol writer rows, 2026-09-05

`bug-fix`, `perf-issue` and `hillclimb` held sol at max until 2026-09-05. `perf-issue` and
`hillclimb` are now astra at high, by founder ruling and not by measurement: sol earned those
seats in graded v1 trials, and astra has never written code here. The first item that routes a
unit to one of those rows is the trial. `bug-fix` stays on sol at max, by the same ruling
revised minutes later; it is sol's one remaining seat and keeps the sol family on the sheet.

To undo the two astra rows: replace the astra descriptor with the line below on both.

    codex:gpt-5.6-sol@max

### The two runner rows and the judge pool, 2026-09-05

`arena runners` and `architect runners` held fable at max and sol at max as two of their four
lanes until 2026-09-05. Those two lanes are now astra at medium and fable at low. Eight designs on
one task at one commit, the four from the real arena plus fable at high, fable at low, astra at
medium and muse at xhigh, each newcomer on an incumbent's direction, scored blind by DeepSeek
Flash on the arena's own rubric: astra 18 tied with sol 18, opus 17, fable at high 16, grok 16,
fable at low 16, fable at max 15, muse 10. The second judge, GLM, waits on the OpenCode window.
Astra takes sol's seat on cost at a tie. Fable stays at low by founder ruling, not by score: it
placed sixth. Muse is out of the runner rows. Full record in `loop/evals/design-2026-09-05/`.

`arena cross-judge pool` loses its fable lane. The arena picks a judge from a provider different
from the lead's, and the lead is fable, so that lane could never be chosen. The same day, by
founder ruling, its sol entry became astra at medium: astra judged the rejudged arena coherently
and ranked it the same way as the original judge, at a fraction of sol's cost. The pool is a
pick-one list, not a panel; three entries cover every provider the pick can land on.

To undo the pool's sol entry: replace the astra descriptor with the line below.

    codex:gpt-5.6-sol@max

To undo the runner rows: replace the astra descriptor with the first line below and the fable
descriptor with the second, on both rows. Change both rows or neither.

    codex:gpt-5.6-sol@max
    claude:fable@max

To undo the judge pool: add the line below back as the first lane.

    claude:fable@max

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