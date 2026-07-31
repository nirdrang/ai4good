# statusline.ps1 - the Claude Code status bar for ai4good.
#
# Claude Code pipes a JSON blob on stdin describing the session. Five things earn their width
# (founder, 2026-07-31): the model, the PM requirement, the dev leaf, the branch, and how much
# context is left. The folder name and the dollar figure were dropped - the folder is already
# obvious from the terminal, and the spend was noise.
#
# The PM item comes from the worktree's attribution BINDING; the dev item is read out of the
# BRANCH NAME, because dev verbs deliberately write no binding (d88) and Linear's branch
# convention already carries the id. Two sources, because they are genuinely two facts: a
# session can sit on a leaf branch under a bound requirement, or on main under none.
#
# The binding is keyed by WORKTREE, not by session, so the answer depends on which folder the
# session runs in - exactly what the status bar should surface, since several worktrees run in
# parallel and each is bound to a different item. Get-WorktreeIdFromRoot is reused from
# work-lib.ps1 rather than re-derived: two implementations of one identity drift, and a status
# bar confidently naming the WRONG item is worse than one naming none.
#
# Never throws. A status line that errors is noise in the founder's face on every keystroke.
# Set AI4GOOD_STATUSLINE_DUMP=1 to capture the raw stdin JSON for field discovery.

$ErrorActionPreference = 'SilentlyContinue'

function Get-Field($obj, [string[]]$path) {
    $cur = $obj
    foreach ($p in $path) {
        if ($null -eq $cur) { return $null }
        $cur = $cur.$p
    }
    return $cur
}

try {
    $raw = [Console]::In.ReadToEnd()
    $j = $null
    if ($raw) {
        if ($env:AI4GOOD_STATUSLINE_DUMP -eq '1') {
            $dump = Join-Path $env:TEMP 'ai4good-statusline-input.json'
            [System.IO.File]::WriteAllText($dump, $raw)
        }
        try { $j = ConvertFrom-Json $raw } catch { }
    }

    $parts = @()

    # 1. model - which brain is answering. Cheap to lose track of, expensive to be wrong about.
    $model = Get-Field $j @('model','display_name')
    if (-not $model) { $model = Get-Field $j @('model','id') }
    if ($model) { $parts += $model }

    # 2/3/4. the binding, the leaf, and the branch. All three need the repo root.
    $dir = Get-Field $j @('workspace','current_dir')
    if (-not $dir) { $dir = Get-Field $j @('cwd') }
    if (-not $dir) { $dir = (Get-Location).Path }

    $root = (& git -C $dir rev-parse --show-toplevel 2>$null)
    if ($root) {
        $root = $root.Trim()

        $branch = (& git -C $dir rev-parse --abbrev-ref HEAD 2>$null)
        if ($branch) { $branch = $branch.Trim() } else { $branch = '?' }

        # PM slot. A requirement pull writes an AI4PM id; bring-up and exploration do not, and
        # saying so plainly beats implying a requirement that was never pulled.
        . (Join-Path $PSScriptRoot 'work-lib.ps1')
        $wid = Get-WorktreeIdFromRoot $root
        $bpath = Join-Path $env:LOCALAPPDATA ('ai4good-build\nirdrang-ai4good\bindings\' + $wid + '.json')
        $binding = $null
        if (Test-Path $bpath) {
            try { $binding = Get-Content $bpath -Raw | ConvertFrom-Json } catch { }
        }

        if (-not $binding) {
            $parts += 'unattributed'
        } elseif ($binding.pmId -match '^AI4PM-\d+$') {
            $parts += ('PM ' + $binding.pmId)
        } elseif ($binding.bucket -eq 'exploration') {
            $parts += 'exploration'
        } else {
            $parts += 'PM -'
        }

        # DEV slot. The branch is the authority (Linear's gitBranchName carries the id); a
        # bring-up binding names its dev sub-item and stands in when the branch names none.
        $dev = $null
        if ($branch -match '(?i)(ai4dev)-(\d+)') { $dev = 'AI4DEV-' + $Matches[2] }
        if (-not $dev -and $binding -and $binding.pmId -match '^AI4DEV-\d+$') { $dev = $binding.pmId }
        if ($dev) { $parts += ('DEV ' + $dev) } else { $parts += 'DEV -' }

        # Branch, with the uncommitted-work marker.
        $dirty = ''
        if ((& git -C $dir status --porcelain 2>$null | Select-Object -First 1)) { $dirty = '*' }
        $parts += ($branch + $dirty)
    }

    # 5. context remaining, as a bar. Emitted by codepoint so the file itself stays ASCII and
    #    cannot be mangled by whatever encoding PowerShell 5.1 decides to read it with.
    $pct = Get-Field $j @('context_window','used_percentage')
    $full  = [string][char]0x2588
    $light = [string][char]0x2591
    if ($null -ne $pct) {
        $used = [int][math]::Round([double]$pct)
        if ($used -lt 0) { $used = 0 }
        if ($used -gt 100) { $used = 100 }
        $filled = [int][math]::Floor($used * 20 / 100)
        $bar = ($full * $filled) + ($light * (20 - $filled))
        $parts += ('[' + $bar + '] ' + $used + '%')
    } else {
        # Never invent a number the payload did not supply.
        $parts += ('[' + ($light * 20) + '] ?%')
    }

    Write-Output ($parts -join ' | ')
} catch {
    # Last resort: say something true rather than nothing, and never a stack trace.
    Write-Output 'ai4good'
}
exit 0
