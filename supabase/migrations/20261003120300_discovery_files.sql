insert into storage.buckets (id, name, public, file_size_limit)
values ('discovery-files', 'discovery-files', false, 10485760);

create table public.discovery_files (
  id uuid primary key,
  project_id uuid not null references public.projects(id),
  name text not null check (length(btrim(name)) between 1 and 255),
  media_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'reading' check (status in ('reading', 'read', 'failed')),
  heartbeat timestamptz not null default clock_timestamp(),
  facts_count integer not null default 0 check (facts_count >= 0),
  total_parts integer not null default 0 check (total_parts >= 0),
  completed_parts integer not null default 0 check (completed_parts between 0 and total_parts),
  digest jsonb,
  failure_reason text,
  created_by uuid not null references public.accounts(id),
  created_at timestamptz not null default clock_timestamp(),
  removed_at timestamptz,
  removed_by uuid references public.accounts(id)
);
create unique index discovery_files_live_hash on public.discovery_files(project_id, content_hash) where removed_at is null;
create table public.discovery_file_parts (
  file_id uuid not null references public.discovery_files(id),
  part_index integer not null check (part_index >= 0),
  digest jsonb not null check (jsonb_typeof(digest->'facts') = 'array' and jsonb_typeof(digest->'questions') = 'array'),
  primary key (file_id, part_index)
);
revoke all on public.discovery_files, public.discovery_file_parts from anon, authenticated, service_role;
grant select on public.discovery_files, public.discovery_file_parts to authenticated;
alter table public.discovery_files enable row level security;
alter table public.discovery_file_parts enable row level security;
create policy discovery_files_members on public.discovery_files for select to authenticated using (
  (select public.viewer_is_platform_admin()) or exists (
    select 1 from public.projects p where p.id = project_id and public.viewer_is_org_member(p.org_id)
  )
);
create policy discovery_file_parts_members on public.discovery_file_parts for select to authenticated using (
  (select public.viewer_is_platform_admin()) or exists (
    select 1 from public.discovery_files f join public.projects p on p.id = f.project_id
      where f.id = file_id and public.viewer_is_org_member(p.org_id)
  )
);

create function public.viewer_discovery_files(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not (public.viewer_is_platform_admin() or public.viewer_is_org_member(v_org)) then
    return '[]'::jsonb;
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at, f.id), '[]'::jsonb)
    from public.discovery_files f where f.project_id = p_project_id and f.removed_at is null);
end;
$$;
revoke execute on function public.viewer_discovery_files(uuid) from public, anon, authenticated, service_role;
grant execute on function public.viewer_discovery_files(uuid) to authenticated;

create function public.discovery_file_commit(
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
    raise exception 'You can add up to three files during Discovery while this project is not funded. Intake files do not count. Remove a Discovery file to add another.'
      using errcode = 'P0001', detail = 'file-limit';
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

create function public.discovery_file_read(p_file_id uuid, p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_file public.discovery_files; v_project uuid; v_revision bigint; v_document jsonb; v_total integer;
begin
  select project_id into v_project from public.discovery_files where id = p_file_id;
  perform 1 from public.projects where id = v_project for update;
  select * into v_file from public.discovery_files where id = p_file_id for update;
  if not found or v_file.removed_at is not null or v_file.status <> 'reading' then return null; end if;
  perform public.assert_account_active(v_file.created_by);
  if p_action = 'claim' then
    if v_file.heartbeat is distinct from (p_payload->>'heartbeat')::timestamptz then return null; end if;
    update public.discovery_files set heartbeat = clock_timestamp() where id = p_file_id returning * into v_file;
    return jsonb_build_object('file', to_jsonb(v_file), 'brief', public.discovery_brief_payload(v_project),
      'parts', (select coalesce(jsonb_agg(to_jsonb(p) order by part_index), '[]'::jsonb) from public.discovery_file_parts p where file_id = p_file_id));
  elsif p_action = 'heartbeat' then
    update public.discovery_files set heartbeat = clock_timestamp() where id = p_file_id;
  elsif p_action = 'parts' then
    v_total := (p_payload->>'total')::integer;
    if v_total is null or v_total < 1 or (v_file.total_parts > 0 and v_file.total_parts <> v_total) then
      raise exception 'invalid file part count' using errcode = '22023', detail = 'invalid-request';
    end if;
    update public.discovery_files set total_parts = v_total, heartbeat = clock_timestamp() where id = p_file_id;
  elsif p_action = 'part' then
    if (p_payload->>'index')::integer not between 0 and v_file.total_parts - 1 then
      raise exception 'invalid file part index' using errcode = '22023', detail = 'invalid-request';
    end if;
    insert into public.discovery_file_parts(file_id, part_index, digest)
      values (p_file_id, (p_payload->>'index')::integer, p_payload->'digest') on conflict do nothing;
    update public.discovery_files set completed_parts = (select count(*) from public.discovery_file_parts where file_id = p_file_id), heartbeat = clock_timestamp() where id = p_file_id;
  elsif p_action = 'failed' then
    update public.discovery_files set status = 'failed', failure_reason = p_payload->>'reason', heartbeat = clock_timestamp() where id = p_file_id;
  elsif p_action = 'finish' then
    select revision, document into v_revision, v_document from public.brief_revisions where project_id = v_project order by revision desc limit 1;
    if exists (select 1 from public.discovery_confirmations where project_id = v_project and revision = v_revision) then
      raise exception 'Discovery is finished' using errcode = 'P0001', detail = 'finished';
    end if;
    if exists (select 1 from public.discovery_turns where project_id = v_project and status = 'open' and opened_at > clock_timestamp() - interval '150 seconds') then
      return jsonb_build_object('retry', 'turn-in-flight');
    end if;
    if v_revision is null or v_revision is distinct from (p_payload->>'baseRevision')::bigint then
      return jsonb_build_object('retry', 'stale-revision', 'brief', public.discovery_brief_payload(v_project));
    end if;
    if v_file.total_parts = 0 or v_file.completed_parts <> v_file.total_parts then
      raise exception 'the file read is incomplete' using errcode = 'P0001', detail = 'file-reading';
    end if;
    if p_payload->'document' is not null and p_payload->'document' <> 'null'::jsonb and p_payload->'document' is distinct from v_document then
      if p_payload->'document'->>'schemaVersion' is distinct from '1' then
        raise exception 'invalid brief document' using errcode = '22023', detail = 'invalid-request';
      end if;
      insert into public.brief_revisions(project_id, revision, document, created_by) values (v_project, v_revision + 1, p_payload->'document', v_file.created_by);
    end if;
    update public.discovery_files set status = 'read', digest = p_payload->'digest', facts_count = jsonb_array_length(p_payload->'digest'->'facts'), heartbeat = clock_timestamp() where id = p_file_id;
  else
    raise exception 'invalid file read action' using errcode = '22023', detail = 'invalid-request';
  end if;
  return to_jsonb((select f from public.discovery_files f where id = p_file_id));
end;
$$;
revoke execute on function public.discovery_file_read(uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.discovery_file_read(uuid, text, jsonb) to service_role;

create function public.discovery_confirmation_files_ready()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform 1 from public.projects where id = new.project_id for update;
  if exists (select 1 from public.discovery_files where project_id = new.project_id and removed_at is null and status = 'reading') then
    raise exception 'A file is still being read. You can finish when it is ready.' using errcode = 'P0001', detail = 'file-reading';
  end if;
  return new;
end;
$$;
create trigger discovery_confirmation_files_ready before insert on public.discovery_confirmations
  for each row execute function public.discovery_confirmation_files_ready();

notify pgrst, 'reload schema';
