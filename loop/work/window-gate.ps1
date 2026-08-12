# window-gate.ps1 - PreToolUse on the Agent tool: no NEW work starts once the window is spent.
#
# WHY THE SPAWN BOUNDARY. The line is 85 percent (founder 2026-08-12), and running work is never
# interrupted - a sitting killed mid-write leaves a record that lies about where the work got to.
# So the one place to act is the moment somebody tries to start something NEW, and in this relay
# every new thing is an Agent spawn: coordinator to conductor, conductor to sitting, conductor to
# reviewer-runner, orchestrator to executor and to mechanical. One hook entry covers every one of
# them. Measured for this item: PreToolUse fires for Agent calls made INSIDE a spawned agent, and
# the deny reason reaches the denied actor transcript.
#
# THIS DECIDES NOTHING. The founder set the line; the coordinator owns every judgement about work.
# This is the same class of machinery as the prompt stamp: it applies a standing decision
# mechanically, at the moment it bites, and it is deliberately incapable of anything else. It
# cannot stop running work, it cannot message anyone, and it cannot be turned off by the actor it
# denies.
#
# THE DENY REASON CARRIES THE CHOREOGRAPHY. The reason string reaches the model that tried to
# spawn, so it says what to do: write state, commit, push, report PARKED to your spawner, end.
# Putting it here rather than in five role contracts means the instruction arrives at the moment
# it is needed, and cannot drift between contracts.
#
# IT COMPUTES, IT DOES NOT READ THE VERDICT LINE. A spawn is rare, so the full gauge logic is
# affordable here, and this is the one checkpoint that must never act on a stale composition. The
# per-tool alarm is the dumb reader; this is not.
#
# FAILURE IS OPEN, BUT NEVER MUTE. A broken guard must not stop spawns - that would halt the whole
# relay over a bug in a guard. But it says so, in both channels, so a guard that has quietly
# stopped guarding cannot look exactly like a clear window.
#
# Contract: PreToolUse, matcher Agent. Exit 0 always; the decision is the JSON on stdout.

$ErrorActionPreference = 'SilentlyContinue'

# additionalContext is the MODEL-visible field on an allow; systemMessage is shown to the USER.
# Both are emitted for a warning, because the two readers can act on different things: the model
# can hold off on more work, the founder can fix the sensor.
function Write-Decision([string]$decision, [string]$reason, [string]$context, [string]$userMessage) {
    $hso = [ordered]@{
        hookEventName          = 'PreToolUse'
        permissionDecision     = $decision
        permissionDecisionReason = $reason
    }
    if ($context) { $hso['additionalContext'] = $context }
    $out = [ordered]@{ hookSpecificOutput = $hso }
    if ($userMessage) { $out['systemMessage'] = $userMessage }
    Write-Output ($out | ConvertTo-Json -Depth 6 -Compress)
}

try {
    # Drain stdin so the caller pipe is never left waiting. The payload is not needed: the matcher
    # already selected the Agent tool, and the verdict comes from the snapshot, not from the call.
    if ([Console]::IsInputRedirected) { [void][Console]::In.ReadToEnd() }

    . (Join-Path $PSScriptRoot 'window-lib.ps1')
    $v = Get-WindowVerdict

    if ($v.verdict -eq 'PAUSE') {
        $reset = '?'
        foreach ($w in @($v.windows)) {
            if (([string]$w.name) -eq ([string]$v.worstWindow)) { $reset = [string]$w.resetsLocal; break }
        }
        $reason = @"
WINDOW GUARD: no new work may start. $($v.worstWindow) is at $($v.worstPercent)% of its usage window (the line is $($script:WindowPauseLine)%), and it resets at $reset local. Reading: $($v.reason)

This spawn is refused, and it is the only thing refused - work already running is never interrupted.

Do this now, in this order:
  1. finish or abandon the step you are on, and write your state to disk;
  2. commit and push, so the work survives;
  3. report PARKED - window low to whoever spawned you, naming the item, the next phase and the pushed head;
  4. end.

Your spawner does the same, one level at a time, until the conductor parks the item with a park note. The coordinator restarts the work when the window reopens - one item at a time. Nobody waits inside a running agent.
"@
        Write-Decision 'deny' $reason '' ('WINDOW GUARD: spawn denied - {0} at {1}% (line {2}%), resets {3}.' -f $v.worstWindow, $v.worstPercent, $script:WindowPauseLine, $reset)
        exit 0
    }

    # OK - silent. This runs at every spawn in the relay; a line of chatter here is a line in
    # every actor transcript forever.
    #
    # SILENCE IS SPELLED OUT, NOT REACHED BY FALLING THROUGH. This branch used to be the fall-
    # through: anything that was not PAUSE and not UNKNOWN exited 0 without a word. It FIXES NO
    # PROVEN DEFECT - Get-WindowVerdict returns only OK, PAUSE or UNKNOWN, so no other value can
    # arrive here today, and the gate 2 ruling records plainly that nothing was shown broken. It is
    # written this way because silence is the one answer this file must never give by accident: a
    # verdict word this file has never heard of must be loud, and it now takes the warning path
    # below rather than looking exactly like a clear window.
    if ($v.verdict -eq 'OK') { exit 0 }

    # UNKNOWN, and any verdict this file does not recognise. A broken instrument is not a spent
    # window. UNKNOWN reports loudly and halts nothing - the same rule attribution follows. Never
    # let it pass silently as OK.
    $warn = ('WINDOW GUARD: the usage-window sensor is {0} and cannot be trusted - {1}. This spawn is ALLOWED: a broken instrument is not a reason to stop working. Nobody can see how much of the window is left, so keep the work small and say so in your report.' -f $v.verdict, $v.reason)
    Write-Decision 'allow' 'window sensor unreadable - allowed with a warning' $warn $warn
    exit 0
}
catch {
    # Fail OPEN, and say so. A guard that breaks silently is indistinguishable from a clear window.
    try {
        $msg = ('WINDOW GUARD FAILED and is allowing this spawn unguarded: ' + ($_.Exception.Message -replace '[\r\n]', ' ') + '. The usage window is NOT being checked at spawn boundaries until this is fixed.')
        Write-Decision 'allow' 'window guard error - failing open' $msg $msg
    }
    catch { }
    exit 0
}
