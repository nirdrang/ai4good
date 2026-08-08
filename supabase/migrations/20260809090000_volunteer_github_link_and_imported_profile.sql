-- REQ-001 D1.L2 — the mandatory GitHub link at volunteer signup, and the profile that link imports.
--
-- The second product migration. It lands exactly what three acceptance criteria need — AT-001.02,
-- .04 and .05 — and deliberately nothing else.
--
-- WHAT IS DELIBERATELY ABSENT, so a reader does not read the absence as an oversight:
--   * no policies on `public.volunteer_profiles`. Row-level security is ENABLED and no policy is
--     added, so every client-key read and write is denied — the same posture as the four tables the
--     first migration created. WHO may read a volunteer's profile is the tenant-isolation
--     deliverable's question (AT-001.21 through .24 and .40), and answering it here would be
--     building an untested requirement.
--   * no unique constraint on `github_handle`. Two accounts linking one GitHub identity is an
--     identity-COLLISION policy, and AT-001.08 is retired in the acceptance file with the reason
--     "the PRD defines no identity-collision/linking policy; re-add if the PRD ever specifies one".
--     A uniqueness rule here would be shipped behaviour no ratified text asks for. (Supabase Auth
--     enforces its own uniqueness on `auth.identities` independently of this table.)
--   * no unlink guard. `enable_manual_linking = true` in `supabase/config.toml` also opens Auth's
--     unlink surface, and nothing here calls it. What should happen if a volunteer unlinks GitHub
--     after signup is a PRODUCT question the PRD does not answer; it is filed for its own board
--     item rather than guessed at in a migration.
--   * no real GitHub import. The stats written below come from `stubGithubStatsFor` in
--     `supabase/functions/_shared/github.ts` — the stub import fixture the decomposition manifest's
--     cross-contract calls for ("stub import fixture until W3"). This migration stores whatever the
--     caller imported and refuses the empty forms; it does not fetch anything and neither does
--     anything else in this item.

/* ================================================================ the imported profile table ==== */

-- ONE ROW PER VOLUNTEER ACCOUNT, keyed by the account itself. The primary key IS the account id, so
-- "a volunteer has at most one imported profile" is structural rather than a rule somebody remembers
-- to apply, exactly as `public.accounts`'s primary key makes one-type-per-account structural.
--
-- THE FOUR CHECK CONSTRAINTS ARE AT-001.05'S LAST SENTENCE AS A SHAPE. The criterion ends "a
-- queued-but-empty import fails this test", so the empty forms are refused by the table and not by a
-- convention: a blank handle, a language list with nothing in it, a negative repository count and a
-- blank summary cannot be stored at all, by any caller, through any path.
--
-- `cardinality(top_languages) >= 1`, AND NOT `array_length(top_languages, 1) >= 1`, and the
-- difference is the whole constraint rather than a stylistic preference. `array_length` returns NULL
-- for an empty array — an empty array has no dimensions — and a CHECK constraint whose expression
-- evaluates to NULL PASSES, because SQL's three-valued logic treats NULL as not-false. The
-- `array_length` form would therefore have enforced nothing at all on the one input it exists to
-- refuse, and nothing downstream would ever have noticed: the stub stats are non-empty by
-- construction, so every test would have stayed green while the structural guarantee was a fiction.
-- `cardinality` returns 0 for the empty array and never NULL, so the comparison is two-valued on
-- exactly the input that matters. The live proof calls this function directly with `'{}'::text[]`
-- and requires a raise, so the claim is measured on the migrated database rather than reasoned about
-- here.
--
-- `repository_count >= 0` PERMITS ZERO on purpose, and the asymmetry with the stub is deliberate: a
-- real import may legitimately find a volunteer with no public repositories, so the column allows
-- it. `stubGithubStatsFor` never produces zero, so a zero read back in a test would mean the value
-- did not come from the stub.
create table public.volunteer_profiles (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  github_handle text not null constraint volunteer_profiles_github_handle_present check (btrim(github_handle) <> ''),
  top_languages text[] not null constraint volunteer_profiles_top_languages_present check (cardinality(top_languages) >= 1),
  repository_count integer not null constraint volunteer_profiles_repository_count_sane check (repository_count >= 0),
  contribution_summary text not null constraint volunteer_profiles_contribution_summary_present check (btrim(contribution_summary) <> ''),
  imported_at timestamptz not null default now()
);

comment on table public.volunteer_profiles is
  'The volunteer GitHub onboarding import, written in the same transaction as the account (REQ-001, AT-001.05). The import SOURCE is the stub fixture in supabase/functions/_shared/github.ts until the volunteer-profile requirement lands the real one; the firing and the populated row are real.';

alter table public.volunteer_profiles enable row level security;

/* ====================================================== the write path, recreated with the gate == */

