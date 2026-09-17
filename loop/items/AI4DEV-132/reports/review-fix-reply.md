**Commit:** `6a7bcd4c26a373f5320c2ac08dc65566e79b0281`

**Checks:** All eight exited 0 — typecheck clean; `at:check` 58 and 38 in bijection; selftest 445 passed; loop `--expect` matched (req-004 20 green / 38 red, req-001 33 green / 5 red); integration `--expect` matched with the key (req-004 10 green / 48 red, req-001 29 green / 9 red).

**Deviations:** Reserve settings `model` is typed as `string` so an override type-checks; the conversation read type and live adapter accept `allowance: null`; context assembly is one helper shared by prepare and the fixture reserve twin.

**Blockers:** None.

**Report:** `loop/items/AI4DEV-132/reports/review-fix.md`