-- All test fixtures and test credentials are rolled back.
begin;
update atlas_private.config set value=encode(extensions.digest('atlas-integration-test-key-not-for-production-123456','sha256'),'hex') where key='bridge_hash';
do $$
declare k text := 'atlas-integration-test-key-not-for-production-123456'; a jsonb; b jsonb; item uuid; task jsonb; denied boolean; n integer;
begin
 denied:=false;
 begin perform public.atlas_gateway('wrong','test-a','state'); exception when invalid_authorization_specification then denied:=true; end;
 if not denied then raise exception 'Invalid credential accepted'; end if;
 a:=public.atlas_gateway(k,'test-a','state');
 b:=public.atlas_gateway(k,'test-b','state');
 task:='{"title":"Test due task","body":"","priority":"high","status":"open","due":"2020-01-01T00:00:00Z","area":"Personal"}';
 a:=public.atlas_gateway(k,'test-a','save',jsonb_build_object('kind','task','data',task)); item:=(a->>'id')::uuid;
 b:=public.atlas_gateway(k,'test-b','state');
 if jsonb_array_length(b->'entries')<>0 then raise exception 'Cross-owner read'; end if;
 denied:=false;
 begin perform public.atlas_gateway(k,'test-b','save',jsonb_build_object('id',item,'version',1,'kind','task','data',task)); exception when serialization_failure then denied:=true; end;
 if not denied then raise exception 'Cross-owner update'; end if;
 perform public.atlas_gateway(k,'test-a','save',jsonb_build_object('id',item,'version',1,'kind','task','data',task));
 denied:=false;
 begin perform public.atlas_gateway(k,'test-a','save',jsonb_build_object('id',item,'version',1,'kind','task','data',task)); exception when serialization_failure then denied:=true; end;
 if not denied then raise exception 'Stale write accepted'; end if;
 denied:=false;
 begin perform public.atlas_gateway(k,'test-a','save','{"kind":"transaction","data":{"title":"Invalid","amount_minor":-100,"currency":"QAR","direction":"expense","date":"2026-11-10"}}'); exception when others then denied:=true; end;
 if not denied then raise exception 'Negative expense accepted'; end if;
 perform atlas_private.tick();
 select count(*) into n from atlas_private.notifications where subject='test-a';
 perform atlas_private.tick();
 if n<>(select count(*) from atlas_private.notifications where subject='test-a') then raise exception 'Duplicate reminders'; end if;
 if not exists(select 1 from atlas_private.notifications where subject='test-a' and title='Task needs attention') then raise exception 'Missing due reminder'; end if;
 update atlas_private.profiles set settings=jsonb_set(settings,'{paused}','true') where subject='test-a';
 perform public.atlas_gateway(k,'test-a','save',jsonb_build_object('kind','task','data',task||'{"title":"Paused reminder"}'));
 perform atlas_private.tick();
 if n<>(select count(*) from atlas_private.notifications where subject='test-a') then raise exception 'Pause ignored'; end if;
 denied:=false;
 begin perform public.atlas_gateway(k,'test-b','delete',jsonb_build_object('id',item,'version',2)); exception when serialization_failure then denied:=true; end;
 if not denied then raise exception 'Cross-owner delete'; end if;
 perform public.atlas_gateway(k,'test-a','delete',jsonb_build_object('id',item,'version',2));
end $$;
set local role anon;
do $$ begin
 begin perform * from atlas_private.entries; raise exception 'Raw table exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: authentication, owner isolation, stale writes, amount validation, idempotency, pause, delete and raw table denial' as tests;
