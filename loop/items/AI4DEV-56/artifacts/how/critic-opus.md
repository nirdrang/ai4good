# Architectural critique — the write path, the Auth seam, and the acceptance harness

Read against the six admin-operations units. I used the explanation as a map and then read the
code. Where I disagree with the explanation I say so.

The architecture is good. The pure-decision modules, the definer-only write path, the
service-role-holds-no-INSERT posture and the two-tier harness are coherent and unusually well
stated. My findings are not about that quality. They are about six units that ask this
architecture for things it has no place to put, and about two checks that will report green for
properties they cannot see.

## Findings

### 1. [structural] The tree owns no boundary in front of Supabase Auth, and three of the six units need one

**Components**: `supabase/functions/*/index.ts` (six routes, all POST, all behind Kong),
`supabase/config.toml` `[auth]` and `[auth.rate_limit]`, GoTrue's own endpoints, the harness
helpers in `tests/at/harness/live-stack.ts`.

**Finding**: Every product boundary this tree owns sits *behind* Auth. A request reaches an edge
function only after the platform has verified the JWT, and the function then asks Auth who the
caller is. Nothing this tree ships sits *in front of* Auth. Three criteria in this run need
exactly that placement:

- Unit 5 must refuse `DELETE /auth/v1/user/identities/{identity_id}`. That is Auth's endpoint.
- Unit 3's AT-001.34 must throttle `POST /auth/v1/token?grant_type=password`. Also Auth's.
- Unit 2's AT-001.30 says writes are rejected "immediately" on deactivation. A product column
  achieves that per request; ending the account's live sessions does not, and that is Auth's too.

The explanation lists four candidate placements for unit 5 and calls the trigger on
`auth.identities` "the only in-tree placement". I agree with the enumeration and disagree with the
conclusion being framed as a placement problem for one unit. It is one architectural fact that
three units hit independently, and the measurements in this item settle three of its corners.

**Evidence**:
- `supabase/config.toml` lines 206 to 212 record the open unlink surface as seen and unguarded.
  `enable_manual_linking = true` at line 212 is what opens it.
- No route fronts Auth. `supabase/config.toml` lines 490 to 506 list six functions; the three
  write entries call `callDatabaseFunction`, and none of the six touches `/auth/v1/*` except
  `resolveCaller`'s read (`supabase/functions/_shared/edge.ts` lines 168 to 210).
- `loop/items/AI4DEV-56/artifacts/measure/auth-ban-probe.txt` line 6: after an admin ban, the
  same unexpired access token still answers `GET /user` with HTTP 200. Lines 7 and 8 show refresh
  and a new password grant refused with `user_banned`. So a ban closes the front door and leaves
  the current holder inside for the token's remaining life. A ban is not an "immediately".
- `loop/items/AI4DEV-56/artifacts/measure/unit6-signin-rate-limit.txt`: 45 password grants in
  0.66 seconds, 45 times HTTP 400, zero 429, no rate-limit headers. The vendor limiter as this
  stack runs it does not throttle sign-in.
- `loop/items/AI4DEV-56/artifacts/measure/hook-push-probe.txt` lines 11 to 13: the CLI *does*
  push `GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED=true` and its `pg-functions://` URI.
  This is the one real placement in front of Auth that the tree can own — and it is a database
  function, not TypeScript.
- The first migration already refused this class of object for `auth.users`:
  `supabase/migrations/20260808120000_...sql` lines 8 to 12, "a trigger here would be a footgun
  whose failure mode is a 500 inside Supabase Auth".
- The harness cannot even attempt unit 5's proof today. `tests/at/harness/live-stack.ts` line 82
  is `authPost` (POST only) and line 105 is `restGet` (GET only). No DELETE helper exists.

**Impact**: The one placement that exists — a `pg-functions` Auth hook, or a trigger inside a
vendor-owned schema — sits in SQL, outside the shared-decision modules, outside anything the loop
tier can import, and outside CI. So the tree's central claim ("the loop-tier green grades shipped
product code") does not hold for whatever unit 3 and unit 5 ship there. The designer should treat
this as one decision made once for all three units, not three unit-local choices. Concretely: two
of the three corners are now measured (a ban does not end a live token; the local limiter does not
throttle), and the third — whether `postgres` holds TRIGGER on `auth.identities`, and whether a
RAISE there surfaces as a 4xx or a 500 — is still a measurement that must precede any migration.

