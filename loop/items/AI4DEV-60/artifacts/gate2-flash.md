# CODE REVIEW — AI4DEV-60 D2.L2 (session expiry/refresh/reset, wrong-password rejection)

I read the full diff surface: `caller.ts`, `edge.ts`, the selftest, `_contract.ts`, `_fixture.ts`, the four bodies and the b-file header, `_pending.ts`, `expected/req-001.json`, `pending-ledger.txt`, `baseline.txt`, plus the plan (amended), the acceptance file, the manifest, `config.toml`, the harness clock/registry, and the sibling pure modules. The plan's steps 4–6 absence is as declared and was not treated as a gap.

What I verified as correct (so the empty space is visible): the four bodies' session arithmetic against the store (issuance at `clock.now()` + 3600s, strict `<` expiry, 3601s/3599s/2s advances all land where the assertions need them); the `.13` sibling pair is a genuine discriminator (a never-expiring fixture fails `controlWrite.ok === false`; a non-extending refresh fails the refreshed write); every refused write in `.12`/`.13` gets its `organizationsNamed` absence read-back; `.38`'s and `.14`'s `sessionsOf` equality reads are taken at the right instants; the untyped bridge hands the whole parsed body on every path (no pre-narrowing possible in `resolveCaller`); no second caller-validity rule exists in the fixture; none of the nine green bodies advances the clock, signs out, refreshes, deep-compares a `Session`, or uses a session across a state change, so uniform validation and the `sessionId` addition should leave them green (reasoned, not run — the draft's own premise); the retired-.15/.11 ground is clean (nothing models link expiry/single-use/resend; the never-issued negatives guard the oracles and cannot collide with `verify-`/`reset-`-prefixed real links); all eleven mirror labels in the fixture header match what plan D-G checks (a)–(e) and (g) actually measure, with registration/provider/admin issuance correctly labelled divergence/unbound; all four surface marks match the amended plan; the bookkeeping is consistent end to end (13 green / 24 red, `LEAF.D2_L2` removed, b-file free of `LEAF`/`notLanded` while c–f keep theirs, ledger = manifest leaf by leaf = coverage-check line, 24 + 13 = 37, baseline 9/28 as stated, selftest include claim verified against `vitest.config.ts` and `package.json`); the config citations in the fixture and plan are all at their stated lines (165, 171–174, 260, 304–308); the re-export form itself is sound (local binding exists before `export type { Caller }`).

Findings:

```
[1] severity: low (untrue stated fact; zero functional impact)    supabase/functions/_shared/edge.ts:112-115
    claim: The re-export comment asserts "both say `import type { Caller } from '../_shared/edge.ts'`
    and both keep working" — neither deployed function imports the `Caller` type at all.
    why it matters: Grep of `supabase/functions/` finds `import type { Caller }` nowhere outside this
    comment; both `complete-signup/index.ts` and `create-organization/index.ts` import only value
    names (`resolveCaller`, etc.) from edge.ts and were untouched by this diff. The re-export is
    sound, but the stated justification is factually false about the tree, and this repository's own
    doctrine (mirror labels, selftest headers) treats an untrue stated fact as a defect class even
    when nothing breaks. Fix is a comment correction (e.g. "so that either function may import the
    type from here without a change").
    unverified-runtime-claim: no
```

```
[2] severity: low (equivalence claim possibly incomplete; needs the old file to settle)    supabase/functions/_shared/edge.ts:178-183 (and plan.md D-B, lines 88-94)
    claim: The accepted "ONE EDGE CHANGES" description covers a 2xx with an unparseable body, but a
    2xx whose body is parseable JSON `null` is a distinct input the claim does not name, and the
    pre-refactor code's handling of it is not determinable from this tree.
    why it matters: If the old `resolveCaller` was the plausible shape "return on !ok; parse; read
    `user.id`" with no null guard, then a 2xx + `null` body threw on the property read and surfaced
    as 502, while the new code returns `callerFromAuthAnswer(200, null)` → null → 401 — a second
    changed edge beyond the one named and accepted. If the old code used `user?.id`, old and new
    agree. Either way the direction is the same fail-closed family and is unreachable through
    GoTrue, so this does not block; it is a completeness-of-claim defect in the record.
    Settle: read the pre-refactor file — `git show 550b171:supabase/functions/_shared/edge.ts`
    (read-only; no write needed) — and check whether the id read was null-guarded. This reviewer
    cannot execute git, so the equivalence claim stays unverified.
    unverified-runtime-claim: yes
```

```
[3] severity: low (guard weaker than the plan and than its own comment)    tests/at/suites/req-001/b-verification-and-sessions.test.ts:287-291
    claim: Plan D-E's AT-001.38 control — "sign-in with the correct password succeeds, and
    `sessionsOf` grows by one" — is not implemented: the body asserts only
    `sessionsAfterGoodSignIn.length > 0`.
    why it matters: Because the registration-minted session (the declared divergence) is already in
    the store for this account, the count after a correct sign-in is 2 and stays > 0 even if
    `signInWithEmailPassword` minted nothing at all. A fixture whose sign-in never issued a session
    would pass this line and the whole body — including the final equality — while the assertion's
    own message claims "a successful sign-in must mint a session". The criterion's second clause
    (no session on the FAILED attempt) is still genuinely asserted, so this weakens only the
    control's teeth, but the plan's step-2 clause and the comment's claim are both overstated.
    Fix: capture `sessionsOf` before the good sign-in and assert the count grew by one (or assert
    the new sessionId is present).
    unverified-runtime-claim: no
```

Out-of-scope note: I found no defect in code this branch did not touch; the only incompleteness of evidence (the pre-refactor `edge.ts`, and the unrun suite) is the draft's own declared premise, recorded in `draft-rulings.md`.

CODE REVIEW: 3 FINDINGS
