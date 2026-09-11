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
hardest tasks: claude:fable@medium
how explorer: grok:grok-4.6@xhigh
how explainer: claude:fable@low
why investigators, synthesizer: inherit-parent
reflect tooling, judgment, divergent, synthesizer: inherit-parent
arena runners: codex:gpt-6-astra@medium, claude:fable@low, grok:grok-4.6@xhigh, claude:opus@xhigh
arena cross-judge pool: codex:gpt-6-astra@medium, grok:grok-4.6@xhigh, claude:opus@xhigh
swarm workers: grok:grok-4.6@xhigh
architect runners: codex:gpt-6-astra@medium, claude:fable@low, grok:grok-4.6@xhigh, claude:opus@xhigh
interrogate reviewers: codex:gpt-6-astra@medium, opencode:opencode-go/muse-spark-1.3-contributor@xhigh, grok:grok-4.6@xhigh, claude:opus@xhigh, opencode:opencode-go/deepseek-v4.1-flash@max

## Changes made by eval, and how to undo each one

Do not write an old row out in full anywhere in this file, even inside a comment. Setup reads this
file as text and treats a second row for the same role as inconsistent state, so a commented-out
row stops the next setup run. Each entry below gives the old descriptor on its own line for copying.

### A fifth interrogate lane, DeepSeek V4.1 Flash, 2026-09-11

`interrogate reviewers` gains a fifth lane, `opencode:opencode-go/deepseek-v4.1-flash@max`, by
founder ruling on a replay. The four existing lanes are unchanged. The eval asked whether
DeepSeek could take grok's lane; the founder chose to add it instead.

Replayed on the admin-operations item at `d62a2d1`, the identical reviewer prompt and diff the
four real lanes received. Coverage of the lead's fourteen act-on items: DeepSeek at max 5,
against grok 7, astra 5, muse 4. It found one of the two races in the transfer definer, which
only astra and grok had found, and missed the one-shot-transfer critical. It added five defects
no lane raised, each verified against the tree: the `create_organization` backstop trims spaces
only while its sibling and the TypeScript rule trim all whitespace; the transfer never checks the
outgoing account's lifecycle; two acceptance bodies are duplicated across tiers; a UUID equality
is case-sensitive; a progress ledger header states a false count. Eight minutes and $0.107 per
run. Zero false claims at max. The high variant, at $0.074, made one confident false claim on the
very function holding the panel's two criticals, so max is the only effort for this seat.

Had grok been swapped instead, the panel would have lost exactly one act-on item, grok's lone
finding about DETAIL kinds on the restated writers. Full record in
`loop/evals/interrogate-2026-09-11/`.

The opencode catalog renamed the model on or before 2026-09-11. The old id `deepseek-flash` no
longer lists and the runner refuses it at preflight. The id above is the listed one.

To undo: delete the fifth descriptor from the row. There is no old row to restore, because the
row gained a lane and lost none.

### The how critics row is gone, 2026-09-09

Upstream pstack 1.4.0 removed the critique mode of the `how` skill and its `how critics` role.
The fork merged that release on 2026-09-09, so the row left this sheet the same day, by founder
ruling. Setup would otherwise halt on an unknown role. There is no undo: the role no longer
exists. Where the notes below say "both panel rows", only `interrogate reviewers` remains.

### The two panel rows: muse in on 2026-09-04, out on 2026-09-05, back on 2026-09-08

`how critics` and `interrogate reviewers` held fable at high as their first lane until 2026-09-04.
That day the lane became muse 1.3 at xhigh: bundle against bundle on the harness item, replayed
from the real panel's own ruling, the fable lane raised no acted-on item that another lane did not
also raise, and two blinded judges from different families ranked muse above fable for the seat,
16 to 14 and 16 to 12. Full record in `loop/evals/panel-2026-09-04/`.

On 2026-09-05 the founder ruled muse out of every seat, on the route and not on the score: muse
was reachable only through the codex router's OpenCode path, and the founder did not want a
standing lane on that route. The lane returned to fable at medium.

On 2026-09-08 the lane is muse again, on a different route. The external-lane runner gained an
`opencode` provider, in the fork `nirdrang/open-pstack`, which drives the opencode CLI directly
and verifies the served model and variant from the CLI's own export. The router is not in the
path, so the objection does not apply. Replayed on the admin-operations item: muse ran the
identical reviewer prompt on the identical diff at the identical commit as the four real lanes.
Coverage of the lead's fourteen act-on items: fable 9, opus 9, grok 7, astra 5, muse 4. Muse
found the flagship critical and missed the one item fable alone found. It added four defects no
lane raised, each verified against the tree, one of them in the same function opus alone had
flagged. Dropping fable costs one act-on item and gains four, and fable's marginal value in this
seat was already measured small. The opus lane stays: opus alone found two act-on items on that
diff, one of them not a code defect. Eight minutes and four cents per run, against 431k fable
tokens for the lane it replaces. Evidence in the session scratchpad of 2026-09-07, not yet filed
under `loop/evals/`.

To put fable back at the effort it last held: replace the muse descriptor with the line below on
both rows. Change both or neither; the two rows are deliberately identical.

    claude:fable@medium

To put fable back at its earlier effort, the same way:

    claude:fable@high

### Seats measured on 2026-09-07 and deliberately left alone

`reflect tooling, judgment, divergent, synthesizer` stays `inherit-parent` by founder ruling on
2026-09-08. For the record: muse on the tooling lens matched five of six findings of the opus
lane in 1.6 minutes for under a cent, and missed the one finding that needed generalising past
the three examples in the lens prompt. The routing keeps the MCP surface. The lanes bill the
parent, so the practice is to run reflect from an Opus session.

`how explorer` stays one descriptor. Muse ran all four explorer angles at about one eleventh of
grok's cost and four times the speed, at 60 to 70 percent of the volume with higher citation
density, but grok was better on the load-bearing structural section and muse misstated trigger
coverage once. The measured recommendation is one muse lane of four, not the row. The `how`
skill reads this row as a single descriptor, so a list here means nothing until the skill change
in the fork lands. Held.

`arena cross-judge pool` is unchanged. Muse judged the same four blinded designs to the same base
as the real judge, with the same top two, and named a graft the lead took. But the pool picks a
provider other than the lead's, so with a Claude lead its opus entry never fires, and adding muse
saves nothing until the lead moves.

### The hardest-tasks row, 2026-09-08, twice

`hardest tasks` held fable at max since the 2026-08-31 ceiling ruling. It became fable at high
earlier the same day, by founder ruling and not by measurement: the seat stays on fable, one effort
step down, untested at high for a unit that must still design something. On the admin-operations item
the one unit routed here cost 296k fable tokens at max. The lead had proposed opus at xhigh for this
seat, on the evidence that opus wrote the arena's winning design; the founder kept fable instead.

Later the same day it became fable at medium, a second step down, again by founder ruling and not by
measurement. The occasion was the notifications backend run. The lead routed that item's first unit
here and the founder asked why. The lead's case was that the unit fixes the seam decomposition every
later unit inherits, which is a one-way door. The founder's answer was to keep the unit on this seat
and lower the seat instead. The run is the trial: the unit had already produced one commit and four
product modules at high when the founder ruled, and the same unit continues at medium, so the two
efforts are observable on one unit.

To undo one step, back to the effort this row held for a few hours:

    claude:fable@high

To undo both steps, back to the effort it held since the ceiling ruling:

    claude:fable@max

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