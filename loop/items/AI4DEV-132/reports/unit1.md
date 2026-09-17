# Unit 1 report

Commit: `d925dad5fbedda6f7d9f1e160c48b51748313aa0`

Branch: `lane/ai4dev-132`. One implementation commit was created. This report was written
after the commit so it can record the final hash; the report itself is uncommitted.

## Files built or changed

- `supabase/migrations/20260920120000_discovery_turns.sql`: the base's two enums, turn
  table, checks, indexes, grants and SELECT policies; an immutability trigger; private
  `discovery_spend_release`; reserve and settle definers; schema reload. Reservation
  checks membership, email, settings, project, stage, open-turn age and counted sequence.
  It debits the existing allowance and returns locked context. Settlement measures usage,
  caps the charge, records overruns and releases unused reservation credits. All inserted
  rows are free. Funding and switch columns are absent as instructed.
- `supabase/functions/_shared/discovery-metering.ts`: shipped numeric constants, counted
  input plus margin, affordable output, reservation, ceiling-rounded settlement and SQL settings.
- `supabase/functions/_shared/discovery-prompt.ts`: short system prompt and need rendering.
- `supabase/functions/_shared/discovery-turn.ts`: request and row types, send decision,
  caller-bound preparation, request builder, SQL projection, model action, settlement args
  and response rendering. A symbol carries the prepared request through the frame without
  serializing it into RPC arguments. Definite provider errors settle failed; uncertain
  answers carry null settlement args and leave the reservation open.
- `supabase/functions/_shared/anthropic-messages.ts`: official SDK pinned to 0.115.0,
  matching the version named by package.json. Lazy clients, no retries, 120-second timeout,
  token counting, beta fallback generation, served-model recording and error classification.
- `supabase/functions/_shared/write-routes.ts`: promoted inventory row, five refusal kinds,
  optional prepare and settle members. `edge.ts`: caller-JWT settled-turn read, preparation
  before reserve, and optional second RPC with existing refusal mapping. The RPC caller
  remains private. Routes without either optional member retain their original path.
- `supabase/functions/discovery-message/index.ts` and `supabase/config.toml`: one framed
  route entry and its JWT-verification block.
- `.env.example`: empty provider-key entry and two comment lines. Inspected
  `tests/at/harness/local-stack.ts`: its child environment allowlist excludes this key;
  that file was not changed.
- `tests/at/harness/contracts.ts` and `vendors.ts`: Messages test-control and product-port
  contracts, scripted text/tool/error answers, count endpoint, capped output, detached
  request records and a loud script-exhaustion error.
- `tests/at/harness/vendors.selftest.ts`: text and tool results, output capping, counts,
  definite and uncertain errors, detached records and past-the-end cases. Added but not run.
- `tests/at/harness/index.ts`: loop harness builds both vendor simulators and passes both
  ports to adapters; integration retains refusing vendor access and its type omits vendors.
- `tests/at/harness/atconfig.ts` and `config.ts`: all six numeric registry entries and keys.
- `tests/at/harness/suite-adapters.ts`: req-004 registration.
- `tests/at/harness/live-stack.ts`: type declaration for the existing SQL client's transaction
  method, needed by the operator's atomic backdate operation.
- `tests/at/suites/req-003/_fixture.ts` and `_live.ts`: expose the composed organization
  adapter to the consuming suite; the live adapter also exposes its existing bearer resolver.
  This lets req-004 use the same allowance state and authentication handles.
- `tests/at/suites/req-004/_bind.ts`, `_contract.ts`, `_pending.ts`: binding, imported
  product types, Discovery SUT and operator contracts, future seams, named capabilities
  and explicit pending bodies.
- `tests/at/suites/req-004/_fixture.ts`: composes intake; drives the shipped send decision,
  prepare, action, metering and rendering over turn Maps and the inner allowance ledger.
- `tests/at/suites/req-004/_live.ts`: composes intake; posts sends to the deployed route;
  reserves, settles, reads turns, backdates open turns and reads/writes spend as operator.
- `tests/at/suites/req-004/_source-pins.ts`: numeric pins, client model pin read as text,
  and the SQL/TypeScript email-refusal sentence pin.
- `tests/at/suites/req-004/a-metering.test.ts`: real bodies for .01, .02, .08, .47 and .49.
  Loop sends reach the simulator. Integration uses synthetic operator usage and declares
  .02 pending only after accounting assertions. .49 additionally checks keyless preparation,
  no writes, in-flight refusal, abandonment, failed release and repeated-settle refusal.
- `tests/at/suites/req-004/b-funded-routing.test.ts`, `c-remedies.test.ts`,
  `d-conversation.test.ts`, `e-guardrails.test.ts`, `f-transparency.test.ts`: fifteen
  explicit pending registrations for later units of this run.
