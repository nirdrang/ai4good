# AI4DEV-60 (session expiry, refresh, password reset) — AUDIT-SITTING RULINGS

**Sitting 4 of the item: AUDIT. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).** The audit panel is two seats, each blind to the other: seat one gpt-5.6-luna
via codex (effort max), seat two opencode-go/deepseek-v4-flash via opencode (variant max, agent
reviewer-flash, identity extract clean — 19 of 19 messages on the pin). Both seats landed with
findings, so this sitting exists. Both raw outputs, both distillates, the opencode seat's
tool-call summary and identity extract are committed beside this file in `artifacts/`.

Every claim below was verified FIRST-HAND against the tree by this sitting before ruling.
All six findings are true. All six are ACCEPTED. Every one is the "stated fact untrue" class,
and in every one the remedy is the record changing to match the code and the measurements —
never the other direction. No finding touches an executable statement.

## The panel's box verdicts, recorded

Seat one (luna): rulings-implemented PASS (all 19), scope PASS, stated-facts FAIL (its three
findings), plus PASS on all six additional boxes (rulings in tree, removal condition, edge.ts
equivalence, fixture mirrors, bookkeeping, proof-local consistency).

Seat two (flash): rulings-implemented PASS (all 19, traced line by line), stated-facts FAIL
(its three findings), fixture-mirrors FAIL (its findings 2 and 3), removal-condition PASS,
edge.ts equivalence PASS (per-shape trace), bookkeeping PASS, proof-local consistency PASS —
and scope COULD-NOT-VERIFY, resolved by this sitting below.

Convergence: no two findings name the same line. The class converges — all six findings are
record drift against the item's own measurements and lifecycle, which is the exact subject the
audit brief set. The strongest single signal is that each seat independently found the record
lagging the fix sitting's re-pins in a place the other seat did not read.

## Ruling 1 — ACCEPT. Seat one, finding 1: the plan's amendment header omits the second amendment

Claim (luna, verbatim): "The amendment header omits the second amendment directed by
`draft-rulings.md`, although that amendment changed the plan."

True. The header names the gate-1 amendment, then "AMENDED a third time" and "a fourth time".
The second amendment — the three `draft-rulings.md` rulings that changed D-B (the unparseable-2xx
edge), the blank-id record, and D-H (the measured diff size) — is absent, so the numbering
skips and the changes cannot be traced through the header. Fix: this sitting inserts the
second-amendment paragraph into the `plan.md` header. The state file this sitting rewrites
carries the corrected history.

## Ruling 2 — ACCEPT. Seat one, finding 2: comments still say Auth answers 401 where 403 was measured

Claim (luna, verbatim): "The self-test and `edge.ts` comments still describe revoked or expired
`/auth/v1/user` responses as HTTP 401, while the accepted measurement records HTTP 403."

True at exactly two sites, and this ruling names them so the fix cannot overreach:
- `tests/at/harness/shipped-caller.selftest.ts:98-100` — "401 is what Auth answers for a
  revoked session and for an expired access token". The live proof measured 403 twice
  (`session_not_found`, `bad_jwt`; `fix-rulings.md` ruling 2).
- `supabase/functions/_shared/edge.ts:199` — "GoTrue answers a JSON object on both the 200 and
  the 401". The measured refusal is 403.

Three other 401s are TRUE and MUST STAY: `edge.ts:174, 185, 189` state the deployed function's
OWN refusal status, which is 401 (measured in proof check (c): deployed function 401 with a dead
token). The selftest's header line 12 ("the acceptance fixture renders ... a 401 with no user")
describes the FIXTURE, and the fixture does render 401 (`_fixture.ts:592`,
`callerFromAuthAnswer(401, null)`) — a harmless divergence from the live 403, harmless because
`callerFromAuthAnswer` treats every non-2xx identically; it stays. The status literals in the
selftest's refusal loop (line 101) are test inputs, not claims; they stay. The executor applies
the two-site fix.

## Ruling 3 — ACCEPT. Seat one, finding 3: the pull-request body says "plan phase"

Claim (luna, verbatim): "The PR body still says \"Status: plan phase\" and says implementation
comes after plan review, despite the branch containing the implementation and `PHASE-STATE.md`
reporting the fix-and-goal phase."

True, in both `loop/items/AI4DEV-60/pr-body.md` and the live body of pull request #50 (read via
`gh pr view` this sitting — identical text). The body itself promised "This body will be brought
up to date as the item moves", and it was not. Fix: this sitting rewrites the status paragraph
to the item's real state, and a mechanical publishes the updated body to pull request #50 as
handed. No other item's id appears in the body before or after.

## Ruling 4 — ACCEPT. Seat two, finding 1: the verify transcript compares against a number the record never carried

Claim (flash, verbatim): "The step-6 transcript says \"at:selftest is 264 tests, one more than
the baseline's 263. The one added is the blank-id case in shipped-caller.selftest.ts (gate-2
ruling 6)\" — but this item's own baseline (baseline.txt:22, 127-129) records 257 tests in 10
files and states the item \"adds an eleventh file in step 1\"; the delta from that baseline is
+1 file and +7 tests (the whole new selftest), and 263 appears nowhere in the record."

