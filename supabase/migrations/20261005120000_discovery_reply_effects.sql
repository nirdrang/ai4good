drop function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, boolean, jsonb);

create function public.discovery_reply_effects(
  p_turn public.discovery_turns, p_account_id uuid, p_document jsonb, p_decline jsonb
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_document->'dataTier'->>'tier' = '2' then
    update public.need_intakes set tier2_classified_at = coalesce(tier2_classified_at, clock_timestamp())
     where project_id = p_turn.project_id;
  end if;
end;
$$;

create function public.discovery_turn_settle(
  p_account_id uuid, p_turn_id uuid, p_outcome text, p_assistant_message text,
  p_input_tokens integer, p_output_tokens integer, p_stop_reason text, p_served_model text, p_elicitation jsonb,
  p_off_topic boolean, p_notice jsonb, p_decline jsonb default null
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
      'turn', to_jsonb(v_turn), 'allowance', public.discovery_allowance(p_account_id, v_turn.org_id, 'read', null), 'off_topic_count', 0,
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
    overrun_micros = greatest(0, v_actual - reserved_micros), settled_at = clock_timestamp(), off_topic = p_off_topic and v_turn.billing = 'free'
    where id = p_turn_id returning * into v_turn;
  if v_turn.reserved_credits > v_charged then
    perform public.discovery_spend_release(v_turn.org_id, v_turn.utc_day, v_turn.reserved_credits - v_charged);
  end if;
  perform public.discovery_reply_effects(v_turn, p_account_id, v_document, p_decline);
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
    'off_topic_count', v_off_topic_count,
    'usage', public.discovery_usage(p_account_id, v_turn.org_id, v_turn.project_id)
  );
end;
$$;

revoke execute on function public.discovery_reply_effects(public.discovery_turns, uuid, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, boolean, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, boolean, jsonb, jsonb) to service_role;
