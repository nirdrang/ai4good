# MERGE RULING — AI4DEV-59 (email verification, unverified-write gate)

**Ruled by:** the merge sitting (orchestrator, fable, claude-fable-5 @ xhigh), 2026-08-09.
**Pinned head:** `f877787dc0a047c2c6f0ba6db1bc282586275671` — the tip of this pull request's
branch, verified against the remote and against the pull request's own head reference.
**Decision: MERGE.** A mechanical publishes this ruling and executes the squash merge. The
orchestrator never runs the merge command (founder ruling 2026-08-07).

## The licence: what is green, exactly

- Required check `verify` (workflow "CI") — the only required status context on `main` —
  is green on exactly the pinned head: run 31325473331, job 93275013384, created
  2026-08-09T17:05:03Z, completed in 41s, conclusion success.
- The live pull-request body is byte-identical to the record's `loop/items/AI4DEV-59/pr-body.md`
  (compared as normalized UTF-8 this sitting). It names no item id this branch does not own.
- One `cancelled` run exists in the branch history (16:15:50Z). It ran on a superseded head,
  42 seconds after a sibling run on the same push window, and no ruling rests on it.

## What was built

Deliverable D2 leaf L1 of the authentication requirement: the email-verification flow for
every email-capable account type, and the gate that stops an email-unverified account writing
Discovery messages.

- "Verified" is Supabase Auth's own fact (`email_confirmed_at`). No migration, no new column.
- The local auth config turns email confirmations on — the flip the suite's own header
  reserved for this leaf.
- The gate ships as a shared decision module, `supabase/functions/_shared/verification.ts`
  (167 lines, the only change under `supabase/functions/`). The future Discovery send route
  must call it; no Discovery surface is built here.
- AT-001.09 and AT-001.10 go from declared-pending stubs to real bodies at the loop tier.
  The requirement's expected state holds: 9 ids green, 28 declared red, exit 0.
- A live local-stack transcript (`proof-local.txt`) carries what the loop tier cannot reach:
  the real confirmation email, a tampered link flipping nothing, the emailed link flipping
  the account to verified, sign-in refused before confirmation with the pinned error code,
  and both public account types completing end to end under the flipped config.
- A direct shape selftest covers the module's fail-closed answers to malformed input.

## What the green does and does not claim

Repeated from the plan's section 4, as this ruling must:

**Claims** — the two tests exist, execute, open worlds and assert; the shipped decision module
`verification.ts` — byte for byte the code a future route imports — behaves as the two
criteria require, and fails closed; the config flip is real and the live verification round
trip works on one machine.

