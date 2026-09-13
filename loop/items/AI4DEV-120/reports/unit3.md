[unattributed] Implemented only the three requested files:

- `tests/at/suites/req-003/c-labels.test.ts`: asserts empty labels in write answers, API reads, and stored rows before and after saving a patch.
- `tests/at/suites/req-003/_pending.ts`: removed `labels`.
- `tests/at/expected/req-003.json`: only AT-003.17 moves to expected green at both tiers.

Checks:

- `bun run typecheck`: exit 0; all 3 projects clean.
- `bun run at:check req-003`: exit 0; 13 P0 IDs, 13 registrations, exact bijection.
- `git diff --check`: exit 0; no whitespace errors.
- Loop and integration verification: could not run in this sandbox; skipped as instructed. Reported sandbox error: `Cannot read directory "../../../../..": Access is denied`. No exit codes or runtime counts claimed.

Deviations: none. Existing untracked `loop/items/AI4DEV-120/units/unit3.md` left untouched.

Open problem: the lead must verify both runtime tiers; green results remain unconfirmed.