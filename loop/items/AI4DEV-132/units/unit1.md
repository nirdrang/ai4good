# Unit 1: allowance metering, the turn record, the send route, the stand-in, the suite scaffold

You are the writer for unit 1 of the credits engine run. You work in this worktree on branch
`lane/ai4dev-132`. You may edit, create and run anything under it. Use PowerShell syntax if you
shell out; you are on Windows. Never use Bash syntax.

## Read first, in this order

1. `loop/items/AI4DEV-132/design/SYNTHESIS.md`. The design of record. It wins over everything.
2. `loop/items/AI4DEV-132/design/candidate-4-reserve-settle.md`. The base. Where SYNTHESIS is
   silent, the base holds. Read its Shape section in full: tables, definers, routes, the
   frame's second phase, the `_shared` modules, the client, the stand-in, the suite.
3. `loop/items/AI4DEV-132/how/explanation.md`, section "Constraints for the design". Forty-four
   constraints. Every one binds you.
4. `loop/items/AI4DEV-132/brief.md`, Unit 1 and the facts section.
5. `supabase/migrations/20260916120000_discovery_allowance.sql`,
   `supabase/functions/_shared/discovery-allowance.ts`,
   `supabase/functions/_shared/write-routes.ts`, `supabase/functions/_shared/edge.ts`
   (`writeRoute`, `callDatabaseFunction`, `callerReads`, `requireEnv`),
   `supabase/functions/_shared/need-intake.ts`, `supabase/functions/_shared/verification.ts`
   lines 150 to 170.
6. `tests/at/suites/req-003/` in full (the suite shape you copy), `tests/at/expected/req-003.json`,
   `tests/at/expected/README.md`, `tests/at/harness/contracts.ts`, `tests/at/harness/vendors.ts`,
   `tests/at/harness/index.ts` lines 220 to 250, `tests/at/harness/suite-adapters.ts` lines
   100 to 115, `tests/at/harness/atconfig.ts`, `tests/at/harness/config.ts`,
   `tests/at/harness/pending.ts`, `tests/at/harness/check.ts`.
7. `tests/at/suites/req-001/_fixture.ts` lines 760 to 790 and `_live.ts` lines 1015 to 1035
   (the `discovery-message` stand-in you promote), `tests/at/suites/req-001/_write-route-scan.ts`,
   `tests/at/suites/req-001/_policy-scan.ts` (`TENANT_CATALOG`, `scanWriteGateSql`),
   `tests/at/suites/req-001/_integration.ts` lines 160 to 200.
8. `tests/at/suites/req-002/_source-pins.ts` and `b-allowance.test.ts` (the ids that read the
   ledger you extend; none of them may break).

## What you build

Everything the base's "Per-unit plan" gives unit 1, with SYNTHESIS corrections 1, 2, 3, 4, 6,
7, 8 and 11 applied, and the founder's three rulings at the end of SYNTHESIS. In one list:

