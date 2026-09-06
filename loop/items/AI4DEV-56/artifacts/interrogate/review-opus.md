# Adversarial review — AI4DEV-56 (platform-administrator operations and the write boundary)

Reviewer: opus at xhigh. Scope: `loop/items/AI4DEV-56/artifacts/interrogate/diff.patch` in full, plus
the shipped modules, the four migrations, the acceptance suite and the harness selftests read from
the tree. The design (`artifacts/arena/design.md`), the rulings (`artifacts/how/rulings.md`), the
lane reports and the measurements were read for intent.

The structural claim holds as stated: `callDatabaseFunction` is private, every route file is one
`Deno.serve(writeRoute(...))`, and the gate is one function with one order. The findings below are
about what the arrangement lets through, what the tests prove, and where the code carries branches
its own types have already made impossible.

## Findings

### 1. [critical] The contact transfer is one-shot per account: R5 and R6 together make every transferee permanently untransferable

**Location**: `supabase/functions/_shared/admin-operations.ts:359-368` (`decideContactTransfer`);
`supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:329-337`;
the Given in `tests/at/suites/req-001/_integration.ts:1778-1805` (`transferGiven`).

**Finding**: R5 requires the transferee to be an NGO account that completed signup through the
product. Every such account owns exactly one organisation, because `public.complete_signup` creates
the organisation and seats the account as `admin` in the same transaction. R6 refuses any transfer
whose outgoing account holds a seat in more than the named organisation. So the moment a transfer
succeeds, the transferee holds two seats, and from that instant **neither of its two seats can ever
be transferred again through this route**. The recovery path REQ-001 promises becomes unavailable for
the exact account it was just used on.

**Evidence**: trace the state after one transfer. `transferGiven` builds NGO A owning `Riverside`
and NGO B owning `Northgate`, both through the product. AT-001.25 transfers `Riverside` from A to B.
`public.transfer_organization_contact` updates the one `org_memberships` row of `Riverside` to point
at B, so B now holds `{Northgate, Riverside}`.

Now ask the route to move either seat away from B:

- `organizationId = Riverside`, `fromAccountId = B`. `public.write_standing` answers
  `org_seat_account_id = B` and `org_seat_holder_seats = [Northgate, Riverside]`.
  `decideContactTransfer` computes
  `otherOrganizations = ['Northgate']` and refuses `holds-other-seats`.
- `organizationId = Northgate`, `fromAccountId = B`. Same read, `otherOrganizations = ['Riverside']`,
  same refusal.

The SQL backstop mirrors it exactly
(`select ... where account_id = p_from_account_id and org_id <> p_organization_id`), so there is no
path around it. And there is no other product route that removes a membership row:
`create_organization` and `complete_signup` only insert, `update_organization` touches
`public.organizations` only, and `repointMembershipAsOperator` is a test-only operator SQL call. The
escape hatch is a human with a psql session.

The design's own open question 3 asks whether the transfer should refuse or cascade "for a real
recovery, where the unreachable contact may well hold two seats". It frames the two-seat case as an
inherited condition. It is not — the route manufactures it, on its first successful use, every time.
The acceptance suite performs exactly the step that creates the dead end (AT-001.25, .26, .27, .33
and .35 all run one transfer) and never attempts the step that discovers it.

**Suggestion**: pick one and state it. Either (a) let the transfer move *all* of the outgoing
account's seats when the caller asks for it, which is one extra boolean in the request and one loop
in the definer, and keeps deactivation honest because every organisation the account touches moved;
or (b) drop R5's "completed through the product" requirement and let the transferee be an NGO account
with no organisation of its own, so a transferee ends with one seat rather than two — which needs a
provisioning path this tree does not have; or (c) decouple deactivation from the seat count and
refuse only when deactivating would strand a seat, which is what R6 was actually protecting against.
Whichever is chosen, add the second-transfer arm to AT-001.25's body: transfer, then attempt to
transfer the same organisation away from B, and assert what should happen.

---

### 2. [warning] AT-001.33's "cannot be altered" clause is green at the loop tier against a constant

**Location**: `tests/at/suites/req-001/_fixture.ts:1727-1730` (`attemptAuditTamper`);
`tests/at/suites/req-001/_integration.ts:2496-2500` (`assertAppendOnlyAudit`);
`loop/items/AI4DEV-56/pending-ledger.txt:5`.

