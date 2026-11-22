alter table public.prd_checks
  add column ask_version integer not null default 0 check (ask_version >= 0);

alter table public.prd_turns
  add column close_check boolean not null default false;

create table public.prd_closes (
  project_id uuid primary key references public.prd_records (project_id) on delete cascade,
  revision bigint not null check (revision >= 1),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  actor_id uuid not null references public.accounts (id),
  closed_anyway boolean not null,
  created_at timestamptz not null default clock_timestamp()
);

create table public.prd_close_points (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_closes (project_id) on delete cascade,
  kind text not null check (kind in ('gap', 'unconfirmed', 'question')),
  section_key text,
  question_id uuid,
  body text not null check (length(btrim(body)) > 0),
  ordinal integer not null check (ordinal >= 1),
  unique (project_id, ordinal),
  constraint prd_close_points_shape check (
    (kind in ('gap', 'unconfirmed') and section_key is not null and question_id is null)
    or (kind = 'question' and question_id is not null)
  )
);

create unique index prd_git_ops_one_close_tag_idx
  on public.prd_git_ops (project_id)
  where kind = 'close-tag';

revoke all on table public.prd_closes from public, anon, authenticated, service_role;
revoke all on table public.prd_close_points from public, anon, authenticated, service_role;

alter table public.prd_closes enable row level security;
alter table public.prd_close_points enable row level security;

create function public.prd_close_ready(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.prd_checks c
      join public.prd_records r on r.project_id = c.project_id
     where c.project_id = p_project
       and c.revision = r.current_revision
       and c.passed
  )
  and not exists (
    select 1
      from public.prd_check_gaps g
      join public.prd_checks c on c.id = g.check_id
      join public.prd_records r on r.project_id = c.project_id
     where c.project_id = p_project
       and c.revision = r.current_revision
       and g.fixed = false
  )
  and not exists (
    select 1
      from public.prd_sections s
     where s.project_id = p_project
       and s.required
       and s.state is distinct from 'confirmed'
  )
  and not exists (
    select 1
      from public.prd_questions q
     where q.project_id = p_project
       and q.audience = 'ngo'
       and q.blocking
       and q.status in ('suggested', 'posted', 'answering', 'complete')
  );
$$;

