# window-watchdog-drill.ps1 - drive the whole usage-window watchdog against synthetic readings.
#
# WHAT IS UNDER TEST. Four parts that must agree, and today can only be trusted together:
#   the SENSOR   loop/work/statusline.ps1   - writes the snapshot and the one-line verdict
#   the GATE     loop/work/window-gate.ps1  - PreToolUse on the Agent tool: denies a spawn at the line
#   the ALARM    loop/work/window-alarm.cmd - PostToolUse on every tool: exit 2 puts the line in front of the model
#   the STAMP    loop/work/stamp-hook.ps1   - UserPromptSubmit: the founder sees it on every prompt
#
# IT NEVER TOUCHES THE LIVE READING. Everything runs against AI4GOOD_WINDOW_DIR pointed at a fresh
# temporary directory, and the first assertion of the run proves that directory is not the live
# one. A drill that could write the founder's snapshot would be able to park real work.
#
# HOOK INPUT ARRIVES BY FILE, NEVER AS A QUOTED ARGUMENT. PowerShell native-argument quoting
# mangled a nested JSON prompt during this item's own hook measurement, and a drill that fails
# because of its own quoting teaches nothing. Every hook is started with Start-Process and its
# stdin redirected from a file on disk.
#
# NOTHING HERE COSTS A TOKEN. Every reading is synthetic, and the whole run is a few seconds.
#
# Run: powershell -NoProfile -File loop/drills/window-watchdog-drill.ps1
# Exit 0 when every assertion holds, 1 on any red.

$ErrorActionPreference = 'SilentlyContinue'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = (Resolve-Path (Join-Path $here '..\..')).Path
$work = Join-Path $repo 'loop\work'

$lib       = Join-Path $work 'window-lib.ps1'
$sensor    = Join-Path $work 'statusline.ps1'
$gate      = Join-Path $work 'window-gate.ps1'
$alarm     = Join-Path $work 'window-alarm.cmd'
$stamp     = Join-Path $work 'stamp-hook.ps1'

$run = Join-Path $env:TEMP ('window-watchdog-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $run | Out-Null
$winDir = Join-Path $run 'windowdir'
New-Item -ItemType Directory -Force -Path $winDir | Out-Null
$io = Join-Path $run 'io'
New-Item -ItemType Directory -Force -Path $io | Out-Null

$env:AI4GOOD_WINDOW_DIR = $winDir

$snapFile    = Join-Path $winDir 'rate-limits.json'
$verdictFile = Join-Path $winDir 'window-verdict.txt'

$pass = 0; $fail = 0; $failed = @()
function Assert([string]$group, [string]$claim, [bool]$ok) {
    if ($ok) { $script:pass++; Write-Output ('  PASS  [{0}] {1}' -f $group, $claim) }
    else { $script:fail++; $script:failed += ('[' + $group + '] ' + $claim); Write-Output ('  FAIL  [{0}] {1}' -f $group, $claim) }
}

# ---------- driving the pieces ----------

$seq = 0
function New-IoPair([string]$tag) {
    $script:seq++
    $n = '{0:d3}-{1}' -f $script:seq, $tag
    return [pscustomobject]@{
        In  = (Join-Path $io ($n + '.in.json'))
        Out = (Join-Path $io ($n + '.out.txt'))
        Err = (Join-Path $io ($n + '.err.txt'))
    }
}

# Every hook is a real child process with real redirected stdin - the deployment shape, not an
# in-process call that could pass while the deployed command fails.
function Start-Hook([string]$script, [pscustomobject]$p) {
    # A missing script is a RED, never a crash. This drill is written before the machinery it
    # tests, so "not built yet" has to read as a failed assertion with a name, not as a run that
    # stops halfway and reports nothing.
    if (-not (Test-Path $script)) {
        [IO.File]::WriteAllText($p.Out, ''); [IO.File]::WriteAllText($p.Err, ('missing: ' + $script))
        return 127
    }
    $a = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $script)
    $proc = Start-Process -FilePath 'powershell' -ArgumentList $a -WorkingDirectory $repo `
        -RedirectStandardInput $p.In -RedirectStandardOutput $p.Out -RedirectStandardError $p.Err `
        -NoNewWindow -Wait -PassThru
    return $proc.ExitCode
}

