# AI4DEV-57 (email + Google signup, three account types) — rulings made in the FIX sitting (sitting 4)

Ruled by `orchestrator-opus` (Opus 5, effort max), the opus fallback in force for this whole item
because fable is out of credit. A fable ruling and an opus ruling are not the same evidence; every
ruling in this file is an opus ruling, as are those in `plan.md`, `gate1-rulings.md` and
`draft-rulings.md`.

Head ruled against: `1782d7c1afd8b898320280905777b822ba09ce70`.

**What is ruled here:** two continuous-integration failures at that head, twenty-six findings from
three completed code-critique runs, and five salvaged leads from a fourth run that never finished.
Every reviewer claim is quoted beside its ruling. Rulings are pushed **before** any code changes, so
the judgment survives an executor death.

---

## PART 0 — THE GATE'S OWN COVERAGE, RECORDED BEFORE ANY FINDING IS RULED

The code gate was designed as two slices, each read by **both** pinned models — four runs — because
one reader per slice would halve the independent readers per line, and the gate may never be
narrowed (`draft-rulings.md` R8).

**Three of the four runs completed. The fourth did not.**

| slice | reader | outcome |
|---|---|---|
| SQL + configuration | terra (gpt-5.6, effort max) | completed, 8 findings |
| SQL + configuration | kimi (kimi-code/k3, effort high) | **ran out of credit mid-run — no closing count line, no verdict** |
| TypeScript + tests | terra (gpt-5.6, effort max) | completed, 11 findings |
| TypeScript + tests | kimi (kimi-code/k3, effort high) | completed, 7 findings |

**So the SQL and configuration slice — the migration, the two edge functions' configuration and
`config.toml` — had ONE completed independent reader where the gate's design calls for two. The
TypeScript and tests slice had both.** This is a real reduction in the evidence behind this item and
it is recorded here, in `PHASE-STATE.md`, and in the merge ruling rather than being allowed to
disappear because the missing reader produced no file to notice.

**Kimi is out of credit for the remainder of this item.** No further kimi launch is attempted on any
later gate here. Whether a second reader is obtained for a later gate in this item is the founder's
call, not mine to force — and a billing-quota exhaustion is not a session-window limit, so it does
not heal itself at a reset.

---

## PART A — THE TWO CONTINUOUS-INTEGRATION FAILURES

Run 31249970921, job `verify`, at head `1782d7c`. Type-check passed; the acceptance-harness
**self-tests** then failed with five failing tests, and everything after was skipped — the loop-tier
verify and both guards never ran. Both failure groups are ruled before anything is patched.

### CI-1 — the migration self-test encoded "there are no migrations" as an invariant. ACCEPTED, the self-test moves

**The failure, quoted from the run:**

> `harness/runner.selftest.ts > reads timestamped .sql files and ignores .gitkeep and README.md` —
> `AssertionError: the placeholder files are being counted as migrations: expected [ '20260808120000' ] to deeply equal []`

**Determination — is this a defect in the migration, or a stale self-test?** A stale self-test, and
the check that settles it is that `expectedMigrations()` read the file **correctly**. Its filter is
`/^(\d{14})_.*\.sql$/` (`tests/at/harness/runner.ts`), and this item's migration is
`20260808120000_accounts_org_membership_and_acknowledgments.sql` — fourteen digits, an underscore, a
`.sql` suffix. The function returned `['20260808120000']`, which is the right answer. The assertion
it failed is `toEqual([])` on line 253, written when `supabase/migrations/` held only `.gitkeep` and
`README.md`. **This item adds the first product migration this repository has ever had**, so that
baseline is false from now on and permanently. Nothing about the migration is wrong.

**Ruling: accept — the self-test is repaired, and repaired so that it keeps proving its own title.**

The naive repair is to assert `['20260808120000']`, and it is refused: that hard-codes this item's
filename into a harness self-test, so the next migration anyone writes breaks it again, and each
break invites the same shrug. The repair takes the baseline as **observed** and asserts the
properties the test is actually named for:

- every entry in the baseline is a bare fourteen-digit timestamp — which is what proves `.gitkeep`
  and `README.md` are excluded, since neither can produce one;
- planting `20260101000000_selftest_probe.sql` adds **exactly** that id to the baseline and nothing
  else;
- removing it returns the result to the baseline exactly.

**One strengthening rides along, because I am rewriting the assertion that carried the claim and the
replacement must not be weaker than the sentence above it.** The test's title says it ignores
`.gitkeep` and `README.md`; neither the old assertion nor the new one is worth anything if those two
files are not actually present. Their presence is now asserted, so the claim cannot pass vacuously in
a tree where somebody deleted them.

### CI-2 — the four type-invention probes. WORDING DRIFT, DETERMINED BY MEASUREMENT. The seam is NOT weaker

**The failures, quoted from the run:** four probes in `harness/type-invention.selftest.ts` —
`rejects bindSuite<Sut, W> — a fabricated system under test`, `— a fabricated fixture world`,
`rejects binding a requirement with no registered adapter`, and `rejects widening the seam by
annotating the body parameter with a fabricated shape`. Each assertion says the fabrication *"was
accepted"*.

