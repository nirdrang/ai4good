# AI4DEV-57 (email + Google signup, three account types) — PLAN

**Sitting 1 of the item: PLAN. Ruled by `orchestrator-opus` (Opus 5, effort max) because fable is
out of credit.** That is a different agent TYPE, not a model override on the fable definition. Read
every decision below as an opus ruling; a successor sitting that finds itself running as fable
should say so in its first line rather than assume continuity.

> **AMENDED BY SITTING 2 (DRAFT), also `orchestrator-opus`, after the plan review.** sol raised 9
> findings; 6 were accepted outright and 3 accepted with a different remedy, none rejected. The
> rulings — each with the reviewer's claim quoted — are in
> `loop/items/AI4DEV-57/gate1-rulings.md`, beside the raw output and the distillate. **This file is
> what gets built; there is no second plan.** The amendments are folded into the decisions and steps
> below and each is tagged `[F<n>]` so an auditor can trace it to its ruling. Two findings changed
> what gets built: a second edge function (F4) and a transactional database function (F5).
>
> **The founder answered the headline question: the signup screens stay out of this leaf, follow the
> manifest.** D1 is confirmed, not merely proposed.

**Chain, derived from the branch** (`nirdrang/ai4dev-57-email-and-google-signup-and-the-three-account-types-d1l1`):
AI4DEV-57 (email + Google signup, three account types) → parent AI4DEV-51 (accounts and sign-in
container) → AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the authentication requirement). No
`attr:` label on any of them; the root sits under a real requirement, so this is product work with
an evidence gate above it — not foundation work.

**Manifest:** `loop/decomp/req-001.md`, deliverable D1 leaf L1, revision `0579425`.
**Acceptance ids this leaf owns:** AT-001.01, AT-001.03, AT-001.06, AT-001.07.
**Acceptance text (read-only for this item):** `.taskmaster/docs/acceptance/at-req-001.md`.

---

## 1. What I verified in the tree before deciding anything

The spawn prompt's context was a hint to verify. All of it checked out, and two further facts
change the item's shape.

| claim | verdict | evidence |
|---|---|---|
| This is the first product code | **true** | `supabase/migrations/` holds only `.gitkeep` and `README.md`; there is no `supabase/functions/` directory; `src/` is the untouched Lovable shadcn scaffold plus a one-line `index.tsx`; nothing in `src/` references Supabase |
| Docker answers | **true** | `docker info` reports Desktop 4.84.0, engine 29.6.2, 12 containers running |
| The local Supabase stack comes up | **UNPROVEN** | `bunx supabase --version` → `2.110.0`; `supabase start` has never been run here. Step 1 below proves it or the plan changes |
| The only acceptance suite is req-016 | **true** | `tests/at/suites/` contains `req-016` only; grepping `tests/` for `req-001`, `AT-001` returns nothing |

### Finding A — the acceptance harness is per-REQUIREMENT, not per-leaf

`tests/at/harness/check.ts` `bijectionProblems()` refuses a run when any expected id has no
registered call site (`if (missing.length) problems.push(...)`), and `runner.ts` turns any problem
into exit 2 with **nothing graded**. The expected set is every `AT-001.NN (P0)` in the acceptance
file — **all 37**. CI runs `at:check` for every directory under `tests/at/suites/` and
`at:verify --tier loop --expect` for every `tests/at/expected/req-*.json`.

So the moment `tests/at/suites/req-001/` exists, all 37 P0 ids must have executable call sites.
There is no partial suite. This leaf owns 4 of the 37.

### Finding B — integration tier cannot go green for anybody today

`registry.ts` asserts `stubbedCapabilities()` is empty above the loop tier, and
`tests/at/harness/index.ts` builds `fixtures.worlds`, `clock.controlled` and every `sut.<key>` via
`adapterDerivedCapability()`, which returns `stand-in` **unconditionally**. Every integration run
therefore fails every test with a plain `AssertionError`, which `--expect` has no shape to declare.
Reaching integration green needs real-provenance routes in `tests/at/harness/capabilities.ts` —
harness work, a different item. CI never runs above loop tier and has no database at all.

