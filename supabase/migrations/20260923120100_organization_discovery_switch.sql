alter table public.organizations
  add column discovery_disabled_at timestamptz,
  add column discovery_disabled_by uuid references public.accounts (id) on delete restrict,
  add column discovery_disabled_reason text,
  add constraint organizations_discovery_switch_is_whole
    check ((discovery_disabled_at is null) = (discovery_disabled_by is null) and (discovery_disabled_at is null) = (discovery_disabled_reason is null));

create function public.set_organization_discovery(
  p_account_id uuid,
  p_organization_id uuid,
  p_enabled boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_type public.account_type;
  v_reason text;
  v_disabled_at timestamptz;
  v_previous timestamptz;
begin
  perform public.assert_account_active(p_account_id);

  select account_type into v_caller_type from public.accounts where id = p_account_id;
  if v_caller_type is null then
    raise exception 'set_organization_discovery refuses %: no account has completed signup for this user', p_account_id
      using errcode = '42501', detail = 'no-account';
  end if;
  if v_caller_type <> 'platform_admin' then
    raise exception 'set_organization_discovery refuses account type %: only a platform administrator records a Discovery switch', v_caller_type
      using errcode = '42501', detail = 'not-a-platform-admin';
  end if;

  v_reason := btrim(p_reason, E' \t\r\n\f' || chr(160));
  if v_reason is null or v_reason = '' then
    raise exception 'set_organization_discovery refuses a switch with no reason'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  select discovery_disabled_at into v_disabled_at
    from public.organizations
   where id = p_organization_id
     for update;
  if not found then
    raise exception 'set_organization_discovery refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  if p_enabled = (v_disabled_at is null) then
    return jsonb_build_object(
      'organization_id', p_organization_id,
      'discovery_enabled', p_enabled,
      'changed', false,
      'disabled_at', v_disabled_at
    );
  end if;

  v_previous := v_disabled_at;
  if p_enabled then
    update public.organizations
       set discovery_disabled_at = null,
           discovery_disabled_by = null,
           discovery_disabled_reason = null
     where id = p_organization_id
     returning discovery_disabled_at into v_disabled_at;
  else
    update public.organizations
       set discovery_disabled_at = clock_timestamp(),
           discovery_disabled_by = p_account_id,
           discovery_disabled_reason = v_reason
     where id = p_organization_id
     returning discovery_disabled_at into v_disabled_at;
  end if;

  perform public.append_audit_event(
    'org_discovery_switched',
    p_account_id,
    null,
    p_organization_id,
    v_reason,
    jsonb_build_object('enabled', p_enabled, 'previously_disabled_at', v_previous)
  );

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'discovery_enabled', p_enabled,
    'changed', true,
    'disabled_at', v_disabled_at
  );
end;
$$;

revoke execute on function public.set_organization_discovery(uuid, uuid, boolean, text)
  from public, anon, authenticated, service_role;

grant execute on function public.set_organization_discovery(uuid, uuid, boolean, text)
  to service_role;

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
    'micros_per_credit', 'input_micros_per_token', 'output_micros_per_token', 'turn_deadline_seconds', 'counted_input_tokens'] loop
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
  v_billing := case when v_project.funded_at is null then 'free' else 'fuel' end;
  v_est_input := (p_settings->>'counted_input_tokens')::integer + 64;
  v_ratio := (p_settings->>'micros_per_credit')::integer;
  v_in_price := (p_settings->>'input_micros_per_token')::integer;
  v_out_price := (p_settings->>'output_micros_per_token')::integer;
  if v_billing = 'free' then
    v_read := public.discovery_allowance(p_account_id, p_organization_id, 'read', null);
    v_max_output := least((p_settings->>'max_output_tokens')::integer,
      floor(((v_read->>'remaining')::bigint * v_ratio - v_est_input::bigint * v_in_price)::numeric / v_out_price));
    if v_max_output < v_min_output then
      v_max_output := v_min_output;
    end if;
    v_reserved_micros := v_est_input::bigint * v_in_price + v_max_output::bigint * v_out_price;
    v_reserved_credits := ceil(v_reserved_micros::numeric / v_ratio);
    v_debit := public.discovery_allowance(p_account_id, p_organization_id, 'debit', v_reserved_credits);
    v_utc_day := (v_debit->>'utc_day')::date;
  else
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
  end if;
  select coalesce(max(seq), 0) + 1 into v_seq from public.discovery_turns where project_id = p_project_id;
  insert into public.discovery_turns (
    project_id, org_id, seq, billing, utc_day, user_message, request_settings,
    max_output_tokens, estimated_input_tokens, micros_per_credit, input_micros_per_token,
    output_micros_per_token, reserved_micros, reserved_credits, opened_at
  ) values (
    p_project_id, p_organization_id, v_seq, v_billing, v_utc_day, btrim(p_message),
    jsonb_build_object('model', p_settings->>'model', 'max_tokens', v_max_output, 'effort', p_settings->>'effort'),
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

notify pgrst, 'reload schema';
