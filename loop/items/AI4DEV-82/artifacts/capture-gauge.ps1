# capture-gauge.ps1 - capture the FULL CLI surface of window-gauge.ps1 over a fixed synthetic set.
#
# WHY IT EXISTS (gate 1 finding 2, AI4DEV-82). window-sim.ps1 asserts selected JSON properties and
# throws the human output away, so a green sim does not prove that extracting the verdict logic
# into a library moved nothing. This captures EVERY byte the CLI emits - human lines, JSON, exit
# codes, in every mode - over a fixed set of synthetic snapshots. Run once BEFORE the extraction
# and once AFTER; the two files must be identical.
#
# WHAT IS NORMALISED, AND WHY. Two families of number move with the wall clock between the two
# runs and carry no behavioural meaning:
#   - the reading age (readingAgeMin, and the same number quoted inside a reason sentence), which
#     grows by one per minute because capturedAt is written at capture time;
#   - the minutes until reset (resetsInMin, and the same number in the human "(in N min)" column),
#     which counts down toward the FIXED absolute reset timestamps below.
# Both are replaced by <NORM>. Everything else - verdicts, reasons, window names, percentages,
# the local reset time, resetsAtUtc, line layout and exit codes - is compared byte for byte.
#
# The reset timestamps are FIXED absolute instants rather than offsets from now, so the local
# HH:mm the human line prints and the resetsAtUtc the JSON prints are stable across runs.
#
# The captures are pinned to the pause line the gauge DEFAULTS to. No -PauseAt is passed on
# purpose: a refactor that changed the default must show up as a diff. Both halves of the
# AI4DEV-82 capture-diff were therefore taken while that default was 90.
#
# Run: powershell -NoProfile -File loop/items/AI4DEV-82/artifacts/capture-gauge.ps1 -Out <file>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Out,
    [string]$Label = ''
)

$ErrorActionPreference = 'SilentlyContinue'
$here  = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo  = (Resolve-Path (Join-Path $here '..\..\..\..')).Path
$gauge = Join-Path $repo 'loop\work\window-gauge.ps1'
$snap  = Join-Path $env:TEMP ('gauge-capture-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.json')

# Fixed instants, so every reset-derived STRING is stable between the two runs.
$futureReset = [DateTimeOffset]::Parse('2026-12-31T12:00:00Z').ToUnixTimeSeconds()

function Set-Snapshot([hashtable]$windows, [double]$ageMinutes) {
    $o = [ordered]@{
        capturedAt = (Get-Date).ToUniversalTime().AddMinutes(-$ageMinutes).ToString('o')
        sessionId  = 'capture'
        version    = 'capture'
        rateLimits = $windows
    }
    [IO.File]::WriteAllText($snap, ($o | ConvertTo-Json -Depth 6))
}
function Set-Raw([string]$text) { [IO.File]::WriteAllText($snap, $text) }
function Remove-Snapshot() { Remove-Item $snap -Force -ErrorAction SilentlyContinue }

function Normalize([string]$text) {
    $n = $text
    $n = [regex]::Replace($n, '"readingAgeMin"\s*:\s*-?[0-9]+(\.[0-9]+)?', '"readingAgeMin":  <NORM>')
    $n = [regex]::Replace($n, '"resetsInMin"\s*:\s*-?[0-9]+(\.[0-9]+)?', '"resetsInMin":  <NORM>')
    $n = [regex]::Replace($n, '\(in -?[0-9]+(\.[0-9]+)? min\)', '(in <NORM> min)')
    $n = [regex]::Replace($n, 'reading is -?[0-9]+(\.[0-9]+)? min old', 'reading is <NORM> min old')
    return $n
}

# The fixed synthetic set named in step 1's done-criterion.
$cases = [ordered]@{
    'ok'              = { Set-Snapshot @{ five_hour = @{ used_percentage = 50; resets_at = $futureReset } } 0 }
    'pause'           = { Set-Snapshot @{ five_hour = @{ used_percentage = 95; resets_at = $futureReset } } 0 }
    'stale-high'      = { Set-Snapshot @{ five_hour = @{ used_percentage = 97; resets_at = $futureReset } } 60 }
    'stale-low'       = { Set-Snapshot @{ five_hour = @{ used_percentage = 40; resets_at = $futureReset } } 60 }
    'missing-file'    = { Remove-Snapshot }
    'unparseable'     = { Set-Raw 'this is not json {{{' }
    'no-rate-limits'  = { Set-Raw '{"capturedAt":"2026-08-07T00:00:00Z","rateLimits":null}' }
}

# Every mode the CLI has: human lines, JSON, and the wait-condition exit code in both shapes.
$modes = [ordered]@{
    'human'                = @()
    'json'                 = @('-Json')
    'exitonready-human'    = @('-ExitOnReady')
    'exitonready-json'     = @('-Json', '-ExitOnReady')
}

$lines = @()
$lines += '# window-gauge.ps1 CLI capture'
if ($Label) { $lines += ('# label: ' + $Label) }
$lines += '# normalised: readingAgeMin, resetsInMin, "(in N min)", "reading is N min old"'
$lines += ''

try {
    foreach ($caseName in $cases.Keys) {
        & $cases[$caseName]
        foreach ($modeName in $modes.Keys) {
            $args = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $gauge) + $modes[$modeName] + @('-SnapshotPath', $snap)
            $stdout = @(& powershell @args)
            $code = $LASTEXITCODE
            $lines += ('===== case={0} mode={1} =====' -f $caseName, $modeName)
            $lines += ('exit={0}' -f $code)
            foreach ($l in $stdout) { $lines += (Normalize ([string]$l)) }
            $lines += ''
        }
    }
}
finally {
    Remove-Snapshot
}

[IO.File]::WriteAllText($Out, (($lines -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
Write-Output ('captured {0} bytes to {1}' -f (Get-Item $Out).Length, $Out)
