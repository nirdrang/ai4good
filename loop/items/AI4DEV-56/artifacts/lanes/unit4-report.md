# Unit 4 lane report

Branch: `lane/ai4dev-56/unit4`. No push. No database start or reset.

## What changed per file

### `tests/at/suites/req-001/_policy-scan.ts`

- `WRITE_PRIVS` now includes `references` and `trigger`.
- The baseline tracker gained `baselineServiceRole`, filled the same way as `baselineAnon` and `baselineAuthenticated`: a `revoke all` on a catalog table adds that table to the set for each named role.
- `dropTable` clears the new set.
- The `no-baseline-revoke` check now requires all three roles. The detail sentence names `anon`, `authenticated` and `service_role`. The code name stays `no-baseline-revoke`.

The tracker already walks every migration in name order. A later file's `revoke all` counts, the same way it already counted for `anon`. The four tables created in `20260808120000` still have no `revoke all` in that file. Overlay `20260906120000` revokes from `anon, authenticated` and then from `service_role`. That later revoke is what fills `baselineServiceRole` for those four tables. No extra same-file rule was added. The real tree still yields `[]`.

### `tests/at/harness/policy-scan.selftest.ts`

- `validSql()` baseline revoke now names `service_role`.
- Two existing replace patterns were updated so they still match that line.
- New case: `grant references on public.projects to service_role` is `service-role-write`.
- New case: `grant trigger on public.projects to service_role` is `service-role-write`.
- New case: a valid tree whose `organizations` revoke names only `anon, authenticated` is `no-baseline-revoke`.

### `loop/items/AI4DEV-56/unit4-record.md`

Short record of the measurement path, why no migration lands, and what the scan now refuses.

## Checks

Each command was run in this worktree. Exit codes are from the process. Trailing lines are the program's own output.

### `bun run typecheck` — exit 0

```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

### `bun run at:check req-001` — exit 0

```
at:check req-001 — 37 P0 in the acceptance file, 37 registered in the suite
RESULT: 37 P0 ids in bijection
```

### `bun run at:selftest` — exit 0

```
 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-unit4/tests/at


 Test Files  15 passed (15)
      Tests  222 passed (222)
   Start at  10:02:16
   Duration  10.42s (transform 4.52s, setup 0ms, import 5.54s, tests 21.87s, environment 2ms)
```

### `bun run at:verify req-001 --tier loop --expect` — exit 0

Last 15 lines:

```
  AT-001.40    green    a platform admin reaches any NGO or project data — the admin role spans all accounts
  AT-001.24    red      CapabilityPending: CAPABILITY PENDING — ui.authenticated-surface-rendering
  AT-001.25    red      AtPending: AT-001.25 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.26    red      AtPending: AT-001.26 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.27    red      AtPending: AT-001.27 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.28    red      AtPending: AT-001.28 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.35    red      AtPending: AT-001.35 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 25 green, 12 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-unit4\tests\at\expected\req-001.json exactly (25 declared green, 12 declared red)
```

## Commit

Message:

```
AI4DEV-56: the static privilege scan refuses references and trigger grants and a baseline revoke that omits service_role
```

Hash: read `git log -1 --format=%H` on `lane/ai4dev-56/unit4`. A file cannot hold its own commit hash.

## Unsure

Nothing in the scan change. The two existing selftest replace patterns had to follow `validSql()` so they still match. The tracker did not need a new later-file rule.
