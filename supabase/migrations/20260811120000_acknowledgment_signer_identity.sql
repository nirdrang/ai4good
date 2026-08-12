-- REQ-001 — WHO SIGNED: name, title and the authority attestation, on every acknowledgment.
--
-- AT-001.19 requires that every acknowledgment record the acting person's name, title and
-- attestation of authority. AT-001.39 makes an omission a refusal that records nothing. This
-- migration puts the three fields on `public.acknowledgments` and carries them through the one
-- transactional write path that creates a row there.
--
-- WHAT THIS MIGRATION DOES NOT DO, said first because the absence is deliberate:
--   * no backfill. `text not null` columns are added with no default, so this migration ABORTS on
--     an acknowledgments table that already holds rows. That is the chosen behaviour rather than an
--     oversight: a backfill would have to invent a signer name, a title and an attestation of
--     authority for rows that never captured one, which is precisely the defect this requirement
--     exists to prevent. No production database exists, and an integration slot is reset and
--     re-migrated from scratch, so the table is empty everywhere this runs.
--   * no second acknowledgment moment. Signup completion is the only one in this tree. Later
--     moments (funding, and REQ-006's) will write the same table, and the constraints below are the
--     hook they inherit — not a claim proved here.
--   * no screen. AT-001.20's copy ships as a constant module in
--     `supabase/functions/_shared/acknowledgment-copy.ts`; displaying it is later UI work.

/* ================================================================ the three identity columns ==== */

-- `!~ '^\s*$'` AND NOT `length(btrim(col)) > 0`, and the difference is measured rather than
-- stylistic. `btrim(x)` with no second argument strips THE SPACE CHARACTER ONLY, so a tab-only
-- name survives it, compares unequal to the empty string, and is stored — a record that names
-- nobody while looking like a record. `\s` is the POSIX regular-expression whitespace class, so
-- `^\s*$` matches the empty string and every all-whitespace string alike. The volunteer-profile
-- migration beside this one documents the same defect and uses the same repaired shape; the older
-- `text_version` constraint still carries the `btrim` form and is left as it stands, because it is
-- not this item's code.
--
-- NOT NULL, AND THEREFORE THE REFUSAL AT-001.39 DEMANDS. A caller that reaches
-- `public.complete_signup` without these values fails here, the whole transaction aborts, and no
-- account, organisation, membership or acknowledgment survives. `validateCompleteSignup` in
-- `supabase/functions/_shared/accounts.ts` refuses the same completion first, with the sentence a
-- person reads; this is the floor under any caller that never went through the edge function.
--
-- `authority_attestation` STORES THE STATEMENT, NOT A BOOLEAN. A `true` records that something was
-- clicked; the statement records WHAT was attested, exactly as `text_version` records which text
-- was accepted. The edge validation accepts exactly one statement today, so the column is what
-- keeps today's rows distinguishable from those of any later statement.
--
-- WHERE THIS FILE'S AUTHORITY ENDS, stated because a reader may assume it goes further. The three
-- constraints above floor PRESENCE and NONBLANK, and nothing else. The CONTENT pin — exactly one
-- statement is valid today — lives in `validateCompleteSignup` and is deliberately NOT duplicated
-- here. A SQL copy of the shipped statement would be a second source of truth for it, and the
-- drift is worse than the gap it closes: one edit to the copy module without a drop-and-recreate
-- migration leaves the database refusing every legitimate completion, so signup is down entirely.
-- A `service_role` caller that bypasses the edge function can therefore store a nonblank statement
-- that is not the shipped one. That row then shows verbatim which statement was affirmed, so a
-- wrong statement is visibly not the shipped one. Accepted residual, recorded in this item's
-- rulings.
--
-- THE TWO BLANK FLOORS ARE NOT THE SAME WIDTH, and that is measured rather than assumed. This
-- file's floor is the POSIX class `[[:space:]]`. The validation layer's floor is ECMAScript
-- `trim()`, which is wider: `U+FEFF` trims to the empty string in the suite's runtime, and it does
-- NOT match `^\s*$` on slot 1. So a FEFF-only signer value is refused by the validation layer and
-- accepted by these constraints. It is reachable only by the same trusted-key caller, and it is
-- the same accepted residual. Chasing the ECMAScript whitespace set through PostgreSQL character
-- classes would rebuild, character by character, the two-source drift hazard the paragraph above
-- rejects. The two measurements are in `loop/items/AI4DEV-65/artifacts/verify-first-feff.txt`.
alter table public.acknowledgments
  add column signer_name text not null check (signer_name !~ '^\s*$'),
  add column signer_title text not null check (signer_title !~ '^\s*$'),
  add column authority_attestation text not null check (authority_attestation !~ '^\s*$');

comment on column public.acknowledgments.signer_name is
  'The acting person''s name — AT-001.19. Acknowledgments are per named human; shared credentials are prohibited.';
comment on column public.acknowledgments.signer_title is
  'The title the acting person held when they made the acknowledgment — AT-001.19.';
comment on column public.acknowledgments.authority_attestation is
  'The authority statement the acting person affirmed, verbatim — AT-001.19. The shipped statement lives in supabase/functions/_shared/acknowledgment-copy.ts.';

/* ====================================================== the write path, recreated with the three = */

-- THE DROP IS LOAD-BEARING, for the reason the previous migration gives and which has not changed:
-- `create function` with a new signature OVERLOADS `public.complete_signup` rather than replacing
-- it, and PostgREST refuses an rpc name it cannot resolve to one function. Dropping and recreating
-- is one statement pair in one migration, which is one transaction, so there is no window in which
-- no `complete_signup` exists.
--
-- THE THREE NEW PARAMETERS CARRY `default null`, AND THAT IS NOT A ROLLING-DEPLOY BRIDGE. The
-- previous migration's four github parameters did bridge a mixed-plane window, but NOT because the
-- columns behind them are nullable — all four `volunteer_profiles` columns are `not null` too. That
-- bridge worked for two other reasons. The defaults let an old five-named-argument call still
-- RESOLVE, and an NGO completion writes NO `volunteer_profiles` row at all, so the whole NGO caller
-- class never reached those `not null` columns. Volunteer completion was fail-closed in that window,
-- which the previous migration states as its honest residual. No caller class avoids the three new
-- columns: EVERY completion writes the acknowledgment row, so a call that omits them fails at the
-- column constraints and the whole transaction aborts. The defaults exist for call-signature
-- tolerance only — a caller that omits them RESOLVES and is then refused by the constraints, which
-- is a stated failure rather than a resolution error. No mixed-plane window exists in any
-- environment this tree has: slots re-migrate from scratch and the edge functions deploy from the
-- same tree as the migrations.
--
-- The privileges go with the dropped function and are re-granted at the end of this file, which is
-- why the revoke and grant statements are repeated rather than assumed to survive: they do not.
drop function public.complete_signup(uuid, text, text, text, inet, text, text[], integer, text);

-- EVERYTHING THE PREVIOUS VERSION DID, UNCHANGED, PLUS THE THREE IDENTITY VALUES ON THE
-- ACKNOWLEDGMENT INSERT.
--
-- Every refusal the previous version raised is reproduced here word for word — the `platform_admin`
-- guard, the unknown-type refusal, the NGO-name rules, the volunteer GitHub link and its backstop,
-- the import checks, the already-completed refusal — because a recreation is an opportunity to lose
-- behaviour silently and the acceptance suite's green ids would not all notice.
--
-- ALL WRITES, OR NONE, still. The account, the organisation and membership for an NGO, the imported
-- profile for a volunteer, and the acknowledgment are one round trip and therefore one implicit
-- transaction. That is what makes AT-001.39's "no acknowledgment record is created" true of the
-- OTHER rows too: a completion refused by the identity constraints leaves nothing at all.
create function public.complete_signup(
  p_account_id uuid,
  p_account_type text,
  p_organization_name text,
  p_acknowledgment_text_version text,
  p_ip inet,
  -- `default null` ON ALL FOUR IS THE DEPLOYMENT BRIDGE the previous migration describes: it is what
  -- lets a five-named-argument call from an edge function that has not rolled yet still resolve to
  -- this function. It changes nothing for a caller that passes all of them.
  p_github_handle text default null,
  p_github_top_languages text[] default null,
  p_github_repository_count integer default null,
  p_github_contribution_summary text default null,
  -- THE THREE IDENTITY VALUES — AT-001.19. `default null` here is call-signature tolerance and
  -- NOTHING MORE; see the paragraph above the drop. A caller that omits them resolves to this
  -- function and is then refused by the columns' `not null`, which is AT-001.39's demanded refusal.
  --
  -- THEY ARRIVE TRIMMED. `validateCompleteSignup` returns the judged values, and the edge function
  -- passes the judged value rather than the raw body value — the same posture `p_github_handle` has.
  p_signer_name text default null,
  p_signer_title text default null,
  p_authority_attestation text default null
)
returns jsonb
language plpgsql
-- SECURITY DEFINER for the measured reason the first migration states at length: `service_role`
-- holds no INSERT on any table in this schema, so an invoker function would fail on its first write,
-- and granting it INSERT instead would open a direct write path around the refusals below.
--
-- `set search_path = ''` is mandatory on a definer function and every name below is
-- schema-qualified for it, INCLUDING `auth.identities`.
security definer
set search_path = ''
as $$
declare
  v_account_type public.account_type;
  v_organization_id uuid := null;
  -- THE TRIM SET IS SPELLED OUT, because `btrim(x)` with no second argument strips THE SPACE
  -- CHARACTER ONLY — so a tab-only handle used to arrive here, survive the trim, compare unequal to
  -- '' and be stored. The set below is the whitespace class the table's `^\s*$` constraints refuse,
  -- written character by character so the two agree: space, tab, newline, carriage return, vertical
  -- tab, form feed. `\013` IS THE VERTICAL TAB IN OCTAL and is written that way on purpose:
  -- PostgreSQL's escape-string syntax has no `\v`, and a backslash before an unrecognised letter is
  -- dropped — `E'\v'` is the letter "v", so spelling it that way would have stripped every "v" out
  -- of volunteers' handles instead of stripping whitespace.
  v_github_handle text := btrim(p_github_handle, E' \t\n\r\013\f');
  v_contribution_summary text := btrim(p_github_contribution_summary, E' \t\n\r\013\f');
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
    -- `v_github_handle` is the WHITESPACE-TRIMMED value (see the declare block), so a handle of
    -- nothing but tabs reaches this test as the empty string and is refused here rather than being
    -- stored and refused later by a constraint name the caller has never heard of.
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

    -- AND THE SECOND, DISTINCT REASON: the list has slots but no languages in them.
    -- `ARRAY[NULL]` and `ARRAY['']` both pass the count above, so counting alone would let a
    -- structurally empty import through with a stated success. This is the SAME predicate the table's
    -- CHECK constraint calls — one implementation of the rule, asked here so the caller gets a
    -- sentence and asked there so no path can bypass it.
    if not public.text_array_entries_all_populated(p_github_top_languages) then
      raise exception
        'complete_signup refuses a volunteer completion whose imported top languages contain a null or blank entry: a list of empty slots is not a list of languages'
        using errcode = '22023';
    end if;

    if p_github_repository_count is null or p_github_repository_count < 0 then
      raise exception
        'complete_signup refuses a volunteer completion whose imported repository count is missing or negative'
        using errcode = '22023';
    end if;

    -- `v_contribution_summary` is whitespace-trimmed with the explicit set, for the reason the
    -- declare block gives: a tab-only summary used to survive the default `btrim` and be stored.
    if v_contribution_summary is null or length(v_contribution_summary) = 0 then
      raise exception
        'complete_signup refuses a volunteer completion whose imported contribution summary is missing, empty or whitespace-only'
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
      v_contribution_summary
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
  -- WHO SIGNED TRAVELS WITH IT - AT-001.19. The three values are already trimmed by
  -- `validateCompleteSignup`; the columns' `not null` and `!~ '^\s*$'` checks are what refuse an
  -- omitted or whitespace-only value from any caller that never went through the edge function, and
  -- because this is one transaction that refusal takes the account, the organisation, the
  -- membership and the profile with it - AT-001.39's "no acknowledgment record is created".
  insert into public.acknowledgments (
    account_id, kind, ip, text_version, signer_name, signer_title, authority_attestation
  )
  values (
    p_account_id,
    'platform_tos_and_promise',
    p_ip,
    p_acknowledgment_text_version,
    p_signer_name,
    p_signer_title,
    p_authority_attestation
  );

  return jsonb_build_object(
    'account_id', p_account_id,
    'account_type', v_account_type,
    'organization_id', v_organization_id
  );
end;
$$;

comment on function public.complete_signup(uuid, text, text, text, inet, text, text[], integer, text, text, text, text) is
  'The one transactional signup-completion write path (REQ-001, AT-001.01/.03/.04/.05/.19/.39). All rows or none; refuses platform_admin, refuses a volunteer completion whose GitHub identity is not linked with the handle it claims, and records who signed - name, title and the authority statement they affirmed.';

/* ============================================================================ privilege posture == */

-- IDENTICAL TO THE PREVIOUS MIGRATION'S, AND RE-STATED BECAUSE THE DROP TOOK THE OLD ONE WITH IT.
--
-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default and every Data API role inherits
-- that, so the freshly created function above is executable by `anon` until this revoke runs. The
-- first migration found that by measuring with `has_function_privilege` rather than by reasoning,
-- and the same measurement is repeated against this signature in the migration-replay capture.
revoke execute on function public.complete_signup(uuid, text, text, text, inet, text, text[], integer, text, text, text, text) from public;
grant execute on function public.complete_signup(uuid, text, text, text, inet, text, text[], integer, text, text, text, text) to service_role;

-- PostgREST caches the schema. Without this, the first call to the recreated function is a 404 from
-- the schema cache rather than a real answer — and after a DROP the stale entry would name a
-- signature that no longer exists. The added COLUMNS need the reload too: the cache describes
-- `public.acknowledgments` as it was before this file ran.
notify pgrst, 'reload schema';
