# attribution-report.ps1 - the buildout's token-denominated burn report (attribution dogfood, AI4DEV-14).
# Read-only over this machine's Claude Code transcripts for THIS project. Correlates each
# response's PROVIDER-ECHOED token usage with the item that response was working on, and rolls
# that up the attribution chain (REQ-034's model: token-denominated, honest buckets, totals that
# reconcile).
#   powershell -File loop/work/attribution-report.ps1                    -> all sessions
#   powershell -File loop/work/attribution-report.ps1 -Days 1            -> touched in the last day
#   powershell -File loop/work/attribution-report.ps1 -Item AI4DEV-79    -> one item only
#   powershell -File loop/work/attribution-report.ps1 -Json              -> aggregates as JSON
#
# The five root parameters exist so the selftest can point the report at a synthetic store. They
# default to this machine's real roots, so a default invocation is unchanged.
param(
    [int]$Days = 0,
    [string]$Item = '',
    [switch]$Json,
    [string]$ProjectsDir   = (Join-Path $env:USERPROFILE '.claude\projects\C--Users-nirdr-Downloads-ai4good'),
    [string]$AttrDir       = (Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good\attr'),
    [string]$ItemsDir      = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'loop\items'),
    [string]$CodexSessions = (Join-Path $env:USERPROFILE '.codex\sessions'),
    [string]$KimiRoot      = (Join-Path $env:USERPROFILE '.kimi-code\sessions')
)
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

$projDir = $ProjectsDir
if (-not (Test-Path $projDir)) { throw ('transcript directory not found: ' + $projDir) }
$files = @(Get-ChildItem $projDir -Filter '*.jsonl' -File)

# Agent transcripts live under the session temp directories, NOT beside the main sessions - which
# is why they were invisible to this report for its whole life.
$agentRoot = Join-Path $env:LOCALAPPDATA 'Temp\claude\C--Users-nirdr-Downloads-ai4good'
if (Test-Path $agentRoot) {
    $files += @(Get-ChildItem $agentRoot -Filter '*.output' -File -Recurse -ErrorAction SilentlyContinue)
}
if ($Days -gt 0) { $files = @($files | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-$Days) }) }

# -Item normalisation: accept AI4DEV-79, ai4dev-79, or a bare 79, and turn it into the canonical id.
$ItemFilter = ''
if ($Item) {
    $im = [regex]::Match($Item, '(?i)(?:AI4(DEV|PM)-)?0*([0-9]{1,7})')
    if (-not $im.Success) { throw ('unrecognised -Item value: ' + $Item) }
    $prefix = if ($im.Groups[1].Value) { $im.Groups[1].Value.ToUpperInvariant() } else { 'DEV' }
    $ItemFilter = 'AI4' + $prefix + '-' + [string][int]$im.Groups[2].Value
}

