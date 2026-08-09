# AI4DEV-58 (GitHub sign-in, mandatory GitHub link) — PLAN

**Sitting 1 of the item: PLAN. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).**

**AMENDED in sitting 2 (DRAFT, same definition, same model) per the gate-1 rulings at
`loop/items/AI4DEV-58/gate1-rulings.md` — this amended text is what gets built.** The amendments:
D-C gains the abandoned-flow analysis and step 5's AT-001.05 oracle a pre-completion negative
(ruling F1); D-E's array constraint becomes `cardinality(...) >= 1` and the function raises on an
empty array, verified empirically in step 6(d) (ruling F2); D-E's identity check binds the handle
and step 6(d) gains the mismatched-handle negative (ruling F4); D-I retains the provider comment
and updates only its stale clause (ruling F5); section 5 records the filed unlink question
(ruling F3).

**AMENDED AGAIN in sitting 3 (FIX AND GOAL, same definition, same model) per the gate-2 rulings
at `loop/items/AI4DEV-58/gate2-rulings.md`.** The amendments: D-E's emptiness checks become
whitespace-aware and element-wise — the scalar CHECKs refuse whitespace-only values, the array
CHECK refuses NULL and blank elements via a small immutable helper, and the function-body
mirrors both (rulings R1/R6); D-E's recreated function gives the four new parameters
`default null` and D-F's edge call omits the github keys when the judged handle is null — the
deployment-compatibility bridge (ruling R4); D-E's privilege posture gains an explicit
`revoke all` on `public.volunteer_profiles` from the three Data API roles, because Supabase's
default privileges granted TRUNCATE/TRIGGER/REFERENCES the "no grant" comment believed absent
(ruling R5); the fixture derives the caller fact through the shipped `extractGithubHandle` over
a mirrored `identities[]` shape (ruling R3); step 6(d)'s probe list is extended accordingly;
section 4 states that statistics provenance is not database-enforced (ruling R2, risk accepted);
risk 2 is rewritten honestly (ruling R4); the stale live-proof citations in the fixture header
and `edge.ts` are repointed at this item's transcript once step 6 produces it (ruling R7).

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

