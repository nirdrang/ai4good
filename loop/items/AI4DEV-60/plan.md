# AI4DEV-60 (session expiry, refresh, password reset) — PLAN

**Sitting 1 of the item: PLAN. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).**

**AMENDED by sitting 2 (DRAFT), per the five gate-1 rulings in
`loop/items/AI4DEV-60/gate1-rulings.md` — all five accepted.** The amendments: AT-001.13's
surface mark is `ui` and the per-id table names the handoff (ruling 1); live check (g) binds
the linked-volunteer path across the refactored edge (ruling 2); the .12/.13 setups sign in
before completing signup (ruling 3); the mirror-binding labels are narrowed, two probes are
added to checks (d) and (e), and unbound issuance is labelled (ruling 4); the green-id count
is nine, not eleven (ruling 5). This amended plan is what gets built.

**Chain, derived from the branch**
(`nirdrang/ai4dev-60-sessions-automatic-refresh-and-password-reset-d2l2`):
AI4DEV-60 (session expiry, refresh, password reset) → AI4DEV-52 (verification, sessions and
reset container) → AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the authentication requirement).
No `attr:` label on any of them; product work with an evidence gate above it.

**Manifest:** `loop/decomp/req-001.md`, deliverable D2 leaf L2, revision `0579425`:
*"session expiry/revocation + auto-refresh + password reset + wrong-password rejection ·
verify: AT-001.12,13,14,38 · blocked-by: D1.L1"*. D1.L1 merged as pull request #47, so the
blocker is cleared.

**Acceptance ids this leaf owns:** AT-001.12, AT-001.13, AT-001.14, AT-001.38.
**Acceptance text (read-only for this item):** `.taskmaster/docs/acceptance/at-req-001.md`
lines 23 and 27–29. Two retirement lines bind this plan as hard as the criteria do:
- line 30: **AT-001.15 is retired** — *"reset-link expiry/single-use semantics are not stated
  in REQ-001"*. No assertion in this item may claim reset-link expiry, single use, or resend.
- line 22: **AT-001.11 is retired** (verification-link expiry/single-use/resend) — already
  honoured by the predecessor; nothing here may re-introduce it either.
- line 29's own note on AT-001.14: *"audit claim dropped — password resets are not in the
  PRD's audit list"*. No audit row is written or asserted for a reset.

**Verify command, pinned:** `bun run at:verify req-001 --tier loop --expect`. The fixture
adapter is a stand-in capped at the loop tier (`_fixture.ts` header;
`adapterDerivedCapability()` in `tests/at/harness/capabilities.ts`), CI has no database, and
the requirement's integration-tier done contract remains AI4PM-19's gate, not this leaf's.

---

## 1. What I verified in the tree before deciding anything

