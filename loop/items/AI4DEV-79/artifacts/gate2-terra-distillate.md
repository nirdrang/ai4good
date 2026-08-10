SOURCE   loop/items/AI4DEV-79/artifacts/gate2-terra-output.md
REVIEWER gpt-5.6-terra (codex CLI, reasoning effort max, sandbox read-only) — draft-code review, reader one of two
COUNT    13 findings in source → 13 extracted
NOTES    none — count line `CODE REVIEW: 13 FINDINGS` matches the 13 findings extracted. Severity scale as stated by reviewer: critical = concurrent destructive runs; high = breaks slot isolation or safety proof; medium = bypasses a required guard or can strand capacity.

[1] severity: critical   tests/at/harness/runner.ts:440
    claim: "An empty or partially written lock file is treated as a dead holder under `dead-pid-only`, so a second occupier can delete a live process's just-created claim."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 3-6

[2] severity: high   tests/at/harness/db-pool.ts:723
    claim: "`proveSlotTarget` accepts a valid status result containing zero `supabase_*` container tokens, so its project-identity check can pass vacuously."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 8-11

[3] severity: high   tests/at/harness/db-pool.ts:415
    claim: "The full-tree mirror copies ignored `supabase/.temp` and `.branches` runtime state into slots."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 13-16

[4] severity: high   tests/at/harness/db-pool.ts:1161
    claim: "The `spike` command resets slot 2 without acquiring either slot's occupancy claim."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 18-21

[5] severity: high   tests/at/harness/db-pool.ts:558
    claim: "`AT_DB_SLOT` bypasses branch-derived reservation ownership and the post-claim reservation reread even when invoked from a normal item branch."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 23-26

[6] severity: high   tests/at/harness/db-pool.ts:584
    claim: "Occupancy locks the previous slot config, while `prepare` can rewrite that config's listener ports from the current item tree."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 28-31

[7] severity: medium   tests/at/harness/db-pool.ts:758
    claim: "`resetSlotDatabase`, `stopSlotStack`, and `stackEnv` do not run the broad D5 personal-block guard themselves."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 33-36

[8] severity: medium   tests/at/harness/db-pool.ts:246
    claim: "`edge_runtime.inspector_port` is remapped from any value, including non-numeric values, instead of refusing every value other than the ruled 8083."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 38-41

[9] severity: medium   loop/work/db-slots.ps1:153
    claim: "`Release-DbSlot` checks occupancy and deletes the reservation without an atomic handoff."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 43-46

[10] severity: medium   loop/work/db-slots.ps1:100
    claim: "Two concurrent `Reserve-DbSlot` calls for the same item can reserve both slots."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 48-51

[11] severity: medium   tests/at/harness/db-pool.ts:811
    claim: "An interruption between delete/copy and regenerated-config write can permanently strand a slot before the marker recovery logic runs."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 53-56

[12] severity: medium   tests/at/harness/db-pool.ts:1047
    claim: "The personal Docker snapshot can report `IDENTICAL` when both before/after queries return zero containers and volumes."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 58-61

[13] severity: medium   tests/at/harness/db-pool.ts:386
    claim: "The path-closure check validates lexical paths but does not resolve symlinks under `supabase/`."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-79/artifacts/gate2-terra-output.md lines 63-66
