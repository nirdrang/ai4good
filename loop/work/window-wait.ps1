# window-wait.ps1 - block until the usage window has reopened, then exit 0.
#
# HOW IT IS MEANT TO BE USED. Run it as a BACKGROUND command. Its exit re-invokes the session,
# which is the whole trick: the coordinator parks, this waits without spending anything, and the
# founder's session continues in the same conversation with its context intact. Nothing is
# resumed, nothing is restarted, no scheduled task is involved.
#
# WHY IT WAITS ON THE CLOCK AND NOT ON THE GAUGE. The gauge is refreshed by the status line, and
# the status line only renders when the session takes a turn. A parked session takes no turns -
# so during exactly the period this script is waiting, the reading it would like to poll is
# frozen. Polling it alone would wait forever on a number that cannot change.
#
# So the wait is anchored on `resets_at`, which the provider states and which is true whether or
# not anyone is looking. The gauge is still read every poll, because if some OTHER session in the
# account renders its status line the snapshot updates and we can leave early - but the clock is
# what guarantees an exit.
#
# THIS SCRIPT CANNOT CLEAR THE WINDOW, ONLY OBSERVE THAT IT SHOULD HAVE. Its exit means "the
# stated reset time has passed", not "you have budget". The work skill already warns why that
# distinction bites: a reset time that is already past rolls forward a full day, and a session
# limit is not the same thing as being out of credit. **The caller MUST re-read the gauge on its
# first turn after this exits** - that turn renders the status line, so it is the first genuinely
# fresh reading available - and park again if it still says PAUSE.
#
# Exit 0: the window should be open, go and confirm. Exit 1: gave up (see -MaxHours), which is a
# report to the founder, never a licence to carry on regardless.

[CmdletBinding()]
param(
    # How often to look. A parked session is spending nothing, so there is no reason to poll
    # hard; a minute is far below the resolution of a five-hour window.
    [int]$PollSeconds = 60,

    # Refuse to wait longer than this. A five-hour window cannot need more, so exceeding it means
    # the blocking window is a WEEKLY one - days away, which is a founder decision about what to
    # do next, not something a script should sit through silently.
    [double]$MaxHours = 6,

    # Passed through, so a caller testing the mechanism can move the line without editing code.
    [int]$PauseAt = 90,

    # Passed through: exercise the park against a synthetic snapshot, spending nothing.
    [string]$SnapshotPath = '',

    # Grace past the stated reset before releasing. A reset is a boundary the provider crosses,
    # not an instant we control, so releasing on the exact second risks arriving early. Only the
    # simulation sets this to zero, to cross a boundary in seconds instead of a minute.
    [double]$SlackMinutes = 1
)

$ErrorActionPreference = 'SilentlyContinue'
$gauge = Join-Path $PSScriptRoot 'window-gauge.ps1'

function Read-Gauge {
    try {
        $a = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$gauge,'-Json','-PauseAt',$PauseAt)
        if ($SnapshotPath) { $a += @('-SnapshotPath', $SnapshotPath) }
        $raw = & powershell @a
        return ($raw | ConvertFrom-Json)
    } catch { return $null }
}

$started  = Get-Date
$deadline = $started.AddHours($MaxHours)

$g = Read-Gauge
if (-not $g) {
    Write-Output 'WAIT  abandoned - the gauge could not be read at all'
    exit 1
}

if ($g.verdict -eq 'OK') {
    Write-Output ("WAIT  nothing to wait for - " + $g.reason)
    exit 0
}

# The target comes from the provider's own statement of when this window resets. A minute of
# slack because the reset is a boundary, not an instant we control.
$target = $null
if ($g.resetsAtUtc) { try { $target = ([datetime]::Parse($g.resetsAtUtc)).ToUniversalTime().AddMinutes($SlackMinutes) } catch { } }
if (-not $target) {
    Write-Output 'WAIT  abandoned - no reset time in the reading, so there is nothing to wait for'
    exit 1
}

Write-Output ("WAIT  parked on {0} at {1}% - reset stated for {2} local" -f `
    $g.worstWindow, $g.worstPercent, ([datetime]$target).ToLocalTime().ToString('HH:mm'))

$lastSaid = Get-Date
while ($true) {
    $now = (Get-Date).ToUniversalTime()

    if ($now -ge $target) {
        Write-Output 'WAIT  the stated reset time has passed - re-read the gauge before releasing work'
        exit 0
    }

    if ((Get-Date) -ge $deadline) {
        Write-Output ("WAIT  gave up after {0}h - the blocking window is {1}, which resets {2} local. This is a founder decision, not something to wait out." -f `
            $MaxHours, $g.worstWindow, ([datetime]$target).ToLocalTime().ToString('ddd HH:mm'))
        exit 1
    }

    # Another session in the account may have rendered its status line, which refreshes the shared
    # snapshot. If it now reads clear, there is no reason to keep sitting here.
    $fresh = Read-Gauge
    if ($fresh -and $fresh.verdict -eq 'OK') {
        Write-Output ("WAIT  cleared early - " + $fresh.reason)
        exit 0
    }

    # Say something every ten minutes. Silence and progress look identical, and a wait that never
    # speaks is indistinguishable from a wait that died.
    if (((Get-Date) - $lastSaid).TotalMinutes -ge 10) {
        $left = [int]([math]::Ceiling(($target - $now).TotalMinutes))
        Write-Output ("WAIT  still parked - about {0} min to the stated reset" -f $left)
        $lastSaid = Get-Date
    }

    Start-Sleep -Seconds $PollSeconds
}
