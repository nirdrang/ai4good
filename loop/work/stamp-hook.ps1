# stamp-hook.ps1 - UserPromptSubmit hook: the WORKING ON stamp.
#
# Prints EXACTLY TWO LINES before every prompt, always, in one fixed format:
#
#   WORKING ON  <root> > <parents...> > <item>
#   IN          wt <folder> - branch <branch>
#
# Line 1 is the conclusion. Line 2 is WHAT THE CONCLUSION WAS DERIVED FROM. That pairing is the
# whole point: every past incident was line 1 disagreeing with line 2 while only line 1 was
# visible. Anything else - a conflict, an unresolved chain, a git state - APPENDS below. The two
# lines never change shape, so they are always in the same place and always mean the same thing.
#
# ATTRIBUTION IS DERIVED, NEVER DECLARED. cwd -> git worktree -> branch -> exactly one item id.
# The held item (written by /work) is a CROSS-CHECK ONLY: it can raise CONFLICT or fill a gap the
# branch left empty, but it can NEVER override the branch. A stale held item therefore makes the
# stamp louder, never wronger - the inverse of the folder-keyed binding this replaces, which
# silently substituted itself for reality (AI4DEV-24: a whole run stamped against the wrong item).
#
# NEVER CALLS LINEAR. Titles and chains come from a cache written by /work. A cache miss degrades
# to the bare item id with a note - it never guesses, and it never blocks.
#
# NEVER SILENT. On any failure this prints "stamp error: <what>" rather than something plausible.
# The dangerous failure is not a wrong stamp; it is no stamp becoming normal, after which nobody
# reads the line at all.

# The session id normally arrives in the hook payload on stdin. The BANNER cannot forward stdin -
# it runs the stamp in the same process AFTER draining the payload itself - so it passes the id it
# parsed as this parameter instead. The parameter wins when present; the stdin read is the
# fallback. Same format rule as the stdin path, enforced below.
param([string]$SessionId = '')

$ErrorActionPreference = 'Stop'
$script:AgentLines = @()
$script:BatchAttr = ''

# EVERY LINE NAMES ITS ACTOR (founder 2026-08-07). A stamp is read across several concurrent
# actors, so a line that does not say who is speaking is ambiguous exactly when it matters. The
# actor is DERIVED like everything else here - the main checkout is the coordinator, a worktree
# under .claude/worktrees is an agent - never declared, so it cannot drift.
$script:Actor = 'SESSION'

function Emit([string]$l1, [string]$l2, [string[]]$extra, [string]$pm, [string]$dev) {
    # EVERY HUMAN LINE CARRIES THE SESSION PREFIX (founder 2026-08-11: "I want session id print
    # on every line of the stamp - prefix"). One formatter, applied at the single output point,
    # so a forwarded agent line and a warning line cannot drift from the actor lines. The
    # machine tag stays UNPREFIXED on purpose: parsers anchor on its opening bracket, and it
    # already carries the session as an attribute — humans get the prefix, machines the field.
    # Runs with no session id (agent child re-runs, manual invocations) print no prefix.
    $pfx = ''
    if ($script:SessionId -and $script:SessionId.Length -ge 8) { $pfx = ('[' + $script:SessionId.Substring(0, 8) + '] ') }
    Write-Output ($pfx + $script:Actor.PadRight(12) + 'WORKING ON  ' + $l1)
    Write-Output ($pfx + $script:Actor.PadRight(12) + 'IN          ' + $l2)
    # The batch attribute is ADDITIVE (founder 2026-08-11): a batched partner must reach the
    # machine tag too, or every report over the attribution log under-counts the partner's work.
    # Parsers reading pm/dev are unaffected; the attribute appears only when a partner rides.
    # The short session tag reaches the machine line too (additive, founder 2026-08-11), so the
    # attribution log can group prompts by session without parsing the human lines.
    $sess = ''
    if ($script:SessionId -and $script:SessionId.Length -ge 8) { $sess = (' session="' + $script:SessionId.Substring(0, 8) + '"') }
    if ($script:BatchAttr) {
        Write-Output ('<ai4good-attribution pm="{0}" dev="{1}" batch="{2}"{3}/>' -f $pm, $dev, $script:BatchAttr, $sess)
    }
    else {
        Write-Output ('<ai4good-attribution pm="{0}" dev="{1}"{2}/>' -f $pm, $dev, $sess)
    }
    foreach ($e in $extra) { if ($e) { Write-Output ($pfx + $e) } }
    foreach ($a in $script:AgentLines) { if ($a) { Write-Output ($pfx + $a) } }
}

