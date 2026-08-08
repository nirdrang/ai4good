# AI4DEV-58 (GitHub sign-in, mandatory GitHub link) — PLAN

**Sitting 1 of the item: PLAN. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).**

**Chain, derived from the branch**
(`nirdrang/ai4dev-58-github-sign-in-and-the-mandatory-github-link-for-volunteers`):
AI4DEV-58 (GitHub sign-in, mandatory GitHub link) → AI4DEV-51 (accounts and sign-in container) →
AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the authentication requirement). No `attr:` label on
any of them; product work with an evidence gate above it.

**Manifest:** `loop/decomp/req-001.md`, deliverable D1 leaf L2, revision `0579425`:
*"GitHub OAuth signup; mandatory GitHub link to complete volunteer signup; link fires volunteer
GitHub onboarding with observable profile import [cross: REQ-007] · verify: AT-001.02,04,05 ·
blocked-by: L1"*. L1 is merged (pull request #47), so the blocker is cleared.
**Acceptance ids this leaf owns:** AT-001.02, AT-001.04, AT-001.05.
**Acceptance text (read-only for this item):** `.taskmaster/docs/acceptance/at-req-001.md` lines
10–13.
**Cross-contract, from the manifest header:** *"REQ-007's GitHub-onboarding import is asserted
here as observable firing only (stub import fixture until W3)."* The import SOURCE is a stub by
ratified design; the firing and the populated profile are this item's to prove.

**Verify command, pinned:** `bun run at:verify req-001 --tier loop --expect` (the predecessor's
Finding B still holds: every `sut.<key>` is stamped a stand-in, integration tier is unreachable,
CI has no database). The requirement's own done contract (integration tier) remains AI4PM-19's
gate, not this leaf's.

---

## 1. What I verified in the tree before deciding anything

| claim | verdict | evidence (pointer) |
|---|---|---|
| The three ids are declared red, pending on this leaf | true | `tests/at/expected/req-001.json` lines 8–10; stubs at `tests/at/suites/req-001/a-signup-and-signin.test.ts` lines 142, 235, 237, each `notLanded(LEAF.D1_L2)` |
| The volunteer gate was deliberately left out and reserved for this leaf | true | `supabase/functions/_shared/accounts.ts` lines 130–145 — the comment block names AT-001.04 and D1.L2 and must be REPLACED by this item, not merely contradicted |
| The edge function can learn the caller's identities | true | `resolveCaller` in `supabase/functions/_shared/edge.ts` presents the token to `/auth/v1/user`, whose response carries `identities[]`; the function currently returns only `id`, and its own comment says the leaf that needs more "adds it back in one line" |
| The signup write path is one transactional database function | true | `public.complete_signup(uuid, text, text, text, inet)` in `supabase/migrations/20260808120000_…sql` lines 133–231; SECURITY DEFINER, service role holds EXECUTE and no table INSERT anywhere |
| No GitHub vendor sim exists in the harness | true | grep `github` over `tests/at/harness/vendors.ts` → no matches; the stub source must be shipped code, not a harness sim |
| GitHub provider is not configured | true | `supabase/config.toml` has `[auth.external.google]` (lines 353–359) and no github block; `enable_manual_linking = false` at line 180 |
| One pull request may not touch both `src/` and `supabase/` | true | `.github/workflows/ci.yml` ownership guard; also the reference guard fails ANY item id the branch does not own |
| CI runs at:check + at:verify loop for every suite/manifest, typecheck, selftests | true | `.github/workflows/ci.yml` steps "Check every acceptance suite…", "Verify every declared requirement…" |

## 2. Decisions

### D-A — No `src/` changes; no screens. Confirmed precedent, not re-litigated
The manifest's wiring leaf (D2.LW) owns the auth screens and re-runs the ui-tagged ids `--wired`.
The predecessor raised exactly this question and **the founder answered it**: the screens stay out,
follow the manifest. The ownership guard independently forbids `src/` + `supabase/` in one pull
request. Nothing in this item touches `src/`.

### D-B — The gate is a caller FACT passed into the shared decision module, and it fails closed
`validateCompleteSignup` gains a second parameter: `caller: { githubHandle: string | null }` —
a fact about the authenticated user (from Auth), never a request field a client could assert.
The volunteer branch refuses completion when the handle is null, with a reason that states the
GitHub-link requirement in words AT-001.04 can match. `ValidCompleteSignup` gains
`githubHandle: string | null` (non-null for a volunteer, null for an NGO) so the edge function
passes the judged value onward rather than re-deriving it.

