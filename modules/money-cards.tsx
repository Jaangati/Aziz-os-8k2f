import {useState} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,CreditCard} from 'lucide-react';
import type {Entry} from '../lib/contracts';

export function MoneyCards({entries,compact=false,onOpen,onAll}:{entries:Entry[];compact?:boolean;onOpen:(last4:string)=>void;onAll:()=>void}){
 const cards=new Map<string,{type:string;date:string}>();
 for(const entry of entries){
  const {card_last4:last4,payment_channel:channel,date,bank_status:status}=entry.data;
  if(entry.kind!=='transaction'||status==='excluded'||!/^\d{4}$/.test(last4||''))continue;
  const type=channel==='debit_card'?'Debit card':channel==='credit_card'?'Credit card':'Bank card';
  const existing=cards.get(last4);
  cards.set(last4,{type:type==='Bank card'&&existing?existing.type:type,date:[existing?.date||'',date||''].sort().at(-1)!});
 }
 const list=[...cards].sort((a,b)=>b[1].date.localeCompare(a[1].date));
 const [selected,setSelected]=useState(0);
 const active=Math.min(selected,Math.max(0,list.length-1));
 const current=list[active];
 const count=list.length;
 const move=(delta:number)=>setSelected(index=>((index%count)+delta+count)%count);
 return <section className={`finance-panel atlas-wallet ${compact?'compact':''}`} aria-label="Cards">
  <header><div><h2>Cards</h2><small>{count?count+' recognized in activity':'Recognized from bank activity'}</small></div>{compact&&count>0&&<button className="finance-link" onClick={onAll}>View all <ArrowUpRight size={14}/></button>}</header>
  {!current?<p className="wallet-empty"><CreditCard size={18}/> Card alerts with a saved last four will appear here.</p>:<>
   <div className="wallet-stack" data-layers={Math.min(count,3)}>
    {count>2&&<span className="wallet-layer wallet-layer-back" aria-hidden="true"/>}
    {count>1&&<span className="wallet-layer wallet-layer-middle" aria-hidden="true"/>}
    <button type="button" className={'wallet-card wallet-front tone-'+active%3} key={current[0]} onClick={()=>onOpen(current[0])} aria-label={current[1].type+' ending in '+current[0]+', view activity'}>
     <span className="wallet-card-top"><span>{current[1].type}</span><CreditCard size={20}/></span>
     <span className="wallet-card-pan"><span aria-hidden="true">•••• &nbsp;</span>{current[0]}</span>
     <span className="wallet-card-foot"><span>{current[1].date?'Last seen '+new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(current[1].date+'T00:00:00Z')):'View activity'}</span><ArrowUpRight size={16}/></span>
    </button>
   </div>
   {count>1&&<div className="wallet-controls">
    <button type="button" aria-label="Previous card" onClick={()=>move(-1)}><ChevronLeft size={17}/></button>
    <span aria-live="polite">{active+1} of {count} <span className="sr-only">{current[1].type} ending in {current[0]}</span></span>
    <button type="button" aria-label="Next card" onClick={()=>move(1)}><ChevronRight size={17}/></button>
   </div>}
  </>}
 </section>;
}
