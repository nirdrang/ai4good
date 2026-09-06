-- REQ-001, D6 leaf 3: role changes reach the audit table from a trigger on org_memberships
-- (AT-001.33). The transfer definer already writes its own transfer row; this object writes the
-- org_role_changed row for every membership insert and for every update that changes the account
-- or the role.
--
-- THE ACTOR IS A TRANSACTION-LOCAL SETTING (R9). The transfer definer sets
-- `app.actor_account_id` before it moves the seat. `create_organization` and `complete_signup`
-- do not, and this migration does not add it there: a product membership insert therefore records
-- a null actor and the label `operator`, which AT-001.33's body already accepts on an operator
-- path. An UPDATE that changes neither account nor role writes nothing.

create function public.org_membership_role_change_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_actor_text text;
  v_reason text;
begin
  v_actor_text := current_setting('app.actor_account_id', true);
  if v_actor_text is not null and btrim(v_actor_text) <> '' then
    v_actor := v_actor_text::uuid;
  end if;

  if tg_op = 'INSERT' then
    perform public.append_audit_event(
      'org_role_changed',
      v_actor,
      new.account_id,
      new.org_id,
      'membership granted',
      jsonb_build_object(
        'old_role', null,
        'new_role', new.role::text,
        'old_account_id', null,
        'new_account_id', new.account_id
      )
    );
    return new;
  end if;

  if new.account_id is not distinct from old.account_id
     and new.role is not distinct from old.role then
    return new;
  end if;

  if new.account_id is distinct from old.account_id then
    v_reason := 'seat repointed';
  else
    v_reason := 'role changed';
  end if;

  perform public.append_audit_event(
    'org_role_changed',
    v_actor,
    new.account_id,
    new.org_id,
    v_reason,
    jsonb_build_object(
      'old_role', old.role::text,
      'new_role', new.role::text,
      'old_account_id', old.account_id,
      'new_account_id', new.account_id
    )
  );
  return new;
end;
$$;

comment on function public.org_membership_role_change_audit() is
  'Writes one org_role_changed audit row for a membership insert or for an update that changes the account or the role. A missing app.actor_account_id records the operator (REQ-001, AT-001.33, R9).';

revoke execute on function public.org_membership_role_change_audit() from public;

create trigger org_memberships_role_change_audit
after insert or update on public.org_memberships
for each row
execute function public.org_membership_role_change_audit();

notify pgrst, 'reload schema';