True. `baseline.txt` records 257 tests in 10 files; the new selftest carries seven cases
(counted this sitting: seven `it(` blocks; 257 + 7 = 264); 263 is the unrecorded intermediate
count after step 1 and before the blank-id case. The bottom-line 264 is correct — the defect is
the mislabelled comparison point in a file whose own header invites a line-for-line comparison
with the baseline. Fix: this sitting corrects the commentary lines in `verify-final.txt` to the
true comparison (257 in 10 files → 264 in 11; +1 file, +7 tests; six cases from step 1, the
blank-id case from gate-2 ruling 6) and marks the correction as made at the audit sitting, so
the transcript never silently pretends it always said so. The captured command output below the
commentary is untouched.

## Ruling 5 — ACCEPT. Seat two, finding 2: mirror 5 kept the pre-re-pin sentence the fix sitting corrected

Claim (flash, verbatim): "Mirror 5's bound clause says the live checks measured \"with a wrong
password no row exists\", but the item's own re-pin (fix-rulings.md ruling 1; proof-local.txt
check (a)) recorded the opposite: a row already existed before the attempt (the
confirmation-link implicit-flow sign-in), and the measured predicate is the unchanged
session-id set — the sentence retains exactly the pre-re-pin wording the fix sitting corrected."

True. `_fixture.ts:113` says "with a wrong password no row exists"; `fix-rulings.md` ruling 1
and the amended plan D-G (a) record that one row already existed (the confirmation-link
implicit-flow sign-in) and that the measured predicate is the unchanged session-id set across
the refused attempt. The mirror section's own contract is that each label states what the live
check actually binds, so this is the panel's clearest catch: the re-pin was applied to the plan
and the transcript but not to the mirror that cites them. Fix: the executor rewrites the clause
to the re-pinned predicate, citing the ruling.

## Ruling 6 — ACCEPT. Seat two, finding 3: a citation adds a word the cited line does not contain

Claim (flash, verbatim): "The reset-link retention comment cites
`.taskmaster/docs/acceptance/at-req-001.md` line 30 as reading \"reset-link expiry, single-use
and resend semantics are not stated in REQ-001\", but the line reads \"reset-link
expiry/single-use semantics are not stated in REQ-001\" — the word \"resend\" is added to the
citation."

True. Line 30 reads exactly "reset-link expiry/single-use semantics are not stated in REQ-001";
"resend" is not in it. The resend ban is real but belongs to the plan's own binding (`plan.md`
lines 42-43 quote line 30 correctly and then extend the ban to resend in the plan's own voice).
A citation must carry the cited words and nothing else — the same comment-versus-file class this
item itself corrected in `edge.ts` under gate-2 ruling 7. Fix: the executor rewrites the
parenthetical at `_fixture.ts:846-848` to quote line 30 exactly and attribute the resend
extension to the plan's binding. Substance unchanged: no body asserts retention, invalidation,
or resend.

## The scope box, resolved

Seat two returned COULD-NOT-VERIFY on "the diff stays inside its declared scope" — its sandbox
has no git tool and cannot read `.git`. This sitting ran the check it asked for, first-hand:
`git diff --name-only c11e352..HEAD` (merge-base with origin/main). Every changed path is inside
the declared surfaces: `supabase/functions/_shared/caller.ts` and `edge.ts` (the shipped
judgment), `tests/at/harness/shipped-caller.selftest.ts` (the eleventh file),
`tests/at/expected/req-001.json` (the declaration), the five req-001 suite files under
`tests/at/suites/req-001/`, and `loop/items/AI4DEV-60/**` (the item record). Nothing under
`src/`, nothing under `.taskmaster/`, nothing under `loop/decomp/`, and `supabase/config.toml`
does not appear in the diff at all. **Scope: PASS**, now established by two instruments — seat
one's read and this sitting's git enumeration. Seat two's abstention is recorded as the honest
answer it was, not as a failure.

## Why the panel does NOT re-run for these fixes

The re-run rule fires when code changed. These six fixes change comment text and record files
only: zero executable statements move, which the verify ladder re-establishes at the fixed head
(typecheck, `at:selftest`, `at:verify` req-001 and req-016 — results in the completion report
and the state file). Every new sentence is the one the panel's own finding dictated, quoted
here beside its ruling, so a re-run would audit text the audit itself wrote. The conductor's
spawn directive for this sitting states the same derivation: after a ruled audit, the next
phase is CI on the final head, then the merge sitting. Both readings agree; this ruling records
them together, and the merge sitting inherits the six fixes as auditable against this file.

## Observation for the record (no ruling)

Seat one's belt-and-braces SendMessage to the conductor's agent id DELIVERED this time — it
resumed the conductor from transcript — unlike the earlier sittings of this item, where the
same send was rejected. A system fact, noted so the next reader does not treat either outcome
as the rule.

## Caps

None fired. This sitting's executor budget: one invocation planned for the comment fixes; none
spent at the time of these rulings.
