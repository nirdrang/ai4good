create table public.prd_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  ordinal bigint generated always as identity,
  section_id uuid not null,
  audience text not null check (audience in ('dev', 'ngo')),
  status text not null,
  body text not null check (length(btrim(body)) > 0),
  why_now text not null check (length(btrim(why_now)) > 0),
  options text[] not null check (cardinality(options) >= 1),
  suggested_option text,
  blocking boolean,
  answer text,
  intro_message uuid not null references public.prd_messages (id),
  anchors text[] not null default '{}',
  row_revision bigint not null default 1 check (row_revision >= 1),
  unique (project_id, id),
  foreign key (project_id, section_id) references public.prd_sections (project_id, id) on delete cascade,
  constraint prd_questions_audience_shape check (
    (
      audience = 'dev'
      and status in ('asked', 'answered')
      and blocking is null
      and suggested_option is not null
      and suggested_option = any (options)
      and (status = 'answered') = (answer is not null)
    )
    or (
      audience = 'ngo'
      and status in ('suggested', 'posted', 'answering', 'complete', 'used')
      and blocking is not null
      and suggested_option is null
      and answer is null
    )
  )
);

create table public.prd_question_prerequisites (
  project_id uuid not null,
  question_id uuid not null,
  prerequisite_id uuid not null,
  primary key (project_id, question_id, prerequisite_id),
  check (question_id <> prerequisite_id),
  foreign key (project_id, question_id)
    references public.prd_questions (project_id, id) on delete cascade,
  foreign key (project_id, prerequisite_id)
    references public.prd_questions (project_id, id) on delete cascade
);

create table public.prd_followups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  question_id uuid not null,
  asking_message uuid not null references public.prd_messages (id),
  resolving_message uuid references public.prd_messages (id),
  foreign key (project_id, question_id)
    references public.prd_questions (project_id, id) on delete cascade
);

create unique index prd_followups_one_open_idx
  on public.prd_followups (question_id) where resolving_message is null;

create table public.prd_answers (
  project_id uuid not null,
  question_id uuid not null,
  version integer not null check (version >= 1),
  body text not null check (length(btrim(body)) > 0),
  message_id uuid not null references public.prd_messages (id),
  created_at timestamptz not null default clock_timestamp(),
  primary key (project_id, question_id, version),
  foreign key (project_id, question_id)
    references public.prd_questions (project_id, id) on delete cascade
);

create table public.prd_answer_uses (
  project_id uuid not null,
  question_id uuid not null,
  answer_version integer not null,
  note text not null default '',
  created_at timestamptz not null default clock_timestamp(),
  primary key (project_id, question_id, answer_version),
  foreign key (project_id, question_id, answer_version)
    references public.prd_answers (project_id, question_id, version) on delete cascade
);

revoke all on table public.prd_questions from public, anon, authenticated, service_role;
revoke all on table public.prd_question_prerequisites from public, anon, authenticated, service_role;
revoke all on table public.prd_followups from public, anon, authenticated, service_role;
revoke all on table public.prd_answers from public, anon, authenticated, service_role;
revoke all on table public.prd_answer_uses from public, anon, authenticated, service_role;

alter table public.prd_questions enable row level security;
alter table public.prd_question_prerequisites enable row level security;
alter table public.prd_followups enable row level security;
alter table public.prd_answers enable row level security;
alter table public.prd_answer_uses enable row level security;

create trigger prd_answers_immutable
  before update or delete on public.prd_answers
  for each row execute function public.prd_row_immutable();

create trigger prd_answer_uses_immutable
  before update or delete on public.prd_answer_uses
  for each row execute function public.prd_row_immutable();

create function public.prd_question_ready(p_question uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
      select 1
        from public.prd_question_prerequisites pr
        join public.prd_questions pq
          on pq.project_id = pr.project_id
         and pq.id = pr.prerequisite_id
       where pr.question_id = p_question
         and not (
           (pq.audience = 'dev' and pq.status = 'answered')
           or (pq.audience = 'ngo' and pq.status = 'used')
         )
    )
    and not exists (
      select 1
        from public.prd_questions q
        join public.prd_sections s on s.id = q.section_id
        join public.prd_sections d
          on d.project_id = s.project_id
         and d.stable_key = any (s.dependencies)
       where q.id = p_question
         and d.state not in ('confirmed', 'ready')
    );
$$;