1. **Migration** `supabase/migrations/20260920120000_discovery_turns.sql`: the two enums, the
   `discovery_turns` table exactly as the base's SQL with the columns of SYNTHESIS correction 6
   (no `prompt_overhead_tokens` anywhere), its checks, the partial unique index for one open
   turn per project, the `(org_id, utc_day)` index, revoke and RLS and the two SELECT policies,
   the immutability trigger of correction 4, `discovery_spend_release` (no execute grant to any
   role), `discovery_turn_reserve` and `discovery_turn_settle` as the base specifies with the
   input term taken from `p_settings->>'counted_input_tokens'` plus the margin (correction 2),
   and `notify pgrst, 'reload schema'`. Column `billing` exists now; every row this unit writes
   is `'free'`. Do not add `projects.funded_at` (unit 2) or the switch columns (unit 5); the
   reserve definer reads neither yet, and the kill-switch and funding steps of the base's order
   are added in their units. The email floor (step 3 of the base's order) is in this unit.
2. **`TENANT_CATALOG`** gains `discovery_turns: 'tenant-isolated'`.
3. **`_shared/discovery-metering.ts`** (pure): the constants and functions the base lists, with
   `DISCOVERY_INPUT_MARGIN_TOKENS = 64` replacing the estimate heuristic;
   `estimateInputTokens` becomes `countedInputTokens(counted: number): number` (counted plus
   margin). `DISCOVERY_REQUEST_SETTINGS = { model: 'claude-opus-5', maxOutputTokens: 4096,
   minOutputTokens: 512, effort: 'low' }`. Prices `{ input: 5, output: 25 }` micros per token.
   `DISCOVERY_MICROS_PER_CREDIT = 100_000`. `DISCOVERY_TURN_DEADLINE_SECONDS = 150`.
   `DISCOVERY_MESSAGE_MAX_CHARS = 4000`.
4. **`_shared/discovery-turn.ts`** (pure): `decideDiscoveryMessage`, the args and view types,
   `MessagesPort = { create(request): Promise<DiscoveryModelAnswer>; countTokens(request):
   Promise<number> }`, `buildModelRequest`, `settleArgsFrom`, `discoveryAct(port)`,
   `renderDiscoveryMessage`, `turnViewFromSql`. The system prompt in this unit is one short
   constant, `DISCOVERY_SYSTEM_PROMPT_TEMPLATE`, in `_shared/discovery-prompt.ts` with
   `discoverySystemPrompt(need)`; unit 4 replaces its body and adds the skills loader and the
   elicitation tool. `buildModelRequest` sends no tools in this unit. `discoveryAct` classifies
   a failed call per correction 3: an answer with an HTTP status settles `failed`; a timeout or
   connection error leaves the turn open and returns a 502 failure with no settle call.
5. **`_shared/anthropic-messages.ts`** (Deno-only, imported by `discovery-message/index.ts`
   and by no test): `anthropicMessagesPort(): MessagesPort` over `npm:@anthropic-ai/sdk`. Build
   the client inside each call, never at module load. `maxRetries: 0`, `timeout: 120_000`.
   `create` calls `client.beta.messages.create({ model, max_tokens, system, messages,
   output_config: { effort }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })`
   and returns `{ ok: true, text, stopReason, usage: { inputTokens, outputTokens }, model }`
   with `model` the served model from the response; on an SDK `APIError` it returns
   `{ ok: false, status: error.status, reason }`; on any other error `{ ok: false, status: null,
   reason }`. `countTokens` calls `client.messages.countTokens({ model, system, messages })`
   and returns `input_tokens`. Read the key with `requireEnv('ANTHROPIC_API_KEY')` inside the
   call. The file must not contain `/rest/v1/`, `createClient`, `.rpc(` or a service-role key
   name. Version: pin the same `@anthropic-ai/sdk` version `package.json` lists.
6. **The write frame's second phase**: `WriteRouteSpec` gains the optional `settle` member of
   the base; `writeRoute` in `edge.ts` runs it after the first RPC as the base describes.
   Nothing changes for a route without `settle`. `callDatabaseFunction` stays unexported.
7. **The route**: `WRITE_ROUTES['discovery-message']` becomes
   `{ surface: { kind: 'edge', rpc: 'discovery_turn_reserve' }, standing: { kind:
   'account-required', admits: ['ngo'] } }`; `supabase/functions/discovery-message/index.ts`
   is one `Deno.serve(writeRoute({ name, target, decide, settle, render }))`;
   `[functions.discovery-message] verify_jwt = true` in `supabase/config.toml`.
   `WRITE_REFUSAL_KINDS` gains `no-such-project`, `need-not-in-discovery`, `turn-in-flight`,
   `turn-not-open`, `stale-context`. (`discovery-disabled` and `fuel-exhausted` come with
   their units.) The index file names `prepare`, `settle` and `render` beside `decide`.
8. **Constraint 27**: the req-001 loop fixture's `discovery-message` stand-in (its `_fixture.ts`
   lines 760 to 790) drives the promoted inventory row and `decideDiscoveryMessage`; the req-001
   live adapter's `sendDiscoveryMessage` posts to the deployed route instead of throwing
   `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])`. Read AT-001.10 and any other
   req-001 id that calls it, keep their assertions true, and move `tests/at/expected/req-001.json`
   for any id whose tier result changes. Say in your report which ids moved.
