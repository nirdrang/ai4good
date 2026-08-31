# sheet-check.ps1 - the deployed pstack model sheet must equal the repo's expected copy.
#
# The rulings live in the repo (pstack-model-selection.md and the sheet-roles table); the
# deployed sheet is ~/.claude/pstack-models.md, a user file outside git. This check is the
# only thing that notices drift between them. The flow for a model decision is: rule it,
# update the repo docs AND loop/work/pstack-models.expected.md in the same commit, copy the
# expected file over the deployed sheet, run this check.
#
# Exit 0 = identical. Exit 1 = drift, with a diff.

$expected = Join-Path $PSScriptRoot 'pstack-models.expected.md'
$deployed = Join-Path $env:USERPROFILE '.claude\pstack-models.md'

if (-not (Test-Path $expected)) { Write-Output "SHEET CHECK FAIL: expected copy missing at $expected"; exit 1 }
if (-not (Test-Path $deployed)) { Write-Output "SHEET CHECK FAIL: deployed sheet missing at $deployed"; exit 1 }

# Compare line by line, ignoring line-ending differences.
$e = (Get-Content $expected) | Where-Object { $true }
$d = (Get-Content $deployed) | Where-Object { $true }
$diff = Compare-Object -ReferenceObject $e -DifferenceObject $d

if ($null -eq $diff) {
    Write-Output 'SHEET CHECK OK: deployed sheet equals the expected copy'
    exit 0
}

Write-Output 'SHEET CHECK FAIL: deployed sheet drifted from the expected copy'
$diff | ForEach-Object {
    $side = if ($_.SideIndicator -eq '<=') { 'expected only' } else { 'deployed only' }
    Write-Output ("  {0}: {1}" -f $side, $_.InputObject)
}
exit 1
