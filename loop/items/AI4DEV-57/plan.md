# AI4DEV-57 (email + Google signup, three account types) — PLAN

**Sitting 1 of the item: PLAN. Ruled by `orchestrator-opus` (Opus 5, effort max) because fable is
out of credit.** That is a different agent TYPE, not a model override on the fable definition. Read
every decision below as an opus ruling; a successor sitting that finds itself running as fable
should say so in its first line rather than assume continuity.

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

### D1 — No `src/` changes. The screens are a different leaf, and this is not a narrowing I invented

The spawn prompt asked for "Lovable-driven UI work for the three account types and signup flows".
The manifest disagrees, and the manifest is the source of truth: deliverable D2 carries a leaf
**LW — "wire the auth screens (signup, sign-in, verification, reset) from fixtures to edge
functions · verify: wired re-run of D1/D2 ui-tagged P0s (no new AT ids)"**. The screens are named
work, assigned elsewhere, re-running these same ids rather than adding new ones.

Three independent reasons converge:

1. The manifest assigns the screens to D2.LW.
2. Finding C makes `src/` + `supabase/` in one pull request a hard CI failure, and this item's
   branch is one branch.
3. The `--wired` runner flag that would prove a screen **is not implemented** — `runner.ts` exits 3
   with *"the screen driver does not exist yet"*. UI built now could not be verified by anything.

Additionally `design/ui-way-of-work.md` has Lovable build against a fixture seam at `src/lib/data.ts`
backed by `src/fixtures/` — **neither file exists**. Building screens now would mean inventing that
seam too.

**This is a scope reduction against what the conductor was told, so it is stated loudly rather than
quietly.** It is recorded in `PHASE-STATE.md` as the item's headline open question. If the founder
wants signup screens in this item, it becomes a second branch and a second pull request, and the
plan is amended before any code is written — not after.

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

**No trigger on `auth.users`.** The account row is created by the edge function. A user who
authenticated but never completed signup is a real and honest state — it is literally what
AT-001.04 (deliverable D1 leaf L2) tests for. A trigger here would be a footgun whose failure mode
is a 500 inside Supabase Auth.

**Row-level security is enabled on every new table, and only the policies these four tests need are
added.** Everything else stays denied, which is both the minimal change and the safe default. The
full tenant-isolation policy set is deliverable D5 and is not built here.

That posture is what makes *"platform admins are provisioned rather than self-registered"*
structural: with no insert policy on `accounts`, only the service role can create one, so the
public path physically cannot mint an admin. `parseAccountType` refusing `platform_admin` is the
second, independent guard.

### D6 — One edge function, and both signup paths run through it

`supabase/functions/complete-signup/`. The caller has already authenticated (email/password via
`auth.signUp`, or Google via OAuth redirect — neither is a database call, so the standing rule
holds). This function turns an authenticated auth user into a typed account: sets the type **once**,
and for an NGO creates the organisation, the `admin` membership and the acknowledgment row with the
request IP and text version, in one transaction.

This is why AT-001.01 and AT-001.03 are the same code path — the difference between email and
Google is upstream, in how the session was obtained. One function, one job. A second operation, a
second function; not a switch.

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

Estimated draft: roughly 200 lines of SQL, 100 of shared logic, 120 of edge function, 400 of suite
and adapter, 50 of declaration manifest, 15 of config. Cohesive enough for one reviewer to hold.
**Trigger, checkable rather than aspirational: if the draft diff exceeds 1200 changed lines outside
`loop/items/`, the draft sitting splits the code gate into two prompts — SQL plus configuration,
and TypeScript plus tests.**

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
→ This is the spike. If the declaration does not match, the failure is one file, not thirty-seven.

**Step 3 — the shared decision logic.** `supabase/functions/_shared/accounts.ts`, the four exports
of D4.
→ done: `bun run typecheck` exits 0 with the module imported by the acceptance adapter, proving it
compiles under **both** tsconfig projects. Confirm whether the root `tsconfig.json` also picks up
`supabase/**` and report which projects cover it.

**Step 4 — the first migration.** One timestamped file in `supabase/migrations/`, contents per D5.
→ done: `bun run db:reset` replays from empty with no error; a query listing the created enums,
tables, RLS-enabled flags and policies is captured in
`loop/items/AI4DEV-57/migration-replay.txt`; and `supabase_migrations.schema_migrations` contains the
new file's timestamp.

**Step 5 — the edge function.** `supabase/functions/complete-signup/index.ts` per D6, plus its
`[functions.complete-signup]` block in `config.toml` with `verify_jwt = true` stated explicitly
rather than inherited.
→ done: the function serves locally and answers a signed-in happy-path request with 200 and the
expected rows, captured in step 7's transcript.

**Step 6 — the four real acceptance tests.** Flip AT-001.01, .03, .06, .07 from `AtPending` stubs to
real bodies against the adapter, with the adapter delegating every judgement to the step-3 module.
Update `tests/at/expected/req-001.json` to 4 green and 33 red.
→ done: `bun run at:verify req-001 --tier loop --expect` exits 0 reporting exactly 4 passed and 33
failed; `bun run at:check req-001` still clean.
→ **Oracle strength, because a green that proves nothing is this item's worst outcome:** each of the
four asserts the *observable consequence*, never that a function was called. AT-001.01 reads back
the account type, the organisation, the membership row **with role `admin`**, and an acknowledgment
row carrying all three of timestamp, IP and text version, then signs in again with the same
credentials. AT-001.06 asserts the NGO-only action is refused **and** that an NGO account performs
the same action successfully — a rejection with no working control proves only that the path is
broken. AT-001.07 asserts a provisioned admin authenticates and carries the type, **and** that the
public signup options are exactly the two.

**Step 7 — the local integration proof, which is the only evidence about the real database.**
`loop/items/AI4DEV-57/proof-local.ts` run against the live stack, transcript in `proof-local.txt`.
It lives in the item record, not in `tests/`, deliberately: it is evidence-gathering, it runs once,
and it must never be mistaken for a test that guards anything.
→ done: the transcript shows all six passing — (a) email/password signup produces an `ngo` account
with an organisation, an `admin` membership and an acknowledgment carrying IP and text version;
(b) signing in again with the same credentials succeeds; (c) a request asking for `platform_admin`
is refused; (d) a volunteer account is refused the NGO-only action while an NGO account succeeds;
(e) a direct client-key insert into `public.accounts` is denied by row-level security; (f)
`/auth/v1/settings` reports Google enabled.

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

**Does not claim:** that the migration is correct, that the edge function works, that row-level
security denies what it should, that Supabase Auth is configured, or that Google sign-in works.
None of that is reachable by CI, which has no database and never runs above the loop tier. The only
evidence for that half is the step-7 transcript, produced on one machine and not reproducible by a
reviewer. **This paragraph is repeated verbatim in the merge ruling.**

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
- No new package dependency is expected. The edge function resolves its own imports under Deno, and
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
