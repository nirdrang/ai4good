-- REQ-001, D6 leaf 1: the audited contact transfer and lost-access recovery (AT-001.25, .26, .27,
-- .35), the non-login escalation contact (AT-001.28), and the lifecycle boundary they need — the
-- column, the SQL gate, and the one standing read every write route loads first.
--
-- THE LIFECYCLE RULE IS STATED TWICE, ONCE HERE AND ONCE IN TYPESCRIPT (R1). `writeGateDecision` in
-- `supabase/functions/_shared/write-routes.ts` refuses a deactivated caller with a kind on the
-- wire; `assert_account_active` below refuses the same caller for anyone who reaches a definer with
-- the service-role key and no TypeScript in the path. CI grades the TypeScript; only the
-- integration tier reaches this file.

/* ================================================================== the lifecycle state ========= */

-- Two values and no third (R8). An enum rather than a boolean, so `suspended` cannot be written by
-- accident, and rather than a nullable timestamp, so a null cannot mean "probably active". When and
-- why live in `audit_events`, which is the only place they are written.
create type public.account_lifecycle as enum ('active', 'deactivated');

alter table public.accounts
  add column lifecycle public.account_lifecycle not null default 'active';

-- The other-seats check (R6) and the standing read look seats up BY ACCOUNT; the unique index that
-- keeps one seat per organisation is by organisation.
create index org_memberships_by_account_idx on public.org_memberships (account_id, org_id);

/* ================================================================== the audit record ============ */

create type public.audit_event_kind as enum
  ('org_contact_transferred', 'account_lifecycle_changed', 'org_role_changed');

-- NO FOREIGN KEY AND NO CASCADE (R3). Actor and subject are plain uuids beside a denormalised
-- label, in the spirit of `acknowledgments.signer_name`, so a later account delete cannot take the
-- history with it. `actor_account_id` is null on an operator path and `actor_label` then reads
-- 'operator' (R9).
create table public.audit_events (
  id                 uuid primary key default gen_random_uuid(),
  occurred_at        timestamptz not null default now(),
  event_kind         public.audit_event_kind not null,
  actor_account_id   uuid,
  actor_label        text not null,
  subject_account_id uuid,
  subject_org_id     uuid,
  reason             text not null,
  detail             jsonb not null default '{}'::jsonb,
  -- AT-001.26's "why", encoded rather than described: no audit row without a reason.
  constraint audit_events_reason_populated check (btrim(reason, E' \t\r\n\f') <> ''),
  constraint audit_events_actor_label_populated check (btrim(actor_label, E' \t\r\n\f') <> '')
);

/* ================================================================== the escalation contact ====== */

-- ONE ROW PER ORGANISATION, and "non-login" is structural: the table holds no account id for the
-- contact and no link to `auth.users`, so there is nothing for a login to attach to (R15). The
-- primary key on `org_id` is AT-001.28's "one escalation contact" as a fact about the shape; a
-- second capture updates the row.
create table public.org_escalation_contacts (
  org_id                 uuid primary key references public.organizations(id) on delete cascade,
  contact_name           text not null,
  contact_email          text not null,
  contact_phone          text,
  recorded_by_account_id uuid not null,
  recorded_at            timestamptz not null default now(),
  constraint org_escalation_contacts_populated check (
    btrim(contact_name, E' \t\r\n\f') <> '' and btrim(contact_email, E' \t\r\n\f') <> ''
  )
);

/* ================================================================== privilege posture ========== */

-- BOTH TABLES ARE UNREACHABLE BY CLIENT ROLES (R12). `revoke all` is what makes "no privilege"
-- true, and it names service_role as well (R4): the default ACL still hands truncate, references
-- and trigger to every new public table (artifacts/measure/unit4-privileges-after-reset.txt).
-- No policy and no viewer_ helper, by decision; the tests read these tables as the operator.
revoke all on table public.audit_events, public.org_escalation_contacts from anon, authenticated;
revoke all on table public.audit_events, public.org_escalation_contacts from service_role;
alter table public.audit_events enable row level security;
alter table public.org_escalation_contacts enable row level security;

/* ================================================================== append-only, in the schema == */

