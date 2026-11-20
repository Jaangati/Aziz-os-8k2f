-- Additive finance release. Private data remains behind owner-scoped RPCs.
alter table atlas_private.entries drop constraint entries_kind_check;
alter table atlas_private.entries add constraint entries_kind_check check(kind in ('task','memory','transaction','goal','person','document','note','guardian','receipt'));
create unique index receipt_source_once on atlas_private.entries(subject,(data->>'source'),(data->>'source_id')) where kind='receipt';
create unique index transaction_receipt_once on atlas_private.entries(subject,(data->>'receipt_id')) where kind='transaction' and nullif(data->>'receipt_id','') is not null;
create table atlas_private.gmail_connectors(subject text primary key references atlas_private.profiles(subject),token_hash text,auto_import boolean not null default false,last_sync timestamptz,imported_count bigint not null default 0,created_at timestamptz not null default now());
alter table atlas_private.gmail_connectors enable row level security;
revoke all on atlas_private.gmail_connectors from public,anon,authenticated;
do $migration$
declare definition text;signature text;
begin
 foreach signature in array array['atlas_private.gateway(text,text,text,jsonb)','atlas_private.restore_entry(jsonb)']loop
 definition:=pg_get_functiondef(signature::regprocedure);if position('''guardian''' in definition)=0 then raise exception 'Expected kind guard absent';end if;
 execute replace(definition,'''document'',''note'',''guardian''','''document'',''note'',''guardian'',''receipt''');
 end loop;
end $migration$;
create function atlas_private.finance_approve(subject_value text,receipt_id uuid,expected_version integer,candidate jsonb)returns jsonb language plpgsql set search_path='' as $$
declare r atlas_private.entries;d jsonb;ident uuid;
begin
 select * into r from atlas_private.entries where subject=subject_value and id=receipt_id and kind='receipt' for update;
 if not found then raise exception 'Receipt unavailable';end if;
 if r.data->>'status'='imported' then return jsonb_build_object('id',r.data->>'transaction_id','already_recorded',true);end if;
 if r.version<>expected_version then raise exception 'Receipt changed; refresh first' using errcode='40001';end if;
 if r.data->>'status'<>'pending' then raise exception 'Receipt is not pending';end if;
 d:=jsonb_build_object('title',candidate->>'title','amount_minor',(candidate->>'amount_minor')::bigint,'currency',candidate->>'currency','date',candidate->>'date','direction',candidate->>'direction','treatment',coalesce(candidate->>'treatment','normal'),'category',candidate->>'category','body','Imported from bank alert','card_last4',coalesce(candidate->>'card_last4',''),'receipt_id',r.id);
 perform atlas_private.validate_entry('transaction',d);
 if d->>'treatment' not in ('normal','refund','transfer') or d->>'date'>to_char(now() at time zone 'Asia/Qatar','YYYY-MM-DD') then raise exception 'Invalid movement';end if;
 insert into atlas_private.entries(subject,kind,data) values(subject_value,'transaction',d) returning id into ident;
 update atlas_private.entries set data=data||jsonb_build_object('status','imported','transaction_id',ident),version=version+1,updated_at=now() where id=r.id;
 insert into atlas_private.activity(subject,action,detail)values(subject_value,'Recorded receipt',r.id::text);
 return jsonb_build_object('id',ident);
