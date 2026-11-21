import {useState} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,CreditCard} from 'lucide-react';
import type {Entry} from '../lib/contracts';

const labels = { debit: 'Debit card', credit: 'Credit card', unknown: 'Bank card' };
type Card = { type: keyof typeof labels; last4: string; date: string };

export function MoneyCards({entries,holder,compact=false,onOpen,onAll}:{
 entries:Entry[];holder?:string;compact?:boolean;onOpen:(last4:string)=>void;onAll:()=>void;
}){
 const cards = new Map<string,Card>();
 for(const entry of entries){
  const {card_last4:last4,payment_channel:channel,date,bank_status:status}=entry.data;
  if(entry.kind!=='transaction'||status==='excluded'||!/^[0-9]{4}$/.test(last4||''))continue;
  const existing = cards.get(last4);
  const type = channel==='debit_card'?'debit':channel==='credit_card'?'credit':existing?.type??'unknown';
  cards.set(last4,{type,last4,date:[existing?.date||'',date||''].sort().at(-1)!});
 }
 const list = [...cards.values()].sort((a,b)=>b.date.localeCompare(a.date));
 for(const type of ['debit','credit'] as const){
  if(!list.some(card=>card.type===type))list.push({type,last4:'',date:''});
 }

 const [selected,setSelected]=useState(0);
 const count=list.length;
 const active=Math.min(selected,count-1);
 const current=list[active];
 const next=list[(active+1)%count];
 const move=(delta:number)=>setSelected((active+delta+count)%count);
 const label=labels[current.type];
 const ending=current.last4?' ending in '+current.last4:'';
 const face=<>
  <span className="wallet-card-top">{label}{current.type==='unknown'&&<CreditCard size={20}/>}</span>
  <span className="wallet-identity">
   {current.last4&&<strong className="wallet-card-pan">•••• {current.last4}</strong>}
   {holder&&<span className="wallet-holder">{holder}</span>}
  </span>
 </>;
 const faceClass='wallet-card wallet-front wallet-'+current.type;

 return <section className={`finance-panel atlas-wallet ${compact?'compact':''}`} aria-label="Cards">
  <header><h2>Cards</h2>{compact&&<button className="finance-link" onClick={onAll}>View all <ArrowUpRight size={14}/></button>}</header>
  <div className="wallet-stack" data-layers={Math.min(count,3)}>
   {count>2&&<span className={'wallet-layer wallet-layer-back wallet-'+list[(active+2)%count].type} aria-hidden="true"/>}
   <span className={'wallet-layer wallet-layer-middle wallet-'+next.type} aria-hidden="true"/>
   {current.last4
    ? <button type="button" className={faceClass} key={active} onClick={()=>onOpen(current.last4)} aria-label={label+ending+', view activity'}>{face}</button>
    : <div className={faceClass} key={active}>{face}</div>}
  </div>
  <div className="wallet-controls">
   <button type="button" aria-label="Previous card" onClick={()=>move(-1)}><ChevronLeft size={17}/></button>
   <span aria-live="polite">{active+1} of {count}<span className="sr-only"> · {label}{ending}</span></span>
   <button type="button" aria-label="Next card" onClick={()=>move(1)}><ChevronRight size={17}/></button>
  </div>
 </section>;
}
