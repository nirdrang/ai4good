# verify-gate2-highs.ps1 - first-hand verification probes for gate 2 rulings (AI4DEV-82).
# Synthetic only. The gate never writes; the library never loads in probes A/B; probe C uses an
# in-memory snapshot object. The live window directory is never read or written.

$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\agent-aacbb10d5c85b1114'
$pad  = Split-Path -Parent $MyInvocation.MyCommand.Path

$probeDir = Join-Path $pad 'gate2-probes'
if (Test-Path $probeDir) { Remove-Item -Recurse -Force $probeDir }
New-Item -ItemType Directory -Force -Path $probeDir | Out-Null

# Point any accidental library resolution at an empty synthetic dir, never the live one.
$syn = Join-Path $probeDir 'windir-empty'
New-Item -ItemType Directory -Force -Path $syn | Out-Null

$emptyIn = Join-Path $probeDir 'empty.in'
[IO.File]::WriteAllText($emptyIn, '')

function Run-Gate([string]$dir, [string]$tag) {
    $out = Join-Path $probeDir ($tag + '.out.txt')
    $err = Join-Path $probeDir ($tag + '.err.txt')
    $p = Start-Process -FilePath 'powershell' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $dir 'window-gate.ps1')) `
        -WorkingDirectory $dir -RedirectStandardInput $emptyIn -RedirectStandardOutput $out -RedirectStandardError $err `
        -NoNewWindow -Wait -PassThru
    $o = ''; if (Test-Path $out) { $o = [IO.File]::ReadAllText($out) }
    $e = ''; if (Test-Path $err) { $e = [IO.File]::ReadAllText($err) }
    Write-Output ('--- ' + $tag + ' ---')
    Write-Output ('exit   : ' + $p.ExitCode)
    Write-Output ('stdout : ' + $(if ($o.Trim()) { $o.Trim() } else { '(empty)' }))
    Write-Output ('stderr : ' + $(if ($e.Trim()) { $e.Trim() } else { '(empty)' }))
    Write-Output ''
}

$env:AI4GOOD_WINDOW_DIR = $syn

# PROBE A (terra [2], case 1): the library FILE is missing beside the gate.
$dirA = Join-Path $probeDir 'A-no-lib'
New-Item -ItemType Directory -Force -Path $dirA | Out-Null
Copy-Item (Join-Path $repo 'loop\work\window-gate.ps1') (Join-Path $dirA 'window-gate.ps1')
Run-Gate $dirA 'A-lib-file-missing'

# PROBE B (terra [2], case 2): the library file loads but defines nothing, so Get-WindowVerdict
# is a missing command.
$dirB = Join-Path $probeDir 'B-empty-lib'
New-Item -ItemType Directory -Force -Path $dirB | Out-Null
Copy-Item (Join-Path $repo 'loop\work\window-gate.ps1') (Join-Path $dirB 'window-gate.ps1')
[IO.File]::WriteAllText((Join-Path $dirB 'window-lib.ps1'), "# empty stub - defines nothing`n")
Run-Gate $dirB 'B-lib-empty-stub'

# PROBE C (terra [3]): Get-WindowVerdict -Snapshot with rateLimits as a HASHTABLE, exactly the
# shape settings-proof-probe.ps1's Write-Synthetic builds at its line 106.
Write-Output '--- C-hashtable-rateLimits ---'
$env:AI4GOOD_WINDOW_DIR = $syn
. (Join-Path $repo 'loop\work\window-lib.ps1')
$snap = [ordered]@{
    capturedAt = (Get-Date).ToUniversalTime().ToString('o')
    sessionId  = 'gate2-verification-probe'
    version    = 'gate2-verification-probe'
    rateLimits = @{ five_hour = @{ used_percentage = 95; resets_at = [DateTimeOffset]::UtcNow.AddMinutes(90).ToUnixTimeSeconds() } }
}
$v = Get-WindowVerdict -Snapshot $snap
Write-Output ('verdict : ' + $v.verdict)
Write-Output ('reason  : ' + $v.reason)
Write-Output ('line    : ' + (Format-WindowVerdictLine $v))
Write-Output ''

# PROBE C2 (control): the same reading round-tripped through JSON (the production shape).
Write-Output '--- C2-pscustomobject-control ---'
$snap2 = $snap | ConvertTo-Json -Depth 8 | ConvertFrom-Json
$v2 = Get-WindowVerdict -Snapshot $snap2
Write-Output ('verdict : ' + $v2.verdict)
Write-Output ('reason  : ' + $v2.reason)
Write-Output ('line    : ' + (Format-WindowVerdictLine $v2))

$env:AI4GOOD_WINDOW_DIR = $null
