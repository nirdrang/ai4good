# AI4DEV-59 (email verification, unverified-write gate) — PLAN

**Sitting 1 of the item: PLAN. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).**

**Sitting 2 (DRAFT, same definition and model) ruled on gate 1's four findings and amended this
plan. The rulings are section 7. The amended text below is what gets built; the pre-amendment
text is commit `46b7485`.**

**Sitting 3 (FIX AND GOAL, same definition and model) ruled on gate 2's twelve findings — nine
from seat A, three from seat B, two convergent pairs. The rulings are section 8. That sitting
amended step 2's mirror-binding sentence and step 5's done-list; the pre-amendment text is
commit `ac33db1`.**

**Chain, derived from the branch**
(`nirdrang/ai4dev-59-email-verification-and-the-gate-on-unverified-writing-d2l1`):
AI4DEV-59 (email verification, unverified-write gate) → AI4DEV-52 (verification, sessions and
reset container) → AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the authentication requirement).
No `attr:` label on any of them; product work with an evidence gate above it.

**Manifest:** `loop/decomp/req-001.md`, deliverable D2 leaf L1, revision `0579425`:
*"verification flow (all email-capable account types) + unverified-write gate on Discovery
messages · verify: AT-001.09,10 · blocked-by: D1.L1"*. The D1 container is Done on the board
(its two leaves merged as pull requests #47 and #48), so the blocker is cleared.

**Acceptance ids this leaf owns:** AT-001.09, AT-001.10.
**Acceptance text (read-only for this item):** `.taskmaster/docs/acceptance/at-req-001.md`
lines 20–21. Line 22 matters too: **AT-001.11 is retired** — *"verification-link
expiry/single-use/resend semantics are not stated in REQ-001"* — so no assertion in this item
may claim those semantics.

**Ratified product text behind the gate:** the PRD makes email verification *"the floor for any
Discovery message"* and says vetting is *"never the Discovery wall"* (decision-8,
`.taskmaster/docs/prd-new.md` line 787; also lines 155 and 159, and
`.taskmaster/docs/prd-mvp.md` line 157).

**Verify command, pinned:** `bun run at:verify req-001 --tier loop --expect`. The fixture
adapter is a stand-in capped at the loop tier (its own header, `_fixture.ts` lines 7–10;
`adapterDerivedCapability()` in `tests/at/harness/capabilities.ts`), CI has no database, and the
requirement's integration-tier done contract remains AI4PM-19's gate, not this leaf's.

---

## 1. What I verified in the tree before deciding anything

| claim | verdict | evidence (pointer) |
|---|---|---|
| Both ids are declared red, pending on this leaf | true | `tests/at/expected/req-001.json` lines 15–16; stubs at `tests/at/suites/req-001/b-verification-and-sessions.test.ts` lines 13 and 15, each `notLanded(LEAF.D2_L1)` |
| The config flip is reserved for this leaf | true | `supabase/config.toml` line 243 `enable_confirmations = false`; the b-file header (lines 4–7) says turning it on "is the verification leaf's own change" |
| A local mail catcher is enabled | true | `supabase/config.toml` lines 105–108: `[local_smtp]` enabled, web interface on port 54324 |
| The local stack limits auth emails to 2 per hour | true (as configured) | `supabase/config.toml` line 216, `[auth.rate_limit] email_sent = 2`; whether it binds with the local test mailer is measured in step 5, not assumed |
| No Discovery product code exists anywhere | true | grep `discovery` over `supabase/`, `src/`, `tests/` — only docs, a harness rubric for another requirement, and this suite's own stub title; the future route is mapped to a `discovery-message` edge function in `.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md` lines 103–105 |
| The decision-module pattern is established: shipped judgements, fixture storage | true | `supabase/functions/_shared/accounts.ts` header; `_fixture.ts` header and its imports (lines 45–62) |
| The suite already models "the hook a later leaf must call" | true | `hasPlatformAcknowledgment`'s contract comment, `_contract.ts` lines 244–260 — enforcement it cannot build is named as the hook the later leaf calls |
| The caller-fact-through-shipped-extractor pattern is ratified | true | `_fixture.ts` lines 208–225 (gate-2 ruling R3 of the GitHub leaf): the fixture renders the canonical GoTrue user shape and derives the fact through the shipped extractor |
| `_pending.ts` header counts will go stale | true | `tests/at/suites/req-001/_pending.ts` lines 3 and 9 say 30 pending / seven written; after this item it is 28 / nine |
| CI runs typecheck, harness self-tests, at:check and at:verify (loop, --expect) per suite, plus the ownership and reference guards | true | `.github/workflows/ci.yml` |
| GoTrue with confirmations on issues no session at signup and refuses sign-in until the address is confirmed | **unverified-runtime-claim** | expected GoTrue behaviour; measured, with exact refusal text captured, in step 5 — nothing in this plan silently depends on it before then |

## 2. Decisions

