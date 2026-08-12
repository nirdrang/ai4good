# settings-proof-probe.ps1 - prove the DEPLOYED hook entries load and fire, not merely that the
# JSON parses.
#
# WHY (gate 1 finding 6). "The JSON parses and the files exist" proves nothing about whether Claude
# Code loaded the entries, matched the tool, and delivered the text. This drives a real headless
# `claude -p` run against each deployed entry shape and reads the answer out of the transcript.
#
# PATH HONESTY. The committed .claude/settings.json carries MAIN-checkout absolute paths, which
# only exist after the merge - window-gate.ps1 and window-alarm.cmd are not in the main checkout
# yet. So the probe generates a TWIN of the committed file whose command paths are rewritten to
# this worktree. Everything else is copied through untouched: the same event names, the same
# matchers, the same JSON shape, the same invocation style. Only the path prefix differs, and the
# twin is written beside the evidence so a reader can diff it against the committed file. What
# this proves is that the ENTRY SHAPES load and fire. The merge sitting still checks the live
# firing of the main-checkout paths afterwards; that is the second half, no longer the only half.
#
# NO LOGGING HOOKS ARE ADDED. Extra entries would no longer be the deployed shape. Every piece of
# evidence therefore comes from the transcript, which is also the only place that proves the MODEL
# actually saw the text.
#
# COST. Five short headless runs on trivial prompts. It is not free, unlike the drill, which is
# why it is a one-time proof and the drill is the permanent net.
#
# Run: powershell -NoProfile -File loop/items/AI4DEV-82/artifacts/settings-proof-probe.ps1
# Evidence lands in loop/items/AI4DEV-82/artifacts/settings-proof/ (raw transcripts kept).

[CmdletBinding()]
param(
    # The Claude Code binary. Overridable so the probe can be pointed at a specific install.
    [string]$ClaudeBin = 'claude',

    # Where the evidence is written. Defaults beside this script.
    [string]$OutDir = '',

    # Headless runs need tools to be allowed to run. Hooks fire regardless of permission mode -
    # that is the point of a hook - but if the PreToolUse deny does not appear, re-run with the
    # default mode before concluding anything about the entry.
    [string]$PermissionMode = 'bypassPermissions',

    # A single run that hangs must not hang the probe.
    [int]$TimeoutSec = 180
)

$ErrorActionPreference = 'SilentlyContinue'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = (Resolve-Path (Join-Path $here '..\..\..\..')).Path
if (-not $OutDir) { $OutDir = Join-Path $here 'settings-proof' }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$committed = Join-Path $repo '.claude\settings.json'
$mainPrefix = 'C:\Users\nirdr\Downloads\ai4good'

$pass = 0; $fail = 0; $failed = @()
function Check([string]$claim, [bool]$ok, [string]$note = '') {
    if ($ok) { $script:pass++; Write-Output ('  PASS  ' + $claim) }
    else { $script:fail++; $script:failed += $claim; Write-Output ('  FAIL  ' + $claim + $(if ($note) { '  (' + $note + ')' } else { '' })) }
}

# ---------- the twin ----------

