# stamp-hook.ps1 - UserPromptSubmit hook: append the attribution stamp to every message.
# ADVISORY context only (the way-of-work's client-side attribution; no token counting).
# Must be FAST and never fail the prompt: any error degrades to the unattributed stamp.
$ErrorActionPreference = 'SilentlyContinue'
$stamp = '<ai4good-attribution wave="none" project="none" bucket="unattributed"/>'
try {
    . (Join-Path $PSScriptRoot 'work-lib.ps1')
    $b = Read-Binding
    if ($b -and $b.bucket) {
        $allow = '[^A-Za-z0-9.\-]'
        $wave = ([string]$b.wave) -replace $allow, ''
        $proj = ([string]$b.project) -replace $allow, ''
        $bucket = ([string]$b.bucket) -replace $allow, ''
        if (-not $wave) { $wave = 'none' }
        if (-not $proj) { $proj = 'none' }
        if (-not $bucket) { $bucket = 'unattributed' }
        $stamp = ('<ai4good-attribution wave="{0}" project="{1}" bucket="{2}"/>' -f $wave, $proj, $bucket)
    }
} catch { }
Write-Output $stamp
