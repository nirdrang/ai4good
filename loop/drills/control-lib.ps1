# The checkable mechanics the relay contracts rely on, extracted so drills can prove them.
# Dot-source and use in the SAME tool call - PowerShell keeps no state between calls.

function Start-DetachedActor {
    # Survives-the-launcher launch: the one shape allowed for anything that must outlive its parent.
    param([string]$ActorScript, [string]$Mode, [string]$Dir)
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass',
        '-File', $ActorScript, '-Mode', $Mode, '-Dir', $Dir
    ) -WindowStyle Hidden -PassThru
    return $p.Id
}

function Get-ActorLiveness {
    # Liveness is process presence + output GROWTH across an interval.
    # Never file existence: an empty output file looks identical to a reviewer starting up.
    param([int]$ProcessId, [string]$LogFile, [int]$IntervalMs = 1200)
    $len1 = 0
    if (Test-Path $LogFile) { $len1 = (Get-Item $LogFile).Length }
    Start-Sleep -Milliseconds $IntervalMs
    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    $len2 = 0
    if (Test-Path $LogFile) { $len2 = (Get-Item $LogFile).Length }
    if (-not $proc) { return 'Dead' }
    if ($len2 -gt $len1) { return 'Alive-Working' }
    return 'Alive-Stalled'
}

function Wait-TwoChannel {
    # The two-channel wait: the actor's own notify signal AND a backstop watch on the artifact.
    # Either alone completes the wait; expiry is a LOUD distinct value, never a silent nothing.
    param([string]$NotifyFile, [string]$ResultFile, [int]$TimeoutSec)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $NotifyFile) { return 'notify' }
        if (Test-Path $ResultFile) { return 'backstop' }
        Start-Sleep -Milliseconds 200
    }
    return 'EXPIRED'
}

function Get-SpawnFailureClass {
    # A spawn error is classified into a NAMED stall, never improvised around.
    param([string]$ErrorText)
    if ($ErrorText -match 'not found') { return 'STALL:STALE-REGISTRY' }
    return 'STALL:UNKNOWN'
}

function Get-ResumeState {
    # After an abrupt death, the state on DISK decides - never the actor's claim about itself.
    param([string]$Dir)
    $log    = Join-Path $Dir 'actor.log'
    $result = Join-Path $Dir 'result.txt'
    if (Test-Path $result) { return 'COMPLETE' }
    if (Test-Path $log) {
        $last = Get-Content $log | Select-Object -Last 1
        return "RESUME-FROM:$last"
    }
    return 'RESTART'
}
