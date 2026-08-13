# Window guard drill record — 2026-08-13

The stop line moves to 85 percent, the gauge stops failing open on an undatable reading, and the
drill harness now binds its own guards. This record holds the measurements that show each change
works. Every reading below is synthetic and written to a scratch file; the live snapshot the
status line maintains was never touched, and no tokens were spent on the guard itself.

Machine: Windows 11, PowerShell 5.1. Worktree `.claude/worktrees/ai4dev-82` at branch
`nirdrang/ai4dev-82-window-guard-the-coordinator-stops-the-workflow-at-85-and`.

## 1. The stop line and the resume, end to end

`powershell -NoProfile -File loop/work/window-sim.ps1` — **80 passed, 0 failed**, 00:38 local.

The two new sections:

- **Section 9, one number in three places.** The simulation reads the default `PauseAt` out of
  `window-gauge.ps1` and `window-wait.ps1`, and the number out of `shared-invariants.md`, and
  asserts all three are 85. Every other check in the file calls the gauge with no `-PauseAt`, so
  the default is what they measured.
- **Section 10, the coordinator sequence.** One run of the real scripts: the item works at 62
  percent, the window crosses to 87 percent, the gauge says `PAUSE` and names `five_hour`, the
  parked item leaves a note, `window-wait.ps1` is armed as a background job against the reset
  time in that same reading, the job holds for the first three seconds, then exits 0 when the
  stated reset passes. On the wake the gauge is re-read: at 91 percent it stops again and the
  item stays parked; at 4 percent it releases, and the note is consumed once.

## 2. The gauge failed open on an undatable reading — measured, then fixed

Reading: `{"capturedAt":"not-a-date", five_hour 12%}`.

| gauge | verdict |
|---|---|
| on `main`, before the fix | `OK  - five_hour at 12%` |
| on this branch | `UNKNOWN - the reading carries no usable capture time…` |

A corrupt file holding a low number scored `OK` for ever, so the guard was off and nothing said
so. Over the line an undatable reading is now `PAUSE`, because a window only climbs.

## 3. The drill harness did not bind its own guard — measured, then fixed

One line was appended to `.claude/agents/orchestrator-opus.md` to drift the twins.
`twin-check.ps1` reported `TWINS DRIFTED`, exit 1. The same drift was then put to both harnesses:

| harness | printed | summary | exit |
|---|---|---|---|
| as it is on `main` | `FAIL [twin-guard]` | `72 of 73 assertions green` … `All control hand-offs held.` | **0** |
| this branch | `FAIL [twin-guard]` | `73 of 74 assertions green` … `RED - the hand-offs above broke.` | **1** |

The failure list was computed before the guard ran, so the red printed and the script still
exited 0. Both guards now run before the list. The drift was reverted and `twin-check.ps1`
returned to `SYNCED`.

## 4. The standing suite, clean

`powershell -NoProfile -File loop/drills/run-drills.ps1` — **74 of 74 assertions green**,
`All control hand-offs held.`, exit 0, at 2026-08-13 00:49 local. The window checks now run
inside this suite as the `window-guard` assertion, so nobody has to remember them.

## What this does not prove

The synthetic readings are shaped the way we believe the real payload is shaped. A change in the
provider's payload would sail straight through this green; only the live reading covers that.

And the guard works while the founder is present. Only founder-typed turns refresh the sensor, so
the reading ages while nobody types, the verdict goes `UNKNOWN` past the staleness limit, and
`UNKNOWN` reports without halting. Nothing here covers an unattended night.