create function public.prd_close_facts(p_project uuid, p_role text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_record public.prd_records%rowtype;
  v_points integer;
  v_ready boolean;
  v_check uuid;
  v_ask integer;
  v_busy boolean;
  v_funded boolean;
  v_allowed boolean;
  v_reason text;
begin
  select * into v_record from public.prd_records where project_id = p_project;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_record.closed_revision is not null then
    select count(*) into v_points
      from public.prd_close_points
     where project_id = p_project;
    return jsonb_build_object(
      'kind', 'closed',
      'revision', v_record.closed_revision,
      'openPoints', v_points
    );
  end if;
  v_ready := public.prd_close_ready(p_project);
  select c.id, c.ask_version into v_check, v_ask
    from public.prd_checks c
   where c.project_id = p_project
     and c.revision = v_record.current_revision;
  select exists (
    select 1
      from public.prd_turns
     where project_id = p_project
       and state in ('admitted', 'uncertain')
  ) into v_busy;
  v_funded := coalesce((public.prd_funds(p_project)->>'replyFunded')::boolean, false);
  if p_role is distinct from 'dev' then
    v_allowed := false;
    v_reason := 'forbidden';
  elsif v_busy then
    v_allowed := false;
    v_reason := 'busy';
  elsif not v_ready and v_check is null and not v_funded then
    v_allowed := false;
    v_reason := 'funds';
  else
    v_allowed := true;
    v_reason := null;
  end if;
  return jsonb_build_object(
    'kind', 'open',
    'revision', v_record.current_revision,
    'path', case when v_ready then 'close' else 'check' end,
    'allowed', v_allowed,
    'reason', v_reason,
    'token', case
      when v_allowed then 'close|close|' || v_record.current_revision::text || '|0'
      else null
    end,
    'checkId', v_check,
    'askVersion', v_ask
  );
end;
$$;

create function public.prd_close_warning_parts(
  p_project uuid,
  p_check uuid,
  p_revision bigint,
  p_repeated boolean,
  p_ask_version integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_check public.prd_checks%rowtype;
  v_gaps integer;
  v_gap_lines text;
  v_unconfirmed text;
  v_questions text;
  v_lines text := '';
  v_parts jsonb := '[]'::jsonb;
  v_gap_parts jsonb;
begin
  select * into v_check from public.prd_checks where id = p_check and project_id = p_project;
  if not found then
    raise exception 'the completion check is not current' using errcode = '22023', detail = 'invalid-request';
  end if;
  select count(*), string_agg(s.title || ': ' || g.text, E'\n' order by s.ordinal, g.text)
    into v_gaps, v_gap_lines
    from public.prd_check_gaps g
    join public.prd_sections s
      on s.project_id = g.project_id
     and s.stable_key = g.section_key
   where g.check_id = p_check
     and g.fixed = false;
  select string_agg(s.title, ', ' order by s.ordinal)
    into v_unconfirmed
    from public.prd_sections s
   where s.project_id = p_project
     and s.required
     and s.state is distinct from 'confirmed'
     and not exists (
       select 1
         from public.prd_check_gaps g
        where g.check_id = p_check
          and g.section_key = s.stable_key
          and g.fixed = false
     );
  select string_agg(q.body, '; ' order by q.ordinal)
    into v_questions
    from public.prd_questions q
   where q.project_id = p_project
     and q.audience = 'ngo'
     and q.blocking
     and q.status in ('suggested', 'posted', 'answering', 'complete');
  if p_repeated then
    v_lines := 'The completion check already ran on revision ' || p_revision::text
      || ', and the PRD has not changed since, so its result stands.';
    v_lines := v_lines || E'\n' || 'Completion check on revision ' || v_check.revision::text
      || ': the PRD covers ' || v_check.score::text
      || '% of the confirmed Discovery document. The configured threshold is '
      || v_check.threshold_text || ', so it '
      || case when v_check.passed then 'passes.' else 'does not pass.' end;
    if btrim(v_check.coverage_text) <> '' then
      v_lines := v_lines || E'\n' || v_check.coverage_text;
    end if;
  end if;
  if v_gaps > 0 then
    if v_lines <> '' then
      v_lines := v_lines || E'\n';
    end if;
    v_lines := v_lines || case when v_gaps = 1 then 'It found one gap:' else 'It found ' || v_gaps::text || ' gaps:' end;
    v_lines := v_lines || E'\n' || v_gap_lines;
  end if;
  if v_unconfirmed is not null then
    if v_lines <> '' then
      v_lines := v_lines || E'\n';
    end if;
    v_lines := v_lines || 'Not confirmed yet: ' || v_unconfirmed || '.';
  end if;
  if v_questions is not null then
    if v_lines <> '' then
      v_lines := v_lines || E'\n';
    end if;
    v_lines := v_lines || 'Open blocking questions: ' || v_questions || '.';
  end if;
  if v_lines <> '' then
    v_lines := v_lines || E'\n';
  end if;
  v_lines := v_lines || 'You can close anyway; these stay recorded as open in the closed revision. Or keep working and close later.';
  v_parts := jsonb_build_array(jsonb_build_object('type', 'text', 'text', v_lines));
  if v_gaps > 0 then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'topicId', g.section_key,
        'title', s.title,
        'text', g.text,
        'fixed', false
      )
      order by s.ordinal, g.text
    ), '[]'::jsonb)
      into v_gap_parts
      from public.prd_check_gaps g
      join public.prd_sections s
        on s.project_id = g.project_id
       and s.stable_key = g.section_key
     where g.check_id = p_check
       and g.fixed = false;
    v_parts := v_parts || jsonb_build_array(jsonb_build_object(
      'type', 'data-check',
      'data', jsonb_build_object('checkId', p_check, 'gaps', v_gap_parts)
    ));
  end if;
  v_parts := v_parts || jsonb_build_array(jsonb_build_object(
    'type', 'data-close-ask',
    'data', jsonb_build_object(
      'checkId', p_check,
      'revision', p_revision,
      'closeAnyway', jsonb_build_object(
        'kind', 'close-anyway',
        'token', 'close-anyway|ask:' || p_check::text || '|' || p_revision::text || '|' || p_ask_version::text
      ),
      'keepWorking', jsonb_build_object(
        'kind', 'keep-working',
        'token', 'keep-working|ask:' || p_check::text || '|' || p_revision::text || '|' || p_ask_version::text
      )
    )
  ));
  return v_parts;
