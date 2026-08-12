# overhead-measure.ps1 - what the watchdog costs, measured rather than asserted.
#
# TWO NUMBERS, and they are paid at very different rates.
#
#   the ALARM  runs after EVERY tool call in the system, in every agent, forever. Its cost is the
#              whole reason it is a batch file and not PowerShell, and the plan set a target of a
#              median at or under 100 ms. This measures the DEPLOYED shape: the command string in
#              .claude/settings.json, run through cmd, exactly as a hook command is run.
#
#   the SENSOR runs once per status-line refresh, and this item added a verdict composition, a
#              named mutex and a second file write to it. The number that matters is the DELTA
#              those additions cost, so the same script is measured with and without the block.
#              The stripped variant is generated here into TEMP - production is never edited for a
#              measurement - and the two variants differ in nothing else.
#
# NOTHING TOUCHES THE LIVE READING. AI4GOOD_WINDOW_DIR points at a temporary directory for the
# whole run, and the live directory is fingerprinted and re-checked at the end.
#
# Run: powershell -NoProfile -File loop/items/AI4DEV-82/artifacts/overhead-measure.ps1

$ErrorActionPreference = 'SilentlyContinue'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = (Resolve-Path (Join-Path $here '..\..\..\..')).Path
$work = Join-Path $repo 'loop\work'
$alarm = Join-Path $work 'window-alarm.cmd'
$sensor = Join-Path $work 'statusline.ps1'

$run = Join-Path $env:TEMP ('window-overhead-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $run | Out-Null
$winDir = Join-Path $run 'windowdir'
New-Item -ItemType Directory -Force -Path $winDir | Out-Null
$env:AI4GOOD_WINDOW_DIR = $winDir

$liveSnap = Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good\rate-limits.json'
$liveBefore = if (Test-Path $liveSnap) { (Get-FileHash -LiteralPath $liveSnap -Algorithm SHA256).Hash } else { '' }

function Get-Median([double[]]$v) {
    $s = @($v | Sort-Object)
    $n = $s.Count
    if ($n -eq 0) { return 0 }
    if ($n % 2 -eq 1) { return $s[[int](($n - 1) / 2)] }
    return (($s[($n / 2) - 1] + $s[$n / 2]) / 2)
}

# N + 1 runs; the first is a warm-up and is discarded, because the first touch of a file or an
# image pays for the disk cache once and that cost is not what anyone pays per tool call.
function Measure-Runs([int]$n, [scriptblock]$body) {
    & $body | Out-Null
    $ms = @()
    for ($i = 0; $i -lt $n; $i++) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        & $body | Out-Null
        $sw.Stop()
        $ms += $sw.Elapsed.TotalMilliseconds
    }
    return $ms
}

