create type public.discovery_turn_status as enum ('open', 'settled', 'failed', 'abandoned');
create type public.discovery_billing as enum ('free', 'fuel');

create table public.discovery_turns (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid not null,
  org_id                   uuid not null,
  seq                      integer not null,
  status                   public.discovery_turn_status not null default 'open',
  billing                  public.discovery_billing not null,
  utc_day                  date not null,
  user_message             text not null,
  assistant_message        text,
  elicitation              jsonb,
  request_settings         jsonb not null,
  max_output_tokens        integer not null,
  estimated_input_tokens   integer not null,
  micros_per_credit        integer not null,
  input_micros_per_token   integer not null,
  output_micros_per_token  integer not null,
  reserved_micros          bigint not null,
  reserved_credits         integer not null,
  input_tokens             integer,
  output_tokens            integer,
  stop_reason              text,
  served_model             text,
  actual_micros            bigint,
  charged_credits          integer,
  overrun_micros           bigint,
  opened_at                timestamptz not null,
  settled_at               timestamptz,
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  unique (project_id, seq),
  constraint discovery_turns_open_iff_unsettled check ((status = 'open') = (settled_at is null)),
  constraint discovery_turns_reservation_is_the_bound check (
    reserved_micros = estimated_input_tokens * input_micros_per_token + max_output_tokens * output_micros_per_token),
  constraint discovery_turns_free_reserved_at_ratio check (
    billing <> 'free' or reserved_credits = ceil(reserved_micros::numeric / micros_per_credit)),
  constraint discovery_turns_fuel_touches_no_credits check (
    billing <> 'fuel' or (reserved_credits = 0 and coalesce(charged_credits, 0) = 0)),
  constraint discovery_turns_open_has_no_outcome check (
    status <> 'open' or (assistant_message is null and charged_credits is null and actual_micros is null)),
  constraint discovery_turns_settled_is_measured check (
    status <> 'settled' or (
      input_tokens >= 0 and output_tokens >= 0 and output_tokens <= max_output_tokens and assistant_message is not null
      and actual_micros = input_tokens * input_micros_per_token + output_tokens * output_micros_per_token
      and overrun_micros = greatest(0, actual_micros - reserved_micros)
      and (billing <> 'free' or charged_credits = least(reserved_credits, ceil(actual_micros::numeric / micros_per_credit))))),
  constraint discovery_turns_failed_costs_nothing check (status <> 'failed' or charged_credits = 0),
  constraint discovery_turns_abandoned_keeps_reservation check (status <> 'abandoned' or charged_credits = reserved_credits)
);
create unique index discovery_turns_one_open_per_project on public.discovery_turns (project_id) where status = 'open';
create index discovery_turns_by_org_day on public.discovery_turns (org_id, utc_day);

revoke all on table public.discovery_turns from anon, authenticated, service_role;
alter table public.discovery_turns enable row level security;
grant select on public.discovery_turns to authenticated;
create policy discovery_turns_select_org_member on public.discovery_turns for select to authenticated
  using (public.viewer_is_org_member(org_id));
create policy discovery_turns_select_platform_admin on public.discovery_turns for select to authenticated
  using (public.viewer_is_platform_admin());

create function public.discovery_turn_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Discovery turns cannot be deleted' using errcode = '42501';
  end if;
  if old.status <> 'open' or new.status not in ('settled', 'failed', 'abandoned') then
    raise exception 'only an open Discovery turn can be settled' using errcode = '42501';
  end if;
  if (to_jsonb(new) - array['status', 'assistant_message', 'elicitation', 'input_tokens', 'output_tokens',
      'stop_reason', 'served_model', 'actual_micros', 'charged_credits', 'overrun_micros', 'settled_at'])
    is distinct from
     (to_jsonb(old) - array['status', 'assistant_message', 'elicitation', 'input_tokens', 'output_tokens',
      'stop_reason', 'served_model', 'actual_micros', 'charged_credits', 'overrun_micros', 'settled_at']) then
    raise exception 'the Discovery reservation is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.discovery_turn_immutable() from public, anon, authenticated, service_role;
