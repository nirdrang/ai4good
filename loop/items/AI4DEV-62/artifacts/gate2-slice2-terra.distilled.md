SOURCE   loop/items/AI4DEV-62/artifacts/gate2-slice2-terra.raw.txt
REVIEWER terra (codex, gpt-5.6-terra, effort max)
COUNT    4 findings → 4 extracted
NOTES    declared count line "CODE REVIEW: 4 FINDINGS" matches extracted count; none

[1] severity: medium   tests/at/suites/req-001/_integration.ts:926
    claim: "The known-function control accepts any non-404 response instead of the measured 401 response."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-62/artifacts/gate2-slice2-terra.raw.txt lines 3-6

[2] severity: medium   tests/at/suites/req-001/_integration.ts:935
    claim: "The Data API arm treats every HTTP error as privilege denial."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-62/artifacts/gate2-slice2-terra.raw.txt lines 8-11

[3] severity: medium   tests/at/suites/req-001/_live.ts:645
    claim: "SQLSTATE alone classifies arbitrary `42501` and `23505` failures as the expected membership refusal; the same `42501` shortcut classifies project-seat refusal at line 709."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-62/artifacts/gate2-slice2-terra.raw.txt lines 13-16

[4] severity: medium   tests/at/suites/req-001/_fixture.ts:1084
    claim: "The fixture checks parent/account existence before emulating the database `BEFORE` trigger conditions."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-62/artifacts/gate2-slice2-terra.raw.txt lines 18-21
