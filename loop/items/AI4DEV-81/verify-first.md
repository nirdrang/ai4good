# Verify-first record — AI4DEV-81 (per-item integration verification)

Written by the DRAFT executor. Two parts, in the order the amended plan asks for them:

- **Part A** — step 5's four VERIFY-FIRST questions (a)-(d), each with the command that answered it.
  Every one was measured against **slot 1**, on this machine, on 2026-08-11.
- **Part B** — step 1's confirmations. The plan's table is already settled; each cell marked
  "step 1 confirms" is checked here against the three proof transcripts and the deployed surfaces.
  A confirmation that CONTRADICTS the settled disposition is reported as a dispute and is NOT
  written into the table by this executor.

Everything below is one machine's word, exactly as the three proof transcripts are. Nothing here is
re-runnable by a reviewer without the same slot.

---

## Part A — step 5's verify-first questions

### (a) Does the slot's stack serve the edge functions from its mirrored `supabase/`?

**ANSWER: yes. The slot's own edge-runtime container serves them. No separate `functions serve`
process is managed per run.**

Evidence:

1. `docker ps` lists `supabase_edge_runtime_ai4good-slot-1` among slot 1's containers, beside
   `supabase_kong_ai4good-slot-1` on host port 55321.
2. A request through the slot's own gateway reaches the function:

   ```
   POST http://127.0.0.1:55321/functions/v1/complete-signup   ->  HTTP 401
   ```

   401 is the platform's `verify_jwt = true` refusal, which only a ROUTED request can receive; an
   unrouted path answers 404. `[functions.complete-signup] verify_jwt = true` is in the config the
   slot mirrors.
3. `supabase status -o json` for slot 1 reports `FUNCTIONS_URL = http://127.0.0.1:55321/functions/v1`.

This differs from the three proof transcripts, and the difference is the point: those runs served
functions with `bunx supabase functions serve` from the worktree, and AI4DEV-58's transcript records
the hazard that made necessary — a machine found serving from a worktree that had been DELETED. The
slot pool removes that hazard: `prepare()` mirrors this tree into the slot and the slot's own
edge-runtime container serves what was mirrored. The live adapter therefore manages no process.

**What is NOT yet proved by (a) and is left to the live adapter's own build:** that a request the
platform ADMITS reaches this branch's function body. The 401 above is refused before the function
runs. The live adapter's first authenticated call is what establishes that, and it is checked there.

### (b) Does the slot stack serve a mail catcher, and at which port?

**ANSWER: yes. Mailpit v1.30.2. For slot 1 it is `http://127.0.0.1:55324`, and the endpoint is
reported by the slot's OWN status rather than computed.**

Evidence — `supabase status -o json` through the repo's CLI seam (`runSupabaseCli(slotTarget(1), …)`)
reports:

```
MAILPIT_URL  = http://127.0.0.1:55324
INBUCKET_URL = http://127.0.0.1:55324
```

and the catcher answers:

```
GET http://127.0.0.1:55324/api/v1/info      -> 200 {"Version":"v1.30.2", …}
GET http://127.0.0.1:55324/api/v1/messages  -> 200 {"total":0, …,"messages":[]}
GET http://127.0.0.1:55324/api/v1/mailbox/probe -> 404   (the Inbucket shape; absent)
```

55324 is `[local_smtp] port = 54324` in this tree's `supabase/config.toml` moved by the slot
overlay's +1000-per-slot listener rule. **The live capability reads `MAILPIT_URL` off the status the
runner already proved, never the +1000 arithmetic** — the arithmetic is the pool's business and a
second copy of it here would be the two-statements-one-fact defect.

The API shape agrees with what AI4DEV-59's and AI4DEV-60's transcripts measured on the personal
stack ("mail catcher shape, measured: mailpit ... the Inbucket shape answered 404"), so the recipe
those transcripts carry transfers unchanged.

### (c) What is the accepted range for `auth.jwt_expiry`, and what value does D12 pin?

**ANSWER: the pinned CLI accepts every low value probed, and the running GoTrue honours 120 s
end to end. D12 pins `auth.jwt_expiry = 120`.**

Evidence, in two steps.

1. **Parse-time.** Slot 1's config was rewritten with each candidate and `supabase status -o json`
   was run against it through the CLI seam (a read-only command that parses the file). The slot's
   config text was restored afterwards.

   ```
   jwt_expiry=1    exit=0  no complaint
   jwt_expiry=30   exit=0  no complaint
   jwt_expiry=60   exit=0  no complaint
   jwt_expiry=120  exit=0  no complaint
   jwt_expiry=300  exit=0  no complaint
   ```

   **This measures only that the CLI does not REFUSE the value.** It is not evidence that GoTrue
   honours it, and it is written down separately for that reason.

