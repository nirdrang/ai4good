Implemented unit 4. Attribution: unattributed.

Created:
- `supabase/migrations/20260918120000_project_need_attach.sql`

Changed:
- `supabase/functions/_shared/need-intake.ts`
- `tests/at/suites/req-003/_fixture.ts`
- `tests/at/suites/req-003/_live.ts`
- `tests/at/suites/req-003/d-reference-files.test.ts`
- `tests/at/suites/req-003/_pending.ts`
- `tests/at/expected/req-003.json`

Checks:

| Command | Result |
|---|---|
| `bun run typecheck` | Exit 0; all 3 projects clean |
| `bun run at:check req-003` | Exit 0; 13 P0 IDs, 13 registrations |
| `bun run at:selftest` | Not run |
| `bun run at:verify req-003 --tier loop --expect` | Not run |
| `bun run at:verify req-001 --tier loop --expect` | Not run |
| `bun run at:verify req-002 --tier loop --expect` | Not run |
| `bun run at:verify req-016 --tier loop --expect` | Not run |
| `bun run at:verify req-003 --tier integration --expect` | Not run |
| `bun run at:verify req-001 --tier integration --expect` | Not run |
| `bun run at:verify req-002 --tier integration --expect` | Not run |
| `bun run at:verify req-016 --tier integration --expect` | Not run |

I could not run the remaining checks under the reported sandbox restriction: `Cannot read directory "../../../../..": Access is denied`. Per instruction, I left them to the lead; no runtime counts or exit codes are claimed.

Additional verification: `git diff --check` exited 0. The dispatcher matches unit 2 exactly except for the added `attach` arm.

Deviations from SYNTHESIS: none. AT-003.10 remains pending for unit 5 as instructed. The manifest expects loop 8 green/5 red and integration 6 green/7 red; these counts are not runtime-verified.

Open problem: runtime and integration verification remain outstanding. The pre-existing untracked `loop/items/AI4DEV-120/units/unit4.md` was left untouched. No commits, pushes, or stack changes.