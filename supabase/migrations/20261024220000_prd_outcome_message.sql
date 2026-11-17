create or replace function public.record_outcome(p_grant uuid, p_outcome jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grant public.prd_grants%rowtype;
  v_outcome jsonb := p_outcome;
  v_message uuid;
begin
  v_grant := public.prd_grant_check(p_grant, 'record_outcome');
  if jsonb_typeof(v_outcome) = 'object'
     and v_outcome->>'kind' = 'final-answer'
     and not exists (
       select 1 from public.prd_turns t where t.id = v_grant.turn_id and t.kind = 'answer-write'
     ) then
    raise exception 'the NGO has not marked the answer complete'
      using errcode = '22023', detail = 'not-complete';
  end if;
  if jsonb_typeof(v_outcome) = 'object' and not v_outcome ? 'message' then
    select m.id into v_message
      from public.prd_messages m
     where m.project_id = v_grant.project_id and m.chat_id = v_grant.chat_id
     order by m.ordinal desc
     limit 1;
    if v_message is not null then
      v_outcome := v_outcome || jsonb_build_object('message', v_message);
    end if;
  end if;
  begin
    perform public.prd_question_outcome_write(v_grant.project_id, v_grant.chat_id, v_outcome);
    raise exception 'staged' using errcode = 'P0004';
  exception
    when sqlstate 'P0004' then
      null;
  end;
  insert into public.prd_staged_effects (turn_id, project_id, kind, payload)
  values (v_grant.turn_id, v_grant.project_id, 'outcome', v_outcome)
  on conflict (turn_id) where kind = 'outcome'
  do update set payload = excluded.payload;
  return jsonb_build_object('staged', 'outcome');
end;
$$;

create function public.prd_followup_resolve_on_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.actor_kind = 'ngo' then
    update public.prd_followups f
       set resolving_message = new.id
      from public.prd_chats c
     where c.id = new.chat_id
       and c.kind = 'side'
       and f.question_id = c.question_id
       and f.resolving_message is null;
  end if;
  return new;
end;
$$;

revoke execute on function public.prd_followup_resolve_on_reply()
  from public, anon, authenticated, service_role;

create trigger prd_messages_resolve_followup
after insert on public.prd_messages
for each row execute function public.prd_followup_resolve_on_reply();

create or replace function public.prd_turn_open(p_project uuid, p_chat_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_chat uuid;
  v_turn public.prd_turns%rowtype;
  v_amount numeric;
  v_requests bigint;
  v_question jsonb;
  v_sections jsonb;
begin
  v_chat := public.prd_chat_for_key(p_project, p_chat_key);
  if v_chat is null then
    raise exception 'a message names its chat' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_turn
    from public.prd_turns
   where chat_id = v_chat
     and state in ('admitted', 'uncertain')
   order by created_at desc
   limit 1;
  if not found then
    return jsonb_build_object('chatId', v_chat, 'turn', null);
  end if;
  select amount into v_amount from public.prd_reservations where turn_id = v_turn.id;
  select count(*) into v_requests
    from public.prd_provider_events
   where turn_id = v_turn.id;
  select jsonb_build_object('text', q.body, 'why', q.why_now,'options', to_jsonb(q.options))
    into v_question
    from public.prd_chats c
    join public.prd_questions q on q.id = c.question_id
   where c.id = v_chat and c.kind = 'side';
  select coalesce(
      jsonb_agg(jsonb_build_object('key', s.stable_key, 'title', s.title) order by s.ordinal),
      '[]'::jsonb
    )
    into v_sections
    from public.prd_sections s
   where s.project_id = p_project;
  return jsonb_build_object(
    'chatId', v_chat,
    'turn', jsonb_build_object(
      'id', v_turn.id,
      'kind', v_turn.kind,
      'state', v_turn.state,
      'ageSeconds', extract(epoch from (clock_timestamp() - v_turn.created_at)),
      'parts', coalesce(
        (select parts from public.prd_messages where id = v_turn.message_id),
        '[]'::jsonb
      ),
      'modelRequests', v_requests,
      'reservationMicros', public.prd_micros(coalesce(v_amount, 0)),
      'spentMicros', public.prd_micros(public.prd_turn_spend(v_turn.id)),
      'messageId', v_turn.message_id,
      'question', v_question,
      'sections', v_sections
    )
  );
end;
$$;

revoke execute on function public.record_outcome(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.record_outcome(uuid, jsonb) to service_role;
revoke execute on function public.prd_turn_open(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_turn_open(uuid, text) to service_role;

notify pgrst, 'reload schema';
