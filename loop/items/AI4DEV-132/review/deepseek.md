## Findings

### 1. [critical] A settled turn can carry an empty assistant message, and that empty turn is replayed into every later request

**Location**: `supabase/functions/_shared/discovery-turn.ts:92-94` (context assembly), `:114` (`p_assistant_message: answer.ok ? answer.text : null`), `supabase/functions/_shared/anthropic-messages.ts:19-22` (`answerFrom` joins text blocks) and `:42-45` (`stopped`), migration `20260920120000_discovery_turns.sql:43-47`

**Finding**: `assistant_message` is stored as `''` whenever the provider returns no text, and the next turn replays it verbatim as `{role: 'assistant', content: ''}`.

**Evidence**: Two reachable paths produce empty text:
- a tool-only answer (`answerFrom` joins `content.filter(type==='text')` → `''` when the model calls `record_elicitation` without prose) — the author's own `tests/at/harness/discovery-elicitation.selftest.ts` asserts `p_assistant_message: ''` is settled, and `.claude/skills/verify-ai4good/features/discovery-message.md:32` documents "a tool-only answer stores an empty assistant message";
- a stream cancel before the first text delta: `stopped()` returns `text` (still `''`) with `ok: true`, so `settleArgsFrom` settles the turn as `completed` with `p_assistant_message: ''`. The DB constraint only requires `assistant_message is not null`, so `''` passes.

The next send then builds `{role:'assistant', content: ''}` (`discovery-turn.ts:93`, and identically in the SQL `v_context`). The Messages API validates text blocks as non-empty, so `countTokens`/`create` return 400, the turn is settled `failed`, and the caller gets a 502 — and the offending empty turn is still in the history, so **every subsequent send fails the same way** and the conversation is permanently dead. If a future API version tolerated the empty block, the model would still be handed a fabricated empty assistant turn. No test covers the replay: the grant-tracker fixture's only tool reply carries text.

**Suggestion**: do not persist an empty assistant message (store a marker, or a turn status that means "no prose"), and skip empty assistant messages when assembling the context; add a body that drives a tool-only turn and then a second send.

### 2. [critical] Cache tokens are invisible to the meter, so a cache-hitting turn is nearly free

**Location**: `supabase/functions/_shared/anthropic-messages.ts:20-21`, `supabase/functions/_shared/discovery-metering.ts:44-52`, `supabase/functions/_shared/discovery-prompt.ts:17-21`

**Finding**: the metered "actual cost" is computed from `usage.input_tokens` only, which excludes `cache_creation_input_tokens` and `cache_read_input_tokens`. The system prompt is deliberately cached (`cached: true`), so from the second turn onward most of the prompt is cache traffic that is never counted.

**Evidence**: the metering formula is `inputTokens * 5 + outputTokens * 25` on both sides (`settlementFor` and `discovery_turn_settle`), with `inputTokens = message.usage.input_tokens`. On a cached request Anthropic reports the cached portion separately (at 1.25× for a write, 0.1× for a read) and `input_tokens` collapses to roughly the new user message. The reservation, by contrast, is built from `countTokens` on the whole prompt, so `least(reservedCredits, ceil(actual/ratio))` releases nearly the whole reservation: the `actual_micros` column, the charged credits and the ledger are all wrong in the same direction. Nothing can catch it — the loop sim fabricates usage (`vendors.ts` scripted replies), the integration tier runs with the provider unreachable by design, and `AT-004.10` is declared red on `vendors.anthropic`.

**Suggestion**: return all three input fields from the port and price them (or sum them at the non-cached rate if a single blended price is wanted), and mirror that in `settlementFor`/`discovery_turn_settle`; add a scripted usage case with a non-zero cache read to the arithmetic assertions.

### 3. [warning] The cancel path invents a "measured" usage to satisfy the settled-is-measured constraint

**Location**: `supabase/functions/_shared/anthropic-messages.ts:42-45`, `supabase/functions/_shared/discovery-turn.ts:107-120`, migration `20260920120000_discovery_turns.sql:43-47`

**Finding**: when no usage delta has arrived, `stopped()` reports `outputTokens: request.maxTokens`; `settleArgsFrom` then writes `actual_micros = est_in*5 + cap*25` and `overrun_micros = 0` as if measured.

