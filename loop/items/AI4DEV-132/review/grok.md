I have enough to judge the credits path, the write frame, and the tests against the stated intent. Findings below are execution problems, not disagreements with the goal.

## Findings

### 1. [critical] Prepare reports a read outage as `no-such-project`
**Location**: `supabase/functions/_shared/discovery-turn.ts` (`discoveryPrepare`, lines 83–84)

**Finding**: Every failed `needIntakeAnswer` is mapped to `no-such-project`, including `TENANT_READ_FAILED` (502) and a hidden/missing row (404).

```83:84:supabase/functions/_shared/discovery-turn.ts
    const need = await needIntakeAnswer(reads, args.p_project_id);
    if (need.status !== 200) return refuseWrite('no-such-project', need.status, need.body.reason);
```

`needIntakeAnswer` returns 200 for a draft need, 404 when RLS hides the project, and 502 when REST fails. Prepare never inspects `stage`. A Data API blip therefore becomes `{ kind: 'no-such-project', status: 502 }`. A draft need is counted at Anthropic, then SQL refuses `need-not-in-discovery`. SQL’s own `no-such-project` is 409 (`23503`). The HTTP path and the definer disagree on both kind and status.

**Evidence**: `TENANT_READ_FAILED` is `{ status: 502, body: { reason: 'the read could not complete…' } }`. `writeRoute` returns that prepare refusal as JSON before any reserve. The caller is told the project does not exist when the read did not happen. `discoveryTurnsOf` failure on the next line throws and becomes a generic 502, so even the two reads on this path are classified differently.

**Suggestion**: Map 502 to an outage, 404 to `no-such-project` at 409 to match SQL, and `stage !== 'discovery_in_progress'` to `need-not-in-discovery` before `countTokens`.

---

### 2. [critical] Prompt cache is on; settlement still bills only `input_tokens` / `output_tokens`
**Location**: `discovery-prompt.ts` (`cached: true` on the skills block); `anthropic-messages.ts` `answerFrom` / `observe`; `discovery-metering.ts` `settlementFor`

**Finding**: The founder ruling put the skills prompt behind `cache_control: ephemeral`. Usage is still `message.usage.input_tokens` and `output_tokens` only. Anthropic bills cache write and cache read on separate fields, at 1.25× and 0.1×. Those fields are dropped.

On a cache hit, `input_tokens` is the uncached tail (new turns), not the cached skills block. `actual_micros` is then far below provider cost. Charge is `min(reserved, ceil(actual/ratio))`, so the NGO is under-charged and the unused reservation is released. The ratio is no longer “100000 micro-dollars a credit” of Opus cost.

Candidate 4 named this: cache tokens exist, this run must not send `cache_control` until a later leaf adds prices. Unit 4 then required `cache_control` and did not add those prices.

**Evidence**: `discoverySystemPrompt` marks the template+skills block `cached: true`. `systemFor` emits `cache_control: { type: 'ephemeral' }`. `answerFrom` copies only `input_tokens` and `output_tokens`. No test scripts `cache_creation_input_tokens` or `cache_read_input_tokens`. AT-004.02’s ratio check uses the stand-in’s uncached usage, so it cannot catch this.

**Suggestion**: Either stop sending `cache_control` until cache prices exist, or fold `cache_creation_input_tokens` and `cache_read_input_tokens` into `actual_micros` at their list prices (and into the reservation if the count omits them).

---

### 3. [critical] AT-001.29’s active Discovery control is “no API key”, not “the write is allowed”
**Location**: `tests/at/suites/req-001/_integration.ts` (`assertDeactivationGatesEveryWrite`, lines 2517–2524); live `sendDiscoveryMessage` in `_live.ts`

**Finding**: For `discovery-message`, a deactivated NGO must be refused `account-deactivated`. The matching active NGO is asserted `{ ok: false, status: 502 }`. That 502 is `countTokens` / `requireEnv('ANTHROPIC_API_KEY')` in prepare, not a successful send.

If the deployed function has a key (required for any real Discovery send), the active control returns 200 and this id fails. If the function has no key, the test never shows that an active NGO can send. Constraint 27 was supposed to drive the real route; this replaces the positive control with a missing-credential side effect.

`.env.example` says the runner child does not inherit the key. The edge isolate does not use that child env. It uses the function secret. Those are different.

**Evidence**: `discoveryNeedsProvider: true` is set only for AT-001.29. `sendDiscoveryMessage` posts `discovery-message` after possibly creating a need. Prepare throws without a key; `edgeHandler` turns that into 502. `discoveryMessagesBy` only reads `status = 'settled'`, so a 502 after no reserve still looks like “nothing was recorded”.

**Suggestion**: Drive the active control through a need that is allowed to 502 only when you are proving keyless prepare. For the deactivation walk, assert 200 on a scripted/operator settle, or skip the provider call and assert standing/decide only, but do not encode “no key” as the meaning of “active caller may write”.

---

### 4. [warning] HTTP kill-switch order is reversed for an unverified caller
**Location**: `discoveryPrepare` (email first); `discovery_turn_reserve` in `20260923120100_organization_discovery_switch.sql` (disabled, then email)

