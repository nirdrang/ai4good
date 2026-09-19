## Findings

### 1. [critical] Retry billing misses the actual mid-turn system error
**Location**: `settleArgsFrom` in `discovery-turn.ts`; `discovery_turn_reserve` retry predicate in `20260924150100_discovery_retry_and_regeneration.sql`
**Finding**: AT-004.39 says a retry after a system error mid-turn costs zero credits. Retry billing only applies when the **latest** turn is `failed` and the new text equals that turn’s `user_message`. The common failure path never produces that row.
**Evidence**:
1. Provider timeout / connection error: `anthropic-messages.ts` `failure()` sets `status: null` unless the error is an `APIError`. `settleArgsFrom` then returns `{ args: null }`. `writeRoute` answers 502 **without calling settle**. The turn stays `open`.
2. Immediate resend hits `turn-in-flight`.
3. After 150s the next reserve **abandons** the open turn and charges the full reservation (`abandoned_keeps_reservation`).
4. Latest `seq` is now `abandoned`, not `failed`, so the same message bills as `free` and debits again.

The test only operator-settles `failed`, then reserves the same text. That is the HTTP-status error path, not timeout, crash, or hung isolate — the cases “system-error mid-turn” names. Regeneration’s “failed does not consume the bound” is explicit in the design; this retry rule is not. A successful retry after a timeout currently costs **two** full reservations.
**Suggestion**: Treat the predecessor as retry-eligible when it is `failed` **or** `abandoned` (and maybe a still-open turn past the deadline), with the same message. On `args === null`, settle `failed` (or a dedicated interruption state) before returning 502, so the next reserve can see it.

### 2. [critical] First generate reopens the same row id; a late commit can steal the retry
**Location**: `discovery_scope_begin` generate branch (reopen latest `failed`); `discovery_scope_commit` (`status = 'generating'` only)
**Finding**: After an in-flight generate times out, begin marks that row `failed` and **reopens the same uuid** as `generating`. Commit only checks `id` + `status = 'generating'`. It does not check `opened_at` or a generation token.
**Evidence**: Regeneration inserts a **new** version after timing out a generating row, so a stale commit of the old id hits `scope-not-open`. Generate does the opposite:

```sql
-- mark generating failed, then:
update public.discovery_scopes set status = 'generating', ... opened_at = clock_timestamp()
 where id = v_scope.id
```

Call A still holds that id. Call B reopens it. Then:
- A success → writes A’s contract as `current` while B is still in the model; B’s commit then fails `scope-not-open`.
- A failure → marks B’s in-flight row `failed` while B is still running.

The 120s SDK timeout vs 150s deadline makes this less likely, not impossible. A hung fetch, a wall-clock stall, or anyone tightening the deadline re-opens the race. Unique `(project_id, version)` plus “version 1 must have no reason” is what forced the reopen, and that constraint is now load-bearing in the wrong way.
**Suggestion**: Never reuse a scope id. Allow a reason-less retry version, or pass `opened_at` (or a nonce) into commit and require a match. Regeneration already shows the safe pattern.

### 3. [warning] Chat turns are instructed to call `record_scope`, which they do not have
**Location**: `DISCOVERY_SKILLS` in `discovery-skills/index.ts`; `discoveryPrepare` / `discoverySystemPrompt`
**Finding**: Skill `06-write-the-scope` is in the cached system prompt for **every chat turn**. Chat tools are `record_elicitation` and maybe `decline_off_topic`. There is no `record_scope` on that request.
**Evidence**: `discoveryPrepare` passes the full `DISCOVERY_SKILLS` list. Skill 06 says “When you write the scope, call record_scope.” Scope generation is a separate route with `tool_choice` forced to `record_scope`. On the completing chat turn the model is told both “call `record_elicitation`” and “call `record_scope`”. The port keeps only the first `tool_use`. This is a prompt collision, not a documentation issue.
**Suggestion**: Chat skills stop at `05`. Pass `06` only into `buildScopeRequest`.

