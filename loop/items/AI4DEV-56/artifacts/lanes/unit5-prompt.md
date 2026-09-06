# Unit 5 lane: a volunteer cannot unlink the GitHub identity after signup

You are a feature writer lane. You work only in the worktree you were started in (branch `lane/ai4dev-56/unit5`). You edit, run the checks, and commit there. You do not push, and you do not touch any other worktree. Reply with five lines at the end (see Report); everything else goes to the report file.

## What is already on your branch

The first commit on your branch is the lead's doc-sync fold (`d91`): `.taskmaster/docs/acceptance/at-req-001.md` already carries `AT-001.41 (P0)` in section A, the requirement text and the decomposition (`loop/decomp/req-001.md`, D1.L3) are updated, and `loop/state/decisions.jsonl` has `d91`. Because of that commit `bun run at:check req-001` is RED on your branch until you register the test: 38 ids in the file, 37 in the suite. Your commit must SQUASH the fold commit and your change into ONE commit (the fold commit is red on its own, and no commit in this item may be red), with the message given below.

## Read first, in this order

1. `loop/items/AI4DEV-56/brief.md`, unit 5 and facts 1 to 13.
2. `loop/items/AI4DEV-56/artifacts/arena/design.md`: the unit 5 migration sketch (the `WHEN (pg_trigger_depth() = 0)` trigger), call site 3 (the unlink integration body), section 7's unlink rows, section 9 row .41 and the paragraph after the table (the loop arm is a static scan, `identityPermanenceProblems()`), section 10 (`unlinkGithubIdentity`, `linkedIdentities`, `authDelete`, the two identity-permanence scan codes).
3. `loop/items/AI4DEV-56/artifacts/how/rulings.md` R3 and R10, and the two measurements `loop/items/AI4DEV-56/artifacts/measure/unlink-trigger-probe.txt` and `unlink-depth-probe.txt` (the WHEN-clause form refuses the user's direct delete and the operator's direct delete, keeps the row, leaves `/auth/v1/user` at 200, and lets the vendor's admin user delete cascade through; inside the function body the depth already reads 1).
4. `tests/at/suites/req-001/_live.ts` (`linkGithubIdentity` inserts the identity row as the operator with the `::text::jsonb` cast; reuse that shape for the Given), `_fixture.ts` (the fixture's identity map), `_contract.ts`, `_integration.ts`, `_policy-scan.ts` and `tests/at/harness/policy-scan.selftest.ts`, `tests/at/harness/live-stack.ts` (the HTTP helpers; no DELETE helper exists), `a-signup-and-signin.test.ts` (where the D1 ids live), `tests/at/expected/req-001.json`, and the lane reports `loop/items/AI4DEV-56/artifacts/lanes/unit1-report.md`, `unit2-report.md`, `unit3-report.md`.

## Scope of this unit (one commit group)

**The migration** `supabase/migrations/20260911120000_volunteer_github_identity_is_permanent.sql`: the trigger function `github_identity_is_permanent_for_volunteers()` (security definer, `set search_path = ''`, raises `42501` with `detail = 'github-unlink-refused'` when `old.provider = 'github'` and the owning `public.accounts` row is of type `volunteer`, otherwise returns `old`; `revoke execute from public`), and the trigger `volunteer_github_identity_is_permanent` BEFORE DELETE on `auth.identities` FOR EACH ROW `WHEN (pg_trigger_depth() = 0)`. The header comment states the measured facts in two sentences and names the probe files.

**The static arm.** `_policy-scan.ts` gains `identityPermanenceProblems()` (and its pure core over migration files) with two codes: `identity-permanence-missing` when no migration creates a `before delete` trigger on `auth.identities`, and `identity-permanence-unguarded` when that trigger's `create trigger` statement lacks `pg_trigger_depth() = 0` in a `when` clause. Two cases in `policy-scan.selftest.ts`, one per code, plus the real tree yielding `[]`.

**The SUT members** in `_contract.ts`, implemented in both adapters: `unlinkGithubIdentity(session, provider)` (live: `DELETE /auth/v1/user/identities/{identity_id}` with the user's token, the identity id read from `GET /auth/v1/user`; add the private `authDelete` helper to `live-stack.ts` beside the existing HTTP helpers; fixture: consults the identity map and refuses when the account is a volunteer and the provider is github, labelled as a mirror of the trigger), `linkedIdentities(accountId)` (live: the operator reads `auth.identities`; fixture: the map), and `authUserIsHealthy(session)` (live: `GET /auth/v1/user` answers 200; fixture: the session is live).

**AT-001.41** registered through `atTest` in `a-signup-and-signin.test.ts` (it is a D1 id), green at both tiers, with the design's call site 3 as the integration body and a loop body that asserts `identityPermanenceProblems()` is `[]` and drives the fixture mirror: a volunteer with email and github identities, the unlink refused, the github row still present, the user still healthy; and the NGO control, whose github identity is not mandatory and unlinks. The oracle is the row and the user's health, never GoTrue's status (measured 500; R10). Add `AT-001.41` to `tests/at/expected/req-001.json` green at both tiers. `at:check` must report 38 in bijection.

Nothing else.

## Rules you must keep

- The harness takes no new machinery: no new sentinels, faults, vendor stand-ins, fixture worlds, or capabilities.
- Every changed line traces to this unit. Do not reformat neighbours. No narrating comments; a comment only for a non-obvious why. ASD-STE100 in every sentence a person reads.
- Do not name any Linear id other than AI4DEV-56 in the commit message.

## Checks, all green before you commit

```
bun run typecheck
bun run at:check req-001
bun run at:selftest
bun run at:verify req-001 --tier loop --expect
```

Then the integration tier on the one local stack, from your worktree, in this order, keeping the output:

```
bun run db:stop
bun run db:start
bun run db:reset
bun run at:verify req-001 --tier integration --expect
```

If the stack fails to start, report it and stop; do not retry more than twice. Leave the stack running when done.

## Commit

ONE commit that squashes the fold commit already on your branch together with your change (for example `git reset --soft <the commit before the fold>` then one commit), message exactly:

```
AI4DEV-56: a volunteer cannot unlink the GitHub identity after signup (d91, AT-001.41 at both tiers)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01X4L1LDLGqdutW5cMaJsaaG
```

## Report

Write `loop/items/AI4DEV-56/artifacts/lanes/unit5-report.md` in your worktree before the commit: files changed and why, deviations from the design with reasons, each check command with its exit code and the last 20 lines of output including the integration run's timestamps, open doubts. Reply with exactly five lines: the commit hash; the eight check results as `name: exit code`; one sentence naming any deviation from the design; one sentence on the biggest doubt; the report path.
