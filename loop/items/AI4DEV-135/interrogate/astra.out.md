## Findings

[unattributed]

### 1. [critical] Regeneration ignores the NGO’s reason

**Location**: [scope.ts:459](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-135/supabase/functions/_shared/scope.ts:459), `scopeAct` and `buildScopeRequest`.

**Finding**: The requested correction never reaches the model.

**Evidence**: `decideDiscoveryScope` accepts `p_reason`, and SQL stores it on the new row. However, `scopeAct` passes only the need, mission, elicitation, vocabulary, and transcript into `buildScopeRequest`. Neither the reason nor the previous scope is included. With an unchanged conversation, “use email reminders” and “use SMS instead” produce identical model requests. The NGO consumes regeneration attempts without the model knowing what needs correcting.

**Suggestion**: Include the regeneration reason and the previous contract in the request. Test the actual captured request with two different reasons.

### 2. [critical] A pending third regeneration can permanently exhaust the allowance

**Location**: [20260924150100_discovery_retry_and_regeneration.sql:460](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-135/supabase/migrations/20260924150100_discovery_retry_and_regeneration.sql:460).

**Finding**: Exhaustion is evaluated before checking or recovering the generating row.

**Evidence**: After two successful regenerations, begin the third without committing it. The count includes that `generating` row, making `v_used = 3`. Another request enters the escalation branch before reaching the in-flight/deadline check at line 559.

Consequently, a duplicate request escalates while generation is still running. If that generation subsequently fails—or has already stalled—the persisted `escalated` row permanently prevents replacement, despite only two successful regenerations. The expired generating row also remains unrecovered.

**Suggestion**: Resolve the existing generating attempt first: refuse while active, mark it failed when expired, then calculate exhaustion.

### 3. [critical] Reusing a failed scope ID lets an obsolete request settle a newer attempt

**Location**: [20260924150100_discovery_retry_and_regeneration.sql:634](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-135/supabase/migrations/20260924150100_discovery_retry_and_regeneration.sql:634) and [20260924130000_cause_labels.sql:215](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-135/supabase/migrations/20260924130000_cause_labels.sql:215).

**Finding**: Initial-generation retries have no distinct attempt identity.

**Evidence**: Request A begins generation. Its completion is delayed beyond the deadline. Request B expires A’s row and reopens the same row with the same ID, replacing its elicitation and timestamp. A delayed commit from A now passes the only settlement checks: matching scope ID and `status = 'generating'`.

A can therefore publish its old contract against B’s new elicitation, or mark B’s attempt failed. B’s legitimate completion then receives `scope-not-open`. Project locks serialize these operations but cannot distinguish the attempts.

**Suggestion**: Give each attempt a unique token and require it at commit, or allocate a fresh row for every attempt.

### 4. [critical] Scope generation reintroduces invalid empty transcript messages

**Location**: [scope.ts:417](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-135/supabase/functions/_shared/scope.ts:417), `contextFrom`, and the SQL transcript aggregation.

**Finding**: A supported tool-only elicitation can make every subsequent scope-generation request fail.

**Evidence**: `settleArgsFrom` accepts a successful `record_elicitation` response with empty assistant text; `discovery-elicitation.selftest.ts` explicitly tests this. Scope SQL includes that empty assistant message, and `contextFrom` preserves it because it checks only whether `content` is a string. The request then sends it as an intermediate assistant message, which the provider rejects. This empty-history failure is also documented in an [Anthropic repository issue](https://github.com/anthropics/claude-code/issues/62396).

The existing chat path already handles this through `contextMessagesFrom`; the independently implemented scope path bypasses that normalization. Retrying generation rereads the same invalid transcript.

**Suggestion**: Share transcript normalization between chat and scope generation. Add a scope test starting from a tool-only elicitation.

Verification was limited to source tracing: the attempted runtime probe failed with `EPERM` when Bun read `scope.ts`. No files were changed.