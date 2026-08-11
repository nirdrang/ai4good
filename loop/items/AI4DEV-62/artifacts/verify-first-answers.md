# Verify-first answers — AI4DEV-62 (per-org roles and isolation) and its single-seat partner item

The plan marks six questions this item may not answer by reasoning: three inside step 5 (a, b, c)
and three inside step 7 (d, e, f). All six were measured on the item's own reserved database slot,
**slot 2**, by `loop/items/AI4DEV-62/verify-first.ts`. The full transcript is
`loop/items/AI4DEV-62/artifacts/verify-first-transcript.txt`; the line numbers below point into it.

Command: `bun loop/items/AI4DEV-62/verify-first.ts`

Slot evidence line the run printed (transcript line 5):

```
at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 4 expected, 4 applied
```

Four migrations expected and four applied: the two that were on main plus this item's two. So every
answer below was read from a database this run rebuilt from empty with both new migrations replayed.

**Nothing measured contradicts the plan.** One measurement changed how the live adapter is written
(answer (d)); no decision, no ruling and no step changed.

---

## (a) Does the BEFORE trigger fire under the OPERATOR (superuser) connection? — YES

Transcript lines 7–11.

The operator connection reports `{"current_user":"postgres","superuser":false,"bypassrls":true}` —
it bypasses row-level security and it does NOT bypass a trigger. A direct insert of a `member` row
for a `volunteer` account was refused:

```
org_memberships refuses a per-organisation role for account a8f63613-… of type volunteer:
per-NGO roles are NGO accounts only
```

The control ran in the same connection: an `ngo` grantee was seated `admin`, and the read-back shows
the organisation holding exactly one membership row. So the trigger refuses the grantee it should
and does not refuse everybody.

This is what decision D4 rests on: "the trigger closes every SQL path, the operator's included,
which is what 'any path' means" (AT-001.37). Measured true.

## (b) An absent `public.accounts` row — the TRIGGER refuses first, with its own sentence

Transcript lines 13–15.

Inserting a membership for an account id that has no `public.accounts` row was refused by the
trigger, not by the foreign key:

```
org_memberships refuses a per-organisation role for e9848c90-…: no account has completed signup
for this user, so it holds no account type
```

A BEFORE ROW trigger runs before the foreign key on `account_id` is checked, so the trigger's own
branch is the one a caller meets. The plan's condition was "whichever refuses, the refusal must be a
stated kind, not an accident" — it is stated: the migration raises it deliberately, with SQLSTATE
`23503`, and it is a DIFFERENT sentence from the NGO-only refusal so a caller is not told the
account is of the wrong type when there is no account at all.

## (c) Does the service-role REST read of `org_memberships` need the new grant? — YES, measured

Transcript lines 17–20. Three reads through PostgREST with the service-role key, around a revoke and
a re-grant on the live slot:

| state | answer |
|---|---|
| with the migration's grant present | HTTP 200, body `[{"role":"admin"}]` |
| with the grant REVOKED | HTTP 403, `"permission denied for table org_membe…"`, hint `GRANT SELECT ON public.org_memberships TO service_role;` |
| with the grant restored | HTTP 200, body `[{"role":"admin"}]` |

So decision D13's one new grant is load-bearing rather than defensive: without it the deployed
`update-organization` cannot read the caller's role at all, and the refusal would arrive at the
privilege layer as an outage rather than as a decision. It is a read; every write still goes through
a SECURITY DEFINER function, so `service_role` gains no INSERT or UPDATE anywhere in this schema.

## (d) The refusal shapes over operator SQL — and WHERE THE SQLSTATE LIVES

Transcript lines 22–32. This is the one answer that changed code.

**The SQLSTATE is on `errno`, not on `code`.** The driver's own properties for a real refusal:

```
name    PostgresError
code    ERR_POSTGRES_SERVER_ERROR      <- the CLIENT's error class, not the SQLSTATE
errno   42501                          <- the SQLSTATE the migration raised
severity ERROR
where   PL/pgSQL function public.org_membership_grantee_must_be_ngo() line 24 at RAISE
```

The live adapter's first draft classified on `code === '42501'`, which would have matched nothing:
every database refusal would have fallen through to the unclassified `refused` kind, and AT-001.37
and AT-001.17 would have gone red for a reason with nothing to do with the product. `_live.ts`'s
`databaseRefusal` now reads `errno`, `errcode` and `code` in that order and keeps the first value
shaped like a SQLSTATE (five digits-and-capitals), and each call site checks the sentence as well.

The three refusal shapes the adapters classify:

| act | sentence |
|---|---|
| grant a role to a non-NGO account | `org_memberships refuses a per-organisation role for account … of type volunteer: per-NGO roles are NGO accounts only` (SQLSTATE 42501) |
| a SECOND membership row in one organisation | `duplicate key value violates unique constraint "org_memberships_one_seat_per_org_idx"` (SQLSTATE 23505) |
| re-point an occupied project seat | `projects refuses a second volunteer on project …: its single developer seat is held by account …` (SQLSTATE 42501) |

**Two further facts the same probe settled, both of which the loop fixture mirrors:**

* **Ordering.** A non-NGO grantee offered into an ALREADY-SEATED organisation meets THE TRIGGER, not
  the unique index — a BEFORE trigger runs before any index is consulted. The fixture checks the
  NGO-only rule first for exactly this reason; the other order would report the wrong kind.
* **Release to null is ALLOWED**, and the read-back after the refused replacement shows the seat
  still holding the FIRST volunteer. The guard refuses a replacement and refuses nothing else, which
  is what leaves offboarding to the leaf that owns it.

## (e) The functions router's answer for a name that does not exist

Transcript lines 34–36.

```
POST /functions/v1/invite-member      -> HTTP 404  body "Function not found"
POST /functions/v1/create-organization -> HTTP 401  body {"ok":false,"reason":"authenticate before creating an organisation"}
```

The second line is the control and it is not decoration: a router that answered 404 to everything
would make the first line meaningless. A DEPLOYED function on the same stack answers 401, so the
router is genuinely resolving names — and `invite-member` resolves to nothing.

This is the shape AT-001.17's integration absence arm asserts: status 404 with the body
`Function not found`.

## (f) The catalog posture on `public.projects` after a reset — ZERO privileges

Transcript lines 38–40. This is gate-1 ruling 4's attached verification condition.

```
information_schema.role_table_grants rows for anon, authenticated, service_role: 0

has_table_privilege: {"anon_select":false,"anon_truncate":false,
                      "authenticated_select":false,"authenticated_truncate":false,
                      "service_role_select":false,"service_role_truncate":false,
                      "anon_references":false,"anon_trigger":false}
```

Both instruments agree, which is the point of running both: the grants view returns no rows and
`has_table_privilege` answers false for every probe, TRUNCATE and REFERENCES included — the three
privileges the preceding migration measured arriving by default on a new public table. So
migration B's `revoke all on table public.projects from anon, authenticated, service_role` is what
makes the stated posture true, and the posture is now measured rather than asserted.
