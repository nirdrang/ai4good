# attribution-report.ps1 - the buildout's token-denominated burn report (attribution dogfood, AI4DEV-14).
# Read-only over this machine's Claude Code transcripts for THIS project. Correlates each
# response's PROVIDER-ECHOED token usage with the attribution stamp in force at that moment
# (REQ-034's model: token-denominated, honest buckets, totals always reconcile).
#   powershell -File loop/work/attribution-report.ps1            -> report over all sessions
#   powershell -File loop/work/attribution-report.ps1 -Days 7    -> only sessions active in the last 7 days
param([int]$Days = 0)
$ErrorActionPreference = 'Stop'

$projDir = Join-Path $env:USERPROFILE '.claude\projects\C--Users-nirdr-Downloads-ai4good'
if (-not (Test-Path $projDir)) { throw ('transcript directory not found: ' + $projDir) }
$files = Get-ChildItem $projDir -Filter '*.jsonl' -File
if ($Days -gt 0) { $files = $files | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-$Days) } }

$stampRe = [regex]'<ai4good-attribution wave="([^"]*)" project="([^"]*)" bucket="([^"]*)"/>'
$agg = @{}   # key "project|bucket" -> counters

function Add-Usage([string]$key, $usage, [hashtable]$agg) {
    if (-not $agg.ContainsKey($key)) {
        $agg[$key] = @{ responses = 0; inTok = [long]0; outTok = [long]0; cacheRead = [long]0; cacheWrite = [long]0 }
    }
    $a = $agg[$key]
    $a.responses++
    if ($usage.input_tokens)               { $a.inTok     += [long]$usage.input_tokens }
    if ($usage.output_tokens)              { $a.outTok    += [long]$usage.output_tokens }
    if ($usage.cache_read_input_tokens)    { $a.cacheRead += [long]$usage.cache_read_input_tokens }
    if ($usage.cache_creation_input_tokens){ $a.cacheWrite+= [long]$usage.cache_creation_input_tokens }
}

$sessions = 0
foreach ($f in $files) {
    $sessions++
    $cur = 'none|unattributed'   # each session starts unattributed until a stamp appears
    $reader = New-Object System.IO.StreamReader($f.FullName)
    try {
        while ($null -ne ($line = $reader.ReadLine())) {
            $m = $stampRe.Match($line)
            if ($m.Success) {
                $proj = $m.Groups[2].Value; $bucket = $m.Groups[3].Value
                if (-not $proj) { $proj = 'none' }
                if (-not $bucket) { $bucket = 'unattributed' }
                $cur = ($proj + '|' + $bucket)
            }
            if ($line.IndexOf('"usage"') -ge 0 -and $line.IndexOf('"output_tokens"') -ge 0) {
                try {
                    $o = $line | ConvertFrom-Json
                    $u = $null
                    if ($o.message -and $o.message.usage) { $u = $o.message.usage }
                    elseif ($o.usage) { $u = $o.usage }
                    if ($u -and $o.type -eq 'assistant') { Add-Usage $cur $u $agg }
                } catch { }
            }
        }
    } finally { $reader.Dispose() }
}

# ---- report (the product burn-view shape: per requirement + honest buckets -> reconciling total)
$rows = @()
foreach ($k in $agg.Keys) {
    $p, $b = $k -split '\|'
    $a = $agg[$k]
    $rows += [pscustomobject]@{ Project=$p; Bucket=$b; Responses=$a.responses; OutputTok=$a.outTok; InputTok=$a.inTok; CacheRead=$a.cacheRead; CacheWrite=$a.cacheWrite }
}
$rows = $rows | Sort-Object -Property @{e='OutputTok';Descending=$true}

$totOut = ($rows | Measure-Object OutputTok -Sum).Sum
$totResp = ($rows | Measure-Object Responses -Sum).Sum
$unatt = ($rows | Where-Object { $_.Bucket -eq 'unattributed' } | Measure-Object OutputTok -Sum).Sum
if (-not $totOut) { $totOut = 0 }
if (-not $unatt) { $unatt = 0 }
$pct = if ($totOut -gt 0) { [math]::Round(100.0 * $unatt / $totOut, 1) } else { 0 }

Write-Output ('ai4good buildout burn report - ' + (Get-Date -Format 'yyyy-MM-dd') + ' - ' + $sessions + ' session file(s)' + $(if ($Days -gt 0) { ' (last ' + $Days + ' days)' } else { '' }))
Write-Output ('units: provider-echoed tokens per response (REQ-034 model); money lives elsewhere')
Write-Output ''
$rows | Format-Table Project, Bucket, Responses, OutputTok, InputTok, CacheRead, CacheWrite -AutoSize | Out-String -Width 200 | Write-Output
Write-Output ('TOTAL: ' + $totResp + ' responses, ' + $totOut + ' output tokens. Buckets reconcile to this total by construction.')
Write-Output ('COORDINATOR SIGNAL - unattributed share of output tokens: ' + $pct + '%')
