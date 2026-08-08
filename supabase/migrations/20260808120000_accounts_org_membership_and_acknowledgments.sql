-- REQ-001 D1.L1 — accounts, organizations, memberships and the platform acknowledgment.
--
-- The first product migration in this repository. It lands exactly what four acceptance criteria
-- need — AT-001.01, .03, .06 and .07 — and deliberately nothing else. Structure for the other 33
-- P0 ids of REQ-001 arrives with the leaves that test it; a column nothing enforces looks like a
-- requirement being met and is not one.
--
-- WHAT IS DELIBERATELY ABSENT, so a reader does not read the absence as an oversight:
--   * no trigger on `auth.users`. The account row is created by the `complete-signup` edge
--     function. A user who authenticated but never completed signup is a real and honest state —
--     it is literally what AT-001.04 tests for — and a trigger here would be a footgun whose
--     failure mode is a 500 inside Supabase Auth.
--   * no lifecycle / deactivation column. AT-001.29-31 need a gate every write route registers
--     through, which is another leaf's work; a flag nothing reads enforces nothing.
--   * no name / title / authority-attestation columns on `acknowledgments`. Those are AT-001.19's
--     fields and belong to the acknowledgment-identity deliverable.
--   * no tenant-isolation policy set. Row-level security is ENABLED on all four tables and the
--     policies added are only the ones this leaf's own tests need. Everything else stays denied,
--     which is both the minimal change and the safe default.

/* ============================================================ the two closed vocabularies ==== */

-- Mirrors `ACCOUNT_TYPES` in `supabase/functions/_shared/accounts.ts`. Two statements of one fact,
-- and this is the one that wins: `complete_signup` below re-checks the type itself rather than
-- trusting the TypeScript, so an omitted or regressed `parseAccountType` still cannot mint an
-- administrator.
create type public.account_type as enum ('ngo', 'volunteer', 'platform_admin');

-- The PER-NGO role, which is a different axis from the global account type. "NGO admin" means the
-- admin role in THAT NGO (AT-001.36), so it is held on the membership and never on the account.
create type public.org_role as enum ('admin', 'member');

/* ========================================================================== the four tables ==== */

-- ONE ROW PER AUTH USER. The primary key IS the auth user's id, which is what makes "one account
-- holds exactly one global type" structural rather than a rule somebody remembers to apply. There
-- is no second row to hold a second type, and no path that could write one.
create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  account_type public.account_type not null,
  created_at timestamptz not null default now()
);

comment on table public.accounts is
  'One row per authenticated user, holding exactly one global account type (REQ-001, AT-001.01/.06/.07).';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

-- The composite primary key is the multi-NGO invariant in structural form: one row per
-- (organisation, account) pair, so an account can belong to several organisations with a different
-- role in each, and cannot hold two roles in one. AT-001.16 and AT-001.36 test the behaviour that
-- rests on this; neither is landed here.
create table public.org_memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  role public.org_role not null,
  created_at timestamptz not null default now(),
  primary key (org_id, account_id)
);

-- EXACTLY the three fields AT-001.01 names recorded — timestamp, IP and text version — beside the
-- account and the kind that identify the acknowledgment.
--
-- `text_version` carries a non-empty CHECK, and that constraint is load-bearing rather than
-- decorative: an acknowledgment that does not say WHICH text was accepted records nothing, and the
-- constraint is also what the atomicity proof in `loop/items/AI4DEV-57/proof-local.ts` uses to make
-- `complete_signup` fail on its LAST write after its first three have succeeded.
create table public.acknowledgments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null check (length(btrim(kind)) > 0),
  acknowledged_at timestamptz not null default now(),
  ip inet,
  text_version text not null check (length(btrim(text_version)) > 0)
);

create index acknowledgments_account_id_kind_idx on public.acknowledgments (account_id, kind);

/* ================================================================ the acknowledgment predicate == */

