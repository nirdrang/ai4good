create function public.prd_project_for_repo(p_repo_id bigint)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select project_id
    from public.prd_records
   where repo_id = p_repo_id;
$$;

create function public.prd_can_listen(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_project uuid;
begin
  v_actor := auth.uid();
  if v_actor is null then
    return false;
  end if;
  if p_topic is null or p_topic !~ '^prd:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  v_project := substring(p_topic from 5)::uuid;
  begin
    perform public.assert_account_active(v_actor);
  exception
    when insufficient_privilege then
      return false;
  end;
  return public.prd_role(v_project, v_actor) is not null;
end;
$$;

create function public.prd_record_sequence_ping()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('sequence', new.snapshot_sequence),
    'sequence',
    'prd:' || new.project_id,
    true
  );
  return null;
end;
$$;

create trigger prd_records_sequence_ping
  after update on public.prd_records
  for each row
  when (new.snapshot_sequence is distinct from old.snapshot_sequence)
  execute function public.prd_record_sequence_ping();

create policy prd_broadcast_listen
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and public.prd_can_listen(realtime.topic())
  );

revoke execute on function public.prd_project_for_repo(bigint) from public, anon, authenticated, service_role;
grant execute on function public.prd_project_for_repo(bigint) to service_role;

revoke execute on function public.prd_can_listen(text) from public, anon, authenticated, service_role;
grant execute on function public.prd_can_listen(text) to authenticated;

revoke execute on function public.prd_record_sequence_ping() from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