**The abandoned flow, stated so no reader mistakes it for a violation (gate-1 ruling F1):** if a
link succeeds in Auth and the completion request never arrives — browser closed, request failed —
then **no account row, no profile surface and no acknowledgment exist**. That is an unfinished
signup, not a completed link whose import went missing: AT-001.05's Then requires population "on
the profile", and there is no profile to be unpopulated. AT-001.04's own text — "linking
completes signup" — makes the link and the completion the same moment of the signup flow; the
wiring leaf's `--wired` re-run of .04 drives exactly that screen transition. When the user
returns and completes, the import fires then, populated, in the same transaction.

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
  timestamptz not null default now()`; CHECK constraints refusing the empty forms — the
  criterion's "queued-but-empty fails" as a shape, not a convention. **`cardinality`, not
  `array_length` (gate-1 ruling F2): `array_length('{}'::text[], 1)` is NULL — an empty array has
  no dimensions — and a CHECK whose expression is NULL passes, so the originally planned
  constraint enforced nothing on the one input it exists to refuse. `cardinality` returns 0 for
  the empty array, never NULL. Step 6(d) confirms the refusal empirically on the migrated
  database.** **Strengthened by gate-2 rulings R1/R6, because slot-counting and space-only
  trimming accept semantically empty data (`ARRAY[NULL]`, `ARRAY['']`, a tab-only summary):
  the scalar CHECKs are whitespace-aware (`github_handle !~ '^\s*$'`,
  `contribution_summary !~ '^\s*$'`), and the languages CHECK requires `cardinality >= 1` AND
  every element non-NULL and non-blank, via a small IMMUTABLE helper function (a CHECK
  expression cannot hold a subquery; the helper references only `pg_catalog` names so it is safe
  under `search_path = ''`, and its EXECUTE is revoked from PUBLIC). `repository_count >= 0`
  unchanged.** RLS enabled, **no policies** (same
  posture as the four existing tables; read paths are later leaves' work). **Privilege posture
  (gate-2 ruling R5): explicit `revoke all on table public.volunteer_profiles from anon,
  authenticated, service_role` — Supabase's default privileges grant on new tables, and the
  committed replay capture measured TRUNCATE/TRIGGER/REFERENCES for all three roles; the
  re-capture must show zero privilege rows for them.**
- **`public.complete_signup` is DROPPED and recreated** with four added parameters
  (`p_github_handle text, p_github_top_languages text[], p_github_repository_count integer,
  p_github_contribution_summary text`), **each `default null` (gate-2 ruling R4): a call carrying
  only the original five named arguments still resolves — the deployment-compatibility bridge —
  and there is still exactly one function, so the drop-first reasoning stands**. Dropping first
  is load-bearing: CREATE with a new
  signature would OVERLOAD, and PostgREST refuses an ambiguous rpc name. The recreated function
  keeps every existing behaviour and refusal byte-comparable, and adds: for a volunteer — all
  four github parameters required **and non-empty (`cardinality(p_github_top_languages) >= 1`
  raises in the function body too, so a caller gets a stated reason rather than a bare
  constraint violation — gate-1 ruling F2; per gate-2 rulings R1/R6 the body checks are also
  element-wise and whitespace-aware, matching the constraints: NULL or blank language elements,
  and whitespace-only handle or summary, raise with stated reasons)**, **and a defence-in-depth check that a row
  exists in `auth.identities` with `provider = 'github'` for `p_account_id` AND
  `identity_data->>'user_name' = p_github_handle`** (the guard that
  holds even against a service-role caller bypassing the edge function, same shape and same
  reason as the `platform_admin` refusal; **the handle binding is gate-1 ruling F4 — existence
  alone would let a service-role caller commit a profile under a handle the account never
  linked**); then the profile insert joins the transaction. For an
  NGO — all four github parameters must be null (raise otherwise; the mirror of the
  organisation-name rule). Privilege posture identical: revoke from PUBLIC, grant EXECUTE to
  service_role, `security definer set search_path = ''`.

### D-F — The edge function change is small and decides nothing new
`resolveCaller` gains `githubHandle` (extracted by the shared module from the same
`/auth/v1/user` response it already fetches — the one-line extension its comment reserves).
`complete-signup/index.ts` passes `{ githubHandle: caller.githubHandle }` into
`validateCompleteSignup` and, when the judged value carries a handle, computes
`stubGithubStatsFor(handle)` and passes handle + stats to the rpc. **When the judged handle is
null (an NGO — an unlinked volunteer never reaches the rpc), the four github keys are OMITTED
from the rpc body entirely (gate-2 ruling R4): with the function's `default null` parameters,
an NGO completion then carries the original five keys and works against either schema version,
so neither rollout order can break NGO signup.** No new edge function:
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
`_fixture.ts`: `AuthUser` gains `githubHandle: string | null`; `completeSignup` **constructs the
canonical GoTrue `/auth/v1/user` shape from stored state (`identities[]` with
`identity_data.user_name`, empty when nothing is linked) and derives the caller fact through the
shipped `extractGithubHandle` — gate-2 ruling R3: the extractor is one of the shipped decisions
the suite claims to prove, so it must sit on the tested path exactly as it does in
`resolveCaller`** — then passes that fact into the shipped validator and, on a volunteer
success, writes the profile row from `stubGithubStatsFor` **inside the same all-or-nothing
write block**. Storage only; every judgement stays the shipped module's.

### D-H — Surface marks: AT-001.02 `ui`, AT-001.04 `ui`, AT-001.05 backend
.02 (the GitHub signup path) and .04 (the blocked completion and the link that unblocks it) are
signup-SCREEN flows the wiring leaf must re-run `--wired`; .05's observable is profile data — a
backend consequence, not one of the four named auth screens. Same reasoning that put `ui` on
.01/.03/.07 and left .06 backend.

### D-I — Existing green tests are amended because the gate changes their preconditions, and the amendment must not weaken them
AT-001.03's Google-volunteer half and AT-001.06's volunteer actor currently complete signup with
no GitHub identity — exactly what this item makes impossible. Each gains one
`linkGithubIdentity` call before its completion. **Their assertions do not change**; their
meaning (Google-vs-email equivalence; the NGO-only refusal) is untouched.

**Comment handling, corrected by gate-1 ruling F5 — two different cases, not one:**
- **RETAINED as true:** the load-bearing comment at `a-signup-and-signin.test.ts` lines 151–163
  ("the shipped path ignores the provider BECAUSE IT NEVER RECEIVES ONE"). D-B adds a fact about
  linked identities, not the session's establishing provider; the decision path still cannot
  branch on email-vs-Google, which is exactly why AT-001.03's equivalence claim stays narrow.
  Only its one stale mechanical clause — "the adapter's `completeSignup` passes only
  `session.accountId`" — is updated to name the caller fact, plus one added sentence: a
  linked-GitHub fact is not the session provider, and the equivalence claim stays exactly as
  narrow as before.
- **CORRECTED as false:** the file-header sentence "the other three belong to the GitHub leaf",
  the `notLanded` stubs, and any comment stating the volunteer branch is ungated — after this
  item those are false statements of fact, which is the audit's first box.

`LEAF.D1_L2` in `_pending.ts` loses its last users and is removed (the orphan rule).

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
**After the gate-2 migration edits, this step's replay and capture are RE-RUN and the capture
extended: the helper function's row and ACL, the new constraint definitions, the four
`default null` parameters visible in the signature, and the table-privilege matrix for ALL five
public tables (volunteer_profiles must show zero rows for anon/authenticated/service_role; the
other four are measured for the scope note in ruling R5, not fixed here).**

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
    **Pre-completion negative (gate-1 ruling F1): after `linkGithubIdentity` and BEFORE
    completion, `volunteerProfile(accountId)` is null — population is CAUSED by completion, and
    nothing sits queued.**
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
  row but null stats parameters raises; **with an identities row but EMPTY `'{}'::text[]`
  languages raises — the empirical check of ruling F2's NULL-semantics claim on the migrated
  database; and with an identities row carrying handle X but `p_github_handle` Y and non-empty
  stats raises — ruling F4's mismatched-handle negative;**
  **(d2, gate-2 rulings R1/R6) the semantically-empty forms are refused: through the function
  with a valid linked identity, a tab-only contribution summary raises with the stated reason;
  and as operator (psql direct INSERT into `public.volunteer_profiles`), `ARRAY[NULL]::text[]`,
  `ARRAY['']`, `ARRAY['  ']` languages, a tab-only summary and a tab-only handle are each
  refused by the named CHECK constraint;**
  **(d3, gate-2 ruling R4) the compatibility bridge holds: an NGO completion called through
  PostgREST rpc with ONLY the original five named arguments succeeds — the old-caller shape
  proven against the new schema;**
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
step-6 transcript, one machine, not reproducible by a reviewer. **Also not claimed (gate-2
ruling R2, risk accepted): that the database authenticates the PROVENANCE of imported
statistics. It enforces their shape and the identity binding; a caller holding the service-role
key — the deployment's own authority — can commit any shape-valid statistics for a correctly
linked handle, and no design keeping one implementation of the stub could prevent that.**

## 5. Seen, deliberately not touched
- **Post-signup unlinking (gate-1 ruling F3, FILED):** `enable_manual_linking = true` also opens
  Auth's unlink surface, and a Google+GitHub volunteer could unlink GitHub after signup. No
  acceptance id in AT-REQ-001 addresses post-signup identity lifecycle, and AT-001.08's
  retirement says the PRD deliberately defines no linking policy — so guarding it here would be
  shipped behaviour no ratified text asks for. The product question goes up through
  PHASE-STATE.md for the coordinator to file. Nothing this item ships calls unlink; an unlink
  would remove the return-visit sign-in path while the imported profile row persists.
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
2. **The DROP of `complete_signup` breaks a deployed caller during a mixed-plane rollout** —
   REWRITTEN by gate-2 ruling R4, because the original text ("it cannot") mistook source
   co-location for deployment atomicity. The truth: the drop+recreate is one migration and one
   transaction on the DATABASE plane, but the edge-function plane deploys separately, and during
   a mixed window volunteer completion is unavailable in either order. The bridge (four
   `default null` parameters; the edge omits null github keys) keeps NGO completion working
   through BOTH orders and makes the volunteer window fail closed with a stated reason under
   migration-first. Volunteer completion requires both planes at the new version — inherent to a
   feature spanning both planes. Today no hosted deployment exists and the local stack deploys
   both planes together, so the window is currently unrealisable; the bridge is for the first
   real deployment, which will replay this migration.
3. **GoTrue's github `identity_data` field is not `user_name`** when a real OAuth app arrives.
   Two readers of that field now exist (gate-1 ruling F4): `extractGithubHandle` and the
   handle-binding check inside `public.complete_signup`. The leaf that first drives a real
   handshake changes the extractor in place and recreates the function in a follow-up migration
   — a two-place change, named here so it is not discovered as a surprise.
4. **`enable_manual_linking = true` changes some default behaviour the existing four green tests
   feel.** Implausible (it gates an API surface nothing here calls), and step 7 re-runs the whole
   surface either way.
5. **The three new bodies cannot be written without simulating a handshake.** Same rule as the
   predecessor's F2: stop and report rather than manufacture a provider oracle. The fixture
   records post-round-trip STATE only.
