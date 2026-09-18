# Runs the verify commands for one unit boundary in order, one output file per command, and a
# summary with exit code, duration, and the counts line. Usage: run.ps1 <folder> <tier-set>
# where tier-set is "loop" (the fast set) or "all" (loop plus integration).
param([Parameter(Mandatory)][string]$Folder, [string]$Set = 'all')
$root = Split-Path -Parent $PSScriptRoot
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$out = Join-Path $PSScriptRoot $Folder
New-Item -ItemType Directory -Force $out | Out-Null
$loop = @(
  'bun run typecheck',
  'bun run at:check req-004',
  'bun run at:selftest',
  'bun run at:verify req-004 --tier loop --expect',
  'bun run at:verify req-001 --tier loop --expect',
  'bun run at:verify req-002 --tier loop --expect',
  'bun run at:verify req-003 --tier loop --expect',
  'bun run at:verify req-016 --tier loop --expect',
  'bun run build'
)
$integration = @(
  'bun run at:verify req-004 --tier integration --expect',
  'bun run at:verify req-001 --tier integration --expect',
  'bun run at:verify req-002 --tier integration --expect',
  'bun run at:verify req-003 --tier integration --expect',
  'bun run at:verify req-016 --tier integration --expect'
)
$commands = switch ($Set) { 'loop' { $loop } 'integration' { $integration } default { $loop + $integration } }
$summary = Join-Path $out 'summary.txt'
"# $(Get-Date -Format o) on $(git -C $repo rev-parse --short HEAD)" | Out-File -Encoding utf8 $summary
$n = 0
foreach ($command in $commands) {
  $n += 1
  $file = Join-Path $out ("{0:d2}-{1}.log" -f $n, ($command -replace '[^a-z0-9]+', '-').Trim('-'))
  $started = Get-Date
  Push-Location $repo
  try { cmd /c "$command 2>&1" | Out-File -Encoding utf8 $file; $code = $LASTEXITCODE } finally { Pop-Location }
  $seconds = [int]((Get-Date) - $started).TotalSeconds
  $text = Get-Content $file -Raw
  $counts = ([regex]::Matches($text, '\d+ P0: \d+ green, \d+ red, \d+ missing') | Select-Object -Last 1).Value
  $expected = ([regex]::Matches($text, 'EXPECTED: [^\r\n]*') | Select-Object -Last 1).Value
  "$command => exit $code, ${seconds}s :: $counts :: $expected" | Add-Content -Encoding utf8 $summary
}
"# done $(Get-Date -Format o)" | Add-Content -Encoding utf8 $summary
git -C $repo checkout -- src/routeTree.gen.ts 2>$null


