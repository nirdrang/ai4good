create table public.prd_grants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  chat_id uuid not null,
  turn_id uuid not null references public.prd_turns (id) on delete cascade,
  mode text not null check (mode in ('reply', 'answer-write')),
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (project_id, chat_id) references public.prd_chats (project_id, id) on delete cascade
);

create table public.prd_tool_reads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  grant_id uuid not null references public.prd_grants (id) on delete cascade,
  turn_id uuid not null references public.prd_turns (id) on delete cascade,
  section_id uuid not null,
  version_id uuid not null references public.prd_section_versions (id),
  head_commit text not null check (head_commit ~ '^[0-9a-f]{40}$'),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (project_id, section_id) references public.prd_sections (project_id, id) on delete cascade
);

create table public.prd_staged_sections (
  turn_id uuid not null references public.prd_turns (id) on delete cascade,
  project_id uuid not null,
  section_id uuid not null,
  receipt_id uuid not null references public.prd_tool_reads (id) on delete cascade,
  document jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (turn_id, section_id),
  foreign key (project_id, section_id) references public.prd_sections (project_id, id) on delete cascade
);

create table public.prd_staged_effects (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references public.prd_turns (id) on delete cascade,
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  kind text not null check (kind in ('ready', 'suggest-ngo', 'outcome')),
  section_id uuid,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (project_id, section_id) references public.prd_sections (project_id, id) on delete cascade,
  constraint prd_staged_effects_shape check (
    (kind = 'ready' and section_id is not null)
    or (kind in ('suggest-ngo', 'outcome') and section_id is null)
  )
);

create unique index prd_staged_effects_one_ready_idx
  on public.prd_staged_effects (turn_id, section_id)
  where kind = 'ready';

create unique index prd_staged_effects_one_outcome_idx
  on public.prd_staged_effects (turn_id)
  where kind = 'outcome';

create table public.prd_tool_commits (
  turn_id uuid primary key references public.prd_turns (id) on delete cascade,
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  op_id uuid not null unique references public.prd_git_ops (id) on delete cascade,
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  created_at timestamptz not null default clock_timestamp()
);

alter table public.prd_git_ops
  add column turn_id uuid references public.prd_turns (id) on delete cascade,
  add column attempt integer,
  add column effects jsonb;

alter table public.prd_git_ops
  add constraint prd_git_ops_turn_shape check (
    (
      kind = 'turn'
      and turn_id is not null
      and attempt is not null
      and attempt >= 1
      and base_commit is not null
      and sections is not null
      and jsonb_typeof(sections) = 'array'
      and effects is not null
      and jsonb_typeof(effects) = 'array'
    )
    or (
      kind <> 'turn'
      and turn_id is null
      and attempt is null
    )
  );

create unique index prd_git_ops_turn_attempt_idx
  on public.prd_git_ops (turn_id, attempt)
  where turn_id is not null;

create unique index prd_git_ops_one_inflight_turn_idx
  on public.prd_git_ops (turn_id)
  where kind = 'turn' and status not in ('finalized', 'failed');

create unique index prd_git_ops_one_finalized_turn_idx
  on public.prd_git_ops (turn_id)
  where kind = 'turn' and status = 'finalized';

revoke all on table public.prd_grants from public, anon, authenticated, service_role;
revoke all on table public.prd_tool_reads from public, anon, authenticated, service_role;
revoke all on table public.prd_staged_sections from public, anon, authenticated, service_role;
revoke all on table public.prd_staged_effects from public, anon, authenticated, service_role;
revoke all on table public.prd_tool_commits from public, anon, authenticated, service_role;

alter table public.prd_grants enable row level security;
alter table public.prd_tool_reads enable row level security;
alter table public.prd_staged_sections enable row level security;
alter table public.prd_staged_effects enable row level security;
alter table public.prd_tool_commits enable row level security;

