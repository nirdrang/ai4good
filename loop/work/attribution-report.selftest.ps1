# attribution-report.selftest.ps1 - the executable criteria of AI4DEV-80 (attribution by spawn tree).
#
# It builds a SYNTHETIC transcript store in a temp directory, points attribution-report.ps1 at it
# with the root override parameters, and asserts on the -Json aggregates. The oracle is numbers,
# never Format-Table whitespace.
#
# Every expected number is COMPUTED from the bytes the fixture wrote, with the same counting
# predicate the report uses. Nothing is hard-coded, so a fixture edit cannot silently make an
# assert vacuous.
#
#   powershell -File loop/work/attribution-report.selftest.ps1
#   exit 0 = every assert green; exit 1 = at least one assert red.
$ErrorActionPreference = 'Stop'

$report = Join-Path $PSScriptRoot 'attribution-report.ps1'
if (-not (Test-Path $report)) { throw ('report script not found: ' + $report) }

# ---------------------------------------------------------------------------------------------
# assert bookkeeping
# ---------------------------------------------------------------------------------------------
$script:failures = 0
function Assert-That([string]$id, [string]$what, [bool]$ok, [string]$detail) {
    if ($ok) { Write-Output ('PASS ' + $id + ' - ' + $what) }
    else {
        Write-Output ('FAIL ' + $id + ' - ' + $what + ' :: ' + $detail)
        $script:failures = $script:failures + 1
    }
}

# ---------------------------------------------------------------------------------------------
# fixture writers
# ---------------------------------------------------------------------------------------------
function Write-Lines([string]$path, [string[]]$lines) {
    $dir = Split-Path -Parent $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllLines($path, $lines)
}

# One assistant response with provider-echoed usage, carrying its own record branch.
function New-UsageLine([string]$branch, [int]$outTok) {
    return '{"type":"assistant","gitBranch":"' + $branch + '","message":{"usage":{"input_tokens":5,"output_tokens":' + $outTok + ',"cache_read_input_tokens":1000,"cache_creation_input_tokens":10}}}'
}

# The stamp as it really lands in a JSONL record: the quotes arrive escaped.
function New-StampLine([string]$item) {
    return '{"type":"user","gitBranch":"main","message":{"content":"WORKING ON <ai4good-attribution pm=\"none\" dev=\"' + $item + '\"/> fixture stamp"}}'
}

# A spawn call in the parent session. It carries the tool_use id the child meta names.
function New-SpawnLine([string]$toolUseId, [string]$agentType) {
    return '{"type":"assistant","gitBranch":"main","message":{"content":[{"type":"tool_use","id":"' + $toolUseId + '","name":"Task","input":{"subagent_type":"' + $agentType + '"}}]}}'
}

# A tool result that QUOTES another transcript. Its gitBranch is escaped, so it is not a branch
# fact - the decoy of G1-10.
function New-DecoyLine([string]$decoyBranch) {
    return '{"type":"user","gitBranch":"","message":{"content":"tool result: {\"type\":\"assistant\",\"gitBranch\":\"' + $decoyBranch + '\"}"}}'
}

function New-MetaJson([hashtable]$fields) {
    $parts = @()
    foreach ($k in $fields.Keys) {
        $v = $fields[$k]
        if ($v -is [int]) { $parts += ('"' + $k + '":' + $v) }
        else { $parts += ('"' + $k + '":"' + $v + '"') }
    }
    return '{' + ($parts -join ',') + '}'
}

# The same counting predicate the report uses, applied to the fixture's own lines.
function Measure-Lines([string[]]$lines) {
    $n = 0
    $o = [long]0
    foreach ($l in $lines) {
        if ($l.IndexOf('"usage"') -lt 0) { continue }
        if ($l.IndexOf('"output_tokens"') -lt 0) { continue }
        $j = $null
        try { $j = $l | ConvertFrom-Json } catch { continue }
        if ($j.type -ne 'assistant') { continue }
        $u = $null
        if ($j.message -and $j.message.usage) { $u = $j.message.usage }
        elseif ($j.usage) { $u = $j.usage }
        if (-not $u) { continue }
        $n = $n + 1
        $o = $o + [long]$u.output_tokens
    }
    return [pscustomobject]@{ Responses = $n; OutputTok = $o }
}
function Measure-File([string]$path) { return (Measure-Lines ([System.IO.File]::ReadAllLines($path))) }

