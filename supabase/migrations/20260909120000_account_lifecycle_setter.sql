-- The platform administrator's lifecycle setter.

create function public.set_account_lifecycle(
  p_account_id uuid,
  p_subject_account_id uuid,
  p_lifecycle public.account_lifecycle,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_type public.account_type;
  v_changed boolean;
begin
  perform public.assert_account_active(p_account_id);

  select account_type into v_caller_type from public.accounts where id = p_account_id;
  if v_caller_type is null then
    raise exception 'set_account_lifecycle refuses %: no account has completed signup for this user', p_account_id
      using errcode = '42501', detail = 'no-account';
  end if;
  if v_caller_type <> 'platform_admin' then
    raise exception 'set_account_lifecycle refuses account type %: only a platform administrator changes an account lifecycle', v_caller_type
      using errcode = '42501', detail = 'not-a-platform-admin';
  end if;

  if p_reason is null or length(btrim(p_reason, E' \t\r\n\f')) = 0 then
    raise exception 'set_account_lifecycle refuses a change with no reason'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_subject_account_id is null or p_account_id = p_subject_account_id then
    raise exception 'set_account_lifecycle refuses an administrator changing its own lifecycle'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  v_changed := public.change_account_lifecycle(p_subject_account_id, p_lifecycle, p_account_id, p_reason);
  return jsonb_build_object('changed', v_changed);
end;
$$;
revoke execute on function public.set_account_lifecycle(uuid, uuid, public.account_lifecycle, text) from public;
grant execute on function public.set_account_lifecycle(uuid, uuid, public.account_lifecycle, text) to service_role;

notify pgrst, 'reload schema';
