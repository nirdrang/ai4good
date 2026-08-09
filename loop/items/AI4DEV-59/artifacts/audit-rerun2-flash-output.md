All evidence gathered. Here is my audit.

---

# AUDIT — AI4DEV-59 (email verification, unverified-write gate), pinned head

I traced the full record (plan.md sections 2/3/4/7/8/9, PHASE-STATE.md, pr-body.md, the four transcripts, proof-local.ts, pending-ledger.txt, audit-prompt.txt) against the tree, character by character where it matters. I did not execute anything. Where a claim is settled only by a run, I cite the item's own recorded run and mark the boundary.

## Box 1 — Every adopted ruling is implemented as ruled: **PASS**

**Gate 1 (section 7), all four:**
- [1] Fixed differently: mirror 4 declared UNBOUND in `_fixture.ts:84-93` and in plan D-E/section 4; no test reads a provider user's verified state (both new bodies register only via `registerWithEmailPassword`). ✓
- [2] Step 5(e) rewritten: the volunteer address gets its own `verificationRoundTrip`, `fabricateGithubIdentity` (proof-local.ts:418-432, carried from the predecessor's script — AI4DEV-58/proof-local.ts:140), completion through the deployed function, account + profile read-back (proof-local.ts:923-942). Transcript lines 65-68 record all of it. ✓
- [3] Fixed differently: step-2 criterion rewritten (plan.md:238-250); the two PRODUCT judgements come only from shipped `verification.ts` — `emailVerified` (fixture:509-516) and `sendDiscoveryMessage` (fixture:543-573) both derive through `emailVerifiedFromUser(renderAuthUser(...))` and consult `discoveryMessageAllowed`, refusal text carried through unchanged; the four mirrors + admin recipe are named with bindings in `_fixture.ts:54-111`. ✓
- [4] The selftest exists and is picked up with zero script/CI change: `tests/at/vitest.config.ts:16` includes `harness/**/*.selftest.ts`; `package.json:16` `at:selftest` filters `harness/`; the file drives every malformed shape named in the header. ✓

**Gate 2 (section 8), all twelve:**
- [A1] Selftest asserts `/verif/i` and `/email/i` on every malformed-caller refusal (`shipped-verification.selftest.ts:110-116`). ✓
- [A2]+[B1] Check (b2) exists (proof-local.ts:662-689, record 816-837), runs before the real link, asserts the column still NULL; mirror 2's header entry cites (b2) alone (`_fixture.ts:70-79`); transcript lines 59-60 show it ran with `attempted=true`. ✓
- [A3] `unconfirmedSignInRefusal` (proof-local.ts:336-355): a 4xx that is not 429 AND `errorCode === CONFIRMATION_ERROR_CODE` exactly; used by check (c) (line 853) and by the volunteer inside (e) (line 946). ✓
- [A4] (e) requires `volunteerTrip.linkSource === 'emailed'` (proof-local.ts:965). ✓
- [A5] Fixed differently with verify-first condition — **condition HELD**: `complete-signup/index.ts:30-41` imports only `_shared/accounts.ts`, `_shared/github.ts`, `_shared/edge.ts` (never `verification.ts` — grep over `supabase/functions/` finds zero `verification.ts` imports); `verification.ts` is exactly 167 lines, matching the recorded "1 file changed, 167 insertions"; the revision-independence argument is in the probe comment (proof-local.ts:461-473); stack-up.txt:124-157 records the serve launch (command, cwd, PID, no flags, first output, 401 probe). ✓
- [A6]+[B2] Three redaction surfaces: key-walk `redact()` (136-156), string scrub including non-JSON bodies (128-134, applied at 146-149), `redactedLocation` cutting the fragment and every query VALUE (166-185); the probe scrubs before printing (line 510); the pre-commit inspection is recorded at proof-local.txt:28-33. ✓
- [A7] Fixture header scoped: `_fixture.ts:12-28` names `verification.ts` as the FUTURE route's module, imported today only by the suite and selftest, and carves out the two bookkeeping precondition refusals as the exception (lines 23-26); the bookkeeping refusals are fixture-owned (fixture:545, 551). ✓
- [A8] Fixed differently: `provisionPlatformAdmin` registers with `confirmedByTheCreator = true` → confirmed at provisioning, no link minted (fixture:621-633, register 302-327); header's admin paragraph is recipe-labeled, never live-bound (`_fixture.ts:95-106`). The recipe exists: AI4DEV-57/proof-local.ts:421-424 creates the admin via `POST /auth/v1/admin/users` with `email_confirm: true`. ✓
- [A9] pr-body.md:12-20 states "built, reviewed twice, fixes applied"; the mechanical body sync at close push is recorded in the ruling. ✓
- [B3] b-file header:4-7 says the wrong-password id is section B's — AT-001.38 sits at `at-req-001.md:23`, under "## B. Email verification" (line 18); .12/.13/.14 are section C's (lines 27-29). ✓

**Audit tightenings (section 9):** [L1] section 8's summary now reads "two of them fixed differently" (plan.md:435-436), matching the itemized [A5]/[A8]; the audit brief carries the same corrected count. [L2] the `/confirm/i` fallback is gone — proof-local.ts:347 is `errorCode === CONFIRMATION_ERROR_CODE` alone (grep confirms no `confirm/i` remains), comment rewritten (319-335); both recorded refusals carry the pinned code (proof-local.txt:62, 67). [L3] the signup guard also treats a string `refresh_token` as a carried credential (proof-local.ts:637-641); the verbatim NGO body (proof-local.txt:56) carries no access_token/refresh_token/session. [L4] the probe now passes response text through `scrubString` (proof-local.ts:510); the committed probe line is Mailpit version metadata (proof-local.txt:53). [L5] verified this sitting with read-only git; corroborated by the git transcript recorded in the tree (see Box 2).

## Box 2 — The diff stays inside its declared scope: **PASS**

I cannot run git in this cage. However, the tree itself contains a recorded git transcript captured at the pinned head (6e22564, "audit sitting close", branch tip == origin tip) in `artifacts/audit-rerun-luna.stderr.log`: `git diff origin/main...HEAD` lists exactly the eight declared paths outside `loop/items/AI4DEV-59/` — `supabase/config.toml` (M), `supabase/functions/_shared/verification.ts` (A, 167), `tests/at/expected/req-001.json` (M), `tests/at/harness/shipped-verification.selftest.ts` (A, 130), `tests/at/suites/req-001/_contract.ts` (M, 115), `_fixture.ts` (M, 273), `_pending.ts` (M, 34), `b-verification-and-sessions.test.ts` (M, 226) — nothing else; `supabase/functions/` shows only the one added file, and the a-file and c-files of the suite are absent from the diff (the "seven green tests untouched" claim). `verification.ts` is byte-count 167, matching "167 insertions". The evidence chain is a recorded transcript rather than a fresh run; sitting 4's [L5] verified the same fact with fresh git, and no commit has landed since. If a fresh `git diff main...HEAD` ever disagrees, [A5]'s fixed-differently route is void per its own condition.

## Box 3 — Every stated fact about the code is true: **FAIL** (two findings)

Everything else I traced is true: the fail-closed predicates of `emailVerifiedFromUser`/`discoveryMessageAllowed` (verification.ts:114-118, 157-166) and the selftest's shape coverage; AT-001.09's body (b-file:60-150) implements plan D-F step-for-step with `PUBLIC_SIGNUP_ACCOUNT_TYPES` from the shipped vocabulary; AT-001.10's body (152-229) is the discriminating pair with the reason matched through the fixture carrying the gate's own literal; the mirror labels (mirror 1 ↔ (a)+(b), mirror 2 ↔ (b2) alone, mirror 3 ↔ (b)+(d), mirror 4 UNBOUND, admin recipe-labeled) each cite checks that measure the claimed half; the counts are right at every level (9 green / 28 red = 37; `_pending.ts` 28/30/33 and nine written; ledger's 28 lines match the manifest's `verify:` lines both directions including D2.LW adding no id; b-file header; verify-final 10 files/257 tests = baseline 9/251 + the 6-test selftest; proof-local 7/7 with 0 skipped); the rate-limit record is coherent (config.toml:216 `email_sent = 2`; stack-up.txt measures `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000` at lines 26/56/119; the amended comment at proof-local.ts:221-241 and check (f)'s wording both say the file's cap did not bind; transcript line 70; "relief valve did NOT fire"); the redaction promises hold against the committed transcript (error_code blanked in the printed body while the in-memory discriminator is shown — proof-local.txt:62; fragments cut at 60/64; zero credential residue per the recorded inspection at 28-33, whose "one occurrence of password" is check (a)'s own title at line 55). Two findings below.

```
[1] severity: medium (the proof instrument is weaker than its stated claim)    loop/items/AI4DEV-59/proof-local.ts:948-975 (predicate), claim at 957; plan.md:296-299
    claim: Check (e)'s volunteer half claims to repeat (a)–(d) "with teeth" ([A3]/[A4]) but its predicate omits the post-confirmation sign-in status and the /auth/v1/user status conjuncts that check (d) requires: (d) needs signInAfter.status === 200, accessToken !== null, rawUserWire.status === 200 and followStatus 3xx (lines 876-892), while (e)'s volunteer conjunction checks only signupCarriedSession, confirmedBefore, the refusal, linkSource === 'emailed', confirmedAfter, shippedVerdict, and completion/profile reads (lines 957-975).
    why it matters: The plan (section 3, step 5(e)) claims the volunteer "repeats (a)–(d)" with the [A3]/[A4] teeth, but the instrument can pass with a non-200 post-confirmation sign-in and a non-200 /auth/v1/user read, as long as those bodies still carry a usable token and a non-empty email_confirmed_at — the exact status-blind class [A3] and [A4] were accepted to close elsewhere in this same script. The recorded transcript's volunteer leg is healthy (completion HTTP 200, link source emailed, refusal correct), so the recorded EVIDENCE is not false — the instrument is weaker than its claim, and a future broken run could pass (e) while (d) would fail.
    unverified-runtime-claim: no (statically checkable: the conjuncts are absent from the predicate)
```

```
[2] severity: low (record inconsistency)    loop/items/AI4DEV-59/stack-up.txt:133 vs 137-140
    claim: The serve launch is recorded as "LAUNCHED: 2026-08-09 18:31:36 +03:00", but the output presented as "Its first lines of output" is timestamped 2026-08-09T15:30:55Z, which is 18:30:55 +03:00 — 41 seconds BEFORE the recorded launch.
    why it matters: This is the operator-side binding ruling [A5] asked the record to carry — the transcript that ties the mounted edge runtime to this worktree. As written, the transcript cannot chronologically establish that the process whose output is shown is the process launched at the recorded time; a reader must choose which of the two timestamps is wrong. The static revision-independence argument is unaffected, so the impact is on the record's integrity, not on [A5]'s conclusion.
    unverified-runtime-claim: no (arithmetic on two recorded timestamps)
```

## Out of scope, mentioned once each

- `tests/at/suites/req-001/_bind.ts:31` — "the 33 not-yet-landed ids" is stale (truth 28), pre-existing, disclosed in PHASE-STATE.md:72-74, outside the declared scope list.
- `tests/at/harness/runner.selftest.ts:222` — the stale-lock race that failed 1 in 6 runs on the unchanged tree (baseline.txt appendix) remains a real CI risk for this pull request; the one-re-run policy is recorded.
- The local CLI not pushing `[auth.rate_limit] email_sent` into the auth container — measured this item, recorded in stack-up.txt, filed as a candidate item in PHASE-STATE.
- Plan D-I's diff estimate (~450 lines) versus the actual ~968 — an estimate, not a stated fact; the one-slice decision (under the 1200-line trigger) still held.
- The re-run wave is visible in `artifacts/` (a landed seat output with findings and launch-machinery files for the second seat) while the committed record's PHASE-STATE says the re-run is the next phase. That is the phase I am part of; per the state file's own protocol, findings from either seat go to a fresh audit sitting and an empty seat output is an anomaly, never a clean gate. My finding [1] independently corroborates the strongest of those re-run findings and [2] a second; neither needs the peer's output to stand.

AUDIT: 2 FINDINGS