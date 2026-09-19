## Findings

### 1. [critical] Regeneration never tells the model *why* — the reason is dead data
**Location**: `supabase/functions/_shared/scope.ts:446-497` (`scopeAct`), `scope.ts:191-215` (`buildScopeRequest` / `SCOPE_REQUEST_MESSAGE`)

**Finding**: The `regenerate` action accepts and stores a `reason`, but the reason is never passed into the model request. `scopeAct` receives `args` (which carries `p_reason`) and uses only `args.p_account_id` and `args.p_project_id`; every model input is rebuilt from `begun` (need, mission, elicitation, vocabulary, settled transcript) and the fixed `SCOPE_REQUEST_MESSAGE`. A regeneration therefore sends a *byte-identical* prompt (same system blocks, same context, same message, same forced tool) to the one that produced the scope the NGO just rejected.

**Evidence**: `buildScopeRequest`'s input type has no reason field (`scope.ts:194-197`), and the only place `p_reason` appears on the TS side is `decideDiscoveryScope` (`scope.ts:380-394`), which merely forwards it to SQL; the SQL stores it on the version row and formats it into the exhaustion notification (`20260924150100_...sql:443,500-505`). Nothing between the RPC and `port.create` can see it. `SCOPE_REQUEST_MESSAGE` is a constant string. Consequence: the user burns all three regenerations getting the same scope (sampling noise aside), then the case escalates — the exact opposite of the feature's purpose ("the NGO rejects the scope, so they regenerate"). The ATs (AT-004.37) only assert bounded/logged/free, so they are green while the mechanism is hollow.

**Suggestion**: Append the reason as the final user message (e.g. `SCOPE_REQUEST_MESSAGE + '\n\nThe NGO rejected the previous scope for this reason: ' + reason`) or put it in the uncached system block, and add an AT asserting the reason text appears in the regeneration request.

---

### 2. [warning] The money-word gate includes the NGO's own intake title, making generation permanently unpassable for some needs
**Location**: `supabase/functions/_shared/scope.ts:221-244` (title rendered at line 231), `scope.ts:246-260` and `scope.ts:483-489` (gate applied over the whole markdown)

**Finding**: `scopeMoneyProblems(markdown)` is run over the entire rendered document, including `# ${need.title}` — text the model did not author and the NGO cannot change from the scope screen. A need titled e.g. "Budget planner for grant cycles", "Cost tracker for supplies", or anything containing `$`, `USD`, `dollars`, `estimate`, `price`, `budget`, `cost` makes *every* generation attempt fail with a `502` and a `failed` row. Since `generate` reopens the latest failed row, the user can retry forever and it will fail forever.

**Evidence**: `renderScopeMarkdown` emits the title as the H1 (`scope.ts:231`); `scopeAct` computes `money = scopeMoneyProblems(markdown)` and returns `failed(money[0], …)` on any hit (`scope.ts:484-489`). The failed row's `reason` column is not populated (SQL failure path only sets `status`/`settled_at`, `20260924150100:239-242`), so there is no record of why it failed; the only signal is the transient HTTP body. The "budget"/"cost" vocabulary is realistic NGO domain language (a grant tracker genuinely talks about budgets) and the model is also free to echo the NGO's own words into a rationale — that is the intended failure path, but the title is not the model's assertion at all.

**Suggestion**: Apply the gate only to model-authored fields (or exclude the H1 line), and/or persist the failure reason on the row / surface it to the NGO. A word-list hit on the title should be diagnosed as a title problem, not silently retried.

---

### 3. [warning] A concurrent second `regenerate` can trigger the exhaustion escalation while the first regeneration is still in flight
**Location**: `supabase/migrations/20260924150100_...sql:460-465` (bound check) vs `:558-566` (in-flight check); same ordering in `tests/at/suites/req-004/_fixture.ts:231-253`

**Finding**: `v_used` counts every version `> 1` whose status is not `failed`/`escalated` — *including* a row that is still `generating`. The bound check runs *before* the in-flight check (the reverse of the `generate` branch, which checks in-flight first). So after two completed regenerations, a double-click on regenerate has this shape: request A inserts `generating` v4; request B (which acquires the `current` row lock after A commits) counts v2, v3, v4 → `v_used = 3 = bound` → inserts an `escalated` row and sends `discovery.regeneration_exhausted`, *without* marking A's row failed. A then commits v4 as `current`. Net result: an escalated case that also got its fourth version, and a spurious admin notification ("bound reached, a person will review") for what the user sees as their third regeneration.