function Write-Payload([string]$path, $obj) {
    [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Depth 8), (New-Object System.Text.UTF8Encoding($false)))
}

# THE SENSOR, as Claude Code runs it: a status-line payload on stdin, rate_limits inside it.
function Invoke-Sensor([hashtable]$windows) {
    $p = New-IoPair 'sensor'
    Write-Payload $p.In @{
        session_id     = 'window-watchdog-drill'
        version        = 'window-watchdog-drill'
        model          = @{ display_name = 'drill' }
        workspace      = @{ current_dir = $repo }
        context_window = @{ used_percentage = 10 }
        rate_limits    = $windows
    }
    return (Start-Hook $sensor $p)
}

# THE GATE, as PreToolUse sees an Agent spawn. Returns the decision, the reason, the model-visible
# context, the user-facing message, the raw stdout and the exit code.
function Invoke-Gate() {
    $p = New-IoPair 'gate'
    Write-Payload $p.In @{
        session_id      = 'drill'
        cwd             = $repo
        hook_event_name = 'PreToolUse'
        tool_name       = 'Agent'
        tool_input      = @{ subagent_type = 'executor'; description = 'drill spawn' }
    }
    $code = Start-Hook $gate $p
    $raw = ''
    if (Test-Path $p.Out) { $raw = [IO.File]::ReadAllText($p.Out) }
    $j = $null
    if ($raw.Trim()) { try { $j = ConvertFrom-Json $raw } catch { } }
    return [pscustomobject]@{
        Exit     = $code
        Raw      = $raw
        Decision = $(if ($j) { [string]$j.hookSpecificOutput.permissionDecision } else { '' })
        Reason   = $(if ($j) { [string]$j.hookSpecificOutput.permissionDecisionReason } else { '' })
        Context  = $(if ($j) { [string]$j.hookSpecificOutput.additionalContext } else { '' })
        UserMsg  = $(if ($j) { [string]$j.systemMessage } else { '' })
    }
}

# THE ALARM, as PostToolUse runs it: a batch file, no stdin needed, exit 2 + stderr is the channel.
function Invoke-Alarm() {
    $p = New-IoPair 'alarm'
    [IO.File]::WriteAllText($p.In, '')
    if (-not (Test-Path $alarm)) {
        return [pscustomobject]@{ Exit = 127; Err = ('not built: ' + $alarm); Out = '' }
    }
    $proc = Start-Process -FilePath $alarm -WorkingDirectory $repo `
        -RedirectStandardInput $p.In -RedirectStandardOutput $p.Out -RedirectStandardError $p.Err `
        -NoNewWindow -Wait -PassThru
    $err = ''
    if (Test-Path $p.Err) { $err = [IO.File]::ReadAllText($p.Err) }
    $out = ''
    if (Test-Path $p.Out) { $out = [IO.File]::ReadAllText($p.Out) }
    return [pscustomobject]@{ Exit = $proc.ExitCode; Err = $err; Out = $out }
}

# THE STAMP. No session_id in the payload on purpose: that skips the session freshness baseline,
# so the drill writes nothing into the real session state directory.
function Invoke-Stamp() {
    $p = New-IoPair 'stamp'
    Write-Payload $p.In @{ hook_event_name = 'UserPromptSubmit'; prompt = 'drill' }
    $code = Start-Hook $stamp $p
    $out = ''
    if (Test-Path $p.Out) { $out = [IO.File]::ReadAllText($p.Out) }
    return [pscustomobject]@{ Exit = $code; Out = $out }
}

# ---------- synthetic readings written straight to disk ----------
#
# The sensor always stamps capturedAt with the moment it ran, so a STALE reading cannot be
# produced through it. Those cases are written here directly, in the shape the sensor writes.

