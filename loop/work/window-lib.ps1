# window-lib.ps1 - ONE implementation of the usage-window verdict, shared by every reader.
#
# WHY A LIBRARY. The verdict is now read in four places: the gauge CLI, the status line (which is
# the only place Claude Code delivers the numbers), the spawn gate, and the prompt stamp. The
# status line must compute it IN PROCESS - its cost doctrine forbids a second powershell spawn per
# refresh - so a copy of the logic inside statusline.ps1 was the obvious move and is exactly the
# drift class this project has already paid for once (statusline.ps1's own header records it:
# code that reimplemented an API instead of calling it, and grepping for the API missed it).
# So there is one body of logic here, and every reader calls it.
#
# WHAT IS HERE AND WHAT IS NOT. This file computes and formats. It never decides, never messages,
# never waits, never writes a file. The gauge CLI owns the human lines and the exit codes; the
# sensor owns the files; the gate owns the deny. A library that acted would be a brake nobody can
# see.
#
# THE VERDICT LOGIC IS UNCHANGED. Get-WindowVerdict is window-gauge.ps1's body, moved verbatim
# apart from returning the result instead of printing it. The one-time proof that the move changed
# nothing is the capture-diff in loop/items/AI4DEV-82/artifacts/ (every byte of the CLI surface
# over a fixed synthetic set, before and after); window-sim.ps1 remains the permanent net.

# THE PAUSE LINE - founder's number (2026-08-12): stop work at 85 percent of a window. This
# supersedes the 90 of 2026-08-06; only the NUMBER moved. The principle behind it stands
# unchanged: ONE line, no lower "start nothing new" band - alarm and park are the same line.
#
# The number appears in three param defaults: here (every library caller), window-gauge.ps1 and
# window-wait.ps1 (their CLI defaults, which callers pass through). They move together, and
# window-sim.ps1 pins the gauge's default at exactly 84/85 so a half-moved line goes red.
$script:WindowPauseLine = 85

# Older than this and the reading is admitted to be unreadable rather than reported as current.
$script:WindowStaleMinutes = 15

