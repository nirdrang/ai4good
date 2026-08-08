# The checkable mechanics the relay contracts rely on, extracted so drills can prove them.
# Dot-source and use in the SAME tool call - PowerShell keeps no state between calls.
# v2 (2026-08-09): commencement, phase-event fencing, strict landing, CI outcomes, close repair -
# built from the codex sol review at loop/drills/records/codex-sol-review-2026-08-09.md.

function Start-DetachedActor {
    # Survives-the-launcher launch: the one shape allowed for anything that must outlive its parent.
    param([string]$ActorScript, [string]$Mode, [string]$Dir, [string]$Out, [string]$Err)
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass',
                 '-File', $ActorScript, '-Mode', $Mode, '-Dir', $Dir)
    if ($Out) { $argList += @('-Out', $Out) }
    if ($Err) { $argList += @('-Err', $Err) }
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -WindowStyle Hidden -PassThru
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
    # v2: the backstop requires CONTENT, not existence - a zero-byte result must never complete a
    # wait (codex finding: mere file existence made the backstop unsafe). Expiry stays a LOUD
    # distinct value, never a silent nothing.
    param([string]$NotifyFile, [string]$ResultFile, [int]$TimeoutSec, [string]$TerminalPattern = '\S')
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $NotifyFile) { return 'notify' }
        if ((Test-Path $ResultFile) -and ((Get-Item $ResultFile).Length -gt 0) -and
            (Select-String -Path $ResultFile -Pattern $TerminalPattern -Quiet)) { return 'backstop' }
        Start-Sleep -Milliseconds 200
    }
    return 'EXPIRED'
}

function Get-SpawnFailureClass {
    # A spawn error is classified into a NAMED stall, never improvised around.
    # v2: the match is scoped to the agent-registry error - a plain "file not found" is not a
    # stale registry (codex finding: the broad match misclassified unrelated errors).
    param([string]$ErrorText)
    if ($ErrorText -match '(?i)agent type.{0,40}not found') { return 'STALL:STALE-REGISTRY' }
    # The platform's live rejection reads "No agent named '<id>' is reachable" - affirmative
    # phrasing, so the match anchors on the whole shape, not on the word "not".
    if ($ErrorText -match '(?i)no agent named.{0,60}reachable|not reachable') { return 'STALL:UNREACHABLE' }
    return 'STALL:UNKNOWN'
}

function Get-ResumeState {
    # After an abrupt death, the state on DISK decides - never the actor's claim about itself.
    # v2: an EMPTY result file is not COMPLETE (codex finding: die-at-launch leaves exactly that).
    param([string]$Dir)
    $log    = Join-Path $Dir 'actor.log'
    $result = Join-Path $Dir 'result.txt'
    if ((Test-Path $result) -and ((Get-Item $result).Length -gt 0)) { return 'COMPLETE' }
    if (Test-Path $log) {
        $last = Get-Content $log | Select-Object -Last 1
        return "RESUME-FROM:$last"
    }
    return 'RESTART'
}

# ---------- v2: commencement - the lost-day class ----------