2. **Run-time — the load-bearing half.** Slot 1 was restarted with `auth.jwt_expiry = 120`, a
   confirmed user was created with operator authority, and a password grant was read:

   ```
   password grant -> 200 ; expires_in=120 ; the access token's own exp-iat = 120
   ```

   So the value reaches the container and the issued token really carries it.

**Why 120 and not lower.** AI4DEV-60's transcript used a TRANSIENT `jwt_expiry = 5`, which suited a
script that slept 10 seconds. D12 makes the value STANDING, so every id in the manifest runs under
it, and a 5-second access token would expire inside ordinary test steps and turn unrelated ids red.
120 s is long enough that no body except the two that WANT an expiry ever meets one, and short
enough that those two wait about two minutes. The cost is the one D1 already accepted.

### (d) Is supabase-js `autoRefreshToken` rotation deterministically observable under that expiry?

**ANSWER: yes. Rotation was observed with NO explicit refresh call, and access continued afterwards.**

Evidence, against slot 1 at `jwt_expiry = 120`, with
`createClient(url, anon, { auth: { autoRefreshToken: true, persistSession: false } })`:

```
supabase-js sign-in -> ok ; token exp-iat=120
--- waiting for an automatic refresh, with NO explicit refresh call
AUTO-REFRESH OBSERVED after 30s ; events=INITIAL_SESSION,TOKEN_REFRESHED
continued access with the rotated token -> 200
```

The observable is the pair: the `TOKEN_REFRESHED` event, and `getSession()` handing back an access
token that is not the one sign-in returned. Neither is a self-report by the harness — both come from
the client library, and the rotated token is then spent against `/auth/v1/user`.

**Timing, stated exactly.** Rotation happened about 30 seconds into a 120-second token, not at its
expiry: supabase-js runs an auto-refresh tick and refreshes while the token still has life. That is
what makes it DETERMINISTIC rather than a race — the body does not have to wait out the expiry, it
has to wait out one tick. The integration body waits with a bounded poll and fails loudly if no
rotation appears.

**One reading in the probe transcript that must not be misread**: the probe also spent the ORIGINAL
token after the rotation and got 200. That is correct and is not a defect — at 30 seconds the
original token had 90 seconds of life left. It is NOT evidence about what an expired token does;
AT-001.12's expiry arm measures that separately, by waiting past the full 120 s.

### Slot 1's state after Part A

The probe restored slot 1's config TEXT but left its stack running on the probe value, so the
recorded start marker was DELETED
(`%LOCALAPPDATA%\ai4good-build\db-slots\slot-1\.last-start.json`). The next `prepare()` therefore
sees no marker, restarts the slot, and brings it up on whatever config it generates — which, with
D12 in place, is the standing `jwt_expiry = 120`. No stale claim about what the slot is running
survives this record.

---

## Part B — step 1's confirmations

One section per cell the plan marks "step 1 confirms". The transcripts cited are
`loop/items/AI4DEV-58/proof-local.txt` (GitHub link and the completion path),
`loop/items/AI4DEV-59/proof-local.txt` (email verification) and
`loop/items/AI4DEV-60/proof-local.txt` (sessions, refresh, password reset).

### AT-001.01 — "step 1 confirms every clause is live-oracleable from the deployed surfaces"

**CONFIRMED. Every clause has a live oracle. The settled disposition (green with the full-outcome
oracle) stands.**

| clause of the criterion | live oracle | where it is already shown working |
|---|---|---|
| account with global type `NGO` is created | `select account_type from public.accounts` as operator | 58 (c): `rows=[{"account_type":"ngo", …}]` |
| an org membership with the `admin` role for their NGO | `public.organizations` + `public.org_memberships` joined | 58 (c): `{"name":"Riverside Shelter","role":"admin"}` |
| acknowledgment recorded with timestamp, IP, text version | `public.acknowledgments` carries `acknowledged_at`, `ip inet`, `text_version` (migration `20260808120000`, lines 72-78) | 58 (d3): `acknowledgments=1`; the three columns are read directly |
| "before any project creation is possible" | `public.has_platform_acknowledgment(uuid)`, discriminating false→true | 58 (a): `has_platform_acknowledgment=false` for an account that had not completed |
| a later sign-in with the same email/password succeeds | `POST /auth/v1/token?grant_type=password` -> 200 with tokens | 60 (b) |
| the negative arm: atomicity leaves nothing behind | the deployed function's own refusal, then a row count | 58 (e): `rows left behind: {"accounts":0,"profiles":0,"acknowledgments":0}` |

The act itself is the DEPLOYED `complete-signup`, reachable at the slot's own
`FUNCTIONS_URL` per (a).

