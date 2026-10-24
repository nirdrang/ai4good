create function public.discovery_decline_channels(p_notice jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_authorized constant jsonb := '["email", "inapp"]'::jsonb;
  v_channels jsonb := p_notice->'channels';
begin
  if jsonb_typeof(p_notice) is distinct from 'object'
     or p_notice->'copy'->>'subject' is null or p_notice->'copy'->>'body' is null
     or jsonb_typeof(p_notice->'payload') is distinct from 'object'
     or jsonb_typeof(v_channels) is distinct from 'array'
     or exists (
          select 1 from jsonb_array_elements_text(v_channels) as supplied(channel)
          where not v_authorized ? supplied.channel
        )
     or exists (
          select 1 from jsonb_array_elements_text(v_authorized) as authorised(channel)
          where not v_channels ? authorised.channel
        ) then
    raise exception 'invalid Discovery decline notice' using errcode = '22023', detail = 'invalid-request';
  end if;
  return v_authorized;
end;
$$;

revoke execute on function public.discovery_decline_channels(jsonb) from public, anon, authenticated, service_role;

create or replace function public.discovery_reply_effects(
  p_turn public.discovery_turns, p_account_id uuid, p_document jsonb, p_decline jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_channels jsonb;
  v_email text;
  v_admin record;
  v_recipients jsonb;
  v_deliveries jsonb;
  v_channel text;
  v_conversation jsonb;
begin
  if p_document->'dataTier'->>'tier' = '2' then
    update public.need_intakes set tier2_classified_at = coalesce(tier2_classified_at, clock_timestamp())
     where project_id = p_turn.project_id;
  end if;
  if p_decline is null then
    return;
  end if;
  if jsonb_typeof(p_decline) is distinct from 'object'
     or p_decline->>'cause' is null or p_decline->>'reason' is null or p_decline->>'reshaping' is null then
    raise exception 'invalid Discovery decline' using errcode = '22023', detail = 'invalid-request';
  end if;
  insert into public.discovery_declines (project_id, org_id, turn_id, cause, reason, reshaping)
  values (p_turn.project_id, p_turn.org_id, p_turn.id, p_decline->>'cause', p_decline->>'reason', p_decline->>'reshaping')
  on conflict (project_id) do nothing;
  if not found then
    return;
  end if;

  v_channels := public.discovery_decline_channels(p_decline->'ngo');
  select email into v_email from auth.users where id = p_account_id;
  v_deliveries := '[]'::jsonb;
  for v_channel in select jsonb_array_elements_text(v_channels) loop
    v_deliveries := v_deliveries || jsonb_build_object(
      'role', 'ngo', 'recipientId', p_account_id, 'address', v_email, 'channel', v_channel,
      'emittedBy', 'notifications.emitter', 'payload', p_decline->'ngo'->'payload',
      'subject', p_decline->'ngo'->'copy'->>'subject', 'body', p_decline->'ngo'->'copy'->>'body'
    );
  end loop;
  perform public.emit_notification(jsonb_build_object(
    'event', jsonb_build_object(
      'event', 'discovery.fit_declined',
      'actor', p_account_id,
      'payload', p_decline->'ngo'->'payload',
      'recipients', jsonb_build_array(jsonb_build_object(
        'role', 'ngo', 'recipientId', p_account_id, 'address', v_email, 'channels', v_channels
      ))
    ),
    'deliveries', v_deliveries,
    'opsItem', null
  ));

  v_channels := public.discovery_decline_channels(p_decline->'review');
  v_recipients := '[]'::jsonb;
  v_deliveries := '[]'::jsonb;
  for v_admin in
    select a.id, u.email
      from public.accounts a
      join auth.users u on u.id = a.id
     where a.account_type = 'platform_admin'
       and a.lifecycle = 'active'
       and u.email is not null and btrim(u.email) <> ''
  loop
    v_recipients := v_recipients || jsonb_build_object(
      'role', 'platform_admin', 'recipientId', v_admin.id, 'address', v_admin.email, 'channels', v_channels
    );
    for v_channel in select jsonb_array_elements_text(v_channels) loop
      v_deliveries := v_deliveries || jsonb_build_object(
        'role', 'platform_admin', 'recipientId', v_admin.id, 'address', v_admin.email, 'channel', v_channel,
        'emittedBy', 'notifications.emitter', 'payload', p_decline->'review'->'payload',
        'subject', p_decline->'review'->'copy'->>'subject', 'body', p_decline->'review'->'copy'->>'body'
      );
    end loop;
  end loop;
  if jsonb_array_length(v_recipients) = 0 then
    return;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('seq', t.seq, 'user', t.user_message, 'assistant', t.assistant_message) order by t.seq), '[]'::jsonb)
    into v_conversation
    from public.discovery_turns t
   where t.project_id = p_turn.project_id and t.status = 'settled';
  perform public.emit_notification(jsonb_build_object(
    'event', jsonb_build_object(
      'event', 'discovery.fit_decline_review',
      'actor', p_account_id,
      'payload', p_decline->'review'->'payload',
      'recipients', v_recipients
    ),
    'deliveries', v_deliveries,
    'opsItem', jsonb_build_object(
      'kind', 'discovery.fit_decline_review',
      'detail', jsonb_build_object(
        'projectId', p_turn.project_id,
        'organizationId', p_turn.org_id,
        'cause', p_decline->>'cause',
        'reason', p_decline->>'reason',
        'reshaping', p_decline->>'reshaping',
        'conversation', v_conversation
      )
    )
  ));
end;
$$;

revoke execute on function public.discovery_reply_effects(public.discovery_turns, uuid, jsonb, jsonb)
  from public, anon, authenticated, service_role;
