# work-lib.ps1 - shared functions for the ai4good work skill (ASCII-only; PowerShell 5.1).
# Binding cache + machine mutex + manifest identity, per the adopted way-of-work (d83, d87).
# Local files are CACHES; the durable record is always the Linear pull/completion comment.

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    # Hooks run with an unpredictable working directory, so never rely on cwd alone:
    # prefer CLAUDE_PROJECT_DIR (the session's project/worktree dir) when it is set.
    $base = if ($env:CLAUDE_PROJECT_DIR -and (Test-Path $env:CLAUDE_PROJECT_DIR)) { $env:CLAUDE_PROJECT_DIR } else { '.' }
    $r = (& git -C $base rev-parse --show-toplevel 2>$null)
    if (-not $r) { throw 'not inside a git worktree' }
    return $r.Trim()
}

function Get-WorktreeIdFromRoot([string]$root) {
    # hash the git-normalized toplevel string; sharing this ensures the id a session computes
    # from INSIDE a worktree matches the id computed FOR that worktree from elsewhere.
    $r = $root.Trim().ToLower()
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $b = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($r))
    return ([System.BitConverter]::ToString($b) -replace '-','').Substring(0,12).ToLower()
}

function Get-WorktreeId { Get-WorktreeIdFromRoot (Get-RepoRoot) }

# Same id, computed FOR another worktree by path (uses git's own normalization via -C, so it
# matches what Get-WorktreeId returns when run inside that worktree).
function Get-WorktreeIdForPath([string]$path) {
    $root = (& git -C $path rev-parse --show-toplevel 2>$null)
    if (-not $root) { throw ('not a git worktree: ' + $path) }
    Get-WorktreeIdFromRoot $root
}

function Get-StateDir {
    $d = Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good'
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force $d | Out-Null }
    foreach ($sub in 'attr', 'locks') {
        $p = Join-Path $d $sub
        if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force $p | Out-Null }
    }
    return $d
}

# --- Attribution state (AI4DEV-36: derived, not declared) ---
#
# The binding this replaces was the project's single largest source of bugs: it DECLARED which
# item a folder was working on, and could disagree with reality forever without anything
# noticing (AI4DEV-24 stamped a whole run against the wrong item). Attribution is now DERIVED
# from the branch. Only two local files remain, and neither can substitute itself for reality:
#
#   held.json          - what /work believes this session holds. A CROSS-CHECK ONLY: the stamp
#                        may raise CONFLICT with it or fill a gap the branch left empty, but it
#                        can never override the branch. Stale => louder, never wronger.
#   chain-cache/*.json - the resolved parent chain + short labels for one branch, so the stamp
#                        never calls Linear. Pure speed; deleting it costs nothing.
#
# Both are keyed through Get-WorktreeId/Get-StateDir so the hook and /work always agree on where
# they live. Two formulas for one path is the same drift class this item exists to delete.

