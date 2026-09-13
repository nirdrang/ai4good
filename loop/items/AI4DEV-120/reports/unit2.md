Implemented unit 2. Attribution: unattributed.

Created:
- `supabase/migrations/20260917130000_project_need_save_and_submit.sql`

Changed:
- `supabase/functions/_shared/need-intake.ts`
- `tests/at/suites/req-003/_fixture.ts`
- `tests/at/suites/req-003/_live.ts`
- `tests/at/suites/req-003/b-gate-and-autosave.test.ts`
- `tests/at/suites/req-003/_pending.ts`
- `tests/at/expected/req-003.json`

Checks:
- `bun run typecheck`: initially exit 1; corrected the fixture return type. Final exit 0, all three projects clean.
- `bun run at:check req-003`: exit 0; 13 acceptance IDs, 13 registered.
- `git diff --check`: exit 0.

Could not run the following; left to the lead as instructed. Reported sandbox error: `Cannot read directory "../../../../..": Access is denied`. No exit codes or counts claimed:
- `bun run at:selftest`
- `bun run at:verify req-003 --tier loop --expect`
- `bun run at:verify req-001 --tier loop --expect`
- `bun run at:verify req-002 --tier loop --expect`
- `bun run at:verify req-016 --tier loop --expect`
- `bun run at:verify req-003 --tier integration --expect`
- `bun run at:verify req-001 --tier integration --expect`
- `bun run at:verify req-002 --tier integration --expect`
- `bun run at:verify req-016 --tier integration --expect`

SYNTHESIS deviations: none.

Open problem: runtime and integration results remain unverified. Only AT-003.03 and AT-003.05 changed expected classification; other entries remain unchanged. `submitTransition` remains the unit 6 stub.

No commits, pushes, or stack lifecycle commands ran. The existing untracked `loop/items/AI4DEV-120/units/unit2.md` was untouched.