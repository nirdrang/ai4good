# assemble-pure.ps1 — assemble prd-mvp.md from the pure sections (the ONLY editable PRD source)
# and run the verification gate. Part of the doc-sync tool chain (see .claude/skills/doc-sync).
#   powershell -File loop/assemble-pure.ps1            -> verify + write .taskmaster/docs/prd-mvp.md
#   powershell -File loop/assemble-pure.ps1 -Check     -> verify + diff against the existing file, write nothing
param([switch]$Check)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$out  = Join-Path $repo '.taskmaster\docs\prd-mvp.md'
$road = Join-Path $repo '.taskmaster\docs\roadmap.md'
$secs = 1..9 | ForEach-Object { Get-ChildItem (Join-Path $repo 'loop\out') -Filter "pure-s$_-*.md" } | ForEach-Object { $_.FullName }
if ($secs.Count -ne 9) { throw "expected 9 pure sections, found $($secs.Count)" }

$parts = $secs | ForEach-Object { [System.IO.File]::ReadAllText($_).TrimEnd() }
$doc = ($parts -join "`n`n") + "`n"

$fail = @()
# 1) REQ headings — exactly the canonical 30
$heads = [regex]::Matches($doc, '(?m)^#### REQ-[0-9.]+:').Count
if ($heads -ne 30) { $fail += "REQ headings: $heads (expected 30)" }
# 2) no decision-NN references
$dec = [regex]::Matches($doc, 'decision-\d+').Count
if ($dec -ne 0) { $fail += "decision-NN refs: $dec (expected 0)" }
# 3) banned vague words (whole words, case-insensitive)
$banned = 'fast','quick','slow','good','bad','poor','user-friendly','easy','simple','secure','safe','scalable','flexible','performant','efficient','robust','seamless'
foreach ($w in $banned) {
    $n = [regex]::Matches($doc, "(?i)\b$([regex]::Escape($w))\b").Count
    if ($n -gt 0) { $fail += "banned word '$w': $n" }
}
# 4) no replacement characters (encoding damage)
if ($doc.Contains([char]0xFFFD)) { $fail += 'U+FFFD replacement characters present' }
# 5) RM-reference bijection with roadmap.md
$docRM  = [regex]::Matches($doc, 'RM-(\d+)') | ForEach-Object { [int]$_.Groups[1].Value } | Sort-Object -Unique
$roadTx = [System.IO.File]::ReadAllText($road)
$roadRM = [regex]::Matches($roadTx, '(?m)^#{0,4}\s*\**RM-(\d+)') | ForEach-Object { [int]$_.Groups[1].Value } | Sort-Object -Unique
$missing = $docRM | Where-Object { $roadRM -notcontains $_ }
if ($missing) { $fail += "RM refs with no roadmap entry: RM-$($missing -join ', RM-')" }

if ($fail) { $fail | ForEach-Object { Write-Output "VERIFY FAIL  $_" }; exit 1 }
Write-Output ("VERIFY OK  30 REQ headings · 0 decision refs · 0 banned words · 0 FFFD · {0} RM refs all in roadmap" -f $docRM.Count)

if ($Check) {
    $cur = [System.IO.File]::ReadAllText($out) -replace "`r`n", "`n"
    if ($cur -eq $doc) { Write-Output 'CHECK OK  assembly reproduces prd-mvp.md exactly' }
    else {
        $curL = $cur -split "`n"; $newL = $doc -split "`n"
        $diff = Compare-Object $curL $newL | Select-Object -First 10
        Write-Output ("CHECK DIFF  current {0} lines vs assembled {1} lines; first differences:" -f $curL.Count, $newL.Count)
        $diff | ForEach-Object { Write-Output ("  {0} {1}" -f $_.SideIndicator, $_.InputObject) }
        exit 1
    }
} else {
    [System.IO.File]::WriteAllText($out, $doc, (New-Object System.Text.UTF8Encoding($false)))
    Write-Output "WROTE $out"
}
