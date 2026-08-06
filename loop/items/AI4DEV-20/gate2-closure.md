# Gate 2 closure — every finding ruled closed or rejected, and Q1–Q4
## AI4DEV-20 (item agent: fable @ xhigh, 2026-08-06)

There is NO reviewer confirmation step (founder 2026-08-05): after the fix round the item agent
rules each finding's disposition; the checks on the fixes are the verify suite, luna's
independent audit, and the required CI check on the pinned head. Fix round: `c58f52a` (clusters)
+ `6494f82` (verification), record in `fixes-done.txt`. Verification at 6494f82: typecheck
exit 0; at:selftest 243/243; req-016 loop --expect exit 0, manifest byte-identical; runner.ts
no diff. Five mutations run and reverted, each caught by exactly the test built for it.

## Findings — closed
- **Cluster A (terra 1 BLOCKER + kimi 1 + kimi 2) — CLOSED.** Shadow refusal (duplicate key
  first, filename≠key second, each with a test the other cannot satisfy; kimi's probe
  reproduced verbatim as the test); realpath case-insensitive committed-dir compare on win32;
  `recordedFrom` derived from the transport's brand — caller can no longer supply it; README
  rewritten to name git review as the authenticity boundary. Mutation: disabling the duplicate
  rule fails the shadow test and nothing else — the measured hole had exactly one guard, now
  proven.
- **Cluster B (terra 2 BLOCKER) — CLOSED.** Transports branded; both wrong-tier refusals
  tested in both directions plus all legal combinations; a fake cannot mint live provenance
  (via A.3), which is what makes fake-anywhere safe.
- **Cluster C (terra 3 + kimi residual) — CLOSED.** File-level credential strip covers every
  present AND future test in the oracle selftests; AT_JUDGE_API_KEY joined the runner
  selftest SENTINELS (allowlist + real-child probe both prove the drop; runner.ts untouched —
  F8 holds); the typeprobe compiler spawn now takes `childEnv()` instead of inheriting.
- **Cluster D (terra 4 + terra 5 + kimi residual 4) — CLOSED.** The D verdict: BOTH reviewers
  right about different layers — terra's ordering defect was real at the cited line (content
  filtered/joined before stop_reason was consulted, inside the live transport), kimi correctly
  described the layer above; a reader of only kimi's report would have called the path clean.
  Honest sizing recorded: with the real SDK the old order could not crash — a discipline
  defect, fixed rather than argued. `liveJudgeResponse` extracts the shaping, checks
  stop_reason before touching a byte, tested with a throwing content getter plus a
  finished-response control. Strict re-validation now rejects unknown properties at top level
  and per answer (the hedging judge — `holds` AND `value` — is now a refusal), on live-shaped,
  replay, and recording-read paths alike.
- **Cluster E (terra 6 + terra 7 + kimi 3 + kimi 4) — CLOSED.** Renamed-slot key case; leak
  test rebuilt on digit sentinels that cannot occur incidentally plus a non-empty-prompt
  control; renderMaterial reversed-key-order test at both the render and key levels.
- **Cluster F (terra 8, narrowed) — CLOSED.** Exclusive-create by construction (see Q1);
  the test asserts its target absent up front, cleans exactly one path, assertion before
  cleanup so regressions report rather than tidy away. Concurrency out of scope as ruled.
- **Cluster G (kimi residual, promoted) — CLOSED.** `majorityPass` extracted; ties fail;
  the `>`→`>=` mutation — inert before this round — now fails exactly one test, measured.
- **Cluster H (kimi 5) — CLOSED.** The skeleton's no-fabrication criterion now points at a
  `recent_activity` slot both specimens fill; still DISPOSABLE.

Nothing rejected; no finding dismissed-rather-than-fixed, so no unearned-green terminal
ruling is needed. The four residuals stand as ruled in `gate2-rulings.md`, one wording
update delivered (README).

## The executor's four proposals — ruled
- **Q1 (writeRecording refuses overwrite ALWAYS; recorder skips existing keys) — ACCEPTED.**
  Wider than cluster F's words and better than them: exclusive-create by construction removes
  the flag-seam a test-only mode would have added. Re-record-requires-delete is correct
  because the key hashes the complete request — an existing file already answers it, and a
  silent replacement is a verdict moving with nothing in the diff to say so. The recorder's
  skip-and-log makes partial re-records resumable.
- **Q2 (duplicate-key check ordered before filename check) — ACCEPTED.** The ordering makes
  the shadow attack produce its own named error and gives each rule a case the other cannot
  reach — without it the second rule is untested code.
- **Q3 (`liveJudgeResponse`, a new exported name outside the alias probes) — RESIDUAL
  RE-READ AND CONFIRMED, no probe extension.** Checked in the tree: it is an
  `export function` at oracles.ts:776. The alias-probe scope protects types a SUITE can use
  to fabricate or widen its seam; this is internal machinery a suite never receives — a
  caller lying to itself, the same category registry.ts's structural-signature exception
  documents. The tree's function-vs-const convention was also weighed: the const rule exists
  where a merged overload could restore fabricated type arguments handed to TEST BODIES
  (atTest, defineEvidenceCapture); no such path exists here, so the form is immaterial.
  Ruled: residual unchanged, now for re-examined reasons rather than assumed ones.
- **Q4 (sentinel criterion ids renamed so the assertion fails on leaks, not on ids) —
  ACCEPTED, recorded.** Same defect class the cluster targets: a test failing for a reason
  other than the one it names misleads exactly like one that cannot fail. Caught on first
  run; the record now says so.

## Way-of-work findings carried to reflection (ride along in this PR)
1. A subagent that cannot resolve its parent's name reports to `main` silently — the item
   agent sleeps through its own child finishing. The completion channel needs either a
   resolvable parent name or an explicit file-based alarm the parent names at spawn time.
2. The tracked-child alarm has been unreliable for this item across every phase; the
   coordinator's named-file backstop was the working mechanism each time.
3. A read-intended reviewer (Kimi) wrote probe files into the tree mid-review and cleaned up;
   review launch prompts should state the write policy explicitly.
