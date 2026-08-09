# AI4DEV-59 (email verification, unverified-write gate) — PLAN

**Sitting 1 of the item: PLAN. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).**

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
provider registration (Google/GitHub) starts confirmed — the provider vouched for the address;
GoTrue's real serialisation of that fact is bound by step 5, not assumed here.

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
fixture, ~140 suite bodies and headers, ~15 declaration and pending bookkeeping — roughly 400.
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
fixture); the refusal reason names email verification as the remedy.

**Step 2 — contract and fixture.** The D-E extensions, judgements delegated per D-C/D-D.
→ done: `bun run typecheck` exits 0; no rule exists in the fixture that does not come from a
shipped module (the fixture's own opening-paragraph discipline).

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
  (c) sign-in BEFORE confirmation is refused, the refusal text captured verbatim — the
  auth-layer block that stands upstream of the gate on the live stack;
  (d) using the link (HTTP GET) flips `email_confirmed_at` to non-null; sign-in now succeeds;
  and the raw `/auth/v1/user` response of the signed-in user, fed to the SHIPPED
  `emailVerifiedFromUser`, returns true — the extractor bound to GoTrue's real serialisation
  (its false half is exercised at the loop tier; an unconfirmed user has no session to read
  `/auth/v1/user` with, and the transcript says so rather than dressing it up);
  (e) both email-capable types flow: a second address repeats (a)–(d); the NGO address then
  completes signup through the deployed `complete-signup` edge function AFTER confirmation —
  proving the D1 path still works under the flipped config, which is the one regression the
  flip could plausibly cause. The volunteer's completion mechanics are unchanged by this leaf
  and were proved by the predecessor's transcript; they are not re-proved here;
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
| AT-001.09 | the flow shape against the fixture's Auth mirror: both public types start email-unverified, a never-issued link flips nothing, the emailed link flips the account to verified, the type survives; the shipped `emailVerifiedFromUser` judges the rendered user shape on every read | the real substance: GoTrue issues no session at signup, the confirmation email exists and its link flips `email_confirmed_at`, sign-in is refused before and succeeds after, the shipped extractor answers true against GoTrue's real serialisation | email delivery anywhere but the local mail catcher; any screen (D2.LW's, and Lovable's territory); link expiry / single-use / resend semantics — retired AT-001.11, deliberately unasserted |
| AT-001.10 | the SHIPPED gate refuses an unverified account's Discovery send with verification named as the remedy and writes nothing, and the SAME send succeeds once verified — the discriminating pair | the auth-layer fact: an unconfirmed email/password user cannot authenticate at all, refusal text captured — on the live stack the block sits upstream of the gate | **enforcement at a deployed Discovery route — none exists.** The route is REQ-002/004's; the gate is the hook it must call, stated in the module header. No green here may be read as "Discovery messaging is gated in production" |
| AT-001.01–.07 | unchanged claims, bodies untouched | (e) re-proves the NGO email path end to end under the flipped config; everything else is the predecessors' record | unchanged from the predecessors' tables |

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
   one (email/password signup → completion). Anything else it surfaces is reported with the
   evidence, classified, and ruled — not patched silently.
5. **The two bodies cannot be written without inventing Discovery semantics.** The send
   operation carries an opaque string and nothing else; if anything richer turns out to be
   needed, stop and report — richer semantics belong to REQ-002/004.