The manifest anticipated this: *"The harness is a W0 bring-up item; the exact command is pinned at
pull as part of the manifest revision."* **I pin this leaf's verify command as
`bun run at:verify req-001 --tier loop --expect`.** The requirement's own done contract
(integration tier) is unchanged and remains AI4PM-19's gate, not this leaf's.

### Finding C — one pull request may not touch both `src/` and `supabase/`

`.github/workflows/ci.yml` fails any pull request whose files match both `^src/` and
`^(supabase|tests|loop|\.claude|\.github)/`, printing *"split it into two pull requests"*. It also
counts a file **moved** across the line.

---

## 2. Decisions

### D1 — No `src/` changes. The screens are a different leaf — **confirmed by the founder**

The spawn prompt asked for "Lovable-driven UI work for the three account types and signup flows".
The manifest disagrees, and the manifest is the source of truth: deliverable D2 carries a leaf
**LW — "wire the auth screens (signup, sign-in, verification, reset) from fixtures to edge
functions · verify: wired re-run of D1/D2 ui-tagged P0s (no new AT ids)"**. The screens are named
work, assigned elsewhere, re-running these same ids rather than adding new ones.

Three independent reasons converge:

1. The manifest assigns the screens to D2.LW.
2. Finding C makes `src/` + `supabase/` in one pull request a hard CI failure, and this item's
   branch is one branch.
3. The screen **driver** that would prove a screen does not exist. **[corrected in sitting 2]** The
   earlier wording here said the `--wired` flag itself is unimplemented; that was wrong. The flag is
   parsed and implemented — `runner.ts` line 970 returns **3** with *"the screen driver does not
   exist yet … that driver is a later AI4DEV-3 slice"*. The conclusion is unchanged: UI built now
   could be verified by nothing.

Additionally `design/ui-way-of-work.md` has Lovable build against a fixture seam at `src/lib/data.ts`
backed by `src/fixtures/` — **neither file exists**. Building screens now would mean inventing that
seam too.

**This was a scope reduction against what the conductor was told, so it was stated loudly rather
than quietly, and raised as the item's headline open question. The founder answered before any code
was written: the screens stay out of this leaf, follow the manifest.** D1 now stands on a founder
ruling as well as on the three reasons above.

### D2 — Server logic goes in `supabase/functions/`, an edge function. Two documents disagree and I am ruling

`CLAUDE.md` and `AGENTS.md`: *"UI code must always go through an edge function — never call the
database directly from UI code."* But `src/lib/api/example.functions.ts` says: *"Use this pattern
instead of Supabase Edge Functions for server logic"* (TanStack `createServerFn`).

**Ruling: edge function.** The deciding argument is not seniority of document, it is the territory
guard — `createServerFn` lives in `src/`, which is Lovable's territory and which this item may not
touch at all (D1). Server logic authored here has exactly one legal home, and CLAUDE.md names it.
The `createServerFn` comment is the Lovable template describing Lovable's own half.

The contradiction is real, it is not this item's to fix, and it will bite the screen-wiring leaf
squarely. Recorded in `PHASE-STATE.md` for the conductor to relay; no document is edited here.

### D3 — Create the full req-001 suite: 37 call sites, 4 real, 33 declared pending

Finding A leaves three options. Writing no suite means the item's four named acceptance ids get no
executable form and the merge green would claim nothing about the item's subject — the precise
"unearned green" a reviewer should object to. Writing all 37 for real means implementing the entire
requirement. The third is the one the harness was built for:

- All 37 ids get an `atTest` call site, satisfying the bijection preflight.
- The 4 ids this leaf owns run against a real adapter and go **green**.
- The other 33 have a one-statement body that throws `AtPending`, and are declared **red** in
  `tests/at/expected/req-001.json` as `{"kind":"pending","phase":"sut-missing"}`.

**This mechanism is verified, not assumed.** `registry.ts`'s `AtPending` constructor builds the
message `` `${atId} PENDING [${phase}] — ${detail}` `` and sets `name = 'AtPending'`;
`expected.ts` declares a `pending` red as the anchored prefix `` `AtPending: ${atId} PENDING
[${phase}] — ` `` — an exact match. And `executeRegisteredBody()` runs `await body(ctx)` **before**
checking `testUseProblem`, so a body that throws never trips the "never opened a fixture world"
guard. Both read directly in the tree this sitting.

