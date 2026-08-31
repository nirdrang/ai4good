# pstack model configuration

Provider-qualified per-role choices. Read the installed pstack provider-dispatch reference
before dispatching a configured role. Every documented role remains present. `inherit-parent`
and `auto` use the parent model natively and still count as one panel lane.

Written by setup on 2026-08-31 for ai4good. Efforts are PER ROLE by founder ruling, not
normalized per family; the decision record is
`C:\Users\nirdr\Downloads\ai4good\.claude\skills\work\pstack-model-selection.md`. The grok
probe failed at opencode's upstream on 2026-08-31 (three receipts); every other family
probed green. Re-probe grok before its first real use.

feature, refactoring: codex:opencode-go-responses/grok-4.6@xhigh
bug-fix: codex:gpt-5.6-sol@xhigh
perf-issue: codex:gpt-5.6-sol@xhigh
hillclimb: codex:gpt-5.6-sol@xhigh
judgment and prose: claude:claude-fable-5@high
hardest tasks: claude:claude-fable-5@max
how explorer: codex:gpt-5.6-sol@high
how explainer: claude:claude-fable-5@high
how critics: codex:gpt-5.6-sol@max, codex:opencode-go-responses/grok-4.6@xhigh, codex:opencode-go/deepseek-v4-flash@max, codex:opencode-go/glm-5.3-flash@max
why investigators, synthesizer: inherit-parent
reflect tooling, judgment, divergent, synthesizer: inherit-parent
arena runners: claude:claude-fable-5@max, codex:gpt-5.6-sol@max, codex:opencode-go-responses/grok-4.6@xhigh
arena cross-judge pool: codex:gpt-5.6-sol@max, codex:opencode-go-responses/grok-4.6@xhigh, codex:opencode-go/deepseek-v4-flash@max, codex:opencode-go/glm-5.3-flash@max, claude:claude-opus-5@max
swarm workers: codex:opencode-go-responses/grok-4.6@xhigh
architect runners: claude:claude-fable-5@max, codex:gpt-5.6-sol@max, codex:opencode-go-responses/grok-4.6@xhigh
interrogate reviewers: claude:claude-fable-5@max, codex:gpt-5.6-sol@max, codex:opencode-go-responses/grok-4.6@xhigh, codex:opencode-go/deepseek-v4-flash@max, codex:opencode-go/glm-5.3-flash@max