-- AT-001.01 requires the acknowledgment "before any project creation is possible", and no projects
-- table exists in this tree. This predicate is the OBSERVABLE FORM of that clause: the leaf that
-- lands project creation calls it, and until then it is the hook and nothing more.
--
-- IT DISCRIMINATES, and the acceptance test asserts both halves — false for an authenticated user
-- who has not completed signup, true for one who has. A `return true` implementation would FAIL
-- AT-001.01 rather than satisfy it. What this leaf cannot do is ENFORCE the clause; saying so here
-- keeps the predicate's existence from implying otherwise.
create function public.has_platform_acknowledgment(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.acknowledgments
     where account_id = p_account_id
       and kind = 'platform_tos_and_promise'
  );
$$;

comment on function public.has_platform_acknowledgment(uuid) is
  'True once the account has accepted the ToS + Platform Promise (REQ-001, AT-001.01). The gate that consumes it lands with project creation.';

/* ============================================================= the one transactional write path == */

-- ALL FOUR WRITES, OR NONE.
--
-- The signup completion writes an account row, and for an NGO an organisation and an `admin`
-- membership, and an acknowledgment. Performed as separate Data API calls those would be four
-- separate transactions, and a partial failure would leave an account with no organisation,
-- membership or acknowledgment — a state no acceptance criterion describes and nothing would ever
-- repair. A single function call is one round trip and one implicit transaction, which is what
-- makes "in one transaction" true rather than merely stated.
--
-- IT RE-CHECKS THE ACCOUNT TYPE ITSELF AND RAISES ON `platform_admin`. That duplicates a check
-- `parseAccountType` in `supabase/functions/_shared/accounts.ts` already makes, and the duplication
-- is the point: it is written down here so a later reader does not delete it as redundant.
--
-- Why the duplication is needed at all, stated exactly, because an earlier version of this
-- reasoning was wrong. Row-level security is NOT in the signup path: the public edge function must
-- write with the service role, and the service role bypasses row-level security entirely. So the
-- missing insert policy stops a browser holding the public key and stops NOTHING on the path that
-- actually writes. Before this check, `parseAccountType` was the only thing between an anonymous
-- HTTP request and a minted platform administrator. This check lives in the database, sits on the
-- only write path, and does not depend on the edge function's TypeScript.
create function public.complete_signup(
  p_account_id uuid,
  p_account_type text,
  p_organization_name text,
  p_acknowledgment_text_version text,
  p_ip inet
)
returns jsonb
language plpgsql
-- SECURITY DEFINER, and this is what makes the guard below MEAN something.
--
-- Measured on the replayed database: `service_role` holds no SELECT and no INSERT on any of these
-- four tables. It has BYPASSRLS, which is why it is easy to assume it can do anything, and it
-- cannot — row-level security and table privileges are different mechanisms and only the first is
-- bypassed. So a SECURITY INVOKER function called with the service role fails on its first insert,
-- and both edge functions would have been broken against the real database.
--
-- The fix could have been `grant insert on … to service_role`, and that would have been worse. It
-- would give the service role a direct write path into `public.accounts`, so anyone holding that
-- key could write `account_type = 'platform_admin'` straight into the table and never come near the
-- refusal below — and the whole point of that refusal is that it sits on the ONLY write path.
-- Running as the owner instead, with no table privileges granted to the service role at all, is
-- what makes "the only write path" literally true.
--
-- `set search_path = ''` is mandatory on a definer function and every name below is
-- schema-qualified for it. Without it, a caller who can create objects in a schema earlier in the
-- path can make this function resolve their table instead of ours, while running as the owner.
security definer
set search_path = ''
as $$
declare
  v_account_type public.account_type;
  v_organization_id uuid := null;
