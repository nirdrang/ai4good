# Public project page (token-free read)

Anyone, signed in or not, asks for a project's public page and gets the project name and the
organization name, when the page is public. Today a project is public only when it has no
need-intake row at all. A project that is not public and a project that does not exist answer
with the same bytes.

## Sub-features

- Public project: 200 with exactly `{"ok": true, "projectId", "projectName",
  "organizationName"}` and no other field.
- The eligibility rule, from `supabase/functions/_shared/public-project.ts`:
  `projectIsPublic(source)` is `source.need_stage === null`. The source is the definer
  `read_public_project`, which left-joins `need_intakes`, so `need_stage` is null only when the
  project has no need row. A project whose need is in `draft` or in `discovery_in_progress` is
  not public. The source comment says needs stay private until a separate publication rule
  lands.
- Not public and absent: both 404 `{"ok": false, "reason": "no such project page is public"}`
  (`PROJECT_NOT_PUBLIC`). The two branches share one constant; the drive cannot tell them apart
  and must not try.
- No authentication. `verify_jwt = false` in `supabase/config.toml`, and the function reads no
  `Authorization` header. A bearer, present or absent, valid or expired, changes nothing.
- The read runs as the service role through one RPC, `read_public_project`. EXECUTE on it is
  granted to `service_role` only; `anon` holds no privilege on any table.
- Transport refusals, all `{ok: false, reason}` with no `kind`. 405 for a method other than
  POST. 400 for a body that is not a JSON object. 400 for a `projectId` that is not a uuid. 502
  `{"ok": false, "reason": "the public project page could not be read, so no answer was given"}`
  when the RPC fails.

## How to get to it (user POV)

A visitor with no account opens a project's public page. The API is the `public-project` edge
function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/public-project`, header `apikey: <ANON_KEY>`, no `Authorization`
header, body `{"projectId": "<uuid>"}`.

- The project that `project-need` `start` created, while its need is in `draft`: expect 404.
  After `submit` moves the need to `discovery_in_progress`: expect 404 again. The shipped
  `scripts/drive-need-intake.ts` records both (checks `n3` and `n12-public`).
- A random uuid: expect 404, the same bytes.
- To reach the 200: no product path creates a project without a need row. Insert one over
  `DB_URL`: `insert into public.projects (org_id, name) values ('<org>', 'Public page probe')
  returning id;` then POST with that id. Expect 200 with `organizationName` equal to the
  organization's `name`.

## What proves it

The response pairs, with the not-public body and the absent body compared byte for byte, plus
the rows over `DB_URL`:

```sql
select p.id, p.name, o.name as organization_name, n.stage
  from public.projects p
  join public.organizations o on o.id = p.org_id
  left join public.need_intakes n on n.project_id = p.id
 where p.id = '<project>';
```

Expect `stage` null for the 200 case and `draft` or `discovery_in_progress` for the not-public
404. The catalog pins the posture:

```sql
select p.prosecdef,
       has_function_privilege('anon', p.oid, 'execute')          as anon_exec,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_exec,
       has_function_privilege('service_role', p.oid, 'execute')  as service_exec
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'read_public_project';
select has_table_privilege('anon', 'public.projects', 'select') as anon_reads_projects;
```

Expect `prosecdef` true, `anon_exec` false, `authenticated_exec` false, `service_exec` true,
and `anon_reads_projects` false.

## Gotchas

- The operator insert for the 200 case is a direct database write. The evidence standard
  forbids that for state the surface can produce. The surface cannot produce a need-less
  project now, so the evidence must say so. `need-intake.md` does the same for the Tier-2
  classification.
- `need-intake.md` states the same rule from the other side: a project with an intake is never
  public.
- The 502 is not drivable on a healthy stack.