---

### 2. [structural] AT-001.29's "covers all global types" is unsatisfiable on the current write surface

**Components**: the three write routes, `ngoOnlyActionAllowed`
(`supabase/functions/_shared/accounts.ts` lines 336 to 345), `orgAdminActionAllowed`
(`supabase/functions/_shared/memberships.ts` lines 97 to 115), the NGO-only membership trigger,
`public.complete_signup`.

**Finding**: The criterion demands an enumerated inventory of write endpoints, each with an
*active, otherwise-authorized control account of the matching type* that succeeds, and it
explicitly rules out a rejection that comes from "an ordinary role/lifecycle precondition". Take
the three routes and the three global types in turn:

- **Platform admin.** It can perform no write at all today. `ngoOnlyActionAllowed` refuses it by a
  stated reading of AT-001.06. It cannot reach `orgAdminActionAllowed` either, because it can
  never hold a membership row: `org_membership_grantee_must_be_ngo` refuses any grantee whose type
  is not `ngo`. So there is no "active control that succeeds" for this type.
- **Volunteer.** Its only successful write is its own `complete-signup`, once. `create-organization`
  and `update-organization` refuse it for role reasons. The only volunteer-shaped write in the tree
  is `sendDiscoveryMessage`, which is a loop-only stand-in over `discoveryMessageAllowed` and is
  `capability-pending` at integration.
- **`complete-signup` as an inventory entry.** A deactivated account has, by definition, completed
  signup. A second attempt is refused by the primary key, with its own sentence
  (`supabase/migrations/20260808120000_...sql` lines 195 to 202). That refusal is precisely the
  "ordinary precondition" the criterion forbids as evidence.

**Evidence**: `accounts.ts` 336-345 (`platform_admin` refused); `20260811125000_...sql` lines 79 to
84 (`per-NGO roles are NGO accounts only`, raised for every non-`ngo` type including
`platform_admin`); `20260808120000_...sql` lines 195 to 202 (the duplicate-completion refusal);
`tests/at/expected/req-001.json` line 75 (`sendDiscoveryMessage` is capability-pending at
integration).

**Impact**: Unit 2 has three options and none is free. It can build write routes for a volunteer
and a platform admin, which means landing other requirements' surfaces early — the thing this tree
refuses everywhere else. It can lean on unit 1's new transfer route as the platform admin's only
write, which couples unit 2's id to unit 1's design and gives the admin arm exactly one endpoint.
Or it can declare part of AT-001.29 with a named capability, the AT-001.24 shape. This choice
should be made before the arena, because it decides how large unit 1's route has to be.

---

### 3. [structural] There is no shared "load the caller's account facts" step, so "one mandatory boundary" has nowhere to sit

**Components**: `Caller` and `callerFromAuthAnswer` (`supabase/functions/_shared/caller.ts` lines
58 to 119), `resolveCaller` (`edge.ts` 168 to 210), `accountTypeOf`
(`create-organization/index.ts` lines 55 to 72), `roleIn` (`update-organization/index.ts` lines 60
to 81).

**Finding**: `Caller` deliberately holds two fields, and only what Auth answers. Every fact about
the *account* is therefore fetched again, per route, by hand. `create-organization` writes its own
`fetch` for `accounts.account_type`. `update-organization` writes a second, differently shaped
`fetch` for `org_memberships.role`. Both live in files no type-checker covers. `complete-signup`
reads nothing, because the account row does not exist yet.

A lifecycle gate is a third fact of the same kind. Placed "after `resolveCaller` in each
`index.ts`" it becomes a third bespoke `fetch` in two routes and an impossible one in the third.
There is no `CallerAccount` shape, no single loader, and no place where the three facts arrive
together.

**Evidence**: `caller.ts` 58-69 (two fields, with the header stating the design intent);
`create-organization/index.ts` 55-72 and `update-organization/index.ts` 60-81 — two hand-rolled
service-role reads with two different three-way outcome types (`AccountTypeLookup`, `RoleLookup`)
that differ only in payload; `edge.ts` header line 11, "NO TYPE-CHECKER COVERS THIS FILE".

