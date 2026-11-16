alter table public.prd_sections
  add column gap_text text;

alter table public.prd_sections
  add constraint prd_sections_gap_text_check
  check (gap_text is null or length(btrim(gap_text)) > 0);

alter table public.prd_turns drop constraint prd_turns_kind_check;
alter table public.prd_turns add constraint prd_turns_kind_check
  check (kind in ('reply', 'answer-write', 'check'));

alter table public.prd_turns drop constraint prd_turns_message_shape;
alter table public.prd_turns add constraint prd_turns_message_shape check (
  (kind = 'reply' and message_id is not null)
  or (kind in ('answer-write', 'check') and message_id is null)
);

create table public.prd_check_config (
  key text primary key check (length(btrim(key)) > 0),
  threshold integer not null check (threshold between 0 and 100),
  placeholder boolean not null,
  threshold_text text not null check (length(btrim(threshold_text)) > 0),
  note text not null check (length(btrim(note)) > 0)
);

create table public.prd_checks (
  id uuid primary key,
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  revision bigint not null check (revision >= 1),
  score integer not null check (score between 0 and 100),
  threshold integer not null check (threshold between 0 and 100),
  passed boolean not null,
  coverage_text text not null,
  threshold_text text not null check (length(btrim(threshold_text)) > 0),
  turn_id uuid not null references public.prd_turns (id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  constraint prd_checks_project_revision unique (project_id, revision)
);

create table public.prd_check_gaps (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.prd_checks (id) on delete cascade,
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  section_key text not null check (length(btrim(section_key)) > 0),
  text text not null check (length(btrim(text)) > 0),
  fixed boolean not null default false,
  created_at timestamptz not null default clock_timestamp()
);

revoke all on table public.prd_check_config from public, anon, authenticated, service_role;
revoke all on table public.prd_checks from public, anon, authenticated, service_role;
revoke all on table public.prd_check_gaps from public, anon, authenticated, service_role;

alter table public.prd_check_config enable row level security;
alter table public.prd_checks enable row level security;
alter table public.prd_check_gaps enable row level security;

insert into public.prd_check_config (key, threshold, placeholder, threshold_text, note) values
  ('completion', 85, true, '85 (placeholder)',
    'Placeholder. The completion-check threshold of 85 is a pilot decision.');

create function public.prd_check_decision(p_actor uuid, p_project uuid, p_section_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_revision bigint;
  v_closed bigint;
  v_section public.prd_sections%rowtype;
  v_deps_ok boolean;
  v_current boolean;
  v_passed boolean;
  v_starts boolean;
begin
  perform public.assert_account_active(p_actor);
  select current_revision, closed_revision into v_revision, v_closed
    from public.prd_records
   where project_id = p_project;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_section
    from public.prd_sections
   where project_id = p_project
     and stable_key = p_section_key;
  if not found then
    raise exception 'that section is not in this PRD' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_role := public.prd_role(p_project, p_actor);
  select not exists (
    select 1
      from public.prd_sections dep
     where dep.project_id = p_project
       and dep.stable_key = any (v_section.dependencies)
       and dep.state not in ('ready', 'confirmed')
  ) into v_deps_ok;
  v_current := exists (
    select 1
      from public.prd_checks
     where project_id = p_project
       and revision = v_revision
  );
  v_passed := exists (
    select 1
      from public.prd_checks
     where project_id = p_project
       and revision = v_revision
       and passed
  );
  v_starts := v_role = 'dev'
    and v_closed is null
    and v_section.gap_text is null
    and v_section.required
    and v_section.state in ('ready', 'needs-review')
    and coalesce(v_deps_ok, false)
    and not v_passed
    and not exists (
      select 1
        from public.prd_sections other
       where other.project_id = p_project
         and other.required
         and other.stable_key is distinct from v_section.stable_key
         and other.state is distinct from 'confirmed'
    );
  return jsonb_build_object(
    'starts', v_starts,
    'current', v_current,
    'passed', v_passed,
    'revision', v_revision
  );
end;
$$;

create function public.prd_confirm_topic(
  p_actor uuid,
  p_project uuid,
  p_target text,
  p_token_revision bigint,
  p_current_revision bigint,
  p_request text,
  p_model text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_section public.prd_sections%rowtype;
  v_version uuid;
  v_sequence bigint;
  v_decision jsonb;
  v_starts boolean;
  v_current boolean;
  v_chat uuid;
  v_seen bigint;
  v_turn uuid;
  v_prior text;
  v_prior_changed text;
begin
  if left(coalesce(p_target, ''), 6) is distinct from 'topic:' or length(p_target) <= 6 then
    raise exception 'this action could not be read' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_key := substring(p_target from 7);
  if p_token_revision is distinct from p_current_revision then
    raise exception 'the section changed since this was offered' using errcode = '22023', detail = 'stale';
  end if;
  select * into v_section
    from public.prd_sections
   where project_id = p_project
     and stable_key = v_key
     for update;
  if not found then
    raise exception 'that section is not in this PRD' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_section.gap_text is not null then
    raise exception 'Fix the completion check gap first.' using errcode = '22023', detail = 'gap';
  end if;
  if v_section.state not in ('ready', 'needs-review') then
    raise exception 'that section is not ready to confirm' using errcode = '22023', detail = 'not-ready';
  end if;
  if exists (
    select 1
      from public.prd_sections dep
     where dep.project_id = p_project
       and dep.stable_key = any (v_section.dependencies)
       and dep.state not in ('ready', 'confirmed')
  ) then
    raise exception 'a section it depends on is not ready' using errcode = '22023', detail = 'not-ready';
  end if;
  v_decision := public.prd_check_decision(p_actor, p_project, v_key);
  v_starts := coalesce((v_decision->>'starts')::boolean, false);
  v_current := coalesce((v_decision->>'current')::boolean, false);
  if v_starts then
    select id, conversation_revision into v_chat, v_seen
      from public.prd_chats
     where project_id = p_project
       and kind = 'main'
       for update;
    if v_chat is null then
      raise exception 'the main chat is not open' using errcode = '22023', detail = 'invalid-request';
    end if;
    if exists (
      select 1
        from public.prd_turns
       where chat_id = v_chat
         and state in ('admitted', 'uncertain')
    ) then
      raise exception 'Wait for the AI to finish.' using errcode = '22023', detail = 'busy';
    end if;
    if not coalesce((public.prd_funds(p_project)->>'replyFunded')::boolean, false) then
      raise exception 'Confirming this section runs the completion check, and there is not enough left for it. The kitchen adds funds to continue.'
        using errcode = '22023', detail = 'funds';
    end if;
  end if;
  select nullif(manifest->>v_key, '')::uuid into v_version
    from public.prd_revisions
   where project_id = p_project
     and revision = p_current_revision;
  if v_version is null then
    raise exception 'that section has no version' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_prior := v_section.state;
  v_prior_changed := v_section.changed_since_confirmed;
  update public.prd_sections
     set state = 'confirmed',
         confirmed_version = v_version,
         changed_since_confirmed = null
   where id = v_section.id;
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project
   returning snapshot_sequence into v_sequence;
  if v_starts and not v_current then
    v_turn := public.prd_turn_insert(
      p_project,
      v_chat,
      p_actor,
      p_request,
      p_target,
      p_current_revision,
      v_seen,
      v_sequence,
      'check',
      null
    );
    perform public.prd_hold(p_project, v_turn, p_model);
    return jsonb_build_object(
      'sequence', v_sequence,
      'state', 'confirmed',
      'check', jsonb_build_object(
        'turnId', v_turn,
        'sectionKey', v_key,
        'priorState', v_prior,
        'priorChanged', v_prior_changed
      )
    );
  end if;
  return jsonb_build_object('sequence', v_sequence, 'state', 'confirmed');
end;
$$;

create function public.prd_check_source(p_project uuid, p_turn uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_turn public.prd_turns%rowtype;
  v_revision bigint;
  v_discovery jsonb;
  v_threshold integer;
  v_threshold_text text;
  v_sections jsonb;
  v_check jsonb;
begin
  select * into v_turn
    from public.prd_turns
   where id = p_turn
     and project_id = p_project;
  if not found or v_turn.kind is distinct from 'check' then
    raise exception 'that turn is not a completion check' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.assert_account_active(v_turn.actor_id);
  select jsonb_build_object(
    'id', c.id,
    'revision', c.revision,
    'passed', c.passed,
    'score', c.score,
    'threshold', c.threshold,
    'thresholdText', c.threshold_text,
    'coverageText', c.coverage_text
  ) into v_check
    from public.prd_checks c
   where c.turn_id = p_turn
      or (c.project_id = p_project and c.revision = v_turn.base_revision)
   order by c.created_at
   limit 1;
  if v_turn.state is distinct from 'admitted' or v_check is not null then
    return jsonb_build_object('state', v_turn.state, 'recorded', v_check);
  end if;
  v_revision := v_turn.base_revision;
  select b.document into v_discovery
    from public.prd_records r
    join public.brief_revisions b
      on b.project_id = r.project_id
     and b.revision = r.discovery_revision
   where r.project_id = p_project;
  select threshold, threshold_text into v_threshold, v_threshold_text
    from public.prd_check_config
   where key = 'completion';
  if not found then
    raise exception 'the completion check threshold is missing' using errcode = '22023', detail = 'invalid-request';
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', s.stable_key,
      'title', s.title,
      'document', case
        when v.variant = 'readable' then v.document
        else jsonb_build_object('statements', '[]'::jsonb, 'decisions', '[]'::jsonb)
      end
    )
    order by s.ordinal
  ), '[]'::jsonb)
    into v_sections
    from public.prd_sections s
    join public.prd_revisions rev
      on rev.project_id = s.project_id
     and rev.revision = v_revision
    join public.prd_section_versions v
      on v.id = (rev.manifest->>s.stable_key)::uuid
   where s.project_id = p_project;
  return jsonb_build_object(
    'state', v_turn.state,
    'recorded', null,
    'chatId', v_turn.chat_id,
    'revision', v_revision,
    'threshold', v_threshold,
    'thresholdText', v_threshold_text,
    'discovery', coalesce(v_discovery, '{}'::jsonb),
    'sections', v_sections
  );
end;
$$;

create function public.prd_check_record(
  p_project uuid,
  p_turn uuid,
  p_check uuid,
  p_score integer,
  p_coverage text,
  p_gaps jsonb,
  p_parts jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_turn public.prd_turns%rowtype;
  v_existing uuid;
  v_threshold integer;
  v_threshold_text text;
  v_passed boolean;
  v_gap jsonb;
  v_key text;
  v_text text;
  v_dropped text[] := '{}';
  v_chat uuid;
  v_section uuid;
begin
  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'a completion check scores from 0 to 100' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_coverage is null or jsonb_typeof(p_gaps) is distinct from 'array' or jsonb_typeof(p_parts) is distinct from 'array' then
    raise exception 'a completion check names its coverage, gaps, and message' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_turn
    from public.prd_turns
   where id = p_turn
     and project_id = p_project
     for update;
  if not found or v_turn.kind is distinct from 'check' then
    raise exception 'that turn is not a completion check' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.assert_account_active(v_turn.actor_id);
  perform 1 from public.prd_records where project_id = p_project for update;
  select id into v_existing
    from public.prd_checks
   where turn_id = p_turn
      or (project_id = p_project and revision = v_turn.base_revision)
   limit 1;
  if found then
    return jsonb_build_object('id', v_existing, 'replayed', true);
  end if;
  if v_turn.state is distinct from 'admitted' then
    raise exception 'that turn already finished' using errcode = '22023', detail = 'stale';
  end if;
  select threshold, threshold_text into v_threshold, v_threshold_text
    from public.prd_check_config
   where key = 'completion';
  if not found then
    raise exception 'the completion check threshold is missing' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_passed := p_score >= v_threshold;
  insert into public.prd_checks (
    id, project_id, revision, score, threshold, passed, coverage_text, threshold_text, turn_id
  ) values (
    p_check, p_project, v_turn.base_revision, p_score, v_threshold, v_passed,
    p_coverage, v_threshold_text, p_turn
  );
  for v_gap in select value from jsonb_array_elements(p_gaps) as value
  loop
    if jsonb_typeof(v_gap) is distinct from 'object' then
      continue;
    end if;
    v_key := btrim(coalesce(v_gap->>'sectionKey', ''));
    v_text := btrim(coalesce(v_gap->>'text', ''));
    if v_key = '' or v_text = '' then
      continue;
    end if;
    if exists (
      select 1
        from public.prd_check_gaps
       where check_id = p_check
         and section_key = v_key
         and text = v_text
    ) then
      continue;
    end if;
    if not exists (
      select 1
        from public.prd_sections
       where project_id = p_project
         and stable_key = v_key
    ) then
      if not (v_key = any (v_dropped)) then
        v_dropped := v_dropped || v_key;
      end if;
      continue;
    end if;
    insert into public.prd_check_gaps (check_id, project_id, section_key, text, fixed)
    values (p_check, p_project, v_key, v_text, false);
  end loop;
  for v_section, v_key in
    select s.id, s.stable_key
      from public.prd_sections s
     where s.project_id = p_project
       and exists (
         select 1
           from public.prd_check_gaps g
          where g.check_id = p_check
            and g.section_key = s.stable_key
            and g.fixed = false
       )
     for update
  loop
    update public.prd_sections
       set state = 'needs-review',
           gap_text = (
             select string_agg(g.text, E'\n' order by g.created_at, g.text)
               from public.prd_check_gaps g
              where g.check_id = p_check
                and g.section_key = v_key
                and g.fixed = false
           ),
           changed_since_confirmed = null
     where id = v_section;
  end loop;
  select id into v_chat
    from public.prd_chats
   where project_id = p_project
     and kind = 'main';
  if v_chat is null then
    raise exception 'the main chat is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_insert_message(p_project, v_chat, 'ai', 'ai4good AI', null, p_parts, null);
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project;
  return jsonb_build_object(
    'id', p_check,
    'replayed', false,
    'passed', v_passed,
    'threshold', v_threshold,
    'thresholdText', v_threshold_text,
    'dropped', to_jsonb(v_dropped)
  );
exception
  when unique_violation then
    select id into v_existing
      from public.prd_checks
     where project_id = p_project
       and revision = v_turn.base_revision;
    if v_existing is null then
      raise;
    end if;
    return jsonb_build_object('id', v_existing, 'replayed', true);
end;
$$;

create function public.prd_check_revert(
  p_turn uuid,
  p_section_key text,
  p_prior_state text,
  p_prior_changed text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_actor uuid;
begin
  select project_id, actor_id into v_project, v_actor
    from public.prd_turns
   where id = p_turn
     for update;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.assert_account_active(v_actor);
  if p_prior_state not in ('ready', 'needs-review', 'confirmed') then
    raise exception 'a section returns to the state it had' using errcode = '22023', detail = 'invalid-request';
  end if;
  update public.prd_sections
     set state = p_prior_state,
         confirmed_version = case when p_prior_state = 'confirmed' then confirmed_version else null end,
         changed_since_confirmed = p_prior_changed
   where project_id = v_project
     and stable_key = p_section_key
     and state = 'confirmed';
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = v_project;
end;
$$;

create function public.prd_close_changed_gaps(p_project uuid, p_keys text[])
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_keys text[] := coalesce(p_keys, '{}'::text[]);
  v_key text;
  v_section public.prd_sections%rowtype;
  v_visible boolean := false;
begin
  if coalesce(cardinality(v_keys), 0) = 0 then
    return false;
  end if;
  foreach v_key in array v_keys
  loop
    select * into v_section
      from public.prd_sections
     where project_id = p_project
       and stable_key = v_key
       for update;
    if not found or v_section.gap_text is null then
      continue;
    end if;
    update public.prd_check_gaps g
       set fixed = true
      from public.prd_checks c
     where g.check_id = c.id
       and c.project_id = p_project
       and g.section_key = v_key
       and g.fixed = false;
    update public.prd_sections
       set gap_text = null,
           changed_since_confirmed = 'Gap closed',
           state = case
             when state in ('confirmed', 'ready') then state
             else 'needs-review'
           end
     where id = v_section.id;
    v_visible := true;
  end loop;
  return v_visible;
end;
$$;

create or replace function public.prd_action(
  p_actor uuid,
  p_project uuid,
  p_kind text,
  p_token text,
  p_request_id text,
  p_model text default 'claude-haiku-5-5'
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
  perform public.prd_refuse_unready(v_record.state);

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
    perform public.prd_funds_admit(p_project);
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
    perform public.prd_hold(p_project, v_turn, p_model);
    v_result := jsonb_build_object('turnId', v_turn, 'messageId', null, 'sequence', v_sequence);
  elsif p_kind = 'confirm-topic' then
    v_result := public.prd_confirm_topic(
      p_actor,
      p_project,
      v_target,
      v_token_revision,
      v_record.current_revision,
      v_request,
      p_model
    );
  elsif p_kind = 'reopen-topic' then
    v_result := public.prd_section_transition(
      p_project,
      p_kind,
      v_target,
      v_token_revision,
      v_record.current_revision
    );
  else
    raise exception 'that action is not available yet' using errcode = '22023', detail = 'not-yet';
  end if;

  insert into public.prd_actions (project_id, actor_id, request_id, kind, result)
  values (p_project, p_actor, v_request, p_kind, v_result);
  return v_result;
end;
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
  v_section jsonb;
  v_sections jsonb := '[]'::jsonb;
  v_revision bigint;
  v_closed bigint;
  v_state text;
  v_key text;
  v_gap text;
  v_deps_ok boolean;
  v_confirm_ok boolean;
  v_reopen_ok boolean;
  v_funds jsonb;
  v_funded boolean;
  v_access jsonb;
  v_question jsonb;
  v_questions jsonb := '[]'::jsonb;
  v_main_busy boolean;
  v_check_passed boolean;
  v_required boolean;
  v_starts boolean;
  v_check jsonb;
begin
  v_facts := public.prd_record_facts(p_actor, p_project);
  v_role := v_facts #>> '{viewer,role}';
  v_facts := v_facts || public.prd_question_facts(p_project, v_role);
  v_revision := (v_facts->>'revision')::bigint;
  v_closed := (v_facts->>'closedRevision')::bigint;
  v_funds := public.prd_funds(p_project);
  v_funded := coalesce((v_funds->>'replyFunded')::boolean, false);
  select exists (
    select 1
      from public.prd_turns t
      join public.prd_chats c on c.id = t.chat_id
     where t.project_id = p_project
       and c.kind = 'main'
       and t.state in ('admitted', 'uncertain')
  ) into v_main_busy;
  v_check_passed := exists (
    select 1
      from public.prd_checks
     where project_id = p_project
       and revision = v_revision
       and passed
  );
  for v_section in
    select value
      from jsonb_array_elements(coalesce(v_facts->'sections', '[]'::jsonb)) as value
  loop
    v_key := v_section->>'key';
    v_state := v_section->>'state';
    v_required := coalesce((v_section->>'required')::boolean, false);
    select gap_text into v_gap
      from public.prd_sections
     where project_id = p_project
       and stable_key = v_key;
    select not exists (
      select 1
        from public.prd_sections self
        join public.prd_sections dep
          on dep.project_id = self.project_id
         and dep.stable_key = any (self.dependencies)
       where self.project_id = p_project
         and self.stable_key = v_key
         and dep.state not in ('ready', 'confirmed')
    ) into v_deps_ok;
    v_starts := v_required
      and v_gap is null
      and v_state in ('ready', 'needs-review')
      and coalesce(v_deps_ok, false)
      and not v_check_passed
      and not exists (
        select 1
          from public.prd_sections other
         where other.project_id = p_project
           and other.required
           and other.stable_key is distinct from v_key
           and other.state is distinct from 'confirmed'
      );
    v_confirm_ok := v_role = 'dev'
      and v_closed is null
      and v_gap is null
      and v_state in ('ready', 'needs-review')
      and coalesce(v_deps_ok, false)
      and (not v_starts or (not v_main_busy and v_funded));
    v_reopen_ok := v_role = 'dev' and v_closed is null and v_state = 'confirmed';
    v_sections := v_sections || jsonb_build_array(
      v_section || jsonb_build_object(
        'gap', v_gap,
        'confirm', jsonb_build_object(
          'allowed', v_confirm_ok,
          'reason', case
            when v_role <> 'dev' then 'forbidden'
            when v_closed is not null then 'closed'
            when v_gap is not null then 'gap'
            when v_state not in ('ready', 'needs-review') or not coalesce(v_deps_ok, false) then 'not-ready'
            when v_starts and v_main_busy then 'busy'
            when v_starts and not v_funded then 'funds'
            else null
          end,
          'token', case
            when v_confirm_ok
            then 'confirm-topic|topic:' || v_key || '|' || v_revision::text || '|0'
            else null
          end
        ),
        'reopen', jsonb_build_object(
          'allowed', v_reopen_ok,
          'reason', case
            when v_role <> 'dev' then 'forbidden'
            when v_closed is not null then 'closed'
            when v_state is distinct from 'confirmed' then 'not-confirmed'
            else null
          end,
          'token', case
            when v_reopen_ok
            then 'reopen-topic|topic:' || v_key || '|' || v_revision::text || '|0'
            else null
          end
        )
      )
    );
  end loop;
  v_facts := jsonb_set(v_facts, '{sections}', v_sections);
  v_chats := '[]'::jsonb;
  for v_chat in
    select value
      from jsonb_array_elements(coalesce(v_facts->'chats', '[]'::jsonb)) as value
  loop
    v_access := public.prd_chat_availability(p_project, v_role, v_chat->>'key');
    if not v_funded and coalesce((v_access #>> '{send,allowed}')::boolean, false) then
      v_access := jsonb_set(
        v_access,
        '{send}',
        jsonb_build_object('allowed', false, 'block', 'funds', 'reason', 'funds')
      );
    end if;
    v_chats := v_chats || jsonb_build_array(v_chat || v_access);
  end loop;
  v_facts := jsonb_set(v_facts, '{chats}', v_chats);
  if not v_funded then
    for v_question in
      select value
        from jsonb_array_elements(coalesce(v_facts->'questions', '[]'::jsonb)) as value
    loop
      if coalesce((v_question #>> '{complete,allowed}')::boolean, false) then
        v_question := jsonb_set(
          v_question,
          '{complete}',
          jsonb_build_object('allowed', false, 'reason', 'funds', 'token', null)
        );
      end if;
      if coalesce((v_question #>> '{use,allowed}')::boolean, false) then
        v_question := jsonb_set(
          v_question,
          '{use}',
          jsonb_build_object('allowed', false, 'reason', 'funds')
        );
      end if;
      v_questions := v_questions || jsonb_build_array(v_question);
    end loop;
    v_facts := jsonb_set(v_facts, '{questions}', v_questions);
  end if;
  select jsonb_build_object(
    'id', c.id,
    'revision', c.revision,
    'passed', c.passed,
    'coverageText', c.coverage_text,
    'thresholdText', c.threshold_text,
    'gaps', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'topicId', g.section_key,
          'title', s.title,
          'text', g.text,
          'fixed', g.fixed
        )
        order by s.ordinal, g.text
      )
        from public.prd_check_gaps g
        join public.prd_sections s
          on s.project_id = c.project_id
         and s.stable_key = g.section_key
       where g.check_id = c.id
    ), '[]'::jsonb)
  ) into v_check
    from public.prd_checks c
   where c.project_id = p_project
     and c.revision = v_revision;
  return v_facts || jsonb_build_object('funds', v_funds, 'check', v_check);
end;
$$;

revoke execute on function public.prd_check_decision(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_check_decision(uuid, uuid, text) to service_role;
revoke execute on function public.prd_confirm_topic(uuid, uuid, text, bigint, bigint, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_check_source(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_check_source(uuid, uuid) to service_role;
revoke execute on function public.prd_check_record(uuid, uuid, uuid, integer, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_check_record(uuid, uuid, uuid, integer, text, jsonb, jsonb) to service_role;
revoke execute on function public.prd_check_revert(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_check_revert(uuid, text, text, text) to service_role;
revoke execute on function public.prd_close_changed_gaps(uuid, text[])
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_action(uuid, uuid, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_action(uuid, uuid, text, text, text, text) to service_role;
revoke execute on function public.prd_facts(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_facts(uuid, uuid) to service_role;
