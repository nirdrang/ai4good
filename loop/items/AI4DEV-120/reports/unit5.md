[unattributed] Implemented Unit 5 in five files:

- `tests/at/suites/req-003/_fixture.ts`
- `tests/at/suites/req-003/_live.ts`
- `tests/at/suites/req-003/d-reference-files.test.ts`
- `tests/at/suites/req-003/_pending.ts`
- `tests/at/expected/req-003.json`

Classification preserves the first timestamp. AT-003.10 checks hardened disclosure on the immediate read and subsequent attach. Only its expected outcome changed.

Checks:

- `bun run typecheck`: exit 0; all 3 projects clean.
- `bun run at:check req-003`: exit 0; 13 required IDs, 13 registered.
- Loop verification: could not run; not attempted per instruction. Reported sandbox error: `Cannot read directory "../../../../..": Access is denied`.
- Integration verification: same restriction; not attempted. Neither verification has an exit code or measured counts.
- `git diff --check`: exit 0; no whitespace errors.

Deviations: none. Open problem: lead must run both verification commands.

Existing untracked `loop/items/AI4DEV-120/units/unit5.md` was left untouched. No Supabase changes, commits, pushes, or stack operations.