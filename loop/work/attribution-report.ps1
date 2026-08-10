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
# THE TREE IS NOW USED AS A FALLBACK, and it is still derived (founder, 2026-08-11). The platform
# writes the whole spawn forest to disk at spawn time - parent edge, spawn call and role - so the
# report reads the edges rather than declaring them. A record that names its own item branch is
# never overridden. Only a record that resolves NOTHING on its own asks the tree, and it inherits
# the item of its nearest ancestor that resolves one.
#
# WHAT THIS UNDERCOUNTS, stated rather than hidden:
#   - work whose whole ancestry sits on `main`, on a generated `worktree-agent-*` branch, or on a
#     branch naming no item: the tree has nothing to inherit, so it stays unattributed,
#   - the reviewers only partly: the codex and kimi joins below are real, but they cover the runs
#     whose logs this repository holds, so an item's true cost is higher than any figure here,
#   - a branch naming two items, which resolves to unresolved rather than guessing,
#   - an agent file naming two items, whose branchless records stay unattributed for the same
#     reason.
# So every number below is a FLOOR, not a total.
# ---------------------------------------------------------------------------------------------

$projDir = $ProjectsDir
if (-not (Test-Path $projDir)) { throw ('transcript directory not found: ' + $projDir) }
$files = @(Get-ChildItem $projDir -Filter '*.jsonl' -File)