# ---------------------------------------------------------------------------------------------
# ROLE COMES FROM THE SPAWN CALL, NOT FROM A `ROLE:` LINE IN THE TRANSCRIPT (fixed 2026-08-10).
# The premise the old detector rested on - "the contract's `ROLE:` line reaches the transcript" -
# is FALSE for the current agents: a conductor's own `.output` file contains no `ROLE: conductor`.
# The only `ROLE:` strings that appear are ones an agent READ from a sibling contract as a tool
# result, so the detector reported the file it read (distiller) rather than the agent it was
# (reviewer-runner) - a confident-wrong answer.
# The honest signal: the PARENT records `subagent_type` when it spawns, and the spawn's tool_result
# hands back the child's `agentId`. Each agent transcript is the file `<agentId>.output`. So a
# first pass pairs the two by the shared tool_use id, building agentId -> role; the second pass
# reads each file's role from its own name. A main-session `.jsonl` was spawned by nobody and is
# the coordinator by definition.
$roleOfAgent = @{}
$typeRe   = [regex]'"subagent_type"\s*:\s*"([a-z][a-z0-9-]{2,30})"'
$tuIdRe   = [regex]'"(?:id|tool_use_id)"\s*:\s*"(toolu_[A-Za-z0-9]+)"'
$agentIdRe= [regex]'agentId:\s*(a[0-9a-f]{6,})'
foreach ($f in $files) {
    try {
        $fs = New-Object System.IO.FileStream($f.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, ([System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete))
        $rd = New-Object System.IO.StreamReader($fs)
    } catch { continue }
    $pending = @{}   # tool_use id -> subagent_type, within THIS parent transcript
    try {
        while ($null -ne ($line = $rd.ReadLine())) {
            if ($line.IndexOf('"subagent_type"') -ge 0) {
                $tm = $typeRe.Match($line); $im2 = $tuIdRe.Match($line)
                if ($tm.Success -and $im2.Success) { $pending[$im2.Groups[1].Value] = $tm.Groups[1].Value }
            }
            elseif ($line.IndexOf('agentId:') -ge 0) {
                $am = $agentIdRe.Match($line); $im2 = $tuIdRe.Match($line)
                if ($am.Success -and $im2.Success -and $pending.ContainsKey($im2.Groups[1].Value)) {
                    $roleOfAgent[$am.Groups[1].Value] = $pending[$im2.Groups[1].Value]
                }
            }
        }
    } finally { $rd.Dispose() }
}

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
$attrDir = $AttrDir
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
$roleAgg = @{}  # key "item|role" -> counters
$agentItem = @{}  # agent id (the task file's base name) -> the item it worked on
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
    # role from the spawn map: an `.output` file is named by its agentId; a main `.jsonl` session
    # was spawned by nobody and is the coordinator.
    $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $curRole = if ($f.Extension -eq '.output') { if ($roleOfAgent.ContainsKey($base)) { $roleOfAgent[$base] } else { 'unmarked agent' } } else { 'coordinator' }
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
                        if ($ids.Count -eq 1) {
                            Add-Usage ($ids[0] + '|' + $curRole) $u $roleAgg
                            $agentItem[$base] = $ids[0]
                        }
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

# ---- vendor spend (codex), joined by the session id the reviewer printed into its own log
#
# Every codex run writes a header containing `session id: <uuid>`, and we COMMIT those logs into
# loop/items/<ITEM>/ - so the ids live in the repository and survive the artifact sweep. Codex
# stores each run as sessions/<y>/<m>/<d>/rollout-<timestamp>-<uuid>.jsonl carrying real token
# counts. Joining the two attributes reviewer spend to the item whose folder holds the log:
# derived from what the tool emitted and what the item recorded, declared by nobody.
#
# KIMI IS INCLUDED, and an earlier version of this file claimed it could not be. That claim was
# FALSE and was written after a search that used `-SimpleMatch` with a pattern containing `|`,
# so it looked for the literal pipes instead of the alternatives and found nothing. The founder
# pointed at the real location. Kimi keeps
# ~/.kimi-code/sessions/wd_agent-<agentId>_*/session_*/agents/*/wire.jsonl, whose usage records
# read {inputOther, output, inputCacheRead, inputCacheCreation} and are PER TURN - so they are
# summed, unlike codex's cumulative total. The directory name embeds the id of the agent that
# launched it, and that agent's own transcript gives the item, so the join needs nothing declared.
$vendor = @{}
$itemsDir = $ItemsDir
$sessRe = [regex]'session id:\s*([0-9a-fA-F-]{36})'
$rollouts = @{}
$codexSessions = $CodexSessions
if (Test-Path $codexSessions) {
    foreach ($rf in (Get-ChildItem $codexSessions -Recurse -File -Filter 'rollout-*.jsonl' -ErrorAction SilentlyContinue)) {
        $mm = [regex]::Match($rf.Name, '([0-9a-fA-F-]{36})\.jsonl$')
        if ($mm.Success) { $rollouts[$mm.Groups[1].Value.ToLower()] = $rf.FullName }
    }
}
if (Test-Path $itemsDir) {
    foreach ($dir in (Get-ChildItem $itemsDir -Directory -ErrorAction SilentlyContinue)) {
        $item = $dir.Name
        # -Recurse: since 2026-08-09 reviewer logs land in loop/items/<ITEM>/artifacts/, one level down
        foreach ($log in (Get-ChildItem $dir.FullName -File -Filter '*stderr*' -Recurse -ErrorAction SilentlyContinue)) {
            foreach ($sm in $sessRe.Matches([System.IO.File]::ReadAllText($log.FullName))) {
                $sid = $sm.Groups[1].Value.ToLower()
                if (-not $rollouts.ContainsKey($sid)) { continue }
                if (-not $vendor.ContainsKey($item)) { $vendor[$item] = @{ runs = 0; inTok = [long]0; outTok = [long]0; cached = [long]0 } }
                $v = $vendor[$item]; $v.runs++
                foreach ($l in [System.IO.File]::ReadLines($rollouts[$sid])) {
                    if ($l.IndexOf('"output_tokens"') -lt 0) { continue }
                    try {
                        $o = $l | ConvertFrom-Json
                        $tu = $null
                        if ($o.payload -and $o.payload.info -and $o.payload.info.total_token_usage) { $tu = $o.payload.info.total_token_usage }
                        elseif ($o.info -and $o.info.total_token_usage) { $tu = $o.info.total_token_usage }
                        if ($tu) {
                            # total_token_usage is CUMULATIVE for the session, so the last one wins
                            # rather than being summed - adding them would multiply the real cost.
                            $v.inTok = [long]$tu.input_tokens; $v.outTok = [long]$tu.output_tokens
                            if ($tu.cached_input_tokens) { $v.cached = [long]$tu.cached_input_tokens }
                        }
                    } catch { }
                }
            }
        }
    }
}

$kimi = @{}
$kimiRoot = $KimiRoot
if (Test-Path $kimiRoot) {
    foreach ($wd in (Get-ChildItem $kimiRoot -Directory -ErrorAction SilentlyContinue)) {
        $am = [regex]::Match($wd.Name, 'wd_agent-([A-Za-z0-9]+)_')
        if (-not $am.Success) { continue }
        $agentId = $am.Groups[1].Value
        if (-not $agentItem.ContainsKey($agentId)) { continue }
        $item = $agentItem[$agentId]
        foreach ($wire in (Get-ChildItem $wd.FullName -Recurse -File -Filter 'wire.jsonl' -ErrorAction SilentlyContinue)) {
            if (-not $kimi.ContainsKey($item)) { $kimi[$item] = @{ sessions = 0; inTok = [long]0; outTok = [long]0; cached = [long]0 } }
            $kimi[$item].sessions++
            foreach ($l in [System.IO.File]::ReadLines($wire.FullName)) {
                if ($l.IndexOf('"usage"') -lt 0) { continue }
                try {
                    $o = $l | ConvertFrom-Json
                    $u2 = $o.usage
                    if ($u2) {
                        if ($u2.inputOther)         { $kimi[$item].inTok  += [long]$u2.inputOther }
                        if ($u2.output)             { $kimi[$item].outTok += [long]$u2.output }
                        if ($u2.inputCacheRead)     { $kimi[$item].cached += [long]$u2.inputCacheRead }
                    }
                } catch { }
            }
        }
    }
}

$totOut  = ($rows | Measure-Object OutputTok -Sum).Sum
$totResp = ($rows | Measure-Object Responses -Sum).Sum
$unatt   = ($rows | Where-Object { $_.Item -eq 'unattributed' } | Measure-Object OutputTok -Sum).Sum
if (-not $totOut) { $totOut = 0 }
if (-not $unatt) { $unatt = 0 }
$pct = if ($totOut -gt 0) { [math]::Round(100.0 * $unatt / $totOut, 1) } else { 0 }

# -Item scopes every section to one item (and, for the rollup, to nodes that cover it).
$scopeNote = if ($ItemFilter) { ' - SCOPED to ' + $ItemFilter } else { '' }
if ($ItemFilter) {
    $rows     = @($rows     | Where-Object { $_.Item -eq $ItemFilter })
    $rollRows = @($rollRows | Where-Object { $_.Node -eq $ItemFilter -or $chains[$ItemFilter] -contains $_.Node })
}

# Every row set is built here, BEFORE any output, so the JSON oracle and the printed tables
# describe exactly the same aggregates - one derivation, two renderings.
$roleRows = @()
foreach ($k in $roleAgg.Keys) {
    $it, $rl = $k -split '\|'
    if ($ItemFilter -and $it -ne $ItemFilter) { continue }
    $a = $roleAgg[$k]
    $roleRows += [pscustomobject]@{ Item=$it; Role=$rl; Responses=$a.responses; InputTok=$a.inTok; OutputTok=$a.outTok; CacheRead=$a.cacheRead; CacheWrite=$a.cacheWrite }
}
$roleRows = @($roleRows | Sort-Object Item, @{e='OutputTok';Descending=$true})

$vRows = @()
foreach ($k in $vendor.Keys) {
    if ($ItemFilter -and $k -ne $ItemFilter) { continue }
    $vRows += [pscustomobject]@{ Item=$k; Runs=$vendor[$k].runs; InputTok=$vendor[$k].inTok; OutputTok=$vendor[$k].outTok; CachedIn=$vendor[$k].cached }
}
$vRows = @($vRows | Sort-Object OutputTok -Descending)

$kRows = @()
foreach ($k in $kimi.Keys) {
    if ($ItemFilter -and $k -ne $ItemFilter) { continue }
    $kRows += [pscustomobject]@{ Item=$k; Sessions=$kimi[$k].sessions; InputTok=$kimi[$k].inTok; OutputTok=$kimi[$k].outTok; CacheRead=$kimi[$k].cached }
}
$kRows = @($kRows | Sort-Object OutputTok -Descending)

# -Json emits the aggregates instead of the tables, so a test asserts on numbers rather than on
# Format-Table whitespace. Windows PowerShell 5.1 needs an explicit -Depth.
if ($Json) {
    $out = [pscustomobject]@{
        rows      = @($rows)
        roleRows  = $roleRows
        rollRows  = @($rollRows)
        codexRows = $vRows
        kimiRows  = $kRows
        totals    = [pscustomobject]@{
            responses             = $totResp
            outputTok             = $totOut
            unattributedOutputTok = $unatt
            unattributedPct       = $pct
            transcriptFiles       = $sessions
            skippedFiles          = $skipped
            item                  = $ItemFilter
            days                  = $Days
        }
    }
    $out | ConvertTo-Json -Depth 6
    exit 0
}

Write-Output ('ai4good buildout burn report - ' + (Get-Date -Format 'yyyy-MM-dd') + ' - ' + $sessions + ' transcript file(s)' + $(if ($Days -gt 0) { ' (last ' + $Days + ' days)' } else { '' }) + $scopeNote)
Write-Output 'units: provider-echoed tokens per response (REQ-034 model); money lives elsewhere'
Write-Output 'attribution DERIVED from each record''s own git branch; role DERIVED from the spawn call'
Write-Output ''
Write-Output ('== PER ITEM ==' + $scopeNote)
if ($rows.Count -eq 0) { Write-Output ('  no responses attributed to ' + $ItemFilter + ' in this window') }
else { $rows | Format-Table Item, From, Responses, OutputTok, InputTok, CacheRead, CacheWrite -AutoSize | Out-String -Width 200 | Write-Output }
Write-Output ('== PER ROLE WITHIN EACH ITEM (role from the spawn call, not any ROLE: text)' + $scopeNote + ' ==')
if ($roleRows.Count -eq 0) { Write-Output '  no role-attributed responses in scope' }
else { $roleRows | Format-Table -AutoSize | Out-String -Width 200 | Write-Output }
Write-Output 'InputTok is nearly always tiny next to CacheRead: almost everything an agent reads arrives from cache, so input alone understates what was consumed by orders of magnitude.'
Write-Output ''
Write-Output '== REVIEWER SPEND (codex, joined by the session id in each item''s committed logs) =='
if ($vendor.Count -eq 0) { Write-Output '  none joined - no committed reviewer log matched a stored codex session' }
elseif ($vRows.Count -eq 0) { Write-Output '  none in scope' }
else { $vRows | Format-Table -AutoSize | Out-String -Width 200 | Write-Output }
Write-Output ''
Write-Output '== REVIEWER SPEND (kimi, joined by the launching agent id in its session directory) =='
if ($kimi.Count -eq 0) { Write-Output '  none joined - no kimi session directory named an agent this run resolved to an item' }
elseif ($kRows.Count -eq 0) { Write-Output '  none in scope' }
else { $kRows | Format-Table -AutoSize | Out-String -Width 200 | Write-Output }
Write-Output ''
Write-Output '== ROLLED UP THE CHAIN (each node includes everything beneath it) =='
$rollRows | Format-Table Node, Covers, Responses, OutputTok -AutoSize | Out-String -Width 200 | Write-Output
Write-Output ('TOTAL: ' + $totResp + ' responses, ' + $totOut + ' output tokens. The PER ITEM table reconciles to this total by construction; the rollup deliberately double-counts, because a parent includes its children.')
Write-Output ('COORDINATOR SIGNAL - unattributed share of output tokens: ' + $pct + '%')
if ($skipped -gt 0) { Write-Output ($skipped.ToString() + ' transcript file(s) could not be opened and are NOT counted - said out loud rather than silently dropped') }
Write-Output 'Still a FLOOR, for named reasons: work before an agent switches off main attributes to nothing; a deeply-nested sitting whose .output carries no gitBranch falls to unattributed rather than to its item (the current largest gap - it is why the unattributed share is high); and a role reads "unmarked agent" when the spawn pairing that names it could not be found.'
