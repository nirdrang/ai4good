# Runs every relay control drill against the scripted fake actor. Free, deterministic, on demand.
# Each drill encodes ONE real incident or one finding of the codex sol review
# (loop/drills/records/codex-sol-review-2026-08-09.md); a red names the hand-off that broke.
# Exit 1 on any red. v2 adds: commencement, phase-event fencing, strict landing, refusal paths,
# CI outcomes, the closing edge, and an event trace.
$ErrorActionPreference = 'Stop'
$here  = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'control-lib.ps1')
$actor   = Join-Path $here 'fake-actor.ps1'
$prompts = Join-Path $here 'prompts'
$root    = Join-Path $env:TEMP ('relay-drills-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $root | Out-Null
$trace   = Join-Path $root 'trace.log'
$results = @()
$cleanupPids = @()

function New-DrillDir([string]$name) {
    $d = Join-Path $root $name
    New-Item -ItemType Directory -Force -Path $d | Out-Null
    return $d
}
function Assert([string]$drill, [string]$claim, [bool]$ok) {
    $script:results += [pscustomobject]@{ Drill = $drill; Claim = $claim; Pass = $ok }
    Add-DrillEvent -TraceFile $trace -Actor 'drill' -Event ("{0}:{1}" -f $drill, $(if ($ok) { 'pass' } else { 'FAIL' }))
}

# =====================  v1 core - the original eight  =====================

# ---- happy path ----
$d1 = New-DrillDir 'happy'
$pid1 = Start-DetachedActor -ActorScript $actor -Mode 'happy' -Dir $d1
$live = Get-ActorLiveness -ProcessId $pid1 -LogFile (Join-Path $d1 'actor.log')
Assert 'happy-path' 'a running actor reads Alive-Working' ($live -eq 'Alive-Working')
$channel = Wait-TwoChannel -NotifyFile (Join-Path $d1 'notify.txt') -ResultFile (Join-Path $d1 'result.txt') -TimeoutSec 10
Assert 'happy-path' 'completion arrives on the notify channel' ($channel -eq 'notify')
$phases = @(Get-Content (Join-Path $d1 'actor.log'))
Assert 'happy-path' 'phases ran in order 1..5' (($phases -join ',') -eq 'phase 1,phase 2,phase 3,phase 4,phase 5')

# ---- dies at launch ----
$d2 = New-DrillDir 'die-at-launch'
$pid2 = Start-DetachedActor -ActorScript $actor -Mode 'die-at-launch' -Dir $d2
Start-Sleep -Milliseconds 1500
$trapFile = Join-Path $d2 'result.txt'
Assert 'die-at-launch' 'the trap is real: output file exists and is empty' ((Test-Path $trapFile) -and ((Get-Item $trapFile).Length -eq 0))
$live = Get-ActorLiveness -ProcessId $pid2 -LogFile (Join-Path $d2 'actor.log')
Assert 'die-at-launch' 'liveness check says Dead despite the file' ($live -eq 'Dead')
Assert 'die-at-launch' 'an empty result file is not COMPLETE - it reads RESTART' ((Get-ResumeState -Dir $d2) -eq 'RESTART')

# ---- detachment (simulation note: Windows never reaps children automatically; the
# died-with-launcher case only occurs via harness teardown, which the explicit kill reproduces) ----
$d3a = New-DrillDir 'detached-survives'
$d3b = New-DrillDir 'detached-dies'
$cmdA = "Set-Content -Path '$d3a\parent.pid' -Value `$PID; `$p = Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','$actor','-Mode','hang','-Dir','$d3a' -WindowStyle Hidden -PassThru; Set-Content -Path '$d3a\pid.txt' -Value `$p.Id"
$cmdB = "`$p = Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','$actor','-Mode','hang','-Dir','$d3b' -WindowStyle Hidden -PassThru; Set-Content -Path '$d3b\pid.txt' -Value `$p.Id; Start-Sleep -Milliseconds 500; Stop-Process -Id `$p.Id -Force"
& powershell.exe -NoProfile -Command $cmdA | Out-Null
& powershell.exe -NoProfile -Command $cmdB | Out-Null
Start-Sleep -Milliseconds 500
$pidA = [int](Get-Content (Join-Path $d3a 'pid.txt'))
$pidB = [int](Get-Content (Join-Path $d3b 'pid.txt'))
$parentA = [int](Get-Content (Join-Path $d3a 'parent.pid'))
$cleanupPids += $pidA
Assert 'detachment' 'a true detach survives its launcher' ($null -ne (Get-Process -Id $pidA -ErrorAction SilentlyContinue))
Assert 'detachment' 'a false detach is detected as Dead, not assumed running' ($null -eq (Get-Process -Id $pidB -ErrorAction SilentlyContinue))

# ---- orphan: the launcher is gone, the child is alive - detect, then abort by identity ----
Assert 'orphan' 'a live child of a dead launcher classifies as ORPHANED' ((Test-Orphan -ParentProcessId $parentA -ChildProcessId $pidA) -eq 'ORPHANED')
$idA = Get-ProcessIdentity -ProcessId $pidA
Assert 'orphan' 'identity is verifiable before any abort' ($null -ne $idA -and (Test-SameProcess -ProcessId $pidA -RecordedStart $idA.Start))
Stop-Process -Id $pidA -Force
Start-Sleep -Milliseconds 300
Assert 'orphan' 'the abort provably killed the reviewer' ($null -eq (Get-Process -Id $pidA -ErrorAction SilentlyContinue))
$act = Invoke-WaitOutcome -Outcome 'ABORTED'
Assert 'orphan' 'an aborted gate hands down as an anomaly, never advances' ((-not $act.advance) -and ($act.action -eq 'HAND-DOWN-ANOMALY'))

# ---- lost notification ----
$d4 = New-DrillDir 'no-notify'
Start-DetachedActor -ActorScript $actor -Mode 'finish-no-notify' -Dir $d4 | Out-Null
$channel = Wait-TwoChannel -NotifyFile (Join-Path $d4 'notify.txt') -ResultFile (Join-Path $d4 'result.txt') -TimeoutSec 10
Assert 'lost-notification' 'the backstop watch catches what the notify channel missed' ($channel -eq 'backstop')
Assert 'lost-notification' 'the notify signal genuinely never arrived' (-not (Test-Path (Join-Path $d4 'notify.txt')))

# ---- watch expiry, plus the empty-file trap on the backstop ----
$d5 = New-DrillDir 'expiry'
$channel = Wait-TwoChannel -NotifyFile (Join-Path $d5 'notify.txt') -ResultFile (Join-Path $d5 'result.txt') -TimeoutSec 2
Assert 'watch-expiry' 'an expired watch returns EXPIRED, distinct from every success value' ($channel -eq 'EXPIRED')
New-Item -ItemType File -Path (Join-Path $d5 'result.txt') -Force | Out-Null
$channel = Wait-TwoChannel -NotifyFile (Join-Path $d5 'notify.txt') -ResultFile (Join-Path $d5 'result.txt') -TimeoutSec 2
Assert 'watch-expiry' 'a zero-byte result file cannot complete the backstop' ($channel -eq 'EXPIRED')
$act = Invoke-WaitOutcome -Outcome 'EXPIRED'
Assert 'watch-expiry' 'EXPIRED drives a stall report and never an advance' (($act.action -eq 'STALL-REPORT') -and (-not $act.advance) -and $act.rearm)

# ---- stall ----
$d6 = New-DrillDir 'stall'
$pid6 = Start-DetachedActor -ActorScript $actor -Mode 'hang' -Dir $d6
$cleanupPids += $pid6
Start-Sleep -Milliseconds 1000
$live = Get-ActorLiveness -ProcessId $pid6 -LogFile (Join-Path $d6 'actor.log')
Assert 'stall' 'a hung actor reads Alive-Stalled, not working and not dead' ($live -eq 'Alive-Stalled')

# ---- death mid-phase ----
$d7 = New-DrillDir 'death-mid-phase'
$pid7 = Start-DetachedActor -ActorScript $actor -Mode 'hang' -Dir $d7
Start-Sleep -Milliseconds 800
Stop-Process -Id $pid7 -Force
Start-Sleep -Milliseconds 300
Assert 'death-mid-phase' 'the resume point comes from disk, at the last recorded phase' ((Get-ResumeState -Dir $d7) -eq 'RESUME-FROM:phase 1')
Assert 'death-mid-phase' 'a finished actor reads COMPLETE even though it died unnotified' ((Get-ResumeState -Dir $d4) -eq 'COMPLETE')

# ---- spawn-failure taxonomy (scoped in v2) ----
Assert 'stale-registry' 'agent-type-not-found maps to STALL:STALE-REGISTRY' ((Get-SpawnFailureClass -ErrorText 'Agent type not found: conductor') -eq 'STALL:STALE-REGISTRY')
Assert 'stale-registry' 'an unrelated file-not-found is NOT a stale registry' ((Get-SpawnFailureClass -ErrorText 'file not found: foo.ps1') -eq 'STALL:UNKNOWN')
Assert 'stale-registry' 'an unreachable-agent error gets its own class' ((Get-SpawnFailureClass -ErrorText "No agent named 'agent-123' is reachable") -eq 'STALL:UNREACHABLE')

# =====================  v2: commencement - the lost-day class  =====================

$dc = New-DrillDir 'commencement'

$r = Invoke-Commencement -Spawn { @{ ok = $false; error = 'Agent type conductor not found' } } -FlowLineFile (Join-Path $dc 'flow1.txt') -DeadlineSec 2
Assert 'commencement' 'a rejected spawn is a STARTUP-STALL now, with the error verbatim' (($r.state -eq 'STARTUP-STALL') -and ($r.why -eq 'SPAWN-REJECTED') -and ($r.error -match 'conductor'))
Assert 'commencement' 'the rejected-spawn error classifies through the taxonomy' ((Get-SpawnFailureClass -ErrorText $r.error) -eq 'STALL:STALE-REGISTRY')

$r = Invoke-Commencement -Spawn { @{ ok = $true } } -FlowLineFile (Join-Path $dc 'flow2.txt') -DeadlineSec 2
Assert 'commencement' 'a spawn with no receipt is a STARTUP-STALL, not a wait' (($r.state -eq 'STARTUP-STALL') -and ($r.why -eq 'NO-RECEIPT'))

Assert 'commencement' 'the single-conductor fence admits the first commencement' (Register-Commencement -Dir $dc -Item 'X')
Assert 'commencement' 'the fence refuses a second commencement for the same item' (-not (Register-Commencement -Dir $dc -Item 'X'))

$dcd = New-DrillDir 'commence-dead'
$r = Invoke-Commencement -Spawn {
    $p = Start-DetachedActor -ActorScript $actor -Mode 'die-at-launch' -Dir $dcd
    @{ ok = $true; taskId = 't-dead'; procId = $p }
} -FlowLineFile (Join-Path $dcd 'flow.txt') -DeadlineSec 3 -TranscriptFile (Join-Path $dcd 'actor.log')
Assert 'commencement' 'a conductor dead before its first line is a STARTUP-STALL:DEAD-TASK' (($r.state -eq 'STARTUP-STALL') -and ($r.why -eq 'DEAD-TASK'))

$dcs = New-DrillDir 'commence-silent'
$script:pidSilent = 0
$r = Invoke-Commencement -Spawn {
    $script:pidSilent = Start-DetachedActor -ActorScript $actor -Mode 'hang' -Dir $dcs
    @{ ok = $true; taskId = 't-silent'; procId = $script:pidSilent }
} -FlowLineFile (Join-Path $dcs 'flow.txt') -DeadlineSec 3 -TranscriptFile (Join-Path $dcs 'actor.log')
$cleanupPids += $script:pidSilent
Assert 'commencement' 'alive but silent setup past the deadline is SETUP-SILENT' (($r.state -eq 'STARTUP-STALL') -and ($r.why -eq 'SETUP-SILENT'))

$dcw = New-DrillDir 'commence-working'
$script:pidWork = 0
$r = Invoke-Commencement -Spawn {
    $script:pidWork = Start-DetachedActor -ActorScript $actor -Mode 'happy' -Dir $dcw
    @{ ok = $true; taskId = 't-work'; procId = $script:pidWork }
} -FlowLineFile (Join-Path $dcw 'never-flow.txt') -DeadlineSec 1 -TranscriptFile (Join-Path $dcw 'actor.log')
Assert 'commencement' 'a growing transcript past the deadline distinguishes COMMENCING-LATE from silence' (($r.state -eq 'STARTUP-STALL') -and ($r.why -eq 'COMMENCING-LATE'))

$dcc = New-DrillDir 'commence-ok'
$r = Invoke-Commencement -Spawn {
    $p = Start-DetachedActor -ActorScript $actor -Mode 'happy' -Dir $dcc
    @{ ok = $true; taskId = 't-ok'; procId = $p }
} -FlowLineFile (Join-Path $dcc 'notify.txt') -DeadlineSec 8 -TranscriptFile (Join-Path $dcc 'actor.log')
Assert 'commencement' 'a first flow line inside the deadline is COMMENCED - arrival, not sending' ($r.state -eq 'COMMENCED')

# ---- arming is not firing ----
Assert 'watch-armed' 'no task id means the watch is NOT armed, whatever was claimed' ((Confirm-WatchArmed -TaskId '' -Probe { 'running' }) -eq 'STALL:WATCH-NOT-ARMED')
Assert 'watch-armed' 'a rejected task probes as not armed' ((Confirm-WatchArmed -TaskId 't9' -Probe { 'rejected' }) -eq 'STALL:WATCH-NOT-ARMED')
Assert 'watch-armed' 'armed means task exists AND probes running, named for the flow line' ((Confirm-WatchArmed -TaskId 't9' -Probe { 'running' }) -eq 'ARMED:t9')

# =====================  v2: hand-off fencing  =====================

$ledger = New-PhaseLedger
$e1 = Register-PhaseEvent -Ledger $ledger -Generation 'gate1@abc123' -Channel 'backstop'
$e2 = Register-PhaseEvent -Ledger $ledger -Generation 'gate1@abc123' -Channel 'tether'
$e3 = Register-PhaseEvent -Ledger $ledger -Generation 'gate2@def456' -Channel 'tether'
$e4 = Register-PhaseEvent -Ledger $ledger -Generation 'gate1@abc123' -Channel 'tether-late'
Assert 'phase-fence' 'the first channel to fire advances the phase' ($e1.advance -and ($e1.channel -eq 'backstop'))
Assert 'phase-fence' 'the second channel for the same generation is refused' (-not $e2.advance)
Assert 'phase-fence' 'a late duplicate after the next phase started is refused' (-not $e4.advance)
Assert 'phase-fence' 'the next generation advances normally, exactly once, in order' ($e3.advance -and (($ledger.order -join ',') -eq 'gate1@abc123,gate2@def456'))

Assert 'tip-baseline' 'a tip that moved inside the spawn-to-watch gap is still detected, because the baseline predates the spawn' (Test-TipMoved -BaselineHead 'aaa1111' -CurrentHead 'bbb2222')
Assert 'tip-baseline' 'an unmoved tip does not false-fire' (-not (Test-TipMoved -BaselineHead 'aaa1111' -CurrentHead 'aaa1111'))

Assert 'generation' 'a missing state file or report holds the relay' ((Test-SittingGeneration -StateGeneration '' -ReportedHead 'abc' -RemoteHead 'abc') -eq 'HOLD:MISSING')
Assert 'generation' 'a reported head that is not the remote tip holds the relay' ((Test-SittingGeneration -StateGeneration 'g1' -ReportedHead 'abc' -RemoteHead 'xyz') -eq 'HOLD:HEAD-MISMATCH')
Assert 'generation' 'agreement of state, report and remote proceeds' ((Test-SittingGeneration -StateGeneration 'g1' -ReportedHead 'abc' -RemoteHead 'abc') -eq 'PROCEED')

# ---- pid reuse ----
$dp = New-DrillDir 'pid-reuse'
$pidX = Start-DetachedActor -ActorScript $actor -Mode 'hang' -Dir $dp
$idX = Get-ProcessIdentity -ProcessId $pidX
Start-Sleep -Milliseconds 1500
$dp2 = New-DrillDir 'pid-reuse-b'
$pidY = Start-DetachedActor -ActorScript $actor -Mode 'hang' -Dir $dp2
$cleanupPids += $pidX; $cleanupPids += $pidY
Assert 'pid-identity' 'a different process never passes as the recorded reviewer, whatever its pid' (-not (Test-SameProcess -ProcessId $pidY -RecordedStart $idX.Start))
Assert 'pid-identity' 'the identity mismatch protected the bystander - it was not killed' ($null -ne (Get-Process -Id $pidY -ErrorAction SilentlyContinue))

# =====================  v2: strict review landing  =====================

$deadProbe = Start-Process powershell -ArgumentList '-NoProfile','-Command','exit' -WindowStyle Hidden -PassThru
Wait-Process -Id $deadProbe.Id -ErrorAction SilentlyContinue
$deadPid = $deadProbe.Id

# stale artifact from a previous run
$dl = New-DrillDir 'landing-stale'
$staleOut = Join-Path $dl 'out.md'; $staleErr = Join-Path $dl 'err.log'
Set-Content -Path $staleOut -Value @('old findings', 'CODE REVIEW: 2 FINDINGS')
(Get-Item $staleOut).LastWriteTime = (Get-Date).AddHours(-2)
$v = Wait-ReviewLanding -Out $staleOut -Err $staleErr -ProcessId $deadPid -LaunchTime (Get-Date) -TimeoutSec 3
Assert 'landing' 'a stale verdict from a previous run can never land a new gate' ($v -eq 'EMPTY-GATE')

# malformed marker
$dm = New-DrillDir 'landing-malformed'
$mOut = Join-Path $dm 'out.md'; $mErr = Join-Path $dm 'err.log'
Set-Content -Path $mOut -Value 'CODE REVIEW: still working'
$v = Wait-ReviewLanding -Out $mOut -Err $mErr -ProcessId $deadPid -LaunchTime (Get-Date).AddSeconds(-5) -TimeoutSec 3
Assert 'landing' 'a malformed count line is not a landing' ($v -eq 'EMPTY-GATE')

# count line only in stderr
$ds = New-DrillDir 'landing-stderr-only'
$sOut = Join-Path $ds 'out.md'; $sErr = Join-Path $ds 'err.log'
Set-Content -Path $sOut -Value 'narration only, no verdict here'
Set-Content -Path $sErr -Value 'CODE REVIEW: CLEAN'
$v = Wait-ReviewLanding -Out $sOut -Err $sErr -ProcessId $deadPid -LaunchTime (Get-Date).AddSeconds(-5) -TimeoutSec 3
Assert 'landing' 'a count line only in stderr is AMBIGUOUS, never a clean landing' ($v -eq 'AMBIGUOUS:COUNT-IN-STDERR-ONLY')

# partial verdict: count line present, process still alive, more findings coming
$de = New-DrillDir 'landing-partial'
$eOut = Join-Path $de 'out.md'; $eErr = Join-Path $de 'err.log'
$launch = Get-Date
$pidE = Start-DetachedActor -ActorScript $actor -Mode 'drill-e' -Dir $de -Out $eOut -Err $eErr
$cleanupPids += $pidE
Start-Sleep -Seconds 3
$v = Wait-ReviewLanding -Out $eOut -Err $eErr -ProcessId $pidE -LaunchTime $launch -TimeoutSec 4
Assert 'landing' 'a count line with the process still alive is a partial verdict, not a landing' ($v -eq 'TIMEOUT')
$v = Wait-ReviewLanding -Out $eOut -Err $eErr -ProcessId $pidE -LaunchTime $launch -TimeoutSec 20
Assert 'landing' 'after exit and settlement the same gate lands' ($v -eq 'LANDED')
Assert 'landing' 'the landed verdict is the LATE version, not the early one' ((Get-Content $eOut | Select-Object -Last 1) -eq 'CODE REVIEW: 3 FINDINGS')

# distillate integrity
$dist = Join-Path $de 'distillate.md'
Set-Content -Path $dist -Value @('FINDING 1 x', 'FINDING 2 y', 'FINDING 3 z')
Assert 'distillate' 'a distillate matching the raw count is OK' ((Test-Distillate -RawFile $eOut -DistillateFile $dist) -eq 'OK')
Set-Content -Path $dist -Value @('FINDING 1 x')
Assert 'distillate' 'a truncated distillate is a count-mismatch anomaly, not a hand-off' ((Test-Distillate -RawFile $eOut -DistillateFile $dist) -match '^ANOMALY:COUNT-MISMATCH')
Assert 'distillate' 'a missing distillate after a landed review is an anomaly' ((Test-Distillate -RawFile $eOut -DistillateFile (Join-Path $de 'nope.md')) -eq 'ANOMALY:MISSING')

$act = Invoke-WaitOutcome -Outcome 'EMPTY-GATE'
Assert 'landing' 'an empty gate hands down as an anomaly and never advances' (($act.action -eq 'HAND-DOWN-ANOMALY') -and (-not $act.advance))
$act = Invoke-WaitOutcome -Outcome 'LANDED'
Assert 'landing' 'a landed gate proceeds' ($act.advance -and ($act.action -eq 'PROCEED'))

# =====================  v2: the refusal path, executable  =====================

$dr = New-DrillDir 'refused'
$r = Invoke-GuardedLaunch -PromptFile (Join-Path $prompts 'gate-refused-drill.md') -OwnGateHeading '## The DRAFT CODE review' -Launch { throw 'must never launch' } -PidFile (Join-Path $dr 'x.pid')
Assert 'refused' 'a leaky prompt is REFUSED before anything launches' (($r.state -eq 'REFUSED') -and ($r.why -match '^LEAKY:'))
Assert 'refused' 'REFUSED leaves no pid file and no process' (-not (Test-Path (Join-Path $dr 'x.pid')))
$noPolicy = Join-Path $dr 'no-policy.md'
Set-Content -Path $noPolicy -Value @('# prompt', '## The DRAFT CODE review', 'review the code')
$r = Invoke-GuardedLaunch -PromptFile $noPolicy -OwnGateHeading '## The DRAFT CODE review' -Launch { throw 'must never launch' } -PidFile (Join-Path $dr 'y.pid')
Assert 'refused' 'a prompt without the write policy in words is REFUSED' (($r.state -eq 'REFUSED') -and ($r.why -eq 'LEAKY:NO-WRITE-POLICY'))
$r = Invoke-GuardedLaunch -PromptFile (Join-Path $prompts 'gate2-code-drill.md') -OwnGateHeading '## The DRAFT CODE review' -Launch {
    Start-DetachedActor -ActorScript $actor -Mode 'die-at-launch' -Dir $dr
} -PidFile (Join-Path $dr 'z.pid')
Assert 'refused' 'a clean prompt launches, and the pid is recorded' (($r.state -eq 'LAUNCHED') -and (Test-Path (Join-Path $dr 'z.pid')))

# =====================  v2: CI outcomes  =====================

Assert 'ci' 'no run for the head after the window is DISPATCH-PRODUCED-NOTHING, not a longer wait' ((Resolve-CiOutcome -RunExists $false -RunSha '' -FinalSha 'fff' -Conclusion '' -WindowExpired $true) -eq 'DISPATCH-PRODUCED-NOTHING')
Assert 'ci' 'no run inside the window is still WAITING' ((Resolve-CiOutcome -RunExists $false -RunSha '' -FinalSha 'fff' -Conclusion '' -WindowExpired $false) -eq 'WAITING')
Assert 'ci' 'a green on any head but the final one is nothing' ((Resolve-CiOutcome -RunExists $true -RunSha 'aaa' -FinalSha 'fff' -Conclusion 'success' -WindowExpired $false) -eq 'IGNORED:NON-FINAL-HEAD')
Assert 'ci' 'cancelled is a terminal wake, never silence' ((Resolve-CiOutcome -RunExists $true -RunSha 'fff' -FinalSha 'fff' -Conclusion 'cancelled' -WindowExpired $false) -eq 'TERMINAL:cancelled')
Assert 'ci' 'timed_out is a terminal wake' ((Resolve-CiOutcome -RunExists $true -RunSha 'fff' -FinalSha 'fff' -Conclusion 'timed_out' -WindowExpired $false) -eq 'TERMINAL:timed_out')
Assert 'ci' 'success on the final head is the terminal green' ((Resolve-CiOutcome -RunExists $true -RunSha 'fff' -FinalSha 'fff' -Conclusion 'success' -WindowExpired $false) -eq 'TERMINAL:success')

# =====================  v2: the closing edge  =====================

$dgl = New-DrillDir 'close'
$ledgerFile = Join-Path $dgl 'ledger.log'
Assert 'closing' 'a lost final report with the merge on the remote repairs from primary evidence' ((Resolve-CloseRepair -MergedOnRemote $true -ReportArrived $false -LedgerFile $ledgerFile) -eq 'REPAIR:SET-DONE-FROM-PRIMARY-EVIDENCE')
Assert 'closing' 'the repair is exactly-once - a second attempt is a NOOP' ((Resolve-CloseRepair -MergedOnRemote $true -ReportArrived $false -LedgerFile $ledgerFile) -eq 'NOOP:ALREADY-REPAIRED')
Assert 'closing' 'no merge and no report is a stall, never an assumed close' ((Resolve-CloseRepair -MergedOnRemote $false -ReportArrived $false -LedgerFile (Join-Path $dgl 'l2.log')) -eq 'STALL:NO-EVIDENCE')
Assert 'closing' 'a report that arrived closes normally' ((Resolve-CloseRepair -MergedOnRemote $true -ReportArrived $true -LedgerFile (Join-Path $dgl 'l3.log')) -eq 'NORMAL')

# =====================  v2: the trace is evidence  =====================

$lines = @(Get-Content $trace)
$seqs = $lines | ForEach-Object { [int]($_.Split('|')[0]) }
$monotonic = $true
for ($i = 1; $i -lt $seqs.Count; $i++) { if ($seqs[$i] -ne $seqs[$i - 1] + 1) { $monotonic = $false } }
Assert 'trace' 'every drill left a replayable event, in strict sequence' (($lines.Count -gt 40) -and $monotonic)

# ---- Cleanup ----
foreach ($p in $cleanupPids) {
    try { Stop-Process -Id $p -Force -ErrorAction Stop } catch {}
}
Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue

# ---- guards that bind this harness itself ----
# BOTH run BEFORE the failure list is computed. The twin guard used to run after it: a red twin
# printed as FAIL, was counted in the summary, and the script still exited 0. A harness that does
# not bind its own guard reports green while the thing it guards is broken.

# twin guard: the orchestrator pair must be identical apart from the declared differences.
# The rule drifted within a day of being relied on (2026-08-10); this assertion is that lesson.
& powershell -NoProfile -File (Join-Path $here '..\work\twin-check.ps1') | Out-Null
Assert 'twin-guard' 'orchestrator twins are in sync (edit both or neither)' ($LASTEXITCODE -eq 0)

# tracked-machinery guard: the contracts, the work skill and the phase files are product, so
# git must see them. A blanket .claude ignore once accepted edits to tracked files while
# silently dropping new ones - the phase map shipped pointing at files that were never added.
$repoRoot = (Resolve-Path (Join-Path $here '..\..')).Path
$machinery = @(Get-ChildItem -Path (Join-Path $repoRoot '.claude\agents\*.md'), (Join-Path $repoRoot '.claude\skills\work') -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue)
$ignoredMachinery = @()
$untrackedMachinery = @()
foreach ($m in $machinery) {
    $rel = $m.FullName.Substring($repoRoot.Length + 1).Replace('\', '/')
    & git -C $repoRoot check-ignore -q -- $rel 2>$null
    if ($LASTEXITCODE -eq 0) { $ignoredMachinery += $rel; continue }
    $tracked = & git -C $repoRoot ls-files --error-unmatch -- $rel 2>$null
    if (-not $tracked) { $untrackedMachinery += $rel }
}
Assert 'tracked-machinery' 'no agent contract, work-skill or phase file is gitignored' ($ignoredMachinery.Count -eq 0)
Assert 'tracked-machinery' 'every one of them is tracked by git' ($untrackedMachinery.Count -eq 0)
if ($ignoredMachinery.Count -gt 0) { Write-Output ('  tracked-machinery: IGNORED ' + ($ignoredMachinery -join ', ')) }
if ($untrackedMachinery.Count -gt 0) { Write-Output ('  tracked-machinery: UNTRACKED ' + ($untrackedMachinery -join ', ')) }

# phase-file guard: the conductor contract holds only what is true in every phase; each phase's
# rules live in its own file and are pulled on entering that phase. A phase file that vanishes,
# or a file the contract never names, is a phase the conductor would act on from memory.
$phaseFiles = @('phase-plan.md', 'phase-draft.md', 'phase-sittings.md', 'phase-reviews.md',
                'phase-code-gate-scope.md', 'phase-fix.md', 'phase-audit-tail.md',
                'phase-ci-watch.md', 'phase-merge.md')
$core = ''
try { $core = Get-Content (Join-Path $here '..\..\.claude\agents\conductor.md') -Raw } catch { }
$phaseMissing = @()
$phaseUntriggered = @()
foreach ($p in $phaseFiles) {
    if (-not (Test-Path (Join-Path $here ('..\..\.claude\skills\work\conductor\' + $p)))) { $phaseMissing += $p }
    if ($core -notmatch [regex]::Escape($p)) { $phaseUntriggered += $p }
}
Assert 'phase-files' 'every conductor phase file exists' ($phaseMissing.Count -eq 0)
Assert 'phase-files' 'the contract names every phase file, so none is entered from memory' ($phaseUntriggered.Count -eq 0)
Assert 'phase-files' 'the contract says reading the phase file is step 0 of the phase' ($core -match 'STEP 0')
# drift guard: a phase file may not resurrect machinery the founder removed, and each must say
# what completes its phase - the twins taught that an unchecked second copy drifts within a day.
$deadWords = @('keep-alive', 'PULSE', 'PARK', 'run_in_background', 'phase budget')
$phaseDrift = @()
$phaseNoExit = @()
foreach ($p in $phaseFiles) {
    $t = ''
    try { $t = Get-Content (Join-Path $repoRoot ('.claude\skills\work\conductor\' + $p)) -Raw } catch { }
    foreach ($w in $deadWords) { if ($t -match [regex]::Escape($w)) { $phaseDrift += ($p + ':' + $w) } }
    if ($t -notmatch 'completes') { $phaseNoExit += $p }
}
Assert 'phase-files' 'no phase file resurrects removed machinery' ($phaseDrift.Count -eq 0)
Assert 'phase-files' 'every phase file names what completes its phase' ($phaseNoExit.Count -eq 0)
if ($phaseDrift.Count -gt 0) { Write-Output ('  phase-files: dead machinery named in ' + ($phaseDrift -join ', ')) }
if ($phaseNoExit.Count -gt 0) { Write-Output ('  phase-files: no completion condition in ' + ($phaseNoExit -join ', ')) }
if ($phaseMissing.Count -gt 0) { Write-Output ('  phase-files: missing ' + ($phaseMissing -join ', ')) }
if ($phaseUntriggered.Count -gt 0) { Write-Output ('  phase-files: never named in the contract ' + ($phaseUntriggered -join ', ')) }

# no-park guard: the park verb was REMOVED (founder ruling 2026-08-21). Stopping early is
# TaskStop from outside; resume is from the last pushed state. A contract that still defines
# a PARK protocol is stale text waiting to be obeyed.
$parkStale = @()
foreach ($f in @('conductor.md', 'orchestrator.md', 'orchestrator-opus.md', 'executor.md', 'reviewer-runner.md')) {
    $t = ''
    try { $t = Get-Content (Join-Path $here ('..\..\.claude\agents\' + $f)) -Raw } catch { }
    if ($t -match '(?m)^## PARK' -or $t -match 'PARKED at') { $parkStale += $f }
}
Assert 'no-park' 'no role contract defines the removed park verb' ($parkStale.Count -eq 0)
if ($parkStale.Count -gt 0) { Write-Output ('  no-park: stale PARK protocol in ' + ($parkStale -join ', ')) }
# ---- Report ----
$failed = @($results | Where-Object { -not $_.Pass })

foreach ($r in $results) {
    $mark = if ($r.Pass) { 'PASS' } else { 'FAIL' }
    Write-Output ('{0}  [{1}] {2}' -f $mark, $r.Drill, $r.Claim)
}
Write-Output ''
Write-Output ('{0} of {1} assertions green' -f (@($results | Where-Object { $_.Pass }).Count), $results.Count)
if ($failed.Count -gt 0) {
    Write-Output 'RED - the hand-offs above broke.'
    exit 1
}
Write-Output 'All control hand-offs held.'
exit 0
