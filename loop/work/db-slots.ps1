# db-slots.ps1 - the coordinator's half of the local database slot pool (ASCII-only; PowerShell 5.1).
#
# A slot is one standing local Supabase stack. There are two of them, so two items can verify at
# the same time without resetting each other's database. The pool has two states and three owners:
#
#   RESERVED  - the coordinator takes a slot when an item starts. That is ADMISSION CONTROL: a full
#               pool means the next database-needing item is REJECTED at start, never queued.
#   OCCUPIED  - the harness runner takes the slot for each verify window, and releases it in a
#               finally. That claim is written by tests/at/harness/db-pool.ts, not by this file.
#   released  - the coordinator deletes the reservation at the item sweep.
#
# THIS FILE DOES FILE OPERATIONS ONLY - reserve, release, list. It reads no config.toml and writes
# no config.toml. All TOML lives in tests/at/harness/db-pool.ts, because two rules for one identity
# is how a slot ends up on a personal port.

$ErrorActionPreference = 'Stop'

$script:DbSlotPoolSize = 2

# THE SAME BASE-RESOLUTION CHAIN AS THE HARNESS, all three steps of it: LOCALAPPDATA, then
# XDG_CACHE_HOME, then the system temp path. The harness resolves it that way (poolRoot and
# lockDir in tests/at/harness/), and two resolution rules for one pool is how the two halves stop
# seeing each other's files - this side would write a reservation the runner never reads.
function Get-DbSlotBaseDir([string]$leaf) {
    if ($env:LOCALAPPDATA) { $base = $env:LOCALAPPDATA }
    elseif ($env:XDG_CACHE_HOME) { $base = $env:XDG_CACHE_HOME }
    else { $base = [System.IO.Path]::GetTempPath() }
    return (Join-Path $base ('ai4good-build\' + $leaf))
}

# The pool lives beside the claims it cooperates with and outside every worktree.
# AT_DB_POOL_ROOT overrides it, for tests only.
function Get-DbSlotPoolRoot {
    if ($env:AT_DB_POOL_ROOT) { $root = $env:AT_DB_POOL_ROOT }
    else { $root = Get-DbSlotBaseDir 'db-slots' }
    if (-not (Test-Path $root)) { New-Item -ItemType Directory -Force $root | Out-Null }
    return $root
}

function Get-DbSlotReservationDir {
    $d = Join-Path (Get-DbSlotPoolRoot) 'reservations'
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force $d | Out-Null }
    return $d
}

function Get-DbSlotReservationPath([int]$slot) {
    return Join-Path (Get-DbSlotReservationDir) ('slot-' + $slot + '.json')
}

# Where the harness runner writes its occupancy claims. Same chain, same override, same reason.
function Get-DbSlotClaimDir {
    if ($env:AT_LOCK_DIR) { $d = $env:AT_LOCK_DIR }
    else { $d = Get-DbSlotBaseDir 'at-locks' }
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force $d | Out-Null }
    return $d
}

function Test-DbSlotItemId([string]$item) {
    return ($item -match '^(AI4DEV|AI4PM)-[0-9]+$')
}

function Read-DbSlotReservation([int]$slot) {
    $p = Get-DbSlotReservationPath $slot
    if (-not (Test-Path $p)) { return $null }
    try { return (Get-Content $p -Raw | ConvertFrom-Json) } catch { return $null }
}

# THE SAME READ, BUT IT WAITS OUT THE WRITE WINDOW.
#
# NOT RULED BY GATE 2. Ruling T10 asks the create-failure path in Reserve-DbSlot to re-read the
# reservation; measurement showed that re-read cannot see the winner's file, so the ruled fix alone
# left the defect open. This function and the block that calls it are the executor's completion of
# T10 and need the orchestrator's ratification. Reverting this one commit restores exactly the
# ruled text.
#
# THE MEASUREMENT, on this machine, 2026-08-10. A reservation file is created EXCLUSIVELY and
# filled a moment later. Between those two acts the file EXISTS and cannot be read at all: the
# creating handle holds it with no sharing, so a second reader gets a sharing violation, not an
# empty file. The loser of the race is inside that window by definition - it lost by microseconds.
# With the plain read above, five races out of five ended with one item holding BOTH slots; with
# this read, eight races out of eight ended with one item holding exactly one slot and the loser
# correctly told it already held it.
#
# One second of retries is thousands of times the window. It is the same remedy ruling T1 applies
# to the same window shape in the harness's own claim files.
function Read-DbSlotReservationWait([int]$slot) {
    $p = Get-DbSlotReservationPath $slot
    for ($try = 0; $try -lt 40; $try++) {
        if (-not (Test-Path $p)) { return $null }
        $raw = $null
        try { $raw = Get-Content $p -Raw -ErrorAction Stop } catch { $raw = $null }
        if ($raw -and $raw.Trim()) {
            try { return ($raw | ConvertFrom-Json) } catch { }
        }
        Start-Sleep -Milliseconds 25
    }
    return $null
}

