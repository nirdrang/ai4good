# attribution-report.ps1 - the buildout's token-denominated burn report (attribution dogfood, AI4DEV-14).
# Read-only over this machine's Claude Code transcripts for THIS project. Correlates each
# response's PROVIDER-ECHOED token usage with the item that response was working on, and rolls
# that up the attribution chain (REQ-034's model: token-denominated, honest buckets, totals that
# reconcile).
#   powershell -File loop/work/attribution-report.ps1            -> all sessions
#   powershell -File loop/work/attribution-report.ps1 -Days 1    -> sessions touched in the last day
param([int]$Days = 0)
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------------------------
# WHY ATTRIBUTION COMES FROM THE BRANCH, NOT FROM THE STAMP (founder, 2026-08-07).
#
# The stamp is a UserPromptSubmit hook, so it NEVER fires in a subagent thread - and the subagents
# are where the work happens. On AI4DEV-48 the item ran as five orchestrator sittings, an executor,
# distillers and a mechanical, and this report saw NINE responses for it, because it only read
# main-session transcripts and only looked for a stamp.
#
# Every transcript record - main session and agent alike - carries `gitBranch`. The branch names
# exactly one item, and it is trustworthy for the same reason the stamp trusts it: the branch is
# COUPLED TO CLOSURE, since its pull request closes that item. A wrong branch surfaces as a wrong
# closure on the board rather than as a quiet error in a ledger nobody reads.
#
# An earlier design recorded an agent-to-item map at spawn time. The founder killed it: the agents
# form a TREE (the coordinator spawns a conductor, which spawns sittings, which spawn executors),
# so a map captures one edge of many - and a declared fact that drifts is the failure class this
# project exists to delete. The branch is on every record, at any nesting depth, declared by nobody.
#
# WHAT THIS UNDERCOUNTS, stated rather than hidden:
#   - work done before an agent switches off `main` or its generated `worktree-agent-*` branch,
#   - the reviewers entirely: codex and kimi are other vendors' processes and appear in no
#     Claude transcript, so an item's true cost is higher than any figure here,
#   - a branch naming two items, which resolves to unresolved rather than guessing.
# So every number below is a FLOOR, not a total.
# ---------------------------------------------------------------------------------------------

$projDir = Join-Path $env:USERPROFILE '.claude\projects\C--Users-nirdr-Downloads-ai4good'
if (-not (Test-Path $projDir)) { throw ('transcript directory not found: ' + $projDir) }
$files = @(Get-ChildItem $projDir -Filter '*.jsonl' -File)

# Agent transcripts live under the session temp directories, NOT beside the main sessions - which
# is why they were invisible to this report for its whole life.
$agentRoot = Join-Path $env:LOCALAPPDATA 'Temp\claude\C--Users-nirdr-Downloads-ai4good'
if (Test-Path $agentRoot) {
    $files += @(Get-ChildItem $agentRoot -Filter '*.output' -File -Recurse -ErrorAction SilentlyContinue)
}
if ($Days -gt 0) { $files = @($files | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-$Days) }) }

