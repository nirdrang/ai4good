# check-tree.ps1 — whole-tree verification for the decomposition manifests.
# 1) Per requirement: the manifest's leaf verify sets form a BIJECTION with the AT suite's P0 ids.
# 2) The depends-on graph across all manifests is acyclic (topologically sortable).
# Run from anywhere: powershell -File loop/decomp/check-tree.ps1

$ErrorActionPreference = 'Stop'
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$acc  = Join-Path $repo '.taskmaster\docs\acceptance'
$dec  = Join-Path $repo 'loop\decomp'

$reqs = @('001','002','003','004','005','005.5','006','007','008','009','010','011','012','013','014','015','016','021','023','024','025','026','027','028','030','031','032','033','034','036')

$fail = 0
$graph = @{}

foreach ($r in $reqs) {
    $suiteFile = Join-Path $acc "at-req-$r.md"
    $manFile   = Join-Path $dec "req-$r.md"
    if (-not (Test-Path $manFile)) { Write-Output "req-$r  MISSING MANIFEST"; $fail++; continue }
    $suite = [System.IO.File]::ReadAllText($suiteFile)
    $man   = [System.IO.File]::ReadAllText($manFile)
    $esc   = [regex]::Escape($r)

    # Suite side: every P0 id suffix
    $suiteIds = [regex]::Matches($suite, "AT-$esc\.([0-9]+[a-z]?)\*?\*?\s*\(P0\)") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

    # Manifest side: expand "verify: AT-<req>.aa,bb,cc" comma lists (own-suite only)
    $manIds = @()
    foreach ($m in [regex]::Matches($man, "verify:\s*AT-$esc\.([0-9a-z,]+)")) {
        $manIds += ($m.Groups[1].Value -split ',') | Where-Object { $_ -ne '' }
    }
    $dupes   = $manIds | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name }
    $manSet  = $manIds | Sort-Object -Unique
    $missing = $suiteIds | Where-Object { $manSet -notcontains $_ }
    $extra   = $manSet   | Where-Object { $suiteIds -notcontains $_ }

    if ($dupes -or $missing -or $extra) {
        $fail++
        Write-Output ("req-$r  FAIL  suiteP0={0} mapped={1}  missing=[{2}] extra=[{3}] duplicated=[{4}]" -f $suiteIds.Count, $manSet.Count, ($missing -join ' '), ($extra -join ' '), ($dupes -join ' '))
    } else {
        Write-Output ("req-$r  OK    {0} P0 in bijection" -f $suiteIds.Count)
    }

    # depends-on for the graph check (first depends-on line; REQ tokens only)
    $dep = [regex]::Match($man, '(?m)^depends-on:\s*(.*)$').Groups[1].Value
    $graph[$r] = [regex]::Matches($dep, 'REQ-([0-9.]+)') | ForEach-Object { $_.Groups[1].Value.TrimEnd('.') } | Where-Object { $reqs -contains $_ }
}

# Topological check (Kahn)
$indeg = @{}; foreach ($r in $reqs) { $indeg[$r] = 0 }
foreach ($r in $reqs) { foreach ($d in $graph[$r]) { $indeg[$r]++ | Out-Null } }
# rebuild: indegree = number of prerequisites
$indeg = @{}; foreach ($r in $reqs) { $indeg[$r] = @($graph[$r]).Count }
$queue = New-Object System.Collections.Queue
foreach ($r in $reqs) { if ($indeg[$r] -eq 0) { $queue.Enqueue($r) } }
$sorted = @()
while ($queue.Count -gt 0) {
    $n = $queue.Dequeue(); $sorted += $n
    foreach ($r in $reqs) {
        if ($graph[$r] -contains $n) {
            $indeg[$r] = $indeg[$r] - 1
            if ($indeg[$r] -eq 0) { $queue.Enqueue($r) }
        }
    }
}
if ($sorted.Count -eq $reqs.Count) {
    Write-Output ("GRAPH OK  topological order exists ({0} nodes)" -f $sorted.Count)
} else {
    $fail++
    $stuck = $reqs | Where-Object { $sorted -notcontains $_ }
    Write-Output ("GRAPH FAIL  cycle among: {0}" -f ($stuck -join ', '))
}

Write-Output ("RESULT: " + $(if ($fail -eq 0) { 'ALL CHECKS PASS' } else { "$fail FAILURE(S)" }))
