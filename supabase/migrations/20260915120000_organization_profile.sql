-- Organisation profile fields on public.organizations, and the one write that sets all five.
--
-- Signup and create_organization already insert a name and nothing else. The four new columns
-- are nullable so those rows stay valid. A present value is not empty: each column carries
-- length(btrim(..., ASCII white space plus NBSP)) > 0, which a SQL CHECK treats as pass when the
-- column is null. The trim set matches the JavaScript gate, including U+00A0.
--
-- logo, country and website are unconstrained text. AT-002.03 was retired because the product
-- defines no logo rules, and no criterion in this requirement reads a format on the other two.
--
-- public.update_organization is unchanged: one field, one write. This function is the profile
-- route, and it writes name as well so a later edit of all five fields has one door.

alter table public.organizations
  add column mission text check (length(btrim(mission, E' \t\r\n\f' || chr(160))) > 0),
  add column country text check (length(btrim(country, E' \t\r\n\f' || chr(160))) > 0),
  add column website text check (length(btrim(website, E' \t\r\n\f' || chr(160))) > 0),
  add column logo text check (length(btrim(logo, E' \t\r\n\f' || chr(160))) > 0);

create function public.set_organization_profile(
  p_account_id uuid,
  p_organization_id uuid,
  p_name text,
  p_mission text,
  p_country text,
  p_website text,
  p_logo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.org_role;
  v_name text;
  v_mission text;
  v_country text;
  v_website text;
  v_logo text;
begin
  perform public.assert_account_active(p_account_id);

  -- ASCII white space plus NBSP (U+00A0). JavaScript trim strips both; the previous set omitted NBSP.
  v_name := btrim(p_name, E' \t\r\n\f' || chr(160));
  v_mission := btrim(p_mission, E' \t\r\n\f' || chr(160));
  v_country := btrim(p_country, E' \t\r\n\f' || chr(160));
  v_website := btrim(p_website, E' \t\r\n\f' || chr(160));
  v_logo := btrim(p_logo, E' \t\r\n\f' || chr(160));

  if v_name is null or v_name = '' then
    raise exception 'set_organization_profile refuses an empty organisation name'
      using errcode = '22023', detail = 'invalid-name';
  end if;
  if v_mission is null or v_mission = '' then
    raise exception 'set_organization_profile refuses an empty organisation mission'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_country is null or v_country = '' then
    raise exception 'set_organization_profile refuses an empty organisation country'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_website is null or v_website = '' then
    raise exception 'set_organization_profile refuses an empty organisation website'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_logo is null or v_logo = '' then
    raise exception 'set_organization_profile refuses an empty organisation logo'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  perform 1 from public.organizations where id = p_organization_id for update;
  if not found then
    raise exception 'set_organization_profile refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  select role into v_role
    from public.org_memberships
   where org_id = p_organization_id
     and account_id = p_account_id;

  if v_role is null then
    raise exception
      'set_organization_profile refuses %: the caller holds no membership in organisation % — membership is held per organisation',
      p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-a-member';
  end if;

  if v_role <> 'admin' then
    raise exception
      'set_organization_profile refuses %: the caller holds the % role in organisation % — the admin role is held per organisation',
      p_account_id, v_role, p_organization_id
      using errcode = '42501', detail = 'not-an-admin';
  end if;

  update public.organizations
     set name = v_name,
         mission = v_mission,
         country = v_country,
         website = v_website,
         logo = v_logo
   where id = p_organization_id;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'name', v_name,
    'mission', v_mission,
    'country', v_country,
    'website', v_website,
    'logo', v_logo
  );
end;
$$;

comment on function public.set_organization_profile(uuid, uuid, text, text, text, text, text) is
  'Writes the organisation profile (name, mission, country, website, logo), permitted to that organisation''s admin only. Locks the organisation row before the membership read and the update. The user-facing decision is made before this, in the shared module; the checks here are a backstop for callers that bypassed it, including the same white-space set the JavaScript gate trims.';

revoke execute on function public.set_organization_profile(uuid, uuid, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.set_organization_profile(uuid, uuid, text, text, text, text, text)
  to service_role;

notify pgrst, 'reload schema';
