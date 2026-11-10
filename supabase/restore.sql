create or replace function atlas_private.restore_entry(p_entry jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
declare subject_value text; existing atlas_private.entries; ident uuid; k text; d jsonb;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and lower(email)='krimi.aziz@gmail.com' and email_confirmed_at is not null)then raise exception 'Unauthorized' using errcode='28000';end if;
 subject_value:='supabase:'||auth.uid()::text;ident:=(p_entry->>'id')::uuid;k:=p_entry->>'kind';d:=p_entry->'data';
 if k not in ('task','memory','transaction','goal','person','document','note')then raise exception 'Invalid kind';end if;
 perform atlas_private.validate_entry(k,d);
 if k='document' and split_part(d->>'path','/',1)<>encode(extensions.digest(subject_value,'sha256'),'hex')then raise exception 'Invalid file owner';end if;
 perform pg_advisory_xact_lock(hashtextextended(ident::text,0));
 select * into existing from atlas_private.entries where id=ident;
 if found then
  if existing.subject<>subject_value then raise exception 'Record unavailable';end if;
  if existing.kind<>k or existing.data<>d then raise exception 'Restore conflict: existing record differs';end if;
  return '{"skipped":true}'::jsonb;
 end if;
 insert into atlas_private.profiles(subject)values(subject_value)on conflict do nothing;
 insert into atlas_private.entries(id,subject,kind,data)values(ident,subject_value,k,d);
 insert into atlas_private.activity(subject,action,detail)values(subject_value,'Restored '||k,ident::text);
 return jsonb_build_object('id',ident,'restored',true);
end $$;
create or replace function public.atlas_restore_entry(p_entry jsonb)returns jsonb language sql security invoker set search_path='' as $$select atlas_private.restore_entry(p_entry)$$;
revoke all on function atlas_private.restore_entry(jsonb),public.atlas_restore_entry(jsonb)from public,anon;
grant execute on function atlas_private.restore_entry(jsonb),public.atlas_restore_entry(jsonb)to authenticated;