`expected/req-001.json` then becomes the requirement's live progress ledger: every later leaf flips
its own ids from red to green, and CI enforces the ledger from this item onward. The 33 stubs are
not waste — the bijection cost is paid once by whichever leaf creates the suite, and deferring it
moves it onto a leaf that also has its own work.

Each stub's detail text **must name the manifest leaf that will land it** (e.g. *"REQ-001 D3.L1
(per-NGO roles) has not landed"*). The phase word `sut-missing` is only honest if the detail says
which system-under-test is missing.

### D4 — The decision logic is shared code, so the loop-tier green tests the product and not a puppet

`adapterDerivedCapability()` stamps every `sut.<key>` a stand-in, so a suite whose adapter
reimplements the requirement proves the *test* is well-formed and nothing about the shipped code.
That is how `tests/at/suites/req-016/_fixture.ts` works, and it is weak.

Instead: the four pure decisions live in **`supabase/functions/_shared/accounts.ts`**, imported by
both the edge function and the acceptance adapter.

1. `parseAccountType(raw)` → `ngo | volunteer`, or a refusal naming why. `platform_admin` is never
   producible from the public path.
2. `validateCompleteSignup(request)` → account type valid; organisation name present and non-empty
   for `ngo` and absent for `volunteer`; acknowledgment text version present.
   **[F1] The volunteer branch deliberately has no GitHub-identity condition, and carries a comment
   saying so** — naming AT-001.04 and manifest leaf D1.L2 as what adds it. Do not add the gate:
   AT-001.04 is that leaf's id (`AT-001.02,04,05 · blocked-by: L1`) and is declared red here, and
   gating now would make this leaf's own AT-001.06 unproducible, since that test needs an existing
   volunteer account and GitHub OAuth is L2's work. Add no unused parameter in anticipation either.
3. `ngoOnlyActionAllowed(accountType)` → allowed, or a refusal reason (AT-001.06).
4. `PUBLIC_SIGNUP_ACCOUNT_TYPES` → exactly `['ngo','volunteer']` (AT-001.07).

The adapter supplies storage; the shared module supplies every judgement. **Constraint: that file
has zero non-relative imports and touches no Deno global**, because `tests/at/tsconfig.json` compiles
it under `strict` with `skipLibCheck: false`, `types: ["node"]` and no DOM.

### D5 — Schema shape

Two enums: `account_type` (`ngo`, `volunteer`, `platform_admin`) and `org_role` (`admin`, `member`).

- `public.accounts` — primary key `id uuid references auth.users(id) on delete cascade`,
  `account_type` not null, `created_at`. **One row per auth user is what makes "one account holds
  exactly one global type" structural** rather than a rule someone remembers.
- `public.organizations` — `id`, `name`, `created_at`.
- `public.org_memberships` — `(org_id, account_id)` primary key, `role org_role` not null.
- `public.acknowledgments` — `account_id`, `kind`, `acknowledged_at`, `ip inet`, `text_version`.
  **Exactly the three fields AT-001.01 names.** Name / title / authority attestation is AT-001.19,
  deliverable D4 — adding those columns now would be speculation.
- `public.has_platform_acknowledgment(account_id) returns boolean` — AT-001.01 says the
  acknowledgment is required *"before any project creation is possible"*, and no projects table
  exists. The predicate is the observable form of that clause; the future project path calls it.
  **[F3] It must DISCRIMINATE, and the test proves that**: false for an authenticated user who has
  not completed signup, true after. A constant-true implementation then fails AT-001.01 instead of
  satisfying it. What this leaf cannot do is enforce the clause — nothing in the tree creates a
  project, and building project creation belongs to another requirement entirely. Section 4 says so
  in those words rather than letting the predicate's existence imply otherwise.

- **[F5] `public.complete_signup(…)` — the one transactional write path.** The plan promised four
  writes "in one transaction" and had arranged no transaction: separate Data API calls are separate
  transactions, so a partial failure could leave an account with no organisation, membership or
  acknowledgment. This function performs all four writes and the edge function calls it once — one
  round trip, one implicit transaction, all four rows or none. Step 7 proves it by forcing a
  completion that fails partway and showing no partial state survives.
  **It re-checks the account type itself and raises on `platform_admin` [F6].** That is the one
  place the database repeats a decision the shared module already makes, and it is deliberate: see
  below.