**This determination is written before anything is touched, because a green obtained by relaxing an
expectation instead of fixing a wording match is the exact defect class this item's own F6 guard was
created to prevent.** It was reached by running the compiler, never by predicting it — which is also
the standing instruction in that file's own comment: *"Every diagnostic asserted below was READ OFF
THE COMPILER, never predicted."*

**The cause, in one sentence: this item registered a second suite adapter, which turned `SuiteId`
from a single string literal into a two-member union, and TypeScript prints a single-member alias as
its literal but a multi-member alias by its alias name.**

`tests/at/harness/suite-adapters.ts` line 110 is `export type SuiteId = keyof AdapterModules &
string`, and `AdapterModules` at lines 104–107 now carries `'req-001'` beside `'req-016'`. Before
this item it carried one key, so every constraint rendered as `'"req-016"'`. All four failing markers
embed that literal string. None of the nine other attacks in the same list does, and all nine still
pass — including the sut-key attack, which is the control that matters most and is discussed below.

**Measured, at this head, with the same pinned compiler the harness uses.**

`tsc --noEmit -p tests/at/typeprobes/tsconfig.sut-seam-legacy.json`, exit **2**:

```
sut-seam-legacy.probe.ts(45,52): error TS2344: Type '{ notThere(): Promise<void>; }' does not satisfy the constraint 'SuiteId'.
sut-seam-legacy.probe.ts(49,1):  error TS2349: This expression is not callable.
sut-seam-legacy.probe.ts(49,91): error TS7031: Binding element 'open' implicitly has an 'any' type.
sut-seam-legacy.probe.ts(61,54): error TS2344: Type 'NotificationsSut' does not satisfy the constraint 'SuiteId'.
sut-seam-legacy.probe.ts(65,1):  error TS2349: This expression is not callable.
sut-seam-legacy.probe.ts(77,49): error TS2554: Expected 3 arguments, but got 2.
```

`tsc --noEmit -p tests/at/typeprobes/tsconfig.sut-seam.json`, exit **2**:

```
sut-seam.probe.ts(61,52): error TS2322: Type '"req-999"' is not assignable to type 'SuiteId'.
sut-seam.probe.ts(61,76): error TS2322: Type 'string' is not assignable to type 'never'.
sut-seam.probe.ts(84,25): error TS2344: Type 'NotificationsSut & { invented?: string | undefined; }' does not satisfy the constraint 'SuiteId'.
sut-seam.probe.ts(84,3):  error TS2345: Argument of type '(ctx: AtContext<NotificationsSut & { invented?: string; }, World>) => Promise<void>' is not assignable to parameter of type 'AtTestBody<"req-016", "notifications">'.
sut-seam.probe.ts(86,10): error TS18046: 'sut' is of type 'unknown'.
sut-seam.probe.ts(52,69): error TS2322: Type '"notificatoins"' is not assignable to type '"notifications"'.
```

**Attack by attack, what changed and what did not:**

| attack | error code | subject of the rejection | constraint, before → now |
|---|---|---|---|
| fabricated system under test | TS2344, unchanged | `'{ notThere(): Promise<void>; }'`, unchanged | `'"req-016"'` → `'SuiteId'` |
| fabricated fixture world | TS2344, unchanged | `'NotificationsSut'`, unchanged | `'"req-016"'` → `'SuiteId'` |
| requirement with no adapter | TS2322, unchanged | `'"req-999"'`, unchanged | `'"req-016"'` → `'SuiteId'` |
| widening at the body parameter | TS2344, unchanged | `'NotificationsSut & { invented?: string \| undefined; }'`, unchanged | `'"req-016"'` → `'SuiteId'` |

**Every rejection still fires, at the same error code, naming the same fabricated subject. Only the
rendered name of the constraint changed.** Both probe programs still exit 2, so the two
"this program must not compile" tests still pass, and they are not in the failing set.

**Two independent controls say the seam is not weaker, and they are what turn a plausible story into
a determination.** The specific weakening the widening attack's own comment warns about is *"someone
has re-parameterized them by shape"*. If that had happened:

1. **The sut-key attack would have degraded too.** It asserts
   `Type '"notificatoins"' is not assignable to type '"notifications"'` — a constraint derived
   through `SutKeyOf<R>` from the same adapter map. It still matches **verbatim** and still passes.
   A seam re-parameterized by shape could not keep that constraint intact.
2. **The nine `SEAM_ALIAS_PROTECTED` identifiers still emit TS6200**, and the widening attack still
   additionally produces the full TS2345 incompatibility chain at `(84,3)` and TS18046 at `(86,10)`
   — three diagnostics on one attack, none of which a weakened seam would produce.

**Ruling: accept — this is pure wording drift from a derived type legitimately widening, and the four
string matches are repaired to `'SuiteId'`.**

**Why the repaired marker is not a relaxation, stated explicitly because that is the accusation this
ruling has to answer.** Each marker still asserts three things: that the compiler rejects this exact
fabricated subject, that the reason is a failure to satisfy a constraint, and that the constraint is
the seam's requirement-id type. Every weakening I can construct still fails it — re-parameterize by
shape and the constraint is no longer `SuiteId`; delete the constraint and there is no TS2344 at all;
widen `SuiteId` to `string` and the constraint prints `string`. The new marker is also **more stable
than the old one**: `'SuiteId'` is the alias's name and does not change when a third suite is
registered, whereas `'"req-016"'` was an incidental rendering that happened to hold while exactly one
adapter existed. Fixing this by naming the union's current membership would re-break on the next
suite and teach the next author to relax it.

