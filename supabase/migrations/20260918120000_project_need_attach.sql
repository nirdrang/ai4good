create function public.need_intake_attach(v_need public.need_intakes, p_account_id uuid, p_file jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_byte_size numeric;
begin
  if jsonb_typeof(p_file) is distinct from 'object' then
    raise exception 'a reference file requires an object'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if exists (select 1 from jsonb_object_keys(p_file) as k(key) where key not in ('fileName', 'mediaType', 'byteSize', 'description'))
     or jsonb_typeof(p_file->'fileName') is distinct from 'string'
     or btrim(p_file->>'fileName', E' \t\r\n\f' || chr(160)) = ''
     or jsonb_typeof(p_file->'mediaType') is distinct from 'string'
     or btrim(p_file->>'mediaType', E' \t\r\n\f' || chr(160)) = ''
     or jsonb_typeof(p_file->'byteSize') is distinct from 'number'
     or (p_file ? 'description' and jsonb_typeof(p_file->'description') not in ('string', 'null')) then
    raise exception 'a reference file requires known fields with valid types'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  v_byte_size := (p_file->>'byteSize')::numeric;
  if v_byte_size <= 0 or v_byte_size <> trunc(v_byte_size) then
    raise exception 'a reference file requires a positive whole byte size'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  update public.need_intakes set reference_files = reference_files || jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid(),
    'file_name', btrim(p_file->>'fileName', E' \t\r\n\f' || chr(160)),
    'media_type', btrim(p_file->>'mediaType', E' \t\r\n\f' || chr(160)),
    'byte_size', v_byte_size,
    'description', case when btrim(p_file->>'description', E' \t\r\n\f' || chr(160)) <> '' then p_file->>'description' else null end,
    'added_by_account_id', p_account_id, 'added_at', clock_timestamp()
  )), updated_at = clock_timestamp()
   where project_id = v_need.project_id;
  return true;
end;
$$;
revoke execute on function public.need_intake_attach(public.need_intakes, uuid, jsonb) from public, anon, authenticated, service_role;

create or replace function public.project_need(
  p_account_id uuid,
  p_organization_id uuid,
  p_action text,
  p_project_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_need public.need_intakes;
  v_changed boolean;
  v_role public.org_role;
  v_project_id uuid;
  v_title text;
  v_description text;
  v_urgency text;
begin
  perform public.assert_account_active(p_account_id);

  perform 1 from public.organizations where id = p_organization_id for share;
  if not found then
    raise exception 'project_need refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;
  select role into v_role from public.org_memberships
   where org_id = p_organization_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'project_need refuses %: the caller holds no membership in organisation %', p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'project_need refuses %: only the admin of organisation % may start a need', p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-an-admin';
  end if;

  if p_action = 'start' then
    if not public.has_platform_acknowledgment(p_account_id) then
      raise exception 'project_need refuses %: the account has not accepted the platform terms', p_account_id
        using errcode = '42501', detail = 'platform-acknowledgment-missing';
    end if;
    if p_project_id is not null or jsonb_typeof(p_payload) is distinct from 'object' then
      raise exception 'project_need requires a start payload and no existing project id'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    if exists (select 1 from jsonb_object_keys(p_payload) as k(key) where key not in ('title', 'description', 'urgency')) then
      raise exception 'project_need refuses an unknown intake field'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    v_title := btrim(p_payload->>'title', E' \t\r\n\f' || chr(160));
    if jsonb_typeof(p_payload->'title') is distinct from 'string' or v_title is null or v_title = '' then
      raise exception 'project_need requires a non-empty title'
        using errcode = '22023', detail = 'invalid-name';
    end if;
    if (p_payload ? 'description' and jsonb_typeof(p_payload->'description') not in ('string', 'null'))
       or (p_payload ? 'urgency' and jsonb_typeof(p_payload->'urgency') not in ('string', 'null')) then
      raise exception 'project_need requires text intake fields'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    v_description := case when btrim(p_payload->>'description', E' \t\r\n\f' || chr(160)) <> '' then p_payload->>'description' else null end;
    v_urgency := p_payload->>'urgency';
    if v_urgency is not null and v_urgency not in ('soon', 'this_quarter', 'no_deadline') then
      raise exception 'project_need refuses an unknown urgency'
        using errcode = '22023', detail = 'invalid-request';
    end if;

    insert into public.projects (org_id, name) values (p_organization_id, v_title) returning id into v_project_id;
    insert into public.need_intakes (project_id, org_id, description, urgency)
      values (v_project_id, p_organization_id, v_description, v_urgency::public.need_urgency) returning * into v_need;
    v_changed := true;
  else
    select n.* into v_need from public.need_intakes n join public.projects p on p.id = n.project_id
     where n.project_id = p_project_id and p.org_id = p_organization_id for update of n;
    if not found then
      raise exception 'project_need refuses %: no such need in organisation %', p_project_id, p_organization_id
        using errcode = '42501', detail = 'no-such-need';
    end if;
    case p_action
      when 'save' then v_changed := public.need_intake_save(v_need, p_payload);
      when 'attach' then v_changed := public.need_intake_attach(v_need, p_account_id, p_payload);
      when 'submit' then v_changed := public.need_intake_submit(v_need, p_account_id);
      else raise exception 'project_need refuses an unsupported action'
        using errcode = '22023', detail = 'invalid-request';
    end case;
  end if;
  return jsonb_build_object('need', public.need_intake_view(coalesce(p_project_id, v_need.project_id)), 'changed', v_changed);
end;
$$;
revoke execute on function public.project_need(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.project_need(uuid, uuid, text, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';

