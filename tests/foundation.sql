begin;
do $$ begin
 if atlas_private.briefing_due('2026-11-10 19:43'::timestamp,8) then raise exception 'Late morning briefing'; end if;
 if not atlas_private.briefing_due('2026-11-10 08:00'::timestamp,8) then raise exception 'Missing scheduled briefing'; end if;
 if not atlas_private.briefing_due('2026-11-10 08:14'::timestamp,8) then raise exception 'Missing bounded catchup'; end if;
 if atlas_private.briefing_due('2026-11-10 08:15'::timestamp,8) then raise exception 'Catchup window exceeded'; end if;
end $$;
rollback;
select 'PASS: briefing delivery window' as tests;
