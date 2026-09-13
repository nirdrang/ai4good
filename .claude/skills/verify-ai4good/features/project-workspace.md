# Project workspace (assigned volunteer, member and platform-admin read)

A signed-in user opens one project and sees its name, its organization, and who holds its
developer seat. Three kinds of caller see it: the volunteer seated on the project, a member of
the owning organization, and a platform administrator. Every other caller gets one fixed 404,
the same constant the organization dashboard answers.

## Sub-features

- Org member: 200 with `projectId`, `projectName`, `organizationId` and `assignedVolunteerId`
  (null while the seat is empty).
- Assigned volunteer: the same 200. The policy admits the caller when
  `assigned_volunteer_id = auth.uid()` and the caller holds a `volunteer` account. An empty
  seat admits nobody: `null = auth.uid()` is not true.
- Platform administrator: the same 200 for any project.
- Everyone else, and an absent id: 404
  `{"ok": false, "reason": "no such thing is visible to this caller"}`, byte-identical to the
  dashboard's constant.
- The seat holds a volunteer only. The trigger `projects_seat_holds_a_volunteer` refuses an
  insert or update that seats a non-volunteer account (SQLSTATE `42501`). It refuses an id
  with no `accounts` row (SQLSTATE `23503`). It runs on every SQL path.
- Transport refusals, all `{ok: false, reason}` with no `kind`. 405 for a method other than
  POST. 401 when no `Authorization` header reaches the function. 400 for a body that is not a
  JSON object. 400 for a `projectId` that is not a uuid. 502 with the dashboard's read-failed
  sentence.

## How to get to it (user POV)

A volunteer opens the project they are seated on. An NGO admin opens one of their
organization's projects. A platform administrator opens any project. The API is the
`project-workspace` edge function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/project-workspace`, headers `Authorization: Bearer <access_token>`
and `apikey: <ANON_KEY>`, body `{"projectId": "<uuid>"}`.

- Create the project as the NGO drive's user with `project-need` `start` (see
  `need-intake.md`). Then read it back as that user: expect 200 with `assignedVolunteerId`
  null.
- As a second NGO user: expect the 404 constant.
- As any signed-in caller with a random uuid: expect the 404 constant, the same bytes.
- Assigned volunteer: read as the volunteer before seating, expect 404. Seat the volunteer
  over `DB_URL`:
  `update public.projects set assigned_volunteer_id = '<volunteer account id>' where id = '<project>';`
  Read again as the volunteer: expect 200 with `assignedVolunteerId` equal to the volunteer's
  account id.
- As a platform administrator: expect 200.

## What proves it

The response pairs, plus the row over `DB_URL`:

```sql
select id, name, org_id, assigned_volunteer_id from public.projects where id = '<project>';
select tgname from pg_trigger
 where tgrelid = 'public.projects'::regclass and not tgisinternal;
```

Expect `projects_seat_holds_a_volunteer` among the triggers. For the seat rule, run over
`DB_URL` `update public.projects set assigned_volunteer_id = '<ngo account id>' where id =
'<project>';`. Expect SQLSTATE `42501` with the message "projects refuses assignment: the
developer seat admits volunteer accounts only". The row is unchanged.

## Gotchas

- No product path seats a volunteer. The operator `update` over `DB_URL` is the only way, and
  the evidence must say so.
- The volunteer account needs the GitHub gate (see `volunteer-signup-github-gate.md`). When no
  volunteer account exists, drive the member and platform-admin cases and say which cases ran.
  The shipped drive `scripts/drive-access-and-admin.ts` does not drive the platform-administrator
  read either; say so when it did not run.
- The project that `start` creates carries a need row. That changes nothing here, but it makes
  the public page answer 404 (see `public-project.md`).
- `verify_jwt = true`: the gateway refuses a missing or invalid bearer before the function
  runs. Assert the status only for that case.