**One stale prose site rides along, because this item is what made it false.**
`tests/at/harness/suite-adapters.ts` line 19 tells the reader the compiler will say
`Type '"req-999"' is not assignable to type '"req-016"'`. It now says `'SuiteId'`. A comment that
quotes a diagnostic the compiler no longer emits is a small false statement in the file that caused
the change, and it is corrected here rather than left for someone to trip over.

**Do not run `bun run build` in this sitting.** It is not in step 8's done-criterion — that list is
`typecheck`, `at:selftest`, `at:check` and `at:verify --expect` for both requirements — and it
rewrites `src/routeTree.gen.ts`, which on this branch is the standing hazard recorded in
`PHASE-STATE.md`: a `src/` file in a `supabase|tests|loop` diff fails the territory guard outright.
Nothing in this fix list touches anything a build would cover.

---

## PART B — THE TWENTY-SIX FINDINGS FROM THE THREE COMPLETED RUNS

### B1 — CORS: neither edge function answers a preflight. ACCEPTED

**terra, SQL slice [1] (high) and TypeScript slice [1] (high), quoted:**

> "Neither edge function handles CORS preflight requests or emits CORS headers."
> "Browser signup from the app origin sends an authenticated JSON preflight; these endpoints reject
> `OPTIONS` and their POST responses lack access-control headers, so the later UI cannot invoke them."

True as stated; verified in `supabase/functions/_shared/edge.ts` (`json()` sets `content-type` and
nothing else) and in both entry points (each refuses any method other than POST, so `OPTIONS` is a
405). This is one reader raising it twice, on two slices — not two independent readers — and kimi
read the same TypeScript without raising it. Weighed accordingly, and accepted anyway.

**Ruling: accept.** The deciding argument is the territory guard, and it is structural rather than a
matter of taste. `.github/workflows/ci.yml`: *"One pull request may not change both territories.
Lovable owns src/; Claude owns supabase/, tests/, loop/, .claude/ and .github/."* The leaf that
builds the signup screens builds them in `src/`, so **it cannot add a header to
`supabase/functions/` in the same pull request.** Adding CORS requires a `supabase/`-territory pull
request. This is one, it is open, and its subject is those two edge functions. Any other placement
means a second pull request containing nothing else.

The second argument is that an endpoint no browser can call is an incomplete server half, and the
server half is this item's entire job under D2.

**It is not added blind.** A preflight check goes into `proof-local.ts`: an `OPTIONS` with an
`Origin` and the headers a real preflight carries must answer 2xx with the access-control headers,
and the POST response must carry them too. **What that proves is the local Kong and the local edge
runtime; it does not prove the hosted gateway**, and the claims table says so in those words.

### B2 — `create_organization` re-checks nothing, so its service-role caller can make a volunteer an org admin. ACCEPTED, FIXED DIFFERENTLY

**terra, SQL slice [2] (high), quoted:**

> "The `SECURITY DEFINER` `create_organization` RPC validates only the name, so its service-role
> caller can create an admin membership for a volunteer or platform-admin account."

**kimi, TypeScript slice, in its uncounted closing note, quoted:**

> "the migration's documented decision that `create_organization` performs no account-type re-check
> (unlike `complete_signup`) is sound given only `service_role` can execute it, but it means the
> NGO-only boundary has exactly one enforcement point — the untypechecked entry point"

True. Verified at the migration's lines 252–281: the function checks the name and inserts. The only
account-type enforcement is `ngoOnlyActionAllowed` in `create-organization/index.ts`, **a file no
type-checker covers at all** — a fact this item established for itself and recorded as fact 7 in
`PHASE-STATE.md`. The service role holds `execute` on the function, so a service-role key holder
reaches it directly.

**Ruling: accept, fixed differently.** The migration's stated reason for having no check —
*"Duplicating it here would move the decision away from the module the acceptance suite drives"* — is
answerable rather than wrong. A **backstop that raises** is not the decision: the user-facing refusal,
with its reason, stays in `ngoOnlyActionAllowed`, AT-001.06 still drives the shared TypeScript at
loop tier, and the database check only ever fires on a path that bypassed the TypeScript. That is
precisely the shape the plan review already ruled mandatory for `complete_signup` (F6, defence in
depth), and the item should not apply that reasoning to one two-write function and refuse it on the
other.

So `public.create_organization` gains an account-type lookup that raises unless the account is `ngo`,
with a comment stating that it is a backstop and not the decision, and naming the reason it exists:
the deciding file has no type coverage. A proof check mirroring (j) calls the function directly with
the service role against a volunteer account and shows the database refusing.

### B3 — the acknowledgment IP is client-controlled. ACCEPT IN PART, and VERIFY FIRST on the rest

**Four readings of one thing — terra on both slices, kimi, and the salvaged kimi-sql lead. The
strongest signal in this gate.**

**terra, TypeScript slice [2] (high), quoted:**