function Set-Snapshot([hashtable]$windows, [double]$ageMinutes = 0) {
    $o = [ordered]@{
        capturedAt = (Get-Date).ToUniversalTime().AddMinutes(-$ageMinutes).ToString('o')
        sessionId  = 'window-watchdog-drill'
        version    = 'window-watchdog-drill'
        rateLimits = $windows
    }
    [IO.File]::WriteAllText($snapFile, ($o | ConvertTo-Json -Depth 8), (New-Object System.Text.UTF8Encoding($false)))
}
function Set-VerdictLine([string]$line) {
    $script:drillLines += $line
    [IO.File]::WriteAllText($verdictFile, ($line + "`n"), (New-Object System.Text.UTF8Encoding($false)))
}
# EVERY VERDICT LINE THIS RUN PRODUCES IS REMEMBERED. The closing live-directory check needs to
# know what this drill's own output looks like, because the live verdict file carries no sessionId
# to match on the way the snapshot does.
$script:drillLines = @()
function Get-VerdictLine() {
    if (-not (Test-Path $verdictFile)) { return '' }
    $t = [IO.File]::ReadAllText($verdictFile)
    $l = (($t -split "`n")[0]).TrimEnd("`r")
    if ($l) { $script:drillLines += $l }
    return $l
}
function W($pct, [double]$resetInMinutes) {
    @{ used_percentage = $pct; resets_at = [DateTimeOffset]::UtcNow.AddMinutes($resetInMinutes).ToUnixTimeSeconds() }
}

