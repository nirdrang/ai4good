# Tails every item's conductor-status.log into one console - the local progression monitor.
# Zero tokens, zero model: run it in any terminal and leave it open. Ctrl+C to stop.
# Covers items in this checkout and in agent worktrees under .\worktrees\.
$ErrorActionPreference = 'SilentlyContinue'
$offsets = @{}
Write-Host 'watching conductor status logs (5s poll) - Ctrl+C to stop'
while ($true) {
    $logs = @(Get-ChildItem `
        -Path '.\loop\items\*\artifacts\conductor-status.log', `
              '.\worktrees\*\loop\items\*\artifacts\conductor-status.log' `
        -ErrorAction SilentlyContinue)
    foreach ($log in $logs) {
        $key = $log.FullName
        if (-not $offsets.ContainsKey($key)) { $offsets[$key] = 0 }
        if ($log.Length -gt $offsets[$key]) {
            $fs = [System.IO.File]::Open($key, 'Open', 'Read', 'ReadWrite')
            try {
                [void]$fs.Seek($offsets[$key], 'Begin')
                $sr  = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
                $new = $sr.ReadToEnd()
            } finally { $fs.Close() }
            $offsets[$key] = $log.Length
            $item = Split-Path (Split-Path (Split-Path $key -Parent) -Parent) -Leaf
            foreach ($line in ($new -split "`r?`n" | Where-Object { $_ })) {
                Write-Host ("[{0}] {1}" -f $item, $line)
            }
        }
    }
    Start-Sleep -Seconds 5
}
