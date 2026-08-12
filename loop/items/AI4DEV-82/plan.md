# Plan — AI4DEV-82 (window guard at the sitting boundary), REDUCED per the scope reset

This plan REPLACES the pre-reset plan (git history at `5b2940e` holds it). Authority: the
founder's scope reset of 2026-08-12, recorded verbatim in `PHASE-STATE.md` and in the Linear
description. One actor — the coordinator — reads the gauge and executes pause and resume. All
hook machinery comes out. Delete, do not adapt.

Ceremony for this item, by the same ruling: no reviewer gates, no audit panel, no audit
sitting. Plan → build → drills green → pull request → merge. CI still gates the merge.

## Decisions

- **D1 — the library dies with the hooks.** `window-lib.ps1` existed so hooks could compute the
  verdict in-process. With the hooks gone it has one caller. The gauge returns to its
  self-contained form: restore `window-gauge.ps1` from `origin/main`, then apply exactly two
  changes (the 85 line, and D4).
- **D2 — restore, never trim.** `statusline.ps1` (verdict-first write, mutex) and
  `stamp-hook.ps1` (prompt alarm) return to their `origin/main` versions verbatim. Trimming the
  branch versions by hand risks keeping a fragment of the deleted design.
- **D3 — the drills harness folds `window-sim.ps1`.** The watchdog drill tests the four hook-era
  parts and nothing else; it is deleted whole. `window-sim.ps1` already covers what the reset
  names: verdicts at, over and under 85, the stale rules, and the wait's park path — all on
  synthetic snapshots, never the live one. It self-reports (exit 1 on any red), so it folds into
  `run-drills.ps1` exactly where the watchdog drill sat. The assert-ordering repair in
  `run-drills.ps1` (every Assert before `$failed` is computed) stays — it fixes the twin guard
  and is not hook machinery.
- **D4 — one kept hardening: a reading that cannot be dated is never current.** On main, an
  unusable `capturedAt` skips the staleness rules, so a corrupt-but-low reading scores OK. That
  violates the stale rule the reset itself states ("a stale-low reading is UNKNOWN, never OK").
  The rule ports into the restored gauge: age unparseable → over the line with an unreset window
  is PAUSE (the floor it still proves), otherwise UNKNOWN, with a reason naming `capturedAt`.
- **D5 — the prior ceremony record leaves the tree.** The gate and audit prompts, rulings,
  goal evidence and the whole `artifacts/` directory (about 28K lines) describe and claim
  delivery of code this ruling deletes. Carry-forward fact 2 forbids any file claiming a hook or
  alarm works; an audit record about code that is not in the tree is a record-is-false hazard.
  Provenance lives in git history at `5b2940e` — the same move the PHASE-STATE reset section
  already makes for the prior park history. Kept: `PHASE-STATE.md`, this plan, `pr-body.md`
  (rewritten).
- **D6 — proportionality: plan and build in one sitting.** The build is deletion, restoration
  from main, and small dictated edits. One opus executor types it; the orchestrator stays for
  the report and verifies the drill evidence.
- **D7 — the sensor refreshes only on founder-typed turns (coordinator measurement on main,
  relayed 20:41 UTC, 2026-08-12).** capturedAt was byte-identical across an agent-driven wake,
  and three incidental samples the same evening agree. Consequence, stated wherever a reader
  meets it (the gauge header, shared-invariants): the guard is effective while the founder is
  present; unattended, the reading ages without bound, the gauge goes UNKNOWN past the staleness
  limit, and by the standing rule it reports loudly without halting — an unattended coordinator
  can still start work against an unseen window. No file may claim unattended or overnight
  cover. Two claims on main are disproven by this measurement and must be corrected, not
  restored as-is: the gauge header's "a pulse wakes the coordinator … keeps the gauge honest",
  and the invariants' "that turn renders the status line, making it the first genuinely fresh
  reading" about the wait's exit. Extending cover to unattended hours is the separate sensor
  item; nothing here designs toward it.

## Steps

