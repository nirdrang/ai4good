# status.ps1 - read-only report of this worktree's attribution state (the /bound verb).
# Writes nothing, touches no Linear state. ASCII-only; PowerShell 5.1.
$ErrorActionPreference = 'SilentlyContinue'
. (Join-Path $PSScriptRoot 'work-lib.ps1')

$root   = Get-RepoRoot
$wid    = Get-WorktreeId
$file   = Get-BindingPath
$b      = Read-Binding
$head   = (& git -C $root rev-parse --short HEAD).Trim()
$branch = (& git -C $root rev-parse --abbrev-ref HEAD).Trim()
# Print the stamp the hook itself produces - never a second implementation that could drift.
$stamp  = & (Join-Path $PSScriptRoot 'stamp-hook.ps1')

Write-Output 'Attribution for this worktree'
Write-Output ('  folder  : ' + $root + '  (id ' + $wid + ')')
Write-Output ('  git     : ' + $branch + ' @ ' + $head)

if (-not $b) {
    Write-Output '  binding : NONE - this worktree is not bound to a requirement.'
    Write-Output '            Every message here is counted as unattributed.'
    Write-Output '            Use /pm-next to pull a requirement, /bind bringup AI4DEV-NN for'
    Write-Output '            approved foundation work, or /bind exploration if the work is'
    Write-Output '            genuinely untracked.'
} else {
    Write-Output ('  binding : ' + $b.project + ' (' + $b.pmId + ') - bucket ' + $b.bucket + ', wave ' + $b.wave)
    if ($b.manifestRevision) {
        Write-Output ('            manifest ' + $b.manifestRevision + ' ' + $b.manifestPath)
    }
    Write-Output ('            written ' + $b.writtenAt)
    if ($env:CLAUDE_SESSION_ID -and $b.sessionId -and ($b.sessionId -ne $env:CLAUDE_SESSION_ID)) {
        Write-Output '            NOTE: written by a DIFFERENT session. One live session per worktree -'
        Write-Output '            /bind AI4PM-NN to adopt deliberately, or /bind clear.'
    }
}

Write-Output ('  stamp   : ' + $stamp)
Write-Output ('  file    : ' + $file)
