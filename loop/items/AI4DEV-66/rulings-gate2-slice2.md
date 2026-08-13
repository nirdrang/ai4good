# Gate 2 rulings, slice 2 - AI4DEV-66 (cross-organisation denial, no existence oracle), batched with AI4DEV-67 (assigned volunteer, admin, stranger)

Written by the FIX AND GOAL sitting for slice 2, orchestrator on **opus @ max**, 2026-08-13.

**THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD.** The founder ruled (relayed 2026-08-12,
restated to this sitting 2026-08-13) that **every orchestrator sitting of this item runs as
`orchestrator-opus` at opus/max effort** - plan, draft, fix-and-goal, and the FIRST audit - not only
the merge and audit-re-run sittings that are opus by design. This is a deliberate founder choice for
this run. It is **not** a sign that fable has no credit.

## The panel

Two readers, each blind to the other, each handed a byte-identical prompt file (15776 bytes each).

| reader | lane | pin | verdict line | evidence in the record |
|---|---|---|---|---|
| terra | codex | `gpt-5.6-terra`, effort max, sandbox read-only | `CODE REVIEW: 7 FINDINGS` | `artifacts/gate2-slice2-terra.raw.txt`, `.distilled.md`, `.stderr.log` |
| flash | opencode | `opencode-go/deepseek-v4-flash --variant max`, agent `reviewer-flash` | `CODE REVIEW: 1 FINDING` | `artifacts/gate2-slice2-flash.raw.txt`, `.distilled.md`, `.toolcalls.md`, `.identity.md` |

**Eight findings. Six adopted, two dismissed with written reasons.** Three of the six are adopted
with a remedy different from the one the reader proposed.

**THE PANEL DID NOT CONVERGE THIS TIME, and that is itself worth recording.** Slice 1 converged
twice on five distinct defects. Here the two readers found eight distinct things and no two of them
are the same defect. Flash's single finding is in a file slice 2's diff does not touch - it read
past the change-set into the item's own slice-1 code and found a sentence slice 2's own dictation
made misleading. That is the panel working, not the panel disagreeing.

## Evidence checks I made before ruling

These are mine, not the readers', and they are what several rulings below turn on.

1. **THE DEVELOPER SEAT CARRIES NO ACCOUNT-TYPE GUARD AND THE MEMBERSHIP SEAT DOES.** This is the
   measurement that decides ruling 1, and neither reader made it.
   `20260811125000_org_membership_ngo_only_and_organization_rename.sql:52` ships
   `public.org_membership_grantee_must_be_ngo()`, a trigger function that refuses a membership row
   for an account that is not an NGO. `20260811130000_single_seat_org_and_single_developer_projects.sql:61`
   declares `assigned_volunteer_id uuid references public.accounts (id) on delete set null` and its
   only trigger, `public.project_seat_holds_one_developer()`, enforces the SINGLE-seat invariant and
   says nothing about the seat holder's account type. **So the two seats are not symmetric.** Slice
   1's gate-2 ruling 2 recorded the organisation-branch divergence between
   `viewer_is_org_member` and `tenantReadAllowed` as a fact to keep; that divergence is theoretical,
   because the database will not let a non-NGO account hold a membership row at all. The
   volunteer-branch divergence is not theoretical, because nothing stops any account type sitting in
   a developer seat.
2. **The edge surfaces read with the SERVICE ROLE, so they exercise no policy.**
   `supabase/functions/_shared/edge.ts:339-345` - `readRows(supabaseUrl, serviceRoleKey, path)` sends
   `apikey: serviceRoleKey` and `Authorization: Bearer ${serviceRoleKey}`. Terra's finding 5 rests on
   this and it is exactly right: the administrator's two dashboard reads and two workspace reads
   prove nothing about the four platform-admin policies, because row-level security is not consulted
   on that path at all.
3. **`src/router.tsx` EXISTS.** Sixteen lines, `createRouter({ routeTree, ... })` over
   `./routeTree.gen`. So `route-visibility.ts:31`'s clause "because there is no router" is FALSE at
   this head. What IS true is the narrower thing: no router consults `ROUTE_VISIBILITY`, and there is
   no sign-in screen to redirect to. Terra found this; the wording of its finding puts it last, and
   it is the most serious half.
4. **The double-underscore rule describes a convention this router does not have.**
   `src/routes/README.md:18-19` documents `_layout.tsx` - ONE underscore - as the layout route, and
   `__root.tsx` as the app shell. `route-visibility.ts:65-73` says the DOUBLE underscore "is this
   router's convention for a layout rather than a route" and offers `admin/__layout.tsx` as an
   example. No such convention exists. The BEHAVIOUR is still the one the draft sitting ruled
   (S2-A, and PHASE-STATE item [c]): a single-underscore layout file is deliberately not exempt and
   must be declared, which is the fail-closed direction. Only the description is wrong.
