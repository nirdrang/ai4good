# Comment audit — AI4DEV-132 (credits engine and funded routing)

Ran in the lane worktree `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-132-unit0`,
branch `lane/ai4dev-132`. Scope: `+` lines added by this branch (`git diff main...HEAD -- . ':!loop' ':!.claude/skills'`)
that are comments (`//`, `/* */`, `--`). 28 candidate lines found, none in markdown,
`.env.example`, or the five discovery-skills files.

## Touched files (comments deleted)

- `supabase/functions/_shared/discovery-switch.ts` — 1 line
- `supabase/migrations/20260921120000_discovery_funded_routing.sql` — 1 line
- `tests/at/harness/req004-absences.selftest.ts` — 3 lines
- `tests/at/suites/req-004/_source-absences.ts` — 8 lines
- `tests/at/suites/req-004/fixtures/grant-tracker.oracle.ts` — 1 line

**Deletion count: 14 comment lines** (across 5 edits; one edit removed a 3-line doc block, one a
7-line doc block plus its trailing blank line, counted as 8 lines removed in that file).

## Deleted comments

1. `supabase/functions/_shared/discovery-switch.ts:1` — file-banner doc comment describing the
   module. Narration, no keep clause applied.
2. `supabase/migrations/20260921120000_discovery_funded_routing.sql:3` — `-- the fuel seam the
   Stripe top-up requirement replaces`. Not the sanctioned "Stripe run adds ... here" call-site
   marker; a narrative justification for a stub function. No keep clause applied.
3. `tests/at/harness/req004-absences.selftest.ts:1-3` — file-banner doc comment restating the
   file's purpose. Narration, no keep clause applied.
4. `tests/at/suites/req-004/_source-absences.ts:1-7` — file-banner doc comment restating the
   module's purpose and its relation to a sibling module. Narration, no keep clause applied.
5. `tests/at/suites/req-004/fixtures/grant-tracker.oracle.ts:9` — inline justification for the
   shape of a fixture's allowed-word set. Justification, no keep clause applied.

## Kept comments, with the keep clause each used

1. `supabase/functions/_shared/anthropic-messages.ts:72` — "Only a helper parameter rejection
   before generation permits a second transport call." Explains a fallback the Anthropic SDK's
   `stream()` forces (it throws on unsupported params rather than degrading). Keep clause:
   non-obvious behavior forced by an external dependency.
2. `supabase/functions/_shared/caller.ts:70-74` — doc comment on the exported `Caller.emailVerified`
   field. Keep clause: doc comment defining a public API contract.
3. `supabase/migrations/20260921120000_discovery_funded_routing.sql:120` — `-- the Stripe run adds
   perform public.project_fuel_reserve(...) here`. Keep clause: sanctioned call-site marker
   (explicit exception given for this exact wording).
4. `supabase/migrations/20260923120000_audit_event_kind_discovery_switch.sql:1-3` — explains that
   PostgreSQL refuses a new enum value in the same transaction that adds it, which is why this
   migration is split from the next one. Keep clause: non-obvious behavior forced by an external
   platform (Postgres).
5. `supabase/migrations/20260923120100_organization_discovery_switch.sql:221` — same sanctioned
   "Stripe run adds ... here" marker as item 3.
6. `tests/at/suites/req-001/_contract.ts:832-835` — doc comment on the
   `clearEmailConfirmationAsOperator` method of the test-contract interface. Keep clause: doc
   comment defining a public API contract (this file is the contract surface for the suite).

## MUST KILL flags

None. Every kept comment used the external-dependency exception or the public-API-contract
exception; no comment described a surprise in our own code that a rename, extract, or type
change could make obvious instead.

## Skips

- `loop/` and `.claude/skills/` excluded from the diff per scope.
- No markdown files, `.env.example`, or discovery-skills files had added comments.

## Checks

- `bun run typecheck` — exit 0, all three projects clean. Output:
  `C:\Users\nirdr\AppData\Local\Temp\claude\C--Users-nirdr-Downloads-ai4good\22279151-5c3d-42b5-b24d-6346ea96a505\scratchpad\ai132_typecheck.txt`
- `bun run at:check req-004` — exit 0, "58 P0 in the acceptance file, 58 registered in the suite;
  RESULT: 58 P0 ids in bijection". Output:
  `C:\Users\nirdr\AppData\Local\Temp\claude\C--Users-nirdr-Downloads-ai4good\22279151-5c3d-42b5-b24d-6346ea96a505\scratchpad\ai132_atcheck.txt`

## Commit

`b564f74d4cdb23914cab36a4dc5392bae6350f3e` on `lane/ai4dev-132`, message "AI4DEV-132: the
comment audit". 5 files changed, 15 deletions (line-count delta includes one now-blank line
removed alongside its comment block).