**No trigger on `auth.users`.** The account row is created by the edge function. A user who
authenticated but never completed signup is a real and honest state — it is literally what
AT-001.04 (deliverable D1 leaf L2) tests for. A trigger here would be a footgun whose failure mode
is a 500 inside Supabase Auth.

**Row-level security is enabled on every new table, and only the policies these four tests need are
added.** Everything else stays denied, which is both the minimal change and the safe default. The
full tenant-isolation policy set is deliverable D5 and is not built here.

**[F6] What the missing insert policy does and does not stop — the earlier wording here was false.**
It stops the anon and authenticated key paths: a browser holding the public key cannot insert into
`accounts` at all, and step 7 proves that. It stops **nothing** on the service-role path, and the
public edge function must write with exactly that authority — so row-level security is not in the
signup path at all, and `parseAccountType` was the only thing between a request and a minted admin.
Calling it "a second, independent guard" was wrong and is withdrawn.

The second guard is now real and sits on the path that matters: **`public.complete_signup` refuses
`platform_admin` itself and raises.** It lives in the database, it is on the only write path, and it
does not depend on the edge function's TypeScript — so an omitted or regressed `parseAccountType`
still cannot reach the schema. That duplication is deliberate defence in depth against privilege
escalation, written down here so a later reader does not delete it as redundant. Step 7 calls the
function directly with `platform_admin` and proves the refusal.

### D6 — Two edge functions: one per operation. Both signup paths run through the first

`supabase/functions/complete-signup/`. The caller has already authenticated (email/password via
`auth.signUp`, or Google via OAuth redirect — neither is a database call, so the standing rule
holds). This function turns an authenticated auth user into a typed account: sets the type **once**,
and for an NGO creates the organisation, the `admin` membership and the acknowledgment row with the
request IP and text version — through the single `complete_signup` database call of D5, which is
what makes "in one transaction" true rather than merely stated.

This is why AT-001.01 and AT-001.03 are the same code path — the difference between email and
Google is upstream, in how the session was obtained. One function, one job. A second operation, a
second function; not a switch.

**[F4] `supabase/functions/create-organization/` — the NGO-only action, added because AT-001.06 had
nothing to test.** As planned, the only operation in the item was `complete-signup`, so AT-001.06
could only have called `ngoOnlyActionAllowed` directly — which proves a helper, not an application
boundary, and is exactly the puppet-testing D4 exists to prevent. AT-001.06's text names the action:
*"an NGO-only action (create an org profile / project need)"*. So an existing authenticated account
creates an organisation profile; an `ngo` account succeeds and gets its `admin` membership, a
`volunteer` is refused, with the refusal decided by `ngoOnlyActionAllowed` in the shared module so
the loop-tier test still exercises shipped logic.

Two boundaries on this: the **project-need** half of that parenthesis is not built — no project or
need table exists and creating one belongs to another requirement — and this operation carries **no
acknowledgment gate**, because AT-001.01 requires the acknowledgment before *project* creation, not
before organisation creation. Reading a gate in where the acceptance text does not put one would be
inventing a requirement.

### D7 — Google is configured and proved configured; the round trip is not proved here

`[auth.external.google]` is absent from `supabase/config.toml`. It gets added with credentials read
from the environment (`env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` / `..._SECRET`), plus
`skip_nonce_check = true`, which the template's own comment documents as *"Required for local sign
in with Google auth."* **No secret is committed**; `.env.local` is git-ignored and `.env` is
public-values-only by founder decision.

What is provable here: the stack starts with the block present and `/auth/v1/settings` reports
Google enabled. What is **not** provable here: a real Google consent round trip, which needs an
OAuth client that may not exist. That is the founder question in `PHASE-STATE.md`.

### D8 — One review slice, with a stated trigger to split

Estimated draft, **revised for the amendments**: roughly 260 lines of SQL (the D5 tables plus the
`complete_signup` function), 100 of shared logic, 200 of edge function (two of them now), 400 of
suite and adapter, 50 of declaration manifest, 20 of config. Cohesive enough for one reviewer to
hold, and still comfortably under the split trigger.
**Trigger, checkable rather than aspirational: if the draft diff exceeds 1200 changed lines outside
`loop/items/`, the draft sitting splits the code gate into two prompts — SQL plus configuration,
and TypeScript plus tests.**

