# Gate-2 verification answers — AI4DEV-62 (per-org roles and isolation) and its single-seat partner item

`gate2-rulings.md` attaches three verification conditions to its rulings: v1 (ruling R2c's REMOVAL
condition), v2 (ruling R7's measurement), and v3 (ruling R4's before-and-after pair). All three were
measured on the item's own reserved database slot, **slot 2**, by
`loop/items/AI4DEV-62/gate2-verify.ts`. The before-half transcript is
`loop/items/AI4DEV-62/artifacts/gate2-verify-transcript.txt`; the after-half transcript is
`loop/items/AI4DEV-62/artifacts/gate2-verify-transcript-after.txt`.

Commands:

```
bun loop/items/AI4DEV-62/gate2-verify.ts before      # v1, v2, v3 before the fix
bun loop/items/AI4DEV-62/gate2-verify.ts after       # v3 after the fix, on a reset replay
```

**v1 and v3's before-half ran BEFORE any fix was applied**, which is what the rulings require: a
removal is made on evidence, and a claim about current behaviour is proved while the current
behaviour is still there.

**One measurement disagrees with the ruling's expectation.** v2 answered HTTP **401**, not 403.
Ruling R7 states the rule for exactly this case — "If the measurement disagrees with 403, the
measured shape is what gets pinned, and the measurement goes in the record either way" — so the
Data-API arm is pinned to 401 with the permission-denied body fragment. Nothing else diverged.

---

## v1 (ruling R2c) — the deployed rename of a well-formed RANDOM organisation id — 403 `not-a-member`

Before-half transcript lines 9–13. Slot evidence line for the run:

```
at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 4 expected, 4 applied
```

A real auth user signed in with the anon key, then called the deployed `update-organization` with
the random UUID `4e2406bf-1e0d-4509-a4e1-ee22f696797b`:

```
HTTP 403 {"ok":false,"kind":"not-a-member","reason":"this action is available to members of this
organisation only — the caller holds no membership in it, and membership is held per organisation,
so acting in one organisation grants nothing in another"}
```

**The removal condition HOLDS**: status 403, kind `not-a-member`. So the fixture's
organisation-existence pre-check is removed and an unknown organisation flows to
`orgAdminActionAllowed(null)`, which is the deployed function's own decision.

The control ran in the same session: the SAME caller renaming the organisation it really
administers answered `HTTP 200 {"ok":true,...,"name":"Gate Two Probe Organisation Renamed"}`. Without
it a 403 above would only prove this caller can rename nothing at all.

## v2 (ruling R7) — `org_memberships` through the Data API with the anon key — 401, permission denied

Before-half transcript lines 15–17.

```
GET /rest/v1/org_memberships?select=role  (apikey + bearer = the anon key)
-> HTTP 401
   {"code":"42501","details":null,
    "hint":"Grant the required privileges to the current role with: GRANT SELECT ON public.org_memberships TO anon;",
    "message":"permission denied for table org_memberships"}
```

**The status is 401, not the 403 the ruling expected.** The BECAUSE the ruling asked for is
nevertheless proved by the body, and proved twice over: SQLSTATE `42501` is the privilege layer's own
code, the message names the table and the denial, and the hint names the missing GRANT. A missing
table route or a down PostgREST cannot produce this body.

The 401-versus-403 difference is the client role, not the posture. Verify-first answer (c) measured
403 for the same denial with the SERVICE-ROLE key; PostgREST answers 401 when the request carries no
authenticated user, which the anon key does not.

The control ran with the same key against `public.organizations`:

```
GET /rest/v1/organizations?select=id -> HTTP 401 {"code":"42501", … "permission denied for table organizations"}
```

Both tables answer at the privilege layer, so the arm's assertion is pinned to the measured pair:
status `401` and a body matching `/permission denied/i`.

## v3 (ruling R4) — the definer RPC with `p_name` set to one TAB

### Before the fix — it SUCCEEDS, exactly as the reviewer claimed

Before-half transcript lines 19–21. Called through PostgREST with the service-role key, against an
existing organisation whose admin the caller is:

```
POST /rest/v1/rpc/update_organization {"p_account_id":…, "p_organization_id":…, "p_name":"\t"}
-> HTTP 200 {"name": "\t", "organization_id": "068210b0-16da-48e1-a1be-5d54021d0b78"}
   read-back of the row: name "\t"
```

The row now holds a single tab character as its name. `btrim(text)` strips SPACES only by default, so
the emptiness check passed and the tab survived into the stored name. The claim is proved.

### After the fix — NOT YET MEASURED

This half runs after ruling R4's edit lands in migration A and slot 2 is reset. Nothing is written
here until the run produces it.