# WHERE THE FILES LIVE. One formula, so the sensor that writes and the four readers that read can
# never disagree about the path. AI4GOOD_WINDOW_DIR redirects the whole directory: it exists so
# the drill can exercise the mechanism end to end against synthetic readings without touching the
# live snapshot the founder's status line is writing. The drill asserts its own directory is not
# the live one.
function Get-WindowDir {
    if ($env:AI4GOOD_WINDOW_DIR) { return $env:AI4GOOD_WINDOW_DIR }
    return (Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good')
}
function Get-WindowSnapshotPath { return (Join-Path (Get-WindowDir) 'rate-limits.json') }
function Get-WindowVerdictPath { return (Join-Path (Get-WindowDir) 'window-verdict.txt') }

# Get-WindowVerdict - the whole verdict, from a snapshot OBJECT (the status line has one in
# memory) or from a snapshot PATH (everyone else). Returns the result shape window-gauge.ps1 has
# always emitted, so -Json output is byte-identical.
function Get-WindowVerdict {
    [CmdletBinding()]
    param(
        # An already-parsed snapshot. Wins over -SnapshotPath when supplied.
        $Snapshot = $null,

        # Read a different snapshot. Empty means the live one (or whatever AI4GOOD_WINDOW_DIR says).
        [string]$SnapshotPath = '',

        [int]$PauseAt = $script:WindowPauseLine,

        [int]$StaleMinutes = $script:WindowStaleMinutes
    )

    # Function-scoped on purpose. A caller running under 'Stop' - the stamp hook does - must not
    # turn a tolerated read failure here into a thrown exception, and this restores on return.
    $ErrorActionPreference = 'SilentlyContinue'

    $result = [ordered]@{
        verdict      = 'UNKNOWN'
        reason       = ''
        worstWindow  = ''
        worstPercent = $null
        resetsAtUtc  = ''
        resetsInMin  = $null
        readingAgeMin = $null
        windows      = @()
    }

    $snap = $Snapshot
    if ($null -eq $Snapshot) {
        $snapPath = if ($SnapshotPath) { $SnapshotPath } else { Get-WindowSnapshotPath }

        if (-not (Test-Path $snapPath)) {
            $result.reason = 'no reading yet - the status line has not refreshed since the sensor was installed'
            return $result
        }

        try { $snap = Get-Content $snapPath -Raw | ConvertFrom-Json } catch { $snap = $null }
        if (-not $snap) {
            $result.reason = 'the snapshot could not be parsed'
            return $result
        }
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
        return $result
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
        return $result
    }

    # The binding constraint is whichever window is furthest along, not the five-hour one by habit.
    $worst = $result.windows | Sort-Object percent -Descending | Select-Object -First 1
    $result.worstWindow  = $worst.name
    $result.worstPercent = $worst.percent
    $result.resetsAtUtc  = $worst.resetsAtUtc
    $result.resetsInMin  = $worst.resetsInMin

    if ($null -ne $ageMin -and $ageMin -gt $StaleMinutes) {
        # A stale reading proves a FLOOR, not a level: inside one window the figure only ever climbs.
        # So if the reading was already over the line AND its own window has not reset since, the
        # level still stands and parking is the evidenced answer, not a cautious guess. Only once the
        # reset has passed does the old number stop meaning anything - that is the case where we
        # genuinely cannot say, and where a low stale reading always sat, since it may have climbed.
        if ($worst.percent -ge $PauseAt -and $null -ne $worst.resetsInMin -and $worst.resetsInMin -gt 0) {
            $result.verdict = 'PAUSE'
            $result.reason  = ("{0} at {1}% (pause line {2}%) - reading is {3} min old, but that window has not reset, and a window only climbs" -f `
                $worst.name, $worst.percent, $PauseAt, $ageMin)
            return $result
        }
        $result.verdict = 'UNKNOWN'
        $result.reason  = ("last reading is {0} min old (limit {1}) - treat as unknown, never as low" -f $ageMin, $StaleMinutes)
        return $result
    }

    if ($worst.percent -ge $PauseAt) {
        $result.verdict = 'PAUSE'
        $result.reason  = ("{0} at {1}% (pause line {2}%) - resets {3}" -f $worst.name, $worst.percent, $PauseAt, $worst.resetsLocal)
    } else {
        $result.verdict = 'OK'
        $result.reason  = ("{0} at {1}%" -f $worst.name, $worst.percent)
    }

    return $result
}

# Format-WindowVerdictLine - the ONE line the sensor writes to window-verdict.txt.
#
# EXACTLY ONE LINE, three forms, and the FIRST TOKEN is the machine anchor - window-alarm.cmd
# matches it with `findstr /b`, which is all a per-tool checkpoint can afford:
#
#   OK
#   ALARM WINDOW <window> at <pct>% (line <n>%), resets <HH:mm> - finish the current work item, commit, park.
#   UNKNOWN <reason>
#
# The rest of the ALARM form is the whole sentence the model hears. The sensor composes it once
# per refresh; the checkpoint regurgitates it. Nothing downstream has to know how to phrase a
# window alarm, which is what keeps the wording in one place.
function Format-WindowVerdictLine {
    [CmdletBinding()]
    param(
        $Verdict,
        [int]$PauseAt = $script:WindowPauseLine
    )

    if ($null -eq $Verdict) { return 'UNKNOWN no verdict was computed' }

    $v = [string]$Verdict.verdict
    if ($v -eq 'OK') { return 'OK' }

    if ($v -eq 'PAUSE') {
        # The reset time belongs to the window that BLOCKED. Reporting another window's reset would
        # point the reader at the wrong clock, which on this account is up to eighty hours out.
        $reset = '?'
        foreach ($w in @($Verdict.windows)) {
            if (([string]$w.name) -eq ([string]$Verdict.worstWindow)) { $reset = [string]$w.resetsLocal; break }
        }
        return ('ALARM WINDOW {0} at {1}% (line {2}%), resets {3} - finish the current work item, commit, park.' -f `
            $Verdict.worstWindow, $Verdict.worstPercent, $PauseAt, $reset)
    }

    # Newlines are stripped rather than trusted: a one-line contract that can be broken by its own
    # payload is not a contract, and the alarm anchors on the first token of the first line.
    $reason = (([string]$Verdict.reason) -replace '[\r\n]', ' ').Trim()
    if (-not $reason) { $reason = 'the reading cannot be trusted' }
    return ('UNKNOWN ' + $reason)
}
