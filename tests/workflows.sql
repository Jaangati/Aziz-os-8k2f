begin;
do $$
declare uid uuid; subj text; e jsonb; rowdata jsonb; saved jsonb; ident uuid; exported jsonb; item record; n integer:=0;
begin
 select id into uid from auth.users where lower(email)='krimi.aziz@gmail.com' and email_confirmed_at is not null;
 if uid is null then raise exception 'Verified owner missing';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);subj:='supabase:'||uid::text;
 for item in select * from (values
 ('task','{"title":"Workflow task","body":"Fixture","priority":"high","status":"open","due":"2020-01-01T00:00:00Z","area":"Personal"}'::jsonb),
 ('memory','{"title":"Workflow memory","body":"Confirmed fact","source":"owner","category":"Fact"}'::jsonb),
 ('transaction','{"title":"Workflow expense","body":"","amount_minor":12345,"direction":"expense","currency":"QAR","date":"2026-11-10","category":"Other"}'::jsonb),
 ('goal','{"title":"Workflow goal","body":"","progress":25,"due":"","area":"Personal"}'::jsonb),
 ('person','{"title":"Workflow person","body":"","relationship":"Family","email":"","phone":""}'::jsonb),
 ('note','{"title":"Workflow note","body":"Fixture thoughts","category":"Journal"}'::jsonb)
 )as fixtures(kind,data)loop
 saved:=public.atlas_gateway('',subj,'save',jsonb_build_object('kind',item.kind,'data',item.data));ident:=(saved->>'id')::uuid;
 exported:=public.atlas_export('',subj);
 if not exists(select 1 from jsonb_array_elements(exported->'entries')r where r->>'id'=ident::text and r->'data'=item.data)then raise exception 'Export roundtrip failed for %',item.kind;end if;
 perform public.atlas_gateway('',subj,'save',jsonb_build_object('id',ident,'version',1,'kind',item.kind,'data',item.data||'{"title":"Updated workflow fixture"}'));
 select data into rowdata from atlas_private.entries where id=ident;
 if rowdata->>'title'<>'Updated workflow fixture'then raise exception 'Edit failed';end if;
 perform public.atlas_gateway('',subj,'delete',jsonb_build_object('id',ident,'version',2));
 if exists(select 1 from atlas_private.entries where id=ident)then raise exception 'Delete failed';end if;n:=n+1;
 end loop;
 if n<>6 then raise exception 'Missing workflow';end if;
 if not(exported ?& array['entries','settings','activity','notifications','runs'])then raise exception 'Incomplete export';end if;
end $$;
rollback;
select 'PASS: six module create/export/edit/delete workflows; fixtures rolled back' as tests;