# The occupancy claim the harness writes, if one exists and its holder is still alive.
#
# The claim file name carries the slot's api port, which this file deliberately does not know - it
# reads no config.toml - so the lookup is a glob on the project id. A claim whose pid is gone is
# STALE, not live: the run that wrote it died, and the harness itself would take it over.
function Get-DbSlotOccupancy([int]$slot) {
    $pattern = 'at-verify-ai4good-slot-' + $slot + '-*.lock'
    $files = @(Get-ChildItem -Path (Get-DbSlotClaimDir) -Filter $pattern -File -ErrorAction SilentlyContinue)
    foreach ($f in $files) {
        $holder = $null
        try { $holder = (Get-Content $f.FullName -Raw | ConvertFrom-Json) } catch { $holder = $null }
        if (-not $holder) { continue }
        # NOT-FOUND MEANS DEAD; EVERY OTHER FAILURE MEANS ALIVE. Get-Process reports one specific
        # error when no process holds that id, and it can fail for other reasons - a process owned
        # by another user, for one. The harness's own liveness test treats a permission error as
        # ALIVE, and it has to: an occupancy misread as dead lets Release-DbSlot hand the slot away
        # under a running verify window. Fail closed, exactly as the harness does.
        $alive = $false
        if ($holder.pid) {
            try {
                Get-Process -Id ([int]$holder.pid) -ErrorAction Stop | Out-Null
                $alive = $true
            } catch {
                if ($_.FullyQualifiedErrorId -like 'NoProcessFoundForGivenId*') { $alive = $false } else { $alive = $true }
            }
        }
        if ($alive) {
            return @{ file = $f.FullName; holderPid = [int]$holder.pid; requirement = [string]$holder.requirement; startedAt = [string]$holder.startedAt }
        }
    }
    return $null
}

# What the pool looks like right now. Read-only.
function Get-DbSlotPool {
    $out = @()
    for ($slot = 1; $slot -le $script:DbSlotPoolSize; $slot++) {
        $r = Read-DbSlotReservation $slot
        $o = Get-DbSlotOccupancy $slot
        $item = ''
        if ($r) { $item = [string]$r.item }
        $out += @{ slot = $slot; reservedFor = $item; reservation = $r; occupancy = $o }
    }
    return $out
}

