create table public.prd_turns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  chat_id uuid not null,
  actor_id uuid not null references public.accounts (id),
  request_id text not null check (length(btrim(request_id)) > 0),
  body_hash text not null check (length(btrim(body_hash)) > 0),
  base_revision bigint not null check (base_revision >= 1),
  conversation_revision bigint not null check (conversation_revision >= 0),
  admitted_sequence bigint not null check (admitted_sequence >= 1),
  kind text not null check (kind in ('reply', 'answer-write')),
  state text not null check (state in ('admitted', 'answered', 'rejected', 'uncertain')),
  message_id uuid references public.prd_messages (id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint prd_turns_request_id unique (project_id, request_id),
  foreign key (project_id, chat_id) references public.prd_chats (project_id, id) on delete cascade,
  constraint prd_turns_message_shape check (
    (kind = 'reply' and message_id is not null)
    or (kind = 'answer-write' and message_id is null)
  )
);

create unique index prd_turns_one_active_idx
  on public.prd_turns (chat_id)
  where state in ('admitted', 'uncertain');

create table public.prd_actions (
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  actor_id uuid not null references public.accounts (id),
  request_id text not null check (length(btrim(request_id)) > 0),
  kind text not null check (length(btrim(kind)) > 0),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (project_id, request_id)
);

revoke all on table public.prd_turns from public, anon, authenticated, service_role;
revoke all on table public.prd_actions from public, anon, authenticated, service_role;

alter table public.prd_turns enable row level security;
alter table public.prd_actions enable row level security;

create trigger prd_actions_immutable
  before update or delete on public.prd_actions
  for each row execute function public.prd_row_immutable();

