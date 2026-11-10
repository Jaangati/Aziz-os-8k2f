create or replace function atlas_private.gateway(p_key text,p_subject text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; k text; d jsonb; item_id uuid; v integer; current_item atlas_private.entries; settings_value jsonb;
begin
 if p_key='' then
  if auth.uid() is null or p_subject is distinct from 'supabase:'||auth.uid()::text or not exists(select 1 from auth.users where id=auth.uid() and lower(email)='krimi.aziz@gmail.com' and email_confirmed_at is not null) then raise exception 'Unauthorized' using errcode='28000'; end if;
 else
 if length(coalesce(p_key,''))<40 or not exists(select 1 from atlas_private.config where key='bridge_hash' and value=encode(extensions.digest(p_key,'sha256'),'hex')) then raise exception 'Unauthorized' using errcode='28000'; end if;
 end if;
 if length(coalesce(p_subject,'')) not between 1 and 256 then raise exception 'Missing identity' using errcode='28000'; end if;
 insert into atlas_private.profiles(subject) values(p_subject) on conflict do nothing;
 if p_action='authorize' then return jsonb_build_object('prefix',encode(extensions.digest(p_subject,'sha256'),'hex')); end if;
 if p_action='state' then
  select jsonb_build_object(
   'entries',coalesce((select jsonb_agg(to_jsonb(x)-'subject') from (select * from atlas_private.entries where subject=p_subject order by updated_at desc limit 3000) x),'[]'),
   'notifications',coalesce((select jsonb_agg(to_jsonb(x)-'subject') from (select * from atlas_private.notifications where subject=p_subject order by created_at desc limit 100) x),'[]'),
   'activity',coalesce((select jsonb_agg(to_jsonb(x)-'subject') from (select * from atlas_private.activity where subject=p_subject order by created_at desc limit 100) x),'[]'),
   'runs',coalesce((select jsonb_agg(to_jsonb(x)-'subject') from (select * from atlas_private.runs where subject=p_subject order by created_at desc limit 50) x),'[]'),
   'settings',(select settings from atlas_private.profiles where subject=p_subject),
   'heartbeat',(select value from atlas_private.config where key='heartbeat')
  ) into result; return result;
 elsif p_action='save' then
  k:=p_payload->>'kind'; d:=p_payload->'data';
  if k not in ('task','memory','transaction','goal','person','document','note') then raise exception 'Invalid kind'; end if;
  perform atlas_private.validate_entry(k,d);
  if k='document' and split_part(d->>'path','/',1)<>encode(extensions.digest(p_subject,'sha256'),'hex') then raise exception 'Invalid document owner'; end if;
  if nullif(p_payload->>'id','') is null then
   insert into atlas_private.entries(subject,kind,data) values(p_subject,k,d) returning id into item_id;
  else
   item_id:=(p_payload->>'id')::uuid;
   update atlas_private.entries set data=d,version=version+1,updated_at=now() where id=item_id and subject=p_subject and kind=k and version=(p_payload->>'version')::integer;
   if not found then raise exception 'This record changed or is unavailable. Refresh before editing.' using errcode='40001'; end if;
  end if;
  insert into atlas_private.activity(subject,action,detail) values(p_subject,'Saved '||k,item_id::text);
  return jsonb_build_object('id',item_id);
 elsif p_action='delete' then
  item_id:=(p_payload->>'id')::uuid;
  delete from atlas_private.entries where id=item_id and subject=p_subject and version=(p_payload->>'version')::integer returning * into current_item;
  if not found then raise exception 'This record changed or is unavailable.' using errcode='40001'; end if;
  insert into atlas_private.activity(subject,action,detail) values(p_subject,'Deleted '||current_item.kind,item_id::text);
  return jsonb_build_object('ok',true);
 elsif p_action='read' then
  update atlas_private.notifications set read_at=now() where subject=p_subject and read_at is null;
 elsif p_action='settings' then
  settings_value:=p_payload;
  if length(coalesce(settings_value->>'name','')) not between 1 and 100 or coalesce(settings_value->>'timezone','') not in ('Asia/Qatar','Africa/Tunis','Europe/London','UTC') or coalesce(settings_value->>'currency','') not in ('QAR','TND','USD','EUR') then raise exception 'Invalid settings'; end if;
  if (settings_value->>'morning_hour')::integer not between 0 and 23 or (settings_value->>'evening_hour')::integer not between 0 and 23 or (settings_value->>'monthly_budget_minor')::bigint<0 then raise exception 'Invalid settings'; end if;
  update atlas_private.profiles set settings=settings_value where subject=p_subject;
  insert into atlas_private.activity(subject,action) values(p_subject,'Updated preferences');
 elsif p_action='start_run' then
  if (select count(*) from atlas_private.runs where subject=p_subject and created_at>now()-interval '24 hours' and agent<>'Routine coordinator')>=20 then raise exception 'Daily limit reached: 20 assistant requests.'; end if;
  if exists(select 1 from atlas_private.runs where subject=p_subject and status='running' and lease_until>now()) then raise exception 'An assistant request is already running.'; end if;
  insert into atlas_private.runs(subject,agent,status,input,attempts,lease_until) values(p_subject,left(p_payload->>'agent',60),'running',left(p_payload->>'input',4000),1,now()+interval '2 minutes') returning id into item_id;
  return jsonb_build_object('id',item_id);
 elsif p_action='finish_run' then
  if p_payload->>'status' not in ('completed','failed','blocked') then raise exception 'Invalid run state'; end if;
  update atlas_private.runs set status=p_payload->>'status',output=left(p_payload->>'output',16000),finished_at=now(),lease_until=null where subject=p_subject and id=(p_payload->>'id')::uuid and status='running';
  if not found then raise exception 'Run is unavailable'; end if;
 else raise exception 'Unknown action';
 end if;
 return '{"ok":true}'::jsonb;
end $$;