| claim | verdict | evidence (pointer) |
|---|---|---|
| All four ids are declared red, pending on this leaf | true | `tests/at/expected/req-001.json` lines 17–20; stubs at `tests/at/suites/req-001/b-verification-and-sessions.test.ts` lines 231–237, each `notLanded(LEAF.D2_L2)` |
| The fixture `Session` is an identity handle with no validity state | true | `tests/at/suites/req-001/_contract.ts` lines 130–137; `_fixture.ts` `AuthUser` and `register` — no session store exists |
| A controlled clock exists and the adapter is handed it | true | `tests/at/harness/clock.ts`; `harness/index.ts` lines 40–43 pass `clock` into `createFixtureAdapter`; req-001's adapter currently destructures only `{ worlds }` (`_fixture.ts` line 262); req-016's uses `clock.now()` (its `_fixture.ts` line 468) and its bodies drive `h.clock` |
| Local session parameters | true (as configured) | `supabase/config.toml`: `jwt_expiry = 3600` (line 165), `enable_refresh_token_rotation = true` (171), `refresh_token_reuse_interval = 10` (174); `[auth.sessions]` timebox/inactivity are COMMENTED OUT (304–308) — no forced timebox locally |
| Reset-adjacent config | true (as configured) | `secure_password_change = false` (line 260), `max_frequency = "1s"` (262), mail catcher `[local_smtp]` on port 54324; `[auth.rate_limit] email_sent = 2` (216) measured NOT pushed into the container on the predecessor item (`loop/items/AI4DEV-59/stack-up.txt`) |
| The deployed functions authenticate through `resolveCaller`, which fails closed on a non-ok Auth answer or a malformed body, and NO type-checker covers it | true | `supabase/functions/_shared/edge.ts` lines 11–16 (no type-checker, stated), 132–160 (`resolveCaller`) |
| No `Session` literal is constructed outside the fixture | true (this sitting's grep) | `tests/at/typeprobes/` has no `Session`/`accountId` match; bodies receive sessions from `sut` members only |
| Surface-mark precedent | true | a-file: .01–.04 and .07 `ui`, .05/.06 `backend`; b-file: .09 `ui`, .10 `backend` |
| CI derives the prose lane from changed files; the required check is `verify` | true | `.github/workflows/ci.yml` lines 71–110, job `verify` |
| The fixture mints a session at registration while the live stack (confirmations on) issues none until the address is confirmed | true, and a DECLARED gap | `_contract.ts` lines 191–203 — the honest-gap paragraph, which names session issuance as THIS leaf's subject |
| GoTrue's runtime behaviour for logout, expired tokens, refresh-after-expiry, and the recovery-link flow shape | **unverified-runtime-claim** | expected behaviour only; measured, with exact wire responses captured, in step 5 — nothing below silently depends on any of it before then |

## 2. Decisions

### D-A — No migration, no product session store. Sessions are Supabase Auth's own machinery.
Expiry, revocation, refresh and password reset are all GoTrue facts: `auth.sessions` rows, JWT
expiry, refresh tokens, recovery links. This leaf ships **no migration and no new table**. The
consequence is the same as the verification leaf's D-A: there is no schema or RLS surface to
prove here, and the live proof reads `auth.sessions` as operator evidence only.

### D-B — ONE shipped change: the caller judgment becomes a pure module on the tested path.
AT-001.12's enforcement point at every deployed function is `resolveCaller`: Auth refuses the
dead token, and the function fails closed. Today that judgment lives in `edge.ts`, which no
type-checker covers and no test can import (Deno-only, stated in its header). This leaf
extracts the judgment — not the I/O — into a new pure module:

- `supabase/functions/_shared/caller.ts`, under the same constraints as `accounts.ts`
  (relative imports only, no `Deno`, no I/O). It exports the `Caller` type and
  `callerFromAuthAnswer(status: number, user: unknown): Caller | null` — a caller only for a
  2xx status whose body carries a string `id`; the GitHub handle still derived through the
  shipped `extractGithubHandle`; **null for everything else** — non-2xx, missing id,
  non-string id, malformed body. Fail closed.
- `edge.ts`'s `resolveCaller` keeps the fetch and delegates the judgment to the module,
  re-exporting `type Caller` so neither edge function changes an import.
- A direct shape selftest, `tests/at/harness/shipped-caller.selftest.ts`, proves the
  fail-closed promise for every malformed shape (the same lane and the same reasoning as
  `shipped-verification.selftest.ts` — the vitest include `harness/**/*.selftest.ts` picks it
  up with zero script or CI change).

This is the R3 pattern a third time: the fixture renders the vendor's answer shape and the
SHIPPED judgment decides, so the loop-tier green grades byte-for-byte the code every deployed
function runs on every authenticated request. Behaviour of the deployed functions is intended
to be UNCHANGED by the refactor; step 5 (c) and (d) drive a deployed function with dead and
live tokens, which is the live binding. ONE EDGE CHANGES, reported by the executor and
accepted by the draft sitting (`draft-rulings.md` ruling 1): a 2xx answer whose body is
unparseable used to throw and surface as 502, and now yields no caller and refuses — the
fail-closed direction, not reachable through GoTrue itself, named in the code. A blank-string
`id` remains accepted, exactly as before the refactor — preserved, not tightened
(`draft-rulings.md` ruling 2).

### D-C — The fixture models Auth's session bookkeeping, as a named vendor mirror.
`_fixture.ts` gains a session store: `sessions: Map<sessionId, { userId, expiresAt(ms),
revoked }>`. The adapter starts destructuring `clock` (already delivered by the harness).

- **Issuance.** `register*`, `signInWithEmailPassword`, `signInWithProvider` and
  `provisionPlatformAdmin` mint a session row at `clock.now()` with
  `expiresAt = now + 3600s` — the mirror of `jwt_expiry = 3600`. The `Session` handle gains
  `sessionId: string` (no literal is constructed outside the fixture; the executor re-verifies
  before relying on it). **What binds issuance is NARROW (gate-1 ruling 4):** checks (a)/(b)
  bind SIGN-IN issuance and its `auth.sessions` row, and nothing wider. Registration issuance
  is the declared divergence — the live stack mints none until the address confirms — and is
  never labelled bound. Provider issuance and administrator issuance are labelled UNBOUND in
  the fixture header: no OAuth credential exists here, and live administrator creation issues
  no session; nothing in this suite asserts either.
- **Revocation.** New member `signOut(session)` marks the row revoked — the mirror of
  `POST /auth/v1/logout` deleting the session.
- **Refresh.** New member `refreshSession(session)` — valid only while the session is not
  revoked, INCLUDING after access expiry (the mirror of a refresh token outliving the access
  token, which is the entire point of refresh); it extends the SAME session row's `expiresAt`
  to `now + 3600s` and returns the same-`sessionId` handle. It takes NO credentials — that is
  structural, not asserted. Refresh-token ROTATION and the reuse interval are NOT modelled: no
  criterion reads them, and modelling vendor semantics nothing asserts is how retired ground
  creeps back in. The same-session-row detail is BOUND by a probe in check (d) — an operator
  read of `auth.sessions` before and after the live refresh, asserting the same row persists
  (gate-1 ruling 4); if the vendor rotates the row instead, the fail-and-re-pin protocol
  corrects this mirror to the measurement.
- **Validation, uniform.** Every session-taking operation (`completeSignup`,
  `createOrganization`, `sendDiscoveryMessage`, `linkGithubIdentity`) resolves its caller the
  way the deployed functions do: a known, unrevoked, unexpired session renders the canonical
  `/auth/v1/user` shape with status 200; anything else renders status 401 with no user; the
  SHIPPED `callerFromAuthAnswer` judges the answer, and a null caller refuses **without
  writing**. WHICH sessions are live is the vendor mirror; THAT a dead answer yields no caller
  is the shipped judgment on the tested path. The refusal reason for a dead session says
  sign-in again is required — fixture bookkeeping wording, not asserted verbatim by any body.
- **Session read-back.** New member `sessionsOf(accountId): Promise<{ sessionId: string }[]>`
  returns the account's unrevoked, unexpired sessions — the mirror of reading `auth.sessions`
  with operator authority. AT-001.38's "no authenticated session is created" needs it: a
  refusal's own return value cannot show that nothing was minted.
- **No behaviour change for the nine green ids.** No existing body advances the clock, and
  every existing body uses its session within one frozen instant, so uniform validation
  changes nothing green. Step 0's baseline and step 3's full run are the check.

**The issuance-at-registration gap is inherited, restated, and narrowed by the bodies.** The
live stack with confirmations on issues no session at signup; the fixture keeps minting one at
registration because every existing body depends on it. The contract comment that names
session issuance "D2.L2's subject" is rewritten to state the remaining divergence plainly.
Each NEW body narrows it by following the live public order: register, use the emailed
verification link, and only then play the session and password games.

### D-D — Password reset mirrors, with the retired-.15 line drawn exactly.
Three new members, all vendor mirrors:

- `requestPasswordReset(email)` — always `{ ok: true }`, the mirror of `/auth/v1/recover`
  answering 200 regardless of existence (AT-001.21's no-existence-oracle shape, kept here for
  the same reason the sign-in refusal is single-reasoned). For a registered email/password
  user it mints a reset link.
- `emailedPasswordResetLink(email)` — the link, or null when none was emailed.
- `completePasswordReset(link, newPassword)` — the emailed link updates the password;
  a link that was never issued returns `{ ok: false }` and changes nothing. **No expiry, no
  single use, no resend is modelled or asserted** — the link is not cleared on use, exactly as
  verification links are not. The never-issued negative is not retired-.15 ground: it guards
  this test's own oracle (a link-shaped string that reset an account it never belonged to
  would make "completing the emailed flow is what changes the password" mean nothing).

