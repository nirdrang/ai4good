## Findings

### 1. [warning] Discovery transport logic leaks into the shared write frame
**Location**: `supabase/functions/_shared/edge.ts:382–430`

**Finding**: Every write route now depends on Discovery’s stream protocol and contains its provider orchestration, cancellation handling, settlement, and response framing.

**Evidence**: `writeRoute` imports `discovery-stream.ts`, negotiates Discovery’s SSE format, emits feature-specific events, and implements separate streaming and non-streaming settlement paths. Adding another metered provider operation would require adopting Discovery’s protocol or adding further branches inside shared infrastructure.

**Suggestion**: Extract the reserve/act/settle response lifecycle into a dedicated Discovery handler. Keep authentication, standing checks, and RPC access reusable without embedding Discovery’s transport policy.

### 2. [critical] Cached input tokens disappear from metering
**Location**: `supabase/functions/_shared/anthropic-messages.ts:24, 51–54`

**Finding**: Both response paths discard cache creation and cache read usage.

**Evidence**: The installed SDK explicitly documents total input as `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. This implementation enables prompt caching but preserves only `input_tokens`. Settlement therefore records an incomplete input count, understates `actual_micros`, and can release credits that should remain charged. The two-field simulator cannot expose this defect.

**Suggestion**: Preserve all relevant usage categories and apply the intended pricing policy explicitly before settlement.

### 3. [critical] Cancellation records invented usage as measured usage
**Location**: `supabase/functions/_shared/anthropic-messages.ts:45–46, 61`

**Finding**: Cancelling before a usage delta settles the turn with the entire output cap, including when no provider request was made.

**Evidence**: An already-aborted signal immediately returns `stopped()`. With `sawDelta === false`, that reports `request.maxTokens` output tokens and zero input tokens. `settleArgsFrom` treats this as a completed, measured turn. At the normal 4,096-token cap, a request that never reached the provider records 102,400 micro-dollars and can consume two credits.

**Suggestion**: Distinguish cancellation before dispatch, cancellation with final usage, and cancellation with uncertain usage. Do not put reservation estimates into measured token columns.

### 4. [critical] Provider availability controls whether callers receive product refusals
**Location**: `supabase/functions/_shared/discovery-turn.ts:79–99`

**Finding**: Preparation checks email first and calls the provider before checking the organisation switch, fuel, or available credits.

**Evidence**: An unverified caller in a disabled organisation receives `email-unverified`, never the required `discovery-disabled`. A verified caller with exhausted credits or fuel must successfully complete `countTokens` before SQL can return the remedy. If counting fails, the route returns 502 instead. Disabled organisations also continue sending their conversation to the provider’s counting endpoint.

**Suggestion**: Run authoritative eligibility checks before provider preparation, preserving the required refusal order. Recheck mutable conditions during reservation.

### 5. [critical] Failed replacement reservations undo expired-turn abandonment
**Location**: `supabase/migrations/20260923120100_organization_discovery_switch.sql:183–209`

**Finding**: An expired turn remains open whenever the next reservation is refused.

**Evidence**: The function updates the old turn to `abandoned`, then attempts another debit in the same transaction. If the old reservation consumed the remaining allowance, `discovery_allowance` raises an exception and PostgreSQL rolls back the abandonment. Repeated attempts leave the expired turn open. Because settlement checks only `status`, a late result can still settle and release credits after this attempted deadline enforcement.

**Suggestion**: Make expiration durable even when the replacement reservation is refused, for example by returning a structured refusal after committing expiration instead of raising an exception.

### 6. [critical] Conversation pagination eventually makes further sends impossible
**Location**: `supabase/functions/_shared/edge.ts:459–460`

**Finding**: The conversation read fetches only one PostgREST page.

**Evidence**: `supabase/config.toml` sets `max_rows = 1000`. The query orders ascending and never requests subsequent pages. Once a settled turn exists beyond the first 1,000 rows, preparation submits an older `p_counted_through_seq`; SQL compares it with the actual latest settled sequence and permanently refuses further sends as `stale-context`. The conversation endpoint also silently omits later turns and elicitation records. Failed and abandoned rows count toward the same limit.

**Suggestion**: Implement pagination or a bounded context API that returns its authoritative sequence together with the selected history.

### 7. [warning] The old public debit path bypasses the new turn ledger
**Location**: `supabase/functions/discovery-allowance/index.ts`; `supabase/functions/_shared/discovery-allowance.ts:160–198`

**Finding**: The branch introduces turn-backed accounting while retaining an authenticated endpoint that spends arbitrary credits without a turn.

**Evidence**: An organisation admin can still submit `{ action: "debit", credits: 1 }` to `discovery-allowance`. This changes `discovery_spend` without any reservation or `discovery_turns` row, defeating the new ledger invariant and making the conversation’s costs insufficient to explain the remaining allowance. The new tests themselves use this route to drain credits.

**Suggestion**: Remove public debit support now that reservation owns spending. Retain the internal SQL operation and use operator-only fixture setup for test balances.