# ---------------------------------------------------------------------------------------------
# aggregate lookups over the -Json oracle
# ---------------------------------------------------------------------------------------------
function Get-Row($j, [string]$item, [string]$from) {
    $r = @($j.rows | Where-Object { $_.Item -eq $item -and $_.From -eq $from })
    if ($r.Count -eq 0) { return [pscustomobject]@{ Item=$item; From=$from; Responses=0; OutputTok=[long]0; Missing=$true } }
    return $r[0]
}
function Get-RoleRow($j, [string]$item, [string]$role) {
    $r = @($j.roleRows | Where-Object { $_.Item -eq $item -and $_.Role -eq $role })
    if ($r.Count -eq 0) { return [pscustomobject]@{ Item=$item; Role=$role; Responses=0; OutputTok=[long]0; Missing=$true } }
    return $r[0]
}
function Get-RollRow($j, [string]$node) {
    $r = @($j.rollRows | Where-Object { $_.Node -eq $node })
    if ($r.Count -eq 0) { return [pscustomobject]@{ Node=$node; Responses=0; OutputTok=[long]0; Missing=$true } }
    return $r[0]
}
function Sum-Of($rows, [string]$prop) {
    $s = [long]0
    foreach ($r in @($rows)) { $s = $s + [long]$r.$prop }
    return $s
}

# ---------------------------------------------------------------------------------------------
# the fixture store
# ---------------------------------------------------------------------------------------------
$root       = Join-Path ([System.IO.Path]::GetTempPath()) ('attr-selftest-' + [guid]::NewGuid().ToString('N'))
$projects   = Join-Path $root 'projects'
$sessionId  = '11111111-2222-3333-4444-555555555555'
$sessionFile= Join-Path $projects ($sessionId + '.jsonl')
$sessionDir = Join-Path $projects $sessionId
$subagents  = Join-Path $sessionDir 'subagents'
$tasksDir   = Join-Path $sessionDir 'tasks'
$attrDir    = Join-Path $root 'attr'
$itemsDir   = Join-Path $root 'items'
$codexDir   = Join-Path $root 'codex'
$kimiDir    = Join-Path $root 'kimi'

$ITEM_A = 'AI4DEV-901'   # the item the coordinator holds first; chained under AI4DEV-900
$ITEM_B = 'AI4DEV-902'   # the item it holds later; deliberately chainless
$ROOT_A = 'AI4DEV-900'
$DECOY  = 'AI4DEV-999'

