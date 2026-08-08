# The scripted stand-in for any relay actor (a reviewer, a sitting). Costs no tokens.
# Each mode reproduces one real failure shape from the incident record.
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('happy', 'die-at-launch', 'hang', 'finish-no-notify')]
    [string]$Mode,

    [Parameter(Mandatory = $true)]
    [string]$Dir
)

$log    = Join-Path $Dir 'actor.log'
$result = Join-Path $Dir 'result.txt'
$notify = Join-Path $Dir 'notify.txt'

switch ($Mode) {
    'die-at-launch' {
        # Creates its output file and dies at once - the empty file is the trap.
        # (A real reviewer did exactly this and hid for 80 minutes.)
        New-Item -ItemType File -Path $result -Force | Out-Null
        [Console]::Error.WriteLine('fatal: could not start (drill stand-in)')
        exit 1
    }
    'happy' {
        foreach ($phase in 1..5) {
            Add-Content -Path $log -Value "phase $phase"
            Start-Sleep -Milliseconds 400
        }
        Set-Content -Path $result -Value 'done'
        Set-Content -Path $notify -Value 'done'
        exit 0
    }
    'hang' {
        # Writes one phase, then goes silent while staying alive.
        Add-Content -Path $log -Value 'phase 1'
        Start-Sleep -Seconds 300
    }
    'finish-no-notify' {
        # Finishes its work but never sends its completion signal.
        Add-Content -Path $log -Value 'phase 1'
        Set-Content -Path $result -Value 'done'
        exit 0
    }
}