-- THE DROP IS LOAD-BEARING, not tidiness.
--
-- `create function` with a new signature would OVERLOAD `public.complete_signup` rather than replace
-- it, and PostgREST refuses an rpc name it cannot resolve to one function — the deployed edge
-- function would start failing on a name that had worked for months, with an error about ambiguity
-- that says nothing about this migration. Dropping first and recreating is one statement pair in one
-- migration, which is one transaction: there is no window in which no `complete_signup` exists.
--
-- THE ONLY CALLER IS UPDATED IN THE SAME CHANGE. `supabase/functions/complete-signup/index.ts` is
-- the sole caller of this function in the tree, and it passes the four new parameters as of this
-- item. Nothing else in the repository names it.
--
-- The privileges go with the dropped function and are re-granted below, which is why the revoke and
-- grant statements are repeated rather than assumed to survive: they do not.
drop function public.complete_signup(uuid, text, text, text, inet);

-- EVERYTHING THE FIRST VERSION DID, UNCHANGED, PLUS THE VOLUNTEER GITHUB BRANCH.
--
-- Every refusal the previous version raised is reproduced here word for word — the `platform_admin`
-- guard, the unknown-type refusal, the NGO-name rules, the already-completed refusal — because a
-- recreation is an opportunity to lose behaviour silently and the acceptance suite's four existing
-- green ids would not all notice. What is NEW is the volunteer branch's four-parameter requirement,
-- the identity backstop, and the profile insert that joins the same transaction.
--
-- ALL WRITES, OR NONE, still. The account, the organisation and membership for an NGO, the imported
-- profile for a volunteer, and the acknowledgment are one round trip and therefore one implicit
-- transaction. That is what makes "queued-but-empty is impossible" structural: there is no moment at
-- which a volunteer account exists without its profile, because the two rows land together or
-- neither lands.
create function public.complete_signup(
  p_account_id uuid,
  p_account_type text,
  p_organization_name text,
  p_acknowledgment_text_version text,
  p_ip inet,
  p_github_handle text,
  p_github_top_languages text[],
  p_github_repository_count integer,
  p_github_contribution_summary text
)
returns jsonb
language plpgsql
-- SECURITY DEFINER for the measured reason the first migration states at length: `service_role`
-- holds no INSERT on any table in this schema, so an invoker function would fail on its first write,
-- and granting it INSERT instead would open a direct write path around the refusals below. That
-- reasoning is unchanged and applies to `public.volunteer_profiles` exactly as it does to the other
-- four tables — the service role has no INSERT there either.
--
-- `set search_path = ''` is mandatory on a definer function and every name below is
-- schema-qualified for it, INCLUDING `auth.identities`.
security definer
set search_path = ''
as $$
declare
  v_account_type public.account_type;
  v_organization_id uuid := null;
  v_github_handle text := btrim(p_github_handle);
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

  /* ------------------------------------------------------- the volunteer GitHub link and import */

  if v_account_type = 'volunteer' then
    -- (a) the link itself. This is the database's own statement of AT-001.04, and it is not the
    -- user-facing one: `validateCompleteSignup` in `supabase/functions/_shared/accounts.ts` refuses
    -- the same completion first, with the sentence a person reads. This one exists for the caller
    -- that never went through the edge function at all.
    if v_github_handle is null or length(v_github_handle) = 0 then
      raise exception
        'complete_signup refuses a volunteer completion with no linked GitHub handle: linking a GitHub account is required to complete volunteer signup'
        using errcode = '42501';
    end if;

    -- (b) THE BACKSTOP, AND IT BINDS THE HANDLE RATHER THAN MERELY ASKING WHETHER ONE EXISTS.
    --
    -- Checking only that SOME GitHub identity is linked would answer a different question from the
    -- one the row records. The row records A SPECIFIC HANDLE, so an existence-only check leaves
    -- exactly this gap: a service-role caller supplies a linked account id together with a
    -- DIFFERENT handle and non-empty stats, and a profile commits under a handle the account never
    -- linked. The edge-function path can never exercise that gap — it derives the handle from the
    -- same identity it checks — so no test driving the edge function would have found it.
    --
    -- `identity_data->>'user_name'` is GoTrue's field for the GitHub login, and this is the SECOND
    -- of the two places in this repository that read it; the first is `extractGithubHandle` in
    -- `supabase/functions/_shared/github.ts`. If that field ever turns out to be spelled
    -- differently when a real OAuth app first arrives, the change is a two-place change: the
    -- extractor, and a follow-up migration recreating this function.
    if not exists (
      select 1
        from auth.identities
       where user_id = p_account_id
         and provider = 'github'
         and identity_data->>'user_name' = v_github_handle
    ) then
      raise exception
        'complete_signup refuses volunteer %: no GitHub identity with handle % is linked to this auth user',
        p_account_id, v_github_handle
        using errcode = '42501';
    end if;

    -- (c) the import must have arrived POPULATED. Raised in the function body as well as enforced by
    -- the table's CHECK constraints, so a caller gets a stated reason it can act on rather than a
    -- bare constraint violation naming a constraint it has never heard of.
    --
    -- `cardinality(...) < 1` catches the empty array; the `is null` disjunct catches a missing one.
    -- See the table's own comment for why `array_length` would have caught neither.
    if p_github_top_languages is null or cardinality(p_github_top_languages) < 1 then
      raise exception
        'complete_signup refuses a volunteer completion whose imported top languages are missing or empty: a queued-but-empty import is not an import'
        using errcode = '22023';
    end if;

    if p_github_repository_count is null or p_github_repository_count < 0 then
      raise exception
        'complete_signup refuses a volunteer completion whose imported repository count is missing or negative'
        using errcode = '22023';
    end if;

    if p_github_contribution_summary is null or length(btrim(p_github_contribution_summary)) = 0 then
      raise exception
        'complete_signup refuses a volunteer completion whose imported contribution summary is missing or empty'
        using errcode = '22023';
    end if;
  else
    -- THE MIRROR OF THE ORGANISATION-NAME RULE. GitHub import parameters on an NGO completion mean
    -- the caller and the server disagree about what is being created, and silently dropping them
    -- would let that disagreement reach the database as a missing row instead of surfacing as a
    -- refusal.
    if p_github_handle is not null
       or p_github_top_languages is not null
       or p_github_repository_count is not null
       or p_github_contribution_summary is not null then
      raise exception
        'complete_signup refuses GitHub import parameters on a % completion: the GitHub link and its onboarding import belong to volunteer signup',
        v_account_type
        using errcode = '22023';
    end if;
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

  -- (3b) the volunteer's imported GitHub profile, for a volunteer only — AT-001.05's "onboarding
  -- fires". It is written HERE, between the account and the acknowledgment, because that is what
  -- makes the firing part of the completion rather than a consequence of it: there is no queue, no
  -- job and no second request, so the profile is observable the instant completion returns.
  if v_account_type = 'volunteer' then
    insert into public.volunteer_profiles (
      account_id, github_handle, top_languages, repository_count, contribution_summary
    )
    values (
      p_account_id,
      v_github_handle,
      p_github_top_languages,
      p_github_repository_count,
      btrim(p_github_contribution_summary)
    );
  end if;

  -- (4) the ToS + Platform Promise acknowledgment.
  --
  -- RECORDED FOR BOTH ACCOUNT TYPES, and this is a reading of the plan rather than a copy of it.
  -- AT-001.01 states the criterion for an NGO, but the completion request requires an
  -- acknowledgment text version from every caller (see `validateCompleteSignup`), and requiring a
  -- field and then discarding it for one of the two types is not defensible: it would mean a
  -- volunteer accepted the terms and the platform kept no record of which terms. The organisation
  -- and the membership stay NGO-only.
  --
  -- IT STAYS LAST, and that placement is depended upon: the atomicity proof makes this write fail
  -- after the earlier ones have succeeded, which is how "all or none" is demonstrated rather than
  -- asserted. A volunteer profile inserted above it is part of what must disappear.
  insert into public.acknowledgments (account_id, kind, ip, text_version)
  values (p_account_id, 'platform_tos_and_promise', p_ip, p_acknowledgment_text_version);

  return jsonb_build_object(
    'account_id', p_account_id,
    'account_type', v_account_type,
    'organization_id', v_organization_id
  );
