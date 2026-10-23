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
  status text not null default 'held' check (status in ('held', 'settled', 'pending')),
  opened_at timestamptz not null default clock_timestamp()
);

create table spike.charges (
  path text not null,
  receipt_id text not null,
  hold_id uuid not null references spike.holds,
  amount_micros numeric(20, 3),
  basis text not null,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (path, receipt_id)
);

create view spike.balance as
select a.project_id, a.cap_micros,
  coalesce((select sum(c.amount_micros) from spike.charges c join spike.holds h on h.id = c.hold_id
            where h.project_id = a.project_id and c.amount_micros is not null), 0) as settled_micros,
  coalesce((select sum(h.held_micros) from spike.holds h
            where h.project_id = a.project_id and h.status in ('held', 'pending')), 0) as held_micros
from spike.allocations a;

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
  if p_micros is null then
    update spike.holds set status = 'pending' where id = p_hold and status = 'held';
  elsif not exists (select 1 from spike.charges where hold_id = p_hold and amount_micros is null) then
    update spike.holds set status = 'settled' where id = p_hold;
  end if;
  return v_new;
end $$;

create function spike.reconcile(p_path text, p_receipt text, p_micros numeric) returns boolean
language plpgsql as $$
declare
  v_hold uuid;
begin
  update spike.charges set amount_micros = p_micros, basis = basis || '+reconciled'
  where path = p_path and receipt_id = p_receipt and amount_micros is null
  returning hold_id into v_hold;
  if v_hold is null then return false; end if;
  if not exists (select 1 from spike.charges where hold_id = v_hold and amount_micros is null) then
    update spike.holds set status = 'settled' where id = v_hold;
  end if;
  return true;
end $$;