5. **The live adapter really does send a retained bearer token after `signOut`, deliberately, and its
   own comment says so.** `_live.ts`'s `signOut` (near line 623) carries the heading "THE CACHED
   TOKENS SURVIVE THE LOGOUT, DELIBERATELY", and explains that deleting the entry made the revocation
   clause untestable because `tokensOf` threw client-side before any request left the process.
   `dataApiGet` (line 442) then sends `Authorization: Bearer ${accessToken}` for any non-null
   session. **So terra's finding 7 is not an unverified runtime claim in its important half - it is
   settled by reading**, and what it refutes is a stated REASON in `_fixture.ts`'s `dataApiRead`
   comment: "neither carries a user, so PostgREST resolves the request to `anon`". A caller whose
   session ended DOES carry a user's token at the live tier.
6. **Adopting ruling 3 breaks none of the six existing conformance selftest cases.** I checked each
   against `table()`'s defaults in `shipped-catalog-conformance.selftest.ts:40-46`
   (`rowLevelSecurity: true`, and each case sets `selectGrantedTo: ['authenticated']` where it
   matters), so every `toHaveLength(1)` assertion still holds after two checks are added. That is why
   ruling 3 can be adopted without re-opening the file's other cases.
7. **The witness for the grant arm cannot see a grant to `PUBLIC` at all, twice over.**
   `_live.ts`'s `publicSchemaCatalog` reads `information_schema.role_table_grants` AND filters
   `grantee in ('anon','authenticated')`. `_contract.ts:423`'s own field comment says
   `selectGrantedTo` is "the CLIENT roles holding `select` on it - `anon` and `authenticated` only".
   So terra's finding 2 is right about the instrument as well as about the rule.

---

## [1] terra, high - the assigned-volunteer policy admits any assigned ACCOUNT, not only a volunteer

> claim: "The assigned-volunteer policy admits any assigned account, not only an account of type
> `volunteer`."
> why it matters: "`assigned_volunteer_id` only has an FK to `accounts`; an NGO account assigned to a
> foreign project can read it through the Data API, while `tenantReadAllowed` denies that same
> account at the edge surface. Verify by assigning an NGO account to a project in another
> organisation after applying the migration, then issuing its REST read."
> unverified-runtime-claim: yes

**ACCEPT. REJECT the proposed settlement - the integration tier is blocked and one attempt is spent
- and settle it the way this item has settled every question of this shape: REMOVE THE CONDITION
rather than measure it.** That is gate-1 ruling 4's posture and gate-2 ruling 1's posture, applied a
third time.

**The defect is real and it is settled by reading, not by running.** The policy is
`using (assigned_volunteer_id = (select auth.uid()))` on `public.projects`, to `authenticated`. The
shipped decision module requires `accountType === 'volunteer'` before it grants the project scope
(`visibility.ts:193-194`). The column is a bare foreign key to `public.accounts` with no type
constraint and no trigger (evidence check 1). So any account type placed in a developer seat reads
that project row through the Data API and is refused the same project at the edge surface.

**Why this is not slice 1's recorded asymmetry wearing new clothes, which is the objection I had to
answer before adopting.** Slice 1's gate-2 ruling 2 recorded that `viewer_is_org_member` admits any
account holding a membership row while `tenantReadAllowed` also requires an NGO account type, and
kept it. That asymmetry cannot be reached: `org_membership_grantee_must_be_ngo()` refuses the write
that would create it. **The developer seat has no such guard.** One divergence is closed at the
source and the other is open, and only measurement tells them apart.

**Why it is worth a policy clause rather than a residual.** AT-001.21's own claim is that acting in
one organisation grants nothing in another. An NGO account of one organisation, seated in another
organisation's project, reads that foreign project's row at the Data API - which is this item's
primary claim, contradicted at the layer the criterion calls "direct API/ID probing". No product path
can create that state today (decision H: no product path assigns a volunteer), so nothing is
exploitable now. A shipped policy is not judged by today's call sites.

**THE FIX, DICTATED.** In `supabase/migrations/20260813120000_tenant_visibility_volunteer_and_admin.sql`
only:

