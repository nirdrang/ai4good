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
    # THE FRESHNESS BASELINE IS PROCESS-BOUND, NOT SESSION-BOUND (founder 2026-08-11: "an addon
    # to our resume - so it will zap the state"). A session START - fresh launch, resume, clear -
    # is a NEW process that just loaded CLAUDE.md and the agent registry from disk, so the old
    # baseline describes a dead process and would raise FALSE drift alarms (measured: a resumed
    # session's probes returned the newest contract text while the old baseline still cried
    # stale). Delete it here; the first prompt re-lays it from what this process actually loaded.
    # A COMPACT is the one start where the process SURVIVES with its old registry - there the
    # baseline stays, because its staleness claims remain true. The held label is untouched
    # always: the conversation and its declared thread continue across a resume.
    $sid = ''
    try {
        $raw = ''
        if ([Console]::IsInputRedirected) { $raw = [Console]::In.ReadToEnd() }
        $m = [regex]::Match($raw, '"session_id"\s*:\s*"([0-9a-fA-F-]{8,64})"')
        if ($m.Success) { $sid = $m.Groups[1].Value }
        $isCompact = ($raw -match '"source"\s*:\s*"compact"')
        if ($sid -and -not $isCompact) {
            $wf = Join-Path $env:LOCALAPPDATA ('ai4good-build\nirdrang-ai4good\sessions\' + $sid + '\watch.json')
            if (Test-Path -LiteralPath $wf) { Remove-Item -LiteralPath $wf -Force }
        }
    }
    catch { }

    # ONE base, resolved exactly as the stamp resolves it. Reading HEAD from the process's own
    # working directory while the stamp reads CLAUDE_PROJECT_DIR would print one repository's
    # attribution beside another repository's commit.
    $base = if ($env:CLAUDE_PROJECT_DIR -and (Test-Path -LiteralPath $env:CLAUDE_PROJECT_DIR)) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
    $head = (& git -C $base rev-parse --short HEAD 2>$null)
    if ($head) { $head = $head.Trim() } else { $head = '?' }

    # The stamp is the single source of truth for attribution. Keep only its human-facing lines:
    # the machine-readable tag belongs in the per-message stamp, not in a session banner.
    # The session id is passed as a PARAMETER: this banner already drained the payload from
    # stdin, so the stamp's own stdin read would find nothing and the banner's stamp lines
    # would lose their session prefix (observed on every session start until 2026-08-12).
    $stamp = @(& (Join-Path $PSScriptRoot 'stamp-hook.ps1') -SessionId $sid) | Where-Object { $_ -notmatch '^<ai4good-attribution' }

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