**Evidence**: The `escalate` branch does nothing to the `generating` row (`:465-556`), and the unique indexes only cover `current`/`generating`, so both a `current` and an `escalated` row can coexist. The fixture reproduces the same ordering, so no tier catches this.

**Suggestion**: Move the `generating` freshness check above the bound count (it already refuses with `generation-in-flight` within the deadline), or exclude `generating` from `v_used`. Either makes the bound count completed regenerations only.

---

### 4. [warning] `remove-label` does not remove the label from the versioned scope contract or its markdown, and the next generation can re-add it
**Location**: `supabase/migrations/20260924150100_...sql:404-435` (remove-label branch), `:233-238` (commit writes `need_intakes.cause_labels` only); `tests/at/suites/req-004/h-cause-labels.test.ts:24-39`

**Finding**: The removal updates only `need_intakes.cause_labels`. The row in `discovery_scopes` — the artifact the intent calls "the contract that later PRD and backlog consumers read by version" — keeps `cause_labels` and a rendered markdown whose `## Cause labels` section still lists the label, and the conversation read returns that contract. There is no record of the removal anywhere, so a subsequent regeneration whose model emits the same label re-sets `need.cause_labels` to it (the commit does `set cause_labels = coalesce(p_labels, '{}')`). The AT asserts only `need.causeLabels === []` and the vocabulary row's persistence; it never inspects the scope contract, so the gap is untested.

**Evidence**: `remove-label` never touches `discovery_scopes`; `discovery_scope_commit`'s completed path overwrites the need labels from the new contract. The item's own `resume.md:60` records it: "A regeneration may re-emit a label the NGO removed; nothing records removals."

**Suggestion**: Either state explicitly (and test) that the version rows are immutable and the removal is a need-side annotation only, or record removals (e.g. a per-project removed-labels set consulted by `normaliseLabels`) so the removal survives regeneration and is visible to version consumers.

---

### 5. [warning] Scope generation is entirely outside the metering and ledger system, with unbounded free retries
**Location**: `supabase/functions/discovery-scope/index.ts` (no `prepare`), `supabase/migrations/20260924150100_...sql:595-657` (generate path)

**Finding**: Every other Discovery model call goes through `discoveryPrepare` (token count), `discovery_turn_reserve` (allowance debit or fuel check + reserve) and `discovery_turn_settle` (spend release/charge, spend row). The scope route does none of it: no `countTokens`, no allowance read, no fuel check, no `discovery_spend` row — it stores only `input_tokens`/`output_tokens` on the version row. Consequences: (a) on a fuel-funded project the most expensive single call in the product (whole transcript + elicitation in, up to 4096 out) draws no fuel, unlike every chat turn; (b) failed generations can be retried without limit on both billing modes, so a money-word failure loop (finding 2) or a provider refusals loop produces unbounded platform spend with no ledger trace and no user-visible bound.

**Evidence**: `discovery_scope_begin`/`discovery_scope_commit` contain no reference to `discovery_allowance`, `project_fuel_available_micros` or `discovery_spend_release`; `discovery-scope/index.ts` registers no `prepare`; AT-004.20 asserts the allowance is *unchanged*, confirming zero-credit generation is intended, but nothing anywhere bounds the number of failed attempts or accounts for the fuel case.

**Suggestion**: If zero credits is the decision, say so and enforce it structurally — e.g. a bounded number of failed attempts per project, or a `discovery_spend`-style record of provider spend. If funded projects should burn fuel for scope calls, add the reserve/settle path.

---

### 6. [warning] The scope call reuses the elicitation chat prompt, instructing the model to do things the call forbids
**Location**: `supabase/functions/_shared/scope.ts:202-210` with `discovery-prompt.ts:6-19` and `discovery-skills/index.ts` (all six skills)

**Finding**: `buildScopeRequest` sends `DISCOVERY_SYSTEM_PROMPT_TEMPLATE` plus *all* skills, including "Ask one question at a time…", "When elicitation is complete, call record_elicitation…" and the 04 skill's stop rule. For the scope call the only tool offered is `record_scope`, and `tool_choice` forces it. The system prompt therefore tells the model to continue an elicitation conversation and call a tool that does not exist in this request, while the user message says "Produce the technical scope now". At best this is wasted/conflicting instruction; at worst it pulls the model's prose (summary, rationales) toward conversational filler.