create function public.prd_mode_tools(p_mode text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_mode
    when 'reply' then array[
      'read_section',
      'stage_section',
      'propose_ready',
      'suggest_ngo_question',
      'commit_prepare'
    ]::text[]
    when 'answer-write' then array['record_outcome', 'commit_prepare']::text[]
    else '{}'::text[]
  end;
$$;

create function public.prd_readable_document(p_document jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text;
  v_statement jsonb;
  v_source jsonb;
begin
  if jsonb_typeof(p_document) is distinct from 'object' then
    return false;
  end if;
  for v_key in select jsonb_object_keys(p_document)
  loop
    if v_key not in ('statements', 'decisions', 'technicalScope') then
      return false;
    end if;
  end loop;
  if jsonb_typeof(p_document->'statements') is distinct from 'array'
     or jsonb_typeof(p_document->'decisions') is distinct from 'array' then
    return false;
  end if;
  if p_document ? 'technicalScope'
     and jsonb_typeof(p_document->'technicalScope') is distinct from 'object' then
    return false;
  end if;
  for v_statement in select value from jsonb_array_elements(p_document->'statements') as value
  loop
    if jsonb_typeof(v_statement) is distinct from 'object' then
      return false;
    end if;
    for v_key in select jsonb_object_keys(v_statement)
    loop
      if v_key not in ('text', 'sources') then
        return false;
      end if;
    end loop;
    if jsonb_typeof(v_statement->'text') is distinct from 'string'
       or btrim(v_statement->>'text') = ''
       or jsonb_typeof(v_statement->'sources') is distinct from 'array' then
      return false;
    end if;
    for v_source in select value from jsonb_array_elements(v_statement->'sources') as value
    loop
      if jsonb_typeof(v_source) is distinct from 'string' or btrim(v_source #>> '{}') = '' then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;

create function public.prd_grant_row(p_grant uuid)
returns public.prd_grants
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_grant public.prd_grants%rowtype;
  v_state text;
begin
  select project_id into v_project from public.prd_grants where id = p_grant;
  if not found then
    raise exception 'that grant does not exist' using errcode = '22023', detail = 'unknown-grant';
  end if;
  perform 1 from public.prd_records where project_id = v_project for update;
  select * into v_grant from public.prd_grants where id = p_grant for update;
  if not found then
    raise exception 'that grant does not exist' using errcode = '22023', detail = 'unknown-grant';
  end if;
  if v_grant.revoked then
    raise exception 'that grant was revoked' using errcode = '22023', detail = 'revoked';
  end if;
  if v_grant.expires_at <= clock_timestamp() then
    raise exception 'that grant has expired' using errcode = '22023', detail = 'expired';
  end if;
  select state into v_state
    from public.prd_turns
   where id = v_grant.turn_id
     for update;
  if v_state is null or v_state not in ('admitted', 'uncertain') then
    raise exception 'that turn has finished' using errcode = '22023', detail = 'turn-finished';
  end if;
  return v_grant;
end;
$$;

create function public.prd_grant_issue(p_turn uuid, p_mode text, p_ttl_seconds integer)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_turn public.prd_turns%rowtype;
  v_chat public.prd_chats%rowtype;
  v_id uuid;
begin
  if p_mode not in ('reply', 'answer-write') or p_ttl_seconds is null or p_ttl_seconds < 1 then
    raise exception 'a grant names its mode and lifetime' using errcode = '22023', detail = 'invalid-request';
  end if;
  select project_id into v_project from public.prd_turns where id = p_turn;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform 1 from public.prd_records where project_id = v_project for update;
  select * into v_turn from public.prd_turns where id = p_turn for update;
  if not found or v_turn.state not in ('admitted', 'uncertain') then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_chat from public.prd_chats where id = v_turn.chat_id for update;
  if p_mode = 'reply' then
    if v_turn.kind is distinct from 'reply' or v_chat.kind not in ('main', 'section') then
      raise exception 'that mode does not match the turn' using errcode = '22023', detail = 'invalid-request';
    end if;
  elsif v_turn.kind not in ('reply', 'answer-write') or v_chat.kind is distinct from 'side' then
    raise exception 'that mode does not match the turn' using errcode = '22023', detail = 'invalid-request';
  end if;
  update public.prd_grants
     set revoked = true
   where chat_id = v_turn.chat_id
     and revoked = false;
  insert into public.prd_grants (project_id, chat_id, turn_id, mode, expires_at)
  values (
    v_turn.project_id,
    v_turn.chat_id,
    v_turn.id,
    p_mode,
    clock_timestamp() + make_interval(secs => p_ttl_seconds)
  )
  returning id into v_id;
  return v_id;
end;
$$;

create function public.prd_grant_check(p_grant uuid, p_tool text)
returns public.prd_grants
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grant public.prd_grants%rowtype;
begin
  v_grant := public.prd_grant_row(p_grant);
  if p_tool is null or p_tool <> all (public.prd_mode_tools(v_grant.mode)) then
    raise exception 'that tool is not allowed' using errcode = '22023', detail = 'tool-denied';
  end if;
  return v_grant;
end;
$$;

create function public.prd_grant_tools(p_grant uuid)
returns text[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grant public.prd_grants%rowtype;
begin
  v_grant := public.prd_grant_row(p_grant);
  return public.prd_mode_tools(v_grant.mode);
end;
$$;

create function public.prd_section_read(p_project uuid, p_section uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_section public.prd_sections%rowtype;
  v_revision bigint;
  v_version public.prd_section_versions%rowtype;
begin
  select * into v_section
    from public.prd_sections
   where project_id = p_project
     and id = p_section;
  if not found then
    raise exception 'that section is not in this PRD' using errcode = '22023', detail = 'invalid-request';
  end if;
  select current_revision into v_revision
    from public.prd_records
   where project_id = p_project;
  select v.* into v_version
    from public.prd_revisions rev
    join public.prd_section_versions v
      on v.id = nullif(rev.manifest->>v_section.stable_key, '')::uuid
   where rev.project_id = p_project
     and rev.revision = v_revision;
  return jsonb_build_object(
    'key', v_section.stable_key,
    'state', v_section.state,
    'variant', v_version.variant,
    'document', case when v_version.variant = 'readable' then v_version.document else null end,
    'raw', case when v_version.variant = 'unreadable' then v_version.raw_text else null end,
    'parseError', case when v_version.variant = 'unreadable' then v_version.parse_error else null end
  );
end;
$$;

create function public.read_section(p_grant uuid, p_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grant public.prd_grants%rowtype;
  v_section_id uuid;
  v_head text;
  v_revision bigint;
  v_version uuid;
  v_receipt uuid;
begin
  v_grant := public.prd_grant_check(p_grant, 'read_section');
  if btrim(coalesce(p_key, '')) = '' then
    raise exception 'a section names its key' using errcode = '22023', detail = 'invalid-request';
  end if;
  select id into v_section_id
    from public.prd_sections
   where project_id = v_grant.project_id
     and stable_key = p_key;
  if not found then
    raise exception 'that section is not in this PRD' using errcode = '22023', detail = 'invalid-request';
  end if;
  select head_commit, current_revision into v_head, v_revision
    from public.prd_records
   where project_id = v_grant.project_id;
  if v_head is null then
    raise exception 'the PRD has no head' using errcode = '22023', detail = 'invalid-request';
  end if;
  select nullif(manifest->>p_key, '')::uuid into v_version
    from public.prd_revisions
   where project_id = v_grant.project_id
     and revision = v_revision;
  if v_version is null then
    raise exception 'that section has no version' using errcode = '22023', detail = 'invalid-request';
  end if;
  insert into public.prd_tool_reads (
    project_id, grant_id, turn_id, section_id, version_id, head_commit
  ) values (
    v_grant.project_id, v_grant.id, v_grant.turn_id, v_section_id, v_version, v_head
  )
  returning id into v_receipt;
  return public.prd_section_read(v_grant.project_id, v_section_id)
    || jsonb_build_object('receipt', v_receipt);
end;
$$;

create function public.stage_section(p_grant uuid, p_receipt uuid, p_document jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grant public.prd_grants%rowtype;
  v_receipt public.prd_tool_reads%rowtype;
  v_key text;
begin
  v_grant := public.prd_grant_check(p_grant, 'stage_section');
  select * into v_receipt from public.prd_tool_reads where id = p_receipt;
  if not found
     or v_receipt.grant_id is distinct from v_grant.id
     or v_receipt.project_id is distinct from v_grant.project_id then
    raise exception 'that receipt is not for this grant' using errcode = '22023', detail = 'wrong-receipt';
  end if;
  if not public.prd_readable_document(p_document) then
    raise exception 'that document is not a section' using errcode = '22023', detail = 'invalid-document';
  end if;
  insert into public.prd_staged_sections (turn_id, project_id, section_id, receipt_id, document)
  values (v_grant.turn_id, v_grant.project_id, v_receipt.section_id, v_receipt.id, p_document)
  on conflict (turn_id, section_id) do update
    set receipt_id = excluded.receipt_id,
        document = excluded.document,
        project_id = excluded.project_id;
  select stable_key into v_key from public.prd_sections where id = v_receipt.section_id;
  return jsonb_build_object('staged', v_key);
end;
$$;

create function public.propose_ready(p_grant uuid, p_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grant public.prd_grants%rowtype;
  v_section uuid;
begin
  v_grant := public.prd_grant_check(p_grant, 'propose_ready');
  if btrim(coalesce(p_key, '')) = '' then
    raise exception 'a section names its key' using errcode = '22023', detail = 'invalid-request';
  end if;
  select id into v_section
    from public.prd_sections
   where project_id = v_grant.project_id
     and stable_key = p_key;
  if not found then
    raise exception 'that section is not in this PRD' using errcode = '22023', detail = 'invalid-request';
  end if;
  insert into public.prd_staged_effects (turn_id, project_id, kind, section_id, payload)
  values (
    v_grant.turn_id,
    v_grant.project_id,
    'ready',
    v_section,
    jsonb_build_object('section', p_key)
  )
  on conflict (turn_id, section_id) where kind = 'ready'
  do update set payload = excluded.payload;
  return jsonb_build_object('staged', 'ready', 'key', p_key);
end;
$$;

create function public.suggest_ngo_question(p_grant uuid, p_question jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grant public.prd_grants%rowtype;
  v_message uuid;
begin
  v_grant := public.prd_grant_check(p_grant, 'suggest_ngo_question');
  select message_id into v_message from public.prd_turns where id = v_grant.turn_id;
  if v_message is null then
    raise exception 'a suggested question needs the turn message'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  begin
    perform public.prd_question_insert(v_grant.project_id, 'ngo', p_question, v_message);
    raise exception 'staged' using errcode = 'P0004';
  exception
    when sqlstate 'P0004' then
      null;
  end;
  insert into public.prd_staged_effects (turn_id, project_id, kind, payload)
  values (v_grant.turn_id, v_grant.project_id, 'suggest-ngo', p_question);
  return jsonb_build_object('staged', 'suggest-ngo');
end;
$$;

create function public.prd_question_outcome_write(p_project uuid, p_chat uuid, p_outcome jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_closed bigint;
  v_state text;
  v_chat public.prd_chats%rowtype;
  v_kind text;
  v_message uuid;
  v_item jsonb;
  v_question public.prd_questions%rowtype;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_version integer;
begin
  select closed_revision, state into v_closed, v_state
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_refuse_unready(v_state);
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

  return to_jsonb(v_ids);
end;
$$;

create or replace function public.prd_question_outcome(p_project uuid, p_chat uuid, p_outcome jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_questions jsonb;
  v_sequence bigint;
begin
  v_questions := public.prd_question_outcome_write(p_project, p_chat, p_outcome);
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project
   returning snapshot_sequence into v_sequence;
  return jsonb_build_object('sequence', v_sequence, 'questions', v_questions);
end;
$$;

create function public.record_outcome(p_grant uuid, p_outcome jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grant public.prd_grants%rowtype;
begin
  v_grant := public.prd_grant_check(p_grant, 'record_outcome');
  begin
    perform public.prd_question_outcome_write(v_grant.project_id, v_grant.chat_id, p_outcome);
    raise exception 'staged' using errcode = 'P0004';
  exception
    when sqlstate 'P0004' then
      null;
  end;
  insert into public.prd_staged_effects (turn_id, project_id, kind, payload)
  values (v_grant.turn_id, v_grant.project_id, 'outcome', p_outcome)
  on conflict (turn_id) where kind = 'outcome'
  do update set payload = excluded.payload;
  return jsonb_build_object('staged', 'outcome');
end;
$$;

create function public.commit_prepare(p_grant uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grant public.prd_grants%rowtype;
  v_existing public.prd_git_ops%rowtype;
  v_repo text;
  v_head text;
  v_sha text;
  v_hint text;
  v_revision bigint;
  v_manifest jsonb;
  v_row record;
  v_current uuid;
  v_stale jsonb := '[]'::jsonb;
  v_files jsonb := '[]'::jsonb;
  v_effects jsonb := '[]'::jsonb;
  v_attempt integer;
  v_op uuid;
begin
  v_grant := public.prd_grant_check(p_grant, 'commit_prepare');
  select repo_name into v_repo
    from public.prd_records
   where project_id = v_grant.project_id;
  if exists (
    select 1
      from public.prd_git_ops
     where turn_id = v_grant.turn_id
       and kind = 'turn'
       and status = 'finalized'
  ) or exists (
    select 1 from public.prd_tool_commits where turn_id = v_grant.turn_id
  ) then
    select commit_sha into v_sha
      from public.prd_git_ops
     where turn_id = v_grant.turn_id
       and kind = 'turn'
       and status = 'finalized'
     order by attempt desc
     limit 1;
    if v_sha is null then
      select commit_sha into v_sha
        from public.prd_tool_commits
       where turn_id = v_grant.turn_id
       limit 1;
    end if;
    raise exception 'this turn already committed'
      using errcode = '22023',
            detail = 'turn-committed',
            hint = jsonb_build_object(
              'turn', v_grant.turn_id,
              'repo', v_repo,
              'sha', v_sha,
              'status', 'finalized'
            )::text;
  end if;
  select * into v_existing
    from public.prd_git_ops
   where turn_id = v_grant.turn_id
     and kind = 'turn'
     and status not in ('finalized', 'failed')
     for update;
  if found then
    v_hint := jsonb_build_object(
      'op', v_existing.id,
      'status', v_existing.status,
      'base', v_existing.base_commit,
      'sha', v_existing.commit_sha,
      'turn', v_grant.turn_id,
      'repo', v_repo,
      'attempt', v_existing.attempt
    )::text;
    if v_existing.status = 'prepared' then
      raise exception 'a commit is already prepared'
        using errcode = '22023', detail = 'attempt-prepared', hint = v_hint;
    elsif v_existing.status = 'written' then
      raise exception 'a commit is already written'
        using errcode = '22023', detail = 'attempt-written', hint = v_hint;
    elsif v_existing.status = 'published' then
      raise exception 'a commit is already published'
        using errcode = '22023', detail = 'attempt-published', hint = v_hint;
    else
      raise exception 'a commit is already in progress'
        using errcode = '22023', detail = 'invalid-request', hint = v_hint;
    end if;
  end if;

  select head_commit, current_revision into v_head, v_revision
    from public.prd_records
   where project_id = v_grant.project_id;
  if v_head is null then
    raise exception 'the PRD has no head' using errcode = '22023', detail = 'invalid-request';
  end if;
  select manifest into v_manifest
    from public.prd_revisions
   where project_id = v_grant.project_id
     and revision = v_revision;

  for v_row in
    select st.section_id, st.document, r.version_id, s.stable_key, s.title, s.file_path
      from public.prd_staged_sections st
      join public.prd_sections s on s.id = st.section_id
      join public.prd_tool_reads r on r.id = st.receipt_id
     where st.turn_id = v_grant.turn_id
     order by s.ordinal
     for update of st
  loop
    v_current := nullif(v_manifest->>v_row.stable_key, '')::uuid;
    if v_current is distinct from v_row.version_id then
      v_stale := v_stale || jsonb_build_array(
        public.prd_section_read(v_grant.project_id, v_row.section_id)
      );
    else
      v_files := v_files || jsonb_build_array(jsonb_build_object(
        'key', v_row.stable_key,
        'path', v_row.file_path,
        'title', v_row.title,
        'document', v_row.document
      ));
    end if;
  end loop;
  if jsonb_array_length(v_stale) > 0 then
    return jsonb_build_object('ok', false, 'reason', 'stale', 'sections', v_stale);
  end if;

  perform 1 from public.prd_staged_effects where turn_id = v_grant.turn_id for update;
  select coalesce(jsonb_agg(jsonb_build_object(
      'kind', e.kind,
      'section', s.stable_key,
      'payload', e.payload
    ) order by e.created_at, e.id), '[]'::jsonb)
    into v_effects
    from public.prd_staged_effects e
    left join public.prd_sections s on s.id = e.section_id
   where e.turn_id = v_grant.turn_id;
  if jsonb_array_length(v_files) = 0 and jsonb_array_length(v_effects) = 0 then
    raise exception 'nothing is staged' using errcode = '22023', detail = 'nothing-staged';
  end if;

  select coalesce(max(attempt), 0) + 1 into v_attempt
    from public.prd_git_ops
   where turn_id = v_grant.turn_id
     and kind = 'turn';
  insert into public.prd_git_ops (
    project_id, kind, turn_id, attempt, base_commit, sections, effects, status
  ) values (
    v_grant.project_id,
    'turn',
    v_grant.turn_id,
    v_attempt,
    v_head,
    v_files,
    v_effects,
    'prepared'
  )
  returning id into v_op;
  return jsonb_build_object(
    'ok', true,
    'op', v_op,
    'attempt', v_attempt,
    'base', v_head,
    'turn', v_grant.turn_id,
    'repo', v_repo,
    'sections', v_files,
    'effects', v_effects
  );
end;
$$;

create function public.prd_git_op_fail(p_op uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_record public.prd_records%rowtype;
  v_op public.prd_git_ops%rowtype;
begin
  select project_id into v_project from public.prd_git_ops where id = p_op;
  if not found then
    raise exception 'the git operation does not exist' using errcode = 'P0002', detail = 'invalid-request';
  end if;
  select * into v_record
    from public.prd_records
   where project_id = v_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_op from public.prd_git_ops where id = p_op for update;
  if v_op.kind is distinct from 'turn' then
    raise exception 'only a turn attempt can be failed' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_op.status = 'failed' then
    return;
  end if;
  if v_op.status in ('published', 'finalized') then
    raise exception 'that commit can no longer be failed' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_op.status = 'prepared' then
    update public.prd_git_ops
       set status = 'failed',
           updated_at = clock_timestamp()
     where id = p_op;
    return;
  end if;
  if v_op.status is distinct from 'written' or v_op.commit_sha is null then
    raise exception 'that attempt cannot be failed' using errcode = '22023', detail = 'invalid-request';
  end if;
  if public.prd_commit_known(v_project, v_op.commit_sha, v_record.head_commit, '[]'::jsonb) then
    raise exception 'that commit is already in the read copy' using errcode = '22023', detail = 'invalid-request';
  end if;
  update public.prd_git_ops
     set status = 'failed',
         updated_at = clock_timestamp()
   where id = p_op;
end;
$$;

create function public.prd_section_transition(
  p_project uuid,
  p_kind text,
  p_target text,
  p_token_revision bigint,
  p_current_revision bigint
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
  v_state text;
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

  if p_kind = 'confirm-topic' then
    if v_section.state is distinct from 'ready' then
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
    select nullif(manifest->>v_key, '')::uuid into v_version
      from public.prd_revisions
     where project_id = p_project
       and revision = p_current_revision;
    if v_version is null then
      raise exception 'that section has no version' using errcode = '22023', detail = 'invalid-request';
    end if;
    update public.prd_sections
       set state = 'confirmed',
           confirmed_version = v_version,
           changed_since_confirmed = null
     where id = v_section.id;
    v_state := 'confirmed';
  elsif p_kind = 'reopen-topic' then
    if v_section.state is distinct from 'confirmed' then
      raise exception 'that section is not confirmed' using errcode = '22023', detail = 'not-confirmed';
    end if;
    update public.prd_sections
       set state = 'needs-review',
           changed_since_confirmed = 'the developer reopened it'
     where id = v_section.id;
    v_state := 'needs-review';
  else
    raise exception 'that action is not available yet' using errcode = '22023', detail = 'not-yet';
  end if;

  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project
   returning snapshot_sequence into v_sequence;
  return jsonb_build_object('sequence', v_sequence, 'state', v_state);
end;
$$;

create or replace function public.prd_action(
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
  elsif p_kind in ('confirm-topic', 'reopen-topic') then
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

create function public.prd_finish_turn_op(
  p_project uuid,
  p_op uuid,
  p_sha text,
  p_written uuid[]
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_op public.prd_git_ops%rowtype;
  v_id uuid;
  v_key text;
  v_ready boolean;
  v_effect jsonb;
  v_message uuid;
  v_chat uuid;
begin
  select * into v_op
    from public.prd_git_ops
   where id = p_op
     for update;
  if not found
     or v_op.project_id is distinct from p_project
     or v_op.kind is distinct from 'turn'
     or v_op.status not in ('written', 'published') then
    raise exception 'that turn commit is not ready to finish'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  select chat_id, message_id into v_chat, v_message
    from public.prd_turns
   where id = v_op.turn_id;

  foreach v_id in array coalesce(p_written, '{}'::uuid[])
  loop
    select stable_key into v_key from public.prd_sections where id = v_id;
    v_ready := exists (
      select 1
        from jsonb_array_elements(coalesce(v_op.effects, '[]'::jsonb)) as effect
       where effect->>'kind' = 'ready'
         and effect->>'section' = v_key
    );
    update public.prd_sections
       set state = case when v_ready then 'ready' else 'draft' end,
           changed_since_confirmed = null
     where id = v_id;
  end loop;

  for v_effect in
    select value
      from jsonb_array_elements(coalesce(v_op.effects, '[]'::jsonb)) as value
  loop
    if v_effect->>'kind' = 'ready' then
      update public.prd_sections
         set state = 'ready',
             changed_since_confirmed = null
       where project_id = p_project
         and stable_key = v_effect->>'section'
         and id <> all (coalesce(p_written, '{}'::uuid[]));
    elsif v_effect->>'kind' = 'suggest-ngo' and v_message is not null then
      begin
        perform public.prd_question_insert(p_project, 'ngo', v_effect->'payload', v_message);
      exception
        when sqlstate '22023' then
          null;
      end;
    elsif v_effect->>'kind' = 'outcome' then
      begin
        perform public.prd_question_outcome_write(p_project, v_chat, v_effect->'payload');
      exception
        when sqlstate '22023' or sqlstate '42501' then
          null;
      end;
    end if;
  end loop;

  update public.prd_git_ops
     set status = 'finalized',
         updated_at = clock_timestamp()
   where id = v_op.id;
  insert into public.prd_tool_commits (turn_id, project_id, op_id, commit_sha)
  values (v_op.turn_id, p_project, v_op.id, p_sha);
  return true;
end;
$$;

create function public.prd_invalidate_dependents(p_project uuid, p_changed_keys text[])
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_keys text[] := coalesce(p_changed_keys, '{}'::text[]);
  v_section public.prd_sections%rowtype;
  v_cause text;
  v_visible boolean := false;
  v_moved boolean;
begin
  if coalesce(cardinality(v_keys), 0) = 0 then
    return false;
  end if;
  loop
    v_moved := false;
    for v_section in
      select *
        from public.prd_sections
       where project_id = p_project
         and state = 'confirmed'
         and dependencies && v_keys
         and not (stable_key = any (v_keys))
       order by ordinal
    loop
      select listed.dep into v_cause
        from unnest(v_section.dependencies) with ordinality as listed(dep, ord)
       where listed.dep = any (v_keys)
       order by listed.ord
       limit 1;
      update public.prd_sections
         set state = 'needs-review',
             changed_since_confirmed = 'the section it depends on changed: ' || v_cause
       where id = v_section.id;
      v_keys := v_keys || v_section.stable_key;
      v_visible := true;
      v_moved := true;
    end loop;
    exit when not v_moved;
  end loop;
  return v_visible;
end;
$$;

create or replace function public.prd_commit_known(
  p_project uuid,
  p_sha text,
  p_head text,
  p_commits jsonb
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_cursor text;
  v_parent text;
  v_guard integer := 0;
begin
  if exists (
    select 1 from public.prd_revisions where project_id = p_project and commit_sha = p_sha
  ) or exists (
    select 1 from public.prd_section_versions where project_id = p_project and commit_sha = p_sha
  ) or exists (
    select 1 from public.prd_unknown_files where project_id = p_project and commit_sha = p_sha
  ) or exists (
    select 1
      from public.prd_git_ops
     where project_id = p_project
       and commit_sha = p_sha
       and status = 'finalized'
  ) or p_sha is not distinct from p_head then
    return true;
  end if;

  v_cursor := p_head;
  while v_cursor is not null and v_guard < 1000 loop
    v_guard := v_guard + 1;
    select lower(c->'parents'->>0) into v_parent
      from jsonb_array_elements(p_commits) c
     where lower(c->>'sha') = v_cursor
     limit 1;
    if v_parent is null or v_parent = v_cursor then
      return false;
    end if;
    if v_parent = p_sha then
      return true;
    end if;
    v_cursor := v_parent;
  end loop;
  return false;
end;
$$;

create or replace function public.prd_reconcile(p_project uuid, p_expected_head text, p_commits jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_record public.prd_records%rowtype;
  v_op public.prd_git_ops%rowtype;
  v_section public.prd_sections%rowtype;
  v_commit jsonb;
  v_change jsonb;
  v_added jsonb;
  v_applied integer := 0;
  v_visible boolean := false;
  v_state text;
  v_revision bigint;
  v_sequence bigint;
  v_tip text;
  v_sha text;
  v_login text;
  v_changes jsonb;
  v_manifest jsonb := '{}'::jsonb;
  v_document jsonb;
  v_seen text[] := '{}';
  v_used_removed text[] := '{}';
  v_used_added text[] := '{}';
  v_rename_section uuid[] := '{}';
  v_rename_dest text[] := '{}';
  v_dest text;
  v_path text;
  v_kind text;
  v_index integer;
  v_owned boolean;
  v_write boolean;
  v_variant text;
  v_blob text;
  v_raw text;
  v_error text;
  v_version_id uuid;
  v_old_blob text;
  v_note text;
  v_changed boolean;
  v_reason text;
  v_key text;
  v_turn boolean := false;
  v_turn_op public.prd_git_ops%rowtype;
  v_author text := 'repository';
  v_written uuid[] := '{}';
  v_changed_keys text[] := '{}';
begin
  if p_commits is null or jsonb_typeof(p_commits) is distinct from 'array' then
    raise exception 'a reconcile lists commits' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_expected_head is not null and lower(p_expected_head) !~ '^[0-9a-f]{40}$' then
    raise exception 'a reconcile names the expected head' using errcode = '22023', detail = 'invalid-request';
  end if;

  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_record.head_commit is distinct from lower(p_expected_head) then
    return jsonb_build_object('stale', true);
  end if;

  v_state := v_record.state;
  v_revision := v_record.current_revision;
  if v_revision >= 1 then
    select manifest into v_manifest
      from public.prd_revisions
     where project_id = p_project
       and revision = v_revision;
  end if;

  for v_commit in select value from jsonb_array_elements(p_commits) as value
  loop
    if jsonb_typeof(v_commit) is distinct from 'object' then
      raise exception 'a commit is a record' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_sha := lower(v_commit->>'sha');
    if v_sha is null or v_sha !~ '^[0-9a-f]{40}$' then
      raise exception 'a commit names its sha' using errcode = '22023', detail = 'invalid-request';
    end if;
    if jsonb_typeof(v_commit->'parents') is distinct from 'array' then
      raise exception 'a commit names its parents' using errcode = '22023', detail = 'invalid-request';
    end if;
    if v_commit ? 'login' and jsonb_typeof(v_commit->'login') not in ('string', 'null') then
      raise exception 'a commit names its author' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_tip := v_sha;
    if v_sha = any (v_seen) or public.prd_commit_known(p_project, v_sha, v_record.head_commit, p_commits) then
      continue;
    end if;
    v_seen := v_seen || v_sha;
    v_login := nullif(v_commit->>'login', '');
    v_changes := v_commit->'changes';

    select * into v_op
      from public.prd_git_ops
     where project_id = p_project
       and kind = 'open'
       and commit_sha = v_sha
       and status in ('written', 'published');
    if found then
      if v_state is distinct from 'pending' then
        raise exception 'the opening commit does not match the record'
          using errcode = '22023', detail = 'invalid-request';
      end if;
      if jsonb_typeof(v_changes) is distinct from 'array' then
        raise exception 'a commit lists its changes' using errcode = '22023', detail = 'invalid-request';
      end if;
      v_manifest := '{}'::jsonb;
      for v_section in
        select * from public.prd_sections where project_id = p_project order by ordinal
      loop
        select value into v_change
          from jsonb_array_elements(v_changes) as value
         where value->>'path' = v_section.file_path
           and value->>'change' in ('added', 'modified')
         limit 1;
        if v_change is null then
          raise exception 'the opening commit is missing a section file'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        v_blob := lower(v_change->>'blobSha');
        if v_blob is null or v_blob !~ '^[0-9a-f]{40}$' then
          raise exception 'the opening commit is missing a blob sha'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        select value->'document' into v_document
          from jsonb_array_elements(coalesce(v_op.sections, '[]'::jsonb)) as value
         where value->>'key' = v_section.stable_key
         limit 1;
        if v_document is null or jsonb_typeof(v_document) is distinct from 'object' then
          raise exception 'the opening operation is missing a section document'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        insert into public.prd_section_versions (
          project_id, section_id, commit_sha, blob_sha, author_kind, variant, document
        ) values (
          p_project, v_section.id, v_sha, v_blob, 'open', 'readable', v_document
        )
        returning id into v_version_id;
        v_manifest := v_manifest || jsonb_build_object(v_section.stable_key, v_version_id);
      end loop;
      insert into public.prd_revisions (
        project_id, revision, discovery_revision, manifest, commit_sha
      ) values (
        p_project, 1, v_record.discovery_revision, v_manifest, v_sha
      );
      update public.prd_git_ops
         set status = 'finalized',
             updated_at = clock_timestamp()
       where id = v_op.id;
      v_state := 'open';
      v_revision := 1;
      v_visible := true;
      v_applied := v_applied + 1;
      continue;
    end if;

    if v_state = 'pending' then
      v_applied := v_applied + 1;
      continue;
    end if;

    if jsonb_typeof(v_changes) is distinct from 'array' then
      raise exception 'a commit lists its changes' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_turn := false;
    v_author := 'repository';
    v_written := '{}';
    v_changed_keys := '{}';
    select * into v_turn_op
      from public.prd_git_ops
     where project_id = p_project
       and kind = 'turn'
       and commit_sha = v_sha
       and status in ('written', 'published');
    if found then
      v_turn := true;
      v_author := 'ai';
    end if;
    v_used_removed := '{}';
    v_used_added := '{}';
    v_rename_section := '{}';
    v_rename_dest := '{}';
    v_changed := false;
    for v_section in
      select s.*
        from public.prd_sections s
        join jsonb_array_elements(v_changes) c on c->>'path' = s.file_path and c->>'change' = 'removed'
       where s.project_id = p_project
       order by s.ordinal
    loop
      v_dest := null;
      for v_added in select value from jsonb_array_elements(v_changes) as value
      loop
        if v_added->>'change' is distinct from 'added' then
          continue;
        end if;
        if v_added->'file'->>'variant' is distinct from 'readable' then
          continue;
        end if;
        if v_added->'file'->>'key' is distinct from v_section.stable_key then
          continue;
        end if;
        if v_added->>'path' = any (v_used_added) then
          continue;
        end if;
        if exists (
          select 1 from public.prd_sections other
           where other.project_id = p_project
             and other.file_path = v_added->>'path'
             and other.id is distinct from v_section.id
        ) then
          continue;
        end if;
        v_dest := v_added->>'path';
        exit;
      end loop;
      if v_dest is not null then
        v_used_removed := v_used_removed || v_section.file_path;
        v_used_added := v_used_added || v_dest;
        v_rename_section := v_rename_section || v_section.id;
        v_rename_dest := v_rename_dest || v_dest;
      end if;
    end loop;

    for v_change in select value from jsonb_array_elements(v_changes) as value
    loop
      v_path := v_change->>'path';
      v_kind := v_change->>'change';
      if v_path is null or btrim(v_path) = '' or v_kind not in ('added', 'modified', 'removed') then
        raise exception 'a change names its path' using errcode = '22023', detail = 'invalid-request';
      end if;
      if v_path = any (v_used_removed) then
        continue;
      end if;
      v_write := false;
      v_index := array_position(v_used_added, v_path);
      if v_index is not null then
        select * into v_section from public.prd_sections where id = v_rename_section[v_index];
        update public.prd_sections set file_path = v_path where id = v_section.id;
        v_section.file_path := v_path;
        v_owned := true;
      else
        select * into v_section
          from public.prd_sections
         where project_id = p_project
           and file_path = v_path;
        v_owned := found;
      end if;

      if v_index is not null or (v_owned and v_kind in ('added', 'modified') and v_change->'file'->>'variant' = 'readable' and v_change->'file'->>'key' = v_section.stable_key) then
        if jsonb_typeof(v_change->'file') is distinct from 'object' then
          raise exception 'a change carries its file' using errcode = '22023', detail = 'invalid-request';
        end if;
        v_blob := lower(v_change->>'blobSha');
        v_document := v_change->'file'->'document';
        if v_blob is null or v_blob !~ '^[0-9a-f]{40}$' or jsonb_typeof(v_document) is distinct from 'object' then
          raise exception 'a readable file names its blob and document'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        v_variant := 'readable';
        v_raw := null;
        v_error := null;
        v_write := true;
      elsif v_kind = 'removed' then
        if not v_owned then
          continue;
        end if;
        v_variant := 'missing';
        v_blob := null;
        v_document := null;
        v_raw := null;
        v_error := null;
        v_write := true;
      elsif v_kind in ('added', 'modified') and v_change->'file'->>'variant' = 'unreadable' then
        if jsonb_typeof(v_change->'file') is distinct from 'object' then
          raise exception 'a change carries its file' using errcode = '22023', detail = 'invalid-request';
        end if;
        v_blob := lower(v_change->>'blobSha');
        v_raw := v_change->'file'->>'raw';
        v_error := v_change->'file'->>'error';
        if v_blob is null or v_blob !~ '^[0-9a-f]{40}$' or v_raw is null or v_error is null or btrim(v_error) = '' then
          raise exception 'an unreadable file names its blob, text, and error'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        if not v_owned then
          insert into public.prd_unknown_files (project_id, commit_sha, file_path, blob_sha, reason)
          values (p_project, v_sha, v_path, v_blob, 'the file could not be read');
          continue;
        end if;
        v_variant := 'unreadable';
        v_document := null;
        v_write := true;
      elsif v_kind in ('added', 'modified') then
        if jsonb_typeof(v_change->'file') is distinct from 'object' then
          raise exception 'a change carries its file' using errcode = '22023', detail = 'invalid-request';
        end if;
        if v_change->'file'->>'variant' is distinct from 'readable' then
          raise exception 'a change names its variant' using errcode = '22023', detail = 'invalid-request';
        end if;
        v_key := v_change->'file'->>'key';
        v_blob := lower(v_change->>'blobSha');
        if v_key is null or btrim(v_key) = '' or v_blob is null or v_blob !~ '^[0-9a-f]{40}$' then
          raise exception 'a readable file names its key and blob'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        if exists (
          select 1 from public.prd_sections
           where project_id = p_project and stable_key = v_key
        ) then
          v_reason := 'the file key belongs to another section';
        else
          v_reason := 'the file key is not a section';
        end if;
        insert into public.prd_unknown_files (project_id, commit_sha, file_path, blob_sha, reason)
        values (p_project, v_sha, v_path, v_blob, v_reason);
        continue;
      else
        raise exception 'a change names its path' using errcode = '22023', detail = 'invalid-request';
      end if;

      if v_write then
        insert into public.prd_section_versions (
          project_id, section_id, commit_sha, blob_sha, author_kind, author_login,
          variant, document, raw_text, parse_error
        ) values (
          p_project, v_section.id, v_sha, v_blob, v_author,
          case when v_turn then null else v_login end,
          v_variant, v_document, v_raw, v_error
        )
        returning id into v_version_id;
        v_old_blob := null;
        if v_manifest ? v_section.stable_key then
          select blob_sha into v_old_blob
            from public.prd_section_versions
           where id = nullif(v_manifest->>v_section.stable_key, '')::uuid;
        end if;
        if v_variant is distinct from 'readable' or v_blob is distinct from v_old_blob then
          v_changed_keys := v_changed_keys || v_section.stable_key;
        end if;
        if v_turn and v_variant = 'readable' then
          v_written := v_written || v_section.id;
        elsif v_section.state = 'confirmed'
          and (v_variant is distinct from 'readable' or v_blob is distinct from v_old_blob) then
          v_note := case
            when v_variant = 'missing' then 'the file was removed from the repository'
            when v_variant = 'unreadable' then 'the file in the repository could not be read'
            else 'the file changed in the repository'
          end;
          update public.prd_sections
             set state = 'needs-review',
                 changed_since_confirmed = v_note
           where id = v_section.id;
          v_visible := true;
        end if;
        v_manifest := v_manifest || jsonb_build_object(v_section.stable_key, v_version_id);
        v_changed := true;
      end if;
    end loop;

    if v_changed then
      v_revision := v_revision + 1;
      insert into public.prd_revisions (
        project_id, revision, discovery_revision, manifest, commit_sha
      ) values (
        p_project, v_revision, v_record.discovery_revision, v_manifest, v_sha
      );
      v_visible := true;
    end if;
    if v_turn then
      v_visible := public.prd_finish_turn_op(p_project, v_turn_op.id, v_sha, v_written) or v_visible;
    end if;
    v_visible := public.prd_invalidate_dependents(p_project, v_changed_keys) or v_visible;
    v_applied := v_applied + 1;
  end loop;

  if v_applied = 0 then
    return jsonb_build_object(
      'stale', false,
      'applied', 0,
      'head', v_record.head_commit,
      'sequence', v_record.snapshot_sequence,
      'revision', v_record.current_revision
    );
  end if;

  update public.prd_records
     set head_commit = v_tip,
         synced_at = clock_timestamp(),
         state = v_state,
         current_revision = v_revision,
         snapshot_sequence = snapshot_sequence + case when v_visible then 1 else 0 end
   where project_id = p_project
   returning snapshot_sequence, current_revision into v_sequence, v_revision;
  return jsonb_build_object(
    'stale', false,
    'applied', v_applied,
    'head', v_tip,
    'sequence', v_sequence,
    'revision', v_revision
  );
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
  v_deps_ok boolean;
  v_confirm_ok boolean;
  v_reopen_ok boolean;
begin
  v_facts := public.prd_record_facts(p_actor, p_project);
  v_role := v_facts #>> '{viewer,role}';
  v_facts := v_facts || public.prd_question_facts(p_project, v_role);
  v_revision := (v_facts->>'revision')::bigint;
  v_closed := (v_facts->>'closedRevision')::bigint;
  for v_section in
    select value
      from jsonb_array_elements(coalesce(v_facts->'sections', '[]'::jsonb)) as value
  loop
    v_key := v_section->>'key';
    v_state := v_section->>'state';
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
    v_confirm_ok := v_role = 'dev' and v_closed is null and v_state = 'ready' and coalesce(v_deps_ok, false);
    v_reopen_ok := v_role = 'dev' and v_closed is null and v_state = 'confirmed';
    v_sections := v_sections || jsonb_build_array(
      v_section || jsonb_build_object(
        'confirm', jsonb_build_object(
          'allowed', v_confirm_ok,
          'reason', case
            when v_role <> 'dev' then 'forbidden'
            when v_closed is not null then 'closed'
            when v_state is distinct from 'ready' or not coalesce(v_deps_ok, false) then 'not-ready'
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

revoke execute on function public.prd_mode_tools(text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_readable_document(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_grant_row(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_section_read(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_question_outcome_write(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_section_transition(uuid, text, text, bigint, bigint)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_finish_turn_op(uuid, uuid, text, uuid[])
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_invalidate_dependents(uuid, text[])
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_commit_known(uuid, text, text, jsonb)
  from public, anon, authenticated, service_role;

revoke execute on function public.prd_grant_issue(uuid, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_grant_issue(uuid, text, integer) to service_role;
revoke execute on function public.prd_grant_check(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_grant_check(uuid, text) to service_role;
revoke execute on function public.prd_grant_tools(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_grant_tools(uuid) to service_role;

revoke execute on function public.read_section(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.read_section(uuid, text) to service_role;
revoke execute on function public.stage_section(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.stage_section(uuid, uuid, jsonb) to service_role;
revoke execute on function public.propose_ready(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.propose_ready(uuid, text) to service_role;
revoke execute on function public.suggest_ngo_question(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.suggest_ngo_question(uuid, jsonb) to service_role;
revoke execute on function public.record_outcome(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.record_outcome(uuid, jsonb) to service_role;
revoke execute on function public.commit_prepare(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.commit_prepare(uuid) to service_role;
revoke execute on function public.prd_git_op_fail(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_git_op_fail(uuid) to service_role;

revoke execute on function public.prd_question_outcome(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_question_outcome(uuid, uuid, jsonb) to service_role;
revoke execute on function public.prd_reconcile(uuid, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_reconcile(uuid, text, jsonb) to service_role;
revoke execute on function public.prd_action(uuid, uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_action(uuid, uuid, text, text, text) to service_role;
revoke execute on function public.prd_facts(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_facts(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
