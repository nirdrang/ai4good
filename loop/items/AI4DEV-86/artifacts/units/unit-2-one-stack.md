# Unit 2 brief: the one-stack integration path (writer: fable, hardest tasks)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86, branch nirdrang/ai4dev-86-the-v1-ceremony-leaves-the-codebase-and-ci-aligns-with-the. You write in this worktree and commit on this branch. Nobody else writes while you do.

## The design you implement (the arena base, candidate A, with grafts)
Read loop/items/AI4DEV-86/artifacts/arena/candidate-fable.md in full: its Usage, Shape, and the nine answers are the contract. Then apply these grafts and corrections:
1. The evidence line also names the tested commit and the tree state: `... — lock <file> — head <git rev-parse --short HEAD><, dirty when git status --porcelain is non-empty>`. Read git through spawnSync with childEnv(); never print anything key-shaped.
2. Add the two dead-pid-only lock tests to runner.selftest.ts (they exist today only in db-pool.selftest.ts, which leaves): a live holder of any age is refused; an unidentifiable claim file is refused and left in place.
3. stackHelp cause 2 reads: the one stack is not up, or was started before supabase/config.toml last changed: run `bun run db:stop` then `bun run db:start`.
4. No docker probe. No new module. No CONFIG_KEYS row. The names attestSlot, AT_SLOT_ATTESTATION, at_runtime.slot_attestation, SLOT_ATTESTATION_BRAND, LiveSlotCoordinates, ProvenSlotRead stay as they are.

## Files you may touch
- tests/at/harness/runner.ts
- tests/at/harness/runner.selftest.ts
- tests/at/harness/atconfig.ts
- tests/at/harness/attestation.ts (one prose word at line 5 only)
- tests/at/suites/req-001/_fixture.ts, _integration.ts, b-verification-and-sessions.test.ts (the lifetime reads only)
- supabase/config.toml (line 174 and a comment)
- .claude/settings.json (remove the AT_DB_SLOT env entry only)
- git mv tests/at/harness/db-pool.ts and db-pool.selftest.ts to loop/parked/v1/tests/at/harness/ (byte-identical); git mv loop/work/db-slots.ps1 to loop/parked/v1/loop/work/
- loop/parked/v1/README.md (new; a placeholder section per parked thing is fine, unit 1 extends it): say the files are dead text under version control, not compiled, not run, not imported, that their relative imports no longer resolve, that they still carry the personal-stack refusals this tree no longer believes, and that `bun tests/at/harness/db-pool.ts setup` must never be run.
Nothing else. Not tests/at/expected/, not index.ts, not live-email.ts, not capabilities.ts, not any file under .claude/skills or loop/work beyond the one move.

## Order of work (each step ends green before the next)
1. Write the failing tests first in runner.selftest.ts: the describe for ownContainerNames / foreignContainerNames and identityVerdict (proves on own names plus a local status; refuses a foreign name before parsing; refuses no own name at all with "ports alone are not identity"; refuses a status that fails localStackProblems, naming the check), and the two lock tests. Run `bun run at:selftest` and watch them fail.
2. Add the one-stack section to runner.ts with real bodies; move the two name helpers from db-pool.ts (same regex, parameter renamed to projectId); delete the no-target resetLocalDatabase overload, the seam's `undefined` branch and readStackStatus; narrow SlotIdentityProof.provenProjectId to string; remove the deleted selftest ("refuses a read that proved no project at all"); replace the integration branch and the import at line 44; rewrite the header, stackHelp and the drill refusal per the candidate. Run `bun run typecheck`; the error list is the edit list.
3. The lifetime: atconfig entry accessTokenLifetimeSeconds = 120 (name, unit seconds, source naming supabase/config.toml [auth] jwt_expiry and this item's ruling); _fixture.ts, _integration.ts (export ACCESS_TOKEN_LIFETIME_MS; both waits use it), b-verification-and-sessions.test.ts (405 and 519 use the exported constant and constant minus 1000); config.toml jwt_expiry = 120 with a two-line comment naming the atconfig entry.
4. The moves and the README. Then `bun run typecheck`, `bun run at:selftest` (expect 12 files; 349 minus 33 plus the new tests), `bun run at:verify req-001 --tier loop --expect`, `bun run at:verify req-016 --tier loop --expect`.
5. Restart the stack once so Auth reads the new lifetime: `bun run db:stop` then `bun run db:start`. Then `bun run at:verify req-001 --tier integration --expect`. It must print the identity line, the migration line, the evidence line, and end with the EXPECTED match (16 green, 21 declared red). AT-001.12 and AT-001.13 take about 135 s and 150 s.
6. Commit everything as ONE commit on this branch with this message body (first line exactly): `AI4DEV-86: the integration tier targets the one stack; the slot pool is parked`. Body: what moved, what was deleted, the lifetime pin and its cost, the evidence line shape. End with the trailer lines `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01SikdZcn3PmB9SrZ4dL1ziT`. Do not push.

## Measured facts you can rely on
- `bunx supabase status` on this stack prints `Stopped services: [supabase_imgproxy_poancmeitlmxejofwzuu supabase_pooler_poancmeitlmxejofwzuu]` on stderr (measured 2026-09-02); those are the own container names.
- Mailpit answers on http://127.0.0.1:44324/api/v1/info (v1.30.2).
- The stack is up on api 44321, db 44322. Ports in config.toml: api 44321, db 44322, shadow 44320, studio 44323, mailpit 44324, analytics 44327, pooler 44329.
- Baseline before your change: typecheck clean; at:selftest 13 files 349 tests; req-001 loop --expect 21 green 16 red; req-016 loop --expect 11 green 1 red; integration refused (slot reservation).

## Report
Reply with: the commit hash; the output tail of each of the five commands with timestamps; the count of selftest files and tests after; any deviation from the candidate, each classed as "the sketch was wrong", "a requirement was missed", or "I overreached"; BLOCKED with the exact error if you could not finish. Do not summarise what you did instead of showing the command output.