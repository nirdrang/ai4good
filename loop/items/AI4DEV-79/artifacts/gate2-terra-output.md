Severity scale: critical = concurrent destructive runs; high = breaks slot isolation or safety proof; medium = bypasses a required guard or can strand capacity.

[1] severity: critical    tests/at/harness/runner.ts:440
    claim: An empty or partially written lock file is treated as a dead holder under `dead-pid-only`, so a second occupier can delete a live process’s just-created claim.
    why it matters: Process A creates the file before `writeSync`; Process B reads `{}`, removes it through the takeover gate, and both processes can then reset the same slot. The current race tests never force the open-but-unwritten interval. A two-process barrier after `openSync('wx')` would settle this.
    unverified-runtime-claim: yes

[2] severity: high    tests/at/harness/db-pool.ts:723
    claim: `proveSlotTarget` accepts a valid status result containing zero `supabase_*` container tokens, so its project-identity check can pass vacuously.
    why it matters: Correct slot ports and local keys do not distinguish the incident’s hybrid target; without at least one slot container name, the pre-destructive read can permit a reset without proving resolved Docker identity. Test a tokenless valid status result and capture `supabase status -o json` with all services active.
    unverified-runtime-claim: yes

[3] severity: high    tests/at/harness/db-pool.ts:415
    claim: The full-tree mirror copies ignored `supabase/.temp` and `.branches` runtime state into slots.
    why it matters: `.gitignore` identifies `.temp/start-secrets/**` as generated container secrets; an item worktree that has run the personal stack transfers its secrets and stale CLI state into a supposedly clean slot, violating “state is never inherited.”
    unverified-runtime-claim: no

[4] severity: high    tests/at/harness/db-pool.ts:1161
    claim: The `spike` command resets slot 2 without acquiring either slot’s occupancy claim.
    why it matters: Running the spike while an integration verify is active can drop its slot-2 database and mutate slot 1’s canary table concurrently; D6 requires the occupancy claim even for override-style runs.
    unverified-runtime-claim: no

[5] severity: high    tests/at/harness/db-pool.ts:558
    claim: `AT_DB_SLOT` bypasses branch-derived reservation ownership and the post-claim reservation reread even when invoked from a normal item branch.
    why it matters: A stale or accidental override can make item A prepare and reset an idle slot reserved for item B; the lock prevents simultaneous use, but not this cross-item takeover of the reserved stack.
    unverified-runtime-claim: no

[6] severity: high    tests/at/harness/db-pool.ts:584
    claim: Occupancy locks the previous slot config, while `prepare` can rewrite that config’s listener ports from the current item tree.
    why it matters: If an item changes an accepted 54xxx listener port, the held lock and evidence retain the old API port while later contenders use a new lock filename, allowing concurrent resets and emitting an evidence line for the wrong endpoint.
    unverified-runtime-claim: no

[7] severity: medium    tests/at/harness/db-pool.ts:758
    claim: `resetSlotDatabase`, `stopSlotStack`, and `stackEnv` do not run the broad D5 personal-block guard themselves.
    why it matters: Direct callers bypass the required rejection for a slot config carrying, for example, a personal-band non-API listener; `proveSlotTarget` checks only API/DB coordinates, and `stackEnv` does the same.
    unverified-runtime-claim: no

[8] severity: medium    tests/at/harness/db-pool.ts:246
    claim: `edge_runtime.inspector_port` is remapped from any value, including non-numeric values, instead of refusing every value other than the ruled 8083.
    why it matters: An item can produce a colliding inspector port (for example 8093 → 8103) or write `NaN` into the generated TOML, defeating D2’s fail-closed listener rule.
    unverified-runtime-claim: no

[9] severity: medium    loop/work/db-slots.ps1:153
    claim: `Release-DbSlot` checks occupancy and deletes the reservation without an atomic handoff.
    why it matters: A runner can acquire and validate its occupancy after line 153 but before `Remove-Item`, leaving a live verify window with its reservation removed; another item can then reserve that slot.
    unverified-runtime-claim: yes

[10] severity: medium    loop/work/db-slots.ps1:100
    claim: Two concurrent `Reserve-DbSlot` calls for the same item can reserve both slots.
    why it matters: After both initial scans see no reservation, one caller wins slot 1 and the other proceeds to slot 2; `Release-DbSlot` removes only the first matching reservation, leaving the second to consume pool capacity.
    unverified-runtime-claim: yes

[11] severity: medium    tests/at/harness/db-pool.ts:811
    claim: An interruption between delete/copy and regenerated-config write can permanently strand a slot before the marker recovery logic runs.
    why it matters: The copied source config carries the repository’s personal identity; on the next run `occupy` rejects that config before it reaches `prepare`, or rejects a missing config outright, so the slot cannot self-recover.
    unverified-runtime-claim: yes

[12] severity: medium    tests/at/harness/db-pool.ts:1047
    claim: The personal Docker snapshot can report `IDENTICAL` when both before/after queries return zero containers and volumes.
    why it matters: A wrong Docker context or filter/output mismatch produces two empty arrays, and `snapshotDifferences` treats that as a successful identity proof despite recording none of the personal stack’s required objects. Assert a nonempty expected snapshot or explicitly verify the Docker queries’ coverage.
    unverified-runtime-claim: yes

[13] severity: medium    tests/at/harness/db-pool.ts:386
    claim: The path-closure check validates lexical paths but does not resolve symlinks under `supabase/`.
    why it matters: A configured relative seed, schema, TLS, or signing-key path can be a symlink to an external file; it passes the closure check and is then copied or preserved as an external dependency, contrary to E3’s refusal rule.
    unverified-runtime-claim: yes

CODE REVIEW: 13 FINDINGS