**Impact**: The manifest's word is "ONE mandatory boundary every write route registers with"
(`loop/decomp/req-001.md` line 43). With the current shape, "one boundary" can only mean "one
function every route remembers to call", which is a convention, not a structure. The unit's own
item text says the conformance check is the point of the leaf — and a check over a convention is
what finding 4 is about. The cheapest structural fix is a single shared loader that returns the
caller's account facts once (type, lifecycle state, and the target-organisation role where one is
named), consumed by all three routes; that also collapses the two near-duplicate lookup types. It
is a larger change than a gate function, and it is the one that makes "one boundary" true.

---

### 4. [structural] The conformance check can only prove registration; the layer that enforces universally is the one CI never grades

**Components**: `.github/workflows/ci.yml` (loop tier only), `tests/at/suites/req-001/_policy-scan.ts`
and `_source-scan.ts` (the text-oracle precedents), the SECURITY DEFINER functions, the
`loop/decomp/req-001.md` D6.L2 line.

**Finding**: Two facts collide.

First, the definer body is the only universal choke point for product writes. `service_role` holds
no write privilege on any public table, so every product write and every raw RPC passes through a
definer. That makes the definer the right place for the gate.

Second, CI runs the loop tier and nothing else. The definer body runs only at the integration tier.
So a gate in the definer is a gate CI cannot see. The manifest explicitly asks for the opposite:
"the test stays wired in CI".

The available CI-tier oracle is a static text scan over `supabase/functions/*/index.ts`. A text
scan can prove that a route names the gate. It cannot prove that the route *calls* the gate, that
it calls it *before* the write, or that it acts on the answer. A route that imports the gate and
ignores it passes every check in this repository.

**Evidence**: `.github/workflows/ci.yml` lines 170 to 192 run `at:verify --tier loop --expect` and
nothing else; the integration tier appears nowhere in the workflow.
`loop/items/AI4DEV-56/artifacts/measure/unit4-privileges-after-reset.txt` lines 10 to 27 show
service_role holding SELECT on two tables and nothing else anywhere.
`loop/decomp/req-001.md` line 43 carries the "stays wired in CI" clause.
`_policy-scan.ts` and `_source-scan.ts` are both text oracles over files.

**Impact**: The leaf's stated purpose — "without it the test passes today and quietly stops meaning
anything later" — is only half reachable with a text scan. Two honest shapes exist and the designer
should pick one deliberately rather than discover the gap at gate time. Either the gate lives in
the shared decision module, where the loop tier grades the real function and the scan proves each
route imports it, with a definer raise as a backstop that only integration sees; or the gate lives
in the definer and the loop tier grades a mirror, which reintroduces the two-copies defect
`accounts.ts` exists to delete. Say which, and say what the scan does and does not prove, in the
same sentence.

---

### 5. [structural] "History preserved" and "append-only" are properties of nobody calling delete, not properties of the schema

**Components**: `public.accounts`, `public.acknowledgments`, `public.org_memberships`, the Auth
admin API, and whatever audit table unit 3 adds.

**Finding**: The whole history chain cascades from one `auth.users` row.
`accounts.id` references `auth.users(id) on delete cascade`. `acknowledgments.account_id` and
`org_memberships.account_id` both reference `accounts(id) on delete cascade`. One
`DELETE /auth/v1/admin/users/{id}` removes the account, its memberships and every acknowledgment
it ever signed.

That endpoint is reachable with the service-role bearer — the same authority
`provisionPlatformAdmin` already uses, and the same key every edge function holds. So AT-001.25's
"all history preserved" and AT-001.33's "an append-only audit record that cannot be altered or
deleted" are, in the schema as it stands, statements about restraint.

Deactivate-without-delete is the right answer and the explanation reaches it. My point is narrower
and it is about the table unit 3 has not written yet: an audit table whose actor column copies the
existing style — `references public.accounts (id) on delete cascade` — is append-only until
someone deletes the actor, at which point the audit of that actor's acts disappears. Matching
existing style is a project rule, and here it produces the wrong answer.

