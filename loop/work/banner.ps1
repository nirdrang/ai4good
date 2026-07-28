# banner.ps1 - SessionStart hook: a VISIBLE session disclaimer, plus the same facts as model context.
# Plain stdout only reaches the transcript, so the result is emitted as structured JSON: systemMessage
# renders in the terminal for the human, additionalContext goes to the model. Local + git only, no
# network. ASCII-only; PowerShell 5.1. Must never fail a session start.
$ErrorActionPreference = 'SilentlyContinue'

function Emit([string]$visible, [string]$context) {
    $o = @{
        systemMessage = $visible
        hookSpecificOutput = @{
            hookEventName     = 'SessionStart'
            additionalContext = $context
        }
    }
    Write-Output ($o | ConvertTo-Json -Depth 4 -Compress)
}

try {
    . (Join-Path $PSScriptRoot 'work-lib.ps1')
    $root   = Get-RepoRoot
    $b      = Read-Binding
    $head   = (& git -C $root rev-parse --short HEAD).Trim()
    $branch = (& git -C $root rev-parse --abbrev-ref HEAD).Trim()

    # One line per session fact. Extend this list as more facts become available - for volunteers
    # that means fuel runway, unread NGO comments, and active-task age (REQ-028's session banner).
    $lines = New-Object System.Collections.ArrayList
    [void]$lines.Add('=== ai4good work session ===')

    if (-not $b) {
        [void]$lines.Add('  attribution : NOT BOUND - every message here counts as unattributed')
        [void]$lines.Add('  to fix      : /pm-next (requirement), /bind bringup AI4DEV-NN')
        [void]$lines.Add('                (foundation work), or /bind exploration (untracked)')
        $context = 'ai4good work: no binding in this worktree; messages stamp unattributed.'
    } else {
        [void]$lines.Add('  attribution : ' + $b.project + ' (' + $b.pmId + ') - ' + $b.bucket + ', wave ' + $b.wave)
        if ($env:CLAUDE_SESSION_ID -and $b.sessionId -and ($b.sessionId -ne $env:CLAUDE_SESSION_ID)) {
            [void]$lines.Add('  warning     : binding written by a DIFFERENT session - one live session per')
            [void]$lines.Add('                worktree; /bind AI4PM-NN to adopt, or /bind clear')
        }
        $context = ('ai4good work: bound to ' + $b.project + ' (' + $b.pmId + '), bucket ' + $b.bucket + ', wave ' + $b.wave + '.')
    }

    [void]$lines.Add('  code        : ' + $branch + ' @ ' + $head)
    [void]$lines.Add('  detail      : /bound')

    Emit ($lines -join "`n") $context
} catch {
    Emit '=== ai4good work session ===   banner unavailable; stamps fall back to unattributed.' 'ai4good work: banner degraded; attribution may be unattributed.'
}
