create or replace function public.discovery_allowance(
  p_account_id uuid,
  p_organization_id uuid,
  p_action text,
  p_credits integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.org_role;
  v_utc_day date;
  v_vetted boolean;
  v_spent integer;
  v_granted integer;
  v_remaining integer;
  v_confirmed timestamptz;
begin
  perform public.assert_account_active(p_account_id);

  -- A share lock is enough: this function does not write the organisation row. Writers of
  -- vetting take FOR UPDATE on the same row and wait. The debit path serialises on the spend row.
  perform 1 from public.organizations where id = p_organization_id for share;
  if not found then
    raise exception 'discovery_allowance refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  select role into v_role
    from public.org_memberships
   where org_id = p_organization_id
     and account_id = p_account_id
     for share;
  if v_role is null then
    raise exception
      'discovery_allowance refuses %: the caller holds no membership in organisation % — membership is held per organisation',
      p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception
      'discovery_allowance refuses %: the caller holds the % role in organisation % — the admin role is held per organisation',
      p_account_id, v_role, p_organization_id
      using errcode = '42501', detail = 'not-an-admin';
  end if;

  -- C1: take the UTC day after the organisation row is locked, never from now() and never from
  -- transaction start. A transaction that began before midnight can take its lock after midnight;
  -- now() would then charge the spend to the previous day.
  v_utc_day := (clock_timestamp() at time zone 'utc')::date;

  select vetted into v_vetted from public.org_vetting where org_id = p_organization_id;
  if not found then
    v_vetted := false;
  end if;

  if p_action is distinct from 'read' and p_action is distinct from 'debit' then
    raise exception 'discovery_allowance refuses an action that is not read or debit'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  if p_action = 'read' then
    if p_credits is not null then
      raise exception 'discovery_allowance refuses a read that carries a credit amount'
        using errcode = '22023', detail = 'invalid-request';
    end if;

    select spent, granted into v_spent, v_granted
      from public.discovery_spend
     where org_id = p_organization_id
       and utc_day = v_utc_day;

    if not found then
      v_spent := 0;
      v_granted := public.discovery_daily_grant(v_vetted);
    else
      v_granted := greatest(v_granted, public.discovery_daily_grant(v_vetted));
    end if;

    return jsonb_build_object(
      'organization_id', p_organization_id,
      'utc_day', to_char(v_utc_day, 'YYYY-MM-DD'),
      'vetted', v_vetted,
      'daily_grant', v_granted,
      'spent_today', v_spent,
      'remaining', v_granted - v_spent
    );
  end if;

  select email_confirmed_at into v_confirmed from auth.users where id = p_account_id;
  if v_confirmed is null then
    raise exception 'discovery_allowance refuses %: the caller''s email address is not verified', p_account_id
      using errcode = '42501', detail = 'email-unverified';
  end if;

  if p_credits is null or p_credits <= 0 then
    raise exception 'discovery_allowance refuses a debit that is not a positive whole number of credits'
      using errcode = '22023', detail = 'invalid-credit-amount';
  end if;

  perform public.apply_discovery_grant_mark(p_organization_id, v_utc_day, v_vetted);

  select spent, granted into v_spent, v_granted
    from public.discovery_spend
   where org_id = p_organization_id
     and utc_day = v_utc_day
     for update;

  -- Compare the debit against what remains. Adding spent + credits overflows a 32-bit integer
  -- (a debit of 2147483647 after one credit is spent raises "integer out of range").
  v_remaining := v_granted - v_spent;

  if v_remaining <= 0 then
    raise exception
      'discovery_allowance refuses: organisation % has no Discovery credits left today — fund project fuel to continue now, or wait for the next UTC day',
      p_organization_id
      using errcode = 'P0001', detail = 'daily-allowance-exhausted';
  end if;

  if p_credits > v_remaining then
    raise exception
      'discovery_allowance refuses: organisation % still has % Discovery credits remaining today — this debit is larger than what remains',
      p_organization_id,
      v_remaining
      using errcode = 'P0001', detail = 'debit-exceeds-remaining';
  end if;

  update public.discovery_spend
     set spent = spent + p_credits
   where org_id = p_organization_id
     and utc_day = v_utc_day
   returning spent, granted into v_spent, v_granted;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'utc_day', to_char(v_utc_day, 'YYYY-MM-DD'),
    'vetted', v_vetted,
    'daily_grant', v_granted,
    'spent_today', v_spent,
    'remaining', v_granted - v_spent
  );