function Fmt([string]$id, [string]$label) {
    if (-not $label) { return $id }
    $t = ($label -replace '[\r\n\|<>"()]', ' ').Trim()
    if ($t.Length -gt 40) { $t = $t.Substring(0, 37) + '...' }
    if (-not $t) { return $id }
    return ('{0} ({1})' -f $id, $t)
}

# Strict ASCII token boundaries and zero-padding normalised, so `fix/notai4dev-19x` does not
# match and `AI4DEV-019` does. ALL matches are collected: exactly one attributes, and two or more
# is unresolved rather than "take the first" - `ai4dev-19-into-ai4dev-20` silently attributed to
# 19 under the single anchored pattern this replaces.
# CultureInvariant because `(?i)` under a Turkish locale does not fold `I` the way ASCII expects -
# it would fail plain AI4DEV-19 and accept dotted-I lookalikes. `[0-9]` not `\d`, because .NET's
# `\d` also matches Arabic-Indic and other Unicode digits, which are not Linear ids. A match
# timeout because `0*[0-9]+` can backtrack badly on a long run of zeros, and a hook that hangs is
# strictly worse than a hook that degrades.
function Get-BranchItems([string]$branch) {
    if ($branch.Length -gt 512) { return @() }
    $rx = New-Object System.Text.RegularExpressions.Regex(
        '(?<![\p{L}\p{N}])AI4(DEV|PM)-0*([0-9]{1,7})(?![\p{L}\p{N}])',
        ([System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::CultureInvariant),
        ([TimeSpan]::FromMilliseconds(250)))
    $ids = New-Object System.Collections.ArrayList
    foreach ($m in $rx.Matches($branch)) {
        $id = 'AI4' + $m.Groups[1].Value.ToUpperInvariant() + '-' + [string][int]$m.Groups[2].Value
        if ($ids -notcontains $id) { [void]$ids.Add($id) }
    }
    return $ids.ToArray()
}

try {
    # State paths come from work-lib so the hook and /work can never disagree about where the
    # held item and the chain cache live. Two formulas for one path is the same drift class this
    # item exists to delete.
    . (Join-Path $PSScriptRoot 'work-lib.ps1')

    # The calling SESSION's identity, from the hook payload on stdin. Only read when stdin is
    # genuinely redirected - reading a console would block, and a hook that hangs is the one
    # failure this file must never have. Empty is a legal answer and degrades the ownership
    # labels below, never the stamp.
    # CAPTURE THE PARAMETER BEFORE ZEROING: at script level $script:SessionId IS $SessionId -
    # the same variable - so assigning '' first would silently erase the banner's parameter
    # (caught by test on 2026-08-12, not by inspection).
    $sidParam = $SessionId
    $script:SessionId = ''
    if ($sidParam -and $sidParam -match '^[0-9a-fA-F-]{8,64}$') { $script:SessionId = $sidParam }
    try {
        if (-not $script:SessionId -and [Console]::IsInputRedirected) {
            $raw = [Console]::In.ReadToEnd()
            $m = [regex]::Match($raw, '"session_id"\s*:\s*"([0-9a-fA-F-]{8,64})"')
            if ($m.Success) { $script:SessionId = $m.Groups[1].Value }
        }
    }
    catch { }

    # -LiteralPath: a legitimate directory containing [ or ] is treated as a wildcard by Test-Path
    # and reports false, silently falling back to some other directory's attribution.
    $base = if ($env:CLAUDE_PROJECT_DIR -and (Test-Path -LiteralPath $env:CLAUDE_PROJECT_DIR)) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }

    # Identity is git's, not the path string's. Windows case-folding and junctions make paths lie
    # in both directions, so the worktree is identified by what git resolves, never by text.
    $top = (& git -C $base rev-parse --show-toplevel 2>$null)
    $gitDir = (& git -C $base rev-parse --git-dir 2>$null)
    if (-not $top -or -not $gitDir) {
        Emit 'unknown (stamp error: not a git worktree)' ('wt ? - ' + $base) @() '-' '-'
        exit 0
    }
    $top = $top.Trim(); $gitDir = $gitDir.Trim()
    if (-not [System.IO.Path]::IsPathRooted($gitDir)) { $gitDir = Join-Path $top $gitDir }
    $wt = Split-Path -Leaf $top
    $extra = @()

    # SESSION FRESHNESS GUARD (founder 2026-08-11). A session loads CLAUDE.md and the agent
    # contracts ONCE, at start; disk edits after that are invisible to it, and spawns serve the
    # registry's old bodies (adds never reload; edits lag). This session's first prompt records a
    # fingerprint of those files; every later prompt compares, and drift prints HERE — the
    # earliest point in any turn, in the one channel always read. Baseline is per session id, so
    # every session in the folder gets its own honest answer. No session id (child re-runs,
    # manual runs) → skip silently. Any failure degrades to a named note, never a block.
    try {
        if ($script:SessionId) {
            $watched = @()
            $cm = Join-Path $top 'CLAUDE.md'
            if (Test-Path -LiteralPath $cm) { $watched += $cm }
            $agentsDir = Join-Path $top '.claude\agents'
            if (Test-Path -LiteralPath $agentsDir) {
                $watched += (Get-ChildItem -LiteralPath $agentsDir -Filter '*.md' -File | ForEach-Object { $_.FullName })
            }
            $sha = [System.Security.Cryptography.SHA256]::Create()
            $now = @{}
            foreach ($f in $watched) {
                $h = [System.BitConverter]::ToString($sha.ComputeHash([System.IO.File]::ReadAllBytes($f))) -replace '-', ''
                $now[(Split-Path -Leaf $f)] = $h.Substring(0, 16).ToLower()
            }
            # Session-bound (founder 2026-08-11): the baseline lives in THIS session's own cache
            # directory, beside its held label — one directory per session, keyed by the id the
            # hook payload carries.
            $wfile = Join-Path (Get-StateDirRO) ('sessions\' + $script:SessionId + '\watch.json')
            $watchBaseline = Read-JsonCapped $wfile
            if (-not $watchBaseline) {
                [System.IO.File]::WriteAllText((Join-Path (Get-SessionStateDir $script:SessionId) 'watch.json'), (@{ files = $now; recordedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
            }
            else {
                $drifted = @()
                foreach ($k in $now.Keys) {
                    $old = $null
                    try { $old = [string]$watchBaseline.files.$k } catch { }
                    if ($old -and $old -ne $now[$k]) { $drifted += $k }
                    elseif (-not $old) { $drifted += ($k + ' (new)') }
                }
                if ($drifted.Count -gt 0) {
                    $extra += ('CONTRACTS DRIFTED since this session started: ' + ($drifted -join ', ') + ' - this session and its running agents keep the OLD text, and new spawns may too (adds never reload; edits lag). Restart before the next spawn, or probe the changed type live.')
                }
            }
        }
    }
    catch {
        $extra += ('freshness guard degraded: ' + ($_.Exception.Message -replace '[\r\n]', ' '))
    }
    $script:Actor = if ($top -match '[\\/]\.claude[\\/]worktrees[\\/]') { 'AGENT' } else { 'COORDINATOR' }

    # SUPERVISED AGENTS (founder 2026-08-05). From the MAIN checkout, every platform agent
    # worktree gets its own derived stamp appended, so the founder sees the whole supervision
    # tree on every prompt without asking. Each agent line is this hook re-run against that
    # worktree - ONE derivation logic, never a second formula that could drift. An agent
    # worktree itself skips this block (its stamp IS the agent line), which also terminates
    # the recursion; the path guard matches both slash directions because git reports forward
    # slashes on Windows.
    try {
        $wtRoot = Join-Path $top '.claude/worktrees'
        if ((-not $env:AI4GOOD_STAMP_CHILD) -and ($top -notmatch '[\\/]\.claude[\\/]worktrees[\\/]') -and (Test-Path -LiteralPath $wtRoot)) {
            $savedEnv = $env:CLAUDE_PROJECT_DIR
            $env:AI4GOOD_STAMP_CHILD = '1'
            foreach ($d in (Get-ChildItem -LiteralPath $wtRoot -Directory -ErrorAction SilentlyContinue)) {
                # ONLY a real worktree is recursed into. `.claude/worktrees` also holds ordinary
                # directories - the artifacts directory the conductor keeps per item - and those
                # are INSIDE this repository, so git answers with the MAIN checkout's toplevel.
                # The old guard tested that answer, saw the main checkout, and enumerated this
                # directory again: unbounded self-spawning that hung the hook for minutes and
                # printed nothing. A stamp that does not appear is the one failure this file
                # exists to prevent, so the test is now "is this directory itself a worktree",
                # and AI4GOOD_STAMP_CHILD makes any future path incapable of recursing at all.
                $childTop = (& git -C $d.FullName rev-parse --show-toplevel 2>$null)
                if (-not $childTop) { continue }
                $a = [System.IO.Path]::GetFullPath(($childTop.Trim() -replace '/', '\')).TrimEnd('\')
                $b = [System.IO.Path]::GetFullPath($d.FullName).TrimEnd('\')
                if (-not $a.Equals($b, [System.StringComparison]::OrdinalIgnoreCase)) { continue }

                $env:CLAUDE_PROJECT_DIR = $d.FullName
                $child = @(& powershell -NoProfile -File $PSCommandPath 2>$null)
                if ($child.Count -ge 2) {
                    # Verbatim, plus an OWNERSHIP tag (founder 2026-08-09). These lines print in
                    # EVERY session opened in this folder - the tree is derived from disk - so a
                    # parallel session reads them as its own agents unless each line says whose
                    # agent it is. The owner is recorded by /work at spawn; absent records and an
                    # unknown session id both degrade to words, never to a guess.
                    # A DIFFERENT SPAWNER ID IS NOT ANOTHER SESSION (founder catch 2026-08-12).
                    # A resume rotates the session id, so a session's own agents carry its OLD id
                    # in their owner records. The old wording asserted "ANOTHER session's agent"
                    # on any mismatch, and the coordinator believed it over its own history and
                    # reported a second session that did not exist. No repair is derivable: the
                    # hook payload names no predecessor id (docs checked 2026-08-12) and the
                    # transcript is rewritten and compacted. So the label states exactly what the
                    # comparison knows - the spawner's tag, and both readings of a mismatch - and
                    # the reader resolves it from conversation memory.
                    $who = 'spawner unrecorded - not necessarily this session''s'
                    try {
                        # GIT'S OWN STRING, never $a. The worktree id is a hash of the toplevel
                        # TEXT, so `C:/x` and `C:\x` hash differently: $a is the backslash form
                        # built for the path-equality test above, and passing it here missed a
                        # record that existed and printed "spawner unrecorded" for my own agent
                        # (measured 2026-08-09, first live use). Every writer uses git's forward-
                        # slash output, so every reader must too.
                        $own = Get-OwnerForWorktreeRoot ($childTop.Trim())
                        $ownSid = if ($own) { [string]$own.sessionId } else { '' }
                        if ($ownSid -and $script:SessionId) {
                            if ($ownSid -eq $script:SessionId) { $who = 'this session''s agent' }
                            else {
                                $ownTag = if ($ownSid.Length -ge 8) { $ownSid.Substring(0, 8) } else { $ownSid }
                                $who = ('spawner session ' + $ownTag + ' - another session, or this one before a resume')
                            }
                        }
                        elseif ($ownSid) { $who = 'spawner recorded; this session''s id unknown' }
                    }
                    catch { }
                    $script:AgentLines += ([string]$child[0] + '   [' + $who + ']')
                    $script:AgentLines += ([string]$child[1])
                    # AND ITS WARNINGS. Forwarding only the first two lines silently dropped every
                    # qualifier the child raised - STALE, CHAIN UNRESOLVED, BRANCH NAMES 2 ITEMS,
                    # an ignored held item. An agent whose branch named two items therefore showed
                    # as "WORKING ON nothing" in the supervision tree, indistinguishable from one
                    # that simply had not switched branch yet - and that exact display was on
                    # screen this morning for an innocent reason, which is what makes the
                    # ambiguity dangerous. A warning nobody can see is the failure this file
                    # exists to prevent. The machine tag is the child's own and is not repeated.
                    for ($i = 2; $i -lt $child.Count; $i++) {
                        $w = [string]$child[$i]
                        if ($w -and ($w -notmatch '^<ai4good-attribution')) { $script:AgentLines += ('            ' + $w) }
                    }
                }
            }
            $env:CLAUDE_PROJECT_DIR = $savedEnv
            $env:AI4GOOD_STAMP_CHILD = $null
        }
    }
    catch {
        # Never silent, never fatal: a broken enumeration names itself and the main stamp stands.
        $script:AgentLines += ('AGENT       (enumeration failed: ' + ($_.Exception.Message -replace '[\r\n]', ' ') + ')')
    }

    # Named git states. The earlier design printed "nothing" during a rebase or a bisect - hours of
    # genuinely attributed work reported as unattributed, which teaches you to ignore the line.
    if ((Test-Path (Join-Path $gitDir 'rebase-merge')) -or (Test-Path (Join-Path $gitDir 'rebase-apply'))) {
        $extra += 'REBASE IN PROGRESS - closure blocked until it finishes'
    }
    if (Test-Path (Join-Path $gitDir 'BISECT_LOG')) {
        $extra += 'BISECT IN PROGRESS - closure blocked until it finishes'
    }

    $branch = (& git -C $base symbolic-ref --short -q HEAD 2>$null)
    $detached = $false
    if ($branch) { $branch = $branch.Trim() } else {
        $detached = $true
        $sha = (& git -C $base rev-parse --short HEAD 2>$null)
        $branch = if ($sha) { 'detached@' + $sha.Trim() } else { 'detached@unknown' }
    }

    # The held item - a cross-check only. Keyed by repo root: two sessions in one folder share it,
    # which can produce a spurious CONFLICT but can never produce a wrong attribution, because it
    # is never the answer.
    # Held state is only usable as attribution if it proves it was taken up ON THIS BRANCH. Without
    # that, taking up an item and later switching to main would keep claiming the old item forever.
    # An id that fails validation is discarded outright: one containing newlines would forge extra
    # stamp lines and a fake attribution tag - the very output the founder is told to trust.
    $held = $null
    try { $held = Get-HeldItem -SessionId $script:SessionId } catch { }
    $heldId = ''
    $heldStale = ''
    if ($held -and ((Test-ItemId ([string]$held.itemId)) -or (Test-FloatingRoot ([string]$held.itemId)))) {
        if (([string]$held.branch) -eq $branch) { $heldId = [string]$held.itemId }
        else { $heldStale = [string]$held.itemId }
    }

    $ids = @(Get-BranchItems $branch)
    $item = ''
    if ($ids.Count -eq 1) { $item = $ids[0] }
    elseif ($ids.Count -gt 1) {
        $extra += ('BRANCH NAMES ' + $ids.Count + ' ITEMS (' + ($ids -join ', ') + ') - unresolved; rename the branch or say which')
    }

    # "folder", not "wt": an abbreviation nobody outside this repository can expand is exactly the
    # shorthand the founder's standing instruction forbids, and this line is read by the founder.
    # The SHORT SESSION TAG (founder 2026-08-11: "I want a hash or something unique that can
    # identify the session... short since session ids are long"): the first 8 characters of the
    # session id — already random hex, so no hashing is needed, and the founder can match it to
    # a window at a glance. A new tag after a compact or resume is a FEATURE: identity rotation
    # becomes visible instead of silent. Child re-runs carry no session id and print no tag.
    $line2 = ('folder {0} - branch {1}' -f $wt, $branch)
    if ($script:SessionId -and $script:SessionId.Length -ge 8) {
        $line2 += (' - session ' + $script:SessionId.Substring(0, 8))
    }

    # CONFLICT outranks everything. Never pick a side: exactly one of the two describes work that
    # is not happening, and that is the condition the old design could never see.
    if ($item -and $heldId -and $item -ne $heldId) {
        Emit ('CONFLICT - branch says ' + $item + ', session holds ' + $heldId) $line2 `
        ($extra + 'Attribution unresolved until you say which is right. Building is not blocked; closing is.') 'conflict' 'conflict'
        exit 0
    }

    # Branch names nothing, but the session took an item up ON THIS BRANCH: fill the gap, and say
    # it is a gap. This is also how COORDINATOR LIGHT WORK attributes (founder 2026-08-09): work
    # ruled onto main outside an item records a held item, and this line then carries it.
    $heldFill = $false
    $heldLabel = ''
    if (-not $item -and $heldId -and $ids.Count -eq 0) {
        $extra += ('held, not branch - the branch names no item' + $(if ($detached) { ' (detached HEAD)' } else { '' }))
        $item = $heldId
        $heldFill = $true
        if ($held) { $heldLabel = [string]$held.label }
    }
    if ($heldStale) {
        $extra += ('IGNORING held ' + $heldStale + ' - it was taken up on another branch; not attributing to it')
    }

    if (-not $item) {
        # "nothing" was misleading (founder 2026-08-09): the coordinator is always DOING
        # something - board, relays, sweeps, folds - it just claims no ITEM. So the coordinator's
        # idle line names its standing work instead of an absence, and the nudge tells it how to
        # attribute item-scoped light work: hold the item. An AGENT keeps the bare wording - it
        # was spawned for one item, and "coordination" would be false there.
        if ($script:Actor -eq 'AGENT') {
            Emit 'nothing - this branch names no item yet' $line2 $extra 'none' 'none'
        }
        elseif ($script:AgentLines.Count -gt 0) {
            Emit 'coordination, no item claimed here - the items below run in their own folders' $line2 $extra 'none' 'none'
        }
        else {
            Emit 'coordination, no item claimed - board, relays, sweeps and folds happen here' $line2 ($extra + 'item-scoped light work? hold the item so this line attributes it; exploring? say so') 'none' 'none'
        }
        exit 0
    }

    # The chain, from cache. Keyed by worktree id + branch, so two clones never share an entry
    # and a branch renamed into a previously-cached name misses instead of hitting.
    $chain = $null
    try { $chain = Get-Chain $branch } catch { }

    # An unresolved chain claims NO root. The earlier version fell back to the item itself, which
    # printed pm="AI4DEV-36" - asserting an item is its own root when the parent is simply unknown.
    # Unknown is a value; inventing one is the failure this whole design exists to prevent.
    $root = '-'
    if (Test-Chain $chain $branch $item) {
        $nodes = @($chain.chain)
        $parts = @()
        foreach ($n in $nodes) { $parts += (Fmt ([string]$n.id) ([string]$n.label)) }
        $line1 = ($parts -join ' > ')
        $root = [string]$nodes[0].id
        $fresh = $false
        try {
            $age = (Get-Date) - [datetime]::Parse([string]$chain.resolvedAt, [Globalization.CultureInfo]::InvariantCulture)
            $fresh = ($age.TotalHours -le 24 -and $age.TotalMinutes -ge -5)   # a future stamp is not "fresh"
        }
        catch { }
        if (-not $fresh) { $extra += 'STALE - cached chain is old or its timestamp is unreadable; /work refreshes it' }
        # A batch partner rides this branch (batching mode, founder 2026-08-11). The stamp says
        # so, or two items run while the tree shows one.
        try {
            if ($chain.batchedWith -and (Test-ItemId ([string]$chain.batchedWith.id))) {
                $extra += ('batched with ' + (Fmt ([string]$chain.batchedWith.id) ([string]$chain.batchedWith.label)) + ' - closes via its sanctioned line in this branch''s pull request')
                $script:BatchAttr = [string]$chain.batchedWith.id
            }
        }
        catch { }
    }
    elseif ($heldFill) {
        # Held attribution has no branch-keyed chain by design - the branch is main. The held
        # label makes the line legible, and the "held, not branch" note above already says why
        # there are no parents; adding CHAIN UNRESOLVED here would flag normal light work as a
        # defect on every prompt.
        $line1 = Fmt $item $heldLabel
    }
    else {
        $line1 = $item
        $extra += 'CHAIN UNRESOLVED - no valid cached parents for this branch; /work resolves it'
    }

    Emit $line1 $line2 $extra $root $item
}
catch {
    Write-Output ('WORKING ON  unknown (stamp error: ' + ($_.Exception.Message -replace '[\r\n]', ' ') + ')')
    Write-Output 'IN          wt ? - branch ?'
    Write-Output '<ai4good-attribution pm="-" dev="-"/>'
}
