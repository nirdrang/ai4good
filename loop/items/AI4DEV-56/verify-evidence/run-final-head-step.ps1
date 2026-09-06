param(
  [Parameter(Mandatory=$true)][string]$Label,
  [Parameter(Mandatory=$true)][string]$CmdLine,
  [Parameter(Mandatory=$true)][string]$WorktreePath,
  [string]$FullOutFile = $null
)

$start = Get-Date
$startStr = $start.ToString("o")
Push-Location $WorktreePath
try {
  $output = & cmd /c "$CmdLine 2>&1"
  $exit = $LASTEXITCODE
} finally {
  Pop-Location
}
$end = Get-Date
$endStr = $end.ToString("o")

if ($FullOutFile) {
  $output | Out-File -FilePath $FullOutFile -Encoding utf8
}

$tail = ($output | Select-Object -Last 10) -join "`n"

Write-Output "LABEL:$Label"
Write-Output "START:$startStr"
Write-Output "END:$endStr"
Write-Output "EXIT:$exit"
Write-Output "TAIL_BEGIN"
Write-Output $tail
Write-Output "TAIL_END"
