# banner.ps1 - SessionStart hook: a VISIBLE session disclaimer, plus the same facts as model context.
# Plain stdout only reaches the transcript, so the result is emitted as structured JSON: systemMessage
# renders in the terminal for the human, additionalContext goes to the model. Local + git only, no
# network. ASCII-only; PowerShell 5.1. Must never fail a session start.
#
# It asks stamp-hook.ps1 for the answer rather than deriving attribution a second time. Two
# implementations of "what are we working on" is two things that can disagree, which is the exact
# class of bug this whole design exists to remove.
$ErrorActionPreference = 'SilentlyContinue'

function Emit([string]$visible, [string]$context) {
    $o = @{
        systemMessage      = $visible
        hookSpecificOutput = @{
            hookEventName     = 'SessionStart'
            additionalContext = $context
        }
    }
    Write-Output ($o | ConvertTo-Json -Depth 4 -Compress)
}

try {
    $root = (& git rev-parse --show-toplevel 2>$null)
    $head = (& git rev-parse --short HEAD 2>$null)
    if ($root) { $root = $root.Trim() }
    if ($head) { $head = $head.Trim() } else { $head = '?' }

    # The stamp is the single source of truth for attribution. Keep only its human-facing lines:
    # the machine-readable tag belongs in the per-message stamp, not in a session banner.
    $stamp = @(& (Join-Path $PSScriptRoot 'stamp-hook.ps1')) | Where-Object { $_ -notmatch '^<ai4good-attribution' }

    $lines = New-Object System.Collections.ArrayList
    [void]$lines.Add('=== ai4good work session ===')
    foreach ($s in $stamp) { [void]$lines.Add('  ' + $s) }
    [void]$lines.Add('  HEAD        ' + $head)
    [void]$lines.Add('  next        /work')

    Emit ($lines -join "`n") ('ai4good work session. ' + (($stamp | Select-Object -First 2) -join ' | '))
}
catch {
    Emit '=== ai4good work session ===   banner unavailable; run /work to see attribution.' 'ai4good work: banner degraded.'
}