-- R3's three halves: no role holds UPDATE, DELETE or TRUNCATE (above); no definer below updates or
-- deletes a row; and this trigger raises for the owner's own statements. The owner can drop the
-- trigger — no object protects against its owner — and that residual is stated here rather than
-- papered over with a second trigger the same authority could also drop.
create function public.audit_events_are_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'public.audit_events is append-only: % is refused (REQ-001, AT-001.33)', tg_op
    using errcode = '42501';
end;
$$;
revoke execute on function public.audit_events_are_append_only() from public;

create trigger audit_events_no_update_or_delete
before update or delete on public.audit_events
for each row execute function public.audit_events_are_append_only();

-- TRUNCATE takes a statement trigger; a row trigger never sees it.
create trigger audit_events_no_truncate
before truncate on public.audit_events
for each statement execute function public.audit_events_are_append_only();

/* ================================================================== the write gate, in SQL ====== */

-- Called FIRST by every write definer the service role can reach.
create function public.assert_account_active(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lifecycle public.account_lifecycle;
begin
  -- `for share` (R7): a gated write in flight blocks a concurrent deactivation, and a write that
  -- arrives during one blocks until it commits and then reads the committed state. That is the
  -- whole concurrency contract; nothing else here is serialised.
  select lifecycle into v_lifecycle
    from public.accounts
   where id = p_account_id
     for share;

  -- ABSENCE IS NOT A LIFECYCLE REFUSAL. The calling function answers for a missing account with its
  -- own sentence; this one answers for exactly one thing.
  if v_lifecycle = 'deactivated' then
    raise exception 'this account is deactivated, so it may perform no write (REQ-001, AT-001.29)'
      using errcode = '42501', detail = 'account-deactivated';
  end if;
end;
$$;
revoke execute on function public.assert_account_active(uuid) from public;
-- NO GRANT. It is reached only from inside other definers, which run as the owner.

/* ================================================================== the one standing read ======= */

-- ONE READ FOR EVERY WRITE ROUTE: the caller's type and lifecycle, its role in the target
-- organisation, whether that organisation exists, who holds its single seat and which seats that
-- holder has elsewhere, and the subject's type and lifecycle. A route that names no organisation
-- passes null and those fields come back null. `parseWriteStanding` in
-- `supabase/functions/_shared/write-routes.ts` judges the answer and fails closed on any other
-- shape.
create function public.write_standing(p_account_id uuid, p_org_id uuid, p_subject_account_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'account', (
      select jsonb_build_object('account_type', a.account_type, 'lifecycle', a.lifecycle)
        from public.accounts a
       where a.id = p_account_id
    ),
    'org_exists', exists (select 1 from public.organizations o where o.id = p_org_id),
    'org_role', (
      select m.role
        from public.org_memberships m
       where m.org_id = p_org_id
         and m.account_id = p_account_id
    ),
    'org_seat_account_id', (
      select m.account_id
        from public.org_memberships m
       where m.org_id = p_org_id
    ),
    'org_seat_holder_seats', coalesce((
      select jsonb_agg(s.org_id order by s.org_id)
        from public.org_memberships s
       where s.account_id = (select m.account_id from public.org_memberships m where m.org_id = p_org_id)
    ), '[]'::jsonb),
    'subject', (
      select jsonb_build_object('account_type', a.account_type, 'lifecycle', a.lifecycle)
        from public.accounts a
       where a.id = p_subject_account_id
    )
  );
$$;
revoke execute on function public.write_standing(uuid, uuid, uuid) from public;
grant execute on function public.write_standing(uuid, uuid, uuid) to service_role;

/* ================================================================== audit writing, internal ===== */

-- Reached only from inside other definers: no grant. `actor_label` is 'platform_admin:<id>' for a
-- product path and 'operator' when no actor is known (R9).
create function public.append_audit_event(
  p_kind public.audit_event_kind,
  p_actor uuid,
  p_subject_account uuid,
  p_subject_org uuid,
  p_reason text,
  p_detail jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events
    (event_kind, actor_account_id, actor_label, subject_account_id, subject_org_id, reason, detail)
  values (
    p_kind,
    p_actor,
    case when p_actor is null then 'operator' else 'platform_admin:' || p_actor::text end,
    p_subject_account,
    p_subject_org,
    p_reason,
    coalesce(p_detail, '{}'::jsonb)
  );
end;
$$;
revoke execute on function public.append_audit_event(public.audit_event_kind, uuid, uuid, uuid, text, jsonb) from public;

-- IDEMPOTENT: it updates only when the state differs, returns whether it changed, and writes an
-- audit row only on a change. Running it twice leaves one row, not two. `for update` takes the lock
-- that `assert_account_active`'s share lock waits behind (R7).
create function public.change_account_lifecycle(
  p_account_id uuid,
  p_lifecycle public.account_lifecycle,
  p_actor uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.account_lifecycle;
begin
  select lifecycle into v_current
    from public.accounts
   where id = p_account_id
     for update;

  if v_current is null then
    raise exception 'change_account_lifecycle refuses %: no account has completed signup for this user', p_account_id
      using errcode = '23503', detail = 'subject-no-account';
  end if;

  if v_current = p_lifecycle then
    return false;
  end if;

  update public.accounts
     set lifecycle = p_lifecycle
   where id = p_account_id;

  perform public.append_audit_event(
    'account_lifecycle_changed', p_actor, p_account_id, null, p_reason,
    jsonb_build_object('from', v_current, 'to', p_lifecycle)
  );
  return true;
end;
$$;
revoke execute on function public.change_account_lifecycle(uuid, public.account_lifecycle, uuid, text) from public;

/* ================================================================== the two admin writes ======== */

-- THE CONTACT TRANSFER, AND LOST-ACCESS RECOVERY IS THE SAME OPERATION (AT-001.27): the reason the
-- administrator gives is the difference, and the audit row carries it. One call is one transaction,
-- so a transfer cannot half-happen.
--
-- EVERY CHECK BELOW IS A BACKSTOP for a caller that bypassed `decideContactTransfer` in
-- `supabase/functions/_shared/admin-operations.ts`: the user-facing refusal, with its kind and its
-- sentence, is the shared module's. Each raise here still carries its kind as DETAIL, so the edge
-- can put it on the wire (R10).
create function public.transfer_organization_contact(
  p_account_id uuid,
  p_organization_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_type public.account_type;
  v_seat_holder uuid;
  v_other_seats uuid[];
  v_to_type public.account_type;
  v_to_lifecycle public.account_lifecycle;
begin
  perform public.assert_account_active(p_account_id);

  select account_type into v_caller_type from public.accounts where id = p_account_id;
  if v_caller_type is null then
    raise exception 'transfer_organization_contact refuses %: no account has completed signup for this user', p_account_id
      using errcode = '42501', detail = 'no-account';
  end if;
  if v_caller_type <> 'platform_admin' then
    raise exception 'transfer_organization_contact refuses account type %: only a platform administrator transfers a contact seat', v_caller_type
      using errcode = '42501', detail = 'not-a-platform-admin';
  end if;

  if p_reason is null or length(btrim(p_reason, E' \t\r\n\f')) = 0 then
    raise exception 'transfer_organization_contact refuses a transfer with no reason'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_from_account_id is null or p_to_account_id is null or p_from_account_id = p_to_account_id then
    raise exception 'transfer_organization_contact refuses a transfer that does not name two different accounts'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'transfer_organization_contact refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  -- `for update` on the seat row: two transfers of one seat serialise here, and the second one
  -- reads the seat the first one moved and refuses.
  select account_id into v_seat_holder
    from public.org_memberships
   where org_id = p_organization_id
     for update;
  if v_seat_holder is null or v_seat_holder <> p_from_account_id then
    raise exception 'transfer_organization_contact refuses %: this account does not hold the contact seat of organisation %',
      p_from_account_id, p_organization_id
      using errcode = '42501', detail = 'not-the-current-contact';
  end if;

  -- R6: lifecycle is account-level, and deactivating an account that holds another seat would gate
  -- its writes in an organisation this transfer never looked at.
  select coalesce(array_agg(org_id order by org_id), '{}'::uuid[]) into v_other_seats
    from public.org_memberships
   where account_id = p_from_account_id
     and org_id <> p_organization_id;
  if cardinality(v_other_seats) > 0 then
    raise exception 'transfer_organization_contact refuses %: the outgoing account also holds the contact seat of %',
      p_from_account_id, array_to_string(v_other_seats, ', ')
      using errcode = '42501', detail = 'holds-other-seats';
  end if;

  select account_type, lifecycle into v_to_type, v_to_lifecycle
    from public.accounts
   where id = p_to_account_id;
  if v_to_type is null then
    raise exception 'transfer_organization_contact refuses %: the new contact has not completed signup', p_to_account_id
      using errcode = '23503', detail = 'transferee-no-account';
  end if;
  if v_to_type <> 'ngo' then
    raise exception 'transfer_organization_contact refuses %: the new contact is of type %, and a contact seat is held by an NGO account only',
      p_to_account_id, v_to_type
      using errcode = '42501', detail = 'transferee-not-ngo';
  end if;
  if v_to_lifecycle = 'deactivated' then
    raise exception 'transfer_organization_contact refuses %: the new contact is deactivated', p_to_account_id
      using errcode = '42501', detail = 'transferee-deactivated';
  end if;

  -- The actor, for any trigger that writes an audit row inside this transaction (R9).
  perform set_config('app.actor_account_id', p_account_id::text, true);

  -- THE SEAT MOVES AND NOTHING ELSE ON THE ROW CHANGES: the role stays, and every row keyed to the
  -- outgoing account — its acknowledgment, the organisation's projects, the organisation itself —
  -- stays where it is. That is AT-001.25's "history preserved and still attributed to the original
  -- acting humans". Nothing is deleted.
  update public.org_memberships
     set account_id = p_to_account_id
   where org_id = p_organization_id
     and account_id = p_from_account_id;

  perform public.change_account_lifecycle(p_from_account_id, 'deactivated', p_account_id, p_reason);
  perform public.append_audit_event(
    'org_contact_transferred', p_account_id, p_from_account_id, p_organization_id, p_reason,
    jsonb_build_object('from_account_id', p_from_account_id, 'to_account_id', p_to_account_id)
  );

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'from_account_id', p_from_account_id,
    'to_account_id', p_to_account_id
  );
end;
$$;
revoke execute on function public.transfer_organization_contact(uuid, uuid, uuid, uuid, text) from public;
grant execute on function public.transfer_organization_contact(uuid, uuid, uuid, uuid, text) to service_role;

-- THE ESCALATION CONTACT (AT-001.28). The same backstop posture as the transfer: the decision is
-- `decideEscalationContact`'s, and every raise here carries its kind as DETAIL.
create function public.set_escalation_contact(
  p_account_id uuid,
  p_organization_id uuid,
  p_name text,
  p_email text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_type public.account_type;
  v_name text;
  v_email text;
  v_phone text;
begin
  perform public.assert_account_active(p_account_id);

  select account_type into v_caller_type from public.accounts where id = p_account_id;
  if v_caller_type is null then
    raise exception 'set_escalation_contact refuses %: no account has completed signup for this user', p_account_id
      using errcode = '42501', detail = 'no-account';
  end if;
  if v_caller_type <> 'platform_admin' then
    raise exception 'set_escalation_contact refuses account type %: only a platform administrator records an escalation contact', v_caller_type
      using errcode = '42501', detail = 'not-a-platform-admin';
  end if;

  v_name := btrim(p_name, E' \t\r\n\f');
  v_email := btrim(p_email, E' \t\r\n\f');
  v_phone := nullif(btrim(p_phone, E' \t\r\n\f'), '');
  if v_name is null or v_name = '' or v_email is null or v_email = '' then
    raise exception 'set_escalation_contact refuses a contact with no name or no email address'
      using errcode = '22023', detail = 'invalid-contact';
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'set_escalation_contact refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  -- ONE ROW PER ORGANISATION: a second capture replaces the first, and the primary key is what
  -- makes that true rather than a rule somebody applies.
  insert into public.org_escalation_contacts
    (org_id, contact_name, contact_email, contact_phone, recorded_by_account_id)
  values (p_organization_id, v_name, v_email, v_phone, p_account_id)
  on conflict (org_id) do update
     set contact_name = excluded.contact_name,
         contact_email = excluded.contact_email,
         contact_phone = excluded.contact_phone,
         recorded_by_account_id = excluded.recorded_by_account_id,
         recorded_at = now();

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'contact_name', v_name,
    'contact_email', v_email,
    'contact_phone', v_phone
  );
end;
$$;
revoke execute on function public.set_escalation_contact(uuid, uuid, text, text, text) from public;
grant execute on function public.set_escalation_contact(uuid, uuid, text, text, text) to service_role;

/* ================================================================== the two existing writers ==== */

-- Both gain the gate as their FIRST statement and are otherwise the bodies their own migrations
-- state. `create or replace` keeps privileges, and the revoke and the grant are restated anyway:
-- this tree has paid for a recreate that dropped a grant once.
create or replace function public.create_organization(
  p_account_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_account_type public.account_type;
begin
  perform public.assert_account_active(p_account_id);

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'create_organization refuses an empty organisation name'
      using errcode = '22023';
  end if;

  -- THE BACKSTOP. It fires only on a call that did not come through the edge function, because the
  -- edge function refuses a non-NGO caller before ever reaching here.
  select account_type into v_account_type
    from public.accounts
   where id = p_account_id;

  if v_account_type is null then
    raise exception 'create_organization refuses %: no account has completed signup for this user', p_account_id
      using errcode = '23503';
  end if;

  if v_account_type <> 'ngo' then
    raise exception 'create_organization refuses account type %: creating an organisation is an NGO-only action', v_account_type
      using errcode = '42501';
  end if;

  insert into public.organizations (name)
  values (btrim(p_name))
  returning id into v_organization_id;

  insert into public.org_memberships (org_id, account_id, role)
  values (v_organization_id, p_account_id, 'admin');

  return jsonb_build_object('organization_id', v_organization_id);
end;
$$;
revoke execute on function public.create_organization(uuid, text) from public;
grant execute on function public.create_organization(uuid, text) to service_role;

create or replace function public.update_organization(
  p_account_id uuid,
  p_organization_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.org_role;
  v_name text;
begin
  perform public.assert_account_active(p_account_id);

  -- THE TRIM CARRIES AN EXPLICIT WHITESPACE SET: `btrim(text)` with one argument strips SPACES ONLY,
  -- so a name of one TAB would pass the emptiness check and be stored as a visually blank name.
  if p_name is null or length(btrim(p_name, E' \t\r\n\f')) = 0 then
    raise exception 'update_organization refuses an empty organisation name'
      using errcode = '22023';
  end if;
  v_name := btrim(p_name, E' \t\r\n\f');

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'update_organization refuses %: no such organisation', p_organization_id
      using errcode = '23503';
  end if;

  -- THE ROLE IS READ IN THE TARGET ORGANISATION AND NOWHERE ELSE. There is no query here that could
  -- find the caller's role in a different organisation, which is what makes "acting in NGO A never
  -- grants anything in NGO B" structural on this path rather than a rule somebody applied.
  select role into v_role
    from public.org_memberships
   where org_id = p_organization_id
     and account_id = p_account_id;

  if v_role is null then
    raise exception
      'update_organization refuses %: the caller holds no membership in organisation % — membership is held per organisation',
      p_account_id, p_organization_id
      using errcode = '42501';
  end if;

  if v_role <> 'admin' then
    raise exception
      'update_organization refuses %: the caller holds the % role in organisation % — the admin role is held per organisation',
      p_account_id, v_role, p_organization_id
      using errcode = '42501';
  end if;

  update public.organizations
     set name = v_name
   where id = p_organization_id;

  return jsonb_build_object('organization_id', p_organization_id, 'name', v_name);
end;
$$;
revoke execute on function public.update_organization(uuid, uuid, text) from public;
grant execute on function public.update_organization(uuid, uuid, text) to service_role;

-- PostgREST caches the schema. Without this, the first call to a freshly created function is a 404
-- from the schema cache rather than a real answer — and `write_standing` sits on the path of EVERY
-- write, so a stale cache would 404 every route at once.
notify pgrst, 'reload schema';
