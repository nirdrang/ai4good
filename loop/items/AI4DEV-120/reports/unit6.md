[unattributed] Unit 6 implemented.

Files changed:
- `supabase/functions/_shared/need-intake.ts`
- `tests/at/suites/req-003/e-submission.test.ts`
- `tests/at/suites/req-003/_pending.ts`
- `tests/at/expected/req-003.json`

The fixture needed no changes. Only AT-003.11 and AT-003.12 moved to expected green at both tiers.

Checks:
- `bun run typecheck`: exit 0; all 3 projects clean.
- `bun run at:check req-003`: exit 0; 13 P0 IDs, 13 registered.
- `git diff --check`: exit 0.
- Loop verification: could not run; left to lead as instructed.
- Integration verification: could not run; left to lead as instructed.
- Reported sandbox error for both tier runs: `Cannot read directory "../../../../..": Access is denied`. No exit codes or counts claimed.

Deviations: none.
Open problems: both tier runs remain unverified.