Whether a live password change revokes other sessions is NOT modelled and NOT asserted — no
criterion reads it, and `secure_password_change` sits false in the local config.

### D-E — The four bodies.

**AT-001.38 (surface `ui`)** — the sign-in screen is one of the wiring leaf's four named
screens, and this is its negative path.
1. register an NGO address; confirm via the emailed verification link (the live public order).
2. control: sign-in with the correct password succeeds, and `sessionsOf` grows by one.
3. sign-in with the correct email and a WRONG password → refused; the refusal is the same
   single reason the fixture gives for an unknown address (no existence oracle — observed,
   not newly asserted).
4. the criterion's second clause: `sessionsOf` shows NO new session after the failed attempt —
   count unchanged against the reading taken after step 2.

**AT-001.12 (surface `backend`)** — expiry AND revocation, each with the stale-write oracle
and the re-authentication discriminator. The write is `createOrganization` (no verification
gate sits on it, so a refusal is unambiguously the session layer's).
1. register, confirm, sign in, complete signup as an NGO under the signed-in session —
   sign-in PRECEDES completion, the live public order (gate-1 ruling 3; the registration
   handle plays no further part).
2. control: a write under the live session succeeds.
3. EXPIRY: `h.clock.advance(3601s)` → the same-shaped write with a fresh name is refused, and
   `organizationsNamed` shows the name absent — a stale session wrote nothing.
4. re-authentication is the remedy, proved by being the exact change that unblocks: sign in
   again, repeat the write, it succeeds and the name is present.
5. REVOCATION: with a live session, `signOut(session)` → a third-name write refused, name
   absent; sign in again → the write succeeds.

**AT-001.13 (surface `ui`, amended per gate-1 ruling 1)** — refresh keeps a working session
alive; a sibling session that is not refreshed dies at the same instant, which is what proves
refresh did it.
1. register, confirm; open TWO sessions at the same instant (two sign-ins): `refreshed` and
   `control`; complete signup as an NGO under `refreshed` — sign-in precedes completion
   (gate-1 ruling 3), and the completed account serves both sessions.
2. work under both succeeds (a write each).
3. advance the clock to just under expiry; work still succeeds under both.
4. `refreshSession(refreshed)` — no credentials pass through this call, structurally.
5. advance past the ORIGINAL expiry instant: work under `refreshed` SUCCEEDS — same
   `accountId`, no re-login happened mid-work — while the same work under `control` is
   REFUSED and its attempted name is absent. The pair is the discriminator: without the
   sibling, a fixture that never expired anything would pass.

**AT-001.14 (surface `ui`)** — the reset screen is one of the wiring leaf's four named screens.
1. register an NGO address with the OLD password; confirm the address.
2. control: the old password signs in.
3. `requestPasswordReset(email)`; the never-issued negative FIRST:
   `completePasswordReset('never-issued-link', NEW)` → `{ ok: false }`, and the old password
   still signs in — the oracle guard, deliberately not a lifetime claim.
4. `emailedPasswordResetLink(email)` → non-null; `completePasswordReset(link, NEW)` → ok.
5. the criterion's both halves: the NEW password signs in; the OLD password is refused (and
   `sessionsOf` gains no session from the refused old-password attempt).