- `tests/at/suites/req-004/z-later-runs.test.ts`: thirty-eight later-run registrations,
  each naming the capability required by synthesis correction 11.
- `tests/at/expected/req-004.json`: authored before checks. Five loop greens, four
  integration greens, integration .02 pending on the Discovery surface, fifteen pending
  current-run cases and thirty-eight named later capabilities at both tiers.
- `tests/at/suites/req-001/_fixture.ts`: promoted inventory and shipped send decision,
  retaining the auth suite's email gate and message readback assertions.
- `tests/at/suites/req-001/_live.ts`: Discovery sends now reach the deployed route;
  intake setup uses the deployed intake route, and message readback reads settled turns.
- `tests/at/suites/req-001/_integration.ts`: exercises the promoted route in lifecycle
  proofs. The active integration control expects keyless preparation's 502; the deactivated
  control still requires 403 account-deactivated. The email case calls the route and names
  the provider dependency instead of claiming the route is missing.
- `tests/at/suites/req-001/_policy-scan.ts`: tenant catalog entry.
- `tests/at/suites/req-001/_write-route-scan.ts`: retains the general stand-in scan using
  its declared surface union now that every actual inventory entry is an edge route.
- `tests/at/expected/req-001.json`: expectation changes listed below.
- `.claude/skills/verify-ai4good/features/discovery-message.md` and `features/README.md`:
  feature recipe, accounting readbacks, keyless behavior and refusal coverage; no drive script.

## Deviations and implementation resolutions

Two additions to the specified design resolve otherwise conflicting test requirements:

1. The live operator backdate disables only `discovery_turns_immutable` inside one SQL
   transaction, updates an open row, and re-enables it before commit. Correction 4 forbids
   an open-to-open update, while the required backdate must preserve open status. The product
   trigger is not weakened. An exception rolls back the transaction, including trigger state.
2. Scripted replies accept an optional top-level `inputTokens` count override, separate
   from `usage.inputTokens`. Without an override, countTokens uses scripted usage. The override
   allows .49 to count one input size and receive a larger measured input usage, as required.

The following are implementations of the supplied corrections, not additional departures:
null settlement args represent an uncertain result; the prepared request travels as a
non-JSON symbol; the SDK version range is pinned to its named concrete version; the SQL
reservation uses a single minimum-sized debit when the affordable output is below the floor,
so it cannot accidentally debit twice if a concurrent release makes that minimum affordable.
The immutability trigger also prevents rewriting the reservation fields while settling.

No existing allowance definition, sentence or route was changed. No second spend ledger,
fuel implementation, switch implementation, elicitation tool, UI or drive script was added.
Future SUT methods are explicit pending seams. The future switch's response types are local
contract aliases until its shipped module exists in unit 5; implemented judgement types are
imported from shipped modules.

## Req-001 expectation changes

- AT-001.29: integration pending to declared green. Discovery now participates in the
  deployed deactivation proof; its active control reaches keyless preparation.
- AT-001.10: integration remains pending; capability changes from
  `sut.accounts.sendDiscoveryMessage` to `vendors.anthropic`. The route exists, but no-key
  preparation prevents reaching the SQL email floor. Loop assertions remain unchanged.
- AT-001.30: integration remains pending on `gateway.virtual-key-revocation` alone.
  Its deactivated Discovery send is now exercised, so the missing-route capability is removed.
- No loop expectation changed. These are authored expectations, not measured Vitest results.

## Checks

Final `bun run typecheck`: exit 0.

```text
=== typecheck: app (tsconfig.json) ===
=== typecheck: acceptance tests (tests/at/tsconfig.json) ===
=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===
typecheck OK: all three projects clean
```

Final `bun run at:check req-004`: exit 0.

```text
at:check req-004 — 58 P0 in the acceptance file, 58 registered in the suite
RESULT: 58 P0 ids in bijection
```

Final `bun run at:check req-001`: exit 0.

```text
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
```

The first typecheck attempts found adapter typing errors; those were corrected before the
successful final check and commit. Static metering, sentence, route and tenant-catalog scans
returned empty problem lists. The staged whitespace check passed. Inline Bun helpers printed
parent-directory EPERM diagnostics but completed their work; the three requested commands
themselves completed with the results above.

No Vitest, at:selftest, at:verify, migration execution, live provider call or live drive was
attempted. Typecheck does not cover edge.ts, the SDK bridge or the deployed entry point.
The lead must supply the planned runtime evidence and report any failures for correction.

## Blockers and open questions

No implementation blocker remains. Live SQL, SDK compatibility and the declared tier results
await the lead's mechanical verification. The operator bypass and count override above were
chosen to satisfy the requested cases while preserving the production contracts.

One design limitation remains for the lead to consider in later conversation work: the stale
context check binds the highest settled turn sequence, not changes to the mutable intake
between preparation and reservation. This unit implements the specified sequence check;
it does not add a new intake-version protocol.
