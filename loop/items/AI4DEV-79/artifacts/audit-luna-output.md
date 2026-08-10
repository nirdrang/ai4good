Severity scale: record-false = contradictory project record; high = isolation/ownership breach; medium = required safety or evidence invariant breach.

[1] severity: record-false    loop/items/AI4DEV-79/plan.md:303  
    claim: S8 still requires a green integration-tier `--expect` run.  
    why it matters: X2 correctly says the expected file declares only the loop tier, so `--expect` refuses; this stale criterion conflicts with X2 and the integration transcript’s 0-green result.  
    unverified-runtime-claim: no

[2] severity: high    tests/at/harness/db-pool.ts:695  
    claim: The `AT_DB_SLOT` override treats an existing unreadable reservation as absent.  
    why it matters: `readReservation` converts parse/read failures to `null`, so an empty or partial reservation file does not block takeover of a slot reserved for another item, violating the fail-closed reservation rule.  
    unverified-runtime-claim: no

[3] severity: medium    tests/at/harness/db-pool.ts:1136  
    claim: The evidence line reports the API port from the pre-prepare occupancy configuration.  
    why it matters: `prepare` can regenerate a changed port, and the runtime environment uses the new status while the evidence names the old port, producing misleading verification evidence.  
    unverified-runtime-claim: no

[4] severity: medium    loop/work/db-slots.ps1:110  
    claim: `Get-DbSlotOccupancy` treats an empty or unparseable occupancy claim as no occupancy.  
    why it matters: During the runner’s claim-file creation/write window, release can miss a live claim and delete the reservation, contrary to the release refusal rule; settle by invoking release during that window.  
    unverified-runtime-claim: yes

[5] severity: medium    tests/at/harness/db-pool.ts:328  
    claim: The personal-block guard does not semantically parse every port value.  
    why it matters: A valid TOML value such as `port = 54_321` is read as `54`; an unrecognized/client port field can therefore pass the guard despite carrying a forbidden personal-stack port.  
    unverified-runtime-claim: no

Verdicts:

- Declared diff scope — PASS.
- Gate 1 rulings [1]–[15] and E1–E9 — FAIL.
- Gate 2 rulings T1–T13 and F1–F9 — FAIL.
- X1 isolated commit ratification — PASS.
- X2 integration evidence and corrected criterion — FAIL because S8 remains stale.
- X3 oracle baseline and empty diff — PASS.
- Spike re-proof — PASS.
- T8/T9 rejection reasons — PASS.
- Verbatim quote checks — PASS.
- Runtime and CI claims — COULD-NOT-VERIFY; no tests or CI were executed.

AUDIT: 5 FINDINGS