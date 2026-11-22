# Adversarial review of the whole branch (2026-11-21)

The review covered the branch from the merge base `602e2e8c` with `main` to `59b6ba71`. The lead reran every finding below and saw the same failure. The repros stay in the review worktrees `.claude/worktrees/AI4DEV-166-rv-{codex,grok,opus}/review-repros/`. Each SQL repro ran inside `begin ... rollback`. Each model and GitHub path ran against offline fakes.

## Intent

After an NGO confirms its Discovery brief, the volunteer developer ("Dev") opens a PRD. The platform creates a GitHub repository and writes one markdown file per section. Dev works with an AI in a main chat and in topic chats. Each AI turn lands as one commit, which the database reconciles into its read copy. NGO users answer questions in side chats, and an AI writes the final answer when they mark it complete. Each turn reserves money before the model call and settles the real cost after it. Roles are enforced in the database. The browser reaches the database only through edge functions and refetches after a data-free Realtime ping.

## Adversaries

- `codex:gpt-6.1-sol@high` through the runner. It is a partial dropout. OpenAI's cyber-risk filter stopped the run before its final report: the receipt says `unavailable-model`, exit 69, and the stream ends with "This content was flagged for possible cybersecurity risk". Its repro files survived (`turn.test.ts`, `realtime.test.ts`, `database.sql`), and the lead reran them. The findings that cite Codex come from those files.
- `grok:grok-4.7@xhigh` through the runner. It completed: provider-verified `grok-4.7-build`, 31 minutes, $4.42.
- `claude:opus@medium` as a native agent (`pstack-opus-medium`). It completed.

## Findings

Findings that share a root cause are merged. They are ordered roughly by how much they break the intent.

### 1. A retried or duplicate request runs the model again, and the extra run is not charged (Codex, Opus)

`prd_turn_reserve` and `prd_action` return the same turn for a replayed request id. But `uiStream` (`_shared/prd/routes.ts:309-319`) and the complete-answer settle (`routes.ts:385-393`) call `runPrdTurn` on every request. The only guard in `runPrdTurn` is `turn.id !== turnId` (`turn.ts:378-381`). The event id is `<turn>:<step>` (`turn.ts:131`), so the second run's steps collide with the first run's and the ledger drops them. Each new grant also revokes the previous one, so the first run's tools fail mid-turn.

- `rv-opus`: `bun --no-env-file node_modules/vitest/vitest.mjs run --root review-repros --config vitest.config.ts replay-runs-twice.repro.ts replay-action-twice.repro.ts` printed `modelCalls 2` and two appended replies; `{"modelCalls":2,"appends":2}` for complete-answer.
- `rv-opus/review-repros/replay-reserve.sql` printed `run 1 step 0 | 200`, `run 2 step 0 | 200`, and one provider row, `0.000200 | 1000 | 200`. The second run's 9000 and 3000 tokens were not charged.
- `rv-codex/review-repros/turn.test.ts` ("two in-flight requests") printed `{"modelCalls":2,"uniqueBilledEvents":1,"appendedReplies":2}`.
- `rv-codex/review-repros/database.sql` printed `duplicate reserve: same_turn=t, two_grants=t, first_grant_revoked=t`.

The intent requires that a replay of a running turn calls the model 0 times and that every model request is charged.

### 2. Cached input is billed twice (Codex)

`usageOf` (`turn.ts:124`) passes the AI SDK's `inputTokens`, which is the total including cached tokens, as `input`, and also passes `cacheRead`. SQL then prices both.

- `rv-codex`: `turn.test.ts` ("cached input") printed `{"input":1000,"output":10,"cacheRead":900,...}`. The SDK's `noCacheTokens` was 100.
- `database.sql` printed `cached prompt billing: actualProviderMicros=114, requiredProviderMicros=24`.

The intent requires that each token is billed once, at its own rate. Design line 60 says TypeScript normalizes usage into categories.

### 3. Catch-up ends a turn that may still be running, guesses its outcome, and releases its hold (Opus, Grok, Codex)

`catchUpChat` (`relay.ts:59-68`) ends an `uncertain` turn at once, and an `admitted` turn after 600 seconds. It picks `answered` or `rejected` from `modelRequests`, which is 0 when the ledger write failed. It runs on every `prd-snapshot` load by either role, and before every send, including a send by someone with no role in the project. A grant lives 900 seconds, and `prd_turn_ingest` still prices a model end after the release.

- `rv-opus`: `uncertain-catchup.repro.ts` printed `model-end 9000/3000`, then `end uncertain`, then `end rejected`. `uncertain-release.sql` printed `catch-up ends rejected ... released true releasedMicros 50000` and the ledger row `release | 0.050000`. The model ran, and the whole hold went back to the fund.
- `rv-grok/review-repros/probe.sql` printed `catchUpEnd ... released true`. A second turn was then admitted, the late model end was charged (`providerMicros 2500000`), and the fund showed `availableMicros -1850116`. The design accepts an overrun only from a request in flight against a held reservation (design line 62). This one came after the hold was released and another turn was admitted.
- `rv-codex`: `turn.test.ts` ("unrelated caller") printed `{"requestAdmitted":false,"otherProjectsTurnWrites":[{"kind":"end","outcome":"answered"}]}`. A request that is later refused still ended another project's turn.