create function public.prd_insert_message(
  p_project uuid,
  p_chat uuid,
  p_actor_kind text,
  p_actor_name text,
  p_actor_id uuid,
  p_parts jsonb,
  p_for_role text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ordinal bigint;
  v_message uuid;
begin
  select coalesce(max(ordinal), 0) + 1 into v_ordinal
    from public.prd_messages
   where chat_id = p_chat;
  insert into public.prd_messages (
    project_id, chat_id, ordinal, actor_kind, actor_name, actor_id, parts, for_role
  ) values (
    p_project,
    p_chat,
    v_ordinal,
    p_actor_kind,
    coalesce(p_actor_name, ''),
    p_actor_id,
    p_parts,
    p_for_role
  )
  returning id into v_message;
  update public.prd_chats
     set conversation_revision = conversation_revision + 1
   where id = p_chat;
  return v_message;
end;
$$;

create function public.prd_chat_for_key(p_project uuid, p_key text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_chat uuid;
  v_question uuid;
begin
  if p_key = 'main' then
    select id into v_chat
      from public.prd_chats
     where project_id = p_project and kind = 'main';
    return v_chat;
  end if;
  if left(coalesce(p_key, ''), 6) = 'topic:' then
    select c.id into v_chat
      from public.prd_chats c
      join public.prd_sections s on s.id = c.section_id
     where c.project_id = p_project
       and c.kind = 'section'
       and s.stable_key = substring(p_key from 7);
    return v_chat;
  end if;
  if left(coalesce(p_key, ''), 5) = 'side:' then
    begin
      v_question := substring(p_key from 6)::uuid;
    exception
      when invalid_text_representation then
        raise exception 'a side chat key names a question id'
          using errcode = '22023', detail = 'invalid-request';
    end;
    select id into v_chat
      from public.prd_chats
     where project_id = p_project
       and kind = 'side'
       and question_id = v_question;
    return v_chat;
  end if;
  raise exception 'a message names its chat' using errcode = '22023', detail = 'invalid-request';
end;
$$;

create function public.prd_send_gate(p_project uuid, p_role text, p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_chat uuid;
  v_question uuid;
  v_status text;
begin
  if p_key = 'main' or left(coalesce(p_key, ''), 6) = 'topic:' then
    if p_role is distinct from 'dev' then
      return jsonb_build_object('ok', false, 'detail', 'forbidden', 'reason', 'only-dev');
    end if;
    v_chat := public.prd_chat_for_key(p_project, p_key);
    if v_chat is null then
      return jsonb_build_object('ok', false, 'detail', 'invalid-request', 'reason', null);
    end if;
    return jsonb_build_object('ok', true, 'chatId', v_chat, 'questionId', null);
  end if;

  if left(coalesce(p_key, ''), 5) = 'side:' then
    if substring(p_key from 6) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return jsonb_build_object('ok', false, 'detail', 'invalid-request', 'reason', null);
    end if;
    v_question := substring(p_key from 6)::uuid;
    select status into v_status
      from public.prd_questions
     where project_id = p_project
       and id = v_question
       and audience = 'ngo';
    if not found then
      return jsonb_build_object('ok', false, 'detail', 'invalid-request', 'reason', null);
    end if;
    if p_role is distinct from 'ngo' then
      return jsonb_build_object('ok', false, 'detail', 'forbidden', 'reason', 'only-ngo');
    end if;
    if v_status not in ('posted', 'answering') then
      return jsonb_build_object('ok', false, 'detail', 'forbidden', 'reason', 'not-open');
    end if;
    select id into v_chat
      from public.prd_chats
     where project_id = p_project
       and kind = 'side'
       and question_id = v_question;
    if v_chat is null then
      return jsonb_build_object('ok', false, 'detail', 'invalid-request', 'reason', null);
    end if;
    return jsonb_build_object('ok', true, 'chatId', v_chat, 'questionId', v_question);
  end if;

  return jsonb_build_object('ok', false, 'detail', 'invalid-request', 'reason', null);
end;
$$;

create function public.prd_chat_availability(p_project uuid, p_role text, p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_closed bigint;
  v_gate jsonb;
  v_chat uuid;
begin
  select closed_revision into v_closed
    from public.prd_records
   where project_id = p_project;
  if v_closed is not null then
    return jsonb_build_object(
      'canWrite', false,
      'send', jsonb_build_object('allowed', false, 'block', 'closed', 'reason', 'closed')
    );
  end if;

  v_gate := public.prd_send_gate(p_project, p_role, p_key);
  if not coalesce((v_gate->>'ok')::boolean, false) then
    return jsonb_build_object(
      'canWrite', false,
      'send', jsonb_build_object(
        'allowed', false,
        'block', 'role',
        'reason', coalesce(v_gate->>'reason', 'only-dev')
      )
    );
  end if;

  v_chat := (v_gate->>'chatId')::uuid;
  if exists (
    select 1
      from public.prd_turns
     where chat_id = v_chat
       and state in ('admitted', 'uncertain')
  ) then
    return jsonb_build_object(
      'canWrite', true,
      'send', jsonb_build_object('allowed', false, 'block', 'busy', 'reason', 'busy')
    );
  end if;

  return jsonb_build_object(
    'canWrite', true,
    'send', jsonb_build_object('allowed', true, 'reason', null)
  );
end;
$$;

create function public.prd_question_target(p_target text)
returns uuid
language plpgsql
immutable
security definer
set search_path = ''
as $$
begin
  if left(coalesce(p_target, ''), 9) <> 'question:' then
    raise exception 'an action names its question' using errcode = '22023', detail = 'invalid-request';
  end if;
  return substring(p_target from 10)::uuid;
exception
  when invalid_text_representation then
    raise exception 'an action names its question' using errcode = '22023', detail = 'invalid-request';
end;
$$;

create function public.prd_turn_insert(
  p_project uuid,
  p_chat uuid,
  p_actor uuid,
  p_request text,
  p_hash text,
  p_base_revision bigint,
  p_conversation_revision bigint,
  p_sequence bigint,
  p_kind text,
  p_message uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.prd_turns (
    project_id, chat_id, actor_id, request_id, body_hash,
    base_revision, conversation_revision, admitted_sequence,
    kind, state, message_id
  ) values (
    p_project, p_chat, p_actor, p_request, p_hash,
    p_base_revision, p_conversation_revision, p_sequence,
    p_kind, 'admitted', p_message
  )
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    if exists (
      select 1
        from public.prd_turns
       where chat_id = p_chat
         and state in ('admitted', 'uncertain')
         and request_id is distinct from p_request
    ) then
      raise exception 'the AI is still answering in this chat'
        using errcode = '22023', detail = 'busy';
    end if;
    raise exception 'that request was already used'
      using errcode = '22023', detail = 'invalid-request';
end;
$$;

create function public.prd_turn_reserve(
  p_actor uuid,
  p_project uuid,
  p_chat_key text,
  p_request_id text,
  p_base_revision bigint,
  p_intent jsonb,
  p_body_hash text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request text;
  v_hash text;
  v_record public.prd_records%rowtype;
  v_existing public.prd_turns%rowtype;
  v_role text;
  v_gate jsonb;
  v_chat uuid;
  v_question uuid;
  v_kind text;
  v_parts jsonb;
  v_seen bigint;
  v_message uuid;
  v_sequence bigint;
  v_turn uuid;
  v_bumped boolean := false;
  v_qid uuid;
  v_version integer;
  v_body text;
  v_title text;
  v_note text;
  v_given text;
  v_rows jsonb;
  v_ngo_account uuid;
  v_ngo_first text;
  v_ngo_messages bigint;
  v_pick record;
  v_lines text := '';
begin
  perform public.assert_account_active(p_actor);
  if btrim(coalesce(p_request_id, '')) = '' or btrim(coalesce(p_body_hash, '')) = '' then
    raise exception 'a send names its request' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_request := btrim(p_request_id);
  v_hash := btrim(p_body_hash);

  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;

  select * into v_existing
    from public.prd_turns
   where project_id = p_project
     and request_id = v_request;
  if found then
    if v_existing.actor_id = p_actor and v_existing.body_hash = v_hash then
      return jsonb_build_object(
        'turnId', v_existing.id,
        'messageId', v_existing.message_id,
        'sequence', v_existing.admitted_sequence
      );
    end if;
    raise exception 'that request was already used' using errcode = '22023', detail = 'invalid-request';
  end if;
  if exists (
    select 1 from public.prd_actions
     where project_id = p_project and request_id = v_request
  ) then
    raise exception 'that request was already used' using errcode = '22023', detail = 'invalid-request';
  end if;

  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;

  v_gate := public.prd_send_gate(p_project, v_role, p_chat_key);
  if not coalesce((v_gate->>'ok')::boolean, false) then
    if v_gate->>'detail' = 'forbidden' then
      raise exception 'this account cannot send in this chat'
        using errcode = '42501', detail = 'forbidden';
    end if;
    raise exception 'this send is not valid'
      using errcode = '22023', detail = coalesce(v_gate->>'detail', 'invalid-request');
  end if;
  v_chat := (v_gate->>'chatId')::uuid;
  v_question := (v_gate->>'questionId')::uuid;

  if p_intent is null or jsonb_typeof(p_intent) is distinct from 'object' then
    raise exception 'a send names its intent' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_kind := p_intent->>'kind';
  if v_kind = 'use-answer' and p_chat_key is distinct from 'main' then
    raise exception 'an answer is used in the main chat' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_kind = 'answers' and left(coalesce(p_chat_key, ''), 6) is distinct from 'topic:' then
    raise exception 'answers belong in a section chat' using errcode = '22023', detail = 'invalid-request';
  end if;

  if v_record.closed_revision is not null then
    raise exception 'the PRD is closed' using errcode = '42501', detail = 'closed';
  end if;
  if v_kind in ('use-answer', 'close-check')
     and p_base_revision is distinct from v_record.current_revision then
    raise exception 'the PRD changed since this was sent' using errcode = '22023', detail = 'stale';
  end if;
  if exists (
    select 1
      from public.prd_turns
     where chat_id = v_chat
       and state in ('admitted', 'uncertain')
  ) then
    raise exception 'the AI is still answering in this chat' using errcode = '22023', detail = 'busy';
  end if;

  if v_kind = 'close-check' then
    raise exception 'that action is not available yet' using errcode = '22023', detail = 'not-yet';
  elsif v_kind = 'text' then
    if jsonb_typeof(p_intent->'text') is distinct from 'string' or btrim(p_intent->>'text') = '' then
      raise exception 'a send carries text' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_parts := jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_intent->>'text'));
  elsif v_kind = 'answers' then
    if jsonb_typeof(p_intent->'picks') is distinct from 'object' then
      raise exception 'answers name their picks' using errcode = '22023', detail = 'invalid-request';
    end if;
    if p_intent ? 'text' and jsonb_typeof(p_intent->'text') is distinct from 'string' then
      raise exception 'answers carry text' using errcode = '22023', detail = 'invalid-request';
    end if;
    for v_pick in
      select key, value
        from jsonb_each(p_intent->'picks')
       order by key
    loop
      if v_pick.key = ''
         or jsonb_typeof(v_pick.value) is distinct from 'string'
         or btrim(v_pick.value #>> '{}') = '' then
        raise exception 'answers name their picks' using errcode = '22023', detail = 'invalid-request';
      end if;
      if v_lines <> '' then
        v_lines := v_lines || E'\n';
      end if;
      v_lines := v_lines || v_pick.key || ': ' || btrim(v_pick.value #>> '{}');
    end loop;
    if btrim(coalesce(p_intent->>'text', '')) <> '' then
      if v_lines <> '' then
        v_lines := v_lines || E'\n';
      end if;
      v_lines := v_lines || btrim(p_intent->>'text');
    end if;
    if v_lines = '' then
      raise exception 'answers name their picks' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_parts := jsonb_build_array(jsonb_build_object('type', 'text', 'text', v_lines));
  elsif v_kind = 'use-answer' then
    if jsonb_typeof(p_intent->'questionId') is distinct from 'string' then
      raise exception 'an answer names its question' using errcode = '22023', detail = 'invalid-request';
    end if;
    if p_intent ? 'note' and jsonb_typeof(p_intent->'note') is distinct from 'string' then
      raise exception 'an answer names its note' using errcode = '22023', detail = 'invalid-request';
    end if;
    if p_intent ? 'answer' and jsonb_typeof(p_intent->'answer') not in ('string', 'null') then
      raise exception 'an answer names its wording' using errcode = '22023', detail = 'invalid-request';
    end if;
    begin
      v_qid := (p_intent->>'questionId')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'an answer names its question' using errcode = '22023', detail = 'invalid-request';
    end;
    select q.body, s.title
      into v_body, v_title
      from public.prd_questions q
      join public.prd_sections s on s.id = q.section_id
     where q.project_id = p_project
       and q.id = v_qid
       and q.audience = 'ngo';
    if not found then
      raise exception 'that is not a question for the NGO' using errcode = '22023', detail = 'invalid-request';
    end if;
    select max(version) into v_version
      from public.prd_answers
     where project_id = p_project and question_id = v_qid;
    select a.body into v_given
      from public.prd_answers a
     where a.project_id = p_project
       and a.question_id = v_qid
       and a.version = v_version;
    v_note := coalesce(p_intent->>'note', '');
    select m.account_id into v_ngo_account
      from public.projects p
      join public.org_memberships m on m.org_id = p.org_id
      join public.accounts a on a.id = m.account_id
     where p.id = p_project
       and a.account_type = 'ngo'
       and a.lifecycle = 'active'
     order by m.account_id
     limit 1;
    v_ngo_first := split_part(public.prd_person_name(v_ngo_account, 'NGO'), ' ', 1);
    select count(*) into v_ngo_messages
      from public.prd_messages m
      join public.prd_chats c on c.id = m.chat_id
     where c.project_id = p_project
       and c.kind = 'side'
       and c.question_id = v_qid
       and m.actor_kind = 'ngo';
    v_rows := jsonb_build_array(
      jsonb_build_object('label', 'Question', 'text', v_body),
      jsonb_build_object('label', v_ngo_first || '’s answer', 'text', v_given)
    );
    if p_intent ? 'answer'
       and jsonb_typeof(p_intent->'answer') = 'string'
       and btrim(p_intent->>'answer') <> ''
       and btrim(p_intent->>'answer') is distinct from v_given then
      v_rows := v_rows || jsonb_build_array(
        jsonb_build_object('label', 'I changed it to', 'text', btrim(p_intent->>'answer'))
      );
    end if;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'label', 'How the answer was reached',
      'text', 'Settled with the AI in ' || v_ngo_messages::text
        || case when v_ngo_messages = 1 then ' message' else ' messages' end
        || ', then marked complete.'
    ));
    if btrim(v_note) <> '' then
      v_rows := v_rows || jsonb_build_array(
        jsonb_build_object('label', 'My note', 'text', btrim(v_note))
      );
    end if;
    v_parts := jsonb_build_array(
      jsonb_build_object(
        'type', 'text',
        'text', 'I’m using ' || v_ngo_first || '’s answer for ' || v_title || '. Brief:'
      ),
      jsonb_build_object(
        'type', 'data-brief',
        'data', jsonb_build_object('questionId', v_qid, 'rows', v_rows)
      )
    );
    perform public.prd_answer_use(p_actor, p_project, v_qid, v_version, v_note);
    v_bumped := true;
  else
    raise exception 'a send names its intent' using errcode = '22023', detail = 'invalid-request';
  end if;

  select conversation_revision into v_seen
    from public.prd_chats
   where id = v_chat
     for update;
  v_message := public.prd_insert_message(
    p_project,
    v_chat,
    v_role,
    public.prd_person_name(p_actor, case when v_role = 'dev' then 'Developer' else 'NGO' end),
    p_actor,
    v_parts,
    null
  );
  if v_question is not null and v_role = 'ngo' then
    update public.prd_questions
       set status = 'answering',
           row_revision = row_revision + 1
     where project_id = p_project
       and id = v_question
       and audience = 'ngo'
       and status = 'posted';
  end if;
  if v_bumped then
    select snapshot_sequence into v_sequence
      from public.prd_records
     where project_id = p_project;
  else
    update public.prd_records
       set snapshot_sequence = snapshot_sequence + 1
     where project_id = p_project
     returning snapshot_sequence into v_sequence;
  end if;
  v_turn := public.prd_turn_insert(
    p_project,
    v_chat,
    p_actor,
    v_request,
    v_hash,
    v_record.current_revision,
    v_seen,
    v_sequence,
    'reply',
    v_message
  );
  return jsonb_build_object('turnId', v_turn, 'messageId', v_message, 'sequence', v_sequence);
end;
$$;

create function public.prd_turn_finish(p_turn uuid, p_state text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_state text;
  v_sequence bigint;
begin
  if p_state not in ('answered', 'rejected', 'uncertain') then
    raise exception 'a turn finishes as answered, rejected, or uncertain'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  select project_id into v_project
    from public.prd_turns
   where id = p_turn;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform 1
    from public.prd_records
   where project_id = v_project
     for update;
  select state into v_state
    from public.prd_turns
   where id = p_turn
     for update;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_state not in ('admitted', 'uncertain') then
    raise exception 'that turn already finished' using errcode = '22023', detail = 'stale';
  end if;
  update public.prd_turns
     set state = p_state,
         updated_at = clock_timestamp()
   where id = p_turn;
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = v_project
   returning snapshot_sequence into v_sequence;
  return jsonb_build_object('turnId', p_turn, 'state', p_state, 'sequence', v_sequence);
end;
$$;

create function public.prd_action(
  p_actor uuid,
  p_project uuid,
  p_kind text,
  p_token text,
  p_request_id text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request text;
  v_token_kind text;
  v_target text;
  v_token_revision bigint;
  v_token_version bigint;
  v_record public.prd_records%rowtype;
  v_role text;
  v_needed text;
  v_action public.prd_actions%rowtype;
  v_question_id uuid;
  v_question public.prd_questions%rowtype;
  v_chat uuid;
  v_seen bigint;
  v_sequence bigint;
  v_turn uuid;
  v_result jsonb;
begin
  perform public.assert_account_active(p_actor);
  if btrim(coalesce(p_request_id, '')) = '' then
    raise exception 'an action names its request' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_request := btrim(p_request_id);
  if p_token is null or p_token !~ '^[^|]+\|[^|]+\|[0-9]+\|[0-9]+$' then
    raise exception 'this action could not be read' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_token_kind := split_part(p_token, '|', 1);
  v_target := split_part(p_token, '|', 2);
  begin
    v_token_revision := split_part(p_token, '|', 3)::bigint;
    v_token_version := split_part(p_token, '|', 4)::bigint;
  exception
    when numeric_value_out_of_range then
      raise exception 'this action could not be read' using errcode = '22023', detail = 'invalid-request';
  end;
  if v_token_kind is distinct from p_kind
     or p_kind not in (
       'post-question', 'complete-answer', 'confirm-topic', 'reopen-topic',
       'close', 'close-anyway', 'keep-working'
     ) then
    raise exception 'this action could not be read' using errcode = '22023', detail = 'invalid-request';
  end if;

  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;

  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;
  v_needed := case when p_kind = 'complete-answer' then 'ngo' else 'dev' end;
  if v_role is distinct from v_needed then
    raise exception 'this account cannot take that action'
      using errcode = '42501', detail = 'forbidden';
  end if;
  if v_record.closed_revision is not null then
    raise exception 'the PRD is closed' using errcode = '42501', detail = 'closed';
  end if;

  select * into v_action
    from public.prd_actions
   where project_id = p_project
     and request_id = v_request;
  if found then
    if v_action.actor_id is distinct from p_actor or v_action.kind is distinct from p_kind then
      raise exception 'that request was already used' using errcode = '22023', detail = 'invalid-request';
    end if;
    return v_action.result;
  end if;
  if exists (
    select 1 from public.prd_turns
     where project_id = p_project and request_id = v_request
  ) then
    raise exception 'that request was already used' using errcode = '22023', detail = 'invalid-request';
  end if;

  if p_kind = 'post-question' then
    v_question_id := public.prd_question_target(v_target);
    if v_token_revision is distinct from v_record.current_revision then
      raise exception 'the question changed since this was offered'
        using errcode = '22023', detail = 'stale';
    end if;
    v_result := public.prd_question_post(p_actor, p_project, v_question_id, v_token_version);
  elsif p_kind = 'complete-answer' then
    v_question_id := public.prd_question_target(v_target);
    select * into v_question
      from public.prd_questions
     where project_id = p_project
       and id = v_question_id
       and audience = 'ngo'
       for update;
    if not found then
      raise exception 'that is not a question for the NGO' using errcode = '22023', detail = 'invalid-request';
    end if;
    if v_question.status is distinct from 'answering'
       or v_question.row_revision is distinct from v_token_version
       or v_token_revision is distinct from v_record.current_revision then
      raise exception 'the question changed since this was offered'
        using errcode = '22023', detail = 'stale';
    end if;
    if exists (
      select 1
        from public.prd_followups
       where question_id = v_question.id
         and resolving_message is null
    ) then
      raise exception 'a follow-up is still open' using errcode = '22023', detail = 'follow-up-open';
    end if;
    select id, conversation_revision into v_chat, v_seen
      from public.prd_chats
     where project_id = p_project
       and kind = 'side'
       and question_id = v_question.id
       for update;
    if v_chat is null or not exists (
      select 1
        from public.prd_messages
       where chat_id = v_chat
         and actor_kind = 'ngo'
    ) then
      raise exception 'write your answer first' using errcode = '22023', detail = 'invalid-request';
    end if;
    if exists (
      select 1
        from public.prd_turns
       where chat_id = v_chat
         and state in ('admitted', 'uncertain')
    ) then
      raise exception 'the AI is still answering in this chat' using errcode = '22023', detail = 'busy';
    end if;
    update public.prd_questions
       set row_revision = row_revision + 1
     where id = v_question.id;
    update public.prd_records
       set snapshot_sequence = snapshot_sequence + 1
     where project_id = p_project
     returning snapshot_sequence into v_sequence;
    v_turn := public.prd_turn_insert(
      p_project,
      v_chat,
      p_actor,
      v_request,
      p_token,
      v_record.current_revision,
      v_seen,
      v_sequence,
      'answer-write',
      null
    );
    v_result := jsonb_build_object('turnId', v_turn, 'messageId', null, 'sequence', v_sequence);
  else
    raise exception 'that action is not available yet' using errcode = '22023', detail = 'not-yet';
  end if;

  insert into public.prd_actions (project_id, actor_id, request_id, kind, result)
  values (p_project, p_actor, v_request, p_kind, v_result);
  return v_result;
end;
$$;

create or replace function public.prd_append_message(
  p_project uuid,
  p_chat_key text,
  p_actor_kind text,
  p_actor_name text,
  p_parts jsonb,
  p_for_role text default null,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_sequence bigint;
  v_chat_id uuid;
  v_question uuid;
  v_status text;
  v_message_id uuid;
begin
  perform public.assert_account_active(p_actor_id);
  select snapshot_sequence into v_sequence
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_actor_kind not in ('ai', 'dev', 'ngo', 'system') then
    raise exception 'a message names its actor' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_actor_kind <> 'system' and btrim(coalesce(p_actor_name, '')) = '' then
    raise exception 'a message names its actor' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_parts is null or jsonb_typeof(p_parts) is distinct from 'array' then
    raise exception 'a message carries its parts' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_for_role is not null and p_for_role not in ('dev', 'ngo') then
    raise exception 'a message names who it is for' using errcode = '22023', detail = 'invalid-request';
  end if;

  if left(coalesce(p_chat_key, ''), 5) = 'side:' then
    begin
      v_question := substring(p_chat_key from 6)::uuid;
    exception
      when invalid_text_representation then
        raise exception 'a side chat key names a question id'
          using errcode = '22023', detail = 'invalid-request';
    end;
    select status into v_status
      from public.prd_questions
     where project_id = p_project
       and id = v_question
       and audience = 'ngo';
    if not found or v_status not in ('posted', 'answering', 'complete', 'used') then
      raise exception 'that question has no side chat' using errcode = '22023', detail = 'invalid-request';
    end if;
  end if;

  v_chat_id := public.prd_chat_for_key(p_project, p_chat_key);
  if v_chat_id is null then
    raise exception 'that chat is not open' using errcode = '22023', detail = 'invalid-request';
  end if;

  v_message_id := public.prd_insert_message(
    p_project, v_chat_id, p_actor_kind, p_actor_name, p_actor_id, p_parts, p_for_role
  );
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project
   returning snapshot_sequence into v_sequence;
  return jsonb_build_object('id', v_message_id, 'sequence', v_sequence);
end;
$$;

create or replace function public.prd_question_facts(p_project uuid, p_role text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'devQuestions', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', q.id,
          'section', s.stable_key,
          'text', q.body,
          'why', q.why_now,
          'options', to_jsonb(q.options),
          'suggested', q.suggested_option,
          'answered', q.answer,
          'anchors', to_jsonb(q.anchors)
        ) order by q.ordinal)
        from public.prd_questions q
        join public.prd_sections s on s.id = q.section_id
       where q.project_id = p_project
         and q.audience = 'dev'
    ), '[]'::jsonb),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', q.id,
          'section', s.stable_key,
          'text', q.body,
          'why', q.why_now,
          'blocking', q.blocking,
          'options', to_jsonb(q.options),
          'anchors', to_jsonb(q.anchors),
          'status', q.status,
          'introMessage', q.intro_message,
          'followUpOpen', facts.follow_up_open,
          'answer', case q.status
            when 'complete' then latest.body
            when 'used' then used.body
            else null
          end,
          'answerVersion', latest.version,
          'post', jsonb_build_object(
            'allowed', p_role = 'dev' and r.closed_revision is null and facts.ready,
            'reason', case
              when p_role <> 'dev' then 'forbidden'
              when r.closed_revision is not null then 'closed'
              when not facts.ready then 'not-ready'
              else null
            end,
            'token', case
              when p_role = 'dev' and r.closed_revision is null and facts.ready
              then 'post-question|question:' || q.id::text || '|' || r.current_revision::text
                || '|' || q.row_revision::text
              else null
            end
          ),
          'complete', jsonb_build_object(
            'allowed', p_role = 'ngo'
              and r.closed_revision is null
              and q.status = 'answering'
              and not facts.follow_up_open
              and facts.ngo_wrote
              and not facts.side_busy,
            'reason', case
              when p_role <> 'ngo' then 'forbidden'
              when r.closed_revision is not null then 'closed'
              when q.status <> 'answering' then 'stale'
              when facts.follow_up_open then 'follow-up-open'
              when not facts.ngo_wrote then 'invalid-request'
              when facts.side_busy then 'busy'
              else null
            end,
            'token', case
              when p_role = 'ngo'
                and r.closed_revision is null
                and q.status = 'answering'
                and not facts.follow_up_open
                and facts.ngo_wrote
                and not facts.side_busy
              then 'complete-answer|question:' || q.id::text || '|' || r.current_revision::text
                || '|' || q.row_revision::text
              else null
            end
          ),
          'use', jsonb_build_object(
            'allowed', p_role = 'dev' and r.closed_revision is null,
            'reason', case
              when p_role <> 'dev' then 'forbidden'
              when r.closed_revision is not null then 'closed'
              else null
            end
          )
        ) order by q.ordinal)
        from public.prd_questions q
        join public.prd_sections s on s.id = q.section_id
        join public.prd_records r on r.project_id = q.project_id
        cross join lateral (
          select
            public.prd_question_ready(q.id) as ready,
            exists (
              select 1 from public.prd_followups f
               where f.question_id = q.id and f.resolving_message is null
            ) as follow_up_open,
            exists (
              select 1
                from public.prd_messages m
                join public.prd_chats c
                  on c.project_id = m.project_id
                 and c.id = m.chat_id
               where c.project_id = q.project_id
                 and c.kind = 'side'
                 and c.question_id = q.id
                 and m.actor_kind = 'ngo'
            ) as ngo_wrote,
            exists (
              select 1
                from public.prd_turns t
                join public.prd_chats c
                  on c.project_id = t.project_id
                 and c.id = t.chat_id
               where c.project_id = q.project_id
                 and c.kind = 'side'
                 and c.question_id = q.id
                 and t.state in ('admitted', 'uncertain')
            ) as side_busy
        ) facts
        left join lateral (
          select a.version, a.body
            from public.prd_answers a
           where a.project_id = q.project_id and a.question_id = q.id
           order by a.version desc
           limit 1
        ) latest on true
        left join lateral (
          select a.body
            from public.prd_answer_uses u
            join public.prd_answers a
              on a.project_id = u.project_id
             and a.question_id = u.question_id
             and a.version = u.answer_version
           where u.project_id = q.project_id and u.question_id = q.id
           order by u.answer_version desc
           limit 1
        ) used on true
       where q.project_id = p_project
         and q.audience = 'ngo'
    ), '[]'::jsonb)
  );
