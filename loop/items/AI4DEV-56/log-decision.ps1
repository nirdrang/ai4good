# Append one row to the item's decision trail (show-me-your-work TSV). Mirrors the skill's log.sh:
# stamps ts, writes the header on first use, flattens tabs and newlines, and quotes a leading
# formula character so a spreadsheet never executes a cell.
param(
  [Parameter(Mandatory)] [string] $Phase,
  [Parameter(Mandatory)] [string] $Decision,
  [Parameter(Mandatory)] [string] $Why,
  [Parameter(Mandatory)] [string] $Evidence,
  [Parameter(Mandatory)] [string] $Result
)
$log = Join-Path $PSScriptRoot 'decisions.tsv'
if (-not (Test-Path $log)) {
  [IO.File]::WriteAllText($log, "ts`tphase`tdecision`twhy`tevidence`tresult`n", [Text.UTF8Encoding]::new($false))
}
function Clean([string] $v) {
  $v = $v -replace "[`t`r`n]", ' '
  if ($v -match '^[=+\-@]') { return "'$v" }
  return $v
}
$ts = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$row = ($ts, (Clean $Phase), (Clean $Decision), (Clean $Why), (Clean $Evidence), (Clean $Result)) -join "`t"
[IO.File]::AppendAllText($log, "$row`n", [Text.UTF8Encoding]::new($false))
