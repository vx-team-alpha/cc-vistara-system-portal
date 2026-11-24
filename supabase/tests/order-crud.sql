\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'order-admin@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'order-user@example.invalid');

update public.accounts
set role = 'admin'
where id = '10000000-0000-4000-8000-000000000001';

insert into public.business_profiles (account_id, order_prefix)
values
  ('10000000-0000-4000-8000-000000000001', 'ADM'),
  ('10000000-0000-4000-8000-000000000002', 'USR');

insert into public.customers (
  id,
  account_id,
  name,
  phone,
  phone_normalized,
  address,
  city,
  state,
  zip_code
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Admin Customer',
    '111111',
    '111111',
    '1 Admin Road',
    'Admin City',
    'Admin State',
    '11111'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'User Customer',
    '222222',
    '222222',
    '2 User Road',
    'User City',
    'User State',
    '22222'
  );

insert into public.orders (
  id,
  account_id,
  customer_id,
  sequence_number,
  order_number,
  customer_snapshot
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    0,
    'pending',
    '{"name":"Admin Customer"}'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    0,
    'pending',
    '{"name":"User Customer"}'
  );

insert into public.order_items (
  id,
  order_id,
  account_id,
  line_number,
  width_mm,
  height_mm,
  quantity
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    1,
    900,
    2100,
    1
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    3,
    900,
    2100,
    1
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

do $$
begin
  begin
    delete from public.orders where id = '30000000-0000-4000-8000-000000000002';
    raise exception 'Direct order deletion was unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  if not exists (
    select 1 from public.orders where id = '30000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'Non-admin user permanently deleted an order';
  end if;

  delete from public.order_items where id = '40000000-0000-4000-8000-000000000001';
  if exists (
    select 1 from public.order_items where id = '40000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Draft door deletion was unexpectedly blocked';
  end if;

  begin
    update public.orders
    set status = 'issued', revision = revision + 1, issued_at = now()
    where id = '30000000-0000-4000-8000-000000000002';
    raise exception 'Incomplete order was unexpectedly issued';
  exception when raise_exception then
    if sqlerrm = 'Incomplete order was unexpectedly issued' then raise; end if;
  end;

  update public.orders
  set status = 'cancelled', revision = revision + 1, cancelled_at = now()
  where id = '30000000-0000-4000-8000-000000000002';

  delete from public.order_items where id = '40000000-0000-4000-8000-000000000002';
  if not exists (
    select 1 from public.order_items where id = '40000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'A door was deleted from a non-draft order';
  end if;

  begin
    update public.orders
    set status = 'draft', revision = revision + 1
    where id = '30000000-0000-4000-8000-000000000002';
    raise exception 'Cancelled order was unexpectedly reopened';
  exception when raise_exception then
    if sqlerrm = 'Cancelled order was unexpectedly reopened' then raise; end if;
  end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

do $$
declare
  number_to_confirm text;
begin
  select order_number into number_to_confirm
  from public.orders
  where id = '30000000-0000-4000-8000-000000000001';

  begin
    delete from public.orders where id = '30000000-0000-4000-8000-000000000001';
    raise exception 'Admin bypassed the audited deletion function';
  exception when insufficient_privilege then null;
  end;

  if not public.delete_order_permanently(
    '30000000-0000-4000-8000-000000000001',
    number_to_confirm,
    'Duplicate test order'
  ) then
    raise exception 'Eligible admin order was not deleted';
  end if;

  if exists (
    select 1 from public.orders where id = '30000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Deleted admin order still exists';
  end if;

  if not exists (
    select 1
    from public.order_deletion_audits
    where order_id = '30000000-0000-4000-8000-000000000001'
      and reason = 'Duplicate test order'
  ) then
    raise exception 'Deletion audit tombstone was not retained';
  end if;
end $$;

rollback;