$raw = [IO.File]::ReadAllText($committed)
# JSON escapes each backslash, so the prefix appears doubled inside the file.
#
# PLAIN STRING Replace, NEVER -replace. This line used `-replace`, which is the REGEX operator:
# the pattern '\\' matches one backslash, but a .NET replacement string takes a backslash
# literally, so '\\\\' inserts FOUR. The probe searched for C:\\\\Users\\\\... while the file
# holds C:\\Users\\... , nothing matched, and the "twin" came out a byte-for-byte copy still
# carrying MAIN-checkout paths - two of which do not exist in main, so those entries pointed at
# nothing and the run proved nothing about them. The precheck below is what caught it.
$twinText = $raw.Replace($mainPrefix.Replace('\', '\\'), $repo.Replace('\', '\\'))
$twin = Join-Path $OutDir 'twin-settings.json'
[IO.File]::WriteAllText($twin, $twinText, (New-Object System.Text.UTF8Encoding($false)))

Write-Output 'SETTINGS PROOF PROBE'
Write-Output ('  committed : ' + $committed)
Write-Output ('  twin      : ' + $twin)
Write-Output ''

$twinJson = $null
try { $twinJson = ConvertFrom-Json $twinText } catch { }
Check 'the twin parses as JSON' ($null -ne $twinJson)

# Every command in the twin must point at a file that exists here, or the run proves nothing.
$allExist = $true
foreach ($ev in @('PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'UserPromptSubmit', 'SessionStart')) {
    foreach ($entry in $twinJson.hooks.$ev) {
        foreach ($h in $entry.hooks) {
            $m = [regex]::Match([string]$h.command, '"([^"]+)"')
            if ($m.Success -and -not (Test-Path $m.Groups[1].Value)) { $allExist = $false; Write-Output ('        missing: ' + $m.Groups[1].Value) }
        }
    }
}
Check 'every command in the twin points at a file that exists' $allExist

# ---------- synthetic window directories ----------

function New-WindowDir([string]$name, [scriptblock]$fill) {
    $d = Join-Path $OutDir ('windir-' + $name)
    New-Item -ItemType Directory -Force -Path $d | Out-Null
    Get-ChildItem $d | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
    & $fill $d
    return $d
}

. (Join-Path $repo 'loop\work\window-lib.ps1')

function Write-Synthetic([string]$dir, $pct, [double]$resetMin) {
    $snap = [ordered]@{
        capturedAt = (Get-Date).ToUniversalTime().ToString('o')
        sessionId  = 'settings-proof-probe'
        version    = 'settings-proof-probe'
        rateLimits = @{ five_hour = @{ used_percentage = $pct; resets_at = [DateTimeOffset]::UtcNow.AddMinutes($resetMin).ToUnixTimeSeconds() } }
    }
    # THE VERDICT IS COMPOSED FROM THE PRODUCTION SHAPE, NOT FROM THE HASHTABLE ABOVE. Every reader
    # in production gets its snapshot from ConvertFrom-Json, so it holds a PSCustomObject; this
    # file built one in memory and handed the library a Hashtable, and the line it composed named
    # the worst window "Values" instead of five_hour. A probe that mis-composes the very line it
    # exists to prove is worse than no probe, so the round trip through JSON happens FIRST and the
    # exact bytes written to disk are the bytes the verdict was computed from.
    $json = $snap | ConvertTo-Json -Depth 8
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText((Join-Path $dir 'window-verdict.txt'), ((Format-WindowVerdictLine (Get-WindowVerdict -Snapshot ($json | ConvertFrom-Json))) + "`n"), $utf8)
    [IO.File]::WriteAllText((Join-Path $dir 'rate-limits.json'), $json, $utf8)
}

$dirOver    = New-WindowDir 'over'    { param($d) Write-Synthetic $d 95 90 }
$dirUnknown = New-WindowDir 'unknown' { param($d) [IO.File]::WriteAllText((Join-Path $d 'rate-limits.json'), 'this is not json {{{') }

# ---------- running one headless case ----------

$work = Join-Path $OutDir 'work'
New-Item -ItemType Directory -Force -Path $work | Out-Null

function Invoke-Case([string]$name, [string]$windowDir, [string]$prompt) {
    $pf  = Join-Path $OutDir ($name + '.prompt.txt')
    $out = Join-Path $OutDir ($name + '.stream.jsonl')
    $err = Join-Path $OutDir ($name + '.stderr.log')
    [IO.File]::WriteAllText($pf, $prompt, (New-Object System.Text.UTF8Encoding($false)))

    # THE PROMPT GOES IN BY FILE. Inline quoted arguments mangled a nested payload during this
    # item's hook measurement, and a probe that fails on its own quoting proves nothing.
    $saved = $env:AI4GOOD_WINDOW_DIR
    $env:AI4GOOD_WINDOW_DIR = $windowDir
    $a = @('-p', '--settings', $twin, '--output-format', 'stream-json', '--verbose', '--permission-mode', $PermissionMode)
    $proc = Start-Process -FilePath $ClaudeBin -ArgumentList $a -WorkingDirectory $work `
        -RedirectStandardInput $pf -RedirectStandardOutput $out -RedirectStandardError $err `
        -NoNewWindow -PassThru
    if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
        try { $proc.Kill() } catch { }
        Write-Output ('        ' + $name + ': TIMED OUT after ' + $TimeoutSec + 's')
    }
    $env:AI4GOOD_WINDOW_DIR = $saved

    $text = ''
    if (Test-Path $out) { $text = [IO.File]::ReadAllText($out) }
    return [pscustomobject]@{ Name = $name; Text = $text; Out = $out; Err = $err }
}

# ---------- the four cases ----------

Write-Output ''
Write-Output '1. PreToolUse matched Agent, over the line -> the spawn is DENIED with its reason'
$c = Invoke-Case 'deny' $dirOver @'
Use the Agent tool once to spawn a general-purpose subagent whose entire task is to reply with the word hello. Do not use any other tool. If the spawn is refused, say REFUSED and stop; do not retry and do not work around it.
'@
Check 'the deny reached the model' ($c.Text -match 'WINDOW GUARD: no new work may start') ('see ' + $c.Out)
Check 'the deny reason names the window' ($c.Text -match 'five_hour')
Check 'the deny reason gives the percentage' ($c.Text -match '95%')
Check 'the deny reason gives the reset time' ($c.Text -match 'resets at \d\d:\d\d')
Check 'the deny reason carries the parking choreography' ($c.Text -match 'report PARKED')

Write-Output ''
Write-Output '2. PostToolUse, over the line -> the alarm is model-visible after a SUCCESSFUL tool call'
$c = Invoke-Case 'alarm-success' $dirOver @'
Run exactly one shell command that succeeds and prints the word ok. Do not use any other tool, and do not spawn anything. Then say DONE and stop.
'@
Check 'the alarm line reached the model after a successful call' ($c.Text -cmatch 'ALARM WINDOW') ('see ' + $c.Out)

Write-Output ''
Write-Output '3. PostToolUseFailure, over the line -> the alarm is model-visible after a FAILING tool call'
# A separate run with ONE deliberately failing call and nothing else, so an alarm in this
# transcript cannot have been delivered by the success event.
$c = Invoke-Case 'alarm-failure' $dirOver @'
Run exactly one shell command that is guaranteed to fail, by invoking a program that does not exist, for example: definitely-not-a-real-program-xyz. Run nothing else at all, do not retry, do not spawn anything. Then say DONE and stop.
'@
$failureRunHadAlarm = ($c.Text -cmatch 'ALARM WINDOW')
Check 'the alarm line reached the model after a failing call (PostToolUseFailure is dispatched)' $failureRunHadAlarm ('see ' + $c.Out)
if (-not $failureRunHadAlarm) {
    Write-Output '        CONTINGENCY (ruled in advance): if the installed version does not dispatch'
    Write-Output '        PostToolUseFailure, drop that ONE settings entry, keep everything else, and record'
    Write-Output '        the residual gap - an actor whose calls all fail still hears the alarm at its next'
    Write-Output '        successful call, its next spawn attempt, or the founder next prompt stamp.'
}

Write-Output ''
Write-Output '4. UNKNOWN -> the spawn is ALLOWED and the warning is visible to the model'
$c = Invoke-Case 'unknown' $dirUnknown @'
Use the Agent tool once to spawn a general-purpose subagent whose entire task is to reply with the word hello. Then repeat back, word for word, any system or tool text you received about the usage window. Then stop.
'@
$notDenied = -not ($c.Text -match 'WINDOW GUARD: no new work may start')
Check 'an unreadable sensor does not halt spawns' $notDenied ('see ' + $c.Out)
$warnVisible = ($c.Text -match 'the usage-window sensor is UNKNOWN')
Check 'and the warning is visible in the transcript (additionalContext reaches the model)' $warnVisible ('see ' + $c.Out)
if (-not $warnVisible) {
    Write-Output '        CONTINGENCY (ruled in advance): if additionalContext proves invisible on an allow in'
    Write-Output '        the installed version, fall back to systemMessage only and record the reduced'
    Write-Output '        guarantee in goal-evidence.md - honestly, not silently.'
}

# ---------- 5. the stamp ----------
#
# The UserPromptSubmit entry is an EDIT to an already-wired hook, and no UserPromptSubmit event
# appeared in any subagent log during this item's hook measurement. If the headless run fired it,
# the transcript shows the line; otherwise the entry is asserted by direct invocation and THAT
# limit is recorded rather than papered over.
#
# IT GETS ITS OWN RUN, OVER THE LINE. This check used to read $c, which at this point still held
# case 4 - the UNKNOWN case, whose window directory is deliberately unparseable JSON. A correct
# stamp CANNOT emit WINDOW ALARM for that directory, so the headless branch was false by
# construction, the fallback always ran, and "UserPromptSubmit may not fire headless" would have
# been recorded as measured when it was never tested. A limit is only recordable from a run that
# COULD have produced the line.

Write-Output ''
Write-Output '5. UserPromptSubmit -> the founder-facing WINDOW ALARM line'
$c = Invoke-Case 'stamp' $dirOver @'
Say READY and stop. Do not use any tool at all.
'@
$headlessStamp = ($c.Text -match 'WINDOW ALARM')
if ($headlessStamp) {
    Check 'the stamp alarm appeared in the headless transcript' $true
}
else {
    Write-Output '        no WINDOW ALARM in the headless transcript - UserPromptSubmit may not fire headless.'
    Write-Output '        Asserting the entry by direct invocation instead, and recording that limit.'
    $sp = Join-Path $OutDir 'stamp.in.json'
    [IO.File]::WriteAllText($sp, '{"hook_event_name":"UserPromptSubmit","prompt":"probe"}')
    $so = Join-Path $OutDir 'stamp.out.txt'
    $se = Join-Path $OutDir 'stamp.err.txt'
    $saved = $env:AI4GOOD_WINDOW_DIR
    $env:AI4GOOD_WINDOW_DIR = $dirOver
    Start-Process -FilePath 'powershell' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repo 'loop\work\stamp-hook.ps1')) `
        -WorkingDirectory $repo -RedirectStandardInput $sp -RedirectStandardOutput $so -RedirectStandardError $se `
        -NoNewWindow -Wait | Out-Null
    $env:AI4GOOD_WINDOW_DIR = $saved
    $stampText = ''
    if (Test-Path $so) { $stampText = [IO.File]::ReadAllText($so) }
    Check 'the stamp emits the WINDOW ALARM line when invoked directly' ($stampText -match 'WINDOW ALARM') ('see ' + $so)
}

Write-Output ''
Write-Output ('RESULT: {0} passed, {1} failed' -f $pass, $fail)
Write-Output ('Raw transcripts kept in ' + $OutDir + ' - they are the evidence, this summary is only a reading of them.')
if ($fail -gt 0) {
    Write-Output ''
    Write-Output 'failed:'
    foreach ($f in $failed) { Write-Output ('  - ' + $f) }
    exit 1
}
exit 0
