**Commit:** `2dc30ed26fc780b61d2a46e81332c255b12b0681`

**Checks:** all six green — typecheck 0; at:check 58 ids; selftest 443 passed; req-004 loop 20 green / 38 red; req-004 integration 10 green / 48 red; req-002 loop 20 green / 7 red.

**Deviations:** accounts adapter is passed through the inner fixture so verification uses the emailed link; abandoned turns are backdated to the Unix epoch so the loop clock still treats them as past the deadline.

**Blockers:** none.

**Report:** `loop/items/AI4DEV-132/reports/unit6.md`