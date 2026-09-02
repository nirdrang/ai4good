# context-gauge.ps1 - read ONE session's context fill and report the numbers. Nothing more.
#
# WHERE THE NUMBER COMES FROM. Claude Code delivers `context_window` to the STATUS LINE and
# nowhere else - hooks get a different payload entirely - so statusline.ps1 snapshots it per
# session (context-<session id>.json) and this script reads that snapshot. Per session, not one
# shared file: context fill is a per-session fact, and one shared file would let the last
# session to refresh impersonate every other session's reading.
#
# NO THRESHOLD, BY DESIGN (founder 2026-08-14: "just show the total window and what is left,
# without the line"). An earlier draft carried a 70% advisory line; the founder removed it the
# same day. The gauge reports total window, tokens left, and percentage used; the reader judges.
# Do not add a verdict band here without a founder ruling - the number is the product.
#
# CONTEXT FALLS AS WELL AS CLIMBS. A compact or a /clear empties the window, so a stale reading
# proves nothing about now in EITHER direction - never infer a floor from an old high reading.
# Stale is UNKNOWN, said with its age.
#
# KNOWN BLIND SPOT (measured 2026-08-14). A VS Code-hosted session does not execute the status
# line, so no snapshot is ever written for it and its reading stays "no reading yet" forever.
# CLI sessions - where the coordinator loop lives - write on every refresh.

[CmdletBinding()]
param(
    # The session whose reading is wanted - selects the snapshot file. Required unless
    # SnapshotPath points somewhere explicit. Same format rule as the stamp hook enforces on the
    # payload id, because the value becomes part of a file name.
    [string]$SessionId = '',

    # Older than this and the gauge admits it cannot see. The status line refreshes on every turn
    # of an interactive session, so within a working session the reading stays minutes old.
    [int]$StaleMinutes = 15,

    # Emit the machine shape instead of the human lines.
    [switch]$Json,

    # Read a different snapshot. Exists so drills can exercise every verdict against synthetic
    # readings without disturbing any live file. Overrides SessionId-based resolution entirely.
    [string]$SnapshotPath = ''
)

$ErrorActionPreference = 'SilentlyContinue'

$result = [ordered]@{
    verdict       = 'UNKNOWN'
    reason        = ''
    usedPct       = $null
    # Tokens, when the payload carries them; null when only the percentage arrived. The stamp
    # prints whichever shape is present and never computes its own - one formula, here.
    sizeTokens    = $null
    leftTokens    = $null
    readingAgeMin = $null
    sessionId     = $SessionId
}

function Emit($r) {
    if ($Json) {
        $r | ConvertTo-Json -Depth 4
    } else {
        $head = "CONTEXT {0}" -f $r.verdict
        if ($r.reason) { $head += "  - " + $r.reason }
        Write-Output $head
        if ($null -ne $r.readingAgeMin) {
            Write-Output ("        reading is {0} min old" -f $r.readingAgeMin)
        }
    }
    exit 0
}

if ($SnapshotPath) {
    $snapPath = $SnapshotPath
}
elseif ($SessionId -and $SessionId -match '^[0-9a-fA-F-]{8,64}$') {
    $snapPath = Join-Path $env:LOCALAPPDATA ('ai4good-build\nirdrang-ai4good\context-' + $SessionId + '.json')
}
else {
    $result.reason = 'no session id - the context snapshot is per session and none was named'
    Emit $result
}

if (-not (Test-Path -LiteralPath $snapPath)) {
    $result.reason = 'no reading yet for this session - the status line has not refreshed since the sensor was installed'
    Emit $result
}

try { $snap = Get-Content -LiteralPath $snapPath -Raw | ConvertFrom-Json } catch { $snap = $null }
if (-not $snap) {
    $result.reason = 'the snapshot could not be parsed'
    Emit $result
}

# A snapshot claiming another session's id is answered with UNKNOWN, not with its number. The
# per-session file name should make this impossible; the check is here because "should" is how
# the last impersonation bug shipped.
if ($SessionId -and $snap.sessionId -and ([string]$snap.sessionId) -ne $SessionId) {
    $result.reason = ('snapshot belongs to session ' + ([string]$snap.sessionId).Substring(0, 8) + ', not this one')
    Emit $result
}

# Age first: everything below is only meaningful if the reading is current.
$ageMin = $null
try {
    $ageMin = [math]::Round(((Get-Date).ToUniversalTime() - [datetime]::Parse($snap.capturedAt).ToUniversalTime()).TotalMinutes, 1)
} catch { }
$result.readingAgeMin = $ageMin

if ($null -eq $snap.contextWindow) {
    # The field is absent rather than the file missing - a real answer, and a different one.
    $result.reason = 'this build does not deliver context_window to the status line'
    Emit $result
}

$cw = $snap.contextWindow

# Percentage, rounded before any use: float noise at a boundary is noise exactly where a
# comparison must be exact.
$pct = $null
if ($null -ne $cw.used_percentage) {
    $pct = [int][math]::Round([double]$cw.used_percentage)
    if ($pct -lt 0) { $pct = 0 }
    if ($pct -gt 100) { $pct = 100 }
}
$result.usedPct = $pct

# Tokens. The size comes from the payload; what is left is derived from the payload's OWN
# remaining_percentage when present (the build's arithmetic, not ours), and from 100-used only
# as the fallback. total_input_tokens is deliberately not used for this: the payload's
# percentages are the figures the client itself displays, so they are the figures to echo.
if ($null -ne $cw.context_window_size -and [int64]$cw.context_window_size -gt 0) {
    $size = [int64]$cw.context_window_size
    $result.sizeTokens = $size
    $remPct = $null
    if ($null -ne $cw.remaining_percentage) { $remPct = [double]$cw.remaining_percentage }
    elseif ($null -ne $pct) { $remPct = 100 - $pct }
    if ($null -ne $remPct) {
        if ($remPct -lt 0) { $remPct = 0 }
        if ($remPct -gt 100) { $remPct = 100 }
        $result.leftTokens = [int64][math]::Round($size * $remPct / 100)
    }
}

if ($null -eq $result.usedPct -and $null -eq $result.sizeTokens) {
    $result.reason = 'the payload carried no usable context fields'
    Emit $result
}

if ($null -eq $ageMin) {
    # Undatable is UNKNOWN in BOTH directions - no over-the-line escalation, because context can
    # have been emptied by a compact since this number was written.
    $result.verdict = 'UNKNOWN'
    $result.reason  = 'the reading carries no usable capture time - treat as unknown, never as low'
    Emit $result
}

if ($ageMin -gt $StaleMinutes) {
    $result.verdict = 'UNKNOWN'
    $result.reason  = ("last reading is {0} min old (limit {1}) - a compact may have emptied the window since; treat as unknown" -f $ageMin, $StaleMinutes)
    Emit $result
}

$result.verdict = 'READING'
if ($null -ne $result.leftTokens) {
    $result.reason = ("{0}k left of {1}k ({2}% used)" -f [math]::Round($result.leftTokens / 1000), [math]::Round($result.sizeTokens / 1000), $result.usedPct)
} else {
    $result.reason = ("{0}% used" -f $result.usedPct)
}

Emit $result