### D-A — "Verified" is Supabase Auth's own fact. No migration, no new column.
The observable behind AT-001.09 is `email_confirmed_at` on the auth user — GoTrue's field, set
by GoTrue when the emailed link is used. Nothing this leaf ships writes it, `public.accounts`
gains no column, and this item ships **no migration**. Consequence: there is no schema, RLS or
privilege surface to prove here; the live proof reads `auth.users.email_confirmed_at` as
operator evidence only.

### D-B — The config flip, and one pre-authorized relief valve
`[auth.email] enable_confirmations` flips to `true` in `supabase/config.toml` — the change the
b-file header explicitly reserves for this leaf. The comment beside it is updated to say what it
changes and which leaf owns it. **Pre-authorized amendment:** if step 5's registrations starve
on the 2-per-hour `[auth.rate_limit] email_sent` limit (429 or absent mail), the executor raises
that value (e.g. to 100) in the same file, restarts the stack, and records the raise in the
transcript. This is local-stack configuration; no hosted deployment exists.

### D-C — The gate is a shipped decision module: `supabase/functions/_shared/verification.ts`
A new module under the same two constraints as `accounts.ts` (relative imports only, no Deno
global, no I/O; its type coverage is its import from the acceptance program). Two exports:

- `emailVerifiedFromUser(user: unknown): boolean` — judges the GoTrue `/auth/v1/user` response
  shape: a non-empty string `email_confirmed_at` means verified; **anything else — missing
  field, null, non-string, malformed object — means unverified.** Fail closed.
- `discoveryMessageAllowed(caller: { emailVerified: boolean }): Decision<'verified'>` —
  `Decision` imported from `./accounts.ts`. The ONLY allow is `caller?.emailVerified === true`;
  a missing or malformed caller argument refuses (the same fail-closed posture, for the same
  measured reason: edge entry points have no type-checker). The refusal reason names email
  verification as what is missing AND as the remedy, in words AT-001.10's assertion can match.

The gate is **type-blind**: decision-8 makes verification the floor for ANY Discovery message.
AT-001.10's unverified-NGO subject is an instance of that rule, not its scope, and a gate that
read the account type would be shipping a distinction no ratified text draws.

Why a new module rather than growing `accounts.ts`: that file's header scopes it to the account
deliverable's decisions; `github.ts` already set the several-small-modules precedent; and this
rule's future caller is the Discovery send route, not signup.

### D-D — No Discovery surface ships. The gate is the hook the route must call.
The Discovery message route belongs to REQ-002/004 (the migration doc maps it to a future
`discovery-message` edge function). Building an edge function or a table for it here would be
another requirement's surface invented early. What this leaf ships is the **decision** that
route must consult — exactly the pattern the suite already ratifies for
`hasPlatformAcknowledgment` ("this is the hook the leaf that lands project creation must call").
The module header and section 4 both state it plainly: **the gate has no deployed caller yet**,
and no green from this item may be read as "Discovery messaging is gated in production."

At the loop tier the SUT gains a `sendDiscoveryMessage` operation and the fixture is the
stand-in surface: it renders the caller's GoTrue user shape from stored Auth state, derives the
verified fact through the SHIPPED `emailVerifiedFromUser`, consults the SHIPPED
`discoveryMessageAllowed`, refuses with the gate's own reason and **writes nothing**, or on
allow records the message in fixture storage. Every judgement is the shipped module's; the
storage is a Map like all the rest.

