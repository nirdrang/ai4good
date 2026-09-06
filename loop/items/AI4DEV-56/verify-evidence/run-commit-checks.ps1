param(
  [Parameter(Mandatory=$true)][string]$Commit,
  [Parameter(Mandatory=$true)][string]$WorktreePath,
  [Parameter(Mandatory=$true)][string]$OutMd
)

function Run-Cmd([string]$label, [string]$cmdLine) {
  $start = Get-Date
  $startStr = $start.ToString("o")
  Push-Location $WorktreePath
  try {
    $output = & cmd /c "$cmdLine 2>&1"
    $exit = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  $end = Get-Date
  $endStr = $end.ToString("o")
  $tail = ($output | Select-Object -Last 10) -join "`n"
  return [PSCustomObject]@{
    Label = $label
    Start = $startStr
    End = $endStr
    Exit = $exit
    Tail = $tail
  }
}

$results = @()
$results += Run-Cmd "bun install --frozen-lockfile" "bun install --frozen-lockfile"
$results += Run-Cmd "bun run typecheck" "bun run typecheck"
$results += Run-Cmd "bun run at:check req-001" "bun run at:check req-001"
$results += Run-Cmd "bun run at:selftest" "bun run at:selftest"
$results += Run-Cmd "bun run at:verify req-001 --tier loop --expect" "bun run at:verify req-001 --tier loop --expect"

Add-Content -Path $OutMd -Value "`n### Commit $Commit`n"
Add-Content -Path $OutMd -Value "| command | start | end | exit |"
Add-Content -Path $OutMd -Value "|---|---|---|---|"
foreach ($r in $results) {
  Add-Content -Path $OutMd -Value "| $($r.Label) | $($r.Start) | $($r.End) | $($r.Exit) |"
}
foreach ($r in $results) {
  Add-Content -Path $OutMd -Value "`n**$($r.Label)** last 10 lines:`n"
  Add-Content -Path $OutMd -Value '```'
  Add-Content -Path $OutMd -Value $r.Tail
  Add-Content -Path $OutMd -Value '```'
}

$nonzero = $results | Where-Object { $_.Exit -ne 0 }
if ($nonzero) {
  Write-Output "FAILURE in commit $Commit : $($nonzero[0].Label) exit $($nonzero[0].Exit)"
  exit 1
} else {
  Write-Output "OK commit $Commit"
  exit 0
}