create trigger discovery_turns_immutable before update or delete on public.discovery_turns
  for each row execute function public.discovery_turn_immutable();

create function public.discovery_spend_release(p_organization_id uuid, p_utc_day date, p_credits integer)
returns void language plpgsql set search_path = '' as $$
begin
  if p_credits is null or p_credits < 0 then
    raise exception 'invalid Discovery release' using errcode = '22023', detail = 'invalid-request';
  end if;
  update public.discovery_spend set spent = spent - p_credits
    where org_id = p_organization_id and utc_day = p_utc_day and spent >= p_credits;
  if not found then
    raise exception 'Discovery release exceeds the recorded spend' using errcode = 'P0001', detail = 'refused';
  end if;
end;
$$;
revoke execute on function public.discovery_spend_release(uuid, date, integer) from public, anon, authenticated, service_role;

create function public.discovery_turn_reserve(
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
begin
  perform public.assert_account_active(p_account_id);
  perform 1 from public.organizations where id = p_organization_id for share;
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
  v_est_input := (p_settings->>'counted_input_tokens')::integer + 64;
  v_ratio := (p_settings->>'micros_per_credit')::integer;
  v_in_price := (p_settings->>'input_micros_per_token')::integer;
  v_out_price := (p_settings->>'output_micros_per_token')::integer;
  v_read := public.discovery_allowance(p_account_id, p_organization_id, 'read', null);
  v_max_output := least((p_settings->>'max_output_tokens')::integer,
    floor(((v_read->>'remaining')::bigint * v_ratio - v_est_input::bigint * v_in_price)::numeric / v_out_price));
  if v_max_output < v_min_output then
    v_max_output := v_min_output;
  end if;
  v_reserved_micros := v_est_input::bigint * v_in_price + v_max_output::bigint * v_out_price;
  v_reserved_credits := ceil(v_reserved_micros::numeric / v_ratio);
  v_debit := public.discovery_allowance(p_account_id, p_organization_id, 'debit', v_reserved_credits);
  select coalesce(max(seq), 0) + 1 into v_seq from public.discovery_turns where project_id = p_project_id;
  insert into public.discovery_turns (
    project_id, org_id, seq, billing, utc_day, user_message, request_settings,
    max_output_tokens, estimated_input_tokens, micros_per_credit, input_micros_per_token,
    output_micros_per_token, reserved_micros, reserved_credits, opened_at
  ) values (
    p_project_id, p_organization_id, v_seq, 'free', (v_debit->>'utc_day')::date, btrim(p_message),
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

create function public.discovery_turn_settle(
  p_account_id uuid, p_turn_id uuid, p_outcome text, p_assistant_message text,
  p_input_tokens integer, p_output_tokens integer, p_stop_reason text, p_served_model text, p_elicitation jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_turn public.discovery_turns;
  v_role public.org_role;
  v_actual bigint;
  v_charged integer;
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
    v_charged := least(v_turn.reserved_credits, ceil(v_actual::numeric / v_turn.micros_per_credit));
    update public.discovery_turns set status = 'settled', assistant_message = p_assistant_message,
      elicitation = p_elicitation, input_tokens = p_input_tokens, output_tokens = p_output_tokens,
      stop_reason = p_stop_reason, served_model = p_served_model, actual_micros = v_actual,
      charged_credits = v_charged, overrun_micros = greatest(0, v_actual - reserved_micros), settled_at = clock_timestamp()
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
  return jsonb_build_object('turn', to_jsonb(v_turn), 'allowance', public.discovery_allowance(p_account_id, v_turn.org_id, 'read', null));
end;
$$;
revoke execute on function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb) to service_role;

notify pgrst, 'reload schema';
