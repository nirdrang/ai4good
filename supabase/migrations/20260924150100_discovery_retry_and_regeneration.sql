alter table public.discovery_turns add constraint discovery_turns_retry_touches_no_credits
  check (billing <> 'retry' or (reserved_credits = 0 and coalesce(charged_credits, 0) = 0));

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
    update public.discovery_turns set status = 'abandoned', charged_credits = reserved_credits,
      settled_at = clock_timestamp() where id = v_open.id;
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
         and t.status = 'failed'
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
    -- the Stripe run adds perform public.project_fuel_reserve(p_project_id, v_reserved_micros, v_turn_id) here
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
  -- the count equals the pin only on the turn that reaches it, so the flag is emitted once
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

create or replace function public.discovery_scope_begin(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_action text, p_reason text, p_label text, p_settings jsonb, p_notice jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.org_role;
  v_project public.projects;
  v_need public.need_intakes;
  v_scope public.discovery_scopes;
  v_current public.discovery_scopes;
  v_elicitation jsonb;
  v_context jsonb;
  v_mission text;
  v_disabled_at timestamptz;
  v_disabled_reason text;
  v_key text;
  v_label text;
  v_scopes jsonb;
  v_scope_json jsonb;
  v_reason text;
  v_used integer;
  v_next integer;
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
  select discovery_disabled_at, discovery_disabled_reason, mission
    into v_disabled_at, v_disabled_reason, v_mission
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
    raise exception 'only the organisation admin may write a Discovery scope' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if v_disabled_at is not null then
    raise exception 'a platform admin switched Discovery off for this organisation — %', v_disabled_reason
      using errcode = 'P0001', detail = 'discovery-disabled';
  end if;
  if jsonb_typeof(p_settings) is distinct from 'object' then
    raise exception 'invalid Discovery settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  foreach v_key in array array['turn_deadline_seconds', 'regeneration_bound'] loop
    if jsonb_typeof(p_settings->v_key) is distinct from 'number'
      or (p_settings->>v_key) !~ '^[0-9]+$' then
      raise exception 'invalid Discovery numeric setting %', v_key using errcode = '22023', detail = 'invalid-request';
    end if;
    if (p_settings->>v_key)::numeric > 2147483583
      or (p_settings->>v_key)::numeric = 0 then
      raise exception 'invalid Discovery numeric setting %', v_key using errcode = '22023', detail = 'invalid-request';
    end if;
  end loop;
  select * into v_project from public.projects where id = p_project_id and org_id = p_organization_id for update;
  if not found then
    raise exception 'no such project in this organisation' using errcode = '23503', detail = 'no-such-project';
  end if;
  select * into v_need from public.need_intakes where project_id = p_project_id;
  if not found or v_need.stage <> 'discovery_in_progress' then
    raise exception 'the need is not in Discovery' using errcode = 'P0001', detail = 'need-not-in-discovery';
  end if;
  if p_action = 'remove-label' then
    v_label := regexp_replace(lower(btrim(coalesce(p_label, ''))), '\s+', ' ', 'g');
    if v_label = '' then
      raise exception 'a Discovery scope write requires a label to remove'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    select * into v_need from public.need_intakes where project_id = p_project_id for update;
    select to_jsonb(s) into v_scope_json from public.discovery_scopes s
      where s.project_id = p_project_id and s.status = 'current';
    select coalesce(jsonb_agg(to_jsonb(s) order by s.version), '[]'::jsonb) into v_scopes
      from public.discovery_scopes s where s.project_id = p_project_id;
    if not (v_label = any (coalesce(v_need.cause_labels, '{}'::text[]))) then
      return jsonb_build_object(
        'done', true,
        'changed', false,
        'scope', v_scope_json,
        'scopes', v_scopes,
        'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name)
      );
    end if;
    update public.need_intakes
       set cause_labels = array_remove(cause_labels, v_label)
     where project_id = p_project_id
     returning * into v_need;
    return jsonb_build_object(
      'done', true,
      'changed', true,
      'scope', v_scope_json,
      'scopes', v_scopes,
      'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name)
    );
  end if;
  if p_action = 'regenerate' then
    select * into v_current from public.discovery_scopes
      where project_id = p_project_id and status = 'current' for update;
    if not found then
      raise exception 'a scope has not been generated for this project'
        using errcode = 'P0001', detail = 'scope-not-generated';
    end if;
    v_reason := btrim(coalesce(p_reason, ''));
    if v_reason = '' then
      raise exception 'a Discovery scope write requires a reason'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    select coalesce(jsonb_agg(to_jsonb(s) order by s.version), '[]'::jsonb) into v_scopes
      from public.discovery_scopes s where s.project_id = p_project_id;
    if exists (select 1 from public.discovery_scopes where project_id = p_project_id and status = 'escalated') then
      return jsonb_build_object(
        'done', true,
        'changed', false,
        'escalated', true,
        'scope', to_jsonb(v_current),
        'scopes', v_scopes,
        'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name)
      );
    end if;
    select count(*)::integer into v_used
      from public.discovery_scopes
     where project_id = p_project_id
       and version > 1
       and status not in ('failed', 'escalated');
    if v_used >= (p_settings->>'regeneration_bound')::integer then
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
      select coalesce(max(version), 0) + 1 into v_next from public.discovery_scopes where project_id = p_project_id;
      insert into public.discovery_scopes (
        project_id, org_id, version, status, reason, requested_by, elicitation, cause_labels, opened_at, settled_at
      ) values (
        p_project_id, p_organization_id, v_next, 'escalated', v_reason, p_account_id, v_current.elicitation, '{}',
        clock_timestamp(), clock_timestamp()
      );
      v_payload := jsonb_build_object(
        'projectId', p_project_id,
        'organizationId', p_organization_id,
        'regenerations', v_used,
        'lastReason', v_reason
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
            'event', 'discovery.regeneration_exhausted',
            'actor', p_account_id,
            'payload', v_payload,
            'recipients', v_recipients
          ),
          'deliveries', v_deliveries,
          'opsItem', null
        ));
      end if;
      select coalesce(jsonb_agg(to_jsonb(s) order by s.version), '[]'::jsonb) into v_scopes
        from public.discovery_scopes s where s.project_id = p_project_id;
      return jsonb_build_object(
        'done', true,
        'changed', true,
        'escalated', true,
        'scope', to_jsonb(v_current),
        'scopes', v_scopes,
        'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name)
      );
    end if;
    select * into v_scope from public.discovery_scopes
      where project_id = p_project_id and status = 'generating' for update;
    if found then
      if v_scope.opened_at > clock_timestamp() - make_interval(secs => (p_settings->>'turn_deadline_seconds')::integer) then
        raise exception 'a Discovery generation is in flight' using errcode = 'P0001', detail = 'generation-in-flight';
      end if;
      update public.discovery_scopes set status = 'failed', settled_at = clock_timestamp()
        where id = v_scope.id;
    end if;
    select coalesce(max(version), 0) + 1 into v_next from public.discovery_scopes where project_id = p_project_id;
    select coalesce(jsonb_agg(m.message order by t.seq, m.position), '[]'::jsonb) into v_context
      from public.discovery_turns t cross join lateral (values
        (1, jsonb_build_object('role', 'user', 'content', t.user_message)),
        (2, jsonb_build_object('role', 'assistant', 'content', t.assistant_message))
      ) as m(position, message) where t.project_id = p_project_id and t.status = 'settled';
    insert into public.discovery_scopes (
      project_id, org_id, version, status, reason, requested_by, elicitation, cause_labels, opened_at
    ) values (
      p_project_id, p_organization_id, v_next, 'generating', v_reason, p_account_id, v_current.elicitation, '{}',
      clock_timestamp()
    ) returning * into v_scope;
    return jsonb_build_object(
      'done', false,
      'scope', to_jsonb(v_scope),
      'elicitation', v_current.elicitation,
      'context', v_context,
      'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name),
      'mission', v_mission,
      'vocabulary', (select coalesce(jsonb_agg(c.label order by c.label), '[]'::jsonb) from public.cause_labels c)
    );
  end if;
  if p_action is distinct from 'generate' then
    raise exception 'a Discovery scope write requires the generate, regenerate or remove-label action'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  select t.elicitation into v_elicitation
    from public.discovery_turns t
   where t.project_id = p_project_id and t.elicitation is not null
   order by t.seq desc
   limit 1;
  if v_elicitation is null or (v_elicitation->>'complete') is distinct from 'true' then
    raise exception 'the elicitation is not complete' using errcode = 'P0001', detail = 'elicitation-incomplete';
  end if;
  select * into v_scope from public.discovery_scopes
    where project_id = p_project_id and status = 'generating' for update;
  if found then
    if v_scope.opened_at > clock_timestamp() - make_interval(secs => (p_settings->>'turn_deadline_seconds')::integer) then
      raise exception 'a Discovery generation is in flight' using errcode = 'P0001', detail = 'generation-in-flight';
    end if;
    update public.discovery_scopes set status = 'failed', settled_at = clock_timestamp()
      where id = v_scope.id;
  end if;
  if exists (
    select 1 from public.discovery_scopes
     where project_id = p_project_id and status in ('current', 'superseded')
  ) then
    raise exception 'a scope has already been generated for this project'
      using errcode = 'P0001', detail = 'scope-already-generated';
  end if;
  select coalesce(jsonb_agg(m.message order by t.seq, m.position), '[]'::jsonb) into v_context
    from public.discovery_turns t cross join lateral (values
      (1, jsonb_build_object('role', 'user', 'content', t.user_message)),
      (2, jsonb_build_object('role', 'assistant', 'content', t.assistant_message))
    ) as m(position, message) where t.project_id = p_project_id and t.status = 'settled';
  -- a failed version still occupies (project_id, version); later versions require a reason, so generate reopens the latest failed row
  select * into v_scope from public.discovery_scopes
   where project_id = p_project_id and status = 'failed'
   order by version desc
   limit 1
   for update;
  if found then
    update public.discovery_scopes set
      status = 'generating', contract = null, markdown = null, served_model = null,
      input_tokens = null, output_tokens = null, settled_at = null,
      elicitation = v_elicitation, requested_by = p_account_id,
      opened_at = clock_timestamp(), cause_labels = '{}'
     where id = v_scope.id
     returning * into v_scope;
  else
    insert into public.discovery_scopes (
      project_id, org_id, version, status, reason, requested_by, elicitation, cause_labels, opened_at
    ) values (
      p_project_id, p_organization_id, 1, 'generating', null, p_account_id, v_elicitation, '{}', clock_timestamp()
    ) returning * into v_scope;
  end if;
  return jsonb_build_object(
    'done', false,
    'scope', to_jsonb(v_scope),
    'elicitation', v_elicitation,
    'context', v_context,
    'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name),
    'mission', v_mission,
    'vocabulary', (select coalesce(jsonb_agg(c.label order by c.label), '[]'::jsonb) from public.cause_labels c)
  );
end;
$$;

revoke execute on function public.discovery_scope_begin(uuid, uuid, uuid, text, text, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_scope_begin(uuid, uuid, uuid, text, text, text, jsonb, jsonb)
  to service_role;

insert into public.notification_event_types (event) values ('discovery.regeneration_exhausted') on conflict do nothing;

notify pgrst, 'reload schema';
