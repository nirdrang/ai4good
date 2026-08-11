-- REQ-001 D3.L2 — the single-seat NGO and the single-developer project.
--
-- BOTH INVARIANTS ARE STRUCTURAL HERE, and that is the whole design of this migration. AT-001.17
-- says no capability exists to invite or add a second member to an org; AT-001.32 says attaching a
-- second volunteer to a project is rejected. Neither is expressed as a rule some writer applies —
-- there is no writer to apply it, because no invite path and no attach path exists. They are
-- expressed as SHAPE: a unique index that leaves no room for a second membership row, and one
-- nullable column that can hold at most one developer.
--
-- WHAT IS DELIBERATELY ABSENT, stated so a reader does not read the absence as an oversight:
--   * NO PRODUCT PROJECT CREATION. Nothing in this tree creates a project, and this table does not
--     change that. AT-001.01's clause is that the platform acknowledgment is required "before any
--     project creation is possible", and `public.has_platform_acknowledgment` is still the hook the
--     leaf that lands project creation must call — landing a TABLE is not landing creation, and a
--     gate written here would sit in front of nothing.
--   * NO VOLUNTEER-TYPE VALIDATION OF THE ASSIGNEE. Whether the account attached to a project is of
--     type `volunteer`, and whether it was matched to that project, is the matching requirement's
--     concern. AT-001.32 is about the SECOND volunteer, not about the first one's type, and a check
--     here would be an untested requirement.
--   * NO OFFBOARDING. Releasing the seat to null stays allowed precisely because volunteer
--     offboarding is AT-001.18's, in a different leaf. This migration refuses a REPLACEMENT, which
--     is what "attach a second volunteer" means, and refuses nothing else.
--   * NO POLICIES. Row-level security is enabled and the table reaches no Data API role at all,
--     which is stricter than the grant-and-deny-by-policy posture `public.accounts` needs.

/* ======================================================= the single seat, as an index ========== */

-- STRICTLY STRONGER THAN THE COMPOSITE PRIMARY KEY, which is the point. `primary key (org_id,
-- account_id)` permits many accounts in one organisation with a different role each — the shape a
-- multi-seat product would need. A unique index on `org_id` ALONE permits exactly one membership row
-- per organisation, whoever holds it, so "no second member can be added" is a fact about the table
-- rather than a check somebody remembered to write.
--
-- NOTHING ON MAIN CAN TRIP IT. Every existing writer creates an organisation and seats exactly one
-- admin in it inside one transaction: `complete_signup` for an NGO signup, `create_organization` for
-- a second organisation. Neither ever writes a second row.
--
-- THE OPERATOR IS INSIDE IT TOO. An index is not a product rule and there is no path around it —
-- which is what AT-001.17's "no such capability exists" needs, since the paths that would have to be
-- checked are the ones nobody has written yet.
create unique index org_memberships_one_seat_per_org_idx
  on public.org_memberships (org_id);

comment on index public.org_memberships_one_seat_per_org_idx is
  'The v1 single-seat NGO, in structural form: one membership row per organisation (REQ-001, AT-001.17).';

/* ========================================================================== projects =========== */

-- THE SINGLE-DEVELOPER INVARIANT IS THE COLUMN. `assigned_volunteer_id` is ONE nullable reference,
-- so a project holds at most one developer and there is no collaborator seat to add a second to.
-- A join table would have made "no second volunteer" a rule; a column makes it unrepresentable.
--
-- `on delete set null` on the assignee: deleting the account releases the seat rather than blocking
-- the delete or destroying the project. `public.accounts` cascades from `auth.users`, so the
-- alternative — the default NO ACTION — would make deleting an auth user fail on a project row,
-- which no criterion asks for and nothing would repair.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  assigned_volunteer_id uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.projects is
  'A project and its single developer seat (REQ-001, AT-001.32). Product project creation is NOT landed here; has_platform_acknowledgment is still the hook the leaf that lands it must call.';

create index projects_org_id_idx on public.projects (org_id);

-- THE GUARD IS ABOUT REPLACEMENT, AND ONLY ABOUT REPLACEMENT. Attaching the first volunteer is the
-- assignment; releasing the seat to null is offboarding's, and belongs to another leaf; attaching a
-- DIFFERENT volunteer while one is already attached is "attaching a second volunteer to the
-- project", which AT-001.32 says is rejected. Re-writing the same id is a no-op and stays allowed,
-- because refusing it would make an idempotent write look like a second developer.
--
-- IT IS AN INVOKER FUNCTION, unlike the membership trigger: it reads only OLD and NEW and needs no
-- privilege on any table. `set search_path = ''` is set all the same — nothing here resolves an
-- unqualified name, and a function that cannot be redirected is cheaper to reason about than one
-- that must be argued about.
create function public.project_seat_holds_one_developer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.assigned_volunteer_id is not null
     and new.assigned_volunteer_id is not null
     and new.assigned_volunteer_id <> old.assigned_volunteer_id then
    raise exception
      'projects refuses a second volunteer on project %: its single developer seat is held by account %',
      old.id, old.assigned_volunteer_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function public.project_seat_holds_one_developer() is
  'Refuses re-pointing an occupied project seat at a different account — the single-dev invariant (REQ-001, AT-001.32).';

create trigger projects_single_developer_seat
before update on public.projects
for each row
execute function public.project_seat_holds_one_developer();

revoke execute on function public.project_seat_holds_one_developer() from public;

/* ================================================================== privilege posture ========== */

alter table public.projects enable row level security;

-- NO GRANT STATEMENT IS NOT THE SAME THING AS NO PRIVILEGE, and the preceding migration learned that
-- by measuring rather than by reasoning: its own committed replay capture recorded REFERENCES,
-- TRIGGER and TRUNCATE for `anon`, `authenticated` AND `service_role` on a new public table, because
-- Supabase ships ALTER DEFAULT PRIVILEGES for the `public` schema. Row-level security does not cover
-- TRUNCATE, so the privilege would have been real even though no PostgREST route reaches it.
--
-- SO THE REVOKE IS WHAT MAKES THE POSTURE TRUE, and it is verified rather than asserted: after a
-- reset on the item's slot, the catalog check for these three roles on this table must return ZERO
-- rows. That measurement is recorded in `loop/items/AI4DEV-62/artifacts/verify-first-answers.md`,
-- answer (f). The `postgres` owner rows remain and are not a defect — an owner's implicit privileges
-- are not grants.
revoke all on table public.projects from anon, authenticated, service_role;

-- PostgREST caches the schema; a new table and a new function need the reload to be answerable at
-- all rather than 404 from a stale cache.
notify pgrst, 'reload schema';
