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
# Two slots, two TIERS (founder correction 2026-08-01). The PM slot shows the PULL - the phase
# this worktree is bracketing, which is either a product requirement (AI4PM-NN) or an approved
# bring-up parent (AI4DEV-3, thirteen sub-items). The DEV slot shows the ONE ITEM being built
# inside it, and the branch is its authority (Linear's branch convention carries the id), with
# the binding's devId standing in for a worktree sitting on main. The binding's pmId is NEVER a
# fallback for the item slot: under a bring-up pull that id is the PARENT, so using it there
# would report the whole phase as the item being built.
#
# Both slots print the TITLE beside the id (founder instruction 2026-08-01: bare item numbers
# are unmemorable). Titles are cached in the binding by the verb that set the slot - the hook
# must stay fast and must never call Linear. A missing title degrades to the bare id.
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

    # `id (very short title)` - founder instruction 2026-08-01: an id alone gives no recall, so
    # every id printed carries a short label in PARENTHESES. The label is a HINT (2-5 words),
    # not Linear's full title, and it comes from a cache because this hook runs before every
    # prompt and must never call Linear. Kept on one line and out of the pipe fields' way;
    # nested parens are stripped so the wrapper stays unambiguous; a missing label degrades to
    # the bare id rather than guessing.
    function Fmt([string]$id, [string]$title) {
        if (-not $title) { return $id }
        $t = ($title -replace '[\r\n\|<>"()]', ' ').Trim()
        if ($t.Length -gt 40) { $t = $t.Substring(0, 37) + '...' }
        if (-not $t) { return $id }
        return ('{0} ({1})' -f $id, $t)
    }

    # PM slot = the PULL: a product requirement, or an approved bring-up parent.
    $pm = 'none'
    $pmKind = ''
    if ($b -and ([string]$b.pmId) -match '^AI4PM-\d+$') { $pm = $Matches[0] }
    elseif ($b -and ([string]$b.pmId) -match '^AI4DEV-\d+$') { $pm = $Matches[0]; $pmKind = ' [bring-up phase, not a product requirement]' }

    # DEV slot = the ONE ITEM being built. Branch first; binding's devId on main. The title
    # applies only when the cached devId still matches what the branch says.
    $dev = 'none'
    $devTitle = ''
    if ($branch -match '(?i)ai4dev-(\d+)') { $dev = 'AI4DEV-' + $Matches[1] }
    elseif ($b -and ([string]$b.devId) -match '^AI4DEV-\d+$') { $dev = $Matches[0] }
    if ($b -and $dev -ne 'none' -and ([string]$b.devId) -eq $dev) { $devTitle = [string]$b.devTitle }

    $ack = Get-PmAck
    $isReq = $pm -match '^AI4PM-\d+$'
    $pmShown = if ($pm -eq 'none') { 'none' } else { (Fmt $pm ([string]$b.pmTitle)) + $pmKind }
    if (-not $isReq -and $ack) { $pmShown += (' [confirmed by dev {0}: {1}]' -f $ack.date, $ack.note) }

    $out = @()
    $out += ('WORKING ON - PM: {0} | DEV: {1} | bucket: {2} | branch: {3}' -f $pmShown, (Fmt $dev $devTitle), $bucket, $branch)
    $out += ('<ai4good-attribution pm="{0}" dev="{1}" bucket="{2}" wave="{3}"/>' -f $pm, $dev, $bucket, $wave)

    if (-not $isReq -and -not $ack) {
        $out += ('PM CHECK: no PM REQUIREMENT is bound in this worktree (a bring-up phase is not one) ' +
            'and the dev has not confirmed working without one. ' +
            'BEFORE answering, ask the dev: should this work run under a PM item ' +
            '(/pm-next to pull one, /bind AI4PM-NN to adopt a pull), or do they confirm proceeding ' +
            'without one (bring-up / exploration)? On their answer, record it with ' +
            'Set-PmAck "<their answer in a few words>" (loop/work/work-lib.ps1). ' +
            'Work is never blocked - but the question is asked NOW, not after a count.')
    }
} catch { }
$out | ForEach-Object { Write-Output $_ }