The intent requires: "an uncertain one keeps it" (design line 60), a hold that lasts until the usage settles, and no state change from a caller without a role.

### 4. A model call whose usage is not recorded is either free or holds the money forever (Codex, Opus, Grok)

There is no single rule for "the model was called, but its usage is unknown":

- **Completion check, malformed JSON.** `check.ts:342-357` releases the hold, and nothing is charged. `rv-opus` `check-unsettled.repro.ts` and `rv-codex` `turn.test.ts` printed `"ingests":[{"kind":"end","outcome":"rejected"}]` after one model call.
- **Completion check, usage missing.** `rv-codex` `turn.test.ts` printed `"ingests":[{"kind":"end","outcome":"answered"}]` with no model-end. Nothing is charged.
- **Stream interrupted after text was generated.** `rv-codex` `turn.test.ts` printed `"failure":"The AI could not take this message. Nothing was charged for it."`, `"outcome":"rejected"`, while the generated text was saved as the reply.
- **Chat turn, usage missing.** The turn ends `answered` with one pending event, and nothing ever fills it, because the Managed Agents re-read that design line 60 relied on is gone since the AI SDK change. The hold stays forever. `rv-grok`: `bun --no-env-file ..\node_modules\vitest\vitest.mjs run --config vitest.config.ts`, run from `review-repros`, printed `{"failure":null,"released":false,"pending":1,...}`. `probe.sql` printed `"pendingMicros": 50000`, and `overdueAfterAnswered: []`.

The intent requires that a model call is charged, or its hold is kept until a known rule settles it.

### 5. A failed commit is ignored; the turn ends answered and the reply says the PRD changed (Codex)

`finishStagedTurn` (`tools.ts`) discards the result of `commitTurn`, and `runPrdTurn` (`turn.ts:450`) ends the turn `answered` either way.

- `rv-codex` `turn.test.ts` ("failed GitHub commit") printed `{"writes":1,"failure":null,"ends":[{"kind":"end","outcome":"answered"}],"appendedReply":[{"type":"text","text":"I updated the PRD."}]}`.

The intent requires that the turn reports the failure, or keeps the operation for a retry, so that the database, GitHub and the reply agree.

### 6. A section staged after `commit_turn` is accepted, then lost (Opus)

`stage_section` does not refuse once the turn has a prepared op. The AI SDK runs the tool calls of one step at the same time (`tools.ts:256`).

- `rv-opus/review-repros/stage-after-commit.sql` printed `stage technical-scope after the commit | {"staged": "technical-scope"}`, staged rows `usersToday, technical-scope`, and `what the op will publish | ["usersToday"] | prepared`.
- `parallel-stage-commit.repro.ts` printed `committed: [R1]  staged: [R1, R2]`.

The intent requires that a turn's staged sections are committed together, or the stage is refused.

### 7. The finalizer swallows a refused answer, marks the operation finalized, and the answer is lost (Grok)

`prd_finish_turn_op` (`20261024170000_prd_tools.sql:1280-1293`) catches the outcome writer's refusal.

- `rv-grok/review-repros/probe.sql` printed `outcome-direct ... "detail": "stale"`, then `swallowed-outcome { "opStatus": "finalized", "answerCount": 0, "finishReturned": true, "questionStatus": "suggested" }`.

The intent requires that the staged answer lands, or the operation stays unfinished.

### 8. After close, a second push drops the first push from the newest history row (Grok)

`prd_reconcile` (`20261024170000_prd_tools.sql:1473-1478, 1772-1780, 1811-1816`) builds each post-close history row from the frozen closed revision.

- `rv-grok/review-repros/probe.sql` printed `"history2KeepsFirstPushOfA": false`. The head commit holds both edits.

The intent requires that each push after close enters the history, while the closed view stays frozen.

### 9. A Dev removed from the project can still replay an admitted request and get a grant that reads and stages (Codex)

The replay path of `prd_turn_reserve` returns the stored turn without checking the role again.

- `rv-codex/review-repros/database.sql` printed `removed developer snapshot: forbidden`, then `removed developer replay: current_role=NONE, admitted=t, read_document=t, staged={"staged": "booking"}`.

The intent requires that a person cannot read or write what their role forbids, including on a replay.

### 10. The browser does not refetch on join, reconnect or focus (Codex)

Design line 125 says the client refetches when a larger number arrives, "on join, on reconnect, on focus, and after its own action". `src/lib/prd-port.ts` installs no status handler and no focus listener.

- `rv-codex`: `bun --no-env-file node_modules/vitest/vitest.mjs run --config review-repros/vitest.config.ts review-repros/realtime.test.ts` printed `{"serverSequence":2,"visibleSequence":1,"snapshotReads":1,"subscriptionStatusHandlerInstalled":false}`.

