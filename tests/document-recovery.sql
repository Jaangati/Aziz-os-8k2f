-- Uses the existing verified owner identity only inside a rolled-back test transaction.
begin;
do $$
declare uid uuid; subject_value text; doc uuid; snapshot jsonb; job jsonb; restored jsonb; denied boolean:=false;
begin
 select id into uid from auth.users where lower(email)='krimi.aziz@gmail.com' and email_confirmed_at is not null;
 if uid is null then raise exception 'Verified owner required';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 subject_value:='supabase:'||uid::text;
 perform public.atlas_gateway('',subject_value,'authorize');
 insert into atlas_private.entries(subject,kind,data)values(subject_value,'document',jsonb_build_object('title','Disposable recovery fixture','path',repeat('a',64)||'/'||gen_random_uuid(),'size',1,'mime','text/plain','body',''))returning id into doc;
 select to_jsonb(e)into snapshot from atlas_private.entries e where id=doc;
 job:=public.atlas_document_delete('prepare',doc,1);
 if (job->>'version')::integer<>2 then raise exception 'Reservation did not advance version';end if;
 job:=public.atlas_document_delete('prepare',doc,2);
 if (job->>'version')::integer<>2 then raise exception 'Retry changed reservation';end if;
 begin perform public.atlas_document_delete('prepare',doc,1);exception when serialization_failure then denied:=true;end;
 if not denied then raise exception 'Stale deletion accepted';end if;
 perform public.atlas_document_delete('finish',doc,2);
 perform public.atlas_document_delete('finish',doc,2);
 if exists(select 1 from atlas_private.entries where id=doc)then raise exception 'Finalization failed';end if;
 -- Verify complete metadata can be restored exactly, without altering a real document.
 insert into atlas_private.entries select * from jsonb_populate_record(null::atlas_private.entries,snapshot);
 select to_jsonb(e)into restored from atlas_private.entries e where id=doc;
 if restored<>snapshot then raise exception 'Metadata restoration mismatch';end if;
end $$;
rollback;
select 'PASS: deletion reservation, idempotent retry, stale-version denial, finalization and metadata restore' as tests;