> "The acknowledgment IP may be null or attacker-chosen because the code trusts the first raw
> `x-forwarded-for` value."

**kimi, TypeScript slice [4] (medium), quoted:**

> "the acknowledgment's `ip` is whatever the caller puts in the first `x-forwarded-for` entry — fully
> client-controlled on any path where no trusted proxy overwrites the header, and proof-local.ts:124
> sets that header itself while check (a) (line 174) asserts only `ip !== null`, so nothing anywhere
> verifies the recorded address is the request's real source."

Kimi marks its own claim unverified-runtime and says why: *"what the local Kong and the hosted edge
runtime do to a client-supplied `x-forwarded-for` cannot be settled without running it."* That is the
correct posture and I am adopting its shape.

**Ruling, in three parts.**

**(a) Accept outright — an unparseable header must not break a legitimate signup.** This is a defect
none of the readers named in full, and it falls out of putting their observation next to the schema.
`public.complete_signup`'s fifth parameter is `p_ip inet` (migration line 138) and the edge function
hands it `callerIp(request)` — a raw header substring, unvalidated. A caller sending
`x-forwarded-for: nonsense` produces a cast failure inside PostgREST, a 4xx, and
`complete-signup/index.ts` line 71 maps any 4xx to **409 with the database's message** — so a
well-formed signup is refused with something that reads like a signup conflict. `callerIp` therefore
validates: anything that is not an IPv4 or IPv6 address becomes `null`, which the column already
permits and which the code's own comment already prefers to *"a value in the column that reads like a
measurement and is not one"*.

**(b) Verify first — what the local gateway does to a supplied header.** The reviewers assert; the
executor measures. Against the live stack, `complete-signup` is called twice: once with **no**
`x-forwarded-for`, and once with a **spoofed** one, and the stored `acknowledgments.ip` is read back
each time. The transcript records what actually arrives. This is the only way the question is
answerable, and it costs one extra check.

**(c) Reject the implied remedy of pinning a trusted value, and narrow the claim instead.** No
reader proposed a concrete trust model this item could implement, and there is none available: the
hosted gateway's behaviour is not observable from this machine, and choosing between leftmost and
rightmost without knowing the deployed proxy chain would be picking a convention and calling it a
guarantee. So the code comment states the trust boundary plainly — the address is what the gateway
chain reported and is **not authenticated** — and AT-001.01's row in the claims table says the
acknowledgment records **an** address, not **the verified source** address. Whoever lands the hosted
deployment settles it with the deployed chain in front of them. Filed, named, not silently dropped.

### B4 — a returning user has no supported way to read their own account type. ACCEPT AS TRUE, CLAIM NARROWED, WORK FILED

**terra, TypeScript slice [3] (high), quoted:**

> "A returning authenticated user has no supported way to obtain their `account_type`. RLS is enabled
> with no policies, no Auth metadata is populated, and no edge endpoint returns the account after
> later sign-in; NGO, volunteer, and platform-admin sessions therefore cannot actually "carry" their
> global type as AT-001.07 requires."

Every factual half verified: the migration enables row-level security on all four tables and adds no
policy (lines 288–297, and its own comment says so); neither entry point exposes a read; nothing
writes Auth metadata.

**Ruling: accept the fact, reject the remedy in this leaf, and narrow the claim.**

The obvious remedy is four lines — a `select` policy on `public.accounts` for `auth.uid() = id`. It
is refused, and the line I am drawing is this: **B1 completes what this item built; this would add
what it did not.** CORS is a transport property of two endpoints that ship here, without which the
artifact this item delivers is not callable at all. A client-reachable account read is a new read
surface, and its design belongs to the deliverable that owns the whole policy set — AT-001.21 through
.24 and .40, the tenant-isolation deliverable, which the plan's D5 explicitly defers to. Adding one
policy now pre-empts a design that has to be coherent across four tables and several roles, and this
leaf would be choosing it with none of that in view.

The claim moves instead. AT-001.07's row gains, in the **not proved** column, that no client-reachable
path returns an account's type, so "the session carries its global type" is established for the
server (`create-organization` reads it with the service role and acts on it) and **not** for any
browser. The wiring leaf needs that path and will need a `supabase/`-territory change to get it;
naming it here is what stops that being discovered at its merge.

### B5 — AT-001.03's comment claims a falsifiability the test does not have. ACCEPTED

**terra, TypeScript slice [4] (high), quoted:**

> "AT-001.03's Google-versus-email comparison is provider-blind. The adapter's `completeSignup` reads
> only `session.accountId`; neither it nor the shared decision receives `session.provider`, so an
> edge-function regression that treats Google differently still leaves this loop-tier test green."

**kimi, TypeScript slice [3] (low), quoted, and its framing is the one I am adopting:**

> "AT-001.03's comment overclaims falsifiability: "if the shipped code ever grew a provider branch,
> these two results would differ and this test would go red" is false for every location such a
> branch could actually live […] The comparison half of the test is near-vacuous as a guard; what
> actually carries weight in AT-001.03 is the pinned-value block at lines 176-182. The comment should
> say that."

Verified: `_fixture.ts` `completeSignup` reads `session.accountId` and nothing else;
`CompleteSignupRequest` in the shared module has no provider field. A provider branch is not
expressible in the code this test drives.

