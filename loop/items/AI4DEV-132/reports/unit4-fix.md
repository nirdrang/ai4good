# Unit 4 fix report

Commit: `de4f2ba96c0992812aa8d79f7cce91fb00e69d39`

Branch: `lane/ai4dev-132`. One fix commit was created. This report was written after the
commit so it can record the final hash; the report itself is uncommitted.

## Files changed

- `supabase/functions/_shared/discovery-skills/index.ts`: generated module. It exports
  `DISCOVERY_SKILLS` with the five markdown bodies as template literals, in file order.
- `tests/at/harness/generate-discovery-skills.ts`: Bun generator. It reads the folder with
  `readDiscoverySkillsSync` and writes that module.
- `package.json`: script `discovery:skills` runs the generator.
- `tests/at/harness/discovery-skills.selftest.ts`: also asserts `DISCOVERY_SKILLS` equals the
  node reader, with the failure message `run bun run discovery:skills`. The other bounds stay.
- `supabase/functions/_shared/edge.ts`: `readDiscoverySkills` is removed. The runtime does not
  read the markdown folder.
- `supabase/functions/discovery-message/index.ts`: imports `DISCOVERY_SKILLS` and passes
  `prepare: discoveryPrepare(port, DISCOVERY_SKILLS)`.
- `tests/at/suites/req-004/_fixture.ts`: imports the generated module. The node reader stays
  for the generator and the selftest.
- `supabase/config.toml`: the `static_files` line on `discovery-message` is removed.

The markdown bodies, the prompt, the tool, the streaming path, the migrations and the
acceptance test bodies are unchanged. Fifty-eight `atTest(` call sites remain.

## Probe

A scratch script used the req-004 live adapter: `provisionNgo({ emailVerified: false })`,
`startDiscoveryNeed`, then `sendMessage`. The script was deleted and was not committed.
Redacted answer:

```json
{"ok":false,"status":409,"kind":"email-unverified","reason":"a Discovery message needs a verified email address — this account is email-unverified. Use the verification link sent to the account address, then send the message again"}
```

The local runtime served the new bundle without a restart.

## Checks

`bun run typecheck`: exit 0.

```text
=== typecheck: app (tsconfig.json) ===
=== typecheck: acceptance tests (tests/at/tsconfig.json) ===
=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===
typecheck OK: all three projects clean
```

`bun run at:check req-004`: exit 0.

```text
at:check req-004 — 58 P0 in the acceptance file, 58 registered in the suite
RESULT: 58 P0 ids in bijection
```

`bun run at:selftest`: exit 0.

```text
 Test Files  32 passed (32)
      Tests  428 passed (428)
   Start at  08:38:56
   Duration  9.12s (transform 4.85s, setup 0ms, import 6.38s, tests 23.10s, environment 4ms)
```

`bun run at:verify req-004 --tier loop --expect`: exit 0.

```text
  58 P0: 14 green, 44 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-132-unit0\tests\at\expected\req-004.json exactly (14 declared green, 44 declared red)
```

`bun run at:verify req-004 --tier integration --expect`: exit 0.

```text
  58 P0: 6 green, 52 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-132-unit0\tests\at\expected\req-004.json exactly (6 declared green, 52 declared red)
```

`bun run at:verify req-001 --tier integration --expect`: exit 0.

```text
  AT-001.10    green    an unverified NGO account is blocked from Discovery messages with verification named as the remedy
  38 P0: 29 green, 9 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-132-unit0\tests\at\expected\req-001.json exactly (29 declared green, 9 declared red)
```

## Deviations

None. The requested change is what landed. The branch already held the later reports
commit when this session started, so the fix sits on that head, not on the unit 4
implementation commit alone.

## Blockers

None.