**Evidence**: `20260808120000_...sql` line 39 (`accounts.id … on delete cascade`), line 59
(`org_memberships.account_id … on delete cascade`), line 74 (`acknowledgments.account_id … on
delete cascade`); `_contract.ts` lines 794 to 807 on `provisionPlatformAdmin` and the authority it
uses; the explanation's own row-by-row table names "Rows deleted, history gone" for the cascade
column and does not carry it forward to the audit table.

**Impact**: Two of the run's ten ids assert a durability property the schema does not have. The
audit table needs an actor column that is not a cascading foreign key — a plain `uuid` plus a
denormalised actor label, in the same spirit as `acknowledgments.signer_name` and `signer_title`,
which already survive a membership repoint for exactly this reason. Whether the cascade on the
existing tables is also wrong is a separate question; it is not this run's, and it should be named
in "Not done here" rather than fixed in the diff.

---

### 6. [concern] The only catalog check that runs in CI cannot see default privileges, and the run adds two or three new tables

**Components**: `tests/at/suites/req-001/_policy-scan.ts` (static, loop tier, in CI),
`tests/at/suites/req-001/_integration.ts` `assertTenantCatalog` (live, integration tier, not in
CI), unit 4's subject.

**Finding**: The static scan models explicit `grant` and `revoke` statements. It does not model
`pg_default_acl`. It requires `revoke all … from anon, authenticated` after every `create table`
(`no-baseline-revoke`), and it requires nothing at all about `service_role`; the only service_role
rule is that no *explicit grant* of a write privilege exists.

The measurement in this item shows what a new public table gets with no statement at all:
`anon=Dxtm`, `authenticated=Dxtm`, `service_role=Dxtm`. `D` is TRUNCATE. So a new audit table that
carries the anon-and-authenticated baseline revoke — passing the scan — still leaves `service_role`
holding TRUNCATE on it, from the default ACL, invisibly. The service-role key is the key every edge
function holds.

Today's tables are clean only because `20260906120000_...sql` lines 50 to 52 revoke from
`service_role` by hand. Nothing makes the next migration do the same.

**Evidence**: `_policy-scan.ts` line 188 (`WRITE_PRIVS`, which also omits `references` and
`trigger`), lines 457 to 462 (the baseline check names `baselineAnon` and `baselineAuthenticated`
only), lines 471 to 480 (the service_role rule reads modelled grants only);
`loop/items/AI4DEV-56/artifacts/measure/unit4-privileges-after-reset.txt` line 31 (the default ACL);
`_integration.ts` lines 181 to 182 (the live check pins the exact set, and runs at integration
only).

**Impact**: This is the exact residue class unit 4 was filed about, and it returns with the first
new table units 1 and 3 create. AT-001.33's "cannot be deleted" can be CI-green and false on the
running stack. The brief expects unit 4 to reduce to "a proof and a record" — that is true of
today's six tables and false of tomorrow's. The cheapest correction is one line of scan: require a
baseline `revoke all … from service_role` too, and add `references` and `trigger` to `WRITE_PRIVS`.
That turns unit 4 from a record into a check, and it is the smallest change that makes unit 4 worth
building at all.

---

### 7. [concern] The catalog expectation is hand-written in three lists across two files, and its posture vocabulary has no word for an audit table

**Components**: `TENANT_CATALOG` (`_policy-scan.ts` lines 21 to 28), `SERVICE_ROLE_SELECT` and
`VIEWER_FUNCTIONS` (`_integration.ts` lines 164 to 165).

**Finding**: Three hand-maintained lists must agree with each other and with the schema. Adding an
audit table and an escalation-contact table means editing all three, in two files, in two different
shapes. Nothing derives from anything.

Worse, `TenantPosture` has two values and neither describes an audit table.
`tenant-isolated` forces `authenticated` to hold exactly `{select}` and at least one policy.
`unreachable-by-client-roles` forces `authenticated` to hold nothing. An append-only audit table
that a platform admin may read is admin-scoped, not tenant-scoped. Declaring it `tenant-isolated`
makes the posture name a false statement about the table; declaring it
`unreachable-by-client-roles` means no admin screen can ever read it without changing the posture.

**Evidence**: `_policy-scan.ts` 19 to 28 (the type and the catalog); `_integration.ts` 164 to 165
and 175 to 194 (the second and third lists, and the exact-set assertions built on them).

