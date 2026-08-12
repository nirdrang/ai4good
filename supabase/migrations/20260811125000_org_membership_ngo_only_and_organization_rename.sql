-- REQ-001 D3.L1 — per-organisation roles: the NGO-only membership rule and the admin-only rename.
--
-- WHY THE VERSION STAMP IS 20260811125000 AND NOT 20260811120000, which is what this file carried
-- while it was written. The acknowledgment-identity leaf landed on main under the SAME stamp, and a
-- migration version is a key: `supabase_migrations.schema_migrations` holds one row per version, so
-- the two files collided the moment the two branches met. Measured on database slot 2 before the
-- rename: `supabase db reset` exited 1, three of the five migrations applied, and BOTH this file and
-- the one after it never ran. The stamp moved 5 minutes forward rather than back, because the
-- acknowledgment-identity migration really did land first and the order here is the true one; the
-- migration already on main was never renamed.
--
-- The first migration landed the SHAPE of per-organisation roles — the `org_role` enum and
-- `public.org_memberships` with its composite primary key — and said in its own comment that
-- AT-001.16 and AT-001.36 are "neither … landed here". This migration lands the SEMANTICS those
-- criteria are about: who may be granted a per-organisation role at all, and what an admin-only
-- NGO-side action is.
--
-- TWO OBJECTS, ONE FOR EACH HALF:
--   * a BEFORE trigger on `public.org_memberships` that refuses any grantee whose account type is
--     not `ngo` — AT-001.37, whose words are "when ANY PATH attempts to grant it a per-NGO role";
--   * `public.update_organization`, the admin-only action AT-001.16 and AT-001.36 are graded
--     through, with the membership-and-role check repeated here as a backstop.
--
-- WHAT IS DELIBERATELY ABSENT, so a reader does not read the absence as an oversight:
--   * no tenant-isolation policy set. Row-level security stays on with zero policies on these
--     tables. Who may READ what across organisations is `loop/decomp/req-001.md` D5.L1's, which is
--     blocked by this leaf; a policy written here would be an untested requirement.
--   * no product path that writes the `member` role. The single-seat invariant forbids invites
--     (AT-001.17), so there is nothing for such a path to be, and the enum's `member` half is
--     reached by an operator provisioning AT-001.36's Given.
--   * no role-change audit. That is AT-001.33's, in the audit deliverable.

/* ================================================== the NGO-only rule, on the only write path == */

-- WHY A TRIGGER AND NOT A CHECK IN EACH WRITER. The product writers already refuse: a volunteer
-- completion carrying an organisation name is refused by `complete_signup`, and
-- `create_organization` refuses a non-NGO caller with its own backstop. Both of those sit on
-- PRODUCT paths. AT-001.37 says "any path", and the paths that are left are the ones with no
-- TypeScript and no product function on them at all — a direct insert by an operator, and a future
-- writer nobody has written yet. A trigger is the only object that sits on every one of them.
--
-- `platform_admin` IS REFUSED TOO, and that is a reading of the criterion rather than an accident:
-- "per-NGO roles are NGO accounts only" names one type, and the administrator's cross-account reach
-- is AT-001.40's, a different deliverable's id, declared red here. Granting it now would be
-- building an untested requirement — the same reading `ngoOnlyActionAllowed` makes for the global
-- NGO-only action.
--
-- SECURITY DEFINER so the read below does not depend on the writer's own privileges. The trigger
-- runs as whoever performs the insert, and the whole point of this object is that it holds on paths
-- nobody has designed yet. `set search_path = ''` is mandatory on a definer function and every name
-- is schema-qualified for it.
create function public.org_membership_grantee_must_be_ngo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_type public.account_type;
begin
  select account_type into v_account_type
    from public.accounts
   where id = new.account_id;

  -- NO ACCOUNT ROW IS ITS OWN REFUSAL, WITH ITS OWN SENTENCE, and it is stated rather than left to
  -- whichever constraint happens to fire first. A BEFORE ROW trigger runs before the foreign key on
  -- `account_id` is checked, so this branch is the one a caller meets when the grantee never
  -- completed signup — measured on the slot stack and recorded in
  -- `loop/items/AI4DEV-62/artifacts/verify-first-answers.md`, answer (b). Collapsing it into the
  -- NGO-only refusal below would tell a caller the account is of the wrong type when there is no
  -- account at all.
  if v_account_type is null then
    raise exception
      'org_memberships refuses a per-organisation role for %: no account has completed signup for this user, so it holds no account type',
      new.account_id
      using errcode = '23503';
  end if;

  if v_account_type <> 'ngo' then
    raise exception
      'org_memberships refuses a per-organisation role for account % of type %: per-NGO roles are NGO accounts only',
      new.account_id, v_account_type
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.org_membership_grantee_must_be_ngo() is
  'Refuses a per-organisation role for any account that is not of type ngo, on every SQL path including an operator insert (REQ-001, AT-001.37).';

-- BEFORE INSERT **OR UPDATE**: without the update half, a row could be inserted for an NGO account
-- and then re-pointed at a volunteer, which is the same grant reached in two statements.
create trigger org_memberships_grantee_must_be_ngo
before insert or update on public.org_memberships
for each row
execute function public.org_membership_grantee_must_be_ngo();