### Index of the plan-review amendments — what changed, and where

Nine findings, nine rulings, in `loop/items/AI4DEV-57/gate1-rulings.md` with each claim quoted. Six
accepted outright, three accepted with a different remedy, none rejected. The executor does not need
that file to build; it needs the rows below.

| # | what it found | outcome | where it lands |
|---|---|---|---|
| F1 | volunteer signup has no GitHub gate | accept, fixed differently — **do not add the gate** | D4.2, section 4 |
| F2 | AT-001.03 / .07 green with no product-facing proof | accept — admin sign-in added; the Google clause is named unproved | steps 6, 7(g), section 4 |
| F3 | the acknowledgment predicate enforces nothing | accept, fixed differently — it must **discriminate** | D5, steps 6, 7(h) |
| F4 | AT-001.06 has no product operation to test | **accept — a second edge function is added** | D6, steps 5, 6, 7(d) |
| F5 | four writes, no transaction | **accept — one database function, all four rows or none** | D5, steps 4, 7(i) |
| F6 | the "second independent guard" was not one | accept, fixed differently — the guard moves into the database | D5, step 7(j) |
| F7 | the ui-marked selection is never committed | accept — `surface: 'ui'` on .01, .03, .07 | step 6 |
| F8 | neither tsconfig covers what the plan claimed | accept — claim corrected, Deno check recorded | steps 3, 5 |
| F9 | no oracle for the pending stub details | accept — a checkable written ledger | step 2 |

**On this file's size.** At 35KB it is past the 25KB guidance, which exists because a plan that far
over is usually carrying evidence it should cite. Judged and accepted: the growth is amendments and
done-criteria, not pasted evidence, and the reasoning behind each ruling is in the separate ruling
record rather than here. It stays one file because the executor builds from one plan.

---

## 3. Steps, each with its own done-criterion

Every artifact path below is repository-relative. Item evidence lives in `loop/items/AI4DEV-57/`.

**Step 0 — baseline the verify surface before touching anything.**
→ done: `loop/items/AI4DEV-57/baseline.txt` holds the output and exit code of `bun run typecheck`,
`bun run at:selftest`, `bun run at:check req-016`, and
`bun run at:verify req-016 --tier loop --expect`. All four exit 0. A red baseline is reported
immediately, not worked around.

**Step 1 — prove the local Supabase stack actually comes up.** This is the riskiest unknown in the
item and it comes first for that reason.
→ done: `bun run db:start` completes and `bunx supabase status -o json` reports the API on 54321 and
the database on 54322; transcript in `loop/items/AI4DEV-57/stack-up.txt`.
→ **If it does not come up after two attempts, stop and report.** Do not redesign around it: steps
4, 5 and 7 all depend on it, and the plan needs amending rather than patching.

**Step 2 — the suite skeleton, and prove the declaration mechanism before writing 37 of anything.**
Create `tests/at/suites/req-001/` with `_fixture.ts` (exporting `requirement = 'req-001'`), `_bind.ts`,
`_contract.ts`, the one-line registration in `tests/at/harness/suite-adapters.ts`, all **37** call
sites throwing `AtPending`, and `tests/at/expected/req-001.json` declaring all 37 red.
→ done: `bun run at:check req-001` reports 0 missing, 0 extra, 0 duplicated; and
`bun run at:verify req-001 --tier loop --expect` exits **0** with 37 declared reds.
→ **[F9] done also: `loop/items/AI4DEV-57/pending-ledger.txt` exists**, one line per pending id in
the form `AT-001.NN → <deliverable>.<leaf> — <detail>`, and **all 33 name a deliverable-and-leaf
that really appears in `loop/decomp/req-001.md`**, with this leaf's own four ids absent. A written
check, because `expected.ts` anchors only on the `AtPending: <id> PENDING [<phase>] — ` prefix and
ignores the detail, so a stub reading "todo" passes both commands above while the ledger says
nothing. The manifest's coverage-check line supplies the mapping. No per-stub oracle is built — that
is harness work.
→ This is the spike. If the declaration does not match, the failure is one file, not thirty-seven.

