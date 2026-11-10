create or replace function atlas_private.briefing_due(local_now timestamp, scheduled_hour integer) returns boolean language sql immutable set search_path='' as $$ select extract(hour from local_now)=scheduled_hour and extract(minute from local_now)<15 $$;
create or replace function atlas_private.tick() returns void language plpgsql security definer set search_path='' as $$
declare p record; e record; local_now timestamp; hour_value integer; label text; summary text; run_key text;
begin
 perform pg_advisory_xact_lock(742019);
 for p in select * from atlas_private.profiles where not coalesce((settings->>'paused')::boolean,false) loop
  local_now := now() at time zone coalesce(p.settings->>'timezone','Asia/Qatar');
  for e in select * from atlas_private.entries where subject=p.subject and kind='task' and data->>'status'='open' and nullif(data->>'due','') is not null and (data->>'due')::timestamptz<=now() loop
   insert into atlas_private.notifications(subject,dedupe_key,title,body) values(p.subject,'task:'||e.id||':'||(e.data->>'due'),'Task needs attention',e.data->>'title') on conflict do nothing;
  end loop;
  for hour_value,label in select coalesce((p.settings->>'morning_hour')::integer,8),'Morning priorities' union all select coalesce((p.settings->>'evening_hour')::integer,20),'Evening review' loop
   if atlas_private.briefing_due(local_now,hour_value) then
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

create or replace function atlas_private.export_records(p_key text,p_subject text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform atlas_private.gateway(p_key,p_subject,'authorize');
 return jsonb_build_object('format_version',1,'exported_at',now(),
 'entries',coalesce((select jsonb_agg(to_jsonb(e)-'subject') from atlas_private.entries e where subject=p_subject),'[]'::jsonb),
 'settings',(select settings from atlas_private.profiles where subject=p_subject),
 'activity',coalesce((select jsonb_agg(to_jsonb(e)-'subject') from atlas_private.activity e where subject=p_subject),'[]'::jsonb),
 'notifications',coalesce((select jsonb_agg(to_jsonb(e)-'subject') from atlas_private.notifications e where subject=p_subject),'[]'::jsonb),
 'runs',coalesce((select jsonb_agg(to_jsonb(e)-'subject') from atlas_private.runs e where subject=p_subject),'[]'::jsonb),
 'files_included',false,'file_restore_note','Download files separately. Document entries contain metadata only.');
end $$;
revoke all on function atlas_private.briefing_due(timestamp,integer) from public,anon,authenticated;
