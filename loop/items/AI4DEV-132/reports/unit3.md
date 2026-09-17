# Unit 3 report

Commit: `dd75526973dda0b970280a9747fa923748e2bed3`

Branch: `lane/ai4dev-132`. One implementation commit was created. This report was written
after the commit so it can record the final hash; the report itself is uncommitted.

## Files built or changed

- `tests/at/suites/req-004/c-remedies.test.ts`: real bodies for 03a and 03b. A local
  `remediesOf` helper splits the exhausted sentence after the long dash on `, ` and
  strips a leading `or `. Loop drives the send route. Integration drives the operator
  reserve, then both ids throw pending on the Discovery surface. No product file
  changed. Drain, vet, and the operator reserve already existed on the adapters.
- `tests/at/expected/req-004.json`: loop greens 03a and 03b. Integration records both
  red on `ui.discovery-surface`. Nothing else moved.

## Deviations

None. Integration proves the refusal through `reserveTurnAsOperator`, not the deployed
send route. The send route's prepare step counts tokens first and answers 502 when the
provider key is absent. That matches the metering and funded-routing bodies. The brief
named this path.

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

`bun run at:verify req-004 --tier loop --expect`: exit 0. 58 P0: 12 green, 46 red, matches
the expected file.

`bun run at:verify req-002 --tier loop --expect`: exit 0. 27 P0: 20 green, 7 red, matches
the expected file.

No integration-tier verify, no live stack, no provider call. The lead runs those.

## Blockers and open questions

None. The "shown to the NGO" half of both criteria waits on the Discovery surface.
The operator reserve proves the definer without a provider key.