**Impact**: Two or three new tables in this run, each touching three lists. The posture vocabulary
should either gain a third value that says what an admin-only table is, or the audit table should
be declared `unreachable-by-client-roles` and read through a definer, the way
`read_public_project` already serves the public page. The second is smaller and matches an existing
pattern. Either way, decide it before writing the migration, because the posture choice decides
whether the table needs a policy and a `viewer_` helper.

---

### 8. [concern] Unit 1's transfer target cannot be provisioned by any product path

**Components**: `validateCompleteSignup` (`accounts.ts` lines 213 to 303), `public.complete_signup`,
`public.create_organization`, `org_membership_grantee_must_be_ngo`,
`org_memberships_one_seat_per_org_idx`.

**Finding**: An `ngo` account cannot exist without an organisation. `validateCompleteSignup`
requires a non-empty organisation name for `ngo` and `complete_signup` enforces it again.
`create_organization` also seats its caller as admin. The membership trigger requires the grantee
to be `ngo`. So the account a transfer moves ownership *to* must already be an `ngo` account, and
becoming one always mints an organisation.

That gives unit 1 two shapes, and both have a cost:

- The new contact completes an ordinary NGO signup first. They arrive holding a throwaway
  organisation nobody wanted, and the transfer then seats them in a second one.
- The transfer route writes `public.accounts` itself. That makes it a second account-minting path,
  parallel to `complete_signup`, which skips the acknowledgment capture that AT-001.19 and
  AT-001.39 make mandatory on every completion. A transferred-in NGO contact would then hold an
  organisation while having signed nothing.

**Evidence**: `accounts.ts` lines 224 to 228; `20260808120000_...sql` lines 183 to 186 and 297 to
302; `20260811125000_...sql` lines 79 to 84; `20260811130000_...sql` lines 41 to 42 (one membership
row per organisation, whoever holds it).

**Impact**: This is a product-shape fork, not an implementation detail, and it changes what unit 1
builds. It also decides whether AT-001.25's "ownership moves to the new account" is an UPDATE of
one `org_memberships` row — which `repointMembershipAsOperator` already proves works — or a larger
provisioning flow. Settle it with the founder in the same message that asks about the virtual-key
and concierge clauses.

---

### 9. [concern] Lifecycle is account-level; the contact is organisation-level; the transfer's blast radius exceeds its subject

**Components**: `public.accounts` (one row per auth user, one global type), `public.org_memberships`
(composite primary key, one seat per organisation), AT-001.25, RM-14.

**Finding**: AT-001.25 deactivates "the old account". But an account may hold seats in several
organisations: the composite primary key exists for exactly that, and `create-organization` mints a
second organisation for an account that already has one. So transferring the contact of NGO X
deactivates an account that may still be the only seat of NGO Y and NGO Z. Those organisations lose
their contact as a side effect of a transfer that never named them.

There is no per-organisation contact concept separate from the account. The lifecycle column the
run is about to add sits on `accounts`, which is the wrong grain for a criterion whose subject is
one organisation.

**Evidence**: `20260808120000_...sql` lines 53 to 63 (the composite key and its stated multi-NGO
intent); `create-organization/index.ts` (a second organisation for an existing `ngo` account);
`20260811130000_...sql` lines 41 to 42 (one seat per organisation, which is what makes the transfer
an UPDATE rather than an INSERT).

**Impact**: In v1 most accounts hold one organisation, so this will not show up in a test. It will
show up the first time an NGO account creates a second organisation. The design should say
explicitly whether deactivation is account-wide (and therefore that a transfer refuses when the old
account holds other seats), or whether the transfer moves the seat without deactivating anything
account-wide. The criterion's words say the former. The data model makes the former a wider act
than it reads.

---

### 10. [concern] The rate limit cannot be expressed in the shared-decision pattern this tree rests on

**Components**: `supabase/functions/_shared/accounts.ts` and `memberships.ts` (the purity
constraint), the loop fixture's mirror ledger, GoTrue's `/token` endpoint, `service_role`'s
privileges.

**Finding**: Every shared decision module states the same two constraints: no non-relative imports
and no Deno global, and "NO I/O, NO CLOCK, NO RANDOMNESS. Every function here is pure." A rate limit
is a clock plus a counter store. It cannot be a pure function of its arguments unless the caller
supplies both the attempt history and the current time — and there is nowhere to keep the attempt
history: `service_role` holds no INSERT on any table, so a counter table needs a new definer, which
drags in findings 6 and 7.

