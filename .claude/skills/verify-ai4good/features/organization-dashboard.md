# Organization dashboard (member and platform-admin read)

A signed-in NGO member opens the dashboard of their organization and sees its profile fields,
its seats, and its projects. A platform administrator sees the same dashboard for any
organization. Every other caller gets one fixed 404 answer. The answer is the same bytes
whether the organization belongs to someone else, the caller holds no seat in it, or the id
names nothing.

## Sub-features

- Org member (the seat holder): 200 with `organizationId`, `organizationName`, `mission`,
  `country`, `website`, `logo`, `seats[{accountId, role}]` and
  `projects[{projectId, projectName, assignedVolunteerId}]`.
- Platform administrator: the same 200 for any organization.
- Foreign organization, unseated caller, absent id: 404 with the body
  `{"ok": false, "reason": "no such thing is visible to this caller"}`. One constant
  (`TENANT_NOT_FOUND` in `supabase/functions/_shared/tenant-reads.ts`), byte-identical for all
  three. A confirmed user with no `accounts` row gets the same 404.
- A deactivated member still reads: no read policy names the lifecycle.
- The database filters, not the function. The function reads over the caller's own token
  through PostgREST (`callerReads` in `supabase/functions/_shared/edge.ts`). Row-level
  security policies on `organizations`, `org_memberships` and `projects` admit an
  organization member and a platform administrator.
- Transport refusals, all `{ok: false, reason}` with no `kind`. 405 for a method other than
  POST. 401 when no `Authorization` header reaches the function. 400 for a body that is not a
  JSON object. 400 for an `organizationId` that is not a uuid. 502
  `{"ok": false, "reason": "the read could not complete, so no decision was made"}` when a
  read fails.

## How to get to it (user POV)

A signed-in NGO admin opens their organization's dashboard. A platform administrator opens any
organization's dashboard. The API is the `organization-dashboard` edge function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/organization-dashboard`, headers `Authorization: Bearer
<access_token>` and `apikey: <ANON_KEY>`, body `{"organizationId": "<uuid>"}`.

- As the NGO drive's user against their own organization: expect 200. `seats` holds one entry
  `{accountId: <caller account id>, role: "admin"}`. `projects` lists the projects that
  `project-need` `start` created (see `need-intake.md`).
- As a second NGO user against the first user's organization: expect the 404 constant.
- As any signed-in caller against a random uuid: expect the 404 constant, the same bytes.
- As a platform administrator (see "Shared mechanics" in `README.md`): expect 200 for either
  organization. The shipped drive `scripts/drive-access-and-admin.ts` does not cover the
  platform-administrator read.

## What proves it

The response pair, plus a field-by-field comparison with the rows over `DB_URL`:

```sql
select id, name, mission, country, website, logo from public.organizations where id = '<org>';
select account_id, role from public.org_memberships where org_id = '<org>';
select id, name, assigned_volunteer_id from public.projects where org_id = '<org>';
```

For the three 404 cases, compare the bodies byte for byte. The catalog shows the policies that
do the filtering:

```sql
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public' and tablename in ('organizations', 'org_memberships', 'projects')
 order by tablename, policyname;
select has_table_privilege('anon', 'public.organizations', 'select')          as anon_reads,
       has_table_privilege('authenticated', 'public.organizations', 'select') as authenticated_reads;
```

Expect `organizations_select_org_member`, `organizations_select_platform_admin`,
`org_memberships_select_org_member`, `org_memberships_select_platform_admin`,
`projects_select_org_member`, `projects_select_assigned_volunteer` and
`projects_select_platform_admin`; `anon_reads` false and `authenticated_reads` true.

## Gotchas

- One seat per organization (unique index `org_memberships_one_seat_per_org_idx`). The seated
  member is always the admin, so "member" and "admin" are the same caller here.
- `projects` is empty until `project-need` `start` creates one. Use that product path, not an
  insert.
- `verify_jwt = true`: a missing or invalid bearer is refused by the gateway before the
  function runs, with a body of the gateway's own shape. Assert the status only for that case.
- The access token lives 120 seconds. Sign in again before a long drive.