**Finding**: the fixture's `attemptAuditTamper` reads no state and consults no shipped code:

```ts
attemptAuditTamper: async (attempt): Promise<TamperOutcome> => ({
  ok: false,
  reason: `public.audit_events is append-only: ${attempt.toUpperCase()} is refused (REQ-001, AT-001.33)`,
}),
```

`assertAppendOnlyAudit` runs the same body at both tiers and asserts `tamper.ok === false` for
`update`, `delete` and `truncate`. At the loop tier those three assertions are the fixture agreeing
with itself. The pending ledger records AT-001.33 as green at both tiers.

**Evidence**: `_fixture.ts`'s own header sets the standard this breaks — "There is no second copy of
the product rules in this file, deliberately: the moment there is one, this suite is grading a puppet
and the green is worth nothing." A hardcoded refusal is worse than a second copy: it is a refusal
with no rule behind it. Compare the neighbouring case that is handled honestly:
`grantMembershipAsOperator` mirrors the database's constraints and its comment says so, and the
integration tier grades the prediction. Here the prediction cannot be wrong, because it does not
depend on anything.

Contrast AT-001.41, which is the same shape and handled better: its loop body first calls
`identityPermanenceProblems()`, a static oracle over the migration text, so the loop green rests on
something real about the shipped tree even though the fixture's `unlinkGithubIdentity` is also a
hardcoded mirror.

**Suggestion**: give AT-001.33 the same static arm AT-001.41 has. `scanWriteGateSql` already models
`audit-mutation-in-definer`; extend the scan to assert, over the migration text, that
`public.audit_events` has a `before update or delete` row trigger, a `before truncate` statement
trigger, and no `grant` of a write privilege to any role — then call it from the loop body. That
makes the loop green a statement about the migration rather than about the fixture. If that is judged
too much for this item, mark AT-001.33 loop as `capability-pending` on the database and let the
integration tier carry it alone.

---

### 3. [warning] The virtual-key clause of AT-001.30 and AT-001.31 is discharged by a tautology over a module nothing calls

**Location**: `supabase/functions/_shared/gateway-keys.ts` (whole file);
`tests/at/suites/req-001/f-lifecycle-and-audit.test.ts:110` and `:206`;
`tests/at/suites/req-001/_integration.ts:2360` and `:2440`.

**Finding**: `virtualKeyActionFor` is a four-line pure function with **zero production callers** —
grep finds it only in the two acceptance bodies, the two integration bodies and one harness
selftest. It lives under `supabase/functions/_shared/`, a deployment directory, and no deployed
function imports it. The acceptance bodies discharge AT-001.30's "the project keys are revoked" with

```ts
expect(virtualKeyActionFor('active', 'deactivated')).toBe('revoke');
```

which asserts a two-branch mapping against its own definition, with no account, no key and no
project in play.

**Evidence**: the stated intent says the virtual-key clauses are "declared `capability-pending`
rather than stubbed". That is true at the integration tier only — `pending-ledger.txt` lines 20-21
name `gateway.virtual-key-revocation` and `gateway.virtual-key-reissue` for integration, and
AT-001.30 and .31 are **green at the loop tier**, where the only thing standing for the key clause is
the line above. So the loop tier reports a green for a criterion clause that has no implementation
anywhere in the tree.

This is also the tree's stated posture on stubs, applied inconsistently: AT-001.05 refuses at
integration rather than going green, with the reasoning "a green at the tier whose meaning is 'proved
for real' would be claiming the one thing that is not true" (`_integration.ts:2552-2557`). The same
reasoning applies to the key clause at the loop tier and was not applied.

**Suggestion**: either make AT-001.30 and .31 `capability-pending` at the loop tier too, and delete
`gateway-keys.ts` until REQ-009 has somewhere to call it from; or keep the module and stop asserting
it inside the two acceptance bodies — the harness selftest
(`shipped-lifecycle.selftest.ts:139-142`) already covers all four transitions, which is the right
home for a pure mapping with no caller.

---

### 4. [warning] The database's backstop kinds now travel to the client verbatim, deleting a property `update-organization` held on purpose

