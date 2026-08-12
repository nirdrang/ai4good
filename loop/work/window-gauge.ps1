# window-gauge.ps1 - read the Anthropic usage windows and say what may proceed.
#
# WHERE THE NUMBERS COME FROM. Claude Code delivers `rate_limits` to the STATUS LINE and nowhere
# else - hooks receive a different payload entirely - so statusline.ps1 snapshots it on every
# refresh and this script reads that snapshot.
#
# ONE LINE ONLY (founder 2026-08-06): OK below the pause line, PAUSE at it, UNKNOWN when the
# reading cannot be trusted. Two consequences worth holding on to:
#   1. The reading is only as fresh as the last status-line refresh, which happens on every turn
#      of the interactive session. While the coordinator is dormant, nothing updates it - which
#      is exactly why the conductor sends a keep-alive pulse: a pulse wakes the coordinator, the
#      wake refreshes the status line, and the refresh refreshes this gauge. The heartbeat is
#      what keeps the gauge honest, not a timer inside this script.
#   2. A stale reading is NOT a low reading. Age is reported and, past the limit, the verdict is
#      UNKNOWN - never OK. Treating "I cannot see" as "all clear" is how a guard fails silently.
#
# WHAT IT DOES NOT DO. It reads and reports. It never pauses anything, never messages an agent,
# never waits. The coordinator owns every decision; this is its instrument, not a second
# authority. A gauge that acts is a brake nobody can see.
#
# The account reports two windows today (five_hour, seven_day). The binary supports three more
# (seven_day_overage_included, seven_day_sonnet, seven_day_opus) which appear on other plans, so
# every window present is evaluated by name rather than assumed - a plan change must not silently
# narrow the guard to the windows we happened to know about.

[CmdletBinding()]
param(
    # PAUSE line - founder's number (2026-08-12): stop work at 85 percent of a window. This
    # supersedes the 90 percent of 2026-08-06. The same number lives in window-wait.ps1 and in
    # shared-invariants.md; window-sim.ps1 asserts all three agree, because a guard whose copies
    # disagree stops at a different place than the process document promises.
    [int]$PauseAt = 85,

    # There is deliberately NO second, lower line (founder 2026-08-06). A "start nothing new"
    # band would have to be justified by the cost of a sitting, which nobody has measured, so it
    # could only ever be a number that felt safe. One line, and a sitting that meets it mid-flight
    # parks at its last committed work item - the per-work-item commits are the recovery.

    # Older than this and the gauge admits it cannot see, rather than reporting a stale number as
    # if it were current.
    [int]$StaleMinutes = 15,

    # Emit the machine shape instead of the human lines.
    [switch]$Json,

    # Read a different snapshot. Exists so the mechanism can be exercised end to end against
    # synthetic readings without spending a single token, and without disturbing the live file
    # the status line is writing. Defaults to the real one, so no caller has to know.
    [string]$SnapshotPath = '',

    # Exit 0 only when work may proceed (verdict OK). For use as a wait condition: the coordinator
    # parks and polls this until it succeeds, rather than sleeping on a computed duration - the
    # window is authoritative about its own reset, our arithmetic is not.
    [switch]$ExitOnReady
)

$ErrorActionPreference = 'SilentlyContinue'

