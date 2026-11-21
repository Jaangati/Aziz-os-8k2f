import type {Entry} from '../lib/contracts';

export function paymentLabel(entry:Entry){
 const d=entry.data;
 if(d.currency==='QAR'&&d.event_type==='cheque'&&d.bank_status!=='failed'){
  if(d.amount_minor===590000)return 'Rent payment';
  if(d.amount_minor===228000)return 'Car instalment';
 }
 return d.title;
}

export function activityTime(entry:Entry,source:Entry|undefined,zone:string){
 const event=entry.data.time_source==='bank'?entry.data:source?.data.time_source==='bank'?source.data:null;
 const stamp=event?.occurred_at||source?.data.received_at||(entry.data.time_source==='received'?entry.data.occurred_at:'');
 if(!stamp||!Number.isFinite(Date.parse(stamp)))return '';
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(new Date(stamp));
 return time+(event?'':' alert');
}