**Ruling: accept — the comment is wrong and the comment is what changes, not the test.** The test is
exactly what the plan authorized: F2 required that AT-001.03 *"asserts only what it can honestly
prove"* and forbade simulating a handshake, and it does neither. The defect is a comment claiming
more than the per-id table allows, which is a discipline this plan states outright — *"A clause named
unproved here may not be described as proved anywhere else in this item."* The comment now says that
the comparison establishes that the shipped path ignores the provider **because it never receives
one**, that it would therefore not catch a provider branch introduced in the edge functions, and that
the pinned-value block is what carries the weight.

### B6 — the organisation-name rule exists in two copies, neither in the shared module. ACCEPTED

**terra, TypeScript slice [6] (medium), quoted:**

> "Organization-name validation is independently duplicated in the fixture and `create-organization`
> edge function rather than shared through `accounts.ts`."

**kimi, TypeScript slice [2] (medium), quoted:**

> "the organisation-name judgement on the create-organization path exists in TWO places, neither of
> which is the shared module: the shipped copy sits in the edge-function entry point
> (create-organization/index.ts:77-80, a file no type-checker covers) and the suite's copy sits in
> the adapter — so AT-001.06's green grades the adapter's copy of that rule, not the shipped one."

**Two independent readers, and this is the sharpest finding in the gate**, because it attacks D4 —
the item's central claim. Verified, and it is exactly as described: `create-organization/index.ts`
lines 78–80 and `_fixture.ts` lines 224–226 carry the same rule and the same refusal sentence,
written twice.

**It also falsifies something I ruled in the previous sitting, and that is worth stating plainly.**
`draft-rulings.md`'s verification table records *"every judgement in the adapter is the shipped
module's … no second copy of a rule found — **true**"*. That was an opus ruling, made by reading, and
it was wrong: I checked the three judgements the plan enumerated and did not look for a fourth that
the plan never named. Two reviewers found it. This is the gate doing the job the gate exists for, and
the record should say so rather than absorb the correction quietly.

**Ruling: accept, and fix it the way kimi names.** A fifth export goes into
`supabase/functions/_shared/accounts.ts` — an organisation-name judgement returning the same
`Decision<string>` shape as its neighbours — and both the edge function and the adapter call it. The
duplicate copies go. After this, `_fixture.ts`'s opening claim that *"There is no second copy of the
rules in this file"* is true again; it is false today.

### B7 — the adapter re-implements the acknowledgment predicate. ACCEPTED IN PART; the comment moves, no extraction

**terra, TypeScript slice [5] (high), quoted:**

> "The acceptance adapter reimplements `has_platform_acknowledgment` instead of exercising the
> shipped SQL predicate. The SQL function could return `true` unconditionally or check the wrong
> acknowledgment kind while the Map predicate still passes."

**Ruling: accept the observation, reject an extraction, correct the comments.**

The claim is true and its consequence is real, but there is no shared decision to extract here: the
predicate is `exists(row with this account and this kind)` — a **storage query**, and storage is the
half the adapter is allowed to stand in for. The one judgement inside it, which acknowledgment kind
counts, is already shared: `_fixture.ts` imports `PLATFORM_ACKNOWLEDGMENT_KIND` from the shipped
module rather than spelling a literal. A TypeScript module cannot supply a SQL predicate, so the two
implementations are irreducible.

What is wrong is that three places imply the loop-tier green grades the shipped SQL. `_fixture.ts`'s
`hasPlatformAcknowledgment` comment, `_contract.ts`'s, and AT-001.01's body comment all say the
predicate "must discriminate" without saying **which** predicate the assertion reaches. They are
corrected to say that the loop tier proves the rule and the adapter's storage, and that the shipped
SQL predicate is proved only by step 7(h) against the live database. The claims table already assigns
(h) to AT-001.01's live column; the comments now agree with it.

### B8 — AT-001.01 never tests that a missing acknowledgment is refused. ACCEPTED

**terra, TypeScript slice [7] (medium), quoted:**

> "AT-001.01 never tests that omitting the acknowledgment is rejected and leaves no account state. A
> weakened implementation can preserve the tested happy-path record while allowing signup without an
> actual acknowledgment, so the green test does not establish the criterion's "required" clause."

True. `validateCompleteSignup` refuses a completion with no acknowledgment text version, and nothing
asserts it. The criterion's word is *required*, and a test that only exercises the happy path does not
establish a requirement.

**Ruling: accept.** AT-001.01 gains a completion attempt with the acknowledgment text version absent:
refused, with a reason naming the acknowledgment, and **no account row left behind** — the same
no-leftover shape AT-001.07 already asserts for its own refusal.

### B9 — AT-001.06 never asserts the refused volunteer left nothing behind. ACCEPTED

**kimi, TypeScript slice [6] (low), quoted:**

> "AT-001.06 never asserts the refused volunteer left nothing behind — the weakest
> createOrganization that still passes writes the organisation and membership and then reports
> refusal. AT-001.07 does pin the no-leftover-account property for its own refusal (line 295), so the
> asymmetry reads as an omission rather than a policy."

