begin;
do $$
declare uid uuid; subj text; saved jsonb; ident uuid; fixture jsonb:='{"title":"Guardian fixture","type":"schedule","amount_minor":50000,"currency":"QAR","date":"2026-11-15","end_date":"","direction":"expense","frequency":"monthly","reserve_minor":0,"savings_pct":0,"category":"Loan","active":true,"settled":[]}';
begin
select id into uid from auth.users where lower(email)='krimi.aziz@gmail.com' and email_confirmed_at is not null;
perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);subj:='supabase:'||uid::text;
saved:=public.atlas_gateway('',subj,'save',jsonb_build_object('kind','guardian','data',fixture));ident:=(saved->>'id')::uuid;
if not exists(select from jsonb_array_elements(public.atlas_export('',subj)->'entries')e where e->>'id'=ident::text and e->'data'=fixture)then raise exception 'Guardian export failed';end if;
perform public.atlas_gateway('',subj,'save',jsonb_build_object('kind','guardian','id',ident,'version',1,'data',fixture||'{"title":"Updated"}'));
begin perform public.atlas_gateway('','other-owner','state');raise exception 'Isolation failed';exception when invalid_authorization_specification then null;end;
perform public.atlas_gateway('',subj,'delete',jsonb_build_object('id',ident,'version',2));
end $$;
rollback;
