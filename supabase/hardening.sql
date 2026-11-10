-- Additive APIs: preserve the original gateway and its callers.
create function atlas_private.export_records(p_key text,p_subject text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform atlas_private.gateway(p_key,p_subject,'authorize');
 return jsonb_build_object('entries',coalesce((select jsonb_agg(to_jsonb(e)-'subject') from atlas_private.entries e where subject=p_subject),'[]'),'settings',(select settings from atlas_private.profiles where subject=p_subject),'exported_at',now());
end $$;
create function public.atlas_export(p_key text,p_subject text) returns jsonb language sql security invoker set search_path='' as $$ select atlas_private.export_records(p_key,p_subject) $$;
create function atlas_private.start_run(p_key text,p_subject text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform atlas_private.gateway(p_key,p_subject,'authorize');
 perform pg_advisory_xact_lock(hashtextextended(p_subject,0));
 return atlas_private.gateway(p_key,p_subject,'start_run',p_payload);
end $$;
create function public.atlas_start_run(p_key text,p_subject text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select atlas_private.start_run(p_key,p_subject,p_payload) $$;
revoke all on function atlas_private.export_records(text,text),atlas_private.start_run(text,text,jsonb),public.atlas_export(text,text),public.atlas_start_run(text,text,jsonb) from public;
grant execute on function atlas_private.export_records(text,text),atlas_private.start_run(text,text,jsonb),public.atlas_export(text,text),public.atlas_start_run(text,text,jsonb) to anon,authenticated,service_role;
