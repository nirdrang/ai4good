-- Product membership inserts name their caller as the actor, append_audit_event derives the label
-- from the actor's account type, the restated writers carry a kind in DETAIL, and
-- set_escalation_contact writes an audit row for the last-resort contact.

create or replace function public.append_audit_event(
  p_kind public.audit_event_kind,
  p_actor uuid,
  p_subject_account uuid,
  p_subject_org uuid,
  p_reason text,
  p_detail jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
begin
  if p_actor is null then
    v_label := 'operator';
  else
    select a.account_type::text || ':' || a.id::text
      into v_label
      from public.accounts a
     where a.id = p_actor;
    if v_label is null then
      v_label := 'operator';
    end if;
  end if;

  insert into public.audit_events
    (event_kind, actor_account_id, actor_label, subject_account_id, subject_org_id, reason, detail)
  values (
    p_kind,
    p_actor,
    v_label,
    p_subject_account,
    p_subject_org,
    p_reason,
    coalesce(p_detail, '{}'::jsonb)
  );
end;
$$;
revoke execute on function public.append_audit_event(public.audit_event_kind, uuid, uuid, uuid, text, jsonb) from public;

create or replace function public.complete_signup(
  p_account_id uuid,
  p_account_type text,
  p_organization_name text,
  p_acknowledgment_text_version text,
  p_ip inet,
  p_github_handle text default null,
  p_github_top_languages text[] default null,
  p_github_repository_count integer default null,
  p_github_contribution_summary text default null,
  p_signer_name text default null,
  p_signer_title text default null,
  p_authority_attestation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_type public.account_type;
  v_organization_id uuid := null;
  v_github_handle text := btrim(p_github_handle, E' \t\n\r\013\f');
  v_contribution_summary text := btrim(p_github_contribution_summary, E' \t\n\r\013\f');
begin
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

  if v_account_type = 'volunteer' then
    if v_github_handle is null or length(v_github_handle) = 0 then
      raise exception
        'complete_signup refuses a volunteer completion with no linked GitHub handle: linking a GitHub account is required to complete volunteer signup'
        using errcode = '42501';
    end if;

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

    if p_github_top_languages is null or cardinality(p_github_top_languages) < 1 then
      raise exception
        'complete_signup refuses a volunteer completion whose imported top languages are missing or empty: a queued-but-empty import is not an import'
        using errcode = '22023';
    end if;

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

    if v_contribution_summary is null or length(v_contribution_summary) = 0 then
      raise exception
        'complete_signup refuses a volunteer completion whose imported contribution summary is missing, empty or whitespace-only'
        using errcode = '22023';
    end if;
  else
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

  begin
    insert into public.accounts (id, account_type)
    values (p_account_id, v_account_type);
  exception
    when unique_violation then
      raise exception 'complete_signup refuses %: this account has already completed signup', p_account_id
        using errcode = '23505';
  end;

  if v_account_type = 'ngo' then
    insert into public.organizations (name)
    values (btrim(p_organization_name))
    returning id into v_organization_id;

    perform set_config('app.actor_account_id', p_account_id::text, true);

    insert into public.org_memberships (org_id, account_id, role)
    values (v_organization_id, p_account_id, 'admin');
  end if;

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
revoke execute on function public.complete_signup(uuid, text, text, text, inet, text, text[], integer, text, text, text, text) from public;
grant execute on function public.complete_signup(uuid, text, text, text, inet, text, text[], integer, text, text, text, text) to service_role;

create or replace function public.create_organization(
  p_account_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_account_type public.account_type;
begin
  perform public.assert_account_active(p_account_id);

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'create_organization refuses an empty organisation name'
      using errcode = '22023', detail = 'invalid-name';
  end if;

  select account_type into v_account_type
    from public.accounts
   where id = p_account_id;

  if v_account_type is null then
    raise exception 'create_organization refuses %: no account has completed signup for this user', p_account_id
      using errcode = '23503', detail = 'no-account';
  end if;

  if v_account_type <> 'ngo' then
    raise exception 'create_organization refuses account type %: creating an organisation is an NGO-only action', v_account_type
      using errcode = '42501', detail = 'not-an-ngo-account';
  end if;

  insert into public.organizations (name)
  values (btrim(p_name))
  returning id into v_organization_id;

  perform set_config('app.actor_account_id', p_account_id::text, true);

  insert into public.org_memberships (org_id, account_id, role)
  values (v_organization_id, p_account_id, 'admin');

  return jsonb_build_object('organization_id', v_organization_id);
end;
$$;
revoke execute on function public.create_organization(uuid, text) from public;
grant execute on function public.create_organization(uuid, text) to service_role;

create or replace function public.update_organization(
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
  perform public.assert_account_active(p_account_id);

  if p_name is null or length(btrim(p_name, E' \t\r\n\f')) = 0 then
    raise exception 'update_organization refuses an empty organisation name'
      using errcode = '22023', detail = 'invalid-name';
  end if;
  v_name := btrim(p_name, E' \t\r\n\f');

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'update_organization refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  select role into v_role
    from public.org_memberships
   where org_id = p_organization_id
     and account_id = p_account_id;

  if v_role is null then
    raise exception
      'update_organization refuses %: the caller holds no membership in organisation % — membership is held per organisation',
      p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-a-member';
  end if;

  if v_role <> 'admin' then
    raise exception
      'update_organization refuses %: the caller holds the % role in organisation % — the admin role is held per organisation',
      p_account_id, v_role, p_organization_id
      using errcode = '42501', detail = 'not-an-admin';
  end if;

  update public.organizations
     set name = v_name
   where id = p_organization_id;

  return jsonb_build_object('organization_id', p_organization_id, 'name', v_name);
end;
$$;
revoke execute on function public.update_organization(uuid, uuid, text) from public;
grant execute on function public.update_organization(uuid, uuid, text) to service_role;

create or replace function public.set_escalation_contact(
  p_account_id uuid,
  p_organization_id uuid,
  p_name text,
  p_email text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_type public.account_type;
  v_name text;
  v_email text;
  v_phone text;
  v_previous jsonb;
begin
  perform public.assert_account_active(p_account_id);

  select account_type into v_caller_type from public.accounts where id = p_account_id;
  if v_caller_type is null then
    raise exception 'set_escalation_contact refuses %: no account has completed signup for this user', p_account_id
      using errcode = '42501', detail = 'no-account';
  end if;
  if v_caller_type <> 'platform_admin' then
    raise exception 'set_escalation_contact refuses account type %: only a platform administrator records an escalation contact', v_caller_type
      using errcode = '42501', detail = 'not-a-platform-admin';
  end if;

  v_name := btrim(p_name, E' \t\r\n\f');
  v_email := btrim(p_email, E' \t\r\n\f');
  v_phone := nullif(btrim(p_phone, E' \t\r\n\f'), '');
  if v_name is null or v_name = '' or v_email is null or v_email = '' or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'set_escalation_contact refuses a contact with no name or no email address'
      using errcode = '22023', detail = 'invalid-contact';
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'set_escalation_contact refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  select jsonb_build_object('name', contact_name, 'email', contact_email, 'phone', contact_phone)
    into v_previous
    from public.org_escalation_contacts
   where org_id = p_organization_id;

  insert into public.org_escalation_contacts
    (org_id, contact_name, contact_email, contact_phone, recorded_by_account_id)
  values (p_organization_id, v_name, v_email, v_phone, p_account_id)
  on conflict (org_id) do update
     set contact_name = excluded.contact_name,
         contact_email = excluded.contact_email,
         contact_phone = excluded.contact_phone,
         recorded_by_account_id = excluded.recorded_by_account_id,
         recorded_at = now();

  perform public.append_audit_event(
    'org_escalation_contact_recorded',
    p_account_id,
    null,
    p_organization_id,
    'escalation contact recorded',
    jsonb_build_object(
      'previous', v_previous,
      'current', jsonb_build_object('name', v_name, 'email', v_email, 'phone', v_phone)
    )
  );

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'contact_name', v_name,
    'contact_email', v_email,
    'contact_phone', v_phone
  );
end;
$$;
revoke execute on function public.set_escalation_contact(uuid, uuid, text, text, text) from public;
grant execute on function public.set_escalation_contact(uuid, uuid, text, text, text) to service_role;

notify pgrst, 'reload schema';