**Step 3 — the shared decision logic.** `supabase/functions/_shared/accounts.ts`, the four exports
of D4.
→ done: `bun run typecheck` exits 0 with the module imported by the acceptance adapter.
→ **[F8] Which project actually covers it, stated correctly this time.** `bun run typecheck` is
`bun tests/at/typecheck.ts` and does run `tsc -p` over both projects, but the root project's
`include` is `["src/**/*.ts", "src/**/*.tsx", "vite.config.ts", "eslint.config.js"]`, so nothing
under `supabase/` is in its program. The adapter's import pulls this module into the **tests/at**
program and that one only — which is the strict project (`skipLibCheck: false`, `types: ["node"]`,
no DOM), so D4's constraint is the one genuinely enforced. **Exactly one project covers it, not
both.** Neither tsconfig is edited to change that: the root project is Lovable's territory, and
putting Deno-targeted files into a DOM program trades one wrong answer for another.

**Step 4 — the first migration.** One timestamped file in `supabase/migrations/`, contents per D5 —
the two enums, the four tables, the acknowledgment predicate, and **[F5] the `complete_signup`
function that makes the four writes one transaction**.
→ done: `bun run db:reset` replays from empty with no error; a query listing the created enums,
tables, RLS-enabled flags, policies **and functions** is captured in
`loop/items/AI4DEV-57/migration-replay.txt`; and `supabase_migrations.schema_migrations` contains the
new file's timestamp.

**Step 5 — the two edge functions.** `supabase/functions/complete-signup/index.ts` and
**[F4] `supabase/functions/create-organization/index.ts`** per D6, each with its own
`[functions.<name>]` block in `config.toml` and `verify_jwt = true` stated explicitly rather than
inherited.
→ done: both serve locally and answer a signed-in happy-path request with 200 and the expected rows,
captured in step 7's transcript.
→ **[F8] done also: the Deno type-check question is answered rather than assumed.** Neither tsconfig
covers these entry points. If a Deno type-checker is reachable — a standalone binary, or one inside
the edge-runtime container the CLI starts — run it over both entry points and record the exact
command and its result in `verify-final.txt`. **If none is reachable, record that plainly and claim
no coverage.** Either way step 7 serves and exercises both functions, which is stronger evidence
than a type-check; what is not acceptable is leaving the reader to assume `bun run typecheck` covered
them.

**Step 6 — the four real acceptance tests.** Flip AT-001.01, .03, .06, .07 from `AtPending` stubs to
real bodies against the adapter, with the adapter delegating every judgement to the step-3 module.
Update `tests/at/expected/req-001.json` to 4 green and 33 red.
→ done: `bun run at:verify req-001 --tier loop --expect` exits 0 reporting exactly 4 passed and 33
failed; `bun run at:check req-001` still clean.
→ **Oracle strength, because a green that proves nothing is this item's worst outcome:** each of the
four asserts the *observable consequence*, never that a function was called. AT-001.01 reads back
the account type, the organisation, the membership row **with role `admin`**, and an acknowledgment
row carrying all three of timestamp, IP and text version, then signs in again with the same
credentials — **and [F3] asserts `has_platform_acknowledgment` is false before completion and true
after, so a constant-true predicate fails this test rather than passing it.** AT-001.06 drives the
`create-organization` boundary of D6, not the helper directly, and asserts the volunteer is refused
**and** that an NGO account performs the same action successfully — a rejection with no working
control proves only that the path is broken. AT-001.07 asserts a provisioned admin authenticates and
carries the type, **and** that the public signup options are exactly the two.
→ **[F2] AT-001.03 asserts only what it can honestly prove, and the adapter may not fabricate a
Google handshake.** At loop tier the only shipped logic is the shared module, so this test asserts
that a session recorded as provider `google` completes signup through the same path with the same
result as email. It must not simulate a provider round trip and read that back as proof. If the
executor cannot write this without inventing a provider oracle in the adapter, **it stops and
reports** rather than manufacturing one. What is left unproved is named in section 4 and repeated in
the merge ruling.
→ **[F7] Surface marks, which the wiring leaf depends on.** `registry.ts` defaults an omitted
surface to `backend` (`surface: opts.surface ?? 'backend'`) and `--wired` selects the ui-marked ids,
so an unmarked suite leaves D2's wiring leaf nothing to re-run — and the whole D1 scope reduction
rests on that leaf finding these tests. Pass `surface: 'ui'` on **AT-001.01, AT-001.03 and
AT-001.07** (signup, Google signup and return sign-in, and the public signup options are all auth
screens that leaf drives). **AT-001.06 stays `backend`** — an authorization boundary, not one of the
four auth screens the manifest names. The 33 pending stubs take no surface option: the leaf that
lands an id sets its surface in the same edit that writes its body.
→ done also: record in `verify-final.txt` **how the ui marking is observable from a command** — the
`at:check` output or the runtime registration line — and if it is observable from neither, say so
instead of claiming it is.

