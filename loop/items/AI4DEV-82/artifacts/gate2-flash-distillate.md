SOURCE   loop/items/AI4DEV-82/artifacts/gate2-flash-output.md
REVIEWER opencode-go/deepseek-v4-flash, agent reviewer-flash, variant max (reader two of two)
COUNT    6 findings in source → 6 extracted
NOTES    none — count line "CODE REVIEW: 6 FINDINGS" matches the six findings extracted.

[1] severity: MEDIUM   loop/items/AI4DEV-82/artifacts/settings-proof-probe.ps1:206
    claim: "The probe's headless-stamp check reuses the UNKNOWN-case transcript, where a `WINDOW ALARM` line is impossible, so the headless evidence channel is dead and the recorded "UserPromptSubmit may not fire headless" limit can be a false negative."
    unverified-runtime-claim: no
    raw: gate2-flash-output.md finding [1]

[2] severity: MEDIUM   loop/drills/window-watchdog-drill.ps1:365-375
    claim: "Fault (b) deletes `window-verdict.txt` before the corrupt-snapshot assertions, so "the per-tool alarm stays silent, as decided" is exercised via the *missing-file* path, not the *UNKNOWN-line* path the decision (gate1-rulings [3] point 3) actually specifies — and the production-reachable state would behave differently."
    unverified-runtime-claim: no (the drill-side defect); the crash-between-writes reachability is reasoned, not measured
    raw: gate2-flash-output.md finding [2]

[3] severity: MEDIUM   loop/work/window-alarm.cmd:22 and loop/drills/window-watchdog-drill.ps1:187,209,378
    claim: "The cmd's fallback snapshot directory is a second copy of the path formula that nothing exercises or guards, and the drill's own live-path strings are two more copies; the final "nothing wrote outside" assertion checks only the env var, proving nothing about writes."
    unverified-runtime-claim: no
    raw: gate2-flash-output.md finding [3]

[4] severity: LOW   loop/work/stamp-hook.ps1:210
    claim: "The `-replace '^ALARM WINDOW '` coupling to `Format-WindowVerdictLine`'s composition is unguarded; a one-character drift double-prints or half-prints the founder's alarm line."
    unverified-runtime-claim: no
    raw: gate2-flash-output.md finding [4]

[5] severity: LOW   .claude/skills/work/shared-invariants.md:48
    claim: ""None of them can … message anyone" is literally false, and the "decide nothing" sentence sits beside a gate that does refuse spawns — the wording needs naming, not just assertion."
    unverified-runtime-claim: no
    raw: gate2-flash-output.md finding [5]

[6] severity: LOW   loop/items/AI4DEV-82/plan.md:208-236 (steps 6, 8, 10, 12)
    claim: "The plan marks steps 6, 8, 10 and 12 "Done" (overhead medians measured and recorded; fold-binding forced-red proof recorded in `goal-evidence.md`; probe evidence; `goal-evidence.md` committed), but none of those artifacts exist at this commit."
    unverified-runtime-claim: no
    raw: gate2-flash-output.md finding [6]
