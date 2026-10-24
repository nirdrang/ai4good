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
      'stop_reason', 'served_model', 'actual_micros', 'charged_credits', 'overrun_micros', 'settled_at'])
    is distinct from
     (to_jsonb(old) - array['status', 'assistant_message', 'assistant_ui', 'elicitation', 'input_tokens', 'output_tokens',
      'stop_reason', 'served_model', 'actual_micros', 'charged_credits', 'overrun_micros', 'settled_at']) then
    raise exception 'the Discovery reservation is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, boolean, jsonb, jsonb);

create function public.discovery_turn_settle(
  p_account_id uuid, p_turn_id uuid, p_outcome text, p_assistant_message text,
  p_input_tokens integer, p_output_tokens integer, p_stop_reason text, p_served_model text, p_elicitation jsonb,
  p_decline jsonb default null
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
  if v_turn.status <> 'open'  then
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
      'turn', to_jsonb(v_turn), 'allowance', public.discovery_allowance(p_account_id, v_turn.org_id, 'read', null),
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
  v_actual := 0;
  v_charged := case when v_turn.billing = 'free' then 1 else 0 end;
  update public.discovery_turns set status = 'settled', assistant_message = p_assistant_message, assistant_ui = v_ui, elicitation = p_elicitation->'source',
    input_tokens = p_input_tokens, output_tokens = p_output_tokens, stop_reason = p_stop_reason,
    served_model = p_served_model, actual_micros = v_actual, charged_credits = v_charged,
    overrun_micros = greatest(0, v_actual - reserved_micros), settled_at = clock_timestamp()
    where id = p_turn_id returning * into v_turn;
  if v_turn.reserved_credits > v_charged then
    perform public.discovery_spend_release(v_turn.org_id, v_turn.utc_day, v_turn.reserved_credits - v_charged);
  end if;
  perform public.discovery_reply_effects(v_turn, p_account_id, v_document, p_decline);
  return jsonb_build_object(
    'turn', to_jsonb(v_turn),
    'allowance', public.discovery_allowance(p_account_id, v_turn.org_id, 'read', null),
    'usage', public.discovery_usage(p_account_id, v_turn.org_id, v_turn.project_id)
  );
end;
$$;

revoke execute on function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, jsonb) to service_role;

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
  foreach v_key in array array['max_output_tokens', 'message_max_chars', 'turn_deadline_seconds'] loop
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
      'assistant_message_id', p_settings->>'assistant_message_id'
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

alter table public.discovery_turns drop column off_topic;

delete from public.notification_events where event = 'discovery.off_topic_flagged';
delete from public.notification_event_types where event = 'discovery.off_topic_flagged';

notify pgrst, 'reload schema';
