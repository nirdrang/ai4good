<#
  Capture `bun run at:verify req-016 --tier loop` in a form two runs can be compared byte for byte.

  Usage, from the repository root:

      powershell -File loop/items/AI4DEV-24/baseline/normalize-verify.ps1 > current.txt
      Compare-Object `
        (Get-Content loop/items/AI4DEV-24/baseline/verify-req-016-loop.baseline.txt) `
        (Get-Content current.txt)

  Empty Compare-Object output means the run is unchanged. The committed baseline was captured at
  02baf79 (this item's base commit) BEFORE any implementation, so it can also be regenerated from a
  detached worktree at that commit.

  EXACTLY TWO things in the raw output are non-deterministic, and nothing is dropped:

    - the report directory, `JSON report written to <temp>/at-verify-<random>/vitest-report.json`,
      whose temp root is machine-specific and whose suffix is random. That ONE line is rewritten to
      a fixed token.
    - PowerShell wraps a child process's stderr in ErrorRecord objects, whose rendering carries the
      caller's own script text and line numbers. Those are unwrapped to the plain message the
      process actually emitted.

  Every other line - the per-id table, the counts, both FAILURE lines - is passed through verbatim,
  and the process exit code is appended as the last line, so neither a changed verdict nor a changed
  exit status can be normalized away.
#>
$ErrorActionPreference = 'Continue'

$raw = & bun run at:verify req-016 --tier loop 2>&1 |
  ForEach-Object {
    if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { [string]$_ }
  }
$exit = $LASTEXITCODE

$raw |
  ForEach-Object {
    $_ -replace '^JSON report written to .*$', 'JSON report written to <TMP>/at-verify-<RANDOM>/vitest-report.json'
  } |
  ForEach-Object { $_.TrimEnd() }

"EXIT=$exit"