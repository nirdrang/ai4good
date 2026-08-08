# The scripted stand-in for any relay actor (a reviewer, a sitting). Costs no tokens.
# Each mode reproduces one real failure shape from the incident record.
#
# The plain modes (happy, die-at-launch, hang, finish-no-notify) exercise the control
# library in run-drills.ps1. The reviewer-* modes mimic a codex reviewer's observable
# surface - stderr run header, output file written once at the end, count line - so a
# REAL conductor and reviewer-runner can be drilled against them live.
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('happy', 'die-at-launch', 'hang', 'finish-no-notify',
                 'reviewer-findings', 'reviewer-narration-only',
                 'reviewer-die-at-launch', 'reviewer-hang')]
    [string]$Mode,

    [Parameter(Mandatory = $true)]
    [string]$Dir,

    # reviewer-* modes only: where the "-o" verdict and the stderr transcript go.
    [string]$Out,
    [string]$Err
)

$log    = Join-Path $Dir 'actor.log'
$result = Join-Path $Dir 'result.txt'
$notify = Join-Path $Dir 'notify.txt'

function Write-RunHeader {
    # The shape the runner is contractually required to read at launch.
    $sid = [guid]::NewGuid().ToString()
    Add-Content -Path $Err -Value "[drill] model: drill-stand-in | effort: none | sandbox: read-only"
    Add-Content -Path $Err -Value "[drill] session id: $sid"
}

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

    'reviewer-die-at-launch' {
        # The 80-minute incident: the -o file is created empty, the whole answer is
        # a few hundred bytes of stderr, and the process is already gone.
        New-Item -ItemType File -Path $Out -Force | Out-Null
        Set-Content -Path $Err -Value "error: model 'drill-stand-in' not found; run 'codex login' or check -c model="
        exit 1
    }
    'reviewer-findings' {
        # A healthy reviewer: header at launch, transcript growing during the run,
        # verdict written once at the very end WITH its count line.
        New-Item -ItemType File -Path $Out -Force | Out-Null
        Write-RunHeader
        foreach ($i in 1..6) {
            Add-Content -Path $Err -Value "[drill] reading the tree - step $i"
            Start-Sleep -Seconds 12
        }
        @(
            'FINDING 1 (drill): loop/drills/fake-actor.ps1 - the stand-in reviewer never reads the prompt file it is handed.'
            'FINDING 2 (drill): loop/drills/control-lib.ps1 - Wait-TwoChannel polls at a fixed 200ms with no backoff.'
            'CODE REVIEW: 2 FINDINGS'
        ) | Set-Content -Path $Out
        exit 0
    }
    'reviewer-narration-only' {
        # The AI4DEV-57 shape: a plausible-looking output that is only narration.
        # No count line anywhere - reporting this as landed is the defect being drilled.
        New-Item -ItemType File -Path $Out -Force | Out-Null
        Write-RunHeader
        Start-Sleep -Seconds 40
        @(
            'Now reading the two depth files to understand the control flow...'
            'Examining the wait primitives and their callers.'
        ) | Set-Content -Path $Out
        exit 0
    }
    'reviewer-hang' {
        # Header lands, one narration line, then silence while alive. For abort drills.
        New-Item -ItemType File -Path $Out -Force | Out-Null
        Write-RunHeader
        Add-Content -Path $Err -Value '[drill] reading the tree - step 1'
        Start-Sleep -Seconds 1200
    }
}