begin
  -- THE INDEPENDENT GUARD. Named before the general enum check so the refusal says the right thing:
  -- `platform_admin` is not an unknown type, it is a real one that this path may never produce.
  if p_account_type = 'platform_admin' then
    raise exception
      'complete_signup refuses account type platform_admin: a platform administrator is provisioned, never self-signed-up'
      using errcode = '42501';
  end if;

  if p_account_type is null or p_account_type not in ('ngo', 'volunteer') then
    raise exception 'complete_signup refuses account type %: public signup offers ngo or volunteer',
      coalesce(p_account_type, '<null>')
      using errcode = '22023';
  end if;

  v_account_type := p_account_type::public.account_type;

  if v_account_type = 'ngo' and (p_organization_name is null or length(btrim(p_organization_name)) = 0) then
    raise exception 'complete_signup refuses an NGO completion with no organisation name'
      using errcode = '22023';
  end if;

  if v_account_type = 'volunteer' and p_organization_name is not null then
    raise exception 'complete_signup refuses an organisation name on a volunteer completion: one account holds exactly one global type'
      using errcode = '22023';
  end if;

  -- (1) the account. The primary key does the "already completed" refusal on its own; catching it
  -- turns a raw unique-violation into a sentence a caller can pass on.
  begin
    insert into public.accounts (id, account_type)
    values (p_account_id, v_account_type);
  exception
    when unique_violation then
      raise exception 'complete_signup refuses %: this account has already completed signup', p_account_id
        using errcode = '23505';
  end;

  -- (2) and (3) the organisation and its admin membership, for an NGO only.
  if v_account_type = 'ngo' then
    insert into public.organizations (name)
    values (btrim(p_organization_name))
    returning id into v_organization_id;

    insert into public.org_memberships (org_id, account_id, role)
    values (v_organization_id, p_account_id, 'admin');
  end if;

  -- (4) the ToS + Platform Promise acknowledgment.
  --
  -- RECORDED FOR BOTH ACCOUNT TYPES, and this is a reading of the plan rather than a copy of it.
  -- AT-001.01 states the criterion for an NGO, but the completion request requires an
  -- acknowledgment text version from every caller (see `validateCompleteSignup`), and requiring a
  -- field and then discarding it for one of the two types is not defensible: it would mean a
  -- volunteer accepted the terms and the platform kept no record of which terms. The organisation
  -- and the membership stay NGO-only.
  insert into public.acknowledgments (account_id, kind, ip, text_version)
  values (p_account_id, 'platform_tos_and_promise', p_ip, p_acknowledgment_text_version);

  return jsonb_build_object(
    'account_id', p_account_id,
    'account_type', v_account_type,
    'organization_id', v_organization_id
  );
end;
$$;

comment on function public.complete_signup(uuid, text, text, text, inet) is
  'The one transactional signup-completion write path (REQ-001, AT-001.01/.03). All four rows or none; refuses platform_admin independently of the edge function.';

-- THE SECOND TWO-WRITE PATH, and this object is NOT in the plan's list for this step.
--
-- Recorded as a deviation rather than slipped in. The plan's step 4 names the two enums, the four
-- tables, the acknowledgment predicate and `complete_signup`; the `create-organization` edge
-- function was added by the plan review because AT-001.06 had no product operation to test. But
-- creating an organisation is TWO writes — the organisation and its `admin` membership — and issued
-- as two Data API calls those are two transactions. A failure between them leaves an organisation
-- nobody is a member of. That is the same defect the review found in the signup path and ruled a
-- transaction for; leaving it here would reinstate it in the very function the ruling added.
--
-- IT DOES NOT RE-DECIDE ANYTHING. Unlike `complete_signup`, this function performs no account-type
-- check: the NGO-only refusal is `ngoOnlyActionAllowed` in `supabase/functions/_shared/accounts.ts`
-- and must stay there, because that is what makes AT-001.06 a test of shipped logic. Duplicating it
-- here would move the decision away from the module the acceptance suite drives. The privilege-
-- escalation duplication in `complete_signup` is justified by what it guards — the account TYPE, on
-- the only path that can mint an administrator — and that argument does not extend to this one.
create function public.create_organization(
  p_account_id uuid,
  p_name text
)
returns jsonb
language plpgsql
-- SECURITY DEFINER for the same measured reason as `complete_signup`: the service role has no
-- INSERT on `public.organizations` or `public.org_memberships`, so an invoker function would fail
-- on its first write.
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'create_organization refuses an empty organisation name'
      using errcode = '22023';
  end if;

  insert into public.organizations (name)
  values (btrim(p_name))
  returning id into v_organization_id;

  insert into public.org_memberships (org_id, account_id, role)
  values (v_organization_id, p_account_id, 'admin');

  return jsonb_build_object('organization_id', v_organization_id);
end;
$$;

