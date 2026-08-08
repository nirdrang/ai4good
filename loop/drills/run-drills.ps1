# Runs every relay control drill against the scripted fake actor. Free, deterministic, on demand.
# Each drill encodes ONE real incident; a red names the hand-off that broke. Exit 1 on any red.
$ErrorActionPreference = 'Stop'
$here  = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'control-lib.ps1')
$actor = Join-Path $here 'fake-actor.ps1'
$root  = Join-Path $env:TEMP ('relay-drills-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$results = @()
$cleanupPids = @()

function New-DrillDir([string]$name) {
    $d = Join-Path $root $name
    New-Item -ItemType Directory -Force -Path $d | Out-Null
    return $d
}
function Assert([string]$drill, [string]$claim, [bool]$ok) {
    $script:results += [pscustomobject]@{ Drill = $drill; Claim = $claim; Pass = $ok }
}

# ---- Drill 1: happy path - phases in order, working liveness, notify channel fires ----
$d1 = New-DrillDir 'happy'
$pid1 = Start-DetachedActor -ActorScript $actor -Mode 'happy' -Dir $d1
$live = Get-ActorLiveness -ProcessId $pid1 -LogFile (Join-Path $d1 'actor.log')
Assert 'happy-path' 'a running actor reads Alive-Working' ($live -eq 'Alive-Working')
$channel = Wait-TwoChannel -NotifyFile (Join-Path $d1 'notify.txt') -ResultFile (Join-Path $d1 'result.txt') -TimeoutSec 10
Assert 'happy-path' 'completion arrives on the notify channel' ($channel -eq 'notify')
$phases = @(Get-Content (Join-Path $d1 'actor.log'))
Assert 'happy-path' 'phases ran in order 1..5' (($phases -join ',') -eq 'phase 1,phase 2,phase 3,phase 4,phase 5')

# ---- Drill 2: dies at launch - the empty output file must NOT read as liveness ----
$d2 = New-DrillDir 'die-at-launch'
$pid2 = Start-DetachedActor -ActorScript $actor -Mode 'die-at-launch' -Dir $d2
Start-Sleep -Milliseconds 1500
$trapFile = Join-Path $d2 'result.txt'
Assert 'die-at-launch' 'the trap is real: output file exists and is empty' ((Test-Path $trapFile) -and ((Get-Item $trapFile).Length -eq 0))
$live = Get-ActorLiveness -ProcessId $pid2 -LogFile (Join-Path $d2 'actor.log')
Assert 'die-at-launch' 'liveness check says Dead despite the file' ($live -eq 'Dead')

# ---- Drill 3: survives-the-launcher vs died-with-it - detect the difference after the launcher exits ----
$d3a = New-DrillDir 'detached-survives'
$d3b = New-DrillDir 'detached-dies'
$cmdA = "`$p = Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','$actor','-Mode','hang','-Dir','$d3a' -WindowStyle Hidden -PassThru; Set-Content -Path '$d3a\pid.txt' -Value `$p.Id"
$cmdB = "`$p = Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','$actor','-Mode','hang','-Dir','$d3b' -WindowStyle Hidden -PassThru; Set-Content -Path '$d3b\pid.txt' -Value `$p.Id; Start-Sleep -Milliseconds 500; Stop-Process -Id `$p.Id -Force"
& powershell.exe -NoProfile -Command $cmdA | Out-Null
& powershell.exe -NoProfile -Command $cmdB | Out-Null
Start-Sleep -Milliseconds 500
$pidA = [int](Get-Content (Join-Path $d3a 'pid.txt'))
$pidB = [int](Get-Content (Join-Path $d3b 'pid.txt'))
$cleanupPids += $pidA
Assert 'detachment' 'a true detach survives its launcher' ($null -ne (Get-Process -Id $pidA -ErrorAction SilentlyContinue))
Assert 'detachment' 'a false detach is detected as Dead, not assumed running' ($null -eq (Get-Process -Id $pidB -ErrorAction SilentlyContinue))

# ---- Drill 4: completion notification lost - the backstop channel must catch it ----
$d4 = New-DrillDir 'no-notify'
Start-DetachedActor -ActorScript $actor -Mode 'finish-no-notify' -Dir $d4 | Out-Null
$channel = Wait-TwoChannel -NotifyFile (Join-Path $d4 'notify.txt') -ResultFile (Join-Path $d4 'result.txt') -TimeoutSec 10
Assert 'lost-notification' 'the backstop watch catches what the notify channel missed' ($channel -eq 'backstop')
Assert 'lost-notification' 'the notify signal genuinely never arrived' (-not (Test-Path (Join-Path $d4 'notify.txt')))

# ---- Drill 5: watch expiry is a loud signal, never absorbed as progress ----
$d5 = New-DrillDir 'expiry'
$channel = Wait-TwoChannel -NotifyFile (Join-Path $d5 'notify.txt') -ResultFile (Join-Path $d5 'result.txt') -TimeoutSec 2
Assert 'watch-expiry' 'an expired watch returns EXPIRED, distinct from every success value' ($channel -eq 'EXPIRED')

# ---- Drill 6: stall - alive but silent is distinguishable from working and from dead ----
$d6 = New-DrillDir 'stall'
$pid6 = Start-DetachedActor -ActorScript $actor -Mode 'hang' -Dir $d6
$cleanupPids += $pid6
Start-Sleep -Milliseconds 1000
$live = Get-ActorLiveness -ProcessId $pid6 -LogFile (Join-Path $d6 'actor.log')
Assert 'stall' 'a hung actor reads Alive-Stalled, not working and not dead' ($live -eq 'Alive-Stalled')

# ---- Drill 7: abrupt death mid-phase - disk state survives and decides the resume point ----
$d7 = New-DrillDir 'death-mid-phase'
$pid7 = Start-DetachedActor -ActorScript $actor -Mode 'hang' -Dir $d7
Start-Sleep -Milliseconds 800
Stop-Process -Id $pid7 -Force
Start-Sleep -Milliseconds 300
Assert 'death-mid-phase' 'the resume point comes from disk, at the last recorded phase' ((Get-ResumeState -Dir $d7) -eq 'RESUME-FROM:phase 1')
Assert 'death-mid-phase' 'a finished actor reads COMPLETE even though it died unnotified' ((Get-ResumeState -Dir $d4) -eq 'COMPLETE')

# ---- Drill 8: a stale-registry spawn failure is classified as a NAMED stall ----
Assert 'stale-registry' 'agent-type-not-found maps to STALL:STALE-REGISTRY' ((Get-SpawnFailureClass -ErrorText 'Agent type not found: conductor') -eq 'STALL:STALE-REGISTRY')
Assert 'stale-registry' 'an unrecognised spawn error still stalls, as STALL:UNKNOWN' ((Get-SpawnFailureClass -ErrorText 'something else broke') -eq 'STALL:UNKNOWN')

# ---- Cleanup ----
foreach ($p in $cleanupPids) {
    try { Stop-Process -Id $p -Force -ErrorAction Stop } catch {}
}
Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue

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
