import {useState,type ReactNode} from 'react';
import {ArrowDownLeft,ArrowUpRight,Banknote,CalendarDays,ChevronDown,CreditCard,Download,Mail,MessageSquare,Receipt,Search} from 'lucide-react';
import type {Entry} from '../lib/contracts';

const filters=[['all','All activity'],['pending','Needs review'],['expense','Money out'],['income','Money in'],['transfer','Transfers'],['refund','Refunds'],['observed','Bank notices'],['archived','Duplicates & ignored']];
const dayLabel=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))?new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(day+'T00:00:00Z')):'Date unavailable';
const sourceLabel=(entry:Entry)=>entry.data.source==='gmail'?'Gmail':entry.data.source==='sms'?'Bank SMS':'Pasted alert';

export function MoneyActivity({transactions,receipts,period,currency,zone,onSelect,onExport,initialFilter,card,onClearCard,children}:{
 transactions:Entry[];receipts:Entry[];period:string;currency:string;zone:string;initialFilter?:string;card?:string;onClearCard?:()=>void;
 onSelect:(entry:Entry,source?:Entry)=>void;onExport:(entries:Entry[])=>void;children:ReactNode;
}){
 const [filter,setFilter]=useState(initialFilter||'all'),[query,setQuery]=useState(''),[category,setCategory]=useState(''),[limit,setLimit]=useState(24);
 const receiptById=new Map(receipts.map(receipt=>[receipt.id,receipt]));
 const receiptByTransaction=new Map(receipts.filter(r=>r.data.status==='imported'&&r.data.transaction_id).map(r=>[r.data.transaction_id,r]));
 const posted=transactions.filter(entry=>entry.kind==='transaction'&&entry.data.bank_status!=='excluded');
 const postedIds=new Set(posted.map(entry=>entry.id));
 const moneyRows=posted.map(entry=>({entry,source:receiptById.get(entry.data.receipt_id)||receiptByTransaction.get(entry.id),day:String(entry.data.date||'')}));
 const linkedIds=new Set(moneyRows.flatMap(row=>row.source?[row.source.id]:[]));
 const localDay=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
 function receiptDay(receipt:Entry){
  if(/^\d{4}-\d{2}-\d{2}$/.test(receipt.data.date||''))return receipt.data.date as string;
  const received=new Date(receipt.data.received_at||receipt.created_at);
  return Number.isFinite(+received)?localDay.format(received):'';
 }
 const selectedMoneyRows=moneyRows.filter(row=>row.entry.data.currency===currency&&row.day.startsWith(period));
 const alertRows=receipts.filter(receipt=>receipt.data.currency===currency&&!linkedIds.has(receipt.id)&&!(receipt.data.status==='imported'&&postedIds.has(receipt.data.transaction_id))).map(entry=>({entry,source:entry,day:receiptDay(entry)})).filter(row=>row.day.startsWith(period)||(filter==='pending'&&row.entry.data.status==='pending'));
 const money=new Intl.NumberFormat('en',{style:'currency',currency});
 const search=query.trim().toLowerCase();
 const visible=[...selectedMoneyRows,...alertRows].filter(({entry,source})=>{
  const d=entry.data;
  if(card&&d.card_last4!==card&&source?.data.card_last4!==card)return false;
  if(category&&d.category!==category)return false;
  if(search&&![d.title,d.category,d.card_last4,d.reference,d.body,source?.data.body].join(' ').toLowerCase().includes(search))return false;
  const archived=['ignored','duplicate'].includes(d.status);
  if(filter==='all')return entry.kind==='transaction'||d.status==='pending';
  if(filter==='archived')return entry.kind==='receipt'&&archived;
  if(filter==='pending'||filter==='observed')return entry.kind==='receipt'&&d.status===filter;
  return entry.kind==='transaction'&&(filter==='refund'||filter==='transfer'?d.treatment===filter:d.direction===filter&&!['refund','transfer'].includes(d.treatment));
 }).sort((a,b)=>b.day.localeCompare(a.day)||String(b.entry.data.occurred_at||b.source?.data.received_at||b.entry.created_at).localeCompare(String(a.entry.data.occurred_at||a.source?.data.received_at||a.entry.created_at)));
 const groups=new Map<string,typeof visible>();
 for(const row of visible.slice(0,limit)){const group=groups.get(row.day);if(group)group.push(row);else groups.set(row.day,[row]);}
 const reviewed=alertRows.filter(row=>row.entry.data.status==='pending').length;
 return <section className="money-activity" aria-label="Money activity">
  <div className="activity-controls">
   <label className="activity-search"><Search size={17}/><input aria-label="Search activity" placeholder="Search activity" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24);}}/></label>
   <select aria-label="Filter activity" value={filter} onChange={e=>{setFilter(e.target.value);setLimit(24);}}>{filters.map(([id,label])=><option key={id} value={id}>{label}{id==='pending'&&reviewed?' ('+reviewed+')':''}</option>)}</select>
   <select aria-label="Transaction category" value={category} onChange={e=>{setCategory(e.target.value);setLimit(24);}}><option value="">All categories</option>{[...new Set([...selectedMoneyRows,...alertRows].map(row=>row.entry.data.category).filter(Boolean))].sort().map(c=><option key={c}>{c}</option>)}</select>
   <button className="button secondary" onClick={()=>onExport(visible.flatMap(row=>row.entry.kind==='transaction'?[row.entry]:[]))}><Download size={16}/> Export CSV</button>
  </div>
  {card&&<button className="button secondary card-filter" onClick={onClearCard}>Card ••{card} ×</button>}
  {children}
  {[...groups].map(([day,rows])=><section className="activity-day" key={day}>
   <h2><CalendarDays size={15}/>{dayLabel(day)}</h2>
   <div className="activity-grid">{rows.map(({entry,source})=>{
    const d=entry.data,posted=entry.kind==='transaction',incoming=d.direction==='income';
    const Icon=d.event_type==='cheque'?Banknote:incoming?ArrowDownLeft:d.card_last4?CreditCard:posted?ArrowUpRight:Receipt;
    const SourceIcon=source?.data.source==='gmail'?Mail:source?.data.source==='sms'?MessageSquare:Receipt;
    const status=posted?'Recorded':d.status==='pending'?'Needs review':d.status==='duplicate'?'Duplicate':d.status==='ignored'?'Ignored':d.bank_status==='failed'?'Failed / returned':'Bank notice';
    return <button type="button" key={entry.id} className="activity-row-button" onClick={()=>onSelect(entry,source)}>
     <span className="activity-icon"><Icon size={18}/></span>
     <span className="activity-copy"><strong>{d.title}</strong><small>{[d.category,status!=='Recorded'?status:'',d.card_last4?'Card ••'+d.card_last4:''].filter(Boolean).join(' · ')}</small></span>
     {source&&<span className="activity-origin" aria-label={sourceLabel(source)} title={sourceLabel(source)}><SourceIcon size={16}/></span>}
     <strong className="activity-row-amount">{d.amount_minor?((posted?incoming?'+':'−':'')+money.format(d.amount_minor/100)):'—'}</strong>
     <ChevronDown size={15} className="activity-arrow"/>
    </button>;
   })}</div>
  </section>)}
  {!visible.length&&<div className="finance-panel finance-empty"><Receipt size={24}/><strong>No matching activity</strong><p>Try another month or clear the filters.</p></div>}
  {visible.length>limit&&<button className="button secondary" onClick={()=>setLimit(limit+24)}>Show more activity</button>}
 </section>;
}
