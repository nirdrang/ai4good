# CODE REVIEW â€” AI4DEV-82 (window guard at the sitting boundary), pinned commit

Reviewed against `loop/items/AI4DEV-82/plan.md` (amended post-gate-1) and the branch diff from base 390042c. I read every changed file in the declared territory, the gate-1 rulings, the draft rulings, the incident record, the capture-diff artifacts, the probe script, and the contract amendments.

## Findings

**Severity scale (mine):** HIGH = a guard can fail open or the item's core claim is unproven; MEDIUM = an assertion or evidence channel proves less than its claim, or a drift can silently disable a guard; LOW = wording/record/documentation that could mislead a reader or the next sitting.

---

**[1] severity: MEDIUM**    `loop/items/AI4DEV-82/artifacts/settings-proof-probe.ps1:206`
- **claim:** The probe's headless-stamp check reuses the UNKNOWN-case transcript, where a `WINDOW ALARM` line is impossible, so the headless evidence channel is dead and the recorded "UserPromptSubmit may not fire headless" limit can be a false negative.
- **why it matters:** `$c` at line 206 is still case 4's run (window dir `windir-unknown`, whose `rate-limits.json` is corrupt and which has **no** verdict file). In that run the stamp verdict is UNKNOWN (no `WINDOW ALARM`), the gate's warning is `WINDOW GUARD: â€¦ UNKNOWN â€¦` (no `WINDOW ALARM`), and the alarm is silent (missing verdict file). `$headlessStamp` is therefore provably always `$false`; the direct-invocation fallback always runs. Consequence: even if UserPromptSubmit *does* fire headless, the probe records the limit "may not fire headless" in `goal-evidence.md` â€” a false negative that the fix-and-goal sitting will commit as fact. Plan step 10's claim "assert its alarm line in the headless run if UserPromptSubmit fires headless" is not implemented as written â€” the code never looks at a run where the line could appear (cases 1â€“3 use the over-line dir). The fallback keeps the stamp assertion green, so the item's claim survives; the recorded limit is what is wrong.
- **unverified-runtime-claim: no** â€” the impossibility is static (derivable from the dir contents and the three hooks' outputs). Whether UserPromptSubmit fires headless at all is runtime, but the finding is that the probe cannot observe it either way.

---

**[2] severity: MEDIUM**    `loop/drills/window-watchdog-drill.ps1:365-375`
- **claim:** Fault (b) deletes `window-verdict.txt` before the corrupt-snapshot assertions, so "the per-tool alarm stays silent, as decided" is exercised via the *missing-file* path, not the *UNKNOWN-line* path the decision (gate1-rulings [3] point 3) actually specifies â€” and the production-reachable state would behave differently.
- **why it matters:** The decided behavior is "a verdict line reading `UNKNOWN â€¦` â†’ alarm silent" (findstr no-match). No case in the drill ever writes an UNKNOWN verdict line and invokes the alarm â€” the sensor-composed lines in groups 1/2 are ALARM or OK, group 3 writes `OK`, fault (b) removes the file. The green therefore passes for the wrong mechanism. Worse, the corrupt-snapshot state as the drill builds it (verdict file absent) is not the state production produces: a crash between the sensor's two writes leaves the *previous refresh's* verdict line (possibly `ALARM â€¦`) beside a corrupt snapshot, and in that state the alarm exits 2 â€” the drill's assertion "alarm = silent on a corrupt snapshot" would fail to match live behavior without the deletion. A future change to the cmd that exits 2 on UNKNOWN lines would sail through this drill green.
- **unverified-runtime-claim: no** for the drill behavior (code); the crash-between-writes reachability is reasoned, not measured â€” the fix-and-goal executor could confirm by killing a sensor mid-refresh, but the drill-side defect stands without it.

---

**[3] severity: MEDIUM**    `loop/work/window-alarm.cmd:22` and `loop/drills/window-watchdog-drill.ps1:187,209,378`
- **claim:** The cmd's fallback snapshot directory is a second copy of the path formula that nothing exercises or guards, and the drill's own live-path strings are two more copies; the final "nothing wrote outside" assertion checks only the env var, proving nothing about writes.
- **why it matters:** The drill always sets `AI4GOOD_WINDOW_DIR`, so the cmd's `%LOCALAPPDATA%\ai4good-build\nirdrang-ai4good` fallback â€” the path that runs in every live session â€” is never read by any test. If the library's formula changes (folder rename, different base), the sensor writes the new path, the un-overridden alarm reads the old one, the file "does not exist", the alarm goes silent, and the per-tool guard stops guarding with nothing red anywhere. The same drift blinds the two live-file guards: `$live` (line 187) and the canary path (line 209) are hard-coded copies, so a formula change makes the canary watch a stale path and miss live contamination. Plan D7's "exactly one path formula" is therefore overstated â€” there are three copies. Separately, the guard assertion at 378-379 ("nothing in this run wrote outside the drill directory") only compares the env var to itself â€” a tautology that would pass even if a component had written the live files (the real protection is the canary/abort, which is coherent only while the formula string holds).
- **unverified-runtime-claim: no**

---

**[4] severity: LOW**    `loop/work/stamp-hook.ps1:210`
- **claim:** The `-replace '^ALARM WINDOW '` coupling to `Format-WindowVerdictLine`'s composition is unguarded; a one-character drift double-prints or half-prints the founder's alarm line.
- **why it matters:** The stamp strips the library's literal prefix and re-prefixes with `WINDOW ALARM  `. If the composition drifts (e.g., `ALARM WINDOW:` or a double space), the founder's line reads `WINDOW ALARM  ALARM WINDOW: â€¦` or loses the window name. No assertion pins the regex to the composition: drill g4 pins the *file* line against the library, but nothing compares the stamp's stripped output to `(line minus prefix)`. The failure mode is cosmetic-but-load-bearing (it is the founder's alarm channel), and the direction of drift is silent.
- **unverified-runtime-claim: no**

