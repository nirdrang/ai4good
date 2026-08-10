SOURCE   loop/items/AI4DEV-79/artifacts/audit2-luna-output.md
REVIEWER gpt-5.6-luna (codex, audit lane, round two)
COUNT    6 findings in source → 6 extracted
NOTES    Box verdicts precede the findings list in the source; reproduced below as context, not as
         a finding. Declared count line `AUDIT: 6 FINDINGS` matches the extracted count. No
         truncation signs.

Box verdicts (from source, lines 3-9):
- Adopted rulings — FAIL: strict reservation, occupancy, and destructive-path guards have uncovered bypasses.
- Declared scope — PASS: the merge-base diff stays within the declared files; the `watch-tip.sh` housekeeping ruling exists.
- Stated facts — FAIL: the committed record contains credential material, and the oracle header's commit count is wrong.
- X1, X2, spike re-proof, T8/T9 reasons, and §9 quote checks — PASS.
- Runtime/CI execution claims — COULD-NOT-VERIFY; no tests or runtime probes were run.

[1] severity: critical   loop/items/AI4DEV-79/artifacts/audit-luna-output.stderr.log:11185
    claim: "The committed audit stderr log embeds raw audit-event output containing JWT-shaped Supabase key values, contrary to AF1 and gate-1 [14]."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/audit2-luna-output.md, finding [1]

[2] severity: high   tests/at/harness/runner.ts:904
    claim: "The exported parameterized resetLocalDatabase can reset a slot target without the required identity read or Docker proof."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/audit2-luna-output.md, finding [2]

[3] severity: high   tests/at/harness/db-pool.ts:635
    claim: "readReservationStrict accepts JSON primitives, and the override's truthiness check treats an existing null reservation as absent."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/audit2-luna-output.md, finding [3]

[4] severity: high   loop/work/db-slots.ps1:137
    claim: "Get-DbSlotOccupancy treats a parsed claim with pid 0 as no occupancy."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/audit2-luna-output.md, finding [4]

[5] severity: high   loop/work/db-slots.ps1:123
    claim: "Claim-directory enumeration errors are silently converted into an empty occupancy result."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-79/artifacts/audit2-luna-output.md, finding [5]

[6] severity: medium   loop/items/AI4DEV-79/oracle-loop.diff:8
    claim: "The oracle header says origin/main is ten commits ahead of c11e352, while the pinned graph has eight descendants."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-79/artifacts/audit2-luna-output.md, finding [6]