True, and the reviewer's own reasoning for why it matters is the right one: *""the action is
rejected" includes its writes not happening"*. It also notes that the live proof's check (d) already
asserts `volunteerOrgs.length === 0`, so the live tier covers it — but adds that the live proof has
never run and *"the two tiers are supposed to be independently meaningful"*, which is correct.

**Ruling: accept.** AT-001.06 asserts, after the refusal, that the volunteer holds no membership and
that no organisation by the attempted name exists.

### B10 — upstream failures escape as a bare 500, and any 4xx is relabelled 409. ACCEPTED IN PART

**terra, TypeScript slice [8] (medium), quoted:**

> "Upstream Auth/Data API failures bypass the intended structured error handling. A rejected `fetch`
> or bad successful body throws rather than producing an `RpcOutcome`."

**kimi, TypeScript slice [5] (low), quoted:**

> "a network throw from the `resolveCaller` fetch (Auth unreachable), from `accountTypeOf`'s fetch, or
> from the `JSON.parse` on a non-JSON success body at edge.ts:148 propagates out of the handler and
> becomes a bare 500 with no shaped refusal; and the blanket `outcome.status >= 400 && < 500 → 409`
> mapping […] would mislabel a database-raised 400/403 as 409 — currently unreachable only because
> the TypeScript layer pre-refuses those cases, a coupling nothing enforces."

**Ruling: accept the thrown-error half; reject the status-remapping half, with the reason recorded.**

Accepted: both handlers are wrapped so anything thrown becomes a shaped refusal with a 502 and a
sentence, instead of whatever `Deno.serve` does with an exception. `edge.ts`'s own contract is *"the
reason travels, never a bare status"*, and the transport-failure path is precisely where a caller most
needs to tell a refusal from an outage. Both reviewers marked this unverified-runtime — kimi says
*"the thrown-handler-→-500 behaviour is Deno.serve convention, not something I ran"* — so the fix is
made and the shape is **observed against the live stack** rather than assumed: one call with the
database stopped, recorded in the transcript.

Rejected: re-mapping 400 and 403 away from 409. Kimi is right that the coupling is unenforced, and
wrong that this is worth changing here. Every 4xx these functions can currently receive is a raised
exception from a `SECURITY DEFINER` function whose error codes this migration chooses, so the mapping
is correct for every reachable case; a speculative remap would add branches for states no test can
produce, against this project's standing rule that error handling for impossible scenarios is not
written. If a future caller of these database functions makes another 4xx reachable, the mapping
becomes wrong then and is that change's to fix. Recorded, not built.

### B11 — a skipped proof check counts itself as a pass. ACCEPTED (already ruled; independently confirmed)

**terra, TypeScript slice [9] (high), quoted:**

> "A skipped proof check is stored as `passed: true`. The normally skipped Google credential check is
> counted as a pass and permits `ALL CHECKS PASSED`, despite the script's own contract saying skips
> are never passes; this can falsely certify missing live-stack evidence."

This is `draft-rulings.md` R4 — my own finding from the previous sitting, and a reviewer reached it
independently. Re-verified: `proof-local.ts` line 42's docstring says *"Reported as SKIPPED and never
as a pass"*; line 44 writes `passed: true`; line 461 counts it among the passes; line 466 prints
`ALL CHECKS PASSED`.

**Ruling: accept, as already ruled, and fixed before step 7 is run for the first time.** A skipped
check is distinguishable in the stored result, in the tally line, and in the verdict, and
`ALL CHECKS PASSED` does not print when anything was skipped. Nothing false has been produced yet,
because the script has never been executed.

### B12 — (f2) treats any non-empty value as a real credential. ACCEPTED

**terra, SQL slice [6] (medium), quoted:**

> "The Google handshake check treats any nonempty client ID in the script process as a real
> credential and does not establish it matches the running stack."

True, and it matters more than its severity suggests because of how it interacts with the plan's own
risk mitigation. Plan risk 2 permits **placeholder** Google credentials in the git-ignored
`.env.local` so the stack starts. `proof-local.ts` line 306 accepts any non-empty
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, and the local Auth server builds its authorize URL from
whatever is configured without contacting Google — **so with a placeholder present, (f2) runs, the
client id matches, and the check passes.** That is exactly what the plan forbids in those words: *"a
placeholder value must not be dressed up as this proof."*

**Ruling: accept.** (f2) is performed only when the configured value is a credential rather than a
placeholder, the transcript states which of the three states it was in — absent, placeholder, real —
and a placeholder produces a SKIP, which after B11 can no longer be counted as a pass. The two
mechanisms together are what close this: either alone leaves the hole open.

### B13 — a failed account lookup is reported as "complete signup". ACCEPTED

**terra, SQL slice [7] (low), quoted:**

> "A failed account-type lookup is indistinguishable from an absent account and is returned as
> "complete signup" with HTTP 409."

**kimi, TypeScript slice [1] (medium), quoted:**

> "`accountTypeOf` returns null for ANY non-OK PostgREST response, so a failed account-type lookup is
> reported to the caller as "complete signup before creating an organisation" (409) — the exact
> conflation the function's own comment (lines 41-44) says must not happen. […] `null` should mean
> only "row absent"; a failed read needs its own 502."

