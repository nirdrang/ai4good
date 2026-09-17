Commit: `000a22d7c34005598951ab5a676460559a7aa8ca`.

Checks: `typecheck` 0; `at:check` req-001 and req-004 both 0; `at:selftest` 0 (28 files, 417 tests); `at:verify req-001 --tier loop --expect` 0 (33 green, 5 red); `at:verify req-004 --tier loop --expect` 0 (5 green, 53 red).

Deviations: added `clearEmailConfirmationAsOperator` so the live unverified send has a session; AT-001.31 (re-enable writes) stays declared red on key reissue, as the body still throws that pending; three leftover attempt-1 report files were already deleted in the tree and were not committed.

Blockers: none. Integration-tier verify still belongs to the lead.

Report: `loop/items/AI4DEV-132/reports/unit1-fix.md`.