The intent requires that a missed ping is caught up at the next join, reconnect or focus.

### 11. A refused message is resent with its old request id forever and blocks the queue (Opus)

`src/components/prd-workspace/outbox.ts:79-82` puts a refused text back at the head of the queue with the same id. The server answers "already sent" (409) each time.

- `rv-opus` `resend-loop.repro.ts` printed `request ids sent: ["req-A","req-A","req-A","req-A"] queue: ["req-A","req-B"]`.
- `resend-rejected.sql` printed `outbox resends req-A | t` and `open turn for the relay | null`.

The intent requires that the message is refused once or sent with a new id, and that the next message runs.

### 12. Two refusals give the wrong reason (Codex, Grok)

- A caller with no role in a diverged PRD gets `not-yet` with the message "the repository diverged and an operator has to repair it", instead of `forbidden`. That tells an outsider the project's repository state. `rv-codex/review-repros/database.sql` printed `outsider send to diverged PRD: detail=not-yet`.
- An NGO user's send to a question that is not posted yet is refused with `forbidden`, "this account cannot send in this chat", the same message as a wrong role. The snapshot says `"block": "role", "reason": "not-open"`. `rv-grok/review-repros/probe.sql` printed `ngo-side-send { "detail": "forbidden", ... }`.

The intent requires that a refusal leaks nothing and gives the real reason.

## Findings from the Codex rerun

The founder asked for a second Codex Sol run with a gentler correctness brief that lists findings 1 to 12 as known (`units/review2.prompt.md` in the scratchpad). The run completed in 10 minutes with `pinned-argv` evidence and found seven new problems. The lead reran each command in `rv-codex` and saw the same output.

### 13. A merge can leave text in the read copy that the merge discarded

`git.ts:259` compares each imported commit with its own first parent. A side-branch edit, then a merge that keeps `main`'s text, leaves the side-branch text in the database.

- `bun --no-env-file node_modules/vitest/vitest.mjs run --config review-repros/vitest.config.ts review-repros/merge-tree.test.ts` printed `"databaseText":"Discarded side-branch rule","repositoryText":"Keep coordinator approval from main"`.

The intent requires that the read copy matches the tree of the head commit.

### 14. A completion check of an older revision blocks the newer revision

`20261024200000_prd_checks.sql:470` writes the check's gaps onto the current section state without checking that the scored revision is still current.

- `Get-Content review-repros/seed.sql, review-repros/check-race.sql | docker exec -i supabase_db_poancmeitlmxejofwzuu psql -X -U postgres` printed `checked_revision=1, current_revision=2, ... current_gap=Add coordinator approval, confirm_allowed=false, confirm_reason=gap`.

The intent requires that a check of revision 1 is kept as history and does not block revision 2.

### 15. The automatic close after a passing check can close while an NGO side-chat turn is running

`prd_close_after_check` (`20261024210000_prd_close.sql:697`) does not check again for active turns.

- `Get-Content review-repros/seed.sql, review-repros/close-race.sql | docker exec ...` printed `close race: closed=true, record_state=closed, active_ngo_turns=1`.

The intent requires that close is refused or waits until that turn ends.

### 16. The next AI turn loses the Use answer brief

`textOfParts` (`turn.ts:287`) drops `data-brief` parts from the chat history, so the model sees only the "Brief:" line.

- `review-repros/history.test.ts` printed `{"storedBrief":true,"promptHasOriginalAnswer":false,"promptHasEditedAnswer":false,"promptHasDeveloperNote":false}`.

The intent requires that the answer, the edited wording and Dev's note reach the next prompt.

### 17. The NGO is not told that Dev changed the answer's wording

`snapshot.ts:469` sets `changed: false` for every answer. `design/prd-ui-contract.md` line 102 says "If the developer changed the wording, the AI tells the NGO the final wording".

- `review-repros/answer-edit.test.ts` printed `{"original":"Two hours","edited":"Four hours","changed":false,"wordingChanged":null}`.

### 18. An answered question links to the suggestion, not to its Use answer brief

`snapshot.ts:468` points `briefTurn` at the question's introduction message.

- `review-repros/answer-edit.test.ts` printed `{"pointsAtSuggestion":true,"pointsAtUseAnswerBrief":false,"targetText":["Ask about shift length"]}`.

### 19. Removed branch protection is never detected

Design line 80 says: "If protection is found off ... the record goes to `diverged`. Publication stops". Sync never reads the protection (`git.ts:313`).

- `review-repros/protection.test.ts` printed `{"result":{"ok":true},"state":"open","protectionReads":0,"reconciled":true}`.

## Dropped

- Codex: the fund going below zero after one request that overran its reservation (`availableMicros=-5029`). Design line 62 accepts that overrun while the request is in flight. Finding 3 keeps the case the design does not accept.
- Codex: an NGO member who is not an admin gets the NGO role and can answer side chats. REQ-036 says "NGO users can read the PRD and its progress and answer the questions posted to them", so this is the specified behavior.
- Opus: none. Its mid-stream test passed, and it reported that test as held up.
- Grok: none.
