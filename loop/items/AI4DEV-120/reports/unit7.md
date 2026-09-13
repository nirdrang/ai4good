[unattributed] Implemented Unit 7. No deviations from SYNTHESIS.

Created:
- `supabase/migrations/20260919110000_audit_event_kind_need_intake.sql`
- `supabase/migrations/20260919120000_project_need_snapshot.sql`

Changed:
- `supabase/functions/_shared/need-intake.ts`
- `tests/at/suites/req-003/_fixture.ts`
- `tests/at/suites/req-003/_live.ts`
- `tests/at/suites/req-003/_pending.ts`
- `tests/at/suites/req-003/f-snapshot.test.ts`
- `tests/at/expected/req-003.json`

Checks:

| Check | Result |
|---|---|
| `bun run typecheck` | Exit 0; all 3 projects clean |
| `bun run at:check req-003` | Exit 0; 13 acceptance IDs, 13 registrations |
| `git diff --check` | Exit 0; no whitespace errors |
| `bun run at:selftest` | Not run; restriction below |
| `at:verify req-003 --tier loop --expect` | Not run |
| `at:verify req-001 --tier loop --expect` | Not run |
| `at:verify req-002 --tier loop --expect` | Not run |
| `at:verify req-016 --tier loop --expect` | Not run |
| `at:verify req-003 --tier integration --expect` | Not run |
| `at:verify req-001 --tier integration --expect` | Not run |
| `at:verify req-002 --tier integration --expect` | Not run |
| `at:verify req-016 --tier integration --expect` | Not run |

I could not run the remaining checks under the reported sandbox restriction: `Cannot read directory "../../../../..": Access is denied`. Per instruction, these were left to the lead; no runtime counts are claimed.

The manifest expects 13 loop greens and 10 integration greens; the three integration reds retain their existing capability names.

Open problem: runtime and migration verification remain pending. No other implementation problems identified. The pre-existing untracked `loop/items/AI4DEV-120/units/unit7.md` was untouched. No commits, pushes, or stack lifecycle commands were run.