function Invoke-Commencement {
    # The coordinator's commencement deadline: a spawned conductor must produce its first flow
    # line within the deadline, or the claim has no clock owner and that is a STARTUP STALL now.
    # $Spawn returns @{ok=bool; error=string; taskId=string; procId=int}.
    param([scriptblock]$Spawn, [string]$FlowLineFile, [int]$DeadlineSec, [string]$TranscriptFile)
    $r = & $Spawn
    if (-not $r.ok) { return @{ state = 'STARTUP-STALL'; why = 'SPAWN-REJECTED'; error = $r.error } }
    if (-not $r.taskId) { return @{ state = 'STARTUP-STALL'; why = 'NO-RECEIPT'; error = 'spawn returned no task identity' } }
    $deadline = (Get-Date).AddSeconds($DeadlineSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $FlowLineFile) { return @{ state = 'COMMENCED' } }
        Start-Sleep -Milliseconds 200
    }
    $alive = $false
    if ($r.procId) { $alive = [bool](Get-Process -Id $r.procId -ErrorAction SilentlyContinue) }
    if (-not $alive) { return @{ state = 'STARTUP-STALL'; why = 'DEAD-TASK' } }
    $len1 = 0; if ($TranscriptFile -and (Test-Path $TranscriptFile)) { $len1 = (Get-Item $TranscriptFile).Length }
    Start-Sleep -Milliseconds 500
    $len2 = 0; if ($TranscriptFile -and (Test-Path $TranscriptFile)) { $len2 = (Get-Item $TranscriptFile).Length }
    if ($len2 -gt $len1) { return @{ state = 'STARTUP-STALL'; why = 'COMMENCING-LATE' } }
    return @{ state = 'STARTUP-STALL'; why = 'SETUP-SILENT' }
}

function Register-Commencement {
    # The single-conductor fence: a second commencement for the same item while one is unresolved
    # must be refused, or a lost spawn receipt breeds two conductors.
    param([string]$Dir, [string]$Item)
    $f = Join-Path $Dir "commence-$Item.fence"
    if (Test-Path $f) { return $false }
    New-Item -ItemType File -Path $f -Force | Out-Null
    return $true
}

function Confirm-WatchArmed {
    # Arming is not firing: a watch is armed only when its task EXISTS and is RUNNING, verified
    # by an outside probe - never by the fact that an arming call was made.
    param([string]$TaskId, [scriptblock]$Probe)
    if (-not $TaskId) { return 'STALL:WATCH-NOT-ARMED' }
    $state = & $Probe
    if ($state -ne 'running') { return 'STALL:WATCH-NOT-ARMED' }
    return "ARMED:$TaskId"
}

# ---------- v2: hand-off fencing ----------

function New-PhaseLedger {
    @{ seen = @{}; order = New-Object System.Collections.ArrayList }
}

function Register-PhaseEvent {
    # Exactly-once phase advancement: two wake channels may both fire, in either order, and a
    # late duplicate may arrive after the next phase started - only the FIRST event of a
    # generation advances anything.
    param($Ledger, [string]$Generation, [string]$Channel)
    if ($Ledger.seen.ContainsKey($Generation)) {
        return @{ advance = $false; reason = "duplicate for $Generation via $Channel" }
    }
    $Ledger.seen[$Generation] = $Channel
    [void]$Ledger.order.Add($Generation)
    return @{ advance = $true; channel = $Channel }
}

function Test-TipMoved {
    # The backstop watch compares against the head captured BEFORE the spawn - a baseline taken
    # after arming misses a sitting that finished inside the spawn-to-watch gap.
    param([string]$BaselineHead, [string]$CurrentHead)
    return ($BaselineHead -ne $CurrentHead)
}

function Test-SittingGeneration {
    # No next actor starts until the state file, the completion report and the remote tip all
    # describe the same sitting generation.
    param([string]$StateGeneration, [string]$ReportedHead, [string]$RemoteHead)
    if (-not $StateGeneration -or -not $ReportedHead) { return 'HOLD:MISSING' }
    if ($ReportedHead -ne $RemoteHead) { return 'HOLD:HEAD-MISMATCH' }
    return 'PROCEED'
}

function Test-Orphan {
    param([int]$ParentProcessId, [int]$ChildProcessId)
    $parent = Get-Process -Id $ParentProcessId -ErrorAction SilentlyContinue
    $child  = Get-Process -Id $ChildProcessId -ErrorAction SilentlyContinue
    if (-not $parent -and $child) { return 'ORPHANED' }
    if ($parent -and $child) { return 'SUPERVISED' }
    return 'GONE'
}

function Get-ProcessIdentity {
    # A pid is a number that gets recycled; identity is pid + start time. Recording it at launch
    # is what makes a later wait or abort provably hit the right process.
    param([int]$ProcessId)
    $p = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $p) { return $null }
    return @{ Id = $ProcessId; Start = $p.StartTime }
}