**Step 7 — the local integration proof, which is the only evidence about the real database.**
`loop/items/AI4DEV-57/proof-local.ts` run against the live stack, transcript in `proof-local.txt`.
It lives in the item record, not in `tests/`, deliberately: it is evidence-gathering, it runs once,
and it must never be mistaken for a test that guards anything.
→ done: the transcript shows **all ten** passing — (a) email/password signup produces an `ngo`
account with an organisation, an `admin` membership and an acknowledgment carrying IP and text
version; (b) signing in again with the same credentials succeeds; (c) a request asking for
`platform_admin` is refused; (d) a volunteer account is refused by the `create-organization`
function while an NGO account succeeds through it; (e) a direct client-key insert into
`public.accounts` is denied by row-level security; (f) `/auth/v1/settings` reports Google enabled.
**Four added by the plan review:**
→ (g) **[F2] a platform admin is provisioned and signs in.** Provisioned the only legal way — a
service-role write, since the public path refuses the type — then signs in with email/password
against the live stack, and the read-back shows `account_type = platform_admin`. This is AT-001.07's
first clause, and nothing in the item proved it before.
→ (h) **[F3] the acknowledgment predicate discriminates against the real database**: false for an
authenticated user who has not completed signup, true for one who has.
→ (i) **[F5] atomicity is demonstrated, not asserted.** A completion that passes validation and then
fails partway in the database leaves **no** partial state: no `accounts` row, no `organizations` row,
no membership, no acknowledgment.
→ (j) **[F6] the independent guard holds.** Calling `public.complete_signup` directly with the
service role and `platform_admin` is refused by the database — the guard that does not depend on the
edge function's TypeScript.

**Step 8 — the whole verify surface, green together.**
→ done: `bun run typecheck`, `bun run at:selftest`, `at:check` and
`at:verify --tier loop --expect` for **both** req-016 and req-001 all exit 0, captured in
`loop/items/AI4DEV-57/verify-final.txt`. req-016 unchanged from the step-0 baseline.

---

## 4. Expected verification state, per acceptance-test id

At `bun run at:verify req-001 --tier loop --expect` when this item is done:

| ids | state | declared as |
|---|---|---|
| AT-001.01, .03, .06, .07 | **green** | listed in `green` |
| the other 33 P0 ids | **red** | `{"kind":"pending","phase":"sut-missing"}`, detail naming the manifest leaf that lands each |
| any id at integration tier | **not declared** | the manifest declares the `loop` tier only, exactly as `expected/req-016.json` does |

The run's own exit code is **0** — a declaration match, not a suite pass.

### What that green claims, and what it does not

**Claims:** the four acceptance tests exist, are executable, really open a world and really assert;
and the shipped decision logic in `supabase/functions/_shared/accounts.ts` behaves as those four
acceptance tests require.

**Does not claim:** that the migration is correct, that either edge function works, that row-level
security denies what it should, that Supabase Auth is configured, or that Google sign-in works.
None of that is reachable by CI, which has no database and never runs above the loop tier. The only
evidence for that half is the step-7 transcript, produced on one machine and not reproducible by a
reviewer. **This paragraph is repeated verbatim in the merge ruling.**

### Per acceptance id: what is proved, and by what [F1 F2 F3 F4]

The plan review's sharpest finding was that two of these greens claimed more than any evidence in
the item supports. This table is the answer, and it is what the merge ruling will be checked
against. **A clause named unproved here may not be described as proved anywhere else in this item.**