9. **`AT_CONFIG` and `CONFIG_KEYS`** (numbers only): `discoveryMicrosPerCredit`
   (`req-004.discovery.micros_per_credit`, 100000), `discoveryInputMicrosPerToken`
   (`req-004.discovery.input_micros_per_token`, 5), `discoveryOutputMicrosPerToken`
   (`req-004.discovery.output_micros_per_token`, 25), `discoveryMaxOutputTokens`
   (`req-004.discovery.max_output_tokens`, 4096), `discoveryMinOutputTokens`
   (`req-004.discovery.min_output_tokens`, 512), `discoveryTurnDeadlineSeconds`
   (`req-004.discovery.turn_deadline_seconds`, 150). The model id is a shipped string constant
   pinned by a source arm, not a config entry.
10. **The stand-in**: `AnthropicMessagesSim` and the port in `tests/at/harness/contracts.ts` and
    `vendors.ts` as the base's "The stand-in: port and sim" section, plus `countTokens` on the
    port: it answers the next scripted reply's `inputTokens` when set, else
    `Math.ceil(JSON.stringify(request.messages).length / 4)`. `Vendors` gains `anthropic`.
    `createHarness` builds it at loop beside the email sim; integration keeps omitting
    `vendors`. Extend `vendors.selftest.ts` for the three reply kinds, `countTokens`, and the
    past-the-end throw.
11. **The suite** `tests/at/suites/req-004/`: `_bind.ts`, `_contract.ts` (the `DiscoverySut`
    of the base, type aliases, judgement types imported from shipped modules), `_fixture.ts`
    and `_live.ts` (both `export const requirement = 'req-004' as const`; the fixture composes
    the req-003 fixture adapter and drives `writePipeline` with `decideDiscoveryMessage`, a
    reserve twin and a settle twin over Maps that call the shipped metering functions and the
    inner allowance debit; the live adapter composes the req-003 live adapter, posts to the
    deployed route, and reaches SQL as the operator for `turnRows`, `reserveTurnAsOperator`,
    `settleTurnAsOperator`, `backdateOpenTurnAsOperator`, `writeSpendRowAsOperator`,
    `spendRows`), `_pending.ts` (every `AWAITED` name of SYNTHESIS correction 11 plus
    `notYet(id)`), `_source-pins.ts` (`meteringPinProblems`, the model-id pin against the
    client file as text, the `email-unverified` sentence pin), and the test files
    `a-metering.test.ts` (01, 02, 08, 47, 49 with real bodies), `b-funded-routing.test.ts`,
    `c-remedies.test.ts`, `d-conversation.test.ts`, `e-guardrails.test.ts`,
    `f-transparency.test.ts` (their ids registered with `notYet(id)` bodies at both tiers),
    and `z-later-runs.test.ts` (the thirty-eight later ids, each `{ default: awaiting(<name>) }`
    with the capability names of correction 11). Exactly fifty-eight `atTest(` call sites.
    Register `'req-004'` in `AdapterModules`.
12. **`tests/at/expected/req-004.json`**, authored now: loop and integration each list this
    unit's five ids per the base's expected file (all five green at loop; at integration
    `01, 08, 47, 49` green and `02` red on `ui.discovery-surface`), the other fifteen ids of
    this run red `{ "kind": "pending", "phase": "sut-missing" }` at both tiers, and the
    thirty-eight later ids red `capability-pending` on their names. Read
    `tests/at/harness/expected.ts` for the exact shapes the loader accepts.
13. **`.env.example`** gains an empty `ANTHROPIC_API_KEY=` line with a two-line comment in the
    file's style. `childEnv` in `tests/at/harness/local-stack.ts` must not pass it; read the
    allowlist and confirm.
14. **The verify skill**: add `discovery-message` to `.claude/skills/verify-ai4good/` the way
    the README there says a new route is added (a feature file and a README row). Do not write
    a drive script; the lead's mechanical agent does that at the item-wide station.

## The AT-004.02 body at loop, and the four others