Two independent readers, and the function's own comment convicts it: *"`null` means the row is
absent, which is a real and distinct state […] conflating it with "not an NGO" would give that caller
a refusal that told them the wrong thing to fix."* Verified at `create-organization/index.ts` lines
56–59: `if (!response.ok) return null`.

**Ruling: accept, exactly as kimi specifies.** `accountTypeOf` returns three outcomes — the type, the
row is absent, the read failed — and a failed read answers 502 with a sentence saying the account
could not be read, never 409.

### B14 — `Caller.email` and `Caller.provider` are dead fields. ACCEPTED

**kimi, TypeScript slice [7] (low), quoted:**

> "`Caller.email` and `Caller.provider` are computed by `resolveCaller` and read by neither edge
> function — dead fields on a shipped type. […] `provider` in particular invites a future reader to
> believe the provider participates in a decision somewhere on the signup path, which is exactly the
> branch AT-001.03's comment (finding 3) imagines being caught."

Verified by searching both entry points and the shared module for `caller.`: four uses, all
`caller.id`. Both other fields are dead.

**Ruling: accept — delete them.** Speculative members are not carried, and the reviewer's second
point is the stronger one: a `provider` field on the caller type is a standing suggestion that the
provider participates in a decision, in an item whose central honesty problem is exactly that it does
not. `resolveCaller`'s comment already explains what Auth reports; the dead field adds nothing to it.
The leaf that needs either field adds it in one line.

### B15 — the contract says platform-admin provisioning is a service-role write. ACCEPTED

**terra, TypeScript slice [10] (low), quoted:**

> "The contract still says live platform-admin provisioning is a service-role write, contradicting
> the migration's deliberate removal of service-role INSERT privileges. A later implementation
> following this comment will either fail or restore the direct write path that bypasses the
> database's platform-admin guard."

Verified in `_contract.ts`: *"On the live stack this is a service-role write."* It is not, and
`draft-rulings.md` R2 is the ruling that established it is not — the ruling that specifically refused
to grant that privilege because doing so *"would have traded a real security property for a
documentation convenience."*

**Ruling: accept, and this is the most consequential of the low-severity findings.** A comment that
instructs a later reader to restore the exact write path a ruling removed is how a ruled defence gets
quietly undone. The comment is corrected to say what R2 established: provisioning is a direct
database operation by an operator, a narrower authority than the service role, and the service role
holds no INSERT anywhere in this schema.

### B16 — the fixture presents `proof-local.txt` as produced evidence. ACCEPTED

**terra, TypeScript slice [11] (low), quoted:**

> "The fixture comment presents `proof-local.txt` as produced live-stack evidence even though this
> draft has not run the script or created that transcript."

True at the reviewed head. **This is the one finding the fix itself resolves**: this sitting runs step
7 and produces the transcript. The comment is corrected to name the transcript as what it is once it
exists, and the executor is instructed that if step 7 does not complete, the comment must be corrected
to say so rather than left standing.

### B17 — loop-tier assertions exercise in-memory Maps. ACCEPTED AS TRUE; ALREADY DISCLOSED, ONE COMMENT CORRECTED

**terra, SQL slice [4] (medium), quoted:**

> "AT-001.01's loop-tier predicate and return-sign-in assertions exercise in-memory Maps, not
> `public.has_platform_acknowledgment` or Supabase Auth."

**terra, SQL slice [5] (medium), quoted:**

> "AT-001.07's loop-tier green claims a provisioned admin authenticates even though provisioning and
> sign-in are fixture-only operations."

Both true, and both are the disclosed posture rather than a discovery: Finding B in the plan
establishes that the integration tier cannot go green for any requirement today, `_fixture.ts` opens
by saying the storage is a Map, and the claims table separates what the loop tier proves from what
step 7 proves. No reader can be misled by the plan.

**Ruling: accept as true, no code change, one comment corrected.** The exception is inside the test
itself, and terra is right about it. AT-001.07's body says the administrator is *"Provisioned the only
legal way — an authority the public never holds"*, which reads as a claim about the real system while
the line beneath it writes into a Map. The claims table assigns that clause to step 7(g), on the live
stack. The comment is corrected to say the loop tier proves the type is carried and the public path
refuses it, and that a real administrator really authenticating is (g)'s.

### B18 — the committed pull request body is false in three places. ACCEPTED

**terra, SQL slice [8] (low), quoted:**

> "The committed PR body still says the pull request contains only a plan, no code, and that
> `--wired` is unimplemented."

Verified, and there are three false statements, not two. `pr-body.md` line 4: *"This pull request
currently carries the plan only. No code exists yet."* Line 17: *"The **first edge function**"* —
there are two, and the second exists because the plan review required it. Lines 28–29: *"the
acceptance runner's `--wired` flag that would prove a screen works is not implemented yet"* — the flag
is implemented; it is the screen **driver** that does not exist, a correction the plan already made in
D1 and which never reached this file.

**Ruling: accept.** This is the item's public face and the first thing a human reviewer reads. It is
rewritten to describe what was built, and it will be rewritten once more at the merge ruling; that is
not a reason to leave a false one standing in between.

---

## PART C — THE FIVE SALVAGED LEADS FROM THE RUN THAT NEVER FINISHED

