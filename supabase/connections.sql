create or replace function atlas_private.connection_tick() returns void language plpgsql security definer set search_path='' as $$
begin
 insert into atlas_private.notifications(subject,dedupe_key,title,body)
 select e.subject,'connection:'||e.id||':'||(e.data->>'follow_up'),'Follow up with '||(e.data->>'title'),coalesce(nullif(e.data->>'organization',''),'Connection follow-up')
 from atlas_private.entries e join atlas_private.profiles p on p.subject=e.subject
 where e.kind='person' and not coalesce((p.settings->>'paused')::boolean,false)
 and nullif(e.data->>'follow_up','') is not null
 and (case when pg_input_is_valid(e.data->>'follow_up','timestamptz') then (e.data->>'follow_up')::timestamptz else null end)<=now()
 on conflict(subject,dedupe_key) do nothing;
end $$;
revoke all on function atlas_private.connection_tick() from public,anon,authenticated;
select cron.schedule('atlas-connection-minute','* * * * *','select atlas_private.connection_tick()');