Follow the base's Usage, unit 1, with the counted input term: the scripted reply's
`inputTokens` sets what `countTokens` answers, so the reservation is
`(inputTokens + 64) * 5 + maxOutput * 25` micros and the charge is
`min(reserved, ceil((inputTokens * 5 + outputTokens * 25) / 100000))`. AT-004.49 scripts a reply
whose `usage.inputTokens` exceeds the counted value by more than the margin, and asserts
`chargedCredits === reservedCredits`, `overrunMicros > 0`, `spentToday <= dailyGrant`; then
drains the allowance to one credit and asserts the next send either runs with a reduced
`maxOutputTokens` or is refused `debit-exceeds-remaining`, never both. AT-004.08 reuses the
req-002 `writeSpendRowAsOperator` backdate. AT-004.47 sends on two projects of one NGO and
reads one spend row. AT-004.01 reads the two grants from `h.config` under the req-002 keys and
never writes 10 or 30.

At integration the five ids run against the deployed route with no key: AT-004.01, .08, .47
and .49 prove reserve and settle through `reserveTurnAsOperator` and `settleTurnAsOperator`
with synthetic usage. The deployed route with no key answers 502 from `prepare` (SYNTHESIS
correction 13), creates no turn row and moves no spend: assert that once, in AT-004.49, and
prove abandonment through the operator seam (`reserveTurnAsOperator`,
`backdateOpenTurnAsOperator`, a second `reserveTurnAsOperator` on the same project settles
the first as `abandoned`). AT-004.02 proves the same accounting and ends in
`throw new CapabilityPending([AWAITED.discoverySurface])`.

## The prepare step (SYNTHESIS correction 13)

Read correction 13 in SYNTHESIS before touching `edge.ts`. The frame gains `prepare` before
the first RPC and `settle` after it. `prepare` for Discovery loads the need and the settled
turns with the caller's JWT through `callerReads` (add `discoveryTurnsOf(projectId)` there),
builds the exact model request, calls `port.countTokens`, and returns the reserve args with
`counted_input_tokens` and `counted_through_seq` plus the built request for `settle.act`.
`discovery_turn_reserve` takes `p_counted_through_seq` and refuses `stale-context` on a
mismatch. The reserve definer still returns the context it locked; `settle.act` sends the
request `prepare` built, which `stale-context` guarantees is the same context.

## Must-nots

- No second spend ledger. `discovery_spend` moves only through `discovery_allowance` and
  `discovery_spend_release`.
- Do not change `discovery_allowance`, its sentences, or the `discovery-allowance` route.
- No `prompt_overhead_tokens`, no character-count estimate anywhere.
- No `Deno`, `npm:` or `fetch` in any `_shared` file except `anthropic-messages.ts`,
  `edge.ts` and `notification-provider.ts`.
- No `10` or `30` in a test body. No `claude-opus-5` string anywhere except
  `discovery-metering.ts` and `anthropic-messages.ts` (the pin compares the two).
- No key in any file. No comment that narrates a step. A comment only for a why the code cannot
  show.
- Do not touch `loop/items/` except to write your report.

## Checks you run

From this worktree: `bun run typecheck` and `bun run at:check req-004` and
`bun run at:check req-001`. Run them until green. Your sandbox cannot run vitest (measured on
the last run); do not try `at:selftest` or `at:verify`. The lead runs them and feeds any red
back to you in a second dispatch.

## Commit

One commit on `lane/ai4dev-132` when typecheck and both bijection checks are green. Message:

```
AI4DEV-132: unit 1, per-turn metering with a reserved turn record

<six to ten lines in plain sentences: the table, the two definers, the promoted
route and the frame's settle step, the SDK client, the stand-in, the suite
scaffold with fifty-eight registrations, the req-001 adapter update and which
ids moved.>
```

No other item id anywhere in the message.

## Report

Write `loop/items/AI4DEV-132/reports/unit1.md`: what you built by file, every deviation from
SYNTHESIS or the base with its reason, the req-001 ids that moved, the output of the three
checks (exit code and last lines), the commit hash, and open questions. Then reply with five
lines: the commit hash, the three check results, deviations (count and one line each), blockers,
and the report path.
