\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000111','portal-test-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000222','portal-test-b@example.invalid');
insert into public.embed_widgets(id,account_id,configurator_type_id,name)
 select '00000000-0000-4000-8000-000000000333','00000000-0000-4000-8000-000000000111',id,'Portal test A' from public.configurator_types where slug='door';
insert into public.embed_widgets(id,account_id,configurator_type_id,name)
 select '00000000-0000-4000-8000-000000000444','00000000-0000-4000-8000-000000000222',id,'Portal test B' from public.configurator_types where slug='door';
insert into public.widget_views(widget_id,account_id,session_id) values
 ('00000000-0000-4000-8000-000000000333','00000000-0000-4000-8000-000000000111',gen_random_uuid()),
 ('00000000-0000-4000-8000-000000000444','00000000-0000-4000-8000-000000000222',gen_random_uuid());
insert into public.leads(id,account_id,widget_id,spec) values
 ('00000000-0000-4000-8000-000000000555','00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000333','{"product":"Original"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000111',true);
do $$
begin
 if (select count(*) from public.embed_widgets where id in ('00000000-0000-4000-8000-000000000333','00000000-0000-4000-8000-000000000444')) <> 1 then raise exception 'Widget ownership isolation failed'; end if;
 if (select count(*) from public.widget_views where widget_id in ('00000000-0000-4000-8000-000000000333','00000000-0000-4000-8000-000000000444')) <> 1 then raise exception 'Analytics isolation failed'; end if;
 update public.leads set status='contacted' where id='00000000-0000-4000-8000-000000000555';
 if (select status from public.leads where id='00000000-0000-4000-8000-000000000555') <> 'contacted' then raise exception 'Status update failed'; end if;
 begin
  update public.leads set spec='{}' where id='00000000-0000-4000-8000-000000000555';
  raise exception 'Specification update unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.embed_widgets set account_id='00000000-0000-4000-8000-000000000222' where id='00000000-0000-4000-8000-000000000333';
  raise exception 'Ownership transfer unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.leads(account_id,widget_id) values ('00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000444');
  raise exception 'Cross-account attribution unexpectedly allowed';
 exception when foreign_key_violation then null; end;
 begin
  insert into public.widget_views(widget_id,account_id,session_id) values ('00000000-0000-4000-8000-000000000333','00000000-0000-4000-8000-000000000111',gen_random_uuid());
  raise exception 'Client analytics writes unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 begin perform id from public.embed_widgets; raise exception 'Anonymous widget reads unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform id from public.leads; raise exception 'Anonymous enquiry reads unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