**These are not reviewer findings and are not ruled as such.** The kimi run on the SQL and
configuration slice exhausted its billing quota mid-run. Its output reached a draft finding list and
was cut off before any closing count line, so **no verdict was ever emitted** and nothing establishes
that the list was complete, ordered, or that the reviewer would have stood behind it. Treating it as a
gate result would be treating a reviewer's working notes as its conclusion.

**What I did instead, and it is stated so an auditor can check the method rather than the outcome: I
took each as a lead and verified it against the tree myself, at this head, and ruled on what I found —
not on what the notes claimed.** Where a lead turned out to duplicate a completed reviewer's finding,
it is ruled there and cross-referenced. Where it did not, the finding below is mine.

### L1 — stale "service-role write" comment in `_contract.ts`

Verified independently; identical to terra's TypeScript-slice finding [10]. **Ruled at B15.** No
separate ruling.

### L2 — raw `x-forwarded-for` into an `inet` cast

Verified; overlaps the four-reader IP finding but adds the `inet` cast, which no completed reviewer
stated in full. **Ruled at B3**, and the cast half is accepted there on its own merits: the parameter
really is `p_ip inet`, an unparseable header really does produce a 4xx, and line 71 really does
relabel that 409.

### L3 — nothing proves a service-role INSERT into `public.accounts` fails. ACCEPTED — MY FINDING, and the most valuable thing in the salvage

The lead reads: *"No check that a service-role direct INSERT into accounts fails — the F6 "only door"
claim is asserted in comments but unproven by the evidence script."*

**Verified, and it is a distinct gap from the one the draft sitting already caught.** R4 was about a
skipped check counting as a pass. This is about a check that does not exist. `proof-local.ts` check
(e) attempts the insert with `returning.session?.accessToken ?? PUBLIC_KEY` — the **authenticated**
key. The **service-role** key is never used for a write attempt anywhere in the script.

Now put that beside what the record claims. `draft-rulings.md` R2, the plan's step 7(g), and the
migration's own comment all assert something considerably stronger than check (e) shows: *"there is no
key-reachable write path into `public.accounts` at all, so `complete_signup`'s refusal is not a second
guard beside a first — **it is the only door**."* That sentence covers the service role, which holds
`select` and nothing else by design (migration line 328). **The load-bearing claim of this item's
central security argument has no evidence behind it.**

**Ruling: accept.** A check is added: a direct `POST /rest/v1/accounts` with the **service-role** key
must be refused, and the account must not exist afterwards. It is expected to fail at the privilege
layer rather than the policy layer — the service role has no INSERT grant, so `permission denied for
table accounts` — and the check asserts that message, because naming the layer is the difference
between this proof and check (e)'s. Without it, the strongest sentence in the item's record is an
assertion; with it, it is a measurement.

That a salvaged, unruled lead produced the item's most valuable missing check is worth recording
against the coverage shortfall in Part 0.

### L4 — the two new Google environment variables are undocumented. ACCEPTED — MY FINDING

Verified. `supabase/config.toml` now reads `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` and
`env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)`. Neither name appears in `.env.example`, whose stated
purpose is *"This file lists the variable names only, with empty values, as the shape to copy."*

**Ruling: accept.** Both names are added, with a line saying the secret belongs in the git-ignored
`.env.local` and never in the tracked `.env` — which is that file's own standing rule — and that a
placeholder is enough to start the stack but is not a credential and proves nothing about the
handshake. Anyone bringing this stack up after the merge needs this, and the founder-manual step of
creating the OAuth client needs somewhere obvious to land.

### L5 — the tally counts a skipped check

Verified; identical to terra's TypeScript-slice finding [9] and to `draft-rulings.md` R4. **Ruled at
B11.** No separate ruling.

---

## PART D — WHAT THE EXECUTOR DOES, AND WHAT THE CLAIMS TABLE HAS TO SAY AFTERWARDS

Every accepted ruling above, plus the plan's own unmet done-criteria that the draft sitting
deliberately did not pursue: step 6's verification, step 7 against the live stack, and step 8's whole
verify surface. Those are not extras; they are plan steps.

**The claims table in `plan.md` section 4 changes in four places**, and no ruling may quietly widen
what a green claims:

1. **AT-001.01, "not proved"** gains that the acknowledgment records an address **as reported by the
   gateway chain, not an authenticated source address** (B3), and that the SQL predicate itself is
   proved only by step 7(h) and not at loop tier (B7).
2. **AT-001.03, "proved at loop tier"** is reworded to say the shipped path ignores the provider
   because it never receives one — not that a provider branch would be caught (B5).
3. **AT-001.07, "not proved"** gains that no client-reachable path returns an account's type, so the
   type is carried for the server and not for any browser (B4).
4. **A new row or note** records what the CORS preflight check proves — the local gateway — and what
   it does not: the hosted one (B1).

**Two rulings deliberately leave work undone, named here so neither is read as finished:** the
`x-forwarded-for` trust model (B3c) belongs to whoever lands the hosted deployment, and the
client-reachable account-type read (B4) belongs to the tenant-isolation deliverable or to the wiring
leaf's own `supabase/`-territory change.

**One ruling overturns a fact I recorded in the previous sitting** — B6 — and the correction is
written into `draft-rulings.md`'s verification table rather than left to contradict this file.