1. Add a second helper immediately after `public.viewer_is_platform_admin()`, in the SAME posture the
   file already uses - `language sql`, `stable`, `security definer`, `set search_path = ''`, every
   name schema-qualified, the enum value cast as `::public.account_type`, then
   `revoke execute on function public.viewer_is_volunteer() from public;` and
   `grant execute on function public.viewer_is_volunteer() to authenticated, service_role;`

   ```sql
   create function public.viewer_is_volunteer()
   returns boolean
   language sql
   stable
   security definer
   set search_path = ''
   as $$
     select exists (
       select 1
         from public.accounts a
        where a.id = (select auth.uid())
          and a.account_type = 'volunteer'::public.account_type
     );
   $$;
   ```

   Give it a `comment on function` in the same voice as the platform-admin one.
2. The policy becomes
   `using (assigned_volunteer_id = (select auth.uid()) and public.viewer_is_volunteer())`.
3. **The comment above the policy carries the measurement, because the next reader will ask why the
   clause is there.** State: the seat is a bare reference to `public.accounts` and no constraint or
   trigger restricts the seat holder's account type; `public.org_memberships` HAS such a guard
   (`org_membership_grantee_must_be_ngo`, migration of 2026-08-11) and the developer seat has none;
   so the policy states the type itself rather than inheriting an invariant the schema does not
   enforce. Say also that this makes the Data API no more permissive than `tenantReadAllowed`'s
   project branch, which is decision C's whole posture - both layers enforce, so both must agree.
4. **Why the helper and not an inline subquery** - one sentence, the same reason the file already
   gives for `viewer_is_platform_admin()`: `public.accounts` carries row-level security with no
   policy, so a policy expression reading it as the querying role would see nothing and refuse every
   volunteer.

**THE THREE CONSEQUENCES, each dictated so none is left to the writer:**

- `tests/at/suites/req-001/_catalog-conformance.ts`: `KNOWN_POLICY_HELPERS` gains
  `'viewer_is_volunteer'`, and its comment stops saying "the two `security definer` functions the
  migrations ship" - there are three.
- `tests/at/suites/req-001/_fixture.ts`, `dataApiRead`'s `projects` branch: the assigned-developer
  predicate gains the caller's account type, mirroring the SQL statement by statement as S2-C
  requires - `(state.accounts.get(caller.id)?.accountType === 'volunteer' && row.assignedVolunteerId === caller.id)`.
  Its comment names the new conjunct and why the mirror carries it.
- `tests/at/harness/shipped-catalog-conformance.selftest.ts`: `REAL_SHAPED_CATALOG`'s
  `projects_select_assigned_volunteer` entry gains the conjunct in the deparsed style the file
  already uses - `` `((assigned_volunteer_id = ${OWN_UID}) AND viewer_is_volunteer())` ``. **It is a
  PREDICTION and residual 13 already says only the integration tier grades it**; this ruling widens
  that residual by one policy rather than adding a new one.

**WHAT THIS FIX IS PROVED BY: reading.** No test in this branch applies a migration. The loop tier
grades the fixture's mirror, which is why the mirror changes in the same commit. The integration tier
is the only thing that grades either, and it is blocked.

**AND A FILING CANDIDATE FOR THE FOUNDER, NOT BUILT HERE.** The real defect is one layer down: the
developer seat accepts any account type at WRITE time, where the membership seat does not. The sound
repair is a trigger on `public.projects` in the shape of `org_membership_grantee_must_be_ngo()`. That
changes a pre-existing table's write invariant, it belongs to the item that owns the developer seat,
and this item's decision H says only READ members are added. **Suggested at close-out; only the
founder creates items.**

---

## [2] terra, high - the conformance rule cannot see a grant to `PUBLIC`