### D-F — Suite bookkeeping, all in the same change.
- `tests/at/expected/req-001.json`: the four ids move from `red` to `green` — **13 green / 24
  declared red**.
- `_pending.ts`: `D2_L2` is removed from `LEAF` (the orphan rule — its last four users become
  real bodies), and the header's counts are corrected (24 remaining; thirteen written).
- The b-file header is rewritten: no pending id remains in that file, so its `LEAF`/`notLanded`
  imports are REMOVED (the other suite files keep theirs), and every sentence that says the
  session ids are declared-not-written becomes false and is replaced.
- `_contract.ts`'s issuance-gap paragraph (lines ~191–203) is rewritten per D-C.
- `loop/items/AI4DEV-60/pending-ledger.txt`: 24 lines, one per remaining pending id, each
  naming a manifest leaf that appears in `loop/decomp/req-001.md`; this leaf's ids absent.

### D-G — The live proof: `loop/items/AI4DEV-60/proof-local.ts` → `proof-local.txt`.
Evidence-gathering, run once, never a guarding test. It REUSES the predecessor's hardened
redaction helpers (query-value scrub, JWT-shaped-substring scrub, fragment strip — the
[A6]/[L4] lessons) rather than rewriting them, and the executor inspects the transcript for
credential residue before committing it. Checks:

  (a) WRONG PASSWORD: password-grant sign-in with a bad password → 4xx whose `error_code` is
  the credential refusal (expected `invalid_credentials`; read from the IN-MEMORY body because
  the redactor blanks `error_code`; if the live code differs the check FAILS, the executor
  pins the measured code and re-runs — the fail-and-re-pin protocol). The body carries no
  `access_token`, no `refresh_token`, no `session` (the widened credential guard from the
  predecessor's [L3]). `auth.sessions` on port 54322 holds no row for the user.
  (b) CORRECT PASSWORD (control): 200 with tokens; the `auth.sessions` row exists.
  (c) REVOCATION: `logout` with the live token; then the SAME access token at `/auth/v1/user`
  → expected 401 with a session-referencing error code (expected `session_not_found` —
  MEASURED and pinned, never assumed: this is the load-bearing vendor claim that revocation
  ends access before the JWT's own expiry); the revoked session's refresh token at the token
  endpoint → refused; and the deployed `complete-signup` function called with the dead token →
  the auth-layer refusal (`resolveCaller` → null), distinguished from a product refusal by
  also calling it once with a LIVE token (whose refusal, for an already-completed account, is
  the product's 4xx with a reason — both captured).
  (d) EXPIRY AND REFRESH-AFTER-EXPIRY: a TRANSIENT local config change lowers `jwt_expiry` to
  a few seconds, stack restarted and recorded; sign in; the token works; wait past expiry; the
  token at `/auth/v1/user` → 401 (expired code captured verbatim); the deployed function
  refuses it; then the SAME session's refresh token → 200 with a fresh access token that works
  at `/auth/v1/user` AND at the deployed function — refresh re-established access with no
  credentials, which is AT-001.13's live substance. THE SAME-SESSION-ROW PROBE (gate-1 ruling
  4): `auth.sessions` for this user is read with operator authority before and after the
  refresh — same row id, no new row — which is what binds the fixture's extend-the-same-row
  mirror; if the vendor rotates the row, the fail-and-re-pin protocol corrects the mirror to
  the measurement. Then `jwt_expiry` is RESTORED to 3600 and
  the stack restarted; the final `git diff` shows `supabase/config.toml` UNCHANGED — the
  transient change lives only in the transcript. Two failed restart attempts → stop and
  report.
  (e) RESET, END TO END: a fresh address registers and confirms (the predecessor's catcher
  helpers); `/auth/v1/recover` → the catcher holds the recovery email → the link is extracted;
  a TAMPERED variant is followed FIRST and the old password still signs in (a token GoTrue
  never issued — no lifetime claim); the real link's flow SHAPE is MEASURED before it is
  asserted (token-in-fragment vs a PKCE code differ across CLI versions); the new password is
  set through the measured flow; then the old password → the (a)-pinned credential refusal,
  and the new password → 200. THE UNKNOWN-ADDRESS PROBE (gate-1 ruling 4): `/auth/v1/recover`
  is also called once for a never-registered address and the answer captured — expected the
  same 200 no-existence-oracle shape `requestPasswordReset` mirrors; if the live code differs,
  fail and re-pin.
  (f) if the mailer rate limit starves any email here, the predecessor's pre-authorized relief
  valve applies (raise the local limit, restart, record) — measured last item as NOT binding
  (the CLI did not push the key), so it is expected not to fire.
  (g) LINKED-VOLUNTEER CONTROL ACROSS THE REFACTORED EDGE (gate-1 ruling 2). The refactor
  moves the caller judgment into the pure module and leaves an untyped delegation in
  `edge.ts`; a delegation that pre-narrowed the Auth body (say `{ id }`) would lose
  `identities[]`, pass every other planned check, and break every deployed linked-volunteer
  completion. So: a fresh address registers and confirms; the GitHub identity is fabricated by
  the predecessor's proven recipe (`fabricateGithubIdentity` in
  `loop/items/AI4DEV-58/proof-local.ts` ~line 140 — a direct `auth.identities` insert with
  operator authority, GoTrue's timestamp quirk already handled there); sign in; call the
  DEPLOYED `complete-signup` with the live token as a volunteer → completion SUCCEEDS and the
  `volunteer_profiles` row carries the handle and the shipped stub's exact statistics. This is
  the one check that fails on a pre-narrowed bridge, and it re-establishes the predecessor's
  deployed-linked-volunteer evidence, which this refactor supersedes.

### D-H — One review slice.
Estimated diff outside `loop/items/`: ~50 pure module, ~25 edge.ts, ~60 selftest, ~90
contract, ~150 fixture, ~250 suite bodies and headers, ~30 declaration and pending
bookkeeping — roughly 650. Under the 1200-line trigger the earlier leaves used. **One slice**;
both pinned draft-code readers read the whole diff.
MEASURED at the draft head: 1,334 insertions outside `loop/items/` (1,605 total), above the
estimate — the excess is comment weight in the fixture and contract, not logic. The one-slice
decision is MAINTAINED by the draft sitting (`draft-rulings.md` ruling 3): the diff is one
concern, and the bodies are unreadable apart from the fixture they drive.

### D-I — Surface marks. AMENDED per gate-1 ruling 1: .13 is `ui`.
The wiring leaf re-runs the ui-tagged subset of *"the auth screens (signup, sign-in,
verification, reset)"* — the `ui` mark is the mechanism by which that leaf finds its work.
AT-001.38 (`ui`) is the sign-in screen's negative; AT-001.14 (`ui`) is the reset screen.
AT-001.12 is `backend`: expiry and revocation are the session layer's enforcement, and no
named screen carries them. **AT-001.13 is `ui`**, and the reason is the mark's mechanism, not
a screen: the one clause only a wired client can make true — "automatically", the client SDK
scheduling the refresh — needs a dev-board owner, and a `backend` mark would orphan it until
the requirement's far-away integration-tier gate (the gate-1 reviewer's finding, accepted).
The wired re-run drives .13 through the wired client, where supabase-js's automatic refresh
is the thing under test; the loop-tier body proves this leaf's half — refresh works, takes no
credentials, and an unrefreshed sibling of the same instant dies. The mark leans on the wired
client rather than on one named screen, and this sentence is the honest record of that.