$$;

create or replace function public.prd_facts(p_actor uuid, p_project uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_facts jsonb;
  v_role text;
  v_chat jsonb;
  v_chats jsonb := '[]'::jsonb;
begin
  v_facts := public.prd_record_facts(p_actor, p_project);
  v_role := v_facts #>> '{viewer,role}';
  v_facts := v_facts || public.prd_question_facts(p_project, v_role);
  for v_chat in
    select value
      from jsonb_array_elements(coalesce(v_facts->'chats', '[]'::jsonb)) as value
  loop
    v_chats := v_chats || jsonb_build_array(
      v_chat || public.prd_chat_availability(p_project, v_role, v_chat->>'key')
    );
  end loop;
  return jsonb_set(v_facts, '{chats}', v_chats);
end;
$$;

revoke execute on function public.prd_insert_message(uuid, uuid, text, text, uuid, jsonb, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_chat_for_key(uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_send_gate(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_chat_availability(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_question_target(text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_turn_insert(uuid, uuid, uuid, text, text, bigint, bigint, bigint, text, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_question_facts(uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_facts(uuid, uuid)
  from public, anon, authenticated, service_role;

revoke execute on function public.prd_turn_reserve(uuid, uuid, text, text, bigint, jsonb, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_turn_reserve(uuid, uuid, text, text, bigint, jsonb, text)
  to service_role;

revoke execute on function public.prd_turn_finish(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_turn_finish(uuid, text) to service_role;

revoke execute on function public.prd_action(uuid, uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_action(uuid, uuid, text, text, text) to service_role;

revoke execute on function public.prd_append_message(uuid, text, text, text, jsonb, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_append_message(uuid, text, text, text, jsonb, text, uuid)
  to service_role;

notify pgrst, 'reload schema';
