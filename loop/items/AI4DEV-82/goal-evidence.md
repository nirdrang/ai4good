# Goal evidence — AI4DEV-82 (window guard at the sitting boundary)

Written by the FIX AND GOAL executor, 2026-08-12. Chain, derived from the branch:
`AI4DEV-4 (the work skill)` > `AI4DEV-82 (window guard at the sitting boundary)`.

Every run below was made in this worktree, on the branch
`nirdrang/ai4dev-82-window-guard-at-the-sitting-boundary-park-before-the-wall`. The raw captures
sit in `artifacts/` and are the evidence; this file is a reading of them.

**One thing here is NOT green, and it is named as such**: two of the twelve settings-proof checks.
The spawn gate, the UNKNOWN warning channel and the founder stamp are all proven firing at
runtime. **Both alarm entries — `PostToolUse` and `PostToolUseFailure` — delivered nothing to the
model**, in runs where a tool call really happened and every other entry in the same settings file
fired. That is reported to the orchestrator as a finding; it is recorded here as what was
observed, and no conclusion is drawn about the cause beyond what the evidence carries.

---

## The state of each check the plan asks for

| check | expected at goal | measured | evidence |
|---|---|---|---|
| `loop/work/window-sim.ps1` | green, exit 0, boundary at 84/85 | **70 passed, 0 failed, exit 0** | `artifacts/goal-run-sim.txt` |
| step 1 capture-diff | identical before/after | **identical apart from the label line** | `artifacts/gauge-capture-before.txt`, `-after.txt` |
| `loop/drills/run-drills.ps1` | green, watchdog + twin-check, binding proven once | **74 of 74 green, exit 0; forced red gives exit 1** | `artifacts/goal-run-drills-suite.txt`, `artifacts/goal-run-fold-binding.txt` |
| watchdog drill standalone | green, four groups + fault injection | **65 passed, 0 failed, exit 0** | `artifacts/goal-run-watchdog.txt` |
| settings-proof probe | each entry shape observed firing | **10 of 12 — gate, UNKNOWN warning and stamp PROVEN; both alarm entries did NOT deliver** | `artifacts/settings-proof-run.txt`, `artifacts/settings-proof/` |
| overhead numbers | measured; alarm median ≤ 100 ms | **alarm 35.5 ms — target MET; statusline delta 82.4 ms** | `artifacts/overhead-measurement.txt` |
| CI required check | green on the PR head | not this role's step — the merge sitting pins it | — |

---

## 1. The sim, the drill and the suite

`window-sim.ps1` — 70 assertions, 0 failed, exit 0. It carried 60 before this sitting; the ten new
ones are the library's two snapshot shapes, both halves of the unusable-timestamp rule, the exact
`ALARM WINDOW ` prefix the stamp rewrites, the alarm batch file's copy of the path formula, and
`window-wait.ps1` run at 84 and 85 on its OWN default.

`window-watchdog-drill.ps1` standalone — 65 assertions, 0 failed, exit 0. It carried 54 before;
the eleven new ones are the mutex contention case, the UNKNOWN-LINE alarm path with the
missing-file path kept separately, the stamp's prefix pinned at both ends, and the live-directory
fingerprint.

`run-drills.ps1` — **74 of 74 assertions green, exit 0**, including both folded guards:

```
PASS  [twin-guard] orchestrator twins are in sync (edit both or neither)
PASS  [window-watchdog] the usage-window watchdog holds at every checkpoint

74 of 74 assertions green
All control hand-offs held.
```

## 2. The fold BINDS — proven by forcing a red, not by reading the code

The plan's step 8 says the fold must bind, and the way to know is to break it once. One extra
assertion, hard-coded false, was added to the watchdog drill for a single run and reverted
immediately:

```
        FAIL  [guard] FORCED RED - fold-binding proof, reverted in the same sitting
PASS  [twin-guard] orchestrator twins are in sync (edit both or neither)
FAIL  [window-watchdog] the usage-window watchdog holds at every checkpoint
73 of 74 assertions green
RED - the hand-offs above broke.

EXIT CODE: 1
```

Three things this shows at once: the folded drill's red reaches the suite, the suite EXITS 1 rather
than printing a failure and exiting 0, and the failing line is echoed up so the red names itself
without a second run. The tree was then restored (`git checkout --`) and re-measured: **74 of 74,
exit 0**. Full capture in `artifacts/goal-run-fold-binding.txt`.

## 3. The capture-diff for step 1

The library extraction had to change nothing about the gauge CLI's surface. The before and after
captures over the fixed synthetic set differ in exactly one line, and it is the label the capture
script writes about itself:

```
# label: BEFORE the window-lib extraction (gauge default PauseAt=90)
# label: AFTER the window-lib extraction (gauge default PauseAt=90)
```

Every other byte — every `-Json` payload, every human line, every `-ExitOnReady` exit code — is
identical.

## 4. The two overhead numbers

Medians of 20 invocations each, one warm-up discarded, `artifacts/overhead-measurement.txt`, script
at `artifacts/overhead-measure.ps1`.

