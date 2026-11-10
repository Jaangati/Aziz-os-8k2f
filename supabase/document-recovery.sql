create unique index if not exists atlas_document_path_unique on atlas_private.entries(subject,(data->>'path')) where kind='document';
create or replace function atlas_private.document_delete(p_action text,p_id uuid,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare e atlas_private.entries; subject_value text;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and lower(email)='krimi.aziz@gmail.com' and email_confirmed_at is not null)then raise exception 'Unauthorized' using errcode='28000';end if;
 subject_value:='supabase:'||auth.uid()::text;
 select * into e from atlas_private.entries where id=p_id and subject=subject_value and kind='document' for update;
 if not found then
  if p_action='finish' then return '{"ok":true}'::jsonb;end if;
  raise exception 'Document unavailable';
 end if;
 if p_action='prepare' then
  if e.version<>p_version then raise exception 'Document changed. Refresh before deleting.' using errcode='40001';end if;
  if not coalesce((e.data->>'deletion_pending')::boolean,false) then
   update atlas_private.entries set data=data||'{"deletion_pending":true}',version=version+1,updated_at=now() where id=e.id returning * into e;
   insert into atlas_private.activity(subject,action,detail) values(subject_value,'Document deletion requested',e.id::text);
  end if;
  return jsonb_build_object('id',e.id,'path',e.data->>'path','version',e.version);
 elsif p_action='finish' then
  if e.version<>p_version or not coalesce((e.data->>'deletion_pending')::boolean,false)then raise exception 'Invalid deletion state';end if;
  delete from atlas_private.entries where id=e.id and subject=subject_value;
  insert into atlas_private.activity(subject,action,detail)values(subject_value,'Document deletion completed',e.id::text);
  return '{"ok":true}'::jsonb;
 else raise exception 'Unsupported deletion operation';end if;
end $$;
create or replace function public.atlas_document_delete(p_action text,p_id uuid,p_version integer)returns jsonb language sql security invoker set search_path='' as $$select atlas_private.document_delete(p_action,p_id,p_version)$$;
revoke all on function atlas_private.document_delete(text,uuid,integer),public.atlas_document_delete(text,uuid,integer)from public,anon;
grant execute on function atlas_private.document_delete(text,uuid,integer),public.atlas_document_delete(text,uuid,integer)to authenticated;
