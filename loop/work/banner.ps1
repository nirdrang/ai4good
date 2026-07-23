# banner.ps1 - SessionStart hook: one-line work-state banner (local + git only, no network).
$ErrorActionPreference = 'SilentlyContinue'
try {
    . (Join-Path $PSScriptRoot 'work-lib.ps1')
    $b = Read-Binding
    $head = (& git rev-parse --short HEAD).Trim()
    if (-not $b) {
        Write-Output ('[ai4good work] no binding in this worktree (HEAD ' + $head + '). Messages stamp unattributed. Use /next to pull a requirement or /bind exploration.')
    } else {
        $sess = if ($env:CLAUDE_SESSION_ID -and $b.sessionId -and ($b.sessionId -ne $env:CLAUDE_SESSION_ID)) { ' NOTE: binding was written by a DIFFERENT session - one live session per worktree; /bind to adopt or /bind clear.' } else { '' }
        Write-Output ('[ai4good work] bound: ' + $b.project + ' (' + $b.pmId + ', ' + $b.bucket + ') wave ' + $b.wave + ' · manifest ' + $b.manifestRevision + ' · HEAD ' + $head + '.' + $sess)
    }
} catch { Write-Output '[ai4good work] banner unavailable (degraded); stamps fall back to unattributed.' }
