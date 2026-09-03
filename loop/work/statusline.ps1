# statusline.ps1 - the Claude Code status bar for ai4good.
#
# Claude Code pipes a JSON blob on stdin describing the session. Five things earn their width
# (founder, 2026-07-31): the model, the PM requirement, the dev leaf, the branch, and how much
# context is left. The folder name and the dollar figure were dropped - the folder is already
# obvious from the terminal, and the spend was noise.
#
# Attribution is DERIVED from the branch (AI4DEV-36) - the same chain the stamp prints, read
# through the same work-lib helpers, never re-derived here. A status bar confidently naming the
# WRONG item is worse than one naming none.
#
# This file was missed by the AI4DEV-36 cut-over and kept reading the deleted bindings/ directory
# by hand-built path, so it reported `unattributed` for everything while spending four
# subprocesses per refresh to get there. It slipped through because the cut-over searched for
# CALLS to the binding functions and this file never called them - it rebuilt the path itself.
# The lesson is general: grepping for an API misses code that reimplemented it.
#
# COST MATTERS HERE. Claude Code spawns a fresh PowerShell for every refresh, which on Windows is
# already a few hundred milliseconds; each extra subprocess is paid on every keystroke-ish redraw
# and shows up as a client that looks perpetually busy. So: ONE git call (rev-parse takes several
# arguments at once), and no `git status --porcelain` - the dirty marker was the least valuable
# of the fields and by far the most expensive.
#
# Never throws. A status line that errors is noise in the founder's face on every keystroke.
# Set AI4GOOD_STATUSLINE_DUMP=1 to capture the raw stdin JSON for field discovery.

$ErrorActionPreference = 'SilentlyContinue'

# Write the line as UTF-8 BYTES straight to the standard output handle. PowerShell 5.1 would
# otherwise re-encode Write-Output through the console code page, which shreds the bar's block
# glyphs into replacement characters when Claude Code spawns this without a real console.
function Write-Line([string]$text) {
    try {
        $out = [Console]::OpenStandardOutput()
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($text + "`n")
        $out.Write($bytes, 0, $bytes.Length)
        $out.Flush()
    } catch {
        Write-Output $text
    }
}

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

    # SENSOR - the session's own context window (founder 2026-08-14). `context_window` reaches
    # ONLY the status line - hooks get a different payload entirely - so this is the single
    # place in the system that can see it, and it is snapshotted here for the stamp's context
    # gauge. ONE FILE PER SESSION: context fill is a per-session fact, and a single shared file
    # would let whichever session refreshed last impersonate every other session's reading - the
    # declared-fact drift the stamp exists to prevent. Written on EVERY refresh, field present or
    # not, so "no reading yet" (no file) and "this build does not deliver it" (file with null)
    # stay distinguishable. The session id is validated with the stamp hook's own pattern,
    # because it becomes part of a file name.
    try {
        $ctxSid = [string](Get-Field $j @('session_id'))
        if ($ctxSid -and $ctxSid -match '^[0-9a-fA-F-]{8,64}$') {
            $ctxDir = Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good'
            if (-not (Test-Path $ctxDir)) { New-Item -ItemType Directory -Force $ctxDir | Out-Null }
            $ctxSnap = [ordered]@{
                capturedAt    = (Get-Date).ToUniversalTime().ToString('o')
                sessionId     = $ctxSid
                contextWindow = (Get-Field $j @('context_window'))
            }
            [System.IO.File]::WriteAllText(
                (Join-Path $ctxDir ('context-' + $ctxSid + '.json')),
                ($ctxSnap | ConvertTo-Json -Depth 8),
                (New-Object System.Text.UTF8Encoding($false)))
        }
    } catch { }

    $parts = @()

    # 1. model - which brain is answering. Cheap to lose track of, expensive to be wrong about.
    $model = Get-Field $j @('model','display_name')
    if (-not $model) { $model = Get-Field $j @('model','id') }
    # Effort rides beside the model (founder 2026-09-03). `effort.level` is present only when
    # the model supports it; when absent, nothing is printed rather than a guess.
    $effort = Get-Field $j @('effort','level')
    if ($model -and $effort) { $model = '{0} @{1}' -f $model, $effort }
    if ($model) { $parts += $model }

    # 2/3/4. the binding, the leaf, and the branch. All three need the repo root.
    $dir = Get-Field $j @('workspace','current_dir')
    if (-not $dir) { $dir = Get-Field $j @('cwd') }
    if (-not $dir) { $dir = (Get-Location).Path }

    # ONE git call for both facts.
    $g = @(& git -C $dir rev-parse --show-toplevel --abbrev-ref HEAD 2>$null)
    if ($g.Count -ge 2) {
        $root = $g[0].Trim()
        $branch = $g[1].Trim()
        if (-not $branch) { $branch = '?' }

        . (Join-Path $PSScriptRoot 'work-lib.ps1')

        # The chain, exactly as the stamp resolves it: branch names the item, the cache names its
        # parents. Ids carry a short label (founder rule), truncated hard because a status bar has
        # no room for a sentence. Cache miss shows the bare item - never an invented root.
        $ids = @()
        foreach ($m in [regex]::Matches($branch, '(?i)(?<![\p{L}\p{N}])AI4(DEV|PM)-0*([0-9]{1,7})(?![\p{L}\p{N}])')) {
            $id = 'AI4' + $m.Groups[1].Value.ToUpperInvariant() + '-' + [string][int]$m.Groups[2].Value
            if ($ids -notcontains $id) { $ids += $id }
        }
        $item = if ($ids.Count -eq 1) { $ids[0] } else { '' }

        $held = $null
        try { $held = Get-HeldItem } catch { }
        if (-not $item -and $held -and ([string]$held.branch) -eq $branch -and (Test-ItemId ([string]$held.itemId))) {
            $item = [string]$held.itemId
        }

        if (-not $item) {
            $parts += $(if ($ids.Count -gt 1) { 'AMBIGUOUS' } else { 'no item' })
        }
        else {
            $chain = $null
            try { $chain = Get-Chain $branch } catch { }
            if (Test-Chain $chain $branch $item) {
                $short = @()
                foreach ($n in @($chain.chain)) {
                    $l = ([string]$n.label -replace '[\r\n|]', ' ').Trim()
                    if ($l.Length -gt 16) { $l = $l.Substring(0, 15) + [string][char]0x2026 }
                    $short += $(if ($l) { '{0} ({1})' -f $n.id, $l } else { [string]$n.id })
                }
                $parts += ($short -join ' > ')
            }
            else {
                $parts += $item
            }
        }

        $parts += $branch
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

    Write-Line ($parts -join ' | ')
} catch {
    # Last resort: say something true rather than nothing, and never a stack trace.
    Write-Line 'ai4good'
}
exit 0
