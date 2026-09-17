## Findings

### 1. [critical] Client cancel is settled at the output cap, not measured usage
**Location**: `supabase/functions/_shared/anthropic-messages.ts:45-46,52-58`, `tests/at/harness/vendors.ts:67-68`
**Finding**: Both the live stream port and the sim charge `request.maxTokens` on abort instead of the tokens actually streamed.
**Evidence**: Live `stopped()` returns `outputTokens: sawDelta ? usage.outputTokens : request.maxTokens`. `sawDelta` is set only on `message_delta` (end of stream); `content_block_delta` text appends to `text` and calls `onDelta` but never sets `sawDelta` nor updates `usage.outputTokens`. An abort mid-text therefore takes the `maxTokens` branch. The sim does the same explicitly on `signal.aborted`. The stated intent is "a client cancel settles the turn with the measured usage" — this settles a 1-delta cancel as ~4096 output tokens (~1 credit) instead of ~5 tokens (~0 credits).
**Suggestion**: Track output tokens from text deltas (or provider `usage` snapshots) and return partial `usage` on abort; make the sim mirror it.

### 2. [critical] Funded turns never consume fuel in SQL; fixture diverges from prod
**Location**: `supabase/migrations/20260920120000_discovery_turns.sql:221-272` (`discovery_turn_settle`), `tests/at/suites/req-004/_fixture.ts:122-125`
**Finding**: The shipped settle computes `v_actual`/`v_charged` and releases free credits but never debits project fuel. The loop fixture does `entry.fuelMicros -= result.actualMicros`.
**Evidence**: Settle has no reference to `project_fuel_available_micros` or any fuel reserve/consume call; for `billing='fuel'`, `reserved_credits=0` so `v_charged=0` and no release, then returns a free-pool read. Reserve's fuel branch admits "the Stripe run adds `project_fuel_reserve` here" and holds nothing, so concurrent funded reserves can both pass the same `v_fuel` check. Masked today because the stub returns `0` (all funded refuse), but once the stub returns real fuel every funded turn is free forever, and loop greens for funded billing prove behavior prod does not have.

### 3. [critical] Stream fallback retry resends the same incompatible params
**Location**: `supabase/functions/_shared/anthropic-messages.ts:64-78`
**Finding**: When the `beta.messages.stream` helper rejects on `betas`/`fallbacks`, the code falls through to `beta.messages.create({...params, stream:true})` with the identical `params`.
**Evidence**: `incompatible` tests `/betas|fallbacks/` on the error message, then does not strip those fields before the second transport call. If the rejection was caused by `betas`/`fallbacks`/`output_config`, the second call fails identically and surfaces as a generic 400/`TypeError` failure instead of recovering. The retry only helps if the helper itself is missing, not if the params are wrong.

### 4. [critical] `prepare` pays for token counting before reserve's refuses, and inverts disabled-before-email order
**Location**: `supabase/functions/_shared/discovery-turn.ts:79-100`, `supabase/migrations/20260923120100_organization_discovery_switch.sql:145-152`
**Finding**: Edge runs `prepare` (email check, need/turn reads, `port.countTokens`) before `discovery_turn_reserve`. Reserve refuses `discovery-disabled` before `email-unverified`; prepare checks email first and never checks disabled.
**Evidence**: Disabled org + unverified caller gets `email-unverified` from prepare and never reaches reserve, contradicting "the reserve refuses `discovery-disabled` before the email floor". Disabled, `need-not-in-discovery`, `turn-in-flight`, `fuel-exhausted`, and cross-org `projectId` (prepare never verifies `project.org_id === target`) all still incur a provider `countTokens` call and latency before reserve rejects.

### 5. [warning] Uncertain outcomes lock the project and then charge full price for nothing
**Location**: `supabase/functions/_shared/edge.ts:424-426`, `supabase/migrations/20260920120000_discovery_turns.sql:177-178`
**Finding**: Non-stream `acted.args===null` returns 502 with no settle, leaving the reservation debited and the project blocked for 150s; the next reserve abandons at `charged_credits=reserved_credits`.
**Evidence**: `if (acted.args === null) return refusal(...502)` discards the open turn id, so the caller cannot fail it explicitly. After the deadline the SQL does `status='abandoned', charged_credits=reserved_credits` with no release. A transient timeout between reserve and settle therefore costs a full reservation (~1-2 credits) and a 150s `turn-in-flight` lockout, while a definite provider 4xx/5xx settles as `failed` for 0. There is no fail-without-new-message path.