# Prints the line and returns NOTHING. A function that both printed and returned would hand the
# caller its own printed line as part of the value, which is exactly how the first run of this
# script reported blank medians.
function Show([string]$label, [double[]]$ms) {
    Write-Output ('  {0,-46} median {1,7:N1} ms   min {2,7:N1}   max {3,7:N1}   n={4}' -f `
        $label, (Get-Median $ms), ($ms | Measure-Object -Minimum).Minimum, ($ms | Measure-Object -Maximum).Maximum, $ms.Count)
}

Write-Output 'WATCHDOG OVERHEAD (synthetic readings, the live snapshot is never touched)'
Write-Output ('  window dir : ' + $winDir)
Write-Output ''

# ---------- the alarm ----------
#
# Both states are measured, because both are paid. The silent one is what a healthy account pays
# on every single tool call; the alarm one is only paid while the window is spent.

. (Join-Path $work 'window-lib.ps1')
$utf8 = New-Object System.Text.UTF8Encoding($false)
$verdictFile = Join-Path $winDir 'window-verdict.txt'

# The alarm's channel IS stderr, so it is sent to nul inside cmd - in production it goes to a pipe
# Claude Code reads. Leaving it on the console would print the same line twenty times and prove
# nothing about the timing.
Write-Output '1. window-alarm.cmd - paid after EVERY tool call, in every agent'
[IO.File]::WriteAllText($verdictFile, "OK`n", $utf8)
$okMs = Measure-Runs 20 { & cmd /c "`"$alarm`" 2>nul" }
$alarmOkMedian = Get-Median $okMs
Show 'verdict OK (the normal case, exit 0, silent)' $okMs

[IO.File]::WriteAllText($verdictFile, ("ALARM WINDOW five_hour at 95% (line 85%), resets 21:00 - finish the current work item, commit, park.`n"), $utf8)
$alMs = Measure-Runs 20 { & cmd /c "`"$alarm`" 2>nul" }
$alarmAlarmMedian = Get-Median $alMs
Show 'verdict ALARM (exit 2, line on stderr)' $alMs

Remove-Item $verdictFile -Force -ErrorAction SilentlyContinue
$missMs = Measure-Runs 20 { & cmd /c "`"$alarm`" 2>nul" }
$alarmMissMedian = Get-Median $missMs
Show 'no verdict file at all (exit 0 before reading)' $missMs

# ---------- the sensor ----------

Write-Output ''
Write-Output '2. statusline.ps1 - paid once per status-line refresh'

# The stripped twin: the same file with the sensor block cut out, generated here. The block runs
# from the `try {` that opens it to the line that begins the status-bar assembly.
#
# $PSScriptRoot IS PINNED TO THE REAL WORK DIRECTORY FIRST. A twin written to TEMP resolves
# $PSScriptRoot to TEMP, so both of its dot-sources fail, the whole status line falls into its own
# last-resort catch, and the twin measures a script that gave up rather than one that ran. The
# first attempt at this measurement did exactly that and reported a twin 200 ms cheaper than the
# real thing for reasons that had nothing to do with the sensor. The sanity checks below are what
# catch it: a twin that cannot dot-source the library cannot write a snapshot either.
$t = ([IO.File]::ReadAllText($sensor)).Replace('$PSScriptRoot', ("'" + $work + "'"))
$anchor = $t.IndexOf("# THE PATH FORMULA IS THE LIBRARY'S")
$startIdx = $t.IndexOf("    try {", $anchor)
$endIdx = $t.IndexOf('    $parts = @()')
if ($anchor -lt 0 -or $startIdx -lt 0 -or $endIdx -le $startIdx) {
    Write-Output '  ABORTED: could not locate the sensor block in statusline.ps1 - the anchors moved.'
    Write-Output '  Measure the delta by hand rather than trusting a bad cut.'
    exit 1
}
$strippedText = $t.Substring(0, $startIdx) + $t.Substring($endIdx)
$stripped = Join-Path $run 'statusline-without-sensor.ps1'
[IO.File]::WriteAllText($stripped, $strippedText, $utf8)

# THE THIRD VARIANT, and it is the one the plan actually asks about. "The statusline delta with
# the verdict write" is what THIS ITEM added, not what the whole sensor block costs - the snapshot
# write was already there. So this variant keeps the snapshot write and takes out only the
# additions: the verdict composition, the named mutex and the second file write.
#
# IT IS CUT FROM THE CURRENT FILE, NEVER FROM THE PRE-ITEM ONE. The pre-item status line did not
# honour AI4GOOD_WINDOW_DIR - that arrived with this item - so running it twenty-one times would
# write synthetic readings into the founder's LIVE snapshot. That is this item's own incident, and
# it is not worth repeating for a number. Keeping Get-WindowSnapshotPath is what makes this
# variant safe, and the sanity check below proves the cut landed where it was meant to.
$mutexStart = $t.IndexOf('        $mtx = New-Object System.Threading.Mutex')
$mutexEnd = $t.IndexOf('    } catch { }', [math]::Max($mutexStart, 0))
if ($mutexStart -lt 0 -or $mutexEnd -le $mutexStart) {
    Write-Output '  ABORTED: could not locate the mutex block in statusline.ps1 - the anchors moved.'
    exit 1
}
$snapOnlyText = $t.Substring(0, $mutexStart) + @'
        [System.IO.File]::WriteAllText(
            (Get-WindowSnapshotPath),
            ($snap | ConvertTo-Json -Depth 8),
            $utf8)
'@ + "`r`n" + $t.Substring($mutexEnd)
$snapOnly = Join-Path $run 'statusline-snapshot-only.ps1'
[IO.File]::WriteAllText($snapOnly, $snapOnlyText, $utf8)

$payload = Join-Path $run 'statusline.in.json'
[IO.File]::WriteAllText($payload, (@{
            session_id     = 'overhead-measure'
            version        = 'overhead-measure'
            model          = @{ display_name = 'measure' }
            workspace      = @{ current_dir = $repo }
            context_window = @{ used_percentage = 10 }
            rate_limits    = @{
                five_hour = @{ used_percentage = 40; resets_at = [DateTimeOffset]::UtcNow.AddMinutes(90).ToUnixTimeSeconds() }
                seven_day = @{ used_percentage = 30; resets_at = [DateTimeOffset]::UtcNow.AddMinutes(5000).ToUnixTimeSeconds() }
            }
        } | ConvertTo-Json -Depth 8), $utf8)

# SANITY BEFORE NUMBERS, and every one of these has caught a wrong cut. A twin that crashed and a
# twin that legitimately writes nothing are indistinguishable by "did it write a file", so the
# status line each twin PRINTS is checked too: the real bar carries its ' | ' separators, while a
# script that fell into the last-resort catch prints the single word ai4good.
Remove-Item (Join-Path $winDir '*') -Force -ErrorAction SilentlyContinue
$strippedOut = (& cmd /c "type `"$payload`" | powershell -NoProfile -ExecutionPolicy Bypass -File `"$stripped`"") -join ' '
$strippedWrote = (Test-Path (Join-Path $winDir 'rate-limits.json'))
Write-Output ('  sanity: the stripped twin writes no snapshot .............. ' + $(if ($strippedWrote) { 'NO - the cut is wrong, the numbers below mean nothing' } else { 'confirmed' }))
Write-Output ('  sanity: the stripped twin still renders a real status bar . ' + $(if ($strippedOut -match '\|') { 'confirmed' } else { 'NO - it fell into its own catch: "' + $strippedOut.Trim() + '"' }))
Remove-Item (Join-Path $winDir '*') -Force -ErrorAction SilentlyContinue
& cmd /c "type `"$payload`" | powershell -NoProfile -ExecutionPolicy Bypass -File `"$snapOnly`"" | Out-Null
$snapOnlyRight = ((Test-Path (Join-Path $winDir 'rate-limits.json')) -and (-not (Test-Path (Join-Path $winDir 'window-verdict.txt'))))
Write-Output ('  sanity: the snapshot-only twin writes the snapshot and NOT the verdict ... ' + $(if ($snapOnlyRight) { 'confirmed' } else { 'NO - the cut is wrong, the delta below means nothing' }))
if (-not $snapOnlyRight) { Write-Output '  STOPPING: a delta measured against a broken twin is worse than no delta.'; exit 1 }

Remove-Item (Join-Path $winDir '*') -Force -ErrorAction SilentlyContinue
& cmd /c "type `"$payload`" | powershell -NoProfile -ExecutionPolicy Bypass -File `"$sensor`"" | Out-Null
$realWrote = ((Test-Path (Join-Path $winDir 'rate-limits.json')) -and (Test-Path (Join-Path $winDir 'window-verdict.txt')))
Write-Output ('  sanity: the real sensor writes both files ................. ' + $(if ($realWrote) { 'confirmed' } else { 'NO - the measurement is not measuring the sensor' }))
Write-Output ''

$withMs = Measure-Runs 20 { & cmd /c "type `"$payload`" | powershell -NoProfile -ExecutionPolicy Bypass -File `"$sensor`"" }
$withMedian = Get-Median $withMs
Show 'with the sensor block (verdict + mutex + 2 writes)' $withMs
$snapOnlyMs = Measure-Runs 20 { & cmd /c "type `"$payload`" | powershell -NoProfile -ExecutionPolicy Bypass -File `"$snapOnly`"" }
$snapOnlyMedian = Get-Median $snapOnlyMs
Show 'snapshot write only (the shape before this item)' $snapOnlyMs
$withoutMs = Measure-Runs 20 { & cmd /c "type `"$payload`" | powershell -NoProfile -ExecutionPolicy Bypass -File `"$stripped`"" }
$withoutMedian = Get-Median $withoutMs
Show 'no sensor block at all' $withoutMs

Write-Output ''
Write-Output ('  DELTA this item added - verdict + mutex + second write ... {0,7:N1} ms' -f ($withMedian - $snapOnlyMedian))
Write-Output ('  DELTA the whole sensor block costs per refresh ........... {0,7:N1} ms' -f ($withMedian - $withoutMedian))
Write-Output '  (a PowerShell process start dominates every absolute number here, so the deltas are'
Write-Output '   the honest figures; the first is the one this item is answerable for)'

# ---------- the verdict on the target ----------

$worstAlarm = [math]::Max([math]::Max($alarmOkMedian, $alarmAlarmMedian), $alarmMissMedian)
$met = if ($worstAlarm -le 100) { 'MET' } else { 'NOT MET' }
Write-Output ''
Write-Output 'TARGET: the alarm hook median at or under 100 ms.'
Write-Output ('  worst alarm median measured: {0:N1} ms -> {1}' -f $worstAlarm, $met)

$liveAfter = if (Test-Path $liveSnap) { (Get-FileHash -LiteralPath $liveSnap -Algorithm SHA256).Hash } else { '' }
Write-Output ''
Write-Output ('live snapshot hash before : ' + $liveBefore)
Write-Output ('live snapshot hash after  : ' + $liveAfter)
Write-Output ('(a difference here is the founder session refreshing it, which it does every turn;')
Write-Output (' what matters is that nothing in this run wrote to that directory - every write above')
Write-Output (' went to ' + $winDir + ')')

$env:AI4GOOD_WINDOW_DIR = $null
Remove-Item -Recurse -Force $run -ErrorAction SilentlyContinue
exit 0
