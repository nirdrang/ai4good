# read-shunt.ps1 - refuse an UNBOUNDED read of a large file in the main session.
#
# WHY THIS EXISTS. Content the lead reads is billed twice. Once when it arrives, and again on
# every following turn until a compaction clears it, at the cache-read rate. So a large read
# costs about its own size plus a tenth of its size per turn it survives; one that lives a
# hundred turns costs roughly ten times what it appears to cost.
#
# Measured on AI4DEV-56 (admin operations): 24 reads came back over 350 lines and put about
# 198,000 tokens into the lead. Four of them were design candidates a judge lane had already
# scored, 58,000 tokens, read at turn 134 of about 280 and resident for the rest of the build.
# The tree's own delegation rule already said to read a lane's file only when its summary names
# a deviation. It was broken three times in that one item. A rule broken three times is a hook.
#
# WHAT IT DOES NOT DO. It never blocks a bounded read. Passing `limit` is the behaviour this is
# trying to produce, so a read that already pages is always allowed. It never blocks a subagent,
# because `agent_id` is present only inside one, and the read lane that answers this refusal is
# a subagent - without that exemption the remedy would block itself.
#
# THE ESCAPE IS AN ENVIRONMENT VARIABLE, not a flag in the prompt. READ_SHUNT=off disables it,
# READ_SHUNT_MIN_LINES moves the threshold. A founder can turn it off for a session; the agent
# cannot turn it off mid-turn to get past a refusal it just received.
#
# Contract: PreToolUse, matcher Read. Exit 0 allows; exit 2 blocks and sends stderr to the agent.
# Never throws - a guard that crashes must fail OPEN, because breaking every read in every
# session is far worse than the spend it prevents.

$ErrorActionPreference = 'SilentlyContinue'

try {
    if ($env:READ_SHUNT -eq 'off') { exit 0 }

    $threshold = 350
    if ($env:READ_SHUNT_MIN_LINES) {
        $parsed = 0
        if ([int]::TryParse($env:READ_SHUNT_MIN_LINES, [ref]$parsed) -and $parsed -gt 0) { $threshold = $parsed }
    }

    $raw = [Console]::In.ReadToEnd()
    if (-not $raw) { exit 0 }
    $j = $null
    try { $j = ConvertFrom-Json $raw } catch { exit 0 }

    # A subagent is doing the reading. By default never block one, for two reasons that are not
    # the same reason. First, the read lane that answers this refusal is itself a subagent, so
    # exempting it is what makes the remedy possible at all. Second, a lane's context dies when
    # the lane ends, so a large read there costs roughly its size times the lane's own turns, not
    # the session's - the residency multiplier that justifies this guard is much smaller.
    #
    # That defence does not cover every lane. A reviewer told to read a whole diff has no remedy
    # and is doing its job; a lane that pulls a big source file for context it barely uses is the
    # same waste as the lead doing it. So the exemption is a LIST, not a law. Name agent types in
    # READ_SHUNT_GATE_AGENTS to gate them too. Default empty, which keeps every lane exempt.
    #
    # Gating a lane is riskier than gating the lead. A lane that cannot get what it needs may fail
    # or answer badly, and a premium lane run costs far more than the read it was refused. The
    # pstack lane agents also hold no Agent tool, so their only remedy is paging, and the refusal
    # text says so.
    $agentType = [string]$j.agent_type
    if ($j.agent_id) {
        $gated = @()
        if ($env:READ_SHUNT_GATE_AGENTS) {
            $gated = @($env:READ_SHUNT_GATE_AGENTS -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        }
        if (-not $agentType) { exit 0 }                 # cannot tell which lane: allow
        if ($gated -notcontains $agentType) { exit 0 }  # not named for gating: allow
    }

    $path = [string]$j.tool_input.file_path
    if (-not $path) { exit 0 }
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { exit 0 }

    # Line counts mean nothing for these; Read renders them rather than returning text.
    $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
    if ($ext -in '.png','.jpg','.jpeg','.gif','.webp','.bmp','.svg','.pdf','.ipynb') { exit 0 }

    # A bounded read is the behaviour we want. Allow any read that asks for no more than the
    # threshold, whatever the file's size.
    $limit = $j.tool_input.limit
    if ($null -ne $limit) {
        $n = 0
        if ([int]::TryParse([string]$limit, [ref]$n) -and $n -le $threshold) { exit 0 }
    }

    # Count only as far as the decision needs. A 40,000-line file costs the same check as a 400.
    $lines = 0
    $reader = $null
    try {
        $reader = [System.IO.File]::OpenText($path)
        while ($lines -le $threshold -and $null -ne $reader.ReadLine()) { $lines++ }
    } finally {
        if ($reader) { $reader.Close() }
    }
    if ($lines -le $threshold) { exit 0 }

    $name = Split-Path $path -Leaf

    # A gated lane holds no Agent tool, so telling it to delegate would be telling it to do
    # something it cannot do. Paging is the only remedy it has.
    if ($agentType) {
        $laneMsg = @"
BLOCKED: unbounded read of a large file. $name is over $threshold lines.

  path      : $path
  lane      : $agentType
  threshold : $threshold lines (READ_SHUNT_MIN_LINES)

You hold no Agent tool, so page the file instead:

    Read(file_path, offset: N, limit: 120)

Pass limit WITH offset. Offset alone is not paging - it reads on to the 2000-line cap. Grep the
file first to find the line you want, then read a window around it.

If this file must be read whole for your task to be correct, say so in your report and stop.
Do not work around this by reading it in many large windows.
"@
        [Console]::Error.Write($laneMsg)
        exit 2
    }

    $msg = @"
BLOCKED: unbounded read of a large file. $name is over $threshold lines.

  path      : $path
  threshold : $threshold lines (READ_SHUNT_MIN_LINES)

This file would sit in your context for every remaining turn of this session, and be re-billed
on each one. Do one of these instead.

1. If you know what you are looking for, send a read lane and keep the lines, not a summary:

     Agent(subagent_type: "mechanical", model: "sonnet", prompt: @"
       You are a read lane. You extract lines. You judge nothing and you summarise nothing.
       FILE: $path
       AIM: <the one question the lines must answer - see below>
       Return the exact line ranges that bear on the aim, quoted VERBATIM, each block preceded
       by `--- lines N-M ---`. At most 80 lines. Then one line beginning `SKIPPED:` naming what
       you did not return and why. No preamble, no summary, no opinion. If nothing in the file
       bears on the aim, reply NOTHING.
     ")

   The block above is a scaffold. Everything in it stays fixed except AIM, which you write
   fresh from what you need right now. The aim is the whole difference: it is what turns a
   2,660-line file into 7 lines, and "read this file" is just the unbounded read in disguise.

   Write the aim as a fact to locate, never as a purpose to serve. NAME THE THING, NOT THE
   PURPOSE. "Where does this candidate specify the own-name check in the scan" has one answer
   the lane can point at. "What matters for reviewing the transfer path" asks the lane to
   judge relevance, which is your job, and you will not be able to tell what it dropped.

   Ask for verbatim lines when you will act on the exact text. Ask for bullets only when you
   need a fact you will not quote.

2. If you already know roughly where to look, page it: Read(file_path, offset: N, limit: 120).
   Pass limit WITH offset. Offset alone is not paging - it reads to the 2000-line cap.

3. If you genuinely must see the whole file, the founder can lift this for the session with
   READ_SHUNT=off. Ask; do not assume.
"@
    [Console]::Error.Write($msg)
    exit 2
} catch {
    exit 0   # fail OPEN, always
}