**Finding**: The stated order is: refuse `discovery-disabled` before the email floor. SQL does that. The HTTP path never gets there. Prepare returns `email-unverified` before reserve. An unverified admin in a switched-off org is told to verify, then hits `discovery-disabled` on the next send.

Unit 5 and the fixture’s operator `reserve` both require disabled-before-email. AT-004.41 and AT-004.42 never combine the two gates. Loop `sendMessage` uses prepare, so it has the same inversion.

This was added in the unit 1 fix so keyless AT-001.10 / AT-004.41 stay 409 instead of 502. That fix duplicated the SQL email rule in TypeScript, which correction 13 said not to do.

**Evidence**: Prepare lines 81–82 return before any read. SQL raises `discovery-disabled` immediately after the admin check, before `email_confirmed_at`. Operator reserve in `_fixture.ts` matches SQL. `writeRoute` + `sendMessage` do not.

**Suggestion**: Keep the email 409 for keyless tests without reordering the product gates. For example skip `countTokens` when `!caller.emailVerified` but still call reserve so SQL emits `discovery-disabled` first; or read `discovery_disabled_at` in prepare before the email check.

---

### 5. [warning] The default UI path (SSE) is untested and wired into the shared write frame
**Location**: `supabase/functions/_shared/edge.ts` `writeRoute` (lines 382–423); `discovery-stream.ts`; req-004 adapters

**Finding**: `writeRoute` now branches on Discovery’s Vercel UI stream format: `Accept: text/event-stream`, `text-delta` / `data-turn` / `[DONE]`, cancel → `AbortController` → `EdgeRuntime.waitUntil`. Every write route loads `discovery-stream.ts`. Unit 4 asked for this inline so `callDatabaseFunction` stays inside `writeRoute`. The cost is that the shared frame is now a Discovery stream runtime.

No acceptance id posts `Accept: text/event-stream`. Loop `sendMessage` calls `discoveryAct` (JSON). Integration `functionPost` is JSON. The encoder selftest checks strings, not reserve → stream → settle → cancel.

The stream also emits all assistant text, then `text-end`, then the settle RPC. If that RPC fails, the client already has the reply, the row stays `open`, and a later reserve after the deadline abandons at full reservation. The JSON path never shows that text (it 502s). Streaming makes a settle failure look like a successful turn that then vanishes on refresh.

**Evidence**: `spec.settle?.stream && discoveryStream.wantsEventStream(...)` sits in the common handler. `_live.ts` `sendMessage` uses `functionPost` with no Accept override. `_fixture.ts` `sendMessage` never calls `discoveryStream`.

**Suggestion**: Keep JSON `act` in `writeRoute`. Put SSE in `discovery-message` (or a helper it owns) that still calls the same two RPCs. Add one loop test and one integration test that send `Accept: text/event-stream`, cancel, and assert a `user_stopped` settled row. On settle RPC failure after a measured answer, retry settle once before leaving the turn open.

---

### 6. [warning] Cross-origin clients cannot read `x-vercel-ai-ui-message-stream`
**Location**: `edge.ts` `CORS_HEADERS`; `discovery-stream.ts` `DISCOVERY_STREAM_HEADERS`

**Finding**: CORS allow-origin is `*`. Exposed headers stay the default safelist. The stream sets `x-vercel-ai-ui-message-stream: v1`. Browser JS on the app origin calling the functions origin cannot read that header. The Vercel AI UI client uses it to select the UI message parser. Unit 4 said `Accept` is safelisted so request headers need not change. It did not expose the response header.

**Evidence**: `CORS_HEADERS` has allow-origin, allow-headers, allow-methods. No `access-control-expose-headers`. No other file in the tree sets it.

**Suggestion**: Add `access-control-expose-headers: x-vercel-ai-ui-message-stream` on the stream response (and likely on the shared CORS set if the client inspects JSON routes the same way).

---

### 7. [warning] Input margin `64` is a TypeScript constant and a SQL literal
**Location**: `DISCOVERY_INPUT_MARGIN_TOKENS` in `discovery-metering.ts`; `v_est_input := (p_settings->>'counted_input_tokens')::integer + 64` in all three `discovery_turn_reserve` bodies; `meteringPinProblems` in `_source-pins.ts`

**Finding**: Correction 2 is “count plus 64”. The pin suite checks prices, caps, and the deadline against `AT_CONFIG`. It does not check the margin, and SQL does not read a setting for it. Change the TS constant (or the pin) and reservations diverge: prepare’s request is unchanged, SQL’s `estimated_input_tokens` / `reserved_micros` move, overruns and last-credit behaviour move with them.

**Evidence**: `_source-pins.ts` `meteringPinProblems` pairs six values; the margin is not one of them. `p_settings` has no `input_margin_tokens` field. The live definer is the third copy of `+ 64`.

**Suggestion**: Put the margin in `p_settings`, validate it, and pin it like the prices. Or drop the TS constant and have one SQL literal with a pin that reads that literal from the last `discovery_turn_reserve` body.