**Location**: `supabase/functions/_shared/edge.ts:628-633` (`writeRoute`'s failure branch);
`supabase/migrations/20260908120000_...sql:294,298,312,324,336,344,349,353`;
`tests/at/suites/req-001/e-admin-operations.test.ts:188`.

**Finding**: the new code puts the database's `DETAIL` on the wire as the caller-facing kind:

```ts
return json({ ok: false, kind: parseWriteRefusalKind(outcome.details), reason: outcome.message }, status);
```

The definers raise the *same* kinds the TypeScript decisions produce — `not-a-platform-admin`,
`no-account`, `no-such-organisation`, `not-the-current-contact`, `holds-other-seats`,
`transferee-not-ngo`, `transferee-deactivated`, `invalid-request`. So a refusal an acceptance body
reads as "the TypeScript gate fired" is byte-identical to "the TypeScript gate did not fire and the
SQL backstop caught it". The deleted comment in `update-organization/index.ts` named this exact
hazard and chose the other way:

> It is `refused` rather than a meaningful kind precisely so that disagreement cannot be read as
> either criterion's refusal.

**Evidence**: the two paths differ only in HTTP status. PostgREST maps `42501` to 403, `23503` to
409 and `22023` to 400; `writeRoute` then collapses every 4xx to 409. The TypeScript gate answers
403 for a type refusal. So a body that asserts *kind and status* is still safe, and one that asserts
kind alone is not.

`assertDeactivationGatesEveryWrite` asserts both (`_integration.ts:2281-2284`), and AT-001.35 asserts
both (`e-admin-operations.test.ts:225-226, 232-233`). **AT-001.28 asserts the kind alone**
(`e-admin-operations.test.ts:188`): an NGO calling `set-escalation-contact` is expected to carry
`kind === 'not-a-platform-admin'`. Remove the `platform_admin` row from `WRITE_ROUTES` for that route
and the test still passes, on the SQL backstop, at 409 instead of 403.

**Suggestion**: keep the database's kind out of the caller's `kind` field. Answer the backstop with
`kind: 'refused'` and carry the database's own kind in a separate field
(`backstopKind`, say) so an operator can still diagnose it. If the kind must pass through, make
every acceptance body that asserts a kind also assert the status, and add the missing status
assertion to AT-001.28 now.

---

### 5. [warning] `set_escalation_contact` is a destructive platform-admin write with no audit row, on the surface where every other admin write is audited

**Location**: `supabase/migrations/20260908120000_...sql:386-448`;
`public.audit_event_kind` at line 27-28.

**Finding**: R15 puts the escalation contact on "the same admin surface as the transfer". Every other
write on that surface leaves an audit row: the transfer writes `org_contact_transferred`, the
lifecycle setter writes `account_lifecycle_changed`, and a membership change writes
`org_role_changed` from a trigger. `set_escalation_contact` writes none. It also **overwrites**:

```sql
on conflict (org_id) do update
   set contact_name = excluded.contact_name, ...
```

so the previous escalation contact — the last-resort human channel for an NGO that has lost access —
is destroyed with no record of who replaced it, when, or with what. `audit_event_kind` has no value
for it, so adding one is a migration, not an edit.

**Evidence**: AT-001.28's own body proves the destruction is deliberate and untracked — it records
Maya Lindqvist, then records Jonas Ekholm, then asserts the row now reads Jonas
(`e-admin-operations.test.ts:178-183`). Nothing anywhere reads back who Maya was. The table keeps
`recorded_by_account_id` and `recorded_at`, which is the *current* writer only.

Note the interaction with finding 1: the escalation contact is precisely what an operator reaches for
when the seat holder is unreachable, which is the state finding 1 makes permanent.

**Suggestion**: add an `org_escalation_contact_recorded` value to `public.audit_event_kind` and one
`append_audit_event` call inside `set_escalation_contact`, carrying the previous contact in `detail`.
It is four lines in the definer and one enum value, and it makes the whole admin surface uniform,
which is the property R15 was reaching for.

---

### 6. [warning] The conformance scan's boundary claim is much stronger than what it checks

**Location**: `tests/at/suites/req-001/_write-route-scan.ts:33` (`REACHES_DATABASE`), `:60-66`
(`exportsCallDatabaseFunction`), `:183-193` (`loadWriteRouteTree`).

**Finding**: the module header says the scan proves "that every file able to reach the database does
so through the one constructor". What it actually checks is three literal strings in one file per
directory:

```ts
const REACHES_DATABASE = /writeRoute|callDatabaseFunction|\/rest\/v1\/rpc\//;
```

Four ways past it, all reachable by an ordinary future author:

1. A direct Data API table write — `fetch(`${URL}/rest/v1/organizations`, { method: 'POST', ... })`
   with the service-role key. It contains none of the three strings. The privilege posture stops it
   at the database (`service_role` holds `select` only on those tables), but the scan does not, and
   the scan is what CI runs.
2. A helper module in the route's own directory. `loadWriteRouteTree` reads
   `<name>/index.ts` and nothing else, so `supabase/functions/donate-fuel/db.ts` is invisible to
   every check in this file.
3. `createClient` from `@supabase/supabase-js` and `.rpc(...)`, which produces the same URL at run
   time and no matching literal in the source.
4. `exportsCallDatabaseFunction` matches three declaration forms; `export const callDatabaseFunction
   = async (...) => ...` and `export default callDatabaseFunction` match none of them, and that check
   is the one guarding the whole "not exported" claim.

**Evidence**: `write-route-scan.selftest.ts:45-55` names the unregistered-route case "the load-bearing
case" and exercises it with `"/rest/v1/rpc/donate_fuel"` — the one spelling the regex catches. Every
negative case in that file is a mutation of a string the scan already looks for, so the selftest
measures the regex against itself rather than against the property.

**Suggestion**: two cheap changes close most of it. Widen the pattern from `/rest/v1/rpc/` to
`/rest/v1/` plus `createClient` plus `SERVICE_ROLE`/`SECRET_KEY`, and read every `.ts` file under
each function directory rather than `index.ts` alone. Then add a selftest case that plants a direct
table write, so the next reader can see which shapes are covered. Also state in the header what the
scan does not see, the way `_fixture.ts` states what a loop green does not claim.

---

### 7. [warning] The gate narrows the standing and the type does not, so four decisions carry unreachable branches — a code-judo move is available

**Location**: `supabase/functions/_shared/write-routes.ts:282-306` (`writeGateDecision`,
`writePipeline`); `admin-operations.ts:325-327, 420-422, 458-460`; `memberships.ts:714`.

**Finding**: `writeGateDecision` proves, for every `account-required` route, that the standing is the
`account` variant — it refuses `unreadable` at 502 and `no-account` at 409 before returning `ok`.
`writePipeline` then throws that proof away and hands `decide` the same wide `WriteStanding`. So each
of the three admin decisions opens with the same unreachable four lines:

```ts
if (standing.kind !== 'account') {
  return refuseWrite('refused', 502, 'the transfer was asked to decide with no caller standing, so no decision was made');
}
```

and `decideOrganizationRename` carries the same fact as a ternary that reads as if the null case were
meaningful:

```ts
const allowed = orgAdminActionAllowed(input.standing.kind === 'account' ? input.standing.orgRole : null);
```

That ternary is worse than dead: a reader has to work out whether "no standing" is supposed to
produce the not-a-member refusal, and the answer is that it cannot happen.

**Suggestion**: split the input type. Give `WriteRouteInput` a `standing: WriteStanding` and add
`AccountWriteRouteInput` with `standing: AccountStanding` (the `account` variant, extracted as its
own named type). `writePipeline` already holds the narrowed value at the point it calls
`spec.decide`; pass it. Routes whose row is `account-required` take the narrow input, and
`complete-signup` — the only `account-absent-by-design` row — takes the wide one. Four branches, one
ternary and three near-identical 502 sentences disappear, and the compiler starts enforcing what the
gate's header currently only asserts in prose. This is the single largest simplification available in
the diff.

---

### 8. [warning] AT-001.29's sweep silently skips the one route whose gate branch order is load-bearing

**Location**: `tests/at/suites/req-001/_integration.ts:2267-2269`
(`assertDeactivationGatesEveryWrite`).

**Finding**: the sweep iterates the inventory and immediately drops every row that is not
`account-required`:

```ts
for (const name of Object.keys(WRITE_ROUTES) as WriteRouteName[]) {
  const row = WRITE_ROUTES[name];
  if (row.standing.kind !== 'account-required') continue;
```

`complete-signup` is the only `account-absent-by-design` row, and it is exactly the route the gate's
ordering comment exists for: the deactivation check sits *above* the absent-by-design early return so
that a deactivated account is refused on a route that otherwise admits anyone. AT-001.29's title is
"every enumerated write is rejected for a deactivated account", and it does not enumerate that one,
at either tier. The fixture supports it — `_fixture.ts:1610-1624` implements
`attemptWrite['complete-signup']` — so the omission is the filter, not a missing capability.

**Evidence**: `shipped-write-gate.selftest.ts:74-87` does cover it, at the unit level, over a
synthetic standing. So the property is tested, but not by the criterion that claims it, and not
against `public.write_standing`'s real answer for a deactivated account with no organisation named.

Two smaller problems in the same loop. The sweep's active-control arms **mutate shared state** — the
`transfer-organization-contact` control performs a real transfer and deactivates
`actors.transferFrom` — so the assertions depend on `Object.keys(WRITE_ROUTES)` insertion order.
Reordering the inventory, which nothing forbids, can change what the sweep proves. And `snapshotWrite`
for `complete-signup` reads `sut.account(session.accountId)`, which is dead code today for the same
reason.

**Suggestion**: change the filter to `if (row.surface.kind !== 'edge' && options.skipStandIn)
continue;` and let `complete-signup` run, with a deactivated NGO as the caller; the expected answer is
`account-deactivated` 403 on both tiers. Separately, either make each route's active control operate
on state no other route reads, or state in the helper's comment that the sweep is order-coupled.

---

### 9. [warning] `_live.ts` crosses 1000 lines, `_integration.ts` reaches 2311, and a nine-field parameter bag is what drives most of the noise

**Location**: `tests/at/suites/req-001/_live.ts` (804 → 1003 lines);
`tests/at/suites/req-001/_integration.ts` (1577 → 2311); `_contract.ts:3653-3664` (`WriteSubject`).

**Finding**: this PR pushes `_live.ts` from under 1000 lines to over it and grows `_integration.ts`
by 47 percent. The threshold matters less than what is inside: `WriteSubject` is one flat record of
nine fields covering seven routes, so every `attemptWrite` call site fills six values the route it
names will never read:

```ts
const refused = await sut.attemptWrite('discovery-message', volunteer, {
  name: 'unused',
  organizationId: '',
  fromAccountId: volunteer.accountId,
  toAccountId: volunteer.accountId,
  accountId: volunteer.accountId,
  lifecycle: 'deactivated',
  reason: AUP_REASON,
  message: 'a message that must not land',
  email: w.email('unused-30'),
});
```

`'unused'` and `''` are placeholders the type system asked for. There are six such call sites across
`f-lifecycle-and-audit.test.ts` and `_integration.ts`, plus a `writeSubject` builder that exists only
to manufacture them. A reader cannot tell from any of these which fields are load-bearing.

**Evidence**: the same information is already available in a better shape one file away — each route
has a `WriteRouteSpec` with a `target` and `subject` selector and a typed `Args`. The bag exists
because `attemptWrite` takes one signature for every route.

**Suggestion**: make `WriteSubject` a discriminated union keyed by `WriteRouteName`, so
`attemptWrite('discovery-message', s, { route: 'discovery-message', message })` names two fields
instead of nine and a wrong field is a compile error. That also answers the design's own open
question 4 (whether `attemptWrite` is too much authority for one member) in the direction the type
system can enforce. Independently, `_live.ts`'s admin-route block and its operator read-backs are two
cohesive groups that would sit naturally in a `_live-admin.ts` beside the existing
`_live-tenant-reads.ts`, which is precedent this tree already set.

---

### 10. [warning] The volunteer's unlink refusal reaches the user as an opaque 500, and the acceptance body is written so nothing notices

**Location**: `supabase/migrations/20260911120000_volunteer_github_identity_is_permanent.sql:21-22`;
`tests/at/suites/req-001/_live.ts:5353-5354`;
`loop/items/AI4DEV-56/artifacts/measure/unlink-trigger-probe.txt:11`.

**Finding**: the trigger raises a well-written sentence with `errcode = '42501'` and
`detail = 'github-unlink-refused'`. None of it reaches the caller. The measurement records what does:

```
8 DELETE github identity WITH the trigger, as the user:
  HTTP 500 {"code":500,"error_code":"unexpected_failure","msg":"Database error deleting identity", ...}
```

The stated reason appears only in the GoTrue container log. A volunteer who presses "unlink" in a
future UI gets an unexplained server error, and a support engineer reading the product's own logs
sees `unexpected_failure`.

**Evidence**: R10 rules that the row is the oracle and the status is not, which is right for the
test. But the test comment — "THE STATUS IS NOT THE ORACLE (R10): a refused volunteer unlink answers
500" — is the only place in the shipped tree where the gap is written down, and `_live.ts` is not
where a product decision lives. `github-unlink-refused` is also not a member of
`WRITE_REFUSAL_KINDS`, so no wire vocabulary carries it either.

**Suggestion**: keep the trigger — it is the correct placement, and d91 asks for exactly this
"refused where the auth service deletes the identity row". But record the consequence where a product
decision belongs: a line in the migration's header saying the refusal is invisible to the caller by
construction, and an entry in the item's "Not done here" naming the UI-side fix (the product surface
must not offer unlink to a completed volunteer, because the platform cannot explain the refusal when
it happens). Without that, the first UI item will offer the button.