**Does not claim** — that any deployed route enforces the gate (none exists to), that hosted
email delivery works, that any screen exists, or anything about session expiry, revocation,
refresh or password reset (the session-and-reset leaf's ids, declared red).

## Dispositions — every finding, every gate, every audit wave

Full rulings with each claim quoted verbatim: `loop/items/AI4DEV-59/plan.md` sections 7–10.
Raw reviewer outputs and distillates: committed under `loop/items/AI4DEV-59/artifacts/`.

**Gate 1 — plan review, one reader (sol via codex). Four findings, four accepted.**
- [1] high — accept, fixed differently: the provider-confirmed fixture mirror is declared
  UNBOUND instead of live-proved (no OAuth credential exists to measure it); the false
  step-5 sentence removed.
- [2] medium — accept: step 5(e) rewritten so the second address completes as a real
  volunteer under the flipped config.
- [3] medium — accept, fixed differently: the fixture-discipline criterion restated —
  product judgements only from the shipped module, every vendor mirror named with what
  binds it.
- [4] medium — accept: a fail-closed shape selftest added as the missing oracle.

**Gate 2 — draft-code review, blind panel of two (terra via codex, flash via opencode).
Twelve findings, ten distinct defects (two convergent pairs), twelve accepted, zero rejected.**
- [A2]+[B1] convergent — accept: the never-issued-link mirror gets a real negative
  instrument, proof check (b2), a tampered link that must flip nothing.
- [A1] medium — accept: the malformed-caller selftests now assert the refusal reason names
  verification.
- [A3] high — accept: the pre-confirmation refusal check pins GoTrue's
  `email_not_confirmed` error code instead of accepting any 4xx-and-above.
- [A4] high — accept: check (e) requires the volunteer's link source to be the emailed link.
- [A5] medium — accept, fixed differently, with a verification condition that HELD: the
  stale-mount probe's revision-independence argument was verified by measurement before
  being relied on.
- [A6]+[B2] convergent, high — accept: the transcript redactor scrubs query-parameter
  values, JWT-shaped substrings and sensitive name=value pairs in strings; the committed
  transcript was inspected for credential residue before commit.
- [A7] medium — accept: the fixture header's false import claim corrected.
- [A8] low — accept, fixed differently: the provisioned platform admin starts confirmed,
  mirroring the repository's own provisioning recipe.
- [A9] low — accept: the pull-request body brought to the current truth.
- [B3] low — accept: the acceptance-file section attribution corrected.

**Audit wave 1 — blind read-only panel at head `ad8daad` (luna via codex, flash via
opencode). Five findings; the seats' findings were disjoint.**
Seat A boxes: adopted-rulings FAIL, redaction FAIL, runtime COULD-NOT-VERIFY (correct —
execution evidence is CI's), all others PASS. Seat B boxes: all three PASS, one finding
attached as a low-severity note.
- [L1] low — accept: the record's fixed-differently count corrected (a summary sentence
  contradicted its own itemized rulings).
- [L2] medium — accept: the `/confirm/i` fallback removed; the refusal predicate is the
  pinned error code alone. The committed transcript stays valid under the tightened
  predicate, shown by reading.
- [L3] medium — accept: the signup-session guard also treats a string `refresh_token` as a
  carried credential.
- [L4] medium — accept: the mail-catcher probe's output passes through the scrubber before
  printing.
- [L5] low — verify first, verified: the branch-scope statement the seat could not check
  was re-measured read-only and is true; the record stands.

These three code changes armed the item's one audit re-run.

**Audit wave 2 — the WHOLE panel re-ran at head `6e22564`. Five raw findings, two
convergences, three rulings, all accepted, zero rejected. No ruling changed code.**
Seat A (luna via codex) boxes: rulings-implemented PASS, diff-scope PASS, stated-facts FAIL,
runtime COULD-NOT-VERIFY. Seat B (flash via opencode): its first launch crashed with no
output — recorded as an anomaly, never as a clean seat — and the relaunch landed; boxes:
rulings-implemented PASS, diff-scope PASS, stated-facts FAIL.
- [M1] medium, convergent — accept, fixed differently: the record over-claimed what proof
  check (e) re-asserts. The record now enumerates (e)'s exact predicate and names the three
  status conjuncts it does not carry. The code is deliberately untouched: no adopted ruling
  required those conjuncts, and a code change would demand a second panel re-run the
  once-per-item cap forbids. The tightening is filed as carried-forward instrument thinking.
- [M2] low, convergent — accept: the launch-timestamp contradiction in `stack-up.txt` is
  real; a dated, attributed annotation reconciles it, every original evidence line untouched.
- [M3] low — accept: the ambiguous "converge on no defect" sentence now says the first
  wave's findings were DISJOINT, with the count of five beside it.

## Maintained reviewer disagreement

None exists. Every finding across both gates and both audit waves was accepted — zero
rejections — so no dismissed claim needs verbatim carriage here, and no reviewer maintained
that this green is unearned. The two stated-facts FAIL boxes from the re-run are answered:
every fact they flagged was corrected in the record ([M1], [M2], [M3]), and both seats'
rulings-implemented and diff-scope boxes are PASS.

## Carried forward — filed as separate work, not built here

1. The pre-existing flaky selftest: `tests/at/harness/runner.selftest.ts` line 222, a
   stale-lock race, present on the unchanged tree (evidence in the item's baseline record).
2. The Supabase CLI ignores the local `[auth.rate_limit] email_sent` config; measured this
   item, recorded in `stack-up.txt`. Not this branch's defect.
3. `loop/items/` sits outside every typecheck config, so proof scripts there are proved only
   by hand-scoped compiler runs.

Also disclosed, untouched, pre-existing: the stale "not-yet-landed ids" count in
`tests/at/suites/req-001/_bind.ts` line 31.

## Execution

The mechanical: (1) posts this ruling as a comment on pull request #49, as handed;
(2) runs `gh pr merge 49 --squash`; (3) reports the merge commit SHA and the pull request's
final state, and reports any refusal verbatim. The orchestrator verifies the merged state,
the board flip, and then writes the terminal phase state.
