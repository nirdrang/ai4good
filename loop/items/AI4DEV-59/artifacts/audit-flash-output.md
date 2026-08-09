# AUDIT — AI4DEV-59 (email verification, unverified-write gate) at the pinned commit

I read the full record — `plan.md`, `PHASE-STATE.md`, `pr-body.md`, all four transcripts, `proof-local.ts`, both gate outputs and their distillates, the ledger, the manifest, the acceptance file — and traced every code surface in the declared scope character by character. I did not execute anything.

## Box 1 — Every adopted ruling is implemented as ruled: **PASS**

All four gate-1 rulings and all twelve gate-2 rulings (ten distinct fixes) traced to concrete tree implementations:

- **Gate 1 [1]** — provider-confirmed start declared UNBOUND: `tests/at/suites/req-001/_fixture.ts:84-93` (mirror 4), plan D-E, plan section 4 not-proved column. ✓
- **Gate 1 [2]** — step 5(e) volunteer end-to-end: `proof-local.ts:919-983` (own round trip, `fabricateGithubIdentity`, volunteer completion through the deployed function, account + profile read-back). ✓
- **Gate 1 [3]** — step-2 done-criterion rewritten: `plan.md:238-250`; every added vendor mirror named in the fixture header with its binding. ✓
- **Gate 1 [4]** — fail-closed oracle: `tests/at/harness/shipped-verification.selftest.ts` exists; placement claim verified against `tests/at/vitest.config.ts:16` and `package.json:16`. ✓
- **[A1]** — selftest now asserts `/verif/i` and `/email/i` on every malformed-caller refusal: `shipped-verification.selftest.ts:110-128`. ✓
- **[A2]+[B1]** — (b2) tampered-token check before the real link, column read after: `proof-local.ts:658-685, 812-833`; mirror 2 header entry cites (b2) alone: `_fixture.ts:70-79`; plan step 2 amended. ✓
- **[A3]** — confirmation-specific refusal: `unconfirmedSignInRefusal` requires 4xx, never 429, and `error_code === 'email_not_confirmed'` or `/confirm/i` on the **in-memory** body: `proof-local.ts:316-353`; applied to (c) at line 849 and to the volunteer inside (e) at line 942/957. ✓
- **[A4]** — (e) requires `volunteerTrip.linkSource === 'emailed'`: `proof-local.ts:961`. ✓
- **[A5]** — fixed differently: the probe's comment carries the revision-independence argument (`proof-local.ts:455-488`) and `stack-up.txt:124-157` records the serve launch (command, cwd, PID, flags, first lines, and the 401 probe). The static half of the verify-first condition holds: `complete-signup/index.ts:30-41` imports only `_shared/accounts.ts`, `_shared/github.ts`, `_shared/edge.ts` — never `verification.ts`. The git-diff half is unverifiable from the tree — finding 1.
- **[A6]+[B2]** — three redaction surfaces: key-walk `redact()` (136-156), string scrub incl. non-JSON bodies (`scrubString`, 128-134), `redactedLocation` cutting fragment and every query value (166-185); the transcript inspection is recorded at `proof-local.txt:28-33`. ✓
- **[A7]** — fixture header scoped: `_fixture.ts:12-28` names `verification.ts` as the future route's module, imported today only by the suite and selftest, and carves out the fixture's bookkeeping refusals. ✓
- **[A8]** — fixed differently: `provisionPlatformAdmin` registers with `confirmedByTheCreator = true` (`_fixture.ts:621-633`, `register` at 302-327) → confirmed at provisioning, no link minted; the header's admin paragraph says so, says nothing reads it, and labels it recipe-bound (`_fixture.ts:95-106`). The recorded recipe exists: the first accounts leaf's proof script creates the admin via `POST /auth/v1/admin/users` with `email_confirm: true` (that item's `proof-local.ts:421-424`). ✓
- **[A9]** — `pr-body.md:12-20` states the current truth (built, reviewed twice, fixes applied, audit + CI ahead). ✓
- **[B3]** — b-file header corrected: `b-verification-and-sessions.test.ts:4-7` — "three of them are section C's, and the wrong-password one is section B's", matching `at-req-001.md:23` (AT-001.38 under "## B. Email verification") and lines 27-29 (.12/.13/.14 under "## C"). ✓

## Box 2 — The diff stays inside its declared scope: **PASS** (one git-level claim unverifiable — finding 1)

Every named file exists with matching content. `supabase/functions/` contains only `_shared/` (`accounts.ts`, `edge.ts`, `github.ts`, `verification.ts`), `complete-signup/`, `create-organization/` — all but `verification.ts` are referenced by the predecessor items' records. No deployed function imports `verification.ts` (grep over `supabase/` finds only comments). CI (`ci.yml`), `package.json`, `vitest.config.ts` are consistent with the "zero script or CI change" claim; `src/` untouched (no `src/` in any touched surface). The full base-to-head file list is beyond the tree — the settling command is in finding 1.

## Box 3 — Every stated fact about the code is true: **PASS**

- `verification.ts` traced: `emailVerifiedFromUser` (114-118) fails closed on missing field, `null`, empty/blank string, number, boolean, object, array, and non-object user; `discoveryMessageAllowed` (157-166) allows only `caller?.emailVerified === true` (strict equality; `undefined`/`null`/string/`'true'`/`1` callers refuse) and the single refusal reason matches `/verif/i` and `/email/i`. The selftest drives exactly the header's promised shapes, including `null` (the `typeof null === 'object'` trap) and blank strings.
- AT-001.09's body (b-file 60-150) matches plan D-F step-for-step: both `PUBLIC_SIGNUP_ACCOUNT_TYPES`, unverified fresh, typed row, still unverified after completion, never-issued negative, emailed link flips, type survives; the documented ordering choice (complete-then-verify) is stated in the body and the plan, and the live proof drives the reverse order (check (e)). AT-001.10's body (152-229) is the discriminating pair: gate refusal naming the remedy, `discoveryMessagesBy` empty, the same send succeeds after the link — a refuse-everybody gate dies on the second half, a write-then-refuse gate on the read-back. Surface marks `ui`/`backend` match D-F/D-G.
- Fixture vendor mirrors: every BOUND label cites a check that measures the claimed half — mirror 1 bound by (a)+(b) (unconfirmed + email/link), mirror 2 bound by (b2) alone (negative), mirror 3 bound by (b)+(d) (column flips); mirror 4 UNBOUND with the reason; the admin mirror is recipe-labeled, never live-bound. All true.
- Bookkeeping: `_pending.ts` (28 pending / nine written, `D2_L1` removed with the orphan-rule comment), b-file header, `expected/req-001.json` (9 green / 28 red = 37, red set identical to the ledger's 28, all matching `at-req-001.md`'s 37 P0 and `loop/decomp/req-001.md`'s per-leaf `verify:` lines, including D2.LW adding no id).
- Rate-limit statements: `stack-up.txt:56,61-65,119` (measured `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000`, file carries `email_sent = 2` at config.toml:216), the amended comment above `CONFIGURED_EMAIL_RATE_LIMIT` (`proof-local.ts:221-241`), and check (f)'s wording (997-1005) agree; the transcript's (f) line and the "relief valve did NOT fire" claim match; the config was never raised.
- Transcripts internally consistent: counts (7 checks / 7 passed; 10 files / 257 tests = 9 + 1 file, 251 + 6 selftest `it`s), timestamps (+03:00 ↔ Z), the (c) discriminator read in-memory while the printed body shows `error_code` blanked (`proof-local.txt:62`), redaction surfaces (fragment cut, `<redacted>` keys), mailpit shape measured before use (v1.30.2, Inbucket 404), and the (e) profile values consistent with the runtime-computed stub output. The inspection note's "one occurrence of password" counts the generated output (the header's own search-list mention is self-referential) — coherent, not a defect.
- `PHASE-STATE.md` claims match the transcripts (7/7 proof, 9/28 verify, flake not recurring, two executor invocations, `_bind.ts` "33" disclosed as pre-existing and out of scope).

## Findings

Severity scale: high = ruling not implemented, or a stated fact about the code that is false; medium = a promise left unproved; low = a recorded claim the tree cannot confirm.

```
[1] severity: low    loop/items/AI4DEV-59/stack-up.txt:146-148 (also proof-local.ts:463-464, plan.md:557-559)
    claim: The record asserts as measured — "git diff main...HEAD --stat -- supabase/functions/: 1 file
    changed, 167 insertions" — that this branch changes nothing under supabase/functions/ except the new
    verification.ts, and this cannot be confirmed from the tree (no git access in this review).
    why it matters: The claim is load-bearing for ruling [A5]'s fixed-differently route (the stale-mount
    probe's revision-independence argument) and for the whole declared-scope statement. Every statically
    checkable half holds — verification.ts is exactly 167 lines; complete-signup imports only
    accounts/github/edge; the functions tree contains no other candidate new file — so the risk is low,
    but the recorded "measured" verdict outruns what the tree alone proves. The same applies to the
    commit-hash claims in PHASE-STATE.md (a0b0a4b, 154f6aa, fa6db5a, 73cae87, e933d9f, 0e9f4de) and
    plan.md (46b7485, ac33db1): internally consistent, remotely unverifiable here (PHASE-STATE itself
    assigns their verification to the conductor).
    unverified-runtime-claim: no — settle with `git diff main...HEAD --stat -- supabase/functions/` and
    `git diff main...HEAD --stat` (whole scope), plus ls-remote of the branch tip against the reported
    heads; a discrepancy makes [A5]'s fixed-differently route VOID per the ruling's own condition.
```

## Out of scope, mentioned once

- `tests/at/suites/req-001/_bind.ts:30` — the "33 not-yet-landed ids" count is stale (truth 28), pre-existing, disclosed in PHASE-STATE, outside the declared scope list; left untouched per the record.
- `tests/at/harness/runner.selftest.ts:222` — the stale-lock race that failed 1 run in 6 on the unchanged tree (baseline appendix) is a real CI risk for this pull request; the one-re-run policy is recorded.
- The local CLI not pushing `[auth.rate_limit] email_sent` into the auth container (measured this item) — recorded as a candidate item to file; not this item's defect.

## Verdict

- **Rulings implemented as ruled: PASS** (all 16 rulings traced; the [A5] static half holds, the git half is finding 1).
- **Diff inside declared scope: PASS** (one git-level claim unverifiable — finding 1).
- **Every stated fact true: PASS** (all traced; transcripts internally consistent with the code and the record).

AUDIT: 1 FINDING