**Evidence**: `const stopped = () => ({ ok: true, text, …, usage: { ...usage, outputTokens: sawDelta ? usage.outputTokens : request.maxTokens } })`. Because the table's `discovery_turns_settled_is_measured` constraint demands `actual_micros = input_tokens*in + output_tokens*out`, there is no way to record "settled, usage unobserved" — the fabrication is forced by the schema, not by the transport. Consequences: a user who cancels immediately is charged the full output cap (up to 4096 tokens) and the row claims that as measured cost; when `sawDelta` is true the code charges the *last cumulative* `message_delta` count, which can be stale-low. So the intent's "settles with the measured usage" is only true in the middle case.

**Suggestion**: make the unmeasured case distinguishable — e.g. a `usage_source` column (`measured` | `capped`) or a null `actual_micros` with a dedicated status — and have the constraint accept it, rather than writing an invented number into a column the constraint calls measured.

### 4. [warning] The provider adapter is in no type program and exercised by nothing

**Location**: `supabase/functions/_shared/anthropic-messages.ts` (entire file), `tests/at/harness/index.ts:249`, `tests/at/suites/req-004/_source-pins.ts:19`

**Finding**: the one module that talks to the Anthropic SDK has neither type coverage nor an automated run.

**Evidence**: it is imported only by `supabase/functions/discovery-message/index.ts` and by no test (the design docs state this explicitly). `tsconfig.json` covers `src/**`, and the `tests/at` program covers only `tests/at/**` plus what those files import — so `betas`, `fallbacks: 'default'`, `output_config.effort`, the `strict` tool schema, `client.beta.messages.stream(...)`/`create({stream:true})`, and every beta stream-event field (`event.usage.output_tokens`, `content_block_start`/`input_json_delta`) are unchecked. The integration tier hands `refusing('vendors.anthropic')`, and the runner is documented as never inheriting `ANTHROPIC_API_KEY`, so no automated run reaches the SDK; the only exerciser is the manual, non-repeatable `fixtures/record-grant-tracker.ts`. A param or event-name drift fails as a blanket 502 on every send. `_source-pins.ts` can only regex the model literal out of the file's text.

**Suggestion**: add a `deno check` pass over `supabase/functions/**` to the check script (the file is already annotated, so this is nearly free), and turn the recorder into a repeatable provider smoke run whose evidence is recorded when someone does have the credential.

### 5. [warning] An expired turn is only abandoned if the replacing reservation commits

**Location**: migration `20260923120100_organization_discovery_switch.sql:183-209`

**Finding**: the abandoned-turn update (188-189) is issued before `stale-context` (191-193), the settings validation, `fuel-exhausted` (215-218) and the debit (209). Any of those raising rolls the whole function back, undoing the abandonment.

**Evidence**: the reserve is one PL/pgSQL statement in one transaction; a client whose request is refused for `stale-context`, `fuel-exhausted`, `daily-allowance-exhausted`, `debit-exceeds-remaining` or `invalid-request` leaves the expired turn `open`, and a client that keeps getting refused leaves it open indefinitely. The ledger is not corrupted (an open turn counts `reserved_credits`, an abandoned one counts `charged_credits = reserved_credits`, so `spent` is the same), but the row state and what `discovery-conversation` reports are wrong, and the stated behaviour ("a later reserve on the same project abandons it after a deadline") is contingent on the replacing request succeeding.

**Suggestion**: retire the expired turn in a step that survives the refusal (a separate definer, or perform the abandon after the new turn is inserted so it can only run on the success path), or move it after the checks that can refuse.

### 6. [warning] The shared write frame now carries Discovery's transport and the Discovery read port

**Location**: `supabase/functions/_shared/edge.ts:33, 369, 382-422, 455`; `supabase/functions/_shared/write-routes.ts:12, 238`; `supabase/functions/_shared/tenant-reads.ts:116`; `supabase/functions/_shared/discovery-reads.ts:22`

**Finding**: the generic frame acquired a feature-specific wire protocol and a feature-specific type dependency.

**Evidence**: `write-routes.ts` (inventory, standing, gate pipeline) imports `CallerReads` from `tenant-reads.ts`, which merely re-exports the type whose home is `discovery-reads.ts` — so `WriteRouteSpec.prepare` is typed against `TenantReads & NeedReads & DiscoveryReads`, and any future read widens every prepare signature. `edge.ts` owns the Vercel UI message stream parts, the SSE headers and the abort/`waitUntil` choreography, and imports `discovery-stream.ts`; the frame is also the one module with no type-checker, as its own header says. Two import paths for one type (`discovery-turn.ts` takes it from `discovery-reads.ts`, `write-routes.ts` from `tenant-reads.ts`) make the layering harder to see.

