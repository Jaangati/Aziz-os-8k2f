begin;
insert into atlas_private.profiles(subject,settings) values ('connection-test','{"paused":false}'),('connection-paused','{"paused":true}');
insert into atlas_private.entries(subject,kind,data) values
('connection-test','person','{"title":"Due fixture","follow_up":"2020-01-01T00:00:00Z"}'),
('connection-test','person','{"title":"Future fixture","follow_up":"2099-01-01T00:00:00Z"}'),
('connection-paused','person','{"title":"Paused fixture","follow_up":"2020-01-01T00:00:00Z"}');
select atlas_private.connection_tick();select atlas_private.connection_tick();
do $$begin
if (select count(*) from atlas_private.notifications where subject='connection-test')<>1 then raise exception 'Follow-up dedupe or future-date failure';end if;
if exists(select from atlas_private.notifications where subject='connection-paused') then raise exception 'Paused follow-up failure';end if;
end $$;
rollback;
