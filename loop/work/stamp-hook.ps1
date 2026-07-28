# stamp-hook.ps1 - UserPromptSubmit hook: append the attribution stamp to every message.
# ADVISORY context only (the way-of-work's client-side attribution; no token counting).
# Also counts the CONSECUTIVE-UNATTRIBUTED streak per worktree (a file the model cannot
# miscount) and escalates the stamp at thresholds; CLAUDE.md tells the agent what the
# escalation obliges it to do. Attribution stays advisory - the streak never blocks anything.
# Must be FAST and never fail the prompt: any error degrades to the unattributed stamp.
$ErrorActionPreference = 'SilentlyContinue'
$stamp = '<ai4good-attribution wave="none" project="none" bucket="unattributed"/>'
try {
    . (Join-Path $PSScriptRoot 'work-lib.ps1')
    $b = Read-Binding
    $streakFile = Join-Path (Get-StateDir) ('bindings\' + (Get-WorktreeId) + '.streak')
    if ($b -and $b.bucket) {
        if (Test-Path $streakFile) { Remove-Item $streakFile -Force }
        $allow = '[^A-Za-z0-9.\-]'
        $wave = ([string]$b.wave) -replace $allow, ''
        $proj = ([string]$b.project) -replace $allow, ''
        $bucket = ([string]$b.bucket) -replace $allow, ''
        if (-not $wave) { $wave = 'none' }
        if (-not $proj) { $proj = 'none' }
        if (-not $bucket) { $bucket = 'unattributed' }
        $stamp = ('<ai4good-attribution wave="{0}" project="{1}" bucket="{2}"/>' -f $wave, $proj, $bucket)
    } else {
        $n = 0
        if (Test-Path $streakFile) { $n = [int](Get-Content $streakFile -Raw) }
        $n++
        [System.IO.File]::WriteAllText($streakFile, [string]$n)
        $stamp = ('<ai4good-attribution wave="none" project="none" bucket="unattributed" streak="{0}"/>' -f $n)
        if ($n -ge 5) {
            $stamp += "`n" + ('ATTRIBUTION ALERT: {0} consecutive messages in this worktree are unattributed. Per CLAUDE.md, before answering, put the binding question to the user: /pm-next to pull a requirement, /bind AI4PM-NN to adopt an existing pull, or /bind exploration for untracked work. Work is never blocked - but the question must be asked.' -f $n)
        }
    }
} catch { }
Write-Output $stamp