# Take a slot for one item. Exclusive create, so two coordinators cannot take the same slot.
#
# A FULL POOL IS A REJECTION, NOT A WAIT. The ruled design says the next database-needing item is
# rejected at start; a wait here would turn admission control into a queue nobody can see.
function Reserve-DbSlot([string]$Item, [string]$Branch = '') {
    if (-not (Test-DbSlotItemId $Item)) { throw ('not a valid item id: ' + $Item) }

    for ($slot = 1; $slot -le $script:DbSlotPoolSize; $slot++) {
        $r = Read-DbSlotReservation $slot
        if ($r -and ([string]$r.item) -eq $Item) {
            return @{ ok = $true; slot = $slot; alreadyHeld = $true }
        }
    }

    $held = @()
    for ($slot = 1; $slot -le $script:DbSlotPoolSize; $slot++) {
        $path = Get-DbSlotReservationPath $slot
        $fs = $null
        try {
            $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write)
            $o = @{ slot = $slot; item = $Item; branch = $Branch; at = (Get-Date).ToUniversalTime().ToString('o'); holder = ('pid=' + $PID) }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($o | ConvertTo-Json -Depth 4))
            $fs.Write($bytes, 0, $bytes.Length)
            return @{ ok = $true; slot = $slot; alreadyHeld = $false }
        } catch {
            # RE-READ, THEN DECIDE. Two calls for the SAME item can both pass the already-held scan
            # above; one wins slot 1, and without this the loser would read "taken", advance, and
            # win slot 2 - one item holding the whole pool of two. If the reservation that beat us
            # names this same item, this item already has the slot, so say so and stop.
            #
            # The read WAITS OUT THE WRITE WINDOW (see Read-DbSlotReservationWait; NOT ruled by
            # gate 2, the executor's completion of T10, awaiting ratification). A reservation still
            # unreadable after the wait REJECTS this item rather than giving it a second slot: a
            # false rejection is loud and costs one look, a silent double-take costs the pool.
            $r = Read-DbSlotReservationWait $slot
            if ($r) {
                if (([string]$r.item) -eq $Item) { return @{ ok = $true; slot = $slot; alreadyHeld = $true } }
                $held += ('slot ' + $slot + ' -> ' + [string]$r.item)
            } elseif (Test-Path (Get-DbSlotReservationPath $slot)) {
                return @{ ok = $false; rejected = $true; reason = ('slot ' + $slot + ' holds a reservation this call cannot read, so it cannot tell whether that reservation belongs to ' + $Item + '. This item is REJECTED at start rather than given a second slot. Look at ' + (Get-DbSlotReservationPath $slot) + ' and run this again.') }
            } else {
                $held += ('slot ' + $slot + ' -> taken')
            }
        } finally {
            if ($fs) { $fs.Dispose() }
        }
    }

    return @{ ok = $false; rejected = $true; reason = ('the database slot pool is full (' + ($held -join '; ') + '). This item is REJECTED at start, not queued. Finish one of those items, or start an item that needs no database.') }
}

# Give a slot back at the item sweep.
#
# TWO REFUSALS, both of them the point. A reservation is deleted only when it NAMES the item being
# swept, so a sweep can never hand another item's slot away. And a reservation is never deleted
# while a live occupancy claim sits on that slot, because the run holding it is about to reset
# that database and the next item would be given a stack under a running reset.
function Release-DbSlot([string]$Item, [int]$Slot = 0) {
    if (-not (Test-DbSlotItemId $Item)) { throw ('not a valid item id: ' + $Item) }

    $target = 0
    if ($Slot -gt 0) {
        $r = Read-DbSlotReservation $Slot
        if (-not $r) { return @{ ok = $true; released = $false; reason = ('slot ' + $Slot + ' holds no reservation') } }
        if (([string]$r.item) -ne $Item) {
            return @{ ok = $false; released = $false; reason = ('REFUSING: slot ' + $Slot + ' is reserved for ' + [string]$r.item + ', not for ' + $Item) }
        }
        $target = $Slot
    } else {
        for ($slot = 1; $slot -le $script:DbSlotPoolSize; $slot++) {
            $r = Read-DbSlotReservation $slot
            if ($r -and ([string]$r.item) -eq $Item) { $target = $slot; break }
        }
        if ($target -eq 0) { return @{ ok = $true; released = $false; reason = ('no slot is reserved for ' + $Item) } }
    }

    # RESIDUAL, ruled and accepted (gate-2 T9): the window between this check and the delete below
    # is real, and it changes nothing destructive. The serializer for destructive acts is the
    # OCCUPANCY CLAIM, which is dead-pid-only - a live holder is never displaced. A runner that
    # slips into this window still holds its own claim, so the worst outcome is the NEXT item's
    # occupy refusing loudly until the window closes: a loud refusal, never a reset under a live
    # run. An atomic two-file handoff here would buy no safety the claim does not already give.
    $o = Get-DbSlotOccupancy $target
    if ($o) {
        return @{ ok = $false; released = $false; slot = $target; reason = ('REFUSING: slot ' + $target + ' is OCCUPIED right now by pid ' + $o.holderPid + ' running ' + $o.requirement + ' since ' + $o.startedAt + '. A verify window is open on that database. Wait for it to finish.') }
    }

    Remove-Item (Get-DbSlotReservationPath $target) -Force
    return @{ ok = $true; released = $true; slot = $target }
}
