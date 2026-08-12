# Goal evidence — AI4DEV-82 (window guard at the sitting boundary)

Written by the FIX AND GOAL executor, 2026-08-12. Chain, derived from the branch:
`AI4DEV-4 (the work skill)` > `AI4DEV-82 (window guard at the sitting boundary)`.

Every run below was made in this worktree, on the branch
`nirdrang/ai4dev-82-window-guard-at-the-sitting-boundary-park-before-the-wall`. The raw captures
sit in `artifacts/` and are the evidence; this file is a reading of them.

**One thing here is NOT green, and it is named as such**: step 10, the settings-proof probe. It is
recorded below with the exact failure text, and the reason that failure says nothing about the
hook entries.

---

## The state of each check the plan asks for

| check | expected at goal | measured | evidence |
|---|---|---|---|
| `loop/work/window-sim.ps1` | green, exit 0, boundary at 84/85 | **70 passed, 0 failed, exit 0** | `artifacts/goal-run-sim.txt` |
| step 1 capture-diff | identical before/after | **identical apart from the label line** | `artifacts/gauge-capture-before.txt`, `-after.txt` |
| `loop/drills/run-drills.ps1` | green, watchdog + twin-check, binding proven once | **74 of 74 green, exit 0; forced red gives exit 1** | `artifacts/goal-run-drills-suite.txt`, `artifacts/goal-run-fold-binding.txt` |
| watchdog drill standalone | green, four groups + fault injection | **65 passed, 0 failed, exit 0** | `artifacts/goal-run-watchdog.txt` |
| settings-proof probe | each entry shape observed firing | **ATTEMPTED ONCE, BLOCKED — see below** | `artifacts/settings-proof-run.txt`, `artifacts/settings-proof/` |
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

## 6. Step 10 — the settings-proof probe: ATTEMPTED ONCE, BLOCKED

**This is not a green and it is not recorded as one.**

The probe ran once, as ruled. The vendor was healthy: `claude` 2.1.228 present, five headless runs,
10–22 KB of transcript each, **every stderr log empty, no 529 and no vendor error of any kind**. So
the vendor-blocked contingency the gate 2 ruling pre-decided is NOT what happened.

The probe failed on its own defect, and its own precheck is what caught it:

```
        missing: C:\Users\nirdr\Downloads\ai4good\loop\work\window-gate.ps1
        missing: C:\Users\nirdr\Downloads\ai4good\loop\work\window-alarm.cmd
  FAIL  every command in the twin points at a file that exists
```

`settings-proof-probe.ps1:64` builds the path-substituted twin with `-replace`, which is a REGEX
operator. The pattern `'\\'` matches one backslash, but the replacement `'\\\\'` inserts FOUR,
because a .NET replacement string takes a backslash literally. So the probe searches the settings
file for `C:\\\\Users\\\\nirdr\\\\Downloads\\\\ai4good` while the file holds
`C:\\Users\\nirdr\\Downloads\\ai4good`. Nothing matches, and the "twin" is a byte-for-byte copy
carrying main-checkout paths.

**Why the run says nothing about the entries.** `window-gate.ps1` and `window-alarm.cmd` do not
exist in the main checkout yet, so those two entries pointed at absent files. The transcripts show
exactly that and nothing more: the Agent spawn SUCCEEDED (*"The spawn succeeded... replied with
exactly the word hello. No refusal occurred"*), and the deliberately failing tool call drew no
alarm. Recording that as "the entry did not fire" would be a false negative of the same class as
the one gate 2 caught in this very file. **Nothing of the sort is recorded.**

Per the fix-and-goal brief the probe gets ONE attempt, so it was not fixed and re-run; the defect
is reported to the orchestrator for a ruling. What remains unproven at runtime, and stays
unproven for now:

- that the deployed PreToolUse entry denies a spawn with its reason;
- that the alarm is model-visible after a successful call, and after a failing one
  (`PostToolUseFailure` dispatch);
- that `additionalContext` reaches the model on an allow.

The merge sitting's post-merge live check remains the other half of this proof, exactly as plan
D11 says.

**Two things the run DID prove first-hand, both about fixes ruled this gate.** They are worth
recording because each one is a before/after against a defect the panel found:

- `artifacts/settings-proof/windir-over/window-verdict.txt` now reads
  `ALARM WINDOW five_hour at 95% (line 85%), resets 22:05 - finish the current work item, commit,
  park.` The gate 2 verification recorded this same line, composed by this same probe, as
  `ALARM WINDOW Values at 95% ...`. The production-shape fix works.
- `artifacts/settings-proof/stamp.out.txt` reads
  `WINDOW ALARM  five_hour at 95% (line 85%), resets 22:05 - ...` — the prefix rewrite is clean,
  the phrase appears once, and no `ALARM WINDOW` survives it. The stamp case now runs against the
  over-the-line directory, so for the first time it is a case that COULD have failed.

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
