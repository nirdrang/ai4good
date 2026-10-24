create or replace function public.discovery_file_commit(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid, p_action text, p_file jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role public.org_role; v_project public.projects; v_revision bigint; v_file public.discovery_files;
begin
  perform public.assert_account_active(p_account_id);
  if not exists (select 1 from public.accounts where id = p_account_id and account_type = 'ngo') then
    raise exception 'only NGO accounts may add or remove Discovery files' using errcode = '42501', detail = 'not-an-ngo-account';
  end if;
  perform 1 from public.organizations where id = p_organization_id for share;
  if not found then
    raise exception 'no such organisation' using errcode = '23503', detail = 'no-such-organisation';
  end if;
  select role into v_role from public.org_memberships where org_id = p_organization_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'the caller holds no membership' using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'only the organisation admin may add or remove files' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if exists (select 1 from public.organizations where id = p_organization_id and discovery_disabled_at is not null) then
    raise exception 'Discovery is switched off for this organisation' using errcode = 'P0001', detail = 'discovery-disabled';
  end if;
  if not exists (select 1 from auth.users where id = p_account_id and email_confirmed_at is not null) then
    raise exception 'verify your email before adding files' using errcode = '42501', detail = 'email-unverified';
  end if;
  select * into v_project from public.projects where id = p_project_id and org_id = p_organization_id for update;
  if not found then
    raise exception 'no such project in this organisation' using errcode = '23503', detail = 'no-such-project';
  end if;
  if not exists (select 1 from public.need_intakes where project_id = p_project_id and stage = 'discovery_in_progress') then
    raise exception 'the need is not in Discovery' using errcode = 'P0001', detail = 'need-not-in-discovery';
  end if;
  select max(revision) into v_revision from public.brief_revisions where project_id = p_project_id;
  if exists (select 1 from public.discovery_confirmations where project_id = p_project_id and revision = v_revision) then
    raise exception 'Discovery is finished. No files can be added or removed.' using errcode = 'P0001', detail = 'finished';
  end if;
  if p_action = 'remove' then
    update public.discovery_files set removed_at = clock_timestamp(), removed_by = p_account_id
      where id = (p_file->>'id')::uuid and project_id = p_project_id and removed_at is null returning * into v_file;
    if not found then
      raise exception 'the file is not in this project' using errcode = 'P0001', detail = 'no-such-file';
    end if;
    return to_jsonb(v_file);
  elsif p_action is distinct from 'add' then
    raise exception 'a file action must be add or remove' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_project.funded_at is null and (select count(*) from public.discovery_files where project_id = p_project_id and removed_at is null) >= 3 then
    raise exception 'You can add up to three files during Discovery while this project is not funded. Remove a Discovery file to add another.'
      using errcode = 'P0001', detail = 'file-limit';
  end if;
  if (select coalesce(sum(size_bytes), 0) from public.discovery_files where project_id = p_project_id and removed_at is null)
      + (p_file->>'sizeBytes')::bigint > 52428800 then
    raise exception 'This project''s files can total 50 MB at most. Remove a file to add this one.'
      using errcode = 'P0001', detail = 'project-files-too-large';
  end if;
  if exists (select 1 from public.discovery_files where project_id = p_project_id and removed_at is null and content_hash = p_file->>'contentHash') then
    raise exception 'This file has already been added.' using errcode = 'P0001', detail = 'duplicate-file';
  end if;
  insert into public.discovery_files(id, project_id, name, media_type, size_bytes, content_hash, created_by)
    values ((p_file->>'id')::uuid, p_project_id, p_file->>'name', p_file->>'mediaType', (p_file->>'sizeBytes')::bigint, p_file->>'contentHash', p_account_id)
    returning * into v_file;
  return to_jsonb(v_file);
end;
$$;
revoke execute on function public.discovery_file_commit(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.discovery_file_commit(uuid, uuid, uuid, text, jsonb) to service_role;

notify pgrst, 'reload schema';