### 6. [warning] Conversation read path has no lifecycle gate
**Location**: `supabase/functions/discovery-conversation/index.ts:10-16`, `supabase/migrations/20260922120000_discovery_conversation.sql:13-15`
**Finding**: The read route authenticates via Auth only; it never consults `write_standing`/lifecycle, and `viewer_discovery_allowance` never calls `assert_account_active`.
**Evidence**: `discovery_allowance` calls `assert_account_active`; the viewer variant checks only `viewer_is_org_member`. `discovery-conversation` calls `conversationAnswer` directly after `resolveCaller`. A deactivated account whose JWT still verifies at Auth retains membership rows, so RLS still passes and it can read turns and allowance. Writes correctly gate `account-deactivated` first.

### 7. [warning] Generic `writeRoute` is hardcoded to Discovery streaming
**Location**: `supabase/functions/_shared/edge.ts:33,382-422`
**Finding**: The shared frame imports `discovery-stream`, sniffs `Accept: text/event-stream`, and emits `DISCOVERY_STREAM_HEADERS` for any spec with `settle.stream`.
**Evidence**: `import * as discoveryStream` plus `wantsEventStream`/`DISCOVERY_STREAM_HEADERS` inside `writeRoute`. Only `discovery-message` uses `settle` today, so no live misroute yet, but the next route to add a stream inherits Discovery framing, and a non-UI caller sending `Accept: text/event-stream` to `discovery-message` silently changes content-type and envelope. `prepare`/`settle` should be generic with caller-supplied stream framing.

### 8. [warning] `elicitation` has no DB shape guard; SQL trusts TS validation
**Location**: `supabase/migrations/20260920120000_discovery_turns.sql:14`, `supabase/migrations/20260920120000_discovery_turns.sql:256-260`
**Finding**: `elicitation jsonb` carries no `CHECK`, and settle stores `p_elicitation` verbatim.
**Evidence**: `parseElicitation` enforces 5 keys, `complete===true`, string arrays, and 2-key stories, but the table and `discovery_turn_settle` enforce nothing. Any service-role caller (or future TS regression) can persist malformed records that `conversationAnswer`/`turnViewFromSql` then serve and the oracle later rejects. Add a `CHECK` mirroring the 5-field/strict shape or validate in plpgsql.

### 9. [warning] Fixture reserve skips message/settings validation the SQL enforces
**Location**: `tests/at/suites/req-004/_fixture.ts:40-60`
**Finding**: Fixture `reserve` checks membership, switch, email, need stage, in-flight, and stale-context, but never message emptiness/length or `p_settings` numeric ranges and `min<=max`.
**Evidence**: SQL validates eight numeric settings via regex/range plus `min<=max` and `btrim(p_message)` length. Fixture builds the row directly from `args.p_message`/`args.p_settings.counted_input_tokens` (operator path defaults `counted_input_tokens` to 0, allows negatives). Loop tests can therefore pass inputs live would refuse with `invalid-request`, hiding decide/reserve gaps.

### 10. [warning] Recording script keeps the handwritten elicitation alongside recorded replies
**Location**: `tests/at/suites/req-004/fixtures/record-grant-tracker.ts`
**Finding**: The recorder captures live `replies` (including the live tool `input`) but regenerates the file with the old imported `GRANT_TRACKER_ELICITATION` constant.
**Evidence**: `replies.push({kind:'tool', input: answer.elicitation, ...})` then `source = ... JSON.stringify(GRANT_TRACKER_ELICITATION ...)`. If the recorded elicitation differs from handwritten yet still passes the oracle, the emitted file pairs recorded deltas with a stale elicitation export. Export the recorded tool input (or assert equality) instead.

### 11. [warning] Model `refusal` stop is billed as a completed turn
**Location**: `supabase/functions/_shared/discovery-turn.ts:107-119`
**Finding**: `settleArgsFrom` maps any `ok:true` to `p_outcome='completed'` regardless of `stopReason`.
**Evidence**: `p_outcome: answer.ok ? 'completed' : 'failed'`. The sim explicitly scripts `stopReason:'refusal'` text replies and `record-grant-tracker.ts` treats `refusal` as recordable. A provider refusal (content filter, fallback refusal) is therefore stored and charged at `min(reserved, ceil(actual/ratio))` instead of settling as `failed` for 0.

### 12. [warning] Reserve builds a context the model call discards
**Location**: `supabase/functions/_shared/discovery-turn.ts:121-137`, `supabase/migrations/20260923120100_organization_discovery_switch.sql:234-238`
**Finding**: SQL aggregates `v_context` (settled turns + new message) and returns it, but `discoveryAct`/`discoveryStream` ignore `reservation.context`/`need` and call the provider with `args[PREPARED_REQUEST]` built from RLS reads.
**Evidence**: `renderReservation` returns `context`, yet `act` uses `{...prepared, maxTokens: reservation.turn.max_output_tokens}`. Two context builders (TS `flatMap` with `assistant_message!` non-null assertion vs SQL `jsonb_agg ... order by seq, position`) must stay identical with no check, and the SQL aggregation is dead cost on every send.