end;
$$;

create function public.prd_close_attach_recommendation(
  p_project uuid,
  p_revision bigint,
  p_passed boolean,
  p_parts jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not p_passed or not public.prd_close_ready(p_project) then
    return p_parts;
  end if;
  return p_parts || jsonb_build_array(jsonb_build_object(
    'type', 'data-recommendation',
    'data', jsonb_build_object(
      'revision', p_revision,
      'close', jsonb_build_object(
        'kind', 'close',
        'token', 'close|close|' || p_revision::text || '|0'
      )
    )
  ));
end;
$$;

create function public.prd_close_freeze(
  p_actor uuid,
  p_project uuid,
  p_anyway boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_record public.prd_records%rowtype;
  v_revision public.prd_revisions%rowtype;
  v_op uuid;
  v_status text;
  v_sequence bigint;
  v_ordinal integer := 0;
  v_gap record;
  v_section record;
  v_question record;
  v_points integer;
begin
  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  select id, status into v_op, v_status
    from public.prd_git_ops
   where project_id = p_project
     and kind = 'close-tag';
  if v_record.closed_revision is not null then
    select count(*) into v_points from public.prd_close_points where project_id = p_project;
    return jsonb_build_object(
      'sequence', v_record.snapshot_sequence,
      'closed', true,
      'openPoints', v_points,
      'tag', case
        when v_op is not null and v_status = 'written' then jsonb_build_object(
          'opId', v_op,
          'revision', v_record.closed_revision,
          'commitSha', (select commit_sha from public.prd_closes where project_id = p_project)
        )
        else null
      end
    );
  end if;
  select * into v_revision
    from public.prd_revisions
   where project_id = p_project
     and revision = v_record.current_revision;
  if not found then
    raise exception 'the PRD has no revision to close' using errcode = '22023', detail = 'invalid-request';
  end if;
  update public.prd_records
     set closed_revision = v_record.current_revision,
         state = 'closed',
         snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project
   returning snapshot_sequence into v_sequence;
  insert into public.prd_closes (project_id, revision, manifest, commit_sha, actor_id, closed_anyway)
  values (
    p_project,
    v_revision.revision,
    v_revision.manifest,
    v_revision.commit_sha,
    p_actor,
    p_anyway
  );
  if p_anyway then
    for v_gap in
      select g.section_key, g.text
        from public.prd_check_gaps g
        join public.prd_checks c on c.id = g.check_id
        join public.prd_sections s
          on s.project_id = g.project_id
         and s.stable_key = g.section_key
       where c.project_id = p_project
         and c.revision = v_record.current_revision
         and g.fixed = false
       order by s.ordinal, g.text
    loop
      v_ordinal := v_ordinal + 1;
      insert into public.prd_close_points (project_id, kind, section_key, question_id, body, ordinal)
      values (p_project, 'gap', v_gap.section_key, null, v_gap.text, v_ordinal);
    end loop;
    for v_section in
      select s.stable_key, s.title
        from public.prd_sections s
       where s.project_id = p_project
         and s.required
         and s.state is distinct from 'confirmed'
         and not exists (
           select 1
             from public.prd_check_gaps g
             join public.prd_checks c on c.id = g.check_id
            where c.project_id = p_project
              and c.revision = v_record.current_revision
              and g.section_key = s.stable_key
              and g.fixed = false
         )
       order by s.ordinal
    loop
      v_ordinal := v_ordinal + 1;
      insert into public.prd_close_points (project_id, kind, section_key, question_id, body, ordinal)
      values (p_project, 'unconfirmed', v_section.stable_key, null, v_section.title, v_ordinal);
    end loop;
    for v_question in
      select q.id, q.body
        from public.prd_questions q
       where q.project_id = p_project
         and q.audience = 'ngo'
         and q.blocking
         and q.status in ('suggested', 'posted', 'answering', 'complete')
       order by q.ordinal
    loop
      v_ordinal := v_ordinal + 1;
      insert into public.prd_close_points (project_id, kind, section_key, question_id, body, ordinal)
      values (p_project, 'question', null, v_question.id, v_question.body, v_ordinal);
    end loop;
  end if;
  insert into public.prd_git_ops (project_id, kind, commit_sha, status)
  values (p_project, 'close-tag', v_revision.commit_sha, 'written')
  returning id into v_op;
  return jsonb_build_object(
    'sequence', v_sequence,
    'closed', true,
    'openPoints', v_ordinal,
    'tag', jsonb_build_object(
      'opId', v_op,
      'revision', v_revision.revision,
      'commitSha', v_revision.commit_sha
    )
  );
end;
$$;

create function public.prd_close_decide(
  p_actor uuid,
  p_project uuid,
  p_chat uuid,
  p_repeated boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_record public.prd_records%rowtype;
  v_check public.prd_checks%rowtype;
  v_version integer;
  v_parts jsonb;
  v_sequence bigint;
  v_text text;
begin
  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_record.closed_revision is not null then
    return public.prd_close_freeze(p_actor, p_project, false);
  end if;
  select * into v_check
    from public.prd_checks
   where project_id = p_project
     and revision = v_record.current_revision
     for update;
  if not found then
    raise exception 'the completion check is not current' using errcode = '22023', detail = 'invalid-request';
  end if;
  if public.prd_close_ready(p_project) then
    v_text := '';
    if p_repeated then
      v_text := 'The completion check already ran on revision ' || v_record.current_revision::text
        || ', and the PRD has not changed since, so its result stands.' || E'\n';
    end if;
    v_text := v_text || 'The PRD is closed at revision ' || v_record.current_revision::text
      || '. UI Design starts from it.';
    perform public.prd_insert_message(
      p_project, p_chat, 'ai', 'ai4good AI', null,
      jsonb_build_array(jsonb_build_object('type', 'text', 'text', v_text)),
      null
    );
    return public.prd_close_freeze(p_actor, p_project, false);
  end if;
  update public.prd_checks
     set ask_version = ask_version + 1
   where id = v_check.id
   returning ask_version into v_version;
  v_parts := public.prd_close_warning_parts(
    p_project, v_check.id, v_record.current_revision, p_repeated, v_version
  );
  perform public.prd_insert_message(p_project, p_chat, 'ai', 'ai4good AI', null, v_parts, null);
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project
   returning snapshot_sequence into v_sequence;
  return jsonb_build_object('sequence', v_sequence, 'closed', false, 'tag', null);
end;
$$;

create function public.prd_close_check_begin(
  p_actor uuid,
  p_project uuid,
  p_chat uuid,
  p_request text,
  p_hash text,
  p_model text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_record public.prd_records%rowtype;
  v_role text;
  v_first text;
  v_seen bigint;
  v_sequence bigint;
  v_turn uuid;
  v_result jsonb;
  v_current boolean;
begin
  perform public.assert_account_active(p_actor);
  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_refuse_unready(v_record.state);
  if v_record.closed_revision is not null then
    raise exception 'the PRD is closed' using errcode = '42501', detail = 'closed';
  end if;
  v_role := public.prd_role(p_project, p_actor);
  if v_role is distinct from 'dev' then
    raise exception 'this account cannot close the PRD' using errcode = '42501', detail = 'forbidden';
  end if;
  if not exists (
    select 1
      from public.prd_chats
     where id = p_chat
       and project_id = p_project
       and kind = 'main'
  ) then
    raise exception 'The completion check runs in the main chat.'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if exists (
    select 1
      from public.prd_turns
     where project_id = p_project
       and state in ('admitted', 'uncertain')
  ) then
    raise exception 'Wait for the AI to finish.' using errcode = '22023', detail = 'busy';
  end if;
  v_current := exists (
    select 1
      from public.prd_checks
     where project_id = p_project
       and revision = v_record.current_revision
  );
  if not v_current and not coalesce((public.prd_funds(p_project)->>'replyFunded')::boolean, false) then
    raise exception 'Not enough left for another AI reply. The kitchen adds funds to continue.'
      using errcode = '22023', detail = 'funds';
  end if;
  v_first := split_part(public.prd_person_name(p_actor, 'Developer'), ' ', 1);
  perform public.prd_insert_message(
    p_project,
    p_chat,
    'system',
    '',
    null,
    jsonb_build_array(jsonb_build_object(
      'type', 'data-line',
      'data', jsonb_build_object(
        'text', v_first || ' pressed Close PRD · revision ' || v_record.current_revision::text,
        'topicId', null
      )
    )),
    null
  );
  if v_current then
    v_result := public.prd_close_decide(p_actor, p_project, p_chat, true);
    insert into public.prd_actions (project_id, actor_id, request_id, kind, result)
    values (p_project, p_actor, p_request, 'close-check', v_result || jsonb_build_object('bodyHash', p_hash));
    return v_result;
  end if;
  select conversation_revision into v_seen
    from public.prd_chats
   where id = p_chat
     for update;
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project
   returning snapshot_sequence into v_sequence;
  v_turn := public.prd_turn_insert(
    p_project,
    p_chat,
    p_actor,
    p_request,
    p_hash,
    v_record.current_revision,
    v_seen,
    v_sequence,
    'check',
    null
  );
  update public.prd_turns set close_check = true where id = v_turn;
  perform public.prd_hold(p_project, v_turn, p_model);
  return jsonb_build_object(
    'turnId', v_turn,
    'messageId', null,
    'sequence', v_sequence,
    'check', jsonb_build_object(
      'turnId', v_turn,
      'sectionKey', '',
      'priorState', 'ready',
      'priorChanged', null
    )
  );
end;
$$;

create function public.prd_close_after_check(p_project uuid, p_turn uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_turn public.prd_turns%rowtype;
  v_record public.prd_records%rowtype;
  v_check public.prd_checks%rowtype;
begin
  select * into v_turn
    from public.prd_turns
   where id = p_turn
     and project_id = p_project
     for update;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.assert_account_active(v_turn.actor_id);
  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not v_turn.close_check then
    return jsonb_build_object(
      'sequence', v_record.snapshot_sequence,
      'closed', v_record.closed_revision is not null,
      'tag', null
    );
  end if;
  if v_record.current_revision is distinct from v_turn.base_revision then
    raise exception 'The PRD changed. Close again.' using errcode = '22023', detail = 'stale';
  end if;
  if v_record.closed_revision is not null then
    return public.prd_close_freeze(v_turn.actor_id, p_project, false);
  end if;
  select * into v_check
    from public.prd_checks
   where project_id = p_project
     and revision = v_turn.base_revision;
  if not found or v_check.ask_version > 0 then
    return jsonb_build_object('sequence', v_record.snapshot_sequence, 'closed', false, 'tag', null);
  end if;
  return public.prd_close_decide(v_turn.actor_id, p_project, v_turn.chat_id, false);
end;
$$;

create function public.prd_close_act(
  p_actor uuid,
  p_project uuid,
  p_kind text,
  p_target text,
  p_token_revision bigint,
  p_token_version bigint
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_record public.prd_records%rowtype;
  v_check public.prd_checks%rowtype;
  v_sequence bigint;
  v_busy boolean;
begin
  perform public.assert_account_active(p_actor);
  if public.prd_role(p_project, p_actor) is distinct from 'dev' then
    raise exception 'this account cannot close the PRD' using errcode = '42501', detail = 'forbidden';
  end if;
  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_record.closed_revision is not null then
    raise exception 'the PRD is closed' using errcode = '42501', detail = 'closed';
  end if;
  v_busy := exists (
    select 1
      from public.prd_turns
     where project_id = p_project
       and state in ('admitted', 'uncertain')
  );
  if p_kind = 'close' then
    if v_busy then
      raise exception 'Wait for the AI to finish.' using errcode = '22023', detail = 'busy';
    end if;
    if p_target is distinct from 'close'
       or p_token_version is distinct from 0
       or p_token_revision is distinct from v_record.current_revision then
      raise exception 'The PRD changed. Close again.' using errcode = '22023', detail = 'stale';
    end if;
    if not public.prd_close_ready(p_project) then
      raise exception 'Close PRD runs the completion check first.'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    return public.prd_close_freeze(p_actor, p_project, false);
  end if;
  if p_kind not in ('close-anyway', 'keep-working') then
    raise exception 'that action is not available yet' using errcode = '22023', detail = 'not-yet';
  end if;
  if left(coalesce(p_target, ''), 4) is distinct from 'ask:' or length(p_target) <= 4 then
    raise exception 'The PRD changed. Close again.' using errcode = '22023', detail = 'stale';
  end if;
  select * into v_check
    from public.prd_checks
   where project_id = p_project
     and id = substring(p_target from 5)::uuid
     for update;
  if not found
     or v_check.revision is distinct from v_record.current_revision
     or v_check.ask_version is distinct from p_token_version
     or p_token_revision is distinct from v_record.current_revision then
    raise exception 'The PRD changed. Close again.' using errcode = '22023', detail = 'stale';
  end if;
  if p_kind = 'keep-working' then
    update public.prd_checks
       set ask_version = ask_version + 1
     where id = v_check.id;
    update public.prd_records
       set snapshot_sequence = snapshot_sequence + 1
     where project_id = p_project
     returning snapshot_sequence into v_sequence;
    return jsonb_build_object('sequence', v_sequence, 'closed', false, 'tag', null);
  end if;
  if v_busy then
    raise exception 'Wait for the AI to finish.' using errcode = '22023', detail = 'busy';
  end if;
  return public.prd_close_freeze(p_actor, p_project, true);
exception
  when invalid_text_representation then
    raise exception 'The PRD changed. Close again.' using errcode = '22023', detail = 'stale';
end;
$$;

create function public.prd_closed_sections(p_actor uuid, p_project uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_revision bigint;
  v_sections jsonb;
begin
  perform public.assert_account_active(p_actor);
  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD' using errcode = '42501', detail = 'forbidden';
  end if;
  select closed_revision into v_revision
    from public.prd_records
   where project_id = p_project;
  if v_revision is null then
    raise exception 'the PRD is not closed' using errcode = '22023', detail = 'invalid-request';
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', s.stable_key,
      'title', s.title,
      'required', s.required,
      'ordinal', s.ordinal,
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
  return jsonb_build_object('revision', v_revision, 'sections', v_sections);
end;
$$;

create function public.prd_close_tag_pending(p_project uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when o.id is null then null
    else jsonb_build_object(
      'opId', o.id,
      'repoName', r.repo_name,
      'commitSha', o.commit_sha,
      'revision', c.revision
    )
  end
    from public.prd_records r
    left join public.prd_git_ops o
      on o.project_id = r.project_id
     and o.kind = 'close-tag'
     and o.status = 'written'
     and r.state <> 'diverged'
    left join public.prd_closes c on c.project_id = r.project_id
   where r.project_id = p_project;
$$;

revoke execute on function public.prd_close_ready(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prd_close_facts(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.prd_close_warning_parts(uuid, uuid, bigint, boolean, integer)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_close_attach_recommendation(uuid, bigint, boolean, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_close_freeze(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_close_decide(uuid, uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_close_check_begin(uuid, uuid, uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_close_check_begin(uuid, uuid, uuid, text, text, text) to service_role;
revoke execute on function public.prd_close_after_check(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_close_after_check(uuid, uuid) to service_role;
revoke execute on function public.prd_close_act(uuid, uuid, text, text, bigint, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_close_act(uuid, uuid, text, text, bigint, bigint) to service_role;
revoke execute on function public.prd_closed_sections(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_closed_sections(uuid, uuid) to service_role;
revoke execute on function public.prd_close_tag_pending(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_close_tag_pending(uuid) to service_role;