**Suggestion**: parameterize the hook (`prepare?: (caller, args, reads: R)` with `R` the route's own port) and let the route own the streaming response — e.g. `settle.respond?(request, reserved, args, emit): Response | null` implemented in `discovery-turn.ts`, so `edge.ts` only decides "act now or hand the connection over".

### 7. [warning] The allowance ledger has two writers, so the turn ledger's invariant is not a system invariant

**Location**: `supabase/functions/_shared/write-routes.ts:64-67`, `supabase/functions/_shared/discovery-allowance.ts:153-201`, migration `20260916120000_discovery_allowance.sql:58-211`, migration `20260920120000_discovery_turns.sql:86-100`

**Finding**: the pre-existing `discovery-allowance` route still exposes `action: 'debit'` to any NGO admin, so `discovery_spend.spent` can move without a turn.

**Evidence**: the new suite asserts `spent == Σ(reserved for open turns, charged otherwise)` (`spendLedgerInvariantProblems`, loop and integration), and `AT-004.50`-adjacent bodies rely on `drainAllowance` — which is exactly that raw debit route (`_live.ts:74-84`) — to make the pool empty. So the invariant holds only because the tests choose not to interleave. A debit issued while a turn is open makes it false, and the only thing preventing a negative row is `discovery_spend_release`'s `spent >= p_credits` guard.

**Suggestion**: declare the turn ledger the sole writer of `spent` (retire or operator-gate the raw debit arm once the suite no longer needs it), or split the column into turn-charged and manually-adjusted movement so the invariant is checkable in production, not only in a test helper.

### 8. [warning] A token-counting outage hides every product refusal, and a failed read is dressed as `no-such-project`

**Location**: `supabase/functions/_shared/discovery-turn.ts:83-97`

**Finding**: `countTokens` runs before the reserve, so provider availability decides whether the caller ever sees a product refusal; and a `TENANT_READ_FAILED` (502, "the read could not complete") is returned with the kind `no-such-project`.

**Evidence**: the email floor, the organisation switch, the allowance check, `fuel-exhausted`, the minimum-output rule and `discovery-disabled` all live in the reserve (or in `needIntakeAnswer`'s callers), i.e. after `await port.countTokens(request)`. If Anthropic is unreachable, `countTokens` throws, `edgeHandler` converts it to a 502 carrying the vendor's sentence, and a caller who is simply out of credits, switched off, or pointing at a draft need is told nothing actionable. Line 84 then writes the kind `no-such-project` for `TENANT_READ_FAILED`, so a client that branches on `kind` tells the user the project does not exist when the read failed (the sibling read routes return the body's own reason and no kind).

**Suggestion**: evaluate the cheap product floors before counting (organisation switch and allowance read are already reads this route performs), and map the outage to its own kind rather than reusing `no-such-project`.

### 9. [nit] The 64-token input margin is the one metering constant not threaded through `p_settings`

**Location**: `supabase/functions/_shared/discovery-metering.ts:6` versus migration `20260923120100:196` (duplicated at `20260921120000:94` and `20260920120000:184`)

**Finding**: every other number (ratio, prices, min/max output, message cap, deadline) travels in `reserveSettings()` precisely so SQL and TypeScript cannot drift; the margin is a literal `+ 64` in each reserve redefinition, and the SQL's numeric-key loop does not know about it.

**Evidence**: `DISCOVERY_INPUT_MARGIN_TOKENS` is TS-only; changing it silently changes nothing in the database, and the only thing pinning the two together is `proveRatio`'s expected `reservedMicros` in `AT-004.02`'s integration body (loop cannot catch it — the loop fixture computes the margin itself).

**Suggestion**: add `input_margin_tokens` to `reserveSettings()` and to the SQL key array, and use it at line 196.

### 10. [nit] Stand-in scaffolding is now empty but still shipped

**Location**: `supabase/functions/_shared/write-routes.ts:15-17`; `tests/at/suites/req-001/_integration.ts:2474,2481`; `tests/at/harness/write-route-scan.selftest.ts:111-127`

**Finding**: promoting `discovery-message` to an edge row removed the last `stand-in` route, but the variant, the option and the scan branch remain.

**Evidence**: no key of `WRITE_ROUTES` is a stand-in any more; both callers of `assertDeactivationGatesEveryWrite` pass `skipStandIn: false`, so the branch (and the `(row.surface as RouteSurface)` cast added with it) can never fire; the `stand-in-not-gated` scan is kept alive only by a synthetic inventory invented inside its own selftest. This is exactly the kind of transitional scaffolding that becomes permanent.

**Suggestion**: delete the `stand-in` variant, the `skipStandIn` parameter and the cast; keep the scan refusal covered as a plain unit test over a hand-built inventory (which is what the selftest now does anyway).