end;
$$;

revoke execute on function public.discovery_allowance(uuid, uuid, text, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.discovery_allowance(uuid, uuid, text, integer)
  to service_role;

create or replace function public.discovery_turn_reserve(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid, p_message text,
  p_settings jsonb
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
    or p_settings->>'mode' is null or p_settings->>'mode' not in ('answer', 'opening')
    or p_settings->>'user_message_id' is null
    or length(p_settings->>'user_message_id') < 1 or length(p_settings->>'user_message_id') > 200
    or p_settings->>'assistant_message_id' is null
    or p_settings->>'assistant_message_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_settings->'answers') is distinct from 'array'
    or jsonb_typeof(p_settings->'model') is distinct from 'string' or btrim(p_settings->>'model') = ''
    or jsonb_typeof(p_settings->'effort') is distinct from 'string' or btrim(p_settings->>'effort') = '' then
    raise exception 'invalid Discovery settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_settings->>'mode' = 'answer' and (p_settings->>'expected_charge' is null or p_settings->>'expected_charge' not in ('free', 'paid')) then
    raise exception 'invalid Discovery settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  foreach v_key in array array['max_output_tokens', 'message_max_chars', 'turn_deadline_seconds', 'off_topic_flag_strikes'] loop
    if jsonb_typeof(p_settings->v_key) is distinct from 'number'
      or (p_settings->>v_key) !~ '^[0-9]+$' then
      raise exception 'invalid Discovery numeric setting %', v_key using errcode = '22023', detail = 'invalid-request';
    end if;
    if (p_settings->>v_key)::numeric > 2147483583
      or (p_settings->>v_key)::numeric = 0 then
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
      update public.discovery_turns set status = 'abandoned', charged_credits = 0, settled_at = clock_timestamp()
        where id = v_open.id;
      if v_open.reserved_credits > 0 then
        perform public.discovery_spend_release(v_open.org_id, v_open.utc_day, v_open.reserved_credits);
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
      raise exception 'discovery_allowance refuses: organisation % has no Discovery credits left today — fund project fuel to continue now, or wait for the next UTC day', p_organization_id
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
  v_reserved_micros := 0;
  select coalesce(max(seq), 0) + 1 into v_seq from public.discovery_turns where project_id = p_project_id;
  insert into public.discovery_turns (
    project_id, org_id, seq, billing, utc_day, user_message, request_settings,
    max_output_tokens, reserved_micros, reserved_credits, opened_at,
    user_message_id, answers, base_revision
  ) values (
    p_project_id, p_organization_id, v_seq, v_billing, v_utc_day, coalesce(btrim(p_message), ''),
    jsonb_build_object(
      'model', p_settings->>'model', 'max_tokens', v_max_output, 'effort', p_settings->>'effort',
      'assistant_message_id', p_settings->>'assistant_message_id',
      'guardrails', jsonb_build_object(
        'active', v_billing = 'free',
        'off_topic_flag_strikes', (p_settings->>'off_topic_flag_strikes')::integer
      )
    ),
    v_max_output, v_reserved_micros, v_reserved_credits, clock_timestamp(),
    p_settings->>'user_message_id', p_settings->'answers', v_revision::integer
  ) returning * into v_turn;
  v_usage := public.discovery_usage(p_account_id, p_organization_id, p_project_id);
  return public.discovery_reply_payload(v_turn, v_project, v_need, null, v_usage);
end;
$$;

revoke execute on function public.discovery_turn_reserve(uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_turn_reserve(uuid, uuid, uuid, text, jsonb) to service_role;

notify pgrst, 'reload schema';