# AGENT TRANSCRIPTS ARE `.jsonl` FILES BESIDE THEIR SESSION, and the glob above is not recursive,
# so this report never read one. They live under <projDir>\<sessionId>\subagents\.
#
# THE `subagents` TREE IS NOT FLAT, measured 2026-08-11: 290 of 877 agent transcripts sit directly
# in `subagents`, and the other 587 sit one level deeper in `subagents\workflows\wf_<id>\`, each
# with its meta file beside it. A flat glob would therefore leave two thirds of them invisible, so
# the search recurses. It still names `agent-*.jsonl` only, so a `tasks\*.output` file inside the
# same root is never counted.
#
# Usage is counted from `.jsonl` transcripts ONLY. The Temp `.output` store this report used to
# scan is gone from the scan for two measured reasons: 33 of its 34 transcript-shaped files are
# byte-identical twins of a `subagents` file, so scanning both double-counts every
# background-spawned agent; and the 34th is not an agent at all but a background task whose 50
# assistant-usage lines were counted as unattributed responses. Nothing is lost - zero orphan
# transcripts were found there.
foreach ($d in (Get-ChildItem $projDir -Directory -ErrorAction SilentlyContinue)) {
    $sub = Join-Path $d.FullName 'subagents'
    if (Test-Path $sub) { $files += @(Get-ChildItem $sub -Filter 'agent-*.jsonl' -File -Recurse -ErrorAction SilentlyContinue) }
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
# THE SPAWN FOREST IS ALREADY ON DISK. The platform writes agent-<agentId>.meta.json beside every
# agent transcript - 872 of 872 measured, none missing. Each one carries `agentType` (the spawn
# call's subagent_type), `parentAgentId` (absent at spawn depth 1, where the parent is the session
# whose directory holds the file), `toolUseId` (the spawn call inside the parent) and `spawnDepth`.
#
# So the role comes from the spawn call, and the parent edge comes from the spawn call. An earlier
# version paired a `subagent_type` line with an `agentId:` line by their shared tool_use id and
# read the role from the file name; the meta file states both directly, at any nesting depth.
# A transcript with no meta file reads role `unmarked agent`, builds no edge, and is counted in
# the floor note - never silently.
#
# THE META FILES ARE ALWAYS ALL READ, whatever -Days says: they are tiny, and an edge must exist
# even when the parent's transcript falls outside the window.
$metaOf = @{}
foreach ($d in (Get-ChildItem $projDir -Directory -ErrorAction SilentlyContinue)) {
    $sub = Join-Path $d.FullName 'subagents'
    if (-not (Test-Path $sub)) { continue }
    foreach ($mf in (Get-ChildItem $sub -Filter 'agent-*.meta.json' -File -Recurse -ErrorAction SilentlyContinue)) {
        $id = $mf.Name -replace '^agent-', '' -replace '\.meta\.json$', ''
        try {
            $mj = Get-Content $mf.FullName -Raw | ConvertFrom-Json
            $metaOf[$id] = @{
                agentType     = [string]$mj.agentType
                parentAgentId = [string]$mj.parentAgentId
                toolUseId     = [string]$mj.toolUseId
            }
        } catch { }
    }
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

# One stamp rule, used by both passes below, so they can never disagree.
function Get-StampValue([string]$line, [string]$current) {
    $m = $stampNew.Match($line)
    if ($m.Success -and ($m.Value -notmatch '[{}]')) {
        $d = $m.Groups[2].Value
        if ($d -and $d -ne 'none' -and $d -ne '-') { return $d }
        return ''
    }
    $m = $stampOld.Match($line)
    if ($m.Success -and ($m.Value -notmatch '[{}]')) {
        $b = $m.Groups[3].Value
        if ($b) { return ('legacy:' + $b) }
        return ''
    }
    return $current
}

# ---------------------------------------------------------------------------------------------
# PROPAGATION DOWN THE SPAWN TREE (the ruled design, founder 2026-08-11).
#
# Most agent records name the item branch themselves, and those need nothing. The rest are the
# records an agent wrote before its worktree branch existed, or on `main`, or on a generated
# `worktree-agent-*` branch. Today they all fall to unattributed. They belong to whatever item
# their nearest ancestor was working on, and the spawn forest says who that ancestor is.
#
# This pre-pass collects the two facts the walk needs:
#   - for each agent transcript, the distinct items its OWN records name;
#   - for each session, the item it had resolved at each spawn call, keyed by the tool_use id
#     that the child's meta file names. State at the CALL, not at the end of the file: one
#     session holds different items at different times, and each child inherits what was held
#     when it was spawned.
#
# Both reads use the SAME unescaped-only branch match as the counting pass. An escaped
# \"gitBranch\" inside a quoted tool result is another transcript being read, never a branch fact.
$fileItems = @{}   # bare agent id -> the distinct items its own records name
$spawnCtx  = @{}   # tool_use id -> the item the spawning session had resolved at that call
$tuIdRe = [regex]'"(?:id|tool_use_id)"\s*:\s*"(toolu_[A-Za-z0-9]+)"'
foreach ($f in $files) {
    try {
        $fs = New-Object System.IO.FileStream($f.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, ([System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete))
        $rd = New-Object System.IO.StreamReader($fs)
    } catch { continue }
    try {
        if ($f.Name.StartsWith('agent-')) {
            $aid = [System.IO.Path]::GetFileNameWithoutExtension($f.Name) -replace '^agent-', ''
            $own = @()
            while ($null -ne ($line = $rd.ReadLine())) {
                if ($line.IndexOf('"gitBranch"') -lt 0) { continue }
                $bm = $branchRe.Match($line)
                if (-not $bm.Success) { continue }
                foreach ($id in (Get-BranchItems $bm.Groups[1].Value)) { if ($own -notcontains $id) { $own += $id } }
            }
            $fileItems[$aid] = $own
        }
        else {
            $cb = ''
            $cs = ''
            while ($null -ne ($line = $rd.ReadLine())) {
                if ($line.IndexOf('"gitBranch"') -ge 0) {
                    $bm = $branchRe.Match($line)
                    if ($bm.Success) { $cb = $bm.Groups[1].Value }
                }
                if ($line.IndexOf('ai4good-attribution') -ge 0) { $cs = Get-StampValue $line $cs }
                if ($line.IndexOf('toolu_') -lt 0) { continue }
                foreach ($m in $tuIdRe.Matches($line)) {
                    $tid = $m.Groups[1].Value
                    # FIRST sighting wins: the spawn call comes before its own tool result.
                    if ($spawnCtx.ContainsKey($tid)) { continue }
                    $bids = @(Get-BranchItems $cb)
                    if ($bids.Count -eq 1) { $spawnCtx[$tid] = $bids[0] }
                    elseif ($bids.Count -eq 0 -and $cs) {
                        $sids = @(Get-BranchItems $cs)
                        if ($sids.Count -eq 1) { $spawnCtx[$tid] = $sids[0] }
                    }
                }
            }
        }
    }
    finally { $rd.Dispose() }
}

$ambiguousAgents = 0
foreach ($k in $fileItems.Keys) { if (@($fileItems[$k]).Count -gt 1) { $ambiguousAgents++ } }

# TREE-ITEM(agent), in the ruled order:
#   (a) the single distinct item the agent's own records name;
#   (b) ONLY when (a) finds ZERO items, the parent agent's tree item, walking parentAgentId
#       upward. A file naming TWO items is ambiguous and inherits NOTHING - degrade, never guess;
#   (c) at a session root, the item the session had resolved at this agent's own spawn call.
#
# THERE IS NO DEPTH CAP. The VISITED SET is the only guard and must stay: a cap would truncate a
# valid deep chain, while a parentAgentId cycle would recurse for ever without the set.
$treeItem = @{}
function Get-TreeItem([string]$agentId, [hashtable]$visited) {
    if ($treeItem.ContainsKey($agentId)) { return $treeItem[$agentId] }
    if ($visited.ContainsKey($agentId)) { return '' }
    $visited[$agentId] = $true
    $result = ''
    $own = @()
    if ($fileItems.ContainsKey($agentId)) { $own = @($fileItems[$agentId]) }
    if ($own.Count -eq 1) { $result = $own[0] }
    elseif ($own.Count -eq 0 -and $metaOf.ContainsKey($agentId)) {
        $meta = $metaOf[$agentId]
        if ($meta.parentAgentId) { $result = [string](Get-TreeItem $meta.parentAgentId $visited) }
        elseif ($meta.toolUseId -and $spawnCtx.ContainsKey($meta.toolUseId)) { $result = $spawnCtx[$meta.toolUseId] }
    }
    $treeItem[$agentId] = $result
    return $result
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
$unmarkedAgents = 0
foreach ($f in $files) {
    $curBranch = ''          # derived, primary
    $curStamp = ''           # declared, fallback only
    # Which kind of transcript this is comes from the platform's own naming, declared by nobody:
    # an agent transcript is `agent-<agentId>.jsonl` at any depth, and a session file is named by
    # its session id. A session was spawned by nobody and is the coordinator.
    $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $isAgent = $f.Name.StartsWith('agent-')
    $joinKey = $base
    $curRole = 'coordinator'
    $curTree = ''
    if ($isAgent) {
        $joinKey = $base -replace '^agent-', ''
        if ($metaOf.ContainsKey($joinKey) -and $metaOf[$joinKey].agentType) { $curRole = $metaOf[$joinKey].agentType }
        else { $curRole = 'unmarked agent'; $unmarkedAgents++ }
        $curTree = [string](Get-TreeItem $joinKey (New-Object 'System.Collections.Hashtable'))
    }
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
            if ($line.IndexOf('ai4good-attribution') -ge 0) { $curStamp = Get-StampValue $line $curStamp }
            if ($line.IndexOf('"usage"') -ge 0 -and $line.IndexOf('"output_tokens"') -ge 0) {
                try {
                    $o = $line | ConvertFrom-Json
                    $u = $null
                    if ($o.message -and $o.message.usage) { $u = $o.message.usage }
                    elseif ($o.usage) { $u = $o.usage }
                    if ($u -and $o.type -eq 'assistant') {
                        # Own record branch first, exactly as before. The tree is a FALLBACK for a
                        # record that resolves nothing on its own - it never overrides a branch.
                        $ids = @(Get-BranchItems $curBranch)
                        if ($ids.Count -eq 1)      { Add-Usage ($ids[0] + '|branch')  $u $agg }
                        elseif ($ids.Count -gt 1)  { Add-Usage ('unresolved|branch')  $u $agg }
                        elseif ($curTree)          { Add-Usage ($curTree + '|tree')   $u $agg }
                        elseif ($curStamp)         { Add-Usage ($curStamp + '|stamp') $u $agg }
                        else                       { Add-Usage ('unattributed|none')  $u $agg }
                        # A tree-resolved response feeds the role table and the vendor join key
                        # exactly as a branch-resolved one does.
                        if ($ids.Count -eq 1) {
                            Add-Usage ($ids[0] + '|' + $curRole) $u $roleAgg
                            $agentItem[$joinKey] = $ids[0]
                        }
                        elseif ($ids.Count -eq 0 -and $curTree) {
                            Add-Usage ($curTree + '|' + $curRole) $u $roleAgg
                            $agentItem[$joinKey] = $curTree
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

Write-Output ('ai4good buildout burn report - ' + (Get-Date -Format 'yyyy-MM-dd') + ' - ' + $sessions + ' transcript file(s), sessions and agents' + $(if ($Days -gt 0) { ' (last ' + $Days + ' days)' } else { '' }) + $scopeNote)
Write-Output 'units: provider-echoed tokens per response (REQ-034 model); money lives elsewhere'
Write-Output 'attribution DERIVED from each record''s own git branch, and from the spawn tree where the record names none; role DERIVED from the spawn call'
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
Write-Output ''
Write-Output 'Still a FLOOR, for named reasons. A nested sitting no longer falls to unattributed: that gap is closed, because the agent transcripts are now scanned and an agent that resolves no item of its own inherits its nearest ancestor''s item. What remains:'
Write-Output '  - Coordinator work on main that holds no item resolves to nothing, and neither do the agents beneath it: the tree has no item to hand down.'
Write-Output ('  - ' + $ambiguousAgents + ' agent transcript(s) name TWO OR MORE items in their own records. Their branchless responses stay unattributed rather than being guessed.')
Write-Output ('  - ' + $unmarkedAgents + ' agent transcript(s) have no meta file beside them, so their role reads "unmarked agent" and they build no edge.')
Write-Output '  - Reviewer spend is only partly joined. The codex and kimi tables above cover the runs whose logs this repository holds. The flash and opencode reviewer spend is not joined at all; that work is filed separately and is not built here.'
Write-Output '  - A -Days window that excludes an ancestor transcript loses the item that ancestor would have handed down. The default, all history, has no such gap.'
