# stamp-hook.ps1 - UserPromptSubmit hook: the WORKING-ON disclaimer + attribution stamp.
#
# Founder ruling 2026-07-31, replacing the unattributed-streak mechanism: before EVERY prompt
# the agent (and the founder reading the transcript) sees which PM requirement and which dev
# item this worktree is working on. When no PM requirement is bound, the hook demands the
# question be put to the dev IMMEDIATELY - no counting, no thresholds. The streak design
# failed by construction: any binding silenced it, so the founder-created `bringup` bucket
# meant weeks of foundation work could run without the PM question ever being asked.
#
# The demand stops once the dev has ANSWERED - a per-worktree acknowledgment recorded by
# Set-PmAck (work-lib.ps1) - because a question re-asked every message is noise, and noise
# gets ignored. The ack is cleared with the binding when an item merges (Clear-ItemState),
# so every NEW item re-asks exactly once. No counter exists anywhere.
#
# Two slots, two sources: PM comes from the BINDING (only /pm-next writes an AI4PM id);
# DEV comes from the BRANCH (Linear's branch convention carries the id; dev work needs no
# binding of its own), with the binding's AI4DEV id as fallback for a worktree on main.
#
# Must be FAST and never fail the prompt: any error degrades to the unattributed stamp.
$ErrorActionPreference = 'SilentlyContinue'
$out = @('WORKING ON - PM: none | DEV: none | bucket: unattributed')
$out += '<ai4good-attribution pm="-" dev="-" bucket="unattributed" wave="none"/>'
try {
    . (Join-Path $PSScriptRoot 'work-lib.ps1')
    $b = Read-Binding

    $base = if ($env:CLAUDE_PROJECT_DIR -and (Test-Path $env:CLAUDE_PROJECT_DIR)) { $env:CLAUDE_PROJECT_DIR } else { '.' }
    $branch = (& git -C $base rev-parse --abbrev-ref HEAD 2>$null)
    if ($branch) { $branch = $branch.Trim() } else { $branch = '?' }

    $allow = '[^A-Za-z0-9.\-]'
    $bucket = 'unattributed'
    $wave = 'none'
    if ($b -and $b.bucket) {
        $bucket = ([string]$b.bucket) -replace $allow, ''
        $wave = ([string]$b.wave) -replace $allow, ''
        if (-not $bucket) { $bucket = 'unattributed' }
        if (-not $wave) { $wave = 'none' }
    }

    # PM slot: only a requirement pull writes an AI4PM id. Everything else is honestly none.
    $pm = 'none'
    if ($b -and ([string]$b.pmId) -match '^AI4PM-\d+$') { $pm = $Matches[0] }

    # DEV slot: the branch is the authority; the binding's AI4DEV id stands in on main.
    $dev = 'none'
    if ($branch -match '(?i)ai4dev-(\d+)') { $dev = 'AI4DEV-' + $Matches[1] }
    elseif ($b -and ([string]$b.pmId) -match '^AI4DEV-\d+$') { $dev = $Matches[0] }

    $ack = Get-PmAck
    $pmShown = $pm
    if ($pm -eq 'none' -and $ack) { $pmShown = ('none - confirmed by dev {0} ({1})' -f $ack.date, $ack.note) }

    $out = @()
    $out += ('WORKING ON - PM: {0} | DEV: {1} | bucket: {2} | branch: {3}' -f $pmShown, $dev, $bucket, $branch)
    $out += ('<ai4good-attribution pm="{0}" dev="{1}" bucket="{2}" wave="{3}"/>' -f $pm, $dev, $bucket, $wave)

    if ($pm -eq 'none' -and -not $ack) {
        $out += ('PM CHECK: no PM requirement is bound in this worktree and the dev has not confirmed ' +
            'working without one. BEFORE answering, ask the dev: should this work run under a PM item ' +
            '(/pm-next to pull one, /bind AI4PM-NN to adopt a pull), or do they confirm proceeding ' +
            'without one (bring-up / exploration)? On their answer, record it with ' +
            'Set-PmAck "<their answer in a few words>" (loop/work/work-lib.ps1). ' +
            'Work is never blocked - but the question is asked NOW, not after a count.')
    }
} catch { }
$out | ForEach-Object { Write-Output $_ }
