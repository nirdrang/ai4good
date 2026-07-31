<#
  Capture `bun run at:verify req-016 --tier loop` in a form two runs can be compared EXACTLY.

  Usage, from the repository root:

      # capture only
      powershell -File loop/items/AI4DEV-24/baseline/normalize-verify.ps1 > current.txt

      # capture AND compare against the committed baseline (exit 0 = unchanged, 1 = changed)
      powershell -File loop/items/AI4DEV-24/baseline/normalize-verify.ps1 `
        -Baseline loop/items/AI4DEV-24/baseline/verify-req-016-loop.baseline.txt

  WHY THE COMPARISON LIVES IN THIS SCRIPT rather than in a usage note telling you to run
  Compare-Object: because Compare-Object is the wrong tool, and the note that recommended it was
  wrong. Compare-Object is a SET difference - case-insensitive by default AND order-insensitive - so
  the same lines emitted in a different order, or with `green` changed to `GREEN`, produce no output
  and get reported as "byte-identical". That would let this project certify a genuinely changed
  at:verify result as unchanged, using its own documented ritual, at the exact point the hardening
  series exists to guard. Raised at Gate 2 by both reviewers independently.

  The comparison below is ordinal: a SHA256 over the normalized UTF-8 bytes, which is sensitive to
  order, to case, and to every byte in between. When it differs, `git diff --no-index` prints the
  actual change rather than leaving you to hunt for it.

  WHAT IS NORMALIZED - exactly one line, and nothing is dropped:

    - `JSON report written to <temp>/at-verify-<random>/vitest-report.json`, whose temp root is
      machine-specific and whose suffix is random. The pattern is anchored and requires the whole
      known shape, so an unrelated line cannot be swallowed by a loose prefix.
    - PowerShell wraps a child process's stderr in ErrorRecord objects whose rendering embeds the
      CALLER's script text and line numbers. Those are unwrapped to the plain message the process
      actually emitted. That wrapping is a property of the capturing shell, not of the run.

  Everything else - the per-id table, the counts, both FAILURE lines, the trailing `error: script`
  line - passes through verbatim, including trailing whitespace, and the process exit code is
  appended as the final line. Neither a changed verdict, a changed ordering, nor a changed exit
  status can be normalized away.
#>
[CmdletBinding()]
param(
  # When supplied, compare the fresh capture against this file and exit non-zero if they differ.
  [string] $Baseline
)

$ErrorActionPreference = 'Continue'

$raw = & bun run at:verify req-016 --tier loop 2>&1 |
  ForEach-Object {
    if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { [string]$_ }
  }
$exit = $LASTEXITCODE

$normalized = @(
  $raw | ForEach-Object {
    $_ -replace '^JSON report written to .*[/\\]at-verify-[A-Za-z0-9_-]+[/\\]vitest-report\.json$',
                'JSON report written to <TMP>/at-verify-<RANDOM>/vitest-report.json'
  }
  "EXIT=$exit"
)

if (-not $Baseline) {
  $normalized
  return
}

# Ordinal comparison. The lines are joined with an explicit "`n" so the result does not depend on how
# either file happens to encode its line endings, then hashed as UTF-8 bytes.
$hashOf = {
  param($lines)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($lines -join "`n"))
    [System.BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '')
  } finally {
    $sha.Dispose()
  }
}

$baselinePath = (Resolve-Path -LiteralPath $Baseline).Path
$baselineLines = [System.IO.File]::ReadAllLines($baselinePath)
$currentHash = & $hashOf $normalized
$baselineHash = & $hashOf $baselineLines

Write-Output "baseline SHA256 : $baselineHash"
Write-Output "current  SHA256 : $currentHash"

if ($currentHash -ceq $baselineHash) {
  Write-Output 'IDENTICAL - the normalized at:verify output is unchanged, byte for byte.'
  exit 0
}

Write-Output 'CHANGED - the normalized at:verify output differs from the baseline:'
$tmp = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllLines($tmp, $normalized)
& git diff --no-index --exit-code -- $baselinePath $tmp
Remove-Item -LiteralPath $tmp -Force
exit 1
