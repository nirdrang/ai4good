# window-sim.ps1 - exercise the usage-window guard end to end, spending nothing.
#
# The whole mechanism reads exactly ONE file, so driving that file drives everything: no API
# calls, no tokens, no waiting for a real window to fill. Every reading here is synthetic and
# written to a scratch path, so the live snapshot the status line maintains is never touched.
#
# WHAT THIS CAN AND CANNOT PROVE. It proves the parts we wrote behave: the gauge's verdicts, the
# park's exits, the early release. It does NOT prove the sensor is reading Anthropic correctly -
# the synthetic readings are shaped the way we BELIEVE the real one is shaped, so a change in the
# provider's payload would sail straight through this green. That gap is covered by the live
# reading, not here.
#
# It found a real bug on its first run: the gauge picked the binding window with Sort-Object over
# dictionary entries, which silently does nothing, so "worst" was whichever enumerated first. The
# live reading agreed with the right answer by luck for weeks. Cases that can DISAGREE are the
# whole point of this file - a test that only reproduces the situation you already have proves
# nothing.
#
# Run: powershell -NoProfile -File loop/work/window-sim.ps1

$ErrorActionPreference = 'SilentlyContinue'
$here  = $PSScriptRoot
$gauge = Join-Path $here 'window-gauge.ps1'
$wait  = Join-Path $here 'window-wait.ps1'
$snap  = Join-Path $env:TEMP ('window-sim-' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.json')

$pass = 0; $fail = 0; $failed = @()

function Set-Reading([hashtable]$windows, [double]$ageMinutes = 0) {
    $o = [ordered]@{
        capturedAt = (Get-Date).ToUniversalTime().AddMinutes(-$ageMinutes).ToString('o')
        sessionId  = 'sim'; version = 'sim'
        rateLimits = $windows
    }
    [IO.File]::WriteAllText($snap, ($o | ConvertTo-Json -Depth 6))
}
function Set-Raw([string]$text) { [IO.File]::WriteAllText($snap, $text) }

# A window: percent used, and how many minutes until it resets.
function W($pct, [double]$resetInMinutes) {
    @{ used_percentage = $pct; resets_at = [DateTimeOffset]::UtcNow.AddMinutes($resetInMinutes).ToUnixTimeSeconds() }
}

function Check([string]$label, $got, $want) {
    if ("$got" -eq "$want") { $script:pass++; "  PASS  {0}" -f $label }
    else { $script:fail++; $script:failed += $label; "  FAIL  {0}  (got '{1}', wanted '{2}')" -f $label, $got, $want }
}

function Gauge() {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $gauge -Json -SnapshotPath $snap | ConvertFrom-Json
}
function Verdict() { (Gauge).verdict }

try {
    'SIMULATING THE USAGE-WINDOW GUARD (synthetic readings, no tokens spent)'
    ''
    '1. A five-hour window filling up across a working session'
    # The narrative the guard exists for: work proceeds, spend climbs, and at one specific
    # reading the answer changes. Nothing else about the situation changes at that moment.
    foreach ($step in @(3, 25, 60, 80, 84)) {
        Set-Reading @{ five_hour = (W $step 120); seven_day = (W 30 5000) }
        Check ("at {0}% -> keep working" -f $step) (Verdict) 'OK'
    }
    foreach ($step in @(85, 86, 99, 100)) {
        Set-Reading @{ five_hour = (W $step 120); seven_day = (W 30 5000) }
        Check ("at {0}% -> park" -f $step) (Verdict) 'PAUSE'
    }

    ''
    '2. The line itself'
    Set-Reading @{ five_hour = (W 84 60) }
    Check '84 is under the line' (Verdict) 'OK'
    Set-Reading @{ five_hour = (W 85 60) }
    Check '85 is ON the line and counts as over' (Verdict) 'PAUSE'
    # The provider sends floats carrying binary noise; the gauge rounds before comparing. Without
    # that, the boundary behaves differently depending on invisible digits.
    Set-Reading @{ five_hour = (W 84.6 60) }
    Check '84.6 rounds to 85 -> park' (Verdict) 'PAUSE'
    Set-Reading @{ five_hour = (W 84.4 60) }
    Check '84.4 rounds to 84 -> keep working' (Verdict) 'OK'
    Set-Reading @{ five_hour = (W 7.000000000000001 60) }
    Check 'float noise does not become an odd percentage' (Gauge).worstPercent 7
    Set-Reading @{ five_hour = (W 0 60) }
    Check 'a fresh window reads 0' (Gauge).worstPercent 0

    ''
    '3. Several windows, disagreeing'
    Set-Reading @{ five_hour = (W 12 200); seven_day = (W 95 5000) }
    Check 'weekly over while five-hour is idle -> park' (Verdict) 'PAUSE'
    Check 'and it names the weekly one' (Gauge).worstWindow 'seven_day'
    # The reset it reports must belong to the window that BLOCKED, or a park would wait on the
    # wrong clock - the five-hour reset here is 80 hours earlier than the weekly one.
    Check 'and reports THAT window reset, not another' ([int]((Gauge).resetsInMin / 100)) 50
    Set-Reading @{ five_hour = (W 96 30); seven_day = (W 91 5000) }
    Check 'both over -> the furthest along wins' (Gauge).worstWindow 'five_hour'
    # Other plans report up to five windows. Every one present is evaluated by name, so a plan
    # change cannot silently narrow the guard to the two windows this account happens to have.
    Set-Reading @{
        five_hour = (W 10 100); seven_day = (W 20 5000)
        seven_day_overage_included = (W 30 5000)
        seven_day_sonnet = (W 40 5000); seven_day_opus = (W 93 5000)
    }
    Check 'a per-model weekly window blocks too' (Verdict) 'PAUSE'
    Check 'and is named' (Gauge).worstWindow 'seven_day_opus'
    # A window name nobody has seen before must still count. Ignoring the unknown is how a guard
    # quietly stops covering the thing that was added.
    Set-Reading @{ five_hour = (W 5 100); some_future_window = (W 97 999) }
    Check 'an unrecognised window still counts' (Verdict) 'PAUSE'

    ''
    '4. Readings that cannot be trusted'
    Remove-Item $snap -Force
    Check 'no snapshot at all -> UNKNOWN' (Verdict) 'UNKNOWN'
    Set-Raw 'this is not json {{{'
    Check 'unparseable snapshot -> UNKNOWN' (Verdict) 'UNKNOWN'
    Set-Raw '{"capturedAt":"2026-08-07T00:00:00Z","rateLimits":null}'
    Check 'a build reporting no windows -> UNKNOWN' (Verdict) 'UNKNOWN'
    Set-Reading @{ five_hour = @{ resets_at = 123 } }
    Check 'a window with no percentage -> UNKNOWN' (Verdict) 'UNKNOWN'
    # Partial damage must not discard the windows that ARE readable.
    Set-Reading @{ five_hour = @{ resets_at = 123 }; seven_day = (W 94 5000) }
    Check 'one broken window, one good -> the good one still decides' (Verdict) 'PAUSE'
    Set-Reading @{ five_hour = @{ used_percentage = 95 } }
    Check 'a window with no reset time still reports its level' (Verdict) 'PAUSE'
    Set-Raw ('{"capturedAt":"not-a-date","rateLimits":{"five_hour":{"used_percentage":95,"resets_at":' + [DateTimeOffset]::UtcNow.AddMinutes(60).ToUnixTimeSeconds() + '}}}')
    Check 'an unreadable timestamp does not crash it' (Verdict) 'PAUSE'

    # A reading nobody can DATE. The gauge used to skip every staleness rule here and score the
    # number alone, so a corrupt file holding a low percentage read OK for ever - the guard was
    # off and nothing said so. An undatable reading is UNKNOWN, and PAUSE when it is over the
    # line, because a window only climbs.
    $reset = [DateTimeOffset]::UtcNow.AddMinutes(60).ToUnixTimeSeconds()
    Set-Raw ('{"capturedAt":"not-a-date","rateLimits":{"five_hour":{"used_percentage":12,"resets_at":' + $reset + '}}}')
    Check 'undatable and low -> UNKNOWN, never OK' (Verdict) 'UNKNOWN'
    Set-Raw ('{"rateLimits":{"five_hour":{"used_percentage":12,"resets_at":' + $reset + '}}}')
    Check 'no capture time at all, low -> UNKNOWN' (Verdict) 'UNKNOWN'
    Set-Raw ('{"capturedAt":"","rateLimits":{"five_hour":{"used_percentage":12,"resets_at":' + $reset + '}}}')
    Check 'an empty capture time, low -> UNKNOWN' (Verdict) 'UNKNOWN'
    Set-Raw ('{"rateLimits":{"five_hour":{"used_percentage":88,"resets_at":' + $reset + '}}}')
    Check 'no capture time, over the line -> PAUSE, a window only climbs' (Verdict) 'PAUSE'
    Set-Raw ('{"capturedAt":"not-a-date","rateLimits":{"five_hour":{"used_percentage":88,"resets_at":' + [DateTimeOffset]::UtcNow.AddMinutes(-30).ToUnixTimeSeconds() + '}}}')
    Check 'undatable, over the line, reset already gone -> still PAUSE' (Verdict) 'PAUSE'

    ''
    '5. Staleness'
    Set-Reading @{ five_hour = (W 50 100) } 0
    Check 'a current reading is used' (Verdict) 'OK'
    Set-Reading @{ five_hour = (W 50 100) } 14
    Check '14 minutes old is still current enough' (Verdict) 'OK'
    Set-Reading @{ five_hour = (W 50 100) } 16
    Check '16 minutes old -> UNKNOWN' (Verdict) 'UNKNOWN'
    # A stale reading proves a FLOOR, not a level - inside one window the figure only climbs. So
    # staleness alone is not the question; whether that window has RESET since is.
    Set-Reading @{ five_hour = (W 97 100) } 60
    Check 'stale, over the line, window not yet reset -> park on it' (Verdict) 'PAUSE'
    Set-Reading @{ five_hour = (W 97 -30) } 60
    Check 'stale, over the line, but the window has since reset -> UNKNOWN' (Verdict) 'UNKNOWN'
    Set-Reading @{ five_hour = (W 40 100) } 60
    Check 'stale and under the line -> UNKNOWN, it may have climbed' (Verdict) 'UNKNOWN'
    Set-Reading @{ five_hour = @{ used_percentage = 97 } } 60
    Check 'stale, over the line, no reset time at all -> UNKNOWN' (Verdict) 'UNKNOWN'

    ''
    '6. Parking and continuing'
    Set-Reading @{ five_hour = (W 10 200) }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1 | Out-Null
    Check 'nothing to wait for -> exits 0 at once' $LASTEXITCODE 0
    & powershell -NoProfile -ExecutionPolicy Bypass -File $gauge -SnapshotPath $snap -ExitOnReady | Out-Null
    Check 'the wait condition succeeds when clear' $LASTEXITCODE 0
    Set-Reading @{ five_hour = (W 95 60) }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $gauge -SnapshotPath $snap -ExitOnReady | Out-Null
    Check 'the wait condition fails when parked' $LASTEXITCODE 1

    Set-Reading @{ five_hour = (W 97 -3) }
    $out = & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1
    Check 'reset time already passed -> exits 0' $LASTEXITCODE 0
    Check 'and tells the caller to re-read the gauge' ([bool]($out -match 're-read the gauge')) 'True'

    Set-Reading @{ seven_day = (W 96 4000) }
    $out = & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1 -MaxHours 0
    Check 'a weekly blocker -> gives up with exit 1' $LASTEXITCODE 1
    Check 'and says it is a founder decision' ([bool]($out -match 'founder decision')) 'True'

    # Moving the line proves the threshold is a parameter and not baked into the logic.
    Set-Reading @{ five_hour = (W 50 60) }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1 -PauseAt 40 -MaxHours 0 | Out-Null
    Check 'a lowered line parks work that was fine before' $LASTEXITCODE 1

    ''
    '7. A live park, with the world changing underneath it'
    # This exercises the loop rather than a single decision.
    Set-Reading @{ five_hour = (W 93 45) }
    $job = Start-Job -ScriptBlock {
        param($w, $s)
        $o = & powershell -NoProfile -ExecutionPolicy Bypass -File $w -SnapshotPath $s -PollSeconds 2
        [pscustomobject]@{ code = $LASTEXITCODE; out = ($o -join "`n") }
    } -ArgumentList $wait, $snap
    Start-Sleep -Seconds 3
    Check 'parked, and still waiting after 3s' ($job.State -eq 'Running') 'True'
    Set-Reading @{ five_hour = (W 8 300) }          # another session refreshed it; window reopened
    $done = Wait-Job $job -Timeout 25
    $r = Receive-Job $job; Remove-Job $job -Force
    Check 'released once the reading cleared' ([bool]$done) 'True'
    Check 'exit 0 on early release' $r.code 0
    Check 'said it cleared early' ([bool]($r.out -match 'cleared early')) 'True'

    # A park must survive its own instrument breaking. The snapshot disappearing mid-wait leaves
    # the target it captured at the start, so it still releases on the clock rather than hanging.
    Set-Reading @{ five_hour = (W 94 0.6) }
    $job2 = Start-Job -ScriptBlock {
        param($w, $s)
        $o = & powershell -NoProfile -ExecutionPolicy Bypass -File $w -SnapshotPath $s -PollSeconds 2
        [pscustomobject]@{ code = $LASTEXITCODE; out = ($o -join "`n") }
    } -ArgumentList $wait, $snap
    Start-Sleep -Seconds 2
    Remove-Item $snap -Force                        # the sensor dies mid-park
    $done2 = Wait-Job $job2 -Timeout 180
    $r2 = Receive-Job $job2; Remove-Job $job2 -Force
    Check 'survives its snapshot vanishing mid-park' ([bool]$done2) 'True'
    Check 'and still releases on the clock' $r2.code 0

    ''
    '8. Coming out the other side of a park'
    # Everything above started with the reset already behind us. This is the real shape: park
    # while the reset is still ahead, sit through it, and come out.
    Set-Reading @{ five_hour = (W 96 0.15) }        # resets in ~9 seconds
    $t0 = Get-Date
    $out = & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 2 -SlackMinutes 0
    $elapsed = ((Get-Date) - $t0).TotalSeconds
    Check 'crossed the reset boundary and released' $LASTEXITCODE 0
    Check 'and actually waited for it, rather than short-circuiting' ([bool]($elapsed -ge 6)) 'True'
    Check 'and said the stated reset had passed' ([bool]($out -match 'stated reset time has passed')) 'True'

    # The slack exists so a release cannot arrive before the provider has actually turned the
    # window over. Reset half a minute gone, a minute of slack: still parked.
    Set-Reading @{ five_hour = (W 96 -0.5) }
    $job3 = Start-Job -ScriptBlock {
        param($w, $s) & powershell -NoProfile -ExecutionPolicy Bypass -File $w -SnapshotPath $s -PollSeconds 2 | Out-Null
    } -ArgumentList $wait, $snap
    Start-Sleep -Seconds 4
    Check 'still parked inside the slack, not released on the exact second' ($job3.State -eq 'Running') 'True'
    Stop-Job $job3; Remove-Job $job3 -Force

    # WHAT THE COORDINATOR SEES NEXT. Its first turn after the park renders the status line, so
    # the reading is fresh. Three outcomes, and all three must be distinguishable.
    Set-Reading @{ five_hour = (W 2 300) }
    Check 'a genuinely new window -> release the work' (Verdict) 'OK'
    # The reset can roll forward: the window turned over but the level did not fall enough, or a
    # different window is now the blocker. Re-park, do not proceed because the clock said so.
    Set-Reading @{ five_hour = (W 94 300) }
    Check 'still over the line after the reset -> park again' (Verdict) 'PAUSE'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1 -MaxHours 0 | Out-Null
    Check 'and the park is re-enterable' $LASTEXITCODE 1
    # The degradation path: nothing refreshed the reading, so it is old AND its reset has gone by.
    # The old number now proves nothing, so this is UNKNOWN - reported, not halted, by the rule.
    Set-Reading @{ five_hour = (W 96 -20) } 45
    Check 'nothing refreshed it after the park -> UNKNOWN, not a false PAUSE' (Verdict) 'UNKNOWN'
    # And the weekly window is unmoved by a five-hour reset - a release must not be granted by the
    # wrong window turning over.
    Set-Reading @{ five_hour = (W 1 300); seven_day = (W 93 5000) }
    Check 'the five-hour reset does not release a weekly block' (Verdict) 'PAUSE'
    Check 'and the weekly one is still named as the blocker' (Gauge).worstWindow 'seven_day'

    ''
    '9. One number, written in three places, all agreeing'
    # The stop line is copied into the gauge, into the wait, and into the process document the
    # coordinator follows. Every check above reads the gauge with NO -PauseAt, so the default is
    # what they measured. These three assertions are what stop the copies drifting apart.
    $root = Split-Path -Parent (Split-Path -Parent $here)
    function Get-DefaultPauseAt([string]$file) {
        $m = [regex]::Match((Get-Content $file -Raw), '(?m)^\s*\[int\]\$PauseAt\s*=\s*(\d+)')
        if ($m.Success) { [int]$m.Groups[1].Value } else { -1 }
    }
    $gaugeLine = Get-DefaultPauseAt $gauge
    Check 'the gauge stops at 85' $gaugeLine 85
    Check 'the wait carries the same number, not one of its own' (Get-DefaultPauseAt $wait) $gaugeLine
    $inv = Join-Path $root '.claude\skills\work\shared-invariants.md'
    $docLine = -1
    $dm = [regex]::Match((Get-Content $inv -Raw), 'pause line is (\d+) percent')
    if ($dm.Success) { $docLine = [int]$dm.Groups[1].Value }
    Check 'the process document states the same number' $docLine $gaugeLine

    ''
    '10. The coordinator sequence end to end: stop at the line, arm the wait, resume at the reset'
    # The whole behaviour in one run, with the real scripts. A window crosses the line while an
    # item is running, the coordinator stops the workflow, arms the wait on the time the reading
    # itself states, and comes back when that time passes. Sections 7 and 8 exercise the wait;
    # this one exercises the SEQUENCE the coordinator follows around it.
    $parkNote = Join-Path $env:TEMP ('window-sim-park-' + [guid]::NewGuid().ToString('N').Substring(0, 6) + '.txt')
    try {
        Set-Reading @{ five_hour = (W 62 10); seven_day = (W 30 5000) }
        Check 'the item runs while the window is under the line' (Verdict) 'OK'

        # The window crosses the line mid-item. The reading states its own reset, 12 seconds out.
        Set-Reading @{ five_hour = (W 87 0.2); seven_day = (W 30 5000) }
        $g = Gauge
        Check 'crossing the line stops the workflow' $g.verdict 'PAUSE'
        Check 'and the reading names the window that blocked' $g.worstWindow 'five_hour'

        # STOP. The conductor parks and the coordinator starts nothing new. The park note stands
        # for the parked item: it is what a fresh conductor reads to resume.
        Set-Content -Path $parkNote -Value ('PARKED at {0}% on {1}' -f $g.worstPercent, $g.worstWindow)
        Check 'the parked item left a note to resume from' (Test-Path $parkNote) 'True'

        # ARM. The wait runs as a background command, anchored on the reset time in the reading.
        $armed = Start-Job -ScriptBlock {
            param($w, $s)
            $o = & powershell -NoProfile -ExecutionPolicy Bypass -File $w -SnapshotPath $s -PollSeconds 2 -SlackMinutes 0
            [pscustomobject]@{ code = $LASTEXITCODE; out = ($o -join "`n") }
        } -ArgumentList $wait, $snap
        Start-Sleep -Seconds 3
        Check 'the wait is armed and holding before the reset' ($armed.State -eq 'Running') 'True'

        $released = Wait-Job $armed -Timeout 60
        $r = Receive-Job $armed; Remove-Job $armed -Force
        Check 'the wait exits when the stated reset time passes' ([bool]$released) 'True'
        Check 'and exits 0, which is what wakes the session' $r.code 0
        Check 'and it waited on the window the reading named' ([bool]($r.out -match 'parked on five_hour at 87%')) 'True'

        # RESUME, first turn after the wake: re-read the gauge. Here the window turned over but
        # the level did not fall. The wake says the window SHOULD be open, never that budget exists.
        Set-Reading @{ five_hour = (W 91 300) }
        Check 'still over the line after the wake -> stop again' (Verdict) 'PAUSE'
        Check 'and the item stays parked' (Test-Path $parkNote) 'True'

        # A genuinely new window: release the parked item, one at a time.
        Set-Reading @{ five_hour = (W 4 300) }
        Check 'under the line -> release the parked work' (Verdict) 'OK'
        Remove-Item $parkNote -Force
        Check 'the note is consumed by the resume, so nothing releases twice' (Test-Path $parkNote) 'False'
    } finally {
        Remove-Item $parkNote -Force -ErrorAction SilentlyContinue
    }

    ''
    '11. The reading on the prompt stamp'
    # The stamp hook prints the reading before every prompt, so the guard is visible instead of
    # remembered. These checks drive the REAL hook against synthetic readings, through the same
    # snapshot override the gauge already had.
    $hook = Join-Path $here 'stamp-hook.ps1'
    function Hook-Lines([string]$projectDir) {
        $env:AI4GOOD_WINDOW_SNAPSHOT = $snap
        $env:AI4GOOD_STAMP_CHILD = '1'       # the supervision tree is another file's subject
        $env:CLAUDE_PROJECT_DIR = $projectDir
        try { @(& powershell -NoProfile -ExecutionPolicy Bypass -File $hook -SessionId 'abcdef01' 2>$null) }
        finally {
            Remove-Item Env:AI4GOOD_WINDOW_SNAPSHOT -ErrorAction SilentlyContinue
            Remove-Item Env:AI4GOOD_STAMP_CHILD -ErrorAction SilentlyContinue
            Remove-Item Env:CLAUDE_PROJECT_DIR -ErrorAction SilentlyContinue
        }
    }
    function Window-Line() { @(Hook-Lines $root) | Where-Object { $_ -match 'WINDOW' } | Select-Object -First 1 }

    Set-Reading @{ five_hour = (W 50 120); seven_day = (W 78 5000) }
    $line = Window-Line
    Check 'a clear reading prints one OK line' ([bool]($line -match 'WINDOW  OK')) 'True'
    Check 'and it names every window with its percentage' ([bool]($line -match 'five_hour 50%' -and $line -match 'seven_day 78%')) 'True'
    Check 'and it prints the line the verdict used, not a copy' ([bool]($line -match ('line {0}%' -f $gaugeLine))) 'True'
    Check 'and it prints the age of the reading' ([bool]($line -match 'reading \d')) 'True'
    Check 'and it carries the session prefix like every stamp line' ([bool]($line -match '^\[abcdef01\] ')) 'True'

    Set-Reading @{ five_hour = (W 88 90); seven_day = (W 40 5000) }
    $line = Window-Line
    Check 'a reading over the line prints PAUSE' ([bool]($line -match 'WINDOW  PAUSE')) 'True'
    Check 'and it says to stop the workflow' ([bool]($line -match 'STOP THE WORKFLOW')) 'True'
    Check 'and it names the wait to arm' ([bool]($line -match 'window-wait\.ps1')) 'True'
    Check 'and it names the window and its reset' ([bool]($line -match 'five_hour at 88%' -and $line -match 'resume after the reset at \d\d:\d\d')) 'True'

    Set-Raw 'this is not json {{{'
    $lines = @(Hook-Lines $root)
    $line = $lines | Where-Object { $_ -match 'WINDOW' } | Select-Object -First 1
    Check 'an unreadable instrument prints UNKNOWN' ([bool]($line -match 'WINDOW  UNKNOWN')) 'True'
    Check 'and says to report it rather than halt' ([bool]($line -match 'do not halt')) 'True'
    # The stamp is the one output that must never be damaged by anything added to it.
    Check 'and the stamp itself still prints its two lines' `
        ([bool](($lines | Where-Object { $_ -match 'WORKING ON' }).Count -ge 1 -and ($lines | Where-Object { $_ -match ' IN ' }).Count -ge 1)) 'True'

    # COORDINATOR ONLY. An agent never reads the limits, so the line must be absent in an agent
    # worktree. This runs against a worktree that already exists, read only; with none present the
    # check is SKIPPED and says so, because a check that quietly vanishes reads as a pass.
    $anyAgent = $null
    $wtDir = Join-Path $root '.claude\worktrees'
    if (Test-Path $wtDir) {
        foreach ($d in (Get-ChildItem $wtDir -Directory -ErrorAction SilentlyContinue)) {
            if (& git -C $d.FullName rev-parse --show-toplevel 2>$null) { $anyAgent = $d.FullName; break }
        }
    }
    Set-Reading @{ five_hour = (W 88 90) }
    if ($anyAgent) {
        $agentLines = @(Hook-Lines $anyAgent)
        Check 'an agent worktree prints no window line' (($agentLines | Where-Object { $_ -match 'WINDOW' }).Count) 0
        Check 'and it still stamps as an agent' ([bool](($agentLines -join ' ') -match 'AGENT')) 'True'
    }
    else {
        '  SKIP  the agent-worktree check - no agent worktree exists right now'
    }

    ''
    "RESULT: {0} passed, {1} failed" -f $pass, $fail
    if ($fail -gt 0) { ''; 'failed:'; $failed | ForEach-Object { '  - ' + $_ }; exit 1 }
} finally {
    Remove-Item $snap -Force -ErrorAction SilentlyContinue
    Get-Job | Where-Object { $_.Command -match 'window-wait' } | Remove-Job -Force -ErrorAction SilentlyContinue
}