1. **Restore the sensor, the stamp and the gauge from main.**
   `git checkout origin/main -- loop/work/statusline.ps1 loop/work/stamp-hook.ps1 loop/work/window-gauge.ps1`
   Done when: `git diff origin/main -- <those three>` is empty.

2. **Delete the hook machinery.**
   `git rm loop/work/window-gate.ps1 loop/work/window-lib.ps1 loop/work/window-alarm.cmd loop/drills/window-watchdog-drill.ps1`
   Done when: none of the four paths exists in the tree.

3. **Remove the hook entries from `.claude/settings.json`.** Remove the PreToolUse entry whose
   matcher is `Agent` (window-gate), and the entire `PostToolUse` and `PostToolUseFailure`
   blocks — all three were added by this item.
   Done when: `git diff origin/main -- .claude/settings.json` is empty.

4. **Move the gauge's line to 85 and port the no-usable-timestamp rule** (into the file restored
   in step 1). Two edits:
   a. Param default and comment:
      ```
      # PAUSE line - founder's number (2026-08-12): stop work at 85 percent of a window. This
      # supersedes the 90 of 2026-08-06; only the number moved, the one-line principle below is
      # unchanged.
      [int]$PauseAt = 85,
      ```
      Also update the header comment's "ONE LINE ONLY (founder 2026-08-06)" to
      "ONE LINE ONLY (founder 2026-08-06, the number moved to 85 on 2026-08-12)".
   b. Staleness guard: change `if ($null -ne $ageMin -and $ageMin -gt $StaleMinutes) {` to
      `if ($null -eq $ageMin -or $ageMin -gt $StaleMinutes) {`, add below the existing
      floor-comment:
      ```
      # An age that cannot be computed at all takes the same path: a reading with an unusable
      # capturedAt must never score as current. Over the line it still proves a floor; under
      # it, it proves nothing.
      ```
      and make both reason strings inside that branch conditional on `$null -eq $ageMin`:
      - PAUSE reason when ageless: `"{0} at {1}% (pause line {2}%) - the reading's capturedAt is
        unusable, but that window has not reset, and a window only climbs" -f $worst.name,
        $worst.percent, $PauseAt`
      - UNKNOWN reason when ageless: `"the reading's capturedAt timestamp is unusable - treat as
        unknown, never as low"`
      The aged variants keep main's exact wording.
   c. Header consequence 1 (the freshness claim main states is disproven by D7). Replace the
      whole numbered point 1 of "Two consequences worth holding on to" with:
      ```
      #   1. The reading is only as fresh as the last status-line refresh, and - measured
      #      2026-08-12 - only FOUNDER-TYPED turns refresh it. Agent- and system-driven wakes
      #      (flow lines, pulses, task notifications, background-command completions) do not:
      #      capturedAt was byte-identical across such a wake. So the guard is effective while
      #      the founder is present. Unattended, the reading ages without bound, the verdict
      #      goes UNKNOWN past the staleness limit, and by the standing rule it reports loudly
      #      without halting - an unattended coordinator can still start work against an unseen
      #      window. Extending cover to unattended hours is the separate sensor item, not this
      #      file.
      ```
   Done when: `powershell -NoProfile -File loop/work/window-gauge.ps1 -Json -SnapshotPath <synthetic>`
   parks at 85, the two step-6 sim cases pass, and the header contains no claim that a pulse or
   any agent-driven wake refreshes the gauge.

5. **`window-wait.ps1` comment only.** The 85 default is already on the branch. In its comment,
   replace "It matches window-gauge.ps1 and window-lib.ps1, and the three move together." with
   "It matches window-gauge.ps1, and the two move together."
   Done when: the file contains no `window-lib` reference and the default stays 85.