**The alarm hook — paid after EVERY tool call, in every agent, forever.**

| state | median | min | max |
|---|---|---|---|
| verdict `OK` (the normal case, silent, exit 0) | **35.5 ms** | 31.4 | 42.1 |
| verdict `ALARM` (exit 2, line on stderr) | 35.8 ms | 32.2 | 47.9 |
| no verdict file at all | 20.0 ms | 18.3 | 22.5 |

**Target: median at or under 100 ms. MET, with a factor of about three to spare.** The design
choice the plan's D5 argued from cost is confirmed by measurement: a batch file costs about 35 ms
where the `powershell -NoProfile` it avoids was estimated at 200–400 ms.

**The status line — paid once per refresh.**

| variant | median |
|---|---|
| with the sensor block (verdict + mutex + two writes) | 530.4 ms |
| snapshot write only (the shape before this item) | 448.0 ms |
| no sensor block at all | 405.4 ms |
| **what THIS ITEM added to a refresh** | **82.4 ms** |
| what the whole sensor block costs | 125.0 ms |

A PowerShell process start dominates every absolute figure, so the deltas are the honest numbers.
The 82.4 ms is the one this item is answerable for: composing the verdict, taking the named mutex,
and writing the second file.

**Two wrong versions of this measurement were thrown away before these numbers, and the script now
carries the checks that caught them.** The first reported blank medians, because its reporting
function both printed its line and returned it, so the caller captured the printed line. The second
reported a delta of 168 ms against twins that had CRASHED: a twin written to `TEMP` resolves
`$PSScriptRoot` to `TEMP`, both of its dot-sources fail, and the whole status line falls into its
own last-resort catch — it was timing a script that gave up. Four sanity checks now stand between
the cut and the numbers, one of which stops the run outright, and they all print green in the
capture.

**The pre-item shape was reconstructed by cutting the current file, never by running the pre-item
file.** That version did not honour `AI4GOOD_WINDOW_DIR` — the override arrived with this item — so
twenty-one runs of it would have written synthetic readings into the founder's live snapshot. That
is this item's own recorded incident, and it was not worth repeating for a number.

## 5. The settings wiring, as committed

`.claude/settings.json`, verbatim, the three entries this item deploys plus the one it edits:

```json
"PreToolUse":  [ { "matcher": "Agent",
                   "hooks": [ { "type": "command",
                     "command": "powershell -NoProfile -ExecutionPolicy Bypass -File \"C:\\Users\\nirdr\\Downloads\\ai4good\\loop\\work\\window-gate.ps1\"" } ] } ]
"PostToolUse": [ { "hooks": [ { "type": "command",
                     "command": "\"C:\\Users\\nirdr\\Downloads\\ai4good\\loop\\work\\window-alarm.cmd\"" } ] } ]
"PostToolUseFailure": [ { "hooks": [ { "type": "command",
                     "command": "\"C:\\Users\\nirdr\\Downloads\\ai4good\\loop\\work\\window-alarm.cmd\"" } ] } ]
"UserPromptSubmit":    [ { "hooks": [ { "type": "command",
                     "command": "powershell -NoProfile -ExecutionPolicy Bypass -File \"C:\\Users\\nirdr\\Downloads\\ai4good\\loop\\work\\stamp-hook.ps1\"" } ] } ]
```

The JSON parses, the paths are absolute as the file already does it, the alarm carries no matcher
so it covers every tool, and the gate's matcher is `Agent`. The paths are MAIN-checkout paths and
therefore live only after the merge — stated plainly in plan step 9, and the reason the probe below
exists at all.

## 6. Step 10 — the settings-proof probe: RE-RUN DONE, 10 of 12, two entries did not deliver

The first attempt was void — the probe's own twin was wrong, described at the end of this section.
The orchestrator ruled that an absent signal is not a red one and authorised ONE re-run after a
one-line repair. The precheck was verified BEFORE any headless case ran, as the ruling requires:

```
  PASS  the twin parses as JSON
  PASS  every command in the twin points at a file that exists
```

All six commands now resolve into this worktree, including `window-gate.ps1` and
`window-alarm.cmd`, which do not exist in the main checkout at all. **Result: 10 passed,
2 failed.** Raw transcripts in `artifacts/settings-proof/`, summary in
`artifacts/settings-proof-run.txt`.

### What is now PROVEN at runtime

**The spawn gate — the item's core mechanism — fires and says everything it must.**

```
  PASS  the deny reached the model
  PASS  the deny reason names the window
  PASS  the deny reason gives the percentage
  PASS  the deny reason gives the reset time
  PASS  the deny reason carries the parking choreography
```

**`additionalContext` DOES reach the model on an allow.**

```
  PASS  an unreadable sensor does not halt spawns
  PASS  and the warning is visible in the transcript (additionalContext reaches the model)
```

D11's contingency for this — fall back to `systemMessage` only and record a reduced guarantee —
**is not needed.** The full guarantee stands.

