# window-gauge.ps1 - read the Anthropic usage windows and say what may proceed.
#
# WHERE THE NUMBERS COME FROM. Claude Code delivers `rate_limits` to the STATUS LINE and nowhere
# else - hooks receive a different payload entirely - so statusline.ps1 snapshots it on every
# refresh and this script reads that snapshot.
#
# ONE LINE ONLY (founder 2026-08-06, the number moved to 85 on 2026-08-12): OK below the pause
# line, PAUSE at it, UNKNOWN when the reading cannot be trusted. Two consequences worth holding
# on to:
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
# THE VERDICT LOGIC LIVES IN window-lib.ps1. This file is the COMMAND LINE over it: the flags, the
# human lines and the exit codes. The status line must compute the same verdict in its own
# process (it cannot afford a second powershell spawn per refresh) and so must the spawn gate and
# the prompt stamp, so the logic is a library and every reader calls it. One implementation, or
# the readers drift - which is a failure this repository has already had once.
#
# The account reports two windows today (five_hour, seven_day). The binary supports three more
# (seven_day_overage_included, seven_day_sonnet, seven_day_opus) which appear on other plans, so
# every window present is evaluated by name rather than assumed - a plan change must not silently
# narrow the guard to the windows we happened to know about.

[CmdletBinding()]
param(
    # PAUSE line - founder's number (2026-08-12): stop work at 85 percent of a window. This
    # supersedes the 90 of 2026-08-06; only the number moved, the one-line principle below is
    # unchanged. The same number is window-lib.ps1's own default, for the readers that call the
    # library directly.
    [int]$PauseAt = 85,

    # There is deliberately NO second, lower line (founder 2026-08-06). A "start nothing new" band
    # would have to be justified by the cost of a sitting, which nobody has measured, so it
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

. (Join-Path $PSScriptRoot 'window-lib.ps1')

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

Emit (Get-WindowVerdict -SnapshotPath $SnapshotPath -PauseAt $PauseAt -StaleMinutes $StaleMinutes)
