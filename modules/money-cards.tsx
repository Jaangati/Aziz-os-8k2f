import {useEffect,useState} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,CreditCard} from 'lucide-react';
import type {Entry} from '../lib/contracts';

const labels = { debit: 'Debit card', credit: 'Credit card', unknown: 'Bank card' };
type Card = { type: keyof typeof labels; last4: string; date: string };

export function MoneyCards({entries,holder,compact=false,currency='QAR',selectedCard,onOpen,onAll}:{
 entries:Entry[];holder?:string;compact?:boolean;currency?:string;selectedCard?:string;onOpen:(last4:string)=>void;onAll:()=>void;
}){
 const cards = new Map<string,Card>();
 for(const entry of entries){
  const {card_last4:last4,payment_channel:channel,date,bank_status:status}=entry.data;
  if((entry.kind!=='transaction'&&entry.kind!=='receipt')||status==='excluded'||entry.data.status==='duplicate'||entry.data.status==='ignored'||!/^[0-9]{4}$/.test(last4||''))continue;
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
 const [paused,setPaused]=useState(false);
 const [interacting,setInteracting]=useState(false);
 useEffect(()=>{
  if(!compact||paused||interacting)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const timer=window.setInterval(()=>{
   if(!preference.matches&&!document.hidden)setSelected(index=>(index+1)%count);
  },6500);
  return ()=>window.clearInterval(timer);
 },[compact,count,paused,interacting]);

 const face=(card:Card,stacked=false)=>{
  const content=<>
   <span className="wallet-card-top">{labels[card.type]}{card.type==='unknown'&&<CreditCard size={20}/>}</span>
   <span className="wallet-identity">
    {card.last4&&<strong className="wallet-card-pan">•••• {card.last4}</strong>}
    {holder&&<span className="wallet-holder">{holder}</span>}
   </span>
  </>;
  const className='wallet-card wallet-front wallet-'+card.type;
  return stacked&&card.last4?<button type="button" className={className} onClick={()=>onOpen(card.last4)} aria-label={labels[card.type]+' ending in '+card.last4+', view activity'}>{content}</button>:<div className={className}>{content}</div>;
 };

 function latestLimit(last4:string){
  if(!last4)return undefined;
  return entries.filter(({kind,data:d})=>kind==='receipt'&&d.card_last4===last4&&d.balance_kind==='credit_available'&&d.balance_currency===currency&&Number.isSafeInteger(d.reported_balance_minor)&&!['duplicate','ignored'].includes(d.status))
   .sort((a,b)=>String(b.data.occurred_at||b.data.received_at||b.created_at).localeCompare(String(a.data.occurred_at||a.data.received_at||a.created_at)))[0];
 }

 if(!compact)return <section className="finance-panel atlas-wallet wallet-gallery" aria-label="Cards">
  <header><h2>Cards</h2></header>
  <div className="wallet-gallery-grid">{list.map(card=>{
   const limit=card.type==='credit'?latestLimit(card.last4):undefined;
   return <article key={card.last4||card.type}>
    {face(card)}
    <div className="wallet-gallery-details">
     <strong>{labels[card.type]}</strong>
     {card.type==='credit'&&<><small>Available credit</small><b>{limit?new Intl.NumberFormat('en',{style:'currency',currency}).format(limit.data.reported_balance_minor/100):'Unavailable'}</b><small>{limit?'Reported '+(limit.data.date||limit.data.received_at?.slice(0,10)||'by bank'):'No matching bank alert'}</small><small>Outstanding balance and statement status unavailable</small></>}
     {card.last4&&<button type="button" className="button secondary" aria-pressed={card.last4===selectedCard} onClick={()=>onOpen(card.last4)}>Filter activity <ArrowUpRight size={14}/></button>}
    </div>
   </article>;
  })}</div>
 </section>;

 const label=labels[current.type];
 const ending=current.last4?' ending in '+current.last4:'';
 return <section className={`finance-panel atlas-wallet ${compact?'compact':''}`} aria-label="Cards" onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)} onFocus={()=>setInteracting(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setInteracting(false)}}>
  <header><h2>Cards</h2>{compact&&<button className="finance-link" onClick={onAll}>View all <ArrowUpRight size={14}/></button>}</header>
  <div className="wallet-stack" data-layers={Math.min(count,3)}>
   {count>2&&<span className={'wallet-layer wallet-layer-back wallet-'+list[(active+2)%count].type} aria-hidden="true"/>}
   <span className={'wallet-layer wallet-layer-middle wallet-'+next.type} aria-hidden="true"/>
   <div className="wallet-active-face" key={active}>{face(current,true)}</div>
  </div>
  <div className="wallet-controls">
   <button type="button" aria-label="Previous card" onClick={()=>move(-1)}><ChevronLeft size={17}/></button>
   <span aria-live="polite">{active+1} of {count}<span className="sr-only"> · {label}{ending}</span></span>
   <button type="button" aria-label="Next card" onClick={()=>move(1)}><ChevronRight size={17}/></button>
  </div>
  <button className="finance-link wallet-rotation" onClick={()=>setPaused(value=>!value)}>{paused?'Resume rotation':'Pause rotation'}</button>
 </section>;
}
