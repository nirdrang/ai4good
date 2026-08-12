Severity scale: HIGH = core safeguard can fail or be falsely certified; MEDIUM = promised compatibility can regress undetected.

[1] severity: HIGH    loop/items/AI4DEV-82/plan.md:80
    claim: Wiring the alarm only to `PostToolUse` cannot provide an alarm after every tool call because failed calls fire `PostToolUseFailure` instead.
    why it matters: If usage crosses 85% and the actor’s next MCP or shell tool fails, `window-alarm.cmd` never runs, so the actor receives no alarm within that call while every planned drill remains green. The [Claude Code hook lifecycle](https://code.claude.com/docs/en/hooks#hook-events) distinguishes successful and failed calls explicitly.
    unverified-runtime-claim: no

[2] severity: MEDIUM    loop/items/AI4DEV-82/plan.md:114
    claim: A green `window-sim.ps1` does not prove the promised behavior-neutral extraction of all JSON fields, human output, and exit behavior.
    why it matters: The simulation reads only selected JSON properties and discards the gauge’s human output during `-ExitOnReady`; the refactor could omit `readingAgeMin`, alter `windows[]` fields, or lose the `WINDOW` header and per-window/reset lines while step 1 still passes, breaking the coordinator’s human-facing FLOW/PULSE reads.
    unverified-runtime-claim: no

[3] severity: HIGH    loop/items/AI4DEV-82/plan.md:67
    claim: The planned degraded-state channels do not guarantee that a running subagent learns that the sensor is `UNKNOWN`.
    why it matters: The per-tool alarm is deliberately silent on `UNKNOWN`, subagents receive no `UserPromptSubmit` stamp, and the spawn gate uses only `systemMessage`, which the [hook output contract](https://code.claude.com/docs/en/hooks#json-output) describes as a user-facing warning rather than context for Claude; an executor can therefore continue with a broken sensor without hearing the required loud warning. Internal gate errors compound this by failing open without any promised warning. Verify first by returning the planned `UNKNOWN` output from a real nested Agent hook and inspecting both the spawning actor’s context and the visible UI.
    unverified-runtime-claim: yes

[4] severity: HIGH    loop/items/AI4DEV-82/plan.md:61
    claim: The separately written snapshot and verdict files have no recovery or freshness mechanism preventing an old verdict from surviving a partial sensor-write failure.
    why it matters: If `rate-limits.json` updates to 85% but the subsequent verdict write fails, the fresh gate denies while the alarm and stamp can keep reading an old `OK` indefinitely; the inverse failure can produce an ALARM beside an old snapshot. Step 4 tests only successful writes, so group 4 cannot establish checkpoint consistency under the plan’s own never-throw failure path. Verify first by independently faulting each write and inspecting both files and all three checkpoint results.
    unverified-runtime-claim: yes

[5] severity: HIGH    loop/items/AI4DEV-82/plan.md:96
    claim: The selected `twin-check.ps1` folding pattern does not make a folded drill failure affect `run-drills.ps1`’s exit code.
    why it matters: The current harness computes `$failed` at `loop/drills/run-drills.ps1:297`, then invokes and records the twin assertion at lines 300–301; copying that pattern for the watchdog permits its assertion to print `FAIL` while the stale `$failed` collection remains empty and the harness exits 0.
    unverified-runtime-claim: no

[6] severity: HIGH    loop/items/AI4DEV-82/plan.md:144
    claim: No executable plan step proves that Claude Code actually loaded and applied the three deployed settings entries.
    why it matters: Step 9 ends when JSON parses and command files exist, while the drills invoke scripts directly and the measurement used separate probe settings or a pre-existing hook; a wrong event entry, matcher, command, or failed settings reload can therefore leave the watchdog inert while every listed goal check passes. “The merge sitting verifies” has no numbered step, done-criterion, or required evidence record, so it is not a gate under this plan’s contract.
    unverified-runtime-claim: no

PLAN REVIEW: 6 FINDINGS