6. **`window-sim.ps1`: drop the library section, keep the gauge sections.** Sections 1–8 and the
   CLI-surface section ("The gauge command line itself") stay as they are on the branch. Delete
   from section 9 ("The library itself, and the copies pinned to it"): the `window-lib.ps1`
   dot-source, the hashtable-vs-JSON verdict pair, the `Format-WindowVerdictLine` prefix check,
   and the `window-alarm.cmd` path check. In their place, one slim section titled
   `'9. Readings that cannot be dated'` carrying the no-usable-timestamp cases through the CLI:
   ```
   # AN AGE THAT CANNOT BE COMPUTED IS UNKNOWN, NEVER FRESH. An unusable capturedAt used to
   # skip the staleness rules altogether, so a corrupt-but-low reading scored OK for as long
   # as it sat there. Over the line it still proves a floor - a window only climbs - and under
   # it, it proves nothing.
   Set-Raw ((@{ capturedAt = 'not-a-date'; rateLimits = @{ five_hour = (W 95 60) } }) | ConvertTo-Json -Depth 6)
   Check 'no usable timestamp, over the line -> PAUSE on the floor it still proves' (Verdict) 'PAUSE'
   Set-Raw ((@{ capturedAt = ''; rateLimits = @{ five_hour = (W 40 60) } }) | ConvertTo-Json -Depth 6)
   Check 'no usable timestamp, under the line -> UNKNOWN, never scored as current' (Verdict) 'UNKNOWN'
   Check 'and the reason names the timestamp it could not use' ([bool]((Gauge).reason -match 'capturedAt')) 'True'
   ```
   Renumber the CLI-surface section header from 10 to 10 (unchanged) — only section 9's body is
   replaced. Keep the `GaugeWith`/`GaugeHuman` helpers; the CLI-surface section uses them.
   Done when: `window-sim.ps1` contains no reference to window-lib, the stamp, or the alarm, and
   exits 0.

7. **`run-drills.ps1`: fold the sim where the watchdog sat.** Replace the watchdog block (the
   comment, the `$watchdog` invocation, its Assert and its echo loop) with:
   ```
   # ---- usage-window guard: the gauge's verdicts, the 85 line, the stale rules and the wait's
   # park path, all against synthetic snapshots - never the live one. The sim owns its own
   # PASS/FAIL lines, so only its verdict is folded here; failures are echoed so a red names
   # itself without a second run.
   $windowSim = @(& powershell -NoProfile -File (Join-Path $here '..\work\window-sim.ps1'))
   $windowSimCode = $LASTEXITCODE
   Assert 'window-guard' 'the usage-window guard holds (gauge verdicts, stale rules, park path)' ($windowSimCode -eq 0)
   if ($windowSimCode -ne 0) {
       foreach ($w in $windowSim) { if ($w -match '^\s*FAIL') { Write-Output ('      ' + $w) } }
   }
   ```
   The ordering note above the folded guards and the `$failed`-after-every-Assert repair stay.
   In the ordering note, change "Found by the AI4DEV-82 plan review" to "Found by this item's
   plan review" (no functional change; keeps the record in words).
   Done when: `run-drills.ps1` names no watchdog and the suite runs the sim.

8. **Conductor contract: the park request comes from the coordinator, not from a refused
   spawn.** In `.claude/agents/conductor.md`, in the section "Parking the item when the window
   is low — the park note is the whole hand-off", replace the first paragraph and the lead-in
   line with:
   ```
   The line is **85 percent** (founder 2026-08-12), and the COORDINATOR is the only actor that
   reads the gauge — see shared-invariants: the coordinator decides; nothing else may. You meet
   the line as a PARK REQUEST from the coordinator. Running work is never interrupted; what a
   park request stops is the next thing starting.

   When the coordinator asks you to park, park the item:
   ```
   Steps 1–4 and the "You are not the conductor that resumes" paragraph stay unchanged.
   Done when: the section contains no mention of a PreToolUse gate or a refused spawn.