> claim: "The catalog rule misses `GRANT SELECT ... TO PUBLIC`, treating it as no client grant."
> why it matters: "`CLIENT_ROLES` excludes `PUBLIC`, and the live witness uses
> `information_schema.role_table_grants`, which itself omits PUBLIC grants. A declared-unreachable
> table with a PUBLIC select grant and a public policy can therefore be exposed while conformance
> reports clean. [PostgreSQL documents that omission](https://www.postgresql.org/docs/15/infoschema-role-table-grants.html)."
> unverified-runtime-claim: no

**ACCEPT, and fix it at the INSTRUMENT rather than by widening a role list.**

Terra is right twice (evidence check 7), and there is a third thing it did not say which makes the
finding sharper: **the module is already internally inconsistent about `public`.** Line 103 says of
`CLIENT_ROLES` that "`public` reaches both, so it counts as reaching them", and `reachesClientRole`
and `reachesAuthenticated` both honour that for POLICY roles. The GRANT arm at line 188 uses
`CLIENT_ROLES.includes(role)` directly and does not. So one stated sentence is true of two helpers
and false of the third use, in one file.

**Why the remedy is not "add `PUBLIC` to `CLIENT_ROLES`".** That would fix the rule and leave the
witness blind, and the witness is the half that cannot report the row at all - the query filters
`grantee in ('anon','authenticated')` before the view's own omission even matters. A rule made able
to recognise a value it can never receive is a guard that looks like a check.

**THE FIX, DICTATED.** Ask the effective question instead of reading a grant catalogue.

1. `tests/at/suites/req-001/_live.ts`, `publicSchemaCatalog`: **drop the
   `information_schema.role_table_grants` query entirely** and derive `selectGrantedTo` from
   `has_table_privilege(<role>, c.oid, 'SELECT')` for `'anon'` and for `'authenticated'`, folded into
   the existing `pg_class` query. `has_table_privilege` answers whether the role holds `select` BY
   ANY ROUTE - a direct grant, a grant to `PUBLIC`, or role inheritance - which is the question the
   rule was always asking. Keep the resulting array sorted, as it is now, so the shape does not move.
2. The comment above it states what changed and why: a grant catalogue answers "who was named in a
   grant statement", and `role_table_grants` omits `PUBLIC` by documented design, so a table opened
   with `grant select ... to public` would have been reported as granted to nobody. Name that the
   measured reason rather than a preference.
3. `tests/at/suites/req-001/_contract.ts:423`: `selectGrantedTo`'s field comment becomes "the CLIENT
   roles that EFFECTIVELY hold `select` on it, by any grant including one to `PUBLIC`" and names the
   instrument.
4. `tests/at/suites/req-001/_catalog-conformance.ts`: `CLIENT_ROLES`'s comment is corrected to say
   what it now means - the two client roles the witness answers about - and the grant arm at line 188
   is left as it is, because with an effective-privilege witness it is finally correct as written.
   **Do not add `'public'` to `CLIENT_ROLES`**: after this change the witness can never emit it, and
   a branch nothing can drive is the thing this repository distrusts.

**What this does NOT fix, and the record says so.** No integration run has ever executed
`publicSchemaCatalog`, so this new query has never been sent to a database either. It replaces one
ungraded query with a better ungraded query. That is the standing merge blocker, not a new one.

---

## [3] terra, high - a tenant-isolated table is accepted with row-level security OFF

> claim: "A `tenantIsolated` table is accepted without requiring enabled RLS or an effective
> authenticated `SELECT` grant."
> why it matters: "Keeping the current policies but disabling RLS exposes every row to an
> authenticated reader, while omitting the grant denies the rightful tenant entirely; both shapes
> return no catalog problems."
> unverified-runtime-claim: no

**ACCEPT, exactly as proposed. This is the best of the eight findings.**

Clause 3 checks that a policy exists, that no policy is literally `true`, and that every policy names
a known helper or a declared key. It never asks whether row-level security is ON. **A policy on a
table with row-level security off is inert**, so the shape terra names - the four policies exactly as
shipped, `relrowsecurity` false - returns zero problems while every row is readable by any
authenticated caller. That is the same defect as `using (true)` reached by a different door, and
clause 2's unreachable arm already tests `table.rowLevelSecurity` for its own case, so the field is
present and the omission is an oversight rather than a limit.

The grant half is the mirror image and belongs with it: a `tenantIsolated` table with no effective
`select` grant to `authenticated` denies the rightful tenant everything, and every denial arm over
that table then passes while proving nothing. That is the identical failure gate-2 ruling 3 fixed
from the acceptance side in slice 1, seen from the catalog side - and the file's own case at line 223
already reasons that way about the policy-role half.

**THE FIX, DICTATED,** in `catalogProblemsAgainst`'s clause 3 in
`tests/at/suites/req-001/_catalog-conformance.ts`, before the existing per-policy loop:

- If `table.rowLevelSecurity` is not true, push a problem naming the table and saying that its
  `select` policies are inert and every row is readable by any caller holding the grant.
- If `table.selectGrantedTo` holds no effective `select` for `authenticated`, push a problem naming
  the table and saying the rightful tenant reads nothing, so every denial over it proves nothing.
- Extend the doc block's clause-3 paragraph (lines 144-146) to state both, in the same voice.

**AND BOTH BRANCHES GET A CASE, because a defensive branch nothing drives is what this repository has
learned to distrust** (gate-2 ruling 5). In `tests/at/harness/shipped-catalog-conformance.selftest.ts`
add two cases in the shape of the file's existing ones: a `tenantIsolated` table from
`REAL_SHAPED_CATALOG` with `rowLevelSecurity: false` and its policies unchanged, and one with
`selectGrantedTo: []` and its policies unchanged. Each asserts exactly one problem naming that table.
**I checked that the six existing cases still assert one problem each after this change** (evidence
check 6); if any of them moves, the executor reports it rather than adjusting the count.

---

## [4] terra, high - the trivially-open check only recognises the literal `true`

> claim: "The "trivially open" check only recognises literal `true`, so semantic tautologies pass
> when they contain an approved identifier."
> why it matters: "On `organizations`, `using (id is not null)` admits every row because `id` is a
> primary key, yet it is not literal `true` and satisfies `namesIdentifier(..., 'id')`; the
> conformance arm reports it clean."
> unverified-runtime-claim: no

**DISMISS. The claim is TRUE and the module already declares it, in the paragraph a reader meets
before reaching any code.** This is a rejection of the finding, not of the fact.

`_catalog-conformance.ts:35-38` says: "IT DOES NOT PROVE THAT A DECLARED PREDICATE IS CORRECT - that
a policy keys on the right column, or that the column it names is the tenant key it should be.
`using (org_id = org_id)` would satisfy clause 3 and expose every row." Terra's `using (id is not
null)` is the same class with a different spelling: a semantically open predicate that names an
approved identifier. Decision E states the same non-claim ("What the arm does NOT prove"), gate-1
ruling 8 dictated the check as "no `select` policy on it has a `qual` of `true`", and residual 12
already carries it to the merge ruling in terra's own terms.

**Three reasons no code changes.**

1. **There is no sound syntactic test for semantic openness.** Any strengthening would be a list of
   spellings - `is not null`, `x = x`, `>= '-infinity'` - and the next tautology is not on the list.
   A blacklist would make the arm LOOK stronger while staying trivially bypassable, which is the
   failure mode the module's own line 33 paragraph and gate-1 ruling 8 exist to avoid. A guard that
   exists without binding is worse than a stated non-claim.
2. **The sound instrument is a runtime one and it is already built.** A policy that admits every row
   is caught by the acceptance denial arms - a foreign tenant's keyed probe and unfiltered listing -
   which read as a real caller against a real database. The record calls that a bracket and not a
   proof, and says so in the merge ruling.
3. **Nothing here is a false stated fact**, which is the class this item treats as non-mergeable. The
   header claims the check finds a policy "that is not trivially open"; the paragraph two lines below
   narrows it precisely. Read together they are accurate.

**Terra's claim is recorded verbatim above and goes verbatim into the pull request**, per the
orchestrator contract's rule for a rejected finding, and residual 12 gains terra's sharper example
beside the existing one.

---

## [5] terra, medium - AT-001.40 drives ONE of the four platform-admin policies

> claim: "AT-001.40 exercises the platform-admin Data API policy only for `organizations`."
> why it matters: "The project successes use service-role edge functions, and catalog conformance
> accepts the pre-existing policies on `projects`, `org_memberships`, and `acknowledgments`; a
> missing or wrongly scoped platform-admin policy on any of those three tables would not fail this
> criterion."
> unverified-runtime-claim: no

**ACCEPT, exactly as proposed, and it is the same finding gate-2 ruling 3 adopted in slice 1 - one
positive control where four are needed - arriving on the other side of the boundary.**

The migration ships FOUR platform-admin policies (`organizations`, `org_memberships`, `projects`,
`acknowledgments`). AT-001.40's Data API arm reads ONE table
(`d-tenant-isolation.test.ts:632`, `_integration.ts:1777`). The dashboard and workspace successes
prove nothing about the other three, because those surfaces read with the service role and row-level
security is never consulted on that path (evidence check 2). So three shipped policies have no test
at the only layer where they act - which is exactly what gate-1 ruling 7 forbids in the sentence this
migration quotes in its own header: **a slice does not ship a policy branch it does not test.**

**THE FIX, DICTATED,** in BOTH AT-001.40 bodies - the loop body's arms (3) and (4) in
`tests/at/suites/req-001/d-tenant-isolation.test.ts` and `at00140`'s arms (3) and (4) in
`tests/at/suites/req-001/_integration.ts`. Keep the existing `organizations` assertions exactly as
they are and add the other three, in the same "both are present" style the arm already uses and for
the reason it already states - the integration database is shared by the whole run, so presence is
asserted and absence of anything else is not.

Arm (3), the administrator's unfiltered listing:

| table | mapped column | assertion |
|---|---|---|
| `organizations` | `id` | contains A's organisation and B's organisation (already present, keep as is) |
| `org_memberships` | `org_id` | contains A's organisation and B's organisation |
| `projects` | `id` | contains project A's id and project B's id |
| `acknowledgments` | `account_id` | contains A's account id and B's account id |

Arm (4), the non-administrator control, repeated on the same four tables with NGO B's session:

| table | mapped column | assertion |
|---|---|---|
| `organizations` | `id` | does NOT contain A's organisation (already present, keep as is) |
| `org_memberships` | `org_id` | does NOT contain A's organisation |
| `projects` | `id` | does NOT contain project A's id |
| `acknowledgments` | `account_id` | does NOT contain A's account id |

Each `rows` is asserted `not.toBeNull()` first, as the arm already does, so a privilege refusal never
reads as an empty answer. Each message names its own table and says what its failure means, in the
voice the two bodies already use; do not copy one message four times. **Use whatever expression the
AT-001.21 body in the SAME file already uses for A's and B's account identifiers**, so the two bodies
agree rather than inventing a second spelling.

**What this control proves and does not prove, so the merge ruling can be exact.** It proves each of
the four platform-admin policies is not universally denying and admits an administrator to rows of
both tenants, and that a non-administrator gets none of them. It does not prove any of the four is
correctly scoped in the other direction. The denial arms bracket that; the record says bracket.

---

## [6] terra, medium - the route module states a convention this router does not have, and says there is no router

> claim: "The route classifier uses a double-underscore layout convention that conflicts with this
> repository's TanStack routing conventions."
> why it matters: "`src/routes/__root.tsx` is an actual generated root route/app shell but is
> silently excluded, while the documented `_layout.tsx` convention would be treated as an undeclared
> route. This can produce both a false green and a false failure; the new comments also incorrectly
> say no router exists despite `src/router.tsx`."
> unverified-runtime-claim: no

**ACCEPT the two stated-fact halves. REJECT the "false failure" half in writing - it is the
fail-closed direction and the draft sitting already ruled it. NO BEHAVIOUR CHANGES; this fix is
comment-only.**

**The half that is not negotiable.** `route-visibility.ts:31` says "NOTHING IMPORTS THIS TODAY AND NO
ROUTER OBEYS IT, because there is no router". `src/router.tsx` exists and builds one (evidence check
3). A knowingly false stated fact must not pass through a gate - gate-1 ruling 11, gate-2 ruling 7,
and three of S2-G's five targets are the same class. The true sentence is narrower and better: a
router exists, nothing in it consults this declaration, and there is no sign-in screen to redirect
to.

**The half terra names second and states correctly.** The module says the DOUBLE underscore is "this
router's convention for a layout rather than a route" and offers `admin/__layout.tsx`.
`src/routes/README.md:18-19` documents `_layout.tsx` - one underscore - as the layout route and
`__root.tsx` as the app shell (evidence check 4). The module describes a convention that does not
exist, and it does so in the comment that justifies its own exclusion rule.

**What I REJECT, and the reason goes in the record because a maintained disagreement must.** Terra
calls the `_layout.tsx` treatment a "false failure". It is not a failure at all - it is the
dictated behaviour. S2-A exempts only `__`, and PHASE-STATE item [c] ruled it explicitly: an
unclassified `.tsx` file fails and a person decides what it is, rather than being silently exempt on
a naming convention. `_source-scan.ts` already records why this repository distrusts naming oracles.
No such file exists today, so it costs nothing now, and the day one arrives the build asks a person a
question. **The dictation stands, second time of asking.**

**And `__root.tsx`'s exclusion stands too, for a reason the module never gives.** The app shell wraps
EVERY page. It has no visibility of its own - classifying it `public` or `authenticated` would be
declaring a class for something that is not a destination. The exclusion is right and the
justification for it is wrong, which is the whole of this ruling.

**THE FIX, DICTATED - comments only, no line of behaviour moves:**

1. `supabase/functions/_shared/route-visibility.ts`, the residual paragraph at lines 28-34: replace
   "because there is no router" with the true, narrower statement. A TanStack router exists at
   `src/router.tsx`; it is built from the generated route tree; NOTHING in it consults
   `ROUTE_VISIBILITY`; and there is no sign-in screen to redirect to. Keep the rest of the paragraph
   - what this buys is a declaration in product code and a test that fails when a route arrives
   undeclared, and it is not a redirect that runs.
2. The same file, `isRouteFile`'s comment at lines 62-74: state the conventions as
   `src/routes/README.md` documents them - `__root.tsx` is the APP SHELL and `_layout.tsx` is a
   layout route - and drop the invented `admin/__layout.tsx` example. Then say the two things this
   rule actually decides: the app shell is excluded because it wraps every page and is not a
   destination, so it carries no visibility of its own; and a single-underscore layout file IS
   treated as a route and must be declared, deliberately, because an unclassified file should fail
   and be classified by a person rather than exempted by a naming convention.
3. `tests/at/suites/req-001/_integration.ts`, AT-001.24's refusal note near line 1845: "no router to
   redirect" is ambiguous in exactly the way clause 1 was false. Say the accurate thing - a router
   exists, it obeys no visibility rule, and there is no sign-in screen to redirect to - and leave
   every other clause of that paragraph alone.

**Nothing else in the tree repeats the claim.** I searched for "no router" and "there is no router"
across the working tree: two occurrences, both named above.

---

## [7] terra, medium - the fixture's reason for the signed-out caller's refusal is false at the live tier

> claim: "The live adapter sends a retained bearer token after `signOut`, while the fixture treats
> that caller as anonymous, and AT-001.24 never executes a live body to compare them."
> why it matters: "If PostgREST accepts the revoked-but-unexpired JWT, the signed-out request returns
> an authenticated RLS result rather than the fixture's `401`/`rows: null`, leaving the claimed
> equality unverified. Verify by comparing an apikey-only REST request with the same request after
> live `signOut`."
> unverified-runtime-claim: yes

**ACCEPT the defect. REJECT the proposed settlement - the block forbids it. FIX THE STATED REASON,
NOT THE ASSERTION, and record the runtime half as UNVERIFIED.**

**The important half is settled by reading, and terra's own "unverified" tag undersells its finding.**
`_fixture.ts`'s `dataApiRead` gives this reason for answering a dead session the same as a null one:
"neither carries a user, so PostgREST resolves the request to `anon`, and `anon` holds no `select`
grant". **At the live tier a dead session DOES carry a user's token** - `_live.ts`'s `signOut`
deliberately keeps the cached tokens, and its own comment explains why (deleting them made the
revocation clause untestable), and `dataApiGet` then sends `Authorization: Bearer <that token>`
(evidence check 5). So the stated reason is refuted by the sibling adapter without any database being
asked anything. Same non-mergeable class as ruling 6.

**What stays genuinely unverified, and it is recorded rather than guessed.** Whether PostgREST accepts
a revoked-but-unexpired access token is a property of the deployed stack. The integration tier has
never run at any head of this branch, one attempt is spent, and AT-001.24 refuses at that tier under
`ui.logged-out-surface-rendering` - so **nothing in this branch can grade it, and nothing in this
branch will.** It is named in PHASE-STATE, in the merge ruling, and as a filing candidate.

**Why the ASSERTION does not change.** Two models are available and neither is measured: the fixture's
(a caller whose session ended reads nothing) and the one terra predicts (the token still resolves).
Rewriting the fixture to the second would replace one ungraded prediction with another and would turn
a green red on a guess. Under the standing rule that no integration attempt may be spent, the honest
act is to keep the model and stop stating a false reason for it.

**THE FIX, DICTATED - comments only:**

1. `tests/at/suites/req-001/_fixture.ts`, `dataApiRead`'s "NO SESSION AND A DEAD SESSION ANSWER
   ALIKE" comment and the matching paragraph in the doc block above it: keep the answer, correct the
   reason. Say that the `null` caller sends no `Authorization` header at all, so PostgREST resolves
   it to `anon` and the refusal is the privilege layer - true at both tiers by construction. Say
   separately that the dead session is THIS FILE'S model: the live adapter deliberately retains the
   tokens after `signOut`, so a live request from that caller carries a user's bearer token, and
   PostgREST judges a token by signature and expiry rather than by the session store. Say that the
   two therefore may not agree at the integration tier, and that AT-001.24 refuses there, so nothing
   grades it.
2. `tests/at/suites/req-001/d-tenant-isolation.test.ts`, AT-001.24's arm (2) comment: state the same
   split - the never-signed-in arm is sound at both tiers, the equality with the signed-out arm is
   the fixture's model - and say what would be expected to fail first if this id ever ran live.
3. Do not touch `_live.ts`'s `signOut` or `dataApiGet`. Both are deliberate and both carry their
   reasons.

**AND A FILING CANDIDATE FOR THE FOUNDER, NOT BUILT HERE.** If a revoked access token really is
accepted by the Data API until expiry, a signed-out NGO admin keeps reading its own organisation for
the remainder of the token's life. That is a product question about token lifetime and revocation
reaching PostgREST - not this item's scope, not buildable without the blocked tier, and it touches no
file this item claims. **Suggested at close-out; only the founder creates items.**

---

## [8] flash, low - the selftest restates the exact implication this diff corrected one file away

> claim: "The selftest comment \"The basis is what makes AT-001.40's reach attributable - an ok: true
> alone could not tell the admin's reach from an ordinary read of the caller's own organisation\"
> states the exact implication that this diff's own corrected comment in
> supabase/functions/_shared/visibility.ts:107-115 identifies as the misleading one it fixed (\"this
> paragraph used to imply the consumer was AT-001.40. IT IS NOT\"), and that dictation S2-F ruled
> against - the acceptance surface deliberately does not carry the basis, and AT-001.40's reach is
> made attributable by the non-admin control, not by the basis."
> why it matters: "A reader of the named consumer of `TenantReadBasis` walks away believing the basis
> is what proves AT-001.40's acceptance claim - a claim the acceptance surface cannot see. The diff
> corrected this confusion in the shipped module and left the same confusion standing one file away,
> in the very consumer the corrected comment names. The sentence is defensible if read strictly as
> describing the unit oracle (where the basis does distinguish the grant), which is why my confidence
> is moderate rather than high; but under the diff's own step-18 standard - a statement the item
> makes false should not survive - this instance was missed."
> unverified-runtime-claim: no

**ACCEPT. Flash is right, its own reasoning about why its confidence is moderate is right, and its
last sentence names the correct standard.**

I verified both texts. `shipped-visibility.selftest.ts:52-53` says the basis "is what makes
AT-001.40's reach attributable". `visibility.ts:107-115`, corrected by THIS slice under S2-G target
5, says the opposite in capitals: the consumer is the selftest, "IT IS NOT" AT-001.40, the acceptance
surface deliberately does not carry the basis, and AT-001.40's reach is attributable through the
non-admin control. The two sentences cannot both stand, and the one that must go is the one the item
itself made wrong.

**Scope, stated plainly rather than glossed, because the file is not in slice 2's change-set.**
`git diff 64e4ef7...c82363b` does not touch `shipped-visibility.selftest.ts`; it landed in slice 1
under gate-2 ruling 5. Flash read past the change-set into the item's own earlier code, which a
reader is entitled to do - the scope rule is change-only for DEFECTS IN CODE THIS BRANCH DID NOT
TOUCH, and this branch wrote that file. Step 18's standard is the item's own: correct the statements
this item makes false. Slice 2's S2-F is what made this one false. **In scope, and the audit would
have found it if this gate had not.**

**THE FIX, DICTATED - one comment, in `tests/at/harness/shipped-visibility.selftest.ts` at the
platform-admin case:** the sentence keeps what is true of THIS file and drops what is false of
AT-001.40. The basis is what makes the GRANT'S REASON readable to a direct caller of the module,
which is why this unit oracle asserts it; and AT-001.40 cannot see it, because `TenantReadOutcome`
deliberately carries a status and a value only, so that criterion attributes reach through two
tenants read by one administrator and a non-administrator refused. Name `visibility.ts`'s corrected
paragraph as the place that says so, so the two files stop disagreeing.

---

## What the executor may NOT do

- **No integration-tier run.** The block stands (`PHASE-STATE.md` section 1) and one attempt is
  spent. No container is started, stopped, rebuilt or reconfigured; no port is changed; no
  `supabase/config.toml` edit; no `AT_DB_SLOT` override; and **`supabase db reset` is never run,
  directly or through any wrapper** (gate-1 ruling 10).
- **No `src/` change of any kind.** Continuous integration fails a pull request whose file list
  matches both `^src/` and this change's territory. Ruling 6 corrects comments in
  `supabase/` and `tests/` that DESCRIBE `src/`; it changes nothing under it.
- **No behaviour change in `route-visibility.ts`.** `isRouteFile` and `undeclaredRoutes` are
  untouched. Ruling 6 is comment-only.
- **No change to the AT-001.24 assertions.** Ruling 7 is comment-only.
- **No change to `_live.ts`'s `signOut`, `dataApiGet`, `callFunction`** (gate-1 ruling 5) **or
  `resolveCaller`.**
- **No touching the six pre-existing early-return sites, `_fixture.ts:1162`, or `_bind.ts:31`.**
  Each is named in `rulings-gate2.md` with the reason it stays.
- **No blacklist of tautology spellings in `isTriviallyOpen`** - ruling 4 dismisses that, with
  reasons.
- **No new trigger or constraint on `public.projects`** - ruling 1 files that rather than building
  it.
- **No claim that an integration-tier done-criterion is met.** Steps 11, 16 and 17 carry
  integration-tier criteria. They stay BLOCKED.

## The verification this sitting requires

Loop tier only, and it must be exact-match. The orchestrator runs all four itself as well as reading
the report.

1. `bun run typecheck` - exit 0
2. `bun run at:check req-001` - exit 0, 37 P0 ids in bijection
3. `bun run at:verify req-001 --tier loop --expect` - exit 0, **26 green / 11 red, exact match**,
   with AT-001.21, .22, .23, .24 and .40 all green
4. `bun run at:selftest` - exit 0, and the file count is unchanged at 16 while the test count RISES,
   because rulings 1 and 3 add cases to two existing selftest files and create none

**A green here claims the loop tier and nothing else.** The integration half of this item's evidence
does not exist and no ruling above changes that.
