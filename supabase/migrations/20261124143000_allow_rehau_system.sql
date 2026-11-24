-- Allow Rehau Total70 profile system on order items alongside Eurocell.
alter table public.order_items
  drop constraint if exists order_items_system_check;

alter table public.order_items
  add constraint order_items_system_check
  check (system in ('eurocell', 'rehau'));
