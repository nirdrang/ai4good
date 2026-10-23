drop schema if exists spike cascade;
create schema spike;

create table spike.allocations (
  project_id text primary key,
  cap_micros bigint not null check (cap_micros >= 0)
);

create table spike.holds (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references spike.allocations,
  path text not null,
  held_micros bigint not null check (held_micros > 0),
  status text not null default 'open' check (status in ('open', 'pending', 'closed')),
  opened_at timestamptz not null default clock_timestamp()
);

create table spike.charges (
  path text not null,
  receipt_id text not null check (receipt_id <> ''),
  hold_id uuid not null references spike.holds,
  amount_micros numeric(20, 3),
  basis text not null,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (path, receipt_id)
);

create view spike.hold_totals as
select h.id, h.project_id, h.status, h.held_micros,
  coalesce(sum(c.amount_micros), 0) as settled_micros,
  count(c.receipt_id) filter (where c.receipt_id is not null and c.amount_micros is null) as pending_receipts
from spike.holds h left join spike.charges c on c.hold_id = h.id
group by h.id;

create view spike.balance as
select a.project_id, a.cap_micros,
  coalesce(sum(t.settled_micros), 0) as settled_micros,
  coalesce(sum(greatest(t.held_micros - t.settled_micros, 0)) filter (where t.status in ('open', 'pending')), 0) as held_micros,
  coalesce(sum(greatest(t.settled_micros - t.held_micros, 0)), 0) as overrun_micros
from spike.allocations a left join spike.hold_totals t on t.project_id = a.project_id
group by a.project_id, a.cap_micros;

create function spike.hold(p_project text, p_path text, p_micros bigint) returns uuid
language plpgsql as $$
declare
  v_available numeric;
  v_id uuid;
begin
  perform 1 from spike.allocations where project_id = p_project for update;
  select cap_micros - settled_micros - held_micros into v_available from spike.balance where project_id = p_project;
  if v_available is null then raise exception 'no allocation for %', p_project; end if;
  if v_available < p_micros then raise exception 'insufficient funds: % available, % needed', v_available, p_micros; end if;
  insert into spike.holds (project_id, path, held_micros) values (p_project, p_path, p_micros) returning id into v_id;
  return v_id;
end $$;

create function spike.settle(p_hold uuid, p_path text, p_receipt text, p_micros numeric, p_basis text) returns boolean
language plpgsql as $$
declare
  v_new boolean;
begin
  insert into spike.charges (path, receipt_id, hold_id, amount_micros, basis)
  values (p_path, p_receipt, p_hold, p_micros, p_basis)
  on conflict (path, receipt_id) do nothing;
  get diagnostics v_new = row_count;
  return v_new;
end $$;

create function spike.close(p_hold uuid) returns text
language sql as $$
  update spike.holds h set status = case when t.pending_receipts > 0 then 'pending' else 'closed' end
  from spike.hold_totals t
  where h.id = p_hold and t.id = h.id and h.status = 'open'
  returning h.status;
$$;

create function spike.reconcile(p_path text, p_receipt text, p_micros numeric) returns boolean
language plpgsql as $$
declare
  v_hold uuid;
begin
  update spike.charges set amount_micros = p_micros, basis = basis || '+reconciled'
  where path = p_path and receipt_id = p_receipt and amount_micros is null
  returning hold_id into v_hold;
  if v_hold is null then return false; end if;
  update spike.holds h set status = 'closed'
  from spike.hold_totals t where h.id = v_hold and t.id = h.id and h.status = 'pending' and t.pending_receipts = 0;
  return true;
end $$;