try {
    Write-Output 'WINDOW WATCHDOG DRILL (synthetic readings, the live snapshot is never touched)'
    Write-Output ''

    # ---------------------------------------------------------------- group 0: the safety rail
    Write-Output 'guard - the drill cannot reach the live reading'
    # THE LIVE PATH IS SPELLED OUT HERE ON PURPOSE, and it must stay spelled out: a canary that
    # asked window-lib.ps1 where the live directory is would fingerprint whatever the library
    # believes, and a wrong belief in the library is exactly the failure this canary exists to
    # catch - it is the failure that already happened on this drill's first run.
    $live = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good')).TrimEnd('\')
    $mine = [IO.Path]::GetFullPath($winDir).TrimEnd('\')
    Assert 'guard' 'the drill directory is not the live snapshot directory' `
        (-not $mine.Equals($live, [StringComparison]::OrdinalIgnoreCase))
    Assert 'guard' 'the override is actually set for every child process' ($env:AI4GOOD_WINDOW_DIR -eq $winDir)

    # A SENSOR THAT BUILDS ITS OWN PATH IGNORES THE OVERRIDE, and then this drill writes a
    # synthetic 95% into the founder's live reading and can park real work. That happened on this
    # drill's very first run, before the sensor honoured the override. Two guards, because the
    # damage is done by the time a behavioural check can see it:
    #   - static: the sensor must take its path from the library, never spell one out;
    #   - live canary: the live file is fingerprinted here and re-checked the moment the sensor
    #     has run once, and a change ABORTS the run instead of continuing to write.
    $sensorText = [IO.File]::ReadAllText($sensor)
    Assert 'guard' 'the sensor takes its path from the library rather than spelling one out' `
        (-not ($sensorText -match 'ai4good-build'))

    # The canary is the drill's own MARKER, not a timestamp: the founder's session refreshes the
    # live file on every turn of its own accord, so "the file changed" proves nothing. Every
    # payload this drill sends carries sessionId 'window-watchdog-drill', and that string in the
    # live file can only have come from here.
    function Test-LiveContaminated() {
        $f = Join-Path $env:LOCALAPPDATA 'ai4good-build\nirdrang-ai4good\rate-limits.json'
        if (-not (Test-Path $f)) { return $false }
        return ([IO.File]::ReadAllText($f) -match 'window-watchdog-drill')
    }

    # AND THE SECOND FILE, WHICH THE MARKER CANNOT COVER. The sensor writes two files, and the
    # verdict file is the one the per-tool alarm reads - a synthetic ALARM line there would fire
    # the alarm in every session on this machine until something overwrote it. It carries no
    # sessionId, so it is covered by a fingerprint taken before anything runs and compared at the
    # end. Existence, hash and last-write, for both files.
    function Get-LiveFingerprint() {
        $o = @{}
        foreach ($n in @('rate-limits.json', 'window-verdict.txt')) {
            $f = Join-Path $live $n
            if (Test-Path $f) {
                $o[$n] = [pscustomobject]@{
                    Exists    = $true
                    Hash      = (Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash
                    LastWrite = (Get-Item -LiteralPath $f).LastWriteTimeUtc
                    Text      = [IO.File]::ReadAllText($f)
                }
            }
            else {
                $o[$n] = [pscustomobject]@{ Exists = $false; Hash = ''; LastWrite = $null; Text = '' }
            }
        }
        return $o
    }
    $liveBefore = Get-LiveFingerprint

    # ---------------------------------------------------------------- group 1: over the line
    Write-Output ''
    Write-Output '1. a reading at or over the line - every checkpoint must speak'
    Invoke-Sensor @{ five_hour = (W 95 90); seven_day = (W 30 5000) } | Out-Null

    $liveIntact = ((Test-Path $snapFile) -and (-not (Test-LiveContaminated)))
    Assert 'guard' 'the sensor wrote into the drill directory and left the live reading alone' $liveIntact
    if (-not $liveIntact) {
        Write-Output ''
        Write-Output 'ABORTING: the sensor ignored AI4GOOD_WINDOW_DIR and wrote the LIVE snapshot.'
        Write-Output 'A synthetic reading in the live file can park real work. Fix the sensor first.'
        Write-Output ('RESULT: {0} passed, {1} failed' -f $pass, $fail)
        exit 1
    }

    Assert 'g1' 'the sensor wrote a snapshot' (Test-Path $snapFile)
    Assert 'g1' 'the sensor wrote a verdict file' (Test-Path $verdictFile)
    $line = Get-VerdictLine
    Assert 'g1' 'the verdict line is a single ALARM line' ($line -like 'ALARM *')
    Assert 'g1' 'the verdict line names the window, the level and the reset' `
        (($line -match 'five_hour') -and ($line -match '95%') -and ($line -match 'resets \d\d:\d\d'))
    Assert 'g1' 'the verdict line carries the parking instruction the model will hear' ($line -match 'commit, park')

    $g = Invoke-Gate
    Assert 'g1' 'the gate DENIES the spawn' ($g.Decision -eq 'deny')
    Assert 'g1' 'the deny reason names the window' ($g.Reason -match 'five_hour')
    Assert 'g1' 'the deny reason gives the percentage' ($g.Reason -match '95%')
    Assert 'g1' 'the deny reason gives the reset time' ($g.Reason -match '\d\d:\d\d')
    Assert 'g1' 'the deny reason carries the parking choreography, so no contract has to remember it' `
        (($g.Reason -match '(?i)report') -and ($g.Reason -match '(?i)park') -and ($g.Reason -match '(?i)commit'))
    Assert 'g1' 'a denying gate still exits 0 - the decision is the JSON, not the exit code' ($g.Exit -eq 0)

    $a = Invoke-Alarm
    Assert 'g1' 'the alarm exits 2, which is what puts it in front of the model' ($a.Exit -eq 2)
    # Case-sensitive on purpose: the anchor is the shouted pair the sensor composes, and a lax
    # match happily accepted this drill's own "not built" sentinel, which names the alarm's file.
    Assert 'g1' 'the alarm puts the ALARM WINDOW line on stderr' ($a.Err -cmatch 'ALARM WINDOW')
    Assert 'g1' 'the alarm echoes the sensor line verbatim, it does not compose its own' `
        ($a.Err.Trim() -eq $line)

    $s = Invoke-Stamp
    Assert 'g1' 'the stamp carries a WINDOW ALARM line for the founder' ($s.Out -match 'WINDOW ALARM')
    # THE PREFIX REWRITE, PINNED WHERE IT COMES OUT. stamp-hook.ps1 strips the library's leading
    # 'ALARM WINDOW ' and prints its own 'WINDOW ALARM' prefix instead. Nothing pinned that
    # coupling, and a one character drift on either side either double-prints the founder's alarm
    # or leaves it half-printed. window-sim.ps1 pins the library's half; this pins the output.
    Assert 'g1' 'the founder line says WINDOW ALARM exactly once' `
        (([regex]::Matches($s.Out, 'WINDOW ALARM')).Count -eq 1)
    Assert 'g1' 'and no ALARM WINDOW survives the prefix rewrite' (-not ($s.Out -cmatch 'ALARM WINDOW'))
    Assert 'g1' 'the stamp still prints its two standard lines' `
        (($s.Out -match 'WORKING ON') -and ($s.Out -match 'IN  '))

    # ---------------------------------------------------------------- group 2: under the line
    Write-Output ''
    Write-Output '2. a reading under the line - every checkpoint must stay quiet'
    Invoke-Sensor @{ five_hour = (W 40 90); seven_day = (W 30 5000) } | Out-Null
    $line2 = Get-VerdictLine
    Assert 'g2' 'the verdict line is exactly OK' ($line2 -eq 'OK')

    $g = Invoke-Gate
    Assert 'g2' 'the gate allows the spawn' ($g.Decision -ne 'deny')
    Assert 'g2' 'the gate says nothing at all when the answer is OK' ($g.Raw.Trim() -eq '')
    Assert 'g2' 'the gate exits 0' ($g.Exit -eq 0)

    $a = Invoke-Alarm
    Assert 'g2' 'the alarm exits 0' ($a.Exit -eq 0)
    Assert 'g2' 'the alarm says nothing - it is paid on every tool call in the system' `
        (($a.Err.Trim() -eq '') -and ($a.Out.Trim() -eq ''))

    $s = Invoke-Stamp
    Assert 'g2' 'the stamp carries no alarm line' (-not ($s.Out -match 'WINDOW ALARM'))
    Assert 'g2' 'the stamp carries no sensor warning either' (-not ($s.Out -match 'sensor cannot be trusted'))

    # ---------------------------------------------------------------- group 3: staleness
    Write-Output ''
    Write-Output '3. a reading nothing has refreshed - a stale reading is not a low reading'

    # STALE AND OVER THE LINE, the window not yet reset. Inside one window the figure only climbs,
    # so the old number still proves the level. Parking is evidenced, not cautious.
    Set-Snapshot @{ five_hour = (W 97 100) } 60
    Set-VerdictLine 'ALARM WINDOW five_hour at 97% (line 85%), resets 20:00 - finish the current work item, commit, park.'
    $g = Invoke-Gate
    Assert 'g3' 'stale, over the line, window not yet reset -> the gate still DENIES' ($g.Decision -eq 'deny')
    Assert 'g3' 'and it says the reading is old rather than hiding it' ($g.Reason -match '(?i)min old')
    $s = Invoke-Stamp
    Assert 'g3' 'and the founder still sees the alarm' ($s.Out -match 'WINDOW ALARM')
    $a = Invoke-Alarm
    Assert 'g3' 'and the alarm still fires' ($a.Exit -eq 2)

    # STALE AND UNDER THE LINE. The old number proves nothing - it may have climbed since. UNKNOWN
    # reports loudly and does NOT halt (shared invariant), so the spawn proceeds with a warning.
    Set-Snapshot @{ five_hour = (W 40 100) } 60
    Set-VerdictLine 'OK'
    $g = Invoke-Gate
    Assert 'g3' 'stale and under the line -> the gate ALLOWS, it never halts on a broken instrument' ($g.Decision -ne 'deny')
    Assert 'g3' 'but it warns the spawning model, in the model-visible channel' `
        (($g.Context -match '(?i)unknown') -or ($g.Context -match '(?i)sensor'))
    Assert 'g3' 'and it warns the user too' ($g.UserMsg -match '(?i)window')
    $s = Invoke-Stamp
    Assert 'g3' 'the founder is told the sensor cannot be trusted, and that nothing is halted' `
        (($s.Out -match 'sensor cannot be trusted') -and ($s.Out -match '(?i)not halting'))
    Assert 'g3' 'and the stamp does NOT cry alarm on an unknown reading' (-not ($s.Out -match 'WINDOW ALARM'))
    # THE ALARM'S KNOWN BLIND SPOT, asserted rather than claimed: it is the one dumb reader, so a
    # sensor that died an hour ago leaves it echoing the last line it wrote. The exposure is
    # bounded by the two computing checkpoints above, which both report the staleness loudly.
    $a = Invoke-Alarm
    Assert 'g3' 'the per-tool alarm stays silent on a stale OK - bounded, and covered by gate and stamp' ($a.Exit -eq 0)

    # ---------------------------------------------------------------- group 4: consistency, faults
    Write-Output ''
    Write-Output '4. the verdict file agrees with the library, and the write envelope holds'

    . $lib

    foreach ($case in @(
            @{ name = 'over the line'; win = @{ five_hour = (W 95 90) } },
            @{ name = 'under the line'; win = @{ five_hour = (W 40 90) } },
            @{ name = 'exactly on the line'; win = @{ five_hour = (W 85 90) } },
            @{ name = 'a weekly window blocking'; win = @{ five_hour = (W 10 90); seven_day = (W 92 5000) } })) {
        Invoke-Sensor $case.win | Out-Null
        $written = Get-VerdictLine
        $recomputed = Format-WindowVerdictLine (Get-WindowVerdict -SnapshotPath $snapFile)
        Assert 'g4' ('the line the sensor wrote is the line the library composes - ' + $case.name) `
            ($written -eq $recomputed)

        $expectAlarm = $written -like 'ALARM *'
        $g = Invoke-Gate
        $a = Invoke-Alarm
        Assert 'g4' ('gate and alarm both agree with that line - ' + $case.name) `
            (((($g.Decision -eq 'deny')) -eq $expectAlarm) -and (($a.Exit -eq 2) -eq $expectAlarm))
    }

    # FAULT (a) - THE COUPLED WRITE ENVELOPE. The verdict is written first and the snapshot second,
    # inside ONE try block, so a verdict-write failure also skips the snapshot write. That is what
    # makes "a snapshot at 95% beside a stuck OK verdict" impossible by construction rather than by
    # hope. The fault: the verdict PATH is a directory, so writing it can only fail.
    Write-Output ''
    Write-Output '   fault injection'
    Remove-Item $verdictFile -Force -ErrorAction SilentlyContinue
    Remove-Item $snapFile -Force -ErrorAction SilentlyContinue
    Invoke-Sensor @{ five_hour = (W 20 90) } | Out-Null      # a healthy refresh first
    $beforeSnap = [IO.File]::ReadAllText($snapFile)
    Remove-Item $verdictFile -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $verdictFile | Out-Null
    Start-Sleep -Milliseconds 1100                            # so a rewrite would move the timestamp
    $code = Invoke-Sensor @{ five_hour = (W 96 90) }          # would be an ALARM if it got through
    Assert 'g4' 'the sensor survives a verdict write it cannot do' ($code -eq 0)
    $afterSnap = [IO.File]::ReadAllText($snapFile)
    Assert 'g4' 'a failed verdict write also skips the snapshot write - the envelope is one, not two' `
        ($afterSnap -eq $beforeSnap)
    Assert 'g4' 'so no snapshot over the line can ever sit beside an older verdict' `
        (($afterSnap -match '"used_percentage":\s*20') -and (-not ($afterSnap -match '"used_percentage":\s*96')))
    Remove-Item $verdictFile -Recurse -Force -ErrorAction SilentlyContinue

    # FAULT (b) - A CORRUPT SNAPSHOT. The instrument is broken, not the window spent. UNKNOWN
    # reports loudly and halts nothing; the per-tool alarm stays quiet because a running subagent
    # can neither act on it nor fix it, and it would otherwise fire on every tool call in the
    # system for as long as the sensor is down.
    [IO.File]::WriteAllText($snapFile, 'this is not json {{{')
    Remove-Item $verdictFile -Force -ErrorAction SilentlyContinue
    $g = Invoke-Gate
    Assert 'g4' 'a corrupt snapshot does not halt spawns' ($g.Decision -ne 'deny')
    Assert 'g4' 'but the spawning model is told the sensor is unreadable' `
        (($g.Context -match '(?i)unknown') -or ($g.Context -match '(?i)sensor'))
    $s = Invoke-Stamp
    Assert 'g4' 'and the founder is told, on the prompt, without being halted' `
        (($s.Out -match 'sensor cannot be trusted') -and ($s.Out -match '(?i)not halting'))

    # THE ALARM HAS TWO SILENT PATHS AND THEY ARE NOT THE SAME PATH. This one is the MISSING FILE:
    # window-alarm.cmd exits 0 before it reads anything. It is a real state and it is asserted
    # here, labelled as itself.
    $a = Invoke-Alarm
    Assert 'g4' 'with no verdict file at all the alarm is silent - the missing-file path' ($a.Exit -eq 0)

    # AND NOW THE STATE PRODUCTION ACTUALLY REACHES. A broken sensor does not leave the verdict
    # file missing: the next refresh writes an UNKNOWN LINE into it, and THAT is the silence the
    # decision speaks about (shared-invariants - the per-tool alarm stays silent on UNKNOWN,
    # because a running subagent can neither act on it nor fix it). This drill used to delete the
    # file and then claim the decision, proving a different branch of the batch file entirely.
    # The payload here carries no rate_limits at all, which is how a real build that stopped
    # reporting windows looks.
    Invoke-Sensor $null | Out-Null
    $uline = Get-VerdictLine
    Assert 'g4' 'a broken sensor writes an UNKNOWN verdict LINE rather than leaving the file missing' `
        ((Test-Path $verdictFile) -and ($uline -like 'UNKNOWN *'))
    $a = Invoke-Alarm
    Assert 'g4' 'and the per-tool alarm stays silent on that UNKNOWN LINE, as decided' ($a.Exit -eq 0)
    $g = Invoke-Gate
    Assert 'g4' 'while the gate still says it loudly and allows the spawn' `
        (($g.Decision -ne 'deny') -and (($g.Context -match '(?i)unknown') -or ($g.Context -match '(?i)sensor')))

    # FAULT (c) - CONTENTION ON THE SENSOR PAIR. Two status-line refreshes are two processes, and
    # the verdict and the snapshot must be ONE act across them, or an interleave leaves a high
    # snapshot beside an older OK verdict. Deterministic, never a race: this drill takes the very
    # mutex the sensor takes, runs the sensor, and the sensor must leave the pair exactly as it
    # found it rather than write half of it.
    #
    # The name is Global on purpose - it is account-wide state, written by every session on this
    # machine. While the drill holds it the founder's own status line skips at most one refresh,
    # which is the designed degradation and heals on the next turn.
    Write-Output ''
    Write-Output '   contention'
    Remove-Item $verdictFile -Force -ErrorAction SilentlyContinue
    Remove-Item $snapFile -Force -ErrorAction SilentlyContinue
    Invoke-Sensor @{ five_hour = (W 30 90) } | Out-Null
    $snapBefore2 = [IO.File]::ReadAllText($snapFile)
    $verdictBefore2 = [IO.File]::ReadAllText($verdictFile)

    $mtx = New-Object System.Threading.Mutex($false, 'Global\ai4good-window-sensor')
    $wasHeld = $false
    try { $wasHeld = $mtx.WaitOne(2000) } catch [System.Threading.AbandonedMutexException] { $wasHeld = $true }
    Assert 'g4' 'the drill can take the sensor mutex, so this case really does test contention' $wasHeld
    $code = Invoke-Sensor @{ five_hour = (W 97 90) }          # would be an ALARM if it got through
    $snapDuring = [IO.File]::ReadAllText($snapFile)
    $verdictDuring = [IO.File]::ReadAllText($verdictFile)
    if ($wasHeld) { try { $mtx.ReleaseMutex() } catch { } }
    try { $mtx.Dispose() } catch { }

    Assert 'g4' 'a status line that cannot take the lock still exits 0' ($code -eq 0)
    Assert 'g4' 'and it writes NEITHER file, rather than half the pair' `
        (($snapDuring -eq $snapBefore2) -and ($verdictDuring -eq $verdictBefore2))

    Invoke-Sensor @{ five_hour = (W 97 90) } | Out-Null
    Assert 'g4' 'once the lock is free the pair updates together' `
        (([IO.File]::ReadAllText($snapFile) -ne $snapBefore2) -and ((Get-VerdictLine) -like 'ALARM *'))

    # AND THE LIVE READING WAS NEVER TOUCHED - measured against the fingerprint, not asserted.
    #
    # The old closing check only re-read the environment variable, which says nothing whatsoever
    # about writes. The incident this item actually had was a synthetic 95% reaching the live
    # snapshot, so the weakest guard in the drill sat on the exact failure that occurred.
    #
    # A CHANGED FILE CANNOT BE RED BY ITSELF. The founder session rewrites both live files on every
    # turn of its own accord, so "it changed" proves nothing while this drill runs. Red is content
    # that can only have come from HERE: the sessionId marker in the snapshot, or an ALARM line
    # this run produced sitting in the live verdict file. Two things this deliberately does NOT
    # call red, and says so rather than hiding it: a live 'OK' line (every healthy sensor writes
    # that exact line) and a live UNKNOWN line (a genuinely broken live sensor writes one, and it
    # halts nothing). The ALARM lines are the ones that can park real work.
    $liveAfter = Get-LiveFingerprint
    $stillThere = $true
    $isMine = $false
    $changed = @()
    foreach ($n in @('rate-limits.json', 'window-verdict.txt')) {
        if ($liveBefore[$n].Exists -and (-not $liveAfter[$n].Exists)) { $stillThere = $false }
        if ($liveBefore[$n].Hash -ne $liveAfter[$n].Hash) { $changed += $n }
        if ($liveAfter[$n].Text -match 'window-watchdog-drill') { $isMine = $true }
        foreach ($l in $script:drillLines) {
            if (($l -like 'ALARM *') -and ($liveAfter[$n].Text.Trim() -eq $l.Trim())) { $isMine = $true }
        }
    }
    Assert 'guard' 'both live files still exist - this drill deleted nothing out there' $stillThere
    Assert 'guard' 'no live file carries anything this drill wrote' (-not $isMine)
    Assert 'guard' 'the override was still in force at the end of the run' ($env:AI4GOOD_WINDOW_DIR -eq $winDir)
    if ($changed.Count -gt 0) {
        Write-Output ('        note: the live ' + ($changed -join ' and ') + ' changed during this run and carries none of this drill content - that is the founder session refreshing it, which it does every turn.')
    }

    Write-Output ''
    Write-Output ('RESULT: {0} passed, {1} failed' -f $pass, $fail)
    if ($fail -gt 0) {
        Write-Output ''
        Write-Output 'failed:'
        foreach ($f in $failed) { Write-Output ('  - ' + $f) }
        exit 1
    }
    Write-Output 'The window watchdog held at every checkpoint.'
    exit 0
}
finally {
    $env:AI4GOOD_WINDOW_DIR = $null
    Remove-Item -Recurse -Force $run -ErrorAction SilentlyContinue
}
