create function public.viewer_may_read_project_files(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.viewer_is_platform_admin() or exists (
    select 1 from public.projects p
     where p.id = p_project_id
       and (public.viewer_is_org_member(p.org_id)
            or (p.assigned_volunteer_id = (select auth.uid()) and public.viewer_is_volunteer()))
  );
$$;
revoke execute on function public.viewer_may_read_project_files(uuid) from public, anon, authenticated, service_role;
grant execute on function public.viewer_may_read_project_files(uuid) to authenticated;

drop policy discovery_files_members on public.discovery_files;
create policy discovery_files_readers on public.discovery_files for select to authenticated
  using (public.viewer_may_read_project_files(project_id));

drop policy discovery_file_parts_members on public.discovery_file_parts;
create policy discovery_file_parts_readers on public.discovery_file_parts for select to authenticated using (
  exists (select 1 from public.discovery_files f where f.id = file_id and public.viewer_may_read_project_files(f.project_id))
);

create or replace function public.viewer_discovery_files(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.viewer_may_read_project_files(p_project_id) then
    return '[]'::jsonb;
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at, f.id), '[]'::jsonb)
    from public.discovery_files f where f.project_id = p_project_id and f.removed_at is null);
end;
$$;
revoke execute on function public.viewer_discovery_files(uuid) from public, anon, authenticated, service_role;
grant execute on function public.viewer_discovery_files(uuid) to authenticated;

create function public.viewer_project_file(p_file_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', f.id, 'project_id', f.project_id, 'name', f.name, 'media_type', f.media_type, 'size_bytes', f.size_bytes)
    from public.discovery_files f
   where f.id = p_file_id and f.removed_at is null and public.viewer_may_read_project_files(f.project_id);
$$;
revoke execute on function public.viewer_project_file(uuid) from public, anon, authenticated, service_role;
grant execute on function public.viewer_project_file(uuid) to authenticated;

notify pgrst, 'reload schema';
