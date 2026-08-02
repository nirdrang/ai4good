# stamp-hook.ps1 - UserPromptSubmit hook: the WORKING ON stamp.
#
# Prints EXACTLY TWO LINES before every prompt, always, in one fixed format:
#
#   WORKING ON  <root> > <parents...> > <item>
#   IN          wt <folder> - branch <branch>
#
# Line 1 is the conclusion. Line 2 is WHAT THE CONCLUSION WAS DERIVED FROM. That pairing is the
# whole point: every past incident was line 1 disagreeing with line 2 while only line 1 was
# visible. Anything else - a conflict, an unresolved chain, a git state - APPENDS below. The two
# lines never change shape, so they are always in the same place and always mean the same thing.
#
# ATTRIBUTION IS DERIVED, NEVER DECLARED. cwd -> git worktree -> branch -> exactly one item id.
# The held item (written by /work) is a CROSS-CHECK ONLY: it can raise CONFLICT or fill a gap the
# branch left empty, but it can NEVER override the branch. A stale held item therefore makes the
# stamp louder, never wronger - the inverse of the folder-keyed binding this replaces, which
# silently substituted itself for reality (AI4DEV-24: a whole run stamped against the wrong item).
#
# NEVER CALLS LINEAR. Titles and chains come from a cache written by /work. A cache miss degrades
# to the bare item id with a note - it never guesses, and it never blocks.
#
# NEVER SILENT. On any failure this prints "stamp error: <what>" rather than something plausible.
# The dangerous failure is not a wrong stamp; it is no stamp becoming normal, after which nobody
# reads the line at all.

$ErrorActionPreference = 'Stop'

function Emit([string]$l1, [string]$l2, [string[]]$extra, [string]$pm, [string]$dev) {
    Write-Output ('WORKING ON  ' + $l1)
    Write-Output ('IN          ' + $l2)
    Write-Output ('<ai4good-attribution pm="{0}" dev="{1}"/>' -f $pm, $dev)
    foreach ($e in $extra) { if ($e) { Write-Output $e } }
}

function Fmt([string]$id, [string]$label) {
    if (-not $label) { return $id }
    $t = ($label -replace '[\r\n\|<>"()]', ' ').Trim()
    if ($t.Length -gt 40) { $t = $t.Substring(0, 37) + '...' }
    if (-not $t) { return $id }
    return ('{0} ({1})' -f $id, $t)
}

# Strict ASCII token boundaries and zero-padding normalised, so `fix/notai4dev-19x` does not
# match and `AI4DEV-019` does. ALL matches are collected: exactly one attributes, and two or more
# is unresolved rather than "take the first" - `ai4dev-19-into-ai4dev-20` silently attributed to
# 19 under the single anchored pattern this replaces.
function Get-BranchItems([string]$branch) {
    $ids = @()
    foreach ($m in [regex]::Matches($branch, '(?i)(?<![a-z0-9])ai4(dev|pm)-0*(\d+)(?![a-z0-9])')) {
        $ids += ('AI4' + $m.Groups[1].Value.ToUpper() + '-' + $m.Groups[2].Value)
    }
    return ($ids | Select-Object -Unique)
}