**`UserPromptSubmit` DOES fire headless**, carrying the founder line:

```
  PASS  the stamp alarm appeared in the headless transcript
```

The limit this item feared and nearly recorded as measured — "UserPromptSubmit may not fire
headless" — **is disproven**. It is only knowable because the gate 2 fix gave the stamp case its
own over-the-line run; against the old UNKNOWN transcript this could never have passed.

### What did NOT deliver, stated as what was observed

```
  FAIL  the alarm line reached the model after a successful call
  FAIL  the alarm line reached the model after a failing call (PostToolUseFailure is dispatched)
```

**Both alarm entries produced nothing — not just the failure one.** This is reported to the
orchestrator as a finding, not resolved here. What is established, and what is not:

Established:
- A tool call really happened in both runs. Each transcript carries a `PowerShell` `tool_use`, and
  the successful one carries `tool_result` `"stdout":"ok"`. This is NOT the earlier case where the
  model answered without using a tool.
- The synthetic reading really was over the line and really did reach the child processes: in the
  SAME runs the gate denied on `five_hour` at 95% and the banner printed the 95% line. So
  `AI4GOOD_WINDOW_DIR` was inherited and `window-verdict.txt` was in place.
- `window-alarm.cmd` works when invoked exactly as `.claude/settings.json` spells it. Measured
  again during this diagnosis: `cmd /c "<path>"` prints
  `ALARM WINDOW five_hour at 95% ...` on stderr and exits 2.
- Every OTHER entry in the same twin fired: PreToolUse, UserPromptSubmit and SessionStart.
- The five `ALARM` strings in the alarm-success transcript are all `WINDOW ALARM` from the banner
  and the stamp. The per-tool alarm's own `ALARM WINDOW` line appears nowhere.

NOT established, and not guessed at:
- Whether `PostToolUse` and `PostToolUseFailure` were dispatched at all and the exit-2 stderr was
  simply not surfaced to the model in a headless `stream-json` run, OR whether the entries never
  ran. Separating these needs a diagnostic hook entry, which would no longer be the deployed shape
  — the one thing this probe is built not to do. The `hook_name` events in the transcripts cannot
  settle it either: only `SessionStart` appears there, including in the `deny` run where the hook
  demonstrably worked, so that field is not evidence of firing.

**D11's PostToolUseFailure contingency does not cleanly apply.** It says to drop that ONE entry and
keep the rest, on the assumption that the success event worked. Here neither delivered, so the
contingency's premise does not hold. That is the orchestrator's call, not this executor's.

### Why the first attempt was void

`settings-proof-probe.ps1:64` built the twin with `-replace`, which is the REGEX operator: the
pattern `'\\'` matches one backslash, but a .NET replacement string takes a backslash literally, so
`'\\\\'` inserts FOUR. The probe searched for `C:\\\\Users\\\\nirdr\\\\Downloads\\\\ai4good` while
the file holds `C:\\Users\\nirdr\\Downloads\\ai4good`. Nothing matched, the twin was a byte-for-byte
copy carrying main-checkout paths, and two entries pointed at files absent from main — so the
Agent spawn simply succeeded. The vendor was healthy throughout (five runs, every stderr log
empty, no 529), so that was never the pre-decided vendor contingency. The repair is one line, plain
string `.Replace('\','\\')` on both operands.

### Two gate 2 fixes proven first-hand by the probe itself

Both runs, before and after the repair, confirm fixes the panel found:

- `artifacts/settings-proof/windir-over/window-verdict.txt` reads
  `ALARM WINDOW five_hour at 95% (line 85%), resets <HH:mm> - finish the current work item,
  commit, park.` The gate 2 verification recorded this same line, composed by this same probe, as
  `ALARM WINDOW Values at 95% ...`. The production-shape fix works.
- The stamp line reads `WINDOW ALARM  five_hour at 95% ...` — the prefix rewrite is clean, the
  phrase appears once, and no `ALARM WINDOW` survives it.

### What still needs the merge sitting

The alarm entries are unproven, so the post-merge live check is now the instrument for them, and
it is the only one left. The other three entry shapes no longer depend on it.

## 7. The live snapshot was never touched

The item's recorded incident is a synthetic 95% reaching the founder's live reading, so this was
checked at every stage rather than assumed.

- `%LOCALAPPDATA%\ai4good-build\nirdrang-ai4good\rate-limits.json`, SHA256
  `415B2D6D7FD6AD07F928FA6931BAE43A66B8432E8068C3131D4DB949B43A55BD` — **identical before and after
  every run this sitting**, including the overhead measurement and the probe.
- Its content is a real reading: a real session id, `five_hour` 54%, `seven_day` 67%. It carries
  neither the `window-watchdog-drill` marker nor the `settings-proof-probe` marker.
- `window-verdict.txt` does not exist in the live directory, which confirms the founder session is
  still running the pre-merge sensor.
- No canary tripped at any point, and the drill's own live fingerprint assertions are green in
  every capture.