-- A trigger function is not usefully callable outside trigger context, but PostgreSQL still grants
-- EXECUTE on a new function to PUBLIC and the first migration found by measuring that every Data API
-- role inherits that. The revoke is repeated here so the posture is the same for every function this
-- schema carries rather than the same for the ones somebody remembered.
revoke execute on function public.org_membership_grantee_must_be_ngo() from public;

/* ============================================== the admin-only action, per organisation ======== */

-- THE ADMIN-ONLY NGO-SIDE ACTION IS A RENAME, and the choice is deliberate. AT-001.36 needs an
-- action that an `admin` performs and a `member` may not, on an organisation that already exists,
-- so the same account can attempt it in two organisations and get two different answers. Creating
-- an organisation cannot serve: its caller is never already a member of the thing being created.
--
-- THE USER-FACING DECISION IS THE SHARED MODULE'S, not this function's. `orgAdminActionAllowed` in
-- `supabase/functions/_shared/memberships.ts` is what the edge function consults and what the
-- acceptance suite drives, and it is what produces the two DISTINCT refusal kinds the criteria
-- read. The checks below are the same backstop `create_organization` carries and for the same
-- measured reason: `service_role` holds EXECUTE on this function, so a service-role key holder
-- reaches it with no TypeScript in the path at all. A guard on the only write path does not depend
-- on the code that normally calls it.
--
-- SECURITY DEFINER for the reason both earlier write functions are: `service_role` holds no UPDATE
-- on `public.organizations`, so an invoker function would fail on its write. Nothing is granted to
-- the service role to make this work; the function runs as the owner instead, which is what makes
-- "the only write path" literally true.
create function public.update_organization(
  p_account_id uuid,
  p_organization_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.org_role;
  v_name text;
begin
  -- THE TRIM CARRIES AN EXPLICIT WHITESPACE SET, and the explicitness is the whole content of it:
  -- `btrim(text)` with one argument strips SPACES ONLY, so a name of one TAB passed the emptiness
  -- check and was stored as a visually blank name. Measured on slot 2 before the fix and after it
  -- (`loop/items/AI4DEV-62/artifacts/gate2-verify-answers.md`, v3): the tab-only rename succeeded,
  -- and now it refuses with this SQLSTATE. The shared `validateOrganizationName` rejects it on the
  -- edge path; this is the backstop for the service-role caller that reaches the function directly,
  -- so the two surfaces must apply the same rule.
  if p_name is null or length(btrim(p_name, E' \t\r\n\f')) = 0 then
    raise exception 'update_organization refuses an empty organisation name'
      using errcode = '22023';
  end if;
  v_name := btrim(p_name, E' \t\r\n\f');

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'update_organization refuses %: no such organisation', p_organization_id
      using errcode = '23503';
  end if;

  -- THE ROLE IS READ IN THE TARGET ORGANISATION AND NOWHERE ELSE. There is no query here that could
  -- find the caller's role in a different organisation, which is what makes "acting in NGO A never
  -- grants anything in NGO B" structural on this path rather than a rule somebody applied.
  select role into v_role
    from public.org_memberships
   where org_id = p_organization_id
     and account_id = p_account_id;

  if v_role is null then
    raise exception
      'update_organization refuses %: the caller holds no membership in organisation % — membership is held per organisation',
      p_account_id, p_organization_id
      using errcode = '42501';
  end if;

  if v_role <> 'admin' then
    raise exception
      'update_organization refuses %: the caller holds the % role in organisation % — the admin role is held per organisation',
      p_account_id, v_role, p_organization_id
      using errcode = '42501';
  end if;

  update public.organizations
     set name = v_name
   where id = p_organization_id;

  return jsonb_build_object('organization_id', p_organization_id, 'name', v_name);
end;
$$;

comment on function public.update_organization(uuid, uuid, text) is
  'Renames an organisation, permitted to that organisation''s admin only (REQ-001, AT-001.16/.36). The user-facing decision is made before this, in the shared module; the checks here are a backstop for callers that bypassed it.';

/* ================================================================== privilege posture ========== */

-- THE ONE NEW TABLE PRIVILEGE THIS LEAF ADDS, and it is a read, granted for the same reason
-- `select on public.accounts` was: the deployed function must know the caller's role in the target
-- organisation BEFORE it decides, and that read is the only thing on this path that does not go
-- through a definer function. Everything that WRITES still goes through one, so `service_role`
-- gains no INSERT or UPDATE anywhere in this schema — which is what keeps a service-role key from
-- writing a membership row straight past the trigger's product-side companions.
--
-- IT WAS MEASURED RATHER THAN ASSUMED. `loop/items/AI4DEV-62/artifacts/verify-first-answers.md`
-- answer (c) records the service-role REST read of `public.org_memberships` failing at the privilege
-- layer with this grant revoked and succeeding with it present, on the slot stack.
grant select on public.org_memberships to service_role;

-- The same revoke-then-grant the two earlier migrations carry, for the same measured reason: a new
-- function is executable by PUBLIC until this runs, and every Data API role inherits that.
revoke execute on function public.update_organization(uuid, uuid, text) from public;
grant execute on function public.update_organization(uuid, uuid, text) to service_role;

-- PostgREST caches the schema. Without this, the first call to a freshly created function is a 404
-- from the schema cache rather than a real answer.
notify pgrst, 'reload schema';