The enforcement point compounds it. Sign-in is `POST /auth/v1/token`, which no edge function fronts
(finding 1). The one placement measured available is the password-verification hook, which is a
database function; it fires for a user row that exists, so it cannot throttle attempts against
addresses that do not.

**Evidence**: `accounts.ts` lines 19 to 27 and `memberships.ts` lines 12 to 18 (the constraints, in
both modules' own words); `unit4-privileges-after-reset.txt` lines 10 to 27 (no INSERT anywhere);
`unit6-signin-rate-limit.txt` (the vendor limiter does not throttle here);
`hook-push-probe.txt` lines 11 to 13 (the hook is pushed).

**Impact**: AT-001.34 has no shape that keeps the tree's central claim intact. Whatever ships will
either be SQL the loop tier cannot grade, or a fixture-side counter with no product code behind it —
which the fixture's own header forbids in so many words, because it requires every mirror to carry
a live binding or an explicit UNBOUND label. The honest third option is `capability-pending` with a
named capability, and unit 6's measurement is already the record that justifies it. Decide this
before unit 3 starts, exactly as the brief's fact 9 says.

---

### 11. [observation] Unit 1 lands a write route one commit group before the boundary that route must register with

**Components**: the brief's build order, unit 1's transfer route, unit 2's gate and conformance
check.

**Finding**: The brief says to build the units in order, each green before the next starts. Unit 1
adds a fourth write route. Unit 2 then adds the mandatory boundary and a check that fails any
unregistered write route. So unit 2's first act is to fail unit 1's route and reopen it.

**Evidence**: `loop/items/AI4DEV-56/brief.md` lines 46 to 68 (unit order) and the D6.L2 manifest
line; unit 2's item text: "a conformance check fails any route that is not registered".

**Impact**: Small but real. Either unit 1 anticipates the gate — designing its interface a commit
group early, which is what "design once for the whole subtree" is for — or the unit-2 commit group
edits unit-1 files and the per-unit green loses some of its meaning. Naming the gate's interface in
the design, before unit 1's code, costs nothing and removes the churn.

---

### 12. [observation] Every new caller fact costs a round trip, and the token-claim option was declined once already

**Components**: `resolveCaller`, `accountTypeOf`, `roleIn`, `[auth.hook.custom_access_token]`.

**Finding**: `update-organization` today makes three network calls before it writes: Auth's
`/user`, the membership read, and the RPC. Add a lifecycle gate and it makes four. The account type
is not in the JWT because `[auth.hook.custom_access_token]` is commented out and the last merge
chose not to add it.

**Evidence**: `update-organization/index.ts` lines 86 to 124; `supabase/config.toml` lines 325 to
333; the tenant-isolation merge's own "Not done here" list names the token claim.

**Impact**: Not a problem at this scale, and the decision to keep facts out of the token is
defensible — a claim in a token is a cached copy of a row, and a deactivation that must take effect
"immediately" is exactly the case where a cached copy is wrong. That is worth stating in the
design, because a reader looking at four round trips will reach for the hook, and AT-001.30's
"immediately" is the reason not to. If the shared account-facts loader from finding 3 lands, the
four calls become three and the question goes away for this run.

---

## What I did not find

The pure-decision split (`accounts.ts`, `memberships.ts`, `caller.ts` on one side, `edge.ts` on the
other) earns its keep, and the reason is stated and measured rather than asserted: those modules
are the only part of the write path any type-checker covers. The definer-only write path with no
table privileges for `service_role` is the strongest single property in this tree, and it is what
makes a gate in the definer universal. The two refusal kinds in `memberships.ts` are a good example
of a type carrying the thing a test needs to distinguish. The `AtPending` / `capability-pending`
declaration shape is a genuinely good answer to "how do you keep a red honest", and the
AT-001.24 precedent gives this run a ready shape for the two clauses whose surfaces do not exist.

None of my findings asks for a rewrite. Findings 3 and 6 ask for one new small structure each;
the rest ask for a decision to be made deliberately and written down before the arena rather than
discovered inside it.