end;
$$;

comment on function public.complete_signup(uuid, text, text, text, inet, text, text[], integer, text) is
  'The one transactional signup-completion write path (REQ-001, AT-001.01/.03/.04/.05). All rows or none; refuses platform_admin, and refuses a volunteer completion whose GitHub identity is not linked with the handle it claims.';

/* ============================================================================ privilege posture == */

-- IDENTICAL TO THE FIRST MIGRATION'S, AND RE-STATED BECAUSE THE DROP TOOK THE OLD ONE WITH IT.
--
-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default and every Data API role inherits
-- that, so the freshly created function above is executable by `anon` until this revoke runs. The
-- first migration found that by measuring with `has_function_privilege` rather than by reasoning,
-- and the same measurement is repeated against this signature in the migration-replay capture.
revoke execute on function public.complete_signup(uuid, text, text, text, inet, text, text[], integer, text) from public;
grant execute on function public.complete_signup(uuid, text, text, text, inet, text, text[], integer, text) to service_role;

-- NO GRANT ON `public.volunteer_profiles` TO ANY ROLE. `[api] auto_expose_new_tables` is unset, so
-- the table is unreachable through the Data API entirely — stricter than the grant-and-deny-by-policy
-- posture `public.accounts` needs, and appropriate here because nothing client-side reads it yet.
-- The service role writes it only through the definer function above.

-- PostgREST caches the schema. Without this, the first call to the recreated function is a 404 from
-- the schema cache rather than a real answer — and after a DROP the stale entry would name a
-- signature that no longer exists.
notify pgrst, 'reload schema';
