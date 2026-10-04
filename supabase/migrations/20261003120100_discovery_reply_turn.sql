alter table public.discovery_turns
  add column user_message_id text,
  add column answers jsonb,
  add column assistant_ui jsonb,
  add column base_revision integer;

create unique index discovery_turns_one_user_message
  on public.discovery_turns (project_id, user_message_id)
  where user_message_id is not null;

create unique index discovery_turns_one_opening
  on public.discovery_turns (project_id)
  where billing = 'opening';

alter table public.discovery_turns drop constraint discovery_turns_free_reserved_at_ratio;
alter table public.discovery_turns add constraint discovery_turns_free_reserved_at_ratio check (
  user_message_id is not null
  or billing <> 'free'
  or reserved_credits = ceil(reserved_micros::numeric / micros_per_credit)
);

alter table public.discovery_turns drop constraint discovery_turns_settled_is_measured;
alter table public.discovery_turns add constraint discovery_turns_settled_is_measured check (
  user_message_id is not null
  or status <> 'settled'
  or (
    input_tokens >= 0 and output_tokens >= 0 and output_tokens <= max_output_tokens and assistant_message is not null
    and actual_micros = input_tokens * input_micros_per_token + output_tokens * output_micros_per_token
    and overrun_micros = greatest(0, actual_micros - reserved_micros)
    and (billing <> 'free' or charged_credits = least(reserved_credits, ceil(actual_micros::numeric / micros_per_credit)))
  )
);

alter table public.discovery_turns drop constraint discovery_turns_abandoned_keeps_reservation;
alter table public.discovery_turns add constraint discovery_turns_abandoned_keeps_reservation check (
  status <> 'abandoned'
  or user_message_id is not null
  or charged_credits = reserved_credits
);

alter table public.discovery_turns add constraint discovery_turns_reply_one_credit check (
  user_message_id is null
  or (
    (
      (billing = 'opening' and reserved_credits = 0 and coalesce(charged_credits, 0) = 0)
      or (
        billing = 'free' and reserved_credits = 1
        and (charged_credits is null or charged_credits in (0, 1))
        and (status <> 'settled' or charged_credits = 1)
      )
      or (billing = 'fuel' and reserved_credits = 0 and coalesce(charged_credits, 0) = 0)
    )
    and (
      status <> 'settled'
      or (
        assistant_message is not null
        and input_tokens >= 0 and output_tokens >= 0 and output_tokens <= max_output_tokens
        and actual_micros = input_tokens::bigint * input_micros_per_token + output_tokens::bigint * output_micros_per_token
        and overrun_micros = greatest(0, actual_micros - reserved_micros)
      )
    )
  )
) not valid;

create or replace function public.discovery_turn_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Discovery turns cannot be deleted' using errcode = '42501';
  end if;
  if old.status <> 'open' or new.status not in ('settled', 'failed', 'abandoned') then
    raise exception 'only an open Discovery turn can be settled' using errcode = '42501';
  end if;
  if (to_jsonb(new) - array['status', 'assistant_message', 'assistant_ui', 'elicitation', 'input_tokens', 'output_tokens',
      'stop_reason', 'served_model', 'actual_micros', 'charged_credits', 'overrun_micros', 'settled_at', 'off_topic'])
    is distinct from
     (to_jsonb(old) - array['status', 'assistant_message', 'assistant_ui', 'elicitation', 'input_tokens', 'output_tokens',
      'stop_reason', 'served_model', 'actual_micros', 'charged_credits', 'overrun_micros', 'settled_at', 'off_topic']) then
    raise exception 'the Discovery reservation is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create function public.discovery_usage(p_account_id uuid, p_organization_id uuid, p_project_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_vetted boolean := false;
  v_utc_day date;
  v_spent integer := 0;
  v_granted integer;
  v_remaining integer;
  v_fuel bigint;
  v_next text;
begin
  perform public.assert_account_active(p_account_id);
  v_utc_day := (clock_timestamp() at time zone 'utc')::date;
  select vetted into v_vetted from public.org_vetting where org_id = p_organization_id;
  if not found then
    v_vetted := false;
  end if;
  select spent, granted into v_spent, v_granted
    from public.discovery_spend
   where org_id = p_organization_id and utc_day = v_utc_day;
  if not found then
    v_spent := 0;
    v_granted := public.discovery_daily_grant(v_vetted);
  else
    v_granted := greatest(v_granted, public.discovery_daily_grant(v_vetted));
  end if;
  v_remaining := v_granted - v_spent;
  v_fuel := public.project_fuel_available_micros(p_project_id);
  if v_remaining >= 1 then
    v_next := 'free';
  elsif v_fuel >= 100000 then
    v_next := 'paid';
  else
    v_next := 'unavailable';
  end if;
  return jsonb_build_object(
    'daily_left', v_remaining,
    'daily_grant', v_granted,
    'available_micros', v_fuel,
    'reserved_micros', 0,
    'allocation_micros', 0,
    'settled_micros', 0,
    'hold_micros', 100000,
    'next_reply', v_next,
    'next_reset_at', ((v_utc_day + 1)::timestamp at time zone 'utc')
  );