---

### 11. [nit] `edge.ts`'s CORS comment counts six functions; there are nine

**Location**: `supabase/functions/_shared/edge.ts:73-78`.

**Finding**: "Six functions share this header. Five authenticate by `Authorization` header and none of
the six reads a cookie ... The sixth, `public-project`, authenticates nothing". `supabase/functions/`
now holds nine route directories. `supabase/config.toml` was updated in this diff ("The six write
functions and the two authenticated reads"); `edge.ts` was not.

**Evidence**: this tree treats a comment as a stated fact and has a written rule against fabricated
ones. The reasoning in the paragraph is still sound — the argument is about cookies and ambient
authority, not about the count — which is exactly why the stale number is worth one line to fix
rather than worth leaving.

**Suggestion**: say "every function in `supabase/functions/` shares this header; only
`public-project` authenticates nothing", which stops needing maintenance.

---

### 12. [nit] The escalation contact's address is validated by `includes('@')` and by nothing else

**Location**: `supabase/functions/_shared/admin-operations.ts:403-409`
(`validateEscalationContact`); the SQL check at
`20260908120000_...sql:62-64` tests non-blank only.

**Finding**: `email.includes('@')` accepts `@`, `a@`, `@b` and `a@b`. This row is the last-resort
human channel for an NGO whose seat holder is unreachable, it is written by a platform administrator
typing into a form, and a typo is stored silently and destructively (finding 5).

**Suggestion**: reuse whatever address rule the tree already has, or require at least one character
either side of a single `@` and a dot in the domain. Three characters of regex buy the difference
between "there is an address" and "there is a string with an at-sign in it".

---

### 13. [nit] Two small shapes in `writeRoute` and `edge.ts`

**Location**: `supabase/functions/_shared/edge.ts:624` and `:276-278`.

**Finding**: (a) the refusal body spreads the route's extra fields last —
`json({ ok: false, kind: decision.kind, reason: decision.reason, ...decision.fields }, ...)` — so a
route whose `fields` ever carries a `kind` or `reason` key silently overwrites the pipeline's. Only
`{ organizations }` uses it today. (b) `RpcOutcome` is still exported although
`callDatabaseFunction` became private in this diff and nothing outside `edge.ts` names the type; it
is now a vestigial export on a module whose whole point this change was to narrow.

**Suggestion**: spread `decision.fields` first, or type it as
`Record<string, unknown>` minus `kind | reason`. Drop the `export` on `RpcOutcome`.

---

## What I checked and did not flag

- The concurrency contract. `assert_account_active`'s `for share` and `change_account_lifecycle`'s
  `for update` on `public.accounts`, and the transfer's `for update` on the seat row, do serialise
  the two races R7 names, and the lock order between the two tables is consistent across all four
  definers, so the obvious deadlock is not reachable.
- The standing read's scalar subqueries (`org_seat_account_id`, and the inner select in
  `org_seat_holder_seats`) would raise `21000` if an organisation ever held two membership rows.
  `org_memberships_one_seat_per_org_idx` makes that impossible today, so this is sound rather than
  lucky — but it is a single-seat assumption baked into the write path of *every* route, and RM-12
  contemplates multi-member NGOs. Worth a comment in `write_standing` naming the index it depends on.
- `parseWriteStanding`'s fail-closed behaviour, `parseWriteRefusalKind`, and the gate's stated order
  are all correct and well covered by `shipped-write-gate.selftest.ts`.
- The two constraints the prompt placed out of scope (no new harness machinery; a rule stated once in
  TypeScript and once in SQL) are respected, and the `WRITE_GATE_EXEMPT` row for `complete_signup` is
  justified — a second completion is refused by the `accounts` primary key regardless of lifecycle,
  so the missing SQL gate on that one definer opens nothing.
