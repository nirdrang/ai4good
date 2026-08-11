SOURCE   loop/items/AI4DEV-62/artifacts/gate2-slice2-flash.raw.txt
REVIEWER opencode-go/deepseek-v4-flash, agent reviewer-flash (identity confirmed via `opencode export`)
COUNT    3 findings in source → 3 extracted
NOTES    Count line `CODE REVIEW: 3 FINDINGS` matches the 3 findings enumerated in the body. The raw file also carries ten numbered "directed answers" (responses to the item's added attack directions) before the Findings section; these are context/verdicts, not additional findings, and none of them assert a defect beyond findings 1-3 below.

[1] severity: LOW (an oracle can pass while the claimed fact is false on a plausible input)   tests/at/suites/req-001/_integration.ts:931-935
    claim: "AT-001.17's Data-API arm asserts only `status >= 400`, so it cannot distinguish privilege denial from table absence or a down PostgREST; the plan's stated mechanism ("the membership table is unreachable through the Data API (F4's privilege layer)") is not what the assertion proves."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-62/artifacts/gate2-slice2-flash.raw.txt:17-20

[2] severity: LOW (latent fixture-vs-database divergence on paths no body drives — invisible to the integration tier)   tests/at/suites/req-001/_fixture.ts:1084-1120, 1161-1179, 1035-1036
    claim: "the fixture's refusal ORDER differs from the database's on three operator paths, producing different kinds than the live tier would: (a) a grant into a nonexistent organisation with a non-NGO account — fixture answers `refused` (org check first), the database fires the BEFORE trigger first and answers `not-an-ngo-account` (42501); (b) an occupied project seat re-pointed at a nonexistent account — fixture answers `refused` (account check first), the database fires the guard trigger first and answers `seat-occupied`; (c) renaming a nonexistent organisation — fixture answers `refused`, the deployed function's REST read returns an empty set and answers `not-a-member`."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-62/artifacts/gate2-slice2-flash.raw.txt:22-25

[3] severity: LOW (declaration-file consistency the plan's own F9 rule treats as load-bearing)   tests/at/suites/req-001/_pending.ts:10
    claim: "the header sentence "Thirteen are written" contradicts the enumeration in the same paragraph, which names 18 written ids (7 + 2 + 4 + 3 + 2), followed by "The other 19" — 18 + 19 = 37, so the enumeration is the true state and "Thirteen" is a stale pre-slice-1 count."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-62/artifacts/gate2-slice2-flash.raw.txt:27-30
