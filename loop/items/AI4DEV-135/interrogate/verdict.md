# Interrogate verdict, scope run, head 7ca1baf reviewed

## Intent
The branch builds the structured scope output of the Discovery chat: an explicit `discovery-scope` write that calls the model once, stores a versioned contract and a money-free markdown, feeds later consumers by version, grows a shared cause-label vocabulary, guards free-billing turns against off-topic use with a three-strike flag, and bounds regeneration at three with an admin escalation. Retries after a failed turn cost zero credits.

## Reviewers
- astra (codex gpt-6-astra, medium): 4 findings, all critical; receipt pinned by argv (codex does not report the served model).
- muse (opencode muse-spark-1.3-contributor, xhigh): 14 findings; model verified.
- grok (grok-4.6, xhigh): 8 findings; model verified.
- opus (claude opus, xhigh, native): 15 findings.
- deepseek (opencode deepseek-v4.1-flash, max): 10 findings; model verified.

## Act on (fixed in the commit after 7ca1baf)
1. The regeneration reason never reached the model; every regeneration sent the same prompt. astra, deepseek, opus. The begin snapshot now returns the previous contract; the request's uncached block carries the previous scope and the NGO's reason; AT-004.37 asserts the reason and the previous summary in the captured requests.
2. The bound counted an in-flight `generating` row before the in-flight check, so a second click during the third regeneration escalated and notified admins. astra, deepseek, opus. The in-flight check runs first; the count takes `current` and `superseded` only; AT-004.38 opens the last regeneration without committing and asserts `generation-in-flight`, no notification.
3. A reopened failed row kept its id, so a late commit of the old attempt could settle the new one. astra, grok. The reopen takes a fresh id.
4. The scope transcript sent every settled turn including tool-only turns with an empty assistant text, which the API refuses; the chat path already skipped them. astra, muse, opus. The begin returns transcript rows; TypeScript builds the messages with the one shared normaliser (`contextMessagesFrom`, now in `discovery-prompt.ts`); off-topic turns are left out of the scope transcript (muse).
5. The money word-list scanned the NGO's own title and stories, so a need about budgets could never generate. muse, grok, deepseek, opus. The gate now scans the model-authored fields only (`scopeModelText`).
6. `maxItems` inside a strict tool schema; the API answers 400 (checked against the structured-outputs page). opus. Removed; `parseScope` keeps the bound.
7. The retry rule saw only `failed` turns; a turn lost to a timeout ends `abandoned` and the resend billed again. grok, opus. `abandoned` counts as a retry predecessor; AT-004.39 proves it with a backdated open turn; AT-004.46 admits the zero-cost row.
8. Unbounded regeneration reason. muse, opus. Capped at the message cap (4000) in the edge and in SQL. Labels capped at 40 characters in `parseScope` (opus).
9. No email-verified gate on scope writes while turns have one. muse. Added to `discovery_scope_begin` and the fixture.
10. `normaliseLabels` was an identity in every reachable case. opus. Deleted.
11. The off-topic admin email named no project. opus. It names the project and organisation ids.
12. The Maintenance section said "owns the code" twice. deepseek. One sentence.

## Consider (for the founder, listed under Not done here in the pull request)
- Scope calls are outside metering; a failed generation can be retried at zero cost without a bound (muse, deepseek, opus). Zero credits is the design decision; a per-project cap on failed attempts is the open question.
- A failed regeneration consumes a version number without counting toward the bound (muse). By design; noted.
- The chat's cached system block carries skill 06 (write the scope) although chat turns have no `record_scope` tool, and the scope call carries the elicitation skills (grok, deepseek, opus). The one cached block is the cache-sharing decision from the design; a split costs one more cached prefix.
- The conversation read carries no guardrail state (count, flagged, notice) for a reload (grok). The wiring leaf decides how the page shows it.
- Three rewrites of `discovery_scope_begin` across four migrations on one branch (opus, deepseek). Squashing before merge is a founder call; the migrations are unmerged.
- `remove-label` leaves the label in the scope contract and markdown (muse, deepseek, opus). Already listed as not done.

## Noted
- A stored contract that `parseScope` refuses makes the whole conversation read fail (muse, opus). Only `scopeAct` writes contracts today.
- `scopeSourceForPrd` and `scopeReferenceForScorer` are one function under two names (grok, opus). Kept: the design pins two consumers to one version.
- Markdown injection through the title (muse). The NGO reads its own title.
- The notice payload built in TypeScript carries the bound as `regenerations` while SQL uses the real count (muse). The copy uses only the reason.
- Structure: duplicated admin fan-out SQL, a 500-line `scope.ts` (muse, deepseek, opus).
- `buildScopeRequest` names the client model while the port serves its own (opus).

## Dismissed
- Concurrent begins collide on unique indexes as 500s (muse): `discovery_scope_begin` and `discovery_scope_commit` lock the project row `for update` first, so begins serialise.
- Strikes equality can be skipped by concurrent settles (muse): one open turn per project; settles serialise.
- Stop is prompt-only (grok): the founder ruled the grill-me pattern at the unit 4 gate.
- The off-topic notice on every turn after the flag (deepseek): the design says from the flagged turn on.
- `DISCOVERY_STOP_RULE` has no product caller (opus): it is the pin pattern this suite uses for prompt lines.
- `scopeAct` throws on an unparsable stored elicitation (grok): stored elicitations were parsed at settle.

## Agreement map
Three lanes met on the regeneration reason and on the in-flight count; four on the money gate scanning the NGO's words; three on the empty assistant turn. The two opencode lanes and opus went widest; astra went deepest on the SQL races; grok alone tied the retry rule to the real timeout path, which opus then also raised. No lane contradicted another on a fixed item.
