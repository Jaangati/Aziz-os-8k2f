-- Atlas uses a server-only gateway and private tables, not browser credentials.
-- Hosted identity is supplied only by the authenticated, owner-private Site.
create schema if not exists atlas_private;
revoke all on schema atlas_private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

create table atlas_private.config (key text primary key, value text not null);
create table atlas_private.profiles (
  subject text primary key,
  settings jsonb not null default '{"name":"Aziz","timezone":"Asia/Qatar","morning_hour":8,"evening_hour":20,"paused":false,"currency":"QAR","monthly_budget_minor":0}',
  created_at timestamptz not null default now()
);
create table atlas_private.entries (
  id uuid primary key default gen_random_uuid(),
  subject text not null references atlas_private.profiles(subject),
  kind text not null check(kind in ('task','memory','transaction','goal','person','document','note')),
  data jsonb not null check(jsonb_typeof(data)='object'),
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index entries_subject_kind on atlas_private.entries(subject,kind,updated_at desc);
create table atlas_private.notifications (
  id uuid primary key default gen_random_uuid(), subject text not null references atlas_private.profiles(subject),
  dedupe_key text not null, title text not null, body text not null,
  read_at timestamptz, created_at timestamptz not null default now(), unique(subject,dedupe_key)
);
create index notifications_subject on atlas_private.notifications(subject,created_at desc);
create table atlas_private.activity (
  id bigint generated always as identity primary key, subject text not null,
  action text not null, detail text not null default '', created_at timestamptz not null default now()
);
create index activity_subject on atlas_private.activity(subject,created_at desc);
create table atlas_private.runs (
  id uuid primary key default gen_random_uuid(), subject text not null references atlas_private.profiles(subject),
  agent text not null, status text not null check(status in ('queued','running','completed','failed','blocked')),
  input text not null default '', output text not null default '', attempts integer not null default 0,
  created_at timestamptz not null default now(), finished_at timestamptz,
  lease_until timestamptz, dedupe_key text, unique(subject,dedupe_key)
);
create index runs_subject on atlas_private.runs(subject,created_at desc);
alter table atlas_private.config enable row level security;
alter table atlas_private.profiles enable row level security;
alter table atlas_private.entries enable row level security;
alter table atlas_private.notifications enable row level security;
alter table atlas_private.activity enable row level security;
alter table atlas_private.runs enable row level security;

create function atlas_private.validate_entry(k text,d jsonb) returns void language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(d)<>'object' or length(coalesce(d->>'title','')) not between 1 and 300 or octet_length(d::text)>20000 then raise exception 'Invalid entry'; end if;
 if k='task' then
  if coalesce(d->>'status','') not in ('open','done') or coalesce(d->>'priority','') not in ('high','normal','low') then raise exception 'Invalid task'; end if;
  if nullif(d->>'due','') is not null then perform (d->>'due')::timestamptz; end if;
 elsif k='memory' then
  if coalesce(d->>'source','') not in ('owner','inferred') or length(coalesce(d->>'body','')) not between 1 and 8000 then raise exception 'Invalid memory'; end if;
 elsif k='transaction' then
  if coalesce(d->>'direction','') not in ('income','expense') or coalesce(d->>'currency','') not in ('QAR','TND','USD','EUR') then raise exception 'Invalid transaction'; end if;
  if coalesce(d->>'amount_minor','') !~ '^[0-9]+$' or (d->>'amount_minor')::numeric not between 1 and 999999999999 then raise exception 'Invalid amount'; end if;
  perform (d->>'date')::date;
 elsif k='goal' then
  if coalesce(d->>'progress','') !~ '^[0-9]+$' or (d->>'progress')::integer not between 0 and 100 then raise exception 'Invalid progress'; end if;
 elsif k='document' then
  if coalesce(d->>'path','') !~ '^[a-f0-9]{64}/[a-f0-9-]{36}$' then raise exception 'Invalid document path'; end if;
 end if;
end $$;

create function atlas_private.tick() returns void language plpgsql security definer set search_path='' as $$
declare p record; e record; local_now timestamp; hour_value integer; label text; summary text; run_key text;
begin
 perform pg_advisory_xact_lock(742019);
 for p in select * from atlas_private.profiles where not coalesce((settings->>'paused')::boolean,false) loop
  local_now := now() at time zone coalesce(p.settings->>'timezone','Asia/Qatar');
  for e in select * from atlas_private.entries where subject=p.subject and kind='task' and data->>'status'='open' and nullif(data->>'due','') is not null and (data->>'due')::timestamptz<=now() loop
   insert into atlas_private.notifications(subject,dedupe_key,title,body) values(p.subject,'task:'||e.id||':'||(e.data->>'due'),'Task needs attention',e.data->>'title') on conflict do nothing;
  end loop;
  for hour_value,label in select coalesce((p.settings->>'morning_hour')::integer,8),'Morning priorities' union all select coalesce((p.settings->>'evening_hour')::integer,20),'Evening review' loop
   if extract(hour from local_now)>=hour_value then
    run_key := label||':'||local_now::date;
    select string_agg(title,E'\n') into summary from (select data->>'title' title from atlas_private.entries where subject=p.subject and kind='task' and data->>'status'='open' order by case when nullif(data->>'due','') is not null and (data->>'due')::timestamptz<=now() then 0 else 1 end, case data->>'priority' when 'high' then 0 when 'normal' then 1 else 2 end, created_at limit 3) items;
    insert into atlas_private.notifications(subject,dedupe_key,title,body) values(p.subject,run_key,label,coalesce(summary,'Your task list is clear. Capture your next commitment.')) on conflict do nothing;
    insert into atlas_private.runs(subject,agent,status,output,finished_at,dedupe_key) values(p.subject,'Routine coordinator','completed',coalesce(summary,'No open tasks.'),now(),run_key) on conflict do nothing;
   end if;
  end loop;
 end loop;
 -- Reconcile interrupted AI calls; never mark an uncompleted call successful.
 update atlas_private.runs set status='failed',output='Execution interrupted. Retry from the assistant.',finished_at=now() where status='running' and lease_until<now();
 insert into atlas_private.config values('heartbeat',now()::text) on conflict(key) do update set value=excluded.value;
end $$;

create function atlas_private.gateway(p_key text,p_subject text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; k text; d jsonb; item_id uuid; v integer; current_item atlas_private.entries; settings_value jsonb;
begin
 if length(coalesce(p_key,''))<40 or not exists(select 1 from atlas_private.config where key='bridge_hash' and value=encode(extensions.digest(p_key,'sha256'),'hex')) then raise exception 'Unauthorized' using errcode='28000'; end if;
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

-- Public invoker wrapper exposes only the key-verified, identity-scoped gateway.
create function public.atlas_gateway(p_key text,p_subject text,p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select atlas_private.gateway(p_key,p_subject,p_action,p_payload) $$;
revoke all on all tables in schema atlas_private from public,anon,authenticated;
revoke all on all functions in schema atlas_private from public,anon,authenticated;
revoke all on function public.atlas_gateway(text,text,text,jsonb) from public;
grant usage on schema atlas_private to anon,authenticated,service_role;
grant execute on function atlas_private.gateway(text,text,text,jsonb) to anon,authenticated,service_role;
grant execute on function public.atlas_gateway(text,text,text,jsonb) to anon,authenticated,service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('atlas-vault','atlas-vault',false,10485760,array['application/pdf','image/jpeg','image/png','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do nothing;
select cron.schedule('atlas-minute','* * * * *','select atlas_private.tick()');