### 4. [warning] Money gate is a word list on the rendered markdown, including the project title
**Location**: `SCOPE_MONEY` / `scopeMoneyProblems` in `scope.ts`; `renderScopeMarkdown` (`# ${need.title}`)
**Finding**: Generation fails 502 if the rendered markdown matches `$`, `USD`, `dollar(s)`, `cost`, `estimate`, `budget`, or `price`, except the one maintenance sentence and the Lovable URL. That is not “no project/build-cost estimate.”
**Evidence**: The title is interpolated into the markdown **before** the scan. A need named “Budget tracker” or a story that says “track the grant budget” cannot get a current scope; generate will sit on `failed` and reopen forever. AT-004.21 also permits per-turn **cost** language; `\bcost\b` forbids it. Fixtures carefully avoid these words, so the suite will not catch this. `£`, `€`, “4,000 to build” with no keyword still pass.
**Suggestion**: Scan model-authored fields only (not the need title, not canned copy). Match currency amounts and explicit build/project price phrasing, not the word `budget` in domain language.

### 5. [warning] Stop is prompt-only; generate cannot run unless the model calls the tool
**Location**: `DISCOVERY_STOP_RULE`; skill `04-complete-the-record`; `discovery_scope_begin` (`elicitation-incomplete`)
**Finding**: AT-004.14 says when the NGO says stop, elicitation is recorded complete with open questions and the scope can be generated. There is no stop write. If the model does not call `record_elicitation`, begin raises `elicitation-incomplete` and they are stuck paying for more chat turns.
**Evidence**: AT-004.14 scripts the tool call, then asserts the stored elicitation. That proves storage, not “NGO says stop ⇒ wrap-up.” `scopeReady` is also `turn.elicitation?.complete === true` on **that** settle only. A later chat turn reports `scopeReady: false` even though generate would still succeed. Conversation GET has `elicitation` but no `scopeReady`.
**Suggestion**: A deterministic stop action (or a server-side wrap when the user message matches the stop rule) should write the elicitation. Put `scopeReady` on the conversation from the latest complete elicitation, not on a single turn.

### 6. [warning] Off-topic notice lives only on the settle JSON
**Location**: `renderDiscoveryMessage`; `conversationAnswer`
**Finding**: After three declines, the settle body carries `guardrail.flagged` and `SCOPE_COPY.offTopicNotice`. `conversationAnswer` returns turns with `offTopic` booleans and nothing else: no count, no flagged, no notice.
**Evidence**: The design says the answer carries the notice from then on. Reload (AT-004.11) has no notice string to show. SQL also emits `discovery.off_topic_flagged` only when `count = strikes`, and only if at least one platform admin has an email. If that emit is skipped, it never retries.
**Suggestion**: Derive `{ offTopicCount, flagged, notice }` in `conversationAnswer`. Emit the admin event on `count >= strikes` if it has not been emitted, or persist a flag on the project.

### 7. [warning] `scopeAct` throws instead of failing the generating row
**Location**: `scopeAct` in `scope.ts`; `writeRoute` (no try/catch around `act`)
**Finding**: If begin returns `done: false` but `parseElicitation` fails (SQL only checks `complete = true`; the parser requires exactly five keys), `scopeAct` throws. The generating row stays open until the 150s deadline.
**Evidence**: Combined with finding 2, the next generate reopens that same id while a dying isolate may still commit. Regeneration is safer because it inserts a new row.
**Suggestion**: On a bad snapshot, return `p_outcome: 'failed'` for the begun id, same as an invalid `record_scope`.

### 8. [warning] Two identical consumer resolvers, and a 300-line begin function that copies the notifier twice
**Location**: `scopeSourceForPrd` / `scopeReferenceForScorer`; `discovery_scope_begin` / `discovery_turn_settle` notice blocks
**Finding**: The two resolvers are the same function under two names. That is not a pin, it is duplication that will drift. The SQL copies ~40 lines of channel validation plus admin fan-out for off-topic and for regeneration-exhausted. `notification-copy.ts` now imports `SCOPE_COPY` so chat-adjacent copy lives in the scope module.
**Evidence**: AT-004.52 asserts the two resolvers return the same value. The next PRD/scorer change will edit one and miss the other. The SQL copies already disagree in payload shape (`strikes` vs `regenerations`/`lastReason`) while sharing the same channel check.
**Suggestion**: `export const scopeReferenceForScorer = scopeSourceForPrd` until the consumers actually diverge. One SQL helper for “emit this notice to every active platform admin.” Keep off-topic copy out of `scope-copy.ts`.

---

Do not merge until 1 and 2 are fixed. 3–5 will fail in real NGO language and real stop/timeout traffic even if the suite stays green.