end;
$$;
revoke execute on function public.discovery_usage(uuid, uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.discovery_usage(uuid, uuid, uuid) to service_role;

create function public.discovery_reply_payload(
  p_turn public.discovery_turns, p_project public.projects, p_need public.need_intakes, p_replay text, p_usage jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_revision bigint;
  v_document jsonb;
  v_context jsonb;
begin
  select revision, document into v_revision, v_document
    from public.brief_revisions
   where project_id = p_project.id
   order by revision desc
   limit 1;
  select coalesce(jsonb_agg(m.message order by t.seq, m.position), '[]'::jsonb) into v_context
    from public.discovery_turns t cross join lateral (values
      (1, jsonb_build_object('role', 'user', 'content', t.user_message)),
      (2, jsonb_build_object('role', 'assistant', 'content', t.assistant_message))
    ) as m(position, message) where t.project_id = p_project.id and t.status = 'settled';
  return jsonb_build_object(
    'turn', to_jsonb(p_turn),
    'need', jsonb_build_object(
      'title', p_project.name, 'description', p_need.description, 'urgency', p_need.urgency,
      'reference_files', (select coalesce(jsonb_agg(f->>'file_name'), '[]'::jsonb)
        from jsonb_array_elements(coalesce(p_need.reference_files, '[]'::jsonb)) f)
    ),
    'context', coalesce(v_context, '[]'::jsonb),
    'allowance', null,
    'usage', p_usage,
    'replay', p_replay,
    'brief', case when v_revision is null then null
      else jsonb_build_object('revision', v_revision, 'document', v_document) end
  );
end;
$$;
revoke execute on function public.discovery_reply_payload(public.discovery_turns, public.projects, public.need_intakes, text, jsonb)
  from public, anon, authenticated, service_role;

create function public.discovery_reply_reserve(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid, p_message text,
  p_settings jsonb, p_counted_through_seq integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.org_role;
  v_project public.projects;
  v_need public.need_intakes;
  v_turn public.discovery_turns;
  v_existing public.discovery_turns;
  v_open public.discovery_turns;
  v_key text;
  v_read jsonb;
  v_debit jsonb;
  v_usage jsonb;
  v_max_output integer;
  v_ratio integer;
  v_in_price integer;
  v_out_price integer;
  v_reserved_micros bigint;
  v_reserved_credits integer;
  v_seq integer;
  v_billing public.discovery_billing;
  v_utc_day date;
  v_disabled_at timestamptz;
  v_disabled_reason text;
  v_revision bigint;
  v_document jsonb;
  v_topic_id text;
  v_topic jsonb;
  v_required integer := 0;
  v_ready boolean := true;
  v_next text;
begin
  perform public.assert_account_active(p_account_id);
  select discovery_disabled_at, discovery_disabled_reason into v_disabled_at, v_disabled_reason
    from public.organizations where id = p_organization_id for share;
  if not found then
    raise exception 'no such organisation' using errcode = '23503', detail = 'no-such-organisation';
  end if;
  select role into v_role from public.org_memberships
    where org_id = p_organization_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'the caller holds no membership in this organisation' using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'only the organisation admin may send a Discovery message' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if v_disabled_at is not null then
    raise exception 'a platform admin switched Discovery off for this organisation — %', v_disabled_reason
      using errcode = 'P0001', detail = 'discovery-disabled';
  end if;
  if not exists (select 1 from auth.users where id = p_account_id and email_confirmed_at is not null) then
    raise exception 'a Discovery message needs a verified email address — this account is email-unverified. Use the verification link sent to the account address, then send the message again'
      using errcode = '42501', detail = 'email-unverified';
  end if;
  if jsonb_typeof(p_settings) is distinct from 'object'
    or p_settings->>'mode' not in ('answer', 'opening')
    or p_settings->>'user_message_id' is null
    or length(p_settings->>'user_message_id') < 1 or length(p_settings->>'user_message_id') > 200
    or p_settings->>'assistant_message_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_settings->'answers') is distinct from 'array'
    or jsonb_typeof(p_settings->'model') is distinct from 'string' or btrim(p_settings->>'model') = ''
    or jsonb_typeof(p_settings->'effort') is distinct from 'string' or btrim(p_settings->>'effort') = '' then
    raise exception 'invalid Discovery settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_settings->>'mode' = 'answer' and p_settings->>'expected_charge' not in ('free', 'paid') then
    raise exception 'invalid Discovery settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  foreach v_key in array array['max_output_tokens', 'min_output_tokens', 'message_max_chars',
    'micros_per_credit', 'input_micros_per_token', 'output_micros_per_token', 'turn_deadline_seconds',
    'counted_input_tokens', 'off_topic_flag_strikes'] loop
    if jsonb_typeof(p_settings->v_key) is distinct from 'number'
      or (p_settings->>v_key) !~ '^[0-9]+$' then
      raise exception 'invalid Discovery numeric setting %', v_key using errcode = '22023', detail = 'invalid-request';
    end if;
    if (p_settings->>v_key)::numeric > 2147483583
      or ((p_settings->>v_key)::numeric = 0 and v_key <> 'counted_input_tokens') then
      raise exception 'invalid Discovery numeric setting %', v_key using errcode = '22023', detail = 'invalid-request';
    end if;
  end loop;
  if p_message is not null and length(p_message) > (p_settings->>'message_max_chars')::integer then
    raise exception 'invalid Discovery message or settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_settings->>'mode' = 'answer'
    and coalesce(btrim(p_message), '') = ''
    and jsonb_array_length(p_settings->'answers') = 0 then
    raise exception 'invalid Discovery message or settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_project from public.projects where id = p_project_id and org_id = p_organization_id for update;
  if not found then
    raise exception 'no such project in this organisation' using errcode = '23503', detail = 'no-such-project';
  end if;
  select * into v_need from public.need_intakes where project_id = p_project_id;
  if not found or v_need.stage <> 'discovery_in_progress' then
    raise exception 'the need is not in Discovery' using errcode = 'P0001', detail = 'need-not-in-discovery';
  end if;
  select * into v_existing from public.discovery_turns
    where project_id = p_project_id and user_message_id = p_settings->>'user_message_id'
    for update;
  if found then
    v_usage := public.discovery_usage(p_account_id, p_organization_id, p_project_id);
    return public.discovery_reply_payload(
      v_existing, v_project, v_need,
      case when v_existing.status = 'open' then 'retry' else 'stored' end,
      v_usage
    );
  end if;
  if p_settings->>'mode' = 'opening' then
    select * into v_existing from public.discovery_turns
      where project_id = p_project_id and billing = 'opening'
      order by seq limit 1 for update;
    if found then
      v_usage := public.discovery_usage(p_account_id, p_organization_id, p_project_id);
      return public.discovery_reply_payload(v_existing, v_project, v_need, 'stored', v_usage);
    end if;
  end if;
  select * into v_open from public.discovery_turns where project_id = p_project_id and status = 'open' for update;
  if found then
    if v_open.opened_at > clock_timestamp() - make_interval(secs => (p_settings->>'turn_deadline_seconds')::integer) then
      raise exception 'a Discovery turn is in flight' using errcode = 'P0001', detail = 'turn-in-flight';
    end if;
    if v_open.user_message_id is not null then
      update public.discovery_turns set status = 'abandoned', charged_credits = 0, settled_at = clock_timestamp()
        where id = v_open.id;
      if v_open.reserved_credits > 0 then
        perform public.discovery_spend_release(v_open.org_id, v_open.utc_day, v_open.reserved_credits);
      end if;
    else
      update public.discovery_turns set status = 'abandoned', charged_credits = reserved_credits, settled_at = clock_timestamp()
        where id = v_open.id;
    end if;
  end if;
  select revision, document into v_revision, v_document
    from public.brief_revisions
   where project_id = p_project_id
   order by revision desc
   limit 1
   for update;
  if p_settings->>'mode' = 'opening' then
    if v_revision is not null then
      raise exception 'Discovery already has a brief.' using errcode = 'P0001', detail = 'invalid-request';
    end if;
    v_billing := 'opening';
    v_reserved_credits := 0;
    v_read := public.discovery_allowance(p_account_id, p_organization_id, 'read', null);
    v_utc_day := (v_read->>'utc_day')::date;
  else
    if v_revision is not null and exists (
      select 1 from public.discovery_confirmations
       where project_id = p_project_id and revision = v_revision
    ) then
      raise exception 'Discovery is finished. No further reply is charged.'
        using errcode = 'P0001', detail = 'finished';
    end if;
    if v_revision is not null then
      for v_topic_id in select jsonb_array_elements_text(coalesce(v_document->'topicOrder', '[]'::jsonb))
      loop
        v_topic := v_document->'topics'->v_topic_id;
        if coalesce(v_topic->>'required', 'false') = 'true' then
          v_required := v_required + 1;
          if v_topic->'state'->>'kind' is distinct from 'agreed'
             or coalesce(v_topic->>'needsReview', 'false') = 'true' then
            v_ready := false;
          end if;
        end if;
      end loop;
      if v_required > 0 and v_ready then
        raise exception 'Discovery is ready for review. The AI has stopped asking questions.'
          using errcode = 'P0001', detail = 'discovery-ready';
      end if;
    end if;
    v_usage := public.discovery_usage(p_account_id, p_organization_id, p_project_id);
    v_next := v_usage->>'next_reply';
    if v_next in ('free', 'paid') and v_next is distinct from p_settings->>'expected_charge' then
      raise exception 'The reply cost changed. Review the usage card, then send again.'
        using errcode = 'P0001', detail = 'mode-changed';
    end if;
    if v_next is distinct from 'free' and v_next is distinct from 'paid' then
      raise exception 'No free Discovery reply is left today, and project fuel does not cover one.'
        using errcode = 'P0001', detail = 'daily-limit';
    end if;
    if v_next = 'free' then
      v_billing := 'free';
      v_reserved_credits := 1;
      v_debit := public.discovery_allowance(p_account_id, p_organization_id, 'debit', 1);
      v_utc_day := (v_debit->>'utc_day')::date;
    else
      v_billing := 'fuel';
      v_reserved_credits := 0;
      v_read := public.discovery_allowance(p_account_id, p_organization_id, 'read', null);
      v_utc_day := (v_read->>'utc_day')::date;
    end if;
  end if;
  v_max_output := (p_settings->>'max_output_tokens')::integer;
  v_ratio := (p_settings->>'micros_per_credit')::integer;
  v_in_price := (p_settings->>'input_micros_per_token')::integer;
  v_out_price := (p_settings->>'output_micros_per_token')::integer;
  v_reserved_micros := v_max_output::bigint * v_out_price;
  select coalesce(max(seq), 0) + 1 into v_seq from public.discovery_turns where project_id = p_project_id;
  insert into public.discovery_turns (
    project_id, org_id, seq, billing, utc_day, user_message, request_settings,
    max_output_tokens, estimated_input_tokens, micros_per_credit, input_micros_per_token,
    output_micros_per_token, reserved_micros, reserved_credits, opened_at,
    user_message_id, answers, base_revision
  ) values (
    p_project_id, p_organization_id, v_seq, v_billing, v_utc_day, coalesce(btrim(p_message), ''),
    jsonb_build_object(
      'model', p_settings->>'model', 'max_tokens', v_max_output, 'effort', p_settings->>'effort',
      'assistant_message_id', p_settings->>'assistant_message_id',
      'guardrails', jsonb_build_object(
        'active', false,
        'off_topic_flag_strikes', (p_settings->>'off_topic_flag_strikes')::integer
      )
    ),
    v_max_output, 0, v_ratio, v_in_price, v_out_price, v_reserved_micros, v_reserved_credits, clock_timestamp(),
    p_settings->>'user_message_id', p_settings->'answers', v_revision::integer
  ) returning * into v_turn;
  v_usage := public.discovery_usage(p_account_id, p_organization_id, p_project_id);
  return public.discovery_reply_payload(v_turn, v_project, v_need, null, v_usage);
end;
$$;
revoke execute on function public.discovery_reply_reserve(uuid, uuid, uuid, text, jsonb, integer)
  from public, anon, authenticated, service_role;

create function public.discovery_reply_fail(p_turn public.discovery_turns, p_kind text, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_turn public.discovery_turns;
begin
  update public.discovery_turns set status = 'failed', charged_credits = 0, settled_at = clock_timestamp()
    where id = p_turn.id returning * into v_turn;
  if p_turn.reserved_credits > 0 then
    perform public.discovery_spend_release(p_turn.org_id, p_turn.utc_day, p_turn.reserved_credits);
  end if;
  return jsonb_build_object('ok', false, 'kind', p_kind, 'reason', p_reason, 'turn', to_jsonb(v_turn));
end;
$$;
revoke execute on function public.discovery_reply_fail(public.discovery_turns, text, text)
  from public, anon, authenticated, service_role;

create function public.discovery_reply_settle(
  p_account_id uuid, p_turn_id uuid, p_outcome text, p_assistant_message text,
  p_input_tokens integer, p_output_tokens integer, p_stop_reason text, p_served_model text, p_elicitation jsonb,
  p_off_topic boolean, p_notice jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_turn public.discovery_turns;
  v_role public.org_role;
  v_actual bigint;
  v_charged integer;
  v_document jsonb;
  v_base bigint;
  v_revision bigint;
  v_ui jsonb;
begin
  perform public.assert_account_active(p_account_id);
  select * into v_turn from public.discovery_turns where id = p_turn_id;
  if not found then
    raise exception 'no open Discovery turn' using errcode = 'P0001', detail = 'turn-not-open';
  end if;
  perform 1 from public.organizations where id = v_turn.org_id for share;
  perform 1 from public.projects where id = v_turn.project_id for update;
  select * into v_turn from public.discovery_turns where id = p_turn_id for update;
  if v_turn.status <> 'open' or v_turn.user_message_id is null then
    raise exception 'the Discovery turn is not open' using errcode = 'P0001', detail = 'turn-not-open';
  end if;
  select role into v_role from public.org_memberships where org_id = v_turn.org_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'the caller holds no membership in this organisation' using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'only the organisation admin may settle a Discovery turn' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if p_outcome = 'failed' then
    update public.discovery_turns set status = 'failed', charged_credits = 0, settled_at = clock_timestamp()
      where id = p_turn_id returning * into v_turn;
    if v_turn.reserved_credits > 0 then
      perform public.discovery_spend_release(v_turn.org_id, v_turn.utc_day, v_turn.reserved_credits);
    end if;
    return jsonb_build_object(
      'turn', to_jsonb(v_turn), 'allowance', null, 'off_topic_count', 0,
      'usage', public.discovery_usage(p_account_id, v_turn.org_id, v_turn.project_id)
    );
  end if;
  if p_outcome is distinct from 'completed' then
    raise exception 'invalid Discovery outcome' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_ui := p_elicitation->'ui';
  if p_assistant_message is null
     or p_input_tokens is null or p_input_tokens < 0
     or p_output_tokens is null or p_output_tokens < 0
     or p_output_tokens > v_turn.max_output_tokens
     or p_elicitation is null
     or (p_elicitation->>'replyContract') is distinct from 'true'
     or jsonb_typeof(v_ui) is distinct from 'object' then
    return public.discovery_reply_fail(v_turn, 'invalid-request', 'the reply could not be saved');
  end if;
  if jsonb_typeof(p_elicitation->'document') = 'object' then
    v_document := p_elicitation->'document';
  end if;
  if coalesce(p_elicitation->>'baseRevision', '') ~ '^[0-9]+$' then
    v_base := (p_elicitation->>'baseRevision')::bigint;
  end if;
  select revision into v_revision from public.brief_revisions
    where project_id = v_turn.project_id
    order by revision desc limit 1 for update;
  if v_document is not null then
    if v_revision is null then
      if v_base is not null then
        return public.discovery_reply_fail(v_turn, 'stale-revision', 'The brief changed. Review the latest revision.');
      end if;
      insert into public.brief_revisions (project_id, revision, document, created_by)
      values (v_turn.project_id, 1, v_document, p_account_id);
    elsif v_base is distinct from v_revision then
      return public.discovery_reply_fail(v_turn, 'stale-revision', 'The brief changed. Review the latest revision.');
    else
      insert into public.brief_revisions (project_id, revision, document, created_by)
      values (v_turn.project_id, v_revision + 1, v_document, p_account_id);
    end if;
  end if;
  v_actual := p_input_tokens::bigint * v_turn.input_micros_per_token + p_output_tokens::bigint * v_turn.output_micros_per_token;
  v_charged := case when v_turn.billing = 'free' then 1 else 0 end;
  update public.discovery_turns set status = 'settled', assistant_message = p_assistant_message, assistant_ui = v_ui,
    input_tokens = p_input_tokens, output_tokens = p_output_tokens, stop_reason = p_stop_reason,
    served_model = p_served_model, actual_micros = v_actual, charged_credits = v_charged,
    overrun_micros = greatest(0, v_actual - reserved_micros), settled_at = clock_timestamp(), off_topic = false
    where id = p_turn_id returning * into v_turn;
  if v_turn.reserved_credits > v_charged then
    perform public.discovery_spend_release(v_turn.org_id, v_turn.utc_day, v_turn.reserved_credits - v_charged);
  end if;
  return jsonb_build_object(
    'turn', to_jsonb(v_turn),
    'allowance', public.discovery_allowance(p_account_id, v_turn.org_id, 'read', null),
    'off_topic_count', 0,
    'usage', public.discovery_usage(p_account_id, v_turn.org_id, v_turn.project_id)
  );
end;
$$;
revoke execute on function public.discovery_reply_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, boolean, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.discovery_turn_reserve(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid, p_message text,
  p_settings jsonb, p_counted_through_seq integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.org_role;
  v_project public.projects;
  v_need public.need_intakes;
  v_turn public.discovery_turns;
  v_open public.discovery_turns;
  v_key text;
  v_read jsonb;
  v_debit jsonb;
  v_est_input integer;
  v_max_output integer;
  v_min_output integer;
  v_ratio integer;
  v_in_price integer;
  v_out_price integer;
  v_reserved_micros bigint;
  v_reserved_credits integer;
  v_seq integer;
  v_context jsonb;
  v_billing public.discovery_billing;
  v_fuel bigint;
  v_utc_day date;
  v_disabled_at timestamptz;
  v_disabled_reason text;
begin
  if coalesce(p_settings->>'contract', '') = 'reply' then
    return public.discovery_reply_reserve(p_account_id, p_organization_id, p_project_id, p_message, p_settings, p_counted_through_seq);
  end if;
  perform public.assert_account_active(p_account_id);
  select discovery_disabled_at, discovery_disabled_reason into v_disabled_at, v_disabled_reason
    from public.organizations where id = p_organization_id for share;
  if not found then
    raise exception 'no such organisation' using errcode = '23503', detail = 'no-such-organisation';
  end if;
  select role into v_role from public.org_memberships
    where org_id = p_organization_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'the caller holds no membership in this organisation' using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'only the organisation admin may send a Discovery message' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if v_disabled_at is not null then
    raise exception 'a platform admin switched Discovery off for this organisation — %', v_disabled_reason
      using errcode = 'P0001', detail = 'discovery-disabled';
  end if;
  if not exists (select 1 from auth.users where id = p_account_id and email_confirmed_at is not null) then
    raise exception 'a Discovery message needs a verified email address — this account is email-unverified. Use the verification link sent to the account address, then send the message again'
      using errcode = '42501', detail = 'email-unverified';
  end if;
  if jsonb_typeof(p_settings) is distinct from 'object'
    or jsonb_typeof(p_settings->'model') is distinct from 'string' or btrim(p_settings->>'model') = ''
    or jsonb_typeof(p_settings->'effort') is distinct from 'string' or btrim(p_settings->>'effort') = '' then
    raise exception 'invalid Discovery settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  foreach v_key in array array['max_output_tokens', 'min_output_tokens', 'message_max_chars',
    'micros_per_credit', 'input_micros_per_token', 'output_micros_per_token', 'turn_deadline_seconds',
    'counted_input_tokens', 'off_topic_flag_strikes'] loop
    if jsonb_typeof(p_settings->v_key) is distinct from 'number'
      or (p_settings->>v_key) !~ '^[0-9]+$' then
      raise exception 'invalid Discovery numeric setting %', v_key using errcode = '22023', detail = 'invalid-request';
    end if;
    if (p_settings->>v_key)::numeric > 2147483583
      or ((p_settings->>v_key)::numeric = 0 and v_key <> 'counted_input_tokens') then
      raise exception 'invalid Discovery numeric setting %', v_key using errcode = '22023', detail = 'invalid-request';
    end if;
  end loop;
  v_min_output := (p_settings->>'min_output_tokens')::integer;
  if v_min_output > (p_settings->>'max_output_tokens')::integer
    or p_message is null or btrim(p_message) = '' or length(btrim(p_message)) > (p_settings->>'message_max_chars')::integer
    or p_counted_through_seq is null or p_counted_through_seq < 0 then
    raise exception 'invalid Discovery message or settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_project from public.projects where id = p_project_id and org_id = p_organization_id for update;
  if not found then
    raise exception 'no such project in this organisation' using errcode = '23503', detail = 'no-such-project';
  end if;
  select * into v_need from public.need_intakes where project_id = p_project_id;
  if not found or v_need.stage <> 'discovery_in_progress' then
    raise exception 'the need is not in Discovery' using errcode = 'P0001', detail = 'need-not-in-discovery';
  end if;
  select * into v_open from public.discovery_turns where project_id = p_project_id and status = 'open' for update;
  if found then
    if v_open.opened_at > clock_timestamp() - make_interval(secs => (p_settings->>'turn_deadline_seconds')::integer) then
      raise exception 'a Discovery turn is in flight' using errcode = 'P0001', detail = 'turn-in-flight';
    end if;
    if v_open.user_message_id is not null then
      update public.discovery_turns set status = 'abandoned', charged_credits = 0,
        settled_at = clock_timestamp() where id = v_open.id;
      if v_open.reserved_credits > 0 then
        perform public.discovery_spend_release(v_open.org_id, v_open.utc_day, v_open.reserved_credits);
      end if;
    else
      update public.discovery_turns set status = 'abandoned', charged_credits = reserved_credits,
        settled_at = clock_timestamp() where id = v_open.id;
    end if;
  end if;
  if p_counted_through_seq <> (select coalesce(max(seq), 0) from public.discovery_turns
    where project_id = p_project_id and status = 'settled') then
    raise exception 'the conversation changed after token counting' using errcode = 'P0001', detail = 'stale-context';
  end if;
  v_billing := case
    when v_project.funded_at is not null then 'fuel'::public.discovery_billing
    when exists (
      select 1 from public.discovery_turns t
       where t.project_id = p_project_id
         and t.status in ('failed', 'abandoned')
         and t.user_message = btrim(p_message)
         and t.seq = (select max(seq) from public.discovery_turns where project_id = p_project_id)
    ) then 'retry'::public.discovery_billing
    else 'free'::public.discovery_billing
  end;
  v_est_input := (p_settings->>'counted_input_tokens')::integer + 64;
  v_ratio := (p_settings->>'micros_per_credit')::integer;
  v_in_price := (p_settings->>'input_micros_per_token')::integer;
  v_out_price := (p_settings->>'output_micros_per_token')::integer;
  if v_billing = 'fuel' then
    v_fuel := public.project_fuel_available_micros(p_project_id);
    v_max_output := least((p_settings->>'max_output_tokens')::integer,
      floor((v_fuel - v_est_input::bigint * v_in_price)::numeric / v_out_price));
    if v_max_output < v_min_output then
      raise exception 'this funded project has no fuel left for this Discovery turn; top up project fuel to continue; free credits are never spent on a funded project'
        using errcode = 'P0001', detail = 'fuel-exhausted';
    end if;
    v_reserved_micros := v_est_input::bigint * v_in_price + v_max_output::bigint * v_out_price;
    v_reserved_credits := 0;
    v_utc_day := (clock_timestamp() at time zone 'utc')::date;
  else
    v_read := public.discovery_allowance(p_account_id, p_organization_id, 'read', null);
    v_max_output := least((p_settings->>'max_output_tokens')::integer,
      floor(((v_read->>'remaining')::bigint * v_ratio - v_est_input::bigint * v_in_price)::numeric / v_out_price));
    if v_max_output < v_min_output then
      v_max_output := v_min_output;
    end if;
    v_reserved_micros := v_est_input::bigint * v_in_price + v_max_output::bigint * v_out_price;
    if v_billing = 'retry' then
      v_reserved_credits := 0;
      v_utc_day := (v_read->>'utc_day')::date;
    else
      v_reserved_credits := ceil(v_reserved_micros::numeric / v_ratio);
      v_debit := public.discovery_allowance(p_account_id, p_organization_id, 'debit', v_reserved_credits);
      v_utc_day := (v_debit->>'utc_day')::date;
    end if;
  end if;
  select coalesce(max(seq), 0) + 1 into v_seq from public.discovery_turns where project_id = p_project_id;
  insert into public.discovery_turns (
    project_id, org_id, seq, billing, utc_day, user_message, request_settings,
    max_output_tokens, estimated_input_tokens, micros_per_credit, input_micros_per_token,
    output_micros_per_token, reserved_micros, reserved_credits, opened_at
  ) values (
    p_project_id, p_organization_id, v_seq, v_billing, v_utc_day, btrim(p_message),
    jsonb_build_object(
      'model', p_settings->>'model', 'max_tokens', v_max_output, 'effort', p_settings->>'effort',
      'guardrails', jsonb_build_object(
        'active', v_billing <> 'fuel',
        'off_topic_flag_strikes', (p_settings->>'off_topic_flag_strikes')::integer
      )
    ),
    v_max_output, v_est_input, v_ratio, v_in_price, v_out_price, v_reserved_micros, v_reserved_credits, clock_timestamp()
  ) returning * into v_turn;
  select coalesce(jsonb_agg(m.message order by t.seq, m.position), '[]'::jsonb) into v_context
    from public.discovery_turns t cross join lateral (values
      (1, jsonb_build_object('role', 'user', 'content', t.user_message)),
      (2, jsonb_build_object('role', 'assistant', 'content', t.assistant_message))
    ) as m(position, message) where t.project_id = p_project_id and t.status = 'settled';
  return jsonb_build_object('turn', to_jsonb(v_turn), 'need', jsonb_build_object(
    'title', v_project.name, 'description', v_need.description, 'urgency', v_need.urgency,
    'reference_files', (select coalesce(jsonb_agg(f->>'file_name'), '[]'::jsonb) from jsonb_array_elements(v_need.reference_files) f)),
    'context', v_context || jsonb_build_array(jsonb_build_object('role', 'user', 'content', btrim(p_message))), 'allowance', v_debit);
end;
$$;
revoke execute on function public.discovery_turn_reserve(uuid, uuid, uuid, text, jsonb, integer) from public, anon, authenticated, service_role;
grant execute on function public.discovery_turn_reserve(uuid, uuid, uuid, text, jsonb, integer) to service_role;

create or replace function public.discovery_turn_settle(
  p_account_id uuid, p_turn_id uuid, p_outcome text, p_assistant_message text,
  p_input_tokens integer, p_output_tokens integer, p_stop_reason text, p_served_model text, p_elicitation jsonb,
  p_off_topic boolean, p_notice jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_turn public.discovery_turns;
  v_role public.org_role;
  v_actual bigint;
  v_charged integer;
  v_off_topic_count integer;
  v_admin record;
  v_channels jsonb;
  v_authorized jsonb;
  v_channel text;
  v_deliveries jsonb;
  v_recipients jsonb;
  v_subject text;
  v_body text;
  v_payload jsonb;
begin
  perform public.assert_account_active(p_account_id);
  select * into v_turn from public.discovery_turns where id = p_turn_id;
  if not found then
    raise exception 'no open Discovery turn' using errcode = 'P0001', detail = 'turn-not-open';
  end if;
  if v_turn.user_message_id is not null then
    return public.discovery_reply_settle(p_account_id, p_turn_id, p_outcome, p_assistant_message, p_input_tokens, p_output_tokens, p_stop_reason, p_served_model, p_elicitation, p_off_topic, p_notice);
  end if;
  perform 1 from public.organizations where id = v_turn.org_id for share;
  perform 1 from public.projects where id = v_turn.project_id for update;
  select * into v_turn from public.discovery_turns where id = p_turn_id for update;
  if v_turn.status <> 'open' then
    raise exception 'the Discovery turn is not open' using errcode = 'P0001', detail = 'turn-not-open';
  end if;
  select role into v_role from public.org_memberships where org_id = v_turn.org_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'the caller holds no membership in this organisation' using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'only the organisation admin may settle a Discovery turn' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if p_outcome = 'completed' then
    if p_input_tokens is null or p_input_tokens < 0 or p_output_tokens is null or p_output_tokens < 0
      or p_output_tokens > v_turn.max_output_tokens or p_assistant_message is null then
      raise exception 'invalid Discovery usage' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_actual := p_input_tokens::bigint * v_turn.input_micros_per_token + p_output_tokens::bigint * v_turn.output_micros_per_token;
    if v_turn.billing = 'retry' then
      v_charged := 0;
    else
      v_charged := least(v_turn.reserved_credits, ceil(v_actual::numeric / v_turn.micros_per_credit));
    end if;
    update public.discovery_turns set status = 'settled', assistant_message = p_assistant_message,
      elicitation = p_elicitation, input_tokens = p_input_tokens, output_tokens = p_output_tokens,
      stop_reason = p_stop_reason, served_model = p_served_model, actual_micros = v_actual,
      charged_credits = v_charged, overrun_micros = greatest(0, v_actual - reserved_micros), settled_at = clock_timestamp(),
      off_topic = coalesce(p_off_topic, false)
      where id = p_turn_id returning * into v_turn;
  elsif p_outcome = 'failed' then
    v_charged := 0;
    update public.discovery_turns set status = 'failed', charged_credits = 0, settled_at = clock_timestamp()
      where id = p_turn_id returning * into v_turn;
  else
    raise exception 'invalid Discovery outcome' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_turn.reserved_credits > v_charged then
    perform public.discovery_spend_release(v_turn.org_id, v_turn.utc_day, v_turn.reserved_credits - v_charged);
  end if;
  select count(*)::integer into v_off_topic_count
    from public.discovery_turns
   where project_id = v_turn.project_id and off_topic;
  if p_outcome = 'completed'
     and coalesce(p_off_topic, false)
     and v_turn.request_settings->'guardrails'->>'active' = 'true'
     and v_off_topic_count = (v_turn.request_settings->'guardrails'->>'off_topic_flag_strikes')::integer then
    if p_notice is null or jsonb_typeof(p_notice) is distinct from 'object' then
      raise exception 'invalid Discovery notice' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_subject := p_notice->'copy'->>'subject';
    v_body := p_notice->'copy'->>'body';
    if v_subject is null or v_body is null then
      raise exception 'invalid Discovery notice' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_authorized := '["email", "inapp"]'::jsonb;
    v_channels := p_notice->'channels';
    if jsonb_typeof(v_channels) is distinct from 'array' or jsonb_array_length(v_channels) = 0 then
      raise exception 'invalid Discovery notice' using errcode = '22023', detail = 'invalid-request';
    end if;
    if exists (
          select 1 from jsonb_array_elements_text(v_channels) as supplied(channel)
          where supplied.channel not in ('email', 'inapp')
        )
        or exists (
          select 1 from jsonb_array_elements_text(v_authorized) as authorised(channel)
          where not exists (
            select 1 from jsonb_array_elements_text(v_channels) as supplied(channel)
            where supplied.channel = authorised.channel
          )
        ) then
      raise exception 'invalid Discovery notice' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_channels := v_authorized;
    v_payload := jsonb_build_object(
      'projectId', v_turn.project_id,
      'organizationId', v_turn.org_id,
      'strikes', (v_turn.request_settings->'guardrails'->>'off_topic_flag_strikes')::integer
    );
    v_deliveries := '[]'::jsonb;
    v_recipients := '[]'::jsonb;
    for v_admin in
      select a.id, u.email
        from public.accounts a
        join auth.users u on u.id = a.id
       where a.account_type = 'platform_admin'
         and a.lifecycle = 'active'
         and u.email is not null and btrim(u.email) <> ''
    loop
      v_recipients := v_recipients || jsonb_build_object(
        'role', 'platform_admin',
        'recipientId', v_admin.id,
        'address', v_admin.email,
        'channels', v_channels
      );
      for v_channel in select jsonb_array_elements_text(v_channels) loop
        v_deliveries := v_deliveries || jsonb_build_object(
          'role', 'platform_admin',
          'recipientId', v_admin.id,
          'address', v_admin.email,
          'channel', v_channel,
          'emittedBy', 'notifications.emitter',
          'payload', v_payload,
          'subject', v_subject,
          'body', v_body
        );
      end loop;
    end loop;
    if jsonb_array_length(v_recipients) > 0 then
      perform public.emit_notification(jsonb_build_object(
        'event', jsonb_build_object(
          'event', 'discovery.off_topic_flagged',
          'actor', p_account_id,
          'payload', v_payload,
          'recipients', v_recipients
        ),
        'deliveries', v_deliveries,
        'opsItem', null
      ));
    end if;
  end if;
  return jsonb_build_object(
    'turn', to_jsonb(v_turn),
    'allowance', public.discovery_allowance(p_account_id, v_turn.org_id, 'read', null),
    'off_topic_count', v_off_topic_count
  );
end;
$$;
revoke execute on function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, boolean, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, boolean, jsonb)
  to service_role;


notify pgrst, 'reload schema';
