Implemented Unit 1. No commits, pushes, or stack start/stop commands were run. Attribution: unattributed.

Created:

- `supabase/migrations/20260917120000_project_need_intake.sql`
- `supabase/functions/_shared/need-intake.ts`
- `supabase/functions/_shared/need-intake-copy.ts`
- `supabase/functions/project-need/index.ts`
- `supabase/functions/need-intake/index.ts`
- `tests/at/expected/req-003.json`
- `tests/at/harness/req003-need-oracles.selftest.ts`
- Under `tests/at/suites/req-003/`: `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-need.ts`, and all six requested test files.

Changed:

- `supabase/config.toml`
- Shared modules: `edge.ts`, `public-project.ts`, `write-routes.ts`
- Harness: `shipped-tenant-reads.selftest.ts`, `suite-adapters.ts`
- REQ-001: `_contract.ts`, `_fixture.ts`, `_integration.ts`, `_live.ts`, `_policy-scan.ts`, `d-tenant-isolation.test.ts`

All commands below use `bun run`. Counts distinguish static checks from acceptance results.

| Check | Exit | Green / red |
|---|---:|---|
| `typecheck` | 0 | 3 clean projects / 0 failures |
| `at:check req-003` | 0 | 13 registered P0 IDs / 0 mismatches |
| `at:selftest` | Unrun | Unmeasured |
| `at:verify req-003 --tier loop --expect` | Unrun | Unmeasured |
| `at:verify req-001 --tier loop --expect` | Unrun | Unmeasured |
| `at:verify req-002 --tier loop --expect` | Unrun | Unmeasured |
| `at:verify req-016 --tier loop --expect` | Unrun | Unmeasured |
| `at:verify req-003 --tier integration --expect` | Unrun | Unmeasured |
| `at:verify req-001 --tier integration --expect` | Unrun | Unmeasured |
| `at:verify req-002 --tier integration --expect` | Unrun | Unmeasured |
| `at:verify req-016 --tier integration --expect` | Unrun | Unmeasured |

The initial typecheck exited 1 with seven diagnostics; those were corrected. `git diff --check` passes.

As instructed, runtime checks were left to the lead because of the previously measured sandbox error: `Cannot read directory "../../../../..": Access is denied`. No runtime green is claimed. The manifest declares three green and ten pending red IDs at each tier.

Deviations and clarifications:

- Added REQ-001 exhaustive route cases beyond SYNTHESIS’s listed edits; compilation required them after registering `project-need`.
- The read entry point is 18 lines rather than ten, preserving the existing authentication and validation shape.
- Followed SYNTHESIS’s explicit assigned-volunteer `exists` policy despite the blanket “no subquery” wording.
- Preserved the stable public-read definer without an active-account assertion, as SYNTHESIS specifies. The write definer asserts account activity first.

Open problem: runtime selftests, migration execution, and both acceptance tiers still require the lead’s verification.