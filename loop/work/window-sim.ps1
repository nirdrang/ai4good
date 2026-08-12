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
    foreach ($step in @(85, 91, 99, 100)) {
        Set-Reading @{ five_hour = (W $step 120); seven_day = (W 30 5000) }
        Check ("at {0}% -> park" -f $step) (Verdict) 'PAUSE'
    }

    ''
    '2. The line itself'
    # The line is 85 (founder 2026-08-12, superseding 90 of 2026-08-06). These four cases are what
    # pins it: a line half-moved between the gauge, the wait and the library goes red here.
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
    # THE WAIT CARRIES ITS OWN COPY OF THE NUMBER, and until now nothing ran it at the boundary.
    # The only case that invoked it on its default used a 94% reading - over 85 and over 90 alike -
    # so a window-wait.ps1 left behind at 90 sailed through green. These two pass no -PauseAt at
    # all, which is the only way that copy gets pinned. -MaxHours 0 makes a park exit at once.
    Set-Reading @{ five_hour = (W 84 60) }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1 -MaxHours 0 | Out-Null
    Check 'the WAIT default agrees: 84 is under the line, nothing to wait for' $LASTEXITCODE 0
    Set-Reading @{ five_hour = (W 85 60) }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1 -MaxHours 0 | Out-Null
    Check 'the WAIT default agrees: 85 is ON the line, so it parks' $LASTEXITCODE 1

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
    '9. The library itself, and the copies pinned to it'
    # Everything above drives the gauge CLI, which always reads JSON off disk. Three things never
    # travel that path and can only be pinned here: the in-memory snapshot shape the status line
    # holds, the exact prefix the stamp rewrites, and the alarm batch file's copy of the path
    # formula.
    . (Join-Path $here 'window-lib.ps1')

    # THE READING ARRIVES IN TWO SHAPES. The status line holds a Hashtable in memory; every other
    # reader parses JSON and holds a PSCustomObject. Both must reach the same verdict AND name the
    # same window. They did not: PSObject.Properties.Name over a Hashtable enumerates the .NET
    # members - Keys, Values, Count - so the worst window came out named "Values", in the very line
    # the founder reads. Two windows on purpose, because with one the wrong answer looks right.
    $hashSnap = [ordered]@{
        capturedAt = (Get-Date).ToUniversalTime().ToString('o')
        rateLimits = @{ five_hour = (W 12 200); seven_day = (W 95 5000) }
    }
    $jsonSnap = $hashSnap | ConvertTo-Json -Depth 6 | ConvertFrom-Json
    $vh = Get-WindowVerdict -Snapshot $hashSnap
    $vj = Get-WindowVerdict -Snapshot $jsonSnap
    Check 'an in-memory reading verdicts the same as a parsed one' $vh.verdict $vj.verdict
    Check 'and both name the window that actually blocked' ($vh.worstWindow + '/' + $vj.worstWindow) 'seven_day/seven_day'

    # AN AGE THAT CANNOT BE COMPUTED IS UNKNOWN, NEVER FRESH. An unparseable capturedAt used to
    # skip the staleness rules altogether, so a corrupt-but-low reading scored OK for as long as it
    # sat there. Over the line it still proves a floor - a window only climbs - and under it, it
    # proves nothing.
    $noTime = [ordered]@{ capturedAt = 'not-a-date'; rateLimits = @{ five_hour = (W 95 60) } } | ConvertTo-Json -Depth 6 | ConvertFrom-Json
    Check 'no usable timestamp, over the line -> PAUSE on the floor it still proves' (Get-WindowVerdict -Snapshot $noTime).verdict 'PAUSE'
    $noTimeLow = [ordered]@{ capturedAt = ''; rateLimits = @{ five_hour = (W 40 60) } } | ConvertTo-Json -Depth 6 | ConvertFrom-Json
    $vlow = Get-WindowVerdict -Snapshot $noTimeLow
    Check 'no usable timestamp, under the line -> UNKNOWN, never scored as current' $vlow.verdict 'UNKNOWN'
    Check 'and the reason names the timestamp it could not use' ([bool]($vlow.reason -match 'capturedAt')) 'True'

    # THE PREFIX THE STAMP STRIPS. stamp-hook.ps1 rewrites '^ALARM WINDOW ' off this line before
    # printing its own 'WINDOW ALARM' prefix, and nothing else pins the two together. A one
    # character drift either double-prints the founder's alarm or leaves it half-printed.
    $pauseLine = Format-WindowVerdictLine (Get-WindowVerdict -Snapshot $noTime)
    Check "the PAUSE line begins with exactly 'ALARM WINDOW '" ([bool]($pauseLine -cmatch '^ALARM WINDOW \S')) 'True'

    # THE ALARM'S SECOND COPY OF THE PATH FORMULA. window-alarm.cmd is a batch file and cannot call
    # the library, so its fallback directory is spelled out - the one place in production where the
    # formula exists twice. The copy stays; this is the check that goes red when the two drift.
    $cmdText = [IO.File]::ReadAllText((Join-Path $here 'window-alarm.cmd'))
    $m = [regex]::Match($cmdText, 'else \(set "AI4GOOD_WD=([^"]+)"\)')
    Check 'the alarm still carries a fallback path literal to compare' ([bool]$m.Success) 'True'
    $savedWinDir = $env:AI4GOOD_WINDOW_DIR
    Remove-Item Env:\AI4GOOD_WINDOW_DIR -ErrorAction SilentlyContinue
    $libDir = Get-WindowDir
    if ($savedWinDir) { $env:AI4GOOD_WINDOW_DIR = $savedWinDir }
    Check "the alarm's own path literal still equals the library's formula" `
        ([Environment]::ExpandEnvironmentVariables($m.Groups[1].Value).TrimEnd('\')) ($libDir.TrimEnd('\'))

    ''
    "RESULT: {0} passed, {1} failed" -f $pass, $fail
    if ($fail -gt 0) { ''; 'failed:'; $failed | ForEach-Object { '  - ' + $_ }; exit 1 }
} finally {
    Remove-Item $snap -Force -ErrorAction SilentlyContinue
    Get-Job | Where-Object { $_.Command -match 'window-wait' } | Remove-Job -Force -ErrorAction SilentlyContinue
}
