alter table public.prd_sessions
  add column credential_id text check (credential_id is null or length(btrim(credential_id)) > 0);

alter table public.prd_turns
  add column dispatched_at timestamptz;

create function public.prd_session_row(p_chat uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'sessionId', s.provider_session_id,
    'vaultId', s.vault_id,
    'credentialId', s.credential_id,
    'generation', s.credential_generation,
    'cursor', s.event_cursor
  )
    from public.prd_sessions s
   where s.chat_id = p_chat;
$$;

create function public.prd_session_turn(p_turn uuid)
returns public.prd_turns
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_record_state text;
  v_turn public.prd_turns%rowtype;
begin
  select project_id into v_project from public.prd_turns where id = p_turn;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  select state into v_record_state
    from public.prd_records
   where project_id = v_project
     for update;
  perform public.prd_refuse_unready(v_record_state);
  select * into v_turn from public.prd_turns where id = p_turn for update;
  if v_turn.state not in ('admitted', 'uncertain') then
    raise exception 'that turn already finished' using errcode = '22023', detail = 'stale';
  end if;
  return v_turn;
end;
$$;

create function public.prd_session_read(p_project uuid, p_chat_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_chat uuid;
  v_turn public.prd_turns%rowtype;
  v_parts jsonb;
begin
  v_chat := public.prd_chat_for_key(p_project, p_chat_key);
  if v_chat is null then
    raise exception 'that chat is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_turn
    from public.prd_turns
   where chat_id = v_chat
     and state in ('admitted', 'uncertain');
  if v_turn.id is not null and v_turn.message_id is not null then
    select parts into v_parts from public.prd_messages where id = v_turn.message_id;
  end if;
  return jsonb_build_object(
    'chatId', v_chat,
    'chatKey', p_chat_key,
    'session', public.prd_session_row(v_chat),
    'turn', case when v_turn.id is null then null else jsonb_build_object(
      'id', v_turn.id,
      'kind', v_turn.kind,
      'state', v_turn.state,
      'dispatched', v_turn.dispatched_at is not null,
      'ageSeconds', extract(epoch from clock_timestamp() - v_turn.created_at),
      'parts', coalesce(v_parts, '[]'::jsonb),
      'modelRequests', (
        select count(*) from public.prd_provider_events e where e.turn_id = v_turn.id
      )
    ) end
  );
end;
$$;

create function public.prd_turn_dispatch(p_turn uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_turn public.prd_turns%rowtype;
begin
  v_turn := public.prd_session_turn(p_turn);
  if v_turn.state <> 'admitted' or v_turn.dispatched_at is not null then
    return false;
  end if;
  update public.prd_turns
     set dispatched_at = clock_timestamp(),
         updated_at = clock_timestamp()
   where id = p_turn;
  return true;
end;
$$;

create function public.prd_session_open(p_turn uuid, p_session text, p_vault text, p_credential text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_turn public.prd_turns%rowtype;
  v_bound public.prd_sessions%rowtype;
begin
  if btrim(coalesce(p_session, '')) = ''
     or btrim(coalesce(p_vault, '')) = ''
     or btrim(coalesce(p_credential, '')) = '' then
    raise exception 'a session names its id, its vault and its credential'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  v_turn := public.prd_session_turn(p_turn);
  insert into public.prd_sessions (
    chat_id, project_id, provider_session_id, vault_id, credential_id, credential_generation
  ) values (
    v_turn.chat_id, v_turn.project_id, btrim(p_session), btrim(p_vault), btrim(p_credential), 1
  )
  on conflict do nothing;
  select * into v_bound from public.prd_sessions where chat_id = v_turn.chat_id for update;
  if v_bound.provider_session_id is distinct from btrim(p_session)
     or v_bound.vault_id is distinct from btrim(p_vault)
     or v_bound.credential_id is distinct from btrim(p_credential) then
    raise exception 'that chat already has another session' using errcode = '22023', detail = 'invalid-request';
  end if;
  return public.prd_session_row(v_turn.chat_id);
end;
$$;

create function public.prd_session_rotate(p_turn uuid, p_generation integer)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_turn public.prd_turns%rowtype;
  v_generation integer;
begin
  v_turn := public.prd_session_turn(p_turn);
  update public.prd_sessions
     set credential_generation = credential_generation + 1,
         updated_at = clock_timestamp()
   where chat_id = v_turn.chat_id
     and credential_generation = p_generation
  returning credential_generation into v_generation;
  if v_generation is null then
    raise exception 'the session credential moved since it was read'
      using errcode = '22023', detail = 'stale';
  end if;
  return v_generation;
end;
$$;

create function public.prd_session_advance(p_turn uuid, p_from text, p_to text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_turn public.prd_turns%rowtype;
begin
  if btrim(coalesce(p_to, '')) = '' then
    raise exception 'a cursor names an event' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_turn := public.prd_session_turn(p_turn);
  update public.prd_sessions
     set event_cursor = btrim(p_to),
         updated_at = clock_timestamp()
   where chat_id = v_turn.chat_id
     and event_cursor is not distinct from p_from;
  return found;
end;
$$;

create function public.prd_turns_overdue(p_project uuid, p_seconds integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      case c.kind
        when 'main' then 'main'
        when 'section' then 'topic:' || s.stable_key
        else 'side:' || c.question_id::text
      end
      order by t.created_at
    ),
    '[]'::jsonb
  )
    from public.prd_turns t
    join public.prd_chats c on c.id = t.chat_id
    left join public.prd_sections s on s.id = c.section_id
   where t.project_id = p_project
     and (
       t.state = 'uncertain'
       or (
         t.state = 'admitted'
         and t.created_at < clock_timestamp() - make_interval(secs => greatest(coalesce(p_seconds, 0), 0))
       )
     );
$$;

revoke execute on function public.prd_session_row(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_session_turn(uuid)
  from public, anon, authenticated, service_role;

revoke execute on function public.prd_session_read(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_session_read(uuid, text) to service_role;
revoke execute on function public.prd_turn_dispatch(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_turn_dispatch(uuid) to service_role;
revoke execute on function public.prd_session_open(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_session_open(uuid, text, text, text) to service_role;
revoke execute on function public.prd_session_rotate(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_session_rotate(uuid, integer) to service_role;
revoke execute on function public.prd_session_advance(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_session_advance(uuid, text, text) to service_role;
revoke execute on function public.prd_turns_overdue(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_turns_overdue(uuid, integer) to service_role;

notify pgrst, 'reload schema';