---

**[5] severity: LOW**    `.claude/skills/work/shared-invariants.md:48`
- **claim:** "None of them can â€¦ message anyone" is literally false, and the "decide nothing" sentence sits beside a gate that does refuse spawns â€” the wording needs naming, not just assertion.
- **why it matters:** The gate's deny reason *is* a message to the denied actor (measured this item: it reaches the denied actor's transcript), the alarm's stderr is the documented model-visible channel, and the stamp prints to the founder â€” "none can message anyone" contradicts the item's own design and D4's "the machinery speaks at the moment it acts". If "message" means relay/flow-line communication, the text should say that. The authority sentence is a judgment call â€” "they decide nothing" for a PreToolUse deny is defensible only because the line is the founder's standing decision, and the text does acknowledge "what the gate refuses is new work starting"; but "every judgement about what to do next is still the coordinator's" papers over that the coordinator can no longer choose to spawn at/over the line. Plan D9's claim that the wording keeps "the coordinator decides" literally true is strained rather than false.
- **unverified-runtime-claim: no**

---

**[6] severity: LOW**    `loop/items/AI4DEV-82/plan.md:208-236` (steps 6, 8, 10, 12)
- **claim:** The plan marks steps 6, 8, 10 and 12 "Done" (overhead medians measured and recorded; fold-binding forced-red proof recorded in `goal-evidence.md`; probe evidence; `goal-evidence.md` committed), but none of those artifacts exist at this commit.
- **why it matters:** `goal-evidence.md` is absent from the tree (only AI4DEV-81 has one); no overhead-measurement record exists; the probe evidence directory (`settings-proof/`) does not exist; the forced-red binding proof is unrecorded. `PHASE-STATE.md:68-69` correctly lists all four as deliberately deferred to the fix-and-goal sitting â€” so the plan, which this review judges against, overstates done-state against the tree. A reader of the plan alone would believe the verification table's rows ("overhead numbers: measured and recorded"; "settings-proof probe: observed firing") are satisfied. Low severity because PHASE-STATE is the corrective, but the plan is the authoritative spec and should say "deferred", not "Done".
- **unverified-runtime-claim: no**

---

## Areas attacked and found clean (stated once, not findings)

- **Gate JSON shape** â€” the `hookSpecificOutput.permissionDecision/permissionDecisionReason/additionalContext` nesting plus top-level `systemMessage` matches the shape the record itself verified against the fetched hooks docs (gate1-rulings [3]; hook-measurement.md:33-34), and `Write-Decision` emits exactly that. The *runtime* honoring of `additionalContext` on an allow and the dispatch of `PostToolUseFailure` remain verify-first: they are precisely the probe's pre-decided contingencies, and the probe is mandatory at fix-and-goal. A green drill cannot settle these â€” correctly not claimed to.
- **Snapshot-shape compatibility** â€” in every path, `rateLimits` is a `PSCustomObject` from `ConvertFrom-Json` (statusline's stdin parse and the file read alike); the sensor's outer `[ordered]` hashtable is accessed only via property-style member access, which behaves identically on both shapes, and the `PSObject.Properties.Name` enumeration runs on the PSCustomObject in all paths. No incompatibility found by inspection.
- **Sensor write-order invariant** â€” verdict first, snapshot second, one try block; a verdict-write failure skips the snapshot write; the only divergence (verdict newer than snapshot) is the acknowledged conservative residual. No path found where the snapshot is written and the verdict is not.
- **findstr mechanics** â€” the drill itself writes the verdict file in the identical encoding (UTF-8 no BOM, LF-only) and its green run exercises `findstr /b`, `1>&2`, errorlevel 0/1/2 handling and the quoted path â€” empirically settled. Missing/empty/error cases all exit 0 silently as designed.
- **Settings entries** â€” no-matcher PostToolUse/PostToolUseFailure entries match the documented "runs for all tools" semantics; `matcher: "Agent"` matches the measured spawn tool name; the bare quoted `.cmd` command string is a valid cmd invocation. The main-checkout absolute paths are declared live-only-post-merge in both the plan and PHASE-STATE, and the probe's twin substitutes the worktree prefix â€” with an existence check that fails red, not silently, if the prefix ever changes.
- **Env-override leak directions** â€” `AI4GOOD_WINDOW_DIR` is process-scoped in the drill (set in the drill's own process, inherited by its children, cleared in `finally`); a killed drill dies with its environment, so no live session can inherit it. The gauge honoring the override (deviation E2) is covered by the capture-diff.
- **`$failed` fold binding** â€” computed at `run-drills.ps1:321` after both folded asserts (307, 314); a watchdog red now binds exit 1.
- **Capture-diff** â€” the before/after artifacts are byte-identical, confirming the extraction claim for the CLI surface.

Nothing outside this item's territory was found defective; the above findings are all inside the declared path set.

CODE REVIEW: 6 FINDINGS