$snapPath = if ($SnapshotPath) { $SnapshotPath } else { Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good\rate-limits.json' }

$result = [ordered]@{
    verdict      = 'UNKNOWN'
    reason       = ''
    # The line this reading was judged against, reported rather than copied. The stamp hook prints
    # it, so the number in front of the founder is the number the verdict used - a fourth copy in
    # the hook would be a fourth thing to drift.
    pauseAt      = $PauseAt
    worstWindow  = ''
    worstPercent = $null
    resetsAtUtc  = ''
    resetsInMin  = $null
    readingAgeMin = $null
    windows      = @()
}

function Emit($r) {
    if ($Json) {
        $r | ConvertTo-Json -Depth 6
    } else {
        $head = "WINDOW  {0}" -f $r.verdict
        if ($r.reason) { $head += "  - " + $r.reason }
        Write-Output $head
        foreach ($w in $r.windows) {
            Write-Output ("        {0,-28} {1,3}%   resets {2}  (in {3} min)" -f $w.name, $w.percent, $w.resetsLocal, $w.resetsInMin)
        }
        if ($null -ne $r.readingAgeMin) {
            Write-Output ("        reading is {0} min old" -f $r.readingAgeMin)
        }
    }
    if ($ExitOnReady) { if ($r.verdict -eq 'OK') { exit 0 } else { exit 1 } }
    exit 0
}

if (-not (Test-Path $snapPath)) {
    $result.reason = 'no reading yet - the status line has not refreshed since the sensor was installed'
    Emit $result
}

try { $snap = Get-Content $snapPath -Raw | ConvertFrom-Json } catch { $snap = $null }
if (-not $snap) {
    $result.reason = 'the snapshot could not be parsed'
    Emit $result
}

# Age first: everything below is only meaningful if the reading is current.
$ageMin = $null
try {
    $ageMin = [math]::Round(((Get-Date).ToUniversalTime() - [datetime]::Parse($snap.capturedAt).ToUniversalTime()).TotalMinutes, 1)
} catch { }
$result.readingAgeMin = $ageMin

if (-not $snap.rateLimits) {
    # The field is absent rather than the file missing - a real answer, and a different one.
    $result.reason = 'this build reports no usage windows'
    Emit $result
}

$now = Get-Date
foreach ($name in $snap.rateLimits.PSObject.Properties.Name) {
    $w = $snap.rateLimits.$name
    if ($null -eq $w.used_percentage) { continue }
    # The percentages arrive as floats carrying binary noise - 7 comes through as
    # 7.000000000000001 - so round before any comparison or a threshold test misbehaves
    # exactly at the boundary, which is the one place it must not.
    $pct = [int][math]::Round([double]$w.used_percentage)
    $resetLocal = $null; $inMin = $null; $resetUtc = ''
    if ($null -ne $w.resets_at) {
        try {
            $dto = [DateTimeOffset]::FromUnixTimeSeconds([int64]$w.resets_at)
            $resetLocal = $dto.LocalDateTime
            $resetUtc = $dto.UtcDateTime.ToString('o')
            $inMin = [int][math]::Round(($resetLocal - $now).TotalMinutes)
        } catch { }
    }
    # A PSCustomObject, NOT a hashtable: `Sort-Object percent` below silently does nothing to
    # dictionary entries, because a dictionary has no such property. That bug shipped, and the
    # live reading hid it - the worst window was simply whichever enumerated first, which
    # happened to be the right answer. A weekly window at 95% beside a fresh five-hour one read
    # OK. Found by window-sim.ps1 on its first run.
    $result.windows += [pscustomobject][ordered]@{
        name        = $name
        percent     = $pct
        resetsLocal = $(if ($resetLocal) { $resetLocal.ToString('HH:mm') } else { '?' })
        resetsInMin = $inMin
        resetsAtUtc = $resetUtc
    }
}

if ($result.windows.Count -eq 0) {
    $result.reason = 'no window carried a usable percentage'
    Emit $result
}

# The binding constraint is whichever window is furthest along, not the five-hour one by habit.
$worst = $result.windows | Sort-Object percent -Descending | Select-Object -First 1
$result.worstWindow  = $worst.name
$result.worstPercent = $worst.percent
$result.resetsAtUtc  = $worst.resetsAtUtc
$result.resetsInMin  = $worst.resetsInMin

if ($null -eq $ageMin) {
    # An UNDATABLE reading - `capturedAt` missing, empty or unparseable. Before this rule the
    # gauge skipped every staleness test here and scored the reading on its percentage alone, so a
    # corrupt file holding a low number read OK for ever. A reading nobody can date is a reading
    # nobody can trust: it says UNKNOWN. It says PAUSE instead when the number is over the line,
    # because a window only climbs, so an over-the-line reading of any age proves a floor.
    if ($worst.percent -ge $PauseAt) {
        $result.verdict = 'PAUSE'
        $result.reason  = ("{0} at {1}% (pause line {2}%) - the reading carries no usable capture time, and a window only climbs" -f `
            $worst.name, $worst.percent, $PauseAt)
        Emit $result
    }
    $result.verdict = 'UNKNOWN'
    $result.reason  = 'the reading carries no usable capture time, so its age cannot be judged - treat as unknown, never as low'
    Emit $result
}

if ($ageMin -gt $StaleMinutes) {
    # A stale reading proves a FLOOR, not a level: inside one window the figure only ever climbs.
    # So if the reading was already over the line AND its own window has not reset since, the
    # level still stands and parking is the evidenced answer, not a cautious guess. Only once the
    # reset has passed does the old number stop meaning anything - that is the case where we
    # genuinely cannot say, and where a low stale reading always sat, since it may have climbed.
    if ($worst.percent -ge $PauseAt -and $null -ne $worst.resetsInMin -and $worst.resetsInMin -gt 0) {
        $result.verdict = 'PAUSE'
        $result.reason  = ("{0} at {1}% (pause line {2}%) - reading is {3} min old, but that window has not reset, and a window only climbs" -f `
            $worst.name, $worst.percent, $PauseAt, $ageMin)
        Emit $result
    }
    $result.verdict = 'UNKNOWN'
    $result.reason  = ("last reading is {0} min old (limit {1}) - treat as unknown, never as low" -f $ageMin, $StaleMinutes)
    Emit $result
}

if ($worst.percent -ge $PauseAt) {
    $result.verdict = 'PAUSE'
    $result.reason  = ("{0} at {1}% (pause line {2}%) - resets {3}" -f $worst.name, $worst.percent, $PauseAt, $worst.resetsLocal)
} else {
    $result.verdict = 'OK'
    $result.reason  = ("{0} at {1}%" -f $worst.name, $worst.percent)
}

Emit $result
