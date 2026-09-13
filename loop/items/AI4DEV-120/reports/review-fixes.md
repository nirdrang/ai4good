Applied all requested edits in these 12 files:

- `supabase/functions/_shared/write-routes.ts`
- `supabase/functions/_shared/need-intake.ts`
- `supabase/functions/need-intake/index.ts`
- `supabase/migrations/20260917120000_project_need_intake.sql`
- `supabase/migrations/20260917130000_project_need_save_and_submit.sql`
- `supabase/migrations/20260918120000_project_need_attach.sql`
- `supabase/migrations/20260919120000_project_need_snapshot.sql`
- `supabase/config.toml`
- `tests/at/suites/req-003/_fixture.ts`
- `tests/at/suites/req-003/a-capture.test.ts`
- `tests/at/suites/req-003/b-gate-and-autosave.test.ts`
- `tests/at/suites/req-003/e-submission.test.ts`

Checks, in order:

- `bun run typecheck` — exit 0; all three projects clean.
- `bun run at:check req-003` — exit 0; all 13 P0 IDs in bijection.

Edits not made as written: none. Selftests and acceptance execution were not run; those remain with the lead.