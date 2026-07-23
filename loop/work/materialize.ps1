# materialize.ps1 - parse a decomposition manifest into the dev-tree payload for /next.
# Emits JSON: parents (deliverables) + leaves with in-manifest blocked-by references.
# The agent executes the Linear creation calls; this script only derives WHAT to create.
#   powershell -File loop/work/materialize.ps1 -Req 001
param([Parameter(Mandatory=$true)][string]$Req)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'work-lib.ps1')
$root = Get-RepoRoot
$file = Join-Path $root ('loop/decomp/req-' + $Req + '.md')
$t = [System.IO.File]::ReadAllText($file)

$pm = [regex]::Match($t, 'pm-item:\s*(AI4PM-\d+)').Groups[1].Value
$title = [regex]::Match($t, '(?m)^# DECOMP (REQ-[0-9.]+) (.+)$')
$reqId = $title.Groups[1].Value
$mi = Get-ManifestIdentity $Req

$parents = @()
foreach ($d in [regex]::Matches($t, '(?m)^### (D\d+) (.+)$')) {
    $dn = $d.Groups[1].Value
    $dt = $d.Groups[2].Value.TrimStart([char]0x2014, '-', ' ')
    $sect = [regex]::Match($t, "(?ms)^### $dn .*?(?=^### |^## |\z)").Value
    $leaves = @()
    foreach ($l in [regex]::Matches($sect, '(?m)^  - (L\w+) (.+)$')) {
        $ln = $l.Groups[1].Value
        $body = $l.Groups[2].Value
        $verify = [regex]::Match($body, 'verify:\s*([^\r\n]+?)(\s*[·]\s*blocked-by:|$)').Groups[1].Value.Trim()
        $blocked = [regex]::Match($body, 'blocked-by:\s*([^\r\n]+)$').Groups[1].Value.Trim()
        $desc = ($body -split '\s*[·]\s*verify:')[0].Trim()
        $leaves += [pscustomobject]@{ leaf = $ln; title = ($reqId + ' ' + $dn + '.' + $ln); summary = $desc; verify = $verify; blockedBy = $blocked }
    }
    $parents += [pscustomobject]@{ deliverable = $dn; title = ($reqId + ' ' + $dn + ' ' + [char]0x2014 + ' ' + $dt); leaves = $leaves }
}

[pscustomobject]@{
    req = $reqId; pmId = $pm; manifest = $mi.rel; manifestRevision = $mi.revision; manifestDigest = $mi.digest
    parents = $parents
} | ConvertTo-Json -Depth 6
