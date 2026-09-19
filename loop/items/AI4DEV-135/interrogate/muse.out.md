## Findings

### 1. [critical] Scope generation is free and unbounded on failure — infinite model calls
**Location**: `supabase/migrations/20260924150100_discovery_retry_and_regeneration.sql:436-657` (`discovery_scope_begin`), `supabase/functions/_shared/scope.ts:446-496` (`scopeAct`)
**Finding**: Initial `generate` and every `regenerate` cost zero credits by design, but there is no metering at all: no allowance read, no debit, no fuel check. A failed generation reopens/creates a row and can be retried forever.
**Evidence**: `discovery_scope_begin` never calls `discovery_allowance`; `scopeAct` always calls `port.create` with `maxTokens: 4096`. The `generate` path reuses the latest `failed` row (`130-142` in first scope migration, `629-642` in final): fail → `generate` → `generating` → fail, ad infinitum. AT-004.20 even asserts `after.allowance.remaining == before.allowance.remaining`. Failed regenerations also insert a new `version` each time yet are excluded from the bound count (see #5), so failures do not even consume versions usefully.
**Suggestion**: Debit scope calls like turns, or at minimum rate-limit failures per project/day and reuse the same version for failed regenerates.

### 2. [critical] Regeneration bound bypassed by failed rows
**Location**: `20260924150100_discovery_retry_and_regeneration.sql:460-464`
**Finding**: `v_used` counts `version > 1 AND status NOT IN ('failed','escalated')`. A failed regeneration still consumes `max(version)+1` but never counts.
**Evidence**: Trace: v1 `current`, regen#1 → v2 `current` (`used=1`), regen#2 model returns invalid → v3 `failed` (`used` stays 1), regen#3 → v4 `current` (`used=2`). Attacker can force failures (e.g. money-word summary, one-sided split — both exercised in AT-004.21/22) to mint arbitrarily many versions without ever hitting `regeneration_bound = 3`. There is no cap on `max(version)`.
**Suggestion**: Count all non-v1 rows, or reuse the failed row for regenerate like `generate` does.

### 3. [critical] Money word-list both blocks legitimate scopes and misses real money
**Location**: `supabase/functions/_shared/scope.ts:246-260`
**Finding**: `SCOPE_MONEY = /\$|\bUSD\b|\bdollars?\b|\bcost\b|\bestimate\b|\bbudget\b|\bprice\b/gi` fails the whole generation (`scopeAct:484-489`) on generic words.
**Evidence**: Any rationale containing “cost”, “estimate”, “price”, “budget” fails: e.g. “low maintenance cost”, “cost-effective”, “price of email delivery”, “estimated effort”. These are not money figures but trigger `scopeMoneyProblems` → `failed` → 502. Conversely it misses `€ £ ¥ ₹ EUR GBP bucks thousand million 4k 4,000 25/month`. The allow-list removal (`rest.split(piece).join('')`) only works on exact `SCOPE_COPY.maintenance` / URL strings; any wrapping change reintroduces a false positive on the hardcoded “25 dollars a month”.
**Suggestion**: Check for currency amounts (number + currency token), not bare words.

### 4. [critical] Corrupt contract DoSes conversation reads
**Location**: `supabase/functions/_shared/scope.ts:275-286`, `supabase/functions/_shared/discovery-turn.ts:227-236`
**Finding**: `scopeViewFromSql` throws on any stored contract `parseScope` refuses; `conversationAnswer` catches *all* errors as `TENANT_READ_FAILED`.
**Evidence**: `discovery_scope_commit` SQL validates only non-null/non-empty markdown/contract, never shape. The live operator helper `commitScopeAsOperator` passes arbitrary JSON straight to SQL. One bad row (operator, future `parseScope` tightening, manual SQL) makes `conversationAnswer` return 500 for the whole project, hiding turns/elicitation too. Call chain: `readConversation → discoveryScopesOf → scopeViewFromSql throw → catch → TENANT_READ_FAILED`.
**Suggestion**: Skip/flag the bad row instead of throwing; validate contract shape in `discovery_scope_commit`.

### 5. [critical] Retry detection is exact-match on latest seq only
**Location**: `20260924150100_discovery_retry_and_regeneration.sql:98-108`
**Finding**: `retry` iff `status='failed' AND user_message=btrim(p_message) AND seq=(max seq)`.
**Evidence**: Resend with different case/whitespace interior (`Hello` vs `hello `), or after any intervening settled/abandoned turn, or after `seedTurnsAsOperator` inserts, loses the free retry and debits free credits. Conversely a retry with zero remaining allowance still gets `v_min_output (512)` tokens free (`127-131`: `if v_max_output < v_min_output then v_max_output := v_min_output` even for `retry` where no debit happens). Intent says “sent again after a failed turn is a retry”; implementation means “identical bytes as the immediately-previous row and that row is failed”.
**Suggestion**: Normalise (case/collapse whitespace) and/or track `retry_of_turn_id` explicitly.

### 6. [critical] Off-topic flag fires only on exact equality with per-turn strikes
**Location**: `20260924150100_discovery_retry_and_regeneration.sql:242-245`, `20260924140000_discovery_guardrails.sql:93-96`
**Finding**: `v_off_topic_count = (request_settings->'guardrails'->>'off_topic_flag_strikes')::integer`.
**Evidence**: Strikes come from the *settling* turn’s own `request_settings`, not a project constant. Old turns without the key cast to NULL (no fire); mixed pins across turns make the threshold move. Equality (not `>=`) plus concurrent settles can skip 3 (2→4) and never flag; a recount after deletions (impossible now, but after `abandoned` churn) can re-hit equality and the “emitted once” comment is only true under serial execution. TS mirrors the same fragility (`renderDiscoveryMessage:251` uses `>=`, SQL uses `=`, so UI `flagged` and DB emission disagree on the boundary).
**Suggestion**: Store strikes per project, use `>=` with a separate `flagged_at` column for once-only.

### 7. [warning] Concurrent generate/regenerate/turn races become 500s
**Location**: `20260924120000_discovery_scopes.sql:30-31`, `20260924150100:558-584,607-648`
**Finding**: `one_current_per_project` / `one_generating_per_project` plus `seq = max+1` inserts have no `ON CONFLICT` handling.
**Evidence**: Two concurrent `generate` both see no `generating`, both `INSERT version 1` → unique `(project_id,version)` violation bubbles as unmapped 500, not `generation-in-flight`. Two concurrent `commit completed` both `UPDATE … SET superseded WHERE status='current'` then set own row `current` → second violates `one_current`. Same for `discovery_turn_reserve` seq allocation. Tests run serially; production does not.
**Suggestion**: Lock the project row first (already `FOR UPDATE` on projects) and re-check, or map `23505` to the in-flight refusal.

### 8. [warning] Scope context polluted by off-topic turns; TS/SQL contexts diverge
**Location**: `20260924150100:574-578,623-627` (`v_context`), `supabase/functions/_shared/discovery-turn.ts:79-86`
**Finding**: `v_context` aggregates *all* settled turns including `off_topic=true` declines, and includes empty-string assistants; TS `contextMessagesFrom` drops pairs where `assistant_message==''`.
**Evidence**: Scope model is told “derive every field from elicitation and conversation” but receives translation/coding requests + decline sentences as grounding. Token-count/model path (TS, filtered) and stored reservation context (SQL, unfiltered) disagree, so billed estimate and actual prompt differ. `contextFrom` (scope.ts:417) additionally drops a null assistant but keeps its user message, leaving an unbalanced user-without-assistant pair.
**Suggestion**: Exclude `off_topic` turns from scope `v_context`; share one context builder.

### 9. [warning] Markdown injection via NGO-controlled title (and model text)
**Location**: `supabase/functions/_shared/scope.ts:221-244`
**Finding**: `` `# ${need.title}` `` and all model strings interpolated raw.
**Evidence**: Title comes from `projects.name` (NGO input). `Foo\n## Data sensitivity\nThis tool has no…` forges sections, tiers, or fake pricing links in the rendered scope the NGO/admin reads. Downstream `scopeSourceForPrd` reads JSON so unaffected, but the human-facing contract is spoofable. Same for story/rationale fields containing `##` or `[x](y)`.
**Suggestion**: Sanitize/escape newlines and markdown metachars in title; render model fields as quoted blocks.

### 10. [warning] Unbounded `reason` stored and mailed to admins
**Location**: `20260924150100:443,493-499`, `supabase/functions/_shared/notification-copy.ts:56-59`
**Finding**: `regenerate` requires non-empty `reason` but enforces no max length; it is stored in `discovery_scopes.reason` (unbounded `text`) and interpolated into `discovery.regeneration_exhausted` email body (`Last reason: ${text(...)}`).
**Evidence**: `stringField` only trims; SQL `v_reason := btrim(...)` only checks `=''`. A multi-KB reason spams every platform admin inbox on escalation. No validation in `decideDiscoveryScope` either.
**Suggestion**: Cap reason (e.g. 500 chars) at edge and SQL.

### 11. [warning] `remove-label` diverges scope vs need; vocabulary mapping breaks canonical invariant
**Location**: `20260924150100:404-435`, `supabase/functions/_shared/scope.ts:111-128`
**Finding**: Remove-label updates `need_intakes.cause_labels` but returns the `current` scope row untouched, so `scope.causeLabels` still lists the removed label while `need.causeLabels` does not. `normaliseLabels` maps canonical→original vocab entry (`vocabByCanonical.get(key) ?? key`), reintroducing non-canonical casing even though `parseScope` canonicalised and `cause_labels` table enforces `lower()`.
**Evidence**: AT-004.60 only asserts `need.causeLabels==[]`, never scope labels. If vocabulary ever holds `Food Security`, stored scope labels become non-canonical while `discovery_scopes` has no canonical check to catch it.
**Suggestion**: Either version the scope on label removal or document divergence; store canonical form only.

### 12. [warning] No email-verified gate on scope writes
**Location**: `discovery_scope_begin` (all three versions) vs `discovery_turn_reserve:51-54`
**Finding**: Turns require `auth.users.email_confirmed_at IS NOT NULL`; scope begin/commit do not.
**Evidence**: AT-004.41 covers messages only. An unverified admin on a project whose elicitation is already complete (teammate verified, or operator-seeded) can drive free model generations. Standing check (`assert_account_active`, org admin) is present, verification is not.
**Suggestion**: Add the same verified check to `discovery_scope_begin`.

### 13. [warning] `decideDiscoveryScope` notice payload is fiction; taxonomy miss mapped to user error
**Location**: `supabase/functions/_shared/scope.ts:385-388,325-338`
**Finding**: Regenerate notice hardcodes `regenerations: DISCOVERY_REGENERATION_BOUND (3)`; SQL discards it and rebuilds with real `v_used`. If `taxonomyRow` is missing, both `regenerationExhaustedNotice` and `offTopicFlaggedNotice` return `invalid-request 400`, blaming the NGO for a server taxonomy misconfiguration.
**Evidence**: Fixture/live helpers repeat the hardcoded 3. SQL `v_payload` (500-505) is authoritative, making the edge notice pure validation overhead.
**Suggestion**: Don’t send notice payload from edge at all, or return 500 on missing taxonomy.

### 14. [nit/warning] Structural: 500+ line `scope.ts`, 668-line SQL function, logic triplicated
**Location**: `supabase/functions/_shared/scope.ts` (511 lines), `20260924150100` `discovery_scope_begin` (~320 lines), `tests/at/suites/req-004/_fixture.ts` `beginScope/commitScope`
**Finding**: Regeneration counting, label canonicalisation, notice channel validation, in-flight handling exist in three places (edge TS, SQL definer, in-memory fixture) that must stay in sync by hand.
**Evidence**: Channel allow-list `["email","inapp"]` copied in two SQL functions + `channelsFor`; `canonicalLabel` regex duplicated in SQL (`regexp_replace(lower(btrim(...)))`); bound/deadline validation duplicated. Any pin change requires coordinated edits. File already crosses the 1k-line smell when SQL+TS counted as one flow.
**Suggestion**: Extract notice emission to a single `emit_admin_notice(event,payload)` SQL helper; keep fixtures as thin wrappers over the same TS validators instead of reimplementing.