9. **Shared invariants: keep the 85 line and centralized resume, delete the hook bullets, state
   the freshness limit.** In `.claude/skills/work/shared-invariants.md`:
   a. Delete three whole bullets: "Three hooks apply that standing line mechanically…", "A
      denied actor parks itself…", and "`UNKNOWN` at a hook allows and warns…". Keep the
      branch's 85-percent bullet and the "Resume is centralized in the coordinator…" bullet
      exactly as they are.
   b. Directly after the "`UNKNOWN` reports loudly and does not halt" bullet, add:
      ```
      - **The sensor refreshes only on founder-typed turns (measured 2026-08-12).** Agent- and
        system-driven wakes — flow lines, pulses, task notifications, background-command
        completions — do not refresh the status line, so the gauge is current exactly while the
        founder is present. Unattended, the reading ages without bound; past the staleness limit
        the gauge returns `UNKNOWN` and, by the rule above, reports loudly without halting — an
        unattended coordinator can still start work against an unseen window. No file may claim
        unattended or overnight cover. Extending cover to unattended hours belongs to the sensor
        item, not to this guard.
      ```
   c. In the wait-exit bullet ("Its exit means "the window should be open"…"), replace
      "So the FIRST TURN AFTER IT EXITS must re-read the gauge (that turn renders the status
      line, making it the first genuinely fresh reading) and park again if it still says
      `PAUSE`." with:
      "So the FIRST TURN AFTER IT EXITS must re-read the gauge and park again if it still says
      `PAUSE`. A wait exit is a background-command completion, and those do not refresh the
      sensor (measured 2026-08-12) — the first genuinely fresh reading arrives with the
      founder's next typed message; until then the gauge reports its age honestly and goes
      `UNKNOWN` past the limit."
   Done when: the file names no hook, gate, alarm or verdict file; states the 85 line; states
   the founder-present freshness limit; and no longer claims the wait exit yields a fresh
   reading.

10. **Item record cleanup (D5).** `git rm -r loop/items/AI4DEV-82/artifacts` and `git rm` of:
    `gate1-prompt.txt`, `gate1-rulings.md`, `gate2-flash-prompt.txt`, `gate2-terra-prompt.txt`,
    `gate2-rulings.md`, `draft-rulings.md`, `goal-evidence.md`, `audit-additions.md`,
    `audit-flash-prompt.txt`, `audit-luna-prompt.txt`, `audit-rulings.md`.
    Rewrite `pr-body.md` to describe the reduced merge (the coordinator-read guard, the 85 line,
    the deletions, the drills; states plainly that no hook or alarm ships, that the guard covers
    founder-present hours only — the sensor refreshes on founder-typed turns, per D7 — and that
    gates and audit were waived for this item by founder ruling). The body names no other
    item's id.
    Done when: `loop/items/AI4DEV-82/` contains exactly `PHASE-STATE.md`, `plan.md`,
    `pr-body.md`.

11. **Verify.** Run `powershell -NoProfile -File loop/drills/run-drills.ps1` — exit 0, every
    line PASS including `[window-guard]` and `[twin-guard]`. Run
    `powershell -NoProfile -File loop/work/window-sim.ps1` — exit 0. Save both outputs for the
    completion report (paste in the report, not as new artifact files).

12. **Residual-reference check.** `git grep -l -e window-lib -e window-gate -e window-alarm -e
    window-watchdog -e Get-WindowVerdict -e AI4GOOD_WINDOW_DIR` over the tree: the only
    permitted hits are `loop/items/AI4DEV-82/PHASE-STATE.md`, `plan.md` and `pr-body.md` —
    record files describing what was removed. Any other hit is a missed deletion.

## Expected verification state

No acceptance-test ids exist for bring-up work; the drills are the verify suite.

| check | expected |
|---|---|
| `loop/drills/run-drills.ps1` exit code | 0, all PASS, `window-guard` and `twin-guard` present |
| `loop/work/window-sim.ps1` exit code | 0 (covers: OK under 85, PAUSE at/over 85, rounding at 84.4/84.6, stale-high PAUSE, stale-low UNKNOWN, undatable-reading PAUSE/UNKNOWN, wait default parks at 85 and not at 84) |
| residual references (step 12) | only the three item-record files |
| `git diff origin/main -- .claude/settings.json loop/work/statusline.ps1 loop/work/stamp-hook.ps1` | empty |

## Out of scope

- The coordinator's live pause/resume behavior is prose in `shared-invariants.md` (it already
  describes it on main); no code runs inside the coordinator.
- The sensor's refresh cadence during unattended hours — filed separately, no longer a blocker.
- The stale pull-request body on GitHub is updated from `pr-body.md` by the merge sitting's
  mechanical (carry-forward fact 1).
