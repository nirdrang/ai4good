# work-lib.ps1 - shared functions for the ai4good work skill (ASCII-only; PowerShell 5.1).
# Binding cache + machine mutex + manifest identity, per the adopted way-of-work (d83, d87).
# Local files are CACHES; the durable record is always the Linear pull/completion comment.

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    $r = (& git rev-parse --show-toplevel 2>$null)
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
    foreach ($sub in 'bindings','locks') {
        $p = Join-Path $d $sub
        if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force $p | Out-Null }
    }
    return $d
}

function Get-BindingPath { Join-Path (Get-StateDir) ('bindings\' + (Get-WorktreeId) + '.json') }

function Read-Binding {
    $p = Get-BindingPath
    if (-not (Test-Path $p)) { return $null }
    try { return (Get-Content $p -Raw | ConvertFrom-Json) } catch { return $null }
}

function Write-Binding([hashtable]$b) {
    $b['worktree'] = Get-WorktreeId
    $b['writtenAt'] = (Get-Date).ToUniversalTime().ToString('o')
    $json = ($b | ConvertTo-Json -Depth 4)
    [System.IO.File]::WriteAllText((Get-BindingPath), $json, (New-Object System.Text.UTF8Encoding($false)))
}

function Clear-Binding {
    $p = Get-BindingPath
    if (Test-Path $p) { Remove-Item $p -Force }
}

# Write a binding INTO a specific worktree (used by /next when it creates a dedicated worktree
# and must place the binding in the new folder, not the orchestrating one).
function Write-BindingFor([string]$path, [hashtable]$b) {
    $wid = Get-WorktreeIdForPath $path
    $b['worktree'] = $wid
    $b['writtenAt'] = (Get-Date).ToUniversalTime().ToString('o')
    $target = Join-Path (Get-StateDir) ('bindings\' + $wid + '.json')
    $json = ($b | ConvertTo-Json -Depth 4)
    [System.IO.File]::WriteAllText($target, $json, (New-Object System.Text.UTF8Encoding($false)))
    return $target
}

# Machine-wide lock serializing /next and /done. Exclusive-create lock file with stale takeover.
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
