# Unit 4 lane: the static privilege scan grows before any new table lands

You are a feature writer lane. You work in the worktree you were started in (branch `lane/ai4dev-56/unit4`). You edit files, run the checks, and commit. You do not push. You do not touch any other worktree. You do not start or reset the database; this unit needs no database.

## Why this unit exists

The design (`loop/items/AI4DEV-56/artifacts/arena/design.md`, section "Unit 4 is a check plus a record") and ruling R4 (`loop/items/AI4DEV-56/artifacts/how/rulings.md`): the item asked for a migration that removes leftover TRUNCATE, TRIGGER and REFERENCES grants on four tables. The measurement (`loop/items/AI4DEV-56/artifacts/measure/unit4-privileges-after-reset.txt`) shows that after a reset no client role holds any of them on any public table; the migration `20260906120000` already revoked all. What is still weak is the static scan in `tests/at/suites/req-001/_policy-scan.ts`, which would pass a leftover `REFERENCES` or `TRIGGER` grant to `service_role` and would pass a baseline `revoke all` that omits `service_role`, while the default ACL hands `Dxtm` to every new public table (the measurement, `pg_default_acl` block). So unit 4 is the scan change plus its selftest cases plus a record. No migration.

## Exactly what to change

1. `tests/at/suites/req-001/_policy-scan.ts`
   - `WRITE_PRIVS` (line 188) gains `references` and `trigger`.
   - The baseline check (around line 455) must require the `revoke all ... from` list after `create table` to name `service_role` as well as `anon` and `authenticated`. Read how `baselineAnon` and `baselineAuthenticated` are populated and add `service_role` the same way. Update the `no-baseline-revoke` detail sentence to name all three roles. Keep the code name `no-baseline-revoke`.
   - Check that the real migrations still yield `[]`: the earlier migrations revoke from `anon, authenticated` and the overlay `20260906120000` revokes from all three later. If the baseline tracker only accepts a revoke in the same migration as the `create table`, and the real tree then fails, make the tracker accept a later migration's revoke the same way it already does for `anon` (read the code; do not guess), and say in your report which it was.
2. `tests/at/harness/policy-scan.selftest.ts`
   - One case: `grant references on public.<table> to service_role;` is reported as `service-role-write`.
   - One case: `grant trigger on public.<table> to service_role;` is reported as `service-role-write`.
   - One case: a valid tree whose baseline revoke names only `anon, authenticated` is reported as `no-baseline-revoke`. `validSql()` builds the baseline (line 28); it must now name `service_role` so the valid tree stays valid, and the new case weakens one table's revoke.
   - Match the file's existing style for cases (`weakened(...)`, `expect(...).toContainEqual(...)` or whatever the file does; read it first).
3. `loop/items/AI4DEV-56/unit4-record.md`: a short record (under 300 words, plain sentences, ASD-STE100: short sentences, active voice, one meaning per word) that says what was measured, where (`artifacts/measure/unit4-privileges-after-reset.txt`), why no migration lands, and what the scan now refuses. Cite the measurement file by path; do not restate its tables.

Touch nothing else. No comments that narrate; a comment only for a non-obvious why. Match the existing style of both files.

## Checks, all of which must pass

```
bun run typecheck
bun run at:check req-001
bun run at:selftest
bun run at:verify req-001 --tier loop --expect
```

Run each and keep the exact output. Then commit with this exact message (one commit; if you need more than one, squash to one):

```
AI4DEV-56: the static privilege scan refuses references and trigger grants and a baseline revoke that omits service_role

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01X4L1LDLGqdutW5cMaJsaaG
```

## Report

Write the full report to `loop/items/AI4DEV-56/artifacts/lanes/unit4-report.md` in the worktree (it is committed with the change): what changed per file, each check command with its exit code and the last 15 lines of its output, the commit hash, and anything you were unsure about. Reply with exactly five lines: the commit hash; the four check results as `name: exit code`; one sentence on what you changed in the baseline tracker; one sentence on anything unsure; the report path.