# The tag is still read as a FALLBACK for old sessions whose branches predate the id convention.
# Quotes arrive escaped (\") because a transcript is JSONL; the original pattern was written
# against the tag as it renders on screen and therefore matched nothing from the day it was
# written. Matches containing braces are refused - a transcript that READ this hook's source
# contains the tag's own format template, and it attributed real tokens to buckets named {0}.
$stampNew = [regex]'<ai4good-attribution pm=\\?"([^"\\]*)\\?" dev=\\?"([^"\\]*)\\?"/>'
$stampOld = [regex]'<ai4good-attribution wave=\\?"([^"\\]*)\\?" project=\\?"([^"\\]*)\\?" bucket=\\?"([^"\\]*)\\?"/>'
$branchRe = [regex]'"gitBranch":"([^"]*)"'
# Same tokeniser the stamp uses: strict boundaries, zero-padding normalised, ALL matches collected
# so a branch naming two items is unresolved rather than "take the first".
# CASE-INSENSITIVE, and that is not a detail: Linear's branch names are lower-case
# (`nirdrang/ai4dev-48-...`), so a case-sensitive pattern matches NOTHING and every response
# silently falls back to the stamp - which is the same shape of failure this file already carries
# two scars from. Verified against a real branch before being believed.
$idRe = New-Object System.Text.RegularExpressions.Regex(
    '(?<![A-Za-z0-9])AI4(DEV|PM)-0*([0-9]{1,7})(?![A-Za-z0-9])',
    ([System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::CultureInvariant))

function Get-BranchItems([string]$branch) {
    $ids = @()
    foreach ($m in $idRe.Matches($branch)) {
        $id = 'AI4' + $m.Groups[1].Value.ToUpperInvariant() + '-' + [string][int]$m.Groups[2].Value
        if ($ids -notcontains $id) { $ids += $id }
    }
    return $ids
}

# ---- the chains, from the cache /work writes (never a Linear call from a report)
$chains = @{}
$attrDir = Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good\attr'
foreach ($f in (Get-ChildItem $attrDir -Filter 'chain-*.json' -File -ErrorAction SilentlyContinue)) {
    try {
        $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
        $item = [string]$j.item
        $nodes = @($j.chain | ForEach-Object { [string]$_.id })
        # Duplicates exist (the same item resolved in two worktrees). Keep the LONGEST chain: a
        # shorter one is a walk that stopped early, and claiming a nearer root than the real one
        # is the confident-wrong answer this design forbids.
        if ($item -and $nodes.Count -gt 0) {
            if (-not $chains.ContainsKey($item) -or $nodes.Count -gt $chains[$item].Count) { $chains[$item] = $nodes }
        }
    } catch { }
}

$agg = @{}   # key "item|source" -> counters
function Add-Usage([string]$key, $usage, [hashtable]$agg) {
    if (-not $agg.ContainsKey($key)) {
        $agg[$key] = @{ responses = 0; inTok = [long]0; outTok = [long]0; cacheRead = [long]0; cacheWrite = [long]0 }
    }
    $a = $agg[$key]
    $a.responses++
    if ($usage.input_tokens)                { $a.inTok      += [long]$usage.input_tokens }
    if ($usage.output_tokens)               { $a.outTok     += [long]$usage.output_tokens }
    if ($usage.cache_read_input_tokens)     { $a.cacheRead  += [long]$usage.cache_read_input_tokens }
    if ($usage.cache_creation_input_tokens) { $a.cacheWrite += [long]$usage.cache_creation_input_tokens }
}

$sessions = 0
$skipped = 0
foreach ($f in $files) {
    $curBranch = ''          # derived, primary
    $curStamp = ''           # declared, fallback only
    # Shared read: a transcript belonging to a RUNNING agent or background task is locked, and a
    # report that dies on a live file can never be run while anything is working - which is
    # exactly when it is most worth running.
    try {
        $fs = New-Object System.IO.FileStream($f.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, ([System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete))
        $reader = New-Object System.IO.StreamReader($fs)
    }
    catch { $skipped++; continue }
    $sessions++
    try {
        while ($null -ne ($line = $reader.ReadLine())) {
            if ($line.IndexOf('"gitBranch"') -ge 0) {
                $bm = $branchRe.Match($line)
                if ($bm.Success) { $curBranch = $bm.Groups[1].Value }
            }
            if ($line.IndexOf('ai4good-attribution') -ge 0) {
                $m = $stampNew.Match($line)
                if ($m.Success -and ($m.Value -notmatch '[{}]')) {
                    $d = $m.Groups[2].Value
                    $curStamp = if ($d -and $d -ne 'none' -and $d -ne '-') { $d } else { '' }
                }
                else {
                    $m = $stampOld.Match($line)
                    if ($m.Success -and ($m.Value -notmatch '[{}]')) {
                        $b = $m.Groups[3].Value
                        $curStamp = if ($b) { 'legacy:' + $b } else { '' }
                    }
                }
            }
            if ($line.IndexOf('"usage"') -ge 0 -and $line.IndexOf('"output_tokens"') -ge 0) {
                try {
                    $o = $line | ConvertFrom-Json
                    $u = $null
                    if ($o.message -and $o.message.usage) { $u = $o.message.usage }
                    elseif ($o.usage) { $u = $o.usage }
                    if ($u -and $o.type -eq 'assistant') {
                        $ids = @(Get-BranchItems $curBranch)
                        if ($ids.Count -eq 1)      { Add-Usage ($ids[0] + '|branch')  $u $agg }
                        elseif ($ids.Count -gt 1)  { Add-Usage ('unresolved|branch')  $u $agg }
                        elseif ($curStamp)         { Add-Usage ($curStamp + '|stamp') $u $agg }
                        else                       { Add-Usage ('unattributed|none')  $u $agg }
                    }
                } catch { }
            }
        }
    }
    finally { $reader.Dispose() }
}

# ---- per item
$rows = @()
foreach ($k in $agg.Keys) {
    $item, $src = $k -split '\|'
    $a = $agg[$k]
    $rows += [pscustomobject]@{ Item=$item; From=$src; Responses=$a.responses; OutputTok=$a.outTok; InputTok=$a.inTok; CacheRead=$a.cacheRead; CacheWrite=$a.cacheWrite }
}
$rows = $rows | Sort-Object -Property @{e='OutputTok';Descending=$true}

# ---- rolled up the chain: every ancestor carries its descendants' cost, and the item carries its own
$roll = @{}
function Add-Roll([string]$node, $r, [hashtable]$roll) {
    if (-not $roll.ContainsKey($node)) { $roll[$node] = @{ responses = 0; outTok = [long]0; items = @() } }
    $roll[$node].responses += $r.Responses
    $roll[$node].outTok    += $r.OutputTok
    if ($roll[$node].items -notcontains $r.Item) { $roll[$node].items += $r.Item }
}
foreach ($r in $rows) {
    if ($r.Item -notmatch '^AI4(DEV|PM)-[0-9]+$') { continue }
    if ($chains.ContainsKey($r.Item)) { foreach ($n in $chains[$r.Item]) { Add-Roll $n $r $roll } }
    else { Add-Roll '(chain not cached)' $r $roll; Add-Roll $r.Item $r $roll }
}
$rollRows = @()
foreach ($k in $roll.Keys) {
    $rollRows += [pscustomobject]@{ Node=$k; Covers=$roll[$k].items.Count; Responses=$roll[$k].responses; OutputTok=$roll[$k].outTok }
}
$rollRows = $rollRows | Sort-Object -Property @{e='OutputTok';Descending=$true}

$totOut  = ($rows | Measure-Object OutputTok -Sum).Sum
$totResp = ($rows | Measure-Object Responses -Sum).Sum
$unatt   = ($rows | Where-Object { $_.Item -eq 'unattributed' } | Measure-Object OutputTok -Sum).Sum
if (-not $totOut) { $totOut = 0 }
if (-not $unatt) { $unatt = 0 }
$pct = if ($totOut -gt 0) { [math]::Round(100.0 * $unatt / $totOut, 1) } else { 0 }

Write-Output ('ai4good buildout burn report - ' + (Get-Date -Format 'yyyy-MM-dd') + ' - ' + $sessions + ' transcript file(s)' + $(if ($Days -gt 0) { ' (last ' + $Days + ' days)' } else { '' }))
Write-Output 'units: provider-echoed tokens per response (REQ-034 model); money lives elsewhere'
Write-Output 'attribution DERIVED from each record''s own git branch; the stamp is a fallback for older sessions'
Write-Output ''
Write-Output '== PER ITEM =='
$rows | Format-Table Item, From, Responses, OutputTok, InputTok, CacheRead, CacheWrite -AutoSize | Out-String -Width 200 | Write-Output
Write-Output '== ROLLED UP THE CHAIN (each node includes everything beneath it) =='
$rollRows | Format-Table Node, Covers, Responses, OutputTok -AutoSize | Out-String -Width 200 | Write-Output
Write-Output ('TOTAL: ' + $totResp + ' responses, ' + $totOut + ' output tokens. The PER ITEM table reconciles to this total by construction; the rollup deliberately double-counts, because a parent includes its children.')
Write-Output ('COORDINATOR SIGNAL - unattributed share of output tokens: ' + $pct + '%')
if ($skipped -gt 0) { Write-Output ($skipped.ToString() + ' transcript file(s) could not be opened and are NOT counted - said out loud rather than silently dropped') }
Write-Output 'Every figure is a FLOOR: reviewer spend runs on other vendors and appears in no transcript here, and work done before an agent switches off main is attributed to nothing.'