function Test-SameProcess {
    param([int]$ProcessId, [datetime]$RecordedStart)
    $p = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $p) { return $false }
    return ([math]::Abs(($p.StartTime - $RecordedStart).TotalSeconds) -lt 1)
}

# ---------- v2: strict review landing ----------

function Wait-ReviewLanding {
    # The landing test, hardened: a gate has landed only when a STRICT count line exists in a
    # file written AFTER this launch, the process has exited, and the file is size-stable.
    # An alive process with a count line is a partial verdict, not a landing. A count line only
    # in stderr is AMBIGUOUS, never clean. A stale file from a previous run can never land.
    param([string]$Out, [string]$Err, [int]$ProcessId, [datetime]$LaunchTime,
          [int]$TimeoutSec, [int]$SettleMs = 1200)
    $grammar = '^(PLAN REVIEW|CODE REVIEW|AUDIT): (\d+ FINDINGS|CLEAN)\s*$'
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $alive = [bool](Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
        $freshOut = (Test-Path $Out) -and ((Get-Item $Out).LastWriteTime -gt $LaunchTime) -and ((Get-Item $Out).Length -gt 0)
        $hitOut = $freshOut -and (Select-String -Path $Out -Pattern $grammar -Quiet)
        if ($hitOut -and -not $alive) {
            $len1 = (Get-Item $Out).Length
            Start-Sleep -Milliseconds $SettleMs
            $len2 = (Get-Item $Out).Length
            if ($len1 -eq $len2 -and (Select-String -Path $Out -Pattern $grammar -Quiet)) {
                return 'LANDED'
            }
            continue
        }
        if (-not $alive -and -not $hitOut) {
            $freshErr = (Test-Path $Err) -and ((Get-Item $Err).LastWriteTime -gt $LaunchTime) -and ((Get-Item $Err).Length -gt 0)
            if ($freshErr -and (Select-String -Path $Err -Pattern $grammar -Quiet)) {
                return 'AMBIGUOUS:COUNT-IN-STDERR-ONLY'
            }
            return 'EMPTY-GATE'
        }
        Start-Sleep -Milliseconds 250
    }
    return 'TIMEOUT'
}

function Test-Distillate {
    # A landed review with a missing, empty or count-mismatched distillate is an anomaly,
    # never a completed hand-off.
    param([string]$RawFile, [string]$DistillateFile)
    $m = Select-String -Path $RawFile -Pattern '^(?:PLAN REVIEW|CODE REVIEW|AUDIT): (\d+) FINDINGS\s*$' | Select-Object -Last 1
    if (-not $m) { return 'ANOMALY:NO-RAW-COUNT' }
    $expected = [int]$m.Matches[0].Groups[1].Value
    if (-not (Test-Path $DistillateFile) -or ((Get-Item $DistillateFile).Length -eq 0)) { return 'ANOMALY:MISSING' }
    $got = @(Select-String -Path $DistillateFile -Pattern '^FINDING').Count
    if ($got -ne $expected) { return "ANOMALY:COUNT-MISMATCH raw=$expected distilled=$got" }
    return 'OK'
}

# ---------- v2: pre-launch checks as a guard, not a narration ----------

function Test-PromptLeakage {
    # The step-0 text search: assembly notes, pins, or a foreign gate heading in a reviewer
    # prompt mean the prompt is wrong and nothing launches.
    param([string]$PromptFile, [string]$OwnGateHeading)
    $foreign = @('## The PLAN review', '## The DRAFT CODE review', '## The AUDIT') | Where-Object { $_ -ne $OwnGateHeading }
    $bad = @('## Assembly', '**Pins**') + $foreign
    foreach ($marker in $bad) {
        if (Select-String -Path $PromptFile -SimpleMatch $marker -Quiet) { return "LEAKY:$marker" }
    }
    if (-not (Select-String -Path $PromptFile -Pattern '(?i)write policy' -Quiet)) { return 'LEAKY:NO-WRITE-POLICY' }
    return 'CLEAN'
}

