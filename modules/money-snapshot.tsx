import{ArrowDownLeft,ArrowUpRight,Wallet}from'lucide-react';
import type{Entry}from'../lib/contracts';
import{summarizeBank,summarizeFinance}from'../lib/finance.mjs';

export function MoneySnapshot({entries,currency,period,open}:{entries:Entry[];currency:string;period:string;open?:()=>void}){
 const {latestBalance}=summarizeBank(entries,currency,period);
 const {rows,spent}=summarizeFinance(entries,currency,period);
 const salaries=entries.filter(e=>e.kind==='transaction'&&e.data.direction==='income'&&e.data.currency===currency&&e.data.bank_status!=='excluded'&&(e.data.event_type==='salary'||e.data.category==='Salary')).sort((a,b)=>b.data.date.localeCompare(a.data.date));
 const monthly=salaries.filter(e=>e.data.date.startsWith(period));
 const date=(value:string)=>value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value.slice(0,10)+'T00:00:00Z')):'';
 const money=(amount:number)=>new Intl.NumberFormat('en',{style:'currency',currency}).format(amount/100);
 return <section className="money-snapshot" aria-label="Money at a glance">
  <article className="snapshot-balance">
   <div><Wallet size={17}/> Latest reported balance {open&&<button onClick={open} aria-label="Open Money"><ArrowUpRight size={17}/></button>}</div>
   <strong>{latestBalance?money(latestBalance.data.reported_balance_minor):'Unavailable'}</strong>
   <small>{latestBalance?[latestBalance.data.account_key,date(latestBalance.data.date)].filter(Boolean).join(' · '):'No bank balance received'}</small>
  </article>
  <article>
   <div><ArrowDownLeft size={17}/> Salary received</div>
   <strong>{monthly.length?money(monthly.reduce((total,e)=>total+e.data.amount_minor,0)):'No salary recorded'}</strong>
   <small>{monthly.length?date(monthly[0].data.date):salaries.length?'Last: '+money(salaries[0].data.amount_minor)+' · '+date(salaries[0].data.date):'No salary credit found'}</small>
  </article>
  <article>
   <div><ArrowUpRight size={17}/> Recorded spending</div>
   <strong>{money(spent)}</strong>
   <small>{new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(period+'-01T00:00:00Z'))} · {rows.length} movements</small>
  </article>
 </section>;
}
