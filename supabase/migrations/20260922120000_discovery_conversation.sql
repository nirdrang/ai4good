create function public.viewer_discovery_allowance(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_utc_day date;
  v_vetted boolean;
  v_spent integer;
  v_granted integer;
begin
  if not public.viewer_is_org_member(p_organization_id) then
    raise exception 'the caller holds no membership in this organisation' using errcode = '42501';
  end if;
  v_utc_day := (clock_timestamp() at time zone 'utc')::date;
  select vetted into v_vetted from public.org_vetting where org_id = p_organization_id;
  if not found then
    v_vetted := false;
  end if;
  select spent, granted into v_spent, v_granted from public.discovery_spend
    where org_id = p_organization_id and utc_day = v_utc_day;
  if not found then
    v_spent := 0;
    v_granted := public.discovery_daily_grant(v_vetted);
  else
    v_granted := greatest(v_granted, public.discovery_daily_grant(v_vetted));
  end if;
  return jsonb_build_object(
    'organization_id', p_organization_id, 'utc_day', to_char(v_utc_day, 'YYYY-MM-DD'),
    'vetted', v_vetted, 'daily_grant', v_granted, 'spent_today', v_spent, 'remaining', v_granted - v_spent
  );
end;
$$;
revoke execute on function public.viewer_discovery_allowance(uuid) from public;
grant execute on function public.viewer_discovery_allowance(uuid) to authenticated;

notify pgrst, 'reload schema';