### D-E — Fixture and contract: mirror Auth's verification state, judge nothing
`_fixture.ts`: `AuthUser` gains `emailConfirmedAt: string | null` and
`verificationLink: string | null`. An email/password registration starts unconfirmed and mints
a link value (the fixture's stand-in for the emailed link the mail catcher would hold). A
provider registration (Google/GitHub) starts confirmed — the expected GoTrue behaviour when the
provider vouches for the address. **This mirror is UNBOUND by this item** (gate-1 ruling [1],
section 7): no OAuth app or credential exists in this environment, so no live provider session
is obtainable — the same recorded gap that leaves the OAuth handshake itself unproved at every
tier, stated in the fixture header since the predecessor. No test this item reads a provider
user's verified state; both new bodies register by email/password. If the prediction is wrong —
a real provider user arriving unconfirmed — the shipped gate fails closed: it refuses, never
allows. The fixture header's mirror section states all of this; the mirror is bound by the
first item that ships a real provider-path consumer.

`_contract.ts`: `AccountsSut` gains five members —
- `emailVerified(accountId): Promise<boolean>` — read-back, derived through the shipped
  `emailVerifiedFromUser` over the rendered GoTrue user shape (the R3 pattern: the extractor
  sits on the tested path, exactly as the future route's caller resolution would).
- `emailedVerificationLink(email): Promise<string | null>` — the emailed verification link for
  the address, or null when none was emailed.
- `useVerificationLink(link): Promise<{ ok: boolean }>` — using an emailed link confirms the
  address; a never-issued link returns `ok: false` and flips nothing. **No expiry, no
  single-use, no resend is modelled or asserted — those are retired AT-001.11's semantics,
  deliberately unstated in REQ-001.** The never-issued negative is not AT-001.11 ground: a
  link-shaped string that verifies an account it never belonged to would make "using the link
  flips it" meaningless, so the negative guards this test's own oracle.
- `sendDiscoveryMessage(session, body: string): Promise<{ ok: true } | { ok: false; reason:
  string }>` — per D-D. A caller with no completed account gets the fixture's bookkeeping
  refusal, same shape as `createOrganization`'s.
- `discoveryMessagesBy(accountId): Promise<string[]>` — read-back, because a block whose write
  happened anyway is not a block.

`registerWithEmailPassword` keeps returning a `Session`. The fixture's `Session` has always
been an identity handle, not an access token — session ISSUANCE (and with it "an unconfirmed
user holds no session") is D2.L2's subject. The honest gap this leaves is stated in section 4
and in the test comments, not hidden: at the loop tier a completed-but-unverified account is
constructible; on the live stack the public path cannot reach it (step 5 measures that).

### D-F — AT-001.09's body: parameterized over both types, surface `ui`
For EACH of `ngo` and `volunteer` (the two email-capable public types —
`PUBLIC_SIGNUP_ACCOUNT_TYPES`; the platform admin is provisioned, not signed up, and is outside
this criterion's "can register by email"):
1. register with email/password → `emailVerified` is **false** — the fresh signup is
   email-unverified.
2. complete signup (NGO with an organisation name; volunteer after `linkGithubIdentity`, the
   precondition AT-001.04 owns) → the account row carries its type — which makes "either
   account type" a fact of the run, not a label.
3. still `emailVerified` false — completion does not verify.
4. negative: `useVerificationLink('never-issued-link')` → `ok: false`, and `emailVerified`
   still false.
5. `emailedVerificationLink(email)` → non-null; `useVerificationLink(link)` → `ok: true`;
   `emailVerified` → **true** — using the emailed link is what flips it.
6. the account row still carries the same type — verification re-types nothing.

Surface mark `ui`: the verification screen is one of the four auth screens the manifest's
wiring leaf names (*"signup, sign-in, verification, reset"*), so D2.LW must find this id to
re-run `--wired`.

Ordering note, stated so the review can attack it rather than discover it: the test completes
signup BEFORE verifying, so that the typed account is observably unverified — the criterion's
"the account … is email-unverified until the link is used" read with "account" meaning the
typed account. On the live stack with confirmations on the public order is verify-then-complete
(no session exists before confirmation); step 5 drives THAT order against the real stack. The
two orders together cover both readings; neither contradicts any criterion.

### D-G — AT-001.10's body: the discriminating pair, surface `backend`
1. register an NGO by email/password and complete signup **without verifying** (reachable at
   the loop tier per D-E; the body's comment states plainly that the live public path cannot
   reach this state and why the gate exists anyway — decision-8 makes the floor the write
   path's own rule, not a property borrowed from the session layer, and non-public paths and
   configuration history can produce exactly this state).
2. `sendDiscoveryMessage` → refused; the reason matches `/verif/i` and `/email/i` —
   verification named as the remedy; `discoveryMessagesBy` is empty — the blocked attempt
   wrote nothing.
3. the discriminating control: use the emailed verification link → `emailVerified` true → the
   SAME send now succeeds and `discoveryMessagesBy` records it. The remedy is proved by being
   the exact change that unblocks, and a refuse-everybody gate fails this half.

Surface mark `backend`: the Discovery composer is REQ-002/004's surface; it is not one of the
four auth screens, and the wiring leaf has nothing of it to re-run.

### D-H — Suite bookkeeping, all in the same change
- `tests/at/expected/req-001.json`: AT-001.09 and AT-001.10 move from `red` to `green` — 9
  green / 28 declared red.
- `_pending.ts`: `D2_L1` is removed from `LEAF` (the orphan rule — its last two users become
  real bodies), and the header's counts and "seven are written" sentence are corrected —
  after this item they are false statements of fact, the audit's first box.
- The b-file header is rewritten: its `enable_confirmations` sentence becomes false the moment
  this leaf lands. `LEAF`/`notLanded` imports stay — four D2.L2 stubs still use them.
- `loop/items/AI4DEV-59/pending-ledger.txt`: 28 lines, one per remaining pending id, each
  naming a deliverable-and-leaf that appears in `loop/decomp/req-001.md`; this leaf's ids
  absent.

### D-I — One review slice
Estimated diff outside `loop/items/`: ~70 lines shared module, ~10 config, ~60 contract, ~90
fixture, ~140 suite bodies and headers, ~50 shape selftest (gate-1 ruling [4]), ~15 declaration
and pending bookkeeping — roughly 450.
Far under the 1200-line trigger the previous two leaves used. **One slice**; both pinned
draft-code readers read the whole diff.

## 3. Steps, each with its own done-criterion

Item evidence lives in `loop/items/AI4DEV-59/`. Every path repository-relative. The executor
commits one commit per step (the parking rule).

**Step 0 — baseline.** `bun run typecheck`, `bun run at:selftest`, `bun run at:check req-001`,
`bun run at:check req-016`, `bun run at:verify req-001 --tier loop --expect`,
`bun run at:verify req-016 --tier loop --expect`.
→ done: all exit 0, transcript in `loop/items/AI4DEV-59/baseline.txt` (req-001 showing 7 green /
30 declared red). A red baseline is reported, not worked around.

**Step 1 — the shipped gate.** `supabase/functions/_shared/verification.ts` per D-C, header
naming the hook contract (D-D) and the fail-closed posture.
→ done: `bun run typecheck` exits 0 with the module imported by the acceptance program (via the
fixture); the refusal reason names email verification as the remedy; and a direct shape test —
`tests/at/harness/shipped-verification.selftest.ts` (gate-1 ruling [4], section 7) — proves the
fail-closed promise: `emailVerifiedFromUser` returns false for a missing field, `null`, an
empty string, a number, an object value, and a non-object user, and true only for a non-empty
string; `discoveryMessageAllowed` refuses a missing and a malformed caller in the same file.
The vitest include `harness/**/*.selftest.ts` and the `at:selftest` filter pick it up with zero
script or CI change — verified against `tests/at/vitest.config.ts` line 16 and the
`package.json` script. Its header states why a shipped module's shape test rides the selftest
lane: the promise cannot arise through the fixture, and this lane is what CI already runs.

**Step 2 — contract and fixture.** The D-E extensions, judgements delegated per D-C/D-D.
→ done (rewritten by gate-1 ruling [3], section 7 — the earlier criterion was unsatisfiable as
written): `bun run typecheck` exits 0; both PRODUCT judgements — the verified-fact extraction
and the Discovery gate — come only from the shipped `verification.ts`, with no second copy of
either rule in the fixture; and every VENDOR MIRROR this leaf adds is named in the fixture
header's mirror section with what binds it: link issuance at email signup is bound by step 5
(a)–(b); a never-issued link returning `ok: false` is bound by step 5 (b2) — the tampered-link
negative added by gate-2 rulings [A2]/[B1], section 8, because the earlier "(a)–(d)" wording
claimed a binding no check measured; a used link setting `emailConfirmedAt` is bound by step 5
(b) and (d); a provider registration starting confirmed is declared UNBOUND, per the D-E
amendment; and the provisioned platform admin starting CONFIRMED mirrors the recorded
provisioning recipe (gate-2 ruling [A8], section 8), read by nothing and live-bound by the
first item that reads an admin's verified state.

**Step 3 — the two real test bodies, and the bookkeeping.** D-F, D-G, D-H.
→ done: `bun run at:verify req-001 --tier loop --expect` exits 0 with exactly 9 passed and 28
declared red; `bun run at:check req-001` clean; no comment in any touched file still states
that .09/.10 are pending, that the config flip is reserved, or a stale count.

**Step 4 — the config flip, and the stack with it.** D-B in `supabase/config.toml`; restart the
local stack so auth picks it up.
→ done: `bun run db:reset` (or stop/start) completes; `bunx supabase status` shows the stack up;
transcript in `loop/items/AI4DEV-59/stack-up.txt`. Two failed attempts → stop and report.

**Step 5 — the live proof.** `loop/items/AI4DEV-59/proof-local.ts` against the live stack,
transcript in `proof-local.txt`. Evidence-gathering, run once, never a guarding test. Secrets
redacted exactly as the predecessor transcripts redact them.
→ done, all of:
  (a) an email/password signup under the flipped config returns **no session**, and the
  operator read on the database (port 54322) shows `auth.users.email_confirmed_at IS NULL` —
  the unverified-runtime-claims from section 1 measured, with exact wire responses captured;
  (b) the mail catcher on port 54324 holds the confirmation email for that address, and the
  verification link is extracted from it — the catcher's API shape MEASURED first, not assumed;
  (b2) a tampered variant of that link — its token altered, so a token GoTrue never issued —
  is followed BEFORE the real one, and `auth.users.email_confirmed_at` stays NULL: the
  never-issued-link mirror measured rather than inferred (gate-2 rulings [A2]/[B1], section 8);
  no expiry, single-use or resend semantics are touched — the token followed was never issued.
  If only the operator-minted fallback link exists, (b2) runs against a tampered variant of THAT
  link with a note naming the source — a mutated operator-minted token is equally never-issued —
  and it skips only when no link exists at all (sitting-3 ruling on the executor's report);
  (c) sign-in BEFORE confirmation is refused with a CONFIRMATION-SPECIFIC refusal — a 4xx whose
  body names the unconfirmed state (expected GoTrue error code `email_not_confirmed`), captured
  verbatim; a 429 or a 5xx is NOT this refusal and fails the check (gate-2 ruling [A3], section
  8). The discriminator is read from the in-memory body, because the transcript redactor's
  name-pattern also blanks `error_code`, and the note surfaces it through a safe extraction;
  (d) using the link (HTTP GET) flips `email_confirmed_at` to non-null; sign-in now succeeds;
  and the raw `/auth/v1/user` response of the signed-in user, fed to the SHIPPED
  `emailVerifiedFromUser`, returns true — the extractor bound to GoTrue's real serialisation
  (its false half is exercised at the loop tier; an unconfirmed user has no session to read
  `/auth/v1/user` with, and the transcript says so rather than dressing it up);
  (e) both email-capable types flow END TO END under the flipped config (gate-1 ruling [2],
  section 7 — the flip changes the auth context beneath BOTH completion paths, so the
  predecessor's completion evidence predates it and is re-proved, not cited): a second address
  repeats (a)–(d); the NGO address completes signup through the deployed `complete-signup`
  edge function AFTER confirmation; the volunteer address, after confirmation and sign-in,
  gains a GitHub identity by the predecessor's mechanism — the operator-authority insert into
  `auth.identities` (`fabricateGithubIdentity` in the predecessor's proof script, flip-
  independent because it is a database write, not an auth flow) — then completes as a
  volunteer through the same deployed function, and the account row and imported profile are
  read back. The volunteer's "repeats (a)–(d)" claim has teeth (gate-2 rulings [A3]/[A4],
  section 8): its link MUST come from the catcher (`linkSource === 'emailed'`) and its
  pre-confirmation sign-in refusal MUST be the same confirmation-specific one as (c);
  (f) if the mailer rate limit starves (b), the D-B relief valve fires and the transcript
  records it.

**Step 6 — the whole verify surface, green together.** The step-0 list re-run.
→ done: all exit 0 in `loop/items/AI4DEV-59/verify-final.txt`; req-016 unchanged from baseline.

## 4. Expected verification state, per acceptance-test id

At `bun run at:verify req-001 --tier loop --expect` when this item is done: **AT-001.01–.07,
.09, .10 green (9), the other 28 P0 ids red as `{"kind":"pending","phase":"sut-missing"}`**,
exit 0.

| id | proved at loop tier (CI) | proved on the live stack (step 5, one machine) | **not proved by this item** |
|---|---|---|---|
| AT-001.09 | the flow shape against the fixture's Auth mirror: both public types start email-unverified, a never-issued link flips nothing, the emailed link flips the account to verified, the type survives; the shipped `emailVerifiedFromUser` judges the rendered user shape on every read | the real substance: GoTrue issues no session at signup, the confirmation email exists and its link flips `email_confirmed_at`, sign-in is refused before and succeeds after, the shipped extractor answers true against GoTrue's real serialisation | email delivery anywhere but the local mail catcher; any screen (D2.LW's, and Lovable's territory); link expiry / single-use / resend semantics — retired AT-001.11, deliberately unasserted; GoTrue's serialisation of provider-vouched confirmation — the fixture's provider-confirmed start is an unbound vendor mirror (D-E amendment) |
| AT-001.10 | the SHIPPED gate refuses an unverified account's Discovery send with verification named as the remedy and writes nothing, and the SAME send succeeds once verified — the discriminating pair | the auth-layer fact: an unconfirmed email/password user cannot authenticate at all, refusal text captured — on the live stack the block sits upstream of the gate | **enforcement at a deployed Discovery route — none exists.** The route is REQ-002/004's; the gate is the hook it must call, stated in the module header. No green here may be read as "Discovery messaging is gated in production" |
| AT-001.01–.07 | unchanged claims, bodies untouched | (e) re-proves BOTH public email paths end to end under the flipped config — NGO completion, and volunteer GitHub-link-then-completion; everything else is the predecessors' record | unchanged from the predecessors' tables |

**What the green does and does not claim** (repeated in the merge ruling): claims — the two
tests exist, execute, open worlds and assert; the shipped decision module `verification.ts` —
byte for byte the code a future route imports — behaves as the two criteria require, and fails
closed; the config flip is real and the live verification round trip works on one machine.
Does not claim — that any deployed route enforces the gate (none exists to), that hosted email
delivery works, that any screen exists, or anything about session expiry, revocation, refresh
or password reset (D2.L2's ids, declared red).

## 5. Seen, deliberately not touched

- **The a-file's seven green tests.** No criterion makes completion require verification, and
  the fixture does not model session issuance, so no existing body changes. The live-stack
  consequence of the flip (no session until confirmed) is proved as (e), not simulated at loop.
- **Session semantics** — expiry, revocation, refresh, reset: D2.L2's four ids, still
  `notLanded(LEAF.D2_L2)`.
- **The wiring leaf's screens**, including the verify CTA the PRD describes — D2.LW, and
  `src/` is the other ownership territory besides.
- **Retired AT-001.11 semantics** — nothing modelled, nothing asserted (D-E).
- **The two filed items under the auth root** — the default-privilege residue on the four auth
  tables, and the volunteer GitHub-unlink enforcement — other items' work.
- The acceptance file and the manifest — read-only here; changes go through `/doc-sync`.
- `AGENTS.md` staleness — pre-existing, filed two items ago, still not this item's.

## 6. Risks that could force a mid-flight change

1. **GoTrue's confirmations-on behaviour differs from the expectation** — a session at signup,
   sign-in not refused, or a different `/auth/v1/user` serialisation. Step 5 measures all
   three; if any differs, the plan is amended in the open, never silently thinned. The gate
   module is unaffected either way (it judges a shape, and its fail-closed answer to a missing
   field is the point).
2. **The mail catcher's API shape varies across CLI versions.** The executor measures the
   endpoint before asserting (b). Fallback if the catcher cannot yield the link: GoTrue's admin
   generate-link endpoint mints an equivalent verification link with operator authority — and
   the transcript then says the EMAILED link was not what was followed, narrowing claim (b)
   honestly instead of dressing it up.
3. **The email rate limit starves the proof.** The D-B relief valve is pre-authorized; the
   transcript records the raise.
4. **The flip breaks an existing live flow.** Step 5(e) exists precisely to catch the plausible
   ones (email/password signup → completion, for both public types). Anything else it surfaces is reported with the
   evidence, classified, and ruled — not patched silently.
5. **The two bodies cannot be written without inventing Discovery semantics.** The send
   operation carries an opaque string and nothing else; if anything richer turns out to be
   needed, stop and report — richer semantics belong to REQ-002/004.

## 7. Gate 1 rulings (sitting 2, DRAFT — fable, claude-fable-5, effort xhigh)

The gate had one reader. Its raw output is
`loop/items/AI4DEV-59/artifacts/gate1-sol-output.md`; the distillate beside it matches the raw
count (4 = 4). Every claim below is quoted verbatim from the raw output.

**[1] severity high — ACCEPT, FIXED DIFFERENTLY.**
Claim: "The plan treats Google/GitHub users as email-confirmed without a ratified product
ruling and incorrectly says step 5 verifies their GoTrue serialization, although that step
exercises only email/password users."
The second half is right and the plan text was false as written: step 5 has no OAuth flow, so
it binds nothing about provider users. That sentence is removed (D-E amendment). The proposed
remedy — raw `/auth/v1/user` responses from real Google and GitHub sessions — is not
obtainable: no OAuth app or credential exists in this environment, the same recorded gap that
leaves the OAuth handshake itself unproved at every tier (the fixture header has carried that
statement since the predecessor item; this narrowing rides on that recorded gap rather than
filing a duplicate). The first half needs no new product ruling: decision D-A already defines
"verified" as GoTrue's own fact, so the fixture's provider-confirmed start is a prediction of
the vendor, not a product choice this plan makes. No test this item reads a provider user's
verified state, and if the prediction is wrong the shipped gate fails closed — a real
unconfirmed provider user is refused, never allowed. The fix as built: the mirror is declared
UNBOUND in D-E, in the fixture header's mirror section, and in section 4's not-proved column.

**[2] severity medium — ACCEPT.**
Claim: "Step 5 claims both email-capable account types flow, but only the NGO address
completes signup; the second address repeats type-blind Auth operations and never becomes a
volunteer account."
Correct, and the reviewer's reasoning is adopted whole: the config flip changes the auth
context beneath both completion paths, so the predecessor's volunteer evidence — produced
with confirmations off — predates the flip and no longer covers it. Step 5(e) is rewritten:
the second address confirms, signs in, gains a GitHub identity through the predecessor's
operator-authority insert into `auth.identities`, completes as a volunteer through the
deployed function, and the account row and imported profile are read back.

**[3] severity medium — ACCEPT, FIXED DIFFERENTLY.**
Claim: "Step 2's done-criterion that every fixture rule comes from a shipped module is
impossible because the planned fixture itself decides link issuance, link validity,
confirmation mutation, and provider auto-confirmation."
Correct that the criterion was unsatisfiable read literally — the fixture necessarily mirrors
vendor behaviour, and its own header already keeps a named mirror category. The remedy is not
to drop the discipline but to state the real one: step 2's criterion is rewritten so that the
two PRODUCT judgements come only from the shipped `verification.ts`, and every vendor mirror
this leaf adds is named in the header's mirror section with what binds it. Three of the four
named behaviours are bound by step 5 (a)–(d) on the live stack; provider auto-confirmation is
declared UNBOUND per ruling [1] — bound "to live evidence" is met where live evidence is
obtainable and honestly declined where it is not.

**[4] severity medium — ACCEPT.**
Claim: "The promised fail-closed handling of missing, non-string, and malformed
`email_confirmed_at` values has no planned oracle because the tests exercise only `null` and a
valid timestamp string."
Correct — a promise without an oracle is exactly what the audit would flag as an untrue stated
fact, and weakening the promise would invert the gate's point. The fix: a direct shape test,
`tests/at/harness/shipped-verification.selftest.ts`, added to step 1's done-criterion,
covering the malformed shapes for `emailVerifiedFromUser` and the malformed-caller refusals
for `discoveryMessageAllowed`. Placement verified before ruling: the vitest include
`harness/**/*.selftest.ts` (`tests/at/vitest.config.ts` line 16) and the `at:selftest` filter
pick the file up with zero script or CI change.

No ruling removes work, so no removal-verification conditions exist. Nothing contradicts
ratified text and nothing grows scope; there is no founder question.

## 8. Gate 2 rulings (sitting 3, FIX AND GOAL — fable, claude-fable-5, effort xhigh)

The gate was a panel of two, each blind to the other. Seat A: nine findings, raw output
`loop/items/AI4DEV-59/artifacts/gate2-terra-output.md`, distillate beside it (9 = 9). Seat B:
three findings, raw output `loop/items/AI4DEV-59/artifacts/gate2-flash-output.md`, distillate
beside it (3 = 3). Seat B also names seven verified-sound areas in its raw output — the
fail-closed oracle coverage, the fixture discipline, AT-001.10's discriminating pair,
AT-001.09's ordering, the bookkeeping counts, the refactor's neutrality, and the selftest-lane
placement — recorded here as evidence, not as findings. Every claim below is quoted verbatim
from the seat's raw output. TWO CONVERGENT PAIRS — [A2]+[B1] and [A6]+[B2] — two blind seats
independently finding the same defect, the strongest signal a panel gives; each pair is one
defect with one fix. **Twelve findings, twelve accepted (three of them fixed differently), zero
rejected — ten distinct defects.**

**[A2] + [B1] — CONVERGENT. ACCEPT.**
Seat A (medium): "The fixture calls the never-issued-link mirror live-bound even though the
proof never follows or observes an unissued link."
Seat B (low): "Mirror 2 — 'a link that was never issued confirms nothing' — is labeled
**BOUND** by the live proof, but none of proof checks (a)–(d) ever attempts a never-issued
link, so nothing in the named evidence measures the negative."
Both are right: mirror 2's BOUND label cited evidence that measured only the positive half, and
the step-2 criterion's "(a)–(d)" wording carried the same overstatement into this plan. Seat
A's proposed instrument is adopted — a mutated issued link is a token GoTrue never issued, and
following it asserts nothing about expiry, single use or resend (retired AT-001.11 stays
untouched). The fix: new proof check (b2) follows a tampered variant of the emailed link BEFORE
the real one and requires `email_confirmed_at` still NULL; mirror 2's header entry cites (b2);
step 2's criterion is amended (see section 3). The record was false as written and is corrected
in the open, not thinned. Interpretation ruled after the build, upheld: (b2) skips only when NO
link exists at all; when only the operator-minted fallback yields one, it runs against a
tampered variant of that link with a note naming the source, because a mutated operator-minted
token is equally a token GoTrue never issued. On the real run the link was emailed, so the
question was moot.

**[A1] — ACCEPT.** Seat A (medium): "The malformed-caller selftest checks only `ok` and never
verifies that those refusals name email verification as the remedy."
Verified: `shipped-verification.selftest.ts` lines 96–114 assert only `.ok`. Today the module
has ONE refusal literal covering every non-allow path, so the promise holds — but its oracle
does not reach the malformed-caller paths, and a later split of the refusal paths would keep
this selftest green while breaking the module header's all-refusals promise. Fix: assert
`/verif/i` and `/email/i` on the reason of every malformed-caller refusal in that test.

**[A3] — ACCEPT.** Seat A (high): "Check (c) treats any HTTP status of 400 or greater as the
expected pre-confirmation refusal and does not assert a confirmation-specific response."
Verified: `ngoTrip.signInBefore.status >= 400` — a 429 or a 500 would record as PASS while
confirmation enforced nothing. Fix: (c) passes only on a 4xx (never 5xx, never 429) whose body
names the unconfirmed state — expected GoTrue error code `email_not_confirmed`, matched against
the IN-MEMORY body because the transcript redactor's `code$` pattern blanks `error_code`; the
note surfaces the discriminator through a safe extraction (an enum value, not a credential).
If the live text differs, the check FAILS, the verbatim capture shows the real discriminator,
and the executor pins that exact discriminator and re-runs — measurement, not assumption. The
same tightening applies to the volunteer's pre-confirmation sign-in inside (e).

**[A4] — ACCEPT.** Seat A (high): "Check (e) never requires the volunteer round trip to use an
emailed verification link, despite claiming it repeats check (b)."
Verified: (e)'s conjunction never reads `volunteerTrip.linkSource`, so the admin-generated
fallback could pass (e) while the claim "repeats (a)–(d)" silently narrowed. The NGO half
cannot do this — (b) fails with a NARROWED note on the fallback — so the volunteer half gets
the same teeth: (e) requires `volunteerTrip.linkSource === 'emailed'`.

**[A5] — ACCEPT, FIXED DIFFERENTLY, with a verification condition.** Seat A (medium): "The
stale-worktree probe accepts any non-404 response as the current `complete-signup` function."
The fact is right — the probe fails only on 404 or unreachable, and a stale mount answers 401.
The proposed remedy — a verifiable revision/source marker in the mounted artifact — buys
revision-binding that (e)'s evidence does not depend on: this branch changes nothing under
`supabase/functions/` except the NEW `_shared/verification.ts`, which `complete-signup` does
not import, so any live `complete-signup` is byte-for-byte the code this branch carries.
**VERIFY FIRST, before relying on that:** the executor confirms with
`git diff main...HEAD --stat -- supabase/functions/` and by reading `complete-signup`'s
imports. If the condition fails, this ruling's fixed-differently route is VOID — stop and
report, and the full revision-binding remedy applies. If it holds: the probe's comment states
the revision-independence argument, and `stack-up.txt` records the `functions serve` launch
(command and cwd) as the operator-side binding of the mount to this worktree.

**[A6] + [B2] — CONVERGENT. ACCEPT, at seat A's severity (high).**
Seat A: "The redirect redactor strips only URL fragments and logs credential-bearing query
parameters unchanged."
Seat B: "The header promises 'NO KEY IS WRITTEN INTO THIS FILE AND NONE IS PRINTED BY IT', but
the followed redirect's `location` is printed after only fragment-stripping
(`withoutFragment`), and `redact()` returns non-object values — including non-JSON response
bodies — verbatim."
Both right, and seat B widens the surface to raw string bodies. One fix, three parts: (i) every
query-parameter VALUE in a printed location header is redacted, names kept — a token-hash or
`?code=` redirect can no longer land in a transcript; (ii) `redact()` scrubs strings too —
JWT-shaped substrings (`eyJ…`) and `name=value` pairs whose name matches the SENSITIVE pattern
are replaced; (iii) the transcript is INSPECTED for credential residue before it is committed —
the run this sitting performs is that inspection.

**[A7] — ACCEPT.** Seat A (medium): "The updated fixture header falsely says `verification.ts`
is imported by edge functions and that every accept/refusal below comes from shipped modules."
Verified: no deployed function imports `verification.ts` — that is decision D-D's own point —
and `sendDiscoveryMessage`'s no-completed-account refusal is fixture bookkeeping, not a shipped
judgement. This diff rewrote that header paragraph, so the falsehood is this item's to fix.
Fix: the PROVED paragraph names `verification.ts` as the module the FUTURE Discovery route must
import — today imported only by this suite and its shape selftest — and scopes the
accept/refusal sentence to the PRODUCT judgements, naming the fixture's bookkeeping
precondition refusals as the exception.

**[A8] — ACCEPT, FIXED DIFFERENTLY.** Seat A (low): "The new mirror makes a provisioned
platform admin unconfirmed by reusing email registration, despite the repository's real
provisioning flow creating that user with `email_confirm: true`."
Premise verified in the tree: the predecessor's proof script provisions the admin through
`POST /auth/v1/admin/users` with `email_confirm: true` — the only provisioning recipe this
repository records — so the fixture's admin starting unconfirmed contradicts the repository's
own record, and the header note presents that state as natural rather than as contradicted.
The proposed remedy — a live admin-creation check in step 5 — buys a live measurement for a
state NOTHING reads; disproportionate. Fixed differently: `provisionPlatformAdmin` marks its
auth user confirmed at provisioning and mints no verification link (admin creation sends no
email); the header's "ONE CONSEQUENCE" paragraph now says the provisioned admin starts
CONFIRMED, mirroring the recorded recipe, that nothing reads this state, and that it is
live-bound by the first item that reads an admin's verified state. The runtime half stays
honestly unbound: the predecessor's transcript ran with confirmations OFF, so it does not
measure the column under the flip — which is why the mirror is labeled by its recipe, never
called live-bound.

**[A9] — ACCEPT.** Seat A (low): "The PR body still says the branch is in the plan phase and
that code comes after plan review, although this commit contains the draft implementation under
code review."
True — `pr-body.md`'s own text promised "This body will be brought up to date as the item
moves" and was not. Fix: the status paragraph states the current truth (draft built, dual code
review ruled, fixes applied, read-only audit and CI ahead of merge); a mechanical syncs the
GitHub pull-request body from the file, as handed, after the close push.

**[B3] — ACCEPT.** Seat B (low): "The rewritten header says 'The other four are section C's',
but AT-001.38 (wrong-password rejection) sits in **section B** of the acceptance file
(`at-req-001.md` line 23, under '## B. Email verification'); only .12/.13/.14 are section C's."
Verified against the acceptance file — exactly as claimed. One-clause fix in the b-file
header: the other four belong to the session-and-reset leaf (D2.L2), three of them section
C's, the wrong-password id section B's.

**Removal check:** no ruling removes work. [A5]'s fixed-differently declines a proposed
ADDITION and carries its verification condition above. Nothing contradicts ratified text and
nothing grows scope; there is no founder question.

**Post-goal record notes (sitting 3).** [A5]'s verify-first condition HELD: the only change
under `supabase/functions/` is the new `_shared/verification.ts`, and `complete-signup` does
not import it — measured by the executor before any fix. Section 1's deferred rate-limit
question is ANSWERED by measurement: the CLI did not push `email_sent = 2` into the auth
container (the container carried `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000`, recorded in
`stack-up.txt` beside the reading), so the file's cap did not bind the run; check (f) passed
honestly and the D-B relief valve did not fire. The proof script's rate-limit comment was
amended in the open so no stated fact contradicts that measurement. Executor invocations this
sitting: two of the permitted three (the goal, reached on its first attempt; the one-comment
truth amendment).
