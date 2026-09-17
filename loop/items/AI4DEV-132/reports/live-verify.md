# AI4DEV-132 (Discovery credits engine) — live verification

Drive script: `.claude/skills/verify-ai4good/scripts/drive-discovery.ts`. Run from the lane
worktree `AI4DEV-132-unit0` on branch `lane/ai4dev-132`, against the stack this checkout owns.
Evidence: `loop/items/AI4DEV-132/artifacts/verify-discovery/transcript.json` (redacted,
overwritten by each rerun; this file reports the run at lane head `1658ab1`, after two review
fix commits).

## First run (before the fix)

The first run, at commit `65ca304`, found a product defect: the deployed `discovery-message`
function always sent an `effort: "low"` parameter (from `DISCOVERY_REQUEST_SETTINGS.effort` in
`supabase/functions/_shared/discovery-metering.ts`) to the pinned model
`claude-haiku-4-5-20251001` (the `DISCOVERY_MODEL` override in the function environment), and
that model refused the parameter: `400 invalid_request_error: "This model does not support the
effort parameter."`, surfaced to the client as 502. That defect caused four failures: check 1
(the JSON send), check 2 (the streamed send — no `text-delta` or `data-turn` ever arrived),
check 3 (the cancelled send — no `text-delta` ever arrived to cancel after), and half of check 5
(the send after re-enabling Discovery). The switch, its refusal, its audit rows, the
fuel-exhausted check, and the daily-allowance-exhausted check were unaffected and passed. Score
that run: 4 of 7 checks passed outright.

The coordinator reported the fix landed on `lane/ai4dev-132` at commit `201b54b`: "the client
sends `output_config.effort` only to the pinned Opus model; the Haiku override no longer
receives it." A rerun right after that fix passed all seven checks (see below); this section
kept the numbers from that rerun until the next one superseded them.

## Second review-fix rerun (lane head `1658ab1`)

Two further review-fix commits landed on `lane/ai4dev-132` (head `1658ab1`): cache tokens are
folded into the metered input, a cancel before the provider answered settles failed, a stop
mid-reply is charged for the received text (counted through `countTokens`) instead of the
output cap, a refusal settles failed, the stream exposes its header across origins, and the
ledger names the served model. The drive was rerun with the same `outDir` (overwriting the
transcript) and no stack restart. The drive script itself was extended for this rerun to also
read back `request_settings.model` (check 1) and `output_tokens` plus a below-cap comparison
against 4096 (check 3).

## Doctor

- (a) auth health: PASS — `GET /auth/v1/health -> 200`.
- (a2) mail identification: PASS — `Mailpit v1.30.2 at http://127.0.0.1:44324`.
- (a3) edge runtime mount: PASS — mount is
  `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-132-unit0\supabase\functions`
  (this checkout).

## Setup

NGO admin signed up, confirmed and completed (`organizationId
6bf56291-e56d-4e78-82b2-688843aad970`). A platform administrator was provisioned (admin users
API plus the operator `accounts` insert) and signed in. Two needs were started and submitted
into `discovery_in_progress` (`projectId1 94c9140d-fdb5-4c9d-b2c4-5708560bbbb4`, `projectId2
2eeb638a-270f-45e3-8153-e2e3de573991`).

## The seven checks (this rerun)

**1. JSON send on an unfunded project — PASS.**
`200 {"ok":true}`. Reply was 272 characters, `turn.status` was `settled`, `allowance` was
present (`dailyGrant 10, spentToday 1, remaining 9`). Readback: `discovery_turns` row is
`settled`, `served_model = claude-haiku-4-5-20251001`, `request_settings.model =
claude-haiku-4-5-20251001` (the two now agree — the effort-parameter fix routes the request to
the model that is actually served), `charged_credits = 1`, `discovery_spend.spent = 1` — equal
to the charged credits.

**2. Streamed send with `Accept: text/event-stream` — PASS.**
Headers: `content-type: text/event-stream`, `x-vercel-ai-ui-message-stream: v1`. SSE part
sequence: `start, text-start, text-delta ×29, text-end, data-turn, finish, [DONE]`. The
`data-turn` payload carried `ok: true` and a settled turn. Readback: `discovery_turns` row for
this turn is `settled`, `stop_reason: end_turn`, `served_model: claude-haiku-4-5-20251001`,
`request_settings_model: claude-haiku-4-5-20251001`, `charged_credits: 1`.

**3. Streamed send aborted after the first text-delta — PASS.**
The client received `start, text-start, text-delta` and aborted immediately after that first
delta (`aborted: true`). Waiting for settlement through the edge runtime's background task, the
row read back `status: settled`, `stop_reason: user_stopped`, `output_tokens: 31`,
`max_output_tokens: 4096`, **below the output cap of 4096: true** — this is the "charged for the
text received, not the output cap" fix in `1658ab1`; the first run's cancelled turn (before that
fix) had `output_tokens: 4096`, exactly the cap. `charged_credits: 1`. The allowance dropped by
exactly that charge: `remaining` before 8, after 7.

**4. discovery-conversation read — PASS.**
`turns.length` (3) matched `discovery_turns` rows (3) in the same seq order, and `allowance` was
present: `{"vetted":false,"dailyGrant":10,"spentToday":3,"remaining":7}`.

**5. Platform admin per-organisation Discovery switch — PASS in full.**
Disable: `200 {"discoveryEnabled":false,"changed":true}`. The next send answered `409
{"kind":"discovery-disabled","reason":"a platform admin switched Discovery off for this
organisation — Discovery drive: disable check"}`. Enable: `200
{"discoveryEnabled":true,"changed":true,"disabledAt":null}`. The send after re-enabling answers
`200 {"ok":true}`. Audit readback: `audit_events` carries exactly two `org_discovery_switched`
rows for this organisation, `enabled=false` then `enabled=true`, in order.

