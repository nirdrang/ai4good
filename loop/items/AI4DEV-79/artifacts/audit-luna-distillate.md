SOURCE   loop/items/AI4DEV-79/artifacts/audit-luna-output.md
REVIEWER gpt-5.6-luna (codex, effort max, sandbox read-only) — audit gate, reader one of two
COUNT    5 findings in source → 5 extracted
NOTES    none — count line `AUDIT: 5 FINDINGS` matches the 5 findings in the body.

[1] severity: record-false   loop/items/AI4DEV-79/plan.md:303
    claim: "S8 still requires a green integration-tier `--expect` run."
    why it matters: "X2 correctly says the expected file declares only the loop tier, so `--expect` refuses; this stale criterion conflicts with X2 and the integration transcript's 0-green result."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/audit-luna-output.md:3-6

[2] severity: high   tests/at/harness/db-pool.ts:695
    claim: "The `AT_DB_SLOT` override treats an existing unreadable reservation as absent."
    why it matters: "`readReservation` converts parse/read failures to `null`, so an empty or partial reservation file does not block takeover of a slot reserved for another item, violating the fail-closed reservation rule."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/audit-luna-output.md:8-11

[3] severity: medium   tests/at/harness/db-pool.ts:1136
    claim: "The evidence line reports the API port from the pre-prepare occupancy configuration."
    why it matters: "`prepare` can regenerate a changed port, and the runtime environment uses the new status while the evidence names the old port, producing misleading verification evidence."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/audit-luna-output.md:13-16

[4] severity: medium   loop/work/db-slots.ps1:110
    claim: "`Get-DbSlotOccupancy` treats an empty or unparseable occupancy claim as no occupancy."
    why it matters: "During the runner's claim-file creation/write window, release can miss a live claim and delete the reservation, contrary to the release refusal rule; settle by invoking release during that window."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-79/artifacts/audit-luna-output.md:18-21

[5] severity: medium   tests/at/harness/db-pool.ts:328
    claim: "The personal-block guard does not semantically parse every port value."
    why it matters: "A valid TOML value such as `port = 54_321` is read as `54`; an unrecognized/client port field can therefore pass the guard despite carrying a forbidden personal-stack port."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/audit-luna-output.md:23-26
