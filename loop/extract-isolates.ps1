# extract-isolates.ps1 — re-extract per-requirement isolate files from the assembled prd-mvp.md.
# Part of the doc-sync tool chain (see .claude/skills/doc-sync). Explicit UTF-8, no BOM (the
# cp1252 mojibake lesson). Extracts only the requested requirements to keep diffs surgical.
#   powershell -File loop/extract-isolates.ps1 -Reqs 015,024
param([Parameter(Mandatory=$true)][string[]]$Reqs)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $repo '.taskmaster\docs\prd-mvp.md'
$dst  = Join-Path $repo '.taskmaster\docs\requirements'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$doc  = [System.IO.File]::ReadAllText($src)
$banner = "<!-- ISOLATED requirement, extracted from prd-mvp.md. Source of truth is the PRD; re-extract if it changes. -->"

$Reqs = $Reqs | ForEach-Object { $_ -split ',' } | Where-Object { $_ -ne '' }
foreach ($r in $Reqs) {
    $r = $r.TrimStart('0'); $id = $r  # accept 015 or 15
    # normalize to the PRD's zero-padded form
    $pat = [regex]"(?ms)^#### REQ-0*$([regex]::Escape($id)):.*?(?=^#### REQ-|^## |^# |\z)"
    $m = $pat.Match($doc)
    if (-not $m.Success) { Write-Output "REQ-$id NOT FOUND"; continue }
    $body = $m.Value.TrimEnd()
    $numMatch = [regex]::Match($m.Value, '^#### (REQ-[0-9.]+):')
    $file = Join-Path $dst ("req-" + $numMatch.Groups[1].Value.Substring(4).ToLower() + ".md")
    [System.IO.File]::WriteAllText($file, "$banner`n`n$body`n", $utf8)
    Write-Output "WROTE $file"
}
