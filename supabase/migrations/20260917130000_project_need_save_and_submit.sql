create function public.need_intake_save(v_need public.need_intakes, p_patch jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_title text;
  v_old_title text;
  v_description text := v_need.description;
  v_urgency public.need_urgency := v_need.urgency;
begin
  if jsonb_typeof(p_patch) is distinct from 'object' then
    raise exception 'a need patch must be an object'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if exists (select 1 from jsonb_object_keys(p_patch) as k(key) where key not in ('title', 'description', 'urgency'))
     or (p_patch ? 'title' and jsonb_typeof(p_patch->'title') is distinct from 'string')
     or (p_patch ? 'description' and jsonb_typeof(p_patch->'description') not in ('string', 'null'))
     or (p_patch ? 'urgency' and jsonb_typeof(p_patch->'urgency') not in ('string', 'null')) then
    raise exception 'a need patch requires known fields with valid types'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  select name into v_old_title from public.projects where id = v_need.project_id;
  v_title := v_old_title;
  if p_patch ? 'title' then
    v_title := btrim(p_patch->>'title', E' \t\r\n\f' || chr(160));
    if v_title = '' then
      raise exception 'a need requires a non-empty title'
        using errcode = '22023', detail = 'invalid-name';
    end if;
  end if;
  if p_patch ? 'description' then
    v_description := case when btrim(p_patch->>'description', E' \t\r\n\f' || chr(160)) <> '' then p_patch->>'description' else null end;
  end if;
  if p_patch ? 'urgency' then
    if p_patch->>'urgency' not in ('soon', 'this_quarter', 'no_deadline') then
      raise exception 'a need requires a known urgency'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    v_urgency := (p_patch->>'urgency')::public.need_urgency;
  end if;
  if v_title is not distinct from v_old_title and v_description is not distinct from v_need.description
     and v_urgency is not distinct from v_need.urgency then
    return false;
  end if;
  if v_title is distinct from v_old_title then
    update public.projects set name = v_title where id = v_need.project_id;
  end if;
  update public.need_intakes set description = v_description, urgency = v_urgency, updated_at = clock_timestamp()
   where project_id = v_need.project_id;
  return true;
end;
$$;
revoke execute on function public.need_intake_save(public.need_intakes, jsonb) from public, anon, authenticated, service_role;

create function public.need_intake_submit(v_need public.need_intakes, p_account_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  if v_need.stage = 'discovery_in_progress' then return false; end if;
  if btrim(coalesce(v_need.description, ''), E' \t\r\n\f' || chr(160)) = '' then
    raise exception 'project_need refuses submission of %: the problem description is missing', v_need.project_id
      using errcode = 'P0001', detail = 'missing-description';
  end if;
  update public.need_intakes set stage = 'discovery_in_progress', submitted_at = clock_timestamp()
   where project_id = v_need.project_id;
  return true;
end;
$$;
revoke execute on function public.need_intake_submit(public.need_intakes, uuid) from public, anon, authenticated, service_role;

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
