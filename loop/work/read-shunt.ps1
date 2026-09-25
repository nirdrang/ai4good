# read-shunt.ps1 - refuse one very large read in the main session, and steer toward one well-aimed read.
#
# WHY THIS EXISTS. Content the lead reads stays in its context and is paid for again on every later
# step. Each extra call is also a full re-read of the whole conversation. So the aim is the fewest
# calls that bring in only what is needed: one targeted read beats both one huge read and many small
# pages.
#
# WHAT CHANGED FROM THE LINE-BASED VERSION. It measured lines and let any read with `limit` of 350 or
# less through, and its refusal suggested pages of 120 lines. On the scope run the lead answered it by
# paging: the brief took four calls, one design candidate two calls of about 26k characters each. A
# page count is not a size. This version measures the characters the read would return, and its
# refusal names one read of the needed region, never a page size to repeat.
#
# WHAT IT DOES NOT DO. It keeps no state: each read is judged alone. It never blocks a subagent unless
# its type is listed in READ_SHUNT_GATE_AGENTS, because the read lane that answers this refusal is a
# subagent. It never blocks images, PDFs or notebooks.
#
# THE ESCAPE IS AN ENVIRONMENT VARIABLE. READ_SHUNT=off disables it; READ_SHUNT_MAX_CHARS moves the
# cap (default 30000). The agent cannot lift it mid-turn.
#
# Contract: PreToolUse, matcher Read. Exit 0 allows; exit 2 blocks and sends stderr to the agent.
# Never throws: a guard that crashes fails OPEN.

$ErrorActionPreference = 'SilentlyContinue'

try {
    if ($env:READ_SHUNT -eq 'off') { exit 0 }

    $cap = 30000
    if ($env:READ_SHUNT_MAX_CHARS) {
        $parsed = 0
        if ([int]::TryParse($env:READ_SHUNT_MAX_CHARS, [ref]$parsed) -and $parsed -gt 0) { $cap = $parsed }
    }

    $raw = [Console]::In.ReadToEnd()
    if (-not $raw) { exit 0 }
    $j = $null
    try { $j = ConvertFrom-Json $raw } catch { exit 0 }

    $agentType = [string]$j.agent_type
    if ($j.agent_id) {
        $gated = @()
        if ($env:READ_SHUNT_GATE_AGENTS) {
            $gated = @($env:READ_SHUNT_GATE_AGENTS -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        }
        if (-not $agentType) { exit 0 }
        if ($gated -notcontains $agentType) { exit 0 }
    }

    $path = [string]$j.tool_input.file_path
    if (-not $path) { exit 0 }
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { exit 0 }
    $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
    if ($ext -in '.png','.jpg','.jpeg','.gif','.webp','.bmp','.svg','.pdf','.ipynb') { exit 0 }

    # The window the read would return: Read starts at line 1 and returns up to 2000 lines by default.
    $offset = 1
    $limit = 2000
    $o = 0; $l = 0
    if ($null -ne $j.tool_input.offset -and [int]::TryParse([string]$j.tool_input.offset, [ref]$o) -and $o -gt 0) { $offset = $o }
    if ($null -ne $j.tool_input.limit -and [int]::TryParse([string]$j.tool_input.limit, [ref]$l) -and $l -gt 0) { $limit = $l }

    # Count only as far as the decision needs.
    $chars = 0
    $line = 0
    $fileLines = 0
    $reader = $null
    try {
        $reader = [System.IO.File]::OpenText($path)
        while ($null -ne ($text = $reader.ReadLine())) {
            $line++
            if ($line -ge $offset -and $line -lt $offset + $limit) {
                $chars += $text.Length + 1
                if ($chars -gt $cap) { break }
            }
            if ($line -ge $offset + $limit) { break }
        }
        $fileLines = $line
    } finally {
        if ($reader) { $reader.Close() }
    }
    if ($chars -le $cap) { exit 0 }

    $name = Split-Path $path -Leaf
    $window = if ($null -ne $j.tool_input.limit -or $offset -gt 1) { "lines $offset to $($offset + $limit - 1)" } else { 'the whole file' }

    if ($agentType) {
        [Console]::Error.Write(@"
BLOCKED: this read of $name ($window) would return over $cap characters.

You hold no Agent tool. Find the part you need first (Grep for the symbol, with line numbers),
then read that region in ONE call: Read(file_path, offset: N, limit: M), with M just large
enough to cover it. Do not step through the file in small pages.

If your task needs the whole file, read it in as few ranged calls as possible, each under
$cap characters.
"@)
        exit 2
    }

    [Console]::Error.Write(@"
BLOCKED: this read of $name ($window) would return over $cap characters (READ_SHUNT_MAX_CHARS).

Every call re-reads the whole conversation, so get what you need in as few calls as possible.
Do one of these:

1. You know which part you need: find it with Grep (line numbers), then read that region in ONE
   call, Read(file_path, offset: N, limit: M), with M just large enough to cover it, up to
   $cap characters. Do not step through the file in small pages.

2. You need an answer, not the text: send a read lane with one precise question and ask for
   the exact lines back. Write the question as a fact to locate ("where does the candidate
   check the own name in the scan"), never as a purpose ("what matters for the review").

3. You need the whole file: read it in as few ranged calls as possible, each under
   $cap characters, and send them in the same message.

If you need other files too, send those reads in the same message: they then cost one step.
"@)
    exit 2
} catch {
    exit 0
}
