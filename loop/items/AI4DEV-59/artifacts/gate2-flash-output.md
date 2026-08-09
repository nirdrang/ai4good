All reads are complete. Here is my review.

---

## CODE REVIEW — AI4DEV-59 D2.L1 (email verification + unverified-write gate), branch `nirdrang/ai4dev-59-...-d2l1` at the pinned commit

I read the whole diff surface: `verification.ts`, the selftest, `_contract.ts`, `_fixture.ts`, both new bodies, `_pending.ts`, `expected/req-001.json`, `pending-ledger.txt`, `config.toml`, `proof-local.ts`, plus the amended plan, the acceptance file, the manifest, and the supporting harness files (`registry.ts`, `runner.ts`, `vitest.config.ts`, `package.json`, `accounts.ts`, `github.ts`, the AI4DEV-58 transcript).

What I verified as sound, so the empty parts of this gate are visible as empty:

- **The fail-closed oracle covers everything the module's header promises.** The selftest drives missing field, `null`, `undefined`, `''`, `'   '`, two numbers, `true`, object values, an array value, and non-object users (`null`, `undefined`, string, number, boolean, array) — all `false`; only non-empty strings `true`. `discoveryMessageAllowed` refuses a missing caller, `null`, `{}`, `'true'`, `1`, `'yes'`, `{}`, the near-miss key `email_verified`, and a string caller, and the single refusal reason matches `/verif/i` and `/email/i` — the same two patterns AT-001.10's body asserts.
- **The fixture discipline holds.** Both product judgements are the shipped module's (`emailVerified` and `sendDiscoveryMessage` both derive through `emailVerifiedFromUser(renderAuthUser(...))`, the gate is `discoveryMessageAllowed`, the refusal text is carried through unchanged). All five new SUT members are implemented. All four vendor mirrors are named in the mirror section; the provider-confirmed start is declared UNBOUND; the never-issued negative is explicitly distinguished from retired AT-001.11, and the used link is deliberately not cleared (no single-use semantics). No test reads a provider user's verified state; both bodies register by email/password.
- **AT-001.10's discriminating pair is real.** A refuse-everybody gate dies on the second half (the SAME send must succeed after the link); a write-before-refusing gate dies on the `discoveryMessagesBy` read-back (the fixture's write happens only on allow). The unverified control assertion attributes the refusal correctly.
- **AT-001.09 implements plan D-F in order** — fresh-unverified, typed (row asserted for both `ngo` and `volunteer`, the volunteer branch genuinely passing the GitHub gate), still-unverified after completion, never-issued negative, emailed link flips, type survives. The live proof drives the opposite order (verify-then-complete) per the plan.
- **Bookkeeping is true.** `expected/req-001.json` is 9 green / 28 red; `_pending.ts`'s counts (28/30/33, nine written) are right and `D2_L1` is removed with an explanatory note; the pending ledger's 28 lines match the manifest leaf-by-leaf (I checked each `verify:` line in `loop/decomp/req-001.md`), the coverage line, and the 37 total; the config comment's ownership claims match the manifest's D2.L1 and the plan's recorded baseline. No stale "pending" or "reserved" statements remain in the suite.
- **The refactor is behavior-neutral for the seven green bodies**: `extractGithubHandle` reads only `identities`, which `renderAuthUser` renders identically to the previous inline shape; the added `email_confirmed_at` field is invisible to it.
- The selftest-lane placement claims check out (`vitest.config.ts` line 16, `at:selftest`'s `harness/` filter, `at:verify`'s positional `suites/req-001/` filter, CI runs `at:selftest`).

### Findings

**[1] severity: low (claimed-bound-but-unmeasured vendor mirror — the exact class the plan's step-2 criterion names)**    `tests/at/suites/req-001/_fixture.ts`:60-64
- claim: Mirror 2 — "a link that was never issued confirms nothing" — is labeled **BOUND** by the live proof, but none of proof checks (a)–(d) ever attempts a never-issued link, so nothing in the named evidence measures the negative.
- why it matters: The mirror section's own standard is "a prediction has to say what would prove it wrong," and this binding is an inference about GoTrue's token design presented as a measurement. The same plan (section 7, ruling [3]; step 2 done-criterion) asserts "a never-issued link returning `ok: false` … bound by step 5 (a)–(d)", so the overstatement is in the amended plan text and the fixture header together. The positive half (link flips the column) is measured by (d); the negative half is not — and unlike the provider-confirmed start (unobtainable, hence UNBOUND), a bogus-link check is obtainable and simply wasn't added. What would settle it: add a step-5 check following a tampered/never-issued token and recording the refusal, or re-label mirror 2 as inference-bound in both the plan and the header.
- unverified-runtime-claim: no (the absence of any bogus-link attempt in `proof-local.ts` is statically checkable; whether GoTrue would refuse is the runtime part).

**[2] severity: low (redaction is shape-dependent where the header claims absolutes)**    `loop/items/AI4DEV-59/proof-local.ts`:122-126, 483-486, 102-120
- claim: The header promises "NO KEY IS WRITTEN INTO THIS FILE AND NONE IS PRINTED BY IT", but the followed redirect's `location` is printed after only fragment-stripping (`withoutFragment`), and `redact()` returns non-object values — including non-JSON response bodies — verbatim.
- why it matters: If the stack's GoTrue redirects with a token-bearing query parameter rather than a fragment (token-hash/deep-link shapes do exactly this), that string lands in a transcript the plan pushes to GitHub — in a project whose history already includes a push-protection refusal over a transcript capturing a status command. The fragment-only assumption is a runtime claim that has never been measured (the script never ran). What would settle it: run the script once and inspect the `location` line and any non-JSON body in the transcript, or extend the redaction to strip query parameters whose names match the same `SENSITIVE` pattern.
- unverified-runtime-claim: yes (depends on the never-measured redirect shape of the local GoTrue).

**[3] severity: low (false statement in a rewritten header)**    `tests/at/suites/req-001/b-verification-and-sessions.test.ts`:6
- claim: The rewritten header says "The other four are section C's", but AT-001.38 (wrong-password rejection) sits in **section B** of the acceptance file (`at-req-001.md` line 23, under "## B. Email verification"); only .12/.13/.14 are section C's.
- why it matters: This item's own done-criterion is "no comment in any touched file still states … a stale count", and the header was rewritten in this diff — a reader following the sentence to the acceptance file finds it false for one of the four ids. The charitable reading (".38 belongs to the sessions leaf") is what the next clause says correctly ("belong to the session-and-reset leaf (D2.L2)"), so the fix is a one-word correction ("the other four are the session-and-reset leaf's, three of them section C's" or similar). Not a test-meaning defect.
- unverified-runtime-claim: no.

### One observation, not a finding

`proof-local.ts` is in no typecheck program — the root `tsconfig.json` includes only `src/**`/`vite.config.ts`/`eslint.config.js`, and `tests/at/tsconfig.json` covers only `tests/at`. That matches the predecessor's deliberate item-record placement, and any type-level mistake in it (e.g., a wrong mailpit/inbucket field name) fails loudly when the script runs rather than producing a false pass, so I don't count it as a defect — but it means the script's only validator is its first run, which is exactly why the "WRITTEN AND NEVER RUN" status of every check in it matters.

Out-of-scope items (per the item's list) surfaced nothing that needs mentioning.

CODE REVIEW: 3 FINDINGS