## 3. Steps, each with its own done-criterion

Item evidence lives in `loop/items/AI4DEV-60/`. Every path repository-relative. The executor
commits one commit per step (the parking rule).

**Step 0 — baseline.** `bun run typecheck`, `bun run at:selftest`, `bun run at:check req-001`,
`bun run at:check req-016`, `bun run at:verify req-001 --tier loop --expect`,
`bun run at:verify req-016 --tier loop --expect`.
→ done: all exit 0, transcript in `loop/items/AI4DEV-60/baseline.txt` (req-001 showing 9
green / 28 declared red). A red baseline is reported, not worked around. (The known stale-lock
flake in `runner.selftest.ts` gets one re-run and a note, per the predecessor's record.)

**Step 1 — the shipped judgment.** `supabase/functions/_shared/caller.ts` per D-B; `edge.ts`
delegates; `tests/at/harness/shipped-caller.selftest.ts` proves fail-closed for: non-2xx
status, missing `id`, non-string `id`, null body, non-object body, and the one accept — 2xx
with a string `id`, with and without a linked GitHub identity.
→ done: `bun run typecheck` exits 0 with the module imported by the acceptance program (via
the fixture in step 2 — at this step, by the selftest); `bun run at:selftest` green including
the new file; `edge.ts` contains no judgment about the answer shape any more — only the fetch
and the delegation.

**Step 2 — contract and fixture.** The D-C/D-D extensions; validation through the shipped
judgment; the clock destructured and read at issuance and validation.
→ done: `bun run typecheck` exits 0; the ONLY caller-validity judgment in the fixture is the
shipped `callerFromAuthAnswer` (no second copy of the fail-closed rule); every vendor mirror
this leaf adds is named in the fixture header's mirror section with what binds it OR an
explicit unbound label (gate-1 ruling 4) — SIGN-IN issuance and its `auth.sessions` row by
(a)/(b), registration issuance stated as the declared divergence and never labelled bound,
provider and administrator issuance labelled UNBOUND, revocation ending access by (c), access
expiry, refresh-after-expiry and the same-session-row by (d), the reset flow by (e), the
unknown-address 200 by (e)'s unknown-address probe, the never-issued reset link by (e)'s
tampered probe; the `jwt_expiry = 3600` TTL constant cites its config line;
`bun run at:verify req-001 --tier loop --expect` still exits 0 BEFORE the bodies land (the
four ids still declared red, nine green untouched by the session machinery).

**Step 3 — the four bodies, and the bookkeeping.** D-E, D-F.
→ done: `bun run at:verify req-001 --tier loop --expect` exits 0 with exactly 13 passed and
24 declared red; `bun run at:check req-001` clean; no comment in any touched file still says
the four ids are pending, that the fixture has no session state, or a stale count; the b-file
imports neither `LEAF` nor `notLanded`.

**Step 4 — the stack, unchanged config.** `bunx supabase start` (or confirm running);
`bunx supabase status`; serve the functions from THIS worktree.
→ done: stack up, function mount recorded (command and cwd) in
`loop/items/AI4DEV-60/stack-up.txt`. No config change in this step — (d)'s transient change
happens and is reverted inside step 5, recorded in the same file.

**Step 5 — the live proof.** D-G, transcript to `loop/items/AI4DEV-60/proof-local.txt`.
→ done: checks (a)–(e) and (g) all pass as written (with (f) armed); every pinned discriminator
captured verbatim from the in-memory body; the transcript passes the executor's credential
inspection; `supabase/config.toml` shows no diff at the end.

**Step 6 — the whole verify surface, green together.** The step-0 list re-run.
→ done: all exit 0 in `loop/items/AI4DEV-60/verify-final.txt`; req-016 unchanged from
baseline.

## 4. Expected verification state, per acceptance-test id

At `bun run at:verify req-001 --tier loop --expect` when this item is done: **AT-001.01–.07,
.09, .10, .12, .13, .14, .38 green (13), the other 24 P0 ids red as
`{"kind":"pending","phase":"sut-missing"}`**, exit 0.

| id | proved at loop tier (CI) | proved on the live stack (step 5, one machine) | **not proved by this item** |
|---|---|---|---|
| AT-001.38 | wrong password refuses through the fixture's Auth mirror with no session minted (`sessionsOf` unchanged), correct password mints one; the single-reason refusal shape observed | the wire refusal with its pinned `error_code`, no token material in the body, and no `auth.sessions` row — checks (a)/(b) | sign-in rate limiting (AT-001.34, another leaf); any screen (the wiring leaf's) |
| AT-001.12 | an expired and a revoked session each refuse a write THROUGH THE SHIPPED `callerFromAuthAnswer`, the refused write writes nothing, and re-authentication is the exact change that unblocks | revocation kills the live token at `/auth/v1/user` and at a DEPLOYED function; an expired token likewise; both with captured codes — checks (c)/(d) | enforcement at routes that do not exist yet (only two functions are deployed; the pure module is the judgment every later route must call); admin-side revocation surfaces; the `[auth.sessions]` timebox/inactivity semantics, which are off locally |
| AT-001.13 | refresh extends a session with no credentials while an unrefreshed sibling of the same instant dies — the discriminating pair; same account before and after | a real refresh token re-establishes access AFTER access expiry, no credentials — check (d), including the same-session-row probe | **the "automatically" clause**: no client exists in this tree to schedule the refresh. The handoff is the `ui` mark (gate-1 ruling 1): the wiring leaf's wired re-run drives this id through the real client, whose automatic refresh is then the thing under test, and the requirement's integration-tier gate binds it above that. This item proves the mechanism, not the scheduling |
| AT-001.14 | the emailed reset link is what changes the password (never-issued link changes nothing), the new password signs in, the old is refused | the recovery email in the catcher, the measured live flow, old password refused with the pinned code, new accepted — check (e) | email delivery beyond the local catcher; the reset screen (the wiring leaf's); reset-link expiry/single-use/resend — retired AT-001.15, deliberately unasserted; whether a live reset revokes other sessions — unasserted, no criterion reads it |

**What the green does and does not claim** (repeated in the merge ruling): claims — the four
bodies exist, execute, and assert; the shipped `callerFromAuthAnswer` — byte for byte the
judgment both deployed functions run — fails closed and sits on every validated fixture path;
the session, refresh and reset round trips work against the real local GoTrue with exact
refusal codes captured. Does not claim — that any client refreshes automatically, that any
screen exists, that hosted email delivery works, that routes beyond the two deployed functions
enforce anything, or anything about link lifetimes.

## 5. Seen, deliberately not touched

- **`[auth.sessions]` timebox and inactivity timeout** — commented out locally; no criterion
  reads them; not enabled, not mirrored, not asserted.
- **Refresh-token rotation and the reuse interval** — vendor semantics no criterion reads
  (D-C); the live refresh in (d) exercises rotation implicitly and asserts nothing about it.
- **Retired AT-001.15 and AT-001.11 semantics** — nothing modelled, nothing asserted (D-D).
- **Audit rows for resets** — the criterion's own note drops the audit claim.
- **The a-file's and b-file's nine green bodies** — no assertion changes; the fixture gains
  state beneath them, and step 0/3 prove the greens unmoved.
- **The wiring leaf's screens** — `src/` is the other ownership territory besides.
- **The two filed items under the auth root** (default-privilege residue; GitHub-unlink
  enforcement) — other items' work.
- The acceptance file and the manifest — read-only here; changes go through `/doc-sync`.
- `AGENTS.md` staleness — pre-existing, filed two items ago, still not this item's.

## 6. Risks that could force a mid-flight change

1. **GoTrue does not kill the access token at logout** (stateless-JWT reading): check (c)
   fails, the captured behaviour replaces the expectation, and the plan is amended in the
   open — the criterion's revocation half would then rest on the refresh-token refusal plus
   whatever the measurement shows, and the fixture mirror would be corrected to match. The
   expected behaviour (session lookup at `/auth/v1/user`, `session_not_found`) is marked
   unverified until (c) runs.
2. **The recovery-link flow shape varies across CLI versions** (fragment tokens vs a PKCE
   code). (e) measures the shape before asserting anything; the transcript records which shape
   was found. If no link can be extracted at all, the admin generate-link fallback applies
   with the narrowing note, exactly as the predecessor's (b) fallback.
3. **The transient `jwt_expiry` restart misbehaves** — two failed attempts → stop and report;
   the restore is verified by `git diff` showing config.toml clean before the close.
4. **The `Session` type change ripples** — no literal exists outside the fixture (section 1);
   the executor re-verifies with a grep before step 2 and stops if one appears.
5. **Uniform validation moves an existing green** — step 2's done-criterion runs the full
   verify BEFORE the bodies land; any movement there is reported, not patched silently.
6. **The four bodies need Auth semantics richer than the mirrors** (for example a distinct
   refusal per dead-session cause). The mirrors stay minimal; if a criterion genuinely needs
   more, stop and report — richer vendor simulation is a plan amendment, not an executor
   improvisation.