try {
    # State paths come from work-lib so the hook and /work can never disagree about where the
    # held item and the chain cache live. Two formulas for one path is the same drift class this
    # item exists to delete.
    . (Join-Path $PSScriptRoot 'work-lib.ps1')

    $base = if ($env:CLAUDE_PROJECT_DIR -and (Test-Path $env:CLAUDE_PROJECT_DIR)) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }

    # Identity is git's, not the path string's. Windows case-folding and junctions make paths lie
    # in both directions, so the worktree is identified by what git resolves, never by text.
    $top = (& git -C $base rev-parse --show-toplevel 2>$null)
    $gitDir = (& git -C $base rev-parse --git-dir 2>$null)
    if (-not $top -or -not $gitDir) {
        Emit 'unknown (stamp error: not a git worktree)' ('wt ? - ' + $base) @() '-' '-'
        exit 0
    }
    $top = $top.Trim(); $gitDir = $gitDir.Trim()
    if (-not [System.IO.Path]::IsPathRooted($gitDir)) { $gitDir = Join-Path $top $gitDir }
    $wt = Split-Path -Leaf $top
    $extra = @()

    # Named git states. The earlier design printed "nothing" during a rebase or a bisect - hours of
    # genuinely attributed work reported as unattributed, which teaches you to ignore the line.
    if ((Test-Path (Join-Path $gitDir 'rebase-merge')) -or (Test-Path (Join-Path $gitDir 'rebase-apply'))) {
        $extra += 'REBASE IN PROGRESS - closure blocked until it finishes'
    }
    if (Test-Path (Join-Path $gitDir 'BISECT_LOG')) {
        $extra += 'BISECT IN PROGRESS - closure blocked until it finishes'
    }

    $branch = (& git -C $base symbolic-ref --short -q HEAD 2>$null)
    $detached = $false
    if ($branch) { $branch = $branch.Trim() } else {
        $detached = $true
        $sha = (& git -C $base rev-parse --short HEAD 2>$null)
        $branch = if ($sha) { 'detached@' + $sha.Trim() } else { 'detached@unknown' }
    }

    # The held item - a cross-check only. Keyed by repo root: two sessions in one folder share it,
    # which can produce a spurious CONFLICT but can never produce a wrong attribution, because it
    # is never the answer.
    $held = $null
    try { $held = Get-HeldItem } catch { }
    $heldId = if ($held) { [string]$held.itemId } else { '' }

    $ids = @(Get-BranchItems $branch)
    $item = ''
    if ($ids.Count -eq 1) { $item = $ids[0] }
    elseif ($ids.Count -gt 1) {
        $extra += ('BRANCH NAMES ' + $ids.Count + ' ITEMS (' + ($ids -join ', ') + ') - unresolved; rename the branch or say which')
    }

    $line2 = ('wt {0} - branch {1}' -f $wt, $branch)

    # CONFLICT outranks everything. Never pick a side: exactly one of the two describes work that
    # is not happening, and that is the condition the old design could never see.
    if ($item -and $heldId -and $item -ne $heldId) {
        Emit ('CONFLICT - branch says ' + $item + ', session holds ' + $heldId) $line2 `
        ($extra + 'Attribution unresolved until you say which is right. Building is not blocked; closing is.') 'conflict' 'conflict'
        exit 0
    }

    # Branch names nothing, but the session holds an item: fill the gap, and say it is a gap.
    if (-not $item -and $heldId -and $ids.Count -eq 0) {
        $extra += ('held, not branch - the branch names no item' + $(if ($detached) { ' (detached HEAD)' } else { '' }))
        $item = $heldId
    }

    if (-not $item) {
        Emit 'nothing' $line2 ($extra + 'no item in the branch and none held - exploring? say so') 'none' 'none'
        exit 0
    }

    # The chain, from cache. Keyed by worktree id + branch, so two clones never share an entry
    # and a branch renamed into a previously-cached name misses instead of hitting.
    $chain = $null
    try { $chain = Get-Chain $branch } catch { }

    $root = $item
    if ($chain -and ([string]$chain.item) -eq $item -and $chain.chain) {
        $parts = @()
        foreach ($n in $chain.chain) { $parts += (Fmt ([string]$n.id) ([string]$n.label)) }
        $line1 = ($parts -join ' > ')
        $root = [string]$chain.chain[0].id
        if ($chain.resolvedAt) {
            try {
                if (((Get-Date) - [datetime]::Parse([string]$chain.resolvedAt)).TotalHours -gt 24) {
                    $extra += 'STALE - chain cached over 24h ago; /work refreshes it'
                }
            } catch { }
        }
    }
    else {
        $line1 = $item
        $extra += 'CHAIN UNRESOLVED - no cached parents for this branch; /work resolves it'
    }

    Emit $line1 $line2 $extra $root $item
}
catch {
    Write-Output ('WORKING ON  unknown (stamp error: ' + ($_.Exception.Message -replace '[\r\n]', ' ') + ')')
    Write-Output 'IN          wt ? - branch ?'
    Write-Output '<ai4good-attribution pm="-" dev="-"/>'
}
