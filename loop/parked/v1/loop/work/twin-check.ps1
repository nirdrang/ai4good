# twin-check.ps1 - the orchestrator twin guard (ASCII-only; PowerShell 5.1).
#
# orchestrator.md (fable @ xhigh) and orchestrator-opus.md (opus @ max) share ONE role and ONE
# body; only the frontmatter differs, plus two paragraphs the opus twin is DECLARED to own (its
# fallback identity, and the session-limit-is-not-out-of-credit warning). The rule "edit both or
# neither" is enforced by nothing but discipline, and it drifted within a day of being relied on
# (2026-08-10: two founder-ruled blocks reached the fable file and not the opus one, so a fallback
# sitting would have run older rules than a fable one). This script is that rule as a check.
#
# HOW IT COMPARES: strip each file's YAML frontmatter; remove from the opus body the two allowed
# paragraphs, MATCHED BY THEIR OPENING TEXT (exact strings below) so a third divergence cannot
# hide behind the allowance; normalise line endings; then compare what remains, line by line.
#
# Exit 0 = synced. Exit 1 = drifted (prints the first differing lines). Exit 2 = a file is
# missing, or an allowed paragraph was not found where expected - the guard itself is then stale
# and says so rather than passing vacuously.
#
#   powershell -File loop/work/twin-check.ps1
#   powershell -File loop/work/twin-check.ps1 -Primary <path> -Opus <path>   (for the selftest)

param(
    [string]$Primary = '',
    [string]$Opus = ''
)
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
# forward slashes: PowerShell accepts them on Windows, and pwsh on a Linux CI runner requires them
if (-not $Primary) { $Primary = Join-Path $repo '.claude/agents/orchestrator.md' }
if (-not $Opus)    { $Opus    = Join-Path $repo '.claude/agents/orchestrator-opus.md' }

foreach ($f in @($Primary, $Opus)) {
    if (-not (Test-Path -LiteralPath $f)) { Write-Output ('twin-check: MISSING FILE ' + $f); exit 2 }
}

# The two paragraphs the opus twin is allowed to carry that the primary does not. Matched by
# opening text; each runs to the next blank line. Also allowed: the HTML mirror-note comment.
$allowedOpeners = @(
    '**You are the fallback, and the fallback is a different agent TYPE',
    '**A session limit is not out of credit.**'
)
$allowedComment = '<!-- BODY IS IDENTICAL TO orchestrator.md BY DESIGN'

function Get-Body([string]$path) {
    $lines = [System.IO.File]::ReadAllLines($path)
    # strip frontmatter: first line must be ---, body starts after the closing ---
    if ($lines.Count -lt 2 -or $lines[0] -ne '---') { return ,@($lines) }
    $end = -1
    for ($i = 1; $i -lt $lines.Count; $i++) { if ($lines[$i] -eq '---') { $end = $i; break } }
    if ($end -lt 0) { return ,@($lines) }
    return ,@($lines[($end + 1)..($lines.Count - 1)])
}

$pBody = Get-Body $Primary
$oBodyRaw = Get-Body $Opus

# remove the allowed opus-only material, tracking that each expected piece was actually seen -
# an allowance for text that no longer exists means the guard's model of the twins is stale.
$oBody = New-Object System.Collections.Generic.List[string]
$seen = @{}
foreach ($opener in $allowedOpeners) { $seen[$opener] = $false }
$seenComment = $false
$skipPara = $false
$skipComment = $false
foreach ($line in $oBodyRaw) {
    if ($skipComment) { if ($line -match '-->\s*$') { $skipComment = $false }; continue }
    if ($skipPara) { if ($line.Trim() -eq '') { $skipPara = $false }; continue }
    $t = $line.TrimStart()
    if ($t.StartsWith($allowedComment)) { $seenComment = $true; if ($line -notmatch '-->\s*$') { $skipComment = $true }; continue }
    $isOpener = $false
    foreach ($opener in $allowedOpeners) {
        if ($t.StartsWith($opener)) { $seen[$opener] = $true; $isOpener = $true; break }
    }
    if ($isOpener) { $skipPara = $true; continue }
    $oBody.Add($line)
}

$missing = @($allowedOpeners | Where-Object { -not $seen[$_] })
if (-not $seenComment) { $missing += $allowedComment }
if ($missing.Count -gt 0) {
    Write-Output 'twin-check: STALE GUARD - an allowed opus-only block was not found where expected:'
    $missing | ForEach-Object { Write-Output ('  ' + $_) }
    Write-Output 'Either the twins changed shape (update the allowance here) or the opus file lost its declared blocks.'
    exit 2
}

# drop pure-blank runs at the edges introduced by the removals, then compare line by line
function Normalize($lines) {
    $out = New-Object System.Collections.Generic.List[string]
    $blank = $false
    foreach ($l in $lines) {
        $isBlank = ($l.Trim() -eq '')
        if ($isBlank -and $blank) { continue }
        $out.Add($l.TrimEnd())
        $blank = $isBlank
    }
    while ($out.Count -gt 0 -and $out[0].Trim() -eq '') { $out.RemoveAt(0) }
    while ($out.Count -gt 0 -and $out[$out.Count - 1].Trim() -eq '') { $out.RemoveAt($out.Count - 1) }
    return $out
}

$p = Normalize $pBody
$o = Normalize $oBody

$max = [Math]::Max($p.Count, $o.Count)
for ($i = 0; $i -lt $max; $i++) {
    $pl = if ($i -lt $p.Count) { $p[$i] } else { '<end of file>' }
    $ol = if ($i -lt $o.Count) { $o[$i] } else { '<end of file>' }
    if ($pl -ne $ol) {
        Write-Output 'twin-check: TWINS DRIFTED - first difference (after stripping frontmatter and the declared opus-only blocks):'
        Write-Output ('  fable : ' + $pl)
        Write-Output ('  opus  : ' + $ol)
        Write-Output 'The rule is edit both or neither, in the same commit. Fix the lagging twin before any spawn.'
        exit 1
    }
}

Write-Output ('twin-check: SYNCED - ' + $p.Count + ' body lines identical apart from the declared differences')
exit 0