| id | proved at loop tier (CI) | proved on the live stack (step 7, one machine) | **not proved by this item** |
|---|---|---|---|
| AT-001.01 | the shipped decisions produce an `ngo` account, org, `admin` membership and a three-field acknowledgment; the predicate discriminates | (a), (b), (h), (i) — including that a partial failure leaves nothing behind | **"before any project creation is possible"** — nothing in the tree creates a project. The predicate is the hook; the leaf that lands project creation must call it |
| AT-001.03 | that a session recorded as provider `google` completes signup through the same shipped path, with the same result as email | (f) — the stack reports Google enabled and the config block is well-formed | **"sign-in via Google succeeds on return visits"** — a real consent round trip needs an OAuth client, still an open founder question. **This is the weakest of the four greens and the record says so** |
| AT-001.06 | `ngoOnlyActionAllowed` refuses a volunteer and permits an NGO | (d) — through the `create-organization` boundary, with a working NGO control | the **project-need** half of the criterion's parenthesis: no project or need table exists, and building one belongs to another requirement |
| AT-001.07 | the public signup options are exactly `['ngo','volunteer']` | (g) a provisioned admin really authenticates and carries the type; (c) and (j) the public path and the database both refuse to mint one | nothing further — this id is fully covered once (g) lands |

One more deliberate gap, from the first finding: **a volunteer can complete signup in this leaf
without a GitHub identity.** That is AT-001.04's gate, it belongs to manifest leaf D1.L2, it is
declared red in this item's ledger, and adding it here would make AT-001.06 unproducible. It is a
sequencing decision, not an oversight.

---

## 5. Seen, and deliberately not touched

- **`AGENTS.md` is badly stale** — it documents `/pm-next`, `/dev-start`, `/bind` and TaskMaster,
  all deleted, and its section 5 has a corrupted table fragment at line 93. Pre-existing, unrelated
  to this branch. **Filed, not fixed.**
- **The acceptance file `.taskmaster/docs/acceptance/at-req-001.md` is read-only for this item.** It
  is the source of the 37 expected ids; changing it is a documentation change that runs through
  `/doc-sync`, not a side effect of building a leaf.
- `supabase/config.toml` sets `[auth.email] enable_confirmations = false`. Email verification is
  deliverable D2 leaf L1. Left exactly as it is.
- **`--expect` and `--wired` cannot be combined** — `runner.ts` refuses the pair as a usage error
  (exit 2, *"cannot be combined"*), verified this sitting. Irrelevant to this leaf, which never
  passes `--wired`, but D2's wiring leaf will need a different command shape than the one this leaf
  pins, and discovering that at its merge would be late.
- No new package dependency is expected. The edge functions resolve their own imports under Deno, and
  anything reaching Postgres from a test can use `Bun.SQL`, which is already available. If the
  executor finds it needs `@supabase/supabase-js`, note that `bunfig.toml` enforces a minimum
  release age — report it rather than working around it.

---

## 6. Risks that could force a mid-flight change

1. **The local stack does not start.** Step 1 fires first and stops the item rather than letting
   steps 4, 5 and 7 discover it one at a time.
2. **Adding `[auth.external.google]` with unset environment variables prevents the stack from
   starting.** Mitigation: placeholder values in `.env.local`, which is git-ignored — that proves
   the configuration is well-formed, which is all this leaf claims about Google.
3. **A stub body throwing `AtPending` reports differently than the declaration expects.** The
   mechanism is read and verified above, but step 2 proves it on the real files before 37 of
   anything is written.
4. **The `_shared` module fails the acceptance tsconfig.** Constrained in D4 to relative imports
   and no Deno globals; step 3's criterion is the typecheck itself.
5. **[F5] The edge function cannot call the transactional database function** — a permissions or
   invocation problem with `complete_signup` rather than a design one. Surfaced by step 5's happy
   path before step 7 depends on it. If it turns out the RPC shape genuinely will not work, the
   fallback is a direct transactional connection from the function, **not** four separate Data API
   writes: dropping the atomicity would silently reinstate the defect the review found. Report
   rather than quietly reverting.
6. **[F2] AT-001.03 cannot be written without simulating a provider handshake.** Step 6 says stop
   and report in that case. The failure mode to avoid is an adapter that fakes a Google round trip
   and reads its own fake back as proof — a green with nothing behind it, which is this item's worst
   outcome and the one the review was right to press on.
