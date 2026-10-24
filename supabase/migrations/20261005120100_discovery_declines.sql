create table public.discovery_declines (
  project_id uuid primary key references public.projects (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  turn_id uuid not null references public.discovery_turns (id),
  cause text not null check (cause in ('developer-maintenance', 'confidential-codebase')),
  reason text not null,
  reshaping text not null check (length(btrim(reshaping)) > 0),
  declined_at timestamptz not null default clock_timestamp()
);

revoke all on table public.discovery_declines from anon, authenticated, service_role;
alter table public.discovery_declines enable row level security;
grant select on public.discovery_declines to authenticated;

create policy discovery_declines_select_org_member on public.discovery_declines for select to authenticated
  using ((select public.viewer_is_org_member(org_id)));
create policy discovery_declines_select_platform_admin on public.discovery_declines for select to authenticated
  using ((select public.viewer_is_platform_admin()));

create or replace function public.discovery_reply_effects(
  p_turn public.discovery_turns, p_account_id uuid, p_document jsonb, p_decline jsonb
) returns void language plpgsql security definer set search_path = '' as $$
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
end;
$$;

revoke execute on function public.discovery_reply_effects(public.discovery_turns, uuid, jsonb, jsonb)
  from public, anon, authenticated, service_role;