### AT-001.05 — "step 1 confirms what the import read (a real public API or a stand-in)"

**CONFIRMED AS A STAND-IN. Settled RED, `capability-pending`.**

The onboarding import reads `stubGithubStatsFor` in
`supabase/functions/_shared/github.ts`. The stored contribution summary says so in its own text:

> `"stub import fixture: octocat has 151 public repositories, most recently in Elixir — no GitHub
> API was called to produce this"` (58 (b))

The criterion's words are "the imported **public stats** (top languages, repository count,
contribution summary) are observably populated". Under the plan's rule — green only if the When/Then
is proved live **without vendor fabrication** — a statistic produced by a shipped stub is fabricated,
whatever it populates. So the id is settled red at integration with its exact kind.

**The Given is a different question and it is not what settles this.** Provisioning the linked GitHub
identity by operator authority IS permitted fixture setup under the plan. The disposition turns on
the import alone.

**Reported as a judgment for the orchestrator to confirm, not a dispute:** the opposite reading is
available — the decomposition manifest's cross-contract ratifies the stub ("stub import fixture
until W3"), so one could argue the criterion is met by the shipped behaviour the manifest ratified.
The executor took the conservative reading, which fails toward red. The plan's own doctrine for
.01 and .13 is that a green must prove the criterion's full text, and "public stats" is text.

### AT-001.04 — "step 1 confirms no legitimate live link path exists"

**CONFIRMED. No live link path exists. Settled RED stands.**

- `enable_manual_linking = true` in `supabase/config.toml` opens GoTrue's `linkIdentity` surface, and
  the config's own comment states what that proves and what it does not: "WHAT THIS PROVES: the
  configuration is well-formed and the stack starts with it. WHAT IT DOES NOT: that any
  `linkIdentity` round trip works — that is a browser flow with a consent screen in it".
- No GitHub OAuth app or credential exists in this environment. AI4DEV-58's check (f2) is SKIPPED
  for exactly that reason and records it as the expected case:
  `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID is ABSENT from the environment this stack was started with`.
- The block arm alone (completion refused, requirement stated) is proved live — 58 (a) — but the
  criterion's second clause is "linking completes signup", and that needs the handshake.

### AT-001.06 and AT-001.07 — "step 1 confirms the full criterion is live-oracleable"

**AT-001.06 — CONFIRMED live-oracleable. Settled GREEN.**
The action is the deployed `create-organization`, called with a volunteer's session. The refusal is
the shipped `ngoOnlyActionAllowed` judgement reached through `resolveCaller`, and the read-back that
proves nothing was written is `public.organizations` searched by the attempted name plus
`public.org_memberships` for the account. Both are operator reads over coordinates the runner
validated. Nothing in the clause needs a provider handshake.

**AT-001.07 — CONFIRMED live-oracleable, on a re-reading of the second clause. Settled GREEN.**
Two clauses:

1. "a provisioned platform admin ... authenticates and carries the `platform admin` global type" —
   the auth user is created with operator authority through `POST /auth/v1/admin/users`
   (`email_confirm: true`), which is the ONLY recipe this repository records, and the `platform_admin`
   row is written as the OPERATOR over `AT_SUPABASE_DB_URL` — never as the service role, which holds
   no INSERT on `public.accounts` (migration `20260808120000` line 353 grants it `select` only).
   Sign-in is the password grant; the type is read back from `public.accounts`.
2. "the public signup surfaces offer only NGO/volunteer" — the live oracle is the DEPLOYED
   `complete-signup` refusing an `accountType` of `platform_admin`, which is a deployed surface
   rather than a constant read out of the shipped module. That is a strictly stronger oracle than
   the loop body's `publicSignupAccountTypes()`, and it is what the integration body asserts.

### The 24 loop-red ids (.16–.37, .39, .40) — the authored prediction

**CONFIRMED. Same kind, same phase, at integration.**
Their bodies are `notLanded(...)` in `tests/at/suites/req-001/_pending.ts`, which throws
`AtPending(ctx.atId, 'sut-missing', …)` as the FIRST statement — before `open()` is called. So no
capability ledger is built for them and the tier makes no difference to what they throw. The
integration declaration predicts `{"kind":"pending","phase":"sut-missing"}` for all 24, exactly as
the loop declaration does.

### AT-001.02, AT-001.03, AT-001.10 — no confirmation asked for, and none needed

The plan settles these red on F8 (no OAuth credential exists) and F9 (no Discovery route exists in
this repository). Both facts were re-checked and both hold: `supabase/functions/` contains exactly
`complete-signup` and `create-organization`, and 58 (f2) records the absent GitHub credential.