end $$;
revoke all on function atlas_private.finance_approve(text,uuid,integer,jsonb) from public,anon,authenticated;
create function atlas_private.finance(p_action text,p_payload jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
declare subj text;result jsonb;
begin
 if auth.uid() is null or not exists(select from auth.users where id=auth.uid() and lower(email)='krimi.aziz@gmail.com' and email_confirmed_at is not null)then raise exception 'Unauthorized' using errcode='28000';end if;
 subj:='supabase:'||auth.uid()::text;
 perform pg_advisory_xact_lock(hashtextextended(subj||':finance',0));
 if p_action='status' then
 select jsonb_build_object('configured',token_hash is not null,'auto_import',auto_import,'last_sync',last_sync,'imported_count',imported_count) into result from atlas_private.gmail_connectors where subject=subj;
 return coalesce(result,'{"configured":false,"auto_import":false,"last_sync":null,"imported_count":0}'::jsonb);
 elsif p_action='token' then
 if coalesce(p_payload->>'token','')!~'^[a-f0-9]{64}$'then raise exception 'Invalid token';end if;
 insert into atlas_private.profiles(subject)values(subj)on conflict do nothing;
 insert into atlas_private.gmail_connectors(subject,token_hash,auto_import)values(subj,encode(extensions.digest(p_payload->>'token','sha256'),'hex'),coalesce((p_payload->>'auto_import')::boolean,false)) on conflict(subject)do update set token_hash=excluded.token_hash,auto_import=excluded.auto_import;
 return '{"ok":true}'::jsonb;
 elsif p_action='disconnect' then
 update atlas_private.gmail_connectors set token_hash=null,auto_import=false where subject=subj;return '{"ok":true}'::jsonb;
 elsif p_action='approve' then return atlas_private.finance_approve(subj,(p_payload->>'id')::uuid,(p_payload->>'version')::integer,p_payload->'data');
 else raise exception 'Unsupported finance action';end if;
end $$;
create function public.atlas_finance(p_action text,p_payload jsonb default '{}')returns jsonb language sql security invoker set search_path='' as $$select atlas_private.finance(p_action,p_payload)$$;
revoke all on function atlas_private.finance(text,jsonb),public.atlas_finance(text,jsonb)from public,anon;
grant execute on function atlas_private.finance(text,jsonb),public.atlas_finance(text,jsonb)to authenticated;
create function public.atlas_receipt_ingest(p_token text,p_data jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
declare connector atlas_private.gmail_connectors;ident uuid;result jsonb;dupe boolean;
begin
 if coalesce(p_token,'')!~'^[a-f0-9]{64}$' then raise exception 'Unauthorized' using errcode='28000';end if;
 select * into connector from atlas_private.gmail_connectors where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');if not found then raise exception 'Unauthorized' using errcode='28000';end if;
 perform pg_advisory_xact_lock(hashtextextended(connector.subject||':finance',0));
 -- Recheck after lock so revocation cannot race an import.
 if not exists(select from atlas_private.gmail_connectors where subject=connector.subject and token_hash=connector.token_hash) then raise exception 'Unauthorized' using errcode='28000';end if;
 perform atlas_private.validate_entry('receipt',p_data);
 if p_data->>'source'<>'gmail' or coalesce(p_data->>'source_id','')!~'^[a-f0-9]{1,100}$' or p_data->>'status'<>'pending' then raise exception 'Invalid receipt';end if;
 select id into ident from atlas_private.entries where subject=connector.subject and kind='receipt' and data->>'source'='gmail' and data->>'source_id'=p_data->>'source_id';
 if ident is not null then update atlas_private.gmail_connectors set last_sync=now()where subject=connector.subject;return '{"duplicate":true}'::jsonb;end if;
 insert into atlas_private.entries(subject,kind,data)values(connector.subject,'receipt',p_data)returning id into ident;
 update atlas_private.gmail_connectors set last_sync=now(),imported_count=imported_count+1 where subject=connector.subject;
 select exists(select from atlas_private.entries where subject=connector.subject and kind='transaction' and data->>'date'=p_data->>'date' and data->>'currency'=p_data->>'currency' and data->>'amount_minor'=p_data->>'amount_minor' and lower(data->>'title')=lower(p_data->>'title'))into dupe;
 if connector.auto_import and p_data->>'confidence'='parsed' and not dupe and p_data->>'date'<=to_char(now()at time zone 'Asia/Qatar','YYYY-MM-DD') then
 result:=atlas_private.finance_approve(connector.subject,ident,1,p_data);return result||jsonb_build_object('receipt_id',ident,'recorded',true);
 end if;
 return jsonb_build_object('receipt_id',ident,'review_required',true,'possible_duplicate',dupe);
end $$;
revoke all on function public.atlas_receipt_ingest(text,jsonb) from public,anon,authenticated;
grant execute on function public.atlas_receipt_ingest(text,jsonb)to service_role;