comment on function public.create_organization(uuid, text) is
  'Creates an organisation and its admin membership in one transaction (REQ-001, AT-001.06). The NGO-only decision is made before this, in the shared module.';

/* ================================================================== row-level security + grants == */

alter table public.accounts enable row level security;
alter table public.organizations enable row level security;
alter table public.org_memberships enable row level security;
alter table public.acknowledgments enable row level security;

-- NO POLICIES ARE ADDED. With row-level security on and no policy, every client-key read and write
-- is denied, which is exactly what this leaf's tests need and the safe default for everything else.
-- The tenant-isolation policy set — who may read what, across NGOs, volunteers and the platform
-- administrator — is AT-001.21 through .24 and .40, and belongs to the tenant-isolation
-- deliverable.

-- WHY THIS GRANT EXISTS, because it looks backwards on first reading.
--
-- `[api] auto_expose_new_tables` is unset in `supabase/config.toml`, so new tables are NOT reachable
-- through the Data API roles without an explicit grant. Left ungranted, a client-key insert into
-- `public.accounts` fails at the PRIVILEGE layer ("permission denied for table accounts") and
-- row-level security is never consulted at all — so "denied by row-level security" would be a claim
-- about a mechanism that did not run.
--
-- Granting the privilege and denying by policy is the canonical Supabase posture and it makes the
-- claim true: with the grant present and no insert policy, the refusal is
-- "new row violates row-level security policy for table \"accounts\"", which names the layer that
-- actually refused. `loop/items/AI4DEV-57/proof-local.ts` asserts that message, not merely that
-- something failed. The other three tables get no grant and are unreachable through the Data API
-- entirely, which is stricter still.
grant select, insert on public.accounts to authenticated;

-- THE ONE PRIVILEGE THE SERVICE ROLE HOLDS ON A TABLE, and it is a read.
--
-- `create-organization` asks the Data API for the caller's `account_type` before deciding, and that
-- read is the only thing on either edge-function path that does not go through one of the functions
-- above. Everything that WRITES goes through a SECURITY DEFINER function, so the service role has
-- no INSERT anywhere in this schema — which is what stops the service-role key from writing
-- `account_type = 'platform_admin'` directly past `complete_signup`'s refusal.
--
-- A consequence worth stating rather than discovering later: a platform administrator therefore
-- cannot be provisioned with the service-role key either. Provisioning one is a direct database
-- operation by an operator. That is a narrower authority than the service role, not a wider one,
-- and it keeps "provisioned, never self-signed-up" (AT-001.07) true of every path a running service
-- has access to.
grant select on public.accounts to service_role;

-- THE REVOKE IS THE LOAD-BEARING HALF, AND IT WAS FOUND BY MEASURING RATHER THAN BY REASONING.
--
-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default, and every Data API role
-- inherits that. The first replay of this migration was introspected with
-- `has_function_privilege`, and `anon` could execute BOTH functions — so an anonymous caller
-- holding only the publishable key could have POSTed `/rest/v1/rpc/complete_signup` with any
-- `p_account_id` at all and minted an `ngo` account and an organisation against someone else's auth
-- user. (The `platform_admin` guard above held, so the worst case was not an administrator; it was
-- still a write nobody authorised.) Granting without revoking would have left that open while the
-- migration read as if it had locked the functions down.
--
-- Both functions are server-side only: the edge functions call them with the service role, and no
-- browser has any business calling either. `has_platform_acknowledgment` is restricted just as
-- tightly — it answers a question about an account id, and letting any signed-in caller ask it
-- about any id is a small existence oracle for no gain, since nothing client-side calls it.
revoke execute on function public.complete_signup(uuid, text, text, text, inet) from public;
revoke execute on function public.create_organization(uuid, text) from public;
revoke execute on function public.has_platform_acknowledgment(uuid) from public;

grant execute on function public.complete_signup(uuid, text, text, text, inet) to service_role;
grant execute on function public.create_organization(uuid, text) to service_role;
grant execute on function public.has_platform_acknowledgment(uuid) to service_role;

-- PostgREST caches the schema. Without this, the first call to a freshly created function is a 404
-- from the schema cache rather than a real answer.
notify pgrst, 'reload schema';