# Read-only state root. The stamp hook runs before EVERY prompt and must never create anything:
# a directory create on a dead or slow path is a hang in the one code path that must not hang.
# Get-StateDir (which creates) is for the verbs; this is for readers.
function Get-StateDirRO { Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good' }

# Every id that reaches a printed line is validated against this. An id is a machine token, not
# free text: one carrying newlines would otherwise forge extra stamp lines and a fake attribution
# tag, which is the one output the founder is told to trust.
function Test-ItemId([string]$id) { return ($id -cmatch '^AI4(DEV|PM)-[0-9]+$') }

# A FLOATING root (founder ruling 2026-08-02) is a grouping label that exists only for the
# attribution log - for cadence and monitoring - and deliberately has NO item on the board. It is
# written `~name` so it can never be mistaken for a board id at a glance or by a parser, and it is
# legal ONLY as the first node of a chain. A real parent found by the walk always wins over it:
# the traversal is what catches genuine structure, and this only fills space the board leaves empty.
function Test-FloatingRoot([string]$id) { return ($id -cmatch '^~[A-Za-z0-9][A-Za-z0-9 _.-]{0,30}$') }

# Bounded read: a cache is a speed-up, so an implausibly large one is corrupt by definition and
# is not worth the time it would take to parse.
function Read-JsonCapped([string]$path, [int]$maxBytes = 65536) {
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    try {
        $f = Get-Item -LiteralPath $path
        if ($f.Length -gt $maxBytes -or $f.Length -eq 0) { return $null }
        return (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json)
    }
    catch { return $null }
}

function Get-HeldPath { Join-Path (Get-StateDirRO) ('attr\' + (Get-WorktreeId) + '.held.json') }

function Get-HeldItem { Read-JsonCapped (Get-HeldPath) }

# The branch in force when the item was taken up is stored WITH it. Without that provenance a
# held item silently outlives the work it describes: take up AI4DEV-19, switch to main, and every
# later prompt on main still claims 19. The stamp only fills a gap from held state when the
# branch still matches; otherwise it shows it as untrusted and attributes nothing.
function Set-HeldItem([string]$itemId, [string]$label, [string]$branch) {
    # A FLOATING label is legal here too (founder 2026-08-09): coordinator work that belongs to
    # no board item - exploration, design discussion - holds `~exploration`-style labels so the
    # stamp attributes it instead of printing an absence. The tilde keeps it unmistakable.
    if (-not (Test-ItemId $itemId) -and -not (Test-FloatingRoot $itemId)) { throw ('not a valid item id or ~floating label: ' + $itemId) }
    $d = Get-StateDir  # the verbs may create; readers may not
    $h = @{ itemId = $itemId; label = $label; branch = $branch; heldAt = (Get-Date).ToUniversalTime().ToString('o') }
    [System.IO.File]::WriteAllText((Join-Path $d ('attr\' + (Get-WorktreeId) + '.held.json')), ($h | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
}

function Clear-HeldItem {
    $p = Get-HeldPath
    if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }
}

# Which SESSION spawned the agent living in a worktree. Written by /work at spawn, read by the
# stamp hook so a parallel session's stamp can say "another session's agent" instead of silently
# appearing to own it (founder 2026-08-09: agent lines in a parallel session read as that
# session's own work). A missing file degrades to "spawner unrecorded", never to a guess.
function Set-OwnerForWorktree([string]$worktreePath, [string]$sessionId) {
    $d = Get-StateDir
    $id = Get-WorktreeIdForPath $worktreePath
    $o = @{ sessionId = $sessionId; recordedAt = (Get-Date).ToUniversalTime().ToString('o') }
    [System.IO.File]::WriteAllText((Join-Path $d ('attr\owner-' + $id + '.json')), ($o | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
}

function Get-OwnerForWorktreeRoot([string]$root) {
    Read-JsonCapped (Join-Path (Get-StateDirRO) ('attr\owner-' + (Get-WorktreeIdFromRoot $root) + '.json'))
}

function Get-ChainKey([string]$branch) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    return ([System.BitConverter]::ToString($sha.ComputeHash(
                [System.Text.Encoding]::UTF8.GetBytes(((Get-WorktreeId) + '|' + $branch).ToLower()))) -replace '-', '').Substring(0, 16).ToLower()
}

function Get-ChainPath([string]$branch) { Join-Path (Get-StateDirRO) ('attr\chain-' + (Get-ChainKey $branch) + '.json') }

# $chain is an ordered array of @{id=..;label=..}, ROOT FIRST, ending on the item itself.
function Set-Chain([string]$branch, [string]$item, $chain) {
    if (-not (Test-ItemId $item)) { throw ('not a valid item id: ' + $item) }
    $d = Get-StateDir
    $o = @{ item = $item; branch = $branch; chain = $chain; resolvedAt = (Get-Date).ToString('o') }
    [System.IO.File]::WriteAllText((Join-Path $d ('attr\chain-' + (Get-ChainKey $branch) + '.json')), ($o | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
}

function Get-Chain([string]$branch) { Read-JsonCapped (Get-ChainPath $branch) }

# The same write, but keyed FOR ANOTHER WORKTREE - the coordinator resolving a chain in the main
# checkout and recording it where an agent's own stamp will look for it.
#
# Without this the supervision tree degrades to a bare id: the coordinator is the only actor that
# reads the board, but the chain key is worktree-scoped, so a chain it resolved was filed under its
# own worktree and the agent's stamp missed it. The founder saw `AGENT AI4DEV-22` with no parents
# and asked for the chain - correctly, since the chain is the whole point of derived attribution.
# The cache stays worktree-scoped rather than global because two clones must never share an entry.
function Set-ChainForWorktree([string]$worktreePath, [string]$branch, [string]$item, $chain) {
    if (-not (Test-ItemId $item)) { throw ('not a valid item id: ' + $item) }
    $d = Get-StateDir
    $key = (Get-WorktreeIdForPath $worktreePath) + '|' + $branch
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $k = ([System.BitConverter]::ToString($sha.ComputeHash(
                [System.Text.Encoding]::UTF8.GetBytes($key.ToLower()))) -replace '-', '').Substring(0, 16).ToLower()
    $o = @{ item = $item; branch = $branch; chain = $chain; resolvedAt = (Get-Date).ToString('o') }
    [System.IO.File]::WriteAllText((Join-Path $d ('attr\chain-' + $k + '.json')), ($o | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
}

# A cache entry is only usable if it proves it describes THIS branch and THIS item. Checking the
# item alone let a copied or foreign entry print an arbitrary root as authoritative - "confidently
# wrong", which is the one thing this design forbids. Anything that fails here is a miss, and a
# miss shows the bare item with no root claimed.
function Test-Chain($c, [string]$branch, [string]$item) {
    if (-not $c) { return $false }
    if (([string]$c.item) -ne $item) { return $false }
    if (([string]$c.branch) -ne $branch) { return $false }
    $nodes = @($c.chain)
    if ($nodes.Count -lt 1 -or $nodes.Count -gt 8) { return $false }
    for ($i = 0; $i -lt $nodes.Count; $i++) {
        $id = [string]$nodes[$i].id
        # A floating label is legal only as the ROOT. Anywhere else it would be claiming a board
        # relationship that does not exist.
        if ($i -eq 0 -and (Test-FloatingRoot $id)) { continue }
        if (-not (Test-ItemId $id)) { return $false }
    }
    if (([string]$nodes[$nodes.Count - 1].id) -ne $item) { return $false }   # must END on the item
    return $true
}

# The PM-acknowledgment file is DELETED with the buckets it protected. It existed because a
# declared `bringup` bucket silenced the "which requirement is this?" question, so a second
# mechanism was needed to re-ask it. Attribution is now derived: if the chain does not reach a
# requirement, the stamp says so on every prompt and there is nothing to acknowledge away.
#
# Clear-ItemState and Write-BindingFor are deleted with the bindings themselves. /work clears
# what it holds with Clear-HeldItem; nothing needs to write state INTO another folder, because a
# session works in the folder it was launched in and never moves itself.

# Machine-wide lock serializing state-changing verbs. Exclusive-create lock file with stale takeover.
function Acquire-WorkLock([int]$staleMinutes = 30) {
    $lock = Join-Path (Get-StateDir) 'locks\verb.lock'
    if (Test-Path $lock) {
        $age = (Get-Date) - (Get-Item $lock).LastWriteTime
        if ($age.TotalMinutes -lt $staleMinutes) {
            $holder = Get-Content $lock -Raw -ErrorAction SilentlyContinue
            return @{ ok = $false; holder = $holder }
        }
        Remove-Item $lock -Force   # stale: takeover
    }
    $fs = $null
    try {
        $fs = [System.IO.File]::Open($lock, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write)
        $info = ('pid=' + $PID + ' worktree=' + (Get-WorktreeId) + ' at=' + (Get-Date).ToUniversalTime().ToString('o'))
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($info)
        $fs.Write($bytes, 0, $bytes.Length)
        return @{ ok = $true }
    } catch {
        return @{ ok = $false; holder = 'concurrent-create' }
    } finally {
        if ($fs) { $fs.Dispose() }
    }
}

function Release-WorkLock {
    $lock = Join-Path (Get-StateDir) 'locks\verb.lock'
    if (Test-Path $lock) { Remove-Item $lock -Force }
}

# Manifest identity: the last commit touching it + a content digest. Pinned in the pull record.
function Get-ManifestIdentity([string]$req) {
    $root = Get-RepoRoot
    $rel = 'loop/decomp/req-' + $req + '.md'
    $file = Join-Path $root $rel
    if (-not (Test-Path $file)) { throw ('manifest not found: ' + $rel) }
    $rev = (& git -C $root log -1 --format=%h -- $rel).Trim()
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $digest = ([System.BitConverter]::ToString($sha.ComputeHash([System.IO.File]::ReadAllBytes($file))) -replace '-','').Substring(0,16).ToLower()
    return @{ rel = $rel; revision = $rev; digest = $digest }
}