**Evidence**: `renderScopeMarkdown` renders model-authored rationale text directly into the NGO-visible document, so prompt pollution is user-visible. No test asserts anything about the scope call's system prompt beyond block caching.

**Suggestion**: Give the scope call its own template (plus skill 06 and 05), rather than reusing the chat template and the elicitation skills wholesale.

---

### 7. [warning] The off-topic notice is returned on every turn after the flag, not once
**Location**: `supabase/functions/_shared/discovery-turn.ts:248-257`

**Finding**: `flagged` is computed as `offTopicCount >= strikes`, and `notice` is returned whenever `flagged` is true. The intent says the third decline "flags the conversation once". As written, the NGO sees "This conversation was flagged… A person can see this conversation" attached to every subsequent turn forever — and AT-004.13 *asserts* this repeated behavior (`extra.guardrail` expects the notice again), so it is locked in by a test.

**Evidence**: The SQL correctly emits the admin notification exactly once (`v_off_topic_count = strikes`), but the response view has no notion of "this turn is the flagging turn" (`off_topic_count` is the running total). The loop/ integration tiers both assert the repeat.

**Suggestion**: Return the notice only when `offTopicCount === strikes` (the flagging turn), or make the notice a conversation-level state the UI renders once.

---

### 8. [warning] Copy-paste notice plumbing in both TS and SQL where one generic helper fits
**Location**: `supabase/functions/_shared/discovery-turn.ts:135-153` and `supabase/functions/_shared/scope.ts:320-338`; SQL emission blocks at `20260924140000:130-169`, `20260924150100:278-318`, `20260924150100:506-546`

**Finding**: `OffTopicFlaggedNotice`/`RegenerationExhaustedNotice` and `offTopicFlaggedNotice`/`regenerationExhaustedNotice` are identical modulo one event-name string; and the ~40-line "resolve channels, validate notice, loop active platform admins, build deliveries, call `emit_notification`" block is duplicated verbatim three times in SQL, with the notice-validation block duplicated a fourth time. The final migration also re-declares `discovery_turn_reserve` (165 lines), `discovery_turn_settle` (155 lines) and `discovery_scope_begin` (327 lines) to change a handful of expressions.

**Evidence**: Diff shows the three SQL blocks are byte-identical apart from the event name, payload keys and copy; the two TS builders differ only in the constant at `discovery-turn.ts:135` / `scope.ts:320`. This is exactly the kind of duplication that drifts (e.g. the retry-specific branch in `discovery_turn_settle` had to be repeated in the second copy of that function).

**Suggestion**: One `noticeFor(event, payload)` in TS (the type collapses to one), and one `public.emit_platform_admin_notice(p_event text, p_payload jsonb, p_subject text, p_body text, p_channels jsonb)` definer used by all three producers. For the migrations, at minimum extract the shared emission into that helper so the remaining re-declarations are small.

---

### 9. [nit] The rendered Maintenance section states ownership twice
**Location**: `supabase/functions/_shared/scope.ts:240`, `scope-copy.ts:11-12`

**Finding**: `## Maintenance` renders `SCOPE_COPY.maintenance` ("…and owns the code.") immediately followed by `SCOPE_COPY.ownership` ("The NGO owns the code."), so the document reads the same sentence twice. `scopeDocumentProblems` doesn't catch it because it only checks each string's presence.

**Suggestion**: Drop `ownership` from the render, or fold it into one sentence.

---

### 10. [nit] Contract validation lives only in the edge; the RPC accepts any `jsonb`
**Location**: `20260924150100_...sql:220-238` (`p_contract` checked only for null), `scope.ts:275-280` (`scopeViewFromSql` throws on unparseable stored contracts)

**Finding**: `discovery_scope_commit` never validates the contract shape; the only guard is in TS (`parseScope` before the RPC). Any other caller of the RPC (operator tools, a future script) can store a contract that `scopeViewFromSql` will then refuse, and because `conversationAnswer` wraps the whole mapping in one `try/catch` that returns `TENANT_READ_FAILED`, a single bad row makes the entire conversation — turns included — unreadable. The fail-closed direction is right, but the invariant ("only parseable contracts are stored") is enforced at the weakest layer and has no repair path.

**Suggestion**: Either validate the shape in the definer (cheap key/type assertions) or make the read resilient (skip/flag the bad row instead of failing the read) so one corrupt version cannot take down the conversation view.