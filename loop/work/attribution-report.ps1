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

# TWO TAG FORMATS, BOTH READ. The single-verb cut-over replaced wave/project/bucket with pm/dev,
# and this parser was not updated - so for weeks it matched nothing and reported 100%
# unattributed over tens of millions of tokens. It did not fail; it produced a confident, clean
# report whose headline read like a finding about our discipline. A broken instrument that looks
# like a measurement is the exact failure this project exists to delete, and it happened to the
# attribution dogfood itself because nothing was watching it.
#
# The legacy tag is still parsed rather than dropped: those sessions WERE attributed, just under
# the earlier model, and counting them as unattributed would understate the real number as badly
# as the bug did. The format is carried into the report so the two are never silently blended.
# THE QUOTES ARE ESCAPED. A transcript is JSONL, so the hook's line is stored as a JSON string
# and every quote inside it arrives as \" - which is why the original pattern, written against
# the tag as it looks on screen, matched nothing from the day it was written. Both quote forms
# are accepted here so the report reads the file as it is rather than as it renders.
$stampNew = [regex]'<ai4good-attribution pm=\\?"([^"\\]*)\\?" dev=\\?"([^"\\]*)\\?"/>'
$stampOld = [regex]'<ai4good-attribution wave=\\?"([^"\\]*)\\?" project=\\?"([^"\\]*)\\?" bucket=\\?"([^"\\]*)\\?"/>'
$agg = @{}   # key "pm|dev|format" -> counters

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
    $cur = 'none|unattributed|no-stamp'   # each session starts unattributed until a stamp appears
    $reader = New-Object System.IO.StreamReader($f.FullName)
    try {
        while ($null -ne ($line = $reader.ReadLine())) {
            # A transcript that READ the hook's source contains the tag's own format template,
            # `pm="{0}" dev="{1}"`, and it matched - inventing buckets named {0} and {1} and
            # attributing real tokens to them. Reading a file must never look like doing work.
            $m = $stampNew.Match($line)
            if ($m.Success -and ($m.Value -notmatch '[{}]')) {
                $pm = $m.Groups[1].Value; $dev = $m.Groups[2].Value
                if (-not $pm -or $pm -eq 'none') { $pm = 'none' }
                if (-not $dev -or $dev -eq 'none') { $dev = 'unattributed' }
                $cur = ($pm + '|' + $dev + '|current')
            }
            else {
                $m = $stampOld.Match($line)
                if ($m.Success -and ($m.Value -notmatch '[{}]')) {
                    $proj = $m.Groups[2].Value; $bucket = $m.Groups[3].Value
                    if (-not $proj) { $proj = 'none' }
                    if (-not $bucket) { $bucket = 'unattributed' }
                    $cur = ($proj + '|' + $bucket + '|legacy')
                }
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
    $p, $b, $fmt = $k -split '\|'
    $a = $agg[$k]
    $rows += [pscustomobject]@{ Root=$p; Item=$b; Stamp=$fmt; Responses=$a.responses; OutputTok=$a.outTok; InputTok=$a.inTok; CacheRead=$a.cacheRead; CacheWrite=$a.cacheWrite }
}
$rows = $rows | Sort-Object -Property @{e='OutputTok';Descending=$true}

$totOut = ($rows | Measure-Object OutputTok -Sum).Sum
$totResp = ($rows | Measure-Object Responses -Sum).Sum
$unatt = ($rows | Where-Object { $_.Item -eq 'unattributed' } | Measure-Object OutputTok -Sum).Sum
$noStamp = ($rows | Where-Object { $_.Stamp -eq 'no-stamp' } | Measure-Object OutputTok -Sum).Sum
if (-not $noStamp) { $noStamp = 0 }
if (-not $totOut) { $totOut = 0 }
if (-not $unatt) { $unatt = 0 }
$pct = if ($totOut -gt 0) { [math]::Round(100.0 * $unatt / $totOut, 1) } else { 0 }

Write-Output ('ai4good buildout burn report - ' + (Get-Date -Format 'yyyy-MM-dd') + ' - ' + $sessions + ' session file(s)' + $(if ($Days -gt 0) { ' (last ' + $Days + ' days)' } else { '' }))
Write-Output ('units: provider-echoed tokens per response (REQ-034 model); money lives elsewhere')
Write-Output ''
$rows | Format-Table Root, Item, Stamp, Responses, OutputTok, InputTok, CacheRead, CacheWrite -AutoSize | Out-String -Width 200 | Write-Output
Write-Output ('TOTAL: ' + $totResp + ' responses, ' + $totOut + ' output tokens. Buckets reconcile to this total by construction.')
Write-Output ('COORDINATOR SIGNAL - unattributed share of output tokens: ' + $pct + '%')
# A no-stamp share at or near 100% is almost never a discipline finding - it is this parser
# having drifted from the stamp again. Said out loud so the next reader checks the instrument
# before believing the number.
$nsPct = if ($totOut -gt 0) { [math]::Round(100.0 * $noStamp / $totOut, 1) } else { 0 }
Write-Output ('of which NO STAMP AT ALL was in force: ' + $nsPct + '% - if this is near 100%, suspect this parser before the discipline')
