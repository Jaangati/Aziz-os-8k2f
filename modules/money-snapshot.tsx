import{ArrowDownLeft,ArrowUpRight,Wallet}from'lucide-react';
import type{Entry}from'../lib/contracts';
import{summarizeBank,summarizeFinance}from'../lib/finance.mjs';

export function MoneySnapshot({entries,currency,period,open}:{entries:Entry[];currency:string;period:string;open?:()=>void}){
 const {latestBalance}=summarizeBank(entries,currency,period);
 const {rows,spent}=summarizeFinance(entries,currency,period);
 const salaries=entries.filter(e=>e.kind==='transaction'&&e.data.direction==='income'&&e.data.currency===currency&&e.data.bank_status!=='excluded'&&(e.data.event_type==='salary'||e.data.category==='Salary')).sort((a,b)=>b.data.date.localeCompare(a.data.date));
 const accountBalances=entries.filter(e=>e.kind==='receipt'&&e.data.balance_kind==='cash'&&e.data.balance_currency===currency&&Number.isSafeInteger(e.data.reported_balance_minor)&&e.data.payment_channel==='account'&&e.data.bank_status==='posted'&&e.data.status!=='duplicate'&&e.data.status!=='ignored'&&e.data.date&&e.data.date<period+'-01').sort((a,b)=>b.data.date.localeCompare(a.data.date)||String(b.data.occurred_at||b.data.received_at||'').localeCompare(String(a.data.occurred_at||a.data.received_at||'')));
 const salaryAccount=accountBalances.find(e=>e.data.event_type==='salary'&&e.data.account_key)?.data.account_key;
 const openingBalance=salaryAccount?accountBalances.find(e=>e.data.account_key===salaryAccount):accountBalances[0];
 const lastSalary=salaries.find(e=>e.data.date.slice(0,7)<=period);
 const date=(value:string)=>value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value.slice(0,10)+'T00:00:00Z')):'';
 const money=(amount:number)=>new Intl.NumberFormat('en',{style:'currency',currency}).format(amount/100);
 return <section className="money-snapshot" aria-label="Money at a glance">
  <article className="snapshot-balance">
   <div><Wallet size={17}/> Latest reported balance {open&&<button onClick={open} aria-label="Open Money"><ArrowUpRight size={17}/></button>}</div>
   <strong>{latestBalance?money(latestBalance.data.reported_balance_minor):'Unavailable'}</strong>
   <small>{latestBalance?[latestBalance.data.account_key,date(latestBalance.data.date)].filter(Boolean).join(' · '):'No bank balance received'}</small>
  </article>
  <div className="snapshot-facts">
  <article>
   <div><Wallet size={17}/> Opening balance</div>
   <strong>{openingBalance?money(openingBalance.data.reported_balance_minor):'Unavailable'}</strong>
   <small>{openingBalance?[openingBalance.data.account_key,date(openingBalance.data.date)].filter(Boolean).join(' · '):'No earlier account balance reported'}</small>
  </article>
  <article>
   <div><ArrowDownLeft size={17}/> Last salary credit</div>
   <strong>{lastSalary?money(lastSalary.data.amount_minor):'Unavailable'}</strong>
   <small>{lastSalary?'Credited '+date(lastSalary.data.date):'No salary credit found'}</small>
  </article>
  <article>
   <div><ArrowUpRight size={17}/> Recorded spending</div>
   <strong>{money(spent)}</strong>
   <small>{new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(period+'-01T00:00:00Z'))} · {rows.length} movements</small>
  </article>
  </div>
 </section>;
}