function Invoke-GuardedLaunch {
    # The refusal path made executable: checks fail -> REFUSED and NOTHING launches - no pid
    # file, no process. Proving the checks ran is not proving they stop a launch; this does.
    param([string]$PromptFile, [string]$OwnGateHeading, [scriptblock]$Launch, [string]$PidFile)
    $verdict = Test-PromptLeakage -PromptFile $PromptFile -OwnGateHeading $OwnGateHeading
    if ($verdict -ne 'CLEAN') { return @{ state = 'REFUSED'; why = $verdict } }
    $launchedId = & $Launch
    $launchedId | Set-Content $PidFile -Encoding utf8
    return @{ state = 'LAUNCHED'; procId = $launchedId }
}

# ---------- v2: CI outcomes and the closing edge ----------

function Resolve-CiOutcome {
    # Every terminal state wakes; a missing run is its own state after the window; a green on
    # any head but the final one is nothing at all.
    param([bool]$RunExists, [string]$RunSha, [string]$FinalSha, [string]$Conclusion, [bool]$WindowExpired)
    if (-not $RunExists) {
        if ($WindowExpired) { return 'DISPATCH-PRODUCED-NOTHING' }
        return 'WAITING'
    }
    if ($RunSha -ne $FinalSha) { return 'IGNORED:NON-FINAL-HEAD' }
    if ($Conclusion -in @('success', 'failure', 'cancelled', 'timed_out')) { return "TERMINAL:$Conclusion" }
    return 'WAITING'
}

function Resolve-CloseRepair {
    # The closing edge: merge landed but the final report vanished. Repair from primary evidence,
    # exactly once - the ledger makes the second attempt a no-op instead of a double repair.
    param([bool]$MergedOnRemote, [bool]$ReportArrived, [string]$LedgerFile)
    if ($ReportArrived) { return 'NORMAL' }
    if (-not $MergedOnRemote) { return 'STALL:NO-EVIDENCE' }
    if ((Test-Path $LedgerFile) -and (Select-String -Path $LedgerFile -SimpleMatch 'REPAIR' -Quiet)) { return 'NOOP:ALREADY-REPAIRED' }
    Add-Content -Path $LedgerFile -Value "REPAIR $(Get-Date -Format o)"
    return 'REPAIR:SET-DONE-FROM-PRIMARY-EVIDENCE'
}

function Invoke-WaitOutcome {
    # Classifications drive ACTIONS; a drill that stops at the classification proves nothing
    # about the conductor. EXPIRED/TIMEOUT stall and never advance; anomalies hand down.
    param([string]$Outcome)
    switch -Regex ($Outcome) {
        '^LANDED$'                { return @{ action = 'PROCEED'; advance = $true } }
        '^(EXPIRED|TIMEOUT)$'     { return @{ action = 'STALL-REPORT'; advance = $false; rearm = $true } }
        '^(EMPTY-GATE|AMBIGUOUS)' { return @{ action = 'HAND-DOWN-ANOMALY'; advance = $false } }
        '^(Dead|DEAD)'            { return @{ action = 'HAND-DOWN-ANOMALY'; advance = $false } }
        default                   { return @{ action = 'HAND-DOWN-ANOMALY'; advance = $false } }
    }
}

# ---------- v2: the event trace ----------

function Add-DrillEvent {
    # A machine-readable trace, so a drill's story is replayable evidence instead of testimony.
    param([string]$TraceFile, [string]$Actor, [string]$Event)
    $seq = 0
    if (Test-Path $TraceFile) { $seq = @(Get-Content $TraceFile).Count }
    Add-Content -Path $TraceFile -Value ('{0}|{1}|{2}|{3}' -f $seq, (Get-Date -Format o), $Actor, $Event)
}