**Fail-closed, stated because the edge entry point has no type-checker** (measured by the
predecessor, unchanged): in an untyped call a missing second argument reads as "no linked
identity", so a call site that forgot the fact BLOCKS volunteer completions loudly rather than
waiving the gate silently. NGO completions never read the fact.

The comment block at `accounts.ts` lines 130–145 ("deliberately has no GitHub-identity
condition") is replaced in the same edit — after this item it would be a false statement of fact.

### D-C — Onboarding fires AT volunteer completion, inside the one transaction
AT-001.05 says "when the link completes, onboarding fires". On the live stack the link itself
happens inside Supabase Auth (an OAuth round trip; no webhook reaches our code), so the only
server-observable moment the mandatory link is satisfied is **the volunteer's signup completion**
— which is also the flow AT-001.04 describes: blocked, link, then completion succeeds. Ruling:
the import is performed by `complete-signup` as part of completing a volunteer signup, and the
profile row is written by `public.complete_signup` **in the same transaction as the account row**.
"Queued-but-empty" is then structurally impossible: the profile lands populated with the account,
or nothing lands. A separate link-time firing point would require an event no server code
observes, and a queue would manufacture the exact state the criterion forbids.

### D-D — The import source is SHIPPED stub code, named as such
New pure module `supabase/functions/_shared/github.ts` (same two constraints as `accounts.ts`:
relative imports only, no Deno global, no I/O — it is imported by the strict `tests/at` program
via the adapter, which is its whole type coverage):
- `extractGithubHandle(user: unknown): string | null` — judges the `/auth/v1/user` response
  shape: finds `identities[]` entry with `provider === 'github'`, reads
  `identity_data.user_name`. One extractor, used by the edge function and mirrored by nothing —
  the fixture stores handles directly.
- `stubGithubStatsFor(handle: string)` → `{ topLanguages: string[]; repositoryCount: number;
  contributionSummary: string }` — **deterministic and non-empty by construction**, header
  comment naming it the stub import fixture the manifest's cross-contract calls for, replaced
  when the volunteer-profile requirement (W3) lands the real import.
No real GitHub API call exists anywhere in this item, and no green may be described as proving
one.

### D-E — Schema: `public.volunteer_profiles` + an extended `complete_signup`
One new timestamped migration:
- `public.volunteer_profiles` — `account_id uuid primary key references public.accounts(id) on
  delete cascade`, `github_handle text not null`, `top_languages text[] not null`,
  `repository_count integer not null`, `contribution_summary text not null`, `imported_at
  timestamptz not null default now()`; CHECK constraints refusing the empty forms
  (`btrim(github_handle) <> ''`, `array_length(top_languages, 1) >= 1`,
  `repository_count >= 0`, `btrim(contribution_summary) <> ''`) — the criterion's
  "queued-but-empty fails" as a shape, not a convention. RLS enabled, **no policies** (same
  posture as the four existing tables; read paths are later leaves' work).
- **`public.complete_signup` is DROPPED and recreated** with four added parameters
  (`p_github_handle text, p_github_top_languages text[], p_github_repository_count integer,
  p_github_contribution_summary text`). Dropping first is load-bearing: CREATE with a new
  signature would OVERLOAD, and PostgREST refuses an ambiguous rpc name. The recreated function
  keeps every existing behaviour and refusal byte-comparable, and adds: for a volunteer — all
  four github parameters required (raise otherwise), **and a defence-in-depth check that a row
  exists in `auth.identities` with `provider = 'github'` for `p_account_id`** (the guard that
  holds even against a service-role caller bypassing the edge function, same shape and same
  reason as the `platform_admin` refusal); then the profile insert joins the transaction. For an
  NGO — all four github parameters must be null (raise otherwise; the mirror of the
  organisation-name rule). Privilege posture identical: revoke from PUBLIC, grant EXECUTE to
  service_role, `security definer set search_path = ''`.

### D-F — The edge function change is small and decides nothing new
`resolveCaller` gains `githubHandle` (extracted by the shared module from the same
`/auth/v1/user` response it already fetches — the one-line extension its comment reserves).
`complete-signup/index.ts` passes `{ githubHandle: caller.githubHandle }` into
`validateCompleteSignup` and, when the judged value carries a handle, computes
`stubGithubStatsFor(handle)` and passes handle + stats to the rpc. No new edge function:
linking is Auth's, the import rides completion (D-C), and `create-organization` is untouched.

### D-G — Fixture and contract: mirror Auth's post-link state, judge nothing
`tests/at/suites/req-001/_contract.ts`: `SessionProvider` gains `'github'`; new
`VolunteerProfileRow` type mirroring D-E's columns (camelCase); `AccountsSut` gains
- `registerWithGithub(email, handle): Promise<Session>` — the state Auth is in after a GitHub
  OAuth signup round trip (no handshake simulated, same posture as `registerWithProvider`),
- `linkGithubIdentity(session, handle): Promise<void>` — the state after a link round trip,
- `signInWithProvider(provider, email): Promise<SignInOutcome>` — the return visit: an existing
  user whose identity matches signs in to the SAME account,
- `volunteerProfile(accountId): Promise<VolunteerProfileRow | null>` — read-back.
`_fixture.ts`: `AuthUser` gains `githubHandle: string | null`; `completeSignup` passes the
caller fact from its stored auth user into the shipped validator and, on a volunteer success,
writes the profile row from `stubGithubStatsFor` **inside the same all-or-nothing write block**.
Storage only; every judgement stays the shipped module's.

### D-H — Surface marks: AT-001.02 `ui`, AT-001.04 `ui`, AT-001.05 backend
.02 (the GitHub signup path) and .04 (the blocked completion and the link that unblocks it) are
signup-SCREEN flows the wiring leaf must re-run `--wired`; .05's observable is profile data — a
backend consequence, not one of the four named auth screens. Same reasoning that put `ui` on
.01/.03/.07 and left .06 backend.

### D-I — Existing green tests are amended because the gate changes their preconditions, and the amendment must not weaken them
AT-001.03's Google-volunteer half and AT-001.06's volunteer actor currently complete signup with
no GitHub identity — exactly what this item makes impossible. Each gains one
`linkGithubIdentity` call before its completion. **Their assertions do not change**; their
meaning (Google-vs-email equivalence; the NGO-only refusal) is untouched. Comments in the suite
and in `_fixture.ts`/`_contract.ts` that state the pre-gate world ("the shipped path never
receives a provider", the file-header sentence "the other three belong to the GitHub leaf") are
corrected in the same edit — after this item they would be false statements of fact, which is
the audit's first box. `LEAF.D1_L2` in `_pending.ts` loses its last users and is removed
(the orphan rule).

### D-J — Config: `[auth.external.github]` added; `enable_manual_linking` flipped to true
The github block mirrors the google one: `enabled = true`, `client_id`/`secret` via
`env(SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID / _SECRET)`, no `skip_nonce_check` (nonce is an
OIDC accommodation; GitHub is plain OAuth2). `enable_manual_linking = true` under `[auth]` —
the email/Google→link-GitHub flow is Auth's `linkIdentity`, refused while the flag is false, and
this leaf's subject is exactly that link. **What this proves: the configuration is well-formed,
the stack starts, `/auth/v1/settings` reports github enabled. What it does not: any real
handshake.** Creating a GitHub OAuth app is a founder-manual step exactly like the Google client
(same ruling pattern, relayed 2026-08-08); its absence is the expected case and blocks nothing.
Measured by the predecessor and carried forward: unset `env(...)` variables do NOT stop the
stack — the literal string passes through — so a stack reporting `github: true` with no real
credential still proves only well-formedness.

### D-K — One review slice
Estimated diff outside `loop/items/`: ~150 lines SQL, ~100 shared github module, ~40 accounts,
~55 edge, ~140 contract+fixture, ~250 suite, ~10 declaration, ~15 config — roughly 800. One
slice. **Trigger unchanged from the predecessor: if the draft exceeds 1200 changed lines outside
`loop/items/`, the draft sitting splits the code gate into two prompts (SQL + configuration, and
TypeScript + tests).**

## 3. Steps, each with its own done-criterion

Item evidence lives in `loop/items/AI4DEV-58/`. Every path repository-relative.

**Step 0 — baseline.** `bun run typecheck`, `bun run at:selftest`, `bun run at:check req-001`,
`bun run at:check req-016`, `bun run at:verify req-001 --tier loop --expect`,
`bun run at:verify req-016 --tier loop --expect`.
→ done: all exit 0, transcript in `loop/items/AI4DEV-58/baseline.txt` (req-001 showing 4 green /
33 declared red). A red baseline is reported, not worked around.

**Step 1 — the live stack comes up.** `bun run db:start`; `bunx supabase status -o json` reports
the API on 54321 and the database on 54322.
→ done: transcript in `loop/items/AI4DEV-58/stack-up.txt`. Two failed attempts → stop and report.

**Step 2 — the shared decisions.** `supabase/functions/_shared/github.ts` (D-D) and the
`accounts.ts` amendment (D-B), including replacing the reserved comment block.
→ done: `bun run typecheck` exits 0 with both modules imported by the acceptance adapter; the
refusal reason for an unlinked volunteer names GitHub and the link requirement.

**Step 3 — the migration.** One new timestamped file per D-E (drop + recreate
`complete_signup`, the `volunteer_profiles` table, RLS, constraints, privilege posture).
→ done: `bun run db:reset` replays from empty with no error; a catalog query capturing the new
table, its RLS flag, its constraints, the single `complete_signup` signature (exactly one row in
`pg_proc` for that name) and its ACL lands in `loop/items/AI4DEV-58/migration-replay.txt`.

**Step 4 — the edge function.** `edge.ts` caller extension + `complete-signup/index.ts` per D-F.
→ done: serves locally; exercised end to end by step 6's transcript. `config.toml` gains the
D-J changes in this step too (stack restart required for auth config to take).

**Step 5 — the three real acceptance tests, and the two amendments.** Real bodies for
AT-001.02/.04/.05; the D-I amendments to .03/.06; contract/fixture extensions (D-G); surface
marks (D-H); `tests/at/expected/req-001.json` flips the three ids → 7 green / 30 red;
`loop/items/AI4DEV-58/pending-ledger.txt` written — one line per remaining pending id naming a
deliverable-and-leaf that appears in `loop/decomp/req-001.md`, 30 lines, this leaf's ids absent.
→ done: `bun run at:verify req-001 --tier loop --expect` exits 0 with exactly 7 passed and 30
declared red; `bun run at:check req-001` clean; no comment in any touched file still states the
GitHub ids are pending or the volunteer branch ungated.
→ **Oracle strength, per id:**
  - **AT-001.02**: register via GitHub (fixture Auth state, no handshake) → complete signup as
    volunteer → read back account type `volunteer` AND the profile row carrying the registered
    handle; then `signInWithProvider('github', …)` returns a session with the SAME `accountId`.
    A control: the github-established session must carry `provider: 'github'`.
  - **AT-001.04**: BOTH an email-established and a google-established volunteer session attempt
    completion with no linked identity → refused, reason matches the GitHub-link requirement,
    and **no partial state**: no account row, no profile row, no acknowledgment, and
    `hasPlatformAcknowledgment` false. Then `linkGithubIdentity` and the SAME completion request
    succeeds. The NGO control completes without any GitHub identity (the gate must not leak onto
    NGOs).
  - **AT-001.05**: after a linked volunteer completion, the profile is populated — handle
    asserted by value, `topLanguages` non-empty and equal to the stub's judgement for that
    handle, `repositoryCount` a non-negative number, `contributionSummary` a non-empty string —
    and the population is observable IMMEDIATELY after completion returns (no queue to drain).
    Asserting the stub's exact values is honest here because the stub IS the declared import
    fixture; the test comment must say the source is the stub, so the green cannot be read as a
    real import.

**Step 6 — the live proof.** `loop/items/AI4DEV-58/proof-local.ts` against the live stack,
transcript in `proof-local.txt`. It is evidence-gathering, run once, never a guarding test.
→ done, all of:
  (a) a volunteer completion through the deployed `complete-signup` with NO github identity is
  refused; the reason states the link requirement; no account/profile/acknowledgment row exists;
  (b) the post-link Auth state is fabricated by operator authority (a row in `auth.identities`
  with `provider = 'github'` and `identity_data.user_name` set — the columns MEASURED from the
  live schema first, not assumed); the same completion then succeeds and the profile row is
  populated with the handle and non-empty stub stats;
  (c) an NGO completion still succeeds with no github identity (control), and calling the
  database function directly with github parameters on an NGO completion raises;
  (d) the defence-in-depth holds: `public.complete_signup` called directly with the service role
  for a volunteer WITH github parameters but NO `auth.identities` row raises; with an identities
  row but null stats parameters raises;
  (e) atomicity: a volunteer completion forced to fail partway leaves no account, no profile,
  no acknowledgment row;
  (f) `/auth/v1/settings` reports github enabled; **(f2), conditional exactly like the
  predecessor's Google check**: if `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID` is set in the
  environment the stack started with, `GET /auth/v1/authorize?provider=github` answers a
  redirect to a GitHub authorize URL carrying that client id; if unset, one line says so and
  moves on — the expected case, never dressed up.

**Step 7 — the whole verify surface, green together.** The step-0 list re-run.
→ done: all exit 0 in `loop/items/AI4DEV-58/verify-final.txt`; req-016 unchanged from baseline.

## 4. Expected verification state, per acceptance-test id

At `bun run at:verify req-001 --tier loop --expect` when this item is done: **AT-001.01–.07 all
green (7), the other 30 P0 ids red as `{"kind":"pending","phase":"sut-missing"}`**, exit 0.

| id | proved at loop tier (CI) | proved on the live stack (step 6, one machine) | **not proved by this item** |
|---|---|---|---|
| AT-001.02 | the shipped decisions accept a github-established session as a volunteer completion; the profile carries the handle; a provider sign-in returns the same account — all against the FIXTURE's Auth mirror | (f) github reported enabled; (f2) only if a credential exists | **the real OAuth handshake, both signup and return visit** — consent is a human act; the GitHub OAuth app is founder-manual and may not exist yet. The fixture performs no handshake and says so |
| AT-001.04 | the shipped gate refuses an unlinked volunteer completion from BOTH email and google sessions, states the requirement, leaves no partial state; linking then completes | (a) the deployed function refuses; (b) the post-link state completes; (d) the database refuses even a caller that bypasses TypeScript; (e) atomicity | **the real `linkIdentity` round trip** — `enable_manual_linking = true` is config whose well-formedness is proved, not a flow any agent can drive |
| AT-001.05 | completion with a link populates the profile immediately — handle by value, non-empty stats equal to the stub's judgement | (b) the same, against the real schema, inside the real transaction | **any real GitHub import** — the source is the manifest's stub import fixture BY DESIGN until the volunteer-profile requirement (W3) lands the real one. No green here may ever be reported as "profile import from GitHub works" |
| AT-001.01/.03/.06/.07 | unchanged claims; .03 and .06 volunteer setups now link GitHub first, assertions untouched | not re-proved (their step-7 evidence is the predecessor item's record) | unchanged from the predecessor's table |

**What the green does and does not claim** (repeated in the merge ruling): claims — the three
tests exist, execute, open worlds and assert; the shipped decision modules
(`accounts.ts`, `github.ts`) behave as the three criteria require; the gate fails closed. Does
not claim — that the migration is correct, that the edge function works, that Auth is
configured, that any OAuth handshake or real import works. That half's only evidence is the
step-6 transcript, one machine, not reproducible by a reviewer.

## 5. Seen, deliberately not touched
- `AGENTS.md` staleness — pre-existing, filed by the predecessor, still not this item's.
- The acceptance file and the manifest — read-only here; changes go through `/doc-sync`.
- `create-organization`, the four existing tables, all existing policies — untouched.
- The predecessor's `pending-ledger.txt` and record — historical, never edited.

## 6. Risks that could force a mid-flight change
1. **The `auth.identities` fabrication fails** (unknown not-null columns, a trigger, or a
   generated column refusing the insert). Step 6(b) measures the schema first. If a legal row
   cannot be fabricated, the live proof narrows honestly — (a), (c), (d-null-stats), (e), (f)
   still stand — and the identities-existence check's live evidence is (d)'s raise; the plan is
   amended, not silently thinned.
2. **The DROP of `complete_signup` breaks the predecessor's deployed callers** — it cannot: the
   only caller is `complete-signup/index.ts`, updated in the same change; the drop+recreate is
   one migration, one transaction.
3. **GoTrue's github `identity_data` field is not `user_name`** when a real OAuth app arrives.
   Confined to `extractGithubHandle` by design; a one-line change for the leaf that first drives
   a real handshake.
4. **`enable_manual_linking = true` changes some default behaviour the existing four green tests
   feel.** Implausible (it gates an API surface nothing here calls), and step 7 re-runs the whole
   surface either way.
5. **The three new bodies cannot be written without simulating a handshake.** Same rule as the
   predecessor's F2: stop and report rather than manufacture a provider oracle. The fixture
   records post-round-trip STATE only.
