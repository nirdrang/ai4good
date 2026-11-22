create or replace function public.prd_check_record(
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
  v_current_revision bigint;
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
  select current_revision into v_current_revision
    from public.prd_records
   where project_id = p_project
     for update;
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
       and v_turn.base_revision = v_current_revision
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
  if v_turn.base_revision = v_current_revision then
    p_parts := public.prd_close_attach_recommendation(p_project, v_turn.base_revision, v_passed, p_parts);
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

create or replace function public.prd_close_after_check(p_project uuid, p_turn uuid)
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
  if exists (
    select 1
      from public.prd_turns
     where project_id = p_project
       and state in ('admitted', 'uncertain')
  ) then
    raise exception 'Wait for the AI to finish.' using errcode = '22023', detail = 'busy';
  end if;
  return public.prd_close_decide(v_turn.actor_id, p_project, v_turn.chat_id, false);
end;
$$;

revoke execute on function public.prd_check_record(uuid, uuid, uuid, integer, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_check_record(uuid, uuid, uuid, integer, text, jsonb, jsonb) to service_role;
revoke execute on function public.prd_close_after_check(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_close_after_check(uuid, uuid) to service_role;