create function public.prd_ready_questions(p_project uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select q.id
    from public.prd_questions q
   where q.project_id = p_project
     and public.prd_question_ready(q.id)
   order by q.ordinal;
$$;

create function public.prd_outcome_uuid(p_value jsonb, p_label text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_value) is distinct from 'string' then
    raise exception 'an outcome names %', p_label using errcode = '22023', detail = 'invalid-request';
  end if;
  return (p_value#>>'{}')::uuid;
exception
  when invalid_text_representation then
    raise exception 'an outcome names %', p_label using errcode = '22023', detail = 'invalid-request';
end;
$$;

create function public.prd_outcome_text(p_value jsonb, p_label text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_value) is distinct from 'string' or btrim(p_value#>>'{}') = '' then
    raise exception 'an outcome names %', p_label using errcode = '22023', detail = 'invalid-request';
  end if;
  return btrim(p_value#>>'{}');
end;
$$;

create function public.prd_outcome_texts(p_value jsonb, p_label text)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_texts text[] := '{}';
  v_elem jsonb;
begin
  if p_value is null then
    return v_texts;
  end if;
  if jsonb_typeof(p_value) is distinct from 'array' then
    raise exception 'an outcome lists %', p_label using errcode = '22023', detail = 'invalid-request';
  end if;
  for v_elem in select value from jsonb_array_elements(p_value) as value
  loop
    v_texts := v_texts || public.prd_outcome_text(v_elem, p_label);
  end loop;
  return v_texts;
end;
$$;

create function public.prd_question_insert(
  p_project uuid,
  p_audience text,
  p_question jsonb,
  p_message uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_section uuid;
  v_id uuid;
  v_elem jsonb;
begin
  if jsonb_typeof(p_question) is distinct from 'object' then
    raise exception 'an outcome question is a record' using errcode = '22023', detail = 'invalid-request';
  end if;
  select id into v_section
    from public.prd_sections
   where project_id = p_project
     and stable_key = public.prd_outcome_text(p_question->'section', 'a section');
  if v_section is null then
    raise exception 'that section is not in this PRD' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_audience = 'ngo' and jsonb_typeof(p_question->'blocking') is distinct from 'boolean' then
    raise exception 'a question for the NGO says whether it blocks' using errcode = '22023', detail = 'invalid-request';
  end if;

  begin
    insert into public.prd_questions (
      project_id, section_id, audience, status, body, why_now, options,
      suggested_option, blocking, intro_message, anchors
    ) values (
      p_project,
      v_section,
      p_audience,
      case p_audience when 'dev' then 'asked' else 'suggested' end,
      public.prd_outcome_text(p_question->'text', 'the question text'),
      public.prd_outcome_text(p_question->'why', 'why it is asked now'),
      public.prd_outcome_texts(p_question->'options', 'its options'),
      case p_audience
        when 'dev' then public.prd_outcome_text(p_question->'suggested', 'the suggested option')
        else null
      end,
      case p_audience when 'ngo' then (p_question->>'blocking')::boolean else null end,
      p_message,
      public.prd_outcome_texts(p_question->'anchors', 'its anchors')
    )
    returning id into v_id;
  exception
    when check_violation then
      raise exception 'an outcome question is not well formed' using errcode = '22023', detail = 'invalid-request';
  end;

  if p_question->'prerequisites' is not null then
    if jsonb_typeof(p_question->'prerequisites') is distinct from 'array' then
      raise exception 'an outcome lists its prerequisites' using errcode = '22023', detail = 'invalid-request';
    end if;
    for v_elem in select value from jsonb_array_elements(p_question->'prerequisites') as value
    loop
      begin
        insert into public.prd_question_prerequisites (project_id, question_id, prerequisite_id)
        values (p_project, v_id, public.prd_outcome_uuid(v_elem, 'a prerequisite'))
        on conflict do nothing;
      exception
        when foreign_key_violation then
          raise exception 'a prerequisite is not a question of this PRD'
            using errcode = '22023', detail = 'invalid-request';
      end;
    end loop;
  end if;
  return v_id;
end;
$$;

create function public.prd_question_outcome(p_project uuid, p_chat uuid, p_outcome jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_closed bigint;
  v_chat public.prd_chats%rowtype;
  v_kind text;
  v_message uuid;
  v_item jsonb;
  v_question public.prd_questions%rowtype;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_version integer;
  v_sequence bigint;
begin
  select closed_revision into v_closed
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_closed is not null then
    raise exception 'the PRD is closed' using errcode = '42501', detail = 'closed';
  end if;
  if jsonb_typeof(p_outcome) is distinct from 'object' then
    raise exception 'an outcome is a record' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_chat from public.prd_chats where project_id = p_project and id = p_chat;
  if not found then
    raise exception 'that chat is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_message := public.prd_outcome_uuid(p_outcome->'message', 'its message');
  if not exists (
    select 1 from public.prd_messages
     where id = v_message and project_id = p_project and chat_id = p_chat
  ) then
    raise exception 'an outcome names a message of its chat' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_kind := p_outcome->>'kind';

  if v_kind in ('ask', 'answered', 'suggest-ngo') and v_chat.kind not in ('main', 'section') then
    raise exception 'that outcome belongs in the main chat or a section chat'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_kind in ('follow-up-open', 'follow-up-resolved', 'final-answer') then
    if v_chat.kind <> 'side' then
      raise exception 'that outcome belongs in a side chat' using errcode = '22023', detail = 'invalid-request';
    end if;
    select * into v_question
      from public.prd_questions
     where project_id = p_project and id = v_chat.question_id and audience = 'ngo'
       for update;
    if not found then
      raise exception 'that side chat has no question' using errcode = '22023', detail = 'invalid-request';
    end if;
  end if;

  case v_kind
    when 'ask' then
      if jsonb_typeof(p_outcome->'questions') is distinct from 'array'
         or jsonb_array_length(p_outcome->'questions') = 0 then
        raise exception 'an ask lists its questions' using errcode = '22023', detail = 'invalid-request';
      end if;
      for v_item in select value from jsonb_array_elements(p_outcome->'questions') as value
      loop
        v_ids := v_ids || public.prd_question_insert(p_project, 'dev', v_item, v_message);
      end loop;
      foreach v_id in array v_ids
      loop
        if not public.prd_question_ready(v_id) then
          raise exception 'a question waits on an unsettled prerequisite or on another section'
            using errcode = '22023', detail = 'not-ready';
        end if;
      end loop;

    when 'suggest-ngo' then
      v_ids := array[public.prd_question_insert(p_project, 'ngo', p_outcome->'question', v_message)];

    when 'answered' then
      v_id := public.prd_outcome_uuid(p_outcome->'question', 'its question');
      select * into v_question
        from public.prd_questions
       where project_id = p_project and id = v_id and audience = 'dev'
         for update;
      if not found then
        raise exception 'that is not a question for the developer' using errcode = '22023', detail = 'invalid-request';
      end if;
      if v_question.status <> 'asked' then
        raise exception 'that question is already answered' using errcode = '22023', detail = 'stale';
      end if;
      update public.prd_questions
         set status = 'answered',
             answer = public.prd_outcome_text(p_outcome->'answer', 'the answer'),
             row_revision = row_revision + 1
       where id = v_id;
      v_ids := array[v_id];

    when 'follow-up-open' then
      if v_question.status not in ('posted', 'answering') then
        raise exception 'that question is not open for an answer' using errcode = '22023', detail = 'stale';
      end if;
      if exists (
        select 1 from public.prd_followups
         where question_id = v_question.id and resolving_message is null
      ) then
        raise exception 'a follow-up is already open' using errcode = '22023', detail = 'follow-up-open';
      end if;
      insert into public.prd_followups (project_id, question_id, asking_message)
      values (p_project, v_question.id, v_message);
      update public.prd_questions
         set status = 'answering', row_revision = row_revision + 1
       where id = v_question.id;
      v_ids := array[v_question.id];

    when 'follow-up-resolved' then
      if v_question.status not in ('posted', 'answering') then
        raise exception 'that question is not open for an answer' using errcode = '22023', detail = 'stale';
      end if;
      update public.prd_followups
         set resolving_message = v_message
       where question_id = v_question.id and resolving_message is null;
      if not found then
        raise exception 'no follow-up is open' using errcode = '22023', detail = 'invalid-request';
      end if;
      update public.prd_questions
         set status = 'answering', row_revision = row_revision + 1
       where id = v_question.id;
      v_ids := array[v_question.id];

    when 'final-answer' then
      if v_question.status not in ('posted', 'answering', 'complete') then
        raise exception 'that question is not open for an answer' using errcode = '22023', detail = 'stale';
      end if;
      if exists (
        select 1 from public.prd_followups
         where question_id = v_question.id and resolving_message is null
      ) then
        raise exception 'a follow-up is still open' using errcode = '22023', detail = 'follow-up-open';
      end if;
      select coalesce(max(version), 0) + 1 into v_version
        from public.prd_answers
       where project_id = p_project and question_id = v_question.id;
      insert into public.prd_answers (project_id, question_id, version, body, message_id)
      values (
        p_project,
        v_question.id,
        v_version,
        public.prd_outcome_text(p_outcome->'answer', 'the answer'),
        v_message
      );
      update public.prd_questions
         set status = 'complete', row_revision = row_revision + 1
       where id = v_question.id;
      v_ids := array[v_question.id];

    else
      raise exception 'an outcome names its kind' using errcode = '22023', detail = 'invalid-request';
  end case;

  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project
   returning snapshot_sequence into v_sequence;
  return jsonb_build_object('sequence', v_sequence, 'questions', to_jsonb(v_ids));
end;
$$;

create function public.prd_assert_developer(p_actor uuid, p_project uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_closed bigint;
begin
  perform public.assert_account_active(p_actor);
  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD' using errcode = '42501', detail = 'forbidden';
  end if;
  if v_role <> 'dev' then
    raise exception 'only the developer does this' using errcode = '42501', detail = 'forbidden';
  end if;
  select closed_revision into v_closed
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_closed is not null then
    raise exception 'the PRD is closed' using errcode = '42501', detail = 'closed';
  end if;
end;
$$;

create function public.prd_question_post(
  p_actor uuid,
  p_project uuid,
  p_question uuid,
  p_row_revision bigint
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_question public.prd_questions%rowtype;
begin
  perform public.prd_assert_developer(p_actor, p_project);
  select * into v_question
    from public.prd_questions
   where project_id = p_project and id = p_question and audience = 'ngo'
     for update;
  if not found then
    raise exception 'that is not a question for the NGO' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_question.status <> 'suggested' or v_question.row_revision is distinct from p_row_revision then
    raise exception 'the question changed since this was offered' using errcode = '22023', detail = 'stale';
  end if;
  if not public.prd_question_ready(p_question) then
    raise exception 'the question waits on an unsettled prerequisite or on another section'
      using errcode = '22023', detail = 'not-ready';
  end if;

  update public.prd_questions
     set status = 'posted', row_revision = row_revision + 1
   where id = p_question;
  insert into public.prd_chats (project_id, kind, question_id)
  select p_project, 'side', p_question
   where not exists (
     select 1 from public.prd_chats
      where project_id = p_project and kind = 'side' and question_id = p_question
   );
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project;
  return public.prd_facts(p_actor, p_project);
end;
$$;

create function public.prd_answer_use(
  p_actor uuid,
  p_project uuid,
  p_question uuid,
  p_answer_version integer,
  p_note text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_question public.prd_questions%rowtype;
  v_latest integer;
begin
  perform public.prd_assert_developer(p_actor, p_project);
  select * into v_question
    from public.prd_questions
   where project_id = p_project and id = p_question and audience = 'ngo'
     for update;
  if not found then
    raise exception 'that is not a question for the NGO' using errcode = '22023', detail = 'invalid-request';
  end if;
  select max(version) into v_latest
    from public.prd_answers
   where project_id = p_project and question_id = p_question;
  if v_question.status <> 'complete' or v_latest is distinct from p_answer_version then
    raise exception 'the answer changed since this was offered' using errcode = '22023', detail = 'stale';
  end if;

  insert into public.prd_answer_uses (project_id, question_id, answer_version, note)
  values (p_project, p_question, p_answer_version, coalesce(p_note, ''));
  update public.prd_questions
     set status = 'used', row_revision = row_revision + 1
   where id = p_question;
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project;
  return public.prd_facts(p_actor, p_project);
end;
$$;

create function public.prd_question_facts(p_project uuid, p_role text)
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
            'allowed', false,
            'reason', case
              when p_role <> 'ngo' then 'forbidden'
              when r.closed_revision is not null then 'closed'
              when facts.follow_up_open then 'follow-up-open'
              else 'not-yet'
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
            ) as follow_up_open
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
         and (p_role = 'dev' or q.status <> 'suggested')
    ), '[]'::jsonb)
  );
$$;

alter function public.prd_facts(uuid, uuid) rename to prd_record_facts;

create function public.prd_facts(p_actor uuid, p_project uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_facts jsonb;
begin
  v_facts := public.prd_record_facts(p_actor, p_project);
  return v_facts || public.prd_question_facts(p_project, v_facts#>>'{viewer,role}');
end;
$$;

revoke execute on function public.prd_question_ready(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prd_outcome_uuid(jsonb, text) from public, anon, authenticated, service_role;
revoke execute on function public.prd_outcome_text(jsonb, text) from public, anon, authenticated, service_role;
revoke execute on function public.prd_outcome_texts(jsonb, text) from public, anon, authenticated, service_role;
revoke execute on function public.prd_question_insert(uuid, text, jsonb, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_assert_developer(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prd_question_facts(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.prd_facts(uuid, uuid) from public, anon, authenticated, service_role;

revoke execute on function public.prd_ready_questions(uuid) from public, anon, authenticated, service_role;
grant execute on function public.prd_ready_questions(uuid) to service_role;

revoke execute on function public.prd_question_outcome(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_question_outcome(uuid, uuid, jsonb) to service_role;

revoke execute on function public.prd_question_post(uuid, uuid, uuid, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_question_post(uuid, uuid, uuid, bigint) to service_role;

revoke execute on function public.prd_answer_use(uuid, uuid, uuid, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_answer_use(uuid, uuid, uuid, integer, text) to service_role;

notify pgrst, 'reload schema';
