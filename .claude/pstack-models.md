# pstack model configuration

Provider-qualified per-role choices. Read the installed pstack provider-dispatch reference before dispatching a configured role. Every documented role remains present. `inherit-parent` and `auto` use the parent model natively and still count as one panel lane.

feature, refactoring: grok:grok-4.7@xhigh
bug-fix: codex:gpt-6.1-sol@high
perf-issue: codex:gpt-6.1-sol@high
hillclimb: claude:opus@medium
judgment and prose: claude:opus@medium
hardest tasks: claude:fable@medium
how explorer: grok:grok-4.7@xhigh
how explainer: claude:opus@medium
why investigators, synthesizer: inherit-parent
reflect tooling, judgment, divergent, synthesizer: inherit-parent
arena runners: codex:gpt-6.1-sol@high, claude:fable@low, grok:grok-4.7@xhigh, claude:opus@medium
arena cross-judge pool: codex:gpt-6.1-sol@high, grok:grok-4.7@xhigh, claude:opus@medium
swarm workers: claude:sonnet@high
architect runners: codex:gpt-6-astra@medium, claude:fable@medium, grok:grok-4.7@xhigh, claude:opus@medium, codex:gpt-6.1-sol@high
interrogate reviewers: codex:gpt-6.1-sol@high, grok:grok-4.7@xhigh, claude:opus@medium
codex writer sandbox: full-access
opencode writer sandbox: full-access
agy writer sandbox: full-access

Routing note for the hardest-tasks row. Send a unit there only when the writer must still
design something. A unit that applies a fixed contract goes to the feature row. The lead says
which in the decision trail.