try {
    New-Item -ItemType Directory -Path $projects  -Force | Out-Null
    New-Item -ItemType Directory -Path $subagents -Force | Out-Null
    New-Item -ItemType Directory -Path $tasksDir  -Force | Out-Null
    New-Item -ItemType Directory -Path $attrDir   -Force | Out-Null
    New-Item -ItemType Directory -Path $itemsDir  -Force | Out-Null
    New-Item -ItemType Directory -Path $codexDir  -Force | Out-Null
    New-Item -ItemType Directory -Path $kimiDir   -Force | Out-Null

    # --- the coordinator session: it holds ITEM_A, spawns C1 and U1, THEN moves to ITEM_B and
    # spawns U2. A latest-wins or file-wide implementation cannot satisfy both U1 and U2.
    $sessionA = @(
        (New-StampLine $ITEM_A),
        (New-UsageLine 'main' 11),
        (New-UsageLine 'main' 11)
    )
    $sessionSpawns = @(
        (New-SpawnLine 'toolu_01FixtureCONDUCTOR' 'conductor'),
        (New-SpawnLine 'toolu_01FixtureUTILONE'   'general-purpose')
    )
    $sessionB = @(
        (New-StampLine $ITEM_B),
        (New-UsageLine 'main' 13)
    )
    $sessionSpawnB = @( (New-SpawnLine 'toolu_01FixtureUTILTWO' 'general-purpose') )
    Write-Lines $sessionFile ($sessionA + $sessionSpawns + $sessionB + $sessionSpawnB)

    # --- C1, the conductor: its OWN records name the item branch (the common case).
    $c1Lines = @(
        (New-UsageLine 'nirdrang/ai4dev-901-fixture' 21),
        (New-UsageLine 'nirdrang/ai4dev-901-fixture' 21),
        (New-UsageLine 'nirdrang/ai4dev-901-fixture' 21)
    )
    Write-Lines (Join-Path $subagents 'agent-C1.jsonl') $c1Lines
    Write-Lines (Join-Path $subagents 'agent-C1.meta.json') @((New-MetaJson @{ agentType='conductor'; description='fixture conductor'; toolUseId='toolu_01FixtureCONDUCTOR'; spawnDepth=1; model='sonnet' }))

    # --- O1 and O2, orchestrator sittings under C1: branchless records, so they resolve only
    # through the spawn tree. O1 also carries the escaped decoy.
    $o1Lines = @(
        (New-DecoyLine 'nirdrang/ai4dev-999-decoy'),
        (New-UsageLine '' 31),
        (New-UsageLine '' 31)
    )
    Write-Lines (Join-Path $subagents 'agent-O1.jsonl') $o1Lines
    Write-Lines (Join-Path $subagents 'agent-O1.meta.json') @((New-MetaJson @{ agentType='orchestrator'; description='fixture sitting one'; toolUseId='toolu_01FixtureORCHONE'; parentAgentId='C1'; spawnDepth=2; model='opus' }))

    $o2Lines = @(
        (New-UsageLine '' 41),
        (New-UsageLine '' 41)
    )
    Write-Lines (Join-Path $subagents 'agent-O2.jsonl') $o2Lines
    Write-Lines (Join-Path $subagents 'agent-O2.meta.json') @((New-MetaJson @{ agentType='orchestrator'; description='fixture sitting two'; toolUseId='toolu_01FixtureORCHTWO'; parentAgentId='C1'; spawnDepth=2; model='opus' }))

    # --- E1, the executor under O1: a TWO-level walk, E1 -> O1 -> C1. Its file is backdated for
    # the -Days assert.
    $e1Lines = @(
        (New-UsageLine '' 51),
        (New-UsageLine '' 51)
    )
    $e1Path = Join-Path $subagents 'agent-E1.jsonl'
    Write-Lines $e1Path $e1Lines
    Write-Lines (Join-Path $subagents 'agent-E1.meta.json') @((New-MetaJson @{ agentType='executor'; description='fixture executor'; toolUseId='toolu_01FixtureEXEC'; parentAgentId='O1'; spawnDepth=3; model='opus' }))
    (Get-Item $e1Path).LastWriteTime = (Get-Date).AddDays(-40)

    # --- U1 and U2, utility agents spawned by the SESSION itself. They have no parent agent, so
    # they resolve through the session's spawn context at their own tool_use id.
    $u1Lines = @( (New-UsageLine '' 61) )
    Write-Lines (Join-Path $subagents 'agent-U1.jsonl') $u1Lines
    Write-Lines (Join-Path $subagents 'agent-U1.meta.json') @((New-MetaJson @{ agentType='general-purpose'; description='fixture utility one'; toolUseId='toolu_01FixtureUTILONE'; spawnDepth=1; model='sonnet' }))

    $u2Lines = @( (New-UsageLine '' 71) )
    Write-Lines (Join-Path $subagents 'agent-U2.jsonl') $u2Lines
    Write-Lines (Join-Path $subagents 'agent-U2.meta.json') @((New-MetaJson @{ agentType='general-purpose'; description='fixture utility two'; toolUseId='toolu_01FixtureUTILTWO'; spawnDepth=1; model='sonnet' }))

    # --- M1, the ambiguity case: its own records name TWO items, so its branchless lines must
    # stay unattributed rather than inherit C1's item.
    $m1BranchA   = @( (New-UsageLine 'nirdrang/ai4dev-901-mixed' 81) )
    $m1BranchB   = @( (New-UsageLine 'nirdrang/ai4dev-902-mixed' 83) )
    $m1Branchless= @( (New-UsageLine '' 85), (New-UsageLine '' 85) )
    Write-Lines (Join-Path $subagents 'agent-M1.jsonl') ($m1BranchA + $m1BranchB + $m1Branchless)
    Write-Lines (Join-Path $subagents 'agent-M1.meta.json') @((New-MetaJson @{ agentType='mechanical'; description='fixture mechanical'; toolUseId='toolu_01FixtureMECH'; parentAgentId='C1'; spawnDepth=2; model='haiku' }))

    # --- X1, the metaless agent: no role, no edge, unattributed BY DESIGN.
    $x1Lines = @(
        (New-UsageLine '' 91),
        (New-UsageLine '' 91)
    )
    Write-Lines (Join-Path $subagents 'agent-X1.jsonl') $x1Lines

    # --- a background task INSIDE the scanned projects root. Transcript-shaped, and it must
    # never reach a row.
    $bgLines = @(
        (New-UsageLine '' 999),
        (New-UsageLine '' 999),
        (New-UsageLine '' 999)
    )
    Write-Lines (Join-Path $tasksDir 'bg.output') $bgLines

    # --- the chain cache /work writes: ITEM_A hangs under ROOT_A; ITEM_B stays chainless.
    Write-Lines (Join-Path $attrDir ('chain-' + $ITEM_A + '.json')) @('{"item":"' + $ITEM_A + '","chain":[{"id":"' + $ROOT_A + '"},{"id":"' + $ITEM_A + '"}]}')

    # --- the kimi store, keyed by the BARE agent id O1 (the report must strip the agent- prefix
    # from the transcript file name before joining). Shape copied from the real store: the
    # usage.record lines carry usage at the top level.
    $kimiWire = @(
        '{"type":"usage.record","model":"kimi-code/k3","usage":{"inputOther":100,"output":50,"inputCacheRead":900,"inputCacheCreation":0},"usageScope":"turn","time":1786180253600}',
        '{"type":"usage.record","model":"kimi-code/k3","usage":{"inputOther":200,"output":70,"inputCacheRead":800,"inputCacheCreation":0},"usageScope":"turn","time":1786180259600}'
    )
    $kimiExpectedOut = [long]120
    Write-Lines (Join-Path $kimiDir 'wd_agent-O1_ab12cd34\session_99999999-8888-7777-6666-555555555555\agents\main\wire.jsonl') $kimiWire

    # -----------------------------------------------------------------------------------------
    # what the fixture wrote - every expectation below is derived from these measurements
    # -----------------------------------------------------------------------------------------
    $mSession   = Measure-File $sessionFile
    $mC1        = Measure-File (Join-Path $subagents 'agent-C1.jsonl')
    $mO1        = Measure-File (Join-Path $subagents 'agent-O1.jsonl')
    $mO2        = Measure-File (Join-Path $subagents 'agent-O2.jsonl')
    $mE1        = Measure-File $e1Path
    $mU1        = Measure-File (Join-Path $subagents 'agent-U1.jsonl')
    $mU2        = Measure-File (Join-Path $subagents 'agent-U2.jsonl')
    $mX1        = Measure-File (Join-Path $subagents 'agent-X1.jsonl')
    $mBg        = Measure-File (Join-Path $tasksDir 'bg.output')
    $mSessA     = Measure-Lines $sessionA
    $mSessB     = Measure-Lines $sessionB
    $mM1A       = Measure-Lines $m1BranchA
    $mM1B       = Measure-Lines $m1BranchB
    $mM1None    = Measure-Lines $m1Branchless

    $allJsonl = @(Get-ChildItem $projects -Recurse -File -Filter '*.jsonl')
    $expTotalResp = 0
    $expTotalOut  = [long]0
    foreach ($f in $allJsonl) {
        $m = Measure-File $f.FullName
        $expTotalResp = $expTotalResp + $m.Responses
        $expTotalOut  = $expTotalOut + $m.OutputTok
    }

    # -----------------------------------------------------------------------------------------
    # run the report against the fixture
    # -----------------------------------------------------------------------------------------
    function Invoke-Report([string[]]$extra) {
        $psArgs = @('-NoProfile', '-File', $report,
                    '-ProjectsDir', $projects, '-AttrDir', $attrDir, '-ItemsDir', $itemsDir,
                    '-CodexSessions', $codexDir, '-KimiRoot', $kimiDir) + $extra
        return (& powershell @psArgs | Out-String)
    }

    $jsonText  = Invoke-Report @('-Json')
    $j         = $jsonText | ConvertFrom-Json
    $textOut   = Invoke-Report @()
    $jsonItemB = (Invoke-Report @('-Json', '-Item', $ITEM_B)) | ConvertFrom-Json
    $jsonDays7 = (Invoke-Report @('-Json', '-Days', '7')) | ConvertFrom-Json

    # -----------------------------------------------------------------------------------------
    # A1 - the tree mechanism puts every sitting's tokens under the item
    # -----------------------------------------------------------------------------------------
    $rABranch = Get-Row $j $ITEM_A 'branch'
    $rATree   = Get-Row $j $ITEM_A 'tree'
    $rAStamp  = Get-Row $j $ITEM_A 'stamp'
    $rBStamp  = Get-Row $j $ITEM_B 'stamp'
    $expABranch = $mC1.Responses + $mM1A.Responses
    $expATree   = $mO1.Responses + $mO2.Responses + $mE1.Responses + $mU1.Responses
    Assert-That 'A1' 'tree agents land under the item (C1 by branch, O1/O2/E1 by tree, U1 by spawn context, stamp lines split)' `
        (($rABranch.Responses -eq $expABranch) -and ($rATree.Responses -eq $expATree) -and ($rAStamp.Responses -eq $mSessA.Responses) -and ($rBStamp.Responses -eq $mSessB.Responses)) `
        ('branch=' + $rABranch.Responses + '/' + $expABranch + ' tree=' + $rATree.Responses + '/' + $expATree + ' stampA=' + $rAStamp.Responses + '/' + $mSessA.Responses + ' stampB=' + $rBStamp.Responses + '/' + $mSessB.Responses)

    # -----------------------------------------------------------------------------------------
    # A2 - the executor's tokens are under the item, and the unattributed row holds none of them
    # -----------------------------------------------------------------------------------------
    $roleExec = Get-RoleRow $j $ITEM_A 'executor'
    $rUnatt   = Get-Row $j 'unattributed' 'none'
    $expUnattResp = $mM1None.Responses + $mX1.Responses
    Assert-That 'A2' 'the executor is attributed to the item and appears in no unattributed row' `
        (($roleExec.Responses -eq $mE1.Responses) -and ([long]$roleExec.OutputTok -eq $mE1.OutputTok) -and ($rUnatt.Responses -eq $expUnattResp)) `
        ('exec=' + $roleExec.Responses + '/' + $mE1.Responses + ' execOut=' + $roleExec.OutputTok + '/' + $mE1.OutputTok + ' unatt=' + $rUnatt.Responses + '/' + $expUnattResp)

    # -----------------------------------------------------------------------------------------
    # A3 - the background file is excluded although it sits inside the scanned root, and the
    # response total is exactly the assistant-usage sum over the fixture's .jsonl files
    # -----------------------------------------------------------------------------------------
    Assert-That 'A3' 'the total counts every fixture transcript and excludes the background .output file' `
        ((([int]$j.totals.responses) -eq $expTotalResp) -and (([long]$j.totals.outputTok) -eq $expTotalOut) -and ($mBg.Responses -gt 0)) `
        ('responses=' + $j.totals.responses + '/' + $expTotalResp + ' outTok=' + $j.totals.outputTok + '/' + $expTotalOut + ' bgLinesPlanted=' + $mBg.Responses)

    # -----------------------------------------------------------------------------------------
    # A4 - the per-item rows reconcile to the totals
    # -----------------------------------------------------------------------------------------
    $sumResp = Sum-Of $j.rows 'Responses'
    $sumOut  = Sum-Of $j.rows 'OutputTok'
    Assert-That 'A4' 'the per-item rows reconcile to the TOTAL line' `
        (($sumResp -eq [long]$j.totals.responses) -and ($sumOut -eq [long]$j.totals.outputTok)) `
        ('rowSum=' + $sumResp + '/' + $j.totals.responses + ' outSum=' + $sumOut + '/' + $j.totals.outputTok)

    # -----------------------------------------------------------------------------------------
    # A5 - the role column comes from the meta agentType, for tree-resolved agents too
    # -----------------------------------------------------------------------------------------
    $roleOrch = Get-RoleRow $j $ITEM_A 'orchestrator'
    $roleCond = Get-RoleRow $j $ITEM_A 'conductor'
    $expOrchResp = $mO1.Responses + $mO2.Responses
    $expOrchOut  = $mO1.OutputTok + $mO2.OutputTok
    Assert-That 'A5' 'roles come from the spawn meta: O1+O2 orchestrator, E1 executor, C1 conductor' `
        (($roleOrch.Responses -eq $expOrchResp) -and ([long]$roleOrch.OutputTok -eq $expOrchOut) -and ($roleExec.Responses -eq $mE1.Responses) -and ($roleCond.Responses -eq $mC1.Responses)) `
        ('orch=' + $roleOrch.Responses + '/' + $expOrchResp + ' orchOut=' + $roleOrch.OutputTok + '/' + $expOrchOut + ' exec=' + $roleExec.Responses + '/' + $mE1.Responses + ' cond=' + $roleCond.Responses + '/' + $mC1.Responses)

    # -----------------------------------------------------------------------------------------
    # A6 - tree-resolved responses say so in the From column
    # -----------------------------------------------------------------------------------------
    $rBTree = Get-Row $j $ITEM_B 'tree'
    Assert-That 'A6' 'tree-resolved rows carry From = tree' `
        ((-not $rATree.Missing) -and ($rATree.Responses -gt 0) -and (-not $rBTree.Missing) -and ($rBTree.Responses -gt 0)) `
        ('treeA=' + $rATree.Responses + ' treeB=' + $rBTree.Responses)

    # -----------------------------------------------------------------------------------------
    # A7 - each session-rooted agent inherits the item the session held AT ITS OWN spawn call.
    # Latest-wins gives U1 the wrong item; a file-wide single item resolves neither.
    # -----------------------------------------------------------------------------------------
    $roleUtilA = Get-RoleRow $j $ITEM_A 'general-purpose'
    $roleUtilB = Get-RoleRow $j $ITEM_B 'general-purpose'
    Assert-That 'A7' 'U1 inherits the first item and U2 the second, each at its own spawn tool_use id' `
        (($roleUtilA.Responses -eq $mU1.Responses) -and ($roleUtilB.Responses -eq $mU2.Responses) -and ([long]$roleUtilA.OutputTok -eq $mU1.OutputTok) -and ([long]$roleUtilB.OutputTok -eq $mU2.OutputTok)) `
        ('U1->' + $ITEM_A + '=' + $roleUtilA.Responses + '/' + $mU1.Responses + ' U2->' + $ITEM_B + '=' + $roleUtilB.Responses + '/' + $mU2.Responses)

    # -----------------------------------------------------------------------------------------
    # A8 - the chain rollup still credits the root with everything beneath it
    # -----------------------------------------------------------------------------------------
    $rollRoot = Get-RollRow $j $ROOT_A
    $expRootResp = $rABranch.Responses + $rATree.Responses + $rAStamp.Responses
    $expRootOut  = [long]$rABranch.OutputTok + [long]$rATree.OutputTok + [long]$rAStamp.OutputTok
    Assert-That 'A8' 'the rollup credits the chain root with its child item totals' `
        (($rollRoot.Responses -eq $expRootResp) -and ([long]$rollRoot.OutputTok -eq $expRootOut)) `
        ('root=' + $rollRoot.Responses + '/' + $expRootResp + ' rootOut=' + $rollRoot.OutputTok + '/' + $expRootOut)

    # -----------------------------------------------------------------------------------------
    # A9 - an agent file naming TWO items keeps its branchless lines unattributed. It never
    # inherits its parent's item.
    # -----------------------------------------------------------------------------------------
    $rBBranch = Get-Row $j $ITEM_B 'branch'
    Assert-That 'A9' 'a two-item agent file stays ambiguous: its branchless lines are unattributed, its branch lines keep their own items' `
        (($rUnatt.Responses -eq $expUnattResp) -and ($rABranch.Responses -eq $expABranch) -and ($rBBranch.Responses -eq $mM1B.Responses)) `
        ('unatt=' + $rUnatt.Responses + '/' + $expUnattResp + ' branchA=' + $rABranch.Responses + '/' + $expABranch + ' branchB=' + $rBBranch.Responses + '/' + $mM1B.Responses)

    # -----------------------------------------------------------------------------------------
    # A10 - the kimi join works on the BARE agent id and on a TREE-resolved agent
    # -----------------------------------------------------------------------------------------
    $kRows = @($j.kimiRows)
    $kRow  = @($kRows | Where-Object { $_.Item -eq $ITEM_A })
    $kOk = ($kRow.Count -eq 1)
    if ($kOk) { $kOk = (([long]$kRow[0].OutputTok -eq $kimiExpectedOut) -and ([int]$kRow[0].Sessions -eq 1)) }
    Assert-That 'A10' 'the kimi row joins to the item through the tree-resolved agent, on the bare agent id' `
        (($kOk) -and ($roleOrch.Responses -eq $expOrchResp)) `
        ('kimiRows=' + @($kRows).Count + ' matched=' + $kRow.Count + ' out=' + $(if ($kRow.Count -eq 1) { $kRow[0].OutputTok } else { 'n/a' }) + '/' + $kimiExpectedOut)

    # -----------------------------------------------------------------------------------------
    # A11 - the unattributed row is exactly what the fixture planted, and the printed share is
    # the value recomputed from the totals
    # -----------------------------------------------------------------------------------------
    $expUnattOut = $mM1None.OutputTok + $mX1.OutputTok
    $recomputed = 0
    if ([long]$j.totals.outputTok -gt 0) { $recomputed = [math]::Round(100.0 * [long]$j.totals.unattributedOutputTok / [long]$j.totals.outputTok, 1) }
    $printed = -1
    $pm = [regex]::Match($textOut, 'unattributed share of output tokens:\s*([0-9]+(?:\.[0-9]+)?)%')
    if ($pm.Success) { $printed = [double]$pm.Groups[1].Value }
    Assert-That 'A11' 'the unattributed row equals the planted lines, and the printed share equals the recomputed share' `
        (($rUnatt.Responses -eq $expUnattResp) -and ([long]$rUnatt.OutputTok -eq $expUnattOut) -and ([long]$j.totals.unattributedOutputTok -eq $expUnattOut) -and ([double]$j.totals.unattributedPct -eq $recomputed) -and ($printed -eq $recomputed)) `
        ('unattOut=' + $rUnatt.OutputTok + '/' + $expUnattOut + ' pct=' + $j.totals.unattributedPct + ' recomputed=' + $recomputed + ' printed=' + $printed)

    # -----------------------------------------------------------------------------------------
    # A12 - -Item scopes every row to that item, and its responses are the fixture's known sum
    # -----------------------------------------------------------------------------------------
    $bRows = @($jsonItemB.rows)
    $bOnly = $true
    foreach ($r in $bRows) { if ($r.Item -ne $ITEM_B) { $bOnly = $false } }
    $expBResp = $mU2.Responses + $mSessB.Responses + $mM1B.Responses
    $bResp = Sum-Of $bRows 'Responses'
    Assert-That 'A12' '-Item returns rows for that item only, summing to the fixture value' `
        (($bOnly) -and ($bRows.Count -gt 0) -and ($bResp -eq $expBResp)) `
        ('rows=' + $bRows.Count + ' onlyItemB=' + $bOnly + ' resp=' + $bResp + '/' + $expBResp)

    # -----------------------------------------------------------------------------------------
    # A13 - -Days drops exactly the backdated transcript, and the default run keeps it
    # -----------------------------------------------------------------------------------------
    $expDaysResp = $expTotalResp - $mE1.Responses
    Assert-That 'A13' '-Days 7 excludes exactly the backdated executor transcript that the default run includes' `
        ((([int]$jsonDays7.totals.responses) -eq $expDaysResp) -and (([int]$j.totals.responses) -eq $expTotalResp) -and ($mE1.Responses -gt 0)) `
        ('days7=' + $jsonDays7.totals.responses + '/' + $expDaysResp + ' default=' + $j.totals.responses + '/' + $expTotalResp)

    # -----------------------------------------------------------------------------------------
    # A14 - the escaped gitBranch inside a tool result is never read as a branch fact
    # -----------------------------------------------------------------------------------------
    $decoySeen = $false
    foreach ($r in @($j.rows))      { if ([string]$r.Item -eq $DECOY) { $decoySeen = $true } }
    foreach ($r in @($j.roleRows))  { if ([string]$r.Item -eq $DECOY) { $decoySeen = $true } }
    foreach ($r in @($j.rollRows))  { if ([string]$r.Node -eq $DECOY) { $decoySeen = $true } }
    foreach ($r in @($j.codexRows)) { if ([string]$r.Item -eq $DECOY) { $decoySeen = $true } }
    foreach ($r in @($j.kimiRows))  { if ([string]$r.Item -eq $DECOY) { $decoySeen = $true } }
    if ($textOut.IndexOf($DECOY) -ge 0) { $decoySeen = $true }
    Assert-That 'A14' 'no table names the decoy item planted as an escaped gitBranch in a tool result' `
        (-not $decoySeen) `
        ('decoy ' + $DECOY + ' found in the output')
}
finally {
    if (Test-Path $root) {
        try { Remove-Item $root -Recurse -Force -ErrorAction Stop } catch { Write-Output ('NOTE fixture not removed: ' + $root) }
    }
}

if ($script:failures -gt 0) {
    Write-Output ($script:failures.ToString() + ' assert(s) FAILED')
    exit 1
}
Write-Output 'all asserts PASSED'
exit 0
