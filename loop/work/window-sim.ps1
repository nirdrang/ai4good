# window-sim.ps1 - exercise the usage-window guard end to end, spending nothing.
#
# The whole mechanism reads exactly ONE file, so driving that file drives everything: no API
# calls, no tokens, no waiting for a real window to fill. Every reading here is synthetic and
# written to a scratch path, so the live snapshot the status line maintains is never touched.
#
# WHAT THIS CAN AND CANNOT PROVE. It proves the parts we wrote behave: the gauge's verdicts, the
# park's exits, the early release. It does NOT prove the sensor is reading Anthropic correctly -
# the synthetic readings are shaped the way we believe the real one is shaped, so a change in the
# provider's payload would sail straight through this green. That gap is covered by the live
# reading, not here. Run: powershell -File loop/work/window-sim.ps1

$ErrorActionPreference = 'SilentlyContinue'
$here  = $PSScriptRoot
$gauge = Join-Path $here 'window-gauge.ps1'
$wait  = Join-Path $here 'window-wait.ps1'
$snap  = Join-Path $env:TEMP ('window-sim-' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.json')

$pass = 0; $fail = 0

function Set-Reading([hashtable]$windows, [int]$ageMinutes = 0) {
    $o = [ordered]@{
        capturedAt = (Get-Date).ToUniversalTime().AddMinutes(-$ageMinutes).ToString('o')
        sessionId  = 'sim'; version = 'sim'
        rateLimits = $windows
    }
    [IO.File]::WriteAllText($snap, ($o | ConvertTo-Json -Depth 6))
}

function W([int]$pct, [double]$resetInMinutes) {
    @{ used_percentage = $pct; resets_at = [DateTimeOffset]::UtcNow.AddMinutes($resetInMinutes).ToUnixTimeSeconds() }
}

function Check([string]$label, $got, $want) {
    if ("$got" -eq "$want") { $script:pass++; "  PASS  {0}" -f $label }
    else { $script:fail++; "  FAIL  {0}  (got '{1}', wanted '{2}')" -f $label, $got, $want }
}

function Verdict() {
    (& powershell -NoProfile -ExecutionPolicy Bypass -File $gauge -Json -SnapshotPath $snap | ConvertFrom-Json).verdict
}

try {
    'SIMULATING THE USAGE-WINDOW GUARD (synthetic readings, no tokens spent)'
    ''
    '1. The gauge reads the situation'

    Set-Reading @{ five_hour = (W 10 200); seven_day = (W 40 5000) }
    Check 'plenty left -> OK' (Verdict) 'OK'

    Set-Reading @{ five_hour = (W 91 40); seven_day = (W 40 5000) }
    Check 'five-hour over the line -> PAUSE' (Verdict) 'PAUSE'

    # The binding constraint is whichever window is furthest along. A guard that watched only the
    # five-hour one would call this fine and walk into the weekly wall.
    Set-Reading @{ five_hour = (W 12 200); seven_day = (W 95 5000) }
    Check 'weekly over the line while five-hour is idle -> PAUSE' (Verdict) 'PAUSE'

    Set-Reading @{ five_hour = (W 10 200) } 99
    Check 'reading 99 min old -> UNKNOWN, never OK' (Verdict) 'UNKNOWN'

    ''
    '2. Parking and continuing'

    Set-Reading @{ five_hour = (W 10 200) }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1 | Out-Null
    Check 'nothing to wait for -> exits 0 at once' $LASTEXITCODE 0

    # The reset moment has passed: the park must release, and must say the caller still has to
    # confirm with a fresh reading rather than trusting the clock.
    Set-Reading @{ five_hour = (W 97 -3) }
    $out = & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1
    Check 'reset time passed -> exits 0' $LASTEXITCODE 0
    Check 'and tells the caller to re-read' ([bool]($out -match 're-read the gauge')) 'True'

    # A weekly window days away is not something to sit through.
    Set-Reading @{ seven_day = (W 96 4000) }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $wait -SnapshotPath $snap -PollSeconds 1 -MaxHours 0 | Out-Null
    Check 'weekly blocker -> gives up with exit 1' $LASTEXITCODE 1

    ''
    '3. A live park that clears while it waits'

    # This is the one that exercises the loop rather than a single decision: park on a window
    # whose reset is well away, then have the reading change underneath - as it would when
    # another session refreshes the shared snapshot - and confirm it leaves early.
    Set-Reading @{ five_hour = (W 93 45) }
    $job = Start-Job -ScriptBlock {
        param($w, $s)
        $o = & powershell -NoProfile -ExecutionPolicy Bypass -File $w -SnapshotPath $s -PollSeconds 2
        [pscustomobject]@{ code = $LASTEXITCODE; out = ($o -join "`n") }
    } -ArgumentList $wait, $snap

    Start-Sleep -Seconds 3
    $stillWaiting = ($job.State -eq 'Running')
    Check 'parked and still waiting after 3s' $stillWaiting 'True'

    Set-Reading @{ five_hour = (W 8 300) }          # the window reopened
    $done = Wait-Job $job -Timeout 20
    $r = Receive-Job $job
    Remove-Job $job -Force

    Check 'released once the reading cleared' ([bool]$done) 'True'
    Check 'exit 0 on early release' $r.code 0
    Check 'said it cleared early' ([bool]($r.out -match 'cleared early')) 'True'

    ''
    "RESULT: {0} passed, {1} failed" -f $pass, $fail
    if ($fail -gt 0) { exit 1 }
} finally {
    Remove-Item $snap -Force -ErrorAction SilentlyContinue
}