**6. Funded project with no fuel — PASS.**
The operator set `projects.funded_at = now()` on the second project (fuel left at 0). The send
answered `409 {"kind":"fuel-exhausted","reason":"this funded project has no fuel left for this
Discovery turn; top up project fuel to continue; free credits are never spent on a funded
project"}`. The organisation's `discovery_spend` row was byte-identical before and after
(`spent 4, granted 10, remaining 6` both times).

**7. Drained daily allowance — PASS.**
The operator set `discovery_spend.spent = granted` for today's row (`spent 10, granted 10,
remaining 0`). The send answered `409 {"kind":"daily-allowance-exhausted","reason":"...has no
Discovery credits left today — get vetted (daily grant becomes 30), fund project fuel to
continue now, or wait for the next UTC day"}`, naming all three tier remedies.

**Score: 7 of 7 checks passed (27 of 27 sub-checks).**

## Part 2: the grant-tracker recording

`ANTHROPIC_API_KEY` was loaded from `C:\Users\nirdr\Downloads\ai4good\.env.local` into the
process environment for one command only (never printed), with the five `AT_SUPABASE_*` stack
coordinates supplied the same way the acceptance runner supplies them. Running
`bun tests/at/suites/req-004/fixtures/record-grant-tracker.ts` from the lane worktree:

```
error: recording was served by a fallback model; retain the handwritten fixture
  at tests/at/suites/req-004/fixtures/record-grant-tracker.ts:24:63
```

The recorder's own guard refused: the served model (`claude-haiku-4-5-20251001`, from the local
stack's `DISCOVERY_MODEL` override) is not `DISCOVERY_REQUEST_SETTINGS.model`
(`claude-opus-5`, the pinned model the fixture is recorded against). **The recording did not
land.** `git status` showed no changes after the run — the fixture file was not touched (the
throw happens before the write). Per instruction, Part 2 stopped here — `bun run at:selftest`
and `bun run at:verify req-004 --tier loop --expect` were not run.

## Commit

Part 1 needed no new commit: the drive script itself was already committed in the first run
(`65ca304`) and this rerun only overwrote the transcript evidence file, which is not committed.
Part 2 produced no fixture change to commit (recording refused before any write). No commit was
made in this pass.

## Recording, third attempt

The coordinator reported the recorder no longer refuses a substitute model outright; instead
(lane commit `6defc86`) it records whatever model served and names it in `recordedWith`. The
recorder was run again from the lane worktree, `ANTHROPIC_API_KEY` loaded from
`C:\Users\nirdr\Downloads\ai4good\.env.local` into the process environment for that one command
only (never printed), with the five `AT_SUPABASE_*` stack coordinates supplied the same way as
before.

This time the run got past the served-model guard and reached the oracle check on the last
reply's `record_elicitation` tool input, which refused. Verbatim:

```
error: recording did not satisfy its oracle: missing story or acceptance criterion: two staff;
missing story or acceptance criterion: no developer; fact has no grounded story: The NGO is a
two-person organization with no developer on staff; fact has no grounded story: Both staff
currently track funder reporting deadlines in a shared list; fact has no grounded story: Both
staff frequently forget to check the list regularly; fact has no grounded story: The tool must
store only funder names, reporting dates, and two staff email addresses; fact has no grounded
story: Both staff need to add new funders and deadlines to the list; fact has no grounded
story: Both staff need to edit funder names and due dates in the list; fact has no grounded
story: Email reminders must be sent to both staff seven days before each reporting deadline;
fact has no grounded story: Success means both staff can update the list and receive timely
email reminders; story exceeds intake: As a staff member, I need to add a new funder name and
reporting deadline to the shared list so that all deadlines are tracked in one place. (tracked,
place, appears, immediately); story exceeds intake: As a staff member, I need to edit a funder
name or due date in the shared list so that deadline information stays accurate. (stays,
accurate, updated, appears, immediately); story exceeds intake: As a staff member, I need to
receive an email reminder seven days before a funder deadline so that I have time to prepare
the report. (exactly)
  at tests/at/suites/req-004/fixtures/record-grant-tracker.ts:33:34
```

**The recording did not land.** `git status` showed no changes after the run — the throw
happens before the fixture file is written, so nothing was touched. Per instruction, this run
stopped here: no fixture commit, and `bun run at:selftest` and
`bun run at:verify req-004 --tier loop --expect` were not run.

The model this run was actually served by (visible in the console output before the throw) was
`claude-haiku-4-5-20251001` — the local stack's `DISCOVERY_MODEL` override — but the fixture was
never written, so no model is named in `recordedWith` for this attempt.

## Second review-fix rerun: commit note

This rerun was Part 1 only, at the coordinator's instruction. The drive script gained two read
fields (`request_settings.model` in check 1, `output_tokens` and the below-cap comparison in
check 3) and was rerun with the same `outDir`, overwriting the transcript. No commit was
requested or made for this pass; the script change sits uncommitted in the lane worktree
alongside the already-committed `65ca304` version.

## What I could not do, and why

- Could not complete Part 2 (the recording and the two acceptance checks that depend on it) as
  of the second attempt, because the local stack served Discovery through the Haiku override
  (`DISCOVERY_MODEL=claude-haiku-4-5-20251001`) and the grant-tracker recorder refused to record
  against any model other than the pinned `claude-opus-5`. The third attempt (lane commit
  `6defc86`) removed that guard but then refused on its own oracle check instead (see "Recording,
  third attempt" above); Part 2 has not yet landed a fixture.
