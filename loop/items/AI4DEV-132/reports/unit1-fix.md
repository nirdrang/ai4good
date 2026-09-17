# Unit 1 fix report

Commit: `000a22d7c34005598951ab5a676460559a7aa8ca`

Branch: `lane/ai4dev-132`. One fix commit was created. This report was written after the
commit so it can record the final hash; the report itself is uncommitted.

## Files changed

- `supabase/functions/_shared/caller.ts`: `Caller` gains `emailVerified`. `callerFromAuthAnswer`
  derives it from the Auth user body through the shipped `emailVerifiedFromUser`.
- `supabase/functions/_shared/discovery-turn.ts`: `discoveryPrepare` calls
  `discoveryMessageAllowed` on the caller before any read or token count, and refuses
  `email-unverified` with HTTP 409 and the gate's own sentence. Turn-row types move out.
- `supabase/functions/_shared/discovery-reads.ts`: new home for `DiscoveryTurnSqlRow`,
  `DiscoveryReads` and `CallerReads`.
- `supabase/functions/_shared/tenant-reads.ts`: re-exports those three types.
- `supabase/functions/_shared/write-routes.ts` and `edge.ts`: import `CallerReads` from the
  reads module, not from the send-route module.
- `tests/at/suites/req-001/_fixture.ts`, `_live.ts`, `_contract.ts`: every constructed
  `Caller` carries the account's verification state. The live and loop adapters add
  `clearEmailConfirmationAsOperator` so a completed account can be made email-unverified
  while its session stays live. The Discovery send consults `caller.emailVerified`.
- `tests/at/suites/req-001/_integration.ts`: AT-001.10 confirms, completes, clears
  confirmation as operator, then asserts 409 `email-unverified` and an empty message
  read-back. AT-001.31 asserts a re-enabled volunteer Discovery send is refused
  `not-an-ngo-account` (403).
- `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts`: the volunteer half of AT-001.31
  no longer expects a successful Discovery send.
- `tests/at/suites/req-002/_fixture.ts`, `req-003/_fixture.ts`, `req-004/_fixture.ts`:
  every constructed `Caller` sets `emailVerified` from the account's verification state.
- `tests/at/harness/shipped-*.selftest.ts`: Caller literals include `emailVerified`. The
  caller oracle asserts the confirmed body and the pre-narrowed body.
- `tests/at/harness/write-route-scan.selftest.ts` and
  `tests/at/suites/req-001/_write-route-scan.ts`: the stand-in case passes a synthetic
  inventory with one stand-in row to `scanWriteRoutes`.
- `tests/at/expected/req-001.json`: AT-001.10 moves to green at integration. AT-001.29
  stays green (the verified active Discovery control still answers 502 without a key).
  AT-001.30 stays red on `gateway.virtual-key-revocation`.

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

`bun run at:check req-001`: exit 0.

```text
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
```

`bun run at:selftest`: exit 0. 28 files, 417 tests passed.

`bun run at:verify req-001 --tier loop --expect`: exit 0. 38 P0: 33 green, 5 red, matches the
expected file.

`bun run at:verify req-004 --tier loop --expect`: exit 0. 58 P0: 5 green, 53 red, matches the
expected file.

No integration-tier verify, no live stack, no provider call. The lead runs those.

## Deviations

1. The auth suite gained `clearEmailConfirmationAsOperator`. The live public path cannot
   construct a completed-but-unverified NGO with a live session, because confirmations are
   on. The integration body for the unverified Discovery send needs that Given. The SQL
   clear matches the organisation suite's existing operator pattern. No product SQL changed.
2. AT-001.31 stays declared red at both tiers on `gateway.virtual-key-reissue`. The brief
   said it stays green. The expected file already had it red, and the body still throws that
   pending after the other assertions. The volunteer-half assertions changed as asked. The
   expected colour was not moved.
3. Three unrelated files under `loop/items/AI4DEV-132/reports/` were already deleted in the
   working tree (`unit1-attempt1` leftovers). They were not staged and are not in this
   commit.

## Blockers

None. Integration evidence for the unverified Discovery send still belongs to the lead.
