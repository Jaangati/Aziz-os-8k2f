alter table atlas_private.entries drop constraint entries_kind_check;
alter table atlas_private.entries add constraint entries_kind_check check(kind in ('task','memory','transaction','goal','person','document','note','guardian'));
create unique index guardian_position_currency on atlas_private.entries(subject,(data->>'currency')) where kind='guardian' and data->>'type'='position';
do $migration$
declare definition text; signature text;
begin
 foreach signature in array array['atlas_private.gateway(text,text,text,jsonb)','atlas_private.restore_entry(jsonb)'] loop
 definition:=pg_get_functiondef(signature::regprocedure);
 if position('''document'',''note''' in definition)=0 then raise exception 'Expected kind guard missing';end if;
 definition:=replace(definition,'''document'',''note''','''document'',''note'',''guardian''');execute definition;
 end loop;
 definition:=pg_get_functiondef('atlas_private.validate_entry(text,jsonb)'::regprocedure);
 definition:=replace(definition,'if k=''task'' then',$guardian$if k='guardian' then
 if coalesce(d->>'type','') not in ('position','schedule') or coalesce(d->>'currency','') not in ('QAR','TND','USD','EUR') or coalesce(d->>'direction','') not in ('income','expense') or coalesce(d->>'frequency','') not in ('once','monthly','weekly') then raise exception 'Invalid guardian record';end if;
 if coalesce(d->>'amount_minor','') !~ '^[0-9]+$' or (d->>'amount_minor')::numeric>999999999999 or coalesce((d->>'reserve_minor')::numeric,-1) not between 0 and 999999999999 or coalesce((d->>'savings_pct')::numeric,-1) not between 0 and 100 then raise exception 'Invalid guardian amounts';end if;
 perform (d->>'date')::date;
 if nullif(d->>'end_date','') is not null then perform (d->>'end_date')::date;if d->>'end_date'<d->>'date' then raise exception 'Invalid end date';end if;end if;
 elsif k='task' then$guardian$);execute definition;
end $migration$;
